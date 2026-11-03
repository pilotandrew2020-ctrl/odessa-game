/* ===================================================================================================
   jobs.js — more easy ways to earn money (so the houses on the island can be bought sooner).
   Besides the income every minute and the treasure chests under the sea (deep.js):
   • FISHING: stand on a shore, a quay or a pier with water in front, press E to cast, wait for the bite (the bobber dips, a splash),
     press E again to reel in. Sprats, gobies, mullet, flounder, now and then a big turbot (₴25 … ₴400).
   • LUCKY COINS: gold coins lie about in the city and on the beaches (one in every few 30 m cells, deterministic); walk over one to pick it up
     (₴25). They come back after a few minutes. Built from a hash of the cell, in one instanced mesh, only around you and only outdoors.
   • KITCHEN: wash the dishes at the kitchen sink (₴40 each, kitchen.js asks for it).
   • The "Earn money" entry in the Menu lists them all.
   =================================================================================================== */
const JOBS={
  pay(n,what){S.cash=WALLET.get()+n;try{saveS()}catch(e){}if(window.AUD&&AUD.beep)AUD.beep()},
  hash(a,b,c){let n=(a*374761393+b*668265263+(c||0)*2147483647)|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967295},
  list(){return [
    ['Fishing — stand on a shore, quay or pier and press E · ₴25 … ₴400 a fish',()=>{}],
    ['Lucky coins — gold coins lie around the city and beaches, walk over them · ₴25',()=>{}],
    ['Treasure chests — dive (▼ DIVE) and search the sea floor · ₴250 … ₴900',()=>{}],
    ['Dishes — at your kitchen sink, Wash the dishes · ₴40',()=>{}],
    ['Income — ₴500 every minute you play',()=>{}]]},
  menu(){if(typeof KIT==='undefined')return;KIT.openMenu('Ways to earn money',this.list(),player.x,player.z,60)}
};

// ---------- fishing ----------
const FISH={s:0,t:0,wait:0,bobber:null,line:null,x:0,z:0,ox:0,oz:0,ring:0,
  FISH:[['a sprat',25,.4],['a goby',40,.25],['a mullet',70,.18],['a flounder',120,.12],['a big black sea turbot',400,.05]],
  water(x,z){return groundH(x,z)<SL-.6},
  // where the bobber would land: 4.5 m ahead, over water, while you stand on dry ground / a deck
  spot(){const f=Math.sin(cam.yaw),c=Math.cos(cam.yaw);for(const d of [5,4,3.2,6.5]){const x=player.x+f*d,z=player.z+c*d;if(this.water(x,z)&&this.water(x+f*1.5,z+c*1.5))return [x,z]}return null},
  can(){return started&&!PORTAL.cur&&!DRIVE.on&&!player.sit&&!player.air&&!(typeof SWIM!=='undefined'&&SWIM._on)&&!(typeof EXT!=='undefined'&&EXT.cur)&&!(typeof PLN!=='undefined'&&PLN.cur)&&!HELI.on&&player.y>SL-.3},
  build(){if(this.bobber)return;const g=new THREE.Group(),b=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshStandardMaterial({color:0xe53935,roughness:.5})),t=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5}));t.position.y=.09;g.add(b,t);
    const r=new THREE.Mesh(new THREE.RingGeometry(.35,.42,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.0,depthWrite:false,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;r.position.y=.02;g.add(r);g.userData.ring=r;
    g.visible=false;scene.add(g);this.bobber=g;
    const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));this.line=new THREE.Line(lg,new THREE.LineBasicMaterial({color:0xf5f5f5,transparent:true,opacity:.8}));this.line.frustumCulled=false;this.line.visible=false;scene.add(this.line)},
  get label(){return this.s===0?'Fish here':this.s===1?'Pull the line':'Reel in!'},
  press(){if(this.s===0){const p=this.spot();if(!p){toast('No water ahead','face the sea and stand at the edge');return}this.build();
      this.s=1;this.t=0;this.wait=3+Math.random()*5;this.x=p[0];this.z=p[1];this.ox=player.x;this.oz=player.z;this.bobber.position.set(p[0],SL+.02,p[1]);this.bobber.visible=true;this.line.visible=true;toast('Casting…','wait until the float dips, then press E');if(window.AUD&&AUD.tone)AUD.tone(500,260,.3,.06,'sine')}
    else if(this.s===1){this.stop();toast('Too early','the fish got scared — cast again')}
    else if(this.s===2){let r=Math.random(),f=this.FISH[0],a=0;for(const q of this.FISH){a+=q[2];if(r<=a){f=q;break}}if(r>a)f=this.FISH[1];
      this.stop();JOBS.pay(f[1],'fish');toast('You caught '+f[0],'+'+WALLET.fmt(f[1]))}},
  stop(){this.s=0;if(this.bobber)this.bobber.visible=false;if(this.line)this.line.visible=false},
  update(dt){if(this.s===0)return;this.t+=dt;
    if(!this.can()||Math.hypot(player.x-this.ox,player.z-this.oz)>2.2){this.stop();return}
    const b=this.bobber,tt=performance.now()/1000;b.position.y=SL+.02+Math.sin(tt*2.2)*.02-(this.s===2?.12+.05*Math.sin(tt*30):0);
    if(this.s===1&&this.t>this.wait){this.s=2;this.t=0;toast('Bite!','press E now!');if(window.AUD&&AUD.burst)AUD.burst(2500,800,.2,.12,'bandpass',.8)}
    else if(this.s===2&&this.t>1.7){this.stop();toast('It got away','be quicker next time')}
    const ring=b.userData.ring;ring.material.opacity=this.s===2?.5*(1-((this.t*3)%1)):0;ring.scale.setScalar(1+((this.t*3)%1)*2.2);
    const hx=player.x+Math.sin(cam.yaw)*.4,hz=player.z+Math.cos(cam.yaw)*.4,p=this.line.geometry.attributes.position;p.setXYZ(0,hx,player.y+1.3,hz);p.setXYZ(1,b.position.x,b.position.y+.1,b.position.z);p.needsUpdate=true}
};

// ---------- lucky coins ----------
const COINS={cell:30,R:5,got:new Map(),m:null,list:[],last:'',lx:1e9,lz:1e9,t:0,
  build(){if(this.m)return;const m=new THREE.InstancedMesh(new THREE.CylinderGeometry(.34,.34,.06,16),new THREE.MeshStandardMaterial({color:0xffc933,roughness:.25,metalness:.9,emissive:0x5a3a00,emissiveIntensity:.8}),64);m.count=0;m.frustumCulled=false;m.rotation.x=0;scene.add(m);this.m=m;this.d=new THREE.Object3D()},
  rebuild(x,z){const C=this.cell,ci=Math.floor(x/C),cj=Math.floor(z/C),R=this.R;this.list.length=0;const now=performance.now();
    for(let j=cj-R;j<=cj+R;j++)for(let i=ci-R;i<=ci+R;i++){if(JOBS.hash(i,j,5)>.2)continue;const k=i+','+j;if((this.got.get(k)||0)>now)continue;
      const px=(i+.15+.7*JOBS.hash(i,j,6))*C,pz=(j+.15+.7*JOBS.hash(i,j,7))*C,g=groundH(px,pz);if(!(g>SL+.4)||insideAny(px,pz,.5,g+.5))continue;
      this.list.push({k,x:px,z:pz,y:g+.9});if(this.list.length>=60)break}
    this.lx=x;this.lz=z},
  update(dt){if(this.m){this.m.visible=false}if(!started||PORTAL.cur||DRIVE.on||HELI.on||(typeof EXT!=='undefined'&&EXT.cur)||(typeof PLN!=='undefined'&&PLN.cur)||(typeof SWIM!=='undefined'&&SWIM._on))return;
    this.build();this.t+=dt;if(Math.hypot(player.x-this.lx,player.z-this.lz)>this.cell*1.1)this.rebuild(player.x,player.z);
    const m=this.m,d=this.d;let n=0;m.visible=true;
    for(let q=this.list.length-1;q>=0;q--){const c=this.list[q],dx=c.x-player.x,dz=c.z-player.z,dist=Math.hypot(dx,dz);
      if(dist<1.5&&Math.abs(c.y-1-player.y)<1.8){this.got.set(c.k,performance.now()+4*60*1000);this.list.splice(q,1);JOBS.pay(25,'coin');toast('Lucky coin','+'+WALLET.fmt(25));continue}
      if(dist>150)continue;d.position.set(c.x,c.y+Math.sin(this.t*2+c.x)*.08,c.z);d.rotation.set(Math.PI/2,0,this.t*2.4+c.z);d.scale.setScalar(1);d.updateMatrix();m.setMatrixAt(n++,d.matrix)}
    m.count=n;m.instanceMatrix.needsUpdate=true}
};
// ---------- hooks: the main script owns ANIM and INTERACT, and runs after this file ----------
(function hook(){if(typeof ANIM==='undefined'||typeof INTERACT==='undefined'||typeof HELI==='undefined'){setTimeout(hook,60);return}
  ANIM.push(dt=>{try{FISH.update(dt);COINS.update(dt)}catch(e){if(!JOBS.err){JOBS.err=1;console.error('JOBS',e)}}});
  INTERACT.push({x:0,z:0,r:1e9,get label(){return FISH.label},cond:()=>FISH.can()&&(FISH.s>0||!!FISH.spot()),fn:()=>FISH.press()})})();
