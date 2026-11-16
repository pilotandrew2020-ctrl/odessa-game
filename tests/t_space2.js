// The owner's space list (space2.js): 100,000 m/s in space with instant speed, 900 m/s in the atmosphere, orbit / zoom / cockpit camera, blue aura + fire + lightning, third-person interior with jump / float, the extra rooms of the ISS, the minimap over the Earth. SPACE2SHOT=1: screenshots tests/out/space2_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.SPACE2SHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await page.waitForFunction(() => SPC.pad, null, { timeout: 60000 }); await ev(() => SPC.goPad()); await h.wait(3500); await page.waitForFunction(() => SPC.stk, null, { timeout: 90000 });
  await ev(() => SPC.launch()); await page.waitForFunction(() => SPC.A && SPC.A.m, null, { timeout: 60000 });
  // over the Earth the minimap stays
  await ev(() => { SPC.A.t = 20; SPC.A.snap = 1 }); await h.wait(2500);
  const map = await ev(() => { const b = document.body.classList; const m = document.getElementById('mini'); return { earth: b.contains('spcearth'), vis: m && getComputedStyle(m).visibility } }); console.log('minimap during the ascent', JSON.stringify(map)); assert(map.earth && map.vis === 'visible', 'the minimap is hidden over the Earth');
  for (const t of [45, 85]) { const f0 = await ev(t => { SPC.A.t = t; SPC.A.snap = 1; return SPC.A.fc || 0 }, t); await page.waitForFunction(f => SPC.A.fc >= f + 2, f0, { timeout: 90000 }) }
  await ev(() => { SPC.A.t = 89.5 }); await page.waitForFunction(() => SPC.space && SPC.mode === 'interior', null, { timeout: 90000 }); await h.wait(1500);
  // ---- inside the ISS: third person, the avatar is drawn, Space floats
  const i0 = await ev(() => ({ d: SPC.V.dist, vis: PLR.root.visible, obs: SPC.IN.pod.userData.obs.length })); console.log('inside', JSON.stringify(i0)); assert(i0.d > 2 && i0.vis && i0.obs > 30, 'interior: no third person / no furniture');
  await shot('space2_iss_third', 2500);
  await ev(() => { SPC.in.jump = 1 }); await page.waitForFunction(() => SPC.IN.y > .5, null, { timeout: 60000 }); await ev(() => { SPC.in.jump = 0 }); const fl = await ev(() => +SPC.IN.y.toFixed(2)); console.log('floating, y', fl); assert(fl > .5, 'does not float');
  await shot('space2_iss_float', 600);
  await ev(() => { SPC.V.dist = 0 }); await h.wait(1500); assert(await ev(() => !PLR.root.visible), 'first person still draws the avatar');
  await ev(() => { SPC.V.dist = 2.6; SPC.V.yaw += 2.4 }); await shot('space2_iss_back', 2500);
  // ---- outside: the fighter
  await ev(() => { const e = SPC.IN.pod.userData.exit; SPC.IN.x = e.x; SPC.IN.z = e.z }); await h.wait(800); await ev(() => SPC.act()); await h.wait(800);
  await ev(() => { SPC.mode = 'eva'; SPC.startEva(SPC.E1.w.clone()) }); await h.wait(300);
  await ev(() => { SPC.E1.w.copy(SPC.C.w).add(new THREE.Vector3(0, 6, -20)); SPC.act() }); await h.wait(500); assert.strictEqual(await ev(() => SPC.mode), 'fly', 'could not board the fighter');
  await ev(() => { SPC.in.full = 1 }); await h.wait(2500);
  const sp = await ev(() => ({ sp: Math.round(SPC.C.sp), thr: SPC.C.thr })); console.log('speed', JSON.stringify(sp)); assert(sp.sp >= 99000 && sp.sp <= 100000, 'space speed is not 100,000: ' + sp.sp);
  const fx = await ev(() => { const g = SPC.shipMesh.userData.fx; return { has: !!g, vis: g && g.visible, fires: g && g.userData.fires.length } }); console.log('fx', JSON.stringify(fx)); assert(fx.has && fx.vis && fx.fires === 4, 'no aura / fire');
  await shot('space2_fly_aura', 2500);
  // camera: orbit (any side), zoom out / in, the cockpit
  const cams = await ev(() => { const o = []; for (const [y, p, d] of [[0, .17, 32], [Math.PI / 2, .3, 18], [Math.PI, -.4, 60], [0, 0, 1.2]]) { SPC.FV.yaw = y; SPC.FV.pitch = p; SPC.FV.dist = d; SPC.camSpace(.05, SPC.C); o.push({ d, ship: SPC.shipMesh.visible, q: camera.quaternion.toArray().map(v => +v.toFixed(2)) }) } SPC.fvReset(); return o });
  console.log('cameras', JSON.stringify(cams.map(c => [c.d, c.ship]))); assert(cams[0].ship && !cams[3].ship, 'the cockpit view should hide the hull'); assert(JSON.stringify(cams[0].q) !== JSON.stringify(cams[1].q) && JSON.stringify(cams[1].q) !== JSON.stringify(cams[2].q), 'the camera does not orbit');
  await ev(() => { SPC.FV.dist = 1.2; SPC.FV.yaw = .6 }); await shot('space2_cockpit', 1500); await ev(() => SPC.fvReset());
  // Mercury: another body, 40,000 km out; the landing patch is built near it like at the Moon
  await ev(() => { SPC.in.full = 0; const b = SPC.bodies[1], n = b.c.clone().add(new THREE.Vector3(.3, 1, .2).normalize().multiplyScalar(b.R + 3500)); SPC.C.w.copy(n); SPC.C.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.c.clone().sub(n).normalize()); SPC.C.cq = null; SPC.in.thr = 0; SPC.C.thr = .02 });
  await page.waitForFunction(() => SPC.bodyName === 'Mercury' && SPC.lgP === 1, null, { timeout: 60000 }); const mr = await ev(() => ({ name: SPC.bodyName, g: SPC.P.g, R: SPC.P.moonR, far: Math.round(SPC.bodies[1].c.length() / 1e6), rocks: SPC.rocks.length, sky: SPC.sky.length })); console.log('mercury', JSON.stringify(mr)); assert(mr.R === 4.56e5 && mr.g === 3.7 && mr.far === 40 && mr.rocks === 9 && mr.sky === 4, 'Mercury / solar system'); await shot('space2_mercury', 2500);
  // stop instantly
  await ev(() => { SPC.in.full = 0; SPC.in.brake = 1 }); await h.wait(800); assert(await ev(() => SPC.C.sp === 0), 'the ship does not stop at once'); await ev(() => { SPC.in.brake = 0 });
};
