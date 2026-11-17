// Builds assets/models/cobra.glb from the owner's 0.obj (AH-1 Cobra, Rhino export, no textures): run from a folder with @gltf-transform/core + meshoptimizer installed. See assets/IMPORTS.md
import fs from 'fs';
import {Document,NodeIO} from '@gltf-transform/core';
import {MeshoptSimplifier} from 'meshoptimizer';
await MeshoptSimplifier.ready;
const L=fs.readFileSync('/tmp/s/zip/0.obj','utf8').split('\n');
const V=[],F=[];for(const l of L){if(l[0]==='v'&&l[1]===' ')V.push(l.split(' ').slice(1,4).map(Number));else if(l[0]==='f')F.push(l.trim().split(/\s+/).slice(1).map(x=>parseInt(x)-1))}
const par=Int32Array.from({length:V.length},(_,i)=>i);const find=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a]}return a};
for(const f of F)for(let i=1;i<f.length;i++){const a=find(f[0]),b=find(f[i]);if(a!==b)par[a]=b}
const C=new Map();for(const f of F){const r=find(f[0]);let c=C.get(r);if(!c){c={f:[],mn:[1e9,1e9,1e9],mx:[-1e9,-1e9,-1e9]};C.set(r,c)}c.f.push(f);for(const i of f)for(let k=0;k<3;k++){c.mn[k]=Math.min(c.mn[k],V[i][k]);c.mx[k]=Math.max(c.mx[k],V[i][k])}}
const cls=c=>{const e=c.mx.map((x,i)=>x-c.mn[i]),ce=c.mn.map((x,i)=>(x+c.mx[i])/2),big=Math.max(...e);
  if(c.mn[1]>=64&&c.mx[0]<150)return 'main';                               // blades (y 65-67)
  if(c.mn[0]>195&&c.mn[1]>29&&c.mn[2]>=2.5)return 'tail';                    // tail rotor hub + blades (left of the fin)
  if(c.mn[0]>-14&&c.mx[0]<62&&c.mn[1]>8&&c.mx[1]<47&&c.f.length>400&&e[0]>60&&e[1]>25)return 'glass';
  if(big<6||ce[1]<3)return 'dark';return 'olive'};
const G={olive:[],dark:[],glass:[],main:[],tail:[]};for(const c of C.values())G[cls(c)].push(...c.f);
for(const k in G)console.log(k,G[k].length);
const K=13.5/271,ROT=1.4,HUB=[56.5,66,0],TH=[217,52,3.5],OFFX=42,OFFY=-2.3;
// glb (x tail,y up,z left) -> game (x left, y up, z nose): gx=z, gz=-(x-OFFX) ; scaled, pilot's seat x=OFFX at z=.95
const toGame=(p,extra)=>[p[2]*K,(p[1]-OFFY)*K-1.25,-(p[0]-OFFX)*K+.95];
function build(faces,target,tf){const map=new Map(),P=[],I=[];const vid=i=>{const p=V[i],key=p[0].toFixed(3)+','+p[1].toFixed(3)+','+p[2].toFixed(3);let id=map.get(key);if(id===undefined){id=P.length/3;map.set(key,id);const q=tf(p);P.push(q[0],q[1],q[2])}return id};
  for(const f of faces)for(let i=1;i<f.length-1;i++)I.push(vid(f[0]),vid(f[i]),vid(f[i+1]));
  let pos=new Float32Array(P),idx=new Uint32Array(I);
  if(idx.length/3>target){const [out]=MeshoptSimplifier.simplify(idx,pos,3,Math.floor(target*3/3)*3,.05,['LockBorder']);idx=out}
  // compact
  const re=new Int32Array(pos.length/3).fill(-1);let n=0;const P2=[];const idx2=new Uint32Array(idx.length);for(let i=0;i<idx.length;i++){const v=idx[i];if(re[v]<0){re[v]=n++;P2.push(pos[v*3],pos[v*3+1],pos[v*3+2])}idx2[i]=re[v]}
  const pp=new Float32Array(P2),N=new Float32Array(pp.length);
  for(let i=0;i<idx2.length;i+=3){const a=idx2[i]*3,b=idx2[i+1]*3,c=idx2[i+2]*3;const ux=pp[b]-pp[a],uy=pp[b+1]-pp[a+1],uz=pp[b+2]-pp[a+2],vx=pp[c]-pp[a],vy=pp[c+1]-pp[a+1],vz=pp[c+2]-pp[a+2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const o of [a,b,c]){N[o]+=nx;N[o+1]+=ny;N[o+2]+=nz}}
  for(let i=0;i<N.length;i+=3){const l=Math.hypot(N[i],N[i+1],N[i+2])||1;N[i]/=l;N[i+1]/=l;N[i+2]/=l}
  return {pos:pp,nrm:N,idx:idx2}}
const hubG=toGame(HUB),tailG=toGame(TH);
const rel=(c,s)=>p=>{const g=toGame(p);return [(g[0]-c[0])*s+0,(g[1]-c[1])*s,(g[2]-c[2])*s]};
const out={
  olive:build(G.olive,26000,toGame),dark:build(G.dark,9000,toGame),glass:build(G.glass,1800,toGame),
  main:build(G.main,2500,rel(hubG,ROT)),
  tail:build(G.tail,2500,p=>{const g=toGame(p);const w=[g[0]-tailG[0],g[1]-tailG[1],g[2]-tailG[2]];return [-w[2],w[1],w[0]]})};   // local frame of the tail group: local z = world x
const doc=new Document(),buf=doc.createBuffer(),sc=doc.createScene('s');
const mat=(n,c,r,m,a)=>{const x=doc.createMaterial(n).setBaseColorFactor(c).setRoughnessFactor(r).setMetallicFactor(m);if(a){x.setAlphaMode('BLEND')}return x};
const M={olive:mat('olive',[.075,.095,.055,1],.55,.25),dark:mat('dark',[.012,.013,.015,1],.6,.3),glass:mat('glass',[.2,.32,.4,.38],.12,.1,true),main:mat('blade',[.015,.016,.018,1],.7,.2),tail:mat('blade',[.015,.016,.018,1],.7,.2)};
let tris=0;for(const k of Object.keys(out)){const o=out[k];tris+=o.idx.length/3;
  const prim=doc.createPrimitive().setMaterial(M[k]).setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(o.pos).setBuffer(buf)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(o.nrm).setBuffer(buf)).setIndices(doc.createAccessor().setType('SCALAR').setArray(o.idx).setBuffer(buf));
  const nd=doc.createNode(k).setMesh(doc.createMesh(k).addPrimitive(prim));if(k==='main')nd.setTranslation(hubG);if(k==='tail')nd.setTranslation(tailG);sc.addChild(nd)}
console.log('tris',tris,'hub',hubG.map(x=>x.toFixed(2)),'tail',tailG.map(x=>x.toFixed(2)));
await new NodeIO().write('/tmp/s/cob/cobra.glb',doc);console.log(fs.statSync('/tmp/s/cob/cobra.glb').size);
