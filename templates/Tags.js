import React from 'react';
import PropTypes from 'prop-types';

import Layout from 'components/Layout';
import Bio from 'components/Bio';
import SEO from 'components/SEO';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import { kebabCase } from 'utils/helpers';
import TagGraph from './TagGraph';
import styles from './Tags.module.scss';

/**
 * Tags index: a single relation graph. Node size encodes the article count and
 * an edge means the two tags appear together in some article.
 *
 * Apple-style page: one large title, one muted line that doubles as the
 * interaction hint (a graph with no chrome has no affordance of its own), then
 * the map.
 */
const TagsPage = function ({ tagGroups }) {
    const { homeLink } = useLang();
    const tTags = formatMessage('tTags');
    const tTagGraphHint = formatMessage('tTagGraphHint');
    // Hoisted like every other message: `formatMessage` reads the language
    // context, so it must not be called inside a conditional branch.
    const tTagGraphEmpty = formatMessage('tTagGraphEmpty');
    const tagSummary = formatMessage('tfTagGraphSummary', tagGroups.length);

    const getTagUrl = (tag) => `${homeLink}tags/${kebabCase(tag)}/`;

    return (
        <Layout title={formatMessage('title')} breadcrumbs={[{ text: tTags }]}>
            <SEO title={tTags} />
            <aside>
                <Bio />
            </aside>
            <div className={styles['tag-page']}>
                <header className={styles['tag-header']}>
                    <h1 className={styles['tag-title']}>{tTags}</h1>
                    <p className={styles['tag-meta']}>
                        {tagSummary}
                        <span className={styles['tag-meta-dot']} aria-hidden="true">
                            ·
                        </span>
                        {tTagGraphHint}
                    </p>
                </header>
                {tagGroups.length > 0 ? (
                    <TagGraph tagGroups={tagGroups} getTagUrl={getTagUrl} />
                ) : (
                    <p className={styles['tag-empty']}>{tTagGraphEmpty}</p>
                )}
            </div>
        </Layout>
    );
};

TagsPage.propTypes = {
    tagGroups: PropTypes.array.isRequired,
};

export default TagsPage;
