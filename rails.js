// rails.js — rides on a track (2026-11-16): one engine for the "Mega coaster" of Gorky Park (chain lift, a 29 m drop, a vertical loop, a camel-back, a brake run) and the water slide on the cruise ship.
//   RAILS.make({name, frame, pts, kind, ...}) builds the track from control points (frame-local metres; the frame is a Group: the world for the park, the ship's group for the slide, so a moving ship carries its slide),
//   samples it every 0.5 m (positions, tangents, a parallel-transport 'up' so the cart can go through the loop upside down) and the cart is driven by gravity along the tangent (energy), friction, a chain lift and a brake zone.
//   Ride: walk to the station, press the action button "Ride ...", the cart takes you, first person through the nose (View button: behind the cart); at the end you are put back beside the station.
const RAILS={on:false,tracks:[],cur:null,s:0,v:0,view:0,
  init(){if(this.inited)return;this.inited=1;const st=document.createElement('style');st.textContent=`body.railson #hud *{visibility:hidden}body.railson #joy,body.railson #joy *{visibility:visible}body.railson #actBtns,body.railson #bAct,body.railson #quickRow,body.railson #gunBar{display:none!important}   /* the stick (#joy) lives inside #hud and must stay: it drives */
#railHud{position:fixed;inset:0;z-index:39;pointer-events:none;font:700 12px var(--f-disp,system-ui);color:#e9f2f5}#railHud[hidden]{display:none}
#railInfo{position:absolute;left:max(14px,env(safe-area-inset-left));top:calc(14px + env(safe-area-inset-top,0px));padding:12px 14px;border-radius:12px;background:linear-gradient(180deg,#191c23,#07080b);border:1px solid rgba(255,255,255,.13);min-width:170px;line-height:1.6}#railInfo b{display:block;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#38e4d0}
#railBtns{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom,0px));display:flex;gap:10px;pointer-events:auto}#railBtns button{width:84px;height:84px;border-radius:14px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#e3edf1;font:800 12px var(--f-disp,system-ui);letter-spacing:.1em;text-transform:uppercase;touch-action:none}`;document.head.appendChild(st);
    const d=document.createElement('div');d.id='railHud';d.hidden=true;d.innerHTML='<div id="railInfo"><b id="railName"></b><span id="railTxt"></span></div><div id="railBtns"><button id="railView">View</button></div>';document.body.appendChild(d);this.el=d;
    d.querySelector('#railView').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();this.view^=1});
    addEventListener('keydown',e=>{if(this.on&&e.code==='KeyV'){this.view^=1}},true);
    const E={x:0,z:0,r:1e9,label:'Ride',cond:()=>{if(this.on||PORTAL.cur)return false;const t=this.near();if(t)E.label='Ride: '+t.name;return !!t},fn:()=>{const t=this.near();if(t)this.ride(t)}};INTERACT.push(E);
    const lab=document.getElementById('bAct');this._lab=lab},
  M(c,r,m){return new THREE.MeshStandardMaterial({color:new THREE.Color(c).convertSRGBToLinear(),roughness:r===undefined?.6:r,metalness:m||0,side:THREE.DoubleSide})},
  // control points -> equal-spaced samples with tangents and an up vector (parallel transport)
  sample(T){const V=THREE.Vector3,cv=new THREE.CatmullRomCurve3(T.pts.map(p=>new V(p[0],p[1],p[2])),false,'centripetal');cv.arcLengthDivisions=2400;T.L=cv.getLength();const N=Math.max(8,Math.ceil(T.L/.5));T.N=N;T.ds=T.L/N;const P=cv.getSpacedPoints(N);T.P=P;T.T=[];T.U=[];
    for(let i=0;i<=N;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(N,i+1)];T.T.push(b.clone().sub(a).normalize())}
    let up=new V(0,1,0);up.addScaledVector(T.T[0],-up.dot(T.T[0])).normalize();T.U.push(up.clone());
    for(let i=1;i<=N;i++){const q=new THREE.Quaternion().setFromUnitVectors(T.T[i-1],T.T[i]);up.applyQuaternion(q);up.addScaledVector(T.T[i],-up.dot(T.T[i])).normalize();T.U.push(up.clone())}
    // find the arc position (index) of a control point
    T.at=k=>{const p=T.pts[k],q=new V(p[0],p[1],p[2]);let bi=0,bd=1e9;for(let i=0;i<=N;i++){const d=P[i].distanceToSquared(q);if(d<bd){bd=d;bi=i}}return bi*T.ds}},
  make(T){this.init();this.sample(T);const g=T.frame,M=this.M.bind(this),V=THREE.Vector3;T.grp=new THREE.Group();g.add(T.grp);T.cart=new THREE.Group();
    const cb=new THREE.Mesh(new THREE.BoxGeometry(1.2,.45,1.9),M(T.kind==='slide'?0xffd23a:0xd9322a));cb.position.y=.22;T.cart.add(cb);const sb=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,.2),M(0x2b2f36));sb.position.set(0,.65,-.7);T.cart.add(sb);T.grp.add(T.cart);
    const from=T.visFrom||0,i0=Math.floor(T.at(from)/T.ds);
    if(T.kind==='slide'){const sub=T.P.slice(i0).filter((p,i)=>i%4===0);const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sub),Math.max(20,sub.length),1.05,12,false),new THREE.MeshStandardMaterial({color:new THREE.Color(T.col||0x2aa9ff).convertSRGBToLinear(),roughness:.25,metalness:.1,side:THREE.DoubleSide,transparent:true,opacity:.82}));T.grp.add(tube)}
    else{const rail=(o,c)=>{const pts=[];for(let i=i0;i<=T.N;i+=3){const u=T.U[i],t=T.T[i],r=new V().crossVectors(u,t).normalize();pts.push(T.P[i].clone().addScaledVector(r,o).addScaledVector(u,-.1))}return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*2,.07,5,false),M(c,.35,.6))};
      T.grp.add(rail(-.6,0xf2efe6),rail(.6,0xf2efe6));
      const sp=[];for(let i=i0;i<=T.N;i+=3){const u=T.U[i],t=T.T[i];sp.push(T.P[i].clone().addScaledVector(u,-.45))}T.grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp),sp.length*2,.16,6,false),M(0xc3262d)));
      const NS=Math.floor((T.N-i0)/2.4),sl=new THREE.InstancedMesh(new THREE.BoxGeometry(1.5,.08,.16),M(0x8c8a84),NS),m4=new THREE.Matrix4(),bs=new THREE.Matrix4();let k=0;
      for(let i=i0;i<=T.N&&k<NS;i+=Math.round(1.2/T.ds)){const u=T.U[i],t=T.T[i],r=new V().crossVectors(u,t).normalize();bs.makeBasis(r,u,t);bs.setPosition(T.P[i].x-u.x*.12,T.P[i].y-u.y*.12,T.P[i].z-u.z*.12);sl.setMatrixAt(k++,bs)}sl.count=k;T.grp.add(sl);
      // supports down to the ground
      g.updateMatrixWorld(true);const cols=[];for(let i=i0;i<=T.N;i+=Math.round(9/T.ds)){const wp=g.localToWorld(T.P[i].clone()),ly=g.worldToLocal(new V(wp.x,groundH(wp.x,wp.z),wp.z)).y,h=T.P[i].y-.55-ly;if(h>1)cols.push([T.P[i],ly,h])}
      const pil=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.3,1,7),M(0xe9e5da),cols.length+1);cols.forEach((c,i)=>{bs.compose(new V(c[0].x,c[1]+c[2]/2-.1,c[0].z),new THREE.Quaternion(),new V(1,c[2],1));pil.setMatrixAt(i,bs)});pil.count=cols.length;T.grp.add(pil)}
    // station
    const p0=T.P[0],pl=new THREE.Mesh(new THREE.BoxGeometry(T.kind==='slide'?3:5,.3,T.kind==='slide'?3:16),M(0x6b6f76,.9));pl.position.set(p0.x,p0.y-.7,p0.z+(T.kind==='slide'?0:-4));T.grp.add(pl);
    this.place(T,0);this.tracks.push(T);return T},
  // world position / basis of the cart at arc s
  state(T,s){const f=s/T.ds,i=Math.max(0,Math.min(T.N-1,Math.floor(f))),k=f-i,V=THREE.Vector3;const p=new V().lerpVectors(T.P[i],T.P[i+1],k),t=new V().lerpVectors(T.T[i],T.T[i+1],k).normalize(),u=new V().lerpVectors(T.U[i],T.U[i+1],k);u.addScaledVector(t,-u.dot(t)).normalize();return {p,t,u}},
  place(T,s){const S=this.state(T,s),r=new THREE.Vector3().crossVectors(S.u,S.t).normalize(),b=new THREE.Matrix4().makeBasis(r,S.u,S.t);T.cart.position.copy(S.p).addScaledVector(S.u,.05);T.cart.quaternion.setFromRotationMatrix(b)},
  startWorld(T){T.frame.updateMatrixWorld(true);return T.frame.localToWorld(T.P[0].clone())},
  near(){const t=performance.now();if(t-(this._nt||0)<120)return this._nv;this._nt=t;let r=null;
    for(const T of this.tracks){if(T.moving&&Math.hypot(T.frame.position.x-player.x,T.frame.position.z-player.z)>300)continue;const w=T.moving?this.startWorld(T):(T.sw||(T.sw=this.startWorld(T)));if(Math.abs(w.x-player.x)>12||Math.abs(w.z-player.z)>12)continue;if(Math.hypot(w.x-player.x,w.z-player.z)<(T.kind==='slide'?3.5:7)&&Math.abs(w.y-player.y)<5){r=T;break}}
    return this._nv=r},
  ride(T){if(this.on)return;this.cur=T;this.on=true;this.s=0;this.v=T.v0||2;this.view=T.kind==='slide'?0:0;document.body.classList.add('railson');this.el.hidden=false;document.getElementById('railName').textContent=T.name;PLR.root.visible=true;this._cam=null;toast(T.name,'hold on · V / View: change the camera')},
  end(){const T=this.cur;if(!T)return;this.on=false;this.cur=null;document.body.classList.remove('railson');this.el.hidden=true;PLR.root.visible=true;
    // put the rider beside the station (slide: on the deck by the pool)
    T.frame.updateMatrixWorld(true);const e=T.endLocal||T.P[T.N],w=T.frame.localToWorld(new THREE.Vector3(e[0],e[1],e[2]));player.x=w.x;player.z=w.z;player.y=T.kind==='slide'?w.y:Math.max(groundH(w.x,w.z),w.y-4);player.vx=player.vz=0;player.air=false;if(T.onEnd)T.onEnd(T);this.place(T,0);cam.init=false;toast(T.name,'again?')},
  frame(dt){const T=this.cur;if(!T)return;dt=Math.min(dt,.05);const L=T.L;
    const i=Math.min(T.N-1,Math.floor(this.s/T.ds)),t=T.T[i];let a=-9.8*t.y-.0006*this.v*Math.abs(this.v)*(T.kind==='slide'?2:1)-.15;
    const lift=T.lift&&this.s>=T.lift[0]&&this.s<=T.lift[1];
    if(lift){this.v=Math.max(this.v,T.liftV||3.8);if(this.v>(T.liftV||3.8)+.5)this.v-=3*dt;else this.v=T.liftV||3.8}else{this.v+=a*dt;if(this.s<L-(T.brake||0)-2)this.v=Math.max(this.v,T.minV||4.5)}
    if(T.brake&&this.s>L-T.brake)this.v=Math.max(1.6,this.v-(7)*dt);
    if(T.kind==='slide')this.v=Math.min(this.v,T.maxV||17);
    this.s+=this.v*dt;if(this.s>=L-.3){this.end();return}
    T.frame.updateMatrixWorld(true);const S=this.state(T,this.s),wp=T.frame.localToWorld(S.p.clone()),nm=new THREE.Matrix3().getNormalMatrix(T.frame.matrixWorld),wt=S.t.clone().applyMatrix3(nm).normalize(),wu=S.u.clone().applyMatrix3(nm).normalize(),wr=new THREE.Vector3().crossVectors(wu,wt).normalize();
    this.place(T,this.s);
    // the rider sits in the cart (sit pose), the avatar follows the cart
    const bq=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(wr,wu,wt));try{animPlayer(PLR,{spd:0,mode:'sit'},dt)}catch(e){}
    PLR.root.position.copy(wp).addScaledVector(wu,.1);PLR.root.quaternion.copy(bq);PLR.root.visible=!!this.view;player.x=wp.x;player.z=wp.z;player.y=wp.y;player.vx=player.vz=0;player.air=false;
    // camera
    const eye=wp.clone().addScaledVector(wu,1.45).addScaledVector(wt,.2);
    if(this.view){const c=wp.clone().addScaledVector(wt,-6.5).addScaledVector(wu,2.6);if(!this._cam)this._cam=c.clone();this._cam.lerp(c,Math.min(1,dt*6));camera.position.copy(this._cam);camera.up.set(0,1,0);camera.lookAt(wp.clone().addScaledVector(wt,6));}
    else{this._cam=null;camera.position.copy(eye);camera.up.copy(wu);camera.lookAt(eye.clone().addScaledVector(wt,10).addScaledVector(wu,-.4*Math.min(1,Math.abs(this.v)/20)));camera.up.set(0,1,0)}
    camera.fov=this.view?68:78;camera.updateProjectionMatrix();
    document.getElementById('railTxt').innerHTML=Math.round(this.v*3.6)+' km/h<br>height '+Math.max(0,Math.round(wp.y-groundH(wp.x,wp.z)))+' m · '+Math.round(this.s/L*100)+' %'},
  // LOD: tracks are only drawn near the player
  tick(dt){this._tt=(this._tt||0)-dt;if(this._tt>0)return;this._tt=.5;for(const T of this.tracks){const w=T.moving?(Math.hypot(T.frame.position.x-player.x,T.frame.position.z-player.z)>1500?null:this.startWorld(T)):(T.sw||(T.sw=this.startWorld(T)));T.grp.visible=!!w&&Math.hypot(w.x-player.x,w.z-player.z)<1100}}};

// ---- the Mega coaster of Gorky Park: an open flat site found south of the lake (-1020, -4630), 120 m along x
RAILS.gorky=function(){const x0=-1020,z0=-4630,g=new THREE.Group();g.position.set(x0,groundH(x0,z0),z0);scene.add(g);g.updateMatrixWorld(true);
  const P=[[-60,3,0],[-52,3,0],[-44,3.4,0],[-36,7,0],[-26,15,0],[-16,24,0],[-6,31,0],[2,34,0],[10,33.4,0],[16,30,0],[21,20,0],[25,9,0],[29,3.5,0]];
  const R=8;for(let k=0;k<=12;k++){const f=k*Math.PI/6;P.push([34+R*Math.sin(f),3.5+R-R*Math.cos(f),-4*f/(2*Math.PI)])}
  P.push([44,3.5,-4],[54,5,-4],[62,10,-4],[70,12,-4],[78,9,-4],[84,4,-4],[92,3.5,-10],[94,3.2,-22],[88,3.2,-32],[76,3.2,-36],[50,3.5,-36],[20,3.8,-36],[-10,3.5,-36],[-36,3.2,-34],[-52,3,-22],[-60,3,-8]);
  const T={name:'Mega coaster',frame:g,pts:P,kind:'coaster',v0:2,liftV:4.2,brake:45,minV:5};RAILS.make(T);T.lift=[T.at(2),T.at(9)];T.endLocal=[-58,3,-2];RAILS.gorkyT=T;return T};
