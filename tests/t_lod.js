// The "draw / keep only what is near" rules of the performance round (2026-11-15), each checked on its own state:
//   1. parked GLB vehicles: the model is dropped (placeholder back, file released when nobody shows it) once the player is far away, and comes back on return;
//   2. text plates (plateMesh): hidden beyond ~70 x their size, shown again near, and never hidden inside an interior;
//   3. instanced landmark props are measured from their INSTANCES: the market's fruit is not drawn at the home yard 10 km away, and is drawn at the market;
//   4. the chunk detail mesh (sleepers, bins) is shown near only; chunks far from the shadow box do not cast;
//   5. lazy label textures hold no canvas before they are seen; gpudiet.js is alive (it switches itself off on an error).
// Run with IPAD=1 (the limits are the tablet's).
const assert = require('assert');
exports.opts = { w: 800, h: 480, warn: false };
exports.run = async (page, h) => {
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a); await h.noRender();
  const until = async (name, f, ms = 60000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await h.wait(250) } assert.fail('timeout waiting for ' + name) };
  const settle = async () => { await h.wait(1500); for (let i = 0, same = 0, last = -1; i < 90 && same < 3; i++) { await h.wait(700); const n = await ev(() => CHUNK_JOB ? -1 : chunks.size); same = n >= 0 && n === last ? same + 1 : 0; last = n; } };
  await settle();
  // ---- 5. lazy textures
  const lazy = await ev(() => { let n = 0, painted = 0; for (const m of PLATE_LOD) { const t = m.material.map; if (!t || !t.lazy) continue; n++; const d = Object.getOwnPropertyDescriptor(t, 'image'); if (d && d.value && d.value.width) painted++ } return { plates: PLATE_LOD.length, lazy: n, holdingACanvas: painted, diet: GPUDIET.on, dietErr: GPUDIET.err ? String(GPUDIET.err) : null } });
  console.log('lazy textures', JSON.stringify(lazy)); assert(lazy.lazy > 100, 'plates are not lazy textures'); assert(lazy.holdingACanvas < lazy.lazy * .2, 'lazy plates hold their canvases: ' + lazy.holdingACanvas + ' of ' + lazy.lazy); assert(lazy.diet, 'gpudiet switched itself off: ' + lazy.dietErr);
  // ---- 1. vehicles
  await until('the yard cars\' models', () => EXT.veh.filter(v => typeof LV_GLB !== 'undefined' && LV_GLB[v.kind]).every(v => v.glbDone), 120000);
  const v0 = await ev(() => ({ n: EXT.veh.filter(v => v.glbDone).length, use: Object.assign({}, LV_GLB_USE), cache: Object.keys(LV_GLB_CACHE).length }));
  await ev(() => teleportRaw(player.x + 900, player.z, 0, 0)); await until('the models to be dropped', () => EXT.veh.every(v => !v.glbDone), 30000);
  const v1 = await ev(() => ({ n: EXT.veh.filter(v => v.glbDone).length, pending: EXT.veh.filter(v => v.glbPending).length, cache: Object.keys(LV_GLB_CACHE).length, wheels: EXT.veh.filter(v => LV_GLB[v.kind] && v.kind !== 'moto').map(v => v.wheels.length) }));
  await ev(() => teleportRaw(3, 14, 0, 0)); await until('the models to come back', () => EXT.veh.filter(v => LV_GLB[v.kind]).every(v => v.glbDone), 120000);
  const v2 = await ev(() => ({ n: EXT.veh.filter(v => v.glbDone).length, cache: Object.keys(LV_GLB_CACHE).length, wheels: EXT.veh.filter(v => LV_GLB[v.kind] && v.kind !== 'moto').map(v => v.wheels.length) }));
  console.log('vehicles', JSON.stringify({ near: v0, far: v1, back: v2 }));
  assert(v0.n >= 4, 'no GLB vehicles near home'); assert.strictEqual(v1.n, 0); assert.strictEqual(v1.cache, 0, 'the files are still cached with no vehicle showing them'); assert.strictEqual(v2.n, v0.n); assert(v2.wheels.every(w => w === 4), 'wheels after the reload: ' + v2.wheels);
  // drive one after the reload: it must still work
  const drove = await ev(async () => { const g = EXT.veh.find(q => q.kind === 'gtr'); EXT.summon('gtr'); if (!EXT.cur) EXT.enter(g); const x0 = g.x, z0 = g.z; inp.k.KeyW = true; await new Promise(r => setTimeout(r, 3500)); inp.k.KeyW = false; const d = Math.hypot(g.x - x0, g.z - z0); EXT.exit(); return +d.toFixed(1) });
  console.log('drove', drove, 'm'); assert(drove > 2, 'the reloaded car does not drive');
  // ---- 2. plates: far ones hidden, near ones shown
  await ev(() => teleportRaw(3, 14, 0, 0)); await settle(); await h.wait(1200);
  const pl = await ev(() => { let far = 0, farHidden = 0, near = 0, nearShown = 0; const k = MOBILE ? 70 : 130; for (const m of PLATE_LOD) { if (!m.parent) continue; let chain = true; for (let p = m.parent; p; p = p.parent) if (!p.visible) chain = false; if (!chain) continue; const e = m.matrixWorld.elements, P = m.userData.plp, d = Math.hypot((P ? P[0] : e[12]) - camera.position.x, (P ? P[1] : e[14]) - camera.position.z), lim = Math.min(900, Math.max(45, m.userData.pl * k)); if (d > lim * 1.2) { far++; if (!m.visible) farHidden++ } else if (d < lim * .9) { near++; if (m.visible || m.userData.plc === 0 || m.userData.plc === undefined) nearShown++ } } return { far, farHidden, near, nearShown } });
  console.log('plates', JSON.stringify(pl)); assert(pl.far > 20 && pl.farHidden === pl.far, 'far plates are drawn'); assert.strictEqual(pl.nearShown, pl.near, 'a near plate is hidden by the distance rule');
  // ---- 4. chunk detail + shadow casting
  const ch = await ev(() => { const out = { det: 0, detNear: 0, detFarShown: 0, cast: 0, n: 0 }; for (const c of chunks.values()) { out.n++; const cx = BB[0] + (c.id % NCX + .5) * CH, cz = BB[2] + (Math.floor(c.id / NCX) + .5) * CH, box = Math.hypot(Math.max(0, Math.abs(cx - player.x) - CH / 2), Math.max(0, Math.abs(cz - player.z) - CH / 2)); if (c.det) { out.det++; if (box < 80 && c.det.visible) out.detNear++; if (box > 300 && c.det.visible) out.detFarShown++ } if (c.bld && c.bld.castShadow) out.cast++ } return out });
  console.log('chunks', JSON.stringify(ch)); assert.strictEqual(ch.detFarShown, 0, 'a far chunk shows its detail mesh'); assert(ch.cast >= 1 && ch.cast <= 9 && ch.cast < ch.n, 'chunks casting shadows: ' + ch.cast + ' of ' + ch.n);
  // ---- 3. instanced landmark props by their instances
  const fruitHome = await ev(() => LANDMARK_GRP.children.filter(o => o.isInstancedMesh && o.count > 200 && o.userData.ib && Math.hypot(o.userData.ib[0] - player.x, o.userData.ib[1] - player.z) > 3000).map(o => o.visible));   // (the small flocks whose own code flips .visible every frame are not judged here)
  assert(fruitHome.length > 0 && fruitHome.every(v => !v), 'instanced props kilometres away are drawn at home: ' + JSON.stringify(fruitHome));
  const spot = await ev(() => { const o = LANDMARK_GRP.children.filter(o => o.isInstancedMesh && o.userData.ib && !o.userData.lodMax).sort((a, b) => b.count - a.count)[0]; return o ? [o.userData.ib[0], o.userData.ib[1], o.count] : null });
  await ev((s) => teleportRaw(s[0] + 12, s[1] + 12, 0, 0), spot); await settle(); await h.wait(1200);
  const there = await ev((s) => { const o = LANDMARK_GRP.children.filter(o => o.isInstancedMesh && o.userData.ib && Math.abs(o.userData.ib[0] - s[0]) < 1 && o.count === s[2])[0]; return { visible: o.visible, count: o.count } }, spot);
  console.log('instanced props at their own place', JSON.stringify(there)); assert(there.visible, 'the instanced props are hidden where they stand');
  // ---- 2b. inside an interior every plate of it is shown
  await ev(() => teleportRaw(3, 14, 0, 0)); await settle();
  await ev(() => PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' })); await until('the interior', () => !!PORTAL.cur); await h.wait(1500);
  const inside = await ev(() => PLATE_LOD.filter(m => m.userData.plc === 1).length); console.log('plates culled while inside an interior:', inside); assert.strictEqual(inside, 0);
  await ev(() => PORTAL.leave && PORTAL.leave()); await h.wait(800);
  console.log('LOD RULES OK');
};
