import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

import SEO from 'components/SEO';

import {
    GSI_SRC,
    DRIVE_FILES_URL,
    DRIVE_SCOPE,
    FOLDER_MIME,
    CLIENT_ID_KEY,
    FOLDER_ID_KEY,
    THEME_KEY,
    storageGet,
    storageSet,
    safePlay,
    isIOSLike,
    SILENT_WAV,
    parseTrackName,
    makeArtwork,
    listAllFiles,
} from 'components/Music/shared';
import TrackList from 'components/Music/TrackList';
import NowPlaying from 'components/Music/NowPlaying';
import Profile from 'components/Music/Profile';
import MiniPlayer from 'components/Music/MiniPlayer';
import TabBar from 'components/Music/TabBar';

import styles from './index.module.scss';

/**
 * Mobile-style music app (`/music/`): three screens — a song list, a
 * full-screen now-playing page and a profile page — switched through a
 * floating bottom tab bar (list ⇄ profile), while the mini play bar on the
 * list expands into the now-playing page. The visitor connects their own
 * Google Drive with Google Identity Services (implicit token flow,
 * drive.readonly), picks a folder on the profile page and plays files as
 * blobs — no backend, which the static export on GitHub Pages requires.
 *
 * Playback lives here (single <audio> element, so music keeps running while
 * screens switch): transport controls, shuffle/repeat, seek, in-list search,
 * background auto-advance and Media Session integration. There is
 * deliberately no volume control. The OAuth client ID is the only setup:
 * entered once, kept in localStorage, nothing secret committed.
 */
const MusicPage = function () {
    const [theme, setTheme] = useState('light');
    // 'list' | 'profile' — which tab page is showing; the full-screen
    // now-playing page floats above it while `playerOpen` is true.
    const [tab, setTab] = useState('list');
    const [playerOpen, setPlayerOpen] = useState(false);
    // While true the sheet plays its slide-down exit animation and only
    // unmounts when that finishes (`onClosed`).
    const [playerClosing, setPlayerClosing] = useState(false);
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
    // 'off' → 'all' → 'one' → 'off'
    const [repeat, setRepeat] = useState('off');
    const [progress, setProgress] = useState({ time: 0, duration: 0 });
    // Id of the track whose audio blob is (or is being) prefetched.
    const [prefetchId, setPrefetchId] = useState('');

    const audioRef = useRef(null);
    const objectUrlRef = useRef('');
    // Guards against two blob downloads racing when several tracks are
    // clicked in quick succession — only the latest click may win.
    const playSeqRef = useRef(0);
    // iOS needs one synchronous `play()` inside the tap gesture before
    // async plays are allowed (Safari tolerates this; Alook-style WKWebView
    // shells do not) — done once per element.
    const unlockRef = useRef(false);
    // { id, promise } of the in-flight/finished next-track prefetch.
    const prefetchRef = useRef(null);

    const fetchTrackUrl = useCallback(async function (track, accessToken) {
        const resp = await fetch(`${DRIVE_FILES_URL}/${track.id}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.status === 401) {
            setToken('');
            throw new Error('授权已过期，请重新连接');
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return URL.createObjectURL(await resp.blob());
    }, []);

    // Pre-download the next track while the current one still plays: iOS
    // suspends background `fetch`, so a cold download at `ended` in the
    // background only completes once the page is re-opened (the exact
    // "next song starts when I come back" symptom). With the blob already
    // cached, auto-advance is a synchronous src swap that keeps rolling in
    // the background.
    const startPrefetch = useCallback(async function (track) {
        if (!track) return;
        const old = prefetchRef.current;
        if (old && old.promise && old.id !== track.id) {
            // Abandoned prefetch (user skipped ahead) — free its blob.
            old.promise.then((r) => r.url && URL.revokeObjectURL(r.url)).catch(() => {});
        }
        const entry = { id: track.id, promise: null };
        entry.promise = fetchTrackUrl(track, token)
            .then((url) => ({ url }))
            .catch(() => ({ url: '' }));
        prefetchRef.current = entry;
        setPrefetchId(track.id);
    }, [token, fetchTrackUrl]);

    // Take the prefetched blob if it matches `track` (clearing the cache);
    // returns '' when nothing usable is cached.
    const claimPrefetch = useCallback(async function (track) {
        const entry = prefetchRef.current;
        if (!entry || entry.id !== track.id) return '';
        prefetchRef.current = null;
        setPrefetchId('');
        try {
            const result = await entry.promise;
            return result.url || '';
        } catch (err) { return ''; }
    }, []);

    /* --- theme --- */

    useEffect(() => {
        const saved = storageGet(THEME_KEY);
        if (saved === 'light' || saved === 'dark') setTheme(saved);
        else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }, []);

    // The page owns the whole viewport; keep <body> in sync so overscroll
    // edges don't flash the blog background.
    useEffect(() => {
        const previous = document.body.style.background;
        document.body.style.background = theme === 'dark' ? '#08080d' : '#eef0f7';
        return () => { document.body.style.background = previous; };
    }, [theme]);

    const toggleTheme = useCallback(function () {
        setTheme((mode) => {
            const next = mode === 'dark' ? 'light' : 'dark';
            storageSet(THEME_KEY, next);
            return next;
        });
    }, []);

    /* --- toasts --- */

    useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(''), 3200);
        return () => clearTimeout(timer);
    }, [notice]);

    /* --- Google Drive connection --- */

    useEffect(() => {
        const savedId = storageGet(CLIENT_ID_KEY);
        const savedFolder = storageGet(FOLDER_ID_KEY);
        setClientId(savedId);
        setClientIdDraft(savedId);
        if (savedFolder) setFolderId(savedFolder);
    }, []);

    // Revoke the blob URLs (current + prefetched) when leaving the page.
    useEffect(() => () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const entry = prefetchRef.current;
        if (entry && entry.promise) entry.promise.then((r) => r.url && URL.revokeObjectURL(r.url)).catch(() => {});
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
        setSearch('');
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

    /* --- playback --- */

    // One-time silent-source play INSIDE the tap gesture: WKWebView shells
    // like Alook reject `play()` calls that happen after an await, so the
    // element must be unlocked synchronously on the first user interaction.
    const unlockAudio = useCallback(function () {
        if (unlockRef.current || !isIOSLike()) return;
        const audio = audioRef.current;
        if (!audio) return;
        unlockRef.current = true;
        try {
            audio.src = SILENT_WAV;
            const request = audio.play();
            if (request && typeof request.then === 'function') {
                request.then(function () {
                    audio.pause();
                    audio.currentTime = 0;
                }).catch(() => {});
            } else {
                audio.pause();
            }
        } catch (err) { /* old webviews: element already unlocked or unusable */ }
    }, []);

    const play = useCallback(async function (track) {
        setError('');
        setLoadingId(track.id);
        const seq = ++playSeqRef.current;
        try {
            // Use the prefetched blob when it matches — instant start, and
            // the only path that survives background auto-advance on iOS.
            let url = await claimPrefetch(track);
            if (seq !== playSeqRef.current) {
                if (url) URL.revokeObjectURL(url);
                return;
            }
            if (!url) url = await fetchTrackUrl(track, token);
            if (seq !== playSeqRef.current) {
                // A newer click superseded this download — drop its blob.
                if (url) URL.revokeObjectURL(url);
                return;
            }
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = url;
            setProgress({ time: 0, duration: 0 });
            setCurrent({ track, url });
        } catch (err) {
            if (seq === playSeqRef.current) setError(`播放「${track.name}」失败：${err.message}`);
        } finally {
            if (seq === playSeqRef.current) setLoadingId('');
        }
    }, [token, fetchTrackUrl, claimPrefetch]);

    // Clicking the row of the track that is already loaded toggles
    // play/pause instead of downloading the whole file again.
    const toggleTrack = useCallback(function (track) {
        unlockAudio();
        if (current && current.track.id === track.id) {
            const audio = audioRef.current;
            if (!audio) return;
            if (audio.paused || audio.ended) safePlay(audio);
            else audio.pause();
            return;
        }
        play(track);
    }, [current, play, unlockAudio]);

    const togglePlay = useCallback(function () {
        const audio = audioRef.current;
        if (!audio || !current) return;
        if (audio.paused || audio.ended) safePlay(audio);
        else audio.pause();
    }, [current]);

    const visibleTracks = useMemo(function () {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return tracks;
        return tracks.filter((track) => {
            const { artist, title } = parseTrackName(track.name);
            return (
                track.name.toLowerCase().includes(keyword)
                || title.toLowerCase().includes(keyword)
                || artist.toLowerCase().includes(keyword)
            );
        });
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
            setProgress((state) => ({ ...state, time: 0 }));
            return;
        }
        stepTrack(-1);
    }, [stepTrack]);

    const cycleRepeat = useCallback(function () {
        setRepeat((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'));
    }, []);

    /* --- now-playing transitions (mini bar ⇄ sheet) --- */

    const openPlayer = useCallback(function () {
        setPlayerClosing(false);
        setPlayerOpen(true);
    }, []);

    // Dismiss = slide the sheet back down; it unmounts via `onClosed`.
    // With reduced motion the CSS animation never fires an end event, so
    // unmount immediately instead.
    const closePlayer = useCallback(function (nextTab) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setPlayerOpen(false);
            setPlayerClosing(false);
        } else {
            setPlayerClosing(true);
        }
        if (nextTab) setTab(nextTab);
    }, []);

    const finishClosePlayer = useCallback(function () {
        setPlayerOpen(false);
        setPlayerClosing(false);
    }, []);

    // A new tap while the exit animation runs — bring the sheet back.
    const cancelClosePlayer = useCallback(function () {
        setPlayerClosing(false);
    }, []);

    // Which track auto-advance will pick up at `ended` (sequential only —
    // shuffle chooses randomly at the last moment, so nothing to prefetch).
    const upcomingTrack = useMemo(function () {
        if (!current || repeat === 'one' || visibleTracks.length === 0) return null;
        if (shuffle) return null;
        const index = visibleTracks.findIndex((track) => track.id === current.track.id);
        if (index === -1) return visibleTracks[0];
        return visibleTracks[index + 1] || (repeat === 'all' ? visibleTracks[0] : null);
    }, [current, repeat, shuffle, visibleTracks]);

    // Keep the next song's blob downloaded while the current one plays, so
    // background auto-advance works on iOS (a cold fetch there is suspended
    // until the page returns to the foreground).
    useEffect(() => {
        if (!token || !isPlaying) return;
        if (!upcomingTrack || upcomingTrack.id === prefetchId) return;
        startPrefetch(upcomingTrack);
    }, [token, isPlaying, upcomingTrack, prefetchId, startPrefetch]);

    // Auto-advance at the end of a track. With the next blob already
    // prefetched this is a plain src swap — it keeps rolling even while the
    // page sits in the background on iOS; only the rare un-cached case
    // (shuffle, dead prefetch) falls back to a foreground fetch.
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

    /* --- media session (lock screen / hardware keys) --- */

    useEffect(() => {
        if (!current || typeof window === 'undefined' || !('mediaSession' in navigator)) return undefined;
        const session = navigator.mediaSession;
        const { artist, title } = parseTrackName(current.track.name);
        try {
            const metadata = new window.MediaMetadata({
                title,
                artist,
                album: '云盘音乐',
            });
            const artwork = makeArtwork(current.track.name);
            if (artwork) {
                metadata.artwork = [{ src: artwork, sizes: '320x320', type: 'image/png' }];
            }
            session.metadata = metadata;
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

    // No auto-scrolling to the current row — switching tabs or auto-advance
    // must never yank the list position around.

    // Space = play/pause, ←/→ = seek ±10s (ignored while typing in a field).
    useEffect(() => {
        const onKeyDown = function (event) {
            const target = event.target;
            if (
                target
                && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
            ) return;
            const audio = audioRef.current;
            if (!audio || !current) return;
            if (event.code === 'Space') {
                event.preventDefault();
                if (audio.paused || audio.ended) safePlay(audio);
                else audio.pause();
            } else if (event.key === 'ArrowLeft') {
                audio.currentTime = Math.max(0, audio.currentTime - 10);
            } else if (event.key === 'ArrowRight') {
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [current]);

    /* --- render --- */

    const folderName = folderId
        ? ((folders.find((folder) => folder.id === folderId) || {}).name || '')
        : '整个云盘';

    return (
        <div className={`${styles.page} ${theme === 'dark' ? styles['theme-dark'] : ''}`}>
            <SEO title="音乐" />

            <Script
                src={GSI_SRC}
                strategy="afterInteractive"
                onLoad={() => setGsiReady(true)}
                onError={() => setError('Google 登录组件加载失败，请检查网络')}
            />

            <div className={styles.bg} aria-hidden="true">
                <span className={`${styles.blob} ${styles['blob-1']}`} />
                <span className={`${styles.blob} ${styles['blob-2']}`} />
                <span className={`${styles.blob} ${styles['blob-3']}`} />
            </div>

            <div className={styles.app}>
                {/* Both tab pages stay mounted (scroll position survives the
                    switch); the shown one replays its enter transition. */}
                <div
                    className={`${styles.view}${tab === 'list' ? ` ${styles['view-in']}` : ''}`}
                    style={{ display: tab === 'list' ? undefined : 'none' }}
                >
                    <TrackList
                        connected={!!token}
                        folderName={folderName}
                        listLoading={listLoading}
                        tracks={tracks}
                        visibleTracks={visibleTracks}
                        search={search}
                        onSearch={setSearch}
                        current={current}
                        loadingId={loadingId}
                        isPlaying={isPlaying}
                        onToggleTrack={toggleTrack}
                        onGoProfile={() => setTab('profile')}
                        onRefresh={loadTracks}
                    />
                </div>
                <div
                    className={`${styles.view}${tab === 'profile' ? ` ${styles['view-in']}` : ''}`}
                    style={{ display: tab === 'profile' ? undefined : 'none' }}
                >
                    <Profile
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        connected={!!token}
                        gsiReady={gsiReady}
                        clientId={clientId}
                        clientIdDraft={clientIdDraft}
                        onClientIdDraft={setClientIdDraft}
                        onConnect={connect}
                        onDisconnect={disconnect}
                        folders={folders}
                        folderId={folderId}
                        folderName={folderName}
                        onFolderChange={handleFolderChange}
                        onRefresh={loadTracks}
                        loading={listLoading}
                        trackCount={tracks.length}
                        onGoList={() => setTab('list')}
                    />
                </div>
            </div>

            {current && !playerOpen && (
                <MiniPlayer
                    current={current}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    onNext={playNext}
                    onOpenPlayer={openPlayer}
                />
            )}

            <TabBar tab={tab} hidden={playerOpen} onChange={setTab} />

            {playerOpen && current && (
                <NowPlaying
                    track={current.track}
                    isPlaying={isPlaying}
                    progress={progress}
                    shuffle={shuffle}
                    repeat={repeat}
                    listLoading={listLoading}
                    closing={playerClosing}
                    onClosed={finishClosePlayer}
                    onCancelClose={cancelClosePlayer}
                    onToggleShuffle={() => setShuffle((on) => !on)}
                    onCycleRepeat={cycleRepeat}
                    onTogglePlay={togglePlay}
                    onPrev={playPrev}
                    onNext={playNext}
                    onSeek={(value) => {
                        const audio = audioRef.current;
                        if (audio && Number.isFinite(value)) {
                            audio.currentTime = value;
                            setProgress((state) => ({ ...state, time: value }));
                        }
                    }}
                    onClose={() => closePlayer()}
                    onOpenList={() => closePlayer('list')}
                    onOpenProfile={() => closePlayer('profile')}
                    onRefresh={loadTracks}
                />
            )}

            {(error || notice) && (
                <div className={`${styles.toast}${error ? ` ${styles['toast-error']}` : ''}`} role="status">
                    {error || notice}
                </div>
            )}

            <audio
                ref={audioRef}
                preload="auto"
                playsInline
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(event) => setProgress((state) => ({ ...state, time: event.target.currentTime }))}
                onLoadedMetadata={(event) => setProgress((state) => ({ ...state, duration: event.target.duration || 0 }))}
                onDurationChange={(event) => setProgress((state) => ({ ...state, duration: event.target.duration || 0 }))}
            >
                <track kind="captions" />
            </audio>
        </div>
    );
};

export default MusicPage;
