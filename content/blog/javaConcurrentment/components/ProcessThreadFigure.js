import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import styles from './ProcessThreadFigure.module.scss';

/**
 * Joins CSS module class names. Names the stylesheet does not define are
 * skipped instead of leaking `undefined` into the `class` attribute.
 */
const cx = (...names) => names.map((name) => styles[name]).filter(Boolean).join(' ');

const LANE_W = 130;
const LANE_LEFTS = [40, 186, 332];

/**
 * A process is a static structure — one picture, several explorable regions.
 * So the right interaction here is "click a region → highlight it + explain
 * it", not a step-by-step playback like a state machine would need.
 */
const DETAILS = {
  process: {
    chip: '进程',
    tone: 'process',
    desc: '操作系统分配资源的基本单位，拥有独立的虚拟地址空间，进程之间相互隔离。',
    rows: [
      ['里面有什么', '若干线程 + 大家共享的堆、方法区、文件句柄'],
      ['关键特性', '进程间通信（IPC）成本高；一个进程崩溃，通常不会拖垮其他进程'],
    ],
  },
  thread: {
    chip: '线程',
    tone: 'thread',
    desc: 'CPU 调度的基本单位，创建和切换的开销都远小于进程。这是「多线程快」的根本原因：不重复分配资源，只分摊工作。',
    rows: [
      ['线程独有', '栈（方法调用帧、局部变量）、程序计数器（记录执行到了哪一行字节码）'],
      ['线程共享', '堆、方法区、文件句柄 —— 多个线程同时读写堆上的同一个对象，就是线程安全问题的根源'],
    ],
  },
  heap: {
    chip: '堆 Heap',
    tone: 'shared',
    desc: '对象实例和数组的分配地，进程内所有线程可见。后面几章讲的可见性、锁、CAS，本质上都在解决「如何安全地读写堆上的数据」。',
    rows: [['谁能访问', '同一进程内的所有线程']],
  },
  method: {
    chip: '方法区',
    tone: 'shared',
    desc: '存储类的元信息、运行时常量池和静态变量，同样被所有线程共享。',
    rows: [['注意', 'static 变量也是共享数据，多线程读写它同样需要同步']],
  },
  handles: {
    chip: '文件句柄',
    tone: 'shared',
    desc: '进程打开的文件、Socket 等资源，由同进程内的线程共享。',
    rows: [['例子', '线程池里多个工作线程往同一个日志文件写内容']],
  },
};

const detailFor = (id) => DETAILS[id.split('-')[0]];

const ProcessThreadFigure = function ({ caption = '' }) {
  const [selected, setSelected] = useState(null);

  const kind = selected ? selected.split('-')[0] : null;
  const selectedLane = selected && selected.startsWith('thread-') ? Number(selected.split('-')[1]) : null;
  const detail = useMemo(() => (selected ? detailFor(selected) : null), [selected]);

  const pick = (id) => setSelected((prev) => (prev === id ? null : id));
  const keyActivate = (id) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(id);
    }
  };

  const sharedActive = kind === 'thread';
  const lanesActive = kind === 'heap' || kind === 'method' || kind === 'handles';

  const renderRegion = (id, className, children) => (
    <g
      className={cx(className, selected === id && 'is-selected')}
      onClick={() => pick(id)}
      role="button"
      tabIndex={0}
      aria-label={detailFor(id).chip}
      onKeyDown={keyActivate(id)}
    >
      <title>{detailFor(id).desc}</title>
      {children}
    </g>
  );

  return (
    <figure className={cx('ptf')}>
      <div className={cx('ptf-head')}>
        <span className={cx('ptf-badge')}>图解</span>
        {caption ? <span className={cx('ptf-caption')}>{caption}</span> : null}
        <span className={cx('ptf-stats')}>点击任意区域查看说明</span>
      </div>

      <div className={cx('ptf-canvas')}>
        <svg viewBox="0 0 860 330" width="100%" role="img" aria-label="进程与线程的内存区域关系图">
          {renderRegion(
            'process',
            'ptf-process',
            <rect className={cx('ptf-process-bg', kind === 'process' && 'is-selected')} x={14} y={14} width={832} height={302} rx={14} />,
          )}
          <text className={cx('ptf-process-label')} x={32} y={44}>
            进程（资源分配单位）— 独立的内存空间，崩溃互不影响
          </text>

          <text className={cx('ptf-section-label', 'is-private')} x={251} y={64} textAnchor="middle">
            线程私有 · 各自独立一份
          </text>

          {LANE_LEFTS.map((left, i) => {
            const cxLane = left + LANE_W / 2;
            const id = `thread-${i}`;
            const isSelected = selected === id;
            return (
              <g key={id}>
                {renderRegion(
                  id,
                  'ptf-lane',
                  <>
                    <rect className={cx('ptf-lane-border', isSelected && 'is-selected', lanesActive && 'is-related')} x={left - 6} y={70} width={LANE_W + 12} height={212} rx={10} />
                    <rect className={cx('ptf-lane-head')} x={left} y={76} width={LANE_W} height={26} rx={6} />
                    <text className={cx('ptf-lane-head-text')} x={cxLane} y={89} textAnchor="middle">{`线程 ${i + 1}`}</text>
                    <rect className={cx('ptf-lane-box')} x={left} y={108} width={LANE_W} height={30} rx={6} />
                    <text className={cx('ptf-lane-box-text')} x={cxLane} y={127} textAnchor="middle">程序计数器</text>
                    <rect className={cx('ptf-lane-box', 'is-stack')} x={left} y={146} width={LANE_W} height={128} rx={6} />
                    <text className={cx('ptf-lane-box-text', 'is-strong')} x={cxLane} y={164} textAnchor="middle">栈</text>
                    {[3, 2, 1].map((n, fi) => (
                      <g key={n}>
                        <rect className={cx('ptf-lane-frame')} x={left + 12} y={172 + fi * 32} width={LANE_W - 24} height={26} rx={4} />
                        <text className={cx('ptf-lane-frame-text')} x={cxLane} y={189 + fi * 32} textAnchor="middle">{`栈帧 ${n}`}</text>
                      </g>
                    ))}
                  </>,
                )}
              </g>
            );
          })}

          <text className={cx('ptf-section-label', 'is-shared')} x={661} y={64} textAnchor="middle">
            所有线程共享 · 只有一份
          </text>

          {renderRegion(
            'heap',
            'ptf-shared',
            <>
              <rect className={cx('ptf-shared-box', sharedActive && 'is-related', kind === 'heap' && 'is-selected')} x={508} y={70} width={306} height={130} rx={8} />
              <text className={cx('ptf-shared-title')} x={661} y={96} textAnchor="middle">堆 Heap</text>
              <text className={cx('ptf-shared-line')} x={661} y={122} textAnchor="middle">对象实例、数组都分配在这里</text>
              <text className={cx('ptf-shared-line')} x={661} y={142} textAnchor="middle">所有线程都能随时读写</text>
              <text className={cx('ptf-shared-warn')} x={661} y={170} textAnchor="middle">多线程同时改同一个对象</text>
              <text className={cx('ptf-shared-warn')} x={661} y={188} textAnchor="middle">→ 数据可能出错（线程安全）</text>
            </>,
          )}

          {renderRegion(
            'method',
            'ptf-shared',
            <>
              <rect className={cx('ptf-shared-box', 'is-low', sharedActive && 'is-related', kind === 'method' && 'is-selected')} x={508} y={208} width={306} height={40} rx={8} />
              <text className={cx('ptf-shared-line', 'is-strong')} x={661} y={233} textAnchor="middle">方法区 · 类信息 / 静态变量 / 常量池</text>
            </>,
          )}

          {renderRegion(
            'handles',
            'ptf-shared',
            <>
              <rect className={cx('ptf-shared-box', 'is-low', sharedActive && 'is-related', kind === 'handles' && 'is-selected')} x={508} y={256} width={306} height={26} rx={8} />
              <text className={cx('ptf-shared-line')} x={661} y={273} textAnchor="middle">文件句柄 / 打开的资源</text>
            </>,
          )}
        </svg>
      </div>

      <div className={cx('ptf-note')}>
        <span className={cx('ptf-note-tag', detail ? `tone-${detail.tone}` : null)}>
          {detail ? detail.chip : '提示'}
        </span>
        <span className={cx('ptf-note-text')}>
          {detail ? (
            <>
              {detail.desc}
              {detail.rows.map(([key, value]) => (
                <span key={key} className={cx('ptf-note-row')}>
                  <span className={cx('ptf-note-key')}>{key}</span>
                  {value}
                </span>
              ))}
            </>
          ) : (
            '点击进程边界、任意线程或右侧共享区域，查看对应区域的说明。'
          )}
        </span>
      </div>

      <figcaption className={cx('ptf-hint')}>
        把进程想象成车间，线程是车间里的工人：设备与原料（堆、方法区）人人可用，
        每个工人有自己的工作台（栈）和进度标记（程序计数器）。「共享」带来高效协作，
        也埋下线程安全问题的种子——这正是后面所有章节的起点。
      </figcaption>
    </figure>
  );
};

ProcessThreadFigure.propTypes = {
  caption: PropTypes.string,
};

ProcessThreadFigure.defaultProps = {
  caption: '',
};

export default ProcessThreadFigure;
