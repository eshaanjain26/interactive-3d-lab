// SkyOps airfield: apron, stands, jet bridges, taxiways, runway 09/27 + lighting, tower, future-zone massing.
SK.airfield = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine;
  const A = { bridges: {} };
  const root = new THREE.Group(); root.name = 'airfield';
  E.scene.add(root);
  const B = new K.Batch();
  const RW = L.runway;

  // ---------- surfaces ----------
  K.ground(330, 100, M.apron, -35, 0.015, -90, root);                       // apron
  K.ground(70, 40, M.apron, -190, 0.016, -84, root);                        // remote stand
  K.ground(110, 26, M.apron, 130, 0.016, -60, root);                         // tower / ops apron
  K.ground(RW.x1 - RW.x0 - 40, 23, M.apron, 0, 0.017, L.taxiwayZ, root);    // parallel taxiway
  K.ground(RW.x1 - RW.x0 + 20, RW.w, M.runway, 0, 0.018, RW.z, root);       // runway
  [[-120, 23], [300, 23], [RW.exitX, 23], [RW.holdX, 23]].forEach(([x, w]) => {
    const z0 = x === -120 || x === 300 ? L.taxilaneZ : L.taxiwayZ, z1 = x === -120 || x === 300 ? L.taxiwayZ : RW.z;
    K.ground(w, Math.abs(z1 - z0) + 10, M.apron, x, 0.016, (z0 + z1) / 2, root);
  });
  K.ground(140, 20, M.apron, 240, 0.016, L.taxilaneZ, root);                // taxilane east extension

  // taxilane / taxiway centrelines (yellow) and edge lights
  B.box(500, 0.02, 0.3, M.yellowMark, 60, 0.02, L.taxilaneZ);
  B.box(RW.x1 - RW.x0 - 40, 0.02, 0.3, M.yellowMark, 0, 0.02, L.taxiwayZ);
  [-120, 300].forEach((x) => B.box(0.3, 0.02, L.taxilaneZ - L.taxiwayZ, M.yellowMark, x, 0.02, (L.taxilaneZ + L.taxiwayZ) / 2));
  [RW.exitX, RW.holdX].forEach((x) => B.box(0.3, 0.02, L.taxiwayZ - RW.z, M.yellowMark, x, 0.02, (L.taxiwayZ + RW.z) / 2));
  // runway holding position: two solid + two dashed lines across the connector
  const hz = RW.z + RW.w / 2 + 12;
  [0, 0.6].forEach((dz) => B.box(22, 0.02, 0.3, M.yellowMark, RW.holdX, 0.025, hz + dz));
  for (let x = RW.holdX - 10; x < RW.holdX + 11; x += 2.4) [1.6, 2.2].forEach((dz) => B.box(1.2, 0.02, 0.3, M.yellowMark, x, 0.025, hz + dz));
  const hs = K.sign('27 - 09', 3.2, 1, { bg: '#c8382f', fg: '#ffffff', font: 'bold 150px system-ui, sans-serif' });
  hs.position.set(RW.holdX + 13, 1, hz + 1); hs.rotation.y = Math.PI / 2; root.add(hs);
  K.hit(24, 1, 4, RW.holdX, 0, hz + 1, root, 'holdshort');
  // runway markings
  for (let x = RW.x0 + 60; x < RW.x1 - 60; x += 50) B.box(30, 0.02, 0.9, M.marking, x, 0.03, RW.z);
  [RW.x0 + 8, RW.x1 - 8].forEach((x) => { for (let k = -7; k <= 7; k++) if (k) B.box(30, 0.02, 1.8, M.marking, x, 0.03, RW.z + k * 2.8); });
  [RW.x0 + 150, RW.x1 - 150].forEach((x) => [-1, 1].forEach((s) => B.box(45, 0.02, 6, M.marking, x, 0.03, RW.z + s * 9)));
  B.box(RW.x1 - RW.x0, 0.02, 0.9, M.marking, 0, 0.03, RW.z - RW.w / 2 + 1);
  B.box(RW.x1 - RW.x0, 0.02, 0.9, M.marking, 0, 0.03, RW.z + RW.w / 2 - 1);
  K.paint('27', 40, 18, '#f2f2ee', root, RW.x1 - 55, RW.z, Math.PI / 2);
  K.paint('09', 40, 18, '#f2f2ee', root, RW.x0 + 55, RW.z, -Math.PI / 2);
  K.hit(RW.x1 - RW.x0, 0.2, RW.w, 0, 0, RW.z, root, 'runway');

  // ---------- lights (instanced spheres; glow at night via emissive) ----------
  const lightGeo = new THREE.SphereGeometry(0.35, 6, 4);
  function lights(color, pts, size) {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
    SK.sky.glow(mat, 0.25, 3.2);
    const m = new THREE.InstancedMesh(lightGeo, mat, pts.length);
    pts.forEach((p, i) => m.setMatrixAt(i, K.matrix(p[0], 0.3, p[1], 0, size || 1, size || 1, size || 1)));
    m.frustumCulled = false;
    root.add(m);
    return m;
  }
  const edge = [], centre = [], twy = [], thr = [], ends = [], appr = [];
  for (let x = RW.x0; x <= RW.x1; x += 30) { edge.push([x, RW.z - RW.w / 2 - 1.5], [x, RW.z + RW.w / 2 + 1.5]); }
  for (let x = RW.x0 + 15; x <= RW.x1 - 15; x += 15) centre.push([x, RW.z]);
  for (let x = RW.x0 + 30; x < RW.x1 - 30; x += 30) twy.push([x, L.taxiwayZ - 12], [x, L.taxiwayZ + 12]);
  for (let k = -9; k <= 9; k++) { thr.push([RW.x1 + 1, RW.z + k * 2.5]); ends.push([RW.x0 - 1, RW.z + k * 2.5]); }
  for (let x = RW.x1 + 30; x <= RW.x1 + 300; x += 30) for (let k = -2; k <= 2; k++) appr.push([x, RW.z + k * 1.8]);
  lights(0xfff3d6, edge, 1.1);
  lights(0xffffff, centre, 0.8);
  lights(0x3c7dff, twy, 0.9);
  lights(0x38e07b, thr, 1.2);
  lights(0xff3b30, ends, 1.2);
  lights(0xfff3d6, appr, 1.3);
  // PAPI: 4 boxes left of the 27 threshold (aircraft heading west: left is south, +z)
  for (let i = 0; i < 4; i++) {
    const col = i < 2 ? 0xff3b30 : 0xffffff;
    const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 });
    SK.sky.glow(mat, 1.0, 4);
    K.box(1.4, 0.8, 1, mat, RW.x1 - 120, 0, RW.z + RW.w / 2 + 12 + i * 4, root);
  }
  K.hit(4, 2, 18, RW.x1 - 120, 0, RW.z + RW.w / 2 + 18, root, 'papi');

  // apron flood masts
  for (let x = -180; x <= 110; x += 58) {
    B.cyl(0.35, 24, M.steel, x, 0, -136, 8);
    const head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d0, emissiveIntensity: 0.2 });
    SK.sky.glow(head, 0.1, 2.5);
    K.box(3, 1, 1.2, head, x, 24, -136, root);
  }

  // ---------- stands + jet bridges ----------
  L.gates.forEach((g) => {
    if (g.bus) return;
    // lead-in line from taxilane to stop bar, stand number
    B.box(0.3, 0.02, L.stand.leadInZ - L.stand.noseZ, M.yellowMark, g.x, 0.025, (L.stand.leadInZ + L.stand.noseZ) / 2);
    B.box(4, 0.02, 0.4, M.yellowMark, g.x, 0.025, L.stand.noseZ - 1.2);
    K.paint(g.id, 6, 4, '#f1c232', root, g.x - 5, L.stand.noseZ - 8, Math.PI);
    // equipment restraint line
    B.box(g.wide ? 70 : 46, 0.02, 0.25, M.redMark, g.x, 0.025, L.term.z0 - 5);
    A.bridges[g.id] = makeBridge(g);
  });
  // remote stand marking + air stairs
  const R = L.remote;
  B.box(36, 0.02, 0.3, M.yellowMark, R.x + 12, 0.025, R.z);
  K.paint('R1', 6, 4, '#f1c232', root, R.x + 4, R.z + 8, 0);

  function makeBridge(g) {
    const door = L.gateDoor(g);
    const grp = new THREE.Group();
    const rot = new THREE.Vector3(door.x, 0, L.term.z0 - 4.2);
    // fixed link from the terminal wall (ramp up) to the rotunda
    const link = new THREE.Group();
    K.box(2.6, 0.25, 4, M.darkSteel, 0, 3.0, -2, link);
    K.box(0.1, 2.4, 4, M.glass, -1.3, 3.25, -2, link);
    K.box(0.1, 2.4, 4, M.glass, 1.3, 3.25, -2, link);
    K.box(2.7, 0.2, 4, M.steel, 0, 5.6, -2, link);
    K.cyl(0.25, 0.25, 3, M.steel, 0, 0, -2, link);
    link.position.set(door.x, 0, L.term.z0);
    grp.add(link);
    K.cyl(2.2, 2.2, 3, M.steel, rot.x, 2.8, rot.z, grp, 20);
    K.cyl(0.6, 0.6, 2.8, M.darkSteel, rot.x, 0, rot.z, grp, 10);
    // telescoping tunnel: outer + inner sections, cab at the far end
    const arm = new THREE.Group();
    arm.position.copy(rot);
    const outer = new THREE.Group(), inner = new THREE.Group(), cab = new THREE.Group();
    const tunnel = (grpX, len, w) => {
      K.box(w, 0.25, len, M.darkSteel, 0, 0, -len / 2, grpX);
      K.box(0.1, 2.3, len, M.glass, -w / 2, 0.25, -len / 2, grpX);
      K.box(0.1, 2.3, len, M.glass, w / 2, 0.25, -len / 2, grpX);
      K.box(w + 0.1, 0.25, len, M.steel, 0, 2.55, -len / 2, grpX);
    };
    tunnel(outer, 8, 2.8);
    tunnel(inner, 8, 2.6);
    K.box(3.4, 3.0, 2.6, M.steel, 0, 0, -1.2, cab);
    K.box(3.0, 0.4, 0.4, M.rubber, 0, 2.6, -2.5, cab);
    const leg = new THREE.Group();
    K.box(0.4, 1, 0.4, M.darkSteel, 0, 0, 0, leg);
    K.box(2.4, 0.6, 0.8, M.darkSteel, 0, -0.6, 0, leg);
    arm.add(outer, inner, cab, leg);
    grp.add(arm);
    root.add(grp);
    E.pick.add(grp, 'jetbridge');
    const bridge = { g, rot, arm, outer, inner, cab, leg, u: 0, target: 0, dockAt: null, h: 3.0, park: { yaw: 0.35, len: 9 } };
    setBridge(bridge, 0);
    return bridge;
  }
  // u: 0 parked, 1 docked at bridge.dockAt {x, z, h}
  function setBridge(b, u) {
    const d = b.dockAt;
    let yaw = b.park.yaw, len = b.park.len, h = 3.0;
    if (d) {
      const dx = d.x + 1.6 - b.rot.x, dz = d.z - b.rot.z;
      const dyaw = Math.atan2(-dx, -dz), dlen = Math.hypot(dx, dz) - 2.4;
      yaw = SK.lerp(b.park.yaw, dyaw, u); len = SK.lerp(b.park.len, dlen, u); h = SK.lerp(3.0, d.h, u);
    }
    b.arm.rotation.y = yaw;
    b.arm.position.y = 2.9;
    const rise = h - 2.9;
    const tilt = Math.atan2(rise, len);
    b.arm.rotation.x = 0;
    b.outer.rotation.x = tilt; b.inner.rotation.x = tilt;
    b.outer.position.set(0, 0, 0);
    b.inner.position.set(0, Math.sin(tilt) * Math.max(0, len - 8), -Math.cos(tilt) * Math.max(0, len - 8));
    b.cab.position.set(0, rise, -len);
    b.leg.position.set(0, rise * 0.7 - 2.3, -len * 0.7);
    b.leg.scale.y = 1;
    b.len = len; b.hNow = h; b.yaw = yaw;
    b.u = u;
  }
  A.dock = function (gid, doorPos) { const b = A.bridges[gid]; if (!b) return; b.dockAt = doorPos; b.target = 1; };
  A.retract = function (gid) { const b = A.bridges[gid]; if (b) b.target = 0; };
  A.bridgeReady = (gid) => { const b = A.bridges[gid]; return !b || b.u > 0.99; };
  A.bridgeClear = (gid) => { const b = A.bridges[gid]; return !b || b.u < 0.01; };
  // world-space walking path for boarding: terminal door -> rotunda -> cab end
  A.bridgePath = function (gid) {
    const b = A.bridges[gid];
    const door = L.gateDoor(b.g);
    const end = { x: b.rot.x - Math.sin(b.yaw) * (b.len + 1.4), z: b.rot.z - Math.cos(b.yaw) * (b.len + 1.4), y: b.hNow };
    return [{ x: door.x, z: L.term.z0 - 0.4, y: 0.2 }, { x: door.x, z: L.term.z0 - 3.4, y: 3.0 }, { x: b.rot.x, z: b.rot.z, y: 3.0 }, end];
  };

  // ---------- ATC tower + radar ----------
  const TW = L.tower;
  K.cyl(3.2, 4.2, TW.h, M.concrete, TW.x, 0, TW.z, root, 16);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 6, 5, 8), M.glassDark);
  cab.position.set(TW.x, TW.h + 2.5, TW.z); root.add(cab);
  K.cyl(8.2, 8.2, 0.8, M.wallDark, TW.x, TW.h + 5, TW.z, root, 8);
  K.cyl(6.4, 6.4, 0.6, M.wallDark, TW.x, TW.h - 0.4, TW.z, root, 8);
  K.cyl(0.4, 0.4, 5, M.steel, TW.x, TW.h + 5.8, TW.z, root, 8);
  const radar = new THREE.Group();
  K.box(7, 1.6, 0.4, M.white, 0, 0, 0, radar);
  K.box(0.6, 0.6, 1.4, M.darkSteel, 0, -0.4, 0.6, radar);
  radar.position.set(TW.x, TW.h + 10.6, TW.z);
  root.add(radar);
  A.radar = radar;
  const beacon = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 1 });
  K.cyl(0.35, 0.35, 0.5, beacon, TW.x, TW.h + 12.2, TW.z, root, 8);
  A.towerBeacon = beacon;
  K.hit(16, TW.h + 6, 16, TW.x, 0, TW.z, root, 'tower');
  K.hit(8, 2.5, 3, TW.x, TW.h + 9.4, TW.z, root, 'radar');
  K.hit(30, 0.2, 30, TW.x, 0, TW.z + 20, root, 'tower');

  // ---------- future-zone massing ----------
  function future(id, x0, x1, z0, z1, h, mat, title, pass) {
    B.box(x1 - x0, h, z1 - z0, mat, (x0 + x1) / 2, 0, (z0 + z1) / 2);
    const s = K.sign([title, 'Pass ' + pass + ' · coming next'], 12, 2.6, { bg: '#2f3a48', fg: '#e7edf4', font: 'bold 64px system-ui, sans-serif', accent: '#f2b134' });
    s.position.set((x0 + x1) / 2, h + 3, z1 + 0.1); root.add(s);
    K.hit(x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, root, id);
  }
  future('cargo', 280, 380, -110, -30, 16, M.wallDark, 'Cargo terminal', 3);
  future('eoc', 140, 162, -48, -32, 6, M.wallDark, 'SOC / EOC', 3);
  future('fire', 20, 60, -186, -166, 8, M.red, 'ARFF fire station', 3);
  // hangar: box with a curved roof
  future('hangar', -350, -250, -120, -40, 18, M.wall, 'Maintenance hangar', 3);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 100, 24, 1, false, -Math.PI / 2, Math.PI), M.steel);
  arch.rotation.x = Math.PI / 2; arch.scale.set(1.25, 1, 0.25); arch.position.set(-300, 18, -80);
  root.add(arch);
  // fuel farm tanks
  for (let i = 0; i < 4; i++) B.cyl(9, 12, M.white, 348 + (i % 2) * 24, 0, 57 + Math.floor(i / 2) * 26, 24);
  K.hit(60, 12, 60, 360, 0, 70, root, 'fuel');
  const fs = K.sign(['Fuel farm', 'Pass 3 · coming next'], 10, 2.4, { bg: '#2f3a48', font: 'bold 64px system-ui, sans-serif', accent: '#f2b134' });
  fs.position.set(360, 16, 102); root.add(fs);

  B.build(root);

  // render-only animation
  A.visual = function (dtReal) {
    radar.rotation.y += dtReal * (Math.PI * 2 / 4.8);     // ~4.8 s per sweep
    beacon.emissiveIntensity = Math.sin(performance.now() * 0.004) > 0.2 ? 3 : 0.2;
  };
  // bridge movement is sim state: boarding waits for it, so it advances with the sim clock, not with frames
  A.update = function (dt) {
    Object.values(A.bridges).forEach((b) => {
      if (Math.abs(b.u - b.target) > 1e-4) setBridge(b, SK.clamp(b.u + Math.sign(b.target - b.u) * dt * 0.12, 0, 1));
    });
  };
  A.root = root;
  return A;
})();
