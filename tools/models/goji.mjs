// Godzilla for the game: the owner's export (N_Godzilla-1.0, Nelzonis2) with textures shrunk to <=1024 px JPEG (diffuse 1536), unused data pruned. Mesh and skeleton untouched.
import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {prune,dedup} from '@gltf-transform/functions';import sharp from 'sharp';import fs from 'fs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),d=await io.read(process.argv[2]),R=d.getRoot();
for(const t of R.listTextures()){const big=/Diffuse/i.test(t.getName())?1536:1024,img=sharp(Buffer.from(t.getImage())),m=await img.metadata(),s=Math.min(1,big/Math.max(m.width,m.height));
  const out=await sharp(Buffer.from(t.getImage())).resize(Math.round(m.width*s),Math.round(m.height*s)).jpeg({quality:80,mozjpeg:true}).toBuffer();t.setImage(out).setMimeType('image/jpeg');console.log(t.getName(),m.width+'x'+m.height,'->',Math.round(m.width*s),(out.length/1024|0)+'KB')}
for(const m of R.listMaterials())console.log('mat',m.getName(),'col',!!m.getBaseColorTexture(),'nrm',!!m.getNormalTexture(),'em',!!m.getEmissiveTexture(),m.getEmissiveFactor().map(x=>x.toFixed(2)).join(','));
await d.transform(dedup(),prune());await io.write(process.argv[3],d);console.log('size',(fs.statSync(process.argv[3]).size/1024/1024).toFixed(2),'MB');
