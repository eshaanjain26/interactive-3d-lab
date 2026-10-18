// SkyOps bootstrap: build the schedule, warm the sim up headless, then start rendering.
SK.main = (function () {
  const E = SK.engine;
  const bar = document.getElementById('loadBar'), txt = document.getElementById('loadText');
  SK.ops.build();
  const START = SK.minutes(3 * 60 + 50), WARM_TO = SK.minutes(6 * 60 + 30);
  SK.sim.now = START;

  E.onFrame((dtGame, dtReal) => {
    SK.ops.update(dtGame);
    SK.ops.visual(dtGame, dtReal);
    SK.crowd.update(SK.agents.rendered());
    SK.sky.update(dtGame, dtReal, SK.sim.now);
    if (SK.ui) SK.ui.frame(dtGame, dtReal);
  });

  // warm-up in chunks so the loading bar can paint
  function warm() {
    const t0 = performance.now();
    while (SK.sim.now < WARM_TO && performance.now() - t0 < 40) SK.ops.update(0.25);
    const u = (SK.sim.now - START) / (WARM_TO - START);
    bar.style.width = Math.round(u * 100) + '%';
    txt.textContent = 'Running the early shift: ' + SK.fmtTime(SK.sim.now);
    if (SK.sim.now < WARM_TO) return setTimeout(warm, 0);
    SK.ops.visual(0, 1);
    SK.cam.flyTo({ x: -5, z: 8 }, { pos: [150, 175, 215], dur: 0 });
    E.start();
    document.getElementById('loading').remove();
    if (SK.ui) SK.ui.ready();
  }
  setTimeout(warm, 30);
  return {};
})();
