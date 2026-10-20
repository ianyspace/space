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

// Muted, low-saturation versions of real material colours. Everything here is
// a few percent off white or a few percent off timber: the model is lit by a
// warm sun and a cool sky, and saturated base colours turn into plastic once
// that light is added on top.
const PALETTE = {
    wall: 0xeceae4,
    trim: 0xf6f4ee,
    ceiling: 0xf7f5f0,
    plinth: 0xc8c2b7,
    oak: 0xba9770,
    oakDark: 0x836247,
    linen: 0xe2dbcd,
    cream: 0xeee7d9,
    sage: 0x8d9a82,
    taupe: 0xa89c8c,
    clay: 0xb2795c,
    brass: 0xb09060,
    black: 0x2a2927,
    white: 0xf5f3ee,
    glass: 0xdfeaf0,
};

export function buildHome(THREE, { textures, RoundedBoxGeometry, anisotropy = 4 }) {
    const root = new THREE.Group();
    const labels = [];
    // Point lights added by the fittings, so the page can dim or lift them when
    // the light changes without walking the graph looking for lights.
    const lamps = [];

    /* --- shared geometry ------------------------------------------------ */

    const BOX = new THREE.BoxGeometry(1, 1, 1);
    const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    const CONE = new THREE.CylinderGeometry(0.5, 1, 1, 28, 1, true);
    // Unit sphere, scaled per use: pillows, cushions, bowls, foliage.
    const BLOB = new THREE.SphereGeometry(0.5, 20, 14);

    /* --- materials ------------------------------------------------------ */

    const mat = (params) => new THREE.MeshStandardMaterial(params);
    // Physical materials for everything the eye expects to be "made of"
    // something: sheen for cloth, clearcoat for varnished timber and polished
    // stone. This is most of the difference between a model and a rendering.
    const phys = (params) => new THREE.MeshPhysicalMaterial(params);

    // Cloth: a faint retroreflective rim where the weave turns away from the
    // light. Without it upholstery reads as painted wood.
    const cloth = (color, tint = 0xfff4e2) => phys({
        color,
        roughness: 0.88,
        sheen: 0.85,
        sheenRoughness: 0.62,
        sheenColor: new THREE.Color(tint),
    });

    // Varnished timber: a thin specular layer over a diffuse grain.
    const timber = (color, rough = 0.58) => phys({
        color,
        roughness: rough,
        clearcoat: 0.42,
        clearcoatRoughness: 0.38,
    });

    const M = {
        wall: phys({
            color: PALETTE.wall,
            roughness: 0.95,
            sheen: 0.25,
            sheenRoughness: 0.9,
            sheenColor: new THREE.Color(0xfdfbf6),
        }),
        trim: phys({ color: PALETTE.trim, roughness: 0.52, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
        ceiling: mat({ color: PALETTE.ceiling, roughness: 1 }),
        oak: timber(PALETTE.oak),
        oakDark: timber(PALETTE.oakDark, 0.62),
        linen: cloth(PALETTE.linen),
        cream: cloth(PALETTE.cream),
        sage: cloth(PALETTE.sage),
        taupe: cloth(PALETTE.taupe),
        clay: phys({ color: PALETTE.clay, roughness: 0.82, clearcoat: 0.18, clearcoatRoughness: 0.6 }),
        brass: phys({ color: PALETTE.brass, roughness: 0.24, metalness: 1 }),
        black: phys({ color: PALETTE.black, roughness: 0.42, metalness: 0.3 }),
        white: phys({ color: PALETTE.white, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
        mirror: phys({ color: 0xdfe7ea, roughness: 0.03, metalness: 1 }),
        marble: phys({
            map: textures.marble,
            roughness: 0.16,
            metalness: 0,
            clearcoat: 0.6,
            clearcoatRoughness: 0.12,
            envMapIntensity: 1.15,
        }),
        glass: new THREE.MeshPhysicalMaterial({
            color: PALETTE.glass,
            roughness: 0.03,
            metalness: 0,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
        sheer: phys({
            color: 0xf6f1e6,
            roughness: 1,
            sheen: 1,
            sheenRoughness: 0.5,
            sheenColor: new THREE.Color(0xfffaf0),
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false,
        }),
        lampShade: phys({
            color: 0xf2e7d3,
            roughness: 0.85,
            sheen: 0.6,
            sheenRoughness: 0.6,
            side: THREE.DoubleSide,
            emissive: 0xffd9a8,
            emissiveIntensity: 0.3,
        }),
    };

    const FLOOR_SOURCE = {
        parquet: {
            material: phys({
                map: textures.parquet,
                roughness: 0.48,
                clearcoat: 0.4,
                clearcoatRoughness: 0.32,
                envMapIntensity: 0.9,
            }),
            metres: textures.parquetMetres,
        },
        tile: {
            material: phys({
                map: textures.tile,
                roughness: 0.28,
                clearcoat: 0.45,
                clearcoatRoughness: 0.18,
                envMapIntensity: 1,
            }),
            metres: textures.tileMetres,
        },
        stone: {
            material: phys({ map: textures.stone, roughness: 0.58, envMapIntensity: 0.85 }),
            metres: textures.stoneMetres,
        },
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

    /* --- rounded geometry ----------------------------------------------- */

    // Real furniture has no sharp edges: every cushion, seat and carcase gets
    // a fillet. `RoundedBoxGeometry` has to be built per size, so the results
    // are cached — the apartment only uses a few dozen distinct blocks.
    const roundedCache = new Map();

    const roundedGeometry = function (w, h, d, radius) {
        const r = Math.max(0.0015, Math.min(radius, Math.min(w, h, d) / 2 - 0.0008));
        const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(4)}`;
        const hit = roundedCache.get(key);
        if (hit) return hit;

        // Two segments is plenty at this scale and keeps the vertex count sane.
        const geometry = new RoundedBoxGeometry(w, h, d, 2, r);
        geometry.userData.cached = key;
        roundedCache.set(key, geometry);
        return geometry;
    };

    /**
     * Rounded box placed by its centre, like `box`, but with a fillet picked
     * from the block's own proportions when the caller does not name one.
     */
    const rbox = function (parent, material, w, h, d, x, y, z, ry = 0, radius) {
        const r = radius == null ? Math.min(0.045, Math.min(w, h, d) * 0.16) : radius;
        const mesh = new THREE.Mesh(roundedGeometry(w, h, d, r), material);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    // A cushion: rounded, slightly squashed, and rotated a few degrees so a row
    // of them never looks machine-made.
    const cushion = function (parent, material, w, h, d, x, y, z, tilt = 0, ry = 0) {
        const mesh = rbox(parent, material, w, h, d, x, y, z, ry, Math.min(h, d) * 0.42);
        mesh.rotation.x = tilt;
        mesh.rotation.z = (Math.random() - 0.5) * 0.035;
        return mesh;
    };

    // A tapered cylinder: chair and table legs narrow towards the floor, which
    // is most of what stops furniture from looking extruded.
    const taperCache = new Map();
    const taperedGeometry = function (top, bottom, height) {
        const key = `${top.toFixed(4)}|${bottom.toFixed(4)}|${height.toFixed(4)}`;
        const hit = taperCache.get(key);
        if (hit) return hit;
        const geometry = new THREE.CylinderGeometry(top, bottom, height, 14);
        taperCache.set(key, geometry);
        return geometry;
    };

    const leg = function (parent, material, top, bottom, height, x, y, z) {
        const mesh = new THREE.Mesh(taperedGeometry(top, bottom, height), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    /* --- contact shadows ------------------------------------------------ */

    // An ambient-occlusion decal under each piece: the sun can only cast one
    // shadow, and a soft darkening where an object meets the floor is what
    // makes it look like it is actually standing on it.
    const contactCanvas = document.createElement('canvas');
    contactCanvas.width = 128;
    contactCanvas.height = 128;
    {
        const ctx = contactCanvas.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(60, 52, 42, 0.5)');
        gradient.addColorStop(0.55, 'rgba(60, 52, 42, 0.22)');
        gradient.addColorStop(1, 'rgba(60, 52, 42, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    }
    const contactTexture = new THREE.CanvasTexture(contactCanvas);
    const contactMaterial = new THREE.MeshBasicMaterial({
        map: contactTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
    });
    const CONTACT_PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

    const contact = function (parent, w, d, x = 0, z = 0) {
        const mesh = new THREE.Mesh(CONTACT_PLANE, contactMaterial);
        // A little larger than the footprint, and squashed along the short
        // axis so a narrow console does not get a round halo.
        mesh.scale.set(w * 1.28 + 0.1, 1, d * 1.28 + 0.1);
        mesh.position.set(x, 0.006, z);
        mesh.renderOrder = 1;
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
        root, mat({ color: PALETTE.plinth, roughness: 0.95 }),
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
        // Rugs stay grey-taupe. A warm rug under a warm sun turns orange and
        // pulls the eye straight off the furniture.
        const material = cloth({
            sand: 0xb9b0a0,
            taupe: 0xa79e91,
            cream: 0xd0c9bb,
        }[tone] || 0xc7bfb0, 0xffeeda);
        material.map = textures.rug;
        material.needsUpdate = true;
        // Fade the pile into the floor: a hard edge on a rug reads as a rug on
        // a table.
        const mesh = box(group, material, size[0], 0.014, size[1], 0, 0.009, 0);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        return mesh;
    };

    const builders = {
        rug: ({ group, size = [2, 3], tone = 'cream' }) => addRug(group, size, tone),

        bed: ({ group, size = [1.6, 2.05] }) => {
            const [w, l] = size;
            contact(group, w, l);
            // Plinth, then the mattress sitting inside it, then the bedding.
            rbox(group, M.oakDark, w + 0.06, 0.12, l + 0.06, 0, 0.06, 0, 0, 0.012);
            rbox(group, M.oak, w + 0.08, 0.2, l + 0.08, 0, 0.22, 0, 0, 0.012);
            rbox(group, M.white, w, 0.26, l - 0.04, 0, 0.42, 0.02, 0, 0.06);

            // Duvet: a soft slab over the lower two thirds, with the loose end
            // turned down over the foot of the bed.
            rbox(group, M.cream, w + 0.04, 0.14, l * 0.66, 0, 0.53, l * 0.15, 0, 0.05);
            const fold = rbox(group, M.cream, w + 0.04, 0.1, 0.3, 0, 0.5, l * 0.46, 0, 0.045);
            fold.rotation.x = -0.16;

            // A folded blanket across the foot.
            rbox(group, M.sage, w + 0.06, 0.06, 0.4, 0, 0.6, l * 0.36, 0, 0.028);

            // Headboard, upholstered and slightly reclined.
            const head = rbox(group, M.linen, w + 0.16, 1.0, 0.12, 0, 0.5, -l / 2 - 0.05, 0, 0.05);
            head.rotation.x = 0.05;

            // Pillows: squashed spheres, not boxes — a bed reads wrong the
            // moment its pillows have corners.
            [-1, 1].forEach((side) => {
                const pillow = new THREE.Mesh(BLOB, M.white);
                pillow.scale.set(w * 0.44, 0.15, 0.34);
                pillow.position.set(side * w * 0.24, 0.62, -l / 2 + 0.3);
                pillow.rotation.set(-0.12, 0, side * 0.04);
                pillow.castShadow = true;
                pillow.receiveShadow = true;
                group.add(pillow);
            });

            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.035, 0.028, 0.12, sx * (w / 2 - 0.08), 0.06, sz * (l / 2 - 0.08));
            });
        },

        nightstand: ({ group }) => {
            contact(group, 0.46, 0.42);
            rbox(group, M.oak, 0.46, 0.5, 0.42, 0, 0.27, 0, 0, 0.01);
            rbox(group, M.oakDark, 0.4, 0.16, 0.02, 0, 0.36, 0.215, 0, 0.006);
            const knob = new THREE.Mesh(BLOB, M.brass);
            knob.scale.setScalar(0.045);
            knob.position.set(0, 0.36, 0.235);
            group.add(knob);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.018, 0.014, 0.06, sx * 0.18, 0.03, sz * 0.16);
            });
            leg(group, M.brass, 0.008, 0.035, 0.26, 0, 0.64, 0);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(0.34, 0.26, 0.34);
            shade.position.set(0, 0.9, 0);
            shade.castShadow = false;
            group.add(shade);
        },

        wardrobe: ({ group, size = [1.8, 0.6] }) => {
            const [w, d] = size;
            const h = 2.32;
            contact(group, w, d);
            rbox(group, M.oak, w, h, d, 0, h / 2, 0, 0, 0.008);
            [-1, 1].forEach((side) => {
                rbox(group, M.cream, w / 2 - 0.02, h - 0.12, 0.02, side * (w / 4), h / 2, d / 2 + 0.011, 0, 0.006);
                const pull = rbox(group, M.brass, 0.018, 0.34, 0.026, side * 0.06, 1.15, d / 2 + 0.03, 0, 0.008);
                pull.rotation.x = 0;
            });
            rbox(group, M.oakDark, w + 0.04, 0.06, d + 0.02, 0, h + 0.03, 0, 0, 0.014);
        },

        sofa: ({ group, size = [2.3, 0.95] }) => {
            const [w, d] = size;
            contact(group, w, d);

            // Carcase: a low upholstered body, then arms that are visibly
            // softer than the frame — rounded, with a slight outward lean.
            rbox(group, M.linen, w, 0.28, d, 0, 0.23, 0, 0, 0.05);

            const back = rbox(group, M.linen, w, 0.6, 0.22, 0, 0.53, -d / 2 + 0.11, 0, 0.07);
            back.rotation.x = -0.06;

            [-1, 1].forEach((side) => {
                const arm = rbox(group, M.linen, 0.2, 0.42, d - 0.04, side * (w / 2 - 0.1), 0.42, 0.02, 0, 0.09);
                arm.rotation.z = side * 0.035;
            });

            // Three loose seat cushions, each slightly off-square.
            const seat = (w - 0.46) / 3;
            for (let i = 0; i < 3; i += 1) {
                const x = -w / 2 + 0.23 + seat * (i + 0.5);
                cushion(group, M.cream, seat - 0.02, 0.15, d - 0.3, x, 0.45, 0.07, 0.02);
                // Back cushion, leaning into the sofa back.
                cushion(group, M.cream, seat - 0.06, 0.34, 0.15, x, 0.66, -d / 2 + 0.25, -0.1);
            }

            // Two accent cushions, turned a little so they are not stacked flat.
            const toss = (material, x, tilt) => {
                const pillow = rbox(group, material, 0.34, 0.12, 0.32, x, 0.63, -d / 2 + 0.3, 0, 0.05);
                pillow.rotation.set(-0.5, tilt, tilt * 0.4);
            };
            toss(M.sage, -w / 2 + 0.44, 0.3);
            toss(M.taupe, w / 2 - 0.44, -0.3);

            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.024, 0.018, 0.12, sx * (w / 2 - 0.13), 0.06, sz * (d / 2 - 0.11));
            });
        },

        armchair: ({ group, small }) => {
            const w = small ? 0.78 : 0.9;
            const d = small ? 0.78 : 0.86;
            contact(group, w, d);

            rbox(group, M.linen, w, 0.26, d, 0, 0.22, 0, 0, 0.05);

            const back = rbox(group, M.linen, w, 0.54, 0.2, 0, 0.5, -d / 2 + 0.1, 0, 0.07);
            back.rotation.x = -0.07;

            [-1, 1].forEach((side) => {
                const arm = rbox(group, M.linen, 0.16, 0.38, d - 0.06, side * (w / 2 - 0.08), 0.39, 0.02, 0, 0.075);
                arm.rotation.z = side * 0.04;
            });

            cushion(group, M.cream, w - 0.34, 0.14, d - 0.28, 0, 0.43, 0.06, 0.02);

            const pillow = rbox(group, small ? M.taupe : M.sage, 0.31, 0.11, 0.3, 0.02, 0.61, -d / 2 + 0.26, 0, 0.045);
            pillow.rotation.set(-0.45, 0.22, 0.14);

            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.02, 0.015, 0.11, sx * (w / 2 - 0.11), 0.055, sz * (d / 2 - 0.1));
            });
        },

        coffeeTable: ({ group, size = [1.15, 0.6] }) => {
            contact(group, size[0], size[1]);
            rbox(group, M.marble, size[0], 0.05, size[1], 0, 0.4, 0, 0, 0.014);
            rbox(group, M.oak, size[0] - 0.14, 0.03, size[1] - 0.1, 0, 0.14, 0, 0, 0.008);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.brass, 0.014, 0.01, 0.4, sx * (size[0] / 2 - 0.06), 0.2, sz * (size[1] / 2 - 0.06));
            });
            // A book and a bowl, so the table looks used.
            rbox(group, M.sage, 0.22, 0.028, 0.16, -0.18, 0.442, 0.04, 0.18, 0.006);
            const bowl = new THREE.Mesh(BLOB, M.clay);
            bowl.scale.set(0.26, 0.11, 0.2);
            bowl.position.set(0.14, 0.47, -0.02);
            bowl.castShadow = true;
            group.add(bowl);
        },

        tvConsole: ({ group, size = [1.9, 0.42] }) => {
            contact(group, size[0], size[1]);
            rbox(group, M.oak, size[0], 0.42, size[1], 0, 0.3, 0, 0, 0.01);
            for (let i = 0; i < 3; i += 1) {
                rbox(group, M.cream, size[0] / 3 - 0.02, 0.32, 0.015, (i - 1) * (size[0] / 3), 0.3, size[1] / 2 + 0.008, 0, 0.005);
            }
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.018, 0.014, 0.12, sx * (size[0] / 2 - 0.08), 0.06, sz * (size[1] / 2 - 0.06));
            });
        },

        tv: ({ group }) => {
            rbox(group, M.black, 1.05, 0.6, 0.035, 0, 1.42, 0.02, 0, 0.008);
            rbox(group, M.black, 0.98, 0.53, 0.005, 0, 1.42, 0.042, 0, 0.002);
        },

        sideboard: ({ group, size = [1.25, 0.42] }) => {
            contact(group, size[0], size[1]);
            rbox(group, M.oak, size[0], 0.62, size[1], 0, 0.37, 0, 0, 0.012);
            [-1, 1].forEach((side) => {
                rbox(group, M.cream, size[0] / 2 - 0.03, 0.52, 0.015, side * size[0] / 4, 0.37, size[1] / 2 + 0.008, 0, 0.005);
            });
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.brass, 0.012, 0.009, 0.18, sx * (size[0] / 2 - 0.06), 0.09, sz * (size[1] / 2 - 0.06));
            });
        },

        diningTable: ({ group, size = [0.55] }) => {
            const radius = size[0];
            contact(group, radius * 2, radius * 2);
            // Chamfered top: a cylinder reads as a drum, so the edge is cut.
            const top = new THREE.Mesh(
                new THREE.CylinderGeometry(radius, radius * 0.98, 0.05, 48),
                M.marble,
            );
            top.position.y = 0.735;
            top.castShadow = true;
            top.receiveShadow = true;
            group.add(top);
            leg(group, M.oak, 0.06, 0.085, 0.71, 0, 0.355, 0);
            leg(group, M.oak, 0.26, 0.28, 0.03, 0, 0.015, 0);
            const vase = new THREE.Mesh(BLOB, M.white);
            vase.scale.set(0.17, 0.2, 0.17);
            vase.position.set(0.02, 0.82, 0.02);
            vase.castShadow = true;
            group.add(vase);
        },

        chair: ({ group, small }) => {
            const w = small ? 0.4 : 0.44;
            contact(group, w, w);
            rbox(group, M.oak, w, 0.045, w, 0, 0.45, 0, 0, 0.014);
            // Back: tapered uprights and a curved top rail instead of a plank.
            const h = small ? 0.36 : 0.42;
            [-1, 1].forEach((side) => {
                const post = leg(group, M.oak, 0.016, 0.02, h, side * (w / 2 - 0.03), 0.45 + h / 2, -w / 2 + 0.025);
                post.rotation.x = -0.05;
            });
            const rail = rbox(group, M.oak, w - 0.04, 0.07, 0.03, 0, 0.45 + h - 0.03, -w / 2 + 0.03, 0, 0.014);
            rail.rotation.x = -0.05;
            // A padded seat.
            rbox(group, M.cream, w - 0.05, 0.05, w - 0.05, 0, 0.495, 0.01, 0, 0.02);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.014, 0.01, 0.45, sx * (w / 2 - 0.04), 0.225, sz * (w / 2 - 0.04));
            });
        },

        plant: ({ group, scale = 1 }) => {
            contact(group, 0.34, 0.34);
            const soil = mat({ color: 0x5f5344, roughness: 1 });
            // Terracotta, tapered the way a real pot is.
            const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.115, 0.3, 26, 1), M.clay);
            pot.position.y = 0.15;
            pot.castShadow = true;
            pot.receiveShadow = true;
            group.add(pot);
            // Rim, so the pot has thickness at the top.
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.152, 0.03, 26, 1), M.clay);
            rim.position.y = 0.295;
            rim.castShadow = true;
            group.add(rim);
            cyl(group, soil, 0.142, 0.02, 0, 0.3, 0);

            const stemMaterial = mat({ color: 0x6f7d5c, roughness: 0.95 });
            const leafMaterial = phys({
                color: 0x7d8c68,
                roughness: 0.62,
                sheen: 0.5,
                sheenRoughness: 0.45,
                sheenColor: new THREE.Color(0xdfe8cf),
            });
            for (let i = 0; i < 9; i += 1) {
                const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
                const height = 0.6 + Math.random() * 0.55;
                const reach = 0.14 + Math.random() * 0.18;
                const stem = leg(
                    group, stemMaterial, 0.006, 0.009, height - 0.28,
                    Math.cos(angle) * reach * 0.35, 0.3 + (height - 0.3) / 2, Math.sin(angle) * reach * 0.35,
                );
                stem.rotation.z = Math.cos(angle) * 0.26;
                stem.rotation.x = -Math.sin(angle) * 0.26;
                // A blade: flat, tapered, and curving over at the tip.
                const blade = new THREE.Mesh(BLOB, leafMaterial);
                blade.scale.set(0.34, 0.03, 0.16);
                blade.position.set(Math.cos(angle) * reach, height, Math.sin(angle) * reach);
                blade.rotation.y = -angle;
                blade.rotation.z = 0.42 + Math.random() * 0.2;
                blade.castShadow = true;
                group.add(blade);
            }
            group.scale.setScalar(scale);
        },

        floorLamp: ({ group }) => {
            contact(group, 0.34, 0.34);
            leg(group, M.brass, 0.15, 0.155, 0.02, 0, 0.01, 0);
            leg(group, M.brass, 0.011, 0.014, 1.52, 0, 0.77, 0);
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
            leg(group, M.brass, 0.008, 0.008, drop, 0, ceilingY - drop / 2, 0);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(dim ? 0.24 : 0.42, dim ? 0.2 : 0.26, dim ? 0.24 : 0.42);
            shade.position.y = ceilingY - drop - 0.08;
            group.add(shade);
            const bulb = new THREE.Mesh(BLOB, mat({
                color: 0xfff2d8, emissive: 0xffcf8a, emissiveIntensity: 1.4, roughness: 0.4,
            }));
            bulb.scale.setScalar(0.09);
            bulb.position.y = ceilingY - drop - 0.16;
            group.add(bulb);
            const light = new THREE.PointLight(0xffd9a8, dim ? 0.35 : 0.55, 4.5, 2);
            light.position.y = ceilingY - drop - 0.2;
            light.userData.base = dim ? 0.35 : 0.55;
            lamps.push(light);
            group.add(light);
        },

        mirror: ({ group, size = [0.9, 1.05] }) => {
            const cy = size[1] / 2 + 0.9;
            rbox(group, M.mirror, size[0], size[1], 0.02, 0, cy, 0.01, 0, 0.008);
            const frame = 0.035;
            rbox(group, M.brass, size[0] + frame * 2, frame, 0.045, 0, cy + size[1] / 2 + frame / 2, 0.012, 0, 0.01);
            rbox(group, M.brass, size[0] + frame * 2, frame, 0.045, 0, cy - size[1] / 2 - frame / 2, 0.012, 0, 0.01);
            [-1, 1].forEach((side) => {
                rbox(group, M.brass, frame, size[1] + frame * 2, 0.045, side * (size[0] / 2 + frame / 2), cy, 0.012, 0, 0.01);
            });
        },

        console: ({ group, size = [1.2, 0.34] }) => {
            contact(group, size[0], size[1]);
            rbox(group, M.oak, size[0], 0.055, size[1], 0, 0.755, 0, 0, 0.012);
            rbox(group, M.oak, size[0], 0.2, size[1] - 0.04, 0, 0.62, 0, 0, 0.01);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.brass, 0.011, 0.008, 0.52, sx * (size[0] / 2 - 0.05), 0.26, sz * (size[1] / 2 - 0.05));
            });
            const bowl = new THREE.Mesh(BLOB, M.clay);
            bowl.scale.set(0.22, 0.12, 0.22);
            bowl.position.set(-0.28, 0.84, 0);
            bowl.castShadow = true;
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
            contact(group, size[0], size[1]);
            rbox(group, M.oak, size[0], 0.045, size[1], 0, 0.73, 0, 0, 0.012);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.014, 0.01, 0.73, sx * (size[0] / 2 - 0.05), 0.365, sz * (size[1] / 2 - 0.05));
            });
            rbox(group, M.white, 0.26, 0.018, 0.19, 0.2, 0.762, 0, 0.1, 0.004);
            leg(group, M.brass, 0.008, 0.03, 0.16, -0.28, 0.84, -0.06);
            const shade = new THREE.Mesh(CONE, M.lampShade);
            shade.scale.set(0.2, 0.14, 0.2);
            shade.position.set(-0.28, 0.94, -0.06);
            group.add(shade);
        },

        bench: ({ group, size = [1.4, 0.4] }) => {
            contact(group, size[0], size[1]);
            // A padded seat on a timber frame, not a slab.
            rbox(group, M.oak, size[0], 0.05, size[1] - 0.04, 0, 0.335, 0, 0, 0.01);
            rbox(group, M.linen, size[0] - 0.04, 0.13, size[1], 0, 0.42, 0, 0, 0.055);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                leg(group, M.oakDark, 0.016, 0.011, 0.33, sx * (size[0] / 2 - 0.06), 0.165, sz * (size[1] / 2 - 0.05));
            });
        },

        bistroTable: ({ group }) => {
            contact(group, 0.62, 0.62);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.33, 0.045, 40), M.marble);
            top.position.y = 0.72;
            top.castShadow = true;
            top.receiveShadow = true;
            group.add(top);
            leg(group, M.black, 0.018, 0.026, 0.7, 0, 0.35, 0);
            leg(group, M.black, 0.2, 0.21, 0.02, 0, 0.01, 0);
        },

        kitchen: ({ group, size = [3.5, 0.62] }) => {
            const [w, d] = size;
            contact(group, w, d);
            // Carcase, then a worktop with a slight overhang and a bullnose.
            rbox(group, M.cream, w, 0.86, d, 0, 0.43, 0, 0, 0.006);
            rbox(group, M.marble, w + 0.03, 0.055, d + 0.04, 0, 0.888, 0.01, 0, 0.016);
            // Shaker door fronts, recessed into the carcase.
            for (let i = 0; i < 5; i += 1) {
                rbox(group, M.cream, w / 5 - 0.035, 0.72, 0.014, -w / 2 + w / 10 + (i * w) / 5, 0.43, d / 2 + 0.007, 0, 0.005);
            }
            // Sink: an undermounted basin with a gooseneck tap.
            rbox(group, M.black, 0.55, 0.03, 0.4, -0.7, 0.892, 0, 0, 0.02);
            leg(group, M.brass, 0.014, 0.018, 0.26, -0.7, 1.02, -0.16);
            const spout = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20, Math.PI), M.brass);
            spout.position.set(-0.63, 1.14, -0.16);
            spout.rotation.set(Math.PI / 2, 0, 0);
            spout.castShadow = true;
            group.add(spout);
            // Hob: four burners on a glass-ceramic panel.
            rbox(group, M.black, 0.62, 0.014, 0.5, 0.55, 0.914, 0, 0, 0.006);
            const burner = phys({ color: 0x1d1d1c, roughness: 0.35, metalness: 0.4 });
            [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]].forEach(([bx, bz]) => {
                cyl(group, burner, 0.085, 0.006, 0.55 + bx, 0.922, bz);
            });
            // Upper run, hung off the wall.
            rbox(group, M.cream, w - 0.1, 0.72, 0.34, 0, 1.95, -0.12, 0, 0.006);
            rbox(group, M.oak, w - 0.1, 0.03, 0.36, 0, 1.58, -0.12, 0, 0.008);
            // Fridge, with a visible door gap and a handle.
            rbox(group, M.white, 0.66, 1.86, 0.68, w / 2 - 0.33, 0.93, 0.02, 0, 0.012);
            rbox(group, M.brass, 0.018, 0.5, 0.024, w / 2 - 0.62, 1.2, 0.37, 0, 0.008);
        },

        bathA: ({ group }) => {
            // Shower in the north-west corner, glass on two sides.
            rbox(group, M.white, 1.05, 0.05, 1.1, -0.4, 0.025, -0.5, 0, 0.016);
            const showerGlassA = box(group, M.glass, 0.012, 1.95, 1.1, 0.12, 0.98, -0.5);
            const showerGlassB = box(group, M.glass, 1.05, 1.95, 0.012, -0.4, 0.98, 0.05);
            showerGlassA.castShadow = false;
            showerGlassB.castShadow = false;
            leg(group, M.brass, 0.012, 0.016, 0.2, -0.86, 2.05, -0.9);
            const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.022, 22), M.brass);
            head.position.set(-0.86, 1.94, -0.9);
            head.castShadow = true;
            group.add(head);
            // Vanity: a floating cabinet with a basin on top.
            contact(group, 0.9, 0.44, 0, 0.62);
            rbox(group, M.oak, 0.9, 0.46, 0.44, 0, 0.48, 0.62, 0, 0.008);
            rbox(group, M.marble, 0.94, 0.045, 0.46, 0, 0.732, 0.62, 0, 0.014);
            const basin = new THREE.Mesh(BLOB, M.white);
            basin.scale.set(0.32, 0.1, 0.26);
            basin.position.set(0, 0.765, 0.62);
            basin.castShadow = true;
            group.add(basin);
            leg(group, M.brass, 0.011, 0.014, 0.2, 0, 0.84, 0.44);
            rbox(group, M.mirror, 0.7, 0.8, 0.02, 0, 1.55, 0.83, 0, 0.008);
            // Toilet: a rounded bowl and cistern rather than two boxes.
            const bowl = new THREE.Mesh(BLOB, M.white);
            bowl.scale.set(0.34, 0.36, 0.52);
            bowl.position.set(0.66, 0.22, -0.05);
            bowl.castShadow = true;
            bowl.receiveShadow = true;
            group.add(bowl);
            rbox(group, M.white, 0.36, 0.44, 0.16, 0.66, 0.6, -0.26, 0, 0.03);
            cyl(group, M.white, 0.17, 0.04, 0.66, 0.41, 0.02);
        },

        bathB: ({ group }) => {
            // Tub: a rounded shell with the water surface inside it.
            contact(group, 0.78, 1.5, -0.5, 0);
            rbox(group, M.white, 0.78, 0.52, 1.5, -0.5, 0.26, 0, 0, 0.06);
            rbox(group, phys({ color: 0xdfeaee, roughness: 0.08, metalness: 0.1, clearcoat: 1 }), 0.64, 0.02, 1.34, -0.5, 0.47, 0, 0, 0.008);
            leg(group, M.brass, 0.011, 0.014, 0.24, -0.82, 0.56, -0.66);
            // Vanity.
            contact(group, 0.8, 0.4, 0, 0.56);
            rbox(group, M.oak, 0.8, 0.46, 0.4, 0, 0.48, 0.56, 0, 0.008);
            rbox(group, M.marble, 0.84, 0.045, 0.42, 0, 0.732, 0.56, 0, 0.014);
            const basin = new THREE.Mesh(BLOB, M.white);
            basin.scale.set(0.28, 0.09, 0.24);
            basin.position.set(0, 0.765, 0.56);
            basin.castShadow = true;
            group.add(basin);
            leg(group, M.brass, 0.01, 0.013, 0.2, 0, 0.84, 0.4);
            rbox(group, M.mirror, 0.62, 0.72, 0.02, 0, 1.52, 0.77, 0, 0.008);
            // Toilet.
            const bowl = new THREE.Mesh(BLOB, M.white);
            bowl.scale.set(0.34, 0.36, 0.52);
            bowl.position.set(0.62, 0.22, -0.2);
            bowl.castShadow = true;
            bowl.receiveShadow = true;
            group.add(bowl);
            rbox(group, M.white, 0.36, 0.44, 0.16, 0.62, 0.6, -0.41, 0, 0.03);
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
        const shared = new Set([BOX, CYL, CONE, BLOB, CONTACT_PLANE]);
        root.traverse((object) => {
            if (!object.isMesh) return;
            // Cached geometries are disposed with their caches below; the four
            // shared primitives once, at the end.
            if (object.geometry && !shared.has(object.geometry) && !object.geometry.userData.cached) {
                object.geometry.dispose();
            }
            const material = object.material;
            if (Array.isArray(material)) material.forEach((entry) => materials.add(entry));
            else if (material) materials.add(material);
        });
        roundedCache.forEach((geometry) => geometry.dispose());
        roundedCache.clear();
        taperCache.forEach((geometry) => geometry.dispose());
        taperCache.clear();
        materials.forEach((material) => {
            if (material.map) material.map.dispose();
            if (material.dispose) material.dispose();
        });
        contactTexture.dispose();
        BOX.dispose();
        CYL.dispose();
        CONE.dispose();
        BLOB.dispose();
        CONTACT_PLANE.dispose();
    };

    return { root, labels, lamps, furnitureGroup, ceiling, dispose };
}
