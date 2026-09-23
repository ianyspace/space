import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Interactive: what exactly gets locked by one statement.
 *
 * Record locks, gap locks and next-key locks differ only in which stretch of the
 * index they cover — a difference that is almost impossible to read out of prose
 * ("(3, 7]") but obvious on a number line. The table has records at 5, 10 and 15
 * on a unique index, and picking a statement repaints the axis.
 */
const RECORDS = [5, 10, 15];

const AXIS = { left: 40, right: 748, origin: 64, step: 33.6 };

/** id → x. `Infinity` is the index's supremum, i.e. the right end of the axis. */
function xOf(id) {
    return id === Infinity ? AXIS.right : AXIS.origin + id * AXIS.step;
}

function boxOf(segment) {
    if (segment.kind === 'table') return { x: AXIS.left, width: AXIS.right - AXIS.left };
    if (segment.kind === 'record') return { x: xOf(segment.at) - 22, width: 44 };
    return { x: xOf(segment.from), width: xOf(segment.to) - xOf(segment.from) };
}

function labelOf(segment) {
    if (segment.kind === 'table') return '表锁：整张表';
    if (segment.kind === 'record') return 'Record Lock';
    if (segment.kind === 'gap') return `Gap Lock (${segment.from}, ${segment.to})`;
    return `Next-Key (${segment.from}, ${segment.to === Infinity ? '+∞' : segment.to}]`;
}

const TONE = {
    accent: { stroke: 'var(--my-accent)', fill: 'var(--my-accent-soft)' },
    warn: { stroke: 'var(--my-warn)', fill: 'var(--my-warn-soft)' },
    purple: { stroke: 'var(--my-purple)', fill: 'var(--my-purple-soft)' },
    bad: { stroke: 'var(--my-bad)', fill: 'var(--my-bad-soft)' },
};

const CASES = [
    {
        sql: 'id = 10 FOR UPDATE',
        tone: 'accent',
        title: '记录锁（Record Lock）',
        segments: [{ kind: 'record', at: 10 }],
        detail:
            '等值查询命中了唯一索引，Next-Key Lock 退化成记录锁 —— 只锁 id = 10 这一条记录，不锁任何间隙。这是最常见、也是并发最好的情况。',
        effects: [
            { blocked: true, text: 'UPDATE id = 10 被挡住' },
            { blocked: false, text: 'INSERT id = 12 照样能插' },
        ],
    },
    {
        sql: 'id = 12 FOR UPDATE',
        tone: 'warn',
        title: '间隙锁（Gap Lock）',
        segments: [{ kind: 'gap', from: 10, to: 15 }],
        detail:
            '12 不存在，等值查询没命中，加的是间隙锁：锁住 12 会落进去的那个间隙 (10, 15)。它只挡插入，不挡修改已有的行 —— 因为间隙里本来就没有记录。',
        effects: [
            { blocked: true, text: 'INSERT id = 11 / 12 / 13 / 14 都不行' },
            { blocked: false, text: 'UPDATE id = 10 或 15 可以' },
        ],
    },
    {
        sql: 'id > 5 AND id <= 10 FOR UPDATE',
        tone: 'purple',
        title: '临键锁（Next-Key Lock）',
        segments: [
            { kind: 'nextkey', from: 5, to: 10 },
            { kind: 'nextkey', from: 10, to: 15 },
        ],
        detail:
            '范围查询不做优化。扫描从 10 开始，给 10 加上 (5, 10]；接着读到 15，虽然 15 不满足条件，但锁是在读取那一刻就加上的，所以 (10, 15] 也一起锁了 —— 范围查询会锁到第一个不满足条件的记录为止。',
        effects: [
            { blocked: true, text: 'UPDATE id = 10 被挡住' },
            { blocked: true, text: 'INSERT id = 6…15 都不行' },
            { blocked: false, text: 'UPDATE id = 5 可以' },
        ],
    },
    {
        sql: 'id >= 10 FOR UPDATE',
        tone: 'purple',
        title: '临键锁（Next-Key Lock）',
        segments: [
            { kind: 'nextkey', from: 5, to: 10 },
            { kind: 'nextkey', from: 10, to: 15 },
            { kind: 'nextkey', from: 15, to: Infinity },
        ],
        detail:
            '没有上界，就一路锁到索引末尾的 supremum。所以范围条件开得越大，锁住的区间越大 —— 这就是 UPDATE / DELETE 的 WHERE 要尽量收窄的原因。',
        effects: [
            { blocked: true, text: 'id ≥ 10 的行都改不了' },
            { blocked: true, text: 'id > 15 的插入也不行' },
        ],
    },
    {
        sql: "name = '张三' FOR UPDATE（name 无索引）",
        tone: 'bad',
        title: '退化成表锁',
        segments: [{ kind: 'table' }],
        detail:
            '行锁是加在索引上的。name 上没有索引，InnoDB 没法通过索引定位行，只能把扫到的每一条记录都锁上，效果等于锁了整张表。',
        effects: [
            { blocked: true, text: '整张表都写不了' },
            { blocked: true, text: '并发直接塌' },
            { blocked: false, text: '所以 WHERE 一定要走索引' },
        ],
    },
];

const LockLab = function ({ caption = '' }) {
    const [index, setIndex] = useState(0);
    const current = CASES[index];
    const tone = TONE[current.tone];

    return (
        <figure className={styles.lab}>
            <div className={styles['lab-head']}>
                <span className={styles['lab-badge']}>互动</span>
                <span className={styles['lab-caption']}>
                    {caption || '加锁范围实验室：id 上有唯一索引，表里现有 5、10、15'}
                </span>
            </div>

            <div className={styles['lab-toolbar']}>
                {CASES.map((item, i) => (
                    <button
                        key={item.sql}
                        type="button"
                        className={`${styles['lab-btn']} ${i === index ? styles['is-active'] : ''}`}
                        onClick={() => setIndex(i)}
                    >
                        {item.sql}
                    </button>
                ))}
            </div>

            <div className={styles['lab-fig']}>
                <svg viewBox="0 0 780 172" role="img" aria-label="InnoDB 在唯一索引上加锁的范围">
                    <text x={AXIS.left - 6} y="125" textAnchor="end" fontSize="11" fill="var(--my-muted)">
                        −∞
                    </text>
                    <text x={AXIS.right + 6} y="125" fontSize="11" fill="var(--my-muted)">
                        +∞
                    </text>

                    <rect
                        x={AXIS.left}
                        y="108"
                        width={AXIS.right - AXIS.left}
                        height="24"
                        rx="12"
                        fill="var(--my-panel)"
                        stroke="var(--my-panel-border)"
                        strokeWidth="1.2"
                    />

                    {current.segments.map((segment) => {
                        const box = boxOf(segment);
                        const showFrom = segment.kind === 'gap' || segment.kind === 'nextkey';
                        const showTo = segment.kind === 'gap' || segment.kind === 'nextkey';
                        return (
                            <g key={`${segment.kind}-${segment.from ?? segment.at ?? 'table'}`}>
                                <rect
                                    x={box.x}
                                    y="108"
                                    width={box.width}
                                    height="24"
                                    rx="6"
                                    fill={tone.fill}
                                    stroke={tone.stroke}
                                    strokeWidth="1.6"
                                />
                                <text
                                    x={box.x + box.width / 2}
                                    y="98"
                                    textAnchor="middle"
                                    fontSize="10.5"
                                    fontWeight="700"
                                    fill={tone.stroke}
                                >
                                    {labelOf(segment)}
                                </text>
                                {showFrom ? (
                                    <circle
                                        cx={box.x}
                                        cy="120"
                                        r="5"
                                        fill="var(--my-card)"
                                        stroke={tone.stroke}
                                        strokeWidth="2"
                                    />
                                ) : null}
                                {showTo ? (
                                    <circle
                                        cx={box.x + box.width}
                                        cy="120"
                                        r="5"
                                        fill={segment.kind === 'gap' ? 'var(--my-card)' : tone.stroke}
                                        stroke={tone.stroke}
                                        strokeWidth="2"
                                    />
                                ) : null}
                            </g>
                        );
                    })}

                    {RECORDS.map((id) => (
                        <g key={id}>
                            <circle cx={xOf(id)} cy="120" r="4.5" fill="var(--my-text)" />
                            <text
                                x={xOf(id)}
                                y="150"
                                textAnchor="middle"
                                fontSize="11"
                                fontFamily="var(--monospaceFont, monospace)"
                                fill="var(--my-muted)"
                            >
                                {id}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            <div className={styles['lab-verdict']}>
                <span className={styles['lab-verdict-tag']}>{current.title}</span>
                <span className={styles['lab-verdict-text']}>{current.detail}</span>
            </div>

            <div className={styles['lab-free']}>
                <span className={styles['lab-free-title']}>其他事务会怎样</span>
                <ul className={styles['lab-free-list']}>
                    {current.effects.map((effect) => (
                        <li
                            key={effect.text}
                            className={`${styles['lab-free-item']} ${
                                effect.blocked ? styles['is-blocked'] : styles['is-ok']
                            }`}
                        >
                            {effect.text}
                        </li>
                    ))}
                </ul>
            </div>

            <p className={styles['lab-note']}>
                空心圆表示区间端点不包含，实心圆表示包含 —— 所以 (5, 10] 是「不锁 id = 5，锁 id = 10」。
                上面这些规则都是 RR 隔离级别下的：RC 级别不加间隙锁，同样的语句锁的范围会小很多。
            </p>
        </figure>
    );
};

LockLab.propTypes = {
    /** Shown next to the "互动" badge. */
    caption: PropTypes.string,
};

export default LockLab;
