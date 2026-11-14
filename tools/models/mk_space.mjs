// mk_space.mjs <config.json> — splits / decimates / re-orients the space models (shuttle stack, ISS, Moon, Fighter 38) into game GLBs (assets/models/space/*.glb):
// groups by node / material name or by the sign of x, one node per group (the shuttle's boosters and tank must fall away separately), world transforms baked, one 3x3 rotation + uniform scale,
// the whole thing grounded (min y = 0) and centred on x / z, per-material decimation (meshopt, UV seams kept), textures <= maxTex px.
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {io,parts} from './lib.mjs';
import {texBuf,weld,simplify,mergeGeo} from './build_lib.mjs';
import fs from 'fs';
const C=JSON.parse(fs.readFileSync(process.argv[2]));
const doc=await io.read(C.src),P=parts(doc),R=C.rot||[[1,0,0],[0,1,0],[0,0,1]],S=C.scale||1;
const rot=(x,y,z)=>[R[0][0]*x+R[0][1]*y+R[0][2]*z,R[1][0]*x+R[1][1]*y+R[1][2]*z,R[2][0]*x+R[2][1]*y+R[2][2]*z];
for(const p of P){for(let i=0;i<p.pos.length;i+=3){const o=rot(p.pos[i],p.pos[i+1],p.pos[i+2]);p.pos[i]=o[0]*S;p.pos[i+1]=o[1]*S;p.pos[i+2]=o[2]*S}
  for(let i=0;i<p.nrm.length;i+=3){const o=rot(p.nrm[i],p.nrm[i+1],p.nrm[i+2]);p.nrm[i]=o[0];p.nrm[i+1]=o[1];p.nrm[i+2]=o[2]}}
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const p of P)for(let i=0;i<p.pos.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p.pos[i+k]);mx[k]=Math.max(mx[k],p.pos[i+k])}
const off=[C.center&&C.center.includes('x')?-(mn[0]+mx[0])/2:0,C.ground?-mn[1]:(C.center&&C.center.includes('y')?-(mn[1]+mx[1])/2:0),C.center&&C.center.includes('z')?-(mn[2]+mx[2])/2:0];
for(const p of P)for(let i=0;i<p.pos.length;i+=3)for(let k=0;k<3;k++)p.pos[i+k]+=off[k];
const cx=p=>{let s=0;for(let i=0;i<p.pos.length;i+=3)s+=p.pos[i];return s/(p.pos.length/3)};
const texIds=new Map(),D=new Document(),buf=D.createBuffer(),scene=D.createScene('s'),mats=new Map(),texCache=new Map();
const total=P.reduce((a,p)=>a+p.idx.length/3,0);let outTris=0;
for(const G of C.groups){
  const list=P.filter(p=>{const m=G.match||{};if(m.nodeRe&&!new RegExp(m.nodeRe,'i').test(p.node))return false;if(m.matRe&&!new RegExp(m.matRe,'i').test(String(p.mat)))return false;
    if(m.xLess!==undefined&&!(cx(p)<m.xLess))return false;if(m.xMore!==undefined&&!(cx(p)>m.xMore))return false;return !p.taken});
  list.forEach(p=>p.taken=true);if(!list.length){console.log('group',G.name,'EMPTY');continue}
  const byMat=new Map();for(const p of list){const k=String(p.mat);if(!byMat.has(k))byMat.set(k,[]);byMat.get(k).push(p)}
  const t0=list.reduce((a,p)=>a+p.idx.length/3,0),node=D.createNode(G.name),mesh=D.createMesh(G.name);let gt=0;
  for(const [mk,ps] of byMat){let g=ps.length===1?{pos:ps[0].pos,nrm:ps[0].nrm,uv:ps[0].uv,idx:ps[0].idx}:mergeGeo(ps.map(p=>({pos:p.pos,nrm:p.nrm,uv:p.uv,idx:p.idx})));g=weld(g,1e-5);
    const share=Math.max(80,Math.round((G.tris||t0)*(ps.reduce((a,p)=>a+p.idx.length/3,0))/t0));g=simplify(g,share,G.err||.05,.5);gt+=g.idx.length/3;
    const key=mk+'|'+(G.name),src=ps[0];let m=mats.get(key);
    if(!m){const base=src.m?src.m.getBaseColorFactor():[1,1,1,1];m=D.createMaterial(mk).setBaseColorFactor(base).setMetallicFactor(C.metal===undefined?0:C.metal).setRoughnessFactor(C.rough||.6).setDoubleSided(!!src.ds);
      if(src.alphaMode&&src.alphaMode!=='OPAQUE'){m.setAlphaMode(src.alphaMode);if(src.cutoff!=null)m.setAlphaCutoff(src.cutoff)}
      if(src.m&&src.m.getEmissiveFactor){const e=src.m.getEmissiveFactor();if(e[0]+e[1]+e[2]>0)m.setEmissiveFactor(e)}
      if(src.tex){const px=Math.min(G.maxTex||C.maxTex||1024,C.maxTex||1024),sz=src.tex.getSize(),sc=Math.min(1,px/Math.max(sz[0],sz[1])),w=Math.max(16,Math.round(sz[0]*sc)),h=Math.max(16,Math.round(sz[1]*sc)),alpha=src.alphaMode&&src.alphaMode!=='OPAQUE';
        const tid=(texIds.get(src.tex)||(texIds.set(src.tex,texIds.size+1),texIds.size)),ck=tid+'|'+w+'|'+alpha;let tb=texCache.get(ck);if(!tb){tb=await texBuf(Buffer.from(src.tex.getImage()),{w,h,fmt:alpha?'png':'jpg',q:C.q||80,colours:alpha?160:256,bleed:!!alpha});texCache.set(ck,tb)}
        m.setBaseColorTexture(D.createTexture(mk+'_c').setImage(tb.buf).setMimeType(tb.mime))}
      mats.set(key,m)}
    const ac=(t,a)=>D.createAccessor().setType(t).setArray(a).setBuffer(buf);
    mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',ac('VEC3',g.pos)).setAttribute('NORMAL',ac('VEC3',g.nrm)).setAttribute('TEXCOORD_0',ac('VEC2',g.uv)).setIndices(ac('SCALAR',g.pos.length/3>65535?g.idx:Uint16Array.from(g.idx))).setMaterial(m))}
  node.setMesh(mesh);scene.addChild(node);outTris+=gt;console.log('group',G.name,'tris',t0,'->',gt,'materials',byMat.size)}
const left=P.filter(p=>!p.taken).length;if(left)console.log('NOT ASSIGNED parts:',left);
D.getRoot().getAsset().extras=Object.assign({},doc.getRoot().getAsset().extras||{},{processed:'tools/models/mk_space.mjs'});
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(C.out,D);
console.log(C.out,'tris',total,'->',outTris,'file KB',Math.round(fs.statSync(C.out).size/1024),'offset',off.map(v=>v.toFixed(2)),'size',mx.map((v,i)=>(v-mn[i]).toFixed(2)));
