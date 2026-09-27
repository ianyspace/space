import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { formatMessage } from 'utils/i18n';
import styles from './TagGrid.module.scss';

export default function TagGrid({ tagGroups, getTagUrl }) {
    const relatedText = formatMessage('tTagConnectedTo');
    const articlesCountFn = (count) => formatMessage('tTagArticlesCount', count);

    return (
        <div className={styles.grid}>
            {tagGroups.map((tag) => {
                const tagUrl = getTagUrl(tag.fieldValue);
                const related = tag.tagList || [];

                return (
                    <div key={tag.fieldValue} className={styles.card}>
                        <Link href={tagUrl} className={styles['card-main']}>
                            <div className={styles['header-row']}>
                                <div className={styles['title-group']}>
                                    <span className={styles.hash}>#</span>
                                    <h3 className={styles.name}>{tag.fieldValue}</h3>
                                </div>
                                <span className={styles.count}>
                                    {articlesCountFn(tag.totalCount)}
                                </span>
                            </div>
                        </Link>

                        {related.length > 0 && (
                            <div className={styles['related-section']}>
                                <span className={styles['related-hint']}>{relatedText}</span>
                                <div className={styles['related-tags']}>
                                    {related.slice(0, 5).map((rel) => (
                                        <Link
                                            key={rel}
                                            href={getTagUrl(rel)}
                                            className={styles['rel-tag']}
                                        >
                                            {rel}
                                        </Link>
                                    ))}
                                    {related.length > 5 && (
                                        <span className={styles['rel-more']}>
                                            +{related.length - 5}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
