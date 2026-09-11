# space

Next.js + MDX 重写的个人博客（原 `gatsby-simple-blog` / anyspace 的文章相关功能）。

## 技术栈

- **Next.js 15**（Pages Router）+ **JavaScript**
- **Sass**（Next 原生支持，无需自定义 webpack 配置）：全局样式 `styles/*.scss`，组件样式为同目录的 `Foo.module.scss`（CSS Modules）
- **MDX**：文章使用 `.mdx`，通过 `next-mdx-remote` + `remark`/`rehype` 渲染
- 样式与交互尽量与原 Gatsby 项目保持一致

## 目录结构

```
config/            站点与多语言配置（index.js、locales/）
content/           写作目录：AGENTS.md（写作规范）、template/（示例文章）、blog/（文章）、components/（共享 MDX 组件）
context/           LanguageContext（语言上下文）
lib/               文章读取、MDX 编译、TOC、路由数据；lib/map-space/ 地图数据与工具
components/        文章相关组件（Layout、Bio、PostAbbrev、Pagination、Tag…）+ 各自同目录的 *.module.scss
templates/         页面模板（BlogIndex、BlogPost、Tags、TagPage）
pages/             Next.js 路由（index.js、[...slug].js、404.js、map-space/、setting.js）
styles/            全局 Sass 样式（global、tricks、catalog、map-space、comments）+ typography
public/            静态资源与文章图片（/blog/<dir>/… 由构建生成、/map-space/、/live2d-*）
scripts/           typography CSS 与文章注册表/资源生成脚本
```

## 路由

| 路径 | 说明 |
| --- | --- |
| `/`、`/2/`、`/3/` | 中文文章列表（每页 5 篇） |
| `/en/`、`/en/2/` | 英文文章列表 |
| `/{dir}/`、`/en/{dir}/` | 文章详情 |
| `/tags/`、`/en/tags/` | 全部标签 |
| `/tags/{tag}/`、`/en/tags/{tag}/` | 标签文章列表 |
| `/map-space/` | Mapbox 地球，标注生活/旅行足迹 |

## 开发

```bash
npm install

# 配置环境变量（map-space 需要 Mapbox 公共 token）
cp .env.example .env.local   # 填入自己的 NEXT_PUBLIC_MAPBOX_TOKEN

npm run dev      # http://localhost:3000（会先生成 typography 与文章资源/组件注册表）
npm run build    # 生产构建
npm start

npm run gen:articles   # 仅重新生成文章资源与组件注册表，不启动服务
```

## 写文章：一篇文章一个文件夹

> 写文章前看 **`content/AGENTS.md`**（写作规范，含 frontmatter 全部字段、图片与组件写法、
> 样式约束、提交前自查清单）；起点模板是 **`content/template/`**，复制改目录名即可。

文章正文、图片、封面、专用组件全部放在同一个目录下，新增组件**不需要**再改其它文件：

```
content/blog/<dir>/
  index.mdx          默认语言正文
  index.en.mdx       英文正文（可选）
  images/**          正文图片，mdx 里写 `images/xxx.png`
  cover.svg          封面，frontmatter 写 `cover: /blog/<dir>/cover.svg`
  components/**      这篇文章专用的 MDX 组件（可选）
```

`components/index.js` 默认导出「标签名 → 组件」的映射，正文里直接写该标签即可：

```js
// content/blog/bPlusTree/components/index.js
import BPlusTreeDemo from './BPlusTreeDemo';

export default {
    'b-plus-tree-demo': BPlusTreeDemo,
};
```

```mdx
<b-plus-tree-demo order="3" keys="1,2,3,4,5,6,7,8"></b-plus-tree-demo>
```

多篇文章共用的小组件放在 `content/components/`，在 `content/components/index.js` 里注册
（key 同样是小写短横线的标签名），无需其它改动。

有两件事必须在构建前完成，由 `scripts/gen-article-registry.js` 自动处理（`dev` / `build` 会先跑，也可单独执行 `npm run gen:articles`）：

1. **组件注册表**：MDX 组件映射必须是静态 import（组件引用无法通过 `getStaticProps` 传递），所以扫描各文章的 `components/index.js` 生成 `lib/generated/articleComponents.js`。
2. **资源发布**：站点是静态导出，只有 `public/` 下的文件会被发布，所以把文章目录里的图片与封面复制到 `public/blog/<dir>/`。该目录是构建产物（已在 `.gitignore` 中忽略），**不要手工编辑**，否则下次生成会被覆盖。

注意：**新增或删除组件文件后需要重启 `npm run dev`**，因为注册表只在启动时生成一次。

## 样式约定

- 全局样式在 `styles/*.scss`，**只能**由 `pages/_app.js` 导入（Next 对全局样式导出的硬性限制），
  它们只服务于「非 React 渲染的 DOM」（markdown 生成的代码块、Mapbox 弹窗、Valine 评论）与主题变量。
- 组件样式一律与组件同目录：`Foo.module.scss`，组件内 `import styles from './Foo.module.scss'`
  后以 `styles.xxx` / `styles['kebab-case']` 引用（Next 使用 `exportLocalsConvention: 'asIs'`，
  不会做驼峰转换）。
- 多个组件共用的样式放 `styles/global.scss`（例如 `Tag` 与 `SocialBar` 共用的 `.round-tag`）。
- 全站不再使用 Less；`next.config.js` 里原先为 Less 写的 webpack patch 已删除。

## 已实现的功能

- 文章列表 / 分页 / 文章详情（MDX、代码高亮、目录 TOC、封面）
- 标签页与标签详情、多语言切换、翻译链接
- 上一篇/下一篇、相关文章、阅读时长、面包屑、Bio、SEO
- 明暗主题切换、主题背景设置、极简模式
- 私密文章密码锁、爱情标签爱心动画、Valine 评论（按需加载）
- `map-space` 地球地图：省界高亮、按 zoom 显隐的足迹 marker、彩色气泡弹窗（`lib/map-space/`）
- 左下角看板娘：Live2D 模型（嘉然 / Diana、Ava），由 `/live2d-jaran.js` + `/live2d-lib/pio.js` 提供
- 已从原项目迁移的样式全部转为 Sass（SCSS），组件样式收敛为同目录 CSS Modules

## 未迁移（原项目中的非文章功能）

- `image-wall` 页面
- Algolia 搜索（原项目中也已注释禁用）
- Google/Baidu 统计、AMP、离线 Service Worker 等

## 说明

- 封面与正文图片随文章放在 `content/blog/<dir>/` 下，构建时复制到 `public/blog/<dir>/`；部分历史文章的正文里仍引用 `img.picgo.net` 外链，沙箱/离线环境下无法加载属正常现象。
- `map-space` 依赖 Mapbox 在线样式与瓦片，看板娘依赖 jsDelivr / Cubism 的 CDN 资源，都需要联网；看板娘在宽度 ≤650px 时会自动隐藏（与原项目一致）。
- `map-space` 的 Mapbox token 通过 `NEXT_PUBLIC_MAPBOX_TOKEN` 注入（见 `.env.example`），不硬编码在源码里（GitHub push protection 会拦截）。该页**没有任何兜底 UI**：token 或样式加载失败时就是白屏，只在 console 报错。
- 文章内容通过 MDX 的 `format: 'md'` 编译，因此保留了原 Markdown 中的内联 HTML（如 `resume` 的样式块）与自动链接，渲染效果与原项目一致。

## 部署

推送到 `master` 后会触发 `.github/workflows/deploy.yml`，构建静态站点并发布到
GitHub Pages：<https://ianyspace.github.io/space/>。

因为站点是**项目页**（`/<repo>/` 子路径），构建时 `basePath` 为 `/space`（见
`config/index.js` 的 `pathPrefix`）。Next 只会自动改写自己管的路径（`next/link`、
`next/image`、`_next/*`），所以 `<img>`、`background-image`、`geojson`、看板娘脚本等
绝对路径都要经过 `utils/basePath.js` 的 `withBasePath()` 补前缀。

`NEXT_PUBLIC_MAPBOX_TOKEN` **不入库**：GitHub push protection 会以
「Mapbox Secret Access Token」为由拒绝包含该值的提交（`GH013`），即便它是公共
（`pk.*`）token。需要在仓库里配置一次，Secret 或 Variable 均可：

> Settings → Secrets and variables → Actions → 新建 `NEXT_PUBLIC_MAPBOX_TOKEN`

未配置时该页不做任何兜底，直接白屏（只在 console 报错）——这是刻意行为。

### 部署目标只有一个：GitHub Pages

仓库上曾经挂着 Vercel 集成（项目 `anyscripts-projects/space`，Root Directory 指向
`space/`），把站点发布在 `https://anyspace.cc`。迁移到 GitHub Pages 时该目标已废弃，
原因有两个：

- Vercel 的 Root Directory 指向的 `space/` 目录已不存在；
- 更根本的是 `basePath` 冲突：GitHub Pages **项目页**必须用 `/space`，而自定义域名
  **根路径**必须用 `''`，同一份构建无法同时满足。

所以现在只有 `/space/` 这一份产物。若要重新用 `anyspace.cc`，需要把 `basePath`
改成可由环境变量切换（例如 `NEXT_PUBLIC_BASE_PATH`），并把 `config/index.js` 的
`siteUrl` 一并改回。

### `public/sw.js`（旧 Service Worker 清理）

旧 Gatsby 站用了 `gatsby-plugin-offline`，在 `/space/sw.js` 注册过一个 Service
Worker，它缓存了旧的 app shell。迁移后这些 chunk 都不存在了，老访客会被它挡住看到
白屏，而且因为 `sw.js` 一度 404，连自更新都失败、永远不会自愈。

`public/sw.js` 就是为此保留的“自杀式” Worker：装上后清空所有 cache、注销自己、并
重载受控标签页。等足够长时间让老访客都拿到它之后，这个文件就可以删掉了。

### 排障：`Deployment request failed ... due to in progress deployment`

如果部署报这个错（通常由 `Deploy to GitHub Pages` 步骤在几秒内失败）：

> Failed to create deployment (status: 400) ... due to in progress deployment.
> Please cancel `<sha>` first or wait for it to complete.

说明有**早期一次部署卡在 Pages 后端没结束**，它会把之后所有部署都挡掉。早期那次
的报错一般是：

> Timeout reached, aborting!

处理方式（三选一）：

1. Settings → Pages → Source 先改选 `Deploy from a branch` 保存，再改回
   `GitHub Actions` 保存，然后重跑最新的 workflow；
2. Settings → Environments → `github-pages` → 删除该 environment，然后重跑（GitHub
   会在下次部署时自动重建）；
3. 等 GitHub 后端自行回收（可能很久，不建议）。

workflow 里已把 `deploy-pages` 的 `timeout` 放宽到 30 分钟、`error_count` 提到 30，
尽量避免再次走到“超时就丢弃部署”这条路。
