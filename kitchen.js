/* ===================================================================================================
   kitchen.js — a hands-on kitchen, seen from your own eyes.
   Before: pressing E at the fridge / kettle / sink started a scripted cut-scene — the camera swung to third person and the avatar
   opened the fridge, took the milk and drank it by itself. Now YOU do every step, one E / one tap at a time, and you see your own hands:
     fridge   E opens the door (you see your hand pull the handle); a small menu lets you take milk / juice / kefir / cola, put it back, or close the door
     in hand  whatever you took sits in your right hand (kettle, carton, glass, cup); the bar at the bottom has  Drink  and  Put down
     kettle   take it from the worktop → hold it under the running tap ("Fill") → put it on any table or worktop → switch it on →
              wait for the click → "Make green tea" (a cup appears, steam rises) → take the cup → drink
     sink     E turns the tap on (a real jet of water); "Wash your hands": your hands go under the water, the soap comes out of its dish
              and lathers up on them, rinse; "Turn off the tap" when you are done — it all happens right in front of you
   Nothing locks you: walking away simply ends the step (the hands go back down). The camera stays first person while your hands are busy.
   Hooks: actFridge / actKettle (acts.js), K.tap / K.table (houses.js — flats.js and modern.js use the same kit), soviet.js's sink and fridge.
   Loaded after acts.js and hands.js; touches game globals only at runtime.
   =================================================================================================== */
const KIT={vm:null,hand:[null,null],H:[{},{}],hold:null,act:null,menu:null,chip:null,anchor:null,spots:[],sinks:[],fridges:[],show:0,fp:0,hooked:false,portal:null,wAny:false,
  V:(x,y,z)=>new THREE.Vector3(x||0,y||0,z||0),
  win:(t,a,b)=>actWin(t,a,b)};

// ---------- DOM: the choice menu and the "in hand" bar ----------
KIT.css=function(){if(document.getElementById('kitCss'))return;const st=document.createElement('style');st.id='kitCss';st.textContent=`
#kitMenu{position:fixed;left:50%;bottom:24%;transform:translateX(-50%);z-index:36;display:none;flex-direction:column;gap:6px;min-width:230px;max-width:86vw;padding:10px;border:1.5px solid var(--hud-rim,rgba(255,255,255,.3));border-radius:16px;background:rgba(10,12,16,.84);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 14px 32px rgba(0,0,0,.5);color:#fff}
#kitMenu.on{display:flex}
#kitMenu .kh{font:800 10px/1 var(--f-disp,inherit);letter-spacing:.14em;text-transform:uppercase;color:#f2c14e;padding:2px 4px 5px}
#kitMenu button,#kitChip button{font:700 13px/1.1 var(--f-disp,inherit);color:#fff;text-align:left;padding:12px 14px;border:1.5px solid rgba(255,255,255,.28);border-radius:11px;background:rgba(255,255,255,.08);cursor:pointer;touch-action:manipulation}
#kitMenu button:active,#kitChip button:active{background:#f2c14e;color:#1b1204}
#kitMenu button i{font-style:normal;opacity:.55;margin-right:9px}
#kitChip{position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:35;display:none;align-items:center;gap:8px;padding:8px 10px;border:1.5px solid var(--hud-rim,rgba(255,255,255,.3));border-radius:14px;background:rgba(10,12,16,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;font:700 12px/1 var(--f-disp,inherit)}
#kitChip.on{display:flex}
#kitChip b{color:#f2c14e;margin-right:2px;font-weight:800}
#kitChip button{padding:10px 12px}`;document.head.appendChild(st)};
KIT.dom=function(){if(this.menu)return;this.css();
  const m=document.createElement('div');m.id='kitMenu';document.body.appendChild(m);this.menu=m;
  const c=document.createElement('div');c.id='kitChip';document.body.appendChild(c);this.chip=c;
  document.addEventListener('keydown',e=>{if(!this.menuOn())return;
    if(e.code==='Escape'){this.closeMenu();e.stopImmediatePropagation();e.preventDefault();return}
    const d=/^Digit(\d)$/.exec(e.code);if(d){const b=this.menu.querySelectorAll('button')[+d[1]-1];if(b){b.click();e.stopImmediatePropagation();e.preventDefault()}}},true)};
KIT.menuOn=function(){return !!(this.menu&&this.menu.classList.contains('on'))};
KIT.closeMenu=function(){if(this.menu)this.menu.classList.remove('on');this.anchor=null};
// opts: [[label,fn]]; the menu stays while you are within r metres of (x,z)
KIT.openMenu=function(title,opts,x,z,r,again){this.dom();const m=this.menu;m.textContent='';this.menuFn=again||null;
  const h=document.createElement('div');h.className='kh';h.textContent=title;m.appendChild(h);
  opts.forEach((o,i)=>{const b=document.createElement('button');b.innerHTML='<i>'+(i+1)+'</i>';b.appendChild(document.createTextNode(o[0]));b.onclick=()=>{this.closeMenu();o[1]()};m.appendChild(b)});
  m.classList.add('on');this.anchor={x,z,r:r||2.2}};
// something changed while a menu is open (the kettle clicked off): build the same menu again with the new options
KIT.refreshMenu=function(){if(this.menuOn()&&this.menuFn&&!this.act)this.menuFn()};

// ---------- things in the hand / on tables ----------
KIT.SHORT={omelette:'omelette',milk:'milk',juice:'orange juice',kefir:'kefir',cola:'cola',cup:'cup',tea:'green tea',glass:'glass',water:'glass of water',kettle:'kettle'};
KIT.DRINKS=['milk','juice','kefir','cola','tea','water','omelette'];
KIT.HALF={omelette:.02,kettle:0,cup:.043,tea:.043,glass:.05,water:.05,milk:.075,juice:.075,kefir:.07,cola:.075};
// where the hand takes hold, relative to the item's base (the item stays upright in your view)
KIT.GRIP=k=>k==='kettle'?new THREE.Vector3(.095,.15,0):new THREE.Vector3(0,(KIT.HALF[k]||.05)+.01,0);
// a kettle: an upright group about 0.27 m tall, origin on its base, handle on the right (where the hand is), spout on the left
KIT.mkKettle=function(){const G=new THREE.Group(),M=(c,r,m)=>new THREE.MeshStandardMaterial({color:c,roughness:r==null?.4:r,metalness:m||0});
  const add=(g,m,x,y,z)=>{const q=new THREE.Mesh(g,m);q.position.set(x||0,y||0,z||0);G.add(q);return q};
  add(new THREE.CylinderGeometry(.095,.095,.02,16),M(0x24272c,.5),0,.01,0);
  add(new THREE.CylinderGeometry(.075,.092,.2,16),M(0xe8ebee,.28,.55),0,.12,0);
  add(new THREE.CylinderGeometry(.062,.075,.04,16),M(0xc7cdd2,.3,.6),0,.24,0);
  add(new THREE.CylinderGeometry(.018,.018,.02,8),M(0x1c1d20,.5),0,.265,0);
  add(new THREE.BoxGeometry(.07,.05,.05),M(0xe8ebee,.28,.55),-.1,.19,0).rotation.z=.5;
  const h=add(new THREE.TorusGeometry(.055,.012,6,14,Math.PI),M(0x1c1d20,.55),.095,.15,0);h.rotation.z=-Math.PI/2;
  const lamp=add(new THREE.BoxGeometry(.028,.012,.012),new THREE.MeshBasicMaterial({color:0x223344}),0,.04,.094);
  add(new THREE.BoxGeometry(.02,.14,.01),M(0x15222c,.2),0,.15,.087);
  const fill=add(new THREE.BoxGeometry(.014,.134,.012),new THREE.MeshBasicMaterial({color:0x62b8f0}),0,.15,.09);fill.scale.y=.01;fill.position.y=.083+.067*.01;
  G.userData={lamp,fill,hand:new THREE.Vector3(.095,.15,0),top:new THREE.Vector3(0,.27,0),sw:new THREE.Vector3(0,.045,.1)};return G};
KIT.setFill=function(obj,v){const f=obj.userData.fill;if(!f)return;v=Math.max(.01,Math.min(1,v));f.scale.y=v;f.position.y=.083+.067*v};
KIT.mkProp=function(kind){let p;
  if(kind==='kettle')p=this.mkKettle();
  else if(kind==='omelette'){p=new THREE.Group();const M=(c,r)=>new THREE.MeshStandardMaterial({color:c,roughness:r==null?.6:r});
    const pl=new THREE.Mesh(new THREE.CylinderGeometry(.11,.085,.02,18),M(0xf6f3ea,.3));p.add(pl);const om=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),M(0xf3cf3c,.55));om.scale.set(1.15,.32,.8);om.position.y=.03;p.add(om);
    for(const [x,z] of [[.03,.02],[-.04,.0],[.0,-.04]]){const g=new THREE.Mesh(new THREE.SphereGeometry(.014,6,5),M(0x3f9a46));g.position.set(x,.052,z);p.add(g)}}
  else{const base=kind==='tea'?'cup':kind==='water'?'glass':kind;p=actProp(base);delete ACT.props[base];    // a fresh one every time (acts.js keeps one shared prop per kind)
    if(kind==='tea'||kind==='cup'){const lq=p.children[1];lq.visible=kind==='tea';if(kind==='tea')lq.material.color.setHex(0xa9c46a)}
    else if(kind==='water'||kind==='glass')p.children[1].visible=kind==='water'}
  p.position.set(0,0,0);p.visible=true;p.traverse(o=>{o.frustumCulled=false});return p};
KIT.sfx=function(k){try{actSfx(k)}catch(e){}};
KIT.W=function(E,x,y,z){return E&&E.grp?E.grp.localToWorld(new THREE.Vector3(x,y,z)):new THREE.Vector3(x,y,z)};

// ---------- the viewmodel: two hands in front of the camera ----------
KIT.build=function(){if(this.vm)return;this.dom();this.portal=PORTAL.cur;
  const vm=new THREE.Group();vm.visible=false;scene.add(vm);this.vm=vm;
  let skin;try{skin=PLR.arms[0].hand.children[0].material}catch(e){}if(!skin)skin=new THREE.MeshStandardMaterial({color:0xe0ac84,roughness:.7});
  const sleeve=new THREE.MeshStandardMaterial({color:0x3a4a62,roughness:.8,side:THREE.DoubleSide}),armM=skin.clone();armM.side=THREE.DoubleSide;
  for(let i=0;i<2;i++){const s=i?-1:1,h=hdHand(s,skin);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.026,.031,.3,10),armM);arm.position.y=.15;h.add(arm);
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.037,.043,.6,10),sleeve);cuff.position.y=.6;h.add(cuff);
    const fm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9}),fg=new THREE.Group();fg.visible=false;   // soap suds on the back of the hand
    [[.024,-.034,.004,.022],[.022,-.062,.02,.017],[.021,-.058,-.016,.016],[.017,-.083,.008,.012],[.005,-.1,.012,.011],[.026,-.012,-.008,.016],[.0,-.045,.01,.014]].forEach(b=>{const q=new THREE.Mesh(new THREE.SphereGeometry(b[3],8,6),fm);q.position.set(s*b[0],b[1],b[2]);fg.add(q)});
    h.add(fg);h.userData.foam=fg;h.traverse(o=>{o.frustumCulled=false});vm.add(h);this.hand[i]=h;
    this.H[i]={p:new THREE.Vector3(s*.34,-.62,-.28),f:new THREE.Vector3(0,-.4,-1),n:new THREE.Vector3(-s,0,0),tp:new THREE.Vector3(s*.34,-.62,-.28),tf:new THREE.Vector3(0,-.4,-1),tn:new THREE.Vector3(-s,0,0),on:0,grip:'relax',item:null,tilt:0}}
  // the soap bar sits in the left palm during a wash
  this.soap=new THREE.Mesh(new THREE.BoxGeometry(.07,.026,.046),new THREE.MeshStandardMaterial({color:0xf2c4cf,roughness:.5}));this.soap.position.set(.034,-.05,0);this.soap.visible=false;this.hand[1].add(this.soap);
  this.install()};
KIT.install=function(){if(this.hooked)return;this.hooked=true;
  // run once the camera has been placed for the frame, so the hands never lag behind a turn of the head
  const base=window.stepCamera;if(typeof base==='function')window.stepCamera=function(dt){const r=base.apply(this,arguments);try{KIT.sync(dt)}catch(e){if(!KIT.err){KIT.err=1;console.error('KIT',e)}}return r}};

const _kM=new THREE.Matrix4(),_kX=new THREE.Vector3(),_kY=new THREE.Vector3(),_kZ=new THREE.Vector3(),_kQ=new THREE.Quaternion(),_kV=new THREE.Vector3();
// fingers along f, palm facing n (the hand hangs along -y with its palm to -s·x and the thumb to +z)
KIT.orient=function(h,f,n,s){_kY.copy(f).negate().normalize();_kX.copy(n).multiplyScalar(-s);_kX.addScaledVector(_kY,-_kX.dot(_kY));if(_kX.lengthSq()<1e-6)_kX.set(-s,0,0);_kX.normalize();_kZ.crossVectors(_kX,_kY).normalize();
  _kM.makeBasis(_kX,_kY,_kZ);h.quaternion.setFromRotationMatrix(_kM)};
KIT.cs=function(x,y,z){return camera.worldToLocal(new THREE.Vector3(x,y,z))};          // camera space of a world point
// aim hand i: p = place (camera space), f = finger direction, n = palm normal, g = grip name
KIT.put=function(i,p,f,n,g){const H=this.H[i];H.tp.copy(p);if(f)H.tf.copy(f);if(n)H.tn.copy(n);H.grip=g||'relax';H.on=1};
// reach for a world point with hand i (never further than an arm's length)
KIT.reachW=function(i,w,g,o){o=o||{};const p=this.cs(w.x,w.y,w.z),L=p.length(),mx=o.max||.78;if(L>mx)p.multiplyScalar(mx/L);
  const s=i?-1:1,f=p.clone().sub(this.V(s*.2,-.22,.05)).normalize();this.put(i,p,f,o.n||this.V(-s,.25,0),g)};
KIT.hide=function(i){const H=this.H[i],s=i?-1:1;H.tp.set(s*.34,-.62,-.28);H.tf.set(-s*.2,-.4,-1);H.tn.set(-s,0,0);H.grip='relax';H.on=0};
// the carrying pose for the item in the right hand
KIT.carry=function(i,bob){const s=i?-1:1,t=performance.now()/1000;this.put(i,this.V(s*(.27+.012*Math.sin(t*1.3)),-.22+bob,-.6),this.V(-s*.28,.34,-1),this.V(-s,.1,0),this.hold&&this.hold.kind==='kettle'?'bar':'glass')};
KIT.carryW=function(i){const s=i?-1:1;return camera.localToWorld(this.V(s*.27,-.25,-.6))};

// the item follows the hand but stays upright in your view; the grip point (handle / middle) sits in the palm
KIT.itemUp=function(i){const H=this.H[i],o=H.item;if(!o)return;const h=this.hand[i],s=i?-1:1;
  o.quaternion.copy(h.quaternion).invert();if(H.tilt)o.quaternion.multiply(_kQ.setFromAxisAngle(_kV.set(1,0,0),H.tilt));
  const g=o.userData.hand;o.position.set(-s*.032,-.05,0);if(g)o.position.sub(_kV.copy(g).applyQuaternion(o.quaternion))};
KIT.attach=function(i,obj){const h=this.hand[i];this.H[i].item=obj;if(!obj)return;if(obj.parent!==h)h.add(obj);obj.visible=true};

// ---------- what the player holds ----------
KIT.setHold=function(kind,extra){this.build();const old=this.hold;if(old&&old.obj&&old.obj.parent)old.obj.parent.remove(old.obj);
  this.H[0].item=null;this.H[0].tilt=0;
  if(!kind){this.hold=null;this.updChip();return}
  const obj=(extra&&extra.obj)||this.mkProp(kind);this.hold=Object.assign({kind,obj,sips:3,water:0},extra||{});this.attach(0,obj);this.fpOn();this.updChip()};
KIT.workHand=function(){return this.hold?1:0};            // the free hand does the work while the other holds something
KIT.fpOn=function(){if(cam.dist>.75){this.fp=cam.dist;cam.dist=.5;cam.init=false}};
KIT.fpOff=function(){if(this.fp&&!this.hold&&!this.act){if(cam.dist<=.75)cam.dist=this.fp;this.fp=0;cam.init=false}};
KIT.updChip=function(){this.dom();const c=this.chip,h=this.hold;if(!h){c.classList.remove('on');return}
  c.textContent='';const b=document.createElement('b');b.textContent='In hand';c.appendChild(b);c.appendChild(document.createTextNode(' '+this.SHORT[h.kind]+(h.kind==='kettle'?(h.water>.95?' · full':h.water>.05?' · filling':' · empty'):'')));
  const mk=(t,f)=>{const q=document.createElement('button');q.textContent=t;q.onclick=f;c.appendChild(q)};
  if(this.DRINKS.includes(h.kind))mk(h.kind==='omelette'?'Eat':'Drink',()=>this.drink());
  mk('Put down',()=>this.putDown());c.classList.add('on')};

// ---------- timed steps ----------
KIT.DUR={fopen:1.15,fclose:1.0,ftake:1.5,fput:1.5,tap:.9,wash:7.4,fill:4.2,place:1.4,take:1.3,press:.9,pour:3.6,sip:3.4};
KIT.run=function(kind,o){if(this.act)return false;if(player.sit||(typeof DRIVE!=='undefined'&&DRIVE.on)||(typeof RIDE!=='undefined'&&RIDE.on)||!PLR)return false;
  this.build();this.closeMenu();this.fpOn();
  const a=this.act=Object.assign({kind,t:0,dur:this.DUR[kind]||1.2,wh:this.workHand(),portal0:PORTAL.cur},o||{});
  if(a.at){a.ax=a.at.x;a.az=a.at.z;a.want=a.want||.62}
  // look at the work: the camera tilts so the tap / table / kettle is in the middle of the view, whatever the height of the counter
  if(!a.aim){if(a.sink)a.aim=()=>a.sink.jet();else if(a.spot)a.aim=()=>this.W(a.spot.E,a.spot.wx,a.spot.y,a.spot.wz)}
  return true};
KIT.endAct=function(cancel){const a=this.act;if(!a)return;this.act=null;
  this.H[0].tilt=0;for(const h of this.hand)h.userData.foam.visible=false;this.soap.visible=false;
  if(cancel){if(a.onCancel)a.onCancel()}else if(a.onEnd)a.onEnd();
  this.fpOff();if(!cancel&&a.then)a.then()};

// ---------- per frame, right after the camera ----------
KIT.sync=function(dt){const vm=this.vm;if(!vm)return;
  if(this.portal!==PORTAL.cur){this.portal=PORTAL.cur;this.reset()}
  const water=!!(PORTAL.cur&&this.sinks.some(s=>s.t.on));if(water!==this.wAny){this.wAny=water;actWaterStream(water)}
  const act=this.act,hold=this.hold,fp=started&&cam.dist<=.75&&!PLR.root.visible&&!player.sit;
  this.show+=((act||hold?1:0)-this.show)*Math.min(1,dt*7);
  vm.visible=!!(fp&&(act||hold||this.show>.02));
  if(!vm.visible&&!act)return;
  camera.updateMatrixWorld(true);vm.position.copy(camera.position);vm.quaternion.copy(camera.quaternion);vm.updateMatrixWorld(true);
  for(const H of this.H)H.on=0;
  if(act){this.stepAct(dt,act)}
  if(this.anchor&&Math.hypot(player.x-this.anchor.x,player.z-this.anchor.z)>this.anchor.r)this.closeMenu();
  this.poseHands(dt)};
// left the interior (or entered another): whatever was in the hand goes back where it came from
KIT.reset=function(){if(this.act)this.endAct(true);this.closeMenu();
  for(const s of this.sinks)if(s.t.on)this.tapSet(s,false);
  const h=this.hold;if(h){const f=h.from;if(f&&h.kind==='kettle'&&f.E.grp.visible!==undefined){const sl=this.freeSlot(f);this.dropAt(f,this.slotPos(f,sl))}else this.setHold(null)}
  this.fpOff()};

// ---------- the steps ----------
KIT.stepAct=function(dt,a){if(this.freeze)dt=0;a.t+=dt;const t=a.t,w=this.win,Wd=a.wh,s=Wd?-1:1,k=a.kind;
  // anything that moves you on (stick / keys) or a new place ends the step
  if((t>.35&&Math.hypot(player.vx||0,player.vz||0)>1.0)||PORTAL.cur!==a.portal0){this.endAct(true);return}
  // step up to the thing if you stand too far from it (never through furniture), then look at it — you can still look around
  if(a.ax!==undefined&&t<.5){const dx=a.ax-player.x,dz=a.az-player.z,d=Math.hypot(dx,dz);if(d>a.want+.05){const q=Math.min(1,dt*5),nx=player.x+dx/d*(d-a.want)*q,nz=player.z+dz/d*(d-a.want)*q;if(!insideAny(nx,nz,.3,player.y+.5)){player.x=nx;player.z=nz}}}
  if(a.look&&!inp.dragging&&!(typeof TOUCH_LOOK!=='undefined'&&TOUCH_LOOK.active)){const L=a.look();let dy=Math.atan2(L.x-player.x,L.z-player.z)-cam.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;cam.yaw+=dy*Math.min(1,dt*(a.lookK||3));
    if(a.aim){const A=a.aim(),hd=Math.hypot(A.x-player.x,A.z-player.z)||.01,tp=Math.max(-1.05,Math.min(.35,Math.atan2(A.y-(player.y+1.58),hd)-.1));cam.pitch+=(tp-cam.pitch)*Math.min(1,dt*3)}
    else if(a.pitch!==undefined)cam.pitch+=(a.pitch-cam.pitch)*Math.min(1,dt*3)}
  if(k==='fopen'||k==='fclose'){const F=a.F,op=k==='fopen';
    F.set(op?w(t,.32,1.0):1-w(t,.28,.85));
    if(t>=.32&&t-dt<.32)this.sfx('latch');if(t>=.9&&t-dt<.9)this.sfx('thunk');
    F.door.updateWorldMatrix(true,true);const hp=this.V();
    if(op){F.door.children[0].getWorldPosition(hp);this.reachW(Wd,hp,t<1.0?'bar':'cup',{max:.95})}
    else{hp.set(F.w*.8,.1,.07);F.door.localToWorld(hp);this.reachW(Wd,hp,'flat',{max:.95,n:this.V(0,0,-1)})}
    if(t>a.dur-.22)this.hide(Wd)}
  else if(k==='ftake'||k==='fput'){const take=k==='ftake',F=a.F,sh=F.shelf(a.kind2),home=this.carryW(Wd);
    const u=take?w(t,0,.5)*(1-w(t,.75,1.35)):w(t,.05,.55)*(1-w(t,.9,1.4));
    this.reachW(Wd,home.clone().lerp(sh,u),'carton',{max:.95});
    if(t>=.3&&t-dt<.3)this.sfx('thunk');
    if(take&&!a.did&&t>.62){a.did=1;this.setHold(a.kind2);this.sfx('gulp')}
    if(!take&&!a.did&&t>.62){a.did=1;this.setHold(null);this.sfx('gulp')}}
  else if(k==='tap'){const sk=a.sink;this.reachW(Wd,sk.valve(),'pinch',{max:1.15});
    if(t>=.38&&t-dt<.38){this.tapSet(sk,!sk.t.on);this.sfx('click')}
    if(t>a.dur-.22)this.hide(Wd)}
  else if(k==='wash'){const sk=a.sink,jet=sk.jet(),jp=this.cs(jet.x,jet.y,jet.z),sp=sk.soapPos(),sc=this.cs(sp.x,sp.y+.02,sp.z);
    // palms under the jet; the soap comes out of its dish into the left hand, lathers, rinse, shake off
    const get=w(t,0,.7)*(1-w(t,.9,1.3)),wet=w(t,.5,1.0)*(1-w(t,1.2,1.5)),rub=w(t,1.5,2.0)*(1-w(t,4.3,4.7)),rinse=w(t,4.8,5.2)*(1-w(t,6.6,7.0)),ph=t*9.2;
    for(let i=0;i<2;i++){const sd=i?-1:1,P=jp.clone();if(P.length()>1.1)P.multiplyScalar(1.1/P.length());
      P.x+=sd*(.03+.02*wet+.05*rinse);P.z+=(sd>0?.05:-.03)*Math.sin(ph)*rub+.012*Math.sin(t*3+sd)*wet;P.y+=(sd>0?.016:-.01)*Math.sin(ph+.6)*rub-.04*rinse+.05;
      let tg=P;if(i===1&&get>0)tg=P.clone().lerp(sc,get);
      const f=tg.clone().sub(this.V(sd*.2,-.22,.05)).normalize();this.put(i,tg,f,this.V(-sd*(1-.5*rinse),.5*(rub+rinse),0).normalize(),rinse>.3?'cup':'flat')}
    this.soap.visible=!a.dishes&&(t>.55&&t<4.8);
    const foam=!a.dishes&&t>1.7&&t<5.3;for(const h of this.hand){const g=h.userData.foam;g.visible=foam;const q=1+.15*Math.sin(ph)*(rub>.3?1:0);g.scale.set(q,.8,q);if(t>4.9)g.scale.multiplyScalar(Math.max(.01,1-(t-4.9)/.45))}
    if(t>=1.5&&t-dt<1.5)this.sfx('gulp')}
  else if(k==='fill'){const sk=a.sink,h=this.hold;if(!h||h.kind!=='kettle'){this.endAct(true);return}
    const st=sk.stand(),into=w(t,0,.7)*(1-w(t,3.5,4.1)),under=this.cs(st.x,st.y+.16,st.z).add(this.V(.095,0,0));
    this.put(0,this.V(.27,-.25,-.6).lerp(under,into),this.V(-.28,.34,-1).lerp(this.V(0,-.1,-1),into),this.V(-1,.1,0),'bar');
    const lv=w(t,.7,3.3);h.water=lv;this.setFill(h.obj,lv);
    if(t>=a.dur-.05){h.water=1;this.updChip();this.sfx('click');toast('Kettle','full — put it on a table and switch it on')}}
  else if(k==='place'||k==='take'){const tk=k==='take',it=a.item,pos=tk?it.obj.getWorldPosition(this.V()):this.W(a.spot.E,a.pos.x,a.pos.y,a.pos.z),h=tk?null:this.hold;if(!tk&&!h&&!a.did){this.endAct(true);return}
    const kind=tk?it.kind:(h?(a.k3=h.kind):a.k3),dest=this.cs(pos.x,pos.y+(tk?(this.HALF[kind]||0):(this.HALF[kind]||0)),pos.z).add(this.GRIP(kind)),
      u=w(t,0,.55)*(1-w(t,.85,1.3));if(dest.length()>.85)dest.multiplyScalar(.85/dest.length());
    this.put(0,this.V(.27,-.25,-.6).lerp(dest,u),this.V(-.28,.34,-1).lerp(this.V(0,-.15,-1),u),this.V(-1,.1,0),kind==='kettle'?'bar':'carton');
    if(!a.did&&t>.62){a.did=1;if(tk)this.pickUp(a.spot,it);else this.dropAt(a.spot,a.pos);this.sfx('thunk')}}
  else if(k==='press'){const it=a.item,sw=it.obj.localToWorld(it.obj.userData.sw.clone());this.reachW(Wd,sw,'point',{max:.9,n:this.V(0,-1,0)});
    if(t>=.4&&t-dt<.4){this.sfx('click');this.boilStart(a.spot,it)}if(t>a.dur-.22)this.hide(Wd)}
  else if(k==='pour'){const it=a.item,o=it.obj,c=a.cup;
    // the kettle turns its spout to the cup, tilts, the cup fills and steams
    o.rotation.set(0,a.yaw,w(t,.5,1.3)*(1-w(t,2.5,3.2))*.8);o.updateMatrixWorld(true);
    this.reachW(Wd,o.localToWorld(o.userData.hand.clone()),'bar',{max:.9});
    if(t>=.9&&t-dt<.9){this.sfx('boil');c.obj.visible=true}
    if(t>1&&t<2.8){const cw=c.obj.getWorldPosition(this.V());actSteam(cw.x,cw.y+.1,cw.z,.2,16);if((t*4|0)!==((t-dt)*4|0))this.sfx('water')}
    this.setFill(o,1-w(t,1,2.6));
    if(t>a.dur-.22)this.hide(Wd)}
  else if(k==='sip'){const h=this.hold;if(!h){this.endAct(true);return}
    const up=w(t,0,.6)*(1-w(t,2.7,3.3)),sipP=Math.max(0,Math.sin(t*3.4+.3));
    this.put(0,this.V(.27,-.25,-.6).lerp(this.V(.04,-.12+.03*sipP*up,-.36),up),this.V(-.28,.34,-1).lerp(this.V(-.1,.8,-.6),up),this.V(-1,.1,0),'glass');this.H[0].tilt=(h.kind==='omelette'?.2+.1*sipP:.55+.25*sipP)*up;
    if(t>=.8&&t-dt<.8||t>=1.7&&t-dt<1.7||t>=2.5&&t-dt<2.5)this.sfx('gulp');
    if(h.kind==='tea'&&t>.6&&t<2.8){const c=camera.localToWorld(this.V(.04,-.2,-.4));actSteam(c.x,c.y,c.z,.1,5)}}
  else if(k==='cook'){const pan=a.pan,pw=pan.getWorldPosition(this.V());pan.visible=t>.3;
    // the pan on the ring, a spatula over it going round; sizzle, steam, the egg spreads and sets
    const u=w(t,.3,.9)*(1-w(t,6.3,6.9)),ph=t*5.2;pw.x+=Math.cos(ph)*.045*u;pw.z+=Math.sin(ph)*.045*u;pw.y+=.2;this.reachW(Wd,pw,'bar',{max:.95});
    pan.userData.egg.scale.set(Math.max(.01,w(t,.8,3.2)),1,Math.max(.01,w(t,.8,3.2)));pan.userData.egg.material.color.setRGB(.96,.94-.18*w(t,3,6),.82-.5*w(t,2.8,5.5));
    if(t>.6&&t<6.3){const pp=pan.getWorldPosition(this.V());if((t*6|0)!==((t-dt)*6|0))this.sfx('boil');actSteam(pp.x,pp.y+.12,pp.z,.15,7+4*w(t,1,3))}
    if(t>=.3&&t-dt<.3)this.sfx('click');if(t>a.dur-.25)this.hide(Wd)}
  if(this.act===a&&t>=a.dur)this.endAct(false)};

// ---------- hand poses every frame ----------
KIT.poseHands=function(dt){
  const sp=Math.hypot(player.vx||0,player.vz||0),bob=Math.sin(performance.now()/1000*7)*Math.min(.012,sp*.004),hold=this.hold;
  for(let i=0;i<2;i++){if(!this.H[i].on){if(hold&&i===0)this.carry(0,bob);else this.hide(i)}}
  for(let i=0;i<2;i++){const H=this.H[i],h=this.hand[i],q=1-Math.exp(-dt*(this.act?15:12));
    if(this.freeze){H.p.copy(H.tp);H.f.copy(H.tf);H.n.copy(H.tn)}else{H.p.lerp(H.tp,q);H.f.lerp(H.tf,q);H.n.lerp(H.tn,q)}
    h.position.copy(H.p);this.orient(h,H.f,H.n,i?-1:1);
    if(h.userData.rig){h.userData.rig.tgt=(HD.pose[H.grip]||HD.pose.relax).slice();hdStep(h,dt,14)}
    this.itemUp(i);h.visible=H.p.y>-.56||H.on===1}};

// ---------- tap, water ----------
KIT.tapSet=function(sk,on){const t=sk.t;t.on=on;t.until=on?(HSTATE.t||0)+99999:0;if(t.m)t.m.visible=on};
// a basin / sink: t = the tap record from K.tap (houses.js), o = {wx,wz (world), y (world, faucet), ry, drink, stand [world x,z]}
KIT.sink=function(E,o){const t=o.t,sx=o.wx+Math.cos(o.ry)*.3,sz=o.wz-Math.sin(o.ry)*.3,sk={t,E,o,get at(){return KIT.W(E,o.wx,0,o.wz)},valve:()=>this.W(E,o.wx,o.y-.06,o.wz),jet:()=>this.W(E,t.m.position.x,o.cy+.12,t.m.position.z),stand:()=>this.W(E,t.m.position.x,o.cy,t.m.position.z),soapPos:()=>this.W(E,sx,o.cy+.02,sz),sx,sz};
  this.sinks.push(sk);t.on=false;
  // a soap dish on the counter beside the tap, so the soap that reaches your hands really comes from somewhere
  if(E.box){E.box(sx-E.ox,o.cy-INT_Y+.014,sz-E.oz,.08,.025,.055,'#f2c4cf',0,o.ry);E.box(sx-E.ox,o.cy-INT_Y,sz-E.oz,.1,.012,.075,'#d8dde0',6,o.ry)}
  else{const mk=(w,h,d,c,y)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.5}));q.position.set(sx,o.cy+y,sz);q.rotation.y=o.ry;E.grp.add(q)};mk(.1,.012,.075,0xd8dde0,0);mk(.08,.025,.055,0xf2c4cf,.014)}
  INTERACT.push({x:o.stand[0],z:o.stand[1],r:o.drink?1.15:1.5,cond:()=>E.grp.visible&&!KIT.act,get label(){return t.on?'Sink':'Turn on the tap'},fn:()=>{if(KIT.menuOn()){KIT.closeMenu();return}KIT.sinkE(sk)}});
  return sk};
KIT.sinkE=function(sk){const at=sk.at,look=()=>at;
  if(!sk.t.on){this.run('tap',{sink:sk,at,want:.62,look,pitch:-.5,then:()=>this.sinkMenu(sk)});return}
  this.sinkMenu(sk)};
KIT.sinkMenu=function(sk){const t=sk.t,o=sk.o,h=this.hold,opts=[],at=sk.at,look=()=>at;if(!t.on)return;
  if(h&&h.kind==='kettle'){if(h.water<.95)opts.push(['Fill the kettle',()=>this.run('fill',{sink:sk,at,want:.6,look,pitch:-.75,then:()=>this.sinkMenu(sk)})])}
  else if(!h)opts.push(['Wash your hands',()=>this.run('wash',{sink:sk,at,want:.6,look,pitch:-.75,lookK:2.4,then:()=>this.sinkMenu(sk)})]);
  if(o.drink&&!h){const now=performance.now(),cd=sk.dishAt||0;if(now>cd)opts.push(['Wash the dishes · '+(typeof WALLET!=='undefined'?WALLET.fmt(40):'₴40'),()=>this.run('wash',{sink:sk,at,want:.6,look,lookK:2.4,dishes:true,onEnd:()=>{sk.dishAt=performance.now()+40000;JOBS.pay(40,'dishes');toast('Dishes done','+'+WALLET.fmt(40)+' for the chore')},then:()=>this.sinkMenu(sk)})]);else opts.push(['The dishes are done for now',()=>{}])}
  if(o.drink&&!h)opts.push(['Pour a glass of water',()=>{this.setHold('water');this.sfx('water');toast('Water','a glass of cold water — Drink below')}]);
  opts.push(['Turn off the tap',()=>this.run('tap',{sink:sk,at,want:.62,look,pitch:-.5})]);
  this.openMenu(o.drink?'Kitchen sink':'Basin',opts,at.x,at.z,1.9,()=>this.sinkMenu(sk))};

// ---------- the fridge (built by actFridge in acts.js) ----------
KIT.FOOD=[['milk','Take the milk'],['juice','Take the orange juice'],['kefir','Take the kefir'],['cola','Take a cola']];
KIT.fridge=function(E,F){this.fridges.push(F);F.open=false;
  INTERACT.push({x:E.ox+F.stand[0],z:E.oz+F.stand[1],r:1.5,cond:()=>E.grp.visible&&!KIT.act,get label(){return F.open?'Fridge':'Open the fridge'},fn:()=>{if(KIT.menuOn()){KIT.closeMenu();return}KIT.fridgeE(F)}})};
KIT.fridgeE=function(F){const at=F.front(),look=()=>at;
  if(!F.open){this.run('fopen',{F,at,want:.55,look,pitch:-.05,onEnd:()=>{F.open=true},then:()=>this.fridgeMenu(F)});return}
  this.fridgeMenu(F)};
KIT.fridgeMenu=function(F){const h=this.hold,opts=[],at=F.front(),look=()=>at;
  if(!h)for(const [k,n] of this.FOOD.filter(f=>!F.foods||F.foods.includes(f[0])))opts.push([n,()=>this.run('ftake',{F,kind2:k,wh:0,at,want:.55,look,then:()=>this.fridgeMenu(F)})]);
  else if(this.FOOD.some(f=>f[0]===h.kind))opts.push(['Put the '+this.SHORT[h.kind]+' back',()=>this.run('fput',{F,kind2:h.kind,wh:0,at,want:.55,look,then:()=>this.fridgeMenu(F)})]);
  opts.push(['Close the fridge',()=>this.run('fclose',{F,at,want:.55,look,onEnd:()=>{F.open=false}})]);
  this.openMenu('Fridge',opts,at.x,at.z,2.4,()=>this.fridgeMenu(F))};

// ---------- tables and worktops: put things down, take them, work the kettle ----------
KIT.SLOTS=[[0,0],[.34,.06],[-.34,.06],[.18,-.2],[-.18,-.2]];
KIT.spot=function(E,o){const sp={E,wx:E.ox+o.x,wz:E.oz+o.z,get c(){return KIT.W(E,E.ox+o.x,0,E.oz+o.z)},y:o.y,ry:o.ry||0,r:o.r||1.7,name:o.name||'Table',items:[],w:o.w||1,onLabel:o.onLabel,whistle:o.whistle};this.spots.push(sp);
  INTERACT.push({x:sp.wx,z:sp.wz,r:sp.r,cond:()=>E.grp.visible&&!KIT.act&&(!!KIT.hold||sp.items.length>0),get label(){return KIT.hold?'Put the '+KIT.SHORT[KIT.hold.kind]+' on the '+sp.name.toLowerCase():sp.name},fn:()=>{if(KIT.menuOn()){KIT.closeMenu();return}KIT.spotE(sp)}});return sp};
KIT.slotPos=function(sp,i){const s=this.SLOTS[i%this.SLOTS.length],c=Math.cos(sp.ry),n=Math.sin(sp.ry),k=Math.min(1,sp.w/1.2);return this.V(sp.wx+s[0]*k*c+s[1]*n,sp.y,sp.wz-s[0]*k*n+s[1]*c)};
KIT.freeSlot=function(sp){const used=sp.items.map(x=>x.slot);let s=0;while(used.includes(s)&&s<this.SLOTS.length-1)s++;return s};
KIT.spotE=function(sp){const h=this.hold,opts=[],at={x:sp.c.x,z:sp.c.z},look=()=>at;
  if(h){const sl=this.freeSlot(sp);opts.push(['Put the '+this.SHORT[h.kind]+' here',()=>this.run('place',{spot:sp,pos:this.slotPos(sp,sl),at,want:.7,look,pitch:-.35,then:()=>this.spotE(sp)})])}
  for(const it of sp.items){
    if(it.kind==='kettle'){
      if(it.water>.95&&!it.boiled&&!it.boiling)opts.push([sp.onLabel||'Switch the kettle on',()=>this.run('press',{spot:sp,item:it,at,want:.7,look,pitch:-.45,then:()=>this.spotE(sp)})]);
      else if(it.boiling)opts.push(['The kettle is boiling… wait for the click',()=>{}]);
      else if(!it.boiled&&it.water<.05)opts.push(['The kettle is empty — fill it at the tap',()=>{}]);
      if(it.boiled)opts.push(['Make green tea',()=>this.makeTea(sp,it)]);
      if(!h)opts.push(['Take the kettle',()=>this.run('take',{spot:sp,item:it,wh:0,at,want:.7,look,pitch:-.3})])}
    else if(!h)opts.push(['Take the '+this.SHORT[it.kind],()=>this.run('take',{spot:sp,item:it,wh:0,at,want:.7,look,pitch:-.3})])}
  if(opts.length)this.openMenu(sp.name,opts,sp.c.x,sp.c.z,sp.r+.6,()=>this.spotE(sp))};
KIT.dropAt=function(sp,pos){const h=this.hold;if(!h)return;const obj=h.obj,kind=h.kind;if(obj.parent)obj.parent.remove(obj);
  obj.quaternion.identity();obj.rotation.set(0,0,0);obj.position.set(pos.x,pos.y+(this.HALF[kind]||0),pos.z);sp.E.grp.add(obj);obj.visible=true;
  const it={kind,obj,slot:this.freeSlot(sp),water:h.water||0,boiled:!!h.boiled};sp.items.push(it);this.hold=null;this.H[0].item=null;this.H[0].tilt=0;this.updChip();this.fpOff();
  if(kind==='kettle'){this.setFill(obj,it.water);toast('Kettle on the '+sp.name.toLowerCase(),it.water>.95?'press E next to it to switch it on':'it is empty — fill it at the tap first')}};
KIT.pickUp=function(sp,it){const i=sp.items.indexOf(it);if(i>=0)sp.items.splice(i,1);const obj=it.obj;if(obj.parent)obj.parent.remove(obj);obj.rotation.set(0,0,0);
  this.setHold(it.kind,{obj,water:it.water,boiled:it.boiled,from:sp});if(it.kind==='kettle'){obj.userData.lamp.material.color.setHex(0x223344);this.setFill(obj,it.water)}};
// switch on: the lamp glows, steam, a click when it has boiled (a timer, so you can walk away meanwhile)
KIT.boilStart=function(sp,it){if(it.boiling||it.boiled)return;it.boiling=true;it.bt=0;it.obj.userData.lamp.material.color.setHex(0x4aa8ff);toast('Kettle','the button clicks and the water starts to hum');
  const tick=()=>{if(!it.boiling)return;it.bt+=.25;
    if(PORTAL.cur&&sp.E.grp.visible&&it.obj.parent){const wp=it.obj.localToWorld(it.obj.userData.top.clone());actSteam(wp.x,wp.y,wp.z,.4,8+it.bt*4);if((it.bt*2|0)!==((it.bt-.25)*2|0))this.sfx('boil')}
    if(it.bt>=4.5){it.boiling=false;it.boiled=true;it.obj.userData.lamp.material.color.setHex(0x223344);this.sfx('click');this.sfx('ding');if(sp.whistle&&window.AUD&&AUD.tone)AUD.tone(2300,2100,.7,.07,'sine');toast('Kettle','the water has boiled — choose "Make green tea"');this.refreshMenu();return}
    setTimeout(tick,250)};setTimeout(tick,250)};
KIT.makeTea=function(sp,it){if(this.act)return;
  const si=this.freeSlot(sp),pos=this.slotPos(sp,si),obj=this.mkProp('tea'),at={x:sp.c.x,z:sp.c.z},look=()=>at,kp=it.obj.position,hy=this.HALF.tea;
  obj.position.set(pos.x,pos.y+hy,pos.z);obj.visible=false;sp.E.grp.add(obj);
  const c={kind:'tea',obj,slot:si,pos:pos.clone(),water:0};
  // the spout (the kettle's local -x) points at the cup
  const yaw=Math.atan2(pos.z-kp.z,-(pos.x-kp.x));
  this.run('pour',{spot:sp,item:it,cup:c,yaw,at,want:.7,look,pitch:-.45,
    onEnd:()=>{it.boiled=false;it.water=0;it.obj.rotation.set(0,0,0);sp.items.push(c);obj.visible=true;this.setFill(it.obj,0);toast('Green tea','the cup is on the '+sp.name.toLowerCase()+' — take it and drink')},
    onCancel:()=>{it.obj.rotation.set(0,0,0);if(obj.parent)obj.parent.remove(obj);this.setFill(it.obj,it.water)}})};

// ---------- drink / put down ----------
KIT.drink=function(){const h=this.hold;if(!h||!this.DRINKS.includes(h.kind)||this.act)return;
  this.run('sip',{onEnd:()=>{h.sips--;if(h.sips<=0){const k=h.kind;this.setHold(null);this.fpOff();toast(k==='omelette'?'Bon appétit':'Cheers',k==='tea'?'good green tea':k==='water'?'cold water':k==='omelette'?'a proper omelette':'delicious')}else toast('Mmm','still '+h.sips+' sip'+(h.sips>1?'s':'')+' left')}})};
KIT.putDown=function(){const h=this.hold;if(!h||this.act)return;
  for(const F of this.fridges)if(F.open&&this.FOOD.some(f=>f[0]===h.kind)){const at=F.front();if(Math.hypot(player.x-at.x,player.z-at.z)<1.8){this.run('fput',{F,kind2:h.kind,wh:0,at,want:.55,look:()=>at,then:()=>this.fridgeMenu(F)});return}}
  let best=null,bd=1e9;for(const sp of this.spots){if(!sp.E.grp.visible)continue;const d=Math.hypot(sp.c.x-player.x,sp.c.z-player.z);if(d<sp.r&&d<bd){bd=d;best=sp}}
  if(!best){toast('Nowhere to put it','stand next to a table or the worktop');return}
  const at={x:best.c.x,z:best.c.z};this.run('place',{spot:best,pos:this.slotPos(best,this.freeSlot(best)),at,want:.7,look:()=>at,pitch:-.35})};

// ---------- the bed: sit on it or sleep until morning ----------
KIT.bed=function(E,o){INTERACT.push({x:E.ox+o.x,z:E.oz+o.z,r:1.8,cond:()=>E.grp.visible&&!KIT.act&&!player.sit&&!KIT.sleeping,label:'Bed',
  fn:()=>{if(KIT.menuOn()){KIT.closeMenu();return}const c=KIT.W(E,E.ox+o.x,0,E.oz+o.z);KIT.openMenu('Bed',[['Lie down and sleep until morning',()=>KIT.sleep()],['Sit on the bed',()=>o.sit()]],c.x,c.z,2.6)}})};
KIT.sleep=function(){if(this.sleeping)return;this.sleeping=true;this.dom();
  let f=document.getElementById('kitFade');if(!f){f=document.createElement('div');f.id='kitFade';f.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;background:#000;opacity:0;transition:opacity 1.3s;z-index:90;pointer-events:none;display:flex;align-items:center;justify-content:center;color:#fff;font:700 22px/1.2 var(--f-disp,inherit);letter-spacing:.12em';document.body.appendChild(f)}
  f.style.pointerEvents='auto';f.textContent='';f.style.opacity=1;
  setTimeout(()=>{f.textContent='Zzz…'},1000);
  setTimeout(()=>{try{S.time='day';applyTime();saveS()}catch(e){}f.textContent='Good morning';toast('Good morning','you slept well and it is a new day')},3000);
  setTimeout(()=>{f.style.opacity=0;f.style.pointerEvents='none';f.textContent='';this.sleeping=false},4400)};
// ---------- the stove: fry an omelette, eat it ----------
KIT.cook=function(E,o){const pan=new THREE.Group(),M=(c,r,m)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m||0});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.125,.1,.04,18),M(0x24262a,.5,.6));body.position.y=.02;const egg=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.012,18),M(0xf6efd0,.6));egg.position.y=.04;egg.scale.set(.01,1,.01);
  const hd=new THREE.Mesh(new THREE.BoxGeometry(.16,.016,.024),M(0x1b1c1f,.6));hd.position.set(.2,.03,0);pan.add(body,egg,hd);pan.userData.egg=egg;pan.visible=false;pan.position.set(E.ox+o.x,o.y,E.oz+o.z);E.grp.add(pan);
  INTERACT.push({x:E.ox+o.sx,z:E.oz+o.sz,r:1.25,cond:()=>E.grp.visible&&!KIT.act&&!KIT.hold,label:'Cook',
    fn:()=>{if(KIT.menuOn()){KIT.closeMenu();return}const c=KIT.W(E,E.ox+o.sx,0,E.oz+o.sz),at=KIT.W(E,E.ox+o.x,0,E.oz+o.z),a={x:at.x,z:at.z};
      KIT.openMenu('Stove',[['Fry an omelette',()=>KIT.run('cook',{pan,at:a,want:.62,look:()=>a,aim:()=>KIT.W(E,E.ox+o.x,o.y,E.oz+o.z),onCancel:()=>{pan.visible=false;pan.userData.egg.scale.set(.01,1,.01)},onEnd:()=>{pan.visible=false;pan.userData.egg.scale.set(.01,1,.01);KIT.setHold('omelette');toast('Omelette ready','Eat it from the bar below, or put it on the table')}})]],c.x,c.z,2.2)}})};
KIT.DUR.cook=7;
