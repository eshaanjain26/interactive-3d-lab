// SkyOps core: namespace, seeded RNG, maths helpers, event bus.
var SK = (typeof window !== 'undefined' ? window : globalThis).SK = (typeof SK !== 'undefined' && SK) || {};

SK.TIME_SCALE = 10;      // sim seconds per game second
SK.PAX_PER_FIGURE = 4;   // each passenger figure stands for this many passengers

SK.rng = (function () {
  let s = 0x5eed1234;
  function next() {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    seed(v) { s = v | 0; },
    next,
    range(a, b) { return a + (b - a) * next(); },
    int(a, b) { return Math.floor(a + (b - a + 1) * next()); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    chance(p) { return next() < p; },
    // Box-Muller, clamped to +-3 sigma so service times never go negative
    normal(mean, sd) {
      const u = Math.max(1e-9, next()), v = next();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + sd * Math.max(-3, Math.min(3, z));
    },
  };
})();

SK.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
SK.lerp = (a, b, t) => a + (b - a) * t;
SK.ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
SK.dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);

// Sim clock helpers. Sim time is seconds since midnight of day 0.
SK.fmtTime = function (simSec) {
  const m = Math.floor(simSec / 60) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
SK.minutes = (n) => n * 60;

SK.bus = (function () {
  const subs = {};
  return {
    on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); },
    emit(ev, data) { (subs[ev] || []).forEach((fn) => fn(data)); },
  };
})();
