// usage: node mk_car.mjs <config.json>   builds a game-ready car GLB (body + 4 wheel pivots) from a Sketchfab download
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {io,parts,bounds} from './lib.mjs';
import {texBuf,weld,simplify,stats,smoothNormals,mergeGeo} from './build_lib.mjs';
import fs from 'fs';
const C=JSON.parse(fs.readFileSync(process.argv[2]));
const doc=await io.read(C.src);const P=parts(doc);
const s=C.scale,[ox,oy,oz]=C.origin;       // source -> game: p' = (p - origin)*scale ; origin = (centre line x, ground y, wheelbase centre z)
const X=(g)=>{for(let i=0;i<g.pos.length;i+=3){g.pos[i]=(g.pos[i]-ox)*s*(C.mirrorX?-1:1);g.pos[i+1]=(g.pos[i+1]-oy)*s;g.pos[i+2]=(g.pos[i+2]-oz)*s*(C.flipZ?-1:1)}
  for(let i=0;i<g.nrm.length;i+=3){if(C.mirrorX)g.nrm[i]=-g.nrm[i];if(C.flipZ)g.nrm[i+2]=-g.nrm[i+2]}
  if(!!C.mirrorX!==!!C.flipZ){for(let i=0;i<g.idx.length;i+=3){const t=g.idx[i+1];g.idx[i+1]=g.idx[i+2];g.idx[i+2]=t}}};   // a mirror flips the winding
// wheels (source coordinates): [name, cx, cy, cz, radius, halfWidth]
const W=C.wheels.map(([name,cx,cy,cz,r,hw])=>({name,cx,cy,cz,r,hw,tris:new Map()}));   // tris: material key -> {part, list of triangle indices}
const body=new Map();   // key -> [part,tris]
const maxDim=C.maxWheelPart||1.0;const axle=C.axleRe?new RegExp(C.axleRe,'i'):null;
const dropRe=C.dropRe?new RegExp(C.dropRe,'i'):null;
let nBody=0,nWheel=0,nDrop=0;
for(const p of P){
  const b=bounds(p);const big=Math.max(b[3]-b[0],b[4]-b[1],b[5]-b[2])>maxDim;const isAxle=axle&&(axle.test(p.node)||axle.test(String(p.mat)));
  const key=String(p.mat);
  if(dropRe&&(dropRe.test(p.node)||dropRe.test(key))){nDrop+=p.idx.length/3;continue}
  for(let t=0;t<p.idx.length;t+=3){
    const a=p.idx[t],b2=p.idx[t+1],c=p.idx[t+2];
    const cx=(p.pos[a*3]+p.pos[b2*3]+p.pos[c*3])/3,cy=(p.pos[a*3+1]+p.pos[b2*3+1]+p.pos[c*3+1])/3,cz=(p.pos[a*3+2]+p.pos[b2*3+2]+p.pos[c*3+2])/3;
    let w=null;
    if(!big||isAxle)for(const q of W){if(Math.abs(cx-q.cx)<q.hw&&Math.hypot(cy-q.cy,cz-q.cz)<q.r*1.06){w=q;break}}
    const tgt=w?w.tris:body;let e=tgt.get(key);if(!e){e={parts:new Map()};tgt.set(key,e)}
    let pl=e.parts.get(p);if(!pl)e.parts.set(p,pl=[]);pl.push(t);
    if(w)nWheel++;else nBody++}}
console.log('triangles: body',nBody,'wheels',nWheel,'dropped',nDrop);
// gather a material group into one geometry
const gather=(e)=>{const gs=[];for(const [p,list] of e.parts){const idx=[];for(const t of list)idx.push(p.idx[t],p.idx[t+1],p.idx[t+2]);
    const map=new Map(),pos=[],nrm=[],uv=[];const ni=[];for(const i of idx){let k=map.get(i);if(k===undefined){k=pos.length/3;map.set(i,k);pos.push(p.pos[i*3],p.pos[i*3+1],p.pos[i*3+2]);nrm.push(p.nrm[i*3],p.nrm[i*3+1],p.nrm[i*3+2]);uv.push(p.uv[i*2],p.uv[i*2+1])}ni.push(k)}
    gs.push({pos:Float32Array.from(pos),nrm:Float32Array.from(nrm),uv:Float32Array.from(uv),idx:Uint32Array.from(ni)})}
  return gs.length===1?gs[0]:mergeGeo(gs)};
const texCache=new Map();
async function tex(p,alpha){const t=p.tex;if(!t)return null;let tm=texCache.get(t);if(!tm)texCache.set(t,tm=new Map());if(tm.has(alpha))return tm.get(alpha);
  const sz=t.getSize();const mx=C.maxTex||512;const sc=Math.min(1,mx/Math.max(sz[0],sz[1]));const w=Math.max(16,Math.round(sz[0]*sc)),h=Math.max(16,Math.round(sz[1]*sc));
  const r=await texBuf(Buffer.from(t.getImage()),{w,h,fmt:alpha?'png':'jpg',q:78,colours:128,bleed:!!alpha});tm.set(alpha,r);return r}
const out=new Document(),buf=out.createBuffer(),scene=out.createScene('s');const mats=new Map();
const acc=(t,a)=>out.createAccessor().setType(t).setArray(a).setBuffer(buf);
async function mat(p){const name=(C.rename&&C.rename[p.mat])||String(p.mat);let m=mats.get(name);if(m)return m;
  const src=p.m,bf=src.getBaseColorFactor(),alpha=src.getAlphaMode()!=='OPAQUE';
  m=out.createMaterial(name).setBaseColorFactor(bf).setMetallicFactor(Math.min(src.getMetallicFactor(),.6)).setRoughnessFactor(Math.max(src.getRoughnessFactor(),.25)).setDoubleSided(true);
  if(alpha||bf[3]<.99){m.setAlphaMode('BLEND')}
  const e=src.getEmissiveFactor();if(e[0]+e[1]+e[2]>0)m.setEmissiveFactor(e);
  const t=await tex(p,alpha||bf[3]<.99);if(t)m.setBaseColorTexture(out.createTexture(name+'_c').setImage(t.buf).setMimeType(t.mime));
  mats.set(name,m);return m}
const addPrims=async(mesh,groups,targetTris)=>{const total=[...groups.values()].reduce((a,e)=>a+[...e.parts.values()].reduce((b,l)=>b+l.length,0),0);let tt=0;
  for(const [key,e] of groups){const g0=gather(e);const first=[...e.parts.keys()][0];X(g0);let g=weld(g0,1e-5);const n0=stats(g).tris;
    const want=Math.max(C.minGroup||24,Math.round(n0*Math.min(1,targetTris/total)));g=simplify(g,want,C.err||.04,.5);if(stats(g).tris>want*1.4)g=simplify(g,want,.3,.08);
    if(process.env.DBG)console.log("grp",key.padEnd(30),"n0",n0,"want",want,"got",stats(g).tris);tt+=stats(g).tris;const idx=g.pos.length/3>65535?g.idx:Uint16Array.from(g.idx);
    mesh.addPrimitive(out.createPrimitive().setAttribute('POSITION',acc('VEC3',g.pos)).setAttribute('NORMAL',acc('VEC3',g.nrm)).setAttribute('TEXCOORD_0',acc('VEC2',g.uv)).setIndices(acc('SCALAR',idx)).setMaterial(await mat(first)))}
  return tt};
const bodyMesh=out.createMesh('body');const bt=await addPrims(bodyMesh,body,C.bodyTris||24000);scene.addChild(out.createNode('body').setMesh(bodyMesh));
let wt=0;const wheelInfo=[];
for(const q of W){const m=out.createMesh(q.name);const centre=[(q.cx-ox)*s*(C.mirrorX?-1:1),(q.cy-oy)*s,(q.cz-oz)*s*(C.flipZ?-1:1)];
  // wheel geometry relative to its centre
  for(const e of q.tris.values()){}
  const groups=q.tris;
  // shift: temporarily wrap X so the wheel's own vertices end up centred on (0,0,0)
  const ox0=ox,oy0=oy,oz0=oz;
  const Xw=(g)=>{X(g);for(let i=0;i<g.pos.length;i+=3){g.pos[i]-=centre[0];g.pos[i+1]-=centre[1];g.pos[i+2]-=centre[2]}};
  const saveX=X;
  // inline add with centring
  const total=[...groups.values()].reduce((a,e)=>a+[...e.parts.values()].reduce((b,l)=>b+l.length,0),0);
  for(const [key,e] of groups){const g0=gather(e);const first=[...e.parts.keys()][0];Xw(g0);let g=weld(g0,1e-5);const n0=stats(g).tris;
    g=simplify(g,Math.max(24,Math.round(n0*Math.min(1,(C.wheelTris||900)/total))),.05,.5);wt+=stats(g).tris;
    m.addPrimitive(out.createPrimitive().setAttribute('POSITION',acc('VEC3',g.pos)).setAttribute('NORMAL',acc('VEC3',g.nrm)).setAttribute('TEXCOORD_0',acc('VEC2',g.uv)).setIndices(acc('SCALAR',g.pos.length/3>65535?g.idx:Uint16Array.from(g.idx))).setMaterial(await mat(first)))}
  scene.addChild(out.createNode(q.name).setMesh(m).setTranslation(centre));wheelInfo.push([q.name,...centre.map(v=>+v.toFixed(3)),+(q.r*s).toFixed(3)])}
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(C.out,out);
console.log('body tris',bt,'wheel tris',wt,'materials',mats.size,'file',fs.statSync(C.out).size);console.log('wheels [name,x,y,z,r]',JSON.stringify(wheelInfo));
const ex=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(const p of P){const b=bounds(p);for(let k=0;k<3;k++){ex[k]=Math.min(ex[k],b[k]);ex[k+3]=Math.max(ex[k+3],b[k+3])}}
console.log('final size (m): length',((ex[5]-ex[2])*s).toFixed(2),'width',((ex[3]-ex[0])*s).toFixed(2),'height',((ex[4]-ex[1])*s).toFixed(2));
