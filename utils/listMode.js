/**
 * Article list loading mode, persisted in localStorage and read by
 * `templates/BlogIndex.js`.
 *
 * The site default stays `pagination` (the classic page links); the settings
 * page offers `scroll` (infinite scroll) for readers who prefer to keep
 * scrolling. Kept in one place because both the homepage and the settings page
 * have to agree on the key and the values.
 */
export const LIST_MODE_KEY = 'listMode';
export const LIST_MODE_PAGINATION = 'pagination';
export const LIST_MODE_SCROLL = 'scroll';

/** @returns {'pagination' | 'scroll'} the saved choice, defaulting to pagination. */
export function getListMode() {
    if (typeof window === 'undefined') return LIST_MODE_PAGINATION;
    try {
        return window.localStorage.getItem(LIST_MODE_KEY) === LIST_MODE_SCROLL
            ? LIST_MODE_SCROLL
            : LIST_MODE_PAGINATION;
    } catch (err) {
        return LIST_MODE_PAGINATION;
    }
}

export function setListMode(mode) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LIST_MODE_KEY, mode === LIST_MODE_SCROLL ? LIST_MODE_SCROLL : LIST_MODE_PAGINATION);
    } catch (err) {
        /* storage disabled (private mode): keep the default instead of crashing */
    }
}
