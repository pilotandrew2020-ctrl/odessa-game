import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptSimplifier,texBuf} from './build_lib.mjs';
import fs from 'fs';
const R=JSON.parse(fs.readFileSync('booba_rig.json'));
const get=n=>R.meshes.find(m=>m.name===n);
const sk=m=>({pos:Float32Array.from(m.pos),uv:Float32Array.from(m.uv||new Array(m.pos.length/3*2).fill(0)),J:Uint16Array.from(m.J),W:Float32Array.from(m.W),idx:Uint32Array.from(m.idx)});
const merge=gs=>{const n=gs.reduce((a,g)=>a+g.pos.length/3,0);const o={pos:new Float32Array(n*3),uv:new Float32Array(n*2),J:new Uint16Array(n*4),W:new Float32Array(n*4),idx:[]};let vo=0;
  for(const g of gs){o.pos.set(g.pos,vo*3);o.uv.set(g.uv,vo*2);o.J.set(g.J,vo*4);o.W.set(g.W,vo*4);for(const i of g.idx)o.idx.push(i+vo);vo+=g.pos.length/3}o.idx=Uint32Array.from(o.idx);return o};
const compactS=(g,idx)=>{const map=new Int32Array(g.pos.length/3).fill(-1),order=[];let n=0;for(const i of idx)if(map[i]<0){map[i]=n++;order.push(i)}
  const o={pos:new Float32Array(n*3),uv:new Float32Array(n*2),J:new Uint16Array(n*4),W:new Float32Array(n*4),idx:Uint32Array.from(idx,i=>map[i])};
  order.forEach((s,k)=>{o.pos.set(g.pos.subarray(s*3,s*3+3),k*3);o.uv.set(g.uv.subarray(s*2,s*2+2),k*2);o.J.set(g.J.subarray(s*4,s*4+4),k*4);o.W.set(g.W.subarray(s*4,s*4+4),k*4)});return o};
const weldS=(g,eps=1e-5)=>{const m=new Map(),keep=[],remap=new Int32Array(g.pos.length/3);
  for(let i=0;i<remap.length;i++){const k=[g.pos[i*3],g.pos[i*3+1],g.pos[i*3+2],g.uv[i*2],g.uv[i*2+1],...g.J.subarray(i*4,i*4+4),...Array.from(g.W.subarray(i*4,i*4+4),w=>Math.round(w*1e3))].map(v=>Math.round(v/eps)).join(',');let r=m.get(k);if(r===undefined){r=keep.length;m.set(k,r);keep.push(i)}remap[i]=r}
  return compactS(g,Uint32Array.from(g.idx,i=>keep[remap[i]]))};
// simplify keeping the ORIGINAL vertices (positions and skin weights untouched): meshopt without update returns indices into the same vertex buffer
const simp=(g,tris,err,uvw=1)=>{if(g.idx.length/3<=tris)return g;const [idx]=MeshoptSimplifier.simplifyWithAttributes(g.idx,g.pos,3,g.uv,2,[uvw,uvw],null,tris*3,err,[]);return compactS(g,idx)};
const smooth=g=>{const key=new Map(),vid=new Int32Array(g.pos.length/3);for(let i=0;i<vid.length;i++){const k=Math.round(g.pos[i*3]*1e4)+','+Math.round(g.pos[i*3+1]*1e4)+','+Math.round(g.pos[i*3+2]*1e4);let r=key.get(k);if(r===undefined){r=key.size;key.set(k,r)}vid[i]=r}
  const acc=new Float32Array(key.size*3);for(let t=0;t<g.idx.length;t+=3){const a=g.idx[t],b=g.idx[t+1],c=g.idx[t+2];const ux=g.pos[b*3]-g.pos[a*3],uy=g.pos[b*3+1]-g.pos[a*3+1],uz=g.pos[b*3+2]-g.pos[a*3+2],vx=g.pos[c*3]-g.pos[a*3],vy=g.pos[c*3+1]-g.pos[a*3+1],vz=g.pos[c*3+2]-g.pos[a*3+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const v of [a,b,c]){const r=vid[v];acc[r*3]+=nx;acc[r*3+1]+=ny;acc[r*3+2]+=nz}}
  const N=new Float32Array(g.pos.length);for(let i=0;i<vid.length;i++){const r=vid[i],l=Math.hypot(acc[r*3],acc[r*3+1],acc[r*3+2])||1;N[i*3]=acc[r*3]/l;N[i*3+1]=acc[r*3+1]/l;N[i*3+2]=acc[r*3+2]/l}return N};
let body=merge([sk(get('Object_218')),sk(get('Object_214')),sk(get('Object_216'))]);
body=weldS(body);const b0=body.idx.length/3;body=simp(body,3600,.03);
let teeth=merge([sk(get('booba_teeth_lower_BoobaTeeth001_0')),sk(get('booba_teeth_upper_BoobaTeeth001_0'))]);teeth=weldS(teeth);teeth=simp(teeth,300,.08,0);
// frame: feet on y=0, pelvis over the origin, 1.25 m tall
let minY=1e9,maxY=-1e9;for(let i=1;i<body.pos.length;i+=3){minY=Math.min(minY,body.pos[i]);maxY=Math.max(maxY,body.pos[i])}
const pel=R.bones.find(b=>b.name==='pelvis'),H=1.25/(maxY-minY),cx=pel.p[0],cz=pel.p[2];
const fix=g=>{for(let i=0;i<g.pos.length;i+=3){g.pos[i]=(g.pos[i]-cx)*H;g.pos[i+1]=(g.pos[i+1]-minY)*H;g.pos[i+2]=(g.pos[i+2]-cz)*H}};fix(body);fix(teeth);
const bn=smooth(body),tn=smooth(teeth);
// bones: rigid world transforms in the final frame
const W=R.bones.map(b=>({name:b.name,parent:b.parent,t:[(b.p[0]-cx)*H,(b.p[1]-minY)*H,(b.p[2]-cz)*H],q:b.q}));   // q = [x,y,z,w]
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qcj=q=>[-q[0],-q[1],-q[2],q[3]];
const qrot=(q,v)=>{const u=[q[0],q[1],q[2]],s=q[3],d=u[0]*v[0]+u[1]*v[1]+u[2]*v[2],c=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];return [2*d*u[0]+(s*s-(u[0]*u[0]+u[1]*u[1]+u[2]*u[2]))*v[0]+2*s*c[0],2*d*u[1]+(s*s-(u[0]*u[0]+u[1]*u[1]+u[2]*u[2]))*v[1]+2*s*c[1],2*d*u[2]+(s*s-(u[0]*u[0]+u[1]*u[1]+u[2]*u[2]))*v[2]+2*s*c[2]]};
const ibmOf=(t,q)=>{const qi=qcj(q),ti=qrot(qi,[-t[0],-t[1],-t[2]]);const x=qrot(qi,[1,0,0]),y=qrot(qi,[0,1,0]),z=qrot(qi,[0,0,1]);   // columns of R^T
  return [x[0],x[1],x[2],0, y[0],y[1],y[2],0, z[0],z[1],z[2],0, ti[0],ti[1],ti[2],1]};
const doc=new Document(),buf=doc.createBuffer(),scene=doc.createScene('s');
const nodes={},skin=doc.createSkin('rig'),ibm=new Float32Array(16*W.length);
W.forEach((b,i)=>{const n=doc.createNode(b.name);const par=b.parent?W.find(p=>p.name===b.parent):null;
  if(par){const pq=par.q,d=[b.t[0]-par.t[0],b.t[1]-par.t[1],b.t[2]-par.t[2]];n.setTranslation(qrot(qcj(pq),d)).setRotation(qmul(qcj(pq),b.q));nodes[par.name].addChild(n)}
  else{n.setTranslation(b.t).setRotation(b.q);scene.addChild(n)}
  nodes[b.name]=n;skin.addJoint(n);ibm.set(ibmOf(b.t,b.q),i*16)});
skin.setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(nodes.pelvis);
const acc=(type,arr)=>doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const prim=(g,N,mat)=>doc.createPrimitive().setAttribute('POSITION',acc('VEC3',g.pos)).setAttribute('NORMAL',acc('VEC3',N)).setAttribute('TEXCOORD_0',acc('VEC2',g.uv)).setAttribute('JOINTS_0',acc('VEC4',Uint8Array.from(g.J))).setAttribute('WEIGHTS_0',acc('VEC4',g.W)).setIndices(acc('SCALAR',Uint16Array.from(g.idx))).setMaterial(mat);
const tex=await texBuf(fs.readFileSync('tex/booba_2.png'),{w:512,h:512,fmt:'png',q:80,colours:160,bleed:true});
const mB=doc.createMaterial('booba').setMetallicFactor(0).setRoughnessFactor(.85).setDoubleSided(true).setAlphaMode('MASK').setAlphaCutoff(.5).setBaseColorTexture(doc.createTexture('booba_c').setImage(tex.buf).setMimeType(tex.mime));
const mT=doc.createMaterial('teeth').setMetallicFactor(0).setRoughnessFactor(.5).setDoubleSided(true);
const mesh=doc.createMesh('Body').addPrimitive(prim(body,bn,mB)).addPrimitive(prim(teeth,tn,mT));
scene.addChild(doc.createNode('Body').setMesh(mesh).setSkin(skin));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await io.write('out/booba_rig.glb',doc);
console.log('body',b0,'->',body.idx.length/3,'verts',body.pos.length/3,'teeth',teeth.idx.length/3,'tex',tex.buf.length,'file',fs.statSync('out/booba_rig.glb').size,'H',H.toFixed(3));
