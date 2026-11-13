// What is audible when nothing is happening: RMS and the strongest frequencies at the master output, with the ambience / sfx / music buses muted one by one, on foot at home. A steady tone above ~-60 dB
// (RMS 0.001) while standing still is the "buzz". Also the same with the weather on (snow / rain) and in a vehicle at rest. (Headless Chromium runs the Web Audio graph without a sound card.)
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a); await h.noRender(); await h.wait(4000);
  await ev(() => { AUD.start(); AUD.ctx.resume(); const an = AUD.ctx.createAnalyser(); an.fftSize = 4096; AUD.master.connect(an); window.__an = an; window.__meas = async (ms) => { const a = window.__an, n = a.fftSize, buf = new Float32Array(n), fq = new Float32Array(a.frequencyBinCount); let sum = 0, cnt = 0, acc = new Float64Array(a.frequencyBinCount), k = 0; const t0 = performance.now();
    while (performance.now() - t0 < ms) { await new Promise(r => setTimeout(r, 100)); a.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; cnt++ } a.getFloatFrequencyData(fq); for (let i = 0; i < fq.length; i++) acc[i] += Math.pow(10, fq[i] / 10); k++ }
    const sr = AUD.ctx.sampleRate, db = Array.from(acc, v => 10 * Math.log10(v / k + 1e-20)), tones = [];   // averaged power spectrum; a tonal peak stands >12 dB above the bins 6-12 away on both sides
    for (let i = 14; i < db.length - 14; i++) { const l = Math.max(db[i - 12], db[i - 6]), r = Math.max(db[i + 12], db[i + 6]); if (db[i] > -95 && db[i] > l + 12 && db[i] > r + 12 && db[i] >= db[i - 1] && db[i] >= db[i + 1]) tones.push([Math.round(i * sr / n), +db[i].toFixed(0)]) }
    tones.sort((x, y) => y[1] - x[1]); return { rms: +Math.sqrt(sum / cnt).toExponential(2), steadyTones: tones.slice(0, 5).map(t => t[0] + 'Hz ' + t[1] + 'dB') } } });
  const log = async (name) => console.log(name.padEnd(34), JSON.stringify(await ev(async () => await window.__meas(5000))));
  console.log('ctx', await ev(() => ({ state: AUD.ctx.state, ok: AUD.ok, time: AUD.time, season: S.season, weather: S.weather })));
  await log('on foot, everything on');
  for (const bus of ['amb', 'sfx', 'mus']) { await ev(b => { AUD['__g_' + b] = AUD[b].gain.value; AUD[b].gain.value = 0 }, bus); await log('  ' + bus + ' muted') }
  for (const bus of ['amb', 'sfx', 'mus']) await ev(b => { AUD[b].gain.value = AUD['__g_' + b] }, bus);
  await ev(() => { S.weather = 'snow'; GFX && GFX.setWeather && GFX.setWeather('snow') }); await h.wait(2500); await log('snow weather');
  await ev(() => { GFX && GFX.setWeather && GFX.setWeather('rain') }); await h.wait(2500); await log('rain weather');
  await ev(() => { GFX && GFX.setWeather && GFX.setWeather('clear') });
  await ev(() => { const v = EXT.veh.find(q => q.kind === 'gtr'); v.x = player.x + 4; v.z = player.z; v.halt(); v.sync(); EXT.enter(v) }); await h.wait(2000); await log('in a car, standing');
  await ev(() => { inp.k.KeyW = true }); await h.wait(4000); await log('in a car, driving');
  await ev(() => { inp.k.KeyW = false });
  await ev(() => { EXT.leave(EXT.cur) }); await h.wait(500);
  await ev(() => document.getElementById('bBRm').click()); await h.wait(1500); await ev(() => { const g = document.getElementById('crGo'); if (g) g.click() }).catch(() => {});
  await page.waitForFunction(() => typeof BR !== 'undefined' && BR.on, null, { timeout: 90000 }); await h.wait(3000); await log('Battle Royale, on the bus');
  await ev(() => { BR.t0 = 0; inp.jump = true }); await h.wait(2500); await log('Battle Royale, free fall');
};
