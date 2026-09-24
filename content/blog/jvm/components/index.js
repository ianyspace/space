import MemoryFigure from './MemoryFigure';
import HeapFigure from './HeapFigure';
import LoaderFigure from './LoaderFigure';
import GcRootsFigure from './GcRootsFigure';
import TriColorFigure from './TriColorFigure';
import CmsFigure from './CmsFigure';
import G1Figure from './G1Figure';
import PromoteLab from './PromoteLab';
import ReferenceLab from './ReferenceLab';

/**
 * MDX components used by *this* article only.
 *
 * Every key is a tag that can be written directly in `index.mdx` of this
 * folder, eg. `<memory-figure caption="..."></memory-figure>`.
 *
 * 图示（静态）用在「一图胜千言」的地方：内存区域的归属、堆的分代与晋升、
 * 委派的方向、可达与不可达的对照、漏标的三步、CMS 的停顿分布、G1 的回收顺序。
 * 互动（动态）只用在静态图画不全的地方：一个对象会落在哪一块（四条规则互相抢）、
 * 四种引用在三种内存压力下的差别（软引用和弱引用只差一个触发条件）。
 * 其余概念交给表格和列表，不给简单的东西套壳。
 */
export default {
    'memory-figure': MemoryFigure,
    'heap-figure': HeapFigure,
    'loader-figure': LoaderFigure,
    'gc-roots-figure': GcRootsFigure,
    'tri-color-figure': TriColorFigure,
    'cms-figure': CmsFigure,
    'g1-figure': G1Figure,
    'promote-lab': PromoteLab,
    'reference-lab': ReferenceLab,
};
