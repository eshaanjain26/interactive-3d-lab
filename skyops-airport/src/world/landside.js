// SkyOps landside: roads, curb, canopy, garage, rail station, road vehicles and the train.
// Vehicles carry real passengers: the sim queues arrivals by mode and a vehicle delivers them to the curb.
SK.landside = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine;
  const root = new THREE.Group(); root.name = 'landside';
  E.scene.add(root);
  const B = new K.Batch();
  const S = { vehicles: [], pending: { car: [], taxi: [], bus: [], rail: [], garage: [] } };

  // ---------- ground and roads ----------
  K.ground(2200, 1400, M.grass, 0, -0.4, -150, root);
  const roadW = L.road.x1 - L.road.x0;
  K.ground(roadW, 10, M.asphalt, 0, 0.01, 69.5, root);                // curb road (two lanes, westbound)
  K.ground(roadW, 7, M.asphalt, 0, 0.01, L.road.returnZ, root);        // return road (eastbound)
  K.ground(8, L.road.returnZ - 66, M.asphalt, L.road.x0 + 4, 0.012, (66 + L.road.returnZ) / 2 + 1, root);
  K.ground(8, L.road.returnZ - 66, M.asphalt, L.road.x1 - 4, 0.012, (66 + L.road.returnZ) / 2 + 1, root);
  K.ground(roadW, 6, M.sidewalk, 0, 0.12, 61, root).position.y = 0.12;
  K.ground(roadW, 4, M.grass, 0, 0.02, 77.5, root);
  K.ground(roadW, 6, M.sidewalk, 0, 0.1, 90.5, root);
  // lane dashes and bay markings
  for (let x = L.road.x0 + 6; x < L.road.x1 - 6; x += 9) B.box(4, 0.02, 0.2, M.marking, x, 0.02, 69.5);
  for (let x = L.road.x0 + 6; x < L.road.x1 - 6; x += 9) B.box(4, 0.02, 0.2, M.yellowMark, x, 0.02, L.road.returnZ);
  B.box(roadW, 0.25, 0.3, M.concrete, 0, 0, 64.15);                    // curb edge
  for (let i = 0; i < 9; i++) B.box(0.7, 0.02, 9.6, M.marking, -4 + i * 1.1, 0.025, 69.5);   // crosswalk
  for (let i = 0; i < 9; i++) B.box(0.7, 0.02, 7, M.marking, -4 + i * 1.1, 0.025, L.road.returnZ);
  K.paint('TAXI', 10, 2.4, '#f1c232', root, -80, 66.2);
  K.paint('BUS · SHUTTLE', 16, 2.4, '#f2f2ee', root, 78, 66.2);
  K.paint('DROP-OFF ONLY', 18, 2.4, '#f2f2ee', root, -20, 66.2);

  // curb canopy: columns + roof slab
  for (let x = -150; x <= 150; x += 15) B.box(0.5, 7, 0.5, M.steel, x, 0, 63.4);
  B.box(330, 0.5, 9, M.roof, 0, 7, 60.5);
  for (let x = -145; x <= 145; x += 10) B.box(6, 0.08, 0.4, M.lightStrip, x, 6.95, 60.5);
  for (let x = -150; x <= 150; x += 3) B.cyl(0.14, 0.9, M.darkSteel, x, 0.12, 63.6, 8);   // bollards

  // overhead door signs
  const doorSigns = ['Priority check-in · Fast track', 'Check-in desks 1 to 10', 'Auto bag drop', 'Kiosks · Security', 'Special assistance'];
  L.doors.forEach((x, i) => {
    const s = K.sign(['DEPARTURES', doorSigns[i]], 9, 2.2, { bg: '#16324f', fg: '#ffffff', font: 'bold 72px system-ui, sans-serif', accent: '#f2b134' });
    s.position.set(x, 5.2, 59.6);
    root.add(s);
  });

  // curb desks: valet, VIP chauffeur, hotel shuttle
  [[30, 'VALET', '#1d4e89', 'valet'], [-58, 'VIP · CHAUFFEUR', '#2b2116', 'vip'], [96, 'HOTEL SHUTTLES', '#0f5c4d', 'hotel_shuttle']].forEach(([x, t, col, id]) => {
    B.box(2.4, 1.1, 1, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }), x, 0.12, 59.4);
    const s = K.sign(t, 3.6, 0.7, { bg: col, font: 'bold 100px system-ui, sans-serif' });
    s.position.set(x, 2.6, 59.1); root.add(s);
    K.hit(3, 2.4, 1.6, x, 0, 59.4, root, id);
  });
  SK.landsideDesks = [[30, 'valet'], [-58, 'vip'], [96, 'hotel_shuttle']];

  // ---------- garage ----------
  const G = L.garage, gw = G.x1 - G.x0, gd = G.z1 - G.z0;
  for (let d = 0; d < G.decks; d++) {
    B.box(gw, 0.4, gd, M.concrete, (G.x0 + G.x1) / 2, d * 3.2, (G.z0 + G.z1) / 2);
    if (d > 0) {
      B.box(gw, 1, 0.25, M.concrete, (G.x0 + G.x1) / 2, d * 3.2 + 0.4, G.z0);
      B.box(gw, 1, 0.25, M.concrete, (G.x0 + G.x1) / 2, d * 3.2 + 0.4, G.z1);
    }
  }
  B.box(gw, 1, 0.25, M.concrete, (G.x0 + G.x1) / 2, G.decks * 3.2 + 0.4, G.z0);
  for (let x = G.x0; x <= G.x1; x += 10) for (let z = G.z0; z <= G.z1; z += 10) B.box(0.6, G.decks * 3.2, 0.6, M.concrete, x, 0, z);
  B.box(gw, 0.4, gd, M.concrete, (G.x0 + G.x1) / 2, G.decks * 3.2, (G.z0 + G.z1) / 2);
  const gs = K.sign('P  Short stay · Long stay', 12, 2, { bg: '#1d4e89', font: 'bold 80px system-ui, sans-serif' });
  gs.position.set(0, 5, G.z0 - 0.4); gs.rotation.y = Math.PI; root.add(gs);
  // parked cars (instanced boxes, two per bay row)
  const parkGeo = new THREE.BoxGeometry(1.9, 1.4, 4.4);
  const parked = new THREE.InstancedMesh(parkGeo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4 }), 220);
  const carColors = [0xd9dde2, 0x1f2329, 0x7b8691, 0xa62b2b, 0x274b8a, 0xe5e1d6, 0x3c5a3c, 0x5a5f66];
  let pc = 0;
  for (let d = 0; d < G.decks + 1 && pc < 220; d++) {
    for (let x = G.x0 + 3; x < G.x1 - 2 && pc < 220; x += 2.6) {
      for (const z of [G.z0 + 5, G.z1 - 5, G.z0 + 16, G.z1 - 16]) {
        if (Math.random() < 0.3 || pc >= 220) continue;
        parked.setMatrixAt(pc, K.matrix(x, d * 3.2 + 1.1, z));
        parked.setColorAt(pc, new THREE.Color(carColors[pc % carColors.length]));
        pc++;
      }
    }
  }
  parked.count = pc; parked.castShadow = true;
  root.add(parked);
  K.hit(gw, G.decks * 3.2, gd, (G.x0 + G.x1) / 2, 0, (G.z0 + G.z1) / 2, root, 'garage');

  // ---------- rail station ----------
  const R = L.rail;
  B.box(R.x1 - R.x0, 0.25, R.z1 - R.z0, M.concrete, (R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);    // platform
  B.box(0.4, 0.02, R.z1 - R.z0, M.yellowMark, R.x0 + 0.5, 0.25, (R.z0 + R.z1) / 2);
  for (let z = R.z0 + 4; z < R.z1; z += 8) B.box(0.4, 5, 0.4, M.steel, R.x1 - 2, 0.25, z);
  B.box(R.x1 - R.x0 + 6, 0.3, R.z1 - R.z0, M.roof, (R.x0 + R.x1) / 2 - 3, 6.1, (R.z0 + R.z1) / 2);
  // track: sleepers + rails from the south portal to the buffer stop
  for (let z = -6; z < 118; z += 1.2) B.box(3, 0.15, 0.4, M.wood, R.trackX, 0, z);
  B.box(0.12, 0.2, 124, M.rail, R.trackX - 0.75, 0.15, 56);
  B.box(0.12, 0.2, 124, M.rail, R.trackX + 0.75, 0.15, 56);
  B.box(4, 1.4, 1, M.red, R.trackX, 0, -6);                            // buffer stop
  B.box(10, 9, 14, M.concrete, R.trackX, 0, 112);                        // portal
  // covered walkway to the west door
  B.box(L.term.x0 - R.x1, 0.3, 6, M.roof, (R.x1 + L.term.x0) / 2, 4.2, R.stopZ + 2);
  B.box(L.term.x0 - R.x1, 0.1, 6, M.sidewalk, (R.x1 + L.term.x0) / 2, 0.05, R.stopZ + 2);
  const rs = K.sign('SKY Airport Rail · City Centre 18 min', 14, 1.6, { bg: '#0f5c4d', font: 'bold 64px system-ui, sans-serif' });
  rs.position.set((R.x0 + R.x1) / 2, 4.4, R.z1 + 0.2); root.add(rs);
  K.hit(R.x1 - R.x0, 6, R.z1 - R.z0, (R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2, root, 'rail');

  // light poles along the roads
  for (let x = -150; x <= 150; x += 25) {
    B.cyl(0.15, 9, M.steel, x, 0, 76.5, 8);
    B.box(2.4, 0.3, 0.6, M.lightStrip, x, 9, 76.5);
  }
  B.build(root);

  // ---------- vehicles ----------
  function car(color, taxi) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
    K.box(4.4, 0.8, 1.9, body, 0, 0.35, 0, g);
    K.box(2.4, 0.65, 1.7, M.glassDark, -0.2, 1.15, 0, g);
    [[-1.4, 0.85], [1.4, 0.85], [-1.4, -0.85], [1.4, -0.85]].forEach(([x, z]) => {
      const w = K.cyl(0.36, 0.36, 0.3, M.rubber, x, 0, z, g);
      w.rotation.x = Math.PI / 2; w.position.y = 0.36;
    });
    if (taxi) K.box(0.6, 0.25, 0.9, M.white, -0.2, 1.8, 0, g);
    g.userData.len = 4.6;
    return g;
  }
  function bus(color, len) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    K.box(len, 2.6, 2.5, body, 0, 0.4, 0, g);
    K.box(len - 1.2, 0.9, 2.56, M.glassDark, -0.3, 1.7, 0, g);
    K.box(0.1, 1.6, 2.2, M.glassDark, -len / 2 - 0.02, 1.3, 0, g);
    [-len / 2 + 1.4, len / 2 - 1.6].forEach((x) => [1.15, -1.15].forEach((z) => {
      const w = K.cyl(0.5, 0.5, 0.35, M.rubber, x, 0, z, g);
      w.rotation.x = Math.PI / 2; w.position.y = 0.5;
    }));
    g.userData.len = len + 0.4;
    return g;
  }
  const colors = [0xd9dde2, 0x1f2329, 0x7b8691, 0xa62b2b, 0x274b8a, 0xe5e1d6, 0x8c6a3f];

  function spawnVehicle(kind, riders) {
    let g;
    if (kind === 'taxi') g = car(0xf1c232, true);
    else if (kind === 'bus') g = bus(SK.rng.pick([0x1d4e89, 0x2f8f5b, 0xe5e1d6]), SK.rng.chance(0.5) ? 11 : 8);
    else if (kind === 'through') g = car(SK.rng.pick(colors));
    else g = car(SK.rng.pick(colors));
    g.rotation.y = kind === 'through' ? 0 : Math.PI;    // westbound vehicles face -x
    const bay = kind === 'taxi' ? L.bays.taxi : kind === 'bus' ? L.bays.bus : L.bays.car;
    const v = {
      kind, g, riders: riders || [], lane: kind === 'through' ? 2 : 0,
      x: kind === 'through' ? L.road.x0 - 5 : L.road.x1 + 5, speed: 12, len: g.userData.len,
      stopX: kind === 'through' ? null : SK.rng.range(bay.x0 + 3, bay.x1 - 3), state: 'drive', dwell: 0,
    };
    v.z = v.lane === 2 ? L.road.returnZ - 1.6 : L.road.laneZ[0];
    g.position.set(v.x, 0, v.z);
    root.add(g);
    E.pick.add(g, kind === 'taxi' ? 'taxi' : kind === 'bus' ? 'shuttle' : 'car');
    S.vehicles.push(v);
    return v;
  }

  // queue a passenger figure to arrive by a mode; returns nothing, spawn happens on delivery
  S.request = function (mode, spec) { S.pending[mode].push(spec); };

  // train
  const train = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Group();
    K.box(2.9, 3.2, 19, new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.35, metalness: 0.4 }), 0, 0.5, 0, c);
    K.box(2.95, 1, 17, M.glassDark, 0, 2.2, 0, c);
    K.box(2.95, 0.4, 19, new THREE.MeshStandardMaterial({ color: 0x0f5c4d }), 0, 1.0, 0, c);
    c.position.z = i * 20;
    train.add(c);
  }
  train.position.set(L.rail.trackX, 0, 160);
  root.add(train);
  E.pick.add(train, 'train');
  const T = { state: 'away', timer: 20, z: 160 };
  S.train = T;

  let carTimer = 0, taxiTimer = 0, busTimer = 4, thruTimer = 0;
  S.update = function (dt) {
    if (dt <= 0) return;
    // dispatch: cars and taxis carry one figure each; buses wait to fill a little
    carTimer -= dt; taxiTimer -= dt; busTimer -= dt; thruTimer -= dt;
    if (carTimer <= 0 && S.pending.car.length) { spawnVehicle('car', [S.pending.car.shift()]); carTimer = 1.6; }
    if (taxiTimer <= 0 && S.pending.taxi.length) { spawnVehicle('taxi', [S.pending.taxi.shift()]); taxiTimer = 2.2; }
    if (busTimer <= 0 && S.pending.bus.length) { spawnVehicle('bus', S.pending.bus.splice(0, 6)); busTimer = 12; }
    if (thruTimer <= 0) { spawnVehicle('through'); thruTimer = SK.rng.range(3, 7); }
    while (S.pending.garage.length) {
      const spec = S.pending.garage.shift();
      SK.bus.emit('deliver', { spec, x: SK.rng.range(-8, 8), z: L.garage.z0 - 1, node: 'garage' });
    }

    // drive: westbound lanes follow a leader; stop at the chosen bay
    const lanes = [[], [], []];
    S.vehicles.forEach((v) => lanes[v.lane].push(v));
    lanes[0].sort((a, b) => a.x - b.x); lanes[1].sort((a, b) => a.x - b.x); lanes[2].sort((a, b) => b.x - a.x);
    for (let li = 0; li < 3; li++) {
      const arr = lanes[li];
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i], lead = arr[i - 1];
        let target = 13;
        if (lead) {
          const gap = Math.abs(v.x - lead.x) - (v.len + lead.len) / 2;
          if (gap < 3) target = 0; else if (gap < 12) target = Math.min(target, gap - 2);
        }
        if (v.state === 'drive' && v.stopX != null && li === 0) {
          const toStop = v.x - v.stopX;
          if (toStop < 0.3) { v.state = 'dwell'; v.dwell = v.kind === 'bus' ? 5 : 2.5; v.speed = 0; deliver(v); }
          else target = Math.min(target, Math.max(1.2, toStop * 1.2));
        }
        if (v.state === 'dwell') { target = 0; v.dwell -= dt; if (v.dwell <= 0) { v.state = 'leave'; v.lane = 1; } }
        v.speed += SK.clamp(target - v.speed, -10 * dt, 4 * dt);
        v.x += (li === 2 ? 1 : -1) * v.speed * dt;
        const zt = v.lane === 2 ? L.road.returnZ - 1.6 : L.road.laneZ[v.lane];
        v.z += SK.clamp(zt - v.z, -2 * dt, 2 * dt);
        v.g.position.set(v.x, 0, v.z);
        if ((li !== 2 && v.x < L.road.x0 - 6) || (li === 2 && v.x > L.road.x1 + 6)) v.dead = true;
      }
    }
    for (let i = S.vehicles.length - 1; i >= 0; i--) {
      const v = S.vehicles[i];
      if (!v.dead) continue;
      root.remove(v.g); E.pick.remove(v.g);
      v.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      S.vehicles.splice(i, 1);
    }

    // train: arrive, dwell, depart (every ~2.5 game minutes)
    T.timer -= dt;
    if (T.state === 'away' && T.timer <= 0) { T.state = 'arriving'; T.z = 160; }
    if (T.state === 'arriving') {
      const stopZ = L.rail.stopZ - 20;
      T.z -= Math.max(1.5, (T.z - stopZ) * 0.7) * dt;
      if (T.z - stopZ < 0.2) { T.z = stopZ; T.state = 'dwell'; T.timer = 8; deliverTrain(); }
    } else if (T.state === 'dwell' && T.timer <= 0) T.state = 'leaving';
    else if (T.state === 'leaving') { T.z += Math.min(18, 2 + (T.z - (L.rail.stopZ - 20)) * 0.6) * dt; if (T.z > 160) { T.state = 'away'; T.timer = 12; } }
    train.position.z = T.z;
    train.visible = T.z < 150;
  };
  function deliver(v) {
    v.riders.forEach((spec, i) => SK.bus.emit('deliver', { spec, x: v.x + (i - v.riders.length / 2) * 0.9, z: 62.5, node: null }));
    v.riders = [];
  }
  function deliverTrain() {
    const list = S.pending.rail.splice(0);
    list.forEach((spec, i) => SK.bus.emit('deliver', { spec, x: L.rail.x0 + 3 + (i % 3), z: L.rail.stopZ - 14 + ((i * 3.7) % 28), node: 'railPlat' }));
  }
  S.root = root;
  return S;
})();
