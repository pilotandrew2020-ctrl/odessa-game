exports.opts = { w: 800, h: 480 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { COOP.online = () => true; COOP.myId = 'n:me'; window.__mk = (id, st) => { const R = { peer: id, st: null, P: null, tag: null, tagName: '', bub: null, bubT: 0, sayT: 0, x: 0, y: 0, z: 0, yaw: 0, has: false, outfit: -1 }; R.st = Object.assign({ v: 1, in: 1, n: 'Friend', ch: CHAR.cur, x: player.x + 6, y: player.y, z: player.z, r: 0, m: 'walk', s: 0, zn: '' }, st); COOP.peers.set(id, R); return R };
    const hx = player.x + 3, hy = player.y + 6, hz = player.z + 12; window.__H = { hx, hy, hz }; const R = window.__mk('n:pilot', { m: 'heli', x: hx, y: hy, z: hz, r: 0.6, h: [0, 0, .62], ts: performance.now() }); window.__R = R;
    window.__iv = setInterval(() => { R.st = Object.assign({}, R.st, { ts: performance.now() }) }, 110) });
  await h.wait(3500);
  const a = await ev(() => { const R = window.__R, H = R.heli; if (!H) return { err: 'no PeerHeli', peers: COOP.peers.size, same: COOP.peers.get('n:pilot') === R, hasP: !!R.P, st: R.st && { m: R.st.m, in: R.st.in, zn: R.st.zn, x: R.st.x }, zone: COOP.zone(), online: COOP.online() }; const cnt = {}; H.model.traverse(o => { if (/rotor/i.test(o.name || '')) cnt[o.name] = (cnt[o.name] || 0) + 1 });
    H.root.updateMatrixWorld(true); const pw = new THREE.Vector3(); R.P.root.getWorldPosition(pw); const loc = H.root.worldToLocal(pw.clone());
    return { rotorNames: cnt, mainFound: !!H.main, tailFound: !!H.tail, pilotVisible: R.P.root.visible, pilotLocal: loc.toArray().map(x => +x.toFixed(2)), wantPilot: WH_PILOT.toArray(), heliPos: H.root.position.toArray().map(x => +x.toFixed(1)), expected: [window.__H.hx, window.__H.hy, window.__H.hz].map(x => +x.toFixed(1)), mainSpin: H.main && +H.main.rotation.y.toFixed(1) } });
  console.log('peer heli', JSON.stringify(a));
  // board as passenger
  const b = await ev(async () => { player.x = window.__H.hx + 2; player.z = window.__H.hz; player.y = window.__H.hy - 5.5; const R = window.__R; const free = PASS.free(); const fs = PASS.freeSeat(R); const near = PASS.find(); PASS.board(R); await new Promise(r => setTimeout(r, 2500)); const H = R.heli; H.root.updateMatrixWorld(true); const pw = new THREE.Vector3(); PLR.root.getWorldPosition(pw); const loc = H.root.worldToLocal(pw.clone()); return { free, freeSeat: fs, foundNearby: !!near, host: PASS.host, idx: PASS.idx, myLocal: loc.toArray().map(x => +x.toFixed(2)), wantSeat: WH_SEAT.toArray(), plrVisible: PLR.root.visible } });
  console.log('passenger', JSON.stringify(b));
  // screenshots: 3/4 from the side showing both crew
  await ev(() => { const H = window.__R.heli, c = H.root.position, y = H.root.rotation.y; const f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; window.DBGCAM = [c.x + l[0] * 6.5 + f[0] * 5.5, c.y + 2.6, c.z + l[1] * 6.5 + f[1] * 5.5, c.x + f[0] * 1.8, c.y + .2, c.z + f[1] * 1.8]; });
  console.log(await h.shot('heli_peer_cockpit', 5000));
  await ev(() => { const H = window.__R.heli, c = H.root.position, y = H.root.rotation.y; const f = [Math.sin(y), Math.cos(y)], l = [Math.cos(y), -Math.sin(y)]; window.DBGCAM = [c.x - l[0] * 14 - f[0] * 10, c.y + 3, c.z - l[1] * 14 - f[1] * 10, c.x, c.y, c.z]; });
  console.log(await h.shot('heli_peer_far', 5000));
  await ev(() => { PASS.free && 0; });
};
