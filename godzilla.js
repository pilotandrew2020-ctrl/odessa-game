// godzilla.js — GODZILLA (2026-11-17, round 42): Spawn menu "Godzilla". You ARE him: a 75 m giant (taller than the houses) that walks through the city on the stick,
//   and LASER (hold the button / Space / L) bows the head, opens the jaw, lights the dorsal spines and fires an endless blue atomic beam: whatever it touches burns
//   and collapses into charred rubble (RUIN patches in nuke.js: the bomb's collapse shader without the bomb; they last 15 minutes). His feet, his body and his swinging tail
//   crush every block they touch. Round 43: the beam is blue and BURNS (blue sparks, black smoke, scorch), no fireballs, no mushroom clouds.
// Model: the owner's export of "Godzilla Minus One" by Nelzonis2 (CGTrader, free, credit required, not for sale): 44k triangles, a 143-bone skeleton, NO animation in
//   the file, so every movement here is made by turning bones about the model's own axes (x = side, y = up, z = forward): legs + knees + ankles for the walk, a tail
//   wave, breathing, the head / jaw for the beam. Textures were shrunk to <= 1536 px (tools/models/goji.mjs): 3.3 MB, loaded only the first time he is called.
const GOJI={on:false,g:null,x:0,y:0,z:0,yaw:0,ph:0,t:0,sp:0,cy:0,aim:-.2,fire:false,ch:0,hitT:0,stepT:0,K:2.73,
  URL:'assets/models/godzilla.glb',
  load(){return this._p||(this._p=new Promise((res,rej)=>new THREE.GLTFLoader().load(this.URL,g=>{const S=g.scene,B={};
    S.traverse(o=>{if(o.isBone)B[o.name]=o;if(o.isMesh){o.frustumCulled=false;o.castShadow=/Body|Thorn/.test(o.name);o.receiveShadow=false;
      const m=o.material;if(m&&/Dorsal|Thorn/i.test(m.name+o.name)){m.emissive=new THREE.Color(0x35e8ff);m.emissiveIntensity=.25;this.spine=m}}});
    this.S=S;this.B=B;res(S)},undefined,rej)))},
  // a bone turned about a MODEL axis (rest frames measured once, with the wrapper at the origin): local = rotation(axis seen from the parent's rest frame) * rest
  prep(){const S=this.S,root=this.g;root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);root.updateMatrixWorld(true);const q=new THREE.Quaternion();this.R={};
    for(const n in this.B){const b=this.B[n],P=b.parent;P.getWorldQuaternion(q);this.R[n]={rest:b.quaternion.clone(),pinv:q.clone().invert(),pos:b.position.clone()}}},
  _q:new THREE.Quaternion(),_a:new THREE.Vector3(),
  // (three's loader drops the dots of node names: leg.L -> legL)
  turn(n,ax,ay,az,ang){n=n.replace(/\./g,'');const b=this.B[n],r=this.R&&this.R[n];if(!b||!r)return;const a=this._a.set(ax,ay,az).applyQuaternion(r.pinv).normalize();b.quaternion.copy(this._q.setFromAxisAngle(a,ang)).multiply(r.rest)},
  build(){if(this.g)return;const g=this.g=new THREE.Group();g.visible=false;scene.add(g);
    // the beam: a bright core + a wide soft glow (two additive cylinders along +y, stretched each frame) + a flare at the mouth and a splash where it lands
    const add=(r,c,o)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,14,1,true).translate(0,.5,0),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false,side:THREE.DoubleSide}));m.frustumCulled=false;return m};
    const beam=this.beam=new THREE.Group();beam.add(add(2.2,0xb4ecff,1),add(5.5,0x2e9bff,.55),add(11,0x1546ff,.22));beam.visible=false;scene.add(beam);
    const sp=(r,c,o)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,10),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));m.frustumCulled=false;return m};
    this.flare=sp(7,0x5ad2ff,.85);this.splash=sp(18,0x3aa0ff,.5);this.flare.visible=this.splash.visible=false;scene.add(this.flare,this.splash);
    const s=document.createElement('style');s.textContent=`body.gojion #hud *{visibility:hidden}body.gojion #joy,body.gojion #joy *{visibility:visible}body.gojion #actBtns,body.gojion #bAct,body.gojion #quickRow,body.gojion #gunBar{display:none!important}
#gojiHud{position:fixed;inset:0;z-index:39;pointer-events:none;font:800 12px var(--f-disp,system-ui);color:#dffbff;text-shadow:0 0 6px #000}#gojiHud[hidden]{display:none}
#gojiLook{position:absolute;right:0;top:0;width:62%;height:100%;pointer-events:auto;touch-action:none}
#gojiBtns{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom,0px));display:flex;gap:10px;align-items:flex-end;pointer-events:auto}
#gojiBtns button{width:84px;height:84px;border-radius:14px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#e3edf1;font:800 12px var(--f-disp,system-ui);letter-spacing:.1em;text-transform:uppercase;touch-action:none}
#gojiFire{width:118px!important;height:118px!important;border-radius:50%!important;border-color:rgba(80,230,255,.9)!important;color:#7ff4ff!important;box-shadow:0 0 24px rgba(60,220,255,.45)}
#gojiInfo{position:absolute;left:max(14px,env(safe-area-inset-left));top:calc(14px + env(safe-area-inset-top,0px));padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,#191c23,#07080b);border:1px solid rgba(255,255,255,.13);line-height:1.6}#gojiInfo b{display:block;font-size:11px;letter-spacing:.2em;color:#38e4d0}`;
    document.head.appendChild(s);
    const d=this.el=document.createElement('div');d.id='gojiHud';d.hidden=true;d.innerHTML='<div id="gojiLook"></div><div id="gojiInfo"><b>GODZILLA</b>stick: walk · drag: look / aim · hold LASER</div><div id="gojiBtns"><button id="gojiExit">Exit</button><button id="gojiFire">Laser</button></div>';document.body.appendChild(d);
    const F=d.querySelector('#gojiFire'),on=e=>{e.preventDefault();e.stopPropagation();this.fire=true},off=e=>{this.fire=false};F.addEventListener('pointerdown',on);for(const k of ['pointerup','pointercancel','pointerleave'])F.addEventListener(k,off);
    d.querySelector('#gojiExit').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.end()});
    const lk=d.querySelector('#gojiLook');let id=null,lx=0,ly=0;lk.addEventListener('pointerdown',e=>{id=e.pointerId;lx=e.clientX;ly=e.clientY;try{lk.setPointerCapture(id)}catch(x){}});
    lk.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;this.cy-=(e.clientX-lx)*.005;this.aim=Math.max(-.9,Math.min(.25,this.aim-(e.clientY-ly)*.003));lx=e.clientX;ly=e.clientY});
    const up=e=>{if(e.pointerId===id)id=null};lk.addEventListener('pointerup',up);lk.addEventListener('pointercancel',up);
    addEventListener('keydown',e=>{if(!this.on)return;if(e.code==='Space'||e.code==='KeyL'){this.fire=true;e.preventDefault();e.stopPropagation()}else if(e.code==='Escape')this.end()},true);
    addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='KeyL')this.fire=false},true)},
  async spawn(){if(this.on||this.busy)return;if(typeof DRONE!=='undefined'&&DRONE.on||typeof TANK!=='undefined'&&TANK.on)return;this.busy=1;this.build();toast('Godzilla','he is coming…');
    try{const S=await this.load();if(!this.g.children.includes(S)){this.g.add(S);this.prep()}}catch(e){this.busy=0;console.warn('[godzilla]',e);toast('Godzilla','the model failed to load, check the connection');return}
    this.busy=0;this.home={x:player.x,z:player.z,yaw:player.yaw};this.yaw=player.yaw;this.x=player.x+Math.sin(this.yaw)*45;this.z=player.z+Math.cos(this.yaw)*45;this.y=this.gy(this.x,this.z);
    this.g.scale.setScalar(this.K);this.g.visible=true;this.on=true;this.t=this.ph=this.sp=this.ch=0;this.cy=0;this._cp=null;this.fire=false;document.body.classList.add('gojion');this.el.hidden=false;if(PLR)PLR.root.visible=false;cam.init=false;
    toast('GODZILLA','stick: walk · drag: look and aim · hold LASER')},
  end(){if(!this.on)return;this.on=false;this.fire=false;this.g.visible=false;this.beam.visible=this.flare.visible=this.splash.visible=false;document.body.classList.remove('gojion');this.el.hidden=true;
    const s=this.yaw+Math.PI/2;teleportRaw(this.x+Math.sin(s)*35,this.z+Math.cos(s)*35,this.yaw);if(PLR)PLR.root.visible=true;cam.init=false},
  gy(x,z){return Math.max(groundH(x,z),SL-18)},   // he wades into the sea up to his chest
  // the walk, breathing and the beam pose; all angles in radians about the model axes
  pose(dt){const p=this.ph,w=Math.min(1,this.sp/6),t=this.t,c=this.ch,T=(n,x,y,z,a)=>this.turn(n,x,y,z,a);
    const sL=Math.sin(p),sR=Math.sin(p+Math.PI);
    T('leg.L',1,0,0,-sL*.32*w);T('leg.R',1,0,0,-sR*.32*w);
    T('knee.L',1,0,0,Math.max(0,Math.cos(p))*.42*w);T('knee.R',1,0,0,Math.max(0,Math.cos(p+Math.PI))*.42*w);
    T('ankle.L',1,0,0,(sL*.18-Math.max(0,Math.cos(p))*.2)*w);T('ankle.R',1,0,0,(sR*.18-Math.max(0,Math.cos(p+Math.PI))*.2)*w);
    T('arm.L',1,0,0,sR*.12*w+.04*Math.sin(t*1.1));T('arm.R',1,0,0,sL*.12*w+.04*Math.sin(t*1.1+1));
    T('lowerbody',0,1,0,sL*.06*w);T('spine',0,0,1,sL*.025*w);
    for(let i=0;i<10;i++){const n=i?'tail'+(i+1):'tail';T(n,0,1,0,Math.sin(t*1.3-i*.55)*(.035+.03*w)+sL*.02*w)}
    T('neck',1,0,0,.03*Math.sin(t*1.1)+c*.14);T('neck2',1,0,0,c*.12);T('head',1,0,0,c*.2-.02*w*Math.sin(p*2));T('jaw',1,0,0,c*.5+.03*Math.sin(t*2));
    const cb=this.B.center,r=this.R&&this.R.center;if(cb&&r)cb.position.y=r.pos.y+Math.abs(Math.cos(p))*.25*w},
  frame(dt){if(!this.on)return;dt=Math.min(dt,.05);this.t+=dt;const I=inp,K=I.k||{};
    const fw=Math.max(-1,Math.min(1,I.jy+(K.KeyW?1:0)-(K.KeyS?1:0))),tn=Math.max(-1,Math.min(1,I.jx+(K.KeyD?1:0)-(K.KeyA?1:0)));
    const firing=this.fire&&this.ch>.75,want=firing?0:Math.max(0,fw)*7.5-Math.max(0,-fw)*2.5;this.sp+=(want-this.sp)*Math.min(1,dt*2);this.yaw-=tn*.55*dt*(firing?.4:1);
    const fx=Math.sin(this.yaw),fz=Math.cos(this.yaw);this.x+=fx*this.sp*dt;this.z+=fz*this.sp*dt;this.y+=(this.gy(this.x,this.z)-this.y)*Math.min(1,dt*4);
    const p0=this.ph;this.ph+=dt*Math.abs(this.sp)*.36;
    if(Math.floor(p0/Math.PI)!==Math.floor(this.ph/Math.PI)&&Math.abs(this.sp)>.5)this.step(Math.floor(this.ph/Math.PI)%2?1:-1);   // a foot comes down
    this.ch+=((this.fire?1:0)-this.ch)*Math.min(1,dt*(this.fire?1.6:3));
    this.g.position.set(this.x,this.y,this.z);this.g.rotation.y=this.yaw;this.pose(dt);
    if(this.spine)this.spine.emissiveIntensity=.25+this.ch*3.2+(firing?Math.random()*.8:0);
    player.x=this.x;player.z=this.z;player.y=this.y;player.vx=player.vz=0;   // the world streams round him
    this.g.updateMatrixWorld(true);this.crush(dt);this.burnTick(dt);this.laser(dt,firing);this.camera(dt)},
  step(side){if(typeof FX!=='undefined'){FX.shakeT=.35;FX.shakeA=.06}const s=this.yaw+Math.PI/2*side,x=this.x+Math.sin(s)*6+Math.sin(this.yaw)*8,z=this.z+Math.cos(s)*6+Math.cos(this.yaw)*8;
    if(insideAny(x,z,6,this.y+2)){try{RUIN.add(x,z,26);BLAST.at(x,this.y+2,z,8,0,true)}catch(e){}}},
  // spots the beam burned keep smoking for 40 s (black smoke, now and then a blue ember)
  burn:[],burnAt(x,y,z){if(this.burn.some(b=>Math.hypot(b.x-x,b.z-z)<14))return;this.burn.push({x,y,z,t:0});if(this.burn.length>18)this.burn.shift()},
  burnTick(dt){if(typeof FX==='undefined')return;for(let i=this.burn.length-1;i>=0;i--){const b=this.burn[i];b.t+=dt;if(b.t>40){this.burn.splice(i,1);continue}
    if(Math.random()<dt*2.2)FX.puff({x:b.x+(Math.random()-.5)*10,y:b.y+2,z:b.z+(Math.random()-.5)*10,vx:(Math.random()-.5),vy:4+Math.random()*3,vz:(Math.random()-.5),s0:5,s1:16,life:6,c0:[.09,.09,.1],c1:[.2,.2,.22],op:.55,add:false,drag:.3,grow:1});
    if(Math.random()<dt*1.5)FX.puff({x:b.x+(Math.random()-.5)*8,y:b.y+1,z:b.z+(Math.random()-.5)*8,vx:0,vy:3,vz:0,s0:1.2,s1:.2,life:.8,c0:[.4,.8,1],c1:[.1,.3,1],op:.9,add:true,drag:1,grow:1})}},
  // his body and his tail crush every block they touch (sampled 5 times a second while he moves or swings)
  _w:new THREE.Vector3(),crushT:0,
  crush(dt){this.crushT-=dt;if(this.crushT>0)return;this.crushT=.2;const pts=[[this.x,this.z,12]];
    for(const n of ['tail2','tail4','tail6','tail8']){const b=this.B[n];if(b){b.getWorldPosition(this._w);pts.push([this._w.x,this._w.z,9])}}
    let hit=false;for(const [x,z,r] of pts)if(insideAny(x,z,r,this.y+4)){if(RUIN.add(x,z,30))hit=true}
    if(hit&&typeof FX!=='undefined'){FX.shakeT=.4;FX.shakeA=.07}},
  _v:new THREE.Vector3(),_d:new THREE.Vector3(),_e:new THREE.Vector3(),
  laser(dt,on){const B=this.beam;if(!on){B.visible=this.flare.visible=this.splash.visible=false;return}
    const m=this._v,mb=this.B.tongue2||this.B.jaw||this.B.head;mb.getWorldPosition(m);m.addScaledVector(this._d.set(Math.sin(this.yaw),0,Math.cos(this.yaw)),6);
    const ca=Math.cos(this.aim),d=this._d.set(Math.sin(this.yaw)*ca,Math.sin(this.aim),Math.cos(this.yaw)*ca).normalize(),e=this._e.copy(m);let L=700;
    for(let s=6;s<=700;s+=5){const x=m.x+d.x*s,y=m.y+d.y*s,z=m.z+d.z*s;if(y<=Math.max(groundH(x,z),SL)||insideAny(x,z,1.5,y)){L=s;break}}
    e.copy(m).addScaledVector(d,L);B.visible=this.flare.visible=true;B.position.copy(m);B.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);const fl=.85+Math.random()*.3;B.scale.set(fl,L,fl);
    this.flare.position.copy(m);this.flare.scale.setScalar(.8+Math.random()*.5);
    const hit=L<700;this.splash.visible=hit;if(hit){this.splash.position.copy(e);this.splash.scale.setScalar(.7+Math.random()*.6)}
    if(typeof FX!=='undefined'){FX.shakeT=Math.max(FX.shakeT||0,.12);FX.shakeA=Math.max(FX.shakeA||0,.025)}
    this.hitT-=dt;if(hit&&this.hitT<=0){this.hitT=.3;try{BLAST.at(e.x,e.y,e.z,12,90,true);if(BLAST.mark)BLAST.mark(e.x,e.z,12);RUIN.add(e.x,e.z,40);this.burnAt(e.x,e.y,e.z)}catch(err){console.warn('[godzilla] beam',err)}}
    if(hit&&typeof FX!=='undefined'){FX.init();for(let i=0;i<3;i++)FX.puff({x:e.x,y:e.y+1,z:e.z,vx:(Math.random()-.5)*26,vy:6+Math.random()*16,vz:(Math.random()-.5)*26,s0:.6,s1:.15,life:.5+Math.random()*.4,c0:[.55,.85,1],c1:[.1,.35,1],op:1,add:true,drag:1.5,grow:1})}},   // blue sparks fly off where it burns
  // the camera: behind, above the head and a little to the right (over the shoulder); while the beam charges it swings round to a 3/4 view from his right, so the beam runs across the screen instead of away from you
  camera(dt){const a=this.yaw+this.cy+Math.PI-this.ch*1.05,D=135,sd=this.yaw+this.cy-Math.PI/2,h=this.y+98;const tx=this.x+Math.sin(a)*D+Math.sin(sd)*32,tz=this.z+Math.cos(a)*D+Math.cos(sd)*32,ty=Math.max(h,this.gy(tx,tz)+6);
    if(!this._cp)this._cp=new THREE.Vector3(tx,ty,tz);this._cp.lerp(this._e.set(tx,ty,tz),Math.min(1,dt*3));camera.position.copy(this._cp);
    const fa=this.yaw+this.cy;camera.lookAt(this.x+Math.sin(fa)*70,this.y+28+this.aim*60,this.z+Math.cos(fa)*70)}
};
