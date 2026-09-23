import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './ThreadPoolFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const CORE = 2;
const QUEUE_CAP = 2;
const EXTRA = 2; // maximumPoolSize = CORE + EXTRA = 4

const IDLE_MSG = '连点「提交任务」：前 2 个建核心线程，第 3、4 个入队，第 5、6 个才会建非核心线程，第 7 个被拒绝 —— 这就是问答必考的顺序。';

/**
 * Submission-decision simulator. The counterintuitive part of the workflow is
 * the order (core threads → queue → non-core threads → reject), so the demo
 * keeps the pool small and shows exactly which checks each submission passes
 * and fails — no animation machinery needed.
 */
const ThreadPoolFigure = function ({ caption = '' }) {
  const [core, setCore] = useState([]);
  const [queue, setQueue] = useState([]);
  const [extra, setExtra] = useState([]);
  const [rejected, setRejected] = useState(0);
  const [msg, setMsg] = useState(IDLE_MSG);
  const [flash, setFlash] = useState(null); // 'core' | 'queue' | 'extra' | 'reject'
  const idRef = useRef(0);

  const reset = () => {
    setCore([]);
    setQueue([]);
    setExtra([]);
    setRejected(0);
    setFlash(null);
    setMsg(IDLE_MSG);
  };

  const submit = () => {
    const id = idRef.current + 1;
    idRef.current = id;

    if (core.length < CORE) {
      setCore([...core, id]);
      setFlash('core');
      setMsg(`任务 #${id}：① 线程数 ${core.length} < corePoolSize(${CORE})？是 → 直接创建核心线程执行，即使有空闲核心线程也新建。`);
      return;
    }
    if (queue.length < QUEUE_CAP) {
      setQueue([...queue, id]);
      setFlash('queue');
      setMsg(`任务 #${id}：① 线程数已达 ${CORE}？否（=）→ ② 队列未满（${queue.length}/${QUEUE_CAP}）？是 → 任务入队等待。注意：此时还不会创建非核心线程。`);
      return;
    }
    if (extra.length < EXTRA) {
      setExtra([...extra, id]);
      setFlash('extra');
      setMsg(`任务 #${id}：① 满 → ② 队列也满（${QUEUE_CAP}/${QUEUE_CAP}）→ ③ 线程数 ${CORE + extra.length} < maximumPoolSize(${CORE + EXTRA})？是 → 创建非核心线程执行。`);
      return;
    }
    setRejected(rejected + 1);
    setFlash('reject');
    setMsg(`任务 #${id}：①②③ 全部不满足 → ④ 执行拒绝策略：默认 AbortPolicy 抛出 RejectedExecutionException。生产中常用 CallerRunsPolicy 反压。`);
  };

  const capacity = { core: CORE, queue: QUEUE_CAP, extra: EXTRA, reject: null };

  const slot = (key, tone, title, sub, items, emptyLabel) => (
    <div className={cx('tpf-group', `tone-${tone}`, flash === key && 'is-hot', key === 'reject' && 'is-reject')}>
      <div className={cx('tpf-group-head')}>
        <span className={cx('tpf-group-title')}>{title}</span>
        <span className={cx('tpf-group-sub')}>{sub}</span>
      </div>
      <div className={cx('tpf-slots')}>
        {items.map((id) => (
          <span key={id} className={cx('tpf-slot', 'is-filled')}>{emptyLabel} #{id}</span>
        ))}
        {capacity[key] != null
          ? Array.from({ length: Math.max(capacity[key] - items.length, 0) }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <span key={`empty-${i}`} className={cx('tpf-slot')}>空闲</span>
          ))
          : null}
        {key === 'reject' && items.length === 0 ? (
          <span className={cx('tpf-slot')}>尚未触发</span>
        ) : null}
      </div>
    </div>
  );

  return (
    <figure className={cx('tpf')}>
      <div className={cx('tpf-head')}>
        <span className={cx('tpf-badge')}>互动演示</span>
        {caption ? <span className={cx('tpf-caption')}>{caption}</span> : null}
        <span className={cx('tpf-stats')}>corePoolSize = 2 · 队列容量 2 · maximumPoolSize = 4</span>
      </div>

      <div className={cx('tpf-toolbar')}>
        <button type="button" className={cx('tpf-btn', 'primary')} onClick={submit}>
          ⬇ 提交一个任务
        </button>
        <button type="button" className={cx('tpf-btn')} onClick={reset}>
          ↺ 重置线程池
        </button>
        {rejected > 0 ? (
          <span className={cx('tpf-rejected')}>已拒绝 {rejected} 个任务</span>
        ) : null}
      </div>

      {slot('core', 'core', '核心线程', 'corePoolSize = 2，默认常驻不回收', core, '执行')}
      {slot('queue', 'queue', '任务队列 workQueue', '核心线程满后才轮到它缓冲', queue, '等待')}
      {slot('extra', 'extra', '非核心线程', '队列满才创建，空闲超 keepAliveTime 回收', extra, '执行')}
      {slot('reject', 'reject', '拒绝策略 handler', '线程数和队列全满才触发', Array.from({ length: rejected }, (_, i) => i + 1), '丢弃')}

      <div className={cx('tpf-note')}>
        <span className={cx('tpf-note-tag')}>决策路径</span>
        <span className={cx('tpf-note-text')}>{msg}</span>
      </div>

      <figcaption className={cx('tpf-hint')}>
        记住顺序「核心线程 → 队列 → 非核心线程 → 拒绝」：队列是缓冲层，队列满了才创建非核心线程，
        都满了才触发拒绝策略。这也是 Executors 的坑所在 —— 无界队列意味着第③步永远不会发生。
      </figcaption>
    </figure>
  );
};

ThreadPoolFigure.propTypes = {
  caption: PropTypes.string,
};

ThreadPoolFigure.defaultProps = {
  caption: '',
};

export default ThreadPoolFigure;
