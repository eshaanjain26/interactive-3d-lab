// SkyOps crowd renderer: every human is a set of instanced body parts; dogs are small groups.
// Draw calls stay flat (~12) no matter how many figures are on screen.
SK.crowd = (function () {
  const E = SK.engine, K = SK.kit;
  const MAX = 1200;
  const C = { map: [] };
  const root = new THREE.Group(); root.name = 'crowd';
  E.scene.add(root);

  function g(geo, ty) { geo.translate(0, ty, 0); return geo; }
  const parts = {
    legL: { geo: g(new THREE.BoxGeometry(0.15, 0.84, 0.19), -0.42), pivot: [0.1, 0.9, 0] },
    legR: { geo: g(new THREE.BoxGeometry(0.15, 0.84, 0.19), -0.42), pivot: [-0.1, 0.9, 0] },
    torso: { geo: g(new THREE.BoxGeometry(0.42, 0.62, 0.24), 0.31), pivot: [0, 0.88, 0] },
    band: { geo: g(new THREE.BoxGeometry(0.44, 0.09, 0.26), 0.44), pivot: [0, 0.88, 0] },
    armL: { geo: g(new THREE.BoxGeometry(0.1, 0.62, 0.12), -0.29), pivot: [0.27, 1.46, 0] },
    armR: { geo: g(new THREE.BoxGeometry(0.1, 0.62, 0.12), -0.29), pivot: [-0.27, 1.46, 0] },
    head: { geo: new THREE.SphereGeometry(0.12, 10, 8), pivot: [0, 1.65, 0] },
    hair: { geo: new THREE.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), pivot: [0, 1.665, -0.01] },
    cap: { geo: (() => { const a = new THREE.CylinderGeometry(0.13, 0.135, 0.09, 12); a.translate(0, 0.045, 0); const b = new THREE.BoxGeometry(0.2, 0.02, 0.12); b.translate(0, 0.0, 0.14); return THREE.BufferGeometryUtils.mergeBufferGeometries([a.toNonIndexed(), b.toNonIndexed()]); })(), pivot: [0, 1.73, 0] },
    toque: { geo: g(new THREE.CylinderGeometry(0.14, 0.12, 0.26, 12), 0.13), pivot: [0, 1.72, 0] },
    case: { geo: (() => { const a = new THREE.BoxGeometry(0.36, 0.5, 0.22); a.translate(0, 0.3, 0); const h = new THREE.BoxGeometry(0.03, 0.4, 0.03); h.translate(0, 0.75, 0); return THREE.BufferGeometryUtils.mergeBufferGeometries([a.toNonIndexed(), h.toNonIndexed()]); })(), pivot: [0.36, 0, -0.42] },
    chair: { geo: (() => {
      const seat = new THREE.BoxGeometry(0.5, 0.06, 0.48); seat.translate(0, 0.5, 0);
      const back = new THREE.BoxGeometry(0.5, 0.5, 0.05); back.translate(0, 0.78, -0.25);
      const w1 = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 14); w1.rotateZ(Math.PI / 2); w1.translate(0.29, 0.3, -0.05);
      const w2 = w1.clone(); w2.translate(-0.58, 0, 0);
      return THREE.BufferGeometryUtils.mergeBufferGeometries([seat, back, w1, w2].map((x) => x.toNonIndexed()));
    })(), pivot: [0, 0, 0] },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.02 });
  const meshes = {};
  Object.keys(parts).forEach((k) => {
    const m = new THREE.InstancedMesh(parts[k].geo, mat, MAX);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color());
    m.count = 0;
    m.castShadow = k !== 'band' && k !== 'hair';
    m.frustumCulled = false;
    root.add(m);
    meshes[k] = m;
    E.pick.add(m, (hit) => { const a = C.map[hit.instanceId]; return a ? { entry: a.role, agent: a } : null; });
  });
  C.meshes = meshes;

  // ---------- appearance ----------
  const SKIN = [0xf1c9a5, 0xe0ac86, 0xc68b62, 0x9c6a45, 0x6e4a32, 0x4a3324];
  const HAIR = [0x1b1612, 0x3b2a1e, 0x6b4a2b, 0xb08a52, 0x8a8a8a, 0x2a1c14];
  const CLOTH = [0x2e4a6b, 0x8c2f39, 0x3d5a3d, 0x6b6f75, 0xd9d4c7, 0x1f2329, 0xb07a3a, 0x4c3a6b, 0x2f7a8a, 0xa8a49a, 0xc9b9a0, 0x7a2e5c];
  const PANTS = [0x22262b, 0x2f3c52, 0x4a4036, 0x5a5f66, 0x1f2a38, 0x7d7466];
  const CASES = [0x1e1e1e, 0x2f4f7f, 0x7f2f2f, 0x5f5f5f, 0x2f6f5f, 0xc7a64a];
  const ROLE = {
    r_checkin: { torso: 0x1f3a5f, legs: 0x1f2329, band: 0xf2b134 },
    r_tso: { torso: 0x4a6fa5, legs: 0x1c2533, band: 0x1c2533 },
    r_k9handler: { torso: 0x1c2533, legs: 0x1c2533, cap: 0x1c2533, band: 0xd8e03a },
    r_immigration: { torso: 0x2d3f55, legs: 0x1c2533, cap: 0x2d3f55, band: 0xc7a64a },
    r_gateagent: { torso: 0x9c2f35, legs: 0x1f2329, band: 0xf2b134 },
    r_pilot: { torso: 0xf2f2f0, legs: 0x1a1f2b, cap: 0x1a1f2b, band: 0xd4a537 },
    r_cabin: { torso: 0x1f7f8f, legs: 0x1f7f8f, band: 0xf2b134 },
    r_cleaner: { torso: 0x5d7387, legs: 0x3a4652, band: 0xd8e03a },
    r_barista: { torso: 0x1f2329, legs: 0x1f2329, band: 0x8a5a2b },
    r_chef: { torso: 0xf4f4f2, legs: 0x2a2a2a, toque: 0xffffff },
    r_retail: { torso: 0x1f2329, legs: 0x1f2329, band: 0x9c2f35 },
    r_lounge: { torso: 0x5c1f2e, legs: 0x1f2329, band: 0xd4a537 },
    r_wheelchair: { torso: 0x6a4c93, legs: 0x2a2f3a, band: 0xd8e03a },
    r_police: { torso: 0x1b2a41, legs: 0x1b2a41, cap: 0x1b2a41, band: 0xd8e03a },
    r_marshaller: { torso: 0xff7a1a, legs: 0x2a2f3a, cap: 0x1f2329, band: 0xd9dde2 },
    r_ramp: { torso: 0xe8e23a, legs: 0x2a2f3a, band: 0xd9dde2 },
    r_bhs: { torso: 0xff8a2a, legs: 0x2a2f3a, band: 0xd9dde2 },
    r_paramedic: { torso: 0x2f8f5b, legs: 0x2f8f5b, band: 0xd8e03a },
  };
  C.dress = function (a) {
    const r = SK.rng;
    const look = { skin: r.pick(SKIN), hair: r.pick(HAIR), torso: r.pick(CLOTH), legs: r.pick(PANTS), band: null, cap: null, toque: null, case: null, bald: r.chance(0.08) };
    const st = ROLE[a.role];
    if (st) Object.assign(look, st);
    if (a.role === 'r_pax') {
      if (a.cls === 'F' || a.cls === 'J') { look.torso = r.pick([0x1f2329, 0x2f3c52, 0x6b6f75, 0xd9d4c7]); look.legs = r.pick([0x1f2329, 0x2f3c52]); }
      look.case = r.pick(CASES);
    }
    a.look = look;
    a.scale = a.child ? 0.62 : r.range(0.92, 1.08);
  };

  // ---------- per-frame matrices ----------
  const mRoot = new THREE.Matrix4(), mPart = new THREE.Matrix4(), mTmp = new THREE.Matrix4(), mZero = new THREE.Matrix4().makeScale(0, 0, 0);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  const col = new THREE.Color();
  function setPart(k, i, px, py, pz, rx, rz) {
    e.set(rx || 0, 0, rz || 0);
    q.setFromEuler(e);
    pos.set(px, py, pz); scl.set(1, 1, 1);
    mPart.compose(pos, q, scl);
    mTmp.multiplyMatrices(mRoot, mPart);
    meshes[k].setMatrixAt(i, mTmp);
  }
  function setColor(k, i, hex) { col.setHex(hex); meshes[k].setColorAt(i, col); }

  C.update = function (agents, tGame) {
    let i = 0;
    for (const a of agents) {
      if (a.hidden || i >= MAX) continue;
      const lk = a.look;
      const seated = a.anim === 'sit' || a.wheelchair;
      const sc = a.scale || 1;
      const lying = a.anim === 'lie';
      e.set(lying ? -Math.PI / 2 : 0, a.heading || 0, 0, 'YXZ'); q.setFromEuler(e);
      e.order = 'XYZ';
      pos.set(a.x, (a.y || 0) + (seated ? -0.42 * sc : 0) + (lying ? 0.14 : 0), a.z); scl.set(sc, sc, sc);
      mRoot.compose(pos, q, scl);
      // gait
      const ph = a.phase || 0;
      let legA = 0, armA = 0, armL = 0, armR = 0, armZ = 0;
      if (a.anim === 'walk') { legA = Math.sin(ph) * 0.55; armA = -legA * 0.8; armL = armA; armR = -armA; }
      else if (a.anim === 'wave') { const w = Math.sin(ph * 0.6); armL = -2.6 + w * 0.5; armR = -2.6 - w * 0.5; armZ = 0.35; }
      else if (a.anim === 'work') { armL = -0.7 + Math.sin(ph * 0.5) * 0.25; armR = -0.7 - Math.sin(ph * 0.5 + 1) * 0.25; }
      else if (a.anim === 'scan') { armL = -2.8; armR = -2.8; armZ = 0.45; }
      else if (a.anim === 'push') { armL = -1.2; armR = -1.2; legA = Math.sin(ph) * 0.45; }
      const legRot = seated ? -1.45 : 0;
      setPart('legL', i, 0.1, 0.9, 0, legRot + legA); setPart('legR', i, -0.1, 0.9, 0, legRot - legA);
      setPart('torso', i, 0, 0.88, 0);
      if (lk.band != null) setPart('band', i, 0, 0.88, 0); else meshes.band.setMatrixAt(i, mZero);
      setPart('armL', i, 0.27, 1.46, 0, armL, armZ); setPart('armR', i, -0.27, 1.46, 0, armR, -armZ);
      setPart('head', i, 0, 1.65, 0);
      if (!lk.bald && lk.cap == null && lk.toque == null) setPart('hair', i, 0, 1.665, -0.01); else meshes.hair.setMatrixAt(i, mZero);
      if (lk.cap != null) setPart('cap', i, 0, 1.73, 0); else meshes.cap.setMatrixAt(i, mZero);
      if (lk.toque != null) setPart('toque', i, 0, 1.72, 0); else meshes.toque.setMatrixAt(i, mZero);
      if (lk.case != null && a.carry && !seated) setPart('case', i, 0.36, 0, -0.42, -0.25); else meshes.case.setMatrixAt(i, mZero);
      if (a.wheelchair) { pos.set(a.x, a.y || 0, a.z); scl.set(1, 1, 1); mRoot.compose(pos, q, scl); meshes.chair.setMatrixAt(i, mRoot); } else meshes.chair.setMatrixAt(i, mZero);
      const tint = a.highlight ? 0xffd34d : null;
      setColor('legL', i, lk.legs); setColor('legR', i, lk.legs);
      setColor('torso', i, tint || lk.torso); setColor('armL', i, lk.torso); setColor('armR', i, lk.torso);
      setColor('head', i, lk.skin); setColor('hair', i, lk.hair);
      if (lk.band != null) setColor('band', i, lk.band);
      if (lk.cap != null) setColor('cap', i, lk.cap);
      if (lk.toque != null) setColor('toque', i, lk.toque);
      if (lk.case != null) setColor('case', i, lk.case);
      setColor('chair', i, 0x30343a);
      C.map[i] = a;
      i++;
    }
    C.map.length = i;
    Object.values(meshes).forEach((m) => {
      m.count = i;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    C.visibleCount = i;
  };

  // ---------- dogs ----------
  C.makeDog = function () {
    const grp = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.9 });
    K.box(0.26, 0.26, 0.75, fur, 0, 0.42, 0, grp);
    const head = K.box(0.2, 0.2, 0.28, fur, 0, 0.62, 0.42, grp);
    K.box(0.12, 0.1, 0.16, dark, 0, 0.6, 0.6, grp);
    [[-0.08, 0.18], [0.08, 0.18]].forEach(([x]) => K.box(0.05, 0.1, 0.05, dark, x, 0.8, 0.38, grp));
    const legs = [[0.09, 0.27], [-0.09, 0.27], [0.09, -0.27], [-0.09, -0.27]].map(([x, z]) => {
      const lg = new THREE.Group(); lg.position.set(x, 0.42, z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07), fur); m.position.y = -0.21; m.castShadow = true; lg.add(m);
      grp.add(lg); return lg;
    });
    const tail = new THREE.Group(); tail.position.set(0, 0.52, -0.38);
    const tm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), fur); tm.position.z = -0.15; tail.add(tm); grp.add(tail);
    const vest = new THREE.MeshStandardMaterial({ color: 0xd8e03a, roughness: 0.6 });
    K.box(0.28, 0.12, 0.4, vest, 0, 0.52, 0, grp);
    grp.userData = { legs, tail, head };
    root.add(grp);
    E.pick.add(grp, 'k9');
    return grp;
  };
  C.poseDog = function (d, x, z, heading, walking, ph, sitting) {
    d.position.set(x, 0, z);
    d.rotation.y = heading;
    const u = d.userData;
    u.legs.forEach((l, i) => (l.rotation.x = walking ? Math.sin(ph * 1.4 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 : 0));
    u.tail.rotation.y = Math.sin(ph * 3) * 0.6;
    d.rotation.x = sitting ? -0.35 : 0;
    d.position.y = sitting ? 0.06 : 0;
  };
  return C;
})();
