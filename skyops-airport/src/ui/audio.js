// SkyOps audio (opt-in): procedural ambience (terminal hum, crowd murmur, jet rumble near aircraft) and ATC radio calls.
// Everything is synthesised with WebAudio and speechSynthesis, so there are no audio files to load.
SK.audio = (function () {
  const S = SK.settings;
  const A = { ctx: null };
  let master, hum, crowd, jet, jetGain, crowdGain;

  function noiseBuffer(ctx, seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }   // brown noise
    return b;
  }
  function loop(ctx, buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  // AudioContext can only start after a user gesture; settings toggles provide one
  A.start = function () {
    if (A.ctx) { A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    const buf = noiseBuffer(ctx, 4);
    // terminal HVAC hum: low-passed noise plus a quiet 60 Hz tone
    hum = ctx.createBiquadFilter(); hum.type = 'lowpass'; hum.frequency.value = 180;
    const hg = ctx.createGain(); hg.gain.value = 0.18;
    loop(ctx, buf).connect(hum); hum.connect(hg); hg.connect(master);
    const tone = ctx.createOscillator(); tone.frequency.value = 60; const tg = ctx.createGain(); tg.gain.value = 0.015; tone.connect(tg); tg.connect(master); tone.start();
    // crowd murmur: band-passed noise whose level follows how many people are near the camera
    crowd = ctx.createBiquadFilter(); crowd.type = 'bandpass'; crowd.frequency.value = 600; crowd.Q.value = 0.8;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
    loop(ctx, buf).connect(crowd); crowd.connect(crowdGain); crowdGain.connect(master);
    // jet rumble: louder near moving aircraft, much louder at take-off
    jet = ctx.createBiquadFilter(); jet.type = 'lowpass'; jet.frequency.value = 400;
    jetGain = ctx.createGain(); jetGain.gain.value = 0;
    loop(ctx, buf).connect(jet); jet.connect(jetGain); jetGain.connect(master);
  };
  A.stop = function () { if (A.ctx) A.ctx.suspend(); };

  // chime before a terminal announcement
  A.chime = function () {
    if (!A.ctx || !S.ambient) return;
    const t = A.ctx.currentTime;
    [659, 523].forEach((f, i) => {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.45); g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.45 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.45 + 0.9);
      o.connect(g); g.connect(master); o.start(t + i * 0.45); o.stop(t + i * 0.45 + 1);
    });
  };

  // ATC radio: short tower calls in standard phraseology when an aircraft lands, lines up or takes off
  let lastRadio = 0;
  SK.bus.on('ops', (e) => {
    if (!S.atc || !window.speechSynthesis) return;
    if (performance.now() - lastRadio < 4000) return;
    let msg = null;
    const call = (txt) => txt.replace(/\b([A-Z]{2}) (\d+)/g, (m, a, n) => ({ SK: 'Sky', NW: 'Northwind', AU: 'Aurora', MR: 'Meridian', CB: 'Cobalt', SC: 'Sky Cargo' }[a] || a) + ' ' + n.split('').join(' '));
    if (/cleared for take-off/.test(e.msg)) msg = call(e.msg.split(' cleared')[0]) + ', runway two seven, wind calm, cleared for take-off.';
    else if (/landed on 27/.test(e.msg)) msg = call(e.msg.split(' landed')[0]) + ', vacate left when able, contact ground.';
    else if (/pushback approved/.test(e.msg)) msg = call(e.msg.split(' pushback')[0]) + ', push and start approved, face east.';
    if (!msg) return;
    lastRadio = performance.now();
    const u = new SpeechSynthesisUtterance('Sky Tower. ' + msg);
    u.rate = 1.15; u.pitch = 0.85; u.volume = 0.8;
    window.speechSynthesis.speak(u);
  });
  SK.bus.on('ops', (e) => { if (/now boarding|final call/.test(e.msg)) A.chime(); });

  window.addEventListener('pointerdown', () => { if ((S.ambient || S.atc) && (!A.ctx || A.ctx.state !== 'running')) A.start(); }, { once: false });
  const v = new THREE.Vector3();
  A.frame = function () {
    if (!A.ctx || A.ctx.state !== 'running') return;
    const cam = SK.engine.camera.position, t = A.ctx.currentTime;
    // people within 40 m of the camera target
    const tg = SK.engine.controls.target;
    let n = 0;
    for (const a of SK.agents.list) if (!a.hidden && Math.abs(a.x - tg.x) < 40 && Math.abs(a.z - tg.z) < 40) n++;
    const near = SK.clamp(1 - cam.distanceTo(tg) / 250, 0, 1);
    crowdGain.gain.setTargetAtTime(S.ambient ? Math.min(0.5, n / 120) * near : 0, t, 0.5);
    let jl = 0;
    for (const p of SK.aircraft.planes) {
      if (!p.grp.visible || p.state === 'parked' || p.state === 'queued') continue;
      v.set(p.x, p.y || 0, p.z);
      const d = cam.distanceTo(v);
      const loud = p.state === 'takeoff' ? 1 : p.state === 'approach' || p.state === 'rollout' ? 0.6 : 0.25;
      jl = Math.max(jl, loud * SK.clamp(1 - d / 700, 0, 1));
    }
    jetGain.gain.setTargetAtTime(S.ambient ? jl * 0.9 : 0, t, 0.3);
    master.gain.setTargetAtTime(S.ambient || S.atc ? 0.5 : 0, t, 0.2);
  };
  return A;
})();
