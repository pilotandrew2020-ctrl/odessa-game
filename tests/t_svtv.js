exports.opts = { w: 1000, h: 620 };
exports.run = async (page, h) => {
  await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)) });
  await h.start(); await h.noRender(); await h.wait(2500);
  await ev(() => { PORTAL.enter('flat', { x: player.x, z: player.z, yaw: player.yaw }, { ent: 1, floor: 3 }) }); await h.wait(10000);
  const d = await ev(() => { const t = svTv; if (!t.m) return null; const p = t.m.getWorldPosition(new THREE.Vector3()), q = t.m2.getWorldPosition(new THREE.Vector3()); return { front: [p.x, p.y, p.z], back: [q.x, q.y, q.z], size: [t.m.geometry.parameters.width, t.m.geometry.parameters.height] } });
  console.log('tv overlay', JSON.stringify(d)); if (!d) return;
  await ev(() => { TVX.cycle(svTv) }); await h.wait(800);
  // look at it from the side the player would stand: try the plane that is nearer to the flat's inside (we pick the one the camera can see)
  for (const k of ['front', 'back']) {
    const s = d[k], o = k === 'front' ? d.back : d.front;
    await ev(([s, o]) => { const dx = s[0] - o[0], dz = s[2] - o[2], L = Math.hypot(dx, dz); player.x = s[0] + dx / L * 2.0; player.z = s[2] + dz / L * 2.0; player.y = PORTAL.active.grp.position.y; player.vx = player.vz = 0; cam.yaw = Math.atan2(-dx, -dz); cam.pitch = -.05 }, [s, o]);
    await h.wait(900); console.log(k, await h.shot('sv_tv_' + k, 1500));
  }
};
