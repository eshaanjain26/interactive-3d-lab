// Tests for SkyOps pure modules: layout nav graph, queues, stations, schedule, search, content integrity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['core/namespace.js', 'data/layout.js', 'data/schedule.js', 'data/content.js', 'sim/queue.js', 'sim/search.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const SK = ctx.SK;

test('nav graph: landside reaches security, airside reaches every gate, and the two never connect', () => {
  for (let i = 0; i < SK.L.doors.length; i++) {
    assert.ok(SK.L.route('curb' + i, 'secDoor'), 'curb' + i + ' -> secDoor');
    assert.ok(SK.L.route('curb' + i, 'ftDoor'), 'curb' + i + ' -> ftDoor');
  }
  for (const g of SK.L.gates) {
    for (const from of ['ppExitW', 'ppExitE']) assert.ok(SK.L.route(from, 'pod' + g.id, SK.L.staffOnly), from + ' -> pod' + g.id);
  }
  assert.ok(SK.L.route('railPlat', 'secDoor'));
  assert.ok(SK.L.route('crewRoom', 'doorA1'));
  // the only way airside is through the screening stations, never the walking graph
  assert.equal(SK.L.route('curb2', 'conC'), null);
});

test('departing passengers must pass through duty free to reach the concourse from passport control', () => {
  const r = SK.L.route('airHub', 'conC', SK.L.staffOnly);
  assert.ok(r.includes('dfC'), 'walk-through store bypassed: ' + r.join(','));
});

test('every nav edge is symmetric', () => {
  for (const [id, n] of Object.entries(SK.L.nodes)) for (const e of n.e) assert.ok(SK.L.nodes[e].e.includes(id), id + '->' + e);
});

test('serpentine slots start at the head corner and stay inside the rectangle', () => {
  const rect = { x0: 0, x1: 10, z0: 0, z1: 6 };
  const s = SK.serpentine(rect, { headX: 'x0', headZ: 'z0' });
  assert.ok(s.slots.length > 20);
  assert.ok(s.slots[0].x < 1 && s.slots[0].z < 1.5);
  for (const p of s.slots) assert.ok(p.x >= 0 && p.x <= 10 && p.z >= 0 && p.z <= 6);
  // consecutive slots are never more than one row gap apart (no teleport across the snake)
  for (let i = 1; i < s.slots.length; i++) assert.ok(Math.hypot(s.slots[i].x - s.slots[i - 1].x, s.slots[i].z - s.slots[i - 1].z) < 1.5);
});

test('queue shifts everyone forward when the head leaves', () => {
  const q = new SK.Queue([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }]);
  const moved = [];
  q.onShift = (a, p) => moved.push([a.id, p.x]);
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }, d = { id: 'd' };
  [a, b, c, d].forEach((x) => q.join(x));
  assert.equal(d.queueIdx, 3);
  q.remove(a);
  assert.deepEqual(moved.slice(0, 2), [['b', 0], ['c', 1]]);
  assert.equal(d.queueIdx, 2);
  assert.equal(q.head(), b);
});

function runStation(stages, serviceFn, nAgents, simSeconds, open) {
  const q = new SK.Queue([{ x: 0, z: 0 }]);
  const done = [];
  const st = new SK.Station({
    name: 't', queue: q, service: serviceFn,
    servers: Array.from({ length: open }, (_, i) => ({ x: i, z: 0, stages: stages.map((z) => ({ x: i, z })) })),
    onMove: (a) => { a.arrived = true; },  // teleport for the test
    onDone: (a) => done.push(a),
  });
  for (let i = 0; i < nAgents; i++) { const a = { id: i, arrived: true, qJoin: 0 }; q.join(a); }
  for (let t = 0; t <= simSeconds; t++) st.update(t);
  return { done, st };
}

test('single-stage station serves FIFO at the expected rate', () => {
  const { done } = runStation([0], () => 60, 10, 600, 2);
  // two servers, 60 s each -> about 20 served in 600 s, capped by the 10 agents
  assert.equal(done.length, 10);
  assert.deepEqual(done.map((a) => a.id).slice(0, 4).sort(), [0, 1, 2, 3]);
});

test('pipelined lane throughput is set by its slowest stage', () => {
  const times = [80, 20, 40];   // divest is the bottleneck
  const { done } = runStation([0, 1, 2], (a, k) => times[k], 100, 3600, 1);
  // one lane, 80 s bottleneck -> about 45 per hour
  assert.ok(done.length >= 42 && done.length <= 46, 'served ' + done.length);
});

test('virtual stages let several agents be dispatched to a lane before the first arrives', () => {
  const q = new SK.Queue([{ x: 0, z: 0 }]);
  const st = new SK.Station({ name: 't', queue: q, service: (a, k) => (k < 2 ? 1 : 30),
    servers: [{ x: 0, z: 0, stages: [{ x: 0, z: 0, virtual: true }, { x: 0, z: 0, virtual: true }, { x: 0, z: 0 }] }], onMove: () => {} });
  const agents = [1, 2, 3, 4].map((id) => ({ id, arrived: true }));
  agents.forEach((a) => q.join(a));
  for (let t = 0; t < 10; t++) st.update(t);
  // nobody has physically arrived (onMove leaves arrived = false), yet three are already assigned to the lane
  assert.equal(st.servers[0].stages.filter((g) => g.agent).length, 3);
  assert.equal(q.length, 1);
});

test('closed servers finish their agent but accept no new ones', () => {
  const q = new SK.Queue([{ x: 0, z: 0 }]);
  const st = new SK.Station({ name: 't', queue: q, service: () => 10, servers: [{ x: 0, z: 0 }], onMove: (a) => (a.arrived = true) });
  const a = { arrived: true }, b = { arrived: true };
  q.join(a); q.join(b);
  st.update(0);
  st.setOpen(0);
  for (let t = 1; t < 100; t++) st.update(t);
  assert.equal(st.served, 1);
  assert.equal(q.length, 1);
  assert.equal(st.predictedWait(), Infinity);
});

test('schedule: deterministic, sorted, every flight has a valid gate and passengers', () => {
  SK.rng.seed(42);
  const a = SK.buildSchedule(SK.L.gates, 4 * 3600, 22 * 3600, SK.rng);
  SK.rng.seed(42);
  const b = SK.buildSchedule(SK.L.gates, 4 * 3600, 22 * 3600, SK.rng);
  assert.deepEqual(a.map((f) => f.num + f.std), b.map((f) => f.num + f.std));
  for (let i = 1; i < a.length; i++) assert.ok(a[i].std >= a[i - 1].std);
  for (const f of a) {
    assert.ok(SK.L.gates.some((g) => g.id === f.gate));
    assert.ok(f.figures >= 6 && f.pax > 100);
  }
  // no two departures on one gate closer than 85 minutes (a turn must fit)
  for (const g of SK.L.gates) {
    const fs2 = a.filter((f) => f.gate === g.id);
    for (let i = 1; i < fs2.length; i++) assert.ok(fs2[i].std - fs2[i - 1].std >= 85 * 60, g.id);
  }
});

test('flight status follows the departure timeline', () => {
  const f = { etd: 10000, delayMin: 0 };
  assert.equal(SK.flightStatus(f, 10000 - 230 * 60), 'Scheduled');
  assert.equal(SK.flightStatus(f, 10000 - 120 * 60), 'Check-in open');
  assert.equal(SK.flightStatus(f, 10000 - 50 * 60), 'Go to gate');
  assert.equal(SK.flightStatus({ ...f, boarding: true }, 10000 - 35 * 60), 'Boarding');
  assert.equal(SK.flightStatus({ ...f, boarding: true }, 10000 - 20 * 60), 'Final call');
  assert.equal(SK.flightStatus({ ...f, departed: true }, 10000), 'Departed');
});

test('search ranks exact and prefix title matches first', () => {
  const items = Object.values(SK.CONTENT).map((c) => ({ id: c.id, type: c.kind, title: c.name, keywords: c.keywords, text: c.summary }));
  assert.equal(SK.searchItems(items, 'baggage hall')[0].id, 'bhs');
  assert.equal(SK.searchItems(items, 'runway 27')[0].id, 'runway');
  assert.ok(SK.searchItems(items, 'k9').slice(0, 2).some((r) => r.id === 'k9'));
  assert.ok(SK.searchItems(items, 'egate').some((r) => r.id === 'egate'));
  assert.equal(SK.searchItems(items, '').length, 0);
});

test('content integrity: roles, zones and quiz references resolve', () => {
  const ids = new Set(Object.keys(SK.CONTENT));
  for (const c of Object.values(SK.CONTENT)) {
    for (const r of c.roles) assert.ok(ids.has(r), c.id + ' -> role ' + r);
    assert.ok(c.summary && c.summary.length > 20, c.id + ' summary');
    assert.ok(c.at && Number.isFinite(c.at.x) && Number.isFinite(c.at.z), c.id + ' at');
  }
  for (const z of SK.ZONES) assert.ok(ids.has(z.id), 'zone entry ' + z.id);
  for (const q of SK.QUIZ) {
    assert.ok(ids.has(q.ref), 'quiz ref ' + q.ref);
    assert.ok(q.a >= 0 && q.a < q.o.length);
  }
  assert.ok(SK.GLOSSARY.length >= 50);
});

test('copy rules: no em dashes or banned words in learn content', () => {
  const banned = /—|\b(leverage|seamless(ly)?|robust|streamline|cutting-edge|revolutioni[sz]e|game-changer|empower|delve|harness|unlock|innovative|transformative|supercharge)\b/i;
  const all = JSON.stringify([SK.CONTENT, SK.GLOSSARY, SK.QUIZ]);
  const m = all.match(banned);
  assert.equal(m, null, 'found: ' + (m && m[0]));
});

test('gate options respect aircraft size and turn spacing', () => {
  const gates = SK.L.gates;
  const H = 3600;
  const fl = [
    { id: 'a', gate: 'A1', wide: false, std: 10 * H },
    { id: 'b', gate: 'A2', wide: false, std: 10 * H + 600 },
    { id: 'c', gate: 'A3', wide: true, std: 12 * H },
    { id: 'd', gate: 'A4', wide: false, std: 13 * H },
  ];
  const optsA = SK.gateOptions(fl, fl[0], gates);
  const a2 = optsA.find((o) => o.gate === 'A2');
  assert.ok(a2 && a2.swap === fl[1], 'A2 is busy 10 min later, so it is offered as a swap');
  assert.ok(optsA.some((o) => o.gate === 'A5' && !o.swap), 'A5 is free');
  assert.ok(optsA.some((o) => o.gate === 'A4' && !o.swap), 'A4 next departs 180 min later, so it is a plain move');
  const optsC = SK.gateOptions(fl, fl[2], gates);
  assert.equal(optsC.length, 0, 'only A3 takes wide-bodies');
  assert.ok(SK.gateChangeable({}));
  assert.ok(!SK.gateChangeable({ plane: {} }));
  assert.ok(!SK.gateChangeable({ crewSent: true }));
});
