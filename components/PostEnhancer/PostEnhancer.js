import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { formatMessage } from 'utils/i18n';

import styles from './PostEnhancer.module.scss';

function copyTextToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

function detectLanguage(pre) {
    const cls = `${pre.className || ''} ${pre.querySelector('code')?.className || ''}`;
    const match = /language-([a-zA-Z0-9_-]+)/.exec(cls);
    if (!match) return '';
    const lang = match[1].toLowerCase();
    if (lang === 'plaintext' || lang === 'text' || lang === 'none') return '';
    return lang;
}

/**
 * Enhances the article body (`.css-post`) with:
 *   1. Top reading progress bar
 *   2. Code block language badge + one-click copy button
 *   3. Click-to-zoom image lightbox
 */
const PostEnhancer = function ({ active = true, contentKey = '' }) {
    const tCopyCode = formatMessage('tCopyCode');
    const tCopiedCode = formatMessage('tCopiedCode');
    const tClosePreview = formatMessage('tClosePreview');
    const tZoomHint = formatMessage('tZoomHint');

    const [progress, setProgress] = useState(0);
    const [lightbox, setLightbox] = useState(null);

    // 1. Reading progress bar tracking on #main-contain
    useEffect(() => {
        if (!active) return undefined;
        const contain = document.getElementById('main-contain');
        if (!contain) return undefined;

        let rafId = null;
        const computeProgress = () => {
            rafId = null;
            const maxScroll = contain.scrollHeight - contain.clientHeight;
            const currentTop = contain.scrollTop;
            const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, currentTop / maxScroll)) : 0;
            setProgress(ratio);
        };

        const onScroll = () => {
            if (rafId == null) {
                rafId = window.requestAnimationFrame(computeProgress);
            }
        };

        computeProgress();
        contain.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        const postEl = document.querySelector('.css-post');
        let resizeObserver;
        if (postEl && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(onScroll);
            resizeObserver.observe(postEl);
        }

        return () => {
            if (rafId != null) window.cancelAnimationFrame(rafId);
            contain.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, [active, contentKey]);

    // 2. Code block language label & one-click copy button injection
    useEffect(() => {
        if (!active) return undefined;
        const blocks = document.querySelectorAll('.css-post .gatsby-highlight');
        if (!blocks.length) return undefined;

        const cleanups = [];

        blocks.forEach((block) => {
            const pre = block.querySelector('pre');
            const code = block.querySelector('code');
            if (!pre || !code) return;

            const existing = block.querySelector('.code-toolbar');
            if (existing) existing.remove();

            const toolbar = document.createElement('div');
            toolbar.className = 'code-toolbar';

            const lang = detectLanguage(pre);
            if (lang) {
                const langSpan = document.createElement('span');
                langSpan.className = 'code-lang';
                langSpan.textContent = lang;
                toolbar.appendChild(langSpan);
            }

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'code-copy-btn';
            btn.textContent = tCopyCode;
            btn.setAttribute('aria-label', tCopyCode);

            let timerId = null;
            const onCopy = () => {
                const rawText = code.innerText || code.textContent || '';
                copyTextToClipboard(rawText).then(() => {
                    btn.classList.add('is-copied');
                    btn.textContent = `✓ ${tCopiedCode}`;
                    if (timerId) clearTimeout(timerId);
                    timerId = setTimeout(() => {
                        btn.classList.remove('is-copied');
                        btn.textContent = tCopyCode;
                    }, 1800);
                });
            };

            btn.addEventListener('click', onCopy);
            toolbar.appendChild(btn);
            block.appendChild(toolbar);

            cleanups.push(() => {
                if (timerId) clearTimeout(timerId);
                btn.removeEventListener('click', onCopy);
                toolbar.remove();
            });
        });

        return () => cleanups.forEach((fn) => fn());
    }, [active, contentKey, tCopyCode, tCopiedCode]);

    // 3. Delegated click listener for images inside .css-post
    useEffect(() => {
        if (!active) return undefined;
        const postEl = document.querySelector('.css-post');
        if (!postEl) return undefined;

        const onClick = (event) => {
            const img = event.target.closest('img');
            if (!img || !postEl.contains(img)) return;
            // Skip images wrapped inside an anchor link
            if (img.closest('a')) return;

            const src = img.getAttribute('src');
            if (!src) return;

            setLightbox({
                src,
                alt: img.getAttribute('alt') || '',
                zoomed: false,
            });
        };

        postEl.addEventListener('click', onClick);
        return () => postEl.removeEventListener('click', onClick);
    }, [active, contentKey]);

    // Close lightbox on Escape
    useEffect(() => {
        if (!lightbox) return undefined;
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setLightbox(null);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [lightbox]);

    if (!active) return null;

    return (
        <>
            <div className={styles['progress-track']} aria-hidden="true">
                <div
                    className={styles['progress-bar']}
                    style={{ transform: `scaleX(${progress})` }}
                />
            </div>

            {lightbox ? (
                <div
                    className={styles['lightbox-layer']}
                    role="dialog"
                    aria-modal="true"
                    aria-label={lightbox.alt || tClosePreview}
                >
                    <button
                        type="button"
                        className={styles['lightbox-backdrop']}
                        onClick={() => setLightbox(null)}
                        aria-label={tClosePreview}
                    />
                    <button
                        type="button"
                        className={styles['lightbox-close']}
                        onClick={() => setLightbox(null)}
                        aria-label={tClosePreview}
                        title={tClosePreview}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                    <div className={styles['lightbox-content']}>
                        <div className={styles['lightbox-viewport']}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lightbox.src}
                                alt={lightbox.alt}
                                className={`${styles['lightbox-img']} ${
                                    lightbox.zoomed ? styles['lightbox-img-zoomed'] : ''
                                }`}
                                onClick={() =>
                                    setLightbox((prev) =>
                                        prev ? { ...prev, zoomed: !prev.zoomed } : null,
                                    )
                                }
                            />
                        </div>
                        <div className={styles['lightbox-footer']}>
                            {lightbox.alt ? (
                                <p className={styles['lightbox-caption']}>{lightbox.alt}</p>
                            ) : null}
                            <p className={styles['lightbox-hint']}>{tZoomHint}</p>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

PostEnhancer.propTypes = {
    active: PropTypes.bool,
    contentKey: PropTypes.string,
};

export default PostEnhancer;
