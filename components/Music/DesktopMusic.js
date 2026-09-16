import React, { useEffect, useRef, useState } from 'react';

import {
    IconChevronRight,
    IconFolder,
    IconMoon,
    IconNote,
    IconNoteList,
    IconPause,
    IconPerson,
    IconPlay,
    IconPrev,
    IconNext,
    IconRefresh,
    IconRepeat,
    IconRepeatOne,
    IconSearch,
    IconShuffle,
    IconSun,
} from './icons';
import { formatSize, formatTime, parseTrackName, trackGradient } from './shared';

import styles from './DesktopMusic.module.scss';

const GLASS_CONFIG = JSON.stringify({
    blurAmount: 0.2,
    refraction: 0.45,
    chromAberration: 0.025,
    edgeHighlight: 0.08,
    fresnel: 0.7,
    cornerRadius: 28,
    zRadius: 22,
    shadowOpacity: 0.18,
});

const HEADER_GLASS_CONFIG = JSON.stringify({
    blurAmount: 0.16,
    refraction: 0.36,
    chromAberration: 0.018,
    edgeHighlight: 0.1,
    cornerRadius: 22,
    zRadius: 18,
    shadowOpacity: 0.12,
});

const DesktopMusic = function ({
    theme,
    onToggleTheme,
    connected,
    sourceName,
    hasLibrary,
    cached,
    gsiReady,
    clientIdDraft,
    onClientIdDraft,
    onConnect,
    onDisconnect,
    folders,
    folderId,
    folderName,
    onFolderChange,
    onRefresh,
    listLoading,
    tracks,
    visibleTracks,
    search,
    onSearch,
    current,
    loadingId,
    isPlaying,
    onToggleTrack,
    onTogglePlay,
    onPrev,
    onNext,
    onSeek,
    progress,
    shuffle,
    repeat,
    onToggleShuffle,
    onCycleRepeat,
    lyrics,
    lyricsLoading,
    lyricsVisible,
    onToggleLyrics,
}) {
    const rootRef = useRef(null);
    const [glassReady, setGlassReady] = useState(false);
    const [glassFailed, setGlassFailed] = useState(false);
    const [activeLyricRef, setActiveLyricRef] = useState(null);

    useEffect(() => {
        let instance;
        let cancelled = false;
        if (!rootRef.current) return undefined;
        (async function initGlass() {
            try {
                const module = await import('@ybouane/liquidglass');
                if (cancelled || !rootRef.current) return;
                instance = await module.LiquidGlass.init({
                    root: rootRef.current,
                    glassElements: rootRef.current.querySelectorAll('[data-glass]'),
                });
                if (!cancelled) setGlassReady(true);
            } catch (err) {
                if (!cancelled) setGlassFailed(true);
            }
        }());
        return () => {
            cancelled = true;
            if (instance && typeof instance.destroy === 'function') instance.destroy();
        };
    }, []);

    useEffect(() => {
        if (activeLyricRef) activeLyricRef.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [activeLyricRef]);

    const activeLyric = lyrics && lyrics.timed
        ? lyrics.lines.reduce((index, line, lineIndex) => (line.time <= progress.time ? lineIndex : index), -1)
        : -1;
    const currentMeta = current ? parseTrackName(current.track.name) : null;
    const visibleLyrics = lyrics && lyricsVisible ? lyrics.lines : [];
    const progressPercent = progress.duration > 0 ? Math.min(100, (progress.time / progress.duration) * 100) : 0;
    const status = connected ? 'Google 云盘已连接' : `${sourceName} · 无需登录`;
    const emptyState = !hasLibrary;

    const title = currentMeta ? currentMeta.title : '选择一首歌开始';
    const artist = currentMeta ? currentMeta.artist : sourceName;

    return (
        <div ref={rootRef} className={`${styles.root} ${theme === 'dark' ? styles['theme-dark'] : ''} ${glassFailed ? styles['glass-fallback'] : ''}`}>
            <div className={styles.ambient} aria-hidden="true" />
            <header className={styles.header} data-glass data-config={HEADER_GLASS_CONFIG}>
                <div className={styles.brand}>
                    <span className={styles['brand-mark']}><IconNote /></span>
                    <span>
                        <strong>云端音乐</strong>
                        <small>{status}</small>
                    </span>
                </div>
                <div className={styles['header-actions']}>
                    <button type="button" className={styles['icon-btn']} title="切换主题" onClick={onToggleTheme}>
                        {theme === 'dark' ? <IconSun /> : <IconMoon />}
                    </button>
                    <span className={`${styles['glass-status']} ${glassReady ? styles['glass-on'] : ''}`}>
                        {glassReady ? 'GLASS' : 'STUDIO'}
                    </span>
                </div>
            </header>

            <aside className={styles.sidebar} data-glass data-config={GLASS_CONFIG}>
                <div className={styles['side-title']}>
                    <span>音乐库</span>
                    <button type="button" className={styles['icon-btn']} title="刷新歌曲列表" onClick={onRefresh} disabled={listLoading}>
                        <IconRefresh className={listLoading ? styles.spin : undefined} />
                    </button>
                </div>
                <button type="button" className={`${styles['side-link']} ${styles['side-link-active']}`}>
                    <IconNoteList />
                    <span>全部歌曲</span>
                    <b>{tracks.length}</b>
                </button>
                <label className={styles['folder-select']}>
                    <IconFolder />
                    <select value={folderId} onChange={onFolderChange} disabled={!connected}>
                        {connected
                            ? <option value="">整个云盘</option>
                            : <option value="">{sourceName}</option>}
                        {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                    </select>
                    <IconChevronRight />
                </label>
                <div className={styles['sidebar-spacer']} />
                <div className={styles['account-card']}>
                    <IconPerson />
                    <div>
                        <strong>{connected ? '我的 Google 云盘' : sourceName}</strong>
                        <small>{connected ? 'Google Drive' : cached ? '本地缓存 · 无需登录' : 'Cloudflare R2'}</small>
                    </div>
                </div>
                {!connected && (
                    <div className={styles['connect-box']}>
                        <p>公共曲库开箱可用；连接 Google Drive 可改用你自己云盘里的歌。</p>
                        <input value={clientIdDraft} onChange={(event) => onClientIdDraft(event.target.value)} placeholder="OAuth 客户端 ID" />
                        <button type="button" className={styles['accent-btn']} disabled={!gsiReady} onClick={onConnect}>
                            {gsiReady ? '连接 Google Drive' : '加载中…'}
                        </button>
                    </div>
                )}
                {connected && <button type="button" className={styles['disconnect-btn']} onClick={onDisconnect}>断开连接</button>}
            </aside>

            <main className={styles.library} data-glass data-config={GLASS_CONFIG}>
                <div className={styles['library-head']}>
                    <div>
                        <span className={styles.eyebrow}>YOUR LIBRARY</span>
                        <h1>全部歌曲</h1>
                        <p>{folderName} · {listLoading ? '正在同步…' : `${tracks.length} 首歌曲`}</p>
                    </div>
                    <label className={styles.search}>
                        <IconSearch />
                        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="搜索歌名或歌手" />
                    </label>
                </div>
                {emptyState ? (
                    <div className={styles.empty}><IconCloudless /><h2>曲库里还没有歌曲</h2><p>公共曲库暂时是空的；也可以在左侧连接 Google Drive 播放你自己的音乐。</p></div>
                ) : (
                    <div className={styles['track-list']}>
                        {visibleTracks.map((track) => {
                            const meta = parseTrackName(track.name);
                            const active = current && current.track.id === track.id;
                            return (
                                <button type="button" key={track.id} className={`${styles['track-row']} ${active ? styles['track-row-active'] : ''}`} onClick={() => onToggleTrack(track)} disabled={loadingId === track.id}>
                                    <span className={styles['track-art']} style={{ background: trackGradient(track.name) }}><IconNote /></span>
                                    <span className={styles['track-copy']}><strong>{meta.title}</strong><small>{meta.artist}</small></span>
                                    <span className={styles['track-format']}>{meta.ext || 'AUDIO'}</span>
                                    <span className={styles['track-size']}>{track.size ? formatSize(track.size) : ''}</span>
                                    <span className={styles['track-action']}>{active && isPlaying ? <IconPause /> : <IconPlay />}</span>
                                </button>
                            );
                        })}
                        {!listLoading && visibleTracks.length === 0 && <div className={styles.empty}>没有匹配的歌曲</div>}
                    </div>
                )}
            </main>

            <section className={styles.player} data-glass data-config={GLASS_CONFIG}>
                <div className={styles['player-top']}><span>NOW PLAYING</span><span>{currentMeta ? currentMeta.ext || 'AUDIO' : 'READY'}</span></div>
                <div className={styles['player-art']} style={{ background: current ? trackGradient(current.track.name) : 'linear-gradient(135deg, #69758f, #27304a)' }}>
                    <IconNote />
                </div>
                <div className={styles['player-meta']}><h2>{title}</h2><p>{artist}</p></div>
                {lyricsVisible && lyrics ? (
                    <div className={styles['desktop-lyrics']}>
                        {visibleLyrics.map((line, index) => <p key={`${line.time}-${index}`} ref={index === activeLyric ? setActiveLyricRef : null} className={index === activeLyric ? styles['lyric-active'] : ''}>{line.text}</p>)}
                    </div>
                ) : <div className={styles['lyrics-placeholder']}>{lyricsLoading ? '歌词加载中…' : lyrics ? '歌词已准备好' : '暂无歌词'}</div>}
                <div className={styles['seek-line']}>
                    <input type="range" min="0" max={progress.duration || 1} value={Math.min(progress.time, progress.duration || 1)} disabled={!current || !progress.duration} onChange={(event) => onSeek(Number(event.target.value))} />
                    <div><span>{formatTime(progress.time)}</span><span>{formatTime(progress.duration)}</span></div>
                </div>
                <div className={styles.controls}>
                    <button type="button" className={shuffle ? styles['control-on'] : ''} title="随机播放" onClick={onToggleShuffle}><IconShuffle /></button>
                    <button type="button" title="上一首" onClick={onPrev}><IconPrev /></button>
                    <button type="button" className={styles['play-control']} title={isPlaying ? '暂停' : '播放'} onClick={onTogglePlay}>{isPlaying ? <IconPause /> : <IconPlay />}</button>
                    <button type="button" title="下一首" onClick={onNext}><IconNext /></button>
                    <button type="button" className={repeat !== 'off' ? styles['control-on'] : ''} title="循环模式" onClick={onCycleRepeat}>{repeat === 'one' ? <IconRepeatOne /> : <IconRepeat />}</button>
                </div>
                <div className={styles['player-actions']}>
                    {lyrics && <button type="button" className={lyricsVisible ? styles['action-on'] : ''} onClick={onToggleLyrics}>歌词</button>}
                    <span>{progressPercent.toFixed(0)}%</span>
                </div>
            </section>
        </div>
    );
};

const IconCloudless = () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 17.5A4.5 4.5 0 0 1 7.6 9a6 6 0 0 1 10.7 2.2A4 4 0 0 1 19 19H7" />
        <path d="M3 3l18 18" />
    </svg>
);

export default DesktopMusic;
