// SkyOps sky: day/night lighting tied to the sim clock, and weather (rain, fog, snow, storm).
SK.sky = (function () {
  const E = SK.engine, scene = E.scene;
  const S = { night: 0, weather: 'clear', override: null, flash: 0 };

  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x6b6250, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0025;
  sun.shadow.normalBias = 0.12;
  scene.add(sun, sun.target);
  E.sun = sun;
  const fog = new THREE.Fog(0xcfe0ee, 500, 2600);
  scene.fog = fog;
  scene.background = new THREE.Color(0xbcd6ec);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.random() * 1.3;
    sp[i * 3] = 1800 * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = 1800 * Math.cos(ph) + 100; sp[i * 3 + 2] = 1800 * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // materials that glow at night: [material, dayIntensity, nightIntensity]
  const glows = [];
  S.glow = (mat, day, night) => { glows.push([mat, day, night]); mat.emissiveIntensity = day; };
  S.glow(SK.kit.mat.lightStrip, 0.0, 1.3);
  S.glow(SK.kit.mat.screen, 0.55, 1.0);
  S.glow(SK.kit.mat.screenWarm, 0.6, 1.1);

  const cDay = new THREE.Color(0xbcd6ec), cDusk = new THREE.Color(0xe7a77a), cNight = new THREE.Color(0x0b1424), cOvercast = new THREE.Color(0x9aa6b1), cStorm = new THREE.Color(0x4a525c);
  const tmpC = new THREE.Color();

  // ---------- weather ----------
  const W = {
    clear: { label: 'Clear', cloud: 0, fogNear: 500, fogFar: 2600, rain: 0, snow: 0, taxi: 1, delayMin: 0, ramp: true, vis: '10+ km' },
    rain: { label: 'Rain', cloud: 0.6, fogNear: 200, fogFar: 1300, rain: 1, snow: 0, taxi: 0.85, delayMin: 6, ramp: true, vis: '5 km' },
    fog: { label: 'Fog', cloud: 0.5, fogNear: 10, fogFar: 260, rain: 0, snow: 0, taxi: 0.6, delayMin: 18, ramp: true, vis: '400 m (LVP)' },
    snow: { label: 'Snow', cloud: 0.7, fogNear: 60, fogFar: 700, rain: 0, snow: 1, taxi: 0.7, delayMin: 22, ramp: true, vis: '1.5 km', deice: true },
    storm: { label: 'Thunderstorm', cloud: 1, fogNear: 80, fogFar: 900, rain: 2, snow: 0, taxi: 0.75, delayMin: 30, ramp: false, vis: '3 km' },
  };
  S.types = W;
  S.ops = () => W[S.weather];

  const RAIN_N = 4000, AREA = 120, TOP = 70;
  const rainPos = new Float32Array(RAIN_N * 6);
  for (let i = 0; i < RAIN_N; i++) {
    const x = (Math.random() - 0.5) * AREA, y = Math.random() * TOP, z = (Math.random() - 0.5) * AREA;
    rainPos.set([x, y, z, x + 0.15, y + 1.1, z], i * 6);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaac4dc, transparent: true, opacity: 0.45 }));
  rain.frustumCulled = false; rain.visible = false;
  scene.add(rain);

  const SNOW_N = 3500;
  const snowPos = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) snowPos.set([(Math.random() - 0.5) * AREA, Math.random() * TOP, (Math.random() - 0.5) * AREA], i * 3);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: SK.kit.puff, depthWrite: false, color: 0xffffff, size: 0.35, transparent: true, opacity: 0.9 }));
  snow.frustumCulled = false; snow.visible = false;
  scene.add(snow);

  S.setWeather = function (w) {
    if (!W[w]) return;
    S.weather = w;
    rain.visible = W[w].rain > 0;
    snow.visible = W[w].snow > 0;
    rain.material.opacity = W[w].rain > 1 ? 0.6 : 0.42;
    SK.bus.emit('weather', w);
  };

  let flashTimer = 8;
  S.update = function (dtGame, dtReal, simSec) {
    // ----- sun -----
    const hour = S.override != null ? S.override : (simSec / 3600) % 24;
    const dayT = (hour - 6) / 13;             // 0 at sunrise (06:00), 1 at sunset (19:00)
    const elev = Math.sin(Math.PI * SK.clamp(dayT, -0.25, 1.25));
    const az = Math.PI * SK.clamp(dayT, -0.2, 1.2);
    const w = W[S.weather];
    const t = E.controls.target;
    const dist = E.camera.position.distanceTo(t);
    const half = SK.clamp(dist * 0.7, 50, 300);
    // shadow box follows the view; snapped to a grid so shadows do not shimmer while panning
    const snap = half / 8;
    const cx = Math.round(t.x / snap) * snap, cz = Math.round(t.z / snap) * snap;
    const se = Math.max(0.12, elev);
    sun.position.set(cx + Math.cos(az) * 300, 40 + se * 300, cz + 120 + Math.sin(az) * 80);
    sun.target.position.set(cx, 0, cz);
    const sc = sun.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 10; sc.far = 900; sc.updateProjectionMatrix(); }

    const day = SK.clamp(elev * 2.2, 0, 1);       // 0 night .. 1 full day
    const dusk = SK.clamp(1 - Math.abs(elev) * 4, 0, 1) * (dayT > -0.2 && dayT < 1.2 ? 1 : 0);
    S.night = 1 - day;
    const overcast = w.cloud;
    sun.intensity = (0.1 + 1.0 * day) * (1 - overcast * 0.75);
    sun.color.setHSL(0.09 + 0.04 * day, 0.7 - 0.5 * day, 0.6 + 0.3 * day);
    if (S.night > 0.8) sun.color.set(0x9db4ff);
    hemi.intensity = 0.18 + 0.32 * day + (S.flash > 0 ? S.flash * 2.5 : 0);

    tmpC.copy(cNight).lerp(cDay, day);
    if (dusk > 0) tmpC.lerp(cDusk, dusk * 0.55);
    if (overcast) tmpC.lerp(S.weather === 'storm' ? cStorm : cOvercast, overcast * (0.4 + 0.6 * day) * 0.85);
    if (S.flash > 0) tmpC.lerp(new THREE.Color(0xdde6ff), S.flash);
    scene.background.copy(tmpC);
    fog.color.copy(tmpC);
    fog.near = w.fogNear; fog.far = w.fogFar * (0.75 + 0.25 * day);
    starMat.opacity = SK.clamp((S.night - 0.6) * 2.5, 0, 1) * (1 - overcast);
    E.renderer.toneMappingExposure = 0.9 - 0.08 * day;
    glows.forEach(([m, d, n]) => (m.emissiveIntensity = SK.lerp(d, n, S.night)));
    E.bloom.strength = 0.25 + 0.55 * S.night;

    // ----- precipitation follows the camera target -----
    if (rain.visible) {
      const fall = (w.rain > 1 ? 70 : 48) * dtReal;
      const p = rainGeo.attributes.position.array;
      for (let i = 0; i < RAIN_N; i++) {
        const o = i * 6;
        p[o + 1] -= fall; p[o + 4] -= fall;
        if (p[o + 1] < 0) { p[o + 1] += TOP; p[o + 4] += TOP; }
      }
      rainGeo.attributes.position.needsUpdate = true;
      rain.position.set(t.x, 0, t.z);
    }
    if (snow.visible) {
      const p = snowGeo.attributes.position.array, tt = performance.now() * 0.001;
      for (let i = 0; i < SNOW_N; i++) {
        const o = i * 3;
        p[o + 1] -= 2.2 * dtReal;
        p[o] += Math.sin(tt + i) * 0.6 * dtReal;
        if (p[o + 1] < 0) p[o + 1] += TOP;
      }
      snowGeo.attributes.position.needsUpdate = true;
      snow.position.set(t.x, 0, t.z);
    }
    // ----- lightning -----
    if (S.weather === 'storm') {
      flashTimer -= dtReal;
      if (flashTimer <= 0) { S.flash = 1; flashTimer = 4 + Math.random() * 9; SK.bus.emit('lightning'); }
    }
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dtReal * (S.flash > 0.5 ? 6 : 2.5));
  };
  return S;
})();
