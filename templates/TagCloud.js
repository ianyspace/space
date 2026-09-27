import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { formatMessage } from 'utils/i18n';
import styles from './TagCloud.module.scss';

export default function TagCloud({ tagGroups, getTagUrl }) {
    const maxCount = Math.max(...tagGroups.map((t) => t.totalCount), 1);
    const minCount = Math.min(...tagGroups.map((t) => t.totalCount), 1);
    const articlesCountFn = (count) => formatMessage('tTagArticlesCount', count);

    return (
        <div className={styles['cloud-container']}>
            <div className={styles['cloud-list']}>
                {tagGroups.map((tag) => {
                    const weight =
                        maxCount === minCount
                            ? 0.5
                            : (tag.totalCount - minCount) / (maxCount - minCount);
                    // Proportional scale: 0.95rem (small) to 1.65rem (prominent)
                    const fontSize = `${(0.92 + weight * 0.72).toFixed(2)}rem`;
                    const isHot = tag.totalCount >= 3;
                    const tagUrl = getTagUrl(tag.fieldValue);

                    return (
                        <Link
                            key={tag.fieldValue}
                            href={tagUrl}
                            className={`${styles['tag-item']} ${isHot ? styles['tag-item-hot'] : ''}`}
                            style={{ fontSize }}
                            title={`${tag.fieldValue} · ${articlesCountFn(tag.totalCount)}`}
                        >
                            <span className={styles['tag-prefix']}>#</span>
                            <span className={styles['tag-text']}>{tag.fieldValue}</span>
                            <span className={styles['tag-count']}>{tag.totalCount}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

TagCloud.propTypes = {
    tagGroups: PropTypes.arrayOf(
        PropTypes.shape({
            fieldValue: PropTypes.string.isRequired,
            totalCount: PropTypes.number.isRequired,
        }),
    ).isRequired,
    getTagUrl: PropTypes.func.isRequired,
};
