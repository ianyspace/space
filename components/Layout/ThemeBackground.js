import React, { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { site } from 'config';
import {
    getThemeBackground,
    isCustomBackground,
    presetBackgroundKey,
    THEME_BACKGROUND_EVENT,
    THEME_BACKGROUND_PRESET_STYLES,
} from 'utils/themeBackground';

import SettingButton from './SettingButton';

/**
 * Renders the configurable page background plus the floating entry point to the
 * theme settings page. Preset looks come from the shared
 * `THEME_BACKGROUND_PRESET_STYLES` table (see utils/themeBackground.js).
 */
const ThemeBackground = () => {
    const router = useRouter();
    const [themeBackground, setThemeBackground] = useState('');

    useLayoutEffect(() => {
        // The settings page lives on another route, so the background is read from
        // the shared store and kept in sync through its change event.
        const sync = () => setThemeBackground(getThemeBackground());
        sync();
        window.addEventListener(THEME_BACKGROUND_EVENT, sync);
        return () => window.removeEventListener(THEME_BACKGROUND_EVENT, sync);
    }, []);

    const presetKey = presetBackgroundKey(themeBackground);
    // `none` and an empty value both mean "paint nothing".
    const customUrl = isCustomBackground(themeBackground) ? themeBackground : '';

    const backgroundStyle = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: -1,
        ...(presetKey ? THEME_BACKGROUND_PRESET_STYLES[presetKey] : null),
        ...(customUrl ? { backgroundImage: `url(${customUrl})`, backgroundSize: 'cover' } : null),
    };

    const path = (router.asPath || '/').split('?')[0].split('#')[0];
    const relativePath = path.replace(site.pathPrefix || '', '') || '/';
    const isHomepageList =
        router.pathname === '/' ||
        (router.pathname === '/[...slug]' && /^\/(?:en\/)?(?:\d+\/)?$/.test(relativePath));

    return (
        <>
            <div style={backgroundStyle} />
            {isHomepageList && <SettingButton />}
        </>
    );
};

export default ThemeBackground;
