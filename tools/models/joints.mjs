import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const b of ['Nolik','Booba','Steve','Leon','MrBeast','Walter','Halo','Ghost']){const d=await io.read('/home/user/odessa-game/assets/models/avatar/'+b+'.glb');const J={};
 for(const n of d.getRoot().listNodes()){const nm=n.getName();if(/^(foot_l|calf_l|thigh_l|pelvis|spine_03|neck_01|Head)$/.test(nm))J[nm]=+n.getWorldTranslation()[1].toFixed(3)}
 let mn=9,mx=-9;for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){const P=p.getAttribute('POSITION').getArray();for(let i=1;i<P.length;i+=3){mn=Math.min(mn,P[i]);mx=Math.max(mx,P[i])}}
 console.log(b.padEnd(8),JSON.stringify(J),'mesh y',mn.toFixed(2),mx.toFixed(2))}
