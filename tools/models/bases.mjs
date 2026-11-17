import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import sharp from 'sharp';import fs from 'fs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),out={};
for(const f of fs.readdirSync('/home/user/odessa-game/assets/models/avatar')){if(!f.endsWith('.glb')||/Man|MeHead/.test(f))continue;
 const d=await io.read('/home/user/odessa-game/assets/models/avatar/'+f);
 for(const m of d.getRoot().listMaterials()){const t=m.getBaseColorTexture();if(!t)continue;
  const {data,info}=await sharp(Buffer.from(t.getImage())).ensureAlpha().resize(48,48,{fit:'fill'}).raw().toBuffer({resolveWithObject:true});
  const H={};let best=null,bn=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<200)continue;const k=(data[i]>>5)+','+(data[i+1]>>5)+','+(data[i+2]>>5),e=H[k]||(H[k]={n:0,r:0,g:0,b:0});e.n++;e.r+=data[i];e.g+=data[i+1];e.b+=data[i+2];if(e.n>bn){bn=e.n;best=e}}
  if(best)out[m.getName()]=[+(best.r/best.n/255).toFixed(3),+(best.g/best.n/255).toFixed(3),+(best.b/best.n/255).toFixed(3)];
  if(m.getName()==='chead'){const q=await sharp(Buffer.from(t.getImage())).ensureAlpha().resize(64,64,{fit:'fill'}).raw().toBuffer({resolveWithObject:true});const dd=q.data,F=c=>Math.pow(c/255,2.2);let a=0,an=0,b=0,bn2=0;
   for(let i=0;i<dd.length;i+=4){if(dd[i+3]<200)continue;const r=F(dd[i]),g=F(dd[i+1]),bb=F(dd[i+2]),mx=Math.max(r,g,bb),mn=Math.min(r,g,bb),l=.299*r+.587*g+.114*bb,st=mx>0?(mx-mn)/mx:0;if(g<=r&&bb<=g&&st>.18&&l>.03){a+=l;an++}else if(l<.1&&st<.25){b+=l;bn2++}}
   out.__chead={sl:+(an?a/an:.3).toFixed(3),dl:+Math.max(.012,bn2?b/bn2:.04).toFixed(3)}}}}
console.log(JSON.stringify(out));
