// Run many tests in parallel and print one line each:  node tests/run_all.js [-j 3] [IPAD=1] [t_final t_ui ...]   (no names = every t_*.js)
// Logs go to tests/out/log/<name>[.ipad].txt. A test FAILS on a script error, a page error or any console error; `known` lists accepted console noise.
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2); let J = 3; const env = { ...process.env, BASE: process.env.BASE || 'http://localhost:8765' }; const names = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '-j') J = +args[++i]; else if (/^[A-Z_]+=/.test(args[i])) { const [k, v] = args[i].split('='); env[k] = v; } else names.push(args[i].replace(/\.js$/, '')); }
const all = names.length ? names : fs.readdirSync(__dirname).filter(f => /^t_.*\.js$/.test(f)).map(f => f.slice(0, -3));
const LOG = path.join(__dirname, 'out', 'log'); fs.mkdirSync(LOG, { recursive: true });
const known = [/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|net::ERR_|youtube|ytimg|tiktok|Failed to load resource/i, /setPointerCapture/];
const res = []; let next = 0;
function one() {
  if (next >= all.length) return Promise.resolve();
  const n = all[next++], t0 = Date.now(), out = [];
  return new Promise(done => {
    const p = spawn(process.execPath, [path.join(__dirname, 'harness.js'), path.join(__dirname, n + '.js')], { env });
    const kill = setTimeout(() => { out.push('\nTIMEOUT (run_all, 15 min)\n'); p.kill(); }, 15 * 60e3);
    p.stdout.on('data', d => out.push(d)); p.stderr.on('data', d => out.push(d));
    p.on('close', code => {
      clearTimeout(kill); const txt = out.join(''); fs.writeFileSync(path.join(LOG, n + (env.IPAD ? '.ipad' : '') + '.txt'), txt);
      const tail = txt.split('--- console errors')[1] || '', errs = tail.split('\n').slice(1).filter(l => l.trim() && !known.some(k => k.test(l)));
      const bad = code !== 0 || /SCRIPT ERROR|TIMEOUT \(run_all|PAGEERR/.test(txt) || errs.length || /\bFAIL\b/.test(txt.split('--- console errors')[0]);
      res.push({ n, bad, s: ((Date.now() - t0) / 1000) | 0 });
      console.log((bad ? 'FAIL ' : 'ok   ') + n + '  ' + (((Date.now() - t0) / 1000) | 0) + ' s' + (bad ? '   ' + (/SCRIPT ERROR[^\n]*/.exec(txt) || /TIMEOUT[^\n]*/.exec(txt) || /PAGEERR[^\n]*/.exec(txt) || [errs[0] || 'FAIL in output'])[0].slice(0, 160) : ''));
      done(one());
    });
  });
}
Promise.all(Array.from({ length: J }, one)).then(() => { const f = res.filter(r => r.bad); console.log('\n' + (res.length - f.length) + ' ok, ' + f.length + ' failed' + (f.length ? ': ' + f.map(r => r.n).join(' ') : '')); process.exitCode = f.length ? 1 : 0; });
