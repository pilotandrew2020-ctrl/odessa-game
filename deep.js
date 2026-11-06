/* ===================================================================================================
   deep.js — the world under the sea, and diving.
   Before: below the surface there was nothing but blue fog, the swimmer could only float on top, and the submarine had no reason to dive
   (and on a tablet no way to: diving was Shift, which a touch screen does not have).
   Now:
   • DIVE / RISE buttons (keys: C or Ctrl = dive, Space = rise) appear while you swim or drive the submarine;
   • the swimmer goes under (swim.js reads DEEP.dive / DEEP.rise), has AIR for about 40 seconds (the gauge under the minimap), and must come up
     to breathe; if the air runs out you float up on your own (nobody dies);
   • the sea floor is alive: rocks, coral, kelp, shells, a school of fish around you, and TREASURE CHESTS (E to open, ₴ each, once) — all built
     around you from a hash of the 18 m cell you are over, only while you are under water, in six instanced meshes (a few hundred instances).
   =================================================================================================== */
const DEEP={dive:0,rise:0,cell:18,R:5,last:'',built:false,grp:null,chests:[],fish:[],lastX:1e9,lastZ:1e9,pad:null,gauge:null,
  hash(a,b,c){let n=(a*374761393+b*668265263+(c||0)*2147483647)|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967295},
  ground(x,z){return (typeof groundH==='function')?groundH(x,z):0},
  // ---------- buttons ----------
  css(){if(document.getElementById('deepCss'))return;const s=document.createElement('style');s.id='deepCss';s.textContent=`
#deepPad{position:fixed;right:16px;bottom:128px;z-index:34;display:none;flex-direction:row;gap:10px}
#deepPad.on{display:flex}
#deepPad.sub{left:50%;right:auto;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);gap:16px}
#deepPad button{width:62px;height:62px;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:rgba(10,40,60,.62);color:#fff;font:800 11px/1.1 var(--f-disp,inherit);letter-spacing:.06em;touch-action:none;-webkit-user-select:none;user-select:none}
#deepPad.sub button{width:76px;height:76px;font-size:13px;background:rgba(10,40,60,.82)}
#deepPad button.hold{background:#f2c14e;color:#1b1204}
#deepAir{position:fixed;right:18px;top:214px;z-index:34;width:140px;display:none;font:800 10px/1 var(--f-disp,inherit);letter-spacing:.12em;color:#cfeaff;text-transform:uppercase}
#deepAir.on{display:block}
#deepAir i{display:block;height:8px;margin-top:5px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden}
#deepAir i b{display:block;height:100%;width:100%;background:linear-gradient(90deg,#4fc3f7,#b3e5fc);transform-origin:left;transition:background .3s}`;document.head.appendChild(s)},
  dom(){if(this.pad)return;this.css();
    const p=document.createElement('div');p.id='deepPad';
    const mk=(txt,key)=>{const b=document.createElement('button');b.textContent=txt;const on=e=>{e.preventDefault();DEEP[key]=1;b.classList.add('hold')},off=e=>{e.preventDefault();DEEP[key]=0;b.classList.remove('hold')};
      b.addEventListener('pointerdown',on);for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,off);return b};
    p.append(mk('▲ RISE','rise'),mk('▼ DIVE','dive'));document.body.appendChild(p);this.pad=p;
    const g=document.createElement('div');g.id='deepAir';g.innerHTML='Air<i><b></b></i>';document.body.appendChild(g);this.gauge=g;this.bar=g.querySelector('b');
    addEventListener('keydown',e=>{if(e.code==='KeyC'||e.code==='ControlLeft'||e.code==='ControlRight')DEEP.kd=1});
    addEventListener('keyup',e=>{if(e.code==='KeyC'||e.code==='ControlLeft'||e.code==='ControlRight')DEEP.kd=0})},
  // what the controls say right now: +1 dive, -1 rise, 0 nothing (used by swim.js and by the submarine)
  vert(){const k=(typeof inp!=='undefined'&&inp.k)||{};const dn=this.dive||this.kd||0,up=this.rise||this.kq||k.Space||(typeof inp!=='undefined'&&inp.jump)?1:0;return (dn?1:0)-(up?1:0)},
  want(){return !!((typeof SWIM!=='undefined'&&SWIM._on)||(typeof EXT!=='undefined'&&EXT.cur&&EXT.cur.kind==='sub'))},
  // ---------- the sea floor ----------
  build(){if(this.built)return;this.built=true;const g=this.grp=new THREE.Group();g.visible=false;scene.add(g);
    const M=(c,r)=>new THREE.MeshStandardMaterial({color:c,roughness:r==null?.9:r,flatShading:true}),N=420;
    const mk=(geo,mat,n)=>{const m=new THREE.InstancedMesh(geo,mat,n);m.count=0;m.frustumCulled=false;m.castShadow=false;g.add(m);return m};
    this.rock=mk(new THREE.IcosahedronGeometry(1,0),M(0x6d7377),N);
    this.coral=mk(new THREE.ConeGeometry(.5,1.4,5),M(0xff6f61,.7),N);
    this.coral2=mk(new THREE.ConeGeometry(.35,1.0,5),M(0xffb703,.7),N);
    this.kelp=mk(new THREE.BoxGeometry(.18,1,.18),M(0x2f8f4e,.8),N);
    this.shell=mk(new THREE.SphereGeometry(.35,6,4),M(0xf1e4d3,.6),120);
    this.fishM=mk(new THREE.ConeGeometry(.16,.7,5),new THREE.MeshStandardMaterial({color:0xffa94d,roughness:.5,emissive:0x331a00}),40);
    this.fishM.geometry.rotateX(Math.PI/2);
    // a small pool of chests
    this.chestPool=[];const wood=M(0x6b3f1d,.8),gold=M(0xe0b030,.4);
    for(let i=0;i<10;i++){const c=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(.9,.5,.6),wood),l=new THREE.Mesh(new THREE.BoxGeometry(.94,.16,.64),gold);l.position.y=.33;const k=new THREE.Mesh(new THREE.BoxGeometry(.12,.2,.05),gold);k.position.set(0,.2,.32);c.add(b,l,k);b.position.y=.25;c.visible=false;g.add(c);this.chestPool.push(c)}
    this.dummy=new THREE.Object3D();
    INTERACT.push({x:0,z:0,r:1e9,label:'Open the treasure chest',cond:()=>{const c=this.nearChest(2.6);this._nc=c;return !!c},fn:()=>this.openChest(this._nc)});
    for(let i=0;i<26;i++)this.fish.push({x:0,y:0,z:0,a:Math.random()*6.28,s:1.2+Math.random()*1.4,t:Math.random()*9})},
  openedKey(c){return c.i+','+c.j},
  isOpen(c){return !!(S.chests&&S.chests.includes(this.openedKey(c)))},
  nearChest(r){if(!this.on)return null;let best=null,bd=r;for(const c of this.chests){if(c.opened)continue;const d=Math.hypot(c.x-player.x,c.z-player.z);if(d<bd&&Math.abs(c.y-player.y)<4){bd=d;best=c}}return best},
  openChest(c){if(!c||c.opened)return;c.opened=true;S.chests=(S.chests||[]).concat(this.openedKey(c));try{saveS()}catch(e){}
    if(c.mesh)c.mesh.children[1].rotation.x=-.9;                                      // the lid pops open
    S.cash=WALLET.get()+c.reward;try{saveS()}catch(e){}
    toast('Treasure!','+'+WALLET.fmt(c.reward)+' from an old chest on the sea floor');if(window.AUD&&AUD.beep)AUD.beep()},
  // rebuild the decor for the 18 m cells around (x,z)
  rebuild(x,z){const C=this.cell,ci=Math.floor(x/C),cj=Math.floor(z/C),R=this.R,H=this.hash.bind(this);
    const cnt={rock:0,coral:0,coral2:0,kelp:0,shell:0},d=this.dummy;this.chests.length=0;let pi=0;for(const c of this.chestPool)c.visible=false;
    const put=(mesh,key,px,py,pz,sx,sy,sz,ry,col)=>{if(cnt[key]>=mesh.instanceMatrix.count)return;d.position.set(px,py,pz);d.rotation.set(0,ry,0);d.scale.set(sx,sy,sz);d.updateMatrix();mesh.setMatrixAt(cnt[key]++,d.matrix)};
    for(let j=cj-R;j<=cj+R;j++)for(let i=ci-R;i<=ci+R;i++){
      const h0=H(i,j,1),n=h0<.25?0:h0<.55?2:h0<.85?3:4;
      for(let k=0;k<n;k++){const px=(i+H(i,j,10+k))*C,pz=(j+H(i,j,20+k))*C,gy=this.ground(px,pz),dep=SL-gy;if(dep<1.6||dep>160)continue;
        const t=H(i,j,30+k),s=.7+H(i,j,40+k)*1.8,ry=H(i,j,50+k)*6.28;
        if(t<.3)put(this.rock,'rock',px,gy+s*.25,pz,s*1.3,s*.8,s,ry);
        else if(t<.55){for(let q=0;q<4;q++){const qx=px+Math.cos(q*1.9)*s*.7,qz=pz+Math.sin(q*1.9)*s*.7,qy=this.ground(qx,qz),sc=.3+H(i,j,60+q+k)*.45;put(q%2?this.coral2:this.coral,q%2?'coral2':'coral',qx,qy+.6*sc,qz,sc,sc*(1+H(i,j,70+q)*.6),sc,ry)}}
        else if(t<.85){for(let q=0;q<5;q++){const qx=px+Math.cos(q*1.3)*1.1,qz=pz+Math.sin(q*1.3)*1.1,qy=this.ground(qx,qz),hh=2.5+H(i,j,80+q+k)*Math.min(7,dep*.5);put(this.kelp,'kelp',qx,qy+hh/2,qz,1,hh,1,0)}}
        else put(this.shell,'shell',px,gy+.1,pz,s*.7,.5*s,s*.7,ry)}
      // a treasure chest in about one cell in forty (never in the shallows)
      if(H(i,j,99)<.025&&pi<this.chestPool.length){const px=(i+.5)*C,pz=(j+.5)*C,gy=this.ground(px,pz),dep=SL-gy;
        if(dep>4&&dep<140){const c={i,j,x:px,z:pz,y:gy,reward:Math.round((250+H(i,j,98)*650)/50)*50,mesh:this.chestPool[pi++]};c.opened=this.isOpen(c);
          c.mesh.position.set(px,gy,pz);c.mesh.rotation.y=H(i,j,97)*6.28;c.mesh.children[1].rotation.x=c.opened?-.9:0;c.mesh.visible=true;this.chests.push(c)}}}
    for(const [k,m] of [['rock',this.rock],['coral',this.coral],['coral2',this.coral2],['kelp',this.kelp],['shell',this.shell]]){m.count=cnt[k];m.instanceMatrix.needsUpdate=true}
    this.lastX=x;this.lastZ=z},
  // ---------- every frame ----------
  update(dt){const uw=typeof UW!=='undefined'&&UW.on;
    // controls and gauge
    const want=this.want();this.dom();this.pad.classList.toggle('on',want);this.pad.classList.toggle('sub',!!(typeof EXT!=='undefined'&&EXT.cur&&EXT.cur.kind==='sub'));
    if(typeof SWIM!=='undefined'&&SWIM._on&&SWIM.o2!==undefined){this.gauge.classList.toggle('on',SWIM.dep>.3||SWIM.o2<.98);const o=Math.max(0,Math.min(1,SWIM.o2));this.bar.style.transform='scaleX('+o+')';this.bar.style.background=o<.25?'linear-gradient(90deg,#ff5252,#ffab91)':''}
    else this.gauge.classList.remove('on');
    const show=uw&&started&&!PORTAL.cur;
    if(!this.built){if(!show)return;this.build()}
    this.on=show;this.grp.visible=show;if(!show)return;
    const cx=camera.position.x,cz=camera.position.z;
    if(Math.hypot(cx-this.lastX,cz-this.lastZ)>this.cell*1.2)this.rebuild(cx,cz);
    // the school of fish: they wander in a bubble round the camera, between the floor and the surface
    const f=this.fish,m=this.fishM,d=this.dummy;let n=0;
    for(const q of f){q.t+=dt;q.a+=Math.sin(q.t*.7+q.s)*dt*.9;q.x+=Math.sin(q.a)*q.s*dt;q.z+=Math.cos(q.a)*q.s*dt;
      let dx=q.x-cx,dz=q.z-cz,L=Math.hypot(dx,dz);if(L>46||!q.init){q.init=1;const a=Math.random()*6.28,r=8+Math.random()*30;q.x=cx+Math.cos(a)*r;q.z=cz+Math.sin(a)*r;q.a=Math.random()*6.28;q.y=0}
      const gy=this.ground(q.x,q.z),top=SL-1.2,bot=gy+1.0;if(top<bot+1){continue}
      if(!q.y)q.y=bot+Math.random()*(top-bot);q.y=Math.max(bot,Math.min(top,q.y+Math.sin(q.t*.5)*dt*.6));
      d.position.set(q.x,q.y,q.z);d.rotation.set(0,q.a,Math.sin(q.t*9)*.15);d.scale.setScalar(1);d.updateMatrix();m.setMatrixAt(n++,d.matrix)}
    m.count=n;m.instanceMatrix.needsUpdate=true}
};
// ANIM belongs to the main script, which runs after this file: hook in as soon as it exists
(function hook(){if(typeof ANIM!=='undefined')ANIM.push(dt=>{try{DEEP.update(dt)}catch(e){if(!DEEP.err){DEEP.err=1;console.error('DEEP',e)}}});else setTimeout(hook,50)})();
