import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './JmmFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const IDLE_MSG = '先选变量类型，再按「线程 1 写入 → 线程 2 读取」操作，观察两个副本和主内存的值如何分道扬镳。';

/**
 * Visibility demo. A plain variable's flush back to main memory is not
 * guaranteed by the JMM, so thread 2 keeps reading its stale copy; a volatile
 * write flushes immediately and invalidates the other thread's copy, forcing a
 * reload. That contrast IS the mechanism, so it's the demo — no playback.
 */
const JmmFigure = function ({ caption = '' }) {
  const [mode, setMode] = useState('plain');
  const [main, setMain] = useState(0);
  const [t1, setT1] = useState(0);
  const [t2, setT2] = useState(0);
  const [stale, setStale] = useState(false);
  const [touched, setTouched] = useState([]);
  const [msg, setMsg] = useState(IDLE_MSG);

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setMain(0);
    setT1(0);
    setT2(0);
    setStale(false);
    setTouched([]);
    setMsg(next === 'volatile' ? '已切换为 volatile 变量并重置，重新演示一遍。' : '已切换为普通变量并重置。');
  };

  const doWrite = () => {
    const v = t1 + 1;
    setT1(v);
    if (mode === 'volatile') {
      setMain(v);
      setStale(true);
      setTouched(['t1', 'main']);
      setMsg(`线程 1 修改 count = ${v}：volatile 写在修改后立即刷回主内存（store + write），同时使线程 2 的副本失效。`);
    } else {
      setTouched(['t1']);
      setMsg(`线程 1 在自己的工作内存里把 count 改成 ${v} —— 什么时候刷回主内存 JMM 并不保证，主内存里很可能还是 0。`);
    }
  };

  const doRead = () => {
    if (mode === 'volatile') {
      if (stale) {
        setT2(main);
        setStale(false);
        setTouched(['t2', 'main']);
        setMsg(`线程 2 发现副本已失效，从主内存重新加载 —— 读到最新值 ${main}。这就是 volatile 的可见性（注意它不保证原子性）。`);
      } else {
        setTouched(['t2']);
        setMsg(`线程 2 从主内存读取 count = ${main}。`);
      }
    } else {
      setTouched(['t2']);
      setMsg(`线程 2 读取 count：用的是自己工作内存里的副本，读到 ${t2} —— 线程 1 已经改成 ${t1} 了它也不知道，这就是可见性问题。`);
    }
  };

  const reset = () => {
    setMain(0);
    setT1(0);
    setT2(0);
    setStale(false);
    setTouched([]);
    setMsg(IDLE_MSG);
  };

  const card = (key) => cx('jmm-card', touched.includes(key) && 'is-hot');

  return (
    <figure className={cx('jmm')}>
      <div className={cx('jmm-head')}>
        <span className={cx('jmm-badge')}>互动演示</span>
        {caption ? <span className={cx('jmm-caption')}>{caption}</span> : null}
        <span className={cx('jmm-stats')}>同一变量，两种可见性</span>
      </div>

      <div className={cx('jmm-toolbar')}>
        <div className={cx('jmm-toggle')}>
          <button
            type="button"
            className={cx('jmm-pill', mode === 'plain' && 'is-on')}
            onClick={() => switchMode('plain')}
          >
            普通变量
          </button>
          <button
            type="button"
            className={cx('jmm-pill', mode === 'volatile' && 'is-on')}
            onClick={() => switchMode('volatile')}
          >
            volatile 变量
          </button>
        </div>
        <button type="button" className={cx('jmm-btn', 'primary')} onClick={doWrite}>
          线程 1：count++
        </button>
        <button type="button" className={cx('jmm-btn')} onClick={doRead}>
          线程 2：读取 count
        </button>
        <button type="button" className={cx('jmm-btn')} onClick={reset}>
          ↺ 重置
        </button>
      </div>

      <div className={cx('jmm-board')}>
        <div className={card('main')}>
          <span className={cx('jmm-card-title', 'is-main')}>主内存（共享）</span>
          <span className={cx('jmm-value')}>count = {main}</span>
          <span className={cx('jmm-card-sub')}>所有线程读写都经它中转</span>
        </div>
        <div className={cx('jmm-row')}>
          <div className={card('t1')}>
            <span className={cx('jmm-card-title')}>线程 1 · 工作内存</span>
            <span className={cx('jmm-value')}>count = {t1}</span>
            <span className={cx('jmm-card-sub')}>私有副本</span>
          </div>
          <div className={card('t2')}>
            <span className={cx('jmm-card-title')}>线程 2 · 工作内存</span>
            <span className={cx('jmm-value')}>count = {t2}</span>
            <span className={cx('jmm-card-sub', stale && 'is-warn')}>
              {stale ? '副本已失效，读取时须重新加载' : '私有副本'}
            </span>
          </div>
        </div>
      </div>

      <div className={cx('jmm-note')}>
        <span className={cx('jmm-note-tag')}>{mode === 'volatile' ? 'volatile' : '普通变量'}</span>
        <span className={cx('jmm-note-text')}>{msg}</span>
      </div>

      <figcaption className={cx('jmm-hint')}>
        玩法：普通变量模式下先「count++」再「读取」，线程 2 永远读到 0；
        切到 volatile 再来一遍，线程 2 立刻看到 1。可见性的差距就是这么来的。
      </figcaption>
    </figure>
  );
};

JmmFigure.propTypes = {
  caption: PropTypes.string,
};

JmmFigure.defaultProps = {
  caption: '',
};

export default JmmFigure;
