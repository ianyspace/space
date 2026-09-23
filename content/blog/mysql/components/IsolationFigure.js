import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: 脏读 / 不可重复读 / 幻读 on three timelines.
 *
 * All three are the same shape — two transactions interleaving, with one read
 * landing at the wrong moment — so the difference is only *where* the arrow
 * crosses: reading a value that never existed, reading a row that changed, or
 * reading a set that grew. The three cases are drawn one above the other with
 * identical geometry, which is what makes that difference visible.
 */
const TONE = {
    plain: { stroke: 'var(--my-line)', fill: 'var(--my-card)' },
    bad: { stroke: 'var(--my-bad)', fill: 'var(--my-bad-soft)' },
    warn: { stroke: 'var(--my-warn)', fill: 'var(--my-warn-soft)' },
};

const ROWS = [
    {
        key: 'dirty',
        title: '脏读',
        color: 'var(--my-bad)',
        desc: ['读到别人还没提交的修改', '而那个事务最终回滚了'],
        verdict: '→ 200 从未生效',
        cross: { x: 520, label: '读到未提交的 200' },
        a: [
            { x: 194, width: 170, text: '① SELECT → 100' },
            { x: 486, width: 210, text: '③ SELECT → 200 ⚠', tone: 'bad' },
        ],
        b: [
            { x: 340, width: 200, text: '② UPDATE → 200（未提交）', tone: 'warn' },
            { x: 636, width: 118, text: '④ ROLLBACK', tone: 'bad' },
        ],
    },
    {
        key: 'nonrepeatable',
        title: '不可重复读',
        color: 'var(--my-warn)',
        desc: ['同一事务两次读同一行', '中间被别的事务改并提交'],
        verdict: '→ 同一行，两次不一样',
        cross: { x: 560, label: '这一行被改了' },
        a: [
            { x: 194, width: 190, text: '① SELECT → 100' },
            { x: 520, width: 210, text: '③ SELECT → 200 ⚠', tone: 'warn' },
        ],
        b: [{ x: 380, width: 200, text: '② UPDATE + COMMIT', tone: 'warn' }],
    },
    {
        key: 'phantom',
        title: '幻读',
        color: 'var(--my-purple)',
        desc: ['同一事务两次范围查询', '中间被别的事务插入新行'],
        verdict: '→ 结果集行数变了',
        cross: { x: 560, label: '多出一行' },
        a: [
            { x: 194, width: 230, text: '① 范围查询 → 10 行' },
            { x: 520, width: 210, text: '③ 再查一次 → 11 行 ⚠', tone: 'bad' },
        ],
        b: [{ x: 360, width: 200, text: '② INSERT 一行 + COMMIT', tone: 'warn' }],
    },
];

const ROW_TOP = 20;
const ROW_H = 122;

const IsolationFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '三种并发问题：读到了什么不该读的东西'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 392"
                    role="img"
                    aria-label="脏读、不可重复读、幻读三种并发问题的事务时序对比"
                >
                    <defs>
                        <marker
                            id="iso-ar"
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

                    {ROWS.map((row, i) => {
                        const top = ROW_TOP + i * ROW_H;
                        const aLane = top + 14;
                        const bLane = top + 72;
                        return (
                            <g key={row.key}>
                                <rect
                                    x="16"
                                    y={top}
                                    width="748"
                                    height="112"
                                    rx="10"
                                    fill="none"
                                    stroke={row.color}
                                    strokeWidth="1.4"
                                    strokeDasharray="5 4"
                                />

                                <text x="30" y={top + 32} fontSize="13.5" fontWeight="700" fill={row.color}>
                                    {row.title}
                                </text>
                                <text x="30" y={top + 52} fontSize="10.5" fill="var(--my-muted)">
                                    {row.desc[0]}
                                </text>
                                <text x="30" y={top + 68} fontSize="10.5" fill="var(--my-muted)">
                                    {row.desc[1]}
                                </text>
                                <text x="30" y={top + 92} fontSize="10.5" fontWeight="700" fill={row.color}>
                                    {row.verdict}
                                </text>

                                <text x="174" y={aLane + 19} textAnchor="end" fontSize="10.5" fontWeight="700" fill="var(--my-muted)">
                                    事务 A
                                </text>
                                <text x="174" y={bLane + 19} textAnchor="end" fontSize="10.5" fontWeight="700" fill="var(--my-muted)">
                                    事务 B
                                </text>
                                <rect x="182" y={aLane} width="570" height="30" rx="8" fill="var(--my-panel)" />
                                <rect x="182" y={bLane} width="570" height="30" rx="8" fill="var(--my-panel)" />

                                {[
                                    { lane: aLane, chips: row.a },
                                    { lane: bLane, chips: row.b },
                                ].map((group) =>
                                    group.chips.map((chip) => {
                                        const tone = TONE[chip.tone || 'plain'];
                                        return (
                                            <g key={chip.text}>
                                                <rect
                                                    x={chip.x}
                                                    y={group.lane + 4}
                                                    width={chip.width}
                                                    height="22"
                                                    rx="6"
                                                    fill={tone.fill}
                                                    stroke={tone.stroke}
                                                    strokeWidth="1.3"
                                                />
                                                <text
                                                    x={chip.x + chip.width / 2}
                                                    y={group.lane + 19}
                                                    textAnchor="middle"
                                                    fontSize="10"
                                                    fill="var(--my-text)"
                                                >
                                                    {chip.text}
                                                </text>
                                            </g>
                                        );
                                    }),
                                )}

                                {/* 事务 B 的写操作，被 事务 A 的下一次读撞上 */}
                                <line
                                    x1={row.cross.x}
                                    y1={bLane}
                                    x2={row.cross.x}
                                    y2={aLane + 32}
                                    stroke="var(--my-bad)"
                                    strokeWidth="1.8"
                                    strokeDasharray="4 3"
                                    markerEnd="url(#iso-ar)"
                                />
                                <text
                                    x={row.cross.x + 10}
                                    y={top + 84}
                                    fontSize="10"
                                    fontWeight="700"
                                    fill="var(--my-bad)"
                                >
                                    {row.cross.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </figure>
    );
};

IsolationFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default IsolationFigure;
