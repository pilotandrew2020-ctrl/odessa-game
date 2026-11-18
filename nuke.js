// nuke.js — the nuclear bomb (2026-11-16). Spawn menu "Nuclear bomb": it falls 5 s onto a spot 300 m in front of where you look, then: white flash, a fireball, a shock ring + dust wall that sweeps outwards at 330 m/s, the mushroom cloud, a rumble that reaches you when the shock does.
//   BUILDINGS: no new geometry. The shared building / ground / tree shaders in index.html (NUKE_GLSL, NUKE_VB, NUKE_SURF, the uniforms uNuke / uNukeK / uNukeY) pull every wall and roof vertex down onto a ragged stump height as the shock front passes (nukeK), char the ground and shrink the trees inside the radius (R = 300 m).
//   While ruined: no wall colliders inside the zone (insideAny asks NUKE.inZone), no chunk shadows there, traffic cars inside are gone, pedestrians are thrown, you are shoved / hurt when the front reaches you. After 22 s the city grows back over 10 s. Cost: a handful of meshes while it lasts, one extra uniform test in the vertex shaders.
const NUKE={st:'',t:0,R:300,sc:1,gx:0,gz:0,gy:0,K:0,_ruin:false,get ruin(){return this._ruin||(typeof RUIN!=='undefined'&&RUIN.n>0)},set ruin(v){this._ruin=v},g:null,hit:false,
  inZone(x,z,pad){if(this._ruin&&Math.hypot(x-this.gx,z-this.gz)<Math.min(this.t*330,this.R*.95)+(pad||0))return true;return typeof RUIN!=='undefined'&&RUIN.hit(x,z,pad)},   // the bomb's crater or one of the lasting ruin patches (RUIN, below)
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
    // round 46: the owner's mushroom footage (a 25-frame atlas, 5 x 5, cut from his video on black; additive, so black is clear): ONE billboard anchored on the ground replaces the coloured spheres
    {const t=new THREE.TextureLoader().load('assets/fx/nuke_mushroom.jpg');t.encoding=THREE.sRGBEncoding;t.repeat.set(.2,.2);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;this.vt=t;
      const sp=this.vid=new THREE.Sprite(new THREE.SpriteMaterial({map:t,color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));sp.center.set(.5,.02);sp.visible=false;sp.renderOrder=4;g.add(sp);
      // the footage's black is not quite black (a dark red glow): take it off, and fade the picture out at its edges so the square never shows
      const U=this.uOffU={value:new THREE.Vector2()};sp.material.onBeforeCompile=sh=>{sh.uniforms.uOff=U;sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 uOff;').replace('#include <map_fragment>','vec4 texelColor=mapTexelToLinear(texture2D(map,vUv));vec2 _l=(vUv-uOff)/.2;float _e=smoothstep(0.,.12,_l.x)*smoothstep(0.,.12,1.-_l.x)*smoothstep(0.,.05,_l.y)*smoothstep(0.,.12,1.-_l.y);texelColor.rgb=max(texelColor.rgb-.05,0.)*1.15*_e;diffuseColor*=texelColor;')}}
    g.traverse(o=>{o.frustumCulled=false;o.renderOrder=3});scene.add(g);this.g=g;
    const d=document.createElement('div');d.id='nukeFlash';d.style.cssText='position:fixed;inset:0;z-index:70;background:#fff;opacity:0;pointer-events:none';document.body.appendChild(d);this.fl=d},
  // landmarks, the home yard's flats and every other building that is not a chunk mesh use their own materials: give the ones near the blast the same collapse (vertex + char) the shared materials have. One shader compile per material, done while the bomb falls.
  patchNear(x,z,R){const skip=new Set(Object.values(typeof MATS!=='undefined'?MATS:{})),box=new THREE.Box3();this.shadowOff=this.shadowOff||[];
    const patch=m=>{if(!m||m.userData.nk||skip.has(m)||!(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial)||m.blending===THREE.AdditiveBlending)return;m.userData.nk=1;const old=m.onBeforeCompile,key=m.customProgramCacheKey?m.customProgramCacheKey():'';
      m.onBeforeCompile=(sh,r)=>{if(old)old.call(m,sh,r);if(sh.vertexShader.indexOf('nukeK')>=0)return;sh.uniforms.uNuke=UNI.uNuke;sh.uniforms.uNukeK=UNI.uNukeK;sh.uniforms.uNukeY=UNI.uNukeY;sh.uniforms.uRz=UNI.uRz;sh.uniforms.uRs=UNI.uRs;sh.uniforms.uRzN=UNI.uRzN;
        sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+NUKE_GLSL).replace('#include <begin_vertex>','#include <begin_vertex>\n'+NUKE_VB+'\nvNkW=modelMatrix*vec4(transformed,1.);').replace('void main() {','varying vec4 vNkW;\nvoid main() {');
        sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+NUKE_GLSL+'\nvarying vec4 vNkW;').replace('#include <color_fragment>','#include <color_fragment>\n{float _nk=nukeK(vNkW.xz);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.03,.028,.026),_nk*.8);}')};
      m.customProgramCacheKey=()=>key+'|nk';m.needsUpdate=true};
    scene.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||!o.geometry||!o.material||!o.visible)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);if(box.min.x>x+R+60||box.max.x<x-R-60||box.min.z>z+R+60||box.max.z<z-R-60)return;
      const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)patch(m);if(o.castShadow&&!o.isInstancedMesh){this.shadowOff.push(o);}})},
  // a strike anywhere (rockets, the tactical nuke): R = blast radius in metres (the falling bomb uses 300)
  strike(x,z,R){if(this.st)return;this.build();this.R=R||300;this.sc=this.R/300;this.gx=x;this.gz=z;this.gy=Math.max(groundH(x,z),SL);this.hit=false;this.patchNear(x,z,this.R);this.boom()},
  drop(dist){if(this.st&&this.st!=='')return;this.build();dist=dist||300;const y=(typeof cam!=='undefined'?cam.yaw:player.yaw);this.gx=player.x+Math.sin(y)*dist;this.gz=player.z+Math.cos(y)*dist;this.gy=Math.max(groundH(this.gx,this.gz),SL);this.R=300;this.sc=1;this.patchNear(this.gx,this.gz,300);this.t=0;this.st='fall';this.hit=false;this.bomb.visible=true;this.bomb.position.set(this.gx,this.gy+450,this.gz);
    toast('Nuclear bomb','Take cover: it hits 300 m ahead in 5 s');this.snd('fall')},
  snd(kind,delay){try{if(typeof AUD==='undefined'||!AUD.ok||!AUD.ctx||!AUD.noise)return;const c=AUD.ctx,T=c.currentTime+(delay||0),m=AUD.master||c.destination;
    if(kind==='fall'){const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(2400,T);o.frequency.exponentialRampToValueAtTime(500,T+4.6);const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1500;const g=c.createGain();g.gain.setValueAtTime(.02,T);g.gain.linearRampToValueAtTime(.12,T+4.5);g.gain.linearRampToValueAtTime(0,T+4.8);o.connect(f);f.connect(g);g.connect(m);o.start(T);o.stop(T+5)}
    else{const n=c.createBufferSource();n.buffer=AUD.noise;n.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(900,T);f.frequency.exponentialRampToValueAtTime(70,T+9);const g=c.createGain();g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(1,T+.08);g.gain.exponentialRampToValueAtTime(.001,T+11);n.connect(f);f.connect(g);g.connect(m);n.start(T);n.stop(T+11.5);
      const o=c.createOscillator();o.frequency.setValueAtTime(70,T);o.frequency.exponentialRampToValueAtTime(22,T+3);const og=c.createGain();og.gain.setValueAtTime(.9,T);og.gain.exponentialRampToValueAtTime(.001,T+3.2);o.connect(og);og.connect(m);o.start(T);o.stop(T+3.4)}}catch(e){}},
  flash(){const d=this.fl;const amp=Math.max(.12,Math.min(1,this.sc*2));d.style.background=this.sc<.6?'#ffe9c4':'#fff';d.style.transition='none';d.style.opacity=String(amp);void d.offsetWidth;d.style.transition='opacity '+(amp<.5?.8:3.5)+'s ease-out';d.style.opacity='0'},
  boom(){this.st='boom';this.t=0;this.K=1;this.ruin=true;this.bomb.visible=false;UNI.uNuke.value.set(this.gx,this.gz,this.R,0);UNI.uNukeK.value=1;UNI.uNukeY.value=this.gy;
    for(const m of [this.ring,this.wall])m.visible=true;this.vid.visible=true;this.flash();for(const o of this.shadowOff||[])o.castShadow=false;BLAST.at(this.gx,this.gy+2,this.gz,this.R*.8,this.sc>.5?0:50,true);
    this.dp=Math.hypot(player.x-this.gx,player.z-this.gz);this.snd('boom',this.dp/330);toast('Nuclear bomb','Detonation')},
  update(dt){if(!this.st)return;dt=Math.min(dt,.1);this.t+=dt;const t=this.t;
    if(this.st==='fall'){const k=Math.min(1,t/4.6);this.bomb.position.y=this.gy+450*(1-k*k);this.bomb.rotation.y+=dt*2;if(t>=4.6)this.boom();return}
    // after the flash: effects follow the shock front
    UNI.uNuke.value.w=t;const R=this.R,front=Math.min(t*330,R*1.7),fade=1-front/(R*1.7);
    const k0=this.sc,br=120*k0*(1-Math.exp(-t*1.6));{this.ball.position.set(this.gx,this.gy+br*.55+t*7*k0,this.gz);this.ball.scale.setScalar(Math.max(.01,br));this.ball.material.opacity=Math.max(0,1-t/9);this.ball.material.color.setRGB(1,Math.max(.25,1-t*.14),Math.max(.1,1-t*.3));}
    this.ring.position.set(this.gx,this.gy+1.2,this.gz);this.ring.scale.set(front,front,1);this.ring.material.opacity=.85*fade;this.ring.visible=fade>.02;
    this.wall.position.set(this.gx,this.gy+(18+front*.06),this.gz);this.wall.scale.set(front,(36+front*.12)*Math.max(.4,k0),front);this.wall.material.opacity=.55*fade;this.wall.visible=fade>.02;
    const H=340*k0*(1-Math.exp(-t/6)),rise=Math.min(1,t/1.5),life=t>50*k0?Math.max(0,1-(t-50*k0)/Math.max(3,30*k0)):1,col=Math.min(1,t/20),op=rise*life*.85;
    for(const m of [this.stem,this.cap,this.skirt]){m.material.opacity=op;m.material.color.setRGB(1-.62*col,.69-.36*col,.38-.06*col)}
    this.stem.position.set(this.gx,this.gy+H/2,this.gz);this.stem.scale.set((26+t*.6)*k0,Math.max(1,H),(26+t*.6)*k0);
    const cr=(40+Math.min(150,t*9))*k0;this.cap.position.set(this.gx,this.gy+H+cr*.25,this.gz);this.cap.scale.set(cr,cr*.6,cr);this.skirt.position.set(this.gx,this.gy+H*.82,this.gz);this.skirt.scale.set(cr*.95,cr*.95,cr*.5);this.cap.rotation.y=this.stem.rotation.y=t*.05;
    {const S=520*k0,dur=24*Math.max(.4,k0),f=Math.min(24,Math.floor(t/dur*25)),endT=Math.max(6,22*k0)+Math.max(4,10*k0),fo=Math.max(0,Math.min(1,(endT-t)/6));   // the owner's footage plays once over ~24 s (shorter for small strikes), then fades with the ruin
      this.vid.position.set(this.gx,this.gy,this.gz);this.vid.scale.set(S,S,1);this.vt.offset.set((f%5)*.2,.8-Math.floor(f/5)*.2);this.uOffU.value.copy(this.vt.offset);this.vid.material.opacity=Math.min(1,t/.5)*fo}
    // the shock reaches you: shove, hurt, shake (once)
    if(!this.hit&&front*1>=this.dp){this.hit=true;const dx=player.x-this.gx,dz=player.z-this.gz,d=Math.hypot(dx,dz)||1,k=Math.max(0,1-d/(R*1.8));player.vx+=dx/d*(8+22*k);player.vz+=dz/d*(8+22*k);if(typeof GUN!=='undefined'&&GUN.armed)GUN.damage(Math.round(100*k),'nuclear blast');if(typeof FX!=='undefined'){FX.shakeT=2.2;FX.shakeA=.07}}
    // the zone stays ruined for 75 s, then the city grows back over 25 s
    const hold=Math.max(6,22*k0),rec=Math.max(4,10*k0);   // round 34: the city is back after ~30 s (it was 100 s)   // small strikes (a tank shell) are over in ~15 s
    if(t>hold){this.K=Math.max(0,1-(t-hold)/rec);UNI.uNukeK.value=this.K;if(this.K<.5)this.ruin=false;if(this.K>0&&!this.msg&&k0>.3){this.msg=1;toast('Nuclear bomb','The city is coming back')}}
    if(t>hold+rec)this.clear()},
  clear(){if(this.vid){this.vid.visible=false;this.vid.material.opacity=0}for(const o of this.shadowOff||[])o.castShadow=true;this.shadowOff=[];this.st='';this.ruin=false;this.K=0;this.msg=0;UNI.uNukeK.value=0;UNI.uNuke.value.set(0,0,300,0);for(const m of [this.ball,this.ring,this.wall,this.stem,this.cap,this.skirt,this.bomb])m.visible=false}};

// RUIN (round 43): lasting ruin patches for Godzilla (his beam, his body, his tail, his feet). Up to 24 at once in the shared building / ground shaders (uRz, uRzN: the same collapse
//   and char as the bomb, no mushroom, no flash): a patch grows to its radius in 0.8 s, stays for 15 minutes and then the houses come back over 20 s; with 24 patches standing the
//   oldest one goes first. No colliders inside a patch (NUKE.inZone asks RUIN.hit), so you walk through the rubble. Buildings that are not chunk meshes get the shader through NUKE.patchNear.
const RUIN={Z:[],n:0,MAX:24,LIFE:900,
  // no walls where the building has melted below ~40 % of its height: what is still standing at the edge keeps its collider (you cannot walk through a piece you can see)
  k(x,z,q){const d=Math.hypot(x-q.x,z-q.z),a=q.r*.55,b=Math.max(a+.01,q.r),t=Math.max(0,Math.min(1,(d-a)/(b-a)));return q.s*(1-t*t*(3-2*t))},
  hit(x,z,pad){for(const q of this.Z)if(this.k(x,z,q)>.6)return true;return false},
  near(x,z,R){for(const q of this.Z)if(Math.hypot(x-q.x,z-q.z)<q.R*.5)return q;return null},
  // s = how much this hit burns (0..1): the beam adds a little every 0.3 s (the house melts down while you hold it there), a foot / the body / the tail crush at once (s 1)
  add(x,z,R,s){s=s===undefined?1:s;const o=this.near(x,z,R);if(o){if(o.s>=1)return false;o.s=Math.min(1,o.s+s);o.t0=Math.max(o.t0,performance.now()/1000-.8);this.sync();return true}if(this.Z.length>=this.MAX)this.Z.sort((a,b)=>a.t0-b.t0).shift();const y=Math.max(groundH(x,z),SL);
    this.Z.push({x,z,R,r:0,y,s,t0:performance.now()/1000,life:this.LIFE});
    // the landmark / non-chunk materials near it learn the collapse shader; walking the scene is costly, so only once per 120 m
    if(!(this.pc=this.pc||[]).some(c=>Math.hypot(c[0]-x,c[1]-z)<120)){this.pc.push([x,z]);try{if(typeof NUKE!=='undefined')NUKE.patchNear(x,z,160)}catch(e){}}
    this.sync();return true},
  tick(dt){if(!this.Z.length)return;const now=performance.now()/1000;let ch=false;
    for(let i=this.Z.length-1;i>=0;i--){const q=this.Z[i],a=now-q.t0;let r=a<.8?q.R*(a/.8):q.R;if(a>q.life)r=q.R*Math.max(0,1-(a-q.life)/20);if(a>q.life+20){this.Z.splice(i,1);ch=true;continue}if(Math.abs(r-q.r)>.01){q.r=r;ch=true}}
    if(ch)this.sync()},
  sync(){const U=UNI.uRz.value,S=UNI.uRs.value;this.n=this.Z.length;for(let i=0;i<U.length;i++){const q=this.Z[i];if(q){U[i].set(q.x,q.z,Math.max(.01,q.r),q.y);S[i]=q.s}else{U[i].set(0,0,0,0);S[i]=0}}UNI.uRzN.value=this.n;if(typeof PARKED_DIRTY!=='undefined')PARKED_DIRTY=true},
  clear(){this.Z.length=0;this.sync()}};
(function hook(){if(typeof ANIM==='undefined'){setTimeout(hook,200);return}ANIM.push(dt=>RUIN.tick(dt))})();
