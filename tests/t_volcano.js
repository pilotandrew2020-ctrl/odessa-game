// The volcano of Jungle Island (volcano.js, 2026-11-16): the cone and its crater in the height function, a lava lake that burns, flows, smoke, an eruption with lava bombs that land and hurt. VOLSHOT=1: screenshots tests/out/volcano_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.VOLSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  const geo = await ev(() => { const X = ISLV.x, Z = ISLV.z; let rim = 0; for (let a = 0; a < 6.28; a += .5) rim = Math.max(rim, groundH(X + Math.cos(a) * 84, Z + Math.sin(a) * 84)); return { floor: Math.round(groundH(X, Z)), rim: Math.round(rim), base: Math.round(groundH(X + 700, Z)), flank: Math.round(groundH(X + 250, Z)) } });
  console.log('volcano height', JSON.stringify(geo)); assert(geo.rim - geo.floor > 60, 'no crater'); assert(geo.rim > geo.base + 90, 'no cone');
  await ev(() => { const p = PLACES.find(q => q.id === 'volcano'); teleportRaw(p.x, p.z, p.yaw) }); await page.waitForFunction(() => VOL.built && VOL.g.visible, null, { timeout: 90000 }); await h.wait(2000);
  const on = await ev(() => ({ y: Math.round(player.y), ground: Math.round(groundH(player.x, player.z)), air: player.air, flows: VOL.flows.length, smoke: VOL.sm.length }));
  console.log('at the foot', JSON.stringify(on)); assert(on.flows === 3 && Math.abs(on.y - on.ground) < 3, 'not standing on the slope');
  await ev(() => { cam.dist = 40; cam.pitch = .1; cam.yaw = Math.atan2(ISLV.x - player.x, ISLV.z - player.z) + Math.PI; cam.init = false }); await shot('volcano_foot', 3000);
  // eruption
  await ev(() => { VOL.erupt() }); await page.waitForFunction(() => VOL.state === 'erupt', null, { timeout: 120000 });
  await page.waitForFunction(() => VOL.bombs.filter(b => b.live).length >= 2, null, { timeout: 60000 }); await shot('volcano_erupt', 800);
  const eb = await ev(() => ({ live: VOL.bombs.filter(b => b.live).length, launched: VOL.nl })); console.log('eruption', JSON.stringify(eb));
  // a bomb that lands next to the player hurts
  const hp0 = await ev(() => { GUN.armed = true; GUN.hp = 100; const b = VOL.bombs.find(q => q.live) || VOL.bombs[0]; b.live = true; b.tt = 0; b.r = 1; b.p.set(player.x + 2, groundH(player.x, player.z) + 2, player.z); b.v.set(0, -5, 0); b.m.visible = true; return GUN.hp });
  await page.waitForFunction(() => VOL.hit > 0, null, { timeout: 30000 }); const hp1 = await ev(() => GUN.hp); console.log('bomb hit hp', hp0, '->', hp1); assert(hp1 < hp0, 'a bomb landing at your feet does not hurt');
  // lava burns: unarmed, the heat adds up and carries you away; armed, it takes hit points
  await ev(() => { GUN.armed = false; GUN.hp = 100; VOL.burn = 0; teleportRaw(ISLV.x, ISLV.z, 0) }); await h.wait(3000); await ev(() => { player.x = ISLV.x + 3; player.z = ISLV.z; player.y = VOL.lavaY + .2; player.air = false });
  await page.waitForFunction(() => Math.hypot(player.x - ISLV.x, player.z - ISLV.z) > 60, null, { timeout: 60000 }); console.log('carried away from the lava, burn', await ev(() => Math.round(VOL.burn)));
  await shot('volcano_crater', 800);
};
