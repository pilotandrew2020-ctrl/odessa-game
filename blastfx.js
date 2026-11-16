// blastfx.js — realistic explosions for EVERY FX.explode caller (bazooka, C4, grenades, tank shell, drone, vehicles, mini-nuke; 2026-11-16).
//   The old explosion was flat sprites. On top of it (FX.explode is wrapped, the old effect stays) every blast now gets: a white flash over the screen (stronger the closer you are; no extra light in the scene, so no shader cost),
//   a VOLUMETRIC fireball (cloud-textured additive spheres that boil and rise), a ground shock-wave: an expanding dust wall, a dark smoke column that stands for several seconds, hot debris streaks, and a white-out for blasts next to you.
//   Cost: 4 fireballs + 3 dust walls + one light in a pool, nothing is allocated per blast. Small pops (r < 3) are left alone.
const BLASTFX={fb:[],dw:[],L:null,wrapped:false,
  tex(){if(this._t)return this._t;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');for(let i=0;i<60;i++){const x=64+(Math.random()-.5)*88,y=64+(Math.random()-.5)*88,r=10+Math.random()*24,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba(255,255,255,.6)');q.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=q;g.fillRect(0,0,128,128)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return this._t=t},
  init(){if(this.wrapped||typeof FX==='undefined')return;this.wrapped=true;const T=this.tex(),MB=o=>new THREE.MeshBasicMaterial(Object.assign({map:T,transparent:true,depthWrite:false,fog:false,toneMapped:false},o));
    for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),MB({blending:THREE.AdditiveBlending,color:0xffc060}));m.visible=false;m.frustumCulled=false;m.renderOrder=3;scene.add(m);this.fb.push({m,t:9,r:1,on:false})}
    for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,28,1,true),MB({color:0x9a8a70,side:THREE.DoubleSide,opacity:.5}));m.visible=false;m.frustumCulled=false;m.renderOrder=2;scene.add(m);this.dw.push({m,t:9,r:1,on:false})}
    const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:69;background:#fff7e0;opacity:0;pointer-events:none';document.body.appendChild(d);this.fl=d;
    const old=FX.explode,self=this;FX.explode=function(x,y,z,r){old.call(this,x,y,z,r);try{self.extra(x,y,z,r)}catch(e){console.warn('[blastfx]',e)}}},
  extra(x,y,z,r){if(r<3)return;const gy=groundH(x,z),R=Math.random;
    // boiling fireball: two overlapping spheres (core + shell)
    for(let k=0;k<2;k++){const f=this.fb.find(q=>!q.on);if(!f)break;f.on=true;f.t=0;f.r=r*(k?1.25:.8);f.x=x;f.y=y+r*.25;f.z=z;f.k=k;f.m.visible=true;f.m.rotation.set(R()*6,R()*6,R()*6)}
    // dust wall + dark smoke column + streaks
    if(y-gy<r*1.5){const w=this.dw.find(q=>!q.on);if(w){w.on=true;w.t=0;w.r=r;w.x=x;w.y=gy;w.z=z;w.m.visible=true}}
    for(let i=0;i<8+((r*.5)|0);i++){const a=R()*6.283,d=R()*r*.25;FX.puff({x:x+Math.cos(a)*d,y:y+.5+i*r*.12,z:z+Math.sin(a)*d,vx:Math.cos(a)*r*.05,vy:r*(.35+R()*.25),vz:Math.sin(a)*r*.05,s0:r*.35,s1:r*(1.1+R()*.8),life:5+R()*3,c0:[.1,.09,.08],c1:[.42,.41,.4],op:.78,add:false,drag:.35,delay:.15+i*.06,grow:1,riseDecay:1})}
    for(let i=0;i<10;i++){const a=R()*6.283,sp=r*(1.4+R()*1.6);FX.puff({x,y:y+.4,z,vx:Math.cos(a)*sp,vy:r*(.5+R()*.8),vz:Math.sin(a)*sp,s0:r*.07,s1:r*.02,life:.7+R()*.5,c0:[1,.8,.35],c1:[1,.25,.05],op:1,add:true,drag:.4,grow:1})}
    // white-out: blasts next to you (and a kick of shake scaled by size)
    const d=Math.hypot(x-player.x,y-(player.y+1),z-player.z);if(d<r*12){this.fl.style.transition='none';this.fl.style.opacity=String(Math.min(.85,(1-d/(r*12))*(d<r*2.6?1.2:.4)));void this.fl.offsetWidth;this.fl.style.transition='opacity .7s ease-out';this.fl.style.opacity='0'}
    if(d<r*8){FX.shakeT=Math.max(FX.shakeT||0,.5+r*.03);FX.shakeA=Math.max(FX.shakeA||0,Math.min(.18,r*.01)*(1-d/(r*8)))}},
  tick(dt){if(!this.wrapped)return;
    for(const f of this.fb){if(!f.on)continue;f.t+=dt;const u=f.t/(.35+f.r*.02),s=f.r*(.25+.9*Math.min(1,Math.sqrt(u)));f.m.scale.setScalar(Math.max(.01,s));f.m.position.set(f.x,f.y+f.t*f.r*.5,f.z);f.m.rotation.y+=dt*1.5;f.m.rotation.x+=dt*.7;
      f.m.material.opacity=Math.max(0,1-u*.9)*(f.k?.55:.9);f.m.material.color.setRGB(1,Math.max(.2,.85-u*.7),Math.max(.05,.45-u*.5));if(u>1.1){f.on=false;f.m.visible=false}}
    for(const w of this.dw){if(!w.on)continue;w.t+=dt;const u=w.t/.8,rr=w.r*(.3+2.3*Math.min(1,Math.sqrt(u)));w.m.scale.set(rr,w.r*.35*(1-.5*u),rr);w.m.position.set(w.x,w.y+w.r*.15,w.z);w.m.material.opacity=Math.max(0,.55*(1-u));w.m.rotation.y+=dt*.3;if(u>=1){w.on=false;w.m.visible=false}}}};
