import {io,parts,bounds,components} from './lib.mjs';
import {texBuf,compact,subsetTris,weld,simplify,scale,xform,stats,writeGlb} from './build_lib.mjs';
const U=(process.env.SRC||'src')+'/';
const doc=await io.read(U+'spruce.glb');
const P=parts(doc);const trunk=P.find(p=>p.node.startsWith('bark08')),cards=P.find(p=>p.node.startsWith('spruce'));
const S=1.15;   // 10.5 m -> ~12 m
let seed=11;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
const cc=components(cards);const by=Array.from({length:cc.count},()=>[]);cc.triComp.forEach((c,t)=>by[c].push(t));
const all=[...Array(cards.idx.length/3).keys()];
// the model's branch cards are sparse (a lean wild spruce): add rotated, lower and wider copies to get a full conical crown
function copyCards(target,rot,sxz,sy,dy){let g=weld(subsetTris(cards,all));
  const c=Math.cos(rot),s=Math.sin(rot);xform(g,(x,y,z)=>[(x*c-z*s)*sxz,y*sy+dy,(x*s+z*c)*sxz]);
  for(let i=0;i<g.nrm.length;i+=3){const x=g.nrm[i],z=g.nrm[i+2];g.nrm[i]=x*c-z*s;g.nrm[i+2]=x*s+z*c}
  return simplify(g,target,.25,1)}
function merge(gs){const n=gs.reduce((a,g)=>a+g.pos.length/3,0),ni=gs.reduce((a,g)=>a+g.idx.length,0);const pos=new Float32Array(n*3),nrm=new Float32Array(n*3),uv=new Float32Array(n*2),idx=new Uint32Array(ni);let vo=0,io2=0;
  for(const g of gs){pos.set(g.pos,vo*3);nrm.set(g.nrm,vo*3);uv.set(g.uv,vo*2);for(const i of g.idx)idx[io2++]=i+vo;vo+=g.pos.length/3}return {pos,nrm,uv,idx}}
async function variant(tag,{trunkTris,copies,barkW,barkH,needlePx,colours}){
  let tg=simplify(weld(subsetTris(trunk,[...Array(trunk.idx.length/3).keys()])),trunkTris,.1,.5);
  const cg=merge(copies.map(([t,rot,sxz,sy,dy])=>copyCards(t,rot,sxz,sy,dy)));
  scale(tg,S);scale(cg,S);
  const nTex=await texBuf(cards.tex.getImage(),{w:needlePx,h:needlePx,fmt:'png',q:75,colours,bleed:true});
  const bTex=await texBuf(trunk.tex.getImage(),{w:barkW,h:barkH,fmt:'jpg',q:72});
  const size=await writeGlb(`out/tree_spruce_${tag}.glb`,[{name:'trunk',geo:tg,mat:{name:'bark',tex:bTex,alphaMode:'OPAQUE'}},{name:'leaf',geo:cg,mat:{name:'leaf',tex:nTex,alphaMode:'MASK',cutoff:.4,doubleSided:true}}]);
  console.log(tag,'trunk',stats(tg).tris,'cards',stats(cg).tris,'tex',bTex.buf.length,nTex.buf.length,'file',size,'bounds',stats(cg).b.map(v=>+v.toFixed(1)).join(','));
}
//            target tris, rotY, xz scale, y scale, y shift
await variant('hi',{trunkTris:330,copies:[[620,0,1,1,0],[480,1.05,1.2,.78,-.2],[380,2.6,1.35,.55,-.3]],barkW:256,barkH:512,needlePx:512,colours:96});
await variant('lo',{trunkTris:130,copies:[[300,0,1.1,1,0],[230,1.3,1.3,.7,-.25]],barkW:128,barkH:256,needlePx:256,colours:64});
await variant('far',{trunkTris:50,copies:[[130,0,1.15,1,0],[100,1.4,1.4,.65,-.3]],barkW:64,barkH:128,needlePx:128,colours:32});   // far-range copy (~250 triangles)
