import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: the two kinds of InnoDB index and what happens when you read
 * through the secondary one.
 *
 * Two B+ trees side by side — the clustered index stores whole rows in its
 * leaves, the secondary index stores only primary keys — with the 回表 hop drawn
 * between them, and the 覆盖索引 shortcut called out underneath. Drawing it is
 * the point: "多一次 B+ 树搜索" is one sentence in prose but an obvious extra
 * arrow in a picture.
 */
const LEAF_Y = 130;
const LEAF_H = 62;

const TREES = [
    {
        key: 'clustered',
        title: '聚簇索引（主键 id）',
        subtitle: '叶子节点 = 整行数据',
        color: 'var(--my-accent)',
        frame: { x: 16, width: 354 },
        root: { x: 118, width: 150, text: '非叶子：只存主键' },
        leaves: [
            { x: 35, head: 'id = 10', tail: '整行：name / age / …' },
            { x: 201, head: 'id = 20', tail: '整行：name / age / …' },
        ],
    },
    {
        key: 'secondary',
        title: '二级索引（name）',
        subtitle: '叶子节点 = 主键值，不是整行',
        color: 'var(--my-purple)',
        frame: { x: 410, width: 354 },
        root: { x: 512, width: 150, text: '非叶子：只存 name' },
        leaves: [
            { x: 429, head: "'张三'", tail: '→ id = 5' },
            { x: 595, head: "'李四'", tail: '→ id = 9' },
        ],
    },
];

const LEAF_W = 150;

const IndexFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '聚簇索引与二级索引：回表到底多做了什么'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 336"
                    role="img"
                    aria-label="聚簇索引的叶子存整行，二级索引的叶子存主键，通过二级索引查询需要回表"
                >
                    <defs>
                        <marker
                            id="idx-link"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-muted)" />
                        </marker>
                        <marker
                            id="idx-back"
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

                    {TREES.map((tree) => {
                        const center = tree.frame.x + tree.frame.width / 2;
                        return (
                            <g key={tree.key}>
                                <rect
                                    x={tree.frame.x}
                                    y="26"
                                    width={tree.frame.width}
                                    height="196"
                                    rx="12"
                                    fill="none"
                                    stroke={tree.color}
                                    strokeWidth="1.5"
                                    strokeDasharray="5 4"
                                />
                                <text
                                    x={center}
                                    y="48"
                                    textAnchor="middle"
                                    fontSize="12.5"
                                    fontWeight="700"
                                    fill={tree.color}
                                >
                                    {tree.title}
                                </text>
                                <text x={center} y="66" textAnchor="middle" fontSize="10.5" fill="var(--my-muted)">
                                    {tree.subtitle}
                                </text>

                                <rect
                                    x={tree.root.x}
                                    y="78"
                                    width={tree.root.width}
                                    height="28"
                                    rx="7"
                                    fill="var(--my-card)"
                                    stroke="var(--my-line)"
                                    strokeWidth="1.3"
                                />
                                <text
                                    x={tree.root.x + tree.root.width / 2}
                                    y="96"
                                    textAnchor="middle"
                                    fontSize="10.5"
                                    fill="var(--my-text)"
                                >
                                    {tree.root.text}
                                </text>

                                {tree.leaves.map((leaf) => (
                                    <g key={leaf.x}>
                                        <line
                                            x1={tree.root.x + tree.root.width / 2}
                                            y1="106"
                                            x2={leaf.x + LEAF_W / 2}
                                            y2={LEAF_Y}
                                            stroke="var(--my-line)"
                                            strokeWidth="1.4"
                                        />
                                        <rect
                                            x={leaf.x}
                                            y={LEAF_Y}
                                            width={LEAF_W}
                                            height={LEAF_H}
                                            rx="9"
                                            fill="var(--my-card)"
                                            stroke={tree.color}
                                            strokeWidth="1.5"
                                        />
                                        <text
                                            x={leaf.x + LEAF_W / 2}
                                            y={LEAF_Y + 24}
                                            textAnchor="middle"
                                            fontSize="12"
                                            fontWeight="700"
                                            fill="var(--my-text)"
                                        >
                                            {leaf.head}
                                        </text>
                                        <text
                                            x={leaf.x + LEAF_W / 2}
                                            y={LEAF_Y + 44}
                                            textAnchor="middle"
                                            fontSize="10.5"
                                            fill="var(--my-muted)"
                                        >
                                            {leaf.tail}
                                        </text>
                                    </g>
                                ))}

                                {/* the leaves of one B+ tree form a doubly linked list */}
                                <line
                                    x1={tree.leaves[0].x + 6}
                                    y1="202"
                                    x2={tree.leaves[1].x + LEAF_W - 6}
                                    y2="202"
                                    stroke="var(--my-muted)"
                                    strokeWidth="1.4"
                                    markerStart="url(#idx-link)"
                                    markerEnd="url(#idx-link)"
                                />
                                <text x={center} y="216" textAnchor="middle" fontSize="10" fill="var(--my-muted)">
                                    叶子之间双向链表 · 范围查询顺着扫
                                </text>
                            </g>
                        );
                    })}

                    {/* the extra B+ tree search that a secondary index costs */}
                    <line
                        x1="427"
                        y1="161"
                        x2="355"
                        y2="161"
                        stroke="var(--my-bad)"
                        strokeWidth="2"
                        markerEnd="url(#idx-back)"
                    />
                    <text x="390" y="152" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--my-bad)">
                        回表
                    </text>

                    <text x="390" y="236" textAnchor="middle" fontSize="11" fill="var(--my-bad)">
                        回表 = 二级索引拿到主键后，再回聚簇索引搜一次 B+ 树（多一次 IO）
                    </text>

                    {/* the shortcut that skips it */}
                    <rect
                        x="16"
                        y="248"
                        width="748"
                        height="76"
                        rx="12"
                        fill="var(--my-ok-soft)"
                        stroke="var(--my-ok)"
                        strokeWidth="1.4"
                    />
                    <text x="34" y="272" fontSize="12.5" fontWeight="700" fill="var(--my-ok)">
                        覆盖索引：这一次不用回表
                    </text>
                    <text
                        x="34"
                        y="294"
                        fontSize="11"
                        fontFamily="var(--monospaceFont, monospace)"
                        fill="var(--my-text)"
                    >
                        SELECT name FROM user WHERE name = '张三'
                    </text>
                    <text x="34" y="313" fontSize="11" fill="var(--my-text)">
                        查询的列全在二级索引的叶子里 → 直接返回，省掉回表（EXPLAIN 的 Extra 显示 Using index）
                    </text>
                </svg>
            </div>
        </figure>
    );
};

IndexFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default IndexFigure;
