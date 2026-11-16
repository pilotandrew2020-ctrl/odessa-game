// The kamikaze drone + the shared explosion (drone.js, blast.js, 2026-11-16): launch, fly (turn / nose / speed), blow up on a building / the ground, hurt, scorch mark, put back at the launch point. DRONESHOT=1: screenshots tests/out/drone_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.DRONESHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1200); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(6000);   // open ground: the home yard is walled in by flats (the drone hits them at once)
  const home = await ev(() => ({ x: player.x, z: player.z }));
  await ev(() => DRONE.spawn()); await h.wait(300); const l = await ev(() => ({ on: DRONE.on, cls: document.body.classList.contains('droneon'), vis: PLR.root.visible })); console.log('launched', JSON.stringify(l)); assert(l.on && l.cls && !l.vis, 'launch failed');
  await shot('drone_launch', 300);
  // camera views: first person / behind / in front (the drone is drawn in the last two)
  const vw = await ev(() => { const o = []; for (const v of [0, 1, 2]) { DRONE.view = v; for (let i = 0; i < 40; i++) DRONE.frame(.05); o.push({ v, d: +Math.hypot(camera.position.x - DRONE.x, camera.position.y - DRONE.y, camera.position.z - DRONE.z).toFixed(1), vis: DRONE.g.visible }) } DRONE.view = 0; return o }); console.log('views', JSON.stringify(vw)); assert(vw[1].d > 6 && vw[2].d > 6 && vw[1].vis && vw[2].vis, 'the third / second person views do not show the drone');
  // flies forward, turns, the nose follows the drag
  const p0 = await ev(() => ({ x: DRONE.x, z: DRONE.z, yaw: DRONE.yaw })); // (software GL draws ~1 frame per 2 s while flying: step the simulation by hand, 50 ms a step)
  const step = (n) => ev(n => { for (let i = 0; i < n; i++) DRONE.frame(.05) }, n);
  await step(30); await ev(() => { inp.jx = 1 }); await step(8); await ev(() => { inp.jx = 0 });
  const f = await ev(() => ({ d: Math.round(Math.hypot(DRONE.x - player.x, DRONE.z - player.z)), t: DRONE.t, v: Math.round(DRONE.v) })); const mv = await ev(a => Math.round(Math.hypot(DRONE.x - a.x, DRONE.z - a.z)), p0); console.log('flew', mv, 'm', JSON.stringify(f)); assert(mv > 15, 'the drone did not fly');
  await shot('drone_fly', 200);
  // dive at the ground: it explodes, hurts people / cars close by, leaves a scorch mark, then you are back home
  await ev(() => { GUN.armed = true; GUN.hp = 100; DRONE.pitch = -1.2; DRONE.v = 40; BLAST.n = 0; BLAST.hits = 0 });
  await ev(() => { for (let i = 0; i < 200 && DRONE.st === 'fly'; i++) DRONE.frame(.05) }); assert(await ev(() => DRONE.st === 'boom'), 'it did not blow up on the ground'); const b = await ev(() => ({ hits: BLAST.hits, mark: !!BLAST.marks[0], last: BLAST.last })); console.log('exploded', JSON.stringify(b)); assert(b.hits === 1 && b.mark, 'no explosion / scorch mark');
  await shot('drone_boom', 400);
  await step(60); await h.wait(800);
  const back = await ev(() => ({ vis: PLR.root.visible, cls: document.body.classList.contains('droneon'), d: Math.hypot(player.x - 0, player.z - 0) })); const hm = await ev(h2 => Math.round(Math.hypot(player.x - h2.x, player.z - h2.z)), home); console.log('back home, off by', hm, 'm', JSON.stringify(back)); assert(back.vis && !back.cls && hm < 6, 'not put back / stuck state');
  // a blast next to you hurts and shoves
  const hp = await ev(() => { GUN.armed = true; GUN.hp = 100; BLAST.at(player.x + 3, player.y + 1, player.z, 9, 70); return GUN.hp }); console.log('blast 3 m away: hp 100 ->', hp); assert(hp < 100, 'a blast 3 m away did not hurt');
  // abort and the battery
  await ev(() => DRONE.spawn()); await h.wait(500); await ev(() => DRONE.end()); await h.wait(500); assert(await ev(() => !DRONE.on && PLR.root.visible), 'abort left stuck state');
};
