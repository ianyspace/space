import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

import { site, supportedLanguages } from '../config';
import getBaseUrl from '../utils/getBaseUrl';
import { kebabCase, haveSameItem, getPreviousNextNode } from '../utils/helpers';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const defaultLang = site.lang;
const langKeys = Object.keys(supportedLanguages);

/** Gatsby formatted dates as `MMMM DD, YYYY` before handing them to the UI. */
function formatDateEn(date) {
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function makeExcerpt(content, len = 160) {
    const text = content
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/~~~[\s\S]*?~~~/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/(\*\*|__|\*|_)/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (text.length <= len) return text;

    const cut = text.slice(0, len);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : len).trim()}…`;
}

function fileNameFor(langKey) {
    return langKey === defaultLang ? 'index.mdx' : `index.${langKey}.mdx`;
}

function normalizeFrontmatter(data, dirName) {
    const dateRaw = data.date ? new Date(data.date) : new Date(0);
    return {
        dateRaw,
        frontmatter: {
            title: data.title || dirName,
            date: formatDateEn(dateRaw),
            description: data.description || '',
            tags: data.tags || [],
            disqus: !!data.disqus,
            relative: !!data.relative,
            private: !!data.private,
            question: data.question || '',
            password: data.password || '',
            cover: data.cover || '',
        },
    };
}

let cachedPosts;

/** Reads every MDX post for every supported language. */
export function getAllPosts() {
    if (cachedPosts && process.env.NODE_ENV === 'production') return cachedPosts;

    const posts = [];

    if (fs.existsSync(BLOG_DIR)) {
        const dirNames = fs
            .readdirSync(BLOG_DIR, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);

        dirNames.forEach((dirName) => {
            langKeys.forEach((langKey) => {
                const filePath = path.join(BLOG_DIR, dirName, fileNameFor(langKey));
                if (!fs.existsSync(filePath)) return;

                const raw = fs.readFileSync(filePath, 'utf8');
                const { data, content } = matter(raw);
                const { dateRaw, frontmatter } = normalizeFrontmatter(data, dirName);

                posts.push({
                    dirName,
                    langKey,
                    filePath,
                    slug: `${getBaseUrl(defaultLang, langKey)}${dirName}/`,
                    frontmatter,
                    content,
                    excerpt: frontmatter.description || makeExcerpt(content),
                    timeToRead: Math.max(1, Math.round(readingTime(content).minutes)),
                    dateRaw,
                });
            });
        });
    }

    posts.sort((a, b) => b.dateRaw - a.dateRaw);

    cachedPosts = posts;
    return posts;
}

export function getPostsByLang(posts, langKey) {
    return posts.filter((post) => post.langKey === langKey);
}

export function getPostBySlug(posts, slug) {
    return posts.find((post) => post.slug === slug);
}

export function getTotalPages(postCount) {
    return Math.ceil(postCount / site.postsPerPage);
}

/** Builds everything the blog index template needs for a given language/page. */
export function getIndexPageData(posts, langKey, pageNum) {
    const postsInLang = getPostsByLang(posts, langKey);
    const numPages = getTotalPages(postsInLang.length);
    const index = Math.max(1, Math.min(pageNum, Math.max(numPages, 1)));
    const skip = (index - 1) * site.postsPerPage;
    const pagePosts = postsInLang.slice(skip, skip + site.postsPerPage);

    return {
        langKey,
        baseUrl: getBaseUrl(defaultLang, langKey),
        currentPage: index,
        numPages,
        totalCount: postsInLang.length,
        limit: site.postsPerPage,
        skip,
        from: skip + 1,
        to: skip + pagePosts.length,
        posts: pagePosts,
    };
}

function toPostLink(post) {
    if (!post) return null;
    return {
        slug: post.slug,
        title: post.frontmatter.title,
        date: post.frontmatter.date,
    };
}

/** Previous/next post within the same language. */
export function getPrevNext(posts, post) {
    const postsInSameLang = getPostsByLang(posts, post.langKey);
    const index = postsInSameLang.findIndex((p) => p.slug === post.slug);
    const { previous, next } = getPreviousNextNode(postsInSameLang, index);
    return { previous: toPostLink(previous), next: toPostLink(next) };
}

/** Previous/next post that shares at least one tag (used for "relative posts"). */
export function getPrevNextInSameTag(posts, post) {
    const postTags = post.frontmatter.tags || [];
    const postsInSameTag = posts.filter((p) => haveSameItem(postTags, p.frontmatter.tags || []));
    const index = postsInSameTag.findIndex((p) => p.slug === post.slug);
    const { previous, next } = getPreviousNextNode(postsInSameTag, index);
    return { previousInSameTag: toPostLink(previous), nextInSameTag: toPostLink(next) };
}

/** Links to the same post in the other supported languages. */
export function getTranslations(posts, post, displayTranslations = site.displayTranslations) {
    if (!displayTranslations) return [];

    return posts
        .filter((p) => p.dirName === post.dirName && p.langKey !== post.langKey)
        .map((p) => ({
            name: supportedLanguages[p.langKey],
            url: `/${p.langKey}/${p.dirName}/`.replace(`/${defaultLang}`, ''),
        }));
}

/**
 * `[{ fieldValue, totalCount, tagList }]` for a language, matching Gatsby's
 * group(). `tagList` lists the other tags that share at least one article with
 * this one — the edges of the tags relation graph (`templates/TagGraph.js`).
 */
export function getTagGroups(posts, langKey) {
    const counts = new Map();
    const coOccurrence = new Map();
    getPostsByLang(posts, langKey).forEach((post) => {
        const tags = post.frontmatter.tags || [];
        tags.forEach((tag) => {
            counts.set(tag, (counts.get(tag) || 0) + 1);
            if (!coOccurrence.has(tag)) coOccurrence.set(tag, new Set());
            tags.forEach((other) => {
                if (other !== tag) coOccurrence.get(tag).add(other);
            });
        });
    });

    return [...counts.entries()].map(([fieldValue, totalCount]) => ({
        fieldValue,
        totalCount,
        tagList: [...(coOccurrence.get(fieldValue) || [])],
    }));
}

export function getPostsByTag(posts, langKey, tag) {
    return getPostsByLang(posts, langKey).filter((post) =>
        (post.frontmatter.tags || []).includes(tag),
    );
}

export const tagUrl = (langKey, tag) =>
    `${getBaseUrl(defaultLang, langKey)}tags/${kebabCase(tag)}/`;

export const tagsUrl = (langKey) => `${getBaseUrl(defaultLang, langKey)}tags/`;

export const pageUrl = (langKey, pageNum) => {
    const base = getBaseUrl(defaultLang, langKey);
    return pageNum <= 1 ? base : `${base}${pageNum}/`;
};

export { defaultLang, langKeys, kebabCase };
