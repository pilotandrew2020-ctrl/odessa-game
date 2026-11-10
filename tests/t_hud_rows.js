const assert = require('assert');
exports.opts = { w: 480, h: 850, warn: false };
exports.run = async (page, h) => {
  // the reported hang: the game never reaches 'Play' / 'Loading shaders…' is stuck
  await page.goto((process.env.BASE || 'http://localhost:8765') + '/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  // wait until the start button is enabled and says Play (boot finished, shaders warmed)
  await page.waitForFunction(() => { const b = document.getElementById('bStart'); return b && !b.disabled && /Play|Continue/.test(b.textContent) }, null, { timeout: 240000 });
  console.log('boot OK: start button =', await page.evaluate(() => document.getElementById('bStart').textContent));
  // no page errors during the whole boot
  const errs = await page.evaluate(() => window.__errs || []);
  assert.deepStrictEqual(errs, [], 'page errors during boot: ' + JSON.stringify(errs));
  // HUD layout: three rows on the left, quick row on the right, no MORE button
  await page.evaluate(() => { document.getElementById('bStart').click() });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = document.getElementById('crGo'); if (g) g.click() });
  await page.waitForTimeout(6000);
  const hud = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('#hudmStack .hmRow')].map(r => [...r.querySelectorAll('button')].map(b => b.id)),
    quick: [...document.querySelectorAll('#quickRow button')].map(b => b.dataset.for || b.id),
    qMenu: [...document.querySelectorAll('#qMenu button')].map(b => b.id + ':' + (b.hidden ? 'hidden' : 'vis')),
    homeDirBg: getComputedStyle(document.getElementById('homeDir')).backgroundColor
  }));
  console.log('hud', JSON.stringify(hud));
  assert(!hud.more, 'MORE button still present');
  assert(hud.quick.includes('bMap') && hud.quick.some(i => /bBag|qrBag/.test(i)), 'quick row missing MAP/BAG');
  assert(hud.rows.length === 3, 'expected 3 rows, got ' + hud.rows.length);
  assert(hud.rows[0].includes('bModes') && hud.rows[0].includes('bRain'), 'row1 wrong: ' + hud.rows[0]);
  assert(hud.rows[2].some(i => /bBR/.test(i)), 'row3 missing Battle Royale');
  assert(hud.qMenu.length > 0 && !hud.qMenu.filter(s => s.endsWith('hidden')).some(s => !/bBoat|bJet/.test(s)), 'qMenu buttons still hidden: ' + hud.qMenu);
  assert(hud.homeDirBg === 'rgba(0, 0, 0, 0)', 'home strip still grey: ' + hud.homeDirBg);
  await page.screenshot({ path: h.SCR + '/hud_rows.png', timeout: 60000 });
  console.log('ALL HUD CHECKS PASSED');
};
