import React from 'react';
import PropTypes from 'prop-types';

import Layout from 'components/Layout';
import Tag from 'components/Tag';
import Bio from 'components/Bio';
import SEO from 'components/SEO';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import { kebabCase } from 'utils/helpers';
import styles from './Tags.module.scss';

const TagsPage = function ({ tagGroups }) {
    const { homeLink } = useLang();
    const tTags = formatMessage('tTags');

    return (
        <Layout title={formatMessage('title')} breadcrumbs={[{ text: tTags }]}>
            <SEO title={tTags} />
            <aside>
                <Bio />
            </aside>
            <div className={styles['tag-page']}>
                <h1>{tTags}</h1>
                <p className={styles['tag-intro']}>{formatMessage('tTagsDesc')}</p>
                <ul className={styles['tag-grid']}>
                    {tagGroups.map((tag) => (
                        <li className={styles['tag-item']} key={tag.fieldValue}>
                            <Tag
                                text={tag.fieldValue}
                                count={tag.totalCount}
                                url={`${homeLink}tags/${kebabCase(tag.fieldValue)}/`}
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
