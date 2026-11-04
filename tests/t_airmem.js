// Airport memory & draw call benchmark
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  console.log('[t_airmem] Booting game in harness...');
  await h.boot();
  await h.start();
  await page.waitForTimeout(3000);

  const ev = (f, a) => page.evaluate(f, a);

  async function measure(name, placeId, delay = 3500) {
    if (placeId) {
      await ev(id => {
        const p = PLACES.find(q => q.id === id);
        if (p) teleportRaw(p.x, p.z, p.yaw);
      }, placeId);
      await page.waitForTimeout(delay);
    }

    const data = await ev(() => {
      renderer.info.reset();
      renderer.render(scene, camera);
      const calls = renderer.info.render.calls;
      const tris = renderer.info.render.triangles;
      const geoms = renderer.info.memory.geometries;
      const textures = renderer.info.memory.textures;

      let meshCount = 0;
      let visibleMeshes = 0;
      let airportMeshes = 0;
      let totalEstTexBytes = 0;

      scene.traverse(obj => {
        if (obj.isMesh || obj.isPoints || obj.isLineSegments) {
          meshCount++;
          if (obj.visible) visibleMeshes++;
        }
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap'].forEach(prop => {
              if (m[prop] && m[prop].image && m[prop].image.width && !m[prop]._countedThisPass) {
                m[prop]._countedThisPass = true;
                const w = m[prop].image.width;
                const h = m[prop].image.height;
                totalEstTexBytes += w * h * 4;
              }
            });
          });
        }
      });

      // Clear counted flags
      scene.traverse(obj => {
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap'].forEach(prop => {
              if (m[prop]) delete m[prop]._countedThisPass;
            });
          });
        }
      });

      if (typeof AIRP !== 'undefined' && AIRP.g) {
        AIRP.g.traverse(o => {
          if (o.isMesh || o.isPoints || o.isLineSegments) airportMeshes++;
        });
      }

      return {
        calls,
        tris,
        geoms,
        textures,
        meshCount,
        visibleMeshes,
        airportMeshes,
        texMemMB: (totalEstTexBytes / (1024 * 1024)).toFixed(1),
        playerPos: { x: player.x.toFixed(1), z: player.z.toFixed(1) },
        mobile: typeof MOBILE !== 'undefined' ? MOBILE : null
      };
    });

    console.log(`[MEASURE: ${name}]`, JSON.stringify(data));
    return data;
  }

  // 1. Initial Home
  const homeData = await measure('HOME_INITIAL', null);

  // 2. Airport
  const airportData = await measure('AIRPORT', 'airport', 4000);
  await page.screenshot({ path: `${h.SCR}/airmem_airport.png` });

  // 3. Station
  const stationData = await measure('CITY_STATION', 'station', 3500);

  return { homeData, airportData, stationData };
};
