/**
 * Turns `plan.js` into a three.js scene graph.
 *
 * The model is deliberately a *maquette*: real walls with real openings, a
 * stone plinth, no ceiling until you walk into it. That is what makes the
 * dollhouse view legible — you look down into the rooms instead of at a roof —
 * while the eye-level views still get a ceiling, cornices and light fittings.
 *
 * Everything is built from unit boxes and cylinders that are scaled per mesh,
 * so the whole apartment costs a handful of geometries.
 */

import { PLAN, ROOMS, WALLS, FURNITURE, roomAt } from './plan';

const DEG = Math.PI / 180;

const PALETTE = {
    wall: 0xf4eee3,
    trim: 0xfdfaf4,
    ceiling: 0xfbf8f2,
    oak: 0xc9a97c,
    oakDark: 0x9d7c53,
    linen: 0xe7dece,
    cream: 0xf1e9db,
    sage: 0x9ba48f,
    taupe: 0xb5a696,
    clay: 0xc08a6a,
    brass: 0xb08d57,
    black: 0x2f2e2c,
    white: 0xf8f6f1,
    glass: 0xdff0f5,
};

export function buildHome(THREE, { textures, anisotropy = 4 }) {
    const root = new THREE.Group();
    const labels = [];
    // Point lights added by the fittings, so the page can dim or lift them when
    // the light changes without walking the graph looking for lights.
    const lamps = [];

    /* --- shared geometry ------------------------------------------------ */

    const BOX = new THREE.BoxGeometry(1, 1, 1);
    const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    const CONE = new THREE.CylinderGeometry(0.5, 1, 1, 28, 1, true);

    /* --- materials ------------------------------------------------------ */

    const mat = (params) => new THREE.MeshStandardMaterial(params);

    const M = {
        wall: mat({ color: PALETTE.wall, roughness: 0.96 }),
        trim: mat({ color: PALETTE.trim, roughness: 0.6 }),
        ceiling: mat({ color: PALETTE.ceiling, roughness: 1 }),
        oak: mat({ color: PALETTE.oak, roughness: 0.62 }),
        oakDark: mat({ color: PALETTE.oakDark, roughness: 0.66 }),
        linen: mat({ color: PALETTE.linen, roughness: 0.95 }),
        cream: mat({ color: PALETTE.cream, roughness: 0.9 }),
        sage: mat({ color: PALETTE.sage, roughness: 0.92 }),
        taupe: mat({ color: PALETTE.taupe, roughness: 0.92 }),
        clay: mat({ color: PALETTE.clay, roughness: 0.85 }),
        brass: mat({ color: PALETTE.brass, roughness: 0.28, metalness: 0.9 }),
        black: mat({ color: PALETTE.black, roughness: 0.5, metalness: 0.25 }),
        white: mat({ color: PALETTE.white, roughness: 0.45 }),
        mirror: mat({ color: 0xdfe7ea, roughness: 0.04, metalness: 1 }),
        marble: mat({ map: textures.marble, roughness: 0.28, metalness: 0.02 }),
        glass: new THREE.MeshPhysicalMaterial({
            color: PALETTE.glass,
            roughness: 0.06,
            metalness: 0,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
        sheer: new THREE.MeshStandardMaterial({
            color: 0xf6f1e6,
            roughness: 1,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
        lampShade: new THREE.MeshStandardMaterial({
            color: 0xf4ead8,
            roughness: 0.9,
            emissive: 0xffd9a8,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide,
        }),
    };

    const FLOOR_SOURCE = {
        parquet: { material: mat({ map: textures.parquet, roughness: 0.52 }), metres: textures.parquetMetres },
        tile: { material: mat({ map: textures.tile, roughness: 0.34 }), metres: textures.tileMetres },
        stone: { material: mat({ map: textures.stone, roughness: 0.62 }), metres: textures.stoneMetres },
    };

    /* --- primitives ----------------------------------------------------- */

    const box = function (parent, material, w, h, d, x, y, z, ry = 0) {
        const mesh = new THREE.Mesh(BOX, material);
        mesh.scale.set(w, h, d);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    const cyl = function (parent, material, radius, height, x, y, z, ry = 0) {
        const mesh = new THREE.Mesh(CYL, material);
        mesh.scale.set(radius * 2, height, radius * 2);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    /* --- floors --------------------------------------------------------- */

    // World-space UVs (one tile per `metres`) rather than per-plane repeats:
    // the living room is two rectangles that meet at x = 7.08, and this is what
    // keeps the boards running through the joint instead of restarting there.
    const addFloor = function (kind, x1, z1, x2, z2) {
        const source = FLOOR_SOURCE[kind];
        const width = x2 - x1;
        const depth = z2 - z1;
        const geometry = new THREE.PlaneGeometry(width, depth);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate((x1 + x2) / 2, 0, (z1 + z2) / 2);

        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        for (let i = 0; i < position.count; i += 1) {
            uv.setXY(i, position.getX(i) / source.metres, position.getZ(i) / source.metres);
        }
        uv.needsUpdate = true;

        const mesh = new THREE.Mesh(geometry, source.material);
        mesh.receiveShadow = true;
        mesh.position.y = 0.002;
        root.add(mesh);
        return mesh;
    };

    ROOMS.forEach((room) => {
        const rects = room.rects || [room.rect];
        rects.forEach((rect) => addFloor(room.floor, rect[0], rect[1], rect[2], rect[3]));
    });

    /* --- plinth --------------------------------------------------------- */

    const plinth = box(
        root, mat({ color: 0xded2bd, roughness: 0.95 }),
        PLAN.width + 0.36, 0.16, PLAN.balconyDepth + 0.36,
        PLAN.width / 2, -0.08, PLAN.balconyDepth / 2,
    );
    plinth.castShadow = false;

    /* --- walls ---------------------------------------------------------- */

    const addTrim = function (parent, length, thickness, y, height, depth, cx, cz, nx, nz, angle) {
        const mesh = box(
            parent, M.trim, length, height, depth,
            cx + nx * (thickness / 2 + depth / 2 - 0.004), y,
            cz + nz * (thickness / 2 + depth / 2 - 0.004), angle,
        );
        mesh.castShadow = false;
        return mesh;
    };

    const buildWall = function (segment) {
        const [ax, az] = segment.a;
        const [bx, bz] = segment.b;
        const dx = bx - ax;
        const dz = bz - az;
        const length = Math.hypot(dx, dz);
        if (length < 1e-4) return;

        const dirX = dx / length;
        const dirZ = dz / length;
        const angle = -Math.atan2(dz, dx);
        const thickness = segment.t || PLAN.interior;
        const height = segment.h || PLAN.wallHeight;
        const openings = [...(segment.openings || [])].sort((p, q) => p.at - q.at);

        const at = function (distance) {
            return [ax + dirX * distance, az + dirZ * distance];
        };

        const addBlock = function (from, to, bottom, top) {
            const span = to - from;
            if (span <= 1e-4 || top - bottom <= 1e-4) return;
            const [cx, cz] = at((from + to) / 2);
            box(root, M.wall, span, top - bottom, thickness, cx, (bottom + top) / 2, cz, angle);

            // Skirting and cornice only on faces that look into a room: the
            // outside of an exterior wall sits on the plinth and must stay bare.
            const nx = -dirZ;
            const nz = dirX;
            [1, -1].forEach((side) => {
                const probeX = cx + nx * side * (thickness / 2 + 0.16);
                const probeZ = cz + nz * side * (thickness / 2 + 0.16);
                if (!roomAt(probeX, probeZ)) return;
                if (bottom < 0.001) {
                    addTrim(root, span, thickness, 0.055, 0.11, 0.028, cx, cz, nx * side, nz * side, angle);
                }
                if (top > height - 0.001) {
                    addTrim(root, span, thickness, height - 0.045, 0.075, 0.042, cx, cz, nx * side, nz * side, angle);
                }
            });
        };

        let cursor = 0;
        openings.forEach((opening) => {
            if (opening.at > cursor) addBlock(cursor, opening.at, 0, height);
            cursor = Math.max(cursor, opening.at + opening.w);
        });
        if (cursor < length) addBlock(cursor, length, 0, height);

        openings.forEach((opening) => {
            if (opening.sill > 0.002) addBlock(opening.at, opening.at + opening.w, 0, opening.sill);
            if (opening.top < height - 0.002) addBlock(opening.at, opening.at + opening.w, opening.top, height);
            addFilling(opening, at(opening.at + opening.w / 2), angle, thickness);
        });
    };

    const addFilling = function (opening, center, angle, thickness) {
        const group = new THREE.Group();
        group.position.set(center[0], 0, center[1]);
        group.rotation.y = angle;
        root.add(group);

        const width = opening.w;
        const height = opening.top - opening.sill;
        const midY = opening.sill + height / 2;

        if (opening.kind === 'window' || opening.kind === 'glass') {
            const frame = opening.kind === 'glass' ? 0.05 : 0.07;
            const depth = opening.kind === 'glass' ? 0.1 : 0.09;

            box(group, M.trim, width, frame, depth, 0, opening.sill + frame / 2, 0);
            box(group, M.trim, width, frame, depth, 0, opening.top - frame / 2, 0);
            box(group, M.trim, frame, height, depth, -width / 2 + frame / 2, midY, 0);
            box(group, M.trim, frame, height, depth, width / 2 - frame / 2, midY, 0);

            const mullions = opening.mullions || 0;
            for (let i = 1; i <= mullions; i += 1) {
                const x = -width / 2 + (width / (mullions + 1)) * i;
                box(group, M.trim, 0.04, height - frame, depth * 0.8, x, midY, 0);
            }

            const glass = box(
                group, M.glass,
                width - frame * 2, height - frame * 2, 0.012,
                0, midY, 0,
            );
            glass.castShadow = false;

            // A stone sill on the inside, so a window sits *in* the wall.
            if (opening.kind === 'window' && opening.sill > 0.2) {
                box(group, M.trim, width + 0.1, 0.045, thickness + 0.09, 0, opening.sill - 0.022, 0);
            }
            return;
        }

        // Cased opening / door: a casing on both faces, and for a door, a leaf
        // standing open at a natural angle.
        const casing = 0.075;
        box(group, M.trim, casing, height, thickness + 0.05, -width / 2 - casing / 2, opening.sill + height / 2, 0);
        box(group, M.trim, casing, height, thickness + 0.05, width / 2 + casing / 2, opening.sill + height / 2, 0);
        box(group, M.trim, width + casing * 2, casing, thickness + 0.05, 0, opening.sill + height + casing / 2, 0);

        if (opening.kind !== 'door') return;

        const hingeLeft = opening.hinge !== 'b';
        const leafWidth = width - 0.04;
        const leafHeight = height - 0.03;
        const leaf = new THREE.Group();
        leaf.position.set(hingeLeft ? -width / 2 + 0.02 : width / 2 - 0.02, 0, 0);
        leaf.rotation.y = (hingeLeft ? 1 : -1) * 34 * DEG;
        group.add(leaf);

        const panel = box(
            leaf, M.trim, leafWidth, leafHeight, 0.042,
            hingeLeft ? leafWidth / 2 : -leafWidth / 2, opening.sill + leafHeight / 2, 0,
        );
        panel.castShadow = true;

        // Recessed panel lines: two thin shadows instead of modelling a moulding.
        const inset = box(
            leaf, mat({ color: 0xefe9df, roughness: 0.7 }),
            leafWidth - 0.22, leafHeight - 0.26, 0.012,
            hingeLeft ? leafWidth / 2 : -leafWidth / 2, opening.sill + leafHeight / 2, 0.026,
        );
        inset.castShadow = false;

        const knobX = hingeLeft ? leafWidth - 0.11 : -(leafWidth - 0.11);
        cyl(leaf, M.brass, 0.022, 0.055, knobX, 1.02, 0.05, 0);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), M.brass);
        knob.position.set(knobX, 1.02, 0.075);
        leaf.add(knob);
    };

    WALLS.forEach(buildWall);

    /* --- ceiling (hidden until the camera is inside) -------------------- */

    const ceilingMaterial = M.ceiling;
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(PLAN.width, PLAN.balconyDepth),
        ceilingMaterial,
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(PLAN.width / 2, PLAN.wallHeight, PLAN.balconyDepth / 2);
    ceiling.receiveShadow = true;
    ceiling.visible = false;
    root.add(ceiling);

    /* --- furniture ------------------------------------------------------ */

    const furnitureGroup = new THREE.Group();
    root.add(furnitureGroup);

    const addRug = function (group, size, tone) {
        const material = mat({
            map: textures.rug,
            color: tone === 'sand' ? 0xd9c9ad : tone === 'taupe' ? 0xc0b1a0 : 0xe8dfcd,
            roughness: 0.98,
        });
        const mesh = box(group, material, size[0], 0.014, size[1], 0, 0.009, 0);
        mesh.castShadow = false;
        return mesh;
    };

    const builders = {
        rug: ({ group, size = [2, 3], tone = 'cream' }) => addRug(group, size, tone),

        bed: ({ group, size = [1.6, 2.05] }) => {
            const [w, l] = size;
            box(group, M.oakDark, w + 0.06, 0.1, l + 0.06, 0, 0.05, 0);
            box(group, M.oak, w + 0.08, 0.2, l + 0.08, 0, 0.2, 0);
            box(group, M.cream, w, 0.24, l - 0.04, 0, 0.4, 0.02);
            box(group, M.linen, w + 0.03, 0.16, l * 0.62, 0, 0.5, l * 0.16);
            box(group, M.sage, w + 0.05, 0.05, 0.42, 0, 0.585, l * 0.34);
            box(group, M.linen, w + 0.14, 1.02, 0.1, 0, 0.51, -l / 2 - 0.05);
            [-1, 1].forEach((side) => {
                box(group, M.white, w * 0.42, 0.14, 0.34, side * w * 0.23, 0.56, -l / 2 + 0.28);
            });
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                box(group, M.oakDark, 0.07, 0.1, 0.07, sx * (w / 2 - 0.06), 0.05, sz * (l / 2 - 0.06));
            });
        },

        nightstand: ({ group }) => {
            box(group, M.oak, 0.46, 0.5, 0.42, 0, 0.25, 0);
            box(group, M.oakDark, 0.4, 0.16, 0.02, 0, 0.36, 0.215);
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), M.brass);
            knob.position.set(0, 0.36, 0.235);
            group.add(knob);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                box(group, M.oakDark, 0.04, 0.08, 0.04, sx * 0.18, 0.04, sz * 0.16);
            });
            cyl(group, M.brass, 0.07, 0.26, 0, 0.64, 0);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(0.34, 0.26, 0.34);
            shade.position.set(0, 0.9, 0);
            shade.castShadow = false;
            group.add(shade);
        },

        wardrobe: ({ group, size = [1.8, 0.6] }) => {
            const [w, d] = size;
            const h = 2.32;
            box(group, M.oak, w, h, d, 0, h / 2, 0);
            [-1, 1].forEach((side) => {
                box(group, M.cream, w / 2 - 0.02, h - 0.1, 0.02, side * (w / 4), h / 2, d / 2 + 0.011);
                box(group, M.brass, 0.02, 0.34, 0.03, side * 0.06, 1.15, d / 2 + 0.03);
            });
            box(group, M.oakDark, w + 0.04, 0.06, d + 0.02, 0, h + 0.03, 0);
        },

        sofa: ({ group, size = [2.3, 0.95] }) => {
            const [w, d] = size;
            box(group, M.linen, w, 0.3, d, 0, 0.24, 0);
            box(group, M.linen, w, 0.62, 0.2, 0, 0.55, -d / 2 + 0.1);
            [-1, 1].forEach((side) => {
                box(group, M.linen, 0.18, 0.44, d, side * (w / 2 - 0.09), 0.4, 0);
            });
            const seat = (w - 0.36) / 3;
            for (let i = 0; i < 3; i += 1) {
                const x = -w / 2 + 0.18 + seat * (i + 0.5);
                box(group, M.cream, seat - 0.02, 0.13, d - 0.26, x, 0.44, 0.06);
                box(group, M.cream, seat - 0.04, 0.3, 0.13, x, 0.63, -d / 2 + 0.26);
            }
            box(group, M.sage, 0.32, 0.3, 0.12, -w / 2 + 0.42, 0.62, -d / 2 + 0.3);
            box(group, M.taupe, 0.32, 0.3, 0.12, w / 2 - 0.42, 0.62, -d / 2 + 0.3);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                cyl(group, M.brass, 0.022, 0.12, sx * (w / 2 - 0.12), 0.06, sz * (d / 2 - 0.1));
            });
        },

        armchair: ({ group, small }) => {
            const w = small ? 0.78 : 0.9;
            const d = small ? 0.78 : 0.86;
            box(group, M.linen, w, 0.28, d, 0, 0.23, 0);
            box(group, M.linen, w, 0.56, 0.18, 0, 0.52, -d / 2 + 0.09);
            [-1, 1].forEach((side) => {
                box(group, M.linen, 0.15, 0.4, d, side * (w / 2 - 0.075), 0.38, 0);
            });
            box(group, M.cream, w - 0.32, 0.12, d - 0.24, 0, 0.42, 0.04);
            box(group, M.cream, w - 0.34, 0.28, 0.12, 0, 0.6, -d / 2 + 0.24);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                cyl(group, M.brass, 0.02, 0.1, sx * (w / 2 - 0.1), 0.05, sz * (d / 2 - 0.09));
            });
        },

        coffeeTable: ({ group, size = [1.15, 0.6] }) => {
            box(group, M.marble, size[0], 0.05, size[1], 0, 0.4, 0);
            box(group, M.oak, size[0] - 0.14, 0.03, size[1] - 0.1, 0, 0.14, 0);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                cyl(group, M.brass, 0.016, 0.4, sx * (size[0] / 2 - 0.06), 0.2, sz * (size[1] / 2 - 0.06));
            });
            box(group, M.sage, 0.22, 0.03, 0.16, -0.18, 0.44, 0.04);
            box(group, M.cream, 0.26, 0.02, 0.2, 0.12, 0.435, -0.02);
        },

        tvConsole: ({ group, size = [1.9, 0.42] }) => {
            box(group, M.oak, size[0], 0.42, size[1], 0, 0.28, 0);
            for (let i = 0; i < 3; i += 1) {
                box(group, M.cream, size[0] / 3 - 0.02, 0.32, 0.015, (i - 1) * (size[0] / 3), 0.28, size[1] / 2 + 0.008);
            }
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                box(group, M.oakDark, 0.04, 0.1, 0.04, sx * (size[0] / 2 - 0.08), 0.05, sz * (size[1] / 2 - 0.06));
            });
        },

        tv: ({ group }) => {
            box(group, M.black, 1.05, 0.6, 0.035, 0, 1.42, 0.02);
            box(group, M.black, 0.98, 0.53, 0.005, 0, 1.42, 0.04);
        },

        sideboard: ({ group, size = [1.25, 0.42] }) => {
            box(group, M.oak, size[0], 0.62, size[1], 0, 0.34, 0);
            [-1, 1].forEach((side) => {
                box(group, M.cream, size[0] / 2 - 0.03, 0.52, 0.015, side * size[0] / 4, 0.34, size[1] / 2 + 0.008);
            });
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                box(group, M.brass, 0.03, 0.18, 0.03, sx * (size[0] / 2 - 0.06), 0.09, sz * (size[1] / 2 - 0.06));
            });
        },

        diningTable: ({ group, size = [0.55] }) => {
            const radius = size[0];
            const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.045, 40), M.marble);
            top.position.y = 0.735;
            top.castShadow = true;
            top.receiveShadow = true;
            group.add(top);
            cyl(group, M.oak, 0.07, 0.72, 0, 0.36, 0);
            cyl(group, M.oak, 0.26, 0.03, 0, 0.015, 0);
            const vase = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), M.white);
            vase.scale.set(1, 1.15, 1);
            vase.position.set(0.02, 0.81, 0.02);
            vase.castShadow = true;
            group.add(vase);
        },

        chair: ({ group, small }) => {
            const w = small ? 0.4 : 0.44;
            box(group, M.oak, w, 0.045, w, 0, 0.45, 0);
            box(group, M.oak, w, small ? 0.36 : 0.42, 0.035, 0, small ? 0.66 : 0.69, -w / 2 + 0.02);
            box(group, M.cream, w - 0.06, 0.04, w - 0.06, 0, 0.475, 0.01);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                cyl(group, M.oakDark, 0.014, 0.45, sx * (w / 2 - 0.035), 0.225, sz * (w / 2 - 0.035));
            });
        },

        plant: ({ group, scale = 1 }) => {
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.3, 22), M.clay);
            pot.position.y = 0.15;
            pot.castShadow = true;
            pot.receiveShadow = true;
            group.add(pot);
            cyl(group, mat({ color: 0x6b5b45, roughness: 1 }), 0.14, 0.02, 0, 0.3, 0);
            const leaf = new THREE.SphereGeometry(0.5, 12, 8);
            for (let i = 0; i < 7; i += 1) {
                const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
                const height = 0.62 + Math.random() * 0.5;
                const reach = 0.16 + Math.random() * 0.16;
                const stem = cyl(
                    group, mat({ color: 0x6f7d5c, roughness: 1 }),
                    0.008, height - 0.3,
                    Math.cos(angle) * reach * 0.4, 0.3 + (height - 0.3) / 2, Math.sin(angle) * reach * 0.4,
                );
                stem.rotation.z = Math.cos(angle) * 0.24;
                stem.rotation.x = -Math.sin(angle) * 0.24;
                const blade = new THREE.Mesh(leaf, M.sage);
                blade.scale.set(0.3, 0.05, 0.2);
                blade.position.set(Math.cos(angle) * reach, height, Math.sin(angle) * reach);
                blade.rotation.y = -angle;
                blade.rotation.z = 0.35;
                blade.castShadow = true;
                group.add(blade);
            }
            group.scale.setScalar(scale);
        },

        floorLamp: ({ group }) => {
            cyl(group, M.brass, 0.15, 0.02, 0, 0.01, 0);
            cyl(group, M.brass, 0.011, 1.52, 0, 0.77, 0);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(0.4, 0.3, 0.4);
            shade.position.y = 1.6;
            shade.castShadow = false;
            group.add(shade);
            const light = new THREE.PointLight(0xffd8a6, 0.5, 3.2, 2);
            light.position.set(0, 1.55, 0);
            light.userData.base = 0.5;
            lamps.push(light);
            group.add(light);
        },

        pendant: ({ group, drop = 1.2, dim }) => {
            const ceilingY = PLAN.wallHeight;
            cyl(group, M.brass, 0.008, drop, 0, ceilingY - drop / 2, 0);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(dim ? 0.24 : 0.42, dim ? 0.2 : 0.26, dim ? 0.24 : 0.42);
            shade.position.y = ceilingY - drop - 0.08;
            group.add(shade);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), mat({
                color: 0xfff2d8, emissive: 0xffcf8a, emissiveIntensity: 1.4, roughness: 0.4,
            }));
            bulb.position.y = ceilingY - drop - 0.16;
            group.add(bulb);
            const light = new THREE.PointLight(0xffd9a8, dim ? 0.35 : 0.55, 4.5, 2);
            light.position.y = ceilingY - drop - 0.2;
            light.userData.base = dim ? 0.35 : 0.55;
            lamps.push(light);
            group.add(light);
        },

        mirror: ({ group, size = [0.9, 1.05] }) => {
            box(group, M.mirror, size[0], size[1], 0.02, 0, size[1] / 2 + 0.9, 0.01);
            const frame = 0.035;
            box(group, M.brass, size[0] + frame * 2, frame, 0.045, 0, size[1] + 0.9 + frame / 2, 0.012);
            box(group, M.brass, size[0] + frame * 2, frame, 0.045, 0, 0.9 - frame / 2, 0.012);
            box(group, M.brass, frame, size[1] + frame * 2, 0.045, -size[0] / 2 - frame / 2, size[1] / 2 + 0.9, 0.012);
            box(group, M.brass, frame, size[1] + frame * 2, 0.045, size[0] / 2 + frame / 2, size[1] / 2 + 0.9, 0.012);
        },

        console: ({ group, size = [1.2, 0.34] }) => {
            box(group, M.oak, size[0], 0.06, size[1], 0, 0.76, 0);
            box(group, M.oak, size[0], 0.2, size[1] - 0.04, 0, 0.62, 0);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                box(group, M.brass, 0.025, 0.52, 0.025, sx * (size[0] / 2 - 0.05), 0.26, sz * (size[1] / 2 - 0.05));
            });
            const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), M.clay);
            bowl.scale.set(1, 0.55, 1);
            bowl.position.set(-0.28, 0.85, 0);
            group.add(bowl);
        },

        runner: ({ group, size = [1, 1.3], tone }) => addRug(group, size, tone || 'taupe'),

        // Sheer panels. A single flat plane reads as a board, so the fabric is
        // built from alternating folds — enough to catch the light like cloth.
        curtain: ({ group, size = [0.6, 2.4] }) => {
            const [width, height] = size;
            const folds = 6;
            for (let i = 0; i < folds; i += 1) {
                const panel = box(
                    group, M.sheer,
                    width / folds + 0.02, height, 0.05 + (i % 2) * 0.03,
                    -width / 2 + (width / folds) * (i + 0.5), height / 2 + 0.03, (i % 2) * 0.018,
                );
                panel.castShadow = false;
            }
        },

        desk: ({ group, size = [1.05, 0.5] }) => {
            box(group, M.oak, size[0], 0.045, size[1], 0, 0.73, 0);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                cyl(group, M.oakDark, 0.016, 0.73, sx * (size[0] / 2 - 0.05), 0.365, sz * (size[1] / 2 - 0.05));
            });
            box(group, M.white, 0.26, 0.02, 0.19, 0.2, 0.76, 0);
            cyl(group, M.brass, 0.06, 0.16, -0.28, 0.84, -0.06);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(0.2, 0.14, 0.2);
            shade.position.set(-0.28, 0.94, -0.06);
            group.add(shade);
        },

        bench: ({ group, size = [1.4, 0.4] }) => {
            box(group, M.linen, size[0], 0.14, size[1], 0, 0.4, 0);
            box(group, M.sage, size[0] - 0.1, 0.03, size[1] - 0.06, 0, 0.48, 0);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                cyl(group, M.oakDark, 0.016, 0.33, sx * (size[0] / 2 - 0.06), 0.165, sz * (size[1] / 2 - 0.05));
            });
        },

        bistroTable: ({ group }) => {
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 32), M.marble);
            top.position.y = 0.72;
            top.castShadow = true;
            top.receiveShadow = true;
            group.add(top);
            cyl(group, M.black, 0.022, 0.7, 0, 0.35, 0);
            cyl(group, M.black, 0.2, 0.02, 0, 0.01, 0);
        },

        kitchen: ({ group, size = [3.5, 0.62] }) => {
            const [w, d] = size;
            box(group, M.cream, w, 0.86, d, 0, 0.43, 0);
            box(group, M.marble, w + 0.02, 0.05, d + 0.03, 0, 0.885, 0.01);
            // Door and drawer lines across the run.
            for (let i = 0; i < 5; i += 1) {
                box(group, M.cream, w / 5 - 0.03, 0.72, 0.012, -w / 2 + w / 10 + (i * w) / 5, 0.43, d / 2 + 0.006);
            }
            // Sink: a dark recess with a tap behind it.
            box(group, M.black, 0.55, 0.02, 0.4, -0.7, 0.9, 0);
            cyl(group, M.brass, 0.016, 0.26, -0.7, 1.02, -0.16);
            box(group, M.brass, 0.16, 0.016, 0.016, -0.63, 1.14, -0.16);
            // Hob: four burners.
            box(group, M.black, 0.62, 0.012, 0.5, 0.55, 0.912, 0);
            [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]].forEach(([bx, bz]) => {
                cyl(group, mat({ color: 0x1d1d1c, roughness: 0.4 }), 0.085, 0.006, 0.55 + bx, 0.92, bz);
            });
            // Upper run, hung off the wall.
            box(group, M.cream, w - 0.1, 0.72, 0.34, 0, 1.95, -0.12);
            box(group, M.oak, w - 0.1, 0.03, 0.36, 0, 1.58, -0.12);
            // Fridge at the east end.
            box(group, M.white, 0.66, 1.86, 0.68, w / 2 - 0.33, 0.93, 0.02);
            box(group, M.brass, 0.02, 0.5, 0.02, w / 2 - 0.62, 1.2, 0.37);
        },

        bathA: ({ group }) => {
            // Shower in the north-west corner, glass on two sides.
            box(group, M.white, 1.05, 0.05, 1.1, -0.4, 0.025, -0.5);
            const showerGlassA = box(group, M.glass, 0.012, 1.95, 1.1, 0.12, 0.98, -0.5);
            const showerGlassB = box(group, M.glass, 1.05, 1.95, 0.012, -0.4, 0.98, 0.05);
            showerGlassA.castShadow = false;
            showerGlassB.castShadow = false;
            box(group, M.brass, 0.02, 0.02, 0.02, 0.12, 1.0, 0.05);
            cyl(group, M.brass, 0.014, 0.2, -0.86, 2.05, -0.9);
            const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 18), M.brass);
            head.position.set(-0.86, 1.94, -0.9);
            group.add(head);
            // Vanity on the south wall.
            box(group, M.oak, 0.9, 0.46, 0.44, 0, 0.48, 0.62);
            box(group, M.marble, 0.94, 0.04, 0.46, 0, 0.73, 0.62);
            cyl(group, M.white, 0.16, 0.03, 0, 0.75, 0.62);
            cyl(group, M.brass, 0.013, 0.2, 0, 0.84, 0.44);
            box(group, M.mirror, 0.7, 0.8, 0.02, 0, 1.55, 0.83);
            // Toilet against the east wall.
            box(group, M.white, 0.36, 0.38, 0.56, 0.66, 0.19, -0.05);
            box(group, M.white, 0.36, 0.44, 0.16, 0.66, 0.6, -0.26);
            cyl(group, M.white, 0.17, 0.04, 0.66, 0.41, 0.02);
        },

        bathB: ({ group }) => {
            // Tub along the west wall.
            box(group, M.white, 0.78, 0.52, 1.5, -0.5, 0.26, 0);
            box(group, mat({ color: 0xe3eef1, roughness: 0.15 }), 0.64, 0.02, 1.34, -0.5, 0.47, 0);
            cyl(group, M.brass, 0.014, 0.24, -0.82, 0.56, -0.66);
            // Vanity.
            box(group, M.oak, 0.8, 0.46, 0.4, 0, 0.48, 0.56);
            box(group, M.marble, 0.84, 0.04, 0.42, 0, 0.73, 0.56);
            cyl(group, M.white, 0.14, 0.03, 0, 0.75, 0.56);
            cyl(group, M.brass, 0.012, 0.2, 0, 0.84, 0.4);
            box(group, M.mirror, 0.62, 0.72, 0.02, 0, 1.52, 0.77);
            // Toilet.
            box(group, M.white, 0.36, 0.38, 0.56, 0.62, 0.19, -0.2);
            box(group, M.white, 0.36, 0.44, 0.16, 0.62, 0.6, -0.41);
            cyl(group, M.white, 0.17, 0.04, 0.62, 0.41, -0.13);
        },
    };

    FURNITURE.forEach((item) => {
        const builder = builders[item.type];
        if (!builder) return;

        const group = new THREE.Group();
        group.position.set(item.at[0], 0, item.at[1]);
        group.rotation.y = (item.rot || 0) * DEG;
        furnitureGroup.add(group);

        builder({ group, size: item.size, scale: item.scale, tone: item.tone, small: item.small, drop: item.drop, dim: item.dim });
    });

    /* --- labels --------------------------------------------------------- */

    ROOMS.forEach((room) => {
        labels.push({
            id: room.id,
            name: room.name,
            latin: room.latin,
            area: room.area,
            position: new THREE.Vector3(room.label[0], 2.05, room.label[1]),
        });
    });

    /* --- teardown ------------------------------------------------------- */

    const dispose = function () {
        const materials = new Set();
        root.traverse((object) => {
            if (!object.isMesh) return;
            if (object.geometry && object.geometry !== BOX && object.geometry !== CYL && object.geometry !== CONE) {
                object.geometry.dispose();
            }
            const material = object.material;
            if (Array.isArray(material)) material.forEach((entry) => materials.add(entry));
            else if (material) materials.add(material);
        });
        materials.forEach((material) => {
            if (material.map) material.map.dispose();
            if (material.dispose) material.dispose();
        });
        BOX.dispose();
        CYL.dispose();
        CONE.dispose();
    };

    return { root, labels, lamps, furnitureGroup, ceiling, dispose };
}
