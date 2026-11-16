// moonx.js — round 18 (2026-11-16): the owner's "walk on the Moon / Uranus, spawn things there, the Lunokhod, a faster trip to Uranus". Loaded after space2.js (extension pattern: wraps SPC methods).
//   * TRAVEL (button in the space HUD, flying or on a spacewalk): MOON / MERCURY / URANUS jump you straight onto the surface and let you out at once (no hunting for the landing).
//   * URANUS is landable now: a gas giant has no real ground, so it gets a pale-ice crust (a made-up surface, lighter gravity than the real one: 3 m/s2).
//   * WARP: 20% of the speed of light (60,000,000 m/s) far from every body, slows down by itself near one (so the Uranus trip, 50,000 km, takes ~50 s instead of ~8 min).
//   * VEHICLES on a world: + Lunokhod-2 (the owner's GLB) and a rover car; a vehicle you leave stays parked where it is (it is still there when you come back by TRAVEL to the same place).
SPC.URL.luna='assets/models/space/lunokhod.glb';
Object.assign(SPC,{
  LUNA:{len:3.4,front:1},
  lunaMesh(){const g=new THREE.Group();this.load('luna').then(s=>{if(g.userData.done)return;g.userData.done=1;if(g.userData.ph)g.remove(g.userData.ph);const m=s.clone(true),drop=[];m.traverse(o=>{if(o.name==='Floor')drop.push(o)});drop.forEach(o=>o.parent&&o.parent.remove(o));
      m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3()),k=this.LUNA.len/Math.max(sz.x,sz.z),c=b.getCenter(new THREE.Vector3());const w=new THREE.Group();m.position.set(-c.x,-b.min.y,-c.z);w.add(m);w.scale.setScalar(k);w.rotation.y=this.LUNA.rot||0;g.add(w)}).catch(e=>console.warn('[moonx] lunokhod',e));
    const ph=new THREE.Mesh(new THREE.BoxGeometry(1.6,.6,2.4),new THREE.MeshStandardMaterial({color:0x9a9a9a}));ph.position.y=.5;g.add(ph);g.userData.ph=ph;return g},
  carMesh(){const g=new THREE.Group(),M=(c,r)=>new THREE.MeshStandardMaterial({color:c,roughness:r===undefined?.5:r}),B=(w,h,d,x,y,z,c)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));q.position.set(x,y,z);g.add(q);return q};
    B(1.9,.55,4.2,0,.75,0,0xd9d9de);B(1.7,.5,2.0,0,1.25,-.3,0x2c3a4a);B(1.95,.12,.5,0,.5,2.0,0x444444);for(const x of [-1,1])for(const z of [-1.4,1.4]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.32,16),M(0x151515,.9));w.rotation.z=Math.PI/2;w.position.set(x*1.0,.42,z);g.add(w)}return g},
  // ---- parked vehicles: the one you leave stays where it stands (same landing place only: the world is a patch built round the landing)
  parked:[],
  parkTick(){if(!this.parked.length)return;const ho=this.ho||{x:0,z:0};for(const p of this.parked){const ok=this.lgP&&this.curBody&&this.curBody.id===p.body&&this.n&&this.n.dot(p.n)>.99999&&!(this.M2&&this.M2.vm===p.m);p.m.visible=!!ok;if(!ok)continue;
      const x=p.px-ho.x,z=p.pz-ho.z,y=this.hg(x,z);p.m.position.copy(this.L).sub(this.cam).add(new THREE.Vector3(x,y,z).applyQuaternion(this.qF));p.m.quaternion.copy(this.qF).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw))}},
});
{const _vm=SPC.vehMesh;SPC.vehMesh=function(k){if(k==='luna')return this.lunaMesh();if(k==='car')return this.carMesh();return _vm.call(this,k)}}
Object.assign(SPC.VEH,{luna:{n:'Lunokhod',v:16,j:2.5,fly:0},car:{n:'Rover car',v:42,j:3.2,fly:0}});
{const _l=SPC.lcam;SPC.lcam=function(t,d){const r=_l.call(this,t,d);this.parkTick();return r}}
{const _r=SPC.ride;SPC.ride=function(k){const M=this.M2;if(!M)return _r.call(this,k);const old=M.vm,ok=M.vk,pose={x:M.x,z:M.z,yaw:M.yaw};let again=null;
  if(k)again=this.parked.find(p=>p.k===k&&p.m!==old&&this.curBody&&p.body===this.curBody.id&&Math.hypot(p.px-this.ho.x-M.x,p.pz-this.ho.z-M.z)<9);
  const r=_r.call(this,k);
  if(old&&ok){this.sc.add(old);const ho=this.ho||{x:0,z:0};this.parked.push({m:old,k:ok,px:pose.x+ho.x,pz:pose.z+ho.z,yaw:pose.yaw,body:this.curBody?this.curBody.id:'moon',n:this.n?this.n.clone():new THREE.Vector3(0,1,0)})}
  if(again&&M.vm){this.sc.remove(M.vm);M.vm=again.m;this.parked=this.parked.filter(p=>p!==again);M.x=again.px-(this.ho.x||0);M.z=again.pz-(this.ho.z||0);M.yaw=again.yaw}
  return r}}
// ---- Uranus: a landable world (pale ice crust), no more "the ship turns back"
{const _lu=SPC.loadUranus;SPC.loadUranus=async function(){await _lu.call(this);const i=(this.gas||[]).findIndex(b=>b.id==='uranus');if(i<0)return;const b=this.gas.splice(i,1)[0];this.bodies.push({id:'uranus',name:'Uranus',c:b.c,R:b.R,mesh:b.mesh,g:3,tint:0xa9e6ee})}}
{const _p=SPC.prep;SPC.prep=function(n){const r=_p.apply(this,arguments);const t=this.curBody&&this.curBody.tint;if(t&&this.lgc){this.lgc[0].material.color.setHex(t);this.lgc[1].material.color.setHex(0xbfe9f0)}return r}}
// ---- helicopter-style flying: dragging the view turns the nose; the buttons are named like the helicopter's; Shift = down, Space = up
{const _lk=SPC.look;SPC.look=function(dx,dy){if(this.mode==='fly'||this.mode==='atmo'){this.C.q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(dy*.004,-dx*.005,0,'XYZ'))).normalize();return}return _lk.call(this,dx,dy)}}
{const _k=SPC.key;SPC.key=function(e,dn){if(this.on&&(this.mode==='fly'||this.mode==='atmo')&&(e.code==='ShiftLeft'||e.code==='ShiftRight'||e.code==='ControlLeft'||e.code==='ControlRight')){this.in.thr=dn?-1:0;e.preventDefault();e.stopPropagation();return}return _k.call(this,e,dn)}}
{const _h=SPC.setHud;SPC.setHud=function(mode){const r=_h.call(this,mode);if(!this._lbl){const b=k=>document.querySelector('#spcBtns [data-k="'+k+'"]');if(b('thrUp')&&b('rollL')){this._lbl=1;b('thrUp').innerHTML='<b>▲</b>Up';b('thrDn').innerHTML='<b>▼</b>Down';b('rollL').innerHTML='<b>◀</b>Turn';b('rollR').innerHTML='<b>▶</b>Turn';b('full').innerHTML='<b>⚡</b>Fwd'}}return r}}
// ---- WARP
{const _w=SPC.flyStep;SPC.flyStep=function(dt,atmo,alt){if(this.warp&&!atmo&&!this.dk&&this.C){const P=this.P,v0=P.vmax,C=this.C;let dm=C.w.distanceTo(this.E)-P.earthR;for(const b of this.bodies||[])dm=Math.min(dm,C.w.distanceTo(b.c)-b.R);for(const m of this.rocks||[]){const c=m.userData.w;if(c)dm=Math.min(dm,C.w.distanceTo(c)-(m.userData.rad||1e5))}
      P.vmax=Math.min(this.WARPV,Math.max(v0,dm*2));let r;try{r=_w.call(this,dt,atmo,alt)}finally{P.vmax=v0}
      if(C.sp>2e6){const e=document.getElementById('spcSpd');if(e)e.textContent=(C.sp/2.998e8*100).toFixed(1)+'% of light speed'}return r}return _w.call(this,dt,atmo,alt)}}
// Uranus is 1,000,000 km away, past the camera's far plane: far away it is drawn smaller and nearer (same angular size), like the other planets in the sky
{const _pl=SPC.place;SPC.place=function(o){if(o!==this.uranusM)return _pl.call(this,o);const w=o.userData.w,dx=w.x-this.cam.x,dy=w.y-this.cam.y,dz=w.z-this.cam.z,d=Math.hypot(dx,dy,dz),LIM=3.5e7;if(!o.userData.s0)o.userData.s0=o.scale.x;
  if(d>LIM){const k=LIM/d;o.position.set(dx*k,dy*k,dz*k);o.scale.setScalar(o.userData.s0*k)}else{o.position.set(dx,dy,dz);o.scale.setScalar(o.userData.s0)}}}
SPC.WARPV=6e7;   // 20% of the speed of light
// ---- TRAVEL
Object.assign(SPC,{
  travel(id){if(!['fly','eva','moon','landed'].includes(this.mode))return;const b=(this.bodies||[]).find(q=>q.id===id);if(!b)return;this._tm=0;
    this.flash(1,300);setTimeout(()=>{if(!this.on)return;
      if(this.M2&&this.M2.vm)this.ride(null);if(this.mode!=='fly'){this.mode='fly';if(PLR)PLR.root.visible=false}
      this.lgP=0;if(this.lg)this.lg.visible=false;this.dk=null;this.curBody=b;this.M=b.c;this.P.moonR=b.R;this.moonM=b.mesh;this.P.g=b.g;this.bodyName=b.name;
      const n=new THREE.Vector3(.25,.93,.27).normalize();this.C.w.copy(b.c).addScaledVector(n,b.R+60);this.C.sp=0;this.C.thr=0;this.C.cq=null;
      this.prep(n);this.land(n,{x:0,z:0});this.exitShip();this.flash(0,700);this.msg(b.name,'you are standing on it · walk with the stick, Jump hops',3500)},340)},
  tmx(){this.extraUI();const d=this._xu;if(!d)return;
    if(!this._tb){d.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.k;if(!k)return;if(k==='tmenu'){this._tm=!this._tm;this._xt=0}else if(k.startsWith('trv:'))this.travel(k.slice(4));else if(k==='warp'){this.warp=!this.warp;this._xt=0;this.msg(this.warp?'WARP 20% c':'Warp off',this.warp?'60,000 km/s far from planets · slows down near them':'',2200)}});this._tb=1}
    if(!this.space||!this.on||!['fly','eva','moon','landed'].includes(this.mode))return;
    const btn=(k,t,on)=>`<button data-k="${k}" style="min-width:140px;height:44px;padding:0 14px;border-radius:12px;border:1px solid ${on?'#38e4d0':'rgba(255,255,255,.13)'};background:linear-gradient(180deg,#191c23,#07080b);color:${on?'#38e4d0':'#e3edf1'};font:800 12px var(--f-disp,system-ui);letter-spacing:.08em">${t}</button>`;
    let h=btn('tmenu','🪐 TRAVEL',this._tm);if(this._tm)for(const b of this.bodies||[])h+=btn('trv:'+b.id,'→ '+b.name.toUpperCase());
    if(this.mode==='fly')h+=btn('warp','WARP 20% c '+(this.warp?'ON':'off'),this.warp);d.insertAdjacentHTML('beforeend',h)}});
{const _et=SPC.extraTick;SPC.extraTick=function(dt){const t0=this._xt;_et.call(this,dt);if(this._xt===.4&&!(t0>0))this.tmx()}}
