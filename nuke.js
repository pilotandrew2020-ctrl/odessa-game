// nuke.js — the nuclear bomb (2026-11-16). Spawn menu "Nuclear bomb": it falls 5 s onto a spot 300 m in front of where you look, then: white flash, a fireball, a shock ring + dust wall that sweeps outwards at 330 m/s, the mushroom cloud, a rumble that reaches you when the shock does.
//   BUILDINGS: no new geometry. The shared building / ground / tree shaders in index.html (NUKE_GLSL, NUKE_VB, NUKE_SURF, the uniforms uNuke / uNukeK / uNukeY) pull every wall and roof vertex down onto a ragged stump height as the shock front passes (nukeK), char the ground and shrink the trees inside the radius (R = 300 m).
//   While ruined: no wall colliders inside the zone (insideAny asks NUKE.inZone), no chunk shadows there, traffic cars inside are gone, pedestrians are thrown, you are shoved / hurt when the front reaches you. After 75 s the city grows back over 25 s. Cost: a handful of meshes while it lasts, one extra uniform test in the vertex shaders.
const NUKE={st:'',t:0,R:300,gx:0,gz:0,gy:0,K:0,ruin:false,g:null,hit:false,
  inZone(x,z,pad){return Math.hypot(x-this.gx,z-this.gz)<Math.min(this.t*330,this.R*.95)+(pad||0)},
  cloud(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');for(let i=0;i<46;i++){const x=64+(Math.random()-.5)*78,y=64+(Math.random()-.5)*78,r=14+Math.random()*26,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba(255,255,255,.55)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,128,128)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t},
  build(){if(this.g)return;const g=new THREE.Group(),tx=this.cloud(),MB=(o)=>new THREE.MeshBasicMaterial(Object.assign({transparent:true,depthWrite:false,fog:false,toneMapped:false},o));
    const bomb=this.bomb=new THREE.Group(),dm=new THREE.MeshStandardMaterial({color:0x2b2f2a,roughness:.5,metalness:.5});const body=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,3.2,12),dm);bomb.add(body);const nose=new THREE.Mesh(new THREE.SphereGeometry(.6,12,8),dm);nose.scale.y=1.4;nose.position.y=-1.9;bomb.add(nose);for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(.05,1.1,1.1),dm);f.position.y=1.9;f.rotation.y=i*Math.PI/2;bomb.add(f)}bomb.scale.setScalar(2.2);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,8),MB({color:0xffb050,blending:THREE.AdditiveBlending,opacity:.8}));glow.position.y=3.5;bomb.add(glow);bomb.visible=false;g.add(bomb);
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),MB({color:0xffffff,blending:THREE.AdditiveBlending,opacity:1}));this.ball.visible=false;g.add(this.ball);
    this.ring=new THREE.Mesh(new THREE.RingGeometry(.96,1,72,1),MB({color:0xffe2b0,blending:THREE.AdditiveBlending,opacity:.8,side:THREE.DoubleSide}));this.ring.rotation.x=-Math.PI/2;this.ring.visible=false;g.add(this.ring);
    this.wall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,40,1,true),MB({map:tx,color:0xb09a7a,opacity:.5,side:THREE.DoubleSide}));this.wall.visible=false;g.add(this.wall);
    this.stem=new THREE.Mesh(new THREE.CylinderGeometry(.62,1,1,20,1,true),MB({map:tx,color:0xffb060,opacity:0,side:THREE.DoubleSide}));this.stem.visible=false;g.add(this.stem);
    this.cap=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),MB({map:tx,color:0xffb060,opacity:0,side:THREE.DoubleSide}));this.cap.visible=false;g.add(this.cap);
    this.skirt=new THREE.Mesh(new THREE.TorusGeometry(1,.34,10,32),MB({map:tx,color:0xffb060,opacity:0}));this.skirt.rotation.x=Math.PI/2;this.skirt.visible=false;g.add(this.skirt);
    g.traverse(o=>{o.frustumCulled=false;o.renderOrder=3});scene.add(g);this.g=g;
    const d=document.createElement('div');d.id='nukeFlash';d.style.cssText='position:fixed;inset:0;z-index:70;background:#fff;opacity:0;pointer-events:none';document.body.appendChild(d);this.fl=d},
  drop(dist){if(this.st&&this.st!=='')return;this.build();dist=dist||300;const y=(typeof cam!=='undefined'?cam.yaw:player.yaw);this.gx=player.x+Math.sin(y)*dist;this.gz=player.z+Math.cos(y)*dist;this.gy=Math.max(groundH(this.gx,this.gz),SL);this.t=0;this.st='fall';this.hit=false;this.bomb.visible=true;this.bomb.position.set(this.gx,this.gy+450,this.gz);
    toast('Nuclear bomb','Take cover: it hits 300 m ahead in 5 s');this.snd('fall')},
  snd(kind,delay){try{if(typeof AUD==='undefined'||!AUD.ok||!AUD.ctx||!AUD.noise)return;const c=AUD.ctx,T=c.currentTime+(delay||0),m=AUD.master||c.destination;
    if(kind==='fall'){const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(2400,T);o.frequency.exponentialRampToValueAtTime(500,T+4.6);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1500;const g=c.createGain();g.gain.setValueAtTime(.02,T);g.gain.linearRampToValueAtTime(.12,T+4.5);g.gain.linearRampToValueAtTime(0,T+4.8);o.connect(f);f.connect(g);g.connect(m);o.start(T);o.stop(T+5)}
    else{const n=c.createBufferSource();n.buffer=AUD.noise;n.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(900,T);f.frequency.exponentialRampToValueAtTime(70,T+9);const g=c.createGain();g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(1,T+.08);g.gain.exponentialRampToValueAtTime(.001,T+11);n.connect(f);f.connect(g);g.connect(m);n.start(T);n.stop(T+11.5);
      const o=c.createOscillator();o.frequency.setValueAtTime(70,T);o.frequency.exponentialRampToValueAtTime(22,T+3);const og=c.createGain();og.gain.setValueAtTime(.9,T);og.gain.exponentialRampToValueAtTime(.001,T+3.2);o.connect(og);og.connect(m);o.start(T);o.stop(T+3.4)}}catch(e){}},
  flash(){const d=this.fl;d.style.transition='none';d.style.opacity='1';void d.offsetWidth;d.style.transition='opacity 3.5s ease-out';d.style.opacity='0'},
  boom(){this.st='boom';this.t=0;this.K=1;this.ruin=true;this.bomb.visible=false;UNI.uNuke.value.set(this.gx,this.gz,this.R,0);UNI.uNukeK.value=1;UNI.uNukeY.value=this.gy;
    for(const m of [this.ball,this.ring,this.wall,this.stem,this.cap,this.skirt])m.visible=true;this.flash();BLAST.at(this.gx,this.gy+2,this.gz,this.R*.8,0,true);
    this.dp=Math.hypot(player.x-this.gx,player.z-this.gz);this.snd('boom',this.dp/330);toast('Nuclear bomb','Detonation')},
  update(dt){if(!this.st)return;dt=Math.min(dt,.1);this.t+=dt;const t=this.t;
    if(this.st==='fall'){const k=Math.min(1,t/4.6);this.bomb.position.y=this.gy+450*(1-k*k);this.bomb.rotation.y+=dt*2;if(t>=4.6)this.boom();return}
    // after the flash: effects follow the shock front
    UNI.uNuke.value.w=t;const R=this.R,front=Math.min(t*330,R*1.7),fade=1-front/(R*1.7);
    const br=120*(1-Math.exp(-t*1.6));this.ball.position.set(this.gx,this.gy+br*.55+t*7,this.gz);this.ball.scale.setScalar(Math.max(.01,br));this.ball.material.opacity=Math.max(0,1-t/9);this.ball.material.color.setRGB(1,Math.max(.25,1-t*.14),Math.max(.1,1-t*.3));
    this.ring.position.set(this.gx,this.gy+1.2,this.gz);this.ring.scale.set(front,front,1);this.ring.material.opacity=.85*fade;this.ring.visible=fade>.02;
    this.wall.position.set(this.gx,this.gy+(18+front*.06),this.gz);this.wall.scale.set(front,36+front*.12,front);this.wall.material.opacity=.55*fade;this.wall.visible=fade>.02;
    const H=340*(1-Math.exp(-t/6)),rise=Math.min(1,t/1.5),life=t>50?Math.max(0,1-(t-50)/30):1,col=Math.min(1,t/20),op=rise*life*.85;
    for(const m of [this.stem,this.cap,this.skirt]){m.material.opacity=op;m.material.color.setRGB(1-.62*col,.69-.36*col,.38-.06*col)}
    this.stem.position.set(this.gx,this.gy+H/2,this.gz);this.stem.scale.set(26+t*.6,Math.max(1,H),26+t*.6);
    const cr=40+Math.min(150,t*9);this.cap.position.set(this.gx,this.gy+H+cr*.25,this.gz);this.cap.scale.set(cr,cr*.6,cr);this.skirt.position.set(this.gx,this.gy+H*.82,this.gz);this.skirt.scale.set(cr*.95,cr*.95,cr*.5);this.cap.rotation.y=this.stem.rotation.y=t*.05;
    // the shock reaches you: shove, hurt, shake (once)
    if(!this.hit&&front*1>=this.dp){this.hit=true;const dx=player.x-this.gx,dz=player.z-this.gz,d=Math.hypot(dx,dz)||1,k=Math.max(0,1-d/(R*1.8));player.vx+=dx/d*(8+22*k);player.vz+=dz/d*(8+22*k);if(typeof GUN!=='undefined'&&GUN.armed)GUN.damage(Math.round(100*k),'nuclear blast');if(typeof FX!=='undefined'){FX.shakeT=2.2;FX.shakeA=.07}}
    // the zone stays ruined for 75 s, then the city grows back over 25 s
    if(t>75){this.K=Math.max(0,1-(t-75)/25);UNI.uNukeK.value=this.K;if(this.K<.5)this.ruin=false;if(this.K>0&&!this.msg){this.msg=1;toast('Nuclear bomb','The city is coming back')}}
    if(t>100)this.clear()},
  clear(){this.st='';this.ruin=false;this.K=0;this.msg=0;UNI.uNukeK.value=0;UNI.uNuke.value.set(0,0,300,0);for(const m of [this.ball,this.ring,this.wall,this.stem,this.cap,this.skirt,this.bomb])m.visible=false}};
