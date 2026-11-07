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
// glue indexed geometries (position + normal + uv) into one
function bdMerge(list){const pos=[],nor=[],uv=[],idx=[];let o=0;
  for(const g of list){const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv,c=p.count;
    for(let i=0;i<c;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));nor.push(n.getX(i),n.getY(i),n.getZ(i));uv.push(u?u.getX(i):0,u?u.getY(i):0)}
    const ix=g.index.array;for(let i=0;i<ix.length;i++)idx.push(ix[i]+o);o+=c}
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));m.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));m.setIndex(idx);return m}
// a hand with a flat palm, four fingers that curl a little towards the palm and a thumb at the front (the arm hangs along -y, the palm faces the body).
// s = +1 arm on the right (x>0), -1 on the left: the fingers curl towards the body; 0 = symmetric (the instanced pedestrians), fingers curl slightly forward
function bdHand(s,lite){s=s||0;const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  // lite (instanced pedestrians, seen from a distance): palm, one slab for the four fingers and a thumb — about 170 triangles instead of 380
  if(lite)return bdMerge([bdLoft([{y:.045,rx:.015,rz:.014},{y:.005,rx:.016,rz:.02},{y:-.025,rx:.019,rz:.036},{y:-.062,rx:.016,rz:.039},{y:-.072,rx:.009,rz:.033}],8),
    bdLoft([{y:-.06,rx:.013,rz:.036},{y:-.085,rx:.012,rz:.036},{y:-.105,rx:.01,rz:.03},{y:-.123,rx:.006,rz:.02}],8),
    bdTube([V(0,-.008,.03),V(0,-.03,.052),V(0,-.052,.063)],[.0125,.0105,.0075],4,1)]);
  const parts=[bdLoft([{y:.045,rx:.015,rz:.014},{y:.005,rx:.016,rz:.02},{y:-.016,rx:.019,rz:.032},{y:-.04,rx:.02,rz:.04},{y:-.062,rx:.016,rz:.039},{y:-.072,rx:.009,rz:.033}],12)];
  // [z of the knuckle, length, curl scale, radius scale]: index, middle, ring, little finger
  for(const F of [[.03,.064,1,1],[.0105,.07,1.08,1.02],[-.0095,.064,1.15,.96],[-.0285,.05,1.25,.84]]){
    const z=F[0],L=F[1],cs=F[2],rs=F[3],pts=[V(0,-.064,z)],ang=[.1,.42,.78,1.0],seg=[.45,.3,.25];let p=pts[0];
    for(let k=0;k<3;k++){const a=ang[k+1]*cs*.9;p=p.clone().add(V(-s*Math.sin(a),-Math.cos(a),s?0:Math.sin(a)*.25).multiplyScalar(L*seg[k]));pts.push(p)}
    parts.push(bdTube(pts,[.0098*rs,.0092*rs,.0083*rs,.0062*rs],6,1))}
  // thumb: from the side of the palm forward and down
  parts.push(bdTube([V(-s*.006,-.008,.03),V(-s*.011,-.027,.05),V(-s*.013,-.046,.06),V(-s*.011,-.063,.064)],[.0128,.0112,.0098,.0072],6,1));
  return bdMerge(parts)}

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

// realistic face painted on the head's wrap-around texture (same 512x256 layout as the old cartoon one: u around the head with the face at u=.5, v up).
// Proportions follow a real face scaled to this head: brows at v .565, eyes .5, nose tip .345, mouth .225, chin .05.
function bdFaceTex(o){
  const W=512,H=256,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  x.fillStyle=o.bg||'#ffffff';x.fillRect(0,0,W,H);
  const R=(()=>{let s=1234567;return()=>(s=(s*1664525+1013904223)>>>0)/4294967296})(),cx=256,py=v=>(1-v)*H,ex=32,ey=py(.5);
  // soft elliptical blob: centre, radii, colour in the middle fading to transparent
  const blob=(X,Y,rx,ry,rgb,a)=>{const g=x.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba('+rgb+','+a+')');g.addColorStop(1,'rgba('+rgb+',0)');x.save();x.translate(X,Y);x.scale(rx,ry);x.fillStyle=g;x.beginPath();x.arc(0,0,1,0,7);x.fill();x.restore()};
  // skin: pores / tiny freckles, cheek colour, shadow in the eye sockets, at the temples and under the lower lip, soft light on the forehead, nose bridge and chin
  for(let i=0;i<900;i++){x.fillStyle=R()<.5?'rgba(150,95,70,.05)':'rgba(255,245,235,.05)';x.fillRect(cx-110+R()*220,H*.12+R()*H*.7,1+R()*1.6,1+R()*1.6)}
  blob(cx,py(.7),70,34,'255,235,215',.14);blob(cx,py(.45),9,46,'255,238,222',.12);blob(cx,py(.1),20,12,'255,238,222',.12);
  for(const s of [-1,1]){blob(cx+s*52,py(.34),30,22,'214,110,100',.2);blob(cx+s*ex,ey+2,30,22,'110,60,46',.2);blob(cx+s*88,py(.5),30,70,'80,40,30',.15);blob(cx+s*40,py(.14),30,20,'80,40,30',.1)}
  blob(cx,py(.185),22,6,'90,45,35',.2);
  for(const s of [-1,1]){const X=cx+s*ex;
    const almond=()=>{x.beginPath();x.moveTo(X-s*14.5,ey+1);x.quadraticCurveTo(X-s*3,ey-13,X+s*14.5,ey-2);x.quadraticCurveTo(X+s*2,ey+9,X-s*14.5,ey+1);x.closePath()};
    // upper-lid crease and lid fold
    x.strokeStyle='rgba(110,60,45,.4)';x.lineWidth=1.8;x.lineCap='round';x.beginPath();x.moveTo(X-s*12,ey-6);x.quadraticCurveTo(X-s*1,ey-17,X+s*15,ey-6);x.stroke();
    x.fillStyle='#efe9e2';almond();x.fill();
    x.save();almond();x.clip();
    const ir=x.createRadialGradient(X-s*1,ey-.5,1,X-s*1,ey-.5,8.2);ir.addColorStop(0,o.iris||'#4a7cb8');ir.addColorStop(.62,o.iris||'#4a7cb8');ir.addColorStop(1,'#1a1612');
    x.fillStyle=ir;x.beginPath();x.arc(X-s*1,ey-.5,8.2,0,7);x.fill();
    x.fillStyle='#0c0a09';x.beginPath();x.arc(X-s*1,ey-.5,3.6,0,7);x.fill();
    x.fillStyle='rgba(255,255,255,.9)';x.beginPath();x.arc(X-s*1+3,ey-4,1.9,0,7);x.fill();x.beginPath();x.arc(X-s*1-2.5,ey+2.5,1,0,7);x.fill();
    const lg=x.createLinearGradient(0,ey-10,0,ey+2);lg.addColorStop(0,'rgba(20,10,8,.55)');lg.addColorStop(1,'rgba(20,10,8,0)');x.fillStyle=lg;x.fillRect(X-16,ey-10,32,13);
    x.restore();
    x.strokeStyle='#1d1310';x.lineWidth=3.2;x.beginPath();x.moveTo(X-s*14.5,ey+1);x.quadraticCurveTo(X-s*3,ey-13,X+s*14.5,ey-2);x.stroke();                       // upper lashes
    x.lineWidth=1.8;x.beginPath();x.moveTo(X+s*14.5,ey-2);x.lineTo(X+s*18,ey-5);x.stroke();
    x.strokeStyle='rgba(120,70,60,.55)';x.lineWidth=1.3;x.beginPath();x.moveTo(X-s*13,ey+1.5);x.quadraticCurveTo(X+s*2,ey+9.5,X+s*14,ey-1);x.stroke();               // lower lid
    x.fillStyle='rgba(210,120,115,.7)';x.beginPath();x.arc(X-s*14,ey+1.5,2,0,7);x.fill();                                                                           // tear duct
    // eyebrow: a soft base and ~60 hair strokes along an arch
    const bc=o.brow||'#5a3e26',bx0=X-s*16,by0=py(.545),bx1=X+s*3,by1=py(.585),bx2=X+s*24,by2=py(.535);
    x.strokeStyle=bc;x.globalAlpha=.3;x.lineWidth=8;x.beginPath();x.moveTo(bx0,by0);x.quadraticCurveTo(bx1,by1-5,bx2,by2);x.stroke();x.globalAlpha=1;
    for(let i=0;i<60;i++){const t=i/59,tx=(1-t)*(1-t)*bx0+2*(1-t)*t*bx1+t*t*bx2,ty=(1-t)*(1-t)*by0+2*(1-t)*t*(by1-5)+t*t*by2,th=(.5-Math.abs(t-.35))*7+2.5,j=(R()-.5)*th;
      x.globalAlpha=.55+R()*.4;x.lineWidth=1.1;x.beginPath();x.moveTo(tx-s*2,ty+j+th*.4);x.lineTo(tx+s*3,ty+j-th*.4-(t<.3?2:0));x.stroke()}x.globalAlpha=1}
  // nose: shaded sides of the bridge, wings, nostrils, bright tip, shadow underneath
  for(const s of [-1,1]){blob(cx+s*11,py(.42),6,24,'125,72,56',.2);blob(cx+s*17,py(.335),8,8,'160,88,72',.26);x.fillStyle='rgba(55,22,18,.72)';x.beginPath();x.ellipse(cx+s*8,py(.318),4.8,2.8,s*.4,0,7);x.fill()}
  blob(cx,py(.355),8,7,'255,240,228',.34);blob(cx,py(.297),14,4,'90,45,35',.26);
  // mouth: philtrum, lips with a cupid's bow, dark parting line, corner shadows, chin light
  const my=py(.228),mc=py(.236);
  blob(cx,py(.265),5,10,'125,72,56',.12);
  x.fillStyle='rgba(172,88,82,.92)';x.beginPath();x.moveTo(cx-26,mc);x.bezierCurveTo(cx-18,my-4,cx-9,my-11,cx-4,my-10);x.quadraticCurveTo(cx,my-6,cx+4,my-10);x.bezierCurveTo(cx+9,my-11,cx+18,my-4,cx+26,mc);x.quadraticCurveTo(cx,my+2,cx-26,mc);x.fill();
  x.fillStyle='rgba(190,104,98,.95)';x.beginPath();x.moveTo(cx-26,mc);x.quadraticCurveTo(cx,my+2,cx+26,mc);x.bezierCurveTo(cx+20,my+15,cx+8,my+20,cx,my+20);x.bezierCurveTo(cx-8,my+20,cx-20,my+15,cx-26,mc);x.fill();
  blob(cx,my+10,10,3.4,'255,226,216',.4);
  x.strokeStyle='rgba(70,26,24,.9)';x.lineWidth=2.1;x.lineCap='round';x.beginPath();x.moveTo(cx-27,mc-2);x.quadraticCurveTo(cx,my+2.5,cx+27,mc-2);x.stroke();
  for(const s of [-1,1])blob(cx+s*28,mc-3,5,5,'90,40,34',.22);
  blob(cx,py(.12),13,6,'255,238,224',.14);
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}

// ears and a nose so the head is not a smooth egg (called by makePlayer)
function bdFace(head,M,HR,HH){for(const s of [-1,1]){const g=new THREE.SphereGeometry(1,10,8);g.scale(.011,.03,.022);const e=new THREE.Mesh(g,M.skin);e.position.set(s*HR*.985,HH*.47,-.006);e.rotation.z=-s*.12;head.add(e)}
  const n=new THREE.SphereGeometry(1,10,8);n.scale(.0125,.017,.019);const nm=new THREE.Mesh(n,M.skin);nm.position.set(0,HH*.35,HR*.985);nm.rotation.x=.25;head.add(nm)}

// wet eyes: a flattened glossy cap over each painted eye that only adds the sun's / lamps' specular highlight (black diffuse + additive blending), so the eyes catch the light and move with the head
let BD_CORNEA=null;
function bdEyes(head,HR,HH){if(!BD_CORNEA)BD_CORNEA=new THREE.MeshPhongMaterial({color:0x000000,specular:0xffffff,shininess:260,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  const y=HH*.5,R=bdHeadR(y,HR,HH),g=new THREE.SphereGeometry(1,10,8);g.scale(.0112,.0092,.0045);
  for(const s of [-1,1]){const a=s*.393,m=new THREE.Mesh(g,BD_CORNEA);m.position.set(Math.sin(a)*(R+.0004),y,Math.cos(a)*(R+.0004));m.rotation.y=a;m.castShadow=false;head.add(m)}}
// warm blood-red rim on skin where the surface turns away from the eye — a cheap stand-in for subsurface scattering on ears, nose, cheeks and fingers
function bdSkinRim(m){m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float rim=pow(1.0-clamp(abs(dot(normalize(vNormal),normalize(vViewPosition))),0.0,1.0),2.6);totalEmissiveRadiance+=vec3(.42,.14,.08)*rim*.3;}')};
  m.customProgramCacheKey=()=>'skinrim';m.needsUpdate=true}

// ---- cloth: a tiny tileable bump texture per weave (weave / twill / knit) so shirts and jeans catch the light like fabric instead of plastic.
// 64 px tiles, mip-mapped, so it only shows up close and never shimmers at a distance. Shared by every material of that kind.
const BD_FAB={};
function bdFabric(mat,kind,scale){
  let t=BD_FAB[kind];
  if(!t){const N=64,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d'),im=g.createImageData(N,N);let s=17;const r=()=>(s=(s*16807)%2147483647)/2147483647;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v;
      if(kind==='twill')v=((x+y)>>1)&1?.62:.38;                                  // diagonal ridges (denim)
      else if(kind==='knit')v=((x%4)<2?((y+(x>>2&1)*2)%4<2?.66:.4):.3);            // rows of little stitches
      else v=(((x>>1)+(y>>1))&1)?.6:.4;                                           // plain weave
      v+=(r()-.5)*.12;const o=(y*N+x)*4,c=Math.max(0,Math.min(255,v*255))|0;im.data[o]=im.data[o+1]=im.data[o+2]=c;im.data[o+3]=255}
    g.putImageData(im,0,0);t=BD_FAB[kind]=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,10);t.anisotropy=2}
  mat.bumpMap=t;mat.bumpScale=scale||.5;mat.needsUpdate=true}
