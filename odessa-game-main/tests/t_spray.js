// tests/t_spray.js — Chase camera verification for 3 conditions:
// 1. Cruising (moderate speed, bow spray fans)
// 2. Full throttle straight (rooster tail high arc at stern)
// 3. Hard turn (spray wall on the outside of turn)
module.exports = {
  opts: { w: 900, h: 540 },
  async run(page, h) {
    console.log('booting...');
    await h.boot();
    await h.start();

    // 1. Cruising (moderate speed, bow spray fans)
    const cruiseInfo = await h.ev(() => {
      const js = MARINE.crafts.find(c => c.type === 'jetski');
      teleportRaw(js.x + 2, js.z + 2, js.yaw, 0);
      MARINE.enter(js);
      js.x = 1250; js.z = -11550; js.y = SL + 0.1;
      camera.position.set(js.x - Math.sin(js.yaw) * 7, js.y + 2.2, js.z - Math.cos(js.yaw) * 7);
      camera.lookAt(js.x, js.y + 0.8, js.z);

      for (let i = 0; i < 40; i++) {
        js.step(0.016, 0.5, 0);
        SPRAY.stepCraft(js, 0.016, camera.position);
        SPRAY.update(0.016, camera.position);
      }

      let active = 0;
      for (let i = 0; i < SPRAY.maxParticles; i++) {
        if (SPRAY.life[i * 2] < SPRAY.life[i * 2 + 1]) active++;
      }
      return { active, max: SPRAY.maxParticles, speed: js.u, throttle: js.throttle };
    });
    console.log('Cruising condition:', JSON.stringify(cruiseInfo));
    await h.shot('spray_1_cruising');

    // 2. Full throttle straight (speed high, throttle 1.0, rooster tail)
    const throttleInfo = await h.ev(() => {
      const js = MARINE.cur;
      camera.position.set(js.x - Math.sin(js.yaw) * 7.5, js.y + 2.6, js.z - Math.cos(js.yaw) * 7.5);
      camera.lookAt(js.x, js.y + 0.8, js.z);

      for (let i = 0; i < 40; i++) {
        js.step(0.016, 1.0, 0);
        SPRAY.stepCraft(js, 0.016, camera.position);
        SPRAY.update(0.016, camera.position);
      }

      let active = 0;
      for (let i = 0; i < SPRAY.maxParticles; i++) {
        if (SPRAY.life[i * 2] < SPRAY.life[i * 2 + 1]) active++;
      }
      return { active, max: SPRAY.maxParticles, speed: js.u, throttle: js.throttle };
    });
    console.log('Full throttle condition:', JSON.stringify(throttleInfo));
    await h.shot('spray_2_full_throttle');

    // 3. Hard turn (steer 1.0, wall of spray)
    const turnInfo = await h.ev(() => {
      const js = MARINE.cur;
      const rx = Math.cos(js.yaw), rz = -Math.sin(js.yaw);
      camera.position.set(js.x - Math.sin(js.yaw) * 6 - rx * 3, js.y + 2.4, js.z - Math.cos(js.yaw) * 6 - rz * 3);
      camera.lookAt(js.x, js.y + 0.6, js.z);

      for (let i = 0; i < 40; i++) {
        js.step(0.016, 0.9, 1.0);
        SPRAY.stepCraft(js, 0.016, camera.position);
        SPRAY.update(0.016, camera.position);
      }

      let active = 0;
      for (let i = 0; i < SPRAY.maxParticles; i++) {
        if (SPRAY.life[i * 2] < SPRAY.life[i * 2 + 1]) active++;
      }
      return { active, max: SPRAY.maxParticles, speed: js.u, yawRate: js.yawRate };
    });
    console.log('Hard turn condition:', JSON.stringify(turnInfo));
    await h.shot('spray_3_hard_turn');

    if (cruiseInfo.active <= 0 || throttleInfo.active <= 0 || turnInfo.active <= 0) {
      throw new Error('Spray emissions missing in one or more test conditions');
    }
    if (throttleInfo.active > throttleInfo.max || turnInfo.active > turnInfo.max) {
      throw new Error('Exceeded particle cap');
    }

    console.log('Task A water spray verified successfully in all 3 conditions.');
  }
};
