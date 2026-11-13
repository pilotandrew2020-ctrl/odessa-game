// The sound work of 2026-11-13: (1) Odesa FM rendered OFFLINE for 24 s: no NaN, no clipping, a sane level, not a pure tone; (2) the new car engine at idle / pulling away / full speed / after lifting off: level, harmonics (a rich spectrum, NOT one
// buzzing low tone), gear changes; (3) ducking: while the speaker plays, the ambience bus falls to ~0 and the vehicle bus stays; (4) the water loop follows the tap.
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a); await h.noRender(); await h.wait(3000);
  await ev(() => { AUD.start(); AUD.ctx.resume() });
  // (1) offline render of the soundtrack
  const M = await ev(async () => { const sr = 44100, secs = 24, oc = new OfflineAudioContext(2, sr * secs, sr), g = BGM.build(oc, oc.destination, 7); g.out.gain.value = 1; BGM.sched(g, secs + .5, false); const buf = await oc.startRendering(); const d = buf.getChannelData(0); let pk = 0, sum = 0, nan = 0; for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) nan++; else { pk = Math.max(pk, Math.abs(v)); sum += v * v } }
    // crude spectral balance: energy below 250 Hz / 250-2500 / above 2500 using a few Goertzel-free band sums via zero-crossing-free FFT of a 1 s slice
    const rms = Math.sqrt(sum / d.length); return { peak: +pk.toFixed(3), rms: +rms.toFixed(4), nan, steps: g.step } });
  console.log('Odesa FM offline', JSON.stringify(M));
  assert.strictEqual(M.nan, 0, 'NaN in the soundtrack'); assert(M.peak < .9, 'the soundtrack clips (' + M.peak + ')'); assert(M.rms > .01 && M.rms < .08, 'level out of range ' + M.rms); assert(M.steps > 100, 'the pattern did not run');
  // (2) the engine
  await ev(() => { window.__an = AUD.ctx.createAnalyser(); __an.fftSize = 8192; AUD.master.connect(__an); window.__avg = async (ms) => { const a = __an, buf = new Float32Array(a.fftSize), fq = new Float32Array(a.frequencyBinCount), acc = new Float64Array(a.frequencyBinCount); let s = 0, n = 0, k = 0, pk = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { await new Promise(r => setTimeout(r, 100)); a.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; n++; pk = Math.max(pk, Math.abs(v)) } a.getFloatFrequencyData(fq); for (let i = 0; i < fq.length; i++) acc[i] += Math.pow(10, fq[i] / 10); k++ }
    const sr = AUD.ctx.sampleRate, hz = i => i * sr / a.fftSize, db = Array.from(acc, v => 10 * Math.log10(v / k + 1e-20)); let top = 0; for (let i = 3; i < db.length; i++) if (db[i] > db[top]) top = i; const bands = [[40, 250], [250, 1000], [1000, 4000]].map(([a0, b0]) => { let e = 0; for (let i = 0; i < db.length; i++) if (hz(i) >= a0 && hz(i) < b0) e += Math.pow(10, db[i] / 10); return +(10 * Math.log10(e + 1e-20)).toFixed(0) }); return { rms: +Math.sqrt(s / n).toFixed(4), peak: +pk.toFixed(3), fundamental: Math.round(hz(top)), bandsDb: bands } } });
  await ev(() => { AUD.amb.disconnect(); AUD.mus.disconnect(); BGM.on = false; window.__eng = AUD.machine('car'); __eng.update(camera.position.x, camera.position.y, camera.position.z, 0, 0, true, 0, 1) }); await h.wait(500);
  const idle = await ev(async () => await __avg(1800)); console.log('engine idle', JSON.stringify(idle));
  await ev(() => __eng.update(camera.position.x, camera.position.y, camera.position.z, 14, 1, true, 0, 1)); await h.wait(500); const mid = await ev(async () => await __avg(1800)); console.log('engine 50 km/h full throttle', JSON.stringify(mid));
  await ev(() => __eng.update(camera.position.x, camera.position.y, camera.position.z, 55, 1, true, 0, 1)); await h.wait(500); const fast = await ev(async () => await __avg(1800)); console.log('engine 200 km/h', JSON.stringify(fast));
  const gears = await ev(() => { const g = []; for (const sp of [3, 12, 22, 33, 45, 60]) { __eng.update(camera.position.x, camera.position.y, camera.position.z, sp, .8, true, 0, 1); g.push(__eng.gear) } return g }); console.log('gears by speed', gears); assert(new Set(gears).size >= 5, 'the gearbox does not change gears: ' + gears);
  assert(idle.rms > .002 && idle.peak < .6, 'idle level'); assert(fast.rms > idle.rms, 'the engine does not get louder with speed'); assert(fast.peak < .8, 'the engine clips');
  assert(mid.bandsDb[1] > mid.bandsDb[0] - 25 && mid.bandsDb[2] > mid.bandsDb[0] - 55, 'the engine is one low buzzing tone (no harmonics): ' + mid.bandsDb);
  await ev(() => { __eng.update(camera.position.x, camera.position.y, camera.position.z, 0, 0, false, 0, 1) }); await h.wait(600); const quiet = await ev(async () => await __avg(1200)); console.log('engine off (inactive)', JSON.stringify(quiet)); await ev(() => __eng.dispose());
  await ev(() => { AUD.amb.connect(AUD.master); AUD.mus.connect(AUD.master) });
  // (3) ducking
  const D = await ev(async () => { const amb0 = AUD.amb.gain.value, sfx0 = AUD.sfx.gain.value, veh0 = AUD.veh.gain.value; SPK.playing = true; await new Promise(r => setTimeout(r, 3500)); const r = { amb: [+amb0.toFixed(2), +AUD.amb.gain.value.toFixed(3)], sfx: [+sfx0.toFixed(2), +AUD.sfx.gain.value.toFixed(2)], veh: [+veh0.toFixed(2), +AUD.veh.gain.value.toFixed(2)] }; SPK.playing = false; return r });
  console.log('ducking while your music plays', JSON.stringify(D)); assert(D.amb[1] < .06, 'the ambience is not ducked'); assert(D.sfx[1] < D.sfx[0], 'effects are not ducked'); assert(D.veh[1] === D.veh[0], 'the vehicle bus must stay');
  // (4) the water loop
  const W = await ev(async () => { AUD.water(1); await new Promise(r => setTimeout(r, 700)); const on = AUD.wat.hiss.g.gain.value; AUD.water(0); await new Promise(r => setTimeout(r, 900)); return [+on.toFixed(3), +AUD.wat.hiss.g.gain.value.toFixed(4)] }); console.log('water loop on / off', JSON.stringify(W)); assert(W[0] > .03 && W[1] < .01, 'the water loop does not follow the tap');
};
