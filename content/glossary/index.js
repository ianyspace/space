/**
 * 术语库总入口：把所有领域的词条合并成一张「归一化 key → 词条」的表。
 *
 * 归一化 = 去首尾空格 + 转小写 + 去掉所有空白，所以 `GC Roots` / `gc roots` /
 * `GCroots` 是同一个词条。正文里 `<term>GC Roots</term>` 和 `<term>gcRoots</term>`
 * 都能命中，不用作者记写法。
 *
 * 术语库按领域分文件（`./jvm.js`、`./mysql.js`，以后要加别的领域就再开一个），但查找时不区分
 * 领域 —— 一篇文章里出现的词基本都在同一个领域，真撞名了再让作者用
 * `<term k="…">` 显式指定。撞名时这里会覆盖并打一条 warning。
 */
import jvm from './jvm';
import mysql from './mysql';

/** `' GC  Roots '` -> `'gcroots'` */
export function normalize(value) {
    return String(value == null ? '' : value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
}

const DOMAINS = { jvm, mysql };

const glossary = {};

Object.entries(DOMAINS).forEach(([domain, entries]) => {
    Object.entries(entries).forEach(([key, entry]) => {
        const id = normalize(key);

        if (glossary[id] && glossary[id].domain !== domain) {
            console.warn(
                `[glossary] 「${key}」在 ${domain} 与 ${glossary[id].domain} 重复，后者覆盖前者`,
            );
        }

        glossary[id] = { ...entry, term: entry.term || key, domain };
    });
});

export default glossary;
