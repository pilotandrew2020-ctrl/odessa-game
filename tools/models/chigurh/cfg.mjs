import {NodeIO} from '@gltf-transform/core';
const K=+process.env.K,SC=+process.env.SC;const d=await new NodeIO().read('Chigurh2.glb');const m=d.getRoot().listMeshes()[0];
for(const p of m.listPrimitives()){if(p.getMaterial().getName()!=='skin')continue;const a=p.getAttribute('POSITION').getArray();let y1=-9,x0=9,x1=-9;for(let i=0;i<a.length;i+=3){y1=Math.max(y1,a[i+1]);x0=Math.min(x0,a[i]);x1=Math.max(x1,a[i])}
 const k=K*SC,ey=y1-(1.81-1.6985)*k;console.log(JSON.stringify({ey:+ey.toFixed(4),eyd:+(.0676*k).toFixed(4),cx:+((x0+x1)/2).toFixed(4),fcy:+(ey-.0335*k).toFixed(4),ru:+(.115*k).toFixed(4),rd:+(.078*k).toFixed(4),rx:+(.078*k).toFixed(4)}))}
