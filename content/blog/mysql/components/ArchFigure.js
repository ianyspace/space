import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: MySQL's three layers, plus one SELECT walking through them.
 *
 * Left: the layers and what lives in each one. Right: the seven steps of a
 * SELECT, numbered in execution order and colour-coded by the layer that does
 * the work. The two halves are drawn from the same layer table, so a step can
 * never drift away from the band it belongs to.
 */
const LAYERS = [
    {
        key: 'conn',
        name: '连接层',
        color: 'var(--my-accent)',
        y: 64,
        height: 58,
        chips: [
            { x: 30, y: 90, width: 176, text: '连接池（缓存线程，复用连接）' },
            { x: 216, y: 90, width: 120, text: '认证鉴权' },
        ],
        note: '权限以连接建立时为准',
    },
    {
        key: 'server',
        name: '服务层（Server 层）',
        color: 'var(--my-purple)',
        y: 132,
        height: 136,
        chips: [
            { x: 30, y: 158, width: 210, text: '查询缓存（8.0 已移除）' },
            { x: 252, y: 158, width: 284, text: '解析器：词法分析 → 语法分析 → AST' },
            { x: 30, y: 190, width: 210, text: '预处理器：表/列存在性 · 权限校验' },
            { x: 252, y: 190, width: 284, text: '优化器：选索引 · 连接顺序 · 执行计划' },
            { x: 30, y: 222, width: 506, text: '执行器：校验权限 → 调用引擎接口逐行取数' },
        ],
        note: '',
    },
    {
        key: 'engine',
        name: '存储引擎层（可插拔）',
        color: 'var(--my-db)',
        y: 276,
        height: 76,
        chips: [
            { x: 30, y: 302, width: 118, text: 'InnoDB（默认）' },
            { x: 158, y: 302, width: 84, text: 'MyISAM' },
            { x: 252, y: 302, width: 78, text: 'Memory' },
            { x: 340, y: 302, width: 130, text: 'Archive / CSV / …' },
        ],
        note: '行锁 · MVCC · redo log · B+ 树 都实现在这一层',
    },
];

const STEPS = [
    { layer: 'client', text: '客户端发送 SQL', sub: '应用 / JDBC 驱动' },
    { layer: 'conn', text: '连接器', sub: '握手 · 权限校验' },
    { layer: 'server', text: '解析器', sub: '词法 → 语法 → AST' },
    { layer: 'server', text: '预处理器', sub: '表/列存在性 · 展开 *' },
    { layer: 'server', text: '优化器', sub: '选索引 · 生成执行计划' },
    { layer: 'server', text: '执行器', sub: '调引擎接口逐行取数' },
    { layer: 'engine', text: '存储引擎', sub: '读数据页 → 返回结果集' },
];

const STEP_COLOR = {
    client: 'var(--my-muted)',
    conn: 'var(--my-accent)',
    server: 'var(--my-purple)',
    engine: 'var(--my-db)',
};

const ArchFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || 'MySQL 的三层架构：一条 SELECT 要穿过哪几层'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 392"
                    role="img"
                    aria-label="MySQL 三层架构，以及一条 SELECT 依次经过的七个步骤"
                >
                    <defs>
                        <marker
                            id="arch-ar"
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

                    {/* client */}
                    <rect
                        x="16"
                        y="12"
                        width="520"
                        height="32"
                        rx="8"
                        fill="var(--my-card)"
                        stroke="var(--my-line)"
                        strokeWidth="1.4"
                    />
                    <text x="276" y="33" textAnchor="middle" fontSize="11.5" fill="var(--my-text)">
                        客户端（应用 · JDBC 驱动 · 连接池）
                    </text>
                    <line
                        x1="276"
                        y1="44"
                        x2="276"
                        y2="60"
                        stroke="var(--my-muted)"
                        strokeWidth="1.5"
                        markerEnd="url(#arch-ar)"
                    />

                    {/* the three layers */}
                    {LAYERS.map((layer) => (
                        <g key={layer.key}>
                            <rect
                                x="16"
                                y={layer.y}
                                width="520"
                                height={layer.height}
                                rx="10"
                                fill="none"
                                stroke={layer.color}
                                strokeWidth="1.6"
                            />
                            <text
                                x="30"
                                y={layer.y + 20}
                                fontSize="12.5"
                                fontWeight="700"
                                fill={layer.color}
                            >
                                {layer.name}
                            </text>
                            {layer.chips.map((chip) => (
                                <g key={chip.text}>
                                    <rect
                                        x={chip.x}
                                        y={chip.y}
                                        width={chip.width}
                                        height="26"
                                        rx="7"
                                        fill="var(--my-card)"
                                        stroke="var(--my-line)"
                                        strokeWidth="1.2"
                                    />
                                    <text
                                        x={chip.x + chip.width / 2}
                                        y={chip.y + 17}
                                        textAnchor="middle"
                                        fontSize="10.5"
                                        fill="var(--my-text)"
                                    >
                                        {chip.text}
                                    </text>
                                </g>
                            ))}
                            {layer.note ? (
                                <text x="522" y={layer.y + 20} textAnchor="end" fontSize="10" fill="var(--my-muted)">
                                    {layer.note}
                                </text>
                            ) : null}
                        </g>
                    ))}

                    {/* one SELECT, step by step */}
                    <text x="658" y="26" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--my-text)">
                        一条 SELECT 的路径
                    </text>
                    {STEPS.map((step, i) => {
                        const y = 40 + i * 44;
                        const color = STEP_COLOR[step.layer];
                        return (
                            <g key={step.text}>
                                <rect
                                    x="552"
                                    y={y}
                                    width="212"
                                    height="36"
                                    rx="8"
                                    fill="var(--my-card)"
                                    stroke="var(--my-line)"
                                    strokeWidth="1.2"
                                />
                                <circle cx="572" cy={y + 18} r="9" fill={color} />
                                <text
                                    x="572"
                                    y={y + 22}
                                    textAnchor="middle"
                                    fontSize="10.5"
                                    fontWeight="700"
                                    fill="#fff"
                                >
                                    {i + 1}
                                </text>
                                <text x="590" y={y + 15} fontSize="11.5" fontWeight="700" fill="var(--my-text)">
                                    {step.text}
                                </text>
                                <text x="590" y={y + 29} fontSize="9.8" fill="var(--my-muted)">
                                    {step.sub}
                                </text>
                            </g>
                        );
                    })}

                    {/* legend for the coloured step numbers */}
                    <g fontSize="10" fill="var(--my-muted)">
                        {[
                            { x: 581, color: 'var(--my-accent)', label: '连接层' },
                            { x: 641, color: 'var(--my-purple)', label: '服务层' },
                            { x: 701, color: 'var(--my-db)', label: '存储引擎层' },
                        ].map((item) => (
                            <g key={item.label}>
                                <circle cx={item.x} cy="372" r="4" fill={item.color} />
                                <text x={item.x + 8} y="376">
                                    {item.label}
                                </text>
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
        </figure>
    );
};

ArchFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default ArchFigure;
