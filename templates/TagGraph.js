import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import { useRouter } from 'next/router';

import styles from './TagGraph.module.scss';

/**
 * Tag relation graph: every tag is a node (size tracks the article count), and
 * tags that share at least one article are linked — a two-dimensional map of
 * what this blog actually writes about.
 *
 * Layout is a deterministic force simulation (seeded circular start, repulsion
 * + link attraction + centering, cooling to rest) computed in `useMemo`, so the
 * server render and the client hydration agree — no randomness anywhere.
 *
 * Interactions: hover highlights a node and its neighbours (the rest fade);
 * click navigates to the tag page.
 */
const VIEW_W = 760;
const VIEW_H = 540;

const MIN_R = 13;
const MAX_R = 30;

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
                const minGap = radiusOf(a) + radiusOf(b) + 38;
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

    return (
        <div className={styles.wrap}>
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className={styles.svg}
                role="img"
                aria-label="标签关系图"
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
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => router.push(getTagUrl(node.fieldValue))}
                        >
                            <title>{`${node.fieldValue} · ${node.totalCount} 篇文章，点击进入标签页`}</title>
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
                            <text
                                className={styles.count}
                                x={node.x}
                                y={node.y - r - 7}
                                textAnchor="middle"
                            >
                                {node.totalCount}
                            </text>
                        </g>
                    );
                })}
            </svg>

            <div className={styles.panel}>
                {hovered != null ? (
                    <>
                        <span className={styles['panel-tag']}>{nodes[hovered].fieldValue}</span>
                        <span className={styles['panel-count']}>
                            {nodes[hovered].totalCount} 篇 · 关联{' '}
                            {(neighbourOf.get(hovered) || new Set()).size} 个标签
                        </span>
                        <Link className={styles['panel-link']} href={getTagUrl(nodes[hovered].fieldValue)}>
                            查看文章 →
                        </Link>
                    </>
                ) : (
                    <span className={styles['panel-hint']}>
                        节点越大文章越多，连线代表两个标签出现在同一篇文章里。悬停查看详情，点击进入标签页。
                    </span>
                )}
            </div>
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
