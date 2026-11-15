// What the GPU REALLY holds: the WebGL calls themselves are counted (texImage2D / texStorage2D / bufferData / renderbufferStorage and the deletes), so this is what was uploaded,
// not what the scene graph could upload one day (t_mem). It draws real frames at each stop of a tour (home, city centre, airport, cruise ship, launch pad, space, back home)
// and prints the totals; the last line compares "home again" with the first "home": what a trip leaves behind for ever. Run with IPAD=1. Env: Q=high|mid|low, SECS=<s per stop>, TOP=<rows>.
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const Q = process.env.Q || 'high', SECS = +(process.env.SECS || 8), TOP = +(process.env.TOP || 12);
  await page.addInitScript(() => {
    const G = window.__gpu = { tex: new Map(), buf: new Map(), rb: new Map(), peak: 0, lost: 0, cv: [] };
    // every 2D canvas the page makes, with the line that made it: on iOS their pixels count against the tab's memory (and Safari's canvas budget) for as long as they live
    const mk = Document.prototype.createElement; Document.prototype.createElement = function (t, ...a) { const e = mk.call(this, t, ...a); if (String(t).toLowerCase() === 'canvas') { const st = (new Error().stack || '').split('\n').slice(2, 6).map(l => (/([\w.]+\.(?:js|html)):(\d+)/.exec(l) || [])[0]).filter(Boolean); G.cv.push([new WeakRef(e), st.slice(0, 3).join(' < ') || '?']) } return e };
    const bpp = (f) => { const s = String(f); return /16F|RGBA16/.test(s) ? 8 : /32F/.test(s) ? 16 : 4 };
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      const gl = orig.call(this, type, ...a); if (!gl || !/webgl/.test(type) || gl.__hooked) return gl; gl.__hooked = 1;
      this.addEventListener('webglcontextlost', () => G.lost++);
      const names = {}; for (const k in gl) if (typeof gl[k] === 'number' && /^[A-Z0-9_]+$/.test(k)) names[gl[k]] = k;
      const cur = {}, curB = {}; let curR = null;
      const key = (t) => t === gl.TEXTURE_2D ? '2d' : t === gl.TEXTURE_3D ? '3d' : t === gl.TEXTURE_2D_ARRAY ? 'arr' : 'cube';
      const wrap = (n, f) => { const o = gl[n]; if (!o) return; gl[n] = function (...x) { try { f(...x) } catch (e) { } return o.apply(gl, x) } };
      const total = () => { let t = 0; for (const v of G.tex.values()) t += v.b; for (const v of G.buf.values()) t += v; for (const v of G.rb.values()) t += v; if (t > G.peak) G.peak = t };
      wrap('bindTexture', (t, o) => { cur[key(t)] = o });
      const level = (t, lv, w, hh, d, f) => { const o = cur[key(t)]; if (!o) return; const r = G.tex.get(o) || { b: 0, w: 0, h: 0, lv: {}, mip: 0 }; const face = key(t) === 'cube' ? t + ':' : ''; r.lv[face + lv] = w * hh * (d || 1) * bpp(names[f] || f); if (lv === 0) { r.w = w; r.h = hh } r.b = Object.values(r.lv).reduce((p, q) => p + q, 0) * (r.mip ? 1.333 : 1); G.tex.set(o, r); total() };
      wrap('texImage2D', (t, lv, f, a3, a4, a5, a6, a7, a8) => { if (a6 === undefined) { const s = a5; level(t, lv, (s && (s.videoWidth || s.width)) || 0, (s && (s.videoHeight || s.height)) || 0, 1, f) } else level(t, lv, a3, a4, 1, f) });
      wrap('texStorage2D', (t, n, f, w, hh) => { for (let i = 0; i < n; i++)level(t, i, Math.max(1, w >> i), Math.max(1, hh >> i), 1, f) });
      wrap('texImage3D', (t, lv, f, w, hh, d) => level(t, lv, w, hh, d, f));
      wrap('texStorage3D', (t, n, f, w, hh, d) => { for (let i = 0; i < n; i++)level(t, i, Math.max(1, w >> i), Math.max(1, hh >> i), d, f) });
      wrap('compressedTexImage2D', (t, lv, f, w, hh, b, data) => { const o = cur[key(t)]; if (!o) return; const r = G.tex.get(o) || { b: 0, w, h: hh, lv: {}, mip: 0 }; r.lv[lv] = (data && data.byteLength) || w * hh; r.b = Object.values(r.lv).reduce((p, q) => p + q, 0); G.tex.set(o, r); total() });
      wrap('generateMipmap', (t) => { const r = G.tex.get(cur[key(t)]); if (r && !r.mip) { r.mip = 1; r.b *= 1.333; total() } });
      wrap('deleteTexture', (o) => { G.tex.delete(o) });
      wrap('bindBuffer', (t, o) => { curB[t] = o });
      wrap('bufferData', (t, d) => { const o = curB[t]; if (!o) return; G.buf.set(o, typeof d === 'number' ? d : (d && d.byteLength) || 0); total() });
      wrap('deleteBuffer', (o) => { G.buf.delete(o) });
      wrap('bindRenderbuffer', (t, o) => { curR = o });
      wrap('renderbufferStorage', (t, f, w, hh) => { if (curR) { G.rb.set(curR, w * hh * 4); total() } });
      wrap('renderbufferStorageMultisample', (t, s, f, w, hh) => { if (curR) { G.rb.set(curR, w * hh * 4 * Math.max(1, s)); total() } });
      wrap('deleteRenderbuffer', (o) => { G.rb.delete(o) });
      return gl;
    };
  });
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(q => { S.q = q; applyQuality(); }, Q);
  const TTL = +(process.env.TTL || 6); await ev(t => { if (typeof GPUDIET !== 'undefined') GPUDIET.ttl = t }, TTL);   // gpudiet.js releases what has been hidden / out of range for TTL seconds (40 on a tablet; short here so the test does not take an hour)
  const settle = async () => { for (let i = 0, same = 0, last = -1; i < 90 && same < 3; i++) { await h.wait(1000); const n = await ev(() => CHUNK_JOB ? -1 : chunks.size); same = n >= 0 && n === last ? same + 1 : 0; last = n; } };
  const report = async (label) => {
    await settle(); await h.wait(SECS * 1000); await ev(() => { if (typeof gc === 'function') gc() });   // EXTRA=--js-flags=--expose-gc: canvases nobody holds are not counted
    const R = await ev((TOP) => {
      const G = window.__gpu, MB = x => +(x / 1048576).toFixed(1); let tb = 0, bb = 0, rb = 0; for (const v of G.tex.values()) tb += v.b; for (const v of G.buf.values()) bb += v; for (const v of G.rb.values()) rb += v;
      // name the uploaded textures through three's own table (texture -> WebGLTexture)
      const who = new Map(), seen = new Set(); let cur = '';
      const add = (t, n) => { if (!t || !t.isTexture || seen.has(t)) return; seen.add(t); const p = renderer.properties.get(t); if (p && p.__webglTexture) who.set(p.__webglTexture, n + ' @' + cur) };
      const walk = (root) => root.traverse(o => { const a = []; for (let p = o; p && !p.isScene; p = p.parent) a.push(p.name || p.type); cur = a.slice(0, 3).join('<'); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) { for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'bumpMap', 'aoMap', 'envMap']) add(m[k], (m.name || o.name || o.type) + '.' + k); if (m.uniforms) for (const u in m.uniforms) { const v = m.uniforms[u].value; if (v && v.isTexture) add(v, 'shader.' + u) } } });
      walk(scene); try { if (typeof SPC !== 'undefined' && SPC.scene) walk(SPC.scene) } catch (e) { }
      const rows = [...G.tex.entries()].sort((a, b) => b[1].b - a[1].b), by = {}; let orphan = 0, orphanN = 0;
      for (const [o, r] of rows) { const k = r.w >= 2048 || r.h >= 2048 ? '>=2048' : r.w >= 1024 || r.h >= 1024 ? '1024' : r.w >= 512 || r.h >= 512 ? '512' : '<=256'; by[k] = by[k] || { n: 0, mb: 0 }; by[k].n++; by[k].mb += r.b / 1048576; if (!who.has(o)) { orphan += r.b; orphanN++ } }
      for (const k in by) by[k].mb = +by[k].mb.toFixed(1);
      const cvBy = {}; let cvN = 0, cvB = 0; for (const [w, site] of G.cv) { const c = w.deref(); if (!c || c === renderer.domElement) continue; const b = c.width * c.height * 4; if (!b) continue; cvN++; cvB += b; const r = cvBy[site] = cvBy[site] || [0, 0]; r[0] += b; r[1]++ }
      const cvTop = Object.entries(cvBy).sort((a, b) => b[1][0] - a[1][0]).slice(0, TOP).map(([k, v]) => (v[0] / 1048576).toFixed(1) + ' MB x' + v[1] + ' ' + k);
      return { canvasN: cvN, canvasMB: MB(cvB), cvTop, texN: G.tex.size, texMB: MB(tb), bufN: G.buf.size, bufMB: MB(bb), rbMB: MB(rb), totalMB: MB(tb + bb + rb), peakMB: MB(G.peak), lost: G.lost, notInScene: orphanN + ' / ' + MB(orphan) + ' MB', by, three: { tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries }, pr: renderer.getPixelRatio(),
        top: rows.slice(0, TOP).map(([o, r]) => (r.b / 1048576).toFixed(1) + ' MB ' + r.w + 'x' + r.h + (r.mip ? ' mip ' : ' ') + (who.get(o) || '(not in the scene now)')) };
    }, TOP);
    console.log('=== ' + label + ' ' + JSON.stringify({ ...R, top: undefined, cvTop: undefined })); if (TOP) { console.log('  ' + R.top.join('\n  ')); console.log('  2D canvases alive (CPU pixels), by the line that made them:\n  ' + R.cvTop.join('\n  ')) }
    return R;
  };
  const go = (id) => ev((id) => { const p = PLACES.find(q => q.id === id); if (!p) return false; teleportRaw(p.x, p.z, p.yaw || 0, 0); return true }, id);
  console.log('quality', Q, 'MOBILE', await ev(() => MOBILE), 'places', (await ev(() => PLACES.map(p => p.id))).join(' '));
  const R0 = await report('home yard');
  const stops = (process.env.STOPS || 'opera,airport,cruise,jungle').split(',').filter(Boolean);
  for (const id of stops) { if (await go(id)) await report(id); else console.log('no place', id) }
  if (!process.env.NOSPACE && await ev(() => typeof SPC !== 'undefined')) {
    await ev(() => SPC.goPad()); await report('launch pad');
    await ev(() => SPC.launch()); await page.waitForFunction(() => SPC.A && SPC.A.m, null, { timeout: 90000 }); await ev(() => { SPC.A.t = 89.5 });
    await page.waitForFunction(() => SPC.space && SPC.mode === 'interior', null, { timeout: 120000 }); await report('space (inside the station)');
    await ev(() => { const e = SPC.IN.pod.userData.exit; SPC.IN.x = e.x; SPC.IN.z = e.z }); await h.wait(800); await ev(() => SPC.act()); await h.wait(1500); await report('space (spacewalk: Earth, Moon, ISS)');
    await ev(() => SPC.leave()); await h.wait(3000);
  }
  await ev(() => teleportRaw(3, 14, 0, 0)); await h.wait(TTL * 2500); const R1 = await report('home yard again');
  console.log('gpudiet', JSON.stringify(await ev(() => typeof GPUDIET !== 'undefined' ? GPUDIET.stat : null)));
  console.log('2D canvases: ' + R0.canvasN + ' / ' + R0.canvasMB + ' MB at the start, ' + R1.canvasN + ' / ' + R1.canvasMB + ' MB after the tour');
  console.log('LEFT BEHIND by the tour: textures ' + (R1.texN - R0.texN) + ' (' + (R1.texMB - R0.texMB).toFixed(1) + ' MB), buffers ' + (R1.bufN - R0.bufN) + ' (' + (R1.bufMB - R0.bufMB).toFixed(1) + ' MB), peak ' + R1.peakMB + ' MB, context lost ' + R1.lost);
};
