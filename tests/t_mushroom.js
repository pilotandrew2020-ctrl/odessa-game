// The nuclear mushroom is the owner's footage (an animated billboard, assets/fx/nuke_mushroom.jpg): it appears at the flash, plays through its 25 frames, fades. MUSHSHOT=1: screenshots.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.MUSHSHOT; await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2000);
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(5000);
  await ev(() => { NUKE.strike(player.x + Math.sin(cam.yaw) * 700, player.z + Math.cos(cam.yaw) * 700, 300); cam.dist = 80; cam.pitch = .05 }); await page.waitForFunction(() => NUKE.st === 'boom', null, { timeout: 60000 });
  const r = await ev(() => { const o = []; for (const t of [.2, 2, 8, 20]) { NUKE.t = t - .001; NUKE.update(.001); o.push({ t, vis: NUKE.vid.visible, op: +NUKE.vid.material.opacity.toFixed(2), off: [NUKE.vt.offset.x, NUKE.vt.offset.y].map(x => +x.toFixed(2)), size: Math.round(NUKE.vid.scale.x), ball: NUKE.ball.visible, cap: NUKE.cap.visible }) } return o }); console.log(JSON.stringify(r));
  assert(r.every(x => x.vis && !x.ball && !x.cap) && r[2].op > .9 && (r[0].off[0] !== r[3].off[0] || r[0].off[1] !== r[3].off[1]), 'the footage mushroom does not play');
  await ev(() => { NUKE.t = 9; NUKE.update(.001) }); if (SH) { await h.render(); await h.wait(6000); await page.screenshot({ path: h.SCR + '/mush.png', timeout: 120000 }) }
};
