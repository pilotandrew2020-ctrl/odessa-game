exports.opts = { w: 640, h: 400 };
exports.run = async (page, h) => {
  await h.boot(); await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender(); await h.wait(2500);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(3500);
  await ev(async () => { await PM.loadLight(); const a = PLN.add('light', 0, 0, 0); AIRP.mine = AIRP.mine || {}; AIRP.mine.light = a; const s = AIRP.P(-700, 0); a.park(s[0], s[1], AIRP.yawOf(1, 0)); a.sync(); PLN.board(a); a.parking = false; a.brake = false; PLN.press(a, 'eng'); });
  await h.wait(300);
  // ---- find a flat open field 1.2 to 3 km from the airport, with a clear 500 m approach, away from the runway
  const field = await ev(() => { const c = AIRP.P(0, 600); let best = null; for (let r = 900; r < 3200 && !best; r += 100) for (let a = 0; a < 6.283 && !best; a += .12) { const x = c[0] + Math.cos(a) * r, z = c[1] + Math.sin(a) * r; if (groundH(x, z) < SL + 3) continue;
        // 220 m landing strip in direction `a2`, flat and empty
        for (let a2 = 0; a2 < 6.283 && !best; a2 += .5) { let ok = true, lo = 1e9, hi = -1e9; for (let s = -250; s <= 220 && ok; s += 10) { const px = x + Math.sin(a2) * s, pz = z + Math.cos(a2) * s, g = groundH(px, pz); if (g < SL + 2 || insideAny(px, pz, 6, g + 1) || specialGround(px, pz, g + 1)) ok = false; lo = Math.min(lo, g); hi = Math.max(hi, g) } if (ok && hi - lo < 4 && !PORTAL.cur) best = { x, z, yaw: a2, y: groundH(x, z), slope: +(hi - lo).toFixed(1), r: Math.round(r) } } } return best });
  console.log('field', JSON.stringify(field));
  // ---- the autopilot
  await ev(() => { window.__log = []; window.__ph = 'roll'; const k = inp.k; window.__ctl = setInterval(() => { const a = PLN.cur; if (!a) return; const agl = a.y + a.bottom() - groundH(a.x, a.z);
      const set = (up, dn) => { k.KeyS = !!up; k.KeyW = !!dn };
      const bank = (tgt) => { const e = tgt - a.roll; k.KeyD = e > .04; k.KeyA = e < -.04 };
      if (__ph === 'roll') { a.thrT = 1; set(a.v > 22, false); k.KeyD = k.KeyA = false; if (!a.onGround) __ph = 'climb' }
      else if (__ph === 'climb') { a.thrT = 1; const t = .12; set(a.pitch < t - .02, a.pitch > t + .03); bank(0); if (agl > 110) __ph = 'cruise' }
      else if (__ph === 'cruise') { a.thrT = .7; const t = .02; set(a.pitch < t - .02, a.pitch > t + .03); bank(0) }
      else if (__ph === 'approach') { // fly to the field, descend on a glide slope
        const f = __field, fx = f.x - Math.sin(f.yaw) * 400, fz = f.z - Math.cos(f.yaw) * 400; const tx = (__lined ? f.x : fx), tz = (__lined ? f.z : fz); let hd = Math.atan2(tx - a.x, tz - a.z), dh = hd - a.yaw; while (dh > Math.PI) dh -= 6.283; while (dh < -Math.PI) dh += 6.283;
        bank(Math.max(-.35, Math.min(.35, -dh * 1.2))); const dist = Math.hypot(f.x - a.x, f.z - a.z); if (!__lined && Math.hypot(fx - a.x, fz - a.z) < 120) __lined = true;
        const want = Math.max(-.12, Math.min(.03, ((f.y + 8 + dist * .075) - a.y) * .0006 * -1 - .02)); const alt = f.y + 1.2 + dist * .046; const t = Math.max(-.1, Math.min(.07, (alt - a.y) * .02)); set(a.pitch < t - .015, a.pitch > t + .02); a.thrT = Math.max(.05, Math.min(1, .3 + (33 - a.v) * .06));
        if (agl < 4) __ph = 'flare' }
      else if (__ph === 'flare') { a.thrT = a.v > 27 ? .02 : .12; bank(0); const t = a.vy < -1.3 ? .08 : .03; set(a.pitch < t - .01, a.pitch > t + .03); if (a.onGround) { __ph = 'rollout'; a.parking = true; a.brake = true } }
      else if (__ph === 'rollout') { a.thrT = 0; a.parking = true; set(false, true); k.KeyD = k.KeyA = false }
      window.__log.push([__ph, +a.v.toFixed(1), Math.round(agl), +a.pitch.toFixed(2), +a.roll.toFixed(2), +a.vy.toFixed(1), a.onGround ? 1 : 0, a.crashed ? 1 : 0, window.__field ? Math.round(Math.hypot(a.x - __field.x, a.z - __field.z)) : -1, +a.thrT.toFixed(2)]) }, 50); window.__lined = false });
  await ev((f) => { window.__field = f }, field);
  if (!field) return;
  // ---- teleport the airborne plane to 700 m before the field, at 120 m AGL, heading for it, then let the autopilot land
  await ev(() => { const a = PLN.cur, f = __field; a.x = f.x - Math.sin(f.yaw) * 320; a.z = f.z - Math.cos(f.yaw) * 320; a.yaw = f.yaw; a.y = groundH(a.x, a.z) + 26; a.v = 33; a.pitch = 0; a.roll = 0; a.vy = 0; a.thrT = .5; a.onGround = false; a.eng = 1; a.engOn = true; a.parking = false; a.brake = false; cam.init = false; __ph = 'approach'; __lined = true; __log.length = 0 });
  for (let i = 0; i < 90; i++) { await h.wait(1000); const s = await ev(() => { const a = PLN.cur; return a && { ph: __ph, crashed: a.crashed } }); if (!s || s.crashed || s.ph === 'rollout') break }
  await h.wait(8000);
  const end = await ev(() => { const a = AIRP.mine.light, f = __field; return { crashed: a.crashed, onGround: a.onGround, v: +a.v.toFixed(1), ph: __ph, distToField: Math.round(Math.hypot(a.x - f.x, a.z - f.z)), y_minus_ground: +(a.y + a.bottom() - groundH(a.x, a.z)).toFixed(2), hudToast: (document.getElementById('toast') || {}).textContent } });
  console.log('landing', JSON.stringify(end));
  const tail = await ev(() => __log.filter((r, i) => i % 40 === 0).slice(0, 40)); console.log('approach log [phase,v,agl,pitch,roll,vy,gnd,crash,dist,thr]'); for (const r of tail) console.log(JSON.stringify(r));
  await ev(() => { clearInterval(window.__ctl); const k = inp.k; k.KeyW = k.KeyS = k.KeyA = k.KeyD = false });
};
