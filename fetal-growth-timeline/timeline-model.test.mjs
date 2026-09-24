// Run: node --test fetal-growth-timeline/timeline-model.test.mjs
// Tests the timeline data and anatomy math embedded in index.html (extracted, so the page stays a single file).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ================= Data');
const end = html.indexOf('/* ================= Scene');
const m = new Function(`${html.slice(start, end)}
  return { DAY_MIN, DAY_MAX, DUE_DAY, SYSTEMS, MONTHS, OBJECTS, WEEKS, KIND_LABEL, weekOf, dayIndex, gaLabel, monthOfWeek,
    monthFirstWeek, trimesterOfWeek, stageAt, lengthAt, weightAt, heartRateAt, reached, paramsAt, buildModel, fillField,
    sdPrim, crlCm3D, cellsDiameterCm, yolkSacCm };`)();

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

test('40 weekly rows, each with a known object, length kind and 2+ milestones on known systems', () => {
  assert.equal(m.WEEKS.length, 40);
  for (const w of m.WEEKS) {
    assert.ok(m.OBJECTS[w.obj], `week ${w.w} object ${w.obj}`);
    assert.ok(m.KIND_LABEL[w.kind], `week ${w.w} kind`);
    assert.ok(w.len > 0);
    assert.ok(w.notes.length >= 2, `week ${w.w} has ${w.notes.length} milestones`);
    for (const n of w.notes) assert.ok(m.SYSTEMS[n.sys], `week ${w.w} system ${n.sys}`);
  }
});

test('day-specific milestones fall inside their own week', () => {
  for (const w of m.WEEKS) for (const n of w.notes) {
    if (n.day == null) continue;
    assert.equal(m.weekOf(n.day), w.w, `"${n.text.slice(0, 40)}" day ${n.day} is not in week ${w.w}`);
  }
});

test('chart anchors: week 8 raspberry 1.6 cm, week 20 banana 25.6 cm crown-heel, week 40 pumpkin 51.2 cm / 3462 g', () => {
  assert.deepEqual([m.WEEKS[7].obj, m.WEEKS[7].len], ['raspberry', 1.6]);
  assert.deepEqual([m.WEEKS[19].obj, m.WEEKS[19].len, m.WEEKS[19].kind], ['banana', 25.6, 'ch']);
  assert.deepEqual([m.WEEKS[39].obj, m.WEEKS[39].len, m.WEEKS[39].g], ['pumpkin', 51.2, 3462]);
});

test('interpolated length and weight hit the table exactly at N weeks 0 days', () => {
  for (const w of m.WEEKS) {
    const d = w.w * 7;
    assert.ok(Math.abs(m.lengthAt(d).cm - w.len) < 1e-9, `length week ${w.w}`);
    assert.equal(m.lengthAt(d).kind, w.kind);
    if (w.g == null) assert.equal(m.weightAt(d), null);
    else assert.ok(Math.abs(m.weightAt(d) - w.g) < 1e-9, `weight week ${w.w}`);
  }
});

test('length never decreases within a measurement series, weight never decreases', () => {
  let prev = null, prevW = 0;
  for (const d of range(m.DAY_MIN, m.DAY_MAX)) {
    const L = m.lengthAt(d), g = m.weightAt(d) ?? 0;
    if (prev && prev.kind === L.kind) assert.ok(L.cm >= prev.cm - 1e-12, `length drops on day ${d}`);
    assert.ok(g >= prevW - 1e-9, `weight drops on day ${d}`);
    prev = L; prevW = g;
  }
});

test('calendar helpers: labels, months, trimesters, stages', () => {
  assert.equal(m.gaLabel(143), '20w 3d');
  assert.equal(m.weekOf(286), 40);
  assert.equal(m.dayIndex(286), 6);
  const covered = m.MONTHS.flatMap(([a, b]) => range(a, b));
  assert.deepEqual(covered, range(1, 40));
  for (let mo = 1; mo <= 9; mo++) assert.equal(m.monthOfWeek(m.monthFirstWeek(mo)), mo);
  assert.deepEqual([13, 14, 27, 28].map(m.trimesterOfWeek), [1, 2, 2, 3]);
  assert.deepEqual([13, 14, 21, 34, 35, 69, 70].map(d => m.stageAt(d).key), ['pre', 'cleave', 'implant', 'implant', 'embryo', 'embryo', 'fetus']);
});

test('heart rate starts at 5w 1d and peaks near 9 to 10 weeks', () => {
  assert.equal(m.heartRateAt(35), null);
  assert.ok(m.heartRateAt(36) > 0);
  const peak = range(36, 280).reduce((a, d) => (m.heartRateAt(d) > m.heartRateAt(a) ? d : a), 36);
  assert.ok(peak >= 63 && peak <= 70, `peak at day ${peak}`);
});

test('milestones reached: day-specific items wait for their day', () => {
  const hb = m.WEEKS[4].notes.find(n => n.day === 36);
  assert.equal(m.reached(hb, 35), false);
  assert.equal(m.reached(hb, 36), true);
  assert.equal(m.reached(hb, 90), true);
  assert.equal(m.reached(m.WEEKS[10].notes[0], 70), false);
});

test('anatomy model is normalized to crown-rump length 1 and fits the marching-cubes cube', () => {
  for (const d of [33, 40, 50, 63, 70, 100, 140, 200, 280, 286]) {
    const mod = m.buildModel(d);
    const crl = Math.hypot(...mod.crown.map((c, i) => c - mod.rump[i]));
    assert.ok(Math.abs(crl - 1) < 0.03, `day ${d}: crown-rump ${crl.toFixed(3)}`);
    const { c, k } = mod.fit;
    for (let i = 0; i < 3; i++) {
      assert.ok((mod.bbox[i] - c[i]) * k > -0.95 && (mod.bbox[i + 3] - c[i]) * k < 0.95, `day ${d} axis ${i} exceeds the cube`);
    }
  }
});

test('signed-distance field has an inside and an outside, and the head center is inside', () => {
  const res = 40, dist = new Float32Array(res ** 3);
  for (const d of [42, 84, 196]) {
    const mod = m.buildModel(d);
    m.fillField(mod, res, dist);
    let inside = 0;
    for (const v of dist) if (v < 0) inside++;
    assert.ok(inside > 50 && inside < dist.length * 0.5, `day ${d}: ${inside} inside voxels`);
    const head = mod.anchors.nervous[0];
    const minD = Math.min(...mod.prims.map(p => m.sdPrim(p, head[0], head[1], head[2])));
    assert.ok(minD < 0, `day ${d}: head center distance ${minD}`);
  }
});

test('3D scale stays continuous where the chart switches from crown-rump to crown-heel', () => {
  const a = m.crlCm3D(139, m.buildModel(139)), b = m.crlCm3D(140, m.buildModel(140));
  assert.ok(Math.abs(b / a - 1) < 0.1, `week 19→20 jump ${(b / a).toFixed(3)} (${a.toFixed(2)} → ${b.toFixed(2)} cm)`);
  let prev = m.crlCm3D(35, m.buildModel(35));
  for (const d of range(36, 280)) {
    const cur = m.crlCm3D(d, m.buildModel(d));
    assert.ok(cur / prev < 1.25 && cur / prev > 0.9, `day ${d}: ${prev.toFixed(3)} → ${cur.toFixed(3)} cm`);
    prev = cur;
  }
});

test('pre-embryo sizes are sub-millimetre to a few millimetres; yolk sac only in weeks 5 to 12', () => {
  assert.ok(m.cellsDiameterCm(10) < 0.02);
  assert.ok(m.cellsDiameterCm(34) < 0.5);
  assert.equal(m.yolkSacCm(30), 0);
  assert.ok(m.yolkSacCm(56) > 0.3);
  assert.equal(m.yolkSacCm(100), 0);
});
