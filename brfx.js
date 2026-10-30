/* ===================================================================================================
   brfx.js — the feedback of a Battle Royale fight.
     enemy health bars   a shield bar over a health bar above every bot / friend you can see; when it is hit the bar jolts and pops, flashes white,
                         the lost part stays as a bright chip that drains a moment later; it shows for 5 s after a hit (and always when someone is close)
     damage numbers      float up from the target: white on the body, big yellow on the head, blue on a shield
     debris              planks and gold chips that fly when a chest is hit / breaks (BR.chestHit)
     item names          the loot that pops out of a broken chest wears its name for a few seconds
     my own bars         BRFX.myHit(): the HUD bars shake, the lost part trails away in white (the chip <u> elements in #brBars)
   BOTS.damage → BRFX.hit · BR.hurt → BRFX.myHit · BR.tick → BRFX.tick · BR.end / start → BRFX.clear
   =================================================================================================== */
const BRFX=(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),PI=Math.PI;
const bars=new Map(),nums=[],deb=[],labs=[];
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),A=p(a),B=p(b);return 'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')+')'};
const hpCol=v=>v>.5?'#4ec27a':v>.25?'#e0b53a':'#d8453a';
const BH=.042,BW=BH*256/44;                                   // screen-space size of a bar (sizeAttenuation off, like the bot name tags)

// ---------------------------------------------------------------- bars
function mkBar(key){const cv=document.createElement('canvas');cv.width=256;cv.height=44;const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,fog:false,toneMapped:false}));sp.material.sizeAttenuation=false;sp.frustumCulled=false;sp.renderOrder=999;sp.visible=false;scene.add(sp);
  const B={key,cv,cx:cv.getContext('2d'),tex,sp,hp:100,sh:0,chH:100,chS:0,chT:0,fl:0,shk:0,vis:0,last:-99,dirty:true,opt:null,optT:0};bars.set(key,B);return B}
function draw(B){const c=B.cx;c.clearRect(0,0,256,44);c.fillStyle='rgba(8,10,14,.8)';rr(c,2,2,252,40,8);c.fill();c.strokeStyle='rgba(255,255,255,'+(.25+.6*B.fl)+')';c.lineWidth=2;c.stroke();
  const row=(y,h,val,chip,col)=>{const x0=10,wd=236;c.fillStyle='rgba(255,255,255,.1)';c.fillRect(x0,y,wd,h);
    if(chip>val){c.fillStyle=B.chT>0?'#ffffff':'#ffb347';c.fillRect(x0+wd*val,y,wd*(chip-val),h)}
    c.fillStyle=B.fl>0?mix(col.length===7?col:'#ffffff','#ffffff',Math.min(1,B.fl)):col;c.fillRect(x0,y,wd*val,h);
    c.fillStyle='rgba(0,0,0,.38)';for(let i=1;i<10;i++)c.fillRect(x0+wd*i/10-1,y,2,h)};
  row(8,12,B.sh/100,B.chS/100,'#3ab8ff');row(24,14,B.hp/100,B.chH/100,hpCol(B.hp/100));B.tex.needsUpdate=true}
// someone was hit: jolt + flash now, the real numbers come from the bot / friend on the next tick
function poke(B){B.shk=1;B.fl=1;B.last=performance.now()/1000;B.chT=.4}
function upd(B,hp,sh,x,y,z,alive,close,dt){const now=performance.now()/1000;
  if(hp<B.hp-.01){B.chH=Math.max(B.chH,B.hp);B.hp=hp;B.dirty=true}else if(hp>B.hp+.01){B.hp=Math.min(hp,B.hp+45*dt);if(B.chH<B.hp)B.chH=B.hp;B.dirty=true}
  if(sh<B.sh-.01){B.chS=Math.max(B.chS,B.sh);B.sh=sh;B.dirty=true}else if(sh>B.sh+.01){B.sh=Math.min(sh,B.sh+45*dt);if(B.chS<B.sh)B.chS=B.sh;B.dirty=true}
  if(B.chT>0)B.chT-=dt;else{if(B.chH>B.hp){B.chH=Math.max(B.hp,B.chH-70*dt);B.dirty=true}if(B.chS>B.sh){B.chS=Math.max(B.sh,B.chS-70*dt);B.dirty=true}}
  if(B.fl>0){B.fl=Math.max(0,B.fl-dt*4.5);B.dirty=true}if(B.shk>0)B.shk=Math.max(0,B.shk-dt*4);
  const want=alive&&(now-B.last<5||close)?1:0;B.vis+=(want-B.vis)*Math.min(1,dt*(want?14:5));
  const sp=B.sp;sp.visible=B.vis>.03;sp.material.opacity=clamp(B.vis,0,1);
  if(!sp.visible)return;
  const e=camera.matrixWorld.elements,j=B.shk*B.shk,t=now*60;
  sp.position.set(x+e[0]*Math.sin(t)*.07*j,y+Math.cos(t*1.3)*.05*j,z+e[2]*Math.sin(t)*.07*j);
  const pop=1+.28*B.shk;sp.scale.set(BW*pop,BH*pop,1);
  if(B.dirty){B.dirty=false;draw(B)}}

// ---------------------------------------------------------------- damage numbers (a pool of canvases)
function mkNum(){const cv=document.createElement('canvas');cv.width=160;cv.height=64;const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,fog:false,toneMapped:false}));sp.material.sizeAttenuation=false;sp.frustumCulled=false;sp.renderOrder=1000;sp.visible=false;scene.add(sp);
  const N={cv,cx:cv.getContext('2d'),tex,sp,t:9,life:1,x:0,y:0,z:0,vx:0,k:1};nums.push(N);return N}
function num(txt,col,x,y,z,big){const N=nums.find(n=>n.t>=n.life)||(nums.length<28?mkNum():null);if(!N)return;
  const c=N.cx;c.clearRect(0,0,160,64);c.font='900 '+(big?50:38)+'px system-ui,Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=big?9:7;c.strokeStyle='rgba(10,10,14,.92)';c.strokeText(txt,80,34);c.fillStyle=col;c.fillText(txt,80,34);N.tex.needsUpdate=true;
  N.t=0;N.life=big?1.15:.95;N.x=x+(Math.random()-.5)*.5;N.y=y;N.z=z+(Math.random()-.5)*.5;N.vx=(Math.random()-.5)*.8;N.k=big?1.25:1;N.sp.visible=true}

// ---------------------------------------------------------------- debris
const WOOD=new THREE.MeshStandardMaterial({color:0x7a4a22,roughness:.8}),GOLD=new THREE.MeshStandardMaterial({color:0xf2b830,emissive:0x5a3a00,emissiveIntensity:.5,roughness:.3,metalness:.8});
const CMAT=new Map();function cmat(c){let m=CMAT.get(c);if(!m){m=new THREE.MeshStandardMaterial({color:c,roughness:.85});CMAT.set(c,m)}return m}
function debris(x,y,z,n,small,col){for(let i=0;i<n;i++){let D=deb.find(d=>d.t>=d.life);if(!D){if(deb.length>=44)return;const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),WOOD);m.castShadow=true;scene.add(m);D={m,t:9,life:1,v:new THREE.Vector3(),w:new THREE.Vector3()};deb.push(D)}
    const gold=!col&&Math.random()<.3,s=(small?.05:.09)*(.6+Math.random()*.8);D.m.material=col?cmat(col):gold?GOLD:WOOD;D.m.scale.set(s*(gold?1:2.4),s*.6,s);D.m.position.set(x+(Math.random()-.5)*.5,y,z+(Math.random()-.5)*.5);D.m.visible=true;
    const a=Math.random()*6.283,sp=(small?1.8:3.4)*(.4+Math.random());D.v.set(Math.cos(a)*sp,(small?1.8:3.4)*(.6+Math.random()*.8),Math.sin(a)*sp);D.w.set(Math.random()*12-6,Math.random()*12-6,Math.random()*12-6);D.t=0;D.life=1.1+Math.random()*.7}}

// ---------------------------------------------------------------- item names above the loot that pops out of a chest
function label(it,txt,col){if(typeof labelSprite!=='function')return;const s=labelSprite([txt],{w:420,h:84,size:46,color:col||'#fff',bg:'rgba(0,0,0,.6)',round:30,depthTest:false,scale:1});
  s.material.sizeAttenuation=false;s.frustumCulled=false;s.renderOrder=998;s.scale.multiplyScalar(.055);scene.add(s);labs.push({s,it,t:0})}

// ---------------------------------------------------------------- per frame
function tick(dt){
  const now=performance.now()/1000;
  if(typeof BR==='undefined'||!BR.on){if(bars.size||labs.length)clear();return}
  // bots
  for(const b of BOTS.list){let B=bars.get(b);if(!B)B=mkBar(b);
    const alive=b.alive&&b.st!=='bus'&&b.st!=='sky',d=Math.hypot(b.x-player.x,b.z-player.z);
    upd(B,Math.max(0,b.hp),Math.max(0,b.sh),b.x,b.y+2.5,b.z,alive&&d<65,d<16,dt)}
  // friends
  if(typeof COOP!=='undefined'&&COOP.online&&COOP.online())for(const R of BR.mates()){const g=R.st.g||{},br=R.st.br||{};let B=bars.get(R.peer);if(!B)B=mkBar(R.peer);
    const x=R.has?R.x:R.st.x,y=R.has?R.y:R.st.y,z=R.has?R.z:R.st.z,d=Math.hypot(x-player.x,z-player.z);let hp=g.h===undefined?100:g.h;
    if(B.opt!==null){B.optT-=dt;if(B.optT<=0||hp<=B.opt)B.opt=null;else hp=Math.min(hp,B.opt)}
    upd(B,hp,br.s|0,x,y+2.5,z,br.a!==0&&d<65&&R.P&&R.P.root.visible,d<16,dt)}
  for(const N of nums){if(N.t>=N.life)continue;N.t+=dt;const u=N.t/N.life;if(u>=1){N.sp.visible=false;continue}
    N.sp.position.set(N.x+N.vx*N.t,N.y+1.3*(1-Math.pow(1-u,2.2)),N.z);const pop=u<.12?.6+u/.12*.5:1.1-.1*u,sc=.075*N.k*pop;N.sp.scale.set(sc*2.5,sc,1);N.sp.material.opacity=u<.6?1:1-(u-.6)/.4}
  for(const D of deb){if(D.t>=D.life)continue;D.t+=dt;const m=D.m;if(D.t>=D.life){m.visible=false;continue}
    D.v.y-=11*dt;m.position.addScaledVector(D.v,dt);m.rotation.x+=D.w.x*dt;m.rotation.y+=D.w.y*dt;m.rotation.z+=D.w.z*dt;
    const gy=groundH(m.position.x,m.position.z)+.03;if(m.position.y<gy){m.position.y=gy;D.v.y*=-.35;D.v.x*=.6;D.v.z*=.6;D.w.multiplyScalar(.5)}
    if(D.t>D.life-.3)m.scale.multiplyScalar(.9)}
  for(let i=labs.length-1;i>=0;i--){const L=labs[i];L.t+=dt;const it=L.it,m=it.m;
    if(L.t>4||it.taken){scene.remove(L.s);L.s.material.map.dispose();L.s.material.dispose();labs.splice(i,1);continue}
    L.s.visible=!!m;if(m)L.s.position.set(m.position.x,m.position.y+1.35,m.position.z);L.s.material.opacity=clamp((4-L.t)*2,0,1)}}

function clear(){for(const B of bars.values()){scene.remove(B.sp);B.tex.dispose();B.sp.material.dispose()}bars.clear();
  for(const N of nums)N.sp.visible=false;for(const D of deb){D.t=D.life;D.m.visible=false}
  for(const L of labs){scene.remove(L.s);L.s.material.map.dispose();L.s.material.dispose()}labs.length=0}

return {
  tick,clear,debris,label,num,
  // a bot was damaged: hp / sh = what was taken, head = a headshot, mine = I did it (only my hits float a number)
  hit(b,hp,sh,head,mine){let B=bars.get(b);if(!B)B=mkBar(b);poke(B);
    if(mine){const y=b.y+(head?1.85:1.4);if(sh>0)num('-'+Math.round(sh),'#5ac8ff',b.x,y,b.z,false);if(hp>0)num('-'+Math.round(hp),head?'#ffd23a':'#ffffff',b.x,y+(sh>0?.25:0),b.z,head)}},
  // I shot / hit a friend
  friendHit(R,dmg,head){let B=bars.get(R.peer);if(!B)B=mkBar(R.peer);poke(B);const g=R.st.g||{},hp0=g.h===undefined?100:g.h;B.opt=Math.max(0,hp0-dmg);B.optT=1.2;
    const x=R.has?R.x:R.st.x,y=R.has?R.y:R.st.y,z=R.has?R.z:R.st.z;num('-'+Math.round(dmg),head?'#ffd23a':'#ffffff',x,y+(head?1.85:1.4),z,!!head)},
  // I was hit: the HUD bars shake, the lost part stays white for a moment (the transition on the <u> chips does the trailing)
  myHit(){const el=document.getElementById('brBars');if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}}})();
