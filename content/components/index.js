import Term from './Term';

/**
 * MDX components shared by **every** article.
 *
 * Only put something here when more than one article needs it. Components a
 * single article owns belong in `content/blog/<dir>/components/` instead, which
 * is registered per article by `scripts/gen-article-registry.js`.
 *
 * Usage
 * -----
 * 1. Drop the component (and its styles) next to this file:
 *
 *        content/components/CalloutNote.js
 *        content/components/CalloutNote.module.scss
 *
 *    Styles must live in a CSS module imported *by* the component — a component
 *    may not import a global stylesheet, Next.js only allows those from
 *    `pages/_app.js`.
 *
 * 2. Register it below. The key is the exact tag authors type in a `.mdx` body,
 *    so keep it lowercase kebab-case: MDX parses bodies as markdown plus raw
 *    HTML, and the HTML parser lowercases tag names (`<CalloutNote>` would be
 *    looked up as `calloutnote` and silently render as an empty unknown element).
 *
 * 3. Restart `npm run dev`: this map is read at build time.
 *
 * Example
 * -------
 *        import CalloutNote from './CalloutNote';
 *
 *        const sharedComponents = {
 *            'callout-note': CalloutNote,
 *        };
 *
 *        export default sharedComponents;
 *
 * and in the article body:
 *
 *        <callout-note type="warn">注意这一点</callout-note>
 */

/** @type {Record<string, React.ComponentType<any>>} */
const sharedComponents = {
    // 术语卡：正文里写 `<term>双亲委派</term>`，解释从 `content/glossary/` 查。
    term: Term,
};

export default sharedComponents;
