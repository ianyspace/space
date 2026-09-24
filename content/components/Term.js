import { Children, useCallback, useEffect, useId, useRef } from 'react';

import glossary, { normalize } from 'content/glossary';

import styles from './Term.module.scss';

/**
 * 术语卡：正文里给专业名词加一条**虚线**，鼠标浮上去（移动端点一下）弹出解释。
 *
 * 为什么是虚线：正文里已经有一条实线下划线表示链接，虚线是「有解释但不跳转」，
 * 形状不同，扫读时不会和链接混起来。`cursor: help` 是同一个意思的光标版本。
 *
 * 为什么优先用原生 Popover 而不是绝对定位的气泡：本站的表格在 `.table-wrap` 里横向
 * 滚动、问答回答在 `<details>` 里、图示和互动面板自带 overflow —— 绝对定位的气泡
 * 会被这些祖先裁掉。popover 渲染在 top-layer，不受任何 overflow 影响，还顺带拿到
 * 了点外部关闭、Esc 关闭、多个气泡互斥这些行为。代价是它不响应 hover，所以悬停
 * 要自己补几行 JS（见下）。
 *
 * 用法：
 *     <term>Minor GC</term>                 词条名就是显示文本
 *     <term k="Minor GC">MinorGC</term>     显示文本和词条名不一致时
 *     <term def="…">某个只在本文出现的词</term>   临时解释，不进术语库
 */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/** 比这更窄就改用贴底的抽屉形态（JS 判定，不用屏宽断点 —— 窄窗口的桌面浏览器照样能悬停）。 */
const SHEET_WIDTH = 640;
const GAP = 8;
const MARGIN = 12;

/**
 * 有没有原生 Popover API（Safari 17 / Chrome 114 / Firefox 125 起）。
 *
 * 没有的话气泡拿不到 top-layer，只能退化成普通的 `position: fixed` —— 好在本站正文区
 * 的祖先链上没有 `transform` / `filter` / `backdrop-filter`，fixed 相对视口是准的。
 * 「点外部关闭 / Esc 关闭」也得自己补（见下面的 effect）。
 */
const nativePopover = () =>
    typeof window !== 'undefined' &&
    typeof window.HTMLElement !== 'undefined' &&
    'showPopover' in window.HTMLElement.prototype;

export default function Term({ children, k, def }) {
    const text = Children.toArray(children).join('').trim();
    const entry = glossary[normalize(k || text)];
    const definition = def || (entry && entry.def);
    const extra = def ? null : entry && entry.more;

    const id = useId();
    const anchorRef = useRef(null);
    const popRef = useRef(null);
    const timerRef = useRef(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    /** 延后执行，用来做「悬停 110ms 才弹」「移开 180ms 才收」这类防抖。 */
    const later = useCallback(
        (fn, delay) => {
            clearTimer();
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                fn();
            }, delay);
        },
        [clearTimer],
    );

    /**
     * 把气泡摆到术语下方；下方放不下就翻到上方，再放不下就贴着视口底边。
     * 位置通过 CSS 变量写进去，`is-sheet` 那套样式才有机会用普通 CSS 覆盖掉。
     */
    const place = useCallback(() => {
        const anchor = anchorRef.current;
        const pop = popRef.current;
        if (!anchor || !pop) return;

        if (window.innerWidth < SHEET_WIDTH) {
            pop.classList.add(styles['is-sheet']);
            return;
        }
        pop.classList.remove(styles['is-sheet']);

        const rect = anchor.getBoundingClientRect();
        const width = pop.offsetWidth;
        const height = pop.offsetHeight;

        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));

        let top = rect.bottom + GAP;
        if (top + height > window.innerHeight - MARGIN) {
            const above = rect.top - height - GAP;
            top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - height - MARGIN);
        }

        pop.style.setProperty('--term-x', `${Math.round(left)}px`);
        pop.style.setProperty('--term-y', `${Math.round(top)}px`);
    }, []);

    const isOpen = useCallback(() => {
        const pop = popRef.current;
        return Boolean(pop && pop.classList.contains(styles['is-open']));
    }, []);

    const open = useCallback(() => {
        const pop = popRef.current;
        if (!pop || pop.classList.contains(styles['is-open'])) return;

        if (nativePopover()) {
            try {
                pop.showPopover();
            } catch {
                return;
            }
        }

        // 显示统一由 `is-open` 决定，不依赖 `:popover-open`（原因见 Term.module.scss）。
        pop.classList.add(styles['is-open']);
        // 先让它显示出来再量尺寸 —— 隐藏状态下 `offsetWidth` 是 0。
        place();
    }, [place]);

    const close = useCallback(() => {
        const pop = popRef.current;
        if (!pop) return;

        // `matches(':popover-open')` 在不认识这个伪类的浏览器上会直接抛错，所以必须先
        // 过一遍 `nativePopover()`（短路保证后面那句不会执行）。
        if (nativePopover() && pop.matches(':popover-open')) pop.hidePopover();
        pop.classList.remove(styles['is-open']);
    }, []);

    useEffect(() => clearTimer, [clearTimer]);

    // 页面滚动 / 缩放时气泡会跟着飘走，开着的时候重算一次位置。
    useEffect(() => {
        const follow = () => {
            const pop = popRef.current;
            if (pop && pop.classList.contains(styles['is-open'])) place();
        };

        window.addEventListener('resize', follow);
        window.addEventListener('scroll', follow, true);

        return () => {
            window.removeEventListener('resize', follow);
            window.removeEventListener('scroll', follow, true);
        };
    }, [place]);

    // 原生 Popover 的点外部关闭 / Esc 关闭由浏览器负责，这里只把 `is-open` 同步掉，
    // 免得气泡已经不在 top-layer 了却还挂着一个「显示」的类。
    useEffect(() => {
        const pop = popRef.current;
        if (!pop || !nativePopover()) return undefined;

        const onToggle = (event) => {
            if (event.newState === 'closed') pop.classList.remove(styles['is-open']);
        };

        pop.addEventListener('toggle', onToggle);
        return () => pop.removeEventListener('toggle', onToggle);
    }, []);

    // 没有原生 Popover 时，上面那套行为得自己补一份。
    useEffect(() => {
        if (nativePopover()) return undefined;

        const onPointerDown = (event) => {
            const pop = popRef.current;
            const anchor = anchorRef.current;
            if (!pop || !pop.classList.contains(styles['is-open'])) return;
            if (pop.contains(event.target) || (anchor && anchor.contains(event.target))) return;
            close();
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') close();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [close]);

    // 术语库里没有这个词：按普通文字渲染，不画虚线 —— 虚线意味着「这里能点」，
    // 点了没反应比不标更糟。开发时打条 warning，免得写错了没人发现。
    if (!definition) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[term] 术语库里找不到「${text}」，已按普通文字渲染`);
        }
        return <>{children}</>;
    }

    const hoverable = () =>
        typeof window !== 'undefined' && window.matchMedia(HOVER_QUERY).matches;

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                className={styles.term}
                aria-describedby={id}
                onClick={() => {
                    clearTimer();
                    if (isOpen()) close();
                    else open();
                }}
                onMouseEnter={() => {
                    if (hoverable()) later(open, 110);
                }}
                onMouseLeave={() => {
                    if (hoverable()) later(close, 180);
                }}
            >
                {children}
            </button>
            <span
                ref={popRef}
                id={id}
                popover="auto"
                className={styles.popover}
                onMouseEnter={clearTimer}
                onMouseLeave={() => {
                    if (hoverable()) later(close, 180);
                }}
            >
                <span className={styles['popover-term']}>{entry ? entry.term : text}</span>
                <span className={styles['popover-def']}>{definition}</span>
                {extra ? <span className={styles['popover-more']}>{extra}</span> : null}
            </span>
        </>
    );
}
