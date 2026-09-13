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
 */
const TagsPage = function ({ tagGroups }) {
    const { homeLink } = useLang();
    const tTags = formatMessage('tTags');

    const getTagUrl = (tag) => `${homeLink}tags/${kebabCase(tag)}/`;

    return (
        <Layout title={formatMessage('title')} breadcrumbs={[{ text: tTags }]}>
            <SEO title={tTags} />
            <aside>
                <Bio />
            </aside>
            <div className={styles['tag-page']}>
                <h1 className={styles['tag-title']}>{tTags}</h1>
                <TagGraph tagGroups={tagGroups} getTagUrl={getTagUrl} />
            </div>
        </Layout>
    );
};

TagsPage.propTypes = {
    tagGroups: PropTypes.array.isRequired,
};

export default TagsPage;
