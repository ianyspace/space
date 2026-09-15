import React from 'react';

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
    IconHeart,
    IconPerson,
    IconRefresh,
} from './icons';
import { parseTrackName, trackGradient, formatSize, formatTime } from './shared';

import styles from './NowPlaying.module.scss';

/**
 * Now-playing page (the reference's dark player), rendered as a phone-width
 * sheet that slides up over the dimmed tab pages — same gesture language as
 * the mini bar: tap the bar to expand, tap 收起 / queue / person to collapse
 * back. `closing` triggers the reverse animation; `onClosed` fires when the
 * exit finished and the shell may unmount. Fixed dark palette regardless of
 * the app theme; no volume control by design.
 */
const NowPlaying = function ({
    track,
    isPlaying,
    progress,
    shuffle,
    repeat,
    listLoading,
    closing,
    onClosed,
    onCancelClose,
    onToggleShuffle,
    onCycleRepeat,
    onTogglePlay,
    onPrev,
    onNext,
    onSeek,
    onClose,
    onOpenList,
    onOpenProfile,
    onRefresh,
}) {
    const meta = parseTrackName(track.name);
    const { time, duration } = progress;
    const seekPercent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
    const remaining = duration > 0 ? duration - time : 0;
    const quality = [
        meta.ext || 'AUDIO',
        track.size ? formatSize(track.size) : '',
    ].filter(Boolean).join(' · ');

    return (
        <div
            className={closing ? `${styles.veil} ${styles['veil-out']}` : styles.veil}
            onAnimationEnd={() => { if (closing) onClosed(); }}
            onPointerDown={() => { if (closing) onCancelClose(); }}
        >
            <div className={closing ? `${styles.page} ${styles['page-out']}` : styles.page}>
                <div className={styles.topbar}>
                    <button type="button" className={styles['top-btn']} title="收起" aria-label="收起" onClick={onClose}>
                        <IconChevronDown />
                    </button>
                    <span className={styles['quality-pill']}>
                        {quality}
                        <span className={styles.hq}>HQ</span>
                    </span>
                    <div className={styles['top-actions']}>
                        <button
                            type="button"
                            className={`${styles['top-btn']}${listLoading ? ` ${styles.spinning}` : ''}`}
                            title="刷新列表"
                            aria-label="刷新列表"
                            disabled={listLoading}
                            onClick={onRefresh}
                        >
                            <IconRefresh />
                        </button>
                        <button
                            type="button"
                            className={styles['top-btn']}
                            title="我的"
                            aria-label="我的"
                            onClick={onOpenProfile}
                        >
                            <IconPerson />
                        </button>
                    </div>
                </div>

                <div className={styles.body}>
                    <div
                        className={styles.art}
                        style={{ background: trackGradient(track.name) }}
                    >
                        <span className={styles['art-note']}><IconNote /></span>
                        <span className={styles['art-gloss']} aria-hidden="true" />
                    </div>

                    <div className={styles['np-head']}>
                        <div className={styles['np-meta']}>
                            <span className={styles['np-title']}>{meta.title}</span>
                            <span className={styles['np-artist']}>
                                {meta.artist}
                                {meta.artist === '未知艺术家' ? '' : ` - ${meta.title}`}
                            </span>
                        </div>
                        <span className={`${styles['np-icon']}${isPlaying ? ` ${styles['np-icon-on']}` : ''}`} aria-hidden="true">
                            <IconHeart />
                        </span>
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
                            <span>-{formatTime(remaining)}</span>
                        </div>
                    </div>

                    <div className={styles['np-controls']}>
                        <button
                            type="button"
                            className={`${styles['mode-btn']}${shuffle ? ` ${styles['mode-btn-on']}` : ''}`}
                            aria-pressed={shuffle}
                            title="随机播放"
                            onClick={onToggleShuffle}
                        >
                            <IconShuffle />
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
                            aria-label="打开播放列表"
                            onClick={onOpenList}
                        >
                            <IconQueue />
                        </button>
                    </div>

                    <div className={styles['np-repeat']}>
                        <button
                            type="button"
                            className={`${styles['mode-btn']}${repeat !== 'off' ? ` ${styles['mode-btn-on']}` : ''}`}
                            aria-pressed={repeat !== 'off'}
                            title={repeat === 'one' ? '单曲循环' : repeat === 'all' ? '列表循环' : '循环关闭'}
                            onClick={onCycleRepeat}
                        >
                            {repeat === 'one' ? <IconRepeatOne /> : <IconRepeat />}
                            <span className={styles['repeat-label']}>
                                {repeat === 'one' ? '单曲循环' : repeat === 'all' ? '列表循环' : '循环关闭'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NowPlaying;
