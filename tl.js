// tl.js — traffic lights at the big junctions. A junction is a CLUSTER of road nodes (digitised crossings often have 1–3 m stubs between the nodes):
// every deg>=3 node that looks like a real crossing (>=3 car arms, two of them crossing) plus the deg>=3 nodes within 14 m of it. Each road that
// leaves the cluster is an ARM (at least 12 m long, followed along its polyline through the short segments). Per arm: a stop line painted by the
// ground shader 7.4 m from the cluster node (the zebra the shader draws 2.5–6.5 m from every junction node lies right behind it), a pole beside the
// stop line (+ one on the other pavement of the wide roads) with a car head facing the oncoming traffic and a small red/green-man head facing across.
// The cycle is wall-clock based (Date.now), so friends see the same colours. Cars stop at red/yellow (TL.stop, from updateCars, works on the
// directed segments that lead to the arm, however short), pedestrians wait at the zebra kerb (TL.hold, from updatePeds).
// Loaded before the main script; globals (D, HDR, HW, groundH, sRGB, chunks, camera, scene ...) are only read at call time.

const TL=(()=>{
const CY=44,GR=17,YE=3,HALF=22,SLU=7.4,MINARM=12,WALK=75;
let built=false,K=null,inst=null,glow=null,gpos=null,gcol=null,acc=9;
const info=new Map(),nodeCl=new Map(),segSig=new Map(),byChunk=new Map(),zb=new Map(),stat={clusters:0,arms:0,poles:0,v:0,shown:0};
const nmax=()=>(typeof MOBILE!=='undefined'&&MOBILE)?10:24;
function kit(){if(K)return K;K={pole:sRGB('#3d4247'),body:sRGB('#141517'),plate:sRGB('#e9e7de')};return K}

// car-road edges that leave a node: [way, position in the way, step (+1/-1), class]
function edges(nd){const E=[],ws=D.wstart;
  for(let q=D.adjS[nd];q<D.adjS[nd+1];q++){const r=D.adj[q],k=D.wOf[r],c=D.wcls[k],f=D.wfl[k];if(c>1||f!==0)continue;const s0=ws[k],s1=ws[k+1]-1;
    if(r<s1)E.push([k,r,1,c]);if(r>s0)E.push([k,r,-1,c])}
  return E}
// follow a way from node m: [{n,cum}] until maxd metres or the next deg>=3 node (included)
function walkOut(m,k,r,st,maxd){const wn=D.wn,P=D.nodes,s0=D.wstart[k],s1=D.wstart[k+1]-1,out=[{n:m,cum:0}];let cum=0,p=r,prev=m;
  for(;;){p+=st;if(p<s0||p>s1)break;const n=wn[p];cum+=Math.hypot(P[n*2]-P[prev*2],P[n*2+1]-P[prev*2+1]);out.push({n,cum});prev=n;if(cum>=maxd||D.deg[n]>=3)break}
  return out}
// the point u metres along the walk and the (outward) direction there
function at(w,u){const P=D.nodes;let j=0;while(j<w.length-2&&w[j+1].cum<u)j++;
  const a=w[j].n,b=w[j+1].n,l=w[j+1].cum-w[j].cum||1,t=Math.max(0,Math.min(1,(u-w[j].cum)/l)),ax=P[a*2],az=P[a*2+1],bx=P[b*2],bz=P[b*2+1],dl=Math.hypot(bx-ax,bz-az)||1;
  return {x:ax+(bx-ax)*t,z:az+(bz-az)*t,dx:(bx-ax)/dl,dz:(bz-az)/dl}}
const zkey=(i,j)=>(i+4096)*8192+(j+4096);

function build(){
  if(built)return;built=true;const P=D.nodes,N=HDR.nNodes,deg=D.deg,ws=D.wstart,wn=D.wn;
  const cand=[];
  for(let nd=0;nd<N;nd++){if(deg[nd]<3)continue;const A=[];
    for(const [k,r,st] of edges(nd)){const w=walkOut(nd,k,r,st,8),b=w[w.length-1];if(w.length<2||b.cum<.5)continue;const dx=P[b.n*2]-P[nd*2],dz=P[b.n*2+1]-P[nd*2+1],l=Math.hypot(dx,dz);if(l>.5)A.push([dx/l,dz/l])}
    if(A.length<3)continue;let cross=false;for(let i=0;i<A.length&&!cross;i++)for(let j=i+1;j<A.length;j++)if(Math.abs(A[i][0]*A[j][0]+A[i][1]*A[j][1])<.5){cross=true;break}
    if(cross)cand.push(nd)}
  // clusters: candidates plus the deg>=3 nodes within 14 m along a car road (kept within 34 m of the first node)
  const cid=new Map(),mems=[];
  for(const c0 of cand){if(cid.has(c0))continue;const id=mems.length,mem=[c0];cid.set(c0,id);
    for(let h=0;h<mem.length;h++){const m=mem[h];
      for(const [k,r,st] of edges(m)){const w=walkOut(m,k,r,st,14),e=w[w.length-1];
        if(w.length>1&&e.cum<=14&&deg[e.n]>=3&&!cid.has(e.n)&&Math.hypot(P[e.n*2]-P[c0*2],P[e.n*2+1]-P[c0*2+1])<34){cid.set(e.n,id);mem.push(e.n)}}}
    mems.push(mem)}
  for(let id=0;id<mems.length;id++){const mem=mems[id],arms=[];
    for(const m of mem)for(const [k,r,st,c] of edges(m)){
      const w=walkOut(m,k,r,st,WALK);if(w.length<2)continue;const last=w[w.length-1];
      if(cid.get(w[1].n)===id||cid.get(last.n)===id)continue;   // a link inside the junction
      if(last.cum<MINARM)continue;
      const S=at(w,SLU+.6),Zc=at(w,4.5);
      let dup=false;for(const a of arms)if(Math.abs(a.ox*S.dx+a.oz*S.dz)>.97&&Math.hypot(a.sx-S.x,a.sz-S.z)<3.5){dup=true;break}if(dup)continue;
      arms.push({I:null,m,k,r,st,c,w,ox:S.dx,oz:S.dz,sx:S.x,sz:S.z,zx:Zc.x,zz:Zc.z,hw:HW[c],px:Zc.dz,pz:-Zc.dx})}
    let cross=false;for(let i=0;i<arms.length&&!cross;i++)for(let j=i+1;j<arms.length;j++)if(Math.abs(arms[i].ox*arms[j].ox+arms[i].oz*arms[j].oz)<.6){cross=true;break}
    if(arms.length<3||!cross)continue;
    let cx=0,cz=0;for(const m of mem){cx+=P[m*2];cz+=P[m*2+1]}cx/=mem.length;cz/=mem.length;
    const I={id,nodes:mem,cx,cz,rx:arms[0].ox,rz:arms[0].oz,off:(id*37)%CY,arms};info.set(id,I);stat.clusters++;
    for(const m of mem)nodeCl.set(m,id);
    for(const a of arms){a.I=I;stat.arms++;
      // directed segments that lead to the arm: key = way position*2 + (0 when driving up the way, 1 down), ue = distance of the segment end from the arm's node
      for(let j=0;j+1<a.w.length;j++){if(a.w[j+1].cum<SLU-2)continue;
        const pj=a.r+a.st*j,pj1=a.r+a.st*(j+1),ri=Math.min(pj,pj1),dir=a.st>0?-1:1;segSig.set(ri*2+(dir>0?0:1),{I,a,ue:a.w[j].cum})}
      const l=zb.get(zkey(Math.floor(a.zx/48),Math.floor(a.zz/48)));if(l)l.push(a);else zb.set(zkey(Math.floor(a.zx/48),Math.floor(a.zz/48)),[a]);
      // poles: on the right-hand pavement of the approaching traffic, and on the left one of the wide roads
      for(const side of a.c===0?[1,-1]:[1]){const off=(HW[a.c]+1.3)*side,x=a.sx+a.oz*off,z=a.sz-a.ox*off,cid2=chunkIdAt2(x,z);if(cid2<0)continue;
        let l2=byChunk.get(cid2);if(!l2)byChunk.set(cid2,l2=[]);l2.push({x,z,a,side})}}}}
function is(nd){build();return nodeCl.has(nd)}
// is the directed segment (way position ri, driving dir) one of those that lead to a signalised arm? (the ground shader paints the stop line on those)
function has(ri,dir){build();return segSig.has(ri*2+(dir>0?0:1))}

// phase inside the cycle for traffic that drives along (tx,tz): two axes, 17 s green + 3 s yellow, then red until the other axis is done
function qOf(I,tx,tz,T){const ax=Math.abs(tx*I.rx+tz*I.rz)>.7071?0:1;return (((T+I.off-ax*HALF)%CY)+CY)%CY}
const stOf=q=>q<GR?0:q<GR+YE?1:2;   // 0 green, 1 yellow, 2 red
// target speed for a car on directed segment (ri,dir) of length L, s metres along it; Infinity = no restriction
function stop(v,ri,dir,L,s,big){
  const e=segSig.get(ri*2+(dir>0?0:1));if(!e)return 1e9;
  const dist=e.ue+(L-s)-SLU;if(dist>70)return 1e9;
  const st=stOf(qOf(e.I,e.a.ox,e.a.oz,Date.now()/1000));if(st===0)return 1e9;
  const d=dist-2.4-big*3.4;                  // the nose stops at the line, the car's centre is half a car behind it
  if(d<-3)return 1e9;                        // already over the line: clear the junction
  if(st===1&&d<v*v/7+1)return 1e9;           // yellow and too close to stop in comfort
  return Math.max(0,d)*1.1}

// pedestrians cross the mouth of a road on its zebra: a walker heading across an arm waits on the kerb until its own axis shows a STEADY green
// (the traffic of the arm it wants to cross stands then); once it has stepped onto the carriageway it walks on.
function hold(x,z,hx,hz){
  if(!built)return false;const gx=Math.floor(x/48),gz=Math.floor(z/48);let T=0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const l=zb.get(zkey(gx+i,gz+j));if(!l)continue;
    for(const a of l){const dx=x-a.zx,dz=z-a.zz;if(dx*dx+dz*dz>81)continue;const du=dx*a.ox+dz*a.oz;if(du>3.2||du<-3.2)continue;
      const hp=hx*a.px+hz*a.pz;if(hp>-.5&&hp<.5)continue;const dl=dx*a.px+dz*a.pz,al=Math.abs(dl);if(al<a.hw+.1||al>a.hw+1.6||dl*hp>0)continue;
      if(!T)T=Date.now()/1000;if(qOf(a.I,hx,hz,T)>=GR-3)return true}}
  return false}

// pole + dark head with a white back plate facing (fx,fz) (towards the oncoming traffic), and a small two-lens pedestrian head facing (qx,qz) across
// the road. Returns the lens centres [x,y,z,fx,fz,cluster,kind].
function pole(P,k,x,y,z,fx,fz,qx,qz,id){
  const ry=Math.atan2(fx,fz),hx=x+fx*.24,hz=z+fz*.24,hy=y+3.55,py=y+2.3,rq=Math.atan2(qx,qz),px=x+qx*.14,pz=z+qz*.14,n0=P.g.n;
  P.cyl(x,y,z,.085,.06,4.1,5,k.pole,1);
  P.box(hx,hy,hz,.34,1.0,.26,ry,k.body,1);
  P.box(hx-fx*.125,hy,hz-fz*.125,.5,1.16,.03,ry,k.plate,1);
  P.box(px,py,pz,.24,.58,.2,rq,k.body,1);
  stat.poles++;stat.v+=P.g.n-n0;
  return [[hx+fx*.145,hy,hz+fz*.145,fx,fz,id,0],[px+qx*.112,py,pz+qz*.112,qx,qz,id,1]]}
// called from buildChunkGen: poles of this chunk; `free(x,z)` says the spot is not inside a building/prop.
// Returns the flat list [x,y,z,fx,fz,cluster,kind, ...] (kind 0 = car head, 1 = pedestrian head) kept on the chunk for the renderer.
function scatter(id,P,free){
  build();const L=byChunk.get(id),out=[];if(!L)return out;const k=kit();
  for(const {x:x0,z:z0,a,side} of L){let x=x0,z=z0;
    if(!free(x,z)){x+=a.ox*2.5;z+=a.oz*2.5;if(!free(x,z))continue}
    for(const h of pole(P,k,x,groundH(x,z)+.17,z,a.ox,a.oz,-a.oz*side,a.ox*side,a.I.id))out.push(...h)}
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
    // car head: lens 0 red, 1 yellow, 2 green; pedestrian head: lens 0 red, 1 green man — green while the arm it stands on is red AND the cross axis is steady green
    let lit;
    if(ped){const qq=qOf(I,-fz,fx,T);lit=qq>=HALF&&qq<HALF+GR-3?1:0;if(qq>=HALF+GR-3&&qq<HALF+GR)lit=Math.floor(T*2.5)%2===0?-1:1}
    else{const qq=qOf(I,-fx,-fz,T),st=stOf(qq);lit=st===0?2:st===1?1:0;if(st===0&&qq>GR-3&&Math.floor(T*2.5)%2===0)lit=-1}   // the last seconds of green blink
    const nl=ped?2:3,sp=ped?.3:.31,y0=ped?y+.15:y+.31;
    _q.setFromAxisAngle(_Y,Math.atan2(fx,fz));_s.setScalar(ped?.72:1);
    for(let i=0;i<nl;i++){_p.set(x,y0-i*sp,z);_m.compose(_p,_q,_s);inst.setMatrixAt(ii,_m);const ci=ped&&i===1?2:i,C=i===lit?LIT[ci]:OFF[ci];_col.setRGB(C[0],C[1],C[2]);inst.setColorAt(ii,_col);ii++}
    if(lit>=0){const dd=Math.sqrt(d),view=Math.max(0,Math.min(1,((cam.x-x)*fx+(cam.z-z)*fz)/(dd||1)*2.2-.2)),k=view*Math.max(0,1-dd/(ped?90:190))*(.35+.65*night)*(ped?.55:1);
      const C=LIT[ped&&lit===1?2:lit];gpos[gn*3]=x+fx*.1;gpos[gn*3+1]=y0-lit*sp;gpos[gn*3+2]=z+fz*.1;gcol[gn*3]=C[0]*k;gcol[gn*3+1]=C[1]*k;gcol[gn*3+2]=C[2]*k;gn++}}
  inst.count=ii;inst.instanceMatrix.needsUpdate=true;inst.instanceColor.needsUpdate=true;
  glow.geometry.setDrawRange(0,gn);glow.geometry.attributes.position.needsUpdate=true;glow.geometry.attributes.color.needsUpdate=true;stat.shown=n}
// trams run on their own track in the street: how many metres the tram CENTRE may still travel before the stop line of the arm it is heading into
// (red, or yellow when it can still stop); 99 = nothing in the way. The nose is 8 m ahead of the centre and stops 1.6 m before the line.
function tram(x,z,tx,tz,v){
  if(!built)return 99;const gx=Math.floor(x/48),gz=Math.floor(z/48);let best=99,T=0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const l=zb.get(zkey(gx+i,gz+j));if(!l)continue;
    for(const a of l){const dx=a.zx-x,dz=a.zz-z,al=dx*tx+dz*tz;if(al<-2||al>90)continue;
      if(tx*a.ox+tz*a.oz>-.8)continue;if(Math.abs(dx*tz-dz*tx)>a.hw+4)continue;
      if(!T)T=Date.now()/1000;const st=stOf(qOf(a.I,tx,tz,T));if(st===0)continue;
      const d=al-9.6;if(d<-3)continue;if(st===1&&d<v*v/7+1)continue;
      if(d<best)best=Math.max(0,d)}}
  return best}
return {is,has,stop,hold,tram,scatter,frame,stat,info,segSig,qOf,stOf,CY,GR,YE,SLU,zb}})();
