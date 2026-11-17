// CPU profile of the game loop per section at High (round 39): ms per frame of each safe('name') block + the render, draw calls, triangles. Run with IPAD=1 (tablet profile).
exports.opts = { w: 1024, h: 768, warn: false };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'high'; S.polish = 'max'; applyQuality(); }); await h.start(); await h.render(); await h.wait(4000);
  for (const spot of ['home', 'centre']) {
    if (spot === 'centre') { await ev(() => { const p = PLACES.find(q => q.id === 'opera') || PLACES.find(q => /Deryb/i.test(q.name)) || PLACES[1]; teleport(p) }); await h.wait(9000) }
    const r = await ev(async () => {
      window.PROF = {}; let frames = 0, rt = 0; const R = composer || renderer, o = R.render.bind(R); R.render = (...a) => { const t = performance.now(); o(...a); rt += performance.now() - t; frames++ };
      renderer.info.reset(); await new Promise(r => setTimeout(r, 8000)); R.render = o; const P = window.PROF; window.PROF = null;
      const rows = Object.entries(P).map(([k, v]) => [k, +(v / Math.max(1, frames)).toFixed(2)]).sort((a, b) => b[1] - a[1]).slice(0, 14);
      return { frames, renderMs: +(rt / Math.max(1, frames)).toFixed(1), calls: Math.round(renderer.info.render.calls / Math.max(1, frames)), tris: Math.round(renderer.info.render.triangles / Math.max(1, frames)), geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, rows } });
    console.log(spot, JSON.stringify(r));
  }
};
