const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim()&&!s.includes('peerjs')&&!s.includes('sourceMappingURL'));
scripts.forEach((s,i)=>fs.writeFileSync('_in'+i+'.js',s));
console.log('inline scripts:',scripts.length);
