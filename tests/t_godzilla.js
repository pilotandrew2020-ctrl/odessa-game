// Godzilla (round 42): spawned from the Spawn menu, he loads, stands on the ground taller than the houses, walks (the legs move), the laser bows the head, opens the jaw,
// fires a beam that hits and starts a collapse; Exit puts you back on your feet. GOJISHOT=1: screenshots tests/out/goji_*.png
exports.opts = { w: 960, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert'), SH = !!process.env.GOJISHOT; await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  await ev(() => { const p = PLACES.find(q => q.id === 'gorky') || PLACES[0]; teleportRaw(p.x, p.z, p.yaw) }); await h.wait(4000);
  const menu = await ev(async () => (await (await fetch('airp.js')).text()).includes('data-k="godzilla"')); assert(menu, 'no Godzilla in the Spawn menu');
  await ev(() => GOJI.spawn()); await page.waitForFunction(() => GOJI.on, null, { timeout: 60000 });
  const a = await ev(() => { GOJI.g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(GOJI.S); return { h: +(b.max.y - b.min.y).toFixed(1), y0: +(b.min.y - GOJI.y).toFixed(1), bones: Object.keys(GOJI.B).length, hud: !GOJI.el.hidden, plr: PLR.root.visible } });
  console.log('spawned', JSON.stringify(a)); assert(a.h > 50 && a.bones > 100 && a.hud && !a.plr, 'Godzilla did not appear right');
  if (SH) await h.shot('goji_stand', 5000);
  const w = await ev(() => { const x0 = GOJI.x, z0 = GOJI.z, q0 = GOJI.B.legL.quaternion.clone(); inp.jy = 1; for (let i = 0; i < 80; i++) GOJI.frame(.05); inp.jy = 0; return { d: +Math.hypot(GOJI.x - x0, GOJI.z - z0).toFixed(1), leg: +q0.angleTo(GOJI.B.legL.quaternion).toFixed(3) } });
  console.log('walked', JSON.stringify(w)); assert(w.d > 10 && w.leg > .02, 'he does not walk / the legs do not move');
  const l = await ev(() => { BLAST.hits = 0; const j0 = GOJI.B.jaw.quaternion.clone(); GOJI.aim = -.3; GOJI.fire = true; for (let i = 0; i < 60; i++) GOJI.frame(.05); const r = { beam: GOJI.beam.visible, len: +GOJI.beam.scale.y.toFixed(0), hit: GOJI.splash.visible, blasts: BLAST.hits, nuke: NUKE.st, jaw: +j0.angleTo(GOJI.B.jaw.quaternion).toFixed(3), glow: +GOJI.spine.emissiveIntensity.toFixed(2) }; return r });
  console.log('laser', JSON.stringify(l)); assert(l.beam && l.hit && l.blasts > 0 && l.jaw > .2, 'the laser does not fire / hit / open the jaw');
  if (SH) await h.shot('goji_laser', 5000);
  await ev(() => { GOJI.fire = false; for (let i = 0; i < 10; i++) GOJI.frame(.05); GOJI.end() }); await h.wait(500);
  const e = await ev(() => ({ on: GOJI.on, plr: PLR.root.visible, hud: GOJI.el.hidden, cls: document.body.classList.contains('gojion') })); console.log('exit', JSON.stringify(e)); assert(!e.on && e.plr && e.hud && !e.cls, 'Exit left a stuck state');
};
