import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

import SEO from 'components/SEO';

import styles from './music.module.scss';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const CLIENT_ID_KEY = 'music:googleClientId';
const FOLDER_ID_KEY = 'music:folderId';
const THEME_KEY = 'music:theme';
const VOLUME_KEY = 'music:volume';
// Drive returns at most `pageSize` files per response; follow nextPageToken
// so libraries bigger than one page still show up (capped to stay sane).
const LIST_HARD_CAP = 1000;

const ART_GRADIENTS = [
    ['#fb5c74', '#fa233b'],
    ['#64d2ff', '#0a84ff'],
    ['#bf5af2', '#5e5ce6'],
    ['#ffd60a', '#ff9f0a'],
    ['#30d158', '#00c7be'],
    ['#ff9f0a', '#fa2d9c'],
    ['#8e8ef7', '#4150d8'],
    ['#66d1ba', '#1d9a8a'],
];

/* --- tiny inline icon set (SF-Symbols-like) --- */

const SvgStroke = function ({ children, size = 20 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
};

const IconPlay = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8.2 5.6a1.2 1.2 0 0 1 1.83-1.02l10.1 6.4a1.2 1.2 0 0 1 0 2.03l-10.1 6.4A1.2 1.2 0 0 1 8.2 18.4z" />
    </svg>
);

const IconPause = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="4.5" width="4.2" height="15" rx="1.6" />
        <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.6" />
    </svg>
);

const IconPrev = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="4" y="5.4" width="2.4" height="13.2" rx="1.2" />
        <path d="M20 7v10a1.1 1.1 0 0 1-1.7.92l-7.6-5a1.1 1.1 0 0 1 0-1.84l7.6-5A1.1 1.1 0 0 1 20 7z" />
    </svg>
);

const IconNext = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="17.6" y="5.4" width="2.4" height="13.2" rx="1.2" />
        <path d="M4 7v10a1.1 1.1 0 0 0 1.7.92l7.6-5a1.1 1.1 0 0 0 0-1.84l-7.6-5A1.1 1.1 0 0 0 4 7z" />
    </svg>
);

const IconShuffle = () => (
    <SvgStroke size={18}>
        <path d="M16 3h5v5" />
        <path d="M4 20L21 3" />
        <path d="M21 16v5h-5" />
        <path d="M15 15l6 6" />
        <path d="M4 4l5 5" />
    </SvgStroke>
);

const IconRepeat = () => (
    <SvgStroke size={18}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </SvgStroke>
);

const IconRepeatOne = () => (
    <SvgStroke size={18}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        <path d="M11.5 10.2l1.6-1v5.6" strokeWidth="1.8" />
    </SvgStroke>
);

const IconSearch = () => (
    <SvgStroke size={15}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
    </SvgStroke>
);

const IconVolume = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.5 4.2a1 1 0 0 1 .5.87v13.86a1 1 0 0 1-1.64.77L6.65 16.5H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2.65l3.7-3.2a1 1 0 0 1 1.15-.1z" />
        <path
            d="M15.5 8.7a4.7 4.7 0 0 1 0 6.6M18 6.2a8.2 8.2 0 0 1 0 11.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
);

const IconMuted = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.5 4.2a1 1 0 0 1 .5.87v13.86a1 1 0 0 1-1.64.77L6.65 16.5H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2.65l3.7-3.2a1 1 0 0 1 1.15-.1z" />
        <path
            d="M16 9.5l5 5M21 9.5l-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
);

const IconSun = () => (
    <SvgStroke size={17}>
        <circle cx="12" cy="12" r="4.4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4L19 19M19 5l-1.6 1.6M6.6 17.4L5 19" />
    </SvgStroke>
);

const IconMoon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 12.8A8.6 8.6 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z" />
    </svg>
);

const IconFolder = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.6a2 2 0 0 1 1.56.75l1 1.25h6.84A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
);

const IconRefresh = () => (
    <SvgStroke size={16}>
        <path d="M21.5 4v5h-5" />
        <path d="M2.5 20v-5h5" />
        <path d="M4.6 9a8 8 0 0 1 13.3-3.2L21.5 9M2.5 15l3.6 3.2A8 8 0 0 0 19.4 15" />
    </SvgStroke>
);

const IconNote = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 17.5V6.2a1.5 1.5 0 0 1 1.24-1.48l8-1.45A1.5 1.5 0 0 1 20 4.75v10.9" />
        <circle cx="6.5" cy="17.5" r="3" />
        <circle cx="17.5" cy="15.6" r="3" />
    </svg>
);

const IconChevron = () => (
    <SvgStroke size={14}>
        <path d="M6 9l6 6 6-6" />
    </SvgStroke>
);

const IconLogout = () => (
    <SvgStroke size={15}>
        <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
    </SvgStroke>
);

/* --- helpers --- */

const formatSize = function (bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return '';
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const formatTime = function (seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0');
    return `${mins}:${secs}`;
};

const storageGet = function (key) {
    try {
        return window.localStorage.getItem(key) || '';
    } catch (err) { return ''; }
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

// "01. Artist - Title.mp3" → { artist: 'Artist', title: 'Title' }
const parseTrackName = function (name) {
    const base = name
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/^\s*\d{1,3}[\s._-]+/, '');
    const parts = base.split(/\s+[-—–]\s+/);
    if (parts.length >= 2) {
        return { artist: parts[0].trim() || '未知艺术家', title: parts.slice(1).join(' - ').trim() };
    }
    return { artist: '未知艺术家', title: base };
};

const hashTrack = function (name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % ART_GRADIENTS.length;
};

const trackGradient = function (name) {
    const [from, to] = ART_GRADIENTS[hashTrack(name)];
    return `linear-gradient(135deg, ${from}, ${to})`;
};

// Lock-screen / media-key artwork: render the track gradient to a canvas.
const makeArtwork = function (name) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        const [from, to] = ART_GRADIENTS[hashTrack(name)];
        const gradient = ctx.createLinearGradient(0, 0, 320, 320);
        gradient.addColorStop(0, from);
        gradient.addColorStop(1, to);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 320, 320);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '170px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', 160, 178);
        return canvas.toDataURL('image/png');
    } catch (err) { return ''; }
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
 * Standalone Apple-style music app page (`/music/`). The visitor connects
 * their own Google Drive with Google Identity Services (implicit token flow,
 * drive.readonly), picks a folder and plays files as blobs — no backend,
 * which the static export on GitHub Pages requires.
 *
 * The UI is a self-contained "Liquid Glass" player: light/dark theme of its
 * own, custom transport controls, seek + volume sliders, shuffle/repeat,
 * in-list search, background auto-advance and Media Session integration
 * (lock-screen controls with generated artwork). The OAuth client ID is the
 * only setup: entered once, kept in localStorage, nothing secret committed.
 */
const MusicPage = function () {
    const [theme, setTheme] = useState('light');
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
    const [progress, setProgress] = useState({ time: 0, duration: 0 });
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    const audioRef = useRef(null);
    const objectUrlRef = useRef('');
    // Guards against two blob downloads racing when several tracks are
    // clicked in quick succession — only the latest click may win.
    const playSeqRef = useRef(0);
    const activeItemRef = useRef(null);

    /* --- theme --- */

    useEffect(() => {
        const saved = storageGet(THEME_KEY);
        if (saved === 'light' || saved === 'dark') setTheme(saved);
        else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const savedVolume = Number(storageGet(VOLUME_KEY));
        if (Number.isFinite(savedVolume) && savedVolume > 0) setVolume(savedVolume);
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
            setProgress({ time: 0, duration: 0 });
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

    // Auto-advance at the end of a track — this keeps playing in the
    // background: the audio element continues in hidden tabs and `ended`
    // still fires, so the next blob download + play go through untouched.
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

    const handleVolume = useCallback(function (value) {
        setVolume(value);
        setMuted(value === 0);
        storageSet(VOLUME_KEY, String(value));
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = muted ? 0 : volume;
    }, [volume, muted, current]);

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

    // Auto-advancing to the next track should bring its row into view.
    const currentId = current ? current.track.id : '';
    useEffect(() => {
        if (currentId && activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [currentId]);

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

    const activeTrack = current ? current.track : null;
    const activeMeta = activeTrack ? parseTrackName(activeTrack.name) : { artist: '', title: '' };
    const { time, duration } = progress;
    const seekPercent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
    const volumePercent = (muted ? 0 : volume) * 100;
    const eqClass = `${styles.eq}${isPlaying ? '' : ` ${styles['eq-paused']}`}`;
    const keyword = search.trim();
    const folderName = folderId ? ((folders.find((folder) => folder.id === folderId) || {}).name || '') : '整个云盘';

    return (
        <div className={`${styles.page} ${theme === 'dark' ? styles['theme-dark'] : styles['theme-light']}`}>
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
                <span className={`${styles.blob} ${styles['blob-4']}`} />
            </div>

            <div className={styles.shell}>
                <header className={styles.topbar}>
                    <div className={styles.brand}>
                        <span className={styles['brand-icon']}>
                            <IconNote />
                        </span>
                        <div className={styles['brand-text']}>
                            <span className={styles['brand-name']}>云音乐</span>
                            <span className={styles['brand-sub']}>{token ? folderName : 'Google Drive 播放器'}</span>
                        </div>
                    </div>
                    <div className={styles['topbar-tools']}>
                        {token && (
                            <>
                                <label className={styles['folder-pill']} title="选择云盘文件夹">
                                    <span className={styles['folder-icon']}><IconFolder /></span>
                                    <select
                                        className={styles['folder-select']}
                                        value={folderId}
                                        onChange={handleFolderChange}
                                        aria-label="选择云盘文件夹"
                                    >
                                        <option value="">整个云盘</option>
                                        {folders.map((folder) => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                    </select>
                                    <span className={styles['folder-chevron']}><IconChevron /></span>
                                </label>
                                <button
                                    type="button"
                                    className={`${styles['icon-btn']}${listLoading ? ` ${styles.spinning}` : ''}`}
                                    title="刷新列表"
                                    aria-label="刷新列表"
                                    disabled={listLoading}
                                    onClick={loadTracks}
                                >
                                    <IconRefresh />
                                </button>
                                <button
                                    type="button"
                                    className={styles['icon-btn']}
                                    title="断开连接"
                                    aria-label="断开连接"
                                    onClick={disconnect}
                                >
                                    <IconLogout />
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            className={styles['icon-btn']}
                            title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
                            aria-label="切换深浅色"
                            onClick={toggleTheme}
                        >
                            {theme === 'dark' ? <IconSun /> : <IconMoon />}
                        </button>
                    </div>
                </header>

                {!token ? (
                    <section className={styles.onboard}>
                        <div className={styles['onboard-icon']}><IconNote /></div>
                        <h1 className={styles['onboard-title']}>云音乐</h1>
                        <p className={styles['onboard-sub']}>
                            用你自己的 Google 云盘当曲库，连接后即可在线播放，
                            支持后台自动连播、随机与单曲循环。
                        </p>
                        <ol className={styles['onboard-steps']}>
                            <li>
                                在{' '}
                                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                                    Google Cloud Console
                                </a>
                                {' '}创建一个「Web 应用」类型的 OAuth 客户端 ID
                            </li>
                            <li>
                                在「已获授权的 JavaScript 来源」里添加{' '}
                                <code>https://ianyspace.github.io</code>
                                （本地调试再加 <code>http://localhost:3000</code>）
                            </li>
                            <li>把客户端 ID 粘贴到下面，点击连接</li>
                        </ol>
                        <div className={styles['onboard-row']}>
                            <input
                                className={styles['onboard-input']}
                                type="text"
                                placeholder="粘贴 OAuth 客户端 ID（xxxx.apps.googleusercontent.com）"
                                value={clientIdDraft}
                                onChange={(event) => setClientIdDraft(event.target.value)}
                                onKeyDown={(event) => event.key === 'Enter' && connect()}
                            />
                            <button
                                type="button"
                                className={styles['primary-btn']}
                                disabled={!gsiReady}
                                onClick={connect}
                            >
                                {gsiReady ? '连接 Google 云盘' : '正在加载 Google 组件…'}
                            </button>
                        </div>
                        {clientId && (
                            <p className={styles['onboard-saved']}>检测到已保存的客户端 ID，直接点击连接即可。</p>
                        )}
                    </section>
                ) : (
                    <main className={styles.grid}>
                        <section className={styles.player}>
                            <div
                                className={styles.art}
                                style={activeTrack ? { background: trackGradient(activeTrack.name) } : undefined}
                            >
                                <span className={styles['art-note']}><IconNote /></span>
                                {activeTrack && (
                                    <span className={styles['art-gloss']} aria-hidden="true" />
                                )}
                            </div>
                            <div className={styles['np-meta']}>
                                <span className={styles['np-title']}>
                                    {activeTrack ? activeMeta.title : '未在播放'}
                                </span>
                                <span className={styles['np-artist']}>
                                    {activeTrack ? activeMeta.artist : '从右侧资料库选一首歌开始'}
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
                                    disabled={!current || duration <= 0}
                                    aria-label="播放进度"
                                    onChange={(event) => {
                                        const audio = audioRef.current;
                                        const value = Number(event.target.value);
                                        if (audio && Number.isFinite(value)) {
                                            audio.currentTime = value;
                                            setProgress((state) => ({ ...state, time: value }));
                                        }
                                    }}
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
                                    className={styles['mode-btn']}
                                    aria-pressed={shuffle}
                                    title="随机播放"
                                    disabled={!current}
                                    onClick={() => setShuffle((on) => !on)}
                                >
                                    <IconShuffle />
                                </button>
                                <button
                                    type="button"
                                    className={styles['skip-btn']}
                                    title="上一首"
                                    disabled={!current || visibleTracks.length < 2}
                                    onClick={playPrev}
                                >
                                    <IconPrev />
                                </button>
                                <button
                                    type="button"
                                    className={styles['play-btn']}
                                    title={isPlaying ? '暂停' : '播放'}
                                    disabled={!current}
                                    onClick={togglePlay}
                                >
                                    {isPlaying ? <IconPause /> : <IconPlay />}
                                </button>
                                <button
                                    type="button"
                                    className={styles['skip-btn']}
                                    title="下一首"
                                    disabled={!current || visibleTracks.length < 2}
                                    onClick={playNext}
                                >
                                    <IconNext />
                                </button>
                                <button
                                    type="button"
                                    className={`${styles['mode-btn']}${repeat !== 'off' ? ` ${styles['mode-btn-on']}` : ''}`}
                                    aria-pressed={repeat !== 'off'}
                                    title={repeat === 'one' ? '单曲循环' : repeat === 'all' ? '列表循环' : '循环关闭'}
                                    disabled={!current}
                                    onClick={cycleRepeat}
                                >
                                    {repeat === 'one' ? <IconRepeatOne /> : <IconRepeat />}
                                </button>
                            </div>
                            <div className={styles['np-volume']}>
                                <button
                                    type="button"
                                    className={styles['volume-btn']}
                                    title={muted ? '取消静音' : '静音'}
                                    aria-label={muted ? '取消静音' : '静音'}
                                    onClick={() => handleVolume(muted ? (volume > 0 ? volume : 0.6) : 0)}
                                >
                                    {muted || volume === 0 ? <IconMuted /> : <IconVolume />}
                                </button>
                                <input
                                    className={styles.slider}
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={muted ? 0 : volume}
                                    aria-label="音量"
                                    onChange={(event) => handleVolume(Number(event.target.value))}
                                    style={{ '--fill': `${volumePercent}%` }}
                                />
                            </div>
                        </section>

                        <section className={styles.library}>
                            <div className={styles['lib-head']}>
                                <div className={styles['lib-title']}>
                                    <span>资料库</span>
                                    <span className={styles['lib-count']}>
                                        {listLoading
                                            ? '加载中…'
                                            : keyword
                                                ? `${visibleTracks.length} / ${tracks.length}`
                                                : `${tracks.length} 首`}
                                    </span>
                                </div>
                                <label className={styles['search-box']}>
                                    <span className={styles['search-icon']}><IconSearch /></span>
                                    <input
                                        className={styles['search-input']}
                                        type="search"
                                        placeholder="搜索歌曲或歌手"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        aria-label="搜索歌曲"
                                    />
                                </label>
                            </div>
                            <div className={styles['lib-scroll']}>
                                {!listLoading && visibleTracks.length === 0 && (
                                    <p className={styles['lib-empty']}>
                                        {keyword
                                            ? `没有匹配「${keyword}」的歌曲`
                                            : '没有找到音频文件，换个文件夹试试？'}
                                    </p>
                                )}
                                <ul className={styles.tracks}>
                                    {visibleTracks.map((track) => {
                                        const active = current && current.track.id === track.id;
                                        const meta = parseTrackName(track.name);
                                        return (
                                            <li key={track.id} ref={active ? activeItemRef : undefined}>
                                                <button
                                                    type="button"
                                                    className={active ? styles['track-active'] : styles.track}
                                                    disabled={loadingId === track.id}
                                                    onClick={() => toggleTrack(track)}
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
                                                        <span className={styles['track-artist']}>
                                                            {meta.artist}
                                                            {track.size ? ` · ${formatSize(track.size)}` : ''}
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
                            </div>
                        </section>
                    </main>
                )}
            </div>

            {(error || notice) && (
                <div className={`${styles.toast}${error ? ` ${styles['toast-error']}` : ''}`} role="status">
                    {error || notice}
                </div>
            )}

            <audio
                ref={audioRef}
                preload="auto"
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
