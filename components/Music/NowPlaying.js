import React, { useEffect, useRef } from 'react';

import {
    IconNote,
    IconPlay,
    IconPause,
    IconPrev,
    IconNext,
    IconShuffle,
    IconRepeat,
    IconRepeatOne,
    IconQueue,
    IconChevronDown,
} from './icons';
import { parseTrackName, trackGradient, formatTime } from './shared';

import styles from './NowPlaying.module.scss';

// Playback modes of the single cycling control, in the order the button walks
// them: 关闭 → 列表循环 → 单曲循环 → 随机 → 关闭.
const MODES = {
    off: { icon: <IconRepeat />, title: '循环关闭' },
    all: { icon: <IconRepeat />, title: '列表循环' },
    one: { icon: <IconRepeatOne />, title: '单曲循环' },
    shuffle: { icon: <IconShuffle />, title: '随机播放' },
};

/**
 * Decorative tonearm, drawn in the record rig's own coordinate space
 * (100 × 122 — the rig's aspect ratio) so it scales with the record instead of
 * drifting off it: pivot near the top, arm reaching the record's upper-right
 * rim. `playing` swings the arm a few degrees down so it reads as tracking.
 */
const Tonearm = function ({ playing }) {
    return (
        <svg
            className={playing ? `${styles.arm} ${styles['arm-playing']}` : styles.arm}
            viewBox="0 0 100 122"
            aria-hidden="true"
            focusable="false"
        >
            <g className={styles['arm-swing']}>
                <path
                    d="M52.5 7.7 L79 24.9"
                    fill="none"
                    stroke="#f2f3f7"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                />
                <g transform="rotate(33 79 24.9)">
                    <rect x="76.5" y="22.2" width="10.4" height="5.4" rx="1.9" fill="#f2f3f7" />
                    <rect x="84.4" y="23.9" width="2.6" height="2.2" rx="0.9" fill="#26272e" />
                </g>
                <circle cx="52.5" cy="7.7" r="4.4" fill="#191a20" stroke="#f2f3f7" strokeWidth="1.7" />
                <circle cx="52.5" cy="7.7" r="1.4" fill="#f2f3f7" />
            </g>
        </svg>
    );
};

/**
 * Now-playing page (the reference's dark player), rendered as a phone-width
 * sheet that slides up over the dimmed tab pages — same gesture language as
 * the mini bar: tap the bar to expand, tap 收起 to collapse back. The stage
 * shows the spinning record; tapping it swaps in the lyrics, tapping the
 * lyrics swaps the record back (only when the track has lyrics). `closing`
 * triggers the reverse animation; `onClosed` fires when the exit finished and
 * the shell may unmount. Fixed dark palette regardless of the app theme; no
 * volume control by design.
 */
const NowPlaying = function ({
    track,
    isPlaying,
    progress,
    mode = 'off',
    closing,
    onClosed,
    onCancelClose,
    onCycleMode,
    onTogglePlay,
    onPrev,
    onNext,
    onSeek,
    onClose,
    onOpenList,
    lyrics,
    lyricsLoading,
    lyricsVisible,
    onToggleLyrics,
}) {
    const meta = parseTrackName(track.name);
    const gradient = trackGradient(track.name);
    const { time, duration } = progress;
    const seekPercent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
    const playback = MODES[mode] || MODES.off;
    // The record only doubles as a lyrics switch when there is something to
    // show — a track without lyrics keeps it as plain artwork.
    const canToggleLyrics = Boolean(lyrics) || lyricsLoading;
    const lyricsShown = Boolean(lyricsVisible && canToggleLyrics);
    const activeLyric = lyrics && lyrics.timed
        ? lyrics.lines.reduce((index, line, lineIndex) => (line.time <= time ? lineIndex : index), -1)
        : -1;
    const activeLyricRef = useRef(null);
    // Tap position, so a finger that was really scrolling the lyrics does not
    // also count as "back to the record".
    const pressYRef = useRef(0);

    useEffect(() => {
        if (activeLyricRef.current) {
            activeLyricRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [activeLyric, lyricsShown]);

    const handleLyricsClick = function (event) {
        if (Math.abs(event.clientY - pressYRef.current) > 8) return;
        onToggleLyrics();
    };

    return (
        <div
            className={closing ? `${styles.veil} ${styles['veil-out']}` : styles.veil}
            onAnimationEnd={() => { if (closing) onClosed(); }}
            onPointerDown={() => { if (closing) onCancelClose(); }}
        >
            <div
                className={closing ? `${styles.page} ${styles['page-out']}` : styles.page}
                style={{ '--np-grad': gradient }}
            >
                <div className={styles.topbar}>
                    <button type="button" className={styles['top-btn']} title="收起" aria-label="收起" onClick={onClose}>
                        <IconChevronDown />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={`${styles.stage}${lyricsShown ? ` ${styles['stage-lyrics']}` : ''}`}>
                        {/* Record + tonearm share one scaling unit so they stay
                            locked together whatever space the stage gets. */}
                        <div className={styles.rig}>
                            <Tonearm playing={isPlaying} />

                            <button
                                type="button"
                                className={`${styles.disc}${isPlaying ? ` ${styles['disc-playing']}` : ''}`}
                                onClick={canToggleLyrics ? onToggleLyrics : undefined}
                                disabled={!canToggleLyrics}
                                aria-hidden={lyricsShown}
                                tabIndex={lyricsShown ? -1 : 0}
                                title={canToggleLyrics ? '查看歌词' : '这首歌没有歌词'}
                                aria-label={canToggleLyrics ? '查看歌词' : '这首歌没有歌词'}
                            >
                                {/* Under the record, so each ring emerges at
                                    the rim and travels outwards. */}
                                <span className={styles.ripples} aria-hidden="true">
                                    <span className={styles.ripple} />
                                    <span className={styles.ripple} />
                                    <span className={styles.ripple} />
                                </span>
                                <span className={styles.rotor} aria-hidden="true">
                                    <span className={styles['disc-grooves']} />
                                    <span className={styles['disc-label']} style={{ background: gradient }}>
                                        <IconNote />
                                    </span>
                                    <span className={styles['disc-sheen']} />
                                </span>
                            </button>
                        </div>

                        {lyricsShown && (
                            <div
                                className={styles.lyrics}
                                role="button"
                                tabIndex={0}
                                aria-label="歌词，点击返回唱片"
                                title="返回唱片"
                                onPointerDown={(event) => { pressYRef.current = event.clientY; }}
                                onClick={handleLyricsClick}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onToggleLyrics();
                                    }
                                }}
                            >
                                {lyrics ? lyrics.lines.map((line, index) => (
                                    <p
                                        key={`${line.time}-${index}`}
                                        ref={index === activeLyric ? activeLyricRef : null}
                                        className={index === activeLyric ? styles['lyric-active'] : styles.lyric}
                                    >
                                        {line.text}
                                    </p>
                                )) : (
                                    <p className={styles['lyrics-empty']}>
                                        {lyricsLoading ? '歌词加载中…' : '这首歌没有歌词'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles['np-head']}>
                        <div className={styles['np-meta']}>
                            <span className={styles['np-title']}>{meta.title}</span>
                            <span className={styles['np-artist']}>
                                {meta.artist}
                            </span>
                        </div>
                    </div>

                    <div className={styles['np-progress']}>
                        <input
                            className={styles.slider}
                            type="range"
                            min={0}
                            max={duration > 0 ? duration : 1}
                            step={0.1}
                            value={Math.min(time, duration > 0 ? duration : 1)}
                            disabled={duration <= 0}
                            aria-label="播放进度"
                            onChange={(event) => onSeek(Number(event.target.value))}
                            style={{ '--fill': `${seekPercent}%` }}
                        />
                        <div className={styles['time-row']}>
                            <span>{formatTime(time)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className={styles['np-controls']}>
                        <button
                            type="button"
                            className={`${styles['mode-btn']}${mode !== 'off' ? ` ${styles['mode-btn-on']}` : ''}`}
                            aria-pressed={mode !== 'off'}
                            title={playback.title}
                            onClick={onCycleMode}
                        >
                            {playback.icon}
                        </button>
                        <button
                            type="button"
                            className={styles['skip-btn']}
                            title="上一首"
                            onClick={onPrev}
                        >
                            <IconPrev />
                        </button>
                        <button
                            type="button"
                            className={styles['play-btn']}
                            title={isPlaying ? '暂停' : '播放'}
                            onClick={onTogglePlay}
                        >
                            {isPlaying ? <IconPause /> : <IconPlay />}
                        </button>
                        <button
                            type="button"
                            className={styles['skip-btn']}
                            title="下一首"
                            onClick={onNext}
                        >
                            <IconNext />
                        </button>
                        <button
                            type="button"
                            className={styles['mode-btn']}
                            title="播放列表"
                            onClick={onOpenList}
                        >
                            <IconQueue />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NowPlaying;
