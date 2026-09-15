import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const formatSize = function (bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return '';
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Standalone music page (`/music/`). Connects to the visitor's own Google
 * Drive with Google Identity Services (implicit token flow, drive.readonly),
 * lists audio files (optionally scoped to one folder) and plays the selected
 * file by downloading it as a blob — no backend needed, which is required for
 * the static export on GitHub Pages.
 *
 * The OAuth client ID is the only setup: it is entered on the page once and
 * kept in localStorage, so nothing secret is committed to the repository.
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
    const [listLoading, setListLoading] = useState(false);
    const [current, setCurrent] = useState(null);
    const [loadingId, setLoadingId] = useState('');

    const audioRef = useRef(null);
    const objectUrlRef = useRef('');

    useEffect(() => {
        let saved = '';
        try {
            saved = window.localStorage.getItem(CLIENT_ID_KEY) || '';
        } catch (err) { /* private mode etc. — just ask again */ }
        setClientId(saved);
        setClientIdDraft(saved);
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
        try {
            window.localStorage.setItem(CLIENT_ID_KEY, id);
        } catch (err) { /* keep working without persistence */ }
        setClientId(id);
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
    }, [clientIdDraft]);

    const disconnect = useCallback(function () {
        setToken('');
        setFolderId('');
        setFolders([]);
        setTracks([]);
        setCurrent(null);
        setNotice('已断开连接');
    }, []);

    useEffect(() => {
        if (!token) return undefined;
        let cancelled = false;
        (async function loadFolders() {
            try {
                const data = await driveGet({
                    q: `mimeType='${FOLDER_MIME}' and trashed=false`,
                    fields: 'files(id,name)',
                    pageSize: '200',
                    orderBy: 'name',
                }, token);
                if (!cancelled) setFolders(data.files || []);
            } catch (err) {
                if (!cancelled) setError(`获取文件夹列表失败：${err.message}`);
            }
        }());
        return () => { cancelled = true; };
    }, [token, driveGet]);

    const loadTracks = useCallback(async function () {
        if (!token) return;
        let q = "mimeType contains 'audio' and trashed=false";
        if (folderId) q += ` and '${folderId}' in parents`;
        setListLoading(true);
        setError('');
        try {
            const data = await driveGet({
                q,
                fields: 'files(id,name,mimeType,size)',
                pageSize: '200',
                orderBy: 'name',
            }, token);
            setTracks(data.files || []);
        } catch (err) {
            setError(`获取音乐列表失败：${err.message}`);
        } finally {
            setListLoading(false);
        }
    }, [token, folderId, driveGet]);

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    const play = useCallback(async function (track) {
        setError('');
        setLoadingId(track.id);
        try {
            const resp = await fetch(`${DRIVE_FILES_URL}/${track.id}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const url = URL.createObjectURL(await resp.blob());
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = url;
            setCurrent({ track, url });
        } catch (err) {
            setError(`播放「${track.name}」失败：${err.message}`);
        } finally {
            setLoadingId('');
        }
    }, [token]);

    // Mount the fetched blob into the audio element; browsers only allow
    // autoplay inside the user-gesture chain, so fall back to a hint.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !current) return;
        audio.src = current.url;
        audio.play().catch(() => setNotice('浏览器阻止了自动播放，请点击播放按钮'));
    }, [current]);

    const handleEnded = useCallback(function () {
        if (!current) return;
        const index = tracks.findIndex((track) => track.id === current.track.id);
        const next = tracks[index + 1];
        if (next) play(next);
    }, [current, tracks, play]);

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
                                onChange={(event) => setFolderId(event.target.value)}
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
                                <div className={styles['now-playing']}>▶ {current.track.name}</div>
                                <audio ref={audioRef} controls onEnded={handleEnded} className={styles.audio}>
                                    <track kind="captions" />
                                </audio>
                            </section>
                        )}

                        <section className={styles.list}>
                            <div className={styles['list-head']}>
                                <span>{listLoading ? '加载中…' : `共 ${tracks.length} 首音乐`}</span>
                                <button type="button" className={styles['list-refresh']} disabled={listLoading} onClick={loadTracks}>
                                    刷新
                                </button>
                            </div>
                            {!listLoading && tracks.length === 0 && (
                                <p className={styles.empty}>没有找到音频文件，换个文件夹试试？</p>
                            )}
                            <ul className={styles.tracks}>
                                {tracks.map((track) => {
                                    const active = current && current.track.id === track.id;
                                    return (
                                        <li key={track.id}>
                                            <button
                                                type="button"
                                                className={active ? styles['track-active'] : styles.track}
                                                disabled={loadingId === track.id}
                                                onClick={() => play(track)}
                                            >
                                                <span className={styles['track-name']}>
                                                    {loadingId === track.id ? '⏳' : '🎵'} {track.name}
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
