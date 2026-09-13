import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import Bio from 'components/Bio';
import Layout from 'components/Layout';
import SEO from 'components/SEO';
import PostAbbrev from 'components/PostAbbrev';
import PostAbbrevSimple from 'components/PostAbbrev/PostAbbrevSimple';
import Pagination from 'components/Pagination';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import { getSimpleTheme } from 'utils/simpleTheme';
import {
    getListMode,
    LIST_MODE_SCROLL,
} from 'utils/listMode';

const BlogIndex = function ({ pageData }) {
    const { from, to, currentPage, numPages, posts, totalCount, limit, allPosts } = pageData;
    const siteTitle = formatMessage('title');

    const { lang, homeLink } = useLang();

    // 极简风 is the default, so the first paint already matches it; only users who
    // explicitly picked the card layout see the list switch after hydration.
    const [simpleTheme, setSimpleTheme] = useState(true);
    // List loading mode: pagination (build-time pages) or infinite scroll.
    // Scroll mode renders the full language list
    // progressively from `allPosts`, growing by `limit` items per load.
    const [listMode, setListModeState] = useState(LIST_MODE_SCROLL);
    const [visibleCount, setVisibleCount] = useState(posts.length);
    const sentinelRef = useRef(null);

    useLayoutEffect(() => {
        setSimpleTheme(getSimpleTheme());
        const mode = getListMode();
        setListModeState(mode);
        // Scroll mode always starts from the newest post, one page's worth.
        setVisibleCount(mode === LIST_MODE_SCROLL ? limit : posts.length);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (listMode !== LIST_MODE_SCROLL) return undefined;
        const sentinel = sentinelRef.current;
        if (!sentinel) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisibleCount((count) => Math.min(count + limit, allPosts.length));
                }
            },
            // Start loading slightly before the sentinel scrolls into view.
            { rootMargin: '600px 0px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [listMode, limit, allPosts.length]);

    const scrollMode = listMode === LIST_MODE_SCROLL;
    const listPosts = scrollMode ? allPosts.slice(0, visibleCount) : posts;
    const loadedAll = scrollMode && visibleCount >= allPosts.length;

    return (
        <Layout title={siteTitle}>
            <SEO title={formatMessage('tIndTitle')} keywords={formatMessage('taIndKeywords')} />
            <aside>
                <Bio />
            </aside>
            <div style={{ fontWeight: '700', fontSize: '22px' }}>
                {scrollMode
                    ? formatMessage('tfIndCountPosts', { count: totalCount, from: 1, to: Math.min(visibleCount, allPosts.length) })
                    : formatMessage('tfIndCountPosts', { count: totalCount, from, to })}
            </div>
            {listPosts.map((post, index) => {
                const layoutFlag = index % 2 === 0 ? 0 : 1;
                const title = post.frontmatter.title || post.slug;

                const commonProps = {
                    lang,
                    base: homeLink,
                    slug: post.slug,
                    date: post.frontmatter.date,
                    timeToRead: post.timeToRead,
                    title,
                    excerpt: post.frontmatter.description || post.excerpt,
                    tags: post.frontmatter.tags,
                    cover: post.frontmatter.cover,
                    layoutFlag,
                };

                return simpleTheme ? (
                    <PostAbbrevSimple key={post.slug} {...commonProps} />
                ) : (
                    <PostAbbrev key={post.slug} {...commonProps} />
                );
            })}
            {scrollMode ? (
                <>
                    {!loadedAll ? <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" /> : null}
                    {loadedAll ? (
                        <div
                            style={{
                                textAlign: 'center',
                                opacity: 0.6,
                                fontSize: 13,
                                margin: '16px 0',
                            }}
                        >
                            {formatMessage('tfLoadedAll', allPosts.length)}
                        </div>
                    ) : null}
                </>
            ) : (
                <Pagination currentPage={currentPage} totalPageNumber={numPages} />
            )}
        </Layout>
    );
};

BlogIndex.propTypes = {
    pageData: PropTypes.object.isRequired,
};

export default BlogIndex;
