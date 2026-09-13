import React from 'react';
import Link from 'next/link';

import withBasePath from 'utils/basePath';
import { formatMessage } from 'utils/i18n';

import styles from './Setting.module.scss';

/**
 * Floating entry point to the theme settings, pinned to the bottom right corner
 * of every page.
 *
 * It used to open an inline popup; the settings now live on their own page
 * (`pages/setting.js`), which keeps the popup markup and its preset background
 * picker out of the article list.
 */
const SettingButton = function () {
    const label = formatMessage('tThemeSetting');

    return (
        <Link className={styles['setting-btn']} href="/setting/" aria-label={label}>
            <img className={styles['setting-icon']} src={withBasePath('/setting.svg')} alt="" />
            <span className={styles['setting-label']}>{label}</span>
        </Link>
    );
};

export default SettingButton;
