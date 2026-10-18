// SkyOps kit: shared materials, geometry helpers, static batching, canvas text textures.
SK.kit = (function () {
  const K = {};
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0.05 }, o || {}));
  K.mat = {
    asphalt: std(0x3a3f45, { roughness: 0.95 }),
    apron: std(0x8d949b, { roughness: 0.92 }),
    runway: std(0x2f3337, { roughness: 0.95 }),
    grass: std(0x6f8f4e, { roughness: 1, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 }),
    concrete: std(0xb3afa7),
    sidewalk: std(0xb9b6ae),
    floor: std(0xcfcac0, { roughness: 0.6 }),
    floorAir: std(0xc4bdb0, { roughness: 0.55 }),
    carpet: std(0x4d5a72, { roughness: 1 }),
    carpetRed: std(0x7a3b3b, { roughness: 1 }),
    wood: std(0xa57a4e, { roughness: 0.7 }),
    wall: std(0xdedad2),
    wallDark: std(0x59616b),
    steel: std(0xb8bfc6, { metalness: 0.6, roughness: 0.35 }),
    darkSteel: std(0x4a5058, { metalness: 0.5, roughness: 0.45 }),
    black: std(0x1d2126, { roughness: 0.6 }),
    rubber: std(0x22262b, { roughness: 0.9 }),
    desk: std(0x2c3e57, { roughness: 0.5 }),
    deskTop: std(0xe8e3d9, { roughness: 0.4 }),
    priority: std(0x8a6a2f, { roughness: 0.45 }),
    kiosk: std(0xd9dee3, { roughness: 0.35 }),
    screen: std(0x111820, { emissive: 0x3aa0ff, emissiveIntensity: 0.55 }),
    screenWarm: std(0x111820, { emissive: 0xffb050, emissiveIntensity: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xa9d4ea, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    glassDark: new THREE.MeshPhysicalMaterial({ color: 0x395b72, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2, depthWrite: false }),
    roof: std(0xdfe4e8, { transparent: true, opacity: 0.92, roughness: 0.6 }),
    white: std(0xe2e2de),
    marking: new THREE.MeshBasicMaterial({ color: 0xf2f2ee }),
    yellowMark: new THREE.MeshBasicMaterial({ color: 0xf1c232 }),
    redMark: new THREE.MeshBasicMaterial({ color: 0xc8382f }),
    blueMark: new THREE.MeshBasicMaterial({ color: 0x2b6cc4 }),
    rope: std(0x1f4fa8, { roughness: 0.6 }),
    yellow: std(0xf1c232, { roughness: 0.5 }),
    orange: std(0xe8742a, { roughness: 0.5 }),
    red: std(0xc8382f, { roughness: 0.5 }),
    green: std(0x2f8f5b, { roughness: 0.6 }),
    plant: std(0x3f7d43, { roughness: 1 }),
    belt: std(0x2a2e33, { roughness: 0.85 }),
    beltFrame: std(0x8e979f, { metalness: 0.5, roughness: 0.4 }),
    lightStrip: new THREE.MeshStandardMaterial({ color: 0x8d969f, emissive: 0xfff4dd, emissiveIntensity: 0.0, roughness: 0.6 }),
    shelf: std(0xd8d0c2, { roughness: 0.6 }),
    goods: std(0xb04a5a, { roughness: 0.5 }),
    goods2: std(0x3d6fb3, { roughness: 0.5 }),
    goods3: std(0xd7a64a, { roughness: 0.5 }),
    seat: std(0x37475e, { roughness: 0.7 }),
    seatLounge: std(0x6d5546, { roughness: 0.8 }),
    rail: std(0x6d6a66, { metalness: 0.6, roughness: 0.4 }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
  };

  // ---------- geometry helpers ----------
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  K.matrix = function (x, y, z, ry, sx, sy, sz, rx, rz) {
    tmpE.set(rx || 0, ry || 0, rz || 0);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(x, y, z);
    tmpS.set(sx || 1, sy || 1, sz || 1);
    return tmpM.clone().compose(tmpP, tmpQ, tmpS);
  };
  K.box = function (w, h, d, mat, x, y, z, parent, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    if (o && o.ry) m.rotation.y = o.ry;
    m.castShadow = !(o && o.noShadow);
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };
  K.cyl = function (rt, rb, h, mat, x, y, z, parent, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };
  K.ground = function (w, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };
  // invisible pick volume
  K.hit = function (w, h, d, x, y, z, parent, entry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), K.mat.hit);
    m.position.set(x, y + h / 2, z);
    if (parent) parent.add(m);
    if (entry) SK.engine.pick.add(m, entry);
    return m;
  };

  // ---------- static batching: one mesh per material ----------
  K.Batch = class {
    constructor() { this.parts = new Map(); }
    add(geo, mat, matrix) {
      const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(matrix);
      if (!this.parts.has(mat)) this.parts.set(mat, []);
      this.parts.get(mat).push(g);
      return this;
    }
    box(w, h, d, mat, x, y, z, ry) { return this.add(K.geo.box(w, h, d), mat, K.matrix(x, y + h / 2, z, ry || 0)); }
    cyl(r, h, mat, x, y, z, seg) { return this.add(K.geo.cyl(r, h, seg || 12), mat, K.matrix(x, y + h / 2, z)); }
    build(parent, o) {
      o = o || {};
      const out = [];
      this.parts.forEach((list, mat) => {
        const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(list, false);
        list.forEach((g) => g.dispose());
        const m = new THREE.Mesh(merged, mat);
        m.castShadow = o.castShadow !== false && !mat.transparent;
        m.receiveShadow = o.receiveShadow !== false;
        parent.add(m);
        out.push(m);
      });
      this.parts.clear();
      return out;
    }
  };
  // shared unit geometries (cloned by Batch.add)
  const geoCache = {};
  K.geo = {
    box(w, h, d) { const k = 'b' + w + ',' + h + ',' + d; return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(w, h, d)); },
    cyl(r, h, seg) { const k = 'c' + r + ',' + h + ',' + seg; return geoCache[k] || (geoCache[k] = new THREE.CylinderGeometry(r, r, h, seg)); },
  };

  // ---------- canvas text ----------
  K.textTexture = function (lines, o) {
    o = Object.assign({ w: 512, h: 128, bg: '#1b2a3a', fg: '#ffffff', font: 'bold 64px system-ui, sans-serif', align: 'center', pad: 24, accent: null }, o || {});
    const c = document.createElement('canvas');
    c.width = o.w; c.height = o.h;
    const x = c.getContext('2d');
    x.fillStyle = o.bg; x.fillRect(0, 0, o.w, o.h);
    if (o.accent) { x.fillStyle = o.accent; x.fillRect(0, 0, 14, o.h); }
    x.fillStyle = o.fg; x.font = o.font; x.textBaseline = 'middle'; x.textAlign = o.align;
    const arr = Array.isArray(lines) ? lines : [lines];
    const lh = o.h / arr.length;
    arr.forEach((t, i) => x.fillText(t, o.align === 'center' ? o.w / 2 : o.pad, lh * (i + 0.5)));
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  };
  K.sign = function (lines, w, h, o) {
    const tex = K.textTexture(lines, Object.assign({ w: Math.round(256 * w / h) * 2, h: 256 }, o || {}));
    // front and back faces share the texture so the text reads correctly from either side (never mirrored)
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, toneMapped: false });
    const geo = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(geo, mat);
    const back = new THREE.Mesh(geo, mat);
    back.rotation.y = Math.PI;
    m.add(back);
    return m;
  };
  // soft round sprite for particles (smoke, steam, spray, snow)
  K.puff = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  // flat painted marking on the ground (text)
  K.paint = function (text, w, h, color, parent, x, z, ry) {
    const tex = K.textTexture(text, { w: 512, h: Math.round(512 * h / w), bg: 'rgba(0,0,0,0)', fg: color || '#f2f2ee', font: 'bold ' + Math.round(380 * h / w) + 'px system-ui, sans-serif' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = ry || 0;
    m.position.set(x, 0.06, z);
    parent.add(m);
    return m;
  };
  return K;
})();
