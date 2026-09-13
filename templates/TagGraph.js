import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useRouter } from 'next/router';

import { formatMessage } from 'utils/i18n';

import styles from './TagGraph.module.scss';

/**
 * Tag relation graph: every tag is a node (size tracks the article count), and
 * tags that share at least one article are linked. Hovering a node focuses it
 * and its neighbours; clicking opens the tag page. No chrome, no legend — the
 * map reads itself.
 *
 * Layout is a deterministic force simulation (seeded circular start, repulsion
 * + link attraction + centering, cooling to rest) computed in `useMemo`, so the
 * server render and the client hydration agree — no randomness anywhere.
 */
const VIEW_W = 760;
const VIEW_H = 560;

const MIN_R = 14;
const MAX_R = 34;

/** Deterministic force layout, run to convergence once per dataset. */
function computeLayout(tagGroups) {
    const nodes = tagGroups.map((tag, i) => {
        const angle = (i / tagGroups.length) * Math.PI * 2 - Math.PI / 2;
        const radius = VIEW_H * 0.3;
        return {
            ...tag,
            x: VIEW_W / 2 + Math.cos(angle) * radius,
            y: VIEW_H / 2 + Math.sin(angle) * radius,
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
            if (source != null && target != null) links.push({ source, target, key });
        });
    });

    const degree = nodes.map(() => 0);
    links.forEach((link) => {
        degree[link.source] += 1;
        degree[link.target] += 1;
    });

    const maxCount = Math.max(...nodes.map((n) => n.totalCount), 1);
    const maxDegree = Math.max(...degree, 1);
    const radiusOf = (i) =>
        MIN_R
        + (nodes[i].totalCount / maxCount) * (MAX_R - MIN_R) * 0.7
        + (degree[i] / maxDegree) * (MAX_R - MIN_R) * 0.3;

    let temperature = 1;
    for (let tick = 0; tick < 320; tick += 1) {
        temperature *= 0.992;

        for (let a = 0; a < nodes.length; a += 1) {
            for (let b = a + 1; b < nodes.length; b += 1) {
                const dx = nodes[b].x - nodes[a].x;
                const dy = nodes[b].y - nodes[a].y;
                const dist = Math.hypot(dx, dy) || 1;
                const minGap = radiusOf(a) + radiusOf(b) + 30;
                // Repulsion grows sharply when circles would overlap.
                const push =
                    (minGap - dist > 0 ? (minGap - dist) * 0.14 : 0) + (60 * 18) / (dist * dist);
                const fx = (dx / dist) * push;
                const fy = (dy / dist) * push;
                nodes[a].vx -= fx;
                nodes[a].vy -= fy;
                nodes[b].vx += fx;
                nodes[b].vy += fy;
            }
        }

        links.forEach((link) => {
            const p = nodes[link.source];
            const q = nodes[link.target];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const dist = Math.hypot(dx, dy) || 1;
            const want = 150;
            const k = (dist - want) * 0.02;
            const fx = (dx / dist) * k;
            const fy = (dy / dist) * k;
            p.vx += fx;
            p.vy += fy;
            q.vx -= fx;
            q.vy -= fy;
        });

        nodes.forEach((node, i) => {
            // Gentle pull to the canvas centre keeps the cloud compact.
            node.vx += (VIEW_W / 2 - node.x) * 0.004;
            node.vy += (VIEW_H / 2 - node.y) * 0.006;
            node.x += Math.max(-14, Math.min(14, node.vx)) * temperature;
            node.y += Math.max(-14, Math.min(14, node.vy)) * temperature;
            node.vx *= 0.62;
            node.vy *= 0.62;
            // Keep everything inside the viewBox with a soft wall.
            const r = radiusOf(i);
            node.x = Math.max(r + 14, Math.min(VIEW_W - r - 14, node.x));
            node.y = Math.max(r + 14, Math.min(VIEW_H - r - 14, node.y));
        });
    }

    return { nodes, links, radiusOf };
}

const TagGraph = function ({ tagGroups, getTagUrl }) {
    const [hovered, setHovered] = useState(null);
    const router = useRouter();
    // Resolved once, outside the node loop: `formatMessage` is a hook, and the
    // tag counts are plain data, so the counts are interpolated with `String`.
    const tTagGraphAria = formatMessage('tTagGraphAria');

    const { nodes, links, radiusOf } = useMemo(() => computeLayout(tagGroups), [tagGroups]);

    const neighbourOf = useMemo(() => {
        const map = new Map();
        links.forEach((link) => {
            map.set(link.source, (map.get(link.source) || new Set()).add(link.target));
            map.set(link.target, (map.get(link.target) || new Set()).add(link.source));
        });
        return map;
    }, [links]);

    const isDimmed = (i) => {
        if (hovered == null) return false;
        if (i === hovered) return false;
        return !(neighbourOf.get(hovered) || new Set()).has(i);
    };

    const openTag = (tag) => router.push(getTagUrl(tag));

    return (
        <div className={styles.wrap}>
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className={styles.svg}
                // `role="group"` rather than `role="img"`: the nodes are links, and
                // `img` would hide the whole map from assistive tech.
                role="group"
                aria-label={tTagGraphAria}
            >
                {links.map((link) => {
                    const dimmed =
                        hovered != null && link.source !== hovered && link.target !== hovered;
                    const hot =
                        hovered != null && (link.source === hovered || link.target === hovered);
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
                {nodes.map((node, i) => {
                    const r = radiusOf(i);
                    const dimmed = isDimmed(i);
                    return (
                        <g
                            key={node.fieldValue}
                            className={`${styles.node} ${dimmed ? styles['node-dim'] : ''} ${
                                i === hovered ? styles['node-hot'] : ''
                            }`}
                            // Keyboard/touch users get the same affordance as the mouse:
                            // focus follows the hover state, Enter and Space open the tag.
                            role="button"
                            tabIndex={0}
                            aria-label={`${node.fieldValue} (${node.totalCount})`}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(i)}
                            onBlur={() => setHovered(null)}
                            onClick={() => openTag(node.fieldValue)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                openTag(node.fieldValue);
                            }}
                        >
                            <circle className={styles.hit} cx={node.x} cy={node.y} r={r + 8} fill="transparent" />
                            <circle className={styles.bubble} cx={node.x} cy={node.y} r={r} />
                            <text
                                className={styles.label}
                                x={node.x}
                                y={node.y + 1}
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                {node.fieldValue}
                            </text>
                            <text className={styles.count} x={node.x} y={node.y + r + 15} textAnchor="middle">
                                {node.totalCount}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

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

export default TagGraph;
