// GLB trees, benches and Booba (trees.js): loads, instances near the player, winter variants, screenshots. See assets/IMPORTS.md.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'mid'; applyQuality(); });
  await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => GLBT.ready && BENCH.ready && BOOBA.root, null, { timeout: 120000 });
  await h.noRender();
  const stat = () => ev(() => ({ trees: Object.fromEntries(Object.entries(GLBT.K).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([n, g]) => [n, g.mesh ? g.mesh.count : 0]))])), benches: BENCH.bench.mesh ? BENCH.bench.mesh.count : 0, bins: BENCH.bin.mesh ? BENCH.bin.mesh.count : 0, booba: BOOBA.root.visible ? [BOOBA.root.position.x.toFixed(1), BOOBA.root.position.z.toFixed(1)] : null, season: S.season, player: [player.x | 0, player.z | 0] }));
  const look = (x, z, yaw, pitch) => ev(([x, z, yaw, pitch]) => { teleportRaw(x, z, yaw); cam.yaw = yaw; cam.pitch = pitch === undefined ? .25 : pitch; cam.init = false; TREES.dirty = true; BENCH.dirty = true }, [x, z, yaw, pitch]);
  const spots = [['home', null], ['gorky', 'gorky'], ['shevpark', 'shevpark'], ['lanzheron', 'lanzheron']];
  for (const season of ['summer', 'winter']) {
    await ev((s) => { S.season = s; applyTime() }, season);
    for (const [name, id] of spots) {
      if (id) { const p = await ev((id) => { const p = PLACES.find(q => q.id === id); return p ? { x: p.x, z: p.z, yaw: p.yaw } : null }, id); if (!p) { console.log('no place', id); continue } await look(p.x, p.z, p.yaw) }
      else await look(36, 6, 0.6);
      await page.waitForTimeout(4500);
      await ev(() => { TREES.dirty = true; BENCH.dirty = true }); await page.waitForTimeout(1500);
      console.log(season, name, JSON.stringify(await stat()));
      await h.shot('glb_' + season + '_' + name, 5000);
    }
  }
  console.log('renderer', JSON.stringify(await ev(() => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries }))));
};
