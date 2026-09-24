import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: the two generations, their internal split, and one object's
 * walk from Eden to the old generation.
 *
 * The proportions are drawn to scale (1/3 vs 2/3, and Eden 8/10 against two
 * 1/10 survivors) because "新生代只占三分之一" is a number people nod at and
 * then forget — seeing the old generation twice as wide is what makes it stick.
 *
 * The flow strip at the bottom is the answer to "对象到底怎么过去的", which the
 * picture above cannot show on its own: the arrows between the areas are only
 * meaningful once you know a copy happens on every Minor GC.
 */
const FLOW = [
    { x: 16, width: 140, text: 'Eden 分配' },
    { x: 194, width: 150, text: 'Minor GC → 存活进 S0' },
    { x: 382, width: 190, text: 'S0 ↔ S1 辗转，年龄 +1' },
    { x: 610, width: 154, text: '老年代（阈值 15）', last: true },
];

const HeapFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '堆的分代：新生代只占三分之一，但对象基本都死在这里'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 264"
                    role="img"
                    aria-label="堆的分代结构：新生代占约三分之一，内含 Eden 与两块 Survivor；老年代占约三分之二；以及对象从 Eden 晋升到老年代的流程"
                >
                    <defs>
                        <marker
                            id="heap-ar"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-accent)" />
                        </marker>
                    </defs>

                    {/* 新生代 */}
                    <rect
                        x="16"
                        y="14"
                        width="252"
                        height="136"
                        rx="10"
                        fill="none"
                        stroke="var(--my-accent)"
                        strokeWidth="1.6"
                    />
                    <text x="30" y="34" fontSize="12.5" fontWeight="700" fill="var(--my-accent)">
                        新生代 Young（约 1/3）
                    </text>

                    <rect
                        x="26"
                        y="44"
                        width="140"
                        height="96"
                        rx="8"
                        fill="var(--my-card)"
                        stroke="var(--my-line)"
                        strokeWidth="1.2"
                    />
                    <text
                        x="96"
                        y="72"
                        textAnchor="middle"
                        fontSize="12.5"
                        fontWeight="700"
                        fill="var(--my-text)"
                    >
                        Eden
                    </text>
                    <text x="96" y="92" textAnchor="middle" fontSize="10" fill="var(--my-muted)">
                        约 8/10
                    </text>
                    <text x="96" y="122" textAnchor="middle" fontSize="10" fill="var(--my-muted)">
                        新对象先在这里
                    </text>

                    {[
                        { key: 'S0', x: 174, center: 195 },
                        { key: 'S1', x: 222, center: 243 },
                    ].map((survivor) => (
                        <g key={survivor.key}>
                            <rect
                                x={survivor.x}
                                y="44"
                                width="42"
                                height="96"
                                rx="8"
                                fill="var(--my-card)"
                                stroke="var(--my-line)"
                                strokeWidth="1.2"
                            />
                            <text
                                x={survivor.center}
                                y="86"
                                textAnchor="middle"
                                fontSize="12.5"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {survivor.key}
                            </text>
                            <text
                                x={survivor.center}
                                y="104"
                                textAnchor="middle"
                                fontSize="10"
                                fill="var(--my-muted)"
                            >
                                1/10
                            </text>
                        </g>
                    ))}

                    {/* 老年代 */}
                    <rect
                        x="278"
                        y="14"
                        width="486"
                        height="136"
                        rx="10"
                        fill="none"
                        stroke="var(--my-db)"
                        strokeWidth="1.6"
                    />
                    <text x="292" y="34" fontSize="12.5" fontWeight="700" fill="var(--my-db)">
                        老年代 Old / Tenured（约 2/3）
                    </text>
                    {[
                        '长期存活的对象（年龄到阈值才晋升）',
                        '大对象 / Survivor 放不下的对象直接进来',
                        'S0 / S1 一样大，同一时刻只有一块装着存活对象',
                        '这里满了触发 Full GC',
                    ].map((line, i) => (
                        <text
                            key={line}
                            x="292"
                            y={64 + i * 24}
                            fontSize="10.5"
                            fill="var(--my-muted)"
                        >
                            {line}
                        </text>
                    ))}

                    {/* 晋升流程 */}
                    {FLOW.map((chip, i) => (
                        <g key={chip.text}>
                            <rect
                                x={chip.x}
                                y="180"
                                width={chip.width}
                                height="32"
                                rx="8"
                                fill={chip.last ? 'var(--my-db-soft)' : 'var(--my-card)'}
                                stroke={chip.last ? 'var(--my-db)' : 'var(--my-line)'}
                                strokeWidth={chip.last ? 1.4 : 1.2}
                            />
                            <text
                                x={chip.x + chip.width / 2}
                                y="200"
                                textAnchor="middle"
                                fontSize="10.5"
                                fontWeight={chip.last ? 700 : 400}
                                fill={chip.last ? 'var(--my-db)' : 'var(--my-text)'}
                            >
                                {chip.text}
                            </text>
                            {i < FLOW.length - 1 ? (
                                <line
                                    x1={chip.x + chip.width + 4}
                                    y1="196"
                                    x2={FLOW[i + 1].x - 4}
                                    y2="196"
                                    stroke="var(--my-accent)"
                                    strokeWidth="1.5"
                                    markerEnd="url(#heap-ar)"
                                />
                            ) : null}
                        </g>
                    ))}

                    <text x="16" y="244" fontSize="10.5" fill="var(--my-muted)">
                        Minor GC 只收新生代，快；Major / Full GC 收老年代，通常带 STW，停顿明显更长。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

HeapFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default HeapFigure;
