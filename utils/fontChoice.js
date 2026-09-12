/**
 * Body font choice, persisted in localStorage and applied by toggling the
 * `font-wenkai` class on <body> (see `styles/global.scss` for what that class
 * overrides).
 *
 * The default is the OS system font; the settings page offers `wenkai`
 * (LXGW WenKai Screen, loaded in `_document.js`) for readers who prefer the
 * handwriting style. Kept in one place because both the settings page and the
 * boot script (`utils/themeOper.js`) have to agree on the key and the values.
 */
export const FONT_CHOICE_KEY = 'fontChoice';
export const FONT_WENKAI = 'wenkai';
export const FONT_SYSTEM = 'system';

/** @returns {'wenkai' | 'system'} the saved choice, defaulting to system. */
export function getFontChoice() {
    if (typeof window === 'undefined') return FONT_SYSTEM;
    try {
        return window.localStorage.getItem(FONT_CHOICE_KEY) === FONT_WENKAI
            ? FONT_WENKAI
            : FONT_SYSTEM;
    } catch (err) {
        return FONT_SYSTEM;
    }
}

/**
 * Persists the choice and applies it immediately. The actual class toggle and
 * storage write live in `themeOper` so the boot script and runtime changes
 * share one implementation; `window.__setPreferredFont` always exists on
 * client pages because `_document.js` runs that script inline before paint.
 */
export function setFontChoice(choice) {
    if (typeof window === 'undefined') return;
    const normalized = choice === FONT_WENKAI ? FONT_WENKAI : FONT_SYSTEM;
    if (typeof window.__setPreferredFont === 'function') {
        window.__setPreferredFont(normalized);
        return;
    }
    /* Fallback for a stale cached document without the boot script. */
    try {
        window.localStorage.setItem(FONT_CHOICE_KEY, normalized);
        document.body.classList.toggle('font-wenkai', normalized === FONT_WENKAI);
    } catch (err) {
        /* storage disabled: keep the default instead of crashing */
    }
}
