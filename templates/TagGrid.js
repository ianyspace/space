import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { formatMessage } from 'utils/i18n';
import styles from './TagGrid.module.scss';

export default function TagGrid({ tagGroups, getTagUrl }) {
    const relatedText = formatMessage('tTagConnectedTo');
    const articlesCountFn = (count) => formatMessage('tTagArticlesCount', count);

    return (
        <div className={styles['grid-container']}>
            {tagGroups.map((tag) => {
                const tagUrl = getTagUrl(tag.fieldValue);
                const related = tag.tagList || [];

                return (
                    <article key={tag.fieldValue} className={styles['tag-card']}>
                        <Link href={tagUrl} className={styles['card-header']}>
                            <div className={styles['title-group']}>
                                <span className={styles['tag-prefix']}>#</span>
                                <h3 className={styles['tag-name']}>{tag.fieldValue}</h3>
                            </div>
                            <span className={styles['tag-count']}>
                                {articlesCountFn(tag.totalCount)}
                            </span>
                        </Link>

                        {related.length > 0 && (
                            <div className={styles['related-row']}>
                                <span className={styles['related-label']}>{relatedText}</span>
                                <div className={styles['related-list']}>
                                    {related.slice(0, 4).map((rel) => (
                                        <Link
                                            key={rel}
                                            href={getTagUrl(rel)}
                                            className={styles['rel-tag']}
                                        >
                                            {rel}
                                        </Link>
                                    ))}
                                    {related.length > 4 && (
                                        <span className={styles['rel-more']}>
                                            +{related.length - 4}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

TagGrid.propTypes = {
    tagGroups: PropTypes.arrayOf(
        PropTypes.shape({
            fieldValue: PropTypes.string.isRequired,
            totalCount: PropTypes.number.isRequired,
            tagList: PropTypes.array,
        }),
    ).isRequired,
    getTagUrl: PropTypes.func.isRequired,
};
