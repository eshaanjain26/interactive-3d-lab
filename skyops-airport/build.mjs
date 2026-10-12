// Build: concatenate src modules into one self-contained index.html.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (f) => fs.readFileSync(path.join(here, 'src', f), 'utf8');
export const ORDER = [
  'core/namespace.js', 'data/layout.js', 'data/schedule.js', 'data/content.js', 'sim/queue.js', 'sim/search.js',
  'engine/renderer.js', 'engine/kit.js', 'engine/sky.js', 'engine/camera.js',
  'world/landside.js', 'world/terminal.js', 'world/airfield.js', 'world/aircraft.js',
  'sim/crowd.js', 'sim/agents.js', 'sim/bags.js', 'sim/ops.js', 'world/arrivals.js', 'world/support.js', 'sim/crisis.js',
  'ui/a11y.js', 'ui/overlays.js', 'ui/hud.js', 'ui/edu.js', 'main.js',
];
const body = ORDER.filter((f) => fs.existsSync(path.join(here, 'src', f))).map((f) => `// ===== ${f} =====\n${src(f)}`).join('\n');
const guarded = `(function () {
if (!window.THREE || !THREE.OrbitControls || !THREE.UnrealBloomPass || !THREE.BufferGeometryUtils) { document.getElementById('err').style.display = 'grid'; return; }
try {
${body}
} catch (e) {
  console.error(e);
  document.getElementById('err').style.display = 'grid';
}
})();`;
const html = src('shell.html').replace('/*@MODULES@*/', () => guarded);
fs.writeFileSync(path.join(here, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
