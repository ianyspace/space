import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

import SEO from 'components/SEO';
import Header from 'components/Layout/Header';
import { useLang } from 'context/LanguageContext';

import styles from './music.module.scss';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const CLIENT_ID_KEY = 'music:googleClientId';
const FOLDER_ID_KEY = 'music:folderId';
// Drive returns at most `pageSize` files per response; follow nextPageToken
// so libraries bigger than one page still show up (capped to stay sane).
const LIST_HARD_CAP = 1000;

const formatSize = function (bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return '';
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const storageSet = function (key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (err) { /* private mode etc. — keep working without persistence */ }
};

// `audio.play()` may reject as a promise OR throw synchronously (Safari has
// been observed doing the latter, which crashes the whole page when it
// happens inside an event handler) — swallow both failure modes.
const safePlay = function (audio) {
    try {
        const request = audio.play();
        if (request && typeof request.catch === 'function') request.catch(() => {});
    } catch (err) { /* autoplay denied etc. */ }
};

const listAllFiles = async function (driveGet, params, accessToken) {
    const files = [];
    let pageToken = '';
    do {
        const data = await driveGet(pageToken ? { ...params, pageToken } : params, accessToken);
        files.push(...(data.files || []));
        pageToken = data.nextPageToken || '';
    } while (pageToken && files.length < LIST_HARD_CAP);
    return files;
};

/**
 * Standalone music page (`/music/`). Connects to the visitor's own Google
 * Drive with Google Identity Services (implicit token flow, drive.readonly),
 * lists audio files (optionally scoped to one folder) and plays the selected
 * file by downloading it as a blob — no backend needed, which is required for
 * the static export on GitHub Pages.
 *
 * Playback extras: prev/next, shuffle, repeat (list / one), in-list search,
 * Media Session (OS media keys / lock-screen controls) and a remembered
 * folder choice. The OAuth client ID is the only setup: it is entered on the
 * page once and kept in localStorage, so nothing secret is committed.
 */
const MusicPage = function () {
    const { homeLink } = useLang();

    const [gsiReady, setGsiReady] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clientIdDraft, setClientIdDraft] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [folders, setFolders] = useState([]);
    const [folderId, setFolderId] = useState('');
    const [tracks, setTracks] = useState([]);
    const [search, setSearch] = useState('');
    const [listLoading, setListLoading] = useState(false);
    const [current, setCurrent] = useState(null);
    const [loadingId, setLoadingId] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    // ''-off → 'all' → 'one' → off
    const [repeat, setRepeat] = useState('off');

    const audioRef = useRef(null);
    const objectUrlRef = useRef('');
    // Guards against two blob downloads racing when several tracks are
    // clicked in quick succession — only the latest click may win.
    const playSeqRef = useRef(0);
    const activeItemRef = useRef(null);

    useEffect(() => {
        let savedId = '';
        let savedFolder = '';
        try {
            savedId = window.localStorage.getItem(CLIENT_ID_KEY) || '';
            savedFolder = window.localStorage.getItem(FOLDER_ID_KEY) || '';
        } catch (err) { /* private mode etc. — just ask again */ }
        setClientId(savedId);
        setClientIdDraft(savedId);
        if (savedFolder) setFolderId(savedFolder);
    }, []);

    // Revoke the blob URL of the last played file when leaving the page.
    useEffect(() => () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    }, []);

    const driveGet = useCallback(async (params, accessToken) => {
        const resp = await fetch(`${DRIVE_FILES_URL}?${new URLSearchParams(params)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.status === 401) {
            setToken('');
            setNotice('');
            throw new Error('授权已过期，请重新连接');
        }
        if (!resp.ok) {
            let message = `HTTP ${resp.status}`;
            try {
                const data = await resp.json();
                if (data.error && data.error.message) message = data.error.message;
            } catch (err) { /* fall back to the status line */ }
            throw new Error(message);
        }
        return resp.json();
    }, []);

    const connect = useCallback(function () {
        setError('');
        setNotice('');
        const google = window.google;
        if (!google || !google.accounts || !google.accounts.oauth2) {
            setError('Google 登录组件尚未加载完成，请稍后再试');
            return;
        }
        const id = clientIdDraft.trim();
        if (!id) {
            setError('请先填写 Google OAuth 客户端 ID');
            return;
        }
        storageSet(CLIENT_ID_KEY, id);
        setClientId(id);
        // `requestAccessToken()` opens a popup and may throw synchronously
        // (e.g. popup blocked); keep that from bubbling into React.
        try {
            google.accounts.oauth2
                .initTokenClient({
                    client_id: id,
                    scope: DRIVE_SCOPE,
                    prompt: '',
                    callback(resp) {
                        if (resp.error) {
                            setError(`连接失败：${resp.error}${resp.error_description ? `（${resp.error_description}）` : ''}`);
                            return;
                        }
                        setToken(resp.access_token);
                        setNotice('已连接 Google 云盘');
                    },
                })
                .requestAccessToken();
        } catch (err) {
            setError(`无法打开 Google 登录窗口：${err.message}（请检查浏览器是否拦截了弹窗）`);
        }
    }, [clientIdDraft]);

    const disconnect = useCallback(function () {
        setToken('');
        setFolders([]);
        setTracks([]);
        setCurrent(null);
        setIsPlaying(false);
        setNotice('已断开连接');
    }, []);

    useEffect(() => {
        if (!token) return undefined;
        let cancelled = false;
        (async function loadFolders() {
            try {
                const files = await listAllFiles(driveGet, {
                    q: `mimeType='${FOLDER_MIME}' and trashed=false`,
                    fields: 'files(id,name)',
                    pageSize: '200',
                    orderBy: 'name',
                }, token);
                if (!cancelled) setFolders(files);
            } catch (err) {
                if (!cancelled) setError(`获取文件夹列表失败：${err.message}`);
            }
        }());
        return () => { cancelled = true; };
    }, [token, driveGet]);

    // Drop a remembered folder that no longer exists (deleted, or a different
    // account was connected) instead of silently listing nothing.
    useEffect(() => {
        if (!folderId || folders.length === 0) return;
        if (!folders.some((folder) => folder.id === folderId)) setFolderId('');
    }, [folderId, folders]);

    const loadTracks = useCallback(async function () {
        if (!token) return;
        let q = "mimeType contains 'audio' and trashed=false";
        if (folderId) q += ` and '${folderId}' in parents`;
        setListLoading(true);
        setError('');
        try {
            const files = await listAllFiles(driveGet, {
                q,
                fields: 'files(id,name,mimeType,size)',
                pageSize: '200',
                orderBy: 'name',
            }, token);
            setTracks(files);
        } catch (err) {
            setError(`获取音乐列表失败：${err.message}`);
        } finally {
            setListLoading(false);
        }
    }, [token, folderId, driveGet]);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    const handleFolderChange = useCallback(function (event) {
        const value = event.target.value;
        setFolderId(value);
        storageSet(FOLDER_ID_KEY, value);
    }, []);

    const play = useCallback(async function (track) {
        setError('');
        setLoadingId(track.id);
        const seq = ++playSeqRef.current;
        try {
            const resp = await fetch(`${DRIVE_FILES_URL}/${track.id}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.status === 401) {
                setToken('');
                setNotice('');
                throw new Error('授权已过期，请重新连接');
            }
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const url = URL.createObjectURL(await resp.blob());
            if (seq !== playSeqRef.current) {
                // A newer click superseded this download — drop its blob.
                URL.revokeObjectURL(url);
                return;
            }
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = url;
            setCurrent({ track, url });
        } catch (err) {
            if (seq === playSeqRef.current) setError(`播放「${track.name}」失败：${err.message}`);
        } finally {
            if (seq === playSeqRef.current) setLoadingId('');
        }
    }, [token]);

    // Clicking the row of the track that is already loaded toggles
    // play/pause instead of downloading the whole file again.
    const toggleTrack = useCallback(function (track) {
        if (current && current.track.id === track.id) {
            const audio = audioRef.current;
            if (!audio) return;
            if (audio.paused || audio.ended) safePlay(audio);
            else audio.pause();
            return;
        }
        play(track);
    }, [current, play]);

    const visibleTracks = useMemo(function () {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return tracks;
        return tracks.filter((track) => track.name.toLowerCase().includes(keyword));
    }, [tracks, search]);

    const stepTrack = useCallback(function (delta) {
        if (!current || visibleTracks.length < 2) return;
        const index = visibleTracks.findIndex((track) => track.id === current.track.id);
        if (shuffle) {
            let next;
            do { next = Math.floor(Math.random() * visibleTracks.length); } while (next === index);
            play(visibleTracks[next]);
            return;
        }
        if (index === -1) {
            play(visibleTracks[delta > 0 ? 0 : visibleTracks.length - 1]);
            return;
        }
        play(visibleTracks[(index + delta + visibleTracks.length) % visibleTracks.length]);
    }, [current, visibleTracks, shuffle, play]);

    const playNext = useCallback(function () {
        stepTrack(1);
    }, [stepTrack]);

    const playPrev = useCallback(function () {
        // Standard player behaviour: restart the current song first.
        const audio = audioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        stepTrack(-1);
    }, [stepTrack]);

    const cycleRepeat = useCallback(function () {
        setRepeat((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'));
    }, []);

    const handleEnded = useCallback(function () {
        setIsPlaying(false);
        if (!current) return;
        if (repeat === 'one') {
            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = 0;
                safePlay(audio);
            }
            return;
        }
        if (shuffle && visibleTracks.length > 1) {
            stepTrack(1);
            return;
        }
        const next = visibleTracks[visibleTracks.findIndex((track) => track.id === current.track.id) + 1];
        if (next) play(next);
        else if (repeat === 'all' && visibleTracks.length > 0) play(visibleTracks[0]);
    }, [current, repeat, shuffle, visibleTracks, stepTrack, play]);

    // Mount the fetched blob into the audio element; browsers only allow
    // autoplay inside the user-gesture chain, so fall back to a hint.
    // `play()` may reject as a promise OR throw synchronously (the latter
    // would otherwise bubble out of this effect and crash the whole page),
    // so both failure modes are handled here.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !current) return;
        audio.src = current.url;
        try {
            const request = audio.play();
            if (request && typeof request.catch === 'function') {
                request.catch(() => setNotice('浏览器阻止了自动播放，请点击播放按钮'));
            }
        } catch (err) {
            setNotice('浏览器阻止了自动播放，请点击播放按钮');
        }
    }, [current]);

    // Keep the OS-level media controls (lock screen / hardware keys) in sync.
    useEffect(() => {
        if (!current || typeof window === 'undefined' || !('mediaSession' in navigator)) return undefined;
        const session = navigator.mediaSession;
        try {
            session.metadata = new window.MediaMetadata({
                title: current.track.name,
                artist: 'Google Drive',
                album: '云盘音乐',
            });
        } catch (err) { /* MediaMetadata unavailable — metadata is optional */ }
        const actions = {
            play: () => { const a = audioRef.current; if (a) safePlay(a); },
            pause: () => { const a = audioRef.current; if (a) a.pause(); },
            previoustrack: playPrev,
            nexttrack: playNext,
        };
        Object.keys(actions).forEach((name) => {
            try { session.setActionHandler(name, actions[name]); } catch (err) { /* action unsupported */ }
        });
        return () => {
            Object.keys(actions).forEach((name) => {
                try { session.setActionHandler(name, null); } catch (err) { /* ignore on teardown */ }
            });
        };
    }, [current, playPrev, playNext]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }, [isPlaying]);

    // Auto-advancing to the next track should bring its row into view.
    const currentId = current ? current.track.id : '';
    useEffect(() => {
        if (currentId && activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [currentId]);

    const eqClass = `${styles.eq}${isPlaying ? '' : ` ${styles['eq-paused']}`}`;
    const keyword = search.trim();

    return (
        <div className={styles.page}>
            <SEO title="音乐" />

            <Script
                src={GSI_SRC}
                strategy="afterInteractive"
                onLoad={() => setGsiReady(true)}
                onError={() => setError('Google 登录组件加载失败，请检查网络')}
            />

            <div className={styles.toolbar}>
                <Header base={homeLink} />
                <div className={styles['toolbar-actions']}>
                    {token ? (
                        <>
                            <select
                                className={styles.select}
                                value={folderId}
                                onChange={handleFolderChange}
                                aria-label="选择云盘文件夹"
                            >
                                <option value="">全部音频（整个云盘）</option>
                                {folders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>
                                        📁 {folder.name}
                                    </option>
                                ))}
                            </select>
                            <button type="button" className={styles['toolbar-btn']} onClick={disconnect}>
                                断开连接
                            </button>
                        </>
                    ) : (
                        <span className={styles['toolbar-hint']}>连接 Google 云盘后即可播放里面的音乐</span>
                    )}
                </div>
            </div>

            <main className={styles.card}>
                {error && <p className={styles.error}>{error}</p>}
                {notice && !error && <p className={styles.notice}>{notice}</p>}

                {!token ? (
                    <section className={styles.setup}>
                        <h1 className={styles.title}>🎵 云盘音乐</h1>
                        <p className={styles.hint}>
                            通过 Google Drive 只读权限列出并播放你云盘里的音频文件。需要先在{' '}
                            <a
                                href="https://console.cloud.google.com/apis/credentials"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Google Cloud Console
                            </a>{' '}
                            创建一个「Web 应用」类型的 OAuth 客户端 ID，并在「已获授权的 JavaScript 来源」里加上{' '}
                            <code>https://ianyspace.github.io</code>（本地调试再加 <code>http://localhost:3000</code>）。
                        </p>
                        <div className={styles['setup-row']}>
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="粘贴 OAuth 客户端 ID（形如 xxxx.apps.googleusercontent.com）"
                                value={clientIdDraft}
                                onChange={(event) => setClientIdDraft(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && connect()}
                            />
                            <button type="button" className={styles['toolbar-btn']} disabled={!gsiReady} onClick={connect}>
                                {gsiReady ? '连接 Google 云盘' : '正在加载 Google 组件…'}
                            </button>
                        </div>
                        {clientId && (
                            <p className={styles.hint}>
                                检测到已保存的客户端 ID，直接点击连接即可（如需更换请粘贴新的 ID 覆盖）。
                            </p>
                        )}
                    </section>
                ) : (
                    <>
                        {current && (
                            <section className={styles.player}>
                                <div className={styles['now-playing']}>
                                    <span className={eqClass} aria-hidden="true"><i /><i /><i /></span>
                                    <span className={styles['now-title']}>{current.track.name}</span>
                                </div>
                                <audio
                                    ref={audioRef}
                                    controls
                                    onEnded={handleEnded}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    className={styles.audio}
                                >
                                    <track kind="captions" />
                                </audio>
                                <div className={styles['player-actions']}>
                                    <button
                                        type="button"
                                        className={styles['player-btn']}
                                        disabled={!current || visibleTracks.length < 2}
                                        onClick={playPrev}
                                    >
                                        ⏮ 上一首
                                    </button>
                                    <button
                                        type="button"
                                        className={styles['player-btn']}
                                        disabled={!current || visibleTracks.length < 2}
                                        onClick={playNext}
                                    >
                                        ⏭ 下一首
                                    </button>
                                    <div className={styles['player-modes']}>
                                        <button
                                            type="button"
                                            className={`${styles['player-btn']}${shuffle ? ` ${styles['player-btn-on']}` : ''}`}
                                            aria-pressed={shuffle}
                                            title="随机切换下一首"
                                            onClick={() => setShuffle((on) => !on)}
                                        >
                                            🔀 随机
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles['player-btn']}${repeat !== 'off' ? ` ${styles['player-btn-on']}` : ''}`}
                                            aria-pressed={repeat !== 'off'}
                                            title={repeat === 'one' ? '单曲循环中，点击切换' : repeat === 'all' ? '列表循环中，点击切换' : '循环已关闭，点击开启'}
                                            onClick={cycleRepeat}
                                        >
                                            {repeat === 'one' ? '🔂 单曲循环' : repeat === 'all' ? '🔁 列表循环' : '🔁 循环'}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className={styles.list}>
                            <div className={styles['list-head']}>
                                <span className={styles['list-count']}>
                                    {listLoading ? '加载中…' : keyword
                                        ? `${visibleTracks.length} / ${tracks.length} 首`
                                        : `共 ${tracks.length} 首`}
                                </span>
                                <input
                                    className={styles['list-search']}
                                    type="search"
                                    placeholder="搜索歌曲…"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    aria-label="搜索歌曲"
                                />
                                <button type="button" className={styles['list-refresh']} disabled={listLoading} onClick={loadTracks}>
                                    刷新
                                </button>
                            </div>
                            {!listLoading && visibleTracks.length === 0 && (
                                <p className={styles.empty}>
                                    {keyword ? `没有匹配「${keyword}」的歌曲` : '没有找到音频文件，换个文件夹试试？'}
                                </p>
                            )}
                            <ul className={styles.tracks}>
                                {visibleTracks.map((track) => {
                                    const active = current && current.track.id === track.id;
                                    return (
                                        <li key={track.id} ref={active ? activeItemRef : undefined}>
                                            <button
                                                type="button"
                                                className={active ? styles['track-active'] : styles.track}
                                                disabled={loadingId === track.id}
                                                onClick={() => toggleTrack(track)}
                                            >
                                                <span className={styles['track-name']}>
                                                    {loadingId === track.id ? (
                                                        <span className={styles['track-glyph']} aria-hidden="true">⏳</span>
                                                    ) : active ? (
                                                        <span className={eqClass} aria-hidden="true"><i /><i /><i /></span>
                                                    ) : (
                                                        <span className={styles['track-glyph']} aria-hidden="true">🎵</span>
                                                    )}
                                                    <span className={styles['track-label']}>{track.name}</span>
                                                </span>
                                                <span className={styles['track-size']}>{formatSize(track.size)}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
};

export default MusicPage;
