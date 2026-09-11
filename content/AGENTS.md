# 写作约定

> 给 AI 助手看的写作说明，也是我自己的备忘。
> 只讲 `content/` 里的文章怎么写，读完这一份就够。

## 写作要求

文章是给人看的，动笔前先记住三点：

- **简洁**：一段只讲一件事，不写套话；能一句话说清就不写三段，能列点就不写长段落。
- **清晰**：先结论后细节；用 `##` / `###` 分好层次（不要跳级）；术语前后统一；
  代码示例写清语言、给足上下文，别只有半截片段。
- **美观**：标题、段落、列表、代码块交替出现，避免一屏幕纯文字；该配图就配图，
  表格和公式按需使用；代码块保留必要的空行，别一次贴一整屏。

## 1. 一篇文章 = 一个文件夹

```
content/blog/articleName/      ← 目录名用驼峰，决定文章 URL
├── index.mdx                  ← 正文（MDX，中文），必需
├── index.en.mdx               ← 英文正文，可选
├── images/                    ← 文章图片
│   └── step-1.png
├── cover.svg                  ← 封面，可选
└── components/                ← 这篇文章的组件，可选
```

- 目录名用**驼峰**：`bPlusTree`、`createMyReact`、`articleName`；URL 就是 `/space/bPlusTree/`。
- 只有 `index.mdx`（中文）和 `index.en.mdx`（英文）会被当成正文。
- 想快速开始：复制 `content/template/`（和本文件同级），改掉目录名即可。

## 2. frontmatter（文件开头的 `---` 区块）

```yaml
---
title: 文章标题
date: "2024-03-21"
description: 一句话摘要，会显示在文章列表里（不写就自动截取正文开头）
tags: ['css', 'react']
disqus: true # 是否显示评论（Valine）
relative: false # 是否在文末显示「相关文章」
cover: /blog/articleName/cover.svg # 封面，可省略
---
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 标题，不写时用目录名 |
| `date` | `"YYYY-MM-DD"` | 必需，用于排序，**一定要加引号** |
| `description` | string | 列表里的摘要 |
| `tags` | string[] | 标签，会自动生成标签页链接 |
| `disqus` | bool | 显示评论区 |
| `relative` | bool | 文末显示相关文章（同标签） |
| `private` | bool | 加密文章，见 §5 |
| `question` | string | 加密文章的提示问题（配合 `private`） |
| `password` | string | 加密文章的答案（配合 `private`） |
| `cover` | string | 封面路径，不写就用默认兜底图 |

封面只写 `/blog/<目录名>/cover.svg`，不要带 `/space` 前缀；不写就用默认兜底图。

## 3. 正文（MDX）

正文就是 MDX：常规 Markdown（表格、任务列表、引用、代码块、脚注）和内联 HTML 都能直接写。
标题从 `##` 开始，`##`/`###` 会自动进右侧目录；需要交互或复杂样式时写成组件（见 §4），正文里当标签用即可。

图片放在同目录 `images/` 下，用相对路径引用，构建时会自动发布：

```md
![图片说明](images/step-1.png)
```

图床等外链（`https://…`）也可以。

### 代码块

围栏后**一定要写语言名**（`js` / `bash` / `json` …），否则整块不会有语法高亮。
想高亮其中的某些行，把行号写在语言名后面：

- `js {9}` → 只高亮第 9 行
- `js {1,3-5}` → 高亮第 1、3、4、5 行
- `js {3-6, 8-10}` → 高亮第 3~6 行和第 8~10 行

被高亮的行会显示深蓝底 + 粉色左边框。写成 `js{1,3}`（花括号前没空格）也能识别。

> HTML 块（比如 `<details>` / `<summary>`）内部不要留空行：后面缩进的 HTML 会被当成代码块显示出来。

数学公式用 LaTeX。行内写 `$O(\log n)$`；行间公式让两个 `$$` 各自独占一行（前后各空一行，写在列表里就缩进两格）：

```md
$$
h \le \log_{\lceil m/2 \rceil} n
$$
```

显示普通的 `$` 符号时写成 `\$`。

## 4. 组件

文章自己的组件放在这篇文章的 `components/` 里，用 `components/index.js` 导出「标签名 → 组件」的映射：

```js
// content/blog/articleName/components/index.js
import MyWidget from './MyWidget';

export default {
    'my-widget': MyWidget, // 正文里就写 <my-widget></my-widget>
};
```

组件样式写在同一目录，命名 `MyWidget.module.scss`，组件里 `import styles from './MyWidget.module.scss'`
后用 `styles.xxx` 引用类名（带短横线的用 `styles['my-item']`）。

多篇文章都要用的组件放到 `content/components/`，写法一样。

（新增或删掉组件文件后，重启一次 `npm run dev`。）

## 5. 加密文章

```yaml
private: true
question: 提示问题？
password: 答案
```
