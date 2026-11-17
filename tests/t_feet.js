// Feet height of every body type against the ground (the owner: "he sinks into the ground with his feet a bit"): prints minY - player.y at rest and mid-stride.
exports.opts = { w: 800, h: 500, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500); await h.noRender();
  const out = [];
  for (let b = 0; b <= 11; b++) {
    await ev(b => { const c = CHAR.clean(CHAR.cur); c[17] = b; CHAR.cur = c; WARDROBE.apply() }, b); await h.wait(2500);
    const r = await ev(() => { const m = (spd, ph) => { PLR.phase = ph; animPlayer(PLR, { spd, mode: 'walk' }, .016); PLR.root.updateMatrixWorld(true); let lo = 1e9; PLR.root.traverse(o => { if (o.isMesh && o.visible && !(o.userData && (o.userData.hat || o.userData.acc))) { const bb = new THREE.Box3().setFromObject(o); if (bb.min.y < lo) lo = bb.min.y } }); return +(lo - player.y).toFixed(3) };
      return { idle: m(0, 0), walkMin: Math.min(...[0, 1, 2, 3, 4, 5, 6].map(i => m(3, i * .9))) } });
    console.log('body', b, JSON.stringify(r)); out.push(r);
  }
};
