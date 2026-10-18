// SkyOps crisis mode: incident scenarios with timed decisions, live effects on the sim, and a scored debrief.
SK.crisis = (function () {
  const E = SK.engine, K = SK.kit, M = K.mat, L = SK.L, AG = SK.agents, OPS = SK.ops;
  const CR = { active: null };
  const $ = (id) => document.getElementById(id);
  const now = () => SK.sim.now;
  const props = new THREE.Group(); E.scene.add(props);
  const log = (msg, kind) => SK.bus.emit('ops', { t: now(), kind: kind || 'warn', msg });

  function cordon(x, z, r) {
    const g = new THREE.Group();
    const tape = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 4, 64), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    tape.rotation.x = Math.PI / 2; tape.position.y = 0.95; g.add(tape);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; K.cyl(0.05, 0.05, 1, M.yellow, Math.cos(a) * r, 0, Math.sin(a) * r, g, 6); }
    g.position.set(x, 0, z);
    props.add(g);
    E.pick.add(g, 'cordon');
    return g;
  }
  function clearProps() { while (props.children.length) { const c = props.children.pop(); E.pick.remove(c); } }
  // move passengers out of a circle (they resume their scripts afterwards)
  function pushOut(x, z, r) {
    AG.list.forEach((a) => {
      const d = SK.dist(a.x, a.z, x, z);
      if (a.kind !== 'pax' || d >= r || a.hidden) return;
      const k = (r + 1.5) / Math.max(0.5, d);
      a.x = x + (a.x - x) * k; a.z = z + (a.z - z) * k;
    });
  }
  function ambulance(x, z, ry) {
    const g = new THREE.Group();
    K.box(2.3, 2.4, 6, M.white, 0, 0.4, 0, g);
    K.box(2.35, 0.4, 6.05, M.red, 0, 1.4, 0, g);
    K.box(2.2, 1.2, 1.6, M.glassDark, 0, 1.4, 2.6, g);
    const light = new THREE.MeshBasicMaterial({ color: 0x3a7bff });
    K.box(1.6, 0.25, 0.4, light, 0, 2.8, 2.2, g);
    g.userData.light = light;
    g.position.set(x, 0, z); g.rotation.y = ry || 0;
    props.add(g); E.pick.add(g, 'r_paramedic');
    return g;
  }
  // smoke column for the fire scenario
  const SMN = 260;
  const smPos = new Float32Array(SMN * 3), smGeo = new THREE.BufferGeometry();
  smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3));
  const smoke = new THREE.Points(smGeo, new THREE.PointsMaterial({ map: SK.kit.puff, depthWrite: false, color: 0x3a3a3a, size: 4.5, transparent: true, opacity: 0.55, depthWrite: false }));
  smoke.visible = false; smoke.frustumCulled = false; E.scene.add(smoke);
  function startSmoke(x, z) {
    smoke.userData.o = { x, z };
    for (let i = 0; i < SMN; i++) smPos.set([x + SK.rng.range(-3, 3), SK.rng.range(0, 14), z + SK.rng.range(-3, 3)], i * 3);
    smoke.visible = true;
  }
  function tickSmoke(dt) {
    if (!smoke.visible) return;
    const o = smoke.userData.o;
    for (let i = 0; i < SMN; i++) { smPos[i * 3 + 1] += dt * 2.5; smPos[i * 3] += dt * 0.6; if (smPos[i * 3 + 1] > 14) { smPos[i * 3 + 1] = 1; smPos[i * 3] = o.x + SK.rng.range(-3, 3); smPos[i * 3 + 2] = o.z + SK.rng.range(-3, 3); } }
    smGeo.attributes.position.needsUpdate = true;
  }
  function responders(role, n, from, to) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = AG.post(role, from.x + i, from.z, 0, null, 'idle');
      a.kind = 'staff'; a.crisis = true;
      a.path = [{ x: to.x + (i - n / 2) * 1.2, z: to.z + 1.5 }]; a.arrived = false;
      out.push(a);
    }
    return out;
  }
  function dismiss(list) { (list || []).forEach((a) => AG.kill(a)); }

  const SCEN = [
    {
      id: 'bag', title: 'Unattended bag in the check-in hall', ref: 'cordon', at: { x: -30, z: 45 }, dist: 40,
      brief: 'A cleaner reports a black suitcase left alone beside the economy queue for over ten minutes. Nobody nearby claims it.',
      start(c) {
        const bag = K.box(0.6, 0.75, 0.35, M.black, -30, 0, 45, props); bag.userData.pick = 'cordon'; E.pick.add(bag, 'cordon');
        log('Unattended bag reported beside the economy check-in queue');
      },
      steps: [
        {
          text: 'What is your first instruction to the terminal duty manager?',
          opts: [
            { t: 'Have staff pick it up and take it to lost property', s: 0, why: 'Never move a suspect item. If it is a device, handling it is the most dangerous thing you can do.' },
            { t: 'Ask nearby passengers if it is theirs, then call police and set a cordon', s: 2, why: 'Correct. Quick ownership check (HOT: hidden, obviously suspicious, typical?), then police and a cordon sized to the threat.', fx: (c) => { c.cordon = cordon(-30, 45, 10); pushOut(-30, 45, 10); OPS.holds.checkin = true; AG.st.economy.servers.forEach((s) => { if (Math.abs(s.x + 30) < 12) s.open = false; }); c.cops = responders('r_police', 2, { x: -40, z: 61 }, { x: -30, z: 45 }); } },
            { t: 'Make a PA call for the owner and keep the queue moving past it', s: 1, why: 'A PA call is reasonable, but leaving people beside the item while you wait exposes them. Cordon first.', fx: (c) => { c.cops = responders('r_police', 2, { x: -40, z: 61 }, { x: -30, z: 45 }); } },
          ],
        },
        {
          text: 'Police are on scene and the K9 team has no alert. The owner has not appeared. Next?',
          opts: [
            { t: 'Evacuate the whole terminal and stop all flights', s: 0, why: 'Disproportionate. A full evacuation for an un-alerted item costs thousands of missed connections and is not what the threat assessment supports.', fx: () => { OPS.holds.pushback = true; setTimeout(() => (OPS.holds.pushback = false), 20000); log('All pushbacks held by over-response'); } },
            { t: 'Hold the cordon, have the bomb disposal team assess, then reopen', s: 2, why: 'Correct. The specialist assessment decides. Most items are lost luggage, but the decision belongs to EOD, not the duty manager.' },
            { t: 'Reopen now: the dog did not alert', s: 1, why: 'A negative K9 sweep lowers the risk but does not clear the item. Wait for the specialist assessment.' },
          ],
        },
      ],
      end(c) { OPS.holds.checkin = false; AG.st.economy.servers.forEach((s) => (s.open = true)); dismiss(c.cops); log('Item cleared: a passenger left it while buying coffee. Area reopened', 'go'); },
      sop: ['Ask nearby people if the item is theirs.', 'Assess with the HOT protocol: Hidden? Obviously suspicious? Typical of the location?', 'If not resolved: do not touch, call police, set a cordon, move people away.', 'Specialist (EOD/K9) assessment decides the outcome.', 'Reopen and log the incident.'],
    },
    {
      id: 'medical', title: 'Passenger collapses at gate A2', ref: 'gates', at: { x: -25, z: -32 }, dist: 30,
      brief: 'A passenger waiting for boarding at A2 collapses and is not responding. Boarding is due to start in minutes.',
      start(c) {
        c.vic = AG.post('r_pax', -27, -31, 0, null, 'lie');
        c.amb = ambulance(-30, -46, Math.PI / 2);
        c.vic.role = 'r_pax'; c.vic.look.case = null;
        log('Medical emergency at gate A2');
      },
      steps: [
        {
          text: 'You are the gate agent. What do you do first?',
          opts: [
            { t: 'Call the airport emergency number for paramedics and send for the nearest defibrillator', s: 2, why: 'Correct. Raise the alarm and get the AED moving while trained staff start CPR if needed.', fx: (c) => { c.medics = responders('r_paramedic', 2, { x: -16, z: -39 }, { x: -27, z: -31 }); } },
            { t: 'Sit them up and give them water', s: 0, why: 'Never give food or drink to an unresponsive person, and do not move them. Raise the alarm first.' },
            { t: 'Carry on boarding to protect the departure time', s: 0, why: 'Life safety outranks punctuality. The delay is acceptable and expected.' },
          ],
        },
        {
          text: 'Paramedics are treating the passenger at the gate. Boarding time has arrived.',
          opts: [
            { t: 'Pause boarding at A2 and keep the area clear until paramedics leave', s: 2, why: 'Correct. Give responders space; a short boarding delay is the right trade.', fx: (c) => { c.hold = true; } },
            { t: 'Board around them', s: 1, why: 'Sometimes possible with a screen, but crowding responders slows treatment. Pause unless the medics say otherwise.' },
            { t: 'Move the flight to another gate immediately', s: 1, why: 'A gate change is a valid option if the stand is free, but it takes time to arrange. Pausing is quicker here.' },
          ],
        },
      ],
      tick(c) {
        const f = OPS.flights.find((x) => x.gate === 'A2' && !x.offBlock);
        if (f && c.hold) { if (!c.held) { c.held = f; c.wasBoarding = f.boarding; } f.boarding = false; }
      },
      end(c) {
        if (c.held && c.wasBoarding !== undefined) c.held.boarding = c.held.boarding || c.wasBoarding || c.held.groupCalled > 0;
        dismiss(c.medics); if (c.vic) AG.kill(c.vic); if (c.amb) { props.remove(c.amb); E.pick.remove(c.amb); }
        log('Passenger taken to hospital. A2 boarding resumed', 'go');
      },
      sop: ['Raise the alarm: airport emergency number, AED to the scene.', 'Trained staff check response and breathing; start CPR if needed.', 'Do not move the person or give food or drink.', 'Keep the area clear; pause boarding if needed.', 'Hand over to paramedics; record the incident.'],
    },
    {
      id: 'xray', title: 'X-ray failure on lane 2', ref: 'lane', at: { x: -31, z: 14 }, dist: 34,
      brief: 'The X-ray on lane 2 has frozen mid-scan during the morning peak. The queue is growing.',
      start(c) { c.lane = AG.st.lanes.servers[1]; c.wasOpen = OPS.autoStaff; OPS.autoStaff = false; c.lane.open = false; log('Lane 2 X-ray failed; lane closed'); },
      steps: [{
        text: 'Security wait is climbing. What do you do?',
        opts: [
          { t: 'Open every spare lane, call the technician, and move lane 2 passengers to other lanes', s: 2, why: 'Correct. Restore capacity first, fix second. Moved passengers keep their place.', fx: () => OPS.setOpen('lanes', 5) },
          { t: 'Switch lane 2 to hand searches of every bag', s: 1, why: 'Hand searching is a valid fallback, but it runs at a fraction of the X-ray rate. Use it only if no lane is free.', fx: (c) => { c.lane.open = true; OPS.svcMul.lanes = 2.2; } },
          { t: 'Let people through lane 2 without bag screening to keep the flow', s: 0, why: 'Never. Unscreened bags in the sterile area break ICAO Annex 17 and force a full re-screen of the area.' },
        ],
      }],
      duration: 40,
      end(c) { c.lane.open = true; OPS.svcMul.lanes = 1; OPS.autoStaff = c.wasOpen; log('Lane 2 X-ray repaired and back in service', 'go'); },
      sop: ['Stop the belt, keep the bags in view.', 'Open spare lanes; redirect queued passengers.', 'Call the maintenance technician.', 'Fallback: hand search if no lane can absorb the flow.', 'Never pass unscreened bags.'],
    },
    {
      id: 'outage', title: 'Check-in system outage', ref: 'desk_economy', at: { x: -10, z: 40 }, dist: 60,
      brief: 'The common-use check-in platform (CUPPS) is down. Kiosks, bag drops and desk screens are timing out.',
      start() { OPS.svcMul.economy = 3; OPS.svcMul.priority = 3; OPS.svcMul.kiosk = 4; OPS.svcMul.bagdrop = 4; OPS.holds.checkin = true; log('CUPPS outage: check-in systems timing out'); },
      steps: [{
        text: 'Queues are building at every check-in channel. Your call?',
        opts: [
          { t: 'Switch to manual check-in: open every desk, handwrite boarding passes and bag tags, send manifests to the gates', s: 2, why: 'Correct. Airlines keep manual check-in kits for this. It is slower than normal but keeps people flowing.', fx: () => { OPS.svcMul.economy = 1.6; OPS.svcMul.priority = 1.6; OPS.svcMul.kiosk = 2; OPS.svcMul.bagdrop = 2; OPS.setOpen('economy', 10); OPS.setOpen('priority', 4); } },
          { t: 'Hold all departures until IT fixes it', s: 0, why: 'Departures can still go with manual processes. Holding everything turns a check-in problem into a whole-airport delay.', fx: () => { OPS.holds.pushback = true; } },
          { t: 'Tell passengers to wait; it should be back soon', s: 1, why: 'Hoping for a quick fix is a gamble. Start manual procedures early; you can switch back if IT recovers.' },
        ],
      }],
      duration: 50,
      end() { ['economy', 'priority', 'kiosk', 'bagdrop'].forEach((k) => (OPS.svcMul[k] = 1)); OPS.holds.checkin = false; OPS.holds.pushback = false; log('CUPPS restored; normal check-in resumed', 'go'); },
      sop: ['Confirm scope with IT (which airlines, which channels).', 'Start manual check-in: paper boarding passes, handwritten tags, manual manifests.', 'Open all desks, add staff to queues.', 'Tell gates to expect manual lists.', 'Reconcile data when systems return.'],
    },
    {
      id: 'storm', title: 'Thunderstorm over the airfield', ref: 'apron', at: { x: 0, z: -70 }, dist: 160,
      brief: 'The weather office reports lightning within 5 nautical miles and moving toward the airport.',
      start(c) { c.wx = SK.sky.weather; SK.sky.setWeather('storm'); log('Lightning within 5 nm reported'); },
      steps: [{
        text: 'Ground crews are fuelling and loading bags on three stands. What now?',
        opts: [
          { t: 'Declare a ramp closure: stop fuelling, loading and marshalling, crews shelter, passengers stay inside', s: 2, why: 'Correct. Lightning alert procedures stop all open-air ramp work until the storm moves beyond the alert radius.' },
          { t: 'Stop fuelling only; keep loading bags', s: 1, why: 'Fuelling is the highest risk, but staff on an open ramp are exposed to strikes too. Close the whole ramp.' },
          { t: 'Carry on: it is only rain', s: 0, why: 'Lightning strikes on ramps injure workers every year. The alert exists to stop exactly this.', fx: () => log('Near miss: lightning strike beside stand A4 while crews were outside') },
        ],
      }],
      duration: 60,
      end(c) { SK.sky.setWeather(c.wx === 'storm' ? 'rain' : c.wx || 'clear'); log('Storm moved away; ramp reopened', 'go'); },
      sop: ['Weather office issues lightning alert (within about 5 nm).', 'Ramp closure: stop fuelling, loading, marshalling, headset pushbacks.', 'Crews shelter; passengers stay inside or on board.', 'Reopen when the all-clear is given.'],
    },
    {
      id: 'runway', title: 'Runway incursion on 27', ref: 'holdshort', at: { x: 300, z: -205 }, dist: 220,
      brief: 'A maintenance van has crossed the holding position onto runway 27 without clearance while an aircraft is on short final.',
      start(c) {
        const van = new THREE.Group();
        K.box(2.2, 2, 5, M.yellow, 0, 0.3, 0, van);
        van.position.set(L.runway.holdX, 0, L.runway.z + 30);
        props.add(van); c.van = van;
        let p = SK.aircraft.planes.find((q) => q.state === 'approach') || SK.aircraft.planes.find((q) => q.state === 'queued');
        if (p && p.state === 'queued') { p.f.inboundAt = now(); SK.aircraft.runwayHolder = null; }
        c.plane = p;
        log('Runway incursion: vehicle on runway 27');
      },
      steps: [{
        text: 'You are the tower controller. The aircraft is about a minute from touchdown.',
        opts: [
          { t: 'Instruct the aircraft to go around, then order the vehicle off the runway', s: 2, why: 'Correct. A go-around removes the conflict at once; then clear the vehicle and investigate.', fx: (c) => { if (c.plane) SK.aircraft.goAround(c.plane); } },
          { t: 'Let the aircraft land; the van will be clear in time', s: 0, why: 'Never assume. Runway incursions are a top aviation safety risk; the safe action is the go-around.' },
          { t: 'Close the airport for an hour', s: 1, why: 'Closing the runway briefly is right after the go-around, but an hour-long closure is more than the event needs.', fx: (c) => { if (c.plane) SK.aircraft.goAround(c.plane); OPS.holds.pushback = true; } },
        ],
      }],
      tick(c, dt) { if (c.van && c.van.position.z > L.runway.z) c.van.position.z -= dt * 6; },
      duration: 25,
      end() { OPS.holds.pushback = false; log('Vehicle removed; runway inspection complete, 27 reopened', 'go'); },
      sop: ['Controller sees the conflict: go-around for the arriving aircraft, stop departures.', 'Order the vehicle off the runway.', 'Runway inspection before reopening.', 'File an incursion report; investigate signage, clearance and radio procedures.'],
    },
    {
      id: 'birdstrike', title: 'Bird strike on approach', ref: 'fire', at: { x: 40, z: -200 }, dist: 260,
      brief: 'An arriving aircraft reports a bird strike on short final: vibration in the left engine and a burning smell in the cabin. The crew asks for fire services on landing.',
      start(c) { c.p = SK.aircraft.planes.find((q) => q.state === 'approach' || q.state === 'queued'); log((c.p ? c.p.f.num : 'Arriving aircraft') + ' reports bird strike, requests fire services'); },
      steps: [
        {
          text: 'You are the tower supervisor. What alert do you declare?',
          opts: [
            { t: 'Full emergency: ARFF to pre-planned runway positions before the aircraft lands', s: 2, why: 'Correct. An engine problem with smoke smell is a full emergency; crash tenders wait beside the runway so they can attack within seconds of touchdown.', fx: () => SK.support.drill({ x: 60, z: SK.L.runway.z }, 'full emergency, positions beside runway 27') },
            { t: 'Local standby: crews ready in the station', s: 1, why: 'Local standby fits a minor defect. With possible engine damage and smoke the right call is a full emergency so trucks are already beside the runway.', fx: () => SK.support.drill({ x: 60, z: SK.L.runway.z }, 'late turn-out after upgrade to full emergency') },
            { t: 'No alert: bird strikes are common', s: 0, why: 'Most bird strikes are harmless, but this crew reported vibration and smoke. Under-reacting costs minutes if the engine catches fire.' },
          ],
        },
        {
          text: 'The aircraft has landed and vacated the runway. Bird remains are reported near the touchdown zone.',
          opts: [
            { t: 'Close the runway for an inspection and remove debris before the next movement', s: 2, why: 'Correct. A runway inspection removes foreign object debris (FOD) that could damage the next aircraft; the wildlife team logs the strike.', fx: (c) => { c.closed = true; SK.aircraft.runwayHolder = { state: 'inspection', f: { num: 'RWY' } }; } },
            { t: 'Keep departures moving; inspect later', s: 0, why: 'Debris on a runway can burst tyres or be ingested by engines. Inspect first.' },
            { t: 'Close the airport for the day', s: 1, why: 'A short inspection is enough; a full closure is out of proportion.' },
          ],
        },
      ],
      duration: 30,
      end(c) { if (SK.aircraft.runwayHolder && SK.aircraft.runwayHolder.state === 'inspection') SK.aircraft.runwayHolder = null; SK.support.recall(); log('Runway 27 inspected and reopened; strike reported to the wildlife team', 'go'); },
      sop: ['Crew declares the problem; tower declares local standby or full emergency.', 'ARFF to pre-planned positions; other traffic held.', 'Aircraft lands, stops or vacates; ARFF checks engines and brakes.', 'Runway inspection for debris and remains.', 'Report the strike (wildlife hazard management).'],
    },
    {
      id: 'cyber', title: 'Ransomware hits airport IT', ref: 'eoc', at: { x: 151, z: -22 }, dist: 60,
      brief: 'The operations centre sees flight displays freezing and check-in workstations showing a ransom note. The baggage system and security scanners are on separate networks and still running.',
      start() { OPS.holds.fidsDown = true; OPS.svcMul.economy = 3; OPS.svcMul.priority = 3; OPS.svcMul.kiosk = 5; OPS.svcMul.bagdrop = 5; log('Cyber incident: FIDS and check-in systems infected'); },
      steps: [
        {
          text: 'What is the first action from the operations centre?',
          opts: [
            { t: 'Isolate the infected networks, switch to manual check-in, whiteboards and PA announcements', s: 2, why: 'Correct. Contain the spread first, then keep passengers moving with manual procedures. Operational technology on separate networks keeps running.', fx: () => { OPS.svcMul.economy = 1.6; OPS.svcMul.priority = 1.6; OPS.svcMul.kiosk = 2; OPS.svcMul.bagdrop = 2; OPS.setOpen('economy', 10); } },
            { t: 'Pay the ransom to get systems back fast', s: 0, why: 'Paying funds criminals, gives no guarantee of recovery and may be illegal. Follow the incident response plan.' },
            { t: 'Shut down every system, including baggage screening', s: 1, why: 'Over-reaction. Isolate what is infected; unaffected safety systems such as hold-baggage screening should keep running.', fx: () => { OPS.holds.pushback = true; } },
          ],
        },
        {
          text: 'IT has contained the malware. How do you bring systems back?',
          opts: [
            { t: 'Restore from clean offline backups after forensic checks, then reconnect in stages', s: 2, why: 'Correct. Staged recovery from known-good backups avoids reinfection; report the incident to the national cyber authority.' },
            { t: 'Reconnect everything at once to catch up', s: 0, why: 'Reconnecting unverified machines can reinfect the network.' },
            { t: 'Wait until next week', s: 1, why: 'Recovery should start as soon as backups are verified; manual procedures cannot run for days without delays building.' },
          ],
        },
      ],
      duration: 40,
      end() { OPS.holds.fidsDown = false; OPS.holds.pushback = false; ['economy', 'priority', 'kiosk', 'bagdrop'].forEach((k) => (OPS.svcMul[k] = 1)); log('Systems restored from clean backups; normal operations resumed', 'go'); },
      sop: ['Detect and confirm: operations and IT security centres.', 'Contain: isolate infected networks.', 'Continue: manual check-in, whiteboards, PA.', 'Recover: clean backups, staged reconnection.', 'Report to the national cyber authority and the regulator.'],
    },
  ];
  SCEN.push({
    id: 'fire', title: 'Kitchen fire in the food court', ref: 'food', at: { x: -78, z: -16 }, dist: 55,
    brief: 'A deep-fat fryer in the grill kitchen has caught fire. The kitchen suppression system has discharged, but smoke is spreading into the food court and detectors on that zone are in alarm.',
    start(c) {
      startSmoke(-82, -12.5);
      OPS.holds.foodClosed = true;
      AG.st.cafe.servers.forEach((s) => (s.open = false));
      log('Fire alarm: food court kitchen, smoke spreading');
    },
    steps: [
      {
        text: 'You are the terminal duty manager. First action?',
        opts: [
          { t: 'Confirm the alarm, evacuate the food court zone, call the fire service, and stop people walking into the smoke', s: 2, why: 'Correct. Zoned (phased) evacuation clears the people at risk first; the fire service is called on every confirmed fire.', fx: (c) => { pushOut(-73, -18, 26); c.ff = responders('r_firefighter', 3, { x: -60, z: -27 }, { x: -80, z: -16 }); } },
          { t: 'Use extinguishers yourself and keep the food court open', s: 0, why: 'Staff may use an extinguisher on a small fire only if it is safe, but with smoke spreading the priority is getting people out and calling the fire service.' },
          { t: 'Evacuate the whole airport to the car parks', s: 1, why: 'A full evacuation of a sterile area forces every passenger to be re-screened and is not needed for a contained kitchen fire.' },
        ],
      },
      {
        text: 'Passengers from the food court are gathering in the concourse. Where should they wait?',
        opts: [
          { t: 'Keep them airside at a safe gate area away from the smoke, so they stay in the sterile zone', s: 2, why: 'Correct. Moving people landside means everyone must be screened again before they can fly; a safe airside holding area keeps flights moving.', fx: () => {} },
          { t: 'Send them out through security to the landside curb', s: 1, why: 'Safe, but everyone becomes unscreened and must queue at security again. Use it only if the airside is unsafe.' },
          { t: 'Let them go back to finish their meals', s: 0, why: 'Nobody re-enters a fire zone until the fire service declares it safe.' },
        ],
      },
    ],
    duration: 45,
    tick(c, dt) { tickSmoke(dt); },
    end(c) { smoke.visible = false; OPS.holds.foodClosed = false; AG.st.cafe.servers.forEach((s) => (s.open = true)); dismiss(c.ff); log('Fire service declares the food court safe; kitchen closed for cleanup, seating reopened', 'go'); },
    sop: ['Detection: alarm on one zone, confirmed by staff or CCTV.', 'Zoned evacuation of the affected area; call the fire service.', 'Keep evacuees airside where safe so they stay screened.', 'Fire service controls the scene; reopen only on their all-clear.', 'Investigate and record.'],
  });
  CR.scenarios = SCEN;
  OPS.svcMul = OPS.svcMul || {};

  CR.openPicker = function () {
    SK.ui.modal('Crisis scenarios', [], () => `<p style="color:var(--muted);margin-top:0">Pick an incident. You will get timed decisions; the sim reacts to each call and you get a scored debrief with the real procedure.</p>
      <div class="grid2">${SCEN.map((s) => `<div class="card2"><b>${s.title}</b><p style="color:var(--muted);margin:6px 0 10px">${s.brief}</p><button class="btn primary" data-sc="${s.id}">Start</button></div>`).join('')}</div>`,
      (body) => body.querySelectorAll('[data-sc]').forEach((b) => b.addEventListener('click', () => { SK.ui.closeModal(); CR.start(b.dataset.sc); })));
  };
  CR.start = function (id) {
    if (CR.active) finish(true);
    const s = SCEN.find((x) => x.id === id);
    const c = { s, step: 0, picks: [], wait: 3, phase: 'intro', t: 0 };
    CR.active = c;
    SK.ui.setSpeed(1);
    SK.cam.flyTo({ x: s.at.x, z: s.at.z }, { dist: s.dist });
    s.start(c);
  };
  function showStep(c) {
    const st = c.s.steps[c.step];
    $('crTitle').textContent = c.s.title;
    $('crText').innerHTML = `<p style="margin:0 0 6px">${c.step === 0 ? c.s.brief + ' ' : ''}${st.text}</p>`;
    $('crOpts').innerHTML = st.opts.map((o, i) => `<button data-o="${i}">${o.t}</button>`).join('');
    $('crOpts').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => choose(c, Number(b.dataset.o))));
    $('crisis').classList.add('on');
    c.phase = 'decide'; c.timer = st.timeout || 30; c.timerMax = c.timer;
    $('crOpts').querySelector('button').focus();
  }
  function choose(c, i) {
    const st = c.s.steps[c.step];
    const o = i == null ? null : st.opts[i];
    c.picks.push({ q: st.text, o, best: st.opts.find((x) => x.s === 2) });
    if (o && o.fx) o.fx(c);
    if (!o) log('No decision made in time');
    $('crisis').classList.remove('on');
    c.step++;
    c.phase = c.step < c.s.steps.length ? 'gap' : 'run';
    c.wait = c.step < c.s.steps.length ? 6 : c.s.duration || 18;
  }
  function finish(silent) {
    const c = CR.active;
    if (!c) return;
    if (c.s.end) c.s.end(c);
    clearProps();
    if (c.van) props.remove(c.van);
    $('crisis').classList.remove('on');
    CR.active = null;
    if (silent) return;
    const score = c.picks.reduce((s, p) => s + (p.o ? p.o.s : 0), 0), max = c.s.steps.length * 2;
    SK.ui.modal('Debrief: ' + c.s.title, [], () => `<div class="quiz-q">Score ${score} / ${max}</div>
      ${c.picks.map((p) => `<div class="card2" style="margin-bottom:8px"><div class="eyebrow">${p.q}</div><p style="margin:6px 0"><b>Your call:</b> ${p.o ? p.o.t : 'no decision'}</p><p style="margin:0;color:var(--muted)">${p.o ? p.o.why : 'Time ran out. In a real incident, indecision is a decision.'}</p>${p.o && p.o.s < 2 ? `<p style="margin:6px 0 0"><b style="color:var(--ok)">Best:</b> ${p.best.t}</p>` : ''}</div>`).join('')}
      <h3 style="font-size:14px;margin:14px 0 6px">Standard procedure</h3><ol>${c.s.sop.map((x) => `<li>${x}</li>`).join('')}</ol>
      <button class="btn" id="crRef">Learn more: ${SK.CONTENT[c.s.ref].name}</button> <button class="btn primary" id="crAgain">Another scenario</button>`, (body) => {
      body.querySelector('#crRef').addEventListener('click', () => { SK.ui.closeModal(); SK.ui.open(c.s.ref); });
      body.querySelector('#crAgain').addEventListener('click', () => CR.openPicker());
    });
  }
  CR.frame = function (dtGame, dtReal) {
    const c = CR.active;
    if (!c) return;
    if (c.s.tick) c.s.tick(c, dtGame);
    if (c.phase === 'intro' || c.phase === 'gap') { c.wait -= dtReal; if (c.wait <= 0) showStep(c); }
    else if (c.phase === 'decide') {
      c.timer -= dtReal;
      $('crTimer').style.width = Math.max(0, (c.timer / c.timerMax) * 100) + '%';
      if (c.timer <= 0) choose(c, null);
    } else if (c.phase === 'run') { c.wait -= dtGame; if (c.wait <= 0) finish(false); }
  };
  return CR;
})();
