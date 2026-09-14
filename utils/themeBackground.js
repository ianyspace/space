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
    { key: 'kraft', label: '牛皮纸（默认）' },
    { key: 'rice', label: '宣纸' },
    { key: 'parchment', label: '羊皮纸' },
    { key: 'recycled', label: '再生纸' },
    { key: 'crease', label: '褶皱纸' },
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
    // Rice paper: warm white tint with sparse fiber specks and short grain strokes.
    rice: {
        backgroundColor: 'rgba(226, 218, 200, 0.16)',
        backgroundImage:
            'radial-gradient(rgba(130, 118, 96, 0.08) 1px, transparent 1.6px), radial-gradient(rgba(130, 118, 96, 0.05) 1px, transparent 1.4px), repeating-linear-gradient(94deg, rgba(130, 118, 96, 0.045) 0 1px, transparent 1px 6px), repeating-linear-gradient(176deg, rgba(130, 118, 96, 0.035) 0 1px, transparent 1px 8px)',
        backgroundSize: '26px 22px, 18px 30px, auto, auto',
    },
    // Parchment: aged tan with soft mottled stains and faint diagonal fibres.
    parchment: {
        backgroundColor: 'rgba(190, 155, 95, 0.14)',
        backgroundImage:
            'radial-gradient(rgba(150, 110, 60, 0.10) 0, rgba(150, 110, 60, 0) 62%), radial-gradient(rgba(215, 180, 125, 0.10) 0, rgba(215, 180, 125, 0) 58%), repeating-linear-gradient(63deg, rgba(140, 100, 50, 0.04) 0 2px, transparent 2px 9px)',
        backgroundSize: '170px 150px, 130px 190px, auto',
    },
    // Recycled paper: grey base flecked with tiny multi-colour pulp fibres.
    recycled: {
        backgroundColor: 'rgba(150, 148, 140, 0.12)',
        backgroundImage:
            'radial-gradient(rgba(90, 105, 80, 0.20) 1px, transparent 1.4px), radial-gradient(rgba(150, 95, 60, 0.16) 1px, transparent 1.3px), radial-gradient(rgba(75, 85, 115, 0.13) 0.9px, transparent 1.2px)',
        backgroundSize: '31px 27px, 43px 37px, 23px 41px',
    },
    // Creased paper: soft fold ridges (light/dark hairlines) crossing at angles.
    crease: {
        backgroundColor: 'rgba(165, 158, 145, 0.08)',
        backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255, 255, 255, 0.055) 0 2px, rgba(0, 0, 0, 0.05) 2px 4px, transparent 4px 86px), repeating-linear-gradient(24deg, rgba(0, 0, 0, 0.04) 0 2px, rgba(255, 255, 255, 0.045) 2px 4px, transparent 4px 124px)',
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
