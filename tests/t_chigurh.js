// Anton Chigurh (chigurh.js + creator.js CHIG_LOOK + body.js "Bob" hair + the 'chig' jacket): the body type dresses the avatar, arms him with the silenced shotgun (GLB), the captive bolt stunner and the air tank follow. CHIGSHOT=1: screenshots tests/out/chig_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.CHIGSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2000); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await page.waitForFunction(() => CHG.prefab, null, { timeout: 60000 }); console.log('shotgun GLB loaded');
  await ev(() => { const c = CHAR.clean(CHAR.cur); c[17] = 10; CHAR.cur = c; CHAR.save(); WARDROBE.apply() }); await page.waitForFunction(() => PLR._chgTank && PLR._chgTank.parent, null, { timeout: 40000 }).catch(() => {}); await h.wait(1000);
  const st = await ev(() => ({ armed: GUN.armed, w: WEAPONS[GUN.w].n, tank: !!(PLR._chgTank && PLR._chgTank.parent), opts: { hs: CHAR.opts().hs, ts: CHAR.opts().ts }, names: WEAPONS.filter(w => w.chg || w.n === 'Captive bolt').map(w => w.n) })); console.log('equipped', JSON.stringify(st));
  assert(st.armed && st.w === "Chigurh's shotgun" && st.tank && st.opts.hs === 'short' && st.opts.ts === 'chig', 'not equipped as Chigurh');
  // from the front (face, jacket), the side (shotgun + tank), the back
  for (const [n, yaw] of [['front', Math.PI], ['side', Math.PI / 2 + Math.PI], ['back', 0]]) { await ev(y => { cam.dist = 3.2; cam.pitch = .08; cam.yaw = player.yaw + y; cam.init = false }, yaw); await shot('chig_' + n, 2500) }
  await ev(() => { cam.dist = 1.5; cam.pitch = .02; cam.yaw = player.yaw + Math.PI; cam.init = false }); await shot('chig_face', 2500);
  // he is not in the Spawn menu any more (Body list only); the tank is on his back even with another weapon in hand
  const sp = await ev(() => { AIRP.menu(); const t = document.getElementById('airPick').textContent; document.getElementById('airPick').hidden = true; return /Chigurh/.test(t) }); assert(!sp, 'Chigurh is still in the Spawn menu');
  const tk = await ev(() => { GUN.pick(0); GUN.sync(); PLR && 0; return !!(PLR._chgTank && PLR._chgTank.parent) }); await h.wait(800); const tk2 = await ev(() => !!(PLR._chgTank && PLR._chgTank.parent)); assert(tk2, 'the air tank is gone with another weapon');
  // the stunner: knocks a pedestrian down
  await ev(() => GUN.pick(WEAPONS.findIndex(w => w.n === 'Captive bolt'))); await h.wait(1200);
  const kn = await ev(() => { const L = SHOVE.lists()[0], q = L[0]; if (!q) return 'no ped'; q.x = player.x + Math.sin(player.yaw) * 1.2; q.z = player.z + Math.cos(player.yaw) * 1.2; q.y = player.y; GUN.cd = 0; GUN.fire(); return { fall: q.fallT } }); console.log('stunner', JSON.stringify(kn)); if (kn !== 'no ped') assert(kn.fall > 0, 'the stunner did not knock the pedestrian down');
  await ev(() => { cam.dist = 3; cam.pitch = .1; cam.yaw = player.yaw + Math.PI / 2 + Math.PI; cam.init = false }); await shot('chig_bolt', 2000);
  // back to a normal body: the tank goes
  await ev(() => { GUN.armed = false; GUN.sync() }); await h.wait(800); assert(await ev(() => !!(PLR._chgTank && PLR._chgTank.parent)), 'the tank must stay on his back also when nothing is out (round 23)');
};
