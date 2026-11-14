// spaceint.js — sound and walkable interiors for the space programme (2026-11-14), an extension of space.js.
//   SOUND: one engine bus (low rumble + a saw sub + a roaring hiss) that follows the thrust of the shuttle's ascent and of the fighter, a room tone with soft beeps in the cabins, RCS hiss of the astronaut's thrusters,
//   suit breathing on the Moon, door hiss / clunk / thud one-shots. Inside a cabin everything is muffled (a low-pass).
//   INTERIORS: three procedural rooms - the ISS (a long module with racks, a cupola with a glass floor onto the Earth), the Space Shuttle (flight deck with four seats and windows, mid-deck lockers) and the Fighter 38
//   cabin (pilot seat, co-pilot, dash, cargo) - each hangs in space at its own place, so the windows show the real Earth, Moon and stars. Walk in first person (stick + drag to look).
//   Doors: the Enter button next to the station / the shuttle's orbiter / the fighter (spacewalk), or next to the fighter on the Moon; in the cabin the action button is Exit or Pilot seat (fighter).
Object.assign(SPC,{
  // ------------------------------------------------------------------------------------------------ sound
  sInit(){if(this._s)return true;if(typeof AUD==='undefined'||!AUD.ok||!AUD.ctx||!AUD.noise)return false;const c=AUD.ctx,out=c.createGain();out.gain.value=0;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=20000;out.connect(lp);lp.connect(AUD.master||c.destination);
    const nz=()=>{const s=c.createBufferSource();s.buffer=AUD.noise;s.loop=true;s.start();return s},chain=(src,type,f,q)=>{const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||.7;const g=c.createGain();g.gain.value=0;src.connect(fl);fl.connect(g);g.connect(out);return {fl,g}};
    const rum=chain(nz(),'lowpass',180),roar=chain(nz(),'bandpass',1500,.6),room=chain(nz(),'lowpass',260),rcs=chain(nz(),'highpass',2600);
    const so=c.createOscillator();so.type='sawtooth';so.frequency.value=50;const sf=c.createBiquadFilter();sf.type='lowpass';sf.frequency.value=190;const sg=c.createGain();sg.gain.value=0;so.connect(sf);sf.connect(sg);sg.connect(out);so.start();
    const ho=c.createOscillator();ho.type='sine';ho.frequency.value=118;const hg=c.createGain();hg.gain.value=0;ho.connect(hg);hg.connect(out);ho.start();
    this._s={c,out,lp,rum,roar,room,rcs,so,sg,hg,beep:0,step:0};return true},
  sTo(p,v,tc){try{p.setTargetAtTime(v,this._s.c.currentTime,tc||.12)}catch(e){}},
  sfx(kind,lv){if(!this.sInit())return;const S=this._s,c=S.c,T=c.currentTime,g=c.createGain(),dest=S.out;
    const burst=(type,f,q,dur,vol)=>{const s=c.createBufferSource();s.buffer=AUD.noise;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||.8;g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(vol,T+.02);g.gain.exponentialRampToValueAtTime(.001,T+dur);s.connect(fl);fl.connect(g);g.connect(dest);s.start(T,Math.random()*1.5);s.stop(T+dur+.05)};
    const tone=(f0,f1,dur,vol,type)=>{const o=c.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f0,T);o.frequency.exponentialRampToValueAtTime(f1,T+dur);g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(vol,T+.01);g.gain.exponentialRampToValueAtTime(.001,T+dur);o.connect(g);g.connect(dest);o.start(T);o.stop(T+dur+.05)};
    this.sTo(S.out.gain,Math.max(S.out.gain.value,.5),.02);
    if(kind==='hiss')burst('bandpass',4200,.7,.9,.5);else if(kind==='thud')tone(80,34,.35,.9,'sine');else if(kind==='beep'){tone(1180,1180,.11,.22,'sine')}else if(kind==='step')burst('lowpass',380,.8,.09,.45*(lv||1));
    else if(kind==='clunk'){tone(140,60,.14,.7,'square');burst('lowpass',900,.8,.12,.3)}},
  sndStop(){if(this._am){for(const k in this._am)try{AUD[k].gain.value=this._am[k]}catch(e){}this._am=null}if(!this._s)return;const S=this._s;for(const p of [S.out.gain,S.rum.g.gain,S.roar.g.gain,S.room.g.gain,S.rcs.g.gain,S.sg.gain,S.hg.gain])this.sTo(p,0,.2)},
  // called once per frame by space.js (frame / frameAtmo / ascent): the engine follows the thrust, the room tone follows the place
  sound(dt,lv){if(!this.sInit())return;const S=this._s,m=this.mode,I=this.in;let eng=0,rcs=0,room=0,breath=0,cut=20000,vol=.9,roar=0;
    if(typeof AUD!=='undefined'){if(!this._am){this._am={};for(const k of ['amb','mus','veh'])if(AUD[k]&&AUD[k].gain)this._am[k]=AUD[k].gain.value}for(const k in this._am)try{AUD[k].gain.value=0}catch(e){}}
    if(m==='ascent'){eng=lv===undefined?0:lv;roar=eng;vol=1}
    else if(m==='atmo'&&this.C){const C=this.C;eng=C.thr*(C.sp>1?1:.35);roar=Math.min(1,C.sp/450)*.8+eng*.2;vol=.9}
    else if(m==='fly'&&this.C){const C=this.C;eng=C.thr*.75;roar=C.thr*.35;vol=.7;cut=5200}
    else if(m==='landed'){room=.1;breath=0}
    else if(m==='eva'){const E=this.E1,a=Math.max(Math.abs(I.lx),Math.abs(I.ly),Math.abs(I.kx||0),Math.abs(I.ky||0),I.jump?1:0,Math.abs(I.thr))*(E&&E.v.length()<13.9?1:0);rcs=a*.34;room=.05;vol=.8}
    else if(m==='moon'){room=.06;vol=.8;const M=this.M2,sp=Math.hypot(I.lx||0,I.ly||0)||Math.abs(I.kx||0)||Math.abs(I.ky||0);if(M&&!M.air&&sp>.2){S.step-=dt*(I.thr>0?3.2:2.2);if(S.step<=0){S.step=1;this.sfx('step',.8)}}}
    else if(m==='interior'){room=.28;cut=900;vol=.9;S.beep-=dt;if(S.beep<=0){S.beep=7+Math.random()*9;if(this.IN&&this.IN.kind!=='fighter'){this.sfx('beep');setTimeout(()=>this.sfx('beep'),180)}}
      if(this.IN&&this.IN.kind==='fighter'){eng=.12;cut=700}}
    this.sTo(S.out.gain,m==='off'?0:vol,.15);this.sTo(S.lp.frequency,cut,.15);
    this.sTo(S.rum.g.gain,eng*.95,.1);this.sTo(S.rum.fl.frequency,120+eng*260,.1);this.sTo(S.sg.gain,eng*.32,.1);this.sTo(S.so.frequency,38+eng*55,.1);this.sTo(S.sg.gain,eng*.3,.1);
    this.sTo(S.roar.g.gain,roar*.5,.12);this.sTo(S.roar.fl.frequency,900+roar*1800,.15);this.sTo(S.rcs.g.gain,rcs,.05);
    this.sTo(S.room.g.gain,room,.3);this.sTo(S.hg.gain,m==='interior'?.025:0,.3)},
  rumble(l){this.sound(.016,l)},
});
// ==================================================================================================== interiors
Object.assign(SPC,{
  pods:{},
  podSpec:{iss:{at:[0,0,5200],title:'International Space Station'},shuttle:{at:[0,0,7400],title:'Space Shuttle Atlantis'},fighter:{at:[0,0,9600],title:'Fighter 38 · cabin'}},
  mkBox(g,w,h,d,x,y,z,col,o){o=o||{};const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:col,roughness:o.r===undefined?.65:o.r,metalness:o.m||0,emissive:o.e||0x000000,emissiveIntensity:o.ei||1}));m.position.set(x,y,z);g.add(m);if(o.solid){g.userData.obs.push({x0:x-w/2-.15,x1:x+w/2+.15,z0:z-d/2-.15,z1:z+d/2+.15})}return m},
  // a wall with a rectangular hole (a window): four slabs round it. axis 'z': a wall in the plane z=const, 'x': x=const, 'y': floor / ceiling
  wallHole(g,ax,pos,W,H,hx,hy,hw,hh,col,t){t=t||.2;const B=(w,h,d,x,y,z)=>this.mkBox(g,w,h,d,x,y,z,col);if(ax==='z'){const x0=-W/2,x1=W/2,y0=0,y1=H;B(hx-hw/2-x0,H,t,(x0+hx-hw/2)/2,H/2,pos);B(x1-(hx+hw/2),H,t,(x1+hx+hw/2)/2,H/2,pos);B(hw,hy-hh/2-y0,t,hx,(y0+hy-hh/2)/2,pos);B(hw,y1-(hy+hh/2),t,hx,(y1+hy+hh/2)/2,pos)}},
  buildPod(kind){const sp=this.podSpec[kind],g=new THREE.Group();g.userData.obs=[];g.userData.lights=[];const W={iss:[4.4,3.2,20],shuttle:[4.2,2.7,9.4],fighter:[2.8,2.3,6.4]}[kind],[w,h,d]=W,hw=w/2,hd=d/2;
    const wall=kind==='iss'?0xdfe3e6:kind==='shuttle'?0xcfd2d6:0x2b2f38,trim=kind==='fighter'?0x38e4d0:0x3b82f6,B=(...a)=>this.mkBox(g,...a),EM=(c)=>({e:c,ei:1.6});
    // floor, side walls, ceiling, back wall (the exit hatch), front wall with windows
    B(w,.2,d,0,-.1,0,kind==='fighter'?0x1b1e25:0x8d949c,{r:.9});B(.2,h,d,-hw-.1,h/2,0,wall);B(.2,h,d,hw+.1,h/2,0,wall);B(w,.2,d,0,h+.1,0,wall);B(w,h,.2,0,h/2,-hd-.1,wall);
    const front=kind==='iss'?[0,1.7,3,1.7]:kind==='shuttle'?[0,1.65,3.4,.9]:[0,1.5,2.5,1.2];this.wallHole(g,'z',hd+.1,w,h,front[0],front[1],front[2],front[3],wall);
    const hatch=new THREE.Mesh(new THREE.TorusGeometry(.62,.07,8,28),new THREE.MeshStandardMaterial({color:trim,emissive:trim,emissiveIntensity:.6}));hatch.position.set(0,1.1,-hd+.02);g.add(hatch);
    B(.9,1.7,.06,0,.95,-hd+.01,0x59616c,{m:.3});
    const lamp=(x,y,z,c,i)=>{const L=new THREE.PointLight(c||0xfff1dc,i||.9,12,1.6);L.position.set(x,y,z);g.add(L);B(.5,.06,.2,x,y+.12,z,0xffffff,EM(0xfff4e0))};
    if(kind==='iss'){
      // racks down both sides (with screens and switch panels), a cupola with a glass floor onto the Earth, ceiling lamps
      const cols=[0x2f6fb0,0xc0392b,0x38e4d0,0xf2a93a,0x6a5acd];for(let i=0;i<16;i++){const z=-8+i*1.0;if(Math.abs(z-6.4)<1.6)continue;for(const s of [-1,1]){B(.8,2.5,.92,s*(hw-.5),1.45,z,i%3?0xe9ecef:0xc9ced3,{solid:true});B(.04,.35,.6,s*(hw-.9),1.6+((i*7)%5)*.12,z,0x0b1018,EM(cols[(i+(s>0?2:0))%5]));B(.04,.5,.5,s*(hw-.9),.6,z,0x1c232c,{e:cols[(i*3)%5],ei:.5})}}
      for(const z of [-6,-2,2,6])lamp(0,h-.25,z);B(.9,.04,2.2,0,.01,6.4,0x70c8ff,{e:0x2a6a9a,ei:.2});   // the cupola floor: a strip of glass (the Earth is seen through the hole below)
      const gl=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.4),new THREE.MeshBasicMaterial({color:0x9fd2ff,transparent:true,opacity:.07,depthWrite:false}));gl.rotation.x=-Math.PI/2;gl.position.set(0,.02,6.4);g.add(gl);
      g.userData.spawn={x:0,z:-7.4,yaw:Math.PI};g.userData.bounds=[-hw+.3,hw-.3,-hd+.5,hd-.5];
    }else if(kind==='shuttle'){
      // flight deck: 2 pilot seats + 2 behind, dash with screens; mid-deck: lockers and a table; windows ahead and overhead
      const seat=(x,z)=>{B(.62,.14,.62,x,.52,z,0x2a2f3a,{solid:true});B(.62,.9,.12,x,1.0,z-.3,0x2a2f3a);B(.08,.4,.4,x-.35,.8,z,0x1c2028);B(.08,.4,.4,x+.35,.8,z,0x1c2028)};seat(-.8,2.4);seat(.8,2.4);seat(-.8,1.1);seat(.8,1.1);
      B(w-.4,.9,.7,0,.75,hd-.55,0x20242c,{solid:true});for(let i=0;i<5;i++)B(.55,.34,.04,-1.4+i*.7,1.28,hd-.9,0x061018,EM([0x38e4d0,0x3b82f6,0xf2a93a,0x38e4d0,0x4ade80][i]));
      for(let i=0;i<6;i++){for(const s of [-1,1])B(.4,1.1,.9,s*(hw-.25),.7+(i%2)*.0,-3.8+i*1.0,0xd7dade,{solid:true})}B(1.4,.08,.7,0,.78,-1.8,0xb9bec4);B(.1,.78,.1,0,.39,-1.8,0x59616c,{solid:true});
      for(const z of [-2.5,0,2.5])lamp(0,h-.2,z);
      const ow=B(1.2,.06,.8,0,h-.02,.3,0x9fd2ff,{e:0x2a6a9a,ei:.15});ow.material.transparent=true;ow.material.opacity=.15;   // an overhead window (glass, the sky above is seen through the open ceiling slab)
      g.userData.spawn={x:0,z:-3.6,yaw:Math.PI};g.userData.bounds=[-hw+.3,hw-.3,-hd+.5,hd-.5];
    }else{
      // fighter: two seats facing the canopy, a dash, cargo crates and a side bench in the back
      const seat=(x,z)=>{B(.62,.16,.64,x,.5,z,0x1d2128,{solid:true});B(.6,.95,.14,x,1.05,z-.32,0x1d2128);B(.08,.12,.5,x-.34,.8,z,0x38e4d0,EM(0x38e4d0));B(.08,.12,.5,x+.34,.8,z,0x38e4d0,EM(0x38e4d0))};seat(-.55,1.0);seat(.55,1.0);
      B(w-.2,.8,.7,0,.7,hd-.45,0x15181e,{solid:true});for(let i=0;i<4;i++)B(.5,.3,.04,-.9+i*.6,1.15,hd-.82,0x04100f,EM([0x38e4d0,0xf2a93a,0x3b82f6,0x38e4d0][i]));
      B(.9,.6,.8,-.8,.3,-1.9,0x3b4350,{solid:true});B(.9,.6,.8,.8,.3,-1.9,0x3b4350,{solid:true});B(.7,.5,.7,-.8,.85,-1.9,0x4a5566);B(.4,.9,1.6,hw-.25,.45,-.3,0x2a303a,{solid:true});
      for(const z of [-1.6,.5,2.2])lamp(0,h-.2,z,0x9ffbf0,.8);for(const s of [-1,1])B(.05,.05,d-.4,s*(hw-.05),h-.5,0,0x38e4d0,EM(0x38e4d0));
      g.userData.spawn={x:0,z:-2.4,yaw:Math.PI};g.userData.bounds=[-hw+.3,hw-.3,-hd+.5,hd-.5];g.userData.seat={x:-.55,z:.4};
    }
    g.userData.exit={x:0,z:-hd+.9};g.userData.w=new THREE.Vector3(...sp.at);this.reg.push(g);this.sc.add(g);return this.pods[kind]=g},
  async buildExtras(){if(this._ex)return;this._ex=1;await this.buildSpace();const s=await this.load('stack');const o=s.clone(true).getObjectByName('orbiter');if(!o)return;const grp=new THREE.Group(),node=new THREE.Group();node.add(o);o.position.set(0,0,0);grp.add(node);
    const b=new THREE.Box3().setFromObject(o),c=new THREE.Vector3();b.getCenter(c);o.position.sub(c);node.rotation.x=Math.PI/2;grp.userData.w=new THREE.Vector3(-25,6,-125);this.reg.push(grp);this.sc.add(grp);this.orb=grp},
  // ---------------------------------------------------------------------------------------------- doors
  doorTarget(){const m=this.mode;if(m==='eva'){const w=this.E1.w,t=[];t.push(['iss',w.length()-60,w.length()<115]);if(this.orb)t.push(['shuttle',w.distanceTo(this.orb.userData.w),w.distanceTo(this.orb.userData.w)<42]);t.push(['fighter',w.distanceTo(this.C.w),w.distanceTo(this.C.w)<40]);const ok=t.filter(x=>x[2]).sort((a,b)=>a[1]-b[1]);return ok.length?ok[0][0]:null}
    if(m==='landed')return 'fighter';if(m==='moon'&&this.M2&&Math.hypot(this.M2.x,this.M2.z)<9)return 'fighter';return null},
  doorUi(){const b=document.getElementById('spcDoor');if(!b)return;const t=this.doorTarget();b.hidden=!t;if(t&&b.dataset.t!==t){b.dataset.t=t;b.innerHTML='<b>🚪</b>'+{iss:'Station',shuttle:'Shuttle',fighter:'Cabin'}[t]}},
  door(){const t=this.doorTarget();if(!t)return this.msg('Too far','fly closer to a hatch',1800);this.enterInt(t,{from:this.mode,pos:this.mode==='eva'?this.E1.w.clone():null})},
  enterInt(kind,ctx){const pod=this.pods[kind]||this.buildPod(kind),sp=pod.userData.spawn;this.IN={kind,ctx,x:sp.x,z:sp.z,pod};this.V={yaw:sp.yaw,pitch:0,dist:0};this.mode='interior';this.setHud('interior');if(PLR)PLR.root.visible=false;this.sfx('hiss');setTimeout(()=>this.sfx('clunk'),350);this.flash(0,0);
    this.msg(this.podSpec[kind].title,kind==='fighter'?'the pilot seat is at the front · the hatch is behind you':'walk with the stick · drag to look · the hatch is behind you',3200)},
  leaveInt(seat){const IN=this.IN;if(!IN)return;const c=IN.ctx,from=c.from;this.IN=null;this.sfx('hiss');
    if(seat&&IN.kind==='fighter'){if(from==='landed'){this.mode='landed';this.setHud('landed');this.V={yaw:.6,pitch:.3,dist:34};this.msg('Space fighter','press Throttle to take off',2200)}else{this.mode='fly';this.setHud('fly');this.C.cq=null;this.msg('Space fighter','',1500)}return}
    if(from==='eva'){this.startEva(c.pos||new THREE.Vector3(36,3,-96));this.msg('Spacewalk','',1500)}else this.exitShip()},
  intStep(dt){const IN=this.IN,pod=IN.pod,U=pod.userData,I=this.in,V=this.V;const sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0),len=Math.hypot(sx,sy),kk=len>1?1/len:1,ix=sx*kk,iy=sy*kk;
    const f=[-Math.sin(V.yaw),-Math.cos(V.yaw)],r=[Math.cos(V.yaw),-Math.sin(V.yaw)],spd=I.thr>0?4:2.5,vx=(f[0]*iy+r[0]*ix)*spd,vz=(f[1]*iy+r[1]*ix)*spd;let nx=IN.x+vx*dt,nz=IN.z+vz*dt;const B=U.bounds;nx=Math.max(B[0],Math.min(B[1],nx));nz=Math.max(B[2],Math.min(B[3],nz));
    // furniture: push out of the nearest box side
    for(const o of U.obs){if(nx>o.x0&&nx<o.x1&&nz>o.z0&&nz<o.z1){const dl=nx-o.x0,dr=o.x1-nx,db=nz-o.z0,df=o.z1-nz,m=Math.min(dl,dr,db,df);if(m===dl)nx=o.x0;else if(m===dr)nx=o.x1;else if(m===db)nz=o.z0;else nz=o.z1}}
    IN.x=nx;IN.z=nz;IN.bob=(IN.bob||0)+Math.hypot(vx,vz)*dt*2.2;const eye=1.65+Math.sin(IN.bob*2)*.02*Math.min(1,len);
    const w=U.w;this.cam.set(w.x+nx,w.y+eye,w.z+nz);camera.position.set(0,0,0);camera.quaternion.setFromEuler(new THREE.Euler(V.pitch,V.yaw,0,'YXZ'));camera.near=.05;camera.updateProjectionMatrix();
    // what can be used here: the hatch (Exit) or the pilot seat
    const ex=U.exit,se=U.seat,nearE=Math.hypot(nx-ex.x,nz-ex.z)<1.7,nearS=se&&Math.hypot(nx-se.x,nz-se.z)<1.5;IN.use=nearE?'exit':nearS?'seat':null;
    const a=document.getElementById('spcAct');if(a){a.hidden=!IN.use;const t=IN.use==='exit'?['🚪','Exit']:['🧑‍✈️','Pilot'];if(IN.use&&a.dataset.u!==IN.use){a.dataset.u=IN.use;a.innerHTML='<b>'+t[0]+'</b>'+t[1]}}
    document.getElementById('spcSpd').textContent=this.podSpec[IN.kind].title;document.getElementById('spcAlt').textContent=IN.use==='exit'?'Press Exit to go outside':IN.use==='seat'?'Press Pilot to take the controls':'Earth, the Moon and the stars are outside the windows';document.getElementById('spcThr').style.width='0%'},
  intAct(){const IN=this.IN;if(!IN||!IN.use)return;if(IN.use==='exit')this.leaveInt(false);else this.leaveInt(true)},
});
// ---- wiring into space.js
{const _fr=SPC.frame,_sh=SPC.setHud,_bt=SPC.button,_ac=SPC.act,_lv=SPC.leave,_es=SPC.enterSpace;
  SPC.frame=function(dt){if(this.mode==='interior'&&this.built&&this.C){this._fc=(this._fc||0)+1;this.intStep(dt);this.cam.y;for(const o of this.reg)this.place(o);this.stars.position.set(0,0,0);this.sunSp.position.copy(this.S).multiplyScalar(4e7);this.sun.position.copy(this.S).multiplyScalar(1000);this.sun.target.position.set(0,0,0);this.earth.rotation.y+=dt*.004;this.clouds.rotation.y+=dt*.006;this.dustPts.material.opacity=0;this.sound(dt);renderer.info.reset();renderer.render(this.sc,camera);return}
    _fr.call(this,dt);this.doorUi();this.sound(dt)};
  SPC.setHud=function(mode){_sh.call(this,mode);const lab={interior:'Inside'}[mode];if(lab)document.getElementById('spcMode').textContent=lab;
    const sh=(k,v)=>{const b=document.querySelector('#spcBtns [data-k="'+k+'"]');if(b)b.hidden=!v};if(mode==='interior'){for(const k of ['thrUp','thrDn','full','rollL','rollR','brake','station','door'])sh(k,false);sh('act',true);sh('quit',true)}
    if(mode!=='interior'){const a=document.getElementById('spcAct');if(a){a.hidden=false;a.dataset.u=''}}if(mode!=='eva'&&mode!=='landed'&&mode!=='moon')sh('door',false)};
  SPC.button=function(k){if(k==='door')return this.door();if(this.mode==='interior'){if(k==='act')return this.intAct();if(k==='station')return}return _bt.call(this,k)};
  SPC.act=function(){if(this.mode==='interior')return this.intAct();return _ac.call(this)};
  SPC.leave=function(){this.IN=null;this.sndStop();return _lv.call(this)};
  SPC.enterSpace=async function(...a){await this.buildExtras().catch(e=>console.warn('[space] extras',e));return _es.apply(this,a)};
  const _land=SPC.land;SPC.land=function(n){_land.call(this,n);this.sfx('thud')};
}
