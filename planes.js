/* ===================================================================================================
   planes.js — aircraft MODELS (procedural, merged geometry): an airliner (A320 class, "ODESA AIR") and a fighter.
   buildAirliner() / buildFighter() → {root, kind, parts:{...animated pieces}, dims}
   Local frame: +z nose, +x left, y up, origin on the fuselage axis at the wing root. gearY = height of the wheel bottoms below the origin.
   The hull is FRONT-SIDE only on purpose: from inside the cabin its inner faces are culled, so the windows of the cabin liner (plane.js) are
   real openings you can look out of.
   =================================================================================================== */
const PM={mats:null,
  m(){if(this.mats)return this.mats;const S=MBM.std;
    const livDim=MOBILE?512:1024;
    const liv=MBM.tex(livDim,livDim,(x,w,h)=>{ // u around (0 belly, .25 left side, .5 roof), v along (0 tail … 1 nose); canvas y = (1-v)*h
      x.fillStyle='#f3f5f7';x.fillRect(0,0,w,h);
      // belly and lower fuselage: grey-blue
      let g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#2a4a78');g.addColorStop(.17,'#2a4a78');g.addColorStop(.19,'#f3f5f7');g.addColorStop(.81,'#f3f5f7');g.addColorStop(.83,'#2a4a78');g.addColorStop(1,'#2a4a78');x.fillStyle=g;x.fillRect(0,0,w,h);
      // cheat line (gold + blue) both sides
      for(const u of [.2,.8]){x.fillStyle='#e8b923';x.fillRect(u*w-6,0,12,h);x.fillStyle='#1d3f8a';x.fillRect(u*w+8,0,14,h)}
      // passenger windows along both sides: small dark rounded slots (they are only painted: the cabin liner has the real openings)
      x.fillStyle='#16222e';for(const u of [.285,.715])for(let i=0;i<30;i++){const v=.3+i*.0127,y=(1-v)*h;x.fillRect(u*w-6,y-7,12,14)}
      // flight deck windows near the nose
      x.fillStyle='#101820';for(const u of [.275,.725]){x.fillRect(u*w-9,(1-.925)*h-4,18,10);x.fillRect(u*w-9,(1-.945)*h-4,18,10)}x.fillRect(.5*w-90,(1-.972)*h,180,14);
      // door outline front left
      x.strokeStyle='#8a9098';x.lineWidth=3;x.strokeRect(.27*w-15,(1-.84)*h,30,70);
      // airline name along the side + logo
      x.save();x.fillStyle='#1d3f8a';x.font='700 54px "Unbounded",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';
      for(const [u,rot] of [[.285,-Math.PI/2],[.715,Math.PI/2]]){x.save();x.translate(u*w,(1-.52)*h);x.rotate(rot);x.fillText('ODESA AIR',0,0);x.restore()}x.restore();
      x.fillStyle='#e8b923';for(const u of [.27,.73]){x.beginPath();x.arc(u*w,(1-.73)*h,18,0,6.283);x.fill()}
      // registration
      x.fillStyle='#1b2430';x.font='600 26px Arial';x.textAlign='center';for(const [u,rot] of [[.285,-Math.PI/2],[.715,Math.PI/2]]){x.save();x.translate(u*w,(1-.16)*h);x.rotate(rot);x.fillText('UR-ODS',0,0);x.restore()}
    });
    const camo=MBM.tex(512,512,(x,w,h)=>{x.fillStyle='#8b9296';x.fillRect(0,0,w,h);const c=['#6c7478','#a3a9ac','#5a6165'];let s=11;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
      for(let i=0;i<46;i++){x.fillStyle=c[i%3];x.beginPath();x.ellipse(r()*w,r()*h,30+r()*80,14+r()*40,r()*3,0,6.283);x.fill()}
      x.fillStyle='#b9bec2';x.fillRect(0,h*.46,w,h*.08);x.fillStyle='#c4202a';x.beginPath();x.arc(w*.2,h*.5,12,0,6.283);x.fill();x.fillStyle='#fff';x.font='700 22px Arial';x.fillText('UA-27',w*.3,h*.5+8)});
    return this.mats={
      hull:S(0xffffff,.32,.2,{map:liv,side:THREE.FrontSide}),camo:S(0xffffff,.45,.3,{map:camo,side:THREE.FrontSide}),white:S(0xf0f2f4,.35,.15),grey:S(0x9aa1a8,.4,.55),dark:S(0x18191c,.55,.4),rubber:S(0x1a1a1c,.95,0),chrome:S(0xd5d9de,.2,.9),
      blue:S(0x1d3f8a,.4,.2),gold:S(0xe8b923,.4,.3),olive:S(0x6a7a52,.5,.3),red:S(0xb82a2a,.5,.2),glass:MBM.glass(0x7fa8c6,.35,{side:THREE.DoubleSide}),
      lightR:MBM.emis(0xff2a2a,1.3),lightG:MBM.emis(0x20e060,1.3),lightW:MBM.emis(0xffffff,1.5),flame:new THREE.MeshBasicMaterial({color:0xffb050,transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),
      metal:S(0x6a7077,.35,.8),inlet:S(0x0b0c0d,.8,0)}},
  // a quad whose normal is flipped to face `out`
  qo(mb,k,a,b,c,d,out){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),C=new THREE.Vector3(...c),n=new THREE.Vector3().subVectors(B,A).cross(new THREE.Vector3().subVectors(C,A));if(n.dot(new THREE.Vector3(...out))<0)mb.quad(k,d,c,b,a);else mb.quad(k,a,b,c,d)},
  // a solid lifting surface between a root and a tip section: [x,y(top at LE),zLE,zTE,thickness]
  wing(mb,k,R,T){const rt=[[R[0],R[1],R[2]],[R[0],R[1]-R[4]*.25,R[3]]],tp=[[T[0],T[1],T[2]],[T[0],T[1]-T[4]*.25,T[3]]];
    const P=(s,top)=>[s[0],s[1]-(top?0:s[4])*(s===R?1:1),0];
    const rLEt=[R[0],R[1],R[2]],rTEt=[R[0],R[1]-R[4]*.2,R[3]],rLEb=[R[0],R[1]-R[4],R[2]],rTEb=[R[0],R[1]-R[4]*.8,R[3]];
    const tLEt=[T[0],T[1],T[2]],tTEt=[T[0],T[1]-T[4]*.2,T[3]],tLEb=[T[0],T[1]-T[4],T[2]],tTEb=[T[0],T[1]-T[4]*.8,T[3]];const sg=T[0]>R[0]?1:-1;
    this.qo(mb,k,rLEt,tLEt,tTEt,rTEt,[0,1,0]);this.qo(mb,k,rLEb,tLEb,tTEb,rTEb,[0,-1,0]);this.qo(mb,k,rLEt,tLEt,tLEb,rLEb,[0,0,1]);this.qo(mb,k,rTEt,tTEt,tTEb,rTEb,[0,0,-1]);this.qo(mb,k,tLEt,tTEt,tTEb,tLEb,[sg,0,0]);this.qo(mb,k,rLEt,rTEt,rTEb,rLEb,[-sg,0,0])},
  // a hinged control surface as its own group: pivot at the leading edge of the surface (hinge along x unless `ax` says z)
  surface(parent,mat,w,t,c,x,y,z,ax){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);const m=new THREE.Mesh(new THREE.BoxGeometry(ax==='z'?t:w,ax==='z'?w:t,ax==='z'?c:c),mat);m.position.set(0,0,-c/2);m.castShadow=true;g.add(m);return g},
  wheel(parent,r,w,x,y,z,M){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,16),M.rubber);t.rotation.z=Math.PI/2;g.add(t);const h=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r*.55,w*1.02,10),M.grey);h.rotation.z=Math.PI/2;g.add(h);
    for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(w*1.04,r*.12,r*1.0),M.dark);b.rotation.x=i*Math.PI/3;g.add(b)}return g},
  // ================================ AIRLINER ================================
  buildAirliner(){const M=this.m(),root=new THREE.Group(),mb=new MB(),parts={},dims={gearY:-3.25,len:37.5,span:34.4,vr:72,vs:54,vmax:235,cabin:true};
    // fuselage: nose ellipse, barrel, tapering tail
    const prof=[];for(let i=0;i<=34;i++){const y=-19+i/34*37.6;let r;if(y>14.2){const t=(y-14.2)/4.4;r=2.0*Math.sqrt(Math.max(0,1-t*t))}else if(y>-9){r=2.0}else{const t=(-9-y)/10;r=2.0*(1-Math.pow(t,1.5)*.88)}prof.push([Math.max(.05,r),y])}
    mb.lathe('hull',prof,28,0,0,0,Math.PI/2,0,0,1,1,1.04);
    // wings
    for(const s of [1,-1]){this.wing(mb,'white',[s*1.7,-.85,2.4,-4.8,.75],[s*17.2,.35,-7.2,-9.3,.2]);
      // winglet
      this.wing(mb,'white',[s*17.2,.35,-7.2,-9.3,.2],[s*17.55,2.0,-8.7,-9.6,.07]);
      // fairing wing-fuselage
      mb.box('white',2.2,.6,6.8,s*1.7,-1.0,-1.0,0,0,s*.12);
      // engine nacelle + pylon
      mb.box('grey',.35,.9,2.6,s*5.7,-1.15,-.9);mb.lathe('white',[[.88,-3.2],[1.12,-2.2],[1.15,-.4],[1.14,1.0],[1.2,1.25],[1.05,1.35]],22,s*5.7,-1.95,0,Math.PI/2,0,0,1,1,1);mb.lathe('metal',[[.4,-4.2],[.7,-3.2],[.9,-3.1]],16,s*5.7,-1.95,0,Math.PI/2,0,0);mb.lathe('inlet',[[.01,1.2],[1.0,1.22]],20,s*5.7,-1.95,0,Math.PI/2,0,0);
      // horizontal stabiliser
      this.wing(mb,'white',[s*1.0,.35,-15.0,-18.4,.38],[s*6.4,.95,-17.4,-18.9,.12]);
      // wingtip lights live in `parts.lights`
    }
    // vertical fin
    this.wing(mb,'blue',[.14,1.4,-11.0,-17.4,.3],[.1,7.6,-15.6,-18.4,.1]);this.wing(mb,'blue',[-.14,1.4,-11.0,-17.4,.3],[-.1,7.6,-15.6,-18.4,.1]);mb.bx('blue',-.15,.15,1.4,7.6,-17.4,-17.55);
    mb.cyl('dark',.2,.2,.5,8,0,2.2,-4,Math.PI/2);   // (belly fairing marker, hidden)
    mb.build(root,M,{noShadow:new Set([]),static:true});
    // cockpit glass pane over the nose (see-through)
    // ---- animated parts ----
    const g=new THREE.Group();root.add(g);parts.fans=[];
    for(const s of [1,-1]){const fan=new THREE.Group();fan.position.set(s*5.7,-1.95,1.18);root.add(fan);const fm=new MB();for(let i=0;i<14;i++){const a=i/14*6.283;fm.box('metal',.06,.92,.03,Math.sin(a)*.0,Math.cos(a)*.0,0,0,0,a)}fm.build(fan,M);parts.fans.push(fan)}
    // control surfaces: ailerons (outer TE), flaps (inner TE), elevators, rudder
    parts.ail=[];parts.flap=[];parts.elev=[];for(const s of [1,-1]){parts.ail.push(this.surface(root,M.white,4.2,.09,1.0,s*14.2,.05,-8.35));parts.flap.push(this.surface(root,M.white,5.8,.09,1.3,s*7.5,-.5,-5.35));parts.elev.push(this.surface(root,M.white,5.4,.08,1.1,s*3.6,.4,-17.5))}
    parts.rud=this.surface(root,M.blue,4.6,.14,1.5,0,4.8,-17.0,'z');parts.rud.children[0].position.set(0,0,-.75);
    // landing gear (retracts): nose, left main, right main
    const gear=(x,z,len,r,twin)=>{const gp=new THREE.Group();gp.position.set(x,-1.7,z);root.add(gp);const st=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,len,8),M.chrome);st.position.y=-len/2;gp.add(st);const wl=[];
      for(const dx of (twin?[-.34,.34]:[0]))wl.push(this.wheel(gp,r,.38,dx,-len-.03+r*0+0,0,M));return {g:gp,wheels:wl,len}};
    parts.gearN=gear(0,13.3,1.0,.42,true);parts.gearL=gear(3.5,-1.6,1.55,.55,true);parts.gearR=gear(-3.5,-1.6,1.55,.55,true);
    parts.gearN.g.userData.fold=[-1.45,0,0];parts.gearL.g.userData.fold=[0,0,1.5];parts.gearR.g.userData.fold=[0,0,-1.5];
    // lights: nav (red left, green right, white tail), strobes, beacon, landing
    const L=new THREE.Group();root.add(L);const lm=new MB();lm.sph('lightR',.16,17.4,.5,-8.8);lm.sph('lightG',.16,-17.4,.5,-8.8);lm.sph('lightW',.14,0,7.8,-18.2);lm.sph('lightW',.18,17.5,.6,-9.4);lm.sph('lightW',.18,-17.5,.6,-9.4);lm.sph('lightR',.2,0,2.12,3.0);lm.sph('lightW',.3,1.8,-.95,-2.0);lm.sph('lightW',.3,-1.8,-.95,-2.0);lm.build(L,M);parts.lights=L;
    return {root,kind:'airliner',parts,dims}},
  // ================================ FIGHTER ================================
  buildFighter(){const M=this.m(),root=new THREE.Group(),mb=new MB(),parts={},dims={gearY:-1.62,len:15.8,span:9.6,vr:78,vs:58,vmax:430,cabin:false};
    const prof=[];for(let i=0;i<=30;i++){const y=-7.5+i/30*15.4;let r;if(y>3.2){const t=(y-3.2)/4.7;r=.78*Math.pow(Math.max(0,1-t*t),.6)}else if(y>-4){r=.78+.05*Math.sin((y+4)/7.2*Math.PI)}else{const t=(-4-y)/3.5;r=.8-t*.18}prof.push([Math.max(.04,r),y])}
    mb.lathe('camo',prof,22,0,0,0,Math.PI/2,0,0,1,1,.92);
    // intakes and side fairings
    for(const s of [1,-1]){mb.box('camo',.7,.85,3.6,s*.88,-.15,1.4);mb.box('inlet',.55,.65,.1,s*.88,-.15,3.25);mb.box('camo',.55,.5,5.0,s*.65,.15,-3.8)}
    // wings (swept), tailplanes, twin fins
    for(const s of [1,-1]){this.wing(mb,'camo',[s*.7,-.1,1.2,-5.2,.34],[s*4.8,-.15,-3.2,-5.2,.1]);this.wing(mb,'camo',[s*.7,.1,-4.2,-6.6,.22],[s*2.9,.0,-6.0,-7.3,.07]);
      mb.box('camo',.12,2.6,2.4,s*1.0,1.3,-5.2,0,0,s*-.28);   // canted fin
      mb.box('dark',.45,.5,.5,s*4.9,-.2,-3.4);   // wingtip rails
      // missiles on rails
      mb.cyl('white',.11,.11,2.8,8,s*4.4,-.62,-2.2,Math.PI/2);mb.cyl('red',.115,.1,.3,8,s*4.4,-.62,-.95,Math.PI/2);for(const a of [0,Math.PI/2])mb.box('dark',.02,.5,.4,s*4.4,-.62,-3.3,0,0,a)}
    // nozzle + ejector
    mb.lathe('metal',[[.6,-9.0],[.66,-8.0],[.78,-7.4]],16,0,0,0,Math.PI/2,0,0,1,1,.92);
    // canopy frame and seat
    mb.bx('dark',-.42,.42,.62,.7,2.9,3.0);mb.bx('dark',-.42,.42,.62,.7,5.0,5.1);
    mb.build(root,M,{static:true});
    const can=new THREE.Mesh(new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI/2),M.glass);can.scale.set(.5,.52,1.9);can.position.set(0,.6,4.0);can.castShadow=false;root.add(can);parts.canopy=can;
    // cockpit
    const ck=new MB();ck.bx('dark',-.4,.4,.0,.35,3.4,4.3);ck.bx('grey',-.34,.34,.55,.62,3.6,4.2);ck.bx('dark',-.3,.3,.0,.5,2.1,2.9);ck.bx('grey',-.36,-.3,.12,.5,2.0,3.2);ck.bx('grey',.3,.36,.12,.5,2.0,3.2);ck.build(root,M);
    parts.ail=[];parts.elev=[];for(const s of [1,-1]){parts.ail.push(this.surface(root,M.camo,2.3,.07,.9,s*3.4,-.15,-4.3));parts.elev.push(this.surface(root,M.camo,2.2,.06,1.3,s*1.9,0,-6.95))}parts.flap=[];
    parts.rud=this.surface(root,M.camo,1.8,.1,1.0,0,1.8,-6.0,'z');parts.fans=[];
    // flame
    const fl=new THREE.Mesh(new THREE.ConeGeometry(.5,6,12,1,true),M.flame);fl.rotation.x=-Math.PI/2;fl.position.set(0,0,-11.4);root.add(fl);parts.flame=fl;
    // gear
    const gear=(x,z,len,r)=>{const gp=new THREE.Group();gp.position.set(x,-.75,z);root.add(gp);const st=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,len,8),M.chrome);st.position.y=-len/2;gp.add(st);const w=this.wheel(gp,r,.2,0,-len-.0,0,M);return {g:gp,wheels:[w],len}};
    parts.gearN=gear(0,5.2,.7,.26);parts.gearL=gear(1.6,-1.2,.75,.34);parts.gearR=gear(-1.6,-1.2,.75,.34);
    parts.gearN.g.userData.fold=[-1.45,0,0];parts.gearL.g.userData.fold=[0,0,1.5];parts.gearR.g.userData.fold=[0,0,-1.5];
    const L=new THREE.Group();root.add(L);const lm=new MB();lm.sph('lightR',.1,4.95,-.1,-3.4);lm.sph('lightG',.1,-4.95,-.1,-3.4);lm.sph('lightW',.1,0,3.2,-6.4);lm.sph('lightR',.12,0,.9,.5);lm.build(L,M);parts.lights=L;
    return {root,kind:'fighter',parts,dims}},
  // ================================ LIGHT PLANE (Colomban Cri-Cri, assets/models/cricri.glb) ================================
  // The model was converted from the user's FBX (see assets/IMPORTS.md): +z nose, +x left, metres, scaled 1.5x so a seated avatar fits under the
  // canopy, origin at the wing root; nodes: body, cockpit, canopy, prop_l/r, wheel_n/l/r, ail_l/r, elev (each with its own pivot).
  light:null,lightP:null,
  loadLight(){if(this.lightP)return this.lightP;
    return this.lightP=new Promise((res,rej)=>{try{new THREE.GLTFLoader().load('assets/models/cricri.glb',g=>{this.light=g.scene;res(g.scene)},undefined,e=>{this.lightP=null;rej(e)})}catch(e){this.lightP=null;rej(e)}})},
  buildLight(){if(!this.light)throw new Error('light plane model is not loaded yet');
    const root=new THREE.Group(),m=this.light.clone(true),parts={},dims={gearY:-.66,len:5.95,span:7.33,vr:25,vs:21,vmax:66,cabin:false,light:true};root.add(m);
    const n=k=>m.getObjectByName(k);
    m.traverse(o=>{if(o.isMesh){o.castShadow=o.name!=='canopy';o.receiveShadow=false}});
    parts.canopy=n('canopy');parts.elev=[n('elev')];parts.ail=[n('ail_l'),n('ail_r')];parts.rud=new THREE.Group();root.add(parts.rud);   // the fin is part of the body: the rudder is only a dummy
    // wheels: each gets a parent group at its axle (steering of the nose wheel turns that group; the wheel itself spins about x)
    const gear=(k)=>{const w=n(k),g=new THREE.Group();g.position.copy(w.position);w.position.set(0,0,0);w.parent.add(g);g.add(w);g.userData.fold=[0,0,0];return {g,wheels:[w],len:.2}};
    parts.gearN=gear('wheel_n');parts.gearL=gear('wheel_l');parts.gearR=gear('wheel_r');
    // propellers spin about z; a faint disc shows up at speed
    parts.fans=[n('prop_l'),n('prop_r')];parts.discs=[];
    for(const f of parts.fans){const d=new THREE.Mesh(new THREE.CircleGeometry(.56,24),new THREE.MeshBasicMaterial({color:0xcfd6dc,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));d.position.copy(f.position);d.position.z+=.02;d.visible=false;d.renderOrder=2;m.add(d);parts.discs.push(d)}
    // navigation lights
    const L=new THREE.Group(),lm=(c)=>new THREE.MeshBasicMaterial({color:c,toneMapped:false});
    for(const [x,y,z,c] of [[3.62,-.05,.1,0xff2a2a],[-3.62,-.05,.1,0x20e060],[0,.95,-3.35,0xffffff]]){const s=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),lm(c));s.position.set(x,y,z);L.add(s)}
    root.add(L);parts.lights=L;
    return {root,kind:'light',parts,dims}}
};
