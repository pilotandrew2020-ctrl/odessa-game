// Reference screenshots for before/after comparisons of pure performance changes (nothing may change on screen). SHOTS=<dir> picks where they go; compare with tools/imgdiff.py.
// Fixed debug cameras at three places; the weather / time are fixed too. Env: Q=high|mid|low.
exports.opts = { w: 900, h: 540, warn: false };
exports.run = async (page, h) => {
  const Q = process.env.Q || 'high';
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(q => { S.q = q; S.time = 'day'; applyQuality(); applyTime(); }, Q);
  await h.noRender();
  await ev(() => { Object.defineProperty(UNI.uTime, 'value', { get: () => 100, set: () => {} }); });   // the ground / leaves animate with this clock: freeze it so two runs can be compared
  const spots = [['beach', 2600, -9400, [2600, 14, -9400 + 0, 2640, 6, -9330]], ['opera', null, null, null], ['yard', 3, 14, [24, 9, 46, 3, 4, -30]]];
  for (const [name, x, z, cam] of spots) {
    await ev(([n, x, z]) => { if (n === 'opera') { const p = PLACES.find(q => q.id === 'opera'); teleportRaw(p.x, p.z, p.yaw, 0) } else teleportRaw(x, z, 0, 0) }, [name, x, z]);
    await h.wait(8000);
    await ev(([n, c]) => { if (n === 'opera') { const p = PLACES.find(q => q.id === 'opera'); c = [p.x - 40, 14, p.z - 40, p.x, 8, p.z] } window.DBGCAM = c }, [name, cam]);
    await h.shot('ref_' + name, 5000);
  }
};
