import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { formatMessage } from 'utils/i18n';
import styles from './TagCloud.module.scss';

// Distinctive color palettes that harmonize with both light and dark themes
const COLOR_CLASSES = ['color-pink', 'color-amber', 'color-teal', 'color-indigo', 'color-emerald', 'color-rose', 'color-sky', 'color-violet'];

export default function TagCloud({ tagGroups, getTagUrl }) {
    const maxCount = Math.max(...tagGroups.map((t) => t.totalCount), 1);
    const minCount = Math.min(...tagGroups.map((t) => t.totalCount), 1);
    const articlesCountFn = (count) => formatMessage('tTagArticlesCount', count);

    return (
        <div className={styles.cloud}>
            {tagGroups.map((tag, idx) => {
                // Scale factor between 0 and 1
                const weight = maxCount === minCount ? 0.5 : (tag.totalCount - minCount) / (maxCount - minCount);
                // Font size range: 0.95rem to 1.75rem
                const fontSize = `${(0.95 + weight * 0.75).toFixed(2)}rem`;
                const colorClass = COLOR_CLASSES[idx % COLOR_CLASSES.length];
                const tagUrl = getTagUrl(tag.fieldValue);

                return (
                    <Link
                        key={tag.fieldValue}
                        href={tagUrl}
                        className={`${styles.item} ${styles[colorClass]}`}
                        style={{ fontSize }}
                        title={`${tag.fieldValue} (${articlesCountFn(tag.totalCount)})`}
                    >
                        <span className={styles.hash}>#</span>
                        <span className={styles.label}>{tag.fieldValue}</span>
                        <span className={styles.badge}>{tag.totalCount}</span>
                    </Link>
                );
            })}
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
