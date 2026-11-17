// Chigurh's legs while walking, seen from low and close (the owner: "rags fly around his legs, he sinks into the ground a bit"). CHGSHOT=1: screenshots.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  await ev(() => { const c = CHAR.clean(CHAR.cur); c[17] = 10; CHAR.cur = c; WARDROBE.apply() }); await h.wait(3000);
  await ev(() => { cam.dist = 3.2; cam.pitch = -.05; cam.yaw = player.yaw + 2.4; player.yaw = player.yaw; });
  await ev(() => { cam.dist = 1.7; cam.pitch = .12; cam.yaw = player.yaw + Math.PI; }); await h.shot('chghead', 5000);
  await ev(() => { cam.dist = 3.2; cam.pitch = -.05; cam.yaw = player.yaw + 2.4; });
  for (const [n, ph] of [['a', 0], ['b', 1.6]]) {
    await ev(ph => { PLR.phase = ph; player.spd = 3; inp.mx = 0; }, ph);
    await h.shot('chgfeet_' + n, 5000);
  }
};
