/**
 * Page background, shared between the settings page (which writes it) and
 * `components/Layout/ThemeBackground.js` (which renders it).
 *
 * The stored value is either:
 *   - `none`                        explicit "no background"
 *   - `preset:<key>`                one of the built-in CSS backgrounds below
 *   - anything else                 treated as a custom image URL
 *
 * A missing key means "never chosen" and falls back to `THEME_BACKGROUND_DEFAULT`
 * (the kraft preset), which is why "no background" has to be stored as its own
 * value instead of by deleting the key.
 *
 * Because settings and background live on different routes, a plain React state
 * would not stay in sync: writing dispatches a window event so the currently
 * mounted background updates immediately instead of only after a navigation.
 */
export const THEME_BACKGROUND_KEY = 'themeBackgroundUrl';
export const THEME_BACKGROUND_EVENT = 'theme-background-change';
export const THEME_BACKGROUND_PRESET_PREFIX = 'preset:';
export const THEME_BACKGROUND_NONE = 'none';
/** Site default, both when nothing is stored and after a `''` write. */
export const THEME_BACKGROUND_DEFAULT = `${THEME_BACKGROUND_PRESET_PREFIX}kraft`;

/** Built-in background presets (rendered by `ThemeBackground.js`); default first. */
export const THEME_BACKGROUND_PRESETS = [
    { key: 'kraft', label: '牛皮纸' },
    { key: 'grid', label: '网格' },
    { key: 'lines', label: '横线' },
    { key: 'dots', label: '点阵' },
];

/**
 * Pure-CSS looks for each preset. Shared by the live background and the
 * settings-page swatches. `--preset-line` / `--preset-dot` are theme vars
 * (global.scss), so every preset adapts to light and dark themes.
 */
export const THEME_BACKGROUND_PRESET_STYLES = {
    grid: {
        backgroundImage:
            'linear-gradient(var(--preset-line) 1px, transparent 1px), linear-gradient(90deg, var(--preset-line) 1px, transparent 1px)',
        backgroundSize: '26px 26px, 26px 26px',
    },
    lines: {
        backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0 30px, var(--preset-line) 30px 31px)',
    },
    dots: {
        backgroundImage: 'radial-gradient(var(--preset-dot) 1.4px, transparent 1.5px)',
        backgroundSize: '20px 20px',
    },
    kraft: {
        backgroundColor: 'rgba(176, 136, 84, 0.18)',
        backgroundImage:
            'repeating-linear-gradient(105deg, rgba(120, 85, 40, 0.05) 0 2px, transparent 2px 6px), repeating-linear-gradient(15deg, rgba(255, 235, 200, 0.06) 0 3px, transparent 3px 8px)',
    },
};

export const isPresetBackground = (value) =>
    typeof value === 'string' && value.startsWith(THEME_BACKGROUND_PRESET_PREFIX);

export const presetBackgroundKey = (value) =>
    isPresetBackground(value) ? value.slice(THEME_BACKGROUND_PRESET_PREFIX.length) : null;

/** True only for a custom image URL (not a preset, not the "none" marker). */
export const isCustomBackground = (value) =>
    typeof value === 'string' &&
    value !== '' &&
    value !== THEME_BACKGROUND_NONE &&
    !isPresetBackground(value);

/**
 * @returns {string} the configured background value
 * (`none` / `preset:x` / image URL), or the site default when nothing is stored.
 */
export function getThemeBackground() {
    if (typeof window === 'undefined') return THEME_BACKGROUND_DEFAULT;
    try {
        const stored = window.localStorage.getItem(THEME_BACKGROUND_KEY);
        return stored == null ? THEME_BACKGROUND_DEFAULT : stored;
    } catch (err) {
        return THEME_BACKGROUND_DEFAULT;
    }
}

/**
 * Stores the background and notifies listeners. Empty input means "no
 * background" (`THEME_BACKGROUND_NONE`), not "back to the site default" —
 * the settings page's preset tiles are how you get back to the default.
 */
export function setThemeBackground(value) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(THEME_BACKGROUND_KEY, value || THEME_BACKGROUND_NONE);
    } catch (err) {
        /* storage disabled (private mode): still emit the event so the UI reacts */
    }
    window.dispatchEvent(new Event(THEME_BACKGROUND_EVENT));
}
