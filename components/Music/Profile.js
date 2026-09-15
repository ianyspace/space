import React from 'react';

import {
    IconCloud,
    IconFolder,
    IconRefresh,
    IconLogout,
    IconSun,
    IconMoon,
    IconChevronRight,
    IconNoteList,
} from './icons';

import styles from './Profile.module.scss';

/**
 * The "我的" screen: Google Drive connection (OAuth client ID setup lives
 * here), library folder choice, refresh and app theme — settings-style
 * grouped cards. The list page's connect prompt deep-links here.
 */
const Profile = function ({
    theme,
    onToggleTheme,
    connected,
    gsiReady,
    clientId,
    clientIdDraft,
    onClientIdDraft,
    onConnect,
    onDisconnect,
    folders,
    folderId,
    folderName,
    onFolderChange,
    onRefresh,
    loading,
    trackCount,
    onGoList,
}) {
    return (
        <div className={styles.page}>
            <h1 className={styles.title}>我的</h1>

            <section className={styles.group}>
                <div className={styles.account}>
                    <span className={styles['account-icon']}>
                        <IconCloud />
                    </span>
                    <span className={styles['account-text']}>
                        <span className={styles['account-name']}>
                            {connected ? '已连接 Google 云盘' : '未连接云盘'}
                        </span>
                        <span className={styles['account-sub']}>
                            {connected
                                ? `${folderName} · ${loading ? '加载中…' : `${trackCount} 首歌曲`}`
                                : '用你自己的云盘当曲库，无需服务器'}
                        </span>
                    </span>
                    {connected && (
                        <button
                            type="button"
                            className={`${styles['ghost-btn']}${loading ? ` ${styles.spinning}` : ''}`}
                            title="刷新列表"
                            aria-label="刷新列表"
                            disabled={loading}
                            onClick={onRefresh}
                        >
                            <IconRefresh />
                        </button>
                    )}
                </div>
            </section>

            {!connected ? (
                <section className={styles.group}>
                    <div className={styles['group-label']}>连接云盘</div>
                    <ol className={styles.steps}>
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
                    <div className={styles.field}>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="粘贴 OAuth 客户端 ID（xxxx.apps.googleusercontent.com）"
                            value={clientIdDraft}
                            onChange={(event) => onClientIdDraft(event.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className={styles['primary-btn']}
                        disabled={!gsiReady}
                        onClick={onConnect}
                    >
                        {gsiReady ? '连接 Google 云盘' : '正在加载 Google 组件…'}
                    </button>
                    {clientId && (
                        <p className={styles.hint}>检测到已保存的客户端 ID，直接点击连接即可。</p>
                    )}
                </section>
            ) : (
                <section className={styles.group}>
                    <div className={styles['group-label']}>音乐库</div>
                    <label className={styles.row} htmlFor="music-folder-select">
                        <span className={styles['row-icon']}><IconFolder /></span>
                        <span className={styles['row-label']}>文件夹</span>
                        <select
                            id="music-folder-select"
                            className={styles['row-select']}
                            value={folderId}
                            onChange={onFolderChange}
                        >
                            <option value="">整个云盘</option>
                            {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                        </select>
                        <span className={styles['row-chev']}><IconChevronRight /></span>
                    </label>
                    <button type="button" className={`${styles.row} ${styles['row-btn']}`} onClick={onGoList}>
                        <span className={styles['row-icon']}><IconNoteList /></span>
                        <span className={styles['row-label']}>浏览歌曲</span>
                        <span className={styles['row-chev']}><IconChevronRight /></span>
                    </button>
                    <button type="button" className={`${styles.row} ${styles['row-btn']} ${styles['row-danger']}`} onClick={onDisconnect}>
                        <span className={styles['row-icon']}><IconLogout /></span>
                        <span className={styles['row-label']}>断开连接</span>
                    </button>
                </section>
            )}

            <section className={styles.group}>
                <div className={styles['group-label']}>外观</div>
                <button type="button" className={`${styles.row} ${styles['row-btn']}`} onClick={onToggleTheme}>
                    <span className={styles['row-icon']}>
                        {theme === 'dark' ? <IconSun /> : <IconMoon />}
                    </span>
                    <span className={styles['row-label']}>
                        {theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                    </span>
                    <span className={styles['row-value']}>{theme === 'dark' ? '深色' : '浅色'}</span>
                </button>
            </section>

            <p className={styles.footnote}>
                授权令牌与客户端 ID 只保存在本机浏览器中；播放页通过 Google Drive 只读权限拉取音频，不经过任何服务器。
            </p>
        </div>
    );
};

export default Profile;
