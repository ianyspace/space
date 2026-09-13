import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';

import { site, supportedLanguages } from 'config';
import { rhythm } from 'utils/typography';
import { formatMessage } from 'utils/i18n';

import LangButton from '../LangButton';
import BalloonField from '../BalloonField';
import LangList from '../LangList';
import Search from './Search';

import styles from './LanguageBar.module.scss';

/**
 * base MUST include a trailing slash (eg: `en/`).
 */
const LanguageBar = function ({ lang: langKey = 'en', base = '/' }) {
    const [displayLang, toggleDisplayLang] = useState(false);

    const handleToggleLanguage = React.useCallback(() => {
        toggleDisplayLang((prev) => !prev);
    }, []);

    let toggleStyle = {
        maxHeight: null,
    };
    if (displayLang) {
        toggleStyle = {
            maxHeight: 200,
            overflow: 'initial',
        };
    }
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
                    <LangButton lang={language} focused={displayLang} onClick={handleToggleLanguage} />
                </div>
            </div>
            <div className={styles['toggle-content']} style={toggleStyle}>
                <BalloonField style={{ padding: 20 }}>
                    <LangList languages={supportedLanguages} langKey={defaultLang} />
                </BalloonField>
            </div>
        </div>
    );
};

LanguageBar.propTypes = {
    lang: PropTypes.string,
    base: PropTypes.string,
};

export default LanguageBar;
