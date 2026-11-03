/* ===================================================================================================
   plane.js — flying: Plane (flight model, gear / flaps / engines, crash), PLN (manager, input, HUD, cockpit buttons, cameras)
   • airliner: walk in through the door (mp.js), sit in the cabin (144 seats, people in them, a flight attendant) or in the left seat of the cockpit
     = you are the pilot: clickable overhead / panel / pedestal buttons (also on a HUD strip), engines, gear, flaps, brakes, lights, autopilot
   • fighter: climb in, cannon (Space), bombs (X), missiles (V); afterburner
   • the scheduled airliner of the airport flies itself on a kinematic circuit (see airp.js) with you as a passenger
   Keys while flying: S/W pitch (pull/push), A/D roll (steer on the ground), Z/C rudder, Shift or + throttle up, Ctrl or − down, G gear, L lights, P autopilot,
   flaps / parking brake / engines on the HUD strip (or click the cockpit buttons), Space brake (airliner) or cannon (fighter), X bomb, V missile, B fighter parking brake, O camera.
   =================================================================================================== */
class Plane{
  constructor(kind,opt){opt=opt||{};const B=kind==='airliner'?PM.buildAirliner():PM.buildFighter();this.kind=kind;this.root=B.root;this.parts=B.parts;this.d=B.dims;this.root.rotation.order='YXZ';this.root.userData.plane=this;
    this.x=0;this.y=0;this.z=0;this.yaw=0;this.pitch=0;this.roll=0;this.v=0;this.vy=0;this.thr=0;this.thrT=0;this.eng=0;this.engOn=false;this.gear=1;this.gearT=1;this.flaps=0;this.brake=true;this.parking=true;this.onGround=true;this.dead=0;this.crashed=false;
    this.mode='parked';this.manual=false;this.hold=false;this.hdgT=0;this.altT=0;this.spdT=0;this.ctl={p:0,r:0,y:0};this.lightsOn=true;this.strobe=0;this.doorOpen=true;this.home=null;this.ab=false;this.cabinLights=true;this.seatbelt=false;this.batt=true;this.fuel=true;this.eng1=false;this.eng2=false;this.fireCd=0;this.ammo=400;this.bombs=2;this.msl=2;this.cam='chase';this.steer=0;
    if(kind==='airliner')this.buildCabin();else this.buildCockpit();
    this.stairs=null;this.sync()}
  get label(){return this.kind==='airliner'?'airliner':'fighter jet'}
  doorPos(){this.root.updateMatrixWorld();return (this._dp||(this._dp=new THREE.Vector3())).set(this.kind==='airliner'?3.2:1.6,this.kind==='airliner'?-3.2:-1,this.kind==='airliner'?11.6:3.0).applyMatrix4(this.root.matrixWorld)}
  // ---------- placing ----------
  park(x,z,yaw){this.x=x;this.z=z;this.yaw=yaw;this.pitch=0;this.roll=0;this.v=0;this.vy=0;this.thr=this.thrT=0;this.onGround=true;this.gear=this.gearT=1;this.flaps=0;this.y=groundH(x,z)-this.d.gearY;this.crashed=false;this.dead=0;this.root.visible=true;this.mode='parked';this.sync()}
  groundY(){return groundH(this.x,this.z)}
  bottom(){const g=this.gear;return -(g*(-this.d.gearY)+(1-g)*(this.kind==='airliner'?2.0:.8))}
  sync(){this.root.position.set(this.x,this.y,this.z);this.root.rotation.set(-this.pitch,this.yaw,this.roll,'YXZ')}   // pitch > 0 = nose up; yaw > 0 = turning left (+x is left); roll > 0 = right wing down
  // ---------- inputs → controls ----------
  readInput(){const k=inp.k,c=this.ctl;
    const p=((k.KeyS||k.ArrowDown)?1:0)-((k.KeyW||k.ArrowUp)?1:0)-inp.jy;                 // S / stick back = nose up
    const r=((k.KeyD||k.ArrowRight)?1:0)-((k.KeyA||k.ArrowLeft)?1:0)+inp.jx;                // D / stick right = bank right
    const y=((k.KeyZ)?1:0)-((k.KeyC)?1:0);                                                 // Z rudder left, C right (E is the interact key)
    c.p=Math.max(-1,Math.min(1,p));c.r=Math.max(-1,Math.min(1,r));c.y=Math.max(-1,Math.min(1,y));
    const td=((k.ShiftLeft||k.ShiftRight||k.Equal||k.NumpadAdd)?1:0)-((k.ControlLeft||k.ControlRight||k.Minus||k.NumpadSubtract)?1:0);if(td)this.thrT=Math.max(0,Math.min(1,this.thrT+td*(1/(this.kind==='airliner'?4:2.5))*(this._dt||.016)));
    this.brake=(!!k.Space&&this.kind==='airliner')||this.parking}
  // ---------- flight model ----------
  fly(dt){const D=this.d,fl=this.kind==='airliner',c=this.ctl;this._dt=dt;
    if(this.manual)this.readInput();else if(!this.hold){c.p=c.r=c.y=0}
    // hold mode: simple autopilot on heading, altitude and speed
    if(this.hold&&!this.onGround){let dh=this.hdgT-this.yaw;while(dh>Math.PI)dh-=6.283;while(dh<-Math.PI)dh+=6.283;const rT=-Math.max(-.42,Math.min(.42,dh*1.4));c.r=Math.max(-1,Math.min(1,(rT-this.roll)*3));
      const dA=this.altT-this.y;const pT=Math.max(-.12,Math.min(.14,dA*.004));c.p=Math.max(-1,Math.min(1,(pT-this.pitch)*5));this.thrT=Math.max(0,Math.min(1,this.thrT+(this.spdT-this.v)*.0035*dt*60*.1))}
    // engines
    const eT=this.engOn?1:0;this.eng+=(eT-this.eng)*Math.min(1,dt*(fl?.35:.8));
    this.thr+=(this.thrT-this.thr)*Math.min(1,dt*(fl?.9:2.6));
    this.gear+=(this.gearT-this.gear)*Math.min(1,dt*.9);if(Math.abs(this.gearT-this.gear)<.01)this.gear=this.gearT;
    const ab=!fl&&this.ab&&this.thrT>.92&&this.eng>.9;const accMax=fl?5.4:(ab?24:15),vmax=D.vmax;
    const kd=accMax/(vmax*vmax)*(1+this.gear*.45+this.flaps*.35);const air=!this.onGround,sp=this.v;
    let a=this.thr*this.eng*accMax-kd*sp*sp-(air?9.81*Math.sin(this.pitch)*.9:0);
    if(this.onGround){a-=(this.brake?(fl?6.5:7):.18)+.0006*sp*sp;if(this.parking&&sp<.8)a=-sp/dt}
    this.v=Math.max(0,this.v+a*dt);this.fireCd-=dt;
    const Vs=D.vs*(1-this.flaps*.12-this.gear*.03),Vr=D.vr*(1-this.flaps*.1);
    if(this.onGround){
      // steer with A/D (and Q/E) at low speed; the nose lifts at rotation speed
      const st=-c.r+c.y;const rate=(fl?.55:.8)*Math.min(1,this.v/6)/(1+this.v/(fl?30:40));this.yaw+=st*rate*dt*(fl?1:1.2);this.steer+=(st-this.steer)*Math.min(1,dt*5);   // st > 0 = turning left
      this.roll*=Math.pow(.02,dt);const pitchMax=fl?.2:.28;
      if(c.p>0&&this.v>Vr*(fl?.97:.9))this.pitch=Math.min(pitchMax,this.pitch+c.p*dt*(fl?.1:.35));else this.pitch+=(0-this.pitch)*Math.min(1,dt*2.5);
      this.vy=0;this.y=this.groundY()-this.bottom();
      // lift-off: speed and nose up
      if(this.v>Vr&&this.pitch>(fl?.05:.07)&&this.gear>-1){this.onGround=false;this.vy=Math.max(.5,this.v*Math.sin(this.pitch)*.5);toast(fl?'Rotate':'Airborne','climb away · G raises the gear')}
      // runs off the paved area into the obstacles
    }else{
      // controls: pitch rate and roll rate scale with airspeed; roll turns the aircraft
      const eff=Math.min(1,this.v/(fl?90:110)),pr=(fl?.3:.55)*eff,rr=(fl?.5:1.8)*eff;
      this.pitch+=c.p*pr*dt;this.roll+=c.r*rr*dt;if(!c.r&&!this.hold)this.roll+=(0-this.roll)*Math.min(1,dt*(fl?.35:.45));this.roll=Math.max(-1.1,Math.min(1.1,this.roll));
      this.pitch=Math.max(-.9,Math.min(.95,this.pitch));
      const turn=(9.81*Math.tan(Math.max(-1.2,Math.min(1.2,this.roll))))/Math.max(35,this.v)-c.y*.12*eff;this.yaw-=turn*dt;   // a right bank turns right = yaw decreases
      const lift=Math.max(0,Math.min(1,(this.v-Vs*.8)/(Vs*.4)));
      const vyT=this.v*Math.sin(this.pitch)*lift-(1-lift)*(14+(Vs-Math.min(Vs,this.v))*.35)-(Math.abs(Math.sin(this.roll))>.5?(Math.abs(Math.sin(this.roll))-.5)*10:0);
      this.vy+=(vyT-this.vy)*Math.min(1,dt*(fl?1.1:1.8));
      if(lift<.5){this.pitch-=dt*(.18+(1-lift)*.12)}        // stall: the nose drops
      this.y+=this.vy*dt;
      // ground contact
      const gy=this.groundY(),by=this.y+this.bottom();
      if(by<=gy+.02){
        const bad=this.vy<-(fl?5.5:7.5)||Math.abs(this.roll)>.32||this.pitch<-.14||this.pitch>.5||(this.gear<.6&&this.v>(fl?24:30));
        if(bad&&this.v>12){this.crash('hit the ground');return}
        this.onGround=true;this.y=gy-this.bottom();this.vy=0;this.roll=0;if(this.manual)toast('Touchdown','brake with Space · throttle down')}
      // low flight over buildings
      if(this.y-gy<42&&this.v>40&&this.hits()){this.crash('hit a building');return}
    }
    this.x+=Math.sin(this.yaw)*Math.cos(this.pitch)*this.v*dt;this.z+=Math.cos(this.yaw)*Math.cos(this.pitch)*this.v*dt;
    if(this.onGround&&this.v>.5){const gy=this.groundY();this.y+=(gy-this.bottom()-this.y)*Math.min(1,dt*10)}
    // never below the sea
    if(this.y+this.bottom()<SL-.2){this.crash('went into the sea');return}}
  hits(){const L=this.d.len*.45,W=this.d.span*.45,f=[Math.sin(this.yaw),Math.cos(this.yaw)],l=[Math.cos(this.yaw),-Math.sin(this.yaw)];
    for(const [a,b] of [[L,0],[-L,0],[0,W],[0,-W],[0,0]]){const px=this.x+f[0]*a+l[0]*b,pz=this.z+f[1]*a+l[1]*b;if(insideAny(px,pz,1.5,this.y))return true}return false}
  crash(why){if(this.crashed)return;this.crashed=true;this.dead=14;const p=this.root.position.clone();WAR.blowUp(p,80,[0xdddddd,0x2a4a78,0x555a60,0xe8b923],this.kind==='airliner'?14:9);
    this.root.visible=false;this.v=0;this.manual=false;PLN.onCrash(this,why)}
  // ---------- gears / surfaces / lights ----------
  animate(dt){const P=this.parts,fl=this.kind==='airliner';
    for(const k of ['gearN','gearL','gearR']){const g=P[k];if(!g)continue;const f=this.gear,u=g.g.userData.fold;g.g.rotation.set(u[0]*(1-f),u[1]*(1-f),u[2]*(1-f));g.g.visible=this.gear>.02;
      for(const w of g.wheels)w.rotation.x+=this.v*dt/(fl?.5:.3);if(k==='gearN')g.g.rotation.y=this.steer*.5}
    const c=this.ctl;P.elev.forEach(e=>e.rotation.x+=((c.p*.35)-e.rotation.x)*Math.min(1,dt*6));P.ail.forEach((a,i)=>a.rotation.x+=(((i?1:-1)*c.r*.4)-a.rotation.x)*Math.min(1,dt*6));P.rud.rotation.y+=((c.y*.4+this.steer*.2)-P.rud.rotation.y)*Math.min(1,dt*6);
    if(P.flap)P.flap.forEach(f=>f.rotation.x+=((-this.flaps*.55)-f.rotation.x)*Math.min(1,dt*2));
    if(P.fans)P.fans.forEach(f=>f.rotation.z+=dt*this.eng*(fl?(14+this.thr*30):0));
    if(P.flame){P.flame.material.opacity=(this.ab&&this.eng>.9&&this.thrT>.9?.8:this.eng>.5?.18*this.thr:0);P.flame.scale.set(1,1,.7+this.thr*.6+(this.ab?.6:0))}
    // lights: beacon/strobes blink, bright at night
    this.strobe+=dt;if(P.lights){P.lights.visible=this.lightsOn&&(Math.sin(this.strobe*7)>-.2||UNI.uNight.value<.3)}
    if(this.cabinMat)this.cabinMat.emissiveIntensity=this.cabinLights?.55+UNI.uNight.value*.9:.03;
    if(this.beltMat)this.beltMat.emissiveIntensity=this.seatbelt?1.6:.05;
    if(this.kind==='airliner'){if(!this.onGround||this.v>=2)this.doorOpen=false;if(this.doorBox)this.doorBox.on=!this.doorOpen}
    if(this.stairs)this.stairs.visible=this.onGround&&this.v<2&&this.doorOpen}
  // ---------- per-frame ----------
  update(dt){if(this.crashed){this.dead-=dt;if(this.dead<=0&&this.home){this.park(this.home.x,this.home.z,this.home.yaw);this.engOn=false;this.eng=0;this.parking=true}return}
    if(this.ai&&!this.manual&&!this.ai.off&&PLN.aiStep)PLN.aiStep(this,dt);else this.fly(dt);
    this.animate(dt);this.sync();
    if(this.btnDirty)PLN.refreshButtons(this)}
  // ---------- seats, cabin, cockpit ----------
  buildCockpit(){ // fighter: seat, panel buttons, the pilot sits at (0,-.25,2.55)
    this.btns=[];const M=PM.m();
    const bt=(id,label,x,y,z,col)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.08,.04,.06),MBM.emis(col||0x30d060,.1));m.position.set(x,y,z);m.userData.btn={id,label,plane:this};this.root.add(m);this.btns.push({id,label,mesh:m,col:col||0x30d060});return m};
    bt('eng','Engine start',-.22,.38,3.62,0x30d060);bt('gear','Landing gear',-.1,.38,3.62,0xf0a020);bt('ab','Afterburner',.02,.38,3.62,0xff5030);bt('arm','Weapons',.14,.38,3.62,0xff3030);bt('lights','Lights',.26,.38,3.62,0x60a0ff);bt('canopy','Canopy',-.22,.38,3.74,0x40c0ff);bt('hold','Autopilot',-.1,.38,3.74,0x30d0d0);bt('brake','Parking brake',.02,.38,3.74,0xe0e040);
    this.plat=null;this.seatLocal=new THREE.Vector3(0,-.28,2.55)}
  buildCabin(){const M=PM.m(),mb=new MB(),FL=-.95,floors=[],boxes=[],seats=[],acts=[],S=MBM.std;this.btns=[];
    const mats={floor:S(0x4a5663,.85,0),wall:S(0xe8e6df,.85,0),wallD:S(0xb8b5ab,.9,0),seat:S(0x2a4a78,.9,0),seatD:S(0x1b2f4f,.9,0),bin:S(0xd8d6cf,.7,.05),dark:S(0x15171a,.5,.4),metal:S(0xc8ccd0,.3,.9),skinA:S(0xe0b090,.8,0),skinB:S(0x9a6b4c,.8,0),skinC:S(0xf0c8a8,.8,0),
      shA:S(0xb03a3a,.9,0),shB:S(0x3a6ab0,.9,0),shC:S(0x4a9a5a,.9,0),shD:S(0xd8c060,.9,0),shE:S(0x6a4a8a,.9,0),shF:S(0xeeeeee,.9,0),panel:S(0x30343a,.6,.3),
      cab:MBM.emis(0xfff4dc,.55),belt:MBM.emis(0x40ff80,.05),aisle:MBM.emis(0xf0a020,.4),glassF:MBM.glass(0x7fa8c6,.3,{side:THREE.DoubleSide}),carpet:S(0x2a3548,.95,0),red:S(0xb82a2a,.6,0),skin:S(0xe0b090,.8,0)};
    this.cabinMat=mats.cab;this.beltMat=mats.belt;const F=(x0,x1,z0,z1,y)=>floors.push({x0,x1,z0,z1,y}),B=(x0,x1,y0,y1,z0,z1,o)=>{const b=Object.assign({x0,x1,y0,y1,z0,z1},o||{});boxes.push(b);return b},blk=(k,x0,x1,y0,y1,z0,z1,solid)=>{mb.bx(k,x0,x1,y0,y1,z0,z1);if(solid!==false)B(x0,x1,y0,y1,z0,z1)};
    // floor + liner: lower wall, window band (real openings), upper wall, ceiling
    F(-1.7,1.7,-12.6,16.3,FL);mb.bx('carpet',-1.7,1.7,FL-.02,FL,-12.6,16.3);
    const WZ=[];for(let z=-8.4;z<=12.9;z+=.78)WZ.push(z);          // window centres (every second row of the hull texture is painted at the same pitch)
    for(const sx of [-1,1]){const xa=sx>0?1.76:-1.8,xb=sx>0?1.8:-1.76;
      mb.bx('wallD',xa,xb,FL,.18,-12.5,16.0);mb.bx('wall',xa,xb,.72,1.5,-12.5,16.0);                       // lower and upper liner, open between
      for(let z=-8.8;z<=13.4;z+=.78)mb.bx('wall',xa,xb,.18,.72,z-.04,z+.04+.0);                      // thin mullions
      if(sx>0){B(xa,xb,FL,1.5,-12.5,11.1);B(xa,xb,FL,1.5,12.1,16.0)}else B(xa,xb,FL,1.5,-12.5,16.0)}
    // front door (left): the gap in the collision wall is closed by this box while the door is shut (always when airborne)
    this.doorBox=B(1.7,1.9,FL,1.5,11.1,12.1,{door:1});this.doorBox.on=false;
    mb.bx('wall',-1.5,1.5,1.5,1.62,-12.5,16.0);                                                      // ceiling
    // seat rows
    this.seatRows=[];for(let z=10.2;z>=-8.4;z-=.8)this.seatRows.push(z);const rnd=(i)=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s)};let si=0;
    for(const z of this.seatRows)for(const sx of [-1,1]){const x0=sx>0?.46:-1.62,x1=sx>0?1.62:-.46;
      mb.bx('seat',x0,x1,FL+.36,FL+.5,z-.32,z+.32);mb.bx('seat',x0,x1,FL+.5,FL+1.1,z+.3,z+.4);mb.bx('seatD',x0,x1,FL,FL+.36,z-.28,z+.28);for(const dx of [.5,1.0,1.48]){const px=sx*dx*.77+(sx>0?.15:-.15);mb.bx('seatD',px-.01,px+.01,FL+.5,FL+.62,z-.3,z+.3)}
      B(x0,x1,FL,FL+1.15,z-.4,z+.4);
      for(let i=0;i<3;i++){const px=sx>0?(.62+i*.36):(-.62-i*.36);const s={x:px,y:FL+.5-.45,z,yaw:0,label:'Take your seat',pose:'sit',who:null,stand:[-sx*.9,0]};si++;
        // passengers already in some seats (static figures; the ones in the window seats look at the view)
        if(rnd(si)<.64){const sk=['skinA','skinB','skinC'][si%3],sh=['shA','shB','shC','shD','shE','shF'][(si*7)%6];mb.bx(sh,px-.17,px+.17,FL+.5,FL+1.05,z-.12,z+.08);mb.sph(sk,.1,px,FL+1.2,z-.02,1,1.1,1);mb.bx(sh,px-.15,px+.15,FL+.42,FL+.52,z-.5,z-.1);s.who='npc'}
        seats.push(s)}
      // overhead bin
      mb.bx('bin',sx>0?.85:-1.65,sx>0?1.65:-.85,1.05,1.45,z-.38,z+.38)}
    // galley + lavatories at the back, galley at the front, curtain
    blk('wallD',-1.6,-.5,FL,1.3,-11.9,-10.8);blk('wallD',.5,1.6,FL,1.3,-11.9,-10.8);for(const z of [11.6]){}
    blk('wallD',-1.6,-.5,FL,1.3,11.0,12.1);                                                   // front galley block (right side; the left side is the door)
    // aisle lights + seatbelt signs
    for(let z=-8.4;z<10.4;z+=1.6)mb.bx('aisle',-.46,-.44,FL+.01,FL+.03,z,z+.5),mb.bx('aisle',.44,.46,FL+.01,FL+.03,z,z+.5);
    for(let z=-8;z<=11;z+=2.4)mb.bx('cab',-.25,.25,1.58,1.6,z-.5,z+.5);for(const z of [-3,3,9])mb.bx('belt',-.1,.1,1.55,1.6,z,z+.3);
    // cockpit (z 12.5 .. 15.4): door, two seats, panel, pedestal, overhead, windscreen frame
    blk('wall',-1.6,-.35,FL,1.5,12.45,12.55);blk('wall',.35,1.6,FL,1.5,12.45,12.55);mb.bx('wall',-.35,.35,1.1,1.5,12.45,12.55);F(-1.7,1.7,12.4,16.3,FL);
    blk('panel',-1.2,1.2,FL,.02,15.0,15.9);mb.box('panel',2.4,.4,.1,0,.0,15.2,0,-.6);                              // glareshield (below the eye line) + the slanted main panel
    for(const x of [-.85,.85])mb.box('dark',.44,.3,.03,x,.1,15.12,0,-.6);mb.box('dark',.36,.3,.03,0,.1,15.12,0,-.6);   // PFD / ND / EICAS screens
    blk('panel',-.14,.14,FL,-.76,13.0,14.5,false);                                                              // pedestal (low: you can walk past it)
    for(const x of [-.07,.07])mb.rod('metal',.018,[x,-.5,13.5],[x,-.15,13.8],5);
    mb.bx('panel',-.9,.9,1.18,1.4,13.3,14.8);                                                                   // overhead panel
    mb.bx('dark',-1.0,-.9,.0,1.5,15.7,15.9);mb.bx('dark',.9,1.0,.0,1.5,15.7,15.9);mb.bx('dark',-.03,.03,.0,1.5,15.9,16.0);mb.bx('dark',-1.0,1.0,1.38,1.5,15.75,16.0);
    for(const x of [-.62,.62]){mb.bx('seatD',x-.25,x+.25,FL+.4,FL+.52,13.2,13.8);mb.bx('seatD',x-.25,x+.25,FL+.52,FL+1.2,13.15,13.25);mb.rod('metal',.04,[x,FL,13.5],[x,FL+.4,13.5],5);
      mb.rod('metal',.02,[x*1.0,-.3,14.2],[x,-.05,14.6],5);mb.cyl('dark',.12,.12,.03,12,x,-.02,14.62,Math.PI/2.5)}                  // control columns + wheels
    // pilot seats: left (x +.62) is the player's, right is the first officer's
    this.pilotSeat={x:.62,y:FL+.52-.45,z:13.5,yaw:0,label:'Take the pilot seat',pose:'sit',who:null,hold:true,keys:true,helm:true,standLabel:'Leave the pilot seat',cockpit:true};seats.push(this.pilotSeat);
    this.copilotSeat={x:-.62,y:FL+.52-.45,z:13.5,yaw:0,label:'Sit in the co-pilot seat',pose:'sit',who:null,cockpit:true};seats.push(this.copilotSeat);
    mb.build(this.root,mats,{static:true,noShadow:new Set(['carpet','wall','wallD','cab','belt','aisle','seat','seatD','bin','skinA','skinB','skinC','shA','shB','shC','shD','shE','shF','panel','dark','metal','glassF','skin'])});
    // clickable buttons (own meshes, glowing when on)
    const bt=(id,label,x,y,z,col,sz)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sz||.07,.035,.05),MBM.emis(col,.1));m.position.set(x,y,z);m.rotation.x=-.4;m.userData.btn={id,label,plane:this};this.root.add(m);this.btns.push({id,label,mesh:m,col});return m};
    const y0=1.17,z0=13.25;[['batt','Battery',0x40d060],['fuel','Fuel pumps',0x40d060],['eng1','Engine 1',0x30c0ff],['eng2','Engine 2',0x30c0ff],['apu','APU',0xf0c020],['belts','Seatbelt sign',0x60ff90],['nav','Lights',0xffffff],['cabl','Cabin lights',0xfff0c0]].forEach(([id,l,c],i)=>bt(id,l,-.72+i*.2,y0,z0+(i%2)*.25,c));
    [['gear','Landing gear',0xf0a020,-.45],['flaps','Flaps',0xf0e040,-.28],['ap','Autopilot',0x30d0d0,-.1],['brake','Parking brake',0xff4040,.08],['door','Cabin door',0x80ff80,.26],['pa','Announcement',0xb090ff,.44]].forEach(([id,l,c,x])=>bt(id,l,x,.17,15.07,c,.1));
    // seats registered for the platform
    this.plat={name:'airliner',root:this.root,floors,boxes,seats,acts,surf:'metal',camMax:2.2,plane:this,
      inside:(lx,ly,lz)=>Math.abs(lx)<1.8&&lz>-12.6&&lz<16.3&&ly<1.6,
      exitTest:(lx,lz,ly)=>{if(lx<1.8||this.doorOpen===false||!this.onGround||this.v>2.5)return false;if(Math.abs(lz-11.6)>.8)return false;const w=MP.toWorld(this.plat,3.6,-.9,11.4,new THREE.Vector3());const gy=groundH(w.x,w.z);return {x:w.x,z:w.z,y:gy}},
      update:(dt,mp)=>PLN.platUpdate(this,dt,mp),camera:(dt,mp)=>PLN.platCamera(this,dt,mp)};
    F(1.7,3.0,11.1,12.1,FL);   // threshold through the door
    // staircase truck at the door (visible while parked)
    const st=new THREE.Group(),sm=new MB();for(let i=0;i<8;i++)sm.bx('metal',3.0+(7-i)*.16-.0,3.0+(7-i)*.16+.55+.0,-3.2+i*.28,-3.2+i*.28+.28,10.9,11.9);sm.bx('metal',2.9,3.0,-3.2,-.9,10.8,12.0);sm.bx('dark',3.0,5.0,-3.4,-3.2,10.8,12.0);sm.build(st,{metal:S(0xb0b6bc,.4,.6),dark:S(0x202327,.7,.3)});this.root.add(st);this.stairs=st;
    // flight attendant + the captain/first officer avatars are added lazily (PLN.crewInit)
  }
  seatWorld(seat,out){return MP.toWorld(this.plat,seat.x,seat.y,seat.z,out)}
}

// ===================================================================================================
const PLN={list:[],cur:null,crew:false,hudEl:null,rc:new THREE.Raycaster(),ndc:new THREE.Vector2(),down:null,camMode:'chase',tr:[],
  init(world){this.world=world;WAR.reg(()=>this.targets());this.hud();this.input()},
  targets(){const o=[];for(const p of this.list)if(!p.crashed&&!p.onGround)o.push({id:'plane-'+p.id,pos:p.root.position,r:p.kind==='airliner'?10:5,kill:()=>{p.crash('shot down')}});return o},
  add(kind,x,z,yaw,opt){const p=new Plane(kind,opt);p.id=this.list.length+1;p.home={x,z,yaw};this.world.add(p.root);p.park(x,z,yaw);this.list.push(p);this.refreshButtons(p);
    // boarding / seat prompts
    INTERACT.push({get x(){return p.doorPos().x},get z(){return p.doorPos().z},r:p.kind==='airliner'?6:7,get label(){return p.kind==='airliner'?'Board the airliner':'Climb into the fighter'},
      cond:()=>!p.crashed&&!MP.on&&!PLN.cur&&PLN.free()&&p.onGround&&p.v<3&&(p.kind!=='airliner'||p.doorOpen)&&Math.abs(player.y-(p.y+p.bottom()))<4,fn:()=>PLN.board(p)});
    return p},
  free(){return started&&!PORTAL.cur&&!DRIVE.on&&!HELI.on&&!RIDE.on&&!player.sit&&!PASS.host&&!MARINE.cur&&!EXT.cur},
  flying(){return !!(this.cur||(MP.on&&MP.plat&&MP.plat.plane&&MP.plat.plane.manual))},
  board(p){if(p.kind==='airliner'){this.crewInit(p);MP.enter(p.plat,1.3,-.95,11.6,-Math.PI/2);cam.dist=Math.max(cam.dist,.5);if(p.mode==='ai')p.doorOpen=true;
      toast('Welcome aboard','walk down the aisle · E on a seat to sit · the pilot seat is the left seat in the cockpit (its buttons are clickable)')}
    else{this.cur=p;p.manual=true;p.parking=false;p.brake=false;cam.init=false;PLR.root.visible=true;this.hudShow(true);toast('Fighter jet','click the glowing buttons (or the strip below) to start the engine · Space cannon · X bomb · V missile')}},
  leaveFighter(){const p=this.cur;if(!p)return;if(!p.onGround||p.v>3){toast('Not now','land and stop first');return}
    this.cur=null;p.manual=false;p.parking=true;p.thrT=0;const w=MP.toWorld({root:p.root},0,0,0,new THREE.Vector3());player.x=p.x+Math.cos(p.yaw)*3.2;player.z=p.z-Math.sin(p.yaw)*3.2;player.y=groundAt(player.x,player.z,p.y);player.vx=player.vz=0;player.yaw=p.yaw;PLR.root.visible=true;PLR.root.rotation.set(0,p.yaw,0,'XYZ');cam.init=false;this.hudShow(false)},
  onCrash(p,why){toast(p.kind==='airliner'?'The airliner crashed':'The fighter crashed','you '+why);
    if(this.cur===p){this.cur=null;this.hudShow(false)}
    if(MP.on&&MP.plat===p.plat){MP.exit(true,{x:p.x,z:p.z,y:Math.max(groundH(p.x,p.z),p.y)});player.air=true}
    if(this.camMode==='cockpit')this.camMode='chase'},
  // the MP platform (airliner cabin) hook: helm seat → the player is the pilot
  platUpdate(p,dt,mp){const s=mp.seat,pilot=!!(s&&s.cockpit&&s.helm);if(pilot!==p.manual){p.manual=pilot;this.hudShow(pilot);if(pilot){if(p.ai)p.ai.off=true;p.parking=false;p.brake=false;cam.pitch=Math.max(cam.pitch,0);toast('Captain','click the overhead buttons: Battery · Fuel · Engine 1 · Engine 2 · then the throttle with Shift/R and the HUD strip')}else{p.hold=true;p.hdgT=p.yaw;p.altT=p.y;p.spdT=Math.max(p.v,p.d.vs*1.6);if(!p.onGround)toast('Autopilot holds the course','sit in the left seat to take over again')}}
},
  platCamera(p,dt,mp){const s=mp.seat;if(!(s&&s.cockpit&&s.helm))return false;
    if(this.camMode==='chase'){return this.chase(p,dt,true)}
    const e=MP.toWorld(p.plat,s.x,s.y+1.12,s.z+.05,MP._v),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);PLR.root.visible=false;cam.x=e.x;cam.y=e.y;cam.z=e.z;cam.init=true;camera.position.copy(e);camera.lookAt(e.x+Math.sin(cam.yaw)*cp,e.y+sp,e.z+Math.cos(cam.yaw)*cp);return true},
  chase(p,dt,mp){const d=Math.max(p.d.len*1.0,cam.dist*(p.kind==='airliner'?8:4)),pit=Math.max(.05,cam.pitch*.6+.08),cp=Math.cos(pit),sp=Math.sin(pit);
    if(!freeLook()){let dy=p.yaw-cam.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;cam.yaw+=dy*Math.min(1,dt*1.6)}
    const wx=p.x-Math.sin(cam.yaw)*cp*d,wy=p.y+sp*d+(p.kind==='airliner'?4:2),wz=p.z-Math.cos(cam.yaw)*cp*d;const gy=groundH(wx,wz)+2;if(!cam.init){cam.x=wx;cam.y=wy;cam.z=wz;cam.init=true}const k=Math.min(1,dt*5);cam.x+=(wx-cam.x)*k;cam.y+=(Math.max(wy,gy)-cam.y)*k;cam.z+=(wz-cam.z)*k;
    camera.position.set(cam.x,cam.y,cam.z);camera.lookAt(p.x+Math.sin(p.yaw)*4,p.y+1.5,p.z+Math.cos(p.yaw)*4);PLR.root.visible=!mp&&this.camMode!=='cockpit';return true},
  stepCamera(dt){const p=this.cur;if(!p)return;
    if(this.camMode==='cockpit'){const e=p.root.localToWorld(new THREE.Vector3(0,.62,2.75)),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);PLR.root.visible=false;cam.x=e.x;cam.y=e.y;cam.z=e.z;cam.init=true;camera.position.copy(e);
      // look direction is relative to the aircraft: camera yaw follows it
      camera.lookAt(e.x+Math.sin(cam.yaw)*cp,e.y+sp,e.z+Math.cos(cam.yaw)*cp);return}
    this.chase(p,dt,false)},
  // the fighter pilot rides in the cockpit; the avatar is placed every frame
  ridePilot(p,dt){const sp=p.seatLocal,w=p.root.localToWorld(sp.clone());player.x=w.x;player.y=w.y;player.z=w.z;player.yaw=p.yaw;player.vx=player.vz=0;player.spd=0;
    PLR.root.position.copy(w);PLR.root.quaternion.copy(p.root.quaternion);animPlayer(PLR,{spd:0,mode:'sit'},dt)},
  update(dt){
    for(const p of this.list){const d=Math.hypot(p.x-player.x,p.z-player.z);p.root.visible=!p.crashed&&(d<6000||p===this.cur||(MP.on&&MP.plat===p.plat));if(!p.root.visible&&!p.crashed&&p.mode!=='ai'&&!p.manual)continue;p.update(dt)}
    const p=this.cur;if(p){this.ridePilot(p,dt);if(p.kind==='fighter')this.fighterFire(p,dt);this.hudUpdate(p)}
    else if(MP.on&&MP.plat&&MP.plat.plane&&MP.plat.plane.manual)this.hudUpdate(MP.plat.plane);
    // dropped bombs
    for(let i=this.tr.length-1;i>=0;i--){const b=this.tr[i];if(b.custom){if(b.custom(dt))this.tr.splice(i,1);continue}b.t+=dt;b.vy-=9.81*dt;b.m.position.x+=b.vx*dt;b.m.position.y+=b.vy*dt;b.m.position.z+=b.vz*dt;b.m.rotation.x=Math.atan2(-b.vy,Math.hypot(b.vx,b.vz));
      const q=b.m.position,gy=Math.max(groundH(q.x,q.z),SL);const hit=WAR.airHit(q,1.5);if(q.y<=gy+.3||hit){scene.remove(b.m);this.tr.splice(i,1);GUN.addBoom(q.x,Math.max(gy,q.y),q.z,hit?22:20,130);GUN.push();FX.shakeT=.4;FX.shakeA=Math.max(FX.shakeA||0,.2)}}},
  crewInit(p){if(p.crew)return;p.crew=1;const mk=()=>{const P=makePlayer(CHAR.opts(CHAR.random()));P.root.traverse(m=>{if(m.isMesh){m.castShadow=false;m.frustumCulled=false}});try{mergeAvatar(P.root)}catch(e){}p.root.add(P.root);return P};
    const fa=mk();fa.root.position.set(-.9,-.95,11.2);fa.root.rotation.y=Math.PI;p.fa=fa;
    const fo=mk();fo.root.position.set(p.copilotSeat.x,p.copilotSeat.y,p.copilotSeat.z);p.copilotSeat.who='npc';p.fo=fo;
    const cp=mk();cp.root.position.set(p.pilotSeat.x,p.pilotSeat.y,p.pilotSeat.z);p.cap=cp},
  crewUpdate(dt){for(const p of this.list){if(!p.crew)continue;const near=MP.on&&MP.plat===p.plat;p.fa.root.visible=near;p.fo.root.visible=near;p.cap.root.visible=near&&!p.manual;if(!near)continue;animPlayer(p.fa,{spd:0,mode:'walk'},dt);animPlayer(p.fo,{spd:0,mode:'sit'},dt);if(p.cap.root.visible)animPlayer(p.cap,{spd:0,mode:'sit'},dt);
      // while the captain's chair is free (nobody in it) the captain keeps the seat
    }},
  // ---------- fighter weapons ----------
  fighterFire(p,dt){if(p.crashed)return;const k=inp.k;
    if(k.Space&&p.fireCd<=0&&p.ammo>0&&p.eng>.3){p.fireCd=.045;p.ammo--;const o=p.root.localToWorld(new THREE.Vector3(0,.2,8)),d=new THREE.Vector3(Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),Math.cos(p.yaw)*Math.cos(p.pitch));d.x+=(Math.random()-.5)*.012;d.y+=(Math.random()-.5)*.012;
      let hit=null,T=0;for(let t=20;t<900;t+=12){const q=o.clone().addScaledVector(d,t);const gy=Math.max(groundH(q.x,q.z),SL);if(q.y<gy){hit=q;T=t;break}if(WAR.airHit(q,2.5)){hit=q;T=t;break}if(t<250&&insideAny(q.x,q.z,.5,q.y)){hit=q;T=t;break}}
      const end=hit||o.clone().addScaledVector(d,900);GUN.tracer(o,end);if(hit){FX.init();FX.explode(hit.x,hit.y,hit.z,2.5);if(typeof FAUNA!=='undefined')FAUNA.boom(hit.x,hit.y,hit.z,4);const t=WAR.airHit(hit,2.5);if(t&&t.kill)t.kill(hit)}
      if(GUN.sfx)GUN.sfx('uzi',.6)}
    if(k.KeyX&&!this._xd&&p.bombs>0){this._xd=true;p.bombs--;this.dropBomb(p)}if(!k.KeyX)this._xd=false;
    if(k.KeyV&&!this._vd&&p.msl>0){this._vd=true;p.msl--;this.missile(p)}if(!k.KeyV)this._vd=false},
  dropBomb(p){const m=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1.2,10),new THREE.MeshStandardMaterial({color:0x4f5a47,roughness:.5,metalness:.4}));const w=p.root.localToWorld(new THREE.Vector3(0,-.9,-1));m.position.copy(w);scene.add(m);
    const f=new THREE.Vector3(Math.sin(p.yaw),0,Math.cos(p.yaw));this.tr.push({m,vx:f.x*p.v,vz:f.z*p.v,vy:p.vy,t:0});toast('Bomb away',p.bombs+' left')},
  missile(p){const dir=new THREE.Vector3(Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),Math.cos(p.yaw)*Math.cos(p.pitch));const o=p.root.localToWorld(new THREE.Vector3(p.msl%2?4.4:-4.4,-.6,-1));
    // a fast missile: flies straight (or homes on the nearest aircraft in front) and blows up on contact
    const m=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,2.2,8),new THREE.MeshStandardMaterial({color:0xe8e8e8,roughness:.4}));m.rotation.x=Math.PI/2;const g=new THREE.Group();g.add(m);g.position.copy(o);scene.add(g);
    let tgt=null,bd=2500;for(const t of WAR.targets()){if(t.id==='plane-'+p.id)continue;const v=t.pos.clone().sub(o),d=v.length();if(d<bd&&v.normalize().dot(dir)>.8){bd=d;tgt=t}}
    const vel=dir.clone().multiplyScalar(p.v+260),life=6;const upd=(dt)=>{};const rec={g,vel,tgt,t:0,fn:null};const step=(dt)=>{rec.t+=dt;if(rec.tgt){const want=rec.tgt.pos.clone().sub(g.position).normalize();vel.lerp(want.multiplyScalar(vel.length()),Math.min(1,dt*2.5))}g.position.addScaledVector(vel,dt);g.lookAt(g.position.clone().add(vel));
        FX.puff&&FX.puff({x:g.position.x,y:g.position.y,z:g.position.z,vx:0,vy:0,vz:0,s0:.5,s1:1.8,life:.8,c0:[1,.9,.7],c1:[.6,.6,.6],op:.5,add:false,drag:1,grow:1});
        const q=g.position,gy=Math.max(groundH(q.x,q.z),SL);const hit=WAR.airHit(q,2);if(q.y<=gy+.3||hit||rec.t>life||insideAny(q.x,q.z,.3,q.y)){scene.remove(g);GUN.addBoom(q.x,q.y,q.z,hit?25:16,120);GUN.push();return true}return false};
    this.tr.push({m:g,vx:0,vy:0,vz:0,t:0,custom:step});toast('Missile away',p.msl+' left')},
  // ---------- cockpit buttons ----------
  input(){const cvs=()=>renderer&&renderer.domElement;
    addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY,t:performance.now()}},true);
    addEventListener('pointerup',e=>{const d=this.down;this.down=null;if(!d||!started)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>10||performance.now()-d.t>380)return;if(!this.clickable())return;if(e.target!==cvs())return;this.click(e)},true);
    addEventListener('keydown',e=>{if(!started||e.repeat)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;const p=this.activePlane();if(!p)return;
      if(e.code==='KeyG')this.press(p,'gear');else if(e.code==='KeyO'){this.camMode=this.camMode==='chase'?'cockpit':'chase'}else if(e.code==='KeyB'&&p.kind==='fighter')this.press(p,'brake');
      else if(e.code==='KeyL')this.press(p,'nav');else if(e.code==='KeyP')this.press(p,'ap')})},
  activePlane(){if(this.cur)return this.cur;if(MP.on&&MP.plat&&MP.plat.plane&&MP.plat.plane.manual)return MP.plat.plane;return null},
  clickable(){const p=this.activePlane();return !!p&&(this.camMode==='cockpit')||!!(MP.on&&MP.plat&&MP.plat.plane&&!this.cur)},
  click(e){const r=renderer.domElement.getBoundingClientRect();this.ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);this.rc.setFromCamera(this.ndc,camera);
    const pl=this.cur||(MP.plat&&MP.plat.plane);if(!pl||!pl.btns)return;const hits=this.rc.intersectObjects(pl.btns.map(b=>b.mesh),false);if(!hits.length||hits[0].distance>2.8)return;const id=hits[0].object.userData.btn.id;this.press(pl,id)},
  press(p,id){const on=(b)=>{p.btnDirty=true};
    switch(id){
      case 'batt':p.batt=!p.batt;toast('Battery',p.batt?'ON':'OFF');break;
      case 'fuel':p.fuel=!p.fuel;toast('Fuel pumps',p.fuel?'ON':'OFF');break;
      case 'eng1':case 'eng2':{const k=id;if(!p[k]&&(!p.batt||!p.fuel)){toast('Cannot start','switch the battery and the fuel pumps on first');break}p[k]=!p[k];toast('Engine '+(id==='eng1'?'1':'2'),p[k]?'starting…':'shut down');p.engOn=!!(p.eng1||p.eng2);if(typeof AUD!=='undefined'&&AUD&&AUD.ok&&p[k])AUD.tone(180,420,2.2,.05,'sawtooth');break}
      case 'eng':p.engOn=!p.engOn;toast('Engine',p.engOn?'starting…':'shut down');break;
      case 'apu':p.apu=!p.apu;toast('APU',p.apu?'running':'off');break;
      case 'belts':p.seatbelt=!p.seatbelt;toast('Seat belts',p.seatbelt?'sign ON — fasten your seat belts':'sign OFF');if(typeof AUD!=='undefined'&&AUD&&AUD.ok)AUD.tone(1200,1200,.25,.06,'sine');break;
      case 'nav':case 'lights':p.lightsOn=!p.lightsOn;toast('Exterior lights',p.lightsOn?'ON':'OFF');break;
      case 'cabl':p.cabinLights=!p.cabinLights;toast('Cabin lights',p.cabinLights?'ON':'OFF');break;
      case 'gear':if(p.onGround&&p.gearT>.5){toast('Cannot retract the gear on the ground','take off first');break}p.gearT=p.gearT>.5?0:1;toast('Landing gear',p.gearT>.5?'DOWN':'UP');break;
      case 'flaps':p.flaps=p.flaps>=1?0:p.flaps+.5;toast('Flaps',['UP','HALF','FULL'][Math.round(p.flaps*2)]);break;
      case 'ap':case 'hold':p.hold=!p.hold;if(p.hold){p.hdgT=p.yaw;p.altT=p.y;p.spdT=Math.max(p.v,p.d.vs*1.5)}toast('Autopilot',p.hold?'holding heading '+Math.round(((p.yaw*180/Math.PI)%360+360)%360)+'° and altitude':'OFF');break;
      case 'brake':p.parking=!p.parking;toast('Parking brake',p.parking?'SET':'released');break;
      case 'door':if(p.onGround&&p.v<2){p.doorOpen=!p.doorOpen;toast('Cabin door',p.doorOpen?'open':'closed')}break;
      case 'pa':toast('Cabin announcement','"Ladies and gentlemen, this is your captain. Welcome aboard Odesa Air."');if(typeof AUD!=='undefined'&&AUD&&AUD.ok){AUD.tone(784,784,.3,.06,'sine');AUD.tone(988,988,.5,.06,'sine',undefined,.3)}break;
      case 'canopy':p.canopy=!p.canopy;if(p.parts.canopy)p.parts.canopy.visible=!p.canopy;toast('Canopy',p.canopy?'OPEN':'closed');break;
      case 'ab':p.ab=!p.ab;toast('Afterburner',p.ab?'ARMED (full throttle)':'off');break;
      case 'arm':toast('Weapons','Space cannon · X bomb · V missile');break}
    p.btnDirty=true;this.refreshButtons(p);
    // engines run with either engine switch on (airliner needs the battery); the fighter has one switch
    if(p.kind==='airliner')p.engOn=!!((p.eng1||p.eng2)&&(p.batt!==false||true))},
  refreshButtons(p){p.btnDirty=false;const st={batt:p.batt,fuel:p.fuel,eng1:p.eng1,eng2:p.eng2,apu:p.apu,belts:p.seatbelt,nav:p.lightsOn,lights:p.lightsOn,cabl:p.cabinLights,gear:p.gearT>.5,flaps:p.flaps>0,ap:p.hold,hold:p.hold,brake:p.parking,door:p.doorOpen,eng:p.engOn,ab:p.ab,canopy:!p.canopy,arm:true,pa:false};
    for(const b of p.btns||[]){b.mesh.material.emissiveIntensity=st[b.id]?1.6:.12}},
  // ---------- HUD strip ----------
  hud(){const d=document.createElement('div');d.id='pHud';d.hidden=true;
    d.innerHTML='<div class="pRow" id="pRd"></div><div class="pRow"><button data-a="eng">⚙ Engines</button><button data-a="thrD">THR −</button><div class="pBar"><i id="pThr"></i></div><button data-a="thrU">THR +</button><button data-a="gear">🛞 Gear</button><button data-a="flaps">Flaps</button><button data-a="brake">Brake</button></div><div class="pRow"><button data-a="nav">💡 Lights</button><button data-a="ap">🤖 Autopilot</button><button data-a="cam">🎥 View</button><button data-a="fire" class="pF">🔫 Fire</button><button data-a="bomb" class="pF">💣 Bomb</button><button data-a="msl" class="pF">🚀 Missile</button><button data-a="leave">⏏ Leave</button></div>';
    const st=document.createElement('style');st.textContent='#pHud{position:absolute;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:7;display:flex;flex-direction:column;gap:5px;padding:8px 10px;border-radius:14px;background:rgba(10,22,30,.78);border:1px solid rgba(255,255,255,.18);color:#fff;font:600 12px system-ui;backdrop-filter:blur(6px);max-width:98vw;touch-action:none;user-select:none}#pHud .pRow{display:flex;gap:5px;align-items:center;justify-content:center;flex-wrap:wrap}#pHud button{padding:8px 10px;border-radius:9px;border:1.5px solid rgba(255,255,255,.25);background:rgba(40,60,80,.85);color:#fff;font:700 11.5px system-ui;touch-action:none}#pHud button:active{background:#f2c14e;color:#111}#pHud .pBar{width:90px;height:9px;border-radius:5px;background:rgba(255,255,255,.18);overflow:hidden}#pHud .pBar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3ad07a,#f2c14e,#ff5a3a)}#pRd{font:700 13px ui-monospace,monospace;letter-spacing:.04em;color:#7fe8ff}@media (max-height:430px){#pHud{bottom:4px;padding:5px 7px}#pHud button{padding:5px 7px;font-size:10.5px}}';document.head.appendChild(st);
    (document.getElementById('hud')||document.body).appendChild(d);this.hudEl=d;
    d.addEventListener('pointerdown',e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;e.preventDefault();const p=this.activePlane();if(!p)return;
      if(a==='thrU')p.thrT=Math.min(1,p.thrT+.15);else if(a==='thrD')p.thrT=Math.max(0,p.thrT-.15);else if(a==='cam')this.camMode=this.camMode==='chase'?'cockpit':'chase';
      else if(a==='fire'){if(p.kind==='fighter'){inp.k.Space=true;setTimeout(()=>inp.k.Space=false,900)}}else if(a==='bomb'){if(p.kind==='fighter'&&p.bombs>0){p.bombs--;this.dropBomb(p)}}else if(a==='msl'){if(p.kind==='fighter'&&p.msl>0){p.msl--;this.missile(p)}}
      else if(a==='leave'){if(this.cur)this.leaveFighter();else if(MP.on&&MP.seat)MP.stand()}
      else if(a==='eng'){if(p.kind==='airliner'){p.eng1=p.eng2=!p.engOn;p.batt=p.fuel=true;p.engOn=p.eng1;toast('Engines',p.engOn?'starting…':'shut down');p.btnDirty=true}else this.press(p,'eng')}
      else this.press(p,a)});},
  hudShow(on){if(!this.hudEl)return;this.hudEl.hidden=!on;const p=this.activePlane();for(const b of this.hudEl.querySelectorAll('.pF'))b.style.display=(p&&p.kind==='fighter')||(this.cur&&this.cur.kind==='fighter')?'':'none'},
  hudUpdate(p){if(!this.hudEl||this.hudEl.hidden){this.hudShow(true)}const kn=Math.round(p.v*1.944),agl=Math.round(p.y+p.bottom()-groundH(p.x,p.z)),hd=Math.round(((p.yaw*180/Math.PI)%360+360)%360);
    const r=document.getElementById('pRd');if(r)r.textContent=kn+' kt · '+Math.round(p.y-SL)+' m · '+agl+' AGL · VS '+Math.round(p.vy*196.85/100)*100/100+' · HDG '+String(hd).padStart(3,'0')+(p.hold?' · AUTO':'')+(p.onGround?' · GROUND':'');
    const t=document.getElementById('pThr');if(t)t.style.width=Math.round(p.thr*100)+'%'},
  tick(dt){this.update(dt);this.crewUpdate(dt)}
};
