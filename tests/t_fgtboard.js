// Spawn the space fighter next to you, board it, fly: it must move (the owner: "buttons appear but I stand on the ground and cannot move").
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  await page.waitForFunction(() => typeof SPC!=='undefined' && SPC.URL, null, { timeout: 60000 });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await ev(() => SPC.spawnFighter()); await page.waitForFunction(() => SPC.fgt, null, { timeout: 60000 });
  await h.noRender(); await ev(() => SPC.board()); await h.wait(600);
  const a = await ev(() => ({ mode: SPC.mode, on: SPC.on, y: SPC.C.w.y, x0: SPC.C.w.x, z0: SPC.C.w.z }));
  console.log('flags', JSON.stringify(await ev(() => ({ atmo: SPC.atmo, mode: SPC.mode, on: SPC.on, space: SPC.space, hold: typeof paused !== 'undefined' ? paused : null }))));
  await ev(() => { SPC.in.full = 1; SPC.in.ly = 1; }); await h.wait(2500); console.log('loop moved?', await ev(() => [SPC.C.w.x, player.x])); await ev(() => { for (let i = 0; i < 20; i++) SPC.frameAtmo(.05) }); console.log('manual', await ev(() => [SPC.C.w.x, SPC.C.sp])); const sp = await ev(() => SPC.C.sp); await ev(() => { SPC.in.full = 0; SPC.in.ly = 0 });
  const b = await ev(() => ({ mode: SPC.mode, sp: SPC.C.sp, x: SPC.C.w.x, y: SPC.C.w.y, z: SPC.C.w.z, px: player.x }));
  console.log('before', JSON.stringify(a), 'after', JSON.stringify(b), 'errors', JSON.stringify(errs.slice(0, 3)));
  assert(sp > 5 && Math.hypot(b.x - a.x0, b.z - a.z0) > 5, 'the fighter does not move: speed ' + sp);
};
