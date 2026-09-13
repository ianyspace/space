import React from 'react';
import PropTypes from 'prop-types';

import Layout from 'components/Layout';
import Tag from 'components/Tag';
import Bio from 'components/Bio';
import SEO from 'components/SEO';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import { kebabCase } from 'utils/helpers';
import TagGraph from './TagGraph';
import styles from './Tags.module.scss';

/**
 * Tags index, redesigned as a relation graph: node size encodes the article
 * count and an edge means the two tags appear together in some article. The
 * flat tag list stays below as a quick, always-visible way into every tag.
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
                <h1>{tTags}</h1>
                <p className={styles['tag-intro']}>{formatMessage('tTagsDesc')}</p>

                <TagGraph tagGroups={tagGroups} getTagUrl={getTagUrl} />

                <h2 className={styles['tag-list-title']}>{formatMessage('tTagsAll')}</h2>
                <ul className={styles['tag-grid']}>
                    {tagGroups.map((tag) => (
                        <li className={styles['tag-item']} key={tag.fieldValue}>
                            <Tag
                                text={tag.fieldValue}
                                count={tag.totalCount}
                                url={getTagUrl(tag.fieldValue)}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        </Layout>
    );
};

TagsPage.propTypes = {
    tagGroups: PropTypes.array.isRequired,
};

export default TagsPage;
