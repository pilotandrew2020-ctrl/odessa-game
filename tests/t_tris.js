// Which visible meshes cost the most triangles at High (round 39), seen from the home yard. IPAD=1.
exports.opts = { w: 1024, h: 768, warn: false };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'high'; S.polish = 'max'; applyQuality(); }); await h.start(); await h.render(); await h.wait(6000);
  const r = await ev(() => { const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); const rows = [];
    scene.traverseVisible(o => { if (!o.isMesh || !o.geometry) return; const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3, n = o.isInstancedMesh ? o.count : 1; if (o.frustumCulled && g.boundingSphere) { const s = g.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (!fr.intersectsSphere(s)) return } rows.push([o.name || (o.parent && o.parent.name) || g.type, Math.round(t * n), n, o.castShadow ? 1 : 0]) });
    rows.sort((a, b) => b[1] - a[1]); const tot = rows.reduce((a, r) => a + r[1], 0); return { tot, n: rows.length, top: rows.slice(0, 16) } });
  console.log(JSON.stringify(r));
};
