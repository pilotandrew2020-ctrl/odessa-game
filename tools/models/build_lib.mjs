import {Document,NodeIO} from '@gltf-transform/core';
import sharp from 'sharp';
import {MeshoptSimplifier} from 'meshoptimizer';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import fs from 'fs';
await MeshoptSimplifier.ready;
export {MeshoptSimplifier};
// ---- textures ----
// bleed opaque colours into transparent texels so bilinear/mip sampling at alpha-tested edges does not pull in black
export async function texBuf(buf,{w,h,fmt='png',q=80,colours=128,bleed=false,flipY=false}){
  let img=sharp(buf).ensureAlpha();
  const meta=await sharp(buf).metadata();
  if(!w){w=meta.width;h=meta.height}
  if(bleed){
    const {data,info}=await img.raw().toBuffer({resolveWithObject:true});const W=info.width,H=info.height;
    const A=new Uint8Array(W*H);for(let i=0;i<W*H;i++)A[i]=data[i*4+3]>8?1:0;
    let cur=A;for(let pass=0;pass<8;pass++){const nxt=new Uint8Array(cur);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(cur[i])continue;let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const j=yy*W+xx;if(cur[j]){r+=data[j*4];g+=data[j*4+1];b+=data[j*4+2];n++}}
      if(n){data[i*4]=r/n;data[i*4+1]=g/n;data[i*4+2]=b/n;nxt[i]=1}}cur=nxt}
    img=sharp(data,{raw:{width:W,height:H,channels:4}});
  }
  img=img.resize(w,h,{kernel:'lanczos3',fit:'fill'});
  if(fmt==='jpg')return {buf:await img.flatten({background:'#808080'}).jpeg({quality:q,mozjpeg:true}).toBuffer(),mime:'image/jpeg',w,h};
  return {buf:await img.png({palette:true,quality:q,colours,effort:10,dither:0}).toBuffer(),mime:'image/png',w,h}}
// ---- geometry helpers ----
export function compact(pos,nrm,uv,idx){const map=new Int32Array(pos.length/3).fill(-1);let n=0;const order=[];
  for(const i of idx){if(map[i]<0){map[i]=n++;order.push(i)}}
  const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);
  order.forEach((o,k)=>{P.set(pos.subarray(o*3,o*3+3),k*3);N.set(nrm.subarray(o*3,o*3+3),k*3);U.set(uv.subarray(o*2,o*2+2),k*2)});
  return {pos:P,nrm:N,uv:U,idx:Uint32Array.from(idx,i=>map[i])}}
export function subsetTris(p,triList){const idx=[];for(const t of triList)idx.push(p.idx[t*3],p.idx[t*3+1],p.idx[t*3+2]);return compact(p.pos,p.nrm,p.uv,idx)}
// weld vertices with identical position+normal+uv (the source files repeat them)
export function weld(g,eps=1e-4){const m=new Map(),remap=new Int32Array(g.pos.length/3);const keep=[];
  for(let i=0;i<remap.length;i++){const k=[g.pos[i*3],g.pos[i*3+1],g.pos[i*3+2],g.nrm[i*3],g.nrm[i*3+1],g.nrm[i*3+2],g.uv[i*2],g.uv[i*2+1]].map(v=>Math.round(v/eps)).join(',');let r=m.get(k);if(r===undefined){r=keep.length;m.set(k,r);keep.push(i)}remap[i]=r}
  return compact(g.pos,g.nrm,g.uv,Uint32Array.from(g.idx,i=>keep[remap[i]]))}
export function simplify(g,targetTris,err=0.05,uvw=0.6,lockBorder=false){
  if(g.idx.length/3<=targetTris)return g;
  const attrs=new Float32Array(g.pos.length/3*2);attrs.set(g.uv);   // uv as attribute so texture seams are respected
  const [idx]=MeshoptSimplifier.simplifyWithAttributes(g.idx,g.pos,3,attrs,2,[uvw,uvw],null,targetTris*3,err,lockBorder?['LockBorder']:[]);
  return compact(g.pos,g.nrm,g.uv,idx)}
export function xform(g,fn){const P=g.pos;for(let i=0;i<P.length;i+=3){const o=fn(P[i],P[i+1],P[i+2]);P[i]=o[0];P[i+1]=o[1];P[i+2]=o[2]}return g}
export function scale(g,s,sy){return xform(g,(x,y,z)=>[x*s,y*(sy||s),z*s])}
export function stats(g){const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(let i=0;i<g.pos.length;i+=3)for(let k=0;k<3;k++){b[k]=Math.min(b[k],g.pos[i+k]);b[k+3]=Math.max(b[k+3],g.pos[i+k])}return {tris:g.idx.length/3,verts:g.pos.length/3,b}}
// ---- GLB writer: nodes=[{name, geo, mat:{name,tex:{buf,mime},alphaMode,cutoff,doubleSided}}]
export async function writeGlb(path,nodes,extras){
  const doc=new Document();const buf=doc.createBuffer();const scene=doc.createScene('s');const mats=new Map();
  for(const nd of nodes){
    const g=nd.geo;const mk=(type,arr,count)=>doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
    const prim=doc.createPrimitive().setAttribute('POSITION',mk('VEC3',g.pos)).setAttribute('NORMAL',mk('VEC3',g.nrm)).setAttribute('TEXCOORD_0',mk('VEC2',g.uv))
      .setIndices(mk('SCALAR',g.pos.length/3>65535?g.idx:Uint16Array.from(g.idx)));
    let m=mats.get(nd.mat.name);
    if(!m){m=doc.createMaterial(nd.mat.name).setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(!!nd.mat.doubleSided);
      if(nd.mat.alphaMode&&nd.mat.alphaMode!=='OPAQUE'){m.setAlphaMode(nd.mat.alphaMode);if(nd.mat.cutoff!=null)m.setAlphaCutoff(nd.mat.cutoff)}
      if(nd.mat.tex){const t=doc.createTexture(nd.mat.name+'_c').setImage(nd.mat.tex.buf).setMimeType(nd.mat.tex.mime);m.setBaseColorTexture(t)}
      mats.set(nd.mat.name,m)}
    prim.setMaterial(m);const mesh=doc.createMesh(nd.name).addPrimitive(prim);
    const node=doc.createNode(nd.name).setMesh(mesh);if(nd.translation)node.setTranslation(nd.translation);scene.addChild(node)}
  if(extras)doc.getRoot().setExtras(extras);
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await io.write(path,doc);return fs.statSync(path).size}
export function smoothNormals(g){const key=new Map(),vid=new Int32Array(g.pos.length/3);
  for(let i=0;i<vid.length;i++){const k=Math.round(g.pos[i*3]*1e4)+','+Math.round(g.pos[i*3+1]*1e4)+','+Math.round(g.pos[i*3+2]*1e4);let r=key.get(k);if(r===undefined){r=key.size;key.set(k,r)}vid[i]=r}
  const acc=new Float32Array(key.size*3);
  for(let t=0;t<g.idx.length;t+=3){const a=g.idx[t],b=g.idx[t+1],c=g.idx[t+2];
    const ux=g.pos[b*3]-g.pos[a*3],uy=g.pos[b*3+1]-g.pos[a*3+1],uz=g.pos[b*3+2]-g.pos[a*3+2],vx=g.pos[c*3]-g.pos[a*3],vy=g.pos[c*3+1]-g.pos[a*3+1],vz=g.pos[c*3+2]-g.pos[a*3+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const v of [a,b,c]){const r=vid[v];acc[r*3]+=nx;acc[r*3+1]+=ny;acc[r*3+2]+=nz}}
  for(let i=0;i<vid.length;i++){const r=vid[i];const l=Math.hypot(acc[r*3],acc[r*3+1],acc[r*3+2])||1;g.nrm[i*3]=acc[r*3]/l;g.nrm[i*3+1]=acc[r*3+1]/l;g.nrm[i*3+2]=acc[r*3+2]/l}return g}
export function mergeGeo(gs){const n=gs.reduce((a,g)=>a+g.pos.length/3,0),ni=gs.reduce((a,g)=>a+g.idx.length,0);const pos=new Float32Array(n*3),nrm=new Float32Array(n*3),uv=new Float32Array(n*2),idx=new Uint32Array(ni);let vo=0,io2=0;
  for(const g of gs){pos.set(g.pos,vo*3);nrm.set(g.nrm,vo*3);uv.set(g.uv,vo*2);for(const i of g.idx)idx[io2++]=i+vo;vo+=g.pos.length/3}return {pos,nrm,uv,idx}}
