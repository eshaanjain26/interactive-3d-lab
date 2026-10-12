// SkyOps queues and stations. Pure logic: no DOM, no Three.js. Times are sim seconds.

// Serpentine (snake) queue inside a rectangle. Slot 0 is the head.
// headX: 'x0' | 'x1' side where the head row starts; headZ: 'z0' | 'z1' row nearest the servers.
SK.serpentine = function (rect, opts) {
  opts = opts || {};
  const sp = opts.spacing || 0.85, gap = opts.rowGap || 1.3;
  const headZ = opts.headZ || 'z0', headX = opts.headX || 'x0';
  const zDir = headZ === 'z0' ? 1 : -1;
  const zStart = rect[headZ] + zDir * gap * 0.5;
  const rows = Math.max(1, Math.floor(Math.abs(rect.z1 - rect.z0) / gap));
  const xa = rect.x0 + 0.6, xb = rect.x1 - 0.6;
  const perRow = Math.max(1, Math.floor((xb - xa) / sp) + 1);
  const slots = [], ropes = [], posts = [];
  for (let r = 0; r < rows; r++) {
    const z = zStart + zDir * r * gap;
    const forward = (r % 2 === 0) === (headX === 'x0');
    for (let i = 0; i < perRow; i++) {
      const x = forward ? xa + i * sp : xb - i * sp;
      slots.push({ x, z });
    }
    if (r < rows - 1) {
      // rope between this row and the next, open at the turning end
      const rz = z + zDir * gap * 0.5;
      const turnAtB = forward;
      const r0 = turnAtB ? rect.x0 : rect.x0 + 1.6, r1 = turnAtB ? rect.x1 - 1.6 : rect.x1;
      ropes.push([r0, rz, r1, rz]);
    }
  }
  // posts along each rope at ~2.4 m
  ropes.forEach((r) => {
    const n = Math.max(1, Math.round((r[2] - r[0]) / 2.4));
    for (let i = 0; i <= n; i++) posts.push([r[0] + ((r[2] - r[0]) * i) / n, r[1]]);
  });
  return { slots, ropes, posts };
};

SK.Queue = class {
  constructor(slots, overflow) {
    this.slots = slots;
    this.overflow = overflow || { dx: 0, dz: 0.8 };
    this.list = [];
    this.onShift = null;    // (agent, pos) => void
  }
  get length() { return this.list.length; }
  slotFor(i) {
    if (i < this.slots.length) return this.slots[i];
    const tail = this.slots[this.slots.length - 1];
    const k = i - this.slots.length + 1;
    // overflow spills out of the tail in a short zig so figures don't stack on one point
    return { x: tail.x + this.overflow.dx * k + (k % 2 ? 0.35 : -0.35), z: tail.z + this.overflow.dz * k };
  }
  join(agent) {
    this.list.push(agent);
    agent.queueIdx = this.list.length - 1;
    return this.slotFor(agent.queueIdx);
  }
  head() { return this.list[0] || null; }
  remove(agent) {
    const i = this.list.indexOf(agent);
    if (i < 0) return false;
    this.list.splice(i, 1);
    agent.queueIdx = -1;
    for (let k = i; k < this.list.length; k++) {
      this.list[k].queueIdx = k;
      if (this.onShift) this.onShift(this.list[k], this.slotFor(k));
    }
    return true;
  }
};

// A station has a queue and servers. Each server is a pipeline of one or more stages
// (a check-in desk is one stage; a security lane is divest -> scan -> recompose).
// An agent advances to the next stage only when that stage is empty, so the slowest
// stage sets the lane's throughput, as on a real checkpoint.
SK.Station = class {
  constructor(o) {
    this.name = o.name;
    this.queue = o.queue;
    this.service = o.service;            // (agent, stageIdx, server) => sim seconds
    this.onMove = o.onMove || null;      // (agent, pos, stageIdx, server) => void
    this.onDone = o.onDone || null;      // (agent, server) => void
    this.onStage = o.onStage || null;    // (agent, stageIdx, server) => void  (service starts)
    this.accept = o.accept || null;      // optional (agent, server) => bool  (e.g. e-gate eligibility)
    this.meanCycle = o.meanCycle || 120; // sim seconds per agent at the bottleneck stage, for predictions
    this.servers = o.servers.map((s, i) => ({
      id: i, label: s.label || String(i + 1), open: s.open !== false, x: s.x, z: s.z,
      stages: (s.stages || [{ x: s.x, z: s.z }]).map((p) => ({ x: p.x, z: p.z, virtual: !!p.virtual, agent: null, until: 0 })),
      served: 0, busySince: 0,
    }));
    this.served = 0;
    this.waits = [];                     // { t, w } sim seconds
  }
  openCount() { return this.servers.filter((s) => s.open).length; }
  setOpen(n) {
    this.servers.forEach((s, i) => (s.open = i < n));
  }
  idle(server) { return server.stages.every((st) => !st.agent); }
  update(now) {
    for (const s of this.servers) {
      const st = s.stages;
      for (let k = st.length - 1; k >= 0; k--) {
        const g = st[k];
        if (!g.agent) continue;
        // virtual stages (lane loading places) start their timer on assignment, not on arrival,
        // so several passengers can be walking toward one lane at once
        if (g.until === 0 && (g.agent.arrived || g.virtual)) {
          g.until = now + Math.max(1, this.service(g.agent, k, s));
          if (this.onStage) this.onStage(g.agent, k, s);
        }
        if (g.until > 0 && now >= g.until) {
          if (k === st.length - 1) {
            const a = g.agent;
            g.agent = null; g.until = 0;
            s.served++; this.served++;
            a.server = null;
            if (this.onDone) this.onDone(a, s);
          } else if (!st[k + 1].agent) {
            const a = g.agent;
            g.agent = null; g.until = 0;
            st[k + 1].agent = a; st[k + 1].until = 0;
            a.arrived = false;
            if (this.onMove) this.onMove(a, st[k + 1], k + 1, s);
          }
        }
      }
      // pull the next agent from the queue head when the first stage is free
      if (s.open && !st[0].agent) {
        const h = this.queue.head();
        if (h && h.arrived && (!this.accept || this.accept(h, s))) {
          this.queue.remove(h);
          this.waits.push({ t: now, w: now - (h.qJoin || now) });
          if (this.waits.length > 400) this.waits.splice(0, 100);
          st[0].agent = h; st[0].until = 0;
          h.server = s;
          h.arrived = false;
          if (this.onMove) this.onMove(h, st[0], 0, s);
        }
      }
    }
  }
  // Observed mean wait over a trailing window, in sim seconds
  observedWait(now, windowSec) {
    const from = now - (windowSec || 1800);
    let n = 0, sum = 0;
    for (const w of this.waits) if (w.t >= from) { n++; sum += w.w; }
    return n ? sum / n : 0;
  }
  // What an airport wait-time screen would show: queue length times bottleneck cycle over open servers
  predictedWait() {
    const open = this.openCount();
    if (!open) return this.queue.length ? Infinity : 0;
    return (this.queue.length * this.meanCycle) / open;
  }
};
