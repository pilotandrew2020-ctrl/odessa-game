// Epicentr K (hypermarket) and the night club exist, can be entered and are built (round 34). EPISHOT=1: screenshots.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.EPISHOT; await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  for (const k of ['shop_epicentr', 'shop_night_club']) {
    const ok = await ev(k => !!PLACES.find(p => p.id === k) && !!INTERIORS[k], k); console.log(k, ok); assert(ok, k + ' is missing (no free lot?)');
    await ev(k => { const p = PLACES.find(q => q.id === k); teleport(p); }, k); await h.wait(1500);
    await ev(k => { const p = PLACES.find(q => q.id === k); PORTAL.enter(k, { x: p.x, z: p.z, yaw: p.yaw }) }, k); await h.wait(2500);
    const s = await ev(k => ({ cur: PORTAL.cur, n: INTERACT.length, y: player.y }), k); console.log(JSON.stringify(s)); assert(s.cur === k, 'could not enter ' + k);
    if (SH) await h.shot('epi_' + k, 6000);
    await ev(() => PORTAL.exit()); await h.wait(800);
  }
};
