import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Interactive: which of the four reference types survive a given kind of
 * memory pressure?
 *
 * The table in the article already lists "回收时机" for each type, and it is
 * still not enough: 软引用 and 弱引用 are both "会被回收", and the only thing
 * that separates them is *what triggers it* — memory pressure for the soft one,
 * any GC at all for the weak one. That difference only shows up when you put
 * the two scenarios side by side, which is what the toolbar does.
 */
const REFS = [
    { key: 'strong', name: '强引用' },
    { key: 'soft', name: '软引用' },
    { key: 'weak', name: '弱引用' },
    { key: 'phantom', name: '虚引用' },
];

const STATE = {
    alive: { label: '✓ 还在', tone: 'ok' },
    collected: { label: '✗ 被回收', tone: 'bad' },
    pending: { label: '— 拿不到对象', tone: 'muted' },
    notified: { label: '→ 入队通知', tone: 'purple' },
};

const CASES = [
    {
        label: '内存充足，还没 GC',
        states: { strong: 'alive', soft: 'alive', weak: 'alive', phantom: 'pending' },
        notes: {
            strong: '引用还在作用域里，谁也不会动它',
            soft: '内存够，缓存继续用着 —— 这就是它适合做缓存的原因',
            weak: '还没 GC，所以暂时还在；GC 一来就没了',
            phantom: 'get() 恒为 null，ReferenceQueue 里空着',
        },
        verdict: '四种都还在',
        why: '软引用和弱引用都不是「立刻回收」，区别只在触发条件：软引用等内存不够，弱引用等下一次 GC。',
    },
    {
        label: '内存不足，GC 被触发',
        states: { strong: 'alive', soft: 'collected', weak: 'collected', phantom: 'notified' },
        notes: {
            strong: '只要引用还在，内存再紧也不回收 —— 宁可抛 OOM',
            soft: '内存不足，缓存被回收 —— 这是软引用唯一会消失的场景',
            weak: '下次 GC 必回收，跟内存够不够没关系',
            phantom: '对象被回收 → 引用入队，后台线程拿它去释放堆外内存',
        },
        verdict: '软、弱都被回收，强引用还在',
        why: '软引用是「内存不足才回收」，所以这一格是它唯一会消失的场景；弱引用本来就等 GC，一起走。虚引用不持有对象，但对象被回收时会被放进 ReferenceQueue。',
    },
    {
        label: '手动调用 System.gc()',
        states: { strong: 'alive', soft: 'alive', weak: 'collected', phantom: 'notified' },
        notes: {
            strong: '手动 GC 也动不了它',
            soft: 'GC 是发生了，但内存还够 —— 软引用照样留着',
            weak: '只要 GC 发生就回收，不看内存压力',
            phantom: '对象被回收 → 引用入队',
        },
        verdict: '只有弱引用被回收',
        why: '这一格是软引用和弱引用的分水岭：手动 GC 但内存还够，软引用照样留着。判断软引用能不能活，看的是内存压力，不是有没有发生 GC。',
    },
];

const ReferenceLab = function ({ caption = '' }) {
    const [index, setIndex] = useState(0);
    const current = CASES[index];

    return (
        <figure className={styles.lab}>
            <div className={styles['lab-head']}>
                <span className={styles['lab-badge']}>互动</span>
                <span className={styles['lab-caption']}>
                    {caption || '换个内存压力，看四种引用各自还活不活'}
                </span>
            </div>

            <div className={styles['lab-toolbar']}>
                {CASES.map((item, i) => (
                    <button
                        key={item.label}
                        type="button"
                        className={`${styles['lab-btn']} ${i === index ? styles['is-active'] : ''}`}
                        onClick={() => setIndex(i)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className={styles['lab-cards']}>
                {REFS.map((ref) => {
                    const state = STATE[current.states[ref.key]];
                    return (
                        <div
                            key={ref.key}
                            className={`${styles['lab-card']} ${styles[`is-${state.tone}`]}`}
                        >
                            <span className={styles['lab-card-name']}>{ref.name}</span>
                            <span className={styles['lab-card-state']}>{state.label}</span>
                            <span className={styles['lab-card-hint']}>{current.notes[ref.key]}</span>
                        </div>
                    );
                })}
            </div>

            <div className={styles['lab-verdict']}>
                <span className={styles['lab-verdict-tag']}>{current.verdict}</span>
                <span className={styles['lab-verdict-text']}>{current.why}</span>
            </div>

            <p className={styles['lab-note']}>
                一句话规则：强引用看作用域，软引用看内存够不够，弱引用只看有没有发生 GC，虚引用根本不持有对象。
                所以「缓存用软引用、ThreadLocal 的 Key 用弱引用」不是随便挑的 ——
                缓存要的是「内存紧了自己让路」，ThreadLocal 要的是「外部没人用了就赶紧回收，别拖住这个类」。
            </p>
        </figure>
    );
};

ReferenceLab.propTypes = {
    /** Shown next to the "互动" badge. */
    caption: PropTypes.string,
};

export default ReferenceLab;
