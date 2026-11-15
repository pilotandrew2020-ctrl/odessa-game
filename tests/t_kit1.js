// Hands-on kitchen, fridge: open the door, take the first item, drink one sip. Waits on state (the headless browser is slow: fixed sleeps used to read KIT.vm before the hands were built).
const assert = require('assert');
exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  const until = async (name, f, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f)) return true; await h.wait(150) } assert.fail('timeout waiting for ' + name) };
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' }) });
  await until('the house interior', () => PORTAL.cur && KIT.fridges.length > 0);
  const info = await ev(() => ({ portal: PORTAL.cur, fridges: KIT.fridges.length, sinks: KIT.sinks.length, spots: KIT.spots.map(s => s.name + ':' + s.items.length), tvs: HSTATE.cur.tvs.length, cam: cam.dist }));
  console.log('house0', JSON.stringify(info));
  // stand at the fridge, look at it
  await ev(() => { const F = KIT.fridges[0]; player.x = F.ox + F.stand[0]; player.z = F.oz + F.stand[1]; player.y = INT_Y; const f = F.front(); cam.yaw = Math.atan2(f.x - player.x, f.z - player.z); cam.pitch = 0; });
  await until('the fridge prompt', () => !!(curAct && /fridge/i.test(curAct.label)));
  console.log('prompt', JSON.stringify(await ev(() => ({ label: curAct && curAct.label }))));
  await ev(() => doAction());
  await until('the hands (viewmodel)', () => !!KIT.vm);
  console.log(await h.shot('kit_open_a', 1500));
  await until('the open fridge and its menu', () => KIT.fridges[0].open && KIT.menuOn() && !KIT.act);
  const open = await ev(() => ({ open: KIT.fridges[0].open, menu: KIT.menuOn(), btns: [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent), vis: KIT.vm.visible }));
  console.log('after open', JSON.stringify(open)); assert(open.btns.length >= 2, 'the fridge menu is empty');
  console.log(await h.shot('kit_open_b', 1500));
  await ev(() => document.querySelectorAll('#kitMenu button')[0].click());
  await until('an item in the hand', () => !!KIT.hold && !KIT.act);
  const take = await ev(() => ({ hold: KIT.hold && KIT.hold.kind, chip: document.getElementById('kitChip').textContent, menu: KIT.menuOn() }));
  console.log('after take', JSON.stringify(take)); assert(take.hold, 'nothing in the hand');
  console.log(await h.shot('kit_hold', 1500));
  const sips0 = await ev(() => KIT.hold.sips);
  await ev(() => KIT.drink());
  if (await ev(() => !!KIT.act)) { await until('the sip to end', () => !KIT.act); const s = await ev(() => ({ hold: KIT.hold && KIT.hold.kind, sips: KIT.hold && KIT.hold.sips })); console.log('after sip', JSON.stringify(s)); assert(!s.hold || s.sips !== sips0, 'the sip did not count') }
  else console.log('the first fridge item is not a drink (' + take.hold + '): sip skipped');
};
