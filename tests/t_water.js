exports.opts = { w: 800, h: 500 };
exports.run = async (page, h) => {
  await h.boot(); await page.evaluate(() => { S.q = 'low'; S.flyPilot = true; applyQuality(); });
  await h.start(); await h.noRender(); await h.wait(2500);
  const ev = (f, a) => page.evaluate(f, a);
  // a straight strip of deep water, 900 m long
  const strip = await ev(() => { const pl = PLACES.find(p => p.id === 'arcadia'); let out = null;
    for (let r = 200; r < 2500 && !out; r += 50) for (let a = 0; a < 6.283 && !out; a += .15) { const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; for (let d = 0; d < 6.283 && !out; d += .4) { let ok = true; for (let s = 0; s <= 900 && ok; s += 30) { const px = x + Math.sin(d) * s, pz = z + Math.cos(d) * s; if (groundH(px, pz) > SL - 3 || specialGround(px, pz, SL)) ok = false } if (ok) out = { x, z, yaw: d } } } return out });
  console.log('water strip', JSON.stringify(strip)); if (!strip) return;
  await ev((s) => { teleportRaw(s.x, s.z, s.yaw) }, strip); await h.wait(3500);
  await ev(async (s) => { await PM.loadLight(); const a = PLN.add('light', s.x, s.z, s.yaw); AIRP.mine = AIRP.mine || {}; AIRP.mine.light = a;
    a.park(s.x + Math.sin(s.yaw) * 300, s.z + Math.cos(s.yaw) * 300, s.yaw); a.onGround = false; a.y = SL + 26; a.v = 32; a.pitch = 0; a.roll = 0; a.vy = 0; a.eng = 1; a.engOn = true; a.thrT = .3; a.parking = false; a.brake = false; a.sync(); PLN.board(a);
    window.__log = []; const k = inp.k; window.__ph = 'approach'; window.__ctl = setInterval(() => { const a = PLN.cur; if (!a) return; const agl = a.y + a.bottom() - Math.max(groundH(a.x, a.z), SL); const set = (up, dn) => { k.KeyS = !!up; k.KeyW = !!dn };
      if (__ph === 'approach') { const t = Math.max(-.09, Math.min(.06, ((SL + 1.2 + 0) + Math.max(0, agl) * 0 - a.y + a.bottom() * -1 - 0) * 0 + (-.04))); const wantVy = agl > 12 ? -2.4 : -1.5; const tp = Math.max(-.1, Math.min(.07, (wantVy - a.vy) * .02 + a.pitch)); set(a.pitch < tp - .012, a.pitch > tp + .018); a.thrT = Math.max(.05, Math.min(1, .3 + (33 - a.v) * .06)); if (agl < 4) __ph = 'flare' }
      else if (__ph === 'flare') { a.thrT = a.v > 27 ? .02 : .12; const t = a.vy < -1.3 ? .08 : .03; set(a.pitch < t - .01, a.pitch > t + .03); k.KeyA = k.KeyD = false; if (a.onGround) { __ph = 'rollout'; a.thrT = 0 } }
      else if (__ph === 'rollout') { a.thrT = 0; set(false, true) }
      else if (__ph === 'takeoff') { a.thrT = 1; a.parking = false; a.brake = false; set(a.v > 22 && a.onGround, false); if (!a.onGround) __ph = 'climb' }
      else if (__ph === 'climb') { a.thrT = 1; set(a.pitch < .1, a.pitch > .15) }
      __log.push([__ph, +a.v.toFixed(1), Math.round(agl), +a.pitch.toFixed(2), +a.vy.toFixed(1), a.onGround ? 1 : 0, a.onWater ? 1 : 0, a.crashed ? 1 : 0]) }, 50) }, strip);
  for (let i = 0; i < 60; i++) { await h.wait(1000); if (await ev(() => __ph === 'rollout' || PLN.list.some(p => p.crashed))) break }
  await h.wait(5000);
  console.log('splashdown', JSON.stringify(await ev(() => { const a = AIRP.mine.light; return { crashed: a.crashed, onGround: a.onGround, onWater: a.onWater, v: +a.v.toFixed(1), wheelsAtSea: +(a.y + a.bottom() - SL).toFixed(2), wake: !!(a.wake && a.wake.visible), ph: __ph } })));
  const tail = await ev(() => __log.filter(r => r[0] === 'flare' || r[0] === 'rollout').filter((r, i) => i % 6 === 0).slice(0, 9)); console.log('flare/rollout [ph,v,agl,pitch,vy,gnd,water,crash]', JSON.stringify(tail));
  // taxi on the water and take off from it
  await ev(() => { __ph = 'takeoff'; AIRP.mine.light.thrT = 1; AIRP.mine.light.parking = false; AIRP.mine.light.brake = false });
  let lift = null, t0 = Date.now(); for (let i = 0; i < 60; i++) { await h.wait(500); const s = await ev(() => { const a = AIRP.mine.light; return { gr: a.onGround, v: a.v, agl: a.y + a.bottom() - SL, crashed: a.crashed } }); if (!s.gr && lift === null) lift = { v: +s.v.toFixed(1), tMs: Date.now() - t0 }; if (s.crashed || s.agl > 40) break }
  console.log('take-off from the water', JSON.stringify({ lift, state: await ev(() => { const a = AIRP.mine.light; return { crashed: a.crashed, onGround: a.onGround, aglSea: Math.round(a.y + a.bottom() - SL), v: +a.v.toFixed(1) } }) }));
  // land again, stop, get out: the pilot must be swimming at the surface
  await ev(() => { const a = AIRP.mine.light; a.x -= Math.sin(a.yaw) * 0; __ph = 'approach'; a.y = SL + 26; a.onGround = false; a.v = 32; a.pitch = 0; a.vy = 0; a.thrT = .3 });
  for (let i = 0; i < 40; i++) { await h.wait(1000); if (await ev(() => __ph === 'rollout')) break }
  await h.wait(6000);
  await ev(() => { clearInterval(window.__ctl); const k = inp.k; k.KeyW = k.KeyS = k.KeyA = k.KeyD = false; const a = AIRP.mine.light; a.parking = true; a.thrT = 0; a.v = 0 }); await h.wait(500);
  await ev(() => PLN.leaveFighter()); await h.wait(2500);
  console.log('got out on the water', JSON.stringify(await ev(() => ({ swimOn: SWIM.on, yAboveSea: +(player.y - SL).toFixed(2), cur: !!PLN.cur, camAboveSea: +(camera.position.y - SL).toFixed(1) }))));
  // swimmer calls the plane: it appears on the water beside them; board it from the water
  await ev(() => { AIRP.spawnLight() }); await h.wait(2500);
  const sp = await ev(() => { const a = AIRP.mine.light; return { onWater: groundH(a.x, a.z) < SL, wheels: +(a.y + a.bottom() - SL).toFixed(2), dist: Math.round(Math.hypot(a.x - player.x, a.z - player.z)), toast: (document.getElementById('toast') || {}).textContent } });
  console.log('spawned beside the swimmer', JSON.stringify(sp));
  await ev(() => { const a = AIRP.mine.light; const d = a.doorPos(); player.x = d.x + Math.cos(a.yaw) * 1.5; player.z = d.z - Math.sin(a.yaw) * 1.5 }); await h.wait(1000);
  const pr = await ev(() => { let best = null, bd = 1e9; for (const it of INTERACT) { if (it.cond && !it.cond()) continue; const d = Math.hypot(it.x - player.x, it.z - player.z); if (d < it.r && Math.abs((it.y || player.y) - player.y) < 2.5 && d < bd) { bd = d; best = it } } return best && best.label });
  console.log('prompt from the water:', pr);
  await ev(() => { const it = INTERACT.find(i => { try { return i.label === 'Climb into the plane' && (!i.cond || i.cond()) } catch (e) { return false } }); it && it.fn() }); await h.wait(1500);
  console.log('aboard from the water', JSON.stringify(await ev(() => ({ cur: !!PLN.cur, swimOn: SWIM.on, order: PLR.root.rotation.order }))));
};
