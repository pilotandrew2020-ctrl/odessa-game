import {loadGlb} from './load.mjs';
import {classify} from './label.mjs';
import {MeshoptSimplifier} from './build_lib.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const SRC=process.argv[2],OUT=process.argv[3],MAN='/home/user/odessa-game/assets/models/avatar/Man.glb';
const XC=0.025,Z0=0.02,XS=+(process.env.XS||.74),ZS=+(process.env.ZS||.85),LEG=+(process.env.LEG||1.28),K=+(process.env.K||.43),NT=[XC,+(process.env.NTY||.215),.02];
// the body warp: slimmer, longer legs (the sculpt is a big-headed caricature with short legs)
const T=(x,y,z)=>{let yy=y;if(y<=-0.09&&y>-0.40)yy=-0.09+(y+0.09)*LEG;else if(y<=-0.40)yy=y+(-0.09+(-0.40+0.09)*LEG+0.40);return [XC+(x-XC)*XS,yy,Z0+(z-Z0)*ZS]};
const m=loadGlb(SRC),P=m.pos,I=m.idx;const verts=[];const vid=(x,y,z)=>{verts.push(...T(x,y,z));return verts.length/3-1};
const tris=[];for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];const cx=(P[a*3]+P[b*3]+P[c*3])/3,cy=(P[a*3+1]+P[b*3+1]+P[c*3+1])/3,cz=(P[a*3+2]+P[b*3+2]+P[c*3+2])/3;const l=classify([cx,cy,cz]);if(l==='cut')continue;tris.push([a,b,c,l])}
const par=new Map();const f=x=>{while(par.get(x)!==x){par.set(x,par.get(par.get(x)));x=par.get(x)}return x};
for(const [a,b,c] of tris)for(const v of [a,b,c])if(!par.has(v))par.set(v,v);for(const [a,b,c] of tris){const ra=f(a);par.set(f(b),ra);par.set(f(c),ra)}
const cnt=new Map();for(const [a] of tris)cnt.set(f(a),(cnt.get(f(a))||0)+1);const big=[...cnt.entries()].sort((x,y)=>y[1]-x[1])[0][0];const keep=tris.filter(([a])=>f(a)===big);
const G={shirt:[],jeans:[],shoe:[],handskin:[]},MAP={hand:'handskin',jacket:'shirt',pants:'jeans',boots:'shoe'},vc=new Map();
const V=i=>{if(vc.has(i))return vc.get(i);const r=vid(P[i*3],P[i*3+1],P[i*3+2]);vc.set(i,r);return r};
for(const [a,b,c,l] of keep){G[MAP[l]].push([V(a),V(b),V(c)]);if(l==='hand'){const M=i=>vid(2*0.025-P[i*3],P[i*3+1],P[i*3+2]);const ma=M(a),mb=M(b),mc=M(c);G.handskin.push([ma,mc,mb])}}
const D=new Document(),buf=D.createBuffer(),sc=D.createScene(),mesh=D.createMesh('Body');
const COL={shirt:[.1,.1,.12,1],jeans:[.08,.08,.1,1],shoe:[.3,.18,.1,1],handskin:[.72,.5,.4,1]},BUD={shirt:7500,jeans:3500,shoe:1500,handskin:1500};let total=0;
const acc=(t,a)=>D.createAccessor().setType(t).setArray(a).setBuffer(buf);
for(const [name,list] of Object.entries(G)){const map=new Map(),pos=[],idx=[];
  for(const tr of list){const ids=tr.map(v=>{const x=verts[v*3],y=verts[v*3+1],z=verts[v*3+2],k=Math.round(x*1e5)+','+Math.round(y*1e5)+','+Math.round(z*1e5);let r=map.get(k);if(r===undefined){r=pos.length/3;map.set(k,r);pos.push(x,y,z)}return r});if(ids[0]!==ids[1]&&ids[1]!==ids[2]&&ids[0]!==ids[2])idx.push(...ids)}
  const ix=Uint32Array.from(idx),p=Float32Array.from(pos),t0=ix.length/3,[si]=MeshoptSimplifier.simplify(ix,p,3,Math.min(t0,BUD[name])*3,.02,['LockBorder']);
  const rm=new Int32Array(p.length/3).fill(-1);let n=0;const P2=[];for(const i of si){if(rm[i]<0){rm[i]=n++;P2.push(p[i*3],p[i*3+1],p[i*3+2])}}const I2=Uint32Array.from(si,i=>rm[i]);total+=I2.length/3;console.log(name,t0,'->',I2.length/3);
  const mat=D.createMaterial(name).setBaseColorFactor(COL[name]).setRoughnessFactor(.85).setMetallicFactor(0).setDoubleSided(true);
  mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(P2))).setIndices(acc('SCALAR',I2)).setMaterial(mat))}
// ---- the head: Man.glb (skin above the neck + the parted hair), scaled by K and put on the collar

// ---- the head: the owner's textured bust (head_jpg.glb: caricature head + hair + neck, 96k tris, 2048 texture): triangles above the neck, scaled by K, put on the collar; the texture is cropped to the part the head uses
import sharp from 'sharp';
const hd=await new NodeIO().read('head_jpg.glb'),hp=hd.getRoot().listMeshes()[0].listPrimitives()[0],ha=hp.getAttribute('POSITION').getArray(),hu=hp.getAttribute('TEXCOORD_0').getArray(),hi=hp.getIndices().getArray(),htex=hp.getMaterial().getBaseColorTexture();
const YC=+(process.env.YC||.185),NC=[-.035,YC,.09],put=(p)=>[NT[0]+(p[0]-NC[0])*K,NT[1]+(p[1]-NC[1])*K,NT[2]+(p[2]-NC[2])*K];
const sel=[];for(let t=0;t<hi.length;t+=3){const a=hi[t],b=hi[t+1],c=hi[t+2];if(ha[a*3+1]>=YC&&ha[b*3+1]>=YC&&ha[c*3+1]>=YC)sel.push(a,b,c)}
let u0=9,u1=-9,v0=9,v1=-9;for(const i of sel){u0=Math.min(u0,hu[i*2]);u1=Math.max(u1,hu[i*2]);v0=Math.min(v0,hu[i*2+1]);v1=Math.max(v1,hu[i*2+1])}
const pad=.004;u0=Math.max(0,u0-pad);v0=Math.max(0,v0-pad);u1=Math.min(1,u1+pad);v1=Math.min(1,v1+pad);console.log('head uv box',u0.toFixed(3),u1.toFixed(3),v0.toFixed(3),v1.toFixed(3));
const TS=htex.getSize(),L=Math.floor(u0*TS[0]),Tp=Math.floor(v0*TS[1]),W=Math.ceil((u1-u0)*TS[0]),H=Math.ceil((v1-v0)*TS[1]);
const cropBuf=await sharp(Buffer.from(htex.getImage())).extract({left:L,top:Tp,width:Math.min(W,TS[0]-L),height:Math.min(H,TS[1]-Tp)}).jpeg({quality:90}).toBuffer();
const rm=new Int32Array(ha.length/3).fill(-1);let n=0;const P2=[],U2=[];
for(const i of sel){if(rm[i]<0){rm[i]=n++;P2.push(...put([ha[i*3],ha[i*3+1],ha[i*3+2]]));U2.push((hu[i*2]*TS[0]-L)/W,(hu[i*2+1]*TS[1]-Tp)/H)}}
let I2=Uint32Array.from(sel,i=>rm[i]);
{const pos=Float32Array.from(P2),uv=Float32Array.from(U2),[si]=MeshoptSimplifier.simplifyWithAttributes(I2,pos,3,uv,2,[1.5,1.5],null,(+(process.env.HT||16000))*3,.02,['LockBorder']);
  const r2=new Int32Array(pos.length/3).fill(-1);let m=0;const PP=[],UU=[];for(const i of si){if(r2[i]<0){r2[i]=m++;PP.push(pos[i*3],pos[i*3+1],pos[i*3+2]);UU.push(uv[i*2],uv[i*2+1])}}
  P2.length=0;P2.push(...PP);U2.length=0;U2.push(...UU);I2=Uint32Array.from(si,i=>r2[i])}
total+=I2.length/3;console.log('head tris',I2.length/3);
const hm=D.createMaterial('chead').setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.75).setMetallicFactor(0).setDoubleSided(true).setBaseColorTexture(D.createTexture('chead_c').setImage(cropBuf).setMimeType('image/jpeg'));
mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(P2))).setAttribute('TEXCOORD_0',acc('VEC2',new Float32Array(U2))).setIndices(acc('SCALAR',I2)).setMaterial(hm));
sc.addChild(D.createNode('chigurh').setMesh(mesh));await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(OUT,D);
// where the face lands (for CHIG_FACECFG): eye line, eye distance, centre line in the ORIGINAL frame; mk_char then rescales
console.log('tris total',total);
