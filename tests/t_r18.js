// Round 18 odds and ends: fire from the scooter, bike / motorbike capped at 350 km/h, the submarine turns easily, Chigurh walks slow and straight-armed, the phone Home button + shade.
exports.opts = { w: 1180, h: 820, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  // fire while riding the scooter (it used to be blocked)
  const f = await ev(() => { GUN.armed = true; GUN.down = 0; player.scoot = true; const a = GUN.canFire(); player.scoot = false; player.sit = { x: 0, z: 0, y: 0, yaw: 0 }; const b = GUN.canFire(); player.sit = null; return { scoot: a, sit: b } }); console.log('canFire', JSON.stringify(f)); assert(f.scoot && !f.sit, 'scooter cannot fire / sitting can');
  // bike and motorbike top speed 350 km/h = 97 m/s
  const sp = await ev(() => [LV_SPECS.bike.max, LV_SPECS.moto.max]); assert(sp[0] === 97 && sp[1] === 97, 'bike speed ' + sp);
  // the submarine: yaw rate at a crawl and at 50 m/s
  const sub = await ev(() => { const o = {}; for (const v0 of [8, 50, 139]) { const v = new LiteVehicle('sub', 0, 0, 0); v.v = v0; const y0 = v.yaw; for (let i = 0; i < 40; i++) { v.v = v0; v.step(.05, 1, 1, 0, 0, false) } o[v0] = +((v.yaw - y0) / 2).toFixed(2); v.kill && v.kill() } return o }); console.log('sub yaw rate rad/s', JSON.stringify(sub)); assert(Math.abs(sub[8]) > .6 && Math.abs(sub[50]) > .3 && Math.abs(sub[139]) > .12, 'the submarine still turns slowly');
  // Chigurh: slow walking speed + the still arms
  await ev(() => { const c = CHAR.clean(CHAR.cur); c[17] = 10; CHAR.cur = c; CHAR.save(); WARDROBE.apply(); return 1 }); await h.wait(2500); const g2 = await ev(() => ({ chig: !!PLR.chig, body: CHAR.cur[17] })); console.log('chig', JSON.stringify(g2)); assert(g2.chig, 'Chigurh body not marked');
  // round 29: a skin colour pick recolours Nolik / Booba (their texture colour is remapped)
  for (const i of [3, 2]) { await ev(i => { const c = CHAR.clean(CHAR.cur); c[17] = i; c[0] = 6; CHAR.cur = c; CHAR.save(); WARDROBE.apply() }, i); await h.wait(2800); assert(await ev(() => { let ok = false; PLR.real && PLR.real.M.traverse(o => { if (o.isMesh && o.material && o.material.userData && (o.material.userData.tintU || o.material.userData.tintB)) ok = true }); return ok }), 'skin colour does not recolour body ' + i) }
  await ev(() => { const c = CHAR.clean(CHAR.cur); c[17] = 0; c[0] = 2; CHAR.cur = c; CHAR.save(); WARDROBE.apply() }); await h.wait(1500);
  // phone: Home inside an app, the shade
  await ev(() => { toast('Hello', 'one'); PHONE.toggle() }); await h.wait(600); await ev(() => PHONE.go('snake')); await h.wait(300);
  assert(await ev(() => !document.getElementById('phnBack').hidden), 'no Home button in the app'); await ev(() => document.getElementById('phnBack').click()); await h.wait(200); assert.strictEqual(await ev(() => PHONE.screen), 'home');
  // TikTok tile = the in-game player again; @name gives the scrolling creator list
  const tt = await ev(() => { PHONE.go('tiktok'); document.getElementById('phnTt').value = 'https://www.tiktok.com/@scout2015'; PHONE.act('ttgo'); const f = document.querySelector('#phnTtBox iframe'); const a = f && f.src; document.getElementById('phnTt').value = '@someone.else'; PHONE.act('ttgo'); const b = document.querySelector('#phnTtBox iframe'); return { a, b: b && b.src, tile: [...document.querySelectorAll('#phn .app')].map(x => x.textContent.trim()) } }); console.log('tiktok', JSON.stringify(tt));
  assert(/@scout2015/.test(tt.a || '') && /@someone.else/.test(tt.b || ''), 'creator list embed missing');
  await ev(() => PHONE.shade(true)); await h.wait(500); assert(await ev(() => document.getElementById('phnShade').classList.contains('open') && PHONE.notes.length > 0), 'shade not open / no notifications'); await ev(() => PHONE.shade(false));
};
