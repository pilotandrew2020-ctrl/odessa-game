// Katana: weapon swap holsters the old weapon first (pose.js plays the draw backwards, then GUN.hold draws the new one), BLOCK (key B / button) raises the blade and cuts damage to a fifth. SWORDSHOT=1: screenshots tests/out/sword_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SWORDSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await ev(() => { GUN.armed = true; GUN.hp = 100; GUN.pick(0); cam.dist = 4; cam.pitch = .15; cam.init = false });
  await page.waitForFunction(() => PLR._gi === 0 && PLR._gs && PLR._gs.t > .99, null, { timeout: 60000 }); console.log('pistol drawn');
  // swap to the katana: the pistol must be put away first
  await ev(() => { window.__seen = []; GUN.pick(7); });
  await page.waitForFunction(() => { const g = PLR._gs; if (g.hol) window.__seen.push([PLR._gi, +g.t.toFixed(2)]); return PLR._gi === 7 }, null, { timeout: 60000, polling: 30 });
  const seen = await ev(() => window.__seen); console.log('holstering frames (weapon, draw phase)', JSON.stringify(seen)); assert(seen.length > 0 && seen.every(s => s[0] === 0), 'the old weapon was not put away first');
  await page.waitForFunction(() => PLR._gs.t > .99, null, { timeout: 60000 });
  // block
  await ev(() => { GUN.guard = true; GUN.blocks = 0 }); await page.waitForFunction(() => PLR._gs.bk > .9, null, { timeout: 60000 }); await shot('sword_block', 800);
  const hp = await ev(() => { GUN.hp = 100; GUN.damage(50, null); return { hp: GUN.hp, blocks: GUN.blocks } }); console.log('blocked 50 ->', JSON.stringify(hp)); assert(hp.hp === 90 && hp.blocks === 1, 'block did not cut the damage');
  await ev(() => { GUN.guard = false; GUN.hp = 100; GUN.damage(50, null) }); assert(await ev(() => GUN.hp === 50), 'unblocked damage changed');
  assert(await ev(() => !document.getElementById('gunGuard').hidden), 'no BLOCK button with the katana');
  await ev(() => { GUN.pick(0) }); await page.waitForFunction(() => PLR._gi === 0, null, { timeout: 60000 }); await h.wait(500); assert(await ev(() => document.getElementById('gunGuard').hidden), 'BLOCK button stays with a pistol');
};
