import {loadGlb} from './load.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
import fs from 'fs';
export const COL={hand:[.85,.6,.5],cut:[1,0,0],boots:[.4,.25,.1],pants:[.1,.1,.12],jacket:[.2,.3,.5],shirt:[.5,.35,.2],skin:[.85,.6,.5],hair:[.3,.18,.08]};
// classify one triangle by its centroid (c) and normal (nz)
export function classify(c){const [x,y,z]=c;
  // v2: the TRELLIS head is replaced by a real head, so everything above the collar goes
  if(z<-0.095&&y<0.08)return 'cut';
  if(x<-0.13&&y<-0.06)return 'cut';
  if(y<-0.474)return 'cut';
  if(x>0.2&&y<-0.065&&y>-0.2&&z>-0.08)return 'hand';
  if(y<-0.40)return (x>0.215||x<-0.14)?'cut':'boots';
  if(y<-0.105)return 'pants';
  if(y>0.235)return 'cut';
  return 'jacket';
}
export function build(path,out){const m=loadGlb(path),P=m.pos,I=m.idx;const pos=[],col=[],lab=[];const cnt={};
  for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3;const cx=(P[a]+P[b]+P[c])/3,cy=(P[a+1]+P[b+1]+P[c+1])/3,cz=(P[a+2]+P[b+2]+P[c+2])/3;const l=classify([cx,cy,cz]);cnt[l]=(cnt[l]||0)+1;if(l==='cut')continue;
    for(const v of [a,b,c]){pos.push(P[v],P[v+1],P[v+2]);col.push(...COL[l],1)}}
  console.log(cnt);const D=new Document(),buf=D.createBuffer(),sc=D.createScene();
  const pr=D.createPrimitive().setAttribute('POSITION',D.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf)).setAttribute('COLOR_0',D.createAccessor().setType('VEC4').setArray(new Float32Array(col)).setBuffer(buf)).setMaterial(D.createMaterial('m'));
  sc.addChild(D.createNode('n').setMesh(D.createMesh('mm').addPrimitive(pr)));return new NodeIO().write(out,D)}
if(process.argv[1].endsWith('label.mjs'))await build('/home/user/odessa-game/tests/out/wm.glb','/home/user/odessa-game/tests/out/lab.glb');
