// shipx.js — life on the cruise ship (2026-11-16): a BRIDGE with a helm you steer the liner from (both ships; the one at the terminal can sail out and come back: "Moor"), a real WATER SLIDE (rails.js: the lift takes you up a 13 m tower, then two spirals down into a pool),
//   a BAR (counter, stools, tables, you can sit and order a drink), a SHOP (shelves, a counter, souvenirs) and four CABINS (walls with a door, bunk beds you can sleep in, a chair).
//   Where things go is decided from the ship's own deck grid (cruise_deck.bin): open rectangles of floor with no walls, found once (SHIPX.plan) and used for both ships. Everything is merged into one mesh per ship (children of the near-LOD model, so it is only drawn within 900 m);
//   walls / furniture block through `I.solids` (SHIP.surface asks), seats and beds follow the moving ship (player.sit is re-placed every frame).
const SHIPX={plan:null,on:false,hI:null,seats:[],beds:[],bridge:null,
  okCell(lx,lz,f){const S=SHIP,o=S.cellAt(lx,lz);if(o<0)return false;if(!S.floors(o).some(g=>Math.abs(g-f)<.35))return false;for(const [a,b] of S.walls(o))if(b>f+.7&&a<f+1.7&&b-a>.8)return false;return true},
  free(r,used){for(const u of used)if(r.x0<u.x1+1&&r.x1>u.x0-1&&r.z0<u.z1+1&&r.z1>u.z0-1&&Math.abs(r.f-u.f)<4)return false;return true},
  // an open w x d rectangle of floor (all cells at the same level, no walls): returns {x0,x1,z0,z1,f,cx,cz}
  find(w,d,o,used){const S=SHIP;let best=null,bs=-1e9;for(let lz=o.zmin;lz<=o.zmax;lz+=3)for(let lx=-30;lx<=30;lx+=3){const c=S.cellAt(lx,lz);if(c<0)continue;for(const f of S.floors(c)){if(f<o.fmin||f>o.fmax)continue;
        const r={x0:lx-w/2,x1:lx+w/2,z0:lz-d/2,z1:lz+d/2,f,cx:lx,cz:lz};if(!this.free(r,used))continue;let ok=true;for(let u=r.x0;u<=r.x1&&ok;u+=2)for(let v=r.z0;v<=r.z1;v+=2)if(!this.okCell(u,v,f)){ok=false;break}if(!ok)continue;
        const sc=o.score(f,lx,lz);if(sc>bs){bs=sc;best=r}}}
    if(best)used.push(best);return best},
  makePlan(){if(this.plan)return this.plan;const used=[],P={};
    P.helm=this.find(7,5,{zmin:-215,zmax:-100,fmin:10,fmax:60,score:(f,x,z)=>f*4-z*.02-Math.abs(x)*.1},used);
    P.slide=this.find(15,15,{zmin:-120,zmax:120,fmin:14,fmax:50,score:(f,x,z)=>f-Math.abs(z)*.05},used);
    P.bar=this.find(11,7,{zmin:-130,zmax:130,fmin:8,fmax:50,score:(f,x,z)=>-Math.abs(z-30)*.1-Math.abs(f-(P.slide?P.slide.f:20))},used);
    P.shop=this.find(13,8,{zmin:-130,zmax:130,fmin:8,fmax:50,score:(f,x,z)=>-Math.abs(z+30)*.1-Math.abs(f-(P.bar?P.bar.f:20))},used);
    P.cabins=[];for(let i=0;i<4;i++){const c=this.find(6,4,{zmin:-130,zmax:130,fmin:6,fmax:50,score:(f,x,z)=>-Math.abs(z-(P.bar?P.bar.cz:0))*.05-Math.abs(f-(P.bar?P.bar.f:20))*1.5},used);if(c)P.cabins.push(c)}
    return this.plan=P},
  // ---- geometry (ship-local metres; y = floor level f, the group is the ship's near model)
  build(I){const P=this.makePlan(),parts=[],glow=[],solids=I.solids,seats=[],beds=[];const B=(w,h,d,x,y,z,c)=>parts.push(pkBox(w,h,d,x,y,z,c)),G=(w,h,d,x,y,z,c)=>glow.push(pkBox(w,h,d,x,y,z,c)),Cy=(r,h,x,y,z,c)=>parts.push({g:new THREE.CylinderGeometry(r,r,h,10),m:pkM(x,y,z),c:sRGB(c)});
    const solid=(x0,x1,z0,z1,f)=>solids.push({x0,x1,z0,z1,f});
    const seat=(x,z,f,yaw,y)=>seats.push({lx:x,lz:z,f,yaw,y:y||.5});
    // helm / bridge
    const h=P.helm;if(h){const f=h.f,cx=h.cx,cz=h.cz;B(7,.12,5,cx,f+.06,cz,'#2a2e35');B(3.4,1.0,.9,cx,f+.5,cz-1.4,'#1c1f24');B(3.4,.06,1,cx,f+1.03,cz-1.4,'#3b4048');G(1,.5,.04,cx-.9,f+1.35,cz-1.8,'#35e0d0');G(1,.5,.04,cx+.9,f+1.35,cz-1.8,'#4aa8ff');Cy(.05,.45,cx,f+1.25,cz-1.1,'#c0c4c8');parts.push({g:new THREE.TorusGeometry(.34,.035,6,16),m:pkM(cx,f+1.52,cz-1.1,-.35,0,0),c:sRGB('#c9a24a')});
      Cy(.2,.5,cx,f+.3,cz+.4,'#8b1c1c');B(.5,.6,.1,cx,f+.85,cz+.7,'#8b1c1c');seat(cx,cz+.4,f,Math.PI,.5);solid(cx-1.7,cx+1.7,cz-1.9,cz-.9,f);I.helmSpot={lx:cx,lz:cz-.5,f};this.bridge=h;
      B(.15,2.2,.15,cx-3.4,f+1.1,cz-2.4,'#aab');B(.15,2.2,.15,cx+3.4,f+1.1,cz-2.4,'#aab')}
    // bar
    const b=P.bar;if(b){const f=b.f,cx=b.cx,cz=b.cz,zb=b.z0+1;B(7.5,1.1,.8,cx,f+.55,zb,'#6b4423');B(7.7,.08,1,cx,f+1.12,zb,'#2b1a0e');B(7.5,2.2,.3,cx,f+1.4,b.z0+.3,'#3b2a1c');
      for(let i=0;i<14;i++)B(.12,.3+.1*(i%3),.12,cx-3.4+i*.52,f+1.35+(i%2)*.7,b.z0+.5,['#2a7a3a','#a8541c','#c9c13a','#7a2a2a'][i%4]);G(7.4,.1,.05,cx,f+2.55,b.z0+.45,'#ff3a8a');
      for(let i=0;i<5;i++){const x=cx-3+i*1.5;Cy(.22,.7,x,f+.4,zb+1.1,'#c3262d');Cy(.04,.4,x,f+.2,zb+1.1,'#aaa');seat(x,zb+1.1,f,Math.PI,.75)}solid(cx-3.9,cx+3.9,zb-.5,zb+.5,f);
      for(const tx of [cx-3,cx+3]){const tz=cz+1.6;Cy(.5,.06,tx,f+.75,tz,'#d9c9a8');Cy(.05,.75,tx,f+.37,tz,'#555');for(const [dx,dz,yw] of [[-.9,0,Math.PI/2],[.9,0,-Math.PI/2],[0,-.9,0],[0,.9,Math.PI]]){Cy(.2,.45,tx+dx,f+.22,tz+dz,'#2a5a8a');seat(tx+dx,tz+dz,f,yw,.45)}solid(tx-.5,tx+.5,tz-.5,tz+.5,f)}
      I.barSpot={lx:cx,lz:zb+.9,f}}
    // shop
    const sh=P.shop;if(sh){const f=sh.f,cx=sh.cx,cz=sh.cz;for(const dz of [-1.6,1.6]){B(8.5,1.9,.5,cx-.5,f+.95,cz+dz,'#cfd3d8');for(let k=0;k<7;k++)for(let r=0;r<3;r++)B(.7,.35,.4,cx-4.2+k*1.2,f+.45+r*.6,cz+dz+(dz<0?.28:-.28),['#e0453a','#e6b93a','#3a9ae0','#4ec26a','#b04ae0'][(k+r)%5]);solid(cx-4.8,cx+3.8,cz+dz-.3,cz+dz+.3,f)}
      B(3,1,.8,sh.x1-2,f+.5,cz,'#2b2f36');B(3.1,.06,.9,sh.x1-2,f+1.03,cz,'#9aa0a8');G(2.4,.5,.05,sh.x1-2,f+2.2,cz,'#45e06a');solid(sh.x1-3.6,sh.x1-.4,cz-.5,cz+.5,f);I.shopSpot={lx:sh.x1-3.6,lz:cz,f}}
    // cabins: four walls (a door gap in the front), bunk beds, a chair, a glowing porthole
    for(const c of P.cabins){const f=c.f,T=.15,H=2.6;const wall=(x0,x1,z0,z1)=>{B(x1-x0,H,z1-z0,(x0+x1)/2,f+H/2,(z0+z1)/2,'#e8e2d4');solid(x0,x1,z0,z1,f)};
      wall(c.x0,c.x1,c.z0,c.z0+T);wall(c.x0,c.x0+T,c.z0,c.z1);wall(c.x1-T,c.x1,c.z0,c.z1);const dx=c.cx-.6;wall(c.x0,dx,c.z1-T,c.z1);wall(dx+1.2,c.x1,c.z1-T,c.z1);B(1.2,.4,T,c.cx,f+2.4,c.z1-T/2,'#e8e2d4');
      B(2,.5,.95,c.x0+1.2,f+.45,c.z0+.7,'#2f5a8a');B(1.9,.12,.85,c.x0+1.2,f+.78,c.z0+.7,'#f1f1ee');B(2,.5,.95,c.x0+1.2,f+1.5,c.z0+.7,'#2f5a8a');B(1.9,.12,.85,c.x0+1.2,f+1.83,c.z0+.7,'#f1f1ee');for(const [px,pz] of [[.2,.2],[2.2,.2],[.2,1.2],[2.2,1.2]])B(.08,1.9,.08,c.x0+px,f+.95,c.z0+pz,'#777');
      solid(c.x0+.1,c.x0+2.3,c.z0+.2,c.z0+1.2,f);beds.push({lx:c.x0+1.2,lz:c.z0+1.5,f});B(.9,.05,.9,c.x1-1,f+.7,c.z0+1.3,'#d9c9a8');Cy(.05,.7,c.x1-1,f+.35,c.z0+1.3,'#555');Cy(.2,.45,c.x1-1,f+.22,c.z0+2.2,'#8a5a2a');seat(c.x1-1,c.z0+2.2,f,Math.PI,.45);G(.04,.5,.5,c.x1-T,f+1.7,c.cz,'#9fd7ff')}
    // the slide tower: four legs, a platform, a ladder-lift column, the slide itself (rails.js) and a pool
    const sl=P.slide;if(sl){const f=sl.f,cx=sl.cx,cz=sl.cz,H=13;for(const [dx,dz] of [[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]])Cy(.22,H,cx+dx,f+H/2,cz+dz,'#e9e5da');B(5,.3,5,cx,f+H,cz,'#4aa8ff');B(.1,H,.1,cx,f+H/2,cz,'#c9a24a');G(3.4,.5,.05,cx,f+H+.8,cz-2.4,'#ffd23a');
      solid(cx-2.4,cx+2.4,cz-2.4,cz+2.4,f)}
    const mesh=pkMesh(parts);mesh.castShadow=false;mesh.receiveShadow=false;I.n.add(mesh);const gm=new THREE.Mesh(pkMerge(glow),pkMatGlow());I.n.add(gm);I.props=[mesh,gm];I.seats=seats;I.beds=beds;
    if(sl){const f=sl.f,cx=sl.cx,cz=sl.cz,pts=[[cx,f+.9,cz],[cx,f+5,cz],[cx,f+10,cz],[cx,f+13.3,cz],[cx+2,f+13.6,cz],[cx+4.2,f+13.2,cz]],R=4.2,turns=2.2,n=26;
      for(let k=1;k<=n;k++){const u=k/n,a=u*turns*2*Math.PI;pts.push([cx+R*Math.cos(a)*(1+.15*u),f+13.2-11.6*u,cz+R*Math.sin(a)*(1+.15*u)])}
      pts.push([cx+R*1.15+2.2,f+1.5,cz+1],[cx+R*1.15+4.4,f+1.2,cz+1.6]);
      const T=RAILS.make({name:'Water slide',frame:I.g,pts,kind:'slide',v0:2,visFrom:3,minV:5,maxV:15,col:0x2ab4ff});T.lift=[0,T.at(3)];T.liftV=5;T.moving=true;T.endLocal=[cx+R*1.15+6,f+.05,cz+1.8];I.slideT=T;
      const pool=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,.5,20),new THREE.MeshStandardMaterial({color:0x2ab4ff,transparent:true,opacity:.7,roughness:.1}));pool.position.set(cx+R*1.15+4.6,f+.25,cz+1.6);I.n.add(pool)}
    return I},
  // ---- who is near what (ship-local test)
  near(list,r){for(const I of SHIP.inst){if(!I.props||Math.hypot(I.x-player.x,I.z-player.z)>260)continue;const [lx,lz]=SHIP.local(I,player.x,player.z),yy=player.y-I.g.position.y;for(const o of list(I)){if(Math.abs(o.f-yy)<1.4&&Math.hypot(o.lx-lx,o.lz-lz)<(r||1.4))return {I,o}}}return null},
  init(){if(this.inited)return;this.inited=1;const css=document.createElement('style');css.textContent=`body.shipxon #hud *{visibility:hidden}body.shipxon #joy,body.shipxon #joy *{visibility:visible}body.shipxon #actBtns,body.shipxon #bAct,body.shipxon #quickRow,body.shipxon #gunBar{display:none!important}   /* the stick (#joy) lives inside #hud and must stay: it drives */
#helmHud{position:fixed;inset:0;z-index:39;pointer-events:none;font:700 12px var(--f-disp,system-ui);color:#e9f2f5}#helmHud[hidden]{display:none}#helmInfo{position:absolute;left:max(14px,env(safe-area-inset-left));top:calc(14px + env(safe-area-inset-top,0px));padding:12px 14px;border-radius:12px;background:linear-gradient(180deg,#191c23,#07080b);border:1px solid rgba(255,255,255,.13);min-width:210px;line-height:1.6}#helmInfo b{display:block;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#38e4d0}
#helmBtns{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(3,76px);gap:8px;pointer-events:auto}#helmBtns button{height:70px;border-radius:14px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#e3edf1;font:800 11px var(--f-disp,system-ui);letter-spacing:.08em;text-transform:uppercase;touch-action:none}#helmBtns button:active{filter:brightness(1.6)}`;document.head.appendChild(css);
    const d=document.createElement('div');d.id='helmHud';d.hidden=true;d.innerHTML='<div id="helmInfo"><b>Bridge</b><span id="helmTxt"></span></div><div id="helmBtns"><button data-h="rl">◄ Rudder</button><button data-h="up">+ Speed</button><button data-h="rr">Rudder ►</button><button data-h="leave">Leave</button><button data-h="dn">− Speed</button><button data-h="moor">Moor</button></div>';document.body.appendChild(d);this.el=d;this.k={};
    d.addEventListener('pointerdown',e=>{const h=e.target.dataset&&e.target.dataset.h;if(!h)return;e.preventDefault();e.stopPropagation();if(h==='leave')this.leave();else if(h==='moor')this.moor();else this.k[h]=1});for(const n of ['pointerup','pointercancel','pointerleave'])d.addEventListener(n,e=>{const h=e.target.dataset&&e.target.dataset.h;if(h)this.k[h]=0});
    addEventListener('keydown',e=>{if(!this.on)return;const m={KeyW:'up',ArrowUp:'up',KeyS:'dn',ArrowDown:'dn',KeyA:'rl',ArrowLeft:'rl',KeyD:'rr',ArrowRight:'rr'}[e.code];if(m){this.k[m]=1;e.stopPropagation()}else if(e.code==='Escape')this.leave()},true);addEventListener('keyup',e=>{const m={KeyW:'up',ArrowUp:'up',KeyS:'dn',ArrowDown:'dn',KeyA:'rl',ArrowLeft:'rl',KeyD:'rr',ArrowRight:'rr'}[e.code];if(m)this.k[m]=0},true);
    const lab=(t,fn,cond)=>INTERACT.push({x:0,z:0,r:1e9,label:t,cond,fn});
    lab('Take the helm',()=>{const n=this.near(I=>I.helmSpot?[I.helmSpot]:[],2.6);if(n)this.helm(n.I,n.o)},()=>!this.on&&!player.sit&&!!this.near(I=>I.helmSpot?[I.helmSpot]:[],2.6));
    lab('Sit',()=>{const n=this.near(I=>I.seats,1.3);if(n)this.sit(n.I,n.o)},()=>!this.on&&!player.sit&&!RAILS.on&&!!this.near(I=>I.seats,1.3));
    lab('Sleep until morning',()=>{if(typeof KIT!=='undefined'){player.vx=player.vz=0;KIT.sleep()}},()=>!this.on&&!player.sit&&typeof KIT!=='undefined'&&!KIT.sleeping&&!!this.near(I=>I.beds,1.8));
    lab('Order a drink (₴25)',()=>{if(WALLET.pay(25,'A drink')){toast('Bar','Cheers! · wallet '+WALLET.fmt());try{GUN.hp=Math.min(100,GUN.hp+10)}catch(e){}}},()=>!this.on&&!!this.near(I=>I.barSpot?[I.barSpot]:[],2.4));
    lab('Buy a souvenir (₴50)',()=>{if(WALLET.pay(50,'A souvenir'))toast('Shop','A tiny cruise ship in a bottle · wallet '+WALLET.fmt())},()=>!this.on&&!!this.near(I=>I.shopSpot?[I.shopSpot]:[],2.6));
    ANIM.push(dt=>this.tick(dt));
    // build as soon as the ships exist
    this._iv=setInterval(()=>{if(!SHIP.ready||!SHIP.inst.length)return;clearInterval(this._iv);try{this.detail();for(const I of SHIP.inst)this.build(I);console.log('[shipx] ship interiors built',JSON.stringify(Object.fromEntries(Object.entries(this.plan).map(([k,v])=>[k,Array.isArray(v)?v.length:!!v]))))}catch(e){console.error('[shipx]',e)}},1500)},
  // the ship's colours come from vertex colours (the model's own textures were averaged away): give the hull / deck material some surface in the shader, no texture needed:
  // plank seams on every upward face (every 0.6 m), panel lines on walls (every 3 m), a fine grain from a hash of the 0.5 m cell, and a touch of rust-streak darkening low on vertical faces
  detail(){const seen=new Set();SHIP.near.traverse(o=>{if(!o.isMesh||!o.material||seen.has(o.material)||o.material.name!=='hull')return;const m=o.material;seen.add(m);
      m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vNkP;varying vec3 vNkN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvNkP=position;vNkN=normal;');
        sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vNkP;varying vec3 vNkN;float nkH(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}').replace('#include <color_fragment>','#include <color_fragment>\n{float up=smoothstep(.75,.95,abs(vNkN.y));float seam=1.-smoothstep(.0,.05,abs(fract(vNkP.z*1.6)-.5)-.43);float seam2=1.-smoothstep(.0,.05,abs(fract(vNkP.x*.8)-.5)-.45);float g=nkH(floor(vNkP.xz*2.)+floor(vNkP.y));float wl=1.-smoothstep(.0,.04,abs(fract(vNkP.y/3.)-.5)-.47);float wv=1.-smoothstep(.0,.04,abs(fract((vNkP.x+vNkP.z)/4.)-.5)-.48);\ndiffuseColor.rgb*=(.93+.14*g)*(1.-.22*up*max(seam,seam2*.7))*(1.-.16*(1.-up)*max(wl,wv));}');};
      m.customProgramCacheKey=()=>'shipdetail';m.needsUpdate=true})},
  sit(I,o){const [wx,wz]=SHIP.world(I,o.lx,o.lz);const yaw=o.yaw+I.g.rotation.y;player.sit={x:wx,z:wz,y:I.g.position.y+o.f+(o.y||.5)*.0,yaw,ship:I,o};cam.yaw=yaw;cam.pitch=.1;toast('Seat','move to get up')},
  helm(I,o){this.on=true;this.hI=I;this.I0=I.mode;I.mode='manual';I.ctl=I.ctl||{th:Math.max(0,Math.min(1,I.spd/14)),rud:0};document.body.classList.add('shipxon');this.el.hidden=false;player.sit=null;toast('Bridge','W/S or stick: speed · A/D: rudder · Moor brings the ship back to the terminal')},
  leave(){if(!this.on)return;this.on=false;const I=this.hI;document.body.classList.remove('shipxon');this.el.hidden=true;if(I.mode==='manual')I.mode=this.I0==='dock'&&I.ctl.th<.02&&Math.abs(I.spd)<.3&&false?'dock':'sail';player.vx=player.vz=0;if(I===SHIP.A&&I.mode==='sail'&&Math.hypot(I.x-I.home.x,I.z-I.home.z)<30){I.mode='dock';I.spd=0}cam.init=false;toast('Bridge',I.mode==='sail'?'autopilot: the ship sails its loop':'moored')},
  moor(){if(!this.on)return;const I=this.hI;if(!I.home){toast('Bridge','this ship has no berth');return}I.mode='home';this.on=false;document.body.classList.remove('shipxon');this.el.hidden=true;cam.init=false;toast('Bridge','heading back to the terminal berth')},
  tick(dt){dt=Math.min(dt,.1);this.decksTick(dt);
    // the seat follows the moving ship
    const s=player.sit;if(s&&s.ship){const I=s.ship,[wx,wz]=SHIP.world(I,s.o.lx,s.o.lz);s.x=wx;s.z=wz;s.y=I.g.position.y+s.o.f;s.yaw=s.o.yaw+I.g.rotation.y}
    if(!this.on)return;const I=this.hI,k=this.k,c=I.ctl;
    c.th=Math.max(-.3,Math.min(1,c.th+((k.up?1:0)-(k.dn?1:0)+inp.jy*.8)*.25*dt));c.rud=Math.max(-1,Math.min(1,(k.rr?1:0)-(k.rl?1:0)+inp.jx));
    // stand at the console
    const hs=I.helmSpot,[wx,wz]=SHIP.world(I,hs.lx,hs.lz);player.x=wx;player.z=wz;player.y=I.g.position.y+hs.f+.02;player.vx=player.vz=0;player.air=false;player.yaw=I.g.rotation.y+Math.PI;PLR.root.visible=true;PLR.root.position.set(wx,player.y,wz);PLR.root.rotation.set(0,player.yaw,0,'XYZ');try{animPlayer(PLR,{spd:0,mode:'walk'},dt)}catch(e){}
    document.getElementById('helmTxt').innerHTML=Math.round(I.spd*1.944)+' kn · heading '+(((Math.round(I.th*57.3)%360)+360)%360)+'°<br>throttle '+Math.round(c.th*100)+' % · rudder '+(c.rud>.1?'right':c.rud<-.1?'left':'centre')}};
// ---- DECKS: the deck grid has no stairs between the decks (it came from the model's big surfaces), so a "Decks" button (visible while you are aboard) lists the places and the decks and takes you there (like an elevator)
Object.assign(SHIPX,{
  levels(){if(this._lv)return this._lv;const D=SHIP.deck,bins={};for(let j=0;j<D.H;j+=2)for(let i=0;i<D.W;i+=2){for(const f of SHIP.floors(D.off[i+j*D.W])){const k=Math.round(f*2)/2;bins[k]=(bins[k]||0)+1}}
    const L=Object.entries(bins).filter(e=>e[1]>150).map(e=>+e[0]).sort((a,b)=>a-b),out=[];for(const l of L){if(out.length&&l-out[out.length-1]<2.2)continue;out.push(l)}return this._lv=out},
  // a free spot (open 3x3) on level f nearest to the local point (lx,lz)
  spotAt(f,lx,lz){let best=null,bd=1e9;for(let r=0;r<200&&!best;r+=2)for(let a=0;a<(r?16:1);a++){const t=a/16*6.283,x=lx+Math.cos(t)*r,z=lz+Math.sin(t)*r;if(!SHIP.cellAt(x,z)<0&&0)continue;let ok=true;for(const [dx,dz] of [[0,0],[2,0],[-2,0],[0,2],[0,-2]])if(!this.okCell(x+dx,z+dz,f)){ok=false;break}if(ok){const d=Math.hypot(x-lx,z-lz);if(d<bd){bd=d;best={lx:x,lz:z,f}}}}return best},
  aboardNow(){let r=null;if(typeof started==='undefined'||!started||!SHIP.ready)return null;for(const I of SHIP.inst){if(Math.hypot(I.x-player.x,I.z-player.z)>260)continue;const [lx,lz]=SHIP.local(I,player.x,player.z);if(Math.abs(lx)>34||Math.abs(lz)>222)continue;const o=SHIP.cellAt(lx,lz);if(o<0)continue;const yy=player.y-I.g.position.y;if(SHIP.floors(o).some(f=>Math.abs(f-yy)<1.6)){r=I;break}}return r},
  goTo(I,sp){if(!sp)return;const [wx,wz]=SHIP.world(I,sp.lx,sp.lz);player.x=wx;player.z=wz;player.y=I.g.position.y+sp.f+.05;player.vx=player.vz=0;player.vy=0;player.air=false;player.sit=null;player.yaw=I.th+Math.PI+(sp.face||0);cam.init=false;try{SWIM.reset()}catch(e){}this.panel(false)},
  panel(on){if(!this.pn){const d=document.createElement('div');d.id='shipDecks';d.hidden=true;d.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;min-width:280px;max-width:90vw;max-height:80vh;overflow:auto;padding:14px;border-radius:14px;background:linear-gradient(180deg,#191c23,#07080b);border:1px solid rgba(255,255,255,.18);color:#e9f2f5;font:700 13px var(--f-disp,system-ui)';document.body.appendChild(d);this.pn=d;
      const b=document.createElement('button');b.id='shipDecksBtn';b.textContent='DECKS';b.hidden=true;b.style.cssText='position:fixed;left:max(16px,env(safe-area-inset-left));bottom:calc(150px + env(safe-area-inset-bottom,0px));z-index:38;width:74px;height:74px;border-radius:14px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#38e4d0;font:800 12px var(--f-disp,system-ui);letter-spacing:.1em';b.addEventListener('click',()=>this.panel(this.pn.hidden));document.body.appendChild(b);this.pb=b;
      d.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.k;if(!k)return;const I=this.aboardNow()||this._lastI;if(!I)return;if(k==='x'){this.panel(false);return}const [t,v]=k.split(':');const P=this.plan;let sp=null;
        if(t==='h'&&P.helm)sp={lx:P.helm.cx,lz:P.helm.cz+.6,f:P.helm.f,face:Math.PI};else if(t==='b'&&P.bar)sp={lx:P.bar.cx,lz:P.bar.cz+1,f:P.bar.f};else if(t==='s'&&P.shop)sp={lx:P.shop.cx-1,lz:P.shop.cz+3,f:P.shop.f};else if(t==='c'&&P.cabins[+v])sp={lx:P.cabins[+v].cx,lz:P.cabins[+v].cz+.3,f:P.cabins[+v].f};else if(t==='w'&&P.slide)sp={lx:P.slide.cx+3.2,lz:P.slide.cz,f:P.slide.f};else if(t==='t')sp=SHIP.deckSpot(I,170);
        else if(t==='d'){const [lx,lz]=SHIP.local(I,player.x,player.z);sp=this.spotAt(+v,lx,lz)||this.spotAt(+v,0,0)}
        if(sp)this.goTo(I,sp);else toast('Decks','no free spot there')})}
    const d=this.pn,P=this.plan;if(!on){d.hidden=true;return}const I=this.aboardNow();if(I)this._lastI=I;
    const bt=(k,t)=>`<button data-k="${k}" style="margin:3px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#14171d;color:#e9f2f5;font:700 13px system-ui">${t}</button>`;
    d.innerHTML='<div style="letter-spacing:.2em;font-size:11px;color:#38e4d0;margin-bottom:8px">CRUISE SHIP</div>'+(P?bt('h','Bridge (helm)')+bt('w','Water slide')+bt('b','Bar')+bt('s','Shop')+P.cabins.map((c,i)=>bt('c:'+i,'Cabin '+(i+1))).join('')+bt('t','Stern deck'):'')+'<div style="margin:10px 0 4px;color:#9ab">Decks</div>'+this.levels().map((l,i)=>bt('d:'+l,'Deck '+(i+1)+' · '+Math.round(l)+' m')).join('')+'<div style="margin-top:8px">'+bt('x','Close')+'</div>';d.hidden=false},
  decksTick(dt){this._dt=(this._dt||0)-dt;if(this._dt>0)return;this._dt=.3;if(!this.pb&&SHIP.ready&&this.plan)this.panel(false);if(!this.pb)return;const a=this.aboardNow()||(this.on?this.hI:null);this.pb.hidden=!a||this.on||RAILS.on;if(!a&&this.pn)this.pn.hidden=true}});
// ---- ship.js hooks: manual steering and the way home
Object.assign(SHIP,{
  manual(I,dt){const c=I.ctl||{th:0,rud:0};const tgt=c.th*14;I.spd+=(tgt-I.spd)*Math.min(1,dt*.12);I.th+=c.rud*.05*Math.min(1,Math.abs(I.spd)/6)*dt;
    const sx=Math.sin(I.th),cz=Math.cos(I.th),nx=I.x+sx*I.spd*dt,nz=I.z+cz*I.spd*dt,deep=(x,z)=>rawH(x,z)<SL-6;   // the berth is shallow along the quay: only the water ahead of the bow counts
    if(I.spd>0&&!(deep(nx+sx*215,nz+cz*215)&&deep(nx+sx*150+cz*30,nz+cz*150-sx*30)&&deep(nx+sx*150-cz*30,nz+cz*150+sx*30))){I.spd*=Math.max(0,1-dt*.8);if(I.spd<.3)I.spd=0}else{I.x=nx;I.z=nz}},
  goHome(I,dt){const H=I.home,dx=H.x-I.x,dz=H.z-I.z,d=Math.hypot(dx,dz);if(d<14){I.th=H.th;I.x=H.x;I.z=H.z;I.spd=0;I.mode='dock';this.pose(I);toast('Cruise ship','moored at the terminal');return}
    let want=Math.atan2(dx,dz)-I.th;while(want>Math.PI)want-=6.2832;while(want<-Math.PI)want+=6.2832;I.th+=Math.max(-.03*dt,Math.min(.03*dt,want));I.spd+=(Math.min(9,2+d*.05)-I.spd)*Math.min(1,dt*.3);I.x+=Math.sin(I.th)*I.spd*dt;I.z+=Math.cos(I.th)*I.spd*dt}});
// walls / furniture of the interiors block like the model's own walls
{const _s=SHIP.surface;SHIP.surface=function(I,wx,wz,wy){const r=_s.call(this,I,wx,wz,wy);if(r&&I.solids&&I.solids.length){const [lx,lz]=this.local(I,wx,wz),f=r.h-I.g.position.y;for(const b of I.solids)if(lx>b.x0&&lx<b.x1&&lz>b.z0&&lz<b.z1&&Math.abs(f-b.f)<1.2){r.wall=true;break}}return r}}
