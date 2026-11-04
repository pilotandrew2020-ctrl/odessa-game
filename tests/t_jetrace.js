// tests/t_jetrace.js
module.exports = {
  opts: { w: 900, h: 540 },
  async run(page, h) {
    console.log('booting...');
    await h.boot();
    await h.start();

    // Verify mode start, passing gates, and exit
    const res = await h.ev(async () => {
      if (!window.JETRACE) return { ok: false, err: 'no JETRACE global' };
      const startPos = { x: player.x, y: player.y, z: player.z };

      // Start race mode
      JETRACE.start();
      if (!JETRACE.on) return { ok: false, err: 'failed to start race mode' };

      const initialScore = JETRACE.score;
      const initialCombo = JETRACE.combo;

      // Pass first 3 gates programmatically
      for (let g = 0; g < 3; g++) {
        const gate = JETRACE.gates[g];
        JETRACE.craft.x = gate.cx;
        JETRACE.craft.z = gate.cz;
        JETRACE.craft.u = 20;
        JETRACE.update(0.1);
      }

      const scoreAfterGates = JETRACE.score;
      const comboAfterGates = JETRACE.combo;

      // Test Ramp jump (airborne physics)
      const ramp = JETRACE.ramps[0];
      JETRACE.craft.x = ramp.x;
      JETRACE.craft.z = ramp.z;
      JETRACE.craft.u = 22;
      JETRACE.update(0.016);
      const isAirborne = JETRACE.airborne;
      const craftVy = JETRACE.craft.vy;

      // Land the jump (simulate flight time > 1.9s)
      for (let step = 0; step < 40; step++) {
        JETRACE.update(0.05);
      }
      const landed = !JETRACE.airborne;

      // Exit mode
      JETRACE.stop();
      const afterExitOn = JETRACE.on;
      const playerPosRestored = Math.hypot(player.x - startPos.x, player.z - startPos.z) < 2.0;

      return {
        ok: true,
        initialScore,
        scoreAfterGates,
        comboAfterGates,
        isAirborne,
        craftVy,
        landed,
        afterExitOn,
        playerPosRestored
      };
    });

    console.log('jetrace test result:', JSON.stringify(res));
    if (!res.ok) throw new Error('JETRACE test failed: ' + res.err);
    if (res.scoreAfterGates <= 0) throw new Error('Score did not increase');
    if (res.comboAfterGates <= 1) throw new Error('Combo did not increase');
    if (!res.isAirborne) throw new Error('Craft did not become airborne over ramp');
    if (!res.landed) throw new Error('Craft did not land');
    if (res.afterExitOn) throw new Error('JETRACE.on is still true after stop');
    if (!res.playerPosRestored) throw new Error('Player position not restored after exit');

    // Screenshot HUD during a race run
    await h.ev(() => {
      JETRACE.start();
      JETRACE.craft.u = 25;
      JETRACE.passGate(0);
      JETRACE.syncHUD();
    });
    await h.shot('jetrace_hud');
    await h.ev(() => JETRACE.stop());
    console.log('shot saved jetrace_hud.png');
  }
};
