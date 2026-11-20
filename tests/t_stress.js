// Stress test (iPad emulation, 4x CPU throttle): run into building walls at huge frame times (no tunnelling, no sinking under the floor), then detonate the nuke and measure JS heap + frame time.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); const ev = (f, a) => page.evaluate(f, a);
  await h.boot(); await ev(() => { S.q = 'low'; applyQuality() }); await h.start(); await h.render();
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await ev(() => { const p = PLACES.find(q => q.id === 'deriba'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(12000);
  const heap = () => ev(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
  const h0 = await heap(); console.log('heap at start MB', h0);
  // 1. run into walls: 60 starting points round the centre, each runs at the nearest solid for 40 big frames
  const res = await ev(() => { let tests = 0, bad = [], under = 0; const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647 })();
    const cx = player.x, cz = player.z;
    for (let k = 0; k < 400 && tests < 60; k++) { const x = cx + (rnd() - .5) * 260, z = cz + (rnd() - .5) * 260;
      if (insideAny(x, z, .4, groundH(x, z) + 1)) continue;
      let dir = null; for (let a = 0; a < 6.28 && !dir; a += .39) for (let d = 1.5; d < 9; d += 1.5) if (insideAny(x + Math.sin(a) * d, z + Math.cos(a) * d, .1, groundH(x, z) + 1)) { dir = a; break }
      if (dir === null) continue; tests++; player.x = x; player.z = z; player.y = groundH(x, z); player.vx = player.vz = 0; player.air = false; cam.yaw = dir; inp.k.KeyW = true; inp.k.ShiftLeft = true; player.scoot = tests % 3 === 0;
      for (let i = 0; i < 40; i++) { stepPlayer(i % 2 ? .25 : .1);
        if (insideAny(player.x, player.z, .12, player.y + 1)) { bad.push([Math.round(x), Math.round(z), i]); break }
        if (player.y < groundH(player.x, player.z) - 1.5) { under++; break } } }
    inp.k.KeyW = false; inp.k.ShiftLeft = false; player.scoot = false; return { tests, bad: bad.slice(0, 8), nbad: bad.length, under } });
  console.log('wall run', JSON.stringify(res)); assert(res.tests >= 20, 'not enough wall tests'); assert(res.nbad === 0 && res.under === 0, 'went through a wall / under the floor');
  // 2. the nuke
  await ev(() => { teleportRaw(player.x, player.z, 0); cam.init = false }); await h.wait(3000);
  await ev(() => { window.__ft = []; let l = performance.now(); (function f() { const n = performance.now(); window.__ft.push(n - l); l = n; requestAnimationFrame(f) })() });
  await ev(() => NUKE.drop(260)); let peak = 0;
  for (let i = 0; i < 40; i++) { await h.wait(1000); peak = Math.max(peak, await heap()) }
  const ft = await ev(() => { const a = window.__ft.slice().sort((x, y) => x - y); return { n: a.length, med: a[a.length >> 1], p95: a[Math.floor(a.length * .95)], max: a[a.length - 1] } });
  console.log('nuke: heap start', h0, 'peak', peak, 'frame ms', JSON.stringify(ft));
  assert(peak < 0 || peak - h0 < 250, 'heap spike after the nuke too high');
};
