import {io,parts} from './lib.mjs';
import {texBuf,weld,simplify,stats,writeGlb,mergeGeo} from './build_lib.mjs';
import fs from 'fs';
const TARGET=+process.argv[2]||12000;
const doc=await io.read((process.env.SRC||'src')+'/nolik.glb');const P=parts(doc);
let g=weld(mergeGeo(P.map(p=>({pos:p.pos,nrm:p.nrm,uv:p.uv,idx:p.idx}))),2e-5);
// rotate so the character faces +z and its left is +x: (x,y,z) -> (-z,y,x)
for(let i=0;i<g.pos.length;i+=3){const x=g.pos[i],z=g.pos[i+2];g.pos[i]=-z;g.pos[i+2]=x;const nx=g.nrm[i],nz=g.nrm[i+2];g.nrm[i]=-nz;g.nrm[i+2]=nx}
let s=simplify(g,TARGET,.006,1);console.log('tris',stats(s).tris,'verts',stats(s).verts);
fs.writeFileSync(`nolik_${TARGET}.json`,JSON.stringify({pos:Array.from(s.pos),uv:Array.from(s.uv),nrm:Array.from(s.nrm),idx:Array.from(s.idx)}));
const t=await texBuf(Buffer.from(P[0].tex.getImage()),{w:1024,h:1024,fmt:'jpg',q:82});
console.log('file',await writeGlb(`out/nolik_${TARGET}.glb`,[{name:'nolik',geo:s,mat:{name:'nolik',tex:t,alphaMode:'OPAQUE',doubleSided:true}}]));
