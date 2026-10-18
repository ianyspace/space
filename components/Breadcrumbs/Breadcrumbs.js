import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { formatMessage } from 'utils/i18n';

import styles from './Breadcrumbs.module.scss';

const Breadcrumbs = function ({
    data = null,
    showTop = false,
    base = '',
    langKey = 'en',
    ...restProps
}) {
    const tHome = formatMessage('tHome');

    if (data == null) {
        return null;
    }

    let topBCli;
    if (showTop) {
        topBCli = (
            <li className={styles['breadcrumbs-item']}>
                <Link href={base} className={styles['breadcrumbs-element']}>
                    {tHome}
                </Link>
            </li>
        );
    }

    return (
        <ul className={`${styles.breadcrumbs} ${styles['breadcrumbs-ul']}`} {...restProps}>
            {topBCli}
            {data.map(({ text, url }) => {
                if (url != null) {
                    return (
                        <li className={styles['breadcrumbs-item']} key={text}>
                            <Link href={url} className={styles['breadcrumbs-element']}>
                                {text}
                            </Link>
                        </li>
                    );
                }
                return (
                    <li className={styles['breadcrumbs-item_active']} key={text}>
                        <span className={styles['breadcrumbs-element']}>{text}</span>
                    </li>
                );
            })}
        </ul>
    );
};

Breadcrumbs.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            text: PropTypes.string.isRequired,
            url: PropTypes.string,
        }),
    ),
    showTop: PropTypes.bool,
    base: PropTypes.string,
    langKey: PropTypes.string,
};

export default Breadcrumbs;
