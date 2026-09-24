import React from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Static figure: reachability analysis — five kinds of root at the top, and the
 * two possible verdicts below.
 *
 * The bottom panel is the reason this figure exists. "两个对象互相引用但谁也够不着"
 * is the one case where the intuitive answer (they are referenced, so they are
 * alive) is wrong, and it is also the case that proves why Java gave up on
 * reference counting. Drawing it next to the reachable panel makes the contrast
 * the reader's takeaway instead of a footnote.
 */
const ROOTS = [
    { x: 30, width: 138, text: '虚拟机栈局部变量' },
    { x: 176, width: 138, text: '方法区静态属性' },
    { x: 322, width: 118, text: '方法区常量' },
    { x: 448, width: 140, text: '本地方法栈 JNI' },
    { x: 596, width: 154, text: '被 synchronized 持有' },
];

const GcRootsFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '可达性分析：判断死活靠「走不走得到」，不是「有没有人引用」'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 306"
                    role="img"
                    aria-label="可达性分析：GC Roots 的五类来源，以及可达对象与不可达对象的判定"
                >
                    <defs>
                        <marker
                            id="roots-ar"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-accent)" />
                        </marker>
                        <marker
                            id="roots-cycle"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-bad)" />
                        </marker>
                    </defs>

                    {/* GC Roots */}
                    <rect
                        x="16"
                        y="14"
                        width="748"
                        height="58"
                        rx="10"
                        fill="none"
                        stroke="var(--my-accent)"
                        strokeWidth="1.6"
                        strokeDasharray="6 4"
                    />
                    <text x="30" y="34" fontSize="12" fontWeight="700" fill="var(--my-accent)">
                        GC Roots —— 可达性分析的起点
                    </text>
                    {ROOTS.map((root) => (
                        <g key={root.text}>
                            <rect
                                x={root.x}
                                y="42"
                                width={root.width}
                                height="24"
                                rx="6"
                                fill="var(--my-card)"
                                stroke="var(--my-line)"
                                strokeWidth="1.2"
                            />
                            <text
                                x={root.x + root.width / 2}
                                y="58"
                                textAnchor="middle"
                                fontSize="10"
                                fill="var(--my-text)"
                            >
                                {root.text}
                            </text>
                        </g>
                    ))}

                    <line
                        x1="390"
                        y1="74"
                        x2="390"
                        y2="100"
                        stroke="var(--my-accent)"
                        strokeWidth="1.8"
                        markerEnd="url(#roots-ar)"
                    />
                    <text x="402" y="93" fontSize="10" fill="var(--my-muted)">
                        顺着引用链往下走
                    </text>

                    {/* 可达 */}
                    <rect
                        x="16"
                        y="104"
                        width="748"
                        height="86"
                        rx="10"
                        fill="none"
                        stroke="var(--my-ok)"
                        strokeWidth="1.6"
                        strokeDasharray="6 4"
                    />
                    <text x="30" y="124" fontSize="11.5" fontWeight="700" fill="var(--my-ok)">
                        可达对象 —— 能走到，判定为存活
                    </text>
                    {[
                        { key: 'obj1', x: 60, width: 100 },
                        { key: 'obj2', x: 230, width: 100 },
                        { key: 'obj3', x: 400, width: 120 },
                    ].map((node) => (
                        <g key={node.key}>
                            <rect
                                x={node.x}
                                y="134"
                                width={node.width}
                                height="38"
                                rx="8"
                                fill="var(--my-ok-soft)"
                                stroke="var(--my-ok)"
                                strokeWidth="1.3"
                            />
                            <text
                                x={node.x + node.width / 2}
                                y="158"
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {node.key}
                            </text>
                        </g>
                    ))}
                    <line
                        x1="162"
                        y1="153"
                        x2="228"
                        y2="153"
                        stroke="var(--my-ok)"
                        strokeWidth="1.5"
                        markerEnd="url(#roots-ar)"
                    />
                    <line
                        x1="332"
                        y1="153"
                        x2="398"
                        y2="153"
                        stroke="var(--my-ok)"
                        strokeWidth="1.5"
                        markerEnd="url(#roots-ar)"
                    />
                    <text x="540" y="150" fontSize="9.5" fill="var(--my-muted)">
                        只有 obj1 被 GC Root 直接引用，
                    </text>
                    <text x="540" y="168" fontSize="9.5" fill="var(--my-muted)">
                        obj2 / obj3 是顺着链走到的
                    </text>

                    {/* 不可达 */}
                    <rect
                        x="16"
                        y="206"
                        width="748"
                        height="86"
                        rx="10"
                        fill="none"
                        stroke="var(--my-bad)"
                        strokeWidth="1.6"
                        strokeDasharray="6 4"
                    />
                    <text x="30" y="226" fontSize="11.5" fontWeight="700" fill="var(--my-bad)">
                        不可达对象 —— 走不到，判定为可回收
                    </text>
                    {[
                        { key: 'obj4', x: 300, width: 110 },
                        { key: 'obj5', x: 520, width: 110 },
                    ].map((node) => (
                        <g key={node.key}>
                            <rect
                                x={node.x}
                                y="236"
                                width={node.width}
                                height="38"
                                rx="8"
                                fill="var(--my-bad-soft)"
                                stroke="var(--my-bad)"
                                strokeWidth="1.3"
                            />
                            <text
                                x={node.x + node.width / 2}
                                y="260"
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {node.key}
                            </text>
                        </g>
                    ))}
                    <line
                        x1="412"
                        y1="255"
                        x2="518"
                        y2="255"
                        stroke="var(--my-bad)"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        markerStart="url(#roots-cycle)"
                        markerEnd="url(#roots-cycle)"
                    />
                    <text x="30" y="250" fontSize="9.5" fill="var(--my-muted)">
                        两个对象互相引用，但没有任何一条引用链能从
                    </text>
                    <text x="30" y="268" fontSize="9.5" fill="var(--my-muted)">
                        GC Roots 走到它们 —— 引用计数法会漏掉，可达性分析不会。
                    </text>
                </svg>
            </div>
        </figure>
    );
};

GcRootsFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default GcRootsFigure;
