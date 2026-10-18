// SkyOps accessibility + settings: theme, colour-blind palette, text size, reduced motion, announcements, keyboard map.
SK.settings = (function () {
  const S = { theme: 'auto', cb: false, text: 1, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches, speech: false, autoQuality: true, ambient: false, atc: false };
  try { Object.assign(S, JSON.parse(localStorage.getItem('skyops.settings') || '{}')); } catch (e) { /* storage unavailable */ }
  S.save = function () { try { localStorage.setItem('skyops.settings', JSON.stringify({ theme: S.theme, cb: S.cb, text: S.text, reduced: S.reduced, speech: S.speech, autoQuality: S.autoQuality, ambient: S.ambient, atc: S.atc })); } catch (e) { /* ignore */ } };
  S.apply = function () {
    const r = document.documentElement;
    if (S.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', S.theme);
    r.setAttribute('data-cb', S.cb ? 'on' : 'off');
    r.style.setProperty('--font', Math.round(13 * S.text) + 'px');
    SK.reducedMotion = S.reduced;
    SK.engine.reducedMotionBloomOff = S.reduced;
    SK.engine.autoQuality = S.autoQuality;
    SK.engine.bloom.enabled = SK.engine.quality.bloom && !S.reduced;
    SK.bus.emit('settings', S);
  };
  // spoken announcements for boarding calls (off by default)
  S.say = function (text) {
    if (!S.speech || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02; u.pitch = 1;
    window.speechSynthesis.speak(u);
  };
  SK.bus.on('ops', (e) => { if (/now boarding|final call/.test(e.msg)) S.say(e.msg.replace(/SK /g, 'S K ')); });
  S.apply();

  S.KEYS = [
    ['W A S D / arrows', 'Pan the camera (walk in Walk mode)'], ['Q / E', 'Rotate'], ['+ / -', 'Zoom'],
    ['1 to 5', 'Camera: strategy, top, walk, CCTV, drone'], ['Space', 'Pause / resume'], ['[ / ]', 'Slower / faster'],
    ['/', 'Search'], ['F', 'Follow a passenger'], ['B', 'Flight board'], ['L', 'Learn: dashboard, quiz, glossary'],
    ['Z', 'Zones and layers panel'], [', / .', 'Previous / next CCTV camera'], ['Esc', 'Close panels, stop following'], ['?', 'This help'],
  ];
  return S;
})();
