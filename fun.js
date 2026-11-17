/* ===================================================================================================
   fun.js (2026-11-15) — three things from the owner's list:
   • COASTER  the Gorky Park roller coaster: a closed steel track (chain lift to 24 m, a drop, a vertical loop, a banked helix, a camel back),
              a two-car train that runs by energy (slow on the lift, fast in the valleys), you ride it in first person. ~7,600 triangles in 3 meshes.
   • ROOF     a landing pad on the roof of the home block: aircraft treat the roof as ground there (Plane.groundY), you can walk on it,
              "Take the stairs down" / "Go up to the roof pad" connect it with the yard. A map place "Rooftop landing pad".
   • the aircraft camera has a THIRD mode: chase -> cockpit -> free (an orbit round the aircraft that you turn by dragging), key O / the HUD camera button.
   Needs arsenal.js (MODE). Hook: FUN.init() at boot.
   =================================================================================================== */
const COASTER={g:null,u:0,v:0,on:false,laps:0,N:420,
  // control points in the ride's own frame (x right, y up, z forward), metres
  PTS:[[0,1.3,0],[0,1.3,14],[0,3,24],[0,24,58],[0,25,66],[4,22,74],[14,6,84],[24,2.2,80],[30,2.2,66],[30,8,56],[30,17,52],[30,20,44],[30,14,37],[30,5,40],[30,2.2,30],[28,3,14],[20,7,2],[9,9,-6],[0,7,-16],[-10,5,-12],[-14,3.2,0],[-10,2,10],[-12,7,24],[-16,2.2,36],[-12,1.6,44],[-6,1.4,30],[-3,1.3,-14]],
  site(){const c=PLACES.find(p=>p.id==='gorkyrides')||{x:-1105,z:-4700};let best=null;
    for(const [dx,dz] of [[60,-70],[-80,-60],[70,40],[-90,30],[0,-110],[0,90],[130,0],[-140,0]]){const x=c.x+dx,z=c.z+dz;let bad=0;for(let a=-20;a<=36;a+=8)for(let b=-20;b<=88;b+=9){const px=x+a,pz=z+b;if(insideAny(px,pz,1.2,groundH(px,pz)+1)||groundH(px,pz)<SL+.3)bad++}if(!best||bad<best[2])best=[x,z,bad]}return best},
  build(){if(this.g)return;const [ox,oz]=this.site();this.ox=ox;this.oz=oz;const gy=this.gy=groundH(ox,oz);const g=this.g=new THREE.Group();g.position.set(ox,gy,oz);scene.add(g);TREE_CLEAR.push(ox+8,oz+34,58);
    const curve=this.curve=new THREE.CatmullRomCurve3(this.PTS.map(p=>new THREE.Vector3(p[0],p[1],p[2])),true,'catmullrom',.5),N=this.N,F=this.F=[];let up=new THREE.Vector3(0,1,0);
    for(let i=0;i<N;i++){const p=curve.getPointAt(i/N),t=curve.getTangentAt(i/N).normalize();up=up.clone().addScaledVector(t,-up.dot(t));if(up.lengthSq()<1e-6)up.set(0,1,0);up.normalize();
      const flat=new THREE.Vector3(0,1,0).addScaledVector(t,-t.y);if(Math.abs(t.y)<.55&&flat.lengthSq()>.01)up.lerp(flat.normalize(),.12).normalize();   // level out again after the loop
      F.push({p,t,up:up.clone(),b:new THREE.Vector3().crossVectors(t,up).normalize()})}
    this.len=curve.getLength();let top=0;for(const f of F)top=Math.max(top,f.p.y);this.top=top;
    // rails: two square tubes; ties; all one indexed geometry
    const pos=[],idx=[],ring=(f,off,r)=>{const c=f.p.clone().addScaledVector(f.b,off);for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const v=c.clone().addScaledVector(f.b,a*r).addScaledVector(f.up,b*r);pos.push(v.x,v.y,v.z)}};
    for(const off of [-.55,.55]){const base=pos.length/3;for(let i=0;i<N;i++)ring(F[i],off,.07);for(let i=0;i<N;i++){const a=base+i*4,b=base+((i+1)%N)*4;for(let k=0;k<4;k++){const k2=(k+1)%4;idx.push(a+k,b+k,b+k2,a+k,b+k2,a+k2)}}}
    const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));rg.setIndex(idx);rg.computeVertexNormals();const rails=new THREE.Mesh(rg,MBM.std(0xc2242b,.45,.5));rails.castShadow=true;g.add(rails);
    const mb=new MB();for(let i=0;i<N;i+=3){const f=F[i],a=f.p.clone().addScaledVector(f.b,-.62).addScaledVector(f.up,-.1),b=f.p.clone().addScaledVector(f.b,.62).addScaledVector(f.up,-.1);mb.rod('tie',.05,[a.x,a.y,a.z],[b.x,b.y,b.z],4)}
    for(let i=0;i<N;i+=10){const f=F[i];if(f.p.y>2.4&&f.up.y>.3)mb.rod('sup',.14,[f.p.x,-.3,f.p.z],[f.p.x,f.p.y-.25,f.p.z],6)}
    mb.bx('plat',-3.4,-.95,0,1.0,-12,12,3);mb.bx('plat',.95,3.4,0,1.0,-12,12,3);mb.bx('roofc',-3.6,3.6,3.9,4.05,-9,9,2);for(const [x,z] of [[-3.3,-8.6],[3.3,-8.6],[-3.3,8.6],[3.3,8.6]])mb.rod('sup',.09,[x,1,z],[x,3.9,z],6);
    mb.build(g,{tie:MBM.std(0x33363a,.7,.4),sup:MBM.std(0xe8e8e2,.6,.2),plat:MBM.std(0x8a8f96,.9),roofc:MBM.std(0x1f6f8a,.7)});
    // the train: two cars
    const car=()=>{const c=new THREE.Group(),cb=new MB();cb.bx('body',-.6,.6,.12,.7,-1.0,1.0,1);cb.bx('seat',-.5,.5,.3,1.05,-.85,-.65,1);cb.bx('seat',-.5,.5,.3,.42,-.6,.5,1);cb.bx('bar',-.55,.55,.78,.84,.35,.42,1);cb.build(c,{body:MBM.std(0xf2c230,.5,.2),seat:MBM.std(0x1b1d22,.8),bar:MBM.std(0xd0d4d8,.3,.8)});g.add(c);return c};this.cars=[car(),car()];
    this.place(0);
    INTERACT.push({x:ox-2.2,z:oz,r:4.5,label:'Ride the roller coaster',cond:()=>!window.NOWALK&&!PORTAL.cur&&!player.sit,fn:()=>this.board()});
    PLACES.push({id:'coaster',name:'Roller coaster',sub:'Gorky Park · lift, drop, loop, helix',x:ox-2.4,z:oz-3,yaw:0});
    ANIM.push(dt=>this.update(dt))},
  at(u){const N=this.N,x=((u%1)+1)%1*N,i=Math.floor(x)%N,j=(i+1)%N,k=x-Math.floor(x),A=this.F[i],B=this.F[j];return {p:A.p.clone().lerp(B.p,k),t:A.t.clone().lerp(B.t,k).normalize(),up:A.up.clone().lerp(B.up,k).normalize()}},
  place(u){this.cars.forEach((c,n)=>{const f=this.at(u-n*2.3/this.len);c.position.copy(f.p).addScaledVector(f.up,.12);const m=new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(f.up,f.t).normalize(),f.up,f.t);c.quaternion.setFromRotationMatrix(m)})},
  board(){this.on=true;this.laps=0;this.u=0;this.v=0;this.wait=1.2;MODE.enter('coaster',[['GET OFF',()=>this.off()]],true);toast('Roller coaster','hold tight · two laps');ARS.snd(700,300,.2,.2,'bandpass')},
  off(){if(!this.on)return;this.on=false;MODE.leave();camera.up.set(0,1,0);player.x=this.ox-2.2;player.z=this.oz;player.y=groundH(player.x,player.z)+1.0;player.vy=0;this.u=0;this.v=0;this.place(0)},
  update(dt){if(!this.g)return;if(!this.on){if(Math.hypot(player.x-this.ox,player.z-this.oz)>260)return;return}
    if(this.wait>0){this.wait-=dt}else{const f=this.at(this.u),lift=f.p.y<this.top-1.2&&f.t.y>.25&&this.u<.25,want=lift?5.2:Math.sqrt(9+2*9.8*Math.max(0,this.top-f.p.y)*.86);
      this.v+=(want-this.v)*Math.min(1,dt*(lift?2:1.6));if(this.u>.93&&this.laps>=1)this.v=Math.min(this.v,3+(1-this.u)*120);
      this.u+=this.v*dt/this.len;if(this.u>=1){this.u-=1;this.laps++;if(this.laps>=2){this.off();toast('Roller coaster','again?');return}}
      this.ck=(this.ck||0)-dt;if(lift&&this.ck<=0){this.ck=.16;ARS.snd(1800,900,.03,.12,'bandpass')}else if(!lift&&this.ck<=0){this.ck=.12;ARS.snd(200+this.v*18,120,.12,Math.min(.3,this.v*.012))}}
    this.place(this.u);const f=this.at(this.u),e=f.p.clone().addScaledVector(f.up,1.25).addScaledVector(f.t,-.2),l=e.clone().addScaledVector(f.t,8).addScaledVector(f.up,-.6),o=this.g.position;
    window.DBGCAM=[o.x+e.x,o.y+e.y,o.z+e.z,o.x+l.x,o.y+l.y,o.z+l.z];camera.up.copy(f.up);player.x=o.x+f.p.x;player.z=o.z+f.p.z;player.y=o.y+f.p.y}};

const ROOF={cp:null,
  init(){if(this.cp||typeof STATIC_POLYS==='undefined')return;const h=PLACES[0];let best=null,bd=1e9;for(const cp of STATIC_POLYS){const cx=(cp.minx+cp.maxx)/2,cz=(cp.minz+cp.maxz)/2,d=Math.hypot(cx-h.x,cz-h.z);if(d<bd&&d<160&&cp.top-groundH(cx,cz)>6){bd=d;best=cp}}if(!best)return;
    const cp=this.cp=best,top=this.top=cp.top+.05;let cx=0,cz=0,n=0;const a=cp.rings[0];for(let i=0;i<a.length;i+=2){cx+=a[i];cz+=a[i+1];n++}cx/=n;cz/=n;if(!polyInside(cp.rings,cx,cz)){cx=(cp.minx+cp.maxx)/2;cz=(cp.minz+cp.maxz)/2}this.x=cx;this.z=cz;
    // walk on the roof (only when you are already up there), and aircraft land on it
    holdSpecial((x,z,y)=>{if(y<top-1.6||x<cp.minx||x>cp.maxx||z<cp.minz||z>cp.maxz||!polyInside(cp.rings,x,z))return null;return {h:top,pri:30,surf:'stone'}});
    if(typeof Plane!=='undefined'&&!Plane.prototype._roof){Plane.prototype._roof=1;const o=Plane.prototype.groundY;Plane.prototype.groundY=function(){const g=o.call(this);return ROOF.over(this.x,this.z,this.y+3)?Math.max(g,ROOF.top):g}}
    const g=new THREE.Group(),mb=new MB();g.position.set(cx,top,cz);mb.cyl('pad',7,7,.04,28,0,.02,0);mb.cyl('ring',7.4,7.4,.03,28,0,.01,0);mb.bx('h',-2.1,-1.5,.04,.06,-2.6,2.6);mb.bx('h',1.5,2.1,.04,.06,-2.6,2.6);mb.bx('h',-1.5,1.5,.04,.06,-.35,.35);
    for(let k=0;k<8;k++){const an=k/8*6.283;mb.cyl('lamp',.12,.12,.25,6,Math.cos(an)*7.9,.12,Math.sin(an)*7.9)}mb.rod('pole',.05,[8.6,0,0],[8.6,3.2,0],5);mb.box('sock',.9,.35,.35,9.1,3.0,0);mb.bx('hut',-9.6,-8,0,2.3,-1,1,1);
    mb.build(g,{pad:MBM.std(0x3a3d42,.9),ring:MBM.std(0xf2c230,.6),h:MBM.std(0xffffff,.6),lamp:MBM.emis(0x38e4d0,1.6),pole:MBM.std(0xd0d0d0,.5,.5),sock:MBM.std(0xe8642a,.8),hut:MBM.std(0x8f9aa3,.8)});scene.add(g);this.g=g;
    PLACES.push({id:'roofpad',name:'Rooftop landing pad',sub:'on the home block · land a plane or the helicopter here',x:cx-4,z:cz,yaw:0,roof:1});
    INTERACT.push({x:cx-8.8,z:cz,r:2.6,label:'Take the stairs down',cond:()=>player.y>top-1&&!window.NOWALK,fn:()=>{teleport(PLACES[0])}});
    INTERACT.push({x:h.x,z:h.z,r:3.2,label:'Go up to the roof pad',cond:()=>player.y<top-3&&!window.NOWALK&&!PORTAL.cur&&!player.sit,fn:()=>this.up()})},
  over(x,z,y){const cp=this.cp;return !!cp&&y>this.top-.5&&x>cp.minx&&x<cp.maxx&&z>cp.minz&&z<cp.maxz&&polyInside(cp.rings,x,z)},
  up(){const f=document.getElementById('fade');if(f)f.style.opacity=1;setTimeout(()=>{teleportRaw(this.x-6,this.z,0);setTimeout(()=>{player.x=this.x-6;player.z=this.z;player.y=this.top+.05;player.vy=0;player.air=false;if(f)f.style.opacity=0},500)},350)}};

const FUN={init(){if(this.ok)return;this.ok=1;try{COASTER.build()}catch(e){console.warn('[coaster]',e)}try{ROOF.init()}catch(e){console.warn('[roof]',e)}
    // aircraft: chase -> cockpit -> free orbit
    if(typeof PLN!=='undefined'&&!PLN.nextCam){PLN.nextCam=function(){this.camMode=this.camMode==='chase'?'cockpit':this.camMode==='cockpit'?'free':'chase';toast('Camera',this.camMode==='free'?'free · drag to look round the aircraft':this.camMode)};
      PLN.free=function(p){if(!p||!p.root||!p.validState||!p.validState())return false;const d=p.kind==='airliner'?62:p.kind==='fighter'?26:13,cp=Math.cos(cam.pitch||0),sp=Math.sin(cam.pitch||0);if(!Number.isFinite(cam.yaw))cam.yaw=p.yaw;
        camera.position.set(p.x-Math.sin(cam.yaw)*cp*d,p.y+2+Math.max(-.2,sp+.18)*d,p.z-Math.cos(cam.yaw)*cp*d);camera.lookAt(p.x,p.y+1.5,p.z);cam.x=camera.position.x;cam.y=camera.position.y;cam.z=camera.position.z;cam.init=true;return true};
      for(const k of ['platCamera','camera','stepCamera','flyCamera']){const o=PLN[k];if(typeof o!=='function')continue;PLN[k]=function(p,...a){if(this.camMode==='free'){const q=(p&&p.root)?p:(this.activePlane&&this.activePlane());if(q&&(k!=='platCamera'||(a[1]&&a[1].seat&&a[1].seat.cockpit&&a[1].seat.helm))&&this.free(q))return true}return o.call(this,p,...a)}}}}};
window.COASTER=COASTER;window.ROOF=ROOF;window.FUN=FUN;
