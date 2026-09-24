# Interactive 3D Lab

Eleven interactive Three.js explorers covering chips, AI, robotics, anatomy, energy, space and U.S. immigration law. Each one is a single self-contained HTML file.

**Live site:** https://eshaanjain26.github.io/interactive-3d-lab/

| Explorer | What it shows |
|---|---|
| [Chip Depth Explorer](https://eshaanjain26.github.io/interactive-3d-lab/chip-depth-explorer/) | Continuous zoom from a packaged processor down to an 18 nm FinFET gate, across six scales |
| [Attention Lens](https://eshaanjain26.github.io/interactive-3d-lab/attention-lens/) | A transformer block in 3D: embeddings, attention heads, residual stream |
| [Neural Network Lab](https://eshaanjain26.github.io/interactive-3d-lab/neural-network-lab/) | Signals moving through a feedforward network, editable weights, animated backpropagation |
| [Q-Learning Grid World](https://eshaanjain26.github.io/interactive-3d-lab/q-learning-grid-world/) | A tabular Q-learning agent trained live, with a Q-table view |
| [Drone Swarm Boids](https://eshaanjain26.github.io/interactive-3d-lab/drone-swarm-boids/) | Reynolds flocking across up to 600 quadcopters, with click-placed beacons, hazards and obstacles, three camera modes and live swarm telemetry |
| [EV Teardown Explorer](https://eshaanjain26.github.io/interactive-3d-lab/ev-teardown-explorer/) | A dual-motor electric sedan in exploded view, with component specs |
| [Microgrid Flow](https://eshaanjain26.github.io/interactive-3d-lab/microgrid-flow/) | Smart-city microgrid supply and demand, shown live |
| [Cardiac Flow Lab](https://eshaanjain26.github.io/interactive-3d-lab/cardiac-flow-lab/) | Four chambers, four valves, one cardiac cycle |
| [Glass Body Atlas](https://eshaanjain26.github.io/interactive-3d-lab/glass-body-atlas/) | A see-through anatomy atlas of the organ systems |
| [EB-1 Adjudication Lab](https://eshaanjain26.github.io/interactive-3d-lab/eb1-adjudication-lab/) | The EB-1A petition in 3D: lifecycle timeline, the ten criteria, USCIS two-step adjudication with outcome simulation, and AAO review |
| [Heliocentric Orrery](https://eshaanjain26.github.io/interactive-3d-lab/heliocentric-orrery/) | A 3D solar system simulator |

## Run locally

The pages load Three.js as ES modules from jsDelivr, so serve the folder over HTTP rather than opening files directly:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/.
