exports.opts = { w: 640, h: 400 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const p = AIRP.flight, d = p.doorPos(); teleportRaw(d.x + 2, d.z + 2, 0); });
  await page.waitForTimeout(4000);
  console.log('prompt', await ev(() => { updateHUD(.1); return curAct && curAct.label }));
  // board with the action (E)
  await ev(() => { doAction(); });
  await page.waitForTimeout(600);
  console.log('aboard', JSON.stringify(await ev(() => ({ on: MP.on, plat: MP.plat && MP.plat.name, loc: [MP.lx, MP.ly, MP.lz].map(v => +v.toFixed(2)) }))));
  const r = await ev(() => { const P = MP.plat, o = { lx: MP.lx, ly: MP.ly, lz: MP.lz }, log = [];
    const go = (n, tx, tz) => { let stuck = 0, st = 0; while (Math.hypot(tx - o.lx, tz - o.lz) > .15 && st < 900) { const dx = tx - o.lx, dz = tz - o.lz, d = Math.hypot(dx, dz), s = Math.min(.1, d); const px = o.lx, pz = o.lz; const ok = MP.slide(P, o, dx / d * s, dz / d * s, MP.R, MP.UP); if (ok) o.ly = o.fy; st++; if (!ok || Math.hypot(o.lx - px, o.lz - pz) < s * .3) { stuck++; if (stuck > 12) { log.push(['FAIL', n, +o.lx.toFixed(2), +o.lz.toFixed(2)]); return } } else stuck = 0 } log.push(['ok', n]) };
    go('inside the door', 1.0, 11.6); go('aisle front', 0, 11.6); go('aisle mid', 0, 2); go('aisle rear', 0, -8); go('galley', 0, -9.8); go('back to front', 0, 10); go('cockpit door', 0, 12.7); go('cockpit', 0, 13.3); go('behind pilot seat', .62, 12.9);
    return log.filter(l => l[0] === 'FAIL').concat([['seats', P.seats.length, P.seats.filter(s => !s.who).length]]) });
  console.log('cabin walk', JSON.stringify(r));
  // sit in the pilot seat (what E does), check the pilot state and the HUD
  await ev(() => { MP.lx = .62; MP.ly = -.95; MP.lz = 12.9; updateHUD(.1); window.__a = curAct && curAct.label; MP.sit(PLN.list[0].pilotSeat); });
  await page.waitForTimeout(1200);
  console.log('pilot', JSON.stringify(await ev(() => ({ act: window.__a, manual: PLN.list[0].manual, hud: !PLN.hudEl.hidden, seat: MP.seat && MP.seat.label }))));
  // press the overhead buttons through the raycaster path: project a button to the screen and "click" it
  const clk = await ev(() => { const p = PLN.list[0]; PLN.camMode = 'cockpit'; MP.stepCamera(.016); camera.updateMatrixWorld(true); const out = [];
    for (const id of ['eng1', 'eng2', 'belts', 'gear']) { const b = p.btns.find(q => q.id === id); const v = new THREE.Vector3(); b.mesh.getWorldPosition(v); v.project(camera); const r = renderer.domElement.getBoundingClientRect();
      const e = { clientX: r.left + (v.x * .5 + .5) * r.width, clientY: r.top + (-v.y * .5 + .5) * r.height }; const before = p.engOn + '/' + p.gearT + '/' + p.seatbelt; PLN.click(e); out.push([id, +v.x.toFixed(2), +v.y.toFixed(2), before, p.engOn + '/' + p.gearT + '/' + p.seatbelt]) } return out });
  console.log('click', JSON.stringify(clk));
  console.log('engines', JSON.stringify(await ev(() => { const p = PLN.list[0]; return { engOn: p.engOn, eng1: p.eng1, eng2: p.eng2 } })));
  // cabin + cockpit shots
  await ev(() => { MP.stand(); });
  await ev(() => { MP.lx = 0; MP.lz = 3; MP.ly = -.95; cam.dist = .5; cam.yaw = MP.plat.root.rotation.y + Math.PI; cam.pitch = .02; });
  await page.waitForTimeout(400);
  console.log('shot cabin', await h.shot('cabin_fp', 6000));
  await ev(() => { MP.lx = 0; MP.lz = 12.9; cam.dist = .5; cam.yaw = MP.plat.root.rotation.y; cam.pitch = .05; });
  await page.waitForTimeout(400);
  console.log('shot cockpit', await h.shot('cockpit_fp', 6000));
  const turn = await ev(() => {
    const p = PLN.list.find(q => q.kind === 'airliner');
    if (!p) return { ok: false, reason: 'airliner missing' };
    p.ai = null; p.manual = true; p.hold = false; p.onGround = false; p.x = AIRP.C[0]; p.z = AIRP.C[1]; p.y = 1200;
    p.yaw = 0; p.pitch = p.roll = 0; p.v = 180; p.vy = 0; p.thr = p.thrT = p.eng = 0.9; p.gear = p.gearT = 0;
    for (let i = 0; i < 480; i++) {
      inp.k.KeyD = i % 48 < 24; inp.k.KeyA = !inp.k.KeyD;
      p.fly(0.016); p.sync(); PLN.chase(p, 0.016, true);
      if (!p.validState() || ![cam.x, cam.y, cam.z, camera.position.x, camera.position.y, camera.position.z].every(Number.isFinite)) return { ok: false, frame: i };
    }
    p.manual = false; inp.k.KeyD = inp.k.KeyA = false; p.v = 0; p.onGround = true; p.parking = true; p.y = p.groundY() - p.bottom(); p.fly(0);
    return { ok: p.validState(), zeroDt: p.validState(), cameraFinite: [cam.x, cam.y, cam.z].every(Number.isFinite) };
  });
  console.log('airliner sharp-turn check', JSON.stringify(turn));
  if (!turn.ok || !turn.zeroDt || !turn.cameraFinite) throw new Error('Airliner turn produced non-finite state');
};
