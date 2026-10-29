/* ===================================================================================================
   modern.js — the modern two-room flat of the home building (the Soviet flat now belongs to the khrushchyovkas only).
   Built with the island-house furniture kit (houses.js hsKit): hall with wardrobe, bathroom (basin you can wash at, shower, toilet),
   bedroom, and an open living room + kitchen with a real fridge (the door opens), electric kettle, taps, dining table, sofa and TV.
   The stairwell hands over to it: a stairwell opened with `home:1` (the home building's entrances) sends `PORTAL.enter('flat',…)`
   to INTERIORS.mdflat instead of the Soviet flat; the flag is inherited while you move between stairwell floors.
   Loaded BEFORE the main script; installModern() patches PORTAL at runtime (called from the landmark step list).
   =================================================================================================== */

const MD={built:null,leaving:0,ready:false};
const MD_STYLE={exp:.58,wood:'#b8976b',wall:'#efeeea',wm:0,floor:'#b79d7c',fm:5,trim:'#ffffff',ceil:'#f7f6f2',cm:0,beams:false,sofa:['#5b6672','#c9ced3'],accent:'#2f4858',light:0xfff0d8};

function installModern(){
  if(MD.ready)return;MD.ready=true;
  INTERIORS.mdflat=()=>MD.built||(MD.built=mdBuild());
  // inside a home-building stairwell/flat the `home` flag follows you; entering a 'flat' from there gives the modern one
  const inherit=(self,name,opt)=>{opt=opt||{};if(self.cur&&self.opt&&self.opt.home&&opt.home===undefined&&(name==='stair'||name==='flat'||name==='mdflat'))opt.home=1;return opt};
  const enter=PORTAL.enter;PORTAL.enter=function(name,ret,opt){opt=inherit(this,name,opt);if(name==='flat'&&opt.home)name='mdflat';return enter.call(this,name,ret,opt)};
  const go=PORTAL.go;PORTAL.go=function(name,opt){opt=inherit(this,name,opt);if(name==='flat'&&opt.home)name='mdflat';return go.call(this,name,opt)};
  ANIM.push(mdTick)}

function mdToStair(){if(MD.leaving)return;MD.leaving=1;const o=PORTAL.opt||{};PORTAL.go('stair',{ent:o.ent||1,floor:o.floor||1,home:1});setTimeout(()=>{MD.leaving=0},1800)}

function mdBuild(){
  const S=MD_STYLE,W=9.6,D=8.4,H=2.7,hw=W/2,PI=Math.PI,idx=57;
  const grp=new THREE.Group();scene.add(grp);const ox=INT_X+800+idx*200,oz=INT_Z;
  const E=shEnv(grp,ox,oz,H),L=[];HSTATE.cur={tvs:[],fires:[],taps:[]};const K=hsKit(E,S,L);
  // ----- shell: floor, ceiling, outer walls, the front door (a gap at x=-3.2 in the south wall) -----
  E.box(0,-.05,D/2,W,.1,D,S.floor,S.fm);E.box(0,H+.05,D/2,W,.1,D,S.ceil,S.cm);
  K.wallX(D,-hw,hw,[]);K.wallZ(-hw,0,D,[]);K.wallZ(hw,0,D,[]);K.wallX(0,-hw,hw,[[-3.2,1.0]]);
  for(const s of [-1,1])E.box(s*(hw-.12),.1,D/2,.04,.2,D-.3,'#ffffff',0);
  E.box(-3.2,.012,.7,1.1,.024,.8,'#3a3a3e',0);
  E.act(-3.2,.8,1.7,'Go to the stairwell',mdToStair);
  // ----- partitions: x=-1.6 splits hall / bathroom / bedroom from the living room (doors at z=1.3 and z=7.35); z=2.4 hall|bath, z=5.2 bath|bedroom -----
  K.wallZ(-1.6,0,D,[[1.3,1.4],[7.35,.9]]);K.wallX(2.4,-hw,-1.6,[[-2.5,.9]]);K.wallX(5.2,-hw,-1.6,[]);
  // ----- hall -----
  K.wardrobe(-hw+.03,1.3,PI/2,1.4);K.hang(-4.25,.13,0,2);K.art(-4.1,2.28,PI,.7,.5,1.6,'#d9c8a8');K.plant(-1.95,.32,.9);
  // ----- bathroom -----
  K.rug(-3.3,3.8,0,1.6,1.1,'#cdd9e0');K.vanity(-hw+.05,3.2,PI/2,.9);K.toilet(-2.3,5.07,PI);K.shower(-4.15,5.08,PI,1.0);K.hang(-1.71,3.9,-PI/2,2);
  // ----- bedroom -----
  K.bed(-3.7,D-.05,PI,1.6,S.accent);K.stand(-2.5,D-.05,PI);K.wardrobe(-1.71,6.0,-PI/2,1.3);K.rug(-3.5,7.0,0,2.6,2.2,'#d8dfe6');K.window(-hw+.12,6.9,PI/2,1.0,1.2,1.6);K.lamp(-4.5,5.5,1.4);K.art(-3.5,5.33,0,.9,.6,1.7);
  // ----- kitchen along the east wall: fridge (the door opens), worktop, sink with tap, stove, electric kettle -----
  K.kitchen(hw-.05,2.55,-PI/2,[['fridge',.8],['cab',.9],['sink',1.2],['cab',.5],['stove',.6],['cab',.6]],'#f4f2ee');
  K.table(2.3,2.4,0,1.6,.9,.76,'#d8c9ad');for(const x of [1.7,2.9]){K.chair(x,1.5,0,'#3e434a');K.chair(x,3.3,PI,'#3e434a')}
  // ----- living room: sofa facing the TV on the partition, armchair, coffee table -----
  K.rug(1.2,5.8,0,3.6,2.8,'#c9ccd1');K.sofa(3.6,5.65,-PI/2,2.5);K.table(2.15,5.65,PI/2,1.1,.6,.4,'#d8cdb8');K.sofa(1.9,8.05,PI,1.0,'#8a6a4a','#b99d78');
  K.tv(-1.71,5.65,PI/2,1.5);K.shelf(hw-.03,7.45,-PI/2,1.8,2.1);K.plant(-1.15,8.0,1.2);K.lamp(2.95,8.05,1.55);
  K.window(1.4,D-.12,PI,2.2,1.5,1.55);K.window(3.8,D-.12,PI,1.2,1.5,1.55);K.art(-.5,D-.07,PI,.9,.6,1.9);
  // ----- light: five soft points -----
  K.light(-3.2,2.5,1.2,S.light,1.1,9);K.light(-3.2,2.5,3.8,0xffffff,1.0,8);K.light(-3.2,2.5,6.9,S.light,1.1,9);K.light(1.4,2.5,6.0,S.light,1.3,13);K.light(2.4,2.5,2.4,0xffffff,1.3,12);
  E.fin();const pg=E.P.build();if(pg)grp.add(new THREE.Mesh(pg,MATS.props));
  INDOORS.push({name:'mdflat',title:'Your flat',sub:'',floor:'wood',exp:S.exp,lights:L.filter(l=>!l.userData.fire&&!l.userData.tv),test:(x,z)=>x>ox-hw-1&&x<ox+hw+1&&z>oz-1&&z<oz+D+1,ceil:()=>INT_Y+H-.3});
  grp.visible=false;const hs=HSTATE.cur;
  wallSeg(ox-hw-1,oz-.6,ox+hw+1,oz-.6,.3,INT_Y-1,INT_Y+H+1);       // nothing behind the front door
  return {grp,spawn:[ox-3.2,oz+1.4],spawnYaw:PI/2,title:'Your flat',sub:'modern flat',peds:[],hs,ox,oz,
    onEnter(opt){PORTAL.peds=[];this.sub='floor '+((opt&&opt.floor)||1)+' · fridge, kettle and a basin — try them'}}}

// ---------- per frame: TV picture, running water, walking out through the front door (hsTick only serves the island houses) ----------
function mdTick(dt){if(!HSTATE.ready)HSTATE.t=(HSTATE.t||0)+dt;
  const B=MD.built;if(!B||typeof PORTAL==='undefined'||PORTAL.cur!=='mdflat'||PORTAL.active!==B)return;const h=B.hs,t=HSTATE.t||0;
  if(!MD.leaving&&!player.sit&&!(ACT&&ACT.cur)&&player.z<B.oz+.25&&Math.abs(player.x-(B.ox-3.2))<.8)mdToStair();
  for(const v of h.tvs){v.t+=dt;if(v.on&&v.t>.22){v.t=0;const g=v.g,s=Math.floor(t*3)%6,cols=['#1a73e8','#e8501a','#2ab06a','#e8c21a','#8a3ad0','#e8e8ee'];g.fillStyle=cols[s];g.fillRect(0,0,160,90);
      for(let i=0;i<7;i++){g.fillStyle=cols[(s+i+2)%6];g.globalAlpha=.55;g.fillRect(((i*23+t*40)%190)-20,8+(i*13)%60,34,16+(i*7)%20);g.globalAlpha=1}g.fillStyle='rgba(255,255,255,.14)';g.fillRect(0,0,160,6);v.tex.needsUpdate=true}
    if(v.light)v.light.intensity=v.on?.9*(typeof indoorAmt!=='undefined'?indoorAmt:1):0}
  for(const w of h.taps)w.m.visible=t<w.until}
