exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)) });
  const until = async (name, f, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await h.wait(120) } console.log('TIMEOUT', name); return false };
  await h.start(); await h.noRender(); await h.wait(3000);
  // a quay edge: walk from the Arkadia beach into the water
  const sp = await ev(() => { const pl = PLACES.find(p => p.id === 'arcadia'); for (let r = 20; r < 400; r += 2) for (let a = 0; a < 6.283; a += .05) { const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; const ya = Math.atan2(1, 0); for (let yaw = 0; yaw < 6.283; yaw += .8) { const fx = Math.sin(yaw), fz = Math.cos(yaw); if (groundH(x, z) > SL + .25 && groundH(x + fx * 4, z + fz * 4) < SL - 1 && groundH(x + fx * 5.5, z + fz * 5.5) < SL - 1 && groundH(x + fx * 1, z + fz * 1) > SL - .1) return { x, z, yaw } } } return null });
  console.log('shore', JSON.stringify(sp)); if (!sp) return;
  await ev((s) => { teleportRaw(s.x, s.z, s.yaw); cam.yaw = s.yaw; cam.pitch = -.2 }, sp); await h.wait(3500);
  await until('prompt', () => curAct && /Fish/.test(curAct.label), 20000);
  console.log('prompt', await ev(() => curAct && curAct.label));
  const c0 = await ev(() => WALLET.get());
  await ev(() => doAction()); await h.wait(300);
  console.log('cast', JSON.stringify(await ev(() => ({ s: FISH.s, wait: +FISH.wait.toFixed(1) }))));
  await h.wait(500); console.log(await h.shot('fish_cast', 900));
  await until('bite', () => FISH.s === 2, 30000);
  console.log('bite', JSON.stringify(await ev(() => ({ s: FISH.s, label: curAct && curAct.label }))));
  await ev(() => doAction()); await h.wait(300);
  console.log('cash', c0, '->', await ev(() => WALLET.get()), 'state', await ev(() => FISH.s));
  // lucky coins: look for one around and walk onto it
  await h.wait(500);
  const cn = await ev(() => { COINS.rebuild(player.x, player.z); return { n: COINS.list.length, first: COINS.list[0] ? { x: COINS.list[0].x, z: COINS.list[0].z, y: COINS.list[0].y } : null } });
  console.log('coins around', JSON.stringify(cn));
  if (cn.first) { const c1 = await ev(() => WALLET.get()); await ev((c) => { player.x = c.x; player.z = c.z; player.y = c.y - 1; }, cn.first); await h.wait(1500); console.log('coin cash', c1, '->', await ev(() => WALLET.get())) }
  console.log('menu', await ev(() => { document.getElementById('bJobs') ? JOBS.menu() : 0; return [...document.querySelectorAll('#kitMenu button')].length }));
};
