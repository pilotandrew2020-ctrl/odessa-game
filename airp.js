/* ===================================================================================================
   airp.js — ODESA AIRPORT, on the real airport land north-west of the city (the strip the map data leaves empty).
   Airport frame (u along the runway, v across; the terminal side is +v) is the local frame of one group, so everything is built in (u,v).
   • runway 1500 m with markings and lights, taxiway, apron, walkable terminal (check-in, queue lines, benches, security arches, gate doors,
     departures board), control tower, hangar, parked fighter jet, the airliner at its stand with a boarding queue
   • the scheduled airliner flies itself: pushback → taxi → take-off → a lap over the city (passes over the home area) → landing → taxi → boarding
   • spawn menu (More → Aircraft): airliner / fighter at the airport, call the yacht
   =================================================================================================== */
const AIRP={C:[-4200,-4320],ang:1.309,y0:0,g:null,ready:false,ai:null,queue:[],boards:[],flight:null,
  get ca(){return Math.cos(this.ang)},get sa(){return Math.sin(this.ang)},
  P(u,v){return [this.C[0]+u*this.ca-v*this.sa,this.C[1]+u*this.sa+v*this.ca]},
  inv(x,z){const dx=x-this.C[0],dz=z-this.C[1];return [dx*this.ca+dz*this.sa,-dx*this.sa+dz*this.ca]},
  yawOf(du,dv){const x=du*this.ca-dv*this.sa,z=du*this.sa+dv*this.ca;return Math.atan2(x,z)},
  init(world){
    const ang=this.ang,C=this.C,mid=this.P(0,90);
    // level the ground (49 m everywhere already) and keep trees / generated buildings off the whole site
    const h0=rawH(C[0],C[1]);addFlatRect(mid[0],mid[1],ang,1900,460,160,h0);addBlock(mid[0],mid[1],1900,440,ang);this.y0=h0;
    const g=this.g=new THREE.Group();g.position.set(C[0],h0,C[1]);g.rotation.y=-ang;world.add(g);
    this.mats();this.buildGround();this.buildTerminal();this.buildTower();this.buildHangar();this.buildLights();
    PLACES.push({id:'airport',name:'Odesa Airport',sub:'terminal · runway · airliner · fighter jet',x:this.P(-20,215)[0],z:this.P(-20,215)[1],yaw:this.yawOf(0,-1)});try{MAP_MAJOR.add('airport')}catch(e){}
    // aircraft: the scheduled airliner at stand A (nose to the terminal), a fighter on the apron
    const sA=this.P(-20,140),yawA=this.yawOf(0,1);const A=PLN.add('airliner',sA[0],sA[1],yawA);A.mode='parked';A.ai={phase:'hold',t:0,T:75,s:0,path:null};A.parking=true;this.flight=A;PLN.crewInit(A);
    const sF=this.P(110,128);PLN.add('fighter',sF[0],sF[1],this.yawOf(0,1));
    PLN.aiStep=(p,dt)=>this.aiStep(p,dt);
    this.queueInit();this.ready=true},
  mats(){const S=MBM.std,po={polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2};const stripe=MBM.tex(64,64,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h)});
    this.M={asphalt:S(0x3a3d41,.95,0,po),taxi:S(0x44474b,.95,0,po),apron:S(0x9a9c9e,.9,0,po),white:S(0xffffff,.8,0,po),yellow:S(0xe8c21a,.8,0,po),grass:S(0x4a6a38,1,0),conc:S(0xb8b6b0,.85,0),concD:S(0x8c8a84,.9,0),glass:MBM.glass(0x8fb8d0,.28),frame:S(0x2a2d31,.5,.5),roof:S(0xdfe3e6,.5,.3),wood:S(0x8a6a48,.8,0),
      desk:S(0x3a4a5a,.6,.2),deskT:S(0xe8e6e0,.6,0),blueL:MBM.emis(0x3060ff,1.2),greenL:MBM.emis(0x20e060,1.4),redL:MBM.emis(0xff3020,1.4),whiteL:MBM.emis(0xfff4dc,1.3),lamp:MBM.emis(0xfff0d0,.8),rope:S(0xc03030,.7),pole:S(0xc8ccd0,.3,.9),seat:S(0x2a4a78,.8),seatD:S(0x1b2f4f,.8),floor:S(0xc9c6bc,.35,.1),floorD:S(0x6b6e72,.5),tile:S(0xffffff,.35,.05,{map:MBM.tile('#d8d5cc','#c3c0b6')}),metal:S(0x8a9096,.4,.7),dark:S(0x18191c,.6,.3),plant:S(0x3f7a3a,.9),pot:S(0x8a5a3a,.8),sign:MBM.emis(0x2a7fd0,.9),tower:S(0xd8d6d0,.8),towerD:S(0x2a3038,.6,.3),orange:S(0xe85a1a,.7),wing:S(0xcfd2d4,.8)}},
  buildGround(){const mb=new MB(),y=.05,Y=y+.01;
    mb.bx('grass',-1150,1150,-.05,.03,-330,330);   // the green field around the strip (hides the join with the terrain)
    mb.bx('asphalt',-750,750,y-.03,y+.02,-22.5,22.5);                                       // runway
    mb.bx('taxi',-720,720,y-.03,y+.02,66,84);for(const u of [-722,-350,0,350,712])mb.bx('taxi',u-9,u+9,y-.03,y+.02,22,66);   // taxiway + connectors
    mb.bx('apron',-270,270,y-.04,y+.02,84,188);                                             // apron
    for(const v of [-21.8,21.8])mb.bx('white',-748,748,Y,Y+.01,v-.2,v+.2);                   // edge lines
    for(let u=-700;u<700;u+=50)mb.bx('white',u,u+25,Y,Y+.01,-.4,.4);                         // centreline dashes
    for(const s of [-1,1]){for(let i=0;i<8;i++)mb.bx('white',s*738,s*(738-26)+0,Y,Y+.01,-18+i*4.7,-18+i*4.7+2.2);       // threshold bars
      for(const [off,w] of [[300,1.8],[420,1.0],[150,1.0]])for(const side of [-1,1])mb.bx('white',s*(750-off)-14,s*(750-off)+14,Y,Y+.01,side*7-w/2,side*7+w/2);}   // touchdown / aiming marks
    // taxiway centre (yellow) and gate lines on the apron
    mb.bx('yellow',-720,720,Y,Y+.01,74.8,75.2);for(const u of [-20,110]){mb.bx('yellow',u-.2,u+.2,Y,Y+.01,84,140)}mb.bx('yellow',-260,260,Y,Y+.01,185,185.4);
    for(const u of [-80,-20,40,110,170])mb.bx('yellow',u-8,u+8,Y,Y+.01,150,150.4);
    mb.build(this.g,this.M,{static:true,noShadow:new Set(['grass','asphalt','taxi','apron','white','yellow'])});
    // runway numbers (canvas, flat)
    const num=(t,u,rot)=>{const cv=document.createElement('canvas');cv.width=128;cv.height=256;const x=cv.getContext('2d');x.fillStyle='#fff';x.font='700 150px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(t,64,128);const tx=new THREE.CanvasTexture(cv);const m=new THREE.Mesh(new THREE.PlaneGeometry(10,20),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,toneMapped:false}));m.rotation.x=-Math.PI/2;m.rotation.z=rot;m.position.set(u,.09,0);this.g.add(m)};
    num('16',-690,Math.PI/2*0+Math.PI/2);num('34',690,-Math.PI/2)},
  // runway / taxiway lights as instanced emissive points; they glow at night
  buildLights(){const mb=new MB();for(let u=-750;u<=750;u+=60)for(const v of [-24,24]){mb.sph('whiteL',.28,u,.3,v)}for(const v of [-18,-12,-6,0,6,12,18]){mb.sph('greenL',.3,-752,.3,v);mb.sph('redL',.3,752,.3,v)}
    for(let u=-700;u<=700;u+=40)for(const v of [64,86])mb.sph('blueL',.22,u,.25,v);
    for(let i=0;i<10;i++){mb.sph('whiteL',.35,-1000-i*60*0,.3,0)}
    mb.build(this.g,this.M,{static:true,noShadow:new Set(['whiteL','greenL','redL','blueL'])})},
  // ---------- terminal ----------
  buildTerminal(){const M=this.M,mb=new MB(),g=this.g,U0=-95,U1=95,V0=190,V1=232,H=10.5,FL=.4;this.solids=[];
    const wall=(u0,u1,v0,v1,y0,y1,k,solid)=>{mb.bx(k,u0,u1,y0,y1,v0,v1);if(solid!==false){const c=this.P((u0+u1)/2,(v0+v1)/2);addWall(c[0],c[1],u1-u0,v1-v0,this.ang,this.y0+y0,this.y0+y1)}};
    const glassRun=(u0,u1,v,y0,y1,gaps)=>{gaps=(gaps||[]).slice().sort((a,b)=>a[0]-b[0]);let cur=u0;const run=(a,b)=>{const n=Math.max(1,Math.round((b-a)/3.2)),w=(b-a)/n;for(let i=0;i<n;i++){const p0=a+i*w,p1=p0+w;mb.bx('frame',p1-.08,p1+.08,y0,y1,v-.1,v+.1);mb.bx('glass',p0+.08,p1-.08,y0+.3,y1-.2,v-.03,v+.03)}mb.bx('frame',a,b,y0,y0+.3,v-.12,v+.12);mb.bx('frame',a,b,y1-.2,y1,v-.12,v+.12);const c=this.P((a+b)/2,v);addWall(c[0],c[1],b-a,.3,this.ang,this.y0+y0,this.y0+y1)};
      for(const [a,b] of gaps){if(a>cur)run(cur,a);cur=b}if(cur<u1)run(cur,u1)};
    // slab + roof
    mb.bx('floor',U0,U1,0,FL,V0,V1);mb.bx('roof',U0-4,U1+4,H,H+.6,V0-14,V1+3);mb.bx('metal',U0-4,U1+4,H-.3,H,V0-14,V0-13.6);
    for(let u=U0+10;u<U1;u+=20)for(const v of [V0-12.5,V0-1]){mb.bx('frame',u-.25,u+.25,FL,H,v-.25,v+.25)}   // canopy columns over the apron side
    // airside wall with 5 gate doors; landside wall with the main entrance; solid ends
    const gates=[-80,-40,0,40,80].map(u=>[u-3,u+3]);glassRun(U0,U1,V0,FL,H-.2,gates);glassRun(U0,U1,V1,FL,H-.2,[[-7,7]]);
    wall(U0-.4,U0,V0,V1,FL,H,'concD');wall(U1,U1+.4,V0,V1,FL,H,'concD');
    // ---- interior: check-in, queues, benches, security arches, cafe, board wall, plants ----
    mb.bx('tile',U0,U1,FL,FL+.01,V0,V1);
    for(let u=-72;u<=72;u+=24){wall(u-4,u+4,212,213.2,FL,FL+1.15,'desk');mb.bx('deskT',u-4.05,u+4.05,FL+1.15,FL+1.22,211.9,213.3);mb.bx('sign',u-2.5,u+2.5,FL+3.4,FL+4.2,212.3,212.4);mb.bx('dark',u-.7,u+.7,FL+1.22,FL+1.7,212.4,212.6)}   // 7 check-in desks with monitors
    for(let u=-72;u<=72;u+=24){for(let i=0;i<5;i++){mb.cyl('pole',.03,.03,1.0,6,u-8+i*0+i*0,FL+.5,200+i*1.9);mb.cyl('pole',.03,.03,1.0,6,u+8,FL+.5,200+i*1.9)}for(let i=0;i<4;i++){mb.rod('rope',.012,[u-8,FL+.9,200+i*1.9],[u-8,FL+.9,200+(i+1)*1.9],4);mb.rod('rope',.012,[u+8,FL+.9,200+i*1.9],[u+8,FL+.9,200+(i+1)*1.9],4)}}
    for(const u of [-60,-20,20,60]){for(const s of [-1,1]){wall(u+s*1.6-.1,u+s*1.6+.1,194,198,FL,FL+2.4,'metal')}mb.bx('metal',u-1.7,u+1.7,FL+2.3,FL+2.5,194,198);mb.bx('blueL',u-1.4,u+1.4,FL+2.1,FL+2.2,196,196.2)}   // security arches before the gates
    for(let u=-60;u<=60;u+=24)for(const v of [222,226]){mb.bx('seat',u-4,u+4,FL+.42,FL+.55,v-.4,v+.4);mb.bx('seat',u-4,u+4,FL+.55,FL+1.0,v+.35,v+.45);mb.bx('seatD',u-4,u+4,FL,FL+.42,v-.3,v+.3);const c=this.P(u,v);addWall(c[0],c[1],8,.9,this.ang,this.y0+FL,this.y0+FL+1.0)}
    wall(-93,-70,226,230,FL,FL+1.15,'wood');mb.bx('deskT',-93.1,-69.9,FL+1.15,FL+1.22,225.9,230.1);for(let i=0;i<4;i++)mb.cyl('metal',.25,.25,.05,10,-90+i*5,FL+.8,224.4);   // cafe counter
    for(const u of [-90,90,-30,30]){mb.cyl('pot',.45,.35,.7,10,u,FL+.35,200);mb.sph('plant',.8,u,FL+1.5,200,1,1.3,1)}
    for(let u=-85;u<=85;u+=17)for(const v of [196,226])mb.cyl('lamp',.35,.35,.05,12,u,H-.05,v);
    mb.bx('dark',-20,20,FL+3.2,FL+9.0,231.4,231.6);                   // frame behind the departures board
    mb.build(g,M,{static:true,noShadow:new Set(['tile','glass','lamp','whiteL','sign','floor'])});
    // walkable slab (raised 0.4 m): steps are low enough to walk onto
    holdSpecial((x,z)=>{const [u,v]=this.inv(x,z);if(u>U0&&u<U1&&v>V0&&v<V1)return {h:this.y0+FL,pri:1,surf:'marble'};return null});
    // the departures board: back wall of the hall, facing the entrance
    this.boardMain=TRN2.makeBoard(30,12.4,'ODESA INTERNATIONAL · DEPARTURES',()=>this.rows());this.boardMain.mesh.position.set(0,FL+6.1,231.3);this.boardMain.mesh.rotation.y=Math.PI;g.add(this.boardMain.mesh);
    // a second board outside, above the gates, facing the apron
    this.boardGate=TRN2.makeBoard(14,6,'GATE INFORMATION',()=>this.rows());this.boardGate.mesh.position.set(-20,H-3.2,V0-.4);g.add(this.boardGate.mesh);
    // signs
    this.sign=labelSprite(['ODESA AIRPORT','ОДЕСА · ODS'],{w:1024,h:200,size:80,color:'#fff',bg:'rgba(10,30,70,.7)',round:30,scale:6});this.sign.position.set(0,H+5,V1);g.add(this.sign)},
  buildTower(){const mb=new MB(),M=this.M,g=this.g,u=125,v=225;mb.cyl('tower',3.2,4.2,32,16,u,16,v);mb.cyl('towerD',5.4,5.4,.4,18,u,32.2,v);mb.cyl('towerD',5.8,5.8,.5,18,u,38.6,v);
    for(let i=0;i<12;i++){const a=i/12*6.283;mb.bx('glass',u+Math.cos(a)*5.2-.1,u+Math.cos(a)*5.2+.1,33,38,v+Math.sin(a)*5.2-.9,v+Math.sin(a)*5.2+.9)}
    mb.cyl('tower',.15,.15,6,6,u,41.6,v);mb.sph('redL',.4,u,44.8,v);mb.cyl('orange',3.3,3.3,2,16,u,28,v);
    mb.build(g,M,{static:true});const c=this.P(u,v);STATIC_CIR.push(c[0],c[1],4.6)},
  buildHangar(){const mb=new MB(),M=this.M,g=this.g,u=-190,v=205,W=56,D=42,H=17;
    mb.bx('conc',u-W/2,u+W/2,0,.2,v-D/2,v+D/2);mb.bx('concD',u-W/2,u+W/2,0,H,v+D/2-.4,v+D/2);                                    // back wall
    mb.bx('concD',u-W/2,u-W/2+.4,0,H,v-D/2,v+D/2);mb.bx('concD',u+W/2-.4,u+W/2,0,H,v-D/2,v+D/2);mb.bx('metal',u-W/2-1,u+W/2+1,H,H+.5,v-D/2-1,v+D/2+1);   // side walls + roof
    for(let i=-2;i<=2;i++)mb.bx('frame',u+i*13-.3,u+i*13+.3,0,H,v-D/2,v-D/2+.6);mb.bx('whiteL',u-W/2+4,u+W/2-4,H-.5,H-.3,v-6,v-5);mb.bx('whiteL',u-W/2+4,u+W/2-4,H-.5,H-.3,v+6,v+7);
    for(let i=0;i<3;i++)mb.bx('dark',u-20+i*20-3,u-20+i*20+3,.2,1.4,v-5,v+9);                               // tool carts
    mb.build(g,M,{static:true});
    for(const [a,b,w,d] of [[u,v+D/2,W,.5],[u-W/2,v,.5,D],[u+W/2,v,.5,D]]){const c=this.P(a,b);addWall(c[0],c[1],w,d,this.ang,this.y0,this.y0+H)}},
  // ---------- boarding queue ----------
  queueInit(){const mk=()=>{const P=makePlayer(CHAR.opts(CHAR.random()));P.root.traverse(m=>{if(m.isMesh){m.castShadow=false;m.frustumCulled=false}});try{mergeAvatar(P.root)}catch(e){}this.g.add(P.root);return P};
    // stanchions leading from the gate door to the stairs of the aircraft, people waiting in line
    const mb=new MB(),M=this.M;for(let i=0;i<8;i++){mb.cyl('pole',.03,.03,1.0,6,-24,.5,150+i*5);mb.cyl('pole',.03,.03,1.0,6,-16,.5,150+i*5)}for(let i=0;i<7;i++){mb.rod('rope',.012,[-24,.9,150+i*5],[-24,.9,150+(i+1)*5],4);mb.rod('rope',.012,[-16,.9,150+i*5],[-16,.9,150+(i+1)*5],4)}mb.build(this.g,M,{static:true,noShadow:new Set(['pole','rope'])});
    for(let i=0;i<8;i++){const P=mk();P.root.position.set(-20+(i%2?1.2:-1.2),0,155+i*3.2);P.root.rotation.y=Math.PI+(i%3-1)*.25;this.queue.push(P)}
    // a few people in the hall
    for(const [u,v,yaw,seat] of [[-61,222,Math.PI,1],[-58.5,222,Math.PI,1],[11,226,Math.PI,1],[37,222,Math.PI,1]]){const P=mk();P.root.position.set(u,.4+(seat?-.05:0),v);P.root.rotation.y=yaw;P.seat=seat;this.queue.push(P)}},
  queueUpdate(dt){const near=Math.hypot(player.x-this.P(0,170)[0],player.z-this.P(0,170)[1])<230;const A=this.flight,a=A&&A.ai;const show=near&&a&&a.phase==='hold'&&(a.T-a.t>20);
    this.queue.forEach((P,i)=>{const hall=i>=8;P.root.visible=near&&(hall||show);if(!P.root.visible)return;animPlayer(P,{spd:0,mode:P.seat?'sit':'walk'},dt)})},
  // ---------- departures board rows ----------
  rows(){const A=this.flight,a=A&&A.ai,R=[],clk=TRN2.clock.bind(TRN2);let st='ON TIME',t=clk(0),hold=0;
    if(a){if(a.phase==='hold'){hold=Math.max(0,a.T-a.t);t=clk(hold);st=hold<25?'GATE CLOSED':'BOARDING '+Math.floor(hold/60)+':'+String(Math.floor(hold%60)).padStart(2,'0')}else if(a.phase==='push'||(a.phase==='fly'&&a.s<2200)){st='DEPARTING';t=clk(0)}else if(a.phase==='fly'){st='IN THE AIR';t=clk(-60)}}
    R.push(['301','ODESA AIR · Kyiv Boryspil',t,'A',st,a&&a.phase==='hold']);
    const extra=[['LH 2522','Lufthansa · Frankfurt',22,'B','ON TIME'],['PC 818','Pegasus · Istanbul',48,'C','ON TIME'],['LO 756','LOT · Warsaw',75,'B','DELAYED 20 MIN'],['AF 1429','Air France · Paris',110,'D','ON TIME'],['TK 1472','Turkish · Istanbul',140,'C','ON TIME'],['W6 4012','Wizz · Vienna',185,'A','ON TIME']];
    for(const e of extra)R.push([e[0],e[1],clk(e[2]*60),e[3],e[4],false]);return R},
  // ---------- the scheduled flight: a kinematic circuit ----------
  buildPath(){const N=[],push=(u,v,h,sp)=>N.push({u,v,h,sp}),arc=(cu,cv,R,sgn,a0,a1,h0,h1,sp,n)=>{for(let i=1;i<=n;i++){const f=i/n,a=a0+(a1-a0)*f;push(cu+sgn[0]*R*Math.sin(a),cv+sgn[1]*R*Math.cos(a),h0+(h1-h0)*f,sp)}};
    push(-20,118,0,6);push(-20,100,0,7);push(-60,80,0,8);push(-200,75,0,9);push(-700,75,0,9);push(-722,60,0,6);push(-722,22,0,5);push(-722,0,0,5);
    push(-700,0,0,14);push(-300,0,0,55);push(250,0,0,78);push(560,0,0,86);push(1500,0,48,100);push(3000,0,450,125);push(6000,0,700,140);
    arc(6000,-1500,1500,[1,1],0,Math.PI,700,700,140,12);                  // right-hand turn over the sea of rooftops (home is under the downwind leg)
    push(1500,-3000,700,140);push(-3000,-3000,650,135);push(-6000,-3000,600,125);
    arc(-6000,-1500,1500,[-1,-1],0,Math.PI,600,420,115,12);               // turn back onto final
    push(-4500,0,330,100);push(-3000,0,210,92);push(-1500,0,95,82);push(-790,0,22,74);push(-640,0,0,70);
    push(500,0,0,14);push(700,0,0,9);push(712,22,0,6);push(712,75,0,6);push(300,75,0,8);push(-20,100,0,6);push(-20,138,0,3);push(-20,140,0,0);
    const pts=[],S=[],H=[],V=[];let s=0;N.forEach((n,i)=>{const w=this.P(n.u,n.v);if(i){s+=Math.hypot(w[0]-pts[i-1][0],w[1]-pts[i-1][1])}pts.push(w);S.push(s);H.push(n.h);V.push(n.sp)});return {pts,S,H,V,L:s}},
  sample(path,s){const S=path.S;let i=1;while(i<S.length-1&&S[i]<s)i++;const f=Math.max(0,Math.min(1,(s-S[i-1])/Math.max(1e-6,S[i]-S[i-1])));const a=path.pts[i-1],b=path.pts[i];
    return {x:a[0]+(b[0]-a[0])*f,z:a[1]+(b[1]-a[1])*f,h:path.H[i-1]+(path.H[i]-path.H[i-1])*f,sp:path.V[i-1]+(path.V[i]-path.V[i-1])*f,tx:b[0]-a[0],tz:b[1]-a[1],i}},
  aiStep(p,dt){const a=p.ai;if(!a)return;a.t+=dt;p.eng+=((p.engOn?1:0)-p.eng)*Math.min(1,dt*.35);p.thr+=((a.phase==='fly'?(p.v>50?.8:.35):0)-p.thr)*Math.min(1,dt);
    if(a.phase==='hold'){p.v=0;p.onGround=true;p.mode='parked';p.doorOpen=(a.T-a.t)>25;p.engOn=false;p.parking=true;p.y=groundH(p.x,p.z)-p.bottom();
      if(p.manual&&!p.hold){p.mode='parked';return}
      if(a.t>=a.T){a.phase='push';a.s=0;a.t=0;p.doorOpen=false;p.engOn=true;p.parking=false;toast('Odesa Air 301','doors closed · pushback');p.fa&&0}return}
    if(a.phase==='push'){a.s+=2.2*dt;p.x-=Math.sin(p.yaw)*2.2*dt;p.z-=Math.cos(p.yaw)*2.2*dt;p.v=0;p.doorOpen=false;p.mode='ai';if(a.s>=22){a.phase='fly';a.s=0;a.path=a.path||this.buildPath();a.yawv=0}return}
    // fly the path
    const path=a.path;p.mode='ai';p.doorOpen=false;const sm=this.sample(path,a.s);
    // speed follows the profile (faster up than down)
    const tv=sm.sp,dv=tv-p.v;p.v+=Math.max(-3.8*dt,Math.min(2.8*dt,dv));a.s+=Math.max(.001,p.v)*dt;
    const sm2=this.sample(path,Math.min(path.L-.01,a.s)),look=this.sample(path,Math.min(path.L-.01,a.s+Math.max(14,p.v*1.4)));
    const nyaw=Math.atan2(look.x-sm2.x,look.z-sm2.z);let dy=nyaw-p.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;const lim=(p.v<12?.5:.22)*dt;const d=Math.max(-lim,Math.min(lim,dy*Math.min(1,dt*3)));p.yaw+=d;
    const turnRight=-d/Math.max(dt,1e-3);const rollT=Math.max(-.45,Math.min(.45,Math.atan(p.v*turnRight/9.81)*1.2));p.roll+=(rollT-p.roll)*Math.min(1,dt*1.5);
    p.x=sm2.x;p.z=sm2.z;const gy=groundH(p.x,p.z);const target=gy+sm2.h-p.bottom();const climb=(target-p.y)/Math.max(dt,1e-3);p.vy=Math.max(-12,Math.min(14,climb));
    p.y=sm2.h<.4?gy-p.bottom():target;p.onGround=sm2.h<.6;
    const pitchT=p.onGround?(sm2.h<.4&&p.v>76&&a.s>1000&&a.s<1400?.12:0):Math.max(-.12,Math.min(.2,Math.atan2(p.vy,Math.max(30,p.v))));p.pitch+=(pitchT-p.pitch)*Math.min(1,dt*1.2);
    // gear and flaps: up shortly after take-off, down on the way in
    if(!p.onGround&&sm2.h>50&&a.s<8000){p.gearT=0;p.flaps=0}if(sm2.h<420&&a.s>20000){p.gearT=1;p.flaps=Math.min(1,p.flaps+dt*.1)}if(p.onGround&&a.s>25000){p.flaps=Math.max(0,p.flaps-dt*.15)}
    p.ctl.p=0;p.ctl.r=Math.max(-1,Math.min(1,p.roll*2));p.ctl.y=0;p.steer=0;
    if(a.s>=path.L-.5){a.phase='hold';a.t=0;a.T=95;a.path=null;p.park(...this.P(-20,140),this.yawOf(0,1));p.mode='parked';p.ai=a;p.engOn=false;p.doorOpen=true;p.parking=true;toast('Odesa Air 301','arrived · welcome to Odesa')}},
  update(dt){if(!this.ready)return;const b1=this.boardMain,b2=this.boardGate;this._bt=(this._bt||0)-dt;if(this._bt<=0){this._bt=1;const near=Math.hypot(player.x-this.P(0,200)[0],player.z-this.P(0,200)[1])<320;if(near){for(const b of [b1,b2]){TRN2.drawBoard(b.cv,b.title,b.rowsFn());b.tex.needsUpdate=true}}}
    this.queueUpdate(dt);
    // the sign and ground are always cheap; hide the whole airport far away
    this.g.visible=Math.hypot(player.x-this.C[0],player.z-this.C[1])<5200||this.flight&&!this.flight.onGround},
  // ---------- spawn menu ----------
  spawn(kind){const near=Math.hypot(player.x-this.P(0,150)[0],player.z-this.P(0,150)[1])<500;let a=this.mine&&this.mine[kind];
    const spots={airliner:this.P(-110,125),fighter:this.P(60,125)};const sp=spots[kind],yaw=this.yawOf(0,1);
    if(!a){a=PLN.add(kind,sp[0],sp[1],yaw);this.mine=this.mine||{};this.mine[kind]=a;PLN.crewInit&&kind==='airliner'&&PLN.crewInit(a)}
    else{if(PLN.cur===a)PLN.leaveFighter();a.park(sp[0],sp[1],yaw);a.engOn=false;a.eng=0;a.hold=false;a.parking=true;a.mode='parked';a.root.visible=true}
    a.manual=false;const go=()=>{if(!near){const q=this.P(-80,170);teleportRaw(q[0],q[1],this.yawOf(0,-1))}toast(kind==='airliner'?'Airliner spawned':'Fighter spawned','at Odesa Airport apron · walk up to it ('+(kind==='airliner'?'E to board':'E to climb in')+')')};
    if(near)go();else{const f=$('fade');f.style.opacity=1;setTimeout(()=>{go();f.style.opacity=0},380)}},
  menu(){let m=document.getElementById('airPick');if(!m){m=document.createElement('div');m.id='airPick';m.hidden=true;
      m.innerHTML='<div class="ap"><h3>Spawn</h3><button data-k="airliner">✈ Airliner (A320 class)</button><button data-k="fighter">🛩 Fighter jet</button><button data-k="yacht">🛥 Call the yacht to me</button><button data-k="goairport">📍 Go to Odesa Airport</button><button data-k="close" class="x">Close</button></div>';
      const st=document.createElement('style');st.textContent='#airPick{position:absolute;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}#airPick .ap{display:flex;flex-direction:column;gap:8px;min-width:260px;padding:16px;border-radius:16px;background:rgba(10,22,30,.92);border:1px solid rgba(255,255,255,.2);color:#fff;font:600 14px system-ui}#airPick h3{margin:0 0 4px;letter-spacing:.14em;color:#f2c14e;font:800 13px system-ui}#airPick button{padding:12px 14px;border-radius:11px;border:1.5px solid rgba(255,255,255,.25);background:rgba(40,60,80,.9);color:#fff;font:700 13px system-ui;text-align:left}#airPick button:active{background:#f2c14e;color:#111}#airPick .x{background:rgba(120,40,40,.8);text-align:center}';document.head.appendChild(st);(document.getElementById('hud')||document.body).appendChild(m);
      m.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.k;if(!k)return;m.hidden=true;if(k==='airliner'||k==='fighter')this.spawn(k);else if(k==='yacht')YACHT.summon();else if(k==='goairport'){const p=PLACES.find(q=>q.id==='airport');if(p)teleport(p)}})}
    m.hidden=!m.hidden},
  addButton(){const ab=document.getElementById('qMenu')||document.getElementById('actBtns');if(!ab||document.getElementById('bSpawn'))return;const b=document.createElement('button');b.id='bSpawn';b.innerHTML='<i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg></i><b>Spawn</b>';b.onclick=()=>this.menu();ab.appendChild(b)}
};
