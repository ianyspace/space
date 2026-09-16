import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

import styles from './index.module.scss';

/**
 * The music app is split into two routes with their own layouts:
 *
 * - `/music/h5`      — phone-width experience (under 900px)
 * - `/music/desktop` — wide-screen experience (900px and up, tablets/PC)
 *
 * This route only decides which one to open, so the two layouts stay completely
 * independent while sharing all playback state through `components/Music/MusicApp`.
 * The match is evaluated on the client because the site is a static export.
 */
const DESKTOP_QUERY = '(min-width: 900px)';

const MusicRoute = function () {
    const router = useRouter();

    useEffect(() => {
        const media = window.matchMedia(DESKTOP_QUERY);
        const target = media.matches ? '/music/desktop' : '/music/h5';
        router.replace(target);
    }, [router]);

    // Rendered for the split second before the redirect lands.
    return (
        <div className={styles.splash}>
            <span>正在载入音乐…</span>
        </div>
    );
};

export default MusicRoute;
