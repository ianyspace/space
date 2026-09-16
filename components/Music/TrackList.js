import React from 'react';

import {
    IconNote,
    IconNoteList,
    IconRefresh,
    IconPerson,
    IconPlay,
    IconSearch,
    IconChevronRight,
} from './icons';
import { parseTrackName, trackGradient, formatSize } from './shared';

import styles from './TrackList.module.scss';

/**
 * The "歌曲" screen. The sticky top bar holds the title, the refresh and
 * "我的" actions and the search field — everything else (folder link,
 * count, track rows) scrolls under it. Rows cover every audio file, sorted
 * by name; the folder chosen on the profile page filters the whole list.
 */
const TrackList = function ({
    connected,
    folderName,
    listLoading,
    tracks,
    visibleTracks,
    search,
    onSearch,
    current,
    loadingId,
    isPlaying,
    onToggleTrack,
    onGoProfile,
    onRefresh,
}) {
    const keyword = search.trim();
    const currentId = current ? current.track.id : '';
    const eqClass = `${styles.eq}${isPlaying ? '' : ` ${styles['eq-paused']}`}`;

    return (
        <div className={styles.page}>
            <header className={styles.head}>
                <div className={styles['head-row']}>
                    <h1 className={styles.title}>歌曲</h1>
                    <div className={styles['head-actions']}>
                        {connected && (
                            <button
                                type="button"
                                className={`${styles['refresh-btn']}${listLoading ? ` ${styles.spinning}` : ''}`}
                                title="刷新列表"
                                aria-label="刷新列表"
                                disabled={listLoading}
                                onClick={onRefresh}
                            >
                                <IconRefresh />
                            </button>
                        )}
                        <button type="button" className={styles['nav-btn']} onClick={onGoProfile} title="我的">
                            <IconPerson />
                            <span>我的</span>
                        </button>
                    </div>
                </div>
                {connected && (
                    <label className={styles['search-box']}>
                        <span className={styles['search-icon']}><IconSearch /></span>
                        <input
                            className={styles['search-input']}
                            type="search"
                            placeholder="歌曲"
                            value={search}
                            onChange={(event) => onSearch(event.target.value)}
                            aria-label="搜索歌曲"
                        />
                    </label>
                )}
            </header>

            {!connected ? (
                <section className={styles.connect}>
                    <span className={styles['connect-icon']}><IconNoteList /></span>
                    <h2 className={styles['connect-title']}>还没有连接云盘</h2>
                    <p className={styles['connect-sub']}>
                        在「我的」页面连接 Google 云盘并选择音乐文件夹，
                        这里就会列出全部歌曲。
                    </p>
                    <button type="button" className={styles['connect-btn']} onClick={onGoProfile}>
                        去连接
                    </button>
                </section>
            ) : (
                <>
                    <div className={styles['list-meta']}>
                        <button type="button" className={styles['folder-link']} onClick={onGoProfile}>
                            {folderName}
                            <IconChevronRight />
                        </button>
                        <span className={styles.count}>
                            {listLoading
                                ? '加载中…'
                                : keyword
                                    ? `${visibleTracks.length} / ${tracks.length}`
                                    : `${tracks.length} 首`}
                        </span>
                    </div>
                    <ul className={styles.tracks}>
                        {!listLoading && visibleTracks.length === 0 && (
                            <p className={styles['lib-empty']}>
                                {keyword
                                    ? `没有匹配「${keyword}」的歌曲`
                                    : '没有找到音频文件，去「我的」换个文件夹试试？'}
                            </p>
                        )}
                        {visibleTracks.map((track) => {
                            const active = track.id === currentId;
                            const meta = parseTrackName(track.name);
                            return (
                                <li key={track.id}>
                                    <button
                                        type="button"
                                        className={active ? styles['track-active'] : styles.track}
                                        disabled={loadingId === track.id}
                                        onClick={() => onToggleTrack(track)}
                                    >
                                        <span
                                            className={styles['track-thumb']}
                                            style={{ background: trackGradient(track.name) }}
                                            aria-hidden="true"
                                        >
                                            <IconNote />
                                        </span>
                                        <span className={styles['track-text']}>
                                            <span className={styles['track-title']}>{meta.title}</span>
                                            <span className={styles['track-meta']}>
                                                <span className={styles['track-artist']}>
                                                    {meta.artist}
                                                </span>
                                                {meta.ext && (
                                                    <span className={`${styles.badge} ${styles['badge-ext']}`}>
                                                        {meta.ext}
                                                    </span>
                                                )}
                                                {track.size && (
                                                    <span className={styles['track-size']}>{formatSize(track.size)}</span>
                                                )}
                                            </span>
                                        </span>
                                        {loadingId === track.id ? (
                                            <span className={`${styles['track-dot']} ${styles.spinning}`} aria-hidden="true">
                                                <IconRefresh />
                                            </span>
                                        ) : active ? (
                                            <span className={eqClass} aria-hidden="true"><i /><i /><i /></span>
                                        ) : (
                                            <span className={styles['track-play']} aria-hidden="true"><IconPlay /></span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </div>
    );
};

export default TrackList;
