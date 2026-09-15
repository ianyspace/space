import React from 'react';

import {
    IconNote,
    IconPlay,
    IconPause,
    IconNext,
} from './icons';
import { parseTrackName, trackGradient } from './shared';

import styles from './MiniPlayer.module.scss';

/**
 * The mini play bar docked above the bottom tab bar. Owned by the page
 * shell — not the list screen — so it stays visible on both the song list
 * and the profile page while something is playing. Tapping its body opens
 * the now-playing sheet; the transport buttons act in place.
 */
const MiniPlayer = function ({
    current,
    isPlaying,
    progress,
    onTogglePlay,
    onNext,
    onOpenPlayer,
}) {
    const meta = parseTrackName(current.track.name);
    const percent = progress.duration > 0
        ? Math.min(100, Math.max(0, (progress.time / progress.duration) * 100))
        : 0;
    return (
        <div className={styles.wrap}>
            <div
                className={styles.mini}
                role="button"
                tabIndex={0}
                onClick={onOpenPlayer}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenPlayer();
                    }
                }}
            >
                <span
                    className={styles.thumb}
                    style={{ background: trackGradient(current.track.name) }}
                    aria-hidden="true"
                >
                    <IconNote />
                </span>
                <span
                    className={styles.text}
                    title={isPlaying ? '暂停' : '播放'}
                    onClick={(event) => {
                        event.stopPropagation();
                        onTogglePlay();
                    }}
                >
                    <span className={styles.title}>{meta.title}</span>
                    <span className={styles.artist}>{meta.artist}</span>
                </span>
                <span
                    className={styles.btn}
                    role="button"
                    tabIndex={-1}
                    title={isPlaying ? '暂停' : '播放'}
                    onClick={(event) => {
                        event.stopPropagation();
                        onTogglePlay();
                    }}
                >
                    {isPlaying ? <IconPause /> : <IconPlay />}
                </span>
                <span
                    className={styles.btn}
                    role="button"
                    tabIndex={-1}
                    title="下一首"
                    onClick={(event) => {
                        event.stopPropagation();
                        onNext();
                    }}
                >
                    <IconNext />
                </span>
                <span
                    className={styles.progress}
                    style={{ '--progress': `${percent}%` }}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
};

export default MiniPlayer;
