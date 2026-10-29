/* ===================================================================================================
   flats.js — three more flat interiors, one per kind of block, built with the island-house kit (houses.js hsKit):
     panel   — a nine-storey panel-block ("brezhnevka") flat: wall-unit, wall carpet, folding sofa, gas stove, tiny bathroom
     stalin  — a Stalin-era flat in a central house: 3.5 m ceilings, tall windows, a long corridor, a salon with a piano, cornices
     new     — a new-build flat (Arcadia / Fontan): open-plan kitchen island + lounge, floor-to-ceiling glass, sleeping alcove
   The stairwell hands over to them: a stairwell opened with `style:'panel'|'stalin'|'new'` (the blocks in kstyle.js) sends
   PORTAL.enter('flat',…) to INTERIORS.<style>flat; the style is inherited while you move between floors (like modern.js `home`).
   Loaded BEFORE the main script; installFlats() patches PORTAL at runtime (called from the landmark step list).
   =================================================================================================== */

const FL={built:{},leaving:0,ready:false};
const FL_DEF={
  panel:{idx:58,W:9.6,D:6.8,H:2.5,door:0,title:'Your flat',sub:'panel block · carpet on the wall, wall unit, folding sofa',
    S:{exp:.56,wood:'#6b4a2c',wall:'#dcc799',wm:0,floor:'#8a5a34',fm:5,trim:'#f4efe4',ceil:'#f1ede2',cm:0,beams:false,sofa:['#8a3a2e','#c9a86a'],accent:'#8a2f2a',light:0xffe2b0}},
  stalin:{idx:59,W:12,D:8.2,H:3.5,door:-5,title:'Your flat',sub:'Stalin-era house · tall windows, piano, long corridor',
    S:{exp:.6,wood:'#4a3220',wall:'#e6d8bb',wm:0,floor:'#9a6b3c',fm:5,trim:'#f8f3e6',ceil:'#f6f1e4',cm:0,beams:false,sofa:['#3b5a4a','#cfc3a2'],accent:'#7a1f2b',light:0xffe6b8}},
  new:{idx:60,W:11,D:7.2,H:2.9,door:-4.4,title:'Your flat',sub:'new build · open plan, kitchen island, glass wall',
    S:{exp:.5,wood:'#b99a6c',wall:'#e4e5e6',wm:0,floor:'#8c8e92',fm:7,trim:'#ffffff',ceil:'#f3f3f3',cm:0,beams:false,sofa:['#7d838b','#d6d9dd'],accent:'#1d6a8a',light:0xfff3df}}};

function installFlats(){
  if(FL.ready)return;FL.ready=true;
  for(const k in FL_DEF)INTERIORS[k+'flat']=()=>FL.built[k]||(FL.built[k]=flBuild(k));
  // inside a styled block's stairwell / flat the style follows you; entering a 'flat' from there gives that kind of flat
  const inherit=(self,name,opt)=>{opt=opt||{};if(self.cur&&self.opt&&(name==='stair'||name==='flat'||/flat$/.test(name))){if(self.opt.style&&opt.style===undefined)opt.style=self.opt.style;if(self.opt.floors&&opt.floors===undefined)opt.floors=self.opt.floors}return opt};
  const pick=(name,opt)=>name==='flat'&&opt.style&&FL_DEF[opt.style]?opt.style+'flat':name;
  const enter=PORTAL.enter;PORTAL.enter=function(name,ret,opt){opt=inherit(this,name,opt);return enter.call(this,pick(name,opt),ret,opt)};
  const go=PORTAL.go;PORTAL.go=function(name,opt){opt=inherit(this,name,opt);return go.call(this,pick(name,opt),opt)};
  ANIM.push(flTick)}

function flToStair(k){if(FL.leaving)return;FL.leaving=1;const o=PORTAL.opt||{};PORTAL.go('stair',{ent:o.ent||1,floor:o.floor||1,style:k});setTimeout(()=>{FL.leaving=0},1800)}

function flBuild(k){
  const def=FL_DEF[k],S=def.S,W=def.W,D=def.D,H=def.H,hw=W/2,PI=Math.PI,dx=def.door;
  const grp=new THREE.Group();scene.add(grp);const ox=INT_X+800+def.idx*200,oz=INT_Z;
  const E=shEnv(grp,ox,oz,H),L=[];HSTATE.cur={tvs:[],fires:[],taps:[]};const K=hsKit(E,S,L);
  // ----- shell: floor, ceiling, outer walls and the front door -----
  E.box(0,-.05,D/2,W,.1,D,S.floor,S.fm);E.box(0,H+.05,D/2,W,.1,D,S.ceil,S.cm);
  K.wallX(D,-hw,hw,[]);K.wallZ(-hw,0,D,[]);K.wallZ(hw,0,D,[]);K.wallX(0,-hw,hw,[[dx,1.0]]);
  for(const s of [-1,1])E.box(s*(hw-.12),.1,D/2,.04,.2,D-.3,'#ffffff',0);
  E.box(dx,.012,.7,1.1,.024,.8,'#3a3a3e',0);
  E.act(dx,.8,1.7,'Go to the stairwell',()=>flToStair(k));
  FL_LAYOUT[k](E,K,S,L,hw,D,H);
  E.fin();const pg=E.P.build();if(pg)grp.add(new THREE.Mesh(pg,MATS.props));
  INDOORS.push({name:k+'flat',title:def.title,sub:'',floor:'wood',exp:S.exp,lights:L.filter(l=>!l.userData.fire&&!l.userData.tv),test:(x,z)=>x>ox-hw-1&&x<ox+hw+1&&z>oz-1&&z<oz+D+1,ceil:()=>INT_Y+H-.3});
  grp.visible=false;const hs=HSTATE.cur;
  wallSeg(ox-hw-1,oz-.6,ox+hw+1,oz-.6,.3,INT_Y-1,INT_Y+H+1);       // nothing behind the front door
  return {grp,spawn:[ox+dx,oz+1.4],spawnYaw:PI/2,title:def.title,sub:def.sub,peds:[],hs,ox,oz,key:k,dx,
    onEnter(opt){PORTAL.peds=[];this.sub='floor '+((opt&&opt.floor)||1)+' · '+def.sub}}}

// ---------- per frame: TV picture, running water, walking out through the front door ----------
function flTick(dt){
  const B=PORTAL.cur&&/flat$/.test(PORTAL.cur)&&FL.built[PORTAL.cur.replace(/flat$/,'')];if(!B||PORTAL.active!==B)return;const h=B.hs,t=HSTATE.t||0;
  if(!FL.leaving&&!player.sit&&!(ACT&&ACT.cur)&&player.z<B.oz+.25&&Math.abs(player.x-(B.ox+B.dx))<.8)flToStair(B.key);
  for(const v of h.tvs){v.t+=dt;if(v.on&&v.t>.22){v.t=0;const g=v.g,s=Math.floor(t*3)%6,cols=['#1a73e8','#e8501a','#2ab06a','#e8c21a','#8a3ad0','#e8e8ee'];g.fillStyle=cols[s];g.fillRect(0,0,160,90);
      for(let i=0;i<7;i++){g.fillStyle=cols[(s+i+2)%6];g.globalAlpha=.55;g.fillRect(((i*23+t*40)%190)-20,8+(i*13)%60,34,16+(i*7)%20);g.globalAlpha=1}g.fillStyle='rgba(255,255,255,.14)';g.fillRect(0,0,160,6);v.tex.needsUpdate=true}
    if(v.light)v.light.intensity=v.on?.9*(typeof indoorAmt!=='undefined'?indoorAmt:1):0}
  for(const w of h.taps)w.m.visible=t<w.until}

// ---------- layouts (x from -W/2 to W/2, z from 0 at the front door wall to D at the back wall) ----------
const FL_LAYOUT={
  // ===== nine-storey panel block: hall in the middle, kitchen west, bath east, living room + bedroom behind =====
  panel(E,K,S,L,hw,D,H){const PI=Math.PI;
    K.wallZ(-1.2,0,2.4,[[.7,.9]]);K.wallZ(1.2,0,2.4,[[.7,.8]]);K.wallX(2.4,-hw,hw,[[-.55,.9],[.85,.9]]);K.wallZ(.2,2.4,D,[]);
    // hall: coats, a shoe bench, mirror and the telephone table
    K.hang(-1.07,1.6,PI/2,2);K.art(1.09,1.0,-PI/2,.5,.7,1.55,'#cfd8dc');K.bx(1.05,1.75,-PI/2,0,.38,0,.4,.76,.5,'#6b4a2c',5);K.bx(1.0,1.75,-PI/2,0,.82,.05,.2,.1,.18,'#1c1c1e',6);K.bx(-.4,.35,0,0,.12,0,.9,.24,.34,'#5a4030',5);
    // kitchen (west): worktop run on the partition, small table, window
    K.kitchen(-3.0,2.28,PI,[['fridge',.6],['cab',.6],['sink',1.0],['cab',.5],['stove',.6]],'#ebe4d2');
    K.table(-4.0,.95,0,.9,.6,.75,'#d8c9ad');K.chair(-3.3,.95,PI/2,'#7a5a3a');K.chair(-4.0,1.55,PI,'#7a5a3a');K.window(-3.2,.12,0,1.3,1.2,1.25);
    E.box(-3.0,1.2,2.28,3.3,.6,.02,'#eef2f2',5);                                          // tiles behind the worktop
    // bathroom (east): tub, toilet, basin, washing machine
    K.tub(3.9,.05,0,1.7);K.toilet(3.0,2.33,PI);K.vanity(1.34,1.78,PI/2,.8);K.bx(2.2,.55,0,0,.45,0,.6,.9,.6,'#f2f2f2',1);K.rug(2.4,1.5,0,1.0,.7,'#9fc3d6');
    K.light(-3.0,2.3,1.2,S.light,.8,6);K.light(0,2.3,1.2,S.light,.8,6);K.light(3.0,2.3,1.2,0xffffff,.9,6);
    // living room: wall unit with glass doors, TV on the opposite wall, folding sofa under a wall carpet, round table, chandelier
    K.shelf(-1.9,D-.03,PI,2.4,2.2);K.window(-4.0,D-.12,PI,1.3,1.3,1.2);
    K.tv(-4.69,4.5,PI/2,.8);K.rug(-2.3,4.5,0,3.4,3.0,'#9a3a30');K.sofa(.09,4.5,-PI/2,2.0);K.art(.09,4.5,-PI/2,1.7,1.1,1.45,'#8a2f2a');
    K.table(-2.4,4.5,0,1.1,1.1,.5,'#6b4a2c');K.sofa(-3.3,2.52,0,.9,'#5a6b4a','#9aaa80');K.plant(-4.4,6.4,1.1);K.chandelier(-2.4,4.5,2.1,.34);
    K.light(-2.3,2.2,4.5,S.light,1.4,10);
    // bedroom: double bed under the window wall, bedside stands, wardrobe on the partition, rug
    K.bed(2.8,D-.05,PI,1.6,S.accent);K.stand(1.7,D-.05,PI);K.stand(3.9,D-.05,PI);K.wardrobe(.33,4.6,PI/2,1.8);K.rug(2.9,4.5,0,2.4,1.8,'#b9a07a');K.window(hw-.12,5.2,-PI/2,1.2,1.3,1.2);K.window(2.8,D-.12,PI,1.2,1.1,1.75);
    K.light(2.6,2.2,4.6,S.light,1.1,9)},
  // ===== Stalin-era flat: corridor along the front, salon with a piano, bedroom, bath and kitchen =====
  stalin(E,K,S,L,hw,D,H){const PI=Math.PI;
    K.wallX(1.6,-hw,hw,[[-2.6,1.4],[2.3,.8],[4.7,.9]]);K.wallZ(.8,1.6,D,[[6.3,.9]]);K.wallZ(3.4,1.6,4.4,[]);K.wallX(4.4,.8,hw,[]);
    // plaster cornice and a dark skirting round the salon and the bedroom
    for(const [x,z,w,d] of [[-2.6,1.7,6.8,.12],[-2.6,D-.07,6.8,.12],[-hw+.07,4.9,.12,6.6],[.74,4.9,.12,6.6]])E.box(x,H-.09,z,w,.18,d,'#fbf7ec',5);
    for(const [x,z,w,d] of [[3.4,D-.07,5.2,.12],[hw-.07,6.3,.12,3.8],[3.4,4.5,5.2,.12]])E.box(x,H-.09,z,w,.18,d,'#fbf7ec',5);
    // corridor: coats, a tall mirror, a small window at the front, a runner
    K.hang(-4.0,1.49,PI,3);K.art(-1.2,1.49,PI,.7,1.5,1.75,'#cfd8dc');K.window(0,.12,0,.9,1.4,1.7);K.rug(0,.8,0,10,.9,'#7a3a3a');K.plant(5.4,.5,1.2);K.bx(-5.5,.35,0,0,.4,0,.5,.8,.4,'#4a3220',5);
    // salon: grand rug, chandelier, piano by the west wall, sofa and armchairs round a low table, bookcases, TV on the partition
    K.rug(-2.6,5.0,0,4.4,3.6,S.accent);K.rug(-2.6,5.0,0,5.0,4.2,'#8a6a3a');K.chandelier(-2.6,5.0,2.75,.85);
    K.piano(-5.95,4.6,PI/2);K.sofa(-2.6,8.0,PI,2.6);K.table(-2.6,6.3,0,1.2,.7,.42,'#4a3220');K.sofa(-4.8,6.2,PI/2,.95,'#7a1f2b','#b9505a');K.sofa(-.4,6.2,-PI/2,.95,'#7a1f2b','#b9505a');
    K.shelf(-5.2,D-.03,PI,1.5,2.7);K.shelf(-.2,D-.03,PI,1.5,2.7);K.tv(.69,3.2,-PI/2,1.1);K.plant(-5.4,2.3,1.5);
    K.window(-4.4,D-.12,PI,1.2,2.2,1.8);K.window(-1.0,D-.12,PI,1.2,2.2,1.8);K.window(-hw+.12,3.0,PI/2,1.3,2.2,1.8);K.window(-hw+.12,6.7,PI/2,1.3,2.2,1.8);
    K.light(-2.6,3.0,5.0,S.light,1.5,14);K.light(-4.8,3.0,3.0,S.light,.8,8);
    // bedroom (north-east): bed under the north windows, wardrobe, stands
    K.bed(3.4,D-.05,PI,1.8,S.accent);K.stand(2.2,D-.05,PI);K.stand(4.6,D-.05,PI);K.wardrobe(5.0,4.52,0,1.8);K.rug(3.4,6.0,0,2.8,2.2,'#b0a080');
    K.window(1.8,D-.12,PI,1.2,2.0,1.7);K.window(hw-.12,6.3,-PI/2,1.4,2.0,1.7);K.light(3.4,3.0,6.0,S.light,1.2,10);
    // bathroom (centre): tub on the west wall, toilet, basin
    K.tub(.95,2.55,PI/2,1.5);K.toilet(2.6,4.29,PI);K.vanity(3.3,2.0,-PI/2,.7);K.rug(2.4,3.0,0,1.0,.8,'#9fc3d6');K.light(2.1,3.0,3.0,0xffffff,.9,6);
    // kitchen (east, with the window): run on the south... along the divider, table by the window
    K.kitchen(4.7,4.29,PI,[['fridge',.55],['sink',.8],['cab',.4],['stove',.55]],'#efe8d6');K.table(4.9,2.8,0,1.0,.8,.75,'#d8c9ad');K.chair(4.3,2.8,PI/2,'#7a5a3a');K.chair(5.5,2.8,-PI/2,'#7a5a3a');K.window(hw-.12,2.9,-PI/2,1.1,1.5,1.55);K.light(4.7,3.0,3.0,S.light,1.0,8)},
  // ===== new build: hall + bathroom + sleeping alcove on the west, open kitchen / dining / lounge, floor-to-ceiling glass =====
  new(E,K,S,L,hw,D,H){const PI=Math.PI;
    K.wallZ(-3.3,0,D,[[1.0,1.3],[6.0,1.0]]);K.wallX(1.8,-hw,-3.3,[[-4.4,.9]]);K.wallX(4.4,-hw,-3.3,[]);
    E.box(1.1,.005,D/2,8.4,.01,D-.1,'#b99a6c',5);                                       // oak floor in the open-plan part, polished concrete in the hall and bath
    E.box(hw-.125,H/2,5.7,.03,H,3.6,'#3d4650',5);                                        // slate accent wall behind the TV
    for(const x of [-.2,1.0,2.2]){E.box(x,2.3,2.2,.02,1.0,.02,'#222428',6);E.box(x,1.75,2.2,.34,.2,.34,'#fff3d6',3)}   // pendant lamps over the island
    // hall: a mirror, shoe cabinet and coat hooks; the bathroom behind it
    K.wardrobe(-hw+.03,.95,PI/2,1.4);K.plant(-3.7,.45,1.1);
    K.shower(-4.85,4.29,PI,1.0);K.toilet(-3.8,4.29,PI);K.vanity(-hw+.05,2.9,PI/2,.9);K.rug(-4.3,3.0,0,1.2,.8,'#cdd9e0');K.light(-4.4,2.4,1.0,S.light,.9,7);K.light(-4.4,2.4,3.1,0xffffff,1.0,6);
    // sleeping alcove behind a glass partition
    K.bed(-4.55,D-.05,PI,1.4,S.accent);K.rug(-4.4,6.0,0,1.9,1.6,'#d6dade');K.window(-hw+.12,6.2,PI/2,1.1,1.8,1.5);K.light(-4.4,2.4,6.0,S.light,1.0,8);
    // kitchen along the front wall, a breakfast island with two stools, dining table
    K.kitchen(-.4,.08,0,[['fridge',.8],['cab',.7],['sink',1.2],['cab',.5],['stove',.6],['cab',.6]],'#f4f4f2');
    K.bx(.4,2.2,0,0,.46,0,2.2,.92,.8,'#e9eaec',5);K.bx(.4,2.2,0,0,.94,0,2.3,.05,.9,'#4a4f55',7);E.obb(.4,2.2,1.15,.45,0);for(const x of [-.3,1.1])K.chair(x,3.0,PI,'#2a2d32');
    K.table(3.4,2.7,0,1.8,.9,.76,'#d8c9ad');for(const x of [2.7,4.1]){K.chair(x,1.9,0,'#2a2d32');K.chair(x,3.5,PI,'#2a2d32')}
    // lounge facing the TV wall, with the glass wall behind
    K.rug(1.8,5.7,0,3.6,2.8,'#b7bbc0');K.sofa(-.2,5.7,PI/2,2.6);K.table(1.4,5.7,PI/2,1.1,.6,.4,'#2a2d32');K.tv(hw-.03,5.7,-PI/2,1.7);K.sofa(2.6,6.6,PI,1.0,'#1d6a8a','#6fb0cc');K.plant(4.9,6.8,1.3);K.lamp(4.9,4.5,1.6);
    // glass walls: the back wall and the east wall are windows from the sill almost to the ceiling
    K.window(.9,D-.12,PI,2.6,2.1,1.3);K.window(3.7,D-.12,PI,2.0,2.1,1.3);K.window(hw-.12,2.7,-PI/2,1.6,2.1,1.3);
    K.light(.9,2.6,2.4,S.light,1.3,12);K.light(2.6,2.6,5.6,0xffffff,1.3,12)}
};
