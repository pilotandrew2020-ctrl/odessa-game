// look.js: a synthetic "face" picture (no personal photo) goes through LOOK.process, lands on the realistic avatar's skin material,
// the Capybara tee patches the shirt material, and removing the photo restores the 3D eyes. Run: BASE=... node tests/harness.js tests/t_look.js
exports.opts = { w: 480, h: 360 };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot(); await page.evaluate(() => { S.q = 'low'; applyQuality(); }); await h.start(); await h.noRender(); await h.wait(1500);
  const r = await page.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 600; const g = cv.getContext('2d');
    g.fillStyle = '#9ab'; g.fillRect(0, 0, 800, 600); g.fillStyle = '#d9a58f'; g.beginPath(); g.ellipse(400, 330, 200, 260, 0, 0, 6.283); g.fill();
    g.fillStyle = '#222'; for (const x of [320, 480]) { g.beginPath(); g.arc(x, 280, 18, 0, 6.283); g.fill() }
    const im = new Image(); await new Promise(res => { im.onload = res; im.src = cv.toDataURL() });
    LOOK.setFromImage(im, [320, 280], [480, 280]);
    const had = LOOK.has(), skin = LOOK.face && LOOK.face.skin;
    CHAR.cur[5] = 6; CHAR.save(); WARDROBE.apply();
    await new Promise(res => setTimeout(res, 1500));
    const R = PLR.real, mats = {}; R.M.traverse(o => { if (o.isMesh) mats[o.material.name] = o.material });
    const withPhoto = { eyesHidden: R.Eyes.visible === false, skinPatched: /face/.test(mats.skin.customProgramCacheKey()), teePatched: /capytee/.test(mats.shirt.customProgramCacheKey()) };
    LOOK.clear(); WARDROBE.apply(); await new Promise(res => setTimeout(res, 1500));
    const R2 = PLR.real, m2 = {}; R2.M.traverse(o => { if (o.isMesh) m2[o.material.name] = o.material });
    return { had, skin, withPhoto, after: { eyesVisible: R2.Eyes.visible, skinFace: /face/.test(m2.skin.customProgramCacheKey()) }, stored: localStorage.getItem('od_face') };
  });
  console.log('look', JSON.stringify(r));
  assert(r.had && /^#[0-9a-f]{6}$/.test(r.skin), 'face record missing');
  assert(r.withPhoto.eyesHidden && r.withPhoto.skinPatched && r.withPhoto.teePatched, 'photo / tee not applied');
  assert(r.after.eyesVisible && !r.after.skinFace && r.stored === null, 'removing the photo did not restore the avatar');
};
