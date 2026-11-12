// GPU memory estimate of what the scene holds right now (textures with mip chain, geometry buffers, shadow map, drawing buffer), at the home yard and after a drive.
// The estimate walks the scene graph: textures by pixel size (x4 bytes, x1.33 for mips), geometry attributes by byte length. It is not what iOS reports, but it ranks
// the biggest items, which is what decides what to shrink. Run with IPAD=1 for the phone/tablet caps. Env: Q=high|mid|low, TOP=<rows to print>.
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const Q = process.env.Q || 'high', TOP = +(process.env.TOP || 14);
  await h.boot();
  await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(q => { S.q = q; applyQuality(); }, Q);
  await h.noRender();
  const report = async (label) => {
    const R = await ev(() => {
      const MB = x => +(x / 1048576).toFixed(1), seenT = new Set(), seenG = new Set(), tex = [], geo = [];
      let cur = ''; const path = o => { const a = []; for (let p = o; p && p !== scene; p = p.parent) a.push(p.name || p.type); return a.slice(0, 4).join('<') };
      const addTex = (t, who) => { if (!t || !t.isTexture || seenT.has(t)) return; seenT.add(t); if (t.image && t.image.depth !== undefined && t.image.data === undefined) return;
        const im = t.image, w = (im && (im.width || im.videoWidth)) || (t.isDataTexture ? im.width : 0), hh = (im && (im.height || im.videoHeight)) || 0; if (!w) return;
        const mip = t.generateMipmaps && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter ? 1.34 : 1; tex.push({ who: who + ' @' + cur + ' [' + (im && im.constructor && im.constructor.name) + (t.generateMipmaps && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter ? ' mip' : ' nomip') + (t.isCompressedTexture ? ' compressed' : '') + (t.anisotropy > 1 ? ' aniso' + t.anisotropy : '') + ']', w, h: hh, mb: (w * hh * 4 * mip) / 1048576, name: t.name || '' }) };
      scene.traverse(o => { cur = path(o); if (o.geometry && !seenG.has(o.geometry)) { seenG.add(o.geometry); let b = 0; const g = o.geometry; for (const k in g.attributes) { const a = g.attributes[k]; b += (a.array ? a.array.byteLength : 0) } if (g.index && g.index.array) b += g.index.array.byteLength; geo.push({ who: (o.name || o.type) + ' @' + cur + (o.isInstancedMesh ? ' inst' + o.count : ''), mb: b / 1048576, tris: (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 }) }
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) { for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'bumpMap', 'aoMap', 'envMap']) addTex(m[k], (m.name || o.name || o.type) + '.' + k); if (m.uniforms) for (const u in m.uniforms) { const v = m.uniforms[u].value; if (v && v.isTexture) addTex(v, (m.name || o.name || 'shader') + '.' + u) } } });
      tex.sort((a, b) => b.mb - a.mb); const bySize = {}; for (const t of tex) { const k = (t.w >= 2048 || t.h >= 2048 ? '>=2048' : t.w >= 1024 || t.h >= 1024 ? '1024' : t.w >= 512 || t.h >= 512 ? '512' : '<=256'); bySize[k] = bySize[k] || { n: 0, mb: 0 }; bySize[k].n++; bySize[k].mb += t.mb } for (const k in bySize) bySize[k].mb = +bySize[k].mb.toFixed(1); const tT = tex.reduce((a, b) => a + b.mb, 0), gT = geo.reduce((a, b) => a + b.mb, 0), q = Qp(), pr = renderer.getPixelRatio();
      const shadow = renderer.shadowMap.enabled ? q.shadow * q.shadow * 4 / 1048576 : 0, canvas = renderer.domElement.width * renderer.domElement.height * 4 * 2 / 1048576;
      let composerMB = 0; if (composer) composerMB = composer.renderTarget1.width * composer.renderTarget1.height * (8 + 4) * 2 / 1048576;
      let skinned = 0, meshes = 0, inst = 0; scene.traverse(o => { if (o.isMesh) meshes++; if (o.isSkinnedMesh) skinned++; if (o.isInstancedMesh) inst++ });
      return { texCount: tex.length, texMB: MB(tT * 1048576), geoCount: geo.length, geoMB: MB(gT * 1048576), shadowMB: +shadow.toFixed(1), canvasMB: +canvas.toFixed(1), composerMB: +composerMB.toFixed(1), pr, canvas: [renderer.domElement.width, renderer.domElement.height], meshes, skinned, inst, chunks: chunks.size, bySize, glCalls: renderer.info.render.calls,
        topTex: tex.slice(0, 40).map(t => `${t.mb.toFixed(1)} MB ${t.w}x${t.h} ${t.who}`), topGeo: geo.sort((a, b) => b.mb - a.mb).slice(0, 12).map(g => `${g.mb.toFixed(1)} MB ${Math.round(g.tris)} tris ${g.who}`) };
    });
    console.log('=== ' + label, JSON.stringify({ ...R, topTex: undefined, topGeo: undefined }));
    console.log('top textures:\n  ' + R.topTex.slice(0, TOP).join('\n  ')); console.log('top geometry:\n  ' + R.topGeo.join('\n  '));
    return R;
  };
  console.log('quality', Q, 'MOBILE', await ev(() => MOBILE));
  await h.wait(5000);
  if (process.env.RENDER) { await h.render(); await h.wait(+process.env.RENDER * 1000); await h.noRender(); console.log('rendered for', process.env.RENDER, 's: textures/geometry the GPU already holds can drop their CPU copies'); }   // RENDER=<seconds>: draw real frames first, so uploaded textures / geometry have been released on the CPU side
  await report('home yard, start of the game');
  // the yard cars load their GLBs when you are within 300 m: make sure they all did
  await ev(() => { for (const v of EXT.veh) if (v.glbPending) v.attachGLB() }); await h.wait(6000);
  await report('home yard, all GLB cars loaded');
};
