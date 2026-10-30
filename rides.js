/* ===================================================================================================
   rides.js — the amusement-park rides (Ferris wheel you can ride, drop tower, carousel, swing ride, roller coaster)
   All rides are a handful of merged meshes (parks.js pkMerge) + InstancedMesh for the moving cars, animated from the
   game clock (UNI.uTime) so they cost almost nothing when nobody is near. Loaded BEFORE the main script.
   =================================================================================================== */

const PK_RIDES=[];
const pkNear=(x,z,r)=>Math.hypot(player.x-x,player.z-z)<r;
const pkNightN=()=>(UNI.uNight?UNI.uNight.value:0);
function pkTowerLights(parts,pts,r,hex){for(const p of pts)parts.push({g:new THREE.SphereGeometry(r,5,4),m:pkM(p[0],p[1],p[2]),c:sRGB(hex||'#fff1b8')})}

// ================= ride controller: ticket gate, operator, loading, run, braking, unloading =================
// A ride is "wait" (standing still, operator at the controls) -> "load" (you are seated) -> "run" -> "brake" (snaps to its stopping slot) -> "unload".
// Empty rides give a demo run now and then; paying at the gate stops a demo and loads you. Rides are driven by their own phase K.ph (not the
// game clock) so a ride can stand still. timed: a fixed sequence on K.rt (drop tower); ext: the ride moves itself and calls K.atRest() (coaster).
const LPK=[],LPOP=[];
const lpWrap=a=>{while(a>Math.PI)a-=6.2832;while(a<-Math.PI)a+=6.2832;return a};
const lpLoc=(x,z,yaw,u,v)=>[x+u*Math.cos(yaw)+v*Math.sin(yaw),z-u*Math.sin(yaw)+v*Math.cos(yaw)];
const lpFace=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z);
function lpCtl(o){
  const K=Object.assign({st:'wait',t:0,v:0,sp:0,ph:0,rt:0,lap:0,want:false,riding:false,idle:26,demoT:34,run:60,acc:.25,dec:.35,wmax:1,slot:0,price:30,far:520,camYaw:0,camFollow:false,camDist:15,camH:1.4,seed:LPK.length+3},o);
  K.cyc=K.idle*(.15+Math.random()*.85);K.o={x:0,y:0,z:0,yaw:0};
  const T=K.T={kind:'custom',x:0,y:0,z:0,yaw:K.camYaw,camH:K.camH,camDist:K.camDist,
    get leaveLabel(){return K.st==='run'&&K.noStop?'Hold on tight…':(K.st==='run'||K.st==='load'?'Ask the operator to stop':'The ride is stopping…')},
    step(t,dt){K.follow(dt)},
    leave(t){if(K.st==='load'){K.st='unload';K.t=0}else if(K.st==='run'){if(K.noStop)toast('Hold on tight','this ride cannot be stopped in mid-air');else{K.finish();toast('Operator','Stopping the ride — stay seated')}}else toast('Wait a moment','the ride is stopping')}};
  K.follow=function(dt){const s=K.seatPose(K.o);player.x=s.x;player.y=s.y;player.z=s.z;player.yaw=s.yaw;player.vx=player.vz=player.vy=0;player.air=false;
    PLR.root.position.set(s.x,s.y,s.z);PLR.root.rotation.y=s.yaw;if(s.pitch!==undefined){PLR.root.rotation.order='YXZ';PLR.root.rotation.x=s.pitch}
    animPlayer(PLR,{spd:0,mode:'sit'},dt);T.x=s.x;T.y=s.y;T.z=s.z;T.yaw=K.camFollow?s.yaw:K.camYaw};
  K.board=function(){K.seat=K.pick();rideStart(T,'Seat belts fastened','the operator starts the '+K.name);K.riding=true;K.follow(0)};
  K.unboard=function(){if(!K.riding)return;K.riding=false;PLR.root.rotation.x=0;PLR.root.rotation.order='XYZ';
    if(RIDE.on&&RIDE.tram===T){RIDE.on=false;RIDE.tram=null}
    const p=K.exitPos||[K.gx,K.gz];player.x=p[0];player.z=p[1];player.y=groundH(p[0],p[1]);player.vx=player.vz=0;player.yaw=K.gyaw+Math.PI;PLR.root.position.set(player.x,player.y,player.z);PLR.root.rotation.y=player.yaw;cam.init=false;
    toast('Thanks for riding','the '+K.name+' — come again!')};
  K.finish=function(){if(K.st==='run'||K.st==='demo'){K.st='brake';K.stopT=undefined;if(K.timed)K.atRest()}};
  K.atRest=function(){K.v=0;K.sp=0;K.rt=0;K.stopT=undefined;K.t=0;
    if(K.riding){K.st='unload';toast('The ride is over','stay seated until the bar lifts')}else{K.st='wait';K.cyc=K.idle*(.6+Math.random()*.8)}};
  K.tick=function(dt){dt=Math.min(dt,.1);
    if(K.riding&&(!RIDE.on||RIDE.tram!==T)){K.riding=false;K.want=false;PLR.root.rotation.x=0;PLR.root.rotation.order='XYZ';if(K.st==='run'||K.st==='load'){K.st=K.st==='load'?'run':K.st;K.finish()}}   // teleported / reset while on the ride
    if(!K.riding&&!K.want&&Math.hypot(player.x-K.x,player.z-K.z)>K.far)return;
    K.t+=dt;
    if(K.want&&!K.riding&&Math.hypot(player.x-K.gx,player.z-K.gz)>40){K.want=false;S.cash=WALLET.get()+K.price;saveS();toast('Ticket refunded','you walked away from the '+K.name)}
    const st=K.st;
    if(st==='wait'){K.v=0;K.sp=0;
      if(K.want&&!K.riding){K.st='load';K.t=0;K.board()}
      else if(K.t>K.cyc){K.st='demo';K.t=0;K.rt=0;K.lap=0}}
    else if(st==='load'){if(K.t>2.4){K.st='run';K.t=0;K.rt=0;K.lap=0}}
    else if(st==='run'||st==='demo'){
      if(st==='demo'&&K.want)K.finish();
      else if(!K.ext){if(!K.timed)K.v=Math.min(K.wmax,K.v+K.acc*dt);K.rt+=dt;if(K.rt>=(st==='run'?K.run:K.demoT))K.finish()}}
    else if(st==='brake'){
      if(K.timed)K.atRest();
      else if(!K.ext){
        if(K.stopT===undefined){const s=K.v*K.v/(2*K.dec);K.stopT=K.snap?K.snap(K.ph+s):(K.slot?Math.ceil((K.ph+s)/K.slot-1e-6)*K.slot:K.ph+s)}
        const rem=K.stopT-K.ph;
        if(rem<=.002){K.ph=K.stopT;K.atRest()}else{const lim=Math.min(K.wmax,Math.sqrt(2*K.dec*rem)+.03);K.v=K.v>lim?lim:Math.min(lim,K.v+K.acc*dt)}}}
    else if(st==='unload'){if(K.t>1.7){K.unboard();K.st='wait';K.t=0;K.want=false;K.cyc=K.idle*(.6+Math.random()*.8)}}
    if(!K.ext&&!K.timed){K.ph+=K.v*dt;K.sp=K.v/K.wmax}};
  K.gate=function(){INTERACT.push({x:K.gx,z:K.gz,r:3.6,
    get label(){return 'Ride the '+K.name+' · ₴'+K.price},
    cond:()=>!RIDE.on&&!DRIVE.on&&!PORTAL.cur&&!player.sit&&!K.want&&!K.riding,
    fn:()=>{if(!WALLET.pay(K.price,K.name+' ticket'))return;K.want=true;toast('Ticket bought','the operator is stopping the '+K.name+' — wait by the gate')}})};
  LPK.push(K);return K}

// the operator: a real avatar in a bright vest who greets you, works the lever and waves you in
function lpOperator(grp,K,x,z,yaw,seed,vest){
  if(!LPOP.length)ANIM.push(dt=>lpOpTick(dt));
  const R=mkRand((seed||1)*77+5),pick=a=>a[Math.floor(R()*a.length)],H=pick(CH_HAIR),fem=R()<.45;
  const o={skin:pick(CH_SKIN.slice(0,6)),iris:pick(CH_EYE)[1],hs:fem?pick(['long','pony','bun','short']):pick(['short','swept','buzz']),hair:H[1],hair2:H[2],brow:H[3],ts:'tee',shirt:vest,bs:'jeans',jeans:0x2a3350,cuff:0x2e3550,ss:'sneaker',shoe:0x1c1c1e,sole:0xeeeeee,
    gl:'none',ht:R()<.5?'cap':'none',ac:vest,bk:'none',nk:'none',cn:false,bd:(!fem&&R()<.3)?'stubble':'none'};
  const P=makePlayer(o);animPlayer(P,{spd:0,mode:'walk'},0);P.can.visible=false;P.scooter.visible=false;P.speaker.visible=false;
  P.root.position.set(x,groundH(x,z),z);P.root.rotation.y=yaw;P.root.traverse(m=>{if(m.isMesh)m.castShadow=false});mergeAvatar(P.root);P.root.userData.dyn=true;grp.add(P.root);   // dyn: keep the static batcher away from the animated avatar
  const c={P,K,x,z,yaw,t:R()*10,look:0,wave:0,near:false};LPOP.push(c);return c}
function lpOpTick(dt){for(const c of LPOP){const d=Math.hypot(player.x-c.x,player.z-c.z);if(d>70)continue;const P=c.P,K=c.K,dx=player.x-c.x,dz=player.z-c.z;c.t+=dt;
  if(d<5&&!c.near){c.wave=2.2;c.near=true}if(d>9)c.near=false;c.wave=Math.max(0,c.wave-dt);
  let ry=0;if(d<14){ry=Math.atan2(dx,dz)-c.yaw;ry=lpWrap(ry);ry=Math.max(-.9,Math.min(.9,ry))}
  c.look+=(ry-c.look)*Math.min(1,dt*5);P.head.rotation.y=c.look;P.head.rotation.x=.02;P.spine.rotation.x=.04+Math.sin(c.t*1.6)*.012;P.hips.position.y=P.hipY+Math.sin(c.t*1.6)*.004;
  const R=P.arms[1],L=P.arms[0],work=K.st==='load'||K.st==='run'||K.st==='brake'||K.st==='unload';
  if(c.wave>0||(K.want&&K.st==='wait')){R.sh.rotation.x=-2.5+Math.sin(c.t*9)*.18;R.sh.rotation.z=-.35;R.el.rotation.x=-.5+Math.sin(c.t*9)*.3;L.sh.rotation.x=-.25;L.el.rotation.x=-.5}
  else if(work){const lv=Math.sin(c.t*1.3);R.sh.rotation.x=-.9+lv*.15;R.sh.rotation.z=-.1;R.el.rotation.x=-.8;L.sh.rotation.x=-.5;L.sh.rotation.z=.08;L.el.rotation.x=-.7}
  else{R.sh.rotation.x=-.45+Math.sin(c.t*2)*.05;R.sh.rotation.z=-.06;R.el.rotation.x=-.8;L.sh.rotation.x=-.4;L.sh.rotation.z=.06;L.el.rotation.x=-.8}}}

// ticket booth with a striped awning and a sign; ride gate = booth + operator + the E prompt at the gate point
function lpBooth(grp,x,z,yaw,col,t1,t2){
  const gy=groundH(x,z),w='#f4f1ea',p=[pkBox(2.6,.16,1.9,0,.08,0,'#6e6c66'),pkBox(2.2,2.1,1.5,0,1.16,0,col),pkBox(1.5,.8,.05,0,1.45,.77,'#26343c'),pkBox(2.5,.1,.5,0,1.0,.95,'#d9d4c4'),pkBox(2.8,.14,1.8,0,2.34,.1,w)];
  for(let k=0;k<6;k++)p.push(pkBox(.45,.06,.7,-1.12+k*.45,2.14,.95,k%2?w:col,.5));
  const g=new THREE.Group();g.position.set(x,gy,z);g.rotation.y=yaw;g.userData.dyn=true;grp.add(g);const m=pkMesh(p);g.add(m);
  const sg=plateMesh([t1,t2],{w:512,h:180,size:62,color:'#ffffff',bg:'#1b1d22',weight:'800'},2.2,.78,.9);sg.position.set(0,2.95,.93);g.add(sg);
  STATIC_CIR.push(x,z,1.25);return g}
function lpGate(grp,K,s){K.gx=s.gx;K.gz=s.gz;K.gyaw=s.gyaw;K.gate();
  lpBooth(grp,s.bx,s.bz,lpFace(s.bx,s.bz,s.gx,s.gz),s.col||'#c3262d',K.name.toUpperCase(),'₴'+K.price+' · tickets');
  K.op=lpOperator(grp,K,s.ox,s.oz,lpFace(s.ox,s.oz,s.tx===undefined?s.gx:s.tx,s.tz===undefined?s.gz:s.tz),K.seed,s.vest||0xe8741c)}

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
  fx.push(pkCyl(.9,.9,6.6,12,0,hub,0,dk,Math.PI/2),pkBox(9,1.1,5.6,0,.45,0,'#6e6c66'),pkBox(3,.5,.9,0,.25,3.25,'#8c8a84'));   // boarding deck at cabin-floor height
  for(const sg of [-1,1])fx.push(pkBox(.12,1,5.6,sg*4.5,1.55,0,'#c9c6bd'));
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
  const gt=lpLoc(x,z,yaw,0,7.6);
  const K=lpCtl({name:'Ferris wheel',price:40,x,z,wmax:.2,acc:.035,dec:.05,slot:6.2832/N,run:62,demoT:52,idle:22,camYaw:yaw+Math.PI,camDist:17,
    pick(){let b=0,bd=9;for(let i=0;i<N;i++){const d=Math.abs(lpWrap(K.ph+i/N*6.2832+Math.PI/2));if(d<bd){bd=d;b=i}}return b},
    seatPose(o){const p=C.pos[K.seat];o.x=p.x;o.z=p.z;o.y=p.y-2.3;o.yaw=yaw+Math.PI/2;return o},
    // with you aboard the wheel stops with your cabin at (or one slot from) the boarding deck, otherwise on any slot
    snap(p){const sl=6.2832/N;if(!K.riding)return Math.ceil(p/sl-1e-6)*sl;const base=-Math.PI/2-K.seat*sl;let best=1e18;for(const o of [-1,0,1]){const b=base+o*sl,t=b+Math.ceil((p-b)/6.2832-1e-6)*6.2832;if(t<best)best=t}return best}});
  const ob=lpLoc(x,z,yaw,3.6,5.2),bb=lpLoc(x,z,yaw,7.4,7.2);
  lpGate(grp,K,{gx:gt[0],gz:gt[1],gyaw:yaw+Math.PI,ox:ob[0],oz:ob[1],tx:x,tz:z,bx:bb[0],bz:bb[1],col:'#c3262d',vest:0xe8741c});C.ctl=K;
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0)),S=new THREE.Vector3(1,1,1);
  const upd=()=>{const th=K.ph;C.th=th;hubG.rotation.z=th;glow.visible=pkNightN()>.2;
    for(let i=0;i<N;i++){const a=th+i/N*6.2832,lx=Math.cos(a)*R,ly=Math.sin(a)*R;const wx=x+lx*cy,wz=z-lx*sy,wy=gy+hub+ly;C.pos[i].x=wx;C.pos[i].y=wy;C.pos[i].z=wz;cabs.setMatrixAt(i,M.compose(new THREE.Vector3(wx,wy,wz),Q,S))}
    cabs.instanceMatrix.needsUpdate=true};
  upd();
  ANIM.push(dt=>{K.tick(dt);if(!pkNear(x,z,520)&&!K.riding)return;upd()});
  STATIC_CIR.push(x+R*.62*cy,z-R*.62*sy,1.2,x-R*.62*cy,z+R*.62*sy,1.2);
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
  for(let k=0;k<4;k++){const a=k*Math.PI/2+.78;cr.push(pkBox(1.1,.5,1.1,Math.cos(a)*2.2,.35,Math.sin(a)*2.2,'#c3262d'),pkBox(1.0,.95,.18,Math.cos(a)*1.65,.95,Math.sin(a)*1.65,'#c3262d',0,Math.PI/2-a),pkBox(.14,.14,.9,Math.cos(a)*2.45,.95,Math.sin(a)*2.45,'#d6a43a',0,Math.PI/2-a))}
  const car=pkMesh(cr);car.position.set(x,gy+1,z);car.userData.dyn=true;grp.add(car);
  const top=H-1,ph=(t)=>{if(t<1.5)return 0;if(t<14)return pkSmooth(1.5,14,t)*top;if(t<16.5)return top;if(t<18.2){const k=(t-16.5)/1.7;return top*(1-k*k)}if(t<19.2){const k=(t-18.2);return Math.abs(Math.sin(k*Math.PI*1.5))*(1-k)*3.2}return 0};
  const sa=.78,carY=()=>gy+1+((K.st==='run'||K.st==='demo'||K.st==='brake')?ph(K.rt):0);
  const gt=[x+Math.cos(sa)*7.2,z+Math.sin(sa)*7.2],ob=[x+Math.cos(sa+.5)*6.6,z+Math.sin(sa+.5)*6.6],bb=[x+Math.cos(sa+1.1)*9.5,z+Math.sin(sa+1.1)*9.5];
  const K=lpCtl({name:'Drop tower',price:50,x,z,timed:true,noStop:true,run:19.6,demoT:19.6,idle:34,camYaw:Math.atan2(Math.cos(sa),Math.sin(sa)),camDist:15,camH:1.2,
    pick(){return 0},seatPose(o){o.x=x+Math.cos(sa)*2.2;o.z=z+Math.sin(sa)*2.2;o.y=carY()+.175;o.yaw=Math.atan2(Math.cos(sa),Math.sin(sa));return o}});
  lpGate(grp,K,{gx:gt[0],gz:gt[1],gyaw:sa+Math.PI+Math.PI/2*0+Math.PI/2*0,ox:ob[0],oz:ob[1],tx:x,tz:z,bx:bb[0],bz:bb[1],col:'#2a5fb0',vest:0x2a8fe8});
  K.gyaw=lpFace(gt[0],gt[1],x,z);
  ANIM.push(dt=>{K.tick(dt);if(!pkNear(x,z,480)&&!K.riding)return;car.position.y=carY();glow.visible=pkNightN()>.2});
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
  const gt=[x+R+2.6,z],ob=[x+R+1.6,z-3.4],bb=[x+R+3.4,z+3.6];let bob=0;
  const hpos=(k,o)=>{const a=k/12*6.2832-K.ph,hh=1.55+Math.sin(bob+k*1.7)*.38*K.sp;o.x=x+Math.cos(a)*R*.72;o.z=z+Math.sin(a)*R*.72;o.hh=hh;o.yaw=Math.PI-a;return o};
  const K=lpCtl({name:'Carousel',price:25,x,z,wmax:.75,acc:.14,dec:.22,run:46,demoT:40,idle:18,camYaw:0,camDist:13,camH:1.5,
    pick(){let b=0,bd=9;for(let k=0;k<12;k++){const d=Math.abs(lpWrap(k/12*6.2832-K.ph));if(d<bd){bd=d;b=k}}return b},
    seatPose(o){const h=hpos(K.seat,{});o.x=h.x;o.z=h.z;o.y=gy+h.hh-.16;o.yaw=h.yaw;return o}});
  lpGate(grp,K,{gx:gt[0],gz:gt[1],gyaw:-Math.PI/2,ox:ob[0],oz:ob[1],tx:x,tz:z,bx:bb[0],bz:bb[1],col:'#c3262d',vest:0xd6a43a});
  ANIM.push(dt=>{K.tick(dt);if(!pkNear(x,z,420)&&!K.riding)return;const t=UNI.uTime.value,w=K.ph;bob+=dt*K.sp*3.2;spin.rotation.y=-w;glow.visible=pkNightN()>.2;
    for(let k=0;k<12;k++){const a=k/12*6.2832-w,hh=1.55+Math.sin(bob+k*1.7)*.38*K.sp;E.set(0,-a+Math.PI,0);Q.setFromEuler(E);V.set(Math.cos(a)*R*.72,hh,Math.sin(a)*R*.72);horses[k%4].setMatrixAt((k/4)|0,M.compose(V,Q,S))}
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
  const L=5.2,Hlow=L+1.7;
  const seatAt=(i,o)=>{const a=K.ph+i/NSEAT*6.2832,tilt=.55*K.sp,Hc=Hlow+(H-Hlow)*pkSmooth(0,.5,K.sp),rx=Math.cos(a),rz=-Math.sin(a);
    o.x=x+rx*(4.9+L*Math.sin(tilt));o.z=z+rz*(4.9+L*Math.sin(tilt));o.y=gy+Hc-.3-L*Math.cos(tilt);o.Hc=Hc;o.ax=x+rx*4.9;o.az=z+rz*4.9;o.a=a;return o};
  const gt=[x+8.2,z],ob=[x+8.4,z-3.6],bb=[x+9.6,z+3.8];
  const K=lpCtl({name:'Swing ride',price:35,x,z,wmax:1.3,acc:.22,dec:.3,slot:6.2832/NSEAT,run:44,demoT:36,idle:20,camYaw:Math.PI/2,camDist:15,camH:1.3,
    pick(){let b=0,bd=9;for(let i=0;i<NSEAT;i++){const d=Math.abs(lpWrap(K.ph+i/NSEAT*6.2832));if(d<bd){bd=d;b=i}}return b},
    seatPose(o){const s=seatAt(K.seat,{});o.x=s.x;o.z=s.z;o.y=s.y-.43;o.yaw=s.a+Math.PI;return o}});
  lpGate(grp,K,{gx:gt[0],gz:gt[1],gyaw:-Math.PI/2,ox:ob[0],oz:ob[1],tx:x,tz:z,bx:bb[0],bz:bb[1],col:'#2a5fb0',vest:0x3aa84a});
  ANIM.push(dt=>{K.tick(dt);if(!pkNear(x,z,420)&&!K.riding)return;const ang=K.ph;
    const Hc=Hlow+(H-Hlow)*pkSmooth(0,.5,K.sp);cg.rotation.y=ang;cg.position.y=gy+Hc;tower.scale.y=Hc/H;const tilt=.55*K.sp;
    for(let i=0;i<NSEAT;i++){const a=ang+i/NSEAT*6.2832;const rx=Math.cos(a),rz=-Math.sin(a);A.set(x+rx*4.9,gy+Hc-.3,z+rz*4.9);B.set(x+rx*(4.9+L*Math.sin(tilt)),gy+Hc-.3-L*Math.cos(tilt),z+rz*(4.9+L*Math.sin(tilt)));
      D.subVectors(B,A);const len=D.length();Q.setFromUnitVectors(Up,D.clone().normalize());M.compose(V.copy(A).add(B).multiplyScalar(.5),Q,S.set(1,len,1));chains.setMatrixAt(i,M);S.set(1,1,1);
      Q2.setFromEuler(new THREE.Euler(0,a+Math.PI,0));M.compose(B,Q2,S);seats.setMatrixAt(i,M)}
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
  // station at u=0: boarding platform on the ground beside the track, booth and operator behind it
  const p0=curve.getPointAt(0),t0=curve.getTangentAt(0),nx=t0.z/Math.hypot(t0.x,t0.z),nz=-t0.x/Math.hypot(t0.x,t0.z);
  const gt=[p0.x+nx*6.5,p0.z+nz*6.5],ob=[p0.x+nx*5.2+t0.x*5,p0.z+nz*5.2+t0.z*5],bb=[p0.x+nx*9+t0.x*-3,p0.z+nz*9+t0.z*-3];
  const K=lpCtl({name:'Roller coaster',price:60,x,z,ext:true,idle:24,camFollow:true,camDist:9,camH:1.6,run:1,demoT:1,
    pick(){return 1},seatPose(o){const u=((ups-2.1/len)%1+1)%1,pp=curve.getPointAt(u),tg=curve.getTangentAt(u);o.x=pp.x;o.z=pp.z;o.y=pp.y+.12;o.yaw=Math.atan2(tg.x,tg.z);o.pitch=-Math.asin(Math.max(-1,Math.min(1,tg.y)))*.9;return o}});
  lpGate(grp,K,{gx:gt[0],gz:gt[1],gyaw:lpFace(gt[0],gt[1],p0.x,p0.z),ox:ob[0],oz:ob[1],tx:p0.x,tz:p0.z,bx:bb[0],bz:bb[1],col:'#e9a21c',vest:0xd6322a});
  let lapN=0;
  ANIM.push(dt=>{K.tick(dt);if(!pkNear(x,z,520)&&!K.riding)return;dt=Math.min(dt,.05);
    const go=K.st==='run'||K.st==='demo',brk=K.st==='brake';
    if(go||brk){const p=curve.getPointAt(ups%1);let vt=Math.sqrt(Math.max(9,2*9.8*0.55*(hMax-p.y+1)+16));
      if(brk){const rem=(1-ups)*len;vt=Math.min(vt,Math.sqrt(2*3.2*Math.max(0,rem))+.5)}
      vel+=(vt-vel)*Math.min(1,dt*(vt>vel?1.4:3));
      const un=ups+vel*dt/len;
      if(brk&&(un>=1||(1-ups)*len<.25)){ups=0;vel=0;lapN=0;K.atRest()}
      else{if(un>=1){lapN++;if(go&&lapN>=(K.st==='run'?2:1)){K.finish()}}ups=un%1}}
    else{ups=0;vel=0;lapN=0}
    for(let i=0;i<NC;i++){const u=((ups-i*2.1/len)%1+1)%1;const pp=curve.getPointAt(u),tg=curve.getTangentAt(u);Z.copy(tg);X.crossVectors(Y,Z).normalize();const yy=new THREE.Vector3().crossVectors(Z,X);Mx.makeBasis(X,yy,Z);Qt.setFromRotationMatrix(Mx);M.compose(Vp.set(pp.x,pp.y+.05,pp.z),Qt,Sc);cars.setMatrixAt(i,M)}
    cars.instanceMatrix.needsUpdate=true});
  PK_RIDES.push({coaster:true,x,z});return curve}
