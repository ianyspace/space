import React, { useLayoutEffect, useState } from 'react';

import {
    getThemeBackground,
    isPresetBackground,
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
    const preset = presetKey ? THEME_BACKGROUND_PRESET_STYLES[presetKey] : null;

    const backgroundStyle = preset
        ? { ...preset, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: -1 }
        : {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundImage: isPresetBackground(themeBackground) ? undefined : `url(${themeBackground})`,
              backgroundSize: 'cover',
              zIndex: -1,
          };

    return (
        <>
            <div style={backgroundStyle} />
            <SettingButton />
        </>
    );
};

export default ThemeBackground;
