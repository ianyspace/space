import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Mq.module.scss';

const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

/**
 * "Why do we need a message queue?" — three tabs, three animations:
 *
 *   ① 异步  a synchronous call chain vs. fire-and-forget through a broker
 *   ② 解耦  spaghetti N×N calls vs. a star around the broker
 *   ③ 削峰  a request spike surviving (or killing) a slow downstream
 */
const TABS = [
  { id: 'async', label: '① 异步：把等待换成通知' },
  { id: 'decouple', label: '② 解耦：从网状到星型' },
  { id: 'peak', label: '③ 削峰：洪峰进队列' },
];

/* ------------------------------------------------------------------ *
 * Tab ① 异步
 * ------------------------------------------------------------------ */

// One main-thread task plus four side-effect tasks, all in milliseconds.
const TASKS = [
  { id: 'validate', name: '校验订单', ms: 30, lane: 0 },
  { id: 'stock', name: '扣库存', ms: 60, lane: 1 },
  { id: 'points', name: '加积分', ms: 40, lane: 2 },
  { id: 'sms', name: '发短信', ms: 120, lane: 3 },
  { id: 'stat', name: '写统计', ms: 50, lane: 4 },
];

const SEND_MS = 5;
const SYNC_TOTAL = TASKS.reduce((sum, task) => sum + task.ms, 0);
const ASYNC_WAIT = TASKS[0].ms + SEND_MS;
// Downstream tasks run in parallel, so the slowest one decides when everything is done.
const ASYNC_FINISH = ASYNC_WAIT + Math.max(...TASKS.slice(1).map((task) => task.ms));
const SCALE = SYNC_TOTAL + 45;
const STEP_MS = 10;
const TICK_MS = 26;

const LANES = {
  sync: ['请求线程（串行执行）'],
  async: ['请求线程', '消费线程 A', '消费线程 B', '消费线程 C', '消费线程 D'],
};

function buildSegments(mode) {
  if (mode === 'sync') {
    let cursor = 0;
    return TASKS.map((task) => {
      const segment = { ...task, start: cursor, kind: 'sync' };
      cursor += task.ms;
      return segment;
    });
  }

  const segments = [
    { id: 'validate', name: '校验订单', ms: TASKS[0].ms, start: 0, lane: 0, kind: 'main' },
    { id: 'send', name: '发消息', ms: SEND_MS, start: TASKS[0].ms, lane: 0, kind: 'main' },
  ];
  // Downstream work starts as soon as the broker has the message, and runs in parallel.
  TASKS.slice(1).forEach((task) => {
    segments.push({ ...task, start: ASYNC_WAIT, kind: 'async' });
  });
  return segments;
}

function AsyncTab() {
  const [mode, setMode] = useState('async');
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      elapsedRef.current = Math.min(SCALE, elapsedRef.current + STEP_MS);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= SCALE) setPlaying(false);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const replay = (nextMode) => {
    setMode(nextMode);
    elapsedRef.current = 0;
    setElapsed(0);
    setPlaying(true);
  };

  const segments = buildSegments(mode);
  const lanes = mode === 'sync' ? LANES.sync : LANES.async;
  const waitMs = mode === 'sync' ? Math.min(elapsed, SYNC_TOTAL) : Math.min(elapsed, ASYNC_WAIT);
  const finished = elapsed >= SCALE;

  return (
    <div>
      <div className={styles['mq-bar']}>
        <span className={styles['mq-label']}>调用方式</span>
        <button
          type="button"
          className={cx('mq-btn', mode === 'sync' && 'mq-btn-on')}
          onClick={() => replay('sync')}
        >
          同步调用
        </button>
        <button
          type="button"
          className={cx('mq-btn', mode === 'async' && 'mq-btn-on')}
          onClick={() => replay('async')}
        >
          MQ 异步
        </button>
        <button type="button" className={styles['mq-btn']} onClick={() => replay(mode)}>
          ↻ 重播
        </button>
        <span className={styles['mq-hint']}>
          下单接口只需「校验 + 发消息」，其余动作交给消费者
        </span>
      </div>

      <div className={styles['mq-lanes']}>
        {lanes.map((laneName, lane) => (
          <div className={styles['mq-lane']} key={laneName}>
            <span className={styles['mq-lane-name']}>{laneName}</span>
            <div className={styles['mq-track']}>
              {segments
                .filter((segment) => segment.lane === lane)
                .map((segment) => {
                  const progress = Math.max(
                    0,
                    Math.min(1, (elapsed - segment.start) / segment.ms),
                  );
                  const wide = (segment.ms / SCALE) * 100 >= 11;
                  return (
                    <div
                      key={segment.id}
                      className={cx(
                        'mq-seg',
                        `mq-seg-${segment.kind}`,
                        progress >= 1 && 'mq-seg-done',
                      )}
                      style={{
                        left: `${(segment.start / SCALE) * 100}%`,
                        width: `${(segment.ms / SCALE) * 100}%`,
                      }}
                      title={`${segment.name}：${segment.ms}ms`}
                    >
                      <span
                        className={styles['mq-seg-fill']}
                        style={{ transform: `scaleX(${progress})` }}
                      />
                      {wide ? <span className={styles['mq-seg-name']}>{segment.name}</span> : null}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className={styles['mq-axis']}>
        {[0, 150, 300].map((tick) => (
          <span
            className={styles['mq-axis-tick']}
            key={tick}
            style={{ left: `${(tick / SCALE) * 100}%` }}
          >
            {tick}ms
          </span>
        ))}
      </div>

      <div className={styles['mq-stats']}>
        <div className={styles['mq-stat']}>
          <span className={styles['mq-stat-k']}>用户等待时间</span>
          <span className={styles['mq-stat-v']}>
            {waitMs}ms{mode === 'async' && !finished ? ` → ${ASYNC_WAIT}ms` : ''}
          </span>
        </div>
        <div className={styles['mq-stat']}>
          <span className={styles['mq-stat-k']}>下游全部完成</span>
          <span className={styles['mq-stat-v']}>
            {mode === 'sync' ? `${SYNC_TOTAL}ms` : `${ASYNC_FINISH}ms`}
          </span>
        </div>
        {finished ? (
          <div className={styles['mq-stat']}>
            <span className={styles['mq-stat-k']}>结论</span>
            <span className={styles['mq-stat-v']}>
              {mode === 'sync'
                ? `主链路被串行拖到 ${SYNC_TOTAL}ms`
                : `等待缩短约 ${Math.round((1 - ASYNC_WAIT / SYNC_TOTAL) * 100)}%，代价是最终一致`}
            </span>
          </div>
        ) : null}
      </div>

      <div className={cx('mq-note', 'mq-note-warn')}>
        异步换来了响应时间，也换来了<strong>最终一致</strong>：消息发出去之后，下游失败要靠重试补齐，
        用户看到「下单成功」时，积分和短信可能还没到账。
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tab ② 解耦
 * ------------------------------------------------------------------ */

const DOWNSTREAMS = [
  { id: 'stock', name: '库存服务', y: 16 },
  { id: 'points', name: '积分服务', y: 88 },
  { id: 'sms', name: '短信服务', y: 160 },
  { id: 'bi', name: '数据平台', y: 232 },
];

const BOX_H = 54;
const DOWN_X = 556;

function DecoupleTab() {
  const [useMq, setUseMq] = useState(true);

  const directPath = (centerY) => `M148 147 C 330 147, 390 ${centerY}, ${DOWN_X} ${centerY}`;
  const toBroker = 'M148 147 C 210 147, 232 147, 292 147';
  const fromBroker = (centerY) => `M416 147 C 470 147, 496 ${centerY}, ${DOWN_X} ${centerY}`;

  return (
    <div>
      <div className={styles['mq-bar']}>
        <span className={styles['mq-label']}>调用拓扑</span>
        <button
          type="button"
          className={cx('mq-btn', !useMq && 'mq-btn-on')}
          onClick={() => setUseMq(false)}
        >
          订单服务直连下游
        </button>
        <button
          type="button"
          className={cx('mq-btn', useMq && 'mq-btn-on')}
          onClick={() => setUseMq(true)}
        >
          通过 MQ 解耦
        </button>
      </div>

      <div className={styles['mq-canvas']}>
        <svg viewBox="0 0 720 300" role="img" aria-label="直连与 MQ 解耦的拓扑对比">
          <defs>
            <marker
              id="mq-roles-arrow"
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

          {/* order service */}
          <g>
            <rect
              x="24"
              y="112"
              width="124"
              height="70"
              rx="12"
              fill="var(--mq-card)"
              stroke="var(--mq-accent)"
              strokeWidth="2"
            />
            <text x="86" y="142" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--mq-text)">
              订单服务
            </text>
            <text x="86" y="162" textAnchor="middle" fontSize="11.5" fill="var(--mq-muted)">
              Topic: order-created
            </text>
          </g>

          {/* broker */}
          {useMq ? (
            <g>
              <rect
                x="292"
                y="112"
                width="124"
                height="70"
                rx="12"
                fill="var(--mq-broker-soft)"
                stroke="var(--mq-broker)"
                strokeWidth="2"
              />
              <text x="354" y="142" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--mq-text)">
                消息队列
              </text>
              <text x="354" y="162" textAnchor="middle" fontSize="11.5" fill="var(--mq-muted)">
                存下来 · 投出去
              </text>
            </g>
          ) : null}

          {/* downstream services */}
          {DOWNSTREAMS.map((service) => {
            const centerY = service.y + BOX_H / 2;
            return (
              <g key={service.id}>
                <rect
                  x={DOWN_X}
                  y={service.y}
                  width="140"
                  height={BOX_H}
                  rx="12"
                  fill="var(--mq-card)"
                  stroke="var(--mq-line)"
                  strokeWidth="1.6"
                />
                <text
                  x={DOWN_X + 70}
                  y={centerY + 5}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="600"
                  fill="var(--mq-text)"
                >
                  {service.name}
                </text>
              </g>
            );
          })}

          {/* links */}
          {useMq ? (
            <g>
              <path
                d={toBroker}
                fill="none"
                stroke="var(--mq-accent)"
                strokeWidth="2.2"
                markerEnd="url(#mq-roles-arrow)"
              />
              {DOWNSTREAMS.map((service) => (
                <path
                  key={service.id}
                  d={fromBroker(service.y + BOX_H / 2)}
                  fill="none"
                  stroke="var(--mq-broker)"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  markerEnd="url(#mq-roles-arrow)"
                />
              ))}
              <circle r="4.5" fill="var(--mq-accent)">
                <animateMotion dur="1.6s" repeatCount="indefinite" path={toBroker} />
              </circle>
              {DOWNSTREAMS.map((service, index) => (
                <circle key={service.id} r="4" fill="var(--mq-broker)">
                  <animateMotion
                    dur="2.4s"
                    begin={`${index * 0.35}s`}
                    repeatCount="indefinite"
                    path={fromBroker(service.y + BOX_H / 2)}
                  />
                </circle>
              ))}
            </g>
          ) : (
            <g>
              {DOWNSTREAMS.map((service, index) => (
                <g key={service.id}>
                  <path
                    d={directPath(service.y + BOX_H / 2)}
                    fill="none"
                    stroke="var(--mq-bad)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    markerEnd="url(#mq-roles-arrow)"
                  />
                  <circle r="4" fill="var(--mq-bad)">
                    <animateMotion
                      dur="2.2s"
                      begin={`${index * 0.3}s`}
                      repeatCount="indefinite"
                      path={directPath(service.y + BOX_H / 2)}
                    />
                  </circle>
                </g>
              ))}
            </g>
          )}
        </svg>
      </div>

      <div className={styles['mq-stats']}>
        <div className={styles['mq-stat']}>
          <span className={styles['mq-stat-k']}>订单服务要维护的连接</span>
          <span className={styles['mq-stat-v']}>{useMq ? '1（一个 Topic）' : '4（每个下游一个）'}</span>
        </div>
        <div className={styles['mq-stat']}>
          <span className={styles['mq-stat-k']}>新增一个下游要改哪里</span>
          <span className={styles['mq-stat-v']}>{useMq ? '只改下游自己' : '改订单服务 + 重新发布'}</span>
        </div>
      </div>

      <div className={cx('mq-note', useMq ? 'mq-note-ok' : 'mq-note-bad')}>
        {useMq
          ? '订单服务只认识 Topic，不认识下游：下游宕机、限流、换语言、加服务，都不影响下单主链路。'
          : '直连的代价不只是 4 条线：地址、协议、超时、重试、下游挂了怎么办，全压在订单服务里。每加一个下游都要动它一次。'}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tab ③ 削峰
 * ------------------------------------------------------------------ */

const SHAPE = [0, 0, 0.05, 0.15, 0.4, 0.8, 1, 1, 0.9, 0.5, 0.2, 0.05, 0, 0, 0, 0];
const BASE_QPS = 300;
const AXIS_MAX = 8000;
const PLOT = { left: 58, right: 700, top: 26, bottom: 250 };

function PeakTab() {
  const [peak, setPeak] = useState(4000);
  const [capacity, setCapacity] = useState(1000);
  const [useMq, setUseMq] = useState(true);

  const incoming = SHAPE.map((ratio) => Math.round(BASE_QPS + (peak - BASE_QPS) * ratio));
  const failed = incoming.reduce((sum, qps) => sum + Math.max(0, qps - capacity), 0);

  let depth = 0;
  let maxDepth = 0;
  const depths = incoming.map((qps) => {
    depth = Math.max(0, depth + qps - capacity);
    maxDepth = Math.max(maxDepth, depth);
    return depth;
  });
  const drainSeconds = maxDepth / capacity;

  const barWidth = (PLOT.right - PLOT.left) / incoming.length;
  const scaleY = (value) => PLOT.bottom - (value / AXIS_MAX) * (PLOT.bottom - PLOT.top);

  return (
    <div>
      <div className={styles['mq-bar']}>
        <span className={styles['mq-label']}>流量峰值</span>
        <input
          className={styles['mq-range']}
          type="range"
          min="1000"
          max="6000"
          step="500"
          value={peak}
          onChange={(event) => setPeak(Number(event.target.value))}
          aria-label="峰值 QPS"
        />
        <span className={styles['mq-label']}>{peak} QPS</span>
        <span className={styles['mq-label']}>下游处理能力</span>
        <input
          className={styles['mq-range']}
          type="range"
          min="500"
          max="3000"
          step="250"
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
          aria-label="下游处理能力"
        />
        <span className={styles['mq-label']}>{capacity} QPS</span>
        <button
          type="button"
          className={cx('mq-btn', !useMq && 'mq-btn-on')}
          onClick={() => setUseMq(false)}
        >
          无 MQ
        </button>
        <button
          type="button"
          className={cx('mq-btn', useMq && 'mq-btn-on')}
          onClick={() => setUseMq(true)}
        >
          有 MQ
        </button>
      </div>

      <div className={styles['mq-canvas']}>
        <svg viewBox="0 0 720 300" role="img" aria-label="有 MQ 与无 MQ 的峰值流量对比">
          {/* axis grid */}
          {[2000, 4000, 6000].map((tick) => (
            <g key={tick}>
              <line
                x1={PLOT.left}
                x2={PLOT.right}
                y1={scaleY(tick)}
                y2={scaleY(tick)}
                stroke="var(--mq-grid)"
                strokeWidth="1"
              />
              <text x={PLOT.left - 8} y={scaleY(tick) + 4} textAnchor="end" fontSize="11" fill="var(--mq-muted)">
                {tick}
              </text>
            </g>
          ))}

          {/* incoming traffic */}
          {incoming.map((qps, index) => {
            const left = PLOT.left + index * barWidth + barWidth * 0.18;
            const width = barWidth * 0.64;
            const safe = Math.min(qps, capacity);
            const over = Math.max(0, qps - safe);
            const y = scaleY(qps);
            const height = PLOT.bottom - y;
            const safeHeight = (safe / AXIS_MAX) * (PLOT.bottom - PLOT.top);
            const overHeight = (over / AXIS_MAX) * (PLOT.bottom - PLOT.top);
            const overflowColor = useMq ? 'var(--mq-ok)' : 'var(--mq-bad)';
            return (
              <g key={index}>
                <rect
                  x={left}
                  y={PLOT.bottom - safeHeight}
                  width={width}
                  height={safeHeight}
                  fill={useMq ? 'var(--mq-ok)' : 'var(--mq-warn)'}
                  opacity="0.75"
                  rx="2"
                />
                {over > 0 ? (
                  <rect
                    x={left}
                    y={PLOT.bottom - safeHeight - overHeight}
                    width={width}
                    height={overHeight}
                    fill={overflowColor}
                    opacity="0.85"
                    rx="2"
                  />
                ) : null}
                <title>{`第 ${index + 1}s 到达 ${qps} QPS`}</title>
              </g>
            );
          })}

          {/* capacity line */}
          <line
            x1={PLOT.left}
            x2={PLOT.right}
            y1={scaleY(capacity)}
            y2={scaleY(capacity)}
            stroke="var(--mq-accent)"
            strokeWidth="2"
            strokeDasharray="7 4"
          />
          <text x={PLOT.right} y={scaleY(capacity) - 6} textAnchor="end" fontSize="11.5" fill="var(--mq-accent)">
            下游能力 {capacity} QPS
          </text>

          {/* backlog line, only meaningful with a broker in front */}
          {useMq ? (
            <polyline
              fill="none"
              stroke="var(--mq-broker)"
              strokeWidth="2.4"
              points={depths
                .map((value, index) => {
                  const x = PLOT.left + index * barWidth + barWidth / 2;
                  const ratio = maxDepth ? value / maxDepth : 0;
                  const y = PLOT.bottom - ratio * (PLOT.bottom - PLOT.top) * 0.92;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          ) : null}

          <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} stroke="var(--mq-line)" strokeWidth="1.4" />
          <text x={PLOT.left} y={PLOT.bottom + 18} fontSize="11" fill="var(--mq-muted)">
            时间（秒）
          </text>
        </svg>
      </div>

      <div className={styles['mq-legend']}>
        {useMq ? (
          <>
            <span className={styles['mq-legend-item']}>
              <span className={styles['mq-swatch']} style={{ background: 'var(--mq-ok)' }} />
              全部收下，先进队列排队
            </span>
            <span className={styles['mq-legend-item']}>
              <span className={styles['mq-swatch']} style={{ background: 'var(--mq-broker)' }} />
              队列积压量（曲线最高点 = 积压峰值）
            </span>
          </>
        ) : (
          <>
            <span className={styles['mq-legend-item']}>
              <span className={styles['mq-swatch']} style={{ background: 'var(--mq-warn)' }} />
              能力内正常处理
            </span>
            <span className={styles['mq-legend-item']}>
              <span className={styles['mq-swatch']} style={{ background: 'var(--mq-bad)' }} />
              超过能力 → 请求失败
            </span>
          </>
        )}
      </div>

      <div className={styles['mq-stats']}>
        {useMq ? (
          <>
            <div className={styles['mq-stat']}>
              <span className={styles['mq-stat-k']}>积压峰值</span>
              <span className={styles['mq-stat-v']}>{maxDepth.toLocaleString()} 条</span>
            </div>
            <div className={styles['mq-stat']}>
              <span className={styles['mq-stat-k']}>峰值过后清空还需</span>
              <span className={styles['mq-stat-v']}>≈ {drainSeconds.toFixed(1)}s</span>
            </div>
            <div className={styles['mq-stat']}>
              <span className={styles['mq-stat-k']}>失败的请求</span>
              <span className={styles['mq-stat-v']}>0（都收下了）</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles['mq-stat']}>
              <span className={styles['mq-stat-k']}>失败的请求</span>
              <span className={styles['mq-stat-v']}>{failed.toLocaleString()} 条</span>
            </div>
            <div className={styles['mq-stat']}>
              <span className={styles['mq-stat-k']}>下游被压垮</span>
              <span className={styles['mq-stat-v']}>{peak > capacity ? '是（持续超载）' : '否'}</span>
            </div>
          </>
        )}
      </div>

      <div className={cx('mq-note', useMq ? 'mq-note-ok' : 'mq-note-bad')}>
        {useMq ? (
          <>
            积压不是免费的：队列把「瞬时压力」变成「持续压力」，占空间也要时间消化。恢复时间可以粗略估成{' '}
            <code>积压量 ÷ 消费能力</code>，本例约 {drainSeconds.toFixed(1)} 秒——这段时间下游仍然是满负荷。
          </>
        ) : (
          <>下游只有 {capacity} QPS 的消化能力，超出的部分没有缓冲，只能拒绝或超时。</>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Widget
 * ------------------------------------------------------------------ */

const MqRolesDemo = function ({ caption = '' }) {
  const [tab, setTab] = useState('async');

  return (
    <div className={styles.mq}>
      <div className={styles['mq-head']}>
        <span className={styles['mq-badge']}>交互演示</span>
        <span className={styles['mq-caption']}>{caption || 'MQ 的三大作用'}</span>
        <span className={styles['mq-hint']}>点按钮切换对比，动画会重播</span>
      </div>

      <div className={styles['mq-tabs']}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cx('mq-tab', tab === item.id && 'mq-tab-on')}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'async' ? <AsyncTab /> : null}
      {tab === 'decouple' ? <DecoupleTab /> : null}
      {tab === 'peak' ? <PeakTab /> : null}
    </div>
  );
};

MqRolesDemo.propTypes = {
  /** Shown next to the "交互演示" badge. */
  caption: PropTypes.string,
};

export default MqRolesDemo;
