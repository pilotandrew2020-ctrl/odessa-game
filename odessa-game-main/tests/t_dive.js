exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)) });
  await h.start(); await h.noRender(); await h.wait(2500);
  // a spot of open sea 40 m deep
  const sp = await ev(() => { const pl = PLACES.find(p => p.id === 'arcadia'); for (let r = 150; r < 3000; r += 40) for (let a = 0; a < 6.283; a += .1) { const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; if (SL - groundH(x, z) > 25 && SL - groundH(x + 30, z) > 25 && SL - groundH(x - 30, z) > 25 && SL - groundH(x, z + 30) > 25 && SL - groundH(x, z - 30) > 25) return { x, z, depth: SL - groundH(x, z) } } return null });
  console.log('sea', JSON.stringify(sp)); if (!sp) return;
  await ev((s) => { teleportRaw(s.x, s.z, 0); player.y = SL + 3 }, sp); await h.wait(3500);
  console.log('swimming', JSON.stringify(await ev(() => ({ on: SWIM.on, dep: SWIM.dep, o2: SWIM.o2, pad: document.getElementById('deepPad') && document.getElementById('deepPad').className }))));
  await ev(() => { DEEP.dive = 1 }); await h.wait(4500);
  console.log('diving', JSON.stringify(await ev(() => ({ dep: +SWIM.dep.toFixed(2), o2: +SWIM.o2.toFixed(2), uw: UW.on, deepOn: DEEP.on, camY: +(camera.position.y - SL).toFixed(2), rocks: DEEP.rock && DEEP.rock.count, coral: DEEP.coral && DEEP.coral.count, kelp: DEEP.kelp && DEEP.kelp.count, fish: DEEP.fishM && DEEP.fishM.count, chests: DEEP.chests.length, gauge: document.getElementById('deepAir').className }))));
  await ev(() => { DEEP.dive = 1 }); await h.wait(6000);
  console.log(await h.shot('dive_1', 1500));
  console.log('deeper', JSON.stringify(await ev(() => ({ dep: +SWIM.dep.toFixed(2), o2: +SWIM.o2.toFixed(2), floor: +(SL - groundH(player.x, player.z)).toFixed(1) }))));
  // swim forward a bit, look at the floor
  await ev(() => { DEEP.dive = 0; inp.k.KeyW = true }); await h.wait(5000); await ev(() => { inp.k.KeyW = false });
  console.log(await h.shot('dive_2', 1500));
  // a chest near? teleport the swimmer next to the nearest one
  const ch = await ev(() => { const c = DEEP.chests.find(c => !c.opened); return c ? { x: c.x, z: c.z, y: c.y, reward: c.reward } : null });
  console.log('chest', JSON.stringify(ch));
  if (ch) { await ev((c) => { player.x = c.x + 1.2; player.z = c.z; SWIM.dep = Math.max(0, SL - c.y - 1.5); player.y = SL - .85 - SWIM.dep; cam.yaw = Math.atan2(c.x - player.x, c.z - player.z) }, ch); await h.wait(1500);
    console.log('prompt', await ev(() => curAct && curAct.label)); console.log(await h.shot('dive_chest', 1200));
    const before = await ev(() => WALLET.get()); await ev(() => doAction()); await h.wait(500);
    console.log('cash', before, '->', await ev(() => WALLET.get())); }
  // surface for air
  await ev(() => { DEEP.rise = 1 }); await h.wait(9000); await ev(() => { DEEP.rise = 0 });
  console.log('surfaced', JSON.stringify(await ev(() => ({ dep: +SWIM.dep.toFixed(2), o2: +SWIM.o2.toFixed(2), uw: UW.on }))));
};
