// Syntax check of the inline scripts of index.html (there is no build step, so a typo only shows when the page loads):  node tests/check_inline.js
// Line numbers in the error are those of index.html.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'); let bad = 0, n = 0;
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m;
while ((m = re.exec(src))) { if (/type=["'](?!text\/javascript|module)/.test(m[0].slice(0, m[0].indexOf('>')))) continue; n++;
  const line = src.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;
  try { new vm.Script('\n'.repeat(line) + m[1], { filename: 'index.html' }) } catch (e) { bad++; console.log(String(e.stack).split('\n').slice(0, 5).join('\n').slice(0, 600)) } }
console.log(n + ' inline scripts, ' + bad + ' with syntax errors'); process.exitCode = bad ? 1 : 0;
