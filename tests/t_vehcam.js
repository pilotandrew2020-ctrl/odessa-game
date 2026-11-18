// Vehicle camera (round 44): after you turn the view it stays for 5 s, it never swings back while the vehicle stands still, it comes back slowly when you drive; you can zoom in close to the motorbike.
exports.opts = { w: 800, h: 500, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'); await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(2500); await h.noRender();
  await page.waitForFunction(() => EXT.veh.some(v => v.kind === 'moto'), null, { timeout: 60000 });
  const r = await ev(() => { const v = EXT.veh.find(q => q.kind === 'moto'); EXT.enter(v); const c = EXT.cur, wrap = a => Math.abs(((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const out = {}; CAMV.follow = true; cam.yaw = c.yaw + 1.5; inp.lookT = performance.now(); c.v = 10; for (let i = 0; i < 20; i++) EXT.stepCamera(.1); out.held = +wrap(cam.yaw - c.yaw).toFixed(2);
    inp.lookT = performance.now() - 12000; GUN.held = false; CAMV.follow = true; c.v = 0; cam.yaw = c.yaw + 1.5; for (let i = 0; i < 20; i++) EXT.stepCamera(.1); out.parked = +wrap(cam.yaw - c.yaw).toFixed(2);
    c.v = 10; for (let i = 0; i < 40; i++) EXT.stepCamera(.1); out.driving = +wrap(cam.yaw - c.yaw).toFixed(2);
    cam.dist = .3; cam.init = false; for (let i = 0; i < 20; i++) EXT.stepCamera(.1); out.close = +camera.position.distanceTo(new THREE.Vector3(c.x, c.y + 1.3, c.z)).toFixed(2); CAMV.follow = false; EXT.exit(); return out });
  console.log(JSON.stringify(r)); assert(r.held > 1.3 && r.parked > 1.3 && r.driving < .4 && r.close < 2, 'vehicle camera does not hold / return / zoom in');
};
