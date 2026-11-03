/* ===================================================================================================
   trn2.js — walkable trains.
   Every car of the main-line trains (index.html: TRAINS) becomes a moving platform for mp.js: you walk through the sliding doors, along the
   whole train through the gangways, sit two to a bench, and at the front there is a driver's cab with a man at the controls.
   • doors open on their own when a train stands at a platform and close (with a chime) before it leaves — nothing to click
   • you step in from the platform just by walking into an open door; walking out of an open door puts you back on the platform
   • the timetable: a live departures board in the station hall and one on the platform approach (times, destinations, platforms, status)
   The old "board and be seated" ride is switched off (initTrainRide returns early when TRN2 exists); the train state machine lives here.
   =================================================================================================== */
const TRN2={
  FL:.78,                       // floor height of a car above its origin
  DOORZ:[-7.4375,7.4375],       // the door bays (centres) along the car
  tpl:{},cars:[],cnt:0,boardT:0,cool:0,
  DEST:[['743','Kyiv-Pasazhyrskyi','IC'],['085','Lviv','IC'],['739','Kharkiv-Pas.','Exp'],['015','Chernivtsi','Fast']],
  // ---------- templates (built once, cloned per car) ----------
  mats(){if(this.M)return this.M;const S=MBM.std;return this.M={
      seat:S(0x2b5fb0,.9,0),seatD:S(0x1f3f73,.9,0),frame:S(0x2a2d31,.5,.5),panel:S(0xe8e2d2,.9,0),panelD:S(0xb9b3a2,.9,0),metal:S(0xc8ccd0,.3,.9),floor:S(0x5c6670,.8,.05),blue:S(0x2a5aa8,.5,.2),
      dark:S(0x1a1c1f,.6,.3),glass:MBM.glass(0xa6cbe0,.25),screen:MBM.emis(0x2a8fd0,.9),green:MBM.emis(0x2ad060,1.2),amber:MBM.emis(0xf0a020,1.2),red:MBM.emis(0xff3030,1.2),lamp:MBM.emis(0xfff2d0,1.1),bellow:S(0x25282c,.95,0),rack:S(0xaab0b6,.35,.7),door:S(0x3d72c4,.45,.3),yellow:S(0xf2c418,.5,.2)}},
  // the +z half-end of a car: kind 'link' (wall with a doorway) or 'cab' (partition with a door, desk, seat, windscreen)
  buildEnd(kind){const k='end_'+kind;if(this.tpl[k])return this.tpl[k];const M=this.mats(),mb=new MB(),g=new THREE.Group(),FL=this.FL;
    if(kind==='link'){const z=11.84;mb.bx('blue',-1.65,-.55,FL,3.5,z,z+.1);mb.bx('blue',.55,1.65,FL,3.5,z,z+.1);mb.bx('blue',-.55,.55,2.9,3.5,z,z+.1);   // end wall with a doorway
      mb.bx('panel',-1.6,-.55,FL,3.4,z-.04,z);mb.bx('panel',.55,1.6,FL,3.4,z-.04,z);mb.bx('panel',-.55,.55,2.9,3.4,z-.04,z);
      for(const sx of [-.58,.58])mb.bx('yellow',sx-.025,sx+.025,FL,2.9,z-.05,z+.12)}
    else{const z=9.45;mb.bx('panel',-1.6,-.5,FL,3.5,z,z+.1);mb.bx('panel',.5,1.6,FL,3.5,z,z+.1);mb.bx('panel',-.5,.5,2.1,3.5,z,z+.1);mb.bx('dark',-.5,-.46,FL,2.1,z,z+.1);   // partition + cab door
      mb.bx('metal',.38,.42,1.3,1.4,z-.01,z+.04);
      // fascia + windscreen
      mb.bx('blue',-1.65,1.65,FL,1.38,11.82,11.95);mb.bx('blue',-1.65,1.65,3.5,3.74,11.82,11.95);mb.bx('glass',-1.6,-.05,1.38,3.5,11.9,11.92);mb.bx('glass',.05,1.6,1.38,3.5,11.9,11.92);
      for(const x of [-1.65,0,1.65])mb.bx('blue',x-.05,x+.05,1.38,3.5,11.84,11.96);
      mb.bx('amber',-1.4,-1.0,1.05,1.2,11.96,11.98);mb.bx('amber',1.0,1.4,1.05,1.2,11.96,11.98);mb.bx('lamp',-.9,-.5,1.05,1.2,11.96,11.98);mb.bx('lamp',.5,.9,1.05,1.2,11.96,11.98);
      // driver's desk with screens, buttons, levers
      mb.bx('dark',-1.5,1.5,FL,1.45,10.95,11.7);mb.box('dark',3.0,.08,.6,0,1.5,11.3,0,.4);for(const x of [-.9,0,.9]){mb.box('dark',.55,.4,.05,x,1.75,11.15,0,-.45);mb.box('screen',.5,.34,.02,x,1.75,11.12,0,-.45)}
      for(let i=0;i<7;i++)mb.box(i%3===0?'green':i%3===1?'red':'amber',.06,.02,.05,-1.2+i*.14,1.5,11.0);
      mb.rod('metal',.02,[.45,1.5,11.1],[.45,1.9,11.0],5);mb.sph('red',.04,.45,1.92,11.0);mb.rod('metal',.02,[.75,1.5,11.1],[.75,1.82,11.0],5);mb.sph('metal',.04,.75,1.84,11.0);
      // driver's chair (seat at x .55) and a folding assistant seat
      mb.bx('seatD',.3,.8,.78+.4,.78+.5,9.95,10.45);mb.bx('seatD',.3,.8,.78+.5,.78+1.1,9.9,10.02);mb.cyl('metal',.04,.04,.4,6,.55,.78+.2,10.2);mb.cyl('metal',.22,.22,.03,10,.55,.8,10.2);
      mb.bx('seatD',-.8,-.3,.78+.4,.78+.46,10.0,10.4);mb.bx('seatD',-.8,-.3,.78+.46,.78+1.0,9.96,10.05);
      mb.bx('floor',-1.6,1.6,.78,.8,9.5,11.9)}
    mb.build(g,M,{noShadow:new Set(['glass','lamp','screen','green','red','amber'])});return this.tpl[k]=g},
  buildBody(){if(this.tpl.body)return this.tpl.body;const M=this.mats(),mb=new MB(),g=new THREE.Group(),FL=this.FL;
    mb.bx('floor',-1.6,1.6,FL,FL+.025,-12.3,12.3);                                                    // linoleum
    // inner wall panels under and above the windows, leaving the doorways open
    const dz=this.DOORZ;for(const sx of [-1,1]){const x0=sx>0?1.57:-1.61,x1=sx>0?1.61:-1.57;
      const seg=(y0,y1,k)=>{const cuts=[-11.8];for(const c of dz)cuts.push(c-.7,c+.7);cuts.push(11.8);for(let i=0;i<cuts.length;i+=2)if(cuts[i+1]>cuts[i])mb.bx(k,x0,x1,y0,y1,cuts[i],cuts[i+1])};
      seg(FL,1.3,'panelD');seg(2.55,3.6,'panel')}
    // doorway frames (yellow edges) and grab poles
    for(const c of dz)for(const sx of [-1,1]){for(const e of [-.7,.7])mb.bx('yellow',sx>0?1.52:-1.66,sx>0?1.66:-1.52,FL,3.0,c+e-.03,c+e+.03);mb.cyl('metal',.025,.025,2.7,6,sx*1.3,FL+1.35,c-.9);mb.cyl('metal',.025,.025,2.7,6,sx*1.3,FL+1.35,c+.9)}
    for(const c of dz)mb.cyl('metal',.025,.025,2.7,6,0,FL+1.35,c);
    // benches: rows at z = ±1.1, ±3.3, ±5.5, ±9.9 (clear of the doors); two seats per bench
    this.ROWS=[];for(const z of [-9.9,-5.5,-3.3,-1.1,1.1,3.3,5.5,9.9])this.ROWS.push(z);
    for(const z of this.ROWS)for(const sx of [-1,1]){const face=z<0?1:-1,x0=sx>0?.45:-1.45,x1=sx>0?1.45:-.45;                           // z<0 rows look forward, z>0 rows look back: pairs face each other in the middle
      mb.bx('seat',x0,x1,FL+.28,FL+.46,z-.4,z+.4);mb.bx('seat',x0,x1,FL+.46,FL+1.05,face>0?z-.5:z+.38,face>0?z-.38:z+.5);mb.bx('frame',x0+.05,x0+.12,FL,FL+.28,z-.35,z+.35);mb.bx('frame',x1-.12,x1-.05,FL,FL+.28,z-.35,z+.35);
      mb.bx('seatD',sx>0?x1-.06:x0,sx>0?x1:x0+.06,FL+.46,FL+.7,z-.4,z+.4);                     // armrest at the window side
      // luggage rack above
      mb.bx('rack',sx>0?1.0:-1.57,sx>0?1.57:-1.0,2.1,2.14,z-.5,z+.5)}
    for(let i=0;i<2;i++){}
    mb.build(g,M,{noShadow:new Set(['glass','lamp','panel','panelD','floor'])});return this.tpl.body=g},
  // sliding door leaves (two per doorway on each side); returns the animated list
  doorLeaves(g){const M=this.mats(),out=[];for(const c of this.DOORZ)for(const sx of [-1,1])for(const lf of [-1,1]){const m=new THREE.Mesh(new THREE.BoxGeometry(.06,2.05,.66),M.door);m.position.set(sx*1.675,this.FL+1.03,c+lf*.33);m.castShadow=false;g.add(m);out.push({m,sx,c,lf,x:sx*1.675})}return out},
  // ---------- decorate one car (called from trainCar) ----------
  decorate(g,headA,headB,A,k){
    const d={g,headA,headB,door:0,tgt:0,k,floors:[],boxes:[],seats:[],acts:[],T:null,drivers:[null,null]};g.userData.trn2=d;
    g.add(this.buildBody().clone());
    const endB=this.buildEnd(headB?'cab':'link').clone(),endA=this.buildEnd(headA?'cab':'link').clone();g.add(endB);endA.rotation.y=Math.PI;g.add(endA);
    if(!headB){const M=this.mats(),mb=new MB();mb.bx('bellow',-.7,.7,.9,.95,11.9,12.7);mb.bx('bellow',-.75,-.7,.9,3.0,11.9,12.7);mb.bx('bellow',.7,.75,.9,3.0,11.9,12.7);mb.bx('bellow',-.75,.75,3.0,3.05,11.9,12.7);mb.build(g,M)}
    d.leaves=this.doorLeaves(g);
    // ---------- walk data ----------
    const FL=this.FL,F=(x0,x1,z0,z1,y)=>d.floors.push({x0,x1,z0,z1,y}),B=(x0,x1,y0,y1,z0,z1,o)=>{const b=Object.assign({x0,x1,y0,y1,z0,z1},o||{});d.boxes.push(b);return b};
    F(-1.55,1.55,-12.45,12.45,FL);
    for(const sx of [-1,1])for(const c of this.DOORZ)F(sx>0?1.5:-2.4,sx>0?2.4:-1.5,c-.6,c+.6,FL);   // thresholds: you can step out through an open door
    // side walls with door gaps; the gaps get a door box that is switched off while the doors stand open
    d.doorBoxes=[];for(const sx of [-1,1]){const xa=sx>0?1.55:-1.75,xb=sx>0?1.75:-1.55,cuts=[-12];for(const c of this.DOORZ)cuts.push(c-.66,c+.66);cuts.push(12);for(let i=0;i<cuts.length;i+=2)if(cuts[i+1]>cuts[i])B(xa,xb,FL,3.5,cuts[i],cuts[i+1]);
      for(const c of this.DOORZ)d.doorBoxes.push(B(xa,xb,FL,2.9,c-.66,c+.66,{door:1}))}
    // ends
    const endBoxes=(sg,kind)=>{const m=(x0,x1,y0,y1,z0,z1)=>sg>0?B(x0,x1,y0,y1,z0,z1):B(-x1,-x0,y0,y1,-z1,-z0);
      if(kind==='link'){m(-1.7,-.6,FL,3.5,11.8,11.95);m(.6,1.7,FL,3.5,11.8,11.95)}
      else{m(-1.7,-.5,FL,3.5,9.45,9.58);m(.5,1.7,FL,3.5,9.45,9.58);m(-1.7,1.7,FL,3.5,11.75,12);m(-1.5,1.5,FL,1.55,10.95,11.7);m(.3,.8,FL,FL+.6,9.95,10.45);m(-.8,-.3,FL,FL+.55,10.0,10.4)}};
    endBoxes(1,headB?'cab':'link');endBoxes(-1,headA?'cab':'link');
    // benches (solid) + seats
    const rows=this.ROWS;for(const z of rows)for(const sx of [-1,1]){const face=z<0?1:-1;B(sx>0?.45:-1.45,sx>0?1.45:-.45,FL,FL+1.1,z-.5,z+.5);
      for(const dx of [.72,1.18]){const x=sx*dx;d.seats.push({x,y:FL+.46-.45,z,yaw:face>0?0:Math.PI,label:'Sit down',pose:'sit',who:null,stand:[-sx*.9,0]})}}
    // driver seats (taken by the driver, not by the player)
    d.driverSeats=[];if(headB)d.driverSeats.push({x:.55,y:FL+.5-.45,z:10.2,yaw:0,sg:1});if(headA)d.driverSeats.push({x:-.55,y:FL+.5-.45,z:-10.2,yaw:Math.PI,sg:-1});
    // cab: horn at the desk
    const cabZ=(sg)=>sg*10.9;d.acts.push({x:0,y:FL,z:10.6,r:1.5,label:'Sound the horn',cond:()=>!!headB,fn:()=>TRN2.horn()},{x:0,y:FL,z:-10.6,r:1.5,label:'Sound the horn',cond:()=>!!headA,fn:()=>TRN2.horn()});
    d.plat={name:'train',root:g,floors:d.floors,boxes:d.boxes,seats:d.seats,acts:d.acts,surf:'metal',camMax:2.0,car:d,
      inside:(lx,ly,lz)=>Math.abs(lx)<1.7&&Math.abs(lz)<12.6&&ly<3.6,
      edge:(lx,lz,ly)=>{const T=d.T;if(!T)return null;const n=T.cars,i=d.k;if(lz>12.3&&i<n.length-1&&n[i+1].g.userData.trn2)return {plat:n[i+1].g.userData.trn2.plat};if(lz<-12.3&&i>0&&n[i-1].g.userData.trn2)return {plat:n[i-1].g.userData.trn2.plat};return null},
      exitTest:(lx,lz,ly)=>{if(Math.abs(lx)<1.95)return false;if(d.door<.7)return false;let near=false;for(const c of TRN2.DOORZ)if(Math.abs(lz-c)<.85)near=true;if(!near)return false;
        TRN2.cool=1.6;const sx=lx>0?1:-1;const w=MP.toWorld(d.plat,sx*2.9,ly,lz,new THREE.Vector3());const y=typeof walkH==='function'?walkH(w.x,w.z,w.y+.5):w.y;return {x:w.x,z:w.z,y}}};
    return d},
  attach(T){T.holdT=T.holdT||(40+TRN2.cnt*30);TRN2.cnt++;T.name=TRN2.DEST[(TRN2.cnt-1)%TRN2.DEST.length];T.cars.forEach((c,k)=>{const d=c.g.userData.trn2;if(d){d.T=T;d.k=k}});this.cars.push(T)},
  // ---------- per frame ----------
  horn(){if(typeof AUD!=='undefined'&&AUD&&AUD.ok){AUD.tone(392,392,.9,.1,'square');AUD.tone(494,494,.9,.08,'square')}},
  chime(){if(typeof AUD!=='undefined'&&AUD&&AUD.ok){AUD.tone(880,880,.18,.05,'sine');AUD.tone(660,660,.3,.05,'sine',undefined,.2)}},
  driver(T,d,idx,vis){const ds=d.driverSeats[idx];if(!ds)return;let n=d.drivers[idx];
    if(!n&&vis){const P=makePlayer(CHAR.opts(CHAR.random()));P.root.traverse(m=>{if(m.isMesh){m.castShadow=false;m.frustumCulled=false}});try{mergeAvatar(P.root)}catch(e){}d.g.add(P.root);P.root.position.set(ds.x,ds.y,ds.z);P.root.rotation.y=ds.yaw;n=d.drivers[idx]={P}}
    if(n){n.P.root.visible=vis;if(vis)animPlayer(n.P,{spd:0,mode:'sit'},.016)}},
  // where the player is steering in the world (same mixing as stepPlayer)
  intent(){let ix=0,iz=0;const k=inp.k;if(k.KeyW||k.ArrowUp)iz+=1;if(k.KeyS||k.ArrowDown)iz-=1;if(k.KeyA||k.ArrowLeft)ix-=1;if(k.KeyD||k.ArrowRight)ix+=1;ix+=inp.jx;iz+=inp.jy;const m=Math.hypot(ix,iz);if(m>1){ix/=m;iz/=m}
    return [Math.sin(cam.yaw)*iz-Math.cos(cam.yaw)*ix,Math.cos(cam.yaw)*iz+Math.sin(cam.yaw)*ix]},
  tick(dt){
    this.cool=Math.max(0,this.cool-dt);
    const mpP=MP.on&&MP.plat&&MP.plat.car?MP.plat.car:null,aboardT=mpP?mpP.T:null;
    for(const T of TRAINS){
      const d0=Math.hypot(T.cx-player.x,T.cz-player.z),mine=aboardT===T;
      if(T.state==='run'){
        const dist=(T.goal-T.s)*T.dir;let block=1e9;
        if(!mine&&!MP.on){const ld=T.cars[T.dir>0?T.n-1:0],fx=Math.sin(ld.yaw)*T.dir,fz=Math.cos(ld.yaw)*T.dir,dx=player.x-ld.x,dz=player.z-ld.z,a=dx*fx+dz*fz,b=Math.abs(dx*fz-dz*fx);if(a>0&&a<500&&b<2.4&&Math.abs(player.y-ld.y)<3)block=a-26}
        const vt=Math.min(TRAIN_VMAX,Math.sqrt(2*1.3*Math.max(0,Math.min(dist,block)-.5)));
        T.v+=Math.max(-1.6*dt,Math.min(.95*dt,vt-T.v));if(T.v<0)T.v=0;T.s+=T.v*dt*T.dir;
        if(dist<.8&&T.v<.35){T.s=T.goal;T.v=0;T.t=0;const home=T.goal===T.sHome;T.state=home?'wait':'stop';T.closed=false;if(mine||d0<200)toast(home?'Odesa-Holovna':'End of the line',home?'doors are opening':'doors are opening · walk out onto the platform')}
        placeTrain(T)}
      else{T.t+=dt;
        const wait=T.state==='wait',hold=wait?T.holdT:(mine?20:d0<80?60:14);
        if(T.t>hold-7&&!T.closed){T.closed=true;if(mine||d0<120){toast('Doors closing','the train is about to depart');this.chime()}}
        if(T.t>hold){const out=wait;T.state='run';T.dir=out?1:-1;T.goal=out?T.sEnd:T.sHome;T.closed=false;T.depT=0;if(mine||d0<150){toast('The train departs',out?'sit down or walk through the train · it will stop at the end of the line':'returning to the station');this.chime()}}}
      T.cars.forEach((c,k)=>{const d=c.g.userData.trn2;if(!d)return;
        const vis=d0<900||mine;if(c.g.visible!==vis)c.g.visible=vis;if(!vis)return;
        // doors: open at a stop, shut shortly before leaving and whenever moving
        d.tgt=(T.state!=='run'&&T.v<.35&&T.t>1.2&&!T.closed)?1:0;if(d.door!==d.tgt){d.door+=Math.sign(d.tgt-d.door)*Math.min(Math.abs(d.tgt-d.door),dt*1.1);
          for(const L of d.leaves){const o=Math.sin(d.door*Math.PI/2),run=1.05;L.m.position.z=L.c+L.lf*(.33+o*run*.62);L.m.position.x=L.x+L.sx*o*.09;L.m.visible=true}
          for(const b of d.doorBoxes)b.on=d.door<.85}
        // the avatar of the driver: only in the leading cab, only when the train is near
        if(d0<160){const front=T.dir>0?T.n-1:0;d.driverSeats.forEach((ds,i)=>this.driver(T,d,i,(k===front)&&((ds.sg>0)===(T.dir>0))))}
        // walk in from the platform: stand in an open doorway
        if(!MP.on&&this.cool<=0&&d.door>.75&&Math.abs(c.x-player.x)<16&&Math.abs(c.z-player.z)<16&&T.v<.4){
          const l=MP.toLocal(d.plat,player.x,player.y,player.z,this._w||(this._w=new THREE.Vector3()));
          if(Math.abs(l.y-this.FL)<1.4&&Math.abs(l.x)>1.15&&Math.abs(l.x)<2.7){const it=this.intent(),ry=d.plat.root.rotation.y,lvx=it[0]*Math.cos(ry)-it[1]*Math.sin(ry);for(const dz of this.DOORZ)if(Math.abs(l.z-dz)<.75&&lvx*(l.x>0?1:-1)<-.3){
            const sx=l.x>0?1:-1;MP.enter(d.plat,sx*1.2,this.FL,dz,sx>0?-Math.PI/2:Math.PI/2);cam.dist=Math.max(.5,Math.min(cam.dist,2.4));toast('On the train','walk through the carriages · sit anywhere · the doors close before it leaves');break}}}})}
    this.boardTick(dt)},
  // ---------- timetable boards ----------
  clock(add){const d=new Date(Date.now()+add*1000);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')},
  rows(){const R=[],now=Date.now();
    TRAINS.forEach((T,i)=>{const nm=T.name||this.DEST[i%4];let pf=i+1,st='',t;
      if(T.state==='wait'){const left=Math.max(0,T.holdT-T.t);t=this.clock(left);st=left<8?'DEPARTING':'BOARDING '+Math.floor(left/60)+':'+String(Math.floor(left%60)).padStart(2,'0')}
      else if(T.state==='run'){t=this.clock(-T.t);st=T.dir>0?'DEPARTED':'ARRIVING'}else{t=this.clock(30);st='SHUNTING'}
      R.push([nm[0],nm[2]+' '+nm[1],t,pf,st,T.state==='wait'])});
    // further departures through the day (static filler, times relative to now)
    const extra=[['111','Mykolaiv',8,5,'ON TIME'],['064','Zaporizhzhia',26,6,'ON TIME'],['731','Dnipro',44,7,'DELAYED 10 MIN'],['117','Ivano-Frankivsk',63,6,'ON TIME'],['757','Kherson',85,5,'ON TIME']];
    for(const e of extra)R.push([e[0],'IC '+e[1],this.clock(e[2]*60),e[3],e[4],false]);
    return R},
  drawBoard(cv,title){const x=cv.getContext('2d'),W=cv.width,H=cv.height;x.fillStyle='#07101a';x.fillRect(0,0,W,H);x.fillStyle='#10263a';x.fillRect(0,0,W,H*.14);
    x.fillStyle='#f2c418';x.font=`800 ${H*.085|0}px "Unbounded",Arial,sans-serif`;x.textAlign='left';x.fillText(title,W*.03,H*.098);x.textAlign='right';x.fillStyle='#fff';x.fillText(this.clock(0),W*.97,H*.098);
    const cols=[.03,.14,.52,.67,.78],hy=H*.2;x.fillStyle='#8fb4cc';x.font=`700 ${H*.045|0}px Arial,sans-serif`;x.textAlign='left';['TRAIN','DESTINATION','DEPARTS','PLAT.','STATUS'].forEach((t,i)=>x.fillText(t,W*cols[i],hy));
    const rows=this.rows(),rh=(H-hy-H*.04)/Math.max(9,rows.length);x.font=`700 ${rh*.62|0}px "Golos Text",Arial,sans-serif`;
    rows.forEach((r,i)=>{const y=hy+rh*(i+1);if(i%2===0){x.fillStyle='rgba(255,255,255,.04)';x.fillRect(0,y-rh*.78,W,rh)}
      x.fillStyle=r[5]?'#ffd24a':'#e8eef2';x.fillText(r[0],W*cols[0],y);x.fillText(r[1],W*cols[1],y);x.fillText(r[2],W*cols[2],y);x.fillText(String(r[3]),W*cols[3]+W*.02,y);
      x.fillStyle=/DELAY/.test(r[4])?'#ff7a5a':/BOARD|DEPARTING/.test(r[4])?'#5aff9a':/DEPARTED|ARRIV/.test(r[4])?'#8fb4cc':'#cfe8d8';x.fillText(r[4],W*cols[4],y)})},
  makeBoard(w,h,title){const cv=document.createElement('canvas');cv.width=1024;cv.height=Math.round(1024*h/w);const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));const fr=new THREE.Mesh(new THREE.BoxGeometry(w+.3,h+.3,.12),new THREE.MeshStandardMaterial({color:0x1a1c1f,roughness:.5,metalness:.4}));fr.position.z=-.07;m.add(fr);
    const b={mesh:m,cv,tex,title};this.boards.push(b);this.drawBoard(cv,title);tex.needsUpdate=true;return b},
  boards:[],
  initBoards(grp){if(typeof STATION==='undefined'||!STATION||!STATION.F||this.boards.length)return;const F=STATION.F,y0=STATION.y0;
    // inside the hall on the west wall, facing east
    {const b=this.makeBoard(9.5,5.2,'DEPARTURES · ВІДПРАВЛЕННЯ'),p=F.P(37.6,15);b.mesh.position.set(p[0],y0+1+5.2,p[1]);b.mesh.rotation.y=-Math.atan2(F.sa,F.ca)+Math.PI/2;grp.add(b.mesh)}
    // at the foot of the ramp to the platforms, on two posts, readable from both sides
    {const b=this.makeBoard(7.5,4.1,'PLATFORMS · ПЕРОНИ'),p=F.P(52,41);b.mesh.position.set(p[0],y0+4.4,p[1]);b.mesh.rotation.y=-Math.atan2(F.sa,F.ca)+Math.PI;grp.add(b.mesh);   // faces the people coming down from the hall
      for(const s of [-1,1]){const q=F.P(52+s*3.9,41),pol=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,4.6,8),new THREE.MeshStandardMaterial({color:0x2a2d31,roughness:.5,metalness:.5}));pol.position.set(q[0],y0+2.3,q[1]);grp.add(pol)}}
    this.boardGrp=grp},
  boardTick(dt){this.boardT-=dt;if(this.boardT>0||!this.boards.length)return;this.boardT=1;
    if(typeof STATION!=='undefined'&&STATION&&Math.hypot(player.x-STATION.F.P(52,20)[0],player.z-STATION.F.P(52,20)[1])>260)return;
    for(const b of this.boards){this.drawBoard(b.cv,b.title);b.tex.needsUpdate=true}},
  update(dt){}
};
