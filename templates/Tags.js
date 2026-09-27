import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Layout from 'components/Layout';
import Bio from 'components/Bio';
import SEO from 'components/SEO';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import { kebabCase } from 'utils/helpers';

import TagGraph from './TagGraph';
import styles from './Tags.module.scss';

const TagsPage = function ({ tagGroups }) {
    const { homeLink } = useLang();

    const tTags = formatMessage('tTags');
    const tTagGraphEmpty = formatMessage('tTagGraphEmpty');
    const tagSummary = formatMessage('tfTagGraphSummary', tagGroups.length);

    const totalArticleReferences = useMemo(() => {
        return tagGroups.reduce((acc, curr) => acc + curr.totalCount, 0);
    }, [tagGroups]);

    const tTotalArticles = formatMessage('tTagTotalArticles', totalArticleReferences);

    const getTagUrl = (tag) => `${homeLink}tags/${kebabCase(tag)}/`;

    return (
        <Layout title={formatMessage('title')} breadcrumbs={[{ text: tTags }]}>
            <SEO title={tTags} />
            <aside>
                <Bio />
            </aside>

            <div className={styles['tag-page']}>
                {/* Minimalist Editorial Header */}
                <header className={styles['tag-header']}>
                    <div className={styles['tag-title-wrap']}>
                        <h1 className={styles['tag-title']}>{tTags}</h1>
                        <p className={styles['tag-meta']}>
                            <span>{tagSummary}</span>
                            <span className={styles['tag-meta-sep']} aria-hidden="true">/</span>
                            <span>{tTotalArticles}</span>
                            <span className={styles['tag-meta-sep']} aria-hidden="true">/</span>
                            <span className={styles['tag-meta-hint']}>{formatMessage('tTagGraphHint')}</span>
                        </p>
                    </div>
                </header>

                {tagGroups.length === 0 ? (
                    <p className={styles['tag-empty']}>{tTagGraphEmpty}</p>
                ) : (
                    <div className={styles['graph-wrap']}>
                        <TagGraph tagGroups={tagGroups} getTagUrl={getTagUrl} />
                    </div>
                )}
            </div>
        </Layout>
    );
};

TagsPage.propTypes = {
    tagGroups: PropTypes.array.isRequired,
};

export default TagsPage;
