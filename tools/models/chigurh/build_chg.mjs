import {loadGlb} from './load.mjs';
import {classify} from './label.mjs';
import {MeshoptSimplifier} from './build_lib.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
const SRC=process.argv[2],OUT=process.argv[3];
const m=loadGlb(SRC),P=m.pos,I=m.idx;
// 1. classify triangles, drop the cut parts
const tris=[];const XC=0.025;
for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];const cx=(P[a*3]+P[b*3]+P[c*3])/3,cy=(P[a*3+1]+P[b*3+1]+P[c*3+1])/3,cz=(P[a*3+2]+P[b*3+2]+P[c*3+2])/3;const l=classify([cx,cy,cz]);if(l==='cut')continue;tris.push([a,b,c,l])}
// 2. keep the biggest connected piece (stray blobs go away)
const par=new Map();const f=x=>{while(par.get(x)!==x){par.set(x,par.get(par.get(x)));x=par.get(x)}return x};
for(const [a,b,c] of tris)for(const v of [a,b,c])if(!par.has(v))par.set(v,v);
for(const [a,b,c] of tris){const ra=f(a),rb=f(b),rc=f(c);par.set(rb,ra);par.set(rc,ra)}
const cnt=new Map();for(const [a] of tris){const r=f(a);cnt.set(r,(cnt.get(r)||0)+1)}const big=[...cnt.entries()].sort((x,y)=>y[1]-x[1])[0][0];
const keep=tris.filter(([a])=>f(a)===big);console.log('triangles kept',keep.length,'of',tris.length,'pieces',cnt.size);
// 3. group by material; the right hand is mirrored onto the left sleeve (it held the gun)
const G={skin:[],hair:[],shirt:[],jeans:[],shoe:[]},MAP={skin:'skin',hand:'skin',hair:'hair',jacket:'shirt',pants:'jeans',boots:'shoe'};
const verts=[];const vid=(x,y,z)=>{verts.push(x,y,z);return verts.length/3-1};
const vcache=new Map();const V=(i)=>{if(vcache.has(i))return vcache.get(i);const r=vid(P[i*3],P[i*3+1],P[i*3+2]);vcache.set(i,r);return r};
for(const [a,b,c,l] of keep){G[MAP[l]].push([V(a),V(b),V(c)]);
  if(l==='hand'){const M=i=>vid(2*XC-P[i*3],P[i*3+1],P[i*3+2]);const ma=M(a),mb=M(b),mc=M(c);G.skin.push([ma,mc,mb])}}
// 4. per group: weld by position, simplify with locked borders, write
const D=new Document(),buf=D.createBuffer(),sc=D.createScene(),mesh=D.createMesh('Body');
const COL={skin:[.8,.55,.45,1],hair:[.2,.12,.07,1],shirt:[.1,.1,.12,1],jeans:[.08,.08,.1,1],shoe:[.3,.18,.1,1]},BUD={skin:12000,hair:3500,shirt:7500,jeans:3500,shoe:1500};
let total=0;
for(const [name,list] of Object.entries(G)){const map=new Map(),pos=[],idx=[];
  for(const tr of list){const ids=tr.map(v=>{const x=verts[v*3],y=verts[v*3+1],z=verts[v*3+2],k=Math.round(x*1e5)+','+Math.round(y*1e5)+','+Math.round(z*1e5);let r=map.get(k);if(r===undefined){r=pos.length/3;map.set(k,r);pos.push(x,y,z)}return r});
    if(ids[0]!==ids[1]&&ids[1]!==ids[2]&&ids[0]!==ids[2])idx.push(...ids)}
  let ix=Uint32Array.from(idx);const p=Float32Array.from(pos);const t0=ix.length/3;
  const [si]=MeshoptSimplifier.simplify(ix,p,3,Math.min(t0,BUD[name])*3,.02,['LockBorder']);
  // compact
  const rm=new Int32Array(p.length/3).fill(-1);let n=0;const P2=[];for(const i of si){if(rm[i]<0){rm[i]=n++;P2.push(p[i*3],p[i*3+1],p[i*3+2])}}
  const I2=Uint32Array.from(si,i=>rm[i]);console.log(name,t0,'->',I2.length/3);total+=I2.length/3;
  const mat=D.createMaterial(name).setBaseColorFactor(COL[name]).setRoughnessFactor(.85).setMetallicFactor(0).setDoubleSided(true);
  mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',D.createAccessor().setType('VEC3').setArray(new Float32Array(P2)).setBuffer(buf)).setIndices(D.createAccessor().setType('SCALAR').setArray(I2).setBuffer(buf)).setMaterial(mat))}
sc.addChild(D.createNode('chigurh').setMesh(mesh));await new NodeIO().write(OUT,D);console.log('tris total',total,OUT)
