// SkyOps operations: sim clock, flights and passenger demand, boarding, pushback, bus gate,
// staffing levers, KPIs and the event log.
SK.ops = (function () {
  const L = SK.L, AG = SK.agents, D = SK.terminal.defs, E = SK.engine, K = SK.kit, M = K.mat;
  const O = {
    flights: [], pending: [], events: [], hist: [], money: { retail: 0, food: 0, staff: 0 },
    mode: 'sandbox', autoStaff: true, holds: { pushback: false, security: false, checkin: false },
    rates: { secondary: 0.07, bagAlarm: 0.05 }, kpi: {},
  };
  const now = () => SK.sim.now;
  const P = SK.PAX_PER_FIGURE;
  O.secondaryRate = () => O.rates.secondary;
  O.bagAlarmRate = () => O.rates.bagAlarm;

  // staffing: cost per open server per hour (staff + equipment), USD
  O.levers = [
    { id: 'economy', name: 'Economy desks', st: 'economy', cost: 48, min: 2 },
    { id: 'priority', name: 'Priority desks', st: 'priority', cost: 48, min: 1 },
    { id: 'bagdrop', name: 'Auto bag drops', st: 'bagdrop', cost: 12, min: 1 },
    { id: 'kiosk', name: 'Kiosks', st: 'kiosk', cost: 4, min: 2 },
    { id: 'lanes', name: 'Security lanes', st: 'lanes', cost: 190, min: 1 },
    { id: 'manual', name: 'Passport booths', st: 'manual', cost: 70, min: 1 },
    { id: 'egate', name: 'e-gates', st: 'egate', cost: 9, min: 0 },
  ];
  O.setOpen = function (id, n) {
    const lv = O.levers.find((l) => l.id === id), st = AG.st[lv.st];
    const v = SK.clamp(n, lv.min, st.servers.length);
    st.setOpen(v);
    return v;
  };
  // sensible starting staffing
  O.setOpen('economy', 7); O.setOpen('priority', 3); O.setOpen('lanes', 4); O.setOpen('manual', 4);

  // ---------- schedule + demand ----------
  const DAY0 = SK.minutes(7 * 60);
  O.build = function () {
    SK.rng.seed(20261012);
    O.flights = SK.buildSchedule(L.gates, DAY0, DAY0 + SK.minutes(60 * 66), SK.rng);
    O.flights.forEach((f) => {
      f.inboundAt = f.std + SK.minutes(SK.TURN.inboundBlock) - SK.minutes(16);
      f.boardBefore = SK.AIRCRAFT_TYPES[f.wide ? 'wide' : 'narrow'].boardBefore;
      for (let i = 0; i < f.figures; i++) O.pending.push({ t: f.std - SK.minutes(paxLead()), f });
    });
    O.pending.sort((a, b) => a.t - b.t);
  };
  function paxLead() {
    const r = (SK.rng.next() + SK.rng.next() + SK.rng.next()) / 3;
    return -SK.TURN.spawnTo + r * (SK.TURN.spawnTo - SK.TURN.spawnFrom);
  }
  function makeSpec(f) {
    const r = SK.rng;
    const u = r.next();
    const cls = f.wide ? (u < 0.03 ? 'F' : u < 0.15 ? 'J' : 'Y') : u < 0.09 ? 'J' : 'Y';
    const prm = r.chance(0.018);
    const premium = cls !== 'Y';
    let channel, bags;
    if (prm) { channel = 'special'; bags = 1; }
    else if (premium) { channel = r.chance(0.7) ? 'priority' : 'online'; bags = channel === 'priority' ? 1 : 0; }
    else {
      const c = r.next();
      if (c < 0.33) { channel = 'online'; bags = 0; }
      else if (c < 0.58) { channel = 'online'; bags = 1; }
      else if (c < 0.84) { channel = 'kiosk'; bags = r.chance(0.8) ? 1 : 0; }
      else { channel = 'desk'; bags = 1; }
    }
    if (O.holds.checkin && (channel === 'kiosk')) channel = 'desk';
    const m = r.next();
    const mode = m < 0.3 ? 'car' : m < 0.5 ? 'taxi' : m < 0.63 ? 'bus' : m < 0.88 ? 'rail' : 'garage';
    return { flight: f, cls, prm, channel, bags, cabinBag: r.chance(0.65), egate: !prm && r.chance(0.55), child: !prm && r.chance(0.05), group: prm ? 0 : premium ? 1 : r.int(2, 4), mode };
  }

  // ---------- bus gate ----------
  const busG = new THREE.Group();
  K.box(12, 2.8, 2.6, new THREE.MeshStandardMaterial({ color: 0x2b6cc4, roughness: 0.4 }), 0, 0.35, 0, busG);
  K.box(11, 0.9, 2.66, M.glassDark, 0, 1.8, 0, busG);
  E.scene.add(busG);
  E.pick.add(busG, 'busgate');
  const busHome = { x: L.gateDoor(L.gates.find((g) => g.bus)).x - 3, z: -46.5 };
  const bus = { riders: [], state: 'home', x: busHome.x, z: busHome.z, heading: -Math.PI / 2, idle: 0, s: 0 };
  O.busBoard = (a) => { bus.riders.push(a); bus.idle = 0; };
  const stairsG = new THREE.Group();
  for (let i = 0; i < 10; i++) K.box(1.4, 0.12, 0.55, M.steel, 0, i * 0.34, i * 0.5, stairsG);
  K.box(1.6, 1.4, 5.5, M.yellow, 0, -0.1, 2.4, stairsG).scale.set(1, 0.5, 1);
  stairsG.visible = false;
  E.scene.add(stairsG);
  O.stairs = function () {
    const p = remotePlane();
    if (!p) return { base: { x: L.remote.x, z: L.remote.z + 8 }, top: { x: L.remote.x, z: L.remote.z + 3, y: 3.4 } };
    const d = SK.aircraft.doorPos(p), c = Math.cos(p.heading), s = Math.sin(p.heading);
    return { top: { x: d.x, z: d.z, y: d.h }, base: { x: d.x + c * 5.6, z: d.z - s * 5.6 }, heading: Math.atan2(-c, s) };
  };
  function remotePlane() { return SK.aircraft.planes.find((p) => p.g.bus && p.state === 'parked'); }
  function busPath(to) {
    const pts = to ? [[busHome.x, busHome.z], [busHome.x - 25, -48], [-140, -56], [-150, -64], [O.stairs().base.x + 6, O.stairs().base.z + 3]] : [[O.stairs().base.x + 6, O.stairs().base.z + 3], [-150, -64], [-140, -56], [busHome.x - 25, -48], [busHome.x, busHome.z]];
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
    return { c, len: c.getLength() };
  }
  function updateBus(dt) {
    const qLen = AG.st.boardA5 ? AG.st.boardA5.queue.length : 0;
    if (bus.state === 'home') {
      bus.idle += dt;
      if (bus.riders.length >= 14 || (bus.riders.length && (bus.idle > 14 || qLen === 0 && bus.idle > 5)) ) {
        if (remotePlane()) { bus.state = 'out'; bus.path = busPath(true); bus.s = 0; }
      }
    } else if (bus.state === 'out' || bus.state === 'back') {
      bus.s = Math.min(bus.path.len, bus.s + 9 * dt);
      const u = bus.s / bus.path.len, pt = bus.path.c.getPointAt(u), tg = bus.path.c.getTangentAt(u);
      bus.x = pt.x; bus.z = pt.z; bus.heading = Math.atan2(tg.x, tg.z) - Math.PI / 2;
      if (bus.s >= bus.path.len) {
        if (bus.state === 'out') {
          bus.state = 'unload'; bus.t = 0;
          bus.riders.forEach((a, i) => { a.x = bus.x + (i % 3) * 0.6 - 0.6; a.z = bus.z - 1.6; a.onBus = false; a.node = null; });
          bus.riders = [];
        } else { bus.state = 'home'; bus.idle = 0; bus.heading = -Math.PI / 2; }
      }
    } else if (bus.state === 'unload') {
      bus.t += dt;
      if (bus.t > 6) { bus.state = 'back'; bus.path = busPath(false); bus.s = 0; }
    }
    busG.position.set(bus.x, 0, bus.z);
    busG.rotation.y = bus.heading;
    const st = O.stairs(), rp = remotePlane();
    stairsG.visible = !!rp;
    if (rp) { stairsG.position.set(st.base.x, 0, st.base.z); stairsG.rotation.y = st.heading + Math.PI; }
  }

  // ---------- ramp props: tugs, marshallers ----------
  const tugs = {};
  L.gates.forEach((g) => {
    if (g.bus) return;
    const t = new THREE.Group();
    K.box(2.4, 1.1, 5, new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6 }), 0, 0.3, 0, t);
    K.box(1.6, 0.9, 1.2, M.glassDark, 0, 1.4, -1.4, t);
    K.box(0.25, 0.25, 4, M.darkSteel, 0, 0.5, 4.2, t);
    E.scene.add(t);
    E.pick.add(t, 'tug');
    const home = { x: g.x - 14, z: -44.5, heading: Math.PI };
    tugs[g.id] = { g: t, home };
    const marsh = AG.post('r_marshaller', g.x, -44, Math.PI, () => SK.aircraft.planes.some((p) => p.g === g && (p.state === 'parking' || (p.state === 'taxiIn' && p.s > p.path.len - 40))), 'wave');
    marsh.kind = 'staff';
    AG.post('r_ramp', g.x - 6, -52, Math.PI / 2, () => SK.aircraft.planes.some((p) => p.g === g && (p.state === 'parked' || p.state === 'pushback')), 'idle');
  });
  function updateTugs() {
    Object.keys(tugs).forEach((gid) => {
      const t = tugs[gid];
      const p = SK.aircraft.planes.find((q) => q.g.id === gid && (q.state === 'pushback' || q.state === 'startup' || (q.state === 'parked' && q.f.pushApproved)));
      if (p) {
        const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
        t.g.position.set(p.x + fx * 5.2, 0, p.z + fz * 5.2);
        t.g.rotation.y = p.heading + Math.PI;
      } else {
        t.g.position.set(t.home.x, 0, t.home.z);
        t.g.rotation.y = t.home.heading;
      }
    });
  }

  // ---------- turn logic per flight ----------
  function turn(f) {
    const t = now();
    const p = f.plane;
    if (!p && t >= f.inboundAt - 60) {
      // weather adds airborne holding / flow-control delay to the inbound aircraft
      const w = SK.sky.ops();
      if (w.delayMin) f.inboundAt += SK.minutes(w.delayMin * SK.rng.range(0.4, 1.2));
      // some inbound aircraft run late from their previous sector (reactionary delay)
      if (SK.rng.chance(0.16)) {
        const late = SK.rng.range(12, 50);
        f.inboundAt += SK.minutes(late);
        SK.bus.emit('ops', { t, kind: 'warn', msg: f.num + ' inbound aircraft running ' + Math.round(late) + ' min late from its previous flight' });
      }
      SK.aircraft.spawnInbound(f);
    }
    if (p && f.blockIn && !f.etdSet) {
      f.etdSet = true;
      const minTurn = SK.minutes(f.wide ? 62 : 44);
      f.etd = Math.max(f.std, f.blockIn + minTurn);
      f.delayMin = Math.round((f.etd - f.std) / 60);
      if (f.etd - f.std >= SK.minutes(15)) SK.bus.emit('ops', { t, kind: 'warn', msg: f.num + ' delayed to ' + SK.fmtTime(f.etd) + ': late inbound aircraft (reactionary delay)' });
    }
    if (!f.crewSent && t >= f.std - SK.minutes(78)) { f.crewSent = true; AG.spawnCrew(f); }
    if (!p || p.state !== 'parked') return;
    const cabinReady = f.blockIn + SK.minutes(18);
    const boardAt = Math.max(f.etd - SK.minutes(f.boardBefore), cabinReady);
    const ready = f.bus || SK.airfield.bridgeReady(f.gate);
    if (!f.boarding && !f.doorsClosed && t >= boardAt && ready && !f.arrivalsPending) {
      f.boarding = true; f.groupCalled = 0; f.boardStart = t; f.lastCall = t;
      SK.bus.emit('ops', { t, kind: 'go', msg: f.num + ' to ' + f.city + ' now boarding at ' + f.gate + ': pre-boarding' });
    }
    if (f.boarding && f.groupCalled < 4 && t - f.lastCall >= SK.minutes(f.groupCalled === 0 ? 2 : 4)) {
      f.groupCalled++; f.lastCall = t;
      SK.bus.emit('ops', { t, kind: 'info', msg: f.num + ' boarding group ' + f.groupCalled + (f.groupCalled === 1 ? ' (first and business)' : '') });
    }
    // final cut-off: STD-15, or early once every passenger who is airside or due has boarded
    const outstanding = AG.list.some((a) => a.kind === 'pax' && a.flight === f) || O.pending.some((q) => q.f === f);
    if (f.boarding && !f.finalCut && (t >= f.etd + SK.minutes(SK.TURN.gateClose) || (!outstanding && f.groupCalled >= 4))) {
      f.finalCut = true;
      SK.bus.emit('ops', { t, kind: 'warn', msg: f.num + ' final call closed at ' + f.gate });
    }
    const st = AG.st['board' + f.gate];
    const aboardWalking = (f.walkingAboard || 0) > 0 || AG.list.some((a) => a.kind === 'crew' && a.flight === f);
    if (f.finalCut && !f.doorsClosed && st.queue.length === 0 && st.servers.every((s) => st.idle(s)) && !aboardWalking) {
      f.gateClosed = true; f.doorsClosed = t; f.boarding = false;
      if (!f.bus) SK.airfield.retract(f.gate);
      SK.bus.emit('ops', { t, kind: 'info', msg: f.num + ' doors closed: ' + f.boarded * P + ' passengers on board' + (f.missed ? ', ' + f.missed * P + ' missed' : '') });
    }
    const w = SK.sky.ops();
    const rampOk = w.ramp && !O.holds.pushback;
    if (f.doorsClosed && !f.pushApproved && f.bagsDone !== false && t >= Math.max(f.etd, f.doorsClosed + SK.minutes(3)) && (f.bus || SK.airfield.bridgeClear(f.gate))) {
      const cartWaiting = SK.bags.carts.some((c) => c.f === f && c.state !== 'back');
      if (!rampOk) { if (!f.rampLogged) { f.rampLogged = true; SK.bus.emit('ops', { t, kind: 'warn', msg: f.num + ' pushback held: ' + (O.holds.pushback ? 'crisis hold' : 'lightning within 5 nm, ramp closed') }); } }
      else if (!cartWaiting || f.bagsDone) {
        f.pushApproved = true;
        SK.bus.emit('ops', { t, kind: 'go', msg: f.num + (f.bus ? ' starting engines at R1' : ' pushback approved from ' + f.gate) });
      }
    }
  }

  // ---------- KPIs ----------
  function mins(sec) { return sec === Infinity ? 99 : Math.round(sec / 60); }
  function computeKpi() {
    const t = now();
    const st = AG.st;
    const k = O.kpi;
    k.waitCheckin = mins(st.economy.predictedWait());
    k.waitBagdrop = mins(st.bagdrop.predictedWait());
    k.waitKiosk = mins(st.kiosk.predictedWait());
    k.waitSecurity = mins(Math.max(st.lanes.predictedWait(), st.lanes.observedWait(t, 1200)) + st.doc.predictedWait());
    k.waitPassport = mins(Math.max(st.manual.predictedWait(), st.manual.observedWait(t, 1200)));
    k.waitEgate = mins(st.egate.predictedWait());
    const served = st.lanes.waits.filter((w) => w.t > t - 3600).length + st.ftLane.waits.filter((w) => w.t > t - 3600).length;
    k.secThroughput = served * P;
    const dep = O.flights.filter((f) => f.offBlock);
    k.departed = dep.length;
    k.otp = dep.length ? Math.round((100 * dep.filter((f) => f.delayMin < 15).length) / dep.length) : 100;
    k.avgDelay = dep.length ? Math.round(dep.reduce((s, f) => s + f.delayMin, 0) / dep.length) : 0;
    k.bags = SK.bags.stats.inducted * P;
    k.bagsLoaded = SK.bags.stats.loaded * P;
    k.mishandled = SK.bags.stats.short * P;
    k.mishandledRate = AG.stats.boarded ? +((SK.bags.stats.short / AG.stats.boarded) * 1000).toFixed(1) : 0;
    k.retail = O.money.retail; k.food = O.money.food;
    k.paxIn = AG.count((a) => a.kind === 'pax' && !a.dead) * P;
    k.boarded = AG.stats.boarded * P;
    k.missed = AG.stats.missed * P;
    // staffing cost per hour from open servers
    k.staffCost = O.levers.reduce((s, lv) => s + st[lv.st].openCount() * lv.cost, 0);
    // satisfaction: start at 90, lose points for waits beyond IATA ADRM optimum ranges, delays and missed flights
    let sat = 90;
    sat -= Math.max(0, k.waitCheckin - 20) * 0.8;
    sat -= Math.max(0, k.waitSecurity - 10) * 1.4;
    sat -= Math.max(0, k.waitPassport - 10) * 1.0;
    sat -= Math.max(0, k.avgDelay - 10) * 0.6;
    const missRate = AG.stats.boarded + AG.stats.missed ? (100 * AG.stats.missed) / (AG.stats.boarded + AG.stats.missed) : 0;
    k.missRate = +missRate.toFixed(1);
    sat -= Math.min(15, missRate * 3);
    sat -= Math.min(10, k.mishandledRate * 0.5);
    if (SK.arrivals) {
      SK.arrivals.kpi(k);
      sat -= Math.max(0, k.waitArrImm - 10) * 0.8;
      if (k.firstBag != null) sat -= Math.max(0, k.firstBag - 20) * 0.5;
    }
    if (SK.support) SK.support.kpi(k);
    k.satisfaction = Math.round(SK.clamp(sat, 0, 100));
    if (!O.lastHist || t - O.lastHist >= 600) {
      O.lastHist = t;
      O.hist.push({ t, sec: k.waitSecurity, chk: k.waitCheckin, pp: k.waitPassport, pax: k.paxIn, sat: k.satisfaction, otp: k.otp });
      if (O.hist.length > 288) O.hist.shift();
    }
  }

  // auto staffing (sandbox): open servers to keep predicted waits inside ADRM ranges
  function autoStaff() {
    const st = AG.st;
    const want = (station, target, min) => {
      const perServer = (target * 60) / station.meanCycle;   // agents one server clears within the target wait
      return Math.max(min, Math.ceil(station.queue.length / Math.max(1, perServer)));
    };
    O.setOpen('lanes', want(st.lanes, 8, 2));
    O.setOpen('economy', want(st.economy, 15, 3));
    O.setOpen('priority', want(st.priority, 5, 1));
    O.setOpen('manual', want(st.manual, 8, 2));
    O.setOpen('bagdrop', 6); O.setOpen('kiosk', 12); O.setOpen('egate', 8);
  }

  SK.bus.on('ops', (e) => { O.events.push(e); if (O.events.length > 150) O.events.shift(); });
  SK.bus.on('sale', (s) => { O.money[s.kind] += s.amount; });

  // ---------- main update ----------
  let kpiTimer = 0, fidsTimer = 0, staffTimer = 0;
  O.update = function (dtGame) {
    if (dtGame <= 0) return;
    SK.sim.now += dtGame * SK.TIME_SCALE;
    const t = now();
    O.money.staff += (O.kpi.staffCost || 0) * (dtGame * SK.TIME_SCALE) / 3600;
    while (O.pending.length && O.pending[0].t <= t) {
      const q = O.pending.shift();
      const spec = makeSpec(q.f);
      q.f.spawned++;
      SK.landside.request(spec.mode, spec);
    }
    for (const f of O.flights) {
      if (f.departed && t - f.airborneAt > 1800) continue;
      if (f.std - t > SK.minutes(200)) break;
      turn(f);
    }
    SK.landside.update(dtGame);
    SK.aircraft.update(dtGame, t);
    SK.agents.update(dtGame);
    SK.bags.update(dtGame);
    if (SK.arrivals) SK.arrivals.update(dtGame);
    if (SK.support) SK.support.update(dtGame);
    SK.airfield.update(dtGame);
    updateBus(dtGame);
    updateTugs();
    staffTimer -= dtGame;
    if (O.autoStaff && staffTimer <= 0) { autoStaff(); staffTimer = 4; }
    kpiTimer -= dtGame;
    if (kpiTimer <= 0) { computeKpi(); kpiTimer = 0.5; }
  };
  O.visual = function (dtGame, dtReal) {
    SK.airfield.visual(dtReal);
    if (SK.arrivals) SK.arrivals.visual(dtReal);
    if (SK.support) SK.support.visual(dtReal);
    SK.terminal.update(dtGame);
    fidsTimer -= dtReal;
    if (fidsTimer <= 0) {
      fidsTimer = 1;
      const t = now();
      const board = O.flights.filter((f) => f.std > t - SK.minutes(40) && f.std < t + SK.minutes(360));
      board.forEach((f) => (f.statusText = SK.flightStatus(f, t)));
      SK.terminal.updateFids(board, t);
      L.gates.forEach((g) => {
        const f = board.find((x) => x.gate === g.id && !x.departed && !x.offBlock);
        const key = f ? f.num + f.statusText : '-';
        if (O['gs' + g.id] === key) return;
        O['gs' + g.id] = key;
        SK.terminal.setGateScreen(g.id, f ? [g.id + '  ' + f.num, f.city + ' · ' + f.statusText] : [g.id, 'No departures'], f && f.boarding ? '#0f5132' : '#0c1522');
      });
    }
  };
  O.flightsAhead = function (n) {
    const t = now();
    return O.flights.filter((f) => !f.departed && f.std > t - SK.minutes(90)).slice(0, n || 12);
  };
  return O;
})();
