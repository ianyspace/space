import React, { useId } from 'react';
import PropTypes from 'prop-types';

import styles from './AqsStructureFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const NODE_W = 148;
const NODE_H = 58;
const NODE_Y = 138;
const NODE_XS = [28, 212, 396, 580];

const NODES = [
  { title: 'head', sub: '哨兵节点', status: '占位，不代表线程', tone: 'head' },
  { title: 'Node', sub: '线程 C', status: 'SIGNAL(-1)：等着被唤醒', tone: 'signal' },
  { title: 'Node', sub: '线程 D', status: '0：挂起等待中', tone: 'plain' },
  { title: 'Node', sub: '线程 B', status: '0：新加入（队尾）', tone: 'plain' },
];

const STATE_MEANINGS = [
  ['ReentrantLock', '重入次数'],
  ['Semaphore', '剩余许可数'],
  ['CountDownLatch', '剩余计数'],
];

/**
 * Static structural figure: AQS = one volatile state + one CLH doubly-linked
 * queue. Structure has no process to animate, so prev/next pointers and the
 * two key flows (入队、唤醒) are annotated in place.
 */
const AqsStructureFigure = function ({ caption = '' }) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const markerId = `aqs-arrow-${reactId}`;

  return (
    <figure className={cx('aqs')}>
      <div className={cx('aqs-head')}>
        <span className={cx('aqs-badge')}>图解</span>
        {caption ? <span className={cx('aqs-caption')}>{caption}</span> : null}
        <span className={cx('aqs-stats')}>volatile state + CLH 双向队列</span>
      </div>

      <div className={cx('aqs-canvas')}>
        <svg viewBox="0 0 780 268" width="100%" role="img" aria-label="AQS 内部结构示意">
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
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--aqs-edge)" />
            </marker>
          </defs>

          {/* state + its three meanings */}
          <rect className={cx('aqs-state')} x={270} y={12} width={240} height={42} rx={8} />
          <text className={cx('aqs-state-text')} x={390} y={39} textAnchor="middle">volatile int state</text>
          {STATE_MEANINGS.map(([name, meaning], i) => (
            <g key={name}>
              <rect className={cx('aqs-meaning')} x={30 + i * 247} y={64} width={235} height={30} rx={6} />
              <text className={cx('aqs-meaning-text')} x={147 + i * 247} y={83} textAnchor="middle">
                {name} → {meaning}
              </text>
            </g>
          ))}

          {/* CLH queue nodes */}
          {NODES.map((node, i) => {
            const x = NODE_XS[i];
            return (
              <g key={i}>
                <rect className={cx('aqs-node', `tone-${node.tone}`)} x={x} y={NODE_Y} width={NODE_W} height={NODE_H} rx={8} />
                <text className={cx('aqs-node-title')} x={x + NODE_W / 2} y={NODE_Y + 20} textAnchor="middle">
                  {node.title}
                </text>
                <text className={cx('aqs-node-sub')} x={x + NODE_W / 2} y={NODE_Y + 36} textAnchor="middle">
                  {node.sub}
                </text>
                <text className={cx('aqs-node-status')} x={x + NODE_W / 2} y={NODE_Y + NODE_H + 15} textAnchor="middle">
                  {node.status}
                </text>
              </g>
            );
          })}

          {/* next pointers (top arcs, →); prev pointers (bottom arcs, ←) */}
          {NODE_XS.slice(0, -1).map((x, i) => {
            const x1 = x + NODE_W;
            const x2 = NODE_XS[i + 1];
            return (
              <g key={`link-${i}`}>
                <path
                  className={cx('aqs-link')}
                  d={`M ${x1 + 4} ${NODE_Y - 6} C ${x1 + 16} ${NODE_Y - 26}, ${x2 - 16} ${NODE_Y - 26}, ${x2 - 4} ${NODE_Y - 6}`}
                  markerEnd={`url(#${markerId})`}
                />
                <text className={cx('aqs-link-label')} x={(x1 + x2) / 2} y={NODE_Y - 32} textAnchor="middle">next</text>
                <path
                  className={cx('aqs-link', 'is-prev')}
                  d={`M ${x2 - 4} ${NODE_Y + NODE_H + 6} C ${x2 - 14} ${NODE_Y + NODE_H + 26}, ${x1 + 14} ${NODE_Y + NODE_H + 26}, ${x1 + 4} ${NODE_Y + NODE_H + 6}`}
                />
                {i === 0 ? (
                  <text className={cx('aqs-link-label', 'is-prev')} x={(x1 + x2) / 2} y={NODE_Y + NODE_H + 48} textAnchor="middle">← prev</text>
                ) : null}
              </g>
            );
          })}
          <text className={cx('aqs-tail')} x={748} y={NODE_Y + NODE_H / 2} textAnchor="middle">tail</text>

          {/* the two key flows */}
          <text className={cx('aqs-flow')} x={30} y={102}>acquire 失败的线程 → CAS 追加到队尾，然后 park 挂起</text>
          <text className={cx('aqs-flow', 'is-wake')} x={30} y={264}>release → 唤醒 head.next（SIGNAL 节点），它出队成为新 head</text>
        </svg>
      </div>

      <figcaption className={cx('aqs-hint')}>
        AQS 的全部秘密就是上面两样东西：一个「由子类解释含义」的 state，
        一条获取失败者排队的双向链表。模板方法模式负责排队/挂起/唤醒，
        子类只需实现 tryAcquire / tryRelease。
      </figcaption>
    </figure>
  );
};

AqsStructureFigure.propTypes = {
  caption: PropTypes.string,
};

AqsStructureFigure.defaultProps = {
  caption: '',
};

export default AqsStructureFigure;
