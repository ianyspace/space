import React, { useEffect, useState } from 'react';

import { formatMessage } from 'utils/i18n';
import { getSimpleTheme, setSimpleTheme } from 'utils/simpleTheme';
import { getThemeBackground, setThemeBackground } from 'utils/themeBackground';
import { getFontChoice, setFontChoice, FONT_WENKAI, FONT_SYSTEM } from 'utils/fontChoice';
import {
    getListMode,
    setListMode,
    LIST_MODE_PAGINATION,
    LIST_MODE_SCROLL,
} from 'utils/listMode';

import styles from './Setting.module.scss';

/**
 * Theme settings, rendered on its own page (`/setting/`).
 *
 * The list style is a two-option segmented control instead of a bare toggle: a
 * switch alone never says which side is "on", which made it impossible to tell
 * whether the compact ("极简风") list was active.
 *
 * The three preset backgrounds the old inline popup offered have been removed.
 */
const SettingForm = function () {
    const [simple, setSimple] = useState(true);
    const [background, setBackground] = useState('');
    const [font, setFont] = useState(FONT_WENKAI);
    const [listMode, setListModeState] = useState(LIST_MODE_SCROLL);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSimple(getSimpleTheme());
        setBackground(getThemeBackground());
        setFont(getFontChoice());
        setListModeState(getListMode());
    }, []);

    useEffect(() => {
        if (!saved) return undefined;
        const timer = setTimeout(() => setSaved(false), 2000);
        return () => clearTimeout(timer);
    }, [saved]);

    const onSelectStyle = (enabled) => {
        if (enabled === simple) return;
        setSimple(enabled);
        setSimpleTheme(enabled);
        setSaved(true);
    };

    const onSelectFont = (choice) => {
        if (choice === font) return;
        setFont(choice);
        setFontChoice(choice);
        setSaved(true);
    };

    const onSelectListMode = (mode) => {
        if (mode === listMode) return;
        setListModeState(mode);
        setListMode(mode);
        setSaved(true);
    };

    const onApplyBackground = () => {
        setThemeBackground(background.trim());
        setSaved(true);
    };

    const onClearBackground = () => {
        setBackground('');
        setThemeBackground('');
        setSaved(true);
    };

    // `formatMessage` is a hook (it reads the language context), so every message
    // is resolved unconditionally: calling one inside a conditional branch would
    // change the hook order between renders.
    const tListStyle = formatMessage('tListStyle');
    const tListStyleDesc = formatMessage('tListStyleDesc');
    const tSimpleOption = formatMessage('tSimpleOption');
    const tSimpleOptionDesc = formatMessage('tSimpleOptionDesc');
    const tCardOption = formatMessage('tCardOption');
    const tCardOptionDesc = formatMessage('tCardOptionDesc');
    const tCurrentStyle = formatMessage(
        'tfCurrentStyle',
        simple ? tSimpleOption : tCardOption,
    );
    const tCustomBackground = formatMessage('tCustomBackground');
    const tCustomBackgroundDesc = formatMessage('tCustomBackgroundDesc');
    const tBackgroundPlaceholder = formatMessage('tBackgroundPlaceholder');
    const tFontTitle = formatMessage('tFontTitle');
    const tFontDesc = formatMessage('tFontDesc');
    const tWenkaiOption = formatMessage('tWenkaiOption');
    const tWenkaiOptionDesc = formatMessage('tWenkaiOptionDesc');
    const tSystemOption = formatMessage('tSystemOption');
    const tSystemOptionDesc = formatMessage('tSystemOptionDesc');
    const tCurrentFont = formatMessage('tfCurrentFont', font === FONT_SYSTEM ? tSystemOption : tWenkaiOption);
    const tLoadTitle = formatMessage('tLoadTitle');
    const tLoadDesc = formatMessage('tLoadDesc');
    const tLoadPagination = formatMessage('tLoadPagination');
    const tLoadPaginationDesc = formatMessage('tLoadPaginationDesc');
    const tLoadScroll = formatMessage('tLoadScroll');
    const tLoadScrollDesc = formatMessage('tLoadScrollDesc');
    const tConfirm = formatMessage('tConfirm');
    const tClear = formatMessage('tClear');
    const tSaved = formatMessage('tSaved');

    /** `setting-option` plus the active modifier while this option is selected. */
    const optionClass = (active) =>
        active
            ? `${styles['setting-option']} ${styles['setting-option-active']}`
            : styles['setting-option'];

    return (
        <div className={styles['setting-page']}>
            <section className={styles['setting-card']}>
                <h2>{tListStyle}</h2>
                <p className={styles['setting-hint']}>{tListStyleDesc}</p>
                <div className={styles['setting-options']} role="radiogroup" aria-label={tListStyle}>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={simple}
                        className={optionClass(simple)}
                        onClick={() => onSelectStyle(true)}
                    >
                        <span className={styles['setting-option-title']}>
                            {tSimpleOption}
                            <span className={styles['setting-option-mark']} aria-hidden="true">
                                {simple ? '✓' : ''}
                            </span>
                        </span>
                        <span className={styles['setting-option-desc']}>{tSimpleOptionDesc}</span>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={!simple}
                        className={optionClass(!simple)}
                        onClick={() => onSelectStyle(false)}
                    >
                        <span className={styles['setting-option-title']}>
                            {tCardOption}
                            <span className={styles['setting-option-mark']} aria-hidden="true">
                                {simple ? '' : '✓'}
                            </span>
                        </span>
                        <span className={styles['setting-option-desc']}>{tCardOptionDesc}</span>
                    </button>
                </div>
                <p className={styles['setting-current']}>{tCurrentStyle}</p>
            </section>

            <section className={styles['setting-card']}>
                <h2>{tFontTitle}</h2>
                <p className={styles['setting-hint']}>{tFontDesc}</p>
                <div className={styles['setting-options']} role="radiogroup" aria-label={tFontTitle}>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={font === FONT_SYSTEM}
                        className={optionClass(font === FONT_SYSTEM)}
                        onClick={() => onSelectFont(FONT_SYSTEM)}
                    >
                        <span className={styles['setting-option-title']}>
                            {tSystemOption}
                            <span className={styles['setting-option-mark']} aria-hidden="true">
                                {font === FONT_SYSTEM ? '✓' : ''}
                            </span>
                        </span>
                        <span className={styles['setting-option-desc']}>{tSystemOptionDesc}</span>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={font === FONT_WENKAI}
                        className={optionClass(font === FONT_WENKAI)}
                        onClick={() => onSelectFont(FONT_WENKAI)}
                    >
                        <span className={styles['setting-option-title']}>
                            {tWenkaiOption}
                            <span className={styles['setting-option-mark']} aria-hidden="true">
                                {font === FONT_WENKAI ? '✓' : ''}
                            </span>
                        </span>
                        <span className={styles['setting-option-desc']}>{tWenkaiOptionDesc}</span>
                    </button>
                </div>
                <p className={styles['setting-current']}>{tCurrentFont}</p>
            </section>

            <section className={styles['setting-card']}>
                <h2>{tLoadTitle}</h2>
                <p className={styles['setting-hint']}>{tLoadDesc}</p>
                <div className={styles['setting-options']} role="radiogroup" aria-label={tLoadTitle}>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={listMode === LIST_MODE_PAGINATION}
                        className={optionClass(listMode === LIST_MODE_PAGINATION)}
                        onClick={() => onSelectListMode(LIST_MODE_PAGINATION)}
                    >
                        <span className={styles['setting-option-title']}>
                            {tLoadPagination}
                            <span className={styles['setting-option-mark']} aria-hidden="true">
                                {listMode === LIST_MODE_PAGINATION ? '✓' : ''}
                            </span>
                        </span>
                        <span className={styles['setting-option-desc']}>{tLoadPaginationDesc}</span>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={listMode === LIST_MODE_SCROLL}
                        className={optionClass(listMode === LIST_MODE_SCROLL)}
                        onClick={() => onSelectListMode(LIST_MODE_SCROLL)}
                    >
                        <span className={styles['setting-option-title']}>
                            {tLoadScroll}
                            <span className={styles['setting-option-mark']} aria-hidden="true">
                                {listMode === LIST_MODE_SCROLL ? '✓' : ''}
                            </span>
                        </span>
                        <span className={styles['setting-option-desc']}>{tLoadScrollDesc}</span>
                    </button>
                </div>
            </section>

            <section className={styles['setting-card']}>
                <h2>{tCustomBackground}</h2>
                <p className={styles['setting-hint']}>{tCustomBackgroundDesc}</p>
                <div className={styles['setting-row']}>
                    <input
                        type="text"
                        className={styles['setting-input']}
                        value={background}
                        placeholder={tBackgroundPlaceholder}
                        onChange={(event) => setBackground(event.target.value)}
                    />
                    <button type="button" className={styles['setting-primary']} onClick={onApplyBackground}>
                        {tConfirm}
                    </button>
                    <button type="button" className={styles['setting-ghost']} onClick={onClearBackground}>
                        {tClear}
                    </button>
                </div>
                {saved && <p className={styles['setting-saved']}>{tSaved}</p>}
            </section>
        </div>
    );
};

export default SettingForm;
