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
  // round 29: people run AWAY from you, shout (bubble text), the katana kills
  const r2 = await ev(() => {
    const f = [Math.sin(player.yaw), Math.cos(player.yaw)], p = PEDS.filter(q => !q.dead)[0], out = {}; GUN.armed = true; GUN.down = 0;
    // put him on a path heading towards the player
    const sg = segInfo(p.ri, p.dir); p.x = player.x + f[0] * 10; p.z = player.z + f[1] * 10; p.y = groundH(p.x, p.z); p.dead = false; p.flee = 0; p.fallT = 0; p.hp = 60;
    GTAP.scare(player.x, player.z, 45, true); out.flee = p.flee > 0; p.flipT = 0; const d0 = Math.hypot(sg.tx * 0 + p.x - player.x, p.z - player.z);
    out.said = []; for (const q of PEDS) if (q.gsayT > 0) out.said.push(q.gsay); out.sayN = out.said.length;
    GTAP.bubbles(); out.bubble = !!BUBBLES.pool[6].s.visible || out.sayN === 0;
    // katana: two slashes kill a man standing in front
    const k = PEDS.filter(q => !q.dead && q !== p)[0]; k.x = player.x + f[0] * 1.2; k.z = player.z + f[1] * 1.2; k.y = player.y; k.dead = false; k.fallT = 0; k.hp = 60; GUN.pick(WEAPONS.findIndex(w => w.n === 'Neon katana')); for (let i = 0; i < 3 && !k.dead; i++) { GUN.cd = 0; k.fallT = 0; GUN.fire() } out.katana = !!k.dead; return out });
  console.log('flee / shout / katana', JSON.stringify(r2)); assert(r2.flee && r2.bubble && r2.katana && r2.sayN > 0, 'people do not scream / flee, or the katana does not kill');
  // nukes on the Armed bar again, nothing nuclear in Spawn, the Spawn menu is a small grid
  const ui = await ev(() => { GUN.armed = true; GUN.sync(); const names = [...document.querySelectorAll('#gunBar button')].filter(b => !b.hidden).map(b => b.textContent); AIRP.menu(); const m = document.getElementById('airPick'), ap = m.querySelector('.ap').getBoundingClientRect(), sp = m.textContent; const out = { names, spawnNuke: /nuke|nuclear/i.test(sp), w: Math.round(ap.width), hgt: Math.round(ap.height), vw: innerWidth, vh: innerHeight, tiles: m.querySelectorAll('.apg button').length }; m.hidden = true; return out });
  console.log('ui', JSON.stringify(ui)); assert(ui.names.some(n => /Mini-nuke/.test(n)) && ui.names.some(n => /T-Nuke/.test(n)) && ui.names.some(n => /N-Bomb/.test(n)), 'the nukes are not on the Armed bar'); assert(!ui.spawnNuke, 'nukes still in Spawn'); assert(ui.w < ui.vw * .4 && ui.hgt < ui.vh * .5, 'Spawn menu is still huge');
};
