exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)) });
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' }) }); await h.wait(6000);
  const tv = await ev(() => { const t = HSTATE.cur.tvs[0]; const p = t.m.getWorldPosition(new THREE.Vector3()); return { x: p.x, y: p.y, z: p.z, ry: t.m.rotation.y } });
  console.log('tv', JSON.stringify(tv));
  // stand 2.2 m in front of the screen, looking at it
  await ev((t) => { const d = 2.2; player.x = t.x + Math.sin(t.ry) * d; player.z = t.z + Math.cos(t.ry) * d; player.y = INT_Y; player.vx = player.vz = 0; cam.yaw = Math.atan2(t.x - player.x, t.z - player.z); cam.pitch = 0 }, tv);
  const prompt = async () => { for (let i = 0; i < 40; i++) { const l = await ev(() => curAct && curAct.label); if (l && /TV/.test(l)) return l; await h.wait(150) } return null };
  console.log('label0', await prompt());
  await ev(() => doAction()); await h.wait(500);
  console.log('ch1', JSON.stringify(await ev(() => ({ ch: HSTATE.cur.tvs[0].ch, on: HSTATE.cur.tvs[0].on, vid: !!TVX.vid, paused: TVX.vid && TVX.vid.paused, ready: TVX.vid && TVX.vid.readyState, t: TVX.vid && TVX.vid.currentTime, err: TVX.vid && TVX.vid.error && TVX.vid.error.code }))));
  await h.wait(2500);
  console.log('ch1 later', JSON.stringify(await ev(() => ({ paused: TVX.vid.paused, ready: TVX.vid.readyState, t: +TVX.vid.currentTime.toFixed(2), vol: TVX.vid.volume, muted: TVX.vid.muted }))));
  console.log(await h.shot('tv_film', 1500));
  console.log('label1', await prompt());
  await ev(() => doAction()); await h.wait(1500);
  console.log('ch2', JSON.stringify(await ev(() => ({ ch: HSTATE.cur.tvs[0].ch, paused: TVX.vid.paused }))));
  console.log(await h.shot('tv_news', 2500));
  console.log('label2', await prompt());
  await ev(() => doAction()); await h.wait(800);
  console.log('off', JSON.stringify(await ev(() => ({ ch: HSTATE.cur.tvs[0].ch, on: HSTATE.cur.tvs[0].on, paused: TVX.vid.paused }))));
  // leaving the house pauses the video
  await ev(() => { HSTATE.cur.tvs[0].ch = 0; TVX.cycle(HSTATE.cur.tvs[0]); }); await h.wait(300);
  await ev(() => PORTAL.exit()); await h.wait(3000);
  console.log('outside', JSON.stringify(await ev(() => ({ paused: TVX.vid.paused, portal: PORTAL.cur }))));
};
