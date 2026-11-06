exports.opts = { w: 640, h: 400 };
exports.run = async (page, h) => {
  await h.boot();
  await page.evaluate(() => { S.q = 'low'; applyQuality(); });
  await h.start();
  await h.noRender();

  const initial = await h.ev(() => ({ ready: AIRP.ready, loading: AIRP.loading }));
  if (initial.ready || initial.loading) throw new Error('Airport was built before entering its zone');

  await h.ev(() => teleportRaw(AIRP.C[0], AIRP.C[1], AIRP.yawOf(0, 1), 0));
  await page.waitForFunction(() => AIRP.ready, null, { timeout: 30000 });
  const loaded = await h.ev(() => ({
    ready: AIRP.ready,
    stage: AIRP.loadStage,
    group: !!AIRP.g,
    flat: FLAT.filter(f => f.owner === AIRP).length,
    walls: STATIC_WALLS.filter(w => w.owner === AIRP).length,
    special: SPECIAL.filter(f => f.owner === AIRP).length,
    planes: [AIRP.flight, AIRP.fighter].filter(Boolean).length
  }));
  if (!loaded.ready || !loaded.group || loaded.stage < 6 || !loaded.flat || !loaded.walls) {
    throw new Error('Airport staged load incomplete: ' + JSON.stringify(loaded));
  }
  await h.shot('airport_stream', 1500);

  await h.ev(() => teleportRaw(15000, 15000, 0, 0));
  await page.waitForFunction(() => !AIRP.ready && !AIRP.loading, null, { timeout: 30000 });
  const unloaded = await h.ev(() => ({
    group: !!AIRP.g,
    flat: FLAT.filter(f => f.owner === AIRP).length,
    walls: STATIC_WALLS.filter(w => w.owner === AIRP).length,
    special: SPECIAL.filter(f => f.owner === AIRP).length,
    flightGPUReleased: !!(AIRP.flight && AIRP.flight._gpuReleased),
    fighterGPUReleased: !!(AIRP.fighter && AIRP.fighter._gpuReleased)
  }));
  if (unloaded.group || unloaded.flat || unloaded.walls || unloaded.special || !unloaded.flightGPUReleased || !unloaded.fighterGPUReleased) {
    throw new Error('Airport resources or collision registrations survived unload: ' + JSON.stringify(unloaded));
  }

  await h.ev(() => teleportRaw(AIRP.C[0], AIRP.C[1], AIRP.yawOf(0, 1), 0));
  await page.waitForFunction(() => AIRP.ready, null, { timeout: 30000 });
  const repeated = await h.ev(() => ({
    ready: AIRP.ready,
    airportPlaces: PLACES.filter(p => p.id === 'airport').length,
    flightCount: PLN.list.filter(p => p === AIRP.flight).length,
    fighterCount: PLN.list.filter(p => p === AIRP.fighter).length,
    flightGPUReleased: !!(AIRP.flight && AIRP.flight._gpuReleased),
    fighterGPUReleased: !!(AIRP.fighter && AIRP.fighter._gpuReleased)
  }));
  if (!repeated.ready || repeated.flightGPUReleased || repeated.fighterGPUReleased || repeated.airportPlaces !== 1 || repeated.flightCount !== 1 || repeated.fighterCount !== 1) {
    throw new Error('Airport re-entry duplicated state: ' + JSON.stringify(repeated));
  }
  console.log('airport stream', JSON.stringify({ initial, loaded, unloaded, repeated }));
};