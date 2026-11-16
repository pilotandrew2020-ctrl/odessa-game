// The Mega coaster of Gorky Park (rails.js): the track is built, the station prompt works, the ride lifts, drops, goes through the vertical loop upside down, brakes and puts you back. COASTERSHOT=1: screenshots tests/out/coaster_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.COASTERSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  const info = await ev(() => { const T = RAILS.gorkyT; return { L: Math.round(T.L), n: T.N, lift: T.lift.map(Math.round) } }); console.log('track', JSON.stringify(info)); assert(info.L > 350, 'track too short');
  await ev(() => { const T = RAILS.gorkyT, w = RAILS.startWorld(T); teleportRaw(w.x + 2, w.z + 3, 0) }); await h.wait(12000);
  assert(await ev(() => RAILS.near() === RAILS.gorkyT), 'no station prompt at the coaster');
  await ev(() => { const T = RAILS.gorkyT, w = RAILS.startWorld(T); window.DBGCAM = [w.x + 80, w.y + 45, w.z + 70, w.x + 30, w.y + 10, w.z - 15] }); await shot('coaster_track', 3500);
  await ev(() => { window.DBGCAM = null; RAILS.ride(RAILS.gorkyT) });
  const r = await ev(() => { const o = { vmax: 0, hmax: 0, inv: 0, lifted: false, frames: 0, s: [] }; const T = RAILS.cur; for (let i = 0; i < 4000 && RAILS.on; i++) { RAILS.frame(.05); o.frames++; o.vmax = Math.max(o.vmax, RAILS.v); const S = RAILS.state(T, RAILS.s); o.hmax = Math.max(o.hmax, S.p.y); if (S.u.y < -.3) o.inv++; if (RAILS.s > T.lift[1]) o.lifted = true; if (i % 400 === 0) o.s.push(Math.round(RAILS.v * 3.6)) } o.done = !RAILS.on; return o });
  console.log('ride', JSON.stringify(r)); assert(r.done, 'the ride did not finish'); assert(r.hmax > 30, 'the lift did not climb'); assert(r.vmax > 17, 'too slow after the drop: ' + r.vmax); assert(r.inv > 5, 'never upside down: the loop is not ridden'); assert(r.frames < 3900, 'stalled');
  const back = await ev(() => ({ on: RAILS.on, vis: PLR.root.visible, cls: document.body.classList.contains('railson') })); assert(!back.on && back.vis && !back.cls, 'stuck state after the ride: ' + JSON.stringify(back));
  // a screenshot from inside the first loop
  await ev(() => { RAILS.ride(RAILS.gorkyT); const T = RAILS.cur; RAILS.s = T.at(20); RAILS.v = 20; RAILS.frame(.05) }); await shot('coaster_loop', 1200); await ev(() => RAILS.end());
};
