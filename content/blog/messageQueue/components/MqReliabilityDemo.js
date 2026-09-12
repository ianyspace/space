import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Mq.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * Fault-injection lab: "where do messages get lost?"
 *
 * Three stages — producer, broker, consumer — each with the measure people
 * usually take, plus a switch that injects a realistic failure. The verdict for
 * every stage is computed from the combination, so readers can reason about
 * 「谁保证的，谁就负责」 instead of memorising slogans.
 */

const STAGES = [
  {
    id: 'producer',
    name: '① 生产者',
    role: '生产者 → Broker',
    options: [
      { value: 'sync', label: '同步确认（acks=all）' },
      { value: 'async', label: '只发不等确认（单向发送）' },
    ],
    fault: '网络抖动，确认丢失',
    fix: '同步确认 + 有限重试；仍失败就落本地消息表，由定时任务补偿。',
  },
  {
    id: 'broker',
    name: '② Broker',
    role: 'Broker 内部存储',
    options: [
      { value: 'durable', label: '同步刷盘 + 3 副本' },
      { value: 'fast', label: '异步刷盘 + 单副本' },
    ],
    fault: '机器断电 / 磁盘损坏',
    fix: '同步刷盘（或 RocketMQ 的同步复制）+ 副本数 ≥ 2，再加上主从切换。',
  },
  {
    id: 'consumer',
    name: '③ 消费者',
    role: 'Broker → 消费者',
    options: [
      { value: 'manual', label: '处理完再手动 ACK' },
      { value: 'auto', label: '自动提交位点' },
    ],
    fault: '业务处理到一半宕机',
    fix: '手动 ACK（先处理、后提交位点）；重复投递交给消费端幂等兜住。',
  },
];

const PRESETS = {
  textbook: { measures: { producer: 'sync', broker: 'durable', consumer: 'manual' }, faults: { producer: true, broker: true, consumer: true } },
  pitfall: { measures: { producer: 'async', broker: 'fast', consumer: 'auto' }, faults: { producer: true, broker: true, consumer: true } },
  quiet: { measures: { producer: 'async', broker: 'fast', consumer: 'auto' }, faults: { producer: false, broker: false, consumer: false } },
};

const FLAG_CLASS = { ok: 'mq-flag-ok', warn: 'mq-flag-warn', bad: 'mq-flag-bad' };

function judge(stageId, measures, faults) {
  if (!faults[stageId]) {
    return {
      level: 'ok',
      text: '没故障时看不出差别',
      detail: '一切都正常，所以此时用什么配置都「没问题」——问题只在故障来临的那一刻暴露。',
    };
  }

  if (stageId === 'producer') {
    return measures.producer === 'sync'
      ? {
          level: 'ok',
          text: '发送失败是可感知的',
          detail: '没收到 Broker 确认就知道发失败了，可以重试或落本地消息表补偿。',
        }
      : {
          level: 'bad',
          text: '消息丢了，而且没人知道',
          detail: '单向发送不等待确认，业务以为发成功了，Broker 却从未收到。',
        };
  }

  if (stageId === 'broker') {
    return measures.broker === 'durable'
      ? {
          level: 'ok',
          text: '机器炸了也不丢',
          detail: '消息已刷盘且有多副本，leader 挂掉后由副本顶上。',
        }
      : {
          level: 'bad',
          text: '还在页缓存里，就断电了',
          detail: '异步刷盘 + 单副本 = 消息只在内存里，宕机即丢失，且无法恢复。',
        };
  }

  return measures.consumer === 'manual'
    ? {
        level: 'warn',
        text: '不丢，但可能重复',
        detail: '位点没提交，重启后会重新拉取这条消息——上一次可能已经处理了一半。',
      }
    : {
        level: 'bad',
        text: '位点提交了，业务没做完',
        detail: '自动提交先于业务完成，消息被认为「消费成功」，永远不会再投递。',
      };
}

const MqReliabilityDemo = function ({ preset = 'textbook', caption = '' }) {
  const initial = PRESETS[preset] ? PRESETS[preset] : PRESETS.textbook;
  const [measures, setMeasures] = useState(initial.measures);
  const [faults, setFaults] = useState(initial.faults);
  const [focus, setFocus] = useState(3);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return undefined;
    if (focus >= 3) {
      const timer = setTimeout(() => setRunning(false), 500);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setFocus(focus + 1), 750);
    return () => clearTimeout(timer);
  }, [running, focus]);

  const results = STAGES.map((stage) => ({ ...judge(stage.id, measures, faults), id: stage.id }));

  const lost = results.filter((result) => result.level === 'bad');
  const duplicate = results.filter((result) => result.level === 'warn');

  let overall = { level: 'ok', title: '不丢不重', detail: '这条消息完整地走完了全程。' };
  if (lost.length) {
    overall = {
      level: 'bad',
      title: '消息丢了',
      detail: `丢在「${STAGES.find((stage) => stage.id === lost[0].id).name}」这一环，只能靠对账或人工补数据。`,
    };
  } else if (duplicate.length) {
    overall = {
      level: 'warn',
      title: '至少一次：会重复投递',
      detail: '这是工程上最常见也最划算的取舍——不丢，代价是重复，用幂等消化掉。',
    };
  }

  const applyPreset = (name) => {
    setMeasures(PRESETS[name].measures);
    setFaults(PRESETS[name].faults);
    setFocus(3);
    setRunning(false);
  };

  const revealed = (index) => focus >= 3 || focus > index;

  const dotX = focus < 0 ? 40 : focus >= 3 ? 668 : [99, 360, 621][focus];
  const dotLevel = focus >= 0 && focus < 3 ? results[focus].level : 'ok';

  return (
    <div className={styles.mq}>
      <div className={styles['mq-head']}>
        <span className={styles['mq-badge']}>故障实验</span>
        <span className={styles['mq-caption']}>{caption || '消息会丢在哪一环？'}</span>
        <span className={styles['mq-hint']}>改配置、注入故障，看结论怎么变</span>
      </div>

      <div className={styles['mq-bar']}>
        <button type="button" className={styles['mq-btn']} onClick={() => applyPreset('textbook')}>
          教科书配置
        </button>
        <button type="button" className={styles['mq-btn']} onClick={() => applyPreset('pitfall')}>
          经典踩坑配置
        </button>
        <button type="button" className={styles['mq-btn']} onClick={() => applyPreset('quiet')}>
          一切正常时
        </button>
        <button
          type="button"
          className={cx('mq-btn', 'mq-btn-primary')}
          onClick={() => {
            setFocus(-1);
            setRunning(true);
          }}
        >
          ▶ 运行一遍
        </button>
      </div>

      <div className={styles['mq-canvas']}>
        <svg viewBox="0 0 720 96" role="img" aria-label="生产者到 Broker 到消费者的消息管道">
          {[
            { id: 'producer', x: 24, label: '生产者' },
            { id: 'broker', x: 285, label: 'Broker' },
            { id: 'consumer', x: 546, label: '消费者' },
          ].map((node) => (
            <g key={node.id}>
              <rect
                x={node.x}
                y="22"
                width="150"
                height="52"
                rx="12"
                fill={focus >= 0 && STAGES[focus] && STAGES[focus].id === node.id ? 'var(--mq-accent-soft)' : 'var(--mq-card)'}
                stroke={focus >= 0 && STAGES[focus] && STAGES[focus].id === node.id ? 'var(--mq-accent)' : 'var(--mq-line)'}
                strokeWidth="1.8"
              />
              <text x={node.x + 75} y="54" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--mq-text)">
                {node.label}
              </text>
            </g>
          ))}

          {[174, 435].map((x) => (
            <line key={x} x1={x} x2={x + 111} y1="48" y2="48" stroke="var(--mq-line)" strokeWidth="1.6" strokeDasharray="5 4" />
          ))}

          <g
            style={{
              transform: `translate(${dotX}px, 48px)`,
              transition: 'transform 0.6s cubic-bezier(0.34, 0.1, 0.2, 1)',
              opacity: focus >= 0 && focus < 3 ? 1 : 0,
              color: dotLevel === 'bad' ? 'var(--mq-bad)' : dotLevel === 'warn' ? 'var(--mq-warn)' : 'var(--mq-ok)',
            }}
          >
            <circle className={styles['mq-halo']} r="8" />
            <circle className={styles['mq-dot']} r="7" />
          </g>
        </svg>
      </div>

      <div className={styles['mq-cards']}>
        {STAGES.map((stage, index) => {
          const result = results[index];
          return (
            <div key={stage.id} className={cx('mq-card', focus === index && 'mq-card-on')}>
              <div className={styles['mq-card-title']}>
                <span>{stage.name}</span>
                {revealed(index) ? (
                  <span className={cx('mq-card-flag', FLAG_CLASS[result.level])}>{result.text}</span>
                ) : (
                  <span className={cx('mq-card-flag', 'mq-flag-idle')}>待运行</span>
                )}
              </div>
              <div className={styles['mq-card-sub']}>{stage.role}</div>

              <select
                className={styles['mq-select']}
                value={measures[stage.id]}
                onChange={(event) => {
                  setMeasures({ ...measures, [stage.id]: event.target.value });
                  setFocus(3);
                }}
                aria-label={`${stage.name} 的措施`}
              >
                {stage.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className={styles['mq-card-row']}>
                <label className={styles['mq-check']}>
                  <input
                    type="checkbox"
                    checked={faults[stage.id]}
                    onChange={(event) => {
                      setFaults({ ...faults, [stage.id]: event.target.checked });
                      setFocus(3);
                    }}
                  />
                  模拟故障：{stage.fault}
                </label>
              </div>

              {revealed(index) ? (
                <div className={styles['mq-card-sub']} style={{ marginBottom: 0 }}>
                  {result.detail}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={cx('mq-verdict', `mq-verdict-${overall.level}`)}>
        {overall.title} —— {overall.detail}
      </div>

      <div className={cx('mq-note', overall.level === 'bad' ? 'mq-note-bad' : overall.level === 'warn' ? 'mq-note-warn' : 'mq-note-ok')}>
        <strong>三句话记住：</strong>
        生产者确认管「发出去没」，Broker 刷盘与副本管「存住没」，消费者手动 ACK 管「处理完没」。
        三环全开才能不丢；而不丢往往意味着可能重复，所以还要再加一层幂等。
      </div>
    </div>
  );
};

MqReliabilityDemo.propTypes = {
  /** Starting configuration: `textbook` | `pitfall` | `quiet`. */
  preset: PropTypes.oneOf(['textbook', 'pitfall', 'quiet']),
  /** Shown next to the "故障实验" badge. */
  caption: PropTypes.string,
};

export default MqReliabilityDemo;
