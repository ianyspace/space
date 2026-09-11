# 写作约定

> **给 AI 助手看的规范，也是我自己写文章时的备忘。**
> 只描述「在 `content/` 里写文章」这一件事，读完这个文件即可动手，**不需要扫描整个项目**。
> 项目其它部分（页面模板、构建脚本）与写文章无关，不用管。

## 1. 一篇文章 = 一个文件夹

```
content/blog/my-post/          ← 目录名建议用英文短横线，它决定了文章 URL
├── index.mdx                  ← 正文（默认语言：简体中文），必需
├── index.en.mdx               ← 英文正文，可选（需要中英双语时才建）
├── images/                    ← 文章自己的图片
│   └── step-1.png
├── cover.svg                  ← 封面，可选
└── components/                ← 这篇文章专用的小组件，可选
    ├── index.js               ← 唯一入口：导出 { '标签名': 组件 }
    ├── MyWidget.js
    └── MyWidget.module.scss
```

- 目录名就是 URL：`content/blog/my-post/` → `/space/my-post/`。
- `content/blog/` 下**每个文件夹都会当成一篇文章**，只认 `index.mdx` 和 `index.en.mdx`；文件夹里的其它文件不会被当作文章，但也不要乱放。
- 所有文章共享的组件放在 `content/components/`（见 §5）。
- 想快速开始：直接复制 `content/template/` 这个文件夹（它和本文件 `AGENTS.md` 同级），改目录名即可。

## 2. frontmatter（文件开头的 `---` 区块）

```yaml
---
title: 文章标题
date: "2024-03-21"
description: 一句话摘要，会显示在文章列表里（不写就自动截取正文开头）
tags: ['css', 'react']
disqus: true # 是否显示评论（Valine）
relative: false # 是否在文末显示「相关文章」
cover: /blog/my-post/cover.svg # 封面，可省略
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
| `private` | bool | 加密文章，见 §6 |
| `question` | string | 加密文章的提示问题（配合 `private`） |
| `password` | string | 加密文章的答案（配合 `private`） |
| `cover` | string | 封面路径，不写就用默认兜底图 |

**封面路径只写 `/blog/<目录名>/cover.svg`，不要带 `/space` 前缀**（部署前缀由代码自动补）。
个别文章（例如个人简历）故意不写 `cover`，列表里会显示默认兜底图。

## 3. 正文：Markdown + 内联 HTML

正文按 **Markdown（GFM）+ 原生 HTML** 解析：

- ✅ 标题、列表、表格、任务列表、引用、代码块（\`\`\`js 会高亮）、脚注
- ✅ 内联 HTML，例如 `<div style="color:red">…</div>`
- ❌ **不能写 `import` / `export`**
- ❌ **不能写 JSX 表达式**，`{}` 只会原样显示成文本
- 标题从 `##` 开始（页面自己渲染 `h1` 大标题）；`##`/`###` 会自动生成右侧目录

需要交互、状态或复杂样式时 → 写成组件放进 `components/`（§5）。

### 图片

```md
![图片说明](images/step-1.png)
```

- 本地图片放在同目录的 `images/` 下，用 `images/xxx.png` 相对路径引用。
- 构建时会自动把 `images/`、`cover.svg` 拷到 `public/blog/<目录名>/`，**不需要**（也不要）手动往 `public/` 里放东西。
- 图床等外链图片（`https://…`）也支持。

## 4. 样式：只写 CSS / SCSS

- 全站**不再使用 Less**，样式写 `.scss`（或 `.css`）。
- **组件的样式和组件放在同一个目录**，命名为 `Foo.module.scss`：

  ```js
  // content/blog/my-post/components/MyWidget.js
  import styles from './MyWidget.module.scss';

  const MyWidget = () => <div className={styles.wrap}>…</div>;
  export default MyWidget;
  ```

  ```scss
  /* content/blog/my-post/components/MyWidget.module.scss */
  .wrap {
      display: flex;
      gap: 8px;
  }
  ```

- 类名**照抄选择器名字**引用；带短横线的用中括号：`styles['my-item']`（不要写成 `styles.myItem`）。
- 需要主题配色时直接用现成的 CSS 变量：`var(--textNormal)`、`var(--bg-article)`、`var(--tag-bg)`、`var(--hr)` 等。
- 组件样式**不要**写进 `styles/`：那里的样式是全局的，而且 Next.js 只允许 `pages/_app.js` 导入全局样式，组件自己 import 会直接构建失败。
- 只有当样式要作用于「不是 React 渲染出来的 DOM」（例如 Mapbox 弹窗、markdown 生成的代码块）或多个组件共用时，才放进 `styles/`。

## 5. 组件注册

**文章专用组件**（推荐）：

```
content/blog/my-post/components/
├── index.js        ← export default { 'my-widget': MyWidget };
├── MyWidget.js
└── MyWidget.module.scss
```

**所有文章共享的组件**：放在 `content/components/`，并在 `content/components/index.js` 里注册。

两条规则：

1. **标签名必须小写短横线**，且与注册的 key 完全一致：正文写 `<my-widget></my-widget>`。
   （`<MyWidget>` 会被 HTML 解析器降级成 `mywidget`，从而静默渲染成一个空标签。）
2. **新增或删除组件后要重启 `npm run dev`**：组件注册表是构建时生成的文件。

## 6. 加密文章

```yaml
private: true
question: 提示问题？ # 显示给读者的提问
password: 答案 # 读者答对才显示正文
```

三者配合使用；答案只是简单校验，别放真正敏感的内容。

## 7. 预览、构建、发布

在**项目根目录**（`content` 的上一级，也就是放 `package.json` 的地方）执行：

```bash
npm run dev     # 本地预览：http://localhost:3000/space/
npm run build   # 生成静态站点到 out/
```

> 如果 VS Code 里只打开了 `content/` 文件夹，需要先打开项目根目录才能执行上面两条命令。

发布：提交并推送到 `master`，GitHub Actions 会自动构建部署到 <https://ianyspace.github.io/space/>。

## 8. 写完自查

- [ ] 目录名是英文短横线，且没和已有文章重名
- [ ] `date` 带引号，格式 `"YYYY-MM-DD"`
- [ ] 图片放在 `images/` 并用相对路径引用；没有手动改过 `public/blog/`
- [ ] 新增组件后重启过 `npm run dev`，标签名是小写短横线
- [ ] 组件样式写在同目录的 `Foo.module.scss` 里，没有新增 Less 文件
- [ ] 本地 `npm run dev` 看过一遍：列表、正文、图片、组件都正常
