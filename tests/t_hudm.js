// The left tile stack (hudmenu.js) as it works now: toggles flip their .on state, the Map tile opens the big map and Back closes it, Menu goes to the main menu and Continue returns,
// a button that a script adds to #topBtns later is adopted into its row (in rank order), a mode button lands in the hidden parked panel, and double taps do not leave a stuck state.
const assert = require('assert');
exports.opts = { w: 900, h: 520 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => started && HUDM.ready, null, { timeout: 60000 });
  const lay = () => ev(() => ({ rows: [...document.querySelectorAll('#hudmStack .hmRow')].map(r => [...r.querySelectorAll('button')].map(b => b.id)), parked: [...document.querySelectorAll('#modesPanel button')].map(b => b.id), top: [...document.getElementById('topBtns').children].map(c => c.id) }));
  const L0 = await lay(); console.log('layout', JSON.stringify(L0));
  // a toggle (rain) flips and flips back
  const r0 = await ev(() => document.getElementById('bRain').classList.contains('on'));
  await ev(() => document.getElementById('bRain').click()); await h.wait(300); const r1 = await ev(() => document.getElementById('bRain').classList.contains('on'));
  await ev(() => document.getElementById('bRain').click()); await h.wait(300); const r2 = await ev(() => document.getElementById('bRain').classList.contains('on'));
  console.log('rain', r0, r1, r2); assert(r1 !== r0 && r2 === r0, 'the Rain tile does not toggle');
  // the Map tile opens the big map; a second tap while it is open must not break it; Back closes it
  await ev(() => document.querySelector('#quickRow button[data-for="bMap"]').click()); await h.wait(400);
  assert.strictEqual(await ev(() => document.getElementById('mapUI').hidden), false, 'the map did not open');
  await ev(() => document.getElementById('bMap').click()); await h.wait(300);
  await ev(() => { if (!document.getElementById('mapUI').hidden) document.getElementById('mapClose').click() }); await h.wait(400);
  assert.strictEqual(await ev(() => document.getElementById('mapUI').hidden), true, 'the map did not close');
  // Menu -> main menu -> Continue (twice: no stuck state)
  for (let i = 0; i < 2; i++) {
    await ev(() => document.getElementById('bMenu').click()); await h.wait(300);
    const m = await ev(() => ({ menu: !document.getElementById('menu').hidden, hud: !document.getElementById('hud').hidden, started, btn: document.getElementById('bStart').textContent }));
    assert(m.menu && !m.hud && !m.started && m.btn === 'Continue', 'Menu tile: ' + JSON.stringify(m));
    await ev(() => document.getElementById('bStart').click()); await h.wait(300);
    const g = await ev(() => ({ menu: !document.getElementById('menu').hidden, hud: !document.getElementById('hud').hidden, started }));
    assert(!g.menu && g.hud && g.started, 'Continue: ' + JSON.stringify(g));
  }
  // a row button added to the bar later is adopted into its row at its rank; a mode button goes to the parked panel; an unknown button is left alone
  await ev(() => { const b = document.getElementById('bRain'); b.remove(); document.getElementById('topBtns').appendChild(b); const m = document.getElementById('bHS'); m.remove(); document.getElementById('topBtns').appendChild(m); const x = document.createElement('button'); x.id = 'bTest'; x.textContent = 'Late'; document.getElementById('topBtns').appendChild(x) });
  await h.wait(400);
  const L1 = await lay(); console.log('after late adds', JSON.stringify(L1));
  assert.deepStrictEqual(L1.rows, L0.rows, 'the re-added tile is not back at its place'); assert(L1.parked.includes('bHS'), 'the mode button was not parked'); assert(L1.top.includes('bTest'), 'an unknown button must stay in the bar');
  await ev(() => document.getElementById('bTest').remove());
  await h.render(); await page.waitForTimeout(3000); await page.screenshot({ path: h.SCR + '/hud_menu.png' }); await h.noRender();
  console.log('HUD MENU OK');
};
