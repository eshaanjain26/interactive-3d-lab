// SkyOps education layer: animated explainers, learn modal (dashboard, quiz, glossary), onboarding tour, search.
SK.edu = (function () {
  const U = SK.ui, $ = U.$, esc = U.esc, E = SK.engine;
  const ED = {};
  const P = SK.PAX_PER_FIGURE;

  // ---------- explainer: camera path + captions + 3D motion graphics ----------
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 40), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 5;
  E.scene.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 8), ring.material);
  beam.visible = false; E.scene.add(beam);
  let arrow = null;
  const arrowTexC = document.createElement('canvas'); arrowTexC.width = 128; arrowTexC.height = 32;
  (function () { const x = arrowTexC.getContext('2d'); x.fillStyle = '#ffd34d'; for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(i * 64 + 8, 4); x.lineTo(i * 64 + 40, 16); x.lineTo(i * 64 + 8, 28); x.lineTo(i * 64 + 20, 16); x.closePath(); x.fill(); } })();
  const arrowTex = new THREE.CanvasTexture(arrowTexC); arrowTex.wrapS = THREE.RepeatWrapping;
  function drawArrow(a, b) {
    if (arrow) { E.scene.remove(arrow); arrow.geometry.dispose(); arrow = null; }
    if (!a || SK.dist(a.x, a.z, b.x, b.z) < 2) return;
    const mid = new THREE.Vector3((a.x + b.x) / 2, 2 + SK.dist(a.x, a.z, b.x, b.z) * 0.15, (a.z + b.z) / 2);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a.x, (a.y || 0) + 1, a.z), mid, new THREE.Vector3(b.x, (b.y || 0) + 1, b.z));
    arrowTex.repeat.set(curve.getLength() / 3, 1);
    arrow = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.3, 6, false), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, depthWrite: false, toneMapped: false }));
    arrow.renderOrder = 6;
    E.scene.add(arrow);
  }
  let ex = null;
  ED.exploring = () => !!ex;
  ED.explain = function (e) {
    const steps = e.explainer || (e.sop.length ? e.sop.map((t, i) => ({ x: e.at.x, z: e.at.z, y: e.at.y, d: (e.kind === 'zone' ? 40 : 16) + (i % 2) * 4, az: 0.5 + i * 0.35, text: t })) : [{ x: e.at.x, z: e.at.z, d: 24, text: e.summary }]);
    ex = { e, steps, i: 0, t: 0, paused: false };
    $('exTitle').textContent = 'Explainer · ' + e.name;
    $('explainer').classList.add('on');
    $('exSteps').innerHTML = steps.map(() => '<i></i>').join('');
    show(0);
  };
  function show(i) {
    const s = ex.steps[i], prev = i > 0 ? ex.steps[i - 1] : null;
    ex.i = i; ex.t = 0;
    $('exText').textContent = (i + 1) + '. ' + s.text;
    $('exSteps').querySelectorAll('i').forEach((el, k) => el.classList.toggle('on', k <= i));
    $('exNext').textContent = i === ex.steps.length - 1 ? 'Done' : 'Next';
    SK.cam.flyTo({ x: s.x, y: s.y || 0, z: s.z }, { dist: s.d || 22, polar: 0.92, az: s.az, dur: 1.6 });
    ring.position.set(s.x, (s.y || 0) + 0.2, s.z); ring.visible = true;
    beam.position.set(s.x, (s.y || 0) + 3, s.z); beam.visible = true;
    drawArrow(prev, s);
  }
  ED.stopExplain = function () {
    ex = null; ring.visible = false; beam.visible = false; drawArrow(null);
    $('explainer').classList.remove('on');
  };
  $('exNext').addEventListener('click', () => { if (!ex) return; if (ex.i < ex.steps.length - 1) show(ex.i + 1); else ED.stopExplain(); });
  $('exPrev').addEventListener('click', () => { if (ex && ex.i > 0) show(ex.i - 1); });
  $('exPause').addEventListener('click', () => { if (!ex) return; ex.paused = !ex.paused; $('exPause').textContent = ex.paused ? 'Play' : 'Pause'; });
  $('exClose').addEventListener('click', ED.stopExplain);

  // ---------- learn modal: dashboard, quiz, glossary ----------
  let learnTab = 'dash', quiz = null, glossQ = '';
  ED.openLearn = function (tab, ref) {
    learnTab = tab || 'dash';
    if (learnTab === 'quiz') newQuiz(ref);
    U.modal('Learn', [['dash', 'Dashboard'], ['quiz', 'Quiz'], ['glossary', 'Glossary'], ['roles', 'Who does what']], renderLearn, afterLearn, 2, (t) => { learnTab = t; if (t === 'quiz' && !quiz) newQuiz(); U.repaintModal(); });
    U.setModalTab(learnTab);
    U.modalLive = () => learnTab === 'dash';
  };
  function newQuiz(ref) {
    const pool = SK.QUIZ.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    if (ref) { const k = pool.findIndex((q) => q.ref === ref); if (k > 0) pool.unshift(pool.splice(k, 1)[0]); }
    quiz = { qs: pool.slice(0, 8), i: 0, score: 0, picked: null };
  }
  function spark(vals, color, max) {
    if (vals.length < 2) return '<div style="color:var(--muted);font-size:11px">Collecting data…</div>';
    const m = max || Math.max(1, ...vals);
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 300},${48 - (v / m) * 44}`).join(' ');
    return `<svg class="spark" viewBox="0 0 300 50" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
  }
  function renderLearn() {
    const k = SK.ops.kpi, h = SK.ops.hist.slice(-72);
    if (learnTab === 'dash') {
      const card = (t, v, sub, chart) => `<div class="card2"><div class="eyebrow">${t}</div><div style="font-size:22px;font-weight:800">${v}</div><div style="color:var(--muted);font-size:12px">${sub}</div>${chart || ''}</div>`;
      return `<div class="grid2">
        ${card('Security wait', k.waitSecurity + ' min', 'ADRM optimum 5 to 10 min · TSA goal under 30', spark(h.map((x) => x.sec), 'var(--bad)'))}
        ${card('Check-in wait', k.waitCheckin + ' min', 'ADRM optimum 10 to 20 min (economy desk)', spark(h.map((x) => x.chk), 'var(--accent)'))}
        ${card('Passport wait', k.waitPassport + ' min', 'ADRM optimum 5 to 10 min · e-gates ' + k.waitEgate + ' min', spark(h.map((x) => x.pp), 'var(--warn)'))}
        ${card('Passengers in terminal', (k.paxIn || 0).toLocaleString(), 'Each figure = ' + P + ' travellers', spark(h.map((x) => x.pax), 'var(--ok)'))}
        ${card('On-time departures', k.otp + '%', k.departed + ' departed · avg delay ' + k.avgDelay + ' min', spark(h.map((x) => x.otp), 'var(--ok)', 100))}
        ${card('Satisfaction', k.satisfaction + ' / 100', 'Falls when waits exceed ADRM ranges, flights run late or bags miss', spark(h.map((x) => x.sat), 'var(--accent)', 100))}
        ${card('Security throughput', (k.secThroughput || 0) + ' pax/hr', 'Screened in the last sim hour')}
        ${card('Bags', (k.bags || 0).toLocaleString() + ' accepted', (k.bagsLoaded || 0) + ' loaded · ' + (k.mishandled || 0) + ' mishandled (' + k.mishandledRate + ' per 1,000; 2023 industry 6.9)')}
        ${card('Commercial', '$' + Math.round(k.retail + k.food).toLocaleString(), 'Duty free $' + Math.round(k.retail).toLocaleString() + ' · food $' + Math.round(k.food).toLocaleString())}
        ${card('Staffing', '$' + (k.staffCost || 0).toLocaleString() + '/hr', 'Labour so far $' + Math.round(SK.ops.money.staff).toLocaleString())}
        ${card('Boarded', (k.boarded || 0).toLocaleString(), (k.missed || 0) + ' missed their flight')}
        ${card('Cargo', (k.cargoT || 0) + ' t handled', (k.ulds || 0) + ' ULDs · ' + (k.freighters || 0) + ' freighters dispatched')}
        ${card('Fuel', (k.fuelM3 || 0) + ' m³ delivered', (k.fuelings || 0) + ' hydrant fuellings')}
        ${card('Arrivals', (k.arrived || 0).toLocaleString() + ' arrived', 'First bag ' + (k.firstBag == null ? '–' : k.firstBag + ' min') + ' · last bag ' + (k.lastBag == null ? '–' : k.lastBag + ' min') + ' · ' + (k.pir || 0) + ' PIRs')}
        ${card('Screening outcomes', SK.agents.stats.secondary * P + ' bag searches', SK.agents.stats.patdown * P + ' pat-downs · ' + SK.agents.stats.k9 + ' K9 alerts')}
      </div>`;
    }
    if (learnTab === 'quiz') {
      if (!quiz) newQuiz();
      if (quiz.i >= quiz.qs.length) {
        return `<div class="quiz-q">You scored ${quiz.score} of ${quiz.qs.length}</div><p>${quiz.score >= 7 ? 'Ready for the ops floor.' : quiz.score >= 5 ? 'Solid. Replay the explainers you missed.' : 'Explore the zones and their SOP tabs, then try again.'}</p><button class="btn primary" id="qAgain">New quiz</button>`;
      }
      const q = quiz.qs[quiz.i];
      return `<div class="eyebrow">Question ${quiz.i + 1} of ${quiz.qs.length} · score ${quiz.score}</div><div class="quiz-q">${esc(q.q)}</div>` +
        q.o.map((o, i) => `<button class="quiz-o ${quiz.picked != null ? (i === q.a ? 'right' : i === quiz.picked ? 'wrong' : '') : ''}" data-o="${i}" ${quiz.picked != null ? 'disabled' : ''}>${esc(o)}</button>`).join('') +
        (quiz.picked != null ? `<p style="margin-top:10px">${quiz.picked === q.a ? '<b style="color:var(--ok)">Correct.</b> ' : '<b style="color:var(--bad)">Not quite.</b> '}${esc(q.why)}</p><div style="display:flex;gap:6px"><button class="btn" id="qShow">Show me in the airport</button><button class="btn primary" id="qNext">Next question</button></div>` : '');
    }
    if (learnTab === 'glossary') {
      const items = SK.GLOSSARY.filter((g) => !glossQ || SK.norm(g.term + ' ' + g.def).includes(SK.norm(glossQ)));
      return `<input id="glossSearch" type="search" placeholder="Filter ${SK.GLOSSARY.length} terms" value="${esc(glossQ)}" style="width:100%;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--chip);padding:0 10px;margin-bottom:12px" aria-label="Filter glossary">
        <dl class="gl">${items.map((g) => `<dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd>`).join('')}</dl>`;
    }
    const roles = Object.values(SK.CONTENT).filter((c) => c.kind === 'role');
    return `<div class="grid2">${roles.map((r) => `<button class="card2" data-role="${r.id}" style="text-align:left;cursor:pointer"><b>${esc(r.name)}</b><p style="margin:4px 0 0;color:var(--muted)">${esc(r.summary)}</p></button>`).join('')}</div>`;
  }
  function afterLearn(body) {
    if (learnTab === 'quiz') {
      body.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => { quiz.picked = Number(b.dataset.o); if (quiz.picked === quiz.qs[quiz.i].a) quiz.score++; U.repaintModal(); }));
      const n = body.querySelector('#qNext'); if (n) n.addEventListener('click', () => { quiz.i++; quiz.picked = null; U.repaintModal(); });
      const s = body.querySelector('#qShow'); if (s) s.addEventListener('click', () => { const ref = quiz.qs[quiz.i].ref; U.closeModal(); U.flyEntry(SK.CONTENT[ref]); U.open(ref); });
      const a = body.querySelector('#qAgain'); if (a) a.addEventListener('click', () => { newQuiz(); U.repaintModal(); });
    }
    if (learnTab === 'glossary') {
      const i = body.querySelector('#glossSearch');
      i.addEventListener('input', () => { glossQ = i.value; const pos = i.selectionStart; U.repaintModal(); const j = document.getElementById('glossSearch'); j.focus(); j.setSelectionRange(pos, pos); });
    }
    if (learnTab === 'roles') body.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => { U.closeModal(); U.open(b.dataset.role); }));
  }
  $('learnBtn').addEventListener('click', () => ED.openLearn('dash'));

  // ---------- onboarding tour ----------
  const TOUR = [
    { t: 'Welcome to SKY International', p: 'You are looking at a working international departures terminal. Every figure, bag and aircraft is simulated. The clock runs ' + SK.TIME_SCALE + ' times faster than real life.', el: null, cam: { x: -5, z: 8, d: 260 } },
    { t: 'Live KPIs', p: 'Security, check-in and passport waits are graded against IATA ADRM optimum ranges. Green is inside the range.', el: 'kpis' },
    { t: 'Zones and layers', p: 'Fly to any zone, switch on the heat map or flow lines, and in Operations mode run the staffing yourself.', el: 'left' },
    { t: 'Click anything', p: 'People, desks, scanners, bags and aircraft all open a card: the SOP, the rules behind it, benchmark data, and a live view.', el: null, cam: { x: -20, z: 14, d: 45 } },
    { t: 'Cameras and time', p: 'Switch to top-down, walk the floor, watch the CCTV feeds or let the drone orbit. Speed up time to see a whole wave of departures.', el: 'bottom' },
    { t: 'Your first flight', p: 'Follow one passenger party from the curb to their seat. Their journey log fills in as they go.', el: 'followPaxBtn', last: true },
  ];
  let tour = null;
  ED.startTour = function () { tour = 0; showTour(); };
  function showTour() {
    const s = TOUR[tour], box = $('tour');
    $('tourStep').textContent = 'Step ' + (tour + 1) + ' of ' + TOUR.length;
    $('tourTitle').textContent = s.t;
    $('tourText').textContent = s.p;
    $('tourNext').textContent = s.last ? 'Follow a passenger' : 'Next';
    box.classList.add('on');
    if (s.cam) SK.cam.flyTo({ x: s.cam.x, z: s.cam.z }, { dist: s.cam.d });
    const el = s.el && $(s.el);
    const r = el && el.getClientRects().length ? el.getBoundingClientRect() : null;
    const bw = box.offsetWidth, bh = box.offsetHeight;
    let x = innerWidth / 2 - bw / 2, y = innerHeight / 2 - bh / 2;
    if (r) {
      if (r.bottom + bh + 12 < innerHeight) y = r.bottom + 10; else y = r.top - bh - 10;
      x = SK.clamp(r.left + r.width / 2 - bw / 2, 8, innerWidth - bw - 8);
      if (s.el === 'left') { x = Math.min(innerWidth - bw - 8, r.right + 12); y = r.top + 20; }
    }
    box.style.left = x + 'px'; box.style.top = Math.max(8, y) + 'px';
    $('tourNext').focus();
  }
  function endTour() { tour = null; $('tour').classList.remove('on'); try { localStorage.setItem('skyops.tour', 'done'); } catch (e) { /* ignore */ } }
  $('tourNext').addEventListener('click', () => { if (TOUR[tour].last) { endTour(); U.followRandom(); return; } tour++; showTour(); });
  $('tourSkip').addEventListener('click', endTour);
  $('tourBtn').addEventListener('click', ED.startTour);

  // ---------- search ----------
  const input = $('search'), results = $('results');
  function index() {
    const items = [];
    SK.ZONES.forEach((z) => items.push({ id: z.id, type: 'zone', title: z.name, text: SK.CONTENT[z.id].summary, keywords: SK.CONTENT[z.id].keywords }));
    Object.values(SK.CONTENT).forEach((c) => { if (c.kind !== 'zone') items.push({ id: c.id, type: c.kind, title: c.name, text: c.summary, keywords: c.keywords }); });
    SK.GLOSSARY.forEach((g) => items.push({ id: g.term, type: 'glossary', title: g.term, text: g.def }));
    SK.L.gates.forEach((g) => items.push({ id: g.id, type: 'gate', title: 'Gate ' + g.id, keywords: g.id + (g.bus ? ' bus remote' : '') }));
    SK.ops.flightsAhead(30).forEach((f) => items.push({ id: f.id, type: 'flight', title: f.num + ' to ' + f.city, keywords: f.dest + ' ' + f.gate + ' ' + f.airline.name }));
    return items;
  }
  let res = [], sel = 0;
  function renderResults() {
    results.innerHTML = res.map((r, i) => `<button role="option" class="${i === sel ? 'sel' : ''}" data-i="${i}">${esc(r.title)}<small>${{ zone: 'Zone', object: 'Equipment / process', role: 'Role', glossary: 'Glossary', gate: 'Gate', flight: 'Flight' }[r.type]}</small></button>`).join('') || '<div style="padding:8px;color:var(--muted)">No match</div>';
    results.classList.toggle('on', !!input.value.trim());
    results.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('mousedown', (e) => { e.preventDefault(); pick(res[Number(b.dataset.i)]); }));
  }
  function pick(r) {
    if (!r) return;
    input.value = ''; results.classList.remove('on'); input.blur();
    if (r.type === 'zone') U.goZone(r.id);
    else if (r.type === 'glossary') { glossQ = r.title; ED.openLearn('glossary'); }
    else if (r.type === 'gate') { const g = SK.L.gates.find((x) => x.id === r.id); SK.cam.flyTo({ x: g.x, z: -34 }, { dist: 40 }); U.open('gates'); }
    else if (r.type === 'flight') {
      const f = SK.ops.flights.find((x) => x.id === r.id);
      if (f.plane && f.plane.grp.visible) { SK.cam.flyTo({ x: f.plane.x, z: f.plane.z }, { dist: 90 }); U.open(f.wide ? 'aircraft_wide' : 'aircraft_narrow', { flight: f, plane: f.plane }); }
      else { const g = SK.L.gates.find((x) => x.id === f.gate); SK.cam.flyTo({ x: g.x, z: -34 }, { dist: 40 }); U.open('gates', { flight: f }); }
    } else { U.flyEntry(SK.CONTENT[r.id]); U.open(r.id); }
  }
  input.addEventListener('input', () => { res = SK.searchItems(index(), input.value, 8); sel = 0; renderResults(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(res.length - 1, sel + 1); renderResults(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); renderResults(); e.preventDefault(); }
    else if (e.key === 'Enter') pick(res[sel]);
    else if (e.key === 'Escape') { input.value = ''; results.classList.remove('on'); input.blur(); }
  });
  input.addEventListener('blur', () => setTimeout(() => results.classList.remove('on'), 150));

  ED.frame = function (dt) {
    if (ex) {
      ring.material.opacity = 0.55 + 0.4 * Math.sin(performance.now() * 0.006);
      ring.scale.setScalar(1 + 0.15 * Math.sin(performance.now() * 0.004));
      arrowTex.offset.x -= dt * 1.2;
      if (!ex.paused && !SK.cam.flying()) { ex.t += dt; if (ex.t > 6.5 && ex.i < ex.steps.length - 1) show(ex.i + 1); }
    }
  };
  return ED;
})();
