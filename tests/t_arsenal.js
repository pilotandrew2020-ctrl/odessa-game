// arsenal.js + volcano.js: the damage system (a blast sphere per explosion, in the shader uniforms, healing), the Tiger tank (spawn, get in, drive, turret, a shell that
// explodes and leaves a blast), the kamikaze drone (flies, explodes on the ground), the nuclear bomb (falls, detonates, a big blast, mushroom, ends), the holster step
// when the weapon changes, the katana block, the Spawn menu entries, the volcano (crater in the terrain, lava, an eruption whose bombs explode). Screenshots arsenal_*.png.
const assert = require('assert');
exports.opts = { w: 1000, h: 600, warn: false };
exports.run = async (page, h) => {
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a); await h.noRender();
  const until = async (name, f, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f)) return true; await h.wait(200) } assert.fail('timeout waiting for ' + name) };
  await ev(() => { const p = PLACES.find(q => q.id === 'arcadia'); teleportRaw(p.x, p.z, p.yaw, 0) }); await h.wait(5000);
  // ---- Spawn menu entries
  await ev(() => AIRP.menu()); const items = await ev(() => [...document.querySelectorAll('#airPick button')].map(b => b.textContent)); await ev(() => { document.getElementById('airPick').hidden = true });
  console.log('spawn menu', items.length); for (const w of ['Tiger tank', 'Kamikaze drone', 'Nuclear bomb']) assert(items.some(t => t.includes(w)), 'no Spawn entry: ' + w);
  assert(await ev(() => DMG.done && !!UNI.uBlast), 'the damage shader patch did not run');
  // ---- tank
  await ev(() => TANK.spawn()); assert(await ev(() => !!TANK.g && TANK.g.visible), 'the tank did not spawn');
  await until('the tank prompt', () => { player.x = TANK.x + 3.5; player.z = TANK.z; return !!(curAct && /Tiger/.test(curAct.label)) });
  await ev(() => doAction()); assert.strictEqual(await ev(() => window.NOWALK), 'tank');
  const t0 = await ev(() => ({ x: TANK.x, z: TANK.z })); await ev(() => { inp.k.KeyW = true }); await until('the tank to move', () => Math.hypot(TANK.x - player.x, TANK.z - player.z) < .01 && TANK.v > 2, 30000); await h.wait(1500); await ev(() => { inp.k.KeyW = false });
  const t1 = await ev(() => ({ x: TANK.x, z: TANK.z, hidden: !PLR.root.visible, cam: !!window.DBGCAM })); console.log('tank drove', +Math.hypot(t1.x - t0.x, t1.z - t0.z).toFixed(1), 'm'); assert(Math.hypot(t1.x - t0.x, t1.z - t0.z) > 2 && t1.hidden && t1.cam);
  await ev(() => { cam.yaw = TANK.yaw + 1.2 }); await until('the turret to turn', () => Math.abs(TANK.ty - TANK.yaw) > .5, 20000);
  await ev(() => { cam.pitch = 0; TANK.fire() }); await until('the shell to explode', () => DMG.list.length > 0 && ARS.shells.length === 0, 30000);
  const b = await ev(() => ({ blasts: DMG.list.length, n: UNI.uBlastN.value, r: +DMG.list[0].r.toFixed(1), d: Math.round(Math.hypot(DMG.list[0].x - TANK.x, DMG.list[0].z - TANK.z)) })); console.log('shell', JSON.stringify(b)); assert(b.n >= 1 && b.d > 5, 'the shell left no blast away from the tank');
  console.log(await h.shot('arsenal_tank', 7000));
  await ev(() => TANK.leave()); assert(await ev(() => !window.NOWALK && PLR.root.visible && !window.DBGCAM), 'leaving the tank left a stuck state');
  // ---- healing: an expired blast closes
  await ev(() => { for (const q of DMG.list) q.t = 0 }); await until('the blast to heal', () => DMG.list.length === 0 && UNI.uBlastN.value === 0, 30000);
  // ---- drone: flies where the camera looks, explodes on the ground
  await ev(() => { const p = PLACES.find(q => q.id === "arcadia"); teleportRaw(p.x, p.z, p.yaw, 0) }); await h.wait(2500);
  await ev(() => DRONE.launch()); assert.strictEqual(await ev(() => window.NOWALK), 'drone'); const p0 = await ev(() => DRONE.p.toArray());
  await h.wait(1500); await ev(() => { cam.pitch = .7 }); await until('the drone to hit', () => DRONE.dead > 0 || !DRONE.on, 30000); await until('the drone to end', () => !DRONE.on && !window.NOWALK, 20000);
  const dr = await ev((p0) => ({ flew: +Math.hypot(DRONE.p.x - p0[0], DRONE.p.z - p0[2]).toFixed(1), blast: DMG.list.length, why: DRONE.why, jump: inp.jump, y: +(DRONE.p.y - groundH(DRONE.p.x, DRONE.p.z)).toFixed(1) }), p0); console.log("drone", JSON.stringify(dr)); assert(dr.flew > 3 && dr.blast >= 1, 'the drone did not fly and explode');
  // ---- holster: changing the weapon lowers the old one first; the katana blocks
  await ev(() => { GUN.setArmed(true); GUN.pick(1) }); await until('the pistol in the hand', () => PLR._gi === 1 && PLR._gs && PLR._gs.t > .9, 20000);
  const sw = await ev(async () => { const k = WEAPONS.findIndex(w => w.melee); GUN.pick(k); await new Promise(r => setTimeout(r, 60)); const mid = { held: PLR._gi, out: PLR._hs && PLR._hs.out }; return { k, mid } });
  console.log('swap', JSON.stringify(sw)); await until('the katana in the hand', () => PLR._gi === WEAPONS.findIndex(w => w.melee) && PLR._gs.t > .9, 20000);
  await ev(() => { ARS.block = true }); await h.wait(600); const bl = await ev(() => ({ blocking: ARS.blocking(), pose: PLR._gp && PLR._gp.block })); console.log('block', JSON.stringify(bl)); assert(bl.blocking && bl.pose === 1, 'no block');
  await ev(() => { ARS.block = false; GUN.setArmed(false) }); await until('the weapon put away', () => PLR._gi === -1 || PLR._gp === null, 20000);
  // ---- nuke
  await ev(() => NUKE.drop()); await until('the detonation', () => NUKE.det, 30000);
  const nk = await ev(() => ({ blast: Math.max(...DMG.list.map(q => q.r)), cloud: NUKE.cap.visible, dist: Math.round(Math.hypot(player.x - NUKE.x, player.z - NUKE.z)) })); console.log('nuke', JSON.stringify(nk)); assert(nk.blast > 150 && nk.cloud && nk.dist > 500);
  await ev(() => { NUKE.t = 4 + 22 }); await h.wait(600); await ev(() => { const c = NUKE; window.DBGCAM = [player.x, player.y + 30, player.z, c.x, c.y + 150, c.z] }); console.log(await h.shot('arsenal_nuke', 8000)); await ev(() => { window.DBGCAM = null });
  await ev(() => { NUKE.t = 4 + 96 }); await until('the nuke to end', () => NUKE.t < 0, 20000);
  // ---- volcano
  const vo = await ev(() => { const V = ISL.volc; return { place: !!PLACES.find(p => p.id === 'volcano'), floor: Math.round(islH(V.x, V.z)), rim: Math.round(islH(V.x + V.R + 5, V.z)) } }); console.log('volcano', JSON.stringify(vo)); assert(vo.place && vo.rim - vo.floor > 20, 'no crater');
  await ev(() => { const p = PLACES.find(q => q.id === 'volcano'); teleportRaw(p.x, p.z, p.yaw, 0) }); await until('the island', () => ISLE.on && !!VOLC.g, 60000); await h.wait(3000);
  await ev(() => { for (const q of DMG.list) q.t = 0; VOLC.next = 0 }); await until('an eruption', () => VOLC.bombs.some(q => q.on), 20000); console.log(await h.shot('arsenal_volcano', 8000));
  await until('the bombs to land', () => VOLC.bombs.every(q => !q.on), 60000); console.log('ARSENAL OK');
};
