// Where the triangles of a frame come from. For a few spots it walks the scene and sums the triangles of every object the camera frustum (main pass) and the sun's
// shadow frustum (shadow pass, castShadow objects only) would really draw, grouped by what the object is. Objects that span the whole map are never culled, which is
// what this makes visible. Run with IPAD=1 for the tablet caps. Env: Q=high|mid|low.
exports.opts = { w: 900, h: 540, warn: false };
exports.run = async (page, h) => {
  const Q = process.env.Q || 'high';
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await ev(q => { S.q = q; applyQuality(); }, Q);
  await h.noRender();
  const spots = [['home yard', () => teleportRaw(3, 14, 0, 0)], ['Arcadia beach', () => teleportRaw(2600, -9400, 1.5, 0)], ['island', () => teleportRaw(1450, 480, 0, 0)], ['city centre', () => { const p = PLACES.find(q => q.id === 'opera'); if (p) teleportRaw(p.x, p.z, p.yaw, 0); }]];
  for (const [name, fn] of spots) {
    await ev(fn); await h.wait(7000);
    const R = await ev(() => {
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const fr = new THREE.Frustum(), M = new THREE.Matrix4(), sph = new THREE.Sphere(), cats = {}, sh = {};
      const tris = (o) => { const g = o.geometry; if (!g) return 0; let n = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0); if (g.drawRange && g.drawRange.count !== Infinity) n = Math.min(n, g.drawRange.count); n /= 3; if (o.isInstancedMesh) n *= o.count; if (o.isPoints) n = n * 3; return n };
      const cat = (o) => { let p = o, s = ''; const names = []; for (; p && p !== scene; p = p.parent) names.push(p.name || p.type); const top = names[names.length - 1] || ''; const g = o.geometry; const box = g && (g.boundingBox || (g.computeBoundingBox(), g.boundingBox)); const span = box ? Math.max(box.max.x - box.min.x, box.max.z - box.min.z) : 0;
        const kind = o.isInstancedMesh ? 'instanced' : o.isSkinnedMesh ? 'skinned' : o.isPoints ? 'points' : span > 1500 ? 'MAP-WIDE mesh' : span > 400 ? 'wide mesh (>400 m)' : 'local mesh'; return kind + (o === LANDMARK_GRP || (LANDMARK_GRP && LANDMARK_GRP.children.includes(o)) ? ' [landmarks]' : [...chunks.values()].some(c => [c.ground, c.bld, c.props, c.signs, c.grx].includes(o)) ? ' [chunk]' : '') };
      const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true };
      const count = (frustum, into, onlyShadow) => scene.traverse(o => { if (!(o.isMesh || o.isPoints) || !vis(o)) return; if (onlyShadow && !o.castShadow) return; if (o.frustumCulled && o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld); if (!frustum.intersectsSphere(sph)) return }
        const k = cat(o), t = tris(o); into[k] = into[k] || { tris: 0, objs: 0 }; into[k].tris += t; into[k].objs++ });
      fr.setFromProjectionMatrix(M.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); count(fr, cats, false);
      let shadowOn = renderer.shadowMap.enabled && sunL.castShadow; if (shadowOn) { sunL.shadow.camera.updateMatrixWorld(true); sunL.updateMatrixWorld(true); sunL.target.updateMatrixWorld(true); sunL.shadow.updateMatrices(sunL); fr.setFromProjectionMatrix(sunL.shadow.matrix); count(fr, sh, true) }
      const sum = o => Object.values(o).reduce((a, b) => a + b.tris, 0), fmt = o => Object.entries(o).sort((a, b) => b[1].tris - a[1].tris).map(([k, v]) => `${Math.round(v.tris / 1000)}k tris, ${v.objs} objs: ${k}`);
      return { main: Math.round(sum(cats) / 1000) + 'k', shadow: Math.round(sum(sh) / 1000) + 'k', mainBy: fmt(cats), shadowBy: fmt(sh), q: Qp().shadow, sr: Qp().sr };
    });
    console.log('=== ' + name + ': main pass ' + R.main + ' tris, shadow pass ' + R.shadow + ' (shadow map ' + R.q + ', radius ' + R.sr + ')');
    console.log('  main:\n    ' + R.mainBy.join('\n    ')); console.log('  shadow:\n    ' + R.shadowBy.join('\n    '));
  }
};
