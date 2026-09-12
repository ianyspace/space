import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './ThreadLocalRefFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const IDLE_MSG = '切换右侧开关：先看「正常使用」，再看「外部引用消失 + GC 之后」，注意 key 和 value 的不同命运。';

/**
 * Two-state reference diagram. The whole memory-leak story is a comparison —
 * what the reference graph looks like before and after GC collects the
 * ThreadLocal — so a toggle between exactly those two states is the right
 * interaction; anything more would be noise.
 */
const ThreadLocalRefFigure = function ({ caption = '' }) {
  const [afterGc, setAfterGc] = useState(false);

  return (
    <figure className={cx('tlr')}>
      <div className={cx('tlr-head')}>
        <span className={cx('tlr-badge')}>图解</span>
        {caption ? <span className={cx('tlr-caption')}>{caption}</span> : null}
        <span className={cx('tlr-stats')}>实线 = 强引用 · 虚线 = 弱引用</span>
      </div>

      <div className={cx('tlr-toolbar')}>
        <div className={cx('tlr-toggle')}>
          <button
            type="button"
            className={cx('tlr-pill', !afterGc && 'is-on')}
            onClick={() => setAfterGc(false)}
          >
            GC 前（正常使用）
          </button>
          <button
            type="button"
            className={cx('tlr-pill', afterGc && 'is-on')}
            onClick={() => setAfterGc(true)}
          >
            外部引用消失，GC 之后
          </button>
        </div>
      </div>

      <div className={cx('tlr-canvas')}>
        <svg viewBox="0 0 780 322" width="100%" role="img" aria-label="ThreadLocal 引用链示意">
          {/* Thread → ThreadLocalMap → Entry */}
          <rect className={cx('tlr-card', 'is-thread')} x={30} y={24} width={180} height={44} rx={8} />
          <text className={cx('tlr-card-title')} x={120} y={51} textAnchor="middle">Thread 对象</text>

          <path className={cx('tlr-ref', 'is-strong')} d="M 120 68 L 120 106" markerEnd="none" />
          <text className={cx('tlr-ref-label')} x={130} y={91}>threadLocals 字段</text>

          <rect className={cx('tlr-card', 'is-thread')} x={30} y={110} width={180} height={44} rx={8} />
          <text className={cx('tlr-card-title')} x={120} y={137} textAnchor="middle">ThreadLocalMap</text>

          <path className={cx('tlr-ref', 'is-strong')} d="M 120 154 L 120 198" />
          <text className={cx('tlr-ref-label')} x={130} y={180}>table（Entry[]）</text>

          {/* Entry with key / value */}
          <rect className={cx('tlr-entry')} x={30} y={202} width={330} height={100} rx={10} />
          <text className={cx('tlr-entry-title')} x={48} y={224}>Entry（哈希表的一项）</text>
          <rect className={cx('tlr-cell', afterGc && 'is-dead')} x={46} y={236} width={142} height={52} rx={7} />
          <text className={cx('tlr-cell-title')} x={117} y={257} textAnchor="middle">key</text>
          <text className={cx('tlr-cell-sub', afterGc && 'is-dead')} x={117} y={276} textAnchor="middle">
            {afterGc ? 'null（已被 GC）' : 'ThreadLocal（弱引用）'}
          </text>
          <rect className={cx('tlr-cell', 'is-value', afterGc && 'is-leak')} x={202} y={236} width={142} height={52} rx={7} />
          <text className={cx('tlr-cell-title')} x={273} y={257} textAnchor="middle">value</text>
          <text className={cx('tlr-cell-sub')} x={273} y={276} textAnchor="middle">实际值（强引用）</text>

          {/* ThreadLocal instance, top right */}
          <rect
            className={cx('tlr-card', afterGc ? 'is-gone' : 'is-tl')}
            x={560}
            y={24}
            width={190}
            height={50}
            rx={8}
          />
          <text className={cx('tlr-card-title')} x={655} y={46} textAnchor="middle">ThreadLocal 实例</text>
          <text className={cx('tlr-card-sub', afterGc && 'is-dead')} x={655} y={64} textAnchor="middle">
            {afterGc ? '✕ 已被 GC 回收' : '外部代码还在使用'}
          </text>

          {/* external strong reference (only while in use) */}
          {!afterGc ? (
            <>
              <text className={cx('tlr-ref-label')} x={655} y={96} textAnchor="middle">↑ 外部强引用</text>
            </>
          ) : null}

          {/* weak reference: Entry.key → ThreadLocal */}
          {!afterGc ? (
            <>
              <path
                className={cx('tlr-ref', 'is-weak')}
                d="M 188 262 C 340 262, 470 100, 556 56"
              />
              <text className={cx('tlr-ref-label', 'is-weak')} x={370} y={162} textAnchor="middle">弱引用：GC 可回收</text>
            </>
          ) : (
            <text className={cx('tlr-ref-label', 'is-weak', 'is-dead')} x={260} y={310} textAnchor="middle">
              key 的弱引用断了 → GC 顺手收走了 ThreadLocal 实例
            </text>
          )}

          {/* strong reference: Entry.value → value object */}
          <rect
            className={cx('tlr-card', afterGc ? 'is-leak' : 'is-value-obj')}
            x={560}
            y={202}
            width={190}
            height={56}
            rx={8}
          />
          <text className={cx('tlr-card-title')} x={655} y={226} textAnchor="middle">value 对象</text>
          <text className={cx('tlr-card-sub')} x={655} y={246} textAnchor="middle">
            {afterGc ? '仍然被 Entry 强引用着' : '随时可达'}
          </text>
          <path className={cx('tlr-ref', 'is-strong', afterGc && 'is-leak')} d="M 360 262 C 440 262, 480 230, 556 230" />
          <text className={cx('tlr-ref-label', afterGc && 'is-leak')} x={452} y={282} textAnchor="middle">强引用：GC 绝不回收</text>

          {afterGc ? (
            <text className={cx('tlr-leak-note')} x={655} y={296} textAnchor="middle">← 泄漏：线程不死，value 永远收不回</text>
          ) : null}
        </svg>
      </div>

      <div className={cx('tlr-note')}>
        <span className={cx('tlr-note-tag', afterGc && 'is-warn')}>{afterGc ? '泄漏发生' : '正常'}</span>
        <span className={cx('tlr-note-text')}>
          {afterGc
            ? '外部不再使用后，key 的弱引用被 GC 回收，Entry 的 key 变成 null；但 value 仍被 Entry 强引用 —— 线程不结束（线程池里的线程永远不结束），value 就永远无法回收。解法：用完在 finally 中 remove()。'
            : 'Entry 的 key 是 ThreadLocal 的弱引用，value 是实际值的强引用。外部还在使用时一切正常，但这个「不对称」已经埋好了。'}
        </span>
      </div>

      <figcaption className={cx('tlr-hint')}>
        为什么 key 设计成弱引用？让不再使用的 ThreadLocal 能被 GC 及时收走；
        而 value 的锅甩不掉，只能靠手动 remove —— 一弱一强，是权衡不是失误。
      </figcaption>
    </figure>
  );
};

ThreadLocalRefFigure.propTypes = {
  caption: PropTypes.string,
};

ThreadLocalRefFigure.defaultProps = {
  caption: '',
};

export default ThreadLocalRefFigure;
