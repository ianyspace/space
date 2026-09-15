import React from 'react';

import { IconNoteList, IconPerson } from './icons';

import styles from './TabBar.module.scss';

const TABS = [
    { key: 'list', label: '歌曲', Icon: IconNoteList },
    { key: 'profile', label: '我的', Icon: IconPerson },
];

/**
 * Floating capsule bottom bar switching the two tab pages. Hidden while the
 * full-screen player is open (the player owns the screen then).
 */
const TabBar = function ({ tab, hidden, onChange }) {
    return (
        <nav className={`${styles.bar}${hidden ? ` ${styles['bar-hidden']}` : ''}`} aria-label="页面切换">
            {TABS.map(({ key, label, Icon }) => {
                const active = tab === key;
                return (
                    <button
                        key={key}
                        type="button"
                        className={`${styles.tab}${active ? ` ${styles['tab-active']}` : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onChange(key)}
                    >
                        <span className={styles['tab-icon']}><Icon /></span>
                        <span className={styles['tab-label']}>{label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default TabBar;
