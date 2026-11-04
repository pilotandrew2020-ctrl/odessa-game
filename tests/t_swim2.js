exports.opts = { w: 640, h: 400 };
exports.run = async (page, h) => {
  await h.boot(); await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender(); await h.wait(2500);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const p = PLACES.find(q => q.id === 'yacht'); teleportRaw(p.x, p.z, p.yaw); YACHT.summon && YACHT.summon() }); await h.wait(6000);
  const info = await ev(() => { const y = YACHT.y; if (!y) return null; const c = y.root.position; let pt = null;
    for (let r = 8; r < 14 && !pt; r += 1) for (let a = 0; a < 6.283; a += .15) { const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r; if (groundH(x, z) < SL - 2 && !specialGround(x, z, SL)) { pt = { x, z, r }; break } }
    return { yacht: [Math.round(c.x), Math.round(c.z)], pt } });
  console.log('yacht', JSON.stringify(info));
  if (!info || !info.pt) return;
  await ev((i) => { player.x = i.pt.x; player.z = i.pt.z; player.y = SL + 3; player.air = true; player.vy = 0 }, info);
  for (let i = 0; i < 12; i++) { await h.wait(500); if (await ev(() => SWIM.on)) break }
  console.log('swimming near yacht', JSON.stringify(await ev(() => { let best = null, bd = 1e9; for (const it of INTERACT) { if (it.cond && !it.cond()) continue; const d = Math.hypot(it.x - player.x, it.z - player.z); if (d < it.r && Math.abs((it.y || player.y) - player.y) < 2.5 && d < bd) { bd = d; best = it } } return { swimOn: SWIM.on, prompt: best && best.label } })));
  await ev(() => { const it = INTERACT.find(i => { try { return i.label === 'Board the yacht' && (!i.cond || i.cond()) } catch (e) { return false } }); if (it) it.fn() });
  await h.wait(3000);
  console.log('after E', JSON.stringify(await ev(() => ({ swimOn: SWIM.on, mpOn: MP.on, plat: MP.plat && MP.plat.name, rotX: +PLR.root.rotation.x.toFixed(2), order: PLR.root.rotation.order }))));
};
