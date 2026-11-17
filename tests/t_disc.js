exports.opts = { w: 800, h: 500, warn: false };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(3000);
  const r = await ev(() => { const out = []; scene.traverse(o => { if (!o.visible || !(o.isMesh || o.isSprite || o.isPoints)) return; const w = o.getWorldPosition(new THREE.Vector3()); const d = Math.hypot(w.x - player.x, w.z - player.z); if (d > 45 || w.y < player.y + .3 || w.y > player.y + 5) return; const c = o.material && o.material.color ? o.material.color.getHex() : -1; const t = o.geometry ? o.geometry.type : o.type; const b = o.geometry && o.geometry.boundingSphere ? o.geometry.boundingSphere.radius : -1; if (/Circle|Sphere|Cylinder|Plane|Ring/.test(t) || o.isSprite) out.push([t, o.name, +d.toFixed(1), +(w.y - player.y).toFixed(2), c.toString(16), +b.toFixed(2), o.parent && o.parent.name]) }); return out.slice(0, 40) });
  for (const x of r) console.log(JSON.stringify(x));
};
