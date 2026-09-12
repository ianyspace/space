import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './LockUpgradeFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const SPEEDS = [1500, 1050, 750, 480, 260];
const STAGES = ['无锁', '偏向锁', '轻量级锁', '重量级锁'];

/**
 * Mark Word layouts (64-bit JVM, simplified). `bits` drives each segment's
 * flex-grow, so the bar visually mirrors the real bit layout.
 */
const MARK_WORD = {
  none: {
    badge: '无锁',
    segs: [
      { name: 'unused', bits: 26, tone: 'dim' },
      { name: 'hashCode', bits: 31, tone: 'info' },
      { name: '分代年龄', bits: 4, tone: 'info' },
      { name: '偏向=0', bits: 1, tone: 'warn' },
      { name: '01', bits: 2, tone: 'flag' },
    ],
  },
  biased: {
    badge: '偏向锁',
    segs: [
      { name: '线程 A 的 ID', bits: 54, tone: 'ok' },
      { name: 'epoch', bits: 2, tone: 'dim' },
      { name: '偏向=1', bits: 1, tone: 'warn' },
      { name: '01', bits: 2, tone: 'flag' },
    ],
  },
  light: {
    badge: '轻量级锁',
    segs: [
      { name: '→ A 栈中 Lock Record 的指针', bits: 62, tone: 'ptr' },
      { name: '00', bits: 2, tone: 'flag' },
    ],
  },
  heavy: {
    badge: '重量级锁',
    segs: [
      { name: '→ Monitor 的指针', bits: 62, tone: 'heavy' },
      { name: '10', bits: 2, tone: 'flag' },
    ],
  },
};

/**
 * One step = one event in the escalation story. `mw` is what Mark Word holds
 * after the event, `a` / `b` are the two threads' states (`acting` marks whose
 * move this step is about), `monitor` appears once the lock is inflated.
 */
const STEPS = [
  {
    mw: 'none',
    a: { text: '空闲' },
    b: { text: '空闲' },
    msg: '对象刚创建：处于无锁状态，Mark Word 里只有 hashCode 和 GC 分代年龄，还没有任何线程持有它。',
  },
  {
    mw: 'biased',
    a: { text: '首次进入同步块，JVM 写入自己的线程 ID', acting: true },
    b: { text: '空闲' },
    msg: '线程 A 第一次进入同步块：JVM 用一次 CAS 把偏向位改为 1、记下 A 的线程 ID。全程没有真正的加锁动作，几乎零开销。',
  },
  {
    mw: 'biased',
    a: { text: '再次进入：只比对线程 ID', acting: true },
    b: { text: '空闲' },
    msg: 'A 以后每次进入（包括重入），只需比对 Mark Word 里的线程 ID 是不是自己 —— 是就直接进，这就是「偏向」二字的含义。',
  },
  {
    mw: 'light',
    a: { text: '持有轻量级锁（栈帧里有 Lock Record）', acting: true },
    b: { text: '试图进入，触发偏向撤销' },
    msg: '线程 B 也想进入：锁偏向 A，偏向锁被撤销 —— 要等 A 走到安全点、检查它的状态，开销不小（这也是 JDK 15+ 默认禁用偏向锁的原因）。升级为轻量级锁：A 在栈帧里建 Lock Record，Mark Word 换成指向它的指针。',
  },
  {
    mw: 'light',
    a: { text: '持有轻量级锁' },
    b: { text: 'CAS 失败，自旋重试（CPU 空转）', acting: true },
    msg: 'B 也创建 Lock Record 并 CAS 替换 Mark Word，但指针已指向 A，CAS 失败。B 先不自挂起，而是自旋空转重试 —— 自旋次数由 JVM 自适应调整。',
  },
  {
    mw: 'heavy',
    a: { text: '持有重量级锁（Monitor.owner）', acting: true },
    b: { text: 'BLOCKED，进入 EntryList' },
    monitor: { owner: '线程 A', entry: ['线程 B'], wait: [] },
    msg: '自旋多次仍抢不到（自适应判定竞争激烈）：锁膨胀为重量级锁。Mark Word 变成指向 Monitor 的指针，B 挂起进入 EntryList 并 BLOCKED —— 内核态切换，不再耗 CPU。',
  },
  {
    mw: 'heavy',
    a: { text: '执行完毕，释放锁', acting: true },
    b: { text: '被唤醒，重新竞争' },
    monitor: { owner: '空闲', entry: [], wait: [] },
    msg: 'A 退出同步块释放锁，JVM 唤醒 EntryList 里的 B 去重新竞争 —— 又回到第一章那个 BLOCKED → RUNNABLE 的故事。',
  },
  {
    mw: 'heavy',
    a: { text: '空闲' },
    b: { text: '持有重量级锁' },
    monitor: { owner: '线程 B', entry: [], wait: [] },
    msg: '注意：升级是单向的，这把锁不会降级回轻量级或偏向锁，只会保持重量级直到对象被回收。所以低竞争场景一开始就该避免多个线程抢同一把锁。',
  },
];

const LockUpgradeFigure = function ({ caption = '' }) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(3);

  const delay = SPEEDS[speedLevel - 1];
  const step = STEPS[index];
  const markWord = MARK_WORD[step.mw];

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= STEPS.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, STEPS.length - 1)), delay);
    return () => clearTimeout(timer);
  }, [playing, index, delay]);

  const togglePlay = () => {
    if (index >= STEPS.length - 1) {
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
    setIndex((i) => Math.min(Math.max(i + delta, 0), STEPS.length - 1));
  };

  const reset = () => {
    setPlaying(false);
    setStarted(false);
    setIndex(0);
  };

  return (
    <figure className={cx('luf')}>
      <div className={cx('luf-head')}>
        <span className={cx('luf-badge')}>互动演示</span>
        {caption ? <span className={cx('luf-caption')}>{caption}</span> : null}
        <span className={cx('luf-stats')}>按「线程 A → 线程 B 加入竞争」逐步播放</span>
      </div>

      <div className={cx('luf-chain')}>
        {STAGES.map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 ? (
              <span className={cx('luf-chain-arrow', i <= step.stage && 'is-passed')} aria-hidden="true">
                →
              </span>
            ) : null}
            <span
              className={cx(
                'luf-chain-node',
                i < step.stage && 'is-done',
                i === step.stage && 'is-current',
              )}
            >
              {i < step.stage ? '✓ ' : ''}
              {name}
            </span>
          </React.Fragment>
        ))}
        <span className={cx('luf-chain-note')}>单向升级 · 不可降级</span>
      </div>

      <div className={cx('luf-grid')}>
        <div className={cx('luf-threads')}>
          {[
            ['线程 A', step.a, 'is-a'],
            ['线程 B', step.b, 'is-b'],
          ].map(([name, state, tone]) => (
            <div
              key={name}
              className={cx('luf-thread', tone, state.acting && 'is-acting')}
            >
              <span className={cx('luf-thread-name')}>{name}</span>
              <span className={cx('luf-thread-state')}>{state.text}</span>
            </div>
          ))}
          {step.monitor ? (
            <div className={cx('luf-monitor')}>
              <span className={cx('luf-monitor-title')}>Monitor（关联对象）</span>
              <div className={cx('luf-monitor-row')}>
                <span className={cx('luf-monitor-key')}>owner</span>
                <span>{step.monitor.owner}</span>
              </div>
              <div className={cx('luf-monitor-row')}>
                <span className={cx('luf-monitor-key')}>EntryList</span>
                <span>{step.monitor.entry.length ? step.monitor.entry.join('、') : '空'}</span>
              </div>
              <div className={cx('luf-monitor-row')}>
                <span className={cx('luf-monitor-key')}>WaitSet</span>
                <span>{step.monitor.wait.length ? step.monitor.wait.join('、') : '空'}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cx('luf-mw')}>
          <div className={cx('luf-mw-head')}>
            <span>对象头 Mark Word（64 位，简化）</span>
            <span className={cx('luf-mw-badge')}>{markWord.badge}</span>
          </div>
          <div className={cx('luf-mw-bar')} key={step.mw}>
            {markWord.segs.map((seg) => (
              <div
                key={seg.name}
                className={cx('luf-mw-seg', `tone-${seg.tone}`)}
                style={{ flexGrow: seg.bits }}
              >
                <span className={cx('luf-mw-seg-name')}>{seg.name}</span>
                <span className={cx('luf-mw-seg-bits')}>{seg.bits} bit</span>
              </div>
            ))}
          </div>
          <div className={cx('luf-mw-legend')}>
            {started
              ? `第 ${index + 1}/${STEPS.length} 步 · Mark Word 当前内容如上，每一步升级都是改写这块 64 位区域`
              : '点击播放，看 Mark Word 的内容随锁升级逐步被改写'}
          </div>
        </div>
      </div>

      <div className={cx('luf-toolbar')}>
        <button type="button" className={cx('luf-btn')} onClick={() => stepBy(-1)} disabled={!started || index === 0}>
          ⏮ 上一步
        </button>
        <button type="button" className={cx('luf-btn', 'primary')} onClick={togglePlay}>
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          className={cx('luf-btn')}
          onClick={() => stepBy(1)}
          disabled={!started || index >= STEPS.length - 1}
        >
          下一步 ⏭
        </button>
        <button type="button" className={cx('luf-btn')} onClick={reset} disabled={!started}>
          ↺ 重置
        </button>
        <label className={cx('luf-field')}>
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
          <span className={cx('luf-speed-hint')}>{speedLevel >= 4 ? '快' : speedLevel <= 2 ? '慢' : '中'}</span>
        </label>
        <span className={cx('luf-step-counter')}>
          {started ? `第 ${index + 1} / ${STEPS.length} 步` : '等待播放'}
        </span>
      </div>

      <div className={cx('luf-progress')} role="presentation">
        <div className={cx('luf-progress-bar')} style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} />
      </div>

      <div className={cx('luf-note')}>
        <span className={cx('luf-note-tag')}>{started ? `第 ${index + 1} 步` : '提示'}</span>
        <span className={cx('luf-note-text')}>
          {started
            ? step.msg
            : '点击「播放」，跟随线程 A 和线程 B 的竞争，看一把锁如何从无锁一路膨胀到重量级锁。'}
        </span>
      </div>

      <figcaption className={cx('luf-hint')}>
        对比记忆：偏向锁 = 无竞争时零开销；轻量级锁 = 低竞争时自旋（费 CPU 但不挂起）；
        重量级锁 = 高竞争时阻塞（内核态切换但不耗 CPU）。JDK 15+ 已默认禁用偏向锁，
        JDK 18+ 彻底移除 —— 面试被追问时这是加分项。
      </figcaption>
    </figure>
  );
};

LockUpgradeFigure.propTypes = {
  caption: PropTypes.string,
};

LockUpgradeFigure.defaultProps = {
  caption: '',
};

export default LockUpgradeFigure;
