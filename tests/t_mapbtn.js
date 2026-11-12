// Map screen: nothing from the in-game HUD (Rain / Snow / Fog tiles, Jump, joystick, quick row...) may sit on top of the map's own buttons.
// For every visible HUD button the topmost element at its centre must be inside #mapUI. Run also with IPAD=1 (touch layout).
exports.opts = { w: 1024, h: 640, warn: false };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => document.getElementById('bMap').click()); await h.wait(800);
  const r = await ev(() => {
    const map = document.getElementById('mapUI'), bad = [], seen = [];
    for (const b of document.querySelectorAll('#hud button, #hud #joy, #hudmStack *')) {
      if (map.contains(b)) continue;
      const rc = b.getBoundingClientRect(); if (rc.width < 4 || rc.height < 4) continue;
      const cx = rc.x + rc.width / 2, cy = rc.y + rc.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
      const t = document.elementFromPoint(cx, cy); seen.push(b.id || b.className);
      if (!t || !map.contains(t)) bad.push((b.id || b.className) + ' -> ' + (t && (t.id || t.tagName)));
    }
    const mt = ['mapClose', 'mapMe', 'mapFit', 'mapZin', 'mapZout'].map(id => { const e = document.getElementById(id), rc = e.getBoundingClientRect(), t = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2); return id + ':' + (t === e || e.contains(t)) });
    return { checked: seen.length, covering: bad, mapButtonsOnTop: mt, z: getComputedStyle(map).zIndex };
  });
  console.log(JSON.stringify(r));
  if (r.covering.length || r.mapButtonsOnTop.some(s => s.endsWith('false'))) throw new Error('HUD covers the map: ' + JSON.stringify(r));
  await h.shot('mapbtn', 3000);
};
