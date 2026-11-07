/* ===================================================================================================
   rides.js — the amusement-park rides (Ferris wheel you can ride, drop tower, carousel, swing ride, roller coaster)
   All rides are a handful of merged meshes (parks.js pkMerge) + InstancedMesh for the moving cars, animated from the
   game clock (UNI.uTime) so they cost almost nothing when nobody is near. Loaded BEFORE the main script.
   =================================================================================================== */

const PK_RIDES=[];
const pkNear=(x,z,r)=>Math.hypot(player.x-x,player.z-z)<r;
const pkNightN=()=>(UNI.uNight?UNI.uNight.value:0);
function pkTowerLights(parts,pts,r,hex){for(const p of pts)parts.push({g:new THREE.SphereGeometry(r,5,4),m:pkM(p[0],p[1],p[2]),c:sRGB(hex||'#fff1b8')})}

// ================= Ferris wheel (white rim, orange sunburst hub, red cabins, yellow/white lattice legs) =================
function pkFerris(grp,x,z,yaw,R){
  R=R||19;const gy=groundH(x,z),hub=R+3.4,N=16,sy=Math.sin(yaw),cy=Math.cos(yaw);
  const yel='#f1c232',wht='#f4f1ea',red='#c3262d',org='#ea7a1c',dk='#2a3036';
  // fixed part: two A-frames, axle housing, boarding deck
  const fx=[];
  for(const v of [-2.3,2.3])for(const sg of [-1,1]){
    const F=[sg*R*.62,-.5],H=[sg*.5,hub];
    for(const o of [-.42,.42]){fx.push(pkBeam([F[0]+o,F[1],v],[H[0]+o*.3,H[1],v],.3,yel))}
    const n=9;for(let k=0;k<n;k++){const t0=k/n,t1=(k+1)/n;const lx=t=>[F[0]+(H[0]-F[0])*t,F[1]+(H[1]-F[1])*t];
      const a=lx(t0),b=lx(t1),w0=.42*(1-t0*.7),w1=.42*(1-t1*.7);
      fx.push(pkBeam([a[0]-w0,a[1],v],[b[0]+w1,b[1],v],.13,wht),pkBeam([a[0]+w0,a[1],v],[b[0]-w1,b[1],v],.13,wht))}
    fx.push(pkBox(1.4,.5,1.4,F[0],-.25,v,'#8c8a84'))}
  for(const sg of [-1,1])fx.push(pkBeam([sg*R*.62,2.2,-2.3],[sg*R*.62,2.2,2.3],.2,yel),pkBeam([sg*R*.34,R*.6,-2.3],[sg*R*.34,R*.6,2.3],.2,yel));
  fx.push(pkCyl(.9,.9,6.6,12,0,hub,0,dk,Math.PI/2),pkBox(9,.32,5.6,0,-.1,0,'#6e6c66'));
  for(const sg of [-1,1])fx.push(pkBox(.12,1,5.6,sg*4.5,.45,0,'#c9c6bd'));
  const fixed=pkMesh(fx);
  // turning part: two rims, spokes, inner ring, sunburst hub with red ball, pivot bars
  const rt=[];const SP=2*N;
  for(const v of [-1.1,1.1]){rt.push(pkTor(R,.24,0,0,v,wht),pkTor(R*.52,.13,0,0,v,wht),pkTor(R+.4,.07,0,0,v,'#d8d4c8'));
    for(let k=0;k<SP;k++){const a=k/SP*6.2832;rt.push(pkBeam([Math.cos(a)*1.8,Math.sin(a)*1.8,v],[Math.cos(a)*R,Math.sin(a)*R,v],k%2?.1:.16,wht))}
    rt.push(pkCyl(2.7,2.7,.5,24,0,0,v*1.2,org,Math.PI/2));
    for(let k=0;k<24;k++){const a=k/24*6.2832;rt.push({g:new THREE.BoxGeometry(2.3,.16,.1),m:pkM(Math.cos(a)*1.45,Math.sin(a)*1.45,v*1.2+(v>0?.28:-.28),0,0,a),c:sRGB(k%2?'#fff0c8':'#c3262d')})}
    rt.push(pkSph(1.05,0,0,v*1.2+(v>0?.5:-.5),red))}
  rt.push(pkCyl(.5,.5,2.6,10,0,0,0,dk,Math.PI/2));
  for(let k=0;k<N;k++){const a=k/N*6.2832;rt.push(pkCyl(.2,.2,2.8,8,Math.cos(a)*R,Math.sin(a)*R,0,'#b7b3a8',Math.PI/2))}
  const turn=pkMesh(rt);
  // bulbs (night only)
  const bl=[];for(const v of [-1.1,1.1])for(let k=0;k<48;k++){const a=k/48*6.2832;bl.push({g:new THREE.SphereGeometry(.2,5,4),m:pkM(Math.cos(a)*(R+.55),Math.sin(a)*(R+.55),v),c:sRGB(k%2?'#fff0b0':'#ffd27a')})}
  for(let k=0;k<SP;k++){const a=k/SP*6.2832;bl.push({g:new THREE.SphereGeometry(.17,5,4),m:pkM(Math.cos(a)*R*.52,Math.sin(a)*R*.52,1.1),c:sRGB('#fff0b0')},{g:new THREE.SphereGeometry(.17,5,4),m:pkM(Math.cos(a)*R*.52,Math.sin(a)*R*.52,-1.1),c:sRGB('#fff0b0')})}
  const glow=pkMesh(bl,true);
  const rg=new THREE.Group();rg.position.set(x,gy,z);rg.rotation.y=yaw;rg.userData.dyn=true;grp.add(rg);rg.add(fixed);
  const hubG=new THREE.Group();hubG.position.y=hub;rg.add(hubG);hubG.add(turn);turn.add(glow);
  // cabins: one merged geometry, instanced; world-space matrices so they stay upright
  const cb=[];
  cb.push(pkBox(2.0,.16,1.8,0,-1.0,0,wht),pkCyl(.5,.9,.3,10,0,-.82,0,wht),pkBox(1.9,1.25,1.7,0,-1.75,0,red),pkBox(1.95,.55,1.75,0,-1.55,0,'#26343c'),pkBox(2.0,.1,1.8,0,-1.2,0,'#ffffff'),pkBox(1.9,.1,1.7,0,-2.4,0,'#6b6862'),
    pkBeam([-.8,-1.0,0],[0,.05,0],.07,'#b7b3a8'),pkBeam([.8,-1.0,0],[0,.05,0],.07,'#b7b3a8'),pkBox(.12,.9,1.76,0,-1.7,0,red),pkBox(.08,.5,.6,.97,-1.7,.55,'#e8e4d8'));
  const cabG=pkMerge(cb);const cabs=new THREE.InstancedMesh(cabG,pkMat(),N);cabs.castShadow=true;cabs.frustumCulled=false;cabs.userData.dyn=true;grp.add(cabs);
  const C={x,z,gy,hub,R,yaw,N,pos:[],th:0};for(let i=0;i<N;i++)C.pos.push({x:0,y:0,z:0});
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0)),S=new THREE.Vector3(1,1,1);const OM=0.05;
  const upd=()=>{const th=UNI.uTime.value*OM;C.th=th;hubG.rotation.z=th;glow.visible=pkNightN()>.2;
    for(let i=0;i<N;i++){const a=th+i/N*6.2832,lx=Math.cos(a)*R,ly=Math.sin(a)*R;const wx=x+lx*cy,wz=z-lx*sy,wy=gy+hub+ly;C.pos[i].x=wx;C.pos[i].y=wy;C.pos[i].z=wz;cabs.setMatrixAt(i,M.compose(new THREE.Vector3(wx,wy,wz),Q,S))}
    cabs.instanceMatrix.needsUpdate=true};
  upd();
  ANIM.push(dt=>{if(!pkNear(x,z,520)&&!(RIDE.on&&RIDE.tram&&RIDE.tram.ferris===C))return;upd()});
  STATIC_CIR.push(x+R*.62*cy,z-R*.62*sy,1.2,x-R*.62*cy,z+R*.62*sy,1.2);
  // riding
  const T={kind:'custom',ferris:C,leaveLabel:'Get off the Ferris wheel',i:0,
    step(t,dt){const p=C.pos[t.i];player.x=p.x;player.z=p.z;player.y=p.y-2.3;player.yaw=yaw+Math.PI/2;player.vx=player.vz=0;PLR.root.position.set(player.x,player.y,player.z);PLR.root.rotation.y=player.yaw;animPlayer(PLR,{spd:0,mode:'sit'},dt)},
    leave(t){const p=C.pos[t.i];const fl=p.y-2.3-gy;if(fl>2.4){toast('Wait for the cabin to come down','the wheel is turning');return}
      const ox=-Math.sin(yaw+Math.PI/2)*0+(-sy)*3.4,oz=-cy*3.4;const ex=p.x+Math.sin(yaw)*3.4,ez=p.z+Math.cos(yaw)*3.4;RIDE.on=false;RIDE.tram=null;player.x=ex;player.z=ez;player.y=groundH(ex,ez);player.vx=player.vz=0;cam.init=false}};
  let near=-1;
  INTERACT.push({x:0,z:0,r:1e9,label:'Take a seat — Ferris wheel',cond:()=>{if(RIDE.on||DRIVE.on||PORTAL.cur||player.sit)return false;if(!pkNear(x,z,16))return false;
    let best=-1,bd=1e9;for(let i=0;i<N;i++){const p=C.pos[i];if(p.y-2.3-gy>2.0)continue;const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<7&&d<bd){bd=d;best=i}}near=best;return best>=0},
    fn:()=>{if(near<0)return;T.i=near;RIDE.on=true;RIDE.tram=T;player.vx=player.vz=0;player.scoot=false;$('bScoot').classList.remove('on');cam.init=false;toast('Enjoy the view over the sea','press E at the bottom to get off');if(window.AUD)AUD.beep()}});
  PK_RIDES.push(C);return C}

// ================= Drop tower (yellow lattice, ring car with four seats) =================
function pkDropTower(grp,x,z,H){
  H=H||40;const gy=groundH(x,z);const yel='#f2c21f',wht='#f4f1ea',blu='#2a5fb0';const p=[];
  for(const sx of [-1,1])for(const sz of [-1,1])p.push(pkBox(.55,H,.55,sx*1.4,H/2,sz*1.4,yel));
  const n=Math.round(H/3);for(let k=0;k<n;k++){const y0=k*3,y1=y0+3;for(const [ax,az,bx,bz] of [[-1.4,-1.4,1.4,-1.4],[1.4,-1.4,1.4,1.4],[1.4,1.4,-1.4,1.4],[-1.4,1.4,-1.4,-1.4]]){
    p.push(pkBeam([ax,y0,az],[bx,y1,bz],.12,wht),pkBeam([bx,y0,bz],[ax,y1,az],.12,wht));if(k%2===0)p.push(pkBeam([ax,y0,az],[bx,y0,bz],.14,yel))}}
  p.push(pkBox(4.6,.9,4.6,0,H+.4,0,blu),pkBox(3.2,1.2,3.2,0,H+1.4,0,wht),pkBox(5.4,.4,5.4,0,.2,0,'#8c8a84'),pkBox(.5,H+3,.5,0,(H+3)/2,0,'#cfcac0'));
  const lit=[];for(let k=0;k<20;k++)lit.push([Math.cos(k/20*6.28)*2.4,H+.2,Math.sin(k/20*6.28)*2.4]);
  const part=[];pkTowerLights(part,lit,.18);const glow=pkMesh(part,true);
  const tower=pkMesh(p);tower.position.set(x,gy,z);tower.userData.dyn=true;grp.add(tower);glow.position.set(x,gy,z);glow.userData.dyn=true;grp.add(glow);
  const cr=[pkBox(4.4,.35,4.4,0,0,0,blu),pkBox(3.0,.3,3.0,0,.3,0,'#222'),pkBox(4.4,.12,.4,0,.2,2.1,wht),pkBox(4.4,.12,.4,0,.2,-2.1,wht)];
  for(let k=0;k<4;k++){const a=k*Math.PI/2+.78;cr.push(pkBox(1.1,.5,1.1,Math.cos(a)*2.2,-.4,Math.sin(a)*2.2,'#c3262d'),pkBox(1.0,.9,.18,Math.cos(a)*2.2+Math.cos(a)*.5,.2,Math.sin(a)*2.2+Math.sin(a)*.5,'#c3262d',0,-a))}
  const car=pkMesh(cr);car.position.set(x,gy+1,z);car.userData.dyn=true;grp.add(car);
  const top=H-1,ph=(t)=>{t%=28;if(t<5)return 0;if(t<20)return pkSmooth(5,20,t)*top;if(t<22.5)return top;if(t<24.2){const k=(t-22.5)/1.7;return top*(1-k*k)}if(t<25.2){const k=(t-24.2);return Math.abs(Math.sin(k*Math.PI*1.5))*(1-k)*3.2*(1-0)}return 0};
  ANIM.push(dt=>{if(!pkNear(x,z,480))return;const t=UNI.uTime.value;car.position.y=gy+1+ph(t+x*.01);glow.visible=pkNightN()>.2});
  STATIC_CIR.push(x,z,3);return tower}

// ================= Carousel (striped canopy, horses on poles, rotating platform, bulbs) =================
function pkHorseGeo(hex,mane){const b=[pkBox(.42,.5,1.25,0,0,0,hex),pkBox(.3,.62,.3,0,.38,.62,hex,0.5),pkBox(.26,.3,.52,0,.78,.9,hex,-.35),pkBox(.28,.5,.08,0,.58,.52,mane),pkBox(.09,.09,.45,0,.05,-.74,mane,.5),pkBox(.46,.07,.5,0,.28,.02,'#8a2a2a')];
  for(const sx of [-1,1])for(const sz of [-1,1])b.push(pkBox(.1,.5,.1,sx*.14,-.45,sz*.45,hex));return pkMerge(b)}
function pkCarousel(grp,x,z,R,seed){
  R=R||5;const gy=groundH(x,z),r=mkRand(seed||3);const red='#c3262d',cre='#f4ead0',gold='#d6a43a';
  const tp=[];const NS=16;
  for(let k=0;k<NS;k++){tp.push({g:new THREE.ConeGeometry(R+.9,1.9,1,1,false,k/NS*6.2832,6.2832/NS),m:pkM(0,5.6,0),c:sRGB(k%2?cre:red)})}
  tp.push(pkTor(R+.55,.14,0,4.72,0,gold,Math.PI/2),pkCyl(1.0,1.0,4.2,14,0,2.6,0,'#b8a27a'),pkSph(.35,0,6.7,0,gold),pkCyl(R,R,.18,28,0,4.6,0,cre));
  for(let k=0;k<NS;k++){const a=k/NS*6.2832;tp.push(pkBox(.5,.7,.05,Math.cos(a)*(R+.3),4.35,Math.sin(a)*(R+.3),k%2?red:cre,0,-a))}
  const bl=[];for(let k=0;k<32;k++){const a=k/32*6.2832;bl.push({g:new THREE.SphereGeometry(.13,5,4),m:pkM(Math.cos(a)*(R+.62),4.55,Math.sin(a)*(R+.62)),c:sRGB(k%2?'#fff0b0':'#ffd27a')})}
  const top=pkMesh(tp),glow=pkMesh(bl,true);const root=new THREE.Group();root.position.set(x,gy,z);root.userData.dyn=true;grp.add(root);root.add(top,glow);
  const pl=[pkCyl(R,R,.4,28,0,.2,0,'#6b3f26'),pkCyl(R-.2,R-.2,.06,28,0,.43,0,'#b08a54'),pkCyl(1.2,1.2,4.4,12,0,2.4,0,'#9c3a2e')];
  for(let k=0;k<12;k++){const a=k/12*6.2832;pl.push(pkCyl(.05,.05,4.1,6,Math.cos(a)*R*.72,2.5,Math.sin(a)*R*.72,gold));pl.push(pkBox(.06,3.6,1.3,Math.cos(a)*1.25,2.4,Math.sin(a)*1.25,'#cfe0e6',0,-a+1.57))}
  const spin=pkMesh(pl);root.add(spin);
  const cols=[['#f1ece0','#c9b78a'],['#6b3f26','#2a1a10'],['#222428','#aa2a2a'],['#c9a56a','#f4ead0']];const horses=[];
  for(let k=0;k<4;k++)horses.push(new THREE.InstancedMesh(pkHorseGeo(cols[k][0],cols[k][1]),pkMat(),3));
  for(const h of horses){h.castShadow=true;h.frustumCulled=false;h.userData.dyn=true;root.add(h)}
  const M=new THREE.Matrix4(),E=new THREE.Euler(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(1,1,1);
  ANIM.push(dt=>{if(!pkNear(x,z,420))return;const t=UNI.uTime.value,w=t*.7;spin.rotation.y=-w;glow.visible=pkNightN()>.2;
    for(let k=0;k<12;k++){const a=k/12*6.2832-w,hh=1.55+Math.sin(t*2.4+k*1.7)*.38;E.set(0,-a+Math.PI,0);Q.setFromEuler(E);V.set(Math.cos(a)*R*.72,hh,Math.sin(a)*R*.72);horses[k%4].setMatrixAt((k/4)|0,M.compose(V,Q,S))}
    for(const h of horses)h.instanceMatrix.needsUpdate=true});
  STATIC_CIR.push(x,z,R+.4);return root}

// ================= Swing ride (chair-o-plane): spinning crown, chairs on chains fly out =================
function pkSwingRide(grp,x,z,H){
  H=H||12;const gy=groundH(x,z);const blu='#2a5fb0',yel='#f2c21f',wht='#f4f1ea';
  const tw=[pkCyl(1.1,.7,H,12,0,H/2,0,blu),pkCyl(2.4,2.4,.5,16,0,.25,0,'#6e6c66')];for(let k=0;k<6;k++)tw.push(pkBox(.18,H*.8,.18,Math.cos(k)*.9,H*.4,Math.sin(k)*.9,yel));
  const tower=pkMesh(tw);tower.position.set(x,gy,z);tower.userData.dyn=true;grp.add(tower);
  const cr=[];const NS=16;
  for(let k=0;k<NS;k++){cr.push({g:new THREE.ConeGeometry(5.4,1.8,1,1,false,k/NS*6.2832,6.2832/NS),m:pkM(0,.95,0),c:sRGB(k%2?wht:'#c3262d')})}
  cr.push(pkCyl(5.4,5.4,.5,24,0,-.1,0,blu),pkTor(5.3,.12,0,.05,0,'#d6a43a',Math.PI/2),pkSph(.5,0,2.0,0,'#d6a43a'));
  const crown=pkMesh(cr);const cg=new THREE.Group();cg.position.set(x,gy+H,z);cg.userData.dyn=true;grp.add(cg);cg.add(crown);
  const seatG=pkMerge([pkBox(.7,.1,.6,0,0,0,'#c3262d'),pkBox(.7,.55,.08,0,.3,-.3,'#c3262d'),pkBox(.06,.35,.5,.35,.2,0,'#d6a43a'),pkBox(.06,.35,.5,-.35,.2,0,'#d6a43a')]);
  const chG=pkMerge([pkBox(.04,1,.04,0,.5,0,'#c9c6bd')]);
  const NSEAT=16,seats=new THREE.InstancedMesh(seatG,pkMat(),NSEAT),chains=new THREE.InstancedMesh(chG,pkMat(),NSEAT);for(const m of [seats,chains]){m.frustumCulled=false;m.userData.dyn=true;m.castShadow=true;grp.add(m)}
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Q2=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(1,1,1),Up=new THREE.Vector3(0,1,0),D=new THREE.Vector3(),A=new THREE.Vector3(),B=new THREE.Vector3();
  const L=5.2;
  ANIM.push(dt=>{if(!pkNear(x,z,420))return;const t=UNI.uTime.value+x;const ct=t%34;const ramp=ct<4?ct/4:ct<24?1:ct<30?(30-ct)/6:0;const W=1.3;
    const Acc=ct<4?ct*ct/8:ct<24?2+(ct-4):ct<30?22+(36-(30-ct)*(30-ct))/12:25;const ang=(Math.floor(t/34)*25+Acc)*W;
    cg.rotation.y=ang;const tilt=.55*ramp;
    for(let i=0;i<NSEAT;i++){const a=ang+i/NSEAT*6.2832;const rx=Math.cos(a),rz=-Math.sin(a);A.set(x+rx*4.9,gy+H-.3,z+rz*4.9);B.set(x+rx*(4.9+L*Math.sin(tilt)),gy+H-.3-L*Math.cos(tilt),z+rz*(4.9+L*Math.sin(tilt)));
      D.subVectors(B,A);const len=D.length();Q.setFromUnitVectors(Up,D.clone().normalize());M.compose(V.copy(A).add(B).multiplyScalar(.5),Q,S.set(1,len,1));chains.setMatrixAt(i,M);S.set(1,1,1);
      Q2.setFromEuler(new THREE.Euler(0,a+Math.PI/2,0));M.compose(B,Q2,S);seats.setMatrixAt(i,M)}
    seats.instanceMatrix.needsUpdate=chains.instanceMatrix.needsUpdate=true});
  STATIC_CIR.push(x,z,2.6);return cg}

// ================= Roller coaster (closed spline track on supports, three-car train) =================
function pkCoaster(grp,x,z,rot,scale){
  scale=scale||1;const c=Math.cos(rot||0),s=Math.sin(rot||0);const gy=groundH(x,z);
  const base=[[-34,5],[-22,9],[-8,16],[6,6],[20,10],[34,5],[40,-6],[30,-14],[12,-9],[2,-16],[-12,-8],[-22,-16],[-36,-12],[-42,0]];
  const P3=base.map(([u,v],i)=>{const h=[2.4,7,14,5,9,3.5,3,6,10,5.5,12,5,3.2,3][i];const wx=x+(u*c-v*s)*scale,wz=z+(u*s+v*c)*scale;return new THREE.Vector3(wx,groundH(wx,wz)+h,wz)});
  const curve=new THREE.CatmullRomCurve3(P3,true,'catmullrom',.5);const NSEG=260;const len=curve.getLength();
  const frames=curve.computeFrenetFrames(NSEG,true);const pts=curve.getSpacedPoints(NSEG);
  const side=(o)=>pts.map((p,i)=>{const nv=frames.binormals[Math.min(i,NSEG-1)];return new THREE.Vector3(p.x+nv.x*o,p.y+nv.y*o,p.z+nv.z*o)});
  const parts=[];const col=sRGB('#c3262d'),wh=sRGB('#f4f1ea');
  const spine=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0,-1).map(p=>new THREE.Vector3(p.x,p.y-.35,p.z)),true),NSEG,.16,5,true);
  parts.push({g:spine,m:new THREE.Matrix4(),c:col});
  for(const o of [-.55,.55]){const sp=side(o).slice(0,-1);parts.push({g:new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp,true),NSEG,.07,4,true),m:new THREE.Matrix4(),c:wh})}
  // sleepers + supports
  const stp=Math.max(1,Math.round(NSEG/(len/1.7)));
  for(let i=0;i<NSEG;i+=stp){const p=pts[i],b=frames.binormals[Math.min(i,NSEG-1)],t=frames.tangents[Math.min(i,NSEG-1)];
    const ang=Math.atan2(t.x,t.z);parts.push({g:new THREE.BoxGeometry(1.35,.07,.14),m:pkM(p.x,p.y-.05,p.z,0,ang,0),c:sRGB('#8c8a84')})}
  for(let i=0;i<NSEG;i+=Math.max(1,Math.round(NSEG/(len/8)))){const p=pts[i],g0=groundH(p.x,p.z);const h=p.y-.45-g0;if(h<.5)continue;
    parts.push(pkBeam([p.x-.35,g0-.2,p.z],[p.x-.35,p.y-.45,p.z],.2,'#e9e5da'),pkBeam([p.x+.35,g0-.2,p.z],[p.x+.35,p.y-.45,p.z],.2,'#e9e5da'));
    if(h>3)parts.push(pkBeam([p.x-.35,g0+h*.25,p.z],[p.x+.35,g0+h*.7,p.z],.08,'#e9e5da'),pkBeam([p.x+.35,g0+h*.25,p.z],[p.x-.35,g0+h*.7,p.z],.08,'#e9e5da'))}
  const track=new THREE.Mesh(pkMerge(parts),pkMat());track.castShadow=true;track.receiveShadow=true;track.userData.dyn=true;grp.add(track);
  // train
  const carG=pkMerge([pkBox(.95,.42,1.7,0,.25,0,'#f1c232'),pkBox(.95,.5,.16,0,.62,-.8,'#c3262d'),pkBox(.12,.4,1.5,.5,.55,0,'#c3262d'),pkBox(.12,.4,1.5,-.5,.55,0,'#c3262d'),pkBox(.3,.26,.3,.25,.5,.4,'#e8c9a0'),pkBox(.3,.26,.3,-.25,.5,.4,'#e8c9a0')]);
  const NC=4,cars=new THREE.InstancedMesh(carG,pkMat(),NC);cars.frustumCulled=false;cars.castShadow=true;cars.userData.dyn=true;grp.add(cars);
  let ups=0,vel=7;const M=new THREE.Matrix4(),Qt=new THREE.Quaternion(),Vp=new THREE.Vector3(),Sc=new THREE.Vector3(1,1,1),Mx=new THREE.Matrix4(),X=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3();
  const hMax=Math.max(...P3.map(p=>p.y));
  ANIM.push(dt=>{if(!pkNear(x,z,520))return;dt=Math.min(dt,.05);const u0=ups;const p=curve.getPointAt(ups%1);vel=Math.sqrt(Math.max(9,2*9.8*0.55*(hMax-p.y+1)+16));ups=(ups+vel*dt/len)%1;
    for(let i=0;i<NC;i++){const u=((ups-i*2.1/len)%1+1)%1;const pp=curve.getPointAt(u),tg=curve.getTangentAt(u);Z.copy(tg);X.crossVectors(Y,Z).normalize();const yy=new THREE.Vector3().crossVectors(Z,X);Mx.makeBasis(X,yy,Z);Qt.setFromRotationMatrix(Mx);M.compose(Vp.set(pp.x,pp.y+.05,pp.z),Qt,Sc);cars.setMatrixAt(i,M)}
    cars.instanceMatrix.needsUpdate=true});
  PK_RIDES.push({coaster:true,x,z});return curve}
