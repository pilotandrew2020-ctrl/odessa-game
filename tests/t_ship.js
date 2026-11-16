// The cruise ship (ship.js, 2026-11-14): replaces the old Odesa Star at the sea terminal and the old yacht; every deck can be walked, a sailing ship carries the player.
// SHIPSHOT=1 saves screenshots tests/out/ship_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SHIPSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2000); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await page.waitForFunction(() => typeof SHIP !== 'undefined' && SHIP.ready, null, { timeout: 120000 });
  const st = await ev(() => ({ A: [Math.round(SHIP.A.x), Math.round(SHIP.A.z)], B: [Math.round(SHIP.B.x), Math.round(SHIP.B.z)], oldHidden: !CRUISE.g.visible, route: SHIP.route.map(p => p.map(Math.round)), deep: SHIP.route.every(p => rawH(p[0], p[1]) < SL - 14), cells: (() => { let n = 0; for (let i = 0; i < SHIP.deck.W * SHIP.deck.H; i++) if (SHIP.floors(SHIP.deck.off[i]).length) n++; return n })() }));
  console.log('ship', JSON.stringify(st)); assert(st.oldHidden, 'the old liner is still there'); assert(st.deep, 'the sailing route leaves deep water'); assert(st.cells > 3000, 'the deck map is nearly empty: ' + st.cells);
  // ---- the terminal ship: board it and walk
  await ev(() => { const p = PLACES.find(q => q.id === 'cruise'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(3000);
  await page.waitForFunction(() => SHIP.nearQuay(), null, { timeout: 30000 }); const pr = await ev(() => { const b = document.getElementById('bAct'); return b ? b.textContent.trim() : '' }); console.log('prompt', pr); assert(/Board the cruise ship/i.test(pr), 'no boarding prompt');
  await ev(() => SHIP.boardA()); await page.waitForFunction(() => { const I = SHIP.A, [lx, lz] = SHIP.local(I, player.x, player.z); return Math.abs(lz) < 223 && player.y > I.g.position.y + 12 }, null, { timeout: 30000 }); await h.wait(1200);
  const on = await ev(() => { const I = SHIP.A, [lx, lz] = SHIP.local(I, player.x, player.z); return { lx: +lx.toFixed(1), lz: +lz.toFixed(1), y: +(player.y - I.g.position.y).toFixed(1), air: player.air } });
  console.log('aboard', JSON.stringify(on)); assert(!on.air, 'falling after boarding');
  await shot('ship_deck', 2500);
  // walk forward for a while: stays on the ship, height changes only by decks / stairs
  const y0 = on.y; const trace = []; for (let i = 0; i < 6; i++) { await ev(() => { inp.jy = 1; inp.jx = 0 }); await h.wait(1500); trace.push(await ev(() => { const I = SHIP.A, [lx, lz] = SHIP.local(I, player.x, player.z); return [Math.round(lx), Math.round(lz), +(player.y - I.g.position.y).toFixed(1), player.air ? 1 : 0] })) } await ev(() => { inp.jy = 0 });
  console.log('walk', JSON.stringify(trace)); assert(trace.every(t => Math.abs(t[0]) < 36 && Math.abs(t[1]) < 224 && t[2] > 5), 'fell off / through the ship: ' + JSON.stringify(trace));
  // ---- the sailing ship: it moves and carries us
  await ev(() => SHIP.summon()); await page.waitForFunction(() => { const I = SHIP.B, [lx, lz] = SHIP.local(I, player.x, player.z); return Math.abs(lz) < 223 && Math.abs(lx) < 35 && player.y > I.g.position.y + 12 }, null, { timeout: 40000 }); await h.wait(1500);
  const b0 = await ev(() => { const I = SHIP.B, l = SHIP.local(I, player.x, player.z); return { x: I.x, z: I.z, lx: l[0], lz: l[1] } });
  await page.waitForFunction(b => Math.hypot(SHIP.B.x - b.x, SHIP.B.z - b.z) > 8, b0, { timeout: 240000 });   // (waits on the ship's own movement: a fixed 9 s was too short with slow frames)
  const b1 = await ev(() => { const I = SHIP.B, l = SHIP.local(I, player.x, player.z); return { x: I.x, z: I.z, lx: l[0], lz: l[1], spd: I.spd } });
  console.log('sailing', JSON.stringify({ moved: Math.round(Math.hypot(b1.x - b0.x, b1.z - b0.z)), local: [b0.lx, b0.lz, b1.lx, b1.lz].map(n => +n.toFixed(1)), spd: +b1.spd.toFixed(1) }));
  assert(Math.hypot(b1.x - b0.x, b1.z - b0.z) > 5, 'the ship does not sail'); assert(Math.hypot(b1.lx - b0.lx, b1.lz - b0.lz) < 8, 'the player is not carried by the ship');
  await shot('ship_sail', 2500);
};
