exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)) });
  const until = async (name, f, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await h.wait(150) } console.log('TIMEOUT waiting for', name); return false };
  const goto = (x, z, lx, lz, pitch) => ev(([x, z, lx, lz, pitch]) => { player.x = x; player.z = z; player.y = INT_Y; player.vx = player.vz = 0; cam.yaw = Math.atan2(lx - x, lz - z); cam.pitch = pitch || 0 }, [x, z, lx, lz, pitch]);
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' }) }); await h.wait(6000);
  const press = async (re) => { const ok = await until('prompt ' + re, (r) => !!(curAct && new RegExp(r).test(curAct.label)), 20000, re); await ev(() => doAction()); await h.wait(200); return ok };
  const idle = () => ev(() => !KIT.act);
  const menu = () => ev(() => [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent.replace(/^\d/, '')));
  const pick = (label) => ev((l) => { const b = [...document.querySelectorAll('#kitMenu button')].find(b => b.textContent.replace(/^\d/, '') === l); if (!b) return 'no button ' + l; b.click(); return 'ok' }, label);
  // 1. take the kettle from the worktop
  const wk = await ev(() => { const sp = KIT.spots.find(s => s.name === 'Worktop'); return { x: sp.wx, z: sp.wz } });
  const sk = await ev(() => { const k = KIT.sinks.find(s => s.o.drink) || KIT.sinks[0]; return { x: k.o.wx, z: k.o.wz, st: k.o.stand } });
  console.log('worktop', JSON.stringify(wk), 'sink', JSON.stringify(sk));
  await goto(wk.x, wk.z + 0.9, wk.x, wk.z); await press('Worktop');
  console.log('menu', JSON.stringify(await menu()));
  console.log(await pick('Take the kettle')); await until('take', () => KIT.hold && KIT.hold.kind === 'kettle');
  await until('idle', () => !KIT.act);
  console.log('holding', JSON.stringify(await ev(() => ({ kind: KIT.hold && KIT.hold.kind, chip: document.getElementById('kitChip').textContent }))));
  console.log(await h.shot('kit_kettle_hold', 1200));
  // 2. the tap: turn on, fill
  await goto(sk.st[0], sk.st[1], sk.x, sk.z, -.2); await press('Turn on the tap'); await until('tap on', () => KIT.sinks.some(s => s.t.on)); await until('idle', () => !KIT.act);
  console.log('tap', JSON.stringify(await ev(() => ({ on: KIT.sinks.map(s => s.t.on), jetVisible: HSTATE.cur.taps.map(t => t.m.visible), menu: KIT.menuOn() }))), JSON.stringify(await menu()));
  console.log(await pick('Fill the kettle')); await h.wait(1800);
  console.log(await h.shot('kit_fill', 1200));
  await until('filled', () => KIT.hold && KIT.hold.water >= .99, 20000); await until('idle', () => !KIT.act);
  console.log('filled', JSON.stringify(await ev(() => ({ water: KIT.hold.water, chip: document.getElementById('kitChip').textContent, menu: KIT.menuOn() }))), JSON.stringify(await menu()));
  console.log(await pick('Turn off the tap')); await until('tap off', () => !KIT.sinks.some(s => s.t.on)); await until('idle', () => !KIT.act);
  // 3. put it on the table
  const tb = await ev(() => { const sp = KIT.spots.find(s => s.name === 'Table'); return { x: sp.wx, z: sp.wz, r: sp.r } });
  await goto(tb.x, tb.z - 1.0, tb.x, tb.z, -.3); await press('Put the kettle on the table'); console.log('menu', JSON.stringify(await menu()));
  console.log(await pick('Put the kettle here')); await until('placed', () => KIT.spots.find(s => s.name === 'Table').items.length === 1); await until('idle', () => !KIT.act);
  console.log(await h.shot('kit_placed', 1200));
  console.log('menu after place', JSON.stringify(await menu()));
  console.log(await pick('Switch the kettle on')); await until('boiling', () => KIT.spots.find(s => s.name === 'Table').items[0].boiling); await until('idle', () => !KIT.act);
  console.log(await h.shot('kit_boiling', 1500));
  await until('boiled', () => KIT.spots.find(s => s.name === 'Table').items[0].boiled, 30000);
  console.log('boiled', JSON.stringify(await ev(() => KIT.spots.find(s => s.name === 'Table').items.map(i => [i.kind, i.water, i.boiled]))));
  // 4. make tea
  await h.wait(400); console.log('menu', JSON.stringify(await menu()));
  console.log(await pick('Make green tea')); await h.wait(2500);
  console.log(await h.shot('kit_pour', 800));
  await until('tea', () => KIT.spots.find(s => s.name === 'Table').items.some(i => i.kind === 'tea'), 20000); await until('idle', () => !KIT.act);
  console.log(await h.shot('kit_tea', 1200));
  await ev(() => KIT.spotE(KIT.spots.find(s => s.name === 'Table'))); console.log('menu', JSON.stringify(await menu()));
  console.log(await pick('Take the green tea')); await until('hold tea', () => KIT.hold && KIT.hold.kind === 'tea'); await until('idle', () => !KIT.act);
  console.log('hold', JSON.stringify(await ev(() => KIT.hold && KIT.hold.kind)));
  console.log(await h.shot('kit_tea_hold', 1200));
  await ev(() => KIT.drink()); await h.wait(1600); console.log(await h.shot('kit_tea_sip', 800));
  await until('sip done', () => !KIT.act, 20000);
  console.log('after sip', JSON.stringify(await ev(() => ({ sips: KIT.hold && KIT.hold.sips }))));
};
