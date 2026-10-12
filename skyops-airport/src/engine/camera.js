// SkyOps camera: cinematic fly-to and the camera modes (strategy, top-down, walk, follow, CCTV, drone).
SK.cam = (function () {
  const E = SK.engine, cam = E.camera, ctl = E.controls;
  const C = { mode: 'strategy', joy: { x: 0, y: 0 }, cctvIndex: 0 };
  let fly = null, follow = null, followLast = null;
  const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();

  C.CCTV = [
    { name: 'CAM 01 · Curb', pos: [30, 9, 80], at: [-10, 1, 61] },
    { name: 'CAM 02 · Check-in hall', pos: [-95, 9, 53], at: [-30, 1, 38] },
    { name: 'CAM 03 · Security queue', pos: [78, 7, 28], at: [45, 1, 20] },
    { name: 'CAM 04 · Screening lanes', pos: [-70, 6, 4], at: [-20, 1, 14] },
    { name: 'CAM 05 · Passport control', pos: [62, 6, 4], at: [10, 1, -5] },
    { name: 'CAM 06 · Duty free', pos: [38, 6, -11], at: [0, 1, -19] },
    { name: 'CAM 07 · Gate A3', pos: [10, 6, -27], at: [32, 1, -36] },
    { name: 'CAM 08 · Baggage hall', pos: [139, 8, 35], at: [118, 1, 8] },
    { name: 'CAM 09 · Apron', pos: [-40, 18, -30], at: [10, 2, -70] },
    { name: 'CAM 10 · Arrivals immigration', pos: [196, 7, -6], at: [222, 1, 20] },
    { name: 'CAM 11 · Baggage claim', pos: [262, 7, -6], at: [248, 1, 22] },
    { name: 'CAM 12 · Customs and arrivals hall', pos: [288, 7, 48], at: [270, 1, 18] },
  ];

  // spherical helpers relative to a target
  function currentAngles() {
    v3.copy(cam.position).sub(ctl.target);
    const r = v3.length();
    return { r, polar: Math.acos(SK.clamp(v3.y / r, -1, 1)), az: Math.atan2(v3.x, v3.z) };
  }
  function posFrom(target, r, polar, az) {
    return new THREE.Vector3(target.x + r * Math.sin(polar) * Math.sin(az), target.y + r * Math.cos(polar), target.z + r * Math.sin(polar) * Math.cos(az));
  }

  C.flyTo = function (t, o) {
    o = o || {};
    if (C.mode !== 'strategy' && C.mode !== 'top' && !o.keepMode) C.setMode('strategy');
    const a = currentAngles();
    const target = new THREE.Vector3(t.x, t.y || 0, t.z);
    const r = o.dist || a.r;
    const polar = o.polar != null ? o.polar : C.mode === 'top' ? 0.02 : SK.clamp(a.polar, 0.5, 1.05);
    const az = o.az != null ? o.az : a.az;
    const endPos = o.pos ? new THREE.Vector3(o.pos[0], o.pos[1], o.pos[2]) : posFrom(target, r, polar, az);
    const dur = SK.reducedMotion ? 0 : o.dur != null ? o.dur : 1.4;
    fly = { t: 0, dur, p0: cam.position.clone(), p1: endPos, q0: ctl.target.clone(), q1: target, arc: Math.min(120, cam.position.distanceTo(endPos) * 0.25) };
    if (dur === 0) { cam.position.copy(endPos); ctl.target.copy(target); fly = null; }
  };
  C.flying = () => !!fly;

  C.follow = function (getter, label) {
    follow = getter;
    followLast = null;
    C.followLabel = label || '';
    C.setMode('follow', true);
    const p = getter();
    if (p) C.flyTo(p, { dist: 16, polar: 0.95, keepMode: true, dur: 1 });
  };
  C.stopFollow = function () { follow = null; if (C.mode === 'follow') C.setMode('strategy'); };

  C.setMode = function (m, internal) {
    const prev = C.mode;
    C.mode = m;
    ctl.enabled = m !== 'walk' && m !== 'cctv';
    ctl.autoRotate = m === 'drone';
    ctl.autoRotateSpeed = 0.35;
    ctl.enableRotate = m !== 'top';
    ctl.maxPolarAngle = m === 'walk' ? Math.PI : 1.47;
    if (m !== 'follow' && !internal) follow = null;
    if (m === 'top') C.flyTo(ctl.target, { polar: 0.001, dist: Math.max(120, currentAngles().r), keepMode: true });
    if (m === 'drone') C.flyTo({ x: 0, y: 0, z: -40 }, { dist: 420, polar: 0.95, keepMode: true, dur: 2 });
    if (m === 'walk') enterWalk(prev);
    if (m === 'cctv') C.cctv(C.cctvIndex);
    if (prev === 'walk' && m !== 'walk') { cam.up.set(0, 1, 0); }
    SK.bus.emit('camMode', m);
  };

  C.cctv = function (i) {
    C.cctvIndex = (i + C.CCTV.length) % C.CCTV.length;
    const c = C.CCTV[C.cctvIndex];
    fly = null;
    cam.position.set(c.pos[0], c.pos[1], c.pos[2]);
    ctl.target.set(c.at[0], c.at[1], c.at[2]);
    cam.lookAt(ctl.target);
    SK.bus.emit('cctv', c);
  };

  // ---------- walk mode ----------
  const walk = { yaw: 0, pitch: 0, keys: {}, drag: null };
  function enterWalk() {
    fly = null;
    const t = ctl.target;
    // drop to eye height at the current target, facing the way the camera faced
    const a = currentAngles();
    walk.yaw = a.az + Math.PI;
    walk.pitch = -0.05;
    cam.position.set(t.x, 1.7, t.z);
  }
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    walk.keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', (e) => { walk.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { walk.keys = {}; });
  E.renderer.domElement.addEventListener('pointerdown', (e) => { if (C.mode === 'walk') walk.drag = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointermove', (e) => {
    if (C.mode !== 'walk' || !walk.drag) return;
    walk.yaw -= (e.clientX - walk.drag.x) * 0.004;
    walk.pitch = SK.clamp(walk.pitch - (e.clientY - walk.drag.y) * 0.004, -1.2, 1.2);
    walk.drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => { walk.drag = null; });

  function updateWalk(dt) {
    const k = walk.keys;
    let f = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + -C.joy.y;
    let s = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + C.joy.x;
    const sp = (k.shift ? 9 : 4) * dt;
    const fx = Math.sin(walk.yaw), fz = Math.cos(walk.yaw);
    cam.position.x += (fx * f - fz * s) * sp;
    cam.position.z += (fz * f + fx * s) * sp;
    cam.position.x = SK.clamp(cam.position.x, -470, 470);
    cam.position.z = SK.clamp(cam.position.z, -260, 140);
    cam.position.y = 1.7;
    v3.set(cam.position.x + Math.sin(walk.yaw) * Math.cos(walk.pitch), 1.7 + Math.sin(walk.pitch), cam.position.z + Math.cos(walk.yaw) * Math.cos(walk.pitch));
    cam.lookAt(v3);
    ctl.target.set(cam.position.x + Math.sin(walk.yaw) * 6, 0, cam.position.z + Math.cos(walk.yaw) * 6);
  }

  function updateStrategyKeys(dt) {
    const k = walk.keys;
    if (fly) return;
    const pan = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
    const side = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
    const rot = (k.e ? 1 : 0) - (k.q ? 1 : 0);
    const zoom = (k['-'] || k._ ? 1 : 0) - (k['='] || k['+'] ? 1 : 0);
    if (!pan && !side && !rot && !zoom) return;
    const a = currentAngles();
    const speed = a.r * 0.9 * dt;
    v3.set(-Math.sin(a.az), 0, -Math.cos(a.az));         // forward on the ground
    v3b.set(-v3.z, 0, v3.x);                             // right
    const d = v3.multiplyScalar(pan * speed).add(v3b.multiplyScalar(side * speed));
    ctl.target.add(d); cam.position.add(d);
    if (rot || zoom) {
      const r = SK.clamp(a.r * (1 + zoom * 1.2 * dt), ctl.minDistance, ctl.maxDistance);
      cam.position.copy(posFrom(ctl.target, r, a.polar, a.az + rot * 1.2 * dt));
    }
  }

  E.onFrame((dtGame, dtReal) => {
    if (fly) {
      fly.t += dtReal;
      const u = fly.dur ? SK.ease(SK.clamp(fly.t / fly.dur, 0, 1)) : 1;
      cam.position.lerpVectors(fly.p0, fly.p1, u);
      cam.position.y += Math.sin(Math.PI * u) * fly.arc;
      ctl.target.lerpVectors(fly.q0, fly.q1, u);
      if (u >= 1) fly = null;
    }
    if (C.mode === 'walk') { updateWalk(dtReal); return; }
    if (C.mode === 'cctv') { cam.lookAt(ctl.target); return; }
    if (C.mode === 'follow' && follow && !fly) {
      const p = follow();
      if (!p) { C.stopFollow(); return; }
      if (followLast) {
        v3.set(p.x - followLast.x, (p.y || 0) - followLast.y, p.z - followLast.z);
        cam.position.add(v3); ctl.target.add(v3);
      } else ctl.target.set(p.x, p.y || 0, p.z);
      followLast = { x: p.x, y: p.y || 0, z: p.z };
    }
    if (C.mode === 'strategy' || C.mode === 'top' || C.mode === 'follow') updateStrategyKeys(dtReal);
  });
  return C;
})();
