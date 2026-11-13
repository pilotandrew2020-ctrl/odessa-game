// A car driven badly in the city centre: full throttle, then hard steering, handbrake and sudden stops against real buildings (collisions ON), for SECS seconds. Reports console errors, the worst frame
// time (a hitch is how a tablet starts to stutter / the page is killed), how often vehicle crashes fired and whether objects / textures leak. KIND=gtr|p918|moto, START=<place id> (default opera). IPAD=1 for tablet caps.
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const kind = process.env.KIND || 'gtr', secs = +(process.env.SECS || 60);
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'high'; applyQuality() }); await h.noRender(); await h.wait(2500);
  await ev(([k, st]) => { const p = PLACES.find(q => q.id === st) || PLACES[0]; teleportRaw(p.x, p.z, p.yaw, 150); const v = EXT.veh.find(q => q.kind === k);
    let best = null; for (let i = 0; i < 400; i++) { const ri = randomSegNear(p.x, p.z, 10, 160, true); if (ri < 0) continue; const s = segInfo(ri, 1); if (s.L > 60 && (!best || s.L > best.L)) best = s }   // a long road segment (car roads) near the place
    if (best) { v.x = best.ax + best.tx * 10; v.z = best.az + best.tz * 10; v.yaw = Math.atan2(best.tx, best.tz) } else { v.x = p.x + 3; v.z = p.z + 3; v.yaw = p.yaw } v.y = lvGround(v.x, v.z); v.halt(); v.sync(); player.x = v.x; player.z = v.z; EXT.enter(v);
    window.__W = { crashes: 0, frames: [], last: performance.now(), maxDt: 0, hit: 0 }; const oc = v.crash.bind(v); v.crash = function (i, a, b) { window.__W.crashes++; return oc(i, a, b) };
    (function fr() { const n = performance.now(), d = n - window.__W.last; window.__W.last = n; if (d > window.__W.maxDt) window.__W.maxDt = d; window.__W.frames.push(d); requestAnimationFrame(fr) })();
    let n = 0; window.__drv = setInterval(() => { n++; const r = Math.random(); inp.k.KeyW = r > .15; inp.k.KeyS = r < .12; inp.k.Space = r > .6 && r < .75; inp.k.KeyA = Math.random() < .35; inp.k.KeyD = !inp.k.KeyA && Math.random() < .5 }, 350) }, [kind, process.env.START || 'opera']);
  const rows = [];
  for (let t = 0; t < secs; t += 5) { await h.wait(5000); rows.push(await ev(() => { const v = EXT.cur, W = window.__W; const f = W.frames.splice(0).sort((a, b) => b - a); let o = 0; scene.traverse(() => o++); return { sp: v ? Math.round(Math.hypot(v.vx, v.vz) * 3.6) : -1, dmg: v ? +v.dmg.toFixed(2) : -1, dead: v ? v.dead : null, crashes: W.crashes, objs: o, frames: f.length, worst: Math.round(f[0] || 0), p95: Math.round(f[Math.floor(f.length * .05)] || 0), nan: v ? !isFinite(v.x + v.z + v.yaw) : null } })); console.log(JSON.stringify(rows[rows.length - 1])) }
  await ev(() => { clearInterval(window.__drv); for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space']) inp.k[k] = false });
  console.log('SUMMARY', JSON.stringify({ worstFrameMs: Math.max(...rows.map(r => r.worst)), crashes: rows[rows.length - 1].crashes, objsGrowth: rows[rows.length - 1].objs - rows[0].objs, anyNaN: rows.some(r => r.nan) }));
};
