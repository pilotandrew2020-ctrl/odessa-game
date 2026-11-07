exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('house', { x: player.x, z: player.z, yaw: player.yaw }, { id: 'house0' }) }); await h.wait(6000);
  const info = await ev(() => ({ portal: PORTAL.cur, fridges: KIT.fridges.length, sinks: KIT.sinks.length, spots: KIT.spots.map(s => s.name + ':' + s.items.length), tvs: HSTATE.cur.tvs.length, cam: cam.dist }));
  console.log('house0', JSON.stringify(info));
  // stand at the fridge, look at it
  await ev(() => { const F = KIT.fridges[0]; player.x = F.ox + F.stand[0]; player.z = F.oz + F.stand[1]; player.y = INT_Y; const f = F.front(); cam.yaw = Math.atan2(f.x - player.x, f.z - player.z); cam.pitch = 0; });
  await h.wait(800);
  console.log('prompt', JSON.stringify(await ev(() => ({ label: curAct && curAct.label }))));
  await ev(() => doAction()); await h.wait(300);
  console.log(await h.shot('kit_open_a', 1500));
  await h.wait(1200);
  console.log('after open', JSON.stringify(await ev(() => ({ open: KIT.fridges[0].open, menu: KIT.menuOn(), btns: [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent), act: KIT.act && KIT.act.kind, vis: KIT.vm.visible }))));
  console.log(await h.shot('kit_open_b', 1500));
  await ev(() => document.querySelectorAll('#kitMenu button')[0].click()); await h.wait(500);
  console.log(await h.shot('kit_take_a', 800)); await h.wait(1500);
  console.log('after take', JSON.stringify(await ev(() => ({ hold: KIT.hold && KIT.hold.kind, chip: document.getElementById('kitChip').textContent, menu: KIT.menuOn(), btns: [...document.querySelectorAll('#kitMenu button')].map(b => b.textContent) }))));
  console.log(await h.shot('kit_hold', 1500));
  await ev(() => KIT.drink()); await h.wait(1500);
  console.log(await h.shot('kit_sip', 800)); await h.wait(2500);
  console.log('after sip', JSON.stringify(await ev(() => ({ hold: KIT.hold && KIT.hold.kind, sips: KIT.hold && KIT.hold.sips, act: KIT.act && KIT.act.kind }))));
  console.log('errors', JSON.stringify(h.errors ? h.errors() : 'n/a'));
};
