/* ===================================================================================================
   body.js — smoother, more human avatar shapes. Everything is plain procedural geometry (no files):
     bdLoft   a solid made of elliptical rings (torso, limbs, shoes)           bdTube   a tapered tube along a 3D curve (hair locks, ponytail)
     bdTorso  the torso profile + a helper that returns the chest surface      bdHair   skull-fitting hair with a real hairline and locks
   makePlayer() (index.html) and CHP.hair (creator.js) attach these to the same joints as before, so poses and co-op sync are unchanged.
   Loaded BEFORE the main script; only touches THREE at call time.
   =================================================================================================== */

// rings [{y,rx,rz,cx,cz}] bottom→top, `seg` points per ring; smooth normals, uv.v = height fraction (stripes), both ends closed
function bdLoft(secs,seg){seg=seg||12;const n=secs.length,pos=[],uv=[],idx=[],y0=secs[0].y,y1=secs[n-1].y,dy=(y1-y0)||1;
  for(let i=0;i<n;i++){const s=secs[i];for(let j=0;j<=seg;j++){const a=j/seg*Math.PI*2;pos.push((s.cx||0)+Math.cos(a)*s.rx,s.y,(s.cz||0)+Math.sin(a)*s.rz);uv.push(j/seg,(s.y-y0)/dy)}}
  const w=seg+1;for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*w+j,b=a+1,c=(i+1)*w+j,d=c+1;idx.push(a,c,b,b,c,d)}
  const c0=pos.length/3;pos.push(secs[0].cx||0,y0,secs[0].cz||0);uv.push(.5,0);const c1=c0+1;pos.push(secs[n-1].cx||0,y1,secs[n-1].cz||0);uv.push(.5,1);
  for(let j=0;j<seg;j++){idx.push(c0,j,j+1);const o=(n-1)*w;idx.push(c1,o+j+1,o+j)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}

// tapered tube along points (THREE.Vector3 / [x,y,z]); rad = radius at each point (number or array), flat = second axis scale (hair locks are flat ribbons)
function bdTube(pts,rad,seg,flat,seed){seg=seg||6;flat=flat||1;const P=pts.map(p=>p.isVector3?p:new THREE.Vector3(p[0],p[1],p[2])),n=P.length,pos=[],idx=[];
  const R=i=>Array.isArray(rad)?rad[Math.min(i,rad.length-1)]:rad;let nrm=null;
  for(let i=0;i<n;i++){const t=(i<n-1?P[i+1].clone().sub(P[i]):P[i].clone().sub(P[i-1])).normalize();
    if(!nrm){nrm=Math.abs(t.y)<.9?new THREE.Vector3(0,1,0).cross(t).normalize():new THREE.Vector3(1,0,0).cross(t).normalize()}else{nrm=nrm.clone().sub(t.clone().multiplyScalar(nrm.dot(t))).normalize()}
    const bin=t.clone().cross(nrm).normalize();
    for(let j=0;j<seg;j++){const a=j/seg*Math.PI*2,r=R(i);const v=P[i].clone().addScaledVector(nrm,Math.cos(a)*r).addScaledVector(bin,Math.sin(a)*r*flat);pos.push(v.x,v.y,v.z)}}
  for(let i=0;i<n-1;i++)for(let j=0;j<seg;j++){const a=i*seg+j,b=i*seg+(j+1)%seg,c=(i+1)*seg+j,d=(i+1)*seg+(j+1)%seg;idx.push(a,b,c,b,d,c)}
  const c0=pos.length/3;pos.push(P[0].x,P[0].y,P[0].z);const c1=c0+1;pos.push(P[n-1].x,P[n-1].y,P[n-1].z);
  for(let j=0;j<seg;j++){idx.push(c0,(j+1)%seg,j);const o=(n-1)*seg;idx.push(c1,o+j,o+(j+1)%seg)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  // tubes wind either way depending on the path: make every face point away from the axis
  const ps=g.attributes.position,nr=g.attributes.normal;let bad=0;for(let i=0;i<n*seg;i++){const k=Math.floor(i/seg),dx=ps.getX(i)-P[k].x,dy=ps.getY(i)-P[k].y,dz=ps.getZ(i)-P[k].z;if(dx*nr.getX(i)+dy*nr.getY(i)+dz*nr.getZ(i)<0)bad++}
  if(bad>n*seg/2){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t}g.computeVertexNormals()}
  return g}

// the torso: waist → chest → shoulders → neck base (spine-local y, 0 .. .5)
const BD_TORSO=[{y:-.045,rx:.19,rz:.117},{y:-.02,rx:.186,rz:.113},{y:0,rx:.172,rz:.104},{y:.06,rx:.181,rz:.109},{y:.16,rx:.193,rz:.112},{y:.27,rx:.206,rz:.119},{y:.36,rx:.22,rz:.127},{y:.415,rx:.222,rz:.116},{y:.452,rx:.172,rz:.099},{y:.482,rx:.085,rz:.072},{y:.5,rx:.05,rz:.052}];
// front/back surface z of the torso at height y and sideways offset x (so shirt strips, straps and zips sit on the body instead of floating)
function bdChest(y,x){const S=BD_TORSO;y=Math.max(S[0].y,Math.min(.5,y));let k=0;while(k<S.length-2&&y>S[k+1].y)k++;const a=S[k],b=S[k+1],t=(y-a.y)/((b.y-a.y)||1),rx=a.rx+(b.rx-a.rx)*t,rz=a.rz+(b.rz-a.rz)*t,q=Math.min(.98,Math.abs(x)/rx);return rz*Math.sqrt(1-q*q)}
// a flat strip that follows the torso surface (front: side=1, back: side=-1) from (x0,y0) to (x1,y1)
function bdBand(x0,y0,x1,y1,w,side,off){const N=12,K=Math.max(1,Math.min(8,Math.round(w/.03))),pos=[],uv=[],idx=[],dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;off=off===undefined?.003:off;
  for(let i=0;i<=N;i++){const t=i/N,x=x0+dx*t,y=y0+dy*t;for(let k=0;k<=K;k++){const s=-1+2*k/K,px=x+nx*w/2*s,py=y+ny*w/2*s;pos.push(px,py,side*(bdChest(py,px)+off));uv.push(k/K,t)}}   // several columns so a wide strip follows the curve of the chest
  const C=K+1;for(let i=0;i<N;i++)for(let k=0;k<K;k++){const a=i*C+k,b=a+1,c=a+C,d=c+1;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  // wind the faces so they point away from the body whichever way the strip runs
  const nr=g.attributes.normal;if(nr.getZ(0)*side<0){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t}g.computeVertexNormals()}return g}

const BD_ARM_UP=[{y:-.1,rx:.05,rz:.048},{y:-.2,rx:.046,rz:.044},{y:-.285,rx:.04,rz:.039},{y:-.3,rx:.039,rz:.038}];
const BD_ARM_LO=[{y:.02,rx:.039,rz:.038},{y:-.04,rx:.044,rz:.042},{y:-.12,rx:.037,rz:.034},{y:-.19,rx:.028,rz:.026},{y:-.2,rx:.016,rz:.016}];
const BD_SLEEVE=[{y:.05,rx:.034,rz:.032},{y:.032,rx:.062,rz:.058},{y:-.01,rx:.069,rz:.065},{y:-.1,rx:.067,rz:.063},{y:-.19,rx:.063,rz:.059},{y:-.202,rx:.061,rz:.057}];
const BD_THIGH=[{y:.03,rx:.087,rz:.09},{y:-.08,rx:.084,rz:.088},{y:-.2,rx:.071,rz:.073},{y:-.31,rx:.059,rz:.061},{y:-.345,rx:.058,rz:.06}];
const BD_SHIN=[{y:.03,rx:.052,rz:.054},{y:-.0,rx:.058,rz:.061},{y:-.04,rx:.062,rz:.066,cz:-.008},{y:-.12,rx:.054,rz:.058,cz:-.004},{y:-.2,rx:.044,rz:.047},{y:-.26,rx:.043,rz:.046},{y:-.27,rx:.03,rz:.03}];
const BD_PELVIS=[{y:-.075,rx:.15,rz:.098},{y:-.03,rx:.178,rz:.106},{y:.04,rx:.176,rz:.104},{y:.092,rx:.164,rz:.1},{y:.1,rx:.12,rz:.08}];
// shoes are lofted along their length (y here = z of the foot) then laid down: {y:forward, rx:half width, rz:half height, cz:-(vertical centre)}
function bdShoe(chunky){const k=chunky?1.18:1,h=chunky?1.35:1,S=[[-.098,.033,.036,.026],[-.065,.048,.047,.02],[-.01,.057,.05,.02],[.05,.062,.045,.03],[.115,.06,.036,.04],[.168,.05,.027,.047],[.202,.03,.017,.054],[.212,.012,.01,.056]];
  const g=bdLoft(S.map(s=>({y:s[0],rx:s[1]*k,rz:s[2]*h,cz:-(-s[3])})),14);g.rotateX(Math.PI/2);return g}
function bdSole(chunky){const k=chunky?1.18:1,hh=chunky?.027:.014,S=[[-.104,.034],[-.07,.05],[-.01,.058],[.05,.063],[.115,.061],[.17,.05],[.205,.031],[.216,.014]];
  const g=bdLoft(S.map(s=>({y:s[0],rx:s[1]*k,rz:hh,cz:chunky?.0:-.0})),14);g.rotateX(Math.PI/2);g.translate(0,chunky?-.085:-.0685,0);return g}
function bdBoot(){return bdLoft([{y:-.04,rx:.062,rz:.066},{y:.05,rx:.064,rz:.068},{y:.12,rx:.06,rz:.064},{y:.158,rx:.056,rz:.06},{y:.164,rx:.04,rz:.044}],14)}
function bdHand(){return bdLoft([{y:.045,rx:.016,rz:.014},{y:.028,rx:.034,rz:.026},{y:-.005,rx:.044,rz:.03},{y:-.04,rx:.041,rz:.028},{y:-.07,rx:.03,rz:.022},{y:-.082,rx:.014,rz:.012}],10)}

// ---------------------------------------------------------------- hair
// the head profile: a rounded egg (narrow chin, full cheeks, domed crown) — headGeo() in index.html lathes it, the hair shell follows it
const BD_HEAD=[[0,.3],[.025,.47],[.07,.66],[.13,.81],[.22,.93],[.34,.99],[.46,1],[.58,.985],[.7,.94],[.8,.87],[.88,.77],[.94,.63],[.98,.43],[.998,.22],[1,0]];
function bdHeadPts(r,h){return BD_HEAD.map(p=>[r*p[1],h*p[0]])}
function bdHeadR(y,r,h){const pts=bdHeadPts(r,h);
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];if(y>=a[1]&&y<=b[1])return a[0]+(b[0]-a[0])*(y-a[1])/Math.max(1e-6,b[1]-a[1])}return 0}
// a cap of hair that hugs the skull. keys = [[angle from the face (rad), lowest hair height as a fraction of the head]] — the hairline in front, down to the nape at the back
// bumps [[angle from the face, height fraction, spread in angle, spread in height, extra thickness in m]] raise a quiff / crown without any floating parts; ridge = strand texture amplitude
function bdShell(HR,HH,keys,thick,vol,seg,bumps,ridge){seg=seg||40;bumps=bumps||[];ridge=ridge||0;const ys=[0,.03,.09,.17,.26,.35,.44,.53,.62,.71,.8,.88,.94,.98,1],cut=a=>{a=Math.abs(a);for(let i=0;i<keys.length-1;i++){const p=keys[i],q=keys[i+1];if(a>=p[0]&&a<=q[0]){const t=(a-p[0])/Math.max(1e-6,q[0]-p[0]),s=t*t*(3-2*t);return (p[1]+(q[1]-p[1])*s)*HH}}return keys[keys.length-1][1]*HH};
  const pos=[],idx=[],rows=ys.length+1;     // the last row is the pole that closes the top
  for(let j=0;j<=seg;j++){const f=j/seg*Math.PI*2-Math.PI,c=cut(f);
    for(let i=0;i<rows;i++){if(i===rows-1){pos.push(0,HH+thick+vol*.9,0);continue}
      const y0=ys[i]*HH,y=Math.max(y0,c),u=y/HH;let th=thick+vol*Math.pow(Math.max(0,u-.45)/.55,1.5);
      for(const b of bumps){const da=(f-b[0])/b[2],du=(u-b[1])/b[3];th+=b[4]*Math.exp(-da*da-du*du)}
      if(ridge&&u>.55)th+=ridge*Math.sin(f*17+u*5)*Math.min(1,(u-.55)*4);
      const R=bdHeadR(Math.min(y,HH),HR,HH)+th;pos.push(Math.sin(f)*R,y,Math.cos(f)*R)}}
  for(let j=0;j<seg;j++)for(let i=0;i<rows-1;i++){const a=j*rows+i,b=a+1,c=(j+1)*rows+i,d=c+1;idx.push(a,c,b,b,c,d)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
// one lock of hair: a flat tapered ribbon along a path (head-local coordinates)
function bdLock(head,mat,pts,r0,r1,flat){const n=pts.length,rad=pts.map((_,i)=>r0+(r1-r0)*i/(n-1));const m=new THREE.Mesh(bdTube(pts,rad,6,flat||.55),mat);m.castShadow=false;head.add(m);return m}

// long hair hanging down the back (a curtain behind the head, head-local coordinates)
function bdBackPanel(cz,y0,y1,rx,sz){return bdLoft([{y:y0,rx:rx*.9,rz:sz*.6,cz:cz-.03},{y:y0+(y1-y0)*.35,rx:rx*.98,rz:sz,cz:cz-.012},{y:y1-.05,rx:rx,rz:sz*1.05,cz:cz},{y:y1,rx:rx*.8,rz:sz*.6,cz:cz},{y:y1+.01,rx:rx*.4,rz:sz*.3,cz:cz}],18)}
function bdHair(head,o,M,HR,HH){const st=o.hs||'swept';if(st==='bald')return;const hatOn=o.ht==='cap'||o.ht==='beanie'||o.ht==='bucket',V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const shell=(keys,thick,vol,bumps,ridge)=>{if(hatOn)return;const m=new THREE.Mesh(bdShell(HR,HH,keys,thick,vol,40,bumps,ridge),M.hair);m.castShadow=false;head.add(m)};
  const sph=(mat,x,y,z,a,b,c,rx,ry,rz)=>{const g=new THREE.SphereGeometry(1,10,8);g.scale(a,b,c);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);if(rx||ry||rz)m.rotation.set(rx||0,ry||0,rz||0);head.add(m);return m};
  // height of the head surface above a point z (front/back) on the centre line, so spikes and buns sit on the dome instead of floating
  const yAt=z=>{z=Math.abs(z);for(let y=HH;y>0;y-=HH/60)if(bdHeadR(y,HR,HH)>=z)return y;return 0};
  const back=bdBackPanel;
  if(st==='swept'){shell([[0,.8],[.55,.77],[1.2,.62],[1.65,.5],[2.3,.36],[Math.PI,.3]],.012,.02,[[.25,.93,.6,.17,.034],[.95,.8,.5,.2,.013],[-.7,.82,.5,.18,.01]],.003)}
  else if(st==='short'){shell([[0,.79],[.55,.74],[1.2,.6],[1.65,.5],[2.3,.34],[Math.PI,.26]],.011,.015,[[0,.9,.7,.15,.014]],.0025)}
  else if(st==='buzz'){shell([[0,.7],[.6,.66],[1.3,.52],[1.75,.46],[2.4,.36],[Math.PI,.3]],.005,.004,null,.001)}
  else if(st==='long'){shell([[0,.81],[.55,.79],[1.2,.66],[1.7,.4],[2.4,.2],[Math.PI,.12]],.012,.018,[[.2,.92,.6,.16,.02],[-.9,.78,.5,.2,.01]],.003);
    head.add(new THREE.Mesh(back(-HR*.98,-.3,HH*.78,HR*1.02,HR*.33),M.hair));
    for(const s of [-1,1]){bdLock(head,M.hair,[V(s*HR*1.0,HH*.6,HR*.1),V(s*HR*1.06,HH*.3,HR*.14),V(s*HR*1.08,HH*.0,HR*.18),V(s*HR*1.05,-.12,HR*.2),V(s*HR*1.0,-.22,HR*.18)],.034,.014,.45);
      bdLock(head,M.hair2,[V(s*HR*.95,HH*.7,HR*.25),V(s*HR*1.02,HH*.42,HR*.35),V(s*HR*1.02,HH*.12,HR*.38),V(s*HR*.98,-.1,HR*.34)],.02,.008,.5)}}
  else if(st==='bun'){shell([[0,.8],[.55,.77],[1.2,.62],[1.65,.5],[2.3,.4],[Math.PI,.36]],.012,.02,[[0,.9,.7,.15,.014]],.003);if(!hatOn){sph(M.hair,0,yAt(HR*.45)+.02,-HR*.45,.07,.065,.07);sph(M.hair2,0,yAt(HR*.45)+.055,-HR*.45,.045,.03,.045)}}
  else if(st==='pony'){shell([[0,.8],[.55,.77],[1.2,.62],[1.65,.5],[2.3,.44],[Math.PI,.42]],.012,.02,[[0,.9,.7,.15,.014]],.003);
    bdLock(head,M.hair,[V(0,HH*.8,-HR*.88),V(0,HH*.66,-HR*1.35),V(0,HH*.3,-HR*1.5),V(0,-.04,-HR*1.55),V(0,-.15,-HR*1.5)],.04,.016,.9);sph(M.hair2,0,HH*.78,-HR*.9,.026,.026,.026)}
  else if(st==='mohawk'){if(!hatOn){shell([[0,.72],[.5,.7],[1.2,.6],[1.8,.5],[2.4,.4],[Math.PI,.36]],.004,0,null,.001);
      for(let i=0;i<9;i++){const t=i/8,z=(.82-t*1.64)*HR,y=yAt(z)-.012,mat=i%2?M.hair2:M.hair,up=V(0,1,z/HR*.8).normalize().multiplyScalar(.075+.025*Math.sin(t*Math.PI));
        bdLock(head,mat,[V(0,y,z),V(0,y,z).addScaledVector(up,.5),V(0,y,z).add(up)],.032,.006,.55)}}}
  else if(st==='curly'){shell([[0,.8],[.55,.78],[1.2,.62],[1.65,.5],[2.3,.4],[Math.PI,.34]],.014,.03,[[0,.9,.8,.15,.012]],.002);
    if(!hatOn)for(let i=0;i<34;i++){const a=i*2.399,y=HH*(.46+.52*(((i*37)%34)/34)),R=bdHeadR(y,HR,HH)+.012,x=Math.sin(a)*R,z=Math.cos(a)*R;if(z>HR*.4&&y<HH*.82)continue;
      sph(i%3?M.hair:M.hair2,x,y,z,.05,.05,.05)}}
}

// ears and a nose so the head is not a smooth egg (called by makePlayer)
function bdFace(head,M,HR,HH){for(const s of [-1,1]){const g=new THREE.SphereGeometry(1,10,8);g.scale(.011,.03,.022);const e=new THREE.Mesh(g,M.skin);e.position.set(s*HR*.985,HH*.47,-.006);e.rotation.z=-s*.12;head.add(e)}
  const n=new THREE.SphereGeometry(1,10,8);n.scale(.017,.022,.022);const nm=new THREE.Mesh(n,M.skin);nm.position.set(0,HH*.405,HR*.985);nm.rotation.x=.25;head.add(nm)}
