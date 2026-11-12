import {io,parts,bounds,components} from './lib.mjs';
import {texBuf,compact,subsetTris,weld,simplify,scale,xform,stats,writeGlb} from './build_lib.mjs';
const U=(process.env.SRC||'src')+'/';
const doc=await io.read(U+'maple_tree.glb');
const P=parts(doc);const trunk=P.find(p=>p.node.startsWith('Tree_0')),leaf=P.find(p=>p.node.startsWith('Tree_1'));
const S=1.7;   // 5.8 m -> ~9.8 m tall: a mature street maple
// deterministic shuffle
let seed=7;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
async function variant(tag,{leafQuads,trunkTris,barkPx,leafPx,leafColours}){
  seed=7;
  // leaves: component = one quad (2 tris). keep a random subset, grow each kept quad to keep the crown's coverage
  const lc=components(leaf);const byComp=Array.from({length:lc.count},()=>[]);lc.triComp.forEach((c,t)=>byComp[c].push(t));
  const order=byComp.map((_,i)=>i).sort(()=>rnd()-.5).slice(0,leafQuads);
  const tris=[];for(const c of order)tris.push(...byComp[c]);
  let lg=weld(subsetTris(leaf,tris));
  // grow each quad about its centroid (components are disjoint in vertex space after subset)
  const k=Math.sqrt(lc.count/leafQuads);const cc=components({pos:lg.pos,idx:lg.idx});
  const sum=Array.from({length:cc.count},()=>[0,0,0,0]);const vc=new Int32Array(lg.pos.length/3);
  for(let t=0;t<lg.idx.length/3;t++)for(let j=0;j<3;j++){const v=lg.idx[t*3+j];vc[v]=cc.triComp[t]}
  for(let v=0;v<vc.length;v++){const s=sum[vc[v]];s[0]+=lg.pos[v*3];s[1]+=lg.pos[v*3+1];s[2]+=lg.pos[v*3+2];s[3]++}
  for(let v=0;v<vc.length;v++){const s=sum[vc[v]];const cx=s[0]/s[3],cy=s[1]/s[3],cz=s[2]/s[3];lg.pos[v*3]=cx+(lg.pos[v*3]-cx)*k;lg.pos[v*3+1]=cy+(lg.pos[v*3+1]-cy)*k;lg.pos[v*3+2]=cz+(lg.pos[v*3+2]-cz)*k}
  // trunk: drop twig components (<80 tris, hidden under leaves), simplify the rest
  const tc=components(trunk);const cnt=new Array(tc.count).fill(0);tc.triComp.forEach(c=>cnt[c]++);
  const keep=[];tc.triComp.forEach((c,t)=>{if(cnt[c]>=80)keep.push(t)});
  let tg=weld(subsetTris(trunk,keep));const before=stats(tg).tris;
  tg=simplify(tg,trunkTris,.08,.5);
  scale(lg,S);scale(tg,S);
  const lTex=await texBuf(leaf.tex.getImage(),{w:leafPx,h:leafPx,fmt:'png',q:70,colours:leafColours,bleed:true});
  const bTex=await texBuf(trunk.tex.getImage(),{w:barkPx,h:barkPx,fmt:'jpg',q:72});
  const size=await writeGlb(`out/tree_maple_${tag}.glb`,[{name:'trunk',geo:tg,mat:{name:'bark',tex:bTex,alphaMode:'OPAQUE'}},{name:'leaf',geo:lg,mat:{name:'leaf',tex:lTex,alphaMode:'MASK',cutoff:.45,doubleSided:true}}]);
  console.log(tag,'trunk',before,'->',stats(tg).tris,'leaf tris',stats(lg).tris,'tex',bTex.buf.length,lTex.buf.length,'file',size,'bounds',stats(lg).b.map(v=>+v.toFixed(1)).join(','),stats(tg).b.map(v=>+v.toFixed(1)).join(','))}
await variant('full',{leafQuads:2664,trunkTris:700,barkPx:512,leafPx:256,leafColours:96});
await variant('hi',{leafQuads:1400,trunkTris:700,barkPx:512,leafPx:256,leafColours:96});
await variant('lo',{leafQuads:700,trunkTris:300,barkPx:256,leafPx:256,leafColours:64});
