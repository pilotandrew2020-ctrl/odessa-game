// Per-frame DOM writes: every change of the page (text, attributes, children) is counted with a MutationObserver while standing, walking, driving and in Battle Royale, grouped by the
// element it hit. A HUD that rewrites a label every frame makes Safari redo style / layout every frame; the game should only touch the DOM when something changed.
// Prints mutations per FRAME (the loop's frame counter) and the worst elements. Env: SECS=<s per mode>, LIMIT=<mutations per frame allowed, default 3>.
const assert = require('assert');
exports.opts = { w: 900, h: 540, warn: false };
exports.run = async (page, h) => {
  const SECS = +(process.env.SECS || 6), LIMIT = +(process.env.LIMIT || 3);
  await h.boot(); await h.start(); const ev = (f, a) => page.evaluate(f, a); await h.noRender(); await h.wait(3000);
  await ev(() => { const M = window.__dom = { by: {}, n: 0, frames: 0 }; ANIM.push(() => M.frames++);
    const id = (e) => { for (let p = e; p; p = p.parentNode) { if (p.id) return '#' + p.id + (p === e ? '' : ' ...'); } return (e.nodeName || '?').toLowerCase() };
    new MutationObserver(rs => { for (const r of rs) { M.n++; const k = id(r.target.nodeType === 3 ? r.target.parentNode : r.target) + ' [' + r.type + (r.attributeName ? ':' + r.attributeName : '') + ']'; M.by[k] = (M.by[k] || 0) + 1 } }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }) });
  const res = {};
  const measure = async (name) => { await ev(() => { __dom.by = {}; __dom.n = 0; __dom.frames = 0 }); await h.wait(SECS * 1000);
    const R = await ev(() => ({ perFrame: +(__dom.n / Math.max(1, __dom.frames)).toFixed(2), frames: __dom.frames, top: Object.entries(__dom.by).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => (v / Math.max(1, __dom.frames)).toFixed(2) + '/frame ' + k) }));
    res[name] = R.perFrame; console.log('=== ' + name + ': ' + R.perFrame + ' DOM mutations per frame (' + R.frames + ' frames)\n    ' + R.top.join('\n    ')) };
  await measure('standing');
  await ev(() => { inp.jy = 1 }); await measure('walking'); await ev(() => { inp.jy = 0 });
  await ev(() => { const g = EXT.veh.find(q => q.kind === 'gtr'); if (g) { EXT.summon('gtr'); if (!EXT.cur) EXT.enter(g) } }); await h.wait(1500);
  if (await ev(() => !!EXT.cur)) { await ev(() => { inp.k.KeyW = true }); await measure('driving'); await ev(() => { inp.k.KeyW = false; EXT.exit() }); await h.wait(800) } else console.log('driving: the car could not be entered (skipped)');
  if (!process.env.NOBR && await ev(() => typeof BR !== 'undefined')) { await ev(() => BR.start()); await page.waitForFunction(() => BR.on && (BR.phase === 'bus' || BR.phase === 'lobby' || BR.phase === 'sky' || BR.phase === 'play'), null, { timeout: 60000 }).catch(() => { }); await h.wait(2000); await measure('battle royale (' + await ev(() => BR.phase) + ')'); await ev(() => { try { BR.end && BR.end() } catch (e) { } }) }
  const bad = Object.entries(res).filter(([, v]) => v > LIMIT);
  assert(!bad.length, 'too many DOM writes per frame: ' + bad.map(([k, v]) => k + ' ' + v).join(', ') + ' (limit ' + LIMIT + ')');
  console.log('DOM WRITES OK (limit ' + LIMIT + ' per frame)');
};
