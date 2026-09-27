import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { formatMessage } from 'utils/i18n';
import styles from './TagGraph.module.scss';

const VIEW_W = 860;
const VIEW_H = 620;

const MIN_R = 18;
const MAX_R = 40;

/** Deterministic physics calculation with clean clustering */
function computeLayout(tagGroups) {
    if (!tagGroups || tagGroups.length === 0) {
        return { nodes: [], links: [], radiusOf: () => 20 };
    }

    const n = tagGroups.length;
    const nodes = tagGroups.map((tag, i) => {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const theta = (2 * Math.PI * i) / goldenRatio;
        const r = Math.sqrt(i / n) * (VIEW_H * 0.36);
        return {
            ...tag,
            x: VIEW_W / 2 + Math.cos(theta) * r,
            y: VIEW_H / 2 + Math.sin(theta) * r,
            vx: 0,
            vy: 0,
        };
    });

    const index = new Map(nodes.map((node, i) => [node.fieldValue, i]));

    const links = [];
    const seen = new Set();
    tagGroups.forEach((tag) => {
        (tag.tagList || []).forEach((other) => {
            const key = [tag.fieldValue, other].sort().join('|');
            if (seen.has(key)) return;
            seen.add(key);
            const source = index.get(tag.fieldValue);
            const target = index.get(other);
            if (source != null && target != null) {
                links.push({ source, target, key });
            }
        });
    });

    const degree = nodes.map(() => 0);
    links.forEach((link) => {
        degree[link.source] += 1;
        degree[link.target] += 1;
    });

    const maxCount = Math.max(...nodes.map((item) => item.totalCount), 1);
    const maxDegree = Math.max(...degree, 1);

    const radiusOf = (i) => {
        const countWeight = nodes[i].totalCount / maxCount;
        const degWeight = degree[i] / maxDegree;
        return MIN_R + (countWeight * 0.65 + degWeight * 0.35) * (MAX_R - MIN_R);
    };

    let temperature = 1;
    for (let tick = 0; tick < 380; tick += 1) {
        temperature *= 0.993;

        // Repulsion
        for (let a = 0; a < nodes.length; a += 1) {
            for (let b = a + 1; b < nodes.length; b += 1) {
                const dx = nodes[b].x - nodes[a].x;
                const dy = nodes[b].y - nodes[a].y;
                const dist = Math.hypot(dx, dy) || 1;
                const minGap = radiusOf(a) + radiusOf(b) + 38;
                const push =
                    (minGap - dist > 0 ? (minGap - dist) * 0.22 : 0) +
                    (100 * 20) / (dist * dist);
                const fx = (dx / dist) * push;
                const fy = (dy / dist) * push;
                nodes[a].vx -= fx;
                nodes[a].vy -= fy;
                nodes[b].vx += fx;
                nodes[b].vy += fy;
            }
        }

        // Links spring attraction
        links.forEach((link) => {
            const p = nodes[link.source];
            const q = nodes[link.target];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const dist = Math.hypot(dx, dy) || 1;
            const want = 160;
            const k = (dist - want) * 0.024;
            const fx = (dx / dist) * k;
            const fy = (dy / dist) * k;
            p.vx += fx;
            p.vy += fy;
            q.vx -= fx;
            q.vy -= fy;
        });

        // Center gravitation and bounds
        nodes.forEach((node, i) => {
            node.vx += (VIEW_W / 2 - node.x) * 0.005;
            node.vy += (VIEW_H / 2 - node.y) * 0.007;
            node.x += Math.max(-16, Math.min(16, node.vx)) * temperature;
            node.y += Math.max(-16, Math.min(16, node.vy)) * temperature;
            node.vx *= 0.65;
            node.vy *= 0.65;

            const r = radiusOf(i);
            node.x = Math.max(r + 20, Math.min(VIEW_W - r - 20, node.x));
            node.y = Math.max(r + 20, Math.min(VIEW_H - r - 20, node.y));
        });
    }

    return { nodes, links, radiusOf, degree };
}

export default function TagGraph({ tagGroups, getTagUrl }) {
    const [hovered, setHovered] = useState(null);
    const [activeNode, setActiveNode] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const wrapRef = useRef(null);

    const tTagGraphAria = formatMessage('tTagGraphAria');
    const articlesCountFn = (count) => formatMessage('tTagArticlesCount', count);
    const relatedText = formatMessage('tTagConnectedTo');

    const { nodes, links, radiusOf } = useMemo(
        () => computeLayout(tagGroups),
        [tagGroups],
    );

    const neighbourOf = useMemo(() => {
        const map = new Map();
        links.forEach((link) => {
            map.set(link.source, (map.get(link.source) || new Set()).add(link.target));
            map.set(link.target, (map.get(link.target) || new Set()).add(link.source));
        });
        return map;
    }, [links]);

    const targetIndex = hovered != null ? hovered : activeNode;

    const isDimmed = (i) => {
        if (targetIndex == null) return false;
        if (i === targetIndex) return false;
        return !(neighbourOf.get(targetIndex) || new Set()).has(i);
    };

    const isHotEdge = (link) => {
        if (targetIndex == null) return false;
        return link.source === targetIndex || link.target === targetIndex;
    };

    const isDimmedEdge = (link) => {
        if (targetIndex == null) return false;
        return link.source !== targetIndex && link.target !== targetIndex;
    };

    const openTag = useCallback(
        (tag) => {
            const url = getTagUrl(tag);
            if (typeof window !== 'undefined') {
                window.location.href = url;
            }
        },
        [getTagUrl],
    );

    // Zoom controls
    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2.2));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.6));
    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Canvas panning
    const handleMouseDown = (e) => {
        // Only left click on background
        if (e.target.closest('[data-node="true"]')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            setPan({
                x: dragStartRef.current.panX + dx,
                y: dragStartRef.current.panY + dy,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const activeTagData = targetIndex != null ? nodes[targetIndex] : null;
    const activeConnectedTags = useMemo(() => {
        if (targetIndex == null) return [];
        const neighbours = Array.from(neighbourOf.get(targetIndex) || []);
        return neighbours.map((idx) => nodes[idx]).filter(Boolean);
    }, [targetIndex, neighbourOf, nodes]);

    return (
        <div className={styles['graph-stage']}>
            <div
                ref={wrapRef}
                className={`${styles['canvas-container']} ${isDragging ? styles['is-dragging'] : ''}`}
                onMouseDown={handleMouseDown}
            >
                {/* Visual SVG Map */}
                <svg
                    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                    className={styles.svg}
                    role="group"
                    aria-label={tTagGraphAria}
                >
                    <defs>
                        <linearGradient id="edge-grad-default" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--hr)" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="var(--hr)" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="edge-grad-hot" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--textLink)" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="var(--textLink)" stopOpacity="0.4" />
                        </linearGradient>
                        {/* Subtle background grid pattern */}
                        <pattern id="graph-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                            <circle cx="18" cy="18" r="1" fill="var(--preset-dot)" />
                        </pattern>
                    </defs>

                    {/* Canvas Background Grid */}
                    <rect width={VIEW_W} height={VIEW_H} fill="url(#graph-grid)" />

                    <g
                        transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                        style={{ transformOrigin: `${VIEW_W / 2}px ${VIEW_H / 2}px` }}
                    >
                        {/* Connecting Edges */}
                        <g className={styles['edges-layer']}>
                            {links.map((link) => {
                                const hot = isHotEdge(link);
                                const dimmed = isDimmedEdge(link);
                                const a = nodes[link.source];
                                const b = nodes[link.target];
                                return (
                                    <line
                                        key={link.key}
                                        className={`${styles.edge} ${dimmed ? styles['edge-dim'] : ''} ${
                                            hot ? styles['edge-hot'] : ''
                                        }`}
                                        x1={a.x}
                                        y1={a.y}
                                        x2={b.x}
                                        y2={b.y}
                                    />
                                );
                            })}
                        </g>

                        {/* Interactive Nodes */}
                        <g className={styles['nodes-layer']}>
                            {nodes.map((node, i) => {
                                const r = radiusOf(i);
                                const dimmed = isDimmed(i);
                                const isCurrent = i === targetIndex;
                                const isConnected =
                                    targetIndex != null &&
                                    (neighbourOf.get(targetIndex) || new Set()).has(i);

                                return (
                                    <g
                                        key={node.fieldValue}
                                        data-node="true"
                                        className={`${styles.node} ${dimmed ? styles['node-dim'] : ''} ${
                                            isCurrent ? styles['node-hot'] : ''
                                        } ${isConnected ? styles['node-connected'] : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`${node.fieldValue} (${node.totalCount})`}
                                        onMouseEnter={() => setHovered(i)}
                                        onMouseLeave={() => setHovered(null)}
                                        onFocus={() => setHovered(i)}
                                        onBlur={() => setHovered(null)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openTag(node.fieldValue);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openTag(node.fieldValue);
                                            }
                                        }}
                                    >
                                        <circle className={styles.hit} cx={node.x} cy={node.y} r={r + 10} />
                                        <circle className={styles['bubble-halo']} cx={node.x} cy={node.y} r={r + 4} />
                                        <circle className={styles.bubble} cx={node.x} cy={node.y} r={r} />

                                        {/* Label and Count */}
                                        <text
                                            className={styles.label}
                                            x={node.x}
                                            y={node.y + 1}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                        >
                                            {node.fieldValue}
                                        </text>
                                        <text
                                            className={styles.count}
                                            x={node.x}
                                            y={node.y + r + 16}
                                            textAnchor="middle"
                                        >
                                            {node.totalCount}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    </g>
                </svg>

                {/* Interactive Controls Overlay */}
                <div className={styles['viewport-controls']}>
                    <button
                        type="button"
                        className={styles['ctrl-btn']}
                        onClick={handleZoomIn}
                        title="放大 (Zoom In)"
                        aria-label="Zoom in"
                    >
                        +
                    </button>
                    <button
                        type="button"
                        className={styles['ctrl-btn']}
                        onClick={handleZoomOut}
                        title="缩小 (Zoom Out)"
                        aria-label="Zoom out"
                    >
                        −
                    </button>
                    {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
                        <button
                            type="button"
                            className={styles['ctrl-btn']}
                            onClick={handleReset}
                            title="重置视图 (Reset)"
                            aria-label="Reset viewport"
                        >
                            ↺
                        </button>
                    )}
                </div>

                {/* Bottom Context Inspector Pill */}
                {activeTagData && (
                    <div className={styles['inspector-card']}>
                        <div className={styles['inspector-main']}>
                            <div className={styles['inspector-title-row']}>
                                <span className={styles['inspector-hash']}>#</span>
                                <h4 className={styles['inspector-title']}>{activeTagData.fieldValue}</h4>
                                <span className={styles['inspector-count']}>
                                    {articlesCountFn(activeTagData.totalCount)}
                                </span>
                            </div>
                            <button
                                type="button"
                                className={styles['inspector-action']}
                                onClick={() => openTag(activeTagData.fieldValue)}
                            >
                                查看全部文章 →
                            </button>
                        </div>

                        {activeConnectedTags.length > 0 && (
                            <div className={styles['inspector-related']}>
                                <span className={styles['inspector-related-label']}>{relatedText}</span>
                                <div className={styles['inspector-related-tags']}>
                                    {activeConnectedTags.map((ct) => (
                                        <button
                                            key={ct.fieldValue}
                                            type="button"
                                            className={styles['inspector-rel-btn']}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openTag(ct.fieldValue);
                                            }}
                                        >
                                            #{ct.fieldValue}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

TagGraph.propTypes = {
    tagGroups: PropTypes.arrayOf(
        PropTypes.shape({
            fieldValue: PropTypes.string.isRequired,
            totalCount: PropTypes.number.isRequired,
            tagList: PropTypes.array,
        }),
    ).isRequired,
    getTagUrl: PropTypes.func.isRequired,
};
