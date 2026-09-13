import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { site, supportedLanguages } from 'config';
import { rhythm } from 'utils/typography';
import { formatMessage } from 'utils/i18n';

import LangButton from '../LangButton';
import LangList from '../LangList';
import Search from './Search';

import styles from './LanguageBar.module.scss';

/**
 * base MUST include a trailing slash (eg: `en/`).
 */
const LanguageBar = function ({ lang: langKey = 'en', base = '/' }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const router = useRouter();

    const handleToggleLanguage = React.useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    // Close when clicking anywhere outside the bar.
    useEffect(() => {
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    // Close on Escape and on navigation.
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        setOpen(false);
    }, [router.asPath]);

    const tTitle = formatMessage('title');

    const langsEntries = Object.entries(supportedLanguages);
    const defaultLang = site.lang;

    if (langsEntries.length < 2) {
        return null;
    }

    const language = supportedLanguages[langKey];

    if (!language) {
        return null;
    }

    return (
        <div
            id="top-bar"
            ref={rootRef}
            style={{
                maxWidth: rhythm(28),
                margin: 'auto',
                background: 'var(--bg)',
                position: 'absolute',
                top: '0px',
                zIndex: '99',
                width: '100%',
                transition: 'transform 0.5s',
            }}
        >
            <div className={styles.bar}>
                <Link
                    style={{
                        boxShadow: 'none',
                        textDecoration: 'none',
                        color: 'rgb(255, 167, 196)',
                    }}
                    href={base}
                >
                    <span id="home-link" style={{ display: 'none', fontWeight: '900' }}>
                        {tTitle}
                    </span>
                </Link>
                <div className={styles.actions}>
                    <Search />
                    <LangButton lang={language} focused={open} onClick={handleToggleLanguage} />
                </div>
            </div>
            <div className={`${styles.dropdown} ${open ? styles['dropdown-open'] : ''}`}>
                <LangList languages={supportedLanguages} langKey={defaultLang} current={langKey} />
            </div>
        </div>
    );
};

LanguageBar.propTypes = {
    lang: PropTypes.string,
    base: PropTypes.string,
};

export default LanguageBar;
