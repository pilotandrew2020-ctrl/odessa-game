// Uranus (the owner's model), asteroid collisions, autopilot docking, flying together (a friend's ship in space, JOIN as a passenger, leave). SPACE3SHOT=1: screenshots tests/out/space3_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SPACE3SHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await page.waitForFunction(() => SPC.pad, null, { timeout: 60000 }); await ev(() => SPC.goPad()); await h.wait(3500); await page.waitForFunction(() => SPC.stk, null, { timeout: 90000 });
  await ev(() => SPC.launch()); await page.waitForFunction(() => SPC.A && SPC.A.m, null, { timeout: 60000 });
  for (const t of [3, 20, 45, 85]) { const f0 = await ev(t => { SPC.A.t = t; SPC.A.snap = 1; return SPC.A.fc || 0 }, t); await page.waitForFunction(f => SPC.A.fc >= f + 2, f0, { timeout: 90000 }) }
  await ev(() => { SPC.A.t = 89.5 }); await page.waitForFunction(() => SPC.space && SPC.mode === 'interior', null, { timeout: 90000 }); await h.wait(1000);
  await ev(() => { const e = SPC.IN.pod.userData.exit; SPC.IN.x = e.x; SPC.IN.z = e.z }); await h.wait(800); await ev(() => SPC.act()); await h.wait(800);
  await ev(() => { SPC.mode = 'eva'; SPC.startEva(SPC.E1.w.clone()) }); await h.wait(300);
  await ev(() => { SPC.E1.w.copy(SPC.C.w).add(new THREE.Vector3(0, 6, -20)); SPC.act() }); await h.wait(500); assert.strictEqual(await ev(() => SPC.mode), 'fly', 'could not board the fighter');
  // ---- Uranus
  await page.waitForFunction(() => SPC.uranusM && SPC.gas.length === 1, null, { timeout: 60000 }); console.log('Uranus loaded');
  await ev(() => { const b = SPC.gas[0], n = b.c.clone().add(new THREE.Vector3(.3, .5, .8).normalize().multiplyScalar(b.R * 3.5)); SPC.C.w.copy(n); SPC.C.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.c.clone().sub(n).normalize()); SPC.C.cq = null; SPC.C.thr = 0; SPC.in.full = 0 }); await shot('space3_uranus', 3500);
  await ev(() => { const b = SPC.gas[0]; SPC.C.w.copy(b.c).add(new THREE.Vector3(0, 1, 0).multiplyScalar(b.R + 3000)) }); await h.wait(1500);
  const ur = await ev(() => { const b = SPC.gas[0]; return Math.round(SPC.C.w.distanceTo(b.c) - b.R) }); console.log('pushed out of the gas giant to', ur, 'm'); assert(ur > 20000, 'flew into Uranus');
  // ---- an asteroid is solid
  const rk = await ev(() => { const m = SPC.rocks[2], c = m.userData.w; SPC.C.w.copy(c).add(new THREE.Vector3(1, 0, 0).multiplyScalar(m.userData.rad * .5)); SPC.C.sp = 500; return Math.round(m.userData.rad) }); await h.wait(1500);
  const rd = await ev(() => { const m = SPC.rocks[2]; return Math.round(SPC.C.w.distanceTo(m.userData.w)) }); console.log('rock radius', rk, 'ship distance after', rd); assert(rd >= rk, 'flew through an asteroid');
  // ---- docking
  await ev(() => { const w = SPC.issM.userData.w; SPC.C.w.set(w.x + 1e5, w.y + 3e4, w.z - 2e5); SPC.C.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, -.3, 2).normalize()); SPC.C.cq = null }); await h.wait(800);
  await ev(() => SPC.dock()); assert(await ev(() => !!SPC.dk), 'dock did not start'); const dk = await ev(() => { let n = 0; while (SPC.dk && n < 2000) { SPC.dockTick(.05); n++ } return { n, mode: SPC.mode, d: Math.round(SPC.C.w.length()) } }); console.log('docked', JSON.stringify(dk)); assert(dk.mode === 'eva' && dk.d < 200, 'docking did not end next to the station');
  await shot('space3_docked', 2500);
  // ---- flying together (a friend simulated through the presence data)
  await ev(() => { SPC.mode = 'fly'; SPC.setHud('fly'); SPC.C.w.set(500, 20, -300); SPC.C.q.identity(); SPC.C.cq = null; COOP.peers.set('friendX', { peer: 'friendX', st: { n: 'Friend', sx: [1, 520, 30, -230, 0, 0, 0, 1, .8, 1] }, P: null, has: false }) });
  await ev(() => { for (let i = 0; i < 20; i++) SPC.remoteTick(.05) }); const rs = await ev(() => ({ ships: Object.keys(SPC.rs), join: SPC.remoteShips().length, mine: SPC.coopState() && SPC.coopState()[0] })); console.log('friends in space', JSON.stringify(rs)); assert(rs.ships.length === 1 && rs.join === 1 && rs.mine === 1, 'the friend ship is not seen');
  await ev(() => { SPC.extraTick(1) }); assert(await ev(() => /JOIN FRIEND/.test(document.getElementById('spcX').innerHTML)), 'no JOIN button');
  await ev(() => SPC.join('friendX')); assert.strictEqual(await ev(() => SPC.mode), 'pax', 'did not become a passenger'); const px = await ev(() => { for (let i = 0; i < 5; i++) SPC.paxFrame(.05); return { st: SPC.coopState(), mode: SPC.mode } }); console.log('passenger', JSON.stringify(px)); assert(px.st[0] === 0 && px.st[9] === 'friendX' && px.st[10] === 1, 'the passenger packet is wrong');
  await h.wait(1500); await shot('space3_passenger', 2500);
  await ev(() => { COOP.peers.get('friendX').st.sx = [1, 900, 80, -200, 0, 0, 0, 1, 1, 1] }); const mv = await ev(() => { for (let i = 0; i < 80; i++) SPC.paxFrame(.05); return Math.round(SPC.paxC.w.x) }); console.log('the camera follows the pilot, x', mv); assert(mv > 800, 'the passenger does not move with the ship');
  await ev(() => SPC.leavePax('test')); assert.strictEqual(await ev(() => SPC.mode), 'fly', 'could not leave'); await ev(() => { COOP.peers.delete('friendX') });
};
