// A friend's fighter jet (presence `pf`): it is drawn, you can ride in the back seat (PASS), and steering is not mirrored (stick right = the aircraft turns right on screen). The friend is simulated through the presence data.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.FSEATSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2000); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(8000);
  await ev(() => AIRP.spawn('fighter')); await page.waitForFunction(() => AIRP.mine && AIRP.mine.fighter && !AIRP.busy, null, { timeout: 240000 }); await h.wait(1500);
  // 1. steering is not mirrored: stick right turns the jet right (true screen-right = (-cos yaw, sin yaw))
  const st = await ev(() => { const p = AIRP.mine.fighter; p.manual = true; p.engOn = true; p.eng = 1; p.parking = false; p.brake = false; p.thrT = 1; p.thr = 1; p.onGround = false; p.y += 300; p.v = 120; p.vy = 0; p.pitch = 0; p.roll = 0; p.gear = 0; p.gearT = 0; const o = {}; for (const [nm, jx] of [['right', 1], ['left', -1]]) { const y0 = p.yaw, x0 = p.x, z0 = p.z; inp.jx = jx; for (let i = 0; i < 120; i++)p.fly(.016); inp.jx = 0; p.roll = 0; o[nm] = +((p.x - x0) * -Math.cos(y0) + (p.z - z0) * Math.sin(y0)).toFixed(1) } p.manual = false; p.y -= 300; return o });
  console.log('lateral movement on screen (+ = right)', JSON.stringify(st)); assert(st.right > 5 && st.left < -5, 'steering is mirrored');
  // 2. a friend's fighter: drawn, rideable
  await ev(() => { COOP.online = () => true; COOP.push = () => { }; const p = AIRP.mine.fighter; window.__f = [player.x + 4, player.y, player.z + 4]; AIRP.mine.fighter.root.visible = false; AIRP.mine.fighter.crashed = true; COOP.peers.set('pal', { peer: 'pal', st: { v: 1, in: 1, zn: COOP.zone(), n: 'Pal', x: __f[0], y: __f[1], z: __f[2], r: 0, m: 'walk', ch: CHAR.cur, o: 0, pf: [__f[0], __f[1] + 1.6, __f[2], 0, 0, 0, .3, 1, 1] }, P: null, tag: null, tagName: '', bub: null, bubT: 0, sayT: 0, x: 0, y: 0, z: 0, yaw: 0, has: false, outfit: -1 }) });
  await page.waitForFunction(() => { const R = COOP.peers.get('pal'); return R && R.fighter }, null, { timeout: 60000 }); await h.wait(2500);
  const rf = await ev(() => { const R = COOP.peers.get('pal'), o = PASS.hostObj(R); return { has: !!R.fighter, vis: R.fighter.root.visible, host: !!o, kind: o && o.kind, seat: PASS.freeSeat(R) } }); console.log('friend fighter', JSON.stringify(rf)); assert(rf.has && rf.host && rf.seat === 0, 'the friend fighter is not rideable');
  await shot('fseat_remote', 1500);
  await ev(() => { player.x = __f[0] + 3; player.z = __f[2]; player.y = __f[1] }); await h.wait(800);
  const cand = await ev(() => { const R = PASS.find(); return R ? R.peer : null }); assert.strictEqual(cand, 'pal', 'no "Ride with" prompt next to the friend fighter');
  await ev(() => PASS.board(PASS.find())); await h.wait(1500); const rd = await ev(() => { const R = COOP.peers.get('pal'), p = R.fighter.root.position; return { host: PASS.host, d: +Math.hypot(player.x - p.x, player.z - p.z).toFixed(1) } }); console.log('riding', JSON.stringify(rd)); assert(rd.host === 'pal' && rd.d < 4, 'not seated in the fighter');
  await shot('fseat_riding', 2000); await ev(() => { PASS.leave('test', true); COOP.peers.delete('pal') });
};
