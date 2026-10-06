# Interactive 3D Lab

Eighteen interactive Three.js explorers covering chips, quantum computing, AI, AI sustainability, robotics, logistics, audio, anatomy, embryology, energy, space and U.S. immigration law. Each one is a single self-contained HTML file.

**Live site:** https://eshaanjain26.github.io/interactive-3d-lab/

| Explorer | What it shows |
|---|---|
| [Chip Depth Explorer](https://eshaanjain26.github.io/interactive-3d-lab/chip-depth-explorer/) | Continuous zoom from a packaged processor down to an 18 nm FinFET gate, across six scales |
| [Quantum Qubit Sandbox](https://eshaanjain26.github.io/interactive-3d-lab/quantum-qubit-sandbox/) | Two Bloch spheres with animated H, X, Y, Z, S, T and CNOT gates, live entanglement (concurrence), and measurement collapse |
| [Attention Lens](https://eshaanjain26.github.io/interactive-3d-lab/attention-lens/) | A transformer block in 3D: embeddings, attention heads, residual stream |
| [Neural Network Lab](https://eshaanjain26.github.io/interactive-3d-lab/neural-network-lab/) | Signals moving through a feedforward network, editable weights, animated backpropagation |
| [Q-Learning Grid World](https://eshaanjain26.github.io/interactive-3d-lab/q-learning-grid-world/) | A tabular Q-learning agent trained live, with a Q-table view |
| [EV Teardown Explorer](https://eshaanjain26.github.io/interactive-3d-lab/ev-teardown-explorer/) | A dual-motor electric sedan in exploded view, with component specs |
| [Microgrid Flow](https://eshaanjain26.github.io/interactive-3d-lab/microgrid-flow/) | Smart-city microgrid supply and demand, shown live |
| [Cardiac Flow Lab](https://eshaanjain26.github.io/interactive-3d-lab/cardiac-flow-lab/) | Four chambers, four valves, one cardiac cycle |
| [Glass Body Atlas](https://eshaanjain26.github.io/interactive-3d-lab/glass-body-atlas/) | A see-through anatomy atlas of the organ systems |
| [Coronary Stent Lab](https://eshaanjain26.github.io/interactive-3d-lab/coronary-stent-lab/) | A beating heart with a blocked coronary artery: toggleable anatomy layers, stent delivery and balloon expansion on a scrubbable timeline, and blood flow that speeds up once the artery opens |
| [Fetal Growth Timeline Lab](https://eshaanjain26.github.io/interactive-3d-lab/fetal-growth-timeline/) | Embryo and fetus from week 1 to 40 by day: length and weight, a real-scale comparison object, and organ-system milestones |
| [EB-1 Adjudication Lab](https://eshaanjain26.github.io/interactive-3d-lab/eb1-adjudication-lab/) | The EB-1A petition in 3D: lifecycle timeline, the ten criteria, USCIS two-step adjudication with outcome simulation, and AAO review |
| [Heliocentric Orrery](https://eshaanjain26.github.io/interactive-3d-lab/heliocentric-orrery/) | A 3D solar system simulator |
| [Drone Swarm Boids](https://eshaanjain26.github.io/interactive-3d-lab/drone-swarm-boids/) | Reynolds flocking across up to 600 quadcopters, with click-placed beacons, hazards and obstacles, three camera modes and live swarm telemetry |
| [AMR Fulfillment Floor](https://eshaanjain26.github.io/interactive-3d-lab/amr-fulfillment-floor/) | A goods-to-person warehouse: 4 to 20 robots lift racks, queue at picking stations, yield in the aisles and recharge, with live KPIs, route overlays and a traffic heat map |
| [Audio Spectrum Matrix](https://eshaanjain26.github.io/interactive-3d-lab/audio-spectrum-matrix/) | A neon wireframe terrain driven by live FFT data from a built-in synth, microphone or audio file |
| [Fire Evacuation Drill](https://eshaanjain26.github.io/interactive-3d-lab/fire-evacuation-drill/) | A five-floor office in a fire drill: up to 200 occupants pick the nearest safe exit, queue in corridors and spiral down stairwells while fire and smoke spread, block routes and force reroutes |
| [TokenLens 3D: CAIR Explorer](https://eshaanjain26.github.io/interactive-3d-lab/tokenlens-3d/) | An LLM request through ten layers: a TokenLens gateway (proxy, token-waste analyzer, kill switches and quotas) and CAIR carbon-aware routing (complexity scorer, live carbon formula, budget state machine, router, audit log), with ablation modes and simulated traffic |

## Run locally

The pages load Three.js as ES modules from jsDelivr, so serve the folder over HTTP rather than opening files directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.
