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
  bike:[{p:[0,.67,-.34],pose:'bike'},{p:[0,.55,-.76],pose:'bike2'}],   // the second seat is the rear rack: a friend rides pillion
  moto:[{p:[0,.5,-.4],pose:'moto'}],                                   // Ducati MotoGP seat: hips = root + .24 in the pose below
  gtr:[{p:[.37,.22,-.2],pose:'drive'},{p:[-.37,.22,-.2],pose:'drive'}],   // Nissan GT-R: driver on the left (+x) and one passenger
  p911:[{p:[.36,.22,-.42],pose:'drive'},{p:[-.36,.22,-.42],pose:'drive'}],   // Porsche 911 Turbo (1975): the cabin sits far back
  p918:[{p:[.33,.2,-.3],pose:'drive'},{p:[-.33,.2,-.3],pose:'drive'}],       // Porsche 918 Spyder
  db9:[{p:[-.37,.24,-.36],pose:'drive'},{p:[.37,.24,-.36],pose:'drive'}],    // Aston Martin DB9 is right-hand drive: the driver (first seat) is on -x
  sub:[{p:[0,-.4,-7.8],pose:'sit'},{p:[-.65,-.4,-6.8],pose:'sit'}]};   // pilot and co-op passenger inside the forward bridge
const LV_NAMES=['gwagon','lambo','bike','moto','sub','gtr','p911','p918','db9'];   // append only: the index goes over the network (co-op presence)
// real models (Sketchfab, see assets/CREDITS.md). Wheels are pivot nodes inside the GLB: [node name, steers, tyre radius]. The procedural body below is the fallback / placeholder until the file arrives
const LV_GLB={
  moto:{url:'assets/models/vehicles/ducati.glb',wheels:[['wheel_front',true,.292],['wheel_rear',false,.326]]},
  gtr:{url:'assets/models/vehicles/gtr.glb',wheels:[['wheel_fl',true,.34],['wheel_fr',true,.34],['wheel_rl',false,.34],['wheel_rr',false,.34]]},
  p911:{url:'assets/models/vehicles/p911.glb',wheels:[['wheel_fl',true,.315],['wheel_fr',true,.315],['wheel_rl',false,.315],['wheel_rr',false,.315]]},
  p918:{url:'assets/models/vehicles/p918.glb',wheels:[['wheel_fl',true,.35],['wheel_fr',true,.35],['wheel_rl',false,.365],['wheel_rr',false,.365]]},
  db9:{url:'assets/models/vehicles/db9.glb',wheels:[['wheel_fl',true,.335],['wheel_fr',true,.335],['wheel_rl',false,.335],['wheel_rr',false,.335]]}};
const LV_GLB_CACHE={};
function loadLvGLB(url){return LV_GLB_CACHE[url]||(LV_GLB_CACHE[url]=new Promise((res,rej)=>new THREE.GLTFLoader().load(url,res,undefined,rej)).catch(e=>{delete LV_GLB_CACHE[url];throw e}))}
const SUB_SURF=-.62;   // hull origin relative to the sea level when surfaced: the top of the hull and the sail stand out, the rest is under water
const SUB_MAXD=180;     // metres of depth, the sea floor stops it earlier
const SUB_CRUSH=150;
const SUB_MODEL_LENGTH=18,SUB_MODEL_SCALE=SUB_MODEL_LENGTH/15;
const SUB_FORWARD_Q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
let SUB_MODEL_LOAD=null;
function loadSubModel(){
  if(!SUB_MODEL_LOAD)SUB_MODEL_LOAD=new Promise((resolve,reject)=>new THREE.GLTFLoader().load('assets/models/cyclops_subnautica.glb',resolve,undefined,reject))
    .catch(e=>{SUB_MODEL_LOAD=null;throw e});
  return SUB_MODEL_LOAD.then(g=>g.scene.clone(true))}
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
  if(st.mode==='bike2'){            // pillion: sitting on the rack, hands round the rider's waist, feet on the pegs
    P.hips.position.y=.16;P.spine.rotation.x=.32;P.head.rotation.x=-.28;
    for(const g of P.legs){g.hp.rotation.x=-.98;g.kn.rotation.x=1.0;g.ft.rotation.x=.35}
    for(const A of P.arms){A.sh.rotation.x=-.9;A.sh.rotation.z=A.s*-.28;A.el.rotation.x=-.6}
    P.idle=0;return}
  if(st.mode==='moto'){             // motorbike: feet on the pegs, hands out to the bars
    P.hips.position.y=.24;P.spine.rotation.x=.85;P.head.rotation.x=-.8;      // sport-bike tuck: leaning forward onto the bars
    for(const g of P.legs){g.hp.rotation.x=-1.0;g.kn.rotation.x=1.5;g.ft.rotation.x=.2}
    for(const A of P.arms){A.sh.rotation.x=-.25;A.sh.rotation.z=A.s*-.16+steer*.2;A.el.rotation.x=-.3}
    P.idle=0;return}
  if(st.mode==='bike'){             // leaning on the bars, legs follow the cranks
    const c=st.crank||0;P.hips.position.y=.16;P.spine.rotation.x=.52;P.head.rotation.x=-.42;
    for(const g of P.legs){const k=Math.cos(c+(g.s>0?0:Math.PI));g.hp.rotation.x=-1.12-.42*k;g.kn.rotation.x=1.12+.78*k;g.ft.rotation.x=-.25*k}
    for(const A of P.arms){A.sh.rotation.x=-1.12;A.sh.rotation.z=A.s*-.12+steer*.15;A.el.rotation.x=-.2}
    P.idle=0;return}
}

// ---------- engine sound ----------
const LVSND={voice:null,kind:null,
  start(kind){this.stop();if(typeof AUD==='undefined'||!AUD||!AUD.ok||kind==='bike')return;this.kind=kind;this.voice=AUD.machine(kind==='sub'?'sub':'car')},
  stop(){if(this.voice)this.voice.dispose();this.voice=null;this.kind=null},
  update(v,thr){if(!this.voice||!AUD.ctx||this.kind!==v.kind)return;this.voice.update(v.x,v.y,v.z,Math.hypot(v.vx||0,v.vz||0),thr,true,v.kind==='sub'?Math.max(0,SL-v.y):0,v.kind==='sub'?.7:.55)}};

// ===================================================================================================
class LiteVehicle{
  constructor(kind,x,z,yaw,opt){
    this.kind=kind;this.spec=LV_SPECS[kind];this.x=x;this.z=z;this.yaw=yaw||0;this.v=0;this.vx=0;this.vz=0;this.vy=0;this.steerA=0;this.pitch=0;this.roll=0;this.pedal=0;this.dmg=0;this.cd=0;this.occupied=false;this.dead=false;
    this.suspP=0;this.suspR=0;this.vPrev=0;this.aLong=0;this.yawRate=0;this.brakeOn=false;this.colIdx=(opt&&opt.col!=null)?opt.col|0:-1;this.proxy=!!(opt&&opt.proxy);
    this.root=new THREE.Group();this.susp=new THREE.Group();this.body=new THREE.Group();this.root.add(this.susp);this.susp.add(this.body);this.root.userData.lv=this;
    this.wheels=[];this.cols=[];this.crank=null;this.prop=null;this.seats=LV_SEATS[kind]||[];this.tailMat=null;this.lampMat=null;
    this.y=kind==='sub'?SL+SUB_SURF:lvGround(x,z);
    ({gwagon:()=>this.buildGWagon(),lambo:()=>this.buildLambo(),bike:()=>this.buildBike(),moto:()=>this.buildMoto(),gtr:()=>this.buildGtrPlaceholder(),p911:()=>this.buildGtrPlaceholder(1.76,1.28,4.28),p918:()=>this.buildGtrPlaceholder(2.06,1.18,4.65),db9:()=>this.buildGtrPlaceholder(2.02,1.29,4.7),sub:()=>this.buildSub()})[kind]();
    this.glbPending=!!LV_GLB[kind];this.glbDone=false;
    this.sync();
    if(this.glbPending&&this.proxy)this.attachGLB();   // garage display / a friend's vehicle: load now; parked ones load when the player gets near (EXT.tick)
  }
  // invisible box of the car's size (GT-R by default; the Porsches and the DB9 pass theirs): the garage measures the vehicle right after building it, the real model arrives a moment later
  buildGtrPlaceholder(w,h,l){w=w||1.9;h=h||1.3;l=l||4.7;this.cols=[0xb01820,0x111111,0xc9ccd2];const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,l),new THREE.MeshBasicMaterial({visible:false}));m.position.y=h/2;this.body.add(m);this.placeholder=true}
  // swap in the real GLB: wheels become pivot nodes (the front ones steer, all spin), lamps get night glow
  attachGLB(){const def=LV_GLB[this.kind];if(!def||this.glbDone||this.glbLoading)return;this.glbLoading=true;
    loadLvGLB(def.url).then(g=>{this.glbLoading=false;if(this.glbDone)return;
      const m=g.scene.clone(true);
      for(const c of [...this.body.children])this.body.remove(c);
      for(const c of [...this.root.children])if(c!==this.susp)this.root.remove(c);
      this.wheels=[];
      for(const [name,front,r] of def.wheels){const node=m.getObjectByName(name);if(!node)continue;
        const piv=new THREE.Group();piv.position.copy(node.position);node.position.set(0,0,0);node.parent.remove(node);piv.add(node);this.root.add(piv);this.wheels.push({piv,spin:node,r,front});}
      m.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.material=o.material.clone();const n=o.material.name||'';
        if(o.material.metalness>.55)o.material.metalness=.55;if(o.material.roughness<.3)o.material.roughness=.3;   // the open world has no studio reflections: full metal would render dark grey
        o.material.envMapIntensity=1;
        if(/red_galass/i.test(n)){o.material.emissive=new THREE.Color(0xff1a22);this.tailMat=o.material}
        else if(/Light_glass|LightC/i.test(n)){o.material.emissive=new THREE.Color(0xfff3c0);this.lampMat=o.material}});
      this.body.add(m);this.placeholder=false;this.glbDone=true;this.glbPending=false;   // no sync() here: the garage places the root itself
    }).catch(e=>{this.glbLoading=false;console.error('[vehicle] GLB load failed:',def.url,e)})}
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
    xb(B,.2,.03,.34,0,.62,-.68,dk);xb(B,.16,.05,.3,0,.655,-.72,lea);xb(B,.05,.05,.07,0,.64,-.86,red);for(const s of [-1,1])xb(B,.08,.02,.07,s*.1,.33,-.52,ch);   // rear rack with a cushion for a passenger, footpegs                                                  // rear rack, tail light
    this.crank=new THREE.Group();this.crank.position.set(0,.29,-.04);this.root.add(this.crank);
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.02,16),ch);ring.rotation.z=Math.PI/2;ring.position.x=.05;this.crank.add(ring);
    for(const s of [1,-1]){xb(this.crank,.03,.33,.03,.09*s,0,0,dk);xb(this.crank,.1,.03,.08,.14*s,.165*s,0,dk)}}
  // ---------- MOTORBIKE (user request): a real street bike, 500 km/h — same kind of build as the bicycle ----------
  buildMoto(){const B=this.body,fuel=XM(0xc41e3a,.28,.55),dk=XM(0x14161a,.6,.3),tyre=XM(0x0d0e10,.92),ch=XM(0xb9bec6,.22,.92),lea=XM(0x241c14,.7,.05),
      lamp=XM(0xfff3c0,.25,0,{emissive:0xffe9a0,emissiveIntensity:.7}),red=XM(0xc01018,.4,0,{emissive:0xc01018,emissiveIntensity:.5}),exh=XM(0x9aa2aa,.3,.9);
    this.cols=[0xc41e3a,0x14161a,0xb9bec6];this.lampMat=lamp;this.tailMat=red;
    const RF=.31,RR=.34;                                   // front/rear wheel radius
    const mkWheel=(r,w)=>{const piv=new THREE.Group(),spin=new THREE.Group();piv.add(spin);
      const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,20),tyre);t.rotation.z=Math.PI/2;t.castShadow=true;spin.add(t);
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*.62,r*.62,w*.7,14),ch);rim.rotation.z=Math.PI/2;spin.add(rim);
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r*.5,w*.15,16),dk);disc.rotation.z=Math.PI/2;spin.add(disc);return {piv,spin}};
    const rw=mkWheel(RR,.16);rw.piv.position.set(0,RR,-.72);this.root.add(rw.piv);this.wheels.push({piv:rw.piv,spin:rw.spin,r:RR,front:false});
    const fw=mkWheel(RF,.12);fw.piv.position.set(0,RF,.78);this.root.add(fw.piv);this.wheels.push({piv:fw.piv,spin:fw.spin,r:RF,front:true});
    // frame: tank, seat, tail, engine block
    xloft(B,[[.55,.16,.3,.34,.09],[.28,.19,.42,.5,.1],[-.35,.17,.55,.55,.09],[-.95,.14,.6,.5,.07]],fuel);      // fuel tank + seat base
    xb(B,.2,.16,.5,0,.35,-.1,dk);xb(B,.26,.1,.34,0,.24,-.12,ch);                                               // engine + sump
    xb(B,.18,.07,.42,0,.52,-.5,lea);xb(B,.14,.22,.1,0,.62,-.68,red);                                            // seat pad, tail light
    // forks + clip-on bars (steering pivot at the headstock)
    const fk=new THREE.Group();fk.position.set(0,.62,.5);this.root.add(fk);
    xb(fk,.05,.62,.05,.09,-.28,.18,ch);xb(fk,.05,.62,.05,-.09,-.28,.18,ch);xb(fk,.2,.05,.06,0,-.02,0,dk);      // fork legs, crown
    xb(fk,.62,.03,.04,0,.04,-.04,dk);for(const s of [-1,1])xb(fk,.11,.03,.03,s*.26,.05,-.04,lea);               // bars, grips
    xb(fk,.12,.09,.16,0,.06,.14,lamp);xb(fk,.05,.2,.05,.06,-.5,.16,exh);                                        // headlamp, front mudguard
    xb(B,.05,.05,.6,.1,-.05,.28,exh);xb(B,.09,.09,.14,.1,-.02,-.62,exh);                                        // exhaust pipe + muffler
    // rider footpegs
    for(const s of [-1,1])xb(B,.08,.03,.1,s*.16,.15,-.28,dk)}
  buildSub(){this.cols=[0xf2c21b,0x23303a,0x66d9ff];
    const spot=(p,t,intensity,angle)=>{const l=new THREE.SpotLight(0xbdeeff,intensity,90,angle,.45,1.5),target=new THREE.Object3D();l.position.set(...p);target.position.set(...t);l.target=target;l.castShadow=false;this.body.add(l,target);return l};
    this.subSpots=[spot([0,1.8,-6*SUB_MODEL_SCALE],[0,1.4,-32*SUB_MODEL_SCALE],3,.48),spot([0,.2,-2*SUB_MODEL_SCALE],[0,-14,-14*SUB_MODEL_SCALE],2.2,.62)];
    for(const s of this.subSpots)s.visible=false;
    this.lightsOn=false;
    const cabin=new THREE.Group(),wall=XM(0x30383d,.82,.16),floor=XM(0x3c454a,.78,.12);
    cabin.rotation.y=Math.PI;cabin.scale.setScalar(SUB_MODEL_SCALE);
    for(const [g,m,p] of [[new THREE.BoxGeometry(1.9,.12,3.2),floor,[0,-.55,5.2]],
      [new THREE.BoxGeometry(.12,1.8,3.2),wall,[-.95,.35,5.2]],
      [new THREE.BoxGeometry(.12,1.8,3.2),wall,[.95,.35,5.2]],
      [new THREE.BoxGeometry(1.9,1.8,.12),wall,[0,.35,3.6]]]){
      const o=new THREE.Mesh(g,m);o.position.set(...p);o.castShadow=false;o.receiveShadow=false;cabin.add(o)}
    cabin.visible=false;this.body.add(cabin);this.subCabin=cabin;
    const lever=new THREE.Group();lever.position.set(.56*SUB_MODEL_SCALE,-.1*SUB_MODEL_SCALE,-5.65*SUB_MODEL_SCALE);this.body.add(lever);
    const metal=XM(0x687782,.35,.8),grip=XM(0xe1b947,.32,.5),lamp=XM(0x18251e,.25,.1,{emissive:0x00d875,emissiveIntensity:0});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.08,10),metal);base.position.y=-.13;lever.add(base);
    const arm=new THREE.Group();arm.position.y=-.09;lever.add(arm);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.27,8),metal);shaft.position.y=.12;arm.add(shaft);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),grip);knob.position.set(0,.28,0);arm.add(knob);
    const led=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),lamp);led.position.set(0,-.13,.14);lever.add(led);
    lever.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
    this.subLever={root:lever,arm,led};
    this.schoolData=Array.from({length:24},()=>({a:Math.random()*Math.PI*2,r:8+Math.random()*5,y:-1.3+Math.random()*2.6,s:.75+Math.random()*.55}));
    const fishGeo=new THREE.ConeGeometry(.11,.38,5);fishGeo.rotateX(Math.PI/2);
    this.school=new THREE.InstancedMesh(fishGeo,XM(0x8dd9df,.55,.08,{emissive:0x15353a}),this.schoolData.length);
    this.school.castShadow=false;this.school.receiveShadow=false;this.body.add(this.school);this.schoolDummy=new THREE.Object3D();
    this.modelLoaded=false;this.modelLoading=false}
  loadModel(){if(LV_GLB[this.kind]){this.attachGLB();return}
    if(this.kind!=='sub'||this.modelLoaded||this.modelLoading)return;this.modelLoading=true;
    loadSubModel().then(m=>{this.modelLoading=false;if(this.dead)return;
      const fit=new THREE.Group();fit.rotation.y=-Math.PI/2;m.rotation.y=Math.PI;fit.add(m);fit.updateMatrixWorld(true);
      const size=new THREE.Box3().setFromObject(fit).getSize(new THREE.Vector3());
      this.subModelScale=SUB_MODEL_LENGTH/size.z;fit.scale.setScalar(this.subModelScale);fit.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(fit),center=box.getCenter(new THREE.Vector3());
      fit.position.set(-center.x,-center.y,-center.z);
      m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false}});
      this.body.add(fit);this.subModel=fit;this.modelLoaded=true;
    }).catch(e=>{this.modelLoading=false;console.error('[submarine] GLB load failed: assets/models/cyclops_subnautica.glb',e)})}
  toggleSubLights(){if(this.kind!=='sub')return;this.lightsOn=!this.lightsOn;for(const l of this.subSpots)l.visible=this.lightsOn;
    this.subLever.arm.rotation.x=this.lightsOn?-.55:.55;this.subLever.led.material.emissiveIntensity=this.lightsOn?2:0}
  setCabinView(on){if(this.subCabin)this.subCabin.visible=on;if(!this.subModel)return;this.subModel.traverse(o=>{if(o.isMesh&&['Cyclops_Body','Stripe','Dark'].includes(o.material.name))o.visible=!on})}

  sync(){this.root.position.set(this.x,this.y,this.z);this.root.rotation.set(this.pitch,this.yaw,this.roll,'YXZ');
    if(this.school){const t=UNI.uTime.value,d=this.schoolDummy;for(let i=0;i<this.schoolData.length;i++){const f=this.schoolData[i],a=f.a+t*(.15+f.s*.12);d.position.set(Math.cos(a)*f.r,f.y+Math.sin(t*1.4+f.a)*.22,Math.sin(a)*f.r);d.rotation.set(0,a-Math.PI/2,Math.sin(t*2+f.a)*.08);d.scale.setScalar(f.s);d.updateMatrix();this.school.setMatrixAt(i,d.matrix)}this.school.instanceMatrix.needsUpdate=true}}
  halt(){this.v=0;this.vx=this.vz=0;this.steerA=0;this.brakeOn=false}
  // where seat i is in the world (root origin of the seated avatar) and which way it faces
  seatWorld(i,out,quat){const s=this.seats[i]||this.seats[0];this.root.updateMatrixWorld(true);out.set(s.p[0],s.p[1],s.p[2]).applyMatrix4(this.susp.matrixWorld);if(quat){this.susp.getWorldQuaternion(quat);if(this.kind==='sub')quat.multiply(SUB_FORWARD_Q)}return out}
  seatPose(i){return (this.seats[i]||this.seats[0]||{}).pose||'sit'}

  // ---------- physics ----------
  // Velocity is kept as a world vector and split each step into forward and sideways parts: the engine and brakes act forwards,
  // tyre grip bleeds the sideways part (handbrake releases it), so power slides and handbrake turns come out naturally.
  step(dt,thr,str,brk,up,sprint){const s=this.spec;if(this.cd>0)this.cd-=dt;dt=Math.min(dt,.05);
    if(this.kind==='sub')return this.stepSub(dt,thr,str,up);
    const bike=this.kind==='bike',moto=this.kind==='moto',mv=s.max*(bike&&sprint?1.35:1),acc=s.acc*(bike&&sprint?1.5:1);   // 2026-11-12: the old `inv` flag steered the bicycle MIRRORED (A / stick-right turned it left, measured in the browser); it steers like the cars now
    const fx=Math.sin(this.yaw),fz=Math.cos(this.yaw),lx=Math.cos(this.yaw),lz=-Math.sin(this.yaw);
    let vf=this.vx*fx+this.vz*fz,vl=this.vx*lx+this.vz*lz;const sp=Math.abs(vf);
    let a=0;this.brakeOn=false;
    if(thr>0){if(vf<-.8){a=s.brake*thr;this.brakeOn=true}else a=acc*thr*Math.max(.08,1-Math.pow(Math.max(vf,0)/mv,1.7))}       // power falls off towards top speed
    else if(thr<0){if(vf>.8){a=-s.brake*-thr;this.brakeOn=true}else a=-acc*.6*-thr*Math.max(0,1-(-vf)/(mv*.3))}                 // S brakes first, then reverses
    else{const rr=bike?.3+.0002*sp*sp:moto?.25+.0004*sp*sp:.5+.0007*sp*sp;a=-Math.sign(vf)*Math.min(sp/Math.max(dt,1e-3),rr)}   // coasting: rolling + air drag
    a+=9.8*Math.sin(this.pitch)*(bike?.85:.4);                                                                                  // downhill pulls, uphill slows
    if(brk){a-=Math.sign(vf)*Math.min(sp/Math.max(dt,1e-3),s.brake*(bike?.7:.5));this.brakeOn=true}
    vf=Math.max(-mv*.3,Math.min(mv,vf+a*dt));
    const slide=Math.min(1,Math.abs(this.steerA)*sp*.012);
    vl*=Math.exp(-(brk?s.hgrip:s.grip*(1-.45*slide))*dt);
    this.vx=fx*vf+lx*vl;this.vz=fz*vf+lz*vl;
    // steering: the lock shrinks with speed to what the tyres can hold (lateral g limit); the handbrake lets it bite harder
    const aMax=s.lat*(brk?1.35:1),lim=Math.min(s.steer,Math.atan(aMax*s.wb/(vf*vf+1))),sa=moto?str*.5/(1+sp/45):bike?str*.5/(1+sp/40):str*lim;   // bike: steer gentler at the new 500 km/h; moto: the front wheel visibly turns less the faster it goes
    this.steerA+=(sa-this.steerA)*Math.min(1,dt*(Math.abs(sa)>=Math.abs(this.steerA)?9:13));
    if(bike){   // arcade steering for the bicycle too (it does 500 km/h): the old tyre-grip limit gave ~0.2 rad/s at speed, so it could hardly turn. ~3.4 rad/s when pulling away, ~1.2 rad/s at 100 m/s, a slow pivot when standing; the handbrake bites 25% harder
      const yMax=(3.2/(1+sp/14)+.8)*(brk&&sp>5?1.25:1)*Math.min(1,.3+sp/2.5),tgt=str*yMax*(vf>=-.5?1:-1);
      this.yawRate+=(tgt-this.yawRate)*Math.min(1,dt*13)}
    else if(moto){   // arcade steering for the 500 km/h bike: a real tyre-grip limit made it impossible to turn above ~30 m/s. Turn rate is set directly: ~2.7 rad/s when pulling away, ~0.6 rad/s flat out, never zero
      const yMax=(2.4/(1+sp/18)+.35)*(brk&&sp>5?1.2:1)*Math.min(1,sp/1.2),tgt=str*yMax*(vf>=-.5?1:-1);
      this.yawRate+=(tgt-this.yawRate)*Math.min(1,dt*10)}
    else this.yawRate=vf*Math.tan(this.steerA)/s.wb*(brk&&sp>5?1.25:1);
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
    this.v=-(this.vx*Math.sin(this.yaw)+this.vz*Math.cos(this.yaw));
    // ride height and slope
    const hf=groundAt(this.x+fx*s.len*.4,this.z+fz*s.len*.4,this.y+.6),hb=groundAt(this.x-fx*s.len*.4,this.z-fz*s.len*.4,this.y+.6);
    this.y+=((hf+hb)/2-this.y)*Math.min(1,dt*14);this.pitch+=(-Math.atan((hf-hb)/(s.len*.8))-this.pitch)*Math.min(1,dt*8);
    const lean=bike||moto?Math.max(-.5,Math.min(.5,-Math.atan(this.yawRate*this.v/9.8)*.95)):0;this.roll+=(lean-this.roll)*Math.min(1,dt*6);
    this.animate(dt);this.sync()}
  scrape(spd){if(spd>7&&this.cd<=0){this.cd=.3;crashSound(spd*.3)}this.vx*=.96;this.vz*=.96}
  stepSub(dt,thr,str,up){const s=this.spec;
    if(thr>0)this.v+=thr*s.acc*dt*(this.v<0?2:1);else if(thr<0)this.v+=thr*s.acc*dt*(this.v>0?2.2:.7);else this.v*=Math.exp(-dt*.45);
    this.v=Math.max(-s.max*.3,Math.min(s.max,this.v));
    const sa=str*s.steer/(1+Math.abs(this.v)*(this.kind==='sub'?.16:.07));this.steerA+=(sa-this.steerA)*Math.min(1,dt*8);   // stronger denominator for the 500 km/h sub so it stays steerable
    this.yaw+=this.v*Math.tan(this.steerA)/s.wb*dt;
    const fx=-Math.sin(this.yaw),fz=-Math.cos(this.yaw),nx=this.x+fx*this.v*dt,nz=this.z+fz*this.v*dt,sg=this.v>=0?1:-1,px=nx+fx*s.len/2*sg,pz=nz+fz*s.len/2*sg;
    const block=Math.abs(this.v)>.05&&(groundH(px,pz)>SL-.3||groundH(nx,nz)>SL-.3);
    if(block)this.v*=-.2;else{this.x=nx;this.z=nz}
    // vertical motion: ballast tanks and dive planes. Slow to respond, faster when moving; the sea floor stops it, the surface catches it softly
    const sx=Math.cos(this.yaw),sz=-Math.sin(this.yaw),reach=s.len*.46,side=s.r*.7;
    let seabed=groundH(this.x,this.z);
    seabed=Math.max(seabed,groundH(this.x+fx*reach,this.z+fz*reach),groundH(this.x-fx*reach,this.z-fz*reach));
    seabed=Math.max(seabed,groundH(this.x+sx*side,this.z+sz*side),groundH(this.x-sx*side,this.z-sz*side));
    seabed=Math.max(seabed,groundH(this.x+fx*reach+sx*side,this.z+fz*reach+sz*side),groundH(this.x+fx*reach-sx*side,this.z+fz*reach-sz*side));
    seabed=Math.max(seabed,groundH(this.x-fx*reach+sx*side,this.z-fz*reach+sz*side),groundH(this.x-fx*reach-sx*side,this.z-fz*reach-sz*side));
    const fl=Math.max(seabed+s.r+1,SL-SUB_MAXD),top=SL+SUB_SURF,pl=Math.min(1,Math.abs(this.v)/10);
    const rate=up*(2.2+2.2*pl);this.vy+=(rate-this.vy)*Math.min(1,dt*(up?1.1:.9));
    if(this.vy>0&&this.y>top-1.4)this.vy*=Math.max(.25,(top-this.y)/1.4+.25);
    this.y+=this.vy*dt;if(this.y<fl){this.y=fl;if(this.vy<0)this.vy*=-.1}if(this.y>top){this.y=top;if(this.vy>0)this.vy=0}
    const wantP=Math.max(-.5,Math.min(.5,-this.vy*.11));this.pitch+=(wantP-this.pitch)*Math.min(1,dt*2.2);this.roll+=(-this.steerA*this.v*.03-this.roll)*Math.min(1,dt*3);
    this.depth=SL-this.y;if(this.depth>SUB_CRUSH)this.dmg=Math.min(1,this.dmg+Math.min(1,(this.depth-SUB_CRUSH)/(SUB_MAXD-SUB_CRUSH))*.1*dt);
    if(this.subModel)this.subModel.scale.y=this.subModelScale*(1-this.dmg*.12);
    if(this.dmg>=1){this.kill();return}
    if(this.y>=top-.02)this.y=top+Math.sin(UNI.uTime.value*1.3)*.05+Math.sin(UNI.uTime.value*.7+this.x*.1)*.03;
    this.sync()}
  // wheels, suspension (nose dives under braking, rolls out of corners), brake lights and headlights
  animate(dt){
    if(this.kind==='bike'){this.pedal+=this.v*dt/(.36*2.2);if(this.crank)this.crank.rotation.x=this.pedal;for(const w of this.wheels){w.spin.rotation.x=this.pedal*2.2;if(w.front)w.piv.rotation.y=this.steerA*1.6}this.lights();return}
    if(this.kind==='moto'){for(const w of this.wheels){w.spin.rotation.x+=this.v*dt/w.r;if(w.front)w.piv.rotation.y=this.steerA*(this.glbDone?.8:1.5)}this.lights();return}
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
  repair(){this.dmg=0;this.body.scale.set(1,1,1);if(this.subModel)this.subModel.scale.y=this.subModelScale;this.body.rotation.set(0,0,0);this.body.position.y=0}
  kill(){if(this.dead)return;this.dead=true;this.respawnAt=performance.now()+30000;FX.init();FX.explode(this.x,this.y+.8,this.z,7);EXT.fireball(this.x,this.y+.8,this.z,5);EXT.shatter(this.x,this.y+.8,this.z,28,this.cols,10,0,0);
    this.root.visible=false;this.halt();if(EXT.cur===this)EXT.leave(this,true)}
  revive(){this.dead=false;this.repair();this.cabinWalk=false;this.x=this.home[0];this.z=this.home[1];this.yaw=this.home[2];this.y=this.kind==='sub'?SL+SUB_SURF:lvGround(this.x,this.z);this.halt();this.root.visible=true;this.sync()}
}

// a friend's vehicle: drawn from network snapshots, with the same model and colour as the one they drive
class PeerLite{
  constructor(kind,col){this.kind=kind;this.v=new LiteVehicle(kind,0,0,0,{col,proxy:true});scene.add(this.v.root);this.net=new NetSnaps()}
  push(s){const a=s.xv;this.net.push({x:s.x,y:s.y,z:s.z,yaw:s.r||0,p:+a[1]||0,r:+a[2]||0,u:+a[3]||0,st:+a[4]||0},s.ts)}
  update(dt){const q=this.net.update(dt);if(!q)return null;const v=this.v;v.x=q.x;v.y=q.y;v.z=q.z;v.yaw=q.yaw;v.pitch=q.p;v.roll=q.r;v.v=q.u;v.steerA=q.st;v.brakeOn=false;if(v.kind==='sub'&&Math.hypot(v.x-player.x,v.z-player.z)<900)v.loadModel();v.animate(dt);v.sync();return q}
  dispose(){scene.remove(this.v.root)}
}
