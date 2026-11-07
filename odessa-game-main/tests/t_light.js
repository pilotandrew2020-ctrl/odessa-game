exports.opts = { w: 900, h: 560 };
exports.run = async (page, h) => {
  await h.boot(); await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender(); await h.wait(2500);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const p = PLACES.find(q => q.id === 'airport'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(3500);
  await ev(() => { document.querySelector('#airPick') || AIRP.menu(); const m = document.getElementById('airPick'); m.hidden = false; m.querySelector('[data-k="light"]').click() });
  for (let i = 0; i < 20; i++) { await h.wait(500); if (await ev(() => !!(AIRP.mine && AIRP.mine.light))) break }
  console.log('menu items', await ev(() => [...document.querySelectorAll('#airPick [data-k]')].map(b => b.dataset.k).join(',')));
  const info = await ev(() => { const a = AIRP.mine && AIRP.mine.light; if (!a) return null; const names = []; a.root.traverse(o => { if (o.name) names.push(o.name) }); return { kind: a.kind, pos: [a.x, a.y, a.z].map(v => Math.round(v)), dims: a.d, partNames: Object.keys(a.parts), fans: a.parts.fans.length, ail: a.parts.ail.map(x => !!x), elev: a.parts.elev.map(x => !!x), gear: ['gearN', 'gearL', 'gearR'].map(k => !!a.parts[k]), toast: (document.getElementById('toast') || {}).textContent, dist: Math.round(Math.hypot(a.x - player.x, a.z - player.z)) } });
  console.log('light plane', JSON.stringify(info));
  if (!info) return;
  await ev(() => { const a = AIRP.mine.light; const c = a.root.position, y = a.yaw; const f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; window.DBGCAM = [c.x + l[0] * 9 + f[0] * 5, c.y + 2.5, c.z + l[1] * 9 + f[1] * 5, c.x, c.y, c.z]; });
  console.log(await h.shot('light_34', 5000));
  await ev(() => { const a = AIRP.mine.light; const c = a.root.position, y = a.yaw; const f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; window.DBGCAM = [c.x + l[0] * 11, c.y + .6, c.z + l[1] * 11, c.x, c.y + .2, c.z]; });
  console.log(await h.shot('light_side', 5000));
  // board
  await ev(() => { window.DBGCAM = null; const a = AIRP.mine.light; const d = a.doorPos(); player.x = d.x; player.z = d.z; player.y = groundAt(d.x, d.z, a.y) });
  await h.wait(800);
  const prompt = await ev(() => { let best = null, bd = 1e9; for (const it of INTERACT) { if (it.cond && !it.cond()) continue; const d = Math.hypot(it.x - player.x, it.z - player.z); if (d < it.r && Math.abs((it.y || player.y) - player.y) < 2.5 && d < bd) { bd = d; best = it } } return best && best.label });
  console.log('prompt at the door:', prompt);
  await ev(() => { const it = INTERACT.find(i => { try { return i.label === 'Climb into the plane' && (!i.cond || i.cond()) } catch (e) { return false } }); it && it.fn() }); await h.wait(1500);
  console.log('aboard', JSON.stringify(await ev(() => ({ cur: !!PLN.cur, kind: PLN.cur && PLN.cur.kind, hud: !document.getElementById('pHud').hidden, plrVisible: PLR.root.visible, toast: (document.getElementById('toast') || {}).textContent }))));
  console.log(await h.shot('light_chase', 5000));
  await ev(() => { PLN.camMode = 'cockpit' }); await h.wait(1000);
  console.log(await h.shot('light_cockpit', 5000));
  await ev(() => { PLN.camMode = 'chase'; const a = PLN.cur, c = a.root.position, y = a.yaw; const f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; window.DBGCAM = [c.x + l[0] * 3.2 + f[0] * 1.6, c.y + 1.6, c.z + l[1] * 3.2 + f[1] * 1.6, c.x, c.y + .5, c.z + 0] });
  console.log(await h.shot('light_pilot', 5000));
};
