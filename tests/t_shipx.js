// Life on the cruise ship (shipx.js): the plan (open rectangles from the deck grid), bridge + helm (steer, the ship moves and turns, moor), the water slide (rails.js), bar / shop / cabins (seats, bed, drink). SHIPXSHOT=1: screenshots tests/out/shipx_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SHIPXSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await page.waitForFunction(() => SHIP.ready && SHIPX.plan && SHIP.A && SHIP.A.props, null, { timeout: 180000 });
  const pl = await ev(() => { const P = SHIPX.plan, r = k => P[k] && { f: +P[k].f.toFixed(1), x: Math.round(P[k].cx), z: Math.round(P[k].cz) }; return { helm: r('helm'), slide: r('slide'), bar: r('bar'), shop: r('shop'), cabins: P.cabins.map(c => ({ f: +c.f.toFixed(1), x: Math.round(c.cx), z: Math.round(c.cz) })) } });
  console.log('plan', JSON.stringify(pl)); assert(pl.helm && pl.slide && pl.bar && pl.shop && pl.cabins.length >= 2, 'the deck grid has no room for something');
  // go aboard the moored ship: stand next to a point and look at it (a helper)
  const go = async (lx, lz, f, look) => { await ev(a => { const I = SHIP.A, [wx, wz] = SHIP.world(I, a.lx, a.lz); teleportRaw(wx, wz, I.th + Math.PI); window.__t = [wx, wz, I.g.position.y + a.f] }, { lx, lz, f }); await h.wait(2500); await ev(() => { player.x = __t[0]; player.z = __t[1]; player.y = __t[2] + .05; player.vy = 0; player.air = false; try { SWIM.reset() } catch (e) { } }); await h.wait(1200) };
  // ---- bar: sit on a stool, order a drink
  await go(pl.bar.x, pl.bar.z + 1, pl.bar.f);
  const bar = await ev(() => { const I = SHIP.A; const s = I.seats.find(q => Math.abs(q.lx - I.barSpot.lx) < 4.5 && Math.abs(q.lz - I.barSpot.lz) < 3); const [wx, wz] = SHIP.world(I, s.lx, s.lz); player.x = wx; player.z = wz; player.y = I.g.position.y + s.f + .05; return { seats: I.seats.length, beds: I.beds.length, near: !!SHIPX.near(I2 => I2.seats, 1.3) } }); console.log('bar', JSON.stringify(bar)); assert(bar.near, 'no seat prompt at the bar');
  await ev(() => { cam.dist = 7; cam.pitch = .25; cam.init = false }); await shot('shipx_bar');
  const m0 = await ev(() => WALLET.get()); await ev(() => { const e = INTERACT.find(i => i.label === 'Order a drink (₴25)'); const I = SHIP.A, [wx, wz] = SHIP.world(I, I.barSpot.lx, I.barSpot.lz); player.x = wx; player.z = wz; e.fn() }); const m1 = await ev(() => WALLET.get()); assert(m1 === m0 - 25, 'the drink did not cost 25');
  // sit
  await ev(() => { const I = SHIP.A, s = I.seats[0]; SHIPX.sit(I, s) }); await h.wait(800); assert(await ev(() => !!player.sit), 'did not sit');
  await ev(() => { player.sit = null });
  // ---- shop
  await go(pl.shop.x, pl.shop.z, pl.shop.f); await ev(() => { cam.dist = 8; cam.pitch = .3; cam.init = false }); await shot('shipx_shop');
  // ---- cabin: walls block, the bed sleeps
  const c0 = pl.cabins[0]; await go(c0.x, c0.z, c0.f); await ev(() => { cam.dist = 5; cam.pitch = .5; cam.init = false }); await shot('shipx_cabin');
  const wall = await ev(() => { const I = SHIP.A, b = I.solids.find(q => q.x1 - q.x0 > 5 && q.z1 - q.z0 < .3); if (!b) return 'none'; const [wx, wz] = SHIP.world(I, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2); const r = SHIP.surface(I, wx, wz, I.g.position.y + b.f + .1); return r && r.wall }); console.log('cabin wall blocks', wall); assert(wall === true, 'cabin walls do not block');
  // ---- the water slide
  const sl = pl.slide; await go(sl.x + 3, sl.z, sl.f);
  const st = await ev(() => { const T = SHIP.A.slideT; return { near: RAILS.near() === T, L: Math.round(T.L) } }); console.log('slide', JSON.stringify(st)); assert(st.near, 'no slide prompt at the tower'); await ev(() => { cam.dist = 9; cam.pitch = .15; cam.init = false }); await shot('shipx_slide_tower');
  await ev(() => RAILS.ride(SHIP.A.slideT)); const r = await ev(() => { const o = { vmax: 0, hmax: -1e9, frames: 0 }; const T = RAILS.cur; for (let i = 0; i < 3000 && RAILS.on; i++) { RAILS.frame(.05); o.frames++; o.vmax = Math.max(o.vmax, RAILS.v); o.hmax = Math.max(o.hmax, RAILS.state(T, RAILS.s).p.y) } o.done = !RAILS.on; return o }); console.log('slide ride', JSON.stringify(r)); assert(r.done && r.hmax > sl.f + 12 && r.vmax > 7, 'slide ride');
  // ---- the bridge: take the helm, speed up, turn, the ship moves and carries us; moor
  const hm = pl.helm; await go(hm.x, hm.z, hm.f); const prompt = await ev(() => !!SHIPX.near(I => I.helmSpot ? [I.helmSpot] : [], 2.6)); assert(prompt, 'no helm prompt on the bridge');
  await ev(() => { cam.dist = 6; cam.pitch = .2; cam.init = false }); await shot('shipx_bridge', 2500);
  const p0 = await ev(() => { const I = SHIP.A; SHIPX.helm(I, I.helmSpot); I.ctl.th = 1; I.ctl.rud = 0; return { x: I.x, z: I.z, th: I.th, px: player.x, pz: player.z } });
  await ev(() => { const I = SHIP.A; for (let i = 0; i < 400; i++) { SHIPX.tick(.1); SHIP.update(.1) } });
  const p1 = await ev(() => { const I = SHIP.A; I.ctl.rud = 1; SHIPX.k.rr = 1; for (let i = 0; i < 400; i++) { SHIPX.tick(.1); SHIP.update(.1) } SHIPX.k.rr = 0; return { x: I.x, z: I.z, th: I.th, spd: I.spd, px: player.x, pz: player.z, mode: I.mode } });
  console.log('helm', JSON.stringify({ moved: Math.round(Math.hypot(p1.x - p0.x, p1.z - p0.z)), turned: +(p1.th - p0.th).toFixed(2), spd: +p1.spd.toFixed(1), mode: p1.mode, carried: Math.round(Math.hypot(p1.px - p1.x, p1.pz - p1.z)) }));
  assert(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 150 && p1.spd > 3 && p1.mode === 'manual', 'the ship did not sail under the helm'); assert(Math.abs(p1.th - p0.th) > .05, 'the rudder did not turn the ship');
  await shot('shipx_sailing', 2500);
  await ev(() => SHIPX.moor()); await ev(() => { const I = SHIP.A; for (let i = 0; i < 6000 && I.mode === 'home'; i++) SHIP.update(.1) }); const m = await ev(() => ({ mode: SHIP.A.mode, d: Math.round(Math.hypot(SHIP.A.x - SHIP.A.home.x, SHIP.A.z - SHIP.A.home.z)) })); console.log('moored', JSON.stringify(m)); assert(m.mode === 'dock' && m.d < 20, 'the ship did not return to the berth');
};
