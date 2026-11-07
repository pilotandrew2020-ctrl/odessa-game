exports.opts = { w: 800, h: 500 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house1' }) }); await h.wait(6500);
  const r = await ev(() => new Promise(res => { let max = 0, n = 0; const y0 = player.y; inp.jump = true; const iv = setInterval(() => { max = Math.max(max, player.y - y0); inp.jump = (n < 3); if (++n > 70) { clearInterval(iv); res({ y0, maxRise: +max.toFixed(2), ceil: curIndoor && curIndoor.ceil ? +(curIndoor.ceil(player.x, player.z, player.y) - y0).toFixed(2) : null, camY: +(camera.position.y - y0).toFixed(2) }) } }, 40) }));
  console.log('jump indoors', JSON.stringify(r));
};
