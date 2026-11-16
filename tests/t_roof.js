// Rooftop pads (roofpads.js) + the extra plane cameras (plane.js cycleCam: chase / cockpit / [cabin] / orbit). The light plane spawns on the nearest pad, stays on the roof, can taxi along it; the camera cycles. ROOFSHOT=1: screenshots tests/out/roof_*.png.
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.ROOFSHOT;
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const shot = async (n, ms) => { if (!SH) return; await h.wait(ms || 2000); await page.screenshot({ path: h.SCR + '/' + n + '.png' }) };
  await ev(() => { const p = PLACES.find(q => q.id === 'deriba'); teleportRaw(p.x + 10, p.z + 120, p.yaw) }); await h.wait(8000);
  await ev(() => AIRP.spawnLight(true)); await page.waitForFunction(() => PLN.cur && PLN.cur.kind === 'light', null, { timeout: 120000 });
  await h.wait(5000);
  const a = await ev(() => { const p = PLN.cur, pad = ROOFPADS.near(p.x, p.z); return { x: Math.round(p.x), z: Math.round(p.z), y: +p.y.toFixed(1), padY: pad.y, onGround: p.onGround, bottom: +p.bottom().toFixed(2), crashed: p.crashed } });
  console.log('on the pad', JSON.stringify(a)); assert(a.onGround && !a.crashed && Math.abs(a.y + a.bottom - a.padY) < 1.2, 'the plane did not stay on the rooftop pad');
  await ev(() => { cam.dist = 8; cam.pitch = .25; cam.init = false }); await shot('roof_parked', 2500);
  // taxi forward a little: still on the roof
  await ev(() => { const p = PLN.cur; p.engOn = true; p.eng = 1; p.thrT = .35; p.brake = false; p.parking = false }); await h.wait(4000);
  const b = await ev(() => { const p = PLN.cur; return { x: Math.round(p.x), y: +p.y.toFixed(1), v: +p.v.toFixed(1), onGround: p.onGround, crashed: p.crashed } }); console.log('taxi', JSON.stringify(b)); assert(!b.crashed, 'crashed on the roof');
  await ev(() => { PLN.cur.thrT = 0; PLN.cur.brake = true });
  // cameras
  const modes = []; for (let i = 0; i < 3; i++) { await ev(() => PLN.cycleCam()); modes.push(await ev(() => PLN.camMode)); await shot('roof_cam_' + modes[modes.length - 1], 1500) }
  console.log('camera modes', modes.join(',')); assert(modes.join() === 'cockpit,orbit,chase', 'the camera cycle for a light plane is chase > cockpit > orbit');
  const oc = await ev(() => { PLN.camMode = 'orbit'; return 1 }); await h.wait(1500);
  const d = await ev(() => Math.hypot(camera.position.x - PLN.cur.x, camera.position.z - PLN.cur.z)); assert(d > 8, 'the orbit camera is inside the plane');
  // the airliner has a fourth mode, the cabin window: the camera sits inside the fuselage and looks out sideways
  await ev(() => { PLN.cur.manual = false; PLN.cur = null; PLN.hudShow(false); PLN.camMode = 'chase'; AIRP.spawn('airliner') }); await page.waitForFunction(() => PLN.list.some(p => p.kind === 'airliner'), null, { timeout: 180000 });
  const cab = await ev(() => { const p = PLN.list.find(q => q.kind === 'airliner'); PLN.cur = p; p.manual = true; const L = []; for (let i = 0; i < 4; i++) { PLN.cycleCam(); L.push(PLN.camMode) } PLN.camMode = 'cabin'; const ok = PLN.stepCamera(.016); const e = camera.position, d = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z); PLN.cur = null; p.manual = false; return { L, ok, d: +d.toFixed(1), len: p.d.len, fin: [e.x, e.y, e.z].every(Number.isFinite) } });
  console.log('airliner cameras', JSON.stringify(cab)); assert(cab.L.join() === 'cockpit,cabin,orbit,chase' && cab.ok !== false && cab.fin && cab.d < cab.len, 'airliner camera cycle / cabin window');
};
