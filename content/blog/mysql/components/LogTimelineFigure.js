import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: what one UPDATE writes, in order.
 * Six steps on a timeline, four lanes (undo / redo / binlog / Buffer Pool)
 * showing which record appears at which step, three crash points, and the
 * two-phase-commit bracket from prepare to commit.
 */
const STEPS = [
    { x: 124, line1: '① 读页', line2: '入内存' },
    { x: 234, line1: '② 写 undo', line2: '旧值 1000' },
    { x: 344, line1: '③ 改内存页', line2: 'redo〔prepare〕', tone: 'warn' },
    { x: 454, line1: '④ Server 层', line2: '写 binlog', tone: 'purple' },
    { x: 564, line1: '⑤ redo', line2: '〔commit〕', tone: 'ok' },
    { x: 674, line1: '⑥ 返回', line2: '客户端 OK' },
];

const STEP_W = 92;

const LANES = [
    { y: 140, label: 'undo log', chips: [{ x: 234, text: 'id=7 旧值=1000' }] },
    {
        y: 180,
        label: 'redo log',
        chips: [
            { x: 344, text: 'balance→1100', tone: 'warn' },
            { x: 564, text: '补 commit 标记', tone: 'ok' },
        ],
    },
    { y: 220, label: 'binlog', chips: [{ x: 454, text: 'UPDATE …+100', tone: 'purple' }] },
    {
        y: 260,
        label: 'Buffer Pool',
        chips: [
            { x: 124, text: '页入内存' },
            { x: 344, text: '变脏页', tone: 'warn' },
            { x: 674, text: '后台异步刷盘' },
        ],
    },
];

const TONE = {
    warn: { stroke: 'var(--my-warn)', fill: 'var(--my-warn-soft)' },
    ok: { stroke: 'var(--my-ok)', fill: 'var(--my-ok-soft)' },
    purple: { stroke: 'var(--my-purple)', fill: 'var(--my-purple-soft)' },
    plain: { stroke: 'var(--my-line)', fill: 'var(--my-card)' },
};

const LogTimelineFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>{caption || '一条 UPDATE 的完整落盘顺序（WAL）'}</span>
            </div>
            <div className={styles['my-fig']}>
                <svg viewBox="0 0 780 350" role="img" aria-label="一条 UPDATE 的写入顺序与两阶段提交时序">
                    <defs>
                        <marker id="log-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--my-muted)" />
                        </marker>
                    </defs>

                    {/* step boxes */}
                    {STEPS.map((step, i) => {
                        const tone = TONE[step.tone || 'plain'];
                        return (
                            <g key={step.line1}>
                                <rect x={step.x} y="36" width={STEP_W} height="56" rx="9" fill={tone.fill} stroke={tone.stroke} strokeWidth="1.6" />
                                <text x={step.x + STEP_W / 2} y="60" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--my-text)">{step.line1}</text>
                                <text x={step.x + STEP_W / 2} y="78" textAnchor="middle" fontSize="10.5" fill="var(--my-muted)">{step.line2}</text>
                                {i < STEPS.length - 1 ? (
                                    <line x1={step.x + STEP_W + 1} y1="64" x2={step.x + STEP_W + 15} y2="64" stroke="var(--my-muted)" strokeWidth="1.5" markerEnd="url(#log-ar)" />
                                ) : null}
                            </g>
                        );
                    })}

                    {/* crash bolts between steps 2-3, 3-4, 4-5 */}
                    {[
                        { x: 335, label: '⚡断电 A' },
                        { x: 445, label: '⚡断电 B' },
                        { x: 555, label: '⚡断电 C' },
                    ].map((bolt) => (
                        <text key={bolt.label} x={bolt.x} y="26" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--my-bad)">{bolt.label}</text>
                    ))}

                    {/* lanes */}
                    {LANES.map((lane) => (
                        <g key={lane.label}>
                            <rect x="124" y={lane.y - 8} width="642" height="40" rx="8" fill="var(--my-panel)" />
                            <text x="116" y={lane.y + 15} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--my-muted)">{lane.label}</text>
                            {lane.chips.map((chip) => {
                                const tone = TONE[chip.tone || 'plain'];
                                return (
                                    <g key={`${lane.label}-${chip.x}`}>
                                        <rect x={chip.x} y={lane.y - 2} width={STEP_W} height="28" rx="7" fill={tone.fill} stroke={tone.stroke} strokeWidth="1.3" />
                                        <text x={chip.x + STEP_W / 2} y={lane.y + 16} textAnchor="middle" fontSize="10" fill="var(--my-text)">{chip.text}</text>
                                    </g>
                                );
                            })}
                        </g>
                    ))}

                    {/* two-phase commit bracket: step ③ → step ⑤ */}
                    <path d="M 344 306 v 10 h 312 v -10" fill="none" stroke="var(--my-accent)" strokeWidth="1.8" />
                    <text x="500" y="338" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--my-accent)">
                        两阶段提交：redo prepare → binlog → redo commit
                    </text>
                </svg>
            </div>
        </figure>
    );
};

LogTimelineFigure.propTypes = {
    /** Shown next to the "图示" badge. */
    caption: PropTypes.string,
};

export default LogTimelineFigure;
