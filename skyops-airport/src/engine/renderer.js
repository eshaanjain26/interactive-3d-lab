// SkyOps engine: renderer, scene, camera, post-processing, main loop, picking, adaptive quality.
SK.engine = (function () {
  const E = {};
  const host = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.8, 4000);
  camera.position.set(150, 150, 190);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.47;
  controls.minDistance = 4;
  controls.maxDistance = 1100;
  controls.screenSpacePanning = false;
  controls.keyPanSpeed = 22;

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.35, 0.5, 0.86);
  composer.addPass(bloom);

  E.renderer = renderer; E.scene = scene; E.camera = camera; E.controls = controls; E.bloom = bloom; E.host = host;
  E.quality = { level: 3, bloom: true, shadows: true };

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // ---------- picking ----------
  // add(object, entryId | (hit) => {entry, target}) ; instanced meshes resolve by instanceId
  const pickables = [];
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  E.pick = {
    add(obj, resolver) { obj.userData.pick = resolver; pickables.push(obj); },
    remove(obj) { const i = pickables.indexOf(obj); if (i >= 0) pickables.splice(i, 1); },
    at(clientX, clientY) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(pickables.filter((o) => o.visible && isShown(o)), true);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData.pick) o = o.parent;
        if (!o) continue;
        const p = o.userData.pick;
        const res = typeof p === 'function' ? p(h) : { entry: p };
        if (res) return Object.assign({ point: h.point }, res);
      }
      return null;
    },
  };
  function isShown(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

  // click vs drag: only treat as a click if the pointer barely moved
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < 6 && performance.now() - down.t < 500) SK.bus.emit('click', { x: e.clientX, y: e.clientY, hit: E.pick.at(e.clientX, e.clientY) });
    down = null;
  });

  // ---------- loop ----------
  const updaters = [];   // fn(dtGame, dtReal, now)
  E.onFrame = (fn) => updaters.push(fn);
  E.speed = 1;
  E.paused = false;
  const clock = new THREE.Clock();
  let fpsAcc = 0, fpsFrames = 0, fpsAvg = 60, lowFor = 0, highFor = 0;
  E.fps = () => fpsAvg;

  function setQuality(level) {
    E.quality.level = level;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(level >= 3 ? pr : level === 2 ? Math.min(pr, 1.25) : 1);
    E.quality.shadows = level >= 2;
    E.quality.bloom = level >= 1 && !E.reducedMotionBloomOff;
    bloom.enabled = E.quality.bloom;
    SK.bus.emit('quality', level);
    resize();
  }
  E.setQuality = setQuality;

  function frame() {
    requestAnimationFrame(frame);
    E.tick(Math.min(clock.getDelta(), 0.1));
  }
  // one frame of work; also callable directly (headless checks, screenshots while the tab is hidden)
  E.tick = function (dtReal) {
    const dtGame = E.paused ? 0 : dtReal * E.speed;
    for (const fn of updaters) fn(dtGame, dtReal);
    controls.update();
    if (E.sun) E.sun.castShadow = E.quality.shadows;
    if (E.quality.bloom) composer.render(); else renderer.render(scene, camera);

    fpsAcc += dtReal; fpsFrames++;
    if (fpsAcc >= 1) {
      fpsAvg = fpsFrames / fpsAcc; fpsAcc = 0; fpsFrames = 0;
      // adaptive quality: step down after ~3 s under 38 fps, back up after ~8 s over 55 fps
      if (fpsAvg < 38) { lowFor++; highFor = 0; } else if (fpsAvg > 55) { highFor++; lowFor = 0; } else { lowFor = 0; highFor = 0; }
      if (E.autoQuality !== false && lowFor >= 3 && E.quality.level > 0) { setQuality(E.quality.level - 1); lowFor = 0; }
      if (E.autoQuality !== false && highFor >= 8 && E.quality.level < 3) { setQuality(E.quality.level + 1); highFor = 0; }
      SK.bus.emit('fps', fpsAvg);
    }
  };
  E.start = () => { clock.getDelta(); frame(); };
  return E;
})();
