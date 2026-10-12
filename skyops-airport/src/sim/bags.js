// SkyOps baggage handling: hall belts, CT screening, sortation, make-up carousel, carts to the aircraft.
// Each bag object stands for the bags of one passenger figure. Every step is logged as a tracking event.
SK.bags = (function () {
  const K = SK.kit, M = K.mat, L = SK.L, E = SK.engine, H = L.bhs;
  const BG = { list: [], carts: [], stats: { inducted: 0, screened: 0, alarms: 0, loaded: 0, short: 0 } };
  const root = new THREE.Group(); root.name = 'bhs';
  E.scene.add(root);
  const B = new K.Batch();
  const now = () => SK.sim.now;
  let serial = 120000;

  // ---------- baggage hall geometry ----------
  const w = H.x1 - H.x0, d = H.z1 - H.z0, cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2;
  K.ground(w, d, M.concrete, cx, 0.03, cz, root);
  [[H.x0, H.z0, H.x1, H.z0], [H.x1, H.z0, H.x1, H.z1], [H.x0, H.z1, H.x1, H.z1]].forEach(([x0, z0, x1, z1]) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    B.add(K.geo.box(len, 4, 0.3), M.wall, K.matrix((x0 + x1) / 2, 2, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0)));
  });
  B.box(0.3, 4, d - 8, M.wall, H.x0, 0, cz - 4);
  // conveyor polyline from the hall wall to the carousel
  const PATH = [[H.x0, 30.9], [H.ctX, 30.9], [H.ctX, 17], [H.ctX, 9], [H.carouselX - H.carouselR, H.carouselZ]];
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x0, z0] = PATH[i], [x1, z1] = PATH[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0);
    B.add(K.geo.box(len + 0.9, 0.6, 0.9), M.beltFrame, K.matrix((x0 + x1) / 2, 0.3, (z0 + z1) / 2, ang));
    B.add(K.geo.box(len + 0.9, 0.05, 0.75), M.belt, K.matrix((x0 + x1) / 2, 0.62, (z0 + z1) / 2, ang));
  }
  // CT scanner
  B.box(2.6, 2.2, 4, M.white, H.ctX, 0, H.ctZ);
  B.box(2.65, 0.4, 4.05, M.blueMark, H.ctX, 2.2, H.ctZ);
  B.box(0.6, 1.1, 0.6, M.desk, H.ctX + 3, 0, H.ctZ + 2);
  B.box(0.5, 0.35, 0.05, M.screen, H.ctX + 3, 1.15, H.ctZ + 1.7);
  // inspection (level 3) table and side belt
  B.box(H.inspect.x - H.ctX - 1, 0.6, 0.8, M.beltFrame, (H.inspect.x + H.ctX) / 2, 0, H.ctZ - 3);
  B.box(3, 0.9, 1.4, M.steel, H.inspect.x, 0, H.inspect.z);
  // carousel ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(H.carouselR, 0.55, 6, 48), M.belt);
  ring.rotation.x = Math.PI / 2; ring.position.set(H.carouselX, 0.6, H.carouselZ); ring.scale.set(1.25, 1, 1);
  ring.receiveShadow = true;
  root.add(ring);
  B.cyl(H.carouselR * 0.8, 0.5, M.beltFrame, H.carouselX, 0, H.carouselZ, 32);
  // cart slots and exit door
  K.paint('MAKE-UP', 10, 2, '#f1c232', root, H.carouselX, -6.5);
  const slotsX = [107, 112, 117, 122, 127, 132];
  slotsX.forEach((x) => B.box(3.2, 0.02, 7, M.yellowMark, x, 0.025, H.cartZ - 2.5));
  const sign = K.sign(['BAGGAGE HALL', 'Screening · Sortation · Make-up'], 12, 1.8, { bg: '#2f3a48', font: 'bold 64px system-ui, sans-serif', accent: '#ff8a2a' });
  sign.position.set(cx, 5.4, H.z1 + 0.2); root.add(sign);
  K.hit(w, 4, d, cx, 0, cz, root, 'bhs');
  B.build(root);

  // BHS staff
  SK.agents.post('r_bhs', H.ctX + 3, H.ctZ + 1.1, 0, null, 'work');
  SK.agents.post('r_bhs', H.inspect.x, H.inspect.z - 1.2, 0, () => BG.list.some((b) => b.state === 'inspect'), 'work');
  SK.agents.post('r_bhs', H.carouselX - 3, H.carouselZ - H.carouselR - 1.6, 0, null, 'work');
  SK.agents.post('r_bhs', H.carouselX + 4, H.carouselZ - H.carouselR - 1.6, 0, null, 'work');

  // ---------- bags (instanced) ----------
  const MAXB = 1500;
  const bagMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.36, 0.42), new THREE.MeshStandardMaterial({ roughness: 0.6 }), MAXB);
  bagMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bagMesh.setColorAt(0, new THREE.Color());
  bagMesh.count = 0; bagMesh.castShadow = true; bagMesh.frustumCulled = false;
  root.add(bagMesh);
  const bagMap = [];
  E.pick.add(bagMesh, (hit) => { const b = bagMap[hit.instanceId]; return b ? { entry: 'bhs', bag: b } : null; });
  const COLORS = [0x1e1e1e, 0x2f4f7f, 0x7f2f2f, 0x5f5f5f, 0x2f6f5f, 0xc7a64a, 0x6b3f8f, 0xd9d4c7];

  const ev = (b, text) => { b.log.push({ t: now(), text }); };
  BG.induct = function (pax, x, f) {
    const tag = '0' + String(100 + (f.airline.code.charCodeAt(0) * 7 + f.airline.code.charCodeAt(1)) % 900) + String(serial++).padStart(6, '0');
    const b = { id: serial, tag, f, pax, x: x, z: L.checkin.beltZ, y: 0.82, state: 'belt', color: SK.rng.pick(COLORS), log: [], t: 0 };
    pax.tags.push(tag);
    ev(b, 'Accepted at check-in for ' + f.num + ' (IATA 753 tracking point: acceptance)');
    BG.list.push(b);
    BG.stats.inducted++;
    f.bagsAccepted++;
    return b;
  };

  // ---------- carts ----------
  function makeCart() {
    const g = new THREE.Group();
    const tug = new THREE.Group();
    K.box(1.6, 1.0, 2.4, M.yellow, 0, 0.3, 0, tug);
    K.box(1.4, 0.9, 0.9, M.glassDark, 0, 1.3, -0.5, tug);
    tug.position.z = 2.8;
    g.add(tug);
    const piles = [];
    [-0.3, -3.6].forEach((z) => {
      K.box(1.8, 0.2, 2.8, M.darkSteel, 0, 0.45, z, g);
      const pile = K.box(1.6, 1, 2.4, new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8 }), 0, 0.65, z, g);
      pile.scale.y = 0.01;
      piles.push(pile);
    });
    root.add(g);
    E.pick.add(g, 'bagcart');
    return { g, piles };
  }
  function cartFor(f) {
    let c = BG.carts.find((k) => k.f === f);
    if (c) return c;
    const used = BG.carts.map((k) => k.slot);
    const slot = slotsX.findIndex((_, i) => !used.includes(i));
    if (slot < 0) return null;
    const m = makeCart();
    c = Object.assign(m, { f, slot, x: slotsX[slot], z: H.cartZ - 2.5, heading: 0, state: 'makeup', bags: 0, path: null, s: 0 });
    c.g.position.set(c.x, 0, c.z);
    BG.carts.push(c);
    return c;
  }
  function cartPath(c, target) {
    const pts = [[c.x, c.z], [H.carouselX, -16], [H.carouselX, -24], [96, -44], [target.x + 6, -44], [target.x + 2, target.z + 3], [target.x, target.z]];
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
    return { c: curve, len: curve.getLength() };
  }

  // belt loader at the aircraft
  const loaders = {};
  function loaderFor(p) {
    if (loaders[p.f.id]) return loaders[p.f.id];
    const g = new THREE.Group();
    K.box(1.8, 0.8, 4, M.yellow, 0, 0.3, 0, g);
    const belt = K.box(0.9, 0.12, 7, M.belt, 0, 1.1, 2.6, g);
    belt.rotation.x = -0.42; belt.position.y = 2.2;
    root.add(g);
    E.pick.add(g, 'bagcart');
    return (loaders[p.f.id] = g);
  }

  // ---------- update ----------
  const SPEED = 1.6;                 // belt speed, m/s game time
  const mx = new THREE.Matrix4(), col = new THREE.Color();
  BG.update = function (dt) {
    for (let i = BG.list.length - 1; i >= 0; i--) {
      const b = BG.list[i];
      b.t += dt;
      switch (b.state) {
        case 'belt': {
          // hall collector belt: priority section dives at its east end; main dives at the security entrance;
          // the special-assistance section runs straight through the wall into the hall
          const pEnd = L.groups.priority.x1 + 0.6;
          const dive = b.x < pEnd ? pEnd : b.x < L.beltDropX + 0.5 ? L.beltDropX : null;
          b.x += SPEED * dt;
          if (dive != null && b.x >= dive + 0.6) { b.state = 'tunnel'; b.t = 0; b.hidden = true; ev(b, 'Below floor to the baggage hall'); }
          if (dive == null && b.x >= H.x0) { b.state = 'annex'; b.seg = 0; b.x = H.x0; b.z = PATH[0][1]; }
          break;
        }
        case 'tunnel':
          if (b.t > 14) { b.hidden = false; b.state = 'annex'; b.seg = 0; b.x = H.x0; b.z = PATH[0][1]; }
          break;
        case 'annex': {
          const [tx, tz] = PATH[b.seg + 1];
          const dx = tx - b.x, dz = tz - b.z, dd = Math.hypot(dx, dz), st = SPEED * dt;
          if (dd <= st) { b.x = tx; b.z = tz; b.seg++; } else { b.x += (dx / dd) * st; b.z += (dz / dd) * st; }
          if (b.seg === 1 && b.z < H.ctZ + 0.1 && !b.screened) { b.state = 'ct'; b.t = 0; }
          if (b.seg >= PATH.length - 1) { b.state = 'carousel'; b.ang = Math.PI; b.t = 0; ev(b, 'Sorted to make-up for ' + b.f.num); }
          break;
        }
        case 'ct':
          if (b.t > 0.9) {
            b.screened = true; BG.stats.screened++;
            if (SK.rng.chance(SK.ops ? SK.ops.bagAlarmRate() : 0.05)) {
              BG.stats.alarms++;
              b.state = 'inspect'; b.t = 0; b.x = H.inspect.x - 0.6; b.z = H.inspect.z;
              ev(b, 'CT level 1 alarm; image not cleared by operator; opened at level 3 inspection');
            } else { b.state = 'annex'; ev(b, 'CT scan cleared (level 1)'); }
          }
          break;
        case 'inspect':
          if (b.t > 9) { b.state = 'annex'; b.x = H.ctX; b.z = H.ctZ - 3; ev(b, 'Inspection cleared, re-inserted'); }
          break;
        case 'carousel': {
          b.ang += dt * 0.35;
          b.x = H.carouselX + Math.cos(b.ang) * H.carouselR * 1.25;
          b.z = H.carouselZ + Math.sin(b.ang) * H.carouselR;
          const c = BG.carts.find((k) => k.f === b.f) || cartFor(b.f);
          if (c && c.state !== 'makeup') {
            // the cart has already left: short-shipped bag, rushed on a later flight
            b.state = 'gone'; BG.stats.short++; b.f.bagsShort++;
            ev(b, 'Missed its cart: short-shipped (mishandled), rushed on next flight');
            SK.bus.emit('ops', { t: now(), kind: 'warn', msg: 'Bag ' + b.tag + ' missed the ' + b.f.num + ' cart: mishandled' });
          } else if (c && b.t > 3 && Math.sin(b.ang) < -0.85) {
            b.state = 'cart'; b.cart = c; c.bags++;
            ev(b, 'Loaded onto make-up cart ' + (c.slot + 1));
          }
          break;
        }
        case 'cart':
          b.hidden = true;
          break;
      }
      if (b.state === 'gone') { BG.list.splice(i, 1); if (BG.followed === b) SK.cam.stopFollow(); }
    }

    // carts: leave at STD-28 if the aircraft is on stand, unload at the hold, return
    for (let i = BG.carts.length - 1; i >= 0; i--) {
      const c = BG.carts[i], f = c.f;
      c.piles.forEach((p, k) => (p.scale.y = SK.clamp((c.bags - k * 8) / 8, 0.01, 1)));
      if (c.state === 'makeup' && SK.sim.now >= f.std + SK.minutes(SK.TURN.bagCartLeaves) && f.plane && f.plane.state === 'parked') {
        const hold = f.bus ? { x: L.remote.x + 4, z: L.remote.z - 8 } : SK.aircraft.holdPos(f.plane);
        c.state = 'out'; c.path = cartPath(c, hold); c.s = 0;
        SK.bus.emit('ops', { t: now(), kind: 'info', msg: f.num + ' bag cart left make-up with ' + c.bags * SK.PAX_PER_FIGURE + ' bags' });
      }
      if (c.state === 'out' || c.state === 'back') {
        c.s = Math.min(c.path.len, c.s + 7 * dt);
        const u = c.s / c.path.len;
        const pt = c.path.c.getPointAt(c.state === 'out' ? u : 1 - u), tg = c.path.c.getTangentAt(c.state === 'out' ? u : 1 - u);
        c.g.position.set(pt.x, 0, pt.z);
        c.g.rotation.y = Math.atan2(tg.x, tg.z) + (c.state === 'back' ? Math.PI : 0);
        if (c.s >= c.path.len) {
          if (c.state === 'out') { c.state = 'unload'; c.t = 0; }
          else { root.remove(c.g); E.pick.remove(c.g); BG.carts.splice(i, 1); continue; }
        }
      }
      if (c.state === 'unload') {
        c.t += dt;
        if (c.t > 7) {
          BG.list.filter((b) => b.cart === c).forEach((b) => { ev(b, 'Loaded into the hold of ' + f.num + ' (tracking point: loading)'); b.state = 'gone'; });
          f.bagsLoaded += c.bags; BG.stats.loaded += c.bags; c.bags = 0;
          f.bagsDone = true;
          c.state = 'back'; c.s = 0;
        }
      }
    }
    // loaders appear beside parked aircraft
    Object.keys(loaders).forEach((id) => { const fl = loaders[id]; fl.visible = false; });
    SK.aircraft.planes.forEach((p) => {
      if (p.state !== 'parked' || p.g.bus) return;
      const l = loaderFor(p), h = SK.aircraft.holdPos(p);
      l.visible = true;
      l.position.set(h.x, 0, h.z);
      l.rotation.y = p.heading + Math.PI / 2;
    });

    // instanced draw
    let n = 0;
    const lay = SK.layers || {};
    if (lay.bags !== false) {
      for (const b of BG.list) {
        if (b.hidden || n >= MAXB) continue;
        mx.makeRotationY(b.ang ? -b.ang : 0);
        mx.setPosition(b.x, b.state === 'inspect' ? 1.1 : 0.85, b.z);
        bagMesh.setMatrixAt(n, mx);
        col.setHex(b === BG.followed ? 0xffd34d : b.color);
        bagMesh.setColorAt(n, col);
        bagMap[n] = b;
        n++;
      }
    }
    bagMesh.count = n;
    bagMesh.instanceMatrix.needsUpdate = true;
    if (bagMesh.instanceColor) bagMesh.instanceColor.needsUpdate = true;
  };
  BG.root = root;
  return BG;
})();
