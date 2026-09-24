import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Jvm.module.scss';

/**
 * Interactive: where does *this* object end up?
 *
 * The promotion rules are four separate sentences (`-XX:MaxTenuringThreshold`,
 * `-XX:PretenureSizeThreshold`, 分配担保, TLAB) that each look trivial on their
 * own, and the confusion is always which one applies to the object in front of
 * you. Picking a scenario and watching one of the four destinations light up is
 * the only way to see that "大对象" and "Survivor 装不下" both land in the old
 * generation but for completely different reasons.
 */
const HOMES = [
    { key: 'eden', name: 'Eden', tone: 'accent' },
    { key: 'survivor', name: 'Survivor', tone: 'db' },
    { key: 'old', name: '老年代', tone: 'warn' },
    { key: 'gone', name: '已被回收', tone: 'bad' },
];

const CASES = [
    {
        label: '刚 new 出来的小对象',
        home: 'eden',
        path: ['new', 'Eden'],
        notes: { eden: '优先在 Eden 分配；有 TLAB 就先落在自己那块私有缓冲区里' },
        verdict: '落点：Eden',
        why: '新对象一律先往 Eden 放。TLAB 只是把 Eden 里的一小块划给线程私有，省掉并发分配时的同步 —— 落点没变，还是 Eden。',
    },
    {
        label: '活过 3 次 Minor GC',
        home: 'survivor',
        path: ['Eden', 'Minor GC ×3', 'S0 ↔ S1 辗转'],
        notes: { survivor: '每次 Minor GC 复制到另一块 Survivor，年龄 +1' },
        verdict: '落点：Survivor',
        why: '两块 Survivor 一样大，同一时刻只有一块装着存活对象 —— 这就是「标记-复制」要空着一半空间的代价，换来的是没有碎片。',
    },
    {
        label: '活过 15 次 Minor GC',
        home: 'old',
        path: ['Survivor', '年龄到 15', '老年代'],
        notes: { old: '年龄到 -XX:MaxTenuringThreshold（默认 15）就晋升' },
        verdict: '落点：老年代',
        why: '这个 15 不是调优调出来的平衡点：对象头里记年龄的字段只有 4 bit，最大只能存到 15，想往上调也调不了。',
    },
    {
        label: '一个 200MB 的大数组',
        home: 'old',
        path: ['new 200MB', '超过 PretenureSizeThreshold', '老年代'],
        notes: { old: '大对象直接进老年代，跳过 Survivor' },
        verdict: '落点：老年代（直接分配）',
        why: '大对象在 Survivor 之间来回拷贝代价太高，索性直接放老年代。代价是它很快把老年代填满，所以大对象多的应用要格外留意 Full GC。',
    },
    {
        label: '存活对象太多，Survivor 装不下',
        home: 'old',
        path: ['Eden 满', 'Minor GC', 'Survivor 放不下', '老年代'],
        notes: { old: '放不下的那部分直接进老年代（分配担保）' },
        verdict: '落点：老年代（分配担保）',
        why: 'Survivor 太小会让对象提前晋升，老年代很快堆满、Full GC 变频繁 —— 这就是「Young GC 变长」时该去看 SurvivorRatio 的原因。',
    },
    {
        label: 'Minor GC 时已经没人引用',
        home: 'gone',
        path: ['Eden', 'Minor GC', '不可达', '回收'],
        notes: { gone: 'Eden 里绝大多数对象活不过第一次 Minor GC' },
        verdict: '落点：直接回收',
        why: '新生代用「标记-复制」还很快，就是因为真正要复制的只有极少数：大部分对象第一次 GC 就被清掉，复制开销可以忽略。',
    },
];

const PromoteLab = function ({ caption = '' }) {
    const [index, setIndex] = useState(0);
    const current = CASES[index];

    return (
        <figure className={styles.lab}>
            <div className={styles['lab-head']}>
                <span className={styles['lab-badge']}>互动</span>
                <span className={styles['lab-caption']}>
                    {caption || '点一种对象，看它最后落在堆的哪一块'}
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

            <div className={styles['lab-path']}>
                {current.path.map((step, i) => (
                    <React.Fragment key={step}>
                        {i > 0 ? <span className={styles['lab-path-arrow']}>→</span> : null}
                        <span
                            className={`${styles['lab-path-step']} ${
                                i === current.path.length - 1 ? styles['is-last'] : ''
                            }`}
                        >
                            {step}
                        </span>
                    </React.Fragment>
                ))}
            </div>

            <div className={styles['lab-cards']}>
                {HOMES.map((home) => {
                    const active = home.key === current.home;
                    return (
                        <div
                            key={home.key}
                            className={`${styles['lab-card']} ${
                                active ? styles[`is-${home.tone}`] : styles['is-muted']
                            }`}
                        >
                            <span className={styles['lab-card-name']}>{home.name}</span>
                            <span className={styles['lab-card-state']}>
                                {active ? '✓ 就落这儿' : '— 不在这儿'}
                            </span>
                            <span className={styles['lab-card-hint']}>
                                {active ? current.notes[home.key] : ''}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className={styles['lab-verdict']}>
                <span className={styles['lab-verdict-tag']}>{current.verdict}</span>
                <span className={styles['lab-verdict-text']}>{current.why}</span>
            </div>

            <p className={styles['lab-note']}>
                一句话规则：先试 Eden（TLAB）→ 每次 Minor GC 在 S0 / S1 之间复制、年龄 +1 →
                到 15 岁、或者对象太大、或者 Survivor 装不下，就去老年代。
                前两条是常规路径，后两条是「提前晋升」，它们才是老年代莫名涨得快时该查的地方。
            </p>
        </figure>
    );
};

PromoteLab.propTypes = {
    /** Shown next to the "互动" badge. */
    caption: PropTypes.string,
};

export default PromoteLab;
