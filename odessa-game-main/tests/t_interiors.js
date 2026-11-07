exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)) });
  await h.start(); await h.noRender(); await h.wait(2500);
  const list = [['house', { id: 'house0' }, 'i_house0'], ['house', { id: 'house1' }, 'i_house1'], ['house', { id: 'house2' }, 'i_house2'], ['house', { id: 'house3' }, 'i_house3'], ['panelflat', {}, 'i_panel'], ['stalinflat', {}, 'i_stalin'], ['newflat', {}, 'i_new'], ['mdflat', {}, 'i_modern']];
  for (const [name, opt, shot] of list) {
    await ev(([n, o]) => { if (PORTAL.cur) PORTAL.exit(); }, [name, opt]); await h.wait(1500);
    await ev(([n, o]) => { PORTAL.enter(n, { x: player.x, z: player.z, yaw: player.yaw }, o) }, [name, opt]); await h.wait(6500);
    const info = await ev(() => { const B = PORTAL.active; return { portal: PORTAL.cur, spawn: B && B.spawn, ceil: curIndoor && curIndoor.ceil ? +(curIndoor.ceil(player.x, player.z, player.y) - player.y).toFixed(2) : null, errs: window.__errs || 0 } });
    console.log(name, JSON.stringify(info));
    await ev(() => { cam.pitch = .02 }); await h.wait(500);
    console.log(await h.shot(shot, 1200));
  }
};
