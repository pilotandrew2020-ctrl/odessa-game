// The sky deck (roofpads.js): a 700 m runway on pillars over the city centre; the menu entry "Airliner on the sky deck" parks an airliner on it and puts you on the deck. SKYSHOT=1: screenshots tests/out/skydeck_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SKYSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await ev(() => { AIRP.deckMode = true; AIRP.spawn('airliner') });
  await page.waitForFunction(() => AIRP.mine && AIRP.mine.airliner && !AIRP.busy, null, { timeout: 240000 }); await h.wait(6000);
  const a = await ev(() => { const p = AIRP.mine && AIRP.mine.airliner, D = ROOFPADS.big(); return { x: Math.round(p.x), z: Math.round(p.z), y: +p.y.toFixed(1), bottom: +p.bottom().toFixed(1), deckY: D.y, onGround: p.onGround, crashed: p.crashed, py: +player.y.toFixed(1), pAir: player.air, pd: Math.round(Math.hypot(player.x - p.x, player.z - p.z)) } });
  console.log('airliner on the deck', JSON.stringify(a)); assert(a.onGround && !a.crashed && Math.abs(a.y + a.bottom - a.deckY) < 1.5, 'the airliner is not on the deck'); assert(Math.abs(a.py - a.deckY) < 1.5 && !a.pAir, 'the player is not standing on the deck'); assert(a.pd < 120, 'the player is far from the airliner');
  const vis = await ev(() => { const p = AIRP.mine.airliner; return { v: p.root.visible, par: !!p.root.parent, sc: p.root.scale.x } }); console.log('airliner visible', JSON.stringify(vis)); assert(vis.v, 'the airliner is not drawn');
  await ev(() => { const p = AIRP.mine.airliner; window.DBGCAM = [p.x - 60, p.y + 25, p.z + 70, p.x, p.y + 3, p.z] }); await shot('skydeck_airliner_view', 3000); await ev(() => { window.DBGCAM = null });
  await ev(() => { cam.dist = 30; cam.pitch = .2; cam.yaw = Math.PI / 2 + 2.4; cam.init = false }); await shot('skydeck_airliner', 3000);
  await ev(() => { const D = ROOFPADS.big(); window.DBGCAM = [D.x - 120, D.y - 18, D.z + 90, D.x - 60, D.y - 4, D.z] }); await shot('skydeck_under', 3500);
  // the light plane still lands on the small pads, the airliner ignores them
  const r = await ev(() => ({ light: ROOFPADS.at(341, -10647, 44, 'light'), liner: ROOFPADS.at(341, -10647, 44, 'airliner'), deckLiner: ROOFPADS.at(300, -10700, 67, 'airliner') })); console.log('pads', JSON.stringify(r)); assert(r.light !== null && r.liner === null && r.deckLiner !== null, 'pad rules');
};
