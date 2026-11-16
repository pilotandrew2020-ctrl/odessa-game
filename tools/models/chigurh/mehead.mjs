import {loadGlb} from './load.mjs';
import {MeshoptSimplifier} from './build_lib.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
const m=loadGlb('me_raw.glb'),P=m.pos,I=m.idx,n=P.length/3;console.log('verts',n,'tris',I.length/3);
// weld by position
const map=new Map(),rm=new Int32Array(n),pos=[];for(let i=0;i<n;i++){const k=Math.round(P[i*3]*2e4)+','+Math.round(P[i*3+1]*2e4)+','+Math.round(P[i*3+2]*2e4);let r=map.get(k);if(r===undefined){r=pos.length/3;map.set(k,r);pos.push(P[i*3],P[i*3+1],P[i*3+2])}rm[i]=r}
let idx=[];for(let t=0;t<I.length;t+=3){const a=rm[I[t]],b=rm[I[t+1]],c=rm[I[t+2]];if(a!==b&&b!==c&&a!==c)idx.push(a,b,c)}console.log('welded verts',pos.length/3,'tris',idx.length/3);
// keep the biggest component
const N=pos.length/3,par=new Int32Array(N).map((_,i)=>i),f=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x};for(let t=0;t<idx.length;t+=3){const a=f(idx[t]);par[f(idx[t+1])]=a;par[f(idx[t+2])]=a}
const cnt=new Map();for(let t=0;t<idx.length;t+=3){const r=f(idx[t]);cnt.set(r,(cnt.get(r)||0)+1)}const big=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0][0];idx=idx.filter((_,i)=>f(idx[Math.floor(i/3)*3])===big);console.log('after largest component',idx.length/3);
// winding: make every face point away from the head centre (0,0,0)
let flips=0;for(let t=0;t<idx.length;t+=3){const a=idx[t]*3,b=idx[t+1]*3,c=idx[t+2]*3,u=[pos[b]-pos[a],pos[b+1]-pos[a+1],pos[b+2]-pos[a+2]],v=[pos[c]-pos[a],pos[c+1]-pos[a+1],pos[c+2]-pos[a+2]],nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0],cx=(pos[a]+pos[b]+pos[c])/3,cy=(pos[a+1]+pos[b+1]+pos[c+1])/3,cz=(pos[a+2]+pos[b+2]+pos[c+2])/3;
  if(nx*cx+ny*(cy-.1)+nz*cz<0){const tmp=idx[t+1];idx[t+1]=idx[t+2];idx[t+2]=tmp;flips++}}console.log('flipped',flips);
// simplify
const [si]=MeshoptSimplifier.simplify(Uint32Array.from(idx),Float32Array.from(pos),3,(+process.env.TT||13000)*3,.05,[]);
// classify per triangle: hair / skin
const HAIR=(x,y,z)=>y>.62||(y>.12&&Math.abs(x)>.6&&z<.25)||(z<-.18&&y>-.12);
const G={mskin:[],mhair:[]};for(let t=0;t<si.length;t+=3){const a=si[t]*3,b=si[t+1]*3,c=si[t+2]*3,x=(pos[a]+pos[b]+pos[c])/3,y=(pos[a+1]+pos[b+1]+pos[c+1])/3,z=(pos[a+2]+pos[b+2]+pos[c+2])/3;G[HAIR(x,y,z)?'mhair':'mskin'].push(si[t],si[t+1],si[t+2])}
console.log('skin',G.mskin.length/3,'hair',G.mhair.length/3);
const D=new Document(),buf=D.createBuffer(),sc=D.createScene(),mesh=D.createMesh('head'),acc=(t,a)=>D.createAccessor().setType(t).setArray(a).setBuffer(buf);
for(const [name,list] of Object.entries(G)){const mm=new Map(),P2=[],I2=[];for(const v of list){let r=mm.get(v);if(r===undefined){r=P2.length/3;mm.set(v,r);P2.push(pos[v*3],pos[v*3+1],pos[v*3+2])}I2.push(r)}
  mesh.addPrimitive(D.createPrimitive().setAttribute('POSITION',acc('VEC3',new Float32Array(P2))).setIndices(acc('SCALAR',Uint32Array.from(I2))).setMaterial(D.createMaterial(name).setBaseColorFactor(name==='mhair'?[.12,.08,.05,1]:[.85,.62,.5,1]).setRoughnessFactor(.75).setMetallicFactor(0).setDoubleSided(true)))}
sc.addChild(D.createNode('head').setMesh(mesh));await new NodeIO().write('MeHead.glb',D);console.log('ok')
