/* ===================================================================================================
   arsenal.js — the war toys of the owner's big list (2026-11-15), all on ONE damage system:
   • DMG      every explosion of the game (GUN.addBoom: rockets, bombs, the tank, the drone, the nuke, the volcano) leaves a blast sphere;
              the building / prop / ground shaders (patched once, DMG.patch) blow holes into walls inside it and scorch the rim. Six spheres at
              most, each heals after a while ("recovery"). No geometry is rebuilt: it costs a short loop per pixel only while a blast is alive.
   • TANK     Tiger tank (Spawn menu): tracks, turret that follows the camera, a cannon with ballistic shells, armour points.
   • DRONE    kamikaze drone (Spawn menu): flown in first person, explodes on whatever it hits (or on Jump).
   • NUKE     nuclear bomb (Spawn menu): falls 650 m ahead, flash, shock wave, mushroom cloud, a ring of ruined buildings, a wasteland tint, then recovery.
   • holster  changing or putting away a weapon lowers the old one first, then the new one is drawn (pose.js already draws); the katana blocks.
   • SPAWNX   adds entries to the Spawn menu; MODE = "the player is not walking" (window.NOWALK, a button bar, the camera through DBGCAM).
   Hooks in index.html: ARS.init() at boot, DMG.patch() before the materials are made, window.NOWALK in loop().
   =================================================================================================== */
const SPAWNX={items:[],add(label,fn){this.items.push([label,fn])},
  hook(){if(typeof AIRP==='undefined'||AIRP._sx)return;AIRP._sx=1;const o=AIRP.menu;
    AIRP.menu=function(){o.call(this);const m=document.getElementById('airPick');if(!m||m._sx)return;m._sx=1;const box=m.querySelector('.ap'),x=box.querySelector('.x');box.style.maxHeight='88vh';box.style.overflowY='auto';
      for(const [l,f] of SPAWNX.items){const b=document.createElement('button');b.textContent=l;b.onclick=e=>{e.stopPropagation();m.hidden=true;try{f()}catch(er){console.warn('[spawn]',er)}};box.insertBefore(b,x)}}}};
const MODE={cur:null,bar:null,
  enter(name,btns,hide){if(this.cur)this.leave();this.cur=name;window.NOWALK=name;player.vx=player.vz=0;player.sit=null;if(hide&&PLR&&PLR.root)PLR.root.visible=false;
    if(!this.bar){const b=this.bar=document.createElement('div');b.id='modeBar';b.style.cssText='position:absolute;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;gap:10px;z-index:30';(document.getElementById('hud')||document.body).appendChild(b)}
    this.bar.innerHTML='';this.bar.hidden=false;for(const [l,f,hold] of btns){const b=document.createElement('button');b.textContent=l;b.style.cssText='min-width:92px;padding:14px 16px;border-radius:12px;border:1.5px solid rgba(255,255,255,.3);background:rgba(8,10,14,.9);color:#fff;font:800 13px system-ui;letter-spacing:.06em;touch-action:manipulation';
      if(hold){b.onpointerdown=e=>{e.preventDefault();f(true)};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>f(false)}else b.onclick=e=>{e.stopPropagation();f()};this.bar.appendChild(b)}},
  leave(){this.cur=null;window.NOWALK=null;window.DBGCAM=null;if(this.bar)this.bar.hidden=true;if(PLR&&PLR.root)PLR.root.visible=true;cam.init=false}};

// ---------------------------------------------------------------------------------------------------- the damage system
const DMG={N:6,list:[],
  GLSL(hole){return 'if(uBlastN>.5){for(int i=0;i<6;i++){vec4 b=uBlast[i];if(b.w>0.){float d=distance(vW,b.xyz)/b.w;if(d<1.){float n=fract(sin(dot(floor(vW*1.7),vec3(12.9898,78.233,37.719)))*43758.5453);'+
    (hole?'if(d<.5+n*.22)discard;':'')+'float k=smoothstep(.45,1.,d);sAlb=mix(vec3(.035,.03,.028)+n*.03,sAlb,k);sRough=mix(1.,sRough,k);}}}}'},
  // called once before initMats(): the three world materials learn about the blasts
  patch(){if(this.done||typeof patchMat!=='function')return;this.done=1;UNI.uBlast={value:Array.from({length:this.N},()=>new THREE.Vector4(0,0,0,0))};UNI.uBlastN={value:0};const o=patchMat,S=this;
    patchMat=function(mat,p){if(p&&(p.key==='bld'||p.key==='props'||p.key==='ground'))p=Object.assign({},p,{fDecl:(p.fDecl||'')+'uniform vec4 uBlast[6];uniform float uBlastN;',fSurf:(p.fSurf||'')+'\n'+S.GLSL(p.key!=='ground')});return o(mat,p)}},
  blast(x,y,z,r,ttl){if(!this.done)return;const now=performance.now();let s=this.list.find(b=>Math.hypot(b.x-x,b.y-y,b.z-z)<Math.min(b.r,r)*.5);   // a hit on an old hole widens it
    if(s){s.r=Math.min(260,Math.max(s.r,r)+Math.min(s.r,r)*.25);s.t=Math.max(s.t,now+ttl*1000)}
    else{if(this.list.length>=this.N){let k=0;for(let i=1;i<this.list.length;i++)if(this.list[i].r<this.list[k].r)k=i;if(this.list[k].r>r)return;this.list.splice(k,1)}this.list.push({x,y,z,r,t:now+ttl*1000})}
    this.sync()},
  sync(){const U=UNI.uBlast.value;for(let i=0;i<this.N;i++){const b=this.list[i];if(b)U[i].set(b.x,b.y,b.z,b.r);else U[i].set(0,0,0,0)}UNI.uBlastN.value=this.list.length},
  tick(){if(!this.list.length)return;const now=performance.now();let ch=false;for(let i=this.list.length-1;i>=0;i--){const b=this.list[i];if(now>b.t){b.r-=Math.max(.5,b.r*.03);ch=true;if(b.r<1.5)this.list.splice(i,1)}}if(ch)this.sync()}};   // healing: the hole closes in

// ---------------------------------------------------------------------------------------------------- shared bits
const ARS={block:false,shells:[],
  snd(f0,f1,d,v,t){try{if(typeof AUD!=='undefined'&&AUD.ok)AUD.burst(f0,f1,d,v,t||'lowpass',.8)}catch(e){}},
  shake(a,t){try{FX.init&&FX.init();FX.shakeT=Math.max(FX.shakeT||0,t);FX.shakeA=Math.max(FX.shakeA||0,a)}catch(e){}},
  boom(x,y,z,r,dmg){try{GUN.addBoom(x,y,z,r,dmg)}catch(e){console.warn('[ars] boom',e)}},
  fwd(){const cp=Math.cos(cam.pitch||0);return [Math.sin(cam.yaw)*cp,-Math.sin(cam.pitch||0),Math.cos(cam.yaw)*cp]},
  open(x,z,m){return !insideAny(x,z,m,groundH(x,z)+1)&&groundH(x,z)>SL+.2},
  init(){if(this.ok)return;this.ok=1;SPAWNX.hook();
    SPAWNX.add('🛡 Tiger tank — drive and shoot',()=>TANK.spawn());SPAWNX.add('🛸 Kamikaze drone — fly it into a target',()=>DRONE.launch());SPAWNX.add('☢ Nuclear bomb — 650 m ahead',()=>NUKE.drop());
    // every explosion of the game deforms what is around it
    const ob=GUN.addBoom;GUN.addBoom=function(x,y,z,r,dmg,ig){try{DMG.blast(x,y,z,Math.max(3,r*.8),75)}catch(e){}return ob.apply(this,arguments)};
    this.holster();ANIM.push(dt=>{DMG.tick();TANK.update(dt);DRONE.update(dt);NUKE.update(dt);this.shellStep(dt);this.blockUi()});
    addEventListener('keydown',e=>{if(e.code==='KeyV')this.block=true;if(e.code==='KeyF'&&MODE.cur==='tank')TANK.fire()});addEventListener('keyup',e=>{if(e.code==='KeyV')this.block=false})},
  // ---- weapons: holster first, then draw; the katana blocks (hold V / the BLOCK button)
  mine(P){if(P===PLR)return true;try{for(const R of COOP.peers.values())if(R.P===P)return true}catch(e){}return false},
  holster(){const o=GUN.hold,A=this;GUN.hold=function(P,w,on){if(!P||!P.arms||!A.mine(P))return o.call(this,P,w,on);const cur=P._gi,want=on?w:-1,H=P._hs||(P._hs={out:0});
      if(cur!==undefined&&cur>=0&&want!==cur){   // another weapon (or none) is wanted: the one in the hand goes down first
        if(!H.out){H.out=1;if(P===PLR)A.snd(900,300,.12,.12,'bandpass')}
        o.call(this,P,cur,true);if(P._gp)P._gp.draw=-.24;
        if(!P._gs||P._gs.t<=0||P._gs.w!==cur){H.out=0;o.call(this,P,w,on);if(on&&P===PLR)A.snd(1400,700,.1,.14,'bandpass')}
        return}
      H.out=0;o.call(this,P,w,on);const W=WEAPONS[w];if(on&&P._gp&&P===PLR&&W&&W.melee)P._gp.block=A.block?1:0}},
  blocking(){return this.block&&GUN.armed&&WEAPONS[GUN.w]&&WEAPONS[GUN.w].melee&&!GUN.down},
  blockUi(){const show=!!(GUN.armed&&WEAPONS[GUN.w]&&WEAPONS[GUN.w].melee&&!MODE.cur&&started);let b=this.bb;
    if(!b){if(!show)return;b=this.bb=document.createElement('button');b.id='bBlock';b.textContent='BLOCK';b.style.cssText='position:absolute;right:calc(118px + env(safe-area-inset-right,0px));bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:12;width:74px;height:54px;border-radius:12px;border:1.5px solid rgba(255,255,255,.3);background:rgba(8,10,14,.85);color:#fff;font:800 11px system-ui;touch-action:none';
      b.onpointerdown=e=>{e.preventDefault();this.block=true};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{this.block=false};(document.getElementById('hud')||document.body).appendChild(b)}
    b.hidden=!show;if(!show)this.block=false;
    if(!this._bw){this._bw=1;const guard=(O,k)=>{if(!O||!O[k])return;const f=O[k];O[k]=function(v,...a){if(ARS.blocking()){v*=.25;ARS.snd(3200,1500,.06,.2,'bandpass')}return f.call(this,v,...a)}};try{guard(typeof BR!=='undefined'&&BR,'hurt');guard(typeof FAUNA!=='undefined'&&FAUNA,'hurt')}catch(e){}}},
  // ---- cannon shells
  shell(x,y,z,dx,dy,dz,v){const m=new THREE.Mesh(this.sg||(this.sg=new THREE.SphereGeometry(.14,6,5)),this.sm||(this.sm=new THREE.MeshBasicMaterial({color:0xffd27a})));scene.add(m);this.shells.push({m,x,y,z,vx:dx*v,vy:dy*v,vz:dz*v,t:0})},
  shellStep(dt){for(let i=this.shells.length-1;i>=0;i--){const s=this.shells[i];let hit=false;const n=Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy,s.vz)*dt/3));
      for(let k=0;k<n&&!hit;k++){const h=dt/n;s.vy-=9.8*h;s.x+=s.vx*h;s.y+=s.vy*h;s.z+=s.vz*h;if(s.y<=Math.max(groundH(s.x,s.z),SL)+.1||insideAny(s.x,s.z,.2,s.y))hit=true}
      s.t+=dt;s.m.position.set(s.x,s.y,s.z);if(hit||s.t>7){scene.remove(s.m);this.shells.splice(i,1);if(hit){this.boom(s.x,s.y+.3,s.z,11,150);this.snd(160,40,.9,.8)}}}}};

// ---------------------------------------------------------------------------------------------------- Tiger tank
const TANK={g:null,x:0,z:0,y:0,yaw:0,v:0,ty:0,el:0,cd:0,hp:100,rec:0,snT:0,
  build(){const g=new THREE.Group(),mb=new MB(),S=MBM.std,tx=MBM.tex(64,64,(c,w,h)=>{c.fillStyle='#26272a';c.fillRect(0,0,w,h);c.fillStyle='#4a4c50';for(let i=0;i<8;i++)c.fillRect(0,i*8,w,3)},true);tx.repeat.set(1,10);this.trk=tx;
    const M={hull:S(0x6b6a45,.85,.1),dark:S(0x4c4b33,.9,.1),steel:S(0x2c2d30,.6,.5),track:new THREE.MeshStandardMaterial({map:tx,roughness:.9})};
    mb.bx('hull',-1.45,1.45,.75,1.75,-3.1,3.0,2);mb.box('hull',2.9,.9,1.2,0,1.28,3.25,0,-.75,0);mb.bx('dark',-1.75,1.75,1.5,1.62,-3.1,3.0,2);                    // hull, sloped nose, fenders
    for(const s of [-1,1]){mb.bx('track',s*1.2,s*1.78,.0,.95,-3.2,3.25,1);for(let k=0;k<8;k++)mb.cyl('steel',.42,.42,.5,10,s*1.5,.48,-2.75+k*.8,0,0,Math.PI/2);
      mb.cyl('steel',.33,.33,.5,10,s*1.5,.72,3.2,0,0,Math.PI/2);mb.cyl('steel',.33,.33,.5,10,s*1.5,.72,-3.15,0,0,Math.PI/2);mb.cyl('steel',.09,.09,1.3,6,s*1.0,1.95,-2.9)}   // wheels, sprockets, exhausts
    mb.bx('dark',-1.2,1.2,1.75,1.86,-2.9,-1.6,1);mb.build(g,M);
    const T=new THREE.Group(),tb=new MB();tb.cyl('hull',1.42,1.5,.82,14,0,.41,-.1);tb.bx('hull',-1.0,1.0,.05,.78,-2.1,-.9,2);tb.cyl('dark',.38,.38,.3,10,-.55,.95,-.5);tb.bx('dark',-.75,.75,.12,.72,1.2,1.75,1);   // turret, bustle, cupola, mantlet
    tb.build(T,M);T.position.set(0,1.76,.25);g.add(T);this.T=T;
    const G=new THREE.Group(),gb=new MB();gb.cyl('steel',.085,.105,4.3,10,0,0,2.15,Math.PI/2);gb.cyl('steel',.15,.15,.5,10,0,0,4.3,Math.PI/2);gb.cyl('dark',.2,.2,.9,10,0,0,.3,Math.PI/2);gb.build(G,M);G.position.set(0,.42,1.5);T.add(G);this.G=G;
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(g);this.g=g;
    INTERACT.push({get x(){return TANK.x},get z(){return TANK.z},r:5.5,label:'Get in the Tiger tank',cond:()=>!!TANK.g&&TANK.g.visible&&!window.NOWALK&&!PORTAL.cur&&!player.sit,fn:()=>TANK.enter()})},
  spawn(){if(window.NOWALK||PORTAL.cur){toast('Tiger tank','not here');return}if(!this.g)this.build();let ok=null;
    for(const d of [10,14,18,24])for(const a of [0,.6,-.6,1.3,-1.3,2.4,-2.4,3.14]){const x=player.x+Math.sin(player.yaw+a)*d,z=player.z+Math.cos(player.yaw+a)*d;if(!ok&&ARS.open(x,z,3.4))ok=[x,z]}
    if(!ok){toast('Tiger tank','no open ground here');return}this.x=ok[0];this.z=ok[1];this.yaw=this.ty=player.yaw;this.v=0;this.hp=100;this.g.visible=true;this.place();toast('Tiger tank','walk up and get in · 57 tonnes');ARS.snd(120,50,.5,.5)},
  place(){this.y=groundH(this.x,this.z);const g=this.g,e=2.6,pz=Math.atan2(groundH(this.x+Math.sin(this.yaw)*e,this.z+Math.cos(this.yaw)*e)-groundH(this.x-Math.sin(this.yaw)*e,this.z-Math.cos(this.yaw)*e),2*e);
    g.position.set(this.x,this.y,this.z);g.rotation.set(-pz,this.yaw,0,'YXZ');this.T.rotation.y=this.ty-this.yaw;this.G.rotation.x=-this.el;this.G.position.z=1.5-this.rec*.45},
  enter(){MODE.enter('tank',[['FIRE',()=>this.fire()],['EXIT',()=>this.leave()]],true);cam.yaw=this.yaw;toast('Tiger tank','stick / WASD drive · look to aim · FIRE (F)')},
  leave(){MODE.leave();const x=this.x+Math.cos(this.yaw)*3.2,z=this.z-Math.sin(this.yaw)*3.2;player.x=x;player.z=z;player.y=groundH(x,z);player.vy=0;this.v=0},
  fire(){if(MODE.cur!=='tank'||this.cd>0)return;this.cd=2.6;this.rec=1;const ce=Math.cos(this.el),d=[Math.sin(this.ty)*ce,Math.sin(this.el),Math.cos(this.ty)*ce],mz=5.6;
    ARS.shell(this.x+d[0]*mz,this.y+2.2+d[1]*mz,this.z+d[2]*mz,d[0],d[1],d[2],210);ARS.snd(220,35,.7,.95);ARS.shake(.3,.3)},
  update(dt){if(!this.g||!this.g.visible)return;this.cd=Math.max(0,this.cd-dt);this.rec=Math.max(0,this.rec-dt*2.2);
    if(MODE.cur==='tank'){const k=inp.k,thr=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0)+(Math.abs(inp.jy)>.25?inp.jy:0),st=(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0)+(Math.abs(inp.jx)>.25?inp.jx:0);
      const tv=Math.max(-1,Math.min(1,thr))*(thr<0?5:11);this.v+=(tv-this.v)*Math.min(1,dt*1.3);this.yaw+=Math.max(-1,Math.min(1,st))*dt*.75*(this.v<-.5?-1:1);
      const nx=this.x+Math.sin(this.yaw)*this.v*dt,nz=this.z+Math.cos(this.yaw)*this.v*dt;
      if(Math.abs(this.v)>.05){if(!insideAny(nx,nz,2.2,groundH(nx,nz)+1.2)&&groundH(nx,nz)>SL-.6){this.x=nx;this.z=nz}else{if(Math.abs(this.v)>3)ARS.shake(.18,.2);this.v=0}}
      let dy=cam.yaw-this.ty;while(dy>Math.PI)dy-=6.2832;while(dy<-Math.PI)dy+=6.2832;this.ty+=Math.max(-dt*1.1,Math.min(dt*1.1,dy));this.el+=(Math.max(-.12,Math.min(.35,-(cam.pitch||0)+.08))-this.el)*Math.min(1,dt*3);
      this.trk.offset.y-=this.v*dt*.5;player.x=this.x;player.z=this.z;player.y=this.y;player.yaw=this.yaw;
      const cy=cam.yaw;window.DBGCAM=[this.x-Math.sin(cy)*11.5,this.y+5.4,this.z-Math.cos(cy)*11.5,this.x+Math.sin(cy)*9,this.y+2.3+this.el*9,this.z+Math.cos(cy)*9];
      this.snT-=dt;if(this.snT<=0){this.snT=.16;ARS.snd(70+Math.abs(this.v)*9,45,.14,.1+Math.abs(this.v)*.012)}}
    this.place()}};

// ---------------------------------------------------------------------------------------------------- kamikaze drone
const DRONE={on:false,p:null,v:0,dead:0,
  launch(){if(window.NOWALK||PORTAL.cur){toast('Kamikaze drone','not here');return}if(!this.p)this.p=new THREE.Vector3();
    this.p.set(player.x+Math.sin(player.yaw)*1.5,player.y+2.2,player.z+Math.cos(player.yaw)*1.5);this.home=[player.x,player.z];this.on=true;this.dead=0;this.v=8;this.arm=.7;this.why='';   // armed after 0.7 s: it must not blow up on the parasol next to the pilot
    cam.yaw=player.yaw;cam.pitch=0;
    MODE.enter('drone',[['DETONATE',()=>this.hit()],['ABORT',()=>this.end()]],false);toast('Kamikaze drone','look to steer · stick up = faster · it explodes on impact');ARS.snd(900,600,.3,.2,'bandpass')},
  hit(){if(!this.on||this.dead)return;this.dead=1.3;ARS.boom(this.p.x,this.p.y,this.p.z,12,150);ARS.snd(180,40,.9,.9);ARS.shake(.35,.4);this.lost=[this.p.x,this.p.y,this.p.z]},
  end(){this.on=false;MODE.leave()},
  update(dt){if(!this.on)return;const f=ARS.fwd(),p=this.p;
    if(this.dead>0){this.dead-=dt;const L=this.lost,k=1.3-this.dead;window.DBGCAM=[L[0]-f[0]*(6+k*10),L[1]+3+k*5,L[2]-f[2]*(6+k*10),L[0],L[1],L[2]];if(this.dead<=0)this.end();return}
    this.arm-=dt;const thr=inp.k.KeyW?1:inp.k.KeyS?-1:(Math.abs(inp.jy)>.2?inp.jy:0);this.v+=((thr>0?46:thr<0?10:26)-this.v)*Math.min(1,dt*1.5);
    p.x+=f[0]*this.v*dt;p.y+=f[1]*this.v*dt;p.z+=f[2]*this.v*dt;
    window.DBGCAM=[p.x,p.y,p.z,p.x+f[0]*10,p.y+f[1]*10,p.z+f[2]*10];
    this.bz=(this.bz||0)-dt;if(this.bz<=0){this.bz=.09;ARS.snd(520+this.v*9,480,.08,.05,'bandpass')}
    const why=inp.jump?'jump':p.y<=Math.max(groundH(p.x,p.z),SL)+.35?'ground':(this.arm<=0&&insideAny(p.x,p.z,.3,p.y))?'wall':Math.hypot(p.x-this.home[0],p.z-this.home[1])>420?'range':'';if(why){this.why=why;this.hit()}}};

// ---------------------------------------------------------------------------------------------------- nuclear bomb
const NUKE={t:-1,
  drop(){if(this.t>=0){toast('Nuclear bomb','one at a time');return}if(PORTAL.cur){toast('Nuclear bomb','not indoors');return}
    const d=650,x=player.x+Math.sin(player.yaw)*d,z=player.z+Math.cos(player.yaw)*d;this.x=x;this.z=z;this.y=Math.max(groundH(x,z),SL);this.t=0;this.det=false;
    if(!this.g){const g=this.g=new THREE.Group();this.bomb=new THREE.Mesh(new THREE.CylinderGeometry(.5,.25,3.2,8),new THREE.MeshStandardMaterial({color:0x33383c,roughness:.5,metalness:.5}));g.add(this.bomb);
      const cm=()=>new THREE.MeshBasicMaterial({color:0xffb060,transparent:true,opacity:1,fog:false});this.stem=new THREE.Mesh(new THREE.CylinderGeometry(16,26,1,14,1,true),cm());this.cap=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),cm());this.skirt=new THREE.Mesh(new THREE.TorusGeometry(1,.32,8,20),cm());this.skirt.rotation.x=Math.PI/2;
      this.ring=new THREE.Mesh(new THREE.RingGeometry(.92,1,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false,fog:false}));this.ring.rotation.x=-Math.PI/2;
      for(const m of [this.stem,this.cap,this.skirt,this.ring]){m.visible=false;m.frustumCulled=false;g.add(m)}scene.add(g);
      const f=this.fl=document.createElement('div');f.style.cssText='position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:80';document.body.appendChild(f);
      const w=this.ws=document.createElement('div');w.style.cssText='position:fixed;inset:0;background:radial-gradient(circle,rgba(120,84,40,.25),rgba(60,40,20,.6));opacity:0;pointer-events:none;z-index:8;mix-blend-mode:multiply';document.body.appendChild(w)}
    this.g.position.set(x,this.y,z);this.bomb.visible=true;toast('Nuclear bomb away','650 m ahead · look away from the flash');ARS.snd(1400,300,3.6,.25,'bandpass')},
  update(dt){if(this.t<0)return;const t=this.t+=dt,D=Math.hypot(player.x-this.x,player.z-this.z);
    if(!this.det){this.bomb.position.y=Math.max(0,520*(1-t/4));this.bomb.rotation.x=Math.PI;if(t>=4){this.det=true;this.bomb.visible=false;this.fl.style.transition='none';this.fl.style.opacity=1;
        DMG.blast(this.x,this.y+10,this.z,230,95);ARS.boom(this.x,this.y+2,this.z,140,400);this.heard=false;for(const m of [this.stem,this.cap,this.skirt,this.ring])m.visible=true}return}
    const u=t-4;if(u>.12){this.fl.style.transition='opacity 2.8s';this.fl.style.opacity=0}
    // shock wave: 340 m/s along the ground; when it reaches the player the ground shakes and the sound arrives
    const R=u*340;this.ring.scale.setScalar(Math.max(1,R));this.ring.position.y=1.5;this.ring.material.opacity=Math.max(0,.7*(1-R/1500));if(R>1500)this.ring.visible=false;
    if(!this.heard&&R>=D){this.heard=true;ARS.shake(.6,1.6);ARS.snd(140,22,4.5,1);ARS.snd(60,20,6,.9)}
    // mushroom: a column that rises for 30 s, a cap that swells, both cool from white-orange to grey and thin out
    const k=Math.min(1,u/30),h=40+300*(1-Math.pow(1-k,2)),hot=Math.max(0,1-u/9),fade=u<55?1:Math.max(0,1-(u-55)/35);
    this.stem.scale.set(1+k*.6,h,1+k*.6);this.stem.position.y=h/2;this.cap.scale.set(70+k*90,34+k*40,70+k*90);this.cap.position.y=h+12;this.skirt.scale.setScalar(52+k*74);this.skirt.position.y=h-18;
    for(const m of [this.stem,this.cap,this.skirt]){m.material.color.setRGB(.32+.68*hot,.3+.42*hot,.29+.1*hot);m.material.opacity=.92*fade}
    this.ws.style.opacity=u<3?u/3*.9:u<60?.9:Math.max(0,.9*(1-(u-60)/35));
    if(u>95){for(const m of [this.stem,this.cap,this.skirt,this.ring])m.visible=false;this.ws.style.opacity=0;this.t=-1;toast('The dust has settled','the city recovers')}}};
window.ARS=ARS;window.DMG=DMG;window.TANK=TANK;window.DRONE=DRONE;window.NUKE=NUKE;window.MODE=MODE;window.SPAWNX=SPAWNX;
