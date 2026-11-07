// tests/t_jetrace.js — Verification of Jet Ski Rider mode, wedge ramps & airborne physics
module.exports = {
  opts: { w: 900, h: 540 },
  async run(page, h) {
    console.log('booting...');
    await h.boot();
    await h.start();

    // 1. Verify start & screenshot ramp from 40m away
    console.log('Setting up race mode and ramp view...');
    await h.ev(() => {
      JETRACE.start();
      const r = JETRACE.ramps[0];
      const camX = r.x - r.ufx * 40.0;
      const camZ = r.z - r.ufz * 40.0;
      camera.position.set(camX, SL + 4.5, camZ);
      camera.lookAt(r.x, SL + 1.8, r.z);
    });
    await h.shot('jetrace_ramp_view');

    // 2. Launch craft over ramp 0 and check launch velocity & airtime
    const jumpInfo = await h.ev(() => {
      const r = JETRACE.ramps[0];
      const js = JETRACE.craft;

      js.x = r.x - r.ufx * 4.0;
      js.z = r.z - r.ufz * 4.0;
      js.yaw = r.rot;
      js.u = 20.0;

      JETRACE.update(0.016);
      const isAir = JETRACE.airborne;
      const launchVy = js.vy;
      const launchPitch = js.pitch;

      // Fly 0.5s into air
      for (let i = 0; i < 30; i++) {
        JETRACE.update(0.016);
      }
      const midAirY = js.y;

      camera.position.set(js.x - r.ufx * 8.0, js.y + 1.5, js.z - r.ufz * 8.0);
      camera.lookAt(js.x + r.ufx * 6.0, js.y, js.z + r.ufz * 6.0);

      return {
        isAir,
        launchVy,
        launchPitch,
        midAirY,
        sl: SL
      };
    });
    console.log('Jump mid-air info:', JSON.stringify(jumpInfo));
    await h.shot('jetrace_mid_air');

    // 3. Complete flight and verify landing
    const landInfo = await h.ev(() => {
      const js = JETRACE.craft;
      for (let i = 0; i < 90; i++) {
        JETRACE.update(0.02);
      }
      const landed = !JETRACE.airborne;
      const score = JETRACE.score;
      return { landed, score, y: js.y, sl: SL };
    });
    console.log('Landing info:', JSON.stringify(landInfo));

    // 4. Test all 3 ramps launch & land
    const allRampsRes = await h.ev(() => {
      const res = [];
      for (let k = 0; k < JETRACE.ramps.length; k++) {
        const r = JETRACE.ramps[k];
        r.used = false;
        const js = JETRACE.craft;
        js.x = r.x - r.ufx * 3.0;
        js.z = r.z - r.ufz * 3.0;
        js.yaw = r.rot;
        js.u = 22.0;

        JETRACE.update(0.016);
        const launched = JETRACE.airborne;
        const vy = js.vy;

        // Fly until landing
        for (let step = 0; step < 120; step++) {
          JETRACE.update(0.02);
        }
        const landed = !JETRACE.airborne;
        res.push({ k, launched, vy, landed });
      }
      return res;
    });
    console.log('All ramps test:', JSON.stringify(allRampsRes));

    // 5. Test exit restores normal play
    await h.ev(() => {
      JETRACE.stop();
    });

    if (!jumpInfo.isAir || jumpInfo.launchVy <= 5) throw new Error('Ramp 0 failed to launch');
    if (!landInfo.landed) throw new Error('Craft failed to land after jump');
    for (const r of allRampsRes) {
      if (!r.launched || !r.landed) throw new Error(`Ramp ${r.k} failed launch or landing`);
    }

    console.log('Task B wedge ramps verified cleanly.');
  }
};
