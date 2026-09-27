import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';

import Layout from 'components/Layout';
import SEO from 'components/SEO';
import PostAbbrevSimple from 'components/PostAbbrev/PostAbbrevSimple';
import Bio from 'components/Bio';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';

import styles from './TagPage.module.scss';

const TagPageTemplate = function ({ tag, posts }) {
    const siteTitle = formatMessage('title');
    const { lang, homeLink } = useLang();

    const tagHeader = formatMessage('tfTagHeader', posts.length, tag);
    const tagCount = formatMessage('tfTagCountPosts', posts.length);

    // Collect related tags that co-occur in these posts
    const relatedTags = useMemo(() => {
        const counts = new Map();
        posts.forEach((p) => {
            const list = p.frontmatter?.tags || [];
            list.forEach((t) => {
                if (t !== tag) {
                    counts.set(t, (counts.get(t) || 0) + 1);
                }
            });
        });
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([t]) => t);
    }, [posts, tag]);

    return (
        <Layout
            title={siteTitle}
            breadcrumbs={[{ text: formatMessage('tTags'), url: `${homeLink}tags/` }, { text: tag }]}
        >
            <SEO title={tagHeader} description={tagHeader} />
            <header className={styles['tag-header']}>
                <div className={styles['header-top']}>
                    <div className={styles['title-group']}>
                        <span className={styles['tag-hash']} aria-hidden="true">#</span>
                        <h1 className={styles['tag-title']}>{tag}</h1>
                    </div>
                    <span className={styles['tag-count-label']}>{tagCount}</span>
                </div>

                {relatedTags.length > 0 && (
                    <div className={styles['related-bar']}>
                        <span className={styles['related-title']}>
                            {formatMessage('tTagConnectedTo')}
                        </span>
                        <div className={styles['related-tags']}>
                            {relatedTags.map((rt) => (
                                <Link
                                    key={rt}
                                    href={`${homeLink}tags/${rt}/`}
                                    className={styles['related-link']}
                                >
                                    #{rt}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            <main className={styles['tag-posts']}>
                {posts.map((post) => {
                    const title = post.frontmatter.title || post.slug;
                    return (
                        <PostAbbrevSimple
                            key={post.slug}
                            base={homeLink}
                            lang={lang}
                            slug={post.slug}
                            date={post.frontmatter.date}
                            timeToRead={post.timeToRead}
                            title={title}
                        />
                    );
                })}
            </main>
            <aside className={styles['tag-bio']}>
                <Bio />
            </aside>
        </Layout>
    );
};

TagPageTemplate.propTypes = {
    tag: PropTypes.string.isRequired,
    posts: PropTypes.array.isRequired,
};

export default TagPageTemplate;
