// swim.js — the player can swim.
// Before: the sea floor deeper than 1 m was a wall and the body was clamped to the surface, so somebody who fell into open water
// (off a boat, out of a helicopter or a plane) stood there frozen and could not move at all.
// Now: entering deep water by walking, wading or falling starts SWIMMING. You move on the surface (WASD / stick, Shift = faster crawl),
// float chest-deep when still and lie out flat when moving; you climb out wherever the shore, a low jetty or the yacht's swim platform
// is no more than a step above the water. Hooks (index.html): stepPlayer calls SWIM.step first, the "deep water is a wall" test lets
// you in while SWIM.can(), the camera never goes below the surface while swimming, and teleportRaw calls SWIM.reset().
// The pose is a new 'swim' mode of animPlayerBase, so the realistic body (REAL copies the procedural joints) swims as well.
const SWIM={_on:false,t:0,tilt:0,ring:null,ringT:0,told:false,
  // `on` ends itself the moment the player is carried by something else (yacht deck, car, helicopter, boat...), because stepPlayer is not called then
  get on(){if(this._on&&(MP.on||DRIVE.on||HELI.on||RIDE.on||PASS.host||MARINE.cur||EXT.cur||PORTAL.cur||(typeof PLN!=='undefined'&&PLN.cur)))this.end();return this._on},
  can(){return !player.scoot&&!PORTAL.cur},
  // is the sea floor under (x,z) more than a metre down, with no deck / pier / ramp in between?
  deepAt(x,z,y){return !specialGround(x,z,y)&&groundH(x,z)<SL-1.0},
  begin(){this._on=true;this.t=0;this.tilt=0;player.air=false;player.vy=0;player.vx*=.4;player.vz*=.4;player.sit=null;
    PLR.root.rotation.order='YXZ';this.ringT=0;
    if(!this.told){this.told=true;toast('Swimming','WASD to swim · Shift = faster · swim to the shore, a jetty or the yacht\'s swim platform and get out')}
    try{if(typeof AUD!=='undefined'&&AUD&&AUD.land)AUD.land()}catch(e){}},
  // back to walking, standing on `y` (the shallows, a low jetty)
  end(y){this._on=false;PLR.root.rotation.set(0,player.yaw,0,'XYZ');PLR.root.rotation.order='XYZ';if(typeof y==='number'){player.y=y}player.air=false;player.vy=0;if(this.ring)this.ring.visible=false},
  reset(){if(this._on)this.end();else if(this.ring)this.ring.visible=false},
  ripple(dt,moving){
    if(!this.ring){const g=new THREE.RingGeometry(.55,.68,28);g.rotateX(-Math.PI/2);this.ring=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.0,depthWrite:false,fog:false}));this.ring.renderOrder=3;this.ring.frustumCulled=false;scene.add(this.ring)}
    this.ringT+=dt*(moving?1.4:.7);if(this.ringT>1)this.ringT-=1;const u=this.ringT;
    this.ring.visible=true;this.ring.position.set(player.x,SL+.04,player.z);const sc=.7+u*2.6;this.ring.scale.set(sc,1,sc);this.ring.material.opacity=(1-u)*(moving?.32:.2)},
  // returns true while the player is swimming (the walking step must then be skipped)
  step(dt){
    if(!this.can()){if(this.on)this.end();return false}
    if(!this.on){if(player.y<=SL+.25&&this.deepAt(player.x,player.z,player.y))this.begin();else return false}
    // teleported / carried onto land while "swimming": hand back to the walking code
    if(groundH(player.x,player.z)>=SL-.5){this.end();return false}
    const k=inp.k;let ix=0,iz=0;
    if(k.KeyW||k.ArrowUp)iz+=1;if(k.KeyS||k.ArrowDown)iz-=1;if(k.KeyA||k.ArrowLeft)ix-=1;if(k.KeyD||k.ArrowRight)ix+=1;
    ix+=inp.jx;iz+=inp.jy;let im=Math.hypot(ix,iz);if(im>1){ix/=im;iz/=im;im=1}
    const fx=Math.sin(cam.yaw),fz=Math.cos(cam.yaw),rx=-Math.cos(cam.yaw),rz=Math.sin(cam.yaw);
    const mx=fx*iz+rx*ix,mz=fz*iz+rz*ix,fast=player.run||k.ShiftLeft||k.ShiftRight,vmax=fast?3.1:1.7;
    const ac=Math.min(1,dt*3.5);player.vx+=(mx*vmax-player.vx)*ac;player.vz+=(mz*vmax-player.vz)*ac;
    let nx=player.x+player.vx*dt,nz=player.z+player.vz*dt;
    [nx,nz]=collide(nx,nz,.4,player.y);                                  // hulls, jetty posts and walls still stop you
    const sp=specialGround(nx,nz,player.y),gN=sp?sp.h:groundH(nx,nz)+sidewalkLift(nx,nz),deep=!sp&&gN<SL-1.0;
    if(!deep){
      // shore, shallows, a low jetty or the swim platform: climb out if it is no more than a step above the surface
      if((sp&&sp.wall)||gN-(SL-.75)>1.2){nx=player.x;nz=player.z;player.vx*=.3;player.vz*=.3}
      else{const e=Math.hypot(nx-player.x,nz-player.z);player.x=nx;player.z=nz;player.spd=Math.min(1.5,e/Math.max(dt,1e-4));this.end(Math.max(gN,SL-.75));inp.jump=false;return true}
    }
    const rv=Math.hypot(nx-player.x,nz-player.z)/Math.max(dt,1e-4);
    player.x=nx;player.z=nz;player.spd+=(Math.min(rv,vmax)-player.spd)*Math.min(1,dt*6);
    if(Math.hypot(player.vx,player.vz)>.2){const ty=Math.atan2(player.vx,player.vz);let dy=ty-player.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;player.yaw+=dy*Math.min(1,dt*6)}
    inp.jump=false;this.t+=dt;
    player.y+=((SL-.85+Math.sin(this.t*1.7)*.04)-player.y)*Math.min(1,dt*6);player.air=false;player.vy=0;
    // pose: treading water when still, flat on the surface when moving
    const mv=Math.min(1,player.spd/1.0);this.tilt+=(mv-this.tilt)*Math.min(1,dt*4);const T=this.tilt,s=Math.sin(player.yaw),c=Math.cos(player.yaw),back=.82*T;
    PLR.root.position.set(player.x-s*back,SL-1.2+.78*T+Math.sin(this.t*1.7)*.03*(1-T),player.z-c*back);
    PLR.root.rotation.set(1.25*T,player.yaw,0,'YXZ');
    animPlayer(PLR,{spd:player.spd,mode:'swim'},dt);
    this.ripple(dt,mv>.3);
    return true}
};
