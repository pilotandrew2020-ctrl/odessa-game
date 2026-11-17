// Facade dressing (round 34): entrances + parapets on the Tairove panel blocks, plinth + arched gateways in Moldavanka. FACSHOT=1: screenshots.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  const st = await ev(() => ({ b: FAC.stat.b, porch: FAC.stat.porch, err: FAC.err ? String(FAC.err) : null })); console.log('home', JSON.stringify(st)); assert(!st.err, 'FAC.dress threw');
  if (process.env.FACSHOT) await h.shot('fac_home', 4000);
  await ev(() => { const [x, z] = geo2xz(+(process.env.MLAT || 46.4715), +(process.env.MLON || 30.7075)); teleportRaw(x, z, 0); cam.dist = 6; cam.pitch = .12 }); await h.wait(6000);
  const st2 = await ev(() => ({ b: FAC.stat.b, porch: FAC.stat.porch, err: FAC.err ? String(FAC.err) : null })); console.log('mold', JSON.stringify(st2)); assert(!st2.err, 'FAC.dress threw in Moldavanka');
  if (process.env.FACSHOT) await h.shot('fac_mold', 5000);
};
