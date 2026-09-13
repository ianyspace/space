import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';

import styles from './LangList.module.scss';

/**
 * `langKey` is the site default language (it decides each entry's URL),
 * `current` is the language of the page being viewed and gets the check mark.
 */
const LangList = function ({ languages, langKey, current = null }) {
    return (
        <div className={styles['lang-root']} role="menu">
            {Object.keys(languages).map((lang) => {
                const url = lang === langKey ? '/' : `/${lang}/`;
                const isCurrent = lang === current;

                return (
                    <Link
                        key={lang}
                        href={url}
                        role="menuitem"
                        className={`${styles['lang-link']} ${isCurrent ? styles['is-current'] : ''}`}
                    >
                        <span>{languages[lang]}</span>
                        {isCurrent ? (
                            <span className={styles['lang-check']} aria-hidden="true">
                                ✓
                            </span>
                        ) : null}
                    </Link>
                );
            })}
        </div>
    );
};

LangList.propTypes = {
    languages: PropTypes.object.isRequired,
    langKey: PropTypes.string.isRequired,
    current: PropTypes.string,
};

export default LangList;
