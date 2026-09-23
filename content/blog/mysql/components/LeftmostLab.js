import React, { useState } from 'react';
import PropTypes from 'prop-types';

import styles from './Mysql.module.scss';

/**
 * Interactive: which columns of the composite index `(a, b, c)` does a given
 * WHERE actually use?
 *
 * The rule ("start from the leftmost column, stop at the first gap") is one
 * sentence, but the eight combinations it produces are not something a static
 * picture can show at once. So the reader picks a predicate and the three
 * columns re-colour in place, which is also the only way to see that
 * `a = 1 AND c = 3` and `a = 1 AND b = 2` end up in very different places.
 */
const COLUMNS = ['a', 'b', 'c'];

/** How a single column of the index takes part in the access path. */
const ROLE = {
    eq: { label: '等值定位 ✓', hint: '等值条件，索引能直接定位到这一段。' },
    range: { label: '范围定位 ~', hint: '范围条件，用到它，但从这里往后索引不再完全有序。' },
    sort: { label: '用于排序 ✓', hint: '不参与定位，但排序可以直接用索引顺序，省掉 filesort。' },
    blocked: { label: '被挡住 ✗', hint: '条件写了，可用不上。' },
    skip: { label: '没用上', hint: 'WHERE 里没有这一列。' },
};

const CASES = [
    {
        sql: 'WHERE a = 1',
        roles: ['eq', 'skip', 'skip'],
        notes: ['a = 1 是一段连续区间，直接定位过去', null, null],
        verdict: '用到 a',
        why: '联合索引先按 a 排序，a = 1 落在树上连续的一段，定位过去顺着扫就是结果。b、c 没写条件，自然不参与。',
    },
    {
        sql: 'WHERE a = 1 AND b = 2',
        roles: ['eq', 'eq', 'skip'],
        notes: ['先收窄到 a = 1 的那一段', 'a 相同的前提下 b 才有序，继续收窄', null],
        verdict: '用到 a、b',
        why: '等值条件可以层层叠加：a 定位到一段，b 在这一段里再定位到一小截，需要扫的行数更少。',
    },
    {
        sql: 'WHERE a = 1 AND b = 2 AND c = 3',
        roles: ['eq', 'eq', 'eq'],
        notes: ['定位到 a = 1 的那一段', '再收窄到 b = 2', '再收窄到 c = 3，一步到位'],
        verdict: '三列全部命中',
        why: '一路等值到底，直接落到最精确的位置。这是联合索引最理想的用法。',
    },
    {
        sql: 'WHERE b = 2',
        roles: ['skip', 'blocked', 'skip'],
        notes: [null, '条件写了，可用不上', null],
        verdict: '一列都没用到',
        why: '缺了最左列 a。索引里只有 a 相同的那一小段中 b 才是有序的，放到整棵树上看 b 是乱的，没法拿它去二分。',
    },
    {
        sql: 'WHERE b = 2 AND c = 3',
        roles: ['skip', 'blocked', 'blocked'],
        notes: [null, '条件写了，可用不上', '同上：b 断了，c 也接不上'],
        verdict: '一列都没用到',
        why: 'b、c 的有序性都建立在 a 之上，最左列缺席，后面整条链都塌了。',
    },
    {
        sql: 'WHERE a = 1 AND c = 3',
        roles: ['eq', 'skip', 'blocked'],
        notes: ['定位到 a = 1 的那一段', '这里没写条件 —— 链条就是从这儿断的', '条件写了，但接不上'],
        verdict: '只用到 a',
        why: 'a 等值把范围收窄了，但 b 没有条件，而索引里 c 的顺序是建立在 b 之上的，中间空了一环，c 就用不上，只能等回表之后再过滤。',
    },
    {
        sql: 'WHERE a = 1 ORDER BY b',
        roles: ['eq', 'sort', 'skip'],
        notes: ['定位到 a = 1 的那一段', '不参与定位，但这一段里 b 天然有序', null],
        verdict: '用到 a，b 用来排序',
        why: 'a 等值之后，这一段里的记录就是按 b 排好的，排序可以直接顺着索引读，不用额外 filesort。这就是「排序也用上了索引」。',
    },
    {
        sql: 'WHERE a = 1 AND b > 5 AND c = 3',
        roles: ['eq', 'range', 'blocked'],
        notes: ['定位到 a = 1 的那一段', 'b > 5 是范围，用到它，但后面不再有序', '条件写了，断在范围上'],
        verdict: '用到 a、b，c 断在范围上',
        why: '范围条件之后 b 不再是一个确定值，c 的顺序也就无从谈起。MySQL 8.0 可能用索引下推（ICP）在引擎层拿 c 做过滤，但那只是过滤，不是定位。',
    },
];

const LeftmostLab = function ({ caption = '' }) {
    const [index, setIndex] = useState(0);
    const current = CASES[index];

    return (
        <figure className={styles.lab}>
            <div className={styles['lab-head']}>
                <span className={styles['lab-badge']}>互动</span>
                <span className={styles['lab-caption']}>
                    {caption || '联合索引 KEY (a, b, c)：点一条条件，看索引用上了哪几列'}
                </span>
            </div>

            <div className={styles['lab-toolbar']}>
                {CASES.map((item, i) => (
                    <button
                        key={item.sql}
                        type="button"
                        className={`${styles['lab-btn']} ${i === index ? styles['is-active'] : ''}`}
                        onClick={() => setIndex(i)}
                    >
                        {item.sql}
                    </button>
                ))}
            </div>

            <div className={styles['lab-cards']}>
                {COLUMNS.map((column, i) => {
                    const role = current.roles[i];
                    return (
                        <div key={column} className={`${styles['lab-card']} ${styles[`is-${role}`]}`}>
                            <span className={styles['lab-card-name']}>{column}</span>
                            <span className={styles['lab-card-state']}>{ROLE[role].label}</span>
                            <span className={styles['lab-card-hint']}>{current.notes[i] || ROLE[role].hint}</span>
                        </div>
                    );
                })}
            </div>

            <div className={styles['lab-verdict']}>
                <span className={styles['lab-verdict-tag']}>{current.verdict}</span>
                <span className={styles['lab-verdict-text']}>{current.why}</span>
            </div>

            <p className={styles['lab-note']}>
                一句话规则：从最左列开始连续匹配，遇到「缺列」或者「范围条件」就断在那儿，后面的列最多只能等回表之后再过滤。
                MySQL 8.0 还有 Index Skip Scan，某些缺最左列的场景也能部分用上索引，但那是优化器的兜底，不能当成建索引的依据。
            </p>
        </figure>
    );
};

LeftmostLab.propTypes = {
    /** Shown next to the "互动" badge. */
    caption: PropTypes.string,
};

export default LeftmostLab;
