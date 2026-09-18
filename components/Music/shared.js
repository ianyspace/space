/* Shared constants + pure helpers for the music app (`pages/music/`). */

export const GSI_SRC = 'https://accounts.google.com/gsi/client';
export const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const CLIENT_ID_KEY = 'music:googleClientId';
export const TOKEN_KEY = 'music:googleToken';
export const FOLDER_ID_KEY = 'music:folderId';
export const THEME_KEY = 'music:theme';
export const LAST_TRACK_KEY = 'music:lastTrack';
export const LAST_PROGRESS_KEY = 'music:lastProgress';
export const TRACK_LIST_CACHE_KEY = 'music:trackListCache';
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
// Drive returns at most `pageSize` files per response; follow nextPageToken
// so libraries bigger than one page still show up (capped to stay sane).
export const LIST_HARD_CAP = 1000;

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

export const formatSize = function (bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return '';
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const formatTime = function (seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0');
    return `${mins.toString().padStart(2, '0')}:${secs}`;
};

export const storageGet = function (key) {
    try {
        return window.localStorage.getItem(key) || '';
    } catch (err) { return ''; }
};

export const storageSet = function (key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (err) { /* private mode etc. — keep working without persistence */ }
};

const AUDIO_DB_NAME = 'music-audio-cache';
const AUDIO_STORE_NAME = 'tracks';

const openAudioDb = function () {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const request = window.indexedDB.open(AUDIO_DB_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getCachedAudio = async function (id) {
    let db;
    try {
        db = await openAudioDb();
        const record = await new Promise((resolve, reject) => {
            const request = db.transaction(AUDIO_STORE_NAME, 'readonly').objectStore(AUDIO_STORE_NAME).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        if (!record || record.expiresAt <= Date.now()) {
            if (record) await deleteCachedAudio(id);
            return null;
        }
        return record.blob;
    } catch (err) {
        return null;
    } finally {
        if (db) db.close();
    }
};

export const cacheAudio = async function (id, blob) {
    let db;
    try {
        db = await openAudioDb();
        await new Promise((resolve, reject) => {
            const request = db.transaction(AUDIO_STORE_NAME, 'readwrite').objectStore(AUDIO_STORE_NAME).put({
                id,
                blob,
                expiresAt: Date.now() + CACHE_TTL,
            });
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });
    } catch (err) { /* quota/private mode: playback still works without cache */
    } finally {
        if (db) db.close();
    }
};

export const deleteCachedAudio = async function (id) {
    let db;
    try {
        db = await openAudioDb();
        await new Promise((resolve, reject) => {
            const request = db.transaction(AUDIO_STORE_NAME, 'readwrite').objectStore(AUDIO_STORE_NAME).delete(id);
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });
    } catch (err) { /* cache cleanup is best effort */
    } finally {
        if (db) db.close();
    }
};

export const pruneCachedAudio = async function () {
    let db;
    try {
        db = await openAudioDb();
        await new Promise((resolve, reject) => {
            const store = db.transaction(AUDIO_STORE_NAME, 'readwrite').objectStore(AUDIO_STORE_NAME);
            const request = store.openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) { resolve(); return; }
                if (cursor.value.expiresAt <= Date.now()) cursor.delete();
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) { /* cache cleanup is best effort */
    } finally {
        if (db) db.close();
    }
};

// Every cached entry with its metadata, expired ones included — the cache
// manager lists what is actually stored, so a still-listed-but-expired blob is
// shown (and can be cleared) rather than hidden. The blob itself is left out of
// the result so a large library never gets copied into JS memory just to be
// rendered.
export const listCachedAudio = async function () {
    let db;
    try {
        db = await openAudioDb();
        return await new Promise((resolve, reject) => {
            const entries = [];
            const request = db.transaction(AUDIO_STORE_NAME, 'readonly').objectStore(AUDIO_STORE_NAME).openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) { resolve(entries); return; }
                const { id, blob, expiresAt } = cursor.value;
                entries.push({ id, size: blob ? blob.size : 0, expiresAt: Number(expiresAt) || 0 });
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        return null;
    } finally {
        if (db) db.close();
    }
};

// Clears records by key, or the whole store when called with no keys — the
// cache manager's "全部删除".
export const deleteCachedAudioMany = async function (keys) {
    let db;
    try {
        db = await openAudioDb();
        await new Promise((resolve, reject) => {
            const store = db.transaction(AUDIO_STORE_NAME, 'readwrite').objectStore(AUDIO_STORE_NAME);
            if (Array.isArray(keys) && keys.length > 0) {
                keys.forEach((key) => store.delete(key));
            } else {
                store.clear();
            }
            // A store with no pending requests fires no success event, so
            // settle on the transaction itself.
            store.transaction.oncomplete = resolve;
            store.transaction.onerror = () => reject(store.transaction.error);
            store.transaction.onabort = () => reject(store.transaction.error);
        });
        return true;
    } catch (err) {
        return false;
    } finally {
        if (db) db.close();
    }
};

// iOS (and iOS-only browsers like Alook — they are all WKWebView) needs the
// audio element to have played once inside a real user gesture before later
// async `play()` calls (after a Drive blob download) are allowed.
export const isIOSLike = function () {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const iOSUA = /iP(hone|ad|od)/.test(ua);
    // iPadOS 13+ reports a Macintosh UA but still behaves like iOS.
    const iPadOS = ua.includes('Macintosh')
        && typeof navigator.maxTouchPoints === 'number'
        && navigator.maxTouchPoints > 1;
    return iOSUA || iPadOS;
};

// ~0.01s of silence — lets the unlock `play()` resolve promptly instead of
// hanging with an empty src (which would leave the element "playing").
export const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

// `audio.play()` may reject as a promise OR throw synchronously (Safari has
// been observed doing the latter, which crashes the whole page when it
// happens inside an event handler) — swallow both failure modes.
export const safePlay = function (audio) {
    try {
        const request = audio.play();
        if (request && typeof request.catch === 'function') request.catch(() => { });
    } catch (err) { /* autoplay denied etc. */ }
};

// "01. Artist - Title.mp3" → { artist: 'Artist', title: 'Title', ext: 'MP3' }
export const parseTrackName = function (name) {
    const extMatch = name.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toUpperCase() : '';
    const base = name
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/^\s*\d{1,3}[\s._-]+/, '');
    const parts = base.split(/\s+[-—–]\s+/);
    if (parts.length >= 2) {
        return { artist: parts[0].trim() || '未知艺术家', title: parts.slice(1).join(' - ').trim(), ext };
    }
    // The music library convention is also `Title-Artist`, often without
    // spaces, so keep the first separator as the title/artist boundary.
    const compactParts = base.split(/\s*[-—–]\s*/);
    if (compactParts.length >= 2) {
        return {
            artist: compactParts.slice(1).join('-').trim() || '未知艺术家',
            title: compactParts[0].trim(),
            ext,
        };
    }
    return { artist: '未知艺术家', title: base, ext };
};

const hashTrack = function (name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % ART_GRADIENTS.length;
};

export const trackGradient = function (name) {
    const [from, to] = ART_GRADIENTS[hashTrack(name)];
    return `linear-gradient(135deg, ${from}, ${to})`;
};

// Lock-screen / media-key artwork: render the track gradient to a canvas.
export const makeArtwork = function (name) {
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

export const listAllFiles = async function (driveGet, params, accessToken) {
    const files = [];
    let pageToken = '';
    do {
        const data = await driveGet(pageToken ? { ...params, pageToken } : params, accessToken);
        files.push(...(data.files || []));
        pageToken = data.nextPageToken || '';
    } while (pageToken && files.length < LIST_HARD_CAP);
    return files;
};

export const normalizeLyricKey = function (name) {
    return name
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/^\s*\d{1,3}[\s._-]+/, '')
        .toLowerCase()
        .replace(/[\s._()[\]{}-]+/g, '');
};

export const parseLyrics = function (text) {
    const lines = [];
    const lrcPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]([^\r\n]*)/g;
    let match;
    while ((match = lrcPattern.exec(text)) !== null) {
        const fraction = match[3] ? Number(`0.${match[3].padEnd(3, '0')}`) : 0;
        const lyric = match[4].trim();
        if (lyric) lines.push({ time: Number(match[1]) * 60 + Number(match[2]) + fraction, text: lyric });
    }
    if (lines.length > 0) return { timed: true, lines: lines.sort((a, b) => a.time - b.time) };
    return {
        timed: false,
        lines: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => ({ time: 0, text: line })),
    };
};
