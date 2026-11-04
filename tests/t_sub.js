exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)) });
  await h.start(); await h.noRender(); await h.wait(2500);
  const r = await ev(() => { const pl = PLACES.find(p => p.id === 'sub1'); return pl ? { x: pl.x, z: pl.z, yaw: pl.yaw } : null });
  console.log('mooring', JSON.stringify(r)); if (!r) return;
  await ev((p) => { teleportRaw(p.x, p.z, p.yaw) }, r); await h.wait(4000);
  const v = await ev(() => { const s = EXT.veh.filter(v => v.kind === 'sub').sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z))[0]; if (!s) return null; EXT.enter(s); return { x: s.x, z: s.z, y: s.y, d: Math.round(Math.hypot(s.x - player.x, s.z - player.z)) } });
  console.log('sub', JSON.stringify(v)); if (!v) return;
  await h.wait(500);
  // carry the submarine to open deep water (the shelf next to the quay is shallow)
  const sea = await ev(() => { const pl = PLACES.find(p => p.id === 'arcadia'); for (let r = 150; r < 3000; r += 40) for (let a = 0; a < 6.283; a += .1) { const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; if (SL - groundH(x, z) > 30 && SL - groundH(x + 25, z) > 30 && SL - groundH(x - 25, z) > 30 && SL - groundH(x, z + 25) > 30 && SL - groundH(x, z - 25) > 30) return { x, z } } return null });
  await ev((s) => { EXT.cur.x = s.x; EXT.cur.z = s.z; EXT.cur.yaw = 0; EXT.cur.sync() }, sea); await h.wait(1500);
  await ev(() => { DEEP.dive = 1 }); await h.wait(9000);
  console.log('dived', JSON.stringify(await ev(() => ({ depth: +(SL - EXT.cur.y).toFixed(1), uw: UW.on, deepOn: DEEP.on, rocks: DEEP.rock && DEEP.rock.count, fish: DEEP.fishM && DEEP.fishM.count, pad: document.getElementById('deepPad').className, kelp: DEEP.kelp && DEEP.kelp.count }))));
  console.log(await h.shot('sub_dive', 1500));
  await ev(() => { DEEP.dive = 0; DEEP.rise = 1 }); await h.wait(12000);
  console.log('risen', JSON.stringify(await ev(() => ({ depth: +(SL - EXT.cur.y).toFixed(1) }))));
};
