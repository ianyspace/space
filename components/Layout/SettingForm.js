import React, { useEffect, useState } from 'react';

import { formatMessage } from 'utils/i18n';
import { getSimpleTheme, setSimpleTheme } from 'utils/simpleTheme';
import {
    getThemeBackground,
    setThemeBackground,
    THEME_BACKGROUND_PRESETS,
    THEME_BACKGROUND_PRESET_STYLES,
    THEME_BACKGROUND_PRESET_PREFIX,
} from 'utils/themeBackground';
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
 * Sections are ordered from "what you see everywhere" to "fine tuning":
 * list layout → body font → list loading → background (presets, then a custom
 * image URL). Every choice applies immediately and persists in localStorage.
 *
 * Multi-choice settings are two-option segmented controls instead of bare
 * toggles: a switch alone never says which side is "on".
 */
const SettingForm = function () {
    const [simple, setSimple] = useState(true);
    const [background, setBackground] = useState('');
    const [font, setFont] = useState(FONT_SYSTEM);
    const [listMode, setListModeState] = useState(LIST_MODE_PAGINATION);
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

    /** Preset swatch: paints the shared preset CSS into the small tile. */
    const renderPresetTile = (key, label, active, onClick, ariaLabel) => (
        <button
            key={key}
            type="button"
            className={`${styles['bg-tile']} ${active ? styles['bg-tile-active'] : ''}`}
            onClick={onClick}
            aria-label={ariaLabel}
            aria-pressed={active}
        >
            <span className={styles['bg-tile-look']} style={THEME_BACKGROUND_PRESET_STYLES[key] || {}} />
            <span className={styles['bg-tile-label']}>{label}</span>
        </button>
    );

    // `formatMessage` is a hook (it reads the language context), so every message
    // is resolved unconditionally: calling one inside a conditional branch would
    // change the hook order between renders.
    const tSettingsDesc = formatMessage('tSettingsDesc');
    const tListStyle = formatMessage('tListStyle');
    const tListStyleDesc = formatMessage('tListStyleDesc');
    const tSimpleOption = formatMessage('tSimpleOption');
    const tSimpleOptionDesc = formatMessage('tSimpleOptionDesc');
    const tCardOption = formatMessage('tCardOption');
    const tCardOptionDesc = formatMessage('tCardOptionDesc');
    const tFontTitle = formatMessage('tFontTitle');
    const tFontDesc = formatMessage('tFontDesc');
    const tWenkaiOption = formatMessage('tWenkaiOption');
    const tWenkaiOptionDesc = formatMessage('tWenkaiOptionDesc');
    const tSystemOption = formatMessage('tSystemOption');
    const tSystemOptionDesc = formatMessage('tSystemOptionDesc');
    const tLoadTitle = formatMessage('tLoadTitle');
    const tLoadDesc = formatMessage('tLoadDesc');
    const tLoadPagination = formatMessage('tLoadPagination');
    const tLoadPaginationDesc = formatMessage('tLoadPaginationDesc');
    const tLoadScroll = formatMessage('tLoadScroll');
    const tLoadScrollDesc = formatMessage('tLoadScrollDesc');
    const tBackgroundTitle = formatMessage('tBackgroundTitle');
    const tBackgroundDesc = formatMessage('tBackgroundDesc');
    const tBackgroundNone = formatMessage('tBackgroundNone');
    const tBackgroundCustom = formatMessage('tBackgroundCustom');
    const tBackgroundCustomDesc = formatMessage('tBackgroundCustomDesc');
    const tBackgroundPlaceholder = formatMessage('tBackgroundPlaceholder');
    const tConfirm = formatMessage('tConfirm');
    const tClear = formatMessage('tClear');
    const tSaved = formatMessage('tSaved');

    /** `setting-option` plus the active modifier while this option is selected. */
    const optionClass = (active) =>
        active
            ? `${styles['setting-option']} ${styles['setting-option-active']}`
            : styles['setting-option'];

    const renderRadioPair = (label, valueA, titleA, descA, valueB, titleB, descB, onSelect) => (
        <div className={styles['setting-options']} role="radiogroup" aria-label={label}>
            <button
                type="button"
                role="radio"
                aria-checked={valueA}
                className={optionClass(valueA)}
                onClick={() => onSelect(valueA)}
            >
                <span className={styles['setting-option-title']}>
                    {titleA}
                    <span className={styles['setting-option-mark']} aria-hidden="true">
                        {valueA ? '✓' : ''}
                    </span>
                </span>
                <span className={styles['setting-option-desc']}>{descA}</span>
            </button>
            <button
                type="button"
                role="radio"
                aria-checked={valueB}
                className={optionClass(valueB)}
                onClick={() => onSelect(valueB)}
            >
                <span className={styles['setting-option-title']}>
                    {titleB}
                    <span className={styles['setting-option-mark']} aria-hidden="true">
                        {valueB ? '✓' : ''}
                    </span>
                </span>
                <span className={styles['setting-option-desc']}>{descB}</span>
            </button>
        </div>
    );

    const isPresetBackground = (key) => background === `${THEME_BACKGROUND_PRESET_PREFIX}${key}`;

    return (
        <div className={styles['setting-page']}>
            <header className={styles['setting-header']}>
                <h1 className={styles['setting-header-title']}>{formatMessage('tThemeSetting')}</h1>
                <p className={styles['setting-header-desc']}>{tSettingsDesc}</p>
            </header>

            <section className={styles['setting-card']}>
                <h2>{tListStyle}</h2>
                <p className={styles['setting-hint']}>{tListStyleDesc}</p>
                {renderRadioPair(tListStyle, simple, tSimpleOption, tSimpleOptionDesc, !simple, tCardOption, tCardOptionDesc, onSelectStyle)}
            </section>

            <section className={styles['setting-card']}>
                <h2>{tFontTitle}</h2>
                <p className={styles['setting-hint']}>{tFontDesc}</p>
                {renderRadioPair(tFontTitle, font === FONT_SYSTEM, tSystemOption, tSystemOptionDesc, font === FONT_WENKAI, tWenkaiOption, tWenkaiOptionDesc, onSelectFont)}
            </section>

            <section className={styles['setting-card']}>
                <h2>{tLoadTitle}</h2>
                <p className={styles['setting-hint']}>{tLoadDesc}</p>
                {renderRadioPair(tLoadTitle, listMode === LIST_MODE_PAGINATION, tLoadPagination, tLoadPaginationDesc, listMode === LIST_MODE_SCROLL, tLoadScroll, tLoadScrollDesc, onSelectListMode)}
            </section>

            <section className={styles['setting-card']}>
                <h2>{tBackgroundTitle}</h2>
                <p className={styles['setting-hint']}>{tBackgroundDesc}</p>
                <div className={styles['bg-tiles']}>
                    {renderPresetTile('none', tBackgroundNone, background === '', onClearBackground, tBackgroundNone)}
                    {THEME_BACKGROUND_PRESETS.map((preset) =>
                        renderPresetTile(
                            preset.key,
                            preset.label,
                            isPresetBackground(preset.key),
                            () => {
                                const value = `${THEME_BACKGROUND_PRESET_PREFIX}${preset.key}`;
                                setBackground(value);
                                setThemeBackground(value);
                                setSaved(true);
                            },
                            preset.label,
                        ),
                    )}
                </div>

                <h3 className={styles['setting-sub']}>{tBackgroundCustom}</h3>
                <p className={styles['setting-hint']}>{tBackgroundCustomDesc}</p>
                <div className={styles['setting-row']}>
                    <input
                        type="text"
                        className={styles['setting-input']}
                        value={background.startsWith(THEME_BACKGROUND_PRESET_PREFIX) ? '' : background}
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
