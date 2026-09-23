import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: the two-phase commit, and what a restart decides afterwards.
 *
 * The three phases are drawn left to right with the two interesting crash points
 * cutting the flow, and each crash point carries a line down to the verdict a
 * restart would reach. That is the whole reason the prepare state exists: the
 * recovery rule needs to know whether binlog got there before the power went.
 */
const PHASES = [
    {
        x: 32,
        title: '① Prepare 阶段',
        sub: 'redo 写盘 + 标 prepare',
        color: 'var(--my-warn)',
        fill: 'var(--my-warn-soft)',
    },
    {
        x: 272,
        title: '② binlog 写盘',
        sub: 'Server 层 · 逻辑日志',
        color: 'var(--my-purple)',
        fill: 'var(--my-purple-soft)',
    },
    {
        x: 512,
        title: '③ Commit 阶段',
        sub: 'redo 标 commit',
        color: 'var(--my-ok)',
        fill: 'var(--my-ok-soft)',
    },
];

const PHASE_W = 190;

/** Crash point → the verdict a restart reaches, and how to reach that box. */
const CRASHES = [
    {
        label: '⚡ 崩溃 A',
        cut: { x: 247, from: 20, to: 110 },
        path: 'M 247 110 H 136 V 130',
        verdict: {
            x: 16,
            width: 240,
            line1: 'redo = prepare · binlog 不完整',
            line2: '→ 回滚这个事务 ✗',
            color: 'var(--my-bad)',
            fill: 'var(--my-bad-soft)',
        },
    },
    {
        label: '⚡ 崩溃 B',
        cut: { x: 487, from: 20, to: 110 },
        path: 'M 487 110 H 390 V 130',
        verdict: {
            x: 270,
            width: 240,
            line1: 'redo = prepare · binlog 完整',
            line2: '→ 提交 ✅',
            color: 'var(--my-ok)',
            fill: 'var(--my-ok-soft)',
        },
    },
    {
        label: '',
        cut: null,
        path: 'M 607 94 V 110 H 644 V 130',
        verdict: {
            x: 524,
            width: 240,
            line1: 'redo = commit',
            line2: '→ 直接提交 ✅',
            color: 'var(--my-ok)',
            fill: 'var(--my-ok-soft)',
        },
    },
];

const CommitFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>
                    {caption || '两阶段提交：崩溃点落在哪，重启后就怎么判'}
                </span>
            </div>
            <div className={styles['my-fig']}>
                <svg
                    viewBox="0 0 780 236"
                    role="img"
                    aria-label="redo log 与 binlog 的两阶段提交流程，以及三种崩溃恢复判定结果"
                >
                    <defs>
                        <marker
                            id="commit-ar"
                            viewBox="0 0 10 10"
                            refX="9"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-bad)" />
                        </marker>
                        <marker
                            id="commit-flow"
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

                    {PHASES.map((phase, i) => (
                        <g key={phase.title}>
                            <rect
                                x={phase.x}
                                y="30"
                                width={PHASE_W}
                                height="64"
                                rx="10"
                                fill={phase.fill}
                                stroke={phase.color}
                                strokeWidth="1.6"
                            />
                            <text
                                x={phase.x + PHASE_W / 2}
                                y="58"
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="700"
                                fill={phase.color}
                            >
                                {phase.title}
                            </text>
                            <text
                                x={phase.x + PHASE_W / 2}
                                y="78"
                                textAnchor="middle"
                                fontSize="10.5"
                                fill="var(--my-text)"
                            >
                                {phase.sub}
                            </text>
                            {i < PHASES.length - 1 ? (
                                <line
                                    x1={phase.x + PHASE_W + 2}
                                    y1="62"
                                    x2={phase.x + PHASE_W + 44}
                                    y2="62"
                                    stroke="var(--my-muted)"
                                    strokeWidth="1.6"
                                    markerEnd="url(#commit-flow)"
                                />
                            ) : null}
                        </g>
                    ))}

                    {CRASHES.map((crash) => (
                        <g key={crash.path}>
                            {crash.cut ? (
                                <>
                                    <text
                                        x={crash.cut.x}
                                        y="14"
                                        textAnchor="middle"
                                        fontSize="10.5"
                                        fontWeight="700"
                                        fill="var(--my-bad)"
                                    >
                                        {crash.label}
                                    </text>
                                    <line
                                        x1={crash.cut.x}
                                        y1={crash.cut.from}
                                        x2={crash.cut.x}
                                        y2={crash.cut.to}
                                        stroke="var(--my-bad)"
                                        strokeWidth="1.6"
                                        strokeDasharray="4 3"
                                    />
                                </>
                            ) : null}
                            <path
                                d={crash.path}
                                fill="none"
                                stroke="var(--my-bad)"
                                strokeWidth="1.5"
                                markerEnd="url(#commit-ar)"
                            />
                            <rect
                                x={crash.verdict.x}
                                y="136"
                                width={crash.verdict.width}
                                height="56"
                                rx="10"
                                fill={crash.verdict.fill}
                                stroke={crash.verdict.color}
                                strokeWidth="1.4"
                            />
                            <text
                                x={crash.verdict.x + crash.verdict.width / 2}
                                y="158"
                                textAnchor="middle"
                                fontSize="10.5"
                                fill="var(--my-muted)"
                            >
                                {crash.verdict.line1}
                            </text>
                            <text
                                x={crash.verdict.x + crash.verdict.width / 2}
                                y="179"
                                textAnchor="middle"
                                fontSize="12.5"
                                fontWeight="700"
                                fill={crash.verdict.color}
                            >
                                {crash.verdict.line2}
                            </text>
                        </g>
                    ))}

                    <text x="390" y="220" textAnchor="middle" fontSize="11" fill="var(--my-muted)">
                        两阶段提交保证 redo log 和 binlog 要么都生效、要么都不生效 —— 主库和从库不会分叉
                    </text>
                </svg>
            </div>
        </figure>
    );
};

CommitFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default CommitFigure;
