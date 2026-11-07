exports.opts = { w: 480, h: 300 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start(); await h.noRender();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { COOP.online = () => true; COOP.myId = 'n:me'; window.__mk = (id, st) => { const R = { peer: id, st: null, P: null, tag: null, tagName: '', bub: null, bubT: 0, sayT: 0, x: 0, y: 0, z: 0, yaw: 0, has: false, outfit: -1 }; R.st = Object.assign({ v: 1, in: 1, n: 'Friend', ch: CHAR.cur, x: player.x + 6, y: player.y, z: player.z, r: 0, m: 'walk', s: 0, zn: '' }, st); COOP.peers.set(id, R); return R }; });
  // ---- (a) car model + colour sync, (b) realistic body for a friend
  const a = await ev(async () => {
    const R = window.__mk('n:drv', { m: 'car', ct: [2, 0x1f3f73] }); await new Promise(r => setTimeout(r, 1200));
    const L = COOP.carList(); const R2 = window.__mk('n:walker', { m: 'walk', x: player.x - 6 });
    await new Promise(r => setTimeout(r, 3500));
    return { cars: L.map(c => [c.type, c.col.toString(16)]), myCode: CHAR.cur.slice(), real17: CHAR.cur[17], optsReal: CHAR.opts(CHAR.cur).real, peerReal: !!(R2.P && (R2.P.real || R2.P.realOff === false)), peerRealKeys: R2.P ? Object.keys(R2.P).filter(k => /real/i.test(k)) : null, realReady: REAL.ready(), ownReal: !!(PLR.real) };
  });
  console.log('sync', JSON.stringify(a));
  // ---- (c) smoothness of a driven car seen through packets at ~15 Hz with jitter and a stall
  const sm = await ev(async () => {
    COOP.peers.clear(); const R = window.__mk('n:drv2', { m: 'car', ct: [4, 0xc0262d] }); const px = player.x + 10, pz = player.z + 10; const V = 20; // 20 m/s along +z
    const t0 = performance.now(); const trueZ = t => pz + V * (t / 1000);
    const pk = []; let tt = 0; while (tt < 9000) { tt += 66 + (Math.random() - .5) * 60; pk.push(tt) } // arrival times (jittered), plus one 500 ms stall near 4 s
    const stall = pk.findIndex(t => t > 4000); for (let i = stall; i < stall + 4 && i < pk.length; i++) pk[i] += 0; // keep simple: a burst after a stall
    let i = 0; const samples = []; const old = { z: null, last: -1 }; let lastT = performance.now(), oldZ = null, oldTarget = null; const oldS = [];
    await new Promise(res => { const iv = setInterval(() => { const now = performance.now(), t = now - t0; while (i < pk.length && pk[i] <= t && !(pk[i] > 4000 && pk[i] < 4500)) { R.st = { v: 1, in: 1, n: 'F', x: px, y: player.y, z: trueZ(pk[i]), r: 0, m: 'car', s: V, zn: '' }; oldTarget = R.st.z; i++ }
        if (t > 4500 && i < pk.length && pk[i] > 4000 && pk[i] < 4500) { while (i < pk.length && pk[i] < 4500) i++ }
        const dt = Math.min(.05, (now - lastT) / 1000); lastT = now; COOP.advance(dt);
        // the old behaviour for comparison: exponential smoothing toward the newest packet
        if (oldTarget !== null) { const k = 1 - Math.exp(-dt * 12); oldZ = oldZ === null ? oldTarget : oldZ + (oldTarget - oldZ) * k }
        samples.push([t, R.z, oldZ, dt]); if (t > 9000) { clearInterval(iv); res() } }, 16) });
    const speeds = (idx) => { const o = []; for (let j = 1; j < samples.length; j++) { const a = samples[j - 1], b = samples[j]; if (a[idx] === null || b[idx] === null || b[3] <= 0) continue; if (b[0] < 1500) continue; o.push((b[idx] - a[idx]) / b[3]) } return o };
    const st = (arr) => { const m = arr.reduce((s, v) => s + v, 0) / arr.length, sd = Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length); return { mean: +m.toFixed(1), sd: +sd.toFixed(2), min: +Math.min(...arr).toFixed(1), max: +Math.max(...arr).toFixed(1) } };
    return { n: samples.length, newSpeed: st(speeds(1)), oldSpeed: st(speeds(2)) };
  });
  console.log('smoothness (speed of the car as seen, true = 20 m/s)', JSON.stringify(sm));
  // ---- (d) seat choice in a friend's car
  const sc = await ev(() => { COOP.peers.clear(); const R = window.__mk('n:car3', { m: 'car', ct: [4, 0xc0262d] }); R.x = player.x + 3; R.y = player.y; R.z = player.z; R.yaw = 0; R.has = true;
    const r = {}; for (const [name, dx, dz] of [['stand at the right front', -.6, .3], ['stand at the left rear', .6, -.8], ['stand at the right rear', -.6, -.8]]) { player.x = R.x + dx; player.z = R.z + dz; r[name] = passSeatFor(R) }
    // another friend already in seat 1: I must get a different seat
    const O = window.__mk('n:other', { m: 'pass', pp: 'n:car3', pi: 1 }); player.x = R.x - .6; player.z = R.z + .3; r.takenFront = passSeatFor(R); const O2 = window.__mk('n:o2', { m: 'pass', pp: 'n:car3', pi: 2 }), O3 = window.__mk('n:o3', { m: 'pass', pp: 'n:car3', pi: 3 }); r.full = passSeatFor(R); return r });
  console.log('seat choice', JSON.stringify(sc));
};
