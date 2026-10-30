/* ===================================================================================================
   br.js — BATTLE ROYALE for My Odesa (Fortnite-style, cartoon, no blood).
   A match = the battle bus flies over the arena (the centre of Odesa: Derybasivska · the Opera · City Garden), you jump, glide down,
   open golden chests, pick up guns / ammo / jars of blue shield liquid, fight the other players while the storm closes in, and the
   last one standing sees BATTLE ROYALE #1.  The other players are bots with friendly names (brbots.js); friends who are in the same
   co-op room are real players and are hit through the existing GUN presence protocol.
   Built on top of GUN (index.html): weapons 0-4 + 7 are the old ones, 9-11 (assault rifle, pump shotgun, sniper) are added here.
     BR.start() / BR.end()     BR.fire() BR.reload() BR.select(i)     BRM.*  the weapon / jar / chest models      pose.js animates the hands
   =================================================================================================== */
const RAR=[{n:'Common',c:'#b8bcc2',m:1},{n:'Uncommon',c:'#5bd15b',m:1.06},{n:'Rare',c:'#4aa3ff',m:1.12},{n:'Epic',c:'#b45cff',m:1.19},{n:'Legendary',c:'#ffb02e',m:1.27}];
// gi = index into GUN's WEAPONS (model + how friends see it), mag = magazine, rl = reload seconds
const BRW={
  axe    :{n:'Neon Katana',    gi:7, cls:'melee', melee:1,dmg:40,cd:.42},
  pistol :{n:'Pistol',         gi:0, cls:'pistol',dmg:24,cd:.2, mag:16,ammo:'light', spread:.014,range:110,rl:1.5,snd:'shot'},
  cannon :{n:'Hand Cannon',    gi:1, cls:'pistol',dmg:62,cd:.62,mag:7, ammo:'medium',spread:.006,range:130,rl:1.9,snd:'deagle'},
  smg    :{n:'Compact SMG',    gi:3, cls:'smg',   dmg:14,cd:.078,auto:1,mag:30,ammo:'light',spread:.04,range:85,rl:1.7,snd:'uzi'},
  ar     :{n:'Assault Rifle',  gi:9, cls:'rifle', dmg:30,cd:.125,auto:1,mag:30,ammo:'medium',spread:.02,range:170,rl:2.2,snd:'shot'},
  shotgun:{n:'Pump Shotgun',   gi:10,cls:'shotgun',dmg:12,pel:9,cd:.95,mag:5,ammo:'shells',spread:.075,range:40,rl:2.6,snd:'deagle'},
  sniper :{n:'Sniper Rifle',   gi:11,cls:'sniper',dmg:105,cd:1.5,mag:4,ammo:'heavy',spread:.001,range:330,rl:3,zoom:1,snd:'magnum'},
  rocket :{n:'Rocket Launcher',gi:4, cls:'tube',  dmg:100,cd:2.4,mag:1,ammo:'rocket',rl:3.2,rocket:1}};
const BRC={mini:{n:'Mini Shield',sh:25,cap:50,t:2.2,col:'#3ab8ff'},big:{n:'Shield Potion',sh:50,cap:100,t:4.5,col:'#2a7bff'},
  bandage:{n:'Bandage',hp:15,cap:75,t:3,col:'#f2f2f2'},medkit:{n:'Med Kit',hp:100,cap:100,t:6,col:'#ff4a4a'}};
const BRA={light:{n:'Light ammo',c:'#e8b64a'},medium:{n:'Medium ammo',c:'#6bbd5b'},shells:{n:'Shells',c:'#e0553f'},heavy:{n:'Heavy ammo',c:'#5aa0ff'},rocket:{n:'Rockets',c:'#b0b4ba'}};
// storm phases: wait, shrink, final radius, damage per second
const BR_STORM=[{wait:55,shrink:60,r:300,dmg:1},{wait:40,shrink:50,r:185,dmg:2},{wait:32,shrink:42,r:105,dmg:4},{wait:26,shrink:36,r:50,dmg:7},{wait:20,shrink:30,r:14,dmg:10}];

// ---------------------------------------------------------------- models
const BRM={
  mats:null,
  M(){if(this.mats)return this.mats;const m=(c,r,me,e)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:me,emissive:e||0});
    return this.mats={m:m(0x2b2f35,.38,.85),p:m(0x16171a,.75,.1),w:m(0x7a4a28,.6,.05),t:m(0xc4a265,.55,.2),r:m(0xd13b2f,.5,.2),s:m(0x9aa0a8,.3,.9),
      l:m(0x4aa3ff,.1,.6,0x1a5fb0),g:m(0x3a4a2c,.7,.2)}},
  rows(g,rows){const M=this.M();for(const [t,x,y,z,a,b,c,k,rx] of rows){let me;if(t==='b')me=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),M[k||'m']);else me=new THREE.Mesh(new THREE.CylinderGeometry(a,a,b,12),M[k||'m']);
      if(t==='c')me.rotation.x=Math.PI/2;me.position.set(x,y,z);if(rx)me.rotation.x+=rx;me.castShadow=true;g.add(me)}},
  ar(g){this.rows(g,[['b',0,.03,.02,.046,.07,.4,'m'],['b',0,.022,.3,.052,.06,.26,'p'],['c',0,.03,.55,.011,.22,0,'s'],['c',0,.03,.68,.017,.05,0,'m'],['b',0,-.075,-.03,.04,.12,.05,'p',.2],
    ['b',0,-.115,.1,.034,.15,.06,'t',-.12],['b',0,-.01,-.3,.044,.085,.26,'p'],['b',0,-.015,-.44,.05,.11,.03,'r'],['b',0,.078,.04,.03,.02,.34,'m'],['b',0,.092,.2,.016,.026,.016,'s'],
    ['c',0,.105,.0,.02,.12,0,'p'],['b',0,.0,-.1,.05,.03,.08,'p'],['b',.03,.03,.05,.006,.03,.1,'s']])},
  shotgun(g){this.rows(g,[['c',0,.03,.42,.015,.7,0,'m'],['c',0,-.005,.36,.013,.5,0,'s'],['b',0,.03,.0,.05,.075,.3,'m'],['b',0,.0,.3,.056,.05,.2,'w'],['b',0,-.07,-.04,.04,.1,.05,'w',.25],
    ['b',0,.005,-.3,.045,.1,.3,'w'],['b',0,-.01,-.46,.05,.12,.03,'p'],['b',0,.068,.4,.01,.02,.012,'s'],['c',0,.03,.77,.017,.025,0,'p']])},
  sniper(g){this.rows(g,[['b',0,.03,.0,.046,.07,.46,'g'],['c',0,.03,.62,.011,.52,0,'s'],['c',0,.03,.9,.019,.1,0,'p'],['c',0,.095,.05,.028,.26,0,'p'],['c',0,.095,.2,.034,.04,0,'p'],['c',0,.095,-.08,.034,.04,0,'p'],
    ['c',0,.095,.2,.024,.045,0,'l'],['c',0,.095,-.08,.024,.045,0,'l'],['b',0,.06,.05,.02,.04,.06,'m'],['b',0,-.075,-.05,.04,.12,.05,'p',.2],['b',0,-.02,-.33,.05,.1,.34,'g'],['b',0,-.035,-.52,.052,.13,.03,'p'],
    ['b',0,-.06,.1,.036,.06,.1,'p'],['c',.0,.045,.18,.005,.2,0,'s',0],['b',.04,.04,.0,.04,.012,.012,'s']])},
  glass(c,o){return new THREE.MeshStandardMaterial({color:c,roughness:.05,metalness:.1,transparent:true,opacity:o,depthWrite:false})},
  // a jar of glowing blue liquid with bubbles (the shield potion). big = a wide jar with a cork, mini = a small flask
  jar(big,col){const g=new THREE.Group(),h=big?.2:.12,r=big?.075:.045,c=col||(big?0x2a7bff:0x3ab8ff);
    // unlit and outside the tone mapper: ACES + the lit glass washed the lit version out to pale white
    const liqM=new THREE.MeshBasicMaterial({color:big?0x1560ff:0x1fa6ff,transparent:true,opacity:.96,toneMapped:false});
    const liq=new THREE.Mesh(new THREE.CylinderGeometry(r*.88,r*.88,h*.78,16),liqM);liq.position.y=h*.45;g.add(liq);g.userData.liq=liq;g.userData.liq0=h*.45;
    const gl=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),this.glass(0x9fd0ff,.14));gl.position.y=h*.5;g.add(gl);
    if(!big){const nk=new THREE.Mesh(new THREE.CylinderGeometry(r*.4,r*.55,h*.28,12),this.glass(0x9fd0ff,.16));nk.position.y=h+h*.1;g.add(nk)}
    const cork=new THREE.Mesh(new THREE.CylinderGeometry(r*(big?.8:.4),r*(big?.85:.42),h*.2,12),new THREE.MeshStandardMaterial({color:0x9a6b3c,roughness:.8}));cork.position.y=h+(big?.02:h*.3);g.add(cork);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r*.98,.006,6,18),new THREE.MeshStandardMaterial({color:0xd9b44a,metalness:.8,roughness:.3}));ring.rotation.x=Math.PI/2;ring.position.y=h*.92;g.add(ring);
    for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.007+.003*(i%2),6,5),new THREE.MeshBasicMaterial({color:0xcfefff}));b.position.set(Math.cos(i*2.4)*r*.5,h*(.2+.12*i),Math.sin(i*2.4)*r*.5);g.add(b);(g.userData.bub||(g.userData.bub=[])).push(b)}
    const lt=new THREE.PointLight(c,.5,2.2);lt.position.y=h*.5;g.add(lt);g.userData.h=h;return g},
  bandage(){const g=new THREE.Group(),w=new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:.8}),rd=new THREE.MeshStandardMaterial({color:0xd8362a,roughness:.6});
    const roll=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.07,16),w);roll.rotation.z=Math.PI/2;g.add(roll);const st=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,.02,16),rd);st.rotation.z=Math.PI/2;g.add(st);g.userData.h=.1;return g},
  medkit(){const g=new THREE.Group(),w=new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:.6}),rd=new THREE.MeshStandardMaterial({color:0xe03a2f,roughness:.5});
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.2,.13,.09),w));const a=new THREE.Mesh(new THREE.BoxGeometry(.08,.025,.095),rd),b=new THREE.Mesh(new THREE.BoxGeometry(.025,.08,.095),rd);g.add(a,b);
    const hd=new THREE.Mesh(new THREE.BoxGeometry(.08,.025,.02),w);hd.position.y=.078;g.add(hd);g.userData.h=.14;return g},
  ammo(col){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(.2,.12,.12),new THREE.MeshStandardMaterial({color:0x4a5238,roughness:.7}));g.add(b);
    const s=new THREE.Mesh(new THREE.BoxGeometry(.205,.04,.125),new THREE.MeshStandardMaterial({color:new THREE.Color(col),emissive:new THREE.Color(col),emissiveIntensity:.4,roughness:.5}));s.position.y=.02;g.add(s);g.userData.h=.14;return g},
  // golden chest: a body and a lid that swings up; chest.userData.lid is the pivot
  chest(){const g=new THREE.Group(),wd=new THREE.MeshStandardMaterial({color:0x7a4a22,roughness:.7}),gd=new THREE.MeshStandardMaterial({color:0xf2b830,emissive:0x5a3a00,emissiveIntensity:.5,roughness:.3,metalness:.8});
    const body=new THREE.Mesh(new THREE.BoxGeometry(.95,.5,.58),wd);body.position.y=.25;body.castShadow=true;g.add(body);
    for(const x of [-.4,0,.4]){const b=new THREE.Mesh(new THREE.BoxGeometry(.07,.52,.6),gd);b.position.set(x,.26,0);g.add(b)}
    const edge=new THREE.Mesh(new THREE.BoxGeometry(.98,.05,.62),gd);edge.position.y=.02;g.add(edge);
    const piv=new THREE.Group();piv.position.set(0,.5,-.29);g.add(piv);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(.95,.2,.58),wd);lid.position.set(0,.1,.29);lid.castShadow=true;piv.add(lid);
    for(const x of [-.4,0,.4]){const b=new THREE.Mesh(new THREE.BoxGeometry(.07,.22,.6),gd);b.position.set(x,.1,.29);piv.add(b)}
    const lock=new THREE.Mesh(new THREE.BoxGeometry(.12,.14,.05),gd);lock.position.set(0,.02,.6);piv.add(lock);
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(.85,.5),new THREE.MeshBasicMaterial({color:0xffd470,transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.52;g.add(glow);
    g.userData={lid:piv,glow,mats:[{m:wd,e:0,i:1},{m:gd,e:0x5a3a00,i:.5}]};return g},
  beamTex:null,
  beam(col,h,r){if(!this.beamTex){const cv=document.createElement('canvas');cv.width=4;cv.height=64;const x=cv.getContext('2d'),gr=x.createLinearGradient(0,64,0,0);gr.addColorStop(0,'rgba(255,255,255,.85)');gr.addColorStop(.35,'rgba(255,255,255,.3)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,4,64);this.beamTex=new THREE.CanvasTexture(cv)}
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.3,h,10,1,true),new THREE.MeshBasicMaterial({map:this.beamTex,color:new THREE.Color(col),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));m.position.y=h/2;m.frustumCulled=false;return m},
  stripeTex(a,b){const cv=document.createElement('canvas');cv.width=128;cv.height=8;const x=cv.getContext('2d');for(let i=0;i<8;i++){x.fillStyle=i%2?b:a;x.fillRect(i*16,0,16,8)}const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;return t},
  // the battle bus: a blue bus under a striped balloon
  bus(){const g=new THREE.Group(),bl=new THREE.MeshStandardMaterial({color:0x2c6fd6,roughness:.5,metalness:.2}),lt=new THREE.MeshStandardMaterial({color:0xf2c14e,roughness:.5}),dk=new THREE.MeshStandardMaterial({color:0x10212f,roughness:.2,metalness:.5});
    const body=new THREE.Mesh(new THREE.BoxGeometry(3.2,2.7,10),bl);body.position.y=1.9;g.add(body);
    const st=new THREE.Mesh(new THREE.BoxGeometry(3.25,.5,10.05),lt);st.position.y=1.5;g.add(st);
    for(let i=0;i<5;i++)for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(.05,.9,1.3),dk);w.position.set(s*1.62,2.5,-3.6+i*1.8);g.add(w)}
    const ws=new THREE.Mesh(new THREE.BoxGeometry(2.9,1.1,.05),dk);ws.position.set(0,2.4,5.02);g.add(ws);
    for(const z of [-3.3,3.4])for(const s of [-1,1]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.4,14),new THREE.MeshStandardMaterial({color:0x151515,roughness:.9}));wh.rotation.z=Math.PI/2;wh.position.set(s*1.6,.55,z);g.add(wh)}
    const bal=new THREE.Mesh(new THREE.SphereGeometry(4.2,20,14),new THREE.MeshStandardMaterial({map:this.stripeTex('#f2c14e','#2c6fd6'),roughness:.6}));bal.scale.set(1,1.2,1);bal.position.y=11.3;g.add(bal);
    for(const [x,z] of [[-1.4,-4],[1.4,-4],[-1.4,4],[1.4,4]]){const r=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,6.2,5),new THREE.MeshBasicMaterial({color:0x222222}));r.position.set(x*1.1,6.2,z*.5);r.rotation.z=-x*.05;g.add(r)}
    g.traverse(o=>{if(o.isMesh)o.castShadow=false});return g},
  glider(col){const g=new THREE.Group(),c=new THREE.Mesh(new THREE.SphereGeometry(1.7,18,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({map:this.stripeTex(col||'#e8453c','#f4f1ea'),roughness:.6,side:THREE.DoubleSide}));c.scale.y=.6;c.position.y=2.55;g.add(c);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,2.7,4),new THREE.MeshBasicMaterial({color:0x333333}));r.position.set(Math.cos(a)*.8,1.25,Math.sin(a)*.8);r.rotation.z=-Math.cos(a)*.52;r.rotation.x=Math.sin(a)*.52;g.add(r)}
    g.visible=false;return g}
};

// ---------------------------------------------------------------- the match
const BR={on:false,phase:'',ctl:false,inv:[],sel:0,ammo:{light:0,medium:0,shells:0,heavy:0,rocket:0},sh:0,kills:0,items:[],ints:[],zoomOn:false,
  seed:1,C:{x:560,z:-10560},R0:470,t:0,ui:null,rl:0,drk:null,place:0,total:0,ret:null,rd:0,t0:0,sd:0,host:false,op:[],tk:[],gone:new Set(),STORM_T0:40,
  rnd(){let a=this.seed=(this.seed+0x6D2B79F5)|0;a=Math.imul(a^a>>>15,a|1);a^=a+Math.imul(a^a>>>7,a|61);return((a^a>>>14)>>>0)/4294967296},
  pick(w){let s=0;for(const k in w)s+=w[k];let r=this.rnd()*s;for(const k in w){r-=w[k];if(r<=0)return k}return Object.keys(w)[0]},
  // ---------- items ----------
  rar(tbl){let r=this.rnd()*100;for(let i=0;i<tbl.length;i++){r-=tbl[i];if(r<=0)return i}return 0},
  mkWeapon(id,rar){const W=BRW[id];return {k:'w',id,rar:rar||0,mag:W.mag||0}},
  floorLoot(){const t=this.pick({w:38,a:24,c:38});
    if(t==='w')return this.mkWeapon(this.pick({pistol:18,smg:16,ar:22,shotgun:16,sniper:7,cannon:9,rocket:2,msniper:1,cpistol:2,sar:2,ssmg:2,grev:1.5,gshot:1.5,drill:.7,guided:.7,rpg:1,esword:1.2,hammer:1,bat:1.2}),this.rar([46,30,15,7,2]));
    if(t==='a')return {k:'a',id:this.pick({light:30,medium:30,shells:22,heavy:12,rocket:6}),n:1};
    return {k:'c',id:this.pick({mini:34,big:18,bandage:30,medkit:8}),n:1}},
  addItem(def,x,z,o){const it=Object.assign({x,z,y:o&&o.y!==undefined?o.y:null,ok:o&&o.ok||false,taken:false,m:null,t:this.rnd()*6},def);this.items.push(it);this.watch(it);return it},
  watch(it){const lab=()=>it.k==='x'?'Open the chest':'Pick up '+this.name(it);
    const e={x:it.x,z:it.z,y:it.y===null?undefined:it.y,r:it.k==='x'?2.6:2.2,get label(){return lab()},cond:()=>this.on&&this.phase==='play'&&!it.taken&&!this.busy()&&(it.k!=='x'||!it.open),fn:()=>this.take(it)};
    Object.defineProperty(e,'x',{get:()=>it.x});Object.defineProperty(e,'z',{get:()=>it.z});Object.defineProperty(e,'y',{get:()=>it.y===null?undefined:it.y});
    INTERACT.push(e);this.ints.push(e);it.e=e},
  name(it){if(it.k==='w')return BRW[it.id].n+' ('+RAR[it.rar].n+')';if(it.k==='c')return BRC[it.id].n;if(it.k==='a')return BRA[it.id].n;return 'Chest'},
  // a position becomes real when the player gets near it (the chunks are loaded by then): off buildings and the sea, on the ground
  validate(it){if(it.ok)return true;const gy=groundH(it.x,it.z);
    if(sdAt(it.x,it.z)<10){this.drop(it);return false}
    const rr=it.k==='x'?1.1:.6;if(insideAny(it.x,it.z,rr,gy+.5)){const q=collide(it.x,it.z,rr,gy+.5);if(insideAny(q[0],q[1],rr,gy+.5)){this.drop(it);return false}it.x=q[0];it.z=q[1]}
    it.y=groundAt(it.x,it.z,gy+3);it.ok=true;return true},
  drop(it){it.taken=true;if(it.m){scene.remove(it.m);it.m=null}const i=INTERACT.indexOf(it.e);if(i>=0)INTERACT.splice(i,1)},
  mesh(it){const g=new THREE.Group();let col='#ffffff',h=.5;
    if(it.k==='x'){const c=BRM.chest();g.add(c);g.userData.ch=c;col='#ffc04a';const bm=BRM.beam(col,16,.55);g.add(bm);g.userData.beam=bm}
    else{let inner;
      if(it.k==='w'){const gi=BRW[it.id].gi;inner=GUN.model(gi).clone();inner.rotation.set(0,0,0);inner.position.set(0,0,0);inner.scale.setScalar(inner.scale.x*1.25);col=RAR[it.rar].c}
      else if(it.k==='c'){const C=it.id;inner=C==='bandage'?BRM.bandage():C==='medkit'?BRM.medkit():BRM.jar(C==='big');col=BRC[C].col}
      else{inner=BRM.ammo(BRA[it.id].c);col=BRA[it.id].c}
      inner.position.y=.5;g.add(inner);g.userData.fl=inner;
      const bm=BRM.beam(col,it.k==='w'&&it.rar>=3?5.5:3,.14);g.add(bm);g.userData.beam=bm;
      const rg=new THREE.Mesh(new THREE.RingGeometry(.32,.45,24),new THREE.MeshBasicMaterial({color:new THREE.Color(col),transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));rg.rotation.x=-Math.PI/2;rg.position.y=.04;g.add(rg)}
    g.position.set(it.x,it.y,it.z);if(it.k==='x')g.rotation.y=(it.t%1)*6.28;scene.add(g);return g},
  stream(dt){this.sT=(this.sT||0)-dt;const first=!this.sT0;if(this.sT>0&&!first)return;this.sT=.3;this.sT0=1;
    for(const it of this.items){if(it.taken)continue;const d=Math.hypot(it.x-player.x,it.z-player.z);
      if(d<90){if(!it.m){if(!this.validate(it))continue;it.m=this.mesh(it)}}
      else if(it.m&&d>120){scene.remove(it.m);it.m=null}}},
  animItems(dt){for(const it of this.items){const m=it.m;if(!m||it.taken)continue;it.t+=dt;const f=m.userData.fl;
      if(f){f.rotation.y+=dt*1.4;f.position.y=.55+Math.sin(it.t*2.2)*.06;const u=f.userData;if(u.bub)u.bub.forEach((b,i)=>{b.position.y=u.h*(.15+((it.t*.5+i*.19)%1)*.7)})}
      if(it.k==='x'&&m.userData.ch){const ch=m.userData.ch,ud=ch.userData,tgt=it.open?-2.0:0;if(it.brk)ud.lid.visible=false;else ud.lid.rotation.x+=(tgt-ud.lid.rotation.x)*Math.min(1,dt*7);ud.glow.material.opacity=it.open?.5+Math.sin(it.t*8)*.15:0;
        const b=m.userData.beam;if(b)b.material.opacity=it.open?.15:1;
        if(it.shk>0){it.shk=Math.max(0,it.shk-dt*4);const q=Math.sin(it.t*70)*it.shk;ch.position.x=q*.06;ch.rotation.z=q*.07;ch.scale.y=1-.1*it.shk;if(it.shk<.55&&ud.mats)for(const o of ud.mats){o.m.emissive.setHex(o.e);o.m.emissiveIntensity=o.i}}else if(ch.position.x!==0){ch.position.x=0;ch.rotation.z=0;ch.scale.y=it.brk?.88:1}}
      if(it.pop){const P=it.pop;P.t+=dt;const u=Math.max(0,Math.min(1,P.t/.85)),e=1-Math.pow(1-u,2);m.position.set(P.x0+(it.x-P.x0)*e,it.y+(P.y0-it.y)*(1-e)+1.7*Math.sin(Math.PI*u),P.z0+(it.z-P.z0)*e);if(u>=1){it.pop=null;m.position.set(it.x,it.y,it.z)}}
      if(m.userData.beam&&it.k!=='x')m.userData.beam.rotation.y+=dt*.6}},
  // ---------- picking things up ----------
  busy(){return !!(this.drk||PLR.rch||PLR.emo)},
  take(it){if(it.taken)return;
    if(it.k==='x'){this.openChest(it);return}
    POSE.reachDown(PLR,.45);setTimeout(()=>{if(!this.on||it.taken)return;this.give(it)&&(this.drop(it),this.note(it))},230)},
  note(it){if(it.sid!==undefined&&!this.tk.includes(it.sid))this.tk.push(it.sid)},       // sid = the number friends know the item by (it.id is its TYPE: weapon / potion / ammo)
  give(it){
    if(it.k==='a'){const n={light:30,medium:30,shells:8,heavy:5,rocket:2}[it.id]*(it.n||1);this.ammo[it.id]+=n;this.snd('pick');this.msg('+'+n+' '+BRA[it.id].n);this.ui_();return true}
    if(it.k==='c'){const own=this.inv.find((s,i)=>i>0&&s&&s.k==='c'&&s.id===it.id);if(own){if(own.n>=6){this.msg('You cannot carry more');return false}own.n+=it.n||1}
      else{const i=this.inv.findIndex((s,i)=>i>0&&!s);if(i<0){this.msg('Inventory full');return false}this.inv[i]={k:'c',id:it.id,n:it.n||1}}
      this.snd('pick');this.msg(BRC[it.id].n);this.ui_();return true}
    if(it.k==='w'){let i=this.inv.findIndex((s,i)=>i>0&&!s);
      if(i<0){i=(this.sel>0&&this.inv[this.sel]&&this.inv[this.sel].k==='w')?this.sel:this.inv.findIndex((s,i)=>i>0&&s&&s.k==='w');if(i<0){this.msg('Inventory full');return false}
        const old=this.inv[i];this.addItem(old,player.x+Math.sin(player.yaw)*1.1,player.z+Math.cos(player.yaw)*1.1,{y:player.y,ok:true});this.items[this.items.length-1].mag=old.mag}
      const w=BRW[it.id];this.inv[i]={k:'w',id:it.id,rar:it.rar,mag:it.mag!==undefined?it.mag:w.mag};if(it.mag===undefined)this.ammo[w.ammo]+=w.mag;
      this.snd('pick');this.msg(this.name(it));this.select(i);return true}
    return false},
  openChest(ch){if(ch.open)return;ch.open=true;if(ch.sid!==undefined&&!this.op.includes(ch.sid))this.op.push(ch.sid);POSE.reachDown(PLR,.8);this.snd('chest');setTimeout(()=>{if(this.on)this.spill(ch)},650)},
  // the lid is up: a weapon, ammo for it and one or two potions pop out around the chest (bots call this too)
  spill(ch){if(ch.spilled)return;ch.spilled=true;ch.open=true;
    const sv=this.seed;this.seed=(this.sd^Math.imul((ch.sid|0)+1,0x9E3779B1))|0;   // contents come from the match seed + the chest number: whoever opens it gets the same loot
    const n=this.pick({1:20,2:50,3:30})|0,out=[];
    out.push(this.mkWeapon(this.pick({pistol:12,smg:15,ar:24,shotgun:18,sniper:10,cannon:11,rocket:6,msniper:3,cpistol:4,sar:4,ssmg:4,grev:3,gshot:3,drill:1.6,guided:1.6,rpg:2.2,esword:2.5,hammer:2,bat:2.5}),this.rar([8,24,36,24,8])));
    if(BRW[out[0].id].ammo)out.push({k:'a',id:BRW[out[0].id].ammo,n:2});if(n>=2)out.push({k:'c',id:this.pick({big:34,mini:40,medkit:10,bandage:16}),n:1});if(n>=3)out.push({k:'c',id:this.pick({mini:50,big:30,bandage:20}),n:1});
    out.forEach((d,i)=>{const a=i/out.length*6.28+(ch.sid|0)*1.7,x=ch.x+Math.cos(a)*1.5,z=ch.z+Math.sin(a)*1.5;const it=this.addItem(d,x,z,{y:groundAt(x,z,(ch.y||groundH(x,z))+3),ok:true});it.sid=1000+(ch.sid|0)*8+i;if(this.gone.has(it.sid))this.drop(it);else{it.pop={t:-i*.09,x0:ch.x,z0:ch.z,y0:(ch.y||groundH(ch.x,ch.z))+.55};if(typeof BRFX!=='undefined')BRFX.label(it,this.name(it),it.k==='w'?RAR[it.rar].c:'#fff')}});
    this.seed=sv},
  // ---------- inventory / weapons ----------
  cur(){const s=this.inv[this.sel];return s&&s.k==='w'?s:null},
  select(i){if(i<0||i>=this.inv.length||!this.inv[i])return;if(this.drk)this.cancelDrink();if(PLR.emo)POSE.stop(PLR);this.rl=0;if(PLR._gs)PLR._gs.rl=-1;
    this.sel=i;const s=this.inv[i];if(s.k==='w'){GUN.w=BRW[s.id].gi;GUN.noHold=false;GUN.aimT=1.2;if(PLR._gs)PLR._gs.t=0;this.zoomOff()}else{GUN.noHold=true;this.useCons(i)}this.ui_();GUN.push()},
  w(){const s=this.cur();return s?BRW[s.id]:null},
  speedMul(){return this.drk?.5:(this.zoomOn?.5:1)},
  faceAim(yaw,dt){if(this.phase!=='play'||PLR.emo)return yaw;if(!(GUN.aimT>0||GUN.held||this.zoomOn||this.drk))return yaw;let d=cam.yaw-yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;return yaw+d*Math.min(1,dt*12)},
  canShoot(){return this.on&&this.phase==='play'&&!this.dead&&!this.drk&&!PLR.emo&&!PLR.rch&&!DRIVE.on&&!HELI.on&&!RIDE.on&&!player.sit&&!PORTAL.cur},
  fire(){if(!this.canShoot()||GUN.cd>0)return;if(typeof BLD!=='undefined'&&BLD.mode){BLD.place();return}const s=this.cur(),W=this.w();if(!s)return;inp.lookT=performance.now();GUN.aimT=2.2;
    if(W.melee){if(W.dl){GUN.cd=W.cd;GUN.slash=1;GUN.shots++;if(PLR._gs)PLR._gs.rec=1;this.snd('swing');GUN.push();setTimeout(()=>{if(this.on&&!this.dead&&this.phase==='play')this.swingHit(W,s)},W.dl*1000);return}
      GUN.strike(WEAPONS[W.gi]);if(PLR._gs)PLR._gs.rec=1;return}
    if(this.rl>0)return;
    if(s.mag<=0){if(this.ammo[W.ammo]>0)this.reload();else{this.snd('click');this.msg('Out of '+BRA[W.ammo].n.toLowerCase())}GUN.cd=.3;return}
    s.mag--;this.ui_();
    if(W.rocket){GUN.brPass=true;GUN.w=W.gi;GUN.fire();GUN.brPass=false;GUN.cd=W.cd;if(this.ammo.rocket>0&&s.mag<=0)this.reload();return}
    GUN.cd=W.cd;GUN.shots++;if(PLR._gs)PLR._gs.rec=1;const rm=RAR[s.rar].m,{o,d:d0}=GUN.aimRay(),m=GUN.muzzle(),pel=W.pel||1;
    GUN.last.ax=d0.x;GUN.last.ay2=d0.y;GUN.last.az=d0.z;
    let hitAny=false,head=false;const wall=GUN.wallDist(o,d0,W.range);
    for(let k=0;k<pel;k++){const d=d0.clone();const sp=W.spread*(this.zoomOn?.3:1)*(PLR.spd>2?1.4:1);d.x+=(Math.random()-.5)*sp*2;d.y+=(Math.random()-.5)*sp*2;d.z+=(Math.random()-.5)*sp*2;d.normalize();
      const hb=BOTS.ray(o,d,Math.min(W.range,wall));GUN.noBots=true;const hp=GUN.raycast(o,d,Math.min(W.range,wall));GUN.noBots=false;let t=Math.min(W.range,wall),tgt=null;
      if(hb&&(!hp||hb.t<hp.t)){t=hb.t;tgt={b:hb.b,head:hb.head}}else if(hp){t=hp.t;tgt={R:hp.R,head:hp.head}}
      if(typeof BLD!=='undefined'&&BLD.n){const bh=BLD.ray(o,d,tgt?t:t+.6);if(bh){t=bh.t;tgt=null;BLD.hit(bh.p,W.dmg*rm*(pel>1?.5:1),bh.pt)}}      // my own fort (and floors / stairs) stop and take the bullet
      if(k<3||pel===1)GUN.tracer(m,o.clone().addScaledVector(d,t));
      if(tgt){let dmg=W.dmg*rm*(tgt.head?(W.cls==='sniper'?1.9:1.6):1)*(pel>1?(1-t/W.range*.75):1);dmg=Math.round(dmg);hitAny=true;head=head||tgt.head;
        if(tgt.b){tgt.b.hd=!!tgt.head;BOTS.damage(tgt.b,dmg,{me:true,w:W.n})}else{GUN.addHit(tgt.R.peer,dmg);if(typeof BRFX!=='undefined')BRFX.friendHit(tgt.R,dmg,tgt.head)}}}
    GUN.sfx(W.snd,1);GUN.muzzleFlash(m.x,m.y,m.z,d0.x,d0.y,d0.z,W.cls==='sniper'||W.snd==='deagle');if(W.cls==='sniper'||pel>1){FX.shakeT=.2;FX.shakeA=Math.max(FX.shakeA,.05)}
    if(hitAny){this.hitmark(head)}
    GUN.push();if(s.mag<=0&&this.ammo[W.ammo]>0)setTimeout(()=>{if(this.cur()===s&&!this.rl)this.reload()},250)},
  hitmark(head){const h=this.ui&&this.ui.hit;if(!h)return;h.className=head?'on hd':'on';clearTimeout(this.hmT);this.hmT=setTimeout(()=>h.className='',160);this.snd(head?'head':'hit')},
  reload(){const s=this.cur(),W=this.w();if(!s||!W||W.melee||this.rl>0||!this.canShoot())return;if(s.mag>=W.mag||this.ammo[W.ammo]<=0)return;
    this.rl=W.rl;this.rlT=0;this.rlDur=W.rl;this.snd('rl');if(PLR._gs)PLR._gs.rl=0;this.ui_()},
  useCons(i){const s=this.inv[i],C=BRC[s.id];if(C.sh&&this.sh>=C.cap){this.msg('Your shield is already full');this.backToWeapon();return}
    if(C.hp&&GUN.hp>=C.cap){this.msg('Your health is already full');this.backToWeapon();return}
    const jar=C.sh?BRM.jar(s.id==='big',parseInt(C.col.slice(1),16)):(s.id==='bandage'?BRM.bandage():BRM.medkit());jar.position.set(0,-.2,.02);jar.scale.setScalar(C.sh?.9:1.15);PLR.arms[0].el.add(jar);
    POSE.startDrink(PLR,C.t,jar,jar.userData.liq,jar.userData.liq0);this.drk={i,id:s.id,t:0,dur:C.t,from:C.sh?this.sh:GUN.hp};this.snd('drink')},
  backToWeapon(){let i=this.inv.findIndex((s,k)=>k>0&&s&&s.k==='w');if(this.prev!==undefined&&this.inv[this.prev]&&this.inv[this.prev].k==='w')i=this.prev;this.sel=0;this.select(i>=0?i:0)},
  cancelDrink(){if(!this.drk)return;POSE.endDrink(PLR);this.drk=null},
  tickDrink(dt){const D=this.drk;if(!D)return;D.t+=dt;const C=BRC[D.id],u=Math.min(1,D.t/D.dur);
    if(C.sh)this.sh=Math.max(this.sh,Math.min(C.cap,D.from+(C.sh*(D.t>D.dur*.15?(u-.15)/.85:0))));else GUN.hp=Math.max(GUN.hp,Math.min(C.cap,D.from+C.hp*u));
    if(D.t>=D.dur){const s=this.inv[D.i];if(s){s.n--;if(s.n<=0)this.inv[D.i]=null}this.drk=null;POSE.endDrink(PLR);this.snd('done');this.sparkle();const was=this.sel;this.sel=0;let w=this.inv.findIndex((s,k)=>k>0&&s&&s.k==='w');this.select(w>=0?w:0)}},
  sparkle(){FX.init();for(let i=0;i<14;i++){const a=i/14*6.283;FX.puff({x:player.x+Math.cos(a)*.5,y:player.y+.2,z:player.z+Math.sin(a)*.5,vx:Math.cos(a)*.3,vy:1.6,vz:Math.sin(a)*.3,s0:.12,s1:.02,life:.8,c0:[.35,.7,1],c1:[.6,.9,1],op:.9,add:true,drag:1})}},
  zoomOff(){if(!this.zoomOn)return;this.zoomOn=false;this.fov()},
  zoom(on){const W=this.w();if(!W||!W.zoom||this.phase!=='play'){this.zoomOn=false;this.fov();return}this.zoomOn=on===undefined?!this.zoomOn:on;this.fov()},
  fov(){if(!this.fov0)this.fov0=camera.fov;const f=this.zoomOn?20:this.fov0+(this.on&&this.phase==='sky'&&!this.gl?10:0);if(Math.abs(camera.fov-f)>.01){camera.fov=this.zoomOn||Math.abs(camera.fov-f)<.3?f:camera.fov+(f-camera.fov)*.1;camera.updateProjectionMatrix()}      // free fall widens the view a little, smoothlyif(this.ui)this.ui.scope.style.opacity=this.zoomOn?1:0;PLR.root.visible=!this.zoomOn||!this.on;
    // looking through the scope = first person (stepCamera hides the avatar and uses the eye when cam.dist <= .75), then the old distance comes back
    if(this.on&&this.zoomOn){if(this.zd===undefined){this.zd=cam.dist;cam.dist=.6}}else if(this.zd!==undefined){cam.dist=this.zd;this.zd=undefined}},
  // ---------- damage ----------
  hurt(v,by){if(!this.on||this.dead||this.phase!=='play'&&this.phase!=='sky')return;v=Math.round(v);if(v<=0)return;GUN.flash=.35;
    const a=Math.min(this.sh,v);this.sh-=a;v-=a;GUN.hp=Math.max(0,GUN.hp-v);if(by&&by.bot)this.lastBy=by;if(typeof BRFX!=='undefined')BRFX.myHit();this.dirty=true;
    if(GUN.hp<=0)this.die(by);else GUN.push()},
  boom(x,y,z,r,dmg){BOTS.boom(x,y,z,r,dmg,{me:true,w:'Rocket'});if(typeof BLD!=='undefined')BLD.boom(x,y,z,r,dmg)},
  melee(fx,fz,dmg){const W=this.w();return BOTS.melee(player.x,player.z,fx,fz,dmg,{me:true,w:W?W.n:'Katana'})+this.hitChests(fx,fz,dmg)},
  die(by){this.place=this.alive();this.dead=true;this.phase='dead';GUN.down=0;const name=by&&by.bot?by.bot.name:(by&&by.st&&by.st.n)||(by&&by.zone?'the storm':'yourself');
    this.feed(by&&by.bot?by.bot.name:name,'You',by&&by.w||(by&&by.zone?'Storm':''),true);POSE.stop(PLR);this.cancelDrink();
    GUN.kb=[++GUN.seq,by&&by.peer?by.peer:'',by&&by.bot?by.bot.name:(by&&by.st?by.st.n||'Friend':(by&&by.zone?'The storm':''))];GUN.push();
    for(let i=1;i<5;i++){const s=this.inv[i];if(s&&s.k==='w')this.addItem(s,player.x+Math.cos(i*1.6)*1.3,player.z+Math.sin(i*1.6)*1.3,{y:player.y,ok:true})}
    GUN.noHold=true;PLR.root.rotation.set(0,player.yaw,0);this.fall=0;this.snd('down');this.zoomOff();
    if(by&&by.bot)by.bot.kills++;S.br=S.br||{wins:0,played:0,kills:0};S.br.played++;S.br.kills+=this.kills;saveS();
    setTimeout(()=>this.result(false,name),1600)},
  win(){if(this.dead||this.phase==='won')return;this.phase='won';this.place=1;S.br=S.br||{wins:0,played:0,kills:0};S.br.wins++;S.br.played++;S.br.kills+=this.kills;saveS();this.snd('win');
    POSE.emote(PLR,['griddy','default','floss','orange'][Math.floor(Math.random()*4)],true);this.winT=0;setTimeout(()=>this.result(true),2800)},
  // ---------- storm ----------
  stormPlan(){this.plan=[];let c={x:this.C.x,z:this.C.z,r:this.R0},t=0;   // the whole schedule is drawn from the seed now and played from the wall clock: every player sees the same circle at the same moment
    BR_STORM.forEach(ph=>{const ang=this.rnd()*6.283,off=Math.max(0,(c.r-ph.r)*(.2+.6*this.rnd()));const to={x:c.x+Math.cos(ang)*off,z:c.z+Math.sin(ang)*off,r:ph.r};this.plan.push({from:c,to,t0:t,wait:ph.wait,shrink:ph.shrink});c=to;t+=ph.wait+ph.shrink});
    this.zc={x:this.C.x,z:this.C.z,r:this.R0};this.sp=-1;this.zn=null;this.stT=0;this.shrinking=false;this.stormSet(0)},
  stormClock(){return Math.max(0,(Date.now()-this.t0)/1000-this.STORM_T0)},
  stormSet(t){const pl=this.plan;const i=pl.findIndex(p=>t<p.t0+p.wait+p.shrink);
    if(i<0){const l=pl[pl.length-1];this.zc={x:l.to.x,z:l.to.z,r:l.to.r};this.zn=null;this.sp=pl.length;this.shrinking=false;return}
    const p=pl[i],l=t-p.t0;
    if(i!==this.sp){this.sp=i;this.zFrom=p.from;this.zn=p.to;this.shrinking=false;if(this.phase==='play')this.msgStorm()}
    this.stT=l;
    if(l<p.wait){this.shrinking=false;this.zc={x:p.from.x,z:p.from.z,r:p.from.r}}
    else{if(!this.shrinking){this.shrinking=true;if(this.phase==='play')this.banner('THE STORM IS CLOSING','',2.5)}
      const u=Math.min(1,(l-p.wait)/p.shrink);this.zc={x:p.from.x+(p.to.x-p.from.x)*u,z:p.from.z+(p.to.z-p.from.z)*u,r:p.from.r+(p.to.r-p.from.r)*u}}},
  msgStorm(){this.banner('STORM '+(this.sp+1)+' FORMING','Move to the white circle',3)},
  stormTick(dt){this.stormSet(this.stormClock())},
  inZone(x,z){return Math.hypot(x-this.zc.x,z-this.zc.z)<=this.zc.r},
  dmg(){return BR_STORM[Math.max(0,Math.min(this.sp,BR_STORM.length-1))].dmg},
  buildStorm(){const tex=(()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=128;const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,128);g.addColorStop(0,'rgba(150,80,255,0)');g.addColorStop(.5,'rgba(130,60,240,.55)');g.addColorStop(1,'rgba(90,40,200,.8)');x.fillStyle=g;x.fillRect(0,0,64,128);x.fillStyle='rgba(220,180,255,.35)';for(let i=0;i<64;i+=8)x.fillRect(i,0,2,128);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(40,1);return t})();
    const w=new THREE.Mesh(new THREE.CylinderGeometry(1,1,700,96,1,true),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));w.frustumCulled=false;w.renderOrder=5;
    const n=new THREE.Mesh(new THREE.CylinderGeometry(1,1,300,96,1,true),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false,fog:false}));n.frustumCulled=false;
    scene.add(w);scene.add(n);this.wall=w;this.nextW=n;this.wallTex=tex},
  updStorm(dt){if(!this.wall)return;const y=player.y+150;this.wall.position.set(this.zc.x,y,this.zc.z);this.wall.scale.set(this.zc.r,1,this.zc.r);this.wallTex.offset.y-=dt*.12;this.wallTex.offset.x+=dt*.01;
    if(this.zn){this.nextW.visible=true;this.nextW.position.set(this.zn.x,player.y+60,this.zn.z);this.nextW.scale.set(this.zn.r,1,this.zn.r)}else this.nextW.visible=false},
  // ---------- bus + skydive ----------
  startBus(){const ang=this.rnd()*6.283,dx=Math.sin(ang),dz=Math.cos(ang),L=this.R0*1.15;
    this.bus={x0:this.C.x-dx*L,z0:this.C.z-dz*L,dx,dz,L:L*2,sp:34,t:0,yaw:Math.atan2(dx,dz),y:groundH(this.C.x,this.C.z)+460,m:BRM.bus()};scene.add(this.bus.m);
    this.ctl=true;this.phase='bus';this.busDur=this.bus.L/this.bus.sp;this.gl=0;this.glider=BRM.glider();PLR.root.add(this.glider);
    teleportRaw(this.bus.x0,this.bus.z0,this.bus.yaw);player.y=this.bus.y+2.9;player.air=false;player.vy=0;cam.dist=24;cam.pitch=.22;cam.yaw=this.bus.yaw;
    this.banner('BATTLE BUS','Press JUMP to leave the bus',4);if(this.ui)this.ui.jump.hidden=false},
  busDurFor(){return this.R0*2.3/34},
  busPos(){const b=this.bus,s=Math.min(b.L,b.t*b.sp);return {x:b.x0+b.dx*s,z:b.z0+b.dz*s}},
  jumpBus(){if(this.phase!=='bus')return;this.phase='sky';const p=this.busPos();player.x=p.x;player.z=p.z;player.y=this.bus.y+1;player.vx=player.vz=0;player.vy=-5;this.gl=0;PLR.sky=1;
    cam.dist=Math.max(cam.dist,8);cam.pitch=.7;if(this.ui)this.ui.jump.hidden=true;this.banner('FREE FALL','Your glider opens near the ground · W / stick steers',3);this.snd('jump')},
  ctlStep(dt){
    if(this.phase==='bus'){const b=this.bus;b.t=Math.max(0,(Date.now()-this.t0)/1000);const p=this.busPos();b.m.position.set(p.x,b.y,p.z);b.m.rotation.y=b.yaw;player.x=p.x;player.z=p.z;player.y=b.y+3.0;player.yaw=b.yaw;player.vx=player.vz=0;
      PLR.root.position.set(player.x,player.y,player.z);PLR.root.rotation.set(0,player.yaw,0,'XYZ');animPlayer(PLR,{spd:0,mode:'walk'},dt);
      if(Date.now()<this.t0)inp.jump=false;else if(inp.jump||b.t>this.busDur){inp.jump=false;this.jumpBus()}return}
    if(this.phase!=='sky'){this.ctl=false;return}
    let ix=0,iz=0;if(inp.k.KeyW||inp.k.ArrowUp)iz+=1;if(inp.k.KeyS||inp.k.ArrowDown)iz-=1;if(inp.k.KeyA||inp.k.ArrowLeft)ix-=1;if(inp.k.KeyD||inp.k.ArrowRight)ix+=1;ix+=inp.jx;iz+=inp.jy;const im=Math.hypot(ix,iz);if(im>1){ix/=im;iz/=im}
    const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw),hs=this.gl?21:32,tx=(fx*iz+rx*ix)*hs+fx*(im<.1?4:0),tz=(fz*iz+rz*ix)*hs+fz*(im<.1?4:0);
    player.vx+=(tx-player.vx)*Math.min(1,dt*1.6);player.vz+=(tz-player.vz)*Math.min(1,dt*1.6);player.x+=player.vx*dt;player.z+=player.vz*dt;
    const g=groundAt(player.x,player.z,player.y+3),ag=player.y-g;
    if(!this.gl&&(inp.jump||ag<85)){inp.jump=false;this.gl=1;PLR.sky=2;this.glider.visible=true;this.snd('glide');this.banner('GLIDER OUT','',1.5)}
    const vt=this.gl?-8.5:(iz>.3?-62:iz<-.3?-44:-52);player.vy+=(vt-player.vy)*Math.min(1,dt*(this.gl?2.4:1.2));player.y+=player.vy*dt;
    if(Math.hypot(player.vx,player.vz)>2){let dy=Math.atan2(player.vx,player.vz)-player.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;player.yaw+=dy*Math.min(1,dt*4)}
    if(player.y<=g+.15){this.land(g);return}
    PLR.root.position.set(player.x,player.y+(this.gl?0:.85),player.z);
    if(this.gl)PLR.root.rotation.set(0,player.yaw,0,'XYZ');else PLR.root.rotation.set(1.2,player.yaw,0,'YXZ');
    animPlayer(PLR,{spd:0,mode:'walk'},dt)},
  land(g){this.ctl=false;this.phase='play';PLR.sky=0;this.glider.visible=false;player.y=g;player.vx=player.vz=player.vy=0;player.air=false;PLR.root.rotation.set(0,player.yaw,0,'XYZ');
    cam.dist=4.1;cam.pitch=.2;FX.init();for(let i=0;i<10;i++)FX.puff({x:player.x+(Math.random()-.5),y:g+.1,z:player.z+(Math.random()-.5),vx:(Math.random()-.5)*3,vy:.5,vz:(Math.random()-.5)*3,s0:.3,s1:1.4,life:.8,c0:[.8,.78,.7],c1:[.6,.6,.6],op:.4,add:false,drag:2,grow:1});
    this.snd('land');if(window.AUD&&AUD.land)AUD.land();this.banner('LANDED','Find a weapon — open chests, grab shield potions',3.5);GUN.noHold=true;
    const it=this.inv[0];this.select(0);GUN.noHold=false;GUN.aimT=0},
  // ---------- hud / ui ----------
  banner(a,b,sec){const u=this.ui;if(!u)return;u.ban.innerHTML='<b>'+a+'</b>'+(b?'<small>'+b+'</small>':'');u.ban.classList.add('on');clearTimeout(this.bnT);this.bnT=setTimeout(()=>u.ban.classList.remove('on'),(sec||2.5)*1000)},
  msg(t){const u=this.ui;if(!u)return;u.msg.textContent=t;u.msg.classList.add('on');clearTimeout(this.msT);this.msT=setTimeout(()=>u.msg.classList.remove('on'),1800)},
  feed(a,b,w,me){const u=this.ui;if(!u)return;const d=document.createElement('div');if(me)d.className='me';d.innerHTML='<b>'+String(a).replace(/[<>&]/g,'')+'</b>'+(w?'<i>'+String(w).replace(/[<>&]/g,'')+'</i>':'<i>›</i>')+'<span>'+String(b).replace(/[<>&]/g,'')+'</span>';u.feed.appendChild(d);while(u.feed.children.length>5)u.feed.firstChild.remove();setTimeout(()=>d.remove(),6500)},
  SHORT:{axe:'Katana',pistol:'Pistol',cannon:'Cannon',smg:'SMG',ar:'Rifle',shotgun:'Shotgun',sniper:'Sniper',rocket:'Rocket',mini:'Mini',big:'Potion',bandage:'Bandage',medkit:'Kit'},
  ui_(){this.dirty=true},
  hud(){const u=this.ui;if(!u)return;const al=this.alive();u.al.textContent=al;u.kl.textContent=this.kills;
    u.sh.style.width=this.sh+'%';u.shN.textContent=Math.round(this.sh);u.hp.style.width=GUN.hp+'%';
    for(const [c,v] of [[u.shC,this.sh],[u.hpC,GUN.hp]]){if(!c)continue;const up=v>=(c._v||0);c.classList.toggle('snap',up);c.style.width=v+'%';c._v=v}
    u.hpN.textContent=Math.round(GUN.hp);u.hp.style.background=GUN.hp>50?'#4ec27a':GUN.hp>25?'#e0b53a':'#d8453a';
    const ph=BR_STORM[Math.max(0,this.sp)],tl=this.zn?(this.shrinking?Math.max(0,ph.wait+ph.shrink-this.stT):Math.max(0,ph.wait-this.stT)):0;
    u.stT.textContent=this.phase==='bus'&&Date.now()<this.t0?'STARTING IN '+Math.ceil((this.t0-Date.now())/1000)+' S':this.phase==='bus'||this.phase==='sky'?'BATTLE BUS':!this.zn?'FINAL CIRCLE':(this.shrinking?'STORM CLOSING ':'STORM IN ')+Math.floor(tl/60)+':'+String(Math.floor(tl%60)).padStart(2,'0');
    u.stB.style.width=(this.zn?100*(this.shrinking?1-(this.stT-ph.wait)/ph.shrink:1-this.stT/ph.wait):0)+'%';u.stB.style.background=this.shrinking?'#b455ff':'#f2f2f2';
    u.bar.querySelectorAll('button').forEach((b,i)=>{const s=this.inv[i];b.classList.toggle('on',i===this.sel&&!!s);b.className=(i===this.sel?'on ':'')+(s?'has':'');
      if(!s){b.innerHTML='<i>'+(i+1)+'</i>';b.style.borderBottomColor='#555';return}
      if(s.k==='w'){const W=BRW[s.id];b.style.borderBottomColor=i===0?'#ff4fa3':RAR[s.rar].c;b.innerHTML='<i>'+(i+1)+'</i><span>'+this.SHORT[s.id]+'</span>'+(W.mag?'<em>'+s.mag+'<small>/'+this.ammo[W.ammo]+'</small></em>':'')}
      else{b.style.borderBottomColor=BRC[s.id].col;b.innerHTML='<i>'+(i+1)+'</i><span>'+this.SHORT[s.id]+'</span><em>x'+s.n+'</em>'}});
    if(this.phase==='bus'){const live=Date.now()>=this.t0;u.jump.hidden=!(live||this.host);u.jump.textContent=live?'JUMP':'START NOW'}
    const W=this.w(),s=this.cur();const bm=typeof BLD!=='undefined'&&BLD.mode;u.rel.hidden=!(W&&W.mag&&this.phase==='play'&&!bm);u.fire.hidden=!(this.phase==='play'&&!this.dead&&(W||bm));u.zoom.hidden=!(W&&W.zoom&&this.phase==='play'&&!bm);
    u.rel.textContent=this.rl>0?'…':'Reload';u.cross.style.opacity=(W&&!W.melee&&this.phase==='play')?1:0;
    u.vig.style.opacity=this.out?(.35+.15*Math.sin(performance.now()*.006)):0},
  buildUI(){const css=document.createElement('style');css.textContent=`
body.br-on #gunBar,body.br-on #gunBoard,body.br-on #gunHud,body.br-on #bGun,body.br-on #bHS,body.br-on #bCar,body.br-on #qMenu #bScoot,body.br-on #qMenu #bHeli{display:none!important}
body.br-on #bAct{bottom:calc(214px + env(safe-area-inset-bottom,0px))!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;max-width:74vw;z-index:9}
#brHud{position:fixed;inset:0;pointer-events:none;z-index:7;font-family:var(--f-disp,system-ui)}#brHud[hidden]{display:none}
#brHud button{pointer-events:auto}
#brTop{position:absolute;right:max(10px,env(safe-area-inset-right));top:calc(188px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:3px;align-items:flex-end}
#brTop .bx{display:flex;align-items:baseline;gap:6px;background:rgba(0,0,0,.6);border-right:4px solid var(--sun,#f2c14e);padding:4px 10px 4px 14px;clip-path:polygon(8px 0,100% 0,100% 100%,0 100%);color:#fff}
#brTop .bx b{font:800 17px var(--f-disp,system-ui)}#brTop .bx small{font:700 8px var(--f-disp,system-ui);letter-spacing:.14em;color:#cfcab9}
#brStorm{position:absolute;right:max(10px,env(safe-area-inset-right));top:calc(248px + env(safe-area-inset-top,0px));width:132px;background:rgba(0,0,0,.6);padding:4px 8px 5px;clip-path:polygon(8px 0,100% 0,100% 100%,0 100%);color:#fff;font:800 8.5px var(--f-disp,system-ui);letter-spacing:.1em;text-align:right}
#brStorm i{display:block;height:3px;background:#f2f2f2;margin-top:3px;width:0}
#brFeed{position:absolute;right:max(10px,env(safe-area-inset-right));top:calc(282px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:2px;align-items:flex-end;max-width:62vw}
#brFeed div{background:rgba(0,0,0,.6);padding:3px 8px;font:700 9.5px var(--f-disp,system-ui);color:#fff;white-space:nowrap;border-left:3px solid #8a8a8a}#brFeed .me{border-left-color:var(--sun,#f2c14e)}#brFeed i{font-style:normal;color:#f2c14e;margin:0 6px}#brFeed span{color:#ff9a8a}#brFeed .me b{color:var(--sun,#f2c14e)}
#brBars{position:absolute;left:max(6px,env(safe-area-inset-left));bottom:calc(40px + env(safe-area-inset-bottom,0px));width:184px;display:flex;flex-direction:column;gap:3px}
#brBars div{position:relative;height:11px;background:rgba(0,0,0,.62);clip-path:polygon(0 0,100% 0,calc(100% - 6px) 100%,0 100%)}#brBars i{display:block;height:100%;width:0;transition:width .15s}
#brBars b{position:absolute;right:9px;top:0;font:800 9px/11px var(--f-disp,system-ui);color:#fff;text-shadow:0 1px 2px #000}#brBars .s i{background:#3ab8ff}
#brBars u{position:absolute;left:0;top:0;height:100%;width:0;background:#fff;opacity:.92;transition:width .5s ease .35s}#brBars u.snap{transition:none}
#brBars i{position:relative}
#brBars.hit>div{animation:brShk .34s}#brBars.hit i{animation:brFl .34s}
@keyframes brShk{0%,100%{transform:translateX(0)}15%{transform:translateX(-8px) scale(1.05)}35%{transform:translateX(7px)}55%{transform:translateX(-4px)}75%{transform:translateX(2px)}}
@keyframes brFl{0%{filter:brightness(3)}100%{filter:none}}
#brBar{position:absolute;left:max(6px,env(safe-area-inset-left));bottom:calc(4px + env(safe-area-inset-bottom,0px));display:flex;gap:2px}
#brBar button{position:relative;width:35px;height:33px;border:0;border-bottom:3px solid #555;border-radius:0;background:rgba(0,0,0,.6);color:#e9e6dc;padding:1px 2px;font:700 6px/1.1 var(--f-disp,system-ui);text-align:left;backdrop-filter:none;-webkit-backdrop-filter:none;clip-path:polygon(0 0,100% 0,calc(100% - 4px) 100%,0 100%);touch-action:manipulation}
#brBar button.on{background:var(--sun,#f2c14e);color:#111}#brBar button i{position:absolute;left:3px;top:1px;font:800 7px var(--f-disp,system-ui);font-style:normal;opacity:.7}#brBar button span{display:block;margin:8px 0 0;letter-spacing:0;text-transform:uppercase;overflow:hidden}
#brBar button em{position:absolute;right:5px;bottom:1px;font:800 8px var(--f-disp,system-ui);font-style:normal}#brBar button em small{font-size:6px;opacity:.7}
@media (min-width:700px){#brBar{left:50%;transform:translateX(-50%);gap:3px}#brBar button{width:62px;height:44px;font-size:8.5px;padding:2px 4px}#brBar button i{font-size:9px}#brBar button span{margin-top:11px}#brBar button em{font-size:11px}#brBar button em small{font-size:8px}#brBars{left:50%;transform:translateX(-50%);bottom:calc(56px + env(safe-area-inset-bottom,0px));width:230px}}
#brCross{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;opacity:0;transition:opacity .15s}
#brCross::before,#brCross::after{content:'';position:absolute;background:#fff;box-shadow:0 0 3px #000}#brCross::before{left:7px;top:0;width:2px;height:16px;clip-path:polygon(0 0,100% 0,100% 30%,0 30%,0 70%,100% 70%,100% 100%,0 100%)}#brCross::after{top:7px;left:0;height:2px;width:16px;clip-path:polygon(0 0,30% 0,30% 100%,0 100%,70% 100%,70% 0,100% 0,100% 100%)}
#brHit{position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;opacity:0}
#brHit.on{opacity:1}#brHit::before,#brHit::after{content:'';position:absolute;left:12px;top:-2px;width:2px;height:30px;background:#fff;transform:rotate(45deg)}#brHit::after{transform:rotate(-45deg)}#brHit.hd::before,#brHit.hd::after{background:#ff4a3a}
#brBan{position:absolute;left:50%;top:26%;transform:translateX(-50%) scale(.9);text-align:center;color:#fff;opacity:0;transition:opacity .25s,transform .25s;width:90vw}
#brBan.on{opacity:1;transform:translateX(-50%) scale(1)}#brBan b{display:block;font:900 clamp(20px,6vw,38px) var(--f-disp,system-ui);letter-spacing:.12em;text-shadow:0 3px 12px #000;color:var(--sun,#f2c14e)}#brBan small{display:block;margin-top:4px;font:700 11px var(--f-disp,system-ui);letter-spacing:.14em;text-shadow:0 2px 6px #000}
#brMsg{position:absolute;left:50%;bottom:calc(104px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);white-space:nowrap;max-width:92vw;background:rgba(0,0,0,.7);padding:5px 14px;color:#fff;font:700 10px var(--f-disp,system-ui);letter-spacing:.08em;text-transform:uppercase;opacity:0;transition:opacity .2s;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}#brMsg.on{opacity:1}
#brJump{position:absolute;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);border:0;background:var(--sun,#f2c14e);color:#111;font:900 15px var(--f-disp,system-ui);letter-spacing:.12em;padding:15px 34px;clip-path:polygon(0 0,100% 0,calc(100% - 12px) 100%,0 100%);border-left:6px solid #fff;z-index:9}
#brRel,#brZoom{position:absolute;right:max(104px,calc(env(safe-area-inset-right) + 104px));bottom:calc(122px + env(safe-area-inset-bottom,0px));border:0;border-left:3px solid var(--sun,#f2c14e);background:rgba(0,0,0,.65);color:#fff;font:800 9px var(--f-disp,system-ui);letter-spacing:.08em;padding:9px 12px 9px 9px;text-transform:uppercase;clip-path:polygon(0 0,100% 0,calc(100% - 7px) 100%,0 100%)}
#brZoom{bottom:calc(166px + env(safe-area-inset-bottom,0px))}
#brVig{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(120,50,230,0) 35%,rgba(120,50,230,.8) 100%);opacity:0;transition:opacity .3s}
#brScope{position:absolute;inset:0;opacity:0;background:radial-gradient(circle at center,transparent 0,transparent 24vmin,#000 25vmin);transition:opacity .15s}
#brInv{position:fixed;left:50%;top:46%;transform:translateX(-50%);z-index:12;border:0;border-left:6px solid #fff;background:var(--sun,#f2c14e);color:#111;font:900 12px var(--f-disp,system-ui);letter-spacing:.1em;padding:12px 24px 12px 16px;text-transform:uppercase;clip-path:polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%);max-width:92vw;white-space:nowrap}#brInv[hidden]{display:none}
#brRes{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(40,30,0,.55),rgba(0,0,0,.82));pointer-events:auto}#brRes[hidden]{display:none}
#brRes .card{text-align:center;color:#fff;padding:20px;max-width:92vw}
#brRes h1{margin:0;font:900 clamp(26px,9vw,64px)/1 var(--f-disp,system-ui);letter-spacing:.1em;color:#fff;text-shadow:0 4px 18px #000}
#brRes .no1{font:900 clamp(60px,26vw,170px)/1 var(--f-disp,system-ui);color:#ffc431;text-shadow:0 0 30px rgba(255,170,0,.6),0 6px 0 #a56200;margin:4px 0}
#brRes h2{margin:0 0 6px;font:800 11px var(--f-disp,system-ui);letter-spacing:.3em;color:var(--sun,#f2c14e);text-transform:uppercase}
#brRes p{margin:8px 0 16px;font:600 13px system-ui;color:#ddd9ce}
#brRes .row{display:flex;gap:8px;justify-content:center}#brRes button{border:0;border-left:5px solid var(--sun,#f2c14e);background:rgba(0,0,0,.7);color:#fff;font:800 12px var(--f-disp,system-ui);letter-spacing:.1em;padding:12px 22px 12px 16px;text-transform:uppercase;clip-path:polygon(0 0,100% 0,calc(100% - 10px) 100%,0 100%)}#brRes button.go{background:var(--sun,#f2c14e);color:#111}
`;document.head.appendChild(css);
    const h=document.createElement('div');h.id='brHud';h.hidden=true;
    h.innerHTML='<div id="brVig"></div><div id="brScope"></div><div id="brTop"><div class="bx"><b id="brAl">0</b><small>LEFT</small></div><div class="bx"><b id="brKl">0</b><small>ELIMS</small></div></div>'+
      '<div id="brStorm"><span id="brStT"></span><i id="brStB"></i></div><div id="brFeed"></div><div id="brBars"><div class="s"><u id="brShC"></u><i id="brSh"></i><b id="brShN">0</b></div><div><u id="brHpC"></u><i id="brHp"></i><b id="brHpN">100</b></div></div>'+
      '<div id="brBar"></div><div id="brCross"></div><div id="brHit"></div><div id="brBan"></div><div id="brMsg"></div><button id="brJump" hidden>JUMP</button><button id="brRel" hidden>Reload</button><button id="brZoom" hidden>Zoom</button>';
    document.body.appendChild(h);const g=id=>h.querySelector('#'+id);
    const ui={root:h,al:g('brAl'),kl:g('brKl'),stT:g('brStT'),stB:g('brStB'),feed:g('brFeed'),sh:g('brSh'),shN:g('brShN'),hp:g('brHp'),hpN:g('brHpN'),shC:g('brShC'),hpC:g('brHpC'),bar:g('brBar'),cross:g('brCross'),hit:g('brHit'),ban:g('brBan'),msg:g('brMsg'),jump:g('brJump'),rel:g('brRel'),zoom:g('brZoom'),vig:g('brVig'),scope:g('brScope'),fire:document.getElementById('gunFire')};
    for(let i=0;i<5;i++){const b=document.createElement('button');b.onpointerdown=e=>{e.preventDefault();this.tapSlot(i)};ui.bar.appendChild(b)}
    ui.jump.onclick=()=>{if(Date.now()<this.t0){if(this.host){this.t0=Date.now();this.dirty=true;try{COOP.push(true)}catch(e){}}}else inp.jump=true};ui.rel.onclick=()=>this.reload();ui.zoom.onclick=()=>this.zoom();
    const res=document.createElement('div');res.id='brRes';res.hidden=true;document.body.appendChild(res);ui.res=res;
    const inv=document.createElement('button');inv.id='brInv';inv.hidden=true;document.body.appendChild(inv);ui.inv=inv;this.ui=ui},
  tapSlot(i){const s=this.inv[i];if(!s)return;if(i===this.sel&&s.k==='c'){return}if(s.k==='c')this.prev=this.sel;this.select(i)},
  result(won,by){const r=this.ui.res;const st=S.br||{wins:0,played:0,kills:0};
    r.innerHTML=won?'<div class="card"><h2>Victory Royale</h2><h1>BATTLE ROYALE</h1><div class="no1">#1</div><p>Eliminations: '+this.kills+' · Wins: '+st.wins+'</p><div class="row"><button class="go" id="brAgain">Play again</button><button id="brExit">Back to the city</button></div></div>'
      :'<div class="card"><h2>Eliminated by '+String(by||'the storm').replace(/[<>&]/g,'')+'</h2><h1>BATTLE ROYALE</h1><div class="no1" style="color:#e9e6dc;text-shadow:0 4px 0 #444">#'+this.place+'</div><p>Eliminations: '+this.kills+' · Matches: '+st.played+' · Wins: '+st.wins+'</p><div class="row"><button class="go" id="brAgain">Play again</button><button id="brExit">Back to the city</button></div></div>';
    r.hidden=false;r.querySelector('#brAgain').onclick=()=>{this.end(true);setTimeout(()=>this.start(),400)};r.querySelector('#brExit').onclick=()=>this.end()},
  // ---------- sounds (tiny synth, no files) ----------
  snd(k){try{const ac=GUN.ac||(GUN.ac=new (window.AudioContext||window.webkitAudioContext)());if(ac.state==='suspended')ac.resume();const T=ac.currentTime;
    const tone=(f,d,type,v,f2,dl)=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,T+(dl||0));if(f2)o.frequency.exponentialRampToValueAtTime(f2,T+(dl||0)+d);g.gain.setValueAtTime(v||.15,T+(dl||0));g.gain.exponentialRampToValueAtTime(.001,T+(dl||0)+d);o.connect(g);g.connect(ac.destination);o.start(T+(dl||0));o.stop(T+(dl||0)+d+.02)};
    if(k==='pick')tone(520,.12,'triangle',.14,900);else if(k==='chest'){tone(300,.5,'sawtooth',.06,900);[880,1100,1320,1760].forEach((f,i)=>tone(f,.25,'sine',.1,f*1.01,.35+i*.07))}
    else if(k==='swing')tone(520,.16,'sawtooth',.035,140);else if(k==='thud'){tone(150,.14,'square',.11,55);tone(900,.04,'triangle',.05)}else if(k==='crack'){tone(110,.28,'sawtooth',.12,40);tone(1400,.08,'square',.06,300)}
    else if(k==='hit')tone(1500,.05,'square',.07);else if(k==='head')tone(2200,.09,'square',.09);else if(k==='click')tone(180,.05,'square',.1);
    else if(k==='rl'){tone(240,.07,'square',.07,0,.25);tone(320,.06,'square',.07,0,1.1)}else if(k==='drink'){for(let i=0;i<4;i++)tone(300+i*60,.14,'sine',.07,520+i*50,i*.4)}
    else if(k==='done'){tone(660,.1,'triangle',.12);tone(990,.18,'triangle',.12,0,.1)}else if(k==='down')tone(220,.9,'sawtooth',.14,40);
    else if(k==='win')[523,659,784,1047,1319].forEach((f,i)=>tone(f,.4,'triangle',.14,0,i*.16));else if(k==='jump')tone(400,.5,'sawtooth',.05,100);else if(k==='glide')tone(300,.4,'triangle',.08,700);else if(k==='land')tone(110,.25,'sine',.2,45)}catch(e){}},
  // ---------- minimap: the zone ----------
  mini(x,R,scale){if(!this.zc)return;const cx=(this.zc.x-player.x)*scale,cz=(this.zc.z-player.z)*scale;x.save();x.beginPath();x.rect(-R*3,-R*3,R*6,R*6);x.arc(cx,cz,this.zc.r*scale,0,7,true);x.fillStyle='rgba(120,60,230,.38)';x.fill('evenodd');x.restore();
    x.save();x.strokeStyle='#b88cff';x.lineWidth=2;x.beginPath();x.arc(cx,cz,this.zc.r*scale,0,7);x.stroke();
    if(this.zn){x.strokeStyle='#fff';x.lineWidth=2.5;x.beginPath();x.arc((this.zn.x-player.x)*scale,(this.zn.z-player.z)*scale,this.zn.r*scale,0,7);x.stroke()}
    x.fillStyle='#ffc04a';for(const it of this.items){if(it.k!=='x'||it.taken||it.open)continue;const px=(it.x-player.x)*scale,pz=(it.z-player.z)*scale;if(Math.hypot(px,pz)<R-6){x.fillRect(px-4,pz-3,8,6)}}x.restore()},
  alive(){return BOTS.alive()+(this.dead?0:1)+this.mates().filter(R=>R.st.br.a!==0).length},
  // ---------- friends in the same match (presence only, like Hide & Seek) ----------
  mates(){const out=[];if(!this.rd)return out;for(const R of COOP.peers.values()){const b=R.st&&R.st.br;if(b&&b.rd===this.rd&&!b.end&&R.st.in)out.push(R)}return out},
  friends(){let n=0;for(const R of COOP.peers.values())if(R.st&&R.st.in&&!(R.st.br&&!R.st.br.end))n++;return n},
  // a friend's round that can still be joined (the bus is still on its way)
  openRound(){let best=null;const now=Date.now();if(typeof COOP==='undefined')return null;for(const R of COOP.peers.values()){const b=R.st&&R.st.br;if(!b||b.end||!b.rd||!b.sd||b.t0===undefined)continue;
      if((now-b.t0)/1000>this.busDurFor()-4)continue;if(!best||b.rd<best.rd)best={rd:b.rd,sd:b.sd,t0:b.t0,name:R.st.n}}return best},
  matesOf(rd){let n=0;for(const R of COOP.peers.values()){const b=R.st&&R.st.br;if(b&&b.rd===rd&&!b.end)n++}return n},
  pub(){if(!this.rd)return null;if(!this.on)return {rd:this.rd,end:1};
    const o={rd:this.rd,sd:this.sd,t0:this.t0,a:this.dead?0:1,k:this.kills,s:Math.round(this.sh),sk:this.phase==='sky'?(this.gl?2:1):0};if(this.dead||this.phase==='won')o.p=this.place;if(this.op.length)o.o=this.op;if(this.tk.length)o.t=this.tk;if(typeof BLD!=='undefined'){const bp=BLD.pub();if(bp.length)o.b=bp}return o},
  // loot the others opened/took disappears here too; a host who presses START NOW pulls the start time forward for everybody
  syncMates(dt){this.mT=(this.mT||0)-dt;if(this.mT>0)return;this.mT=.25;
    for(const R of this.mates()){const b=R.st.br;if(b.t0!==undefined&&b.t0<this.t0&&Date.now()<this.t0)this.t0=b.t0;
      if(b.o)for(const id of b.o){const ch=this.items[id];if(ch&&ch.k==='x'&&!ch.open){ch.open=true;this.spill(ch)}}
      if(b.t)for(const id of b.t)this.gone.add(id);if(b.b&&typeof BLD!=='undefined')BLD.sync(b.b)}
    if(this.gone.size)for(const it of this.items)if(!it.taken&&it.sid!==undefined&&this.gone.has(it.sid))this.drop(it)},
  // a friend's avatar: skydive / glider / lying down (called from COOP.update after the normal pose)
  peerPose(R,P,s){const b=s.br,sk=b.sk|0;if(P.sky!==sk)P.sky=sk;
    if(sk===2){if(!P._gl){P._gl=BRM.glider();P._gl.visible=true;P.root.add(P._gl)}}else if(P._gl){P.root.remove(P._gl);P._gl=null}
    if(sk===1){P.root.rotation.set(1.2,R.yaw,0,'YXZ');P.root.position.y+=.85}
    else if(b.a===0){P.root.rotation.set(-1.45,R.yaw,0,'YXZ');P.root.position.y+=.1}},
  // the invite button: a friend started a match and the bus has not left yet
  invWatch(dt){this.wT=(this.wT||0)-dt;if(this.wT>0||!this.ui)return;this.wT=.5;const b=this.ui.inv;if(!b)return;
    const inv=started&&COOP.online()?this.openRound():null;
    if(!inv){b.hidden=true;this.invKey=null;return}
    b.hidden=false;b.textContent=(inv.name||'A friend')+' · Battle Royale · JOIN';b.onclick=()=>this.start(inv);
    if(this.invKey!==inv.rd){this.invKey=inv.rd;toast((inv.name||'A friend')+' started Battle Royale','tap JOIN to drop in with them')}},
  // ---------- match flow ----------
  init(){if(this.ui)return;this.buildUI();const tb=document.getElementById('topBtns');
    const b=document.createElement('button');b.id='bBR';b.textContent='Battle Royale';b.onclick=()=>{if(this.on)this.confirmLeave();else this.start()};if(tb)tb.appendChild(b);this.btn=b;
    addEventListener('keydown',e=>{if(!this.on||!started)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;
      if(/^Digit[1-5]$/.test(e.code)){e.stopImmediatePropagation();e.preventDefault();if(typeof BLD!=='undefined'&&BLD.mode)BLD.pick(+e.code.slice(5)-1);else this.tapSlot(+e.code.slice(5)-1)}
      else if(e.code==='KeyR'){e.stopImmediatePropagation();e.preventDefault();this.reload()}else if(e.code==='KeyZ'){this.zoom()}},true);
    addEventListener('mousedown',e=>{if(!this.on||e.button!==2)return;this.zoom(true)});addEventListener('mouseup',e=>{if(this.on&&e.button===2)this.zoom(false)});
    ANIM.push(dt=>{POSE.tick(dt);BR.tick(dt)})},
  confirmLeave(){if(this.phase==='won'||this.dead)return this.end();if(confirm('Leave the match?'))this.end()},
  start(join){if(this.on||!started)return;this.init();
    const open=join&&join.rd?join:this.openRound(),fr=COOP.online()?this.friends():0;
    if(PORTAL.cur)PORTAL.exit();if(DRIVE.on)exitCar();this.ret={x:player.x,z:player.z,yaw:player.yaw,cam:{d:cam.dist,p:cam.pitch}};player.scoot=false;
    if(open){this.rd=open.rd;this.sd=open.sd;this.t0=open.t0;this.host=false}
    else{this.rd=Date.now();this.sd=(Date.now()%2147483647)|0;this.host=true;this.t0=Date.now()+(fr?25000:0)}   // friends online: 25 s in the bus lobby so they can tap JOIN
    this.seed=this.sd;this.op=[];this.tk=[];this.gone=new Set();this.BOTS=Math.max(3,12-(open?1+this.matesOf(open.rd):1+fr));
    if(this.ui.inv)this.ui.inv.hidden=true;this.on=true;this.dead=false;this.kills=0;this.sh=0;this.out=false;this.fov0=camera.fov;this.items.length=0;this.sT0=0;
    this.inv=[{k:'w',id:'pick',rar:0,mag:0},null,null,null,null];this.sel=0;this.ammo={light:0,medium:0,shells:0,heavy:0,rocket:0};this.rl=0;this.drk=null;this.place=0;this.winT=0;this.prev=undefined;
    document.body.classList.add('br-on');this.ui.root.hidden=false;this.ui.res.hidden=true;this.btn.classList.add('on');
    GUN.setArmed(true);GUN.hp=100;GUN.down=0;GUN.noHold=true;GUN.w=BRW.pick.gi;if(typeof BRFX!=='undefined')BRFX.clear();if(typeof BLD!=='undefined')BLD.start();if(typeof BRH!=='undefined')BRH.start();if(typeof BRDROP!=='undefined')BRDROP.start();
    const C=this.C;
    // chests + floor loot over the whole disc (positions are checked against buildings when you get near)
    const spots=[],min=16;let tries=0;const want=this.CH+this.FL;
    while(spots.length<want&&tries++<2500){const a=this.rnd()*6.283,r=Math.sqrt(this.rnd())*(this.R0-12);const x=C.x+Math.cos(a)*r,z=C.z+Math.sin(a)*r;if(spots.every(s=>Math.hypot(s[0]-x,s[1]-z)>min))spots.push([x,z])}
    spots.forEach((s,i)=>{const it=i<this.CH?this.addItem({k:'x',open:false},s[0],s[1]):this.addItem(this.floorLoot(),s[0],s[1]);it.sid=i});
    this.buildStorm();this.stormPlan();this.zc.r=this.R0;BOTS.spawn(this.BOTS);this.total=BOTS.list.length+1+(open?this.matesOf(open.rd):fr);
    this.startBus();this.fade();this.hud();try{COOP.push(true)}catch(e){}
    this.banner('BATTLE ROYALE',Date.now()<this.t0?'Waiting for friends · '+Math.ceil((this.t0-Date.now())/1000)+' s · or tap START NOW':this.total+' players · last one standing wins',4)},
  CH:26,FL:80,BOTS:11,
  fade(){const f=document.getElementById('fade');if(f){f.style.opacity=1;setTimeout(()=>f.style.opacity=0,500)}},
  end(again){if(!this.on)return;this.on=false;this.phase='';this.ctl=false;this.cancelDrink();this.zoomOn=false;this.fov();BOTS.clear();if(typeof BLD!=='undefined')BLD.end();if(typeof BRH!=='undefined')BRH.end();if(typeof BRDROP!=='undefined')BRDROP.end();if(this.fov0){camera.fov=this.fov0;camera.updateProjectionMatrix()}
    for(const it of this.items)if(it.m){scene.remove(it.m);it.m=null}this.items.length=0;for(const e of this.ints){const i=INTERACT.indexOf(e);if(i>=0)INTERACT.splice(i,1)}this.ints.length=0;
    for(const k of ['wall','nextW']){if(this[k]){scene.remove(this[k]);this[k]=null}}if(this.bus){scene.remove(this.bus.m);this.bus=null}
    if(this.glider){PLR.root.remove(this.glider);this.glider=null}PLR.sky=0;POSE.stop(PLR);PLR.rch=null;PLR.root.rotation.set(0,player.yaw,0,'XYZ');PLR.root.visible=true;
    GUN.noHold=false;GUN.setArmed(false);document.body.classList.remove('br-on');this.ui.root.hidden=true;this.ui.res.hidden=true;this.btn.classList.remove('on');this.ui.jump.hidden=true;
    if(typeof CAMV!=='undefined'&&CAMV.go)CAMV.go(0);GUN.hp=100;GUN.down=0;if(this.ret){cam.dist=this.ret.cam.d;cam.pitch=this.ret.cam.p;if(!again)teleportRaw(this.ret.x,this.ret.z,this.ret.yaw)}this.fade();
    const rd=this.rd;try{COOP.push(true)}catch(e){}setTimeout(()=>{if(!this.on&&this.rd===rd){this.rd=0;try{COOP.push(true)}catch(e){}}},5000)},
  tick(dt){if(!this.on){this.invWatch(dt);if(typeof BRFX!=='undefined')BRFX.tick(dt);return}
    this.syncMates(dt);if(typeof BRFX!=='undefined')BRFX.tick(dt);if(typeof BLD!=='undefined')BLD.tick(dt);if(typeof BRH!=='undefined')BRH.tick(dt);if(typeof BRDROP!=='undefined')BRDROP.tick(dt);
    if(this.dirty||(this.hT=(this.hT||0)-dt)<=0){this.dirty=false;this.hT=.12;this.hud()}
    this.stream(dt);this.animItems(dt);this.fov();
    if(this.phase==='bus'||this.phase==='sky'){BOTS.tick(dt);this.updStorm(dt);return}
    if(this.phase==='won'||this.phase==='dead'){BOTS.tick(dt);this.updStorm(dt);if(this.phase==='dead'){this.fall=Math.min(1,(this.fall||0)+dt*2.2);PLR.root.rotation.set(-1.45*this.fall,player.yaw,0,'YXZ');PLR.root.position.y=player.y+.1*this.fall}
      if(this.phase==='won'){this.winT+=dt;camera.position.set(player.x+Math.sin(this.winT*.5)*4.5,player.y+1.6,player.z+Math.cos(this.winT*.5)*4.5);camera.lookAt(player.x,player.y+1.2,player.z)}return}
    this.stormTick(dt);this.updStorm(dt);
    // storm damage
    this.out=!this.inZone(player.x,player.z);if(this.out){this.sT2=(this.sT2||0)-dt;if(this.sT2<=0){this.sT2=1;GUN.flash=.3;this.hurtStorm(this.dmg())}}else this.sT2=0;
    if(this.rl>0){this.rlT+=dt;if(PLR._gs)PLR._gs.rl=Math.min(.999,this.rlT/this.rlDur);if(this.rlT>=this.rlDur){this.rl=0;const s=this.cur(),W=this.w();if(PLR._gs)PLR._gs.rl=-1;if(s&&W){const n=Math.min(W.mag-s.mag,this.ammo[W.ammo]);s.mag+=n;this.ammo[W.ammo]-=n;this.ui_()}}}
    this.tickDrink(dt);BOTS.tick(dt);
    if(this.alive()<=1&&!this.dead&&BOTS.alive()===0)this.win()},
  hurtStorm(v){this.hurtHp(v)},
  hurtHp(v){GUN.hp=Math.max(0,GUN.hp-v);if(GUN.hp<=0)this.die({zone:1});else GUN.push()}
};
