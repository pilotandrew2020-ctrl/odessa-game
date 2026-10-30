/* ===================================================================================================
   clinic.js — polyclinics and hospitals
   Loaded BEFORE the main script, uses the lot helpers of shops.js; everything runs from installClinics() while the landmarks are built.

   • Polyclinic, Akademika Glushko 32A (Tairove): a huge slab block (24 floors high, 70 m wide, with a tall stair core and two wings, a red cross on the
     top), a glass entrance hall, a pond in front with plastic fish that you catch with a magnet for money (magnet fishing: pay ₴30 at the kiosk,
     30 seconds, your rod follows where you look), benches and lamps round the pond, an ambulance, and — on the side — a driveway with a boom
     barrier into the residential complex behind the clinic (the barrier lifts when you come close).
   • Polyclinics, Akademika Korolyova 60 and Akademika Vavilova 60 (Tairove): smaller 5-floor blocks with the same entrance, lamps, benches, ambulance.
   • Two hospitals: the children's regional hospital (Slobidka) and the city hospital on Pasteur St (centre) — 8 floors, helicopter pad on the roof.
   Every building can be entered (reception, waiting benches, doctor's offices, a check-up and a pharmacy window).
   =================================================================================================== */

const CL_BENCHES=[],CL_PONDS=[],CLF={on:false,t:0,got:0,sum:0,pond:null,rod:null,lure:null,line:null,hint:0};
const CL_FISH=[['#f2c418',40],['#ff8a1f',50],['#e53935',60],['#2f7fd6',80],['#2fa35a',100],['#ee5fa8',120],['#ffd84d',400]];   // colour, payout (the gold one is rare)

function clRect(F,u,v,w,d){return [F.P(u-w/2,v-d/2),F.P(u+w/2,v-d/2),F.P(u+w/2,v+d/2),F.P(u-w/2,v+d/2)]}
function clAmbulance(P,x,y,z,ry){const c=Math.cos(ry),s=Math.sin(ry),at=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
  P.box(x,y+1.0,z,2.1,1.3,5.2,ry,sRGB('#f4f4f2'),1);P.box(x,y+1.0,z,2.12,.34,5.22,ry,sRGB('#d62828'),1);
  {const q=at(0,2.2);P.box(q[0],y+1.5,q[1],1.9,.7,.9,ry,sRGB('#1c2a34'),2)}
  {const q=at(0,-.2);P.box(q[0],y+1.85,q[1],1.6,.12,.35,ry,sRGB('#2f6fe0'),8)}
  for(const a of [-1,1])for(const b of [-1.7,1.6]){const q=at(a*.95,b);P.cyl(q[0],y+.05,q[1],.36,.36,.24,10,sRGB('#151515'),1,0,Math.PI/2,ry)}
  for(const q of [at(0,-2.62),at(0,2.62)])P.box(q[0],y+.55,q[1],1.7,.35,.12,ry,sRGB('#9aa0a6'),6);
  addOBB(x,z,2.2,5.3,-ry)}
function clCross(P,x,y,z,ry,s){P.box(x,y,z,s*.34,s,.5,ry,sRGB('#d62828'),1);P.box(x,y,z,s,s*.34,.5,ry,sRGB('#d62828'),1)}
function clBench(P,x,y,z,ry){propBench2(P,x,y,z,ry,CL_BENCHES);LOW_OBB.push(x,z,.95,.32,Math.cos(ry),-Math.sin(ry));
  INTERACT.push({x,z,r:1.7,label:'Sit on the bench',cond:()=>!player.sit&&!player.scoot&&!(typeof DRIVE!=='undefined'&&DRIVE.on),fn:()=>{player.sit={x:x+Math.sin(ry)*.04,z:z+Math.cos(ry)*.04,y:y+.03,yaw:ry};player.vx=player.vz=0;cam.yaw=ry;cam.pitch=Math.max(cam.pitch,.25)}})}
function clLamp(P,x,y,z,ry){propGlobeLamp(P,x,y,z,ry);EXTRA_LAMPS.push([x,y+3.7,z,2.4])}

// ---------- the fishing pool: a small round above-ground pool (3 m x 1.15 m) with a steel-arch dome against leaves, plastic fish drifting round,
// and a man by the bucket who tosses the fish in (the ones you catch go back in the bucket and he throws them in again) ----------
const CL_FISHGEO={};
function clFishMesh(col){const k=col;let g=CL_FISHGEO[k];if(!g){const M=(c,r)=>new THREE.MeshStandardMaterial({color:c,roughness:r==null?.35:r});const m=M(col,.28),e=M(0xffffff,.4),b=M(0x111111,.5),metal=new THREE.MeshStandardMaterial({color:0xb8bcc2,roughness:.3,metalness:.9});
    g=CL_FISHGEO[k]={body:new THREE.SphereGeometry(.2,12,9).scale(1.7,.95,.62),tail:new THREE.ConeGeometry(.12,.26,8).rotateZ(Math.PI/2).scale(1,1,.35),fin:new THREE.ConeGeometry(.09,.16,6).scale(1,1,.25),eye:new THREE.SphereGeometry(.035,6,5),ring:new THREE.TorusGeometry(.045,.011,6,12),m,e,b,metal}}
  const f=new THREE.Group();const body=new THREE.Mesh(g.body,g.m);f.add(body);const t=new THREE.Mesh(g.tail,g.m);t.position.set(-.38,0,0);f.add(t);
  const fin=new THREE.Mesh(g.fin,g.m);fin.position.set(-.02,.19,0);f.add(fin);
  for(const s of [-1,1]){const e=new THREE.Mesh(g.eye,g.e);e.position.set(.26,.06,s*.1);f.add(e);const p=new THREE.Mesh(g.eye,g.b);p.position.set(.285,.06,s*.115);p.scale.setScalar(.55);f.add(p)}
  const ring=new THREE.Mesh(g.ring,g.metal);ring.position.set(.2,.19,0);ring.rotation.y=Math.PI/2;f.add(ring);f.scale.setScalar(.34);return f}   // a toy fish is ~23 cm
let CL_POOLTEX=null;
function clPoolTex(){if(CL_POOLTEX)return CL_POOLTEX;const cv=document.createElement('canvas');cv.width=512;cv.height=64;const x=cv.getContext('2d');const r=mkRand(5);
  x.fillStyle='#2f86bd';x.fillRect(0,0,512,64);for(let i=0;i<64;i++)for(let j=0;j<8;j++){const k=r();x.fillStyle=k<.3?'#4aa3d6':k<.6?'#2a78ab':k<.85?'#3b93c9':'#8fcbe8';x.fillRect(i*8+1,j*8+1,6,6)}
  CL_POOLTEX=new THREE.CanvasTexture(cv);CL_POOLTEX.wrapS=THREE.RepeatWrapping;CL_POOLTEX.repeat.set(2,1);CL_POOLTEX.encoding=THREE.sRGBEncoding;return CL_POOLTEX}
function clMan(grp,x,z,yaw,seed){
  const R=mkRand(seed||7),pick=a=>a[Math.floor(R()*a.length)],H=pick(CH_HAIR);
  const o={skin:pick(CH_SKIN.slice(0,6)),iris:pick(CH_EYE)[1],hs:'short',hair:H[1],hair2:H[2],brow:H[3],ts:'tee',shirt:0x5d7a58,bs:'jeans',jeans:0x2a3350,cuff:0x2e3550,ss:'sneaker',shoe:0x2a2a2e,sole:0xeeeeee,gl:'none',ht:'cap',ac:0x2f6fb0,bk:'none',nk:'none',cn:false,bd:'stubble'};
  const P=makePlayer(o);animPlayer(P,{spd:0,mode:'walk'},0);P.can.visible=false;P.scooter.visible=false;P.speaker.visible=false;
  const gy=groundH(x,z);P.root.position.set(x,gy,z);P.root.rotation.y=yaw;P.root.traverse(m=>{if(m.isMesh)m.castShadow=false});mergeAvatar(P.root);P.root.userData.dyn=true;grp.add(P.root);
  return {P,x,z,gy,yaw,ph:0,t:0,cd:2,f:null,look:0,age:R()*9,hx:0,hy:1,hz:0}}
function clPond(grp,P,F,y0,u,v,R,manAt){
  R=R||1.55;const c=F.P(u,v),H=1.15,wy=y0+H-.16,g=new THREE.Group();g.position.set(c[0],y0,c[1]);g.userData.dyn=true;grp.add(g);
  const M=(col,r,m,extra)=>{const q=new THREE.MeshStandardMaterial(Object.assign({color:col,roughness:r,metalness:m||0},extra||{}));q.color.convertSRGBToLinear();return q};
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(R,R,H,48,1,true),M('#2b2f34',.5,.4));wall.position.y=H/2;g.add(wall);
  const liner=new THREE.Mesh(new THREE.CylinderGeometry(R-.03,R-.03,H-.05,48,1,true),new THREE.MeshStandardMaterial({map:clPoolTex(),roughness:.5,side:THREE.BackSide}));liner.position.y=H/2+.02;g.add(liner);
  const fl=new THREE.Mesh(new THREE.CircleGeometry(R-.03,40),M('#2a7fb0',.6));fl.rotation.x=-Math.PI/2;fl.position.y=.06;g.add(fl);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(R,.04,6,48),M('#cfd2d6',.3,.8));rim.rotation.x=Math.PI/2;rim.position.y=H;g.add(rim);
  const water=new THREE.Mesh(new THREE.CircleGeometry(R-.05,40),M('#3a96c8',.18,0,{transparent:true,opacity:.78,envMapIntensity:.5}));water.rotation.x=-Math.PI/2;water.position.y=wy-y0;g.add(water);
  // dome: four steel arches, two hoops, a cap ring and a translucent cover that lifts away while you fish
  const Rd=R+.05,Hd=1.1,steel=M('#c9ccd1',.3,.85);
  for(let k=0;k<4;k++){const phi=k/4*Math.PI,pts=[];for(let i=0;i<=20;i++){const b=i/20*Math.PI;pts.push(new THREE.Vector3(Math.cos(b)*Rd*Math.cos(phi),H+Math.sin(b)*Hd,Math.cos(b)*Rd*Math.sin(phi)))}
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.02,6),steel))}
  for(const b of [.55,1.05]){const h=new THREE.Mesh(new THREE.TorusGeometry(Rd*Math.cos(b),.013,5,40),steel);h.rotation.x=Math.PI/2;h.position.y=H+Math.sin(b)*Hd;g.add(h)}
  const cap=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,6,12),steel);cap.rotation.x=Math.PI/2;cap.position.y=H+Hd;g.add(cap);
  for(let k=0;k<8;k++){const cl=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),steel);cl.position.set(Math.cos(k/8*Math.PI*2)*Rd,H+.02,Math.sin(k/8*Math.PI*2)*Rd);g.add(cl)}
  const domeMat=new THREE.MeshStandardMaterial({color:0xcfe9f6,roughness:.15,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false});
  const dome=new THREE.Mesh(new THREE.SphereGeometry(Rd,32,12,0,Math.PI*2,0,Math.PI/2),domeMat);dome.scale.y=Hd/Rd;dome.position.y=H;g.add(dome);
  STATIC_CIR.push(c[0],c[1],R+.15);
  // splash rings
  const rings=[];for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.06,.1,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;r.position.y=wy-y0+.01;r.visible=false;g.add(r);rings.push({m:r,t:0})}
  // fish: 7 swimming, 3 still in the bucket for the man to toss in
  const fish=[],NF=10;
  for(let i=0;i<NF;i++){const gold=i===NF-1,ci=gold?6:i%6,[col,val]=CL_FISH[ci],m=clFishMesh(col);if(gold)m.scale.multiplyScalar(1.2);g.add(m);
    const f={m,val,col,st:i<7?'swim':'bucket',th:Math.random()*6.28,r0:.35+Math.random()*(R-.6),w:(.35+Math.random()*.45)*(Math.random()<.78?1:-1),ph:Math.random()*6.28,rr:0,bt:1+i*.4,_x:c[0],_z:c[1],t:0};fish.push(f);if(f.st==='bucket')m.visible=false}
  // the man and his bucket
  const mp=manAt||F.P(u+R+1.7,v+R*.4),yaw=Math.atan2(c[0]-mp[0],c[1]-mp[1]),man=clMan(grp,mp[0],mp[1],yaw,Math.round(u*3+v+11));
  const rx=Math.cos(yaw),rz=-Math.sin(yaw),bk=[mp[0]-rx*.75,mp[1]-rz*.75];P.cyl(bk[0],groundH(bk[0],bk[1]),bk[1],.22,.17,.36,14,sRGB('#2f6fb0'),1);
  for(let i=0;i<4;i++)P.box(bk[0]+(i-1.5)*.07,groundH(bk[0],bk[1])+.4,bk[1]+(i%2)*.05,.16,.06,.07,yaw+i,sRGB(CL_FISH[i][0]),1);
  const pond={u,v,pw:R*2,pd:R*2,R,H,F,c,y:y0,wy,fy:wy-y0+.02,fish,ry:F.yaw,rings,domeMat,man,g};CL_PONDS.push(pond);
  for(const f of fish)if(f.st==='swim'){f.rr=f.r0;f.m.position.set(Math.cos(f.th)*f.rr,pond.fy,Math.sin(f.th)*f.rr);f._x=c[0]+Math.cos(f.th)*f.rr;f._z=c[1]+Math.sin(f.th)*f.rr}
  return pond}
function clLine(mesh,a,b){const d=new THREE.Vector3().subVectors(b,a),L=d.length();mesh.position.copy(a).addScaledVector(d,.5);mesh.scale.set(1,L,1);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize())}
function clFishStart(pond){if(CLF.on)return;if(!WALLET.pay(30,'magnet fishing'))return;
  CLF.on=true;CLF.t=30;CLF.got=0;CLF.sum=0;CLF.pond=pond;CLF.hint=0;
  if(!CLF.rod){const g=new THREE.Group(),rod=new THREE.Mesh(new THREE.CylinderGeometry(.008,.014,1,6),new THREE.MeshStandardMaterial({color:0x2a2a2e,roughness:.5}));
    const line=new THREE.Mesh(new THREE.CylinderGeometry(.0025,.0025,1,3),new THREE.MeshBasicMaterial({color:0xe8e8e8}));
    const mag=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.04,12),new THREE.MeshStandardMaterial({color:0xc21f1f,roughness:.4,metalness:.5}));const cap=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,.012,12),new THREE.MeshStandardMaterial({color:0xcfd3d8,roughness:.25,metalness:.9}));cap.position.y=-.026;mag.add(body,cap);
    g.add(rod,line,mag);CLF.rod=g;CLF.rodM=rod;CLF.line=line;CLF.lure=mag;scene.add(g)}
  CLF.rod.visible=true;toast('Magnet fishing','the cover is lifted · the magnet hangs in front of you — aim it at a fish · 30 s · gold fish ₴400')}
function clFishEnd(){CLF.on=false;if(CLF.rod)CLF.rod.visible=false;const p=CLF.pond;if(p)for(const f of p.fish)if(f.st==='hook'){f.st='bucket';f.bt=1;f.m.visible=false}
  toast(CLF.got?'Caught '+CLF.got+' fish':'Nothing this time',CLF.got?'₴'+CLF.sum+' earned · wallet '+WALLET.fmt():'the plastic fish are quick — try again')}
let clT=0;
function clTick(dt){if(!CL_PONDS.length)return;clT+=dt;dt=Math.min(dt,.1);
  for(const p of CL_PONDS){const dx=player.x-p.c[0],dz=player.z-p.c[1],d2=dx*dx+dz*dz,fishing=CLF.on&&CLF.pond===p;if(d2>160*160&&!fishing)continue;
    p.domeMat.opacity+=((fishing?.025:.2)-p.domeMat.opacity)*Math.min(1,dt*3);
    for(const r of p.rings){if(r.t<=0)continue;r.t-=dt;const k=Math.min(1,1-r.t/.7);r.m.visible=r.t>0;r.m.scale.setScalar(.5+k*4);r.m.material.opacity=.6*(1-k)}
    const man=p.man,m=man&&man.P;
    // the man: waits, picks a fish from the bucket, swings and tosses it into the pool
    if(man&&d2<70*70){man.age+=dt;const R=m.arms[1],L=m.arms[0],gy=man.gy,fx=Math.sin(man.yaw),fz=Math.cos(man.yaw),rx=Math.cos(man.yaw),rz=-Math.sin(man.yaw);
      let sh=-.45+Math.sin(man.age*1.8)*.04,el=-.8,hold=false;
      if(man.ph===0){man.cd-=dt;if(man.cd<=0){const f=p.fish.find(f=>f.st==='bucket'&&f.bt<=0);if(f){man.ph=1;man.t=0;man.f=f;f.st='held';f.m.visible=true}else man.cd=.6}}
      if(man.ph===1){man.t+=dt;const t=man.t;hold=t<.6;
        if(t<.35){const u=t/.35;sh=-.45+1.15*u*u*(3-2*u);el=-.8+.6*u}
        else if(t<.6){const u=(t-.35)/.25;sh=.7-2.2*u*u*(3-2*u);el=-.2+.1*u}
        else{const u=Math.min(1,(t-.6)/.5);sh=-1.5+1.05*u;el=-.1-.7*u}
        if(t>=.6&&man.f&&man.f.st==='held'){const f=man.f,a=Math.random()*6.28,rr=.3+Math.random()*(p.R-.7);
          f.st='fly';f.ft=0;f.dur=.8+Math.random()*.2;f.hx=man.hx;f.hy=man.hy;f.hz=man.hz;f.lx=Math.cos(a)*rr;f.lz=Math.sin(a)*rr;f.hh=1.1+Math.random()*.5;man.f=null}
        if(t>=1.15){man.ph=0;man.cd=1.6+Math.random()*2.6}}
      R.sh.rotation.x=sh;R.sh.rotation.z=-.08;R.el.rotation.x=el;L.sh.rotation.x=-.4;L.sh.rotation.z=.06;L.el.rotation.x=-.8;
      const hl=.62,hyw=gy+1.38-Math.cos(sh)*hl,fw=-Math.sin(sh)*hl+.1;man.hx=man.x+fx*fw+rx*.22-p.c[0];man.hy=hyw-p.y;man.hz=man.z+fz*fw+rz*.22-p.c[1];
      let ry=0;if(d2<12*12){ry=Math.atan2(dx,dz)-man.yaw;while(ry>Math.PI)ry-=6.283;while(ry<-Math.PI)ry+=6.283;ry=Math.max(-.9,Math.min(.9,ry))}
      man.look+=(ry-man.look)*Math.min(1,dt*4);m.head.rotation.y=man.look;m.head.rotation.x=.05;m.spine.rotation.x=.05+Math.sin(man.age*1.3)*.012;
      if(hold&&man.f){man.f.m.position.set(man.hx,man.hy,man.hz);man.f.m.rotation.set(0,man.yaw+1.57,0)}}
    for(const f of p.fish){
      if(f.st==='swim'){f.th+=f.w*dt;f.rr+=(f.r0+Math.sin(clT*.6+f.ph)*.1-f.rr)*Math.min(1,dt*2);const lx=Math.cos(f.th)*f.rr,lz=Math.sin(f.th)*f.rr,sg=f.w>0?1:-1;
        f.m.position.set(lx,p.fy+Math.sin(clT*2.1+f.ph)*.012,lz);f.m.rotation.y=Math.atan2(-Math.cos(f.th)*sg,-Math.sin(f.th)*sg)+Math.sin(clT*3.2+f.ph)*.25;f.m.rotation.z=Math.sin(clT*2.7+f.ph)*.08;f.m.rotation.x=0;f._x=p.c[0]+lx;f._z=p.c[1]+lz}
      else if(f.st==='fly'){f.ft+=dt/f.dur;const k=Math.min(1,f.ft);f.m.position.set(f.hx+(f.lx-f.hx)*k,f.hy+(p.fy-f.hy)*k+4*f.hh*k*(1-k),f.hz+(f.lz-f.hz)*k);f.m.rotation.z+=dt*10;f.m.rotation.y+=dt*3;
        if(k>=1){const r=p.rings.find(r=>r.t<=0)||p.rings[0];r.t=.7;r.m.position.set(f.lx,p.fy-.02,f.lz);r.m.visible=true;f.st='swim';f.th=Math.atan2(f.lz,f.lx);f.r0=Math.max(.3,Math.min(p.R-.35,Math.hypot(f.lx,f.lz)));f.rr=f.r0;f.w=(.35+Math.random()*.45)*(Math.random()<.78?1:-1);f.m.rotation.z=0}}
      else if(f.st==='hook'){f.t-=dt;f.m.position.set(CLF.lure.position.x-p.c[0],CLF.lure.position.y-p.y-.2,CLF.lure.position.z-p.c[1]);f.m.rotation.set(0,clT*2,Math.PI/2+Math.sin(clT*7)*.15);
        if(f.t<=0){f.st='bucket';f.bt=2+Math.random()*3;f.m.visible=false;f.m.rotation.set(0,0,0)}}
      else if(f.st==='bucket'){f.bt-=dt}}}
  if(CLF.on){const p=CLF.pond,t0=CLF.t;CLF.t-=dt;if(Math.floor(CLF.t/10)!==Math.floor(t0/10)&&CLF.t>0)toast('Magnet fishing',Math.ceil(CLF.t)+' s left · ₴'+CLF.sum+' so far');
    const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw),gy=groundH(player.x,player.z);
    const hand=new THREE.Vector3(player.x+fx*.35+rx*.22,gy+1.2,player.z+fz*.35+rz*.22),tip=new THREE.Vector3(player.x+fx*1.25+rx*.22,gy+1.9,player.z+fz*1.25+rz*.22);
    const lx=player.x+fx*2.5,lz=player.z+fz*2.5,dC=Math.hypot(lx-p.c[0],lz-p.c[1]),inP=dC<p.R-.12;
    const ly=inP?p.wy+.07:(dC<p.R+.5?p.y+p.H+.22:Math.max(gy+.6,p.y+.3));CLF.lure.position.set(lx,ly,lz);
    clLine(CLF.rodM,hand,tip);clLine(CLF.line,tip,new THREE.Vector3(lx,ly+.05,lz));
    if(inP)for(const f of p.fish){if(f.st!=='swim')continue;const d=Math.hypot(f._x-lx,f._z-lz);
      if(d<.32){f.st='hook';f.t=.9;CLF.got++;CLF.sum+=f.val;S.cash=WALLET.get()+f.val;saveS();if(window.AUD)AUD.beep();toast(f.val>=400?'GOLD FISH! +₴'+f.val:'+₴'+f.val,'plastic fish on the magnet · wallet '+WALLET.fmt());break}}
    if(CLF.t<=0||Math.hypot(player.x-p.c[0],player.z-p.c[1])>p.R+30)clFishEnd()}}

// ---------- the boom barrier into the residential complex ----------
const CL_BARRIERS=[];
function clBarrier(grp,P,F,y0,u,v,span){const ry=F.yaw,post=F.P(u-span/2-.4,v);
  P.box(post[0],y0+.55,post[1],.4,1.1,.4,ry,sRGB('#c9c3b4'),1);
  const piv=new THREE.Group();piv.position.set(post[0],y0+1.05,post[1]);piv.rotation.set(0,ry,0);grp.add(piv);
  const n=8,L=span+.2;for(let i=0;i<n;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(L/n,.11,.11),new THREE.MeshStandardMaterial({color:i%2?0xf4f4f2:0xd62828,roughness:.5}));s.position.x=.4+L/n*(i+.5);piv.add(s)}
  const far=F.P(u+span/2+.4,v);P.box(far[0],y0+.5,far[1],.3,1.0,.3,ry,sRGB('#c9c3b4'),1);
  const booth=F.P(u-span/2-2.6,v+1.2);P.box(booth[0],y0+1.3,booth[1],1.8,2.6,1.6,ry,sRGB('#e8e4da'),1);P.box(booth[0],y0+1.5,booth[1],1.86,.9,1.66,ry,sRGB('#1c2a34'),2);P.box(booth[0],y0+2.7,booth[1],2.2,.14,2.0,ry,sRGB('#9a2a2a'),1);
  addOBB(booth[0],booth[1],1.8,1.6,F.a);const c=F.P(u,v);
  CL_BARRIERS.push({piv,x:c[0],z:c[1],open:0});return piv}
function clBarrierTick(dt){for(const b of CL_BARRIERS){const dx=player.x-b.x,dz=player.z-b.z,near=dx*dx+dz*dz<8*8||(typeof DRIVE!=='undefined'&&DRIVE.car&&Math.hypot(DRIVE.car.x-b.x,DRIVE.car.z-b.z)<11);
    b.open+=((near?1:0)-b.open)*Math.min(1,dt*1.6);b.piv.rotation.z=b.open*1.35}}

// ---------- inside: reception, waiting benches, offices, check-up, pharmacy ----------
function clFill(U,E,spec){const hw=U.W/2,D=U.D;
  U.box(0,.5,D-3.2,7.2,1.0,1.1,'#cfd8dc',1);U.box(0,1.04,D-3.2,7.4,.08,1.3,'#f4f4f2',1);U.obb(0,D-3.2,3.7,.65);   // reception desk
  U.plate([spec.title],0,3.0,D-.14,U.W>14?9:7,1.5,{size:96,color:'#fff',bg:'#1f7a4a',weight:'800'},true);
  U.ped(-1.2,D-4.4,true,null);
  for(const side of [-1,1])for(let k=0;k<3;k++){const u=side*(hw-1.5),v=3+k*2.5;U.box(u,.25,v,.7,.5,2.0,'#2f6fb0',5);U.box(u+side*.28,.7,v,.12,.8,2.0,'#2f6fb0',5);U.obb(u,v,.4,1.05);
    E.act(U.P(u,v)[0],U.P(u,v)[1],1.6,'Sit and wait',()=>{const p=U.P(u,v);player.sit={x:E.ox+p[0],z:E.oz+p[1],y:INT_Y+.1,yaw:U.ry+(side>0?Math.PI/2:-Math.PI/2)};player.vx=player.vz=0;cam.yaw=U.ry})}
  for(let k=0;k<4;k++){const v=3.5+k*3.2;for(const side of [-1,1]){const u=side*(hw-.2);U.box(u,1.2,v,.1,2.4,2.0,'#c9d6dc',1);U.plate(['Room '+(k*2+(side>0?2:1))],u-side*.1,2.1,v,.5,.5,{size:90,color:'#fff',bg:'#2f6fb0',weight:'800'})}}
  U.act(0,D-4.8,2.4,'Check-up with the doctor · ₴200',()=>{if(WALLET.pay(200,'check-up'))toast('Doctor','Healthy as an Odesa gull. Wear a scarf and eat borscht')});
  U.box(hw-2.2,.6,D-1.5,2.4,1.2,.8,'#f2f2ee',1);U.act(hw-2.2,D-2.4,1.8,'Pharmacy window: vitamin C · ₴15',()=>shBuy('vitamin C',15));
  U.plate(['PHARMACY'],hw-2.2,2.0,D-.3,2.4,.6,{size:80,color:'#fff',bg:'#1c8a3c',weight:'900'},true)}
function clInterior(spec){return shBrandInterior({key:spec.key,idx:spec.idx,title:spec.title,sub:spec.sub,room:{w:spec.floors>6?24:18,d:spec.floors>6?18:14,h:3.8,floor:0x7d8d92,fr:.35,wall:0xbfd0d3,ceil:0xd9e2e2,li:1.05,lights:[3.5,9]},fill:(U,E)=>clFill(U,E,spec)})}

// ---------- one site ----------
function clBuildSite(grp,P,GR,spec,at){
  const F=lotFrame(at.x,at.z,at.yaw),y0=rawH(at.x,at.z),ry=F.yaw,Lw=spec.lotW,Ld=spec.lotD,big=spec.floors>=12;
  lotPad(F,Lw+6,Ld+6,y0);groundQuad(GR,clRect(F,0,0,Lw,Ld),4,y0+.05);
  const W=spec.W,Dp=spec.Dp,floors=spec.floors,H=spec.H||floors*3.2,vc=-Ld/2+Dp/2+5,fv=vc+Dp/2;
  const win=windowRowsTex({bg:spec.wall||'#e2ddd0',rows:floors>=8?8:floors,cols:Math.max(5,Math.round(W/3.2/ (floors>=8?1:1))),win:'#27333d',lit:.28,mx:.17,my:.2,band:'#bdb8a8'}),
    plain=new THREE.MeshStandardMaterial({color:0xcfcabd,roughness:.8}),repV=(floors>=8?8:floors)*3.2;
  const c0=F.P(0,vc);texBox(grp,c0[0],y0,c0[1],W,H,Dp,ry,win,W,repV,plain,true);addBlock(c0[0],c0[1],W+1,Dp+1,F.a);addOBB(c0[0],c0[1],W,Dp,F.a);
  P.box(c0[0],y0+H+.4,c0[1],W+.6,.8,Dp+.6,ry,sRGB('#f4f1ea'),1);
  if(spec.wings){for(const s of (spec.wings.left?[-1]:[-1,1])){const wc=F.P(s*(W/2+spec.wings.w/2),vc+2),wh=spec.wings.floors*3.2;const wt=windowRowsTex({bg:spec.wall||'#e2ddd0',rows:8,cols:Math.max(4,Math.round(spec.wings.w/3.2)),win:'#27333d',lit:.28,mx:.17,my:.2,band:'#bdb8a8'});
      texBox(grp,wc[0],y0,wc[1],spec.wings.w,wh,Dp-4,ry,wt,spec.wings.w,25.6,plain,true);addBlock(wc[0],wc[1],spec.wings.w+1,Dp-3,F.a);addOBB(wc[0],wc[1],spec.wings.w,Dp-4,F.a);
      P.box(wc[0],y0+wh+.35,wc[1],spec.wings.w+.5,.7,Dp-3.5,ry,sRGB('#f4f1ea'),1)}}
  if(spec.core){const cc=F.P(spec.core.u||0,vc);const ch=spec.core.h;const ct=windowRowsTex({bg:'#d6d0c2',rows:8,cols:3,win:'#27333d',lit:.2,mx:.2,my:.2,band:'#b4ae9e'});
    texBox(grp,cc[0],y0,cc[1],spec.core.w,ch,spec.core.d,ry,ct,spec.core.w,25.6,plain,true);addBlock(cc[0],cc[1],spec.core.w+1,spec.core.d+1,F.a);addOBB(cc[0],cc[1],spec.core.w,spec.core.d,F.a);
    const f=F.P(spec.core.u||0,vc+spec.core.d/2+.3);clCross(P,f[0],y0+ch-9,f[1],ry,9);
    const rc=F.P(spec.core.u||0,vc);P.box(rc[0],y0+ch+.5,rc[1],spec.core.w+.4,1,spec.core.d+.4,ry,sRGB('#f4f1ea'),1);P.cyl(rc[0],y0+ch+1,rc[1],.12,.12,9,6,sRGB('#c8ccd0'),6)}
  // sign band and cross on the facade
  lotSign(grp,F,[spec.sign],{w:1024,h:200,size:spec.sign.length>16?100:130,color:'#fff',bg:'#1f7a4a',weight:'900'},0,y0+Math.min(H,16)-1.2,fv+.15,Math.min(W-6,22),Math.min(W-6,22)*.2,1.2);
  {const f=F.P(-Math.min(W/2-4,16),fv+.2);clCross(P,f[0],y0+Math.min(H,16)-1.2,f[1],ry,3.4)}
  // podium / entrance hall
  const hall=F.P(0,fv+3);P.box(hall[0],y0+3.2,hall[1],14,6.4,6,ry,sRGB('#a7c3d3'),6);P.box(hall[0],y0+6.5,hall[1],14.6,.4,6.6,ry,sRGB('#1f7a4a'),1);
  for(const u of [-6.6,-2.2,2.2,6.6]){const q=F.P(u,fv+5.9);P.box(q[0],y0+3.2,q[1],.3,6.4,.3,ry,sRGB('#e8e4da'),1)}addOBB(hall[0],hall[1],14,6,F.a);
  shopDoor(grp,P,lotDoor(F,0,fv+6),y0,{label:'Enter '+spec.title,interior:spec.key,w:3.2,awn:'#1f7a4a'});
  INTERIORS[spec.key]=()=>clInterior(spec);
  // forecourt: lamps, benches, flower beds, ambulance
  const front=fv+14;let pond=null;
  for(const u of [-Lw/2+6,Lw/2-6,-14,14])clLamp(P,F.P(u,front-5)[0],y0,F.P(u,front-5)[1],ry);
  for(const u of [-26,26]){const q=F.P(u,front-2);clBench(P,q[0],y0,q[1],ry+Math.PI)}
  {const q=F.P(Lw/2-9,fv+8);clAmbulance(P,q[0],y0+.05,q[1],ry+Math.PI/2)}
  if(spec.pond){const R=1.55,pv=front+8;pond=clPond(grp,P,F,y0,0,pv,R);
    // two benches, lamps, flower beds; the kiosk on the clinic side sells the fishing
    for(const s of [-1,1]){const q=F.P(s*(R+3.4),pv-2.6);clBench(P,q[0],y0,q[1],ry+s*Math.PI/2*-1)}
    for(const u of [-7.5,7.5])for(const dv of [-4.5,4.5]){const q=F.P(u,pv+dv);clLamp(P,q[0],y0,q[1],ry)}
    const ku=-5.4,kv=pv-3.8,k=F.P(ku,kv);P.box(k[0],y0+1.2,k[1],2.6,2.4,1.8,ry,sRGB('#f2c418'),1);P.box(k[0],y0+2.55,k[1],3.1,.2,2.3,ry,sRGB('#2f6fb0'),1);addOBB(k[0],k[1],2.6,1.8,F.a);
    const ks=F.P(ku,kv+.95);lotSign(grp,F,['MAGNET','FISHING ₴30'],{w:512,h:256,size:88,color:'#111',bg:'#f2c418',weight:'900'},ku,y0+2.2,kv+.95,2.3,1.15,.6);
    INTERACT.push({x:ks[0]+F.n[0]*1.4,z:ks[1]+F.n[1]*1.4,r:2.8,label:'Magnet fishing · ₴30 · 30 s',cond:()=>!CLF.on,fn:()=>clFishStart(pond)});
    INTERACT.push({x:pond.c[0],z:pond.c[1],r:R+6,label:'Stop fishing',cond:()=>CLF.on&&CLF.pond===pond&&CLF.t<28,fn:clFishEnd});
    for(const u of [-10,10]){const f=F.P(u,pv);P.box(f[0],y0+.2,f[1],2.4,.4,7,ry,sRGB('#4a8a3a'),1)}   // flower beds
  }
  // side driveway with a boom barrier into the residential complex on the right of the clinic
  if(spec.complex){const du=W/2+8,bt=windowRowsTex({bg:'#d9c9a8',rows:8,cols:6,win:'#2b3a46',lit:.32,mx:.18,my:.2,band:'#b49a74'});
    const sc=F.P(du,0);P.box(sc[0],y0+.04,sc[1],6,.08,Ld-4,ry,sRGB('#5b5d60'),0);       // asphalt strip from the street to the back
    clBarrier(grp,P,F,y0,du,Ld/2-12,6);
    for(const [v0,dd] of [[-Ld/2+Dp/2+5,Dp+6],[10,34]]){const q=F.P(du+11.5,v0);texBox(grp,q[0],y0,q[1],12,28.8,dd,ry,bt,19.2,25.6,plain,true);addBlock(q[0],q[1],13,dd+1,F.a);addOBB(q[0],q[1],12,dd,F.a);
      const d2=F.P(du+11.5-6.05,v0);clLamp(P,d2[0]-F.t[0]*2,y0,d2[1]-F.t[1]*2,ry)}
    {const q=F.P(du,Ld/2-12);lotSign(grp,F,['ЖК "Тихий двір"'],{w:1024,h:200,size:110,color:'#fff',bg:'#7a3b1e',weight:'900'},du-3.4,y0+3.6,Ld/2-12.4,4.4,.9,1.1)}}
  const pp=F.P(0,fv+10);PLACES.push({id:spec.key,name:spec.title,sub:spec.sub,x:pp[0],z:pp[1],yaw:ry+Math.PI,pin:'#e53935',poi:['+','#e53935'],r:spec.r||140});
  PARKED_DIRTY=true}

function clLot(tx,tz,sizes){for(const [w,d,extra] of sizes){const at=shFindLot(tx,tz,w,d,1600);if(at)return {at,w,d,extra}}return null}
function installClinics(grp,G,P,Sg,GR){
  ANIM.push(clTick);ANIM.push(clBarrierTick);
  const geo=(la,lo)=>geo2xz(la,lo);
  const sites=[
    {key:'clinic_glushko',idx:70,title:'Polyclinic · Akademika Glushko 32A',sign:'ПОЛІКЛІНІКА',sub:'24 floors, magnet-fishing pond, tram line below',floors:24,W:70,Dp:26,wings:{w:22,floors:16,left:true},core:{w:12,d:12,h:102.4,u:0},pond:{w:44,d:18},complex:true,r:260,
      at:geo(46.3858,30.7228),variants:[[132,112],[96,96],[84,84]]},
    {key:'clinic_korolyova',idx:71,title:'Polyclinic · Akademika Korolyova 60',sign:'ПОЛІКЛІНІКА №20',sub:'5 floors · Tairove',floors:5,W:46,Dp:18,at:geo(46.4012,30.7222),variants:[[64,56]],r:120},
    {key:'clinic_vavilova',idx:72,title:'Polyclinic · Akademika Vavilova 60',sign:'ПОЛІКЛІНІКА',sub:'5 floors · Tairove',floors:5,W:46,Dp:18,at:geo(46.3831,30.7171),variants:[[64,56]],r:120},
    {key:'hosp_children',idx:73,title:'Children\'s regional hospital',sign:'ДИТЯЧА ЛІКАРНЯ',sub:'8 floors · Slobidka',floors:8,W:56,Dp:20,wings:{w:20,floors:8},at:geo(46.4846,30.6924),variants:[[96,70],[80,60]],r:160},
    {key:'hosp_city',idx:74,title:'City hospital · Pasteur St',sign:'МІСЬКА ЛІКАРНЯ',sub:'8 floors · centre',floors:8,W:56,Dp:20,wings:{w:20,floors:8},at:geo(46.4927,30.7239),variants:[[96,70],[80,60]],r:160}];
  for(const s of sites){
    let done=false;
    for(const [w,d] of s.variants){const spec=Object.assign({},s,{lotW:w,lotD:d});
      // a smaller lot loses the optional parts: wings, residential complex, a smaller pond
      if(s.key==='clinic_glushko'&&w<120){spec.wings=null;spec.complex=false;spec.core=Object.assign({},s.core,{h:76.8});spec.pond={w:w<90?30:36,d:12}}
      const at=shFindLot(s.at[0],s.at[1],w,d,1600);if(!at)continue;
      try{clBuildSite(grp,P,GR,spec,at);done=true;break}catch(e){console.warn('[clinic]',s.key,e)}}
    if(!done)console.warn('[clinic] no lot found for',s.key)}
}
