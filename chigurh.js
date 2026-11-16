// chigurh.js — Anton Chigurh (2026-11-16). Character -> Body type -> "Anton Chigurh" dresses the classic procedural body as him (creator.js CHIG_LOOK: black denim trucker jacket over a brown shirt, black trousers, brown boots, the bowl cut "Bob" from body.js),
//   and gives him his gear (picking him in the creator arms you): (1) the SILENCED PUMP SHOTGUN (the owner's GLB assets/models/weapons/chigurh_shotgun.glb, 740 triangles, re-skinned: black polymer stock, blued steel, a silver can on the muzzle; fires with a muffled cough),
//   (2) the CAPTIVE-BOLT STUNNER (key '-'; a short pneumatic pistol with a red hose; a close-range knock-down / kill: 100 damage in 2 m), (3) the AIR TANK that stands beside him while either is out (grey cylinder, valve, red hose).
//   Weapon models are built on demand by GUN.model(i) -> CHG.model(group, kind); the GLB is loaded at boot and fills the group when it arrives.
// the face of the owner's reference picture (assets/textures/chigurh_face.jpg, 288x376: the eyes at (83,64) and (204,62)) painted on the classic head's wrap-around texture (512x256, the eyes at u .5 +- 32 px, v .5): scaled so the eyes line up, soft elliptical edge, the rest of the head keeps the game's skin
// the meme face for the REALISTIC body (look.js projects it like the owner's own photo): eyes read off the picture, the face is long, so the vertical scale is stretched
const CHIG_FACE={fixed:true,img:'assets/textures/chigurh_face.jpg',eL:[92,62],eR:[203,64],w:288,h:376,fy:1.8,med:[150,100,76],skin:'#dba98b',hair:'#3b2718'};
const CHIGF={apply(tex,url){if(!tex||!tex.image||!tex.image.getContext)return;const im=new Image();im.onload=()=>{try{const c=tex.image,g=c.getContext('2d'),k=64/121,w=288*k,h=376*k,x0=256-143.5*k,y0=128-63*k,t=document.createElement('canvas');t.width=c.width;t.height=c.height;const q=t.getContext('2d');q.drawImage(im,x0,y0,w,h);
      q.globalCompositeOperation='destination-in';q.save();q.translate(256,172);q.scale(1,1.45);const r=q.createRadialGradient(0,0,34,0,0,62);r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.72,'rgba(0,0,0,1)');r.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=r;q.fillRect(-90,-90,180,180);q.restore();g.drawImage(t,0,0);tex.needsUpdate=true}catch(e){console.warn('[chigurh] face',e)}};im.src=url}};
const CHG={sg:-1,prefab:null,wait:[],
  mat(c,r,m){const M=new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});M.color.convertSRGBToLinear();return M},
  init(){if(this.inited)return;this.inited=1;try{new THREE.GLTFLoader().load('assets/models/weapons/chigurh_shotgun.glb',g=>{const root=g.scene,S=.0335,P=new THREE.Group();   // 33 m long in the file: 1.12 m, barrel to +z, the grip at the origin
        const steel=this.mat(0x23272b,.35,.85),poly=this.mat(0x151617,.7,.1),can=this.mat(0xc9ced2,.22,.95),tube=this.mat(0x1c1f22,.45,.8);
        root.traverse(o=>{if(!o.isMesh)return;const n=o.name;o.material=n.startsWith('Cylinder002')?can:n.startsWith('Cylinder001')?tube:n.startsWith('Cylinder')?steel:(n.startsWith('Cube004')||n.startsWith('Cube005'))?poly:steel;o.castShadow=false});
        root.scale.setScalar(S);root.position.set(-8*S,-1.1*S,-4.78*S);   // the grip (x 8, y 1.1, z 4.78 in the file) goes to the origin
        const w=new THREE.Group();w.add(root);w.rotation.y=Math.PI/2;P.add(w);   // the file's muzzle is at -x: turn it to +z
        this.prefab=P;for(const f of this.wait)f(P);this.wait.length=0},undefined,e=>console.warn('[chigurh] shotgun glb',e))}catch(e){console.warn('[chigurh]',e)}},
  // the weapon models (barrel along +z, the grip at the origin; GUN.model rotates and offsets them)
  model(g,kind){if(kind==='sg'){const stub=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.5),this.mat(0x23272b,.4,.8));stub.position.set(0,.04,.2);g.add(stub);   // (a stand-in until the GLB has loaded)
      const add=P=>{g.remove(stub);g.add(P.clone(true))};if(this.prefab)add(this.prefab);else this.wait.push(add)}
    else{const steel=this.mat(0x2a2d31,.35,.85),poly=this.mat(0x151617,.7,.1),red=this.mat(0xb3201c,.5,.1),B=(w,h,d,x,y,z,m)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||steel);q.position.set(x,y,z);g.add(q);return q};
      B(.05,.07,.2,0,.07,.02);B(.04,.13,.06,0,-.05,-.03,poly);const bar=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.16,12),steel);bar.rotation.x=Math.PI/2;bar.position.set(0,.075,.17);g.add(bar);
      const nz=new THREE.Mesh(new THREE.CylinderGeometry(.024,.02,.03,12),this.mat(0xc9ced2,.25,.95));nz.rotation.x=Math.PI/2;nz.position.set(0,.075,.26);g.add(nz);
      const hose=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,.04,-.08),new THREE.Vector3(0,-.04,-.18),new THREE.Vector3(.02,-.2,-.2),new THREE.Vector3(.08,-.34,-.14)]),12,.012,6),red);g.add(hose)}},
  // the tank beside him while one of his weapons is out
  tank(){const g=new THREE.Group(),steel=this.mat(0x6a6e68,.5,.6),dark=this.mat(0x3a3d3a,.6,.6),red=this.mat(0xb3201c,.5,.1);
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.56,16),steel);b.position.y=.31;g.add(b);const top=new THREE.Mesh(new THREE.SphereGeometry(.085,16,8,0,Math.PI*2,0,Math.PI/2),steel);top.position.y=.59;g.add(top);
    const bd=new THREE.Mesh(new THREE.CylinderGeometry(.088,.088,.04,16),dark);bd.position.y=.34;g.add(bd);const v=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,.07,8),this.mat(0xb08a3a,.35,.9));v.position.y=.69;g.add(v);
    const wh=new THREE.Mesh(new THREE.TorusGeometry(.04,.007,6,14),this.mat(0xb08a3a,.4,.9));wh.position.y=.74;wh.rotation.x=Math.PI/2;g.add(wh);
    const hose=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.03,.68,0),new THREE.Vector3(.12,.62,.03),new THREE.Vector3(.2,.3,.1),new THREE.Vector3(.28,.05,.16),new THREE.Vector3(.1,.02,.3),new THREE.Vector3(-.1,.03,.2)]),24,.012,6),red);g.add(hose);
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.03,16),dark);foot.position.y=.015;g.add(foot);g.traverse(o=>{o.castShadow=false});return g},
  sync(P,w,on){if(!P||!P.root)return;const W=typeof WEAPONS!=='undefined'?WEAPONS[w]:null,want=!!(on&&W&&W.chg);if(want){if(!P._chgTank){P._chgTank=this.tank();P._chgTank.position.set(-.42,0,.03)}if(P._chgTank.parent!==P.root)P.root.add(P._chgTank)}else if(P._chgTank&&P._chgTank.parent)P._chgTank.parent.remove(P._chgTank)},
  // the stunner: a short pneumatic hit, knocks down (and in a PvP round hurts) whoever stands within 2 m in front of you
  bolt(W){GUN.cd=W.cd;GUN.slash=1;GUN.shots++;GUN.sfx('shot',.55);const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),hx=player.x+fx*1.3,hz=player.z+fz*1.3;let hit=0;
    for(const L of SHOVE.lists())for(const q of L){const dx=q.x-player.x,dz=q.z-player.z,d=Math.hypot(dx,dz);if(d<2.2&&Math.abs(q.y-player.y)<1.6&&(d<.6||(dx*fx+dz*fz)/d>.3)&&!(q.fallT>0)){SHOVE.hitPed(q,true,false);hit++}}
    for(const R of GUN.peersAlive()){const dx=R.x-player.x,dz=R.z-player.z,d=Math.hypot(dx,dz);if(d<2.2&&Math.abs(R.y-player.y)<1.8&&(d<.6||(dx*fx+dz*fz)/d>.3)){GUN.addHit(R.peer,W.dmg);hit++}}
    if(typeof BR!=='undefined'&&BR.on)hit+=BR.melee(fx,fz,W.dmg);
    FX.init();FX.puff({x:hx,y:player.y+1.05,z:hz,vx:fx*2,vy:.3,vz:fz*2,s0:.2,s1:.9,life:.35,c0:[.9,.9,.9],c1:[.6,.6,.6],op:.8,add:false,drag:3,grow:1});if(hit){FX.shakeT=.2;FX.shakeA=.05}GUN.push()},
  equip(){if(typeof GUN==='undefined'||this.sg<0)return;if(typeof BR!=='undefined'&&BR.on)return;GUN.armed=true;GUN.pick(this.sg);toast('Anton Chigurh','the silenced shotgun is out · 0 shotgun · - captive bolt')}};
