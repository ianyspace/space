import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Mq.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * "A message's whole life" — a step-through animation of one message travelling
 * from a producer through a broker to a consumer, for three scenarios:
 *
 *   normal   happy path, ending with an offset commit (ACK)
 *   retry    business failure → automatic retry → dead letter queue
 *   sendfail send itself fails → retry → local message table for compensation
 *
 * The message is a single dot whose position is driven by CSS `transform`, so
 * each step animates instead of jumping.
 */

const VIEW_W = 720;
const VIEW_H = 330;

const BOXES = {
  producer: { x: 14, y: 132, w: 104, h: 66, label: '生产者', sub: '订单服务' },
  net: { x: 182, y: 86, w: 208, h: 48, label: '接入层 · 网络 I/O', sub: '长连接 / 批量发送' },
  store: { x: 182, y: 152, w: 208, h: 48, label: '存储 · 分区 / CommitLog', sub: '顺序追加写' },
  replica: { x: 182, y: 218, w: 208, h: 48, label: '副本同步 · ISR', sub: 'leader + follower' },
  consumer: { x: 452, y: 132, w: 112, h: 66, label: '消费者', sub: '消费组 C1' },
  offset: { x: 452, y: 36, w: 112, h: 50, label: '消费位点', sub: 'Offset' },
  dlq: { x: 452, y: 236, w: 112, h: 58, label: '死信队列', sub: 'DLQ' },
};

const BROKER = { x: 166, y: 52, w: 240, h: 232 };

const center = (id) => ({
  x: BOXES[id].x + BOXES[id].w / 2,
  y: BOXES[id].y + BOXES[id].h / 2,
});

const LINKS = {
  send: { d: 'M118 165 C 148 165, 152 110, 182 110', color: 'var(--mq-accent)' },
  deliver: { d: 'M390 176 C 424 176, 424 165, 452 165', color: 'var(--mq-broker)' },
  ack: { d: 'M508 132 C 508 108, 508 96, 508 86', color: 'var(--mq-ok)' },
  dead: { d: 'M508 198 C 508 220, 508 228, 508 236', color: 'var(--mq-bad)' },
};

const SCENARIOS = [
  { id: 'normal', label: '正常投递：一路走到底' },
  { id: 'retry', label: '消费失败：重试 → 死信' },
  { id: 'sendfail', label: '发送失败：重试 + 本地兜底' },
];

const STEPS = {
  normal: [
    {
      at: 'producer',
      active: ['producer'],
      title: '组装消息',
      detail: 'Topic = order-created，Key = 订单号，Body = 序列化后的业务数据。',
      kind: 'ok',
    },
    {
      at: 'net',
      active: ['producer', 'net'],
      link: 'send',
      title: '通过网络写入 Broker',
      detail: '发送端设置 acks=all（同步确认），必须等到 Broker 回复才算成功。',
      kind: 'ok',
    },
    {
      at: 'store',
      active: ['net', 'store'],
      title: '追加写入分区',
      detail: '只追加、不修改：顺序写盘接近顺序 I/O，这是 MQ 高吞吐的根基。',
      kind: 'ok',
    },
    {
      at: 'replica',
      active: ['store', 'replica'],
      title: '同步到 ISR 副本',
      detail: 'leader 等副本写成功再回确认。副本数 ≥ 2，单台机器宕机才不会丢消息。',
      kind: 'ok',
    },
    {
      at: 'consumer',
      active: ['replica', 'consumer'],
      link: 'deliver',
      title: '投递给消费者',
      detail: '同一消费组内，一条消息只会给一个消费者；不同消费组各自收到一份。',
      kind: 'ok',
    },
    {
      at: 'consumer',
      active: ['consumer'],
      title: '业务处理成功',
      detail: '本地事务提交，扣库存 / 加积分真正生效。',
      kind: 'ok',
    },
    {
      at: 'offset',
      active: ['consumer', 'offset'],
      link: 'ack',
      title: '提交消费位点（ACK）',
      detail: '告诉 Broker「这条我处理完了」。位点前移之后，消息才允许被清理。',
      kind: 'ok',
    },
    {
      hideDot: true,
      active: [],
      title: '生命周期结束',
      detail: '不丢也不重（前提是每一步的保护都做到位，见下方两个反例）。',
      kind: 'done',
    },
  ],
  retry: [
    {
      at: 'producer',
      active: ['producer'],
      title: '组装消息',
      detail: 'Topic = order-created，Key = 订单号。',
      kind: 'ok',
    },
    {
      at: 'store',
      active: ['net', 'store', 'replica'],
      title: 'Broker 正常落盘 + 同步副本',
      detail: '消息安全躺在分区里，等着被消费。',
      kind: 'ok',
    },
    {
      at: 'consumer',
      active: ['store', 'consumer'],
      link: 'deliver',
      title: '投递给消费者',
      detail: '消费者拉取到消息，开始处理。',
      kind: 'ok',
    },
    {
      at: 'consumer',
      active: ['consumer'],
      title: '处理失败',
      detail: '扣库存抛异常 / 下游接口超时。此时绝对不能提交位点，否则消息就丢了。',
      kind: 'bad',
    },
    {
      at: 'consumer',
      active: ['consumer'],
      title: '自动重试',
      detail: 'RocketMQ 默认重试 16 次、间隔逐级变长；Kafka 没有自动重试，靠「不提交位点 + 重新 poll」。',
      kind: 'warn',
    },
    {
      at: 'dlq',
      active: ['consumer', 'dlq'],
      link: 'dead',
      title: '超过最大重试次数 → 死信队列',
      detail: 'DLQ 里的消息不再被自动消费，必须有人（或定时任务）介入，而且一定要告警。',
      kind: 'bad',
    },
    {
      hideDot: true,
      active: [],
      title: '消息没有消失',
      detail: '它停在 DLQ 里等处理。反面教材是无脑无限重试：后面的消息全被堵住，顺序消费尤其致命。',
      kind: 'bad',
    },
  ],
  sendfail: [
    {
      at: 'producer',
      active: ['producer'],
      title: '组装并发送消息',
      detail: '业务事务和发消息在同一个流程里，先落库、再发消息。',
      kind: 'ok',
    },
    {
      at: 'producer',
      active: ['producer'],
      title: '发送失败 / 超时',
      detail: '网络抖动、Broker 正在选主、分区不可用……生产者根本没拿到确认。',
      kind: 'bad',
    },
    {
      at: 'producer',
      active: ['producer'],
      title: '本地重试 3 次',
      detail: '同步发送 + 重试。注意：重试可能造成重复（第一次其实已经成功，只是确认丢了）。',
      kind: 'warn',
    },
    {
      at: 'producer',
      active: ['producer'],
      title: '仍然失败 → 兜底补偿',
      detail: '把消息写进本地「消息表」，由定时任务扫描后重新投递，这就是最终一致性的常规解法。',
      kind: 'warn',
    },
    {
      hideDot: true,
      active: [],
      title: '消息没有丢，只是晚到了',
      detail: '可靠发送 = 同步确认 + 有限重试 + 本地消息表兜底，再加消费端幂等来消化重复。',
      kind: 'done',
    },
  ],
};

const DOT_COLOR = {
  ok: 'var(--mq-accent)',
  warn: 'var(--mq-warn)',
  bad: 'var(--mq-bad)',
  done: 'var(--mq-ok)',
};

const TAKEAWAY = {
  normal: {
    kind: 'ok',
    text: '正常路径靠三件事兜底：生产者同步确认、Broker 多副本、消费者手动 ACK。少哪一环，丢消息就发生在哪个环节。',
  },
  retry: {
    kind: 'warn',
    text: '重试正是「至少一次」的来源：这次重试成功，可上一次其实已经处理过了，于是产生重复。所以消费端必须幂等。',
  },
  sendfail: {
    kind: 'bad',
    text: '发送端最危险：业务已经落库，消息却没发出去。用本地消息表 + 定时补偿把这段补上，才是完整的最终一致性方案。',
  },
};

const LOG_CLASS = { ok: 'mq-log-item-ok', warn: 'mq-log-item-warn', bad: 'mq-log-item-bad', done: 'mq-log-item-ok' };

/** Draws one rounded stage box; highlighted when it is part of the current step. */
function Stage({ id, active, sub = true }) {
  const box = BOXES[id];
  const on = active.includes(id);
  const isBrokerPart = id === 'net' || id === 'store' || id === 'replica';
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx="10"
        fill={on ? 'var(--mq-accent-soft)' : 'var(--mq-card)'}
        stroke={on ? 'var(--mq-accent)' : 'var(--mq-line)'}
        strokeWidth={on ? 2.4 : 1.6}
      />
      <text
        x={box.x + box.w / 2}
        y={box.y + (sub ? 21 : box.h / 2 + 5)}
        textAnchor="middle"
        fontSize={isBrokerPart ? 12.5 : 14}
        fontWeight="700"
        fill="var(--mq-text)"
      >
        {box.label}
      </text>
      {sub ? (
        <text
          x={box.x + box.w / 2}
          y={box.y + 38}
          textAnchor="middle"
          fontSize="11.5"
          fill="var(--mq-muted)"
        >
          {box.sub}
        </text>
      ) : null}
    </g>
  );
}

Stage.propTypes = {
  id: PropTypes.string.isRequired,
  active: PropTypes.arrayOf(PropTypes.string).isRequired,
  sub: PropTypes.bool,
};

const MqDeliveryDemo = function ({ scenario = 'normal', caption = '' }) {
  const initial = STEPS[scenario] ? scenario : 'normal';
  const [key, setKey] = useState(initial);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const steps = STEPS[key];
  const last = steps.length - 1;
  const step = steps[Math.min(index, last)];
  const active = step.active || [];
  const atEnd = index >= last;
  const logRef = useRef(null);

  // Keep the highlighted step visible when the log is taller than its box.
  useEffect(() => {
    const box = logRef.current;
    if (!box || typeof box.querySelector !== 'function') return;
    const activeItem = box.querySelector('[data-active="true"]');
    if (activeItem && activeItem.scrollIntoView) activeItem.scrollIntoView({ block: 'nearest' });
  }, [index, key]);

  useEffect(() => {
    if (!playing || atEnd) return undefined;
    const timer = setTimeout(() => setIndex((current) => Math.min(current + 1, last)), 1500);
    return () => clearTimeout(timer);
  }, [playing, index, atEnd, last]);

  useEffect(() => {
    if (playing && atEnd) setPlaying(false);
  }, [playing, atEnd]);

  const chooseScenario = (event) => {
    setKey(event.target.value);
    setIndex(0);
    setPlaying(true);
  };

  const point = useMemo(() => {
    if (step.hideDot) return center(step.lastAt || 'consumer');
    return center(step.at);
  }, [step]);

  const linkOn = (id) => (step.link === id ? 1 : 0.3);

  return (
    <div className={styles.mq}>
      <div className={styles['mq-head']}>
        <span className={styles['mq-badge']}>动态图解</span>
        <span className={styles['mq-caption']}>{caption || '一条消息的一生'}</span>
        <span className={styles['mq-hint']}>
          第 {Math.min(index + 1, steps.length)} / {steps.length} 步
        </span>
      </div>

      <div className={styles['mq-bar']}>
        <span className={styles['mq-label']}>场景</span>
        <select className={styles['mq-select']} value={key} onChange={chooseScenario}>
          {SCENARIOS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles['mq-btn']}
          onClick={() => {
            setPlaying(false);
            setIndex((current) => Math.max(0, current - 1));
          }}
          disabled={index === 0}
        >
          ← 上一步
        </button>
        <button
          type="button"
          className={styles['mq-btn']}
          onClick={() => {
            setPlaying(false);
            setIndex((current) => Math.min(last, current + 1));
          }}
          disabled={atEnd}
        >
          下一步 →
        </button>
        <button
          type="button"
          className={cx('mq-btn', 'mq-btn-primary')}
          onClick={() => {
            if (atEnd) setIndex(0);
            setPlaying(!playing || atEnd);
          }}
        >
          {playing ? '⏸ 暂停' : atEnd ? '↻ 重播' : '▶ 自动播放'}
        </button>
      </div>

      <div className={styles['mq-canvas']}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="消息从生产者到消费者的投递流程">
          <defs>
            <marker
              id="mq-deliver-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mq-line)" />
            </marker>
          </defs>

          <rect
            x={BROKER.x}
            y={BROKER.y}
            width={BROKER.w}
            height={BROKER.h}
            rx="14"
            fill="var(--mq-broker-soft)"
            stroke="var(--mq-broker)"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
          <text x={BROKER.x + 16} y={BROKER.y + 22} fontSize="13" fontWeight="700" fill="var(--mq-broker)">
            Broker
          </text>

          {Object.entries(LINKS).map(([id, link]) => (
            <path
              key={id}
              d={link.d}
              fill="none"
              stroke={link.color}
              strokeWidth="2.2"
              markerEnd="url(#mq-deliver-arrow)"
              opacity={linkOn(id)}
            />
          ))}

          <Stage id="net" active={active} sub={false} />
          <Stage id="store" active={active} sub={false} />
          <Stage id="replica" active={active} sub={false} />
          <Stage id="producer" active={active} />
          <Stage id="consumer" active={active} />
          <Stage id="offset" active={active} />
          <Stage id="dlq" active={active} />

          <g
            className={styles['mq-dot-g']}
            style={{
              transform: `translate(${point.x}px, ${point.y}px)`,
              color: DOT_COLOR[step.kind] || DOT_COLOR.ok,
              opacity: step.hideDot ? 0 : 1,
              transition: 'transform 0.55s cubic-bezier(0.34, 0.1, 0.2, 1), opacity 0.4s',
            }}
          >
            <circle className={styles['mq-halo']} r="9" />
            <circle className={styles['mq-dot']} r="7.5" />
          </g>
        </svg>
      </div>

      <div className={styles['mq-log']} ref={logRef}>
        {steps.map((item, i) => (
          <div
            key={item.title + i}
            data-active={i === Math.min(index, last) ? 'true' : 'false'}
            className={cx(
              'mq-log-item',
              LOG_CLASS[item.kind],
              i === Math.min(index, last) && 'mq-log-item-on',
            )}
          >
            <span className={styles['mq-log-idx']}>{i + 1}</span>
            <span>
              <span className={styles['mq-log-main']}>{item.title}</span>
              <span className={styles['mq-log-detail']}>　{item.detail}</span>
            </span>
          </div>
        ))}
      </div>

      <div
        className={cx(
          'mq-note',
          TAKEAWAY[key] && TAKEAWAY[key].kind === 'bad'
            ? 'mq-note-bad'
            : TAKEAWAY[key] && TAKEAWAY[key].kind === 'warn'
              ? 'mq-note-warn'
              : 'mq-note-ok',
        )}
      >
        {TAKEAWAY[key] ? TAKEAWAY[key].text : null}
      </div>
    </div>
  );
};

MqDeliveryDemo.propTypes = {
  /** Which scenario to open with: `normal` | `retry` | `sendfail`. */
  scenario: PropTypes.oneOf(['normal', 'retry', 'sendfail']),
  /** Shown next to the "动态图解" badge. */
  caption: PropTypes.string,
};

export default MqDeliveryDemo;
