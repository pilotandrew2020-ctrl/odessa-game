// Facade dressing (round 34): entrances + parapets on the Tairove panel blocks, plinth + arched gateways in Moldavanka. FACSHOT=1: screenshots.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  const st = await ev(() => ({ b: FAC.stat.b, porch: FAC.stat.porch, err: FAC.err ? String(FAC.err) : null })); console.log('home', JSON.stringify(st)); assert(!st.err, 'FAC.dress threw');
  if (process.env.FACSHOT) await h.shot('fac_home', 4000);
  await ev(([la, lo]) => { const [x, z] = geo2xz(la, lo); teleportRaw(x, z, 0); cam.dist = 6; cam.pitch = .12 }, [+(process.env.MLAT || 46.4715), +(process.env.MLON || 30.7075)]); await h.wait(6000);
  const st2 = await ev(() => ({ b: FAC.stat.b, porch: FAC.stat.porch, err: FAC.err ? String(FAC.err) : null })); console.log('mold', JSON.stringify(st2)); assert(!st2.err, 'FAC.dress threw in Moldavanka');
  const m = await ev(() => { const L = FAC.molds || []; if (!L.length) return null; let b = null, bd = 1e9; for (const q of L) { const d = Math.hypot(q[0] - player.x, q[1] - player.z); if (d < bd) { bd = d; b = q } } return { b, n: L.length } }); console.log('mold buildings', JSON.stringify(m));
  if (m && process.env.FACSHOT) { await ev(b => { const px = b[0] - 16, pz = b[1]; teleportRaw(px, pz, 0); const yaw = Math.atan2(b[0] - px, b[1] - pz); player.yaw = yaw; cam.yaw = yaw; cam.dist = 3; cam.pitch = .1 }, m.b); await h.wait(4000); await h.shot('fac_mold2', 5000) }
  if (process.env.FACSHOT) await h.shot('fac_mold', 5000);
};
