exports.opts = { w: 900, h: 560 };
exports.run = async (page, h) => {
  await h.boot(); await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender(); await h.wait(2000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { const p = PLACES.find(q => q.id === 'arcadia'); teleportRaw(p.x, p.z, p.yaw) }); await h.wait(3500);
  await ev(() => { COOP.online = () => true; COOP.myId = 'n:me'; window.__mk = (id, st) => { const R = { peer: id, st: null, P: null, tag: null, tagName: '', bub: null, bubT: 0, sayT: 0, x: 0, y: 0, z: 0, yaw: 0, has: false, outfit: -1 }; R.st = Object.assign({ v: 1, in: 1, n: 'Friend', ch: CHAR.cur, x: player.x + 6, y: player.y, z: player.z, r: 0, m: 'walk', s: 0, zn: '' }, st); COOP.peers.set(id, R); return R };
    window.__feed = (R, patch) => { R.st = Object.assign({}, R.st, patch, { ts: performance.now() }) } });
  // ---- 1) a friend swimming 14 m out
  await ev(() => { const sx = 2944, sz = -4567.9; window.__sw = window.__mk('n:swimmer', { m: 'walk', x: sx, y: SL - .85, z: sz, r: 1.0, s: 1.7, sw: [1], ts: performance.now() }); window.__swI = setInterval(() => __feed(__sw, {}), 110) });
  await h.wait(2500);
  console.log('swimmer', JSON.stringify(await ev(() => { const R = __sw, P = R.P; return { hasP: !!P, visible: P && P.root.visible, tilt: P && +P.root.rotation.x.toFixed(2), order: P && P.root.rotation.order, yRel: P && +(P.root.position.y - SL).toFixed(2), ring: !!(R.swRing && R.swRing.visible), lo: R.lo && R.lo.visible } })));
  console.log(await h.shot('coop_swimmer', 4000));
  await ev(() => { clearInterval(__swI); __sw.st = Object.assign({}, __sw.st, { sw: undefined, y: player.y, x: player.x + 4, z: player.z, s: 0 }); delete __sw.st.sw; __swI = setInterval(() => __feed(__sw, {}), 110) }); await h.wait(2000);
  console.log('swimmer got out', JSON.stringify(await ev(() => { const P = __sw.P; return { order: P.root.rotation.order, tilt: +P.root.rotation.x.toFixed(2), ring: !!(__sw.swRing && __sw.swRing.visible) } })));
  await ev(() => { clearInterval(__swI); COOP.peers.delete('n:swimmer'); COOP.drop(__sw) });
  // ---- 2) a friend's PARKED light plane + the friend walking beside it, 3) the same plane flown with the pilot inside
  await ev(() => { const p = PLACES.find(q => q.id === 'arcadia'); teleportRaw(p.x + 40, p.z, p.yaw) }); await h.wait(3500);
  await ev(() => { const g = groundH(player.x + 12, player.z); window.__pl = [player.x + 12, g + .66, player.z, 0.6, 0, 0, 0, 0, 0]; window.__pr = window.__mk('n:pilot', { m: 'walk', x: player.x + 6, y: player.y, z: player.z, r: 0, pl: __pl.slice(), ts: performance.now() }); window.__plI = setInterval(() => __feed(__pr, { pl: __pl.slice() }), 110) });
  await h.wait(5000);   // the model has to load on this client first
  console.log('parked plane', JSON.stringify(await ev(() => { const R = __pr; const pp = R.plane && R.plane.root.position; return { modelLoaded: !!PM.light, plane: !!R.plane, at: pp && [Math.round(pp.x), Math.round(pp.z)], want: [Math.round(__pl[0]), Math.round(__pl[2])], visible: R.plane && R.plane.root.visible, walkerVisible: R.P && R.P.root.visible } })));
  console.log(await h.shot('coop_plane_parked', 4000));
  await ev(() => { __pl[8] = 1; __pl[7] = 1; __pl[6] = .8; __pr.st = Object.assign({}, __pr.st, { m: 'sit' }) }); await h.wait(2500);
  const pil = await ev(() => { const R = __pr; const q = R.plane; q.root.updateMatrixWorld(true); const pw = new THREE.Vector3(); R.P.root.getWorldPosition(pw); const loc = q.root.worldToLocal(pw.clone()); return { pilotLocal: loc.toArray().map(x => +x.toFixed(2)), wantSeat: q.seat.toArray(), pilotVisible: R.P.root.visible, propsSpin: q.parts.fans[0].rotation.z !== 0, disc: q.parts.discs[0].visible } });
  console.log('piloted', JSON.stringify(pil));
  // move the plane: it must follow smoothly and the pilot with it
  await ev(() => { __pl[0] += 30; __pl[1] += 8; __pl[3] = .7; __pl[4] = .1 }); await h.wait(2500);
  console.log('moved', JSON.stringify(await ev(() => { const R = __pr; const pp = R.plane.root.position; R.plane.root.updateMatrixWorld(true); const pw = new THREE.Vector3(); R.P.root.getWorldPosition(pw); return { planeX: Math.round(pp.x), wantX: Math.round(__pl[0]), pilotDistToSeat: +R.plane.root.localToWorld(R.plane.seat.clone()).distanceTo(pw).toFixed(3) } })));
  console.log(await h.shot('coop_plane_flying', 4000));
  await ev(() => { __pl[8] = 0; __pl[7] = 0; __pr.st = Object.assign({}, __pr.st, { m: 'walk', x: player.x + 5, y: player.y, z: player.z }); }); await h.wait(2500);
  console.log('pilot got out', JSON.stringify(await ev(() => { const R = __pr; return { walking: R.P.root.visible, rotX: +R.P.root.rotation.x.toFixed(2), wasPlane: !!R.wasPlane, planeStill: !!R.plane } })));
  await ev(() => { clearInterval(__plI); delete __pr.st.pl; __pr.st = Object.assign({}, __pr.st); delete __pr.st.pl }); await h.wait(1500);
  console.log('plane removed when the friend no longer has one', await ev(() => !__pr.plane));
};
