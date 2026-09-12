import React from 'react';
import PropTypes from 'prop-types';

import styles from './ObjectHeaderFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const ROW_H = 44;
const NOTE_X = 348;

/**
 * Static layout: field widths are drawn proportional to their real byte size,
 * so the figure doubles as a size reference. No interaction — a plain memory
 * layout has no "process" to animate.
 */
const ROWS = [
  {
    w: 280,
    name: 'Mark Word',
    meta: '8 字节 / 64 位',
    tone: 'accent',
    note: '锁信息、hashCode、GC 分代年龄 —— 锁升级改写的就是这块',
  },
  {
    w: 170,
    name: 'Klass Pointer',
    meta: '4 或 8 字节',
    tone: 'info',
    note: '指向类元数据：这个对象是哪个类的实例',
  },
  {
    w: 118,
    name: '数组长度',
    meta: '4 字节 · 仅数组对象',
    tone: 'dim',
    note: '普通对象没有这一块',
  },
];

const ObjectHeaderFigure = function ({ caption = '' }) {
  return (
    <figure className={cx('ohf')}>
      <div className={cx('ohf-head')}>
        <span className={cx('ohf-badge')}>图解</span>
        {caption ? <span className={cx('ohf-caption')}>{caption}</span> : null}
        <span className={cx('ohf-stats')}>块宽按真实字节数等比绘制</span>
      </div>

      <div className={cx('ohf-canvas')}>
        <svg viewBox="0 0 720 180" width="100%" role="img" aria-label="Java 对象头结构示意">
          {ROWS.map((row, i) => {
            const y = 14 + i * (ROW_H + 10);
            return (
              <g key={row.name}>
                <rect className={cx('ohf-field', `tone-${row.tone}`)} x={40} y={y} width={row.w} height={ROW_H} rx={7} />
                <text className={cx('ohf-field-name')} x={56} y={y + 18}>{row.name}</text>
                <text className={cx('ohf-field-meta')} x={56} y={y + 35}>{row.meta}</text>
                <text className={cx('ohf-note')} x={NOTE_X} y={y + ROW_H / 2}>{row.note}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className={cx('ohf-hint')}>
        对象在堆里的开头就是这三块。Mark Word 是 synchronized（上方锁升级演示）、hashCode、
        GC 分代年龄共同的舞台 —— 同样的 64 位，锁状态不同装的内容完全不同。
      </figcaption>
    </figure>
  );
};

ObjectHeaderFigure.propTypes = {
  caption: PropTypes.string,
};

ObjectHeaderFigure.defaultProps = {
  caption: '',
};

export default ObjectHeaderFigure;
