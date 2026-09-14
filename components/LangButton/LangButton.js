import React from 'react';
import PropTypes from 'prop-types';

import styles from './LangButton.module.scss';

const IconLanguage = function (props) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            <path
                fill="currentColor"
                d="M12.87 15.07l-2.54-2.51.03-.03a17.52 17.52 0 0 0 3.98-6.61H17V4h-6V2H9v2H3v1.99h8.17a15.6 15.6 0 0 1-3.34 5.36 15.3 15.3 0 0 1-2.44-3.36H3.42a17.3 17.3 0 0 0 3.2 4.62l-5.47 5.4L2.57 20l5.47-5.47 3.4 3.4.43-.86zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
            />
        </svg>
    );
};

const LangButton = function ({
    lang = 'English',
    onClick = null,
    focused = false,
    ...restProps
}) {
    const focusedClass = focused ? styles['language-focused'] : '';
    return (
        <div
            className={`${styles.language} ${focusedClass}`}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick?.(event);
                }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={focused}
            {...restProps}
        >
            <IconLanguage className={styles.icon} />
            <span>{lang}</span>
        </div>
    );
};

LangButton.propTypes = {
    lang: PropTypes.string,
    onClick: PropTypes.func,
    focused: PropTypes.bool,
};

export default LangButton;
