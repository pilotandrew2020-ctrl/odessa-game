/* ===================================================================================================
   fdet.js — the detail layer of the flats and houses (built on shEnv / hsKit, houses.js)
   door leaves standing open with lever handles · light switches · skirting boards · window sills, radiators and curtains ·
   visible ceiling lamps · tiled bathrooms and kitchen splash-backs · tile / parquet / lino floors · bedside tables
   Everything is called from hsKit (K.wallX / K.wallZ / K.window / K.light / K.kitchen / K.stand) and from the flat layouts, so every style gets it.
   Loaded AFTER houses.js. Unique prefix FD; nothing here touches the game until an interior asks for it. No colliders are added (thin or wall-hugging parts).
   =================================================================================================== */
const FD={tx:{},mt:{}};

// ---------- canvas textures (cached per kind + colours); one repeat covers FD.MPT[kind] metres ----------
FD.MPT={tile:1.2,chess:.8,parquet:1.2,plank:1.4,lino:1.6,slab:1.6};
FD.texture=(kind,a,b,c)=>{const key=kind+'|'+a+'|'+b+'|'+c;if(FD.tx[key])return FD.tx[key];
  const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  if(kind==='tile'){g.fillStyle=b||'#c9d1d4';g.fillRect(0,0,256,256);                                     // 4 x 4 glazed tiles, 30 cm each
    for(let j=0;j<4;j++)for(let i=0;i<4;i++){const x=i*64,y=j*64,gr=g.createLinearGradient(x,y,x+64,y+64);gr.addColorStop(0,a);gr.addColorStop(1,c||a);g.fillStyle=gr;g.fillRect(x+2,y+2,60,60);
      g.fillStyle='rgba(255,255,255,.28)';g.fillRect(x+4,y+4,26,3);g.fillRect(x+4,y+4,3,22)}}
  else if(kind==='chess'){for(let j=0;j<8;j++)for(let i=0;i<8;i++){g.fillStyle=(i+j)%2?a:b;g.fillRect(i*32,j*32,32,32);g.fillStyle='rgba(0,0,0,.06)';g.fillRect(i*32,j*32,32,2);g.fillRect(i*32,j*32,2,32)}}
  else if(kind==='parquet'||kind==='plank'){const rows=kind==='parquet'?8:5,hh=256/rows,len=kind==='parquet'?128:170;g.fillStyle='#2a1a0e';g.fillRect(0,0,256,256);
    for(let r=0;r<rows;r++)for(let k=-1;k<3;k++){const x=((k*len+(r%2)*len*(kind==='parquet'?.5:.37))%256+256)%256,jit=.86+rnd()*.28;g.fillStyle=a;g.fillRect(x+1,r*hh+1,len-2,hh-2);g.fillStyle='rgba(0,0,0,'+(1-jit)*.9+')';g.fillRect(x+1,r*hh+1,len-2,hh-2);
      g.fillStyle='rgba(255,230,190,'+(jit-.86)*.7+')';g.fillRect(x+1,r*hh+1,len-2,hh-2);g.strokeStyle='rgba(40,24,10,.22)';g.lineWidth=1;for(let q=0;q<5;q++){g.beginPath();g.moveTo(x+rnd()*len,r*hh+2+rnd()*(hh-4));g.lineTo(x+rnd()*len,r*hh+2+rnd()*(hh-4));g.stroke()}}}
  else if(kind==='lino'){g.fillStyle=a;g.fillRect(0,0,256,256);for(let i=0;i<1400;i++){g.fillStyle=rnd()<.5?b:c;g.globalAlpha=.25+rnd()*.3;g.fillRect(rnd()*256,rnd()*256,1+rnd()*5,1+rnd()*2)}g.globalAlpha=1}
  else if(kind==='slab'){g.fillStyle=b||'#6a6e72';g.fillRect(0,0,256,256);for(let j=0;j<2;j++)for(let i=0;i<2;i++){g.fillStyle=a;g.fillRect(i*128+2,j*128+2,124,124);for(let q=0;q<160;q++){g.fillStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+rnd()*.05+')';g.fillRect(i*128+rnd()*124,j*128+rnd()*124,1+rnd()*8,1+rnd()*3)}}}
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return FD.tx[key]=t};
FD.mat=(kind,a,b,c,rough)=>{const key='m|'+kind+'|'+a+'|'+b+'|'+c;return FD.mt[key]||(FD.mt[key]=new THREE.MeshStandardMaterial({map:FD.texture(kind,a,b,c),roughness:rough==null?(kind==='tile'?.3:.7):rough,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}))};
FD.plain=(hex,rough)=>{const key='p|'+hex;return FD.mt[key]||(FD.mt[key]=new THREE.MeshStandardMaterial({color:sRGBc(hex),roughness:rough==null?.8:rough}))};
FD.uvPlane=(w,h,mw,mh)=>{const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/mw,uv.getY(i)*h/mh);return g};

// a textured floor patch on the room floor: x0..x1, z0..z1 in flat coordinates
FD.floor=(E,x0,x1,z0,z1,kind,a,b,c,rough)=>{const w=x1-x0,d=z1-z0,mp=FD.MPT[kind]||1.2,m=new THREE.Mesh(FD.uvPlane(w,d,mp,mp),FD.mat(kind,a,b,c,rough));
  m.rotation.x=-Math.PI/2;m.position.set(E.ox+(x0+x1)/2,INT_Y+.005,E.oz+(z0+z1)/2);m.receiveShadow=true;E.grp.add(m);return m};
// a textured wall panel centred at (x,z) facing ry (its front is the +v side like K.window), from height y0 to y1, w wide
FD.wall=(E,x,z,ry,w,y0,y1,kind,a,b,c,rough)=>{const h=y1-y0,mp=FD.MPT[kind]||1.2,m=new THREE.Mesh(FD.uvPlane(w,h,mp,mp),FD.mat(kind,a,b,c,rough));
  m.position.set(E.ox+x,INT_Y+(y0+y1)/2,E.oz+z);m.rotation.y=ry;m.receiveShadow=true;E.grp.add(m);return m};
// tile the four walls of a rectangle (wall CENTRE lines x0..x1, z0..z1) up to height h; doors = [[side 'S'|'N'|'W'|'E', centre, width]] are left open; a darker band caps the dado
FD.tileRoom=(E,x0,x1,z0,z1,h,theme,doors,skip)=>{theme=theme||{};const a=theme.a||'#eef2f2',b=theme.b||'#c3ccd0',c=theme.c||'#dfe8ec',band=theme.band||'#4f8aa8',F=.112;doors=doors||[];skip=skip||'';
  const run=(side,lo,hi,fix,ry)=>{if(skip.includes(side))return;const gs=doors.filter(d=>d[0]===side).sort((p,q)=>p[1]-q[1]);let t=lo;
    const seg=(u0,u1)=>{if(u1-u0<.08)return;const cu=(u0+u1)/2,w=u1-u0;const pos=side==='S'||side==='N'?[cu,fix]:[fix,cu];FD.wall(E,pos[0],pos[1],ry,w,.02,h-.06,'tile',a,b,c);FD.wall(E,pos[0],pos[1],ry,w,h-.06,h,'tile',band,band,band,.35)};
    for(const d of gs){seg(t,d[1]-d[2]/2-.07);t=d[1]+d[2]/2+.07}seg(t,hi)};
  run('S',x0+F,x1-F,z0+F,0);run('N',x0+F,x1-F,z1-F,Math.PI);run('W',z0+F,z1-F,x0+F,Math.PI/2);run('E',z0+F,z1-F,x1-F,-Math.PI/2)};

// ---------- door leaves, handles, switches (called from K.wallX / K.wallZ for every doorway) ----------
// ax 'x': the wall runs along x at z=wc and the doorway is centred at x=g; ax 'z': the wall runs along z at x=wc, doorway at z=g.
// The leaf stands open (90°) on the hinge side hs (+1 / -1 along the wall) and swings towards side sd (+1 / -1 across the wall); it has no collider — it does not narrow the doorway.
FD.door=(E,S,ax,wc,g,w,o)=>{o=o||{};const front=!!o.front;if(S.doors===false||o.none||w<.7||(w>1.15&&!front))return;const hs=o.hs||1,sd=o.sd||1,T=.045,len=Math.min(w-.08,.96),col=o.col||S.door||S.wood||'#c8b496',hw=S.hw||'#c9c2b0',pcol=o.pcol||FD.shade(col,.9);
  const P=(u,y,v,su,sy,sv,c,m)=>ax==='x'?E.box(g+u,y,wc+v,su,sy,sv,c,m):E.box(wc+v,y,g+u,sv,sy,su,c,m);
  const lu=hs*(w/2-.035),lv=sd*(.15+len/2);
  P(lu,1.04,lv,T,2.06,len,col,0);                                                    // the leaf
  for(const f of [-1,1]){P(lu+f*(T/2+.004),1.6,lv,.01,.78,len-.26,pcol,0);P(lu+f*(T/2+.004),.62,lv,.01,.62,len-.26,pcol,0)}   // raised panels on both faces
  const fv=sd*(.15+len-.1);                                                          // the lever handle by the free edge, one on each face
  for(const f of [-1,1]){P(lu+f*(T/2+.012),1.0,fv,.012,.05,.05,hw,6);P(lu+f*(T/2+.036),1.0,fv-sd*.045,.03,.022,.115,hw,6)}
  if(front)for(const f of [-1,1]){P(lu+f*(T/2+.012),1.3,fv,.014,.14,.07,hw,6);P(lu+f*(T/2+.01),1.55,fv,.012,.03,.03,'#101010',2)}   // lock plate and peephole
  // a light switch on each face of the wall beside the doorway, on the handle side
  const su=-hs*(w/2+.2);for(const f of [-1,1]){P(su,1.1,f*.119,.085,.085,.016,'#f1efe8',0);P(su,1.1,f*.127,.03,.045,.014,'#d6d2c6',0)}};
FD.shade=(hex,k)=>{const c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString()};
// skirting along a wall segment [a,b] on both faces
FD.skirt=(E,S,ax,wc,a,b)=>{if(S.skirt===false||b-a<.1)return;const c=S.trim||'#ffffff',cu=(a+b)/2,L=b-a;for(const f of [-1,1]){if(ax==='x')E.box(cu,.055,wc+f*.119,L,.11,.02,c,0);else E.box(wc+f*.119,.055,cu,.02,.11,L,c,0)}};

// ---------- windows: inside sill, radiator beneath, curtains ----------
// same arguments as K.window (x,z = the wall plane point, ry = facing into the room, w x h glass centred at height y)
FD.window=(E,K,S,x,z,ry,w,h,y)=>{const sill=y-h/2;if(S.sill!==false)K.bx(x,z,ry,0,sill-.02,.1,w+.26,.04,.2,S.trim||'#ffffff',0);
  if(S.rad&&sill>=.7){const rw=Math.min(w*.85,1.6),rh=Math.max(.3,Math.min(.62,sill-.38)),y0=.2;
    if(S.rad==='cast'){const n=Math.max(4,Math.round(rw/.1));for(let i=0;i<n;i++){const u=-rw/2+(i+.5)*rw/n;K.bx(x,z,ry,u,y0+rh/2,.075,rw/n-.014,rh,.08,'#f2efe6',1)}K.bx(x,z,ry,0,y0+rh+.02,.075,rw+.02,.03,.09,'#f2efe6',1);K.bx(x,z,ry,0,y0-.015,.075,rw+.02,.03,.09,'#f2efe6',1)}
    else{K.bx(x,z,ry,0,y0+rh/2,.06,rw,rh,.05,'#f6f6f4',1);K.bx(x,z,ry,0,y0+rh+.012,.06,rw,.025,.07,'#e8e8e4',1);for(let i=1;i<4;i++)K.bx(x,z,ry,0,y0+rh*i/4,.09,rw-.02,.012,.012,'#d6d6d2',1)}
    for(const s of [-1,1]){K.bx(x,z,ry,s*(rw/2-.05),y0-.07,.07,.03,.12,.03,'#c8ccd0',6);K.bx(x,z,ry,s*(rw/2+.03),y0+rh-.04,.07,.07,.03,.03,'#c8ccd0',6)}}
  if(S.curt){if(Array.isArray(S.curt)){if(typeof flCurtains==='function')flCurtains(E,K,x,z,ry,w,h,y,S.curt)}else FD.curtain(E,K,x,z,ry,w,h,y,S.curt)}};
// plain pleated curtains (a hex colour) on both sides of a window; they reach the floor when the glass does
FD.curtain=(E,K,x,z,ry,w,h,y,col)=>{const key='c|'+col;let m=FD.mt[key];
  if(!m){const cv=document.createElement('canvas');cv.width=128;cv.height=64;const g=cv.getContext('2d');g.fillStyle=col;g.fillRect(0,0,128,64);for(let i=0;i<128;i+=16){const gr=g.createLinearGradient(i,0,i+16,0);gr.addColorStop(0,'rgba(0,0,0,.2)');gr.addColorStop(.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(0,0,0,.2)');g.fillStyle=gr;g.fillRect(i,0,16,64)}
    const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;m=FD.mt[key]=new THREE.MeshStandardMaterial({map:t,roughness:.95,side:THREE.DoubleSide})}
  const top=y+h/2+.2,ch=Math.min(h+.5,top-.03),cw=Math.max(.3,w*.3);
  for(const s of [-1,1]){const p=K.loc(x,z,ry)(s*(w/2+cw/2-.02),.14);const q=new THREE.Mesh(new THREE.PlaneGeometry(cw,ch),m);q.position.set(E.ox+p[0],INT_Y+top-ch/2,E.oz+p[1]);q.rotation.y=ry;E.grp.add(q)}
  const p=K.loc(x,z,ry)(0,.1),rod=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,w+cw*2+.1,6),FD.plain('#4a4034',.5));rod.rotation.z=Math.PI/2;const rg=new THREE.Group();rg.add(rod);rg.rotation.y=ry;rg.position.set(E.ox+p[0],INT_Y+top+.02,E.oz+p[1]);E.grp.add(rg)};

// ---------- ceiling lamp shade under a K.light (skipped near a chandelier / pendant, listed in E.lampSkip) ----------
FD.lamp=(E,S,x,y,z)=>{if(S.fixt===false||y<E.H-1.3)return;for(const q of E.lampSkip||[])if(Math.hypot(q[0]-x,q[1]-z)<1.3)return;
  E.P.cyl(E.ox+x,INT_Y+E.H-.08,E.oz+z,.23,.17,.08,16,sRGB('#fff0d0'),3);E.P.cyl(E.ox+x,INT_Y+E.H-.1,E.oz+z,.06,.06,.03,8,sRGB(S.hw||'#c9c2b0'),6)};

// ---------- kitchen splash-back: glazed tiles behind a worktop run along (x,z)/ry, width w centred on u ----------
FD.splash=(E,K,S,x,z,ry,u,w)=>{if(S.splash===false)return;const p=K.loc(x,z,ry)(u,.016);FD.wall(E,p[0],p[1],ry,w,.9,1.45,'tile',S.tileA||'#f1efe6',S.tileB||'#c8c0ae',S.tileC||'#e6e0d0',.35)};

// ---------- a bedside table (Poly Haven painted_wooden_nightstand, CC0) with a lamp; (x,z) is the back like K.stand; no-GLB styles keep the box one ----------
FD.stand=(E,K,S,x,z,ry)=>{const p=K.loc(x,z,ry)(0,.26);                       // model 0.50 x 0.62 x 0.51 m at s=1; w:.46 scales it to .46 x .57 x .47
  MDL.put(E.grp,'painted_wooden_nightstand',{x:E.ox+p[0],y:INT_Y,z:E.oz+p[1],ry:ry,w:.46,tint:S.standTint});E.obb(p[0],p[1],.24,.25,ry);
  K.cy(x,z,ry,0,.57,.26,.07,.05,.12,'#d8c9a8',1);K.bx(x,z,ry,0,.79,.26,.26,.22,.26,'#ffe9bd',3)};

// ---------- extra furniture for the kit (K.dresser, K.mirror, K.washer, K.towelRail, K.shoes, K.clock, K.pillows); same convention as the kit: the BACK is at (x,z), the front faces ry ----------
FD.kit=(E,K,S)=>{const bx=K.bx,cy=K.cy,ob=K.ob,wood=S.wood||S.trim,hw=S.hw||'#c9c2b0',dk=FD.shade(wood,.85),lt=FD.shade(wood,1.15);
  // chest of drawers with three drawers, handles, a framed photo and a vase on top
  K.dresser=(x,z,ry,w,h)=>{w=w||1.1;h=h||.85;bx(x,z,ry,0,h/2,.25,w,h,.5,wood,5);for(let r=0;r<3;r++){const yy=.15+r*(h-.12)/3;bx(x,z,ry,0,yy,.503,w-.08,(h-.12)/3-.03,.012,lt,5);bx(x,z,ry,0,yy,.52,.13,.022,.022,hw,6)}
    bx(x,z,ry,0,h+.012,.25,w+.04,.025,.54,dk,5);bx(x,z,ry,-w*.25,h+.15,.2,.2,.24,.02,'#3a2a1a',5);bx(x,z,ry,-w*.25,h+.15,.212,.16,.2,.01,'#9bb7d0',0);cy(x,z,ry,w*.25,h+.025,.24,.05,.04,.2,'#4f8aa8',1,10);cy(x,z,ry,w*.25,h+.2,.24,.02,.045,.1,'#4f8aa8',1,10);ob(x,z,ry,0,.25,w/2,.26)};
  // a wall mirror: frame and a bright reflective pane, centre height y
  K.mirror=(x,z,ry,w,h,y)=>{bx(x,z,ry,0,y,.02,w+.1,h+.1,.03,wood,5);bx(x,z,ry,0,y,.04,w,h,.012,'#cfe6f2',6)};
  // washing machine with a dark round door and a control knob
  K.washer=(x,z,ry)=>{bx(x,z,ry,0,.43,.3,.6,.86,.6,'#f4f6f7',1);bx(x,z,ry,0,.45,.607,.4,.4,.02,'#2a3036',2);bx(x,z,ry,0,.45,.615,.46,.46,.01,'#dfe3e6',6);bx(x,z,ry,0,.45,.62,.34,.34,.01,'#2a3036',2);bx(x,z,ry,.18,.8,.61,.08,.06,.02,'#9aa0a6',6);ob(x,z,ry,0,.3,.31,.31)};
  // a heated towel rail with a towel over it
  K.towelRail=(x,z,ry,w)=>{w=w||.5;for(const s of [-1,1])bx(x,z,ry,s*w/2,.85,.06,.025,1.15,.025,'#d4d8dc',6);for(let i=0;i<6;i++)bx(x,z,ry,0,.35+i*.18,.06,w,.02,.02,'#d4d8dc',6);bx(x,z,ry,0,.8,.09,w*.92,.34,.035,'#e7d3b8',0);bx(x,z,ry,0,.62,.09,w*.92,.04,.04,'#c9a98a',0)};
  // a shoe rack with pairs of shoes
  K.shoes=(x,z,ry,w)=>{w=w||.9;bx(x,z,ry,0,.19,.17,w,.035,.34,wood,5);bx(x,z,ry,0,.4,.17,w,.035,.34,wood,5);for(const s of [-1,1])bx(x,z,ry,s*(w/2-.02),.2,.17,.04,.42,.34,wood,5);
    const cols=['#2a2d32','#8a4b2a','#c8372d','#e8e4da'];for(let i=0;i<Math.floor((w-.1)/.26);i++){bx(x,z,ry,-w/2+.17+i*.26,.235,.17,.1,.07,.26,cols[i%4],0);bx(x,z,ry,-w/2+.17+i*.26,.445,.17,.1,.07,.26,cols[(i+2)%4],0)}ob(x,z,ry,0,.17,w/2,.18)};
  // a real wall clock (Poly Haven wall_clock, CC0), centre at height y
  K.clock=(x,z,ry,y)=>{const p=K.loc(x,z,ry)(0,.03);MDL.put(E.grp,'wall_clock',{x:E.ox+p[0],y:INT_Y+y-.16,z:E.oz+p[1],ry:ry})};
  // two scatter cushions on a bed or sofa at (u,v) of the furniture frame
  K.pillows=(x,z,ry,u,y,v,c)=>{for(const s of [-1,1])bx(x,z,ry,u+s*.2,y,v,.34,.13,.14,c,0,ry)}};

// ---------- a tiled bathroom in one call: tiled floor patch + tiled walls up to h (wall centre lines x0..x1, z0..z1), doors = [[side,centre,width]] ----------
FD.bath=(E,x0,x1,z0,z1,doors,S,h)=>{const th={a:S.tileA||'#eef2f2',b:S.tileB||'#c3ccd0',c:S.tileC||'#dfe8ec',band:S.tileBand||'#4f8aa8'};
  FD.floor(E,x0+.11,x1-.11,z0+.11,z1-.11,'tile',S.floorTile||'#cfd9dc','#9eaeb4','#bccbd0',.3);FD.tileRoom(E,x0,x1,z0,z1,h||1.6,th,doors)};
// ---------- the Soviet flat (INTERIORS.flat in index.html): a tiled combined bathroom at the far end of the hall (tub, washer, toilet, basin, towel rail, door), cast-iron radiators under the front windows, a wall clock in the hall ----------
// P is the flat's own batcher and h its wall height; the kitchen / lounge are not touched. Colliders and acts go through the same lists the flat builder converts afterwards.
FD.soviet=(grp,ox,oz,P,H)=>{
  const S={wall:'#d5c8af',wm:9,trim:'#efe9dc',wood:'#56351f',door:'#efe9dc',hw:'#c9c2b0',rad:'cast',sill:false,curt:false,fixt:false,splash:false,tileA:'#cfe6e1',tileB:'#9ebdb6',tileC:'#e1f0ec',tileBand:'#2f6a5e',floorTile:'#bcd2c6'};
  const E=shEnv(grp,ox,oz,H,P),prev=HSTATE.cur,taps=[];HSTATE.cur={tvs:[],fires:[],taps};
  try{const K=hsKit(E,S,[]),PI=Math.PI;
    K.wallX(18.2,-1.2,1.2,[[0,.85,{sd:-1}]]);                                        // the bathroom door opens out into the hall
    FD.bath(E,-1.2,1.2,18.2,22,[['S',0,.85]],S,1.7);
    K.tub(-.37,21.9,PI,1.5);K.washer(.78,21.9,PI);K.toilet(1.12,20.2,-PI/2);K.vanity(1.12,19.2,-PI/2,.6);K.towelRail(-1.12,19.8,PI/2,.5);
    for(const x of [-6,6])FD.window(E,K,S,x,.14,0,2.18,1.55,1.72);                   // a cast-iron radiator under each front window
    K.clock(1.12,9,-PI/2,1.9);
  }catch(e){console.error('[fdet] soviet',e)}
  HSTATE.cur=prev;ANIM.push(()=>{for(const w of taps)w.m.visible=grp.visible&&(HSTATE.t||0)<w.until})};   // the tap jets (hsTick only drives the houses')
window.FD=FD;   // const is not a window property: hsKit tests window.FD
