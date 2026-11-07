exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)) });
  const until = async (name, f, ms = 20000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await h.wait(120) } console.log('TIMEOUT', name); return false };
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' }) }); await h.wait(6500);
  const lab = await ev(() => INTERACT.filter(i => i.x > 40000).map(i => i.label).filter(l => typeof l === 'string'));
  console.log('labels', JSON.stringify([...new Set(lab)]));
  // ---- cook
  const ck = await ev(() => { const it = INTERACT.find(i => i.label === 'Cook'); return { x: it.x, z: it.z } });
  await ev((c) => { player.x = c.x; player.z = c.z; player.y = INT_Y; player.vx = player.vz = 0; cam.yaw = 0; cam.pitch = -.3 }, ck);
  await until('prompt', () => curAct && curAct.label === 'Cook'); await ev(() => doAction()); await h.wait(300);
  console.log('stove menu', JSON.stringify(await ev(() => [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent))));
  await ev(() => document.querySelector('#kitMenu button').click()); await h.wait(200);
  await ev(() => { KIT.freeze = true; KIT.act.t = 3.5 }); await h.wait(900); console.log(await h.shot('v_cook', 900));
  await ev(() => { KIT.freeze = false }); await until('cooked', () => KIT.hold && KIT.hold.kind === 'omelette', 25000);
  console.log('hold', await ev(() => KIT.hold && KIT.hold.kind), await ev(() => document.getElementById('kitChip').textContent));
  await ev(() => { KIT.freeze = false }); await until('idle', () => !KIT.act);
  console.log(await h.shot('v_omelette', 900));
  await ev(() => KIT.drink()); await ev(() => { KIT.freeze = true; KIT.act.t = 1.5 }); await h.wait(900); console.log(await h.shot('v_eat', 900));
  await ev(() => { KIT.freeze = false; KIT.endAct(true); KIT.setHold(null) });
  // ---- dishes
  const sk = await ev(() => { const i = KIT.sinks.findIndex(s => s.o.drink); const k = KIT.sinks[i]; return { i, st: k.o.stand, at: [k.at.x, k.at.z] } });
  await ev((d) => { player.x = d.st[0]; player.z = d.st[1]; cam.yaw = Math.atan2(d.at[0] - d.st[0], d.at[1] - d.st[1]); cam.pitch = -.3; KIT.tapSet(KIT.sinks[d.i], true); KIT.sinkMenu(KIT.sinks[d.i]) }, sk); await h.wait(300);
  console.log('sink menu', JSON.stringify(await ev(() => [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent))));
  const c0 = await ev(() => WALLET.get());
  await ev(() => [...document.querySelectorAll('#kitMenu button')].find(b => /dishes/.test(b.textContent)).click()); await until('dishes done', () => !KIT.act, 40000);
  console.log('cash', c0, '->', await ev(() => WALLET.get()));
  console.log('menu again', JSON.stringify(await ev(() => [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent))));
  // ---- sleep
  await ev(() => { S.time = 'night'; applyTime() }); console.log('time before', await ev(() => S.time));
  await ev(() => KIT.sleep()); await h.wait(6500);
  console.log('time after', await ev(() => ({ t: S.time, sleeping: KIT.sleeping, label: document.getElementById('bTime').textContent })));
  console.log('bed entry', await ev(() => INTERACT.some(i => i.label === 'Bed')));
};
