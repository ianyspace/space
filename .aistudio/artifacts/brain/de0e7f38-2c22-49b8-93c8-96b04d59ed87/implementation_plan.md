# 文章正文交互增强（代码复制、阅读进度与图片灯箱）

在不改动全局导航与站点结构的前提下，针对文章详情页（`BlogPost`）新增三项核心阅读交互能力：**代码块语言角标与一键复制**、**顶部阅读进度条与快速回到顶部**、以及**正文图片全屏灯箱放大预览**。

## User Review & Critical Decisions

> [!IMPORTANT]
> 以下设计严格遵循你在问答中确认的偏好：所有新增交互仅在文章阅读页生效，不增加全局导航入口，视觉上沿用站点现有的极简玫红（`--textLink` / `--pink`）与深浅色主题体系。

- **Confirmed Decision 1（核心功能范围）**：实现代码块一键复制（含语言标识与「已复制」状态反馈）、文章阅读进度条（含回到顶部按钮）、正文配图点击放大预览（Lightbox）。
- **Confirmed Decision 2（视觉与入口方式）**：仅在文章详情页内部挂载增强交互，不修改顶部导航栏或主页简介区。

## 1. Overview & Core Concept

- **What It Does**：
  1. **代码块工具栏**：自动识别文章中所有代码块（`pre[class*="language-"]`）的编程语言，在代码块右上角展示语言名称与「复制」按钮，点击后将纯文本代码写入剪贴板并给出「✓ 已复制」即时反馈。
  2. **阅读进度条与回到顶部**：监听文章滚动容器（`#main-contain`）的滚动位置，在页面顶部渲染一条 2.5px 的平滑阅读进度条；当向下滚动超过一屏时，右下角浮现克制的回到顶部按钮。
  3. **正文图片灯箱（Lightbox）**：为正文（`.css-post`）中的所有图片绑定放大查看能力，点击图片弹出全屏毛玻璃灯箱，支持点击切换缩放比例、显示图片说明文字（`alt`），以及按 `Esc` 或点击背景关闭。
- **Target Audience / Persona**：阅读深度技术长文（MySQL、JVM、Java 并发、React 等）的读者，需要复制示例代码验证、查看复杂架构大图细节，并在长文阅读中掌握当前进度。
- **Key Value**：显著提升技术长文的可读性与操作效率，同时保持原有的干净排版与纯静态导出（`output: 'export'`）兼容性。

## 2. User Experience & Visual Design

- **Key User Flows**：
  - **复制代码**：读者浏览到任意代码块 → 右上角常驻半透明语言标签与「复制」按钮（悬停代码块时清晰度提升）→ 点击「复制」→ 按钮变为玫红色「✓ 已复制」，1.8 秒后恢复，且横向滚动长代码时按钮固定在右上角不随代码滚走。
  - **查看阅读进度与回到顶部**：读者在文章页向下滚动 → 视口顶部的细线进度条通过 `transform: scaleX()` 实时延伸 → 滚动超过 360px 后右下角出现回到顶部按钮 → 点击平滑滚动回文章开头。
  - **放大预览配图**：读者将鼠标悬停在正文配图上（光标变为 `zoom-in`）→ 点击图片 → 弹出全屏深色半透明灯箱展示原图与底部图片说明 → 再次点击图片可在适应屏幕与 1.6× 放大之间切换，按 `Esc` 键或点击关闭按钮退出。
- **Visual Identity & Theme**：
  - *Aesthetic Direction*：克制、编辑感（Editorial & Utilitarian），完全融入现有博客卡片与代码块深色背景（`#011627`）。
  - *Color Palette & Mood*：复用站点 CSS 变量（`--textLink`、`--pink`、`--bg`、`--hr`、`--textNormal`），自动适配浅色（`body.light`）与深色（`body.dark`）主题，以及中英文（`zh-hans` / `en`）界面文案。
  - *Typography & Hierarchy*：代码块角标采用等宽字体（`Consolas, Menlo, monospace`），字号 `12px`，保持单行不换行（`white-space: nowrap`）。
- **Interactive Feedback & Motion**：
  - 进度条仅使用合成器属性 `transform: scaleX()`，保证 60fps 零布局抖动。
  - 灯箱开关与按钮悬停反馈控制在 `150ms–200ms`（`cubic-bezier(0.16, 1, 0.3, 1)`），并在開啟灯箱时锁定背景滚动。

## 3. Key Product Decisions & Trade-Offs

- **Decision 1：基于 `#main-contain` 容器计算阅读进度**
  - *Chosen Approach*：直接监听 `#main-contain` 元素的 `scroll` 事件与 `ResizeObserver` 计算进度百分比。
  - *Why*：本项目的滚动发生在 `height: 100vh; overflow: auto` 的 `#main-contain` 容器内而非 `window`，直接绑定 `#main-contain` 才能准确获取文章滚动高度（包括展开 `问答实战` `<details>` 或图片加载后的高度变化）。
  - *Alternatives Considered*：监听 `window.scrollY` 在当前布局下恒为 `0`，无法工作。
- **Decision 2：代码块横向滚动与右上角固定工具栏解耦**
  - *Chosen Approach*：将 `.gatsby-highlight` 设为 `position: relative` 定位上下文，内部 `pre` 独立承担横向滚动，使右上角的语言标识与「复制」按钮始终固定在代码块可视区域右上角。
  - *Why*：避免宽代码横向滚动时复制按钮被滚出视野，或者被隐藏在最右侧需要滑到底才能点到。

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**：

```
┌───────────────────────────────────────────────────────────────────┐
│                    BlogPostTemplate (文章详情页)                   │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │的正文容器 (.css-post)                                        │  │
│  │  • MDXRemote 渲染正文、代码块 (.gatsby-highlight) 与配图 (img) │  │
│  └──────────────┬─────────────────────────────┬────────────────┘  │
│                 │                             │                   │
│                 ▼                             ▼                   │
│  ┌──────────────────────────────┐  ┌───────────────────────────┐  │
│  │ CodeBlockEnhancer (代码增强)  │  │ ImageLightbox (图片灯箱)   │  │
│  │ • 解析 language-* 类名        │  │ • 代理监听 .css-post img   │  │
│  │ • 注入固定右上角语言+复制栏   │  │ • 全屏弹窗 + 缩放 + Esc关闭│  │
│  │ • navigator.clipboard 写入   │  │ • 自动读取 alt 作为图注    │  │
│  └──────────────────────────────┘  └───────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ ReadingProgress (阅读进度与回到顶部)                         │  │
│  │ • 监听 #main-contain 滚动与正文高度变化                      │  │
│  │ • 顶部 scaleX 进度条 + 右下角平滑回到顶部按钮                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**：
  - **纯客户端无状态/轻量状态**：无需后端或外部依赖，状态包括当前滚动进度 `progress`（`0`–`1`）、是否显示回到顶部按钮 `showBackToTop`（`scrollTop > 360`）、当前激活预览的图片信息 `{ src, alt, zoomed }`，以及各代码块的复制状态定时器。
  - **多语言支持**：在中英文语言包中补充「复制 / 已复制 / 回到顶部 / 关闭预览」等词条，自动跟随文章语言切换。
- **Interactive Component & State Mapping**：
  - **代码块一键复制**：在文章挂载及更新后扫描 `.css-post .gatsby-highlight`，提取 `pre` 的 `language-*` 名称（忽略 `plaintext`），挂载复制按钮；点击时读取 `code.innerText`，调用 `navigator.clipboard.writeText`（带 `textarea` 降级兜底），切换为已复制状态并在 1.8 秒后复位。
  - **阅读进度条**：通过 `requestAnimationFrame` 节流同步 `#main-contain` 的 `scrollTop / (scrollHeight - clientHeight)`；点击「回到顶部」按钮时调用 `contain.scrollTo({ top: 0, behavior: 'smooth' })`。
  - **图片放大预览**：通过事件委托监听 `.css-post` 内的 `<img>` 点击事件，打开灯箱浮层；支持点击图片切换 `1x` / `1.6x` 缩放，点击遮罩、关闭按钮或按 `Escape` 键关闭灯箱并恢复焦点。
