import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: how tri-colour marking loses an object, in three stages.
 *
 * "漏标" is the one part of concurrent marking that prose reliably fails at,
 * because it needs two things to be true at the same time — an edge removed and
 * an edge added — and only then does the object become unreachable from any
 * node the marker still intends to visit. So the same three nodes are drawn at
 * the same coordinates in all three stages, and only the edges change: the eye
 * catches the swap without re-reading the labels.
 */
const TONE = {
    white: { stroke: 'var(--my-line)', fill: 'var(--my-card)', dot: 'var(--my-card)', label: '白' },
    gray: {
        stroke: 'var(--my-accent)',
        fill: 'var(--my-accent-soft)',
        dot: 'var(--my-accent)',
        label: '灰',
    },
    black: {
        stroke: 'var(--my-text)',
        fill: 'var(--my-panel)',
        dot: 'var(--my-text)',
        label: '黑',
    },
};

const Node = function ({ x, y, name, tone }) {
    const t = TONE[tone];
    return (
        <g>
            <rect
                x={x}
                y={y}
                width="76"
                height="30"
                rx="8"
                fill={t.fill}
                stroke={t.stroke}
                strokeWidth="1.4"
            />
            <circle cx={x + 15} cy={y + 15} r="5" fill={t.dot} stroke={t.stroke} strokeWidth="1.2" />
            <text x={x + 28} y={y + 19} fontSize="11" fontWeight="700" fill="var(--my-text)">
                {name}
            </text>
            <text x={x + 44} y={y + 19} fontSize="9" fill="var(--my-muted)">
                {t.label}
            </text>
        </g>
    );
};

Node.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    tone: PropTypes.oneOf(['white', 'gray', 'black']).isRequired,
};

const LEGEND = [
    { x: 16, width: 236, tone: 'white', desc: '未访问过，最后剩下的回收' },
    { x: 268, width: 248, tone: 'gray', desc: '自己访问了，引用还没处理完' },
    { x: 532, width: 232, tone: 'black', desc: '自己和引用都处理完了' },
];

const STAGES = [
    {
        x: 16,
        title: '① 并发标记中',
        lines: ['标记刚开始：A 是灰色（引用还没处理完），', 'B 还是白色，等着被 A 标灰。'],
    },
    {
        x: 270,
        title: '② 用户线程同时改了引用',
        lines: ['并发期间用户线程做了两件事：', 'A 删掉指向 B 的边，C 新建指向 B 的边。'],
    },
    {
        x: 524,
        title: '③ 结果：B 被漏标',
        lines: ['C 已经标黑、不会再被扫描，A 的边又没了 ——', 'B 一直是白色，被当成垃圾回收。'],
    },
];

const TriColorFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '三色标记的漏标：删一条边、加一条边，白色对象就被漏掉了'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 320"
                    role="img"
                    aria-label="三色标记法：白灰黑三种颜色，以及并发标记期间删除引用与新建引用导致对象被漏标的三个步骤"
                >
                    <defs>
                        <marker
                            id="tri-ar"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-bad)" />
                        </marker>
                        <marker
                            id="tri-ar-plain"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-line)" />
                        </marker>
                    </defs>

                    {/* 颜色图例 */}
                    {LEGEND.map((item) => {
                        const t = TONE[item.tone];
                        return (
                            <g key={item.tone}>
                                <rect
                                    x={item.x}
                                    y="14"
                                    width={item.width}
                                    height="46"
                                    rx="9"
                                    fill={t.fill}
                                    stroke={t.stroke}
                                    strokeWidth="1.4"
                                />
                                <circle
                                    cx={item.x + 20}
                                    cy="37"
                                    r="6"
                                    fill={t.dot}
                                    stroke={t.stroke}
                                    strokeWidth="1.2"
                                />
                                <text
                                    x={item.x + 36}
                                    y="33"
                                    fontSize="12"
                                    fontWeight="700"
                                    fill="var(--my-text)"
                                >
                                    {t.label}色
                                </text>
                                <text
                                    x={item.x + 36}
                                    y="50"
                                    fontSize="9.5"
                                    fill="var(--my-muted)"
                                >
                                    {item.desc}
                                </text>
                            </g>
                        );
                    })}

                    {STAGES.map((stage) => (
                        <g key={stage.title}>
                            <text
                                x={stage.x + 14}
                                y="88"
                                fontSize="11.5"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {stage.title}
                            </text>
                            {stage.lines.map((line, i) => (
                                <text
                                    key={line}
                                    x={stage.x + 14}
                                    y={218 + i * 16}
                                    fontSize="9.5"
                                    fill="var(--my-muted)"
                                >
                                    {line}
                                </text>
                            ))}
                        </g>
                    ))}

                    {/* ① 标记中：A 灰 → B 白 */}
                    <Node x={30} y={116} name="A" tone="gray" />
                    <Node x={156} y={116} name="B" tone="white" />
                    <line
                        x1="108"
                        y1="131"
                        x2="152"
                        y2="131"
                        stroke="var(--my-line)"
                        strokeWidth="1.5"
                        markerEnd="url(#tri-ar-plain)"
                    />

                    {/* ② A 删边、C 建边 */}
                    <Node x={284} y={106} name="A" tone="gray" />
                    <Node x={284} y={160} name="C" tone="black" />
                    <Node x={410} y={132} name="B" tone="white" />
                    <line
                        x1="362"
                        y1="121"
                        x2="406"
                        y2="145"
                        stroke="var(--my-bad)"
                        strokeWidth="1.4"
                        strokeDasharray="4 3"
                    />
                    <text
                        x="384"
                        y="137"
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="700"
                        fill="var(--my-bad)"
                    >
                        ✗
                    </text>
                    <line
                        x1="362"
                        y1="175"
                        x2="406"
                        y2="151"
                        stroke="var(--my-bad)"
                        strokeWidth="1.6"
                        markerEnd="url(#tri-ar)"
                    />
                    <text x="366" y="198" fontSize="9" fill="var(--my-bad)">
                        新建的引用
                    </text>

                    {/* ③ B 被漏掉 */}
                    <Node x={538} y={106} name="A" tone="gray" />
                    <Node x={538} y={160} name="C" tone="black" />
                    <Node x={664} y={118} name="B" tone="white" />
                    <line
                        x1="616"
                        y1="175"
                        x2="660"
                        y2="137"
                        stroke="var(--my-line)"
                        strokeWidth="1.4"
                        strokeDasharray="4 3"
                    />
                    <text
                        x="702"
                        y="176"
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="700"
                        fill="var(--my-bad)"
                    >
                        ✗
                    </text>
                    <text x="702" y="192" textAnchor="middle" fontSize="9" fill="var(--my-bad)">
                        被回收
                    </text>

                    {/* 解法 */}
                    <rect
                        x="16"
                        y="252"
                        width="748"
                        height="56"
                        rx="10"
                        fill="none"
                        stroke="var(--my-purple)"
                        strokeWidth="1.6"
                        strokeDasharray="6 4"
                    />
                    <text x="30" y="274" fontSize="11.5" fontWeight="700" fill="var(--my-purple)">
                        怎么防：写屏障 + SATB（Snapshot At The Beginning）
                    </text>
                    <text x="30" y="294" fontSize="9.5" fill="var(--my-muted)">
                        删除引用时，写屏障把被删掉的对象记进标记栈，当作活的 —— 宁可这次少收，也不能回收错。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

TriColorFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default TriColorFigure;
