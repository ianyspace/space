### 目标
将 `content/blog/javaConcurrentment/index.mdx` 第 68–91 行的 ASCII 线程状态转换字符画，替换为一个交互式 SVG 组件 `<thread-state-figure>`（完整交互：点击查看 + 生命周期动画播放），仅改这一处图。

### 参照
沿用 `content/blog/mysql/components/BPlusTreeLab.js` 的既有模式：函数组件 + hooks、手写 SVG + CSS transition（零新依赖）、CSS 变量 + `:global(body.dark)` 暗色适配、650px 响应式断点。

### 新增文件
1. **`content/blog/javaConcurrentment/components/ThreadStateFigure.js`**
   - SVG 状态图：6 个状态节点（NEW 灰 / RUNNABLE 绿 / BLOCKED 橙 / WAITING 蓝 / TIMED_WAITING 紫 / TERMINATED 红）+ 带标签的转换箭头。
   - 点击节点 → 高亮该节点与相关箭头，下方面板显示该状态的说明、进入方式、唤醒方式（内容提炼自文中现有表格）。
   - 「播放线程一生」：预置步骤数组（start → RUNNABLE → BLOCKED → RUNNABLE → WAITING → RUNNABLE → TIMED_WAITING → RUNNABLE → TERMINATED），小圆点沿箭头移动 + 当前节点点亮 + 底部字幕；控制条含播放/暂停、上一步/下一步、速度切换（SPEEDS 数组 + setTimeout）。
   - `useId` 生成 SVG marker 唯一 id。
2. **`content/blog/javaConcurrentment/components/ThreadStateFigure.module.scss`**
   - 根类定义 `--tsf-*` 变量，`:global(body.dark)` 覆盖暗色值，SVG 内全用 `var()` 取色；transition 做高亮与圆点移动；`max-width: 650px` 断点；短横线类名用 `styles['xxx-yyy']`。
3. **`content/blog/javaConcurrentment/components/index.js`**
   - `export default { 'thread-state-figure': ThreadStateFigure };`

### 修改文件
- `content/blog/javaConcurrentment/index.mdx`：ASCII 代码块替换为 `<thread-state-figure></thread-state-figure>`；下方 6 状态说明表格保留。

### 验证
1. `npm run gen:articles`（新增 components 目录，必须重跑）；
2. `npm run lint`；
3. `npm run dev` 目检：亮/暗主题配色、点击面板、播放动画全流程、窄屏缩放。