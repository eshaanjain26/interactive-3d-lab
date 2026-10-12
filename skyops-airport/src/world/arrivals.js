// SkyOps arrivals (pass 2): sterile corridor, arrivals immigration, baggage claim, customs, arrivals hall, pickup curb.
// Every inbound aircraft that blocks in deplanes its passengers and sends its bags to a carousel.
SK.arrivals = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine, AG = SK.agents, AR = L.arr, N = L.nodes;
  const P = SK.PAX_PER_FIGURE;
  const now = () => SK.sim.now;
  const A = { list: [], stats: { arrived: 0, pir: 0, stops: 0, red: 0, duty: 0, delayedBags: 0, bagsDelivered: 0 }, recent: [] };
  const root = new THREE.Group(); root.name = 'arrivals';
  E.scene.add(root);
  const B = new K.Batch();
  const spread = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((i + 0.5) * (b - a)) / n);
  const Y = AR.corridorY, CZ = AR.corridorZ, CX = AR.corridorX;

  // ---------- sterile arrivals corridor (glass tube one level above the apron) ----------
  const westX = L.gateDoor(L.gates.find((g) => g.bus)).x - 3;
  const legs = [[westX, CZ, CX, CZ], [CX, CZ, CX, AR.escTop.z], [CX, AR.escTop.z, AR.x0, AR.escTop.z]];
  legs.forEach(([x0, z0, x1, z1]) => {
    const len = Math.hypot(x1 - x0, z1 - z0) + 2.6, ang = -Math.atan2(z1 - z0, x1 - x0);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    B.add(K.geo.box(len, 0.3, 2.8), M.darkSteel, K.matrix(mx, Y - 0.15, mz, ang));
    B.add(K.geo.box(len, 0.25, 3.0), M.steel, K.matrix(mx, Y + 2.7, mz, ang));
    [-1.4, 1.4].forEach((o) => B.add(K.geo.box(len, 2.6, 0.08), M.glass, K.matrix(mx, Y + 1.3, mz, ang).multiply(new THREE.Matrix4().makeTranslation(0, 0, o))));
    const n = Math.floor(len / 16);
    for (let i = 0; i <= n; i++) {
      const u = i / Math.max(1, n), x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      if (Math.abs(z - CZ) < 0.1 && x < L.term.x1 + 4) continue;     // the terminal wall carries it here
      B.box(0.5, Y - 0.3, 0.5, M.steel, x, 0, z);
    }
  });
  K.hit(CX - westX, 3, 3, (CX + westX) / 2, Y, CZ, root, 'corridor');
  K.hit(3, 3, AR.escTop.z - CZ, CX, Y, (AR.escTop.z + CZ) / 2, root, 'corridor');
  // connector from each bridge rotunda up to the corridor
  L.gates.forEach((g) => {
    const d = L.gateDoor(g);
    B.box(2.2, 0.25, 2.6, M.darkSteel, d.x, Y - 0.4, CZ - 1.6);
  });

  // ---------- arrivals building ----------
  const w = AR.x1 - AR.x0, dd = AR.z1 - AR.z0, cx = (AR.x0 + AR.x1) / 2, cz = (AR.z0 + AR.z1) / 2;
  K.ground(w, dd, M.floor, cx, 0.03, cz, root);
  B.box(w + 2, 0.3, dd + 2, M.concrete, cx, -0.3, cz);
  function wall(x0, z0, x1, z1, h, gaps, mat) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    let cur = 0;
    const segs = [];
    (gaps || []).forEach(([a, b]) => { if (a > cur) segs.push([cur, a]); cur = b; });
    if (cur < len) segs.push([cur, len]);
    segs.forEach(([a, b]) => {
      const m = (a + b) / 2;
      B.add(K.geo.box(b - a, h, 0.14), mat || M.glass, K.matrix(x0 + Math.cos(ang) * m, h / 2, z0 + Math.sin(ang) * m, -ang));
      if (!mat) for (let s = a; s <= b + 0.01; s += 4) B.box(0.18, h, 0.3, M.steel, x0 + Math.cos(ang) * s, 0, z0 + Math.sin(ang) * s);
    });
  }
  wall(AR.x0, AR.z0, AR.x0, AR.z1, AR.h, [[AR.escTop.z - AR.z0 - 2, AR.escTop.z - AR.z0 + 2]]);
  wall(AR.x0, AR.z1, AR.x1, AR.z1, AR.h);
  wall(AR.x1, AR.z0, AR.x1, AR.z1, AR.h, AR.doors.map((z) => [z - AR.z0 - 2.4, z - AR.z0 + 2.4]));
  wall(AR.x0, AR.z0, AR.x1, AR.z0, AR.h, [[244 - AR.x0, 256 - AR.x0]]);
  // mezzanine landing + escalator down
  B.box(6, 0.3, 4, M.darkSteel, AR.x0 + 2, Y - 0.3, AR.escTop.z);
  const escLen = Math.hypot(AR.escBottom.x - AR.escTop.x, Y);
  const esc = new THREE.Mesh(new THREE.BoxGeometry(escLen, 0.5, 1.6), M.darkSteel);
  esc.position.set((AR.escTop.x + AR.escBottom.x) / 2, Y / 2, AR.escTop.z);
  esc.rotation.z = -Math.atan2(Y, AR.escBottom.x - AR.escTop.x);
  esc.castShadow = true; root.add(esc);
  [-0.9, 0.9].forEach((o) => { const r = esc.clone(); r.scale.set(1, 1.8, 0.08); r.material = M.glass; r.position.z += o; r.position.y += 0.6; root.add(r); });
  const rf = new THREE.Group(); rf.name = 'arrivalsRoof';
  const rb = new K.Batch();
  rb.box(w + 4, 0.6, dd + 4, M.roof, cx, AR.h + 0.3, cz);
  rb.build(rf);
  rf.visible = false; root.add(rf);
  A.roof = rf;
  const LB = new K.Batch();
  for (let z = AR.z0 + 5; z < AR.z1; z += 9) for (let x = AR.x0 + 8; x < AR.x1; x += 16) LB.box(6, 0.05, 0.18, M.lightStrip, x, 8.6, z);
  LB.build(root, { castShadow: false, receiveShadow: false });

  // ---------- arrivals immigration ----------
  const I = AR.imm;
  const manualZ = spread(I.manual.z0, I.manual.z1, I.manual.n), egateZ = spread(I.egate.z0, I.egate.z1, I.egate.n);
  manualZ.forEach((z, i) => {
    B.box(2.2, 1.25, 2.2, M.wallDark, I.x, 0, z);
    B.box(2.2, 1.0, 2.2, M.glass, I.x, 1.25, z);
    B.box(2.3, 0.15, 2.3, M.wallDark, I.x, 2.25, z);
    const s = K.sign(String(i + 1), 0.6, 0.6, { bg: '#16324f', font: 'bold 160px system-ui, sans-serif' });
    s.position.set(I.x - 1.16, 2.8, z); s.rotation.y = -Math.PI / 2; root.add(s);
  });
  const egDoors = [];
  egateZ.forEach((z) => {
    B.box(2.6, 1.1, 0.3, M.kiosk, I.x, 0, z - 0.75);
    B.box(2.6, 1.1, 0.3, M.kiosk, I.x, 0, z + 0.75);
    B.box(0.3, 0.35, 0.3, M.screen, I.x - 1, 1.1, z - 0.75);
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 1.2), M.glassDark);
    d.position.set(I.x + 1.3, 0.6, z); root.add(d);
    egDoors.push({ d, open: 0 });
  });
  const immSign = K.sign(['ARRIVALS · IMMIGRATION', 'All passports  ·  ePassports: e-gates'], 14, 1.8, { bg: '#16324f', font: 'bold 60px system-ui, sans-serif', accent: '#f2b134' });
  immSign.position.set(209, 5, 20); immSign.rotation.y = -Math.PI / 2; root.add(immSign);
  K.hit(3, 2.4, I.manual.z1 - I.manual.z0, I.x, 0, (I.manual.z0 + I.manual.z1) / 2, root, 'arr_booth');
  K.hit(3, 1.4, I.egate.z1 - I.egate.z0, I.x, 0, (I.egate.z0 + I.egate.z1) / 2, root, 'arr_egate');
  K.hit(46, 0.06, dd, 213, 0, cz, root, 'arrimm');
  const qM = SK.serpentine(I.manual.queue, { headX: 'x1', headZ: 'z0' }), qE = SK.serpentine(I.egate.queue, { headX: 'x1', headZ: 'z1' });

  // ---------- baggage claim ----------
  const C = AR.claim;
  const ovalShape = (rx, rz) => { const s = new THREE.Shape(); s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0); return s; };
  const ringShape = ovalShape(C.rx + 0.7, C.rz + 0.7);
  ringShape.holes.push(ovalShape(C.rx - 0.7, C.rz - 0.7));
  const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: 0.45, bevelEnabled: false, curveSegments: 40 });
  ringGeo.rotateX(Math.PI / 2);
  C.carousels.forEach((z, i) => {
    const ring = new THREE.Mesh(ringGeo, M.belt);
    ring.position.set(C.x, 0.5, z); ring.receiveShadow = true; ring.castShadow = true;
    root.add(ring);
    const island = new THREE.Mesh(new THREE.ExtrudeGeometry(ovalShape(C.rx - 0.75, C.rz - 0.75), { depth: 0.9, bevelEnabled: false }), M.steel);
    island.geometry.rotateX(-Math.PI / 2); island.position.set(C.x, 0, z); root.add(island);
    B.box(1.2, 0.3, 0.8, M.black, C.x, 0.9, z);   // feed chute from the inbound hall below
    const s = K.sign(String(i + 1), 1, 1, { bg: '#f2b134', fg: '#14202e', font: 'bold 200px system-ui, sans-serif' });
    s.position.set(C.x - C.rx - 1.5, 3.4, z); s.rotation.y = -Math.PI / 2; root.add(s);
    B.cyl(0.08, 3.1, M.darkSteel, C.x - C.rx - 1.5, 0, z, 6);
    K.hit(C.rx * 2 + 1.6, 1.2, C.rz * 2 + 1.6, C.x, 0, z, root, 'carousel');
  });
  K.hit(28, 0.06, dd, 250, 0, cz, root, 'claim');
  // inbound baggage hall behind the north wall
  B.box(28, 5, 12, M.wallDark, 250, 0, AR.z0 - 6.2);
  B.box(6, 3.6, 0.2, M.yellow, 250, 0, AR.z0 - 12.3);
  // baggage services desk + oversize belt
  B.box(4, 1.05, 1, M.desk, AR.services.x, 0, AR.services.z);
  B.box(0.5, 0.35, 0.05, M.screen, AR.services.x - 1, 1.1, AR.services.z - 0.5);
  B.box(3, 0.8, 1.2, M.belt, 258, 0, -7.5);
  const bs = K.sign(['BAGGAGE SERVICES', 'Lost, delayed, damaged'], 5, 1.1, { bg: '#2f3a48', font: 'bold 64px system-ui, sans-serif' });
  bs.position.set(AR.services.x, 2.8, AR.services.z - 0.7); root.add(bs);
  K.hit(4.4, 1.4, 1.6, AR.services.x, 0, AR.services.z, root, 'bservices');
  // arrivals board (canvas), facing passengers coming from immigration
  const fc = document.createElement('canvas'); fc.width = 1024; fc.height = 576;
  const ftex = new THREE.CanvasTexture(fc); ftex.encoding = THREE.sRGBEncoding;
  const fids = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 4), new THREE.MeshBasicMaterial({ map: ftex, toneMapped: false }));
  fids.position.set(238.2, 5, 22); fids.rotation.y = -Math.PI / 2; root.add(fids);
  B.box(0.12, 4.2, 7.3, M.black, 238.3, 2.9, 22);
  E.pick.add(fids, 'arrfids');

  // ---------- customs ----------
  const CU = AR.customs;
  wall(CU.wallX, AR.z0, CU.wallX, AR.z1, 3, [[CU.green.z0 - AR.z0, CU.green.z1 - AR.z0], [CU.red.z0 - AR.z0, CU.red.z1 - AR.z0]], M.wall);
  [[CU.green, '#1b7f4b', 'NOTHING TO DECLARE'], [CU.red, '#b3262d', 'GOODS TO DECLARE']].forEach(([ch, col, txt]) => {
    const s = K.sign(txt, 6.5, 1.1, { bg: col, font: 'bold 90px system-ui, sans-serif' });
    s.position.set(CU.wallX - 0.2, 3.8, (ch.z0 + ch.z1) / 2); s.rotation.y = -Math.PI / 2; root.add(s);
    K.ground(7, ch.z1 - ch.z0, new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }), CU.wallX + 3.5, 0.05, (ch.z0 + ch.z1) / 2, root);
  });
  B.box(1.6, 1.05, 3, M.desk, CU.red.desk.x + 1, 0, CU.red.desk.z);
  B.box(2.6, 0.9, 1.2, M.steel, CU.bench.x, 0, CU.bench.z);
  K.hit(8, 1.4, CU.green.z1 - CU.green.z0, CU.wallX + 3.5, 0, (CU.green.z0 + CU.green.z1) / 2, root, 'green_channel');
  K.hit(8, 1.4, CU.red.z1 - CU.red.z0, CU.wallX + 3.5, 0, (CU.red.z0 + CU.red.z1) / 2, root, 'red_channel');
  K.hit(8, 0.06, dd, CU.wallX + 3.5, 0, cz, root, 'customs');

  // ---------- arrivals hall ----------
  const H = AR.hall;
  for (let z = AR.z0 + 1; z < AR.z1 - 1; z += 2) {
    if (Math.abs(z - 12) < 3 || Math.abs(z - 29) < 3) continue;
    B.cyl(0.05, 1, M.steel, H.barrierX, 0, z, 6);
  }
  B.box(0.06, 0.06, AR.z1 - AR.z0 - 2, M.steel, H.barrierX, 0.95, cz);
  [['CURRENCY', '#1f5fbf'], ['SIM CARDS', '#7a2e5c'], ['CAR HIRE', '#2f8f5b']].forEach(([t, c], i) => {
    const x = 279 + i * 4;
    B.box(3.2, 1.1, 1.2, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), x, 0, AR.z0 + 1.6);
    const s = K.sign(t, 3, 0.7, { bg: c, font: 'bold 110px system-ui, sans-serif' });
    s.position.set(x, 2.6, AR.z0 + 1.0); root.add(s);
  });
  K.hit(13, 2.6, 2, 283, 0, AR.z0 + 1.6, root, 'kiosks_arr');
  K.hit(1, 1.2, dd, H.barrierX, 0, cz, root, 'meetgreet');
  K.hit(H.x1 - H.x0, 0.06, dd, (H.x0 + H.x1) / 2, 0, cz, root, 'arrivals');
  const hs = K.sign(['WELCOME TO SKY', 'Taxis · Ride share · Car hire · Rail'], 12, 1.8, { bg: '#16324f', font: 'bold 64px system-ui, sans-serif', accent: '#f2b134' });
  hs.position.set(AR.x1 - 0.3, 6, 20); hs.rotation.y = -Math.PI / 2; root.add(hs);

  // ---------- pickup curb + road ----------
  K.ground(4, AR.z1 - AR.z0 + 30, M.sidewalk, AR.curbX, 0.12, cz, root).position.y = 0.12;
  K.ground(10, AR.roadZ1 - AR.roadZ0, M.asphalt, AR.roadX, 0.01, (AR.roadZ0 + AR.roadZ1) / 2, root);
  for (let z = AR.roadZ0 + 4; z < AR.roadZ1; z += 9) B.box(0.2, 0.02, 4, M.marking, AR.roadX, 0.02, z);
  K.paint('PICKUP', 9, 2.2, '#f2f2ee', root, AR.roadX - 2.4, 20, -Math.PI / 2);
  K.hit(4, 0.3, dd, AR.curbX, 0, cz, root, 'pickup');

  B.build(root);

  // ---------- staff ----------
  manualZ.forEach((z, i) => AG.post('r_immigration', I.x + 0.3, z, -Math.PI / 2, () => st.manual.servers[i].open || !st.manual.idle(st.manual.servers[i]), 'work'));
  AG.post('r_immigration', I.x + 2.4, I.egate.z1 + 1, -Math.PI / 2, null, 'idle');
  AG.post('r_bservices', AR.services.x, AR.services.z - 1.0, 0, null, 'work');
  AG.post('r_customs', CU.red.desk.x + 1.9, CU.red.desk.z, -Math.PI / 2, null, 'work');
  AG.post('r_customs', CU.bench.x + 1.6, CU.bench.z, -Math.PI / 2, null, 'idle');
  AG.post('r_customs', CU.wallX + 5, (CU.green.z0 + CU.green.z1) / 2 - 3.2, -Math.PI / 2, null, 'idle');
  for (let i = 0; i < 3; i++) AG.post('r_ramp', 248 + i * 2, AR.z0 - 1.2, Math.PI, () => A.list.some((r) => r.feeding), 'work');

  // ---------- stations ----------
  const sv = (m, sd) => Math.max(10, SK.rng.normal(m, sd));
  const st = {
    manual: AG.station('arrManual', { servers: manualZ.map((z, i) => ({ x: I.x - 2.1, z, label: 'Booth ' + (i + 1) })), queue: qM }, { service: () => sv(P * 60, 20), meanCycle: P * 60 }),
    egate: AG.station('arrEgate', { servers: egateZ.map((z, i) => ({ x: I.x, z, label: 'e-gate ' + (i + 1) })), queue: qE }, { service: () => sv(P * 18, 5), meanCycle: P * 18, onStage: (a, k, s) => { egDoors[s.id].open = 1.6; } }),
    serv: AG.station('arrServ', { servers: [{ x: AR.services.x, z: AR.services.z + 1.3, label: 'Baggage services' }], queue: { slots: [0, 1, 2, 3, 4].map((k) => ({ x: AR.services.x - 1.5 - k * 0.8, z: AR.services.z + 2.4 })) } }, { service: () => sv(420, 120), meanCycle: 420, overflow: { dx: -0.8, dz: 0 } }),
    red: AG.station('arrRed', { servers: [{ x: CU.red.desk.x - 0.4, z: CU.red.desk.z, label: 'Red channel' }], queue: { slots: [0, 1, 2, 3].map((k) => ({ x: CU.red.desk.x - 1.8 - k * 0.8, z: CU.red.desk.z })) } }, { service: () => sv(300, 90), meanCycle: 300, overflow: { dx: -0.8, dz: 0 } }),
  };
  A.st = st;
  st.manual.setOpen(6);
  // simple auto staffing for arrivals booths, same rule as departures
  function autoStaff() {
    const per = (8 * 60) / st.manual.meanCycle;
    st.manual.setOpen(SK.clamp(Math.ceil(st.manual.queue.length / Math.max(1, per)), 3, 10));
  }

  // ---------- arrival bags on the carousels ----------
  const MAXB = 900;
  const bagMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.36, 0.42), new THREE.MeshStandardMaterial({ roughness: 0.6 }), MAXB);
  bagMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bagMesh.setColorAt(0, new THREE.Color());
  bagMesh.count = 0; bagMesh.castShadow = true; bagMesh.frustumCulled = false;
  root.add(bagMesh);
  const bagMap = [];
  E.pick.add(bagMesh, (hit) => { const b = bagMap[hit.instanceId]; return b ? { entry: 'carousel', abag: b } : null; });
  const BCOL = [0x1e1e1e, 0x2f4f7f, 0x7f2f2f, 0x5f5f5f, 0x2f6f5f, 0xc7a64a, 0x6b3f8f, 0xd9d4c7];
  const ovalPos = (i, th, off) => ({ x: C.x + (C.rx + (off || 0)) * Math.cos(th), z: C.carousels[i] + (C.rz + (off || 0)) * Math.sin(th) });

  // ---------- inbound carts ----------
  function makeCart() {
    const g = new THREE.Group();
    K.box(1.6, 1, 2.4, M.yellow, 0, 0.3, 2.8, g);
    K.box(1.4, 0.9, 0.9, M.glassDark, 0, 1.3, 2.3, g);
    [-0.3, -3.6].forEach((z) => { K.box(1.8, 0.2, 2.8, M.darkSteel, 0, 0.45, z, g); K.box(1.6, 0.9, 2.4, new THREE.MeshStandardMaterial({ color: 0x5a4a3a }), 0, 0.65, z, g); });
    root.add(g); E.pick.add(g, 'claim');
    return g;
  }
  function cartPath(from) {
    const pts = [[from.x, from.z], [from.x + 6, -46], [176, -46], [200, -40], [250, -34], [250, AR.z0 - 13.5]];
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
    return { c, len: c.getLength() };
  }

  // ---------- pickup cars ----------
  const cars = [];
  const waiting = [];
  function car() {
    const g = new THREE.Group();
    const col = SK.rng.chance(0.35) ? 0xf1c232 : SK.rng.pick([0xd9dde2, 0x1f2329, 0x7b8691, 0xa62b2b, 0x274b8a]);
    K.box(1.9, 0.8, 4.4, new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.5 }), 0, 0.35, 0, g);
    K.box(1.7, 0.65, 2.4, M.glassDark, 0, 1.15, 0.2, g);
    root.add(g); E.pick.add(g, 'pickup');
    return g;
  }

  // ---------- inbound flights ----------
  const carouselLoad = [0, 0, 0];
  SK.bus.on('blockIn', (p) => {
    const f = p.f;
    const kind = f.wide ? 'wide' : 'narrow';
    const seats = SK.AIRCRAFT_TYPES[kind].seats;
    const figures = Math.max(6, Math.round((seats * SK.rng.range(0.7, 0.92)) / P));
    const origin = SK.rng.pick(SK.DESTS[kind]);
    const ci = carouselLoad.indexOf(Math.min(...carouselLoad));
    carouselLoad[ci]++;
    const rec = {
      f, plane: p, figures, spawned: 0, origin: origin[1], num: f.airline.code + ' ' + (parseInt(f.num.split(' ')[1], 10) + 1),
      carousel: ci, blockIn: now(), nextSpawn: now() + SK.minutes(3), bags: [], bagQueue: 0, firstBag: null, lastBag: null, pax: [],
      cart: null, cartState: 'wait', feeding: false, done: false,
    };
    f.arrivalsPending = true;
    A.list.push(rec);
    SK.bus.emit('ops', { t: now(), kind: 'info', msg: rec.num + ' from ' + rec.origin + ' on blocks at ' + (f.bus ? 'R1' : f.gate) + ': ' + figures * P + ' arriving passengers, bags to carousel ' + (ci + 1) });
  });

  function spawnArrival(rec) {
    const f = rec.f;
    const g = L.gates.find((x) => x.id === f.gate);
    const r = SK.rng;
    const u = r.next();
    const cls = f.wide ? (u < 0.03 ? 'F' : u < 0.15 ? 'J' : 'Y') : u < 0.09 ? 'J' : 'Y';
    let start, path;
    if (f.bus) {
      const d = L.gateDoor(g);
      start = { x: d.x + r.range(-1, 1), z: L.term.z0 - 1.5, y: 0 };
      path = [{ x: d.x, z: CZ, y: Y }];
    } else {
      const bp = SK.airfield.bridgePath(f.gate);
      start = { x: bp[3].x, z: bp[3].z, y: bp[3].y };
      path = [{ x: bp[2].x, z: bp[2].z, y: 3 }, { x: bp[2].x, z: CZ - 1.6, y: Y - 0.4 }, { x: bp[2].x, z: CZ, y: Y }];
    }
    path.push({ x: CX, z: CZ, y: Y }, { x: CX, z: AR.escTop.z, y: Y }, { x: AR.escTop.x, z: AR.escTop.z, y: Y }, { x: AR.escBottom.x, z: AR.escBottom.z, y: 0 });
    path.forEach((p) => { p.x += AG.jit({ id: rec.spawned + 7 }, p.z) * 0.5; });
    const a = AG.make({ kind: 'pax', role: 'r_pax', arriving: true, arr: rec, cls, x: start.x, y: start.y, z: start.z, log: [], flight: null,
      egate: r.chance(0.55), bags: r.chance(0.72) ? 1 : 0, cabinBag: r.chance(0.65), red: r.chance(0.04) });
    a.carry = a.cabinBag;
    a.script = arrScript(a, path);
    rec.pax.push(a);
    if (a.bags) {
      const delayed = r.chance(0.015);
      rec.bags.push({ owner: a, state: delayed ? 'delayed' : 'hold', color: r.pick(BCOL), th: 0, rec });
      if (delayed) A.stats.delayedBags++;
    }
    rec.spawned++;
    A.stats.arrived++;
    AG.log(a, 'Deplaned ' + rec.num + ' from ' + rec.origin + ' at ' + (f.bus ? 'R1 (bus to the terminal)' : f.gate));
  }

  function* arrScript(a, path) {
    const rec = a.arr;
    AG.setPath(a, path);
    yield AG.ARRIVE;
    AG.log(a, 'Through the arrivals corridor');
    a.node = 'aEsc';
    // immigration
    const s = a.egate ? st.egate : st.manual;
    yield* AG.use(a, s, a.egate ? 'aImmE' : 'aImmM', a.egate ? 'Arrivals e-gate' : 'Arrivals passport booth');
    yield* AG.walkTo(a, { x: I.x + 4, z: a.z });
    a.node = a.z < 10 ? 'aClaimN' : a.z > 30 ? 'aClaimS' : 'aClaim';
    AG.log(a, 'Admitted to the country');
    // baggage claim
    const bag = rec.bags.find((b) => b.owner === a);
    if (bag) {
      yield* AG.go(a, 'aCar' + rec.carousel);
      const th = SK.rng.range(-0.6, 0.6) + Math.PI;     // west side of the oval, facing the belt
      const spot = ovalPos(rec.carousel, th, 1.5);
      yield* AG.walkTo(a, spot);
      a.heading = Math.atan2(C.x - spot.x, C.carousels[rec.carousel] - spot.z);
      a.waitTh = th;
      AG.log(a, 'Waiting at carousel ' + (rec.carousel + 1));
      yield AG.until(() => bag.state === 'taken' || (bag.state === 'delayed' && rec.lastBag && now() - rec.lastBag > SK.minutes(4)));
      if (bag.state === 'taken') {
        a.carry = true; a.look.case = bag.color;
        AG.log(a, 'Collected bag after ' + Math.round((now() - rec.blockIn) / 60) + ' min from on-blocks');
      } else {
        AG.log(a, 'Bag did not arrive');
        yield* AG.use(a, st.serv, 'aServ', 'Baggage services');
        A.stats.pir++;
        AG.log(a, 'Filed a Property Irregularity Report; bag will be traced and delivered');
        SK.bus.emit('ops', { t: now(), kind: 'warn', msg: 'Delayed bag on ' + rec.num + ': PIR filed at baggage services' });
      }
      a.node = 'aCar' + rec.carousel;
    } else AG.log(a, 'No hold bag, straight to customs');
    // customs
    yield* AG.go(a, 'aCustIn');
    if (a.red) {
      yield* AG.go(a, 'aRed');
      yield* AG.use(a, st.red, null, 'Red channel');
      const duty = Math.round(SK.rng.range(25, 320)) * P;
      A.stats.red++; A.stats.duty += duty;
      AG.log(a, 'Declared goods; paid $' + duty + ' duty and tax');
      a.node = 'aRed';
      yield* AG.go(a, 'aRedOut');
    } else {
      yield* AG.go(a, 'aGreen');
      if (SK.rng.chance(SK.arrivals.stopRate)) {
        A.stats.stops++;
        yield* AG.walkTo(a, { x: CU.bench.x - 1.2, z: CU.bench.z + AG.jit(a, 2) * 0.6 });
        a.anim = 'idle';
        AG.log(a, 'Stopped in the green channel: bags X-rayed and opened');
        yield AG.waitSim(SK.rng.range(180, 420));
        a.node = 'aGreen';
      }
      yield* AG.go(a, 'aGreenOut');
    }
    // arrivals hall and pickup
    yield* AG.go(a, 'aHall');
    const g = greeters.find((x) => !x.follow && !x.dead && SK.rng.chance(0.5));
    if (g) { g.follow = a; AG.log(a, 'Met by family at the barrier'); }
    const door = SK.rng.int(0, AR.doors.length - 1);
    yield* AG.go(a, 'aCurb' + door);
    yield* AG.walkTo(a, { x: AR.curbX + SK.rng.range(-0.8, 0.8), z: AR.doors[door] + SK.rng.range(-6, 6) });
    a.anim = 'idle'; a.heading = Math.PI / 2;
    AG.log(a, 'Waiting at the pickup curb');
    waiting.push(a);
    yield AG.until(() => a.picked);
    AG.log(a, 'Left by car');
    if (g) AG.kill(g);
    AG.kill(a);
  }

  // greeters waiting behind the barrier
  const greeters = [];
  function topUpGreeters() {
    for (let i = greeters.length - 1; i >= 0; i--) if (greeters[i].dead || greeters[i].follow) greeters.splice(i, 1);
    while (greeters.length < 12) {
      const g = AG.post('r_greeter', AR.hall.barrierX + SK.rng.range(1.5, 6), SK.rng.range(AR.z0 + 4, AR.z1 - 4), -Math.PI / 2, null, 'idle');
      g.kind = 'staff';
      greeters.push(g);
    }
  }
  topUpGreeters();
  A.stopRate = 0.03;

  // ---------- update ----------
  const mx = new THREE.Matrix4(), col = new THREE.Color();
  let staffT = 0, greetT = 0, carT = 0;
  A.update = function (dt) {
    if (dt <= 0) return;
    const t = now();
    staffT -= dt; if (staffT <= 0 && SK.ops.autoStaff) { autoStaff(); staffT = 4; }
    greetT -= dt; if (greetT <= 0) { topUpGreeters(); greetT = 6; }
    for (let i = A.list.length - 1; i >= 0; i--) {
      const rec = A.list[i];
      const f = rec.f;
      // deplaning: one figure every ~10 sim s once the bridge is on the door (bus: after the ride in)
      const ready = f.bus ? t >= rec.blockIn + SK.minutes(7) : SK.airfield.bridgeReady(f.gate);
      while (ready && rec.spawned < rec.figures && t >= rec.nextSpawn) { spawnArrival(rec); rec.nextSpawn += f.bus ? 4 : 10; }
      if (rec.spawned >= rec.figures && f.arrivalsPending && t >= rec.nextSpawn + SK.minutes(3)) f.arrivalsPending = false;
      // bags: unload, tow to the inbound hall, feed the carousel
      if (rec.cartState === 'wait' && t >= rec.blockIn + SK.minutes(5)) {
        const from = f.bus ? { x: L.remote.x + 4, z: L.remote.z - 8 } : SK.aircraft.holdPos(rec.plane);
        rec.cart = makeCart(); rec.path = cartPath(from); rec.s = 0; rec.cartState = 'tow';
      }
      if (rec.cartState === 'tow') {
        rec.s = Math.min(rec.path.len, rec.s + 7 * dt);
        const u = rec.s / rec.path.len, pt = rec.path.c.getPointAt(u), tg = rec.path.c.getTangentAt(u);
        rec.cart.position.set(pt.x, 0, pt.z); rec.cart.rotation.y = Math.atan2(tg.x, tg.z);
        if (rec.s >= rec.path.len) { rec.cartState = 'feed'; rec.feeding = true; rec.feedT = 0; }
      }
      if (rec.cartState === 'feed') {
        rec.feedT -= dt;
        const next = rec.bags.find((b) => b.state === 'hold');
        const entry = Math.PI / 2;
        const clear = !rec.bags.some((b) => b.state === 'belt' && Math.abs(Math.atan2(Math.sin(b.th - entry), Math.cos(b.th - entry))) < 0.3);
        if (next && rec.feedT <= 0 && clear) {
          next.state = 'belt'; next.th = entry; rec.feedT = 1.2;
          if (!rec.firstBag) { rec.firstBag = t; SK.bus.emit('ops', { t, kind: 'info', msg: 'First bag on carousel ' + (rec.carousel + 1) + ' for ' + rec.num + ', ' + Math.round((t - rec.blockIn) / 60) + ' min after on-blocks' }); }
        }
        if (!next && rec.spawned >= rec.figures) {
          rec.lastBag = rec.lastBag || t; rec.feeding = false; rec.cartState = 'done';
          root.remove(rec.cart); E.pick.remove(rec.cart);
          A.recent.push({ first: (rec.firstBag || t) - rec.blockIn, last: t - rec.blockIn });
          if (A.recent.length > 8) A.recent.shift();
        }
      }
      rec.bags.forEach((b) => {
        if (b.state !== 'belt') return;
        b.th += dt * 0.32;
        const o = b.owner;
        // owner standing at the belt grabs the bag as it passes
        if (o.waitTh != null && !o.dead && Math.abs(Math.atan2(Math.sin(b.th - o.waitTh), Math.cos(b.th - o.waitTh))) < 0.12 && o.arrived) { b.state = 'taken'; A.stats.bagsDelivered++; }
      });
      const live = rec.pax.some((a) => !a.dead) || rec.spawned < rec.figures || rec.cartState !== 'done';
      if (!live) { carouselLoad[rec.carousel]--; A.list.splice(i, 1); }
    }
    // e-gate doors
    egDoors.forEach((g) => { if (g.open > 0) g.open -= dt; g.d.scale.z += ((g.open > 0 ? 0.06 : 1) - g.d.scale.z) * Math.min(1, dt * 8); });
    // pickup cars
    carT -= dt;
    const unassigned = waiting.filter((a) => !a.car && !a.dead);
    if (carT <= 0 && unassigned.length) {
      const target = unassigned[0];
      const g = car();
      const c = { g, z: AR.roadZ1, stopZ: target.z, state: 'in', riders: [target], wait: 0 };
      unassigned.slice(1).forEach((o) => { if (c.riders.length < 2 && Math.abs(o.z - target.z) < 5) c.riders.push(o); });
      c.riders.forEach((r) => (r.car = c));
      cars.push(c);
      carT = 1.5;
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      if (c.state === 'in') { c.z -= Math.max(2, Math.min(14, (c.z - c.stopZ) * 1.2)) * dt; if (c.z - c.stopZ < 0.2) { c.state = 'stop'; c.wait = 2.5; } }
      else if (c.state === 'stop') { c.wait -= dt; if (c.wait <= 0) { c.riders.forEach((r) => { r.picked = true; r.hidden = true; }); c.state = 'out'; } }
      else { c.z -= 12 * dt; if (c.z < AR.roadZ0) { root.remove(c.g); E.pick.remove(c.g); cars.splice(i, 1); continue; } }
      c.g.position.set(AR.roadX - 2.4, 0, c.z); c.g.rotation.y = Math.PI;
    }
    for (let i = waiting.length - 1; i >= 0; i--) if (waiting[i].dead || waiting[i].picked) waiting.splice(i, 1);
  };

  // draw carousel bags + arrivals board
  let boardT = 0;
  A.visual = function (dtReal) {
    let n = 0;
    if (!SK.layers || SK.layers.bags !== false) {
      for (const rec of A.list) for (const b of rec.bags) {
        if (b.state !== 'belt' || n >= MAXB) continue;
        const p = ovalPos(rec.carousel, b.th, 0);
        mx.makeRotationY(-b.th); mx.setPosition(p.x, 1.15, p.z);
        bagMesh.setMatrixAt(n, mx); col.setHex(b.color); bagMesh.setColorAt(n, col); bagMap[n] = b; n++;
      }
    }
    bagMesh.count = n; bagMesh.instanceMatrix.needsUpdate = true;
    if (bagMesh.instanceColor) bagMesh.instanceColor.needsUpdate = true;
    boardT -= dtReal;
    if (boardT > 0) return;
    boardT = 1;
    const c = fc.getContext('2d');
    c.fillStyle = '#0c1522'; c.fillRect(0, 0, 1024, 576);
    c.fillStyle = '#62d48f'; c.font = 'bold 40px system-ui, sans-serif'; c.textBaseline = 'middle';
    c.fillText('ARRIVALS', 30, 38);
    c.fillStyle = '#9fb3c8'; c.font = 'bold 30px system-ui, sans-serif'; c.fillText(SK.fmtTime(now()), 870, 38);
    c.font = 'bold 22px system-ui, sans-serif'; c.fillStyle = '#7f93a8';
    ['ON BLOCKS', 'FLIGHT', 'FROM', 'BELT', 'STATUS'].forEach((h, i) => c.fillText(h, [30, 190, 360, 660, 760][i], 86));
    A.list.slice(-9).reverse().forEach((r, k) => {
      const y = 128 + k * 50;
      c.fillStyle = k % 2 ? '#101c2b' : '#0c1522'; c.fillRect(0, y - 24, 1024, 50);
      c.fillStyle = '#ffffff'; c.font = 'bold 30px ui-monospace, monospace';
      c.fillText(SK.fmtTime(r.blockIn), 30, y); c.fillText(r.num, 190, y);
      c.font = 'bold 30px system-ui, sans-serif'; c.fillText(r.origin, 360, y); c.fillText(String(r.carousel + 1), 675, y);
      const s = r.cartState === 'done' ? 'Bags delivered' : r.firstBag ? 'Bags on belt' : 'On blocks';
      c.fillStyle = r.firstBag ? '#62d48f' : '#f2d38a'; c.fillText(s, 760, y);
    });
    ftex.needsUpdate = true;
  };

  A.kpi = function (k) {
    const t = now();
    k.waitArrImm = Math.round(Math.max(st.manual.predictedWait(), st.manual.observedWait(t, 1200)) / 60);
    const r = A.recent;
    k.firstBag = r.length ? Math.round(r.reduce((s, x) => s + x.first, 0) / r.length / 60) : null;
    k.lastBag = r.length ? Math.round(r.reduce((s, x) => s + x.last, 0) / r.length / 60) : null;
    k.arrived = A.stats.arrived * P;
    k.pir = A.stats.pir * P;
    k.customsStops = A.stats.stops * P;
    k.duty = A.stats.duty;
  };
  A.root = root;
  return A;
})();
