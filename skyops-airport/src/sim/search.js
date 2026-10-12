// SkyOps search. Pure logic. Items: { id, type, title, text, keywords? }
SK.norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

SK.searchItems = function (items, query, limit) {
  const q = SK.norm(query);
  if (!q) return [];
  const qt = q.split(' ');
  const scored = [];
  for (const it of items) {
    const title = SK.norm(it.title);
    const hay = title + ' ' + SK.norm(it.keywords || '') + ' ' + SK.norm(it.text || '');
    let score = 0;
    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 60;
    else if (title.includes(q)) score += 40;
    let all = true;
    for (const t of qt) {
      const words = hay.split(' ');
      if (words.some((w) => w === t)) score += 12;
      else if (words.some((w) => w.startsWith(t))) score += 8;
      else if (hay.includes(t)) score += 3;
      else all = false;
    }
    if (!all && score < 40) continue;
    if (it.type === 'zone') score += 4;
    scored.push({ it, score });
  }
  scored.sort((a, b) => b.score - a.score || a.it.title.length - b.it.title.length);
  return scored.slice(0, limit || 8).map((s) => s.it);
};
