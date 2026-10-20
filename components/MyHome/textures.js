/**
 * Procedural surface textures.
 *
 * The page ships no image assets beyond the floor plan itself, so every
 * material is painted onto a canvas at runtime. That keeps the bundle small,
 * lets the oak and the marble be tuned to the palette, and means nothing has
 * to be fetched before the first frame is drawn.
 *
 * Each factory returns a `CanvasTexture` already set up for tiling; the size
 * in metres is returned alongside so the caller can compute `repeat` per
 * surface instead of guessing.
 */

const makeCanvas = function (size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
};

const toTexture = function (THREE, canvas, { repeat = 1, anisotropy = 4 } = {}) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    texture.repeat.set(repeat, repeat);
    return texture;
};

/* --- oak floor ---------------------------------------------------------- */

// Straight planks, long and narrow, laid in a running bond: the calm cousin of
// herringbone, and it tiles without a seam. The board colour drifts a little
// from plank to plank so the floor reads as timber rather than as a decal.
const drawParquet = function (ctx, size) {
    // 1024px = 2.4m, so 1m = 426.7px.
    const px = size / 2.4;
    const plankW = 0.2 * px;
    const plankL = 1.2 * px;
    const rows = Math.round(size / plankW);

    ctx.fillStyle = '#c9a87c';
    ctx.fillRect(0, 0, size, size);

    for (let row = 0; row < rows; row += 1) {
        const y = row * plankW;
        const offset = (row % 2) * (plankL / 2);
        for (let x = -plankL; x < size + plankL; x += plankL) {
            const left = x + offset;
            const tone = 0.9 + Math.random() * 0.2;
            const r = Math.round(201 * tone);
            const g = Math.round(168 * tone);
            const b = Math.round(124 * tone);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(left, y, plankL, plankW);

            // Grain: a few wandering lines that stay inside the board.
            ctx.strokeStyle = `rgba(120, 88, 54, ${0.05 + Math.random() * 0.06})`;
            ctx.lineWidth = 1;
            for (let line = 0; line < 3; line += 1) {
                const gy = y + plankW * (0.2 + Math.random() * 0.6);
                ctx.beginPath();
                ctx.moveTo(left + 4, gy);
                ctx.bezierCurveTo(
                    left + plankL * 0.35, gy + (Math.random() - 0.5) * 6,
                    left + plankL * 0.65, gy + (Math.random() - 0.5) * 6,
                    left + plankL - 4, gy + (Math.random() - 0.5) * 3,
                );
                ctx.stroke();
            }

            // Seam on the long edge only: the short edges are butt joints and
            // already read from the tone change.
            ctx.fillStyle = 'rgba(96, 68, 40, 0.16)';
            ctx.fillRect(left, y, plankL, 1);
        }
    }
};

/* --- marble ------------------------------------------------------------- */

const drawMarble = function (ctx, size) {
    ctx.fillStyle = '#f0ece4';
    ctx.fillRect(0, 0, size, size);

    // Soft grey clouding first, then the veins on top.
    for (let i = 0; i < 26; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = size * (0.05 + Math.random() * 0.16);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, 'rgba(196, 192, 184, 0.16)');
        gradient.addColorStop(1, 'rgba(196, 192, 184, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let vein = 0; vein < 14; vein += 1) {
        const startX = Math.random() * size;
        const startY = -20;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        let x = startX;
        let y = startY;
        const drift = (Math.random() - 0.5) * 0.9;
        for (let step = 0; step < 6; step += 1) {
            const nx = x + (Math.random() - 0.5) * size * 0.22 + drift * size * 0.1;
            const ny = y + size * 0.2;
            ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 40, y + size * 0.1, nx, ny);
            x = nx;
            y = ny;
        }
        ctx.strokeStyle = `rgba(150, 147, 138, ${0.1 + Math.random() * 0.16})`;
        ctx.lineWidth = 1 + Math.random() * 2.4;
        ctx.stroke();
    }
};

/* --- large-format stone (kitchen, bathrooms) ---------------------------- */

const drawTile = function (ctx, size) {
    // 512px = 1.2m, so two 0.6m tiles across.
    const half = size / 2;
    ctx.fillStyle = '#e9e4da';
    ctx.fillRect(0, 0, size, size);

    for (let ty = 0; ty < 2; ty += 1) {
        for (let tx = 0; tx < 2; tx += 1) {
            const x = tx * half;
            const y = ty * half;
            const tone = 0.985 + Math.random() * 0.03;
            ctx.fillStyle = `rgba(${Math.round(233 * tone)}, ${Math.round(228 * tone)}, ${Math.round(218 * tone)}, 1)`;
            ctx.fillRect(x, y, half, half);

            // Faint mottling, so a big pale tile is not a flat rectangle.
            for (let i = 0; i < 16; i += 1) {
                const cx = x + Math.random() * half;
                const cy = y + Math.random() * half;
                const r = 8 + Math.random() * 34;
                const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                gradient.addColorStop(0, 'rgba(203, 196, 183, 0.14)');
                gradient.addColorStop(1, 'rgba(203, 196, 183, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Grout: a hairline, not a stripe.
    ctx.strokeStyle = 'rgba(186, 179, 166, 0.85)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.stroke();
};

/* --- limestone (entrance, balcony) -------------------------------------- */

const drawStone = function (ctx, size) {
    ctx.fillStyle = '#ddd6ca';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 60; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 12 + Math.random() * 70;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `rgba(196, 186, 172, ${0.05 + Math.random() * 0.08})`);
        gradient.addColorStop(1, 'rgba(196, 186, 172, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Slab joints, 1.2m apart.
    ctx.strokeStyle = 'rgba(176, 167, 153, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
};

/* --- linen -------------------------------------------------------------- */

const drawLinen = function (ctx, size) {
    ctx.fillStyle = '#eee7da';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < size; i += 2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${i % 4 === 0 ? 0.14 : 0.06})`;
        ctx.fillRect(0, i, size, 1);
        ctx.fillStyle = `rgba(150, 138, 120, ${i % 4 === 0 ? 0.1 : 0.04})`;
        ctx.fillRect(i, 0, 1, size);
    }
};

/* --- rug ---------------------------------------------------------------- */

const drawRug = function (ctx, size) {
    ctx.fillStyle = '#e7ddcb';
    ctx.fillRect(0, 0, size, size);

    // Woven field: a fine cross-hatch, then a border a little darker than the
    // field so the rug has an edge without needing a pattern.
    for (let i = 0; i < size; i += 3) {
        ctx.fillStyle = 'rgba(190, 176, 152, 0.16)';
        ctx.fillRect(0, i, size, 1);
        ctx.fillRect(i, 0, 1, size);
    }

    ctx.strokeStyle = 'rgba(168, 150, 122, 0.55)';
    ctx.lineWidth = size * 0.022;
    ctx.strokeRect(size * 0.045, size * 0.045, size * 0.91, size * 0.91);
    ctx.lineWidth = size * 0.006;
    ctx.strokeRect(size * 0.085, size * 0.085, size * 0.83, size * 0.83);
};

/* --- public ------------------------------------------------------------- */

export const createTextures = function (THREE, { anisotropy = 4 } = {}) {
    const parquetCanvas = makeCanvas(1024);
    drawParquet(parquetCanvas.getContext('2d'), 1024);

    const marbleCanvas = makeCanvas(512);
    drawMarble(marbleCanvas.getContext('2d'), 512);

    const tileCanvas = makeCanvas(512);
    drawTile(tileCanvas.getContext('2d'), 512);

    const stoneCanvas = makeCanvas(512);
    drawStone(stoneCanvas.getContext('2d'), 512);

    const linenCanvas = makeCanvas(256);
    drawLinen(linenCanvas.getContext('2d'), 256);

    const rugCanvas = makeCanvas(512);
    drawRug(rugCanvas.getContext('2d'), 512);

    return {
        // The parquet canvas covers 2.4m, the rest 1.2m; the builders divide by
        // these when they set `repeat`.
        parquet: toTexture(THREE, parquetCanvas, { anisotropy }),
        parquetMetres: 2.4,
        marble: toTexture(THREE, marbleCanvas, { anisotropy }),
        marbleMetres: 1.2,
        tile: toTexture(THREE, tileCanvas, { anisotropy }),
        tileMetres: 1.2,
        stone: toTexture(THREE, stoneCanvas, { anisotropy }),
        stoneMetres: 1.2,
        linen: toTexture(THREE, linenCanvas, { anisotropy }),
        linenMetres: 0.6,
        rug: toTexture(THREE, rugCanvas, { anisotropy }),
    };
};
