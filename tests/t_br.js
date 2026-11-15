// Battle Royale smoke test with the tablet caps (run with IPAD=1): starts a match from the main menu, lets the bus / drop run, and checks the match state, bots, no console errors,
// and the work per frame (draw calls / triangles / geometries) so a regression in the streaming or culling shows up. Rendering is real for one frame at the end.
exports.opts = { w: 800, h: 480, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'high'; applyQuality(); });
  await ev(() => document.getElementById('bBRm').click()); await h.wait(1500);
  await ev(() => { const g = document.getElementById('crGo'); if (g) g.click(); }); await h.wait(8000);
  await page.waitForFunction(() => BR.on, null, { timeout: 60000 });
  // the shader warm-up of the bus ride draws ONE sample per step, not the whole scene (brwarm.js): a few draw calls per sample
  await page.waitForFunction(() => BRWARM.stat.n >= 3, null, { timeout: 120000 });
  const W = await ev(() => ({ samples: BRWARM.stat.n, callsPerSample: +(BRWARM.stat.calls / BRWARM.stat.n).toFixed(1) })); console.log('warm-up', JSON.stringify(W)); assert(W.callsPerSample < 40, 'the warm-up draws the whole scene again: ' + W.callsPerSample + ' draw calls per sample');
  await h.noRender();
  await h.wait(8000);
  const A = await ev(() => ({ phase: BR.phase, bots: BOTS.list.length, alive: BOTS.alive(), mobile: MOBILE, chunks: chunks.size, R: renderRadius() }));
  console.log('BR', JSON.stringify(A));
  assert(A.bots >= 3 && A.bots <= 7, 'bot count on a tablet: ' + A.bots);
  // let the match run a while: bots drop, loot, the storm plan ticks
  await h.wait(25000);
  const B = await ev(() => { renderer.info.reset(); (window.__rr || renderer.render.bind(renderer))(scene, camera); return { phase: BR.phase, alive: BOTS.alive(), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, chunks: chunks.size } });
  console.log('BR later', JSON.stringify(B));
  assert(B.alive >= 1, 'no bots alive');
};
