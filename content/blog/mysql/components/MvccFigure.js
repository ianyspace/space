import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: one row, its undo-log version chain, and the Read View that
 * decides which link of the chain the reader is allowed to see.
 *
 * The version chain is drawn newest-first (left to right, the direction
 * DB_ROLL_PTR actually walks) and each link is then re-judged underneath, so the
 * reader can follow the walk instead of taking the verdict on faith.
 */
const VERSIONS = [
    {
        x: 32,
        tag: '当前版本 · 未提交',
        trx: 'DB_TRX_ID = 100',
        value: 'balance = 2000',
        pointer: 'DB_ROLL_PTR →',
        color: 'var(--my-bad)',
    },
    {
        x: 290,
        tag: '旧版本 · 未提交',
        trx: 'DB_TRX_ID = 90',
        value: 'balance = 1200',
        pointer: 'DB_ROLL_PTR →',
        color: 'var(--my-line)',
    },
    {
        x: 548,
        tag: '旧版本 · 已提交',
        trx: 'DB_TRX_ID = 60',
        value: 'balance = 500',
        pointer: 'DB_ROLL_PTR = NULL',
        color: 'var(--my-ok)',
    },
];

const CARD_W = 200;
const CARD_Y = 44;

const WALK = [
    { text: '100 ∈ m_ids → 不可见 ✗', tone: 'bad' },
    { text: '90 ∈ m_ids → 不可见 ✗', tone: 'bad' },
    { text: '60 < min_trx_id → 可见 ✓', tone: 'ok' },
];

const TONE = {
    bad: { stroke: 'var(--my-bad)', fill: 'var(--my-bad-soft)' },
    ok: { stroke: 'var(--my-ok)', fill: 'var(--my-ok-soft)' },
};

const MvccFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || 'MVCC：一条版本链，一张 Read View，一个答案'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 360"
                    role="img"
                    aria-label="MVCC 的 undo log 版本链，以及 Read View 逐个版本判定可见性的过程"
                >
                    <defs>
                        <marker
                            id="mvcc-ar"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-muted)" />
                        </marker>
                    </defs>

                    <text x="32" y="28" fontSize="11.5" fill="var(--my-muted)">
                        行记录 + undo log 版本链（同一行的历史版本，新的在左）
                    </text>

                    {VERSIONS.map((v, i) => (
                        <g key={v.trx}>
                            <rect
                                x={v.x}
                                y={CARD_Y}
                                width={CARD_W}
                                height="100"
                                rx="10"
                                fill="var(--my-card)"
                                stroke={v.color}
                                strokeWidth="1.6"
                            />
                            <text x={v.x + 12} y={CARD_Y + 20} fontSize="9.5" fill="var(--my-muted)">
                                {v.tag}
                            </text>
                            <text
                                x={v.x + 12}
                                y={CARD_Y + 40}
                                fontSize="10.5"
                                fontFamily="var(--monospaceFont, monospace)"
                                fill="var(--my-muted)"
                            >
                                {v.trx}
                            </text>
                            <text x={v.x + 12} y={CARD_Y + 66} fontSize="15" fontWeight="700" fill="var(--my-text)">
                                {v.value}
                            </text>
                            <text
                                x={v.x + 12}
                                y={CARD_Y + 88}
                                fontSize="10"
                                fontFamily="var(--monospaceFont, monospace)"
                                fill="var(--my-muted)"
                            >
                                {v.pointer}
                            </text>
                            {i < VERSIONS.length - 1 ? (
                                <line
                                    x1={v.x + CARD_W + 6}
                                    y1={CARD_Y + 74}
                                    x2={v.x + CARD_W + 52}
                                    y2={CARD_Y + 74}
                                    stroke="var(--my-muted)"
                                    strokeWidth="1.5"
                                    markerEnd="url(#mvcc-ar)"
                                />
                            ) : null}
                        </g>
                    ))}

                    <text x="32" y="172" fontSize="12" fontWeight="700" fill="var(--my-text)">
                        事务 A（trx_id = 80）发起快照读，先拿一张 Read View
                    </text>

                    <rect
                        x="32"
                        y="182"
                        width="716"
                        height="70"
                        rx="10"
                        fill="var(--my-card)"
                        stroke="var(--my-accent)"
                        strokeWidth="1.5"
                    />
                    <text x="48" y="206" fontSize="11.5" fill="var(--my-text)">
                        m_ids = [90, 100] —— 生成 Read View 时还没提交的事务
                    </text>
                    <text x="48" y="228" fontSize="11.5" fill="var(--my-text)">
                        min_trx_id = 90 · max_trx_id = 101 · creator_trx_id = 80
                    </text>
                    <text x="48" y="246" fontSize="10" fill="var(--my-muted)">
                        判定顺序：trx_id == creator → 可见；&lt; min → 可见；≥ max → 不可见；否则看它在不在 m_ids 里
                    </text>

                    <text x="32" y="274" fontSize="11.5" fill="var(--my-muted)">
                        从最新版本开始逐个判定：
                    </text>
                    {WALK.map((step, i) => {
                        const tone = TONE[step.tone];
                        const x = 32 + i * 242;
                        return (
                            <g key={step.text}>
                                <rect
                                    x={x}
                                    y="284"
                                    width="230"
                                    height="40"
                                    rx="9"
                                    fill={tone.fill}
                                    stroke={tone.stroke}
                                    strokeWidth="1.4"
                                />
                                <text x={x + 115} y="309" textAnchor="middle" fontSize="11" fill="var(--my-text)">
                                    {step.text}
                                </text>
                            </g>
                        );
                    })}

                    <text x="390" y="346" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--my-ok)">
                        ⇒ 读到 balance = 500；RR 的 Read View 只生成一次，所以两次读都一样
                    </text>
                </svg>
            </div>
        </figure>
    );
};

MvccFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default MvccFigure;
