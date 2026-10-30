/* ===================================================================================================
   pose.js — the pose layer of every avatar (you, bots, friends): held weapons, emotes, drinking a potion, reaching for loot, skydiving.
   animPlayer() (index.html) calls POSE.layer(P,st,dt) after the base walk/idle pose and BEFORE REAL.tick copies the joints onto the
   realistic body, so the same code poses the classic avatar, the realistic one, the bots and the friends.
     P._gp   {w,cls,aim,ap,draw}  weapon in hand (set by GUN.hold)         P._gs  its animation state (draw t, reload rl, recoil rec)
     P.emo   {id,t}               an emote is playing                       P.drk  {t,dur,jar}  drinking a jar of blue liquid
     P.rch   {t,dur}              bending down to pick something up         P.sky  1 free fall · 2 glider
   Emotes: POSE.emote(P,id) / POSE.stop(P); the wheel (key X or More → Emote) is POSE.wheel().
   Arms: arms[1] is the weapon arm, arms[0] the support arm (it carries the lemonade can when nothing else is going on).
   =================================================================================================== */
const POSE=(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)},lerp=(a,b,k)=>a+(b-a)*k;
const PI=Math.PI;let W=1;                                    // blend weight of the pose that is being written
const R3=(o,x,y,z)=>{const r=o.rotation;if(x!==undefined)r.x+=(x-r.x)*W;if(y!==undefined)r.y+=(y-r.y)*W;if(z!==undefined)r.z+=(z-r.z)*W};
const HY=(P,y)=>{P.hips.position.y+=(P.hipY+y-P.hips.position.y)*W};
const HX=(P,x)=>{P.hips.position.x+=(x-P.hips.position.x)*W};
const grip=(P,i,pose)=>{if(P.hdHold)P.hdHold[i]=true;else P.hdHold=[false,false],P.hdHold[i]=true;if(typeof hdGrip==='function')hdGrip(P,i,pose)};
const free=P=>{if(P.hdHold){P.hdHold[0]=false;P.hdHold[1]=false}};
const Q1=new THREE.Quaternion(),Q2=new THREE.Quaternion(),V1=new THREE.Vector3(),V2=new THREE.Vector3(),V3=new THREE.Vector3(),VX=new THREE.Vector3(1,0,0),VZ=new THREE.Vector3(0,0,1);
const E1=new THREE.Euler();

// ---------------------------------------------------------------- emotes
// a = phase of the beat (one turn = two beats of a 128 bpm track), t = seconds since the start
const EM={
  default:{n:'Default Dance',loop:1,f(P,a,t){const s=Math.sin(a),c=Math.cos(a);
    HY(P,-.05+Math.abs(s)*.03);R3(P.spine,.05,s*.18,c*.06);R3(P.hips,0,-s*.25,0);R3(P.head,-.05+Math.abs(c)*.05,s*.2,0);
    P.arms.forEach((A,i)=>{const ph=a+(i?PI:0),sn=Math.sin(ph),cs=Math.cos(ph);R3(A.sh,-2.25+sn*.45,0,A.s*(.55+cs*.35));R3(A.el,-.7-sn*.5)});
    P.legs.forEach(g=>{const q=a+(g.s>0?0:PI),m=Math.max(0,Math.sin(q));R3(g.hp,-.15+Math.sin(q)*.25,0,g.s*(.14+m*.1));R3(g.kn,.35+m*.5);R3(g.ft,0)})}},
  floss:{n:'Floss',loop:1,f(P,a,t){const sw=Math.sin(a*1.1);
    HY(P,-.07);HX(P,-sw*.1);R3(P.hips,0,0,-sw*.12);R3(P.spine,.08,0,sw*.16);R3(P.head,0,0,-sw*.1);
    P.arms.forEach(A=>{R3(A.sh,.35,0,sw*.95);R3(A.el,-.08)});
    P.legs.forEach(g=>{R3(g.hp,-.22,0,g.s*.1+sw*.08);R3(g.kn,.5);R3(g.ft,0)})}},
  // Get Griddy: knees wide and bent, the hips rock, both hands come up beside the eyes and shake
  griddy:{n:'Get Griddy',loop:1,f(P,a,t){const sw=Math.sin(a),sh=Math.sin(a*4);
    HY(P,-.17-Math.abs(sw)*.03);R3(P.spine,.16,sw*.12,sw*.05);R3(P.hips,0,-sw*.16,0);R3(P.head,-.1+Math.abs(Math.cos(a))*.05,sw*.12,0);
    P.legs.forEach(g=>{const q=a+(g.s>0?0:PI),lift=Math.max(0,Math.sin(q));R3(g.hp,-.55-lift*.5,g.s*sw*.3,g.s*(.42-lift*.1));R3(g.kn,.95+lift*.45);R3(g.ft,.1)});
    P.arms.forEach((A,i)=>{R3(A.sh,-1.15+sh*.05,0,A.s*.55);R3(A.el,-2.35+sh*.12*(i?-1:1))});grip(P,0,'flat');grip(P,1,'flat')}},
  // Gangnam Style: four beats of galloping on an invisible horse with a lasso, then four beats of crossed arms and bent knees
  gangnam:{n:'Gangnam Style',loop:1,f(P,a,t){const b8=(t*2.133)%8,gal=b8<4,s2=Math.sin(a*2),G=P.arms[1],S=P.arms[0];
    if(gal){const hop=Math.abs(s2);
      HY(P,-.2+hop*.07);R3(P.spine,.12,0,Math.sin(a*2+1)*.05);R3(P.hips,0,0,0);R3(P.head,-.05,Math.sin(a)*.08,0);
      P.legs.forEach(g=>{const q=a*2+(g.s>0?0:PI),lf=Math.max(0,Math.sin(q));R3(g.hp,-.5-lf*.55,0,g.s*(.34-lf*.12));R3(g.kn,.95+lf*.55);R3(g.ft,.1)});
      R3(G.sh,-2.7,0,G.s*(.15+Math.cos(a*4)*.5));R3(G.el,-.35+Math.sin(a*4)*.15);grip(P,1,'bar');          // the lasso above the head
      hdReach(S,V1.set(.02,.17+s2*.04,.34));grip(P,0,'bar')}                                            // the reins
    else{const bob=Math.sin(a*2);
      HY(P,-.22+Math.abs(bob)*.05);R3(P.spine,.1+bob*.05,0,0);R3(P.hips,bob*.06,0,0);R3(P.head,-.06,0,0);
      P.legs.forEach(g=>{R3(g.hp,-.55,0,g.s*.28);R3(g.kn,1.05+Math.abs(bob)*.12);R3(g.ft,.1)});
      hdReach(G,V1.set(-.1,.23+bob*.015,.27));hdReach(S,V2.set(.11,.25+bob*.015,.3));grip(P,0,'flat');grip(P,1,'flat')}}},
  creep:{n:'Right Foot Creep',loop:1,f(P,a,t){const bt=t*2.133,b4=bt%4,st=Math.sin(a*.5);
    HY(P,-.11-.025*Math.sin(a*2));R3(P.spine,.2,st*.12,0);R3(P.hips,0,-st*.18,0);R3(P.head,.14,-st*.1,0);
    const rf=P.legs.find(g=>g.s<0),lf=P.legs.find(g=>g.s>0),tap=b4<1?Math.sin(PI*b4):0,cr=(b4>=1?Math.max(0,Math.sin(PI*((b4-1)/1.5))):0);
    R3(rf.hp,-.35-tap*.85-cr*.15,0,-.12-tap*.2);R3(rf.kn,.55+tap*.2+cr*.4);R3(rf.ft,tap*.4);
    R3(lf.hp,-.3,0,.1);R3(lf.kn,.75);R3(lf.ft,0);
    P.arms.forEach((A,i)=>{const ph=a*2+(i?PI:0);R3(A.sh,-.65+Math.sin(ph)*.3,0,A.s*.25);R3(A.el,-1.55+Math.cos(ph)*.25)});grip(P,0,'bar');grip(P,1,'bar')}},
  takel:{n:'Take the L',loop:1,f(P,a,t){const s=Math.sin(a*.5),m=Math.abs(Math.sin(a));
    HY(P,-.06-m*.02);R3(P.spine,.04,0,s*.14);R3(P.head,-.06,0,s*.1);R3(P.hips,0,0,-s*.06);
    P.arms.forEach(A=>{R3(A.sh,-2.55,0,A.s*.28);R3(A.el,-1.95)});grip(P,0,[0,.95,.95,.95,0]);grip(P,1,[0,.95,.95,.95,0]);
    P.legs.forEach(g=>{const q=a+(g.s>0?0:PI),lf=Math.max(0,Math.sin(q));R3(g.hp,-.12-lf*.35,0,g.s*.1);R3(g.kn,.25+lf*.5);R3(g.ft,0)})}},
  wave:{n:'Wave',loop:0,dur:3.2,f(P,a,t){const G=P.arms[1],S=P.arms[0],w=Math.sin(a*2.4);
    R3(G.sh,-2.75,0,.55+w*.28);R3(G.el,-.45+w*.1);grip(P,1,'flat');R3(S.sh,-.05,0,-.12);R3(S.el,-.2);R3(P.head,-.04,.12,.1);R3(P.spine,0,0,-.04);
    P.legs.forEach(g=>{R3(g.hp,0,0,g.s*.05)})}},
  orange:{n:'Orange Justice',loop:1,f(P,a,t){const s=Math.sin(a*1.5);
    HY(P,-.08+Math.abs(s)*.03);R3(P.spine,.06,s*.3,0);R3(P.hips,0,-s*.4,0);R3(P.head,0,s*.1,0);
    P.arms.forEach((A,i)=>{const ph=a*1.5+(i?PI:0);R3(A.sh,-1.5+Math.cos(ph)*1.35,0,A.s*(.45+Math.sin(ph)*.4));R3(A.el,-.9+Math.sin(ph)*.5)});
    P.legs.forEach(g=>{const q=a*1.5+(g.s>0?0:PI),k=Math.max(0,Math.sin(q));R3(g.hp,-.2-k*.75,g.s*s*.5,g.s*.12);R3(g.kn,.35+k*.9);R3(g.ft,0)})}},
  dab:{n:'Dab',loop:0,dur:2.2,f(P,a,t){const G=P.arms[1],S=P.arms[0];
    HY(P,-.04);R3(P.spine,.1,.25,-.18);R3(P.head,.45,.3,.3);
    R3(G.sh,-2.25,0,G.s*.5);R3(G.el,-.04);grip(P,1,'flat');R3(S.sh,-1.95,0,-S.s*.45);R3(S.el,-2.35);grip(P,0,'bar');
    P.legs.forEach(g=>{R3(g.hp,-.1,0,g.s*.12);R3(g.kn,.2)})}}
};
const IDS=Object.keys(EM);

// ---------------------------------------------------------------- weapon classes
// r0 ready (running), r1 aimed: weapon-arm hand target in the spine's space (x sideways, y up from the hip joint, z forward);
// f: where the support hand goes relative to that hand (spine space, z = along the barrel)
const CLS={
  pistol :{r0:[.17,.17,.30],r1:[.115,.40,.42],f:[-.03,-.02,.035],fd:0},
  smg    :{r0:[.17,.17,.28],r1:[.105,.385,.40],f:[-.02,-.035,0],fd:.2},
  rifle  :{r0:[.18,.15,.25],r1:[.10,.375,.36],f:[-.02,-.04,0],fd:.34},
  shotgun:{r0:[.18,.15,.25],r1:[.10,.38,.36],f:[-.02,-.04,0],fd:.30},
  sniper :{r0:[.18,.15,.25],r1:[.10,.385,.35],f:[-.02,-.045,0],fd:.40},
  dual   :{r0:[.19,.17,.30],r1:[.17,.38,.40],f:[0,0,0],fd:0},
  tube   :{legacy:1},melee:{legacy:1},pick:{legacy:1},bat:{legacy:1},hammer:{legacy:1}};
const hold0=[.22,-.02,.1];                                       // the hip, where the draw starts

function elQuat(A,out){out.setFromEuler(E1.set(A.sh.rotation.x,A.sh.rotation.y,A.sh.rotation.z,'XYZ'));Q2.setFromAxisAngle(VX,A.el.rotation.x);return out.multiply(Q2)}
// aim the held model along d (spine space) whatever the arm does, so the barrel always points where the camera looks
function aimModel(A,gw,d,roll){elQuat(A,Q1).invert();V3.copy(d).applyQuaternion(Q1);gw.quaternion.setFromUnitVectors(VZ,V3);
  if(roll){Q2.setFromAxisAngle(VZ,roll);gw.quaternion.multiply(Q2)}}

// a swung tool: the pickaxe (one hand, overhead, the swing alternates across the body and back out), the bat (flat sweep, alternating),
// the hammer (both hands, straight overhead smash). gs.pk counts the swing down 1 → 0, gs.dir flips with every new strike
function swing(P,gp,gs,dt,dr){
  const G=P.arms[1],S=P.arms[0],cls=gp.cls,sl=gp.slash||0;
  if(sl>(gs.psl||0)+.3){gs.dir=-(gs.dir||-1);gs.pk=1}
  gs.psl=sl;
  const dur=cls==='hammer'?.66:cls==='bat'?.42:.5;if(gs.pk>0)gs.pk=Math.max(0,gs.pk-dt/dur);
  const u=gs.pk>0?1-gs.pk:-1,d=gs.dir||1,sw=u>=0;
  // keyframes: ready → wind-up (to .32) → strike (to .58) → back to ready
  const K=(r,a,b)=>!sw?r:u<.32?lerp(r,a,ease(u/.32)):u<.58?lerp(a,b,ease((u-.32)/.26)):lerp(b,r,ease((u-.58)/.42));
  free(P);
  if(cls==='hammer'){
    G.sh.rotation.x=lerp(-.3,K(-1.15,-2.9,-.85),dr);G.sh.rotation.z=G.s*.12;G.el.rotation.x=lerp(-.4,K(-.9,-1.3,-.15),dr);
    S.sh.rotation.x=lerp(-.3,K(-1.1,-2.8,-.8),dr);S.sh.rotation.z=S.s*.12;S.el.rotation.x=lerp(-.4,K(-.9,-1.3,-.15),dr);
    P.spine.rotation.x+=K(.05,-.18,.38)*dr;HY(P,K(0,.02,-.1)*dr);grip(P,0,'bar');grip(P,1,'bar');return}
  if(cls==='bat'){
    const z0=d>0?1.35:-.5,z1=d>0?-.55:1.35;
    G.sh.rotation.x=lerp(-.3,K(-1.2,-1.55,-1.35),dr);G.sh.rotation.z=G.s*lerp(0,K(.2,z0,z1),dr);G.el.rotation.x=lerp(-.4,K(-.7,-.9,-.25),dr);
    P.spine.rotation.y+=K(0,-d*.55,d*.55)*dr;S.sh.rotation.x=lerp(-.2,-.35,dr);S.sh.rotation.z=S.s*.3*dr;S.el.rotation.x=-.5;grip(P,1,'bar');return}
  // pickaxe
  const zA=d>0?.95:-.3,zB=d>0?-.5:.95;
  G.sh.rotation.x=lerp(-.3,K(-.95,-2.75,-.75),dr);G.sh.rotation.z=G.s*lerp(0,K(.15,zA,zB),dr);G.el.rotation.x=lerp(-.4,K(-1,-1.45,-.25),dr);
  P.spine.rotation.y+=K(0,-d*.5,d*.5)*dr;P.spine.rotation.x+=K(0,-.1,.28)*dr;
  S.sh.rotation.x=lerp(-.2,K(-.35,-.7,-.5),dr);S.sh.rotation.z=S.s*lerp(0,K(.3,.5,.45),dr);S.el.rotation.x=-.6;grip(P,1,'bar')}

// the second pistol of a pair lives in the support hand (built from WEAPONS[w].bm2 the first time it is needed)
function pair(P,gp){
  const W=WEAPONS[gp.w];if(!W||!W.bm2||typeof BRM==='undefined')return null;
  if(P._gw2&&P._gw2.userData.src!==gp.w){P._gw2.parent&&P._gw2.parent.remove(P._gw2);P._gw2=null}
  if(!P._gw2){const g=new THREE.Group();BRM[W.bm2](g);const o=new THREE.Group();o.add(g);o.position.set(0,-.2,.04);o.userData.src=gp.w;o.userData.base=1;P.arms[0].el.add(o);P._gw2=o}   // aimModel replaces o's rotation, so the model sits un-rotated inside
  return P._gw2}
function unpair(P){if(P._gw2){P._gw2.parent&&P._gw2.parent.remove(P._gw2);P._gw2=null}}

function weapon(P,st,dt){
  let gp=P._gp;const gs=P._gs||(P._gs={t:0,rl:-1,rec:0,aim:0,w:-1,sw:0}),C=CLS[gp.cls||'pistol']||CLS.pistol,G=P.arms[1],S=P.arms[0],gw=P._gw;
  if(gs.w!==gp.w){gs.w=gp.w;gs.t=0}
  gs.t=Math.min(1,gs.t+dt/(gp.draw||.45));
  if(gs.rec>(gs.prec||0)+.3)gs.side=gs.side?0:1;gs.prec=gs.rec;                            // a pair of pistols: the shots alternate between the hands
  if(gs.rec>0)gs.rec=Math.max(0,gs.rec-dt*7);
  gs.aim+=((gp.aim?1:0)-gs.aim)*(1-Math.exp(-dt*9));
  const dr=ease(gs.t);
  if(P._sl>0){P._sl=Math.max(0,P._sl-dt*3.4);if(!gp.slash)gp=Object.assign({},gp,{slash:P._sl})}   // a friend's swing, seen through the shot counter
  if(C.legacy){                                               // katana (two hands, a sweeping strike), tools, and the shoulder tubes
    if(gp.cls==='pick'||gp.cls==='bat'||gp.cls==='hammer'){swing(P,gp,gs,dt,dr)}
    else if(gp.cls==='melee'){const sl=gp.slash||0,k=sl>0?Math.sin(PI*(1-sl)):0;
      G.sh.rotation.x=lerp(-.2,-1.15-1.1*k,dr);G.sh.rotation.z=sl>0?.9*Math.cos(PI*(1-sl)):0;G.el.rotation.x=lerp(-.4,-.35,dr);
      S.sh.rotation.x=lerp(-.2,-1.0-.6*k,dr);S.sh.rotation.z=.35*dr;S.el.rotation.x=lerp(-.4,-.6,dr);grip(P,0,'bar');grip(P,1,'bar')}
    else{G.sh.rotation.x=lerp(-.3,-1.42+(gs.rec||0)*.12,dr);G.sh.rotation.z=0;G.el.rotation.x=-.05;S.sh.rotation.x=lerp(-.3,-1.2,dr);S.sh.rotation.z=.25*dr;S.el.rotation.x=lerp(-.4,-.4,dr);grip(P,0,'bar');grip(P,1,'bar')}
    if(gw)gw.visible=true;return}
  // aim direction in the spine's space
  const ap=(gp.ap||0)+.1*gs.rec;
  Q1.copy(P.hips.quaternion).multiply(P.spine.quaternion).invert();
  const dd=V1.set(0,Math.sin(ap),Math.cos(ap)).applyQuaternion(Q1);
  const k=gs.aim,T=V2.set(lerp(C.r0[0],C.r1[0],k),lerp(C.r0[1],C.r1[1],k),lerp(C.r0[2],C.r1[2],k)),dual=gp.cls==='dual';
  T.x=lerp(hold0[0],T.x,dr);T.y=lerp(hold0[1],T.y,dr);const zb=lerp(hold0[2],T.z,dr);T.z=zb-(dual&&!gs.side?0:.045*gs.rec);
  const rl=gs.rl>=0&&gs.rl<1?gs.rl:-1;
  let roll=0;
  hdReach(G,T);
  // the support hand: on the fore-grip, or off to the belt and back while reloading (a pair of pistols: the mirror image of the first hand)
  const H=hdHandPos(G,V3),fore=dual?new THREE.Vector3(-T.x,T.y,zb-(gs.side?0:.045*gs.rec)):new THREE.Vector3(H.x+C.f[0]+dd.x*C.fd,H.y+C.f[1]+dd.y*C.fd,H.z+C.f[2]+dd.z*C.fd);
  let Tl=fore;
  if(rl>=0&&dual){const tilt=Math.sin(PI*clamp((rl-.2)/.65,0,1));roll=tilt*.55;dd.y-=tilt*.25;dd.normalize()}
  else if(rl>=0){const belt=new THREE.Vector3(-.06,.02,.16),mag=new THREE.Vector3(H.x-.02,H.y-.07,H.z+.05+C.fd*.25);
    if(rl<.25)Tl=fore.clone().lerp(belt,ease(rl/.25));else if(rl<.5)Tl=belt.clone().add(V1.set(0,Math.sin(rl*40)*.006,0));
    else if(rl<.8)Tl=belt.clone().lerp(mag,ease((rl-.5)/.3));else Tl=mag.clone().lerp(fore,ease((rl-.8)/.2));
    const tilt=Math.sin(PI*clamp((rl-.2)/.65,0,1));roll=tilt*.55;dd.y-=tilt*.25;dd.normalize()}
  hdReach(S,Tl);
  grip(P,1,'bar');grip(P,0,C.fd?'cup':'bar');
  P.spine.rotation.x+=-ap*.35;
  if(gw){gw.visible=true;aimModel(G,gw,dd,roll);const sc=gw.userData.base||1;gw.scale.setScalar(sc*(.55+.45*dr))}
  if(dual){const g2=pair(P,gp);if(g2){g2.visible=true;aimModel(S,g2,dd,-roll);g2.scale.setScalar(.55+.45*dr)}}
}

// ---------------------------------------------------------------- drinking (the jar goes to the mouth)
function drink(P,st,dt){const D=P.drk,S=P.arms[0],G=P.arms[1];D.t+=dt;const u=clamp(D.t/D.dur,0,1),up=ease(Math.min(1,u/.22)),dn=ease(Math.min(1,(1-u)/.16)),w=Math.min(up,dn);
  if(P._gw)P._gw.visible=false;
  const mouth=V1.set(0,.5,.15),chest=V2.set(-.05,.28,.22);hdReach(S,V3.copy(chest).lerp(mouth,w));
  R3(P.head,-.25*w,0,0);R3(P.spine,-.12*w,0,0);grip(P,0,'can');S.hand.rotation.set(0,0,0);
  R3(G.sh,-.2,0,G.s*.1);R3(G.el,-.5);
  if(D.jar){const fl=clamp(w*1.8,0,1);D.jar.rotation.x=PI*ease(fl)-.45*w;D.jar.position.y=-.2+.06*ease(fl);D.jar.visible=true;if(D.liq){const lv=1-clamp((u-.15)/.7,0,1);D.liq.scale.y=Math.max(.04,lv);D.liq.position.y=D.liq0*(.5+.5*lv)}}}

// ---------------------------------------------------------------- reaching down (loot, chests)
function reach(P,st,dt){const R=P.rch;R.t+=dt;const u=clamp(R.t/R.dur,0,1),w=Math.sin(PI*u),G=P.arms[1],S=P.arms[0];
  HY(P,-.2*w);R3(P.spine,.6*w,0,0);R3(P.head,-.3*w,0,0);
  P.legs.forEach(g=>{R3(g.hp,-.7*w,0,g.s*.1*w);R3(g.kn,1.3*w);R3(g.ft,0)});
  hdReach(G,V1.set(.12,lerp(.1,-.62,w),lerp(.2,.5,w)));hdReach(S,V1.set(-.12,lerp(.1,-.55,w),lerp(.2,.45,w)));
  if(P._gw)P._gw.visible=w<.2}

// ---------------------------------------------------------------- skydiving
function sky(P,st,dt){const w=P.sky===1;P.hips.position.y=P.hipY;
  if(w){P.arms.forEach(A=>{R3(A.sh,-.25,0,A.s*1.25);R3(A.el,-.55)});P.legs.forEach(g=>{R3(g.hp,.35,0,g.s*.28);R3(g.kn,.15);R3(g.ft,.5)});R3(P.head,-.9,0,0);R3(P.spine,-.25,0,0)}
  else{P.arms.forEach(A=>{R3(A.sh,-2.9,0,A.s*.22);R3(A.el,-.5)});grip(P,0,'bar');grip(P,1,'bar');P.legs.forEach(g=>{R3(g.hp,-.25,0,g.s*.06);R3(g.kn,.55);R3(g.ft,.3)})}}

// ---------------------------------------------------------------- the layer
function layer(P,st,dt){
  if(!(dt>0))return;
  const m=st&&st.mode;if(m==='drive'||m==='suv'||m==='bike'||m==='sit'||m==='scoot')return;
  if(P._gw2){if(P._gp&&P._gp.cls==='dual')P._gw2.visible=!(P.emo||P.drk||P.rch||P.sky);else unpair(P)}
  if(P.sky){W=1;sky(P,st,dt);return}
  const E=P.emo;
  if(E){E.t+=dt;const def=EM[E.id];
    if(!def||(!def.loop&&E.t>def.dur+.25)||E.t>14||(P===PLR&&(st.spd||0)>1.2)){POSE.stop(P)}
    else{const fi=ease(E.t/.2),fo=def.loop?1:ease((def.dur+.25-E.t)/.25);W=Math.min(fi,fo);
      P.can.visible=false;if(P._gw)P._gw.visible=false;def.f(P,E.t*2*PI*1.0667,E.t);W=1;return}}
  if(P.drk){W=1;if(P.drk.t>=P.drk.dur){POSE.endDrink(P)}else{drink(P,st,dt);return}}
  if(P.rch){W=1;if(P.rch.t>=P.rch.dur||(st.spd||0)>1.1){P.rch=null}else{reach(P,st,dt);return}}   // no bowing while running over loot
  if(P._gp){W=1;weapon(P,st,dt)}
}

// ---------------------------------------------------------------- a tiny beat under an emote
let ac=null,beatT=0,beatOn=false;
function beat(on){beatOn=on;beatT=0}
function beatTick(dt){if(!beatOn)return;try{ac=ac||(typeof GUN!=='undefined'&&GUN.ac)||new (window.AudioContext||window.webkitAudioContext)();if(typeof GUN!=='undefined')GUN.ac=ac;if(ac.state==='suspended')ac.resume();
  const T=ac.currentTime;beatT-=dt;if(beatT>0)return;beatT=60/128/2;POSE._b=(POSE._b||0)+1;const n=POSE._b%2;
  const o=ac.createOscillator(),g=ac.createGain();o.type='sine';if(n===0){o.frequency.setValueAtTime(150,T);o.frequency.exponentialRampToValueAtTime(42,T+.13);g.gain.setValueAtTime(.28,T)}else{o.type='triangle';o.frequency.setValueAtTime(900,T);g.gain.setValueAtTime(.05,T)}
  g.gain.exponentialRampToValueAtTime(.001,T+.15);o.connect(g);g.connect(ac.destination);o.start(T);o.stop(T+.17)}catch(e){}}

// ---------------------------------------------------------------- the wheel
let wheel=null,wOpen=false;
function buildWheel(){
  const css=document.createElement('style');css.textContent=`
#emoW{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:rgba(0,0,0,.45);touch-action:none}
#emoW[hidden]{display:none}
#emoW .ring{position:relative;width:min(92vmin,470px);height:min(92vmin,470px)}
#emoW .ring::before{content:'EMOTES';position:absolute;inset:0;display:grid;place-items:center;font:800 13px var(--f-disp,system-ui);letter-spacing:.3em;color:var(--sun,#f2c14e)}
#emoW button{position:absolute;left:50%;top:50%;width:min(26vmin,112px);margin:calc(min(26vmin,112px)*-.2) 0 0 calc(min(26vmin,112px)*-.5);padding:11px 8px;border:0;border-left:4px solid var(--sun,#f2c14e);border-radius:0;background:rgba(0,0,0,.72);color:#e9e6dc;font:700 10.5px/1.15 var(--f-disp,system-ui);letter-spacing:.06em;text-transform:uppercase;clip-path:polygon(0 0,100% 0,calc(100% - 9px) 100%,0 100%);transform:rotate(var(--a)) translateY(calc(min(92vmin,470px)*-.4)) rotate(calc(var(--a)*-1))}
#emoW button:active,#emoW button.on{background:var(--sun,#f2c14e);color:#111;border-left-color:#fff}
@media (hover:hover){#emoW button:hover{background:#fff;color:#0a0a0a}}
@media (max-width:560px),(max-height:520px){#emoW .ring{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:min(92vw,380px);height:auto}
#emoW .ring::before{position:static;grid-column:1/-1;padding:4px 0 8px}
#emoW button{position:relative;left:auto;top:auto;margin:0;width:auto;padding:13px 10px;font-size:11px;transform:none}}`;
  document.head.appendChild(css);
  wheel=document.createElement('div');wheel.id='emoW';wheel.hidden=true;const ring=document.createElement('div');ring.className='ring';wheel.appendChild(ring);
  IDS.forEach((id,i)=>{const b=document.createElement('button');b.textContent=EM[id].n;b.style.setProperty('--a',(i*360/IDS.length)+'deg');b.onclick=e=>{e.stopPropagation();POSE.wheel(false);POSE.emote(PLR,id,true)};ring.appendChild(b)});
  wheel.addEventListener('pointerdown',e=>{if(e.target===wheel)POSE.wheel(false)});document.body.appendChild(wheel);
  addEventListener('keydown',e=>{if(typeof started==='undefined'||!started)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;
    if(e.code==='KeyX'&&!e.repeat){e.preventDefault();POSE.wheel()}else if(e.code==='Escape'&&wOpen){e.stopImmediatePropagation();POSE.wheel(false)}
    else if(wOpen&&/^Digit[0-9]$/.test(e.code)){e.stopImmediatePropagation();const n=+e.code.slice(5),id=IDS[n===0?9:n-1];if(!id)return;POSE.wheel(false);POSE.emote(PLR,id,true)}},true);
}

const POSE={EM,IDS,CLS,layer,
  emote(P,id,mine){if(!P||!EM[id])return;if(P.sky)return;P.emo={id,t:0};P.drk=null;P.rch=null;if(mine&&P===PLR){beat(true);POSE.cur=id;try{COOP.push(true)}catch(e){}}},
  stop(P){if(!P||!P.emo)return;P.emo=null;free(P);if(P.can&&P===PLR)P.can.visible=true;if(P===PLR){beat(false);POSE.cur=null;try{COOP.push(true)}catch(e){}}},
  startDrink(P,dur,jar,liq,liq0){P.emo=null;P.rch=null;P.drk={t:0,dur,jar,liq,liq0};if(P.can)P.can.visible=false},
  endDrink(P){if(!P.drk)return;const d=P.drk;P.drk=null;if(d.jar&&d.jar.parent)d.jar.parent.remove(d.jar);free(P);if(P._gw)P._gw.visible=true},
  reachDown(P,dur){if(P.emo)return;P.rch={t:0,dur:dur||.6}},
  wheel(on){if(!wheel)buildWheel();wOpen=on===undefined?!wOpen:!!on;wheel.hidden=!wOpen},
  tick(dt){beatTick(dt)},cur:null};
return POSE})();
