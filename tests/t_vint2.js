exports.opts = { w: 1100, h: 640 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await h.start(); await h.noRender(); await h.wait(1500);
  await page.waitForFunction(() => VEN.ready, null, { timeout: 60000 });
  for (const [k, cam] of [['bg_bank', [0, 4, 0]], ['bg_post', [0, 4, 0]], ['bg_clinic', [0, 4, 0]]]) {
    await ev(k => PORTAL.go(k), k); await h.wait(2500);
    await page.waitForFunction(() => { const B = PORTAL.active; return B && B.grp.children.length > 8 }, null, { timeout: 60000 });
    await h.wait(7000);
    await ev(() => { const B = PORTAL.active; player.x = B.spawn[0]; player.z = B.spawn[1] + .3; player.yaw = 0; cam.yaw = 0; cam.pitch = .15; cam.dist = 3.2; cam.init = false });
    console.log(await h.shot('vint2_' + k, 4000));
    await ev(() => { const B = PORTAL.active; player.x = B.spawn[0]; player.z = B.spawn[1] + 3; player.yaw = Math.PI; cam.yaw = Math.PI; cam.pitch = .2; cam.dist = 2.6; cam.init = false });
    console.log(await h.shot('vint2_' + k + '_b', 4000));
  }
};
