import {texBuf,compact,weld,simplify,xform,stats,writeGlb,smoothNormals,mergeGeo} from './build_lib.mjs';
import fs from 'fs';
const meshes=JSON.parse(fs.readFileSync('booba_baked.json'));
const get=n=>meshes.find(m=>m.name===n);
const toGeo=m=>{const n=m.pos.length/3;return {pos:Float32Array.from(m.pos),nrm:new Float32Array(n*3),uv:Float32Array.from(m.uv||new Array(n*2).fill(0)),idx:Uint32Array.from(m.idx)}};
const body=toGeo(get('Object_218')),tuft1=toGeo(get('Object_214')),tuft2=toGeo(get('Object_216')),tl=toGeo(get('booba_teeth_lower_BoobaTeeth001_0')),tu=toGeo(get('booba_teeth_upper_BoobaTeeth001_0'));
// Booba is skinned, so (uv,pos) vertices are unique per seam already; weld exact duplicates, then simplify the body with uv attributes
let bg=smoothNormals(body);bg=weld(bg,1e-5);
const b0=stats(bg).tris;
bg=simplify(bg,3800,.03,1.0);
let tf=mergeGeo([weld(smoothNormals(tuft1)),weld(smoothNormals(tuft2))]);const t0=stats(tf).tris;tf=simplify(tf,260,.05,1);
let teeth=mergeGeo([smoothNormals(simplify(weld(smoothNormals(tl)),150,.08,0)),smoothNormals(simplify(weld(smoothNormals(tu)),170,.08,0))]);
// body + tufts share one texture -> one mesh
let all=mergeGeo([bg,tf]);all=smoothNormals(all);
const bb=stats(all).b;const H=1.2/(bb[4]-bb[1]);const cx=(bb[0]+bb[3])/2,cz=(bb[2]+bb[5])/2;
const fix=g=>xform(g,(x,y,z)=>[(x-cx)*H,(y-bb[1])*H,(z-cz)*H]);fix(all);fix(teeth);
const tex=await texBuf(fs.readFileSync('tex/booba_2.png'),{w:512,h:512,fmt:'png',q:80,colours:160,bleed:true});
const size=await writeGlb('out/booba.glb',[{name:'body',geo:all,mat:{name:'booba',tex,alphaMode:'MASK',cutoff:.5,doubleSided:true}},{name:'teeth',geo:teeth,mat:{name:'teeth',alphaMode:'OPAQUE',doubleSided:true}}]);
console.log('body',b0,'->',stats(bg).tris,'tufts',t0,'->',stats(tf).tris,'teeth',stats(teeth).tris,'tex',tex.buf.length,'file',size,'bounds',stats(all).b.map(v=>+v.toFixed(2)).join(','));
