// Fast driving: how the world streams in while a car (or the 500 km/h motorbike) races across the city, and whether memory grows.
// Run with IPAD=1 to get the phone/tablet caps (MOBILE). Rendering is stubbed (software GL would only measure the CPU emulating a GPU); what is measured is
// the work the game itself does per frame: chunk building (the longest single slice of the streamer = a visible hitch), live chunks / geometries / textures
// and the JS heap, every 2 s, plus the three worst frame times. Env: KIND=gtr|p918|moto, Q=high|mid|low, SECS=<seconds of wall time>.
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const kind = process.env.KIND || 'gtr', Q = process.env.Q || 'high', secs = +(process.env.SECS || 40);
  await h.boot();
  await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(q => { S.q = q; applyQuality(); }, Q);
  console.log('quality', Q, 'MOBILE', await ev(() => MOBILE), 'caps', JSON.stringify(await ev(() => { const q = Qp(); return { pr: q.pr, shadow: q.shadow, R: q.R, trees: q.trees, cars: q.cars, peds: q.peds } })));
  await h.noRender();
  await h.wait(3000);
  // instrument the streamer: time every slice of the chunk generator
  await ev(() => {
    window.__st = { slices: [], builds: 0, disposed: 0, upd: 0, updMax: 0, frames: [] };
    const bg = window.buildChunkGen; window.buildChunkGen = function (id) { const g = bg(id); window.__st.builds++; return { next() { const t = performance.now(), r = g.next(); const d = performance.now() - t; window.__st.slices.push(d); return r } } };
    const dc = window.disposeChunk; window.disposeChunk = function (c) { window.__st.disposed++; return dc(c) };
    const uc = window.updateChunks; window.updateChunks = function (b, s) { const t = performance.now(); const r = uc.apply(this, arguments); const d = performance.now() - t; window.__st.upd += d; if (d > window.__st.updMax) window.__st.updMax = d; return r };
    let last = performance.now(); (function f() { const n = performance.now(); window.__st.frames.push(n - last); last = n; requestAnimationFrame(f) })();
  });
  // find a heading from the start place (env START=<place id>, default home) with the longest dry run, then put the vehicle there and hold the throttle
  await ev(st => { window.__start = st }, process.env.START || 'home');
  const plan = await ev(k => {
    const home = PLACES.find(p => p.id === (window.__start || 'home')); let best = { a: 0, d: 0 };
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; let d = 0; while (d < 9000 && groundH(home.x + Math.sin(a) * d, home.z + Math.cos(a) * d) > SL + .3) d += 50; if (d > best.d) best = { a, d } }
    const v = EXT.veh.find(q => q.kind === k); v.x = home.x; v.z = home.z; v.yaw = best.a; v.y = lvGround(v.x, v.z); v.halt(); v.sync(); player.x = v.x; player.z = v.z;
    EXT.enter(v); window.insideAny0 = window.insideAny; window.insideAny = () => false;   // no walls: this measures the streamer, not the map
    inp.k.KeyW = true; if (k === 'bike' || k === 'moto') inp.k.ShiftLeft = true; return { home: [Math.round(home.x), Math.round(home.z)], heading: +best.a.toFixed(2), dry: best.d, CH, NCX, NCZ };
  }, kind);
  console.log('plan', JSON.stringify(plan));
  const rows = [];
  for (let t = 0; t < secs; t += 2) {
    await h.wait(2000);
    rows.push(await ev(() => { const v = EXT.cur, s = window.__st, f = s.frames.splice(0), sl = s.slices.splice(0); f.sort((a, b) => b - a); sl.sort((a, b) => b - a);
      return { kmh: v ? Math.round(Math.abs(v.v) * 3.6) : -1, x: v ? Math.round(v.x) : 0, z: v ? Math.round(v.z) : 0, chunks: chunks.size, sceneObjs: (() => { let n = 0; scene.traverse(() => n++); return n })(), sceneKids: scene.children.length, texInScene: (() => { const t = new Set(); scene.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) for (const k of ['map', 'emissiveMap', 'normalMap']) if (m[k]) t.add(m[k]) }); return t.size })(), geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
        builds: s.builds, disposed: s.disposed, sliceMax: +(sl[0] || 0).toFixed(1), slice2: +(sl[1] || 0).toFixed(1), slicesOver16: sl.filter(x => x > 16).length, frameMax: Math.round(f[0] || 0), frames: f.length, updMs: Math.round(s.upd), updMax: +s.updMax.toFixed(1), dead: v ? v.dead : null } }));
    const r = rows[rows.length - 1]; console.log(JSON.stringify(r));
  }
  await ev(() => { inp.k.KeyW = false; inp.k.ShiftLeft = false; window.insideAny = window.insideAny0 });
  const first = rows[2], last = rows[rows.length - 1];
  console.log('SUMMARY', JSON.stringify({ kind, Q, topKmh: Math.max(...rows.map(r => r.kmh)), heapGrowthMB: last.heapMB - first.heapMB, geoGrowth: last.geo - first.geo, texGrowth: last.tex - first.tex, sceneObjsGrowth: last.sceneObjs - first.sceneObjs, sceneKidsGrowth: last.sceneKids - first.sceneKids, texInSceneGrowth: last.texInScene - first.texInScene, chunksNow: last.chunks, worstSliceMs: Math.max(...rows.map(r => r.sliceMax)), worstFrameMs: Math.max(...rows.map(r => r.frameMax)) }));
};
