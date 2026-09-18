import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
    IconNote,
    IconNoteList,
    IconRefresh,
    IconMoreVertical,
    IconPlay,
    IconPause,
    IconSearch,
    IconMusicSpace,
    IconGoogleDrive,
} from './icons';
import { parseTrackName, trackGradient } from './shared';
import { DRIVE_SOURCE } from './librarySource';

import styles from './TrackList.module.scss';

/**
 * The song list. The sticky top bar holds the library's brand mark (Music Space
 * for the public library, Google Drive once the visitor's own drive is
 * connected) and the search / three-dots actions; tapping search unfolds the
 * field into the title row and focuses it. The three-dots button opens the
 * bottom drawer — the entry point to 「我的」, where the Google Drive connection
 * lives. The track rows scroll underneath.
 * Rows cover every audio file, sorted by name; the folder chosen on the
 * profile page filters the whole list.
 */
const TrackList = function ({
    connected,
    source,
    listLoading,
    visibleTracks,
    search,
    onSearch,
    current,
    loadingId,
    isPlaying,
    onToggleTrack,
    onGoProfile,
}) {
    const keyword = search.trim();
    const currentId = current ? current.track.id : '';
    const eqClass = `${styles.eq}${isPlaying ? '' : ` ${styles['eq-paused']}`}`;
    // The search field only exists while unfolded; a tap on the search button
    // reveals it and puts the caret straight inside.
    const [searchOpen, setSearchOpen] = useState(false);
    const searchInputRef = useRef(null);
    // The three-dots drawer: `open` mounts it, `closing` plays its exit
    // animation first (the sheet-unmount-via-animation-end trick).
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuClosing, setMenuClosing] = useState(false);

    useEffect(() => {
        if (!searchOpen) return undefined;
        const input = searchInputRef.current;
        if (input) input.focus();
        return undefined;
    }, [searchOpen]);

    const openSearch = function () {
        setSearchOpen(true);
    };

    const closeSearch = function () {
        setSearchOpen(false);
        onSearch('');
    };

    /* --- three-dots drawer --- */

    const closeMenu = useCallback(function () {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setMenuOpen(false);
            setMenuClosing(false);
            return;
        }
        setMenuClosing(true);
    }, []);

    // Escape closes the drawer while it is open.
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape') closeMenu(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [menuOpen, closeMenu]);

    // Opens the profile tab, where the Google Drive connection lives.
    const goProfile = function () {
        closeMenu();
        onGoProfile();
    };

    return (
        <div className={styles.page}>
            {/* Sticky colour wash parked directly under the floating glass —
                it gives the header's backdrop-filter something to refract
                even before the first row scrolls beneath it. */}
            <span className={styles['head-glow']} aria-hidden="true" />
            <header className={styles.head}>
                <div className={styles['head-row']}>
                    <h1 className={styles.title}>
                        {source === DRIVE_SOURCE
                            ? <IconGoogleDrive size={21} />
                            : <IconMusicSpace size={23} />}
                        <span className={styles['title-word']}>
                            {source === DRIVE_SOURCE ? 'Google Drive' : 'Music Space'}
                        </span>
                    </h1>
                    {/* Unfolds between the title and the actions; its own
                        toggle hides while it is open. */}
                    {connected && searchOpen && (
                        <label className={styles['search-box']}>
                            <span className={styles['search-icon']}><IconSearch /></span>
                            <input
                                ref={searchInputRef}
                                className={styles['search-input']}
                                type="search"
                                placeholder="搜索歌曲"
                                value={search}
                                onChange={(event) => onSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') closeSearch();
                                }}
                                aria-label="搜索歌曲"
                            />
                            <button
                                type="button"
                                className={styles['search-close']}
                                title="关闭搜索"
                                aria-label="关闭搜索"
                                onClick={closeSearch}
                            >
                                ×
                            </button>
                        </label>
                    )}
                    <div className={styles['head-actions']}>
                        {connected && !searchOpen && (
                            <button
                                type="button"
                                className={styles['nav-btn']}
                                title="搜索"
                                aria-label="搜索"
                                onClick={openSearch}
                            >
                                <IconSearch />
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles['nav-btn']}
                            title="更多"
                            aria-label="更多"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen && !menuClosing}
                            onClick={() => { setMenuClosing(false); setMenuOpen(true); }}
                        >
                            <IconMoreVertical />
                        </button>
                    </div>
                </div>
            </header>

            {!connected ? (
                <section className={styles.connect}>
                    <span className={styles['connect-icon']}><IconNoteList /></span>
                    <h2 className={styles['connect-title']}>曲库里还没有歌曲</h2>
                    <p className={styles['connect-sub']}>
                        公共曲库暂时是空的；也可以在「我的」页面连接 Google 云盘，
                        播放你自己云盘里的音乐。
                    </p>
                    <button type="button" className={styles['connect-btn']} onClick={onGoProfile}>
                        去看看
                    </button>
                </section>
            ) : (
                <>
                    <ul className={styles.tracks}>
                        {listLoading && (
                            <p className={styles['lib-loading']}>加载中…</p>
                        )}
                        {!listLoading && visibleTracks.length === 0 && (
                            <p className={styles['lib-empty']}>
                                {keyword
                                    ? `没有匹配「${keyword}」的歌曲`
                                    : '没有找到音频文件，去「我的」换个文件夹试试？'}
                            </p>
                        )}
                        {visibleTracks.map((track) => {
                            const active = track.id === currentId;
                            const loading = loadingId === track.id;
                            const meta = parseTrackName(track.name);
                            return (
                                <li key={track.id}>
                                    <button
                                        type="button"
                                        className={active ? styles['track-active'] : styles.track}
                                        disabled={loading}
                                        onClick={() => onToggleTrack(track)}
                                    >
                                        <span
                                            className={styles['track-thumb']}
                                            style={{ background: trackGradient(track.name) }}
                                            aria-hidden="true"
                                        >
                                            {active && !loading ? (
                                                <span className={styles['thumb-overlay']}>
                                                    {isPlaying ? <IconPause /> : <IconPlay />}
                                                </span>
                                            ) : (
                                                <IconNote />
                                            )}
                                        </span>
                                        <span className={styles['track-text']}>
                                            <span className={styles['track-title']}>{meta.title}</span>
                                            <span className={styles['track-artist']}>{meta.artist}</span>
                                        </span>
                                        {loading ? (
                                            <span className={`${styles['track-dot']} ${styles.spinning}`} aria-hidden="true">
                                                <IconRefresh />
                                            </span>
                                        ) : active ? (
                                            <span className={eqClass} aria-hidden="true"><i /><i /><i /></span>
                                        ) : null}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {/* Bottom drawer opened by the three-dots button. It slides up from
                the bottom of the phone column, so on a wide screen it reads as
                part of the list rather than as a full-window dialog. */}
            {menuOpen && (
                <div
                    className={menuClosing
                        ? `${styles['menu-scrim']} ${styles['menu-scrim-out']}`
                        : styles['menu-scrim']}
                    role="presentation"
                    onClick={closeMenu}
                    onAnimationEnd={(event) => {
                        // Only the scrim's own fade ends the drawer; the sheet
                        // and its children animate independently.
                        if (menuClosing && event.target === event.currentTarget) {
                            setMenuOpen(false);
                            setMenuClosing(false);
                        }
                    }}
                >
                    <div
                        className={menuClosing
                            ? `${styles.menu} ${styles['menu-out']}`
                            : styles.menu}
                        role="menu"
                        aria-label="更多功能"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <span className={styles['menu-grip']} aria-hidden="true" />
                        <button
                            type="button"
                            className={styles['menu-item']}
                            role="menuitem"
                            onClick={goProfile}
                        >
                            <span className={styles['menu-icon']} aria-hidden="true">
                                <IconGoogleDrive size={20} />
                            </span>
                            <span className={styles['menu-text']}>
                                <span className={styles['menu-title']}>谷歌云盘链接</span>
                                <span className={styles['menu-sub']}>连接或切换自己的云盘曲库</span>
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackList;
