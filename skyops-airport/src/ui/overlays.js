// SkyOps overlays: zone labels, minimap with fast travel, passenger heat map, animated flow lines.
SK.layers = { pax: true, staff: true, vehicles: true, bags: true, labels: true, heat: false, flow: false, roof: false };
SK.overlays = (function () {
  const E = SK.engine, L = SK.L;
  const O = {};
  const GROUP_COLORS = { landside: '#4e8fd6', security: '#d9534f', retail: '#e0a030', airside: '#3aa776', ops: '#8a6fd1' };
  O.groupColors = GROUP_COLORS;

  // ---------- labels ----------
  const host = document.getElementById('labels');
  const labels = SK.ZONES.map((z) => {
    const el = document.createElement('button');
    el.className = 'lbl' + (z.pass > 1 ? ' locked' : '');
    el.textContent = z.name + (z.pass > 1 ? ' · pass ' + z.pass : '');
    el.setAttribute('tabindex', '-1');
    el.addEventListener('click', () => SK.ui.goZone(z.id));
    host.appendChild(el);
    return { z, el, p: new THREE.Vector3(z.x, (z.y || 0) + (z.id === 'tower' ? 40 : 10), z.z) };
  });
  const v = new THREE.Vector3();
  function updateLabels() {
    const show = SK.layers.labels && SK.cam.mode !== 'cctv' && SK.cam.mode !== 'walk';
    const cam = E.camera, w = host.clientWidth, h = host.clientHeight;
    const dist = cam.position.distanceTo(E.controls.target);
    labels.forEach((l) => {
      let vis = show && (!SK.filterGroup || SK.filterGroup === 'all' || l.z.group === SK.filterGroup);
      if (vis) {
        v.copy(l.p).project(cam);
        const near = cam.position.distanceTo(l.p);
        // hide labels that are behind the camera, off screen, or would clutter a close view
        vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && near < l.z.d * 9 && (dist > 60 || near < 90) && !(l.z.id === 'claim' || l.z.id === 'customs');
        if (vis) { l.el.style.left = ((v.x + 1) / 2) * w + 'px'; l.el.style.top = ((1 - v.y) / 2) * h + 'px'; }
      }
      l.el.style.display = vis ? '' : 'none';
    });
  }

  // ---------- minimap ----------
  const mc = document.getElementById('miniCanvas'), mx = mc.getContext('2d');
  const W = mc.width, H = mc.height;
  const view = { x0: -300, x1: 300, z0: -262, z1: 175 };
  const toMap = (x, z) => [((x - view.x0) / (view.x1 - view.x0)) * W, ((z - view.z0) / (view.z1 - view.z0)) * H];
  const toWorld = (px, pz) => [view.x0 + (px / W) * (view.x1 - view.x0), view.z0 + (pz / H) * (view.z1 - view.z0)];
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  function drawBg() {
    const c = bg.getContext('2d');
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--panel-solid').trim() !== '#f7f9fb';
    c.fillStyle = dark ? '#1b2a20' : '#7f9b63'; c.fillRect(0, 0, W, H);
    const rect = (x0, x1, z0, z1, col) => { const [a, b] = toMap(x0, z0), [cc, d] = toMap(x1, z1); c.fillStyle = col; c.fillRect(a, b, cc - a, d - b); };
    rect(-200, 130, -140, -40, '#9aa1a8');
    rect(L.runway.x0, L.runway.x1, L.runway.z - 22, L.runway.z + 22, '#3a3f45');
    rect(L.runway.x0 + 20, L.runway.x1 - 20, L.taxiwayZ - 10, L.taxiwayZ + 10, '#8a9097');
    rect(-165, 165, 64, 90, '#4a4f55');
    rect(L.term.x0, L.term.x1, L.term.z0, L.term.z1, dark ? '#c9cdd2' : '#eceae4');
    SK.ZONES.forEach((z) => {
      const [x0, x1, z0, z1] = z.b;
      c.globalAlpha = z.pass > 1 ? 0.35 : 0.5;
      rect(x0, x1, z0, z1, GROUP_COLORS[z.group]);
      c.globalAlpha = 1;
    });
    c.fillStyle = '#ffffff'; c.font = 'bold 15px system-ui, sans-serif'; c.textAlign = 'center';
    [['Check-in', 0, 44], ['Security', -10, 16], ['Gates', 0, -33], ['Runway 27', 0, L.runway.z + 5], ['BHS', 121, 10], ['Garage', 0, 116], ['Rail', -130, 42]].forEach(([t, x, z]) => { const [a, b] = toMap(x, z); c.fillText(t, a, b); });
  }
  drawBg();
  SK.bus.on('settings', drawBg);
  O.drawMini = function () {
    mx.drawImage(bg, 0, 0);
    // passengers and staff
    for (const a of SK.agents.list) {
      if (a.hidden) continue;
      const [x, y] = toMap(a.x, a.z);
      mx.fillStyle = a.kind === 'pax' ? '#1f5fbf' : '#ff7a1a';
      mx.fillRect(x - 1, y - 1, 2.4, 2.4);
    }
    // aircraft
    for (const p of SK.aircraft.planes) {
      if (!p.grp.visible) continue;
      const [x, y] = toMap(p.x, p.z);
      mx.save(); mx.translate(x, y); mx.rotate(-p.heading + Math.PI);
      mx.fillStyle = '#ffffff'; mx.strokeStyle = '#132033'; mx.lineWidth = 1;
      mx.beginPath(); mx.moveTo(0, -7); mx.lineTo(5, 5); mx.lineTo(-5, 5); mx.closePath(); mx.fill(); mx.stroke();
      mx.restore();
    }
    // camera target + view direction
    const t = E.controls.target, cp = E.camera.position;
    const [tx, ty] = toMap(t.x, t.z), [cx, cy] = toMap(cp.x, cp.z);
    mx.strokeStyle = '#ffd34d'; mx.lineWidth = 2;
    mx.beginPath(); mx.arc(tx, ty, 7, 0, Math.PI * 2); mx.stroke();
    mx.beginPath(); mx.moveTo(tx, ty); mx.lineTo(tx + (cx - tx) * 0.25, ty + (cy - ty) * 0.25); mx.stroke();
  };
  mc.addEventListener('click', (e) => {
    const r = mc.getBoundingClientRect();
    const [x, z] = toWorld(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
    SK.cam.flyTo({ x, z }, { dist: 70 });
  });

  // ---------- heat map ----------
  const HX = 100, HZ = 48;
  const T = L.term;
  const data = new Uint8Array(HX * HZ * 4);
  const heatTex = new THREE.DataTexture(data, HX, HZ, THREE.RGBAFormat);
  heatTex.magFilter = THREE.LinearFilter; heatTex.minFilter = THREE.LinearFilter;
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(T.x1 - T.x0, T.z1 - T.z0), new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, depthWrite: false, toneMapped: false }));
  heat.rotation.x = -Math.PI / 2;
  heat.position.set((T.x0 + T.x1) / 2, 0.15, (T.z0 + T.z1) / 2);
  heat.renderOrder = 2;
  heat.visible = false;
  E.scene.add(heat);
  const grid = new Float32Array(HX * HZ);
  // viridis-like ramp (colour-blind safe), alpha rises with density
  const RAMP = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
  function ramp(t) {
    const f = SK.clamp(t, 0, 1) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(f)), u = f - i;
    return RAMP[i].map((c, k) => Math.round(c + (RAMP[i + 1][k] - c) * u));
  }
  O.updateHeat = function () {
    grid.fill(0);
    for (const a of SK.agents.list) {
      if (a.kind !== 'pax' || a.hidden) continue;
      const gx = Math.floor(((a.x - T.x0) / (T.x1 - T.x0)) * HX), gz = Math.floor(((a.z - T.z0) / (T.z1 - T.z0)) * HZ);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const x = gx + dx, z = gz + dz;
        if (x < 0 || z < 0 || x >= HX || z >= HZ) continue;
        grid[(HZ - 1 - z) * HX + x] += Math.exp(-(dx * dx + dz * dz) / 2.2);
      }
    }
    for (let i = 0; i < HX * HZ; i++) {
      const t = grid[i] / 3.2;
      const [r, g, b] = ramp(t);
      data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = grid[i] > 0.05 ? Math.round(80 + 150 * Math.min(1, t)) : 0;
    }
    heatTex.needsUpdate = true;
  };

  // ---------- flow lines ----------
  const flowGroup = new THREE.Group(); flowGroup.visible = false;
  E.scene.add(flowGroup);
  function arrowTex(color) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 128, 32);
    x.fillStyle = color;
    for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(i * 64 + 10, 4); x.lineTo(i * 64 + 40, 16); x.lineTo(i * 64 + 10, 28); x.lineTo(i * 64 + 22, 16); x.closePath(); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
  }
  const flows = [];
  function flow(points, color, y) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], y || 0.4, p[1])), false, 'centripetal');
    const len = curve.getLength();
    const tex = arrowTex(color); tex.repeat.set(len / 3, 1);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.ceil(len / 2), 0.45, 6, false), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    m.renderOrder = 3;
    flowGroup.add(m);
    flows.push(tex);
  }
  flow([[4, 62], [4, 52], [-20, 50], [-41, 47], [-41, 38], [-20, 42], [40, 44], [60, 38], [56, 31], [40, 28.7], [10, 26], [-20, 22], [-20, 12], [-20, 5], [-40, 2], [-40, -6], [-20, -10], [0, -11], [-22, -14], [0, -18], [22, -22], [0, -25], [0, -29], [-25, -33], [-16, -38]], '#3fa9ff');
  flow([[-41, 31], [24, 31]], '#ff9a3c', 1.2);
  flow([[102, 31], [112, 31], [112, 9], [115, 2], [121, -4], [121, -16], [121, -24], [96, -44], [-10, -44], [-20, -55]], '#ff9a3c', 1.2);
  flow([[-120, -150], [-120, -120], [-70, -120], [-70, -60]], '#7be08e', 1.5);
  flow([[-70, -60], [-70, -100], [-94, -120], [280, -120], [300, -150], [430, -150], [430, -190], [400, -222], [-200, -222]], '#ff6b74', 1.5);
  O.flowLegend = [['#3fa9ff', 'Passenger journey'], ['#ff9a3c', 'Bag journey'], ['#7be08e', 'Aircraft taxi-in'], ['#ff6b74', 'Aircraft departure']];

  O.applyLayers = function () {
    const l = SK.layers;
    heat.visible = l.heat;
    flowGroup.visible = l.flow;
    SK.terminal.roof.visible = l.roof;
    SK.landside.vehicles.forEach((v) => (v.g.visible = l.vehicles));
  };
  let tHeat = 0, tMini = 0;
  O.frame = function (dtGame, dtReal) {
    updateLabels();
    flows.forEach((t) => (t.offset.x -= dtReal * (SK.reducedMotion ? 0 : 0.8)));
    tMini -= dtReal;
    if (tMini <= 0) { tMini = 0.25; if (document.getElementById('mini').getClientRects().length) O.drawMini(); }
    if (SK.layers.heat) { tHeat -= dtReal; if (tHeat <= 0) { tHeat = 0.5; O.updateHeat(); } }
    if (!SK.layers.vehicles) SK.landside.vehicles.forEach((v) => (v.g.visible = false));
  };
  return O;
})();
