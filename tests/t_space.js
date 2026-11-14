// The space programme (space.js, 2026-11-14): the launch islet beyond the liner with the shuttle stack, the automatic ascent (boosters and tank fall away), the cut to space (ISS, Earth, the far Moon),
// the fighter at 25,000 m/s, the landing assist, a landing and a walk on the Moon in 1.62 m/s2. SPACESHOT=1 saves screenshots tests/out/space_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SPACESHOT;
  await h.boot();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.render(); await h.wait(1500);   // the loop must run real frames: the ascent / flight are advanced by it
  const shot = async (name, ms) => { if (!SH) return; await h.wait(Math.min(ms || 1500, 3000)); await page.screenshot({ path: h.SCR + '/' + name + '.png' }) };
  await page.waitForFunction(() => SPC.pad, null, { timeout: 60000 });
  const pad = await ev(() => ({ x: Math.round(SPC.pad.x), z: Math.round(SPC.pad.z), d: Math.round(Math.hypot(SPC.pad.x - CRUISE.x, SPC.pad.z - CRUISE.z)), deep: rawH(SPC.pad.x, SPC.pad.z) < SL - 5, top: SPC.top }));
  console.log('pad', JSON.stringify(pad)); assert(pad.deep, 'the islet is not in deep water'); assert(pad.d > 250 && pad.d < 1300, 'the islet is not near the liner: ' + pad.d);
  await ev(() => SPC.goPad()); await h.wait(3500);
  const st = []; for (let i = 0; i < 12; i++) { await h.wait(400); st.push(await ev(() => [+player.y.toFixed(2), player.air ? 1 : 0])) } console.log('standing on the pad (y, air)', JSON.stringify(st.slice(-6)));
  assert(st.slice(3).every(v => Math.abs(v[0] - st[3][0]) < .2 && !v[1]), 'the player bounces / falls on the pad: ' + JSON.stringify(st));
  await page.waitForFunction(() => SPC.stk, null, { timeout: 90000 });
  const on = await ev(() => ({ y: +player.y.toFixed(1), top: +SPC.top.toFixed(1), d: Math.round(Math.hypot(player.x - SPC.pad.x, player.z - SPC.pad.z)), tris: (() => { let t = 0; SPC.stk.traverse(o => { if (o.isMesh) t += o.geometry.index.count / 3 }); return Math.round(t) })(), parts: Object.keys(SPC.parts).filter(k => SPC.parts[k]) }));
  console.log('on the islet', JSON.stringify(on)); assert(Math.abs(on.y - on.top) < 1.5, 'the player does not stand on the pad'); assert(on.parts.length === 4, 'stack parts: ' + on.parts);
  await h.wait(1500); const pr = await ev(() => { const b = document.getElementById('bAct'); return b ? { hidden: b.hidden, text: b.textContent.trim() } : null }); console.log('action prompt', JSON.stringify(pr)); assert(pr && !pr.hidden && /Launch the Space Shuttle/i.test(pr.text), 'no "Launch the Space Shuttle" prompt on the pad');
  await ev(() => { cam.dist = 38; cam.pitch = .12; cam.yaw = Math.atan2(SPC.pad.x - player.x, SPC.pad.z - player.z) + Math.PI; cam.init = false }); await shot('space_pad', 5000);
  // ---- the ascent
  await ev(() => SPC.launch()); await page.waitForFunction(() => SPC.A && SPC.A.m, null, { timeout: 60000 });
  await ev(() => { SPC.A.t = -4 }); await shot('space_ignition', 3000);
  const asc = [];
  for (const t of [3, 20, 45, 85]) { const f0 = await ev(t => { SPC.A.t = t; SPC.A.snap = 1; return SPC.A.fc || 0 }, t); await page.waitForFunction(f => SPC.A.fc >= f + 2, f0, { timeout: 90000 }); asc.push(await ev(() => ({ t: Math.round(SPC.A.t), h: Math.round(SPC.A.h), sep1: SPC.A.sep1, sep2: SPC.A.sep2, debris: (SPC.debris || []).length, mode: SPC.mode }))); if (t !== 3) await shot('space_ascent_' + t, 2500) }
  console.log('ascent', JSON.stringify(asc)); assert(asc[2].sep1 && asc[2].debris >= 2, 'boosters did not separate'); assert(asc[3].sep2 && asc[3].debris >= 3, 'the tank did not separate'); assert(asc[3].h > 40000, 'altitude too low: ' + asc[3].h);
  await ev(() => { SPC.A.t = 89.5 }); await page.waitForFunction(() => SPC.space && SPC.mode === 'interior' && SPC.IN && SPC.IN.kind === 'iss', null, { timeout: 90000 }); await shot('space_arrive_iss', 1500);   // after the shuttle you arrive INSIDE the station and can walk
  await ev(() => { const e = SPC.IN.pod.userData.exit; SPC.IN.x = e.x; SPC.IN.z = e.z }); await h.wait(800); await ev(() => SPC.act()); await h.wait(500); assert.strictEqual(await ev(() => SPC.mode), 'eva', 'exit from the station'); await h.wait(1500);
  console.log('in space', JSON.stringify(await ev(() => ({ mode: SPC.mode, moonKm: Math.round(SPC.M.length() / 1000), earthR: SPC.P.earthR }))));
  await shot('space_eva', 4000);
  // ---- interiors and sound: the station, the shuttle's orbiter, the fighter cabin
  const snd = await ev(() => ({ aud: !!(typeof AUD !== 'undefined' && AUD.ok), s: !!SPC._s })); console.log('sound', JSON.stringify(snd)); if (snd.aud) assert(snd.s, 'the space sound bus was not created');
  for (const [kind, spot] of [['iss', [30, 0, -20]], ['shuttle', null], ['fighter', null]]) {
    await ev(([k, sp]) => { if (k === 'iss') SPC.E1.w.set(sp[0], sp[1], sp[2]); else if (k === 'shuttle') SPC.E1.w.copy(SPC.orb.userData.w).add(new THREE.Vector3(0, 0, -15)); else SPC.E1.w.copy(SPC.C.w).add(new THREE.Vector3(0, 8, -12)) }, [kind, spot]); await page.waitForFunction(k => SPC.doorTarget() === k, kind, { timeout: 30000 });
    await ev(() => SPC.door()); await h.wait(600); const inn = await ev(() => ({ mode: SPC.mode, kind: SPC.IN && SPC.IN.kind, z: +SPC.IN.z.toFixed(1) })); console.log('inside', JSON.stringify(inn)); assert(inn.mode === 'interior' && inn.kind === kind, 'could not enter ' + kind);
    await ev(() => { SPC.in.ly = 1 }); await page.waitForFunction(z0 => SPC.IN.z > z0 + 1.5, inn.z, { timeout: 60000 }).catch(() => {}); await ev(() => { SPC.in.ly = 0 }); const z2 = await ev(() => +SPC.IN.z.toFixed(1)); console.log(kind, 'walked from z', inn.z, 'to', z2); assert(z2 > inn.z + 1.5, 'cannot walk inside ' + kind);
    await shot('space_in_' + kind, 1500);
    if (kind === 'fighter') { await ev(() => { const s = SPC.IN.pod.userData.seat; SPC.IN.x = s.x; SPC.IN.z = s.z }); await h.wait(800); assert.strictEqual(await ev(() => SPC.IN.use), 'seat', 'no pilot seat prompt'); await ev(() => SPC.act()); await h.wait(500); assert.strictEqual(await ev(() => SPC.mode), 'fly', 'the pilot seat does not fly the ship'); await ev(() => { SPC.in.full = 0; SPC.C.thr = 0; SPC.C.sp = 0 }); }
    else { await ev(() => { const e = SPC.IN.pod.userData.exit; SPC.IN.x = e.x; SPC.IN.z = e.z }); await h.wait(800); assert.strictEqual(await ev(() => SPC.IN.use), 'exit', 'no exit prompt'); await ev(() => SPC.act()); await h.wait(500); assert.strictEqual(await ev(() => SPC.mode), 'eva', 'exit did not bring us out'); }
  }
  // the fighter flight below needs a spacewalk start
  await ev(() => { SPC.mode = 'eva'; SPC.startEva(SPC.E1.w.clone()) }); await h.wait(300);
  // ---- board the fighter and fly: speed limit 25,000, the Moon is far
  await ev(() => { SPC.E1.w.copy(SPC.C.w).add(new THREE.Vector3(0, 6, -20)); SPC.act() }); await h.wait(500);
  assert.strictEqual(await ev(() => SPC.mode), 'fly', 'could not board the fighter');
  await ev(() => { SPC.C.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), SPC.M.clone().sub(SPC.C.w).normalize()); SPC.C.cq = null; SPC.in.full = 1 }); await h.wait(6000);
  const fl = await ev(() => ({ sp: Math.round(SPC.C.sp), thr: SPC.C.thr, dM: Math.round(SPC.C.w.distanceTo(SPC.M) - SPC.P.moonR) }));
  console.log('flying', JSON.stringify(fl)); assert(fl.sp > 20000 && fl.sp <= 25000, 'speed ' + fl.sp);
  const eta = await ev(() => Math.round(SPC.C.w.distanceTo(SPC.M) / 25000)); console.log('seconds to the Moon at full speed ~', eta); assert(eta > 150 && eta < 400, 'the Moon is not "far": ' + eta + ' s');
  await shot('space_fly', 3000);
  // jump near the Moon: the landing assist slows the ship, it touches down by itself
  await ev(() => { const n = SPC.M.clone().add(new THREE.Vector3(0.3, 1, 0.2).normalize().multiplyScalar(SPC.P.moonR + 2500)); SPC.C.w.copy(n); SPC.C.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), SPC.M.clone().sub(n).normalize()); SPC.C.cq = null; SPC.C.sp = 900; SPC.in.full = 1 });
  await page.waitForFunction(() => SPC.mode === 'landed', null, { timeout: 120000 }); await h.wait(1000);
  const ld = await ev(() => ({ sp: Math.round(SPC.C.sp), tris: SPC.lg.children[0].geometry.index.count / 3 })); console.log('landed', JSON.stringify(ld));
  await ev(() => { SPC.in.full = 0 }); await shot('space_landed', 4000);
  // ---- out and walk
  await ev(() => SPC.act()); await h.wait(600); assert.strictEqual(await ev(() => SPC.mode), 'moon', 'did not exit onto the Moon');
  await ev(() => { SPC.in.ly = 1 }); await h.wait(2500); await ev(() => { SPC.in.ly = 0 });
  const w1 = await ev(() => ({ d: Math.round(Math.hypot(SPC.M2.x, SPC.M2.z)), y: +SPC.M2.y.toFixed(2) })); console.log('walked', JSON.stringify(w1)); assert(w1.d > 3, 'the astronaut does not walk');
  const jp = await ev(async () => { SPC.in.jump = 1; await new Promise(r => setTimeout(r, 120)); SPC.in.jump = 0; let mx = 0, t = 0; const y0 = SPC.M2.y; for (let i = 0; i < 80; i++) { await new Promise(r => setTimeout(r, 100)); mx = Math.max(mx, SPC.M2.y - y0); if (!SPC.M2.air && i > 3) { t = i / 10; break } } return { high: +mx.toFixed(1), airT: t } });
  console.log('jump', JSON.stringify(jp)); assert(jp.high > 3, 'low gravity: a jump should be several metres high, got ' + jp.high);
  console.log('avatar', JSON.stringify(await ev(() => { const r = PLR.root, v = new THREE.Vector3(); r.getWorldPosition(v); let meshes = 0, vis = 0; r.traverse(o => { if (o.isMesh) { meshes++; if (o.visible) vis++ } }); return { vis: r.visible, parent: r.parent === SPC.lg, local: r.position.toArray().map(n => +n.toFixed(1)), world: v.toArray().map(n => Math.round(n)), meshes, vis, scale: r.scale.toArray(), cam: camera.position.toArray(), ship: SPC.shipMesh.position.toArray().map(n => Math.round(n)) } })));
  await shot('space_moon', 4000);
  // back to the station, then home
  await ev(() => SPC.toStation()); await h.wait(1800); assert.strictEqual(await ev(() => SPC.mode), 'eva', 'Station did not bring us to the ISS');
  await ev(() => SPC.leave()); await h.wait(2500);
  const back = await ev(() => ({ on: SPC.on, vis: PLR.root.visible, parent: PLR.root.parent === scene, d: Math.round(Math.hypot(player.x - SPC.pad.x, player.z - SPC.pad.z)) })); console.log('home', JSON.stringify(back));
  assert(!back.on && back.vis && back.parent && back.d < 120, 'did not come back to the pad');
};
