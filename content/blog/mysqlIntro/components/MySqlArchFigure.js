import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: MySQL layered architecture.
 * 客户端 → Server 层（连接器/分析器/优化器/执行器 + binlog）→ InnoDB 引擎。
 * All colors come from the CSS variables on `.my`, so dark mode works for free.
 */
const STAGES = [
    { name: '连接器', sub: '握手 · 鉴权（权限以连接时刻为准）' },
    { name: '分析器', sub: '词法分析 · 语法检查' },
    { name: '优化器', sub: '选索引 · 定执行计划' },
    { name: '执行器', sub: '先验权限 · 逐行调引擎接口' },
];

const ENGINE_PARTS = ['Buffer Pool · 脏页', 'redo log · 崩溃恢复', 'undo log · 回滚/MVCC', 'B+ 树 · 数据与索引'];

const MySqlArchFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>{caption || 'MySQL 分层架构：一条 SQL 要穿过的两层'}</span>
            </div>
            <div className={styles['my-fig']}>
                <svg viewBox="0 0 780 320" role="img" aria-label="MySQL 分层架构：客户端、Server 层、InnoDB 存储引擎">
                    <defs>
                        <marker id="arch-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-line)" />
                        </marker>
                        <marker id="arch-ar-acc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-accent)" />
                        </marker>
                    </defs>

                    {/* client */}
                    <rect x="16" y="118" width="104" height="64" rx="10" fill="var(--my-card)" stroke="var(--my-line)" strokeWidth="1.6" />
                    <text x="68" y="146" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--my-text)">客户端</text>
                    <text x="68" y="166" textAnchor="middle" fontSize="10.5" fill="var(--my-muted)">JDBC · Navicat</text>

                    <line x1="122" y1="150" x2="164" y2="150" stroke="var(--my-line)" strokeWidth="1.8" markerEnd="url(#arch-ar)" />

                    {/* server layer */}
                    <rect x="170" y="30" width="400" height="278" rx="12" fill="none" stroke="var(--my-accent)" strokeWidth="1.8" />
                    <text x="190" y="54" fontSize="13.5" fontWeight="700" fill="var(--my-accent)">Server 层</text>

                    {STAGES.map((stage, i) => {
                        const y = 66 + i * 54;
                        return (
                            <g key={stage.name}>
                                <rect x="186" y={y} width="368" height="42" rx="8" fill="var(--my-card)" stroke="var(--my-line)" strokeWidth="1.4" />
                                <text x="202" y={y + 26} fontSize="13" fontWeight="700" fill="var(--my-text)">{stage.name}</text>
                                <text x="266" y={y + 26} fontSize="11" fill="var(--my-muted)">{stage.sub}</text>
                                {i < STAGES.length - 1 ? (
                                    <line x1="370" y1={y + 43} x2="370" y2={y + 53} stroke="var(--my-accent)" strokeWidth="1.6" markerEnd="url(#arch-ar-acc)" />
                                ) : null}
                            </g>
                        );
                    })}

                    {/* binlog strip inside server layer */}
                    <rect x="186" y="272" width="368" height="26" rx="7" fill="var(--my-purple-soft)" stroke="var(--my-purple)" strokeWidth="1.2" />
                    <text x="370" y="289" textAnchor="middle" fontSize="10.5" fill="var(--my-purple)">
                        提交时在 Server 层写 binlog（逻辑日志 · 主从复制 / 恢复）
                    </text>

                    {/* server → engine */}
                    <line x1="572" y1="150" x2="596" y2="150" stroke="var(--my-line)" strokeWidth="1.8" markerEnd="url(#arch-ar)" />
                    <text x="584" y="138" textAnchor="middle" fontSize="9.5" fill="var(--my-muted)">接口</text>

                    {/* innodb */}
                    <rect x="600" y="56" width="164" height="236" rx="12" fill="var(--my-db-soft)" stroke="var(--my-db)" strokeWidth="1.8" />
                    <text x="682" y="82" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--my-db)">InnoDB 引擎</text>
                    {ENGINE_PARTS.map((part, i) => (
                        <g key={part}>
                            <rect x="612" y={96 + i * 44} width="140" height="34" rx="7" fill="var(--my-card)" stroke="var(--my-line)" strokeWidth="1.2" />
                            <text x="682" y={117 + i * 44} textAnchor="middle" fontSize="10.5" fill="var(--my-text)">{part}</text>
                        </g>
                    ))}
                </svg>
            </div>
        </figure>
    );
};

MySqlArchFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default MySqlArchFigure;
