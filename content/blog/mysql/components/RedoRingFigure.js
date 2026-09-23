import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: redo log as the fixed-size ring it actually is.
 *
 * Two pointers run around the same circle — `write pos` chases `checkpoint` —
 * and the free space is exactly the arc between them. That is the whole reason a
 * busy instance can stall on "waiting for checkpoint": the ring is not a queue
 * that grows, it is a circle that has to be freed before it can be reused.
 */
const CX = 390;
const CY = 145;
const R = 76;
const STROKE = 26;

/** Angle in degrees, clockwise from 12 o'clock. */
function polar(radius, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function arcPath(from, to) {
    const a = polar(R, from);
    const b = polar(R, to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
}

const CHECKPOINT_DEG = 40;
const WRITE_POS_DEG = 320;

/** Both pointers get a radial tick and a horizontal leader out to a label. */
const POINTERS = [
    {
        deg: CHECKPOINT_DEG,
        text: 'checkpoint：擦除点',
        anchor: 'start',
    },
    {
        deg: WRITE_POS_DEG,
        text: 'write pos：写入点',
        anchor: 'end',
    },
];

const LEGEND = [
    { x: 210, color: 'var(--my-accent)', text: '已写入，暂时不能覆盖' },
    { x: 390, color: 'var(--my-warn)', text: '正在写入' },
    { x: 500, color: 'var(--my-panel-border)', text: '空闲可用' },
];

const RedoRingFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || 'redo log 是一圈固定大小的环，write pos 追着 checkpoint 跑'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 322"
                    role="img"
                    aria-label="redo log 环形结构：write pos 与 checkpoint 之间的弧是可用空间"
                >
                    {/* the whole ring is free space; the written arcs are painted on top */}
                    <circle
                        cx={CX}
                        cy={CY}
                        r={R}
                        fill="none"
                        stroke="var(--my-panel-border)"
                        strokeWidth={STROKE}
                    />
                    <path
                        d={arcPath(CHECKPOINT_DEG, WRITE_POS_DEG)}
                        fill="none"
                        stroke="var(--my-accent)"
                        strokeWidth={STROKE}
                        strokeOpacity="0.75"
                    />
                    <path
                        d={arcPath(WRITE_POS_DEG - 22, WRITE_POS_DEG)}
                        fill="none"
                        stroke="var(--my-warn)"
                        strokeWidth={STROKE}
                    />

                    <text x={CX} y={CY - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--my-text)">
                        redo log
                    </text>
                    <text x={CX} y={CY + 15} textAnchor="middle" fontSize="10.5" fill="var(--my-muted)">
                        固定大小 · 环形复用
                    </text>

                    {POINTERS.map((pointer) => {
                        const inner = polar(90, pointer.deg);
                        const outer = polar(104, pointer.deg);
                        const out = pointer.anchor === 'start' ? outer.x + 100 : outer.x - 100;
                        return (
                            <g key={pointer.text}>
                                <line
                                    x1={inner.x}
                                    y1={inner.y}
                                    x2={outer.x}
                                    y2={outer.y}
                                    stroke="var(--my-text)"
                                    strokeWidth="2"
                                />
                                <line
                                    x1={outer.x}
                                    y1={outer.y}
                                    x2={out}
                                    y2={outer.y}
                                    stroke="var(--my-text)"
                                    strokeWidth="1.4"
                                />
                                <text
                                    x={pointer.anchor === 'start' ? out + 6 : out - 6}
                                    y={outer.y + 4}
                                    textAnchor={pointer.anchor}
                                    fontSize="11"
                                    fontWeight="700"
                                    fill="var(--my-text)"
                                >
                                    {pointer.text}
                                </text>
                            </g>
                        );
                    })}

                    {LEGEND.map((item) => (
                        <g key={item.text}>
                            <rect x={item.x} y="264" width="16" height="10" rx="3" fill={item.color} />
                            <text x={item.x + 22} y="274" fontSize="11" fill="var(--my-text)">
                                {item.text}
                            </text>
                        </g>
                    ))}

                    <text x="390" y="306" textAnchor="middle" fontSize="11" fill="var(--my-muted)">
                        write pos 追上 checkpoint 就写满了：只能等后台把脏页刷盘、checkpoint 往前推，才腾得出空间
                    </text>
                </svg>
            </div>
        </figure>
    );
};

RedoRingFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default RedoRingFigure;
