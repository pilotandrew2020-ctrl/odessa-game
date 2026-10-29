/* ===================================================================================================
   gorky.js — Gorky Park (Mark Twain Park, Cheryomushky), a big green park with a lake:
   colonnade main entrance with the painted sign wall, glass pavilion and tiered fountain, the lake with fountain jets, mist,
   a promenade, pier and balloons, a green flower clock that shows the real time, mini golf, playgrounds with a sunken ship and
   an octopus, a thuja garden with white gravel and globe lamps, a wave-roof pergola, monument, and an attractions zone.
   Loaded BEFORE the main script (after parks.js / rides.js / shev.js); touches game globals only inside installGorky().
   =================================================================================================== */

const GK={lake:null};
function gkLakeD(x,z){const L=GK.lake,dx=x-L.x,dz=z-L.z,c=Math.cos(L.rot),s=Math.sin(L.rot);const u=(dx*c+dz*s)/L.a,v=(-dx*s+dz*c)/L.b,th=Math.atan2(v,u);
  return Math.hypot(u,v)/(1+.1*Math.sin(3*th+1)+.07*Math.sin(5*th+2)+.04*Math.sin(9*th))}
function gkLakePt(th,k){const L=GK.lake,r=1+.1*Math.sin(3*th+1)+.07*Math.sin(5*th+2)+.04*Math.sin(9*th);const u=Math.cos(th)*L.a*r*k,v=Math.sin(th)*L.b*r*k,c=Math.cos(L.rot),s=Math.sin(L.rot);return [L.x+u*c-v*s,L.z+u*s+v*c]}

function gkLake(grp,P,GR,rnd){
  const L=GK.lake;const WL=groundH(L.x,L.z)-.1;L.wl=WL;const Hb=WL+.32;
  FLAT.push({fn:(x,z,h)=>{const d=gkLakeD(x,z);if(d>1.6)return h;
    if(d<1)return WL+.1-(.35+2.2*pkSmooth(1,.45,d));
    if(d<1.06){const t=pkSmooth(1,1.06,d);return (WL-.25)*(1-t)+Hb*t}
    return Hb+(h-Hb)*pkSmooth(1.06,1.6,d)},x:L.x,z:L.z,R:Math.max(L.a,L.b)*1.75});
  const poly=[];for(let i=0;i<56;i++)poly.push(gkLakePt(i/56*6.2832,1.045));
  pkWaterMesh(grp,poly,WL);
  // dark lake bed colour under the water is the terrain itself; a stone coping would be too tidy — reeds and boulders instead
  for(let i=0;i<46;i++){const th=rnd()*6.2832,q=gkLakePt(th,1.1+rnd()*.08);const y=groundH(q[0],q[1]);if(rnd()<.5)P.box(q[0],y+.15,q[1],.5+rnd()*.9,.3+rnd()*.35,.5+rnd()*.8,rnd()*3,sRGB('#7d7a72'),7);
    else for(let k=0;k<5;k++)P.box(q[0]+rnd()*.5,y+.5,q[1]+rnd()*.5,.04,1.0+rnd()*.5,.04,0,sRGB('#6c7f3d'),0,(rnd()-.5)*.3)}
  // no trees in the water
  for(let i=0;i<64;i++){const q=gkLakePt(i/64*6.2832,1.12);TREE_CLEAR.push(q[0],q[1],11)}
  for(let a=-1;a<=1;a+=.5)for(let b=-1;b<=1;b+=.5){const c=Math.cos(L.rot),s=Math.sin(L.rot);const u=a*L.a*.85,v=b*L.b*.85;const x=L.x+u*c-v*s,z=L.z+u*s+v*c;if(gkLakeD(x,z)<1)TREE_CLEAR.push(x,z,18)}
  // fountain jets: a big group in the middle and four satellites
  pkFountainJets(grp,L.x,WL,L.z,12,{n:26,n2:12,h:5.5,mid:13});
  for(const [du,dv] of [[-.55,.0],[.55,.05],[0,-.55],[0,.55]]){const c=Math.cos(L.rot),s=Math.sin(L.rot);const x=L.x+(du*L.a*c-dv*L.b*s)*1.0,z=L.z+(du*L.a*s+dv*L.b*c)*1.0;if(gkLakeD(x,z)<.85)pkFountainJets(grp,x,WL,z,5,{n:12,n2:0,h:3.2,mid:6.5})}
  pkMist(grp,L.x,L.z,L.a*1.4,L.b*1.5,WL,5,.05,11);
  // promenade ring with benches and globe lamps
  const ring=[];for(let i=0;i<=72;i++){const th=i/72*6.2832;ring.push(...gkLakePt(th,1.2).map(Math.round))}
  return {kind:0,wide:1,pts:ring}}

// ---------- entrance: white colonnade and the painted sign wall ----------
function gkEntrance(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,30,14,gy);const wh=sRGB('#efece4'),gl=sRGB('#c8c2b2');
  pkRect(GR,x,z+18,60,40,0,8,.02,0);pkRect(GR,x,z+18,60.4,40.4,0,3,.0,0);pkRect(GR,x,z+18,58,38,0,8,.03,0);
  // two colonnade wings with a flat roof and a taller central portal
  for(const sd of [-1,1]){for(let k=0;k<8;k++){const px=x+sd*(7+k*3.4);P.box(px,gy+3.6,z,.95,7.2,.95,0,wh,0);P.box(px,gy+.25,z,1.25,.5,1.25,0,gl,7);P.box(px,gy+7.3,z,1.25,.3,1.25,0,gl,7);STATIC_CIR.push(px,z,.6)}
    P.box(x+sd*(7+3.4*3.5),gy+7.9,z,28.6,.9,1.3,0,wh,0);P.box(x+sd*(7+3.4*3.5),gy+8.5,z,29.4,.3,1.7,0,gl,7);
    P.box(x+sd*(7+3.4*3.5),gy+8.9,z-.4,28.6,.5,.2,0,sRGB('#d9d4c4'),0);
    for(let k=0;k<7;k++){const px=x+sd*(8.7+k*3.4);P.box(px,gy+.45,z+.9,3.2,.9,.5,0,gl,7)}}
  for(const sd of [-1,1]){P.box(x+sd*5,gy+5.2,z,1.6,10.4,1.6,0,wh,0);P.box(x+sd*5,gy+10.6,z,2.1,.4,2.1,0,gl,7);STATIC_CIR.push(x+sd*5,z,1)}
  P.box(x,gy+10.7,z,12.4,1.8,1.9,0,wh,0);P.box(x,gy+11.8,z,13.2,.4,2.3,0,gl,7);
  const sg=plateMesh(['ПАРК  ИМ. М. ГОРЬКОГО'],{w:1024,h:128,size:78,color:'#2f6a3a',bg:'#efece4',weight:'800'},11.2,1.3);sg.position.set(x,gy+10.7,z+.97);grp.add(sg);
  // lamps and flower beds on the entrance plaza
  for(const sd of [-1,1])for(const dz of [8,20,32]){pkLamp(P,x+sd*18,groundH(x+sd*18,z+dz),z+dz,3,sd+dz);}
  for(const sd of [-1,1])for(const [dx,dz] of [[10,12],[18,26],[10,28]]){flowerBed(GR,P,x+sd*dx,z+dz,9,3.4,0,sd>0?[sRGB('#d12c2c'),sRGB('#f4f0e8'),sRGB('#e8b42a')]:[sRGB('#8a3ac0'),sRGB('#f4f0e8'),sRGB('#e23a3a')])}
  // painted sign walls either side of the street: white with green leaves and the park name
  for(const sd of [-1,1]){const cv=document.createElement('canvas');cv.width=1024;cv.height=256;const c=cv.getContext('2d');c.fillStyle='#f2efe6';c.fillRect(0,0,1024,256);
    const r=mkRand(sd>0?5:6);for(let i=0;i<90;i++){const px=r()*1024,py=r()*256,a=r()*6.28,l=30+r()*50;c.fillStyle='rgba('+(40+r()*40|0)+','+(110+r()*70|0)+','+(50+r()*40|0)+',.9)';c.save();c.translate(px,py);c.rotate(a);c.beginPath();c.ellipse(0,0,l,l*.38,0,0,6.28);c.fill();c.restore()}
    c.fillStyle='rgba(242,239,230,.88)';c.fillRect(110,80,804,100);c.fillStyle='#2f6a3a';c.font='800 62px "Golos Text",Arial,sans-serif';c.textAlign='center';c.fillText('ПАРК ИМ. М. ГОРЬКОГО',512,152);
    const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;const m=new THREE.Mesh(new THREE.BoxGeometry(20,4.2,.6),[0,1,2,3,4,5].map(i=>new THREE.MeshStandardMaterial(i===4?{map:t,roughness:.8}:{color:0xe8e4d8,roughness:.9})));
    const wx=x+sd*52,wz=z+5;m.position.set(wx,groundH(wx,wz)+2.1,wz);m.rotation.y=-sd*.35;m.castShadow=true;grp.add(m);STATIC_OBB.push(wx,wz,10,.4,Math.cos(-sd*.35),-Math.sin(-sd*.35))}
  TREE_CLEAR.push(x,z+14,34);
  PLACES.push({id:'gorky',name:'Gorky Park',sub:'main entrance',x,z:z+34,yaw:Math.PI})}

// ---------- tiered stone fountain, glass pavilion, spruces and beds ----------
function gkTierFountain(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,18,10,gy);const st=sRGB('#d3cfc2'),dk=sRGB('#9a978c');
  pkDisc(GR,x,z,0,17,8,.02,28,0);pkDisc(GR,x,z,12,12.6,3,.04,28,0);
  const ring=(r,y,h,n)=>{for(let i=0;i<n;i++){const a=i/n*6.2832;P.box(x+Math.cos(a)*r,gy+y+h/2,z+Math.sin(a)*r,r*6.2832/n+.1,h,.7,-a-Math.PI/2,st,7)}};
  ring(8,0,.7,28);P.cyl(x,gy,z,7.7,7.7,.08,24,sRGB('#5e8c8c'),0);pkWaterDisc(grp,x,z,7.8,gy+.55);
  P.cyl(x,gy,z,1.9,1.5,1.7,16,dk,7);ring(4.2,1.7,.5,16);P.cyl(x,gy+1.7,z,4.0,4.0,.06,18,sRGB('#5e8c8c'),0);pkWaterDisc(grp,x,z,4.1,gy+2.05);
  P.cyl(x,gy+1.7,z,.9,.7,1.5,12,dk,7);ring(2.1,3.2,.45,12);pkWaterDisc(grp,x,z,2.2,gy+3.5);P.cyl(x,gy+3.2,z,.35,.25,1.4,10,dk,7);
  pkFountainJets(grp,x,gy+3.5,z,3.4,{n:10,n2:0,h:1.6,mid:3.2});pkFountainJets(grp,x,gy+.55,z,7.2,{n:16,n2:0,h:1.8,mid:false});
  STATIC_CIR.push(x,z,8.4);
  for(let k=0;k<8;k++){const a=k/8*6.2832+.2,px=x+Math.cos(a)*14.5,pz=z+Math.sin(a)*14.5;if(k%2)pkBench(P,px,groundH(px,pz),pz,Math.atan2(x-px,z-pz));else pkLamp(P,px,groundH(px,pz),pz,3,a)}
  for(let k=0;k<6;k++){const a=k/6*6.2832;const px=x+Math.cos(a)*22,pz=z+Math.sin(a)*22;flowerBed(GR,P,px,pz,10,3.8,a+1.57,k%2?[sRGB('#e23a3a'),sRGB('#f4d03a'),sRGB('#e26a2c')]:[sRGB('#8a3ac0'),sRGB('#f4f0e8'),sRGB('#d12c2c')])}
  const r=mkRand(17);for(let i=0;i<14;i++){const a=i/14*6.2832;pkTree(x+Math.cos(a)*34,z+Math.sin(a)*34,4,1.15+r()*.3)}
  TREE_CLEAR.push(x,z,28);
  PLACES.push({id:'gorkyfountain',name:'Tiered fountain',sub:'Gorky Park',x:x,z:z+19,yaw:Math.PI})}
function gkGlassPavilion(grp,P,GR,x,z,ry){
  const gy=groundH(x,z);addFlat(x,z,14,8,gy);const W=16,Dp=11,H=6.2,c=Math.cos(ry),s=Math.sin(ry),at=(u,v)=>[x+u*c-v*s,z+u*s+v*c];const fr=sRGB('#eef0f2');
  pkRect(GR,x,z,W+6,Dp+6,ry,8,.02,ry);
  P.box(x,gy+.2,z,W+.6,.4,Dp+.6,ry,sRGB('#b9b6ac'),7);
  for(const u of [-W/2,-W/6,W/6,W/2])for(const v of [-Dp/2,Dp/2]){const p=at(u,v);P.box(p[0],gy+H/2+.4,p[1],.22,H,.22,ry,fr,6)}
  for(const v of [-Dp/2,Dp/2]){const p=at(0,v);P.box(p[0],gy+H+.5,p[1],W+.6,.25,.25,ry,fr,6)}for(const u of [-W/2,W/2]){const p=at(u,0);P.box(p[0],gy+H+.5,p[1],.25,.25,Dp,ry,fr,6)}
  const gm=new THREE.MeshStandardMaterial({color:0xa9c9d8,roughness:.05,metalness:.2,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false,envMapIntensity:1.6});
  for(const [u,v,w,d] of [[0,-Dp/2,W,.05],[0,Dp/2,W,.05],[-W/2,0,.05,Dp],[W/2,0,.05,Dp]]){const p=at(u,v);const m=new THREE.Mesh(new THREE.BoxGeometry(w,H,d),gm);m.position.set(p[0],gy+H/2+.4,p[1]);m.rotation.y=ry;m.userData.dyn=true;m.renderOrder=3;grp.add(m)}
  const roof=new THREE.Mesh(new THREE.BoxGeometry(W+1.2,.3,Dp+1.2),new THREE.MeshStandardMaterial({color:0xdfe6ea,roughness:.2,metalness:.3,transparent:true,opacity:.55,envMapIntensity:1.5}));roof.position.set(x,gy+H+.7,z);roof.rotation.y=ry;roof.userData.dyn=true;grp.add(roof);
  // inside: tables with parasols and a counter
  for(let k=0;k<4;k++){const p=at(-5.5+k*3.6,1.6);P.cyl(p[0],gy+.4,p[1],.55,.5,.05,10,sRGB('#f4f0e8'),0);P.cyl(p[0],gy+.4,p[1],.06,.06,.75,6,sRGB('#444'),1);for(const sd of [-1,1]){const q=at(-5.5+k*3.6,1.6+sd*1.0);P.box(q[0],gy+.7,q[1],.5,.06,.5,ry,sRGB('#d4691a'),5)}}
  {const p=at(0,-4.2);P.box(p[0],gy+.95,p[1],10,1.1,1,ry,sRGB('#6b4a2a'),5);P.box(p[0],gy+1.55,p[1]-.3,10.2,.1,1.3,ry,sRGB('#eee'),0)}
  EXTRA_LAMPS.push([x,gy+H-.3,z,9]);STATIC_OBB.push(x,z,W/2,Dp/2,c,-s)}

// ---------- the green flower clock (shows real time) ----------
function gkClock(grp,P,GR,x,z,ry){
  const gy=groundH(x,z);addFlat(x,z,9,6,gy);const R=4.6;
  pkDisc(GR,x,z,0,R+4,8,.02,24,0);
  const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');
  c.fillStyle='#2f6b2c';c.beginPath();c.arc(256,256,256,0,6.28);c.fill();const r=mkRand(23);
  for(let i=0;i<900;i++){const a=r()*6.28,d=Math.sqrt(r())*246;c.fillStyle='hsl('+(95+r()*40|0)+','+(45+r()*30|0)+'%,'+(22+r()*22|0)+'%)';c.beginPath();c.arc(256+Math.cos(a)*d,256+Math.sin(a)*d,3+r()*7,0,6.28);c.fill()}
  c.fillStyle='#f1e7b6';c.font='700 46px Arial';c.textAlign='center';c.textBaseline='middle';
  for(let h=1;h<=12;h++){const a=h/12*6.2832-1.5708;c.fillText(String(h),256+Math.cos(a)*196,256+Math.sin(a)*196)}
  for(let i=0;i<60;i++){const a=i/60*6.2832;c.fillStyle=i%5?'#d8cf9a':'#fff6cc';c.beginPath();c.arc(256+Math.cos(a)*226,256+Math.sin(a)*226,i%5?3:6,0,6.28);c.fill()}
  c.fillStyle='#c33';c.beginPath();c.arc(256,256,16,0,6.28);c.fill();
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
  const grpC=new THREE.Group();grpC.position.set(x,gy+.5,z);grpC.rotation.y=ry;grpC.userData.dyn=true;grp.add(grpC);
  const tilt=new THREE.Group();tilt.rotation.x=-1.0;tilt.position.y=2.1;grpC.add(tilt);
  const face=new THREE.Mesh(new THREE.CircleGeometry(R,48),new THREE.MeshStandardMaterial({map:t,roughness:.95}));face.castShadow=true;tilt.add(face);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(R,.28,8,48),new THREE.MeshStandardMaterial({color:sRGBc('#27582a'),roughness:.95}));tilt.add(rim);
  const mound=new THREE.Mesh(new THREE.CylinderGeometry(R*.62,R*.95,2.3,28),new THREE.MeshStandardMaterial({color:sRGBc('#2d6a2a'),roughness:.95}));mound.position.y=1.0;grpC.add(mound);
  const hand=(len,w,col)=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(w,len,.14),new THREE.MeshStandardMaterial({color:col,roughness:.4,metalness:.3}));m.position.y=len/2-len*.12;g.add(m);g.position.z=.16;tilt.add(g);return g};
  const hh=hand(2.7,.34,0xf6d36b),mh=hand(3.9,.22,0xf6d36b),sh=hand(4.1,.08,0xcc2222);
  ANIM.push(()=>{if(!pkNear(x,z,260))return;const d=new Date(),s=d.getSeconds()+d.getMilliseconds()/1000,m=d.getMinutes()+s/60,h=(d.getHours()%12)+m/60;sh.rotation.z=-s/60*6.2832;mh.rotation.z=-m/60*6.2832;hh.rotation.z=-h/12*6.2832});
  STATIC_CIR.push(x,z,R*.95);
  for(const sd of [-1,1]){const px=x+sd*(R+3.4);pkBench(P,px,groundH(px,z+4),z+4,Math.atan2(x-px,0));pkLamp(P,px,groundH(px,z-4),z-4,3,1)}
  TREE_CLEAR.push(x,z,12);PLACES.push({id:'gorkyclock',name:'Flower clock',sub:'Gorky Park',x,z:z+12,yaw:Math.PI})}

// ---------- mini golf, red tracks between white boards ----------
function gkMiniGolf(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,34,10,gy);const wh=sRGB('#f2efe6'),gr=sRGB('#6f726f'),r=mkRand(77);
  pkRect(GR,x,z,56,36,0,3,.02,0);pkRect(GR,x,z,52,32,0,8,.03,0);
  const strips=[[-18,-12,22,0],[2,-12,22,0],[-18,-4,22,0],[8,-4,16,0],[-16,4,24,0],[12,4,14,0],[-12,12,30,0]];
  for(const [u,v,L] of strips){const px=x+u+L/2-0,pz=z+v;pkRect(GR,px,pz,L,1.7,0,9,.05,0);for(const sd of [-1,1])P.box(px,groundH(px,pz)+.1,pz+sd*.95,L,.2,.1,0,wh,5)}
  for(const [u,v] of [[-8,-12],[12,-12],[-8,-4],[8,4],[-6,12],[10,12]]){const px=x+u,pz=z+v,py=groundH(px,pz);P.box(px,py+.3,pz,.9+r()*.8,.5,.9,r()*3,gr,7);P.box(px+1.6,py+.15,pz,.5,.25,.5,0,sRGB('#c3262d'),0)}
  for(const [u,v] of [[-20,-12],[22,-4],[-18,12],[34,12]]){const px=x+u,pz=z+v;P.cyl(px,groundH(px,pz),pz,.35,.3,.12,8,sRGB('#2a2f34'),1);P.cyl(px,groundH(px,pz)+.1,pz,.05,.05,.8,6,sRGB('#c9c6bd'),1);P.box(px+.28,groundH(px,pz)+.76,pz,.5,.28,.03,0,sRGB('#e8c41a'),0)}
  // a little windmill obstacle
  {const px=x+16,pz=z-2,py=groundH(px,pz);P.box(px,py+1.1,pz,1.6,2.2,1.6,0,wh,0);P.cyl(px,py+2.2,pz,1.3,.2,.9,8,sRGB('#c3262d'),0);
   const parts=[];for(let k=0;k<4;k++){parts.push(pkBox(.3,1.9,.05,0,1.0,0,'#f4f0e8',0,0,0));parts[k].m=pkM(0,0,0,0,0,k*Math.PI/2).multiply(pkM(0,1.0,0))}
   const blades=pkMesh(parts);blades.position.set(px,py+1.9,pz+.95);blades.userData.dyn=true;grp.add(blades);ANIM.push(()=>{if(pkNear(px,pz,200))blades.rotation.z=UNI.uTime.value*1.4});STATIC_CIR.push(px,pz,1)}
  // topiary guitar and a few round shrubs
  TREE_CLEAR.push(x,z,40);
  PLACES.push({id:'minigolf',name:'Mini golf',sub:'Gorky Park',x:x,z:z+26,yaw:Math.PI})}

// ---------- playground pieces: sunken ship, octopus, mesh tower with a red slide, rope pyramid ----------
function gkPlayground(grp,P,GR,x,z,ry,seed){
  const gy=groundH(x,z);addFlat(x,z,22,6,gy);const r=mkRand(seed||9),c=Math.cos(ry),s=Math.sin(ry);const at=(u,v)=>[x+u*c-v*s,z+u*s+v*c];
  pkRect(GR,x,z,44,34,ry,9,.03,0);
  // sunken ship
  {const p=at(-9,-5);const parts=[pkBox(3.2,1.3,8.5,0,.65,0,'#7a4a28'),pkBox(2.6,.5,7.6,0,1.45,0,'#8c5a30'),pkBox(2.8,.12,6.5,0,1.25,0,'#a9773f'),pkBeam([0,1.5,1],[0,6.5,1],.2,'#5a3a1e'),pkBox(2.4,3.4,.08,0,4.6,1.1,'#efe8d6'),pkBox(1.6,2.0,1.6,0,2.0,-2.6,'#7a4a28'),pkBox(.1,1.4,.1,0,1.9,3.6,'#5a3a1e',-.5)];
    const m=pkMesh(parts);m.position.set(p[0],gy+.3,p[1]);m.rotation.set(.1,ry+.4,-.12);m.userData.dyn=false;grp.add(m);STATIC_OBB.push(p[0],p[1],1.8,4.3,Math.cos(ry+.4),-Math.sin(ry+.4))}
  // orange octopus with tentacle slides
  {const p=at(9,-6);const parts=[{g:new THREE.SphereGeometry(2.3,16,12),m:pkM(0,2.6,0,0,0,0,1,1.05,1),c:sRGB('#e8761c')},pkSph(.5,-.8,3.7,1.9,'#fff'),pkSph(.5,.8,3.7,1.9,'#fff'),pkSph(.22,-.8,3.7,2.3,'#111'),pkSph(.22,.8,3.7,2.3,'#111')];
    for(let k=0;k<6;k++){const a=k/6*6.2832;const rr=2.0;parts.push(pkBeam([Math.cos(a)*rr*.8,2.0,Math.sin(a)*rr*.8],[Math.cos(a)*(rr+2.8),.35,Math.sin(a)*(rr+2.8)],.62,'#e8761c'))}
    const m=pkMesh(parts);m.position.set(p[0],gy,p[1]);grp.add(m);STATIC_CIR.push(p[0],p[1],3.4)}
  // mesh tower with a red slide
  {const p=at(-3,9);const parts=[];for(const sx of [-1,1])for(const sz of [-1,1])parts.push(pkBox(.2,5.4,.2,sx*1.4,2.7,sz*1.4,'#3a8fd0'));parts.push(pkBox(3.4,.15,3.4,0,3.0,0,'#c9c3b2'),pkBox(3.8,.2,3.8,0,5.4,0,'#3a8fd0'));
    for(let k=0;k<5;k++)for(const [ax,az,bx,bz] of [[-1.4,-1.4,1.4,-1.4],[1.4,-1.4,1.4,1.4],[1.4,1.4,-1.4,1.4],[-1.4,1.4,-1.4,-1.4]])parts.push(pkBeam([ax,k*1.05+.3,az],[bx,k*1.05+1.0,bz],.05,'#d9d9d9'));
    parts.push(pkBeam([1.7,3.1,0],[5.8,.25,0],.9,'#d6232b',.25));parts.push(pkBox(.12,.5,4.2,0,0,0,'#d6232b',0,0,0));parts.pop();
    const m=pkMesh(parts);m.position.set(p[0],gy,p[1]);m.rotation.y=ry;grp.add(m);STATIC_CIR.push(p[0],p[1],2.3)}
  // rope pyramid
  {const p=at(10,9);const parts=[pkBeam([0,0,0],[0,6.4,0],.14,'#c9c6bd')];for(let k=0;k<12;k++){const a=k/12*6.2832;parts.push(pkBeam([Math.cos(a)*3.8,.05,Math.sin(a)*3.8],[0,6.3,0],.07,'#d6232b'))}
    for(const rr of [1.2,2.2,3.0]){for(let k=0;k<12;k++){const a0=k/12*6.2832,a1=(k+1)/12*6.2832;const f=1-rr/3.9;parts.push(pkBeam([Math.cos(a0)*rr,(1-rr/3.9)*6.3,Math.sin(a0)*rr],[Math.cos(a1)*rr,(1-rr/3.9)*6.3,Math.sin(a1)*rr],.05,'#2a62c4'))}}
    const m=pkMesh(parts);m.position.set(p[0],gy,p[1]);grp.add(m);STATIC_CIR.push(p[0],p[1],3.8)}
  for(const [u,v] of [[-19,-14],[19,-14],[-19,14],[19,14]]){const p=at(u,v);pkBench(P,p[0],groundH(p[0],p[1]),p[1],Math.atan2(x-p[0],z-p[1]))}
  for(const [u,v] of [[0,-17],[0,17]]){const p=at(u,v);pkLamp(P,p[0],groundH(p[0],p[1]),p[1],2,u)}
  TREE_CLEAR.push(x,z,28)}

// ---------- thuja garden: white gravel, cones and round shrubs, white globe lamps ----------
function gkThujaGarden(grp,P,GR,x,z,ry){
  const gy=groundH(x,z);addFlat(x,z,26,8,gy);const c=Math.cos(ry),s=Math.sin(ry),at=(u,v)=>[x+u*c-v*s,z+u*s+v*c];const r=mkRand(31);
  pkRect(GR,x,z,48,34,ry,11,.03,0);pkRect(GR,x,z,48.6,34.6,ry,3,.0,0);
  for(const u of [-17,-6,5,16])for(const v of [-10,0,10]){const p=at(u+(r()-.5)*1.6,v+(r()-.5)*1.6);if(r()<.2)continue;pkTree(p[0],p[1],4,.55+r()*.35)}
  for(let i=0;i<46;i++){const p=at((r()-.5)*44,(r()-.5)*30);if(pkNearPath(p[0],p[1],0))continue;const y=groundH(p[0],p[1]),rr=.45+r()*.55;P.cyl(p[0],y,p[1],rr*.55,rr,rr*.6,8,sRGB('#2f6b32'),0);P.cyl(p[0],y+rr*.6,p[1],rr,rr*.6,rr*.7,8,sRGB('#357a38'),0)}
  for(const [u,v] of [[-22,-15],[22,-15],[-22,15],[22,15],[0,-15],[0,15],[-11,0],[11,0]]){const p=at(u,v),y=groundH(p[0],p[1]);P.cyl(p[0],y,p[1],.1,.08,1.0,6,sRGB('#f4f0e8'),0);pkGlobe(P,p[0],y+1.0,p[1],.42,sRGB('#ffffff'));EXTRA_LAMPS.push([p[0],y+1.3,p[1],2.6])}
  TREE_CLEAR.push(x,z,30);PLACES.push({id:'thuja',name:'Thuja garden',sub:'Gorky Park',x:at(0,20)[0],z:at(0,20)[1],yaw:Math.PI})}

// ---------- hot-air balloon garden ----------
function gkBalloons(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,22,8,gy);pkRect(GR,x,z,36,28,0,11,.03,0);const cols=[['#d6232b','#f4f0e8'],['#2a62c4','#f4d03a'],['#2f8f46','#f4f0e8'],['#e8761c','#6b3fa0'],['#c43a8a','#f4f0e8']];
  const list=[];
  cols.forEach((cc,i)=>{const px=x+(i-2)*7.5,pz=z+(i%2?5:-5),py=groundH(px,pz);const parts=[];const N=12;
    for(let k=0;k<N;k++){parts.push({g:new THREE.SphereGeometry(2.4,6,10,k/N*6.2832,6.2832/N),m:pkM(0,8.2,0,0,0,0,1,1.18,1),c:sRGB(cc[k%2])})}
    parts.push(pkBox(1.0,.8,1.0,0,3.9,0,'#6b4a2a'),pkBeam([.5,4.3,.5],[1.6,6.5,.6],.04,'#555'),pkBeam([-.5,4.3,-.5],[-1.6,6.5,-.6],.04,'#555'),pkBeam([.5,4.3,-.5],[1.6,6.5,-.6],.04,'#555'),pkBeam([-.5,4.3,.5],[-1.6,6.5,.6],.04,'#555'));
    const m=pkMesh(parts);m.position.set(px,py,pz);m.userData.dyn=true;grp.add(m);list.push({m,ph:i*1.3,py});P.cyl(px,py,pz,.4,.5,.3,8,sRGB('#6e6c66'),7);STATIC_CIR.push(px,pz,.6)});
  ANIM.push(()=>{if(!pkNear(x,z,300))return;const t=UNI.uTime.value;for(const b of list){b.m.position.y=b.py+Math.sin(t*.6+b.ph)*.35;b.m.rotation.z=Math.sin(t*.4+b.ph)*.03}});
  // wooden footbridge
  for(let k=0;k<18;k++){const px=x-9+k,pz=z+12,hh=Math.sin(k/17*Math.PI)*.9;P.box(px,groundH(px,pz)+hh+.08,pz,1.05,.12,2.4,0,sRGB('#8a5a34'),5)}
  for(const sd of [-1,1])for(let k=0;k<18;k+=2){const px=x-9+k,pz=z+12+sd*1.2,hh=Math.sin(k/17*Math.PI)*.9;P.box(px,groundH(px,pz)+hh+.55,pz,.1,1.0,.1,0,sRGB('#6b4426'),5)}
  TREE_CLEAR.push(x,z,28);PLACES.push({id:'balloons',name:'Balloon garden',sub:'Gorky Park',x,z:z+22,yaw:Math.PI})}

// ---------- white wave-roof pergola ----------
function gkWavePergola(grp,P,GR,x,z,ry,len){
  const gy=groundH(x,z),c=Math.cos(ry),s=Math.sin(ry),at=(u,v)=>[x+u*c-v*s,z+u*s+v*c],wh=sRGB('#f4f1ea');pkRect(GR,x,z,len+4,9,ry,8,.02,ry);
  for(let u=-len/2;u<=len/2;u+=3){for(const v of [-3,3]){const p=at(u,v);P.box(p[0],groundH(p[0],p[1])+2.0,p[1],.22,4.0,.22,ry,wh,0)}}
  for(let u=-len/2;u<len/2;u+=.7){const h=4.1+Math.sin(u*.28)*.9;for(const v of [-2.6,-1.3,0,1.3,2.6]){}const p=at(u,0);P.box(p[0],gy+h,p[1],.16,.16,7.2,ry,wh,0,Math.sin(u*.28)*.0)}
  for(const v of [-3,3]){for(let u=-len/2;u<len/2;u+=3){const p=at(u+1.5,v),h=4.1+Math.sin((u+1.5)*.28)*.9;P.box(p[0],gy+h-.25,p[1],3.1,.2,.2,ry,wh,0)}}
  for(let k=0;k<4;k++){const p=at(-len/2+len*(k+.5)/4,0);pkBench(P,p[0],groundH(p[0],p[1]),p[1],ry)}
  TREE_CLEAR.push(x,z,len/2+4)}

// ---------- stone memorial among trees ----------
function gkStele(grp,P,GR,x,z){
  const gy=groundH(x,z);addFlat(x,z,12,6,gy);const gr=sRGB('#7a7d80'),gd=sRGB('#4a4d51');pkDisc(GR,x,z,0,10,8,.02,20,0);
  P.box(x,gy+.3,z,7,.6,7,0,gr,7);P.box(x,gy+.9,z,5,.6,5,0,gr,7);P.box(x,gy+4.6,z,2.2,7.2,2.2,0,gd,7);P.box(x,gy+8.4,z,2.7,.5,2.7,0,gr,7);P.box(x,gy+8.8,z,1.4,.35,1.4,0,gr,7);
  P.box(x,gy+3,z+1.14,1.4,2.2,.06,0,sRGB('#5e5230'),6);STATIC_CIR.push(x,z,3.6);
  const r=mkRand(5);for(let i=0;i<10;i++){const a=i/10*6.2832;pkTree(x+Math.cos(a)*15,z+Math.sin(a)*15,1,.8+r()*.3)}
  for(let k=0;k<4;k++){const a=k*1.5708+.78;const px=x+Math.cos(a)*9,pz=z+Math.sin(a)*9;pkBench(P,px,groundH(px,pz),pz,Math.atan2(x-px,z-pz))}
  TREE_CLEAR.push(x,z,12)}

// ---------- the installer ----------
function installGorky(grp,G,P,Sg,GR){
  const D0=PKDATA.gorky,rnd=mkRand(7311);
  pkHookRoads();
  const ENT=[-999,-4308],TIER=[-1003,-4398],PAV=[-968,-4405],CLOCK=[-1006,-4352],GOLF=[-1138,-4600],STELE=[-1003,-4335+0];
  GK.lake={x:-1062,z:-4514,a:80,b:48,rot:.5};
  const lake=gkLake(grp,P,GR,rnd);
  const spots=[[ENT,36],[TIER,26],[PAV,14],[CLOCK,12],[GOLF,34],[[-927,-4523],70]];
  const inSpot=(x,z)=>spots.some(([p,r])=>Math.hypot(x-p[0],z-p[1])<r);
  const skip=(x,z)=>gkLakeD(x,z)<1.12||inSpot(x,z);
  const tree=(x,z,r)=>{const q=r();pkTree(x,z,q<.3?0:q<.5?1:q<.7?4:q<.82?3:q<.9?2:4,.9+r()*.45)};
  pkTry('gpaths',()=>pkPaths(GR,P,D0,{rnd,skip,noFurn:skip,tree,benchStep:55,lampStep:40,treeStep:12,maxBench:200,maxLamp:200,pave:(k)=>k===2?4:8}));
  pkTry('gring',()=>pkPaths(GR,P,{paths:[[0,1,...lake.pts]]},{rnd,skip:()=>false,tree:()=>{},benchStep:28,lampStep:22,treeStep:99,maxBench:260,maxLamp:260,pave:()=>8}));
  pkZone(D0.poly,(n,x,z)=>gkLakeD(x,z)<1.3?0:(n<.36?.1:.34+(n-.36)*1.0));
  pkTry('entrance',()=>gkEntrance(grp,P,GR,ENT[0],ENT[1]));
  pkTry('tier',()=>gkTierFountain(grp,P,GR,TIER[0],TIER[1]));
  pkTry('pavilion',()=>gkGlassPavilion(grp,P,GR,PAV[0],PAV[1],Math.PI/2));
  pkTry('clock',()=>gkClock(grp,P,GR,CLOCK[0],CLOCK[1],0));
  pkTry('golf',()=>gkMiniGolf(grp,P,GR,GOLF[0],GOLF[1]));
  pkTry('play1',()=>gkPlayground(grp,P,GR,-948,-4692,.3,3));
  pkTry('play2',()=>gkPlayground(grp,P,GR,-1000,-4760,-.4,4));
  pkTry('thuja',()=>gkThujaGarden(grp,P,GR,-1160,-4520,.5));
  pkTry('balloons',()=>gkBalloons(grp,P,GR,-1150,-4690));
  pkTry('pergola',()=>gkWavePergola(grp,P,GR,-900,-4600,.7,36));
  pkTry('stele',()=>gkStele(grp,P,GR,-1003,-4338));
  // attractions zone: Ferris wheel, swing ride, carousel, coaster ("Веселі гірки")
  pkTry('rides',()=>{pkFerris(grp,-1088,-4748,Math.PI/2*0+.5,16);pkSwingRide(grp,-1128,-4718,11);pkCarousel(grp,-1112,-4768,4.6,5);pkCoaster(grp,-883,-4589,.6,.8);
    PLACES.push({id:'gorkyrides',name:'Attractions',sub:'Gorky Park',x:-1105,z:-4700,yaw:-Math.PI/2});TREE_CLEAR.push(-1100,-4740,40)});
  pkTry('lakeplace',()=>PLACES.push({id:'gorkylake',name:'Gorky Park lake',sub:'fountains and mist',x:GK.lake.x+GK.lake.a*1.35,z:GK.lake.z+10,yaw:Math.PI/2}));
  console.log('Gorky Park: benches',PK.nB,'lamps',PK.nL)}
