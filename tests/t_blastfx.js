// Realistic explosions (blastfx.js wraps FX.explode: light flash, volumetric fireball, dust wall, smoke column) and the nuke on the home yard's flats (nuke.js patchNear + insideAny): BLASTFXSHOT=1 screenshots tests/out/blastfx_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.BLASTFXSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  // 1. a bazooka-size blast on the open ground at the airport
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(6000);
  await ev(() => { cam.dist = 12; cam.pitch = .2; cam.init = false; BLASTFX.init() });
  await ev(() => { const f = [Math.sin(cam.yaw), Math.cos(cam.yaw)]; window.__b = [player.x + f[0] * 18, groundH(player.x + f[0] * 18, player.z + f[1] * 18) + 1, player.z + f[1] * 18]; FX.explode(__b[0], __b[1], __b[2], 11); BLASTFX.tick(.016) });
  const a = await ev(() => ({ fb: BLASTFX.fb.filter(f => f.on).length, dw: BLASTFX.dw.filter(f => f.on).length, light: BLASTFX.L.intensity })); console.log('blast', JSON.stringify(a)); assert(a.fb === 2 && a.dw >= 1 && a.light > 30, 'the extra effects did not start');
  await ev(() => { for (let i = 0; i < 12; i++) BLASTFX.tick(.016) }); await shot('blastfx_bazooka', 100);
  await ev(() => { for (let i = 0; i < 40; i++) BLASTFX.tick(.016) }); const b = await ev(() => ({ light: BLASTFX.L.intensity, fb: BLASTFX.fb.filter(f => f.on).length })); console.log('after 0.7 s', JSON.stringify(b)); assert(b.light === 0, 'the light flash did not fade');
  // 2. the nuke flattens the home yard's flats too (they are not chunk meshes)
  await ev(() => { teleportRaw(3, 14, 0) }); await h.wait(9000);
  const before = await ev(() => { let n = 0; for (let a = 0; a < 6.28; a += .1) for (let r = 15; r < 120; r += 8) { const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r; if (insideAny(x, z, .3, groundH(x, z) + 1)) n++ } return n }); console.log('wall hits around the yard before', before); assert(before > 8, 'no walls around the yard to test');
  await ev(() => { window.DBGCAM = [player.x + 60, player.y + 80, player.z + 60, player.x - 20, player.y + 5, player.z - 20] }); await shot('blastfx_yard_before', 3000);
  await ev(() => { NUKE.strike(player.x - 60, player.z - 60, 200) }); await ev(() => { for (let i = 0; i < 30; i++) NUKE.update(.1) });
  const after = await ev(() => { let n = 0; for (let a = 0; a < 6.28; a += .1) for (let r = 15; r < 120; r += 8) { const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r; if (insideAny(x, z, .3, groundH(x, z) + 1)) n++ } return n }); console.log('wall hits after', after); assert(after < before * .3, 'the yard still has walls');
  await shot('blastfx_yard_after', 5000);
  await ev(() => { for (let i = 0; i < 1100; i++) NUKE.update(.1) }); assert(await ev(() => !NUKE.st && !NUKE.ruin), 'the strike did not clear');
};
