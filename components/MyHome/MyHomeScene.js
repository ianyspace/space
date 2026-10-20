import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { useLang } from 'context/LanguageContext';
import withBasePath from 'utils/basePath';

import { ROOMS, VIEWS, CENTER, canStandAt } from './plan';
import styles from './MyHomeScene.module.scss';

// The outline panel: the overview first, then the rooms worth visiting. The
// corridor is a room in the model but not a place anyone wants a camera in.
const OVERVIEW = { id: 'overview', name: '全貌', latin: 'Overview', area: null };
const ROOM_LIST = [OVERVIEW].concat(
    ROOMS.filter((room) => room.id !== 'corridor').map((room) => ({
        id: room.id,
        name: room.name,
        latin: room.latin,
        area: room.area,
    })),
);

const MyHomeScene = function () {
    const { homeLink } = useLang();
    const hostRef = useRef(null);
    const canvasRef = useRef(null);
    const labelEls = useRef({});
    const apiRef = useRef(null);

    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [active, setActive] = useState('overview');
    const [walking, setWalking] = useState(false);
    const [showFurniture, setShowFurniture] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [showPlan, setShowPlan] = useState(false);
    const [mode, setMode] = useState('day');

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return undefined;

        let disposed = false;
        let frame = 0;
        let teardown = () => {};

        (async () => {
            try {
                const THREE = await import('three');
                const [{ buildHome }, { createTextures }, { OrbitControls }] = await Promise.all([
                    import('./buildHome'),
                    import('./textures'),
                    import('three/addons/controls/OrbitControls.js'),
                ]);
                if (disposed) return;

                /* --- renderer / scene / camera -------------------------- */

                const renderer = new THREE.WebGLRenderer({
                    canvas,
                    antialias: true,
                    powerPreference: 'high-performance',
                });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 0.98;

                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf2eee6);

                const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160);
                camera.rotation.order = 'YXZ';

                const controls = new OrbitControls(camera, canvas);
                controls.enableDamping = true;
                controls.dampingFactor = 0.075;
                controls.minDistance = 1.6;
                controls.maxDistance = 34;
                controls.maxPolarAngle = Math.PI / 2 - 0.03;
                controls.zoomSpeed = 0.8;
                controls.panSpeed = 0.6;

                /* --- environment --------------------------------------- */

                // A vertical sky-to-floor gradient used as the IBL source: no
                // HDRI to fetch, and it still gives brass and marble something
                // soft to reflect.
                const envCanvas = document.createElement('canvas');
                envCanvas.width = 32;
                envCanvas.height = 256;
                const envCtx = envCanvas.getContext('2d');
                const envGradient = envCtx.createLinearGradient(0, 0, 0, 256);
                envGradient.addColorStop(0, '#dbe7f1');
                envGradient.addColorStop(0.46, '#f7f3eb');
                envGradient.addColorStop(0.56, '#efe5d4');
                envGradient.addColorStop(1, '#c9bda8');
                envCtx.fillStyle = envGradient;
                envCtx.fillRect(0, 0, 32, 256);
                const envTexture = new THREE.CanvasTexture(envCanvas);
                envTexture.mapping = THREE.EquirectangularReflectionMapping;
                envTexture.colorSpace = THREE.SRGBColorSpace;
                scene.environment = envTexture;
                scene.environmentIntensity = 0.55;

                /* --- lights -------------------------------------------- */

                const hemi = new THREE.HemisphereLight(0xeef4f8, 0xd8cbb6, 0.45);
                scene.add(hemi);

                const sun = new THREE.DirectionalLight(0xfff3df, 2.8);
                sun.position.set(4.5, 12.5, 11.5);
                sun.castShadow = true;
                sun.shadow.mapSize.set(2048, 2048);
                sun.shadow.bias = -0.0004;
                sun.shadow.normalBias = 0.028;
                sun.shadow.camera.left = -10;
                sun.shadow.camera.right = 10;
                sun.shadow.camera.top = 10;
                sun.shadow.camera.bottom = -10;
                sun.shadow.camera.near = 1;
                sun.shadow.camera.far = 42;
                sun.shadow.camera.updateProjectionMatrix();
                scene.add(sun);
                scene.add(sun.target);

                // Cool bounce from the north, so the shaded side of every room
                // still reads as a room rather than a black hole.
                const fill = new THREE.DirectionalLight(0xdfe9f4, 0.4);
                fill.position.set(-7, 7, -9);
                scene.add(fill);

                /* --- the apartment ------------------------------------- */

                const textures = createTextures(THREE, {
                    anisotropy: Math.min(renderer.capabilities.getMaxAnisotropy(), 8),
                });
                const home = buildHome(THREE, { textures });
                home.root.position.set(-CENTER[0], 0, -CENTER[1]);
                scene.add(home.root);

                /* --- camera moves -------------------------------------- */

                const toWorld = (point) => new THREE.Vector3(
                    point[0] - CENTER[0],
                    point[1],
                    point[2] - CENTER[1],
                );

                const tween = {
                    active: false,
                    t: 0,
                    duration: 1.15,
                    fromPos: new THREE.Vector3(),
                    fromTarget: new THREE.Vector3(),
                    toPos: new THREE.Vector3(),
                    toTarget: new THREE.Vector3(),
                };

                const overview = VIEWS.overview;
                camera.position.copy(toWorld(overview.pos));
                controls.target.copy(toWorld(overview.target));
                controls.update();

                const goTo = function (name) {
                    const view = VIEWS[name] || VIEWS.overview;
                    if (walk.active) exitWalk();

                    tween.fromPos.copy(camera.position);
                    tween.fromTarget.copy(controls.target);
                    tween.toPos.copy(toWorld(view.pos));
                    tween.toTarget.copy(toWorld(view.target));
                    tween.t = 0;
                    tween.duration = 1.2;
                    tween.active = true;
                    controls.enabled = false;
                };

                const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

                /* --- walk mode ----------------------------------------- */

                const EYE_HEIGHT = 1.62;
                const walk = {
                    active: false,
                    yaw: Math.PI,
                    pitch: -0.02,
                    x: 5.9,
                    z: 5.2,
                    dragging: false,
                };
                const keys = new Set();

                const enterWalk = function () {
                    tween.active = false;
                    controls.enabled = false;
                    walk.active = true;
                    walk.x = 5.9;
                    walk.z = 5.2;
                    walk.yaw = Math.PI;
                    walk.pitch = -0.02;
                    camera.position.set(walk.x - CENTER[0], EYE_HEIGHT, walk.z - CENTER[1]);
                    camera.rotation.set(walk.pitch, walk.yaw, 0);
                    setWalking(true);
                    if (canvas.requestPointerLock) {
                        const request = canvas.requestPointerLock();
                        if (request && typeof request.catch === 'function') request.catch(() => { });
                    }
                };

                const exitWalk = function () {
                    if (!walk.active) return;
                    walk.active = false;
                    walk.dragging = false;
                    keys.clear();
                    if (document.pointerLockElement === canvas) document.exitPointerLock();
                    controls.enabled = true;
                    const direction = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
                    controls.target.copy(camera.position).addScaledVector(direction, 3.2);
                    controls.update();
                    setWalking(false);
                };

                const moveBy = function (dx, dz) {
                    const nx = walk.x + dx;
                    const nz = walk.z + dz;
                    if (canStandAt(nx, nz)) {
                        walk.x = nx;
                        walk.z = nz;
                        return;
                    }
                    if (canStandAt(nx, walk.z)) {
                        walk.x = nx;
                        return;
                    }
                    if (canStandAt(walk.x, nz)) walk.z = nz;
                };

                const updateWalk = function (dt) {
                    const forwardX = -Math.sin(walk.yaw);
                    const forwardZ = -Math.cos(walk.yaw);
                    const rightX = Math.cos(walk.yaw);
                    const rightZ = -Math.sin(walk.yaw);

                    let mx = 0;
                    let mz = 0;
                    if (keys.has('KeyW') || keys.has('ArrowUp')) {
                        mx += forwardX;
                        mz += forwardZ;
                    }
                    if (keys.has('KeyS') || keys.has('ArrowDown')) {
                        mx -= forwardX;
                        mz -= forwardZ;
                    }
                    if (keys.has('KeyD') || keys.has('ArrowRight')) {
                        mx += rightX;
                        mz += rightZ;
                    }
                    if (keys.has('KeyA') || keys.has('ArrowLeft')) {
                        mx -= rightX;
                        mz -= rightZ;
                    }

                    if (mx || mz) {
                        const length = Math.hypot(mx, mz);
                        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3.2 : 1.85;
                        moveBy((mx / length) * speed * dt, (mz / length) * speed * dt);
                    }

                    camera.position.set(walk.x - CENTER[0], EYE_HEIGHT, walk.z - CENTER[1]);
                    camera.rotation.set(walk.pitch, walk.yaw, 0);
                };

                const onKeyDown = function (event) {
                    if (!walk.active) return;
                    if (event.code === 'Escape') {
                        exitWalk();
                        return;
                    }
                    keys.add(event.code);
                    if (event.code.startsWith('Arrow')) event.preventDefault();
                };
                const onKeyUp = (event) => keys.delete(event.code);

                const onMouseMove = function (event) {
                    if (!walk.active) return;
                    const locked = document.pointerLockElement === canvas;
                    if (!locked && !walk.dragging) return;
                    walk.yaw -= event.movementX * 0.0022;
                    walk.pitch -= event.movementY * 0.0022;
                    walk.pitch = Math.max(-1.1, Math.min(1.1, walk.pitch));
                };

                const onPointerDown = function () {
                    if (tween.active) {
                        tween.active = false;
                        controls.enabled = true;
                    }
                    if (walk.active) walk.dragging = true;
                };
                const onPointerUp = () => { walk.dragging = false; };

                const onLockChange = function () {
                    if (walk.active && document.pointerLockElement !== canvas) exitWalk();
                };

                /* --- light presets ------------------------------------- */

                const applyMode = function (value) {
                    if (value === 'dusk') {
                        sun.intensity = 1.05;
                        sun.color.setHex(0xffb47a);
                        hemi.intensity = 0.3;
                        hemi.color.setHex(0xe9dcc9);
                        scene.background.setHex(0xe4d5c2);
                        renderer.toneMappingExposure = 1.1;
                        home.lamps.forEach((lamp) => {
                            lamp.intensity = (lamp.userData.base || 0.4) * 2.4;
                        });
                    } else {
                        sun.intensity = 2.5;
                        sun.color.setHex(0xfff3df);
                        hemi.intensity = 0.55;
                        hemi.color.setHex(0xeef4f8);
                        scene.background.setHex(0xf2eee6);
                        renderer.toneMappingExposure = 1.02;
                        home.lamps.forEach((lamp) => {
                            lamp.intensity = lamp.userData.base || 0.4;
                        });
                    }
                };

                /* --- sizing -------------------------------------------- */

                const resize = function () {
                    const width = host.clientWidth || 1;
                    const height = host.clientHeight || 1;
                    renderer.setSize(width, height, false);
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                };
                const observer = new ResizeObserver(resize);
                observer.observe(host);
                resize();

                /* --- labels -------------------------------------------- */

                const projected = new THREE.Vector3();
                const updateLabels = function () {
                    const width = host.clientWidth || 1;
                    const height = host.clientHeight || 1;
                    home.labels.forEach((label) => {
                        const element = labelEls.current[label.id];
                        if (!element) return;
                        projected.copy(label.position).add(home.root.position).project(camera);
                        const inFront = projected.z < 1;
                        const x = (projected.x * 0.5 + 0.5) * width;
                        const y = (-projected.y * 0.5 + 0.5) * height;
                        element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
                        element.style.opacity = inFront ? '1' : '0';
                    });
                };

                /* --- loop ---------------------------------------------- */

                const clock = new THREE.Clock();
                const render = function () {
                    frame = requestAnimationFrame(render);
                    const dt = Math.min(clock.getDelta(), 0.05);

                    if (tween.active) {
                        tween.t = Math.min(1, tween.t + dt / tween.duration);
                        const eased = ease(tween.t);
                        camera.position.lerpVectors(tween.fromPos, tween.toPos, eased);
                        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, eased);
                        camera.lookAt(controls.target);
                        if (tween.t >= 1) {
                            tween.active = false;
                            controls.enabled = true;
                        }
                    } else if (walk.active) {
                        updateWalk(dt);
                    } else {
                        controls.update();
                    }

                    // The roof lifts away as soon as the camera rises above it,
                    // so the dollhouse view never looks into a closed box.
                    home.ceiling.visible = camera.position.y < 2.3;

                    renderer.render(scene, camera);
                    updateLabels();
                };

                /* --- wiring -------------------------------------------- */

                apiRef.current = {
                    goTo,
                    enterWalk,
                    exitWalk,
                    setFurniture: (on) => { home.furnitureGroup.visible = on; },
                    setMode: applyMode,
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('pointerlockchange', onLockChange);
                window.addEventListener('keydown', onKeyDown);
                window.addEventListener('keyup', onKeyUp);
                canvas.addEventListener('pointerdown', onPointerDown);
                window.addEventListener('pointerup', onPointerUp);

                // `?room=living` opens straight into a room, so a view can be
                // linked to without asking the reader to orbit there first.
                const requested = new URLSearchParams(window.location.search).get('room');
                if (requested && VIEWS[requested]) {
                    camera.position.copy(toWorld(VIEWS[requested].pos));
                    controls.target.copy(toWorld(VIEWS[requested].target));
                    controls.update();
                    setActive(requested);
                } else {
                    // A short push-in on arrival, so the model settles instead
                    // of simply appearing.
                    camera.position.copy(toWorld(overview.pos)).multiplyScalar(1.12);
                    camera.position.y = toWorld(overview.pos).y * 1.16;
                    controls.target.copy(toWorld(overview.target));
                    goTo('overview');
                    tween.duration = 2;
                    tween.t = 0.02;
                }

                render();
                setReady(true);

                teardown = function () {
                    cancelAnimationFrame(frame);
                    observer.disconnect();
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('pointerlockchange', onLockChange);
                    window.removeEventListener('keydown', onKeyDown);
                    window.removeEventListener('keyup', onKeyUp);
                    canvas.removeEventListener('pointerdown', onPointerDown);
                    window.removeEventListener('pointerup', onPointerUp);
                    if (document.pointerLockElement === canvas) document.exitPointerLock();
                    apiRef.current = null;
                    home.dispose();
                    envTexture.dispose();
                    controls.dispose();
                    renderer.dispose();
                };

                if (disposed) teardown();
            } catch (err) {
                console.error('[my-home] failed to build the scene', err);
                if (!disposed) setFailed(true);
            }
        })();

        return () => {
            disposed = true;
            teardown();
        };
    }, []);

    useEffect(() => {
        if (apiRef.current) apiRef.current.setFurniture(showFurniture);
    }, [showFurniture]);

    useEffect(() => {
        if (apiRef.current) apiRef.current.setMode(mode);
    }, [mode]);

    const chooseRoom = useCallback((id) => {
        setActive(id);
        if (apiRef.current) apiRef.current.goTo(id);
    }, []);

    const toggleWalk = useCallback(() => {
        if (!apiRef.current) return;
        if (walking) apiRef.current.exitWalk();
        else apiRef.current.enterWalk();
    }, [walking]);

    return (
        <div className={styles.page}>
            <div className={styles.stage} ref={hostRef}>
                <canvas ref={canvasRef} className={styles.canvas} />

                <div
                    className={styles.labels}
                    data-hidden={!showLabels || walking}
                    aria-hidden={!showLabels || walking}
                >
                    {ROOMS.map((room) => (
                        <button
                            type="button"
                            key={room.id}
                            className={styles.label}
                            data-active={active === room.id}
                            ref={(element) => { labelEls.current[room.id] = element; }}
                            onClick={() => chooseRoom(room.id)}
                        >
                            <span className={styles['label-name']}>{room.name}</span>
                            {room.area ? (
                                <span className={styles['label-area']}>{room.area}㎡</span>
                            ) : null}
                        </button>
                    ))}
                </div>

                {!ready && !failed && (
                    <div className={styles.loader}>
                        <span className={styles['loader-text']}>正在布置房间</span>
                        <span className={styles['loader-bar']} />
                    </div>
                )}

                {failed && (
                    <div className={styles.fallback}>
                        <p>这台设备的浏览器没能启用 WebGL，先看平面图吧。</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={withBasePath('/my-home/plan.jpg')} alt="户型平面图" />
                    </div>
                )}
            </div>

            <header className={styles.head}>
                <Link href={homeLink || '/'} className={styles.brand}>
                    <span className={styles['brand-mark']}>ANYSPACE</span>
                    <span className={styles['brand-rule']} />
                    <span className={styles['brand-title']}>My Home</span>
                </Link>
                <div className={styles.meta}>
                    <span>三室两厅两卫</span>
                    <span className={styles.dot} />
                    <span>约 93 ㎡</span>
                    <span className={styles.dot} />
                    <span>9.72 × 12.03 m</span>
                </div>
            </header>

            <aside className={styles.panel}>
                <p className={styles.eyebrow}>Plan / 户型</p>
                <h1 className={styles.title}>
                    法式简洁
                    <span>French minimal</span>
                </h1>
                <ul className={styles.rooms}>
                    {ROOM_LIST.map((room) => (
                        <li key={room.id}>
                            <button
                                type="button"
                                className={styles.room}
                                data-active={active === room.id}
                                onClick={() => chooseRoom(room.id)}
                            >
                                <span className={styles['room-name']}>{room.name}</span>
                                <span className={styles['room-latin']}>{room.latin}</span>
                                <span className={styles['room-area']}>
                                    {room.area ? `${room.area}㎡` : '—'}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            <div className={styles.tools}>
                <div className={styles.group} role="group" aria-label="光线">
                    <button type="button" data-on={mode === 'day'} onClick={() => setMode('day')}>
                        日光
                    </button>
                    <button type="button" data-on={mode === 'dusk'} onClick={() => setMode('dusk')}>
                        黄昏
                    </button>
                </div>
                <button type="button" data-on={showFurniture} onClick={() => setShowFurniture((on) => !on)}>
                    家具
                </button>
                <button type="button" data-on={showLabels} onClick={() => setShowLabels((on) => !on)}>
                    标注
                </button>
                <button type="button" data-on={showPlan} onClick={() => setShowPlan((on) => !on)}>
                    平面图
                </button>
                <button type="button" data-on={walking} onClick={toggleWalk}>
                    {walking ? '退出漫游' : '漫游'}
                </button>
            </div>

            {showPlan && (
                <figure className={styles.plan}>
                    <button
                        type="button"
                        className={styles['plan-close']}
                        onClick={() => setShowPlan(false)}
                        aria-label="关闭平面图"
                    >
                        ×
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={withBasePath('/my-home/plan.jpg')} alt="户型平面图" />
                    <figcaption>原始户型图</figcaption>
                </figure>
            )}

            <p className={styles.hint}>
                {walking
                    ? 'W A S D 移动 · 鼠标环视 · Esc 退出'
                    : '拖动旋转 · 滚轮缩放 · 点房间名进入'}
            </p>
        </div>
    );
};

export default MyHomeScene;
