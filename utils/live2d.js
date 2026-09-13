/**
 * Corner Live2D character (`public/live2d-jaran.js` + `public/live2d-lib/pio.js`),
 * shared between the settings page (which writes it) and `pages/_app.js` (which
 * decides whether to load it at all).
 *
 * The vendored bundle is a self-running script that pulls several CDN libraries
 * and then builds its own `.pio-container` DOM. It cannot be un-run, so "off" is
 * handled in two layers:
 *
 *  1. **Loading** — `_app.js` only mounts the loader script while this preference
 *     is on, so with it off the CDN libraries and the model are never fetched at
 *     all (from the next full page load onwards: `_app` mounts once per document).
 *  2. **An already loaded model** — switching the setting off while browsing
 *     flips `live2d-off` on `<body>` and `styles/global.scss` hides
 *     `.pio-container`, so the character disappears immediately.
 *
 * Turning it back on un-hides the character, or (when this page load never had
 * the script) injects the loader, which is safe because it means the bundle has
 * never run in this document.
 */

import withBasePath from 'utils/basePath';

export const LIVE2D_KEY = 'live2dEnabled';
export const LIVE2D_OFF_CLASS = 'live2d-off';
export const LIVE2D_SCRIPT = '/live2d-jaran.js';

/** @returns {boolean} whether the character should be shown (default: yes). */
export function getLive2DEnabled() {
    if (typeof window === 'undefined') return true;
    try {
        // Everything but an explicit `'0'` keeps the site default (on).
        return window.localStorage.getItem(LIVE2D_KEY) !== '0';
    } catch (err) {
        return true;
    }
}

/** True once the bundle ran in this document (it defines the global `Paul_Pio`). */
function isLive2dBooted() {
    if (typeof window === 'undefined') return true;
    return (
        typeof window.Paul_Pio === 'function' ||
        document.querySelector('.pio-container, #pio-container') != null
    );
}

/** Loads the bundle on demand — only reached when this page load did not. */
function bootLive2D() {
    if (isLive2dBooted() || document.querySelector('script[src*="live2d-jaran.js"]')) return;

    const script = document.createElement('script');
    script.src = withBasePath(LIVE2D_SCRIPT);
    script.async = true;
    document.body.appendChild(script);
}

/**
 * Persists the choice and applies it to the current page.
 * @param {boolean} enabled
 */
export function setLive2DEnabled(enabled) {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(LIVE2D_KEY, enabled ? '1' : '0');
    } catch (err) {
        /* storage disabled (private mode): still apply it to the current page */
    }

    document.body.classList.toggle(LIVE2D_OFF_CLASS, !enabled);
    if (enabled) bootLive2D();
}
