// SkyOps layout: every coordinate in the airport, plus the pedestrian nav graph.
// Units are metres. +x east, +z landside (south), -z airside (north). Floor is y = 0.
SK.L = (function () {
  const L = {};

  L.term = { x0: -100, x1: 100, z0: -40, z1: 56, h: 14 };
  L.doors = [-84, -40, 4, 48, 86];               // facade doors at z = 56
  L.westDoor = { x: -100, z: 44 };               // from the rail walkway

  // Landside
  L.curb = { z0: 58, z1: 64 };
  L.road = { x0: -165, x1: 165, laneZ: [67.5, 71.5], returnZ: 84 };
  L.bays = {
    taxi: { x0: -96, x1: -64 },
    car: { x0: -56, x1: 52 },
    bus: { x0: 60, x1: 96 },
  };
  L.garage = { x0: -60, x1: 60, z0: 94, z1: 134, decks: 4 };
  L.crosswalkX = 0;
  L.rail = { trackX: -140, x0: -136, x1: -120, z0: 8, z1: 76, stopZ: 42 };

  // Check-in hall
  L.checkin = { z0: 30, z1: 54, counterZ: 34, agentZ: 32.2, beltZ: 30.9 };
  L.groups = {
    priority: { x0: -96, x1: -76, n: 4, entry: { x: -86, z: 49 } },
    economy: { x0: -68, x1: -14, n: 10, entry: { x: -41, z: 51 } },
    bagdrop: { x0: -6, x1: 22, n: 6, entry: { x: 8, z: 51 } },
    special: { x0: 82, x1: 96, n: 2, entry: { x: 89, z: 49 } },
  };
  L.kiosks = { x0: 30, x1: 50, rows: [43, 47.5], perRow: 6, entry: { x: 40, z: 51.5 } };
  L.beltDropX = 24;            // hall belt dives below the floor here (security entrance above it)

  // Security
  L.secWallZ = 29;
  L.secEntrance = { x0: 28, x1: 78 };
  L.ftEntrance = { x0: -75, x1: -69 };
  L.podiums = [36, 46, 56, 66];      // main doc check at z = 27.5
  L.ftPodium = -72;
  L.docQueue = { x0: 30, x1: 76, z0: 29.6, z1: 36 };       // landside, in front of the podiums
  L.ftDocQueue = { x0: -75.5, x1: -68.5, z0: 29.6, z1: 37 };
  // main queue sits directly in front of the lanes so the walk from its head to any lane stays short
  L.secQueue = { x0: -36, x1: 30, z0: 21.6, z1: 28.2 };
  L.ftQueue = { x0: -78, x1: -64, z0: 21, z1: 26.5 };
  L.lanes = [-58, -42, -31, -20, -9, 2];   // lane centre x; lane 0 is fast track
  L.lane = { entryZ: 19, divestZ: 16.5, xrayZ0: 14.5, xrayZ1: 11, scanZ: 12.6, scanDx: 1.7, recompZ: 8, exitZ: 5 };
  L.search = { x0: 36, x1: 74, z0: 5, z1: 15 };
  L.patdown = { x: 40, z: 10 };

  // Passport control
  L.passport = {
    manual: { x0: -66, x1: -18, n: 6, boothZ: -5.5, queue: { x0: -64, x1: -20, z0: -1.5, z1: 3 } },
    egate: { x0: 12, x1: 58, n: 8, gateZ: -5.5, queue: { x0: 14, x1: 56, z0: -1.5, z1: 3 } },
    exitZ: -9.5,
  };

  // Airside
  L.dutyfree = { x0: -40, x1: 40, z0: -24, z1: -11, inX: 0, inZ: -10.5, outX: 0, outZ: -24.5 };
  L.food = { x0: -98, x1: -48, z0: -24, z1: -12 };
  L.lounge = { x0: 48, x1: 98, z0: -24, z1: -12, desk: { x: 54, z: -19 } };
  L.rooms = {
    prayer: { x0: -98, x1: -88, z0: -10, z1: 1 },
    nursing: { x0: -86, x1: -77, z0: -10, z1: 1 },
    smoking: { x0: 88, x1: 98, z0: -10, z1: 1 },
  };
  L.concourseZ = -27;
  L.gates = [
    { id: 'A1', x: -70, wide: false, bus: false },
    { id: 'A2', x: -25, wide: false, bus: false },
    { id: 'A3', x: 28, wide: true, bus: false },
    { id: 'A4', x: 80, wide: false, bus: false },
    { id: 'A5', x: -94, wide: false, bus: true },
  ];
  L.gateSeats = { z0: -36, z1: -29, half: 12 };
  L.crewRoom = { x0: 100, x1: 114, z0: -40, z1: -26, door: { x: 99, z: -33 } };

  // Baggage hall
  L.bhs = { x0: 102, x1: 140, z0: -18, z1: 36, ctX: 112, ctZ: 22, carouselX: 121, carouselZ: 2, carouselR: 6, inspect: { x: 132, z: 22 }, cartZ: -11 };

  // Airfield
  L.stand = { noseZ: -49, leadInZ: -120 };
  L.taxilaneZ = -120;
  L.taxiwayZ = -150;
  L.runway = { z: -222, x0: -460, x1: 460, w: 45, holdX: 430, exitX: -330 };
  L.remote = { x: -160, z: -78 };
  L.tower = { x: 150, z: -70, h: 62 };

  // Arrivals (pass 2): sterile corridor at mezzanine height, east-pier building, pickup curb
  L.arr = {
    x0: 190, x1: 290, z0: -10, z1: 50, h: 10,
    corridorZ: -41.4, corridorY: 5.2, corridorX: 172, bridgeZ: 20,
    escTop: { x: 192, z: 20 }, escBottom: { x: 205, z: 20 },
    imm: { x: 232, manual: { z0: 14, z1: 48, n: 10, queue: { x0: 210, x1: 228, z0: 14.5, z1: 48 } }, egate: { z0: -8, z1: 12, n: 8, queue: { x0: 210, x1: 228, z0: -8, z1: 11.5 } } },
    claim: { x: 250, carousels: [2, 22, 42], rx: 6, rz: 2.4 },
    services: { x: 243, z: -6.5 },
    customs: { wallX: 265, green: { z0: 8, z1: 16 }, red: { z0: 25, z1: 33, desk: { x: 268, z: 29 } }, bench: { x: 269, z: 4 } },
    hall: { x0: 272, x1: 290, barrierX: 276 },
    doors: [4, 20, 36],
    curbX: 294, roadX: 302, roadZ0: -40, roadZ1: 90,
  };

  // Gate geometry derived from the gate list
  L.gateDoor = (g) => ({ x: g.x + 9, z: L.term.z0 });
  L.podium = (g) => ({ x: g.x + 9, z: -36.6 });

  // ---------- pedestrian nav graph ----------
  const N = {};
  function node(id, x, z) { N[id] = { id, x, z, e: [] }; }
  function edge(a, b) { N[a].e.push(b); N[b].e.push(a); }

  // curb and entries
  L.doors.forEach((x, i) => { node('curb' + i, x, 61); node('door' + i, x, 56); node('hall' + i, x, 52.5); edge('curb' + i, 'door' + i); edge('door' + i, 'hall' + i); });
  for (let i = 0; i < L.doors.length - 1; i++) { edge('curb' + i, 'curb' + (i + 1)); edge('hall' + i, 'hall' + (i + 1)); }
  node('railPlat', -121, 44); node('railWalk', -110, 44); node('westDoor', -100, 44); node('hallW', -97, 50);
  edge('railPlat', 'railWalk'); edge('railWalk', 'westDoor'); edge('westDoor', 'hallW'); edge('hallW', 'hall0');
  node('taxiStand', -80, 61); edge('taxiStand', 'curb0'); edge('taxiStand', 'curb1');
  node('busStand', 78, 61); edge('busStand', 'curb3'); edge('busStand', 'curb4');
  node('xwalk', 0, 64); edge('xwalk', 'curb2'); edge('xwalk', 'curb1');
  node('garage', 0, 93); edge('garage', 'xwalk');

  // check-in group entries hang off the hall spine
  Object.keys(L.groups).forEach((k) => { const g = L.groups[k]; node('q_' + k, g.entry.x, g.entry.z); });
  edge('q_priority', 'hall0'); edge('q_economy', 'hall1'); edge('q_economy', 'hall2'); edge('q_bagdrop', 'hall2'); edge('q_special', 'hall4');
  node('q_kiosk', L.kiosks.entry.x, L.kiosks.entry.z); edge('q_kiosk', 'hall3'); edge('q_kiosk', 'hall2');

  // security approaches (pass through the gaps in the counter row)
  node('secDoor', 66, 37.5); edge('secDoor', 'hall3'); edge('secDoor', 'hall4'); edge('secDoor', 'q_kiosk');
  node('ftDoor', -72, 38); edge('ftDoor', 'hall0'); edge('ftDoor', 'hall1'); edge('ftDoor', 'q_priority');

  // after screening: recompose exit corridor along z = 3.5
  node('postSecW', -50, 3.5); node('postSecC', 0, 3.5); node('postSecE', 30, 3.5);
  edge('postSecW', 'postSecC'); edge('postSecC', 'postSecE');
  node('ppManual', -42, 3.6); node('ppEgate', 35, 3.6);
  edge('ppManual', 'postSecW'); edge('ppManual', 'postSecC'); edge('ppEgate', 'postSecE'); edge('ppEgate', 'postSecC');

  // airside
  node('ppExitW', -42, -9.5); node('ppExitE', 35, -9.5); node('airHub', 0, -9.5);
  edge('ppExitW', 'airHub'); edge('ppExitE', 'airHub');
  node('dfIn', 0, -11); edge('dfIn', 'airHub');
  node('dfA', -22, -14); node('dfB', -24, -21); node('dfC', 0, -18); node('dfD', 24, -15); node('dfE', 22, -22); node('dfOut', 0, -25);
  edge('dfIn', 'dfA'); edge('dfA', 'dfB'); edge('dfB', 'dfC'); edge('dfC', 'dfD'); edge('dfD', 'dfE'); edge('dfE', 'dfOut');
  node('conC', 0, L.concourseZ); edge('dfOut', 'conC');
  node('conW', -48, L.concourseZ); node('conE', 48, L.concourseZ); edge('conC', 'conW'); edge('conC', 'conE');
  node('conWW', -88, L.concourseZ); node('conEE', 92, L.concourseZ); edge('conW', 'conWW'); edge('conE', 'conEE');
  // side corridors let staff and lost passengers bypass the store
  node('sideW', -44, -9.5); node('sideE', 44, -9.5); edge('sideW', 'ppExitW'); edge('sideE', 'ppExitE');
  edge('sideW', 'conW'); edge('sideE', 'conE');
  node('foodIn', -60, -22); edge('foodIn', 'conW'); edge('foodIn', 'conWW');
  node('loungeIn', 54, -22); edge('loungeIn', 'conE');
  node('prayerIn', -93, -10.5); node('nursingIn', -81.5, -10.5); node('smokingIn', 93, -10.5);
  node('airWW', -88, -9.5); node('airEE', 92, -9.5);
  edge('airWW', 'sideW'); edge('airEE', 'sideE'); edge('prayerIn', 'airWW'); edge('nursingIn', 'airWW'); edge('smokingIn', 'airEE');
  edge('airWW', 'conWW'); edge('airEE', 'conEE');
  node('crewDoor', L.crewRoom.door.x, L.crewRoom.door.z); node('crewRoom', 106, -33); edge('crewDoor', 'crewRoom'); edge('crewDoor', 'conEE');

  L.gates.forEach((g) => {
    node('gate' + g.id, g.x, L.concourseZ);
    const p = L.podium(g); node('pod' + g.id, p.x, p.z + 1.6);
    const d = L.gateDoor(g); node('door' + g.id, d.x, d.z + 0.6);
    edge('pod' + g.id, 'gate' + g.id); edge('pod' + g.id, 'door' + g.id);
  });
  // concourse spine through all gate nodes, sorted west to east
  const spine = ['conWW', 'conW', 'conC', 'conE', 'conEE'].concat(L.gates.map((g) => 'gate' + g.id));
  spine.sort((a, b) => N[a].x - N[b].x);
  for (let i = 0; i < spine.length - 1; i++) edge(spine[i], spine[i + 1]);

  // arrivals ground-floor graph (separate from departures: arriving passengers never mix with departing ones)
  const AR = L.arr;
  node('aEsc', AR.escBottom.x + 1, AR.escBottom.z);
  node('aImmM', 209, 31); node('aImmE', 209, 2); edge('aEsc', 'aImmM'); edge('aEsc', 'aImmE');
  node('aClaim', 240, 20); node('aClaimN', 240, -2); node('aClaimS', 240, 44);
  edge('aClaim', 'aClaimN'); edge('aClaim', 'aClaimS');
  AR.claim.carousels.forEach((z, i) => { node('aCar' + i, 240.5, z); edge('aCar' + i, 'aClaim'); edge('aCar' + i, i === 0 ? 'aClaimN' : i === 2 ? 'aClaimS' : 'aClaim'); });
  node('aServ', AR.services.x, AR.services.z + 2.2); edge('aServ', 'aClaimN');
  node('aCustIn', 261, 20); edge('aCustIn', 'aClaim'); edge('aCustIn', 'aCar1');
  node('aGreen', 263, 12); node('aRed', 263, 29); edge('aGreen', 'aCustIn'); edge('aRed', 'aCustIn');
  node('aGreenOut', 273, 12); node('aRedOut', 273, 29); edge('aGreen', 'aGreenOut'); edge('aRed', 'aRedOut');
  node('aHall', 280, 20); edge('aHall', 'aGreenOut'); edge('aHall', 'aRedOut');
  AR.doors.forEach((z, i) => { node('aDoor' + i, AR.x1, z); node('aCurb' + i, AR.curbX, z); edge('aDoor' + i, 'aHall'); edge('aDoor' + i, 'aCurb' + i); });
  L.nodes = N;

  // Dijkstra on a ~100-node graph; cached per pair
  const cache = {};
  L.staffOnly = ['sideW', 'sideE'];   // passengers must walk through the store
  L.route = function (from, to, avoid) {
    const key = from + '>' + to + (avoid ? '!' + avoid.join(',') : '');
    if (cache[key]) return cache[key];
    if (!N[from] || !N[to]) throw new Error('unknown nav node ' + (N[from] ? to : from));
    const dist = {}, prev = {}, open = new Set(Object.keys(N).filter((k) => !avoid || !avoid.includes(k) || k === from || k === to));
    Object.keys(N).forEach((k) => (dist[k] = Infinity));
    dist[from] = 0;
    while (open.size) {
      let u = null;
      open.forEach((k) => { if (u === null || dist[k] < dist[u]) u = k; });
      if (u === to || dist[u] === Infinity) break;
      open.delete(u);
      N[u].e.forEach((v) => {
        if (!open.has(v)) return;
        const d = dist[u] + Math.hypot(N[v].x - N[u].x, N[v].z - N[u].z);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      });
    }
    if (dist[to] === Infinity) return (cache[key] = null);
    const path = [];
    for (let k = to; k; k = prev[k]) { path.unshift(k); if (k === from) break; }
    return (cache[key] = path);
  };
  L.nearestNode = function (x, z, filter) {
    let best = null, bd = Infinity;
    Object.keys(N).forEach((k) => {
      if (filter && !filter(k)) return;
      const d = Math.hypot(N[k].x - x, N[k].z - z);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  };
  return L;
})();
