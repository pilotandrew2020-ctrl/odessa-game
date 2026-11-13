// Walk up the whole Potemkin Stairs holding W (and down again holding S): the player must never get stuck, especially not on the last flights near the top.
// Samples the progress along the stairs axis every 2 s and reports the longest stretch without progress. Env: SECS (wall seconds per direction, default 70).
exports.opts = { w: 640, h: 400, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), secs = +(process.env.SECS || 70);
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await h.noRender();
  const info = await ev(() => { const S0 = LMK.stairs, dx = S0.x1 - S0.x0, dz = S0.y1 - S0.y0, L = Math.hypot(dx, dz); return { x0: S0.x0, z0: S0.y0, x1: S0.x1, z1: S0.y1, L, tx: dx / L, tz: dz / L, yTop: groundH(S0.x0, S0.y0), yBot: groundH(S0.x1, S0.y1) } });
  console.log('stairs', JSON.stringify({ L: +info.L.toFixed(1), top: +info.yTop.toFixed(1), bottom: +info.yBot.toFixed(1) }));
  const run = async (up, lat) => {
    await ev(([i, up, lat]) => { const nx = -i.tz, nz = i.tx;   // start 8 m beyond the end of the stairs, lat metres to the side, facing along the axis
      const px = (up ? i.x1 + 8 * i.tx : i.x0 - 8 * i.tx) + lat * nx, pz = (up ? i.z1 + 8 * i.tz : i.z0 - 8 * i.tz) + lat * nz;
      const yaw = Math.atan2(up ? -i.tx : i.tx, up ? -i.tz : i.tz); teleportRaw(px, pz, yaw, 150); cam.yaw = yaw; player.yaw = yaw; inp.k.KeyS = false; inp.k.KeyW = true }, [info, up, lat]);
    const along = () => ev(i => ({ u: +(((player.x - i.x0) * i.tx + (player.z - i.z0) * i.tz)).toFixed(1), y: +player.y.toFixed(2) }), info);
    let last = (await along()).u, still = 0, maxStill = 0, trail = [];
    for (let t = 0; t < secs; t += 2) { await h.wait(2000); const a = await along(); trail.push(a.u); const d = up ? last - a.u : a.u - last; if (d < .4) { still += 2; maxStill = Math.max(maxStill, still) } else still = 0; last = a.u; if ((up && a.u <= 2) || (!up && a.u >= info.L - 2)) break }
    await ev(() => { inp.k.KeyW = false; inp.k.KeyS = false });
    return { reachedU: trail[trail.length - 1], maxStill, trail: trail.join(' ') };
  };
  for (const [up, lat] of [[true, 0], [true, -4], [true, 4], [false, 0], [false, 4], [false, -4]]) {
    const R = await run(up, lat); console.log((up ? 'up' : 'down') + ' lateral ' + lat, JSON.stringify({ end: R.reachedU, maxStill: R.maxStill, trail: R.trail.split(' ').slice(-8).join(' ') }));
    assert(up ? R.reachedU <= 6 : R.reachedU >= info.L - 6, (up ? 'up' : 'down') + ' lateral ' + lat + ': did not get to the end (u=' + R.reachedU + ')'); assert(R.maxStill < 8, (up ? 'up' : 'down') + ' lateral ' + lat + ': stuck for ' + R.maxStill + ' s');
  }
};
