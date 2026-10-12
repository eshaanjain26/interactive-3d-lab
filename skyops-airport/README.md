# SkyOps Airport Simulator

A browser-based 3D simulation of a fictional international airport, SKY International.

- **Pass 1, Departures:** curb and rail link, check-in, security with K9, passport control, walk-through duty free, food court, lounges, gates with jet bridges and a bus gate, the baggage hall, the apron and runway 27.
- **Pass 3, Support:** a cargo terminal with freighter turns on stand C1 (ULD dolly trains, high loader, bonded area), a maintenance hangar with an aircraft on a check, a fuel farm with a hydrant pipe rack and dispensers fuelling every turnaround, an ARFF fire station with response drills, the airport operations centre with a live video wall, and the central utility plant.
- **Pass 2, Arrivals:** deplaning from every inbound aircraft, a sterile arrivals corridor, arrivals immigration (booths and e-gates), baggage claim with three carousels and baggage services, green/red customs channels, the arrivals hall and the pickup curb.

Open `index.html` in a browser. No install, no build step for viewers.

## What you can do

- **Explore.** Orbit, pan and zoom; fly to any zone from the panel, the minimap or the search box (`baggage`, `K9`, `runway 27`, a flight number).
- **Click anything.** People, desks, scanners, bags and aircraft open a card with an overview, the SOP, the rules behind it (ICAO, IATA, TSA, FAA, EU), benchmark data, roles, and a live view. Every card has an animated explainer.
- **Follow.** Follow a passenger party from the curb to their seat (their journey log fills in), a bag through CT screening to the hold, or an aircraft from landing to take-off.
- **Cameras.** Strategy, top-down, walk (WASD or touch joystick), nine CCTV feeds, drone orbit.
- **Time and weather.** Pause to 8x; clear, rain, fog, snow, thunderstorm; lighting follows the clock or a fixed time of day.
- **Modes.** Sandbox (auto staffing), Operations (you open and close desks, lanes, booths and e-gates against a staffing cost), Crisis (eight incidents with timed decisions and a scored debrief: unattended bag, medical, X-ray failure, check-in outage, thunderstorm, runway incursion, bird strike, ransomware).
- **Learn.** Live KPI dashboard, a quiz, a 58-term glossary, and a "who does what" role directory.

## What is simulated

| System | Model |
|---|---|
| Demand | 66 hours of departures across 5 gates; load factor 74 to 94%; each figure is 4 passengers arriving 100 to 205 min before departure by car, taxi, bus, rail or garage |
| Check-in | Priority, economy, kiosk, auto bag drop, special assistance; serpentine queues; service times per channel |
| Security | Document check, then pipelined lanes (loading, divest, scan, recompose); the slowest step sets throughput; secondary search, pat-down, K9 alerts |
| Border | Manual booths and e-gates with eligibility |
| Airside | Duty-free purchases, food court, lounges, prayer, nursing and smoking rooms |
| Boarding | Pre-boarding, groups 1 to 4, final call, gate close at STD-15, missed passengers |
| Bags | Belt, CT level 1/3 screening, carousel, cart departure at STD-28, short-shipped bags counted as mishandled |
| Aircraft | Approach, landing, taxi-in, marshalling, bridge docking, turnaround, pushback, de-icing in snow, take-off; single-runway lock; late inbound aircraft cause reactionary delays |
| Arrivals | Each inbound aircraft deplanes 70 to 92% of seats; bags towed to the inbound hall and fed to a carousel; first and last bag times from on-blocks; 1.5% delayed bags filed as PIRs; 4% red channel with duty, 3% green-channel stops |
| Support | Three freighter turns a day (imports to the bonded area, exports loaded in sequence); hydrant fuelling on every pax turnaround; ARFF drills report time to position |
| KPIs | Waits graded against IATA ADRM optimum ranges, security throughput, on-time (off-blocks within 15 min), mishandled bags per 1,000, missed-flight rate, retail and F&B sales, staffing cost, satisfaction |

## Develop

```bash
node build.mjs          # concatenate src/ into index.html
node --test test/*.test.mjs   # pure-module tests (nav graph, queues, lanes, schedule, search, content)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the stack, module map, scene graph, zone map, time model and how to add a zone.

SKY International, its airlines and flights are fictional. Process steps, rules and figures come from public ICAO, IATA, TSA, FAA, EU and industry sources and are shown as typical ranges.
