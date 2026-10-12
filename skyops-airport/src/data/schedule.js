// SkyOps departure schedule. Pure logic. Airlines are fictional; destinations are real airports.
SK.AIRLINES = [
  { code: 'SK', name: 'SkyOps Air', color: 0x1f5fbf, tail: 0xf2b134 },
  { code: 'NW', name: 'Northwind', color: 0x1d7a5f, tail: 0xe8eef2 },
  { code: 'AU', name: 'Aurora Pacific', color: 0x7b3fa0, tail: 0xff8a3d },
  { code: 'MR', name: 'Meridian', color: 0xb8322a, tail: 0xf4f1ea },
  { code: 'CB', name: 'Cobalt Atlantic', color: 0x163a6b, tail: 0x37c3d6 },
];

SK.DESTS = {
  narrow: [
    ['MEX', 'Mexico City'], ['YYZ', 'Toronto'], ['YVR', 'Vancouver'], ['CUN', 'Cancun'], ['PTY', 'Panama City'],
    ['BOG', 'Bogota'], ['GDL', 'Guadalajara'], ['YUL', 'Montreal'], ['SJO', 'San Jose CR'], ['NAS', 'Nassau'],
  ],
  wide: [
    ['LHR', 'London Heathrow'], ['NRT', 'Tokyo Narita'], ['DXB', 'Dubai'], ['FRA', 'Frankfurt'], ['SIN', 'Singapore'],
    ['CDG', 'Paris CDG'], ['ICN', 'Seoul Incheon'], ['SYD', 'Sydney'], ['AMS', 'Amsterdam'], ['DOH', 'Doha'],
  ],
};

SK.AIRCRAFT_TYPES = {
  narrow: { name: 'A321neo-class narrow-body', seats: 196, figures: 0, crew: { pilots: 2, cabin: 5 }, boardBefore: 40 },
  wide: { name: '787-9-class wide-body', seats: 296, figures: 0, crew: { pilots: 3, cabin: 10 }, boardBefore: 50 },
};

// Gate turn timing, in sim minutes relative to scheduled departure (STD)
SK.TURN = {
  inboundBlock: -80,     // inbound aircraft should be on stand by STD-80
  checkinClose: -60,
  bagCartLeaves: -28,
  gateClose: -15,
  spawnFrom: -205,       // first passengers reach the curb
  spawnTo: -100,
};

// Build departures for one gate list across a time window. Deterministic for a seed.
// Returns flights sorted by STD. Each flight: { id, airline, num, dest, city, gate, wide, std (sim s), loadFactor, pax, figures }
SK.buildSchedule = function (gates, fromSec, toSec, rng) {
  const out = [];
  let n = 0;
  gates.forEach((g, gi) => {
    const period = g.wide ? 135 : g.bus ? 120 : 100;   // minutes between departures on this gate
    let t = fromSec + SK.minutes(20 + gi * 23);
    while (t < toSec) {
      const al = SK.AIRLINES[(gi + n) % SK.AIRLINES.length];
      const kind = g.wide ? 'wide' : 'narrow';
      const d = SK.DESTS[kind][Math.floor(rng.next() * SK.DESTS[kind].length)];
      const lf = 0.74 + rng.next() * 0.2;
      const seats = SK.AIRCRAFT_TYPES[kind].seats;
      const pax = Math.round(seats * lf);
      out.push({
        id: 'F' + n, airline: al, num: al.code + ' ' + (100 + ((gi * 211 + n * 37) % 880)),
        dest: d[0], city: d[1], gate: g.id, wide: g.wide, bus: g.bus, std: t, etd: t,
        loadFactor: lf, pax, figures: Math.max(6, Math.round(pax / SK.PAX_PER_FIGURE)),
        status: 'Scheduled', delayMin: 0, boarded: 0, spawned: 0, bagsAccepted: 0, bagsLoaded: 0, bagsShort: 0,
      });
      n++;
      t += SK.minutes(period + Math.round(rng.range(-6, 10)));
    }
  });
  out.sort((a, b) => a.std - b.std);
  return out;
};

// Departure board status from the current sim time and flight state
SK.flightStatus = function (f, now) {
  const m = (f.etd - now) / 60;
  if (f.departed) return 'Departed';
  if (f.offBlock) return 'Taxiing';
  if (f.gateClosed) return 'Gate closed';
  if (f.boarding) return m <= 25 ? 'Final call' : 'Boarding';
  if (f.delayMin >= 15) return 'Delayed';
  if (m <= -SK.TURN.checkinClose && m > -SK.TURN.gateClose) return 'Go to gate';
  if (m <= -SK.TURN.spawnFrom) return 'Check-in open';
  return 'Scheduled';
};
