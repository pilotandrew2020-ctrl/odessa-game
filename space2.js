// space2.js — the owner's space list (2026-11-16), an extension of space.js / spaceint.js (loaded after them):
//   * SPEED: 100,000 m/s in space, 900 m/s in the atmosphere (over the Earth); the speed follows the throttle INSTANTLY (no slow ramp, instant brake), the throttle itself rises 6x faster.
//   * CAMERA: drag on the right side = orbit round the ship (any side, up / down / left / right), pinch or wheel = zoom in / out, all the way into the COCKPIT (look round inside); inside the stations / the ship the avatar can be seen walking, jumping and floating (third person, zoom to 0 for the eyes).
//   * FIGHTER LOOK: a blue aura, engine fire that grows with the throttle and lightning arcs round the hull while it flies.
//   * ISS: more rooms inside: crew beds, a bathroom, desks with computers and chairs, cabinets, cables and wires.
//   * Map: over the Earth (ascent / atmosphere) the minimap and the map button stay (space.js CSS).
const SPCX={};
Object.assign(SPC,{
  FV:{yaw:0,pitch:.17,dist:32},
  fvReset(){this.FV={yaw:0,pitch:.17,dist:32}},
  look(dx,dy){const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    if(this.mode==='fly'||this.mode==='atmo'){const F=this.FV;F.yaw-=dx*.006;F.pitch=clamp(F.pitch+dy*.005,-1.4,1.4);return}
    const V=this.V;if(!V||this.mode==='ascent')return;V.yaw-=dx*.006;V.pitch=clamp(V.pitch+dy*.005,-1.2,1.3)},
  zoom(d){const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    if(this.mode==='fly'||this.mode==='atmo'){const F=this.FV;F.dist=clamp(F.dist*(1+d*.0015)+(d>0?.01:-.01),0,160);return}
    const V=this.V;if(!V)return;V.dist=clamp(V.dist+d*.01,this.mode==='interior'?0:2.5,this.mode==='interior'?7:30)},
  // ---- the flight model: 100,000 m/s in space, 900 m/s in the atmosphere, speed = throttle x max at once
  flyStep(dt,atmo,alt){const C=this.C,I=this.in,q=C.q,sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0);
    q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(sy*1.05*dt,-sx*.9*dt,I.roll*1.5*dt,'XYZ'))).normalize();
    if(I.full)C.thr=1;else C.thr=Math.min(1,Math.max(0,C.thr+I.thr*dt*2));
    let vmax=atmo?Math.min(900,120+Math.max(0,alt)*.08):this.P.vmax;if(this.limit)vmax=Math.min(vmax,this.limit);
    C.sp=I.brake?0:C.thr*vmax;   // instant
    const f=new THREE.Vector3(0,0,1).applyQuaternion(q);C.w.x+=f.x*C.sp*dt;C.w.y+=f.y*C.sp*dt;C.w.z+=f.z*C.sp*dt;C.f=f;
    this.fxTick(dt,atmo);
    document.getElementById('spcSpd').textContent=(atmo?Math.round(C.sp*3.6)+' km/h':Math.round(C.sp).toLocaleString('en')+' m/s');document.getElementById('spcThr').style.width=(C.thr*100)+'%'},
  // ---- cameras: one function for both scenes; mode 'space' keeps the camera at the origin (floating origin), 'atmo' places it in the world
  fvCam(C,dt,space,sp){if(!C.cq)C.cq=C.q.clone();C.cq.slerp(C.q,1-Math.exp(-dt*6));const F=this.FV,cockpit=F.dist<3,V=THREE.Vector3;let off;
    if(cockpit)off=new V(0,.95,1.9);else{const cp=Math.cos(F.pitch),d=F.dist+Math.min(30,C.sp/(space?3500:90));off=new V(Math.sin(F.yaw)*cp*d,Math.sin(F.pitch)*d+2.2,-Math.cos(F.yaw)*cp*d)}
    off.applyQuaternion(C.cq);const up=new V(0,1,0).applyQuaternion(C.cq);let dir;
    if(cockpit)dir=new V(Math.sin(F.yaw)*Math.cos(F.pitch),Math.sin(F.pitch),Math.cos(F.yaw)*Math.cos(F.pitch)).applyQuaternion(C.cq);else dir=off.clone().negate();
    const m=this.fgtMesh,sm=this.shipMesh;if(sm)sm.visible=!cockpit;if(m&&m!==sm&&!space)m.visible=!cockpit;
    const eye=space?new V(0,0,0):new V(C.w.x+off.x-(sp?sp.x:0),C.w.y+off.y-(sp?sp.y:0),C.w.z+off.z-(sp?sp.z:0));
    if(space){this.cam.set(C.w.x+off.x,C.w.y+off.y,C.w.z+off.z);camera.position.set(0,0,0)}else camera.position.copy(eye);
    const mt=new THREE.Matrix4().lookAt(new V(0,0,0),dir.normalize(),up);camera.quaternion.setFromRotationMatrix(mt)},
  camSpace(dt,C){this.fvCam(C,dt,true,null);camera.near=.3;camera.updateProjectionMatrix()},
  camFollow(dt,cam,C,sp){this.fvCam(C,dt,false,sp)},
  // ---- the fighter's look: aura, fire, lightning (children of the ship mesh, built once per mesh)
  fxBuild(mesh){if(mesh.userData.fx)return mesh.userData.fx;const g=new THREE.Group(),V=THREE.Vector3;g.userData.t=0;mesh.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(mesh),sz=bb.getSize(new V()),L=Math.max(sz.x,sz.y,sz.z,6)/Math.max(mesh.scale.x,.001);
    const aura=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,uniforms:{uI:{value:0},uT:{value:0}},
      vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform float uI;uniform float uT;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.4);float w=.75+.25*sin(uT*9.+f*12.);gl_FragColor=vec4(vec3(.2,.55,1.)*(f*1.6*w)+vec3(.5,.8,1.)*f*f,f*uI);}'}));
    aura.scale.set(L*.55,L*.32,L*.75);g.add(aura);
    const fireMat=(c)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),fires=[];
    for(const s of [-1,1]){const o=new THREE.Mesh(new THREE.ConeGeometry(L*.035,1,12,1,true),fireMat(0xff8a2a));o.rotation.x=-Math.PI/2;o.position.set(s*L*.1,0,-L*.48);g.add(o);const i=new THREE.Mesh(new THREE.ConeGeometry(L*.02,1,10,1,true),fireMat(0x9fd8ff));i.rotation.x=-Math.PI/2;i.position.copy(o.position);g.add(i);fires.push(o,i)}
    const N=14,pos=new Float32Array(N*6*3),ln=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xbfe4ff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));ln.geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));ln.frustumCulled=false;g.add(ln);
    g.userData.aura=aura;g.userData.fires=fires;g.userData.ln=ln;g.userData.L=L;g.userData.N=N;g.visible=false;mesh.add(g);mesh.userData.fx=g;return g},
  fxTick(dt,atmo){const mesh=atmo?this.fgtMesh:this.shipMesh;if(!mesh||!this.C)return;this.fxUpdate(mesh,this.C.thr||0,Math.min(1,this.C.sp/(atmo?900:100000)),dt)},
  fxUpdate(mesh,thr,spd,dt){const g=this.fxBuild(mesh),U=g.userData;g.visible=true;U.t+=dt;
    const aur=U.aura.material.uniforms;aur.uI.value=.25+.55*Math.max(thr,spd);aur.uT.value=U.t;
    const L=U.L;U.fires.forEach((o,i)=>{const len=L*(.05+.55*thr)*(.8+.4*Math.random()),isIn=i%2===1;o.scale.set(1,len*(isIn?.7:1),1);o.position.z=-L*.48-len*(isIn?.35:.5)});
    if((U.lt=(U.lt||0)-dt)<=0){U.lt=.06;const p=U.ln.geometry.attributes.position,N=U.N,on=thr>.05;for(let b=0;b<N;b++){const th=Math.random()*6.283,ph=(Math.random()-.5)*2,r=L*.3,x0=Math.cos(th)*r*.8,y0=ph*r*.4,z0=(Math.random()-.5)*L*.9;let x=x0,y=y0,z=z0;for(let s=0;s<3;s++){const o=(b*3+s)*6,nx=x+(Math.random()-.5)*L*.12+Math.cos(th)*L*.08,ny=y+(Math.random()-.5)*L*.12,nz=z+(Math.random()-.5)*L*.12;
        p.array[o]=x;p.array[o+1]=y;p.array[o+2]=z;p.array[o+3]=on?nx:x;p.array[o+4]=on?ny:y;p.array[o+5]=on?nz:z;x=nx;y=ny;z=nz}}p.needsUpdate=true}},
  fxOff(){for(const m of [this.shipMesh,this.fgtMesh])if(m&&m.userData.fx)m.userData.fx.visible=false}});
{const _b=SPC.begin;SPC.begin=function(mode){const r=_b.call(this,mode);if(mode==='fly'||mode==='atmo')this.fvReset();return r}}
{const _l=SPC.leave;SPC.leave=function(){try{this.fxOff()}catch(e){}const m=this.shipMesh;if(m)m.visible=true;return _l.apply(this,arguments)}}
// pinch zoom on the look area
(function(){const wire=()=>{const lk=document.getElementById('spcLook');if(!lk||lk._pz)return false;lk._pz=1;const pts=new Map();let d0=0;
  lk.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const [a,b]=[...pts.values()];d0=Math.hypot(a[0]-b[0],a[1]-b[1])}});
  lk.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(d0)SPC.zoom(-(d-d0)*2.2);d0=d}});
  const up=e=>{pts.delete(e.pointerId);d0=0};lk.addEventListener('pointerup',up);lk.addEventListener('pointercancel',up);return true};
  const iv=setInterval(()=>{if(wire())clearInterval(iv)},1500)})();
SPC.P.vmax=1e5;

// ---- the ISS inside: crew beds, bathroom, desks + computers + chairs, cabinets, cables and wires
{const _bp=SPC.buildPod;SPC.buildPod=function(kind){const g=_bp.call(this,kind);if(kind!=='iss')return g;const B=(w,h,d,x,y,z,c,o)=>this.mkBox(g,w,h,d,x,y,z,c,o),E=(c)=>({e:c,ei:.9}),hd=10,hw=2.2;
  // crew sleeping pods at the far end (two beds with pillows and a blanket) and a privacy curtain
  for(const s of [-1,1]){B(1.0,.3,2.0,s*1.2,.45,8.6,0x3a4a6a,{solid:true});B(.9,.1,.5,s*1.2,.65,9.5,0xf2f2ee);B(1.0,.08,1.2,s*1.2,.62,8.2,0x2a6fd8);B(.04,1.6,2.0,s*.55,1.2,8.6,0x7a8aa8,{r:.9})}
  // bathroom cubicle (toilet, sink, mirror) on the left near the entrance
  B(.06,2.2,1.8,-1.45,1.3,-8.6,0xe9ecef,{solid:true});B(1.4,2.2,.06,-.75+-.0,1.3,-7.7,0xe9ecef,{solid:true});B(.5,.4,.6,-1.1,.35,-9.5,0xf4f4f4,{solid:true});B(.46,.5,.2,-1.1,.85,-9.8,0xf4f4f4);B(.5,.12,.4,-.45,1.0,-9.7,0xb9c4cf,{solid:true});B(.46,.5,.03,-.45,1.5,-9.9,0xaee3ff,{e:0x4a8aaa,ei:.3});
  // two desks with computers and chairs (the racks are free of the aisle: the desks stand against the right side)
  for(const z of [-3.2,2.4]){B(.9,.06,1.6,hw-1.2,.75,z,0x9aa3ad,{solid:true});B(.06,.75,1.5,hw-.8,.375,z,0x6a727c);B(.04,.42,.7,hw-.82,1.1,z,0x061018,E(0x38e4d0));B(.5,.03,.3,hw-1.35,.79,z-.3,0x222831);B(.4,.12,.28,hw-1.3,.82,z+.3,0x30353c);
    B(.5,.1,.5,hw-1.95,.5,z,0x2a2f3a);B(.08,.6,.5,hw-2.2,.82,z,0x2a2f3a);B(.06,.5,.06,hw-1.95,.25,z,0x555d68)}
  // overhead cabinets and a long locker wall along the left side
  for(let i=0;i<8;i++){B(.6,.5,1.2,-hw+.55,2.75,-8+i*2.1,i%2?0xdfe3e6:0xc9ced3,{solid:false});B(.02,.3,.5,-hw+.86,2.75,-8+i*2.1,0x1c232c)}
  // cables and wires: coloured tubes along the ceiling and down to the racks
  const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.6}),cs=[0xc0392b,0x2f6fb0,0xf2c230,0x222222,0x38e4d0,0xe9ecef];
  for(let i=0;i<14;i++){const z0=-9+i*1.35,s=i%2?1:-1,pts=[new THREE.Vector3(s*(hw-.6),2.3,z0),new THREE.Vector3(s*(hw-1.0),3.0,z0+.4),new THREE.Vector3(s*.3,3.05,z0+.9),new THREE.Vector3(-s*.8,3.0,z0+1.4),new THREE.Vector3(-s*(hw-.9),2.6,z0+1.6)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.022+.01*(i%3),5),mat(cs[i%6])))}
  for(let i=0;i<10;i++){const s=i%2?1:-1,z=-8+i*1.7;g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(s*(hw-.9),.15,z),new THREE.Vector3(s*(hw-1.3),.02,z+.3),new THREE.Vector3(s*(hw-1.6),.02,z+.8),new THREE.Vector3(s*(hw-1.0),.9,z+1.1)]),12,.03,5),mat(cs[(i+2)%6])))}
  return g}}

// ---- inside a station / the ship: third person by default (you see yourself walking, jumping, floating); zoom to 0 for the eyes. Jump (Space or the Jump button) floats in the low gravity of an orbiting station.
{const _ei=SPC.enterInt;SPC.enterInt=function(kind,ctx){const r=_ei.call(this,kind,ctx);if(this.V)this.V.dist=2.6;if(this.IN){this.IN.y=0;this.IN.vy=0;this.IN.ay=this.V?this.V.yaw:0}try{this.avatarIn(this.sc)}catch(e){}return r}}
{const _li=SPC.leaveInt;SPC.leaveInt=function(){const r=_li.apply(this,arguments);if(this.mode==='fly'&&PLR&&PLR.root)PLR.root.visible=false;return r}}
Object.assign(SPC,{
  intAct(){const IN=this.IN;if(!IN)return;if(!IN.use){if(IN.y<.08)IN.vy=Math.max(IN.vy,3.4);return}if(IN.use==='exit')this.leaveInt(false);else this.leaveInt(true)},
  intStep(dt){const IN=this.IN,pod=IN.pod,U=pod.userData,I=this.in,V=this.V;const sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0),len=Math.hypot(sx,sy),kk=len>1?1/len:1,ix=sx*kk,iy=sy*kk;
    const f=[-Math.sin(V.yaw),-Math.cos(V.yaw)],r=[Math.cos(V.yaw),-Math.sin(V.yaw)],air=IN.y>.05,spd=(I.thr>0?4:2.5)*(air?1.25:1),vx=(f[0]*iy+r[0]*ix)*spd,vz=(f[1]*iy+r[1]*ix)*spd;let nx=IN.x+vx*dt,nz=IN.z+vz*dt;const B=U.bounds;nx=Math.max(B[0],Math.min(B[1],nx));nz=Math.max(B[2],Math.min(B[3],nz));
    for(const o of U.obs){if(nx>o.x0&&nx<o.x1&&nz>o.z0&&nz<o.z1){const dl=nx-o.x0,dr=o.x1-nx,db=nz-o.z0,df=o.z1-nz,m=Math.min(dl,dr,db,df);if(m===dl)nx=o.x0;else if(m===dr)nx=o.x1;else if(m===db)nz=o.z0;else nz=o.z1}}
    // vertical: low gravity (floating), jump with Space
    if(I.jump&&IN.y<.08)IN.vy=Math.max(IN.vy||0,3.4);IN.vy=(IN.vy||0)-(IN.kind==='fighter'?2.2:.9)*dt;IN.y=(IN.y||0)+IN.vy*dt;if(IN.y<0){IN.y=0;IN.vy=0}const ceil=2.2;if(IN.y>ceil){IN.y=ceil;IN.vy=Math.min(0,IN.vy)}
    IN.x=nx;IN.z=nz;IN.bob=(IN.bob||0)+Math.hypot(vx,vz)*dt*2.2;const eye=1.65+IN.y+(IN.y>.05?0:Math.sin(IN.bob*2)*.02*Math.min(1,len));
    const w=U.w,d=V.dist||0;let cx=nx,cy=eye,cz=nz;
    if(d>.3){const cp=Math.cos(V.pitch),bx=Math.sin(V.yaw)*cp,bz=Math.cos(V.yaw)*cp,by=-Math.sin(V.pitch);cx=nx+bx*d;cz=nz+bz*d;cy=Math.max(.25,Math.min(2.95,eye+by*d+.35));cx=Math.max(B[0]-.2,Math.min(B[1]+.2,cx));cz=Math.max(B[2]-.2,Math.min(B[3]+.2,cz))}
    this.cam.set(w.x+cx,w.y+cy,w.z+cz);camera.position.set(0,0,0);
    if(d>.3){const tx=nx-cx,ty=eye-.25-cy,tz=nz-cz;camera.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0,0,0),new THREE.Vector3(tx,ty,tz),new THREE.Vector3(0,1,0)))}else camera.quaternion.setFromEuler(new THREE.Euler(V.pitch,V.yaw,0,'YXZ'));
    camera.near=.05;camera.updateProjectionMatrix();
    // the avatar
    const root=PLR&&PLR.root;if(root){root.visible=d>.3;if(d>.3){if(root.parent!==this.sc)this.avatarIn(this.sc);if(len>.1)IN.ay=Math.atan2(vx,vz);else if(IN.ay===undefined)IN.ay=V.yaw;
      try{animPlayer(PLR,{spd:Math.hypot(vx,vz),mode:IN.y>.05?'air':'walk'},dt)}catch(e){}root.position.set(w.x+nx-this.cam.x,w.y+IN.y-this.cam.y,w.z+nz-this.cam.z);root.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),IN.ay);root.scale.setScalar(1)}}
    const ex=U.exit,se=U.seat,nearE=Math.hypot(nx-ex.x,nz-ex.z)<1.7,nearS=se&&Math.hypot(nx-se.x,nz-se.z)<1.5;IN.use=nearE?'exit':nearS?'seat':null;
    const a=document.getElementById('spcAct');if(a){a.hidden=false;const k=IN.use||'jump',t=IN.use==='exit'?['🚪','Exit']:IN.use==='seat'?['🧑‍✈️','Pilot']:['⇱','Jump'];if(a.dataset.u!==k){a.dataset.u=k;a.innerHTML='<b>'+t[0]+'</b>'+t[1]}}
    document.getElementById('spcSpd').textContent=this.podSpec[IN.kind].title;document.getElementById('spcAlt').textContent=IN.use==='exit'?'Press Exit to go outside':IN.use==='seat'?'Press Pilot to take the controls':'Walk · Jump floats in the low gravity · drag to look · pinch to zoom (0 = your eyes)';document.getElementById('spcThr').style.width='0%'}});

// ---- more of the solar system: MERCURY (40,000 km out, craters, landable like the Moon), giant rocks along the way to the Moon, far planets in the sky (Venus, Mars, Jupiter, Saturn with rings), a glow on the ISS so every station can be seen from far away
{const _bs=SPC.buildSpace;SPC.buildSpace=async function(){const r=await _bs.apply(this,arguments);if(this._sx||!this.built)return r;this._sx=1;try{this.buildSolar()}catch(e){console.warn('[space2] solar',e)}return r}}
Object.assign(SPC,{
  rock(seed,size){let s=seed>>>0;const rn=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296},g=new THREE.IcosahedronGeometry(1,3),p=g.attributes.position,v=new THREE.Vector3(),n=[];for(let i=0;i<8;i++)n.push([rn()*6,rn()*6,rn()*6,.15+rn()*.3]);
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();let d=1;for(const q of n)d+=Math.sin(v.x*3.1+q[0])*Math.sin(v.y*2.7+q[1])*Math.sin(v.z*3.3+q[2])*q[3]*.5;d+=(rn()-.5)*.04;v.multiplyScalar(d*size);p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g},
  planetTex(kind){const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
    if(kind==='mercury'){g.fillStyle='#8a8580';g.fillRect(0,0,1024,512);for(let i=0;i<4000;i++){g.fillStyle=`rgba(${90+Math.random()*80|0},${86+Math.random()*70|0},${80+Math.random()*60|0},.12)`;g.fillRect(Math.random()*1024,Math.random()*512,2+Math.random()*10,2+Math.random()*6)}
      for(let i=0;i<260;i++){const x=Math.random()*1024,y=40+Math.random()*430,r=3+Math.pow(Math.random(),3)*46;const q=g.createRadialGradient(x,y,r*.1,x,y,r);q.addColorStop(0,'rgba(60,57,54,.55)');q.addColorStop(.8,'rgba(70,66,62,.35)');q.addColorStop(.92,'rgba(200,196,190,.45)');q.addColorStop(1,'rgba(200,196,190,0)');g.fillStyle=q;g.beginPath();g.arc(x,y,r,0,6.283);g.fill()}}
    else if(kind==='jupiter'){for(let y=0;y<512;y++){const t=y/512,b=Math.sin(t*38)*.5+Math.sin(t*91)*.25;g.fillStyle=`rgb(${190+b*45|0},${150+b*40|0},${105+b*35|0})`;g.fillRect(0,y,1024,1)}g.fillStyle='rgba(180,70,40,.7)';g.beginPath();g.ellipse(640,330,60,32,0,0,6.283);g.fill()}
    else if(kind==='saturn'){for(let y=0;y<512;y++){const b=Math.sin(y/512*30)*.5;g.fillStyle=`rgb(${215+b*20|0},${190+b*20|0},${140+b*20|0})`;g.fillRect(0,y,1024,1)}}
    else if(kind==='mars'){g.fillStyle='#b5552e';g.fillRect(0,0,1024,512);for(let i=0;i<1500;i++){g.fillStyle=`rgba(${90+Math.random()*60|0},${40+Math.random()*30|0},${20+Math.random()*20|0},.2)`;g.fillRect(Math.random()*1024,Math.random()*512,3+Math.random()*30,3+Math.random()*12)}g.fillStyle='rgba(255,255,255,.7)';g.fillRect(0,0,1024,26);g.fillRect(0,486,1024,26)}
    else{g.fillStyle='#e8d6a8';g.fillRect(0,0,1024,512);for(let i=0;i<500;i++){g.fillStyle=`rgba(255,${230+Math.random()*25|0},${180+Math.random()*40|0},.15)`;g.fillRect(Math.random()*1024,Math.random()*512,40+Math.random()*120,3+Math.random()*10)}}
    const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t},
  buildSolar(){const sc=this.sc,V=THREE.Vector3;this.bodies=[];
    const add=(o,w)=>{o.userData.w=w;this.reg.push(o);sc.add(o)};
    // Mercury: 456 km radius (0.38 of the Earth's), 40,000 km from the Earth, a different direction from the Moon
    const mer=new THREE.Mesh(new THREE.SphereGeometry(1,96,48),new THREE.MeshStandardMaterial({map:this.planetTex('mercury'),roughness:1,metalness:0}));mer.scale.setScalar(4.56e5);const MC=new V(-.72,.12,.68).normalize().multiplyScalar(4e7);add(mer,MC);this.merM=mer;
    this.bodies=[{id:'moon',name:'Moon',c:this.M,R:this.P.moonR,mesh:this.moonM,g:1.62},{id:'mercury',name:'Mercury',c:MC,R:4.56e5,mesh:mer,g:3.7}];
    // giant rocks near the road to the Moon (100 - 400 km across)
    const rm=new THREE.MeshStandardMaterial({color:0x7a746c,roughness:1,flatShading:true});this.rocks=[];
    for(let i=0;i<9;i++){const t=.12+i*.09,side=new V(Math.sin(i*2.3),Math.cos(i*1.7),Math.sin(i*3.1+1)).normalize(),size=(55+((i*37)%90))*1000,pos=this.M.clone().multiplyScalar(t).addScaledVector(side,(700+((i*53)%500))*1000);const m=new THREE.Mesh(this.rock(11+i*7,size),rm);m.rotation.set(i,i*1.3,i*.7);add(m,pos);this.rocks.push(m)}
    // ISS glow: visible from anywhere
    const gl=document.createElement('canvas');gl.width=gl.height=64;const gg=gl.getContext('2d'),q=gg.createRadialGradient(32,32,0,32,32,32);q.addColorStop(0,'rgba(255,255,255,1)');q.addColorStop(.25,'rgba(160,210,255,.8)');q.addColorStop(1,'rgba(160,210,255,0)');gg.fillStyle=q;gg.fillRect(0,0,64,64);
    this.issGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(gl),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false}));this.issGlow.renderOrder=9;sc.add(this.issGlow);
    // the other planets: discs in the sky (fixed directions, they never get closer)
    this.sky=[];const P=(kind,dir,ang,ring)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),new THREE.MeshBasicMaterial({map:this.planetTex(kind),fog:false}));m.userData={dir:new V(...dir).normalize(),ang};m.renderOrder=-5;sc.add(m);this.sky.push(m);
      if(ring){const r=new THREE.Mesh(new THREE.RingGeometry(1.35,2.3,64),new THREE.MeshBasicMaterial({color:0xcdb68a,side:THREE.DoubleSide,transparent:true,opacity:.7,fog:false}));r.rotation.x=1.25;m.add(r)}return m};
    P('venus',[.5,.2,.8],.012);P('mars',[-.3,.35,-.9],.01);P('jupiter',[.9,-.1,-.4],.03);P('saturn',[-.8,.3,.45],.024,true)},
  skyTick(){if(!this.sky||!this.cam)return;for(const m of this.sky){const D=5.2e7,u=m.userData;m.position.copy(u.dir).multiplyScalar(D);m.scale.setScalar(Math.tan(u.ang/2)*D)}
    if(this.issGlow&&this.issM){const w=this.issM.userData.w,d=Math.hypot(w.x-this.cam.x,w.y-this.cam.y,w.z-this.cam.z);this.issGlow.position.set(w.x-this.cam.x,w.y-this.cam.y,w.z-this.cam.z);this.issGlow.scale.setScalar(Math.max(60,d*.012));this.issGlow.visible=d>2500}},
  // pick the body the ship is nearest to (the landing / limit code works on this.M / P.moonR / this.moonM)
  useBody(){if(!this.bodies||this.lgP||!this.C)return;let best=null,bd=1e30;for(const b of this.bodies){const d=this.C.w.distanceTo(b.c)-b.R;if(d<bd){bd=d;best=b}}if(best&&this.curBody!==best){this.curBody=best;this.M=best.c;this.P.moonR=best.R;this.moonM=best.mesh;this.P.g=best.g;this.bodyName=best.name}}});
{const _fr=SPC.frame;SPC.frame=function(dt){if(this.mode==='fly')this.useBody();if(this.merM&&this.curBody&&this.curBody.id!=='mercury')this.merM.rotation.y+=dt*.002;const r=_fr.call(this,dt);this.skyTick();return r}}
{const _hd=SPC.hud;SPC.hud=function(alt,body){_hd.call(this,alt,body);const a=document.getElementById('spcAlt');if(!a)return;const nm=this.bodyName||'Moon';
  if(this.mode==='fly'){a.textContent=a.textContent.replace(/^Moon/,nm);if(this.issM&&this.C){const w=this.issM.userData.w,d=Math.hypot(this.C.w.x-w.x,this.C.w.y-w.y,this.C.w.z-w.z);a.textContent+=' · Station '+(d>=1e6?(d/1e3).toFixed(0)+' km':d>=1e3?(d/1e3).toFixed(1)+' km':Math.round(d)+' m')}}
  else if(this.mode==='moon'||this.mode==='landed')a.textContent=a.textContent.replace('Gravity 1.62',nm+' · gravity '+(this.P.g||1.62))}}

// ---- on the Moon: the Earth's vehicles (scooter, bicycle, motorcycle, helicopter, light plane) from the Vehicles panel; they feel the Moon's gravity (jumps are huge), the helicopter / plane fly (hold Jump = up)
Object.assign(SPC,{
  VEH:{scooter:{n:'Scooter',v:9,j:6.5,fly:0},bicycle:{n:'Bicycle',v:12,j:7,fly:0},moto:{n:'Motorcycle',v:30,j:8,fly:0},heli:{n:'Helicopter',v:32,j:0,fly:1},plane:{n:'Light plane',v:75,j:0,fly:2}},
  vehMesh(k){const g=new THREE.Group(),M=(c,r,m)=>new THREE.MeshStandardMaterial({color:c,roughness:r===undefined?.6:r,metalness:m||0}),B=(w,h,d,x,y,z,c)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));q.position.set(x,y,z);g.add(q);return q},
      W=(r,x,y,z,t)=>{const q=new THREE.Mesh(new THREE.CylinderGeometry(r,r,t||.08,16),M(0x151515,.9));q.rotation.z=Math.PI/2;q.position.set(x,y,z);g.add(q);return q};
    if(k==='scooter'){B(.16,.05,.8,0,.14,0,0x2a8de0);B(.04,.9,.04,0,.55,.4,0x888888);B(.4,.04,.04,0,1.0,.4,0x222222);W(.1,0,.1,.42);W(.1,0,.1,-.4)}
    else if(k==='bicycle'){W(.33,0,.33,.55,.04);W(.33,0,.33,-.55,.04);B(.04,.04,1.0,0,.6,0,0xc23a35);B(.04,.4,.04,0,.5,-.1,0xc23a35);B(.5,.04,.04,0,1.0,.5,0x222222);B(.12,.04,.25,0,.95,-.3,0x222222)}
    else if(k==='moto'){W(.33,0,.33,.7,.12);W(.33,0,.33,-.7,.14);B(.28,.35,1.0,0,.65,0,0xc0392b);B(.3,.12,.55,0,.9,-.3,0x1b1b1d);B(.6,.04,.04,0,1.1,.55,0x222222);B(.08,.6,.08,0,.7,.62,0x888888)}
    else if(k==='heli'){const b=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),M(0x3a7ad8));b.scale.set(.9,.8,1.8);b.position.y=1.2;g.add(b);B(.2,.2,3.2,0,1.4,-3.2,0x3a7ad8);const r=B(7,.04,.3,0,2.3,0,0x222222);g.userData.rotor=r;B(.1,.5,.1,0,2.05,0,0x333333);B(.08,.08,2.2,.6,.2,0,0x333333);B(.08,.08,2.2,-.6,.2,0,0x333333)}
    else{const f=new THREE.Mesh(new THREE.CylinderGeometry(.45,.3,5,12),M(0xdadde0));f.rotation.x=Math.PI/2;f.position.y=1.1;g.add(f);B(9,.1,1.3,0,1.2,.3,0xdadde0);B(3,.08,.8,0,1.3,-2.3,0xdadde0);B(.08,1.1,.8,0,1.8,-2.3,0xc23a35);const p=B(.1,2.2,.12,0,1.1,2.55,0x222222);g.userData.rotor=p;W(.22,.9,.3,.9);W(.22,-.9,.3,.9);W(.2,0,.25,-1.9)}
    g.traverse(o=>{if(o.isMesh)o.castShadow=false});return g},
  vehPanel(on){if(!this._vp){const d=document.createElement('div');d.id='spcVeh';d.style.cssText='position:fixed;left:max(14px,env(safe-area-inset-left));top:calc(120px + env(safe-area-inset-top,0px));z-index:41;display:flex;flex-direction:column;gap:6px';d.hidden=true;
      d.innerHTML='<div style="font:700 11px var(--f-disp,system-ui);letter-spacing:.2em;color:#38e4d0">VEHICLES</div>'+Object.entries(this.VEH).map(([k,v])=>`<button data-v="${k}">${v.n}</button>`).join('')+'<button data-v="off">On foot</button>';
      d.querySelectorAll('button').forEach(b=>{b.style.cssText='min-width:118px;height:42px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#e3edf1;font:800 12px var(--f-disp,system-ui);letter-spacing:.08em;text-align:left'});
      d.addEventListener('click',e=>{const v=e.target.dataset&&e.target.dataset.v;if(v)this.ride(v==='off'?null:v)});document.body.appendChild(d);this._vp=d}this._vp.hidden=!on},
  ride(k){const M=this.M2;if(!M)return;if(M.vm){M.vm.parent&&M.vm.parent.remove(M.vm);M.vm=null}M.veh=k?this.VEH[k]:null;M.vk=k;if(!k){this.msg('On foot','',1200);return}M.vm=this.vehMesh(k);this.sc.add(M.vm);M.vz=0;if(this.VEH[k].fly){M.air=true;M.vy=0}this.msg(this.VEH[k].n,this.VEH[k].fly?'hold Jump to climb · the stick steers':'Jump hops very high here',2200)},
  // movement with a vehicle (the walking code of moonStep, with the vehicle's speed and flight)
  rideStep(dt){const M=this.M2,I=this.in,V=this.V,Z=M.veh,P=this.P;const sx=Math.abs(I.lx)>.04?I.lx:(I.kx||0),sy=Math.abs(I.ly)>.04?I.ly:(I.ky||0),len=Math.hypot(sx,sy),kk=len>1?1/len:1,ix=sx*kk,iy=sy*kk,mag=Math.min(1,len);
    const f=[-Math.sin(V.yaw),-Math.cos(V.yaw)],r=[Math.cos(V.yaw),-Math.sin(V.yaw)];let vx=(f[0]*iy+r[0]*ix)*Z.v,vz=(f[1]*iy+r[1]*ix)*Z.v;if(Z.fly===2){const a=Math.atan2(vx||Math.sin(M.yaw),vz||Math.cos(M.yaw));vx=Math.sin(M.yaw)*Z.v*(.4+.6*mag);vz=Math.cos(M.yaw)*Z.v*(.4+.6*mag)}
    M.x+=vx*dt;M.z+=vz*dt;const d=Math.hypot(M.x,M.z);if(d>1700){M.x*=1700/d;M.z*=1700/d}const gy=this.hg(M.x,M.z);
    if(Z.fly){if(I.jump)M.vy=Math.min(10,(M.vy||0)+16*dt);else M.vy=Math.max(-6,(M.vy||0)-6*dt);if(Z.fly===1&&!I.jump&&mag<.05)M.vy*=.9;M.y+=M.vy*dt;if(M.y<=gy+.2&&M.vy<0){M.y=gy+.2;M.vy=0}if(M.y>600)M.y=600;M.air=M.y>gy+.4}
    else{if(I.jump&&!M.air){M.vy=Z.j;M.air=true}M.vy-=P.g*dt;M.y+=M.vy*dt;if(M.y<=gy){M.y=gy;M.vy=0;M.air=false}}
    if(mag>.05||Z.fly===2){const yw=Math.atan2(vx,vz);M.yaw+=((((yw-M.yaw+Math.PI)%(2*Math.PI))+2*Math.PI)%(2*Math.PI)-Math.PI)*Math.min(1,dt*(Z.fly?2.5:6))}
    const root=PLR.root,sit=Z.fly?.35:Z.v>20?.45:.3;if(!this.noAnim)try{animPlayer(PLR,{spd:0,mode:'sit'},dt)}catch(e){}
    this.lcam(new THREE.Vector3(M.x,M.y+1.5,M.z),Math.max(V.dist,Z.fly?9:5));
    const base=this.L.clone().sub(this.cam).add(new THREE.Vector3(M.x,M.y,M.z).applyQuaternion(this.qF)),q=this.qF.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),M.yaw)),up=new THREE.Vector3(0,sit,0).applyQuaternion(q);
    root.position.copy(base).add(up);root.quaternion.copy(q);if(M.vm){M.vm.position.copy(base);M.vm.quaternion.copy(q);if(M.vm.userData.rotor)M.vm.userData.rotor.rotation.y+=dt*(M.air||Z.fly?40:0)}
    const near=Math.hypot(M.x,M.z)<9?1:0;if(near!==this._near){this._near=near;const a=document.getElementById('spcAct');if(a)a.innerHTML=near?'<b>🚀</b>Board':'<b>⇱</b>Jump'}
    document.getElementById('spcSpd').textContent=Math.round(Math.hypot(vx,vz)*3.6)+' km/h · '+Z.n;document.getElementById('spcThr').style.width='0%'}});
{const _ms=SPC.moonStep;SPC.moonStep=function(dt){if(this.M2&&this.M2.veh)return this.rideStep(dt);return _ms.call(this,dt)}}
{const _sh=SPC.setHud;SPC.setHud=function(mode){const r=_sh.call(this,mode);this.vehPanel(mode==='moon');if(mode!=='moon'&&this.M2&&this.M2.vm){this.ride(null)}return r}}
{const _ex=SPC.exitShip;SPC.exitShip=function(){const r=_ex.apply(this,arguments);if(this.M2)this.M2.fuel=100;return r}}
// getting into the ship with a vehicle: leave the vehicle first
{const _a=SPC.act;SPC.act=function(){const M=this.M2;if(this.mode==='moon'&&M&&M.veh){if(Math.hypot(M.x,M.z)<9)this.ride(null);else{if(!M.veh.fly&&!M.air){M.vy=M.veh.j;M.air=true}return}}return _a.apply(this,arguments)}}

// ================================================================= URANUS, rock collisions, DOCKING, FLYING TOGETHER (2026-11-16)
SPC.URL.uranus='assets/models/space/uranus.glb';
// ---- Uranus (the owner's model: planet, cloud shell, rings): a gas giant 55,000 km out, no surface (the ship is pushed out of its atmosphere)
{const _bsol=SPC.buildSolar;SPC.buildSolar=function(){_bsol.call(this);this.shipTpl=this.shipMesh.clone(true);this.rs=this.rs||{};this.gas=[];this.loadUranus()}}
Object.assign(SPC,{
  async loadUranus(){try{const u=(await this.load('uranus')).clone(true),R=2.4e6,k=R/44106;const g=new THREE.Group();g.add(u);g.scale.setScalar(k);u.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;const m=o.material;if(/clouds/i.test(o.name)){m.transparent=true;m.opacity=.35;m.depthWrite=false;m.transmission=0}
        if(/ring/i.test(o.name)){m.transparent=true;m.opacity=1;m.alphaTest=.02;m.depthWrite=false;m.side=THREE.DoubleSide}else m.side=THREE.FrontSide});
      const c=new THREE.Vector3(.4,-.08,.91).normalize().multiplyScalar(5.0e7);g.userData.w=c;this.reg.push(g);this.sc.add(g);this.uranusM=g;this.gas.push({id:'uranus',name:'Uranus',c,R:R*1.0,atm:2.6e4,mesh:g});console.log('[space] Uranus ready')}catch(e){console.warn('[space] uranus',e)}},
  // gas giants: slow down near them, never fly through
  gasGuard(){if(!this.gas||!this.C||this.mode!=='fly')return;const C=this.C;for(const b of this.gas){const d=C.w.distanceTo(b.c)-b.R;this.limit2=d<9e4?Math.max(40,40+d*.05):0;if(d<b.atm){const n=C.w.clone().sub(b.c).normalize();C.w.copy(b.c).addScaledVector(n,b.R+b.atm);C.sp=0;if(!this._gm||performance.now()-this._gm>4000){this._gm=performance.now();this.msg(b.name,'a gas giant: there is no surface, the ship turns back',2600)}}}},
  // giant rocks are solid
  rockGuard(){if(!this.rocks||!this.C||this.mode!=='fly')return;const C=this.C;for(const m of this.rocks){const c=m.userData.w,r=m.userData.rad;if(!c)continue;const d=C.w.distanceTo(c);if(d<r+40){const n=C.w.clone().sub(c).normalize();C.w.copy(c).addScaledVector(n,r+40);if(C.sp>200){FX&&(FX.shakeT=.6,FX.shakeA=.15);this.msg('Collision','you hit an asteroid · the ship stops',2000)}C.sp=0;C.thr=0}}},
  // ---- docking: the autopilot flies you to the station and parks you next to it (the STATION button still teleports)
  stationDist(){if(!this.issM||!this.C)return 1e30;const w=this.issM.userData.w;return Math.hypot(this.C.w.x-w.x,this.C.w.y-w.y,this.C.w.z-w.z)},
  dock(){if(this.mode!=='fly'||this.dk)return;const C=this.C,d=this.stationDist();if(d>6e5){this.msg('Dock','fly closer to the station first (within 600 km)',2400);return}
    const Y=new THREE.Vector3(0,1,0),end=new THREE.Vector3(70,6,-38),q1=new THREE.Quaternion().setFromAxisAngle(Y,2.6);this.dk={t:0,dur:Math.max(6,Math.min(16,d/40000+6)),p0:C.w.clone(),q0:C.q.clone(),p1:end,q1,p2:new THREE.Vector3(60,40,-300)};C.thr=0;C.sp=0;this.msg('Docking','autopilot: hands off the controls',2600)},
  dockTick(dt){const D=this.dk,C=this.C;if(!D)return false;D.t+=dt/D.dur;const u=Math.min(1,D.t),e=u*u*(3-2*u);
    // a smooth curve: from where you are, past a point 300 m off the station, into the berth
    const a=D.p0,b=D.p2,c=D.p1,v=new THREE.Vector3().copy(a).multiplyScalar((1-e)*(1-e)).addScaledVector(b,2*(1-e)*e).addScaledVector(c,e*e);C.w.copy(v);C.q.slerpQuaternions(D.q0,D.q1,e);C.sp=(1-u)*3000;this.fxTick(dt,false);
    if(u>=1){this.dk=null;C.sp=0;C.thr=0;C.w.copy(D.p1);C.q.copy(D.q1);C.cq=null;this.shipMesh.visible=true;sc_attach(this);this.startEva(new THREE.Vector3(36,3,-96));this.msg('Docked','the ship is berthed · you are on a spacewalk by the station',2600)}return true},
  extraUI(){if(this._xu)return;const d=document.createElement('div');d.id='spcX';d.style.cssText='position:fixed;right:max(16px,env(safe-area-inset-right));top:calc(120px + env(safe-area-inset-top,0px));z-index:41;display:flex;flex-direction:column;gap:6px;align-items:flex-end';document.body.appendChild(d);this._xu=d;
    d.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.k;if(!k)return;if(k==='dock')this.dock();else if(k==='leave')this.leavePax();else if(k.startsWith('join:'))this.join(k.slice(5))})},
  extraTick(dt){this.extraUI();this._xt=(this._xt||0)-dt;if(this._xt>0)return;this._xt=.4;const d=this._xu;if(!this.space||!this.on){d.innerHTML='';return}
    const btn=(k,t)=>`<button data-k="${k}" style="min-width:140px;height:44px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,#191c23,#07080b);color:#38e4d0;font:800 12px var(--f-disp,system-ui);letter-spacing:.08em">${t}</button>`;let h='';
    if(this.mode==='fly'&&!this.dk&&this.stationDist()<6e5)h+=btn('dock','DOCK · '+(this.stationDist()>=1e3?(this.stationDist()/1e3).toFixed(0)+' km':Math.round(this.stationDist())+' m'));
    if(this.mode==='pax')h+=btn('leave','LEAVE THE SHIP');
    if(this.mode==='fly'||this.mode==='eva'){for(const [id,R] of this.remoteShips())h+=btn('join:'+id,'JOIN '+String(R.st.n||'friend').toUpperCase());}
    if(this.mode==='fly'){const pax=[...this.peersOnBoard(this.myId())].map(R=>R.st.n||'friend');if(pax.length)h+=`<div style="font:700 11px var(--f-disp,system-ui);color:#e9f2f5;background:#0b0e13;padding:8px 10px;border-radius:10px">On board: ${pax.join(', ')}</div>`}
    d.innerHTML=h},
  // ---- co-op: your ship is in your presence packet (st.sx); friends in space see it, and can climb aboard as passengers (3 more seats)
  myId(){try{return COOP.myId||'me'}catch(e){return 'me'}},
  coopState(){if(!this.space||!this.on||!this.C)return null;const r=v=>Math.round(v*10)/10;
    if(this.mode==='pax'&&this.pax)return [0,0,0,0,0,0,0,1,0,this.pax.peer,this.pax.seat];
    if(this.mode==='fly'||this.mode==='eva'||this.mode==='interior'){const C=this.C;return [1,r(C.w.x),r(C.w.y),r(C.w.z),+C.q.x.toFixed(4),+C.q.y.toFixed(4),+C.q.z.toFixed(4),+C.q.w.toFixed(4),+(C.thr||0).toFixed(2),this.mode==='fly'?1:0]}return null},
  peers(){try{return COOP&&COOP.peers?COOP.peers:new Map()}catch(e){return new Map()}},
  remoteShips(){const o=[];for(const [id,R] of this.peers()){const a=R&&R.st&&R.st.sx;if(!a||a[0]!==1||!this.C)continue;const d=Math.hypot(this.C.w.x-a[1],this.C.w.y-a[2],this.C.w.z-a[3]);if(d<2e6)o.push([id,R])}return o},
  peersOnBoard(host){const o=new Set();for(const [id,R] of this.peers()){const a=R&&R.st&&R.st.sx;if(a&&a[0]===0&&a[9]===host)o.add(R)}return o},
  join(id){const R=this.peers().get(id);if(!R||!R.st.sx||R.st.sx[0]!==1)return;const used=new Set();for(const [i2,R2] of this.peers()){const a=R2.st&&R2.st.sx;if(a&&a[0]===0&&a[9]===id)used.add(a[10])}let seat=1;while(used.has(seat)&&seat<4)seat++;if(seat>3){this.msg('Full','all 4 seats are taken',2000);return}
    this.pax={peer:id,seat};this.paxC={w:new THREE.Vector3(R.st.sx[1],R.st.sx[2],R.st.sx[3]),q:new THREE.Quaternion(R.st.sx[4],R.st.sx[5],R.st.sx[6],R.st.sx[7]),sp:0,thr:0,seat};this.paxHome=this.C.w.clone();this.mode='pax';this.setHud('eva');document.getElementById('spcMode').textContent='Passenger · seat '+(seat+1);
    for(const b of document.querySelectorAll('#spcBtns [data-k]'))b.hidden=true;this.shipMesh.visible=false;if(PLR&&PLR.root)PLR.root.visible=false;this.fvReset();try{COOP.push(true)}catch(e){}this.msg('Aboard','you are a passenger of '+(R.st.n||'a friend')+' · drag to look round, pinch to zoom, the cockpit view puts you in your seat',3200)},
  leavePax(why){if(this.mode!=='pax')return;const P=this.paxC;this.mode='fly';this.pax=null;this.C.w.copy(P.w).add(new THREE.Vector3(0,12,-45).applyQuaternion(P.q));this.C.q.copy(P.q);this.C.cq=null;this.C.sp=0;this.C.thr=0;this.shipMesh.visible=true;this.setHud('fly');this.msg('You left the ship',why||'',2200);try{COOP.push(true)}catch(e){}},
  paxFrame(dt){const R=this.peers().get(this.pax.peer),a=R&&R.st&&R.st.sx;if(!a||a[0]!==1)return this.leavePax('the pilot left');const P=this.paxC;P.w.lerp(new THREE.Vector3(a[1],a[2],a[3]),Math.min(1,dt*10));P.q.slerp(new THREE.Quaternion(a[4],a[5],a[6],a[7]),Math.min(1,dt*10));P.thr=a[8];P.sp=a[8]*1e5;
    this.remoteTick(dt);this.camSpace(dt,P);const rm=this.rs[this.pax.peer];if(rm)rm.visible=this.FV.dist>=3;if(this.shipMesh)this.shipMesh.visible=false;
    this.cam.copy(this.cam);for(const o of this.reg)this.place(o);this.stars.position.set(0,0,0);this.sunSp.position.copy(this.S).multiplyScalar(4e7);this.sun.position.copy(this.S).multiplyScalar(1000);this.sun.target.position.set(0,0,0);this.earth.rotation.y+=dt*.004;this.skyTick();
    document.getElementById('spcSpd').textContent=Math.round(P.sp).toLocaleString('en')+' m/s';document.getElementById('spcAlt').textContent='Passenger of '+(R.st.n||'a friend')+' · seat '+(P.seat+1)+'/4';document.getElementById('spcThr').style.width=(P.thr*100)+'%';renderer.info.reset();renderer.render(this.sc,camera)},
  // other players' ships (a clone of the fighter in the space scene, smoothed)
  remoteTick(dt){this.rs=this.rs||{};const seen=new Set();for(const [id,R] of this.peers()){const a=R&&R.st&&R.st.sx;if(!a||a[0]!==1||!this.shipTpl)continue;seen.add(id);let m=this.rs[id];if(!m){m=this.shipTpl.clone(true);m.userData.w=new THREE.Vector3(a[1],a[2],a[3]);m.quaternion.set(a[4],a[5],a[6],a[7]);this.reg.push(m);this.sc.add(m);this.rs[id]=m;
        const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='rgba(8,12,18,.7)';x.fillRect(0,0,256,64);x.fillStyle='#38e4d0';x.font='bold 30px system-ui';x.textAlign='center';x.fillText(String(R.st.n||'friend').slice(0,14),128,42);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true,fog:false}));sp.renderOrder=10;m.userData.tag=sp;this.sc.add(sp)}
      m.visible=true;m.userData.w.lerp(new THREE.Vector3(a[1],a[2],a[3]),Math.min(1,dt*10));m.quaternion.slerp(new THREE.Quaternion(a[4],a[5],a[6],a[7]),Math.min(1,dt*10));this.fxUpdate(m,a[8]||0,a[8]||0,dt);
      const cam=this.cam,w=m.userData.w,d=Math.hypot(w.x-cam.x,w.y-cam.y,w.z-cam.z),tg=m.userData.tag;tg.position.set(w.x-cam.x,w.y-cam.y+12+d*.004,w.z-cam.z);tg.scale.set(Math.max(40,d*.07),Math.max(10,d*.0175),1);tg.visible=d<3e6&&!(this.mode==='pax'&&id===this.pax.peer&&this.FV.dist<3)}
    for(const id of Object.keys(this.rs))if(!seen.has(id)){const m=this.rs[id];this.sc.remove(m);if(m.userData.tag)this.sc.remove(m.userData.tag);this.reg=this.reg.filter(o=>o!==m);delete this.rs[id]}}});
// the frame: guards, docking, remote ships, passengers
{const _f=SPC.frame;SPC.frame=function(dt){if(this.mode==='pax'&&this.built)return this.paxFrame(dt);
  if(this.mode==='fly'){this.limit2=0;if(this.dk){this.dockTick(dt)}else{this.gasGuard();this.rockGuard()}}
  if(this.built)this.remoteTick(dt);this.extraTick(dt);return _f.call(this,dt)}}
// the flight model honours the extra limit near gas giants and stays put while the autopilot docks
{const _fs=SPC.flyStep;SPC.flyStep=function(dt,atmo,alt){if(this.dk){document.getElementById('spcSpd').textContent=Math.round(this.C.sp).toLocaleString('en')+' m/s · docking';return}const lim=this.limit;if(!atmo&&this.limit2)this.limit=this.limit?Math.min(this.limit,this.limit2):this.limit2;const r=_fs.call(this,dt,atmo,alt);this.limit=lim;return r}}
// rocks know their radius; the presence packet carries the ship
{const _bs2=SPC.buildSolar;SPC.buildSolar=function(){_bs2.call(this);this.rocks.forEach((m,i)=>{m.geometry.computeBoundingSphere();m.userData.rad=m.geometry.boundingSphere.radius*.92})}}
