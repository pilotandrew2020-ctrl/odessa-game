/* ===================================================================================================
   parks.js — shared kit for the two big parks (Shevchenko Park, Gorky / Mark Twain Park)

   • footpaths from the real OSM geometry (pkdata.js) laid as paver strips that follow the terrain, with granite kerbs
   • orange wooden benches on black cast-iron frames, black lamp posts with white globes, litter bins, iron fences, pergolas
   • tree rows along the alleys (plane trees, spruces, thujas, willows), water with ripples, animated fountain jets, ground mist
   • merged-geometry helpers for animated rides (pkMerge / pkBox / pkCyl / pkBeam …)
   Loaded BEFORE the main script (classic script); it only touches game globals when a builder is called.
   =================================================================================================== */

const PK={nB:0,nL:0,grid:null,tex:{}};
const PKC={iron:'#17181a',orange:'#d4691a',pave:'#8e8c84',kerb:'#5d6064',white:'#f3f0e7',globe:'#fff6dc',wood:'#7a5230',stone:'#b9b4a6',bronze:'#3f4b42'};

// ---------- small maths helpers ----------
function pkInPoly(poly,x,z){return pipPoly(poly,x,z)}
function pkDistSeg(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz;const t=L<1e-9?0:Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/L));return Math.hypot(px-(ax+dx*t),pz-(az+dz*t))}
function pkPolyArea(poly){let s=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function pkSmooth(a,b,t){t=Math.max(0,Math.min(1,(t-a)/(b-a)));return t*t*(3-2*t)}

// ---------- terrain-following ground strip with a small lift per layer (no z-fight between layers) ----------
function pkQuad(G,ps,kind,rot,lift){
  const at=()=>({aK:[kind,rot||0],aR:[0,0,0,0],aU:0});
  const L1=Math.hypot(ps[1][0]-ps[0][0],ps[1][1]-ps[0][1]),L2=Math.hypot(ps[3][0]-ps[0][0],ps[3][1]-ps[0][1]);
  const nu=Math.max(1,Math.min(8,Math.ceil(L1/3.5))),nv=Math.max(1,Math.min(40,Math.ceil(L2/3)));
  const Pt=(a,b)=>{const t=a/nu,u=b/nv;const x0=ps[0][0]+(ps[1][0]-ps[0][0])*t,z0=ps[0][1]+(ps[1][1]-ps[0][1])*t,x1=ps[3][0]+(ps[2][0]-ps[3][0])*t,z1=ps[3][1]+(ps[2][1]-ps[3][1])*t;
    const x=x0+(x1-x0)*u,z=z0+(z1-z0)*u;const h=groundH(x,z),e=2.2;const sl=Math.hypot(groundH(x+e,z)-groundH(x-e,z),groundH(x,z+e)-groundH(x,z-e))/(2*e);return [x,h+.06+(lift||0)+Math.min(.16,sl*.3),z]};
  for(let a=0;a<nu;a++)for(let b=0;b<nv;b++)quadN(G,[Pt(a,b),Pt(a+1,b),Pt(a+1,b+1),Pt(a,b+1)],[0,1,0],at)}
// a convex-ish ring/disc of ground (fan of strips) around (x,z)
function pkDisc(G,x,z,r0,r1,kind,lift,seg,rot){seg=seg||24;for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
  pkQuad(G,[[x+c0*r0,z+s0*r0],[x+c0*r1,z+s0*r1],[x+c1*r1,z+s1*r1],[x+c1*r0,z+s1*r0]],kind,rot===undefined?a0:rot,lift)}}
function pkRect(G,x,z,w,d,ry,kind,lift,rot){const c=Math.cos(ry),s=Math.sin(ry);const at=(u,v)=>[x+u*c-v*s,z+u*s+v*c];pkQuad(G,[at(-w/2,-d/2),at(w/2,-d/2),at(w/2,d/2),at(-w/2,d/2)],kind,rot===undefined?ry:rot,lift)}

// ---------- street furniture ----------
function pkGlobe(P,x,y,z,r,col){col=col||sRGB(PKC.globe);P.cyl(x,y,z,r*.5,r*.92,r*.4,10,col,3);P.cyl(x,y+r*.4,z,r*.92,r,r*.55,10,col,3);P.cyl(x,y+r*.95,z,r,r*.55,r*.5,10,col,3);P.cyl(x,y+r*1.45,z,r*.55,r*.12,r*.18,10,col,3)}
function pkLamp(P,x,y,z,n,ry){
  const iron=sRGB(PKC.iron);n=n||1;ry=ry||0;
  P.cyl(x,y,z,.24,.15,.42,8,iron,1);P.cyl(x,y+.42,z,.15,.1,.5,8,iron,1);P.cyl(x,y+.9,z,.085,.065,2.75,8,iron,1);P.cyl(x,y+3.62,z,.11,.09,.1,8,iron,1);
  if(n===1){pkGlobe(P,x,y+3.7,z,.27)}
  else for(let k=0;k<n;k++){const an=ry+k/n*6.2832+(n===2?0:0),ex=Math.cos(an)*.62,ez=Math.sin(an)*.62;
    P.box(x+ex*.5,y+3.52,z+ez*.5,.62,.05,.05,-an,iron,1);P.cyl(x+ex,y+3.5,z+ez,.05,.04,.18,6,iron,1);pkGlobe(P,x+ex,y+3.66,z+ez,.23)}
  if(n>1)pkGlobe(P,x,y+3.76,z,.23);
  EXTRA_LAMPS.push([x,y+3.9,z,2.4]);STATIC_CIR.push(x,z,.22);PK.nL++}
function pkBench(P,x,y,z,ry,noCol){
  const c=Math.cos(ry),s=Math.sin(ry),at=(u,v)=>[x+u*c+v*s,z-u*s+v*c];const iron=sRGB(PKC.iron),or=sRGB(PKC.orange);
  for(const u of [-.86,.86]){let p=at(u,.02);P.box(p[0],y+.23,p[1],.07,.46,.54,ry,iron,1);p=at(u,-.25);P.box(p[0],y+.64,p[1],.07,.5,.06,ry,iron,1,-.2);p=at(u,.05);P.box(p[0],y+.68,p[1],.07,.05,.5,ry,iron,1)}
  for(const v of [-.17,-.03,.11,.25]){const p=at(0,v);P.box(p[0],y+.46,p[1],1.9,.035,.11,ry,or,5)}
  for(const h of [.6,.74,.88]){const p=at(0,-.24-(h-.6)*.2);P.box(p[0],y+h,p[1],1.9,.1,.03,ry,or,5,-.2)}
  if(!noCol)LOW_OBB.push(x,z,.95,.3,c,-s);PK.nB++}
function pkBin(P,x,y,z,ry){const iron=sRGB(PKC.iron),g=sRGB('#4b5a52');P.cyl(x,y,z,.26,.22,.78,10,g,1);P.cyl(x,y+.78,z,.3,.3,.07,10,iron,1);P.box(x,y+.12,z,.1,.2,.5,ry||0,iron,1);STATIC_CIR.push(x,z,.3)}
function pkFence(P,pts,o){o=o||{};const h=o.h||.9,col=sRGB(o.col||PKC.iron),step=o.step||.5,closed=!!o.closed;const n=pts.length;
  for(let i=0;i<(closed?n:n-1);i++){const a=pts[i],b=pts[(i+1)%n];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.05)continue;const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const gy=(a2,b2)=>groundH(a2,b2);
    const k=Math.max(1,Math.round(L/step));for(let j=0;j<=k;j++){const t=j/k,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;if(j===k&&i<(closed?n:n-1)-1&&!closed)continue;const y=gy(x,z);const post=j%4===0;
      P.box(x,y+h/2,z,post?.07:.025,h,post?.07:.025,0,col,1);if(post)P.cyl(x,y+h,z,.055,.0,.12,6,col,1)}
    const ms=Math.max(1,Math.ceil(L/3));for(let j=0;j<ms;j++){const t0=j/ms,t1=(j+1)/ms,x0=a[0]+(b[0]-a[0])*t0,z0=a[1]+(b[1]-a[1])*t0,x1=a[0]+(b[0]-a[0])*t1,z1=a[1]+(b[1]-a[1])*t1;
      const mx=(x0+x1)/2,mz=(z0+z1)/2,ml=Math.hypot(x1-x0,z1-z0),y0=gy(x0,z0),y1=gy(x1,z1),slope=Math.atan2(y1-y0,ml);
      P.box(mx,gy(mx,mz)+h-.06,mz,ml,.045,.045,-ang,col,1,0);P.box(mx,gy(mx,mz)+.2,mz,ml,.04,.04,-ang,col,1,0)}}}
// pergola arch: two columns joined by slats
function pkPergola(P,x,z,ry,w,d,h,col){col=col||sRGB(PKC.white);const c=Math.cos(ry),s=Math.sin(ry),at=(u,v)=>[x+u*c-v*s,z+u*s+v*c];const y=groundH(x,z);
  for(const u of [-w/2,w/2])for(const v of [-d/2,d/2]){const p=at(u,v);P.box(p[0],groundH(p[0],p[1])+h/2,p[1],.28,h,.28,ry,col,0)}
  for(const v of [-d/2,d/2]){const p=at(0,v);P.box(p[0],y+h+.12,p[1],w+.8,.24,.24,ry,col,0)}
  for(let u=-w/2-.3;u<=w/2+.3;u+=.55){const p=at(u,0);P.box(p[0],y+h+.34,p[1],.14,.14,d+.8,ry,col,5)}}

// ---------- tree density inside the parks: the base map's per-chunk trees get a floor from here (groves and open lawns) ----------
const PK_ZONES=[];
function pkNoise(x,z,s){const gx=Math.floor(x/s),gz=Math.floor(z/s),fx=x/s-gx,fz=z/s-gz;const a=hashf(gx,gz),b=hashf(gx+1,gz),c=hashf(gx,gz+1),d=hashf(gx+1,gz+1);const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function PK_DENS(x,z){for(const zn of PK_ZONES){if(x<zn.x0||x>zn.x1||z<zn.z0||z>zn.z1)continue;if(!pkInPoly(zn.poly,x,z))continue;return zn.fn(pkNoise(x,z,70)*.6+pkNoise(x+99,z-40,28)*.4,x,z)}return 0}
function pkZone(poly,fn){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of poly){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}PK_ZONES.push({poly,x0,x1,z0,z1,fn})}
// ---------- tree helpers ----------
function pkTree(x,z,sp,sc){EXTRA_TREES.push([x,z,sp,sc||1])}
function pkTreeRing(x,z,r,n,sp,sc0,rnd){for(let i=0;i<n;i++){const a=i/n*6.2832+rnd()*.2;pkTree(x+Math.cos(a)*r,z+Math.sin(a)*r,sp,(sc0||1)*(.9+rnd()*.25))}}
// ---------- merged-geometry helpers (rides, statues) ----------
function pkM(x,y,z,rx,ry,rz,sx,sy,sz){const m=new THREE.Matrix4();m.compose(new THREE.Vector3(x||0,y||0,z||0),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0,'YXZ')),new THREE.Vector3(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz));return m}
function pkBox(w,h,d,x,y,z,hex,rx,ry,rz){return {g:new THREE.BoxGeometry(w,h,d),m:pkM(x,y,z,rx,ry,rz),c:sRGB(hex)}}
function pkCyl(r1,r2,h,seg,x,y,z,hex,rx,ry,rz){return {g:new THREE.CylinderGeometry(r2,r1,h,seg||10),m:pkM(x,y,z,rx,ry,rz),c:sRGB(hex)}}
function pkSph(r,x,y,z,hex,sx,sy,sz){return {g:new THREE.SphereGeometry(r,12,9),m:pkM(x,y,z,0,0,0,sx,sy,sz),c:sRGB(hex)}}
function pkTor(R,t,x,y,z,hex,rx,ry,rz,arc){return {g:new THREE.TorusGeometry(R,t,6,Math.max(12,Math.round(R*5)),arc||6.2832),m:pkM(x,y,z,rx,ry,rz),c:sRGB(hex)}}
function pkBeam(a,b,th,hex,th2){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),L=d.length();const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  const m=new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(1,1,1));return {g:new THREE.BoxGeometry(th,L,th2||th),m,c:sRGB(hex)}}
function pkMerge(parts){const pos=[],nor=[],col=[];const v=new THREE.Vector3(),n=new THREE.Vector3(),nm=new THREE.Matrix3();
  for(const p of parts){const g=p.g.index?p.g.toNonIndexed():p.g;const pa=g.attributes.position,na=g.attributes.normal;const m=p.m||new THREE.Matrix4();nm.getNormalMatrix(m);
    for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(m);n.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();pos.push(v.x,v.y,v.z);nor.push(n.x,n.y,n.z);col.push(p.c[0],p.c[1],p.c[2])}if(g!==p.g)g.dispose();p.g.dispose()}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));G.setAttribute('color',new THREE.Float32BufferAttribute(col,3));G.computeBoundingSphere();return G}
let PK_MAT=null,PK_MAT_GLOW=null;
function pkMat(){return PK_MAT||(PK_MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.18}))}
function pkMatGlow(){return PK_MAT_GLOW||(PK_MAT_GLOW=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}))}
function pkMesh(parts,glow){const m=new THREE.Mesh(pkMerge(parts),glow?pkMatGlow():pkMat());m.castShadow=!glow;m.receiveShadow=!glow;return m}

// ---------- textures ----------
function pkTex(name,mk){return PK.tex[name]||(PK.tex[name]=mk())}
function pkRippleTex(){return pkTex('ripple',()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');const r=mkRand(77);x.clearRect(0,0,256,256);
  for(let i=0;i<150;i++){const px=r()*256,py=r()*256,w=6+r()*22,h=1+r()*2.4;for(const ox of [-256,0,256])for(const oy of [-256,0,256]){x.fillStyle='rgba(255,255,255,'+(.10+r()*.28)+')';x.beginPath();x.ellipse(px+ox,py+oy,w,h,0,0,6.283);x.fill()}}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t})}
function pkStreakTex(){return pkTex('streak',()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=128;const x=cv.getContext('2d');const r=mkRand(5);x.clearRect(0,0,64,128);
  for(let i=0;i<46;i++){const px=r()*64,w=1+r()*3,y0=r()*128,len=14+r()*50;const g=x.createLinearGradient(0,y0,0,y0+len);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,'+(.5+r()*.5)+')');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;
    for(const oy of [-128,0,128])x.fillRect(px,y0+oy,w,len)}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;return t})}
function pkMistTex(){return pkTex('mist',()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.45,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  const r=mkRand(9);for(let i=0;i<30;i++){const px=r()*128,py=r()*128,rr=10+r()*28;const gg=x.createRadialGradient(px,py,0,px,py,rr);gg.addColorStop(0,'rgba(255,255,255,'+(.18+r()*.2)+')');gg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gg;x.fillRect(px-rr,py-rr,rr*2,rr*2)}
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t})}

// ---------- water: a surface for a polygon, with scrolling ripples ----------
let PK_WATER=null;
function pkWaterMats(){if(PK_WATER)return PK_WATER;
  const base=new THREE.MeshStandardMaterial({color:sRGBc('#1b5560'),roughness:.16,metalness:.05,transparent:true,opacity:.95,envMapIntensity:.55});
  const rip=new THREE.MeshBasicMaterial({map:pkRippleTex(),transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending,color:0x9fd2dc});
  ANIM.push(dt=>{const t=pkRippleTex();t.offset.x+=dt*.004;t.offset.y+=dt*.0027});
  return PK_WATER={base,rip}}
// poly: [[x,z]...]; shape given in world coords, y = surface level
function pkWaterMesh(grp,poly,y,reps){const W=pkWaterMats();const sh=new THREE.Shape();poly.forEach((p,i)=>{if(i)sh.lineTo(p[0],-p[1]);else sh.moveTo(p[0],-p[1])});
  const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,W.base);m.position.y=y;m.receiveShadow=true;m.userData.dyn=true;m.renderOrder=2;grp.add(m);
  const g2=g.clone();const uv=g2.attributes.uv;const pa=g2.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,pa.getX(i)*(reps||.09),pa.getZ(i)*(reps||.09));
  const o=new THREE.Mesh(g2,W.rip);o.position.y=y+.012;o.userData.dyn=true;o.renderOrder=3;grp.add(o);return m}
function pkWaterDisc(grp,x,z,r,y){const poly=[];for(let i=0;i<40;i++){const a=i/40*6.2832;poly.push([x+Math.cos(a)*r,z+Math.sin(a)*r])}return pkWaterMesh(grp,poly,y)}

// ---------- water jets: parabolic tubes with a scrolling streak texture ----------
let PK_JETMAT=null;
function pkJetMat(){if(PK_JETMAT)return PK_JETMAT;const t=pkStreakTex();PK_JETMAT=new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide,color:0xf2fbff,blending:THREE.NormalBlending,fog:true});
  ANIM.push(dt=>{t.offset.y-=dt*1.7});return PK_JETMAT}
// one jet from (x,y,z) going up by H and landing `reach` away in direction (dx,dz): two crossed ribbons with a scrolling streak texture
function pkJet(grp,x,y,z,H,reach,dx,dz,r0){const N=14,pos=[],uv=[],idx=[];r0=r0||.07;
  const ax1=reach<.01?[1,0,0]:[-dz,0,dx],ax2=reach<.01?[0,0,1]:[0,1,0];
  for(const ax of [ax1,ax2]){const base=pos.length/3;
    for(let i=0;i<=N;i++){const t=i/N,px=x+dx*reach*t,pz=z+dz*reach*t,py=y+4*H*t*(1-t);const rad=r0*(1.5+1.6*t*t)*(reach<.01?1.5*(1-.4*t):1);
      pos.push(px-ax[0]*rad,py-ax[1]*rad,pz-ax[2]*rad,px+ax[0]*rad,py+ax[1]*rad,pz+ax[2]*rad);const v=t*Math.max(1.2,(H+reach)*.6);uv.push(0,v,1,v)}
    for(let i=0;i<N;i++){const a=base+i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeBoundingSphere();
  const m=new THREE.Mesh(g,pkJetMat());m.userData.dyn=true;m.renderOrder=4;grp.add(m);return m}
// a ring of arcing jets that fall into a basin of radius R, plus a central column
function pkFountainJets(grp,x,y,z,R,o){o=o||{};const nr=o.n||16,r=mkRand(((x*3)|0)^((z*5)|0));
  for(let i=0;i<nr;i++){const a=i/nr*6.2832+.1;pkJet(grp,x+Math.cos(a)*R*.18,y,z+Math.sin(a)*R*.18,(o.h||3)*(.7+r()*.4),R*.62,Math.cos(a),Math.sin(a),.05)}
  if(o.mid!==false)pkJet(grp,x,y,z,(o.mid||5.5),0,0,0,.1);
  for(let i=0;i<(o.n2||8);i++){const a=i/(o.n2||8)*6.2832+.4;pkJet(grp,x+Math.cos(a)*R*.55,y,z+Math.sin(a)*R*.55,(o.h||3)*.5,R*.2,-Math.cos(a),-Math.sin(a),.045)}}

// ---------- ground mist (soft horizontal sheets, cheap) ----------
function pkMist(grp,x,z,rx,rz,y,layers,opacity,seed){const r=mkRand(seed||5);const tex=pkMistTex();const list=[];
  for(let i=0;i<layers;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:opacity,depthWrite:false,color:0xe9f1f3,fog:true}));
    m.rotation.x=-Math.PI/2;m.rotation.z=r()*6.28;const sx=rx*(.7+r()*.6),sz=rz*(.7+r()*.6);m.scale.set(sx,sz,1);m.position.set(x+(r()-.5)*rx*.5,y+.25+i*(1.8/Math.max(1,layers-1)),z+(r()-.5)*rz*.5);m.userData.dyn=true;m.renderOrder=5;grp.add(m);
    list.push({m,sp:(r()-.5)*.02,ox:m.position.x,oz:m.position.z,ph:r()*6.28,amp:3+r()*5})}
  ANIM.push(dt=>{const t=UNI.uTime.value;if(Math.hypot(player.x-x,player.z-z)>Math.max(rx,rz)+260)return;for(const q of list){q.m.rotation.z+=q.sp*dt;q.m.position.x=q.ox+Math.sin(t*.07+q.ph)*q.amp;q.m.position.z=q.oz+Math.cos(t*.06+q.ph)*q.amp}});return list}

// ---------- footpaths ----------
const PK_W=[5.2,3.4,2.1,2.6];                 // pedestrian, paved, unpaved, cycleway widths
function pkIndexPaths(){if(PK.grid)return PK.grid;const g=new Map();const add=(ax,az,bx,bz)=>{const x0=Math.floor(Math.min(ax,bx)/24),x1=Math.floor(Math.max(ax,bx)/24),z0=Math.floor(Math.min(az,bz)/24),z1=Math.floor(Math.max(az,bz)/24);
  for(let a=x0;a<=x1;a++)for(let b=z0;b<=z1;b++){const k=a*65536+b;let l=g.get(k);if(!l)g.set(k,l=[]);l.push(ax,az,bx,bz)}};
  for(const park of [PKDATA.shev,PKDATA.gorky])for(const p of park.paths)for(let i=2;i+3<p.length;i+=2)add(p[i],p[i+1],p[i+2],p[i+3]);return PK.grid=g}
function pkNearPath(x,z,r){const g=pkIndexPaths();const l=g.get(Math.floor(x/24)*65536+Math.floor(z/24));if(!l)return false;for(let i=0;i<l.length;i+=4)if(pkDistSeg(x,z,l[i],l[i+1],l[i+2],l[i+3])<r)return true;return false}
// the base map draws the same OSM footways; inside the parks we draw our own paver paths instead
function pkHookRoads(){if(PK.hooked)return;PK.hooked=true;const prev=typeof EXCL_ROAD==='function'?EXCL_ROAD:null;EXCL_ROAD=(ax,az,bx,bz)=>(prev&&prev(ax,az,bx,bz))||(pkNearPath((ax+bx)/2,(az+bz)/2,2.4)&&pkNearPath(ax,az,3)&&pkNearPath(bx,bz,3))}

// lay every path of a park. o:{skip(x,z)->bool, pave(kind)->ground kind, rnd, benchStep, lampStep, treeStep, noFurn(x,z)->bool}
function pkPaths(GR,P,park,o){
  const rnd=o.rnd;let benchAcc=rnd()*30,lampAcc=rnd()*20;
  for(const p of park.paths){
    const kind=p[0],wide=p[1];const pts=[];for(let i=2;i+1<p.length;i+=2)pts.push([p[i],p[i+1]]);const n=pts.length;if(n<2)continue;
    const w=(PK_W[kind]||3)*(wide?1.25:1),hw=w/2;
    const seg=[];for(let i=0;i<n-1;i++)seg.push(!(o.skip&&(o.skip((pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2)||(o.skip(pts[i][0],pts[i][1])&&o.skip(pts[i+1][0],pts[i+1][1])))));
    const tg=i=>{const dx=pts[i+1][0]-pts[i][0],dz=pts[i+1][1]-pts[i][1],l=Math.hypot(dx,dz)||1;return [dx/l,dz/l]};
    const off=[];
    for(let i=0;i<n;i++){const tA=i>0&&seg[i-1]?tg(i-1):null,tB=i<n-1&&seg[i]?tg(i):null;let nx,nz,sc=1;
      if(tA&&tB){nx=-(tA[1]+tB[1]);nz=tA[0]+tB[0];const l=Math.hypot(nx,nz)||1;nx/=l;nz/=l;sc=1/Math.max(.55,nx*-tA[1]+nz*tA[0])}else{const t=tA||tB;if(!t){off.push(null);continue}nx=-t[1];nz=t[0]}
      off.push([pts[i][0]-nx*hw*sc,pts[i][1]-nz*hw*sc,pts[i][0]+nx*hw*sc,pts[i][1]+nz*hw*sc,nx*(hw+.2)*sc,nz*(hw+.2)*sc])}
    const gk=o.pave?o.pave(kind,wide):(kind===2?7:8),lift=gk===7?0:.015+(wide?.012:0);
    for(let i=0;i<n-1;i++){if(!seg[i])continue;const a=off[i],b=off[i+1];if(!a||!b)continue;const ang=Math.atan2(pts[i+1][1]-pts[i][1],pts[i+1][0]-pts[i][0]);
      pkQuad(GR,[[a[0],a[1]],[a[2],a[3]],[b[2],b[3]],[b[0],b[1]]],gk,ang,lift);
      if(kind<=1&&gk!==7){ // granite kerbs both sides
        const k=.34;pkQuad(GR,[[a[0]-a[4]*.0,a[1]-a[5]*.0],[a[0]+(pts[i][0]-a[0])*(k/hw),a[1]+(pts[i][1]-a[1])*(k/hw)],[b[0]+(pts[i+1][0]-b[0])*(k/hw),b[1]+(pts[i+1][1]-b[1])*(k/hw)],[b[0],b[1]]],3,0,.045);
        pkQuad(GR,[[a[2]+(pts[i][0]-a[2])*(k/hw),a[3]+(pts[i][1]-a[3])*(k/hw)],[a[2],a[3]],[b[2],b[3]],[b[2]+(pts[i+1][0]-b[2])*(k/hw),b[3]+(pts[i+1][1]-b[3])*(k/hw)]],3,0,.045)}}
    // furniture + tree-free corridor
    let accT=0;
    for(let i=0;i<n-1;i++){if(!seg[i])continue;const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.1)continue;const [tx,tz]=tg(i),nx=-tz,nz=tx;
      for(let s=0;s<=L;s+=4)TREE_CLEAR.push(a[0]+tx*s,a[1]+tz*s,hw+1.1);
      if(kind>1)continue;
      benchAcc-=L;lampAcc-=L;
      if(benchAcc<0&&L>6){benchAcc=o.benchStep||60;const s=L*.5,sd=rnd()<.5?-1:1;const x=a[0]+tx*s+nx*(hw+.75)*sd,z=a[1]+tz*s+nz*(hw+.75)*sd;
        if(!(o.noFurn&&o.noFurn(x,z))&&PK.nB<(o.maxBench||260))pkBench(P,x,groundH(x,z),z,Math.atan2(-nx*sd,-nz*sd))}
      if(lampAcc<0&&L>6){lampAcc=o.lampStep||44;const s=L*.5,sd=rnd()<.5?-1:1;const x=a[0]+tx*s+nx*(hw+.5)*sd,z=a[1]+tz*s+nz*(hw+.5)*sd;
        if(!(o.noFurn&&o.noFurn(x,z))&&PK.nL<(o.maxLamp||280))pkLamp(P,x,groundH(x,z),z,rnd()<.45?3:2,rnd()*6)}
      if(wide||kind===0){for(let s=(accT%(o.treeStep||11));s<L;s+=(o.treeStep||11)){for(const sd of [-1,1]){const x=a[0]+tx*s+nx*(hw+2.6)*sd+(rnd()-.5)*1.4,z=a[1]+tz*s+nz*(hw+2.6)*sd+(rnd()-.5)*1.4;
        if(o.noFurn&&o.noFurn(x,z))continue;if(rnd()<.18)continue;o.tree(x,z,rnd)}}accT+=L}}
  }}
