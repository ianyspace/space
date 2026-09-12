import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import {
  buildTree,
  insertSteps,
  removeSteps,
  searchSteps,
  collectValues,
  treeStats,
} from './bPlusTree';

import styles from './BPlusTreeLab.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define (the
 * `bpt-action-*` hooks that only exist in the markup) are skipped instead of
 * leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const KEY_W = 36;
const NODE_PAD = 6;
const NODE_H = 30;
const LEVEL_H = 86;
const H_GAP = 22;
const MARGIN_X = 26;
const MARGIN_Y = 22;

const DEFAULT_KEYS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
const SPEEDS = [1500, 1050, 750, 480, 260];

function nodeWidth(node) {
  return Math.max(node.keys.length, 1) * KEY_W + NODE_PAD * 2;
}

/** Assigns coordinates: leaves are laid out left→right, parents centred above their children. */
function layoutTree(root) {
  const positions = new Map();
  let cursor = 0;
  let maxDepth = 0;

  const place = (node, depth) => {
    maxDepth = Math.max(maxDepth, depth);
    const w = nodeWidth(node);

    if (node.leaf || node.children.length === 0) {
      const x = cursor + w / 2;
      cursor += w + H_GAP;
      positions.set(node.id, { x, y: depth * LEVEL_H, w });
      return x;
    }

    const childXs = node.children.map((child) => place(child, depth + 1));
    const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    positions.set(node.id, { x, y: depth * LEVEL_H, w });
    return x;
  };

  place(root, 0);

  return {
    positions,
    width: Math.max(cursor - H_GAP, 260),
    height: maxDepth * LEVEL_H + NODE_H,
  };
}

function flatten(root) {
  const nodes = [];
  const edges = [];
  const leaves = [];

  const walk = (node, parent) => {
    nodes.push(node);
    if (parent) edges.push({ id: `${parent.id}->${node.id}`, from: parent.id, to: node.id });
    if (node.leaf) {
      leaves.push(node);
      return;
    }
    node.children.forEach((child) => walk(child, node));
  };

  walk(root, null);
  return { nodes, edges, leaves };
}

const STEP_LABEL = {
  start: '开始',
  compare: '比较',
  insert: '插入',
  split: '分裂',
  promote: '上移',
  newroot: '长高',
  remove: '删除',
  underflow: '下溢',
  borrow: '借位',
  merge: '合并',
  found: '命中',
  notfound: '未命中',
  duplicate: '重复',
  done: '完成',
};

const BPlusTreeLab = function ({ order: orderProp = 4, keys: keysProp = '', caption = '' }) {
  const parsedOrder = Math.min(6, Math.max(3, Number(orderProp) || 4));
  const parsedKeys = useMemo(() => {
    const raw = String(keysProp || '').trim();
    if (!raw) return DEFAULT_KEYS;
    const list = raw
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
    return list.length ? list : DEFAULT_KEYS;
  }, [keysProp]);

  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const markerId = `bpt-arrow-${reactId}`;

  const [order, setOrder] = useState(parsedOrder);
  const [tree, setTree] = useState(() => buildTree(parsedOrder, parsedKeys));
  const [steps, setSteps] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(3);
  const [input, setInput] = useState('');
  const [autoRunning, setAutoRunning] = useState(false);

  const treeRef = useRef(tree);
  const queueRef = useRef([]);
  const startOpRef = useRef(() => {});
  const logRef = useRef(null);

  const current = steps.length ? steps[Math.min(index, steps.length - 1)] : null;
  const viewRoot = current ? current.root : tree;
  const activeIds = current?.active ?? [];
  const createdIds = current?.created ?? [];
  const pathIds = current?.path ?? [];
  const action = current?.action ?? 'idle';

  const layout = useMemo(() => layoutTree(viewRoot), [viewRoot]);
  const flat = useMemo(() => flatten(viewRoot), [viewRoot]);
  const stats = useMemo(() => treeStats(viewRoot), [viewRoot]);
  const values = useMemo(() => collectValues(viewRoot), [viewRoot]);

  const delay = SPEEDS[speedLevel - 1];

  /* ---------------------------------------------------------------- *
   * Operations
   * ---------------------------------------------------------------- */

  const startOp = (op, presetValue) => {
    const value = presetValue !== undefined ? Number(presetValue) : Number(input);
    if (!Number.isFinite(value)) return;

    const base = treeRef.current;
    let next = [];
    if (op === 'insert') next = insertSteps(order, base, value);
    else if (op === 'remove') next = removeSteps(order, base, value);
    else next = searchSteps(order, base, value);

    if (!next.length) return;

    const finalRoot = next[next.length - 1].root;
    treeRef.current = finalRoot;
    setTree(finalRoot);
    setSteps(next);
    setIndex(0);
    setPlaying(true);
    setInput(String(value));
  };
  startOpRef.current = startOp;

  const randomMissingKey = () => {
    const present = new Set(collectValues(treeRef.current));
    for (let i = 0; i < 400; i += 1) {
      const candidate = Math.floor(Math.random() * 99) + 1;
      if (!present.has(candidate)) return candidate;
    }
    return 99;
  };

  const reset = (nextOrder = order) => {
    setAutoRunning(false);
    queueRef.current = [];
    const fresh = buildTree(nextOrder, parsedKeys);
    treeRef.current = fresh;
    setTree(fresh);
    setSteps([]);
    setIndex(0);
    setPlaying(false);
    setInput('');
  };

  const changeOrder = (event) => {
    const nextOrder = Number(event.target.value);
    setOrder(nextOrder);
    reset(nextOrder);
  };

  const autoDemo = () => {
    setAutoRunning(false);
    queueRef.current = [];
    const fresh = buildTree(order, []);
    treeRef.current = fresh;
    setTree(fresh);
    setSteps([]);
    setIndex(0);
    setPlaying(false);
    // Queue a sequence that forces several splits so the process is easy to follow.
    queueRef.current = [10, 20, 30, 40, 50, 60, 70, 25, 35, 45];
    setTimeout(() => setAutoRunning(true), 250);
  };

  /* ---------------------------------------------------------------- *
   * Playback
   * ---------------------------------------------------------------- */

  useEffect(() => {
    if (!playing || steps.length === 0) return undefined;
    if (index >= steps.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), delay);
    return () => clearTimeout(timer);
  }, [playing, index, steps, delay]);

  useEffect(() => {
    if (!autoRunning || playing) return undefined;
    if (steps.length > 0 && index < steps.length - 1) return undefined;

    const nextValue = queueRef.current.shift();
    if (nextValue === undefined) {
      setAutoRunning(false);
      return undefined;
    }
    const timer = setTimeout(() => startOpRef.current('insert', nextValue), 420);
    return () => clearTimeout(timer);
  }, [autoRunning, playing, index, steps]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [index, steps]);

  const togglePlay = () => {
    if (!steps.length) {
      startOp('insert', randomMissingKey());
      return;
    }
    if (index >= steps.length - 1) {
      setIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying(!playing);
  };

  const stepBy = (delta) => {
    setPlaying(false);
    setAutoRunning(false);
    setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(steps.length - 1, 0)));
  };

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  const progress = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 0;
  const svgWidth = layout.width + MARGIN_X * 2;
  const svgHeight = layout.height + MARGIN_Y * 2;

  const isActive = (id) => activeIds.includes(id);
  const isCreated = (id) => createdIds.includes(id);
  const isOnPath = (id) => pathIds.includes(id);

  return (
    <figure className={cx('bpt', `bpt-action-${action}`)}>
      <div className={cx('bpt-head')}>
        <span className={cx('bpt-badge')}>互动演示</span>
        {caption ? <span className={cx('bpt-caption')}>{caption}</span> : null}
        <span className={cx('bpt-stats')}>
          阶 m={order} · 树高 {stats.height} · 叶子 {stats.leaves} · 键 {values.length}
        </span>
      </div>

      <div className={cx('bpt-toolbar')}>
        <label className={cx('bpt-field')}>
          <span>阶</span>
          <select value={order} onChange={changeOrder} aria-label="选择 B+ 树的阶">
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </label>
        <input
          className={cx('bpt-input')}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9-]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') startOp('insert');
          }}
          placeholder="输入一个整数"
          aria-label="要操作的键"
        />
        <button type="button" className={cx('bpt-btn', 'primary')} onClick={() => startOp('insert')}>
          插入
        </button>
        <button type="button" className={cx('bpt-btn')} onClick={() => startOp('remove')}>
          删除
        </button>
        <button type="button" className={cx('bpt-btn')} onClick={() => startOp('search')}>
          查找
        </button>
        <button type="button" className={cx('bpt-btn')} onClick={() => startOp('insert', randomMissingKey())}>
          随机插入
        </button>
        <button type="button" className={cx('bpt-btn')} onClick={() => reset()}>
          重置
        </button>
      </div>

      <div className={cx('bpt-toolbar')}>
        <button
          type="button"
          className={cx('bpt-btn')}
          onClick={() => stepBy(-1)}
          disabled={!steps.length || index === 0}
        >
          ⏮ 上一步
        </button>
        <button type="button" className={cx('bpt-btn', 'primary')} onClick={togglePlay} disabled={autoRunning}>
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          className={cx('bpt-btn')}
          onClick={() => stepBy(1)}
          disabled={!steps.length || index >= steps.length - 1}
        >
          下一步 ⏭
        </button>
        <button type="button" className={cx('bpt-btn')} onClick={autoDemo} disabled={autoRunning}>
          🎬 自动演示（插入 10 个数）
        </button>
        <label className={cx('bpt-field')}>
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
          <span className={cx('bpt-speed-hint')}>{speedLevel >= 4 ? '快' : speedLevel <= 2 ? '慢' : '中'}</span>
        </label>
        <span className={cx('bpt-step-counter')}>
          {steps.length ? `第 ${index + 1} / ${steps.length} 步` : '等待操作'}
        </span>
      </div>

      <div className={cx('bpt-progress')} role="presentation">
        <div className={cx('bpt-progress-bar')} style={{ width: `${progress}%` }} />
      </div>

      <div className={cx('bpt-canvas')}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          role="img"
          aria-label="B+ 树结构示意图"
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f7a046" />
            </marker>
          </defs>

          <g transform={`translate(${MARGIN_X}, ${MARGIN_Y})`}>
            {flat.edges.map((edge) => {
              const parent = layout.positions.get(edge.from);
              const child = layout.positions.get(edge.to);
              if (!parent || !child) return null;
              const onPath = isOnPath(edge.from) && isOnPath(edge.to);
              const active = isActive(edge.from) && isActive(edge.to);
              return (
                <line
                  key={edge.id}
                  className={cx('bpt-edge', onPath && 'is-path', active && 'is-active')}
                  x1={parent.x}
                  y1={parent.y + NODE_H}
                  x2={child.x}
                  y2={child.y}
                />
              );
            })}

            {flat.leaves.map((leaf, i) => {
              const nextLeaf = flat.leaves[i + 1];
              if (!nextLeaf) return null;
              const from = layout.positions.get(leaf.id);
              const to = layout.positions.get(nextLeaf.id);
              return (
                <line
                  key={`${leaf.id}-link`}
                  className={cx('bpt-leaflink')}
                  x1={from.x + from.w / 2}
                  y1={from.y + NODE_H / 2}
                  x2={to.x - to.w / 2 - 2}
                  y2={to.y + NODE_H / 2}
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}

            {flat.nodes.map((node) => {
              const pos = layout.positions.get(node.id);
              if (!pos) return null;
              const classes = cx(
                'bpt-node',
                isOnPath(node.id) && 'is-path',
                isActive(node.id) && 'is-active',
                isCreated(node.id) && 'is-new',
              );

              return (
                <g
                  key={node.id}
                  className={classes}
                  style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                >
                  <rect
                    className={cx('bpt-node-bg')}
                    x={-pos.w / 2}
                    y={0}
                    width={pos.w}
                    height={NODE_H}
                    rx={6}
                  />
                  {node.keys.length === 0 ? (
                    <text className={cx('bpt-empty')} x={0} y={NODE_H / 2 + 1}>
                      ∅
                    </text>
                  ) : null}
                  {node.keys.map((key, keyIndex) => {
                    const keyX = -pos.w / 2 + NODE_PAD + keyIndex * KEY_W;
                    const found = current?.foundKey === key;
                    return (
                      <g
                        key={`${node.id}-${key}-${keyIndex}`}
                        className={cx('bpt-key', found && 'is-found')}
                      >
                        <rect x={keyX} y={4} width={KEY_W - 4} height={NODE_H - 8} rx={4} />
                        <text x={keyX + (KEY_W - 4) / 2} y={NODE_H / 2 + 1}>
                          {key}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className={cx('bpt-legend')}>
        <span>
          <i className={cx('bpt-dot', 'is-active')} />当前操作节点
        </span>
        <span>
          <i className={cx('bpt-dot', 'is-path')} />查找路径
        </span>
        <span>
          <i className={cx('bpt-dot', 'is-new')} />新节点
        </span>
        <span>
          <i className={cx('bpt-dot', 'is-leaf')} />叶子链表指针
        </span>
      </div>

      <div className={cx('bpt-note')}>
        <span className={cx('bpt-note-tag')}>{STEP_LABEL[action] ?? '提示'}</span>
        <span className={cx('bpt-note-text')}>
          {current ? current.message : '输入一个整数，点击「插入 / 删除 / 查找」，或直接点「自动演示」观看完整过程。'}
        </span>
      </div>

      <div className={cx('bpt-log')} ref={logRef}>
        {steps.slice(0, index + 1).map((step, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={`${i}-${step.action}`}
            className={cx('bpt-log-item', i === index && 'is-current')}
          >
            <span className={cx('bpt-log-idx')}>{i + 1}</span>
            <span className={cx('bpt-log-tag')}>{STEP_LABEL[step.action] ?? step.action}</span>
            <span className={cx('bpt-log-text')}>{step.message}</span>
          </div>
        ))}
        {!steps.length ? <div className={cx('bpt-log-empty')}>操作记录会在这里逐步展开……</div> : null}
      </div>

      <figcaption className={cx('bpt-hint')}>
        小提示：演示里每个节点只有几个键；真实 InnoDB 的一个节点是一整个 16 KB 的页，能装上千个键，所以同样的数据量树高只有 3～4 层。把「阶」调到 3 最容易看清分裂与合并。
      </figcaption>
    </figure>
  );
};

BPlusTreeLab.propTypes = {
  order: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  keys: PropTypes.string,
  caption: PropTypes.string,
};

BPlusTreeLab.defaultProps = {
  order: 4,
  keys: '',
  caption: '',
};

export default BPlusTreeLab;
