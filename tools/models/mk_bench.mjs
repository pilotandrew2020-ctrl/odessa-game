import {io,parts,bounds,components} from './lib.mjs';
import {texBuf,compact,subsetTris,weld,simplify,scale,xform,stats,writeGlb} from './build_lib.mjs';
import fs from 'fs';
const doc=await io.read('work/bench_raw.glb');
const P=parts(doc);const bench=P.find(p=>p.node==='Object_2'),urn=P.find(p=>p.node==='Object_3');
const all=p=>[...Array(p.idx.length/3).keys()];
const bb=bounds(bench);const S=1.8/(bb[3]-bb[0]);   // 1.8 m long
const cx=(bb[0]+bb[3])/2,cz=(bb[2]+bb[5])/2;
let bg=weld(subsetTris(bench,all(bench)));const b0=stats(bg).tris;
bg=simplify(bg,1800,.02,.6);
xform(bg,(x,y,z)=>[(x-cx)*S,(y-bb[1])*S,(z-cz)*S]);
const ub=bounds(urn);let ug=weld(subsetTris(urn,all(urn)));const u0=stats(ug).tris;ug=simplify(ug,450,.02,.6);
const ucx=(ub[0]+ub[3])/2,ucz=(ub[2]+ub[5])/2,SU=S*1.3;xform(ug,(x,y,z)=>[(x-ucx)*SU,(y-ub[1])*SU,(z-ucz)*SU]);
const bTex=await texBuf(bench.tex.getImage(),{w:512,h:512,fmt:'jpg',q:78});
const uTex=await texBuf(urn.tex.getImage(),{w:256,h:256,fmt:'png',q:75,colours:64,bleed:true});
// note: the bench uses UVs of the opaque atlas, the urn its own RGBA atlas
const size=await writeGlb('out/bench.glb',[{name:'bench',geo:bg,mat:{name:'bench',tex:bTex,alphaMode:'OPAQUE',doubleSided:true}},{name:'bin',geo:ug,mat:{name:'bin',tex:uTex,alphaMode:'MASK',cutoff:.5,doubleSided:true}}]);
console.log('bench',b0,'->',stats(bg).tris,stats(bg).b.map(v=>+v.toFixed(2)).join(','),'bin',u0,'->',stats(ug).tris,stats(ug).b.map(v=>+v.toFixed(2)).join(','),'tex',bTex.buf.length,uTex.buf.length,'file',size);
