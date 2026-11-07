/* ===================================================================================================
   hands.js — articulated hands and arm reach for the avatar (plain procedural geometry, no files):
     hdHand(s,mat)        a hand with a palm, four three-joint fingers and a two-joint thumb; every joint is a Group you can bend
     hdGrip(P,i,curls)    asks the hand of arm i to take a pose (five curls, 0 = flat, 1 = fist); hdTick() eases towards it every frame
     hdReach(P,A,T,o)     two-bone arm solver: puts the hand at a point T of the spine's space (shoulder + elbow angles, exact)
     hdPalm(A,n)          rolls the wrist so the palm looks along n (so two palms can face each other)
   makePlayer() (index.html) builds its hands with hdHand; acts.js uses the solver for the fridge, the sink and the glass.
   Loaded BEFORE the main script; only touches THREE / bd* helpers at call time.
   =================================================================================================== */

const HD={UA:.27,FA:.205,geo:{},
  // finger knuckle z (index at the front), phalanx lengths, base radius
  fz:[.03,.0105,-.0095,-.0285],fl:[[.03,.019,.015],[.033,.021,.016],[.03,.02,.015],[.024,.015,.012]],fr:[.0098,.0102,.0094,.0082],
  // relaxed hand: index .. little finger, thumb — a loose cascade like a real hanging hand
  rest:[.16,.2,.26,.32,.14],
  // grips: [index, middle, ring, little, thumb]
  pose:{flat:[0,0,0,0,0],relax:[.16,.2,.26,.32,.14],can:[.6,.66,.7,.72,.5],glass:[.5,.54,.56,.58,.35],bar:[.78,.82,.84,.84,.6],carton:[.46,.5,.52,.52,.4],point:[0,.92,.95,.95,.6],pinch:[.55,.35,.25,.25,.6],cup:[.3,.32,.34,.36,.22],lace:[.55,.58,.6,.62,.35]}};

// a finger segment hanging along -y from its joint: rounded at both ends, a little flat front-to-back
function hdSeg(L,r){const k=L.toFixed(4)+'/'+r.toFixed(4);
  return HD.geo[k]||(HD.geo[k]=bdLoft([{y:.003,rx:r*.5,rz:r*.5},{y:0,rx:r*.93,rz:r*.9},{y:-L*.15,rx:r,rz:r*.96},{y:-L*.85,rx:r*.92,rz:r*.88},{y:-L+.001,rx:r*.72,rz:r*.68},{y:-L-.002,rx:r*.34,rz:r*.32}],8))}

// s = +1 for the arm on the right (x>0), -1 on the left. Palm faces the body (-s x), the thumb points forward (+z). Origin = end of the forearm, y down.
function hdHand(s,mat){const G=new THREE.Group(),fing=[];
  const palm=new THREE.Mesh(bdLoft([{y:.045,rx:.015,rz:.014},{y:.005,rx:.016,rz:.02},{y:-.016,rx:.019,rz:.032},{y:-.04,rx:.02,rz:.04},{y:-.062,rx:.016,rz:.039},{y:-.072,rx:.009,rz:.033}],12),mat);G.add(palm);
  for(let i=0;i<4;i++){const L=HD.fl[i],r=HD.fr[i],j1=new THREE.Group();j1.position.set(0,-.064,HD.fz[i]);G.add(j1);j1.add(new THREE.Mesh(hdSeg(L[0],r),mat));
    const j2=new THREE.Group();j2.position.y=-L[0];j1.add(j2);j2.add(new THREE.Mesh(hdSeg(L[1],r*.93),mat));
    const j3=new THREE.Group();j3.position.y=-L[1];j2.add(j3);j3.add(new THREE.Mesh(hdSeg(L[2],r*.86),mat));fing.push([j1,j2,j3])}
  const t1=new THREE.Group();t1.position.set(-s*.008,-.014,.03);G.add(t1);t1.add(new THREE.Mesh(hdSeg(.034,.0125),mat));
  const t2=new THREE.Group();t2.position.y=-.034;t1.add(t2);t2.add(new THREE.Mesh(hdSeg(.028,.0108),mat));
  G.userData.rig={s,f:fing,th:[t1,t2],cur:HD.rest.slice(),tgt:HD.rest.slice()};hdApply(G);return G}

// bend the joints for the current curls
function hdApply(G){const R=G.userData.rig,s=R.s,c=R.cur,avg=(c[0]+c[1]+c[2]+c[3])/4,sp=.11*(1-avg);
  for(let i=0;i<4;i++){const f=R.f[i],k=c[i];f[0].rotation.set(-(1.5-i)*sp*.55,0,-s*k*1.35);f[1].rotation.z=-s*k*1.65;f[2].rotation.z=-s*k*1.05}
  const k=c[4];R.th[0].rotation.set(-.62+.34*k,0,-s*(.12+.75*k));R.th[1].rotation.z=-s*(.2+.95*k)}

// ease a hand towards its target curls; k = speed (per second)
function hdStep(G,dt,k){const R=G.userData.rig;if(!R)return;const f=1-Math.exp(-dt*(k||14));let moved=false;
  for(let i=0;i<5;i++){const d=R.tgt[i]-R.cur[i];if(Math.abs(d)>1e-3){R.cur[i]+=d*f;moved=true}}if(moved)hdApply(G)}

// pose by name or by five numbers
function hdGrip(P,i,pose){const A=P.arms[i];if(!A||!A.hand.userData.rig)return;const q=typeof pose==='string'?HD.pose[pose]:pose;A.hand.userData.rig.tgt=q.slice()}

// every frame, after the base animation: a hand that nobody is steering relaxes (the can hand holds the can), then eases to its pose
function hdTick(P,dt){if(!P.arms||!P.arms[0].hand.userData.rig)return;
  P.arms.forEach((A,i)=>{const R=A.hand.userData.rig;if(!R)return;
    if(!P.hdHold||!P.hdHold[i]){const can=i===0&&P.can&&P.can.visible,spk=i===1&&P.speaker&&P.speaker.visible;
      if(can)R.tgt=HD.pose.can.slice();else if(spk)R.tgt=HD.pose.bar.slice();else{const t=performance.now()*.0007+i*2;R.tgt=HD.rest.map((v,k)=>v+Math.sin(t+k*.9)*.025)}}
    hdStep(A.hand,dt,14)})}

// ---------- arm reach ----------
// the shoulder rotates (x, then z — Euler XYZ) and the elbow hinges about x. Hand origin target T is in the spine's space.
// Returns how far the arm had to stretch (1 = at full reach) so callers can see when a target is out of range.
function hdReach(A,T,o){o=o||{};const UA=HD.UA,FA=HD.FA,S=A.sh.position;
  let wx=T.x-S.x,wy=T.y-S.y,wz=T.z-S.z,d=Math.hypot(wx,wy,wz)||1e-4;
  const mn=Math.abs(UA-FA)+.012,mx=UA+FA-.003,dc=Math.min(mx,Math.max(mn,d)),k=dc/d;wx*=k;wy*=k;wz*=k;
  const cosi=Math.max(-1,Math.min(1,(UA*UA+FA*FA-dc*dc)/(2*UA*FA))),e=-(Math.PI-Math.acos(cosi));
  const v0y=-UA-FA*Math.cos(e),v0z=-FA*Math.sin(e);
  const sz=Math.max(-.98,Math.min(.98,-wx/v0y)),tz=Math.asin(sz),y1=v0y*Math.cos(tz),tx=Math.atan2(wz,wy)-Math.atan2(v0z,y1);
  A.sh.rotation.x=tx;A.sh.rotation.z=tz;A.el.rotation.x=e;return d/mx}

// where the hand origin is now, in the spine's space (forward kinematics of the same two joints)
const _hdv=new THREE.Vector3();
function hdHandPos(A,out){out=out||_hdv;const e=A.el.rotation.x,x=A.sh.rotation.x,z=A.sh.rotation.z,v0y=-HD.UA-HD.FA*Math.cos(e),v0z=-HD.FA*Math.sin(e);
  const y1=v0y*Math.cos(z),x1=-v0y*Math.sin(z);const cy=Math.cos(x),sy=Math.sin(x);
  return out.set(A.sh.position.x+x1,A.sh.position.y+y1*cy-v0z*sy,A.sh.position.z+y1*sy+v0z*cy)}

// the forearm's direction (unit, spine space) for the current angles
function hdForearm(A,out){const e=A.el.rotation.x,x=A.sh.rotation.x,z=A.sh.rotation.z,fy=-Math.cos(e),fz=-Math.sin(e);
  const y1=fy*Math.cos(z),x1=-fy*Math.sin(z),cy=Math.cos(x),sy=Math.sin(x);return out.set(x1,y1*cy-fz*sy,y1*sy+fz*cy)}

// place the PALM CENTRE of the hand at P (spine space): the hand origin sits palmLen back along the forearm
function hdReachPalm(A,P,o){const f=new THREE.Vector3(),T=new THREE.Vector3(),back=(o&&o.back)||.036;
  hdForearm(A,f);if(f.lengthSq()<.5)f.set(0,-1,0);
  for(let i=0;i<3;i++){T.copy(P).addScaledVector(f,-back);hdReach(A,T,o);hdForearm(A,f)}return hdReach(A,T.copy(P).addScaledVector(f,-back),o)}

// roll the wrist (about the forearm) so the palm normal — -s x in the hand frame — points along n (spine space); flex bends the wrist forward
const _hdn=new THREE.Vector3(),_hdf=new THREE.Vector3(),_hdq=new THREE.Quaternion();
function hdPalm(A,n,flex,dev){const H=A.hand,s=A.s;H.rotation.set(flex||0,0,dev||0);
  // forearm frame in the spine's space
  const q=_hdq.setFromEuler(A.sh.rotation);const qe=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),A.el.rotation.x);q.multiply(qe);
  const f=hdForearm(A,_hdf),nn=_hdn.set(-s,0,0).applyQuaternion(q);
  const a=nn.clone().addScaledVector(f,-nn.dot(f)).normalize(),b=n.clone().addScaledVector(f,-n.dot(f));if(b.lengthSq()<1e-6)return;b.normalize();
  const ang=Math.atan2(a.clone().cross(b).dot(f),a.dot(b));H.rotation.y=-ang}
