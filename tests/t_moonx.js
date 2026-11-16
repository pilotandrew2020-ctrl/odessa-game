// TRAVEL to the Moon / Mercury / Uranus and walk there at once, the Lunokhod + a rover car (parked vehicles stay), WARP. MOONXSHOT=1: screenshots tests/out/moonx_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.MOONXSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 1500); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await page.waitForFunction(() => SPC.pad, null, { timeout: 60000 }); await ev(() => SPC.goPad()); await h.wait(3500); await page.waitForFunction(() => SPC.stk, null, { timeout: 90000 });
  await ev(() => SPC.launch()); await page.waitForFunction(() => SPC.A && SPC.A.m, null, { timeout: 60000 });
  for (const t of [3, 20, 45, 85]) { const f0 = await ev(t => { SPC.A.t = t; SPC.A.snap = 1; return SPC.A.fc || 0 }, t); await page.waitForFunction(f => SPC.A.fc >= f + 2, f0, { timeout: 90000 }) }
  await ev(() => { SPC.A.t = 89.5 }); await page.waitForFunction(() => SPC.space && SPC.mode === 'interior', null, { timeout: 90000 }); await h.wait(1000);
  await ev(() => { const e = SPC.IN.pod.userData.exit; SPC.IN.x = e.x; SPC.IN.z = e.z }); await h.wait(800); await ev(() => SPC.act()); await h.wait(800);
  await ev(() => { SPC.mode = 'eva'; SPC.startEva(SPC.E1.w.clone()) }); await h.wait(300);
  await ev(() => { SPC.E1.w.copy(SPC.C.w).add(new THREE.Vector3(0, 6, -20)); SPC.act() }); await h.wait(500); assert.strictEqual(await ev(() => SPC.mode), 'fly', 'could not board the fighter');
  // ---- Uranus
  const ok = await ev(() => SPC.mode); assert.strictEqual(ok, 'fly', 'not flying');
  // WARP far from every body: 10x
  await ev(() => { SPC.warp = true; SPC.C.w.set(2e7, 3e6, 1e7); SPC.in.full = 1 }); await h.wait(800);
  const w = await ev(() => Math.round(SPC.C.sp)); console.log('warp speed', w); assert(w > 5e5, 'warp is not faster'); await ev(() => { SPC.warp = false; SPC.in.full = 0; SPC.C.thr = 0 });
  // the TRAVEL buttons exist
  await h.wait(900); const tb = await ev(() => { SPC._tm = true; SPC._xt = 0; return 1 }); await h.wait(900);
  const btns = await ev(() => [...document.querySelectorAll('#spcX button')].map(b => b.textContent)); console.log('buttons', JSON.stringify(btns)); assert(btns.some(t => /MOON/.test(t)) && btns.some(t => /URANUS/.test(t)) && btns.some(t => /WARP/.test(t)), 'no travel / warp buttons');
  // Moon: standing on it, walking
  for (const id of ['moon', 'uranus', 'mercury']) {
    if (id === 'uranus') await page.waitForFunction(() => SPC.bodies.some(b => b.id === 'uranus'), null, { timeout: 60000 });
    await ev(i => SPC.travel(i), id); await page.waitForFunction(() => SPC.mode === 'moon', null, { timeout: 30000 }); await h.wait(1200);
    const s = await ev(() => ({ b: SPC.curBody.name, y: SPC.M2.y, gy: SPC.hg(SPC.M2.x, SPC.M2.z), g: SPC.P.g })); console.log('standing on', JSON.stringify(s)); assert(Math.abs(s.y - s.gy) < .4, 'not on the ground on ' + id);
    await ev(() => { SPC.in.ly = 1 }); await h.wait(2500); await ev(() => { SPC.in.ly = 0 }); const wk = await ev(() => Math.hypot(SPC.M2.x - 7, SPC.M2.z - 3)); assert(wk > 3, 'cannot walk on ' + id);
    await shot('moonx_' + id, 400);
    if (id === 'moon') {
      for (const k of ['luna', 'car']) {
        await ev(k => { SPC.ride(k); SPC.in.ly = 1 }, k); await h.wait(2500); const v = await ev(() => { const M = SPC.M2; return { d: Math.round(Math.hypot(M.x - 7, M.z - 3)), mesh: !!M.vm, kids: M.vm ? M.vm.children.length : 0 } }); await ev(() => { SPC.in.ly = 0 }); console.log(k, JSON.stringify(v)); assert(v.mesh && v.d > 12, k + ' does not drive');
        if (k === 'luna') await shot('moonx_luna', 600);
      }
      await ev(() => SPC.ride(null)); await h.wait(500); const pk = await ev(() => ({ n: SPC.parked.length, vis: SPC.parked.filter(p => p.m.visible).length })); console.log('parked', JSON.stringify(pk)); assert(pk.n === 2 && pk.vis === 2, 'left vehicles are not parked / visible');
    }
  }
  // back to the Moon: the parked ones are still there (TRAVEL puts you on the same spot)
  await ev(() => SPC.travel('moon')); await page.waitForFunction(() => SPC.mode === 'moon', null, { timeout: 30000 }); await h.wait(800);
  const again = await ev(() => SPC.parked.filter(p => p.m.visible).length); console.log('parked after returning', again); assert(again === 2, 'the parked vehicles are gone after coming back');
  await shot('moonx_back', 500);
};
