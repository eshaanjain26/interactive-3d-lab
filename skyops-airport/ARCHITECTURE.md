# SkyOps architecture

SkyOps is a browser-based simulation of a fictional international airport, SKY International (runway 09/27). Pass 1 ships the core engine and a fully working International Departures vertical slice. Every other zone is placed on the map as massing and marked for a later pass.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Rendering | Three.js r128 (WebGL2), ACES tone mapping, PCF soft shadows, UnrealBloom | Matches every other 3D Lab explorer; loads from cdnjs/jsDelivr with no build step for the viewer |
| Models | Procedural low-poly geometry built in code | No GLB licensing risk, no asset downloads, whole app stays one file under 400 KB |
| People | One `InstancedMesh` per body part, per-instance colour, matrices composed each frame | 300+ animated figures cost about 12 draw calls |
| Simulation | Plain JS state machines on the main thread, fixed 0.1 s step | At pass-1 agent counts (~350) the sim costs well under 1 ms per frame, so a Web Worker would add message-passing cost and complexity without a frame-time win. The sim modules have no DOM or Three.js dependency, so they can move into a worker when arrivals and ramp push counts past ~2,000 |
| UI | Vanilla DOM + CSS tokens, light and dark themes | No framework runtime; HUD panels are plain elements over the canvas |
| Build | `node build.mjs` concatenates `src/` into `index.html` | Source stays modular and testable; the shipped artifact is one self-contained page |
| Tests | `node --test test/` on the pure modules | Queue maths, schedule, nav graph, search and content integrity run without a browser |

## Module map

```
src/
  shell.html            page skeleton, HUD markup, CSS tokens
  core/namespace.js     SK namespace, seeded RNG, maths helpers, event bus
  data/layout.js        every coordinate in the airport + pedestrian nav graph (pure)
  data/schedule.js      airlines, destinations, departure schedule generator (pure)
  data/content.js       learn entries (SOP, rules, data, roles, explainer), glossary, quiz (pure)
  sim/queue.js          serpentine queues, multi-server stations, pipelined security lanes (pure)
  sim/search.js         search index over zones, entries, glossary, flights (pure)
  engine/renderer.js    renderer, scene, composer, main loop, picking registry
  engine/kit.js         materials, geometry helpers, canvas text textures
  engine/sky.js         day/night lighting + weather (rain, fog, snow, storm, lightning)
  engine/camera.js      fly-to, strategy / top-down / walk / follow / CCTV / drone modes
  world/landside.js     roads, curb, garage, rail station, road vehicles
  world/terminal.js     building shell, check-in, security, passport, airside, gates
  world/airfield.js     apron, stands, jet bridges, taxiways, runway, lights, tower, future-zone massing
  world/aircraft.js     aircraft factory and the flight movement state machine
  world/arrivals.js     pass 2: arrivals corridor, immigration, claim, customs, hall, pickup, inbound bags
  sim/crowd.js          instanced human + dog renderer
  sim/agents.js         agent movement, passenger lifecycle, staff behaviours
  sim/bags.js           baggage handling system and follow-a-bag tracking
  sim/ops.js            flights, boarding, delays, KPIs, event log, operations levers
  sim/crisis.js         crisis scenarios and decision cards
  ui/hud.js             top bar, side panels, bottom bar, flight board, info panel
  ui/overlays.js        minimap, labels, heat map, flow lines
  ui/edu.js             explainer player, quiz, glossary, tutorial, search box
  ui/a11y.js            colour-blind palettes, text size, reduced motion, keyboard map
  main.js               bootstrap and warm-up
```

Load order is the order above. Each file adds to the global `SK` object; nothing else is global.

## Scene graph

```
scene
├─ sky: hemisphere light, sun (directional + shadow), sky dome, stars, weather particles
├─ landside: roads + markings, curb, garage, rail station + train, vehicle pool
├─ terminal
│  ├─ shell: floor slab, glass facade, partitions, roof (layer), ceiling light strips
│  ├─ checkin: counters, kiosks, bag drops, belts, stanchion queues, FIDS boards, signage
│  ├─ security: doc-check podiums, lanes (belt, X-ray tunnel, body scanner, trays), search area
│  ├─ passport: booths, e-gates (animated doors)
│  ├─ airside: duty free, food court, lounge, prayer / nursing / smoking rooms
│  └─ gates: holding seats (instanced), podiums, gate screens
├─ bhs: collector belts, CT scanner, sorter, make-up carousel, carts
├─ airfield: apron, stand markings, jet bridges (animated), taxiways, runway, lights, PAPI, tower + radar
├─ aircraft: pooled aircraft groups, tugs, bag carts, belt loaders, marshallers
├─ crowd: instanced body parts (legs, torso, arms, head, hair, hats, cases, wheelchairs) + dogs
└─ overlays: heat-map plane, flow-line tubes, cordons and crisis props
```

## Zone map (metres, +x east, +z landside, -z airside)

| Zone | Footprint | Pass |
|---|---|---|
| Road loop + curb | x -160..160, z 58..90 | 1 |
| Parking garage | x -60..60, z 96..134 | 1 (massing + cars) |
| Rail station | x -146..-118, z 6..76 | 1 |
| Check-in hall | x -100..100, z 30..56 | 1 |
| Security | x -78..78, z 4..29 | 1 |
| Passport control | x -66..60, z -10..3 | 1 |
| Duty free (walk-through) | x -40..40, z -24..-11 | 1 |
| Food court / lounge | x -98..-48 / 48..98, z -24..-12 | 1 |
| Gates A1-A4 (bridges), A5 (bus) | z -40..-26 | 1 |
| Baggage hall (BHS) | x 102..140, z -18..36 | 1 |
| Apron + stands | z -40..-110 | 1 (turnaround visuals) |
| Taxiway / runway 09/27 | z -150 / -220, x -460..460 | 1 (movements) |
| ATC tower | x 150, z -70 | 1 |
| Arrivals corridor | z -41.4 at y 5.2, x -97..172, then to the east pier | 2 |
| Arrivals immigration, claim, customs, hall | x 190..290, z -10..50 | 2 |
| Pickup curb + road | x 292..307 | 2 |
| Cargo terminal, fuel farm, hangar, fire station, EOC | airfield edges | 3 |

## Time model

- Game time runs at real seconds times the speed setting (pause, 1x, 2x, 4x, 8x).
- The clock shows sim time, compressed 10:1 (one game second is 10 sim seconds), so a 100-minute gate turn takes 10 minutes at 1x and 75 seconds at 8x.
- Movement stays close to real speeds so motion reads naturally (walking 2 m/s, aircraft 1.6x real taxi speed); service times are compressed with the clock.
- Tuning note: at 30:1 a 400 m walk cost ~90 sim minutes and passengers missed flights. 10:1 keeps walking to ~35 sim minutes, inside the 100 to 205 minute arrival window passengers use for international departures.
- Each passenger figure represents 4 passengers. KPIs report real passenger numbers.
- On start the sim runs headless from 04:30 to 06:00 so queues, bags and aircraft are already in a consistent mid-flow state.

## Performance

- Crowd: instanced parts, matrices only for visible figures, no per-figure materials.
- Seats, kiosks, stanchions, runway lights: instanced.
- Adaptive quality: if the 3-second average drops under 40 fps the renderer steps down pixel ratio, then shadows, then bloom; it steps back up when headroom returns.
- Labels are DOM elements positioned from projected anchors, capped to on-screen ones.

## Accessibility

- Colour-blind safe palettes (Okabe-Ito for status, viridis/cividis for the heat map), switchable.
- Text size scale, reduced motion (instant camera cuts, no bloom pulse), high-contrast labels.
- Every control is a real button with an `aria-label`; the event log is an `aria-live` region; full keyboard map (`?` lists it).

## Adding a zone (pass 2+)

1. Add coordinates and nav-graph nodes to `data/layout.js`.
2. Build geometry in a new `world/<zone>.js`; register clickable meshes with `SK.pick.add(mesh, entryId)`.
3. Add learn entries to `data/content.js` (the integrity test fails if a referenced id is missing).
4. Add the passenger or staff states in `sim/agents.js` and any new station via `SK.Station`.
5. Add the zone to `SK.ZONES` so the minimap, search and fast travel pick it up.
