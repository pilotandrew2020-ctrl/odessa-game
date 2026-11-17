// Chigurh post-process: (1) drop floating shards (components under 60 triangles) from the skinned meshes, (2) boots are rigid: each shoe follows ONLY its foot bone (the auto weights let the calf drag the boot's top: "rags flying round the feet")
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),d=await io.read(process.argv[2]);
const root=d.getRoot(),skin=root.listSkins()[0],names=skin.listJoints().map(j=>j.getName());const ji=n=>names.indexOf(n);console.log('joints',names.length,ji('foot_l'),ji('foot_r'));
for(const mesh of root.listMeshes())for(const pr of mesh.listPrimitives()){const mat=pr.getMaterial().getName();
  const P=pr.getAttribute('POSITION').getArray(),idxA=pr.getIndices(),I=idxA.getArray(),n=P.length/3;
  const key=new Map(),rep=new Int32Array(n);for(let i=0;i<n;i++){const k=[0,1,2].map(a=>Math.round(P[i*3+a]*2e4)).join();let r=key.get(k);if(r===undefined){key.set(k,i);r=i}rep[i]=r}
  const par=Int32Array.from({length:n},(_,i)=>i);const f=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a]}return a};
  for(let t=0;t<I.length;t+=3){const a=f(rep[I[t]]),b=f(rep[I[t+1]]),c=f(rep[I[t+2]]);par[b]=a;par[f(c)]=a}
  const cnt=new Map();for(let t=0;t<I.length;t+=3){const r=f(rep[I[t]]);cnt.set(r,(cnt.get(r)||0)+1)}
  if(/^(chead|handskin2|jeans|shoe)$/.test(mat)){const keep=[];for(let t=0;t<I.length;t+=3){if(cnt.get(f(rep[I[t]]))>=60)keep.push(I[t],I[t+1],I[t+2])}
    if(keep.length<I.length){console.log(mat,'dropped',(I.length-keep.length)/3,'shard triangles');idxA.setArray(I instanceof Uint16Array?Uint16Array.from(keep):Uint32Array.from(keep))}}
  if(mat==='shoe'){const J=pr.getAttribute('JOINTS_0'),W=pr.getAttribute('WEIGHTS_0'),ja=J.getArray(),wa=W.getArray();
    for(let i=0;i<n;i++){const b=P[i*3]>=-0.0?ji('foot_l'):ji('foot_r');ja[i*4]=b;ja[i*4+1]=ja[i*4+2]=ja[i*4+3]=0;wa[i*4]=1;wa[i*4+1]=wa[i*4+2]=wa[i*4+3]=0}
    J.setArray(ja);W.setArray(wa);console.log('shoe rigid to the feet')}}
// (3) hands: centre each hand under its own sleeve cuff (the sculpt's hand sat ~12 cm in front of the cuff and was narrower than the opening: "pieces of hands floating in the air")
{const prims={};for(const mesh of root.listMeshes())for(const pr of mesh.listPrimitives())prims[pr.getMaterial().getName()]=pr;
 const C=prims.chead.getAttribute('POSITION').getArray(),H=prims.handskin2.getAttribute('POSITION').getArray();
 for(const sd of [1,-1]){const cuff=[];let lo=9;for(let i=0;i<C.length;i+=3)if(sd*C[i]>.2&&C[i+1]<1.05&&C[i+1]>.5)lo=Math.min(lo,C[i+1]);
  for(let i=0;i<C.length;i+=3)if(sd*C[i]>.2&&C[i+1]<lo+.02&&C[i+1]>.5)cuff.push([C[i],C[i+1],C[i+2]]);
  const cc=[0,1,2].map(k=>cuff.reduce((a,p)=>a+p[k],0)/cuff.length);
  let hi=-9;const idx=[];for(let i=0;i<H.length;i+=3)if(sd*H[i]>.2){idx.push(i);hi=Math.max(hi,H[i+1])}
  const top=idx.filter(i=>H[i+1]>hi-.02),hc=[0,1,2].map(k=>top.reduce((a,i)=>a+H[i+k],0)/top.length);
  const dx=cc[0]-hc[0],dz=cc[2]-hc[2],KS=+(process.env.HKS||1.18);console.log('hand',sd,'shift',dx.toFixed(3),dz.toFixed(3));
  for(const i of idx){H[i]=hc[0]+(H[i]-hc[0])*KS+dx;H[i+1]=hc[1]+(H[i+1]-hc[1])+.045;H[i+2]=hc[2]+(H[i+2]-hc[2])*KS+dz}}
 prims.handskin2.getAttribute('POSITION').setArray(H)}
await io.write(process.argv[3],d);
