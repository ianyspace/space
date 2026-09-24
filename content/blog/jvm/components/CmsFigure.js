import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: the four CMS phases as a timeline, with the two stop-the-world
 * segments marked.
 *
 * The block widths are proportional to how long each phase actually takes, so
 * the picture answers the question the prose only asserts: "CMS 停顿短" is not
 * because it pauses less often, it is because the two paused phases are the two
 * narrow ones. The pause strip underneath re-draws the same timeline with only
 * the paused parts coloured, which is the whole selling point in one line.
 */
const PHASES = [
    {
        key: 'initial',
        x: 16,
        width: 112,
        name: '① 初始标记',
        mark: 'STW，很短',
        stw: true,
        lines: ['只标记 GC Roots', '直连的对象'],
    },
    {
        key: 'mark',
        x: 136,
        width: 246,
        name: '② 并发标记',
        mark: '并发，与用户线程同时跑',
        stw: false,
        lines: ['从 GC Roots 递归遍历整个对象图', '时间最长，但不暂停'],
    },
    {
        key: 'remark',
        x: 390,
        width: 132,
        name: '③ 重新标记',
        mark: 'STW，时间稍长',
        stw: true,
        lines: ['修正并发期间的引用变动', '必须停下来做'],
    },
    {
        key: 'sweep',
        x: 530,
        width: 226,
        name: '④ 并发清除',
        mark: '并发，与用户线程同时跑',
        stw: false,
        lines: ['清除不可达对象，回收内存', '新垃圾只能等下次（浮动垃圾）'],
    },
];

const CmsFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || 'CMS 的四个阶段：只有两段短的要停，其余都跟用户线程一起跑'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 186"
                    role="img"
                    aria-label="CMS 垃圾回收器的四个阶段时间轴：初始标记与重新标记需要 STW，并发标记与并发清除与用户线程并发执行"
                >
                    {PHASES.map((phase) => {
                        const color = phase.stw ? 'var(--my-bad)' : 'var(--my-ok)';
                        return (
                            <g key={phase.key}>
                                <rect
                                    x={phase.x}
                                    y="30"
                                    width={phase.width}
                                    height="76"
                                    rx="9"
                                    fill={phase.stw ? 'var(--my-bad-soft)' : 'var(--my-card)'}
                                    stroke={color}
                                    strokeWidth="1.4"
                                />
                                <text
                                    x={phase.x + 10}
                                    y="50"
                                    fontSize="11.5"
                                    fontWeight="700"
                                    fill={color}
                                >
                                    {phase.name}
                                </text>
                                <text x={phase.x + 10} y="68" fontSize="9.5" fill="var(--my-muted)">
                                    {phase.mark}
                                </text>
                                {phase.lines.map((line, i) => (
                                    <text
                                        key={line}
                                        x={phase.x + 10}
                                        y={86 + i * 15}
                                        fontSize="9.5"
                                        fill="var(--my-muted)"
                                    >
                                        {line}
                                    </text>
                                ))}
                            </g>
                        );
                    })}

                    {/* 停顿分布：同一条时间轴，只把停顿段涂红 */}
                    <text x="16" y="121" fontSize="9.5" fill="var(--my-muted)">
                        停顿分布
                    </text>
                    <text x="756" y="121" textAnchor="end" fontSize="9.5" fill="var(--my-muted)">
                        时间 →
                    </text>
                    {PHASES.map((phase) => (
                        <g key={`bar-${phase.key}`}>
                            <rect
                                x={phase.x}
                                y="126"
                                width={phase.width}
                                height="18"
                                rx="5"
                                fill={phase.stw ? 'var(--my-bad)' : 'var(--my-ok-soft)'}
                                stroke={phase.stw ? 'var(--my-bad)' : 'var(--my-ok)'}
                                strokeWidth="1.2"
                            />
                            <text
                                x={phase.x + phase.width / 2}
                                y="139"
                                textAnchor="middle"
                                fontSize="9.5"
                                fontWeight="700"
                                fill={phase.stw ? '#fff' : 'var(--my-ok)'}
                            >
                                {phase.stw ? 'STW' : '并发'}
                            </text>
                        </g>
                    ))}

                    <text x="16" y="172" fontSize="10.5" fill="var(--my-muted)">
                        两段停顿都是窄的，长的两段都不停 —— 代价是碎片和浮动垃圾。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

CmsFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default CmsFigure;
