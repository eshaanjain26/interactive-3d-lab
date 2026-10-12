// SkyOps learn content: zones, entries (SOP, rules, data, roles, explainer), glossary, quiz. Pure data.
// Figures are typical published ranges, labelled with their source. Airport, airlines and flights are fictional.
(function () {
  const L = SK.L;
  const g = (id) => L.gates.find((x) => x.id === id);

  // ---------- zones (fast travel, minimap, filters) ----------
  SK.ZONES = [
    { id: 'curb', name: 'Departures curb', group: 'landside', pass: 1, x: 0, z: 66, d: 70, b: [-165, 165, 58, 90] },
    { id: 'rail', name: 'Rail station', group: 'landside', pass: 1, x: -128, z: 42, d: 60, b: [-146, -118, 6, 76] },
    { id: 'garage', name: 'Parking garage', group: 'landside', pass: 1, x: 0, z: 114, d: 90, b: [-60, 60, 94, 134] },
    { id: 'checkin', name: 'Check-in hall', group: 'landside', pass: 1, x: -10, z: 42, d: 70, b: [-100, 100, 30, 56] },
    { id: 'security', name: 'Security checkpoint', group: 'security', pass: 1, x: -10, z: 15, d: 62, b: [-80, 78, 4, 29] },
    { id: 'passport', name: 'Passport control', group: 'security', pass: 1, x: -5, z: -3, d: 58, b: [-68, 60, -10, 3] },
    { id: 'dutyfree', name: 'Duty free', group: 'retail', pass: 1, x: 0, z: -17, d: 42, b: [-40, 40, -24, -11] },
    { id: 'food', name: 'Food court', group: 'retail', pass: 1, x: -73, z: -18, d: 38, b: [-98, -48, -24, -12] },
    { id: 'lounge', name: 'Lounges', group: 'retail', pass: 1, x: 73, z: -18, d: 38, b: [48, 98, -24, -12] },
    { id: 'gates', name: 'Gates A1 to A5', group: 'airside', pass: 1, x: 0, z: -34, d: 95, b: [-100, 100, -40, -26] },
    { id: 'bhs', name: 'Baggage hall', group: 'ops', pass: 1, x: 121, z: 10, d: 55, b: [102, 140, -18, 36] },
    { id: 'apron', name: 'Apron and stands', group: 'airside', pass: 1, x: 10, z: -70, d: 150, b: [-180, 120, -110, -40] },
    { id: 'runway', name: 'Runway 09/27', group: 'airside', pass: 1, x: 120, z: -200, d: 420, b: [-460, 460, -245, -140] },
    { id: 'tower', name: 'ATC tower', group: 'ops', pass: 1, x: 150, z: -70, d: 70, y: 40, b: [140, 160, -80, -60] },
    { id: 'arrivals', name: 'Arrivals hall', group: 'landside', pass: 2, x: 230, z: 20, d: 90, b: [190, 270, -10, 50] },
    { id: 'claim', name: 'Baggage claim', group: 'landside', pass: 2, x: 230, z: 20, d: 70, b: [190, 270, -10, 50] },
    { id: 'customs', name: 'Customs', group: 'security', pass: 2, x: 230, z: 0, d: 60, b: [190, 270, -20, 10] },
    { id: 'cargo', name: 'Cargo terminal', group: 'ops', pass: 3, x: 330, z: -70, d: 120, b: [280, 380, -110, -30] },
    { id: 'hangar', name: 'Maintenance hangar', group: 'ops', pass: 3, x: -300, z: -80, d: 120, b: [-350, -250, -120, -40] },
    { id: 'fuel', name: 'Fuel farm', group: 'ops', pass: 3, x: 300, z: 60, d: 90, b: [270, 330, 30, 90] },
    { id: 'fire', name: 'Fire station (ARFF)', group: 'ops', pass: 3, x: 40, z: -176, d: 70, b: [20, 60, -186, -166] },
    { id: 'eoc', name: 'Operations centre (SOC/EOC)', group: 'ops', pass: 3, x: 150, z: -40, d: 50, b: [140, 162, -48, -32] },
  ];

  const C = {};
  const add = (id, o) => { C[id] = Object.assign({ id, kind: 'object', sop: [], regs: [], data: [], roles: [], explainer: null, keywords: '' }, o); };

  // ================= ZONES =================
  add('curb', {
    kind: 'zone', name: 'Departures curb', zone: 'curb', at: { x: 0, z: 63 },
    summary: 'The curb is where the airport hands passengers from the road network to the terminal. It is the first queue of the day: if cars cannot stop and leave quickly, the jam backs up onto the access road and people miss flights before they reach a check-in desk.',
    sop: ['Vehicles enter the curb lane by type: taxis to the rank, buses and shuttles to the bays, private cars to the drop-off zone.', 'Drivers stop only to load or unload. Curb officers move on any vehicle left waiting.', 'Passengers unload bags, cross the sidewalk and enter through the nearest door to their airline zone.', 'Wayfinding signs above each door list the airlines checking in behind it.', 'Unattended vehicles are reported to police for removal.'],
    regs: [{ src: 'TSA 49 CFR Part 1542', text: 'Airport security programs set rules for vehicle access and unattended vehicles near the terminal.' }, { src: 'Local traffic code', text: 'Curb dwell limits and towing rules are set by the airport authority.' }],
    data: [{ k: 'Typical drop-off dwell target', v: '1 to 3 minutes per car' }, { k: 'Curb modes here', v: 'Taxi, private car, shuttle, hotel bus, rail link' }],
    roles: ['r_police', 'r_driver', 'r_pax'],
    explainer: [
      { x: -80, z: 68, d: 30, text: 'Taxis queue at the rank on the west end of the curb.' },
      { x: 0, z: 68, d: 34, text: 'Private cars use the middle drop-off lane and should leave within a few minutes.' },
      { x: 78, z: 68, d: 30, text: 'Shuttles and hotel buses stop at the east bays.' },
      { x: 4, z: 58, d: 24, text: 'Signs over each door show which airlines check in behind it.' },
    ],
    keywords: 'drop off taxi uber ride share car kerb',
  });
  add('rail', {
    kind: 'zone', name: 'Airport rail station', zone: 'rail', at: { x: -128, z: 42 },
    summary: 'The rail link brings passengers and staff from the city without using the road. Every train that arrives releases a wave of people at once, so the check-in hall sees a pulse a few minutes after each arrival.',
    sop: ['Train arrives and opens doors on the platform side.', 'Passengers walk the covered link to the west terminal door.', 'Station staff help with heavy bags and step-free access.', 'Train dwells, closes doors and departs on schedule.'],
    regs: [{ src: 'National rail safety rules', text: 'Platform edge, door and dwell procedures follow the rail operator\'s safety case.' }],
    data: [{ k: 'Arrival pattern', v: 'One train every few minutes, each releasing a burst of passengers' }],
    roles: ['r_pax'], keywords: 'train metro people mover link station',
  });
  add('garage', {
    kind: 'zone', name: 'Parking garage', zone: 'garage', at: { x: 0, z: 114 },
    summary: 'The multi-deck garage holds short-stay and long-stay cars. Parking is often the single largest non-aeronautical revenue line at US airports, so space allocation and pricing are a commercial decision as much as a traffic one.',
    sop: ['Driver takes a ticket or is read by licence-plate recognition at the barrier.', 'Guidance lights show free bays per deck.', 'Passengers walk to the curb by the crosswalk, then into the terminal.', 'Payment on exit by card, app or plate account.'],
    data: [{ k: 'Decks', v: '4' }, { k: 'Revenue role', v: 'Non-aeronautical income, alongside retail and food' }],
    roles: ['r_pax'], keywords: 'car park parking lot',
  });
  add('checkin', {
    kind: 'zone', name: 'Check-in hall', zone: 'checkin', at: { x: -10, z: 42 },
    summary: 'Check-in confirms the passenger is allowed to travel, issues a boarding pass and accepts hold bags. For international flights this is also where travel documents are checked, because the airline pays fines and return costs if it carries someone who is refused entry at the destination.',
    sop: ['Passenger chooses a channel: online check-in with no bag goes straight to security; others use a kiosk, bag drop or staffed desk.', 'Agent or kiosk checks passport and visa against destination entry rules.', 'Hold bags are weighed (heavy tag over 23 kg, refused over 32 kg), tagged with a 10-digit licence plate and inducted onto the belt.', 'Boarding pass is issued with gate and boarding time.', 'Counters close about 60 minutes before an international departure.'],
    regs: [{ src: 'ICAO Annex 9', text: 'States require airlines to collect Advance Passenger Information (API) before departure.' }, { src: 'IATA Resolution 740', text: 'Defines the bag tag and its 10-digit licence plate number.' }, { src: 'IATA RP 1797 / RP 1706c', text: 'Common-use platforms (CUPPS) and self-service kiosks (CUSS) let any airline use any desk or kiosk.' }],
    data: [{ k: 'IATA ADRM optimum wait, economy desk', v: '10 to 20 min' }, { k: 'Kiosk', v: '1 to 2 min' }, { k: 'Bag drop', v: '1 to 5 min' }, { k: 'Desks modelled here', v: '4 priority, 10 economy, 6 auto bag drop, 2 special assistance, 12 kiosks' }],
    roles: ['r_checkin', 'r_pax', 'r_wheelchair'],
    explainer: [
      { x: 52, z: 45, d: 22, text: 'Kiosks print boarding passes and bag tags for passengers who did not check in online.' },
      { x: 8, z: 40, d: 22, text: 'Auto bag drops scan the tag, weigh the bag and induct it with no agent.' },
      { x: -41, z: 40, d: 26, text: 'Staffed economy desks handle document checks, problems and passengers without online check-in.' },
      { x: -86, z: 40, d: 20, text: 'First and business class get dedicated desks with a short queue.' },
      { x: 0, z: 31, d: 26, text: 'Every desk feeds the collector belt that carries hold bags to the baggage hall.' },
    ],
    keywords: 'checkin check in counter desk ticketing',
  });
  add('security', {
    kind: 'zone', name: 'Security checkpoint', zone: 'security', at: { x: -10, z: 14 },
    summary: 'The checkpoint is the boundary between public landside and the sterile airside zone. Everyone and everything going airside is screened, and its throughput sets how early passengers must arrive.',
    sop: ['Document check at the podium: boarding pass and ID match the person.', 'Queue, then a lane officer sends the passenger to the next free lane.', 'Divest: bags, coats, belts and (in older lanes) laptops and liquids into trays.', 'Trays go through the X-ray or CT scanner; the passenger walks through the body scanner.', 'Alarms resolve by bag search or targeted pat-down.', 'Recompose and exit to passport control.'],
    regs: [{ src: 'ICAO Annex 17', text: 'Passengers and cabin baggage must be screened before entering the security restricted area.' }, { src: 'TSA 49 CFR Part 1544', text: 'US aircraft operator security programs, including screening of persons and property.' }, { src: 'EU Regulation 2015/1998', text: 'Detailed EU screening methods and equipment standards.' }],
    data: [{ k: 'TSA published wait goal', v: 'Under 30 min standard, under 10 min PreCheck' }, { k: 'IATA ADRM optimum wait', v: '5 to 10 min' }, { k: 'TSA volume', v: 'About 900 million people screened in 2024' }, { k: 'Lanes here', v: '1 fast track + 5 standard' }],
    roles: ['r_tso', 'r_k9handler', 'r_police'],
    explainer: [
      { x: 51, z: 27.5, d: 18, text: 'Officers at the podiums match boarding pass, ID and face.' },
      { x: 54, z: 23, d: 22, text: 'The serpentine queue holds the backlog in a small footprint.' },
      { x: -12, z: 17, d: 14, text: 'Divest: everything goes in trays, which roll into the scanner.' },
      { x: -12, z: 12.5, d: 12, text: 'Bags pass the X-ray tunnel while the passenger steps into the body scanner.' },
      { x: 55, z: 10, d: 18, text: 'Alarms go to secondary search: a bag check or a pat-down.' },
      { x: -12, z: 7, d: 14, text: 'Recompose, then on to passport control.' },
    ],
    keywords: 'tsa screening checkpoint xray scanner',
  });
  add('passport', {
    kind: 'zone', name: 'Passport control (emigration)', zone: 'passport', at: { x: -5, z: -3 },
    summary: 'Border officers record each departing traveller and stop people who are wanted, banned from leaving or travelling on someone else\'s document. Many countries run exit control; others, including the US, collect exit data from airline manifests instead.',
    sop: ['Eligible ePassport holders use e-gates; others queue for an officer.', 'Officer or gate reads the passport chip and compares the live face with the chip photo.', 'Watch lists and visa status are checked.', 'Passport is stamped or the exit is logged electronically.', 'Referrals go to a side office for a second-line check.'],
    regs: [{ src: 'ICAO Doc 9303', text: 'Specifies machine readable and electronic passports, including the chip and its security.' }, { src: 'ICAO Annex 9', text: 'Facilitation standards for border clearance at departure and arrival.' }],
    data: [{ k: 'IATA ADRM optimum wait', v: '5 to 10 min' }, { k: 'Booths / e-gates here', v: '6 / 8' }],
    roles: ['r_immigration'], keywords: 'immigration emigration border passport egate',
  });
  add('dutyfree', {
    kind: 'zone', name: 'Walk-through duty free', zone: 'dutyfree', at: { x: 0, z: -17 },
    summary: 'The path from passport control runs straight through the store, so every passenger passes the shelves. Retail, food and parking pay for a large share of airport costs and help keep airline charges down.',
    sop: ['Passengers browse along a curved path that keeps product in view.', 'At the till the boarding pass is scanned to confirm an international departure.', 'Liquids for connecting flights are sealed in a tamper-evident bag (STEB) with the receipt.', 'Exit leads to the gate concourse.'],
    regs: [{ src: 'Customs law', text: 'Duty and tax relief applies only to goods exported by departing international passengers.' }, { src: 'ICAO security guidance', text: 'STEBs let liquids bought airside pass screening at a transfer airport.' }],
    data: [{ k: 'Non-aeronautical share of airport revenue', v: 'About 40% worldwide (ACI World)' }],
    roles: ['r_retail'], keywords: 'shop retail duty free shopping store boutique',
  });
  add('food', {
    kind: 'zone', name: 'Food court', zone: 'food', at: { x: -73, z: -18 },
    summary: 'Cafes, a grill and a bar serve passengers waiting for boarding. Airside outlets get every delivery through security screening, so stock and staff logistics run on a schedule.',
    sop: ['Passenger orders at the counter, pays, and waits at the pickup point.', 'Seating turns over with the boarding waves.', 'Kitchen deliveries are screened at a staff checkpoint before they come airside.'],
    regs: [{ src: 'ICAO Annex 17', text: 'Supplies taken into the security restricted area are screened or come from a secured supply chain.' }],
    data: [{ k: 'Peak driver', v: 'Dwell time between security exit and boarding' }],
    roles: ['r_barista', 'r_cleaner'], keywords: 'cafe coffee restaurant bar food court eat',
  });
  add('lounge', {
    kind: 'zone', name: 'Lounges', zone: 'lounge', at: { x: 73, z: -18 },
    summary: 'Business and first class passengers, and frequent flyers with status, wait here away from the crowd. The lounge desk checks eligibility from the boarding pass.',
    sop: ['Host scans the boarding pass and checks eligibility and guest allowance.', 'Guests use seating, buffet, showers and quiet areas.', 'Boarding calls are announced or shown on screens; many lounges stay quiet and rely on screens.'],
    data: [{ k: 'Sections here', v: 'Business lounge, first class room' }],
    roles: ['r_lounge'], keywords: 'lounge vip first business class',
  });
  add('gates', {
    kind: 'zone', name: 'Gates A1 to A5', zone: 'gates', at: { x: 0, z: -33 },
    summary: 'The gate is where the airline takes the passenger back from the airport. Boarding has to finish on time, because the bridge, tug, bag cart and the next flight on the stand all depend on it.',
    sop: ['Gate opens and agents confirm the flight is ready (cabin clean, crew on board).', 'Pre-boarding: passengers needing assistance, then families with small children.', 'Boarding by group: first and business, then economy groups from the rear.', 'Final call, then the gate closes about 15 minutes before departure.', 'Passenger-bag reconciliation: bags of no-shows are offloaded.'],
    regs: [{ src: 'ICAO Annex 17', text: 'Hold bags must not fly unless their passenger is on board, or the bag has been screened and authorised to travel separately.' }, { src: '14 CFR Part 382 / EU Reg 1107/2006', text: 'Assistance for passengers with reduced mobility, free of charge.' }],
    data: [{ k: 'Boarding starts', v: '40 min (narrow-body) to 50 min (wide-body) before departure here' }, { k: 'Gate close', v: '15 min before departure' }],
    roles: ['r_gateagent', 'r_pilot', 'r_cabin', 'r_wheelchair'],
    explainer: [
      { x: -25, z: -32, d: 26, text: 'Passengers wait in the holding area by the gate.' },
      { x: -16, z: -36, d: 14, text: 'Gate agents scan each boarding pass at the podium.' },
      { x: -18, z: -46, d: 26, text: 'The jet bridge connects the terminal to the forward left door.' },
      { x: -94, z: -36, d: 30, text: 'Gate A5 is a bus gate: a bus carries passengers to a remote stand.' },
    ],
    keywords: 'gate boarding holding area',
  });
  add('bhs', {
    kind: 'zone', name: 'Baggage hall (BHS)', zone: 'bhs', at: { x: 121, z: 10 },
    summary: 'The baggage handling system moves every hold bag from check-in to the right aircraft, screening each one on the way. A bag that misses its cart becomes a mishandled bag, the most visible failure an airport and airline share.',
    sop: ['Collector belts bring bags from all desks into the hall.', 'Each bag passes a CT explosive detection scanner (level 1).', 'Images the machine cannot clear go to an operator (level 2); unresolved bags go to the inspection table (level 3).', 'The sorter reads the tag and routes the bag to its flight make-up position.', 'Handlers load carts or containers; the cart leaves for the aircraft about 30 minutes before departure.', 'Every scan is a tracking event shared with the airline.'],
    regs: [{ src: 'ICAO Annex 17', text: 'All originating hold baggage on international flights is screened before loading.' }, { src: 'IATA Resolution 753', text: 'Airlines track each bag at acceptance, loading, transfer and arrival (since June 2018).' }, { src: 'ECAC EDS Standard 3', text: 'Performance standard met by CT hold baggage scanners in Europe.' }],
    data: [{ k: 'Mishandled bag rate', v: '6.9 per 1,000 passengers in 2023 (SITA Baggage IT Insights 2024)' }, { k: 'Make-up cart leaves', v: 'About 28 min before departure here' }],
    roles: ['r_bhs', 'r_ramp'],
    explainer: [
      { x: 108, z: 30, d: 20, text: 'Bags arrive on the collector belt from every check-in desk.' },
      { x: 112, z: 22, d: 14, text: 'The CT scanner builds a 3D image and flags anything it cannot clear.' },
      { x: 132, z: 22, d: 14, text: 'Flagged bags are opened at the inspection table if the image review cannot clear them.' },
      { x: 121, z: 2, d: 20, text: 'The make-up carousel holds bags until handlers load them onto the flight\'s cart.' },
      { x: 121, z: -12, d: 22, text: 'The tug pulls the loaded cart to the aircraft hold.' },
    ],
    keywords: 'baggage handling system bhs bags sortation conveyor',
  });
  add('apron', {
    kind: 'zone', name: 'Apron and stands', zone: 'apron', at: { x: 10, z: -70 },
    summary: 'The apron is where aircraft park, load and unload. A turnaround packs fuelling, catering, cleaning, baggage and boarding into 40 to 90 minutes around a single aircraft, and any task that runs late delays the whole flight.',
    sop: ['Marshaller guides the aircraft onto the stand; chocks go in and the beacon goes off.', 'Bridge docks; ground power and pre-conditioned air connect.', 'Bags, cargo, catering, fuel and cleaning run in parallel.', 'Boarding, doors closed, bridge retracts.', 'Pushback with the tug, engines start, tug disconnects.'],
    regs: [{ src: 'ICAO Annex 14', text: 'Aerodrome design including stand markings and clearances.' }, { src: 'ICAO Annex 2, Appendix 1', text: 'Standard marshalling hand signals.' }],
    data: [{ k: 'Typical turnaround', v: '35 to 50 min narrow-body, 60 to 90 min wide-body' }],
    roles: ['r_marshaller', 'r_ramp'], keywords: 'ramp apron stand parking aircraft',
  });
  add('runway', {
    kind: 'zone', name: 'Runway 09/27', zone: 'runway', at: { x: 120, z: -222 },
    summary: 'Runways are named for their magnetic heading divided by ten: aircraft on 27 point at about 270 degrees (west). Only one aircraft may use the runway at a time, so the tower sequences landings and take-offs in gaps.',
    sop: ['Departures hold short at the holding position until cleared to line up.', 'Tower clears take-off once the runway is clear and wake separation is met.', 'Arrivals are cleared to land, roll out and leave by the first suitable exit.', 'Runway inspections and lighting checks run between movements.'],
    regs: [{ src: 'ICAO Annex 14', text: 'Runway markings, lighting and holding position design.' }, { src: 'ICAO Doc 4444 (PANS-ATM)', text: 'Runway separation and wake turbulence minima.' }],
    data: [{ k: 'Mode', v: 'Single runway, mixed arrivals and departures on 27' }],
    roles: ['r_atc'], keywords: 'runway 27 09 27l takeoff landing',
  });
  add('tower', {
    kind: 'zone', name: 'ATC tower', zone: 'tower', at: { x: 150, z: -70, y: 50 },
    summary: 'Controllers in the tower cab can see the whole airfield. Ground control handles taxiing aircraft and vehicles, tower control handles the runway, and approach and departure radar handle the airspace beyond.',
    sop: ['Clearance delivery issues the route before start-up.', 'Ground control approves pushback and taxi routes.', 'Tower clears line-up, take-off and landing.', 'Departure radar takes over once airborne.'],
    regs: [{ src: 'ICAO Doc 4444 (PANS-ATM)', text: 'Procedures and phraseology for air traffic management.' }, { src: 'ICAO Annex 11', text: 'Air traffic services organisation.' }],
    data: [{ k: 'Radar rotation', v: 'Terminal surveillance radars sweep every 4 to 5 seconds' }],
    roles: ['r_atc'], keywords: 'atc tower air traffic control radar',
  });
  ['arrivals', 'claim', 'customs', 'cargo', 'hangar', 'fuel', 'fire', 'eoc'].forEach((id) => {
    const z = SK.ZONES.find((q) => q.id === id);
    add(id, {
      kind: 'zone', name: z.name, zone: id, at: { x: z.x, z: z.z }, future: z.pass,
      summary: z.name + ' is placed on the map as massing and is scheduled for pass ' + z.pass + '. It will get the same depth as Departures: live agents, SOPs, rules, data and an explainer.',
      keywords: id,
    });
  });

  // ================= CHECK-IN OBJECTS =================
  add('kiosk', {
    name: 'Self-service kiosk', zone: 'checkin', at: { x: 52, z: 45 },
    summary: 'Common-use kiosks let passengers of any airline check in, choose seats and print boarding passes and bag tags.',
    sop: ['Scan passport or booking code.', 'Answer travel document and dangerous goods questions.', 'Print boarding pass and bag tags.', 'Attach tag and go to an auto bag drop.'],
    regs: [{ src: 'IATA RP 1706c (CUSS)', text: 'Common Use Self Service standard for shared kiosks.' }],
    data: [{ k: 'ADRM optimum wait', v: '1 to 2 min' }], roles: ['r_pax'], keywords: 'cuss self service kiosk',
  });
  add('desk_priority', {
    name: 'Priority check-in', zone: 'checkin', at: { x: -86, z: 34 },
    summary: 'Dedicated desks for first and business class and top-tier frequent flyers, with a separate short queue.',
    sop: ['Agent greets and checks documents.', 'Bags tagged with a priority tag so they come off first at the destination.', 'Fast-track security pass printed on the boarding pass.'],
    roles: ['r_checkin'], data: [{ k: 'Desks here', v: '4' }], keywords: 'first business priority premium',
  });
  add('desk_economy', {
    name: 'Economy check-in desk', zone: 'checkin', at: { x: -41, z: 34 },
    summary: 'Staffed desks running on a common-use platform, so any airline can use any desk by logging in.',
    sop: ['Call next passenger from the queue.', 'Check passport, visa and destination entry rules.', 'Weigh and tag each bag, induct it onto the belt behind the desk.', 'Issue boarding pass and explain gate and boarding time.'],
    regs: [{ src: 'IATA RP 1797 (CUPPS)', text: 'Common Use Passenger Processing Systems.' }, { src: 'Carrier liability', text: 'Airlines are fined and must fly back passengers refused entry, so document checks are strict.' }],
    data: [{ k: 'ADRM optimum wait', v: '10 to 20 min' }, { k: 'Service time', v: 'About 1.5 to 2.5 min per passenger' }], roles: ['r_checkin'], keywords: 'counter agent desk economy',
  });
  add('bagdrop', {
    name: 'Automated bag drop', zone: 'checkin', at: { x: 8, z: 34 },
    summary: 'Self-service units scan the bag tag, weigh and measure the bag, check the passenger\'s booking and induct the bag with no agent.',
    sop: ['Place bag on the belt with the tag facing up.', 'Scan boarding pass.', 'Unit checks weight and size limits and reads the tag.', 'Bag inducts; receipt prints.'],
    data: [{ k: 'ADRM optimum wait', v: '1 to 5 min' }, { k: 'Weight limits', v: 'Heavy tag above 23 kg; most airports refuse above 32 kg' }], roles: ['r_pax'], keywords: 'bag drop self',
  });
  add('special_desk', {
    name: 'Special assistance and oversize', zone: 'checkin', at: { x: 89, z: 34 },
    summary: 'Handles wheelchair requests, unaccompanied minors, pets, sports equipment and bags too large for the main belt.',
    sop: ['Confirm the assistance request made at booking.', 'Arrange an assistant and wheelchair through to the aircraft door.', 'Oversize items go to a separate out-of-gauge belt.'],
    regs: [{ src: '14 CFR Part 382 (US) / EU Reg 1107/2006', text: 'Airlines and airports must provide assistance to passengers with reduced mobility at no charge.' }],
    roles: ['r_wheelchair'], keywords: 'wheelchair prm oversize assistance',
  });
  add('belt', {
    name: 'Collector belt', zone: 'checkin', at: { x: -20, z: 31 },
    summary: 'A conveyor behind the desks gathers every checked bag and carries it to the baggage hall. Here it dives below the floor at the security entrance and comes back up inside the hall.',
    sop: ['Bags induct one at a time with a gap so the tag reader sees each one.', 'Jams stop the belt; a technician clears them.'], roles: ['r_bhs'], keywords: 'conveyor belt',
  });
  add('fids', {
    name: 'Flight information display (FIDS)', zone: 'checkin', at: { x: -10, z: 54 },
    summary: 'Screens show each departure\'s time, gate and status. They pull from the airport operational database, which takes updates from airlines, ground handlers and ATC.',
    sop: ['Status changes as the flight moves: check-in open, go to gate, boarding, final call, gate closed, departed.', 'Delays show the new estimated time.'], keywords: 'flight board screen departures display',
  });

  // ================= SECURITY OBJECTS =================
  add('docpodium', {
    name: 'Document check podium', zone: 'security', at: { x: 46, z: 27.5 },
    summary: 'An officer checks that the boarding pass is valid for today and that the ID belongs to the person holding it.',
    sop: ['Scan boarding pass barcode (checks flight, date and that it was not already used).', 'Inspect ID for security features.', 'Compare the face with the ID photo.'], regs: [{ src: 'TSA', text: 'Credential authentication technology reads the ID and confirms flight details in some lanes.' }], roles: ['r_tso'], keywords: 'id check travel document checker',
  });
  add('lane', {
    name: 'Screening lane', zone: 'security', at: { x: -12, z: 12 },
    summary: 'Each lane is a pipeline: divest, scan, recompose. A passenger can only move forward when the next station is free, so the slowest step sets the lane\'s throughput.',
    sop: ['Divest into trays: bags, coats, belts, large electronics and liquids unless the lane has a CT scanner.', 'Trays enter the X-ray or CT tunnel.', 'Passenger walks through the body scanner when called.', 'Alarm resolution if needed.', 'Recompose at the end of the belt.'],
    regs: [{ src: 'TSA 3-1-1 rule', text: 'Liquids in containers of 3.4 oz (100 ml) or less, in one quart-size bag per passenger.' }],
    data: [{ k: 'Lane throughput', v: 'About 150 to 200 passengers per hour depending on equipment and divest time' }],
    roles: ['r_tso'],
    explainer: [
      { x: -12, z: 17, d: 10, text: 'Divest station: the slowest step in most lanes.' },
      { x: -12, z: 12.8, d: 9, text: 'X-ray tunnel and body scanner run in parallel.' },
      { x: -12, z: 7.5, d: 9, text: 'Recompose: passengers repack while the next one moves up.' },
    ],
    keywords: 'lane screening divest tray',
  });
  add('xray', {
    name: 'X-ray / CT bag scanner', zone: 'security', at: { x: -12, z: 12.8 },
    summary: 'Cabin bags go through an X-ray or computed tomography scanner. CT builds a 3D image, so in many lanes laptops and liquids can stay in the bag.',
    sop: ['Operator reviews each image; software highlights threats.', 'Suspect bags are diverted for a hand search.', 'Unclaimed trays are returned to the start by the return belt.'], roles: ['r_tso'], keywords: 'xray ct scanner bag',
  });
  add('bodyscanner', {
    name: 'Body scanner (AIT)', zone: 'security', at: { x: -9, z: 12.6 },
    summary: 'Millimetre-wave Advanced Imaging Technology finds metallic and non-metallic items. Automated target recognition shows a generic outline with boxes, not an image of the person.',
    sop: ['Passenger stands with arms raised for a two-second scan.', 'No alarm: walk on.', 'Alarm: targeted pat-down of the flagged area only.'], regs: [{ src: 'TSA', text: 'AIT units use automated target recognition so no passenger image is shown or stored.' }], roles: ['r_tso'], keywords: 'ait millimeter wave body scanner metal detector',
  });
  add('secondary', {
    name: 'Secondary search', zone: 'security', at: { x: 55, z: 10 },
    summary: 'Bags flagged at the scanner are searched by hand in front of the passenger, often with an explosive trace swab.',
    sop: ['Passenger is told why the bag was flagged.', 'Officer searches the bag, swabs items, and re-screens if needed.', 'Prohibited items are surrendered or the passenger is referred to police.'], roles: ['r_tso', 'r_police'], keywords: 'bag search etd trace swab',
  });
  add('patdown', {
    name: 'Pat-down', zone: 'security', at: { x: 40, z: 10 },
    summary: 'Resolves a body scanner alarm. Officers of the same gender perform it, and passengers can ask for a private room.',
    sop: ['Officer explains the procedure before starting.', 'Targeted check of the flagged area.', 'Private screening on request.'], roles: ['r_tso'], keywords: 'pat down patdown',
  });
  add('k9', {
    name: 'K9 explosive detection team', zone: 'security', at: { x: 54, z: 23 },
    summary: 'A handler and a passenger-screening dog work the queue. The dog samples the air as people pass and sits when it smells an explosive odour.',
    sop: ['Handler walks the dog along the queue at a steady pace.', 'Dog gives a passive alert (sits) on an odour.', 'Handler marks the person for additional screening and calls police if needed.', 'Dogs rest regularly; detection work is tiring.'], regs: [{ src: 'TSA NEDCTP', text: 'National Explosives Detection Canine Team Program trains and certifies teams.' }], roles: ['r_k9handler'], keywords: 'k9 dog canine sniffer',
  });

  // ================= PASSPORT OBJECTS =================
  add('booth', {
    name: 'Passport booth', zone: 'passport', at: { x: -42, z: -5.5 },
    summary: 'A border officer checks the document, the chip, the face and watch lists.',
    sop: ['Read the passport chip and verify its signature.', 'Compare face to the chip photo.', 'Query watch lists and visa status.', 'Stamp or log the exit; refer if needed.'], regs: [{ src: 'ICAO Doc 9303', text: 'ePassport chip and public key infrastructure.' }], data: [{ k: 'Service time', v: 'About 30 to 60 seconds per traveller' }], roles: ['r_immigration'], keywords: 'immigration officer booth',
  });
  add('egate', {
    name: 'Automated border e-gate', zone: 'passport', at: { x: 35, z: -5.5 },
    summary: 'Eligible ePassport holders clear themselves: the gate reads the chip, takes a live photo and compares it to the chip image.',
    sop: ['Place passport photo page on the reader.', 'Entry door opens; step in and look at the camera.', 'Face match and checks pass: exit door opens.', 'Failures go to an officer.'], regs: [{ src: 'ICAO Doc 9303', text: 'Chip and facial image standards that make e-gates possible.' }], data: [{ k: 'Service time', v: 'About 10 to 20 seconds' }], roles: ['r_immigration'], keywords: 'egate e gate automated border',
  });

  // ================= AIRSIDE OBJECTS =================
  add('cafe', { name: 'Cafe and grill', zone: 'food', at: { x: -73, z: -14 }, summary: 'Counter service with a short menu so orders are ready in minutes.', sop: ['Order and pay.', 'Pick up at the counter.', 'Sit, eat, leave for boarding.'], roles: ['r_barista'], keywords: 'coffee cafe restaurant' });
  add('prayer', { name: 'Multi-faith prayer room', zone: 'rooms', at: { x: -93, z: -5 }, summary: 'A quiet room open to all faiths, with washing facilities next door.', sop: ['Open at all hours.', 'Shoes off at the entry.'], keywords: 'prayer chapel multi faith' });
  add('nursing', { name: 'Nursing room', zone: 'rooms', at: { x: -81.5, z: -5 }, summary: 'A private lactation room with seating, a sink and a power outlet.', regs: [{ src: 'US FAM Act (2018)', text: 'Medium and large hub airports must provide lactation areas in each terminal.' }], keywords: 'nursing lactation mother baby' });
  add('smoking', { name: 'Smoking room', zone: 'rooms', at: { x: 93, z: -5 }, summary: 'A ventilated room with its own extraction. Many airports have removed them; others keep them to stop people smoking in restrooms.', regs: [{ src: 'Local law', text: 'Indoor smoking rules vary by country; many US airports ban it entirely.' }], keywords: 'smoking room' });
  add('gatepodium', {
    name: 'Gate podium', zone: 'gates', at: { x: -16, z: -36.6 },
    summary: 'Gate agents run boarding from here: announcements, seat changes, standby list and the boarding pass scanner that feeds the passenger manifest.',
    sop: ['Confirm with the crew that the cabin is ready.', 'Announce pre-boarding, then each group.', 'Scan every boarding pass; the system flags wrong-flight or duplicate scans.', 'Final call, close the flight, hand the final count to the crew.'], roles: ['r_gateagent'], keywords: 'gate podium boarding scan',
  });
  add('jetbridge', {
    name: 'Jet bridge (passenger boarding bridge)', zone: 'gates', at: { x: -18, z: -45 },
    summary: 'A telescoping walkway that drives to the aircraft door. It also carries 400 Hz ground power and pre-conditioned air so the aircraft can switch off its auxiliary power unit.',
    sop: ['Operator drives the bridge to the door after the aircraft stops and the beacon is off.', 'Canopy and auto-level engage.', 'Ground power and air hoses connect.', 'At departure the bridge retracts to its parking position before pushback.'], regs: [{ src: 'Annex 14 / airport rules', text: 'Bridges must be fully retracted inside their safety zone before an aircraft moves.' }], roles: ['r_ramp'], keywords: 'jet bridge pbb airbridge jetway',
  });
  add('busgate', {
    name: 'Bus gate and remote stand', zone: 'gates', at: { x: -94, z: -40 },
    summary: 'When there are not enough contact stands, passengers board buses that drive them to aircraft parked on a remote stand, where they climb air stairs.',
    sop: ['Boarding pass scan at the gate.', 'Bus fills and drives airside to the stand.', 'Passengers climb the air stairs.', 'Last bus confirms the final count.'], roles: ['r_gateagent', 'r_driver'], keywords: 'bus gate remote stand apron bus stairs',
  });
  add('crewroom', { name: 'Crew room', zone: 'gates', at: { x: 107, z: -33 }, summary: 'Pilots and cabin crew report here, pick up the flight plan and weather, and brief before walking to the aircraft.', sop: ['Crew report about 60 to 75 minutes before departure.', 'Captain briefs the crew on the flight, weather and any special passengers.', 'Crew walk to the gate together and board before passengers.'], roles: ['r_pilot', 'r_cabin'], keywords: 'crew briefing room pilots' });

  // ================= RAMP / AIRFIELD OBJECTS =================
  add('aircraft_narrow', {
    name: 'Narrow-body aircraft', zone: 'apron', at: { x: -25, z: -66 },
    summary: 'Single-aisle jets in the A321neo class carry about 190 to 200 passengers in two classes on flights up to about 7 hours.',
    sop: ['Arrive, park, deboard, clean, cater, fuel, board, push back.'], data: [{ k: 'Seats modelled', v: String(SK.AIRCRAFT_TYPES.narrow.seats) }, { k: 'Typical turnaround', v: '35 to 50 min' }], roles: ['r_pilot', 'r_cabin'], keywords: 'plane aircraft narrow body a321',
  });
  add('aircraft_wide', {
    name: 'Wide-body aircraft', zone: 'apron', at: { x: 28, z: -76 },
    summary: 'Twin-aisle jets in the 787-9 class carry about 290 passengers in three classes on long-haul flights.',
    sop: ['Longer turns: more bags, more catering and more fuel.'], data: [{ k: 'Seats modelled', v: String(SK.AIRCRAFT_TYPES.wide.seats) }, { k: 'Typical turnaround', v: '60 to 90 min' }], roles: ['r_pilot', 'r_cabin'], keywords: 'plane aircraft wide body 787 777',
  });
  add('tug', {
    name: 'Pushback tug', zone: 'apron', at: { x: -25, z: -48 },
    summary: 'Aircraft cannot reverse under their own power at the gate, so a tug pushes them back onto the taxilane.',
    sop: ['Tow bar connects to the nose gear; the steering bypass pin is inserted.', 'Driver and flight deck talk by headset; wing walkers watch the wingtips.', 'Tug pushes back and turns the aircraft onto the taxilane.', 'Engines start; tug disconnects, pin removed and shown to the pilots.'], roles: ['r_ramp'], keywords: 'tug pushback tractor towbar',
  });
  add('bagcart', { name: 'Baggage tug and carts', zone: 'apron', at: { x: 121, z: -14 }, summary: 'Carts loaded in the baggage hall are towed to the aircraft and their bags sent up the belt loader into the hold.', sop: ['Load cart in flight order.', 'Tow to the aircraft.', 'Load hold; give the final bag count to the load controller.'], roles: ['r_ramp'], keywords: 'baggage tug cart dolly belt loader' });
  add('marshaller', { name: 'Marshaller', zone: 'apron', at: { x: -25, z: -44 }, summary: 'Guides the aircraft onto the stand with lit wands when there is no automated docking guidance.', regs: [{ src: 'ICAO Annex 2, Appendix 1', text: 'Standard marshalling signals.' }], roles: ['r_marshaller'], keywords: 'marshaller wands parking guide' });
  add('papi', { name: 'PAPI lights', zone: 'runway', at: { x: 400, z: -195 }, summary: 'Precision Approach Path Indicator: four lights beside the runway. Two red and two white means the aircraft is on the approach slope, usually 3 degrees.', regs: [{ src: 'ICAO Annex 14', text: 'Visual approach slope indicator systems.' }], keywords: 'papi glide slope approach lights' });
  add('holdshort', { name: 'Runway holding position', zone: 'runway', at: { x: 430, z: -190 }, summary: 'Two solid and two dashed yellow lines across the taxiway, with a red sign. Aircraft and vehicles stop here until cleared onto the runway. Crossing without clearance is a runway incursion.', regs: [{ src: 'ICAO Annex 14', text: 'Runway-holding position markings and mandatory instruction signs.' }], keywords: 'hold short line incursion' });
  add('radar', { name: 'Surveillance radar', zone: 'tower', at: { x: 150, z: -70, y: 66 }, summary: 'The rotating antenna gives controllers the position of every aircraft near the airport.', keywords: 'radar antenna' });
  add('train', { name: 'Airport rail link train', zone: 'rail', at: { x: -140, z: 42 }, summary: 'Runs between the city and the terminal on a fixed timetable.', keywords: 'train metro' });
  add('shuttle', { name: 'Shuttle bus', zone: 'curb', at: { x: 78, z: 68 }, summary: 'Hotel, parking and rental car shuttles loop between their lots and the curb bays.', keywords: 'shuttle bus coach' });
  add('taxi', { name: 'Taxi', zone: 'curb', at: { x: -80, z: 68 }, summary: 'Taxis drop off on the departures curb and pick up from a rank on the arrivals level.', keywords: 'taxi cab' });
  add('car', { name: 'Private car', zone: 'curb', at: { x: 0, z: 68 }, summary: 'Private drop-offs should stop only long enough to unload.', keywords: 'car vehicle' });
  add('cordon', { name: 'Cordon', zone: 'security', at: { x: 0, z: 40 }, summary: 'Police tape and staff hold people away from a suspect item or an incident until it is resolved.', keywords: 'cordon tape evacuation' });

  // ================= ROLES =================
  const role = (id, name, zone, summary, sop, extra) => add(id, Object.assign({ kind: 'role', name, zone, summary, sop, at: C[zone].at }, extra || {}));
  role('r_pax', 'Passenger', 'checkin', 'Each figure here stands for ' + SK.PAX_PER_FIGURE + ' passengers on the same flight. Click one to follow its journey from the curb to the aircraft.', ['Arrive at the curb or station.', 'Check in and drop bags.', 'Clear security and passport control.', 'Shop, eat or relax, then go to the gate.', 'Board by group.']);
  role('r_checkin', 'Check-in agent', 'checkin', 'Airline or ground-handler staff who check documents, accept bags and solve booking problems.', ['Open the desk on the common-use system.', 'Verify documents against destination rules.', 'Weigh, tag and induct bags.', 'Close the flight at the cut-off.']);
  role('r_tso', 'Security officer (TSO)', 'security', 'Screens people and bags at the checkpoint. Officers rotate between positions to keep image reviewers alert.', ['Rotate positions: podium, divest, X-ray, scanner, search.', 'Resolve alarms with the least intrusive method.', 'Escalate prohibited or dangerous items to police.']);
  role('r_k9handler', 'K9 handler', 'security', 'Works an explosive detection dog through queues and public areas.', ['Keep the dog working and rested.', 'Read the dog\'s alert.', 'Direct alerted passengers to extra screening.']);
  role('r_immigration', 'Border officer', 'passport', 'Government officer who clears departing travellers and supervises the e-gates.', ['Check documents and watch lists.', 'Supervise e-gate failures.', 'Refer suspicious cases.']);
  role('r_gateagent', 'Gate agent', 'gates', 'Runs boarding, the standby list and the final passenger count for each flight.', ['Coordinate with crew.', 'Board by group.', 'Close the flight and offload no-show bags.']);
  role('r_pilot', 'Pilot', 'gates', 'The captain and first officer review the flight plan, weather and fuel, then do the walk-around and cockpit preparation.', ['Brief in the crew room.', 'Walk-around inspection.', 'Load the flight plan, request clearance.', 'Pushback, taxi and take-off.']);
  role('r_cabin', 'Cabin crew', 'gates', 'Responsible for passenger safety: security checks of the cabin, the safety demonstration and any emergency on board.', ['Pre-flight cabin and equipment checks.', 'Welcome and seat passengers.', 'Arm doors before pushback.']);
  role('r_cleaner', 'Cleaner', 'gates', 'Keeps floors, restrooms and seating clean; also reports unattended items and spills that are slip hazards.', ['Patrol an assigned area.', 'Report suspicious items without touching them.']);
  role('r_barista', 'Barista / cook', 'food', 'Prepares food and drink; all supplies arrive through a screened delivery route.', ['Prep before the morning wave.', 'Serve fast to match boarding times.']);
  role('r_retail', 'Retail associate', 'dutyfree', 'Sells duty-free goods and checks the boarding pass to confirm the customer is leaving the country.', ['Scan boarding pass at the till.', 'Seal liquids in a STEB for transfers.']);
  role('r_lounge', 'Lounge host', 'lounge', 'Checks eligibility at the lounge desk and looks after guests.', ['Scan boarding pass.', 'Confirm class or status.']);
  role('r_wheelchair', 'Assistance agent', 'checkin', 'Pushes passengers who need a wheelchair from check-in through security and onto the aircraft.', ['Meet the passenger at the special assistance desk.', 'Use the assistance lane at security.', 'Pre-board before other passengers.']);
  role('r_police', 'Airport police', 'security', 'Respond to incidents, prohibited items, unattended bags and disorderly passengers.', ['Patrol landside and airside.', 'Set cordons for suspect items.', 'Arrest when required.']);
  role('r_marshaller', 'Marshaller', 'apron', 'Guides aircraft onto the stand using standard hand signals.', ['Check the stand is clear.', 'Signal the pilot to the stop line.', 'Signal chocks in.']);
  role('r_ramp', 'Ramp agent', 'apron', 'Loads and unloads bags and cargo, drives tugs and belt loaders and handles pushback.', ['Load to the load plan.', 'Report the final bag count.', 'Push back the aircraft.']);
  role('r_bhs', 'BHS operator', 'bhs', 'Monitors the baggage system, clears jams and reviews bag images flagged by the scanners.', ['Watch the control screens.', 'Clear jams fast.', 'Review flagged images.']);
  role('r_atc', 'Air traffic controller', 'tower', 'Separates aircraft on the ground and in the air.', ['Issue clearances.', 'Sequence the runway.', 'Hand over to the next sector.']);
  role('r_paramedic', 'Paramedic', 'gates', 'Airport medical responders reach any gate within minutes and carry a defibrillator, oxygen and a stretcher.', ['Assess the patient.', 'Treat and stabilise.', 'Transfer to hospital or clear the passenger to fly.']);
  role('r_driver', 'Driver', 'curb', 'Taxi, shuttle and bus drivers who bring passengers to the curb.', ['Stop only in the assigned bay.', 'Unload and move on.']);

  SK.CONTENT = C;

  // ================= GLOSSARY =================
  SK.GLOSSARY = [
    ['ADRM', 'IATA Airport Development Reference Manual. Gives level-of-service ranges for space and waiting time.'],
    ['AIT', 'Advanced Imaging Technology. Body scanners that find metallic and non-metallic items.'],
    ['Airside', 'Everything past security: the sterile area, gates, apron and runways.'],
    ['API', 'Advance Passenger Information. Passport data sent to border agencies before departure.'],
    ['Apron', 'The paved area where aircraft park, load and refuel. Also called the ramp.'],
    ['ARFF', 'Aircraft Rescue and Fire Fighting. The airport fire service.'],
    ['ATC', 'Air Traffic Control.'],
    ['ATR', 'Automated Target Recognition. Body scanner software that shows a generic outline instead of an image.'],
    ['BHS', 'Baggage Handling System. Belts, scanners and sorters that move hold bags.'],
    ['Block time', 'Time from off-block (pushback) to on-block (parked at the destination).'],
    ['Bus gate', 'A gate where passengers board a bus to a remote stand.'],
    ['CT scanner', 'Computed tomography scanner. Builds a 3D image of a bag.'],
    ['CUPPS', 'Common Use Passenger Processing Systems. Lets any airline use any desk.'],
    ['CUSS', 'Common Use Self Service. Shared check-in kiosks.'],
    ['De-icing', 'Spraying glycol fluid to remove and prevent ice on the aircraft before take-off.'],
    ['Divest', 'Putting belongings into trays before screening.'],
    ['EDS', 'Explosive Detection System. Automated scanner for hold bags.'],
    ['e-gate', 'Automated border gate that reads an ePassport chip and matches the face.'],
    ['ePassport', 'Passport with a chip holding the photo and data, defined in ICAO Doc 9303.'],
    ['ETD', 'Estimated time of departure.'],
    ['FIDS', 'Flight Information Display System.'],
    ['GPU', 'Ground Power Unit. Supplies 400 Hz electricity to a parked aircraft.'],
    ['Hold short', 'Stop before the runway holding position until cleared.'],
    ['ILS', 'Instrument Landing System. Radio beams that guide aircraft to the runway in low visibility.'],
    ['Jet bridge', 'Passenger boarding bridge connecting the gate to the aircraft door.'],
    ['K9', 'Detection dog team.'],
    ['Landside', 'Public areas before security: curb, check-in, parking.'],
    ['LAGs', 'Liquids, aerosols and gels.'],
    ['Licence plate (bag)', 'The 10-digit number on a bag tag (IATA Resolution 740).'],
    ['LVP', 'Low Visibility Procedures. Reduced runway capacity in fog.'],
    ['Make-up', 'Area where bags for one flight are collected and loaded onto carts or containers.'],
    ['Marshaller', 'Person who guides aircraft onto the stand with hand signals.'],
    ['METAR', 'Routine aviation weather report.'],
    ['Mishandled bag', 'A bag delayed, damaged, lost or pilfered.'],
    ['NOTAM', 'Notice to Air Missions. Temporary changes such as a closed taxiway.'],
    ['No-show', 'A checked-in passenger who does not board.'],
    ['Off-block', 'The moment the aircraft starts moving from the stand. Departure punctuality is measured here.'],
    ['OTP', 'On-time performance. Share of flights leaving within 15 minutes of schedule.'],
    ['PAPI', 'Precision Approach Path Indicator lights.'],
    ['PCA', 'Pre-conditioned air supplied to a parked aircraft.'],
    ['PNR', 'Passenger Name Record. The booking.'],
    ['PRM', 'Passenger with reduced mobility.'],
    ['Pushback', 'Pushing an aircraft backwards off the stand with a tug.'],
    ['Reactionary delay', 'Delay caused by the same aircraft or crew arriving late from an earlier flight.'],
    ['Remote stand', 'Aircraft parking position away from the terminal.'],
    ['Runway incursion', 'Any unauthorised presence of an aircraft, vehicle or person on a runway.'],
    ['Secondary screening', 'Extra checks after an alarm: bag search, trace swab or pat-down.'],
    ['SOP', 'Standard Operating Procedure.'],
    ['Stand', 'A marked aircraft parking position.'],
    ['STD', 'Scheduled time of departure.'],
    ['STEB', 'Security tamper-evident bag for liquids bought airside.'],
    ['Sterile area', 'The screened zone between security and the aircraft.'],
    ['Taxiway', 'Paved path aircraft use to move between runway and apron.'],
    ['Tug', 'Vehicle that pushes aircraft or tows baggage carts.'],
    ['Turnaround', 'Everything that happens to an aircraft between arrival and the next departure.'],
    ['ULD', 'Unit Load Device. Container or pallet loaded into wide-body holds.'],
    ['Wake turbulence', 'Rotating air behind an aircraft; sets spacing between departures.'],
    ['Wing walker', 'Ramp agent who watches wingtip clearance during pushback.'],
  ].map(([term, def]) => ({ term, def }));

  // ================= QUIZ =================
  SK.QUIZ = [
    { q: 'Runway 27 points roughly which way?', o: ['North', 'East', 'South', 'West'], a: 3, why: 'Runway numbers are the magnetic heading divided by ten: 27 is about 270 degrees, west.', ref: 'runway' },
    { q: 'What sets the throughput of a security lane?', o: ['The number of officers on the podium', 'Its slowest step, usually divest', 'The length of the queue', 'The body scanner brand'], a: 1, why: 'A lane is a pipeline. Nobody moves forward until the next station is free, so the slowest step limits the whole lane.', ref: 'lane' },
    { q: 'TSA 3-1-1: each liquid container in a carry-on can be at most…', o: ['50 ml', '100 ml (3.4 oz)', '250 ml', '1 litre'], a: 1, why: '3.4 oz (100 ml) containers, in one quart-size bag, one bag per passenger.', ref: 'lane' },
    { q: 'How many digits are in a bag tag licence plate number?', o: ['6', '8', '10', '12'], a: 2, why: 'IATA Resolution 740 defines a 10-digit licence plate.', ref: 'checkin' },
    { q: 'IATA Resolution 753 requires airlines to…', o: ['Weigh every bag twice', 'Track bags at key points such as acceptance and loading', 'Screen bags with CT', 'Refund lost bags in 24 hours'], a: 1, why: 'Since June 2018 airlines must record bag custody at acceptance, loading, transfer and arrival.', ref: 'bhs' },
    { q: 'A flight counts as on time if it leaves within how many minutes of schedule?', o: ['5', '10', '15', '30'], a: 2, why: 'The standard on-time measure is within 15 minutes.', ref: 'gates' },
    { q: 'A PAPI shows two red and two white lights. The aircraft is…', o: ['Too high', 'On the approach slope', 'Too low', 'Cleared to land'], a: 1, why: 'Two red, two white means on slope; more white is high, more red is low.', ref: 'papi' },
    { q: 'What does an explosive detection dog do when it finds an odour?', o: ['Barks', 'Sits (passive alert)', 'Grabs the bag', 'Runs to the handler'], a: 1, why: 'Detection dogs give a passive alert so they never disturb a device.', ref: 'k9' },
    { q: 'What does an e-gate compare the traveller\'s live face with?', o: ['A police database photo', 'The photo in the passport chip', 'The boarding pass photo', 'A selfie taken at check-in'], a: 1, why: 'The gate reads the ePassport chip (ICAO Doc 9303) and matches the live face to the chip photo.', ref: 'egate' },
    { q: 'Why does the departure path run through duty free?', o: ['Fire code requires it', 'Retail revenue helps fund the airport', 'It is the shortest path', 'Customs requires it'], a: 1, why: 'Non-aeronautical revenue, mainly retail, food and parking, is about 40% of airport revenue worldwide.', ref: 'dutyfree' },
    { q: 'Under ICAO Annex 17, a hold bag can fly without its passenger only if…', o: ['The bag is under 23 kg', 'The airline agrees', 'It is screened and authorised to travel separately', 'Never'], a: 2, why: 'Passenger-baggage reconciliation: unaccompanied bags need extra screening and authorisation.', ref: 'gates' },
    { q: 'What does the jet bridge supply to the aircraft besides a walkway?', o: ['Fuel', 'Ground power and conditioned air', 'Potable water only', 'Catering'], a: 1, why: '400 Hz ground power and pre-conditioned air let the crew shut down the APU.', ref: 'jetbridge' },
    { q: 'Who usually boards first?', o: ['Economy group 1', 'Passengers needing assistance', 'First class', 'Standby passengers'], a: 1, why: 'Pre-boarding for passengers with reduced mobility comes before group boarding.', ref: 'gates' },
    { q: 'What is a runway incursion?', o: ['A late landing', 'An unauthorised aircraft, vehicle or person on a runway', 'A bird strike', 'Runway lights failing'], a: 1, why: 'Holding positions and clearances exist to prevent incursions.', ref: 'holdshort' },
    { q: 'Which ICAO document defines electronic passports?', o: ['Annex 14', 'Doc 4444', 'Doc 9303', 'Annex 2'], a: 2, why: 'Doc 9303 covers machine readable travel documents.', ref: 'passport' },
    { q: 'What does the steering bypass pin do during pushback?', o: ['Locks the brakes', 'Disconnects nose-wheel steering so the tug can turn the aircraft', 'Starts the engines', 'Connects the headset'], a: 1, why: 'The pin is removed and shown to the pilots after the tug disconnects.', ref: 'tug' },
    { q: 'What happens to a bag that reaches make-up after its cart has left?', o: ['It is destroyed', 'It becomes a mishandled (short-shipped) bag', 'It goes on the next flight automatically with no record', 'The flight waits'], a: 1, why: 'It is rushed on a later flight and counts against the mishandled rate.', ref: 'bhs' },
    { q: 'IATA ADRM optimum wait at security is…', o: ['0 to 2 min', '5 to 10 min', '20 to 30 min', '45 min'], a: 1, why: 'ADRM gives 5 to 10 minutes as the optimum range.', ref: 'security' },
    { q: 'Why does a body scanner with ATR show a generic outline?', o: ['To save power', 'To protect privacy', 'Because it cannot see the body', 'To speed the belt'], a: 1, why: 'Automated target recognition flags areas on an outline; no image of the person is shown.', ref: 'bodyscanner' },
    { q: 'What is reactionary delay?', o: ['Delay caused by passenger complaints', 'Delay passed on from an earlier late flight of the same aircraft or crew', 'ATC delay', 'Delay from a bird strike'], a: 1, why: 'A late inbound aircraft delays the outbound flight, and the delay can cascade all day.', ref: 'apron' },
  ];
})();
