// soviet.js — a Khrushchyovka stairwell (green-and-white walls, concrete flights with a green rail, three flat doors, old lift),
// a cosy Soviet kitchen and lounge for the home flat, and a big New Year tree on Derybasivska.
// Loaded before the main script; game globals are only touched when the functions run.

const SVT={};
function svTex(kind){if(SVT[kind])return SVT[kind];
  const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');
  if(kind==='stripe'){x.fillStyle='#e9dcae';x.fillRect(0,0,256,256);
    for(let i=0;i<256;i+=32){x.fillStyle='#d6c488';x.fillRect(i,0,6,256);x.fillStyle='#bfa868';x.fillRect(i+9,0,1,256)}
    for(let j=0;j<256;j+=32)for(let i=19;i<256;i+=32){x.fillStyle='#c56a62';x.beginPath();x.arc(i,j+12,4,0,7);x.fill();x.fillStyle='#7f9a5e';x.fillRect(i-1,j+16,2,8)}}
  else if(kind==='floral'||kind==='curtain'){x.fillStyle=kind==='curtain'?'#f1e2c4':'#efe6c8';x.fillRect(0,0,256,256);const big=kind==='curtain',pr=big?10:6;
    for(let j=0;j<4;j++)for(let i=0;i<4;i++){const cx=32+i*64+(j%2)*32,cy=32+j*64;x.fillStyle=big?'#d9604f':'#d9a78a';
      for(let k=0;k<5;k++){const a=k*1.256;x.beginPath();x.arc(cx+Math.cos(a)*pr*1.1,cy+Math.sin(a)*pr*1.1,pr,0,7);x.fill()}
      x.fillStyle='#e8c85a';x.beginPath();x.arc(cx,cy,pr*.6,0,7);x.fill();x.fillStyle='#8aa86a';
      x.beginPath();x.ellipse(cx+18,cy+11,10,4,.6,0,7);x.fill();x.beginPath();x.ellipse(cx-18,cy+11,10,4,-.6,0,7);x.fill()}}
  else if(kind==='fur'){x.fillStyle='#8f7d69';x.fillRect(0,0,256,256);                                    // tabby: dark vertical bands, fine hair strokes, pale underside
    for(let i=0;i<256;i+=28){x.fillStyle='rgba(58,44,34,.78)';x.beginPath();x.moveTo(i,0);for(let j=0;j<=256;j+=16)x.lineTo(i+5+Math.sin(j*.05+i)*4,j);for(let j=256;j>=0;j-=16)x.lineTo(i+17+Math.sin(j*.05+i)*4,j);x.fill()}
    for(let k=0;k<1800;k++){const px=Math.random()*256,py=Math.random()*256;x.strokeStyle=Math.random()<.5?'rgba(255,240,215,.16)':'rgba(30,22,16,.16)';x.lineWidth=1;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.random()*3-1.5,py+4+Math.random()*4);x.stroke()}
    const g=x.createLinearGradient(0,170,0,256);g.addColorStop(0,'rgba(240,230,210,0)');g.addColorStop(1,'rgba(240,230,210,.85)');x.fillStyle=g;x.fillRect(0,170,256,86)}
  else if(kind==='rug'){x.fillStyle='#7b1822';x.fillRect(0,0,256,256);x.strokeStyle='#e0b95c';x.lineWidth=10;x.strokeRect(10,10,236,236);x.strokeStyle='#2c3f6b';x.lineWidth=7;x.strokeRect(30,30,196,196);
    x.fillStyle='#e0b95c';x.beginPath();x.moveTo(128,50);x.lineTo(200,128);x.lineTo(128,206);x.lineTo(56,128);x.closePath();x.fill();
    x.fillStyle='#2c3f6b';x.beginPath();x.moveTo(128,76);x.lineTo(176,128);x.lineTo(128,180);x.lineTo(80,128);x.closePath();x.fill();x.fillStyle='#7b1822';x.beginPath();x.arc(128,128,18,0,7);x.fill();
    for(let i=0;i<256;i+=16){x.fillStyle='#e0b95c';x.fillRect(i,0,6,6);x.fillRect(i,250,6,6)}}
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return SVT[kind]=t}
// a flat wallpaper / curtain / rug panel: centre, size, yaw (the plane faces (sin yaw, cos yaw)); rw,rh = metres per texture repeat
function svPanel(grp,kind,cx,cy,cz,w,h,yaw,rw,rh,horiz){const t=svTex(kind).clone();t.needsUpdate=true;t.repeat.set(w/(rw||1.5),h/(rh||1.5));
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.95,side:THREE.DoubleSide}));
  m.position.set(cx,cy,cz);if(horiz){m.rotation.x=-Math.PI/2;m.rotation.z=yaw||0}else m.rotation.y=yaw;m.receiveShadow=true;grp.add(m);return m}
function svClock(grp,x,y,z,ry,r){const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  c.fillStyle='#8a5a30';c.beginPath();c.arc(64,64,64,0,7);c.fill();c.fillStyle='#f4efe0';c.beginPath();c.arc(64,64,56,0,7);c.fill();c.strokeStyle='#222';c.lineWidth=3;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(64+Math.sin(a)*46,64-Math.cos(a)*46);c.lineTo(64+Math.sin(a)*54,64-Math.cos(a)*54);c.stroke()}
  c.lineWidth=6;c.beginPath();c.moveTo(64,64);c.lineTo(64+Math.sin(6.2)*28,64-Math.cos(6.2)*28);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(64,64);c.lineTo(64+Math.sin(6.07)*44,64-Math.cos(6.07)*44);c.stroke();
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;const m=new THREE.Mesh(new THREE.CircleGeometry(r,24),new THREE.MeshStandardMaterial({map:t,roughness:.6,transparent:true}));m.position.set(x,y,z);m.rotation.y=ry;grp.add(m)}
// a swag of blinking coloured bulbs on a thin wire between two points (instanced: one mesh per colour)
function svGarland(grp,ax,ay,az,bx,by,bz,n,sag,cols){const g=new THREE.SphereGeometry(.08,6,5),ms=cols.map(h=>new THREE.MeshStandardMaterial({color:0x111111,emissive:h,emissiveIntensity:1.1,roughness:.4})),
    inst=ms.map(m=>{const i=new THREE.InstancedMesh(g,m,Math.ceil(n/cols.length));i.frustumCulled=false;grp.add(i);return i}),cnt=ms.map(()=>0),d=new THREE.Object3D(),at=t=>new THREE.Vector3(ax+(bx-ax)*t,ay+(by-ay)*t-Math.sin(t*Math.PI)*sag,az+(bz-az)*t);
  for(let k=0;k<n;k++){const c=k%cols.length;d.position.copy(at(k/(n-1)));d.updateMatrix();inst[c].setMatrixAt(cnt[c]++,d.matrix)}
  inst.forEach((m,i)=>{m.count=cnt[i];m.instanceMatrix.needsUpdate=true});
  const pts=[];for(let k=0;k<=24;k++)pts.push(at(k/24));grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.012,4,false),new THREE.MeshBasicMaterial({color:0x1a1a1a})));
  let t=0;ANIM.push(dt=>{t+=dt;ms.forEach((m,i)=>{m.emissiveIntensity=.35+1.0*(.5+.5*Math.sin(t*3.2+i*1.9))})})}
const SV_MATS={};
function svMat(hex,em){const k=hex+(em?'e':'');return SV_MATS[k]||(SV_MATS[k]=new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(hex).convertSRGBToLinear(),roughness:.5},em?{emissive:new THREE.Color(hex),emissiveIntensity:.7}:{})))}
let SV_SPH=null;
function svSph(grp,x,y,z,r,hex,sx,sy,sz,em){SV_SPH=SV_SPH||new THREE.SphereGeometry(1,12,9);const m=new THREE.Mesh(SV_SPH,svMat(hex,em));m.position.set(x,y,z);m.scale.set(r*(sx||1),r*(sy||1),r*(sz||1));m.castShadow=true;grp.add(m);return m}
// PB.cyl puts its base (not its centre) at y and rotates about that base: take a centre position and shift it so a cylinder can be placed by its middle
function svCyl(P,x,y,z,r1,r2,len,seg,col,m,rx,rz,ry){rx=rx||0;rz=rz||0;ry=ry||0;const h2=len/2,y1=h2*Math.cos(rx),z1=h2*Math.sin(rx),x1=-y1*Math.sin(rz),y2=y1*Math.cos(rz);
  P.cyl(x-(x1*Math.cos(ry)+z1*Math.sin(ry)),y-y2,z-(-x1*Math.sin(ry)+z1*Math.cos(ry)),r1,r2,len,seg,col,m,rx,rz,ry)}
// a sitting tabby cat (smooth furry ellipsoids + canvas fur, sways its tail, breathes, turns its head to whoever walks past); front = +z
function svCat(grp,x,y,z,ry,sc){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry||0;g.scale.setScalar(sc||1);grp.add(g);
  const fur=new THREE.MeshStandardMaterial({map:svTex('fur'),roughness:1}),white=new THREE.MeshStandardMaterial({color:0xf1ebe0,roughness:1}),pink=new THREE.MeshStandardMaterial({color:0xd98a8a,roughness:.7}),
    eye=new THREE.MeshStandardMaterial({color:0x9bc23a,roughness:.25,emissive:0x2c4210,emissiveIntensity:.5}),dark=new THREE.MeshBasicMaterial({color:0x0a0a0a}),sph=new THREE.SphereGeometry(1,22,16);
  const E=(par,mat,px,py,pz,rx,ry2,rz,rotx)=>{const m=new THREE.Mesh(sph,mat);m.position.set(px,py,pz);m.scale.set(rx,ry2,rz);if(rotx)m.rotation.x=rotx;m.castShadow=true;par.add(m);return m};
  const body=new THREE.Group();g.add(body);
  E(body,fur,0,.115,-.06,.115,.115,.135);E(body,fur,0,.2,.035,.085,.12,.09,-.25);                    // haunches + chest
  E(body,fur,-.085,.07,-.03,.05,.07,.1);E(body,fur,.085,.07,-.03,.05,.07,.1);E(body,white,0,.15,.095,.045,.075,.03,-.2);   // thighs, white bib
  for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.03,.034,.15,10),white);leg.position.set(s*.045,.09,.09);leg.castShadow=true;body.add(leg);
    E(body,white,s*.043,.016,.115,.03,.02,.043);E(body,white,s*.078,.016,.03,.034,.02,.05)}      // paws
  const head=new THREE.Group();head.position.set(0,.33,.095);g.add(head);
  E(head,fur,0,0,0,.072,.063,.066);E(head,white,0,-.022,.058,.036,.027,.031);E(head,pink,0,-.005,.087,.011,.008,.007);   // skull, muzzle, nose
  for(const s of [-1,1]){E(head,eye,s*.033,.012,.052,.014,.012,.008);E(head,dark,s*.033,.012,.058,.004,.011,.004);     // eyes with slit pupils
    const ear=new THREE.Mesh(new THREE.ConeGeometry(.03,.06,4),fur);ear.position.set(s*.045,.058,-.012);ear.rotation.z=-s*.28;ear.rotation.y=.8;ear.castShadow=true;head.add(ear);
    const inn=new THREE.Mesh(new THREE.ConeGeometry(.018,.04,4),pink);inn.position.set(s*.045,.052,-.002);inn.rotation.z=-s*.28;inn.rotation.y=.8;head.add(inn)}
  {const pts=[],B=[];for(const s of [-1,1])for(let k=0;k<3;k++){const a=(k-1)*.22;B.push(s*.025,-.015,.085,s*(.025+Math.cos(a)*.1),-.015+Math.sin(a)*.1,.085+.012)}
    const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(B,3));head.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.55})))}
  const tailG=new THREE.Group();tailG.position.set(0,.04,-.17);g.add(tailG);
  const tp=[[0,0,0],[.07,.0,-.04],[.15,0,.0],[.17,0,.1],[.12,0,.18]].map(p=>new THREE.Vector3(p[0],p[1],p[2]));
  const tail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp),20,.019,8,false),fur);tail.castShadow=true;tailG.add(tail);E(tailG,fur,.12,0,.18,.02,.019,.022);
  let t=Math.random()*6,face=0;const wp=new THREE.Vector3();
  ANIM.push(dt=>{if(!g.parent)return;g.getWorldPosition(wp);if(Math.abs(wp.x-camera.position.x)+Math.abs(wp.z-camera.position.z)>16)return;
    t+=dt;body.scale.y=1+Math.sin(t*2.3)*.012;tailG.rotation.y=Math.sin(t*1.4)*.18;tailG.rotation.z=Math.sin(t*1.1)*.05;
    const p=g.worldToLocal(new THREE.Vector3(player.x,wp.y,player.z));let want=0;if(p.length()<4)want=Math.max(-1,Math.min(1,Math.atan2(p.x,p.z)));
    face+=(want-face)*Math.min(1,dt*3);head.rotation.y=face;head.rotation.x=Math.sin(t*.7)*.03});
  return g}
// batched-prop helpers bound to a flat's origin
function svKit(grp,ox,oz,Y){const P=new PB(),c=sRGB;
  const K={P,
    B:(x,y,z,w,h,d,col,m,ry,rx)=>P.box(ox+x,Y+y,oz+z,w,h,d,ry||0,c(col),m===undefined?1:m,rx||0),
    C:(x,y,z,r1,r2,len,col,m,rx,rz,ry)=>svCyl(P,ox+x,Y+y,oz+z,r1,r2,len,12,c(col),m===undefined?1:m,rx,rz,ry),
    S:(x,y,z,r,col,sx,sy,sz,em)=>svSph(grp,ox+x,Y+y,oz+z,r,col,sx,sy,sz,em),
    solid:(x,z,hx,hz,ry)=>LOW_OBB.push(ox+x,oz+z,hx,hz,Math.cos(ry||0),-Math.sin(ry||0)),
    // a rotated group of boxes: parts are [dx,y,dz,w,h,d,colour,mat] in the object's own frame
    place(cx,cz,ry,parts){for(const [dx,y,dz,w,h,d,col,m] of parts){const px=cx+dx*Math.cos(ry)+dz*Math.sin(ry),pz=cz-dx*Math.sin(ry)+dz*Math.cos(ry);P.box(ox+px,Y+y,oz+pz,w,h,d,ry,c(col),m===undefined?1:m)}},
    done(){const g=P.build();if(g)grp.add(new THREE.Mesh(g,MATS.props))}};
  return K}

// ===================== cosy Soviet kitchen (rear-right room of the home flat) =====================
function sovKitchen(grp,ox,oz,Y){const K=svKit(grp,ox,oz,Y),{B,C,S,solid}=K;
  const wood='#b87a3e',woodD='#8a5528',cream='#efe6cf',steel='#c4c9cd',NZ=21.86;
  // floral wallpaper on every kitchen wall
  // north wall: the 2.5 m opening at x 4.75–7.25 becomes a proper window above the sink (glass, frame, café curtains)
  svPanel(grp,'floral',ox+3.0,Y+1.4,oz+NZ,3.5,2.8,Math.PI);svPanel(grp,'floral',ox+9.125,Y+1.4,oz+NZ,3.75,2.8,Math.PI);
  svPanel(grp,'floral',ox+6.0,Y+.9,oz+NZ,2.5,1.8,Math.PI);svPanel(grp,'floral',ox+6.0,Y+2.74,oz+NZ,2.5,.12,Math.PI);
  {const gl=new THREE.Mesh(new THREE.BoxGeometry(2.3,.8,.03),new THREE.MeshStandardMaterial({color:0xc9e1e8,roughness:.12,metalness:.2,transparent:true,opacity:.55}));gl.position.set(ox+6.0,Y+2.25,oz+21.92);grp.add(gl)}
  svPanel(grp,'curtain',ox+4.95,Y+2.25,oz+21.8,.5,.95,Math.PI,.6,.8);svPanel(grp,'curtain',ox+7.05,Y+2.25,oz+21.8,.5,.95,Math.PI,.6,.8);
  B(6.0,1.83,21.88,2.6,.08,.14,'#f4f2ea',9);B(6.0,2.67,21.88,2.6,.08,.14,'#f4f2ea',9);B(4.74,2.25,21.88,.07,.95,.14,'#f4f2ea',9);B(7.26,2.25,21.88,.07,.95,.14,'#f4f2ea',9);B(6.0,2.25,21.9,.05,.85,.06,'#f4f2ea',9);
  C(6.0,2.58,21.76,.015,.015,2.5,'#6b4a2a',5,0,Math.PI/2);                                                       // curtain rod
  svPanel(grp,'floral',ox+1.33,Y+1.4,oz+13.1,3.8,2.8,Math.PI/2);svPanel(grp,'floral',ox+1.33,Y+1.4,oz+19.4,4.8,2.8,Math.PI/2);
  svPanel(grp,'floral',ox+3.2,Y+1.4,oz+11.15,3.6,2.8,0);svPanel(grp,'floral',ox+8.9,Y+1.4,oz+11.15,3.8,2.8,0);
  svPanel(grp,'floral',ox+10.88,Y+1.4,oz+12.6,2.8,2.8,-Math.PI/2);svPanel(grp,'floral',ox+10.88,Y+1.4,oz+19.9,3.8,2.8,-Math.PI/2);
  svPanel(grp,'rug',ox+5.3,Y+.02,oz+15.4,3.0,2.2,0,3,2.2,true);                                   // rug under the table
  svPanel(grp,'rug',ox+1.37,Y+1.45,oz+19.4,1.6,2.3,Math.PI/2,1.6,2.3);                             // the traditional carpet on the wall
  svClock(grp,ox+1.37,Y+2.2,oz+13.1,Math.PI/2,.32);                                                // wall clock: two minutes to midnight
  // tiled splash-back
  B(6.9,1.78,21.82,4.4,.55,.04,'#e9eef0',9);for(let k=0;k<16;k++)B(4.8+k*.28,1.78,21.8,.012,.55,.02,'#b9c6cc',9);
  // tall open shelf unit with preserves, a matryoshka and a plant
  for(const x of [2.0,3.4])B(x,1.1,21.55,.06,2.2,.6,woodD,5);B(2.7,1.1,21.83,1.42,2.2,.03,'#c9a06a',5);
  const jc=['#5aa83e','#c43a2a','#d9791c','#c43a2a','#5aa83e'];
  [.05,.6,1.15,1.7,2.2].forEach((y,i)=>{B(2.7,y,21.55,1.44,.05,.6,wood,5);if(i<4)for(let k=0;k<3;k++){const x=2.35+k*.35;C(x,y+.2,21.52,.14,.14,.34,jc[(i+k)%5],1);C(x,y+.39,21.52,.15,.15,.04,'#c9a54a',6)}});
  C(2.4,2.37,21.55,.12,.09,.3,'#d62828',1);C(2.4,2.57,21.55,.07,.07,.1,'#f0c090',1);C(2.4,2.62,21.55,.075,.075,.05,'#d62828',1);   // matryoshka
  C(3.0,2.33,21.55,.1,.13,.2,'#a0522d',1);C(3.0,2.5,21.55,.04,.04,.25,'#3f8a3a',1);B(3.0,2.62,21.55,.28,.2,.04,'#4f9a3a',0);B(3.0,2.62,21.55,.04,.2,.28,'#4f9a3a',0);   // plant
  solid(2.7,21.5,.75,.4);
  // gas stove: enamel body, hob, burners, oven window, knobs, teal stripe
  B(4.3,.75,21.43,1.5,1.5,.85,cream,1);B(4.3,1.52,21.43,1.52,.06,.87,'#2a2a2a',1);
  for(const [x,z] of [[3.9,21.25],[4.7,21.25],[3.9,21.65],[4.7,21.65]]){C(x,1.58,z,.2,.2,.04,'#111',1);C(x,1.6,z,.12,.12,.04,'#666',6)}
  for(const x of [3.9,4.7]){B(x,1.64,21.45,.62,.025,.05,'#333',6);B(x,1.64,21.45,.05,.025,.92,'#333',6)}
  B(4.3,.62,20.99,1.3,.8,.03,'#f6efd9',1);B(4.3,.66,20.97,.85,.5,.02,'#1a1c1e',2);B(4.3,1.02,20.95,1.0,.04,.05,steel,6);
  B(4.3,1.3,20.99,1.46,.28,.03,'#f6efd9',1);B(4.3,1.38,20.97,1.46,.04,.02,'#2f8f8a',1);
  for(const x of [3.85,4.3,4.75])C(x,1.28,20.94,.06,.06,.06,'#1c1c1c',1,Math.PI/2);
  C(3.9,1.8,21.25,.3,.24,.42,'#e9e2cf',1);C(3.9,2.04,21.25,.1,.1,.06,'#2a2a2a',1);B(3.62,1.9,21.25,.3,.06,.06,'#e9e2cf',1,0,.3);B(4.2,1.95,21.25,.05,.34,.05,'#2a2a2a',1);   // kettle
  C(4.7,1.72,21.65,.3,.3,.2,'#4a4d50',6);B(4.2,1.72,21.65,.4,.04,.07,'#2a2a2a',1);                                                                         // frying pan
  solid(4.3,21.3,.75,.55);
  // gas meter and pipes
  B(4.3,2.4,21.78,.4,.5,.18,'#bfc4c6',1);C(4.3,2.4,21.68,.1,.1,.02,'#eee',1,Math.PI/2);C(4.3,1.98,21.78,.035,.035,.9,'#bdbdb0',6);C(3.6,2.62,21.78,.035,.035,1.4,'#bdbdb0',6,0,Math.PI/2);
  // counters with wooden fronts and cream tops
  const run=(x0,x1)=>{const w=x1-x0,cx=(x0+x1)/2,cells=Math.max(1,Math.round(w/.75));B(cx,.72,21.4,w,1.44,.9,woodD,5);B(cx,1.5,21.38,w+.04,.08,.96,cream,1);
    for(let k=0;k<cells;k++){const xc=x0+(k+.5)*w/cells;B(xc,.75,20.94,w/cells-.06,1.2,.03,wood,5);B(xc+.18,1.2,20.91,.03,.18,.03,steel,6)}solid(cx,21.2,w/2,.55)};
  run(5.05,6.2);run(8.0,9.5);
  // sink cabinet with a steel basin, chrome mixer, dish rack with plates and cups
  B(7.1,.72,21.4,1.8,1.44,.9,woodD,5);B(7.1,1.5,21.38,1.84,.08,.96,'#d9d6cc',1);B(7.1,1.545,21.4,1.2,.03,.7,'#aeb4b7',6);C(7.1,1.56,21.4,.07,.07,.02,'#333',1);
  for(const k of [0,1,2])B(6.6+k*.5,.75,20.94,.44,1.2,.03,wood,5);
  C(7.1,1.78,21.72,.04,.04,.5,steel,6);C(7.1,2.02,21.52,.035,.035,.45,steel,6,Math.PI/2);B(6.8,1.62,21.7,.1,.1,.1,steel,6);B(7.4,1.62,21.7,.1,.1,.1,steel,6);
  B(7.1,2.1,21.62,1.4,.04,.4,steel,6);B(7.1,2.5,21.62,1.4,.04,.4,steel,6);for(const x of [6.4,7.8])B(x,2.3,21.62,.03,.42,.4,steel,6);
  for(let k=0;k<6;k++)C(6.6+k*.18,2.34,21.62,.22,.22,.03,k%2?'#cfe0ea':'#eeeee8',1,0,Math.PI/2);
  for(let k=0;k<3;k++){C(6.65+k*.3,2.58,21.62,.07,.06,.12,'#f2efe6',1);C(6.65+k*.3,2.58,21.62,.071,.071,.03,'#2a62b8',1)}
  solid(7.1,21.2,.9,.55);
  // wall cupboards
  for(const [x,w] of [[8.75,1.5]]){B(x,2.35,21.65,w,.9,.42,wood,5);B(x,2.35,21.43,w-.06,.8,.03,'#a56a30',5);B(x+.2,2.2,21.4,.03,.2,.03,steel,6)}
  // bread, board, tangerines
  B(5.6,1.56,21.4,.7,.03,.4,'#c8a070',5);B(5.9,1.64,21.34,.42,.14,.2,'#c28a4a',9);C(8.8,1.6,21.4,.22,.17,.1,'#e8e6e0',1);
  for(const [x,z] of [[8.74,21.38],[8.9,21.42],[8.82,21.3],[8.8,21.46]])S(x,1.72,z,.09,'#f08a1c');
  MDL.put(grp,'russian_food_cans_01',{x:ox+9.2,y:Y+1.54,z:oz+21.35,ry:Math.PI+.2,w:.8});          // real Soviet tins: salt, condensed milk, sprats (Poly Haven, CC0)
  // stools with patterned cushions
  for(const [x,z] of [[4.15,15.0],[6.45,15.0],[5.3,16.1]]){C(x,.62,z,.28,.28,.06,'#f0ece0',1);C(x,.68,z,.27,.27,.05,'#a63c2a',1);C(x,.7,z,.2,.2,.03,'#e0b04a',1);
    for(const [dx,dz] of [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]])B(x+dx,.3,z+dz,.05,.6,.05,'#c4622d',6);solid(x,z,.3,.3)}
  // pendant lamp over the table
  C(5.3,2.5,15,.01,.01,.6,'#222',1);C(5.3,2.16,15,.5,.1,.3,'#f0b050',3);
  // curtains on the balcony door, bin, bottles (the «Днепр» fridge with its opening door is built in buildSovietDecor, index.html)
  svPanel(grp,'curtain',ox+10.82,Y+1.4,oz+14.5,.9,2.6,-Math.PI/2,.9,1.2);svPanel(grp,'curtain',ox+10.82,Y+1.4,oz+17.5,.9,2.6,-Math.PI/2,.9,1.2);
  C(10.45,.3,18.0,.28,.3,.6,'#cfd3d6',1);C(10.45,.62,18.0,.3,.3,.06,'#1a1a1a',1);
  for(const [x,z] of [[10.6,18.75],[10.35,18.6]]){C(x,.3,z,.1,.1,.55,'#2a6fb5',1);C(x,.6,z,.05,.05,.06,'#eee',1)}
  svGarland(grp,ox+1.6,Y+2.7,oz+21.15,ox+10.6,Y+2.7,oz+21.15,36,.28,[0xff2a1f,0x1fa8ff,0xffc61a,0x2dff6a]);
  K.done();
  // the flat is moved into the real building after it is built, so act targets are converted to world coordinates when used
  const wp=(x,z,y)=>grp.localToWorld(new THREE.Vector3(x,y==null?Y:y,z));
  INTERACT.push({x:ox+4.3,z:oz+20.2,r:1.6,label:'Put the kettle on',fn:()=>{const st=wp(ox+3.7,oz+21.25,Y+2.05),tg=wp(ox+3.9,oz+21.25);if(ACT.start('kettle',{steam:[st.x,st.y,st.z],tx:tg.x,tz:tg.z,reach:.95,whistle:true,onEnd:cx=>{if(!cx)toast('Tea','strong, with a slice of lemon — grandma would approve')}}))toast('Kitchen','the gas ring clicks, the kettle starts to whistle')}});
  const sinkJet=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.42,6),new THREE.MeshBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.7}));sinkJet.position.set(ox+7.1,Y+1.78,oz+21.32);sinkJet.visible=false;grp.add(sinkJet);
  INTERACT.push({x:ox+6.8,z:oz+20.2,r:1.0,label:'Wash your hands',fn:()=>{const tg=wp(ox+7.1,oz+21.4);if(ACT.start('wash',{tx:tg.x,tz:tg.z,reach:.72,ty:1.66,jetMesh:sinkJet,onEnd:cx=>{if(!cx)toast('Kitchen','cold water, as always')}}))toast('Kitchen','you turn the old mixer tap')}});
  INTERACT.push({x:ox+7.55,z:oz+20.2,r:.9,label:'Pour a glass of water',fn:()=>{const tg=wp(ox+7.1,oz+21.4);if(ACT.start('pour',{tx:tg.x,tz:tg.z,reach:.72,ty:1.66,jetMesh:sinkJet,item:'glass',onEnd:cx=>{if(!cx)toast('Cheers','tap water, cold and a little metallic')}}))toast('Kitchen','a glass under the tap')}});
  INTERACT.push({x:ox+2.9,z:oz+20.4,r:1.5,label:'Look at the preserves',fn:()=>toast('Pickles, tomatoes, beans','grandma\'s jars for the whole winter')});
  INTERACT.push({x:ox+2.6,z:oz+19.4,r:1.5,label:'Look at the wall carpet',fn:()=>toast('Ковёр на стене','red, with a diamond pattern — warm against the draught and a tradition')});
  INTERACT.push({x:ox+2.6,z:oz+13.1,r:1.5,label:'Check the clock',fn:()=>toast('23:58','two minutes to the New Year')});
  INTERACT.push({x:ox+8.8,z:oz+20.3,r:1.4,label:'Take a tangerine',fn:()=>toast('Tangerine','smells like New Year')})}

// ===================== cosy Soviet lounge (front-left room): wallpaper, carpet, armchairs, TV, tree figures =====================
function sovLounge(grp,ox,oz,Y){const K=svKit(grp,ox,oz,Y),{B,C,S,solid,place}=K;
  const wood='#7a4a24';
  // striped wallpaper, curtains and a night window
  svPanel(grp,'stripe',ox-10.88,Y+1.4,oz+5.5,10.6,2.8,Math.PI/2);
  svPanel(grp,'stripe',ox-8.875,Y+1.4,oz+10.88,3.85,2.8,Math.PI);svPanel(grp,'stripe',ox-3.175,Y+1.4,oz+10.88,3.75,2.8,Math.PI);
  svPanel(grp,'stripe',ox-9.05,Y+1.4,oz+.12,3.5,2.8,0);svPanel(grp,'stripe',ox-3.0,Y+1.4,oz+.12,3.4,2.8,0);                 // the south window (x -7.25…-4.75) stays clear
  svPanel(grp,'stripe',ox-1.36,Y+1.4,oz+1.15,1.9,2.8,-Math.PI/2);svPanel(grp,'stripe',ox-1.36,Y+1.4,oz+4.35,1.3,2.8,-Math.PI/2);svPanel(grp,'stripe',ox-1.36,Y+1.4,oz+8.9,3.8,2.8,-Math.PI/2);
  B(-10.82,1.7,5.5,.04,1.6,1.9,'#f4f2ea',9);B(-10.8,1.7,5.5,.03,1.4,1.7,'#9fb8d6',3);B(-10.78,1.7,5.5,.03,1.4,.05,'#f4f2ea',9);B(-10.78,1.7,5.5,.03,.05,1.7,'#f4f2ea',9);
  svPanel(grp,'curtain',ox-10.8,Y+1.4,oz+4.25,1.2,2.6,Math.PI/2,.9,1.2);svPanel(grp,'curtain',ox-10.8,Y+1.4,oz+6.75,1.2,2.6,Math.PI/2,.9,1.2);B(-10.78,2.75,5.5,.05,.06,3.2,'#6b4a2a',5);
  // big red rug and a runner of the same pattern
  svPanel(grp,'rug',ox-4.1,Y+.03,oz+3.9,5.2,3.4,0,5.2,3.4,true);
  // armchairs with patterned covers, a low table with champagne and tangerines
  const arm=(x,z,ry)=>place(x,z,ry,[[0,.4,0,1.3,.4,1.2,'#a8854f',1],[0,1.0,-.5,1.3,.9,.25,'#a8854f',1],[-.65,.7,0,.22,.7,1.2,'#8a6a3c',1],[.65,.7,0,.22,.7,1.2,'#8a6a3c',1],
    [0,.68,.05,1.0,.1,.9,'#c9a872',1],[-.5,.1,-.45,.1,.2,.1,wood,5],[.5,.1,-.45,.1,.2,.1,wood,5],[-.5,.1,.45,.1,.2,.1,wood,5],[.5,.1,.45,.1,.2,.1,wood,5]]);
  for(const z of [1.6,4.0])MDL.put(grp,'ArmChair_01',{x:ox-2.1,y:Y,z:oz+z,ry:-Math.PI/2,h:1.05});          // real upholstered armchairs (Poly Haven, CC0)
  solid(-2.1,1.6,.65,.7);solid(-2.1,4.0,.65,.7);
  B(-3.4,.42,2.95,.9,.05,1.0,wood,5);for(const [dx,dz] of [[-.38,-.43],[.38,-.43],[-.38,.43],[.38,.43]])B(-3.4+dx,.2,2.95+dz,.06,.4,.06,wood,5);B(-3.4,.14,2.95,.8,.04,.9,wood,5);solid(-3.4,2.95,.5,.55);
  for(const z of [2.7,2.95]){C(-3.55,.68,z,.08,.08,.5,'#1b3a22',1);C(-3.55,.97,z,.04,.04,.14,'#d4af37',6)}
  C(-3.2,.5,3.25,.3,.2,.1,'#d8dde0',1);for(const [x,z] of [[-3.28,3.2],[-3.1,3.3],[-3.2,3.2],[-3.14,3.14],[-3.26,3.32]])S(x,.62,z,.1,'#f08a1c');
  // floor lamp with a glowing shade
  C(-2.1,.03,6.3,.3,.3,.06,'#3a2a1a',6);C(-2.1,.95,6.3,.035,.035,1.8,'#3a2a1a',6);C(-2.1,1.95,6.3,.42,.28,.46,'#f6f0dc',3);
  // old TV on a wooden cabinet with a cat figurine, bentwood chair
  place(-3.4,10.45,Math.PI,[[0,.55,0,2.2,1.1,.8,wood,5],[0,.55,.41,2.0,.9,.02,'#5e3a1a',5],[-.9,.1,.3,.1,.2,.1,'#3a2410',5],[.9,.1,.3,.1,.2,.1,'#3a2410',5]]);solid(-3.4,10.45,1.1,.45);
  MDL.put(grp,'Television_01',{x:ox-3.4,y:Y+1.1,z:oz+10.45,ry:Math.PI,w:.95});                       // a real 80s CRT set (Poly Haven, CC0)  place(-5.4,9.7,Math.PI,[[0,.5,0,.5,.06,.5,'#5a3318',5],[0,1.0,-.24,.46,.8,.04,'#5a3318',5],[-.22,.25,-.22,.05,.5,.05,'#5a3318',5],[.22,.25,-.22,.05,.5,.05,'#5a3318',5],[-.22,.25,.22,.05,.5,.05,'#5a3318',5],[.22,.25,.22,.05,.5,.05,'#5a3318',5]]);
  // framed pictures: roses and an old family photo
  for(const [x,col] of [[-8.8,'#8a8a8a'],[-2.0,'#c98f5a']]){B(x,1.9,10.84,.7,.55,.04,'#3a2a1a',5);B(x,1.9,10.82,.6,.45,.03,col,9)}
  MDL.put(grp,'hanging_picture_frame_02',{x:ox-10.0,y:Y+1.65,z:oz+10.84,ry:Math.PI,w:.75});                  // a real framed painting with glass (Poly Haven, CC0)
  // the dining table: champagne, Olivier salad, tangerines, crystal bowls
  for(const x of [-5.1,-4.75]){C(x,1.1,7.7,.09,.09,.5,'#1b3a22',1);C(x,1.38,7.7,.04,.04,.14,'#d4af37',6)}
  C(-4.2,.91,8.3,.35,.25,.12,'#d8dde0',1);for(const [x,z] of [[-4.28,8.25],[-4.1,8.35],[-4.2,8.22],[-4.12,8.2],[-4.3,8.38]])S(x,1.03,z,.1,'#f08a1c');
  for(const [x,z] of [[-3.4,8.6],[-3.0,7.6],[-5.2,8.7]]){C(x,.91,z,.3,.2,.12,'#cfe6f0',1);C(x,.97,z,.24,.24,.04,'#f0e3b0',1)}
  // under the tree: wrapped gifts, a Ded Moroz and a Snegurochka (clear of the sofa and the north doorway)
  [[-6.9,8.8],[-7.7,10.2],[-9.1,10.3],[-8.8,5.7],[-7.6,6.0],[-9.9,6.3]].forEach(([x,z],k)=>{const a=k*.9;B(x,.2,z,.4+(k%3)*.1,.4,.4+(k%2)*.1,['#c0392b','#2a62b8','#e8b53a','#3f9a4a','#8a4ab0','#f4f4f0'][k],1,a);B(x,.2,z,.08,.42,.46,'#f4d03f',1,a)});
  for(const [x,z,coat,fur] of [[-10.1,8.9,'#c62828','#f4f1ea'],[-10.1,7.5,'#6fa8dc','#f4f1ea']]){C(x,.5,z,.26,.13,1.0,coat,1);C(x,.05,z,.27,.27,.1,fur,1);S(x,1.18,z,.15,'#f0c8a8');S(x,1.3,z,.17,coat,1,.7,1);C(x,1.0,z,.15,.15,.12,fur,1);if(coat==='#c62828')S(x,1.1,z+.1,.12,'#f4f1ea',1,1.3,.8)}
  // the cat watching the TV
  svCat(grp,ox-3.9,Y+.03,oz+5.3,.25,1.0);
  // dress the sofa-bed: backrest, arms, patterned cushions and a plaid; bentwood chairs round the dinner table
  B(-7.0,.95,5.2,.32,.95,4.2,'#c58f4f',1);B(-6.0,.95,3.25,2.2,.46,.3,'#c58f4f',1);B(-6.0,.95,7.15,2.2,.46,.3,'#c58f4f',1);
  [[3.9,'#a63c2a'],[4.95,'#e0b04a'],[6.0,'#2f7a7a']].forEach(([z,col],k)=>B(-6.62,1.05,z,.3,.62,.85,col,1,0,.18*(k-1)));
  svPanel(grp,'rug',ox-5.5,Y+.74,oz+5.2,1.5,1.9,.15,1.5,1.9,true);
  const chair=(x,z,ry)=>{place(x,z,ry,[[0,.5,0,.5,.06,.5,'#5a3318',5],[0,1.0,-.24,.46,.8,.04,'#5a3318',5],[-.22,.25,-.22,.05,.5,.05,'#5a3318',5],[.22,.25,-.22,.05,.5,.05,'#5a3318',5],[-.22,.25,.22,.05,.5,.05,'#5a3318',5],[.22,.25,.22,.05,.5,.05,'#5a3318',5],[0,.56,0,.44,.05,.44,'#a63c2a',1]]);solid(x,z,.3,.3)};
  chair(-3.4,9.7,Math.PI);chair(-3.9,6.3,0);chair(-2.1,8.0,-Math.PI/2);chair(-6.7,8.0,Math.PI/2);
  svGarland(grp,ox-10.5,Y+2.62,oz+10.7,ox-1.5,Y+2.62,oz+10.7,40,.35,[0xff2a1f,0x1fa8ff,0xffc61a,0x2dff6a]);
  svGarland(grp,ox-10.5,Y+2.62,oz+.3,ox-1.5,Y+2.62,oz+.3,40,.35,[0xff9a1f,0xff2a8a,0x1fe0ff,0xa8ff2a]);
  K.done();
  INTERACT.push({x:ox-3.4,z:oz+9.2,r:1.9,label:'Watch the TV',fn:()=>toast('«Голубой огонёк»','a New Year concert, 1987')});
  INTERACT.push({x:ox-3.4,z:oz+2.95,r:1.5,label:'Open the champagne',fn:()=>toast('Советское шампанское','pop! С Новым годом!')});
  INTERACT.push({x:ox-3.9,z:oz+5.3,r:1.4,label:'Pet the cat',fn:()=>toast('Мурр','the cat purrs and does not blink')});
  INTERACT.push({x:ox-9.2,z:oz+8.2,r:1.9,label:'Look at Ded Moroz',fn:()=>toast('Дед Мороз и Снегурочка','cotton-wool figures from the 70s')})}

// ===================== the stairwell: green-and-white walls, concrete flights, a green rail, three doors, an old lift =====================
function svStair(opt){
  const grp=new THREE.Group();scene.add(grp);const ox=INT_X+400,oz=INT_Z;
  const fl=Math.max(1,Math.min(10,Math.floor(Number(opt&&opt.floor)||1))),ent=Math.max(1,Math.floor(Number(opt&&opt.ent)||1));
  const floorY=(typeof HOME_Y0==='number'?HOME_Y0:0)+.52+(fl-1)*FLAT_FLOOR_HEIGHT;
  const staticWallStart=STATIC_WALLS.length,interactStart=INTERACT.length;
  const HW=3.8,Z0=-1,Z1=10,H=4.6,c=sRGB,GR='#3ea457',GD='#2b7a40',CON='#8d8c87',NOS='#a2472f',RAIL='#3f9a52';
  const mats={floor:new THREE.MeshStandardMaterial({color:0x6f675c,roughness:.7}),ceil:new THREE.MeshStandardMaterial({color:0xd9d5c8,roughness:.95}),wall:new THREE.MeshStandardMaterial({color:0xddd9cb,roughness:.9})};
  room(grp,ox,oz,-HW,HW,Z0,Z1,H,mats,{gaps:fl===1?[[0,HW,2.4]]:[]});
  const P=new PB(),B=(x,y,z,w,h,d,col,m,ry,rx)=>P.box(ox+x,INT_Y+y,oz+z,w,h,d,ry||0,c(col),m===undefined?9:m,rx||0),Cy=(x,y,z,r1,r2,len,col,m,rx,rz)=>svCyl(P,ox+x,INT_Y+y,oz+z,r1,r2,len,10,c(col),m===undefined?1:m,rx,rz,0);
  // two-tone walls: glossy green to 1.9 m, white above, a darker line between
  const band=(x,z,w,d)=>{B(x,.95,z,w,1.9,d,GR,1);B(x,1.93,z,w+(w>d?0:.01),.05,d+(w>d?.01:0),GD,1)};
  band(-3.69,4.5,.03,10.8);band(3.69,4.5,.03,10.8);band(0,9.89,7.4,.03);band(-2.45,-.89,2.5,.03);band(2.45,-.89,2.5,.03);
  // flight 1: concrete steps with red-brown nosings rising along the left wall; mid landing; flight 2 doubling back above it
  for(let i=0;i<12;i++){const zc=1.6+i*.4+.2,top=(i+1)*.2;B(-2.5,top/2,zc,2.6,top,.4,CON);B(-2.5,top-.035,zc-.15,2.6,.07,.12,NOS)}
  B(-1.7,2.3,8.2,4.2,.2,3.6,CON);
  for(let j=0;j<10;j++){const zc=6.2-j*.4,top=2.4+(j+1)*.2;B(-.4,top-.11,zc,1.6,.22,.4,CON);B(-.4,top-.035,zc+.15,1.6,.07,.12,NOS)}
  B(-.4,3.36,4.4,1.6,.28,Math.hypot(3.6,1.8)+.7,'#7d7c77',9,0,Math.atan2(.2,.4));                    // solid underside of the second flight
  B(-1.7,H-.1,3.0,4.2,.2,4.0,'#e9e6dc');
  // handrails and rods (green painted steel)
  const slope=Math.atan2(.2,.4),rl=Math.hypot(.4,.2);
  for(let i=0;i<12;i++){const zc=1.8+i*.4,top=(i+1)*.2;B(-1.2,top+.5,zc,.035,.9,.035,RAIL,1)}
  B(-1.2,1.65,4.0,.07,.07,Math.hypot(4.4,2.2),RAIL,1,0,-slope);
  for(let j=0;j<6;j++){const zc=6.2-j*.4,top=2.4+(j+1)*.2;B(.4,top+.5,zc,.035,.9,.035,RAIL,1)}
  B(.4,3.9,5.0,.07,.07,Math.hypot(2.4,1.2),RAIL,1,0,slope);
  for(let k=0;k<6;k++)B(.4,2.9,6.6+k*.6,.035,.9,.035,RAIL,1);B(.4,3.4,8.2,.07,.07,3.6,RAIL,1);
  // window on the landing, a radiator under it and a pipe
  B(-1.7,3.5,9.9,2.1,1.4,.08,'#f4f2ea');B(-1.7,3.5,9.88,1.9,1.2,.05,'#d6ecc4',3);B(-1.7,3.5,9.86,.05,1.2,.06,'#f4f2ea');B(-1.7,3.5,9.86,1.9,.05,.06,'#f4f2ea');B(-1.7,3.0,9.8,2.3,.06,.2,'#bfbfb8');
  B(-3.6,2.2,9.7,.14,4.4,.14,'#d8d8cc',6);
  // right wall: mailboxes, floor sign, three flat doors (nearest the stairs / opposite the rail / on the small landing), electric panel
  B(3.6,1.6,.65,.1,1.2,1.2,'#4d6a86',1);for(let r=0;r<3;r++)for(let k=0;k<3;k++)B(3.54,1.2+r*.4,.25+k*.4,.03,.3,.34,'#3a526a',1);
  const sign=plateMesh(['ПІД\'ЇЗД '+ent+' · ПОВЕРХ '+fl],{w:512,h:96,size:44,color:'#fff',bg:'#2a4a6a'},1.6,.3);sign.position.set(ox+3.62,INT_Y+2.7,oz+.65);sign.rotation.y=-Math.PI/2;grp.add(sign);
  B(2.75,.015,8.5,2.1,.03,3.0,'#7c7266');B(2.75,.03,7.0,2.1,.03,.06,'#c9c2b0');                                      // small landing: darker tile and a threshold line
  const doors=[[2.4,1],[5.4,2],[8.4,3]];
  for(const [z,n] of doors){B(3.64,1.45,z,.14,2.9,1.7,'#2e2420',5);B(3.58,1.4,z,.1,2.8,1.5,'#4b2f22',5);B(3.52,1.4,z-.35,.03,2.2,.5,'#5a3a2a',5);B(3.52,1.4,z+.35,.03,2.2,.5,'#5a3a2a',5);
    B(3.5,1.4,z+.55,.04,.5,.14,'#c9ccd0',6);B(3.48,1.3,z+.58,.05,.4,.05,'#c9ccd0',6);Cy(3.5,1.9,z,.03,.03,.04,'#b0b4b8',6,0,Math.PI/2);B(2.9,.015,z,1.0,.02,1.2,'#5a4a3a');
    const pl=plateMesh(['КВ. '+n],{w:128,h:64,size:34,color:'#fff',bg:'#2a4a6a'},.5,.25);pl.position.set(ox+3.6,INT_Y+3.25,oz+z);pl.rotation.y=-Math.PI/2;grp.add(pl);
    INTERACT.push({x:ox+2.9,z:oz+z,r:1.7,label:'Open Flat '+n,cond:()=>grp.visible,fn:()=>PORTAL.enter('flat',null,{ent:PORTAL.opt.ent,floor:fl,unit:n})})}
  B(3.62,2.0,7.0,.12,1.0,.7,'#9aa0a2',1);B(3.55,2.0,7.0,.03,.9,.6,'#868c8e',1);B(3.55,2.35,6.8,.03,.05,.05,'#e8c040',3);
  // the old lift on the back wall: dark green-grey sliding doors with little windows, a call button and a floor indicator
  B(2.75,1.5,9.9,2.0,3.0,.12,'#3b3f3c',5);B(2.35,1.4,9.82,.88,2.8,.06,'#6f7b73',6);B(3.15,1.4,9.82,.88,2.8,.06,'#6f7b73',6);B(2.35,1.9,9.78,.26,.6,.02,'#202a2e',2);B(3.15,1.9,9.78,.26,.6,.02,'#202a2e',2);
  B(3.85-.2,1.3,9.8,.08,.14,.05,'#f0a030',3);B(2.75,3.15,9.8,.5,.2,.04,'#1a1a1a',1);B(2.75,3.15,9.77,.3,.08,.02,'#ff4a2a',3);
  const ls=plateMesh(['ЛІФТ'],{w:128,h:64,size:36,color:'#fff',bg:'#2a4a6a'},.6,.3);ls.position.set(ox+2.75,INT_Y+3.55,oz+9.84);ls.rotation.y=Math.PI;grp.add(ls);
  const lift=$('liftUI');if(!lift.dataset.ok){lift.dataset.ok=1;const L=$('liftBtns');for(let f=1;f<=10;f++){const b=document.createElement('button');b.textContent=f;b.onclick=()=>{lift.hidden=true;if(window.AUD)AUD.beep();PORTAL.go('stair',{ent:PORTAL.opt.ent,floor:f,floors:PORTAL.opt.floors,style:PORTAL.opt.style,home:PORTAL.opt.home})};L.appendChild(b)}$('liftClose').onclick=()=>{lift.hidden=true}}
  INTERACT.push({x:ox+2.75,z:oz+8.9,r:1.6,label:'Call the old lift',fn:()=>{const mf=(PORTAL.opt&&PORTAL.opt.floors)||10;[...$('liftBtns').children].forEach((b,i)=>{b.style.display=i<mf?'':'none'});lift.hidden=false}});
  // ceiling lamps (old frosted globes) and the stairs / exit interactions
  for(const [x,z] of [[1.6,3.0],[1.6,8.0],[-1.7,8.2]])Cy(x,H-.2,z,.3,.3,.35,'#f4f0e0',3);
  if(fl===1)INTERACT.push({x:ox,z:oz+.5,r:1.5,label:'Go out to the yard',fn:()=>PORTAL.exit()});
  if(fl===1){let leaving=0;ANIM.push(()=>{if(!grp.visible||PORTAL.cur!=='stair'||leaving)return;if(player.z<oz+.1&&Math.abs(player.x-ox)<3.6&&!RIDE.on){leaving=1;PORTAL.exit();setTimeout(()=>{leaving=0},1800)}})}   // walk out through the entrance door
  INTERACT.push({x:ox+1.0,z:oz+3.0,r:1.5,label:'Climb the stairs',cond:()=>fl<((PORTAL.opt&&PORTAL.opt.floors)||10),fn:()=>PORTAL.go('stair',{ent,floor:fl+1})});   // a five-storey block stops at five (opt.floors)
  if(fl>1)INTERACT.push({x:ox-1.3,z:oz+.8,r:1.5,label:'Go down the stairs',fn:()=>PORTAL.go('stair',{ent,floor:fl-1})});
  addWall(ox-2.5,oz+5.8,2.6,8.4,0,INT_Y-1,INT_Y+5.5);addWall(ox-.4,oz+6.5,1.6,7.0,0,INT_Y-1,INT_Y+5.5);
  const pg=P.build();if(pg)grp.add(new THREE.Mesh(pg,MATS.props));
  const l1=new THREE.PointLight(0xfff0d0,0,13,1.5),l2=new THREE.PointLight(0xfff0d0,0,13,1.5);l1.position.set(ox+1.5,INT_Y+H-.9,oz+3);l2.position.set(ox+1.2,INT_Y+H-.9,oz+8);l1.userData.i=.9;l2.userData.i=.75;grp.add(l1,l2);
  SPECIAL.push((x,z)=>{if(!grp.visible)return null;const p=grp.worldToLocal(new THREE.Vector3(x,0,z));return Math.abs(p.x-ox)<=HW+.1&&p.z>=oz-2&&p.z<=oz+Z1+1?{h:floorY,pri:10,surf:'stone'}:null});
  grp.position.y=floorY;grp.updateMatrixWorld(true);
  const staticWalls=[];for(let i=staticWallStart;i<STATIC_WALLS.length;i++){const w=STATIC_WALLS[i];w.y0+=floorY;w.y1+=floorY;staticWalls.push([w,w.hw,w.hd])}
  for(let i=interactStart;i<INTERACT.length;i++){const it=INTERACT[i],prior=it.cond;it.y=it.y===undefined?floorY:it.y;it.cond=()=>grp.visible&&(!prior||prior())}
  grp.userData.interiorCollision={lowObbs:[],staticWalls};setInteriorGroupVisible(grp,false);
  INDOORS.push({name:'stair',title:'Stairwell',sub:'',floor:'stone',exp:.7,lights:[l1,l2],test:(x,z)=>x>ox-HW&&x<ox+HW&&z>oz+Z0&&z<oz+Z1+1,ceil:()=>floorY+H-.3});
  grp.visible=false;return {grp,spawn:[ox+1.8,oz+2.0],spawnY:floorY,spawnYaw:0,title:'Stairwell',sub:'old lift · floor '+fl,peds:[],onEnter(){PORTAL.peds=[]}}}

// ===================== the big New Year tree in the middle of Derybasivska =====================
function svTree(grp,P){
  const d=LMK.deriba,L=Math.hypot(d.x1-d.x0,d.y1-d.y0),tx=(d.x1-d.x0)/L,tz=(d.y1-d.y0)/L,nx=-tz,nz=tx,x=d.x0+tx*L*.5,z=d.y0+tz*L*.5,y=groundH(x,z),R=rng(2025),TAU=6.2832;
  const tiers=9,base=y+2.2,tierH=2.3,rad=k=>7.4-k*.78;
  const lin=h=>new THREE.Color(h).convertSRGBToLinear();
  const green=new THREE.MeshStandardMaterial({color:lin(0x145a30),roughness:.92});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.6,.8,3.2,10),new THREE.MeshStandardMaterial({color:lin(0x5a3a22),roughness:.9}));trunk.position.set(x,y+1.6,z);grp.add(trunk);
  for(let k=0;k<tiers;k++){const m=new THREE.Mesh(new THREE.ConeGeometry(rad(k),tierH*1.9,22),green);m.position.set(x,base+k*tierH+tierH*.95,z);m.castShadow=true;grp.add(m)}
  const top=base+tiers*tierH+.4,env=t=>rad(0)*(1-t)+.5;                           // envelope radius from the base (t=0) to the tip (t=1)
  // glossy baubles on the tiers
  const pal=[0xd32f2f,0xf2c21b,0x2a62b8,0xf4f4f4,0x2fa84f,0xb04ad0],bg=new THREE.SphereGeometry(.36,10,8),bm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.22,metalness:.6});
  const balls=new THREE.InstancedMesh(bg,bm,260),dm=new THREE.Object3D(),col=new THREE.Color();
  for(let i=0;i<260;i++){const t=.04+R()*.88,a=R()*TAU,r=env(t)*.98;dm.position.set(x+Math.cos(a)*r,base+t*(top-base),z+Math.sin(a)*r);dm.scale.setScalar(.7+R()*.7);dm.updateMatrix();balls.setMatrixAt(i,dm.matrix);balls.setColorAt(i,col.setHex(pal[i%pal.length]))}
  balls.frustumCulled=false;grp.add(balls);
  // two garlands of little lights spiralling up (alternating groups blink) and a tinsel rope along each
  const lg=new THREE.SphereGeometry(.23,6,5),lc=[0xff2a1f,0x1fa8ff,0xffc61a,0x2dff6a],groups=[[],[]],lm=lc.map(h=>new THREE.MeshStandardMaterial({color:0x111111,emissive:h,emissiveIntensity:.8,roughness:.3}));
  const bulbs=lc.map((h,i)=>{const m=new THREE.InstancedMesh(lg,lm[i],130);m.frustumCulled=false;grp.add(m);groups[i%2].push(m);return m}),cnt=[0,0,0,0];
  const spiral=(ph,turns)=>{const pts=[];for(let i=0;i<=200;i++){const t=i/200,a=ph+t*turns*TAU,r=env(t*.96+.02)*1.02;pts.push(new THREE.Vector3(x+Math.cos(a)*r,base+(t*.96+.02)*(top-base),z+Math.sin(a)*r))}return pts};
  for(const [ph,turns] of [[0,9],[3.1,7]]){const pts=spiral(ph,turns);
    const rope=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),240,.07,5,false),new THREE.MeshStandardMaterial({color:0xd9b24a,roughness:.35,metalness:.7}));rope.frustumCulled=false;grp.add(rope);
    pts.forEach((p,i)=>{if(i%2)return;const g=(i/2)%4;if(cnt[g]>=130)return;dm.position.copy(p);dm.scale.setScalar(1);dm.updateMatrix();bulbs[g].setMatrixAt(cnt[g]++,dm.matrix)})}
  bulbs.forEach((m,i)=>{m.count=cnt[i];m.instanceMatrix.needsUpdate=true});
  let bt=0;ANIM.push(dt=>{bt+=dt;const on=Math.floor(bt/.7)%2;groups[0].forEach(m=>m.visible=!!on);groups[1].forEach(m=>m.visible=!on)});
  // the star on top
  {const sh=new THREE.Shape();for(let i=0;i<10;i++){const r=i%2?.7:1.7,a=i/10*TAU+Math.PI/2;i?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r)}sh.closePath();
   const sm=new THREE.MeshStandardMaterial({color:0xffd24a,emissive:0xffb400,emissiveIntensity:1.3,roughness:.3,metalness:.4}),st=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:false}),sm);
   st.position.set(x-tx*.25,top+1.5,z-tz*.25);st.rotation.y=Math.atan2(tx,tz);grp.add(st)}
  // presents round the foot, a Ded Moroz and a Snegurochka (about three metres tall), two posts with greeting boards
  const gc=['#c0392b','#2a62b8','#e8b53a','#3f9a4a','#8a4ab0','#f4f4f0','#e07a2a','#2f9ea0'].map(sRGB),rb=sRGB('#f4d03f');
  for(let k=0;k<14;k++){const a=k/14*TAU+.2,r=8.3+(k%3)*.9,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,w=.9+R()*.9,hh=.7+R()*.8,py=groundH(px,pz);P.box(px,py+hh/2,pz,w,hh,w,a,gc[k%8],1);P.box(px,py+hh/2,pz,.14,hh+.02,w+.04,a,rb,1);P.box(px,py+hh/2,pz,w+.04,hh+.02,.14,a,rb,1)}
  const fig=(ox2,oz2,coat,fur)=>{const g=new THREE.Group(),m=h=>new THREE.MeshStandardMaterial({color:h,roughness:.7});
    const body=new THREE.Mesh(new THREE.ConeGeometry(.9,2.5,12),m(coat));body.position.y=1.25;g.add(body);const hem=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.25,12),m(fur));hem.position.y=.12;g.add(hem);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),m(0xf0c8a8));head.position.y=2.75;g.add(head);const cap=new THREE.Mesh(new THREE.ConeGeometry(.42,.7,10),m(coat));cap.position.y=3.2;g.add(cap);
    if(coat===0xc62828){const bd=new THREE.Mesh(new THREE.SphereGeometry(.34,8,6),m(fur));bd.scale.set(1,1.3,.7);bd.position.set(0,2.5,.18);g.add(bd)}
    g.position.set(ox2,groundH(ox2,oz2),oz2);g.rotation.y=Math.atan2(nx,nz);grp.add(g)};
  fig(x+nx*10.5+tx*2,z+nz*10.5+tz*2,0xc62828,0xf4f1ea);fig(x+nx*10.5-tx*1.5,z+nz*10.5-tz*1.5,0x6fa8dc,0xf4f1ea);
  for(const s of [-1,1]){const px=x+tx*s*10.5,pz=z+tz*s*10.5,py=groundH(px,pz);for(const o of [-3,3])P.box(px+nx*o,py+2,pz+nz*o,.22,4,.22,0,sRGB('#3a2a1a'),5);
    const bd=plateMesh(['З НОВИМ РОКОМ!','С НОВЫМ ГОДОМ!'],{w:1024,h:256,size:100,color:'#ffe9a8',bg:'#7a1220',weight:'800'},6.4,1.6,.7);bd.position.set(px,py+3.4,pz);bd.rotation.y=Math.atan2(tx*s,tz*s);grp.add(bd)}
  for(const [dx,dy,dz,r] of [[3.5,6,0,6],[-3.5,10,0,6],[0,16,0,7],[0,3,3.5,6],[0,3,-3.5,6]])EXTRA_LAMPS.push([x+dx,y+dy,z+dz,r]);
  STATIC_CIR.push(x,z,7.6);
  INTERACT.push({x,z,y,r:11,label:'Look at the New Year tree',fn:()=>toast('З Новим роком!','the big tree on Derybasivska is lit')})}

function installSoviet(grp,G,P,Sg,GR){
  INTERIORS.stair=svStair;
  try{svTree(grp,P)}catch(e){console.error('[soviet] tree',e)}}
