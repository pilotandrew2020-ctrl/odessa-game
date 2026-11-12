import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {texBuf} from './build_lib.mjs';
import {io as rio,parts} from './lib.mjs';
import fs from 'fs';
const SRC=process.argv[2]||'nolik_12000.json',WF=process.argv[3]||'nolik_w.json',OUT=process.argv[4]||'out/nolik_rig.glb',H=+process.argv[5]||1.2;
const g=JSON.parse(fs.readFileSync(SRC)),W=JSON.parse(fs.readFileSync(WF));
const pos=Float32Array.from(g.pos),nrm=Float32Array.from(g.nrm),uv=Float32Array.from(g.uv),idx=Uint32Array.from(g.idx);
let maxY=-1e9;for(let i=1;i<pos.length;i+=3)maxY=Math.max(maxY,pos[i]);const S=H/maxY;
for(let i=0;i<pos.length;i++)pos[i]*=S;
const n=pos.length/3,J=new Uint8Array(n*4),Wt=new Float32Array(n*4);
for(let i=0;i<n;i++)for(let k=0;k<4;k++){J[i*4+k]=W.J[i][k];Wt[i*4+k]=W.W[i][k]}
const doc=new Document(),buf=doc.createBuffer(),scene=doc.createScene('s');
const joint={};for(const [nm,par,p] of W.bones)joint[nm]=p.map(v=>v*S);
const nodes={},skin=doc.createSkin('rig'),ibm=new Float32Array(16*W.names.length);
W.names.forEach((nm,i)=>{const [name,par,p]=W.bones.find(b=>b[0]===nm);const n=doc.createNode(nm);const jp=joint[nm];
  if(par){const pp=joint[par];n.setTranslation([jp[0]-pp[0],jp[1]-pp[1],jp[2]-pp[2]]);nodes[par].addChild(n)}else{n.setTranslation(jp);scene.addChild(n)}
  nodes[nm]=n;skin.addJoint(n);ibm.set([1,0,0,0, 0,1,0,0, 0,0,1,0, -jp[0],-jp[1],-jp[2],1],i*16)});   // identity rotations: the inverse bind matrix is just the negated joint position
skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(nodes.pelvis);
const acc=(t,a)=>doc.createAccessor().setType(t).setArray(a).setBuffer(buf);
const rawTex=Buffer.from((await rio.read((process.env.SRC||'src')+'/nolik.glb')).getRoot().listMaterials()[0].getBaseColorTexture().getImage());
const tex=await texBuf(rawTex,{w:1024,h:1024,fmt:'jpg',q:82});
const mat=doc.createMaterial('nolik').setMetallicFactor(0).setRoughnessFactor(.8).setDoubleSided(true).setBaseColorTexture(doc.createTexture('nolik_c').setImage(tex.buf).setMimeType(tex.mime));
const prim=doc.createPrimitive().setAttribute('POSITION',acc('VEC3',pos)).setAttribute('NORMAL',acc('VEC3',nrm)).setAttribute('TEXCOORD_0',acc('VEC2',uv)).setAttribute('JOINTS_0',acc('VEC4',J)).setAttribute('WEIGHTS_0',acc('VEC4',Wt)).setIndices(acc('SCALAR',n>65535?idx:Uint16Array.from(idx))).setMaterial(mat);
scene.addChild(doc.createNode('Body').setMesh(doc.createMesh('Body').addPrimitive(prim)).setSkin(skin));
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(OUT,doc);console.log('tris',idx.length/3,'verts',n,'tex',tex.buf.length,'file',fs.statSync(OUT).size,'S',S.toFixed(3));
