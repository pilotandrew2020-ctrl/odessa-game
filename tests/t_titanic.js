// The Titanic scene: "Titanic · arms out" (pose.js) makes Misha (buddy.js) stand 0.36 m behind you, facing the same way, with his hands round your waist;
// "Titanic · hold" does it the other way round. Checks distances / yaw / emotes and takes screenshots. Run: node tests/harness.js tests/t_titanic.js
exports.opts = { w: 900, h: 560, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { player.yaw = 0.9; PLR.root.rotation.y = 0.9 });
  await h.wait(800);
  for (const [id, role] of [['tfront', 'behind'], ['thold', 'in front']]) {
    await ev((id) => { POSE.emote(PLR, id, true) }, id);
    // Misha is summoned by the emote if he is not there yet; wait until he stands in his place
    await page.waitForFunction(() => BUDDY.on && BUDDY.P && BUDDY.P.emo && /^t(front|hold)$/.test(BUDDY.P.emo.id), null, { timeout: 60000 });
    await h.wait(1500);
    const r = await ev(() => { const f = [Math.sin(player.yaw), Math.cos(player.yaw)], dx = BUDDY.x - player.x, dz = BUDDY.z - player.z; return { along: +(dx * f[0] + dz * f[1]).toFixed(2), side: +(dx * f[1] - dz * f[0]).toFixed(2), dyaw: +Math.abs(((BUDDY.yaw - player.yaw + 3.1416) % 6.2832 + 6.2832) % 6.2832 - 3.1416).toFixed(2), me: PLR.emo && PLR.emo.id, him: BUDDY.P.emo.id } });
    console.log(id, role, JSON.stringify(r));
    assert(r.me === id, 'my emote'); assert(Math.abs(Math.abs(r.along) - .36) < .08 && Math.abs(r.side) < .08 && r.dyaw < .15, 'Misha is not standing ' + role);
    assert(id === 'tfront' ? r.along < 0 && r.him === 'thold' : r.along > 0 && r.him === 'tfront', 'wrong half');
    await ev(() => { const x = player.x, z = player.z, y = player.y, yaw = player.yaw; const fx = Math.sin(yaw), fz = Math.cos(yaw); window.DBGCAM = [x + fx * 2.3 + fz * 1.7, y + 1.25, z + fz * 2.3 - fx * 1.7, x, y + 1.15, z] });
    await h.render(); await h.wait(2500);
    await page.screenshot({ path: h.SCR + '/titanic_' + id + '.png', timeout: 150000 }); await h.noRender(); await ev(() => { window.DBGCAM = null });
    await ev(() => POSE.stop(PLR)); await h.wait(600);
    assert(await ev(() => !BUDDY.tit && !BUDDY.P.emo), 'the scene did not end');
  }
  console.log('titanic ok');
};
