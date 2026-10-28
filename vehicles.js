/* ===================================================================================================
   vehicles.js — drivable G-Wagon, Lamborghini, bicycle and submarine for My Odesa
   Loaded BEFORE the main script (it only touches game globals at call time).

   • LiteVehicle   the vehicle itself: detailed model, grip/drift physics, suspension, lights, seats
   • PeerLite      a friend's vehicle drawn from network snapshots (co-op)
   • seatPose      driver / passenger / cyclist poses for the player avatar (called from animPlayer)
   • LVSND         engine sound with a virtual gearbox
   =================================================================================================== */

// Seats are given as where the avatar's root (its feet-level origin) sits in the vehicle's local frame:
// +x = driver's left, +z = forward. The pose says how the avatar folds into the seat.
const LV_SEATS={
  lambo:[{p:[.34,.17,.02],pose:'drive'},{p:[-.34,.17,.02],pose:'drive'}],
  gwagon:[{p:[.42,.4,.36],pose:'suv'},{p:[-.42,.4,.36],pose:'suv'},{p:[.42,.4,-.62],pose:'suv'},{p:[-.42,.4,-.62],pose:'suv'}],
  bike:[{p:[0,.72,-.36],pose:'bike'}],
  sub:[]};
const LV_NAMES=['gwagon','lambo','bike','sub'];
function lvGround(x,z){const g=groundH(x,z);return typeof groundAt==='function'?groundAt(x,z,g+1.5):g}
const LAMBO_COLS=[0xf2c200,0x7ec40a,0xff6a13,0xc4161c,0x1b4bd1];   // Giallo Orion, Verde Mantis, Arancio Argos, Rosso Mars, Blu Cepheus

// ---------- avatar poses ----------
function seatPose(P,st,dt){
  P.scooter.visible=false;P.head.rotation.set(0,0,0);const steer=st.steer||0;
  if(st.mode==='drive'){            // low reclined sports seat
    P.hips.position.y=.34;P.spine.rotation.x=-.46;P.head.rotation.x=.4;
    for(const g of P.legs){g.hp.rotation.x=-1.36;g.kn.rotation.x=.62;g.ft.rotation.x=.25}
    for(const A of P.arms){if(st.role==='driver'){A.sh.rotation.x=-1.2;A.sh.rotation.z=A.s*-.12+steer*.2;A.el.rotation.x=-.55}else{A.sh.rotation.x=-.5;A.sh.rotation.z=A.s*-.1;A.el.rotation.x=-1.15}}
    P.idle+=dt;return}
  if(st.mode==='suv'){              // upright SUV seat
    P.hips.position.y=.55;P.spine.rotation.x=-.06;
    for(const g of P.legs){g.hp.rotation.x=-1.5;g.kn.rotation.x=1.45;g.ft.rotation.x=0}
    for(const A of P.arms){if(st.role==='driver'){A.sh.rotation.x=-1.0;A.sh.rotation.z=A.s*-.12+steer*.25;A.el.rotation.x=-.45}else{A.sh.rotation.x=-.35;A.sh.rotation.z=A.s*-.08;A.el.rotation.x=-.9}}
    P.idle+=dt;return}
  if(st.mode==='bike'){             // leaning on the bars, legs follow the cranks
    const c=st.crank||0;P.hips.position.y=.16;P.spine.rotation.x=.52;P.head.rotation.x=-.42;
    for(const g of P.legs){const k=Math.cos(c+(g.s>0?0:Math.PI));g.hp.rotation.x=-1.12-.42*k;g.kn.rotation.x=1.12+.78*k;g.ft.rotation.x=-.25*k}
    for(const A of P.arms){A.sh.rotation.x=-1.12;A.sh.rotation.z=A.s*-.12+steer*.15;A.el.rotation.x=-.2}
    P.idle=0;return}
}

// ---------- engine sound ----------
const LVSND={g:null,kind:null,
  start(kind){if(typeof AUD==='undefined'||!AUD||!AUD.ok||kind==='bike'||kind==='sub')return;const a=AUD.ctx;
    if(!this.g){const o1=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o1.type='sawtooth';o2.type='square';f.type='lowpass';f.Q.value=3;g.gain.value=0;
      o1.connect(f);o2.connect(f);f.connect(g);g.connect(AUD.sfx);o1.start();o2.start();Object.assign(this,{o1,o2,f,g})}
    this.kind=kind;this.g.gain.setTargetAtTime(.04,a.currentTime,.2)},
  stop(){if(this.g&&AUD.ctx)this.g.gain.setTargetAtTime(0,AUD.ctx.currentTime,.15)},
  // a virtual gearbox: revs climb through each gear and drop on the shift
  update(v,thr){if(!this.g||!AUD.ctx||this.kind!==v.kind)return;const T=AUD.ctx.currentTime,lambo=v.kind==='lambo',gears=lambo?7:5,sp=Math.min(1,Math.abs(v.v)/v.spec.max);
    const gp=Math.min(gears-1e-3,sp*gears*1.1),rpm=.2+.8*(gp-Math.floor(gp)),load=Math.max(0,thr);
    const f=(lambo?58:36)+((lambo?340:170)-(lambo?58:36))*rpm*(.85+.15*load);
    this.o1.frequency.setTargetAtTime(f,T,.04);this.o2.frequency.setTargetAtTime(f*.5,T,.04);
    this.f.frequency.setTargetAtTime(260+rpm*(lambo?2600:1300)+load*700,T,.05);
    this.g.gain.setTargetAtTime((.03+load*.05+sp*.02)*(lambo?1.1:1),T,.06)}};

// ===================================================================================================
class LiteVehicle{
  constructor(kind,x,z,yaw,opt){
    this.kind=kind;this.spec=LV_SPECS[kind];this.x=x;this.z=z;this.yaw=yaw||0;this.v=0;this.vx=0;this.vz=0;this.vy=0;this.steerA=0;this.pitch=0;this.roll=0;this.pedal=0;this.dmg=0;this.cd=0;this.occupied=false;this.dead=false;
    this.suspP=0;this.suspR=0;this.vPrev=0;this.aLong=0;this.yawRate=0;this.brakeOn=false;this.colIdx=(opt&&opt.col!=null)?opt.col|0:-1;this.proxy=!!(opt&&opt.proxy);
    this.root=new THREE.Group();this.susp=new THREE.Group();this.body=new THREE.Group();this.root.add(this.susp);this.susp.add(this.body);this.root.userData.lv=this;
    this.wheels=[];this.cols=[];this.crank=null;this.prop=null;this.seats=LV_SEATS[kind]||[];this.tailMat=null;this.lampMat=null;
    this.y=kind==='sub'?SL-.25:lvGround(x,z);
    ({gwagon:()=>this.buildGWagon(),lambo:()=>this.buildLambo(),bike:()=>this.buildBike(),sub:()=>this.buildSub()})[kind]();
    this.sync();
  }
  // wheel: tyre, rim with spokes, brake disc and caliper (the caliper does not spin); front wheels steer around piv
  wheel(x,y,z,r,w,front,o){o=o||{};const piv=new THREE.Group();piv.position.set(x,y,z);const spin=new THREE.Group();piv.add(spin);const sg=x>=0?1:-1;
    const tyre=XM(0x101113,.93),rimM=XM(o.rim||0xb9bec6,.22,.92),dark=XM(0x26282c,.5,.7),cal=XM(o.caliper||0xc4161c,.4,.3);
    const cy=(par,rt,h,seg,px,mat)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rt,h,seg),mat);m.rotation.z=Math.PI/2;m.position.x=px;m.castShadow=true;par.add(m);return m};
    cy(spin,r,w,20,0,tyre);cy(spin,r*.66,w*1.02,20,sg*w*.02,rimM);cy(spin,r*.17,w*1.06,10,sg*w*.02,dark);
    for(let i=0;i<(o.spokes||5);i++)xb(spin,w*1.04,r*1.22,.06,0,0,0,rimM,i*Math.PI*2/(o.spokes||5),0,0).position.x=sg*w*.02;
    cy(piv,r*.5,.03,18,-sg*w*.12,dark);xb(piv,.06,r*.34,r*.42,-sg*w*.12,r*.26,0,cal);
    this.root.add(piv);this.wheels.push({piv,spin,r,front:!!front})}
  arch(x,y,z,r,w,mat){const t=new THREE.Mesh(new THREE.TorusGeometry(r+.05,.04,6,18,Math.PI),mat);t.rotation.y=Math.PI/2;t.position.set(x+(x>=0?1:-1)*w*.35,y,z);t.castShadow=true;this.body.add(t);return t}

  // ---------- Lamborghini: low wedge roadster with an open cockpit, so both seats are visible ----------
  buildLambo(opt){const B=this.body,ci=(this.colIdx>=0?this.colIdx:Math.floor(Math.random()*LAMBO_COLS.length))%LAMBO_COLS.length,col=LAMBO_COLS[ci];this.colIdx=ci;
    const paint=XM(col,.16,.7),carbon=XM(0x0c0d0f,.4,.55),blk=XM(0x17181b,.6,.3),leather=XM(0x1b1b1e,.55,.1),stitch=XM(0xc4161c,.6),
      glass=XM(0x0e1620,.04,.9,{transparent:true,opacity:.5}),metal=XM(0xb9bec6,.25,.95),
      lamp=XM(0xeaf6ff,.2,0,{emissive:0xcfeaff,emissiveIntensity:.6}),tail=XM(0x7a0a10,.4,0,{emissive:0xff1a22,emissiveIntensity:.6});
    this.lampMat=lamp;this.tailMat=tail;this.cols=[col,0x0c0d0f,0xb9bec6];
    // front end and hood (rises to the cowl), rear shoulders and engine cover; the cockpit is left open between them
    xloft(B,[[2.4,.72,.2,.46,.12],[2.1,.88,.18,.57,.15],[1.62,.99,.18,.77,.17],[1.1,1.02,.18,.81,.17],[.62,1.03,.18,.83,.17]],paint);
    xloft(B,[[-.86,1.03,.2,.88,.14],[-1.5,1.0,.22,.98,.16],[-2.0,.94,.24,.92,.16],[-2.4,.82,.28,.78,.12]],paint);
    xb(B,1.9,.08,1.5,0,.2,-.12,carbon);                                       // cockpit floor
    for(const s of [-1,1]){xb(B,.12,.52,1.52,s*.97,.46,-.12,paint);xb(B,.04,.4,1.5,s*.9,.5,-.12,leather);xb(B,.03,.07,1.52,s*1.03,.6,-.12,carbon)}   // door skins, trim, sill
    xb(B,1.74,.4,.05,0,1.0,.4,glass,-.78);xb(B,1.84,.05,.06,0,.82,.55,carbon);   // low raked windshield and its base
    for(const s of [-1,1]){xb(B,.06,.4,.06,s*.9,.99,.42,carbon,-.78)}
    // seats, dash, wheel
    for(const s of [-1,1]){const x=s*.34;xb(B,.5,.12,.56,x,.34,-.04,leather);xb(B,.5,.66,.12,x,.62,-.36,leather,-.34);xb(B,.34,.2,.1,x,1.0,-.5,leather,-.34);xb(B,.44,.02,.02,x,.42,-.04,stitch);xb(B,.06,.52,.1,x-s*.2,.62,-.34,leather,-.34);xb(B,.06,.52,.1,x+s*.2,.62,-.34,leather,-.34)}
    xb(B,1.72,.16,.34,0,.74,.4,leather);xb(B,.34,.1,.18,0,.8,.34,blk);
    {const sw=new THREE.Mesh(new THREE.TorusGeometry(.16,.02,6,16),blk);sw.position.set(.34,.84,.2);sw.rotation.x=-.95;B.add(sw);xb(B,.03,.03,.3,.34,.76,.3,blk,-.4)}
    // rear: roll hoops, deck slats, diffuser, lip spoiler, hex tail lights, three exhausts
    for(const s of [-1,1]){xb(B,.14,.5,.12,s*.46,1.02,-.78,carbon,-.3);xb(B,.05,.3,.5,s*1.02,.9,-1.02,carbon)}   // hoops, side intakes
    xb(B,1.12,.1,.14,0,1.12,-.8,carbon);
    for(let i=0;i<5;i++)xb(B,1.1,.025,.07,0,.975+i*.012,-1.2-i*.19,carbon);
    xb(B,1.7,.04,.3,0,.9,-2.3,paint,.12);xb(B,1.3,.22,.34,0,.32,-2.3,carbon);
    for(const s of [-1,1]){xb(B,.52,.1,.05,s*.52,.8,-2.4,tail);xb(B,.2,.14,.05,s*.18,.62,-2.4,tail)}
    for(const x of [-.2,0,.2]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.2,10),metal);e.rotation.x=Math.PI/2;e.position.set(x,.36,-2.42);B.add(e)}
    // front: splitter, intakes, Y-shaped daytime lights
    xb(B,1.6,.04,.3,0,.19,2.25,carbon);for(const s of [-1,1]){xb(B,.5,.14,.05,s*.44,.34,2.4,carbon);xb(B,.46,.04,.06,s*.58,.5,2.35,lamp,0,0,s*.22);xb(B,.3,.04,.06,s*.4,.46,2.38,lamp,0,0,-s*.5)}
    xb(B,.34,.16,.05,0,.4,2.42,carbon);
    for(const s of [-1,1]){xb(B,.09,.07,.18,s*1.12,.84,.5,paint)}   // mirrors
    for(const [z,r,w,f] of [[1.42,.33,.27,1],[-1.36,.36,.35,0]])for(const sx of [-1,1]){this.wheel(sx*(f?.93:.95),r,z,r,w,f,{rim:0xc4c8d0,spokes:f?5:5});this.arch(sx*.92,r+.01,z,r,w,paint)}}

  // ---------- G-Wagon: boxy body with a real glass cabin (avatars are visible inside) ----------
  buildGWagon(){const B=this.body,paint=XM(0x07080a,.14,.88),paint2=XM(0x16171a,.5,.5),trim=XM(0x1b1c1f,.65,.3),chrome=XM(0xc9ccd2,.18,1),
      glass=XM(0x101a24,.04,.9,{transparent:true,opacity:.42}),leather=XM(0x2a2623,.7,.1),
      lamp=XM(0xfff3c0,.25,0,{emissive:0xffe9a0,emissiveIntensity:.8}),tail=XM(0x8a0f12,.4,0,{emissive:0xc01018,emissiveIntensity:.6}),amber=XM(0xff9a1a,.4,0,{emissive:0xff8a00,emissiveIntensity:.5});
    this.lampMat=lamp;this.tailMat=tail;this.cols=[0x07080a,0x16171a,0xc9ccd2];
    // tub: the lower body, rounded on every edge
    xloft(B,[[2.3,.9,.5,1.22,.18],[2.12,.97,.46,1.34,.2],[1.3,.98,.42,1.38,.18],[-1.3,.98,.42,1.38,.12],[-2.12,.97,.44,1.34,.12],[-2.3,.9,.5,1.26,.16]],paint);
    // cabin: roof slab, pillars and glass panes
    xb(B,1.86,.09,2.5,0,2.1,-.35,paint);
    for(const s of [-1,1]){xb(B,.07,.74,.1,s*.9,1.74,.86,paint,-.3);xb(B,.08,.76,.1,s*.93,1.74,-.18,paint);xb(B,.08,.76,.1,s*.94,1.74,-1.56,paint);
      xb(B,.05,.66,.95,s*.94,1.72,.34,glass);xb(B,.05,.62,1.2,s*.94,1.72,-.9,glass);xb(B,.18,.06,2.5,s*.9,1.37,-.35,trim)}
    xb(B,1.74,.74,.05,0,1.74,1.0,glass,-.27);xb(B,1.74,.7,.05,0,1.74,-1.82,glass);
    // interior: dash, two rows of seats, wheel
    xb(B,1.7,.2,.4,0,1.24,.6,leather);
    for(const s of [-1,1])for(const z of [.36,-.62]){xb(B,.52,.16,.55,s*.42,.76,z,leather);xb(B,.52,.72,.12,s*.42,1.1,z-.3,leather,-.1)}
    {const sw=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,6,16),trim);sw.position.set(.42,1.32,.2);sw.rotation.x=-1.0;B.add(sw)}
    xb(B,1.86,.05,2.2,0,.5,-.1,trim);                                        // cabin floor
    // hood details, grille, lights
    xb(B,1.2,.04,.8,0,1.4,1.55,paint2);
    xb(B,1.0,.44,.05,0,1.0,2.33,trim);for(const x of [-.3,0,.3])xb(B,.04,.4,.06,x,1.0,2.36,chrome);{const star=new THREE.Mesh(new THREE.TorusGeometry(.09,.012,6,18),chrome);star.position.set(0,1.0,2.38);B.add(star)}
    for(const s of [-1,1]){const h=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.08,16),lamp);h.rotation.x=Math.PI/2;h.position.set(s*.72,1.14,2.3);B.add(h);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.02,6,18),chrome);ring.position.set(s*.72,1.14,2.34);B.add(ring);
      xb(B,.18,.07,.12,s*.94,1.34,2.2,amber);                               // fender indicators
      xb(B,.3,.2,.06,s*.78,1.0,-2.34,tail);   // tail lamps
      xb(B,.1,.07,.1,s*1.05,1.8,.78,paint);xb(B,.05,.18,.12,s*1.1,1.82,.78,glass)}   // mirrors
    xb(B,2.04,.3,.24,0,.52,2.32,trim);xb(B,2.04,.3,.24,0,.52,-2.32,trim);       // bumpers
    xb(B,1.1,.08,.3,0,.4,2.4,paint2);
    // sides: running boards, door handles, door lines, black arch flares
    for(const s of [-1,1]){xb(B,.2,.07,2.3,s*1.02,.48,-.1,trim);for(const z of [.5,-.75])xb(B,.03,.05,.22,s*.995,1.26,z,chrome);for(const z of [-.2,-1.45])xb(B,.02,.74,.02,s*.99,.9,z,paint2)}
    // tailgate: spare wheel, tail details, roof rack with LED bar
    {const sp=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.24,16),XM(0x0d0e10,.9));sp.rotation.x=Math.PI/2;sp.position.set(0,1.36,-2.46);sp.castShadow=true;B.add(sp);
     const cv=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.26,16),paint2);cv.rotation.x=Math.PI/2;cv.position.set(0,1.36,-2.47);B.add(cv)}
    for(const z of [-1.2,.1])xb(B,1.7,.04,.05,0,2.2,z,trim);for(const x of [-.82,.82])xb(B,.04,.05,1.5,x,2.2,-.55,trim);
    xb(B,1.0,.07,.12,0,2.24,.7,lamp);
    for(const s of [-.3,.3]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.4,10),chrome);e.rotation.z=Math.PI/2;e.position.set(s*3.4,.36,-1.0);B.add(e)}   // side exhausts
    for(const [z,f] of [[1.45,1],[-1.45,0]])for(const sx of [-1,1]){this.wheel(sx*.95,.4,z,.4,.32,f,{rim:0xc9ccd2,caliper:0xc4161c,spokes:6});
      const t=new THREE.Mesh(new THREE.TorusGeometry(.46,.06,6,18,Math.PI),trim);t.rotation.y=Math.PI/2;t.position.set(sx*1.0,.4,z);B.add(t)}}

  // ---------- bicycle: diamond frame, fork, bars, saddle, chain, mudguards, rack and lamp ----------
  buildBike(){const B=this.body,fr=XM(0xd8302a,.35,.6),dk=XM(0x16171a,.6,.3),tyre=XM(0x0e0f10,.92),ch=XM(0xc9ccd2,.22,.92),lea=XM(0x3a2a1e,.7,.05),lamp=XM(0xfff3c0,.25,0,{emissive:0xffe9a0,emissiveIntensity:.5}),red=XM(0xc01018,.4,0,{emissive:0xc01018,emissiveIntensity:.4}),R=.32;
    this.cols=[0xd8302a,0x16171a,0xc9ccd2];this.lampMat=lamp;this.tailMat=red;
    // sized for the avatar (legs ~0.7 m): bottom bracket .29, saddle .78, bars .95
    const bb=[0,.29,-.04],seat=[0,.7,-.32],head=[0,.8,.46];
    xbar(B,bb,head,.05,fr);xbar(B,seat,[0,.78,.44],.04,fr);xbar(B,bb,seat,.045,fr);                                   // down tube, top tube, seat tube
    for(const s of [-1,1]){xbar(B,bb,[s*.05,R,-.52],.028,fr);xbar(B,seat,[s*.05,R,-.52],.024,fr)}                    // chain stays and seat stays
    xbar(B,seat,[0,.8,-.34],.028,ch);xb(B,.13,.05,.3,0,.82,-.33,lea);xb(B,.07,.045,.15,0,.815,-.16,lea);               // seat post, saddle
    const mk=()=>{const piv=new THREE.Group(),spin=new THREE.Group();piv.add(spin);const t=new THREE.Mesh(new THREE.TorusGeometry(R,.028,6,24),tyre);t.rotation.y=Math.PI/2;t.castShadow=true;spin.add(t);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(R-.035,.011,6,24),ch);rim.rotation.y=Math.PI/2;spin.add(rim);
      for(let i=0;i<8;i++)xb(spin,.008,R*1.86,.008,0,0,0,ch,i*Math.PI/8,0,0);xb(spin,.07,.05,.05,0,0,0,dk);return {piv,spin}};
    const rw=mk();rw.piv.position.set(0,R,-.52);this.root.add(rw.piv);this.wheels.push({piv:rw.piv,spin:rw.spin,r:R,front:false,bike:true});
    const fk=new THREE.Group();fk.position.set(0,.8,.46);this.root.add(fk);                                           // steering column pivot
    xb(fk,.035,.56,.035,.06,-.26,.02,dk);xb(fk,.035,.56,.035,-.06,-.26,.02,dk);xb(fk,.14,.03,.04,0,0,0,dk);xb(fk,.04,.16,.04,0,.08,0,dk);   // fork legs, crown, stem
    xb(fk,.6,.03,.03,0,.16,0,dk);for(const s of [-1,1]){xb(fk,.04,.05,.13,s*.3,.16,.01,lea);xb(fk,.02,.02,.1,s*.26,.19,.06,ch)}        // bars, grips, brake levers
    xb(fk,.13,.1,.1,0,.07,.14,lamp);xb(fk,.02,.1,.02,.26,.19,.0,ch);                                                 // headlamp, bell
    const fw=mk();fw.piv.position.set(0,R-.8,.06);fk.add(fw.piv);this.wheels.push({piv:fk,spin:fw.spin,r:R,front:true,bike:true});
    xb(B,.1,.02,.55,0,R*2+.03,-.52,fr);                                                                                // rear mudguard
    xb(B,.2,.03,.34,0,.62,-.68,dk);xb(B,.05,.05,.07,0,.64,-.86,red);                                                  // rear rack, tail light
    this.crank=new THREE.Group();this.crank.position.set(0,.29,-.04);this.root.add(this.crank);
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.02,16),ch);ring.rotation.z=Math.PI/2;ring.position.x=.05;this.crank.add(ring);
    for(const s of [1,-1]){xb(this.crank,.03,.33,.03,.09*s,0,0,dk);xb(this.crank,.1,.03,.08,.14*s,.165*s,0,dk)}}
  buildSub(){const B=this.body,hull=XM(0xf2c21b,.4,.35),dk=XM(0x23303a,.5,.4),win=XM(0x66d9ff,.1,.2,{emissive:0x33b8e8,emissiveIntensity:1});this.cols=[0xf2c21b,0x23303a,0x66d9ff];
    xb(B,1.8,1.5,4.4,0,0,0,hull);xb(B,1.4,1.2,.9,0,0,2.6,hull);xb(B,1.0,.85,.6,0,0,3.2,dk);xb(B,1.4,1.2,.8,0,0,-2.55,hull);xb(B,.9,.8,.6,0,0,-3.1,dk);
    xb(B,.7,.8,1.4,0,1.05,.2,hull);xb(B,.06,.55,.06,0,1.7,.4,dk);xb(B,.06,.06,.3,0,1.95,.52,dk);xb(B,1.84,.12,3.2,0,.1,.3,dk);
    xb(B,.08,1.5,.8,0,.2,-2.9,dk);xb(B,2.7,.08,.7,0,0,-2.9,dk);
    for(const s of [-1,1])for(const z of [1.4,.5,-.4])xb(B,.05,.36,.36,s*.92,.15,z,win);
    this.prop=new THREE.Group();this.prop.position.set(0,0,-3.5);B.add(this.prop);
    for(let i=0;i<3;i++){const b=xb(this.prop,.12,.9,.05,0,0,0,dk);b.geometry.translate(0,.45,0);b.position.set(0,0,0);b.rotation.z=i*Math.PI*2/3}}

  sync(){this.root.position.set(this.x,this.y,this.z);this.root.rotation.set(this.pitch,this.yaw,this.roll,'YXZ')}
  halt(){this.v=0;this.vx=this.vz=0;this.steerA=0;this.brakeOn=false}
  // where seat i is in the world (root origin of the seated avatar) and which way it faces
  seatWorld(i,out,quat){const s=this.seats[i]||this.seats[0];this.root.updateMatrixWorld(true);out.set(s.p[0],s.p[1],s.p[2]).applyMatrix4(this.susp.matrixWorld);if(quat)this.susp.getWorldQuaternion(quat);return out}
  seatPose(i){return (this.seats[i]||this.seats[0]||{}).pose||'sit'}

  // ---------- physics ----------
  // Velocity is kept as a world vector and split each step into forward and sideways parts: the engine and brakes act forwards,
  // tyre grip bleeds the sideways part (handbrake releases it), so power slides and handbrake turns come out naturally.
  step(dt,thr,str,brk,up,sprint){const s=this.spec;if(this.cd>0)this.cd-=dt;dt=Math.min(dt,.05);
    if(this.kind==='sub')return this.stepSub(dt,thr,str,up);
    const bike=this.kind==='bike',mv=s.max*(bike&&sprint?1.35:1),acc=s.acc*(bike&&sprint?1.5:1);
    const fx=Math.sin(this.yaw),fz=Math.cos(this.yaw),lx=Math.cos(this.yaw),lz=-Math.sin(this.yaw);
    let vf=this.vx*fx+this.vz*fz,vl=this.vx*lx+this.vz*lz;const sp=Math.abs(vf);
    let a=0;this.brakeOn=false;
    if(thr>0){if(vf<-.8){a=s.brake*thr;this.brakeOn=true}else a=acc*thr*Math.max(.08,1-Math.pow(Math.max(vf,0)/mv,1.7))}       // power falls off towards top speed
    else if(thr<0){if(vf>.8){a=-s.brake*-thr;this.brakeOn=true}else a=-acc*.6*-thr*Math.max(0,1-(-vf)/(mv*.3))}                 // S brakes first, then reverses
    else{const rr=bike?.3+.025*sp:.5+.0007*sp*sp;a=-Math.sign(vf)*Math.min(sp/Math.max(dt,1e-3),rr)}                           // coasting: rolling + air drag
    a+=9.8*Math.sin(this.pitch)*(bike?.85:.4);                                                                                  // downhill pulls, uphill slows
    if(brk){a-=Math.sign(vf)*Math.min(sp/Math.max(dt,1e-3),s.brake*(bike?.7:.5));this.brakeOn=true}
    vf=Math.max(-mv*.3,Math.min(mv,vf+a*dt));
    const slide=Math.min(1,Math.abs(this.steerA)*sp*.012);
    vl*=Math.exp(-(brk?s.hgrip:s.grip*(1-.45*slide))*dt);
    this.vx=fx*vf+lx*vl;this.vz=fz*vf+lz*vl;
    // steering: the lock shrinks with speed to what the tyres can hold (lateral g limit); the handbrake lets it bite harder
    const aMax=s.lat*(brk?1.35:1),lim=Math.min(s.steer,Math.atan(aMax*s.wb/(vf*vf+1))),sa=str*lim;
    this.steerA+=(sa-this.steerA)*Math.min(1,dt*(Math.abs(sa)>=Math.abs(this.steerA)?9:13));
    this.yawRate=vf*Math.tan(this.steerA)/s.wb*(brk&&sp>5?1.25:1);
    this.yaw+=this.yawRate*dt;
    // move, sliding along walls instead of stopping dead; head-on hits and other vehicles hurt
    const spd=Math.hypot(this.vx,this.vz),nx=this.x+this.vx*dt,nz=this.z+this.vz*dt,sg=vf>=0?1:-1;
    const blk=(x,z)=>{const px=x+fx*s.len/2*sg,pz=z+fz*s.len/2*sg;if(insideAny(px,pz,s.r,this.y+.6)||insideAny(x,z,s.r,this.y+.6))return 1;return groundH(px,pz)<SL-.2?2:0};
    let hit=false,other=null,wet=false;
    if(spd>.05){const b0=blk(nx,nz);
      if(!b0){this.x=nx;this.z=nz}
      else if(!blk(nx,this.z)){this.x=nx;this.vz*=.35;this.scrape(spd)}
      else if(!blk(this.x,nz)){this.z=nz;this.vx*=.35;this.scrape(spd)}
      else if(b0===2)wet=true;else hit=true}
    // other vehicles: overlapping ones are pushed apart; only a real closing speed counts as a crash
    for(const o of EXT.veh){if(o===this||o.dead||o.kind==='sub'&&this.kind!=='sub')continue;const dx=this.x-o.x,dz=this.z-o.z,d=Math.hypot(dx,dz),min=s.r+o.spec.r+.7;
      if(d<min){const ux=dx/(d||1),uz=dz/(d||1),closing=-(this.vx*ux+this.vz*uz);this.x+=ux*(min-d)*.6;this.z+=uz*(min-d)*.6;if(closing>2&&!hit){hit=true;other=o}}}
    if(hit){this.crash(spd,fx*sg,fz*sg);if(other)other.crash(spd*.6,-fx*sg,-fz*sg);this.vx*=-.25;this.vz*=-.25}
    else if(wet){this.vx*=-.2;this.vz*=-.2}
    this.v=this.vx*Math.sin(this.yaw)+this.vz*Math.cos(this.yaw);
    // ride height and slope
    const hf=groundAt(this.x+fx*s.len*.4,this.z+fz*s.len*.4,this.y+.6),hb=groundAt(this.x-fx*s.len*.4,this.z-fz*s.len*.4,this.y+.6);
    this.y+=((hf+hb)/2-this.y)*Math.min(1,dt*14);this.pitch+=(-Math.atan((hf-hb)/(s.len*.8))-this.pitch)*Math.min(1,dt*8);
    const lean=bike?Math.max(-.5,Math.min(.5,-Math.atan(this.yawRate*this.v/9.8)*.95)):0;this.roll+=(lean-this.roll)*Math.min(1,dt*6);
    this.animate(dt);this.sync()}
  scrape(spd){if(spd>7&&this.cd<=0){this.cd=.3;crashSound(spd*.3)}this.vx*=.96;this.vz*=.96}
  stepSub(dt,thr,str,up){const s=this.spec;
    if(thr>0)this.v+=thr*s.acc*dt*(this.v<0?2:1);else if(thr<0)this.v+=thr*s.acc*dt*(this.v>0?2.2:.7);else this.v*=Math.exp(-dt*.45);
    this.v=Math.max(-s.max*.3,Math.min(s.max,this.v));
    const sa=str*s.steer/(1+Math.abs(this.v)*.07);this.steerA+=(sa-this.steerA)*Math.min(1,dt*8);
    this.yaw+=this.v*Math.tan(this.steerA)/s.wb*dt;
    const fx=Math.sin(this.yaw),fz=Math.cos(this.yaw),nx=this.x+fx*this.v*dt,nz=this.z+fz*this.v*dt,sg=this.v>=0?1:-1,px=nx+fx*s.len/2*sg,pz=nz+fz*s.len/2*sg;
    let block=false;if(Math.abs(this.v)>.05&&(groundH(px,pz)>this.y-1.0||groundH(nx,nz)>this.y-1.0))block=true;
    if(block)this.v*=-.2;else{this.x=nx;this.z=nz}
    const fl=Math.max(groundH(this.x,this.z)+1.1,SL-120),top=SL-.25;this.vy+=(up*3.5-this.vy)*Math.min(1,dt*3);this.y=Math.max(fl,Math.min(top,this.y+this.vy*dt));
    this.pitch+=(-this.vy*.06-this.pitch)*Math.min(1,dt*3);this.roll+=(-this.steerA*this.v*.03-this.roll)*Math.min(1,dt*3);
    if(this.y>=top-.05)this.y=top+Math.sin(UNI.uTime.value*1.3)*.06;
    this.prop.rotation.z+=dt*(2+Math.abs(this.v)*3);this.sync()}
  // wheels, suspension (nose dives under braking, rolls out of corners), brake lights and headlights
  animate(dt){
    if(this.kind==='bike'){this.pedal+=this.v*dt/(.36*2.2);if(this.crank)this.crank.rotation.x=this.pedal;for(const w of this.wheels){w.spin.rotation.x=this.pedal*2.2;if(w.front)w.piv.rotation.y=this.steerA*1.6}this.lights();return}
    for(const w of this.wheels){w.spin.rotation.x+=this.v*dt/w.r;if(w.front)w.piv.rotation.y=this.steerA}
    const al=(this.v-this.vPrev)/Math.max(dt,1e-3);this.vPrev=this.v;this.aLong+=(al-this.aLong)*Math.min(1,dt*6);
    const yr=this.v*Math.tan(this.steerA)/this.spec.wb,tp=Math.max(-.05,Math.min(.05,-this.aLong*.0032)),tr=Math.max(-.06,Math.min(.06,yr*this.v*.0016));
    this.suspP+=(tp-this.suspP)*Math.min(1,dt*7);this.suspR+=(tr-this.suspR)*Math.min(1,dt*7);this.susp.rotation.set(this.suspP,0,this.suspR);this.lights()}
  lights(){const n=UNI.uNight.value;if(this.tailMat)this.tailMat.emissiveIntensity=(this.brakeOn?2.6:.5)+n*.9;if(this.lampMat)this.lampMat.emissiveIntensity=.35+n*2.4}
  // crash damage: crumple the mesh along the impact and throw fragments
  crash(imp,dx,dz){if(imp<3||this.cd>0)return;this.cd=.45;crashSound(imp);const s=this.spec,k=Math.min(1,imp/22);this.dmg=Math.min(1,this.dmg+k*.35);
    const sc=this.body.scale;sc.z=Math.max(.72,sc.z-k*.07);sc.x=Math.min(1.1,sc.x+k*.012);sc.y=Math.max(.8,sc.y-k*.025);
    this.body.rotation.z+=(Math.random()-.5)*k*.06;this.body.rotation.x+=(Math.random()-.5)*k*.03;this.body.position.y=-.03*this.dmg;
    const cx=this.x+dx*s.len/2,cz=this.z+dz*s.len/2;EXT.shatter(cx,this.y+.8,cz,Math.round(6+k*16),this.cols,3+imp*.45,dx,dz);
    FX.init();FX.puff({x:cx,y:this.y+.9,z:cz,vx:-dx,vy:1.2,vz:-dz,s0:.6,s1:2.4+k*2,life:1.4,c0:[.8,.78,.72],c1:[.5,.5,.5],op:.55,add:false,drag:1.2,grow:1});
    if(this===EXT.cur){FX.shakeT=.35;FX.shakeA=Math.max(FX.shakeA,k*.25)}}
  repair(){this.dmg=0;this.body.scale.set(1,1,1);this.body.rotation.set(0,0,0);this.body.position.y=0}
  kill(){if(this.dead)return;this.dead=true;this.respawnAt=performance.now()+30000;FX.init();FX.explode(this.x,this.y+.8,this.z,7);EXT.fireball(this.x,this.y+.8,this.z,5);EXT.shatter(this.x,this.y+.8,this.z,28,this.cols,10,0,0);
    this.root.visible=false;this.halt();if(EXT.cur===this)EXT.leave(this,true)}
  revive(){this.dead=false;this.repair();this.x=this.home[0];this.z=this.home[1];this.yaw=this.home[2];this.y=this.kind==='sub'?SL-.25:lvGround(this.x,this.z);this.halt();this.root.visible=true;this.sync()}
}

// a friend's vehicle: drawn from network snapshots, with the same model and colour as the one they drive
class PeerLite{
  constructor(kind,col){this.kind=kind;this.v=new LiteVehicle(kind,0,0,0,{col,proxy:true});scene.add(this.v.root);this.net=new NetSnaps()}
  push(s){const a=s.xv;this.net.push({x:s.x,y:s.y,z:s.z,yaw:s.r||0,p:+a[1]||0,r:+a[2]||0,u:+a[3]||0,st:+a[4]||0})}
  update(dt){const q=this.net.update(dt);if(!q)return null;const v=this.v;v.x=q.x;v.y=q.y;v.z=q.z;v.yaw=q.yaw;v.pitch=q.p;v.roll=q.r;v.v=q.u;v.steerA=q.st;v.brakeOn=false;v.animate(dt);v.sync();return q}
  dispose(){scene.remove(this.v.root)}
}
