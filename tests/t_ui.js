// The HUD as the owner sees it (iPad landscape, 2026-11-13): screenshots of the playing HUD, the phone (opened, then closed by dragging its bottom bar up) and the speaker player (tests/out/ui_*.png).
// Asserts: no empty dark strip under the round map (#gunBoard hidden while empty), the phone really closes by a swipe up on its home bar (and a short drag springs back), the speaker panel shows
// a title, a play button, a seek bar and the saved links, and no big yellow / orange control is left. UIOUT=1 only prints the yellow list.
exports.opts = { w: 1180, h: 820, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.wait(1500);
  const yellow = await ev(() => { const out = []; for (const el of document.querySelectorAll('button,[id]')) { const r = el.getBoundingClientRect(); if (r.width < 24 || r.height < 24 || r.width > 600) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const cols = [cs.backgroundColor, ...(cs.backgroundImage.match(/rgba?\([^)]*\)/g) || [])]; for (const c of cols) { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c); if (!m) continue; const [r0, g0, b0, a0] = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]]; if (a0 > .3 && r0 > 200 && g0 > 140 && b0 < 120) { out.push((el.id || el.className || el.tagName) + ' ' + c + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); break } } } return out });
  console.log('yellow / orange controls:', JSON.stringify(yellow));
  if (process.env.UIOUT) return;
  assert.strictEqual(yellow.length, 0, 'yellow controls left: ' + yellow);
  const strip = await ev(() => { const b = document.getElementById('gunBoard'); return b ? getComputedStyle(b).display : 'none' });
  assert.strictEqual(strip, 'none', 'the empty dark strip under the map is visible');
  await h.shot('ui_hud', 3000);
  // ---- the phone: open, drag the home bar up a little (springs back), then drag it far (closes)
  await ev(() => PHONE.toggle()); await page.waitForFunction(() => getComputedStyle(document.getElementById('phn')).transform === 'matrix(1, 0, 0, 1, 0, 0)', null, { timeout: 40000 });   // slow software frames: wait for the slide-in to finish
  assert(await ev(() => PHONE.open), 'phone did not open');
  const bar = await ev(() => { const r = document.getElementById('phnHome').parentElement.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] });
  const drag = async (dy, steps = 8) => { await page.mouse.move(bar[0], bar[1]); await page.mouse.down(); for (let i = 1; i <= steps; i++) await page.mouse.move(bar[0], bar[1] + dy * i / steps); await page.mouse.up(); await h.wait(1500) };
  await drag(-25); assert(await ev(() => PHONE.open), 'a short drag must not close the phone');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('phn')).transform === 'matrix(1, 0, 0, 1, 0, 0)', null, { timeout: 40000 });
  await h.shot('ui_phone', 2500);
  await drag(-140); assert(!(await ev(() => PHONE.open)), 'dragging the home bar up did not close the phone');
  const gone = await ev(() => { const d = document.getElementById('phn'); return !d.classList.contains('show') });
  assert(gone, 'the phone element still shows');
  // ---- the speaker player
  await ev(() => { PHONE.lib = [{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', kind: 'youtube', id: 'dQw4w9WgXcQ', title: 'Rick Astley - Never Gonna Give You Up', thumb: '', dur: 213, at: 1 }, { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', kind: 'youtube', id: 'jNQXAC9IVRw', title: 'Me at the zoo', thumb: '', dur: 19, at: 2 }]; PHONE.cur = 0; PHONE.pos = 42; PHONE.dur = 213;
    SPK.media = { url: PHONE.lib[0].url, kind: 'youtube', id: 'dQw4w9WgXcQ' }; SPK.playing = true; document.getElementById('spk').hidden = false; SPKUI.tick(true) });
  await h.wait(600);
  const sp = await ev(() => ({ title: document.getElementById('spkTitle').textContent, play: document.getElementById('spkPlay').textContent, seek: [document.getElementById('spkSeek').max, document.getElementById('spkSeek').value, document.getElementById('spkPos').textContent, document.getElementById('spkDur').textContent], rows: document.querySelectorAll('#spkLib .spkRow').length, cur: document.querySelectorAll('#spkLib .spkRow.cur').length, eq: document.getElementById('spkCover').classList.contains('pl') }));
  console.log('speaker', JSON.stringify(sp));
  assert(/Never Gonna/.test(sp.title) && sp.play === '⏸' && sp.rows === 2 && sp.cur === 1 && sp.eq && sp.seek[3] === '3:33' && sp.seek[2] === '0:42', 'speaker player state is wrong');
  await h.shot('ui_speaker', 2500);
  await ev(() => { SPK.media = null; SPK.playing = false; document.getElementById('spk').hidden = true });
};
