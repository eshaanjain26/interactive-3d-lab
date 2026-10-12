// SkyOps support and back of house (pass 3): cargo terminal + freighter turns, maintenance hangar,
// fuel farm + hydrant dispensers, ARFF fire station + response drills, operations centre video wall, utility plant.
SK.support = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine, AG = SK.agents, RW = L.runway;
  const now = () => SK.sim.now;
  const S = { stats: { cargoT: 0, ulds: 0, freighters: 0, fuelL: 0, fuelings: 0, drills: [] }, freighters: [] };
  const root = new THREE.Group(); root.name = 'support';
  E.scene.add(root);
  const B = new K.Batch();
  const roof = new THREE.Group(); roof.visible = false; root.add(roof);
  const RB = new K.Batch();
  S.roof = roof;
  const red = new THREE.MeshStandardMaterial({ color: 0xc8261f, roughness: 0.45, metalness: 0.2 });
  const cargoBlue = new THREE.MeshStandardMaterial({ color: 0x2b5c8a, roughness: 0.6 });

  // =============== CARGO TERMINAL ===============
  const C1 = { id: 'C1', x: 345, noseZ: -66, cargo: true, wide: true };
  L.cargoStand = C1;
  K.ground(104, 74, M.apron, 341, 0.016, -96, root);
  B.box(0.3, 0.02, -66 - L.taxilaneZ, M.yellowMark, C1.x, 0.025, (-66 + L.taxilaneZ) / 2);
  B.box(4, 0.02, 0.4, M.yellowMark, C1.x, 0.025, C1.noseZ - 1.2);
  K.paint('C1', 6, 4, '#f1c232', root, C1.x - 6, C1.noseZ - 8, Math.PI);
  // warehouse: walls, airside doors, interior racks, bonded cage, truck docks
  const CW = { x0: 300, x1: 380, z0: -60, z1: -30, h: 13 };
  B.box(CW.x1 - CW.x0, 0.2, CW.z1 - CW.z0, M.concrete, (CW.x0 + CW.x1) / 2, 0, (CW.z0 + CW.z1) / 2);
  [[CW.x0, CW.z0, CW.x0, CW.z1], [CW.x1, CW.z0, CW.x1, CW.z1]].forEach(([x0, z0, , z1]) => B.box(0.4, CW.h, z1 - z0, cargoBlue, x0, 0, (z0 + z1) / 2));
  const doorsX = [315, 330, 345, 360];
  // north (airside) wall with door openings
  let last = CW.x0;
  doorsX.forEach((x) => { B.box(x - 4 - last, CW.h, 0.4, cargoBlue, (last + x - 4) / 2, 0, CW.z0); B.box(8, CW.h - 6, 0.4, cargoBlue, x, 6, CW.z0); B.box(8, 0.05, 1.2, M.yellowMark, x, 0.02, CW.z0 - 1); last = x + 4; });
  B.box(CW.x1 - last, CW.h, 0.4, cargoBlue, (last + CW.x1) / 2, 0, CW.z0);
  B.box(CW.x1 - CW.x0, CW.h * 0.55, 0.4, cargoBlue, (CW.x0 + CW.x1) / 2, 0, CW.z1);
  RB.box(CW.x1 - CW.x0 + 2, 0.5, CW.z1 - CW.z0 + 2, M.roof, (CW.x0 + CW.x1) / 2, CW.h, (CW.z0 + CW.z1) / 2);
  for (let x = 304; x < 350; x += 7) for (let lvl = 0; lvl < 3; lvl++) {
    B.box(6, 0.15, 2.4, M.darkSteel, x + 3, lvl * 2.6 + 1.2, -36);
    if (SK.rng.chance(0.75)) B.box(1.5, 1.4, 1.5, SK.rng.pick([M.goods2, M.goods3, M.steel, M.white]), x + 1.5 + (lvl % 2) * 2.4, lvl * 2.6 + 1.35, -36);
  }
  B.box(0.2, 0.02, 24, M.yellowMark, 352, 0.03, -45);
  for (let z = -56; z <= -34; z += 2) B.cyl(0.05, 2.4, M.steel, 354, 0, z, 6);
  for (let x = 354; x <= 378; x += 2) B.cyl(0.05, 2.4, M.steel, x, 0, -56, 6);
  B.box(24, 2.2, 0.04, new THREE.MeshStandardMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.35 }), 366, 0.1, -56);
  for (let i = 0; i < 6; i++) B.box(1.5, 1.6, 1.5, i % 2 ? M.goods : M.goods2, 360 + (i % 3) * 5, 0, -50 + Math.floor(i / 3) * 7);
  const bs = K.sign(['BONDED', 'Customs control'], 5, 1.4, { bg: '#7a1f1f', font: 'bold 80px system-ui, sans-serif' });
  bs.position.set(366, 3.4, -56.1); bs.rotation.y = Math.PI; root.add(bs);
  const cs = K.sign(['SKY CARGO', 'Import · Export · Bonded'], 16, 2.6, { bg: '#16324f', font: 'bold 70px system-ui, sans-serif', accent: '#f2b134' });
  cs.position.set(340, CW.h + 2, CW.z0 - 0.3); cs.rotation.y = Math.PI; root.add(cs);
  // truck docks on the landside face
  for (let i = 0; i < 3; i++) {
    const x = 315 + i * 18;
    B.box(2.6, 3.6, 13, M.white, x, 0.9, -21);
    B.box(2.6, 2.8, 3.4, M.darkSteel, x, 0.6, -12.5);
  }
  K.hit(CW.x1 - CW.x0, CW.h, CW.z1 - CW.z0, (CW.x0 + CW.x1) / 2, 0, (CW.z0 + CW.z1) / 2, root, 'cargo');
  K.hit(24, 2.6, 22, 366, 0, -45, root, 'bonded');
  K.hit(104, 0.1, 70, 341, 0, -96, root, 'cargo');
  // forklifts shuttling inside the warehouse
  function forklift() {
    const g = new THREE.Group();
    K.box(1.2, 1.1, 2.2, M.orange, 0, 0.2, 0, g);
    K.box(1.1, 0.06, 1.1, M.darkSteel, 0, 2.2, 0, g);
    K.box(0.08, 2.4, 0.08, M.darkSteel, -0.4, 0.2, 1.2, g); K.box(0.08, 2.4, 0.08, M.darkSteel, 0.4, 0.2, 1.2, g);
    K.box(1, 0.06, 1.2, M.darkSteel, 0, 0.35, 1.8, g);
    const load = K.box(1.2, 1, 1.2, M.goods3, 0, 0.4, 1.8, g);
    g.userData.load = load;
    root.add(g); E.pick.add(g, 'cargo');
    return g;
  }
  const forks = [0, 1].map((i) => ({ g: forklift(), a: { x: 310 + i * 20, z: -40 }, b: { x: 320 + i * 20, z: -55 }, t: i * 3, laden: i }));
  S.agentsPosts = [];
  [[330, -63, 'r_cargo'], [345, -63, 'r_cargo'], [362, -48, 'r_customs'], [318, -45, 'r_cargo'], [336, -40, 'r_cargo']].forEach(([x, z, r]) => S.agentsPosts.push(AG.post(r, x, z, Math.PI, null, r === 'r_customs' ? 'idle' : 'work')));

  // ULD dolly trains and high loader
  const uldMats = [M.steel, new THREE.MeshStandardMaterial({ color: 0xb8bfc6, metalness: 0.5, roughness: 0.4 }), M.goods2];
  function dollyTrain() {
    const g = new THREE.Group();
    K.box(1.6, 1, 2.4, M.yellow, 0, 0.3, 3.4, g);
    K.box(1.4, 0.9, 0.9, M.glassDark, 0, 1.3, 2.9, g);
    const ulds = [];
    for (let i = 0; i < 3; i++) {
      const z = -i * 3.4;
      K.box(2, 0.25, 2.8, M.darkSteel, 0, 0.35, z, g);
      const u = K.box(1.6, 1.6, 1.55, uldMats[i % 3], 0, 0.6, z, g);
      u.userData.pick = 'uld'; E.pick.add(u, 'uld');
      ulds.push(u);
    }
    g.userData.ulds = ulds;
    root.add(g);
    return g;
  }
  const train = { g: dollyTrain(), state: 'home', load: 0, s: 0, path: null };
  train.g.position.set(330, 0, -64); train.g.rotation.y = Math.PI;
  const kl = new THREE.Group();
  K.box(3, 0.8, 5, M.yellow, 0, 0.2, 0, kl);
  const deck = K.box(3, 0.3, 4.6, M.darkSteel, 0, 1.0, 0, kl);
  K.box(0.3, 1.2, 0.3, M.darkSteel, -1, 0.2, 0, kl); K.box(0.3, 1.2, 0.3, M.darkSteel, 1, 0.2, 0, kl);
  kl.visible = false; root.add(kl);
  E.pick.add(kl, 'kloader');
  function mainDeckDoor(p) {
    const d = p.dim, s = Math.sin(p.heading), c = Math.cos(p.heading);
    const lx = d.r + 2.6, lz = -d.len * 0.72;
    return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c, h: d.cy + d.r * 0.4 };
  }
  function trainPath(from, to) {
    const mid = { x: (from.x + to.x) / 2 + 6, z: (from.z + to.z) / 2 };
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(from.x, 0, from.z), new THREE.Vector3(mid.x, 0, mid.z), new THREE.Vector3(to.x, 0, to.z)], false, 'centripetal');
    return { c, len: c.getLength() };
  }

  // freighter schedule: three turns a day, built for three days
  const CARGO_AL = { code: 'SC', name: 'SkyOps Cargo', color: 0x2b2b2b, tail: 0xf2b134 };
  const CDEST = [['LEJ', 'Leipzig'], ['ANC', 'Anchorage'], ['HKG', 'Hong Kong'], ['MIA', 'Miami'], ['CVG', 'Cincinnati'], ['DXB', 'Dubai']];
  for (let d = 0; d < 3; d++) [[9, 40], [15, 10], [21, 30]].forEach(([h, m], i) => {
    const std = SK.minutes((d * 24 + h) * 60 + m), dest = CDEST[(d * 3 + i) % CDEST.length];
    S.freighters.push({ id: 'CF' + d + i, airline: CARGO_AL, num: 'SC ' + (901 + d * 3 + i), dest: dest[0], city: dest[1], gate: 'C1', gateObj: C1, wide: true, cargo: true,
      std, etd: std, inboundAt: std - SK.minutes(150), delayMin: 0, boarded: 0, figures: 0, pax: 0, bagsAccepted: 0, bagsLoaded: 0, bagsShort: 0, imports: SK.rng.int(9, 15), exports: SK.rng.int(9, 15) });
  });
  function freighterTurn(f, dt) {
    const t = now(), p = f.plane;
    if (!p && t >= f.inboundAt - 60 && !f.spawned) {
      // the inbound freighter must not take the stand while the previous one is still on it
      if (S.freighters.some((o) => o !== f && o.plane && !o.departed && !o.offBlock)) return;
      f.spawned = true; f.inboundAt = Math.max(f.inboundAt, t);
      SK.aircraft.spawnInbound(f);
    }
    if (!p || p.state !== 'parked' || f.pushApproved) return;
    const door = mainDeckDoor(p);
    kl.visible = true; kl.position.set(door.x + 2.4, 0, door.z); kl.rotation.y = p.heading + Math.PI / 2;
    deck.position.y = 1 + (door.h - 1.3) * (0.5 + 0.5 * Math.sin(t / 40));
    if (!f.cargoPhase) { f.cargoPhase = 'import'; f.left = f.imports; SK.bus.emit('ops', { t, kind: 'info', msg: f.num + ' freighter on blocks at C1: unloading ' + f.imports + ' import ULDs' }); }
    // one dolly train shuttles between the main-deck door and the warehouse doors
    const homeDoor = { x: doorsX[f.left % doorsX.length], z: CW.z0 - 3 };
    const side = { x: door.x + 6, z: door.z };
    const tr = train;
    if (tr.state === 'home') {
      tr.state = 'toPlane'; tr.path = trainPath(homeDoor, side); tr.s = 0;
      tr.load = f.cargoPhase === 'export' ? Math.min(3, f.left) : 0;
    }
    if (tr.state === 'toPlane' || tr.state === 'toShed') {
      tr.s = Math.min(tr.path.len, tr.s + 6 * dt);
      const u = tr.s / tr.path.len, pt = tr.path.c.getPointAt(u), tg = tr.path.c.getTangentAt(u);
      tr.g.position.set(pt.x, 0, pt.z); tr.g.rotation.y = Math.atan2(tg.x, tg.z);
      if (tr.s >= tr.path.len) { tr.state = tr.state === 'toPlane' ? 'atPlane' : 'atShed'; tr.wait = 5; }
    }
    if (tr.state === 'atPlane' || tr.state === 'atShed') {
      tr.wait -= dt;
      if (tr.wait <= 0) {
        if (tr.state === 'atPlane') {
          const n = f.cargoPhase === 'import' ? Math.min(3, f.left) : tr.load;
          if (f.cargoPhase === 'import') tr.load = n;
          f.left -= n; tuck(n);
          tr.state = 'toShed'; tr.path = trainPath(side, homeDoor); tr.s = 0;
        } else {
          tr.load = 0;
          if (f.left <= 0) {
            if (f.cargoPhase === 'import') { f.cargoPhase = 'export'; f.left = f.exports; SK.bus.emit('ops', { t, kind: 'info', msg: f.num + ' imports in the bonded area; loading ' + f.exports + ' export ULDs to ' + f.city }); }
            else if (f.cargoPhase === 'export') {
              f.cargoPhase = 'done'; kl.visible = false;
              if (t >= f.std - SK.minutes(5)) { f.pushApproved = true; S.stats.freighters++; SK.bus.emit('ops', { t, kind: 'go', msg: f.num + ' loaded and closed up: pushback approved from C1' }); }
            }
          }
          tr.state = 'home';
        }
      }
    }
    if (f.cargoPhase === 'done' && !f.pushApproved && t >= f.std - SK.minutes(5)) { f.pushApproved = true; S.stats.freighters++; SK.bus.emit('ops', { t, kind: 'go', msg: f.num + ' pushback approved from C1' }); }
    tr.g.userData.ulds.forEach((u, i) => (u.visible = i < tr.load));
  }
  function tuck(n) { for (let i = 0; i < n; i++) { S.stats.ulds++; S.stats.cargoT += SK.rng.range(1.2, 5.5); } }

  // =============== MAINTENANCE HANGAR ===============
  const HG = { x0: -350, x1: -250, z0: -120, z1: -40, h: 22 };
  K.ground(HG.x1 - HG.x0, HG.z1 - HG.z0, M.concrete, -300, 0.03, -80, root);
  K.ground(100, 30, M.apron, -300, 0.016, -135, root);
  B.box(0.6, HG.h, HG.z1 - HG.z0, M.wall, HG.x0, 0, -80);
  B.box(0.6, HG.h, HG.z1 - HG.z0, M.wall, HG.x1, 0, -80);
  B.box(HG.x1 - HG.x0, HG.h, 0.6, M.wall, -300, 0, HG.z1);
  B.box(16, HG.h, 1, M.steel, HG.x0 + 8, 0, HG.z0);
  B.box(16, HG.h, 1, M.steel, HG.x1 - 8, 0, HG.z0);
  B.box(HG.x1 - HG.x0, 4, 1, M.steel, -300, HG.h - 4, HG.z0);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, HG.z1 - HG.z0, 28, 1, true, -Math.PI / 2, Math.PI), M.steel);
  arch.rotation.x = Math.PI / 2; arch.scale.set(1, 1, 0.18); arch.position.set(-300, HG.h, -80);
  arch.material = new THREE.MeshStandardMaterial({ color: 0xb8bfc6, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
  roof.add(arch);
  const hs = K.sign(['SKY ENGINEERING', 'Line and base maintenance'], 22, 3, { bg: '#16324f', font: 'bold 70px system-ui, sans-serif', accent: '#f2b134' });
  hs.position.set(-300, HG.h - 2, HG.z0 - 0.6); hs.rotation.y = Math.PI; root.add(hs);
  for (let z = HG.z0 + 8; z < HG.z1; z += 12) for (let x = HG.x0 + 15; x < HG.x1; x += 25) RB.box(8, 0.1, 0.3, M.lightStrip, x, HG.h - 1, z);
  // aircraft on a check: nose toward the back wall, one engine cowl open, work stands and a tail dock
  const mro = SK.aircraft.build('narrow', { code: 'NW', name: 'Northwind', color: 0x1d7a5f, tail: 0xe8eef2 });
  mro.position.set(-300, 0, -50); root.add(mro);
  E.pick.add(mro, 'mro_aircraft');
  const D = SK.aircraft.DIM.narrow;
  const engZ = -50 - D.len * 0.4 - D.engX * 0.55 + D.engR * 1.8;
  [-1, 1].forEach((s) => {
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 2.6), M.steel);
    cowl.position.set(-300 + D.engX + s * 1.4, D.cy - D.r - 0.2, engZ); cowl.rotation.z = s * 0.9; root.add(cowl);
  });
  [[-300 + D.engX, engZ, 3], [-300 - D.engX, engZ, 3], [-300, -50 - D.len * 0.82, 6]].forEach(([x, z, h]) => {
    B.box(3.6, 0.15, 3.2, M.yellow, x, h, z);
    [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]].forEach(([dx, dz]) => B.box(0.12, h, 0.12, M.yellow, x + dx, 0, z + dz));
  });
  B.box(10, 0.3, 4, M.yellow, -300, 9, -50 - D.len * 0.86);
  B.box(4, 1, 2, M.darkSteel, -285, 0, -60); B.box(3, 1.6, 2, M.white, -316, 0, -56);
  const mechs = [];
  const mroSpots = [[-300 + D.engX + 1.5, engZ + 2.5], [-300 - D.engX - 1.5, engZ + 2], [-300, -46], [-296, -50 - D.len * 0.82], [-306, -72], [-292, -66], [-310, -60]];
  for (let i = 0; i < 6; i++) {
    const [x, z] = mroSpots[i];
    const a = AG.make({ role: 'r_mechanic', x, z, kind: 'staff', anim: 'work' });
    a.look.torso = 0x2a4f7a; a.look.band = 0xd8e03a; a.look.legs = 0x2a4f7a;
    a.script = (function* () {
      for (;;) {
        const sp = SK.rng.pick(mroSpots);
        AG.setPath(a, [{ x: sp[0] + SK.rng.range(-1, 1), z: sp[1] + SK.rng.range(-1, 1) }]);
        yield AG.ARRIVE;
        a.anim = 'work'; a.workAnim = 'work';
        yield AG.waitSim(SK.rng.range(300, 900));
      }
    })();
    mechs.push(a);
  }
  K.hit(HG.x1 - HG.x0, HG.h, HG.z1 - HG.z0, -300, 0, -80, root, 'hangar');
  S.mroDay = 9;

  // =============== FUEL FARM + DISPENSERS ===============
  const FF = { x0: 330, x1: 390, z0: 40, z1: 100 };
  K.ground(FF.x1 - FF.x0 + 10, FF.z1 - FF.z0 + 10, M.concrete, 360, 0.02, 70, root);
  [[FF.x0, FF.z0, FF.x1, FF.z0], [FF.x0, FF.z1, FF.x1, FF.z1], [FF.x0, FF.z0, FF.x0, FF.z1], [FF.x1, FF.z0, FF.x1, FF.z1]].forEach(([x0, z0, x1, z1]) => B.box(Math.max(0.6, x1 - x0), 1.4, Math.max(0.6, z1 - z0), M.concrete, (x0 + x1) / 2, 0, (z0 + z1) / 2));
  for (let i = 0; i < 4; i++) {
    const x = 348 + (i % 2) * 24, z = 57 + Math.floor(i / 2) * 26;
    B.cyl(9, 12, M.white, x, 0, z, 28);
    B.cyl(9.2, 0.4, M.steel, x, 12, z, 28);
    const lbl = K.sign('JET A-1  T' + (i + 1), 6, 1.2, { bg: '#1d1d1d', fg: '#f2c94c', font: 'bold 90px system-ui, sans-serif' });
    lbl.position.set(x, 7, z + 9.1); root.add(lbl);
  }
  B.box(8, 4, 6, M.wallDark, 336, 0, 46);
  // pipe rack to the apron hydrant ring main
  // overhead pipe rack: around the arrivals building and over the pickup road and the arrivals corridor at 8.8 m
  [[336, 46, 320, 46], [320, 46, 320, 58], [320, 58, 178, 58], [178, 58, 178, -30]].forEach(([x0, z0, x1, z1]) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0);
    B.add(K.geo.cyl(0.35, len, 10).clone().rotateZ(Math.PI / 2), M.yellow, K.matrix((x0 + x1) / 2, 8.8, (z0 + z1) / 2, ang));
    for (let k = 0; k <= len; k += 12) B.box(0.25, 8.8, 0.25, M.darkSteel, x0 + (x1 - x0) * (k / len), 0, z0 + (z1 - z0) * (k / len));
  });
  const tanker = new THREE.Group();
  K.box(2.6, 2.4, 9, M.white, 0, 0.9, -1.5, tanker); K.box(2.6, 2.6, 2.6, M.red, 0, 0.6, 4.3, tanker);
  tanker.position.set(372, 0, 104); root.add(tanker);
  K.hit(FF.x1 - FF.x0, 12, FF.z1 - FF.z0, 360, 0, 70, root, 'fuel');
  const fs = K.sign(['SKY FUEL FARM', 'Jet A-1 · Hydrant supply'], 12, 2.2, { bg: '#1d1d1d', fg: '#f2c94c', font: 'bold 70px system-ui, sans-serif' });
  fs.position.set(360, 16, FF.z1 + 1); root.add(fs);
  function dispenser() {
    const g = new THREE.Group();
    K.box(2.2, 1.2, 5, M.white, 0, 0.4, 0, g);
    K.box(2.2, 1.6, 1.6, M.red, 0, 0.4, 2.2, g);
    K.box(1.6, 0.15, 1.6, M.steel, 0, 2.6, -1.2, g);
    K.box(0.1, 1.2, 0.1, M.yellow, 0, 1.6, -1.8, g);
    g.visible = false; root.add(g); E.pick.add(g, 'dispenser');
    return g;
  }
  const disp = {};
  function fuelStand(p) {
    const f = p.f;
    if (!f || f.cargo && false) return;
    const g = disp[p.g.id] || (disp[p.g.id] = dispenser());
    const t = now();
    const start = f.blockIn + SK.minutes(10), end = f.blockIn + SK.minutes(f.wide ? 45 : 32);
    const on = p.state === 'parked' && t >= start && t < end;
    g.visible = on;
    if (on) {
      const d = p.dim, s = Math.sin(p.heading), c = Math.cos(p.heading);
      const lx = -(d.r + 6), lz = -d.len * 0.45;
      g.position.set(p.x + lx * c + lz * s, 0, p.z - lx * s + lz * c);
      g.rotation.y = p.heading;
    }
    if (p.state === 'parked' && t >= end && !f.fuelled) {
      f.fuelled = true;
      const litres = Math.round((f.wide ? 80000 : 12000) * SK.rng.range(0.8, 1.15) / 100) * 100;
      S.stats.fuelL += litres; S.stats.fuelings++;
    }
  }

  // =============== ARFF FIRE STATION ===============
  const FS = { x0: 20, x1: 60, z0: -186, z1: -166, h: 8 };
  K.ground(60, 30, M.apron, 40, 0.02, -190, root);
  B.box(FS.x1 - FS.x0, FS.h, 0.4, M.wall, 40, 0, FS.z1);
  B.box(0.4, FS.h, FS.z1 - FS.z0, M.wall, FS.x0, 0, -176);
  B.box(0.4, FS.h, FS.z1 - FS.z0, M.wall, FS.x1, 0, -176);
  const bays = [28, 40, 52];
  bays.forEach((x, i) => { B.box(i === 0 ? 4 : 6, FS.h - 5, 0.4, red, x - 6 + (i === 0 ? 2 : 0), 5, FS.z0); });
  B.box(FS.x1 - FS.x0, FS.h - 5, 0.4, red, 40, 5, FS.z0);
  RB.box(FS.x1 - FS.x0 + 1, 0.4, FS.z1 - FS.z0 + 1, M.roof, 40, FS.h, -176);
  K.box(3, 12, 3, red, 58, 0, -168, root);
  const fsg = K.sign(['ARFF STATION 1', 'Airport Fire Service'], 12, 1.8, { bg: '#7a1f1f', font: 'bold 70px system-ui, sans-serif' });
  fsg.position.set(40, FS.h + 1.4, FS.z0 - 0.3); fsg.rotation.y = Math.PI; root.add(fsg);
  K.hit(FS.x1 - FS.x0, FS.h, FS.z1 - FS.z0, 40, 0, -176, root, 'fire');
  function crashTender() {
    const g = new THREE.Group();
    K.box(3, 2.4, 11, red, 0, 0.9, 0, g);
    K.box(3.1, 1.1, 2.4, M.glassDark, 0, 2.1, 4.4, g);
    K.box(0.6, 0.6, 1.4, M.steel, 0, 3.3, 2.6, g);
    [-3.6, 0, 3.6].forEach((z) => [-1.5, 1.5].forEach((x) => { const w = K.cyl(0.65, 0.65, 0.5, M.rubber, x, 0, z, g); w.rotation.z = Math.PI / 2; w.position.y = 0.65; }));
    K.box(3.05, 0.2, 11, M.yellow, 0, 1.6, 0, g);
    root.add(g); E.pick.add(g, 'arff_truck');
    return g;
  }
  const trucks = bays.map((x) => ({ g: crashTender(), home: { x, z: -177 }, state: 'home', s: 0, path: null }));
  trucks.forEach((t) => { t.g.position.set(t.home.x, 0, t.home.z); t.g.rotation.y = Math.PI; });
  bays.forEach((x) => S.agentsPosts.push(AG.post('r_firefighter', x + 2.2, FS.z0 - 1.5, Math.PI, () => trucks.every((t) => t.state === 'home'), 'idle')));
  // water spray particles
  const SPN = 600;
  const spPos = new Float32Array(SPN * 3), spVel = new Float32Array(SPN * 3), spLife = new Float32Array(SPN);
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xe8f4ff, size: 0.5, transparent: true, opacity: 0.85 }));
  spray.frustumCulled = false; root.add(spray);
  let spIdx = 0;
  S.drill = function (target, label) {
    const t0 = now();
    S.drillState = { target, label: label || 'Response drill', t0, arrived: null };
    trucks.forEach((tr, i) => {
      const tgt = { x: target.x + (i - 1) * 14, z: target.z + 22 + (i % 2) * 6 };
      const pts = [[tr.home.x, tr.home.z], [tr.home.x, -194], [(tr.home.x + tgt.x) / 2, -198], [tgt.x, tgt.z]];
      tr.path = { c: new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal') };
      tr.path.len = tr.path.c.getLength();
      tr.state = 'out'; tr.s = 0; tr.speed = 0; tr.delay = i * 1.2; tr.target = target;
    });
    SK.bus.emit('ops', { t: t0, kind: 'warn', msg: 'ARFF turn-out: ' + (label || 'response drill') });
  };
  S.recall = function () { trucks.forEach((tr) => { if (tr.state !== 'home') { tr.state = 'back'; tr.s = tr.path.len; } }); S.drillState = null; };
  function updateTrucks(dt) {
    let allThere = true;
    trucks.forEach((tr) => {
      if (tr.state === 'home') return;
      if (tr.delay > 0) { tr.delay -= dt; allThere = false; return; }
      if (tr.state === 'out') {
        tr.speed = Math.min(25, tr.speed + 6 * dt);
        tr.s = Math.min(tr.path.len, tr.s + tr.speed * dt);
        if (tr.s >= tr.path.len) tr.state = 'spray'; else allThere = false;
      } else if (tr.state === 'back') {
        tr.s = Math.max(0, tr.s - 12 * dt);
        if (tr.s <= 0) { tr.state = 'home'; tr.g.position.set(tr.home.x, 0, tr.home.z); tr.g.rotation.y = Math.PI; return; }
      }
      const u = tr.s / tr.path.len, pt = tr.path.c.getPointAt(u), tg = tr.path.c.getTangentAt(u);
      tr.g.position.set(pt.x, 0, pt.z);
      tr.g.rotation.y = Math.atan2(tg.x, tg.z);
    });
    const d = S.drillState;
    if (d && !d.arrived && trucks.some((tr) => tr.state === 'spray')) {
      d.arrived = true;
      // trucks move at real road speed, so the travel time is reported in real seconds (scaled-down runway)
      const secs = trucks.filter((tr) => tr.state === 'spray').length && Math.round(S.drillGame || 0);
      S.stats.drills.push(secs);
      SK.bus.emit('ops', { t: now(), kind: 'go', msg: 'First crash tender in position after ' + secs + ' s on this scaled-down runway (ICAO objective: within 3 min on a full-length runway)' });
    }
    if (d && !d.arrived) S.drillGame = (S.drillGame || 0) + dt; else if (!d) S.drillGame = 0;
  }
  function updateSpray(dt) {
    trucks.forEach((tr) => {
      if (tr.state !== 'spray') return;
      for (let k = 0; k < 12; k++) {
        const i = spIdx++ % SPN;
        const g = tr.g, h = g.rotation.y + SK.rng.range(-0.08, 0.08);
        spPos[i * 3] = g.position.x + Math.sin(g.rotation.y) * 3; spPos[i * 3 + 1] = 3.6; spPos[i * 3 + 2] = g.position.z + Math.cos(g.rotation.y) * 3;
        const v = SK.rng.range(16, 20);
        spVel[i * 3] = Math.sin(h) * v; spVel[i * 3 + 1] = SK.rng.range(5, 7); spVel[i * 3 + 2] = Math.cos(h) * v;
        spLife[i] = 1.6;
      }
    });
    for (let i = 0; i < SPN; i++) {
      if (spLife[i] <= 0) { spPos[i * 3 + 1] = -50; continue; }
      spLife[i] -= dt;
      spVel[i * 3 + 1] -= 9.8 * dt;
      spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] = Math.max(0.05, spPos[i * 3 + 1] + spVel[i * 3 + 1] * dt); spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt;
    }
    spGeo.attributes.position.needsUpdate = true;
  }

  // =============== OPERATIONS CENTRE ===============
  const OC = { x0: 140, x1: 162, z0: -30, z1: -14, h: 6 };
  const ocz = (OC.z0 + OC.z1) / 2;
  K.ground(OC.x1 - OC.x0, OC.z1 - OC.z0, M.carpet, 151, 0.04, ocz, root);
  B.box(OC.x1 - OC.x0, OC.h, 0.3, M.wallDark, 151, 0, OC.z0);
  B.box(0.3, OC.h, OC.z1 - OC.z0, M.wallDark, OC.x0, 0, ocz);
  B.box(0.3, OC.h, OC.z1 - OC.z0, M.glass, OC.x1, 0, ocz);
  B.box(OC.x1 - OC.x0, OC.h, 0.2, M.glass, 151, 0, OC.z1);
  RB.box(OC.x1 - OC.x0 + 1, 0.4, OC.z1 - OC.z0 + 1, M.roof, 151, OC.h, ocz);
  const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 384;
  const wtex = new THREE.CanvasTexture(wc); wtex.encoding = THREE.sRGBEncoding;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 6.75 * 0.62), new THREE.MeshBasicMaterial({ map: wtex, toneMapped: false }));
  wall.position.set(151, 3, OC.z0 + 0.2); root.add(wall);
  E.pick.add(wall, 'videowall');
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
    const x = 144 + i * 4.6, z = OC.z0 + 6 + r * 4;
    B.box(3.6, 0.8, 1.2, M.desk, x, 0, z);
    B.box(1.4, 0.5, 0.05, M.screen, x, 0.9, z - 0.4);
    S.agentsPosts.push(AG.post('r_aoc', x, z + 1, Math.PI, null, 'work'));
  }
  K.hit(OC.x1 - OC.x0, OC.h, OC.z1 - OC.z0, 151, 0, ocz, root, 'eoc');
  const ocs = K.sign('AIRPORT OPERATIONS CENTRE', 14, 1.2, { bg: '#16324f', font: 'bold 64px system-ui, sans-serif' });
  ocs.position.set(OC.x1 + 0.3, OC.h + 1, ocz); ocs.rotation.y = Math.PI / 2; root.add(ocs);
  function drawWall() {
    const c = wc.getContext('2d');
    c.fillStyle = '#071019'; c.fillRect(0, 0, 1024, 384);
    const mini = document.getElementById('miniCanvas');
    if (mini) { SK.overlays.drawMini(); c.drawImage(mini, 8, 8, 470, 342); }
    const k = SK.ops.kpi;
    c.fillStyle = '#9fb3c8'; c.font = 'bold 20px system-ui, sans-serif'; c.fillText('SKY AOC  ' + SK.fmtTime(now()), 500, 30);
    const rows = [['Security wait', k.waitSecurity + ' min'], ['Check-in wait', k.waitCheckin + ' min'], ['Arrivals immigration', (k.waitArrImm || 0) + ' min'], ['First bag', k.firstBag == null ? '-' : k.firstBag + ' min'], ['On-time', k.otp + '%'], ['Pax in terminals', (k.paxIn || 0).toLocaleString()], ['Cargo handled', Math.round(S.stats.cargoT) + ' t'], ['Fuel delivered', Math.round(S.stats.fuelL / 1000) + ' m3']];
    rows.forEach(([a, b], i) => {
      c.fillStyle = '#7f93a8'; c.font = '18px system-ui, sans-serif'; c.fillText(a, 500, 64 + i * 28);
      c.fillStyle = '#ffffff'; c.font = 'bold 20px system-ui, sans-serif'; c.fillText(b, 720, 64 + i * 28);
    });
    c.fillStyle = '#f2b134'; c.font = 'bold 16px system-ui, sans-serif'; c.fillText('ALERTS', 500, 300);
    SK.ops.events.filter((e) => e.kind === 'warn').slice(-3).reverse().forEach((e, i) => { c.fillStyle = '#ff9a7a'; c.font = '15px system-ui, sans-serif'; c.fillText(SK.fmtTime(e.t) + ' ' + e.msg.slice(0, 54), 500, 322 + i * 20); });
    wtex.needsUpdate = true;
  }

  // =============== CENTRAL UTILITY PLANT ===============
  const UP = { x0: -205, x1: -155, z0: 92, z1: 132 };
  K.ground(UP.x1 - UP.x0 + 6, UP.z1 - UP.z0 + 6, M.concrete, -180, 0.02, 112, root);
  B.box(26, 10, 18, M.wallDark, -190, 0, 104);
  B.cyl(1.2, 28, M.steel, -199, 0, 98, 12);
  [[-168, 104], [-168, 122]].forEach(([x, z]) => { const ct = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 6.5, 14, 24, 1, true), M.concrete); ct.position.set(x, 7, z); ct.castShadow = true; root.add(ct); });
  for (let i = 0; i < 4; i++) B.box(3, 2.4, 3, M.steel, -196 + i * 5, 0, 124);
  const ups = K.sign(['CENTRAL UTILITY PLANT', 'Power · Cooling · Heating · Water'], 12, 1.8, { bg: '#2f3a48', font: 'bold 64px system-ui, sans-serif' });
  ups.position.set(-190, 11.5, 95); ups.rotation.y = Math.PI; root.add(ups);
  K.hit(50, 14, 40, -180, 0, 112, root, 'utility');
  // steam from the cooling towers
  const STN = 160;
  const stPos = new Float32Array(STN * 3);
  for (let i = 0; i < STN; i++) stPos.set([(i % 2 ? -168 : -168) + SK.rng.range(-3, 3), 14 + SK.rng.range(0, 20), (i % 2 ? 104 : 122) + SK.rng.range(-3, 3)], i * 3);
  const stGeo = new THREE.BufferGeometry(); stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
  const steam = new THREE.Points(stGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, transparent: true, opacity: 0.35, depthWrite: false }));
  steam.frustumCulled = false; root.add(steam);

  B.build(root);
  RB.build(roof);

  // =============== update ===============
  S.update = function (dt) {
    if (dt <= 0) return;
    S.freighters.forEach((f) => { if (!f.departed) freighterTurn(f, dt); });
    SK.aircraft.planes.forEach((p) => { if (!p.g.cargo && !p.g.bus) fuelStand(p); });
    Object.keys(disp).forEach((gid) => { if (!SK.aircraft.planes.some((p) => p.g.id === gid && p.state === 'parked')) disp[gid].visible = false; });
    updateTrucks(dt);
    forks.forEach((fk) => {
      fk.t += dt * 0.15;
      const u = 0.5 - 0.5 * Math.cos(fk.t * Math.PI);
      fk.g.position.set(SK.lerp(fk.a.x, fk.b.x, u), 0, SK.lerp(fk.a.z, fk.b.z, u));
      fk.g.rotation.y = Math.sin(fk.t * Math.PI) > 0 ? Math.atan2(fk.b.x - fk.a.x, fk.b.z - fk.a.z) : Math.atan2(fk.a.x - fk.b.x, fk.a.z - fk.b.z);
      fk.g.userData.load.visible = Math.floor(fk.t) % 2 === 0;
    });
  };
  let wallT = 0;
  S.visual = function (dtReal) {
    updateSpray(dtReal);
    const p = stGeo.attributes.position.array;
    for (let i = 0; i < STN; i++) { p[i * 3 + 1] += dtReal * 2.2; p[i * 3] += dtReal * 0.8; if (p[i * 3 + 1] > 40) { p[i * 3 + 1] = 14; p[i * 3] = -168 + SK.rng.range(-3, 3); } }
    stGeo.attributes.position.needsUpdate = true;
    wallT -= dtReal;
    if (wallT <= 0) { wallT = 1; drawWall(); }
  };
  S.kpi = function (k) {
    k.cargoT = Math.round(S.stats.cargoT);
    k.ulds = S.stats.ulds;
    k.freighters = S.stats.freighters;
    k.fuelM3 = Math.round(S.stats.fuelL / 1000);
    k.fuelings = S.stats.fuelings;
  };
  S.root = root;
  return S;
})();
