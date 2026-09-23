import ArchFigure from './ArchFigure';
import IndexFigure from './IndexFigure';
import IsolationFigure from './IsolationFigure';
import MvccFigure from './MvccFigure';
import RedoRingFigure from './RedoRingFigure';
import CommitFigure from './CommitFigure';
import LeftmostLab from './LeftmostLab';
import LockLab from './LockLab';

/**
 * MDX components used by *this* article only.
 *
 * Every key is a tag that can be written directly in `index.mdx` of this
 * folder, eg. `<arch-figure caption="..."></arch-figure>`.
 *
 * 图示（静态）用在「一图胜千言」的地方：分层结构、索引的两种叶子、三条并发
 * 时序、版本链的走查、两阶段提交的崩溃点。互动（动态）只用在静态图画不全的
 * 地方：最左前缀的八种组合、加锁范围的区间端点。其余概念交给表格和列表，
 * 不给简单的东西套壳。
 */
export default {
    'arch-figure': ArchFigure,
    'index-figure': IndexFigure,
    'isolation-figure': IsolationFigure,
    'mvcc-figure': MvccFigure,
    'redo-ring-figure': RedoRingFigure,
    'commit-figure': CommitFigure,
    'leftmost-lab': LeftmostLab,
    'lock-lab': LockLab,
};
