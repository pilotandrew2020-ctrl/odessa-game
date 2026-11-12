import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import fs from 'fs';
export const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
// multiply 4x4 column-major
const mm=(a,b)=>{const o=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o};
export function parts(doc){
  const out=[];
  for(const node of doc.getRoot().listNodes()){const mesh=node.getMesh();if(!mesh)continue;
    const M=node.getWorldMatrix();
    // normal matrix = inverse transpose of upper 3x3 (assume uniform-ish: normalise afterwards); use cofactor
    const m=M;const c=[ m[5]*m[10]-m[6]*m[9], m[6]*m[8]-m[4]*m[10], m[4]*m[9]-m[5]*m[8],  m[2]*m[9]-m[1]*m[10], m[0]*m[10]-m[2]*m[8], m[1]*m[8]-m[0]*m[9],  m[1]*m[6]-m[2]*m[5], m[2]*m[4]-m[0]*m[6], m[0]*m[5]-m[1]*m[4] ];
    for(const p of mesh.listPrimitives()){
      const P=p.getAttribute('POSITION'),N=p.getAttribute('NORMAL'),T=p.getAttribute('TEXCOORD_0'),I=p.getIndices();
      const n=P.getCount();const pos=new Float32Array(n*3),nrm=new Float32Array(n*3),uv=new Float32Array(n*2);
      const v=[0,0,0];
      for(let i=0;i<n;i++){P.getElement(i,v);
        pos[i*3]=M[0]*v[0]+M[4]*v[1]+M[8]*v[2]+M[12];pos[i*3+1]=M[1]*v[0]+M[5]*v[1]+M[9]*v[2]+M[13];pos[i*3+2]=M[2]*v[0]+M[6]*v[1]+M[10]*v[2]+M[14];
        if(N){N.getElement(i,v);let x=c[0]*v[0]+c[3]*v[1]+c[6]*v[2],y=c[1]*v[0]+c[4]*v[1]+c[7]*v[2],z=c[2]*v[0]+c[5]*v[1]+c[8]*v[2];const l=Math.hypot(x,y,z)||1;nrm[i*3]=x/l;nrm[i*3+1]=y/l;nrm[i*3+2]=z/l}
        if(T){T.getElement(i,v);uv[i*2]=v[0];uv[i*2+1]=v[1]}}
      const idx=I?Uint32Array.from(I.getArray()):Uint32Array.from({length:n},(_,i)=>i);
      const mat=p.getMaterial();
      out.push({m:mat,node:node.getName(),mat:mat&&mat.getName(),alphaMode:mat&&mat.getAlphaMode(),cutoff:mat&&mat.getAlphaCutoff(),ds:mat&&mat.getDoubleSided(),tex:mat&&mat.getBaseColorTexture(),pos,nrm,uv,idx,hasN:!!N})}}
  return out}
export function bounds(p){const b=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(let i=0;i<p.pos.length;i+=3)for(let k=0;k<3;k++){b[k]=Math.min(b[k],p.pos[i+k]);b[k+3]=Math.max(b[k+3],p.pos[i+k])}return b}
// connected components over triangles by shared vertex index (after position+uv weld)
export function components(p){
  const n=p.pos.length/3;const key=new Map();const rep=new Int32Array(n);
  for(let i=0;i<n;i++){const k=Math.round(p.pos[i*3]*1e4)+','+Math.round(p.pos[i*3+1]*1e4)+','+Math.round(p.pos[i*3+2]*1e4);let r=key.get(k);if(r===undefined){key.set(k,i);r=i}rep[i]=r}
  const par=new Int32Array(n).map((_,i)=>i);const find=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a]}return a};
  for(let t=0;t<p.idx.length;t+=3){const a=find(rep[p.idx[t]]),b=find(rep[p.idx[t+1]]),c=find(rep[p.idx[t+2]]);par[b]=a;par[c]=a}
  const comp=new Map();const triComp=[];
  for(let t=0;t<p.idx.length;t+=3){const r=find(rep[p.idx[t]]);let id=comp.get(r);if(id===undefined){id=comp.size;comp.set(r,id)}triComp.push(id)}
  return {count:comp.size,triComp}}
