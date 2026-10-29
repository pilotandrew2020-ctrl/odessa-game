// ================================================================= GARAGE — pick a vehicle on a rotating turntable (the Garage button / U key)
// Own little scene drawn with the main renderer (like the character creator). Cars are the game's instanced bodies shown through one-instance
// meshes (so the paint shader works); the Lamborghini, G-Wagon, bicycle and submarine are real LiteVehicles built for display only.
const GAR={on:false,idx:0,built:false,cache:{},cols:{},cur:null,yaw:.6,tYaw:.6,hold:0,zoom:1,spanC:2,wmC:4,yC:.6,drag:null,_t:0,
  LIST:[
    {id:'c4',car:4,name:'Sport hatch',sub:'Low and quick · the classic first ride',st:[4,4,2],col:0xc0262d},
    {id:'c0',car:0,name:'Family sedan',sub:'A comfortable three-box saloon',st:[3,3,3]},
    {id:'c1',car:1,name:'City hatchback',sub:'Short, light and easy to park',st:[3,4,2]},
    {id:'c2',car:2,name:'SUV',sub:'Tall, wide and roomy',st:[3,2,4]},
    {id:'c3',car:3,name:'Marshrutka',sub:'The minibus on every Odesa route',st:[2,1,5]},
    {id:'c5',car:5,name:'ZAZ Tavria',sub:'The Zaporizhzhia hatch of the nineties',st:[1,3,2]},
    {id:'c6',car:6,name:'Lada Zhiguli',sub:'VAZ-2107 — every yard had one',st:[2,2,3]},
    {id:'c7',car:7,name:'Daewoo Lanos',sub:'The compact sedan of the 2000s',st:[3,3,3]},
    {id:'c9',car:9,name:'Fiat 126p',sub:'Maluch — tiny and cheerful',st:[1,3,1]},
    {id:'c10',car:10,name:'FSO Polonez',sub:'A long wedge hatchback from Warsaw',st:[2,2,3]},
    {id:'lambo',lite:'lambo',name:'Lamborghini',sub:'Open-cockpit supercar for two',st:[5,4,1]},
    {id:'gwagon',lite:'gwagon',name:'G-Wagon',sub:'Boxy off-roader that seats four',st:[3,3,4]},
    {id:'bike',lite:'bike',name:'Bicycle',sub:'Pedal along the Odesa boulevards',st:[1,5,1]},
    {id:'sub',lite:'sub',name:'Submarine',sub:'Dive to 150 m from the harbour mooring',st:[2,2,5]}],
  $(i){return document.getElementById(i)},
  el(tag,cls,txt,par){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;if(par)par.appendChild(e);return e},
  hex(c){return '#'+c.toString(16).padStart(6,'0')},
  build(){if(this.built)return;this.built=true;
    const css=document.createElement('style');css.textContent=
      '#garage{position:absolute;inset:0;z-index:30;display:grid;grid-template-columns:minmax(150px,230px) minmax(0,1fr) minmax(250px,350px);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"head head head" "list stage panel" "bar bar bar";column-gap:clamp(10px,2vw,28px);padding:max(10px,env(safe-area-inset-top)) clamp(12px,3vw,44px) max(12px,env(safe-area-inset-bottom));color:#fff;touch-action:none;background:radial-gradient(100% 80% at 50% 45%,transparent 45%,rgba(0,0,0,.62) 100%)}'+
      '#garage[hidden]{display:none}body.garOn #app>*:not(#c):not(#garage),body.garOn #toast,body.garOn #spd{visibility:hidden}'+
      '#garHead{grid-area:head;display:flex;align-items:center;gap:16px;padding:4px 0 10px}'+
      '#garHead button,#garBar button{border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(0,0,0,.6);font-family:var(--f-disp);font-weight:800;letter-spacing:.1em;text-transform:uppercase}'+
      '#garBack{padding:10px 14px;font-size:12px}#garTitle small{display:block;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--sun)}'+
      '#garTitle b{font:900 clamp(22px,4vw,34px)/1 var(--f-disp);text-transform:uppercase;font-style:italic}'+
      '#garList{grid-area:list;display:flex;flex-direction:column;gap:3px;align-self:center;max-height:100%;overflow:auto;scrollbar-width:thin;touch-action:pan-y}'+
      '#garList .crTab{flex:none}'+
      '#garStage{grid-area:stage;position:relative;touch-action:none;cursor:grab}#garStage:active{cursor:grabbing}'+
      '.garArr{position:absolute;top:50%;transform:translateY(-50%);width:46px;height:68px;padding:0;border-radius:0;background:rgba(0,0,0,.55);backdrop-filter:none;-webkit-backdrop-filter:none;font:700 30px/1 var(--f-disp);color:#fff;border:1px solid rgba(255,255,255,.2);z-index:2}'+
      '#garPrev{left:0}#garNext{right:0}'+
      '#garName{position:absolute;left:50%;top:4px;transform:translateX(-50%);width:84%;text-align:center;pointer-events:none}'+
      '#garName b{display:block;font:900 clamp(17px,2.8vw,30px)/1.05 var(--f-disp);text-transform:uppercase;font-style:italic;text-shadow:0 2px 14px rgba(0,0,0,.6)}'+
      '#garName span{display:block;margin-top:4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--sun);text-shadow:0 1px 8px rgba(0,0,0,.7)}'+
      '#garHint{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5);pointer-events:none;white-space:nowrap}'+
      '#garPanel{grid-area:panel;align-self:center;max-height:100%;overflow:auto;background:rgba(6,10,12,.8);border-top:3px solid var(--sun);padding:16px 16px 14px;display:flex;flex-direction:column;gap:14px;touch-action:pan-y;scrollbar-width:thin}'+
      '#garPanel h3{margin:0;font:800 13px var(--f-disp);letter-spacing:.24em;color:var(--sun)}#garPanel p{margin:0;font-size:13px;line-height:1.45;color:#d5dcdf}'+
      '.garSt{display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.garSt span{width:76px}'+
      '.garSt i{flex:1;height:6px;background:rgba(255,255,255,.12);position:relative}.garSt i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--v);background:var(--sun)}'+
      '#garBar{grid-area:bar;display:flex;justify-content:center;gap:10px;padding-top:10px}#garBar button{padding:13px 22px;font-size:14px;white-space:nowrap}#garBar #garGo{background:var(--sun);color:#111;border-color:var(--sun);padding:13px 34px}'+
      '@media (max-width:760px),(max-aspect-ratio:1/1){#garage{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto auto auto;grid-template-areas:"head" "stage" "list" "panel" "bar";padding-left:12px;padding-right:12px}'+
      '#garStage{min-height:150px}.garArr{width:34px;height:52px;font-size:24px}#garHint{display:none}#garList{flex-direction:row;overflow-x:auto;overflow-y:hidden;max-width:100%;touch-action:pan-x}#garList .crTab{padding:9px 12px;white-space:nowrap}#garList .crTab i{display:none}#garPanel{max-height:24vh;padding:10px 12px}#garTitle small{display:none}#garBar button{padding:11px 14px;font-size:12px}#garBar #garGo{flex:1}}'+
      '@media (max-height:480px) and (min-aspect-ratio:1/1) and (min-width:761px){#garage{grid-template-columns:minmax(120px,170px) minmax(0,1fr) minmax(220px,300px)}#garList .crTab{padding:7px 11px;font-size:11.5px}#garPanel{padding:10px 12px;gap:9px}#garBar button{padding:9px 16px;font-size:12px}#garTitle small{display:none}#garHead{padding-bottom:4px}}';
    document.head.appendChild(css);
    const R=this.root=this.el('div',null,null,this.$('app')||document.body);R.id='garage';R.hidden=true;
    const hd=this.el('div',null,null,R);hd.id='garHead';const bb=this.el('button',null,'‹ Back',hd);bb.id='garBack';const tt=this.el('div',null,null,hd);tt.id='garTitle';this.el('small',null,'Choose your ride in the',tt);this.el('b',null,'Garage',tt);
    this.list=this.el('nav',null,null,R);this.list.id='garList';
    this.LIST.forEach((e,i)=>{const b=this.el('button','crTab',null,this.list);b.innerHTML='<i>'+String(i+1).padStart(2,'0')+'</i><span>'+e.name+'</span>';b.onclick=()=>this.show(i)});
    const st=this.stage=this.el('div',null,null,R);st.id='garStage';
    const pv=this.el('button','garArr','‹',st);pv.id='garPrev';pv.setAttribute('aria-label','Previous vehicle');const nx=this.el('button','garArr','›',st);nx.id='garNext';nx.setAttribute('aria-label','Next vehicle');
    const nm=this.el('div',null,null,st);nm.id='garName';this.nameB=this.el('b',null,'',nm);this.nameS=this.el('span',null,'',nm);
    const ht=this.el('div',null,'Drag to turn · ← → to switch · Enter to take it out',st);ht.id='garHint';
    this.panel=this.el('div',null,null,R);this.panel.id='garPanel';
    const br=this.el('div',null,null,R);br.id='garBar';this.go_=this.el('button',null,'Take it out  ▶',br);this.go_.id='garGo';
    bb.onclick=()=>this.close();pv.onclick=()=>this.step(-1);nx.onclick=()=>this.step(1);this.go_.onclick=()=>this.take();
    st.addEventListener('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX};this.hold=performance.now();try{st.setPointerCapture(e.pointerId)}catch(x){}});
    st.addEventListener('pointermove',e=>{if(!this.drag||e.pointerId!==this.drag.id)return;this.tYaw+=(e.clientX-this.drag.x)*.012;this.drag.x=e.clientX;this.hold=performance.now()});
    for(const k of ['pointerup','pointercancel','lostpointercapture'])st.addEventListener(k,()=>{this.drag=null});
    st.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.6,Math.min(1.4,this.zoom*(1+Math.sign(e.deltaY)*.08)))},{passive:false});
    // while the garage is open nothing reaches the game's own key handlers (keyup still does, so a key held when it opened is released)
    addEventListener('keydown',e=>{if(!this.on)return;e.stopPropagation();e.preventDefault();if(e.repeat)return;
      if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')this.step(-1);else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')this.step(1);
      else if(e.key==='ArrowUp')this.step(-1);else if(e.key==='ArrowDown')this.step(1);else if(e.key==='Enter')this.take();else if(e.key==='Escape'||e.code==='KeyU')this.close()},true);
    this.ensureScene()},
  ensureScene(){if(this.scene)return;const sc=this.scene=new THREE.Scene(),cv=document.createElement('canvas');cv.width=8;cv.height=256;const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,256);
    g.addColorStop(0,'#05141a');g.addColorStop(.58,'#10404e');g.addColorStop(1,'#071e27');x.fillStyle=g;x.fillRect(0,0,8,256);const bg=new THREE.CanvasTexture(cv);bg.encoding=THREE.sRGBEncoding;sc.background=bg;
    sc.add(new THREE.HemisphereLight(0xcfe8ff,0x1b2a30,.8));
    const key=this.key=new THREE.DirectionalLight(0xfff0d8,2.3);key.position.set(4,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);const sh=key.shadow.camera;sh.left=-5;sh.right=5;sh.top=5;sh.bottom=-5;sh.near=1;sh.far=18;key.shadow.bias=-.0006;sc.add(key);sc.add(key.target);
    const rim=new THREE.DirectionalLight(0x7fc4ff,1.7);rim.position.set(-5,3.2,-4);sc.add(rim);const fill=new THREE.DirectionalLight(0xffd9b0,.7);fill.position.set(-4,1.5,4);sc.add(fill);
    // the paint is mostly reflections: a little photo studio (dark room, big soft box overhead, strip lights on the sides and behind) is baked into an
    // environment map, so the body shows clean gradients instead of the white daytime sky
    try{const es=new THREE.Scene();es.background=new THREE.Color(0x070d10);
      const sb=(w,h,x,y,z,v,tint)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(tint[0]*v,tint[1]*v,tint[2]*v),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m)};
      sb(14,5,0,9,0,3.2,[1,.97,.92]);sb(3,9,-9,3,0,4.5,[.7,.85,1]);sb(3,9,9,3,0,3.2,[1,.9,.78]);sb(12,2.2,0,2.5,-10,2.6,[1,1,1]);sb(6,1.5,0,.6,10,.9,[.8,.9,1]);
      const pm=new THREE.PMREMGenerator(renderer);sc.environment=pm.fromScene(es,.03).texture;pm.dispose()}
    catch(e){if(typeof scene!=='undefined'&&scene&&scene.environment)sc.environment=scene.environment}
    this.turn=new THREE.Group();sc.add(this.turn);
    // podium, glowing ring and a soft contact shadow, all scaled to the vehicle on show
    this.pod=new THREE.Mesh(new THREE.CylinderGeometry(1,1.04,.08,64),new THREE.MeshStandardMaterial({color:0x0b171d,roughness:.62,metalness:.25}));this.pod.position.y=-.04;this.pod.receiveShadow=true;this.turn.add(this.pod);
    this.ring=new THREE.Mesh(new THREE.RingGeometry(.955,1,80),new THREE.MeshBasicMaterial({color:0xf2c14e,side:THREE.DoubleSide}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.003;this.turn.add(this.ring);
    const bc=document.createElement('canvas');bc.width=bc.height=128;const bx=bc.getContext('2d'),rg=bx.createRadialGradient(64,64,4,64,64,62);rg.addColorStop(0,'rgba(0,0,0,.6)');rg.addColorStop(1,'rgba(0,0,0,0)');bx.fillStyle=rg;bx.fillRect(0,0,128,128);
    this.blob=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(bc),transparent:true,depthWrite:false}));this.blob.rotation.x=-Math.PI/2;this.blob.position.y=.006;this.turn.add(this.blob);
    this.cam=new THREE.PerspectiveCamera(28,1,.1,80)},
  // ---- one vehicle on the stand (cached); returns {grp, L, W, H}
  model(e){if(this.cache[e.id])return this.cache[e.id];const grp=new THREE.Group();let L,W,H;
    if(e.car!==undefined){const t=CAR_T[e.car];t.geo.computeBoundingBox();
      const body=new THREE.InstancedMesh(t.geo,CAR_MAT,1);body.setMatrixAt(0,new THREE.Matrix4());body.setColorAt(0,new THREE.Color(1,1,1));body.frustumCulled=false;body.castShadow=true;grp.add(body);
      const wh=new THREE.InstancedMesh(t.wgeo,CAR_MAT,4);let q=0;for(const sx of [-1,1])for(const wz of t.wz)wh.setMatrixAt(q++,new THREE.Matrix4().makeTranslation(sx*t.wx,t.wr,wz));wh.setColorAt(0,new THREE.Color(1,1,1));wh.frustumCulled=false;wh.castShadow=true;grp.add(wh);
      L=t.L;W=t.W;H=t.geo.boundingBox.max.y;e.body=body}
    else{const v=new LiteVehicle(e.lite,0,0,0,{proxy:true});v.root.rotation.set(0,0,0);v.root.position.set(0,0,0);grp.add(v.root);v.root.traverse(m=>{if(m.isMesh){m.frustumCulled=false;m.castShadow=true}});
      grp.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(grp),c=b.getCenter(new THREE.Vector3());v.root.position.set(-c.x,-b.min.y,-c.z);L=b.max.z-b.min.z;W=b.max.x-b.min.x;H=b.max.y-b.min.y;e.v=v}
    return this.cache[e.id]={grp,L,W,H}},
  colOf(e){const c=this.cols[e.id];if(c!==undefined)return c;
    return (e.car!==undefined&&S.myCar&&S.myCar.type===e.car)?S.myCar.col:(e.col!==undefined?e.col:CAR_COLS[(e.car*5)%CAR_COLS.length])},
  paint(e,col){this.cols[e.id]=col;if(!e.body)return;e.body.setColorAt(0,new THREE.Color(col).convertSRGBToLinear());if(e.body.instanceColor)e.body.instanceColor.needsUpdate=true},
  show(i){this.build();const n=this.LIST.length;this.idx=(i%n+n)%n;const e=this.LIST[this.idx],M=this.model(e);
    if(this.shown)this.turn.remove(this.shown);this.turn.add(M.grp);this.shown=M.grp;this.cur=e;this.M=M;
    const R=Math.max(1.3,Math.hypot(M.L,M.W)/2*1.1);this.pod.scale.set(R,1,R);this.ring.scale.set(R,R,1);this.blob.scale.setScalar(R*.95);
    this.cur.span=M.H*1.75+.35;this.cur.wm=Math.hypot(M.L,M.W)*1.05;
    if(e.car!==undefined)this.paint(e,this.colOf(e));
    [...this.list.children].forEach((b,j)=>b.classList.toggle('on',j===this.idx));const on=this.list.children[this.idx];if(on&&on.scrollIntoView)try{on.scrollIntoView({block:'nearest',inline:'nearest'})}catch(x){}
    this.nameB.textContent=e.name;this.nameS.textContent=e.sub;this.go_.textContent=(e.car!==undefined?'Take it out':e.lite==='bike'?'Ride it':e.lite==='sub'?'Send for it':'Call it')+'  ▶';
    this.renderPanel(e);this.tYaw+=.4;this.hold=performance.now()},
  step(d){this.show(this.idx+d)},
  renderPanel(e){const P=this.panel;P.innerHTML='';
    if(e.car!==undefined){this.el('h3',null,'PAINT',P);const sw=this.el('div','crSw',null,P);sw.id='garSw';const cur=this.colOf(e);
      CAR_COLS.forEach(c=>{const b=this.el('button','crDot'+(c===cur?' on':''),'',sw);b.style.background=this.hex(c);b.setAttribute('aria-label','paint '+this.hex(c));b.onclick=()=>{this.paint(e,c);sw.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))}})}
    else{this.el('h3',null,'THIS ONE',P);this.el('p',null,e.lite==='sub'?'It waits at the harbour mooring — the map shows the way. Dive up to 150 m, then press E to get out.':e.lite==='bike'?'Brought to the nearest free spot. Press E to hop on, F lets a friend ride along.':'Brought to you, facing the road. Press E to get in; a friend can ride along — E / F beside it.',P)}
    this.el('h3',null,'HOW IT FEELS',P);[['Speed',e.st[0]],['Handling',e.st[1]],['Room',e.st[2]]].forEach(([k,v])=>{const r=this.el('div','garSt',null,P);this.el('span',null,k,r);const b=this.el('i',null,'',r);b.style.setProperty('--v',v*20+'%')})},
  canOpen(){if(!started)return false;
    if(HELI.on){toast('Land first','leave the helicopter before driving');return false}
    if(PASS.host){toast('Jump out first','press F');return false}
    if(MARINE.cur){toast('Get off the '+MARINE.cur.spec.name+' first','steer up to the quay or a beach');return false}
    if(EXT.cur){toast('Get off the '+EXT.cur.spec.name+' first','press E');return false}
    if(curIndoor){toast('Can\'t drive here','go outside first');return false}
    if(RIDE.on||PORTAL.cur)return false;return true},
  open(){if(this.on||(typeof CREATOR!=='undefined'&&CREATOR.on)||!this.canOpen())return;this.build();
    const last=this.LIST.findIndex(e=>e.id===S.garId);let i=last>=0?last:0;
    if(last<0&&S.myCar){const j=this.LIST.findIndex(e=>e.car===S.myCar.type);if(j>=0)i=j}
    this.on=true;this.root.hidden=false;document.body.classList.add('garOn');this._exp=renderer.toneMappingExposure;this._pr=renderer.getPixelRatio();    // the world may be drawn at a reduced resolution; one vehicle can afford the full one
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);this._t=0;this.zoom=1;this.hold=performance.now();
    this.spanC=2;this.wmC=4;this.yaw=this.tYaw=.7;this.show(i);
    for(const k of ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowLeft'])try{window.dispatchEvent(new KeyboardEvent('keyup',{code:k,key:k}))}catch(x){}},
  close(){if(!this.on)return;this.on=false;this.root.hidden=true;document.body.classList.remove('garOn');if(this._exp!==undefined)renderer.toneMappingExposure=this._exp;if(this._pr){renderer.setPixelRatio(this._pr);renderer.setSize(innerWidth,innerHeight)}},
  take(){const e=this.cur;if(!e)return;this.close();
    try{S.garId=e.id;if(e.car!==undefined)S.myCar={type:e.car,col:this.colOf(e)};saveS()}catch(x){}
    if(DRIVE.on)exitCar();
    if(e.car!==undefined){DRIVE.car=null;toggleCar()}else EXT.summon(e.lite)},
  frame(t){const dt=Math.min(.05,this._t?(t-this._t)/1000:.016);this._t=t;
    if(!this.drag&&performance.now()-this.hold>3000)this.tYaw+=dt*.6;     // the turntable keeps turning when nobody drags
    this.yaw+=(this.tYaw-this.yaw)*Math.min(1,dt*8);this.turn.rotation.y=this.yaw;
    const E=this.cur,W=innerWidth,H=innerHeight,s=this.stage.getBoundingClientRect(),cx=s.left+s.width/2,cy=s.top+s.height/2,f=Math.max(.2,Math.min(1,s.height/H));
    const k=Math.min(1,dt*6);this.spanC+=(E.span-this.spanC)*k;this.wmC+=(E.wm-this.wmC)*k;this.yC+=(this.M.H*.42-this.yC)*k;
    const c=this.cam;c.aspect=W/H;c.fov=28;c.setViewOffset(W,H,W/2-cx,H/2-cy,W,H);
    const tn=2*Math.tan(c.fov*Math.PI/360),d=Math.max(this.spanC/(tn*f),this.wmC/(tn*Math.max(.1,s.width/H)))*this.zoom;
    c.position.set(0,this.yC+d*.2,d);c.lookAt(0,this.yC,0);c.updateProjectionMatrix();
    if(E.v&&E.v.prop)E.v.prop.rotation.z+=dt*5;
    renderer.toneMappingExposure=1.02;renderer.info.reset();renderer.render(this.scene,c)}
};
