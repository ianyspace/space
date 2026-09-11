import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrismPlus from 'rehype-prism-plus';
import rehypeExternalLinks from 'rehype-external-links';
import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';

import withBasePath from 'utils/basePath';

/**
 * Tags that must never end up nested inside the article body. When authors write
 * them as inline prose (eg. `<html>`), render them as plain text instead of real
 * elements so React doesn't complain about invalid DOM nesting.
 */
const DOCUMENT_LEVEL_TAGS = new Set([
    'html',
    'head',
    'body',
    'title',
    'meta',
    'link',
    'base',
    'script',
    'style',
]);

function rehypeNeutralizeDocumentTags() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (!DOCUMENT_LEVEL_TAGS.has(node.tagName)) return;
            if (!parent || typeof index !== 'number') return;

            const hasChildren = Array.isArray(node.children) && node.children.length > 0;
            const text = hasChildren
                ? `<${node.tagName}>${hastToString(node)}</${node.tagName}>`
                : `<${node.tagName}>`;

            parent.children[index] = { type: 'text', value: text };
        });
    };
}

/**
 * Markdown treats a custom tag written inline as phrasing content, so
 * `<my-widget></my-widget>` on its own line ends up wrapped in a `<p>`. That
 * would nest a block level widget inside a paragraph (invalid HTML + hydration
 * errors), so unwrap paragraphs that contain nothing but a custom element.
 */
function rehypeUnwrapCustomElementParagraphs() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (node.tagName !== 'p' || !parent || typeof index !== 'number') return;

            const meaningful = (node.children || []).filter(
                (child) => !(child.type === 'text' && child.value.trim() === ''),
            );
            if (meaningful.length !== 1) return;

            const only = meaningful[0];
            if (only.type !== 'element' || !only.tagName.includes('-')) return;

            parent.children[index] = only;
        });
    };
}

/**
 * Rewrites relative image paths such as `images/foo.png` to the public folder
 * (`/blog/<dir>/images/foo.png`), mirroring `gatsby-remark-images`.
 */
function rehypeLocalImages(options = {}) {
    const { dirName } = options;
    return (tree) => {
        if (!dirName) return;
        visit(tree, 'element', (node) => {
            if (node.tagName !== 'img' || !node.properties) return;
            const { src } = node.properties;
            if (typeof src !== 'string') return;
            if (/^([a-z]+:)?\/\//i.test(src) || src.startsWith('/') || src.startsWith('data:')) return;

            const clean = src.replace(/^\.\//, '');
            if (clean.startsWith('images/')) {
                node.properties.src = withBasePath(`/blog/${dirName}/${clean}`);
            }
        });
    };
}

function rehypeWrapCodeBlocks() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (node.tagName !== 'pre') return;
            if (!parent || typeof index !== 'number') return;

            const parentClass = parent.properties && parent.properties.className;
            if (Array.isArray(parentClass) && parentClass.includes('gatsby-highlight')) return;
            if (parent.tagName === 'div') return;

            parent.children[index] = {
                type: 'element',
                tagName: 'div',
                properties: { className: ['gatsby-highlight'] },
                children: [node],
            };
        });
    };
}

/**
 * Fence metadata is often written without a space before the brace
 * (`` ```js{3, 13, 19} ``). Markdown splits the info string at the *first* space,
 * so the language ends up as `js{3,` and the rest becomes the meta string — both
 * syntax highlighting and line highlighting then fail silently. Move the `{...}`
 * part into `meta` and keep only the real language in `lang`.
 */
function remarkNormalizeCodeMeta() {
    return (tree) => {
        visit(tree, 'code', (node) => {
            if (!node.lang) return;

            const brace = node.lang.indexOf('{');
            if (brace === -1) return;

            const lang = node.lang.slice(0, brace).trim();
            const meta = node.lang.slice(brace).trim();

            node.lang = lang || null;
            node.meta = `${meta} ${node.meta || ''}`.trim();
        });
    };
}

/**
 * `rehype-raw` re-parses the whole tree as HTML, which drops `data.meta` — the
 * very field holding the fence meta (`` ```js {1,3-5} ``) that
 * `rehype-prism-plus` needs for line highlighting. Copy it onto a real attribute
 * before that happens; the plugin reads `properties.metastring` too.
 */
function rehypeKeepCodeMeta() {
    return (tree) => {
        visit(tree, 'element', (node) => {
            if (node.tagName !== 'code' || !node.data || !node.data.meta) return;

            node.properties = { ...node.properties, metastring: node.data.meta };
        });
    };
}

/** Drop the temporary `metastring` attribute again once Prism has read it. */
function rehypeDropCodeMeta() {
    return (tree) => {
        visit(tree, 'element', (node) => {
            if (node.tagName !== 'code' || !node.properties) return;

            delete node.properties.metastring;
        });
    };
}

const anchorIcon = {
    type: 'element',
    tagName: 'svg',
    properties: {
        className: ['anchor-icon'],
        viewBox: '0 0 16 16',
        width: 16,
        height: 16,
        ariaHidden: 'true',
        focusable: 'false',
    },
    children: [
        {
            type: 'element',
            tagName: 'path',
            properties: {
                fill: 'currentColor',
                d:
                    'M6.879 9.121a3 3 0 0 0 4.242 0l2.829-2.828a3 3 0 0 0-4.243-4.243l-1.06 1.06 1.06 1.061 1.06-1.06a1.5 1.5 0 1 1 2.122 2.121l-2.829 2.829a1.5 1.5 0 0 1-2.12 0l-1.061 1.06zm2.242-2.242a3 3 0 0 0-4.242 0L2.05 9.707a3 3 0 0 0 4.243 4.243l1.06-1.06-1.06-1.061-1.06 1.06a1.5 1.5 0 1 1-2.122-2.121l2.829-2.829a1.5 1.5 0 0 1 2.12 0l1.061-1.06z',
            },
            children: [],
        },
    ],
};

/**
 * Compiles a MDX document. Content is compiled with `format: 'md'` so existing
 * blog posts (which contain raw HTML and markdown autolinks) keep rendering the
 * same way they did with Gatsby's remark pipeline, while still going through the
 * full MDX/remark/rehype toolchain.
 */
export async function serializeMdx(content, { dirName } = {}) {
    return serialize(content, {
        parseFrontmatter: false,
        mdxOptions: {
            format: 'md',
            remarkPlugins: [remarkGfm, remarkMath, remarkNormalizeCodeMeta],
            rehypePlugins: [
                // `format: 'md'` keeps raw HTML in the tree; parse it into real nodes so
                // posts that rely on inline HTML (eg. the resume) render correctly.
                rehypeKeepCodeMeta,
                rehypeRaw,
                // `remark-math` marks up `$x$` / `$$x$$`, KaTeX turns it into HTML. It has
                // to run *after* `rehype-raw`: that plugin re-parses the tree as HTML and
                // would otherwise throw the KaTeX markup away again.
                rehypeKatex,
                rehypeNeutralizeDocumentTags,
                rehypeUnwrapCustomElementParagraphs,
                rehypeSlug,
                [
                    rehypeAutolinkHeadings,
                    {
                        behavior: 'append',
                        properties: { className: ['anchor'], ariaHidden: 'true', tabIndex: -1 },
                        content: anchorIcon,
                    },
                ],
                [rehypePrismPlus, { defaultLanguage: 'plaintext', ignoreMissing: true }],
                rehypeDropCodeMeta,
                [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }],
                rehypeWrapCodeBlocks,
                [rehypeLocalImages, { dirName }],
            ],
        },
    });
}
