// Colours picked in the creator work on the textured bodies (owner: "I pick blue on Nolik / brown on Chigurh and nothing changes"). COLSHOT=1: screenshots tests/out/col_*.png.
exports.opts = { w: 900, h: 560, warn: false };
exports.run = async (page, h) => {
  const SH = !!process.env.COLSHOT; await h.boot(); const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.render(); await h.wait(1500);
  const cases = [['nolik_b', 3, { 6: 6, 8: 8, 10: 3, 4: 9 }], ['nolik_skin', 3, { 0: 7 }], ['booba_b', 2, { 6: 6, 8: 8, 10: 3, 4: 9 }], ['steve_b', 4, { 6: 6, 8: 8, 10: 3, 4: 9 }], ['chig_red', 10, { 6: 6, 8: 5 }], ['ghost', 8, { 6: 6, 8: 5, 10: 3 }], ['halo', 6, { 6: 6, 8: 8, 0: 11 }], ['mrbeast', 5, { 6: 6, 0: 10 }]];
  for (const [n, body, picks] of cases) {
    await ev(([b, p]) => { const c = CHAR.clean(CHAR.cur); c[17] = b; c[0] = CHAR.def[0]; for (const k in p) c[+k] = p[k]; CHAR.cur = c; WARDROBE.apply(); cam.dist = 2.6; cam.pitch = .05; cam.yaw = player.yaw + Math.PI }, [body, picks]);
    await h.wait(2500); if (SH) await h.shot('col_' + n, 3500);
  }
};
