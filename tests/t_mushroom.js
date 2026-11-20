// The nuclear mushroom (odx.js, 2026-11-20): a volumetric cloud built from meshes (fireball, stem, cap, ring, skirt) with a billowing shader, smoke
// billows round the cap and a shock dome; the flat footage billboard of round 46 is no longer shown. Checks: the parts appear at the flash, the cap
// grows and rises, the fireball is gone after ~9 s, the footage sprite stays hidden. MUSHSHOT=1: screenshot tests/out/mush.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.MUSHSHOT; await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2000);
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(5000);
  await ev(() => { NUKE.strike(player.x + Math.sin(cam.yaw) * 700, player.z + Math.cos(cam.yaw) * 700, 300); cam.dist = 80; cam.pitch = .05 }); await page.waitForFunction(() => NUKE.st === 'boom', null, { timeout: 60000 });
  const r = await ev(() => { const o = [], X = ODX_NUKE; for (const t of [.2, 2, 8, 20]) { NUKE.t = t - .001; NUKE.update(.001);
    o.push({ t, cap: X.cap.visible, stem: X.stem.visible, fire: X.fire.visible, capR: Math.round(X.cap.scale.x), capY: Math.round(X.cap.position.y - NUKE.gy), age: +X.mats[0].uniforms.uAge.value.toFixed(2), vid: !!(NUKE.vid && NUKE.vid.visible) }) } return o });
  console.log(JSON.stringify(r));
  assert(r.every(x => x.cap && x.stem && !x.vid), 'the volumetric mushroom is not shown (or the footage billboard still is)');
  assert(r[3].capR > r[0].capR && r[3].capY > r[1].capY, 'the cap does not grow / rise'); assert(r[0].fire && !r[3].fire, 'the fireball does not burn out');
  await ev(() => { NUKE.t = 9; NUKE.update(.001) }); if (SH) { await h.render(); await h.wait(6000); await page.screenshot({ path: h.SCR + '/mush.png', timeout: 120000 }) }
};
