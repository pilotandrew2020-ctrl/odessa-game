exports.opts = { w: 480, h: 300 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start();
  await h.noRender();
  await page.waitForTimeout(2000);
  const r0 = await page.evaluate(async () => {
    const out = {};
    for (let i = 0; i < 50 && !HELI.loaded; i++) await new Promise(r => setTimeout(r, 200));
    out.loaded = HELI.loaded;
    HELI.toggle(); out.on = HELI.on;
    HELI.root.position.y = player.y + 60; HELI.velocity.set(0, 0, 0);
    const m = TAC.mesh(); const p = HELI.root.position;
    m.position.set(p.x, p.y + 25, p.z);
    TAC.list.push({ m, vy: -5, t: 0, tp: 0 });
    out.heliY = p.y; out.fpsprobe = 0;
    return out;
  });
  console.log('before', JSON.stringify(r0));
  await page.waitForTimeout(8000);
  const r1 = await page.evaluate(() => ({ dead: HELI.dead, on: HELI.on, deadT: HELI.deadT, bombs: TAC.list.length, waves: TAC.waves.length, py: player.y, air: player.air, rootVisible: HELI.root.visible }));
  console.log('after', JSON.stringify(r1));
  // second part: bomb falls where the heli is NOT (nothing in the way) and heli is respawned after 14 s
  await page.waitForTimeout(3000);
  console.log('shot', await h.shot('bomb', 5000));
};
