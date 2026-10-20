/**
 * The apartment, as data.
 *
 * Everything here is in metres, in *plan* coordinates: `x` runs east (to the
 * right of the floor plan), `z` runs south (down the floor plan), `y` is up.
 * The origin is the outer north-west corner, so the numbers read the same way
 * as the dimension chains on the drawing (9.72m wide, 11.43m deep, plus the
 * 0.6m the balcony pushes past the south wall).
 *
 * This file is the single source of truth: `buildHome.js` turns it into
 * geometry, and the page reads the same room list for its outline panel — so
 * the drawing, the model and the labels can never drift apart.
 */

export const PLAN = {
    width: 9.72,
    depth: 11.43,
    // The balcony bay is the southernmost thing in the plan.
    balconyDepth: 12.03,
    // Floor-to-ceiling. French apartments are tall; 2.86 keeps that feeling
    // without making the dollhouse view look like a shaft.
    wallHeight: 2.86,
    exterior: 0.24,
    interior: 0.12,
};

export const CENTER = [PLAN.width / 2, PLAN.balconyDepth / 2];

/**
 * Rooms. `rect` is [x1, z1, x2, z2] of the *interior* face; `floor` picks the
 * material; `area` is what the plan says, shown in the outline panel.
 *
 * `label` is where the floating name sits — hand-placed because a rectangle's
 * centre is often under a bed or behind a wall in perspective.
 */
export const ROOMS = [
    {
        id: 'bedB',
        name: '卧室 B',
        latin: 'Bedroom B',
        area: 10.4,
        floor: 'parquet',
        rect: [0.24, 0.24, 3.4, 3.34],
        label: [1.55, 1.55],
    },
    {
        id: 'kitchen',
        name: '厨房',
        latin: 'Kitchen',
        area: 5.9,
        floor: 'tile',
        rect: [3.52, 0.24, 7.08, 2.68],
        label: [5.3, 1.5],
    },
    {
        id: 'bedA',
        name: '卧室 A',
        latin: 'Bedroom A',
        area: 8.7,
        floor: 'parquet',
        rect: [7.2, 0.24, 9.48, 3.33],
        label: [8.35, 1.75],
    },
    {
        id: 'bathA',
        name: '卫生间 A',
        latin: 'Bath A',
        area: 3.2,
        floor: 'tile',
        rect: [0.24, 3.46, 1.92, 5.64],
        label: [1.05, 4.55],
    },
    {
        id: 'bathB',
        name: '卫生间 B',
        latin: 'Bath B',
        area: 3.7,
        floor: 'tile',
        rect: [0.24, 5.76, 1.92, 7.34],
        label: [1.05, 6.55],
    },
    {
        id: 'bedC',
        name: '卧室 C',
        latin: 'Bedroom C',
        area: 15.8,
        floor: 'parquet',
        rect: [0.24, 7.46, 3.4, 11.19],
        label: [1.55, 9.3],
    },
    {
        id: 'corridor',
        name: '走廊',
        latin: 'Hall',
        area: null,
        floor: 'parquet',
        rect: [1.92, 3.46, 3.4, 7.34],
        label: [2.66, 5.4],
    },
    {
        id: 'living',
        name: '客厅',
        latin: 'Living room',
        area: 35.8,
        floor: 'parquet',
        // L-shaped: the main body, plus the bay that reaches past the entry.
        rects: [
            [3.52, 2.8, 7.08, 10.42],
            [7.08, 4.87, 9.48, 11.19],
        ],
        label: [5.35, 6.9],
    },
    {
        id: 'entry',
        name: '门厅',
        latin: 'Entrance',
        area: 3.8,
        floor: 'stone',
        rect: [7.2, 3.39, 9.48, 4.81],
        label: [8.3, 4.1],
    },
    {
        id: 'balcony',
        name: '阳台',
        latin: 'Balcony',
        area: 5.9,
        floor: 'stone',
        rect: [3.52, 10.54, 7.08, 11.91],
        label: [5.3, 11.2],
    },
];

/**
 * Walls, as centre lines. `t` is thickness, `h` the height (defaults to the
 * storey height), and `openings` are measured **along the wall** from `a`:
 *
 *   { at, w, sill, top, kind }
 *
 * `kind` decides what fills the hole — a window frame and glass, a door leaf,
 * a cased opening, or a glazed wall. `sill` is the bottom of the hole, `top`
 * the top; a door has `sill: 0`, a window something like 0.92.
 */
export const WALLS = [
    /* --- exterior shell ------------------------------------------------ */
    {
        a: [0.12, 0.12],
        b: [9.6, 0.12],
        t: PLAN.exterior,
        openings: [
            { at: 0.93, w: 1.7, sill: 0.92, top: 2.24, kind: 'window', mullions: 2 },
            { at: 4.43, w: 1.9, sill: 1.02, top: 2.2, kind: 'window', mullions: 2 },
            { at: 7.73, w: 1.25, sill: 0.92, top: 2.24, kind: 'window', mullions: 1 },
        ],
    },
    {
        a: [0.12, 0.12],
        b: [0.12, 11.31],
        t: PLAN.exterior,
        openings: [
            { at: 4.23, w: 0.8, sill: 1.35, top: 1.95, kind: 'window', mullions: 0 },
            { at: 8.03, w: 1.7, sill: 0.92, top: 2.24, kind: 'window', mullions: 2 },
        ],
    },
    {
        a: [9.6, 0.12],
        b: [9.6, 11.31],
        t: PLAN.exterior,
        openings: [
            { at: 1.23, w: 1.35, sill: 0.92, top: 2.24, kind: 'window', mullions: 1 },
            { at: 3.43, w: 0.95, sill: 0, top: 2.15, kind: 'door', hinge: 'a' },
            { at: 6.33, w: 2, sill: 0.62, top: 2.3, kind: 'window', mullions: 2 },
        ],
    },
    {
        a: [0.12, 11.31],
        b: [3.46, 11.31],
        t: PLAN.exterior,
        openings: [
            { at: 0.98, w: 1.55, sill: 0.92, top: 2.24, kind: 'window', mullions: 2 },
        ],
    },
    {
        a: [7.14, 11.31],
        b: [9.6, 11.31],
        t: PLAN.exterior,
        openings: [],
    },
    {
        a: [3.4, 11.97],
        b: [7.14, 11.97],
        t: PLAN.interior,
        openings: [{ at: 0.1, w: 3.54, sill: 0.08, top: 2.62, kind: 'glass', mullions: 3 }],
    },
    { a: [3.4, 10.42], b: [3.4, 11.97], t: PLAN.exterior, openings: [] },
    { a: [7.14, 10.42], b: [7.14, 11.97], t: PLAN.exterior, openings: [] },

    /* --- interior partitions ------------------------------------------ */
    {
        a: [0.24, 3.4],
        b: [3.46, 3.4],
        t: PLAN.interior,
        openings: [{ at: 2.31, w: 0.78, sill: 0, top: 2.08, kind: 'door', hinge: 'a' }],
    },
    { a: [3.46, 0.24], b: [3.46, 3.4], t: PLAN.interior, openings: [] },
    {
        a: [3.52, 2.74],
        b: [7.14, 2.74],
        t: PLAN.interior,
        openings: [{ at: 0.5, w: 1, sill: 0, top: 2.2, kind: 'opening' }],
    },
    { a: [7.14, 0.24], b: [7.14, 3.39], t: PLAN.interior, openings: [] },
    {
        a: [7.14, 3.39],
        b: [9.48, 3.39],
        t: PLAN.interior,
        openings: [{ at: 0.34, w: 0.8, sill: 0, top: 2.08, kind: 'door', hinge: 'b' }],
    },
    {
        a: [7.14, 3.39],
        b: [7.14, 4.87],
        t: PLAN.interior,
        openings: [{ at: 0.18, w: 1.15, sill: 0, top: 2.32, kind: 'opening' }],
    },
    { a: [7.14, 4.87], b: [9.48, 4.87], t: PLAN.interior, openings: [] },
    {
        a: [1.92, 3.46],
        b: [1.92, 5.64],
        t: PLAN.interior,
        openings: [{ at: 1.3, w: 0.72, sill: 0, top: 2.05, kind: 'door', hinge: 'a' }],
    },
    { a: [0.24, 5.7], b: [1.92, 5.7], t: PLAN.interior, openings: [] },
    {
        a: [1.92, 5.7],
        b: [1.92, 7.34],
        t: PLAN.interior,
        openings: [{ at: 0.34, w: 0.72, sill: 0, top: 2.05, kind: 'door', hinge: 'b' }],
    },
    { a: [3.46, 3.4], b: [3.46, 7.4], t: PLAN.interior, openings: [] },
    {
        a: [0.24, 7.4],
        b: [3.46, 7.4],
        t: PLAN.interior,
        openings: [{ at: 2.31, w: 0.78, sill: 0, top: 2.08, kind: 'door', hinge: 'a' }],
    },
    { a: [3.46, 7.4], b: [3.46, 11.31], t: PLAN.interior, openings: [] },
    {
        a: [3.52, 10.42],
        b: [7.08, 10.42],
        t: PLAN.interior,
        openings: [{ at: 0.12, w: 3.3, sill: 0, top: 2.42, kind: 'glass', mullions: 3 }],
    },
];

/**
 * Furniture. `at` is the plan position of the piece's origin (its centre on
 * the floor), `rot` is degrees clockwise seen from above — 0 means "facing
 * south", the same way the builders are written.
 */
export const FURNITURE = [
    /* living room */
    { type: 'rug', at: [6.3, 7.5], rot: 0, size: [3.3, 4.3], tone: 'sand' },
    { type: 'sofa', at: [8.82, 7.5], rot: -90, size: [2.3, 0.95] },
    { type: 'coffeeTable', at: [6.55, 7.5], rot: 0, size: [1.15, 0.6] },
    { type: 'armchair', at: [6.35, 9.5], rot: 180 },
    { type: 'armchair', at: [6.35, 5.5], rot: 0 },
    { type: 'tvConsole', at: [3.66, 7.5], rot: 90, size: [1.9, 0.42] },
    { type: 'tv', at: [3.6, 7.5], rot: 90 },
    { type: 'sideboard', at: [9.34, 5.55], rot: -90, size: [1.25, 0.42] },
    { type: 'floorLamp', at: [7.0, 9.95] },
    { type: 'plant', at: [3.95, 10.0], scale: 1.05 },
    { type: 'plant', at: [8.95, 5.05], scale: 0.85 },
    { type: 'diningTable', at: [5.35, 4.05], rot: 0, size: [0.55, 0.75] },
    { type: 'chair', at: [4.55, 4.05], rot: 90 },
    { type: 'chair', at: [6.15, 4.05], rot: -90 },
    { type: 'chair', at: [5.35, 3.25], rot: 180 },
    { type: 'chair', at: [5.35, 4.85], rot: 0 },
    { type: 'pendant', at: [5.35, 4.05], drop: 0.68 },
    { type: 'pendant', at: [8.82, 7.5], drop: 1.02, dim: true },

    /* entrance */
    { type: 'console', at: [8.3, 4.79], rot: 180, size: [1.2, 0.34] },
    { type: 'mirror', at: [8.3, 4.85], rot: 180, size: [0.9, 1.05] },
    { type: 'runner', at: [8.3, 4.05], rot: 0, size: [1.05, 1.3], tone: 'taupe' },
    { type: 'plant', at: [9.25, 3.6], scale: 0.7 },

    /* bedroom B */
    { type: 'bed', at: [1.35, 1.7], rot: 90, size: [1.5, 2.05] },
    { type: 'nightstand', at: [0.55, 0.62], rot: 90 },
    { type: 'nightstand', at: [0.55, 2.78], rot: 90 },
    { type: 'wardrobe', at: [3.1, 1.9], rot: -90, size: [1.9, 0.6] },
    { type: 'rug', at: [1.95, 1.85], rot: 90, size: [1.9, 1.5], tone: 'cream' },
    { type: 'pendant', at: [1.9, 1.8], drop: 1.04 },

    /* bedroom A */
    { type: 'bed', at: [8.35, 1.45], rot: 0, size: [1.5, 2.05] },
    { type: 'nightstand', at: [7.5, 0.62], rot: 0 },
    { type: 'nightstand', at: [9.2, 0.62], rot: 0 },
    { type: 'wardrobe', at: [7.5, 2.2], rot: 90, size: [1.4, 0.56] },
    { type: 'desk', at: [9.15, 2.85], rot: -90, size: [1.05, 0.5] },
    { type: 'chair', at: [8.55, 2.85], rot: 90 },
    { type: 'rug', at: [8.4, 2.1], rot: 0, size: [1.7, 1.1], tone: 'cream' },

    /* bedroom C */
    { type: 'bed', at: [1.55, 9.3], rot: 90, size: [1.8, 2.1] },
    { type: 'nightstand', at: [0.55, 8.15], rot: 90 },
    { type: 'nightstand', at: [0.55, 10.45], rot: 90 },
    { type: 'wardrobe', at: [1.55, 7.72], rot: 0, size: [1.9, 0.56] },
    { type: 'bench', at: [2.95, 9.3], rot: 90, size: [1.4, 0.4] },
    { type: 'armchair', at: [1.55, 10.65], rot: 180, small: true },
    { type: 'rug', at: [1.75, 9.3], rot: 90, size: [2.3, 1.7], tone: 'sand' },
    { type: 'pendant', at: [1.8, 9.3], drop: 1.08 },

    /* kitchen */
    { type: 'kitchen', at: [5.3, 0.55], rot: 0, size: [3.5, 0.62] },

    /* bathrooms */
    { type: 'bathA', at: [1.05, 4.55], rot: 0 },
    { type: 'bathB', at: [1.05, 6.55], rot: 0 },

    /* balcony */
    { type: 'bistroTable', at: [5.85, 11.15], rot: 0 },
    { type: 'chair', at: [5.2, 11.15], rot: 90, small: true },
    { type: 'chair', at: [6.5, 11.15], rot: -90, small: true },
    { type: 'plant', at: [3.85, 11.5], scale: 1.15 },
    { type: 'plant', at: [6.9, 10.85], scale: 0.9 },
    { type: 'curtain', at: [3.95, 11.8], rot: 0, size: [0.75, 2.48] },
    { type: 'curtain', at: [6.68, 11.8], rot: 0, size: [0.75, 2.48] },

    /* sheer panels, one pair per main window */
    { type: 'curtain', at: [1.25, 11.13], rot: 0, size: [0.45, 2.28] },
    { type: 'curtain', at: [2.5, 11.13], rot: 0, size: [0.45, 2.28] },
    { type: 'curtain', at: [1.2, 0.33], rot: 0, size: [0.42, 2.28] },
    { type: 'curtain', at: [2.6, 0.33], rot: 0, size: [0.42, 2.28] },
    { type: 'curtain', at: [9.4, 6.55], rot: -90, size: [0.42, 2.28] },
    { type: 'curtain', at: [9.4, 8.1], rot: -90, size: [0.42, 2.28] },
];

/**
 * Camera stops, in plan coordinates. `y` is absolute; the component subtracts
 * the plan centre so the model sits at the origin.
 */
export const VIEWS = {
    overview: { pos: [8.6, 14.0, 16.7], target: [4.6, 0.4, 6.2] },
    // Eye-level views. Each one stands back far enough that no pendant lamp
    // hangs into the top of the frame — a 2m-wide lampshade 80cm from the lens
    // will fill a third of the screen.
    living: { pos: [4.15, 1.6, 4.45], target: [8.0, 1.15, 8.6] },
    dining: { pos: [6.7, 1.62, 5.75], target: [4.7, 1.15, 3.6] },
    bedB: { pos: [3.05, 1.6, 3.05], target: [0.9, 1.05, 1.3] },
    bedA: { pos: [7.55, 1.6, 3.05], target: [8.7, 1.05, 0.9] },
    bedC: { pos: [3.05, 1.6, 7.85], target: [0.9, 1.05, 9.6] },
    kitchen: { pos: [5.0, 1.62, 2.5], target: [5.4, 1.15, 0.4] },
    bathA: { pos: [1.75, 1.55, 5.5], target: [0.6, 1.1, 4.0] },
    bathB: { pos: [1.7, 1.55, 5.95], target: [0.6, 1.0, 6.9] },
    entry: { pos: [8.9, 1.6, 3.62], target: [7.3, 1.2, 4.6] },
    balcony: { pos: [5.3, 1.6, 9.5], target: [5.3, 1.1, 11.7] },
};

/** Which room a plan point falls in (used by the walk mode's collision). */
export const roomAt = function (x, z, margin = 0) {
    for (let i = 0; i < ROOMS.length; i += 1) {
        const room = ROOMS[i];
        const rects = room.rects || [room.rect];
        for (let j = 0; j < rects.length; j += 1) {
            const [x1, z1, x2, z2] = rects[j];
            if (
                x > x1 + margin && x < x2 - margin
                && z > z1 + margin && z < z2 - margin
            ) {
                return room.id;
            }
        }
    }
    return null;
};

/**
 * The strips you can walk through.
 *
 * Walking is clamped to the rooms, which also means a wall stops you — except
 * that rooms do not touch, so without these the corridor would be sealed off
 * from every room it serves. Each door or cased opening therefore contributes
 * a 0.9m-deep rectangle straddling its wall.
 */
export const DOORWAYS = WALLS.reduce((list, wall) => {
    const dx = wall.b[0] - wall.a[0];
    const dz = wall.b[1] - wall.a[1];
    const length = Math.hypot(dx, dz);
    if (length < 1e-4) return list;
    const ux = dx / length;
    const uz = dz / length;

    (wall.openings || []).forEach((opening) => {
        if (opening.kind !== 'door' && opening.kind !== 'opening') return;
        const cx = wall.a[0] + ux * (opening.at + opening.w / 2);
        const cz = wall.a[1] + uz * (opening.at + opening.w / 2);
        const half = 0.45;
        list.push(Math.abs(ux) > Math.abs(uz)
            ? [cx - opening.w / 2, cz - half, cx + opening.w / 2, cz + half]
            : [cx - half, cz - opening.w / 2, cx + half, cz + opening.w / 2]);
    });

    return list;
}, []);

/** True when a plan point is somewhere a person could stand. */
export const canStandAt = function (x, z, margin = 0.24) {
    if (roomAt(x, z, margin)) return true;
    return DOORWAYS.some(([x1, z1, x2, z2]) => x > x1 && x < x2 && z > z1 && z < z2);
};
