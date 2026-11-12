/* ===================================================================================================
   buddy.js — a friend who goes everywhere with you (More → Friend, or the Y key).
   On foot he walks beside you; on a bench he takes the other half; on a bicycle he rides pillion; in the G-Wagon / Lamborghini / boats he takes
   the free seat; on the yacht, the train and the airliner he sits next to you (or on the nearest free seat) and stands up when you do.
   Co-op friends need nothing of this: the same seats and bench halves work for them.
   =================================================================================================== */
const BUDDY={tit:null,on:false,P:null,x:0,y:0,z:0,yaw:0,spd:0,sit:null,seat:null,mpPlat:null,bl:null,t:0,say:0,reset:false,name:'Misha',
  LINES:['This is great!','Where to next?','Look at that view!','I could stay here all day.','Nice ride!','Careful with the animals…','Let\'s take the yacht to the island!','Can we fly the jet?'],
  toggle(){if(this.on)this.remove();else this.spawn()},
  // the Titanic emotes of pose.js: Misha takes the other half of the scene (behind you when you stand with your arms out, in front of you when you hold)
  titanic(id){const peers=typeof COOP!=='undefined'&&COOP.online&&COOP.online()&&COOP.peers&&[...COOP.peers.values()].some(R=>R.has&&Math.hypot(R.x-player.x,R.z-player.z)<3);
    if(!this.on&&!peers)this.spawn();if(this.on)this.tit={role:id==='tfront'?'back':'front',t:0,at:false}},
  titanicEnd(){if(this.tit&&this.P&&this.P.emo)POSE.stop(this.P);this.tit=null},
  spawn(){if(this.on||!started)return;const P=this.P=makePlayer(npcOpts());P.root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false}});try{mergeAvatar(P.root)}catch(e){}scene.add(P.root);
    this.on=true;this.reset=true;this.bl=null;this.sit=null;this.seat=null;this.update(.016);toast(this.name+' joins you','he follows you · sits next to you · rides along (More → Friend to send him away)');this.btn(true)},
  remove(){if(!this.on)return;this.release();scene.remove(this.P.root);this.P=null;this.on=false;toast(this.name+' leaves','');this.btn(false)},
  btn(on){const b=document.getElementById('bBuddy');if(b)b.classList.toggle('on',!!on)},
  release(){if(this.seat){this.seat.who=null;this.seat=null}this.sit=null},
  sitsAt(x,z){return this.on&&!!this.sit&&Math.hypot(this.x-x,this.z-z)<.6},
  // a seat on the platform the player is aboard: next to the player's seat first
  freeSeat(P){const me=MP.seat;let best=null,bd=1e9;for(const s of P.seats){if(s.who||s.off||s.helm||s.cockpit)continue;const d=me?Math.hypot(s.x-me.x,s.z-me.z)+Math.abs(s.y-me.y)*3:Math.hypot(s.x-MP.lx,s.z-MP.lz)+Math.abs(s.y-MP.ly)*3;if(d<bd&&d<(me?4.5:2.5)){bd=d;best=s}}return best},
  place(P,x,y,z,yaw,pose,dt,spd){P.root.position.set(x,y,z);P.root.rotation.set(0,yaw,0,'XYZ');animPlayer(P,{spd:spd||0,mode:pose||'walk',role:'pass'},dt)},
  update(dt){if(!this.on||!this.P)return;const P=this.P;this.t+=dt;
    // hide while we ride things he cannot join
    const away=HELI.on||DRIVE.on||RIDE.on||PORTAL.cur||(typeof PLN!=='undefined'&&PLN.cur)||(typeof BR!=='undefined'&&BR.on)||PASS.host;
    if(away){P.root.visible=false;this.release();this.reset=true;return}
    P.root.visible=true;
    if(this.reset){this.reset=false;this.bl=null;const a=player.yaw+2.4;this.x=player.x+Math.sin(a)*1.6;this.z=player.z+Math.cos(a)*1.6;this.y=groundAt(this.x,this.z,player.y+1);if(MP.on)this.mpPlat=null}
    // a line now and then
    this.say-=dt;if(this.say<=0){this.say=45+Math.random()*70;if(Math.random()<.5)toast(this.name,this.LINES[(Math.random()*this.LINES.length)|0])}
    // ---- aboard a platform (yacht deck, train car, airliner) ----
    if(MP.on){const Pl=MP.plat;if(this.mpPlat!==Pl){this.release();this.mpPlat=Pl;this.bl={lx:MP.lx-.8,ly:MP.ly,lz:MP.lz-.8};const o=this.bl,f=MP.floorAt(Pl,o.lx,o.lz,o.ly,.6);if(f===null){o.lx=MP.lx;o.lz=MP.lz-.9}else o.ly=f;this.bl.fy=o.ly}
      const o=this.bl;let tx,tz,speed=2.4;
      if(MP.seat&&!this.seat){const s=this.freeSeat(Pl);if(s){tx=s.x;tz=s.z;const d=Math.hypot(tx-o.lx,tz-o.lz);if(d<1.15){this.seat=s;s.who='buddy'}else this.goal={s}}}
      if(!MP.seat&&this.seat){this.seat.who=null;this.seat=null}
      if(this.seat){const s=this.seat;o.lx=s.x;o.lz=s.z;o.ly=s.y;P.root.visible=true;const w=MP.toWorld(Pl,s.x,s.y,s.z,MP._v);this.x=w.x;this.y=w.y;this.z=w.z;P.root.position.copy(w);
        const q=MP._q.copy(Pl.root.quaternion).multiply(MP._q2.setFromAxisAngle(MP._Y,s.yaw||0));P.root.quaternion.copy(q);animPlayer(P,{spd:0,mode:'sit'},dt);return}
      if(this.tit){const T=this.tit,pe=PLR.emo,live=pe&&(pe.id==='tfront'||pe.id==='thold');
        if(!live||MP.seat)this.titanicEnd();
        else{const sg=T.role==='back'?-1:1,gx=MP.lx+Math.sin(MP.yawL)*.36*sg,gz=MP.lz+Math.cos(MP.yawL)*.36*sg,ddx=gx-o.lx,ddz=gz-o.lz,dd=Math.hypot(ddx,ddz),want=T.role==='back'?'thold':'tfront';
          if(dd>.9){tx=gx;tz=gz}
          else{const k=Math.min(1,dt*5);o.lx+=ddx*k;o.lz+=ddz*k;if(o.fy!==null&&o.fy!==undefined)o.ly+=(o.fy-o.ly)*Math.min(1,dt*14);let dy=MP.yawL-(this.lyaw||0);while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;this.lyaw=(this.lyaw||0)+dy*Math.min(1,dt*6);
            if(dd<.12&&(!P.emo||P.emo.id!==want))POSE.emote(P,want);
            const w=MP.toWorld(Pl,o.lx,o.ly,o.lz,MP._v);this.x=w.x;this.y=w.y;this.z=w.z;P.root.position.copy(w);P.root.quaternion.copy(MP._q.copy(Pl.root.quaternion).multiply(MP._q2.setFromAxisAngle(MP._Y,this.lyaw)));animPlayer(P,{spd:0,mode:'walk'},dt);return}}}
      // follow the player in the platform frame
      if(tx===undefined){const a=MP.yawL+2.4;tx=MP.lx+Math.sin(a)*1.2;tz=MP.lz+Math.cos(a)*1.2}
      const dx=tx-o.lx,dz=tz-o.lz,d=Math.hypot(dx,dz);if(d>6)speed=5.5;let moved=0;
      if(d>.5){const st=Math.min(d,speed*dt);const px=o.lx,pz=o.lz;MP.slide(Pl,o,dx/d*st,dz/d*st,.28,.6);moved=Math.hypot(o.lx-px,o.lz-pz)/Math.max(dt,1e-4);if(o.fy!==null&&o.fy!==undefined)o.ly+=(o.fy-o.ly)*Math.min(1,dt*14)}
      this.spd+=(moved-this.spd)*Math.min(1,dt*8);const w=MP.toWorld(Pl,o.lx,o.ly,o.lz,MP._v);this.x=w.x;this.y=w.y;this.z=w.z;P.root.position.copy(w);
      let ty=moved>.3?Math.atan2(dx,dz):(MP.yawL+Math.PI*.9);let dy=ty-(this.lyaw||0);while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;this.lyaw=(this.lyaw||0)+dy*Math.min(1,dt*8);
      P.root.quaternion.copy(MP._q.copy(Pl.root.quaternion).multiply(MP._q2.setFromAxisAngle(MP._Y,this.lyaw)));animPlayer(P,{spd:this.spd,mode:'walk'},dt);return}
    this.mpPlat=null;if(this.seat){this.seat.who=null;this.seat=null}
    // ---- on a vehicle with a free seat ----
    const v=EXT.cur&&EXT.cur.seats&&EXT.cur.seats.length>1?EXT.cur:MARINE.cur&&MARINE.cur.seats&&MARINE.cur.seats.length>1?MARINE.cur:null;
    if(v){const p=MP._v,q=MP._q;v.seatWorld(1,p,q);this.x=p.x;this.y=p.y;this.z=p.z;P.root.position.copy(p);P.root.quaternion.copy(q);animPlayer(P,{spd:0,mode:v.seatPose?v.seatPose(1):'sit',role:'pass',crank:v.pedal||0,steer:v.steerA||0},dt);this.sit=null;return}
    // ---- on the bench next to you ----
    const ps=player.sit;if(ps&&ps.bench){const b=ps.bench,lat=[Math.cos(b.ry),-Math.sin(b.ry)],side=((ps.x-b.x)*lat[0]+(ps.z-b.z)*lat[1])>=0?1:-1,tx=b.x-lat[0]*side*.42+Math.sin(b.ry)*.04,tz=b.z-lat[1]*side*.42+Math.cos(b.ry)*.04,ty=b.y+.03;
      const d=Math.hypot(tx-this.x,tz-this.z);if(d>.3&&!this.sit){this.walk(tx,tz,dt,3.2);if(Math.hypot(tx-this.x,tz-this.z)<.35)this.sit={b}}
      if(this.sit){this.x=tx;this.z=tz;this.y=ty;this.place(P,tx,ty,tz,b.ry,'sit',dt);return}
      return}
    this.sit=null;
    // ---- the Titanic scene: stand 0.36 m behind (or in front of) the player, facing the same way, and play the other half of the pose ----
    if(this.tit){const T=this.tit,pe=PLR.emo,live=pe&&(pe.id==='tfront'||pe.id==='thold');
      if(!live||player.sit||player.spd>1.4){this.titanicEnd()}
      else{const sg=T.role==='back'?-1:1,fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),tx=player.x+fx*.36*sg,tz=player.z+fz*.36*sg,d=Math.hypot(tx-this.x,tz-this.z),want=T.role==='back'?'thold':'tfront';
        if(d>.9){this.walk(tx,tz,dt,Math.min(6.5,1.5+d*1.5));this.y+=(groundAt(this.x,this.z,this.y+1)-this.y)*Math.min(1,dt*14);this.place(P,this.x,this.y,this.z,this.yaw,'walk',dt,this.spd);return}
        // the last step is a plain slide (no obstacle push-back: the rail may be right there), then both stand still in the pose
        const k=Math.min(1,dt*5);this.x+=(tx-this.x)*k;this.z+=(tz-this.z)*k;this.spd*=.6;let dy=player.yaw-this.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;this.yaw+=dy*Math.min(1,dt*6);
        this.y+=(player.y-this.y)*Math.min(1,dt*10);if(d<.12&&(!P.emo||P.emo.id!==want))POSE.emote(P,want);
        this.place(P,this.x,this.y,this.z,this.yaw,'walk',dt,this.spd);return}}
    // ---- walking beside the player ----
    const a=player.yaw+2.4+(this.say>0?0:0),tx=player.x+Math.sin(a)*1.5,tz=player.z+Math.cos(a)*1.5,d=Math.hypot(tx-this.x,tz-this.z);
    if(d>26){this.x=player.x+Math.sin(a)*2;this.z=player.z+Math.cos(a)*2;this.y=groundAt(this.x,this.z,player.y+1)}
    else if(d>.7)this.walk(tx,tz,dt,Math.min(player.run||player.scoot?7:5.4,1.5+d*1.6));else this.spd*=.8;
    let ty=this.spd>.4?this.yaw:Math.atan2(player.x-this.x,player.z-this.z);let dy=ty-this.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;this.yaw+=dy*Math.min(1,dt*7);
    this.y+=(groundAt(this.x,this.z,this.y+1)-this.y)*Math.min(1,dt*14);this.place(P,this.x,this.y,this.z,this.yaw,'walk',dt,this.spd)},
  walk(tx,tz,dt,sp){const dx=tx-this.x,dz=tz-this.z,d=Math.hypot(dx,dz)||1,st=Math.min(d,sp*dt);let nx=this.x+dx/d*st,nz=this.z+dz/d*st;[nx,nz]=collide(nx,nz,.3,this.y+.2);
    const sdn=specialGround(nx,nz,this.y),g=sdn?sdn.h:groundH(nx,nz);if(!(sdn&&sdn.wall)&&!(g<SL-.9)&&g-this.y<1.2){const mv=Math.hypot(nx-this.x,nz-this.z)/Math.max(dt,1e-4);this.x=nx;this.z=nz;this.spd+=(mv-this.spd)*Math.min(1,dt*8);this.yaw=Math.atan2(dx,dz)}else this.spd*=.7}
};
BUDDY.init=function(){const ab=document.getElementById('qMenu')||document.getElementById('actBtns');
  if(ab&&!document.getElementById('bBuddy')){const b=document.createElement('button');b.id='bBuddy';b.innerHTML='<i><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6M17 11a2.6 2.6 0 1 0 0-5.2M19 20c0-2.2-.9-4-2.4-5"/></svg></i><b>Friend</b>';b.onclick=()=>this.toggle();ab.appendChild(b)}
  addEventListener('keydown',e=>{if(!started||e.repeat)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;if(e.code==='KeyY')this.toggle()})};
