// SkyOps agents: movement, passenger journeys, staff behaviour, and the stations they use.
// Each agent runs a generator script that yields wait conditions (arrive / until / station).
SK.sim = SK.sim || { now: 0 };
SK.agents = (function () {
  const L = SK.L, N = L.nodes, D = SK.terminal.defs;
  const AG = { list: [], byId: {}, st: {}, stats: { spawned: 0, boarded: 0, missed: 0, secondary: 0, patdown: 0, k9: 0 } };
  const WALK = 2.3;     // m/s in game time; a brisk walk so a compressed day stays watchable
  let nextId = 1;
  const now = () => SK.sim.now;
  const ARRIVE = { type: 'arrive' };
  const until = (fn) => ({ type: 'until', fn });
  const waitSim = (sec) => { const t = now() + sec; return until(() => now() >= t); };
  const log = (a, text) => { if (a.log) { a.log.push({ t: now(), text }); if (a.log.length > 30) a.log.shift(); } };

  // ---------- agent lifecycle ----------
  function make(o) {
    const a = Object.assign({ id: nextId++, x: 0, y: 0, z: 0, heading: 0, path: [], arrived: true, anim: 'idle', phase: Math.random() * 6, speed: WALK, hidden: false, node: null, kind: 'staff' }, o);
    a.speed *= SK.rng.range(0.88, 1.12);
    SK.crowd.dress(a);
    AG.list.push(a); AG.byId[a.id] = a;
    return a;
  }
  function kill(a) { a.dead = true; }
  AG.kill = kill;

  function setPath(a, pts) {
    a.path = pts.slice();
    a.arrived = a.path.length === 0;
  }
  function jit(a, k) { const s = Math.sin(a.id * 12.9898 + k * 78.233) * 43758.5453; return (s - Math.floor(s) - 0.5) * 1.3; }
  function sideOf(z) { return z >= 29 ? 'land' : 'air'; }
  function* go(a, target, final) {
    const from = a.node || L.nearestNode(a.x, a.z, (id) => sideOf(N[id].z) === sideOf(a.z));
    const r = from === target ? [target] : L.route(from, target, a.kind === 'pax' ? L.staffOnly : null);
    const pts = (r || [target]).map((id, k) => ({ x: N[id].x + jit(a, k), z: N[id].z + jit(a, k + 7) }));
    if (final) pts.push(final);
    setPath(a, pts);
    yield ARRIVE;
    a.node = target;
  }
  function* walkTo(a, p) { setPath(a, [p]); yield ARRIVE; }

  // ---------- stations ----------
  // Each server gets a virtual "next please" spot 1.4 m back toward the queue: the next passenger is
  // dispatched and walks up while the current one is served, so servers don't idle during the walk.
  function station(name, def, o) {
    const q = new SK.Queue(def.queue.slots, o.overflow);
    q.onShift = (a, p) => setPath(a, [p]);
    const head = def.queue.slots[0];
    const pre = o.preStage !== false;
    const servers = def.servers.map((s) => {
      const stages = s.stages || [{ x: s.x, z: s.z }];
      if (!pre) return Object.assign({}, s, { stages });
      const dx = head.x - s.x, dz = head.z - s.z, d = Math.hypot(dx, dz) || 1;
      return Object.assign({}, s, { stages: [{ x: s.x + (dx / d) * 1.4, z: s.z + (dz / d) * 1.4, virtual: true }].concat(stages) });
    });
    const mul = () => (SK.ops && SK.ops.svcMul && SK.ops.svcMul[name]) || 1;
    const st = new SK.Station(Object.assign({
      name, queue: q, servers,
      onMove: (a, p) => { setPath(a, [{ x: p.x, z: p.z }]); },
      onDone: (a, s) => { a.stationDone = st; a.lastServer = s; },
    }, o, {
      // crisis effects (outages, hand searches) slow a station through SK.ops.svcMul
      service: (a, k, s) => (pre ? (k === 0 ? 1 : o.service(a, k - 1, s) * mul()) : o.service(a, k, s) * mul()),
      onStage: o.onStage ? (a, k, s) => { if (!pre) o.onStage(a, k, s); else if (k > 0) o.onStage(a, k - 1, s); } : null,
    }));
    AG.st[name] = st;
    return st;
  }
  const sv = (mean, sd) => Math.max(10, SK.rng.normal(mean, sd));   // sim seconds
  const P = SK.PAX_PER_FIGURE;
  station('priority', D.checkin.priority, { service: () => sv(P * 70, 40), meanCycle: P * 70 });
  station('economy', D.checkin.economy, { service: () => sv(P * 105, 60), meanCycle: P * 105 });
  station('bagdrop', D.checkin.bagdrop, { service: () => sv(P * 45, 20), meanCycle: P * 45 });
  station('special', D.checkin.special, { service: () => sv(P * 150, 50), meanCycle: P * 150 });
  station('kiosk', D.kiosks, { service: () => sv(P * 55, 20), meanCycle: P * 55 });
  station('doc', D.doc, { service: () => sv(P * 12, 4), meanCycle: P * 12 });
  station('ftDoc', D.ftDoc, { service: () => sv(P * 10, 3), meanCycle: P * 10 });
  // security lanes: divest is the bottleneck (about 20 s per person), then scan and recompose
  const laneServers = D.lanes.slice(1).map((l, i) => ({ x: l.x, z: l.entry.z, label: 'Lane ' + (i + 1), stages: l.stages }));
  const laneTimes = [1, 1, 1, P * 20, P * 6, P * 14];   // loading x3, divest, scan, recompose
  const onLaneStage = (a, k, s) => {
    a.laneIdx = s.laneIndex != null ? s.laneIndex : s.id + 1;
    if (k === 3) { a.anim = 'work'; SK.terminal.tray(a.laneIdx, laneTimes[3] / SK.TIME_SCALE + 3); }
    if (k === 4) { a.anim = 'scan'; }
    if (k === 5) { a.anim = 'work'; }
  };
  station('lanes', { servers: laneServers, queue: D.secQueue }, { preStage: false, service: (a, k) => (k < 3 ? 1 : sv(laneTimes[k], laneTimes[k] * 0.3)), onStage: onLaneStage, meanCycle: laneTimes[3] });
  station('ftLane', { servers: [{ x: D.lanes[0].x, z: D.lanes[0].entry.z, label: 'Fast track', stages: D.lanes[0].stages }], queue: D.ftQueue }, { preStage: false, service: (a, k) => (k < 3 ? 1 : sv(laneTimes[k] * 0.85, 10)), onStage: (a, k, s) => { s.laneIndex = 0; onLaneStage(a, k, s); }, meanCycle: laneTimes[3] * 0.85 });
  AG.st.lanes.servers.forEach((s, i) => (s.laneIndex = i + 1));
  station('manual', D.manual, { service: () => sv(P * 45, 15), meanCycle: P * 45 });
  station('egate', D.egate, {
    service: () => sv(P * 16, 5), meanCycle: P * 16,
    onStage: (a, k, s) => { SK.terminal.egate(s.id, 0); a.egateIdx = s.id; },
  });
  station('cafe', D.cafe, { service: () => sv(150, 50), meanCycle: 150 });
  station('lounge', D.loungeDesk, { service: () => sv(40, 10), meanCycle: 40 });
  station('till0', { servers: [D.tills[0]], queue: { slots: [{ x: D.tills[0].x - 2, z: D.tills[0].z + 0.4 }, { x: D.tills[0].x - 3, z: D.tills[0].z + 0.6 }, { x: D.tills[0].x - 4, z: D.tills[0].z + 0.6 }] } }, { service: () => sv(70, 20), overflow: { dx: -0.8, dz: 0 } });
  station('till1', { servers: [D.tills[1]], queue: { slots: [{ x: D.tills[1].x + 2, z: D.tills[1].z + 0.4 }, { x: D.tills[1].x + 3, z: D.tills[1].z + 0.6 }, { x: D.tills[1].x + 4, z: D.tills[1].z + 0.6 }] } }, { service: () => sv(70, 20), overflow: { dx: 0.8, dz: 0 } });
  // boarding: two scanners per gate; a passenger is accepted only while their flight is boarding at this gate
  L.gates.forEach((g) => {
    const gd = D.gates[g.id];
    station('board' + g.id, { servers: [{ x: gd.podium.x - 0.7, z: gd.podium.z }, { x: gd.podium.x + 0.7, z: gd.podium.z }], queue: { slots: gd.boardQueue } }, {
      service: () => sv(P * 6, 2), meanCycle: P * 6 / 2,
      accept: (a) => a.flight.boarding && a.flight.gate === g.id && !a.flight.gateClosed,
      overflow: { dx: -0.75, dz: 0 },
    });
  });

  function* use(a, st, approach, label) {
    if (approach) yield* go(a, approach);
    a.qJoin = now();
    a.stationDone = null;
    const slot = st.queue.join(a);
    setPath(a, [slot]);
    log(a, 'Joined ' + label + ' queue (' + st.queue.length + ' ahead)');
    yield { type: 'station', st };
    a.anim = 'idle';
    const waited = Math.round((now() - a.qJoin) / 60);
    log(a, label + ' done' + (waited > 0 ? ', ' + waited + ' min in queue' : ''));
    return a.lastServer;
  }

  // ---------- passenger script ----------
  function* paxScript(a) {
    const f = a.flight;
    const premium = a.cls === 'F' || a.cls === 'J';
    // landside: reach the check-in channel
    if (a.channel === 'special' || a.prm) {
      const s = yield* use(a, AG.st.special, 'q_special', 'Special assistance');
      if (a.prm) spawnAssistant(a);
      checkBags(a, s);
    } else if (a.channel === 'priority') {
      const s = yield* use(a, AG.st.priority, 'q_priority', 'Priority check-in');
      checkBags(a, s);
    } else if (a.channel === 'desk') {
      const s = yield* use(a, AG.st.economy, 'q_economy', 'Economy check-in');
      checkBags(a, s);
    } else if (a.channel === 'kiosk') {
      yield* use(a, AG.st.kiosk, 'q_kiosk', 'Kiosk');
      log(a, 'Printed boarding pass' + (a.bags ? ' and bag tag' : ''));
      a.node = 'q_kiosk';
      if (a.bags) { const s = yield* use(a, AG.st.bagdrop, 'q_bagdrop', 'Bag drop'); checkBags(a, s); }
    } else if (a.bags) {
      const s = yield* use(a, AG.st.bagdrop, 'q_bagdrop', 'Bag drop');
      checkBags(a, s);
    } else log(a, 'Checked in online, no hold bag');
    a.carry = a.cabinBag;

    // security
    const fast = premium || a.prm;
    yield* use(a, fast ? AG.st.ftDoc : AG.st.doc, fast ? 'ftDoor' : 'secDoor', 'Document check');
    yield* use(a, fast ? AG.st.ftLane : AG.st.lanes, null, fast ? 'Fast track screening' : 'Security screening');
    const lane = D.lanes[a.laneIdx || 0];
    a.anim = 'idle';
    if (a.k9Flag || SK.rng.chance(SK.ops ? SK.ops.secondaryRate() : 0.07)) {
      AG.stats.secondary++;
      const t = SK.rng.pick(D.search.tables);
      yield* walkTo(a, { x: t.x, z: t.z });
      a.anim = 'idle'; a.heading = Math.PI;
      log(a, a.k9Flag ? 'Bag searched after K9 alert' : 'Bag flagged at X-ray: hand search and trace swab');
      yield waitSim(SK.rng.range(180, 420));
    } else if (SK.rng.chance(0.03)) {
      AG.stats.patdown++;
      yield* walkTo(a, { x: D.search.patdown.x + SK.rng.range(-0.8, 0.8), z: D.search.patdown.z });
      log(a, 'Body scanner alarm: targeted pat-down');
      yield waitSim(SK.rng.range(90, 160));
    }
    yield* walkTo(a, { x: lane.exit.x + jit(a, 3) * 0.5, z: lane.exit.z });
    a.node = a.x < -20 ? 'postSecW' : a.x < 15 ? 'postSecC' : 'postSecE';
    log(a, 'Cleared security');

    // passport control
    yield* use(a, a.egate ? AG.st.egate : AG.st.manual, a.egate ? 'ppEgate' : 'ppManual', a.egate ? 'e-gate' : 'Passport booth');
    if (a.egate) { SK.terminal.egate(a.egateIdx, 1); }
    yield* walkTo(a, { x: a.x + jit(a, 4) * 0.4, z: L.passport.exitZ });
    a.node = a.x < 0 ? 'ppExitW' : 'ppExitE';

    // airside: walk-through duty free (with optional shopping), then an activity, then the gate
    const boardAt = () => f.etd - SK.minutes(SK.AIRCRAFT_TYPES[f.wide ? 'wide' : 'narrow'].boardBefore);
    yield* go(a, 'dfIn');
    const shopper = !premium && SK.rng.chance(0.45) && boardAt() - now() > SK.minutes(30);
    const dfNodes = ['dfA', 'dfB', 'dfC', 'dfD', 'dfE', 'dfOut'];
    for (const n of dfNodes) {
      yield* go(a, n);
      if (shopper && SK.rng.chance(0.4)) {
        const s = D.shopStops.reduce((b, p) => (SK.dist(p.x, p.z, a.x, a.z) < SK.dist(b.x, b.z, a.x, a.z) ? p : b));
        yield* walkTo(a, { x: s.x + jit(a, 9) * 0.6, z: s.z });
        a.anim = 'work';
        yield waitSim(SK.rng.range(60, 200));
        a.anim = 'idle';
        a.node = null;
        yield* go(a, n);
      }
      if (n === 'dfC' && shopper && SK.rng.chance(0.6)) {
        const till = SK.rng.chance(0.5) ? AG.st.till0 : AG.st.till1;
        yield* use(a, till, null, 'Duty free till');
        const spend = Math.round(SK.rng.range(35, 260)) * P;
        SK.bus.emit('sale', { kind: 'retail', amount: spend });
        log(a, 'Bought duty free, $' + spend + ' for ' + P + ' travellers');
        a.node = null;
        yield* go(a, 'dfC');
      }
    }
    log(a, 'Through duty free');

    // activity
    const room = SK.rng.next();
    if (premium && boardAt() - now() > SK.minutes(20)) {
      yield* use(a, AG.st.lounge, 'loungeIn', 'Lounge desk');
      const seat = takeSeat(D.loungeSeats.filter((s) => s.first === (a.cls === 'F') || !s.first));
      if (seat) { yield* walkTo(a, seat); sit(a, seat); log(a, 'Relaxing in the ' + (a.cls === 'F' ? 'first class room' : 'business lounge')); yield until(() => now() >= boardAt() - SK.minutes(8)); freeSeat(a); a.anim = 'idle'; }
      a.node = 'loungeIn';
    } else if (!premium && room < 0.4 && boardAt() - now() > SK.minutes(35)) {
      yield* use(a, AG.st.cafe, 'foodIn', 'Food court');
      const spend = Math.round(SK.rng.range(9, 28)) * P;
      SK.bus.emit('sale', { kind: 'food', amount: spend });
      const seat = takeSeat(D.foodSeats);
      if (seat) {
        yield* walkTo(a, seat); sit(a, seat);
        log(a, 'Eating in the food court ($' + spend + ')');
        const tEnd = Math.min(now() + SK.rng.range(900, 1800), boardAt() - SK.minutes(5));
        yield until(() => now() >= tEnd);
        freeSeat(a); a.anim = 'idle';
      }
      a.node = 'foodIn';
    } else if (room > 0.95 && boardAt() - now() > SK.minutes(30)) {
      const which = SK.rng.pick(['prayer', 'nursing', 'smoking']);
      yield* go(a, which + 'In');
      yield* walkTo(a, { x: D.rooms[which].x + jit(a, 5), z: D.rooms[which].z + jit(a, 6) });
      log(a, 'Visited the ' + which + ' room');
      yield waitSim(SK.rng.range(400, 900));
      yield* go(a, which + 'In');
    }

    // gate
    if (f.gateClosed || f.offBlock) return yield* missed(a);
    yield* go(a, 'gate' + f.gate);
    log(a, 'At gate ' + f.gate);
    const gd = D.gates[f.gate];
    if (!(f.boarding && a.group <= f.groupCalled)) {
      const seat = takeSeat(gd.seats);
      if (seat) { yield* walkTo(a, seat); sit(a, seat); }
      yield until(() => (f.boarding && a.group <= f.groupCalled) || f.gateClosed);
      freeSeat(a); a.anim = 'idle';
      if (f.gateClosed) return yield* missed(a);
      a.node = 'gate' + f.gate;
    }
    yield* use(a, AG.st['board' + f.gate], null, 'Boarding (group ' + (a.group === 0 ? 'pre-board' : a.group) + ')');
    log(a, 'Boarding pass scanned');
    f.walkingAboard = (f.walkingAboard || 0) + 1;
    if (f.bus) {
      yield* go(a, 'door' + f.gate);
      yield* walkTo(a, { x: L.gateDoor(L.gates.find((g) => g.id === f.gate)).x - 3, z: -44.5 });
      a.hidden = true; a.onBus = true;
      SK.ops.busBoard(a);
      yield until(() => !a.onBus);
      a.hidden = false;
      const st = SK.ops.stairs();
      yield* walkTo(a, { x: st.base.x + jit(a, 8) * 0.3, z: st.base.z });
      setPath(a, [{ x: st.top.x, z: st.top.z, y: st.top.y }]);
      yield ARRIVE;
    } else {
      yield* go(a, 'door' + f.gate);
      const bp = SK.airfield.bridgePath(f.gate);
      setPath(a, bp);
      yield ARRIVE;
    }
    f.boarded++;
    f.walkingAboard--;
    AG.stats.boarded++;
    log(a, 'On board ' + f.num);
    if (a.helper) kill(a.helper);
    kill(a);
  }
  function* missed(a) {
    AG.stats.missed++;
    a.flight.missed = (a.flight.missed || 0) + 1;
    SK.bus.emit('ops', { t: now(), kind: 'warn', msg: SK.PAX_PER_FIGURE + ' passengers missed ' + a.flight.num + ' (gate closed); rebooking at the transfer desk' });
    log(a, 'Missed the flight; sent to rebooking');
    yield* go(a, 'gate' + a.flight.gate);
    yield waitSim(300);
    if (a.helper) kill(a.helper);
    kill(a);
  }
  function checkBags(a, server) {
    if (!a.bags) return;
    const x = server ? server.x + 1.2 : a.x;
    for (let i = 0; i < a.bags; i++) SK.bags.induct(a, x + i * 0.5, a.flight);
    log(a, a.bags + ' bag' + (a.bags > 1 ? 's' : '') + ' tagged ' + a.tags.join(', '));
  }
  function takeSeat(list) {
    const free = list.filter((s) => !s.taken);
    if (!free.length) return null;
    const s = free[Math.floor(SK.rng.next() * free.length)];
    return s;
  }
  function sit(a, s) { s.taken = a; a.seat = s; a.anim = 'sit'; a.heading = s.ry; }
  function freeSeat(a) { if (a.seat) { a.seat.taken = null; a.seat = null; } }

  // ---------- spawn ----------
  AG.spawnPax = function (spec, x, z, node) {
    const a = make(Object.assign({ kind: 'pax', role: 'r_pax', x, z, node, log: [] }, spec));
    a.carry = a.bags > 0 || a.cabinBag;
    a.tags = [];
    if (a.prm) { a.wheelchair = true; a.speed = 1.3; }
    a.script = paxScript(a);
    AG.stats.spawned++;
    log(a, 'Arrived by ' + spec.mode + ' for ' + spec.flight.num + ' to ' + spec.flight.city + ' (' + (a.cls === 'F' ? 'First' : a.cls === 'J' ? 'Business' : 'Economy') + ')');
    return a;
  };
  SK.bus.on('deliver', (d) => AG.spawnPax(d.spec, d.x, d.z, d.node));

  function spawnAssistant(pax) {
    const h = make({ role: 'r_wheelchair', x: pax.x - 0.8, z: pax.z + 0.8, kind: 'staff' });
    h.follow = pax;
    pax.helper = h;
    h.script = (function* () { yield until(() => false); })();
  }

  // ---------- staff ----------
  AG.post = function (role, x, z, ry, visible, anim) {
    const a = make({ role, x, z, heading: ry, anim: anim || 'idle', kind: 'staff' });
    a.visibleFn = visible || null;
    a.workAnim = anim || 'idle';
    a.script = (function* () { yield until(() => false); })();
    return a;
  };
  D.staffPosts.forEach((p) => {
    let vis = null, anim = 'work';
    const r = p.ref || {};
    const stMap = { priority: 'priority', economy: 'economy', special: 'special' };
    if (stMap[r.st]) { const st = AG.st[stMap[r.st]]; vis = () => st.servers[r.i] && st.servers[r.i].open; }
    if (r.st === 'lane') {
      const st = r.i === 0 ? AG.st.ftLane : AG.st.lanes;
      const s = r.i === 0 ? st.servers[0] : st.servers[r.i - 1];
      vis = () => s.open || !st.idle(s);
      anim = r.pos === 'xray' ? 'work' : 'idle';
    }
    if (r.st === 'manual') { const s = AG.st.manual.servers[r.i]; vis = () => s.open || !AG.st.manual.idle(s); }
    if (r.st === 'doc') anim = 'work';
    if (r.st === 'gate' || r.st === 'lounge' || r.st === 'egateSup' || r.st === 'laneOfficer' || r.st === 'search') anim = 'idle';
    let role = p.role;
    if (r.st === 'cafe' && r.i === 1) role = 'r_chef';
    const a = AG.post(role, p.x, p.z, p.ry, vis, anim);
    if (role === 'r_chef') a.role = 'r_barista', a.look.torso = 0xf4f4f2, a.look.toque = 0xffffff, a.look.band = null;
  });

  // roaming staff: cleaners, police, K9 team
  function* roam(a, nodes, pause) {
    for (;;) {
      yield* go(a, SK.rng.pick(nodes));
      a.anim = a.role === 'r_cleaner' ? 'work' : 'idle';
      yield waitSim(SK.rng.range(pause[0], pause[1]));
      a.anim = 'idle';
    }
  }
  [['hall0', 'hall1', 'hall2', 'hall3', 'hall4', 'q_economy', 'q_kiosk'], ['conW', 'conC', 'conE', 'gateA1', 'gateA2', 'gateA3', 'gateA4', 'airHub', 'foodIn']].forEach((nodes, i) => {
    for (let k = 0; k < 2; k++) {
      const n = N[nodes[k]];
      const a = make({ role: 'r_cleaner', x: n.x, z: n.z, node: nodes[k] });
      a.speed = 1.1;
      a.script = roam(a, nodes, [60, 240]);
    }
  });
  [['curb0', 'curb2', 'curb4', 'hall1', 'hall3'], ['airHub', 'conC', 'gateA2', 'gateA3', 'conE', 'conW']].forEach((nodes) => {
    const n = N[nodes[0]];
    const p1 = make({ role: 'r_police', x: n.x, z: n.z, node: nodes[0] });
    p1.speed = 1.2;
    p1.script = roam(p1, nodes, [120, 300]);
    const p2 = make({ role: 'r_police', x: n.x + 1, z: n.z, node: nodes[0] });
    p2.follow = p1; p2.script = (function* () { yield until(() => false); })();
  });
  // K9 team works the doc-check and security queues
  const k9 = make({ role: 'r_k9handler', x: 40, z: 33, node: 'secDoor' });
  k9.speed = 1.0;
  const dog = SK.crowd.makeDog();
  AG.dog = { g: dog, x: 40, z: 33, heading: 0, sit: 0 };
  k9.script = (function* () {
    const beats = [{ x: 32, z: 32.5 }, { x: 74, z: 32.5 }, { x: 74, z: 22.5 }, { x: 34, z: 22.5 }];
    for (let k = 0; ; k++) {
      const b = beats[k % beats.length];
      yield* walkTo(k9, { x: b.x, z: b.z + (k9.z > 28 ? 0 : 0) });
      k9.anim = 'idle';
      // occasional alert on a nearby passenger: dog sits, passenger is sent to secondary screening
      const near = AG.list.filter((p) => p.kind === 'pax' && !p.hidden && SK.dist(p.x, p.z, k9.x, k9.z) < 6 && !p.k9Flag);
      if (near.length && SK.rng.chance(0.08)) {
        const p = near[0];
        p.k9Flag = true; AG.stats.k9++;
        AG.dog.sit = 4;
        log(p, 'K9 dog alerted near this passenger');
        SK.bus.emit('ops', { t: now(), kind: 'warn', msg: 'K9 alert in the security queue: passenger referred for additional screening' });
      }
      yield waitSim(SK.rng.range(20, 60));
    }
  })();
  AG.k9 = k9;

  // crew: walk from the crew room to the aircraft before boarding
  AG.spawnCrew = function (f) {
    const t = SK.AIRCRAFT_TYPES[f.wide ? 'wide' : 'narrow'].crew;
    const roles = Array(t.pilots).fill('r_pilot').concat(Array(t.cabin).fill('r_cabin'));
    roles.forEach((role, i) => {
      const a = make({ role, x: 106 + (i % 3) * 0.7, z: -33 + Math.floor(i / 3) * 0.7, node: 'crewRoom', kind: 'crew', flight: f, log: [] });
      a.carry = true; a.look.case = 0x1a1f2b;
      a.script = (function* () {
        yield waitSim(i * 8);
        yield* go(a, 'gate' + f.gate);
        yield until(() => f.plane && f.plane.state === 'parked' && (f.bus || SK.airfield.bridgeReady(f.gate)));
        yield* go(a, 'pod' + f.gate);
        if (f.bus) {
          yield* go(a, 'door' + f.gate);
          a.hidden = true;
          yield waitSim(60);
          kill(a);
          return;
        }
        yield* go(a, 'door' + f.gate);
        setPath(a, SK.airfield.bridgePath(f.gate));
        yield ARRIVE;
        f.crewOnBoard = (f.crewOnBoard || 0) + 1;
        kill(a);
      })();
    });
    SK.bus.emit('ops', { t: now(), kind: 'info', msg: f.num + ' crew briefed, walking to ' + f.gate });
  };

  // ---------- per-frame ----------
  function step(a, dtGame) {
    // run the script until it blocks
    for (let guard = 0; guard < 20; guard++) {
      const w = a.waitFor;
      if (w) {
        if (w.type === 'arrive' && !a.arrived) break;
        if (w.type === 'until' && !w.fn()) break;
        if (w.type === 'station' && a.stationDone !== w.st) break;
      }
      const r = a.script.next();
      if (r.done) { a.dead = true; return; }
      a.waitFor = r.value || null;
    }
    // followers (assistant pushing a wheelchair, patrol partner)
    if (a.follow) {
      const t = a.follow;
      if (t.dead) { kill(a); return; }
      const bx = t.x - Math.sin(t.heading) * 0.95, bz = t.z - Math.cos(t.heading) * 0.95;
      const ox = a.role === 'r_police' ? Math.cos(t.heading) * 1.1 : 0, oz = a.role === 'r_police' ? -Math.sin(t.heading) * 1.1 : 0;
      const tx = a.role === 'r_police' ? t.x + ox : bx, tz = a.role === 'r_police' ? t.z + oz : bz;
      const d = SK.dist(a.x, a.z, tx, tz);
      a.x += (tx - a.x) * Math.min(1, dtGame * 6); a.z += (tz - a.z) * Math.min(1, dtGame * 6);
      a.y = t.y; a.heading = t.heading; a.hidden = t.hidden;
      a.anim = t.anim === 'walk' || d > 0.2 ? (a.role === 'r_wheelchair' ? 'push' : 'walk') : 'idle';
      a.phase += dtGame * 7;
      return;
    }
    // movement
    if (a.path.length) {
      const p = a.path[0];
      const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
      const stepLen = a.speed * dtGame;
      if (p.y != null) a.y += (p.y - a.y) * Math.min(1, d > 0 ? stepLen / d : 1);
      if (d <= stepLen || d < 0.02) {
        a.x = p.x; a.z = p.z; a.path.shift();
        if (!a.path.length) a.arrived = true;
      } else {
        a.x += (dx / d) * stepLen; a.z += (dz / d) * stepLen;
        const h = Math.atan2(dx, dz);
        let dh = h - a.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        a.heading += dh * Math.min(1, dtGame * 10);
      }
      if (a.anim !== 'sit') a.anim = 'walk';
      a.phase += dtGame * a.speed * 4.2;
    } else {
      if (a.anim === 'walk') a.anim = a.kind === 'staff' ? a.workAnim || 'idle' : 'idle';
      a.phase += dtGame * 3;
    }
  }

  AG.update = function (dtGame) {
    if (dtGame > 0) {
      // sub-step so fast-forward stays stable
      const n = Math.max(1, Math.ceil(dtGame / 0.12));
      const h = dtGame / n;
      for (let s = 0; s < n; s++) {
        for (const st of Object.values(AG.st)) st.update(now() + (s - n + 1) * h * SK.TIME_SCALE);
        for (const a of AG.list) if (!a.dead) step(a, h);
      }
    }
    // dog follows the handler on a short lead
    const dg = AG.dog;
    const tx = k9.x + Math.cos(k9.heading) * 0.7 + Math.sin(k9.heading) * 0.5, tz = k9.z - Math.sin(k9.heading) * 0.7 + Math.cos(k9.heading) * 0.5;
    const moving = SK.dist(dg.x, dg.z, tx, tz) > 0.05;
    dg.x += (tx - dg.x) * Math.min(1, dtGame * 5); dg.z += (tz - dg.z) * Math.min(1, dtGame * 5);
    dg.heading = k9.heading;
    if (dg.sit > 0) dg.sit -= dtGame;
    SK.crowd.poseDog(dg.g, dg.x, dg.z, dg.heading, moving && k9.anim === 'walk', k9.phase, dg.sit > 0);
    dg.g.visible = !SK.layers || SK.layers.staff !== false;

    // staff visibility follows open servers
    for (let i = AG.list.length - 1; i >= 0; i--) {
      const a = AG.list[i];
      if (a.dead) { freeSeat(a); if (a.highlight && SK.cam.mode === 'follow') SK.cam.stopFollow(); AG.list.splice(i, 1); delete AG.byId[a.id]; continue; }
      if (a.visibleFn) a.hidden = !a.visibleFn();
    }
  };
  // shared helpers for other sim modules (arrivals, crisis responders)
  Object.assign(AG, { make, setPath, go, walkTo, use, station, waitSim, until, ARRIVE, log, jit, takeSeat, sit, freeSeat, WALK });
  AG.rendered = function () {
    const lay = SK.layers || {};
    return AG.list.filter((a) => !a.hidden && (a.kind === 'pax' ? lay.pax !== false : lay.staff !== false) && (!SK.filterFn || SK.filterFn(a)));
  };
  AG.count = (fn) => AG.list.reduce((n, a) => n + (fn(a) ? 1 : 0), 0);
  return AG;
})();
