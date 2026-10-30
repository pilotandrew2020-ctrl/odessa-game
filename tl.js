// tl.js — traffic lights at the big junctions. A junction gets signals when at least three of its arms are car roads (class 0/1) and two of them
// cross (a slip road that merges at a shallow angle does not count). The pole + dark head sit in the chunk props (static); the three lenses of the
// nearest heads are ONE shared InstancedMesh and the lit lens gets a soft glow sprite (one Points draw), both refreshed 4x a second.
// The cycle is wall-clock based (Date.now), so friends see the same colours; traffic stops at a red/yellow light (TL.stop, called from updateCars).
// Loaded before the main script; globals (D, HDR, HW, groundH, sRGB, chunks, camera, scene ...) are only read at call time.

const TL=(()=>{
const CY=44,GR=17,YE=3,HALF=22,DIST=9.5,STOP=13,MINL=20,PSTOP=7.2;
let built=false,K=null,inst=null,glow=null,gpos=null,gcol=null,acc=9;
const info=new Map(),byChunk=new Map(),stat={nodes:0,poles:0,v:0,shown:0};
const nmax=()=>(typeof MOBILE!=='undefined'&&MOBILE)?10:24;
function kit(){if(K)return K;K={pole:sRGB('#3d4247'),body:sRGB('#141517'),plate:sRGB('#e9e7de')};return K}

// arms of a node that carry cars: [dirX,dirZ,length of the first segment,class]
function arms(nd){const A=[],wn=D.wn,ws=D.wstart,P=D.nodes;
  for(let q=D.adjS[nd];q<D.adjS[nd+1];q++){const r=D.adj[q],k=D.wOf[r],c=D.wcls[k],f=D.wfl[k];if(c>1||f!==0)continue;const s0=ws[k],s1=ws[k+1]-1;
    const add=m=>{const dx=P[m*2]-P[nd*2],dz=P[m*2+1]-P[nd*2+1],l=Math.hypot(dx,dz);if(l>.5)A.push([dx/l,dz/l,l,c])};
    if(r<s1)add(wn[r+1]);if(r>s0)add(wn[r-1])}
  return A}
function build(){
  if(built)return;built=true;const P=D.nodes,N=HDR.nNodes;
  for(let nd=0;nd<N;nd++){if(D.deg[nd]<3)continue;const A=arms(nd);if(A.length<3)continue;
    let cross=false;for(let i=0;i<A.length&&!cross;i++)for(let j=i+1;j<A.length;j++)if(Math.abs(A[i][0]*A[j][0]+A[i][1]*A[j][1])<.5){cross=true;break}
    if(!cross)continue;
    const I={nd,rx:A[0][0],rz:A[0][1],off:(nd*37)%CY,arms:A};info.set(nd,I);
    const id=chunkIdAt2(P[nd*2],P[nd*2+1]);if(id<0)continue;let l=byChunk.get(id);if(!l)byChunk.set(id,l=[]);l.push(I)}
  stat.nodes=info.size}
function is(nd){build();return info.has(nd)}

// phase inside the cycle for traffic that drives along (tx,tz): two axes, 17 s green + 3 s yellow, then red until the other axis is done
function qOf(I,tx,tz,T){const ax=Math.abs(tx*I.rx+tz*I.rz)>.7071?0:1;return (((T+I.off-ax*HALF)%CY)+CY)%CY}
const stOf=q=>q<GR?0:q<GR+YE?1:2;   // 0 green, 1 yellow, 2 red
// target speed for a car that is `s` m along a segment of length `L` that ends at node nd (heading tx,tz); Infinity = no restriction
function stop(v,nd,tx,tz,L,s,big){
  if(L<=MINL)return 1e9;const dist=L-s;if(dist>75)return 1e9;
  const I=info.get(nd);if(!I)return 1e9;
  const st=stOf(qOf(I,tx,tz,Date.now()/1000));if(st===0)return 1e9;
  const d=dist-STOP-big*5;
  if(d<-3)return 1e9;                      // already over the line: clear the junction
  if(st===1&&d<v*v/7+1)return 1e9;         // yellow and too close to stop in comfort
  return Math.max(0,d)*1.1}

// pedestrians: they walk along the pavement lines and cross the mouths of the side roads at the node, so they wait PSTOP m before a signalised
// node until the axis they walk along shows a STEADY green (the cross traffic is stopped then); flashing green, yellow and red mean wait.
// Called from updatePeds with the pedestrian's segment end node, heading and the distance left on the segment.
function hold(nd,tx,tz,dist){
  if(dist>PSTOP+.6||dist<PSTOP-1.8)return false;
  const I=info.get(nd);if(!I)return false;
  return qOf(I,tx,tz,Date.now()/1000)>=GR-3}

// pole + dark head with a white back plate facing (fx,fz) (towards the oncoming traffic), and a small two-lens pedestrian head on the back of the
// pole facing the other way (the walkers who come from the opposite side of the junction see it). Returns the lens centres [x,y,z,fx,fz,node,kind].
function pole(P,k,x,y,z,fx,fz,nd){
  const ry=Math.atan2(fx,fz),hx=x+fx*.24,hz=z+fz*.24,hy=y+3.55,px=x-fx*.16,pz=z-fz*.16,py=y+2.5,n0=P.g.n;
  P.cyl(x,y,z,.085,.06,4.1,5,k.pole,1);
  P.box(hx,hy,hz,.34,1.0,.26,ry,k.body,1);
  P.box(hx-fx*.125,hy,hz-fz*.125,.5,1.16,.03,ry,k.plate,1);
  P.box(px,py,pz,.24,.58,.2,ry+Math.PI,k.body,1);
  stat.poles++;stat.v+=P.g.n-n0;
  return [[hx+fx*.145,hy,hz+fz*.145,fx,fz,nd,0],[px-fx*.112,py,pz-fz*.112,-fx,-fz,nd,1]]}
// called from buildChunkGen: poles for the signalised nodes of this chunk; `free(x,z)` says the spot is not inside a building/prop.
// Returns the flat list [x,y,z,fx,fz,node,kind, ...] (kind 0 = car head, 1 = pedestrian head) kept on the chunk for the renderer.
function scatter(id,P,free){
  build();const L=byChunk.get(id),out=[];if(!L)return out;const k=kit(),N=D.nodes;
  for(const I of L){const nx=N[I.nd*2],nz=N[I.nd*2+1];
    for(const [ax,az,len,c] of I.arms){if(len<=MINL)continue;
      for(const side of c===0?[1,-1]:[1]){   // the widest roads get a head on both pavements
        const off=(HW[c]+1.3)*side;let x=nx+ax*DIST+az*off,z=nz+az*DIST-ax*off;
        if(!free(x,z)){x+=ax*3;z+=az*3;if(!free(x,z))continue}
        for(const h of pole(P,k,x,groundH(x,z)+.17,z,ax,az,I.nd))out.push(...h)}}}
  return out}

// ---- renderer: lenses (instanced discs) + glow sprites for the lit ones
const LIT=[[1,.1,.05],[1,.62,.04],[.08,1,.32]],OFF=[[.05,.012,.01],[.05,.03,.0],[.0,.045,.015]];
function init(){
  const n=nmax()*3,lg=new THREE.CircleGeometry(.115,12);
  const lm=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  inst=new THREE.InstancedMesh(lg,lm,n);inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c0=new THREE.Color(0);for(let i=0;i<n;i++)inst.setColorAt(i,c0);inst.instanceColor.setUsage(THREE.DynamicDrawUsage);
  inst.count=0;inst.frustumCulled=false;inst.renderOrder=2;scene.add(inst);
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.22,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
  const geo=new THREE.BufferGeometry();gpos=new Float32Array(nmax()*3);gcol=new Float32Array(nmax()*3);
  geo.setAttribute('position',new THREE.BufferAttribute(gpos,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.BufferAttribute(gcol,3).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0,0);
  glow=new THREE.Points(geo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(cv),size:1.6,sizeAttenuation:true,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));
  glow.frustumCulled=false;glow.renderOrder=3;scene.add(glow)}
const _c=[],_m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_p=new THREE.Vector3(),_s=new THREE.Vector3(1,1,1),_Y=new THREE.Vector3(0,1,0),_col=new THREE.Color();
function frame(dt){
  if(!inst){if(typeof scene==='undefined'||typeof THREE==='undefined')return;init()}
  acc+=dt;if(acc<.25)return;acc=0;
  if(!started||(typeof PORTAL!=='undefined'&&PORTAL.cur)||(typeof curIndoor!=='undefined'&&curIndoor)){inst.count=0;glow.geometry.setDrawRange(0,0);return}
  const cam=camera.position,id0=chunkIdAt2(cam.x,cam.z);_c.length=0;
  if(id0>=0){const i0=id0%NCX,j0=Math.floor(id0/NCX);
    for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){const c=chunks.get(j*NCX+i);if(!c||!c.tlPts)continue;const p=c.tlPts;
      for(let q=0;q<p.length;q+=7){const dx=p[q]-cam.x,dz=p[q+2]-cam.z,d=dx*dx+dz*dz;if(d<(p[q+6]?90*90:190*190))_c.push([d,p,q])}}}   // the small pedestrian heads only matter close up
  _c.sort((a,b)=>a[0]-b[0]);
  const n=Math.min(nmax(),_c.length),T=Date.now()/1000,night=(typeof UNI!=='undefined'&&UNI.uNight)?UNI.uNight.value:0;let gn=0,ii=0;
  for(let h=0;h<n;h++){const [d,p,q]=_c[h],x=p[q],y=p[q+1],z=p[q+2],fx=p[q+3],fz=p[q+4],ped=p[q+6]===1,I=info.get(p[q+5]);if(!I)continue;
    const qq=qOf(I,-fx,-fz,T),st=stOf(qq),off=st===0&&qq>GR-3&&Math.floor(T*2.5)%2===0;   // the last seconds of green blink
    // car head: lens 0 red, 1 yellow, 2 green; pedestrian head: lens 0 red, 1 green (a steady green only while cars on the cross road stand)
    const nl=ped?2:3,sp=ped?.3:.31,y0=ped?y+.15:y+.31;let lit=ped?(st===0?1:0):(st===0?2:st===1?1:0);if(off)lit=-1;
    _q.setFromAxisAngle(_Y,Math.atan2(fx,fz));_s.setScalar(ped?.72:1);
    for(let i=0;i<nl;i++){_p.set(x,y0-i*sp,z);_m.compose(_p,_q,_s);inst.setMatrixAt(ii,_m);const ci=ped&&i===1?2:i,C=i===lit?LIT[ci]:OFF[ci];_col.setRGB(C[0],C[1],C[2]);inst.setColorAt(ii,_col);ii++}
    if(lit>=0){const dd=Math.sqrt(d),view=Math.max(0,Math.min(1,((cam.x-x)*fx+(cam.z-z)*fz)/(dd||1)*2.2-.2)),k=view*Math.max(0,1-dd/(ped?90:190))*(.35+.65*night)*(ped?.55:1);
      const C=LIT[ped&&lit===1?2:lit];gpos[gn*3]=x+fx*.1;gpos[gn*3+1]=y0-lit*sp;gpos[gn*3+2]=z+fz*.1;gcol[gn*3]=C[0]*k;gcol[gn*3+1]=C[1]*k;gcol[gn*3+2]=C[2]*k;gn++}}
  inst.count=ii;inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
  glow.geometry.setDrawRange(0,gn);glow.geometry.attributes.position.needsUpdate=true;glow.geometry.attributes.color.needsUpdate=true;stat.shown=n}
return {is,stop,hold,scatter,frame,stat,info,qOf,stOf,CY,GR,YE}})();
