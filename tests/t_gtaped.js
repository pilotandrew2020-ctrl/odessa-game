// GTA-style street people (gtaped.js, round 22): a shot is heard (people run), a bullet hits and kills a pedestrian, an explosion kills / scares, the dead are gone after ~20 s. Also: the nukes are back on the Armed bar and the Spawn menu is a compact grid.
exports.opts = { w: 1180, h: 820, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x + 60, p.z + 60, p.yaw) }); await h.wait(6000);
  await page.waitForFunction(() => PEDS.length > 2, null, { timeout: 60000 });
  const r = await ev(() => {
    GUN.armed = true; GUN.down = 0; GUN.pick(0); GUN.cd = 0;
    const out = {}, f = [Math.sin(player.yaw), Math.cos(player.yaw)], p = PEDS[0], q = PEDS[1];
    p.x = player.x + f[0] * 12; p.z = player.z + f[1] * 12; p.y = groundH(p.x, p.z); p.hp = 60; p.dead = false; p.flee = 0;
    q.x = player.x - f[0] * 15; q.z = player.z - f[1] * 15; q.flee = 0; q.dead = false;
    camera.position.set(player.x, player.y + 1.6, player.z); camera.lookAt(p.x, p.y + 1.62, p.z); camera.updateMatrixWorld(true);
    const hit = GTAP.ray(camera.position, new THREE.Vector3(p.x - player.x, p.y + 1.62 - camera.position.y, p.z - player.z).normalize(), 40); out.rayHit = !!hit && hit.p === p;
    GUN.fire(); out.hp1 = p.hp; out.deadAfter1 = !!p.dead; out.scared = q.flee > 0; out.pFlee = p.flee > 0;
    for (let i = 0; i < 6 && !p.dead; i++) { GUN.cd = 0; camera.lookAt(p.x, p.y + 1.62, p.z); camera.updateMatrixWorld(true); GUN.fire() } out.dead = !!p.dead; out.fall = p.fallT > 0;
    // explosion
    const e = PEDS[2]; e.x = player.x + f[0] * 20; e.z = player.z + f[1] * 20; e.y = groundH(e.x, e.z); e.dead = false; FX.explode(e.x + 2, e.y + 1, e.z, 9); out.boom = !!e.dead;
    // the dead are removed after ~20 s
    for (let i = 0; i < 25; i++) GTAP.tick(1); out.gone = !PEDS.includes(p); return out });
  console.log('gta peds', JSON.stringify(r)); assert(r.rayHit && r.scared && r.dead && r.fall && r.boom && r.gone, 'street people do not react / cannot be shot');
  // nukes on the Armed bar again, nothing nuclear in Spawn, the Spawn menu is a small grid
  const ui = await ev(() => { GUN.armed = true; GUN.sync(); const names = [...document.querySelectorAll('#gunBar button')].filter(b => !b.hidden).map(b => b.textContent); AIRP.menu(); const m = document.getElementById('airPick'), ap = m.querySelector('.ap').getBoundingClientRect(), sp = m.textContent; const out = { names, spawnNuke: /nuke|nuclear/i.test(sp), w: Math.round(ap.width), hgt: Math.round(ap.height), vw: innerWidth, vh: innerHeight, tiles: m.querySelectorAll('.apg button').length }; m.hidden = true; return out });
  console.log('ui', JSON.stringify(ui)); assert(ui.names.some(n => /Mini-nuke/.test(n)) && ui.names.some(n => /T-Nuke/.test(n)) && ui.names.some(n => /N-Bomb/.test(n)), 'the nukes are not on the Armed bar'); assert(!ui.spawnNuke, 'nukes still in Spawn'); assert(ui.w < ui.vw * .4 && ui.hgt < ui.vh * .5, 'Spawn menu is still huge');
};
