// Camera zoom: first person (the pinch / wheel changes the field of view, not the distance) and in a car (the pinch changes the chase distance, the speed does not).
exports.opts = { w: 800, h: 480, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await h.noRender();
  // first person: CAMV mode 1 puts cam.dist at .5; a wheel notch zooms in
  await ev(() => { CAMV.go(1) }); await h.wait(1500);
  const f0 = await ev(() => ({ d: cam.dist, fov: camera.fov, z: cam.fpz }));
  await page.evaluate(() => { const c = document.getElementById('c'); for (let i = 0; i < 12; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: -250, cancelable: true })) });
  await page.waitForFunction(() => camera.fov < 35, null, { timeout: 60000 });   // the field of view eases towards the target (slowly in a software-GL frame)
  const f1 = await ev(() => ({ d: cam.dist, fov: camera.fov, z: cam.fpz }));
  console.log('first person', JSON.stringify(f0), '->', JSON.stringify(f1));
  assert(f1.fov < f0.fov - 20, 'the first-person zoom did not narrow the field of view'); assert(f1.d <= .75, 'the head moved');
  await page.evaluate(() => { const c = document.getElementById('c'); for (let i = 0; i < 12; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: 250, cancelable: true })) });
  await page.waitForFunction(() => camera.fov > 70, null, { timeout: 60000 });
  await ev(() => { CAMV.go(0) }); await h.wait(800);
  // a car: the chase distance follows cam.vz, not the speed
  const D = await ev(() => { const v = EXT.veh.find(q => q.kind === 'gtr'); v.x = player.x + 6; v.z = player.z; v.y = lvGround(v.x, v.z); v.halt(); v.sync(); EXT.enter(v); const out = {}; const dist = () => Math.hypot(camera.position.x - v.x, camera.position.z - v.z);
    cam.init = false; return { v } });
  await h.wait(1500);
  // snap the camera (cam.init=false puts it exactly on its target) with a spoofed speed: the chase distance must not depend on it
  const snap = (spd) => ev(sp => { const v = EXT.cur; v.v = sp; cam.init = false; EXT.stepCamera(.016); return { d: Math.hypot(camera.position.x - v.x, camera.position.z - v.z), vz: cam.vz } }, spd);
  const c0 = await snap(0), c1 = await snap(45);
  console.log('car chase distance standing', JSON.stringify(c0), 'at 45 m/s', JSON.stringify(c1));
  assert(Math.abs(c1.d - c0.d) < .3, 'the camera still drifts away with the speed (' + c0.d.toFixed(2) + ' -> ' + c1.d.toFixed(2) + ')');
  await page.evaluate(() => { const c = document.getElementById('c'); for (let i = 0; i < 10; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: -250, cancelable: true })) }); await h.wait(2000);
  const c2 = await snap(0); console.log('car zoomed in', JSON.stringify(c2));
  assert(c2.d < c0.d - 1.5, 'the pinch / wheel zoom does nothing in a car');
};
