import React, { useEffect, useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './ThreadStateFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const NODE_W = 148;
const NODE_H = 48;
const SPEEDS = [1500, 1050, 750, 480, 260];

const NODES = [
  { id: 'NEW', x: 92, y: 58, zh: '新建', tone: 'new' },
  { id: 'RUNNABLE', x: 368, y: 58, zh: '可运行', tone: 'runnable' },
  { id: 'TERMINATED', x: 700, y: 58, zh: '已终止', tone: 'terminated' },
  { id: 'BLOCKED', x: 110, y: 240, zh: '阻塞', tone: 'blocked' },
  { id: 'WAITING', x: 368, y: 240, zh: '无限等待', tone: 'waiting' },
  { id: 'TIMED_WAITING', x: 626, y: 240, zh: '限时等待', tone: 'timed' },
];

const NODE_MAP = Object.fromEntries(NODES.map((node) => [node.id, node]));

/**
 * State transitions. `bend` is the perpendicular offset of the quadratic
 * control point from the segment midpoint; a pair of opposite edges sharing
 * the same `bend` bulge to opposite sides, forming a clean two-way corridor.
 * Labels are hand-placed (SVG coordinates) to stay clear of every arc.
 */
const EDGES = [
  { id: 'start', from: 'NEW', to: 'RUNNABLE', bend: 0, labels: ['start()'], label: { x: 230, y: 44, anchor: 'middle' } },
  { id: 'terminated', from: 'RUNNABLE', to: 'TERMINATED', bend: 0, labels: ['run() 执行完毕'], label: { x: 534, y: 44, anchor: 'middle' } },
  { id: 'blocked-in', from: 'RUNNABLE', to: 'BLOCKED', bend: 36, labels: ['synchronized', '获取锁失败'], label: { x: 212, y: 118, anchor: 'end' } },
  { id: 'blocked-out', from: 'BLOCKED', to: 'RUNNABLE', bend: 36, labels: ['获取到锁'], label: { x: 264, y: 178, anchor: 'start' } },
  { id: 'wait-in', from: 'RUNNABLE', to: 'WAITING', bend: 40, labels: ['wait()/join()', 'park()'], label: { x: 340, y: 148, anchor: 'end' } },
  { id: 'wait-out', from: 'WAITING', to: 'RUNNABLE', bend: 40, labels: ['notify()/unpark()'], label: { x: 396, y: 118, anchor: 'start' } },
  { id: 'timed-in', from: 'RUNNABLE', to: 'TIMED_WAITING', bend: 36, labels: ['sleep(t)/wait(t)', 'join(t)'], label: { x: 470, y: 196, anchor: 'middle' } },
  { id: 'timed-out', from: 'TIMED_WAITING', to: 'RUNNABLE', bend: 36, labels: ['超时 / 被唤醒'], label: { x: 545, y: 118, anchor: 'start' } },
];

const EDGE_MAP = Object.fromEntries(EDGES.map((edge) => [edge.id, edge]));

const DETAILS = {
  NEW: {
    desc: '线程对象已在堆中创建，但还没有调用 start()，JVM 尚未创建操作系统线程。',
    enter: 'new Thread()',
    leave: 'start() → RUNNABLE',
  },
  RUNNABLE: {
    desc: '可运行状态：正在 CPU 上执行，或者在等待 CPU 时间片。Java 里没有「运行中/就绪」的细分，统一叫 RUNNABLE。',
    enter: 'start()、阻塞结束后被唤醒',
    leave: '获取锁失败 → BLOCKED；wait()/sleep()/join() → 等待；run() 结束 → TERMINATED',
  },
  BLOCKED: {
    desc: '等待获取 synchronized 锁：锁已经被其他线程持有，线程被挡在 Monitor 的 EntryList 里。只会在这个场景出现。',
    enter: '进入 synchronized 块/方法时竞争锁失败',
    leave: '持锁线程释放锁，重新竞争成功 → RUNNABLE',
  },
  WAITING: {
    desc: '无限期等待：主动等待某个信号，不占用 CPU，必须由其他线程显式唤醒。',
    enter: 'wait() / join() / LockSupport.park()',
    leave: 'notify()/notifyAll()/unpark()（join 则是目标线程结束）→ RUNNABLE',
  },
  TIMED_WAITING: {
    desc: '限时等待：WAITING 的带超时版本，到时间自动唤醒，期间也可以被提前唤醒。',
    enter: 'sleep(t) / wait(t) / join(t) / park(t)',
    leave: '超时自动唤醒或被唤醒 → RUNNABLE',
  },
  TERMINATED: {
    desc: '线程的 run() 已经执行完毕（正常结束或抛出异常），生命周期终结，不能再 start()。',
    enter: 'run() 执行完毕',
    leave: '终态，不会再离开',
  },
};

/** A typical thread lifetime: one step per state visit, `edge` is the transition just taken. */
const LIFECYCLE = [
  { state: 'NEW', edge: null, message: 'new Thread()：线程对象已创建，还只是一个普通的 Java 对象。' },
  { state: 'RUNNABLE', edge: 'start', message: 'start()：JVM 创建操作系统线程，线程进入可运行状态，等待 CPU 调度。' },
  { state: 'BLOCKED', edge: 'blocked-in', message: '执行到 synchronized 块，但锁被其他线程持有，获取锁失败进入阻塞。' },
  { state: 'RUNNABLE', edge: 'blocked-out', message: '持锁线程释放了锁，本线程竞争成功，回到可运行状态继续执行。' },
  { state: 'WAITING', edge: 'wait-in', message: '调用 wait()（或 join()/park()），主动进入无限期等待，等待被唤醒。' },
  { state: 'RUNNABLE', edge: 'wait-out', message: '其他线程调用了 notify()/unpark()，唤醒后重新竞争锁，回到可运行。' },
  { state: 'TIMED_WAITING', edge: 'timed-in', message: '调用 sleep(1000)（或 wait(t)/join(t)），进入限时等待，不释放锁。' },
  { state: 'RUNNABLE', edge: 'timed-out', message: '超时自动唤醒，回到可运行状态。' },
  { state: 'TERMINATED', edge: 'terminated', message: 'run() 执行完毕，线程生命周期结束。' },
];

/** Point on a node's rectangular border along the direction to (tx, ty). */
function borderPoint(node, tx, ty) {
  const dx = tx - node.x;
  const dy = ty - node.y;
  const sx = NODE_W / 2 / Math.abs(dx || 1e-9);
  const sy = NODE_H / 2 / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return [node.x + dx * s, node.y + dy * s];
}

function edgeGeometry(edge) {
  const a = NODE_MAP[edge.from];
  const b = NODE_MAP[edge.to];
  const [x1, y1] = borderPoint(a, b.x, b.y);
  const [x2, y2] = borderPoint(b, a.x, a.y);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  if (!edge.bend) {
    return { x1, y1, x2, y2, cx: mx, cy: my, lx: mx, ly: my };
  }
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const px = -(y2 - y1) / len;
  const py = (x2 - x1) / len;
  return {
    x1,
    y1,
    x2,
    y2,
    cx: mx + px * edge.bend,
    cy: my + py * edge.bend,
    lx: mx + px * (edge.bend / 2),
    ly: my + py * (edge.bend / 2),
  };
}

const GEOMETRY = Object.fromEntries(EDGES.map((edge) => [edge.id, edgeGeometry(edge)]));

const ThreadStateFigure = function ({ caption = '' }) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const markerId = `tsf-arrow-${reactId}`;
  const markerActiveId = `tsf-arrow-active-${reactId}`;

  const [selected, setSelected] = useState(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(3);

  const delay = SPEEDS[speedLevel - 1];
  const current = LIFECYCLE[index];

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= LIFECYCLE.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, LIFECYCLE.length - 1)), delay);
    return () => clearTimeout(timer);
  }, [playing, index, delay]);

  const togglePlay = () => {
    if (index >= LIFECYCLE.length - 1) {
      setIndex(0);
      setStarted(true);
      setPlaying(true);
      return;
    }
    setStarted(true);
    setPlaying(!playing);
  };

  const stepBy = (delta) => {
    setPlaying(false);
    setStarted(true);
    setIndex((i) => Math.min(Math.max(i + delta, 0), LIFECYCLE.length - 1));
  };

  const reset = () => {
    setPlaying(false);
    setStarted(false);
    setIndex(0);
  };

  const selectNode = (id) => {
    setPlaying(false);
    setSelected((prev) => (prev === id ? null : id));
  };

  const activeState = started ? current.state : null;
  const activeEdge = started ? current.edge : null;
  const progress = ((LIFECYCLE.length - 1) > 0 ? index / (LIFECYCLE.length - 1) : 0) * 100;

  const detail = useMemo(() => (selected ? DETAILS[selected] : null), [selected]);

  return (
    <figure className={cx('tsf')}>
      <div className={cx('tsf-head')}>
        <span className={cx('tsf-badge')}>互动演示</span>
        {caption ? <span className={cx('tsf-caption')}>{caption}</span> : null}
        <span className={cx('tsf-stats')}>点击节点看说明 · 播放看线程的一生</span>
      </div>

      <div className={cx('tsf-toolbar')}>
        <button type="button" className={cx('tsf-btn')} onClick={() => stepBy(-1)} disabled={!started || index === 0}>
          ⏮ 上一步
        </button>
        <button type="button" className={cx('tsf-btn', 'primary')} onClick={togglePlay}>
          {playing ? '⏸ 暂停' : '▶ 播放线程一生'}
        </button>
        <button
          type="button"
          className={cx('tsf-btn')}
          onClick={() => stepBy(1)}
          disabled={!started || index >= LIFECYCLE.length - 1}
        >
          下一步 ⏭
        </button>
        <button type="button" className={cx('tsf-btn')} onClick={reset} disabled={!started}>
          ↺ 重置
        </button>
        <label className={cx('tsf-field')}>
          <span>速度</span>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={speedLevel}
            onChange={(e) => setSpeedLevel(Number(e.target.value))}
            aria-label="播放速度"
          />
          <span className={cx('tsf-speed-hint')}>{speedLevel >= 4 ? '快' : speedLevel <= 2 ? '慢' : '中'}</span>
        </label>
        <span className={cx('tsf-step-counter')}>
          {started ? `第 ${index + 1} / ${LIFECYCLE.length} 步` : '等待播放'}
        </span>
      </div>

      <div className={cx('tsf-progress')} role="presentation">
        <div className={cx('tsf-progress-bar')} style={{ width: `${progress}%` }} />
      </div>

      <div className={cx('tsf-canvas')}>
        <svg viewBox="0 0 860 300" width="100%" role="img" aria-label="Java 线程 6 种状态转换图">
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tsf-edge)" />
            </marker>
            <marker
              id={markerActiveId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tsf-accent)" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const geo = GEOMETRY[edge.id];
            const related = selected != null && (edge.from === selected || edge.to === selected);
            const active = activeEdge === edge.id;
            return (
              <g key={edge.id}>
                <path
                  className={cx('tsf-edge', related && 'is-related', active && 'is-active')}
                  d={`M ${geo.x1} ${geo.y1} Q ${geo.cx} ${geo.cy} ${geo.x2} ${geo.y2}`}
                  fill="none"
                  markerEnd={`url(#${active ? markerActiveId : markerId})`}
                />
                <text className={cx('tsf-edge-label', active && 'is-active')} x={edge.label.x} y={edge.label.y} textAnchor={edge.label.anchor}>
                  {edge.labels.map((line, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tspan key={`${edge.id}-${i}`} x={edge.label.x} dy={i === 0 ? 0 : 15}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}

          {NODES.map((node) => {
            const isSelected = selected === node.id;
            const isActive = activeState === node.id;
            const info = DETAILS[node.id];
            return (
              <g
                key={node.id}
                className={cx('tsf-node', isSelected && 'is-selected', isActive && 'is-playing')}
                onClick={() => selectNode(node.id)}
                role="button"
                tabIndex={0}
                aria-label={`状态 ${node.id}（${node.zh}）`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectNode(node.id);
                  }
                }}
              >
                <title>{`${node.id}（${node.zh}）：${info.desc}`}</title>
                <rect
                  className={cx('tsf-node-bg', `tone-${node.tone}`)}
                  x={node.x - NODE_W / 2}
                  y={node.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                />
                <text className={cx('tsf-node-name')} x={node.x} y={node.y - 5} textAnchor="middle">
                  {node.id}
                </text>
                <text className={cx('tsf-node-zh')} x={node.x} y={node.y + 13} textAnchor="middle">
                  {node.zh}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {detail ? (
        <div className={cx('tsf-detail')}>
          <div className={cx('tsf-detail-head')}>
            <span className={cx('tsf-detail-chip', `tone-${NODE_MAP[selected].tone}`)}>
              {selected} · {NODE_MAP[selected].zh}
            </span>
            <button type="button" className={cx('tsf-detail-close')} onClick={() => setSelected(null)} aria-label="关闭说明">
              ✕
            </button>
          </div>
          <p className={cx('tsf-detail-desc')}>{detail.desc}</p>
          <div className={cx('tsf-detail-row')}>
            <span className={cx('tsf-detail-key')}>怎么进入</span>
            <span>{detail.enter}</span>
          </div>
          <div className={cx('tsf-detail-row')}>
            <span className={cx('tsf-detail-key')}>怎么离开</span>
            <span>{detail.leave}</span>
          </div>
        </div>
      ) : null}

      <div className={cx('tsf-note')}>
        <span className={cx('tsf-note-tag')}>{started ? `第 ${index + 1} 步` : '提示'}</span>
        <span className={cx('tsf-note-text')}>
          {started
            ? current.message
            : '点击「播放线程一生」看一个线程从创建到终止的完整旅程，或点击任意状态节点查看说明。'}
        </span>
      </div>

      <figcaption className={cx('tsf-hint')}>
        小 tips：BLOCKED 只会出现在等待 synchronized 锁的场景；wait() 必须在 synchronized 块中调用，
        被唤醒后还要重新竞争锁才能回到 RUNNABLE。对应表格版速查见下方。
      </figcaption>
    </figure>
  );
};

ThreadStateFigure.propTypes = {
  caption: PropTypes.string,
};

ThreadStateFigure.defaultProps = {
  caption: '',
};

export default ThreadStateFigure;
