import {loadGlb} from './load.mjs';
import {classify} from './label.mjs';
import {MeshoptSimplifier} from './build_lib.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const SRC=process.argv[2],OUT=process.argv[3],MAN='/home/user/odessa-game/assets/models/avatar/Man.glb';
const XC=0.025,Z0=0.02,XS=+(process.env.XS||.74),ZS=+(process.env.ZS||.85),LEG=+(process.env.LEG||1.28),K=+(process.env.K||.5),NT=[XC,+(process.env.NTY||.21),.02];
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
const md=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(MAN);const NM=[0,1.50,-0.041];
// caricature the realistic head so the geometry matches the projected face (long nose, heavy brow, sunken eyes, thick lips, long jaw)
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)},GA=(x,y,z,cx,cy,cz,sx,sy,sz)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2+((z-cz)/sz)**2));
const deform=(p)=>{let [x,y,z]=p;const front=sm(0.0,0.06,z);
  const gn=GA(x,y,z,0,1.662,.112,.022,.024,.05);z+=.046*gn*front;y-=.026*gn*front;               // long, drooping nose
  z+=.010*GA(x,y,z,0,1.69,.1,.016,.02,.05)*front;                                                  // high nose bridge
  z+=.010*GA(x,y,z,0,1.727,.09,.085,.011,.05)*front;                                               // heavy brow ridge
  for(const sx of [-1,1])z-=.007*GA(x,y,z,sx*.034,1.6985,.092,.02,.016,.04)*front;                  // sunken eye sockets
  z+=.009*GA(x,y,z,0,1.626,.092,.05,.011,.05)*front;                                               // thick lips
  y-=.014*sm(1.7,1.62,y);                                                                         // longer lower face
  y-=.036*sm(1.625,1.58,y)*front;z+=.022*GA(x,y,z,0,1.585,.075,.045,.018,.05)*front;                 // heavy chin
  x*=1+.14*sm(1.63,1.575,y);                                                                      // wide jowls
  return [x,y,z]};
const put=(p)=>[NT[0]+(p[0]-NM[0])*K,NT[1]+(p[1]-NM[1])*K,NT[2]+(p[2]-NM[2])*K];
for(const [nodeName,matName,yMin] of [['Body','skin',1.52],['HairParted','hair',0]]){
  const node=md.getRoot().listNodes().find(n=>n.getName()===nodeName),pr=node.getMesh().listPrimitives()[0],pa=pr.getAttribute('POSITION').getArray(),ua=pr.getAttribute('TEXCOORD_0').getArray(),ia=pr.getIndices().getArray(),src=pr.getMaterial();
  const sel=[];for(let t=0;t<ia.length;t+=3){const a=ia[t],b=ia[t+1],c=ia[t+2];if(pa[a*3+1]>=yMin&&pa[b*3+1]>=yMin&&pa[c*3+1]>=yMin&&Math.abs(pa[a*3])<0.11&&Math.abs(pa[b*3])<0.11&&Math.abs(pa[c*3])<0.11)sel.push(a,b,c)}
  const rm=new Int32Array(pa.length/3).fill(-1);let n=0;const P2=[],U2=[];for(const i of sel){if(rm[i]<0){rm[i]=n++;const q=put(nodeName==='Body'?deform([pa[i*3],pa[i*3+1],pa[i*3+2]]):[pa[i*3],pa[i*3+1],pa[i*3+2]]);P2.push(...q);U2.push(ua[i*2],ua[i*2+1])}}
  const I2=Uint32Array.from(sel,i=>rm[i]);total+=I2.length/3;console.log(nodeName,I2.length/3,'tris');
  const mat=D.createMaterial(matName).setBaseColorFactor(src.getBaseColorFactor()).setRoughnessFactor(.7).setMetallicFactor(0).setDoubleSided(true);
  const bt=src.getBaseColorTexture();if(bt){const tx=D.createTexture(matName+'_c').setImage(bt.getImage()).setMimeType(bt.getMimeType());mat.setBaseColorTexture(tx)}
  mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(P2))).setAttribute('TEXCOORD_0',acc('VEC2',new Float32Array(U2))).setIndices(acc('SCALAR',I2)).setMaterial(mat))}
sc.addChild(D.createNode('chigurh').setMesh(mesh));await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(OUT,D);
// where the face lands (for CHIG_FACECFG): eye line, eye distance, centre line in the ORIGINAL frame; mk_char then rescales
console.log('tris total',total,'eyes y',put([0,1.6985,-0.041])[1].toFixed(4),'eyeD',(0.0676*K).toFixed(4),'T(joint example)',JSON.stringify(T(.1,-.28,.01)));
