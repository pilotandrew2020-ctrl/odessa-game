// vint.js: real (Cyrillic) names on the signs, the barbershop with working barbers, the bowling with a playable lane
const assert = require('assert');
exports.opts = { w: 1100, h: 640 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await h.start(); await h.noRender(); await h.wait(2000);
  await page.waitForFunction(() => VEN.ready, null, { timeout: 60000 });
  const v = await ev(() => { const c = {}; for (const x of VEN.all) c[x.c] = (c[x.c] || 0) + 1;
    const cyr = VEN.all.filter(x => /[А-яЇїІіЄєҐґ]/.test(x.name)).length;
    return { n: VEN.all.length, hair: c.hair, bowl: c.bowl, cyr, sample: VEN.all.filter(x => x.c === 'hair').slice(0, 5).map(x => x.name), int: [VEN.INT.hair, VEN.INT.bowl] } });
  console.log('venues', JSON.stringify(v));
  assert(v.n > 6000 && v.hair > 100 && v.bowl >= 1 && v.cyr > 3000, 'venue list');
  assert.deepStrictEqual(v.int, ['bg_barber', 'bg_bowling']);
  // a street in the centre: the live signs carry the real names
  await ev(() => { const v = VEN.all.find(x => /Таврія В/.test(x.name) && Math.abs(x.x - 1000) < 900 && Math.abs(x.z + 10300) < 900) || VEN.all.find(x => x.c === 'market' && /[А-я]/.test(x.name));
    VEN.match(v); teleportRaw(v.sx + v.nx * 7, v.sz + v.nz * 7, Math.atan2(-v.nx, -v.nz)); cam.pitch = .05; cam.dist = 5; cam.init = false; window.__v = v.name });
  await h.wait(9000);
  const signs = await ev(() => [...VEN.live.keys()].map(v => v.name));
  console.log('live signs', signs.length, JSON.stringify(signs.slice(0, 12)));
  assert(signs.length > 3 && signs.some(n => /[А-яЇїІіЄєҐґ]/.test(n)), 'cyrillic signs near the player');
  console.log(await h.shot('vint_street', 4000));

  // barbershop: walk up to a real salon's door; the door opens bg_barber and the room wears that salon's name
  const door = await ev(() => { const hs = VEN.all.filter(v => v.c === 'hair' && /барбер|barber/i.test(v.name)); for (const v of hs) { VEN.match(v); if (v.m !== 1) continue;
      teleportRaw(v.sx + v.nx * 1.2, v.sz + v.nz * 1.2, Math.atan2(-v.nx, -v.nz)); const b = bgFind(player.x, player.z); if (!b) continue; BG.cur = b; const t = bgType(b);
      if (t.id === 'bg_barber') { window.__hv = v.name; bgEnter(b); return { name: v.name, id: t.id, label: t.label } } } return null });
  console.log('salon door', JSON.stringify(door));
  assert(door && door.id === 'bg_barber', 'a real barbershop door opens the barber room');
  await h.wait(2500);
  await page.waitForFunction(() => { const B = PORTAL.active; if (!B) return false; let sk = 0; B.grp.traverse(o => { if (o.isSkinnedMesh) sk++ }); return sk >= 2 }, null, { timeout: 120000 });
  const bb = await ev(() => { const B = PORTAL.active; const names = []; let sk = null; B.grp.traverse(o => { if (o.isSkinnedMesh && !sk) sk = o });
    const bone = sk.skeleton.bones.find(b => /upperarm_r/.test(b.name)); window.__q0 = bone.quaternion.clone(); return { cur: PORTAL.cur, title: B.title, kids: B.grp.children.length, bone: bone.name } });
  console.log('barber', JSON.stringify(bb));
  assert.strictEqual(bb.title, door.name, 'the room carries the salon name');
  await h.wait(1500);
  const moved = await ev(() => { const B = PORTAL.active; let sk = null; B.grp.traverse(o => { if (o.isSkinnedMesh && !sk) sk = o }); const bone = sk.skeleton.bones.find(b => /upperarm_r/.test(b.name)); return 1 - Math.abs(bone.quaternion.dot(window.__q0)) });
  console.log('barber arm moved by', moved.toFixed(5));
  assert(moved > 1e-5, 'the barber is not animated');
  await h.wait(6000);
  await ev(() => { const B = PORTAL.active; player.x = B.spawn[0] + 2.2; player.z = B.spawn[1] + .6; player.yaw = -0.75; cam.yaw = player.yaw; cam.pitch = .12; cam.dist = 3.2; cam.init = false });
  console.log(await h.shot('vint_barber', 5000));
  await ev(() => { const B = PORTAL.active; player.x = B.spawn[0] - 1.2; player.z = B.spawn[1] + 2.0; player.yaw = 0.2; cam.yaw = player.yaw; cam.pitch = .2; cam.dist = 2.2; cam.init = false });
  console.log(await h.shot('vint_barber2', 4000));

  // bowling
  await ev(() => PORTAL.go('bg_bowling'));
  await h.wait(2500);
  await page.waitForFunction(() => { const B = PORTAL.active; return B && B.BW && B.BW.pins && B.BW.lanes.every(L => L.ball) }, null, { timeout: 120000 });
  await h.wait(6000);
  const lanes = await ev(() => PORTAL.active.BW.lanes.map(L => [L.n, +L.x.toFixed(2)]));
  console.log('lanes', JSON.stringify(lanes));
  await ev(() => { const B = PORTAL.active; player.x = B.spawn[0] - .4; player.z = B.spawn[1] + 6.5; player.yaw = 0; cam.yaw = 0; cam.pitch = .08; cam.dist = 3.5; cam.init = false });
  console.log(await h.shot('vint_bowl', 5000));
  // rent a lane and bowl on lane 2
  await ev(() => { const L = PORTAL.active.BW.lanes[1]; player.x = L.x + .75; player.z = INT_Z + 11.6; player.yaw = 0; cam.yaw = 0; cam.pitch = .02; cam.dist = 1.6; cam.init = false });
  await h.wait(1500);
  await ev(() => { const BW = PORTAL.active.BW; BW.paid = true; const L = BW.lanes[1]; const it = INTERACT.find(i => i.label === 'Bowl on lane 2'); it.fn(); window.__L = L; window.__t0 = performance.now() });
  await page.waitForFunction(() => window.__L.knock || !window.__L.busy, null, { timeout: 120000 });
  console.log('roll took', await ev(() => ((performance.now() - window.__t0) / 1000).toFixed(1) + ' s real'));
  console.log(await h.shot('vint_bowl_roll', 900));
  await page.waitForFunction(() => !window.__L.busy, null, { timeout: 60000 });
  const res = await ev(() => { const L = window.__L; return { total: L.total, roll: L.roll, frame: L.frame, down: L.pins.filter(p => !p.up).length } });
  console.log('bowl result', JSON.stringify(res));
  assert(res.frame >= 1 && res.total >= 0, 'lane state');
  await ev(() => PORTAL.exit()); await h.wait(1500);
};
