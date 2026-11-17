// The owner's Cobra helicopter replaces the procedural one: loads, rotors spin, pilot sits in it. COBRASHOT=1: screenshots.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.COBRASHOT; await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  await page.waitForFunction(() => HELI.root && HELI.mainRotor, null, { timeout: 60000 });
  await page.waitForFunction(() => { let n = 0; HELI.root.traverse(o => { if (o.isMesh && o.visible) n++ }); return HELI.mainRotor.children.length === 1 && n > 4 }, null, { timeout: 60000 });
  const info = await ev(() => { let tr = 0; HELI.root.traverse(o => { if (o.isMesh && o.visible && o.geometry.index) tr += o.geometry.index.count / 3 }); return { tris: Math.round(tr), hub: HELI.mainRotor.position.toArray().map(x => +x.toFixed(2)), main: HELI.mainRotor.children.length, tail: HELI.tailRotor.children.length } });
  console.log(JSON.stringify(info)); assert(info.main === 1 && info.tail === 1 && info.tris > 20000 && info.tris < 60000, 'cobra not loaded properly');
  await ev(() => HELI.toggle()); await h.wait(2500);
  if (SH) { await ev(() => { cam.dist = 16; }); await h.shot('cobra_out', 6000); await ev(() => { cam.dist = .5; }); await h.shot('cobra_in', 6000); }
};
