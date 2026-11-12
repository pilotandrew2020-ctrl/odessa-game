// Face photo (look.js): ONE big circle on a drawn test face -> skin tone from the skin pixels only (not the dark hair / eyes / background), hair colour from above the oval,
// stays above a brightness floor; the circle UI (drag, size slider, tilt slider, "Use this photo") works. The test face is drawn on a canvas here: no real photo is needed or stored.
exports.opts = { w: 900, h: 700, warn: false };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  const res = await ev(async () => {
    const mk = (skin, hair, bg) => { const c = document.createElement('canvas'); c.width = 600; c.height = 600; const g = c.getContext('2d');
      g.fillStyle = bg; g.fillRect(0, 0, 600, 600); g.fillStyle = hair; g.beginPath(); g.ellipse(300, 250, 150, 190, 0, 0, 6.283); g.fill();        // hair mass
      g.fillStyle = skin; g.beginPath(); g.ellipse(300, 300, 115, 150, 0, 0, 6.283); g.fill();                                                       // face
      g.fillStyle = hair; g.fillRect(190, 150, 220, 55);                                                                                              // fringe over the forehead
      g.fillStyle = '#fff'; for (const x of [250, 350]) { g.beginPath(); g.ellipse(x, 290, 22, 11, 0, 0, 6.283); g.fill() } g.fillStyle = '#2a1c14'; for (const x of [250, 350]) { g.beginPath(); g.arc(x, 290, 8, 0, 6.283); g.fill() }
      g.fillStyle = '#9b4a45'; g.beginPath(); g.ellipse(300, 375, 38, 12, 0, 0, 6.283); g.fill();
      return new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.src = c.toDataURL('image/png') }) };
    const out = {};
    for (const [name, skin, hair, bg] of [['light', '#e8bf9f', '#4a2f1d', '#7aa0c8'], ['tan', '#c58c5e', '#161210', '#d9d3c8'], ['dark', '#6b4430', '#0d0a09', '#3a4a3a']]) {
      const img = await mk(skin, hair, bg);
      const box = document.createElement('div'); document.body.appendChild(box);
      LOOK.marker(box, img, { dirty: false, renderPanel() {} });
      const cv = box.querySelector('canvas'), r = cv.getBoundingClientRect();
      const fire = (t, x, y, id = 1) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + x * r.width / cv.width, clientY: r.top + y * r.height / cv.height, pointerId: id, bubbles: true }));
      // drag the circle from the default spot to the face centre (the preview is 300 px for a 600 px picture: scale .5)
      fire('pointerdown', 150, 135); fire('pointermove', 150, 150); fire('pointerup', 150, 150);
      const sl = box.querySelectorAll('input[type=range]'); sl[0].value = 26; sl[0].dispatchEvent(new Event('input')); sl[1].value = 0; sl[1].dispatchEvent(new Event('input'));
      [...box.querySelectorAll('button')].find(b => /Use this photo/.test(b.textContent)).click();
      const f = LOOK.face; out[name] = { want: skin, skin: f.skin, hair: f.hair, med: f.med, v: f.v, hasImg: !!f.img };
      box.remove();
    }
    // a circle dragged over the edge of the photo: the fill colour outside the picture must not count as skin
    {const c = document.createElement('canvas'); c.width = 400; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#7aa0c8'; g.fillRect(0, 0, 400, 600); g.fillStyle = '#4a2f1d'; g.beginPath(); g.ellipse(40, 250, 150, 190, 0, 0, 6.283); g.fill();
      g.fillStyle = '#e8bf9f'; g.beginPath(); g.ellipse(40, 300, 115, 150, 0, 0, 6.283); g.fill(); g.fillStyle = '#2a1c14'; g.beginPath(); g.arc(100, 290, 8, 0, 6.283); g.fill();
      const im = new Image(); await new Promise(ok => { im.onload = ok; im.src = c.toDataURL('image/png') });
      LOOK.setFromImage(im, { cx: 40, cy: 300, R: 150, rot: 0 }); const f = LOOK.face; out.edge = { want: '#e8bf9f', skin: f.skin, hair: f.hair, med: f.med, v: f.v, hasImg: !!f.img }; }
    return out;
  });
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const lum = c => .299 * c[0] + .587 * c[1] + .114 * c[2], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let bad = [];
  for (const [n, r] of Object.entries(res)) {
    console.log(n, JSON.stringify(r));
    if (!r.hasImg || r.v !== 2) bad.push(n + ': no v2 record');
    if (dist(hex(r.skin), hex(r.want)) > 38) bad.push(n + ': skin ' + r.skin + ' is far from ' + r.want);
    if (lum(hex(r.skin)) < 70) bad.push(n + ': skin too dark (black face)');
    if (r.hair && lum(hex(r.hair)) > 120) bad.push(n + ': hair ' + r.hair + ' should be dark');
  }
  if (bad.length) throw new Error(bad.join(' | '));
  console.log('face ring ok');
  await ev(() => { localStorage.removeItem('od_face'); LOOK.face = null });
};
