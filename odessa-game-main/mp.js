/* ===================================================================================================
   mp.js — walking on a MOVING platform (yacht deck, train car, airliner cabin).
   The walker lives in the platform's own frame: floors / ramps (walkable heights), wall boxes (AABBs), seats and actions are all
   given in platform-local metres (+x = left, +z = forward, y up). Every frame the local position is turned into a world position
   through the platform's root transform, so the player is glued to the deck while the vessel sails, rolls, turns or the train runs.
   Used by yacht.js (YACHT), trn2.js (trains) and plane.js (airliner cabin).

   A platform:  {name, root:Object3D, floors:[{x0,x1,z0,z1,y, y1?,axis?}], boxes:[{x0,x1,z0,z1,y0,y1,on?}],
                 seats:[{x,y,z,yaw,pose,label,who,act?}], acts:[{x,y,z,r,label,cond?,fn}],
                 inside?(lx,ly,lz), edge?(lx,lz,ly)->{plat,lx,lz}|null, exitTest?(lx,lz,ly)->bool, surf?, camMax?}
   =================================================================================================== */
const MP={
  on:false,plat:null,lx:0,ly:0,lz:0,vx:0,vz:0,vy:0,air:false,yawL:0,spd:0,seat:null,phase:0,pyaw:0,stepT:0,
  R:.28,UP:.55,
  _v:new THREE.Vector3(),_w:new THREE.Vector3(),_q:new THREE.Quaternion(),_q2:new THREE.Quaternion(),_M:new THREE.Matrix4(),_I:new THREE.Matrix4(),_Y:new THREE.Vector3(0,1,0),_o:{lx:0,ly:0,lz:0},
  // ---------- transforms (root is always a direct child of the scene or of an un-moved group) ----------
  mat(P){const r=P.root;this._M.compose(r.position,r.quaternion,r.scale);return this._M},
  toWorld(P,lx,ly,lz,out){return out.set(lx,ly,lz).applyMatrix4(this.mat(P))},
  toLocal(P,x,y,z,out){this._I.copy(this.mat(P)).invert();return out.set(x,y,z).applyMatrix4(this._I)},
  // ---------- geometry queries in the platform frame ----------
  // height of the highest walkable surface under (x,z) that is not more than `up` above ly (null: nothing to stand on)
  floorAt(P,x,z,ly,up){let best=null;for(const f of P.floors){if(f.on===false||x<f.x0||x>f.x1||z<f.z0||z>f.z1)continue;let y=f.y;
      if(f.y1!==undefined){const t=f.axis==='x'?(x-f.x0)/(f.x1-f.x0):(z-f.z0)/(f.z1-f.z0);y=f.y+(f.y1-f.y)*t}
      if(y>ly+up)continue;if(best===null||y>best)best=y}return best},
  // push a body circle out of every solid box whose height band overlaps the body
  push(P,x,z,ly,R){let px=x,pz=z;
    for(let it=0;it<3;it++){let hit=false;
      for(const b of P.boxes){if(b.on===false||b.y1<=ly+.25||b.y0>=ly+1.7)continue;
        const cx=Math.max(b.x0,Math.min(px,b.x1)),cz=Math.max(b.z0,Math.min(pz,b.z1)),dx=px-cx,dz=pz-cz,d2=dx*dx+dz*dz;if(d2>=R*R)continue;hit=true;
        if(d2>1e-8){const d=Math.sqrt(d2),k=(R-d)/d;px+=dx*k;pz+=dz*k}
        else{const l=px-b.x0,r=b.x1-px,t=pz-b.z0,bt=b.z1-pz,m=Math.min(l,r,t,bt);if(m===l)px=b.x0-R;else if(m===r)px=b.x1+R;else if(m===t)pz=b.z0-R;else pz=b.z1+R}}
      if(!hit)break}
    return [px,pz]},
  // is the point inside any solid box (camera clipping)
  solidAt(P,x,y,z,m){for(const b of P.boxes){if(b.on===false)continue;if(x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m&&y>b.y0-m&&y<b.y1+m)return true}return false},
  // move o={lx,ly,lz} by (dx,dz) with wall push-out, edge blocking and axis sliding; sets o.fy (floor height under the new spot)
  slide(P,o,dx,dz,R,up){
    let q=this.push(P,o.lx+dx,o.lz+dz,o.ly,R),f=this.floorAt(P,q[0],q[1],o.ly,up);
    if(f===null||f<o.ly-.7){let ok=false;
      for(const [ax,az] of [[o.lx+dx,o.lz],[o.lx,o.lz+dz]]){const q2=this.push(P,ax,az,o.ly,R),f2=this.floorAt(P,q2[0],q2[1],o.ly,up);if(f2!==null&&f2>=o.ly-.7){q=q2;f=f2;ok=true;break}}
      if(!ok){o.fy=this.floorAt(P,o.lx,o.lz,o.ly,up);return false}}
    o.lx=q[0];o.lz=q[1];o.fy=f;return true},
  // ---------- entering / leaving ----------
  enter(P,lx,ly,lz,yawL){
    if(this.on)this.exit(true);
    if(typeof player.scoot!=='undefined'&&player.scoot){player.scoot=false;$('bScoot').classList.remove('on')}
    player.sit=null;player.air=false;player.vx=player.vz=player.vy=0;
    this.on=true;this.plat=P;this.lx=lx;this.ly=ly;this.lz=lz;this.vx=this.vz=this.vy=0;this.air=false;this.seat=null;this.yawL=yawL||0;this.spd=0;
    this.pyaw=P.root.rotation.y;cam.yaw=this.pyaw+this.yawL;cam.init=false;PLR.root.visible=true;inp.jump=false;
    if(P.onEnter)P.onEnter(this);this.sync(0.016,true)},
  // leave the platform. place:{x,z,y?} puts the player there in the world (default: wherever they stand now)
  exit(force,place){const P=this.plat;if(!this.on)return;
    if(this.seat){this.seat.who=null;this.seat=null}
    this.sync(.016,true);const wx=player.x,wy=player.y,wz=player.z;
    this.on=false;this.plat=null;
    if(place){player.x=place.x;player.z=place.z;player.y=place.y!==undefined?place.y:groundAt(place.x,place.z,wy+1)}
    else{player.x=wx;player.z=wz;player.y=wy}
    player.vx=player.vz=player.vy=0;player.air=player.y>groundAt(player.x,player.z,player.y)+.4;
    player.yaw=P?P.root.rotation.y+this.yawL:player.yaw;PLR.root.visible=true;PLR.root.rotation.set(0,player.yaw,0,'XYZ');cam.init=false;
    if(P&&P.onExit)P.onExit(this,force)},
  // move to another platform keeping the world position (train cars, boarding a plane from the stairs)
  switchTo(Q,lx,lz){this.sync(.016,true);const y=player.y;this.plat=Q;const l=this.toLocal(Q,player.x,y,player.z,this._w);this.lx=lx!==undefined?lx:l.x;this.lz=lz!==undefined?lz:l.z;this.ly=l.y;
    this.yawL=Math.atan2(Math.sin(player.yaw-Q.root.rotation.y),Math.cos(player.yaw-Q.root.rotation.y));this.pyaw=Q.root.rotation.y;if(Q.onEnter)Q.onEnter(this)},
  mode(){return this.seat?'sit':this.air?'air':'walk'},
  // ---------- seats ----------
  seatNear(){const P=this.plat;if(!P||!P.seats)return null;let best=null,bd=1.25;for(const s of P.seats){if(s.who||s.off)continue;if(Math.abs(s.y-this.ly)>1.6)continue;const d=Math.hypot(s.x-this.lx,s.z-this.lz);if(d<bd){bd=d;best=s}}return best},
  sit(s){if(!s||s.who)return;this.seat=s;s.who='me';this.vx=this.vz=0;this.yawL=s.yaw||0;cam.pitch=Math.max(cam.pitch,.1);if(s.onSit)s.onSit(this)},
  stand(){const s=this.seat;if(!s)return;this.seat=null;s.who=null;if(s.onStand)s.onStand(this);
    // step out in front of the seat when there is room, else stay on the spot
    const f=s.stand||[Math.sin(s.yaw||0)*.7,Math.cos(s.yaw||0)*.7],o=this._o,fy=this.floorAt(this.plat,s.x,s.z,s.y+.8,this.UP);
    o.lx=s.x;o.lz=s.z;o.ly=fy===null?s.y:fy;this.slide(this.plat,o,f[0],f[1],this.R,this.UP);this.lx=o.lx;this.lz=o.lz;this.ly=o.ly},
  // ---------- HUD action (called from updateHUD) ----------
  hudAction(best){if(!this.on)return best;const P=this.plat;
    if(this.seat){const s=this.seat;if(s.act&&(!s.act.cond||s.act.cond()))return {label:s.act.label,fn:s.act.fn};return {label:s.standLabel||'Stand up',fn:()=>this.stand()}}
    let a=null,bd=1e9;
    for(const it of P.acts||[]){if(it.cond&&!it.cond())continue;const d=Math.hypot(it.x-this.lx,it.z-this.lz);if(d<it.r&&Math.abs((it.y===undefined?this.ly:it.y)-this.ly)<2.2&&d<bd){bd=d;a=it}}
    if(a)return {label:typeof a.label==='function'?a.label():a.label,fn:a.fn};
    const s=this.seatNear();if(s)return {label:s.label||'Sit',fn:()=>this.sit(s)};
    return P.leaveAct?P.leaveAct(this):null},
  // ---------- walking ----------
  step(dt){const P=this.plat;if(!P){this.exit(true);return}
    const rootYaw=P.root.rotation.y;let dY=rootYaw-this.pyaw;while(dY>Math.PI)dY-=6.283;while(dY<-Math.PI)dY+=6.283;this.pyaw=rootYaw;if(!inp.dragging&&!TOUCH_LOOK.active)cam.yaw+=dY;else cam.yaw+=dY*.5;
    if(P.update)P.update(dt,this);
    if(this.seat){const s=this.seat;this.lx=s.x;this.ly=s.y;this.lz=s.z;this.yawL+=(((s.yaw||0)-this.yawL+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*10);inp.jump=false;
      if(!s.hold&&(inp.jx||inp.jy||inp.k.KeyW||inp.k.KeyS||inp.k.KeyA||inp.k.KeyD)&&!(s.keys)){this.stand()}
      this.spd=0}
    else{
      let ix=0,iz=0;const k=inp.k;
      if(k.KeyW||k.ArrowUp)iz+=1;if(k.KeyS||k.ArrowDown)iz-=1;if(k.KeyA||k.ArrowLeft)ix-=1;if(k.KeyD||k.ArrowRight)ix+=1;
      ix+=inp.jx;iz+=inp.jy;let im=Math.hypot(ix,iz);if(im>1){ix/=im;iz/=im;im=1}
      const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
      const mx=fx*iz+rx*ix,mz=fz*iz+rz*ix,c=Math.cos(rootYaw),s=Math.sin(rootYaw);
      const tx=mx*c-mz*s,tz=mx*s+mz*c;                                  // wanted direction in the platform frame
      const run=player.run||k.ShiftLeft||k.ShiftRight,vmax=run?6.2:2.3,acc=this.air?2:10;
      this.vx+=(tx*vmax-this.vx)*Math.min(1,dt*acc);this.vz+=(tz*vmax-this.vz)*Math.min(1,dt*acc);
      const o=this._o;o.lx=this.lx;o.ly=this.ly;o.lz=this.lz;const moved=this.slide(P,o,this.vx*dt,this.vz*dt,this.R,this.UP);
      if(!moved){this.vx*=.3;this.vz*=.3}
      const real=Math.hypot(o.lx-this.lx,o.lz-this.lz)/Math.max(dt,1e-4);this.lx=o.lx;this.lz=o.lz;this.spd+=(Math.min(real,vmax)-this.spd)*Math.min(1,dt*8);
      if(Math.hypot(this.vx,this.vz)>.3){const ty=Math.atan2(this.vx,this.vz);let d=ty-this.yawL;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;this.yawL+=d*Math.min(1,dt*10)}
      const fy=o.fy;
      if(inp.jump&&!this.air&&fy!==null){this.vy=4.6;this.air=true;if(typeof AUD!=='undefined'&&AUD&&AUD.jump)AUD.jump()}inp.jump=false;
      if(this.air){this.vy=Math.max(-20,this.vy-13*dt);const ny=this.ly+this.vy*dt;
        if(fy!==null&&ny<=fy&&this.vy<=0){this.ly=fy;this.air=false;this.vy=0;if(typeof AUD!=='undefined'&&AUD&&AUD.land)AUD.land()}else{this.ly=ny;if(this.ly<-30)this.ly=fy??0}}
      else if(fy!==null)this.ly+=(fy-this.ly)*Math.min(1,dt*(Math.abs(fy-this.ly)>.3?14:22));
      this.stepT+=dt;
    }
    // platform specific hand-over: the end of a train car, the gangway touching the shore, an open door
    if(P.edge){const r=P.edge(this.lx,this.lz,this.ly);if(r&&r.plat&&r.plat!==P){this.switchTo(r.plat,r.lx,r.lz);return}}
    if(P.exitTest&&!this.seat){const r=P.exitTest(this.lx,this.lz,this.ly);if(r){this.sync(dt,true);this.exit(false,r===true?null:r);return}}
    this.sync(dt)},
  // local -> world: player.x/y/z, the avatar's transform, animation, footsteps
  sync(dt,quiet){const P=this.plat;if(!P)return;this.toWorld(P,this.lx,this.ly,this.lz,this._v);
    player.x=this._v.x;player.y=this._v.y;player.z=this._v.z;player.yaw=P.root.rotation.y+this.yawL;player.vx=player.vz=0;player.spd=this.spd;player.air=false;
    PLR.root.position.copy(this._v);this._q.copy(P.root.quaternion).multiply(this._q2.setFromAxisAngle(this._Y,this.yawL));PLR.root.quaternion.copy(this._q);
    if(quiet)return;
    const ph0=PLR.phase,seatPose=this.seat&&(this.seat.pose||'sit');
    animPlayer(PLR,Object.assign({spd:this.spd,mode:this.seat?(seatPose==='sit'?'sit':seatPose):(this.air?'air':'walk')},this.seat&&this.seat.st?this.seat.st():null),dt);
    if(!this.seat&&!this.air&&this.spd>.4){const a=Math.floor(ph0/Math.PI),b=Math.floor(PLR.phase/Math.PI);if(a!==b&&typeof AUD!=='undefined'&&AUD&&AUD.step)AUD.step(P.surf||'tile',this.spd)}},
  // ---------- camera ----------
  stepCamera(dt){const P=this.plat;if(!P)return;
    if(P.camera&&P.camera(dt,this))return;
    const tx=player.x,ty=player.y+(this.seat?1.05:1.35),tz=player.z;
    const ind=P.inside&&P.inside(this.lx,this.ly,this.lz);
    let dist=cam.dist*(P.camScale||1);if(ind)dist=Math.min(dist,P.camMax||2.4);
    const pitch=cam.pitch,cp=Math.cos(pitch),sp=Math.sin(pitch);
    if(dist<=.75){   // first person
      const ex=tx+Math.sin(cam.yaw)*.12,ey=player.y+1.58,ez=tz+Math.cos(cam.yaw)*.12;PLR.root.visible=false;cam.x=ex;cam.y=ey;cam.z=ez;cam.init=true;
      camera.position.set(ex,ey,ez);camera.lookAt(ex+Math.sin(cam.yaw)*cp,ey+sp,ez+Math.cos(cam.yaw)*cp);return}
    PLR.root.visible=true;
    const dx=-Math.sin(cam.yaw)*cp,dy=sp,dz=-Math.cos(cam.yaw)*cp;let d=dist;
    this._I.copy(this.mat(P)).invert();
    for(let s=.6;s<=dist;s+=.3){this._w.set(tx+dx*s,ty+dy*s,tz+dz*s).applyMatrix4(this._I);if(this.solidAt(P,this._w.x,this._w.y,this._w.z,.12)){d=Math.max(.6,s-.4);break}}
    const sd=CAMV.side*Math.max(0,Math.min(1,(d-.9)/1.2)),sx=-Math.cos(cam.yaw)*sd,sz=Math.sin(cam.yaw)*sd;
    const wx=tx+sx+dx*d,wy=ty+dy*d,wz=tz+sz+dz*d;if(!cam.init||!isFinite(cam.x+cam.y+cam.z)){cam.x=wx;cam.y=wy;cam.z=wz;cam.init=true}
    const k=Math.min(1,dt*12);cam.x+=(wx-cam.x)*k;cam.y+=(wy-cam.y)*k;cam.z+=(wz-cam.z)*k;
    camera.position.set(cam.x,cam.y,cam.z);camera.lookAt(tx+sx,ty,tz+sz)}
};
