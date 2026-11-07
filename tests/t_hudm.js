exports.opts = { w: 900, h: 520 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await h.wait(1500);
  const lay = () => ev(() => { const q = (id) => [...document.getElementById(id).querySelectorAll('button')].map(b => b.id + ':' + b.textContent.trim()); const bar = [...document.getElementById('topBtns').children].map(c => c.className || c.id); return { bar, modes: q('popModes') , menu: q('popMenu'), vis: ['popModes', 'popMenu'].map(i => { const e = document.getElementById(i); return e ? !e.hidden : null }) } });
  // ids of the popovers aren't set; use class lookups instead
  await ev(() => { const p = document.querySelectorAll('#topBtns .hmPop'); p[0].id = 'popModes'; p[1].id = 'popMenu' });
  console.log('layout', JSON.stringify(await lay()));
  // open MODES
  await ev(() => document.getElementById('bModes').click());
  console.log('modes open', JSON.stringify((await lay()).vis));
  await h.render(); await page.waitForTimeout(3000); await page.screenshot({ path: h.SCR + '/hud_modes.png' }); await h.noRender();
  // switch to MENU (must close modes)
  await ev(() => document.getElementById('bHudMenu').click());
  console.log('menu open', JSON.stringify((await lay()).vis));
  await h.render(); await page.waitForTimeout(3000); await page.screenshot({ path: h.SCR + '/hud_menu.png' }); await h.noRender();
  // a toggle keeps the list open and still works (rain)
  const rain0 = await ev(() => typeof WEATHER !== 'undefined' ? null : null);
  const before = await ev(() => document.getElementById('bRain').className);
  await ev(() => document.getElementById('bRain').click()); await h.wait(300);
  const after = await ev(() => ({ cls: document.getElementById('bRain').className, stillOpen: !document.getElementById('popMenu').hidden }));
  console.log('rain', JSON.stringify({ before, after }));
  await ev(() => document.getElementById('bRain').click());
  // Map closes the list and opens the big map
  await ev(() => document.getElementById('bMap').click()); await h.wait(500);
  console.log('map', JSON.stringify(await ev(() => ({ menuOpen: !document.getElementById('popMenu').hidden, mapShown: !document.getElementById('mapUI').hidden }))));
  await ev(() => { const m = document.getElementById('mapUI'); const x = document.getElementById('mapClose'); if (x) x.click(); else m.hidden = true });
  // Battle Royale from MODES
  await ev(() => document.getElementById('bModes').click());
  await ev(() => document.getElementById('bBR').click()); await h.wait(1500);
  console.log('br', JSON.stringify(await ev(() => ({ modesOpen: !document.getElementById('popModes').hidden, brOn: BR.on, modesBtnLit: document.getElementById('bModes').classList.contains('on') }))));
  await h.wait(800);
  console.log('modes lit after poll', await ev(() => document.getElementById('bModes').className));
  // outside tap closes
  await ev(() => document.getElementById('bModes').click());
  await ev(() => document.getElementById('c').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  console.log('outside tap', JSON.stringify((await lay()).vis));
  // late-added button gets adopted
  await ev(() => { const b = document.createElement('button'); b.id = 'bTest'; b.textContent = 'Late'; document.getElementById('topBtns').appendChild(b) }); await h.wait(200);
  console.log('late button in', await ev(() => document.getElementById('bTest').parentNode.className + ' / ' + document.getElementById('bTest').parentNode.id));
};
