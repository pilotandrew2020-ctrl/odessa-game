// mk_char.mjs <config.json> — turns a character GLB into a body type of the game (assets/models/avatar/<Name>.glb): the 22 bones REAL.tick drives (pelvis, spine_01-03, neck_01, Head, clavicle /
// upperarm / lowerarm / hand, thigh / calf / foot / ball, left and right), identity bone rotations (the inverse bind matrix is just the negated joint position, like Nolik), the character facing +z,
// arms lowered to ~14 deg from the body (a T-pose / A-pose rest would make the game's walking swing wrong), feet on y=0, decimated per material, textures <= texPx.
// Two kinds of source:
//   skinned:  "keep": {boneName: regex on the source joint names}  -> every other source joint hands its skin weights to its nearest kept ancestor (a facial bone -> Head, a cape bone -> spine_03 ...)
//   static:   "static": true, "joints": {boneName: [x,y,z]} in the model's own world frame (read from a render), "parts": {meshNodeName: boneName} for rigid parts (Steve), the rest is weighted
//             automatically by the distance to the bone segments.
// config: src, out, height (m), armDeg, texPx, tris (total triangle budget), flat (flat shading, for blocky models), nearest (pixel textures), noSimp [regex of materials never decimated],
//         tex {materialName: px}, faceYaw (degrees, when there are no foot bones to tell the facing), hide [regex of materials to drop]
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {io as rio} from './lib.mjs';
import {texBuf,MeshoptSimplifier} from './build_lib.mjs';
import fs from 'fs';
const C=JSON.parse(fs.readFileSync(process.argv[2]));
const ORDER=['pelvis','spine_01','spine_02','spine_03','neck_01','Head','clavicle_l','upperarm_l','lowerarm_l','hand_l','thigh_l','calf_l','foot_l','ball_l','clavicle_r','upperarm_r','lowerarm_r','hand_r','thigh_r','calf_r','foot_r','ball_r'];
const PARENT={pelvis:null,spine_01:'pelvis',spine_02:'spine_01',spine_03:'spine_02',neck_01:'spine_03',Head:'neck_01'};
for(const s of ['l','r']){Object.assign(PARENT,{['clavicle_'+s]:'spine_03',['upperarm_'+s]:'clavicle_'+s,['lowerarm_'+s]:'upperarm_'+s,['hand_'+s]:'lowerarm_'+s,['thigh_'+s]:'pelvis',['calf_'+s]:'thigh_'+s,['foot_'+s]:'calf_'+s,['ball_'+s]:'foot_'+s})}
const IDX=Object.fromEntries(ORDER.map((n,i)=>[n,i]));
// ---- small vector / matrix helpers (column-major 4x4 like glTF)
const mulV=(m,x,y,z)=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
const mulM=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o};
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.hypot(a[0],a[1],a[2]),norm=a=>mul(a,1/(len(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const rodrigues=(axis,ang)=>{const k=norm(axis),c=Math.cos(ang),s=Math.sin(ang),t=1-c;return v=>{const d=dot(k,v),cr=cross(k,v);return [v[0]*c+cr[0]*s+k[0]*d*t,v[1]*c+cr[1]*s+k[1]*d*t,v[2]*c+cr[2]*s+k[2]*d*t]}};
const fromTo=(u,v)=>{const a=norm(u),b=norm(v),ax=cross(a,b),l=len(ax);if(l<1e-6)return p=>p;return rodrigues(ax,Math.atan2(l,dot(a,b)))};
// ---- read the source
const doc=await rio.read(C.src),root=doc.getRoot();
const hideRe=C.hide?new RegExp(C.hide,'i'):null;
const F32=(acc,n)=>{if(!acc)return null;const a=acc.getArray();if(a instanceof Float32Array)return a;const o=new Float32Array(acc.getCount()*n),e=[];for(let i=0;i<acc.getCount();i++){acc.getElement(i,e);for(let k=0;k<n;k++)o[i*n+k]=e[k]}return o};
// KHR_materials_pbrSpecularGlossiness (old Sketchfab exports, e.g. Leon): the colour texture is `diffuseTexture`, which gltf-transform does not expose: read it from the file's JSON
const rawJson=(()=>{const b=fs.readFileSync(C.src),n=b.readUInt32LE(12);return JSON.parse(b.slice(20,20+n).toString())})();
const colourTex=mat=>{const t=mat&&mat.getBaseColorTexture();if(t)return t;const i=root.listMaterials().indexOf(mat),m=rawJson.materials&&rawJson.materials[i],d=m&&m.extensions&&m.extensions.KHR_materials_pbrSpecularGlossiness&&m.extensions.KHR_materials_pbrSpecularGlossiness.diffuseTexture;
  return d?root.listTextures()[rawJson.textures[d.index].source]:null};
const prims=[];const keptBones={};   // keptBones: name -> world position
const skinKeep=new Map();             // skin -> {node->bone}
for(const node of root.listNodes()){const mesh=node.getMesh();if(!mesh)continue;const skin=node.getSkin();const W=node.getWorldMatrix();
  let M=null,joints=null,ownerOf=null;
  if(skin){joints=skin.listJoints();const ibm=skin.getInverseBindMatrices().getArray();M=joints.map((j,i)=>mulM(j.getWorldMatrix(),Array.from(ibm.subarray(i*16,i*16+16))));
    if(!skinKeep.has(skin)){const byNode=new Map();for(const [bn,re] of Object.entries(C.keep||{})){const rx=new RegExp(re);const j=joints.find(q=>rx.test(q.getName()));if(j)byNode.set(j,bn)}skinKeep.set(skin,byNode);
      for(const [j,bn] of byNode)if(!keptBones[bn]){const m=j.getWorldMatrix();keptBones[bn]=[m[12],m[13],m[14]]}}
    const byNode=skinKeep.get(skin);ownerOf=joints.map(j=>{for(let n=j;n;n=n.getParentNode?n.getParentNode():null){if(byNode.has(n))return byNode.get(n)}return 'pelvis'})}
  for(const p of mesh.listPrimitives()){const mat=p.getMaterial();const mn=mat?mat.getName():'mat';if(hideRe&&hideRe.test(mn))continue;
    const P0=F32(p.getAttribute('POSITION'),3),n=P0.length/3,uv=F32(p.getAttribute('TEXCOORD_0'),2)||new Float32Array(n*2),ia=p.getIndices();const idx=ia?Uint32Array.from(ia.getArray()):Uint32Array.from({length:n},(_,i)=>i);
    const pos=new Float32Array(n*3),J=new Uint8Array(n*4),Wt=new Float32Array(n*4);
    if(skin&&p.getAttribute('JOINTS_0')){const J0=F32(p.getAttribute('JOINTS_0'),4),W0=F32(p.getAttribute('WEIGHTS_0'),4);
      for(let i=0;i<n;i++){let x=0,y=0,z=0,ws=0;const acc={};for(let k=0;k<4;k++){const w=W0[i*4+k];if(w<=0)continue;const m=M[J0[i*4+k]],q=mulV(m,P0[i*3],P0[i*3+1],P0[i*3+2]);x+=q[0]*w;y+=q[1]*w;z+=q[2]*w;ws+=w;const b=ownerOf[J0[i*4+k]];acc[b]=(acc[b]||0)+w}
        pos[i*3]=x/(ws||1);pos[i*3+1]=y/(ws||1);pos[i*3+2]=z/(ws||1);const ent=Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,4),tot=ent.reduce((t,e)=>t+e[1],0)||1;ent.forEach(([b,w],k)=>{J[i*4+k]=IDX[b];Wt[i*4+k]=w/tot})}}
    else{for(let i=0;i<n;i++){const q=mulV(W,P0[i*3],P0[i*3+1],P0[i*3+2]);pos.set(q,i*3)}
      const owner=skin?null:(C.parts&&C.parts[node.getName()]);if(owner){for(let i=0;i<n;i++){J[i*4]=IDX[owner];Wt[i*4]=1}}else if(!C.static)for(let i=0;i<n;i++){J[i*4]=0;Wt[i*4]=1}}
    prims.push({name:node.getName(),mat:mn,matObj:mat,pos,uv,idx,J,W:Wt,auto:!!C.static&&!(C.parts&&C.parts[node.getName()])&&!skin})}}
if(C.static)for(const [bn,p] of Object.entries(C.joints))keptBones[bn]=p.slice();
for(const bn of ORDER)if(!keptBones[bn])throw new Error('no joint for '+bn);
// ---- static: weights from the distance to the bone segments
if(C.static){const J=keptBones,seg=[];const tip=(a,b,k)=>add(J[a],mul(sub(J[a],J[b]),-k));   // point beyond a, continuing b->a... tip(a,b,k) = a + (a-b)*k
  const ext=(a,b,k)=>add(J[a],mul(sub(J[a],J[b]),k));
  seg.push(['pelvis',J.pelvis,J.spine_01],['spine_01',J.spine_01,J.spine_02],['spine_02',J.spine_02,J.spine_03],['spine_03',J.spine_03,J.neck_01],['neck_01',J.neck_01,J.Head],['Head',J.Head,ext('Head','neck_01',1.4)]);
  for(const s of ['l','r']){seg.push(['clavicle_'+s,J.spine_03,J['upperarm_'+s]],['upperarm_'+s,J['upperarm_'+s],J['lowerarm_'+s]],['lowerarm_'+s,J['lowerarm_'+s],J['hand_'+s]],['hand_'+s,J['hand_'+s],ext('hand_'+s,'lowerarm_'+s,.45)],
    ['thigh_'+s,J['thigh_'+s],J['calf_'+s]],['calf_'+s,J['calf_'+s],J['foot_'+s]],['foot_'+s,J['foot_'+s],J['ball_'+s]],['ball_'+s,J['ball_'+s],ext('ball_'+s,'foot_'+s,.7)])}
  const dseg=(p,a,b)=>{const ab=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),ab)/(dot(ab,ab)||1)));return len(sub(p,add(a,mul(ab,t))))};
  const H=Math.max(...prims.map(q=>{let m=-1e9;for(let i=1;i<q.pos.length;i+=3)m=Math.max(m,q.pos[i]);return m}))-Math.min(...prims.map(q=>{let m=1e9;for(let i=1;i<q.pos.length;i+=3)m=Math.min(m,q.pos[i]);return m})),eps=.012*H,pw=C.pow||3;
  for(const q of prims){if(!q.auto)continue;const n=q.pos.length/3;for(let i=0;i<n;i++){const p=[q.pos[i*3],q.pos[i*3+1],q.pos[i*3+2]],ds={};
      for(const [b,a0,b0] of seg){let d=dseg(p,a0,b0);const side=b.endsWith('_l')?1:b.endsWith('_r')?-1:0;if(side&&Math.sign(p[0]-J.pelvis[0])===-side&&Math.abs(p[0]-J.pelvis[0])>.06*H)d+=.25*H;ds[b]=Math.min(ds[b]===undefined?1e9:ds[b],d)}
      const ent=Object.entries(ds).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([b,d])=>[b,1/Math.pow(d+eps,pw)]),tot=ent.reduce((t,e)=>t+e[1],0);ent.forEach(([b,w],k)=>{q.J[i*4+k]=IDX[b];q.W[i*4+k]=w/tot})}}}
// ---- facing +z (from the feet), then arms down
const fwd=[0,0,0];for(const s of ['l','r']){const f=sub(keptBones['ball_'+s],keptBones['foot_'+s]);fwd[0]+=f[0];fwd[2]+=f[2]}
let yaw=len([fwd[0],0,fwd[2]])>1e-4?-Math.atan2(fwd[0],fwd[2]):(C.faceYaw||0)*Math.PI/180;
if(C.faceYaw!==undefined&&C.faceYawForce)yaw=C.faceYaw*Math.PI/180;
const cy=Math.cos(yaw),sy=Math.sin(yaw),rotY=p=>[p[0]*cy+p[2]*sy,p[1],-p[0]*sy+p[2]*cy];
for(const q of prims)for(let i=0;i<q.pos.length;i+=3){const r=rotY([q.pos[i],q.pos[i+1],q.pos[i+2]]);q.pos.set(r,i)}
for(const b of ORDER)keptBones[b]=rotY(keptBones[b]);
const armA=(C.armDeg===undefined?14:C.armDeg)*Math.PI/180;
const xf={};   // per kept bone: function applied to a vertex weighted to it
for(const s of ['l','r']){const S=keptBones['upperarm_'+s],E=keptBones['lowerarm_'+s],Wr=keptBones['hand_'+s],out=Math.sign(S[0]-keptBones.pelvis[0])||1;
  const tgt=[out*Math.sin(armA),-Math.cos(armA),0],R1=fromTo(sub(E,S),tgt),T1=v=>add(R1(sub(v,S)),S),E1=T1(E),W1=T1(Wr),R2=fromTo(sub(W1,E1),tgt),T2=v=>add(R2(sub(T1(v),E1)),E1);
  xf['upperarm_'+s]=T1;xf['lowerarm_'+s]=T2;xf['hand_'+s]=T2;keptBones['lowerarm_'+s]=E1;keptBones['hand_'+s]=T2(Wr)}
for(const q of prims){const n=q.pos.length/3;for(let i=0;i<n;i++){const p=[q.pos[i*3],q.pos[i*3+1],q.pos[i*3+2]];let r=[0,0,0],ws=0;
  for(let k=0;k<4;k++){const w=q.W[i*4+k];if(w<=0)continue;const f=xf[ORDER[q.J[i*4+k]]];const t=f?f(p):p;r=add(r,mul(t,w));ws+=w}
  q.pos.set(ws?mul(r,1/ws):p,i*3)}}
// ---- ground, centre, scale
let minY=1e9,maxY=-1e9;for(const q of prims)for(let i=1;i<q.pos.length;i+=3){minY=Math.min(minY,q.pos[i]);maxY=Math.max(maxY,q.pos[i])}
const SC=(C.height||1.8)/(maxY-minY),cx=keptBones.pelvis[0],cz=keptBones.pelvis[2];
const fixp=p=>[(p[0]-cx)*SC,(p[1]-minY)*SC,(p[2]-cz)*SC];
for(const q of prims)for(let i=0;i<q.pos.length;i+=3)q.pos.set(fixp([q.pos[i],q.pos[i+1],q.pos[i+2]]),i);
for(const b of ORDER)keptBones[b]=fixp(keptBones[b]);
// ---- per material: merge, weld, decimate, normals
const groups=new Map();for(const q of prims){if(!groups.has(q.mat))groups.set(q.mat,[]);groups.get(q.mat).push(q)}
const merge=list=>{const n=list.reduce((a,g)=>a+g.pos.length/3,0),o={pos:new Float32Array(n*3),uv:new Float32Array(n*2),J:new Uint8Array(n*4),W:new Float32Array(n*4),idx:[]};let vo=0;
  for(const g of list){o.pos.set(g.pos,vo*3);o.uv.set(g.uv,vo*2);o.J.set(g.J,vo*4);o.W.set(g.W,vo*4);for(const i of g.idx)o.idx.push(i+vo);vo+=g.pos.length/3}o.idx=Uint32Array.from(o.idx);return o};
const compact=(g,idx)=>{const map=new Int32Array(g.pos.length/3).fill(-1),order=[];let n=0;for(const i of idx)if(map[i]<0){map[i]=n++;order.push(i)}
  const o={pos:new Float32Array(n*3),uv:new Float32Array(n*2),J:new Uint8Array(n*4),W:new Float32Array(n*4),idx:Uint32Array.from(idx,i=>map[i])};
  order.forEach((s,k)=>{o.pos.set(g.pos.subarray(s*3,s*3+3),k*3);o.uv.set(g.uv.subarray(s*2,s*2+2),k*2);o.J.set(g.J.subarray(s*4,s*4+4),k*4);o.W.set(g.W.subarray(s*4,s*4+4),k*4)});return o};
const weld=(g,eps=1e-5)=>{const m=new Map(),keep=[],remap=new Int32Array(g.pos.length/3);
  for(let i=0;i<remap.length;i++){const k=[g.pos[i*3],g.pos[i*3+1],g.pos[i*3+2],g.uv[i*2],g.uv[i*2+1],...g.J.subarray(i*4,i*4+4),...Array.from(g.W.subarray(i*4,i*4+4),w=>Math.round(w*1e3))].map(v=>Math.round(v/eps)).join(',');let r=m.get(k);if(r===undefined){r=keep.length;m.set(k,r);keep.push(i)}remap[i]=r}
  return compact(g,Uint32Array.from(g.idx,i=>keep[remap[i]]))};
const simp=(g,tris,err,uvw=1)=>{if(g.idx.length/3<=tris)return g;const [idx]=MeshoptSimplifier.simplifyWithAttributes(g.idx,g.pos,3,g.uv,2,[uvw,uvw],null,tris*3,err,[]);return compact(g,idx)};
const smooth=g=>{const key=new Map(),vid=new Int32Array(g.pos.length/3);for(let i=0;i<vid.length;i++){const k=Math.round(g.pos[i*3]*1e4)+','+Math.round(g.pos[i*3+1]*1e4)+','+Math.round(g.pos[i*3+2]*1e4);let r=key.get(k);if(r===undefined){r=key.size;key.set(k,r)}vid[i]=r}
  const acc=new Float32Array(key.size*3);for(let t=0;t<g.idx.length;t+=3){const a=g.idx[t],b=g.idx[t+1],c=g.idx[t+2];const ux=g.pos[b*3]-g.pos[a*3],uy=g.pos[b*3+1]-g.pos[a*3+1],uz=g.pos[b*3+2]-g.pos[a*3+2],vx=g.pos[c*3]-g.pos[a*3],vy=g.pos[c*3+1]-g.pos[a*3+1],vz=g.pos[c*3+2]-g.pos[a*3+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const v of [a,b,c]){const r=vid[v];acc[r*3]+=nx;acc[r*3+1]+=ny;acc[r*3+2]+=nz}}
  const N=new Float32Array(g.pos.length);for(let i=0;i<vid.length;i++){const r=vid[i],l=Math.hypot(acc[r*3],acc[r*3+1],acc[r*3+2])||1;N[i*3]=acc[r*3]/l;N[i*3+1]=acc[r*3+1]/l;N[i*3+2]=acc[r*3+2]/l}return N};
const flatten=g=>{const n=g.idx.length,o={pos:new Float32Array(n*3),uv:new Float32Array(n*2),J:new Uint8Array(n*4),W:new Float32Array(n*4),idx:Uint32Array.from({length:n},(_,i)=>i)},N=new Float32Array(n*3);
  for(let i=0;i<n;i++){const s=g.idx[i];o.pos.set(g.pos.subarray(s*3,s*3+3),i*3);o.uv.set(g.uv.subarray(s*2,s*2+2),i*2);o.J.set(g.J.subarray(s*4,s*4+4),i*4);o.W.set(g.W.subarray(s*4,s*4+4),i*4)}
  for(let t=0;t<n;t+=3){const a=[o.pos[t*3],o.pos[t*3+1],o.pos[t*3+2]],b=[o.pos[t*3+3],o.pos[t*3+4],o.pos[t*3+5]],c=[o.pos[t*3+6],o.pos[t*3+7],o.pos[t*3+8]],nn=norm(cross(sub(b,a),sub(c,a)));for(let k=0;k<3;k++)N.set(nn,(t+k)*3)}return [o,N]};
const total=[...groups.values()].reduce((a,l)=>a+l.reduce((b,q)=>b+q.idx.length/3,0),0),budget=C.tris||12000,noSimp=(C.noSimp||[]).map(r=>new RegExp(r,'i'));
const built=[];
for(const [mn,list] of groups){let g=weld(merge(list));const t0=g.idx.length/3;const share=Math.max(60,Math.round(budget*t0/total));
  if(!noSimp.some(r=>r.test(mn)))g=simp(g,share,C.err||.04,.5);
  let N;if(C.flat){[g,N]=flatten(g)}else N=smooth(g);built.push({mn,g,N,t0,mat:list[0].matObj})}
// ---- write
const D=new Document(),buf=D.createBuffer(),scene=D.createScene('s'),nodes={},skin=D.createSkin('rig'),ibm=new Float32Array(16*ORDER.length);
ORDER.forEach((nm,i)=>{const n=D.createNode(nm),p=keptBones[nm],par=PARENT[nm];if(par){const pp=keptBones[par];n.setTranslation([p[0]-pp[0],p[1]-pp[1],p[2]-pp[2]]);nodes[par].addChild(n)}else{n.setTranslation(p);scene.addChild(n)}
  nodes[nm]=n;skin.addJoint(n);ibm.set([1,0,0,0,0,1,0,0,0,0,1,0,-p[0],-p[1],-p[2],1],i*16)});
skin.setInverseBindMatrices(D.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf)).setSkeleton(nodes.pelvis);
const acc=(t,a)=>D.createAccessor().setType(t).setArray(a).setBuffer(buf);
const mesh=D.createMesh('Body');let texTotal=0,trisOut=0;const used=new Set();
for(const {mn,g,N,mat} of built){const src=mat;const base=src?src.getBaseColorFactor():[1,1,1,1],am=src?src.getAlphaMode():'OPAQUE',alpha=am!=='OPAQUE'||base[3]<.99;
  let name=mn.replace(/[^A-Za-z0-9_]/g,'_');while(used.has(name))name+='_';used.add(name);
  const m=D.createMaterial(name).setBaseColorFactor(base).setMetallicFactor(0).setRoughnessFactor(.85).setDoubleSided(true);if(am==='MASK')m.setAlphaMode('MASK').setAlphaCutoff(src.getAlphaCutoff());else if(am==='BLEND')m.setAlphaMode('BLEND');
  const st=colourTex(src);if(st){const px=(C.tex&&C.tex[mn])||C.texPx||512,sz=st.getSize(),sc=Math.min(1,px/Math.max(sz[0],sz[1])),w=Math.max(8,Math.round(sz[0]*sc)),h=Math.max(8,Math.round(sz[1]*sc));
    const t=await texBuf(Buffer.from(st.getImage()),{w,h,fmt:alpha?'png':'jpg',q:C.q||80,colours:alpha?160:128,bleed:alpha});texTotal+=t.buf.length;
    const tx=D.createTexture(name+'_c').setImage(t.buf).setMimeType(t.mime);m.setBaseColorTexture(tx);if(C.nearest)m.getBaseColorTextureInfo().setMagFilter(9728).setMinFilter(9728)}
  const n=g.pos.length/3;
  mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',g.pos)).setAttribute('NORMAL',acc('VEC3',N)).setAttribute('TEXCOORD_0',acc('VEC2',g.uv)).setAttribute('JOINTS_0',acc('VEC4',g.J)).setAttribute('WEIGHTS_0',acc('VEC4',g.W)).setIndices(acc('SCALAR',n>65535?g.idx:Uint16Array.from(g.idx))).setMaterial(m));trisOut+=g.idx.length/3}
scene.addChild(D.createNode('Body').setMesh(mesh).setSkin(skin));
const meta=root.getAsset().extras||{};D.getRoot().getAsset().extras=meta;
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(C.out,D);
console.log(C.out,'tris',Math.round([...groups.values()].reduce((a,l)=>a+l.reduce((b,q)=>b+q.idx.length/3,0),0)),'->',trisOut,'materials',built.length,'textures KB',Math.round(texTotal/1024),'file KB',Math.round(fs.statSync(C.out).size/1024),'yaw',(yaw*180/Math.PI).toFixed(0),'scale',SC.toFixed(3));
