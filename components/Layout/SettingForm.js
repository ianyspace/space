import React, { useEffect, useState } from 'react';

import { formatMessage } from 'utils/i18n';
import { getSimpleTheme, setSimpleTheme } from 'utils/simpleTheme';
import {
    getThemeBackground,
    isCustomBackground,
    setThemeBackground,
    THEME_BACKGROUND_NONE,
    THEME_BACKGROUND_PRESETS,
    THEME_BACKGROUND_PRESET_STYLES,
    THEME_BACKGROUND_PRESET_PREFIX,
} from 'utils/themeBackground';
import { getFontChoice, setFontChoice, FONT_WENKAI, FONT_SYSTEM } from 'utils/fontChoice';
import { getListMode, setListMode, LIST_MODE_PAGINATION, LIST_MODE_SCROLL } from 'utils/listMode';
import { getLive2DEnabled, setLive2DEnabled } from 'utils/live2d';

import styles from './Setting.module.scss';

/**
 * Theme settings, rendered on its own page (`/setting/`).
 *
 * Sections run from "the list you read every day" outwards: list style → list
 * loading → body font → page background → Live2D character. Each setting is one
 * card holding an iOS-style segmented control; the line under the control
 * describes the *selected* option, because there is no room for two option
 * descriptions inside a segmented control.
 *
 * Every choice applies immediately and persists in localStorage.
 */
const SettingForm = function () {
    const [simple, setSimple] = useState(true);
    const [background, setBackground] = useState('');
    const [font, setFont] = useState(FONT_SYSTEM);
    // The site default is scroll loading (`utils/listMode.js`); starting there
    // avoids a visible jump from "pagination" during the first client render.
    const [listMode, setListModeState] = useState(LIST_MODE_SCROLL);
    // The site default is the character off (`utils/live2d.js`); starting there
    // avoids a visible jump from "on" during the first client render.
    const [live2d, setLive2dState] = useState(false);
    const [saved, setSaved] = useState(false);
    // Bumped on every change so the "saved" toast restarts its timer even when
    // the user keeps flipping options while it is already on screen.
    const [savedTick, setSavedTick] = useState(0);

    useEffect(() => {
        setSimple(getSimpleTheme());
        setBackground(getThemeBackground());
        setFont(getFontChoice());
        setListModeState(getListMode());
        setLive2dState(getLive2DEnabled());
    }, []);

    useEffect(() => {
        if (savedTick === 0) return undefined;
        setSaved(true);
        const timer = setTimeout(() => setSaved(false), 2000);
        return () => clearTimeout(timer);
    }, [savedTick]);

    const markSaved = () => setSavedTick((tick) => tick + 1);

    const onSelectStyle = (enabled) => {
        if (enabled === simple) return;
        setSimple(enabled);
        setSimpleTheme(enabled);
        markSaved();
    };

    const onSelectFont = (choice) => {
        if (choice === font) return;
        setFont(choice);
        setFontChoice(choice);
        markSaved();
    };

    const onSelectListMode = (mode) => {
        if (mode === listMode) return;
        setListModeState(mode);
        setListMode(mode);
        markSaved();
    };

    const onSelectLive2d = (enabled) => {
        if (enabled === live2d) return;
        setLive2dState(enabled);
        setLive2DEnabled(enabled);
        markSaved();
    };

    const onApplyBackground = () => {
        const value = background.trim();
        setBackground(value);
        // An empty field means "no background" (see utils/themeBackground.js).
        setThemeBackground(value);
        markSaved();
    };

    const onClearBackground = () => {
        setBackground(THEME_BACKGROUND_NONE);
        setThemeBackground(THEME_BACKGROUND_NONE);
        markSaved();
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
    const tSimpleOption = formatMessage('tSimpleOption');
    const tSimpleOptionDesc = formatMessage('tSimpleOptionDesc');
    const tCardOption = formatMessage('tCardOption');
    const tCardOptionDesc = formatMessage('tCardOptionDesc');
    const tFontTitle = formatMessage('tFontTitle');
    const tWenkaiOption = formatMessage('tWenkaiOption');
    const tWenkaiOptionDesc = formatMessage('tWenkaiOptionDesc');
    const tSystemOption = formatMessage('tSystemOption');
    const tSystemOptionDesc = formatMessage('tSystemOptionDesc');
    const tLoadTitle = formatMessage('tLoadTitle');
    const tLoadPagination = formatMessage('tLoadPagination');
    const tLoadPaginationDesc = formatMessage('tLoadPaginationDesc');
    const tLoadScroll = formatMessage('tLoadScroll');
    const tLoadScrollDesc = formatMessage('tLoadScrollDesc');
    const tBackgroundTitle = formatMessage('tBackgroundTitle');
    const tBackgroundDesc = formatMessage('tBackgroundDesc');
    const tBackgroundNone = formatMessage('tBackgroundNone');
    // The locale files name these `tCustomBackground*` (they predate the preset
    // picker); using the wrong id renders the raw key on the page.
    const tCustomBackground = formatMessage('tCustomBackground');
    const tCustomBackgroundDesc = formatMessage('tCustomBackgroundDesc');
    const tBackgroundPlaceholder = formatMessage('tBackgroundPlaceholder');
    const tLive2dTitle = formatMessage('tLive2dTitle');
    const tLive2dOn = formatMessage('tLive2dOn');
    const tLive2dOnDesc = formatMessage('tLive2dOnDesc');
    const tLive2dOff = formatMessage('tLive2dOff');
    const tLive2dOffDesc = formatMessage('tLive2dOffDesc');
    const tConfirm = formatMessage('tConfirm');
    const tClear = formatMessage('tClear');
    const tSaved = formatMessage('tSaved');

    const listStyleOptions = [
        { value: true, label: tSimpleOption, desc: tSimpleOptionDesc },
        { value: false, label: tCardOption, desc: tCardOptionDesc },
    ];
    const loadOptions = [
        { value: LIST_MODE_SCROLL, label: tLoadScroll, desc: tLoadScrollDesc },
        { value: LIST_MODE_PAGINATION, label: tLoadPagination, desc: tLoadPaginationDesc },
    ];
    const fontOptions = [
        { value: FONT_SYSTEM, label: tSystemOption, desc: tSystemOptionDesc },
        { value: FONT_WENKAI, label: tWenkaiOption, desc: tWenkaiOptionDesc },
    ];
    const live2dOptions = [
        { value: true, label: tLive2dOn, desc: tLive2dOnDesc },
        { value: false, label: tLive2dOff, desc: tLive2dOffDesc },
    ];

    /** Description of the currently selected option (falls back to the first). */
    const activeDesc = (options, current) =>
        (options.find((option) => option.value === current) || options[0]).desc;

    /**
     * iOS-style segmented control: one track, one sliding thumb.
     *
     * `options` is a list of `{ value, label, desc }` and `onSelect` receives the
     * raw *value*. It must never receive "is this the first option" booleans:
     * that flag is what used to be handed to `onSelectFont`/`onSelectListMode`,
     * whose `choice === font` guards compare it against the stored string and
     * bail out, so those two switches snapped straight back.
     */
    const renderSegmented = (label, options, current, onSelect) => {
        const activeIndex = Math.max(
            0,
            options.findIndex((option) => option.value === current),
        );

        return (
            <div className={styles.segmented} role="radiogroup" aria-label={label}>
                <span
                    className={styles['segmented-thumb']}
                    style={{ transform: `translateX(${activeIndex * 100}%)` }}
                    aria-hidden="true"
                />
                {options.map((option) => {
                    const active = option.value === current;
                    const className = active
                        ? `${styles['segmented-item']} ${styles['segmented-item-active']}`
                        : styles['segmented-item'];
                    return (
                        <button
                            key={String(option.value)}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={className}
                            onClick={() => onSelect(option.value)}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    const isPresetActive = (key) => background === `${THEME_BACKGROUND_PRESET_PREFIX}${key}`;

    return (
        <div className={styles['setting-page']}>
            <header className={styles['setting-header']}>
                <h1 className={styles['setting-header-title']}>{formatMessage('tThemeSetting')}</h1>
                <p className={styles['setting-header-desc']}>{tSettingsDesc}</p>
            </header>

            <section className={styles['setting-section']}>
                <h2 className={styles['setting-section-title']}>{tListStyle}</h2>
                <div className={styles['setting-card']}>
                    {renderSegmented(tListStyle, listStyleOptions, simple, onSelectStyle)}
                    {/* Caption for the *selected* option: a segmented control has
                        no room for a description under each label. */}
                    <p className={styles['setting-hint']}>
                        {activeDesc(listStyleOptions, simple)}
                    </p>
                </div>
            </section>

            <section className={styles['setting-section']}>
                <h2 className={styles['setting-section-title']}>{tLoadTitle}</h2>
                <div className={styles['setting-card']}>
                    {renderSegmented(tLoadTitle, loadOptions, listMode, onSelectListMode)}
                    <p className={styles['setting-hint']}>{activeDesc(loadOptions, listMode)}</p>
                </div>
            </section>

            <section className={styles['setting-section']}>
                <h2 className={styles['setting-section-title']}>{tFontTitle}</h2>
                <div className={styles['setting-card']}>
                    {renderSegmented(tFontTitle, fontOptions, font, onSelectFont)}
                    <p className={styles['setting-hint']}>{activeDesc(fontOptions, font)}</p>
                </div>
            </section>

            <section className={styles['setting-section']}>
                <h2 className={styles['setting-section-title']}>{tBackgroundTitle}</h2>
                <div className={styles['setting-card']}>
                    <div className={styles['bg-tiles']}>
                        {renderPresetTile(
                            'none',
                            tBackgroundNone,
                            background === THEME_BACKGROUND_NONE,
                            onClearBackground,
                            tBackgroundNone,
                        )}
                        {THEME_BACKGROUND_PRESETS.map((preset) =>
                            renderPresetTile(
                                preset.key,
                                preset.label,
                                isPresetActive(preset.key),
                                () => {
                                    const value = `${THEME_BACKGROUND_PRESET_PREFIX}${preset.key}`;
                                    setBackground(value);
                                    setThemeBackground(value);
                                    markSaved();
                                },
                                preset.label,
                            ),
                        )}
                    </div>
                    <p className={styles['setting-hint']}>{tBackgroundDesc}</p>

                    <div className={styles['setting-divider']} />

                    <h3 className={styles['setting-sub']}>{tCustomBackground}</h3>
                    <p className={styles['setting-hint']}>{tCustomBackgroundDesc}</p>
                    <div className={styles['setting-row']}>
                        <input
                            type="text"
                            className={styles['setting-input']}
                            value={isCustomBackground(background) ? background : ''}
                            placeholder={tBackgroundPlaceholder}
                            onChange={(event) => setBackground(event.target.value)}
                        />
                        <button
                            type="button"
                            className={styles['setting-primary']}
                            onClick={onApplyBackground}
                        >
                            {tConfirm}
                        </button>
                        <button
                            type="button"
                            className={styles['setting-ghost']}
                            onClick={onClearBackground}
                        >
                            {tClear}
                        </button>
                    </div>
                </div>
            </section>

            <section className={styles['setting-section']}>
                <h2 className={styles['setting-section-title']}>{tLive2dTitle}</h2>
                <div className={styles['setting-card']}>
                    {renderSegmented(tLive2dTitle, live2dOptions, live2d, onSelectLive2d)}
                    <p className={styles['setting-hint']}>{activeDesc(live2dOptions, live2d)}</p>
                </div>
            </section>

            {saved && (
                <p className={styles['setting-toast']} role="status">
                    <span className={styles['setting-toast-check']} aria-hidden="true">
                        ✓
                    </span>
                    {tSaved}
                </p>
            )}
        </div>
    );
};

export default SettingForm;
