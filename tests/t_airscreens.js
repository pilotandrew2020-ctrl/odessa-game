exports.opts = { w: 1024, h: 768, warn: false };
exports.run = async (page, h) => {
  await h.boot();
  await h.start();
  await page.waitForTimeout(2500);

  const ev = (f, a) => page.evaluate(f, a);

  // 1. Terminal front view
  await ev(() => {
    // Look at terminal
    const p = PLACES.find(q => q.id === 'airport');
    teleportRaw(p.x, p.z, p.yaw);
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${h.SCR}/air_1_terminal.png` });

  // 2. Apron view (airliner + fighter)
  await ev(() => {
    // Teleport on apron facing the aircraft
    const pos = AIRP.P(-40, 100);
    const yaw = AIRP.yawOf(0, 1);
    teleportRaw(pos[0], pos[1], yaw);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${h.SCR}/air_2_apron.png` });

  // 3. Runway view
  await ev(() => {
    const pos = AIRP.P(-600, 0);
    const yaw = AIRP.yawOf(1, 0);
    teleportRaw(pos[0], pos[1], yaw);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${h.SCR}/air_3_runway.png` });

  console.log('Screenshots captured: air_1_terminal.png, air_2_apron.png, air_3_runway.png');
};
