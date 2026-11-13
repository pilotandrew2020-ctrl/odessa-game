// Where the JS time of a frame goes (CPU only, rendering stubbed), per loop stage and for the Battle Royale ticks, in normal walking vs in a Battle Royale match. Run with IPAD=1.
// MODE=walk|br (default br), SECS=<wall seconds to measure>.
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const mode = process.env.MODE || 'br', secs = +(process.env.SECS || 20);
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'high'; applyQuality(); });
  if (mode === 'br') { await ev(() => document.getElementById('bBRm').click()); await h.wait(1500); await ev(() => { const g = document.getElementById('crGo'); if (g) g.click() }); await page.waitForFunction(() => typeof BR !== 'undefined' && BR.on, null, { timeout: 90000 }); await h.noRender(); await h.wait(3000);
    await ev(() => { BR.t0 = 0; inp.jump = true }); await h.wait(2500); await ev(() => { BR.land(groundAt(player.x, player.z, player.y)) }); await h.wait(4000) }
  else { await h.start(); await h.noRender(); await h.wait(3000) }
  await ev(() => {
    window.__T = {}; window.__F = 0;
    const acc = (n, d) => { const q = window.__T[n] || (window.__T[n] = { sum: 0, max: 0, n: 0 }); q.sum += d; q.n++; if (d > q.max) q.max = d };
    const os = window.safe; window.safe = function (n, f) { const t = performance.now(); try { return os(n, f) } finally { acc('stage:' + n, performance.now() - t) } };
    for (const [o, nm, k] of [[BR, 'BR', 'tick'], [BOTS, 'BOTS', 'tick'], [window, 'updatePeds', 'updatePeds'], [window, 'updateCars', 'updateCars'], [window, 'updateChunks', 'updateChunks'], [TREES, 'TREES', 'update'], [TREES, 'TREES', 'cull'], [window, 'adaptRes', 'adaptRes'], [window, 'updateHUD', 'updateHUD']]) { const f = o[k]; if (typeof f !== 'function') continue; o[k] = function () { const t = performance.now(); const r = f.apply(this, arguments); acc(nm + '.' + k, performance.now() - t); return r } }
    const lf = window.loop; let last = performance.now(); (function fr() { window.__F++; requestAnimationFrame(fr) })();
  });
  const t0 = Date.now(); await h.wait(secs * 1000);
  const R = await ev(() => ({ frames: window.__F, T: window.__T, br: typeof BR !== 'undefined' ? { phase: BR.phase, items: BR.items.length, bots: BOTS.list.length } : null }));
  const ms = Date.now() - t0; console.log('mode', mode, 'frames', R.frames, 'in', (ms / 1000).toFixed(1), 's', JSON.stringify(R.br));
  for (const [k, v] of Object.entries(R.T).sort((a, b) => b[1].sum - a[1].sum)) console.log(k.padEnd(22), 'avg', (v.sum / v.n).toFixed(2), 'ms  max', v.max.toFixed(1), ' calls', v.n, ' total/s', (v.sum / (ms / 1000)).toFixed(0), 'ms');
};
