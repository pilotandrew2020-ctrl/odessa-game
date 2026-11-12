// Nolik as a body type (Character -> Body -> Body type -> Nolik): 22 bones under the Man.glb names, driven by REAL.tick with limited arm / leg swing (REAL.BOD.nolik.lim).
// Picks it in the creator, starts the game, walks (bones must move), sits on the bicycle (no errors), then puts the Realistic body back.
exports.opts = { w: 800, h: 520, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => document.getElementById('bStart').click()); await h.wait(1500);
  await ev(() => { CREATOR.pick(CHT.findIndex(t => t.n === 'Body')) });
  const chips = await ev(() => [...document.querySelectorAll('#crPanel button')].map(b => b.textContent.trim()));
  console.log('chips', JSON.stringify(chips.slice(0, 6)));
  assert(chips.includes('Nolik'), 'no Nolik chip in Body type');
  await ev(() => { CHAR.cur[12] = 1; CHAR.cur[11] = 2; });   // a cap and sunglasses: Nolik must not wear them
  await ev(() => [...document.querySelectorAll('#crPanel button')].find(b => b.textContent.trim() === 'Nolik').click()); await h.wait(500);
  assert.strictEqual(await ev(() => CHAR.cur[17]), 3, 'code slot 17 should be 3');
  await ev(() => document.getElementById('crGo').click()); await h.wait(6000); await h.noRender();
  await page.waitForFunction(() => PLR.real && PLR.real.nolik, null, { timeout: 60000 });
  const R = await ev(() => ({ n: PLR.real.n, tris: (() => { let t = 0; PLR.real.M.traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 }); return t })(), visibleExtras: (() => { const R = PLR.real, held = [PLR.can, PLR.speaker]; let n = 0; const inside = (o, top) => { for (let p = o; p; p = p.parent) if (p === top) return true; return false };
      PLR.root.traverse(o => { if (!o.isMesh) return; let vis = true; for (let p = o; p && p !== PLR.root.parent; p = p.parent) if (!p.visible) vis = false; if (!vis) return; if (inside(o, R.M) || held.some(h => h && inside(o, h))) return; n++ }); return n })() }));   // every visible mesh of the avatar that is not the Nolik body or a held can / speaker: the classic body, hats, glasses, merged accessories
  console.log('nolik', JSON.stringify(R)); assert.strictEqual(R.n, 22); assert.strictEqual(R.visibleExtras, 0, 'hat / glasses still visible on Nolik');
  // walking: the thigh bone must swing
  const sw = await ev(() => { const B = PLR.real.B, i = PLR.real.idx.thigh_l; animPlayer(PLR, { spd: 5, mode: 'walk' }, .03); const q0 = B[i].quaternion.clone(); let mx = 0; for (let k = 0; k < 40; k++) { animPlayer(PLR, { spd: 5, mode: 'walk' }, .03); mx = Math.max(mx, q0.angleTo(B[i].quaternion)) } return mx });
  console.log('thigh swing (max angle rad)', sw.toFixed(3)); assert(sw > .2, 'the legs do not swing');
  // sitting on the bicycle and the G-Wagon must not throw
  await ev(() => { EXT.summon('bike'); }); await h.wait(1200); await ev(() => { EXT.enter(EXT.veh.find(q => q.kind === 'bike')) }); await h.wait(1500);
  assert(await ev(() => !!EXT.cur), 'could not get on the bicycle');
  await ev(() => { EXT.leave(EXT.cur) }); await h.wait(500);
  // back to the realistic body
  await ev(() => { CHAR.cur[17] = 0; CHAR.cur[12] = 0; CHAR.cur[11] = 1; CHAR.save(); WARDROBE.apply() }); await page.waitForFunction(() => PLR.real && !PLR.real.nolik, null, { timeout: 60000 });
  console.log('back to realistic ok');
};
