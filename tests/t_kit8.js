exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)) });
  const until = async (name, f, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await h.wait(120) } console.log('TIMEOUT', name); return false };
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house1' }) }); await h.wait(6500);
  const d = await ev(() => { const i = KIT.sinks.findIndex(s => !s.o.drink); const k = KIT.sinks[i]; return { i, st: [k.o.stand[0], k.o.stand[1]], at: [k.at.x, k.at.z], n: KIT.sinks.length } });
  console.log('basin', JSON.stringify(d));
  await ev((d) => { player.x = d.st[0]; player.z = d.st[1]; player.y = INT_Y; player.vx = player.vz = 0; cam.yaw = Math.atan2(d.at[0] - d.st[0], d.at[1] - d.st[1]); cam.pitch = -.3 }, d);
  await until('prompt', () => curAct && /tap/i.test(curAct.label), 20000);
  await ev(() => doAction()); await until('tap', (i) => KIT.sinks[i].t.on, 20000, d.i); await until('idle', () => !KIT.act);
  console.log('menu', JSON.stringify(await ev(() => [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent))));
  await ev(() => [...document.querySelectorAll('#kitMenu button')].find(b => /Wash/.test(b.textContent)).click()); await h.wait(150);
  await ev(() => { KIT.freeze = true; KIT.act.t = 3.0 }); await h.wait(900); console.log(await h.shot('b_wash', 900));
  await ev(() => { KIT.freeze = false }); await until('wash done', () => !KIT.act, 30000);
  console.log('after wash', JSON.stringify(await ev(() => ({ menu: KIT.menuOn(), btns: [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent), tapOn: KIT.sinks.map(s => s.t.on) }))));
};
