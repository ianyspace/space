import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Layout from 'components/Layout';
import Bio from 'components/Bio';
import SEO from 'components/SEO';
import { useLang } from 'context/LanguageContext';
import { formatMessage } from 'utils/i18n';
import { kebabCase } from 'utils/helpers';

import TagGraph from './TagGraph';
import TagCloud from './TagCloud';
import TagGrid from './TagGrid';
import styles from './Tags.module.scss';

const VIEW_MODES = [
    { key: 'graph', labelKey: 'tTagViewGraph', icon: 'M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-8 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 5.5l13 0M5 7l6 12M19 7l-6 12' },
    { key: 'cloud', labelKey: 'tTagViewCloud', icon: 'M4 14.5A4.5 4.5 0 0 1 7.8 10a5.5 5.5 0 0 1 10.4-1.5 4 4 0 0 1 2.8 7.5 4 4 0 0 1-4 4H7.5A3.5 3.5 0 0 1 4 14.5z' },
    { key: 'grid', labelKey: 'tTagViewGrid', icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
];

const TagsPage = function ({ tagGroups }) {
    const { homeLink } = useLang();
    const [viewMode, setViewMode] = useState('graph');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('count'); // 'count' | 'alpha'

    const tTags = formatMessage('tTags');
    const tTagGraphEmpty = formatMessage('tTagGraphEmpty');
    const tagSummary = formatMessage('tfTagGraphSummary', tagGroups.length);
    const searchPlaceholder = formatMessage('tTagSearchPlaceholder');
    const tSortCount = formatMessage('tTagSortCount');
    const tSortAlpha = formatMessage('tTagSortAlpha');
    const tNoMatch = formatMessage('tTagNoMatch');
    const tTagViewGraph = formatMessage('tTagViewGraph');
    const tTagViewCloud = formatMessage('tTagViewCloud');
    const tTagViewGrid = formatMessage('tTagViewGrid');

    const totalArticleReferences = useMemo(() => {
        return tagGroups.reduce((acc, curr) => acc + curr.totalCount, 0);
    }, [tagGroups]);

    const tTotalArticles = formatMessage('tTagTotalArticles', totalArticleReferences);

    const VIEW_LABELS = {
        graph: tTagViewGraph,
        cloud: tTagViewCloud,
        grid: tTagViewGrid,
    };

    const getTagUrl = (tag) => `${homeLink}tags/${kebabCase(tag)}/`;

    // Filter and sort
    const processedTags = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let list = tagGroups;

        if (query) {
            list = list.filter((tag) =>
                tag.fieldValue.toLowerCase().includes(query),
            );
        }

        return [...list].sort((a, b) => {
            if (sortBy === 'count') {
                return b.totalCount - a.totalCount || a.fieldValue.localeCompare(b.fieldValue);
            }
            return a.fieldValue.localeCompare(b.fieldValue);
        });
    }, [tagGroups, searchQuery, sortBy]);

    return (
        <Layout title={formatMessage('title')} breadcrumbs={[{ text: tTags }]}>
            <SEO title={tTags} />
            <aside>
                <Bio />
            </aside>

            <div className={styles['tag-page']}>
                <header className={styles['tag-header']}>
                    <div className={styles['tag-title-row']}>
                        <div>
                            <h1 className={styles['tag-title']}>{tTags}</h1>
                            <p className={styles['tag-meta']}>
                                {tagSummary}
                                <span className={styles['tag-meta-dot']} aria-hidden="true">
                                    ·
                                </span>
                                {tTotalArticles}
                            </p>
                        </div>

                        {/* View Mode Switcher */}
                        <div className={styles['view-tabs']} role="tablist">
                            {VIEW_MODES.map((mode) => (
                                <button
                                    key={mode.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={viewMode === mode.key}
                                    className={`${styles['tab-btn']} ${
                                        viewMode === mode.key ? styles['tab-btn-active'] : ''
                                    }`}
                                    onClick={() => setViewMode(mode.key)}
                                    title={VIEW_LABELS[mode.key]}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className={styles['tab-icon']}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d={mode.icon} />
                                    </svg>
                                    <span className={styles['tab-text']}>
                                        {VIEW_LABELS[mode.key]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filter and quick sort toolbar */}
                    <div className={styles['tag-toolbar']}>
                        <div className={styles['search-box']}>
                            <svg
                                className={styles['search-icon']}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className={styles['search-input']}
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className={styles['clear-btn']}
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear filter"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className={styles['sort-group']}>
                            <button
                                type="button"
                                className={`${styles['sort-btn']} ${
                                    sortBy === 'count' ? styles['sort-btn-active'] : ''
                                }`}
                                onClick={() => setSortBy('count')}
                            >
                                {tSortCount}
                            </button>
                            <button
                                type="button"
                                className={`${styles['sort-btn']} ${
                                    sortBy === 'alpha' ? styles['sort-btn-active'] : ''
                                }`}
                                onClick={() => setSortBy('alpha')}
                            >
                                {tSortAlpha}
                            </button>
                        </div>
                    </div>
                </header>

                {tagGroups.length === 0 ? (
                    <p className={styles['tag-empty']}>{tTagGraphEmpty}</p>
                ) : processedTags.length === 0 ? (
                    <div className={styles['tag-empty']}>
                        <p>{tNoMatch}</p>
                        <button
                            type="button"
                            className={styles['reset-filter-btn']}
                            onClick={() => setSearchQuery('')}
                        >
                            清除筛选
                        </button>
                    </div>
                ) : (
                    <div className={styles['view-content']}>
                        {viewMode === 'graph' && (
                            <TagGraph tagGroups={processedTags} getTagUrl={getTagUrl} />
                        )}
                        {viewMode === 'cloud' && (
                            <TagCloud tagGroups={processedTags} getTagUrl={getTagUrl} />
                        )}
                        {viewMode === 'grid' && (
                            <TagGrid tagGroups={processedTags} getTagUrl={getTagUrl} />
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

TagsPage.propTypes = {
    tagGroups: PropTypes.array.isRequired,
};

export default TagsPage;
