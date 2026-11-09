/* ===================================================================================================
   lunapark.js — extras for the amusement parks (Uspenska 1 / Shevchenko park luna park and Gorky Park):
   the "Magic Circus" disc ride with a clown, an ice rink with skate rental and skaters, funfair stalls and string lights.
   The rides use the controller in rides.js (lpCtl / lpGate: ticket gate, operator, load/run/brake/unload).
   Loaded after rides.js; installLunapark() runs from the lazy install list in index.html.
   =================================================================================================== */

const LPX={skates:false,rinks:[],skaters:[]};

// ================= Magic Circus: a tilting, spinning disc with benches round the rim and a clown on the hub =================
function lpDisc(grp,x,z,yaw){
  const gy=groundH(x,z),wht='#f4f1ea',red='#c3262d',yel='#f2c21f',blu='#2a5fb0',skin='#f6dcc4';
  const base=[pkCyl(6.6,6.6,.5,28,0,.25,0,'#6e6c66'),pkCyl(6.2,6.2,.06,28,0,.53,0,'#b08a54'),pkCyl(1.3,1.8,3.2,16,0,2.1,0,blu),pkCyl(.9,1.3,.5,16,0,3.8,0,yel),pkTor(6.25,.05,0,1.6,0,'#c9c6bd',Math.PI/2)];
  for(let k=0;k<12;k++){const a=k/12*6.2832;base.push(pkCyl(.06,.06,1.1,6,Math.cos(a)*6.25,1.05,Math.sin(a)*6.25,'#c9c6bd'))}
  base.push(pkBox(3,.5,.9,0,.25,7.0,'#8c8a84'));
  const root=new THREE.Group();root.position.set(x,gy,z);root.rotation.y=yaw;root.userData.dyn=true;grp.add(root);root.add(pkMesh(base));
  const tilt=new THREE.Group();tilt.position.y=4.1;root.add(tilt);const spin=new THREE.Group();tilt.add(spin);
  const d=[],NW=12,NSEAT=8;
  for(let k=0;k<NW;k++)d.push({g:new THREE.CylinderGeometry(4.5,4.5,.4,1,1,false,k/NW*6.2832,6.2832/NW),m:pkM(0,0,0),c:sRGB(k%2?red:wht)});
  d.push(pkTor(4.5,.16,0,.2,0,yel,Math.PI/2),pkCyl(1.0,1.0,.5,16,0,.4,0,yel),pkCyl(.3,.3,.5,8,0,-.4,0,'#2a3036'));
  for(let k=0;k<NSEAT;k++){const a=k/NSEAT*6.2832,c=Math.cos(a),s=Math.sin(a),th=Math.PI/2-a;
    d.push(pkBox(1.5,.12,.75,c*3.5,.55,s*3.5,blu,0,th),pkBox(1.5,.6,.1,c*3.95,.9,s*3.95,blu,0,th),pkBox(.1,.5,.1,c*3.1,.85,s*3.1,'#c9c6bd',0,th),pkBox(1.2,.06,.06,c*3.1,1.1,s*3.1,'#d6a43a',0,th))}
  // the clown on the hub: white-painted face, red nose, orange hair, blue hat with a pompom, striped ruff
  d.push(pkCyl(1.3,.7,.9,12,0,.95,0,yel),pkTor(.95,.17,0,1.45,0,red,Math.PI/2),pkSph(.95,0,2.45,0,skin),pkSph(.2,0,2.35,.93,red),
    pkSph(.17,-.34,2.72,.8,wht),pkSph(.17,.34,2.72,.8,wht),pkSph(.08,-.34,2.72,.93,'#15151a'),pkSph(.08,.34,2.72,.93,'#15151a'),
    pkBox(.7,.1,.1,0,2.05,.9,red),pkBox(.3,.1,.1,-.36,2.12,.88,red,0,0,.5),pkBox(.3,.1,.1,.36,2.12,.88,red,0,0,-.5),
    pkBox(.5,.07,.08,-.34,3.0,.82,'#15151a',0,0,.25),pkBox(.5,.07,.08,.34,3.0,.82,'#15151a',0,0,-.25),
    pkSph(.38,-.95,2.55,0,'#e8741c'),pkSph(.38,.95,2.55,0,'#e8741c'),pkSph(.3,-.85,3.0,0,'#e8741c'),pkSph(.3,.85,3.0,0,'#e8741c'),
    pkCyl(.75,.03,1.3,12,0,3.65,0,blu),pkSph(.2,0,4.35,0,yel),pkTor(.75,.07,0,3.05,0,yel,Math.PI/2));
  const bl=[];for(let k=0;k<40;k++){const a=k/40*6.2832;bl.push({g:new THREE.SphereGeometry(.13,5,4),m:pkM(Math.cos(a)*4.62,.25,Math.sin(a)*4.62),c:sRGB(k%2?'#fff0b0':'#ffd27a')})}
  const glow=pkMesh(bl,true);spin.add(pkMesh(d),glow);
  const apply=()=>{spin.rotation.y=K.ph;tilt.rotation.x=Math.sin(K.ph*.45)*.34*K.sp;tilt.rotation.z=Math.cos(K.ph*.31)*.16*K.sp;root.updateMatrixWorld(true)};
  const wp=(k,r,y)=>{const a=k/NSEAT*6.2832;return spin.localToWorld(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r))};
  const gt=lpLoc(x,z,yaw,0,9),ob=lpLoc(x,z,yaw,3.2,7.6),bb=lpLoc(x,z,yaw,8.2,9.2);
  const K=lpCtl({name:'Magic Circus',price:45,x,z,wmax:1.5,acc:.28,dec:.35,slot:6.2832/NSEAT,run:46,demoT:36,idle:20,camYaw:yaw+Math.PI,camDist:16,camH:1.8,
    pick(){apply();let b=0,bd=1e9;for(let k=0;k<NSEAT;k++){const p=wp(k,3.5,.6);const dd=Math.hypot(p.x-K.gx,p.z-K.gz);if(dd<bd){bd=dd;b=k}}return b},
    seatPose(o){apply();const p=wp(K.seat,3.5,.6),q=wp(K.seat,2.5,.6);o.x=p.x;o.z=p.z;o.y=p.y-.46;o.yaw=Math.atan2(q.x-p.x,q.z-p.z);return o}});
  lpGate(grp,K,{gx:gt[0],gz:gt[1],gyaw:yaw+Math.PI,ox:ob[0],oz:ob[1],tx:x,tz:z,bx:bb[0],bz:bb[1],col:'#e8741c',vest:0xc3262d});
  ANIM.push(dt=>{K.tick(dt);if(!pkNear(x,z,420)&&!K.riding)return;apply();glow.visible=pkNightN()>.2});
  STATIC_CIR.push(x,z,6.7);PK_RIDES.push({disc:true,x,z});return K}

// ================= funfair stalls and string lights =================
function lpStallParts(p,x,z,yaw,col,kind){
  const c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>[x+u*c+v*s,z-u*s+v*c];const wht='#f4f1ea';
  const box=(w,h,d,u,y,v,hex,rx)=>{const a=at(u,v);p.push(pkBox(w,h,d,a[0],groundH(x,z)+y,a[1],hex,rx||0,yaw))};
  box(2.8,.12,1.8,0,.06,0,'#6e6c66');box(2.6,1.0,1.1,0,.62,-.2,col);box(2.7,.08,1.2,0,1.14,-.2,'#d9d4c4');
  box(.1,2.4,.1,-1.25,1.2,.62,wht);box(.1,2.4,.1,1.25,1.2,.62,wht);box(.1,2.4,.1,-1.25,1.2,-.85,wht);box(.1,2.4,.1,1.25,1.2,-.85,wht);
  box(2.9,.1,2.0,0,2.45,0,col);
  for(let k=0;k<7;k++)box(.4,.08,.7,-1.2+k*.4,2.3,.8,k%2?wht:col,.5);
  const goods={popcorn:['#fff1b8','#f6c552'],candy:['#f7a8c9','#8fd3f4'],ice:['#f4e9d0','#e87aa0'],toys:['#c3262d','#2a5fb0','#f2c21f'],tea:['#a4552a','#6b3f26'],balloon:['#c3262d','#2a5fb0','#f2c21f','#3aa84a']}[kind]||['#fff'];
  for(let k=0;k<6;k++){const a=at(-1+k*.4,.15);p.push(pkSph(kind==='balloon'?.26:.15,a[0],groundH(x,z)+(kind==='balloon'?2.7+(k%2)*.35:1.3),a[1],goods[k%goods.length]))}
  STATIC_CIR.push(x,z,1.5)}
function lpFair(grp,cx,cz,yaw,n,gap,kinds,seed){
  const p=[],c=Math.cos(yaw),s=Math.sin(yaw),R=mkRand(seed||5),cols=['#c3262d','#2a5fb0','#e8741c','#3aa84a','#9b3fa0','#e9a21c'],ops=[];
  for(let i=0;i<n;i++){const u=(i-(n-1)/2)*gap,x=cx+u*c,z=cz-u*s;lpStallParts(p,x,z,yaw,cols[i%cols.length],kinds[i%kinds.length])}
  const g=pkMesh(p);g.userData.dyn=true;grp.add(g);
  // string lights between poles along the row
  const bl=[],post=[];const L=(n-1)/2*gap+2;
  for(const sg of [-1,1]){const x=cx+sg*L*c+3.4*s*0,z=cz-sg*L*s;post.push(pkCyl(.12,.1,5.2,6,x,groundH(x,z),z,'#2a3036'))}
  for(let row=0;row<2;row++){const off=row?3.2:-1.9;const ax=cx-L*c+off*s,az=cz+L*s+off*c,bx=cx+L*c+off*s,bz=cz-L*s+off*c;
    for(let k=0;k<=24;k++){const t=k/24,x=ax+(bx-ax)*t,z=az+(bz-az)*t,sag=Math.sin(t*Math.PI)*.9;bl.push({g:new THREE.SphereGeometry(.11,5,4),m:pkM(x,groundH(x,z)+5-sag,z),c:sRGB(k%3?'#fff0b0':(k%2?'#ff9a6a':'#9ad7ff'))})}}
  const gl=pkMesh(bl,true);grp.add(gl);grp.add(pkMesh(post));ANIM.push(()=>{if(pkNear(cx,cz,300))gl.visible=pkNightN()>.2});
  return {glow:gl}}

// ================= ice rink: boards, a gate, skate rental, skaters going round, skating physics when skates are on =================
function lpRink(grp,x,z,W,D,seed){
  const R=mkRand(seed||9),hw=W/2,hd=D/2,wht='#f4f1ea',red='#c3262d';let lo=1e9,hi=-1e9;
  for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){const h=groundH(x-hw+W*i/4,z-hd+D*j/4);lo=Math.min(lo,h);hi=Math.max(hi,h)}
  const y=hi+.05;
  const cv=document.createElement('canvas');cv.width=1024;cv.height=Math.round(1024*D/W);const c=cv.getContext('2d');
  const g=c.createLinearGradient(0,0,1024,cv.height);g.addColorStop(0,'#9cc4da');g.addColorStop(.5,'#8fb9d2');g.addColorStop(1,'#a2cbe0');c.fillStyle=g;c.fillRect(0,0,1024,cv.height);
  c.lineWidth=2;for(let k=0;k<70;k++){c.strokeStyle='rgba(255,255,255,'+(.12+R()*.3)+')';c.beginPath();const cx=R()*1024,cy=R()*cv.height;c.moveTo(cx,cy);c.bezierCurveTo(cx+R()*260-130,cy+R()*160-80,cx+R()*260-130,cy+R()*160-80,cx+R()*400-200,cy+R()*200-100);c.stroke()}
  c.strokeStyle='rgba(195,38,45,.55)';c.lineWidth=7;c.beginPath();c.moveTo(512,0);c.lineTo(512,cv.height);c.stroke();c.strokeStyle='rgba(42,95,176,.5)';c.beginPath();c.arc(512,cv.height/2,cv.height*.16,0,6.2832);c.stroke();
  const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;
  const ice=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({map:tex,roughness:.3,metalness:0,envMapIntensity:.45}));ice.rotation.x=-Math.PI/2;ice.position.set(x,y,z);ice.receiveShadow=true;ice.userData.dyn=true;grp.add(ice);
  const b=[],gapW=4.4;
  const wall=(u0,v0,u1,v1)=>{const L=Math.hypot(u1-u0,v1-v0),mx=(u0+u1)/2,mz=(v0+v1)/2,horiz=Math.abs(v1-v0)<.01;
    b.push(pkBox(horiz?L:.16,1.1,horiz?.16:L,mx,y+.55,mz,wht),pkBox(horiz?L:.2,.3,horiz?.2:L,mx,y+.15,mz,red),pkBox(horiz?L:.22,.06,horiz?.22:L,mx,y+1.12,mz,'#8c8a84'));
    LOW_OBB.push(mx,mz,horiz?L/2:.15,horiz?.15:L/2,1,0)};
  wall(x-hw,z-hd,x+hw,z-hd);wall(x-hw,z+hd,x-gapW/2,z+hd);wall(x+gapW/2,z+hd,x+hw,z+hd);wall(x-hw,z-hd,x-hw,z+hd);wall(x+hw,z-hd,x+hw,z+hd);
  // flood-lights on poles + benches along the north side + a banner
  const bl=[];for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const px=x+sx*(hw+1.2),pz=z+sz*(hd+1.2);b.push(pkCyl(.14,.1,7,6,px,groundH(px,pz),pz,'#2a3036'),pkBox(1.1,.3,.5,px,groundH(px,pz)+7.1,pz,'#3a4048'));
    for(let k=0;k<4;k++)bl.push({g:new THREE.SphereGeometry(.16,5,4),m:pkM(px-.4+k*.27,groundH(px,pz)+6.9,pz),c:sRGB('#fff6d0')})}
  for(let k=0;k<4;k++){const bx=x-hw*.6+k*hw*.4,bz=z-hd-1.6;b.push(pkBox(1.8,.12,.5,bx,groundH(bx,bz)+.5,bz,'#8a5a32'),pkBox(1.8,.5,.1,bx,groundH(bx,bz)+.8,bz-.25,'#8a5a32'),pkBox(.1,.5,.1,bx-.8,groundH(bx,bz)+.25,bz,'#2a3036'),pkBox(.1,.5,.1,bx+.8,groundH(bx,bz)+.25,bz,'#2a3036'));STATIC_CIR.push(bx,bz,.9)}
  const rm=pkMesh(b);rm.userData.dyn=true;grp.add(rm);const glow=pkMesh(bl,true);grp.add(glow);
  const sg=plateMesh(['ICE RINK','skate hire ₴30'],{w:768,h:220,size:84,color:'#ffffff',bg:'#2a5fb0',weight:'900'},5.4,1.55,.9);sg.position.set(x,groundH(x,z+hd)+3.6,z+hd+.9);grp.add(sg);
  for(const sx of [-1,1]){const px=x+sx*2.8,pz=z+hd+.9;grp.add(Object.assign(pkMesh([pkCyl(.1,.1,3.4,6,px,groundH(px,pz),pz,'#2a3036')]),{}))}
  // rental booth beside the gate
  const bx=x+gapW/2+3.4,bz=z+hd+2.6;lpBooth(grp,bx,bz,lpFace(bx,bz,x,z+hd+3),'#2a5fb0','SKATE HIRE','₴30 · skates');
  const R0={x,z,hw,hd,y,glow,gate:[x,z+hd+2.4]};LPX.rinks.push(R0);
  INTERACT.push({x:bx-2.2,z:bz-1.6,r:3.4,get label(){return LPX.skates?'Return the skates':'Rent skates · ₴30'},cond:()=>!RIDE.on&&!DRIVE.on&&!PORTAL.cur&&!player.sit,
    fn:()=>{if(LPX.skates){LPX.skates=false;player.skate=false;toast('Skates returned','thanks!');return}if(!WALLET.pay(30,'skate hire'))return;LPX.skates=true;toast('Skates on','step onto the ice — glide, stop with S, speed up with Run')}});
  // skaters: real avatars gliding round the rink
  const pal=[0xc3262d,0x2a5fb0,0xe8741c,0x3aa84a,0x8a3fa0,0x20a0a8,0xe9a21c],sk=[];
  for(let i=0;i<(MOBILE?3:6);i++){const r=mkRand((seed||9)*41+i),pick=a=>a[Math.floor(r()*a.length)],H=pick(CH_HAIR),fem=r()<.5;
    const o={skin:pick(CH_SKIN.slice(0,6)),iris:pick(CH_EYE)[1],hs:fem?pick(['long','pony','bun']):pick(['short','swept']),hair:H[1],hair2:H[2],brow:H[3],ts:'tee',shirt:pick(pal),bs:fem&&r()<.5?'skirt':'jeans',jeans:0x23283a,cuff:0x2e3550,ss:'sneaker',shoe:0xeeeeee,sole:0xcfd4da,gl:'none',ht:r()<.4?'cap':'none',ac:pick(pal),bk:'none',nk:'none',cn:false,bd:'none'};
    const P=makePlayer(o);animPlayer(P,{spd:0,mode:'walk'},0);P.can.visible=false;P.scooter.visible=false;P.speaker.visible=false;P.root.traverse(m=>{if(m.isMesh)m.castShadow=false});mergeAvatar(P.root);P.root.userData.dyn=true;grp.add(P.root);
    sk.push({P,a:r()*6.28,w:(.16+r()*.14)*(i%2?1:-1),rx:hw*(.5+r()*.38),rz:hd*(.45+r()*.4),ph:r()*6,t:0})}
  LPX.skaters.push(...sk);
  ANIM.push(dt=>{if(!pkNear(x,z,260))return;glow.visible=pkNightN()>.2;
    for(const s of sk){s.t+=dt;s.a+=s.w*dt*(1+.25*Math.sin(s.t*.4+s.ph));const px=x+Math.cos(s.a)*s.rx,pz=z+Math.sin(s.a)*s.rz,tx=-Math.sin(s.a)*s.rx*Math.sign(s.w),tz=Math.cos(s.a)*s.rz*Math.sign(s.w);
      s.P.root.position.set(px,y,pz);s.P.root.rotation.y=Math.atan2(tx,tz);animPlayer(s.P,{spd:1.1,mode:'walk'},dt);s.P.scooter.visible=false}});
  return R0}

// skating: while skates are rented and you are on the ice the floor is slippery; leaving the ice returns the skates
function lpSkateTick(dt){
  if(!LPX.skates){player.skate=false;return}
  let on=null;for(const r of LPX.rinks){if(Math.abs(player.x-r.x)<r.hw+.4&&Math.abs(player.z-r.z)<r.hd+.4){on=r;break}}
  if(on&&!RIDE.on&&!DRIVE.on&&!PORTAL.cur){player.skate=true;LPX.off=0}
  else{player.skate=false;let near=false;for(const r of LPX.rinks)if(Math.hypot(player.x-r.x,player.z-r.z)<Math.max(r.hw,r.hd)+14)near=true;
    LPX.off=(LPX.off||0)+dt;if(!near||LPX.off>40){LPX.skates=false;toast('Skates returned','you walked away from the rink')}}}

// ================= install =================
function installLunapark(grp,G,P,Sg,GRX){
  const T=(n,f)=>{try{f()}catch(e){console.error('lunapark '+n+' failed',e)}};
  ANIM.push(dt=>lpSkateTick(dt));
  // Uspenska 1 luna park (OSM "Одеський лунапарк" in Shevchenko park): disc ride, rink and a fair street
  T('luna-disc',()=>{lpDisc(grp,1968,-9672,Math.PI);TREE_CLEAR.push(1968,-9672,16)});
  T('luna-rink',()=>{lpRink(grp,1946,-9638,34,20,3);TREE_CLEAR.push(1946,-9638,26)});
  T('luna-fair',()=>{lpFair(grp,1916,-9660,Math.PI/2*0,5,5.2,['popcorn','candy','balloon','ice','toys'],11);TREE_CLEAR.push(1916,-9660,16)});
  // Gorky Park: the rides zone gets a fair street, a Magic Circus and a rink on the lawn
  T('gorky-fair',()=>{lpFair(grp,-1130,-4690,Math.PI/2*0,4,5.2,['popcorn','balloon','tea','candy'],21);TREE_CLEAR.push(-1130,-4690,14)});
  T('gorky-disc',()=>{lpDisc(grp,-1070,-4785,0);TREE_CLEAR.push(-1070,-4785,16)});
  T('gorky-rink',()=>{lpRink(grp,-1160,-4755,32,18,4);TREE_CLEAR.push(-1160,-4755,24)});
}
