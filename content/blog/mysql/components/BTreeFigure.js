import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: what a B+ tree actually looks like.
 *
 * The article used to sketch this in ASCII, and the sketch came out misleading:
 * nine leaves were grouped into four visual clusters under three parents, with
 * four "linked list" markers pointing at nine leaves. Drawing it properly makes
 * the two properties that matter obvious — interior nodes hold keys only, and
 * every leaf is one link away from its neighbour — which is exactly the pair of
 * facts the whole "why B+ tree" answer rests on.
 */
const NODE_H = 32;
const LEAF_H = 64;
const LEAF_W = 120;

const ROOT = { x: 421, keys: ['40'] };

const INTERIOR = [
    { x: 247, keys: ['20'] },
    { x: 595, keys: ['60'] },
];

/** Leaves are laid out left to right; the interior nodes sit above their pairs. */
const LEAVES = [
    { x: 100, keys: ['10'] },
    { x: 274, keys: ['30'] },
    { x: 448, keys: ['50'] },
    { x: 622, keys: ['70'] },
];

const EDGES = [
    { from: [ROOT.x, 60], to: [INTERIOR[0].x, 106] },
    { from: [ROOT.x, 60], to: [INTERIOR[1].x, 106] },
    { from: [INTERIOR[0].x, 138], to: [LEAVES[0].x + LEAF_W / 2, 178] },
    { from: [INTERIOR[0].x, 138], to: [LEAVES[1].x + LEAF_W / 2, 178] },
    { from: [INTERIOR[1].x, 138], to: [LEAVES[2].x + LEAF_W / 2, 178] },
    { from: [INTERIOR[1].x, 138], to: [LEAVES[3].x + LEAF_W / 2, 178] },
];

/** Double-headed arrows between neighbouring leaves = the leaf linked list. */
const LINKS = [
    [LEAVES[0].x + LEAF_W + 4, LEAVES[1].x - 4],
    [LEAVES[1].x + LEAF_W + 4, LEAVES[2].x - 4],
    [LEAVES[2].x + LEAF_W + 4, LEAVES[3].x - 4],
];

const LEVELS = [
    { y: 48, text: '第 1 层' },
    { y: 126, text: '第 2 层' },
    { y: 214, text: '叶子层' },
];

function KeyNode({ x, keys, y }) {
    const width = 30 + keys.length * 34;
    return (
        <g>
            <rect
                x={x - width / 2}
                y={y}
                width={width}
                height={NODE_H}
                rx="7"
                fill="var(--my-card)"
                stroke="var(--my-accent)"
                strokeWidth="1.6"
            />
            {keys.map((key, i) => (
                <g key={key}>
                    {i > 0 ? (
                        <line
                            x1={x - width / 2 + i * 34}
                            y1={y + 4}
                            x2={x - width / 2 + i * 34}
                            y2={y + NODE_H - 4}
                            stroke="var(--my-line)"
                            strokeWidth="1"
                        />
                    ) : null}
                    <text
                        x={x - width / 2 + i * 34 + 17}
                        y={y + 21}
                        textAnchor="middle"
                        fontSize="12.5"
                        fontWeight="700"
                        fill="var(--my-text)"
                    >
                        {key}
                    </text>
                </g>
            ))}
        </g>
    );
}

const BTreeFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || 'B+ 树：非叶子只存键，叶子存数据并串成双向链表'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 322"
                    role="img"
                    aria-label="B+ 树结构：非叶子节点只存键，叶子节点存键与数据并由双向链表连接"
                >
                    <defs>
                        <marker
                            id="btree-link"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-db)" />
                        </marker>
                    </defs>

                    <text x="100" y="16" fontSize="10.5" fill="var(--my-muted)">
                        非叶子节点：只存键，不存数据
                    </text>

                    {LEVELS.map((level) => (
                        <text
                            key={level.text}
                            x="92"
                            y={level.y}
                            textAnchor="end"
                            fontSize="10.5"
                            fill="var(--my-muted)"
                        >
                            {level.text}
                        </text>
                    ))}

                    {EDGES.map((edge) => (
                        <line
                            key={`${edge.from.join()}-${edge.to.join()}`}
                            x1={edge.from[0]}
                            y1={edge.from[1]}
                            x2={edge.to[0]}
                            y2={edge.to[1]}
                            stroke="var(--my-line)"
                            strokeWidth="1.4"
                        />
                    ))}

                    <KeyNode x={ROOT.x} keys={ROOT.keys} y={28} />
                    {INTERIOR.map((node) => (
                        <KeyNode key={node.x} x={node.x} keys={node.keys} y={106} />
                    ))}

                    {LEAVES.map((leaf) => (
                        <g key={leaf.x}>
                            <rect
                                x={leaf.x}
                                y="178"
                                width={LEAF_W}
                                height={LEAF_H}
                                rx="9"
                                fill="var(--my-card)"
                                stroke="var(--my-db)"
                                strokeWidth="1.6"
                            />
                            <rect
                                x={leaf.x + 6}
                                y="184"
                                width={LEAF_W - 12}
                                height="28"
                                rx="6"
                                fill="var(--my-db-soft)"
                            />
                            <text
                                x={leaf.x + LEAF_W / 2}
                                y="204"
                                textAnchor="middle"
                                fontSize="12.5"
                                fontWeight="700"
                                fill="var(--my-text)"
                            >
                                {leaf.keys.join(' | ')}
                            </text>
                            <rect
                                x={leaf.x + 6}
                                y="216"
                                width={LEAF_W - 12}
                                height="20"
                                rx="6"
                                fill="var(--my-card)"
                                stroke="var(--my-line)"
                                strokeWidth="1"
                            />
                            <text
                                x={leaf.x + LEAF_W / 2}
                                y="230"
                                textAnchor="middle"
                                fontSize="9.5"
                                fill="var(--my-muted)"
                            >
                                数据 / 主键
                            </text>
                        </g>
                    ))}

                    {LINKS.map(([x1, x2]) => (
                        <line
                            key={x1}
                            x1={x1}
                            y1="254"
                            x2={x2}
                            y2="254"
                            stroke="var(--my-db)"
                            strokeWidth="1.6"
                            markerStart="url(#btree-link)"
                            markerEnd="url(#btree-link)"
                        />
                    ))}

                    <text x="421" y="288" textAnchor="middle" fontSize="11" fill="var(--my-text)">
                        叶子之间是双向链表：范围查询定位到起点叶子，顺着链表往右扫就行，不用回到根节点
                    </text>
                    <text x="421" y="308" textAnchor="middle" fontSize="11" fill="var(--my-muted)">
                        3 层就能装下两千万条：非叶子每页约 1170 个键，叶子每页约 16 行 —— 查一条只要 2~3 次磁盘 IO
                    </text>
                </svg>
            </div>
        </figure>
    );
};

BTreeFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default BTreeFigure;
