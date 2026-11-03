/* ===================================================================================================
   yacht.js — «Odesa Pearl»: a 44 m motor yacht you can board, walk through, drive and cruise on. Model: ybuild.js · walking: mp.js.
   • Marina jetty at the Velykyi Fontan beach (walk out along it, E to board) — or E anywhere near the yacht: the tender takes you over
   • sit at the helm (E on the left chair): W/S throttle, A/D rudder, autopilot to Jungle Island, anchor, horn, bridge / chase camera
   • leave the helm and the yacht keeps its course and speed: walk about, sit, lie in the sun, raid the galley; E on the swim platform = ashore
   • crew and guests (real avatars): captain, first officer, chef, bartender, deckhand, dancers, sunbathers
   =================================================================================================== */
class Yacht{
  constructor(){
    const B=buildYachtModel();this.root=B.root;this.plat=B.plat;this.dyn=B.dyn;this.spots=B.spots;this.M=B.M;this.plat.owner=this;this.root.userData.yacht=this;
    this.x=0;this.z=0;this.yaw=0;this.y=SL;this.vy=0;this.u=0;this.yawRate=0;this.thr=0;this.thrT=0;this.rud=0;this.pitch=0;this.roll=0;this.touchSteer=0;
    this.npcs=[];this.auto=null;this.helm=false;this.camMode='bridge';this.liveT=0;this.lightsOn=true;this.crashT=0;this.sprayT=0;this.eng=null;this.home=null;
    this.root.rotation.order='YXZ';this.root.visible=true;
    // wake: a soft white wedge behind the hull
    if(!Yacht.WK){const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.95)');x.fillStyle=g;x.fillRect(0,0,64,128);
      const h=x.createLinearGradient(0,0,64,0);h.addColorStop(0,'rgba(0,0,0,1)');h.addColorStop(.3,'rgba(0,0,0,0)');h.addColorStop(.7,'rgba(0,0,0,0)');h.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=h;x.fillRect(0,0,64,128);Yacht.WK=new THREE.CanvasTexture(c)}
    const wg=new THREE.PlaneGeometry(1,1);wg.rotateX(-Math.PI/2);wg.translate(0,0,-.5);
    this.wake=new THREE.Mesh(wg,new THREE.MeshBasicMaterial({map:Yacht.WK,transparent:true,depthWrite:false,opacity:0}));this.wake.renderOrder=3;this.wake.visible=false;scene.add(this.wake);
    const A=this.plat.acts;
    A.push({x:0,y:.9,z:-22,r:3.2,label:'Go ashore (tender)',fn:()=>YACHT.goAshore()});
    A.push({x:3.55,y:2.9,z:.7,r:1.6,label:'Go ashore (tender)',fn:()=>YACHT.goAshore()});A.push({x:-3.55,y:2.9,z:.7,r:1.6,label:'Go ashore (jetty / tender)',fn:()=>YACHT.goAshore()});
    A.push({x:0,y:2.9,z:1.6,r:1.5,label:()=>YACHT.y&&YACHT.y.lightsOn?'Turn the lights off':'Turn the lights on',fn:()=>{const y=YACHT.y;y.lightsOn=!y.lightsOn}});
    A.push({x:0,y:8.1,z:.5,r:1.5,label:"Ring the ship's horn",fn:()=>YACHT.horn()});
    this.plat.update=(dt,mp)=>this.platUpdate(dt,mp);
    this.plat.camera=(dt,mp)=>this.platCamera(dt,mp);
    this.plat.onExit=()=>{this.thrT=0;this.helm=false;this.panel(false)};
    this.sync()}
  // ---------- placing ----------
  place(x,z,yaw){this.x=x;this.z=z;this.yaw=yaw;this.u=0;this.thr=this.thrT=0;this.yawRate=0;this.auto=null;this.sync()}
  sync(){this.root.position.set(this.x,this.y,this.z);this.root.rotation.set(this.pitch,this.yaw,this.roll,'YXZ')}
  // hull and a 3 m skirt over water deeper than the draught (2.4 m with clearance)
  fits(x,z,yaw){const fx=Math.sin(yaw),fz=Math.cos(yaw),lx=Math.cos(yaw),lz=-Math.sin(yaw);
    for(const [a,b] of [[0,0],[17,0],[-17,0],[9,3.2],[-9,3.2],[9,-3.2],[-9,-3.2],[0,3.6],[0,-3.6],[21,0],[-21,0]]){const px=x+fx*a+lx*b,pz=z+fz*a+lz*b;if(groundH(px,pz)>SL-2.7)return false}return true}
  // ---------- physics ----------
  step(dt){
    const maxF=46,maxR=7;let steer=this.touchSteer;
    if(this.helm){const k=inp.k;if(k.KeyA||k.ArrowLeft)steer+=1;if(k.KeyD||k.ArrowRight)steer-=1;steer-=inp.jx;
      let th=inp.jy+((k.KeyW||k.ArrowUp)?1:0)-((k.KeyS||k.ArrowDown)?1:0);if(th)this.thrT=Math.max(-.2,Math.min(1,this.thrT+th*dt*.32));if(k.KeyX)this.thrT=0}
    // autopilot: steer to the bearing, ease off on the approach
    if(this.auto){const dx=this.auto.x-this.x,dz=this.auto.z-this.z,dist=Math.hypot(dx,dz),brg=Math.atan2(dx,dz);let d=brg-this.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;
      steer=Math.max(-1,Math.min(1,d*2.4));if(!this.auto.manualThr&&this.thrT>.02)this.thrT=Math.min(this.thrT,Math.max(.04,Math.min(1,(dist-120)/1100)));
      if(Math.abs(d)>.9&&this.u<8)this.thrT=Math.max(this.thrT,.12);
      if(dist<90){const n=this.auto.name;this.auto=null;this.thrT=0;toast('Arrived · '+n,'the captain drops anchor');}}
    this.thr+=(this.thrT-this.thr)*Math.min(1,dt*.5);
    const tgt=this.thr>=0?this.thr*maxF:this.thr*maxR*5;
    this.u+=(tgt-this.u)*(1-Math.exp(-dt/(this.thr>this.u/maxF?7:3.6)));
    this.rud+=(Math.max(-1,Math.min(1,steer))-this.rud)*Math.min(1,dt*1.8);
    const fl=.5+.5*Math.min(1,Math.abs(this.u)/5),yrT=this.rud*fl*(.2-.1*Math.min(1,Math.abs(this.u)/40))*(this.u<-.5?-1:1);   // a bow thruster lets it pivot slowly even at a standstill
    this.yawRate+=(yrT-this.yawRate)*Math.min(1,dt*1.1);
    const nyaw=this.yaw+this.yawRate*dt,fx=Math.sin(nyaw),fz=Math.cos(nyaw),nx=this.x+fx*this.u*dt,nz=this.z+fz*this.u*dt;
    if(Math.abs(this.u)>.05||Math.abs(this.yawRate)>.002){
      if(this.fits(nx,nz,nyaw)){this.x=nx;this.z=nz;this.yaw=nyaw}
      else{if(Math.abs(this.u)>2.5&&this.crashT<=0){this.crashT=1.5;if(typeof crashSound==='function')crashSound(Math.abs(this.u));if(MP.on&&MP.plat===this.plat){FX.init();FX.shakeT=.6;FX.shakeA=Math.max(FX.shakeA||0,.25);toast('Aground','the captain cuts the engines')}}
        this.u*=-.15;this.thr=this.thrT=0;this.auto=null;this.yawRate=0}}
    if(this.crashT>0)this.crashT-=dt;
    // sea: the swell lifts the hull (heavy: a third of the wave height), pitch and roll follow the slope under it
    const t=UNI.uTime.value,f=[Math.sin(this.yaw),Math.cos(this.yaw)],l=[Math.cos(this.yaw),-Math.sin(this.yaw)];
    const hB=waveH(this.x+f[0]*15,this.z+f[1]*15,t),hS=waveH(this.x-f[0]*15,this.z-f[1]*15,t),hL=waveH(this.x+l[0]*3.8,this.z+l[1]*3.8,t),hR=waveH(this.x-l[0]*3.8,this.z-l[1]*3.8,t);
    const sp=Math.min(1,Math.abs(this.u)/maxF),target=SL+(hB+hS+hL+hR)/4*.45-.1+sp*sp*.15;
    this.vy+=((target-this.y)*10-this.vy*4.2)*dt;this.y+=this.vy*dt;
    const pT=-Math.atan((hB-hS)/30)*.55-.012-.03*sp,rT=Math.atan((hL-hR)/7.6)*.5+Math.max(-.12,Math.min(.12,-this.yawRate*this.u*.012));
    this.pitch+=(pT-this.pitch)*Math.min(1,dt*1.6);this.roll+=(rT-this.roll)*Math.min(1,dt*1.6);
    this.sync();
    // wake + bow spray
    const w=this.wake;w.visible=sp>.03;if(w.visible){w.position.set(this.x-f[0]*20,SL+.05,this.z-f[1]*20);w.rotation.y=this.yaw;w.scale.set(8+sp*10,1,24+sp*70);w.material.opacity=.7*sp}
    if(sp>.2){this.sprayT-=dt;if(this.sprayT<=0){this.sprayT=.12;FX.init();for(const sg of [1,-1])FX.puff({x:this.x+f[0]*17+l[0]*sg*1.2,y:SL+.3,z:this.z+f[1]*17+l[1]*sg*1.2,vx:l[0]*sg*(2+sp*3),vy:2+sp*3,vz:l[1]*sg*(2+sp*3),s0:.6,s1:2.2,life:.9,c0:[1,1,1],c1:[.8,.9,1],op:.5,add:false,drag:1.5,grow:1})}}}
  // ---------- helm ----------
  platUpdate(dt,mp){const s=mp.seat,h=!!(s&&s.helm);if(h!==this.helm){this.helm=h;this.panel(h);if(h){this.camMode='bridge';cam.pitch=Math.max(cam.pitch,.05);toast('At the helm','W/S throttle · A/D rudder · autopilot, anchor and horn on the panel')}else{this.touchSteer=0;if(this.u>1)toast('Course held','the yacht keeps sailing · E on the swim platform when you want to go ashore')}}}
  platCamera(dt,mp){const s=mp.seat;if(!(s&&s.helm))return false;
    if(this.camMode==='chase'){const d=Math.max(34,cam.dist*7),p=Math.max(.14,cam.pitch*.6),cp=Math.cos(p),sp=Math.sin(p);if(!freeLook()){let dy=this.yaw-cam.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;cam.yaw+=dy*Math.min(1,dt*1.2)}
      const wx=this.x-Math.sin(cam.yaw)*cp*d,wy=Math.max(SL+3,this.y+9+sp*d),wz=this.z-Math.cos(cam.yaw)*cp*d;if(!cam.init){cam.x=wx;cam.y=wy;cam.z=wz;cam.init=true}const k=Math.min(1,dt*4);cam.x+=(wx-cam.x)*k;cam.y+=(wy-cam.y)*k;cam.z+=(wz-cam.z)*k;
      camera.position.set(cam.x,cam.y,cam.z);camera.lookAt(this.x+Math.sin(this.yaw)*8,this.y+5,this.z+Math.cos(this.yaw)*8);PLR.root.visible=true;return true}
    // bridge: eyes of the helmsman, look anywhere
    const e=MP.toWorld(this.plat,s.x,s.y+1.15,s.z,MP._v),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);PLR.root.visible=false;cam.x=e.x;cam.y=e.y;cam.z=e.z;cam.init=true;
    camera.position.copy(e);camera.lookAt(e.x+Math.sin(cam.yaw)*cp,e.y+sp,e.z+Math.cos(cam.yaw)*cp);return true}
  // ---------- helm panel (DOM) ----------
  panel(on){let p=document.getElementById('yHelm');
    if(!p){p=document.createElement('div');p.id='yHelm';p.hidden=true;
      p.innerHTML='<div class="yRow"><b>ODESA PEARL</b><span id="yRd">0 kn · 000°</span></div>'+
        '<div class="yRow"><button data-a="thrD">▼</button><div class="yBar"><i id="yThr"></i></div><button data-a="thrU">▲</button><button data-a="stop">⚓ Stop</button></div>'+
        '<div class="yRow"><button data-a="L" class="hold">◀ Left</button><button data-a="R" class="hold">Right ▶</button><button data-a="horn">📯 Horn</button><button data-a="cam">🎥 Camera</button></div>'+
        '<div class="yRow"><button data-a="isle">🏝 Autopilot: Jungle Island</button><button data-a="home">⛵ Marina</button><button data-a="off">Manual</button></div>';
      const st=document.createElement('style');st.textContent='#yHelm{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:7;display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:14px;background:rgba(10,22,30,.78);border:1px solid rgba(255,255,255,.18);color:#fff;font:600 12px system-ui;backdrop-filter:blur(6px);max-width:96vw;touch-action:none;user-select:none}#yHelm .yRow{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}#yHelm b{letter-spacing:.14em;color:#f2c14e}#yHelm button{padding:9px 12px;border-radius:10px;border:1.5px solid rgba(255,255,255,.25);background:rgba(40,60,80,.85);color:#fff;font:700 12px system-ui;touch-action:none}#yHelm button:active{background:#f2c14e;color:#111}#yHelm .yBar{width:120px;height:10px;border-radius:6px;background:rgba(255,255,255,.18);overflow:hidden}#yHelm .yBar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3ad07a,#f2c14e)}@media (max-height:430px){#yHelm{bottom:6px;padding:6px 8px;font-size:11px}#yHelm button{padding:6px 9px}}';document.head.appendChild(st);
      (document.getElementById('hud')||document.body).appendChild(p);
      const Y=()=>YACHT.y;
      p.addEventListener('pointerdown',e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;const y=Y();if(!y)return;e.preventDefault();
        if(a==='thrU')y.thrT=Math.min(1,Math.max(0,y.thrT)+.2);else if(a==='thrD')y.thrT=Math.max(-.2,y.thrT-.2);else if(a==='stop'){y.thrT=0;y.auto=null;toast('Anchor','engines idle')}
        else if(a==='L')y.touchSteer=1;else if(a==='R')y.touchSteer=-1;else if(a==='horn')YACHT.horn();else if(a==='cam')y.camMode=y.camMode==='bridge'?'chase':'bridge';
        else if(a==='isle')YACHT.goto('jungle');else if(a==='home')YACHT.goto('home');else if(a==='off'){y.auto=null;toast('Manual steering','')}});
      const up=()=>{const y=Y();if(y)y.touchSteer=0};addEventListener('pointerup',up);addEventListener('pointercancel',up)}
    p.hidden=!on}
  // ---------- avatars aboard ----------
  npcInit(){if(this.npcs.length)return;
    const P_=this.plat,mk=()=>{const P=makePlayer(CHAR.opts(CHAR.random()));P.root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false}});try{mergeAvatar(P.root)}catch(e){}this.root.add(P.root);return P};
    const nearSeat=(x,y,z)=>{let b=null,bd=1.2;for(const s of P_.seats){if(s.who||s.helm)continue;const d=Math.hypot(s.x-x,s.z-z)+Math.abs(s.y+.45-y)*.5;if(d<bd){bd=d;b=s}}return b};
    const add=(o)=>{const P=mk();const n=Object.assign({P,x:0,y:0,z:0,yaw:0,mode:'stand',t:Math.random()*6,v:0},o);
      if(o.seatAt){const s=nearSeat(...o.seatAt);if(s){s.who='npc';n.x=s.x;n.y=s.y;n.z=s.z;n.yaw=s.yaw;n.mode='sit'}else{n.x=o.seatAt[0];n.z=o.seatAt[2];n.y=o.seatAt[1]-.45}}
      P.root.position.set(n.x,n.y,n.z);P.root.rotation.y=n.yaw;this.npcs.push(n);return n};
    const UP=Y_FL.up,MS=Y_FL.main,SD=Y_FL.sun;
    add({seatAt:[-1.1,UP+.52,5.6],role:'first officer'});                                  // second chair on the bridge
    add({mode:'stand',x:1.55,y:MS,z:10.6,yaw:Math.PI/2,role:'chef'});                      // galley, facing the port counter
    add({mode:'stand',x:0,y:SD,z:-.85,yaw:Math.PI,role:'bartender'});                      // behind the sun-deck bar
    add({seatAt:[-2.4,MS+.42,-19.65],role:'guest'});add({seatAt:[-1.5,MS+.42,-19.65],role:'guest'});   // transom sofa
    add({seatAt:[1.2+1.05,MS+.46,-15.3],role:'guest'});                                    // aft dining table
    add({seatAt:[-2.4,SD+.38,-3.4],role:'guest'});                                         // sun lounger
    add({seatAt:[-1.0,SD+.58,-5.45],role:'guest'});add({seatAt:[1.0,SD+.58,-5.45],role:'guest'}); // jacuzzi
    add({mode:'dance',x:-.6,y:UP,z:-3.0,yaw:.6,role:'dancer'});add({mode:'dance',x:.7,y:UP,z:-3.4,yaw:-2.4,role:'dancer'});
    add({mode:'walk',x:-3.62,y:MS,z:-6,yaw:0,role:'deckhand',wp:[[-3.62,-8],[-3.55,4]],wi:1});
    for(const n of this.npcs){if(n.mode==='dance'&&typeof POSE!=='undefined')POSE.emote(n.P,'default')}}
  npcUpdate(dt){const near=Math.hypot(this.x-player.x,this.z-player.z)<260;for(const n of this.npcs){n.P.root.visible=near}
    if(!near)return;
    for(const n of this.npcs){const P=n.P;
      if(n.mode==='sit'){animPlayer(P,{spd:0,mode:'sit'},dt)}
      else if(n.mode==='dance'){animPlayer(P,{spd:0,mode:'walk'},dt)}
      else if(n.mode==='walk'){const w=n.wp[n.wi],dx=w[0]-n.x,dz=w[1]-n.z,d=Math.hypot(dx,dz);
        if(d<.4){n.pause=(n.pause||0)+dt;n.v*=.8;if(n.pause>2.5){n.pause=0;n.wi=(n.wi+1)%n.wp.length}}
        else{n.pause=0;const sp=1.3,o={lx:n.x,ly:n.y,lz:n.z};MP.slide(this.plat,o,dx/d*sp*dt,dz/d*sp*dt,.25,.55);n.x=o.lx;n.z=o.lz;n.v+=(sp-n.v)*Math.min(1,dt*5);
          let ty=Math.atan2(dx,dz),dy=ty-n.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;n.yaw+=dy*Math.min(1,dt*6)}
        P.root.position.set(n.x,n.y,n.z);P.root.rotation.y=n.yaw;animPlayer(P,{spd:n.v,mode:'walk'},dt)}
      else{animPlayer(P,{spd:0,mode:'walk'},dt)}}}
  // ---------- live nav screen, lights, engine sound ----------
  live(dt){this.liveT-=dt;if(this.liveT>0||!this.dyn.live)return;this.liveT=.5;const c=this.dyn.live.cv,x=c.getContext('2d'),W=c.width,H=c.height;
    x.fillStyle='#06202e';x.fillRect(0,0,W,H);x.strokeStyle='rgba(80,200,230,.25)';for(let i=0;i<W;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}for(let j=0;j<H;j+=32){x.beginPath();x.moveTo(0,j);x.lineTo(W,j);x.stroke()}
    const kn=Math.abs(this.u)*1.944,hd=((this.yaw*180/Math.PI)%360+360)%360;x.fillStyle='#7fe8ff';x.font='700 26px monospace';x.fillText(String(Math.round(kn)).padStart(2,' ')+' kn',12,36);x.fillText('HDG '+String(Math.round(hd)).padStart(3,'0')+'°',12,70);
    x.font='600 15px monospace';x.fillStyle='#f2c14e';x.fillText('THR '+Math.round(this.thr*100)+'%',12,98);x.fillStyle='#8fd';x.fillText(this.auto?'AUTO → '+this.auto.name:'MANUAL',12,122);
    x.save();x.translate(W-60,H-50);x.rotate(this.yaw);x.fillStyle='#fff';x.beginPath();x.moveTo(0,-26);x.lineTo(10,16);x.lineTo(0,10);x.lineTo(-10,16);x.closePath();x.fill();x.restore();this.dyn.live.tex.needsUpdate=true}
  lights(){const n=UNI.uNight.value,I=this.lightsOn?.7+n*2.2:.15;this.M.lamp.emissiveIntensity=I;this.M.screen.emissiveIntensity=.7+n*.6}
  sound(dt){if(typeof AUD==='undefined'||!AUD||!AUD.ok)return;const a=AUD.ctx,d=Math.hypot(this.x-player.x,this.z-player.z),sp=Math.min(1,Math.abs(this.u)/46),vol=(d<120||(MP.on&&MP.plat===this.plat))?Math.max(0,1-d/120)*.5+(MP.on&&MP.plat===this.plat?.5:0):0;
    if(!this.eng){if(vol<=.01)return;const o=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.Q.value=2;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g);g.connect(AUD.sfx);o.start();o2.start();this.eng={o,o2,f,g}}
    const T=a.currentTime;this.eng.o.frequency.setTargetAtTime(30+sp*34+Math.abs(this.thr)*10,T,.3);this.eng.o2.frequency.setTargetAtTime(15+sp*17,T,.3);this.eng.f.frequency.setTargetAtTime(120+sp*420,T,.3);this.eng.g.gain.setTargetAtTime(vol*(.018+.05*(.35+sp)),T,.25)}
  update(dt){
    const d=Math.hypot(this.x-player.x,this.z-player.z),aboard=MP.on&&MP.plat===this.plat;
    this.root.visible=d<3200||aboard;if(this.root.visible||aboard)this.step(Math.min(dt,.05));else if(this.auto||Math.abs(this.u)>.1)this.step(Math.min(dt,.05));
    if(d<300||aboard){if(!this.npcs.length&&(d<160||aboard))this.npcInit();this.npcUpdate(dt);this.lights();this.live(dt)}
    if(this.dyn.radar&&d<500)this.dyn.radar.rotation.y+=dt*1.6;
    this.sound(dt);
    if(this.helm){const k=this.thr;const t=document.getElementById('yThr');if(t)t.style.width=Math.round(Math.max(0,this.thr)*100)+'%';const r=document.getElementById('yRd');if(r)r.textContent=Math.round(Math.abs(this.u)*1.944)+' kn · '+String(Math.round((((this.yaw*180/Math.PI)%360)+360)%360)).padStart(3,'0')+'°'+(this.auto?' · AUTO':'')}}
}

// ===================================================================================================
const YACHT={y:null,jetty:null,boardNear:null,ashoreAt:null,
  init(world){
    try{this.y=new Yacht()}catch(e){console.error('yacht build',e);return}
    world.add(this.y.root);
    this.buildMarina(world);
    // boarding / tender prompts (outside the yacht)
    const self=this;
    INTERACT.push({x:0,z:0,r:1e9,get label(){return self.boardNear&&self.boardNear.near?'Board the yacht':'Take the tender to the yacht'},
      cond(){self.boardNear=null;const y=self.y;if(!y||MP.on||PORTAL.cur||DRIVE.on||HELI.on||RIDE.on||PASS.host||MARINE.cur||EXT.cur||player.sit||player.scoot)return false;
        const d=Math.hypot(y.x-player.x,y.z-player.z);if(d>90||Math.abs(y.u)>6)return false;let jet=0;if(self.jetty){const q=self.jettyLocal(player.x,player.z);jet=q&&q.u>2&&q.u<self.jetty.len+1&&Math.abs(q.v)<2.2?1:0}
        self.boardNear={near:d<14||jet};return true},
      fn:()=>self.board()});
    this.hudPlace()},
  hudPlace(){try{MAP_SEA.add('yacht')}catch(e){}},
  // ---------- marina: a jetty out from the beach, the yacht alongside ----------
  buildMarina(world){
    const mar=this.findMarina(),B=mar?mar.B:[1567-.139*85,273+.99*85],dir0=mar?mar.dir:[.990,.139];let ds=null;
    for(let d=-30;d<120;d+=1){if(groundH(B[0]+dir0[0]*d,B[1]+dir0[1]*d)<SL+.12){ds=d;break}}
    if(ds===null){console.warn('yacht: no shoreline found at Velykyi Fontan');ds=30}
    const dir=dir0,lat=[-dir[1],dir[0]],jyaw=Math.atan2(dir[0],dir[1]);
    // the yacht lies bow-out to sea (nothing to swing round in the shallows), far enough out for the stern to clear the draught
    const y=this.y;let dc=ds+44,yaw=jyaw;
    for(let t=0;t<40;t++){const x=B[0]+dir[0]*dc,z=B[1]+dir[1]*dc;if(y.fits(x,z,yaw))break;dc+=3}
    // the jetty runs out alongside the starboard side (+lat), ending abeam of the midship side door
    const off=5.75,start=[B[0]+dir[0]*(ds-7)+lat[0]*off,B[1]+dir[1]*(ds-7)+lat[1]*off],len=(dc+3)-(ds-7);
    y.place(B[0]+dir[0]*dc,B[1]+dir[1]*dc,yaw);y.home={x:y.x,z:y.z,yaw};
    // jetty: planks, posts, cleats, lamp
    const g=new THREE.Group();g.position.set(start[0],0,start[1]);g.rotation.y=jyaw;world.add(g);
    const mb=new MB(),H=SL+1.25,W=2.7;
    mb.bx('plank',-W/2,W/2,H-.18,H,0,len,2.2);
    for(let u=1;u<len;u+=3.2)for(const s of [-1,1]){mb.cyl('post',.17,.2,9,8,s*(W/2-.1),H-4.2,u);mb.cyl('cap',.12,.12,.06,8,s*(W/2-.1),H+.9,u+0)}
    for(let u=1;u<len;u+=3.2){mb.bx('post',-W/2,W/2,H-.46,H-.3,u-.1,u+.1)}
    for(const s of [-1,1]){mb.rod('rail',.04,[s*(W/2-.1),H+.9,.4],[s*(W/2-.1),H+.9,len-.2],6);mb.rod('rail',.03,[s*(W/2-.1),H+.5,.4],[s*(W/2-.1),H+.5,len-.2],5)}
    mb.cyl('lampM',.17,.17,.3,10,W/2-.1,H+1.35,len-.4);mb.cyl('lampM',.17,.17,.3,10,-W/2+.1,H+1.35,len-.4);
    for(const s of [-1,1])mb.cyl('steel',.1,.12,.3,8,s*(W/2-.2),H+.15,len-1.5);
    const mats={plank:MBM.std(0xffffff,.85,0,{map:MBM.teak('#a07a52')}),post:MBM.std(0x3a2a1e,.9,0),cap:MBM.std(0x2a2a2a,.8,0),rail:MBM.std(0xd5d9de,.2,.9),lampM:MBM.emis(0xfff0c8,1.4),steel:MBM.std(0x666b70,.4,.8)};
    mb.build(g,mats,{static:true});
    this.jetty={g,start,dir,jyaw,len,W,H,ds};
    // walk surface: ramp from the sand up to the deck over the first 6 m
    holdSpecial((x,z)=>{const q=this.jettyLocal(x,z);if(!q||q.u<0||q.u>len||Math.abs(q.v)>W/2-.05)return null;const gy=groundH(start[0],start[1]);const h=q.u<6?gy+(H-gy)*Math.max(0,q.u/6):H;return {h:Math.max(h,groundH(x,z)),pri:1,surf:'wood'}});
    PLACES.push({id:'yacht',name:'Yacht «Odesa Pearl»',sub:'at the jetty · Velykyi Fontan',x:start[0]-dir[0]*3,z:start[1]-dir[1]*3,yaw:jyaw});
  },
  // an open sandy beach with a deep, clear run out to sea (the old Velykyi Fontan lagoon is closed by a bar): scan the coast south of the lagoon
  findMarina(){const sea=(x,z)=>SL-groundH(x,z);
    for(let z=1000;z<=1900;z+=20){let xs=null;for(let x=1300;x<2300;x+=3){if(sdAt(x,z)<0){xs=x;break}}if(xs===null)continue;
      const e=12,gx=sdAt(xs+e,z)-sdAt(xs-e,z),gz=sdAt(xs,z+e)-sdAt(xs,z-e),l=Math.hypot(gx,gz)||1,dir=[-gx/l,-gz/l];if(dir[0]<.6)continue;
      const bh=groundH(xs-dir[0]*12,z-dir[1]*12)-SL;if(bh>3.5||bh<-.3)continue;
      let ok=true;for(let d=30;d<=900&&ok;d+=15){const x=xs+dir[0]*d,zz=z+dir[1]*d;if(sea(x,zz)<3.4)ok=false;if(d<=260)for(const sd of [-45,45])if(sea(x-dir[1]*sd,zz+dir[0]*sd)<3.2)ok=false}
      if(!ok)continue;for(let d=-16;d<=4;d+=2){const x=xs+dir[0]*d,zz=z+dir[1]*d;if(insideAny(x,zz,1.2,groundH(x,zz)+1)){ok=false;break}}
      if(ok)return {B:[xs,z],dir}}
    return null},
  jettyLocal(x,z){const j=this.jetty;if(!j)return null;const dx=x-j.start[0],dz=z-j.start[1];return {u:dx*j.dir[0]+dz*j.dir[1],v:dx*-j.dir[1]+dz*j.dir[0]}},
  // ---------- boarding / leaving ----------
  board(){const y=this.y;if(!y)return;const near=this.boardNear&&this.boardNear.near,go=()=>{y.npcInit();y.root.updateMatrixWorld(true);
      // on foot from the jetty you step onto the swim platform; the tender drops you there too
      if(near&&this.jetty&&Math.hypot(y.x-this.jetty.g.position.x,y.z-this.jetty.g.position.z)<80)MP.enter(y.plat,-3.55,2.9,.7,Math.PI/2);else MP.enter(y.plat,0,.9,-22.2,0);cam.dist=Math.max(cam.dist,4.6);toast('Odesa Pearl','E on a chair to sit · stairs lead up to the bridge and the sun deck · the helm is the left chair on the bridge')};
    if(near){go();return}
    const f=$('fade');f.style.opacity=1;setTimeout(()=>{go();f.style.opacity=0},380)},
  // ashore: the nearest dry sand within 260 m of the yacht (a tender run), only when we are slow
  ashoreSpot(){const y=this.y;for(let r=8;r<=260;r+=6)for(let i=0;i<24;i++){const a=i/24*6.283,x=y.x+Math.cos(a)*r,z=y.z+Math.sin(a)*r,g=groundH(x,z);if(g>SL+.35&&g<SL+25&&!insideAny(x,z,.6,g+1)&&!insideAny(x,z,.6,g+1.8)){
        // step a few metres inland so the player does not start in the surf
        let ix=0,iz=0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){if(groundH(x+dx*10,z+dz*10)>groundH(x-dx*10,z-dz*10)){ix+=dx;iz+=dz}}const l=Math.hypot(ix,iz)||1;
        const px=x+ix/l*3,pz=z+iz/l*3;if(groundH(px,pz)>SL+.3&&!insideAny(px,pz,.5,groundH(px,pz)+1))return [px,pz];return [x,z]}}return null},
  goAshore(){const y=this.y;if(Math.abs(y.u)>3){toast('Too fast','slow the yacht down first (anchor on the helm panel)');return}
    const q=this.jetty&&this.jettyLocal(y.x,y.z);let spot=null;
    if(this.jetty&&Math.hypot(y.x-this.jetty.g.position.x,y.z-this.jetty.g.position.z)<80){const u=this.jetty.len-1;spot=[this.jetty.start[0]+this.jetty.dir[0]*u,this.jetty.start[1]+this.jetty.dir[1]*u]}
    if(!spot)spot=this.ashoreSpot();if(!spot){toast('No shore within reach','sail closer to a beach and drop anchor');return}
    const f=$('fade');f.style.opacity=1;y.thrT=0;setTimeout(()=>{MP.exit(false,{x:spot[0],z:spot[1]});toast('Ashore','the tender is back at the yacht');f.style.opacity=0},380)},
  horn(){if(typeof AUD!=='undefined'&&AUD&&AUD.ok){AUD.tone(98,98,1.4,.12,'sawtooth');AUD.tone(147,147,1.4,.08,'square')}toast('📯','')},
  goto(where){const y=this.y;if(!y)return;
    if(where==='jungle'){const t=typeof ISL!=='undefined'?ISL.dock:null;if(!t){toast('No island known','');return}y.auto={x:t[0],z:t[1],name:'Jungle Island'};y.thrT=Math.max(y.thrT,.9);toast('Autopilot','course set for Jungle Island · '+Math.round(Math.hypot(t[0]-y.x,t[1]-y.z)/1000)+' km — walk around, sit back and enjoy')}
    else if(where==='home'&&y.home){y.auto={x:y.home.x-Math.sin(y.home.yaw)*0,z:y.home.z,name:'the marina'};y.thrT=Math.max(y.thrT,.6);toast('Autopilot','heading back to the marina')}},
  // bring the yacht to the player: nearest open water, then E = tender
  summon(){const y=this.y;if(!y)return;if(MP.on&&MP.plat===y.plat){toast('You are aboard','');return}
    for(let r=60;r<=700;r+=20)for(let i=0;i<24;i++){const a=i/24*6.283,x=player.x+Math.cos(a)*r,z=player.z+Math.sin(a)*r;if(groundH(x,z)>SL-4)continue;const yaw=a;if(y.fits(x,z,yaw)){y.place(x,z,yaw+Math.PI/2);toast('Yacht','anchored '+Math.round(r)+' m away · E to take the tender');return}}
    toast('No open water nearby','walk to a beach and try again')},
  update(dt){const y=this.y;if(!y||!started)return;y.update(dt)}
};
