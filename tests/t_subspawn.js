// Submarine spawn (round 29): next to deep water it floats near you; far from any water you are taken to the nearest mooring; the Spawn menu has the tile.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  await page.waitForFunction(() => EXT.moorings.length > 0 && PLACES.some(p => p.id === 'sub1'), null, { timeout: 60000 });
  await ev(() => { const p = PLACES.find(q => q.id === 'sub1'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(5000);
  const a = await ev(() => { EXT.summon('sub'); const v = EXT.veh.find(q => q.kind === 'sub'); return { d: Math.round(Math.hypot(v.x - player.x, v.z - player.z)), deep: SL - groundH(v.x, v.z) > 7, dead: !!v.dead } }); console.log('near water', JSON.stringify(a)); assert(a.deep && a.d < 420 && !a.dead, 'the submarine is not on deep water near you');
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(5000);
  const before = await ev(() => ({ x: player.x, z: player.z })); await ev(() => EXT.summon('sub')); await h.wait(5000);
  const b = await ev(() => { const m = EXT.nearestMooring(); return { moved: Math.round(Math.hypot(player.x - 0, player.z - 0)), dm: Math.round(Math.hypot(m.S[0] - player.x, m.S[1] - player.z)) } }); console.log('far from water', JSON.stringify(b)); assert(b.dm < 120, 'not taken to a mooring (' + b.dm + ' m away)');
  const t = await ev(() => { AIRP.menu(); const ok = !!document.querySelector('#airPick [data-k="sub"]'); document.getElementById('airPick').hidden = true; return ok }); assert(t, 'no Submarine tile in Spawn');
};
