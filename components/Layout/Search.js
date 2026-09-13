import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import withBasePath from 'utils/basePath';

import styles from './Search.module.scss';

const MAX_RESULTS = 8;

const normalize = (value) => String(value || '').toLocaleLowerCase();

/** Lets a reader typed word ("c++", "a.b") be embedded in a RegExp safely. */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps the matched part of `text` in <mark> — plain React nodes, no innerHTML. */
const highlight = (text, term) => {
    const source = String(text || '');
    if (!term) return source;

    // A single capture group makes `split` alternate text / match / text / …
    const parts = source.split(new RegExp(`(${escapeRegExp(term)})`, 'gi'));
    return parts.map((part, index) =>
        index % 2 === 1 ? (
            <mark key={`mark-${index}`} className={styles.mark}>
                {part}
            </mark>
        ) : (
            part
        ),
    );
};

const searchableText = (entry) =>
    [entry.title, entry.description, ...(entry.tags || [])].join(' ');

const Search = function () {
    const router = useRouter();
    const { lang } = useLang();
    const [query, setQuery] = useState('');
    const [entries, setEntries] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const requestedRef = useRef(false);
    const mountedRef = useRef(true);

    const tSearch = formatMessage('tSearch');
    const tPlaceholder = formatMessage('tSearchPlaceholder');
    const tEmpty = formatMessage('tSearchEmpty');
    const tLoading = formatMessage('tSearchLoading');
    const tClear = formatMessage('tClear');

    useEffect(
        () => () => {
            mountedRef.current = false;
        },
        [],
    );

    // The index is a build artifact (`scripts/gen-search-index.js`) and is only a
    // few kB, but it is still fetched on first focus instead of during page load.
    const loadIndex = () => {
        if (requestedRef.current) return;
        requestedRef.current = true;

        fetch(withBasePath('/search-index.json'))
            .then((response) => (response.ok ? response.json() : []))
            .then((data) => {
                if (!mountedRef.current) return;
                setEntries(Array.isArray(data) ? data : []);
                setLoaded(true);
            })
            .catch(() => {
                if (mountedRef.current) setLoaded(true);
            });
    };

    useEffect(() => {
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
                setExpanded(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, []);

    // Leaving the page (eg via one of the results) must not leave the panel open.
    useEffect(() => {
        setOpen(false);
        setExpanded(false);
        setActiveIndex(0);
    }, [router.asPath]);

    const term = normalize(query).trim();

    const results = useMemo(() => {
        // Every word has to appear somewhere in the article metadata, so
        // "react 状态" narrows down instead of widening the result set.
        const tokens = normalize(query)
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (tokens.length === 0) return [];

        return entries
            .filter((entry) => entry.lang === lang)
            .filter((entry) => {
                const haystack = normalize(searchableText(entry));
                return tokens.every((token) => haystack.includes(token));
            })
            .slice(0, MAX_RESULTS);
    }, [entries, lang, query]);

    const close = () => {
        setOpen(false);
        setExpanded(false);
        setActiveIndex(0);
    };

    const onKeyDown = (event) => {
        if (event.key === 'Escape') {
            close();
            inputRef.current?.blur();
            return;
        }
        if (results.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => (index + 1) % results.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
        } else if (event.key === 'Enter') {
            const target = results[activeIndex] || results[0];
            if (target) {
                event.preventDefault();
                close();
                router.push(target.slug);
            }
        }
    };

    const showPanel = expanded && open && term.length > 0;
    const activeId = showPanel && results[activeIndex] ? `site-search-option-${activeIndex}` : undefined;

    return (
        <div
            className={expanded ? `${styles.search} ${styles.expanded}` : styles.search}
            ref={rootRef}
            role="search"
        >
            {!expanded ? (
                <button
                    type="button"
                    className={styles.trigger}
                    aria-label={tSearch}
                    title={tSearch}
                    onClick={() => {
                        setExpanded(true);
                        setOpen(true);
                        loadIndex();
                        requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                >
                    <span className={styles.icon} aria-hidden="true">
                        <svg viewBox="0 0 16 16" focusable="false">
                            <circle cx="6.8" cy="6.8" r="4.4" />
                            <line x1="10.2" y1="10.2" x2="14" y2="14" />
                        </svg>
                    </span>
                </button>
            ) : (
                <>
                    <span className={styles.icon} aria-hidden="true">
                        <svg viewBox="0 0 16 16" focusable="false">
                            <circle cx="6.8" cy="6.8" r="4.4" />
                            <line x1="10.2" y1="10.2" x2="14" y2="14" />
                        </svg>
                    </span>
                    <input
                        ref={inputRef}
                        id="site-search"
                        className={styles.input}
                        type="search"
                        value={query}
                        placeholder={tPlaceholder}
                        aria-label={tSearch}
                        autoComplete="off"
                        spellCheck="false"
                        role="combobox"
                        aria-expanded={showPanel}
                        aria-controls="site-search-results"
                        aria-autocomplete="list"
                        aria-activedescendant={activeId}
                        onFocus={() => {
                            loadIndex();
                            setOpen(true);
                        }}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                            setOpen(true);
                        }}
                        onKeyDown={onKeyDown}
                    />
                </>
            )}

            {expanded && query ? (
                <button
                    type="button"
                    className={styles.clear}
                    aria-label={tClear}
                    onClick={() => {
                        setQuery('');
                        setActiveIndex(0);
                        inputRef.current?.focus();
                    }}
                >
                    ×
                </button>
            ) : null}

            {showPanel ? (
                <div className={styles.results} id="site-search-results" role="listbox" aria-label={tSearch}>
                    {!loaded ? (
                        <p className={styles.status}>{tLoading}</p>
                    ) : results.length === 0 ? (
                        <p className={styles.status}>{tEmpty}</p>
                    ) : (
                        results.map((entry, index) => (
                            <Link
                                key={entry.slug}
                                id={`site-search-option-${index}`}
                                className={
                                    index === activeIndex
                                        ? `${styles.result} ${styles['result-active']}`
                                        : styles.result
                                }
                                href={entry.slug}
                                role="option"
                                aria-selected={index === activeIndex}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => close()}
                            >
                                <span className={styles['result-title']}>{highlight(entry.title, term)}</span>
                                <span className={styles['result-desc']}>
                                    {highlight(entry.description || entry.excerpt, term)}
                                </span>
                                {entry.tags && entry.tags.length > 0 ? (
                                    <span className={styles['result-tags']}>
                                        {entry.tags.slice(0, 4).map((tag) => (
                                            <span key={tag} className={styles.tag}>
                                                {highlight(tag, term)}
                                            </span>
                                        ))}
                                    </span>
                                ) : null}
                            </Link>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default Search;
