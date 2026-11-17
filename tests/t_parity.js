// Parity check (round 37): everything the old Fable branch `fable/phase3a` (arsenal.js, fun.js, volcano.js) added exists in main in its own form. It is merged "ours" (history only, no code change).
exports.opts = { w: 800, h: 500, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500);
  const r = await ev(async () => ({
    tank: typeof TANK !== 'undefined' && typeof TANK.spawn === 'function', drone: typeof DRONE !== 'undefined' && typeof DRONE.spawn === 'function', nuke: typeof NUKE !== 'undefined' && typeof NUKE.drop === 'function', blast: typeof BLAST !== 'undefined',
    spawnTank: (await (await fetch('airp.js')).text()).includes('data-k="tank"'), spawnDrone: (await (await fetch('airp.js')).text()).includes('data-k="drone"'),
    coaster: typeof RAILS !== 'undefined', roofpads: typeof ROOFPADS !== 'undefined' && ROOFPADS.list.length >= 3, volcano: !!PLACES.find(p => p.id === 'volcano'), gorky: !!PLACES.find(p => p.id === 'gorky'),
    planeCams: typeof PLN !== 'undefined' && typeof PLN.orbit === 'function' && typeof PLN.cabin === 'function', katanaBlock: WEAPONS.some(w => w.melee), holster: typeof GUN !== 'undefined' && typeof GUN.hold === 'function',
    rocks: typeof FX !== 'undefined' && typeof FX.wallChunks === 'function' }));
  console.log(JSON.stringify(r)); const miss = Object.entries(r).filter(([k, v]) => !v).map(([k]) => k); assert(!miss.length, 'missing in main: ' + miss);
};
