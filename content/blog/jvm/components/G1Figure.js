import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: G1's two ideas that CMS does not have — the heap cut into
 * equal regions, and the collection order chosen by garbage ratio.
 *
 * The bottom row is the one that explains the name. "Garbage First" sounds like
 * marketing until you see five regions sorted by how much garbage they hold and
 * the top three picked: G1 does not sweep the old generation, it picks the
 * regions with the best return per unit of pause.
 */
const ROLE = {
    E: { label: 'Eden', color: 'var(--my-accent)' },
    S: { label: 'Survivor', color: 'var(--my-db)' },
    O: { label: 'Old', color: 'var(--my-warn)' },
    H: { label: 'Humongous', color: 'var(--my-purple)' },
};

/** 两行 Region，字母表示它此刻在逻辑上扮演谁。 */
const REGIONS = [
    ['E', 'S', 'O', 'E', 'H', 'E'],
    ['O', 'E', 'E', 'S', 'O', 'H'],
];

const REGION_STEP = 82;
const REGION_WIDTH = 76;
const REGION_HEIGHT = 44;

const PICKED = [
    { id: 'Region #7', garbage: 82 },
    { id: 'Region #3', garbage: 74 },
    { id: 'Region #12', garbage: 61 },
    { id: 'Region #5', garbage: 23 },
    { id: 'Region #9', garbage: 8 },
];

const PICK_LIMIT = 3;

const G1Figure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || 'G1 的两个改动：堆切成 Region，回收按垃圾占比排队'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 300"
                    role="img"
                    aria-label="G1 把堆切成等大的 Region，每个 Region 逻辑上扮演 Eden、Survivor、Old 或 Humongous；Mixed GC 优先回收垃圾占比最高的 Region"
                >
                    <text x="16" y="30" fontSize="11.5" fontWeight="700" fill="var(--my-text)">
                        堆切成等大的 Region —— 不再有固定的新生代 / 老年代边界
                    </text>

                    {REGIONS.map((row, rowIndex) =>
                        row.map((role, colIndex) => {
                            const tone = ROLE[role];
                            const x = 16 + colIndex * REGION_STEP;
                            const y = 44 + rowIndex * 50;
                            return (
                                <g key={`${rowIndex}-${colIndex}`}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={REGION_WIDTH}
                                        height={REGION_HEIGHT}
                                        rx="8"
                                        fill="var(--my-card)"
                                        stroke={tone.color}
                                        strokeWidth="1.4"
                                    />
                                    <text
                                        x={x + REGION_WIDTH / 2}
                                        y={y + 22}
                                        textAnchor="middle"
                                        fontSize="14"
                                        fontWeight="700"
                                        fill={tone.color}
                                    >
                                        {role}
                                    </text>
                                    <text
                                        x={x + REGION_WIDTH / 2}
                                        y={y + 36}
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="var(--my-muted)"
                                    >
                                        {tone.label}
                                    </text>
                                </g>
                            );
                        }),
                    )}

                    {/* RSet 说明 */}
                    <rect
                        x="518"
                        y="44"
                        width="246"
                        height="94"
                        rx="9"
                        fill="none"
                        stroke="var(--my-purple)"
                        strokeWidth="1.4"
                        strokeDasharray="5 4"
                    />
                    <text x="530" y="64" fontSize="11" fontWeight="700" fill="var(--my-purple)">
                        RSet（Remembered Set）
                    </text>
                    <text x="530" y="84" fontSize="9.5" fill="var(--my-muted)">
                        每个 Region 记一份「谁引用了我」。
                    </text>
                    <text x="530" y="100" fontSize="9.5" fill="var(--my-muted)">
                        GC 时只扫这些来源，不用扫全堆。
                    </text>
                    <text x="530" y="116" fontSize="9.5" fill="var(--my-muted)">
                        跨 Region 引用的扫描开销就是这么降下来的。
                    </text>
                    <text x="530" y="132" fontSize="9.5" fill="var(--my-muted)">
                        SATB 同样靠写屏障维护。
                    </text>

                    <text x="16" y="156" fontSize="9.5" fill="var(--my-muted)">
                        E = Eden　S = Survivor　O = Old　H = Humongous（大对象专用）· 每个 Region 默认 2MB
                    </text>

                    {/* Garbage First */}
                    <text x="16" y="196" fontSize="11.5" fontWeight="700" fill="var(--my-text)">
                        Mixed GC：按垃圾占比排队，挑回报最高的几个 Region 收
                    </text>

                    {PICKED.map((region, i) => {
                        const picked = i < PICK_LIMIT;
                        const x = 16 + i * 142;
                        return (
                            <g key={region.id}>
                                <rect
                                    x={x}
                                    y="212"
                                    width="130"
                                    height="56"
                                    rx="9"
                                    fill={picked ? 'var(--my-warn-soft)' : 'var(--my-card)'}
                                    stroke={picked ? 'var(--my-warn)' : 'var(--my-line)'}
                                    strokeWidth={picked ? 1.6 : 1.2}
                                />
                                <text
                                    x={x + 10}
                                    y="230"
                                    fontSize="9.5"
                                    fontWeight="700"
                                    fill={picked ? 'var(--my-warn)' : 'var(--my-muted)'}
                                >
                                    {region.id}
                                </text>
                                <text x={x + 120} y="230" textAnchor="end" fontSize="9.5" fill="var(--my-muted)">
                                    垃圾 {region.garbage}%
                                </text>
                                <rect
                                    x={x + 10}
                                    y="240"
                                    width="110"
                                    height="7"
                                    rx="3.5"
                                    fill="var(--my-panel)"
                                />
                                <rect
                                    x={x + 10}
                                    y="240"
                                    width={(110 * region.garbage) / 100}
                                    height="7"
                                    rx="3.5"
                                    fill={picked ? 'var(--my-warn)' : 'var(--my-line)'}
                                />
                                <text
                                    x={x + 10}
                                    y="262"
                                    fontSize="9"
                                    fontWeight="700"
                                    fill={picked ? 'var(--my-warn)' : 'var(--my-muted)'}
                                >
                                    {picked ? '✓ 本次回收' : '这轮先放着'}
                                </text>
                            </g>
                        );
                    })}

                    <text x="16" y="288" fontSize="10.5" fill="var(--my-muted)">
                        先挑垃圾多的，凑够期望停顿就停 —— 所以叫 Garbage First，而不是按地址顺序一路收过去。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

G1Figure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default G1Figure;
