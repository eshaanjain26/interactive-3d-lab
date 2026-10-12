// SkyOps aircraft: procedural aircraft models and the movement state machine
// (approach, landing, taxi-in, parking, turnaround, pushback, taxi-out, hold, take-off).
// Airside motion runs faster than real life (AIR) so a single runway keeps up with a compressed day.
SK.aircraft = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine, RW = L.runway;
  const A = { planes: [], runwayHolder: null, AIR: 1.6 };
  const root = new THREE.Group(); root.name = 'aircraft';
  E.scene.add(root);

  const DIM = {
    narrow: { len: 44.5, span: 35.8, r: 1.98, cy: 3.4, doorAft: 6.2, doorH: 3.4, finH: 6.4, engR: 1.05, engX: 5.8 },
    wide: { len: 62.8, span: 60.1, r: 2.9, cy: 4.6, doorAft: 9.5, doorH: 4.9, finH: 9.6, engR: 1.6, engX: 9.8 },
  };
  const liveries = {};
  function livery(al) {
    if (liveries[al.code]) return liveries[al.code];
    return (liveries[al.code] = {
      body: new THREE.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.35, metalness: 0.2 }),
      tail: new THREE.MeshStandardMaterial({ color: al.color, roughness: 0.4, metalness: 0.2 }),
      accent: new THREE.MeshStandardMaterial({ color: al.tail, roughness: 0.4 }),
    });
  }
  const navRed = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  const navGreen = new THREE.MeshBasicMaterial({ color: 0x2aff6a });
  const strobe = new THREE.MeshBasicMaterial({ color: 0xffffff });

  function wingShape(rootLen, tipLen, half, sweep) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(half, -sweep); s.lineTo(half, -sweep - tipLen); s.lineTo(0, -rootLen); s.lineTo(0, 0);
    return s;
  }

  // Model faces +z with the nose tip at the origin, on the ground.
  function build(kind, al) {
    const d = DIM[kind], lv = livery(al);
    const g = new THREE.Group();
    const body = new THREE.Group();
    // fuselage profile along +y from tail (y=0) to nose (y=len), rotated to lie along -z..0
    const pts = [];
    const n = d.len;
    pts.push(new THREE.Vector2(0.05, 0));
    pts.push(new THREE.Vector2(d.r * 0.25, 0.8));
    pts.push(new THREE.Vector2(d.r * 0.6, n * 0.1));
    pts.push(new THREE.Vector2(d.r, n * 0.28));
    pts.push(new THREE.Vector2(d.r, n * 0.86));
    for (let i = 1; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(d.r * Math.sqrt(1 - t * t * 0.96), n * 0.86 + t * n * 0.14)); }
    const fus = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), lv.body);
    fus.rotation.x = Math.PI / 2;     // +y -> +z
    fus.position.set(0, d.cy, -n);
    fus.castShadow = true;
    body.add(fus);
    // cheatline + windows
    K.box(0.05, 0.26, n * 0.7, M.black, d.r * 0.98, d.cy + d.r * 0.25, -n * 0.47, body, { noShadow: true });
    K.box(0.05, 0.26, n * 0.7, M.black, -d.r * 0.98, d.cy + d.r * 0.25, -n * 0.47, body, { noShadow: true });
    K.box(0.06, 0.32, n * 0.75, lv.tail, d.r * 0.97, d.cy - d.r * 0.25, -n * 0.47, body, { noShadow: true });
    K.box(0.06, 0.32, n * 0.75, lv.tail, -d.r * 0.97, d.cy - d.r * 0.25, -n * 0.47, body, { noShadow: true });
    K.box(d.r * 1.1, 0.5, 0.8, M.black, 0, d.cy + d.r * 0.32, -1.6, body, { noShadow: true });
    // wings (right = -x, left = +x)
    const wroot = n * 0.4, half = d.span / 2 - d.r * 0.5, rootC = d.len * 0.2, tipC = rootC * 0.28, sweep = half * 0.55;
    const ws = wingShape(rootC, tipC, half, sweep);
    const wgeo = new THREE.ExtrudeGeometry(ws, { depth: 0.35, bevelEnabled: false });
    [1, -1].forEach((side) => {
      const w = new THREE.Mesh(wgeo, lv.body);
      w.rotation.x = Math.PI / 2;
      w.scale.x = side;
      w.position.set(side * d.r * 0.4, d.cy - d.r * 0.55, -wroot);
      w.rotation.z = 0;
      w.castShadow = true;
      const wg = new THREE.Group(); wg.add(w); wg.rotation.z = side * 0.06; body.add(wg);
      // engine
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(d.engR, d.engR * 0.85, d.engR * 3.4, 16), lv.accent);
      eng.rotation.x = Math.PI / 2;
      eng.position.set(side * d.engX, d.cy - d.r - d.engR * 0.4, -wroot - d.engX * 0.55 + d.engR * 1.8);
      eng.castShadow = true;
      body.add(eng);
      const inlet = new THREE.Mesh(new THREE.CircleGeometry(d.engR * 0.9, 14), M.black);
      inlet.position.set(eng.position.x, eng.position.y, eng.position.z + d.engR * 1.71);
      body.add(inlet);
      // nav light at the tip: left red (+x), right green (-x)
      const nl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), side > 0 ? navRed : navGreen);
      nl.position.set(side * d.span / 2, d.cy - d.r * 0.55 + Math.sin(0.06) * half, -wroot - sweep - tipC * 0.4);
      body.add(nl);
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), strobe);
      st.position.copy(nl.position); st.position.z -= 0.6;
      body.add(st);
      g.userData['strobe' + side] = st;
      // horizontal stabiliser
      const hs = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape(rootC * 0.45, rootC * 0.15, d.span * 0.16, d.span * 0.12), { depth: 0.2, bevelEnabled: false }), lv.body);
      hs.rotation.x = Math.PI / 2; hs.scale.x = side;
      hs.position.set(side * 0.3, d.cy + 0.4, -n * 0.88);
      body.add(hs);
    });
    // vertical fin
    const fs = new THREE.Shape();
    fs.moveTo(0, 0); fs.lineTo(-d.finH * 0.9, d.finH); fs.lineTo(-d.finH * 0.9 - d.finH * 0.35, d.finH); fs.lineTo(-n * 0.16, 0); fs.lineTo(0, 0);
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: 0.3, bevelEnabled: false }), lv.tail);
    fin.rotation.y = Math.PI / 2;
    fin.position.set(-0.15, d.cy + d.r * 0.6, -n * 0.8);
    fin.castShadow = true;
    body.add(fin);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), navRed);
    beacon.position.set(0, d.cy + d.r + 0.15, -n * 0.45);
    body.add(beacon);
    g.userData.beacon = beacon;
    // landing gear
    const gear = (x, z, r) => { const w = K.cyl(r, r, 0.5, M.rubber, x, 0, z, body); w.rotation.z = Math.PI / 2; w.position.y = r; K.cyl(0.12, 0.12, d.cy - d.r, M.steel, x, r, z, body); };
    gear(0, -3.5, 0.45);
    [-1, 1].forEach((s) => gear(s * d.r * 1.2, -wroot - rootC * 0.55, 0.65));
    g.add(body);
    g.userData.dim = d;
    return g;
  }

  // ---------- paths ----------
  function path(pts) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[2] || 0, p[1])), false, 'centripetal');
    c.arcLengthDivisions = 400;
    return { c, len: c.getLength() };
  }
  const TL = L.taxilaneZ, TW = L.taxiwayZ;
  const holdZ = RW.z + RW.w / 2 + 14;
  function inboundPath(g) {
    if (g.bus) return path([[RW.exitX, RW.z], [RW.exitX + 6, RW.z + 30], [RW.exitX + 30, TW], [-130, TW], [-120, TW + 8], [-120, TL - 6], [-128, -100], [-140, -84], [-152, -78.5], [L.remote.x - 8, L.remote.z]]);
    return path([[RW.exitX, RW.z], [RW.exitX + 6, RW.z + 30], [RW.exitX + 30, TW], [-130, TW], [-120, TW + 8], [-118, TL - 2], [-104, TL], [g.x - 26, TL], [g.x - 6, TL + 6], [g.x, TL + 20], [g.x, L.stand.noseZ - 18]]);
  }
  function standFinal(g) {
    if (g.bus) return null;
    return path([[g.x, L.stand.noseZ - 18], [g.x, L.stand.noseZ]]);
  }
  function pushPath(g) {
    return path([[g.x, L.stand.noseZ], [g.x, -96], [g.x - 7, -113], [g.x - 24, TL]]);
  }
  function taxiOutPath(g) {
    const start = g.bus ? [[L.remote.x - 8, L.remote.z], [L.remote.x - 26, L.remote.z - 2], [-196, -96], [-188, TL + 1], [-170, TL]] : [[g.x - 24, TL]];
    return path(start.concat([[g.x - 4, TL], [280, TL], [296, TL - 8], [300, TW + 10], [312, TW], [RW.holdX - 14, TW], [RW.holdX, TW - 12], [RW.holdX, holdZ]]));
  }
  const lineupPath = path([[RW.holdX, holdZ], [RW.holdX, RW.z + 6], [RW.holdX - 12, RW.z], [RW.holdX - 24, RW.z]]);
  const takeoffPath = path([[RW.holdX - 24, RW.z], [-600, RW.z]]);
  const approachPath = path([[RW.x1 + 1100, RW.z, 60], [RW.x1 + 400, RW.z, 22], [RW.x1 - 100, RW.z, 0], [RW.exitX + 20, RW.z, 0], [RW.exitX, RW.z, 0]]);

  // ---------- planes ----------
  A.spawnInbound = function (f) {
    const g = L.gates.find((x) => x.id === f.gate);
    const kind = f.wide ? 'wide' : 'narrow';
    const grp = build(kind, f.airline);
    root.add(grp);
    const p = { f, g, kind, grp, dim: DIM[kind], state: 'queued', s: 0, speed: 0, path: null, reverse: false, x: RW.x1 + 1100, z: RW.z, y: 60, heading: -Math.PI / 2, wait: 0 };
    grp.visible = false;
    f.plane = p;
    E.pick.add(grp, () => ({ entry: f.wide ? 'aircraft_wide' : 'aircraft_narrow', flight: f, plane: p }));
    A.planes.push(p);
    return p;
  };
  // door L1 in world space (left side is +x when the nose points +z)
  A.doorPos = function (p) {
    const d = p.dim, s = Math.sin(p.heading), c = Math.cos(p.heading);
    const lx = d.r + 0.05, lz = -d.doorAft;     // local (x, z)
    return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c, h: d.doorH };
  };
  // forward cargo hold (right side) for the belt loader
  A.holdPos = function (p) {
    const d = p.dim, s = Math.sin(p.heading), c = Math.cos(p.heading);
    const lx = -(d.r + 2.2), lz = -d.len * 0.25;
    return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c };
  };

  function follow(p, dt, maxSpeed, accel) {
    const ahead = blocked(p);
    const target = ahead ? 0 : maxSpeed;
    p.speed += SK.clamp(target - p.speed, -accel * 2.5 * dt, accel * dt);
    p.s = Math.min(p.path.len, p.s + p.speed * dt);
    const u = p.s / p.path.len;
    const pt = p.path.c.getPointAt(u), tg = p.path.c.getTangentAt(u);
    p.x = pt.x; p.z = pt.z; p.y = pt.y;
    const h = Math.atan2(tg.x, tg.z) + (p.reverse ? Math.PI : 0);
    p.heading = h;
    return p.s >= p.path.len - 0.01;
  }
  // stop if another aircraft is close ahead in the direction of motion
  function blocked(p) {
    if (p.state === 'pushback' || p.state === 'takeoff' || p.state === 'approach' || p.state === 'rollout' || p.state === 'lineup') return false;
    const mdx = Math.sin(p.heading) * (p.reverse ? -1 : 1), mdz = Math.cos(p.heading) * (p.reverse ? -1 : 1);
    for (const o of A.planes) {
      if (o === p || !o.grp.visible || o.state === 'parked' || o.state === 'queued' || o.state === 'approach' || o.state === 'takeoff') continue;
      const dx = o.x - p.x, dz = o.z - p.z;
      const fwd = dx * mdx + dz * mdz;
      if (fwd <= 0 || fwd > 75) continue;
      const lat = Math.abs(dx * mdz - dz * mdx);
      if (lat < 30) {
        // tie-break so two aircraft never wait on each other forever
        if (blockedBy(o, p) && o.id < p.id) continue;
        return true;
      }
    }
    return false;
  }
  function blockedBy(o, p) {
    const mdx = Math.sin(o.heading), mdz = Math.cos(o.heading);
    const dx = p.x - o.x, dz = p.z - o.z, fwd = dx * mdx + dz * mdz;
    return fwd > 0 && fwd < 75 && Math.abs(dx * mdz - dz * mdx) < 30;
  }
  let nextId = 1;
  function standFree(p) {
    return !A.planes.some((o) => o !== p && o.g === p.g && o.f.std < p.f.std && !o.f.departed && (o.state === 'parked' || o.state === 'parking' || o.state === 'pushback' || o.state === 'taxiIn' && o.s > o.path.len - 60));
  }

  A.update = function (dt, now) {
    const w = SK.sky.ops();
    for (const p of A.planes) {
      if (!p.id) p.id = nextId++;
      const f = p.f;
      switch (p.state) {
        case 'queued':
          // start the approach when due, the runway is free and nobody is lined up
          if (now >= f.inboundAt && !A.runwayHolder) {
            A.runwayHolder = p;
            p.state = 'approach'; p.path = approachPath; p.s = 0; p.speed = 75 * A.AIR * 0.55; p.grp.visible = true;
          }
          break;
        case 'approach':
          p.speed = SK.lerp(p.speed, 72 * A.AIR * 0.55, dt);
          if (p.x < RW.x1 - 100) { p.state = 'rollout'; }
          follow(p, dt, p.speed, 30);
          break;
        case 'rollout': {
          const done = follow(p, dt, 14 * A.AIR, 12);
          p.speed = Math.max(14 * A.AIR, p.speed - 16 * A.AIR * dt);
          if (done) {
            p.state = 'taxiIn'; p.path = inboundPath(p.g); p.s = 0; p.speed = 10;
            if (A.runwayHolder === p) A.runwayHolder = null;
            SK.bus.emit('ops', { t: now, kind: 'land', msg: f.num + ' landed on 27, taxiing to ' + (p.g.bus ? 'remote stand R1' : 'stand ' + p.g.id) });
          }
          break;
        }
        case 'taxiIn': {
          // wait short of the stand while the previous aircraft is still on it
          const near = p.s > p.path.len - 70;
          if (near && !standFree(p)) { p.speed = Math.max(0, p.speed - 20 * dt); if (!p.waitLogged) { p.waitLogged = true; SK.bus.emit('ops', { t: now, kind: 'warn', msg: f.num + ' holding: stand ' + p.g.id + ' still occupied' }); } break; }
          if (follow(p, dt, 9 * A.AIR * w.taxi, 4)) {
            if (p.g.bus) { arrive(p, now); } else { p.state = 'parking'; p.path = standFinal(p.g); p.s = 0; }
          }
          break;
        }
        case 'parking':
          if (follow(p, dt, 2.2, 1.5)) arrive(p, now);
          break;
        case 'parked':
          if (f.pushApproved) {
            if (p.g.bus) { p.state = 'taxiOut'; p.path = taxiOutPath(p.g); p.s = 0; p.reverse = false; p.speed = 0; offBlock(p, now); }
            else if (SK.airfield.bridgeClear(p.g.id)) { p.state = 'pushback'; p.path = pushPath(p.g); p.s = 0; p.reverse = true; p.speed = 0; offBlock(p, now); }
          }
          break;
        case 'pushback':
          if (follow(p, dt, 2.6 * A.AIR * 0.6, 0.8)) { p.state = 'startup'; p.wait = 4; }
          break;
        case 'startup':
          p.wait -= dt;
          if (p.wait <= 0) { p.state = 'taxiOut'; p.path = taxiOutPath(p.g); p.s = 0; p.reverse = false; p.speed = 0; }
          break;
        case 'taxiOut':
          if (follow(p, dt, 10 * A.AIR * w.taxi, 4)) {
            p.state = 'holding';
            if (w.deice && !p.deiced) { p.wait = 10; p.deicing = true; SK.bus.emit('ops', { t: now, kind: 'warn', msg: f.num + ' de-icing at the holding point' }); }
          }
          break;
        case 'holding':
          if (p.wait > 0) { p.wait -= dt; break; }
          p.deiced = true;
          if (!A.runwayHolder) {
            A.runwayHolder = p;
            p.state = 'lineup'; p.path = lineupPath; p.s = 0; p.speed = 4;
          }
          break;
        case 'lineup':
          if (follow(p, dt, 5 * A.AIR, 3)) { p.state = 'takeoff'; p.path = takeoffPath; p.s = 0; p.speed = 2; SK.bus.emit('ops', { t: now, kind: 'go', msg: f.num + ' cleared for take-off runway 27' }); }
          break;
        case 'takeoff': {
          // straight roll down 27, rotate, climb out; no path so altitude is not reset
          p.speed += 9 * A.AIR * dt;
          p.x -= p.speed * dt; p.z = RW.z; p.heading = -Math.PI / 2;
          const dist = RW.holdX - 24 - p.x;
          if (dist > 560) { p.y += p.speed * 0.18 * dt; p.pitch = Math.min(0.18, (p.pitch || 0) + dt * 0.25); }
          if (dist > 820 && A.runwayHolder === p) A.runwayHolder = null;
          if (p.y > 260 || p.x < -2200) { p.state = 'gone'; f.departed = true; f.airborneAt = now; SK.bus.emit('departed', f); }
          break;
        }
      }
      // pose
      const grp = p.grp;
      grp.position.set(p.x, p.y || 0, p.z);
      grp.rotation.set(0, p.heading, 0);
      if (p.state === 'approach') grp.rotateX(-0.04);
      if (p.pitch) grp.rotateX(-p.pitch);
      const beaconOn = p.state !== 'parked' || f.pushApproved;
      const blink = (performance.now() + p.id * 377) % 1100 < 120;
      grp.userData.beacon.visible = beaconOn && blink;
      const sOn = (p.state === 'takeoff' || p.state === 'approach' || p.state === 'lineup' || p.state === 'rollout') && (performance.now() + p.id * 200) % 900 < 70;
      grp.userData['strobe1'].visible = sOn; grp.userData['strobe-1'].visible = sOn;
    }
    // drop finished planes
    for (let i = A.planes.length - 1; i >= 0; i--) {
      const p = A.planes[i];
      if (p.state !== 'gone') continue;
      root.remove(p.grp); E.pick.remove(p.grp);
      p.grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      A.planes.splice(i, 1);
    }
  };
  // abort an approach: the aircraft climbs away, re-enters the arrival sequence a few minutes later
  A.goAround = function (p) {
    if (p.state !== 'approach' && p.state !== 'queued') return;
    if (A.runwayHolder === p) A.runwayHolder = null;
    p.state = 'queued'; p.grp.visible = false; p.s = 0;
    p.f.inboundAt = SK.sim.now + SK.minutes(9);
    SK.bus.emit('ops', { t: SK.sim.now, kind: 'warn', msg: p.f.num + ' going around; re-sequenced for another approach' });
  };
  function arrive(p, now) {
    p.state = 'parked'; p.speed = 0;
    p.f.blockIn = now;
    if (!p.g.bus) SK.airfield.dock(p.g.id, A.doorPos(p));
    SK.bus.emit('ops', { t: now, kind: 'info', msg: p.f.num + ' on blocks at ' + (p.g.bus ? 'R1' : p.g.id) + ', turnaround started' });
    SK.bus.emit('blockIn', p);
  }
  function offBlock(p, now) {
    p.f.offBlock = true;
    p.f.offBlockAt = now;
    p.f.delayMin = Math.max(0, Math.round((now - p.f.std) / 60));
    SK.bus.emit('offBlock', p.f);
  }
  A.root = root;
  return A;
})();
