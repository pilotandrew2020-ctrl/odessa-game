// The nuclear bomb (nuke.js + the NUKE_* shader parts in index.html, 2026-11-16): the bomb falls, the flash, the shock front collapses the buildings inside 300 m (vertex shader), ruins have no colliders / shadows, the player is shoved, then the city grows back. NUKESHOT=1: screenshots tests/out/nuke_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.NUKESHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  // the city centre (Deribasivska): ordinary chunk buildings all round (the home yard's flats are special buildings with their own materials)
  await ev(() => { const p = PLACES.find(q => q.id === 'deriba'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(15000);
  const cams = () => ev(() => { window.DBGCAM = [player.x - Math.sin(cam.yaw) * 8, player.y + 55, player.z - Math.cos(cam.yaw) * 8, NUKE.gx, NUKE.gy + 12, NUKE.gz] });
  await ev(() => { cam.yaw = player.yaw; cam.init = false });
  await ev(() => NUKE.drop(260)); await cams(); await shot('nuke_before', 4000); const f0 = await ev(() => ({ st: NUKE.st, gx: Math.round(NUKE.gx), gz: Math.round(NUKE.gz), gy: Math.round(NUKE.gy) })); console.log('dropped', JSON.stringify(f0)); assert(f0.st === 'fall', 'no bomb');
  // buildings that stand inside the ground zero circle (before): colliders
  const before = await ev(() => { let n = 0, pts = []; for (let a = 0; a < 6.28 && pts.length < 400; a += .05) for (let r = 20; r < 240; r += 10) { const x = NUKE.gx + Math.cos(a) * r, z = NUKE.gz + Math.sin(a) * r; if (insideAny(x, z, .3, groundH(x, z) + 1)) { n++; if (pts.length < 40) pts.push([x, z]) } } window.__pts = pts; return n });
  console.log('wall hits before', before); assert(before > 5, 'no buildings inside the blast circle to test (move the test spot)');
  const step = (n, dt) => ev(a => { for (let i = 0; i < a.n; i++) NUKE.update(a.dt) }, { n, dt: dt || .1 });
  await step(47); assert(await ev(() => NUKE.st === 'boom'), 'bomb did not detonate');
  await ev(() => { NUKE.t = 0 }); await step(1, .05); await shot('nuke_flash', 150);
  // the front sweeps out: after 1.2 s everything inside 300 m is ruined, no colliders, no shadows
  await step(12, .1); const mid = await ev(() => ({ k: UNI.uNukeK.value, ruin: NUKE.ruin, walls: (window.__pts || []).filter(p => insideAny(p[0], p[1], .3, groundH(p[0], p[1]) + 1)).length, n: (window.__pts || []).length }));
  console.log('ruined', JSON.stringify(mid)); assert(mid.ruin && mid.k === 1, 'not ruined'); assert(mid.walls === 0 && mid.n > 5, 'the ruins still have walls');
  await shot('nuke_ruins', 5000);
  await step(60, .1); await shot('nuke_cloud', 5000);
  // the shock reached the player (270 m / 330 m/s) and the traffic cars inside were removed
  const hit = await ev(() => ({ hit: NUKE.hit, cars: CARS.filter(c => Math.hypot(c.x - NUKE.gx, c.z - NUKE.gz) < 280).length })); console.log('shock', JSON.stringify(hit)); assert(hit.hit, 'the shock never reached the player');
  // recovery: after 100 s everything is back
  await ev(() => { NUKE.t = 74.5 }); await step(330, .1);   // (update() caps dt at 0.1 s)
  const end = await ev(() => ({ st: NUKE.st, k: UNI.uNukeK.value, ruin: NUKE.ruin, vis: NUKE.ball.visible })); console.log('recovered', JSON.stringify(end)); assert(!end.st && end.k === 0 && !end.ruin && !end.vis, 'recovery incomplete');
  const back = await ev(() => (window.__pts || []).filter(p => insideAny(p[0], p[1], .3, groundH(p[0], p[1]) + 1)).length); console.log('walls back', back); assert(back > 0, 'colliders did not come back');
};
