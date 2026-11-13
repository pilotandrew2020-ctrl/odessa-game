// The owner's character bodies (Steve, MrBeast, Halo, Leon, Ghost; 2026-11-12, Walter White 2026-11-13) as body types: every one loads, gets the 22 bones, hides the classic body / hats / glasses, its legs swing when it walks, it is
// listed in the creator, and the classic body is NOT visible while its file loads (the old character used to flash up). CHARSHOT=1 also saves a third-person screenshot of each in tests/out/char_<name>.png.
exports.opts = { w: 800, h: 520, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot();
  const ev = (f, a) => page.evaluate(f, a);
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await ev(() => document.getElementById('bStart').click()); await h.wait(1500);
  await ev(() => { CREATOR.pick(CHT.findIndex(t => t.n === 'Body')) });
  const chips = await ev(() => [...document.querySelectorAll('#crPanel button')].map(b => b.textContent.trim()));
  console.log('chips', JSON.stringify(chips.slice(0, 10)));
  for (const n of ['Steve', 'MrBeast', 'Halo', 'Leon', 'Ghost', 'Walter']) assert(chips.includes(n), 'no ' + n + ' chip in Body type');
  // while a body file loads, the creator preview must not show the classic body (the OLD character)
  await ev(() => { REAL.BOD.halo.st = 0; REAL.BOD.halo.tpl = null });   // pretend Halo is not loaded yet
  await ev(() => { CHAR.cur[12] = 1; CHAR.cur[11] = 2 });                                       // a cap and sunglasses: no body may wear them
  const vis0 = await ev(() => { CHAR.cur[17] = 6; CREATOR.rebuild(); let n = 0; CREATOR.P.root.traverse(o => { if (!o.isMesh) return; let v = true; for (let p = o; p && p !== CREATOR.P.root.parent; p = p.parent) if (!p.visible) v = false; if (v) n++ }); return n });
  console.log('visible meshes while Halo loads (no classic body expected)', vis0);
  assert(vis0 <= 2, 'the classic body is visible while the Halo file loads: ' + vis0);
  await page.waitForFunction(() => REAL.BOD.halo.st === 2 && CREATOR.P && CREATOR.P.real && CREATOR.P.real.M, null, { timeout: 90000 });
  if (process.env.OLDGAIT) await ev(() => { window.__OLDGAIT = 1 });   // OLDGAIT=1: measure with the human leg length for every body (what the gait did before 2026-11-13)
  await ev(() => document.getElementById('crGo').click()); await h.wait(6000); await h.noRender();
  const kinds = [[4, 'steve'], [5, 'mrbeast'], [6, 'halo'], [7, 'leon'], [8, 'ghost'], [9, 'walter'], [2, 'booba'], [3, 'nolik']];
  for (const [code, name] of kinds) {
    await ev(c => { CHAR.cur[17] = c; CHAR.cur[12] = 1; CHAR.cur[11] = 2; CHAR.save(); WARDROBE.apply() }, code);
    await page.waitForFunction(k => PLR.real && PLR.real.kind && REAL.kind({ bodyK: k }) === k && PLR.real.M && PLR.real.idx && Object.keys(PLR.real.idx).length >= 22 && REAL.BOD[k].st === 2 && PLR.real.M.parent, name, { timeout: 90000 });
    const R = await ev(() => ({ n: PLR.real.n, tris: (() => { let t = 0; PLR.real.M.traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 }); return Math.round(t) })(), visibleExtras: (() => { const R = PLR.real, held = [PLR.can, PLR.speaker]; let n = 0; const inside = (o, top) => { for (let p = o; p; p = p.parent) if (p === top) return true; return false };
        PLR.root.traverse(o => { if (!o.isMesh) return; let vis = true; for (let p = o; p && p !== PLR.root.parent; p = p.parent) if (!p.visible) vis = false; if (!vis) return; if (inside(o, R.M) || held.some(q => q && inside(o, q))) return; n++ }); return n })() }));
    console.log(name, JSON.stringify(R));
    assert(R.n === 22 || R.n === 52, name + ': bone count ' + R.n); assert.strictEqual(R.visibleExtras, 0, name + ': hat / glasses / classic body still visible');
    const sw = await ev(() => { const B = PLR.real.B, i = PLR.real.idx.thigh_l; animPlayer(PLR, { spd: 5, mode: 'walk' }, .03); const q0 = B[i].quaternion.clone(); let mx = 0; for (let k = 0; k < 40; k++) { animPlayer(PLR, { spd: 5, mode: 'walk' }, .03); mx = Math.max(mx, q0.angleTo(B[i].quaternion)) } return mx });
    assert(sw > .15, name + ': the legs do not swing (' + sw + ')');
    // fingers (2026-11-13): the five bodies with hands have 15 finger bones per hand that follow the classic hand's curl (hdGrip), so the hand closes around a phone / can / weapon
    if (['steve', 'booba', 'nolik'].indexOf(name) < 0) {
      const fg = await ev(() => { const R = PLR.real, B = R.B, S = R.sides[0], i = S.fing.find(f => f.j === 2 && f.f === 1).i; PLR.hdHold = [1, 1]; hdGrip(PLR, 0, 'flat'); hdGrip(PLR, 1, 'flat'); for (let k = 0; k < 40; k++) animPlayer(PLR, { spd: 0, mode: 'walk' }, .05); const q0 = B[i].quaternion.clone();
        hdGrip(PLR, 0, 'bar'); hdGrip(PLR, 1, 'bar'); for (let k = 0; k < 40; k++) animPlayer(PLR, { spd: 0, mode: 'walk' }, .05); return { n: R.sides.map(s => s.fing.length), turn: +q0.angleTo(B[i].quaternion).toFixed(2) } });
      console.log(name, 'fingers', JSON.stringify(fg)); assert.deepStrictEqual(fg.n, [15, 15], name + ': finger bones'); assert(fg.turn > .6, name + ': the fingers do not close (' + fg.turn + ')');
      if (process.env.CHARSHOT) { await ev(() => { hdGrip(PLR, 0, 'bar'); hdGrip(PLR, 1, 'bar'); for (let k = 0; k < 40; k++) animPlayer(PLR, { spd: 0, mode: 'walk' }, .05); cam.dist = 1.1; cam.pitch = .1; cam.yaw = player.yaw + Math.PI + .5; cam.init = false }); await h.shot('hand_' + name, 3000) }
    }
    // the can in the hand sits at the real wrist (it used to hang ~0.3 m below it)
    const cd = await ev(() => { PLR.root.updateMatrixWorld(true); const R = PLR.real, S = R.sides.find(q => q.arm === PLR.arms[0]), a = new THREE.Vector3(), b = new THREE.Vector3(); PLR.can.getWorldPosition(a); R.B[S.ha].getWorldPosition(b); return { vis: PLR.can.visible, d: +a.distanceTo(b).toFixed(2) } });
    console.log(name, 'can to wrist', JSON.stringify(cd)); if (cd.vis) assert(cd.d < .24, name + ': the can is not in the hand (' + cd.d + ' m from the wrist)');
    await ev(() => { PLR.hdHold = null });
    // foot skating: the foot that is lower (the one on the ground) should travel backwards under the body at the walking speed
    const sk = await ev(() => { const R = PLR.real, SPD = 1.4, dt = 1 / 60, legL0 = R.legL, fl = R.idx.foot_l, fr = R.idx.foot_r; PLR.root.updateMatrixWorld(true); const rec = []; PLR.phase = 0; PLR.ws = 1; if (window.__OLDGAIT) R.legL = .9;
      const pos = b => { const v = R.B[b].getWorldPosition(new THREE.Vector3()); PLR.root.worldToLocal(v); return v };
      for (let k = 0; k < 150; k++) { animPlayer(PLR, { spd: SPD, mode: 'walk' }, dt); PLR.root.updateMatrixWorld(true); const a = pos(fl), b = pos(fr); rec.push([a.y, a.z, b.y, b.z]) }
      const vs = []; for (let k = 1; k < rec.length; k++) { const A = rec[k - 1], B = rec[k], lowL = A[0] < A[2] && B[0] < B[2], lowR = A[2] < A[0] && B[2] < B[0]; if (lowL) vs.push(-(B[1] - A[1]) / dt); else if (lowR) vs.push(-(B[3] - A[3]) / dt) }
      vs.sort((x, y) => x - y); return { legL: +R.legL.toFixed(2), vFoot: +vs[vs.length >> 1].toFixed(2), steps: +(PLR.phase / Math.PI / 150 * 60).toFixed(1) } });
    console.log(name, 'gait @1.4 m/s', JSON.stringify(sk));
    if (process.env.CHARSHOT) { await ev(() => { cam.dist = 3.2; cam.pitch = .15; cam.yaw = player.yaw + Math.PI; cam.init = false }); await h.shot('char_' + name, 3000) }
  }
  // back to the realistic body
  await ev(() => { CHAR.cur[17] = 0; CHAR.cur[12] = 0; CHAR.cur[11] = 1; CHAR.save(); WARDROBE.apply() }); await page.waitForFunction(() => PLR.real && !PLR.real.nolik && !PLR.real.booba && REAL.kind({ bodyK: null }) === null && PLR.real.M, null, { timeout: 60000 });
  console.log('back to realistic ok');
};
