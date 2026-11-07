exports.opts = { w: 900, h: 560 };
exports.run = async (page, h) => {
  await h.boot(); await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender(); await h.wait(2500);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(3500);
  await ev(() => { AIRP.spawn('airliner'); }); for (let i = 0; i < 24; i++) { await h.wait(500); if (await ev(() => !!(AIRP.mine && AIRP.mine.airliner) && !AIRP.busy)) break }
  await ev(() => { AIRP.spawn('fighter') }); await h.wait(2500);
  const st = () => ev(() => { const A = AIRP.mine.airliner, F = AIRP.mine.fighter; return { airliner: { has: !!A.stairs, vis: A.stairs && A.stairs.visible, out: A.stairsOut, door: A.doorOpen }, fighter: { has: !!F.stairs, vis: F.stairs && F.stairs.visible, out: F.stairsOut }, chip: (() => { const c = document.getElementById('stairChip'); return c && { hidden: c.hidden, text: c.textContent } })() } });
  console.log('parked', JSON.stringify(await st()));
  // stand beside the airliner door -> the chip shows up
  await ev(() => { const A = AIRP.mine.airliner; const d = A.doorPos(); player.x = d.x + Math.cos(A.yaw) * 2.5; player.z = d.z - Math.sin(A.yaw) * 2.5; player.y = groundAt(player.x, player.z, A.y) }); await h.wait(1200);
  console.log('near airliner', JSON.stringify((await st()).chip));
  // screenshot with the stairs
  await ev(() => { const A = AIRP.mine.airliner, c = A.root.position, y = A.yaw, f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; const d = A.doorPos(); window.DBGCAM = [d.x + l[0] * 9 - f[0] * 3, d.y + 3, d.z + l[1] * 9 - f[1] * 3, d.x, d.y + 1.5, d.z] });
  console.log(await h.shot('stairs_on', 5000));
  // press the chip
  await ev(() => document.getElementById('stairChip').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await h.wait(500);
  console.log('after chip', JSON.stringify(await st()));
  console.log(await h.shot('stairs_off', 5000));
  await ev(() => document.getElementById('stairChip').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await h.wait(500);
  console.log('chip again', JSON.stringify((await st()).airliner));
  // in flight the stairs must be gone even though they are "out"
  await ev(() => { const A = AIRP.mine.airliner; A.onGround = false; A.v = 70 }); await h.wait(800);
  console.log('airborne', JSON.stringify((await st()).airliner));
  await ev(() => { const A = AIRP.mine.airliner; A.onGround = true; A.v = 0 }); await h.wait(500);
  // the fighter ladder
  await ev(() => { const F = AIRP.mine.fighter; const d = F.doorPos(); player.x = d.x + Math.cos(F.yaw) * 1.8; player.z = d.z - Math.sin(F.yaw) * 1.8; player.y = groundAt(player.x, player.z, F.y) }); await h.wait(1200);
  console.log('near fighter', JSON.stringify(await st()));
  await ev(() => { const F = AIRP.mine.fighter, y = F.yaw, f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; const d = F.doorPos(); window.DBGCAM = [d.x + l[0] * 6 + f[0] * 2, d.y + 2, d.z + l[1] * 6 + f[1] * 2, d.x, d.y + .8, d.z] });
  console.log(await h.shot('ladder_on', 5000));
  await ev(() => document.getElementById('stairChip').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await h.wait(500);
  console.log('fighter after chip', JSON.stringify((await st()).fighter));
  // the airliner's cockpit panel button
  console.log('panel btn', await ev(() => !!AIRP.mine.airliner.btns.find(b => b.id === 'stairs')));
  console.log('light plane has no stairs/chip:', await ev(async () => { await PM.loadLight(); const a = PLN.add('light', player.x + 30, player.z, 0); return { stairs: a.stairs } }));
};
