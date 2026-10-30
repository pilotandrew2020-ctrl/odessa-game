/* ===================================================================================================
   brbuild.js — HARVEST + BUILD for the Battle Royale (global BLD).  Original parody of the "gather, then build a fort in a fight" loop.
     harvesting   the pickaxe hits trees (wood), buildings (brick), cars / lamp posts / parked things (metal) and my own pieces (damage);
                  every hit pops "+20" over the target, a lucky hit gives +35; a tree falls after 7-8 hits and leaves the map
     building     Q = build mode (the hotbar turns into WALL / FLOOR / STAIRS / ROOF, 1-4 pick, T or a tap on the counters cycles WOOD / BRICK / METAL);
                  fire places the ghost piece (10 material).  A global 4 m grid, 3 m storeys:  a wall stands on the grid line ahead, a floor / roof in
                  the cell ahead (look up = the next storey), stairs climb in the direction you face.  Pieces snap to the storey of their neighbours.
     physics      walls are STATIC_WALLS boxes (so the player, bots, bullets, rockets and line-of-sight already respect them); floors and stairs are
                  a walkable `holdSpecial` surface (stairs = 8 steps of 0.375 m); bullets are tested by BLD.ray, rockets by BLD.boom; pieces have hp
                  (wood 100 / brick 160 / metal 230), crack at 45 % and break into chunks
     friends      BLD.pub() / BLD.sync(list) carry the newest own pieces through the co-op presence so both players see the same fort
   hooks: BR.start → BLD.start · BR.end → BLD.end · BR.tick → BLD.tick · BR.fire → BLD.place (build mode) · BR.swingHit → BLD.harvest · BR.boom → BLD.boom
   =================================================================================================== */
const BLD=(()=>{
const G=4,H=3,STEP=H/8,TH=.22,COST=10,CAP=999,TILE=2;
const MT=[{id:'wood',n:'Wood',col:'#e0a050',hp:100,sfc:'wood',dust:[[.78,.56,.3],[.5,.4,.3]],deb:0xa8722f},
          {id:'stone',n:'Brick',col:'#cfc9bb',hp:160,sfc:'stone',dust:[[.74,.73,.7],[.55,.55,.55]],deb:0x9c988e},
          {id:'metal',n:'Metal',col:'#7cb8ee',hp:230,sfc:'metal',dust:[[.72,.8,.9],[.5,.56,.64]],deb:0x7d8b99}];
const KN=[{id:'w',n:'Wall'},{id:'f',n:'Floor'},{id:'s',n:'Stairs'},{id:'r',n:'Roof'}];
const IC={w:'<svg viewBox="0 0 40 34"><rect x="5" y="3" width="30" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M5 12h30M5 21h30M17 3v9M27 12v9M13 21v10" stroke="currentColor" stroke-width="1.6" opacity=".75"/></svg>',
  f:'<svg viewBox="0 0 40 34"><path d="M4 22 20 12 36 22 20 32Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 17l16 10M28 17 12 27" stroke="currentColor" stroke-width="1.5" opacity=".7"/></svg>',
  s:'<svg viewBox="0 0 40 34"><path d="M4 30h9v-7h9v-7h9v-7h5v21z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  r:'<svg viewBox="0 0 40 34"><path d="M3 28 20 5 37 28Z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M20 5v23M11 28l9-14M29 28l-9-14" stroke="currentColor" stroke-width="1.5" opacity=".7"/></svg>'};
const MI=['<svg viewBox="0 0 24 24"><path d="M3 18h18M5 12.5h14M8 7h8" stroke="#e0a050" stroke-width="3.6" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 24 24"><g fill="#cfc9bb"><rect x="2" y="4" width="9" height="6" rx="1"/><rect x="13" y="4" width="9" height="6" rx="1"/><rect x="2" y="14" width="5" height="6" rx="1"/><rect x="9" y="14" width="9" height="6" rx="1"/><rect x="20" y="14" width="2" height="6" rx="1"/></g></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 2.2 20 6.8v9.4L12 20.8 4 16.2V6.8z" fill="#7cb8ee"/><path d="M12 2.2 20 6.8 12 11.4 4 6.8z" fill="#bfe0ff"/><path d="M12 11.4v9.4" stroke="#3a6a96" stroke-width="1.2"/></svg>'];

const P=[],keyOf=new Map(),cells=new Map(),cut=[],hits=new Map(),falls=[],pops=[];
const st={mode:false,kind:'w',mat:0,mats:[0,0,0],gy:0,ghost:null,cur:null,tcut:0,dirty:true,inited:false,ui:null,cd:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ck=(i,j)=>(i+32768)*65536+(j+32768);
const mobile=()=>typeof MOBILE!=='undefined'&&MOBILE;
const maxP=()=>mobile()?90:150;

// ---------------------------------------------------------------- sounds (tiny synth, like br.js)
function ac(){const a=GUN.ac||(GUN.ac=new (window.AudioContext||window.webkitAudioContext)());if(a.state==='suspended')a.resume();return a}
function tone(a,f,d,type,v,f2,dl){const T=a.currentTime+(dl||0),o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,T);if(f2)o.frequency.exponentialRampToValueAtTime(f2,T+d);g.gain.setValueAtTime(v||.12,T);g.gain.exponentialRampToValueAtTime(.001,T+d);o.connect(g);g.connect(a.destination);o.start(T);o.stop(T+d+.02)}
function noise(a,d,v,fc,q,dl){const T=a.currentTime+(dl||0),n=Math.max(1,Math.floor(a.sampleRate*d)),b=a.createBuffer(1,n,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<n;i++)c[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=fc||1200;f.Q.value=q||1;const g=a.createGain();g.gain.value=v||.2;s.connect(f);f.connect(g);g.connect(a.destination);s.start(T)}
function sfx(k,mat){try{const a=ac();
  if(k==='build'){tone(a,120,.16,'square',.1,60);tone(a,300+mat*120,.12,'triangle',.07,720+mat*150,.03);noise(a,.1,.14,mat===2?3000:1000,1)}
  else if(k==='deny'){tone(a,200,.14,'square',.08,120)}
  else if(k==='hit'){if(mat===0){tone(a,170,.12,'square',.1,70);noise(a,.08,.16,900,1.4)}else if(mat===1){noise(a,.12,.22,1800,.8);tone(a,260,.08,'square',.05,120)}else{tone(a,1250,.28,'triangle',.1,900);tone(a,1830,.22,'sine',.05,1500);noise(a,.05,.1,4200,2)}}
  else if(k==='break'){noise(a,.4,.3,mat===2?2600:700,.7);tone(a,mat===2?420:110,.35,'sawtooth',.08,40)}
  else if(k==='fell'){noise(a,.7,.25,500,.6);tone(a,90,.7,'sawtooth',.1,35);tone(a,60,.5,'sine',.1,28,.5)}
  else if(k==='mat'){tone(a,880,.06,'triangle',.06,1320)}}catch(e){}}

// ---------------------------------------------------------------- textures + geometry (made once, shared by every piece)
let TXS=null,GEO=null,MAT=null,CRK=null;
const rnd=(()=>{let s=20261030;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}})();
function mkTex(draw){const cv=document.createElement('canvas');cv.width=cv.height=256;draw(cv.getContext('2d'),256);const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}
function textures(){if(TXS)return TXS;
  const wood=mkTex((x,n)=>{const pl=4,ph=n/pl;x.fillStyle='#b27a38';x.fillRect(0,0,n,n);
    for(let p=0;p<pl;p++){const y0=p*ph;x.fillStyle=['#bb823e','#a9732f','#c48b47','#b17a3b'][p];x.fillRect(0,y0,n,ph);
      for(let g=0;g<46;g++){x.strokeStyle='rgba('+(rnd()<.5?'62,34,10':'255,222,150')+','+(.07+rnd()*.1)+')';x.lineWidth=1+rnd()*1.5;x.beginPath();const gy=y0+4+rnd()*(ph-8);x.moveTo(0,gy);x.bezierCurveTo(n*.3,gy+(rnd()-.5)*6,n*.6,gy+(rnd()-.5)*6,n,gy+(rnd()-.5)*4);x.stroke()}
      x.fillStyle='rgba(70,38,14,.55)';x.beginPath();x.ellipse(36+rnd()*180,y0+12+rnd()*(ph-24),5+rnd()*5,3+rnd()*2.5,0,0,7);x.fill();
      x.fillStyle='#3d2208';x.fillRect(0,y0,n,3);x.fillStyle='rgba(255,232,172,.28)';x.fillRect(0,y0+3,n,1.5);
      for(const nx of [10,n-10]){x.fillStyle='#34302c';x.beginPath();x.arc(nx,y0+ph/2,2.4,0,7);x.fill()}}});
  const stone=mkTex((x,n)=>{const rows=8,bh=n/rows,bw=n/4;x.fillStyle='#6c6962';x.fillRect(0,0,n,n);
    for(let r=0;r<rows;r++){const off=(r%2)*bw/2;for(let c=-1;c<5;c++){const bx=c*bw+off,by=r*bh,v=rnd();x.fillStyle='rgb('+(150+v*42|0)+','+(145+v*38|0)+','+(136+v*34|0)+')';x.fillRect(bx+2,by+2,bw-4,bh-4);
        x.fillStyle='rgba(255,255,255,.16)';x.fillRect(bx+2,by+2,bw-4,2);x.fillStyle='rgba(0,0,0,.2)';x.fillRect(bx+2,by+bh-4,bw-4,2);
        for(let k=0;k<12;k++){x.fillStyle='rgba(0,0,0,'+(rnd()*.09)+')';x.fillRect(bx+3+rnd()*(bw-8),by+3+rnd()*(bh-8),2+rnd()*5,2)}}}});
  const metal=mkTex((x,n)=>{const w=16;x.fillStyle='#7d8b99';x.fillRect(0,0,n,n);
    for(let i=0;i<n/w;i++){const g=x.createLinearGradient(i*w,0,(i+1)*w,0);g.addColorStop(0,'#c2cfdc');g.addColorStop(.5,'#7a8998');g.addColorStop(1,'#4d5a67');x.fillStyle=g;x.fillRect(i*w,0,w,n)}
    x.fillStyle='rgba(18,26,34,.6)';x.fillRect(0,0,n,4);x.fillRect(0,n/2-2,n,4);
    for(const sy of [11,n/2+11])for(let i=0;i<n/w;i++){x.fillStyle='#2c3640';x.beginPath();x.arc(i*w+w/2,sy,2.1,0,7);x.fill();x.fillStyle='rgba(255,255,255,.4)';x.fillRect(i*w+w/2-1,sy-2,1.5,1.5)}
    for(let k=0;k<26;k++){x.strokeStyle='rgba(255,255,255,'+(.04+rnd()*.07)+')';x.lineWidth=1;x.beginPath();const sx=rnd()*n;x.moveTo(sx,rnd()*n);x.lineTo(sx+(rnd()-.5)*30,rnd()*n);x.stroke()}});
  return TXS=[wood,stone,metal]}
// a list of boxes [cx,cy,cz,sx,sy,sz,shade] → one BufferGeometry (world-scale UVs so the texture repeats every TILE metres)
const FACES=[[1,0,0,0,0,-1,0,1,0],[-1,0,0,0,0,1,0,1,0],[0,1,0,1,0,0,0,0,-1],[0,-1,0,1,0,0,0,0,1],[0,0,1,1,0,0,0,1,0],[0,0,-1,-1,0,0,0,1,0]];
function boxes(list){const pos=[],nor=[],uv=[],col=[],idx=[];let v=0;
  for(const [cx,cy,cz,sx,sy,sz,sh] of list){const h=[sx/2,sy/2,sz/2];
    for(const [nx,ny,nz,ux,uy,uz,wx,wy,wz] of FACES){const hn=Math.abs(nx)*h[0]+Math.abs(ny)*h[1]+Math.abs(nz)*h[2],hu=Math.abs(ux)*h[0]+Math.abs(uy)*h[1]+Math.abs(uz)*h[2],hw=Math.abs(wx)*h[0]+Math.abs(wy)*h[1]+Math.abs(wz)*h[2];
      for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const px=cx+nx*hn+ux*hu*a+wx*hw*b,py=cy+ny*hn+uy*hu*a+wy*hw*b,pz=cz+nz*hn+uz*hu*a+wz*hw*b;
        pos.push(px,py,pz);nor.push(nx,ny,nz);uv.push((px*ux+py*uy+pz*uz)/TILE,(px*wx+py*wy+pz*wz)/TILE);col.push(sh,sh,sh)}
      idx.push(v,v+1,v+2,v,v+2,v+3);v+=4}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeBoundingSphere();return g}
function roofGeo(){const pos=[],nor=[],uv=[],col=[],idx=[],hh=1.7,r=G/2+.15,C=[[-r,0,-r],[r,0,-r],[r,0,r],[-r,0,r]];let v=0;
  for(let i=0;i<4;i++){const a=C[i],b=C[(i+1)%4],A=[0,hh,0],el=Math.hypot(b[0]-a[0],b[2]-a[2]),sl=Math.hypot(r,hh);
    // outward normal = (apex-a) x (b-a); the triangle runs a → apex → b so it faces the same way
    const e1=[b[0]-a[0],0,b[2]-a[2]],e2=[A[0]-a[0],A[1]-a[1],A[2]-a[2]];let nx=e2[1]*e1[2]-e2[2]*e1[1],ny=e2[2]*e1[0]-e2[0]*e1[2],nz=e2[0]*e1[1]-e2[1]*e1[0];const nl=Math.hypot(nx,ny,nz);nx/=nl;ny/=nl;nz/=nl;
    for(const [p,u,w,s] of [[a,0,0,.9],[A,el/2,sl,1],[b,el,0,.9]]){pos.push(p[0],p[1],p[2]);nor.push(nx,ny,nz);uv.push(u/TILE,w/TILE);col.push(s,s,s)}
    idx.push(v,v+1,v+2);v+=3}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeBoundingSphere();return g}
function assets(){if(GEO)return;const tx=textures();
  const stairs=[];for(let i=0;i<8;i++){const top=(i+1)*STEP,z=-G/2+i*.5+.25;stairs.push([0,(top-.5)/2,z,G-.34,top+.5,.5,1]);for(const s of [-1,1])stairs.push([s*(G/2-.085),(top+.04-.5)/2,z,.17,top+.54,.5,.78])}
  GEO={w:boxes([[0,1.19,0,G-.1,3.38,.12,1],[-(G/2-.12),1.25,0,.24,3.5,TH,.78],[G/2-.12,1.25,0,.24,3.5,TH,.78],[0,H-.12,0,G,.24,TH,.82],[0,.12,0,G,.24,TH,.82]]),
    f:boxes([[0,-.095,0,G-.1,.17,G-.1,1],[0,-.15,-(G/2-.1),G,.3,.2,.78],[0,-.15,G/2-.1,G,.3,.2,.78],[-(G/2-.1),-.15,0,.2,.3,G-.4,.78],[G/2-.1,-.15,0,.2,.3,G-.4,.78]]),
    s:boxes(stairs),r:roofGeo()};
  const rough=[.85,.92,.42],met=[0,0,.55];
  MAT=tx.map((t,i)=>new THREE.MeshStandardMaterial({map:t,vertexColors:true,roughness:rough[i],metalness:met[i]}));
  CRK=tx.map((t,i)=>new THREE.MeshStandardMaterial({map:t,vertexColors:true,color:0x8d8a86,roughness:rough[i],metalness:met[i]}));
  st.ghost=new THREE.Mesh(GEO.w,new THREE.MeshBasicMaterial({color:0x7fd6ff,transparent:true,opacity:.45,depthWrite:false,side:THREE.DoubleSide}));st.ghost.visible=false;st.ghost.renderOrder=4;st.ghost.frustumCulled=false;scene.add(st.ghost)}

// ---------------------------------------------------------------- pieces
const DIRS=[[0,1],[1,0],[0,-1],[-1,0]];
const key=(t,i,j,ax,y)=>(t==='w'?'w|'+ax+'|':t==='r'?'r|':'c|')+i+'|'+j+'|'+Math.round(y*2);
function stairH(p,x,z){const d=DIRS[p.dir],u=((x-p.x)*d[0]+(z-p.z)*d[1]+G/2)/G;return p.y+(clamp(Math.floor(u*8),0,7)+1)*STEP}
// the walkable surface of floors and stairs (flagged .hold: stepPlayer / groundAt / bots use it; a surface above head height is walked under)
function surf(x,z,y){if(!P.length)return null;const l=cells.get(ck(Math.floor(x/G),Math.floor(z/G)));if(!l)return null;let h=null,m=0;
  for(const p of l){const s=p.t==='f'?p.y:stairH(p,x,z);if(s<=y+.95&&(h===null||s>h)){h=s;m=p.mat}}
  return h===null?null:{h,pri:6,surf:MT[m].sfc,wall:false}}
function build(t,mat,i,j,ax,dir,y,mine){assets();const k=key(t,i,j,ax,y);if(keyOf.has(k))return null;
  while(P.length>=maxP())kill(P[0],false);
  const p={k,t,mat,i,j,ax,dir,y,hp:MT[mat].hp,max:MT[mat].hp,grow:0,shk:0,crk:0,cols:[],mine:!!mine,dead:false};
  if(t==='w'){p.x=ax?i*G:(i+.5)*G;p.z=ax?(j+.5)*G:j*G;p.rot=ax?Math.PI/2:0}else{p.x=(i+.5)*G;p.z=(j+.5)*G;p.rot=t==='s'?Math.atan2(DIRS[dir][0],DIRS[dir][1]):0}
  const m=new THREE.Mesh(GEO[t],MAT[mat]);m.position.set(p.x,y,p.z);m.rotation.y=p.rot;m.scale.y=.05;m.castShadow=true;m.receiveShadow=true;scene.add(m);p.m=m;
  // collisions: the same boxes the city uses, so everything that already walks / shoots / sees through insideAny respects the piece
  const col=(cx,cz,hw,hd,ca,sa,y0,y1)=>{const o={cx,cz,hw,hd,ca,sa,y0,y1,_b:p};STATIC_WALLS.push(o);p.cols.push(o)};
  if(t==='w'){col(p.x,p.z,G/2,.14,ax?0:1,ax?1:0,y-.1,y+H-1.2)}
  else if(t==='s'){const d=DIRS[dir],sx=-d[1],sz=d[0];       // two rails along the sides and a back wall: you climb in from the low end only
    for(const s of [-1,1])col(p.x+sx*s*(G/2-.07),p.z+sz*s*(G/2-.07),G/2,.1,d[0]?1:0,d[0]?0:1,y,y+H-1.2);
    col(p.x+d[0]*(G/2-.1),p.z+d[1]*(G/2-.1),G/2,.1,d[0]?0:1,d[0]?1:0,y,y+.8)}      // low back wall: stops you walking in under the stairs, but the climber at step 6+ is above it (insideAny keeps walls to y1+1)
  if(t==='f'||t==='s'){const c=ck(i,j);let l=cells.get(c);if(!l)cells.set(c,l=[]);l.push(p)}
  P.push(p);keyOf.set(k,p);st.dirty=true;return p}
function kill(p,fx){if(!p||p.dead)return;p.dead=true;const i=P.indexOf(p);if(i>=0)P.splice(i,1);keyOf.delete(p.k);
  for(const o of p.cols){const q=STATIC_WALLS.indexOf(o);if(q>=0)STATIC_WALLS.splice(q,1)}
  if(p.t==='f'||p.t==='s'){const l=cells.get(ck(p.i,p.j));if(l){const q=l.indexOf(p);if(q>=0)l.splice(q,1);if(!l.length)cells.delete(ck(p.i,p.j))}}
  scene.remove(p.m);
  if(fx){const M=MT[p.mat];sfx('break',p.mat);dust(p.x,p.y+(p.t==='w'?1.4:.3),p.z,14,M.dust[0],M.dust[1],2.6);if(typeof BRFX!=='undefined')BRFX.debris(p.x,p.y+(p.t==='w'?1.5:.5),p.z,16,false,M.deb);FX.shakeT=Math.max(FX.shakeT||0,.12);FX.shakeA=Math.max(FX.shakeA||0,.04)}
  st.dirty=true}
function hit(p,dmg,pt){if(!p||p.dead)return;p.hp-=dmg;p.shk=1;sfx('hit',p.mat);const M=MT[p.mat];dust(pt?pt.x:p.x,pt?pt.y:p.y+1.3,pt?pt.z:p.z,4,M.dust[0],M.dust[1],1.4);
  if(typeof BRFX!=='undefined')BRFX.debris(pt?pt.x:p.x,pt?pt.y:p.y+1.2,pt?pt.z:p.z,3,true,M.deb);
  if(!p.crk&&p.hp<=p.max*.45&&p.hp>0){p.crk=1;p.m.material=CRK[p.mat]}
  if(p.hp<=0)kill(p,true)}
function boom(x,y,z,r,dmg){for(const p of P.slice()){const d=Math.hypot(p.x-x,p.y+1.4-y,p.z-z);if(d<r+2.4)hit(p,dmg*(1.3-d/(r+2.4)))}}
function dust(x,y,z,n,c0,c1,sp){FX.init();for(let i=0;i<n;i++){const a=Math.random()*6.283,s=(sp||1.6)*(.4+Math.random());FX.puff({x:x+(Math.random()-.5)*.4,y:y+(Math.random()-.5)*.3,z:z+(Math.random()-.5)*.4,vx:Math.cos(a)*s,vy:.5+Math.random()*1.3,vz:Math.sin(a)*s,s0:.12,s1:.75,life:.5+Math.random()*.35,c0,c1,op:.55,add:false,drag:2,grow:1})}}

// ---------------------------------------------------------------- ray (bullets): nearest piece along o + d*t, t in (0,max]
function rayBox(o,d,cx,cy,cz,ca,sa,hw,y0,y1,hd,max){const ox=o.x-cx,oz=o.z-cz,lx=ox*ca+oz*sa,lz=-ox*sa+oz*ca,dx=d.x*ca+d.z*sa,dz=-d.x*sa+d.z*ca;let t0=0,t1=max;
  for(const [p,q,lo,hi] of [[lx,dx,-hw,hw],[lz,dz,-hd,hd],[o.y,d.y,y0,y1]]){if(Math.abs(q)<1e-7){if(p<lo||p>hi)return null;continue}let a=(lo-p)/q,b=(hi-p)/q;if(a>b){const s=a;a=b;b=s}t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return null}
  return [t0,t1]}
function ray(o,d,max){if(!P.length)return null;let best=null;
  for(const p of P){const cx=p.x-o.x,cy=p.y+1-o.y,cz=p.z-o.z,tc=clamp(cx*d.x+cy*d.y+cz*d.z,0,max),qx=cx-d.x*tc,qy=cy-d.y*tc,qz=cz-d.z*tc;if(qx*qx+qy*qy+qz*qz>12)continue;
    let t=null;
    if(p.t==='w'){const r=rayBox(o,d,p.x,0,p.z,p.ax?0:1,p.ax?1:0,G/2,p.y-.1,p.y+H,.13,max);if(r)t=r[0]}
    else if(p.t==='f'){const r=rayBox(o,d,p.x,0,p.z,1,0,G/2,p.y-.2,p.y,G/2,max);if(r)t=r[0]}
    else if(p.t==='s'){const dd=DIRS[p.dir],r=rayBox(o,d,p.x,0,p.z,dd[1]?1:0,dd[1]?0:1,G/2,p.y,p.y+H,G/2,max);
      if(r){for(let s=r[0];s<=r[1];s+=.2){const x=o.x+d.x*s,z=o.z+d.z*s;if(o.y+d.y*s<=stairH(p,x,z)){t=s;break}}}}
    if(t!==null&&t>0&&t<=max&&(!best||t<best.t))best={t,p,pt:{x:o.x+d.x*t,y:o.y+d.y*t,z:o.z+d.z*t}}}
  return best}

// ---------------------------------------------------------------- placing: where does the ghost go
function gmax(x,z){return groundH(x,z)+(typeof sidewalkLift==='function'?sidewalkLift(x,z):0)}
function levelFor(cx,cz,yt,t){let best=null,bd=1.7;
  for(const p of P){if(Math.abs(p.x-cx)>6.5||Math.abs(p.z-cz)>6.5)continue;for(const l of [p.y,p.y+H]){const d=Math.abs(l-yt);if(d<bd){bd=d;best=l}}}
  if(best!==null)return best;
  const g=Math.max(gmax(cx,cz),gmax(cx-1.9,cz),gmax(cx+1.9,cz),gmax(cx,cz-1.9),gmax(cx,cz+1.9));
  if(Math.abs(g-yt)<1.7)return g+(t==='f'?.03:0);
  return Math.round(yt*4)/4}
function aim(){const kind=st.kind,yaw=cam.yaw,fx=Math.sin(yaw),fz=Math.cos(yaw),px=player.x,pz=player.z;
  let ray_=null;try{ray_=GUN.aimRay()}catch(e){}const up=!!ray_&&ray_.d.y>.42;
  const ref=player.air?st.gy:player.y;let a={t:kind,mat:st.mat,ok:true,why:'',i:0,j:0,ax:0,dir:0,x:0,z:0,y:0};
  if(kind==='w'){
    if(Math.abs(fx)>=Math.abs(fz)){const L=fx>0?Math.ceil((px+.9)/G):Math.floor((px-.9)/G),qz=pz+fz*((L*G-px)/fx);a.ax=1;a.i=L;a.j=Math.floor(qz/G);a.x=L*G;a.z=(a.j+.5)*G}
    else{const L=fz>0?Math.ceil((pz+.9)/G):Math.floor((pz-.9)/G),qx=px+fx*((L*G-pz)/fz);a.ax=0;a.i=Math.floor(qx/G);a.j=L;a.x=(a.i+.5)*G;a.z=L*G}
    a.y=levelFor(a.x,a.z,ref,'w')}
  else{
    const q0=up&&kind==='f'?px:px+fx*(kind==='s'?2.6:2.4),q1=up&&kind==='f'?pz:pz+fz*(kind==='s'?2.6:2.4);a.i=Math.floor(q0/G);a.j=Math.floor(q1/G);a.x=(a.i+.5)*G;a.z=(a.j+.5)*G;
    if(kind==='s'){a.dir=Math.abs(fx)>=Math.abs(fz)?(fx>0?1:3):(fz>0?0:2)}
    a.y=levelFor(a.x,a.z,ref+(kind==='r'||(kind==='f'&&up)?H:0),kind)}
  a.k=key(kind,a.i,a.j,a.ax,a.y);
  if(keyOf.has(a.k)){a.ok=false;a.why='Something is already built here'}
  else if(typeof sdAt==='function'&&sdAt(a.x,a.z)<1){a.ok=false;a.why='You cannot build on water'}
  else if(st.mats[st.mat]<COST){a.ok=false;a.why='Not enough '+MT[st.mat].n.toLowerCase()+' · hit trees, buildings and cars with the pickaxe'}
  return a}
function place(){if(!st.mode)return false;const a=aim();
  if(!a.ok){if(a.why)BR.msg(a.why);sfx('deny');return true}
  const p=build(a.t,a.mat,a.i,a.j,a.ax,a.dir,a.y,true);if(!p){sfx('deny');return true}
  st.mats[a.mat]-=COST;st.dirty=true;sfx('build',a.mat);const M=MT[a.mat];dust(p.x,p.y+.1,p.z,6,M.dust[0],M.dust[1],1.6);
  st.cd=.1;GUN.cd=.1;try{COOP.push(true)}catch(e){}return true}

// ---------------------------------------------------------------- harvesting with the pickaxe
function solidKind(x,z,y){
  for(const o of STATIC_WALLS){if(o._b)continue;if(y<o.y0||y>o.y1+1)continue;const dx=x-o.cx,dz=z-o.cz,u=dx*o.ca+dz*o.sa,v=-dx*o.sa+dz*o.ca;if(Math.abs(u)<o.hw+.1&&Math.abs(v)<o.hd+.1)return 'stone'}
  if(insideOBB(STATIC_OBB,x,z,.1))return 'stone';
  for(const cp of STATIC_POLYS){if(y>cp.top||y<cp.y0-4)continue;if(colPolyHit(cp,x,z,.1,y))return 'stone'}
  if(insideCircles(STATIC_CIR,x,z,.1))return 'metal';
  if(carAt(x,z,y,.1)||insideOBB(CAR_OBB,x,z,.1)||insideOBB(LOW_OBB,x,z,.1))return 'metal';
  for(const c of nearChunks(x,z)){if(insideOBB(c.obb,x,z,.1))return 'stone';for(const cp of c.cols){if(y>cp.top||y<cp.y0-4)continue;if(colPolyHit(cp,x,z,.1))return 'stone'}
    if(insideOBB(c.lobb,x,z,.1)||insideCircles(c.cirs,x,z,.1))return 'metal'}
  return null}
function addMat(m,n,crit,x,y,z){const had=st.mats[m];st.mats[m]=Math.min(CAP,had+n);const got=st.mats[m]-had;st.dirty=true;st.up=m;st.upT=.35;
  if(got>0)pop('+'+got,MT[m].col,x,y,z,crit);else pop('FULL',MT[m].col,x,y,z,false)}
function harvest(W){if(!st.inited)return false;const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),px=player.x,pz=player.z,py=player.y,dmg=(W&&W.dmg)||20;
  // 1. my own pieces: the pickaxe breaks them (no material back)
  for(const p of P){if(p.t==='r'||p.t==='f')continue;
    for(const t of [.9,1.6,2.3]){const x=px+fx*t,z=pz+fz*t;let inside=false;
      if(p.t==='w'){const dx=x-p.x,dz=z-p.z,ca=p.ax?0:1,sa=p.ax?1:0,u=dx*ca+dz*sa,v=-dx*sa+dz*ca;inside=Math.abs(u)<G/2+.15&&Math.abs(v)<.4&&py+1>=p.y-.2&&py<=p.y+H}
      else inside=Math.abs(x-p.x)<G/2&&Math.abs(z-p.z)<G/2&&py+1<stairH(p,x,z)&&py+1>=p.y-.2;
      if(inside){hit(p,dmg*2.2,{x,y:py+1.1,z});return true}}}
  // 2. a tree
  {const sx=px+fx*1.3,sz=pz+fz*1.3;let bt=null,bd=9,barr=null;
    for(const pts of TREES.chunks.values())for(const t of pts){const d=Math.hypot(t[0]-sx,t[1]-sz);if(d<.95+.4*(t[3]||1)&&d<bd&&Math.abs((t[4]!==undefined?t[4]:py)-py)<2.2){bd=d;bt=t;barr=pts}}
    if(bt){const k=Math.round(bt[0]*10)+'_'+Math.round(bt[1]*10),n=(hits.get(k)||0)+1,need=5+Math.round((bt[3]||1)*2.5),crit=Math.random()<.22;hits.set(k,n);
      const ty=(bt[4]!==undefined?bt[4]:py);addMat(0,crit?35:20,crit,bt[0],ty+1.6,bt[1]);sfx('hit',0);dust(bt[0],ty+1.3,bt[1],5,[.3,.55,.2],[.25,.4,.2],1.4);
      if(typeof BRFX!=='undefined')BRFX.debris(bt[0],ty+1.2,bt[1],4,true,0x8a5a2a);FX.shakeT=Math.max(FX.shakeT||0,.07);
      if(n>=need){fell(bt,barr,ty);addMat(0,40,true,bt[0],ty+2.6,bt[1]);hits.delete(k)}
      return true}}
  // 3. buildings / cars / lamp posts and the like
  for(const t of [.9,1.6,2.3]){const x=px+fx*t,z=pz+fz*t,k=solidKind(x,z,py+1);
    if(k){const m=k==='metal'?2:1,crit=Math.random()<.2;addMat(m,crit?35:20,crit,x,py+1.5,z);sfx('hit',m);const M=MT[m];dust(x,py+1.2,z,5,M.dust[0],M.dust[1],1.5);
      if(typeof BRFX!=='undefined')BRFX.debris(x,py+1.2,z,4,true,M.deb);FX.shakeT=Math.max(FX.shakeT||0,.07);return true}}
  return false}
// a felled tree: leaves the instanced forest for good (and again after a chunk reload), a trunk topples away from the player
function fell(t,arr,ty){const i=arr.indexOf(t);if(i>=0)arr.splice(i,1);TREES.dirty=true;cut.push({x:t[0],z:t[1],t,arr});sfx('fell');
  dust(t[0],ty+3,t[1],16,[.3,.55,.2],[.2,.4,.15],3);dust(t[0],ty+.4,t[1],8,[.6,.5,.35],[.5,.45,.4],2);if(typeof BRFX!=='undefined')BRFX.debris(t[0],ty+2,t[1],14,false,0x6a4420);
  const sc=t[3]||1,h=5.4*sc,g=new THREE.CylinderGeometry(.16*sc,.27*sc,h,8);g.translate(0,h/2,0);const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x6b4a2b,roughness:.9}));m.position.set(t[0],ty,t[1]);m.castShadow=true;scene.add(m);
  const dx=t[0]-player.x,dz=t[1]-player.z,dl=Math.hypot(dx,dz)||1;falls.push({m,t:0,axis:new THREE.Vector3(dz/dl,0,-dx/dl)})}
function reCut(){if(!cut.length)return;for(const c of cut)for(const pts of TREES.chunks.values())for(let i=pts.length-1;i>=0;i--)if(Math.abs(pts[i][0]-c.x)<.02&&Math.abs(pts[i][1]-c.z)<.02){pts.splice(i,1);TREES.dirty=true}}
// the next match starts with every tree back in its place
function regrow(){if(!cut.length)return;const live=new Set(TREES.chunks.values());for(const c of cut)if(live.has(c.arr)&&!c.arr.includes(c.t))c.arr.push(c.t);cut.length=0;TREES.dirty=true}

// ---------------------------------------------------------------- popups over the target (DOM, projected each time)
const V3=new THREE.Vector3();
function pop(txt,col,x,y,z,crit){const root=st.ui&&st.ui.pops;if(!root)return;V3.set(x,y,z).project(camera);let sx,sy;
  if(V3.z>1||V3.z<-1||Math.abs(V3.x)>1.2||Math.abs(V3.y)>1.2){sx=innerWidth*.56;sy=innerHeight*.42}else{sx=(V3.x*.5+.5)*innerWidth;sy=(-V3.y*.5+.5)*innerHeight}
  const d=document.createElement('div');if(crit)d.className='crit';d.style.left=sx+'px';d.style.top=sy+'px';d.style.color=col;d.textContent=txt;root.appendChild(d);setTimeout(()=>d.remove(),1000);while(root.children.length>8)root.firstChild.remove()}

// ---------------------------------------------------------------- mode / ui
function canBuild(){return BR.on&&BR.phase==='play'&&!BR.dead&&!PORTAL.cur&&!DRIVE.on&&!HELI.on&&!RIDE.on&&!player.sit}
function setMode(on){if(on===st.mode)return;if(on&&!canBuild())return;st.mode=on;document.body.classList.toggle('bld-on',on);assets();
  if(on){BR.cancelDrink();BR.zoomOff();BR.rl=0;if(PLR._gs)PLR._gs.rl=-1;if(PLR.emo)POSE.stop(PLR);GUN.noHold=true;GUN.push();BR.msg('Build mode · fire places · 1-4 piece · T material')}
  else{st.ghost.visible=false;const s=BR.inv[BR.sel];BR.select(s&&s.k==='w'?BR.sel:0)}
  st.dirty=true;BR.ui_()}
function toggle(){setMode(!st.mode)}
function pick(i){if(i<0||i>=KN.length)return;st.kind=KN[i].id;st.dirty=true;sfx('mat')}
function cycleMat(m){st.mat=m===undefined?(st.mat+1)%3:m;st.dirty=true;sfx('mat')}
function renderHud(){const u=st.ui;if(!u)return;const play=BR.on&&BR.phase==='play'&&!BR.dead;u.mats.hidden=!play;u.btn.hidden=!play;
  u.mats.querySelectorAll('.m').forEach((el,i)=>{el.classList.toggle('on',st.mode&&i===st.mat);el.classList.toggle('up',st.up===i&&st.upT>0);el.querySelector('b').textContent=st.mats[i]});
  u.bar.querySelectorAll('button').forEach((el,i)=>{el.classList.toggle('on',KN[i].id===st.kind);const em=el.querySelector('em');em.textContent=COST;em.style.color=MT[st.mat].col;el.classList.toggle('poor',st.mats[st.mat]<COST)});
  u.btn.classList.toggle('on',st.mode)}
function buildUi(){if(st.ui)return;const css=document.createElement('style');css.textContent=`
#bldMats{position:fixed;left:204px;bottom:calc(6px + env(safe-area-inset-bottom,0px));z-index:7;display:flex;gap:4px;pointer-events:none}@media (min-width:700px){#bldMats{left:calc(50% + 178px);bottom:calc(8px + env(safe-area-inset-bottom,0px));gap:5px}}#bldMats[hidden]{display:none}
#bldMats .m{pointer-events:auto;display:flex;align-items:center;gap:5px;min-width:64px;padding:4px 8px 4px 5px;border-radius:11px;background:linear-gradient(180deg,rgba(26,32,46,.84),rgba(9,13,21,.86));border:1.5px solid rgba(255,255,255,.2);border-bottom-width:3px;color:#fff;font:800 15px var(--f-disp,system-ui);touch-action:manipulation}
#bldMats .m.on{border-color:var(--sun,#f2c14e);box-shadow:0 0 14px rgba(242,193,78,.45)}#bldMats .m svg{width:22px;height:22px;flex:none}#bldMats .m b{margin-left:auto;min-width:26px;text-align:right;font-variant-numeric:tabular-nums}
#bldMats .m.up{animation:bldBump .35s}@keyframes bldBump{0%{transform:scale(1)}40%{transform:scale(1.14);filter:brightness(1.5)}100%{transform:scale(1)}}
#bldBar{position:fixed;left:50%;bottom:calc(8px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:8;display:none;gap:5px}
body.bld-on #bldBar{display:flex}body.bld-on #brBar{display:none!important}
#bldBar button{position:relative;width:64px;height:62px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);border-bottom-width:3px;background:linear-gradient(180deg,rgba(26,32,46,.86),rgba(9,13,21,.88));color:#e9e6dc;padding:0;pointer-events:auto;touch-action:manipulation;font:800 9px var(--f-disp,system-ui);letter-spacing:.08em;text-transform:uppercase}
#bldBar button.on{border-color:var(--sun,#f2c14e);color:#fff;background:linear-gradient(180deg,rgba(92,74,22,.92),rgba(40,32,10,.92));box-shadow:0 0 16px rgba(242,193,78,.5)}#bldBar button.poor{opacity:.62}
#bldBar button svg{width:36px;height:30px;display:block;margin:7px auto 1px}#bldBar button span{display:block}#bldBar button i{position:absolute;left:6px;top:3px;font:800 10px var(--f-disp,system-ui);font-style:normal;opacity:.7}#bldBar button em{position:absolute;right:6px;top:3px;font:800 10px var(--f-disp,system-ui);font-style:normal}
@media (max-width:699px){#bldBar{left:6px;transform:none;bottom:calc(4px + env(safe-area-inset-bottom,0px));gap:3px}#bldBar button{width:46px;height:42px;font-size:7px}#bldBar button svg{width:26px;height:20px;margin-top:4px}#bldBar button i,#bldBar button em{font-size:8px}#bldMats .m{min-width:0;padding:3px 6px 3px 4px;gap:3px;font-size:12px;border-radius:9px}#bldMats .m svg{width:17px;height:17px}#bldMats .m b{min-width:20px}}
#bldBtn{position:fixed;right:max(104px,calc(env(safe-area-inset-right) + 104px));bottom:calc(210px + env(safe-area-inset-bottom,0px));z-index:8;border-radius:12px;border:1.5px solid rgba(255,255,255,.24);border-bottom-width:3px;background:linear-gradient(180deg,rgba(26,32,46,.86),rgba(9,13,21,.88));color:#fff;font:800 10px var(--f-disp,system-ui);letter-spacing:.1em;padding:9px 12px;text-transform:uppercase;touch-action:manipulation}
#bldBtn.on{border-color:var(--sun,#f2c14e);background:linear-gradient(180deg,rgba(92,74,22,.92),rgba(40,32,10,.92));box-shadow:0 0 14px rgba(242,193,78,.5)}#bldBtn[hidden]{display:none}#bldBtn small{opacity:.6;margin-left:6px;font-size:9px}
#bldPops{position:fixed;inset:0;z-index:8;pointer-events:none;overflow:hidden}
#bldPops div{position:absolute;font:900 24px var(--f-disp,system-ui);text-shadow:0 2px 0 #000,0 0 9px #000;white-space:nowrap;animation:bldPop .95s ease-out forwards}#bldPops div.crit{font-size:32px;color:#ffd23a!important}
@keyframes bldPop{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}15%{opacity:1;transform:translate(-50%,-60%) scale(1.18)}100%{opacity:0;transform:translate(-50%,-200%) scale(.9)}}`;
  document.head.appendChild(css);
  const mats=document.createElement('div');mats.id='bldMats';mats.hidden=true;mats.innerHTML=MT.map((m,i)=>'<div class="m" data-m="'+i+'">'+MI[i]+'<b>0</b></div>').join('');
  const bar=document.createElement('div');bar.id='bldBar';bar.innerHTML=KN.map((k,i)=>'<button data-k="'+i+'"><i>'+(i+1)+'</i><em>10</em>'+IC[k.id]+'<span>'+k.n+'</span></button>').join('');
  const btn=document.createElement('button');btn.id='bldBtn';btn.hidden=true;btn.innerHTML='Build<small>Q</small>';
  const pops=document.createElement('div');pops.id='bldPops';
  document.body.append(mats,bar,btn,pops);
  mats.querySelectorAll('.m').forEach(el=>el.onpointerdown=e=>{e.preventDefault();cycleMat(+el.dataset.m)});
  bar.querySelectorAll('button').forEach(el=>el.onpointerdown=e=>{e.preventDefault();pick(+el.dataset.k)});
  btn.onpointerdown=e=>{e.preventDefault();toggle()};
  st.ui={mats,bar,btn,pops}}

// ---------------------------------------------------------------- friends: the newest own pieces ride the presence, theirs are built here
function pub(){const out=[];for(let q=P.length-1;q>=0&&out.length<28;q--){const p=P[q];if(!p.mine)continue;out.push(p.t+p.mat+(p.t==='w'?p.ax:p.dir)+','+p.i+','+p.j+','+Math.round(p.y*4))}return out}
function sync(list){if(!Array.isArray(list)||!st.inited)return;assets();
  for(const s of list){const m=/^([wfsr])(\d)(\d),(-?\d+),(-?\d+),(-?\d+)$/.exec(s);if(!m)continue;const t=m[1],mat=+m[2],a=+m[3],i=+m[4],j=+m[5],y=+m[6]/4;if(mat>2||a>3)continue;
    if(!keyOf.has(key(t,i,j,t==='w'?a:0,y)))build(t,mat,i,j,t==='w'?a:0,t==='w'?0:a,y,false)}}

// ---------------------------------------------------------------- per frame
function tick(dt){if(!st.inited||!BR.on)return;if(!player.air)st.gy=player.y;
  if(st.ph!==BR.phase||st.dd!==BR.dead){st.ph=BR.phase;st.dd=BR.dead;st.dirty=true}
  if(st.mode&&!canBuild())setMode(false);
  if(st.cd>0)st.cd-=dt;
  for(const p of P){if(p.grow<1){p.grow=Math.min(1,p.grow+dt*4.6);const u=p.grow,e=1+2.2*Math.pow(u-1,3)+1.2*Math.pow(u-1,2);p.m.scale.y=Math.max(.05,e)}
    if(p.shk>0){p.shk=Math.max(0,p.shk-dt*5);p.m.position.x=p.x+(p.shk>0?Math.sin(p.shk*55)*.05*p.shk:0)}}
  if(st.mode){const a=aim(),g=st.ghost;st.cur=a;g.geometry=GEO[a.t];g.position.set(a.x,a.y,a.z);g.rotation.y=a.t==='w'?(a.ax?Math.PI/2:0):a.t==='s'?Math.atan2(DIRS[a.dir][0],DIRS[a.dir][1]):0;
    g.material.color.setHex(a.ok?0x7fd6ff:0xff5a4a);g.material.opacity=.32+.14*Math.sin(performance.now()*.008);g.visible=true}
  for(let q=falls.length-1;q>=0;q--){const f=falls[q];f.t+=dt;const u=Math.min(1,f.t/1.1),a=u*u*1.5;f.m.quaternion.setFromAxisAngle(f.axis,a);
    if(f.t>2.4){f.m.scale.multiplyScalar(.9);if(f.m.scale.x<.05){scene.remove(f.m);f.m.geometry.dispose();f.m.material.dispose();falls.splice(q,1)}}}
  st.tcut-=dt;if(st.tcut<=0){st.tcut=2;reCut()}
  if(st.upT>0){st.upT-=dt;if(st.upT<=0)st.dirty=true}
  if(st.dirty){st.dirty=false;renderHud()}}
function init(){if(st.inited)return;st.inited=true;assets();buildUi();holdSpecial(surf);
  addEventListener('keydown',e=>{if(!BR.on||!started)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||e.repeat)return;
    if(e.code==='KeyQ'){e.stopImmediatePropagation();e.preventDefault();toggle()}
    else if(e.code==='KeyT'){e.stopImmediatePropagation();e.preventDefault();cycleMat()}},true)}
function start(){init();clear();st.mats=[50,0,0];st.mat=0;st.kind='w';st.mode=false;st.dirty=true;document.body.classList.remove('bld-on');renderHud()}
function clear(){for(const p of P.slice())kill(p,false);P.length=0;keyOf.clear();cells.clear();regrow();hits.clear();for(const f of falls){scene.remove(f.m)}falls.length=0;if(st.ghost)st.ghost.visible=false}
function end(){if(!st.inited)return;st.mode=false;document.body.classList.remove('bld-on');clear();if(st.ui){st.ui.mats.hidden=true;st.ui.btn.hidden=true}}

return {tick,start,end,init,place,harvest,hit,ray,boom,toggle,pick,cycleMat,pub,sync,aim,build,kill,surf,
  get mode(){return st.mode},get n(){return P.length},get P(){return P},get st(){return st},MT,KN,COST}})();
