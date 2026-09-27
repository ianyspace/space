import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import styles from './Tag.module.scss';

const Tag = function ({ url, text, count = null, ...restProps }) {
    return (
        <span className={styles['tag-item']} {...restProps}>
            <Link className={styles['tag-link']} href={url}>
                <span className={styles['tag-hash']}>#</span>
                <span className={styles['tag-text']}>{text}</span>
                {count != null && (
                    <span className={styles['tag-count']}>{count}</span>
                )}
            </Link>
        </span>
    );
};

Tag.propTypes = {
    url: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    count: PropTypes.number,
};

export default Tag;
