import BPlusTreeLab from './BPlusTreeLab';
import MySqlArchFigure from './MySqlArchFigure';
import BackTableFigure from './BackTableFigure';
import MvccFigure from './MvccFigure';
import LogTimelineFigure from './LogTimelineFigure';

/**
 * MDX components used by *this* article only.
 *
 * Every key is a tag that can be written directly in `index.mdx` of this
 * folder, eg. `<b-plus-tree-lab caption="..."></b-plus-tree-lab>`.
 */
export default {
    'b-plus-tree-lab': BPlusTreeLab,
    'sql-arch-figure': MySqlArchFigure,
    'backtable-figure': BackTableFigure,
    'mvcc-figure': MvccFigure,
    'log-figure': LogTimelineFigure,
};
