import React from 'react';
import PropTypes from 'prop-types';

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

    return (
        <Layout
            title={siteTitle}
            breadcrumbs={[{ text: formatMessage('tTags'), url: `${homeLink}tags/` }, { text: tag }]}
        >
            <SEO title={tagHeader} description={tagHeader} />
            {/* Apple-style large title: the tag itself, with the count as the muted
                secondary line. The full sentence stays in the SEO title above. */}
            <header className={styles['tag-header']}>
                <h1 className={styles['tag-title']}>{tag}</h1>
                <p className={styles['tag-meta']}>{tagCount}</p>
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
