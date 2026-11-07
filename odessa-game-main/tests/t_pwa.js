// tests/t_pwa.js — Verify PWA tags, manifest, and icons
const fs = require('fs');

module.exports = {
  opts: { w: 800, h: 500 },
  async run(page, h) {
    const base = process.env.BASE || 'http://localhost:8765';
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });

    // 1. Check meta tags
    const meta = await page.evaluate(() => {
      const getMeta = (n, val) => {
        const el = document.querySelector(`meta[${n}="${val}"]`);
        return el ? el.getAttribute('content') : null;
      };
      const getLink = (rel) => {
        const el = document.querySelector(`link[rel="${rel}"]`);
        return el ? el.getAttribute('href') : null;
      };
      return {
        viewport: getMeta('name', 'viewport'),
        themeColor: getMeta('name', 'theme-color'),
        appleCapable: getMeta('name', 'apple-mobile-web-app-capable'),
        mobileCapable: getMeta('name', 'mobile-web-app-capable'),
        appleTitle: getMeta('name', 'apple-mobile-web-app-title'),
        statusBarStyle: getMeta('name', 'apple-mobile-web-app-status-bar-style'),
        manifest: getLink('manifest'),
        appleIcon: getLink('apple-touch-icon')
      };
    });

    console.log('PWA meta & links:', JSON.stringify(meta));
    if (!meta.viewport || !meta.viewport.includes('viewport-fit=cover')) throw new Error('viewport-fit=cover missing');
    if (meta.appleCapable !== 'yes') throw new Error('apple-mobile-web-app-capable missing');
    if (meta.appleTitle !== 'My Odesa') throw new Error('apple-mobile-web-app-title invalid');
    if (!meta.manifest) throw new Error('link rel=manifest missing');
    if (!meta.appleIcon) throw new Error('link rel=apple-touch-icon missing');

    // 2. Check manifest json
    const mfRaw = fs.readFileSync('manifest.webmanifest', 'utf-8');
    const mf = JSON.parse(mfRaw);
    if (mf.name !== 'My Odesa' || mf.display !== 'standalone') throw new Error('manifest.webmanifest invalid');
    if (!mf.icons || mf.icons.length < 2) throw new Error('manifest icons missing');

    // 3. Check icon files exist on disk
    if (!fs.existsSync('icons/apple-touch-icon.png')) throw new Error('icons/apple-touch-icon.png missing');
    if (!fs.existsSync('icons/icon-192.png')) throw new Error('icons/icon-192.png missing');
    if (!fs.existsSync('icons/icon-512.png')) throw new Error('icons/icon-512.png missing');

    console.log('PWA verification passed successfully.');
  }
};
