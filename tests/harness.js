// Headless harness for My Odesa. Usage: BASE=http://localhost:8765 node tests/harness.js tests/t_final.js   (see tests/README.md)  — the script exports async (page, h) => {...}
let chromium;try{({ chromium } = require('playwright'))}catch(e){({ chromium } = require('/opt/node-tools/node_modules/playwright'))}   // `npm i playwright` locally; the cloud image has it preinstalled
const path = require('path');
const SCR = process.env.SHOTS || path.join(__dirname, 'out');   // screenshots go here (git-ignored)
require('fs').mkdirSync(SCR, { recursive: true });

async function launch(opts = {}) {
  const browser = await chromium.launch({
    args: [...(process.env.EXTRA?process.env.EXTRA.split(' '):[]), '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'],
  });
  const ctxOpts = { viewport: { width: opts.w || 640, height: opts.h || 400 }, deviceScaleFactor: 1 };
  if (process.env.IPAD) { ctxOpts.hasTouch = true; ctxOpts.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'; }
  const ctx = await browser.newContext(ctxOpts);
  if (process.env.IPAD) await ctx.addInitScript(() => { Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' }); Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { const t = m.type(); if (t === 'error' || (opts.warn && t === 'warning')) errs.push(t.toUpperCase() + ' ' + m.text().slice(0, 300)); });
  const h = {
    browser, page, errs, SCR,
    async boot() {
      await page.goto((process.env.BASE||'http://localhost:8765')+'/index.html', { waitUntil: 'load' });
      await page.waitForFunction(() => document.getElementById('bStart') && document.getElementById('bStart').textContent === 'Play', null, { timeout: 240000 });
      // quality low for speed
      await page.evaluate(() => { try { window.__errs = []; } catch (e) {} });
    },
    async start() {
      await page.evaluate(() => { document.getElementById('bStart').click(); });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { const g = document.getElementById('crGo'); if (g) g.click(); });
      await page.waitForTimeout(6000);
    },
    async noRender() { await page.evaluate(() => { if (!window.__rr) { window.__rr = renderer.render.bind(renderer); window.__cr = composer ? composer.render.bind(composer) : null; } renderer.render = () => {}; if (composer) composer.render = () => {}; }); },
    async render() { await page.evaluate(() => { if (window.__rr) { renderer.render = window.__rr; if (composer && window.__cr) composer.render = window.__cr; } }); },
    // one real frame, then back to no-render
    async shot(name, waitMs) { await h.render(); await page.waitForTimeout(waitMs || 6000); const p = path.join(SCR, name + '.png'); await page.screenshot({ path: p, timeout: 120000 }); await h.noRender(); return p; },
    // advance the simulation n steps of dt without rendering (calls the same ANIM hooks the loop uses)
    async wait(ms) { await page.waitForTimeout(ms); },
    ev: (fn, arg) => page.evaluate(fn, arg),
  };
  return h;
}
module.exports = { launch, SCR };

if (require.main === module) {
  (async () => {
    const script = require(path.resolve(process.argv[2]));
    const h = await launch(script.opts || {});
    try { await script.run(h.page, h); } catch (e) { console.log('SCRIPT ERROR', e && e.stack || e); }
    console.log('--- console errors (' + h.errs.length + ') ---');
    [...new Set(h.errs)].slice(0, 40).forEach(e => console.log(e));
    await h.browser.close();
  })();
}
