// Changing the hat / glasses / hair colour / clothes colour on every body must change what is drawn (owner: "I pick another hat and it does not change").
exports.opts = { w: 800, h: 500, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500); await h.noRender();
  const sig = () => page.evaluate(() => { let n = 0, v = 0; PLR.root.traverse(o => { if (!o.isMesh) return; let on = true, p = o; while (p) { if (p.visible === false) on = false; p = p.parent } if (on) { n++; v += o.geometry.attributes.position.count } }); return n + '/' + v });
  const bad = [];
  for (const b of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    const s = [];
    for (const ht of [0, 1, 2, 3]) { await ev(([b, ht]) => { const c = CHAR.clean(CHAR.cur); c[17] = b; c[12] = ht; CHAR.cur = c; WARDROBE.apply() }, [b, ht]); await h.wait(1800); s.push(await sig()) }
    console.log('body', b, JSON.stringify(s)); if (new Set(s.slice(1)).size < 3 || s[0] === s[1]) bad.push(b);
  }
  console.log('bodies where the hat does not change:', JSON.stringify(bad)); assert(!bad.length, 'hat swap broken on bodies ' + bad);
};
