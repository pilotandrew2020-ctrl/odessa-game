// visual check of each hands-on step, with the step frozen at a chosen moment
exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 400)) });
  const until = async (name, f, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, arg)) return true; await h.wait(120) } console.log('TIMEOUT', name); return false };
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' }) }); await h.wait(6000);
  await ev(() => { camera.fov = 62; camera.updateProjectionMatrix(); document.getElementById('kitMenu'); });
  const at = (x, z, lx, lz, pitch) => ev(([x, z, lx, lz, pitch]) => { player.x = x; player.z = z; player.y = INT_Y; player.vx = player.vz = 0; cam.yaw = Math.atan2(lx - x, lz - z); cam.pitch = pitch || 0; KIT.dom(); KIT.freeze = false; if (KIT.act) KIT.endAct(true); KIT.closeMenu(); document.getElementById('kitChip').classList.remove('on') }, [x, z, lx, lz, pitch]);
  const frozen = async (name, kind, t, fn, pitch) => { await ev(([kind, t]) => { KIT.freeze = true; const a = KIT.act; if (a) a.t = t }, [kind, t]); await h.wait(700); await ev(() => { KIT.closeMenu() }); console.log(name, await h.shot('v_' + name, 900)) };
  const hideUi = () => ev(() => { document.getElementById('kitChip').style.display = 'none' });
  const F = await ev(() => { const f = KIT.fridges[0]; return { st: [f.ox + f.stand[0], f.oz + f.stand[1]], fr: f.front() } });
  const sk = await ev(() => { const k = KIT.sinks.find(s => s.o.drink); return { x: k.o.wx, z: k.o.wz, st: k.o.stand } });
  const tb = await ev(() => { const sp = KIT.spots.find(s => s.name === 'Table'); return { x: sp.wx, z: sp.wz } });
  // fridge: reaching for the handle, pulling
  await at(F.st[0], F.st[1], F.fr.x, F.fr.z, 0); await h.wait(300);
  await ev(() => { KIT.freeze = false; KIT.fridgeE(KIT.fridges[0]) }); await h.wait(100);
  await frozen('fridge_reach', 'fopen', .3);
  await ev(() => { KIT.freeze = false }); await until('opened', () => KIT.fridges[0].open);
  // hold a carton / kettle / cup in the carrying pose
  await ev(() => { KIT.closeMenu(); KIT.setHold('milk') }); await h.wait(900); console.log(await h.shot('v_hold_milk', 900));
  await ev(() => { KIT.setHold('kettle', { water: 1 }) }); await h.wait(900); console.log(await h.shot('v_hold_kettle', 900));
  await ev(() => { KIT.setHold('tea') }); await h.wait(900); console.log(await h.shot('v_hold_tea', 900));
  await ev(() => { KIT.setHold(null) });
  // sink
  await at(sk.st[0], sk.st[1], sk.x, sk.z, -.5); await h.wait(300);
  await ev(() => { const k = KIT.sinks.find(s => s.o.drink); KIT.tapSet(k, true); KIT.sinkMenu(k) }); await h.wait(400);
  await ev(() => document.querySelectorAll('#kitMenu button')[0].click()); await h.wait(100);   // wash
  await frozen('wash_soap', 'wash', .45);
  await frozen('wash_wet', 'wash', 1.1);
  await frozen('wash_rub', 'wash', 3.0);
  await frozen('wash_rinse', 'wash', 5.8);
  await ev(() => { KIT.freeze = false; KIT.endAct(true) });
  // kettle under the tap
  await ev(() => { KIT.setHold('kettle', { water: 0 }); const k = KIT.sinks.find(s => s.o.drink); KIT.sinkMenu(k) }); await h.wait(300);
  await ev(() => document.querySelectorAll('#kitMenu button')[0].click()); await h.wait(100);
  await frozen('fill', 'fill', 2.0);
  await ev(() => { KIT.freeze = false; KIT.endAct(true); KIT.setHold(null) });
  // sipping
  await ev(() => { KIT.setHold('milk') }); await h.wait(200); await ev(() => KIT.drink()); await h.wait(100);
  await frozen('sip', 'sip', 1.5);
  await ev(() => { KIT.freeze = false; KIT.endAct(true); KIT.setHold(null) });
  // table: place + pour
  await at(tb.x, tb.z - 1.0, tb.x, tb.z, -.35); await h.wait(300);
  await ev(([x, z]) => { KIT.setHold('kettle', { water: 1 }); const sp = KIT.spots.find(s => s.name === 'Table'); KIT.run('place', { spot: sp, pos: KIT.slotPos(sp, 0), at: { x: sp.wx, z: sp.wz }, want: .7, look: () => ({ x: sp.wx, z: sp.wz }), pitch: -.35 }) }, [tb.x, tb.z]); await h.wait(100);
  await frozen('place', 'place', .5);
  await ev(() => { KIT.freeze = false }); await until('placed', () => !KIT.act);
  await ev(() => { const sp = KIT.spots.find(s => s.name === 'Table'); const it = sp.items[0]; it.boiled = true; KIT.makeTea(sp, it) }); await h.wait(100);
  await frozen('pour', 'pour', 1.9);
};
