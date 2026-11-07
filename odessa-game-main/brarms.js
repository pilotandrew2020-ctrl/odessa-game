/* ===================================================================================================
   brarms.js — the Fortnite-style arsenal of the Battle Royale and the harvesting tool.
     models   BRM.pick / esword / hammer / bat / pistol / revolver / smg / tube / themed()   (procedural, barrel or blade along +z)
     skins    scifi (grey + teal + hazard stripes) · gold (black + gold lines) · magma (cracked, glowing orange) · pink / blue crystal
     guns     added to GUN's WEAPONS (what friends see) and to BRW (stats): Magma Sniper, Crystal Pistols (a pair, one per hand), Pulse Rifle,
              Hazard SMG, Gilded Revolver, Gilded Shotgun, Drill Rocket, Guided Missile, Gold RPG, Energy Sword, Plasma Hammer, Lightning Bat
     tool     the Amethyst Pickaxe in slot 1: swings across the body and back (pose.js), breaks chests (BR.hitChests → breakChest)
   =================================================================================================== */
const BRX=(()=>{
const PI=Math.PI;
const mk=(c,r,m,e,ei)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e||0,emissiveIntensity:ei===undefined?1:ei});
const gl=(c,o)=>new THREE.MeshBasicMaterial({color:c,toneMapped:false,transparent:o!==undefined,opacity:o===undefined?1:o,blending:o!==undefined?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:o===undefined});
const cr=(c,e,ei)=>new THREE.MeshStandardMaterial({color:c,roughness:.2,metalness:.3,emissive:e,emissiveIntensity:ei||.9,flatShading:true});
let _hz=null;
const hazTex=()=>{if(_hz)return _hz;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#16181a';x.fillRect(0,0,64,64);x.fillStyle='#f2b21a';
  for(let i=-64;i<128;i+=32){x.beginPath();x.moveTo(i,64);x.lineTo(i+16,64);x.lineTo(i+80,0);x.lineTo(i+64,0);x.fill()}
  _hz=new THREE.CanvasTexture(c);_hz.encoding=THREE.sRGBEncoding;_hz.wrapS=_hz.wrapT=THREE.RepeatWrapping;return _hz};

// rows: [shape, x, y, z, a, b, c, material key, rx, ry, rz] — b box a×b×c · c cylinder along z (a front radius, b length, c back radius) · k cone along z (a radius, b length) · o octahedron (a radius, b stretch along z) · s sphere (a)
const R=(g,mt,rows)=>{for(const r of rows){const [t,x,y,z,a,b,c,k,rx,ry,rz]=r;let geo;
  if(t==='b')geo=new THREE.BoxGeometry(a,b,c);else if(t==='c'){geo=new THREE.CylinderGeometry(a,c||a,b,14);geo.rotateX(PI/2)}else if(t==='k'){geo=new THREE.ConeGeometry(a,b,14);geo.rotateX(PI/2)}
  else if(t==='o'){geo=new THREE.OctahedronGeometry(a,0);geo.scale(1,1,b||1)}else geo=new THREE.SphereGeometry(a,12,9);
  const me=new THREE.Mesh(geo,mt[k]);me.position.set(x,y,z);if(rx)me.rotation.x=rx;if(ry)me.rotation.y=ry;if(rz)me.rotation.z=rz;me.castShadow=true;g.add(me)}};
const seg=(g,mat,a,b,r0,r1)=>{const d=new THREE.Vector3().subVectors(b,a),L=d.length(),me=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,L,8),mat);
  me.position.copy(a).add(b).multiplyScalar(.5);me.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());me.castShadow=true;g.add(me)};

// ---------------------------------------------------------------- skins
const TH={
  scifi:()=>({m:mk(0x8b959c,.35,.6),p:mk(0x2b3238,.6,.3),w:mk(0x59666e,.5,.4),t:mk(0x9aa6ad,.4,.6),r:mk(0xff9a1f,.45,.3),s:mk(0x2fd8c4,.25,.7,0x0a5a50,.8),l:gl(0x3dffe6),g:mk(0x3d474e,.55,.4)}),
  gold :()=>({m:mk(0x15120e,.3,.85),p:mk(0x0b0a08,.6,.3),w:mk(0x1c1812,.4,.6),t:mk(0xe3b13a,.22,1),r:mk(0xe3b13a,.22,1),s:mk(0xf2c24a,.2,1),l:gl(0xffd24a),g:mk(0x1c1812,.4,.6)}),
  magma:()=>({m:mk(0x261b18,.9,.15),p:mk(0x120d0c,.85,.1),w:mk(0x3a2a24,.8,.2),t:mk(0x4d372d,.8,.2),r:gl(0xff5a10),s:mk(0x57423a,.7,.3),l:gl(0xff7a1a),g:mk(0x1a1210,.85,.1)}),
  pink :()=>({m:mk(0xff8fd6,.15,.5,0x401030,.5),p:mk(0x8a3a9f,.3,.4),w:mk(0xd45fb4,.25,.4),t:mk(0xffb3ea,.2,.5),r:mk(0xffe0f6,.2,.5),s:mk(0xffffff,.1,.8),l:gl(0xff4fd0),g:mk(0xb7488f,.3,.4)}),
  blue :()=>({m:mk(0x7ec8ff,.15,.5,0x0f3050,.5),p:mk(0x3a5f9f,.3,.4),w:mk(0x5f9fe0,.25,.4),t:mk(0xb3e0ff,.2,.5),r:mk(0xe0f4ff,.2,.5),s:mk(0xffffff,.1,.8),l:gl(0x4fb8ff),g:mk(0x488fb7,.3,.4)})};
const thm={};const mats=n=>thm[n]||(thm[n]=TH[n]());
// where the decoration goes on each base gun: y top of the receiver, z0..z1 receiver / handguard, mz muzzle, w width
const AN={ar:{y:.07,z0:-.17,z1:.42,mz:.7,w:.05},shotgun:{y:.07,z0:-.1,z1:.2,mz:.78,w:.05},sniper:{y:.07,z0:-.1,z1:.3,mz:.95,w:.046},pistol:{y:.055,z0:0,z1:.25,mz:.26,w:.034},revolver:{y:.05,z0:-.05,z1:.3,mz:.43,w:.04},smg:{y:.065,z0:-.1,z1:.2,mz:.42,w:.05}};
const rnd=(()=>{let s=77;return()=>(s=(s*16807)%2147483647)/2147483647})();
const DEC={
  scifi(g,a){const L=a.z1-a.z0,hm=new THREE.MeshBasicMaterial({map:hazTex(),toneMapped:false});
    for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.004,a.w*.8,L*.42),hm);p.position.set(s*(a.w/2+.002),a.y-a.w*.5,a.z0+L*.28);g.add(p)}
    const st=new THREE.Mesh(new THREE.BoxGeometry(.012,.006,L*.9),mats('scifi').l);st.position.set(0,a.y+.004,(a.z0+a.z1)/2);g.add(st);
    const rg=new THREE.Mesh(new THREE.TorusGeometry(a.w*.45,.004,6,16),mats('scifi').l);rg.position.set(0,a.y-.04,a.mz-.05);g.add(rg)},
  gold(g,a){const L=a.z1-a.z0,y=mats('gold').l;
    for(const s of [-1,1]){const t=new THREE.Mesh(new THREE.BoxGeometry(.004,.004,L),y);t.position.set(s*a.w/2,a.y-.012,(a.z0+a.z1)/2);g.add(t);const u=new THREE.Mesh(new THREE.BoxGeometry(.004,.004,L*.8),y);u.position.set(s*a.w/2,a.y-.045,(a.z0+a.z1)/2);g.add(u)}
    const f=new THREE.Mesh(new THREE.BoxGeometry(a.w,.004,.004),y);f.position.set(0,a.y-.012,a.z1);g.add(f);
    const rg=new THREE.Mesh(new THREE.TorusGeometry(a.w*.4,.004,6,16),y);rg.position.set(0,a.y-.04,a.mz-.06);g.add(rg)},
  magma(g,a){const m=mats('magma').l,z0=a.z0-.35,z1=a.z1+.12,V=THREE.Vector3;
    // lava cracks: short zig-zag walks over both sides and the top of the receiver / stock
    for(let i=0;i<8;i++)for(const side of [1,-1]){const x=side*(a.w/2+.003);let p=new V(x,a.y-.02-rnd()*.03,z0+rnd()*(z1-z0));
      for(let k=0,n=4+Math.floor(rnd()*3);k<n;k++){const q=new V(x,Math.max(a.y-.06,Math.min(a.y+.004,p.y+(rnd()-.5)*.04)),p.z+(rnd()*.05+.015)*(rnd()<.8?1:-1));seg(g,m,p,q,.0034,.0034);p=q}}
    for(let i=0;i<4;i++){let p=new V((rnd()-.5)*a.w*.6,a.y+.004,z0+rnd()*(z1-z0));for(let k=0;k<4;k++){const q=new V(Math.max(-a.w*.4,Math.min(a.w*.4,p.x+(rnd()-.5)*.025)),a.y+.004,p.z+.03+rnd()*.03);seg(g,m,p,q,.003,.003);p=q}}
    for(let k=0;k<3;k++){const r=new THREE.Mesh(new THREE.TorusGeometry(.0135,.003,6,12),m);r.position.set(0,a.y-.04,a.mz-.1-k*.12);g.add(r)}
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.026,10,8),m);tip.position.set(0,a.y-.04,a.mz+.01);g.add(tip);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.06,12,10),gl(0xff6a10,.35));halo.position.copy(tip.position);g.add(halo)},
  crystal(g,a,th){const c1=th==='pink'?cr(0xff5fd0,0xc01a90,1):cr(0x5fb4ff,0x1a6ac0,1),c2=th==='pink'?cr(0xffc2f0,0xe060b8,.8):cr(0xc2e6ff,0x60a0e0,.8);
    [[0,a.y+.03,a.z0+.05,.022,2.2,c1],[.012,a.y+.02,a.z0+.12,.016,1.8,c2],[-.012,a.y+.025,(a.z0+a.z1)/2,.02,2.2,c1],[0,a.y+.02,a.z1-.02,.015,1.8,c2],[0,a.y-.03,a.mz-.12,.02,2,c1],[.02,a.y-.04,a.mz-.2,.014,1.6,c2]].forEach(([x,y,z,r,s,m])=>{const o=new THREE.Mesh(new THREE.OctahedronGeometry(r,0),m);o.scale.set(1,1.4,s);o.position.set(x,y,z);o.rotation.set((rnd()-.5)*.5,0,(rnd()-.5)*.6);g.add(o)})}};

// bolts of the lightning bat flicker through their shared materials (clones of the model share them)
const boltM=[];

// ---------------------------------------------------------------- the builders
const B={
  themed(base,th,g){const keep=BRM.mats;BRM.mats=mats(th==='pinkC'?'pink':th==='blueC'?'blue':th);try{BRM[base](g)}finally{BRM.mats=keep}
    const k=th==='pinkC'||th==='blueC'?'crystal':th;DEC[k](g,AN[base]||AN.ar,th==='pinkC'?'pink':th==='blueC'?'blue':th)},
  pistol(g){BRM.rows(g,[['b',0,.03,.1,.034,.04,.3,'m'],['b',0,.056,.1,.026,.01,.3,'m'],['b',0,.005,.115,.032,.025,.25,'p'],['b',0,-.06,.01,.032,.11,.05,'p',.2],['b',0,-.012,.17,.03,.014,.14,'p'],
    ['b',0,.03,.255,.03,.03,.012,'s'],['b',0,.065,.24,.008,.014,.008,'s'],['b',0,.065,-.04,.014,.014,.01,'s']])},
  revolver(g){BRM.rows(g,[['c',0,.045,.24,.012,.4,0,'s'],['b',0,.03,.2,.03,.04,.36,'m'],['c',0,.022,.0,.04,.075,0,'p'],['b',0,.015,-.03,.04,.075,.12,'m'],['b',0,-.06,-.1,.034,.14,.05,'w',.35],
    ['b',0,.07,-.07,.012,.03,.02,'s'],['b',0,-.02,.02,.012,.04,.08,'s'],['b',0,.065,.42,.01,.02,.01,'s']])},
  smg(g){BRM.rows(g,[['b',0,.03,.04,.05,.07,.34,'m'],['b',0,.03,.28,.044,.05,.14,'p'],['c',0,.03,.42,.011,.2,0,'s'],['b',0,-.1,.08,.032,.2,.055,'p'],['b',0,-.07,-.02,.034,.11,.05,'p',.25],
    ['b',0,.07,.04,.012,.025,.22,'s'],['b',0,.04,-.2,.04,.06,.2,'p'],['b',0,.075,.34,.01,.02,.01,'s']])},
  // a pistol grown out of glowing translucent crystal (pink / blue pair)
  crystalGun(g,th){const P=th==='pink'?{c:0xff6ad0,e:0xc0208f,l:0xffc2f0,d:0x7a3a9a,core:0xff4fd0}:{c:0x6ab4ff,e:0x2060c0,l:0xc2e6ff,d:0x2a4a9a,core:0x4fb8ff};
    const cm=new THREE.MeshStandardMaterial({color:P.c,roughness:.12,metalness:.2,emissive:P.e,emissiveIntensity:.75,flatShading:true,transparent:true,opacity:.9}),
      m={c:cm,l:cr(P.l,P.e,.6),d:mk(P.d,.25,.5,P.e,.25),k:gl(P.core)};
    R(g,m,[['o',0,.035,.1,.05,3.6,0,'c'],['o',0,.03,.12,.03,3.2,0,'l'],['k',0,.035,.3,.017,.14,0,'c'],['b',0,-.06,0,.036,.11,.05,'d',.2],['o',0,-.022,.08,.03,2.0,0,'d'],
      ['o',0,.07,.09,.02,2.6,0,'l'],['o',.022,.055,.2,.014,2.2,0,'c'],['o',-.022,.055,.02,.016,2.2,0,'c'],['o',.03,.02,.12,.016,2.0,0,'l'],['o',-.03,.02,.15,.016,2.0,0,'l'],['s',0,.035,.08,.016,0,0,'k']])},
  // generic shoulder launcher; o.kind picks the warhead (drill bit, guided missile with a joystick, RPG bulb)
  tube(g,o){const m={b:mk(o.body,.4,.7),a:mk(o.acc,.25,.95),d:mk(0x15130f,.8,.2),g:gl(o.glow),k:mk(0x8a8d92,.3,.9),r:mk(0xd13b2f,.5,.3)};
    R(g,m,[['c',0,0,0,.062,1.0,.062,'b'],['c',0,0,-.56,.07,.16,.11,'a'],['c',0,0,.5,.075,.08,.075,'a'],['c',0,0,.25,.066,.02,.066,'a'],['c',0,0,-.25,.066,.02,.066,'a'],
      ['b',0,-.12,0,.035,.12,.05,'d',.15],['b',0,-.09,.28,.035,.1,.05,'d',-.1],['b',0,-.085,-.34,.075,.07,.16,'d'],['b',-.085,.07,.08,.045,.05,.16,'k'],['c',-.085,.07,.17,.02,.03,.02,'g']]);
    if(o.kind==='drill'){for(let i=0;i<5;i++)R(g,m,[['c',0,0,.56+i*.05,.058-i*.009,.045,.062-i*.009,i%2?'k':'a']]);R(g,m,[['k',0,0,.86,.014,.1,0,'a']])}
    else if(o.kind==='guided'){R(g,m,[['c',0,0,.6,.05,.2,.05,'k'],['k',0,0,.78,.05,.18,0,'r'],['b',0,.05,.58,.012,.06,.1,'a'],['b',0,-.05,.58,.012,.06,.1,'a'],['b',.05,0,.58,.1,.06,.012,'a'],['b',-.05,0,.58,.1,.06,.012,'a'],
      ['b',0,.082,-.1,.07,.03,.08,'d'],['b',0,.118,-.1,.012,.06,.012,'k'],['s',0,.152,-.1,.022,0,0,'r'],['b',0,.075,.12,.05,.01,.1,'g']])}
    else{R(g,m,[['s',0,0,.62,.07,0,0,'a'],['k',0,0,.74,.07,.2,0,'r'],['c',0,0,.5,.07,.1,.04,'a']])}},
  // the harvesting tool: dark steel curved double head, a crystal cluster in its middle, a haft wrapped in amethyst gems
  pick(g){const steel=mk(0x3b3f4a,.3,.9),wrap=mk(0x1a1620,.8,.1),gem=cr(0x8a3cff,0x5a1fd0,1),gem2=cr(0xc79bff,0x8a50e0,.9),V=THREE.Vector3;
    const haft=new THREE.Mesh(new THREE.CylinderGeometry(.016,.019,.9,10),mk(0x2a2230,.6,.3));haft.rotation.x=PI/2;haft.position.z=.4;haft.castShadow=true;g.add(haft);
    const gp=new THREE.Mesh(new THREE.CylinderGeometry(.021,.021,.26,10),wrap);gp.rotation.x=PI/2;gp.position.z=-.02;g.add(gp);
    for(let i=0;i<7;i++){const o=new THREE.Mesh(new THREE.OctahedronGeometry(.026,0),i%2?gem:gem2);o.scale.set(1,1,1.7);const a=i*2.1;o.position.set(Math.cos(a)*.026,Math.sin(a)*.026,.16+i*.088);o.rotation.set(a,0,a*.7);g.add(o)}
    const zc=.62,Rr=.27;
    for(const s of [-1,1]){let p0=new V(0,0,zc+Rr),pp=p0;for(let i=1;i<=8;i++){const ph=i/8*1.18,p1=new V(0,s*Rr*Math.sin(ph),zc+Rr*Math.cos(ph));seg(g,steel,p0,p1,.032-.022*((i-1)/8),.032-.022*(i/8));pp=p0;p0=p1}
      seg(g,steel,p0,p0.clone().addScaledVector(p0.clone().sub(pp).normalize(),.08),.01,.0015)}                  // the sharpened tip
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.07,10),steel);hub.rotation.z=PI/2;hub.position.z=zc+Rr;g.add(hub);
    for(const [x,y,z,r,sc,m] of [[0,.0,zc+Rr+.045,.05,1.8,gem],[.03,.02,zc+Rr+.02,.032,1.6,gem2],[-.03,-.02,zc+Rr+.03,.034,1.7,gem2],[0,.1,zc+Rr*.9,.024,1.4,gem],[0,-.1,zc+Rr*.9,.024,1.4,gem]]){const o=new THREE.Mesh(new THREE.OctahedronGeometry(r,0),m);o.scale.set(1,1,sc);o.position.set(x,y,z);o.rotation.set(0,0,x*9);g.add(o)}
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.09,12,10),gl(0xa050ff,.3));glow.position.z=zc+Rr+.04;g.add(glow)},
  esword(g){const hilt=mk(0x1a1d22,.4,.8),cy=gl(0x37d9ff),m={h:hilt,c:cy};
    R(g,m,[['c',0,0,-.06,.02,.26,.02,'h'],['b',0,0,.08,.15,.03,.02,'h'],['b',.08,0,.08,.012,.05,.03,'c'],['b',-.08,0,.08,.012,.05,.03,'c'],['c',0,0,.11,.028,.05,.034,'h'],['c',0,0,-.2,.026,.04,.026,'h']]);
    for(let k=0;k<3;k++)R(g,m,[['c',0,0,-.14+k*.07,.0225,.012,.0225,'c']]);
    const blade=new THREE.Group();blade.name='blade';g.add(blade);
    const core=new THREE.Mesh(new THREE.BoxGeometry(.014,.05,.92),gl(0xdffcff));core.position.z=.6;blade.add(core);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.025,.1,4),gl(0xdffcff));tip.rotation.x=PI/2;tip.rotation.z=PI/4;tip.position.z=1.12;blade.add(tip);
    const halo=new THREE.Mesh(new THREE.BoxGeometry(.05,.1,1.0),gl(0x1ec8ff,.45));halo.position.z=.62;halo.name='halo';blade.add(halo)},
  hammer(g){const m={d:mk(0x20262b,.5,.5),m:mk(0x8b959c,.35,.6),g:gl(0x3dffe6),y:new THREE.MeshBasicMaterial({map:hazTex(),toneMapped:false})};
    R(g,m,[['c',0,0,.4,.022,.84,.024,'d'],['c',0,0,.12,.028,.2,.028,'y'],['s',0,0,-.04,.034,0,0,'m'],['b',0,0,.88,.38,.22,.22,'m'],['b',.2,0,.88,.012,.18,.18,'g'],['b',-.2,0,.88,.012,.18,.18,'g'],['b',0,0,.88,.1,.24,.24,'d'],['b',0,.112,.88,.2,.01,.12,'g'],['b',0,-.112,.88,.2,.01,.12,'g']])},
  bat(g){const m={w:mk(0x16130f,.55,.2),t:mk(0xe3b13a,.25,1),y:gl(0xffe14a),h:gl(0xfff6a0)};
    R(g,m,[['c',0,0,.42,.052,.84,.017,'w'],['c',0,0,.04,.021,.04,.021,'t'],['c',0,0,.12,.021,.04,.021,'t'],['s',0,0,-.02,.026,0,0,'t'],['c',0,0,.82,.054,.03,.054,'t']]);
    boltM.length=0;const bm=new THREE.MeshBasicMaterial({color:0xffe14a,toneMapped:false});boltM.push(bm);
    for(let b=0;b<3;b++){const a0=b*2.1;let z=.22+b*.04,px=Math.cos(a0)*.052,py=Math.sin(a0)*.052;
      for(let i=0;i<7;i++){const nz=z+.075,ang=a0+(i%2?.35:-.35),nx=Math.cos(ang)*(.05+i*.0032),ny=Math.sin(ang)*(.05+i*.0032),p0=new THREE.Vector3(px,py,z),p1=new THREE.Vector3(nx,ny,nz);seg(g,bm,p0,p1,.0035,.0035);px=nx;py=ny;z=nz}}
    const hl=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.7,12,1,true),gl(0xffd23a,.16));hl.rotation.x=PI/2;hl.position.z=.5;g.add(hl);boltM.push(hl.material)}
};
// glows of the exotic guns flicker a little (shared materials)
const flick=dt=>{const t=performance.now()*.001;for(let i=0;i<boltM.length;i++){const m=boltM[i];if(m.transparent)m.opacity=.05+.08*Math.abs(Math.sin(t*37+i));else m.color.setHex(Math.sin(t*53)>.2?0xffe14a:0xfff6c0)}};
Object.assign(BRM,B);

// ---------------------------------------------------------------- the arsenal
// W = what GUN's WEAPONS has (friends see this index), B = the Battle Royale stats
const ARMS=[
  {id:'pick',   n:'Amethyst Pickaxe', short:'Pickaxe', w:{dmg:20,cd:.5,melee:true,col:0x8a3cff,cls:'pick',bm:'pick'},                                   b:{cls:'pick',melee:1,dmg:20,cd:.5,dl:.26,tool:1}},
  {id:'esword', n:'Energy Sword',     short:'E-Blade', w:{dmg:55,cd:.5,melee:true,col:0x37d9ff,cls:'melee',bm:'esword'},                                  b:{cls:'melee',melee:1,dmg:55,cd:.5,exo:1}},
  {id:'hammer', n:'Plasma Hammer',    short:'Hammer',  w:{dmg:75,cd:1.05,melee:true,col:0x3dffe6,cls:'hammer',bm:'hammer'},                              b:{cls:'hammer',melee:1,dmg:75,cd:1.05,dl:.36,exo:1}},
  {id:'bat',    n:'Lightning Bat',    short:'Bat',     w:{dmg:48,cd:.56,melee:true,col:0xffe14a,cls:'bat',bm:'bat'},                                     b:{cls:'bat',melee:1,dmg:48,cd:.56,dl:.21,exo:1}},
  {id:'msniper',n:'Magma Sniper',     short:'Magma',   w:{dmg:125,cd:1.6,spread:0,col:0x261b18,cls:'sniper',bm:'msniperM'},                               b:{cls:'sniper',dmg:125,cd:1.6,mag:3,ammo:'heavy',spread:.001,range:340,rl:3.1,zoom:1,snd:'magnum',exo:1}},
  {id:'cpistol',n:'Crystal Pistols',  short:'Crystal', w:{dmg:19,cd:.13,spread:.02,col:0xff8fd6,cls:'dual',bm:'cpinkP',bm2:'cblueP'},                     b:{cls:'dual',dmg:19,cd:.13,mag:24,ammo:'light',spread:.022,range:110,rl:1.7,snd:'shot',exo:1}},
  {id:'sar',    n:'Pulse Rifle',      short:'Pulse',   w:{dmg:31,cd:.105,auto:true,spread:.02,col:0x8b959c,cls:'rifle',bm:'sarM'},                        b:{cls:'rifle',dmg:31,cd:.105,auto:1,mag:30,ammo:'medium',spread:.017,range:175,rl:2.1,snd:'shot',exo:1}},
  {id:'ssmg',   n:'Hazard SMG',       short:'Hazard',  w:{dmg:15,cd:.07,auto:true,spread:.04,col:0x8b959c,cls:'smg',bm:'ssmgM'},                          b:{cls:'smg',dmg:15,cd:.07,auto:1,mag:35,ammo:'light',spread:.036,range:90,rl:1.6,snd:'uzi',exo:1}},
  {id:'grev',   n:'Gilded Revolver',  short:'Gilded',  w:{dmg:80,cd:.55,spread:.004,col:0x15120e,cls:'pistol',bm:'grevM'},                                b:{cls:'pistol',dmg:80,cd:.55,mag:6,ammo:'medium',spread:.004,range:140,rl:2,snd:'deagle',exo:1}},
  {id:'gshot',  n:'Gilded Shotgun',   short:'Gild SG', w:{dmg:14,cd:.85,spread:.07,col:0x15120e,cls:'shotgun',bm:'gshotM'},                              b:{cls:'shotgun',dmg:14,pel:10,cd:.85,mag:6,ammo:'shells',spread:.07,range:42,rl:2.5,snd:'deagle',exo:1}},
  {id:'drill',  n:'Drill Rocket',     short:'Drill',   w:{dmg:110,cd:2.6,rocket:true,drill:true,rad:8,col:0xe3b13a,cls:'tube',bm:'drillM'},                b:{cls:'tube',dmg:110,cd:2.6,mag:1,ammo:'rocket',rl:3.2,rocket:1,exo:1}},
  {id:'guided', n:'Guided Missile',   short:'Guided',  w:{dmg:95,cd:2.8,rocket:true,guided:true,rad:7,col:0x8b959c,cls:'tube',bm:'guidedM'},               b:{cls:'tube',dmg:95,cd:2.8,mag:1,ammo:'rocket',rl:3.2,rocket:1,exo:1}},
  {id:'rpg',    n:'Gold RPG',         short:'RPG',     w:{dmg:105,cd:2.4,rocket:true,rad:8,col:0xe3b13a,cls:'tube',bm:'rpgM'},                            b:{cls:'tube',dmg:105,cd:2.4,mag:1,ammo:'rocket',rl:3.2,rocket:1,exo:1}}];
// the skinned guns are built from a base gun + a skin
BRM.msniperM=function(g){BRM.themed('sniper','magma',g)};BRM.sarM=function(g){BRM.themed('ar','scifi',g)};BRM.ssmgM=function(g){BRM.themed('smg','scifi',g)};
BRM.grevM=function(g){BRM.themed('revolver','gold',g)};BRM.gshotM=function(g){BRM.themed('shotgun','gold',g)};
BRM.cpinkP=function(g){BRM.crystalGun(g,'pink')};BRM.cblueP=function(g){BRM.crystalGun(g,'blue')};
BRM.drillM=function(g){BRM.tube(g,{body:0x1a1712,acc:0xe3b13a,glow:0xffd24a,kind:'drill'})};
BRM.guidedM=function(g){BRM.tube(g,{body:0x8b959c,acc:0x2b3238,glow:0x3dffe6,kind:'guided'})};
BRM.rpgM=function(g){BRM.tube(g,{body:0x15120e,acc:0xe3b13a,glow:0xffd24a,kind:'rpg'})};
// called by index.html right after the WEAPONS table exists (the scripts load before the inline script, so the table is not there yet at load time)
let done=false;
function setup(){if(done)return;done=true;
  for(const a of ARMS){
    WEAPONS.push(Object.assign({n:a.n,k:'',dmg:20,cd:.5,auto:false,spread:0,col:0x888888,br:1},a.w));
    BRW[a.id]=Object.assign({n:a.n,gi:WEAPONS.length-1},a.b);
    BR.SHORT[a.id]=a.short}
  ANIM.push(flick)}
// exotic weapons never come in common rarity
const mkWeapon0=BR.mkWeapon;BR.mkWeapon=function(id,rar){return mkWeapon0.call(this,id,BRW[id]&&BRW[id].exo?Math.max(rar||0,3):rar)};

// ---------------------------------------------------------------- the pickaxe against chests
// a chest has 60 hp; every strike shakes it, chips the wood and dims its gold; at 0 it bursts, planks fly and its loot pops out in sight
const CH_HP=60;
Object.assign(BR,{
  // called after the swing's delay: everything in front of me inside 2.6 m (chests up to 3.2 m)
  hitChests(fx,fz,dmg){let n=0;for(const it of this.items){if(it.k!=='x'||it.taken||it.open)continue;const dx=it.x-player.x,dz=it.z-player.z,d=Math.hypot(dx,dz);
      if(d<2.9&&Math.abs((it.y||player.y)-player.y)<1.8&&(d<1.2||(dx*fx+dz*fz)/d>.2)){this.chestHit(it,dmg);n++}}return n},
  chestHit(it,dmg){if(it.hp===undefined)it.hp=CH_HP;it.hp-=dmg;it.shk=1;this.snd(it.hp>0?'thud':'crack');
    const y=(it.y||player.y)+.3;if(typeof BRFX!=='undefined')BRFX.debris(it.x,y,it.z,it.hp>0?5:14,it.hp>0);
    const c=it.m&&it.m.userData.ch;if(c){const mt=c.userData.mats;if(mt)for(const o of mt){o.m.color.multiplyScalar(.92);o.m.emissive.setHex(0xffffff);o.m.emissiveIntensity=.7}}
    if(it.hp<=0)this.breakChest(it);else FX.shakeT=Math.max(FX.shakeT||0,.08)},
  breakChest(it){if(it.open)return;it.open=true;it.brk=1;if(it.sid!==undefined&&!this.op.includes(it.sid))this.op.push(it.sid);
    FX.init();for(let i=0;i<10;i++){const a=i/10*6.283;FX.puff({x:it.x,y:(it.y||player.y)+.5,z:it.z,vx:Math.cos(a)*1.6,vy:1.4,vz:Math.sin(a)*1.6,s0:.2,s1:1.1,life:.7,c0:[1,.8,.4],c1:[.7,.6,.5],op:.7,add:true,drag:1.5,grow:1})}
    this.snd('chest');FX.shakeT=.22;FX.shakeA=Math.max(FX.shakeA||0,.07);
    setTimeout(()=>{if(this.on)this.spill(it)},120);GUN.push()},
  // the swing has reached its target: bots, friends, chests, or just the air
  swingHit(W,s){const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);let n=0;
    for(const R of GUN.peersAlive()){const dx=R.x-player.x,dz=R.z-player.z,d=Math.hypot(dx,dz);if(d<2.6&&Math.abs(R.y-player.y)<1.8&&(d<.6||(dx*fx+dz*fz)/d>.25)){GUN.addHit(R.peer,W.dmg);GUN.shock(R.x,R.y+1,R.z);if(typeof BRFX!=='undefined')BRFX.friendHit(R,W.dmg);n++}}
    n+=BOTS.melee(player.x,player.z,fx,fz,W.dmg,{me:true,w:W.n});n+=this.hitChests(fx,fz,W.dmg);
    const hv=!n&&s&&s.id==='pick'&&typeof BLD!=='undefined'&&BLD.harvest(W);       // nothing alive in reach: the pickaxe gathers wood / brick / metal (brbuild.js)
    if(n){this.hitmark(false);FX.shakeT=Math.max(FX.shakeT||0,.1);FX.shakeA=Math.max(FX.shakeA||0,.03)}else if(!hv){this.snd('swing');GUN.shock(player.x+fx*1.3,player.y+1,player.z+fz*1.3,true)}}
});

return {ARMS,mats,CH_HP,setup}})();
