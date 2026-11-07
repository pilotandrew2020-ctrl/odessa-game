exports.opts = { w: 480, h: 300, warn: false };
exports.run = async (page, h) => {
  const t0 = Date.now();
  await h.boot(); console.log('boot s', ((Date.now() - t0) / 1000).toFixed(1));
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start();   // rendering ON for a few real frames
  const ev = (f, a) => page.evaluate(f, a);
  const tour = [['home', null], ['yacht', 'yacht'], ['jungle', 'jungle'], ['airport', 'airport'], ['station', 'station']];
  for (const [name, id] of tour) {
    if (id) await ev((id) => { const p = PLACES.find(q => q.id === id); teleportRaw(p.x, p.z, p.yaw); }, id);
    await page.waitForTimeout(3500);
    console.log(name, JSON.stringify(await ev(() => ({ p: [Math.round(player.x), Math.round(player.z)], district: lastDistrict, started }))));
  }
  // menus
  await ev(() => { AIRP.menu(); }); console.log('menu hidden?', await ev(() => document.getElementById('airPick').hidden)); await ev(() => AIRP.menu());
  console.log('buttons', JSON.stringify(await ev(() => ['bSpawn', 'bBuddy', 'yHelm', 'pHud'].map(i => [i, !!document.getElementById(i)]))));
  console.log('places', JSON.stringify(await ev(() => PLACES.filter(p => /yacht|jungle|airport/.test(p.id)).map(p => p.id))));
};
