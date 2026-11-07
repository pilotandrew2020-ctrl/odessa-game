/* ===================================================================================================
   shev.js — Shevchenko Park, rebuilt from the real layout:
   alleys of plane trees on paver paths with granite kerbs, orange benches, black globe lamps, the Taras Shevchenko monument
   on its granite pedestal and plaza, the big fountain, the Green Theatre, the Unknown Sailor memorial, the watchtower,
   and the amusement park (Ferris wheel you can ride, drop tower, carousels, swing ride, roller coaster).
   Loaded BEFORE the main script (after parks.js / rides.js); touches game globals only inside installShevchenko().
   =================================================================================================== */

function pkTry(name,fn){try{fn()}catch(e){console.error('park part '+name+' failed',e)}}

// ---------- the bronze figure (long coat, bare head, moustache) ----------
function pkTarasFigure(){
  const g=new THREE.Group();const M=new THREE.MeshStandardMaterial({color:sRGBc('#3d4b40'),roughness:.42,metalness:.55});const Md=new THREE.MeshStandardMaterial({color:sRGBc('#27312a'),roughness:.5,metalness:.5});
  const add=(geo,m,x,y,z,rx,ry,rz)=>{const o=new THREE.Mesh(geo,m||M);o.position.set(x||0,y||0,z||0);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;g.add(o);return o};
  const prof=[[0,0],[.98,0],[1.02,.08],[.9,.9],[.78,1.9],[.7,2.6],[.64,3.1],[.7,3.55],[.72,3.9],[.62,4.15],[.4,4.28],[.2,4.36],[0,4.4]].map(p=>new THREE.Vector2(p[0],p[1]));
  const body=new THREE.LatheGeometry(prof,36);const pa=body.attributes.position;
  for(let i=0;i<pa.count;i++){const px=pa.getX(i),py=pa.getY(i),pz=pa.getZ(i);const an=Math.atan2(pz,px);const fold=1+.06*Math.sin(an*8+py*1.1)*(1-Math.min(1,py/3.4))+.025*Math.sin(an*15);pa.setXYZ(i,px*fold*1.06,py,pz*fold*.72)}
  body.computeVertexNormals();add(body);
  // open front of the coat: two lapels
  for(const sx of [-1,1]){add(new THREE.BoxGeometry(.16,1.5,.1),Md,sx*.22,3.4,.54,.12,0,sx*-.1);add(new THREE.BoxGeometry(.5,.12,.12),Md,sx*.2,3.12,.5,0,0,sx*.45)}
  add(new THREE.BoxGeometry(.08,2.6,.1),Md,0,1.7,.66);                // coat split
  // shoulders, arms (right hand holds a cap on the chest, left hangs behind), head
  for(const sx of [-1,1])add(new THREE.SphereGeometry(.34,12,10),M,sx*.62,4.02,0).scale.set(1,.85,.85);
  const limb=(a,b,r0,r1)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,d.length(),10),M);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.castShadow=true;g.add(o)};
  limb([.62,3.95,0],[.66,3.1,.28],.22,.17);limb([.66,3.1,.28],[.18,3.42,.58],.17,.14);add(new THREE.SphereGeometry(.15,10,8),M,.16,3.44,.6);
  add(new THREE.CylinderGeometry(.3,.26,.18,12),Md,.1,3.5,.64,Math.PI/2.4,0,0.2);
  limb([-.62,3.95,0],[-.66,3.0,-.22],.22,.16);add(new THREE.SphereGeometry(.15,10,8),M,-.66,2.96,-.24);
  add(new THREE.CylinderGeometry(.17,.2,.34,10),M,0,4.46,0);
  const hd=add(new THREE.SphereGeometry(.42,20,16),M,0,4.98,.02);hd.scale.set(.86,1.12,.98);
  const hair=add(new THREE.SphereGeometry(.455,20,10,0,6.283,0,1.45),Md,0,5.03,-.03);hair.scale.set(.9,1.05,1.0);hair.rotation.x=-.18;
  for(const sx of [-1,1]){const hb=add(new THREE.SphereGeometry(.2,10,8),Md,sx*.37,4.82,-.08);hb.scale.set(.5,1.5,1.0);
    const mu=add(new THREE.SphereGeometry(.16,10,8),Md,sx*.15,4.8,.38);mu.scale.set(1.8,.5,.7);mu.rotation.z=sx*-.35;
    const br=add(new THREE.SphereGeometry(.1,8,6),M,sx*.16,5.12,.36);br.scale.set(1.9,.5,.8);add(new THREE.SphereGeometry(.06,6,5),M,sx*.37,4.95,.08).scale.set(.6,1.5,.9)}
  add(new THREE.ConeGeometry(.08,.3,4),M,0,4.96,.46,-.28,Math.PI/4,0);
  return g}

function pkMonumentTaras(grp,P,GR,x,z,yaw){
  const gy=groundH(x,z);addFlat(x,z,15,12,gy);const c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
  const gr=sRGB('#7b7e82'),gd=sRGB('#3f4247'),gl=sRGB('#a3a39d');
  // plaza of pavers framed by granite, steps down on the front side
  pkRect(GR,x,z,28,28,yaw,8,.02,yaw);pkRect(GR,x,z,28.2,28.2,yaw,3,.0,0);pkRect(GR,x,z,25,25,yaw,8,.03,yaw);
  for(const [u,v,w,d] of [[0,12.8,25.6,.8],[0,-12.8,25.6,.8],[12.8,0,.8,25.6],[-12.8,0,.8,25.6]]){const p=at(u,v);P.box(p[0],gy+.2,p[1],w,.4,d,yaw,gr,7)}
  for(let k=0;k<3;k++){const p=at(0,-13.8-k*.0);}
  // pedestal: stepped granite tiers, polished die, cornice
  const tiers=[[9.2,.45],[7.8,.45],[6.4,.45]];let y=gy;for(const [w,h] of tiers){P.box(x,y+h/2,z,w,h,w,yaw,gr,7);y+=h}
  P.box(x,y+2.35,z,3.7,4.7,3.7,yaw,gd,7);P.box(x,y+4.9,z,4.5,.4,4.5,yaw,gr,7);P.box(x,y+5.25,z,3.4,.3,3.4,yaw,gl,7);
  const front=at(0,1.86),back=at(0,-1.86);
  P.box(front[0],y+2.6,front[1],2.2,1.5,.08,yaw,sRGB('#5e5230'),6);P.box(front[0],y+1.2,front[1],2.0,.5,.06,yaw,sRGB('#5e5230'),6);
  for(const sd of [-1,1]){const p=at(sd*1.86,0);P.box(p[0],y+3.2,p[1],.08,1.9,2.4,yaw,sRGB('#4c4326'),6)}
  const top=y+5.4;const fig=pkTarasFigure();fig.position.set(x,top,z);fig.rotation.y=yaw;fig.scale.setScalar(1.05);fig.userData.dyn=false;grp.add(fig);
  STATIC_CIR.push(x,z,4.7);
  // low iron fence round the flower beds, lamps, benches facing the monument, flower beds
  for(const sd of [-1,1]){const p=at(sd*11.2,-11.4);classicLamp(P,p[0],groundH(p[0],p[1]),p[1],3);const q=at(sd*11.2,11.4);classicLamp(P,q[0],groundH(q[0],q[1]),q[1],3)}
  for(const sd of [-1,1])for(const v of [-5,5]){const p=at(sd*12.3,v);pkBench(P,p[0],groundH(p[0],p[1]),p[1],yaw+(sd>0?-Math.PI/2:Math.PI/2))}
  flowerBed(GR,P,at(-8,8)[0],at(-8,8)[1],10,4,yaw,[sRGB('#d12c2c'),sRGB('#f4f0e8'),sRGB('#e8b42a')]);flowerBed(GR,P,at(8,8)[0],at(8,8)[1],10,4,yaw,[sRGB('#e8b42a'),sRGB('#2a63c4'),sRGB('#f4f0e8')]);
  flowerBed(GR,P,at(-8,-8)[0],at(-8,-8)[1],10,4,yaw,[sRGB('#8a3ac0'),sRGB('#f4f0e8'),sRGB('#e23a3a')]);flowerBed(GR,P,at(8,-8)[0],at(8,-8)[1],10,4,yaw,[sRGB('#e26a2c'),sRGB('#f4f0e8'),sRGB('#d12c2c')]);
  TREE_CLEAR.push(x,z,17);
  // spruces behind the monument
  const r=mkRand(41);for(let i=0;i<9;i++){const a=(i/8-.5)*2.4+Math.PI;const p=at(Math.cos(a)*0+(i-4)*3.4,-17-r()*3);pkTree(p[0],p[1],i%3?4:0,1.1+r()*.3)}
  PLACES.push({id:'taras',name:'Shevchenko monument',sub:'Shevchenko Park',x:at(0,14)[0],z:at(0,14)[1],yaw:Math.atan2(-Math.sin(yaw),-Math.cos(yaw))})}

// ---------- round fountain with a metal flower and ring jets ----------
function pkBigFountain(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,15,10,gy);const st=sRGB('#c9c4b4'),dk=sRGB('#8b8a82');
  pkDisc(GR,x,z,0,19,8,.02,28,0);pkDisc(GR,x,z,10.2,10.9,3,.04,28,0);
  const NB=32;for(let i=0;i<NB;i++){const a=i/NB*6.2832,px=x+Math.cos(a)*9.9,pz=z+Math.sin(a)*9.9;P.box(px,gy+.4,pz,2.1,.8,.9,-a-Math.PI/2,st,7)}
  P.cyl(x,gy,z,9.5,9.5,.06,28,sRGB('#5e8c8c'),0);
  pkWaterDisc(grp,x,z,9.6,gy+.58);
  // central rock and the iron flower
  P.cyl(x,gy,z,2.6,1.9,1.1,12,dk,7);P.cyl(x,gy+1.1,z,1.2,.9,.5,12,st,7);
  const iron=sRGB('#2a2f34');for(let k=0;k<8;k++){const a=k/8*6.2832;P.box(x+Math.cos(a)*.55,gy+3.3,z+Math.sin(a)*.55,.12,3.4,.12,0,iron,6,Math.sin(a)*.18,0);}
  P.cyl(x,gy+1.6,z,.12,.12,3.0,8,iron,6);
  for(let k=0;k<10;k++){const a=k/10*6.2832;P.box(x+Math.cos(a)*1.1,gy+4.7,z+Math.sin(a)*1.1,.12,1.4,.5,-a,iron,6,0.0,Math.sin(a)*0)}
  P.cyl(x,gy+4.45,z,1.0,.3,.25,10,iron,6);P.cyl(x,gy+4.55,z,.3,.3,.5,8,sRGB('#c9a24a'),6);
  pkFountainJets(grp,x,gy+.58,z,9,{n:18,n2:10,h:3.2,mid:5.8});
  STATIC_CIR.push(x,z,10.8);
  for(let k=0;k<14;k++){const a=k/14*6.2832+.2,rr=14.2;const px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr;if(k%2)pkBench(P,px,groundH(px,pz),pz,Math.atan2(x-px,z-pz));else pkLamp(P,px,groundH(px,pz),pz,3,a)}
  for(let k=0;k<4;k++){const a=k*1.5708+.78;const px=x+Math.cos(a)*19,pz=z+Math.sin(a)*19;flowerBed(GR,P,px,pz,9,3.6,a+1.57,k%2?[sRGB('#d12c2c'),sRGB('#f4f0e8'),sRGB('#e8b42a')]:[sRGB('#8a3ac0'),sRGB('#f4f0e8'),sRGB('#e23a3a')])}
  TREE_CLEAR.push(x,z,22);
  PLACES.push({id:'shevfountain',name:'Park fountain',sub:'Shevchenko Park',x:x+14,z:z+3,yaw:Math.PI/2})}

// ---------- Green Theatre: stage with a concrete shell and fan-shaped orange benches ----------
function pkGreenTheatre(grp,P,GR,x,z,yaw){
  const gy=groundH(x,z);addFlat(x,z,22,14,gy);const c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>[x+u*c+v*s,z-u*s+v*c];const con=sRGB('#b9b6ac'),dk=sRGB('#6c6a64');
  // stage deck, back wall and the shell
  const st=at(0,-8);P.box(st[0],gy+.7,st[1],24,1.4,12,yaw,con,9);P.box(st[0],gy+1.42,st[1],24,.04,12,yaw,sRGB('#7b5a3a'),5);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(13,13,10,28,1,true,0,Math.PI),new THREE.MeshStandardMaterial({color:sRGBc('#c2bfb4'),roughness:.9,side:THREE.DoubleSide}));
  const sp=at(0,-3.4);sh.position.set(sp[0],gy+6.4,sp[1]);sh.rotation.y=yaw-Math.PI/2;sh.scale.z=.82;sh.castShadow=true;grp.add(sh);
  const rib=[];for(let k=0;k<=8;k++){const a=k/8*Math.PI;const p=at(Math.cos(a)*12.8,-3.4-Math.sin(a)*10.4);P.box(p[0],gy+6.4,p[1],.35,10,.5,yaw-a,dk,9)}
  const lip=at(0,-3.0);P.box(lip[0],gy+11.5,lip[1],26.5,.5,.6,yaw,dk,9);
  for(const sd of [-1,1]){const p=at(sd*13.2,-3.4);P.box(p[0],gy+4,p[1],.9,8,1.0,yaw,dk,9)}
  // steps and the fan of benches, seating rows rising gently
  const cen=at(0,-4);const rows=15;
  for(let r=0;r<rows;r++){const R=15+r*1.9,span=1.05+r*.0;const n=Math.max(6,Math.round(R*2*span/2.0));
    for(let k=0;k<n;k++){const a=(k+.5)/n*2*span-span;const px=cen[0]+Math.sin(yaw+a)*R,pz=cen[1]+Math.cos(yaw+a)*R;
      if(pkNearPath(px,pz,0))continue;const by=groundH(px,pz),face=Math.atan2(cen[0]-px,cen[1]-pz);
      P.box(px,by+.45,pz,2.0*(1+r*.01),.05,.5,face,sRGB(PKC.orange),5);P.box(px,by+.78,pz,2.0,.4,.05,face,sRGB(PKC.orange),5,-.18);P.box(px,by+.22,pz,1.8,.44,.1,face,sRGB(PKC.iron),1)}}
  // aisle lamps
  for(let k=0;k<4;k++){const a=(k-1.5)*.4,R=17+k*0;const px=cen[0]+Math.sin(yaw+a)*(R+16),pz=cen[1]+Math.cos(yaw+a)*(R+16);pkLamp(P,px,groundH(px,pz),pz,3,a)}
  TREE_CLEAR.push(x,z,20);STATIC_OBB.push(st[0],st[1],12,6,c,-s);
  PLACES.push({id:'greentheatre',name:'Green Theatre',sub:'Shevchenko Park',x:at(0,14)[0],z:at(0,14)[1],yaw:Math.atan2(-Math.sin(yaw),-Math.cos(yaw))})}

// ---------- Memorial to the Unknown Sailor (granite wall, eternal flame) ----------
function pkSailorMemorial(grp,P,GR,x,z,yaw){
  const gy=groundH(x,z);addFlat(x,z,14,9,gy);const c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>[x+u*c+v*s,z-u*s+v*c];const gr=sRGB('#6b6e72'),gd=sRGB('#34373b'),gl=sRGB('#a8a8a2');
  pkRect(GR,x,z,26,22,yaw,8,.02,yaw);pkRect(GR,x,z,26.4,22.4,yaw,3,.0,0);pkRect(GR,x,z,24,20,yaw,8,.03,yaw);
  // star-shaped granite inlay
  for(let k=0;k<5;k++){const a=k/5*6.2832+yaw;pkQuad(GR,[[x+Math.cos(a)*1,z+Math.sin(a)*1],[x+Math.cos(a+.3)*3.2,z+Math.sin(a+.3)*3.2],[x+Math.cos(a)*9,z+Math.sin(a)*9],[x+Math.cos(a-.3)*3.2,z+Math.sin(a-.3)*3.2]],3,0,.05)}
  // curved memorial wall behind
  const N=11;for(let k=0;k<N;k++){const a=(k/(N-1)-.5)*1.7,p=at(Math.sin(a)*10,-Math.cos(a)*10+5);P.box(p[0],gy+1.5,p[1],2.2,3.0+(1-Math.abs(a))*.8,.7,yaw+a,k%2?gr:gd,7)}
  // central stele with a bronze sailor relief and the eternal flame bowl
  const st=at(0,-4);P.box(st[0],gy+3.2,st[1],4,6.4,1.2,yaw,gd,7);P.box(st[0],gy+3.5,st[1]+0,2.0,3.4,1.3,yaw,sRGB('#5e5230'),6);P.box(st[0],gy+6.7,st[1],4.6,.4,1.6,yaw,gr,7);
  const fl=at(0,3);P.cyl(fl[0],gy,fl[1],1.9,1.7,.5,16,gr,7);P.cyl(fl[0],gy+.5,fl[1],1.1,.7,.9,12,gd,7);P.cyl(fl[0],gy+1.4,fl[1],1.3,.9,.3,12,sRGB('#b8863a'),6);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.45,1.5,8),new THREE.MeshBasicMaterial({color:0xff9a2a,toneMapped:false}));flame.position.set(fl[0],gy+2.3,fl[1]);flame.userData.dyn=true;grp.add(flame);
  const fl2=new THREE.Mesh(new THREE.ConeGeometry(.25,1.0,6),new THREE.MeshBasicMaterial({color:0xffe27a,toneMapped:false}));fl2.position.set(fl[0],gy+2.15,fl[1]);fl2.userData.dyn=true;grp.add(fl2);
  ANIM.push(()=>{const t=UNI.uTime.value;flame.scale.set(1+.1*Math.sin(t*11),1+.2*Math.sin(t*9+1),1+.1*Math.sin(t*13));fl2.scale.y=1+.25*Math.sin(t*15)});EXTRA_LAMPS.push([fl[0],gy+2.4,fl[1],7]);
  STATIC_CIR.push(fl[0],fl[1],1.9);STATIC_OBB.push(st[0],st[1],2.1,.7,c,-s);
  for(const sd of [-1,1])for(const v of [-2,5]){const p=at(sd*8,v);pkBench(P,p[0],groundH(p[0],p[1]),p[1],yaw+(sd>0?Math.PI/2:-Math.PI/2))}
  for(const sd of [-1,1]){const p=at(sd*11.5,8);pkLamp(P,p[0],groundH(p[0],p[1]),p[1],3,sd)}
  // a wreath of red carnations
  const r=mkRand(7);for(let i=0;i<40;i++){const a=r()*6.28,rr=1.2+r()*1.2;const px=fl[0]+Math.cos(a)*rr+0,pz=fl[1]+Math.sin(a)*rr+1.6;P.box(px,gy+.1,pz,.18,.22,.18,r()*3,sRGB('#c4222a'),0)}
  TREE_CLEAR.push(x,z,16);
  PLACES.push({id:'sailor',name:'Unknown Sailor',sub:'eternal flame',x:at(0,11)[0],z:at(0,11)[1],yaw:Math.atan2(-Math.sin(yaw),-Math.cos(yaw))})}

// ---------- the old watchtower and the viewing terrace ----------
function pkWatchtower(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,10,8,gy);const lm=sRGB('#d8cfb4'),lm2=sRGB('#c4b992'),rf=sRGB('#7a3b2a');
  pkDisc(GR,x,z,0,12,8,.02,20,0);
  P.cyl(x,gy,z,3.2,3.0,.6,20,lm2,7);P.cyl(x,gy+.6,z,2.7,2.4,11.4,20,lm,9);P.cyl(x,gy+12,z,3.4,2.8,.6,20,lm2,9);
  for(let k=0;k<12;k++){const a=k/12*6.2832;P.box(x+Math.cos(a)*3.2,gy+12.9,z+Math.sin(a)*3.2,1.1,.9,.7,-a-Math.PI/2,lm,9)}
  P.cyl(x,gy+12.6,z,2.8,2.8,.2,20,lm2,9);P.cyl(x,gy+12.6,z,2.2,0,2.6,16,rf,4);
  for(let k=0;k<4;k++){const a=k*1.5708+.4;P.box(x+Math.cos(a)*2.6,gy+8,z+Math.sin(a)*2.6,.5,1.4,.3,-a-1.57,sRGB('#1f2428'),2)}
  P.box(x+2.6,gy+1.4,z,.2,2.3,1.3,0,sRGB('#4a2f1c'),5);STATIC_CIR.push(x,z,3.4);
  // viewpoint terrace with railing toward the sea
  const tx=x-46,tz=z-31;
  PLACES.push({id:'watchtower',name:'Watchtower',sub:'Shevchenko Park',x:x-10,z:z+9,yaw:-Math.PI/2})}

// ---------- the main installer ----------
function installShevchenko(grp,G,P,Sg,GR){
  const D0=PKDATA.shev;const rnd=mkRand(2021);
  pkHookRoads();
  const FOUNT=[2142,-10095],TARAS=[1550,-10121],THEA=[1629,-10024],SAIL=[2364,-10101],WATCH=[2226,-10246];
  const near=(p,r)=>(x,z)=>Math.hypot(x-p[0],z-p[1])<r;
  const zones=[near(FOUNT,21),near(TARAS,16),near(THEA,27),near(SAIL,17),near(WATCH,12)];
  addBlock(1655,-10023,16,18,0);addBlock(1670,-10027,10,8,0);addBlock(2364,-10101,26,26,0);   // the little OSM boxes that stand for the theatre and the memorial
  const skip=(x,z)=>zones.some(f=>f(x,z));
  const treePick=(x,z,r)=>{const q=r();pkTree(x,z,x>2120&&q<.35?4:q<.62?0:q<.82?1:q<.9?2:3,.95+r()*.45)};
  pkTry('paths',()=>pkPaths(GR,P,D0,{rnd,skip,noFurn:skip,tree:treePick,benchStep:62,lampStep:44,treeStep:11,maxBench:240,maxLamp:260,
    pave:(kind,wide)=>kind===2?4:8}));
  pkZone(D0.poly,(n)=>n<.4?.07:.3+(n-.4)*1.0);
  pkTry('taras',()=>pkMonumentTaras(grp,P,GR,TARAS[0],TARAS[1],Math.PI/2));
  pkTry('fountain',()=>pkBigFountain(grp,P,GR,FOUNT[0],FOUNT[1]));
  pkTry('theatre',()=>pkGreenTheatre(grp,P,GR,THEA[0],THEA[1],Math.PI/2));
  pkTry('sailor',()=>pkSailorMemorial(grp,P,GR,SAIL[0],SAIL[1],-Math.PI/2));
  pkTry('tower',()=>pkWatchtower(grp,P,GR,WATCH[0],WATCH[1]));
  // amusement park (OSM: "Одеський лунапарк")
  pkTry('luna',()=>{
    const W=pkFerris(grp,1910,-9694,0,19);pkDropTower(grp,1958,-9709,40);pkCarousel(grp,1927,-9729,5.2,1);pkCarousel(grp,1906,-9630,4.6,2);pkSwingRide(grp,1930,-9709+0,12);
    pkCoaster(grp,1925,-9788,0,1);
    addBlock(1927,-9729,18,18,0);addBlock(1906,-9630,18,18,0);   // the OSM boxes under the two carousels
    PLACES.push({id:'luna',name:'Amusement park',sub:'Ferris wheel and rides',x:1935,z:-9660,yaw:Math.PI});
    TREE_CLEAR.push(1925,-9700,34,1925,-9770,30)});
  // playgrounds mapped in OSM
  for(const [px,pz,a] of [[1563,-10261,.3],[2061,-10194,1.2],[1621,-9938,-.5]])pkTry('play',()=>{playgroundArea(P,GR,{x:px,z:pz,w:18,d:14,a});TREE_CLEAR.push(px,pz,13)});
  // sea pines on the slope and a few spreading planes in the open lawns
  for(let i=0;i<70;i++){const a=rnd()*6.28,rr=40+rnd()*420;const x=1962+Math.cos(a)*rr*1.1,z=-10065+Math.sin(a)*rr*.62;if(!pkInPoly(D0.poly,x,z)||skip(x,z)||pkNearPath(x,z,4))continue;pkTree(x,z,rnd()<.35?4:0,.9+rnd()*.4)}
  PLACES.push({id:'shevpark2',name:'Shevchenko Park alley',sub:'main alley',x:1740,z:-10080,yaw:Math.PI/2});
  console.log('Shevchenko Park: benches',PK.nB,'lamps',PK.nL)}
