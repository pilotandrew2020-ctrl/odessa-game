// tests/t_perf.js — Measure performance across 4 spots:
// 1. City street (Derybasivska / Chykalenka)
// 2. Beach (Arcadia / Lanzheron)
// 3. Island (offshore house island)
// 4. Inside a flat (Soviet flat / modern flat)
module.exports = {
  opts: { w: 900, h: 540 },
  async run(page, h) {
    console.log('booting...');
    await h.boot();
    await h.start();

    const spots = [
      { name: 'city_street', fn: () => teleportRaw(3, 14, 0, 0) },
      { name: 'beach', fn: () => teleportRaw(2600, -9400, 1.5, 0) }, // Lanzheron
      { name: 'island', fn: () => teleportRaw(1450, 480, 0, 0) },   // Offshore island
      { name: 'flat', fn: () => {
          if (typeof PORTAL !== 'undefined') PORTAL.enter('panelflat', {x: 0, y: 10, z: 0, yaw: 0});
        }
      }
    ];

    const results = {};

    for (const spot of spots) {
      await h.ev(spot.fn);
      // Wait for rendering & streaming
      await h.wait(4000);
      await h.render();
      await h.wait(500);

      const metrics = await h.ev(() => {
        renderer.info.reset();
        try {
          if (composer) composer.render();
          else renderer.render(scene, camera);
        } catch(e) {}
        return {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures
        };
      });

      results[spot.name] = metrics;
      await h.shot('perf_' + spot.name);
      console.log(`Spot ${spot.name}:`, JSON.stringify(metrics));
    }

    console.log('\n--- PERFORMANCE SUMMARY ---');
    console.log(JSON.stringify(results, null, 2));
  }
};
