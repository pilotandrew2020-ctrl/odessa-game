// Static file server for the tests on machines without Python:  node tests/serve.js [port]   (same job as `python3 -m http.server 8765`)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), PORT = +process.argv[2] || 8765;
const MIME = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon', glb: 'model/gltf-binary', bin: 'application/octet-stream',
  mp4: 'video/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', wasm: 'application/wasm', txt: 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(f, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const h = { 'Content-Type': MIME[path.extname(f).slice(1).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      return fs.createReadStream(f, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(f).pipe(res);
  });
}).listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
