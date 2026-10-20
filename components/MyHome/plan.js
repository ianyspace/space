/**
 * The apartment, as data.
 *
 * Everything here is in metres, in *plan* coordinates: `x` runs east (to the
 * right of the floor plan), `z` runs south (down the floor plan), `y` is up.
 * The origin is the outer north-west corner.
 *
 * Dimensions are taken directly from the floor-plan image (mm → m):
 *   Top chain:    690 + 3052 + 3419 + 2557 = 9718 mm  → 9.72 m
 *   Left chain:   3047 + 2282 + 1708 + 4035 = 11072 mm → 11.07 m
 *   Right chain:  3867 + 1741 + 5670 + 1557 = 12835 mm → 12.84 m
 *   Bottom chain: 3400 + 3821 + 2557        = 9778 mm  → 9.78 m
 *
 * Rooms are defined by their interior faces; adjacent rooms are separated by
 * wall thickness (0.12 m interior, 0.24 m exterior).
 */

export const PLAN = {
    width: 9.72,
    depth: 11.07,
    balconyDepth: 12.84,
    wallHeight: 2.86,
    exterior: 0.24,
    interior: 0.12,
};

export const CENTER = [PLAN.width / 2, PLAN.balconyDepth / 2];

export const ROOMS = [
    {
        id: 'bedB',
        name: '卧室 B',
        latin: 'Bedroom B',
        area: 10.4,
        floor: 'parquet',
        rect: [0.24, 0.24, 3.74, 3.34],
        label: [1.8, 1.6],
    },
    {
        id: 'kitchen',
        name: '厨房',
        latin: 'Kitchen',
        area: 5.9,
        floor: 'tile',
        rect: [3.86, 0.24, 7.16, 2.04],
        label: [5.5, 1.1],
    },
    {
        id: 'bedA',
        name: '卧室 A',
        latin: 'Bedroom A',
        area: 8.7,
        floor: 'parquet',
        rect: [7.28, 0.24, 9.48, 3.99],
        label: [8.4, 2.0],
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
        rect: [0.24, 7.46, 3.40, 11.50],
        label: [1.8, 9.3],
    },
    {
        id: 'corridor',
        name: '走廊',
        latin: 'Hall',
        area: null,
        floor: 'parquet',
        rect: [1.92, 3.46, 3.52, 7.34],
        label: [2.7, 5.4],
    },
    {
        id: 'living',
        name: '客厅',
        latin: 'Living room',
        area: 35.8,
        floor: 'parquet',
        rects: [
            [3.52, 2.04, 7.16, 10.18],
            [7.16, 5.73, 9.48, 10.18],
        ],
        label: [5.5, 6.5],
    },
    {
        id: 'entry',
        name: '门厅',
        latin: 'Entrance',
        area: 3.8,
        floor: 'stone',
        rect: [7.28, 3.99, 9.48, 5.73],
        label: [8.4, 4.86],
    },
    {
        id: 'balcony',
        name: '阳台',
        latin: 'Balcony',
        area: 5.9,
        floor: 'stone',
        rect: [3.52, 10.18, 7.22, 11.74],
        label: [5.4, 11.0],
    },
];

export const WALLS = [
    /* --- exterior shell ------------------------------------------------ */
    {
        a: [0.12, 0.12],
        b: [9.60, 0.12],
        t: PLAN.exterior,
        openings: [
            { at: 0.93, w: 1.70, sill: 0.92, top: 2.24, kind: 'window', mullions: 2 },
            { at: 4.43, w: 1.90, sill: 1.02, top: 2.20, kind: 'window', mullions: 2 },
            { at: 7.73, w: 1.25, sill: 0.92, top: 2.24, kind: 'window', mullions: 1 },
        ],
    },
    {
        a: [0.12, 0.12],
        b: [0.12, 11.07],
        t: PLAN.exterior,
        openings: [
            { at: 4.23, w: 0.80, sill: 1.35, top: 1.95, kind: 'window', mullions: 0 },
            { at: 8.03, w: 1.70, sill: 0.92, top: 2.24, kind: 'window', mullions: 2 },
        ],
    },
    {
        a: [9.60, 0.12],
        b: [9.60, 11.07],
        t: PLAN.exterior,
        openings: [
            { at: 1.23, w: 1.35, sill: 0.92, top: 2.24, kind: 'window', mullions: 1 },
            { at: 3.43, w: 0.95, sill: 0, top: 2.15, kind: 'door', hinge: 'a' },
            { at: 6.33, w: 2.00, sill: 0.62, top: 2.30, kind: 'window', mullions: 2 },
        ],
    },
    {
        a: [0.12, 11.38],
        b: [3.40, 11.38],
        t: PLAN.exterior,
        openings: [
            { at: 0.98, w: 1.55, sill: 0.92, top: 2.24, kind: 'window', mullions: 2 },
        ],
    },
    {
        a: [7.22, 11.74],
        b: [9.60, 11.74],
        t: PLAN.exterior,
        openings: [],
    },
    {
        a: [3.52, 11.74],
        b: [7.22, 11.74],
        t: PLAN.interior,
        openings: [{ at: 0.10, w: 3.54, sill: 0.08, top: 2.62, kind: 'glass', mullions: 3 }],
    },
    { a: [3.52, 10.18], b: [3.52, 11.74], t: PLAN.exterior, openings: [] },
    { a: [7.22, 10.18], b: [7.22, 11.74], t: PLAN.exterior, openings: [] },

    /* --- interior partitions ------------------------------------------ */
    {
        a: [0.24, 3.34],
        b: [3.74, 3.34],
        t: PLAN.interior,
        openings: [{ at: 2.31, w: 0.78, sill: 0, top: 2.08, kind: 'door', hinge: 'a' }],
    },
    { a: [3.74, 0.24], b: [3.74, 3.34], t: PLAN.interior, openings: [] },
    {
        a: [3.86, 2.04],
        b: [7.16, 2.04],
        t: PLAN.interior,
        openings: [{ at: 0.50, w: 1.00, sill: 0, top: 2.20, kind: 'opening' }],
    },
    { a: [7.16, 0.24], b: [7.16, 3.99], t: PLAN.interior, openings: [] },
    {
        a: [7.16, 3.99],
        b: [9.48, 3.99],
        t: PLAN.interior,
        openings: [{ at: 0.34, w: 0.80, sill: 0, top: 2.08, kind: 'door', hinge: 'b' }],
    },
    {
        a: [7.16, 3.99],
        b: [7.16, 5.73],
        t: PLAN.interior,
        openings: [{ at: 0.18, w: 1.15, sill: 0, top: 2.32, kind: 'opening' }],
    },
    { a: [7.16, 5.73], b: [9.48, 5.73], t: PLAN.interior, openings: [] },
    {
        a: [1.92, 3.46],
        b: [1.92, 5.64],
        t: PLAN.interior,
        openings: [{ at: 1.30, w: 0.72, sill: 0, top: 2.05, kind: 'door', hinge: 'a' }],
    },
    { a: [0.24, 5.70], b: [1.92, 5.70], t: PLAN.interior, openings: [] },
    {
        a: [1.92, 5.70],
        b: [1.92, 7.34],
        t: PLAN.interior,
        openings: [{ at: 0.34, w: 0.72, sill: 0, top: 2.05, kind: 'door', hinge: 'b' }],
    },
    { a: [3.52, 3.46], b: [3.52, 7.34], t: PLAN.interior, openings: [] },
    {
        a: [0.24, 7.34],
        b: [3.52, 7.34],
        t: PLAN.interior,
        openings: [{ at: 2.31, w: 0.78, sill: 0, top: 2.08, kind: 'door', hinge: 'a' }],
    },
    { a: [3.52, 7.34], b: [3.52, 11.38], t: PLAN.interior, openings: [] },
    {
        a: [3.52, 10.18],
        b: [7.16, 10.18],
        t: PLAN.interior,
        openings: [{ at: 0.12, w: 3.30, sill: 0, top: 2.42, kind: 'glass', mullions: 3 }],
    },
];

export const FURNITURE = [
    /* living room */
    { type: 'rug', at: [6.3, 7.5], rot: 0, size: [3.3, 4.3], tone: 'sand' },
    { type: 'sofa', at: [8.5, 7.5], rot: -90, size: [2.3, 0.95] },
    { type: 'coffeeTable', at: [6.55, 7.5], rot: 0, size: [1.15, 0.6] },
    { type: 'armchair', at: [6.35, 9.5], rot: 180 },
    { type: 'armchair', at: [6.35, 5.5], rot: 0 },
    { type: 'tvConsole', at: [3.9, 7.5], rot: 90, size: [1.9, 0.42] },
    { type: 'tv', at: [3.85, 7.5], rot: 90 },
    { type: 'sideboard', at: [9.1, 5.8], rot: -90, size: [1.25, 0.42] },
    { type: 'floorLamp', at: [7.0, 9.8] },
    { type: 'plant', at: [4.2, 9.8], scale: 1.05 },
    { type: 'plant', at: [8.8, 5.5], scale: 0.85 },
    { type: 'diningTable', at: [5.5, 4.2], rot: 0, size: [0.55, 0.75] },
    { type: 'chair', at: [4.7, 4.2], rot: 90 },
    { type: 'chair', at: [6.3, 4.2], rot: -90 },
    { type: 'chair', at: [5.5, 3.4], rot: 180 },
    { type: 'chair', at: [5.5, 5.0], rot: 0 },
    { type: 'pendant', at: [5.5, 4.2], drop: 0.68 },
    { type: 'pendant', at: [8.5, 7.5], drop: 1.02, dim: true },

    /* entrance */
    { type: 'console', at: [8.4, 5.2], rot: 180, size: [1.2, 0.34] },
    { type: 'mirror', at: [8.4, 5.25], rot: 180, size: [0.9, 1.05] },
    { type: 'runner', at: [8.4, 4.4], rot: 0, size: [1.05, 1.3], tone: 'taupe' },
    { type: 'plant', at: [9.2, 4.2], scale: 0.7 },

    /* bedroom B */
    { type: 'bed', at: [1.8, 1.6], rot: 90, size: [1.5, 2.05] },
    { type: 'nightstand', at: [0.6, 0.6], rot: 90 },
    { type: 'nightstand', at: [0.6, 2.8], rot: 90 },
    { type: 'wardrobe', at: [3.4, 1.8], rot: -90, size: [1.9, 0.6] },
    { type: 'rug', at: [2.0, 1.8], rot: 90, size: [1.9, 1.5], tone: 'cream' },
    { type: 'pendant', at: [2.0, 1.8], drop: 1.04 },

    /* bedroom A */
    { type: 'bed', at: [8.4, 2.0], rot: 0, size: [1.5, 2.05] },
    { type: 'nightstand', at: [7.5, 0.6], rot: 0 },
    { type: 'nightstand', at: [9.2, 0.6], rot: 0 },
    { type: 'wardrobe', at: [7.5, 2.8], rot: 90, size: [1.4, 0.56] },
    { type: 'desk', at: [9.2, 3.2], rot: -90, size: [1.05, 0.5] },
    { type: 'chair', at: [8.6, 3.2], rot: 90 },
    { type: 'rug', at: [8.4, 2.1], rot: 0, size: [1.7, 1.1], tone: 'cream' },

    /* bedroom C */
    { type: 'bed', at: [1.8, 9.3], rot: 90, size: [1.8, 2.1] },
    { type: 'nightstand', at: [0.6, 8.1], rot: 90 },
    { type: 'nightstand', at: [0.6, 10.5], rot: 90 },
    { type: 'wardrobe', at: [1.8, 7.7], rot: 0, size: [1.9, 0.56] },
    { type: 'bench', at: [3.1, 9.3], rot: 90, size: [1.4, 0.4] },
    { type: 'armchair', at: [1.8, 10.7], rot: 180, small: true },
    { type: 'rug', at: [2.0, 9.3], rot: 90, size: [2.3, 1.7], tone: 'sand' },
    { type: 'pendant', at: [2.0, 9.3], drop: 1.08 },

    /* kitchen */
    { type: 'kitchen', at: [5.5, 0.8], rot: 0, size: [3.3, 0.6] },

    /* bathrooms */
    { type: 'bathA', at: [1.05, 4.55], rot: 0 },
    { type: 'bathB', at: [1.05, 6.55], rot: 0 },

    /* balcony */
    { type: 'bistroTable', at: [5.4, 11.0], rot: 0 },
    { type: 'chair', at: [4.8, 11.0], rot: 90, small: true },
    { type: 'chair', at: [6.0, 11.0], rot: -90, small: true },
    { type: 'plant', at: [4.0, 11.4], scale: 1.15 },
    { type: 'plant', at: [6.8, 10.7], scale: 0.9 },
    { type: 'curtain', at: [4.1, 11.6], rot: 0, size: [0.75, 2.48] },
    { type: 'curtain', at: [6.6, 11.6], rot: 0, size: [0.75, 2.48] },

    /* sheer panels, one pair per main window */
    { type: 'curtain', at: [1.25, 11.0], rot: 0, size: [0.45, 2.28] },
    { type: 'curtain', at: [2.5, 11.0], rot: 0, size: [0.45, 2.28] },
    { type: 'curtain', at: [1.2, 0.33], rot: 0, size: [0.42, 2.28] },
    { type: 'curtain', at: [2.6, 0.33], rot: 0, size: [0.42, 2.28] },
    { type: 'curtain', at: [9.4, 6.8], rot: -90, size: [0.42, 2.28] },
    { type: 'curtain', at: [9.4, 8.3], rot: -90, size: [0.42, 2.28] },
];

export const VIEWS = {
    overview: { pos: [8.6, 14.0, 16.7], target: [4.6, 0.4, 6.2] },
    living: { pos: [4.5, 1.6, 5.0], target: [7.5, 1.15, 8.5] },
    dining: { pos: [7.0, 1.62, 5.5], target: [4.8, 1.15, 3.8] },
    bedB: { pos: [3.5, 1.6, 3.0], target: [0.9, 1.05, 1.3] },
    bedA: { pos: [8.0, 1.6, 3.5], target: [8.7, 1.05, 1.5] },
    bedC: { pos: [3.5, 1.6, 8.5], target: [0.9, 1.05, 9.8] },
    kitchen: { pos: [5.5, 1.62, 2.5], target: [5.5, 1.15, 0.5] },
    bathA: { pos: [1.75, 1.55, 5.5], target: [0.6, 1.1, 4.0] },
    bathB: { pos: [1.7, 1.55, 5.95], target: [0.6, 1.0, 6.9] },
    entry: { pos: [9.0, 1.6, 3.8], target: [7.5, 1.2, 4.86] },
    balcony: { pos: [5.4, 1.6, 10.0], target: [5.4, 1.1, 12.0] },
};

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

export const canStandAt = function (x, z, margin = 0.24) {
    if (roomAt(x, z, margin)) return true;
    return DOORWAYS.some(([x1, z1, x2, z2]) => x > x1 && x < x2 && z > z1 && z < z2);
};