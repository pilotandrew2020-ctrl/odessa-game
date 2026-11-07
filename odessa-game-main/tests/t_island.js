exports.opts = { w: 1100, h: 640 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)) });
  await h.start(); await h.noRender(); await h.wait(3000);
  const isl = await ev(() => { const p = PLACES.find(p => p.id === 'island'); return { x: p.x, z: p.z, r: EXT.island.r, houses: EXT.houses.map(H => [H.id, H.price]) } });
  console.log('island', JSON.stringify(isl));
  // on the plaza
  await ev((p) => { teleportRaw(p.x + 12, p.z, -Math.PI / 2); cam.pitch = .1 }, isl); await h.wait(9000);
  console.log('terrain', JSON.stringify(await ev((p) => ({ centre: +(groundH(p.x, p.z) - SL).toFixed(2), r80: +(groundH(p.x + 80, p.z) - SL).toFixed(2), r120: +(groundH(p.x + 120, p.z) - SL).toFixed(2), r175: +(groundH(p.x + 175, p.z) - SL).toFixed(2) }), isl)));
  console.log(await h.shot('isl_plaza', 2500));
  // from high above (orbit camera)
  await ev(() => { cam.dist = 230; cam.pitch = 1.2; cam.init = false }); await h.wait(6000);
  console.log(await h.shot('isl_above', 3000));
  // in front of the biggest house
  await ev((p) => { cam.dist = 6; cam.pitch = .15; cam.init = false; const a = Math.PI / 4 + 3 * Math.PI / 2, R = 23 * 2.7; teleportRaw(p.x + Math.cos(a) * (R - 22), p.z + Math.sin(a) * (R - 22), Math.atan2(Math.cos(a), Math.sin(a)) ) }, isl); await h.wait(6000);
  console.log(await h.shot('isl_house', 3000));
};
