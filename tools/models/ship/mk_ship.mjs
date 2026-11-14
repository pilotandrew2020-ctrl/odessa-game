// mk_ship.mjs <dumpdir> <outdir> — the owner's Cruise.zip (a 505 m SketchUp liner) as game GLBs: the triangle soup (see tools/models/dump_cruise.py) is welded, simplified with meshopt (colours as attributes),
// cut into tiles along the length (frustum culling) and written with COLOR_0 only (no textures: 246 materials baked to vertex colours = one draw call per tile), plus a far version.
import {Document,NodeIO} from '@gltf-transform/core';
import {MeshoptSimplifier} from './build_lib.mjs';
import fs from 'fs';
const dir=process.argv[2],out=process.argv[3];fs.mkdirSync(out,{recursive:true});
const rd=(f,T)=>{const b=fs.readFileSync(dir+'/'+f);return new T(b.buffer,b.byteOffset,b.byteLength/T.BYTES_PER_ELEMENT)};
const pos=rd('pos.f32',Float32Array),sz=rd('size.f32',Float32Array),col=rd('col.u8',Uint8Array),gl=rd('glass.u8',Uint8Array),NT=gl.length;
await MeshoptSimplifier.ready;
function weld(sel,minSize){minSize=minSize||0;const map=new Map(),P=[],C=[],I=[];for(let t=0;t<NT;t++){if(!sel(gl[t])||sz[t]<minSize)continue;for(let k=0;k<3;k++){const v=t*3+k,x=pos[v*3],y=pos[v*3+1],z=pos[v*3+2],key=Math.round(x*500)+','+Math.round(y*500)+','+Math.round(z*500)+','+(col[v*3]>>3)+','+(col[v*3+1]>>3)+','+(col[v*3+2]>>3);let i=map.get(key);if(i===undefined){i=P.length/3;map.set(key,i);P.push(x,y,z);C.push(col[v*3],col[v*3+1],col[v*3+2])}I.push(i)}}return {P:Float32Array.from(P),C:Uint8Array.from(C),I:Uint32Array.from(I)}}
function simp(g,tris,err){if(g.I.length/3<=tris)return g;const a=new Float32Array(g.C.length);for(let i=0;i<a.length;i++)a[i]=g.C[i]/255;const [idx]=MeshoptSimplifier.simplifyWithAttributes(g.I,g.P,3,a,3,[.04,.04,.04],null,tris*3,err,[]);
  const map=new Int32Array(g.P.length/3).fill(-1),P=[],C=[];let n=0;const I=new Uint32Array(idx.length);for(let i=0;i<idx.length;i++){const v=idx[i];if(map[v]<0){map[v]=n++;P.push(g.P[v*3],g.P[v*3+1],g.P[v*3+2]);C.push(g.C[v*3],g.C[v*3+1],g.C[v*3+2])}I[i]=map[v]}return {P:Float32Array.from(P),C:Uint8Array.from(C),I}}
function tiles(g,n,zmin,zmax){const out=[];for(let k=0;k<n;k++)out.push([]);const w=(zmax-zmin)/n;for(let t=0;t<g.I.length;t+=3){const z=(g.P[g.I[t]*3+2]+g.P[g.I[t+1]*3+2]+g.P[g.I[t+2]*3+2])/3;out[Math.max(0,Math.min(n-1,Math.floor((z-zmin)/w)))].push(g.I[t],g.I[t+1],g.I[t+2])}
  return out.map(ix=>{const map=new Map(),P=[],C=[],I=[];for(const v of ix){let i=map.get(v);if(i===undefined){i=P.length/3;map.set(v,i);P.push(g.P[v*3],g.P[v*3+1],g.P[v*3+2]);C.push(g.C[v*3],g.C[v*3+1],g.C[v*3+2])}I.push(i)}return {P:Float32Array.from(P),C:Uint8Array.from(C),I:Uint32Array.from(I)}})}
async function write(file,parts,glass){const D=new Document(),buf=D.createBuffer(),sc=D.createScene('s'),ac=(t,a)=>D.createAccessor().setType(t).setArray(a).setBuffer(buf);
  const mat=D.createMaterial('hull').setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(.75).setDoubleSided(true);
  const gm=D.createMaterial('glass').setBaseColorFactor([.55,.75,.9,.35]).setAlphaMode('BLEND').setMetallicFactor(.1).setRoughnessFactor(.1).setDoubleSided(true);let tris=0;
  const add=(name,g,m)=>{if(!g.I.length)return;const p=D.createPrimitive().setAttribute('POSITION',ac('VEC3',g.P)).setAttribute('COLOR_0',ac('VEC3',g.C).setNormalized(true)).setIndices(ac('SCALAR',g.P.length/3>65535?g.I:Uint16Array.from(g.I))).setMaterial(m);sc.addChild(D.createNode(name).setMesh(D.createMesh(name).addPrimitive(p)));tris+=g.I.length/3};
  parts.forEach((g,i)=>add('hull'+i,g,mat));if(glass)add('glass',glass,gm);await new NodeIO().write(file,D);console.log(file,'tris',tris,'KB',Math.round(fs.statSync(file).size/1024))}
const solidN=weld(g=>!g,Number(process.argv[6]||1.2)),solidF=weld(g=>!g,Number(process.argv[7]||8)),glass=weld(g=>!!g,.8);const solid=solidN;console.log('welded solid tris',solid.I.length/3,'verts',solid.P.length/3,'glass tris',glass.I.length/3);
const near=simp(solid,Number(process.argv[4]||110000),.35),far=simp(solidF,Number(process.argv[5]||14000),.9),gnear=simp(glass,3500,.05);
let zmin=1e9,zmax=-1e9;for(let i=2;i<near.P.length;i+=3){zmin=Math.min(zmin,near.P[i]);zmax=Math.max(zmax,near.P[i])}
await write(out+'/cruise_ship.glb',tiles(near,8,zmin,zmax),gnear);await write(out+'/cruise_ship_far.glb',[far],null);
