// The owner's character bodies (Steve, MrBeast, Halo, Leon, Ghost; 2026-11-12) as body types: every one loads, gets the 22 bones, hides the classic body / hats / glasses, its legs swing when it walks, it is
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
  for (const n of ['Steve', 'MrBeast', 'Halo', 'Leon', 'Ghost']) assert(chips.includes(n), 'no ' + n + ' chip in Body type');
  // while a body file loads, the creator preview must not show the classic body (the OLD character)
  await ev(() => { REAL.BOD.halo.st = 0; REAL.BOD.halo.tpl = null });   // pretend Halo is not loaded yet
  await ev(() => { CHAR.cur[12] = 1; CHAR.cur[11] = 2 });                                       // a cap and sunglasses: no body may wear them
  const vis0 = await ev(() => { CHAR.cur[17] = 6; CREATOR.rebuild(); let n = 0; CREATOR.P.root.traverse(o => { if (!o.isMesh) return; let v = true; for (let p = o; p && p !== CREATOR.P.root.parent; p = p.parent) if (!p.visible) v = false; if (v) n++ }); return n });
  console.log('visible meshes while Halo loads (no classic body expected)', vis0);
  assert(vis0 <= 2, 'the classic body is visible while the Halo file loads: ' + vis0);
  await page.waitForFunction(() => REAL.BOD.halo.st === 2 && CREATOR.P && CREATOR.P.real && CREATOR.P.real.M, null, { timeout: 90000 });
  await ev(() => document.getElementById('crGo').click()); await h.wait(6000); await h.noRender();
  const kinds = [[4, 'steve'], [5, 'mrbeast'], [6, 'halo'], [7, 'leon'], [8, 'ghost']];
  for (const [code, name] of kinds) {
    await ev(c => { CHAR.cur[17] = c; CHAR.cur[12] = 1; CHAR.cur[11] = 2; CHAR.save(); WARDROBE.apply() }, code);
    await page.waitForFunction(k => PLR.real && PLR.real.kind && REAL.kind({ bodyK: k }) === k && PLR.real.M && PLR.real.idx && Object.keys(PLR.real.idx).length >= 22 && REAL.BOD[k].st === 2 && PLR.real.M.parent, name, { timeout: 90000 });
    const R = await ev(() => ({ n: PLR.real.n, tris: (() => { let t = 0; PLR.real.M.traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 }); return Math.round(t) })(), visibleExtras: (() => { const R = PLR.real, held = [PLR.can, PLR.speaker]; let n = 0; const inside = (o, top) => { for (let p = o; p; p = p.parent) if (p === top) return true; return false };
        PLR.root.traverse(o => { if (!o.isMesh) return; let vis = true; for (let p = o; p && p !== PLR.root.parent; p = p.parent) if (!p.visible) vis = false; if (!vis) return; if (inside(o, R.M) || held.some(q => q && inside(o, q))) return; n++ }); return n })() }));
    console.log(name, JSON.stringify(R));
    assert.strictEqual(R.n, 22, name + ': bone count'); assert.strictEqual(R.visibleExtras, 0, name + ': hat / glasses / classic body still visible');
    const sw = await ev(() => { const B = PLR.real.B, i = PLR.real.idx.thigh_l; animPlayer(PLR, { spd: 5, mode: 'walk' }, .03); const q0 = B[i].quaternion.clone(); let mx = 0; for (let k = 0; k < 40; k++) { animPlayer(PLR, { spd: 5, mode: 'walk' }, .03); mx = Math.max(mx, q0.angleTo(B[i].quaternion)) } return mx });
    assert(sw > .15, name + ': the legs do not swing (' + sw + ')');
    if (process.env.CHARSHOT) { await ev(() => { cam.dist = 3.2; cam.pitch = .15; cam.yaw = player.yaw + Math.PI; cam.init = false }); await h.shot('char_' + name, 3000) }
  }
  // back to the realistic body
  await ev(() => { CHAR.cur[17] = 0; CHAR.cur[12] = 0; CHAR.cur[11] = 1; CHAR.save(); WARDROBE.apply() }); await page.waitForFunction(() => PLR.real && !PLR.real.nolik && !PLR.real.booba && REAL.kind({ bodyK: null }) === null && PLR.real.M, null, { timeout: 60000 });
  console.log('back to realistic ok');
};
