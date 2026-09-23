import React from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Static figure: MVCC version chain + two ReadViews.
 * Top: the row's version chain (newest left, linked by roll_pointer).
 * Bottom: the same chain judged by RR's reused ReadView vs RC's fresh one.
 */
const VERSIONS = [
    { x: 36, trx: 'trx_id = 100', val: '2000', tag: '事务 B 的修改 · 未提交', tone: 'bad' },
    { x: 290, trx: 'trx_id = 90', val: '1200', tag: '另一个事务 · 未提交', tone: 'muted' },
    { x: 544, trx: 'trx_id = 60', val: '500', tag: '很久以前已提交', tone: 'ok' },
];

const TONE_STROKE = { bad: 'var(--my-bad)', muted: 'var(--my-line)', ok: 'var(--my-ok)' };

const MvccFigure = function ({ caption = '' }) {
    return (
        <figure className={styles.my}>
            <div className={styles['my-fig-head']}>
                <span className={styles['my-badge']}>图示</span>
                <span className={styles['my-caption']}>{caption || 'MVCC：一条版本链，两张 ReadView，两个答案'}</span>
            </div>
            <div className={styles['my-fig']}>
                <svg viewBox="0 0 780 320" role="img" aria-label="MVCC 版本链与 ReadView 可见性判定">
                    <text x="390" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--my-text)">
                        account 表 id=1 的版本链（新的在左，roll_pointer 指向旧版本）
                    </text>

                    {VERSIONS.map((v, i) => (
                        <g key={v.trx}>
                            <rect x={v.x} y="40" width="200" height="88" rx="10" fill="var(--my-card)" stroke={TONE_STROKE[v.tone]} strokeWidth="1.8" />
                            <text x={v.x + 100} y="62" textAnchor="middle" fontSize="11" fontFamily="var(--monospaceFont, monospace)" fill="var(--my-muted)">{v.trx}</text>
                            <text x={v.x + 100} y="88" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--my-text)">balance = {v.val}</text>
                            <text x={v.x + 100} y="110" textAnchor="middle" fontSize="10.5" fill="var(--my-muted)">{v.tag}</text>
                            {i > 0 ? (
                                <g>
                                    <line x1={v.x + 200} y1="84" x2={v.x + 48} y2="84" stroke="var(--my-muted)" strokeWidth="1.6" />
                                    <path d={`M ${v.x + 48} 84 l 10 -4 l 0 8 z`} fill="var(--my-muted)" />
                                    <text x={v.x + 124} y="76" textAnchor="middle" fontSize="9.5" fill="var(--my-muted)">roll_pointer</text>
                                </g>
                            ) : null}
                        </g>
                    ))}

                    <text x="390" y="162" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="var(--my-text)">
                        事务 A（trx_id = 80）执行 SELECT —— 用哪张 ReadView 判可见性？
                    </text>

                    {/* RV1: RR */}
                    <g>
                        <rect x="36" y="180" width="350" height="126" rx="10" fill="var(--my-card)" stroke="var(--my-accent)" strokeWidth="1.6" />
                        <text x="52" y="202" fontSize="12" fontWeight="700" fill="var(--my-accent)">RR：整个事务复用第一次的 ReadView</text>
                        <text x="52" y="224" fontSize="11" fontFamily="var(--monospaceFont, monospace)" fill="var(--my-muted)">m_ids = [90, 100]（活跃名单）</text>
                        <text x="52" y="244" fontSize="11" fill="var(--my-text)">100 在名单 → 不可见；90 在名单 → 不可见</text>
                        <text x="52" y="264" fontSize="11" fill="var(--my-text)">60 &lt; min_trx_id(90) → 可见 ✓</text>
                        <text x="52" y="290" fontSize="12" fontWeight="700" fill="var(--my-ok)">⇒ 读到 500（两次读一致，可重复读）</text>
                    </g>

                    {/* RV2: RC */}
                    <g>
                        <rect x="394" y="180" width="350" height="126" rx="10" fill="var(--my-card)" stroke="var(--my-warn)" strokeWidth="1.6" />
                        <text x="410" y="202" fontSize="12" fontWeight="700" fill="var(--my-warn)">RC：每次查询重新生成 ReadView</text>
                        <text x="410" y="224" fontSize="11" fontFamily="var(--monospaceFont, monospace)" fill="var(--my-muted)">m_ids = [90]（B 已提交，被划掉）</text>
                        <text x="410" y="244" fontSize="11" fill="var(--my-text)">100 不在名单且已提交 → 可见 ✓</text>
                        <text x="410" y="290" fontSize="12" fontWeight="700" fill="var(--my-warn)">⇒ 读到 2000（和第一次不同 → 不可重复读）</text>
                    </g>
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
