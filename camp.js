/* ===================================================================================================
   camp.js — the beach camp of Jungle Island, rebuilt (2026-11-15, a request of the owner's friend Andrew).
   It replaces ISLE.buildCamp() of isle.js (same place, same `ISLE.camp` group, same `ISLE.fireL` light, same 90 m rule):
   • two BIG wall tents you walk into (door 2 m wide, canvas walls are real walls, the camera goes first person inside), a groundsheet,
     two tiny camp beds in each: "Sleep until morning" works like the beds of the flats (KIT.sleep)
   • round the fire: three small camp chairs and ONE little bench for two (it is a normal bench of the game: the companion / a co-op friend
     takes the other half), log pile, crates, barrel, the signpost
   • over the fire a tripod grill with a grilled chicken: walk up, "Eat the chicken" — a drumstick goes to the mouth (the same hand rig and
     pose layer as drinking), the bird shrinks bite by bite, crunch + toast, +health; it is back on the grill after a while
   • the fire: two crossed flame sheets (a tiny shader), sparks and smoke (two Points clouds), crackling; all of it only within 90 m
   Cost: ~2,300 triangles, 12 static draw calls + 4 for the fire; no new light (the old campfire light stays the only one).
   The ground under the camp is flattened by islH() (ISL.campC), so floors, beds and seats sit on the sand everywhere.
   =================================================================================================== */
const CAMP={T:[],chairs:[],bites:0,BITES:5,backAt:0,fp:0,inTent:-1,eatT:0,ct:0,st:0,
  // local frame of the camp group: +x inland, +z along the beach; the fire is the middle of everything
  FIRE:[0,2],TENTS:[{x:-6.6,z:-7.2,k:'canvas'},{x:6.2,z:-7.6,k:'canvasR'}],W:2.6,L:3.2,WH:1.55,RH:3.05,
  build(I){const g=new THREE.Group(),bx=ISL.beach[0],bz=ISL.beach[1],C=ISL.campC||{x:bx+14,z:bz,h:Math.max(2.2,islH(bx+14,bz)||2.4)};I.camp=g;I.root.add(g);this.g=g;
    const ox=this.ox=C.x,oz=this.oz=C.z,gy=this.gy=SL+C.h;g.position.set(ox,gy,oz);
    const mb=new MB(),M=I.M,S=MBM.std;
    const mats={canvas:M.canvas,canvasR:M.canvasR,stone:M.stone,coal:M.coal,crate:M.crate,barrel:M.barrel,wood:M.wood,sign:M.sign,
      sheet:S(0x4a5a3c,.95,0,{side:THREE.DoubleSide}),cot:S(0x8a7a52,.9),blanket:S(0x9c3b2e,.95),blanket2:S(0x2f5d7a,.95),pillow:S(0xf0ead8,.9),iron:S(0x2a2a2c,.55,.6),chair:S(0x2f6b4a,.9),chair2:S(0xc9a13a,.9),
      meat:S(0xb5651d,.55),meatD:S(0x7a3d12,.6),bone:S(0xf2ead6,.7),lamp:M.lamp,rope:S(0xcdbf9a,.9)};
    for(let i=0;i<this.TENTS.length;i++)this.tent(mb,this.TENTS[i],i);
    this.fireplace(mb);this.seats(mb);
    // crates, barrel, log pile, signpost (as before, moved out of the way of the seats)
    for(const [x,z,s] of [[-4.2,7.2,1],[-5.3,7.5,.8],[-4.7,7.9,.7]])mb.bx('crate',x-.45*s,x+.45*s,0,.9*s,z-.45*s,z+.45*s,1);mb.cyl('barrel',.35,.35,.95,10,4.6,.48,6.4);
    for(let k=0;k<6;k++)mb.cyl('wood',.11,.11,1.1,6,3.1+(k%3)*.24,.12+((k/3)|0)*.21,6.6,0,0,Math.PI/2);
    mb.rod('wood',.07,[9.5,0,1.5],[9.5,2.2,1.5],6);mb.bx('sign',8.7,10.3,1.6,2.2,1.45,1.55);
    const nm=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.6),new THREE.MeshBasicMaterial({map:MBM.tex(256,96,(x,w,h)=>{x.fillStyle='#e9d9b0';x.fillRect(0,0,w,h);x.fillStyle='#5a2a14';x.font='700 26px "Unbounded",Arial';x.textAlign='center';x.fillText('JUNGLE',w/2,36);x.fillText('ISLAND',w/2,72)}),toneMapped:false}));nm.position.set(9.5,1.9,1.4);nm.rotation.y=Math.PI;g.add(nm);
    const nm2=nm.clone();nm2.rotation.y=0;nm2.position.z=1.6;g.add(nm2);
    mb.build(g,mats);
    this.chicken(g,mats);this.fx(g);
    // the old campfire light (isle.js flickers it and switches it off beyond 90 m)
    const l=new THREE.PointLight(0xff9a40,0,24,2);l.position.set(this.FIRE[0],1.4,this.FIRE[1]);g.add(l);I.fireL=l;
    // solids (world, axis-aligned): crates, barrel, logs, the fire ring itself is low enough to step over? no: keep people out of the embers
    const so=(lx,lz,hw,hd,top)=>ISL.solids.push({x:ox+lx,z:oz+lz,hw,hd,top});so(-4.7,7.5,1.0,.6,1.1);so(4.6,6.4,.4,.4,1.2);so(3.3,6.6,.6,.6,.6);so(this.FIRE[0],this.FIRE[1],.55,.55,2.2);
    this.interact();
    PLACES.push({id:'camp',name:'Beach camp',sub:'Jungle Island · big tents, beds, campfire, grilled chicken',x:ox-3.2,z:oz+8.6,yaw:Math.atan2(3.2,-6.6)});try{MAP_SEA.add('camp')}catch(e){}
    ANIM.push(dt=>this.update(dt))},
  // ---------- a wall tent: door at +z, real walls, two beds ----------
  tent(mb,T,i){const W=this.W,L=this.L,WH=this.WH,RH=this.RH,k=T.k,x=T.x,z=T.z,P=(u,y,v)=>[x+u,y,z+v],D=1.0,DH=2.15,yD=WH+(RH-WH)*(1-D/W);
    for(const s of [-1,1]){mb.quad(k,P(s*W,0,-L),P(s*W,0,L),P(s*W,WH,L),P(s*W,WH,-L));                                             // side wall
      mb.quad(k,P(s*(W+.28),WH-.16,-L-.2),P(s*(W+.28),WH-.16,L+.2),P(0,RH,L+.2),P(0,RH,-L-.2));                                 // roof slope with eaves
      mb.quad(k,P(s*W,0,L),P(s*D,0,L),P(s*D,yD,L),P(s*W,WH,L));                                                                 // front, beside the door
      mb.quad(k,P(s*D,DH,L+.01),P(s*D,.02,L+.01),P(s*(D+.55),.02,L+.5),P(s*(D+.32),1.25,L+.3));                                  // door flap tied back
      mb.rod('wood',.045,P(s*D,0,L),P(s*D,yD,L),5);                                                                             // door post
      mb.rod('rope',.012,P(s*(W+.28),WH-.16,L),P(s*(W+1.5),0,L+.9),3);mb.rod('rope',.012,P(s*(W+.28),WH-.16,-L),P(s*(W+1.5),0,-L-.9),3);
      mb.cyl('wood',.03,.02,.3,4,x+s*(W+1.5),.12,z+L+.9);mb.cyl('wood',.03,.02,.3,4,x+s*(W+1.5),.12,z-L-.9)}
    mb.quad(k,P(-W,0,-L),P(W,0,-L),P(W,WH,-L),P(-W,WH,-L));mb.quad(k,P(-W,WH,-L),P(W,WH,-L),P(0,RH,-L),P(0,RH,-L));                  // back gable
    mb.quad(k,P(-D,DH,L),P(D,DH,L),P(D,yD,L),P(-D,yD,L));mb.quad(k,P(-D,yD,L),P(D,yD,L),P(0,RH,L),P(0,RH,L));                        // above the door
    mb.rod('wood',.04,P(0,RH-.03,-L-.2),P(0,RH-.03,L+.2),5);mb.rod('wood',.045,P(0,0,-L+.04),P(0,RH,-L+.04),5);
    mb.bx('sheet',x-W+.04,x+W-.04,0,.035,z-L+.04,z+L-.04,3);mb.bx(i?'blanket2':'blanket',x-.75,x+.75,.035,.05,z-.6,z+2.3,2);            // groundsheet + a runner rug
    // two tiny camp beds along the walls, a crate with a lantern between their heads
    for(const s of [-1,1]){const bx=x+s*1.6,b0=z-2.75,b1=z-.85;
      for(const [lx,lz] of [[-.36,b0+.08],[.36,b0+.08],[-.36,b1-.08],[.36,b1-.08]])mb.cyl('wood',.03,.03,.32,5,bx+lx,.16,lz);
      mb.bx('cot',bx-.4,bx+.4,.3,.38,b0,b1,2);mb.bx(s<0?'blanket':'blanket2',bx-.41,bx+.41,.38,.44,b0+.55,b1,2);mb.bx('pillow',bx-.28,bx+.28,.38,.5,b0+.06,b0+.46,1);
      ISL.solids.push({x:this.ox+bx,z:this.oz+(b0+b1)/2,hw:.4,hd:.95,top:.6})}
    mb.bx('crate',x-.28,x+.28,0,.5,z-2.95,z-2.4,1);mb.cyl('iron',.07,.09,.05,8,x,.53,z-2.68);mb.cyl('lamp',.06,.06,.16,8,x,.64,z-2.68);mb.cyl('iron',.08,.02,.07,8,x,.75,z-2.68);
    // canvas walls are walls: two sides, the back, the two strips beside the door
    const so=(lx,lz,hw,hd)=>ISL.solids.push({x:this.ox+lx,z:this.oz+lz,hw,hd,top:3.2});so(x-W,z,.1,L);so(x+W,z,.1,L);so(x,z-L,W,.1);so(x-(W+D)/2,z+L,(W-D)/2,.1);so(x+(W+D)/2,z+L,(W-D)/2,.1);so(x,z-2.68,.3,.3);
    this.T.push({x:this.ox+x,z:this.oz+z,W,L,beds:[[this.ox+x-1.6,this.oz+z-1.8],[this.ox+x+1.6,this.oz+z-1.8]]})},
  // ---------- the fire place: stones, embers, logs, a tripod with a grate ----------
  fireplace(mb){const [fx,fz]=this.FIRE;for(let k=0;k<10;k++){const a=k/10*6.283;mb.sph('stone',.24,fx+Math.cos(a)*.95,.16,fz+Math.sin(a)*.95,1,.75,1,5)}
    mb.cyl('coal',.78,.78,.1,10,fx,.06,fz);for(let k=0;k<4;k++){const a=k*1.571+.5;mb.rod('wood',.07,[fx+Math.cos(a)*.62,.1,fz+Math.sin(a)*.62],[fx-Math.cos(a)*.12,.42,fz-Math.sin(a)*.12],6)}
    for(let k=0;k<3;k++){const a=k/3*6.283+.5;mb.rod('iron',.025,[fx+Math.cos(a)*1.15,0,fz+Math.sin(a)*1.15],[fx,2.2,fz],4)}                                  // tripod
    mb.rod('iron',.012,[fx,2.2,fz],[fx,1.02,fz],3);mb.cyl('iron',.5,.5,.03,12,fx,.98,fz);for(let k=-2;k<=2;k++)mb.bx('iron',fx-.46,fx+.46,.995,1.01,fz+k*.17-.012,fz+k*.17+.012);
    for(let k=0;k<3;k++){const a=k/3*6.283;mb.rod('iron',.01,[fx+Math.cos(a)*.48,.98,fz+Math.sin(a)*.48],[fx,1.5,fz],3)}},
  // ---------- seats: one bench for two (a real bench of the game), three camp chairs ----------
  seats(mb){const [fx,fz]=this.FIRE,gy=this.gy,ox=this.ox,oz=this.oz;
    {const bx=fx,bz=fz+3.0;   // the bench for two: log legs, plank seat and back, facing the fire (-z)
      for(const s of [-1,1]){mb.cyl('wood',.13,.13,.42,7,bx+s*.52,.21,bz+.02);mb.rod('wood',.035,[bx+s*.6,.4,bz+.2],[bx+s*.6,.95,bz+.32],5)}
      mb.bx('wood',bx-.72,bx+.72,.42,.48,bz-.2,bz+.22,2);mb.bx('wood',bx-.72,bx+.72,.66,.94,bz+.25,bz+.31,2);
      this.bench={x:ox+bx,y:gy,z:oz+bz,ry:Math.PI};HOME_BENCHES.push(this.bench);ISL.solids.push({x:ox+bx,z:oz+bz+.05,hw:.72,hd:.26,top:1})}
    const chair=(cx,cz,col)=>{const yaw=Math.atan2(fx-cx,fz-cz),c=Math.cos(yaw),s=Math.sin(yaw),P=(u,y,v)=>[cx+u*c+v*s,y,cz-u*s+v*c];   // u across, v forward (to the fire)
      for(const su of [-1,1]){mb.rod('iron',.014,P(su*.22,0,.2),P(su*.22,.42,-.2),4);mb.rod('iron',.014,P(su*.22,0,-.2),P(su*.22,.42,.2),4);mb.rod('iron',.014,P(su*.22,.36,-.2),P(su*.22,.86,-.3),4)}
      mb.quad(col,P(-.22,.4,-.2),P(.22,.4,-.2),P(.22,.38,.2),P(-.22,.38,.2));mb.quad(col,P(-.22,.5,-.22),P(.22,.5,-.22),P(.22,.86,-.3),P(-.22,.86,-.3));
      this.chairs.push({x:ox+cx,z:oz+cz,y:gy,yaw});ISL.solids.push({x:ox+cx,z:oz+cz,hw:.22,hd:.22,top:.9})};
    chair(fx-2.7,fz+.3,'chair');chair(fx+2.7,fz+.3,'chair2');chair(fx+1.9,fz-2.0,'chair')},
  // ---------- the grilled chicken (its own little group: it shrinks and comes back) ----------
  chicken(g,m){const mb=new MB(),[fx,fz]=this.FIRE;
    mb.sph('meat',.2,0,0,0,1.25,.82,.95,10);mb.sph('meat',.11,.22,.06,0,1,.9,.9,8);                                           // body + neck end
    for(const s of [-1,1]){mb.sph('meat',.09,-.12,.02,s*.17,1.5,.9,.9,8);mb.rod('bone',.02,[-.24,.03,s*.19],[-.36,.09,s*.22],5);mb.sph('bone',.03,-.37,.1,s*.22,1,1,1,6);   // drumsticks
      mb.sph('meatD',.06,.1,.08,s*.17,1.6,.6,.7,6)}                                                                             // wings
    for(const u of [-.1,.02,.14])mb.bx('meatD',u-.012,u+.012,.155,.165,-.13,.13);                                                // grill marks
    const c=new THREE.Group();mb.build(c,m);c.position.set(fx,1.16,fz);c.rotation.y=.4;g.add(c);this.bird=c;this.bites=this.BITES;
    // the drumstick that goes to the mouth (parented to the forearm while eating)
    const lb=new MB();lb.sph('meat',.055,0,.075,0,1,1.5,1,8);lb.rod('bone',.014,[0,.01,0],[0,-.09,0],5);lb.sph('bone',.022,0,-.1,0,1,1,1,6);const leg=new THREE.Group();lb.build(leg,m);this.leg=leg},
  // ---------- flames, sparks, smoke ----------
  fx(g){const [fx,fz]=this.FIRE;
    const fm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{t:{value:0}},
      vertexShader:'varying vec2 u;void main(){u=uv;vec3 p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
      fragmentShader:'varying vec2 u;uniform float t;float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float f(vec2 p){vec2 i=floor(p),q=fract(p);q=q*q*(3.-2.*q);return mix(mix(n(i),n(i+vec2(1,0)),q.x),mix(n(i+vec2(0,1)),n(i+vec2(1,1)),q.x),q.y);}'+
        'void main(){vec2 p=u;float w=f(vec2(p.x*3.+t*.7,p.y*2.6-t*2.3))*.55+f(vec2(p.x*7.-t,p.y*5.-t*3.6))*.3;float x=abs(p.x-.5+(w-.4)*.22*p.y)*2.;float sh=1.-smoothstep(.0,1.-p.y*.92,x);float a=sh*smoothstep(1.,.25,p.y+w*.35)*smoothstep(0.,.12,p.y);'+
        'vec3 c=mix(vec3(1.,.28,.03),vec3(1.,.82,.3),clamp(a*1.5-p.y*.6,0.,1.));gl_FragColor=vec4(c*a*1.6,a);}'});
    const fl=new THREE.Group();for(let k=0;k<2;k++){const q=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.7),fm);q.position.y=.9;q.rotation.y=k*Math.PI/2+.4;fl.add(q)}fl.position.set(fx,.02,fz);g.add(fl);this.flame=fm;
    const dot=(r,soft)=>MBM.tex(32,32,(x,w)=>{const gr=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);gr.addColorStop(0,'rgba(255,255,255,'+r+')');gr.addColorStop(soft,'rgba(255,255,255,'+r*.35+')');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,w)});
    const cloud=(n,size,mat)=>{const geo=new THREE.BufferGeometry(),p=new Float32Array(n*3);geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,3,0),7);const o=new THREE.Points(geo,new THREE.PointsMaterial(Object.assign({size,sizeAttenuation:true,transparent:true,depthWrite:false},mat)));o.position.set(fx,0,fz);g.add(o);
      const s=[];for(let i=0;i<n;i++)s.push({t:i/n,x:0,z:0,v:1});return {o,p,s,n}};
    this.spark=cloud(14,.07,{map:dot(1,.3),color:0xffb040,blending:THREE.AdditiveBlending,fog:false});this.smoke=cloud(9,1.5,{map:dot(.5,.5),color:0x6a6660,opacity:.5})},
  // ---------- prompts ----------
  near(){return typeof ISLE!=='undefined'&&ISLE.on&&!PORTAL.cur&&Math.hypot(player.x-this.ox,player.z-this.oz)<40},
  interact(){const ox=this.ox,oz=this.oz,[fx,fz]=this.FIRE,free=()=>this.near()&&!player.sit&&!this.eatT&&!(typeof KIT!=='undefined'&&KIT.sleeping);
    // the bench has its own prompt at its own place (the game's general bench prompt has no position, so the nearer chicken prompt would always win); same halves as every bench: the companion / a friend takes the other one
    {const b=this.bench,lat=[Math.cos(b.ry),-Math.sin(b.ry)],taken=sd=>{const sx=b.x+lat[0]*sd*.42,sz=b.z+lat[1]*sd*.42;if(typeof COOP!=='undefined')for(const R of COOP.peers.values())if(R.has&&R.st&&R.st.m==='sit'&&Math.hypot(R.x-sx,R.z-sz)<.6)return true;return !!(typeof BUDDY!=='undefined'&&BUDDY.sitsAt&&BUDDY.sitsAt(sx,sz))};
      INTERACT.push({x:b.x,z:b.z,r:1.5,label:'Sit on the bench for two',cond:free,fn:()=>{let side=((player.x-b.x)*lat[0]+(player.z-b.z)*lat[1])>=0?1:-1;if(taken(side))side=-side;const sd=side*.42;
        player.sit={x:b.x+lat[0]*sd+Math.sin(b.ry)*.04,z:b.z+lat[1]*sd+Math.cos(b.ry)*.04,y:b.y+.03,yaw:b.ry,bench:b};player.vx=player.vz=0;cam.yaw=b.ry;toast('By the fire',taken(-side)?'a friend sits next to you · move to stand up':'room for a friend next to you · move to stand up')}})}
    INTERACT.push({x:ox+fx,z:oz+fz,r:1.9,label:'Eat the chicken',cond:()=>free()&&this.bites>0&&!(PLR&&PLR.drk),fn:()=>this.eat()});
    this.chairs.forEach(c=>INTERACT.push({x:c.x,z:c.z,r:1.05,label:'Sit on the camp chair',cond:free,fn:()=>{player.sit={x:c.x,z:c.z,y:c.y+.02,yaw:c.yaw};player.vx=player.vz=0;cam.yaw=c.yaw;toast('By the fire','move to stand up')}}));
    for(const T of this.T)for(const b of T.beds)INTERACT.push({x:b[0],z:b[1],r:1.25,label:'Sleep in the tent until morning',cond:()=>free()&&typeof KIT!=='undefined',fn:()=>{player.vx=player.vz=0;KIT.sleep();if(typeof FAUNA!=='undefined'&&FAUNA.hp<100){FAUNA.hp=100;FAUNA.hpT=6}}})},
  // one bite: the drumstick in the hand goes to the mouth (pose.js: the drinking rig), the bird on the grill gets smaller
  eat(){if(this.bites<=0||this.eatT)return;const P=PLR;this.bites--;this.eatT=1.7;
    const leg=this.leg;leg.position.set(0,-.2,.03);leg.rotation.set(0,0,0);leg.scale.setScalar(1.15);P.arms[0].el.add(leg);leg.visible=true;POSE.startDrink(P,1.6,leg);
    player.vx=player.vz=0;player.yaw=Math.atan2(this.ox+this.FIRE[0]-player.x,this.oz+this.FIRE[1]-player.z);
    setTimeout(()=>this.crunch(),620);setTimeout(()=>this.crunch(),1010);
    const k=this.bites/this.BITES;this.bird.userData.k=k;if(this.bites<=0)this.backAt=performance.now()+this.BACK*1000;
    if(typeof FAUNA!=='undefined'&&FAUNA.hp<100){FAUNA.hp=Math.min(100,FAUNA.hp+20);FAUNA.hpT=6}
    toast('Grilled chicken',this.bites>0?'delicious · '+this.bites+(this.bites===1?' bite':' bites')+' left':'all gone · a new one will be on the grill in a while')},
  BACK:75,
  crunch(){try{if(typeof AUD!=='undefined'&&AUD.ok){AUD.burst(2600,700,.07,.22,'bandpass',1.4);AUD.burst(900,260,.09,.16,'lowpass',.8)}}catch(e){}},
  crackle(vol){try{if(typeof AUD!=='undefined'&&AUD.ok)AUD.burst(1800+Math.random()*2600,500+Math.random()*500,.03+Math.random()*.05,vol*(.25+Math.random()*.5),'bandpass',2.2)}catch(e){}},
  // ---------- every frame (only near) ----------
  update(dt){if(typeof ISLE==='undefined'||!ISLE.on||!this.g)return;const d=Math.hypot(player.x-this.ox,player.z-this.oz);
    if(this.eatT>0){this.eatT=Math.max(0,this.eatT-dt);if(!this.eatT&&this.leg.parent)this.leg.parent.remove(this.leg)}
    if(this.backAt&&performance.now()>this.backAt){this.backAt=0;this.bites=this.BITES;this.bird.userData.k=1;if(d<60)toast('The chicken is ready','a fresh one is on the grill')}
    const live=d<90;this.spark.o.visible=this.smoke.o.visible=live;if(!live){if(this.inTent>=0)this.leaveTent();return}
    // the bird eases to its size (1 = whole, a little heap of bones at 0)
    {const b=this.bird,k=b.userData.k===undefined?1:b.userData.k,s=b.scale.x+((.28+.72*k)-b.scale.x)*Math.min(1,dt*6);b.scale.setScalar(s);b.visible=this.bites>0||s>.3;b.rotation.y+=dt*.25}
    this.flame.uniforms.t.value+=dt;
    // sparks rise fast and die, smoke rises slowly and spreads
    for(const [C,up,life,spread] of [[this.spark,2.6,1.1,.5],[this.smoke,1.25,3.4,1.1]]){const p=C.p;for(let i=0;i<C.n;i++){const s=C.s[i];s.t+=dt/life;if(s.t>=1){s.t=0;s.x=(Math.random()-.5)*.5;s.z=(Math.random()-.5)*.5;s.v=.7+Math.random()*.6}
        const y=s.t*life*up*s.v;p[i*3]=s.x+Math.sin(s.t*5+i)*spread*s.t;p[i*3+1]=(C===this.smoke?1.5:.5)+y;p[i*3+2]=s.z+Math.cos(s.t*4+i*2)*spread*s.t}C.o.geometry.attributes.position.needsUpdate=true}
    this.smoke.o.material.opacity=.42;
    // crackling, louder when close
    if(d<26){this.ct-=dt;if(this.ct<=0){this.ct=.08+Math.random()*.42;this.crackle(Math.max(0,1-d/26)*.5)}}
    // inside a tent: first person (the canvas would hide a chase camera), back to the old distance outside
    let it=-1;for(let i=0;i<this.T.length;i++){const T=this.T[i];if(Math.abs(player.x-T.x)<T.W-.05&&Math.abs(player.z-T.z)<T.L+.15)it=i}
    if(it!==this.inTent){if(it>=0&&this.inTent<0){if(cam.dist>.75){this.fp=cam.dist;cam.dist=.5;cam.init=false}}else if(it<0)this.leaveTent();this.inTent=it}},
  leaveTent(){if(this.fp){if(cam.dist<=.75){cam.dist=this.fp;cam.init=false}this.fp=0}this.inTent=-1}
};
if(typeof ISLE!=='undefined')ISLE.buildCamp=function(){CAMP.build(this)};
window.CAMP=CAMP;
