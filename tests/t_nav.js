// The 3D navigation marker (nav.js): the map's "Navigate" button sets it WITHOUT teleporting, the beam / diamond are in the world, the HUD pill shows the name and a distance in m / km with
// an arrow, it keeps updating while you walk, and it clears on arrival. The teleport button is still there as the second option. NAVSHOT=1 saves screenshots (tests/out/nav_*.png).
exports.opts = { w: 900, h: 560, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await h.noRender();
  const shot = async n => { if (process.env.NAVSHOT) await h.shot('nav_' + n, 2500) };
  // the map: pick Deribasivska-ish place, press Navigate: the player stays where it is
  const before = await ev(() => { openMap(); const p = PLACES.find(q => q.id === 'opera') || PLACES[1]; mapSelect(p, false); return { x: player.x, z: player.z, id: p.id, name: p.name } });
  assert(await ev(() => !document.getElementById('goNav').hidden), 'no Navigate button on the map'); assert(await ev(() => !document.getElementById('goHere').hidden), 'the teleport button disappeared');
  console.log('buttons', await ev(() => [document.getElementById('goNav').textContent, document.getElementById('goHere').textContent]));
  await ev(() => document.getElementById('goNav').click()); await h.wait(600);
  const A = await ev(() => ({ on: NAV.on, name: NAV.name, moved: Math.hypot(player.x - 3, player.z - 14) > 0 && false, px: player.x, pz: player.z, beam: NAV.grp.visible, hud: document.getElementById('navHud').classList.contains('on'), txt: document.getElementById('navTxt').textContent, map: document.getElementById('mapUI').hidden }));
  console.log('navigating', JSON.stringify(A));
  assert(A.on && A.beam && A.hud && A.map, 'navigation did not start'); assert(Math.hypot(A.px - before.x, A.pz - before.z) < 1, 'Navigate teleported the player'); assert(/ (m|km)$/.test(A.txt), 'no distance in the pill: ' + A.txt);
  await shot('far');
  // walk towards it: the distance shrinks and the arrow points the right way (target straight ahead -> arrow ~ 0)
  const d0 = await ev(() => NAV.dist());
  await ev(() => { const dx = NAV.x - player.x, dz = NAV.z - player.z, d = Math.hypot(dx, dz); player.x += dx / d * Math.min(d - 300, 1500); player.z += dz / d * Math.min(d - 300, 1500); cam.yaw = Math.atan2(dx, dz); NAV.upd(true) });
  const A2 = await ev(() => ({ d: NAV.dist(), arrow: document.getElementById('navArrow').style.transform, txt: document.getElementById('navTxt').textContent }));
  console.log('closer', JSON.stringify(A2)); assert(A2.d < d0, 'the distance did not shrink'); assert(/rotate\((-?0(\.0\d*)?|-?[0-9.e-]+)rad\)/.test(A2.arrow) && Math.abs(parseFloat(A2.arrow.slice(7))) < .05, 'the arrow does not point at the target: ' + A2.arrow);
  await ev(() => { player.x = NAV.x + 3; player.z = NAV.z + 3 }); await h.wait(1200);
  await shot('near');
  assert(await ev(() => !NAV.on && !NAV.grp.visible && !document.getElementById('navHud').classList.contains('on')), 'arriving did not clear the marker');
  // set from code and cancel with the cross
  await ev(() => NAV.set(player.x + 400, player.z, 'Test point')); assert(await ev(() => NAV.on)); await ev(() => document.getElementById('navX').click()); assert(await ev(() => !NAV.on), 'the cross does not cancel');
};
