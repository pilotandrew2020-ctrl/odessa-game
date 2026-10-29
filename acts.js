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
const ACT_DUR={wash:5.4,pour:6.4,fridge:8.4,kettle:10.4};
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

// ---------- sounds (AUD is the game's synth) ----------
function actSfx(k){if(!window.AUD||!AUD.ok)return;
  if(k==='water')AUD.burst(4200,2600,.18,.05,'bandpass',.6);
  else if(k==='click')AUD.tone(900,520,.05,.12,'square');
  else if(k==='thunk')AUD.tone(130,70,.14,.22,'sine');
  else if(k==='gulp')AUD.tone(210,110,.1,.09,'sine');
  else if(k==='boil')AUD.burst(500,1500,.3,.035,'lowpass',.7);
  else if(k==='ding'){AUD.tone(1568,1568,.35,.12,'sine');AUD.tone(2093,2093,.4,.08,'sine',null,.1)}}

// ---------- start / end ----------
function actInstall(){if(ACT.hooked)return;ACT.hooked=true;
  const base=window.animPlayer;window.animPlayer=function(P,st,dt){base(P,st,dt);if(ACT.cur&&P===PLR)actApply(P,dt)};
  ANIM.push(actTick)}
ACT.start=function(kind,o){
  if(ACT.cur||player.sit||(typeof DRIVE!=='undefined'&&DRIVE.on)||(typeof RIDE!=='undefined'&&RIDE.on)||!PLR)return false;
  actInstall();o=o||{};const a={kind,o,t:0,dur:ACT_DUR[kind]||5,item:o.item||(kind==='kettle'?'cup':kind==='pour'?'glass':'milk'),portal:PORTAL.cur,yaw:player.yaw,sip:0,jet:0,flag:{}};
  if(o.tx!==undefined){const dx=o.tx-player.x,dz=o.tz-player.z,d=Math.hypot(dx,dz)||1;a.yaw=Math.atan2(dx,dz);const want=o.reach||.8;a.gx=d>want?o.tx-dx/d*want:player.x;a.gz=d>want?o.tz-dz/d*want:player.z}
  a.cam0=cam.dist;if(cam.dist<=.75){cam.dist=2.3;cam.init=false}
  // camera to whichever side has room (kitchens are tight); the working hand is the one on the camera's side so it is always in view
  {const px=a.gx!==undefined?a.gx:player.x,pz=a.gz!==undefined?a.gz:player.z,free=sg=>{const yw=a.yaw+sg*.85;for(let s=.6;s<=2.3;s+=.2){const x=px-Math.sin(yw)*s,z=pz-Math.cos(yw)*s;if(insideAny(x,z,.25,player.y+1.35))return s}return 2.4};
   const fm=free(-1),fp=free(1);a.side=(fm>=1.7||fm>=fp-.3)?-1:1;a.hand=a.side<0?1:0}
  const W=PLR.arms[a.hand].el;const pr=actProp(a.item);if(pr.parent!==W)W.add(pr);a.prop=pr;a.canWas=PLR.can.visible;PLR.can.visible=false;
  ACT.cur=a;return true};
function actEnd(cancel){const a=ACT.cur;if(!a)return;ACT.cur=null;
  if(a.prop)a.prop.visible=false;if(PLR){PLR.can.visible=a.canWas;if(PLR.foam)PLR.foam.forEach(f=>f.visible=false)}
  if(a.o.F)a.o.F.set(0);if(a.o.lamp)a.o.lamp.material.color.setHex(0x223344);if(a.o.jetMesh)a.o.jetMesh.visible=false;
  if(a.cam0<=.75&&cam.dist>.75){cam.dist=a.cam0;cam.init=false}
  if(a.o.onEnd)a.o.onEnd(!!cancel)}

function actTick(dt){actSteamTick(dt);const a=ACT.cur;if(!a)return;a.t+=dt;
  // anything that moves the player (stick / keys), a new place or a vehicle ends it
  if((a.t>.5&&Math.hypot(player.vx||0,player.vz||0)>.7)||PORTAL.cur!==a.portal||player.sit||DRIVE.on){actEnd(true);return}
  // step up to the fixture and turn towards it, camera a little off to the side so the hands show
  let dy=a.yaw-player.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;player.yaw+=dy*Math.min(1,dt*7);
  if(a.gx!==undefined&&a.t<.6){const k=Math.min(1,dt*5),nx=player.x+(a.gx-player.x)*k,nz=player.z+(a.gz-player.z)*k;if(!insideAny(nx,nz,.3,player.y+.5)){player.x=nx;player.z=nz}}
  if(cam.dist>.75){let cy=player.yaw+a.side*.85-cam.yaw;while(cy>Math.PI)cy-=6.283;while(cy<-Math.PI)cy+=6.283;cam.yaw+=cy*Math.min(1,dt*3)}
  const t=a.t,o=a.o,at=(x,y)=>t>=x&&t-dt<x;
  if(a.kind==='wash'){const on=t>.5&&t<a.dur-.7;if(o.jet&&on)o.jet();if(o.jetMesh)o.jetMesh.visible=on;if(on&&((t*8|0)!==((t-dt)*8|0)))actSfx('water');if(at(.5))actSfx('click')}
  else if(a.kind==='pour'){const on=t>.5&&t<2.4;if(o.jet&&on)o.jet();if(o.jetMesh)o.jetMesh.visible=on;if(on&&((t*8|0)!==((t-dt)*8|0)))actSfx('water');
    if(a.prop.userData.water)a.prop.userData.water.scale.y=.15+.85*actWin(t,.7,2.2);a.prop.visible=t>.2;
    for(const s of [3.5,4.5,5.5])if(at(s))actSfx('gulp')}
  else if(a.kind==='fridge'){if(o.F)o.F.set(actWin(t,.3,1.1)*(1-actWin(t,2.4,3.2)));if(at(.35))actSfx('thunk');if(at(3.0))actSfx('thunk');
    a.prop.visible=t>1.9&&t<7.6;for(const s of [4.6,5.6,6.6])if(at(s))actSfx('gulp')}
  else if(a.kind==='kettle'){if(at(.7)){actSfx('click');if(o.lamp)o.lamp.material.color.setHex(0x4aa8ff)}
    if(t>1&&t<5.0){if(o.steam)actSteam(o.steam[0],o.steam[1],o.steam[2],.2,16+10*actWin(t,1,4.5));if((t*3|0)!==((t-dt)*3|0))actSfx('boil')}
    if(at(5.0)){actSfx('click');actSfx('ding');if(o.lamp)o.lamp.material.color.setHex(0x223344);if(o.whistle)AUD.tone(2300,2100,.7,.07,'sine')}
    a.prop.visible=t>5.6&&t<9.6;for(const s of [7.3,8.3,9.1])if(at(s))actSfx('gulp')}
  if(t>=a.dur)actEnd(false)}

// ---------- the pose, blended over whatever the base animation did ----------
function actFoam(P){if(P.foam)return P.foam;P.foam=P.arms.map(A=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9}));m.position.set(0,-.23,.03);m.scale.set(1,.7,1);m.visible=false;A.el.add(m);return m});return P.foam}
function actApply(P,dt){
  const a=ACT.cur,t=a.t,W=P.arms[a.hand],O=P.arms[1-a.hand],w=actWin(t,0,.35)*(1-actWin(t,a.dur-.45,a.dur));
  // zin = how far the arm swings in towards the body (the arms are mirror images, so the sign depends on the side)
  const mix=(A,sx,zin,ex)=>{A.sh.rotation.x+=(sx-A.sh.rotation.x)*w;const z=-A.s*zin;A.sh.rotation.z+=(z-A.sh.rotation.z)*w;A.el.rotation.x+=(ex-A.el.rotation.x)*w};
  const body=(lean,head)=>{P.spine.rotation.x+=(lean-P.spine.rotation.x)*w;P.head.rotation.x+=(head-P.head.rotation.x)*w};
  // raising a glass or carton to the mouth: k = how far up it is
  const sip=k=>{mix(W,-.15-1.5*k,.06+.3*k,-.75-1.2*k);body(0,-.3*k)};
  const reach=(k,low)=>mix(W,-.35-(low?.65:1.1)*k,.12*k,-.4-.5*k);
  const kind=a.kind,tilt=u=>{a.prop.rotation.x=-(W.sh.rotation.x+W.el.rotation.x)-u};
  if(kind==='wash'){const rub=actWin(t,.8,1.2)*(1-actWin(t,4.5,5.0)),osc=Math.sin(t*15)*rub;body(.3,.22);const f=actFoam(P);
    for(const A of P.arms)mix(A,-.82+Math.cos(t*15+A.s)*.05*rub,.5-.04*osc,-1.3+osc*.12);
    const fv=t>1.5&&t<3.7;f.forEach(m=>{m.visible=fv;m.scale.set(1+.15*osc,.7,1)})}
  else if(kind==='pour'){
    // glass under the tap, then up to the mouth
    const under=actWin(t,.15,.6)*(1-actWin(t,2.4,2.9)),up=actWin(t,2.9,3.7)*(1-actWin(t,5.2,6.0));
    mix(O,-.2,.08,-.55);
    if(under>.01){mix(W,-.55-.35*under,.12*under,-.8-.2*under);body(.18*under,.12*under)}
    if(up>.01)sip(up);
    tilt(.75*up)}
  else if(kind==='fridge'){
    const rc=actWin(t,0,.5)*(1-actWin(t,3.2,3.7)),get=actWin(t,1.0,1.8)*(1-actWin(t,2.1,2.5)),carry=actWin(t,2.0,2.7)*(1-actWin(t,3.0,3.5)),up=actWin(t,4.0,4.8)*(1-actWin(t,7.0,7.9));
    mix(O,-.45*rc,-.05,-.4);
    if(rc>.01)reach(rc,false);if(get>.01){mix(W,-1.0,.18,-.25);body(.22*get,.15*get)}
    if(carry>.01)mix(W,-.55,.1,-1.1);
    if(up>.01)sip(up);
    tilt(.8*up)}
  else if(kind==='kettle'){
    const press=actWin(t,0,.6)*(1-actWin(t,1.0,1.6)),look=actWin(t,1.4,2.0)*(1-actWin(t,5.0,5.6)),up=actWin(t,6.4,7.2)*(1-actWin(t,9.0,9.9));
    mix(O,-.15,.08,-.6);
    if(press>.01){reach(press,true);body(.12*press,.1*press)}
    if(look>.01){mix(W,-.3,.05,-.7);body(.05,.18*look)}
    if(up>.01)sip(up);
    tilt(.75*up)}
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
  const hp=loc(-w/2,Dp+.03);door.position.set(E.ox+hp[0],INT_Y+H/2,E.oz+hp[1]);door.rotation.y=ry;E.grp.add(door);
  const F={door,set(k){door.rotation.y=ry-1.85*k},stand:loc(0,Dp+.62)};F.set(0);
  const label=o.label||'Open the fridge',items=['milk','juice','kefir','cola'];let n=0;
  E.act(F.stand[0],F.stand[1],1.5,label,()=>{const it=items[n++%items.length];const p=loc(0,Dp/2);
    if(ACT.start('fridge',{F,item:it,tx:E.ox+p[0],tz:E.oz+p[1],reach:1.05,onEnd:cx=>{if(!cx)toast('Cheers','you had some '+(it==='cola'?'cola':it))}}))toast('Fridge',it==='milk'?'a carton of cold milk':it==='juice'?'orange juice':it==='kefir'?'kefir':'a cold bottle of cola')});
  return F}

// ---------- an electric kettle on a counter (x,z in E-local metres, y = counter top) ----------
function actKettle(E,x,y,z,ry,o){o=o||{};const bx=(dx,dy,dz,sw,sh,sd,col,m)=>E.box(x+dx,y+dy,z+dz,sw,sh,sd,col,m||0,ry);
  bx(0,.012,0,.18,.024,.18,'#2a2d32',1);bx(0,.14,0,.15,.24,.15,o.body||'#eef1f3',6);bx(0,.275,0,.12,.03,.12,'#cfd4d8',6);bx(.1,.2,0,.07,.05,.04,'#eef1f3',6);bx(-.095,.16,0,.025,.2,.05,'#1c1d20',1);bx(0,.31,0,.045,.02,.045,'#1c1d20',1);
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.03,.012,.012),new THREE.MeshBasicMaterial({color:0x223344}));lamp.position.set(E.ox+x,INT_Y+y+.03,E.oz+z+.1);lamp.rotation.y=ry;E.grp.add(lamp);
  E.obb(x,z,.12,.12,0);
  const stand=o.stand||[x,z+.8];
  E.act(stand[0],stand[1],1.3,o.label||'Boil the kettle',()=>{
    if(ACT.start('kettle',{lamp,steam:[E.ox+x+.1,INT_Y+y+.3,E.oz+z],tx:E.ox+x,tz:E.oz+z,reach:o.reach||.85,onEnd:cx=>{if(!cx)toast('Tea','hot, sweet and exactly what you needed')}}))toast('Kettle','the button clicks and the water starts to hum')});
  return {lamp}}
