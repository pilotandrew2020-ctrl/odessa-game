import {io,parts,bounds} from './lib.mjs';
import {texBuf,weld,subsetTris,xform,stats,writeGlb} from './build_lib.mjs';
const U=(process.env.SRC||'src')+'/';
const doc=await io.read(U+'snow_trees_pack_lowpoly.glb');
const P=parts(doc);const get=n=>P.find(p=>p.node.toLowerCase().startsWith(n));
const all=p=>[...Array(p.idx.length/3).keys()];
// place the piece on the ground at the origin (centre of its footprint), scale to a target height (bushes: to a target width)
function norm(p,h,key='h'){const g=weld(subsetTris(p,all(p)));const b=stats(g).b;const cx=(b[0]+b[3])/2,cz=(b[2]+b[5])/2;const s=key==='h'?h/(b[4]-b[1]):h/Math.max(b[3]-b[0],b[5]-b[2]);
  xform(g,(x,y,z)=>[(x-cx)*s,(y-b[1])*s,(z-cz)*s]);return g}
const out=[];
const defs=[['treebaretall','bare',11,512,1024,256,512],['deadtreehero','deadhero',9,512,512,512,512],['deadtreewide','deadwide',6,512,512,256,256],['snowtree','snowtree',11,256,512,256,512]];
const mats={};
for(const [src,name,h,w0,h0,w,hh] of defs){const p=get(src);const g=norm(p,h);const t=await texBuf(p.tex.getImage(),{w,h:hh,fmt:'png',q:80,colours:128,bleed:true});
  out.push({name,geo:g,mat:{name,tex:t,alphaMode:'MASK',cutoff:.4,doubleSided:true}});console.log(name,stats(g).tris,'tris',stats(g).b.map(v=>+v.toFixed(1)).join(','),'tex',t.buf.length)}
// bushes: both shapes in one cluster node (they share one texture)
const b1=get('snowbush1'),b2=get('snowbush2');const g1=weld(subsetTris(b1,all(b1))),g2=weld(subsetTris(b2,all(b2)));
const bb1=stats(g1).b,bb2=stats(g2).b;const s=1.0;
xform(g1,(x,y,z)=>[(x-(bb1[0]+bb1[3])/2)*s-.7,(y-bb1[1])*s,(z-(bb1[2]+bb1[5])/2)*s]);xform(g2,(x,y,z)=>[(x-(bb2[0]+bb2[3])/2)*s+.9,(y-bb2[1])*s,(z-(bb2[2]+bb2[5])/2)*s+.4]);
const m=(a,b)=>({pos:Float32Array.from([...a.pos,...b.pos]),nrm:Float32Array.from([...a.nrm,...b.nrm]),uv:Float32Array.from([...a.uv,...b.uv]),idx:Uint32Array.from([...a.idx,...Array.from(b.idx,i=>i+a.pos.length/3)])});
const bt=await texBuf(b1.tex.getImage(),{w:256,h:128,fmt:'png',q:80,colours:96,bleed:true});
out.push({name:'bush',geo:m(g1,g2),mat:{name:'bush',tex:bt,alphaMode:'MASK',cutoff:.4,doubleSided:true}});
const size=await writeGlb('out/tree_snow.glb',out);console.log('bush',stats(m(g1,g2)).tris,'file',size);
