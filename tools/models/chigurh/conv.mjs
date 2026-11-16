import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const d=await io.read('head_raw.glb');
for(const t of d.getRoot().listTextures()){const buf=await sharp(Buffer.from(t.getImage())).jpeg({quality:88}).toBuffer();const sz=t.getSize();console.log('tex',t.getURI()||t.getName(),sz);t.setImage(buf).setMimeType('image/jpeg')}
for(const e of d.getRoot().listExtensionsUsed())e.dispose();
await new NodeIO().write('head_jpg.glb',d);console.log('ok')
