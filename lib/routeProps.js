import { site, supportedLanguages } from '../config';
import getBaseUrl from '../utils/getBaseUrl';
import { kebabCase } from '../utils/helpers';

import {
    getAllPosts,
    getPostsByLang,
    getIndexPageData,
    getTotalPages,
    getPrevNext,
    getPrevNextInSameTag,
    getTranslations,
    getTagGroups,
    getPostsByTag,
} from './posts';
import { serializeMdx } from './mdx';
import { buildTableOfContents } from './toc';

const defaultLang = site.lang;
const langKeys = Object.keys(supportedLanguages);

/** Removes server-only fields so props stay small and serialisable. */
function slimPost(post) {
    return {
        slug: post.slug,
        dirName: post.dirName,
        langKey: post.langKey,
        frontmatter: post.frontmatter,
        excerpt: post.excerpt,
        timeToRead: post.timeToRead,
    };
}

/**
 * Resolves a catch-all slug into a route kind.
 * `/` -> index, `/2/` -> index, `/en/2/` -> index, `/tags/` -> tags,
 * `/tags/js/` -> tag, `/js/` -> post, `/en/js/` -> post.
 */
export function resolveRoute(slug) {
    const segs = slug || [];
    let langKey = defaultLang;
    let rest = segs;

    if (segs.length > 0 && segs[0] !== defaultLang && supportedLanguages[segs[0]]) {
        langKey = segs[0];
        rest = segs.slice(1);
    }

    if (rest.length === 0) return { type: 'index', langKey, page: 1 };
    if (rest.length === 1 && /^\d+$/.test(rest[0])) {
        return { type: 'index', langKey, page: Number(rest[0]) };
    }
    if (rest.length === 1 && rest[0] === 'tags') return { type: 'tags', langKey };
    if (rest.length === 2 && rest[0] === 'tags') {
        return { type: 'tag', langKey, tagSlug: rest[1] };
    }
    if (rest.length === 1) return { type: 'post', langKey, dirName: rest[0] };

    return { type: 'unknown' };
}

export function getRouteStaticPaths() {
    const posts = getAllPosts();
    const paths = [];

    langKeys.forEach((langKey) => {
        const base = getBaseUrl(defaultLang, langKey);
        const prefix = base === '/' ? [] : [langKey];

        // Paginated index pages (page 1 is `/` and is handled by pages/index.js).
        const numPages = Math.max(getTotalPages(getPostsByLang(posts, langKey).length), 1);
        for (let page = 2; page <= numPages; page += 1) {
            paths.push({ params: { slug: [...prefix, String(page)] } });
        }

        // Non-default language home page (eg `/en/`).
        if (prefix.length > 0) {
            paths.push({ params: { slug: prefix } });
        }

        // Tags index.
        paths.push({ params: { slug: [...prefix, 'tags'] } });

        // Tag pages.
        getTagGroups(posts, langKey).forEach(({ fieldValue }) => {
            paths.push({ params: { slug: [...prefix, 'tags', kebabCase(fieldValue)] } });
        });

        // Posts.
        getPostsByLang(posts, langKey).forEach((post) => {
            paths.push({ params: { slug: [...prefix, post.dirName] } });
        });
    });

    return paths;
}

export async function getRouteStaticProps(slug) {
    const posts = getAllPosts();
    const route = resolveRoute(slug);

    if (route.type === 'index') {
        const postsInLang = getPostsByLang(posts, route.langKey);
        const numPages = Math.max(getTotalPages(postsInLang.length), 1);
        if (route.page < 1 || route.page > numPages) {
            return { notFound: true };
        }

        const pageData = getIndexPageData(posts, route.langKey, route.page);

        return {
            props: {
                kind: 'index',
                pageData: {
                    ...pageData,
                    posts: pageData.posts.map(slimPost),
                    // The full list for the language: lets the homepage switch to
                    // infinite scroll (settings page) without extra fetches. Only
                    // slim posts, so the duplicated payload stays small.
                    allPosts: postsInLang.map(slimPost),
                },
            },
        };
    }

    if (route.type === 'post') {
        const post = posts.find(
            (p) => p.langKey === route.langKey && p.dirName === route.dirName,
        );
        if (!post) return { notFound: true };

        const mdxSource = await serializeMdx(post.content, { dirName: post.dirName });
        const tableOfContents = buildTableOfContents(post.content);
        const { previous, next } = getPrevNext(posts, post);
        const { previousInSameTag, nextInSameTag } = getPrevNextInSameTag(posts, post);
        const translationsLink = getTranslations(posts, post);

        return {
            props: {
                kind: 'post',
                post: slimPost(post),
                mdxSource,
                tableOfContents,
                previous,
                next,
                previousInSameTag,
                nextInSameTag,
                translationsLink,
            },
        };
    }

    if (route.type === 'tags') {
        return {
            props: {
                kind: 'tags',
                tagGroups: getTagGroups(posts, route.langKey),
            },
        };
    }

    if (route.type === 'tag') {
        const group = getTagGroups(posts, route.langKey).find(
            ({ fieldValue }) => kebabCase(fieldValue) === route.tagSlug,
        );
        if (!group) return { notFound: true };

        return {
            props: {
                kind: 'tag',
                tag: group.fieldValue,
                posts: getPostsByTag(posts, route.langKey, group.fieldValue).map(slimPost),
            },
        };
    }

    return { notFound: true };
}
