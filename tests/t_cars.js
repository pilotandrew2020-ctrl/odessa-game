// The three Sketchfab cars added on 2026-11-12 (Porsche 911 Turbo, Porsche 918 Spyder, Aston Martin DB9): each is parked in the home yard, its GLB loads,
// the four wheel pivots exist (front ones steer, all spin), the body stands on the ground at the real length, the driver seat is inside the car,
// it accelerates and steers, and the Garage lists it. The last step takes one screenshot of the player sitting in each car (tests/out/car_<kind>.png).
exports.opts = { w: 900, h: 560, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => document.getElementById('bStart').click()); await h.wait(1500);
  await ev(() => document.getElementById('crGo').click()); await h.wait(6000);   // bStart opens the character creator, crGo starts the game
  await h.noRender();
  assert.deepStrictEqual(await ev(() => LV_NAMES.slice(5)), ['gtr', 'p911', 'p918', 'db9'], 'LV_NAMES must only grow at the end (network index)');
  const garage = await ev(() => GAR.LIST.map(e => e.id));
  for (const k of ['p911', 'p918', 'db9']) assert(garage.includes(k), 'the Garage does not list ' + k);
  const want = { p911: 4.28, p918: 4.65, db9: 4.7 };
  for (const kind of ['p911', 'p918', 'db9']) {
    await ev(k => { const v = EXT.veh.find(q => q.kind === k); if (!v) throw new Error('no ' + k + ' parked in the yard'); v.attachGLB(); }, kind);
    await page.waitForFunction(k => EXT.veh.find(q => q.kind === k).glbDone, kind, { timeout: 90000 });
    const R = await ev(k => {
      const v = EXT.veh.find(q => q.kind === k), ry = v.root.rotation.y; v.root.rotation.y = 0; v.root.updateMatrixWorld(true);   // measure along the car's own axes
      const b = new THREE.Box3().setFromObject(v.body), s = new THREE.Vector3(); b.getSize(s);
      const seat = new THREE.Vector3(); v.seatWorld(0, seat); const loc = v.susp.worldToLocal(seat.clone()); v.root.rotation.y = ry; v.root.updateMatrixWorld(true);
      let tris = 0; v.body.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 });
      return { len: s.z, wid: s.x, minY: b.min.y - v.root.position.y, wheels: v.wheels.map(w => ({ front: w.front, r: w.r, x: +w.piv.position.x.toFixed(2), z: +w.piv.position.z.toFixed(2) })), tris, tail: !!v.tailMat, lamp: !!v.lampMat, seatLoc: loc.toArray().map(q => +q.toFixed(2)), seats: v.seats.length };
    }, kind);
    console.log(kind, JSON.stringify(R));
    assert.strictEqual(R.wheels.length, 4, kind + ': wheel pivots missing');
    assert.strictEqual(R.wheels.filter(w => w.front).length, 2);
    assert(Math.abs(R.len - want[kind]) < .25, kind + ': length ' + R.len);
    assert(Math.abs(R.minY) < .12, kind + ': not standing on the ground (' + R.minY + ')');
    assert(R.tris > 8000 && R.tris < 60000, kind + ': triangle count ' + R.tris);
    assert(R.tail && R.lamp, kind + ': tail / head lamp materials not found (no night glow)');
    assert(Math.abs(R.seatLoc[0]) < .6 && R.seatLoc[1] > .1 && R.seatLoc[1] < .6 && Math.abs(R.seatLoc[2]) < 1, kind + ': driver seat outside the cabin ' + R.seatLoc);
    // drive: accelerate, then steer; only the front wheels may turn
    const D = await ev(k => {
      const v = EXT.veh.find(q => q.kind === k); v.halt(); const y0 = v.yaw, sp0 = v.wheels.map(w => w.spin.rotation.x), ia = window.insideAny; window.insideAny = () => false;   // the yard has walls: drive through them, this checks the car, not the map
      for (let i = 0; i < 80; i++) v.step(.05, 1, 0, 0, 0, false); const sp = Math.hypot(v.vx, v.vz);
      for (let i = 0; i < 40; i++) v.step(.05, .6, 1, 0, 0, false);
      window.insideAny = ia; v.sync();
      return { sp, dyaw: Math.abs(v.yaw - y0), frontTurn: v.wheels.filter(w => w.front).map(w => Math.abs(w.piv.rotation.y)), rearTurn: v.wheels.filter(w => !w.front).map(w => Math.abs(w.piv.rotation.y)), spun: v.wheels.map((w, i) => w.spin.rotation.x !== sp0[i]) };
    }, kind);
    console.log(kind, 'drive', JSON.stringify(D));
    assert(D.sp > 12, kind + ': does not accelerate (' + D.sp + ')');
    assert(D.dyaw > .15, kind + ': does not steer');
    assert(D.frontTurn.every(a => a > .004) && D.rearTurn.every(a => a < 1e-6), kind + ': wrong wheels steer');
    assert(D.spun.every(Boolean), kind + ': wheels do not spin');
    // sit in it for the screenshot
    await ev(k => { const v = EXT.veh.find(q => q.kind === k); v.halt(); EXT.summon(k); EXT.enter(v); }, kind); await h.wait(1500);
    assert(await ev(() => !!EXT.cur), kind + ': could not get in');
    if (process.env.CARSHOT) {
      await h.shot('car_' + kind, 3000);
      // close side view from the driver's door: is the player really inside the cabin?
      await ev(() => { const v = EXT.cur, y = v.yaw, l = [Math.cos(y), -Math.sin(y)], f = [Math.sin(y), Math.cos(y)]; window.DBGCAM = [v.x + l[0] * 4.2 + f[0] * 1.2, v.y + 1.5, v.z + l[1] * 4.2 + f[1] * 1.2, v.x, v.y + .8, v.z]; });
      await h.shot('car_' + kind + '_side', 3000); await ev(() => { delete window.DBGCAM });
    }
    await ev(() => { EXT.leave(EXT.cur) }); await h.wait(500);
  }
  // the Garage turntable shows each of them (the proxy vehicle loads its GLB and gets measured)
  await ev(() => GAR.open()); await h.wait(800);
  for (const k of ['p911', 'p918', 'db9']) {
    await ev(id => GAR.show(GAR.LIST.findIndex(e => e.id === id)), k);
    await page.waitForFunction(id => { const e = GAR.LIST.find(q => q.id === id); return e.v && e.v.glbDone }, k, { timeout: 90000 });
    const G = await ev(id => { const e = GAR.LIST.find(q => q.id === id), M = GAR.cache[id]; return { name: GAR.nameB.textContent, L: +M.L.toFixed(2), H: +M.H.toFixed(2) } }, k);
    console.log('garage', k, JSON.stringify(G)); assert(G.L > 3.8 && G.L < 5.2, k + ': garage size ' + G.L);
  }
  await ev(() => GAR.close());
};
