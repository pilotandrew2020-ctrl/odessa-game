// carphys.js — what happens when a driven vehicle touches things: wall / traffic contact impulses (with an off-centre spin), traffic cars that get
// shoved, spun and stop for a few seconds, and pedestrians that jump aside or get knocked down (through the existing SHOVE knock-back machinery).
// Velocities are world vectors {vx,vz}; yaw is atan2(x,z); a driven body S = {vx,vz,yaw,w,mass} (w = extra yaw rate from impacts).
// Loaded before the main script; globals (CARS, PEDS, TALKERS, CAR_HL, CAR_HW, SHOVE, FX ...) are only read at call time.

const CPH=(()=>{
const stat={wall:0,car:0,ped:0,dodge:0,last:0};

// a traffic car whose box (grown by m) contains the point, with the point in the car's frame (a along, b to the right)
function other(px,pz,m){
  for(const c of CARS){const dx=px-c.x,dz=pz-c.z;if(Math.abs(dx)>6||Math.abs(dz)>6)continue;
    const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),a=dx*fx+dz*fz,b=dx*fz-dz*fx,hl=(CAR_HL[c.type]||2.3)+m+.2,hw=(CAR_HW[c.type]||1)+m+.2;
    if(Math.abs(a)<hl&&Math.abs(b)<hw)return {c,a,b,hl,hw}}
  return null}
const massOf=c=>c.type===8?6:c.type===3?1.1:1.25;

// Contact of the circle at (px,pz) (offset d along the body from the centre) with something; (nx,nz) = push-out direction (away from the obstacle).
// Changes S.vx/S.vz/S.w, shoves the traffic car if that is what we hit. Returns the closing speed (0 = no impact).
function contact(S,px,pz,d,nx,nz,m){
  let J,imp=0;const mP=S.mass||1.25,o=other(px,pz,m);
  if(o){const T=o.c,fx=Math.sin(T.yaw),fz=Math.cos(T.yaw),rx=fz,rz=-fx;
    const tv=(T.v||0),vtx=fx*tv+(T.kvx||0),vtz=fz*tv+(T.kvz||0),vn=(S.vx-vtx)*nx+(S.vz-vtz)*nz;if(vn>-.15)return 0;
    const mT=massOf(T);J=-(1+.25)*vn/(1/mP+1/mT);imp=-vn;
    S.vx+=nx*J/mP;S.vz+=nz*J/mP;
    const dvx=-nx*J/mT,dvz=-nz*J/mT;T.kvx=(T.kvx||0)+dvx;T.kvz=(T.kvz||0)+dvz;T.kx=T.kx||0;T.kz=T.kz||0;
    const ac=Math.max(-o.hl,Math.min(o.hl,o.a)),bc=Math.max(-o.hw,Math.min(o.hw,o.b)),dva=dvx*fx+dvz*fz,dvb=dvx*rx+dvz*rz;
    T.dyv=Math.max(-2.5,Math.min(2.5,(T.dyv||0)+(ac*dvb-bc*dva)/1.8*.35));T.dyaw=T.dyaw||0;
    T.v*=.45;T.hitT=Math.max(T.hitT||0,2.4+Math.random()*1.4);stat.car++;
    if(imp>3&&typeof AUD!=='undefined'&&AUD&&AUD.tone&&Math.random()<.5)AUD.tone(415,415,.35,.07,'square')}   // the other driver leans on the horn
  else{const vn=S.vx*nx+S.vz*nz;if(vn>-.15)return 0;J=-(1+.22)*vn/1;imp=-vn;S.vx+=nx*J;S.vz+=nz*J;
    const tx=-nz,tz=nx,vt=S.vx*tx+S.vz*tz,fr=Math.min(Math.abs(vt),.3*J)*Math.sign(vt);S.vx-=fr*tx;S.vz-=fr*tz;stat.wall++}   // scrape: a little friction on the tangent
  // an off-centre hit turns the body (d = along the body, n·right = how much of the push is sideways)
  const sy=Math.sin(S.yaw),cy=Math.cos(S.yaw);S.w=(S.w||0)+d*(nx*cy-nz*sy)*(J/mP)/1.8*.35;
  stat.last=imp;return imp}

// a shoved traffic car: offsets and spin relax back to its lane (slowly while it is stuck waiting, quickly once it drives off)
function relax(c,dt){
  if(c.kvx||c.kvz){c.kx+=c.kvx*dt;c.kz+=c.kvz*dt;const k=Math.exp(-dt*2.2);c.kvx*=k;c.kvz*=k;if(Math.abs(c.kvx)+Math.abs(c.kvz)<.03)c.kvx=c.kvz=0}
  if(c.dyv){c.dyaw+=c.dyv*dt;c.dyv*=Math.exp(-dt*2.5);if(Math.abs(c.dyv)<.02)c.dyv=0}
  const r=c.hitT>0?Math.exp(-dt*.12):Math.exp(-dt*1.1);
  if(!c.kvx&&!c.kvz){c.kx*=r;c.kz*=r}if(!c.dyv)c.dyaw*=r;
  const L=Math.hypot(c.kx,c.kz);if(L>3){c.kx*=3/L;c.kz*=3/L}
  if(Math.abs(c.kx)+Math.abs(c.kz)+Math.abs(c.dyaw)<.01){c.kx=c.kz=c.dyaw=0}}

// Pedestrians vs a vehicle (centre x,z, heading yaw, velocity vx,vz, half length hl, half width hw). Standing / crawling vehicles just make people
// step around the body; a moving one makes them jump aside when there is time, and knocks them down when there is not.
// Returns how many people were hit (the caller slows the vehicle down).
function peds(list,x,z,y,yaw,vx,vz,hl,hw,driven){
  const sp=Math.hypot(vx,vz),fx=Math.sin(yaw),fz=Math.cos(yaw);let hits=0;
  const ux=sp>.5?vx/sp:fx,uz=sp>.5?vz/sp:fz,reach=hl+8+sp*.8;
  for(const p of list){const dx=p.x-x,dz=p.z-z;if(dx*dx+dz*dz>reach*reach||Math.abs((p.y||0)-y)>2)continue;
    if(p.fallT>0)continue;
    if(sp<1.6){   // parked or crawling: step out of the box
      const a=dx*fx+dz*fz,b=dx*fz-dz*fx;if(Math.abs(a)<hl+.5&&Math.abs(b)<hw+.45){const nb=(b>=0?1:-1)*(hw+.65);p.kvx=(p.kvx||0)+(nb-b)*fz*4;p.kvz=(p.kvz||0)-(nb-b)*fx*4;p.kx=p.kx||0;p.kz=p.kz||0;if(sp>.3)p.wait=Math.max(p.wait||0,1)}
      continue}
    const s=dx*ux+dz*uz,lat=dx*uz-dz*ux;               // s: ahead of the centre along the motion, lat: sideways (positive = right of the motion)
    if(s<-hl*.6||s>hl+2.5+sp*.8||Math.abs(lat)>hw+1.6)continue;
    const ahead=s-hl;                                   // metres between the nose and the person
    if(ahead<=.15&&Math.abs(lat)<hw+.3){                // contact: knocked down
      const f=Math.min(1.4,.5+sp*.07),side=(lat>=0?1:-1)*.35,kvx=ux*sp*f+uz*side*sp*.3,kvz=uz*sp*f-ux*side*sp*.3;
      p.kvx=(p.kvx||0)+kvx*(sp>6?1.6:1.1);p.kvz=(p.kvz||0)+kvz*(sp>6?1.6:1.1);p.kx=p.kx||0;p.kz=p.kz||0;
      p.fallT=sp>6?3.4:2.2;p.fallDir=lat>=0?1:-1;p.react=0;p.flee=0;hits++;stat.ped++;
      if(typeof SHOVE!=='undefined'){SHOVE.say(p,SHOVE.DOWN);SHOVE.hitSound(Math.min(1,sp/12))}
      if(driven&&typeof FX!=='undefined'&&FX.ready){FX.shakeT=.25;FX.shakeA=.09}
      continue}
    if(!(p.dodgeT>0)&&ahead/sp>.35){                    // time to jump aside (towards the nearer edge of the lane)
      const dir=lat>=0?1:-1,kv=5.5+Math.min(4,sp*.25);p.kvx=(p.kvx||0)+uz*dir*kv;p.kvz=(p.kvz||0)-ux*dir*kv;p.kx=p.kx||0;p.kz=p.kz||0;
      p.dodgeT=1.6;p.react=1.2;p.flee=Math.max(p.flee||0,1.8);stat.dodge++}}
  if(hits&&typeof AUD!=='undefined'&&AUD&&AUD.burst)AUD.burst(500,80,.25,.35,'lowpass',.8);
  return hits}
// the dodge cooldown ticks down with the pedestrians' own timers
function tick(dt){for(const L of [PEDS,TALKERS])for(const p of L)if(p.dodgeT>0)p.dodgeT-=dt}
return {contact,relax,peds,tick,other,stat}})();
