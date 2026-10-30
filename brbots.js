/* ===================================================================================================
   brbots.js — the other players of a Battle Royale match: bots with friendly names that ride the bus, skydive, loot chests, pick up
   guns and potions, heal, run from the storm and shoot at each other and at you.  Same avatar, same weapon models and the same
   pose layer (pose.js) as the player.  Used by br.js:  BOTS.spawn / tick / ray / damage / boom / melee / alive / clear.
   =================================================================================================== */
const BOTS={list:[],NAMES:['Andrii','Maks','Dasha','Oleh','Kolya','Sasha','Vlad','Yulia','Tolik','Nastya','Bohdan','Ira','Taras','Katya','Misha','Lesya','Dima','Sonya','Zhenya','Roma'],
  clear(){for(const b of this.list){if(b.P)scene.remove(b.P.root);if(b.lo){scene.remove(b.lo);b.lo.geometry.dispose()}if(b.tag){scene.remove(b.tag);b.tag.material.map.dispose()}if(b.gl)b.P.root.remove(b.gl)}this.list.length=0},
  alive(){let n=0;for(const b of this.list)if(b.alive)n++;return n},
  rc(a){return a[Math.floor(Math.random()*a.length)]},
  mk(name,i){const R=Math.random,hx=()=>{const c=new THREE.Color().setHSL(R(),.35+R()*.4,.3+R()*.3);return c.getHex()};
    const o={shirt:hx(),tee1:'#f4f4f0',tee2:'#'+new THREE.Color().setHSL(R(),.6,.4).getHexString(),jeans:this.rc([0x2b2b30,0x3b4a66,0x5a6a80,0x4a3b2f,0x2f3a2c]),cuff:0x555a60,hair:this.rc([0x161616,0x3a2618,0xa0522d,0xe6c477,0x7a7a7a,0xcf3a2a]),hair2:0x3a3a3a,
      iris:this.rc(['#3b7fd4','#4a8a3c','#6b4a2a']),brow:'#3a2618',ts:this.rc(['over','hood','jacket','sailor']),bs:this.rc(['jeans','jogger']),ss:this.rc(['sneaker','boot','chunky']),cn:false,skin:this.rc(['#f2c9a6','#e8b48c','#c98f68','#9a6a48'])};
    const P=makePlayer(o);P.can.visible=false;P.scooter.visible=false;P.speaker.visible=false;
    const lo=bakeAvatar(P);scene.add(lo);mergeAvatar(P.root);P.root.traverse(m=>{if(m.isMesh)m.castShadow=false});scene.add(P.root);
    const tag=labelSprite([name],{w:512,h:120,size:70,color:'#fff',bg:'rgba(200,40,40,.85)',round:50,depthTest:false,scale:1});tag.material.sizeAttenuation=false;tag.material.fog=false;tag.frustumCulled=false;tag.scale.multiplyScalar(.05);tag.renderOrder=998;scene.add(tag);
    return {id:i,name,P,lo,tag,x:0,y:0,z:0,yaw:Math.random()*6.28,vx:0,vz:0,spd:0,hp:100,sh:0,alive:true,kills:0,skill:.35+Math.random()*.5,st:'bus',t:0,jumpAt:5+Math.random()*26,land:null,gl:null,vy:0,
      w:null,cons:[],goal:null,tgt:null,thinkT:Math.random()*.5,fireT:0,reaction:0,rl:0,strafe:Math.random()<.5?1:-1,strT:0,heal:0,stk:{x:0,z:0,t:0},av:0,avT:0,die:0,seen:0,ap:0,vis:false}},
  spawn(n){this.clear();const names=[...this.NAMES].sort(()=>Math.random()-.5);for(let i=0;i<n;i++)this.list.push(this.mk(names[i%names.length],i));
    for(const b of this.list){b.P.root.visible=false;b.lo.visible=false;b.tag.visible=false}},
  // ---------------------------------------------------------------- shooting at bots
  ray(o,d,max){let best=null;for(const b of this.list){if(!b.alive||b.st==='bus')continue;
      for(const [h,r,hd] of [[1.62,.22,true],[1.1,.34,false],[.5,.32,false]]){const cx=b.x-o.x,cy=b.y+h-o.y,cz=b.z-o.z,t=cx*d.x+cy*d.y+cz*d.z;if(t<0||t>max)continue;
        const qx=cx-d.x*t,qy=cy-d.y*t,qz=cz-d.z*t;if(qx*qx+qy*qy+qz*qz<r*r){if(!best||t<best.t)best={b,t,head:hd};break}}}
    return best},
  damage(b,v,by,direct){if(!b.alive||v<=0)return;v=Math.round(v);let sa=0;if(!direct){sa=Math.min(b.sh,v);b.sh-=sa;v-=sa}const was=Math.max(0,b.hp);b.hp-=v;b.hurtT=.5;
    if(typeof BRFX!=='undefined')BRFX.hit(b,Math.min(v,was),sa,b.hd,!!(by&&by.me));b.hd=false;
    if(b.hp<=0)this.kill(b,by);else if(by&&(by.me||by.bot)&&b.st!=='bus'){b.alert=2;if(by.me&&!b.tgt)b.tgt='me'}},
  kill(b,by){b.alive=false;b.st='dead';b.die=0;b.hp=0;const killer=by&&by.me?'You':by&&by.bot?by.bot.name:'Storm';
    BR.feed(killer,b.name,by&&by.w||(by&&by.zone?'Storm':''),by&&by.me);
    if(by&&by.me){BR.kills++;BR.msg('Eliminated '+b.name);BR.snd('hit')}if(by&&by.bot)by.bot.kills++;
    const g=groundAt(b.x,b.z,b.y+2);
    if(b.w){const it=BR.addItem({k:'w',id:b.w.id,rar:b.w.rar,mag:b.w.mag},b.x+.5,b.z+.4,{y:g,ok:true})}
    for(const c of b.cons){BR.addItem({k:'c',id:c,n:1},b.x-.5+Math.random(),b.z-.4+Math.random(),{y:g,ok:true})}
    if(b.w)BR.addItem({k:'a',id:BRW[b.w.id].ammo,n:1},b.x-.4,b.z+.5,{y:g,ok:true});
    POSE.stop(b.P);GUN.hold(b.P,0,false);BR.ui_()},
  boom(x,y,z,r,dmg,by){for(const b of this.list){if(!b.alive||b.st==='bus')continue;const d=Math.hypot(b.x-x,b.y+1-y,b.z-z);if(d<r){const k=1-d/r;this.damage(b,dmg*k*k*1.2+8,by)}}},
  melee(px,pz,fx,fz,dmg,by){let n=0;for(const b of this.list){if(!b.alive||b.st==='bus')continue;const dx=b.x-px,dz=b.z-pz,d=Math.hypot(dx,dz);if(d<2.6&&Math.abs(b.y-player.y)<1.8&&(d<.6||(dx*fx+dz*fz)/d>.25)){this.damage(b,dmg,by);GUN.shock(b.x,b.y+1,b.z);n++}}return n},
  // ---------------------------------------------------------------- helpers
  los(ax,ay,az,bx,by,bz){const dx=bx-ax,dy=by-ay,dz=bz-az,L=Math.hypot(dx,dy,dz),n=Math.ceil(L/2.5);for(let i=1;i<n;i++){const t=i/n,x=ax+dx*t,y=ay+dy*t,z=az+dz*t;if(y<groundH(x,z)+.15||insideAny(x,z,.1,y))return false}return true},
  walk(b,tx,tz,sp,dt){let dx=tx-b.x,dz=tz-b.z;const d=Math.hypot(dx,dz);if(d<.35){b.spd+=(0-b.spd)*Math.min(1,dt*8);return true}dx/=d;dz/=d;
    let ux=dx,uz=dz;const a0=b.av||0;if(a0){const c=Math.cos(a0),s=Math.sin(a0);ux=dx*c-dz*s;uz=dx*s+dz*c}
    const free=(x,z)=>!insideAny(x,z,.36,b.y+.6)&&sdAt(x,z)>2;
    if(!free(b.x+ux*1.0,b.z+uz*1.0)){for(const a of [.6,-.6,1.2,-1.2,1.9,-1.9]){const c=Math.cos(a),s=Math.sin(a),vx=dx*c-dz*s,vz=dx*s+dz*c;if(free(b.x+vx*1.0,b.z+vz*1.0)){ux=vx;uz=vz;break}}}
    b.vx+=(ux*sp-b.vx)*Math.min(1,dt*7);b.vz+=(uz*sp-b.vz)*Math.min(1,dt*7);
    let nx=b.x+b.vx*dt,nz=b.z+b.vz*dt;[nx,nz]=collide(nx,nz,.33,b.y);
    const g=groundAt(nx,nz,b.y);if(g-b.y>1.1||sdAt(nx,nz)<1){nx=b.x;nz=b.z;b.vx*=.2;b.vz*=.2}
    b.spd+=(Math.hypot(nx-b.x,nz-b.z)/dt-b.spd)*Math.min(1,dt*8);b.x=nx;b.z=nz;b.y+=(g-b.y)*Math.min(1,dt*12);
    if(Math.hypot(b.vx,b.vz)>.4){let dy=Math.atan2(b.vx,b.vz)-b.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;b.yaw+=dy*Math.min(1,dt*9)}
    // stuck? try going round for a moment
    b.stk.t+=dt;if(b.stk.t>1.2){if(Math.hypot(b.x-b.stk.x,b.z-b.stk.z)<.5&&d>1){b.av=(Math.random()<.5?1:-1)*(1.0+Math.random());b.avT=1.4}b.stk.x=b.x;b.stk.z=b.z;b.stk.t=0}
    if(b.avT>0){b.avT-=dt;if(b.avT<=0)b.av=0}
    return false},
  face(b,tx,tz,dt,k){let dy=Math.atan2(tx-b.x,tz-b.z)-b.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;b.yaw+=dy*Math.min(1,dt*(k||10))},
  // ---------------------------------------------------------------- decisions
  enemies(b){const out=[];if(BR.phase==='play'&&!BR.dead)out.push({me:true,x:player.x,y:player.y,z:player.z,name:'You'});for(const o of this.list)if(o!==b&&o.alive&&o.st!=='bus'&&o.st!=='sky')out.push({bot:o,x:o.x,y:o.y,z:o.z,name:o.name});return out},
  need(b){return !b.w},
  think(b){
    const zt=BR.zn||BR.zc;
    // 1. storm
    const out=!BR.inZone(b.x,b.z)||(BR.shrinking&&BR.zn&&Math.hypot(b.x-BR.zn.x,b.z-BR.zn.z)>BR.zn.r*.92);
    // 2. enemies
    let best=null,bd=1e9;const sight=62+b.skill*30;
    for(const e of this.enemies(b)){const d=Math.hypot(e.x-b.x,e.z-b.z);if(d<sight&&d<bd&&Math.abs(e.y-b.y)<30&&this.los(b.x,b.y+1.5,b.z,e.x,e.y+1.3,e.z)){best=e;bd=d}}
    if(best){if(!b.tgtE||(best.me?b.tgtE!==best:best.bot!==b.tgtE.bot)){b.reaction=.7+Math.random()*.9*(1.1-b.skill)}b.tgtE=best;b.seen=3}else if(b.seen>0){b.seen-=.4;if(b.seen<=0)b.tgtE=null}
    // 3. heal when it is calm
    if(!b.tgtE&&b.heal<=0&&b.cons.length&&(b.hp<65||b.sh<25)){b.heal=2.6;b.st='heal';return}
    if(b.tgtE&&b.w&&(!out||bd<20)){b.st='fight';return}
    if(out){b.st='roam';b.goal={x:zt.x+(Math.random()-.5)*zt.r*.6,z:zt.z+(Math.random()-.5)*zt.r*.6};return}
    // 4. loot
    let it=null,id=1e9;const have=!!b.w;
    for(const q of BR.items){if(q.taken)continue;const d=Math.hypot(q.x-b.x,q.z-b.z);if(d>(have?90:220)||d>=id)continue;
      if(q.k==='x'){if(q.open)continue}else if(q.k==='w'){if(BRW[q.id].melee||have&&RAR[q.rar].m<=RAR[b.w.rar].m)continue}else if(q.k==='a'){continue}else if(q.k==='c'){if(b.cons.length>=4)continue}
      if(BR.inZone(q.x,q.z)){it=q;id=d}}
    if(it){b.goal={x:it.x,z:it.z,it};b.st='loot';return}
    // 5. roam towards the next circle
    b.st='roam';if(!b.goal||Math.hypot(b.goal.x-b.x,b.goal.z-b.z)<4||b.goal.it)b.goal={x:zt.x+(Math.random()-.5)*zt.r*.8,z:zt.z+(Math.random()-.5)*zt.r*.8}},
  take(b,it){if(it.taken)return;
    if(it.k==='x'){it.open=true;it.taken=false;setTimeout(()=>{if(!BR.on)return;BR.spill(it)},500);return}
    if(it.k==='w'){if(b.w){BR.addItem({k:'w',id:b.w.id,rar:b.w.rar,mag:b.w.mag},b.x+.6,b.z+.3,{y:b.y,ok:true})}b.w={id:it.id,rar:it.rar,mag:it.mag!==undefined?it.mag:BRW[it.id].mag};BR.drop(it)}
    else if(it.k==='c'){b.cons.push(it.id);BR.drop(it)}else BR.drop(it)},
  shoot(b,e){const W=BRW[b.w.id];if(b.w.mag<=0){if(!b.rl){b.rl=W.rl;b.rlT=0;if(b.P._gs)b.P._gs.rl=0}return}
    b.w.mag--;b.fireT=W.cd*(W.auto?2.1:1.6)+Math.random()*.2;
    const ex=e.x,ey=e.y+1.2,ez=e.z,ox=b.x+Math.sin(b.yaw)*.6,oy=b.y+1.35,oz=b.z+Math.cos(b.yaw)*.6;const dx=ex-ox,dy=ey-oy,dz=ez-oz,d=Math.hypot(dx,dy,dz);
    const pel=W.pel||1;let acc=Math.max(.04,Math.min(.6,.78-d*.0055-(1-b.skill)*.42));if(pel>1)acc*=Math.max(0,1-d/W.range)*1.1;if(e.me&&PLR.spd>2.5)acc*=.78;
    const m=RAR[b.w.rar].m;let any=false,hs=false;
    for(let k=0;k<pel;k++){if(Math.random()<acc){any=true;const head=Math.random()<.1;hs=hs||head;const v=W.dmg*m*.75*(head?1.5:1)*(pel>1?(1-d/W.range*.7):1);
      if(e.me)BR.hurt(v,{bot:b,w:W.n});else this.damage(e.bot,v,{bot:b,w:W.n})}}
    if(d<150){const sx=any?0:(Math.random()-.5)*2.2,sy=any?0:(Math.random()-.5)*1.4;const T=new THREE.Vector3(ex+sx,ey+sy,ez+sx);const A=new THREE.Vector3(ox,oy,oz);GUN.tracer(A,A.clone().lerp(T,Math.min(1,(W.range||60)/d)));
      GUN.muzzleFlash(ox,oy,oz,dx/d,dy/d,dz/d,false);const vol=Math.max(0,1-Math.hypot(b.x-player.x,b.z-player.z)/110);if(vol>.02)GUN.sfx(W.snd,vol*.8)}
    if(b.P._gs)b.P._gs.rec=1;b.aimT=1.6;
    if(b.w.mag<=0&&!b.rl){b.rl=W.rl;b.rlT=0}},
  // ---------------------------------------------------------------- per frame
  tick(dt){if(this.paused)return;const phase=BR.phase;if(!BR.bus&&phase!=='play'&&phase!=='dead'&&phase!=='won')return;
    const bus=BR.bus,bp=bus?BR.busPos():null;
    for(const b of this.list){
      if(b.st==='bus'){b.t+=dt;if(bus){b.x=bp.x;b.z=bp.z;b.y=bus.y+2}
        if((bus?bus.t:b.t)>=b.jumpAt||BR.phase==='play'){b.st='sky';b.vy=-5;b.gl=BRM.glider(['#e8453c','#3a8bff','#3ad07a','#f2c14e','#b45cff'][b.id%5]);b.P.root.add(b.gl);b.P.sky=1;
          const ch=BR.items.filter(q=>q.k==='x'&&!q.taken);const q=ch.length?ch[Math.floor(Math.random()*ch.length)]:null;b.land=q?{x:q.x+(Math.random()-.5)*10,z:q.z+(Math.random()-.5)*10}:{x:BR.C.x+(Math.random()-.5)*600,z:BR.C.z+(Math.random()-.5)*600}}
        else{b.P.root.visible=false;b.lo.visible=false;b.tag.visible=false;continue}}
      if(b.st==='sky'){const g=groundH(b.x,b.z),ag=b.y-g,dd=Math.hypot(b.land.x-b.x,b.land.z-b.z);
        if(!b.glOn&&ag<85+Math.random()*30){b.glOn=true;b.P.sky=2;b.gl.visible=true}else if(!b.glOn)b.gl.visible=false;
        const hs=b.glOn?19:30,dx=b.land.x-b.x,dz=b.land.z-b.z,L=Math.hypot(dx,dz)||1,k=Math.min(1,dd/20);b.x+=dx/L*hs*k*dt;b.z+=dz/L*hs*k*dt;b.vy+=((b.glOn?-8:(dd>150?-44:-58))-b.vy)*Math.min(1,dt*1.5);b.y+=b.vy*dt;b.yaw=Math.atan2(dx,dz);
        if(b.y<=g+.15){b.y=groundAt(b.x,b.z,g+3);b.st='roam';b.P.sky=0;b.glOn=false;if(b.gl){b.P.root.remove(b.gl);b.gl=null}b.P.root.rotation.set(0,b.yaw,0,'XYZ');b.thinkT=0}}
      else if(b.st==='dead'){b.die=Math.min(1,b.die+dt*1.8);b.dt2=(b.dt2||0)+dt}
      else if(phase==='play'||phase==='dead'||phase==='won'){this.live(b,dt)}
      this.show(b,dt)}
  },
  live(b,dt){
    if(b.hurtT>0)b.hurtT-=dt;if(b.heal>0&&b.st!=='heal')b.heal-=dt;if(b.aimT>0)b.aimT-=dt;if(b.fireT>0)b.fireT-=dt;
    // storm damage
    if(!BR.inZone(b.x,b.z)){b.zT=(b.zT||0)-dt;if(b.zT<=0){b.zT=1;this.damage(b,BR.dmg(),{zone:1},true);if(!b.alive)return}}
    b.thinkT-=dt;if(b.thinkT<=0&&b.st!=='heal'){b.thinkT=.35+Math.random()*.25;this.think(b)}
    if(b.rl>0){b.rlT+=dt;if(b.P._gs)b.P._gs.rl=Math.min(.999,b.rlT/b.rl);if(b.rlT>=b.rl){b.rl=0;b.w.mag=BRW[b.w.id].mag;if(b.P._gs)b.P._gs.rl=-1}}
    const sp=5.3+b.skill*1.0;
    if(b.st==='heal'){b.heal-=dt;b.spd+=(0-b.spd)*Math.min(1,dt*8);if(b.heal<=0){const c=b.cons.shift();if(c){const C=BRC[c];if(C.sh)b.sh=Math.min(C.cap,b.sh+C.sh);else b.hp=Math.min(C.cap,b.hp+C.hp)}b.st='roam';b.heal=6;b.thinkT=0}}
    else if(b.st==='fight'&&b.tgtE&&b.w){const e=b.tgtE.me?{me:true,x:player.x,y:player.y,z:player.z}:b.tgtE.bot&&b.tgtE.bot.alive?{bot:b.tgtE.bot,x:b.tgtE.bot.x,y:b.tgtE.bot.y,z:b.tgtE.bot.z}:null;
      if(!e){b.tgtE=null;b.st='roam'}else{const dx=e.x-b.x,dz=e.z-b.z,d=Math.hypot(dx,dz),W=BRW[b.w.id];this.face(b,e.x,e.z,dt,12);
        b.ap=Math.atan2(e.y+1.2-(b.y+1.35),d);
        // keep a sensible distance, strafe
        b.strT-=dt;if(b.strT<=0){b.strT=.8+Math.random()*1.4;b.strafe=-b.strafe}
        const ideal=W.cls==='shotgun'?8:W.cls==='sniper'?60:W.cls==='smg'?16:28;let fwd=0;if(d>ideal+8)fwd=1;else if(d<ideal-6)fwd=-.8;
        const nx=dx/(d||1),nz=dz/(d||1),vx=nx*fwd+(-nz)*b.strafe*.8,vz=nz*fwd+nx*b.strafe*.8;this.walk(b,b.x+vx*4,b.z+vz*4,sp*.75,dt);b.yaw=Math.atan2(dx,dz);
        b.reaction-=dt;if(b.reaction<=0&&b.fireT<=0&&!b.rl&&d<(W.range||60)*.9)this.shoot(b,e)}}
    else if((b.st==='loot'||b.st==='roam')&&b.goal){const done=this.walk(b,b.goal.x,b.goal.z,sp,dt);
      if(b.goal.it){if(b.goal.it.taken){b.goal=null;b.thinkT=0}else if(Math.hypot(b.goal.x-b.x,b.goal.z-b.z)<1.7){const it=b.goal.it;b.goal=null;this.take(b,it);b.thinkT=.4}}
      else if(done)b.thinkT=0}
    else{b.spd+=(0-b.spd)*Math.min(1,dt*8)}
    // dropped inside a wall by a late-loading chunk? get out
    if(insideAny(b.x,b.z,.3,b.y+.6)){const q=collide(b.x,b.z,.33,b.y+1.4);if(q[0]!==b.x||q[1]!==b.z){b.x=q[0];b.z=q[1]}}
  },
  show(b,dt){const P=b.P,dx=b.x-player.x,dz=b.z-player.z,far=Math.hypot(dx,dz),near=far<30;
    if(b.st==='dead'){const k=b.die;P.root.visible=far<200&&b.dt2<9;b.lo.visible=false;b.tag.visible=false;P.root.position.set(b.x,b.y+.05*k,b.z);P.root.rotation.set(-1.5*k,b.yaw,0,'YXZ');if(b.dt2>9)P.root.visible=false;return}
    P.root.position.set(b.x,b.y+(b.st==='sky'&&!b.glOn?.85:0),b.z);
    if(b.st==='sky')P.root.rotation.set(b.glOn?0:1.2,b.yaw,0,b.glOn?'XYZ':'YXZ');else P.root.rotation.set(0,b.yaw,0,'XYZ');
    P.root.visible=near||b.st==='sky'&&far<300;b.lo.visible=!P.root.visible&&far<380;b.lo.position.set(b.x,b.y,b.z);b.lo.rotation.y=b.yaw;
    b.tag.visible=far<70;b.tag.position.set(b.x,b.y+2.15,b.z);
    if(b.st!=='sky'&&b.w&&!b.tgtE&&b.st!=='fight'){}
    // weapon in hand (bots keep it raised, aimed while fighting)
    if(b.st!=='sky'&&b.w&&P.root.visible){GUN.hold(P,BRW[b.w.id].gi,true);if(P._gp){P._gp.aim=(b.st==='fight'||b.aimT>0)?1:.35;P._gp.ap=b.ap||0}}
    else if(P._gp&&(!b.w||b.st==='sky'))GUN.hold(P,0,false);
    if(P.root.visible)animPlayer(P,{spd:b.spd,mode:b.st==='sky'?'air':'walk'},dt)}
};
