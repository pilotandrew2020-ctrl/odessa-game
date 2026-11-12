// second half of the bench repair: put the repaired PNG back into the padded GLB (see fixbench.py)
import {io} from './lib.mjs';import fs from 'fs';
const doc=await io.read('work/bench_padded.glb');
doc.getRoot().listMaterials().find(m=>m.getName()==='lambert3SG').getBaseColorTexture().setImage(fs.readFileSync('work/img3_repaired.png'));
await io.write('work/bench_raw.glb',doc);
