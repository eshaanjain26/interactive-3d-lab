// SkyOps HUD: top bar KPIs, zones/layers/staffing panel, info panel, bottom bar, flight board, log, follow, keyboard.
SK.ui = (function () {
  const U = {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const C = SK.CONTENT, AG = SK.agents, OPS = SK.ops;
  const P = SK.PAX_PER_FIGURE;
  U.$ = $; U.esc = esc;

  // ---------- KPIs ----------
  // thresholds follow IATA ADRM optimum ranges (economy): ok inside, warn up to 2x, bad beyond
  const KPI = [
    { id: 'waitSecurity', label: 'Security wait', fmt: (v) => v + ' min', grade: (v) => (v <= 10 ? 'ok' : v <= 20 ? 'warn' : 'bad'), entry: 'security' },
    { id: 'waitCheckin', label: 'Check-in wait', fmt: (v) => v + ' min', grade: (v) => (v <= 20 ? 'ok' : v <= 35 ? 'warn' : 'bad'), entry: 'checkin' },
    { id: 'waitPassport', label: 'Passport wait', fmt: (v) => v + ' min', grade: (v) => (v <= 10 ? 'ok' : v <= 20 ? 'warn' : 'bad'), entry: 'passport' },
    { id: 'waitArrImm', label: 'Arrivals immigration', fmt: (v) => v + ' min', grade: (v) => (v <= 10 ? 'ok' : v <= 20 ? 'warn' : 'bad'), entry: 'arrimm' },
    { id: 'firstBag', label: 'First bag', fmt: (v) => (v == null ? '–' : v + ' min'), grade: (v) => (v == null ? '' : v <= 20 ? 'ok' : v <= 30 ? 'warn' : 'bad'), entry: 'claim' },
    { id: 'otp', label: 'On-time', fmt: (v) => v + '%', grade: (v) => (v >= 80 ? 'ok' : v >= 65 ? 'warn' : 'bad'), entry: 'gates' },
    { id: 'mishandledRate', label: 'Bags mishandled', fmt: (v) => v + ' /1k', grade: (v) => (v <= 7 ? 'ok' : v <= 14 ? 'warn' : 'bad'), entry: 'bhs' },
    { id: 'satisfaction', label: 'Satisfaction', fmt: (v) => v, grade: (v) => (v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'bad'), entry: null },
    { id: 'paxIn', label: 'Pax in terminal', fmt: (v) => v.toLocaleString(), grade: () => '', entry: 'r_pax' },
    { id: 'retail', label: 'Retail + F&B', fmt: (v, k) => '$' + Math.round((k.retail + k.food) / 1000) + 'k', grade: () => '', entry: 'dutyfree' },
  ];
  const kpiEl = $('kpis');
  kpiEl.innerHTML = KPI.map((k) => `<button class="kpi" data-k="${k.id}" aria-label="${k.label}"><small>${k.label}</small><b id="k_${k.id}">–</b></button>`).join('');
  kpiEl.addEventListener('click', (e) => {
    const b = e.target.closest('.kpi'); if (!b) return;
    const k = KPI.find((x) => x.id === b.dataset.k);
    if (k.id === 'satisfaction' || k.id === 'retail') SK.edu.openLearn('dash'); else if (k.entry) U.open(k.entry);
  });
  function renderKpis() {
    const k = OPS.kpi;
    KPI.forEach((d) => {
      const el = $('k_' + d.id);
      if (!el || k[d.id] === undefined) return;
      el.textContent = d.fmt(k[d.id], k);
      el.className = d.grade(k[d.id]);
    });
  }

  // ---------- left panel ----------
  let leftTab = 'zones';
  const left = $('left'), leftBody = $('leftBody');
  left.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { leftTab = b.dataset.tab; renderLeft(); }));
  const GROUP_NAMES = { landside: 'Landside', security: 'Security and border', retail: 'Commercial', airside: 'Airside', ops: 'Operations and support' };
  function renderLeft() {
    left.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === leftTab)));
    if (leftTab === 'zones') {
      leftBody.innerHTML = Object.keys(GROUP_NAMES).map((g) => `<div class="eyebrow group-h">${GROUP_NAMES[g]}</div>` +
        SK.ZONES.filter((z) => z.group === g).map((z, i) => `<button class="zone${z.pass > SK.BUILT_PASS ? ' locked' : ''}" data-z="${z.id}"><span class="dot" style="background:${SK.overlays.groupColors[g]}"></span>${esc(z.name)}<span class="k">${z.pass > SK.BUILT_PASS ? 'Pass ' + z.pass : ''}</span></button>`).join('')).join('');
      leftBody.querySelectorAll('.zone').forEach((b) => b.addEventListener('click', () => { U.goZone(b.dataset.z); if (innerWidth < 900) left.classList.remove('on'); }));
    } else if (leftTab === 'layers') {
      const L = [['pax', 'Passengers'], ['staff', 'Staff'], ['vehicles', 'Road vehicles'], ['bags', 'Bags'], ['labels', 'Zone labels'], ['heat', 'Crowd heat map'], ['flow', 'Flow lines'], ['roof', 'Terminal roof']];
      leftBody.innerHTML = `<div class="eyebrow group-h">Layers</div>` + L.map(([k, n]) => `<div class="row"><label for="ly_${k}">${n}</label><input type="checkbox" class="toggle" id="ly_${k}" data-l="${k}" ${SK.layers[k] ? 'checked' : ''}></div>`).join('') +
        `<div class="eyebrow group-h">Show only</div><div class="seg" id="filterSeg" style="flex-wrap:wrap">${['all', 'landside', 'security', 'retail', 'airside', 'ops'].map((f) => `<button data-f="${f}" aria-pressed="${(SK.filterGroup || 'all') === f}">${f === 'all' ? 'All' : GROUP_NAMES[f].split(' ')[0]}</button>`).join('')}</div>` +
        `<div class="eyebrow group-h">Flow line key</div>` + SK.overlays.flowLegend.map(([c, n]) => `<div class="row"><span class="dot" style="width:22px;height:5px;border-radius:3px;background:${c}"></span>${n}</div>`).join('') +
        `<div class="eyebrow group-h">Heat map</div><div style="height:8px;border-radius:4px;background:linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)"></div><div class="row" style="justify-content:space-between;color:var(--muted);font-size:11px"><span>quiet</span><span>crowded</span></div>`;
      leftBody.querySelectorAll('[data-l]').forEach((i) => i.addEventListener('change', () => { SK.layers[i.dataset.l] = i.checked; SK.overlays.applyLayers(); }));
      leftBody.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => U.setFilter(b.dataset.f)));
    } else renderStaff(true);
  }
  U.setFilter = function (g) {
    SK.filterGroup = g;
    if (g === 'all') SK.filterFn = null;
    else {
      const rects = SK.ZONES.filter((z) => z.group === g && z.pass <= SK.BUILT_PASS).map((z) => z.b);
      SK.filterFn = (a) => rects.some((b) => a.x >= b[0] && a.x <= b[1] && a.z >= b[2] && a.z <= b[3]);
      const zs = SK.ZONES.filter((z) => z.group === g && z.pass <= SK.BUILT_PASS);
      if (zs.length) {
        const cx = zs.reduce((s, z) => s + z.x, 0) / zs.length, cz = zs.reduce((s, z) => s + z.z, 0) / zs.length;
        SK.cam.flyTo({ x: cx, z: cz }, { dist: g === 'airside' || g === 'ops' ? 200 : 110 });
      }
    }
    if (leftTab === 'layers') renderLeft();
  };
  function renderStaff(full) {
    const st = AG.st, k = OPS.kpi;
    const html = `<div class="row"><label for="autoStaff"><b>Auto staffing</b><br><small style="color:var(--muted)">Opens servers to hold waits inside IATA ADRM ranges</small></label><input type="checkbox" class="toggle" id="autoStaff" ${OPS.autoStaff ? 'checked' : ''}></div>` +
      OPS.levers.map((lv) => {
        const s = st[lv.st], open = s.openCount(), q = s.queue.length, w = Math.round(s.predictedWait() / 60);
        const pct = Math.min(100, (q / Math.max(1, open * 8)) * 100);
        return `<div class="lever"><div class="top"><span>${lv.name}</span><span class="stepper"><button data-lv="${lv.id}" data-d="-1" aria-label="Close one ${lv.name}" ${OPS.autoStaff ? 'disabled' : ''}>−</button><b id="lv_${lv.id}">${open}/${s.servers.length}</b><button data-lv="${lv.id}" data-d="1" aria-label="Open one more ${lv.name}" ${OPS.autoStaff ? 'disabled' : ''}>+</button></span></div>
          <small>Queue ${q * P} pax · wait ${w === Infinity || isNaN(w) ? 'closed' : w + ' min'} · $${lv.cost}/hr each</small><div class="bar"><i style="width:${pct}%;background:${pct > 70 ? 'var(--bad)' : pct > 40 ? 'var(--warn)' : 'var(--ok)'}"></i></div></div>`;
      }).join('') +
      `<div class="eyebrow group-h">Shift economics</div><div class="data"><div>Staff + equipment</div><div>$${(k.staffCost || 0).toLocaleString()}/hr</div><div>Labour so far</div><div>$${Math.round(OPS.money.staff).toLocaleString()}</div><div>Retail + F&amp;B sales</div><div>$${Math.round(OPS.money.retail + OPS.money.food).toLocaleString()}</div><div>Satisfaction</div><div>${k.satisfaction}</div></div>` +
      (OPS.mode === 'ops' ? `<p style="color:var(--muted);font-size:12px;margin-top:10px">Operations mode: you run the staffing. Keep security under 10 min and check-in under 20 min without overspending.</p>` : '');
    if (full) {
      leftBody.innerHTML = html;
      leftBody.querySelector('#autoStaff').addEventListener('change', (e) => { OPS.autoStaff = e.target.checked; renderStaff(true); });
      leftBody.querySelectorAll('[data-lv]').forEach((b) => b.addEventListener('click', () => {
        const lv = OPS.levers.find((l) => l.id === b.dataset.lv);
        OPS.setOpen(lv.id, AG.st[lv.st].openCount() + Number(b.dataset.d));
        renderStaff(true);
      }));
    } else if (leftTab === 'staff' && !leftBody.contains(document.activeElement)) renderStaff(true);
  }

  // ---------- info panel ----------
  const info = $('info');
  let cur = null, curTab = 'overview';
  const stationFor = { desk_economy: ['economy'], desk_priority: ['priority'], bagdrop: ['bagdrop'], special_desk: ['special'], kiosk: ['kiosk'], docpodium: ['doc', 'ftDoc'], lane: ['lanes', 'ftLane'], xray: ['lanes'], bodyscanner: ['lanes'], security: ['doc', 'lanes', 'ftLane'], checkin: ['economy', 'priority', 'bagdrop', 'kiosk', 'special'], passport: ['manual', 'egate'], booth: ['manual'], egate: ['egate'], cafe: ['cafe'], food: ['cafe'], lounge: ['lounge'], dutyfree: ['till0', 'till1'], arrimm: ['arrManual', 'arrEgate'], arr_booth: ['arrManual'], arr_egate: ['arrEgate'], bservices: ['arrServ'], customs: ['arrRed'], red_channel: ['arrRed'] };
  U.open = function (id, ctx) {
    const e = C[id];
    if (!e) return;
    cur = { e, ctx: ctx || {} };
    const hasLive = !!(cur.ctx.agent || cur.ctx.bag || cur.ctx.abag || cur.ctx.flight || stationFor[id] || ['gates', 'gatepodium', 'bhs', 'claim', 'carousel', 'arrivals'].includes(id));
    curTab = hasLive ? 'live' : 'overview';
    info.classList.add('on');
    $('infoKind').textContent = e.future ? 'Coming in pass ' + e.future : e.kind === 'role' ? 'Role' : e.kind === 'zone' ? 'Zone' : 'Equipment and process';
    renderInfo();
    if (innerWidth < 900) left.classList.remove('on');
  };
  U.close = function () { info.classList.remove('on'); cur = null; };
  $('infoClose').addEventListener('click', U.close);
  function tabsFor(e, ctx) {
    const t = [];
    if (ctx.agent || ctx.bag || ctx.abag || ctx.flight || stationFor[e.id] || ['gates', 'gatepodium', 'bhs', 'claim', 'carousel', 'arrivals'].includes(e.id)) t.push(['live', 'Live']);
    t.push(['overview', 'Overview']);
    if (e.sop.length) t.push(['sop', 'SOP']);
    if (e.regs.length) t.push(['rules', 'Rules']);
    if (e.data.length) t.push(['data', 'Data']);
    if (e.roles.length) t.push(['roles', 'Roles']);
    return t;
  }
  function renderInfo() {
    if (!cur) return;
    const { e, ctx } = cur;
    let title = e.name;
    if (ctx.agent && ctx.agent.kind === 'pax') title = 'Passenger party · ' + (ctx.agent.arriving ? ctx.agent.arr.num + ' from ' + ctx.agent.arr.origin : ctx.agent.flight.num);
    if (ctx.bag) title = 'Bag ' + ctx.bag.tag;
    if (ctx.flight && !ctx.agent && !ctx.bag) title = ctx.flight.num + ' to ' + ctx.flight.city;
    $('infoTitle').textContent = title;
    $('infoSummary').textContent = ctx.agent || ctx.bag || ctx.flight ? e.name + (ctx.agent && ctx.agent.kind === 'pax' ? ' (one figure = ' + P + ' travellers)' : '') : '';
    const acts = [];
    if (!e.future) acts.push(`<button class="btn" data-act="fly">Fly here</button>`);
    if (!e.future && (e.explainer || e.sop.length)) acts.push(`<button class="btn primary" data-act="explain">▶ Explainer</button>`);
    if (ctx.agent || ctx.bag || ctx.plane) acts.push(`<button class="btn" data-act="follow">Follow</button>`);
    if (SK.QUIZ.some((q) => q.ref === e.id)) acts.push(`<button class="btn" data-act="quiz">Quiz me</button>`);
    if (e.id === 'fire' || e.id === 'arff_truck') acts.push(`<button class="btn" data-act="drill">Run response drill</button>`);
    $('infoActs').innerHTML = acts.join('');
    $('infoActs').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    const tabs = tabsFor(e, ctx);
    if (!tabs.some((t) => t[0] === curTab)) curTab = tabs[0][0];
    $('infoTabs').innerHTML = tabs.map(([k, n]) => `<button role="tab" aria-selected="${k === curTab}" data-t="${k}">${n}</button>`).join('');
    $('infoTabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { curTab = b.dataset.t; renderInfo(); }));
    $('infoBody').innerHTML = body(e, ctx);
    $('infoBody').querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => U.open(b.dataset.open)));
  }
  function body(e, ctx) {
    if (curTab === 'overview') return `<p>${esc(e.summary)}</p>` + (e.future ? '<p style="color:var(--muted)">This zone is massing only in pass 1. Fly here to see where it sits on the airport.</p>' : '');
    if (curTab === 'sop') return `<ol>${e.sop.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    if (curTab === 'rules') return e.regs.map((r) => `<div class="reg"><b>${esc(r.src)}</b>${esc(r.text)}</div>`).join('');
    if (curTab === 'data') return `<div class="data">${e.data.map((d) => `<div>${esc(d.k)}</div><div>${esc(d.v)}</div>`).join('')}</div>`;
    if (curTab === 'roles') return e.roles.map((r) => `<button class="rolechip" data-open="${r}">${esc(C[r].name)}</button>`).join('') + '<p style="color:var(--muted);margin-top:8px">Tap a role for its duties.</p>';
    return live(e, ctx);
  }
  function live(e, ctx) {
    const t = SK.sim.now;
    if (ctx.agent) {
      const a = ctx.agent;
      if (a.kind === 'pax' && a.arriving) {
        const r = a.arr;
        return `<div class="live"><b>${esc(r.num)}</b> from ${esc(r.origin)} · on blocks ${SK.fmtTime(r.blockIn)} · bags on carousel ${r.carousel + 1}<br>${a.bags ? 'one hold bag' : 'cabin bags only'}${a.egate ? ' · ePassport' : ''}</div><div class="eyebrow">Journey</div><ul class="timeline">${(a.log || []).slice().reverse().map((l) => `<li><span>${SK.fmtTime(l.t)}</span>${esc(l.text)}</li>`).join('')}</ul>`;
      }
      if (a.kind === 'pax') {
        const f = a.flight;
        return `<div class="live"><b>${esc(f.num)}</b> to ${esc(f.city)} · gate ${f.gate} · ${esc(f.statusText || '')}<br>${a.cls === 'F' ? 'First' : a.cls === 'J' ? 'Business' : 'Economy'} · ${a.bags ? 'checked bag ' + esc((a.tags || []).join(', ') || 'not yet tagged') : 'no hold bag'}${a.prm ? ' · wheelchair assistance' : ''}${a.egate ? ' · ePassport' : ''} · boarding group ${a.group === 0 ? 'pre-board' : a.group}</div>
          <div class="eyebrow">Journey</div><ul class="timeline">${(a.log || []).slice().reverse().map((l) => `<li><span>${SK.fmtTime(l.t)}</span>${esc(l.text)}</li>`).join('')}</ul>`;
      }
      if (a.anim === 'lie') return `<div class="live">Collapsed and not responding. Responders are on the way.</div>`;
      if (a.kind === 'crew') return `<div class="live">Crew for <b>${esc(a.flight.num)}</b> to ${esc(a.flight.city)}, gate ${a.flight.gate}</div><p>${esc(e.summary)}</p>`;
      return `<div class="live">On duty${a.visibleFn ? ' at an open position' : ''}.</div><p>${esc(e.summary)}</p>`;
    }
    if (ctx.bag) {
      const b = ctx.bag;
      return `<div class="live">Tag <b>${esc(b.tag)}</b> · ${esc(b.f.num)} to ${esc(b.f.city)} · now: ${esc(b.state)}</div><div class="eyebrow">Tracking events</div><ul class="timeline">${b.log.slice().reverse().map((l) => `<li><span>${SK.fmtTime(l.t)}</span>${esc(l.text)}</li>`).join('')}</ul>`;
    }
    if (ctx.abag) { const b = ctx.abag; return `<div class="live">Bag for a passenger on <b>${esc(b.rec.num)}</b> from ${esc(b.rec.origin)} · carousel ${b.rec.carousel + 1}</div><p>Its owner is ${b.owner.dead ? 'gone' : 'on the way or waiting at the belt'}.</p>`; }
    if (ctx.flight) return flightLive(ctx.flight, ctx.plane);
    if (['claim', 'carousel', 'arrivals'].includes(e.id) && SK.arrivals) {
      const k = OPS.kpi, list = SK.arrivals.list;
      return `<div class="data"><div>Arriving passengers today</div><div>${(k.arrived || 0).toLocaleString()}</div><div>Avg first bag</div><div>${k.firstBag == null ? '–' : k.firstBag + ' min'}</div><div>Avg last bag</div><div>${k.lastBag == null ? '–' : k.lastBag + ' min'}</div><div>Delayed bag reports (PIR)</div><div>${k.pir}</div><div>Customs green-channel stops</div><div>${k.customsStops}</div><div>Duty collected</div><div>$${(k.duty || 0).toLocaleString()}</div></div>
        <div class="eyebrow" style="margin-top:10px">Flights in reclaim</div><table class="fl"><tr><th>Flight</th><th>From</th><th>Belt</th><th>On blocks</th><th>First bag</th></tr>${list.map((r) => `<tr><td>${esc(r.num)}</td><td>${esc(r.origin)}</td><td>${r.carousel + 1}</td><td>${SK.fmtTime(r.blockIn)}</td><td>${r.firstBag ? Math.round((r.firstBag - r.blockIn) / 60) + ' min' : '–'}</td></tr>`).join('')}</table>`;
    }
    if (e.id === 'gates' || e.id === 'gatepodium') {
      const list = OPS.flightsAhead(8).filter((f) => !f.offBlock);
      return `<div class="eyebrow">Next departures</div><table class="fl"><tr><th>STD</th><th>Flight</th><th>Gate</th><th>Status</th><th>Boarded</th></tr>${list.map((f) => `<tr><td>${SK.fmtTime(f.std)}</td><td>${esc(f.num)}</td><td>${f.gate}</td><td>${pill(f)}</td><td>${f.boarded * P}/${f.figures * P}</td></tr>`).join('')}</table>`;
    }
    if (e.id === 'bhs') {
      const s = SK.bags.stats;
      return `<div class="data"><div>Bags inducted</div><div>${s.inducted * P}</div><div>CT screened</div><div>${s.screened * P}</div><div>Level 3 inspections</div><div>${s.alarms * P}</div><div>Loaded into holds</div><div>${s.loaded * P}</div><div>Short-shipped (mishandled)</div><div>${s.short * P}</div><div>In the system now</div><div>${SK.bags.list.length * P}</div></div><p style="color:var(--muted);margin-top:10px">Click a bag on a belt to follow it.</p>`;
    }
    const names = stationFor[e.id] || [];
    return names.map((n) => {
      const s = AG.st[n];
      const w = s.predictedWait();
      return `<div class="card2" style="margin-bottom:8px"><div class="eyebrow">${esc(s.name === 'lanes' ? 'Standard lanes' : s.name === 'ftLane' ? 'Fast track lane' : s.name === 'doc' ? 'Document check' : s.name === 'ftDoc' ? 'Fast track podium' : s.name)}</div>
        <div class="data"><div>Open</div><div>${s.openCount()} of ${s.servers.length}</div><div>In queue</div><div>${s.queue.length * P} pax</div><div>Predicted wait</div><div>${w === Infinity ? 'closed' : Math.round(w / 60) + ' min'}</div><div>Observed wait (20 min)</div><div>${Math.round(s.observedWait(t, 1200) / 60)} min</div><div>Served today</div><div>${s.served * P} pax</div></div></div>`;
    }).join('') + '<p style="color:var(--muted)">Switch to Operations mode to open or close servers yourself.</p>';
  }
  function pill(f) {
    const s = f.statusText || SK.flightStatus(f, SK.sim.now);
    const cls = /Delayed|Final/.test(s) ? 'warn' : /Boarding|Go to gate|Departed|Taxiing/.test(s) ? 'ok' : '';
    return `<span class="pill ${cls}">${esc(s)}</span>`;
  }
  U.pill = pill;
  function flightLive(f, p) {
    const pl = p || f.plane;
    const t = SK.AIRCRAFT_TYPES[f.wide ? 'wide' : 'narrow'];
    return `<div class="live"><b>${esc(f.num)}</b> ${esc(f.airline.name)} to ${esc(f.city)} (${f.dest}) · ${pill(f)}</div>
      <div class="data"><div>Aircraft</div><div>${esc(t.name)}</div><div>Stand / gate</div><div>${f.bus ? 'R1 via bus gate ' + f.gate : f.gate}</div><div>Scheduled</div><div>${SK.fmtTime(f.std)}</div><div>Estimated</div><div>${SK.fmtTime(f.etd)}</div>
      <div>Aircraft state</div><div>${pl ? esc(pl.state) : 'inbound not yet airborne'}</div><div>On blocks</div><div>${f.blockIn ? SK.fmtTime(f.blockIn) : '–'}</div><div>Off blocks</div><div>${f.offBlockAt ? SK.fmtTime(f.offBlockAt) + ' (' + f.delayMin + ' min late)' : '–'}</div>
      <div>Passengers booked</div><div>${f.pax}</div><div>Boarded</div><div>${f.boarded * P}</div><div>Missed</div><div>${(f.missed || 0) * P}</div><div>Bags accepted / loaded</div><div>${f.bagsAccepted * P} / ${f.bagsLoaded * P}</div><div>Short-shipped</div><div>${f.bagsShort * P}</div></div>`;
  }
  function act(a) {
    const { e, ctx } = cur;
    if (a === 'fly') {
      if (ctx.agent) SK.cam.flyTo({ x: ctx.agent.x, z: ctx.agent.z }, { dist: 14 });
      else if (ctx.plane) SK.cam.flyTo({ x: ctx.plane.x, z: ctx.plane.z }, { dist: 80 });
      else U.flyEntry(e);
    }
    if (a === 'explain') SK.edu.explain(e);
    if (a === 'quiz') SK.edu.openLearn('quiz', e.id);
    if (a === 'drill') {
      SK.support.drill({ x: SK.L.runway.x0 + 40, z: SK.L.runway.z }, 'response drill to the far end of runway 27');
      SK.cam.flyTo({ x: -150, z: -205 }, { dist: 260 });
      setTimeout(() => SK.support.recall(), 45000);
    }
    if (a === 'follow') {
      if (ctx.agent) U.followAgent(ctx.agent);
      else if (ctx.bag) U.followBag(ctx.bag);
      else if (ctx.plane) U.followPlane(ctx.plane);
    }
  }
  U.flyEntry = function (e) {
    const z = SK.ZONES.find((q) => q.id === e.id);
    const d = z ? z.d : e.kind === 'role' ? 40 : 24;
    SK.cam.flyTo({ x: e.at.x, y: e.at.y || 0, z: e.at.z }, { dist: d });
  };
  U.goZone = function (id) {
    const z = SK.ZONES.find((q) => q.id === id);
    SK.cam.flyTo({ x: z.x, y: z.y || 0, z: z.z }, { dist: z.d });
    U.open(id);
  };

  // ---------- following ----------
  const chip = $('chip');
  function showChip(text, extra) {
    $('chipText').textContent = text;
    chip.classList.add('on');
    chip.dataset.extra = extra || '';
  }
  function clearFollow() {
    AG.list.forEach((a) => (a.highlight = false));
    SK.bags.followed = null;
  }
  U.followAgent = function (a) {
    clearFollow();
    a.highlight = true;
    SK.cam.follow(() => (a.dead || a.hidden && a.kind !== 'pax' ? null : { x: a.x, y: a.y, z: a.z }), 'agent');
    showChip(a.kind === 'pax' ? (a.arriving ? 'Following an arriving party from ' + a.arr.origin + ' (' + a.arr.num + ')' : 'Following a passenger party to ' + a.flight.city + ' (' + a.flight.num + ')') : 'Following ' + (C[a.role] ? C[a.role].name : 'staff'));
    U.open(a.role, { agent: a });
  };
  U.followBag = function (b) {
    clearFollow();
    SK.bags.followed = b;
    SK.cam.follow(() => (b.state === 'gone' ? null : { x: b.x, y: 1, z: b.z }), 'bag');
    showChip('Following bag ' + b.tag + ' (' + b.f.num + ')');
  };
  U.followPlane = function (p) {
    clearFollow();
    SK.cam.follow(() => (p.state === 'gone' ? null : { x: p.x, y: p.y, z: p.z }), 'plane');
    SK.cam.flyTo({ x: p.x, z: p.z }, { dist: 110, keepMode: true, dur: 0.8 });
    showChip('Following ' + p.f.num + ' to ' + p.f.city);
  };
  U.followRandom = function () {
    const pool = AG.list.filter((a) => a.kind === 'pax' && !a.arriving && !a.hidden && a.log && a.log.length < 4 && a.z > 29 && a.x < 110);
    const a = pool.length ? SK.rng.pick(pool) : AG.list.find((x) => x.kind === 'pax' && !x.hidden);
    if (a) U.followAgent(a);
  };
  $('chipStop').addEventListener('click', () => {
    if (SK.cam.mode === 'cctv') { setCam('strategy'); return; }
    clearFollow(); SK.cam.stopFollow(); chip.classList.remove('on');
  });
  SK.bus.on('camMode', (m) => {
    if (m !== 'follow' && m !== 'cctv') { chip.classList.remove('on'); clearFollow(); }
    $('cctv').classList.toggle('on', m === 'cctv');
    $('joy').classList.toggle('on', m === 'walk' && matchMedia('(pointer: coarse)').matches);
    document.querySelectorAll('#camSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cam === m || (m === 'follow' && b.dataset.cam === 'strategy'))));
  });
  SK.bus.on('cctv', (c) => { $('cctvName').textContent = c.name; showChip(c.name + '  ·  , and . switch cameras'); $('chipStop').textContent = 'Exit'; });

  // ---------- clicks in the 3D view ----------
  SK.bus.on('click', ({ hit }) => {
    if (!hit) return;
    if (SK.edu && SK.edu.exploring()) SK.edu.stopExplain();
    U.open(hit.entry, hit);
  });

  // ---------- bottom bar ----------
  function setCam(m) {
    if (m === 'cctv' && SK.cam.mode === 'cctv') { SK.cam.cctv(SK.cam.cctvIndex + 1); return; }
    $('chipStop').textContent = 'Stop';
    SK.cam.setMode(m);
  }
  document.querySelectorAll('#camSeg button').forEach((b) => b.addEventListener('click', () => setCam(b.dataset.cam)));
  function setSpeed(v) {
    SK.engine.paused = v === 0;
    if (v) SK.engine.speed = v;
    document.querySelectorAll('#speedSeg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === (SK.engine.paused ? 0 : SK.engine.speed))));
  }
  U.setSpeed = setSpeed;
  document.querySelectorAll('#speedSeg button').forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
  $('lightSel').addEventListener('change', (e) => { SK.sky.override = e.target.value === 'clock' ? null : Number(e.target.value); });
  $('wxSel').addEventListener('change', (e) => SK.sky.setWeather(e.target.value));
  SK.bus.on('weather', (w) => { $('wxSel').value = w; $('wxLabel').textContent = SK.sky.types[w].label; });
  $('followPaxBtn').addEventListener('click', U.followRandom);
  $('menuBtn').addEventListener('click', () => left.classList.toggle('on'));

  // walk joystick (touch)
  const joy = $('joy'), knob = joy.querySelector('i');
  let joyId = null;
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(joyId); moveJoy(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) moveJoy(e); });
  joy.addEventListener('pointerup', () => { joyId = null; SK.cam.joy.x = 0; SK.cam.joy.y = 0; knob.style.transform = ''; });
  function moveJoy(e) {
    const r = joy.getBoundingClientRect();
    const dx = SK.clamp((e.clientX - r.left - r.width / 2) / 40, -1, 1), dy = SK.clamp((e.clientY - r.top - r.height / 2) / 40, -1, 1);
    SK.cam.joy.x = dx; SK.cam.joy.y = dy;
    knob.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
  }

  // ---------- top bar: mode, flights, settings, help ----------
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => U.setMode(b.dataset.mode)));
  U.setMode = function (m) {
    OPS.mode = m;
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    if (m === 'sandbox') { OPS.autoStaff = true; }
    if (m === 'ops') { OPS.autoStaff = false; leftTab = 'staff'; left.classList.add('on'); renderLeft(); SK.bus.emit('ops', { t: SK.sim.now, kind: 'info', msg: 'Operations mode: you control staffing. Auto staffing is off.' }); }
    if (m === 'crisis') SK.crisis.openPicker();
    if (leftTab === 'staff') renderLeft();
  };
  $('flightsBtn').addEventListener('click', () => U.openFlights());
  U.openFlights = function () {
    U.modal('Flight board', [], () => {
      const t = SK.sim.now;
      const list = OPS.flights.filter((f) => f.std > t - SK.minutes(150) && f.std < t + SK.minutes(420));
      return `<table class="fl"><tr><th>STD</th><th>ETD</th><th>Flight</th><th>To</th><th>Gate</th><th>Aircraft</th><th>Status</th><th>Pax boarded</th><th>Delay</th></tr>${list.map((f) => `<tr class="click" data-f="${f.id}" tabindex="0"><td>${SK.fmtTime(f.std)}</td><td>${SK.fmtTime(f.etd)}</td><td><b>${esc(f.num)}</b></td><td>${esc(f.city)}</td><td>${f.gate}</td><td>${f.wide ? 'Wide' : 'Narrow'}</td><td>${pill(f)}</td><td>${f.boarded * P}/${f.pax}</td><td>${f.offBlock ? f.delayMin + ' min' : f.etd > f.std ? '+' + Math.round((f.etd - f.std) / 60) : ''}</td></tr>`).join('')}</table>
        <p style="color:var(--muted)">On-time means off blocks within 15 minutes of schedule. Click a flight to find its aircraft.</p>`;
    }, (body) => body.querySelectorAll('[data-f]').forEach((r) => {
      const go = () => {
        const f = OPS.flights.find((x) => x.id === r.dataset.f);
        U.closeModal();
        if (f.plane && f.plane.grp.visible) { SK.cam.flyTo({ x: f.plane.x, z: f.plane.z }, { dist: 90 }); U.open(f.wide ? 'aircraft_wide' : 'aircraft_narrow', { flight: f, plane: f.plane }); }
        else { const g = SK.L.gates.find((x) => x.id === f.gate); SK.cam.flyTo({ x: g.x, z: -36 }, { dist: 45 }); U.open('gates', { flight: f }); }
      };
      r.addEventListener('click', go);
      r.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }), 2);
  };

  // generic modal: title, tabs [[id,name]], render() -> html, after(body), refresh seconds
  const modal = $('modal');
  let modalState = null, lastFocus = null;
  U.modal = function (title, tabs, render, after, refresh, onTab) {
    lastFocus = document.activeElement;
    U.modalLive = null;
    modalState = { render, after, refresh, t: 0 };
    $('modalTitle').textContent = title;
    $('modalTabs').innerHTML = tabs.map(([id, n], i) => `<button data-mt="${id}" aria-pressed="${i === 0}">${n}</button>`).join('');
    $('modalTabs').style.display = tabs.length ? '' : 'none';
    $('modalTabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      $('modalTabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (onTab) onTab(b.dataset.mt);
    }));
    modal.classList.add('on');
    paintModal();
    $('modalClose').focus();
  };
  U.setModalTab = function (id) { $('modalTabs').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.mt === id))); };
  function paintModal() {
    if (!modalState) return;
    const body = $('modalBody');
    const scroll = body.scrollTop;
    body.innerHTML = modalState.render();
    if (modalState.after) modalState.after(body);
    body.scrollTop = scroll;
  }
  U.repaintModal = paintModal;
  U.closeModal = function () { modal.classList.remove('on'); modalState = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  $('modalClose').addEventListener('click', U.closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) U.closeModal(); });

  $('settingsBtn').addEventListener('click', () => {
    const S = SK.settings;
    U.modal('Settings and accessibility', [], () => `
      <div class="row"><label>Theme</label><div class="seg">${['auto', 'light', 'dark'].map((t) => `<button data-theme-set="${t}" aria-pressed="${S.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      <div class="row"><label for="s_cb">Colour-blind safe status colours</label><input type="checkbox" class="toggle" id="s_cb" ${S.cb ? 'checked' : ''}></div>
      <div class="row"><label>Text size</label><div class="seg">${[[1, 'Normal'], [1.15, 'Large'], [1.3, 'Larger']].map(([v, n]) => `<button data-text="${v}" aria-pressed="${S.text === v}">${n}</button>`).join('')}</div></div>
      <div class="row"><label for="s_rm">Reduced motion (instant camera cuts, no glow pulse)</label><input type="checkbox" class="toggle" id="s_rm" ${S.reduced ? 'checked' : ''}></div>
      <div class="row"><label for="s_sp">Spoken boarding announcements</label><input type="checkbox" class="toggle" id="s_sp" ${S.speech ? 'checked' : ''}></div>
      <div class="row"><label for="s_aq">Adaptive quality (keeps the frame rate up)</label><input type="checkbox" class="toggle" id="s_aq" ${S.autoQuality ? 'checked' : ''}></div>
      <p style="color:var(--muted)">Quality level now: ${['Low', 'Medium', 'High', 'Ultra'][SK.engine.quality.level]}. Each figure in the sim stands for ${P} passengers; the clock runs ${SK.TIME_SCALE} times faster than real time.</p>`, (body) => {
      body.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => { S.theme = b.dataset.themeSet; S.apply(); S.save(); U.repaintModal(); }));
      body.querySelectorAll('[data-text]').forEach((b) => b.addEventListener('click', () => { S.text = Number(b.dataset.text); S.apply(); S.save(); U.repaintModal(); }));
      [['s_cb', 'cb'], ['s_rm', 'reduced'], ['s_sp', 'speech'], ['s_aq', 'autoQuality']].forEach(([id, k]) => body.querySelector('#' + id).addEventListener('change', (e) => { S[k] = e.target.checked; S.apply(); S.save(); }));
    });
  });
  $('helpBtn').addEventListener('click', () => U.openHelp());
  U.openHelp = function () {
    U.modal('How to use SkyOps', [], () => `
      <div class="grid2">
        <div class="card2"><b>Explore</b><p>Drag to orbit, right-drag or two-finger drag to pan, scroll to zoom. Click any person, bag, aircraft, desk or sign to open its card with the SOP, rules and live data.</p></div>
        <div class="card2"><b>Modes</b><p><b>Sandbox</b>: auto staffing, explore freely. <b>Operations</b>: you open and close desks, lanes and booths. <b>Crisis</b>: pick an incident and make the calls.</p></div>
        <div class="card2"><b>Time</b><p>The clock runs ${SK.TIME_SCALE}x real time. Use the speed buttons to fast-forward. Each passenger figure stands for ${P} travellers.</p></div>
        <div class="card2"><b>Learn</b><p>Every card has an animated explainer. The Learn button has the live dashboard, a quiz and a glossary.</p></div>
      </div>
      <h3 style="margin:16px 0 8px;font-size:14px">Keyboard</h3>
      <dl class="gl">${SK.settings.KEYS.map(([k, d]) => `<dt>${esc(k)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>
      <p style="color:var(--muted);margin-top:14px">SKY International, its airlines and flights are fictional. Process steps, regulations and benchmark figures come from public ICAO, IATA, TSA, FAA and EU sources and are shown as typical ranges.</p>`);
  };

  // ---------- keyboard ----------
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.key !== 'Escape') return;
    const k = e.key;
    if (k === 'Escape') {
      if (modal.classList.contains('on')) return U.closeModal();
      if (SK.edu.exploring()) return SK.edu.stopExplain();
      if (SK.cam.mode !== 'strategy') { setCam('strategy'); return; }
      return U.close();
    }
    if (modal.classList.contains('on')) return;
    if (k === '/') { e.preventDefault(); $('search').focus(); }
    else if (k === ' ') { e.preventDefault(); setSpeed(SK.engine.paused ? SK.engine.speed || 1 : 0); }
    else if (k >= '1' && k <= '5') setCam(['strategy', 'top', 'walk', 'cctv', 'drone'][Number(k) - 1]);
    else if (k === '[' || k === ']') { const sp = [1, 2, 4, 8]; const i = sp.indexOf(SK.engine.speed); setSpeed(sp[SK.clamp(i + (k === ']' ? 1 : -1), 0, 3)]); }
    else if (k === 'f' || k === 'F') U.followRandom();
    else if (k === 'b' || k === 'B') U.openFlights();
    else if (k === 'l' || k === 'L') SK.edu.openLearn('dash');
    else if (k === 'z' || k === 'Z') left.classList.toggle('on');
    else if (k === '?') U.openHelp();
    else if ((k === ',' || k === '.') && SK.cam.mode === 'cctv') SK.cam.cctv(SK.cam.cctvIndex + (k === '.' ? 1 : -1));
  });

  // ---------- log + clock ----------
  const logList = $('logList');
  let logSeen = 0;
  function renderLog() {
    const ev = OPS.events;
    if (ev.length === logSeen && logSeen) return;
    logSeen = ev.length;
    logList.innerHTML = ev.slice(-6).reverse().map((e) => `<li class="${e.kind}"><span>${SK.fmtTime(e.t)}</span><b>${esc(e.msg)}</b></li>`).join('');
  }
  let slow = 0;
  U.frame = function (dtGame, dtReal) {
    SK.overlays.frame(dtGame, dtReal);
    if (SK.edu) SK.edu.frame(dtReal);
    if (SK.crisis) SK.crisis.frame(dtGame, dtReal);
    slow -= dtReal;
    if (slow > 0) return;
    slow = 0.25;
    $('clock').textContent = SK.fmtTime(SK.sim.now);
    $('dayIcon').textContent = SK.sky.night > 0.85 ? '☾' : SK.sky.weather === 'clear' ? '☀' : SK.sky.weather === 'snow' ? '❄' : SK.sky.weather === 'storm' ? '⚡' : '☁';
    $('cctvTime').textContent = SK.fmtTime(SK.sim.now);
    $('fps').textContent = Math.round(SK.engine.fps()) + ' fps · ' + (SK.crowd.visibleCount || 0) + ' figures';
    renderKpis();
    renderLog();
    if (leftTab === 'staff' && left.getClientRects().length) renderStaff(false);
    if (cur && curTab === 'live') { const sc = $('infoBody').scrollTop; $('infoBody').innerHTML = body(cur.e, cur.ctx); $('infoBody').scrollTop = sc; $('infoBody').querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => U.open(b.dataset.open))); }
    if (modalState && modalState.refresh && (!U.modalLive || U.modalLive())) { modalState.t -= 0.25; if (modalState.t <= 0) { modalState.t = modalState.refresh; paintModal(); } }
  };
  // panels sit below the top bar, whose height changes when the KPI strip wraps
  function layoutHud() {
    const b = $('top').getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--hudTop', Math.round(b + 8) + 'px');
  }
  window.addEventListener('resize', layoutHud);
  U.ready = function () {
    layoutHud();
    renderLeft();
    SK.overlays.applyLayers();
    renderKpis();
    if (innerWidth >= 900) left.classList.add('on');
    let seen = false;
    try { seen = localStorage.getItem('skyops.tour') === 'done'; } catch (e) { /* ignore */ }
    if (!seen) SK.edu.startTour();
  };
  return U;
})();
