// SkyOps terminal: building shell, check-in, security, passport, airside, gates.
// Also publishes station geometry (server and stage positions, queue rectangles, seats, staff posts) for the sim.
SK.terminal = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine;
  const T = { defs: {}, anims: [] };
  const root = new THREE.Group(); root.name = 'terminal';
  E.scene.add(root);
  const B = new K.Batch();
  const D = T.defs;
  D.staffPosts = [];
  const post = (role, x, z, ry, ref) => D.staffPosts.push({ role, x, z, ry, ref });
  const spread = (x0, x1, n) => Array.from({ length: n }, (_, i) => x0 + ((i + 0.5) * (x1 - x0)) / n);

  const tw = L.term.x1 - L.term.x0, td = L.term.z1 - L.term.z0, cx = (L.term.x0 + L.term.x1) / 2;

  // ---------- shell ----------
  K.ground(tw, L.term.z1 - L.secWallZ, M.floor, cx, 0.03, (L.term.z1 + L.secWallZ) / 2, root);
  K.ground(tw, L.secWallZ - L.term.z0, M.floorAir, cx, 0.03, (L.secWallZ + L.term.z0) / 2, root);
  B.box(tw + 2, 0.3, td + 2, M.concrete, cx, -0.3, (L.term.z0 + L.term.z1) / 2);
  // glass curtain walls with mullions; south facade has door gaps
  function glassWall(x0, z0, x1, z1, h, gaps) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    const segs = [];
    let cur = 0;
    (gaps || []).slice().sort((a, b) => a[0] - b[0]).forEach(([g0, g1]) => { if (g0 > cur) segs.push([cur, g0]); cur = g1; });
    if (cur < len) segs.push([cur, len]);
    segs.forEach(([a, b]) => {
      const mid = (a + b) / 2, l = b - a;
      const mx = x0 + Math.cos(ang) * mid, mz = z0 + Math.sin(ang) * mid;
      B.add(K.geo.box(l, h, 0.12), M.glass, K.matrix(mx, h / 2, mz, -ang));
      for (let s = a; s <= b + 0.01; s += 4) B.box(0.18, h, 0.3, M.steel, x0 + Math.cos(ang) * s, 0, z0 + Math.sin(ang) * s);
    });
    // transom above gaps
    (gaps || []).forEach(([g0, g1]) => {
      const mid = (g0 + g1) / 2;
      B.add(K.geo.box(g1 - g0, h - 3.2, 0.12), M.glass, K.matrix(x0 + Math.cos(ang) * mid, 3.2 + (h - 3.2) / 2, z0 + Math.sin(ang) * mid, -ang));
    });
    B.box(len, 0.4, 0.4, M.steel, x0 + Math.cos(ang) * len / 2, h - 0.4, z0 + Math.sin(ang) * len / 2, -ang);
  }
  const H = 9;
  glassWall(L.term.x0, L.term.z1, L.term.x1, L.term.z1, H, L.doors.map((x) => [x - L.term.x0 - 2.5, x - L.term.x0 + 2.5]));
  glassWall(L.term.x0, L.term.z0, L.term.x0, L.term.z1, H, [[L.westDoor.z - L.term.z0 - 2.5, L.westDoor.z - L.term.z0 + 2.5]]);
  glassWall(L.term.x1, L.term.z0, L.term.x1, L.term.z1, H, [[L.crewRoom.door.z - L.term.z0 - 1.2, L.crewRoom.door.z - L.term.z0 + 1.2], [30 - L.term.z0 - 1, 30 - L.term.z0 + 1]]);
  glassWall(L.term.x0, L.term.z0, L.term.x1, L.term.z0, H, L.gates.map((g) => { const d = L.gateDoor(g); return [d.x - L.term.x0 - 1.3, d.x - L.term.x0 + 1.3]; }));
  // security boundary wall (frosted glass), open at the screening entrances
  const secGaps = [[L.ftEntrance.x0 - L.term.x0, L.ftEntrance.x1 - L.term.x0], [L.secEntrance.x0 - L.term.x0, L.secEntrance.x1 - L.term.x0]];
  glassWall(L.term.x0, L.secWallZ, L.term.x1, L.secWallZ, 3, secGaps);
  // lane exit barrier between passport hall and the security zone (one-way glass), open between lanes and queues
  B.box(28, 2.2, 0.15, M.glassDark, 86, 0, 4);

  // roof (toggle layer) and hanging light strips
  const roof = new THREE.Group(); roof.name = 'roof';
  const rb = new K.Batch();
  rb.box(tw + 6, 0.6, td + 6, M.roof, cx, H + 0.4, (L.term.z0 + L.term.z1) / 2);
  for (let x = L.term.x0 + 10; x < L.term.x1; x += 20) rb.box(4, 0.8, td - 6, M.glass, x, H + 0.6, (L.term.z0 + L.term.z1) / 2);
  rb.build(roof, { castShadow: true });
  roof.visible = false;
  root.add(roof);
  T.roof = roof;
  // ceiling light strips: no shadows (they would stripe the floor)
  const LB = new K.Batch();
  for (let z = L.term.z0 + 4; z < L.term.z1 - 2; z += 8) for (let x = L.term.x0 + 8; x < L.term.x1 - 4; x += 16) LB.box(6, 0.05, 0.18, M.lightStrip, x, 8.8, z);
  LB.build(root, { castShadow: false, receiveShadow: false });

  // ---------- check-in ----------
  D.checkin = {};
  const groupStyle = { priority: M.priority, economy: M.desk, bagdrop: M.kiosk, special: M.desk };
  Object.keys(L.groups).forEach((k) => {
    const g = L.groups[k];
    const xs = spread(g.x0, g.x1, g.n);
    const servers = xs.map((x, i) => ({ x, z: L.checkin.counterZ + 1.3, label: (k === 'bagdrop' ? 'Drop ' : 'Desk ') + (i + 1) }));
    xs.forEach((x, i) => {
      const w = (g.x1 - g.x0) / g.n;
      if (k === 'bagdrop') {
        B.box(w * 0.55, 1.1, 1.4, M.kiosk, x - w * 0.18, 0, L.checkin.counterZ - 0.2);
        B.box(w * 0.3, 0.5, 1.6, M.belt, x + w * 0.25, 0, L.checkin.counterZ - 0.1);
        B.box(0.5, 0.35, 0.05, M.screen, x - w * 0.18, 1.2, L.checkin.counterZ + 0.52);
      } else {
        B.box(w * 0.62, 1.05, 1.1, groupStyle[k], x - w * 0.16, 0, L.checkin.counterZ - 0.4);
        B.box(w * 0.66, 0.06, 1.2, M.deskTop, x - w * 0.16, 1.05, L.checkin.counterZ - 0.4);
        B.box(w * 0.3, 0.4, 1.3, M.belt, x + w * 0.3, 0, L.checkin.counterZ - 0.4);        // bag scale
        B.box(0.45, 0.32, 0.04, M.screen, x - w * 0.16, 1.15, L.checkin.counterZ - 0.85);
        post('r_checkin', x - w * 0.16, L.checkin.agentZ, 0, { st: k, i });
      }
      // desk number sign
      const s = K.sign(String(i + 1 + (k === 'economy' ? 0 : 0)), 0.9, 0.5, { bg: k === 'priority' ? '#8a6a2f' : '#16324f', font: 'bold 160px system-ui, sans-serif' });
      s.position.set(x, 2.6, L.checkin.counterZ - 1.2); root.add(s);
    });
    // back panel + header sign per group
    B.box(g.x1 - g.x0, 3.4, 0.25, M.wallDark, (g.x0 + g.x1) / 2, 0, L.checkin.counterZ - 2.2);
    const label = { priority: ['FIRST · BUSINESS', 'Priority check-in'], economy: ['ECONOMY', 'Check-in desks 1 to 10'], bagdrop: ['AUTO BAG DROP', 'Tag your bag, then drop it'], special: ['SPECIAL ASSISTANCE', 'Wheelchairs · Oversize'] }[k];
    const hs = K.sign(label, Math.min(14, g.x1 - g.x0 - 1), 1.6, { bg: k === 'priority' ? '#2b2116' : '#16324f', fg: k === 'priority' ? '#f2d38a' : '#ffffff', font: 'bold 70px system-ui, sans-serif', accent: '#f2b134' });
    hs.position.set((g.x0 + g.x1) / 2, 4.3, L.checkin.counterZ - 2.05); root.add(hs);
    const qr = { x0: g.x0 + 1, x1: g.x1 - 1, z0: L.checkin.counterZ + 2.6, z1: k === 'economy' ? 48 : 46 };
    D.checkin[k] = { servers, queue: SK.serpentine(qr, { headX: 'x0', headZ: 'z0' }) };
    K.hit(g.x1 - g.x0, 1.4, 3, (g.x0 + g.x1) / 2, 0, L.checkin.counterZ - 0.4, root, { priority: 'desk_priority', economy: 'desk_economy', bagdrop: 'bagdrop', special: 'special_desk' }[k]);
  });
  // kiosks: freestanding, two rows facing the entrance
  const kx = spread(L.kiosks.x0, L.kiosks.x1, L.kiosks.perRow);
  const kServers = [];
  L.kiosks.rows.forEach((rz) => kx.forEach((x) => {
    B.box(0.7, 1.45, 0.5, M.kiosk, x, 0, rz);
    B.box(0.55, 0.42, 0.04, M.screen, x, 1.05, rz + 0.27);
    kServers.push({ x, z: rz + 0.95, label: 'Kiosk ' + (kServers.length + 1) });
  }));
  D.kiosks = { servers: kServers, queue: SK.serpentine({ x0: L.kiosks.x0 + 1, x1: L.kiosks.x1 - 1, z0: 49.4, z1: 53.6 }, { headX: 'x1', headZ: 'z0' }) };
  K.hit(L.kiosks.x1 - L.kiosks.x0, 1.6, 7, (L.kiosks.x0 + L.kiosks.x1) / 2, 0, 45.2, root, 'kiosk');

  // collector belts: priority section dives at its east end; main section dives at the security entrance
  const beltZ = L.checkin.beltZ;
  const belts = [[L.groups.priority.x0, L.groups.priority.x1 + 0.6], [L.groups.economy.x0, L.beltDropX], [L.groups.special.x0, L.term.x1]];
  belts.forEach(([a, b]) => {
    B.box(b - a, 0.6, 0.9, M.beltFrame, (a + b) / 2, 0, beltZ);
    B.box(b - a, 0.05, 0.75, M.belt, (a + b) / 2, 0.6, beltZ);
  });
  [L.groups.priority.x1 + 0.6, L.beltDropX].forEach((x) => B.box(1.6, 0.05, 1.4, M.black, x + 0.8, 0.02, beltZ));
  D.belts = { z: beltZ, segments: belts };
  K.hit(L.beltDropX - L.groups.economy.x0, 0.8, 1.2, (L.beltDropX + L.groups.economy.x0) / 2, 0, beltZ, root, 'belt');

  // FIDS boards
  const fidsCanvas = document.createElement('canvas');
  fidsCanvas.width = 1024; fidsCanvas.height = 576;
  const fidsTex = new THREE.CanvasTexture(fidsCanvas);
  fidsTex.encoding = THREE.sRGBEncoding;
  const fidsMat = new THREE.MeshBasicMaterial({ map: fidsTex, toneMapped: false, side: THREE.DoubleSide });
  [[-10, 49, 0], [40, 49, 0], [0, -9.8, 0], [-60, -26.5, Math.PI], [60, -26.5, Math.PI]].forEach(([x, z, ry]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 4), fidsMat);
    m.position.set(x, 5.2, z); m.rotation.y = ry;
    root.add(m);
    B.box(0.15, 3.4, 0.15, M.darkSteel, x, 7.2, z);
    E.pick.add(m, 'fids');
  });
  T.updateFids = function (flights, now) {
    const c = fidsCanvas.getContext('2d');
    c.fillStyle = '#0c1522'; c.fillRect(0, 0, 1024, 576);
    c.fillStyle = '#f2b134'; c.font = 'bold 40px system-ui, sans-serif'; c.textBaseline = 'middle';
    c.fillText('DEPARTURES', 30, 38);
    c.fillStyle = '#9fb3c8'; c.font = 'bold 30px system-ui, sans-serif';
    c.fillText(SK.fmtTime(now), 870, 38);
    c.font = 'bold 22px system-ui, sans-serif'; c.fillStyle = '#7f93a8';
    ['TIME', 'FLIGHT', 'DESTINATION', 'GATE', 'STATUS'].forEach((h, i) => c.fillText(h, [30, 140, 300, 640, 750][i], 86));
    const list = flights.filter((f) => !f.departed || now - f.offBlockAt < 600).slice(0, 9);
    list.forEach((f, r) => {
      const y = 128 + r * 50;
      c.fillStyle = r % 2 ? '#101c2b' : '#0c1522'; c.fillRect(0, y - 24, 1024, 50);
      c.font = 'bold 30px ui-monospace, monospace'; c.fillStyle = '#ffffff';
      c.fillText(SK.fmtTime(f.std), 30, y);
      c.fillText(f.num, 140, y);
      c.font = 'bold 30px system-ui, sans-serif';
      c.fillText(f.city, 300, y);
      c.fillText(f.gate, 650, y);
      const st = f.statusText || 'Scheduled';
      c.fillStyle = /Delayed|Final/.test(st) ? '#ff8a5c' : /Boarding|Go to gate/.test(st) ? '#62d48f' : /closed|Departed|Taxiing/.test(st) ? '#7f93a8' : '#f2d38a';
      c.fillText(st + (f.delayMin >= 15 && !f.departed ? ' ' + SK.fmtTime(f.etd) : ''), 750, y);
    });
    fidsTex.needsUpdate = true;
  };

  // ---------- security ----------
  // document check podiums (landside queue in front, officers behind)
  const podXs = L.podiums;
  podXs.concat([L.ftPodium]).forEach((x) => {
    B.box(1.1, 1.15, 0.7, M.desk, x, 0, 27.6);
    B.box(0.4, 0.3, 0.04, M.screen, x, 1.2, 27.9);
    post('r_tso', x, 26.7, 0, { st: x === L.ftPodium ? 'ftdoc' : 'doc' });
  });
  D.doc = { servers: podXs.map((x, i) => ({ x, z: 28.7, label: 'Podium ' + (i + 1) })), queue: SK.serpentine(L.docQueue, { headX: 'x0', headZ: 'z0' }) };
  D.ftDoc = { servers: [{ x: L.ftPodium, z: 28.7, label: 'Fast track podium' }], queue: SK.serpentine(L.ftDocQueue, { headX: 'x1', headZ: 'z0', spacing: 0.8 }) };
  K.hit(46, 1.3, 1.4, 51, 0, 27.6, root, 'docpodium');
  K.hit(3, 1.3, 1.4, L.ftPodium, 0, 27.6, root, 'docpodium');
  const secSign = K.sign(['SECURITY', 'Have your boarding pass and ID ready'], 12, 1.8, { bg: '#16324f', font: 'bold 64px system-ui, sans-serif', accent: '#f2b134' });
  secSign.position.set(53, 5, 29.6); root.add(secSign);
  const ftSign = K.sign(['FAST TRACK', 'First · Business · Status'], 6, 1.4, { bg: '#2b2116', fg: '#f2d38a', font: 'bold 60px system-ui, sans-serif' });
  ftSign.position.set(-72, 5, 29.6); root.add(ftSign);

  // screening lanes
  const LN = L.lane;
  D.lanes = L.lanes.map((lx, i) => {
    const bx = lx - 1.6;  // belt line
    B.box(1.2, 0.85, LN.entryZ - 1 - LN.recompZ + 2.5, M.beltFrame, bx, 0, (LN.entryZ - 1 + LN.recompZ - 2.5) / 2);
    B.box(1.0, 0.04, LN.entryZ - 1 - LN.recompZ + 2.5, M.belt, bx, 0.86, (LN.entryZ - 1 + LN.recompZ - 2.5) / 2);
    B.box(1.9, 1.9, LN.xrayZ0 - LN.xrayZ1, M.white, bx, 0, (LN.xrayZ0 + LN.xrayZ1) / 2);           // X-ray tunnel
    B.box(1.95, 0.25, LN.xrayZ0 - LN.xrayZ1 + 0.05, M.blueMark, bx, 1.9, (LN.xrayZ0 + LN.xrayZ1) / 2);
    B.box(0.6, 1.1, 0.5, M.desk, bx - 1.3, 0, LN.xrayZ1 - 0.6);                                     // operator desk
    B.box(0.5, 0.35, 0.04, M.screen, bx - 1.3, 1.15, LN.xrayZ1 - 0.85);
    // body scanner portal (two curved panels approximated by boxes)
    const sx = lx + LN.scanDx;
    B.box(0.25, 2.3, 1.6, M.kiosk, sx - 0.85, 0, LN.scanZ);
    B.box(0.25, 2.3, 1.6, M.kiosk, sx + 0.85, 0, LN.scanZ);
    B.box(1.95, 0.2, 1.6, M.kiosk, sx, 2.3, LN.scanZ);
    B.box(1.6, 0.03, 1.4, M.yellowMark, sx, 0.04, LN.scanZ);
    // divest table and recompose bench
    B.box(1.2, 0.85, 2.4, M.steel, bx + 1.2, 0, LN.divestZ);
    B.box(2.4, 0.5, 0.5, M.steel, bx + 1.6, 0, LN.recompZ - 1.6);
    // lane number + lane divider rail
    const ls = K.sign(i === 0 ? 'FAST TRACK' : 'LANE ' + i, 2.6, 0.7, { bg: i === 0 ? '#2b2116' : '#16324f', fg: i === 0 ? '#f2d38a' : '#ffffff', font: 'bold 110px system-ui, sans-serif' });
    ls.position.set(lx, 3.3, LN.entryZ + 0.2); root.add(ls);
    B.box(0.08, 1, LN.entryZ - LN.exitZ, M.darkSteel, lx + 4.3, 0, (LN.entryZ + LN.exitZ) / 2);
    post('r_tso', bx - 1.3, LN.xrayZ1 - 1.2, Math.PI, { st: 'lane', i, pos: 'xray' });
    post('r_tso', sx + 1.6, LN.scanZ - 0.6, -Math.PI / 2, { st: 'lane', i, pos: 'scanner' });
    post('r_tso', lx + 2.6, LN.divestZ + 0.8, -Math.PI / 2, { st: 'lane', i, pos: 'divest' });
    K.hit(2.2, 2.2, LN.xrayZ0 - LN.xrayZ1, bx, 0, (LN.xrayZ0 + LN.xrayZ1) / 2, root, 'xray');
    K.hit(2.2, 2.5, 1.8, sx, 0, LN.scanZ, root, 'bodyscanner');
    K.hit(8, 1.2, LN.entryZ - LN.exitZ, lx, 0, (LN.entryZ + LN.exitZ) / 2, root, 'lane');
    return {
      x: lx, beltX: bx, scanX: sx,
      // two virtual lane-loading places, one physical place at the lane mouth, then divest, scan, recompose
      stages: [{ x: lx + 1.0, z: LN.entryZ + 2.0, virtual: true }, { x: lx + 0.2, z: LN.entryZ + 2.0, virtual: true }, { x: lx + 0.6, z: LN.entryZ + 0.9 }, { x: lx + 0.4, z: LN.divestZ }, { x: sx, z: LN.scanZ }, { x: lx + 0.4, z: LN.recompZ }],
      entry: { x: lx + 0.6, z: LN.entryZ }, exit: { x: lx + 0.6, z: LN.exitZ },
    };
  });
  D.secQueue = SK.serpentine(L.secQueue, { headX: 'x0', headZ: 'z0' });
  D.ftQueue = SK.serpentine(L.ftQueue, { headX: 'x1', headZ: 'z0', spacing: 0.8 });
  post('r_tso', L.secQueue.x0 - 1.2, L.secQueue.z0 + 0.4, Math.PI / 2, { st: 'laneOfficer' });
  // secondary search tables + pat-down booth
  for (let i = 0; i < 3; i++) B.box(2.4, 0.9, 1, M.steel, 52 + i * 7, 0, 11);
  [[52, 0], [59, 0], [66, 0]].forEach(([x]) => post('r_tso', x, 10.1, 0, { st: 'search' }));
  B.box(3, 2.2, 0.1, M.glassDark, L.patdown.x, 0, L.patdown.z - 1.5);
  B.box(3.4, 0.03, 3, M.blueMark, L.patdown.x, 0.04, L.patdown.z);
  D.search = { tables: [{ x: 52, z: 12.2 }, { x: 59, z: 12.2 }, { x: 66, z: 12.2 }], patdown: { x: L.patdown.x, z: L.patdown.z } };
  K.hit(24, 1.2, 6, 59, 0, 11, root, 'secondary');
  K.hit(3.4, 2.2, 3, L.patdown.x, 0, L.patdown.z, root, 'patdown');
  K.ground(L.secQueue.x1 - L.secQueue.x0, L.secQueue.z1 - L.secQueue.z0, M.carpet, (L.secQueue.x0 + L.secQueue.x1) / 2, 0.035, (L.secQueue.z0 + L.secQueue.z1) / 2, root);

  // ---------- passport control ----------
  const P = L.passport;
  const boothX = spread(P.manual.x0, P.manual.x1, P.manual.n);
  boothX.forEach((x, i) => {
    B.box(2.2, 1.25, 2.2, M.wallDark, x, 0, P.manual.boothZ);
    B.box(2.2, 1.0, 2.2, M.glass, x, 1.25, P.manual.boothZ);
    B.box(2.3, 0.15, 2.3, M.wallDark, x, 2.25, P.manual.boothZ);
    post('r_immigration', x - 0.2, P.manual.boothZ, Math.PI / 2, { st: 'manual', i });
    const s = K.sign(String(i + 1), 0.6, 0.6, { bg: '#16324f', font: 'bold 160px system-ui, sans-serif' });
    s.position.set(x, 2.8, P.manual.boothZ + 1.16); root.add(s);
  });
  D.manual = { servers: boothX.map((x, i) => ({ x: x + 1.75, z: P.manual.boothZ, label: 'Booth ' + (i + 1) })), queue: SK.serpentine(P.manual.queue, { headX: 'x0', headZ: 'z0' }) };
  const egX = spread(P.egate.x0, P.egate.x1, P.egate.n);
  T.egateDoors = [];
  egX.forEach((x, i) => {
    B.box(0.3, 1.1, 2.6, M.kiosk, x - 0.75, 0, P.egate.gateZ);
    B.box(0.3, 1.1, 2.6, M.kiosk, x + 0.75, 0, P.egate.gateZ);
    B.box(0.3, 0.35, 0.3, M.screen, x - 0.75, 1.1, P.egate.gateZ + 1);
    // entry and exit doors (animated: scale to 0.05 when open)
    const doors = [P.egate.gateZ + 1.3, P.egate.gateZ - 1.3].map((dz) => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.06), M.glassDark);
      d.position.set(x, 0.6, dz); root.add(d);
      return d;
    });
    T.egateDoors.push({ doors, open: [0, 0] });
  });
  D.egate = { servers: egX.map((x, i) => ({ x, z: P.egate.gateZ, label: 'e-gate ' + (i + 1) })), queue: SK.serpentine(P.egate.queue, { headX: 'x0', headZ: 'z0' }) };
  post('r_immigration', P.egate.x1 + 1.5, P.egate.gateZ - 0.5, -Math.PI / 2, { st: 'egateSup' });
  K.hit(P.manual.x1 - P.manual.x0, 2.4, 2.6, (P.manual.x0 + P.manual.x1) / 2, 0, P.manual.boothZ, root, 'booth');
  K.hit(P.egate.x1 - P.egate.x0, 1.4, 2.8, (P.egate.x0 + P.egate.x1) / 2, 0, P.egate.gateZ, root, 'egate');
  const ppSign = K.sign(['PASSPORT CONTROL', 'ePassports: use the e-gates'], 14, 1.8, { bg: '#16324f', font: 'bold 64px system-ui, sans-serif', accent: '#f2b134' });
  ppSign.position.set(-5, 4.6, 2.2); root.add(ppSign);

  // ---------- airside ----------
  // duty free: floor, shelving along the winding path, tills
  const DF = L.dutyfree;
  K.ground(DF.x1 - DF.x0, DF.z1 - DF.z0, M.wood, (DF.x0 + DF.x1) / 2, 0.04, (DF.z0 + DF.z1) / 2, root);
  const goodsMats = [M.goods, M.goods2, M.goods3];
  [[-34, -13], [-34, -18], [-12, -12.4], [-12, -23], [12, -12.4], [34, -19], [34, -14], [12, -23], [-30, -23], [30, -23]].forEach(([x, z], i) => {
    B.box(5, 1.8, 0.9, M.shelf, x, 0, z);
    for (let k = 0; k < 4; k++) B.box(1, 0.35, 0.6, goodsMats[(i + k) % 3], x - 1.8 + k * 1.2, 0.5 + (k % 2) * 0.65, z);
  });
  [[-14, -17], [12, -19.5], [-6, -21.5]].forEach(([x, z], i) => {   // islands
    B.box(3, 1.0, 1.6, M.white, x, 0, z);
    B.box(2.6, 0.3, 1.2, goodsMats[i % 3], x, 1.0, z);
  });
  D.tills = [{ x: -4, z: -15.4 }, { x: 4, z: -15.4 }];
  D.tills.forEach((t) => { B.box(2.2, 1.0, 0.8, M.desk, t.x, 0, t.z - 1.1); post('r_retail', t.x, t.z - 2.0, 0, { st: 'till' }); });
  D.shopStops = [{ x: -22, z: -12.8 }, { x: -32, z: -16.2 }, { x: -12, z: -21.6 }, { x: 12, z: -21.6 }, { x: 32, z: -17 }, { x: 12, z: -13.8 }, { x: -14, z: -18.6 }, { x: 12, z: -18 }];
  const dfs = K.sign(['DUTY FREE', 'Fragrance · Spirits · Chocolate · Electronics'], 14, 1.8, { bg: '#4a1d2e', fg: '#ffe8c2', font: 'bold 60px system-ui, sans-serif' });
  dfs.position.set(0, 4.5, -10.6); root.add(dfs);
  K.hit(DF.x1 - DF.x0, 0.2, DF.z1 - DF.z0, 0, 0, (DF.z0 + DF.z1) / 2, root, 'dutyfree');

  // food court: counters on the back wall, tables, seating slots
  const F = L.food;
  K.ground(F.x1 - F.x0, F.z1 - F.z0, M.floor, (F.x0 + F.x1) / 2, 0.04, (F.z0 + F.z1) / 2, root);
  B.box(F.x1 - F.x0, 3.2, 0.3, M.wallDark, (F.x0 + F.x1) / 2, 0, F.z1);
  D.cafe = { servers: [], queue: SK.serpentine({ x0: -94, x1: -70, z0: -18.6, z1: -16.2 }, { headX: 'x0', headZ: 'z1' }) };
  [-90, -82, -74].forEach((x, i) => {
    B.box(6, 1.05, 1.2, i === 1 ? M.red : i === 2 ? M.green : M.wood, x, 0, F.z1 - 1.4);
    B.box(5, 0.6, 0.06, M.screenWarm, x, 2.3, F.z1 - 0.3);
    D.cafe.servers.push({ x, z: F.z1 - 2.9, label: ['Coffee', 'Grill', 'Noodles'][i] });
    post('r_barista', x - 1.2, F.z1 - 0.6, Math.PI, { st: 'cafe', i });
  });
  D.foodSeats = [];
  for (let x = -92; x <= -54; x += 5.5) for (let z = -22; z <= -19; z += 3.2) {
    B.cyl(0.6, 0.75, M.white, x, 0, z, 14);
    [[-0.95, 0], [0.95, 0]].forEach(([dx]) => { B.box(0.5, 0.45, 0.5, M.seat, x + dx, 0, z); D.foodSeats.push({ x: x + dx, z, ry: dx < 0 ? Math.PI / 2 : -Math.PI / 2 }); });
  }
  const fcs = K.sign(['FOOD COURT', 'Coffee · Grill · Noodles · Bar'], 10, 1.5, { bg: '#5a3a1a', fg: '#fff1d6', font: 'bold 64px system-ui, sans-serif' });
  fcs.position.set(-73, 4.2, F.z0 - 0.2); fcs.rotation.y = Math.PI; root.add(fcs);
  K.hit(F.x1 - F.x0, 0.2, F.z1 - F.z0, (F.x0 + F.x1) / 2, 0, (F.z0 + F.z1) / 2, root, 'food');
  K.hit(24, 1.4, 1.6, -82, 0, F.z1 - 1.4, root, 'cafe');

  // lounge: walls, desk, seating
  const LO = L.lounge;
  K.ground(LO.x1 - LO.x0, LO.z1 - LO.z0, M.carpetRed, (LO.x0 + LO.x1) / 2, 0.04, (LO.z0 + LO.z1) / 2, root);
  B.box(LO.x1 - LO.x0 - 8, 3, 0.2, M.glassDark, (LO.x0 + LO.x1) / 2 + 4, 0, LO.z0);
  B.box(0.2, 3, LO.z1 - LO.z0, M.wallDark, LO.x0, 0, (LO.z0 + LO.z1) / 2);
  B.box(0.2, 3, 6, M.wallDark, 82, 0, LO.z0 + 3);                // first class partition
  B.box(4, 1.1, 1, M.wood, LO.desk.x, 0, -21);
  post('r_lounge', LO.desk.x, -19.9, Math.PI, { st: 'lounge' });
  D.loungeDesk = { servers: [{ x: LO.desk.x, z: -22.6, label: 'Lounge desk' }], queue: SK.serpentine({ x0: 50, x1: 58, z0: -26.2, z1: -24.2 }, { headX: 'x0', headZ: 'z1' }) };
  D.loungeSeats = [];
  for (let x = 62; x <= 95; x += 3) for (let z = -21; z <= -13; z += 2.6) {
    const first = x > 82 && z < -18;
    B.box(1, 0.5, 1, first ? M.carpet : M.seatLounge, x, 0, z);
    B.box(1, 0.6, 0.25, first ? M.carpet : M.seatLounge, x, 0.5, z + 0.4);
    D.loungeSeats.push({ x, z: z - 0.05, ry: Math.PI, first });
  }
  for (let i = 0; i < 3; i++) B.box(5, 0.95, 1, M.white, 70 + i * 7, 0, -12.8);   // buffet
  const los = K.sign(['SKY LOUNGE', 'Business · First'], 7, 1.3, { bg: '#2b2116', fg: '#f2d38a', font: 'bold 64px system-ui, sans-serif' });
  los.position.set(54, 3.8, LO.z0 - 0.15); los.rotation.y = Math.PI; root.add(los);
  K.hit(LO.x1 - LO.x0, 0.3, LO.z1 - LO.z0, (LO.x0 + LO.x1) / 2, 0, (LO.z0 + LO.z1) / 2, root, 'lounge');

  // small rooms on the spine
  Object.keys(L.rooms).forEach((k) => {
    const r = L.rooms[k];
    const w = r.x1 - r.x0, d = r.z1 - r.z0, mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
    K.ground(w, d, k === 'prayer' ? M.carpet : M.floor, mx, 0.04, mz, root);
    B.box(w, 3, 0.2, M.wall, mx, 0, r.z1);
    B.box(0.2, 3, d, M.wall, r.x0, 0, mz);
    B.box(0.2, 3, d, M.wall, r.x1, 0, mz);
    B.box(w / 2 - 1, 3, 0.2, M.wall, r.x0 + (w / 2 - 1) / 2, 0, r.z0);
    B.box(w / 2 - 1, 3, 0.2, M.wall, r.x1 - (w / 2 - 1) / 2, 0, r.z0);
    if (k === 'smoking') B.box(w - 1, 0.6, d - 1, M.glassDark, mx, 2.4, mz);
    const s = K.sign({ prayer: 'Prayer room', nursing: 'Nursing room', smoking: 'Smoking room' }[k], 4, 0.6, { bg: '#2f3a48', font: 'bold 90px system-ui, sans-serif' });
    s.position.set(mx, 3.4, r.z0 - 0.15); s.rotation.y = Math.PI; root.add(s);
    K.hit(w, 3, d, mx, 0, mz, root, k);
  });
  D.rooms = { prayer: { x: -93, z: -4 }, nursing: { x: -81.5, z: -4 }, smoking: { x: 93, z: -4 } };

  // ---------- gates ----------
  D.gates = {};
  const seatGeo = new THREE.BoxGeometry(0.55, 0.45, 0.5);
  const seatMats = [];
  L.gates.forEach((g) => {
    const pod = L.podium(g), door = L.gateDoor(g);
    B.box(1.6, 1.1, 0.7, M.desk, pod.x, 0, pod.z);
    B.box(0.5, 0.35, 0.04, M.screen, pod.x - 0.3, 1.15, pod.z + 0.37);
    post('r_gateagent', pod.x - 0.4, pod.z - 0.7, 0, { st: 'gate', gate: g.id });
    post('r_gateagent', pod.x + 0.5, pod.z - 0.7, 0, { st: 'gate', gate: g.id });
    // gate screen (canvas, updated by ops)
    const scr = K.sign([g.id, ''], 3, 1.2, { bg: '#0c1522', font: 'bold 90px system-ui, sans-serif' });
    scr.position.set(door.x, 3.3, L.term.z0 + 0.4); scr.rotation.y = 0; root.add(scr);
    // seats
    const seats = [];
    const x0 = g.bus ? L.term.x0 + 1.5 : g.x - 12, x1 = g.bus ? g.x + 7 : g.x + 12;
    [-30.2, -32.4, -34.6].forEach((z, row) => {
      for (let x = x0; x <= x1; x += 0.72) {
        if (Math.abs(x - g.x) < 1.1 || (x > pod.x - 1.8 && x < pod.x + 1.8)) continue;
        if (row === 2 && x > pod.x - 3) continue;
        seats.push({ x, z, ry: Math.PI });
      }
    });
    // boarding queue: up the aisle beside the podium, then along the concourse
    const bq = [];
    for (let z = pod.z + 1.4; z <= -27.6; z += 0.75) bq.push({ x: pod.x, z });
    for (let x = pod.x - 0.8; x > pod.x - 18; x -= 0.75) bq.push({ x, z: -27.2 });
    D.gates[g.id] = { seats, boardQueue: bq, podium: { x: pod.x, z: pod.z + 1.0 }, door: { x: door.x, z: door.z }, screen: scr };
    K.hit(26, 0.2, 10, g.x, 0, -32, root, 'gates');
    K.hit(2, 1.3, 1, pod.x, 0, pod.z, root, 'gatepodium');
  });
  const allSeats = [].concat(...Object.values(D.gates).map((d) => d.seats));
  const seatMesh = new THREE.InstancedMesh(seatGeo, M.seat, allSeats.length);
  allSeats.forEach((s, i) => seatMesh.setMatrixAt(i, K.matrix(s.x, 0.45, s.z + 0.05)));
  seatMesh.castShadow = true; seatMesh.receiveShadow = true;
  const backMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.55, 0.1), M.seat, allSeats.length);
  allSeats.forEach((s, i) => backMesh.setMatrixAt(i, K.matrix(s.x, 0.95, s.z + 0.3)));
  root.add(seatMesh, backMesh);
  T.setGateScreen = function (gid, lines, color) {
    const scr = D.gates[gid].screen;
    const tex = K.textTexture(lines, { w: 640, h: 256, bg: color || '#0c1522', font: 'bold 72px system-ui, sans-serif' });
    scr.material.map.dispose();
    scr.material.map = tex;
  };
  // crew room annex
  const CR = L.crewRoom;
  B.box(CR.x1 - CR.x0, 3.4, CR.z1 - CR.z0, M.wall, (CR.x0 + CR.x1) / 2, 0, (CR.z0 + CR.z1) / 2);
  B.box(CR.x1 - CR.x0 + 0.4, 0.3, CR.z1 - CR.z0 + 0.4, M.wallDark, (CR.x0 + CR.x1) / 2, 3.4, (CR.z0 + CR.z1) / 2);
  const crs = K.sign('CREW', 3, 0.8, { bg: '#2f3a48', font: 'bold 120px system-ui, sans-serif' });
  crs.position.set(CR.x0 - 0.05, 2.6, CR.door.z); crs.rotation.y = -Math.PI / 2; root.add(crs);
  K.hit(CR.x1 - CR.x0, 3.6, CR.z1 - CR.z0, (CR.x0 + CR.x1) / 2, 0, (CR.z0 + CR.z1) / 2, root, 'crewroom');

  // hanging wayfinding
  [[['Check-in', 'Security  ↑'], -10, 54.5, 0], [['Security', '← Fast track  ·  Main →'], -40, 41, 0], [['Gates A1 to A5  ↑', 'Lounge · Food · Duty free'], 0, -8.6, 0],
   [['← A1 · A5', 'A3 · A4 →'], 0, -27.6, Math.PI], [['Prayer · Nursing ←', ''], -70, -8.6, 0]].forEach(([t, x, z, ry]) => {
    const s = K.sign(t, 6.5, 1.4, { bg: '#f2b134', fg: '#14202e', font: 'bold 70px system-ui, sans-serif' });
    s.position.set(x, 6.4, z); s.rotation.y = ry; root.add(s);
  });

  // zone floor pick targets (thin, under everything else)
  [['checkin', -100, 100, 30, 56], ['security', -80, 80, 4, 29], ['passport', -70, 62, -10, 3.5]].forEach(([id, x0, x1, z0, z1]) => K.hit(x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, root, id));

  // stanchion posts and ropes for every serpentine queue
  const qs = [D.checkin.priority.queue, D.checkin.economy.queue, D.checkin.bagdrop.queue, D.checkin.special.queue, D.kiosks.queue, D.doc.queue, D.ftDoc.queue, D.secQueue, D.ftQueue, D.manual.queue, D.egate.queue];
  const posts = [].concat(...qs.map((q) => q.posts));
  const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), M.steel, posts.length);
  posts.forEach((p, i) => postMesh.setMatrixAt(i, K.matrix(p[0], 0.5, p[1])));
  root.add(postMesh);
  qs.forEach((q) => q.ropes.forEach((r) => B.box(r[2] - r[0], 0.06, 0.04, M.rope, (r[0] + r[2]) / 2, 0.88, r[1])));

  B.build(root);

  // ---------- small animations: e-gate doors, X-ray trays ----------
  const trayGeo = new THREE.BoxGeometry(0.75, 0.12, 0.55);
  const trays = new THREE.InstancedMesh(trayGeo, new THREE.MeshStandardMaterial({ color: 0x5b6a7a, roughness: 0.6 }), 80);
  trays.count = 0; trays.frustumCulled = false;
  root.add(trays);
  const trayList = [];
  T.tray = function (laneIdx, dur) {
    if (trayList.length >= 80) return;
    const l = D.lanes[laneIdx];
    trayList.push({ x: l.beltX, z0: LN.divestZ, z1: LN.recompZ - 0.6, t: 0, dur: Math.max(2, dur) });
  };
  T.egate = function (i, which) { T.egateDoors[i].open[which] = 1.6; };
  T.update = function (dt) {
    T.egateDoors.forEach((g) => g.doors.forEach((d, k) => {
      if (g.open[k] > 0) g.open[k] -= dt;
      const target = g.open[k] > 0 ? 0.06 : 1;
      d.scale.x += (target - d.scale.x) * Math.min(1, dt * 8);
    }));
    let n = 0;
    for (let i = trayList.length - 1; i >= 0; i--) {
      const tr = trayList[i];
      tr.t += dt;
      if (tr.t >= tr.dur + 1.5) { trayList.splice(i, 1); continue; }
    }
    trayList.forEach((tr) => {
      const u = SK.clamp(tr.t / tr.dur, 0, 1);
      trays.setMatrixAt(n++, K.matrix(tr.x, 0.95, SK.lerp(tr.z0, tr.z1, u)));
    });
    trays.count = n;
    trays.instanceMatrix.needsUpdate = true;
  };
  T.root = root;
  return T;
})();
