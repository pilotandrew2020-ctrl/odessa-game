// space.js — the space programme (2026-11-14). Everything here is built from four owner-supplied models (assets/models/space: shuttle_stack, iss, moon, fighter) plus procedural parts.
//   1. A launch islet in the sea beyond the Odesa Star liner with the Space Shuttle stack (orbiter + orange tank + two boosters) on a pad and a service tower; "Space Shuttle" in the Spawn menu takes you there.
//   2. The shuttle flies ITSELF: countdown, lift-off, pitch-over, the boosters burn out and fall away, the tank is dropped, then a cut to space where you float next to the station.
//   3. The space fighter (Fighter 38) is in the Spawn menu too: it appears floating in the air next to you; board it, fly it by hand (pitch / yaw / roll / throttle, up to 25,000 m/s in space), climb out of the atmosphere.
//   4. Space is a separate scene (floating origin, doubles for positions): Earth, the sun, stars, the ISS, and the Moon far away (6,000 km: ~4 minutes at full speed). The fighter has a landing assist near the Moon;
//      land, get out, walk with the Moon's gravity (1.62 m/s2) on a curved patch of regolith with craters and rocks, get back in, or press Station to return to the ISS.
// Hooks in index.html: SPC.init() at boot, SPC.frame(dt) early in loop() while SPC.space, SPC.frameAtmo(dt) after stepCamera while SPC.atmo, CRUISE.rot (the liner's heading). Distances are compressed on purpose
// (Earth radius 1,200 km, Moon radius 300 km at 6,000 km) so that the trip is long enough to feel far, but not an hour.
const SPC={
  on:false,space:false,atmo:false,mode:'off',sc:null,lib:{},pad:null,stk:null,fgt:null,fgtMesh:null,built:false,
  P:{earthR:1.2e6,moonR:3e5,moonD:6e6,vmax:25000,g:1.62,ascentT:90},
  URL:{stack:'assets/models/space/shuttle_stack.glb',iss:'assets/models/space/iss.glb',moon:'assets/models/space/moon.glb',fighter:'assets/models/space/fighter.glb'},
  in:{px:0,py:0,roll:0,thr:0,full:0,brake:0,jump:0,act:0,lx:0,ly:0},
  load(k){return this.lib[k]||(this.lib[k]=new Promise((res,rej)=>new THREE.GLTFLoader().load(this.URL[k],g=>{g.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material){o.material.side=THREE.DoubleSide;o.material.envMapIntensity=.6}}});res(g.scene)},undefined,rej)))},
  // ------------------------------------------------------------------------------------------------ the launch islet (main world)
  init(){if(this.inited)return;this.inited=1;this.css();this.buildHud();
    const tryBuild=()=>{if(this.pad||typeof CRUISE==='undefined')return;if(!CRUISE.x&&!CRUISE.z)return;this.buildPad()};tryBuild();if(!this.pad)this._iv=setInterval(()=>{tryBuild();if(this.pad)clearInterval(this._iv)},2000);
    addEventListener('keydown',e=>this.key(e,1),true);addEventListener('keyup',e=>this.key(e,0),true);
    ANIM.push(dt=>this.tick(dt))},
  buildPad(){const th=CRUISE.rot||0,bd=[Math.cos(th),-Math.sin(th)],pp=[-bd[1],bd[0]];let px=0,pz=0,found=false;
    for(let d=330;d<=1100&&!found;d+=30)for(const sd of [1,-1]){const x=CRUISE.x+bd[0]*d+pp[0]*130*sd,z=CRUISE.z+bd[1]*d+pp[1]*130*sd;let deep=true;
      for(let a=0;a<8;a++){const q=a*Math.PI/4;if(rawH(x+Math.cos(q)*110,z+Math.sin(q)*110)>SL-6)deep=false}if(deep&&rawH(x,z)<SL-6){px=x;pz=z;found=true;break}}
    if(!found){px=CRUISE.x+bd[0]*600;pz=CRUISE.z+bd[1]*600}
    const top=SL+4.2,g=new THREE.Group();g.position.set(px,0,pz);scene.add(g);this.pad={x:px,z:pz,top,g,bow:bd};
    const M=(c,r,m)=>new THREE.MeshStandardMaterial({color:c,roughness:r===undefined?.9:r,metalness:m||0});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(64,100,80,56),M(0xcdb98f,.95));body.position.y=top-40;body.receiveShadow=true;g.add(body);
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(44,44,.4,48),M(0x8d9096,.8));deck.position.y=top+.05;deck.receiveShadow=true;g.add(deck);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(44,.5,6,64),M(0xe9e9e4,.6));ring.rotation.x=Math.PI/2;ring.position.y=top+.3;g.add(ring);
    const trench=new THREE.Mesh(new THREE.BoxGeometry(14,.3,30),M(0x111214,1));trench.position.set(0,top+.28,0);g.add(trench);
    // service tower with a swing arm, lamps, a control hut, a sign
    const steel=M(0x9aa3ab,.55,.5),red=M(0xc0392b,.6);const tx=30,tz=0,TH=82;
    for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]]){const l=new THREE.Mesh(new THREE.BoxGeometry(.8,TH,.8),steel);l.position.set(tx+dx,top+TH/2,tz+dz);g.add(l)}
    for(let y=6;y<TH;y+=8){for(const s of [0,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(s?4.4:.4,.4,s?.4:4.4),steel);b.position.set(tx,top+y,tz+(s?2:0)*0);b.position.x=tx;g.add(b);const c=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,5.4),steel);c.position.set(tx+(s?-2:2),top+y+4,tz);c.rotation.x=s?.8:-.8;g.add(c)}}
    const arm=new THREE.Mesh(new THREE.BoxGeometry(28,2,2.6),steel);arm.position.set(tx-15,top+50,tz);g.add(arm);this.arm=arm;
    const top2=new THREE.Mesh(new THREE.BoxGeometry(5,1.5,5),red);top2.position.set(tx,top+TH+.8,tz);g.add(top2);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,18,6),steel);mast.position.set(tx,top+TH+10,tz);g.add(mast);
    const lampM=new THREE.MeshBasicMaterial({color:0xfff2c8});for(const a of [0,1,2,3,4,5]){const q=a*Math.PI/3,px2=Math.cos(q)*46,pz2=Math.sin(q)*46;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.25,.3,16,6),steel);pole.position.set(px2,top+8,pz2);g.add(pole);const lm=new THREE.Mesh(new THREE.BoxGeometry(2.6,.6,1.4),lampM);lm.position.set(px2,top+16.3,pz2);g.add(lm)}
    const hut=new THREE.Mesh(new THREE.BoxGeometry(14,5,9),M(0xeeeeea,.7));hut.position.set(-30,top+2.5,22);g.add(hut);const hw=new THREE.Mesh(new THREE.BoxGeometry(12,1.4,.2),M(0x1b2b3a,.2,.3));hw.position.set(-30,top+3.2,26.6);g.add(hw);
    try{const cv=txtCanvas(['ODESA SPACE CENTER','Pad 1 · launch your shuttle here'],{w:1024,h:256,sizes:[96,44],color:'#fff',bg:'#0b0d11',border:'#38e4d0',bw:10});const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;const sg=new THREE.Mesh(new THREE.PlaneGeometry(22,5.5),new THREE.MeshBasicMaterial({map:tex}));sg.position.set(-30,top+9,22);sg.rotation.y=Math.PI;g.add(sg);const pl=new THREE.Mesh(new THREE.BoxGeometry(.5,9,.5),steel);pl.position.set(-30,top+4.5,22);}catch(e){}
    // the ground: the pad deck, the sand and its slope into the sea (the player walks on it)
    SPECIAL.push((x,z)=>{const r=Math.hypot(x-px,z-pz);if(r>100)return null;const h=r<64?top:top-(r-64)*.62;return h>SL-3?{h,pri:5,surf:r<44?'stone':'sand'}:null});
    PLACES.push({id:'spacepad',name:'Space launch pad',sub:'islet beyond the Odesa Star liner',x:px-34,z:pz+8,yaw:Math.atan2(34,-8)});
    INTERACT.push({x:px,z:pz,y:top,r:46,label:'Launch the Space Shuttle',cond:()=>!this.on&&!PORTAL.cur&&!!this.stk,fn:()=>this.launch()});
    INTERACT.push({x:0,z:0,r:1e9,label:'Board the space fighter',cond:()=>!this.on&&!PORTAL.cur&&this.fgt&&Math.hypot(this.fgt.x-player.x,this.fgt.z-player.z)<16,fn:()=>this.board()});
    this.top=top;this.loadStack()},
  loadStack(){if(this.stk||this._ls)return;this._ls=1;this.load('stack').then(s=>{const st=s.clone(true),g=new THREE.Group();g.add(st);g.position.set(0,this.top+.3,0);g.rotation.y=Math.PI/2;this.pad.g.add(g);this.stk=g;this.parts={};
      for(const n of ['srb_l','srb_r','tank','orbiter']){const o=st.getObjectByName(n);if(o){this.parts[n]=o;const b=new THREE.Box3().setFromObject(o);o.userData.bb=b}}
      // where the flames go (stack-local): boosters' bottoms and the orbiter's engines
      st.updateMatrixWorld(true);const loc=n=>{const b=this.parts[n]&&new THREE.Box3().setFromObject(this.parts[n]);if(!b)return null;const c=new THREE.Vector3();b.getCenter(c);g.worldToLocal(c);const lo=g.worldToLocal(new THREE.Vector3(c.x,b.min.y,c.z));return {x:lo.x,y:lo.y,z:lo.z}};
      this.nozzle={srb_l:loc('srb_l'),srb_r:loc('srb_r'),orbiter:loc('orbiter')};
      }).catch(e=>console.warn('[space] stack',e))},
  tick(dt){if(!this.pad||this.on)return;const d=Math.hypot(player.x-this.pad.x,player.z-this.pad.z);if(d<58&&player.y<this.top-1.5&&player.y>this.top-60&&typeof started!=='undefined'&&started){player.y=this.top+.05;player.vy=0;player.air=false;if(typeof SWIM!=='undefined')try{SWIM.reset()}catch(e){}}   // a teleport onto the islet starts at the sea bed: stand on the pad
    if(d<1500&&!this.stk&&!this._ls)this.loadStack();
    if(this.fgtMesh){this.fgtMesh.position.y=this.fgt.y+Math.sin(performance.now()*.0013)*.5;this.fgtMesh.rotation.z=Math.sin(performance.now()*.0009)*.03}},
  // ------------------------------------------------------------------------------------------------ the Spawn menu entries
  goPad(){const p=PLACES.find(q=>q.id==='spacepad');if(!p){toast('Space launch pad','still being built, try again in a moment');return}teleport(p);setTimeout(()=>toast('Space Shuttle','walk to the shuttle and press the action button to launch'),900)},
  async spawnFighter(){try{const m=(await this.load('fighter')).clone(true),y=Math.max(groundH(player.x,player.z),SL)+7,f=[Math.sin(player.yaw),Math.cos(player.yaw)];
      if(this.fgtMesh){scene.remove(this.fgtMesh)}m.position.set(player.x+f[0]*14,y,player.z+f[1]*14);m.rotation.y=player.yaw+Math.PI;scene.add(m);this.fgtMesh=m;this.fgt={x:m.position.x,y,z:m.position.z,yaw:player.yaw};
      toast('Space fighter','it floats in the air next to you: press the action button to board')}catch(e){console.warn('[space] fighter',e);toast('Space fighter','the model failed to load, check the connection')}},
};
// ==================================================================================================== HUD, input, styles
Object.assign(SPC,{
  css(){const s=document.createElement('style');s.textContent=`
body.spc #hud,body.spc #joy,body.spc #actBtns,body.spc #bAct,body.spc #quickRow,body.spc #gunBar,body.spc #heliControls{display:none!important}
#spc{position:fixed;inset:0;z-index:40;pointer-events:none;font:700 12px var(--f-disp,system-ui);color:#e9f2f5;user-select:none;-webkit-user-select:none}#spc[hidden]{display:none}
#spc>*{pointer-events:auto}#spcLook{position:absolute;inset:0;pointer-events:auto;touch-action:none;z-index:0}
#spcInfo{position:absolute;left:max(14px,env(safe-area-inset-left));top:calc(14px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:12px;background:linear-gradient(180deg,#191c23,#07080b);border:1px solid rgba(255,255,255,.13);min-width:210px;pointer-events:none;z-index:2}
#spcInfo b{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#38e4d0}#spcInfo span{font-size:13px;font-variant-numeric:tabular-nums}
#spcInfo i{display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}#spcInfo u{display:block;height:100%;width:0;background:#38e4d0;box-shadow:0 0 8px #38e4d0}
#spcMsg{position:absolute;left:0;right:0;top:24%;text-align:center;font:800 clamp(30px,7vw,84px) var(--f-disp,system-ui);letter-spacing:.06em;color:#fff;text-shadow:0 4px 24px #000;pointer-events:none;z-index:2}
#spcMsg small{display:block;font:600 clamp(12px,2vw,18px) system-ui;letter-spacing:.12em;text-transform:uppercase;margin-top:8px;color:#cfe}
#spcStick{position:absolute;left:max(24px,env(safe-area-inset-left));bottom:calc(30px + env(safe-area-inset-bottom,0px));width:150px;height:150px;border-radius:24px;background:linear-gradient(180deg,#191c23,#07080b);border:1px solid rgba(255,255,255,.13);touch-action:none;z-index:2}
#spcStick div{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px;border-radius:16px;background:linear-gradient(180deg,#2a2f38,#0c0e12);border:1px solid rgba(56,228,208,.7);box-shadow:0 0 14px rgba(56,228,208,.3)}
#spcBtns{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(3,64px);gap:8px;z-index:2}
#spcBtns button{width:64px;height:64px;padding:0;border-radius:12px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#e3edf1;font:800 10px/1.1 var(--f-disp,system-ui);letter-spacing:.08em;text-transform:uppercase;touch-action:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 6px 14px rgba(0,0,0,.5)}
#spcBtns button b{display:block;font-size:20px;margin-bottom:3px;letter-spacing:0}#spcBtns button:active,#spcBtns button.hold{border-color:#38e4d0;box-shadow:0 0 14px rgba(56,228,208,.45)}#spcBtns button.pri{border-color:rgba(56,228,208,.8);color:#38e4d0}#spcBtns button[hidden]{display:none}
#spcFlash{position:fixed;inset:0;z-index:39;background:#fff;opacity:0;pointer-events:none;transition:opacity .5s}#spcDark{position:fixed;inset:0;z-index:38;background:#000;opacity:0;pointer-events:none}
`;document.head.appendChild(s)},
  buildHud(){const d=document.createElement('div');d.id='spc';d.hidden=true;
    d.innerHTML=`<div id="spcLook"></div><div id="spcInfo"><b id="spcMode">Space</b><span id="spcSpd"></span><span id="spcAlt"></span><i><u id="spcThr"></u></i></div><div id="spcMsg"></div><div id="spcStick"><div></div></div>
    <div id="spcBtns"><button data-k="thrUp"><b>▲</b>Throttle</button><button data-k="full"><b>⚡</b>Full</button><button data-k="thrDn"><b>▼</b>Throttle</button>
    <button data-k="rollL"><b>↺</b>Roll</button><button data-k="brake"><b>■</b>Brake</button><button data-k="rollR"><b>↻</b>Roll</button>
    <button data-k="station"><b>🛰</b>Station</button><button data-k="act" class="pri" id="spcAct"><b>⬇</b>Land</button><button data-k="quit"><b>🌍</b>Earth</button></div>`;
    const fl=document.createElement('div');fl.id='spcFlash';const dk=document.createElement('div');dk.id='spcDark';document.body.append(d,fl,dk);this.el=d;
    const I=this.in,hold={thrUp:()=>I.thr=1,thrDn:()=>I.thr=-1,full:()=>I.full=1,brake:()=>I.brake=1,rollL:()=>I.roll=1,rollR:()=>I.roll=-1},rel={thrUp:()=>I.thr=0,thrDn:()=>I.thr=0,full:()=>I.full=0,brake:()=>I.brake=0,rollL:()=>I.roll=0,rollR:()=>I.roll=0};
    d.querySelectorAll('#spcBtns button').forEach(b=>{const k=b.dataset.k;
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();b.classList.add('hold');if(hold[k])hold[k]();else this.button(k)});
      const up=()=>{b.classList.remove('hold');if(rel[k])rel[k]()};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
    const st=d.querySelector('#spcStick'),kn=st.firstElementChild;let sid=null;
    const mv=e=>{const r=st.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2),l=Math.hypot(x,y),k=l>1?1/l:1;I.lx=x*k;I.ly=-y*k;kn.style.transform=`translate(${x*k*44}px,${y*k*44}px)`};
    st.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();sid=e.pointerId;try{st.setPointerCapture(sid)}catch(x){}mv(e)});st.addEventListener('pointermove',e=>{if(e.pointerId===sid)mv(e)});
    const end=e=>{if(e.pointerId===sid){sid=null;I.lx=I.ly=0;kn.style.transform=''}};st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
    const lk=d.querySelector('#spcLook');let lid=null,lx=0,ly=0;lk.addEventListener('pointerdown',e=>{lid=e.pointerId;lx=e.clientX;ly=e.clientY;try{lk.setPointerCapture(lid)}catch(x){}});
    lk.addEventListener('pointermove',e=>{if(e.pointerId!==lid)return;this.look(e.clientX-lx,e.clientY-ly);lx=e.clientX;ly=e.clientY});const le=e=>{if(e.pointerId===lid)lid=null};lk.addEventListener('pointerup',le);lk.addEventListener('pointercancel',le);
    lk.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY)},{passive:false})},
  key(e,dn){if(!this.on)return;const I=this.in,k=e.code;let h=true;
    if(k==='KeyW'||k==='ArrowUp')I.ky=dn?1:(I.ky===1?0:I.ky);else if(k==='KeyS'||k==='ArrowDown')I.ky=dn?-1:(I.ky===-1?0:I.ky);else if(k==='KeyA'||k==='ArrowLeft')I.kx=dn?-1:(I.kx===-1?0:I.kx);else if(k==='KeyD'||k==='ArrowRight')I.kx=dn?1:(I.kx===1?0:I.kx);
    else if(k==='KeyQ')I.roll=dn?1:0;else if(k==='KeyE'&&this.mode!=='moon')I.roll=dn?-1:0;else if(k==='ShiftLeft'||k==='ShiftRight')I.thr=dn?1:0;else if(k==='ControlLeft'||k==='ControlRight')I.thr=dn?-1:0;
    else if(k==='KeyX'||k==='KeyB')I.brake=dn?1:0;else if(k==='KeyZ')I.full=dn?1:0;else if(k==='Space')I.jump=dn?1:0;else if((k==='KeyF'||k==='KeyE')&&dn)this.button('act');else if(k==='KeyR'&&dn)this.button('station');else if(k==='Escape'&&dn)this.button('quit');else h=false;
    if(h){e.preventDefault();e.stopPropagation()}},
  msg(t,s,ms){const m=document.getElementById('spcMsg');if(!m)return;m.innerHTML=t+(s?'<small>'+s+'</small>':'');clearTimeout(this._mt);if(ms)this._mt=setTimeout(()=>{m.innerHTML=''},ms)},
  flash(a,ms){const f=document.getElementById('spcFlash');if(!f)return;f.style.transition='opacity '+(ms||500)+'ms';f.style.opacity=a},
  rumble(l){try{if(typeof AUD==='undefined'||!AUD.ok||!AUD.ctx)return;if(!this._rm){const c=AUD.ctx,s=c.createBufferSource();s.buffer=AUD.noise;s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=200;const g=c.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AUD.master||c.destination);s.start();this._rm={s,f,g}}
    const T=AUD.ctx.currentTime;this._rm.g.gain.setTargetAtTime(l*.55,T,.25);this._rm.f.frequency.setTargetAtTime(150+l*600,T,.3)}catch(e){}},
  setHud(mode){const lab={ascent:'Space Shuttle · automatic ascent',fly:'Space fighter',eva:'Spacewalk',moon:'On the Moon',landed:'Landed on the Moon',atmo:'Space fighter · atmosphere'}[mode]||mode;document.getElementById('spcMode').textContent=lab;
    const sh=(k,v)=>{const b=document.querySelector('#spcBtns [data-k="'+k+'"]');if(b)b.hidden=!v},fly=mode==='fly'||mode==='atmo';
    sh('thrUp',fly||mode==='landed');sh('thrDn',fly);sh('full',fly||mode==='landed');sh('rollL',fly);sh('rollR',fly);sh('brake',fly);sh('station',mode==='fly'||mode==='eva'||mode==='moon'||mode==='landed'||mode==='ascent');const sb=document.querySelector('#spcBtns [data-k="station"]');if(sb)sb.innerHTML=mode==='ascent'?'<b>⏩</b>Skip':'<b>🛰</b>Station';const stk=document.getElementById('spcStick');if(stk)stk.style.display=mode==='ascent'?'none':'';sh('act',mode!=='ascent'&&mode!=='atmo');sh('quit',true);
    const a=document.getElementById('spcAct');if(a){const t={fly:['⬇','Land'],landed:['🚪','Exit'],eva:['🚀','Board'],moon:['⇱','Jump']}[mode]||['',''];a.innerHTML='<b>'+t[0]+'</b>'+t[1]}},
  button(k){if(k==='quit')return this.leave();if(this.mode==='ascent'){if(k==='station')this.A.t=Math.max(this.A.t,this.P.ascentT-1);return}
    if(k==='act')return this.act();if(k==='station')return this.toStation()},
  // ---------------------------------------------------------------------------------------------- start / leave
  begin(mode){this.on=true;this.mode=mode;document.body.classList.add('spc');this.el.hidden=false;this.setHud(mode);this.cam0={near:camera.near,far:camera.far,fov:camera.fov};this._pv=PLR&&PLR.root.visible;if(PLR)PLR.root.visible=false;
    const I=this.in;I.px=I.py=I.roll=I.thr=I.full=I.brake=I.jump=I.lx=I.ly=I.kx=I.ky=0},
  leave(){if(!this.on)return;const wasSpace=this.space;this.on=false;this.space=false;this.atmo=false;this.mode='off';document.body.classList.remove('spc');this.el.hidden=true;this.msg('');this.rumble(0);
    document.getElementById('spcDark').style.opacity=0;this.flash(0,300);
    if(this.cam0){camera.near=this.cam0.near;camera.far=this.cam0.far;camera.fov=this.cam0.fov;camera.updateProjectionMatrix()}
    if(typeof sky!=='undefined'){sky.visible=true}if(this._fogD!==undefined&&scene.fog){scene.fog.density=this._fogD;this._fogD=undefined}
    if(this.fly){scene.remove(this.fly);this.fly=null}if(this.stk)this.stk.visible=true;if(this.debris){for(const d of this.debris)scene.remove(d.o);this.debris=[]}if(this.smoke){for(const s of this.smoke)s.s.visible=false}
    if(PLR&&PLR.root){if(PLR.root.parent!==scene){PLR.root.parent&&PLR.root.parent.remove(PLR.root);scene.add(PLR.root)}PLR.root.scale.setScalar(1);PLR.root.visible=true}
    if(wasSpace||this.A){const p=PLACES.find(q=>q.id==='spacepad');if(p)teleportRaw(p.x,p.z,p.yaw)}this.A=null;
    toast('Back on Earth','the launch pad')},
});
// ==================================================================================================== launch: the shuttle flies itself
Object.assign(SPC,{
  flameMesh(r,len,col,op){const g=new THREE.ConeGeometry(r,len,14,1,true);g.rotateX(Math.PI);g.translate(0,-len/2,0);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));m.frustumCulled=false;return m},
  smokeTex(){if(this._st)return this._st;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.5,'rgba(235,235,235,.45)');g.addColorStop(1,'rgba(220,220,220,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return this._st=new THREE.CanvasTexture(c)},
  launch(){if(!this.stk||this.on)return;this.begin('ascent');this.atmo=true;const P=this.pad,A=this.A={t:-10,cn:99,sep1:0,sep2:0,h:0,B0:new THREE.Vector3(P.x,P.top+.3,P.z),dir:new THREE.Vector3(P.bow[0],0,P.bow[1]),fl:[],emit:0,done:0};
    this.load('stack').then(s=>{if(!this.on||this.mode!=='ascent')return;const g=new THREE.Group(),m=s.clone(true);g.add(m);g.position.copy(A.B0);g.rotation.y=Math.PI/2;scene.add(g);this.fly=g;this.stk.visible=false;A.m=m;A.q0=g.quaternion.clone();
      A.parts={};for(const n of ['srb_l','srb_r','tank','orbiter'])A.parts[n]=m.getObjectByName(n);
      const N=this.nozzle||{};const add=(n,r,len,x,y,z)=>{const o=new THREE.Group();o.position.set(x,y,z);o.add(this.flameMesh(r,len,0xff9a3a,.8),this.flameMesh(r*.55,len*.7,0xfff2c0,.95));g.add(o);o.visible=false;A.fl.push({o,n,len});return o};
      if(N.srb_l){add('srb_l',2.6,34,N.srb_l.x,N.srb_l.y,N.srb_l.z);add('srb_r',2.6,34,N.srb_r.x,N.srb_r.y,N.srb_r.z)}
      if(N.orbiter){for(const [dx,dy] of [[0,1.4],[-2.4,-.5],[2.4,-.5]])add('orbiter',1.1,16,N.orbiter.x+dx,N.orbiter.y+dy+.5,N.orbiter.z)}
      A.sm=this.smoke||(this.smoke=Array.from({length:150},()=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.smokeTex(),transparent:true,depthWrite:false,opacity:0,fog:true}));s.visible=false;scene.add(s);return {s,life:0,ttl:1,v:new THREE.Vector3(),sz:1}}));
      this.msg('Space Shuttle Atlantis','countdown',2500)}).catch(e=>{console.warn('[space] launch',e);this.leave()})},
  emit(p,n,v,sz0,sz1,ttl){for(let k=0;k<n;k++){const s=this.smoke.find(q=>q.life<=0);if(!s)return;s.life=s.ttl=ttl*(.7+Math.random()*.6);s.sz0=sz0;s.sz1=sz1;s.s.position.copy(p).add(new THREE.Vector3((Math.random()-.5)*3,(Math.random()-.5)*2,(Math.random()-.5)*3));s.v.copy(v).multiplyScalar(.4).add(new THREE.Vector3((Math.random()-.5)*6,(Math.random()-.5)*2,(Math.random()-.5)*6));s.s.visible=true}},
  ascent(dt){const A=this.A;if(!A||!A.m){return}A.t+=dt;A.fc=(A.fc||0)+1;const t=A.t,T=this.P.ascentT,fl=this.fly,P=this.pad,up=new THREE.Vector3(0,1,0);
    if(t<0){const n=Math.ceil(-t);if(n!==A.cn){A.cn=n;if(n<=10)this.msg(String(n),'',1100)}}
    if(t>-3&&!A.ign){A.ign=1;for(const f of A.fl)f.o.visible=true;this.msg('Ignition','',1500)}
    if(t>=0&&!A.lift){A.lift=1;this.msg('Lift-off','',2000)}
    const tt=Math.max(0,t),h=100000*Math.pow(Math.min(tt,T)/T,2.2)+(tt<0?0:0),dd=Math.min(3500,h*.035),phi=Math.min(1.2,Math.max(0,(tt-6)*.016)*(1+tt*.01)),A2=A;A2.h=h;
    fl.position.copy(A.B0).addScaledVector(up,h).addScaledVector(A.dir,dd);
    const ax=new THREE.Vector3(A.dir.z,0,-A.dir.x);fl.quaternion.setFromAxisAngle(ax,phi).multiply(A.q0);
    // flames: thrust level, flicker, boosters cut at separation
    const thr=t<-3?0:(t<0?.45+.1*Math.sin(t*40):1),k=thr*(.88+.2*Math.random());for(const f of A.fl){f.o.scale.set(1,k*(f.n==='orbiter'?(A.sep2?1:.7):1),1);if(f.n!=='orbiter'&&A.sep1)f.o.visible=false}
    this.rumble(t<-3?0:(t<0?.3+(t+3)*.1:Math.min(1,.9)*(h>60000?Math.max(0,1-(h-60000)/30000):1)));
    // smoke trail from the nozzles (world position) while the air is thick
    if(t>-3&&h<45000){A.emit+=dt*(t<0?25:60);while(A.emit>=1){A.emit--;for(const f of A.fl){if(f.n==='orbiter')continue;if(A.sep1)continue;const w=f.o.getWorldPosition(new THREE.Vector3());this.emit(w,1,new THREE.Vector3(0,t<0?-.5:-8,0).addScaledVector(A.dir,-4),6,t<0?60:34,t<0?6:9)}}}
    for(const s of this.smoke){if(s.life>0){s.life-=dt;const a=1-s.life/s.ttl;s.s.position.addScaledVector(s.v,dt);s.s.scale.setScalar(s.sz0+(s.sz1-s.sz0)*a);s.s.material.opacity=Math.max(0,.5*(1-a)*Math.min(1,a*6));if(s.life<=0)s.s.visible=false}}
    // booster separation (T+40): they drift apart, tumble and fall; the tank is dropped at T+80
    if(t>40&&!A.sep1){A.sep1=1;this.msg('Booster separation','',2500);this.shed('srb_l',-1);this.shed('srb_r',1);this.emit(fl.position.clone(),14,new THREE.Vector3(),8,50,3)}
    if(t>80&&!A.sep2){A.sep2=1;this.msg('Main engine cut-off','tank separation',2500);this.shed('tank',0)}
    this.debrisStep(dt);
    // the sky: the atmosphere thins out; at 45 km the sky is switched off and we see the sea from space
    const dk=document.getElementById('spcDark'),ds=THREE.MathUtils.smoothstep(h,22000,44000);if(h<46000)dk.style.opacity=String(Math.min(1,ds)*.97);
    if(h>=46000&&!A.space){A.space=1;if(typeof sky!=='undefined')sky.visible=false;if(typeof nightSky!=='undefined')nightSky.visible=false;if(scene.fog){this._fogD=scene.fog.density;scene.fog.density=0}dk.style.transition='opacity 1.6s';dk.style.opacity=0}
    document.getElementById('spcSpd').textContent=Math.round(h<1?tt*3:(100000*2.2*Math.pow(Math.min(tt,T)/T,1.2)/T)*3.6)+' km/h';document.getElementById('spcAlt').textContent='Altitude '+(h>=1000?(h/1000).toFixed(1)+' km':Math.round(h)+' m');document.getElementById('spcThr').style.width=(thr*100)+'%';
    // camera: fixed on the ground for the first seconds, then a slow orbit around the stack
    const p=fl.position,a=tt*.05+.6,R=tt<4?150:95+Math.min(60,tt);let cx,cy,cz;
    if(tt<3){cx=A.B0.x+Math.cos(a)*150;cy=A.B0.y+12;cz=A.B0.z+Math.sin(a)*150;camera.position.set(cx,cy,cz);camera.lookAt(p.x,p.y+24+h*.4,p.z)}
    else{const k=Math.min(1,(tt-3)/3);cx=p.x+Math.cos(a)*R;cy=p.y-12+14*(1-k);cz=p.z+Math.sin(a)*R;if(!A.cp)A.cp=new THREE.Vector3(cx,cy,cz);A.cp.lerp(new THREE.Vector3(cx,cy,cz),A.snap?1:Math.min(1,dt*(k<1?2:6)));A.snap=0;camera.position.copy(A.cp);camera.lookAt(p.x,p.y+8,p.z)}   // my own smoothed camera: the game resets camera.position every frame
    camera.near=.5;camera.far=60000;camera.fov=60;camera.updateProjectionMatrix();player.x=A.B0.x;player.z=A.B0.z;player.vx=player.vz=0;
    if(t>=this.P.ascentT&&!A.done){A.done=1;this.flash(1,500);this.msg('Orbit','',2500);setTimeout(()=>{if(this.on)this.enterSpace('shuttle')},650)}},
  shed(name,side){const A=this.A,o=A.parts[name];if(!o)return;scene.attach(o);const v=new THREE.Vector3().copy(A.dir).multiplyScalar(30).add(new THREE.Vector3(0,40,0));const ax=new THREE.Vector3(A.dir.z,0,-A.dir.x);
    v.addScaledVector(ax,side*14);(this.debris=this.debris||[]).push({o,v,w:new THREE.Vector3((Math.random()-.5)*.4,(Math.random()-.5)*.2,side*.25+(Math.random()-.5)*.2),t:0})},
  debrisStep(dt){if(!this.debris)return;for(const d of this.debris){d.t+=dt;d.v.y-=22*dt;d.o.position.addScaledVector(d.v,dt);d.o.rotateX(d.w.x*dt);d.o.rotateY(d.w.y*dt);d.o.rotateZ(d.w.z*dt);if(d.t>16)d.o.visible=false}},
  // ---------------------------------------------------------------------------------------------- the fighter in the atmosphere
  board(){if(this.on||!this.fgt||!this.fgtMesh)return;this.begin('atmo');this.atmo=true;const m=this.fgtMesh;this.C={w:{x:m.position.x,y:m.position.y,z:m.position.z},q:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.fgt.yaw),sp:0,thr:0,cq:null};
    this.msg('Space fighter','throttle up and climb: the Moon is far away',3200)},
  frameAtmo(dt){if(this.mode==='ascent')return this.ascent(dt);if(this.mode!=='atmo'||!this.C)return;const C=this.C,alt=C.w.y-SL;this.flyStep(dt,true,alt);
    const gh=Math.max(groundH(C.w.x,C.w.z),SL);if(C.w.y<gh+3.5){C.w.y=gh+3.5;if(C.q){const f=new THREE.Vector3(0,0,1).applyQuaternion(C.q);if(f.y<0){f.y=0;f.normalize();C.q.setFromUnitVectors(new THREE.Vector3(0,0,1),f)}}C.sp*=.98}
    const m=this.fgtMesh;m.position.set(C.w.x,C.w.y,C.w.z);m.quaternion.copy(C.q);this.camFollow(dt,camera,C,0);player.x=C.w.x;player.z=C.w.z;player.y=C.w.y;player.vx=player.vz=0;
    camera.near=.5;camera.far=60000;camera.fov=72;camera.updateProjectionMatrix();
    if(alt>80000){this.flash(1,450);this.msg('Leaving the atmosphere','',2500);this.mode='transit';setTimeout(()=>{if(this.on)this.enterSpace('fighter',C)},520)}},
  // arcade 6-DOF flight shared by the atmosphere and space: pitch / yaw / roll from the stick, throttle (hold) -> speed
  flyStep(dt,atmo,alt){const C=this.C,I=this.in,q=C.q,ST=I.lx||I.kx||0,sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0);
    const e=new THREE.Euler(sy*1.05*dt,-sx*.9*dt,I.roll*1.5*dt,'XYZ');q.multiply(new THREE.Quaternion().setFromEuler(e)).normalize();
    if(I.full)C.thr=1;else C.thr=Math.min(1,Math.max(0,C.thr+I.thr*dt*(atmo?.5:.35)));
    let vmax=atmo?Math.min(this.P.vmax,90+Math.max(0,alt)*.032):this.P.vmax;if(this.limit)vmax=Math.min(vmax,this.limit);const tgt=I.brake?0:C.thr*vmax,acc=atmo?170:5200;
    C.sp+=Math.max(-acc*(I.brake?3:1.4)*dt,Math.min(acc*dt,tgt-C.sp));if(this.limit&&C.sp>this.limit)C.sp+=(this.limit-C.sp)*Math.min(1,dt*3);
    const f=new THREE.Vector3(0,0,1).applyQuaternion(q);C.w.x+=f.x*C.sp*dt;C.w.y+=f.y*C.sp*dt;C.w.z+=f.z*C.sp*dt;C.f=f;
    document.getElementById('spcSpd').textContent=(atmo?Math.round(C.sp*3.6)+' km/h':Math.round(C.sp).toLocaleString('en')+' m/s');document.getElementById('spcThr').style.width=(C.thr*100)+'%'},
  camFollow(dt,cam,C,sp){if(!C.cq)C.cq=C.q.clone();C.cq.slerp(C.q,1-Math.exp(-dt*5));const off=new THREE.Vector3(0,5.5,-27-Math.min(14,C.sp/1200)).applyQuaternion(C.cq);cam.position.set(C.w.x+off.x-(sp?sp.x:0),C.w.y+off.y-(sp?sp.y:0),C.w.z+off.z-(sp?sp.z:0));
    cam.quaternion.copy(C.cq).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI));cam.rotateX(-.07)},
});
// ==================================================================================================== the space scene
Object.assign(SPC,{
  noise2(seed){const h=(x,y)=>{let n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n)};return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return h(xi,yi)*(1-u)*(1-v)+h(xi+1,yi)*u*(1-v)+h(xi,yi+1)*(1-u)*v+h(xi+1,yi+1)*u*v}},
  earthTex(){const W=1024,H=512,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),im=x.createImageData(W,H),n=this.noise2(3.1),n2=this.noise2(9.7);
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){const u=i/W,v=j/H;let f=0,a=1,s=4,t=0;for(let o=0;o<5;o++){f+=a*n(u*s*2+o*5.3,v*s+o*1.7);t+=a;a*=.5;s*=2}f/=t;const lat=Math.abs(v-.5)*2,land=f>.5+lat*.06;let r,g,b;
      if(land){const e=(f-.5)*4,dry=n2(u*40,v*20);r=60+e*60+dry*60;g=110+e*40-dry*30;b=50+e*20;if(lat>.75||dry>.78&&lat>.5){r=g=b=235}}else{const d=Math.min(1,(.5-f)*5);r=14;g=60+20*(1-d);b=120+40*(1-d)}
      if(lat>.88){r=g=b=240}const k=(j*W+i)*4;im.data[k]=r;im.data[k+1]=g;im.data[k+2]=b;im.data[k+3]=255}
    x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=THREE.RepeatWrapping;return t},
  cloudTex(){const W=1024,H=512,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),im=x.createImageData(W,H),n=this.noise2(17.2);
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){const u=i/W,v=j/H;let f=0,a=1,s=6,t=0;for(let o=0;o<5;o++){f+=a*n(u*s*2+o*3.3,v*s+o*8.1);t+=a;a*=.55;s*=2}f/=t;const al=Math.max(0,Math.min(1,(f-.5)*3.2)),k=(j*W+i)*4;im.data[k]=im.data[k+1]=im.data[k+2]=255;im.data[k+3]=al*235}
    x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;return t},
  async buildSpace(){if(this.built)return;const P=this.P,sc=this.sc=new THREE.Scene();sc.background=new THREE.Color(0x000000);this.reg=[];const reg=(o,w)=>{o.userData.w=w;this.reg.push(o);sc.add(o);return o};
    const S=this.S=new THREE.Vector3(-.55,.25,.8).normalize();
    const sun=this.sun=new THREE.DirectionalLight(0xfff4e2,2.5);sc.add(sun,sun.target);sc.add(new THREE.AmbientLight(0x3a4560,.6));sc.add(new THREE.HemisphereLight(0x6a8cc0,0x050508,.18));
    // stars (fixed to the camera), the sun disc
    const N=5000,pos=new Float32Array(N*3),col=new Float32Array(N*3);for(let i=0;i<N;i++){const u=Math.random()*2-1,a=Math.random()*6.2832,r=Math.sqrt(1-u*u),R=3e7;pos.set([r*Math.cos(a)*R,u*R,r*Math.sin(a)*R],i*3);const b=.35+Math.pow(Math.random(),3)*.65,tint=Math.random();col.set([b*(.85+.15*tint),b*.92,b*(1-.15*tint)],i*3)}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));sg.setAttribute('color',new THREE.BufferAttribute(col,3));const stars=new THREE.Points(sg,new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,depthWrite:false,fog:false}));stars.frustumCulled=false;stars.renderOrder=-10;sc.add(stars);this.stars=stars;
    {const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'rgba(255,255,240,1)');g.addColorStop(.12,'rgba(255,245,210,.95)');g.addColorStop(.3,'rgba(255,220,150,.25)');g.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=g;x.fillRect(0,0,128,128);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));sp.scale.setScalar(5e6);sp.renderOrder=-9;this.sunSp=sp;sc.add(sp)}
    // Earth (below the station), a cloud shell, an atmosphere rim
    const Re=P.earthR,E=this.E=new THREE.Vector3(0,-(Re+9e4),0),eg=new THREE.SphereGeometry(1,220,110);
    const earth=new THREE.Mesh(eg,new THREE.MeshStandardMaterial({map:this.earthTex(),roughness:.95,metalness:0}));earth.scale.setScalar(Re);reg(earth,E);this.earth=earth;
    const cl=new THREE.Mesh(new THREE.SphereGeometry(1,160,80),new THREE.MeshStandardMaterial({map:this.cloudTex(),transparent:true,depthWrite:false,roughness:1}));cl.scale.setScalar(Re*1.006);reg(cl,E);this.clouds=cl;
    const at=new THREE.Mesh(new THREE.SphereGeometry(1,120,60),new THREE.ShaderMaterial({uniforms:{},vertexShader:'varying vec3 n,v;void main(){n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 n,v;void main(){float f=pow(1.-max(dot(n,v),0.),2.6);gl_FragColor=vec4(.35,.62,1.,f*.85);}',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));at.scale.setScalar(Re*1.05);reg(at,E);
    this.status('Loading space…');const [moon,iss,fg]=await Promise.all([this.load('moon'),this.load('iss'),this.load('fighter')]);
    const mm=moon.clone(true),M=this.M=new THREE.Vector3(.62,.28,-.73).normalize().multiplyScalar(P.moonD);mm.scale.setScalar(P.moonR);reg(mm,M);this.moonM=mm;mm.traverse(o=>{if(o.isMesh)o.material.side=THREE.FrontSide});
    const im=iss.clone(true);reg(im,new THREE.Vector3(0,0,0));this.issM=im;
    const sm=this.shipMesh=fg.clone(true);sc.add(sm);
    // a patch of dust round the ship for the feeling of speed
    const dN=260,dp=new Float32Array(dN*3);this.dust=[];for(let i=0;i<dN;i++){this.dust.push(new THREE.Vector3((Math.random()-.5)*700,(Math.random()-.5)*700,(Math.random()-.5)*700))}
    const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));this.dustPts=new THREE.Points(dg,new THREE.PointsMaterial({color:0xcfe8ff,size:2.2,sizeAttenuation:false,transparent:true,opacity:.0,depthWrite:false,fog:false}));this.dustPts.frustumCulled=false;sc.add(this.dustPts);
    this.cam=new THREE.Vector3();this.built=true},
  status(t){this.msg(t,'')},
  async enterSpace(from,C0){await this.buildSpace();this.msg('');const wasAtmo=this.atmo;this.atmo=false;this.space=true;this.on=true;
    if(typeof sky!=='undefined')sky.visible=true;if(typeof nightSky!=='undefined')nightSky.visible=true;if(this._fogD!==undefined&&scene.fog){scene.fog.density=this._fogD;this._fogD=undefined}document.getElementById('spcDark').style.opacity=0;
    if(this.fly){scene.remove(this.fly);this.fly=null}if(this.stk)this.stk.visible=true;if(this.debris){for(const d of this.debris)scene.remove(d.o);this.debris=[]}if(this.smoke)for(const s of this.smoke)s.s.visible=false;this.rumble(0);
    camera.near=.2;camera.far=6e7;camera.fov=65;camera.updateProjectionMatrix();
    this.V={yaw:0,pitch:.25,dist:7};this.A=null;
    if(from==='fighter'&&C0){this.C={w:new THREE.Vector3(0,40,-420),q:C0.q.clone(),sp:Math.min(C0.sp,600),thr:Math.min(1,C0.thr),cq:null};this.shipMesh.visible=true;this.begin('fly');this.setHud('fly');this.msg('Space','the Moon is far away: set full throttle',3500)}
    else{this.C={w:new THREE.Vector3(70,6,-38),q:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),2.6),sp:0,thr:0,cq:null};this.shipMesh.position.set(0,0,0);this.shipMesh.visible=true;
      this.startEva(new THREE.Vector3(36,3,-96));this.msg('Spacewalk','the station is next to you · the fighter is parked beside it',4500)}
    this.flash(0,900);document.getElementById('spc').hidden=false},
  // ---------------------------------------------------------------------------------------------- astronaut (EVA) and the frame loop
  startEva(w){this.mode='eva';this.E1={w:w.clone(),v:new THREE.Vector3(),yaw:0};this.setHud('eva');this.avatarIn(this.sc);this.in.thr=0;
    this.V.yaw=Math.atan2(w.x,w.z);this.V.pitch=.12},
  avatarIn(parent){if(!PLR||!PLR.root)return;if(PLR.root.parent!==parent){PLR.root.parent&&PLR.root.parent.remove(PLR.root);parent.add(PLR.root)}PLR.root.visible=true;PLR.root.scale.setScalar(1)},
  look(dx,dy){const V=this.V;if(!V||this.mode==='fly'||this.mode==='ascent')return;V.yaw-=dx*.006;V.pitch=Math.max(-1.2,Math.min(1.3,V.pitch+dy*.005))},
  zoom(d){if(this.V)this.V.dist=Math.max(2.5,Math.min(30,this.V.dist+d*.01))},
  place(o){const w=o.userData.w;o.position.set(w.x-this.cam.x,w.y-this.cam.y,w.z-this.cam.z)},
  frame(dt){if(!this.built||!this.C)return;this._fc=(this._fc||0)+1;const I=this.in,C=this.C,P=this.P;let alt=0,body='';
    if(this.mode==='fly'){const dM=C.w.distanceTo(this.M)-P.moonR,dE=C.w.distanceTo(this.E)-P.earthR;this.limit=0;
      if(dM<30000)this.limit=Math.max(14,14+dM*.06);if(dE<25000)this.limit=Math.max(30,30+dE*.04);
      this.flyStep(dt,false,0);
      if(dE<2500){const n=C.w.clone().sub(this.E).normalize();C.w.copy(this.E).addScaledVector(n,P.earthR+2500);C.sp*=.9;this.msg('Atmosphere','this is as low as the fighter goes: press Earth to go home',2500)}
      if(dM<=3){this.land(C.w.clone().sub(this.M).normalize());return}
      alt=dM<dE?dM:dE;body=dM<dE?'Moon':'Earth';this.shipMesh.position.set(0,0,0);this.camSpace(dt,C);
      this.shipMesh.position.set(C.w.x-this.cam.x,C.w.y-this.cam.y,C.w.z-this.cam.z);this.shipMesh.quaternion.copy(C.q)}
    else if(this.mode==='eva')this.evaStep(dt);
    else if(this.mode==='moon')this.moonStep(dt);
    else if(this.mode==='landed'){this.camLanded(dt)}
    // everything else is placed relative to the camera (floating origin: positions are doubles, the GPU only sees small numbers)
    const cam=this.cam;for(const o of this.reg)this.place(o);this.stars.position.set(0,0,0);this.sunSp.position.copy(this.S).multiplyScalar(4e7);this.sun.position.copy(this.S).multiplyScalar(1000);this.sun.target.position.set(0,0,0);
    this.earth.rotation.y+=dt*.004;this.clouds.rotation.y+=dt*.006;if(this.moonM)this.moonM.rotation.y+=dt*.001;if(this.issM)this.issM.rotation.y+=dt*.01;
    // speed dust
    const sp=this.mode==='fly'?C.sp:0;this.dustPts.material.opacity=Math.min(.9,sp/400);if(sp>5){const a=this.dustPts.geometry.attributes.position;for(let i=0;i<this.dust.length;i++){const d=this.dust[i];for(const k of ['x','y','z']){let r=d[k]-cam[k];if(r>350)d[k]-=700;else if(r<-350)d[k]+=700}a.setXYZ(i,d.x-cam.x,d.y-cam.y,d.z-cam.z)}a.needsUpdate=true}
    this.hud(alt,body);renderer.info.reset();renderer.render(this.sc,camera)},   // info.reset() advances the frame counter that makes three.js refresh the skeleton's bone texture (the game turns autoReset off),
  camSpace(dt,C){this.cam.set(C.w.x,C.w.y,C.w.z);if(!C.cq)C.cq=C.q.clone();C.cq.slerp(C.q,1-Math.exp(-dt*5));const off=new THREE.Vector3(0,6,-30-Math.min(40,C.sp/600)).applyQuaternion(C.cq);this.cam.add(off);
    camera.position.set(0,0,0);camera.quaternion.copy(C.cq).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI));camera.rotateX(-.08);camera.near=.3;camera.updateProjectionMatrix()},
  hud(alt,body){const a=document.getElementById('spcAlt');if(!a)return;if(this.mode==='fly'){const dM=(this.C.w.distanceTo(this.M)-this.P.moonR),f=d=>d>=1e6?(d/1e3).toLocaleString('en',{maximumFractionDigits:0})+' km':d>=1e3?(d/1e3).toFixed(1)+' km':Math.round(d)+' m';a.textContent='Moon '+f(dM)+' · '+(dM<this.C.w.distanceTo(this.E)-this.P.earthR?'':'Earth '+f(this.C.w.distanceTo(this.E)-this.P.earthR))}
    else if(this.mode==='moon'||this.mode==='landed')a.textContent='Gravity 1.62 m/s² · '+(this.mode==='moon'?'Distance to the ship '+Math.round(Math.hypot(this.W.x,this.W.z))+' m':'press Exit')},
  evaStep(dt){const E=this.E1,I=this.in,V=this.V,m=this.C.w;const sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0);
    const fw=new THREE.Vector3(-Math.sin(V.yaw)*Math.cos(V.pitch)*-1,-Math.sin(V.pitch)*-1,0);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(V.pitch,V.yaw,0,'YXZ'));
    // camera looks along its own -z; "forward" for the astronaut is where the camera looks
    const f=new THREE.Vector3(0,0,-1).applyQuaternion(q),r=new THREE.Vector3(1,0,0).applyQuaternion(q),u=new THREE.Vector3(0,1,0);
    // the astronaut is seen from behind: the camera sits behind him, so forward = away from the camera = -(camera offset)
    const acc=new THREE.Vector3().addScaledVector(f,sy*9).addScaledVector(r,sx*9).addScaledVector(u,(I.jump?1:0)*9-(I.thr<0?9:0)+(I.thr>0?9:0));
    E.v.addScaledVector(acc,dt);E.v.multiplyScalar(Math.exp(-dt*(I.brake?5:1.1)));if(E.v.length()>14)E.v.setLength(14);E.w.addScaledVector(E.v,dt);
    if(E.w.length()<30){E.w.setLength(30)}   // keep out of the station
    if(E.v.length()>.4){const yaw=Math.atan2(E.v.x,E.v.z);E.yaw+=((((yaw-E.yaw+Math.PI)%(2*Math.PI))+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*5)}
    const root=PLR.root;root.position.set(E.w.x,E.w.y,E.w.z);root.rotation.set(0,E.yaw,0);root.userData.w=E.w;this.avatarW(E.w);
    try{animPlayer(PLR,{spd:0,mode:'air'},dt)}catch(e){}
    // camera: orbit round the astronaut
    const off=new THREE.Vector3(0,0,V.dist).applyQuaternion(q);this.cam.copy(E.w).add(off).add(new THREE.Vector3(0,.9,0));camera.position.set(0,0,0);camera.quaternion.copy(q);camera.near=.1;camera.updateProjectionMatrix();
    root.position.set(E.w.x-this.cam.x,E.w.y-this.cam.y,E.w.z-this.cam.z);
    this.shipMesh.position.set(m.x-this.cam.x,m.y-this.cam.y,m.z-this.cam.z);this.shipMesh.quaternion.copy(this.C.q);
    document.getElementById('spcSpd').textContent=E.v.length().toFixed(1)+' m/s';document.getElementById('spcAlt').textContent='Station '+Math.round(E.w.length())+' m · ship '+Math.round(E.w.distanceTo(m))+' m';document.getElementById('spcThr').style.width='0%'},
  avatarW(){},
  // ---------------------------------------------------------------------------------------------- buttons
  act(){if(this.mode==='fly'){const dM=this.C.w.distanceTo(this.M)-this.P.moonR;if(dM<4000){this.limit=15;this.C.thr=0;this.msg('Landing assist','descend slowly: the speed is limited near the surface',2600)}else this.msg('Land','fly to the Moon first (it is far away)',2400);return}
    if(this.mode==='landed')return this.exitShip();if(this.mode==='eva'){if(this.E1.w.distanceTo(this.C.w)<40){this.mode='fly';this.setHud('fly');if(PLR)PLR.root.visible=false;this.msg('Space fighter','',1500)}else this.msg('Too far','fly closer to the fighter',2000);return}
    if(this.mode==='moon'){if(!this.M2.air){this.M2.vy=3.4;this.M2.air=true}return}},
  toStation(){if(!this.space)return;this.flash(1,350);setTimeout(()=>{this.C.w.set(70,6,-38);this.C.sp=0;this.C.thr=0;this.limit=0;this.C.q.setFromAxisAngle(new THREE.Vector3(0,1,0),2.6);this.C.cq=null;if(this.lg){this.lg.visible=false}this.shipMesh.visible=true;sc_attach(this);this.startEva(new THREE.Vector3(36,3,-96));this.flash(0,800);this.msg('Station','',1800)},380)},
});
function sc_attach(S){if(S.shipMesh.parent!==S.sc){S.shipMesh.parent&&S.shipMesh.parent.remove(S.shipMesh);S.sc.add(S.shipMesh)}S.shipMesh.scale.setScalar(1)}
// ==================================================================================================== the Moon: landing, a curved patch of regolith, walking in low gravity
Object.assign(SPC,{
  craters(seed){let s=seed>>>0;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296},a=[];for(let i=0;i<16;i++){const d=90+r()*1300,q=r()*6.2832;a.push({x:Math.cos(q)*d,z:Math.sin(q)*d,r:14+Math.pow(r(),2)*110})}return a},
  hgt(x,z){const Rm=this.P.moonR,r2=x*x+z*z,r=Math.sqrt(r2),fl=Math.min(1,Math.max(0,(r-10)/50)),n=this.pn,f=(a,b,sc)=>n(a/sc,b/sc)-.5;let h=-r2/(2*Rm);
    let d=5*f(x,z,150)+1.3*f(x+31,z-17,24)+.14*f(x-9,z+4,3.1);
    for(const c of this.cr){const q=Math.hypot(x-c.x,z-c.z)/c.r;if(q<1.5){if(q<1)d-=c.r*.16*(1-q*q);d+=c.r*.05*Math.exp(-Math.pow((q-1.04)/.17,2))}}
    return h+d*fl},
  land(n){const P=this.P;this.mode='landed';this.n=n.clone();this.L=this.M.clone().addScaledVector(n,P.moonR);this.qF=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),n);
    const f=new THREE.Vector3(0,0,1).applyQuaternion(this.C.q);f.addScaledVector(n,-f.dot(n));if(f.lengthSq()<1e-4)f.set(1,0,0).addScaledVector(n,-n.x);f.normalize();const lf=f.applyQuaternion(this.qF.clone().invert());this.yaw0=Math.atan2(lf.x,lf.z);
    this.pn=this.noise2(5.5+Math.abs(this.L.x%7));this.cr=this.craters((Math.abs(this.L.x)*13+Math.abs(this.L.z)*7)|0);
    if(this.lg){this.sc.remove(this.lg);this.reg=this.reg.filter(o=>o!==this.lg)}
    const lg=this.lg=new THREE.Group();lg.quaternion.copy(this.qF);lg.userData.w=this.L;this.reg.push(lg);this.sc.add(lg);
    // the patch: a polar grid, fine near the ship, coarse far away; exactly the Moon's curvature, so no seam can show
    const nR=96,nA=96,R0=2200,pos=[],col=[],uv=[],idx=[];pos.push(0,this.hgt(0,0),0);col.push(.7,.7,.7);uv.push(0,0);
    for(let i=1;i<=nR;i++){const r=R0*Math.pow(i/nR,2.2);for(let a=0;a<nA;a++){const q=a/nA*6.2832,x=Math.cos(q)*r,z=Math.sin(q)*r,y=this.hgt(x,z);pos.push(x,y,z);const sh=.62+Math.max(-.2,Math.min(.2,(y+r*r/(2*P.moonR))*.04))+(this.pn(x/9,z/9)-.5)*.14;col.push(sh,sh*.98,sh*.94);uv.push(x/5,z/5)}}
    for(let a=0;a<nA;a++){idx.push(0,1+((a+1)%nA),1+a)}for(let i=1;i<nR;i++)for(let a=0;a<nA;a++){const A=1+(i-1)*nA+a,B=1+(i-1)*nA+(a+1)%nA,C2=1+i*nA+a,D=1+i*nA+(a+1)%nA;idx.push(A,B,C2,B,D,C2)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const tx=this.regTex();const patch=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:tx,vertexColors:true,roughness:1,metalness:0}));patch.frustumCulled=false;patch.receiveShadow=true;lg.add(patch);
    const rk=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0x6f6a64,roughness:1,flatShading:true}),260),m4=new THREE.Matrix4(),qq=new THREE.Quaternion(),sc3=new THREE.Vector3(),p3=new THREE.Vector3();let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    for(let i=0;i<260;i++){const r=9+Math.pow(rnd(),1.6)*1300,q=rnd()*6.2832,x=Math.cos(q)*r,z=Math.sin(q)*r,k=.25+Math.pow(rnd(),3)*2.4;p3.set(x,this.hgt(x,z)+k*.25,z);qq.setFromEuler(new THREE.Euler(rnd()*3,rnd()*3,rnd()*3));sc3.set(k*(1+rnd()*.6),k*.7,k*(1+rnd()*.6));m4.compose(p3,qq,sc3);rk.setMatrixAt(i,m4)}
    rk.frustumCulled=false;lg.add(rk);
    const ship=this.shipMesh;ship.parent&&ship.parent.remove(ship);lg.add(ship);ship.position.set(0,0,0);ship.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),this.yaw0);ship.scale.setScalar(1);this.moonM.visible=false;
    this._lt=performance.now()+1500;this._rel=false;this.C.sp=0;this.C.thr=0;this.limit=0;this.V={yaw:.6,pitch:.3,dist:34};this.setHud('landed');this.msg('Touchdown','you are on the Moon · Exit to walk',3500)},
  regTex(){if(this._rt)return this._rt;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=x.createImageData(256,256),n=this.noise2(2.2);for(let j=0;j<256;j++)for(let i=0;i<256;i++){const v=170+ (n(i/6,j/6)-.5)*70+(n(i/1.7,j/1.7)-.5)*40,k=(j*256+i)*4;im.data[k]=v;im.data[k+1]=v*.97;im.data[k+2]=v*.93;im.data[k+3]=255}x.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return this._rt=t},
  lcam(target,dist){const V=this.V,cp=Math.cos(V.pitch),off=new THREE.Vector3(Math.sin(V.yaw)*cp,Math.sin(V.pitch),Math.cos(V.yaw)*cp).multiplyScalar(dist),ep=target.clone().add(off);const gy=this.hgt(ep.x,ep.z)+.6;if(ep.y<gy)ep.y=gy;
    const m=new THREE.Matrix4().lookAt(ep,target,new THREE.Vector3(0,1,0)),lq=new THREE.Quaternion().setFromRotationMatrix(m);this.cam.copy(ep).applyQuaternion(this.qF).add(this.L);camera.position.set(0,0,0);camera.quaternion.copy(this.qF).multiply(lq);camera.near=.1;camera.updateProjectionMatrix()},
  camLanded(dt){this.lcam(new THREE.Vector3(0,3,0),this.V.dist);const I=this.in;document.getElementById('spcSpd').textContent='0 m/s';document.getElementById('spcThr').style.width='0%';
    if(!I.thr&&!I.full)this._rel=true;if((I.thr>0||I.full)&&this._rel&&performance.now()>this._lt){// take off: back into the fighter, pointing away from the surface
      this.flash(0,0);const ship=this.shipMesh;ship.parent&&ship.parent.remove(ship);this.sc.add(ship);this.C.w.copy(this.L).addScaledVector(this.n,4);this.C.q.copy(this.qF).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),this.yaw0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-1.2));this.C.cq=null;this.C.sp=60;this.C.thr=.1;this.limit=0;
      if(this.lg)this.lg.visible=false;this.moonM.visible=true;this.mode='fly';this.setHud('fly');this.msg('Lift-off','',1800)}},
  exitShip(){this.mode='moon';this.M2={x:7,z:3,y:this.hgt(7,3),vy:0,air:false,yaw:-2};this.W=this.M2;this.avatarIn(this.sc);PLR.root.scale.setScalar(1);this.V={yaw:.5,pitch:.25,dist:6.5};this.setHud('moon');this._near=-1;this.msg('The Moon','walk with the stick · drag to look · jump is high here',3200)},
  moonStep(dt){const M=this.M2,I=this.in,V=this.V,Rm=this.P.moonR;const sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0),len=Math.hypot(sx,sy),kk=len>1?1/len:1,ix=sx*kk,iy=sy*kk,mag=Math.min(1,len);
    const f=[-Math.sin(V.yaw),-Math.cos(V.yaw)],r=[Math.cos(V.yaw),-Math.sin(V.yaw)],spd=(mag>.92||I.thr>0?5.6:3.3),vx=(f[0]*iy+r[0]*ix)*spd,vz=(f[1]*iy+r[1]*ix)*spd;
    M.x+=vx*dt;M.z+=vz*dt;const d=Math.hypot(M.x,M.z);if(d>1700){M.x*=1700/d;M.z*=1700/d}
    if(I.jump&&!M.air){M.vy=3.4;M.air=true}M.vy-=this.P.g*dt;M.y+=M.vy*dt;const gy=this.hgt(M.x,M.z);if(M.y<=gy){M.y=gy;M.vy=0;M.air=false}
    if(mag>.05){const yw=Math.atan2(vx,vz);M.yaw+=((((yw-M.yaw+Math.PI)%(2*Math.PI))+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*8)}
    const root=PLR.root;if(!this.noAnim)try{animPlayer(PLR,{spd:Math.hypot(vx,vz),mode:M.air?'air':'walk'},dt)}catch(e){if(!this._ae){this._ae=1;console.warn('[space] animPlayer',e)}}
    this.lcam(new THREE.Vector3(M.x,M.y+1.25,M.z),V.dist);
    // the astronaut lives in the scene root (a skinned body next to the camera behaves; inside the tilted local group it collapsed): place him by hand
    root.position.copy(this.L).sub(this.cam).add(new THREE.Vector3(M.x,M.y,M.z).applyQuaternion(this.qF));root.quaternion.copy(this.qF).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),M.yaw));
    const near=Math.hypot(M.x,M.z)<9?1:0;if(near!==this._near){this._near=near;const a=document.getElementById('spcAct');if(a)a.innerHTML=near?'<b>🚀</b>Board':'<b>⇱</b>Jump'}
    document.getElementById('spcSpd').textContent=Math.hypot(vx,vz).toFixed(1)+' m/s';document.getElementById('spcThr').style.width='0%'},
});
const _spcAct=SPC.act;SPC.act=function(){if(this.mode==='moon'&&Math.hypot(this.M2.x,this.M2.z)<9){this.mode='landed';this.setHud('landed');if(PLR)PLR.root.visible=false;this.V={yaw:.6,pitch:.3,dist:34};this.msg('Space fighter','press Throttle to take off',2200);return}return _spcAct.call(this)};
