// Boot reaches Play with no page error, then the HUD layout as it is since the "black squares" round: two rows of tiles on the left (weather / view, then Armed · Lite/Max · Menu),
// the quick row under the map (Map · Chat · Bag · Mic · Phone), the modes OUT of the game screen (parked in a hidden panel, started from the menu's "Game modes" tab), no MORE button.
const assert = require('assert');
exports.opts = { w: 480, h: 850, warn: false };
exports.run = async (page, h) => {
  await page.addInitScript(() => { window.__errs = []; addEventListener('error', e => window.__errs.push(e.message + ' @' + e.lineno)) });
  await page.goto((process.env.BASE || 'http://localhost:8765') + '/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => { const b = document.getElementById('bStart'); return b && !b.disabled && /Play|Continue/.test(b.textContent) }, null, { timeout: 240000 });
  console.log('boot OK: start button =', await page.evaluate(() => document.getElementById('bStart').textContent));
  assert.deepStrictEqual(await page.evaluate(() => window.__errs), [], 'page errors during boot');
  await page.evaluate(() => { document.getElementById('bStart').click() });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = document.getElementById('crGo'); if (g) g.click() });
  await page.waitForFunction(() => typeof started !== 'undefined' && started && !document.getElementById('hud').hidden, null, { timeout: 60000 });
  const shown = (b) => getComputedStyle(b).display !== 'none';
  const hud = await page.evaluate(() => { const shown = (b) => getComputedStyle(b).display !== 'none' && !b.hidden; return {
    rows: [...document.querySelectorAll('#hudmStack .hmRow')].map(r => [...r.querySelectorAll('button')].filter(shown).map(b => b.id)),
    quick: [...document.querySelectorAll('#quickRow button')].filter(shown).map(b => b.dataset.for || b.id),
    parked: [...document.querySelectorAll('#modesPanel button')].map(b => b.id), panelHidden: document.getElementById('modesPanel').hidden,
    menuModes: [...document.querySelectorAll('#pModes [data-mode]')].map(b => b.dataset.mode),
    more: !!document.getElementById('bMore'), modesTile: !!document.getElementById('bModes'),
    qMenu: [...document.querySelectorAll('#qMenu button')].map(b => b.id + ':' + (b.hidden ? 'hidden' : 'vis')),
    homeDirBg: getComputedStyle(document.getElementById('homeDir')).backgroundColor,
    sizes: [...document.querySelectorAll('#hudmStack button')].filter(shown).map(b => { const r = b.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height) }),
  } });
  console.log('hud', JSON.stringify(hud));
  assert(!hud.more, 'MORE button still present'); assert(!hud.modesTile, 'the Modes tile is back on the game screen');
  for (const id of ['bTime', 'bRain', 'bSnow', 'bFog']) assert(hud.rows[0].includes(id), 'row 1 misses ' + id + ': ' + hud.rows[0]);
  for (const id of ['bGun', 'bMenu']) assert(hud.rows[1].includes(id), 'row 2 misses ' + id + ': ' + hud.rows[1]);
  assert.deepStrictEqual(hud.quick.length, 5, 'quick row must hold 5 tiles: ' + hud.quick); assert(hud.quick.includes('bMap') && hud.quick.includes('bBag'), 'quick row missing MAP/BAG');
  assert(hud.panelHidden && ['bBR', 'bHS', 'bJetRace'].every(id => hud.parked.includes(id)), 'the mode buttons must stay parked in the hidden panel: ' + hud.parked);
  assert.deepStrictEqual(hud.menuModes, ['br', 'hs', 'jet'], 'menu "Game modes" tab');
  assert(new Set(hud.sizes).size === 1, 'the left tiles are not one size: ' + hud.sizes);
  assert(!hud.qMenu.filter(s => s.endsWith('hidden')).some(s => !/bBoat|bJet|bBuddy/.test(s)), 'qMenu buttons hidden: ' + hud.qMenu);
  assert(hud.homeDirBg === 'rgba(0, 0, 0, 0)', 'home strip still grey: ' + hud.homeDirBg);
  await page.screenshot({ path: h.SCR + '/hud_rows.png', timeout: 240000 });
  console.log('ALL HUD CHECKS PASSED');
};
