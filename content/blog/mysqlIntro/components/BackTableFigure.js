import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: 回表 vs 覆盖索引.
 * Top: secondary index idx_name (leaves hold name + primary id).
 * Bottom: primary key index (leaves hold the full row).
 * Two paths from the highlighted leaf 张三→id=7: ① covered (return directly),
 * ② back to the primary tree (回表).
 */
const SEC_LEAVES = [
    { x: 238, name: '李四', id: 'id=3', hit: false },
    { x: 338, name: '张三', id: 'id=7', hit: true },
    { x: 438, name: '王五', id: 'id=9', hit: false },
];

const PK_LEAVES = [
    { x: 200, top: 'id=3', sub: '李四 · 24 · …', hit: false },
    { x: 330, top: 'id=7', sub: '张三 · 25 · 1000', hit: true },
    { x: 460, top: 'id=9', sub: '王五 · 31 · …', hit: false },
];

const BackTableFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>{caption || '回表：二级索引查到 id，再回主键树取整行'}</span>
            </div>
            <div className={styles['my-fig']}>
                <svg viewBox="0 0 780 360" role="img" aria-label="回表与覆盖索引路径对比">
                    <defs>
                        <marker id="bt-ar-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-ok)" />
                        </marker>
                        <marker id="bt-ar-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-warn)" />
                        </marker>
                        <marker id="bt-ar-line" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-muted)" />
                        </marker>
                    </defs>

                    {/* secondary index */}
                    <text x="20" y="24" fontSize="12.5" fontWeight="700" fill="var(--my-text)">
                        二级索引 idx_name（叶子：name → 主键 id）
                    </text>
                    <rect x="330" y="36" width="120" height="34" rx="7" fill="var(--my-card)" stroke="var(--my-line)" strokeWidth="1.4" />
                    <text x="360" y="57" textAnchor="middle" fontSize="11.5" fill="var(--my-text)">张三</text>
                    <line x1="390" y1="70" x2="390" y2="70" stroke="none" />
                    {[290, 390, 490].map((x) => (
                        <line key={`sec-edge-${x}`} x1="390" y1="70" x2={x} y2="98" stroke="var(--my-line)" strokeWidth="1.2" />
                    ))}

                    {SEC_LEAVES.map((leaf, i) => (
                        <g key={leaf.name}>
                            <rect
                                x={leaf.x}
                                y="98"
                                width="104"
                                height="44"
                                rx="8"
                                fill={leaf.hit ? 'var(--my-accent-soft)' : 'var(--my-card)'}
                                stroke={leaf.hit ? 'var(--my-accent)' : 'var(--my-line)'}
                                strokeWidth={leaf.hit ? 2 : 1.4}
                            />
                            <text x={leaf.x + 52} y="118" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--my-text)">{leaf.name}</text>
                            <text x={leaf.x + 52} y="134" textAnchor="middle" fontSize="10.5" fill="var(--my-muted)">{leaf.id}</text>
                            {i < SEC_LEAVES.length - 1 ? (
                                <line
                                    x1={leaf.x + 104}
                                    y1="120"
                                    x2={leaf.x + 114}
                                    y2="120"
                                    stroke="var(--my-muted)"
                                    strokeWidth="1.4"
                                    markerEnd="url(#bt-ar-line)"
                                />
                            ) : null}
                        </g>
                    ))}
                    <text x="390" y="164" textAnchor="middle" fontSize="10" fill="var(--my-muted)">叶子按 name 有序，链表相连 → 范围查询顺着扫</text>

                    {/* ① covered path */}
                    <line x1="444" y1="120" x2="556" y2="120" stroke="var(--my-ok)" strokeWidth="2" strokeDasharray="6 4" markerEnd="url(#bt-ar-ok)" />
                    <text x="466" y="110" fontSize="10.5" fontWeight="700" fill="var(--my-ok)">① 覆盖索引</text>
                    <rect x="560" y="96" width="200" height="48" rx="9" fill="var(--my-ok-soft)" stroke="var(--my-ok)" strokeWidth="1.4" />
                    <text x="660" y="115" textAnchor="middle" fontSize="10.5" fill="var(--my-text)">SELECT id, name WHERE name='张三'</text>
                    <text x="660" y="132" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--my-ok)">索引里全都有 → 直接返回，不回表</text>

                    {/* ② back-to-primary path */}
                    <line x1="390" y1="142" x2="390" y2="216" stroke="var(--my-warn)" strokeWidth="2.2" markerEnd="url(#bt-ar-warn)" />
                    <text x="400" y="184" fontSize="10.5" fontWeight="700" fill="var(--my-warn)">② 回表：拿 id=7 去主键树再查一次</text>

                    {/* primary index */}
                    <text x="20" y="234" fontSize="12.5" fontWeight="700" fill="var(--my-text)">
                        主键索引 / 聚簇索引（叶子：id → 整行数据）
                    </text>
                    <rect x="345" y="244" width="90" height="32" rx="7" fill="var(--my-card)" stroke="var(--my-line)" strokeWidth="1.4" />
                    <text x="367" y="264" textAnchor="middle" fontSize="11.5" fill="var(--my-text)">7</text>
                    <text x="412" y="264" textAnchor="middle" fontSize="11.5" fill="var(--my-text)">9</text>
                    {[260, 390, 520].map((x) => (
                        <line key={`pk-edge-${x}`} x1="390" y1="276" x2={x} y2="298" stroke="var(--my-line)" strokeWidth="1.2" />
                    ))}
                    <line x1="390" y1="276" x2="390" y2="298" stroke="var(--my-warn)" strokeWidth="2" />

                    {PK_LEAVES.map((leaf) => (
                        <g key={leaf.top} opacity={leaf.hit ? 1 : 0.55}>
                            <rect
                                x={leaf.x}
                                y="298"
                                width="120"
                                height="44"
                                rx="8"
                                fill={leaf.hit ? 'var(--my-warn-soft)' : 'var(--my-card)'}
                                stroke={leaf.hit ? 'var(--my-warn)' : 'var(--my-line)'}
                                strokeWidth={leaf.hit ? 2 : 1.4}
                            />
                            <text x={leaf.x + 60} y="318" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--my-text)">{leaf.top}</text>
                            <text x={leaf.x + 60} y="334" textAnchor="middle" fontSize="10" fill="var(--my-muted)">{leaf.sub}</text>
                        </g>
                    ))}

                    {/* verdict chip */}
                    <rect x="600" y="290" width="170" height="66" rx="9" fill="var(--my-panel)" stroke="var(--my-line)" strokeWidth="1.2" />
                    <text x="685" y="312" textAnchor="middle" fontSize="10.5" fill="var(--my-text)">SELECT * 要整行 → 必回表；</text>
                    <text x="685" y="328" textAnchor="middle" fontSize="10.5" fill="var(--my-text)">命中行很多时，回表 10 万次</text>
                    <text x="685" y="344" textAnchor="middle" fontSize="10.5" fill="var(--my-text)">优化器可能直接放弃索引</text>
                </svg>
            </div>
        </figure>
    );
};

BackTableFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default BackTableFigure;
