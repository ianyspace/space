# space — 项目约定

个人博客（Next.js 15 Pages Router + Sass + MDX），**仓库根目录即项目**，
构建为静态导出后发布到 GitHub Pages 项目页：https://ianyspace.github.io/space/

## 任务入口（先按这里读，不要全仓扫描）

| 要做的事 | 直接读 |
| --- | --- |
| 写 / 改 `content/` 下的文章 | `content/AGENTS.md` —— 写作约定的唯一来源 |
| 改样式 | 组件同目录的 `Foo.module.scss`；全局样式在 `styles/*.scss` |
| 改地图页 | `lib/map-space/`、`pages/map-space/` |
| 部署问题 | `.github/workflows/deploy.yml`、`next.config.js`、`config/index.js` |

## 关键约定

- **样式**：全局样式**只能**由 `pages/_app.js` 导入（Next pages router 限制）；
  组件样式与组件同目录 `Foo.module.scss` + `import styles from './Foo.module.scss'`；
  kebab-case 类名必须写 `styles['foo-bar']`（`exportLocalsConvention: 'asIs'`）；
  CSS module 里穿透主题要写 `:global(body.dark) .foo`。
- **basePath**：`config/index.js` 的 `site.pathPrefix = '/space'` 是唯一来源（next.config.js 读它）。
  `next/link`、`next/image`、`_next/*` 之外的所有绝对路径（`<img src>`、`background-image`、
  fetch 静态资源、脚本）都必须走 `utils/basePath.js` 的 `withBasePath()`。
- **路由**：`pages/[...slug].js` 的 `getStaticPaths` 必须是 `fallback: false`。
- **文章组件**：MDX 里标签名必须小写带短横线（`<my-widget>`）；
  只有**新增 / 删除** `content/blog/*/components/index.js` 时才需要重跑
  `npm run gen:articles`（重启 `npm run dev` 也行），在已有 `components/` 里加文件靠 HMR 即可。
- `.gitignore` 只忽略 `/.next/` 和 `/out/`，**不要**忽略 `public/`。

## 常用命令

- `npm run dev` — 本地开发（会先跑 `gen:articles`）
- `npm run build` — 构建，产物在 `out/`
- `npm run gen:articles` — 重新生成文章组件注册表 `lib/generated/articleComponents.js`
- `npm run lint` — ESLint
