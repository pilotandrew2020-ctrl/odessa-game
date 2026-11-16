// The Tiger tank (tank.js, 2026-11-16): spawn, board, drive (moves, turns, stopped by a wall and by the sea), aim, fire (shell lands and explodes), exit. TANKSHOT=1: screenshots tests/out/tank_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.TANKSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await ev(() => TANK.spawn()); const s0 = await ev(() => ({ ready: TANK.ready, vis: TANK.g.visible, d: Math.hypot(TANK.x - player.x, TANK.z - player.z) }));
  console.log('spawned', JSON.stringify(s0)); assert(s0.ready && s0.vis && s0.d > 8 && s0.d < 20, 'tank not placed in front');
  await ev(() => { cam.dist = 16; cam.pitch = .25; cam.yaw = player.yaw + .5; cam.init = false; player.x = TANK.x - Math.sin(player.yaw) * 14 - Math.cos(player.yaw) * 6; player.z = TANK.z - Math.cos(player.yaw) * 14 + Math.sin(player.yaw) * 6 }); await shot('tank_spawn');
  // the interact prompt exists and boards it
  await ev(() => { player.x = TANK.x + 6; player.z = TANK.z; }); await h.wait(300);
  const it = await ev(() => INTERACT.some(i => i.label === 'Drive the Tiger tank' && i.cond())); assert(it, 'no "Drive the Tiger tank" prompt next to the tank');
  await ev(() => TANK.board()); await h.wait(400); const bd = await ev(() => ({ on: TANK.on, c: document.body.classList.contains('tankon'), v: PLR.root.visible })); console.log('board', JSON.stringify(bd)); assert(bd.on && bd.c && !bd.v, 'board failed');
  // drive forward
  const p0 = await ev(() => ({ x: TANK.x, z: TANK.z, yaw: TANK.yaw })); await ev(() => { inp.jy = 1 }); await page.waitForFunction(a => Math.hypot(TANK.x - a.x, TANK.z - a.z) > 12, p0, { timeout: 60000 }); await ev(() => { inp.jy = 0 });
  const sp = await ev(() => Math.round(Math.abs(TANK.v) * 3.6)); console.log('drove forward, km/h', sp); assert(await ev(() => !PLR.root.visible), 'avatar re-shown while driving');
  // turn on the spot
  await ev(() => { inp.jx = 1 }); await page.waitForFunction(a => Math.abs(TANK.yaw - a.yaw) > .4, p0, { timeout: 60000 }); await ev(() => { inp.jx = 0 });
  // follows the ground and the camera sits behind the turret
  const cm = await ev(() => ({ d: Math.hypot(camera.position.x - TANK.x, camera.position.z - TANK.z), y: camera.position.y - TANK.y })); console.log('camera', JSON.stringify(cm)); assert(cm.d > 8 && cm.y > 3, 'camera not behind the tank');
  await shot('tank_drive', 800);
  // aim and fire: a shell flies and lands, the reload runs
  await ev(() => { TANK.aimYaw = TANK.yaw; TANK.aimPitch = .1; TANK.reload = 0; TANK.hits = 0; TANK.fire() });
  assert(await ev(() => TANK.reload > 2 && TANK.shells.length === 1), 'fire did nothing'); await shot('tank_fire', 250);
  await page.waitForFunction(() => TANK.hits > 0, null, { timeout: 60000 }); console.log('shell landed, hits', await ev(() => TANK.hits)); await shot('tank_boom', 150);
  // the sea stops it
  await ev(() => { TANK.v = 0; let a = 0, best = null; for (let r = 60; r < 4000 && !best; r += 20) for (a = 0; a < 6.28; a += .2) { const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r; if (groundH(x, z) < SL - 2 && groundH(x - Math.cos(a) * 15, z - Math.sin(a) * 15) > SL + .2) { best = [x, z, a]; break } } window.__sea = best; if (best) { TANK.x = best[0] - Math.cos(best[2]) * 14; TANK.z = best[1] - Math.sin(best[2]) * 14; TANK.yaw = Math.atan2(Math.cos(best[2]), Math.sin(best[2])) } });
  if (await ev(() => !!window.__sea)) { await ev(() => { inp.jy = 1 }); await h.wait(6000); await ev(() => { inp.jy = 0 }); const wet = await ev(() => groundH(TANK.x, TANK.z)); console.log('at the shore, ground', Math.round(wet * 10) / 10); assert(wet > await ev(() => SL) - 1.3, 'the tank drove into the sea') }
  // exit
  await ev(() => TANK.exit()); await h.wait(500); const ex = await ev(() => ({ on: TANK.on, vis: PLR.root.visible, cls: document.body.classList.contains('tankon'), d: Math.hypot(TANK.x - player.x, TANK.z - player.z) })); console.log('exit', JSON.stringify(ex));
  assert(!ex.on && ex.vis && !ex.cls && ex.d > 3, 'exit left stuck state');
  await ev(() => { cam.dist = 14; cam.pitch = .25; cam.init = false }); await shot('tank_exit');
};
