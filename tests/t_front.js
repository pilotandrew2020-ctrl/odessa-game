// Fronts of the parked cars (headlamps): FRONTSHOT=gwagon,lambo,gtr screenshot each seen from the nose.
exports.opts = { w: 900, h: 560, warn: false };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  await page.waitForFunction(() => EXT.veh.length > 5, null, { timeout: 60000 });
  await ev(() => { for (const v of EXT.veh) v.attachGLB && v.attachGLB() }); await h.wait(8000);
  for (const k of (process.env.FRONTSHOT || 'gwagon').split(',')) {
    await ev(k => { const v = EXT.veh.find(q => q.kind === k); const f = [Math.sin(v.yaw), Math.cos(v.yaw)]; teleportRaw(v.x + f[0] * 6.5, v.z + f[1] * 6.5, v.yaw + Math.PI); cam.dist = 1.2; cam.pitch = .02; cam.yaw = v.yaw + Math.PI }, k);
    await h.wait(1500); await h.shot('front_' + k, 4000);
  }
};
