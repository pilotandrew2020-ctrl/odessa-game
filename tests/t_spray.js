// tests/t_spray.js
module.exports = {
  opts: { w: 900, h: 540 },
  async run(page, h) {
    console.log('booting...');
    await h.boot();
    await h.start();

    const info = await h.ev(async () => {
      const js = MARINE.crafts.find(c => c.type === 'jetski');
      if (!js) return { ok: false, err: 'no jetski' };
      teleportRaw(js.x + 2, js.z + 2, js.yaw, 0);
      MARINE.enter(js);
      js.u = 24;
      js.throttle = 1.0;
      js.yawRate = 0.9;

      camera.position.set(js.x, js.y + 4, js.z - 8);
      camera.lookAt(js.x, js.y + 1, js.z);

      for (let i = 0; i < 40; i++) {
        js.step(0.016, 1.0, 0.7);
        SPRAY.stepCraft(js, 0.016, camera.position);
        SPRAY.update(0.016, camera.position);
      }

      let activePts = 0;
      for (let i = 0; i < SPRAY.maxParticles; i++) {
        if (SPRAY.life[i * 2] < SPRAY.life[i * 2 + 1]) activePts++;
      }
      const activeFoam = SPRAY.foams.filter(f => f.mesh.visible).length;

      return {
        ok: true,
        maxParticles: SPRAY.maxParticles,
        activePts,
        activeFoam,
        speed: js.u,
        occupied: js.occupied
      };
    });

    console.log('spray info:', JSON.stringify(info));
    if (!info.ok) throw new Error('Spray check failed: ' + info.err);
    if (info.activePts <= 0) throw new Error('No spray particles emitted');
    if (info.activeFoam <= 0) throw new Error('No foam emitted');
    if (info.activePts > info.maxParticles) throw new Error('Exceeded particle cap: ' + info.activePts + ' > ' + info.maxParticles);

    await h.shot('spray_jetski');
    console.log('shot saved spray_jetski.png');
  }
};
