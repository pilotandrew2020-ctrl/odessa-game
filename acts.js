/* ===================================================================================================
   acts.js — everyday animations for the avatar, driven by interactions in kitchens and bathrooms:
     wash   — lean over the sink, rub your hands under the running tap (foam, water sound)
     pour   — fill a glass at the tap and drink it
     fridge — the door really swings open, you take something out, close it and drink it
     kettle — press the button, steam rises, it clicks off, you drink the tea
   The camera swings to a third-person view for the duration (indoors you are normally in first person) and comes back after.
   Loaded BEFORE the main script; touches game globals only at runtime (ACT.start / actFridge / actKettle called from the interiors).
   =================================================================================================== */

const ACT={cur:null,hooked:false,props:{},em:null,pts:null,pp:[],snd:0};
const ACT_DUR={wash:5.4,pour:6.4,fridge:8.4,kettle:10.4,door:2.5,key:5.2};
const actEase=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const actWin=(t,a,b)=>actEase((t-a)/(b-a));

// ---------- things you hold ----------
function actProp(kind){
  if(ACT.props[kind])return ACT.props[kind];
  const G=new THREE.Group(),M=(c,r,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r==null?.6:r},o||{}));
  const cyl=(r1,r2,h,m,y)=>{const q=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,14),m);q.position.y=y||0;G.add(q);return q};
  const box=(w,h,d,m,x,y,z)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.position.set(x||0,y||0,z||0);G.add(q);return q};
  if(kind==='glass'){cyl(.036,.03,.1,M(0xd4ecf7,.08,{transparent:true,opacity:.4}));G.userData.water=cyl(.031,.027,.07,M(0x7fc4ea,.2,{transparent:true,opacity:.75}),-.012)}
  else if(kind==='cup'){cyl(.04,.033,.085,M(0xf4f1e8,.3));cyl(.036,.036,.004,M(0x7a3b12,.4),.036);const h=new THREE.Mesh(new THREE.TorusGeometry(.027,.008,6,12,Math.PI),M(0xf4f1e8,.3));h.position.set(.04,0,0);h.rotation.z=-Math.PI/2;G.add(h)}
  else if(kind==='milk'||kind==='juice'){const c=kind==='milk'?0xf4f6fa:0xf08a1c;box(.07,.15,.07,M(c,.5));box(.07,.04,.07,M(kind==='milk'?0x2f6db0:0xd9631a,.5),0,.095,0);box(.035,.02,.07,M(0xe8e8e8,.5),0,.12,0);box(.071,.06,.071,M(kind==='milk'?0x2f6db0:0xffd24a,.5),0,-.02,0)}
  else if(kind==='kefir'){cyl(.032,.034,.14,M(0xf4f6fa,.35));cyl(.033,.033,.04,M(0x2f6db0,.4),.0);cyl(.016,.02,.04,M(0x2f6db0,.4),.09)}
  else if(kind==='none'){}
  else if(kind==='key'){   // a flat-door key: ring bow at the back, a shaft pointing forward (+z), two teeth; the bunch hangs off the ring
    const st=M(0xb8bcc2,.28,{metalness:.85}),bow=new THREE.Mesh(new THREE.TorusGeometry(.011,.0034,6,14),st);bow.position.z=-.034;G.add(bow);
    box(.0045,.011,.056,st,0,0,.002);box(.0045,.007,.006,st,0,-.0085,.022);box(.0045,.006,.005,st,0,-.0075,.012);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.016,.0016,5,14),st);ring.position.set(0,-.012,-.05);ring.rotation.y=Math.PI/2;G.add(ring);box(.012,.02,.004,M(0xc8372d,.5),0,-.032,-.05)}
  else{cyl(.03,.03,.15,M(0x5a1a14,.25,{metalness:.1}));cyl(.0315,.0315,.05,M(0xc8102e,.4),0);cyl(.014,.017,.03,M(0x222222,.4),.09)}   // cola
  G.position.set(0,-.245,.045);G.visible=false;ACT.props[kind]=G;return G}

// ---------- a slow puff of steam (additive points, one draw call) ----------
function actSteam(x,y,z,secs,rate){const e=ACT.em||(ACT.em={});e.x=x;e.y=y;e.z=z;e.until=performance.now()/1000+secs;e.rate=rate||22;
  if(!ACT.pts){const N=48,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(N*3),3));
    const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d');const gr=c.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(0,0,64,64);
    const m=new THREE.PointsMaterial({size:.26,map:new THREE.CanvasTexture(cv),vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    ACT.pts=new THREE.Points(g,m);ACT.pts.frustumCulled=false;ACT.pts.visible=false;scene.add(ACT.pts);for(let i=0;i<N;i++)ACT.pp.push({a:9,x:0,y:0,z:0,vx:0,vz:0})}}
function actSteamTick(dt){const P=ACT.pts;if(!P)return;const now=performance.now()/1000,e=ACT.em;let live=0;
  if(e&&now<e.until){ACT.snd+=dt*e.rate;while(ACT.snd>1){ACT.snd-=1;const p=ACT.pp.find(q=>q.a>=1);if(!p)break;p.a=0;p.x=e.x+(Math.random()-.5)*.04;p.y=e.y;p.z=e.z+(Math.random()-.5)*.04;p.vx=(Math.random()-.5)*.05;p.vz=(Math.random()-.5)*.05}}
  const pos=P.geometry.attributes.position.array,col=P.geometry.attributes.color.array;
  ACT.pp.forEach((p,i)=>{if(p.a<1){p.a+=dt/1.7;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=dt*(.38+.12*Math.sin(i));live++}const f=p.a<1?Math.sin(Math.min(1,p.a)*Math.PI)*.35:0;pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;col[i*3]=col[i*3+1]=col[i*3+2]=f});
  P.geometry.attributes.position.needsUpdate=P.geometry.attributes.color.needsUpdate=true;P.visible=live>0}

// the owner's own key recordings (assets/audio/keys_*.mp3), cut into short pieces: key out of the pocket, into the lock, the bolt, the latch.
// The synth below only plays until they are decoded.
const KEYSND={buf:{},st:0,n:0,G:{bunch:1.7,jingle:1,items:1.2},
  P:{keyout:[['bunch',.1,.55]],keyin:[['jingle',.05,.4],['bunch',2.25,.5],['jingle',1.75,.42]],
     bolt:[['items',.45,.15],['items',1.3,.25],['items',2.55,.25],['items',8,.15]],latch:[['items',7,.15],['items',9.45,.15],['items',5.15,.1]]},
  load(){if(this.st||!window.AUD||!AUD.ctx)return;this.st=1;
    for(const k of ['bunch','jingle','items'])fetch('assets/audio/keys_'+k+'.mp3').then(r=>r.arrayBuffer()).then(b=>new Promise((ok,no)=>AUD.ctx.decodeAudioData(b,ok,no))).then(d=>{this.buf[k]=d}).catch(e=>{this.st=0;console.warn('[keys]',k,e&&e.message||e)})},
  play(k){const L=this.P[k];if(!L||!window.AUD||!AUD.ok)return false;this.load();const q=L[this.n++%L.length],b=this.buf[q[0]];if(!b)return false;
    const c=AUD.ctx,s=c.createBufferSource(),g=c.createGain(),T=c.currentTime,d=q[2];s.buffer=b;
    g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(this.G[q[0]],T+.008);g.gain.setValueAtTime(this.G[q[0]],T+d-.05);g.gain.linearRampToValueAtTime(0,T+d);
    s.connect(g);g.connect(AUD.sfx);s.start(T,q[1],d);return true}};
// ---------- sounds (AUD is the game's synth) ----------
function actSfx(k){if(!window.AUD||!AUD.ok)return;if(KEYSND.play(k))return;
  if(k==='water')AUD.burst(4200,2600,.18,.05,'bandpass',.6);
  else if(k==='click')AUD.tone(900,520,.05,.12,'square');
  else if(k==='thunk')AUD.tone(130,70,.14,.22,'sine');
  else if(k==='gulp')AUD.tone(210,110,.1,.09,'sine');
  else if(k==='boil')AUD.burst(500,1500,.3,.035,'lowpass',.7);
  else if(k==='ding'){AUD.tone(1568,1568,.35,.12,'sine');AUD.tone(2093,2093,.4,.08,'sine',null,.1)}
  else if(k==='latch'){AUD.tone(620,300,.05,.16,'square');AUD.burst(2600,1200,.06,.06,'bandpass',.8)}                       // handle pressed down, the latch lets go
  else if(k==='creak'){AUD.tone(150,300,.42,.05,'sawtooth');AUD.tone(310,200,.3,.025,'sawtooth',null,.12)}                   // old hinges
  else if(k==='keyin'){AUD.burst(5200,3000,.08,.05,'highpass',.7);AUD.tone(1700,1300,.04,.05,'square')}                       // the key slides in, jingling
  else if(k==='bolt'){AUD.tone(260,90,.07,.22,'square');AUD.burst(1800,600,.05,.1,'bandpass',.9)}                             // the lock's tongue throws back: a dry clack
  else if(k==='slam'){AUD.burst(500,90,.28,.3,'lowpass',.9);AUD.tone(95,45,.3,.22,'sine')}}
// running water: ONE looping noise (high-passed, soft top, a slow wobble) faded in and out — repeating bursts sounded like gunfire
function actWaterStream(on){const A=window.AUD;if(!A||!A.ok)return;const c=A.ctx;
  if(!ACT.wtr){const s=c.createBufferSource();s.buffer=A.noise;s.loop=true;
    const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1100;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5400;lp.Q.value=.3;
    const m=c.createGain();m.gain.value=.78;const lfo=c.createOscillator();lfo.frequency.value=6.5;const lg=c.createGain();lg.gain.value=.22;lfo.connect(lg);lg.connect(m.gain);
    const g=c.createGain();g.gain.value=0;s.connect(hp);hp.connect(lp);lp.connect(m);m.connect(g);g.connect(A.sfx);s.start();lfo.start();ACT.wtr=g}
  ACT.wtr.gain.setTargetAtTime(on?.032:0,c.currentTime,on?.12:.18)}

// ---------- start / end ----------
function actInstall(){if(ACT.hooked)return;ACT.hooked=true;
  const base=window.animPlayer;window.animPlayer=function(P,st,dt){base(P,st,dt);if(ACT.cur&&P===PLR){actApply(P,dt);if(P.real&&typeof REAL!=='undefined')REAL.tick(P,st,dt)}};      // the act pose is written AFTER the base animPlayer already copied the procedural joints onto the GLB skeleton: copy again, or the real body keeps its arms down while the invisible classic rig washes its hands
  ANIM.push(actTick)}
ACT.start=function(kind,o){
  if(ACT.cur||player.sit||(typeof DRIVE!=='undefined'&&DRIVE.on)||(typeof RIDE!=='undefined'&&RIDE.on)||!PLR)return false;
  actInstall();o=o||{};const a={kind,o,t:0,dur:ACT_DUR[kind]||5,item:o.item||(kind==='kettle'?'cup':kind==='pour'?'glass':kind==='door'?'none':kind==='key'?'key':'milk'),portal:PORTAL.cur,yaw:player.yaw,sip:0,jet:0,flag:{}};
  if(o.tx!==undefined){const dx=o.tx-player.x,dz=o.tz-player.z,d=Math.hypot(dx,dz)||1;a.yaw=Math.atan2(dx,dz);const want=o.reach||.8;a.gx=d>want?o.tx-dx/d*want:player.x;a.gz=d>want?o.tz-dz/d*want:player.z;
    // a fixture with a stand point (the fridge): go there and face the fixture from it
    if(o.stand&&!insideAny(o.stand[0],o.stand[1],.3,player.y+.5)){a.gx=o.stand[0];a.gz=o.stand[1];a.yaw=Math.atan2(o.tx-a.gx,o.tz-a.gz)}}
  a.cam0=cam.dist;if(cam.dist<=.75){cam.dist=2.3;cam.init=false}
  // camera to whichever side has room (kitchens are tight); the working hand is the one on the camera's side so it is always in view
  {const px=a.gx!==undefined?a.gx:player.x,pz=a.gz!==undefined?a.gz:player.z,free=sg=>{const yw=a.yaw+sg*.85;for(let s=.6;s<=2.3;s+=.2){const x=px-Math.sin(yw)*s,z=pz-Math.cos(yw)*s;if(insideAny(x,z,.25,player.y+1.35))return s}return 2.4};
   const fm=free(-1),fp=free(1);a.side=(fm>=1.7||fm>=fp-.3)?-1:1;a.hand=a.side<0?1:0}
  // the arm on the fridge's side opens it (the door swings that way, so the hand follows the handle without crossing the body)
  if(kind==='fridge'&&o.F){const gx=a.gx!==undefined?a.gx:player.x,gz=a.gz!==undefined?a.gz:player.z;
    a.hand=((o.tx-gx)*Math.cos(a.yaw)-(o.tz-gz)*Math.sin(a.yaw))>0?1:0}
  const pr=actProp(a.item),HH=PLR.arms[a.hand].hand;if(pr.parent!==HH)HH.add(pr);a.prop=pr;a.canWas=PLR.can.visible;PLR.can.visible=false;a.bx=player.x;a.bz=player.z;a.adv=0;a.lp=0;
  ACT.cur=a;return true};
function actEnd(cancel){const a=ACT.cur;if(!a)return;ACT.cur=null;
  if(a.prop)a.prop.visible=false;if(PLR){PLR.can.visible=a.canWas;if(PLR.foam)PLR.foam.forEach(f=>f.visible=false);PLR.hdHold=null;for(const A of PLR.arms){A.ikp=null;A.hand.rotation.set(0,0,0)}}
  if(PLR)PLR._leanW=0;if(a.o.leaf)setTimeout(()=>a.o.leaf(0),cancel?0:900);   // a door that opened closes again once you are through (or at once if you walked away)
  if(a.wOn)actWaterStream(false);if(a.o.F)a.o.F.set(0);if(a.o.lamp)a.o.lamp.material.color.setHex(0x223344);if(a.o.jetMesh)a.o.jetMesh.visible=false;
  if(a.cam0<=.75&&cam.dist>.75){cam.dist=a.cam0;cam.init=false}
  if(a.o.onEnd)a.o.onEnd(!!cancel)}

function actTick(dt){actSteamTick(dt);const a=ACT.cur;if(!a)return;a.t+=dt;
  // anything that moves the player (stick / keys), a new place or a vehicle ends it
  if((a.t>.5&&Math.hypot(player.vx||0,player.vz||0)>.7)||PORTAL.cur!==a.portal||player.sit||DRIVE.on){actEnd(true);return}
  // step up to the fixture and turn towards it, camera a little off to the side so the hands show
  let dy=a.yaw-player.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;player.yaw+=dy*Math.min(1,dt*7);
  if(a.gx!==undefined&&a.t<.6){const k=Math.min(1,dt*5),nx=player.x+(a.gx-player.x)*k,nz=player.z+(a.gz-player.z)*k;if(!insideAny(nx,nz,.2,player.y+.5)){a.spd=Math.hypot(nx-player.x,nz-player.z)/Math.max(dt,1e-3);player.x=nx;player.z=nz}}   // the feet shuffle while you step up to it (the body leans over the worktop, so the clearance is smaller than for walking)
  else if(!a.sp0){a.sp0=1;a.spd=0}
  if(cam.dist>.75){let cy=player.yaw+a.side*.85-cam.yaw;while(cy>Math.PI)cy-=6.283;while(cy<-Math.PI)cy+=6.283;cam.yaw+=cy*Math.min(1,dt*3)}
  const t=a.t,o=a.o,at=(x,y)=>t>=x&&t-dt<x;
  if(a.kind==='wash'){const on=t>.5&&t<a.dur-.7;if(o.jet&&on)o.jet();if(o.jetMesh)o.jetMesh.visible=on;if(on!==a.wOn){a.wOn=on;actWaterStream(on)}if(at(.5))actSfx('click')}
  else if(a.kind==='pour'){const on=t>.5&&t<2.4;if(o.jet&&on)o.jet();if(o.jetMesh)o.jetMesh.visible=on;if(on!==a.wOn){a.wOn=on;actWaterStream(on)}
    if(a.prop.userData.water)a.prop.userData.water.scale.y=.15+.85*actWin(t,.7,2.2);a.prop.visible=t>.2;
    for(const s of [3.5,4.5,5.5])if(at(s))actSfx('gulp')}
  else if(a.kind==='fridge'){if(o.F)o.F.set(actWin(t,.5,1.45)*(1-actWin(t,2.55,3.35)));if(at(.5))actSfx('thunk');if(at(3.3))actSfx('thunk');
    // step in to reach the shelf, step back after the door is shut
    if(o.step&&a.gx!==undefined&&t>.6){const adv=actWin(t,.95,1.75)*(1-actWin(t,3.45,4.25)),nx=a.gx+(o.step[0]-a.gx)*adv,nz=a.gz+(o.step[1]-a.gz)*adv;
      a.spd=(adv-a.adv)/Math.max(dt,1e-3)*Math.hypot(o.step[0]-a.gx,o.step[1]-a.gz);a.adv=adv;if(!insideAny(nx,nz,.25,player.y+.5)){player.x=nx;player.z=nz}}
    a.prop.visible=t>1.9&&t<7.6;for(const s of [4.6,5.6,6.6])if(at(s))actSfx('gulp')}
  else if(a.kind==='kettle'){if(at(.7)){actSfx('click');if(o.lamp)o.lamp.material.color.setHex(0x4aa8ff)}
    if(t>1&&t<5.0){if(o.steam)actSteam(o.steam[0],o.steam[1],o.steam[2],.2,16+10*actWin(t,1,4.5));if((t*3|0)!==((t-dt)*3|0))actSfx('boil')}
    if(at(5.0)){actSfx('click');actSfx('ding');if(o.lamp)o.lamp.material.color.setHex(0x223344);if(o.whistle)AUD.tone(2300,2100,.7,.07,'sine')}
    a.prop.visible=t>5.6&&t<9.6;for(const s of [7.3,8.3,9.1])if(at(s))actSfx('gulp')}
  else if(a.kind==='door'){if(at(.5))actSfx('latch');if(at(.9))actSfx('creak');if(o.leaf)o.leaf(actWin(t,.9,2.0))}
  else if(a.kind==='key'){
    a.prop.visible=t>.25&&t<3.0;if(at(.2))actSfx('keyout');if(at(.7))actSfx('keyin');if(at(1.35))actSfx('keyin');if(at(1.95))actSfx('bolt');if(at(2.3))actSfx('bolt');if(at(2.8))actSfx('keyin');if(at(3.45))actSfx('latch');if(at(3.7))actSfx('creak');
    if(o.leaf)o.leaf(actWin(t,3.6,4.7));
    // the leaf swings out over where you stand, so step back as you pull it open
    if(o.back&&a.gx!==undefined){const adv=actWin(t,3.4,4.2),nx=a.gx+(o.back[0]-a.gx)*adv,nz=a.gz+(o.back[1]-a.gz)*adv;
      a.spd=(adv-a.adv)/Math.max(dt,1e-3)*Math.hypot(o.back[0]-a.gx,o.back[1]-a.gz);a.adv=adv;if(!insideAny(nx,nz,.25,player.y+.5)){player.x=nx;player.z=nz}}}
  if(t>=a.dur)actEnd(false)}

// ---------- the pose ----------
// soap suds: a few small blobs on the back of each hand and between the fingers (not a ball that hides the hands)
function actFoam(P){if(P.foam)return P.foam;const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9});
  P.foam=P.arms.map(A=>{const g=new THREE.Group();g.visible=false;
    [[.024,-.034,.004,.022],[.022,-.062,.02,.017],[.021,-.058,-.016,.016],[.017,-.083,.008,.012],[.005,-.1,.012,.011],[.026,-.012,-.008,.016]].forEach(b=>{const m=new THREE.Mesh(new THREE.SphereGeometry(b[3],8,6),mat);m.position.set(A.s*b[0],b[1],b[2]);g.add(m)});
    A.hand.add(g);return g});return P.foam}
// ---------- the pose: arms reach with the two-bone solver (hands.js), fingers take grips, whatever you hold sits in the palm ----------
// player-relative point -> world: (sideways, height above the floor, forward)
function actFrame(){const s=Math.sin(player.yaw),c=Math.cos(player.yaw);return (l,h,f)=>[player.x+c*l+s*f,player.y+h,player.z-s*l+c*f]}
function actSp(P,p){P.spine.updateWorldMatrix(true,false);return P.spine.worldToLocal(Array.isArray(p)?new THREE.Vector3(p[0],p[1],p[2]):p.clone())}
function actDirSp(P,v){P.spine.updateWorldMatrix(true,false);const q=new THREE.Quaternion();P.spine.getWorldQuaternion(q);return v.clone().applyQuaternion(q.invert())}
// weighted mean of [vector, weight] pairs (weights need not add up to 1)
function actMean(list){const r=new THREE.Vector3();let s=0;for(const l of list){if(l[1]>0){r.addScaledVector(l[0],l[1]);s+=l[1]}}return s>0?r.multiplyScalar(1/s):r}
function actCurl(list){const r=[0,0,0,0,0];let s=0;for(const l of list){if(l[1]>0){for(let i=0;i<5;i++)r[i]+=HD.pose[l[0]][i]*l[1];s+=l[1]}}return s>0?r.map(v=>v/s):HD.pose.relax.slice()}
// one hand: T = where the PALM CENTRE goes (spine space), n = where the palm looks, f = how much of the base animation it replaces (0..1)
function actHand(P,A,T,n,f,dt,o){o=o||{};const b=[A.sh.rotation.x,A.sh.rotation.z,A.el.rotation.x];
  if(!A.ikp){const q=new THREE.Vector3();hdForearm(A,q);A.ikp=hdHandPos(A,new THREE.Vector3()).addScaledVector(q,.036)}
  A.ikp.lerp(T,1-Math.exp(-dt*(o.k||16)));hdReachPalm(A,A.ikp);
  A.sh.rotation.x=b[0]+(A.sh.rotation.x-b[0])*f;A.sh.rotation.z=b[1]+(A.sh.rotation.z-b[1])*f;A.el.rotation.x=b[2]+(A.el.rotation.x-b[2])*f;
  hdPalm(A,n,o.flex||0,o.dev||0);const H=A.hand.rotation;H.x*=f;H.y*=f;H.z*=f}
// the thing in the hand sits against the palm and stays upright in the world; tilt = how far it is tipped towards the face
function actHold(a,A,tilt){const pr=a.prop;if(pr.parent!==A.hand)A.hand.add(pr);pr.position.set(-A.s*.034,-.05,0);
  A.hand.updateWorldMatrix(true,false);const q=new THREE.Quaternion();A.hand.getWorldQuaternion(q);
  pr.quaternion.copy(q.invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-tilt,player.yaw,0,'YXZ'))))}
// the mouth in spine space, nudged so a glass or carton held in the palm touches the lips
function actMouth(P,A){const m=new THREE.Vector3(0,.075,.14);P.head.updateWorldMatrix(true,false);P.head.localToWorld(m);const v=actSp(P,m);v.x+=A.s*.034;v.y-=.05;v.z+=.05;return v}
const ACT_REST=A=>new THREE.Vector3(A.s*.285,-.1,.05),ACT_CARRY=A=>new THREE.Vector3(A.s*.13,.27,.27);

function actApply(P,dt){
  const a=ACT.cur,t=a.t,o=a.o,kind=a.kind,Wd=P.arms[a.hand],Od=P.arms[1-a.hand],w=actWin(t,0,.35)*(1-actWin(t,a.dur-.45,a.dur));
  P.hdHold=[1,1];P._leanW=w;
  // feet shuffle while the body steps in / back (a.spd = metres per second along the way)
  {const sp=a.spd||0,mv=Math.min(1,Math.abs(sp)/.4);if(mv>.03){a.lp+=dt*sp*4.2;for(const g of P.legs){const q=a.lp+(g.s>0?0:Math.PI);g.hp.rotation.x=-Math.sin(q)*.45*mv;g.kn.rotation.x=Math.max(0,Math.sin(q+1.3))*.7*mv+.04}}}
  const body=(lean,head)=>{P.spine.rotation.x+=(lean-P.spine.rotation.x)*w;P.head.rotation.x+=(head-P.head.rotation.x)*w};
  const fr=actFrame(),V=(x,y,z)=>new THREE.Vector3(x,y,z),D=o.tx===undefined?.8:Math.hypot(o.tx-player.x,o.tz-player.z);
  const grip=(A,list)=>{A.hand.userData.rig.tgt=actCurl(list)};
  const up=kind==='pour'?actWin(t,2.9,3.7)*(1-actWin(t,5.2,6.0)):kind==='fridge'?actWin(t,4.0,4.8)*(1-actWin(t,7.0,7.9)):kind==='kettle'?actWin(t,6.4,7.2)*(1-actWin(t,9.0,9.9)):0;
  const itemPose=a.item==='cola'||a.item==='glass'||a.item==='cup'?'glass':'carton';
  // ---------------- wash: both palms meet under the tap and rub, fingers lace, then a rinse with cupped hands ----------------
  if(kind==='wash'){const dh=Math.max(.3,Math.min(.85,D-.04));body(.5+.3*Math.max(0,Math.min(1,(dh-.5)/.3)),.3);      // the hands go to the tap itself; the further it is, the more you lean over the sink
    const C=actSp(P,fr(0,o.ty||.97,dh));
    const wet=actWin(t,.4,.8)*(1-actWin(t,1.0,1.3)),rub=actWin(t,1.0,1.4)*(1-actWin(t,2.8,3.1)),lace=actWin(t,2.8,3.2)*(1-actWin(t,3.8,4.1)),rinse=actWin(t,3.9,4.3)*(1-actWin(t,4.7,5.0));
    const ph=t*9.4,pl=t*5.2;
    P.arms.forEach((A,i)=>{const s=A.s,T=C.clone();
      T.x+=s*(.022+.02*wet+.045*rinse+.004*lace);
      T.z+=(s>0?.05:-.022)*Math.sin(ph)*rub+(s>0?.034:-.034)*Math.sin(pl)*lace+.012*Math.sin(t*3.3+s)*wet;
      T.y+=(s>0?.014:-.007)*Math.sin(ph+.6)*rub+.02*Math.cos(pl)*s*lace-.035*rinse;
      const al=.45*lace+.95*rinse;actHand(P,A,T,V(-s*Math.cos(al),Math.sin(al),0),w,dt);
      grip(A,[['flat',Math.max(.0001,1-lace-rinse)],['lace',lace],['cup',rinse]])});
    const f=actFoam(P),fv=t>1.5&&t<3.7,osc=Math.sin(ph)*rub;f.forEach(m=>{m.visible=fv;m.scale.set(1+.15*osc,.7,1)})}
  // ---------------- pour: a glass under the tap, then up to the lips ----------------
  else if(kind==='pour'){const under=actWin(t,.15,.6)*(1-actWin(t,2.4,2.9)),dh=Math.max(.3,Math.min(.85,D-.04));body((.3+.5*Math.max(0,Math.min(1,(dh-.5)/.3)))*under,.14*under-.3*up);
    const Tu=actSp(P,fr(0,(o.ty||.97)-.02,dh));Tu.x+=Wd.s*.034;
    actHand(P,Wd,actMean([[Tu,under],[actMouth(P,Wd),up],[ACT_CARRY(Wd),Math.max(0,1-under-up)+.0001]]),V(-Wd.s,0,0),w,dt);grip(Wd,[[itemPose,1]]);
    actHand(P,Od,ACT_REST(Od),V(-Od.s,0,0),w,dt);grip(Od,[['relax',1]]);actHold(a,Wd,.75*up)}
  // ---------------- fridge: take hold of the handle, pull, reach in, take something out, push the door shut with the other hand, drink ----------------
  else if(kind==='fridge'){
    const H=actWin(t,0,.45)*(1-actWin(t,.95,1.3)),I=actWin(t,1.15,1.8)*(1-actWin(t,2.0,2.7)),Pu=actWin(t,2.4,2.8)*(1-actWin(t,3.5,3.9));
    body(.12+.2*I,.08+.1*I-.3*up);
    let Th,Ti,Tp=null,np=V(0,0,1);
    if(o.F){o.F.door.updateWorldMatrix(true,true);const hw=new THREE.Vector3();o.F.door.children[0].getWorldPosition(hw);Th=actSp(P,hw);
      const dx=player.x-o.tx,dz=player.z-o.tz,l=Math.hypot(dx,dz)||1;Ti=actSp(P,[o.tx+dx/l*.12,player.y+1.0,o.tz+dz/l*.12]);
      const dw=o.F.dw||o.F.door.geometry.parameters.width,pw=new THREE.Vector3(dw*.7,.0,.06);o.F.door.localToWorld(pw);Tp=actSp(P,pw);
      np=actDirSp(P,new THREE.Vector3(0,0,-1).transformDirection(o.F.door.matrixWorld))}
    else{const k=Math.max(.3,Math.min(.56,D-.35));Th=actSp(P,fr(Wd.s*.12,1.02,k));Ti=actSp(P,fr(0,1.0,Math.max(.3,Math.min(.6,D-.1))))}
    Th.x+=Wd.s*.03;Ti.x+=Wd.s*.034;
    const T=actMean([[Th,H],[Ti,I],[actMouth(P,Wd),up],[ACT_CARRY(Wd),Math.max(0,1-H-I-up)+.0001]]);
    actHand(P,Wd,T,V(-Wd.s,0,0),w,dt);
    const gh=actWin(t,.3,.5)*(1-actWin(t,.9,1.1)),gc=actWin(t,1.75,2.0);grip(Wd,[['cup',Math.max(0,1-gh-gc)],['bar',gh],[itemPose,gc]]);
    if(Tp&&Pu>0){actHand(P,Od,actMean([[Tp,Pu],[ACT_REST(Od),Math.max(0,1-Pu)]]),actMean([[np,Pu],[V(-Od.s,0,0),Math.max(0,1-Pu)]]).normalize(),w,dt);grip(Od,[['flat',Pu],['relax',Math.max(0,1-Pu)]])}
    else{actHand(P,Od,ACT_REST(Od),V(-Od.s,0,0),w,dt);grip(Od,[['relax',1]])}
    actHold(a,Wd,.8*up)}
  // ---------------- kettle: one finger presses the button, wait, take the cup, drink ----------------
  else if(kind==='kettle'){const press=actWin(t,0,.6)*(1-actWin(t,1.0,1.6));body((o.knob?.2:.55)*press+.05,.1*press+.18*actWin(t,1.4,2.0)*(1-actWin(t,5.0,5.6))-.3*up);      // the electric button is on the worktop (lean over it), the gas knob on the front of the hob
    let Tb;if(o.knob){const kk=new THREE.Vector3(o.knob[0],o.knob[1],o.knob[2]);kk.x-=Math.sin(a.yaw)*.07;kk.z-=Math.cos(a.yaw)*.07;Tb=actSp(P,kk)}
    else if(o.lamp){const lw=new THREE.Vector3();o.lamp.getWorldPosition(lw);lw.y+=.045;Tb=actSp(P,lw)}else Tb=actSp(P,fr(Wd.s*.08,.98,Math.max(.3,Math.min(.55,D-.1))));
    const hold=actWin(t,5.4,6.0);
    actHand(P,Wd,actMean([[Tb,press],[actMouth(P,Wd),up],[ACT_CARRY(Wd),Math.max(0,1-press-up)+.0001]]),o.knob?V(-Wd.s,0,0):actMean([[V(0,-1,0),press],[V(-Wd.s,0,0),Math.max(0,1-press)]]).normalize(),w,dt);
    grip(Wd,[[o.knob?'pinch':'point',press],['cup',Math.max(0,1-press-hold)],[itemPose,hold]]);
    actHand(P,Od,ACT_REST(Od),V(-Od.s,0,0),w,dt);grip(Od,[['relax',1]]);actHold(a,Wd,.75*up)}
  // ---------------- door: reach for the handle, press it down (the latch lets go), push / pull ----------------
  else if(kind==='door'){const rc=actWin(t,.05,.5)*(1-actWin(t,1.95,2.4)),ps=actWin(t,.65,1.6);body(.08+.1*ps,.04);
    const dh=Math.max(.3,Math.min(.6,D-.12)),T=actSp(P,fr(Wd.s*.1,1.0-.05*actWin(t,.45,.7)*(1-actWin(t,.8,1.1)),dh+.12*ps));
    actHand(P,Wd,actMean([[T,rc],[ACT_CARRY(Wd),Math.max(0,1-rc)+.0001]]),V(-Wd.s,0,0),w,dt);grip(Wd,[['relax',Math.max(0,1-rc)],['bar',rc]]);
    actHand(P,Od,ACT_REST(Od),V(-Od.s,0,0),w,dt);grip(Od,[['relax',1]])}
  // ---------------- key: out of the pocket, into the lock, two turns (clack, clack), out again, then the handle and the door swings ----------------
  else if(kind==='key'&&o.lock){
    const reach=actWin(t,.2,.95),hd=actWin(t,2.85,3.35),hOff=actWin(t,4.1,4.6),wL=reach*(1-hd),wH=hd*(1-hOff),wR=Math.max(0,1-wL-wH)+.0001;
    const ins=actWin(t,1.0,1.4)*(1-actWin(t,2.5,2.8)),turn=actWin(t,1.6,2.35)*(1-actWin(t,2.45,2.75)),al=turn*1.45;
    body(.16*wL+.1*wH,.18*wL);
    const Lw=new THREE.Vector3(o.lock[0],o.lock[1],o.lock[2]),fx=Math.sin(a.yaw),fz=Math.cos(a.yaw);Lw.x-=fx*(.14-.05*ins);Lw.z-=fz*(.14-.05*ins);
    const TL=actSp(P,Lw);let TH=TL;if(o.handlePos){TH=actSp(P,o.handlePos());TH.x+=Wd.s*.03}
    const n=actMean([[V(-Wd.s*Math.cos(al),-Math.sin(al),0),wL],[V(-Wd.s,0,0),wH+wR]]).normalize();
    actHand(P,Wd,actMean([[TL,wL],[TH,wH],[ACT_REST(Wd),wR]]),n,w,dt);
    grip(Wd,[['pinch',wL],['bar',wH],['relax',wR]]);
    actHand(P,Od,ACT_REST(Od),V(-Od.s,0,0),w,dt);grip(Od,[['relax',1]]);
    // the key sits in the pinch with its shaft pointing at the lock, and rolls with the wrist
    {const pr=a.prop;if(pr.parent!==Wd.hand)Wd.hand.add(pr);pr.position.set(-Wd.s*.03,-.05,.0);Wd.hand.updateWorldMatrix(true,false);const q=new THREE.Quaternion();Wd.hand.getWorldQuaternion(q);
      pr.quaternion.copy(q.invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,a.yaw,-Wd.s*al,'YXZ'))))}}
}

// ---------- an openable fridge for the interior kit: shell, shelves with food, one swinging door ----------
// E = shEnv, (x,z) = centre of the back wall in E-local metres, ry = direction it faces; returns {set(k),stand,act}
function actFridge(E,x,z,ry,w,o){o=o||{};const H=o.h||1.9,Dp=.7,T=.03,c=Math.cos(ry),s=Math.sin(ry),loc=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
  const bx=(u,y,v,sw,sh,sd,col,m)=>{const p=loc(u,v);E.box(p[0],y,p[1],sw,sh,sd,col,m||0,ry)};
  const body=o.body||'#e6e9ec';
  bx(0,H/2,.035,w,H,T,body,6);for(const sd of [-1,1])bx(sd*(w/2-T/2),H/2,Dp/2,T,H,Dp,body,6);bx(0,H-T/2,Dp/2,w,T,Dp,body,6);bx(0,.07,Dp/2,w,.14,Dp,'#cfd3d6',6);
  bx(0,H-.12,Dp/2,w-.2,.02,.1,'#fffbe6',8);
  // goods on the shelves
  const cols=['#f4f6fa','#f08a1c','#2f6db0','#c8372d','#3f9a46','#e8c13a','#8a4ab0'];let seed=Math.round(Math.abs(x*13+z*7))+3;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
  [.46,.82,1.18,1.52].forEach((y,si)=>{bx(0,y,Dp/2,w-2*T,.02,Dp-.08,'#dfe9ef',1);
    for(let i=0;i<Math.floor((w-.12)/.1);i++){const u=-w/2+.09+i*.1,hh=.1+rnd()*.12,cc=cols[Math.floor(rnd()*cols.length)];if(rnd()<.18)continue;bx(u,y+.01+hh/2,.18+rnd()*.3,.075,hh,.075,cc,1)}});
  E.obb(...(()=>{const p=loc(0,Dp/2);return [p[0],p[1],w/2,Dp/2,ry]})());
  // the door: a pivoting box with a handle, hinged on its left edge
  const geo=new THREE.BoxGeometry(w-.01,H-.03,.05);geo.translate((w-.01)/2,0,0);
  const door=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color(o.door||'#dfe3e7').convertSRGBToLinear(),roughness:.3,metalness:.55}));door.castShadow=true;
  const hg=new THREE.Mesh(new THREE.BoxGeometry(.03,.55,.04),new THREE.MeshStandardMaterial({color:0x8a9096,roughness:.25,metalness:.9}));hg.position.set(w-.1,.1,.05);door.add(hg);
  // rubber seal round the front: the door's back face rests on it, so no thin slit shows the dark inside (it shimmered)
  bx(-w/2+T/2,H/2,Dp+.006,T,H-.05,.012,'#2a2c30',1);bx(w/2-T/2,H/2,Dp+.006,T,H-.05,.012,'#2a2c30',1);bx(0,H-.03,Dp+.006,w,.02,.012,'#2a2c30',1);bx(0,.16,Dp+.006,w,.02,.012,'#2a2c30',1);
  door.castShadow=false;
  const hp=loc(-w/2,Dp+.037);door.position.set(E.ox+hp[0],INT_Y+H/2,E.oz+hp[1]);door.rotation.y=ry;E.grp.add(door);
  const F={door,set(k){door.rotation.y=ry-1.85*k},stand:loc(0,Dp+.62)};F.set(0);
  const label=o.label||'Open the fridge',items=['milk','juice','kefir','cola'];let n=0;
  E.act(F.stand[0],F.stand[1],1.5,label,()=>{const it=items[n++%items.length];const p=loc(0,Dp/2);
    const sa=loc(.42,1.4),sb=loc(.2,1.04);   // stand to the handle's side, out of the door's sweep; step in to the shelf later
    if(ACT.start('fridge',{F,item:it,tx:E.ox+p[0],tz:E.oz+p[1],reach:1.05,stand:[E.ox+sa[0],E.oz+sa[1]],step:[E.ox+sb[0],E.oz+sb[1]],onEnd:cx=>{if(!cx)toast('Cheers','you had some '+(it==='cola'?'cola':it))}}))toast('Fridge',it==='milk'?'a carton of cold milk':it==='juice'?'orange juice':it==='kefir'?'kefir':'a cold bottle of cola')});
  return F}

// ---------- an electric kettle on a counter (x,z in E-local metres, y = counter top) ----------
function actKettle(E,x,y,z,ry,o){o=o||{};const bx=(dx,dy,dz,sw,sh,sd,col,m)=>E.box(x+dx,y+dy,z+dz,sw,sh,sd,col,m||0,ry);
  bx(0,.012,0,.18,.024,.18,'#2a2d32',1);bx(0,.14,0,.15,.24,.15,o.body||'#eef1f3',6);bx(0,.275,0,.12,.03,.12,'#cfd4d8',6);bx(.1,.2,0,.07,.05,.04,'#eef1f3',6);bx(-.095,.16,0,.025,.2,.05,'#1c1d20',1);bx(0,.31,0,.045,.02,.045,'#1c1d20',1);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.03,.012,.012),new THREE.MeshBasicMaterial({color:0x223344}));lamp.position.set(E.ox+x,INT_Y+y+.03,E.oz+z+.1);lamp.rotation.y=ry;E.grp.add(lamp);
  E.obb(x,z,.12,.12,0);
  const stand=o.stand||[x,z+.8];
  E.act(stand[0],stand[1],1.3,o.label||'Boil the kettle',()=>{
    if(ACT.start('kettle',{lamp,steam:[E.ox+x+.1,INT_Y+y+.3,E.oz+z],tx:E.ox+x,tz:E.oz+z,reach:o.reach||.5,onEnd:cx=>{if(!cx)toast('Tea','hot, sweet and exactly what you needed')}}))toast('Kettle','the button clicks and the water starts to hum')});
  return {lamp}}
