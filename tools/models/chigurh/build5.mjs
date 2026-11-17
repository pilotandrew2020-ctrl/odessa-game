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
const G={jeans:[],shoe:[]},MAP={pants:'jeans',boots:'shoe'},vc=new Map();
const V=i=>{if(vc.has(i))return vc.get(i);const r=vid(P[i*3],P[i*3+1],P[i*3+2]);vc.set(i,r);return r};
for(const [a,b,c,l] of keep){if(MAP[l])G[MAP[l]].push([V(a),V(b),V(c)])}
const D=new Document(),buf=D.createBuffer(),sc=D.createScene(),mesh=D.createMesh('Body');
const COL={jeans:[.08,.08,.1,1],shoe:[.3,.18,.1,1]},BUD={jeans:3500,shoe:1500};let total=0;
const acc=(t,a)=>D.createAccessor().setType(t).setArray(a).setBuffer(buf);
for(const [name,list] of Object.entries(G)){const map=new Map(),pos=[],idx=[];
  for(const tr of list){const ids=tr.map(v=>{const x=verts[v*3],y=verts[v*3+1],z=verts[v*3+2],k=Math.round(x*1e5)+','+Math.round(y*1e5)+','+Math.round(z*1e5);let r=map.get(k);if(r===undefined){r=pos.length/3;map.set(k,r);pos.push(x,y,z)}return r});if(ids[0]!==ids[1]&&ids[1]!==ids[2]&&ids[0]!==ids[2])idx.push(...ids)}
  const ix=Uint32Array.from(idx),p=Float32Array.from(pos),t0=ix.length/3,[si]=MeshoptSimplifier.simplify(ix,p,3,Math.min(t0,BUD[name])*3,.02,['LockBorder']);
  const rm=new Int32Array(p.length/3).fill(-1);let n=0;const P2=[];for(const i of si){if(rm[i]<0){rm[i]=n++;P2.push(p[i*3],p[i*3+1],p[i*3+2])}}const I2=Uint32Array.from(si,i=>rm[i]);total+=I2.length/3;console.log(name,t0,'->',I2.length/3);
  const mat=D.createMaterial(name).setBaseColorFactor(COL[name]).setRoughnessFactor(.85).setMetallicFactor(0).setDoubleSided(true);
  mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(P2))).setIndices(acc('SCALAR',I2)).setMaterial(mat))}
// ---- the head: Man.glb (skin above the neck + the parted hair), scaled by K and put on the collar

// ---- v4: the whole upper body (head, neck, jacket, shirt, arms) is the owner's textured bust; the TRELLIS body only gives the legs, boots (and the pants stub under the jacket)
import sharp from 'sharp';
const hd=await new NodeIO().read('head_jpg.glb'),hp=hd.getRoot().listMeshes()[0].listPrimitives()[0],ha=hp.getAttribute('POSITION').getArray(),hu=hp.getAttribute('TEXCOORD_0').getArray(),hi=hp.getIndices().getArray(),htex=hp.getMaterial().getBaseColorTexture();
const KB=+(process.env.KB||.55),YB=+(process.env.YB||-.12),BC=[-.035,.09],B=(p)=>[XC+(p[0]-BC[0])*KB,YB+(p[1]+.38)*KB,Z0+(p[2]-BC[1])*KB];
const inBody=(a,b,c)=>{for(const v of [a,b,c]){const x=ha[v*3],y=ha[v*3+1];if(y<-0.385)return false;if(Math.abs(x+0.035)>0.2&&y<-0.3)return false}return true};   // above the hem; the hands (and the gun bits in them) are cut
const sel=[];for(let t=0;t<hi.length;t+=3){const a=hi[t],b=hi[t+1],c=hi[t+2];if(inBody(a,b,c))sel.push(a,b,c)}
const rm=new Int32Array(ha.length/3).fill(-1);let n=0;const P2=[],U2=[];for(const i of sel){if(rm[i]<0){rm[i]=n++;P2.push(ha[i*3],ha[i*3+1],ha[i*3+2]);U2.push(hu[i*2],hu[i*2+1])}}
let I2=Uint32Array.from(sel,i=>rm[i]);console.log('bust tris',I2.length/3);
// split head (y > .19) / body, simplify each with locked borders (they share the cut vertices)
const headIdx=[],bodyIdx=[];for(let t=0;t<I2.length;t+=3){const a=I2[t],b=I2[t+1],c=I2[t+2],y=(P2[a*3+1]+P2[b*3+1]+P2[c*3+1])/3;(y>0.19?headIdx:bodyIdx).push(a,b,c)}
const simpl=(idx,tt)=>{const pos=Float32Array.from(P2),uv=Float32Array.from(U2),[si]=MeshoptSimplifier.simplifyWithAttributes(Uint32Array.from(idx),pos,3,uv,2,[1.5,1.5],null,Math.min(idx.length/3,tt)*3,.02,['LockBorder']);return si};
const hs=simpl(headIdx,+(process.env.HT||14000)),bs=simpl(bodyIdx,+(process.env.BT||12000));
const all=[...hs,...bs],r2=new Int32Array(P2.length/3).fill(-1);let mm=0;const PP=[],UU=[];for(const i of all){if(r2[i]<0){r2[i]=mm++;const q=B([P2[i*3],P2[i*3+1],P2[i*3+2]]);PP.push(...q);UU.push(U2[i*2],U2[i*2+1])}}
const IF=Uint32Array.from(all,i=>r2[i]);total+=IF.length/3;console.log('bust tris after simplify',IF.length/3);
const TS=htex.getSize(),tex=D.createTexture('chead_c').setImage(await sharp(Buffer.from(htex.getImage())).modulate({brightness:1.12,saturation:1.15}).jpeg({quality:90}).toBuffer()).setMimeType('image/jpeg');
const hm=D.createMaterial('chead').setBaseColorFactor([1,1,1,1]).setRoughnessFactor(.75).setMetallicFactor(0).setDoubleSided(true).setBaseColorTexture(tex);
mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(PP))).setAttribute('TEXCOORD_0',acc('VEC2',new Float32Array(UU))).setIndices(acc('SCALAR',IF)).setMaterial(hm));
// eyes: the sculpt has no readable pupils, so two eyes are drawn on the sockets (white, brown iris, black pupil, a white glint), flat discs just in front of the surface
{const EY=.358,EC=[[-.054,EY],[.034,EY]],mk=(n,c)=>D.createMaterial(n).setBaseColorFactor(c).setRoughnessFactor(.35).setMetallicFactor(0).setDoubleSided(true);
 const mw=mk('eye_w',[.86,.84,.78,1]),mi=mk('eye_i',[.16,.09,.04,1]),mp=mk('eye_p',[.01,.01,.012,1]),mh=mk('eye_h',[1,1,1,1]);
 const zAt=(x,y)=>{let z=-9,c=0;for(let i=0;i<ha.length;i+=3){if(Math.hypot(ha[i]-x,ha[i+1]-y)<.009&&ha[i+2]>0){z=Math.max(z,ha[i+2]);c++}}return c?z:null};
 const disc=(cx,cy,z,rx,ry,mat)=>{const pos=[],idx=[],N=18;pos.push(...B([cx,cy,z]));for(let i=0;i<N;i++){const a=i/N*Math.PI*2;pos.push(...B([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,z]))}for(let i=0;i<N;i++)idx.push(0,1+i,1+(i+1)%N);
   mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(pos))).setIndices(acc('SCALAR',Uint32Array.from(idx))).setMaterial(mat))};
 for(const [ex,ey] of EC){const z0=zAt(ex,ey);console.log('eye z',z0);if(z0===null)continue;
   disc(ex,ey,z0+.0012,.024,.0105,mw);disc(ex+.002,ey-.0005,z0+.0022,.0105,.0105,mi);disc(ex+.002,ey-.0005,z0+.0032,.0052,.0052,mp);disc(ex+.006,ey+.0035,z0+.0042,.002,.002,mh)}}
// hands: the real hands of Man.glb (CC0), fingers and all: triangles of its Body below the wrist (y < .985) outside the torso (|x| > .19), put on the wrists of the bust's sleeves
{const md=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('/home/user/odessa-game/assets/models/avatar/Man.glb'),node=md.getRoot().listNodes().find(n=>n.getName()==='Body'),pr=node.getMesh().listPrimitives()[0],pa=pr.getAttribute('POSITION').getArray(),ia=pr.getIndices().getArray();
 const fm=D.createMaterial('handskin2').setBaseColorFactor([.78,.56,.45,1]).setRoughnessFactor(.75).setMetallicFactor(0).setDoubleSided(true),KH=+(process.env.KH||.56);
 for(const sd of [1,-1]){const sel=[];for(let t=0;t<ia.length;t+=3){const a=ia[t],b=ia[t+1],c=ia[t+2],cy=(pa[a*3+1]+pa[b*3+1]+pa[c*3+1])/3,cx=(pa[a*3]+pa[b*3]+pa[c*3])/3;if(cy<.985&&cy>.8&&sd*cx>.19)sel.push(a,b,c)}
   const rmap=new Map(),pos=[],idx=[];const W=sd>0?B([.30,-.36,.09]):B([-.31,-.37,.09]);   // wrist in the body's frame
   for(const i2 of sel){let r=rmap.get(i2);if(r===undefined){r=pos.length/3;rmap.set(i2,r);const y=pa[i2*3+1]-.985,z=pa[i2*3+2]+.065;pos.push(W[0]+(pa[i2*3]-sd*.272)*KH,W[1]+y*KH+(+process.env.HY||.025),W[2]+z*KH)}idx.push(r)}
   // x is mirrored for the right hand so the thumb stays on the inside: use the original sign of Man's own side (Man has both hands)
   mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(pos))).setIndices(acc('SCALAR',Uint32Array.from(idx))).setMaterial(fm))}}
sc.addChild(D.createNode('chigurh').setMesh(mesh));await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(OUT,D);
// where the face lands (for CHIG_FACECFG): eye line, eye distance, centre line in the ORIGINAL frame; mk_char then rescales
console.log('tris total',total);
