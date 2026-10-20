import React from 'react';
import Link from 'next/link';

import withBasePath from 'utils/basePath';
import { formatMessage } from 'utils/i18n';

import styles from './Setting.module.scss';

/**
 * Sibling of `SettingButton`: the floating entry point to the 3D apartment
 * walkthrough (`pages/my-home/`). It sits to the left of the theme button and
 * only shows on the article list, so the model page itself keeps the full
 * viewport.
 */
const MyHomeButton = function () {
    const label = formatMessage('tMyHome');

    return (
        <Link className={styles['myhome-btn']} href="/my-home/" aria-label={label}>
            <img className={styles['myhome-icon']} src={withBasePath('/my-home.svg')} alt="" />
            <span className={styles['myhome-label']}>{label}</span>
        </Link>
    );
};

export default MyHomeButton;