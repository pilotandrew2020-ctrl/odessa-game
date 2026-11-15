// The beach camp of Jungle Island (camp.js): walk into a big tent, sleep in a tent bed, sit on the bench for two (the companion takes the other half), a camp chair,
// eat the grilled chicken bite by bite (drumstick to the mouth, the bird shrinks, it comes back), the fire effects, the map entry. Screenshots camp_*.png.
const assert = require('assert');
exports.opts = { w: 1000, h: 600, warn: false };
exports.run = async (page, h) => {
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a); await h.noRender();
  const until = async (name, f, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f)) return true; await h.wait(200) } assert.fail('timeout waiting for ' + name) };
  const shot = async (n, cam) => { await ev((c) => { window.DBGCAM = c ? [CAMP.ox + c[0], CAMP.gy + c[1], CAMP.oz + c[2], CAMP.ox + c[3], CAMP.gy + c[4], CAMP.oz + c[5]] : null }, cam); console.log(await h.shot('camp_' + n, 7000)); await ev(() => { window.DBGCAM = null }) };
  assert(await ev(() => !!PLACES.find(p => p.id === 'camp')), 'the camp is not in the places list');
  await ev(() => { const p = PLACES.find(q => q.id === 'camp'); teleportRaw(p.x, p.z, p.yaw, 0) }); await until('the island', () => ISLE.on && CAMP.g && CAMP.T.length === 2); await h.wait(3000);
  const flat = await ev(() => { let lo = 1e9, hi = -1e9; for (let a = -14; a <= 14; a += 2) for (let b = -14; b <= 12; b += 2) { const y = groundH(CAMP.ox + a, CAMP.oz + b); lo = Math.min(lo, y); hi = Math.max(hi, y) } return { spread: +(hi - lo).toFixed(2), gy: +(CAMP.gy - hi).toFixed(2) } });
  console.log('ground under the camp', JSON.stringify(flat)); assert(flat.spread < .12 && Math.abs(flat.gy) < .1, 'the camp ground is not level');
  const cost = await ev(() => { let t = 0, n = 0; CAMP.g.traverse(o => { if (o.isMesh || o.isPoints) { n++; const g = o.geometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3 } }); return { triangles: Math.round(t), drawCalls: n } });
  console.log('cost', JSON.stringify(cost)); assert(cost.triangles < 6000 && cost.drawCalls < 30, 'the camp is too heavy');
  await shot('overview', [-3, 9, 19, 0, 1, -2]);
  // ---- walk into tent 0 through its door (real walking: the walls must not let us through, the door must)
  const T = await ev(() => CAMP.T[0]);
  await ev((T) => { player.x = T.x; player.z = T.z + T.L + 2.2; player.y = groundH(player.x, player.z); player.yaw = cam.yaw = Math.PI; player.vx = player.vz = 0 }, T); await h.wait(600);
  await ev(() => { inp.jy = 1; cam.yaw = Math.PI });
  await until('walking into the tent', () => { cam.yaw = Math.PI; return Math.abs(player.x - CAMP.T[0].x) < 1.2 && player.z < CAMP.T[0].z + 1 }, 30000); await ev(() => { inp.jy = 0 }); await h.wait(700);
  const inT = await ev(() => ({ inTent: CAMP.inTent, camDist: cam.dist, y: +(player.y - CAMP.gy).toFixed(2) })); console.log('in the tent', JSON.stringify(inT)); assert.strictEqual(inT.inTent, 0); assert(inT.camDist <= .75, 'no first person inside the tent');
  await ev(() => { cam.yaw = Math.PI / 2; inp.jy = 1 }); await h.wait(2500); await ev(() => { inp.jy = 0 });   // a wall stops us
  const wall = await ev(() => Math.abs(player.x - CAMP.T[0].x)); console.log('pushed at the side wall, |x| from the middle', +wall.toFixed(2)); assert(wall < T.W - .2, 'walked through the canvas');
  await ev(() => { cam.yaw = Math.PI; cam.pitch = 0 }); await shot('tent_inside', null);
  // ---- sleep in a tent bed
  await ev(() => { S.time = 'night'; applyTime(); const b = CAMP.T[0].beds[0]; player.x = b[0] + .9; player.z = b[1]; }); await until('the bed prompt', () => !!(curAct && /Sleep in the tent/.test(curAct.label)));
  await ev(() => doAction()); await until('morning', () => S.time === 'day' && !KIT.sleeping, 20000); console.log('slept until', await ev(() => S.time));
  // ---- the bench for two, with the companion
  await ev(() => { player.x = CAMP.bench.x + .3; player.z = CAMP.bench.z - .65; player.y = groundH(player.x, player.z) }); await h.wait(500);
  await until('out of the tent camera', () => CAMP.inTent < 0); await until('the bench prompt', () => !!(curAct && /bench/i.test(curAct.label)));
  await ev(() => doAction()); await h.wait(600);
  const sit = await ev(() => ({ sit: !!player.sit, bench: !!(player.sit && player.sit.bench) })); console.log('bench', JSON.stringify(sit)); assert(sit.bench, 'not sitting on the bench for two');
  await shot('bench', [3.2, 1.7, 2.2, 0, .8, 5]);
  await ev(() => { player.sit = null }); await h.wait(300);
  // ---- a camp chair
  await ev(() => { const c = CAMP.chairs[0]; player.x = c.x + .5; player.z = c.z + .5 }); await until('the chair prompt', () => !!(curAct && /camp chair/.test(curAct.label))); await ev(() => doAction()); await h.wait(300);
  assert(await ev(() => !!player.sit && !player.sit.bench), 'not sitting on the chair'); await ev(() => { player.sit = null });
  // ---- the chicken: every bite, then it comes back
  await ev(() => { player.x = CAMP.ox + CAMP.FIRE[0] - 1.1; player.z = CAMP.oz + CAMP.FIRE[1] - 1.1; if (typeof FAUNA !== 'undefined') FAUNA.hp = 40 }); await until('the chicken prompt', () => !!(curAct && curAct.label === 'Eat the chicken'));
  const s0 = await ev(() => CAMP.bird.scale.x);
  await ev(() => doAction()); await until('the drumstick at the mouth', () => !!(PLR.drk && PLR.drk.t > .5)); await shot('eating', [-3.6, 1.9, -.6, -1.2, 1.3, 1.2]);
  const b1 = await ev(() => ({ bites: CAMP.bites, hp: typeof FAUNA !== 'undefined' ? FAUNA.hp : null })); console.log('first bite', JSON.stringify(b1)); assert(b1.bites === 4, 'the bite did not happen');
  for (let i = 0; i < 4; i++) { await until('the bite to end', () => !CAMP.eatT && !PLR.drk); await until('the prompt again', () => !!(curAct && curAct.label === 'Eat the chicken')); await ev(() => doAction()) }
  await until('the last bite to end', () => !CAMP.eatT && !PLR.drk); await h.wait(1500);
  const gone = await ev(() => ({ bites: CAMP.bites, scale: +CAMP.bird.scale.x.toFixed(2), visible: CAMP.bird.visible, prompt: curAct && curAct.label, legInHand: !!CAMP.leg.parent, hp: typeof FAUNA !== 'undefined' ? FAUNA.hp : null }));
  console.log('eaten', JSON.stringify(gone), 'was', +s0.toFixed(2)); assert(gone.bites === 0 && gone.scale < s0 * .5 && !gone.visible && gone.prompt !== 'Eat the chicken' && !gone.legInHand, 'the chicken is not eaten up'); if (gone.hp !== null) assert(gone.hp > 40, 'eating gave no health');
  await ev(() => { CAMP.backAt = performance.now() + 500 }); await until('a new chicken', () => CAMP.bites === 5 && CAMP.bird.visible && CAMP.bird.scale.x > .9, 15000);
  // ---- the fire at night
  await ev(() => { S.time = 'night'; applyTime() }); await h.wait(800);
  const fire = await ev(() => ({ light: +ISLE.fireL.intensity.toFixed(2), sparks: CAMP.spark.o.visible, smoke: CAMP.smoke.o.visible, t: CAMP.flame.uniforms.t.value > 0 })); console.log('fire', JSON.stringify(fire)); assert(fire.light > .5 && fire.sparks && fire.smoke && fire.t, 'the fire is not alive');
  await shot('fire_night', [-4.5, 2.2, 7.5, 0, 1, 1.5]);
  await ev(() => { S.time = 'day'; applyTime() }); console.log('CAMP OK');
};
