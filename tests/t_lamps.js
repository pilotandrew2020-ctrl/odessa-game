// Find flat discs / lamp meshes floating near the parked cars of the yard (owner: "the circles of the headlights fly in the air on all cars"). LAMPSHOT=1: screenshot.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  await page.waitForFunction(() => EXT.veh.length > 5, null, { timeout: 60000 });
  await ev(() => { for (const v of EXT.veh) v.attachGLB && v.attachGLB() }); await h.wait(9000);
  const r = await ev(() => { const out = [];
    for (const v of EXT.veh) { const bx = new THREE.Box3().setFromObject(v.root); const body = bx; v.root.traverse(o => { if (!o.isMesh) return; const n = (o.material && o.material.name) || '', gt = o.geometry.type; const em = o.material && o.material.emissive && o.material.emissive.getHex(); if (/Circle|Sphere|Ring/.test(gt) || /light|lamp|glass/i.test(n)) { const b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); out.push([v.kind, o.name, gt, n, +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2), +(c.y - v.root.position.y).toFixed(2), em]) } }) }
    return out.slice(0, 80) });
  for (const x of r) console.log(JSON.stringify(x));
  if (process.env.LAMPSHOT) { await ev(() => { const v = EXT.veh.find(q => q.kind === 'gtr'); cam.dist = 6; cam.pitch = .15; player.x = v.x + 5; player.z = v.z + 5; cam.yaw = Math.atan2(v.x - player.x, v.z - player.z) + Math.PI }); await h.shot('lamps', 5000) }
};
