// ven.js — the real city's shops, cafes, clubs, banks, schools ... at their true coordinates.
// assets/venues.json = ~6600 named places from OpenStreetMap (ODbL) + a few gaming/VR/billiard clubs OSM lacks, whose names and coordinates
// were read off Google Maps listings. [catIndex, x, z, name] in game metres.
// Each venue is matched (lazily, per chunk) to the building that holds it; the nearest wall facing a road gets a lit sign with the
// real name, and the door of that wall opens an interior of the right kind (bldg.js asks VEN.forEntry). The big map shows the pins.
// Loaded before bldg.js; everything the game provides (INTERIORS, PB, bgChunk ...) is only touched at call time.

const VEN={ready:false,cats:[],all:[],by:new Map(),byB:new Map(),live:new Map(),pool:[],grp:null,T:0,tex:new Map(),texQ:[],
  NOSIGN:new Set(['park','sight','faith','trans']),
  INT:{market:'bg_market',phone:'bg_phones',books:'bg_books',gift:'bg_gifts',flower:'bg_flowers',beauty:'bg_eva',optic:'bg_optics',jewel:'bg_jewel',toys:'bg_toys',sweet:'bg_sweets',
    cloth:'bg_cloth',pharm:'bg_pharmacy',cafe:'bg_cafe',rest:'bg_rest',bar:'bg_bar',game:'bg_game',gym:'bg_gym',ware:'bg_ware',
    bank:'bg_hall',post:'bg_hall',med:'bg_hall',edu:'bg_hall',hotel:'bg_hall',gov:'bg_hall',culture:'bg_hall'},
  LABEL:{market:'grocery & supermarket',phone:'phones & electronics',books:'books & stationery',gift:'gifts & small shop',flower:'flowers',beauty:'beauty & hair',optic:'optics',jewel:'jewellery',
    toys:'toys & kids',sweet:'bakery & sweets',cloth:'clothes & shoes',pharm:'pharmacy',cafe:'cafe',rest:'restaurant',bar:'bar & club',game:'gaming club',gym:'gym & sport',ware:'car, tools & home',
    bank:'bank',post:'post office',med:'clinic & health',edu:'school & education',hotel:'hotel',gov:'public service',culture:'culture & leisure',fuel:'petrol station',park:'park & square',sight:'sight',faith:'church',trans:'transport'},
  COL:{market:['#d8261c','#ffffff'],phone:['#1769c2','#ffffff'],books:['#2e6b4a','#f6efd8'],gift:['#6b3fa0','#ffffff'],flower:['#2d8a3e','#ffffff'],beauty:['#d94f8a','#ffffff'],optic:['#1e5a8a','#ffffff'],
    jewel:['#17120c','#f0c75a'],toys:['#e07a1a','#ffffff'],sweet:['#c2446b','#fff4e6'],cloth:['#202226','#ffffff'],pharm:['#1b7f3b','#ffffff'],cafe:['#4a2f1d','#ffe9c8'],rest:['#6e1c1c','#ffe9c8'],
    bar:['#171a38','#ff7bd5'],game:['#0e0d24','#46f2ff'],gym:['#1b1d21','#ff9a2e'],ware:['#4a4d52','#ffffff'],bank:['#0b4a8c','#ffffff'],post:['#c8102e','#ffffff'],med:['#1b6f8f','#ffffff'],
    edu:['#2a4d80','#ffffff'],hotel:['#3a2a57','#f3e3b3'],gov:['#1a2f4a','#ffffff'],culture:['#5a2a2a','#ffe9c8'],fuel:['#0a5c36','#ffffff']},
  PIN:{market:['#d8261c','S'],phone:['#1769c2','P'],books:['#2e6b4a','B'],gift:['#6b3fa0','G'],flower:['#2d8a3e','F'],beauty:['#d94f8a','H'],optic:['#1e5a8a','O'],jewel:['#b8902c','J'],toys:['#e07a1a','T'],
    sweet:['#c2446b','C'],cloth:['#34373d','K'],pharm:['#1b7f3b','+'],cafe:['#7a4a2a','C'],rest:['#9a2a2a','R'],bar:['#6a3fd0','♪'],game:['#1fb5cc','G'],gym:['#e8801a','W'],ware:['#6a6e74','W'],bank:['#0b4a8c','$'],
    post:['#c8102e','✉'],med:['#1b9fbf','+'],edu:['#2a6da0','E'],hotel:['#7a58b8','H'],gov:['#3a5f8a','!'],culture:['#a04a4a','★'],fuel:['#2a8a56','⛽'],park:['#3f9a4a','P'],sight:['#c79a2a','★'],faith:['#8a8a96','†'],trans:['#4a7ab5','T']},
  IMP:new Set(['game','rest','bar','culture','hotel','gym','med','edu','bank','fuel','faith','sight','trans','park']),
  // frontage of cafes, restaurants, bars and sweet shops: an open door with a warm room behind it, a chalk sandwich board, pavement tables
  FRONT:new Set(['cafe','rest','bar','sweet']),
  GLOW:{cafe:'#9a6a32',rest:'#a46a2e',bar:'#6a44b0',sweet:'#c07a80'},
  MENU:{cafe:{t:'COFFEE',it:[['Espresso',45],['Cappuccino',70],['Flat white',80],['Raf',95],['Croissant',60],['Cheesecake',110]]},
    rest:{t:'TODAY',it:[['Borscht',130],['Varenyky',160],['Chicken Kyiv',240],['Draniki',140],['Salmon',360],['Compote',45]]},
    bar:{t:'COCKTAILS',it:[['Mojito',190],['Negroni',210],['Old fashioned',230],['Whisky sour',220],['Beer 0.5',95],['Shot',80]]},
    sweet:{t:'SWEETS',it:[['Ice cream',45],['Eclair',60],['Napoleon',80],['Hot chocolate',70],['Pampushky',50],['Tea',35]]}},
  late:new Set(),mtex:new Map(),mlive:new Map(),mpool:[],

  load(){fetch('assets/venues.json').then(r=>r.json()).then(j=>{
      this.cats=j.cats;let n=0;
      for(const r of j.v){const v={i:n++,c:j.cats[r[0]],x:r[1],z:r[2],name:r[3],m:0};this.all.push(v);const id=chunkIdAt2(v.x,v.z);if(id<0)continue;let a=this.by.get(id);if(!a)this.by.set(id,a=[]);a.push(v)}
      this.ready=true;MAPP=null;
      for(const id of this.late){const c=chunks.get(id);if(c)disposeChunk(c)}this.late.clear()}).catch(e=>console.warn('venues.json',e))},   // chunks built before the list arrived get rebuilt with their frontage
  install(){if(this.grp)return;this.grp=new THREE.Group();scene.add(this.grp);ANIM.push(dt=>this.tick(dt));this.load();venInteriors()},

  // venue -> its building (the polygon holding it, else the nearest wall within 14 m)
  match(v){if(v.m)return v.m===1;v.m=2;const id=chunkIdAt2(v.x,v.z);if(id<0)return false;const i0=id%NCX,j0=Math.floor(id/NCX);let best=null,bd=14;
    for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){if(i<0||j<0||i>=NCX||j>=NCZ)continue;
      for(const b of bgChunk(j*NCX+i)){if(v.x<b.mnx-bd||v.x>b.mxx+bd||v.z<b.mnz-bd||v.z>b.mxz+bd)continue;if((D.bfl[b.k]&1)||b.area<25)continue;
        const d=polyInside(b.rings,v.x,v.z)?-1:polyNearest(b.rings,v.x,v.z)[0];if(d<bd){bd=d;best=b}}}
    if(!best)return false;
    // the sign goes on the wall nearest to the venue that faces a road (or at least open ground)
    const a=best.rings[0],n=a.length>>1;let bs=null,sc=1e9,long=null,ll=0;
    for(let i=0;i<n;i++){const j=(i+1)%n,ax=a[i*2],az=a[i*2+1],ex=a[j*2]-ax,ez=a[j*2+1]-az,L=Math.hypot(ex,ez);if(L<1.5)continue;const ux=ex/L,uz=ez/L;
      const tc=L<3.4?L/2:Math.max(1.7,Math.min(L-1.7,(v.x-ax)*ux+(v.z-az)*uz)),px=ax+ux*tc,pz=az+uz*tc;let nx=uz,nz=-ux;if(polyInside(best.rings,px+nx*.6,pz+nz*.6)){nx=-nx;nz=-nz}
      if(L>ll){ll=L;long={px,pz,nx,nz,L}}
      if(L<3.4)continue;const qx=px+nx*5,qz=pz+nz*5,cid=chunkIdAt2(qx,qz);let pen=18;if(cid>=0)pen=nearRoad(cid,qx,qz,1.5)?0:nearRoad(cid,qx,qz,9)?5:18;
      const s=Math.hypot(v.x-px,v.z-pz)+pen;if(s<sc){sc=s;bs={px,pz,nx,nz,L}}}
    bs=bs||long;if(!bs)return false;
    v.m=1;v.k=best.k;v.sx=bs.px;v.sz=bs.pz;v.nx=bs.nx;v.nz=bs.nz;v.L=bs.L;v.lv=D.blv[best.k]||1;
    let L=this.byB.get(best.k);if(!L)this.byB.set(best.k,L=[]);L.push(v);return true},
  matchNear(x,z,r){const id=chunkIdAt2(x,z);if(id<0)return;const i0=id%NCX,j0=Math.floor(id/NCX);
    for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){const a=this.by.get(j*NCX+i);if(!a)continue;for(const v of a)if(!v.m&&Math.abs(v.x-x)<r&&Math.abs(v.z-z)<r)this.match(v)}},
  // bldg.js: which venue does the door at (qx,qz) of building k belong to?
  forEntry(k,qx,qz){if(!this.ready)return null;this.matchNear(qx,qz,60);const L=this.byB.get(k);if(!L)return null;let best=null,bd=13;
    for(const v of L){if(!this.INT[v.c])continue;const d=Math.hypot(v.sx-qx,v.sz-qz);if(d<bd){bd=d;best=v}}return best},
  // map pin -> a spot on the street in front of the door
  stand(p){const v=this.all[p.vi];if(!v||p.vs)return;this.match(v);p.vs=1;if(v.m===1){p.x=v.sx+v.nx*3.4;p.z=v.sz+v.nz*3.4;p.yaw=Math.atan2(-v.nx,-v.nz)}},
  mapEntries(){if(this._me)return this._me;const out=[];
    for(const v of this.all){const pn=this.PIN[v.c]||['#888','•'];out.push({p:{id:'v'+v.i,name:v.name,sub:this.LABEL[v.c]||v.c,x:v.x,z:v.z,yaw:0,v:1,vi:v.i,vc:v.c,pin:pn[0],pinText:pn[1]},cat:'venues',pri:3})}
    return this._me=out},
  zoom(p){return this.IMP.has(p.vc)?.22:.3},

  // ---- signs on the walls near the player
  signTex(v){const key=v.c+'|'+v.name;let t=this.tex.get(key);if(t)return t;
    const col=this.COL[v.c]||['#33363b','#ffffff'];let lines=[v.name];if(v.name.length>19&&v.name.includes(' ')){const h=v.name.length/2;let b=-1;for(let i=0;i<v.name.length;i++)if(v.name[i]===' '&&(b<0||Math.abs(i-h)<Math.abs(b-h)))b=i;lines=[v.name.slice(0,b),v.name.slice(b+1)]}
    const cv=txtCanvas(lines,{w:512,h:lines.length>1?128:80,size:lines.length>1?46:52,bg:col[0],color:col[1],weight:'800',border:col[1],bw:5,round:10});
    t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.userData={tall:lines.length>1};this.tex.set(key,t);this.texQ.push(key);
    if(this.texQ.length>180){const old=this.texQ.shift(),ot=this.tex.get(old);let used=false;for(const m of this.live.values())if(m.material.map===ot)used=true;if(!used){ot.dispose();this.tex.delete(old)}else this.texQ.push(old)}
    return t},
  newMesh(){const m=new THREE.Mesh(this.geo||(this.geo=new THREE.PlaneGeometry(1,1)),new THREE.MeshBasicMaterial({toneMapped:false}));m.frustumCulled=true;this.grp.add(m);return m},
  tick(dt){if(!this.ready||!this.grp||typeof started==='undefined'||!started)return;this.grp.visible=!PORTAL.cur;this.T+=dt;if(this.T<.45)return;this.T=0;if(PORTAL.cur)return;
    const px=player.x,pz=player.z,id=chunkIdAt2(px,pz);if(id<0)return;const i0=id%NCX,j0=Math.floor(id/NCX),near=[];let budget=30;
    for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){const a=this.by.get(j*NCX+i);if(!a)continue;
      for(const v of a){if(this.NOSIGN.has(v.c))continue;const d=Math.hypot(v.x-px,v.z-pz);if(d>85)continue;if(!v.m){if(budget--<=0)continue;this.match(v)}if(v.m!==1)continue;near.push([d,v])}}
    near.sort((a,b)=>a[0]-b[0]);const want=new Set();for(let i=0;i<near.length&&i<(MOBILE?22:40);i++)want.add(near[i][1]);
    for(const [v,m] of this.live)if(!want.has(v)){m.visible=false;this.pool.push(m);this.live.delete(v)}
    for(const v of want){if(this.live.has(v))continue;const m=this.pool.pop()||this.newMesh(),t=this.signTex(v),tall=t.userData.tall,w=Math.min(4.6,Math.max(1.8,Math.min(v.L-.5,.3*v.name.length+1.6))),h=w*(tall?.25:.157);
      m.material.map=t;m.material.needsUpdate=true;m.scale.set(w,h,1);const hy0=Math.max(1.9,Math.min(3.1,(v.lv||1)*3-.8)),hy=v.dr?Math.min(Math.max(hy0,2.2+h/2),(v.lv||1)*3-.15-h/2):hy0;   // a venue with a door: the sign sits on the lintel
      m.position.set(v.sx+v.nx*.14,groundH(v.sx,v.sz)+hy,v.sz+v.nz*.14);m.rotation.y=Math.atan2(v.nx,v.nz);m.visible=true;this.live.set(v,m)}
    // the chalk text on the sandwich boards of the nearest few
    const wm=[];for(const [d,v] of near){if(v.menu&&d<20){wm.push(v);if(wm.length>=(MOBILE?3:6))break}}
    const wms=new Set(wm);
    for(const [v,m] of this.mlive)if(!wms.has(v)){m.visible=false;this.mpool.push(m);this.mlive.delete(v)}
    for(const v of wm){if(this.mlive.has(v))continue;const m=this.mpool.pop()||this.newMenu(),q=v.menu;
      m.material.map=this.menuTex(v);m.material.needsUpdate=true;m.position.set(q.x,q.y,q.z);m.rotation.set(-q.a,q.ry,0);m.visible=true;this.mlive.set(v,m)}},

  // ---- frontage (static, baked into the chunk's props by buildChunkGen) ----
  frontage(id,P,ctx){
    if(!this.ready){this.late.add(id);return}
    const i0=id%NCX,j0=Math.floor(id/NCX),done=[];let budget=60;
    for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){if(i<0||j<0||i>=NCX||j>=NCZ)continue;const a=this.by.get(j*NCX+i);if(!a)continue;
      for(const v of a){if(!this.FRONT.has(v.c))continue;if(!v.m){if(budget--<=0)continue;this.match(v)}
        if(v.m!==1||chunkIdAt2(v.sx,v.sz)!==id)continue;
        let dup=false;for(const q of done)if(Math.hypot(q[0]-v.sx,q[1]-v.sz)<3.2){dup=true;break}if(dup)continue;
        done.push([v.sx,v.sz]);this.front1(id,P,ctx,v)}}},
  front1(id,P,ctx,v){
    const c=sRGB,nx=v.nx,nz=v.nz,tx=nz,tz=-nx,sx=v.sx,sz=v.sz,ry=Math.atan2(nx,nz),h=Math.imul(v.i+1,2654435761)>>>0;
    const L=(s,d)=>[sx+tx*s+nx*d,sz+tz*s+nz*d],yb=(x,z)=>groundH(x,z)+.17,y0=yb(sx,sz);
    const free=(x,z,m)=>!ctx.blockedStatic(x,z,m)&&!ctx.solid(x,z,m)&&!ctx.nearRoad(id,x,z,-SW[0]);
    const wood=c(['#6a4a2e','#4a3426','#7a5a3a','#3a3a40'][(h>>3)&3]),iron=c('#1c1d20'),frame=c(['#3a2a1f','#2b3a36','#4a2a2a','#1f2b3a'][h&3]),glow=c(this.GLOW[v.c]||this.GLOW.cafe);
    // the doorway: the room behind it is painted and lights up at night, two pendant lamps and a counter hint at a bar inside
    let p=L(0,.035);P.box(p[0],y0+1.0,p[1],1.0,2.0,.04,ry,glow,8);
    p=L(.1,.06);P.box(p[0],y0+.45,p[1],.78,.9,.02,ry,c('#2a1a10'),5);
    p=L(0,.06);P.box(p[0],y0+1.88,p[1],.86,.05,.02,ry,c('#ffe3a8'),8);
    for(let k=0;k<3;k++){p=L(-.2+k*.2,.07);P.box(p[0],y0+1.02,p[1],.06,.22,.02,ry,c(['#2e5a2e','#6a1d2a','#caa75a'][(h>>k)%3]),8)}
    for(const s of [-1,1]){p=L(s*.54,.07);P.box(p[0],y0+1.04,p[1],.1,2.08,.14,ry,frame,5)}
    p=L(0,.07);P.box(p[0],y0+2.07,p[1],1.2,.1,.14,ry,frame,5);
    p=L(0,.2);P.box(p[0],y0+.04,p[1],1.1,.08,.4,ry,c('#8a8680'),9);
    // the door leaf, swung open towards the street
    const hs=(h&8)?1:-1,th=1.3,dx=-tx*hs*Math.cos(th)+nx*Math.sin(th),dz=-tz*hs*Math.cos(th)+nz*Math.sin(th),hg=L(hs*.5,.1),cx=hg[0]+dx*.46,cz=hg[1]+dz*.46,lry=Math.atan2(-dz,dx);
    P.box(cx,y0+1.0,cz,.92,2.0,.045,lry,c(['#6a4a2e','#2d4a3e','#5a2a2a','#3a3a4a'][(h>>2)&3]),5);P.box(cx,y0+1.4,cz,.5,.95,.06,lry,c('#10161c'),2);
    P.box(cx+dx*.38,y0+1.0,cz+dz*.38,.1,.03,.09,lry,c('#c9a64a'),6);
    v.dr=1;
    // the sandwich board (A-frame) beside the door; the text is a live decal, see tick()
    const sd=(h&16)?1:-1,bp=L(sd*1.25,1.0),a=.25,ca=Math.cos(a),sa=Math.sin(a);
    if(free(bp[0],bp[1],.4)){const yb2=yb(bp[0],bp[1]);
      for(const f of [1,-1])P.box(bp[0]+nx*f*.109,yb2+.44,bp[1]+nz*f*.109,.56,.9,.035,ry,wood,5,-f*a);
      const fx=bp[0]+nx*(.109+.0235*ca),fz=bp[1]+nz*(.109+.0235*ca),fy=yb2+.44+.0235*sa;      // the chalkboard face on the street-side leaf
      P.box(fx,fy,fz,.46,.76,.012,ry,c('#1c2326'),4,-a);
      const on=(lx,ly,lz)=>[fx+tx*lx+nx*(lz*ca-ly*sa),fy+ly*ca+lz*sa,fz+tz*lx+nz*(lz*ca-ly*sa)];   // a point in the face plane (lz = out of the board)
      for(let k=0;k<5;k++){const q=on(((h>>k)&3)*.02-.03,.26-k*.11,.009);P.box(q[0],q[1],q[2],.3+((h>>(k+3))&3)*.03,.02,.006,ry,c(k?'#cfd6d4':'#e8c96a'),0,-a)}   // chalk lines, covered by the live text up close
      ctx.cirs.push(bp[0],bp[1],.34);
      const q=on(0,0,.0145);v.menu={x:q[0],y:q[1],z:q[2],ry,a}}
    else v.menu=null;
    // pavement tables with two chairs each (not for sweet shops)
    if(v.c!=='sweet'){let placed=0;const topC=c(['#d8c9a8','#2f3a40','#b5472f','#e8e2d6'][(h>>5)&3]);
      for(const s of [-sd*2.6,-sd*4.1,sd*3.0]){if(placed>=2)break;const q=L(s,1.8);if(!free(q[0],q[1],.95))continue;const y=yb(q[0],q[1]);placed++;
        P.cyl(q[0],y,q[1],.2,.2,.03,10,iron,1);P.cyl(q[0],y+.03,q[1],.025,.025,.68,6,iron,1);P.cyl(q[0],y+.71,q[1],.34,.34,.035,12,topC,5);
        for(const f of [-1,1]){const cx2=q[0]+tx*f*.62,cz2=q[1]+tz*f*.62,rc=Math.atan2(-tx*f,-tz*f),cr=Math.cos(rc),sr=Math.sin(rc),at=(lx,lz)=>[cx2+lx*cr+lz*sr,cz2-lx*sr+lz*cr];
          P.box(cx2,y+.45,cz2,.4,.045,.4,rc,wood,5);for(const lx of [-.17,.17])for(const lz of [-.17,.17]){const w=at(lx,lz);P.box(w[0],y+.225,w[1],.03,.45,.03,rc,iron,1)}
          const b=at(0,-.18);P.box(b[0],y+.7,b[1],.4,.42,.035,rc,wood,5)}
        ctx.cirs.push(q[0],q[1],.5)}}},
  newMenu(){const m=new THREE.Mesh(this.mgeo||(this.mgeo=new THREE.PlaneGeometry(.46,.76)),patchMat(new THREE.MeshStandardMaterial({map:this.mblank||(this.mblank=new THREE.CanvasTexture(document.createElement('canvas'))),roughness:.95,metalness:0}),{key:'menu',fSurf:'sRough=.95;'}));
    m.rotation.order='YXZ';m.frustumCulled=true;this.grp.add(m);return m},
  menuTex(v){const key=v.c+'|'+v.name;let t=this.mtex.get(key);if(t)return t;
    const M=this.MENU[v.c]||this.MENU.cafe,h=Math.imul(v.i+1,2654435761)>>>0,cv=document.createElement('canvas');cv.width=256;cv.height=416;const g=cv.getContext('2d');
    g.fillStyle='#1c2326';g.fillRect(0,0,256,416);
    g.globalAlpha=.06;g.fillStyle='#ffffff';for(let i=0;i<16;i++)g.fillRect((i*67)%200,(i*109)%380,50+(i*29)%110,10+(i%3)*6);g.globalAlpha=1;
    const f='"Segoe Print","Bradley Hand","Comic Sans MS",cursive';g.textBaseline='middle';g.textAlign='center';
    g.fillStyle='#ffe08a';g.font='700 40px '+f;g.fillText(M.t,128,40);
    let sz=22;g.fillStyle='#d9e6ea';g.font='600 '+sz+'px '+f;while(g.measureText(v.name).width>224&&sz>11){sz--;g.font='600 '+sz+'px '+f}g.fillText(v.name,128,82);
    g.strokeStyle='#d9e6ea';g.lineWidth=2;g.beginPath();g.moveTo(34,106);g.lineTo(222,106);g.stroke();
    g.font='600 24px '+f;M.it.forEach((it,k)=>{const y=142+k*44,pr=Math.round(it[1]*(.85+((h>>k)&7)/20)/5)*5;g.textAlign='left';g.fillStyle='#f2f4f0';g.fillText(it[0],18,y);g.textAlign='right';g.fillStyle='#ffd27a';g.fillText(String(pr),238,y)});
    g.textAlign='center';g.fillStyle='#9fb4ba';g.font='500 18px '+f;g.fillText('open daily 9 – 23',128,398);
    t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;this.mtex.set(key,t);
    if(this.mtex.size>60){for(const [k,o] of this.mtex){let used=false;for(const m of this.mlive.values())if(m.material.map===o)used=true;if(!used){o.dispose();this.mtex.delete(k);break}}}
    return t}
};

// ================= interiors for the venue kinds the old shop set did not cover =================
function venInteriors(){
  const c=sRGB,Y=INT_Y,add=(key,idx,o)=>{INTERIORS[key]=()=>simpleInterior(key,idx,o);if(typeof BGW!=='undefined')BGW.push({name:key})};
  const stool=(P,x,z,col)=>{P.cyl(x,Y,z,.04,.04,.62,6,c('#8a8f94'),6);P.cyl(x,Y+.62,z,.19,.19,.07,10,c(col||'#3b2a1e'),4);LOW_OBB.push(x,z,.2,.2,1,0)};
  // ---------- gaming club: rows of PCs with glowing screens, PlayStation corner, neon
  add('bg_game',80,{w:14,d:11,h:3.2,floor:0x15151c,fr:.4,wall:0x1c1a2e,ceil:0x0d0d14,title:'Gaming club',sub:'PCs, consoles and energy drinks',lights:[3,8],lcol:0x8a6cff,li:1.5,
    furnish(P,grp,ox,oz,hw,D){
      neonSign(grp,'GAME CLUB',ox,Y+2.55,oz+D-.1,Math.PI,5.4,'#46f2ff');neonSign(grp,'LEVEL UP',ox-hw+.1,Y+2.25,oz+6,Math.PI/2,3.2,'#ff5bd0');neonSign(grp,'GG',ox+hw-.1,Y+2.25,oz+6,-Math.PI/2,1.6,'#ffd84a');
      const glow=['#2c6bff','#8a3dff','#18d6ff','#ff3d8a','#27e08a'];
      for(const r of [0,1])for(let k=0;k<5;k++){const x=ox-4.8+k*2.4,z=oz+(r?8.4:5.2),g=glow[(k+r*2)%5];
        P.box(x,Y+.74,z,1.5,.05,.75,0,c('#23252d'),1);for(const s of [-1,1])P.box(x+s*.7,Y+.37,z,.05,.74,.7,0,c('#101014'),6);
        P.box(x,Y+.9,z+.12,.06,.2,.06,0,c('#111'),6);P.box(x,Y+1.12,z+.14,.66,.4,.04,0,c('#0a0a10'),2);P.box(x,Y+1.12,z+.115,.58,.33,.012,0,c(g),8);
        P.box(x-.08,Y+.77,z-.16,.44,.02,.14,0,c('#15151c'),1);P.box(x-.08,Y+.78,z-.16,.4,.012,.1,0,c(g),8);P.box(x+.4,Y+.79,z-.15,.07,.025,.11,0,c('#15151c'),1);
        P.box(x+.55,Y+.26,z+.18,.22,.46,.46,0,c('#0f0f16'),1);P.box(x+.55,Y+.3,z-.055,.14,.02,.012,0,c(g),8);
        P.box(x,Y+.46,z-.85,.5,.08,.5,0,c('#17171d'),4);P.box(x,Y+.9,z-1.1,.5,.82,.08,0,c(r?'#1d5fd0':'#c0192c'),4);P.cyl(x,Y,z-.85,.04,.04,.46,6,c('#8a8f94'),6);
        LOW_OBB.push(x,z,.78,.4,1,0);
        INTERACT.push({x,z:z-.9,r:1.2,label:'Play at this PC',fn:()=>toast('GG','you won the match 2–1 and lost an hour')})}
      for(const s of [-1,1]){P.box(ox+s*(hw-.08),Y+.04,oz+6,.03,.05,D-1,0,c(s<0?'#ff5bd0':'#46f2ff'),8);P.box(ox+s*(hw-.08),Y+3.1,oz+6,.03,.05,D-1,0,c(s<0?'#46f2ff':'#ff5bd0'),8)}
      // PlayStation corner (back left): sofa, wide TV, low table
      P.box(ox-5,Y+.3,oz+D-1.2,3,.6,1,0,c('#3a2f55'),4);P.box(ox-5,Y+.8,oz+D-.8,3,.6,.2,0,c('#3a2f55'),4);LOW_OBB.push(ox-5,oz+D-1.2,1.5,.5,1,0);
      P.box(ox-5,Y+1.5,oz+D-.15,2.2,1.25,.06,0,c('#0a0a10'),2);P.box(ox-5,Y+1.5,oz+D-.185,2.1,1.15,.01,0,c('#ff3d5a'),8);P.box(ox-5,Y+.2,oz+D-3,1.3,.4,.6,0,c('#1a1a22'),1);LOW_OBB.push(ox-5,oz+D-3,.65,.3,1,0);
      INTERACT.push({x:ox-5,z:oz+D-2.3,r:1.6,label:'Play on the console',fn:()=>toast('PlayStation','FIFA, 3 goals in a row')});
      // counter + fridge (back right)
      P.box(ox+5,Y+.55,oz+D-2.4,2.6,1.1,.8,0,c('#2a2a33'),1);P.box(ox+5,Y+1.12,oz+D-2.4,2.7,.06,.9,0,c('#46f2ff'),8);LOW_OBB.push(ox+5,oz+D-2.4,1.35,.45,1,0);
      P.box(ox+hw-.7,Y+1,oz+D-.6,.8,2,.7,0,c('#e9edf0'),1);P.box(ox+hw-.7,Y+1.1,oz+D-.94,.6,1.5,.02,0,c('#27e08a'),8);LOW_OBB.push(ox+hw-.7,oz+D-.6,.4,.35,1,0);
      INTERACT.push({x:ox+5,z:oz+D-3.3,r:1.6,label:'Pay for an hour (₴60)',fn:()=>{if(typeof WALLET!=='undefined'&&WALLET.pay&&!WALLET.pay(60,'gaming hour'))return;toast('Time on','good luck, have fun')}})}});
  // ---------- restaurant: tables with cloths and candles, a bar with bottles
  add('bg_rest',81,{w:12,d:10,h:3.5,floor:0x5a4636,fr:.6,wall:0xf0e3cd,ceil:0xe8ddc8,title:'Restaurant',sub:'a table by the window',lights:[2.5,7.5],lcol:0xffd9a8,li:1.8,
    furnish(P,grp,ox,oz,hw,D){
      neonSign(grp,'RESTAURANT',ox,Y+3,oz+D-.1,Math.PI,4.6,'#ffd28a');
      for(const z of [3.8,6.4,8.6])for(const x of [-3.6,-1.2,1.2,3.6]){if(z===8.6&&Math.abs(x)<1.5)continue;const X=ox+x,Z=oz+z;
        P.cyl(X,Y+.74,Z,.52,.52,.05,14,c('#f4efe6'),4);P.cyl(X,Y,Z,.06,.06,.74,8,c('#2a211b'),6);P.cyl(X,Y,Z,.28,.28,.03,10,c('#2a211b'),6);P.cyl(X+.1,Y+.79,Z-.1,.03,.03,.12,6,c('#ffcf70'),3);
        for(const [dx,dz] of [[-.8,0],[.8,0],[0,-.8]]){P.box(X+dx,Y+.44,Z+dz,.42,.05,.42,0,c('#7a5538'),5);P.box(X+dx,Y+.7,Z+dz+(dz?-.2*Math.sign(dz):0),dz?.42:.05,.5,dz?.05:.42,0,c('#7a5538'),5);P.cyl(X+dx,Y,Z+dz,.03,.03,.44,6,c('#2a211b'),6)}
        LOW_OBB.push(X,Z,.95,.95,1,0)}
      P.box(ox,Y+.55,oz+D-1.6,5,1.1,.7,0,c('#4a2f1d'),5);P.box(ox,Y+1.12,oz+D-1.6,5.2,.06,.8,0,c('#2a1a10'),5);LOW_OBB.push(ox,oz+D-1.6,2.6,.45,1,0);
      for(let k=0;k<6;k++){P.box(ox-2+k*.8,Y+1.55,oz+D-.35,.5,.04,.3,0,c('#4a2f1d'),5);for(let q=0;q<3;q++)P.cyl(ox-2.2+k*.8+q*.17,Y+1.58,oz+D-.35,.045,.045,.28,6,c(['#2e5a2e','#6a1d2a','#d9c08a'][(k+q)%3]),3)}
      for(let k=0;k<4;k++)stool(P,ox-1.8+k*1.2,oz+D-2.4);
      P.box(ox+hw-.7,Y+1.1,oz+4.5,.8,2.2,2,0,c('#5a3d2a'),5);for(let q=0;q<8;q++)P.cyl(ox+hw-.55,Y+.3+(q%4)*.5,oz+3.9+Math.floor(q/4)*.9,.05,.05,.3,6,c('#6a1d2a'),3,0,Math.PI/2);LOW_OBB.push(ox+hw-.7,oz+4.5,.45,1,1,0);
      INTERACT.push({x:ox,z:oz+D-3.2,r:1.8,label:'Order lunch',fn:()=>toast('Menu','forshmak, varenyky, grilled fish and a glass of wine')})}});
  // ---------- bar / club: long bar, glowing shelves, pool table, neon
  add('bg_bar',82,{w:12,d:9,h:3.2,floor:0x2a1d16,fr:.5,wall:0x20161a,ceil:0x120d10,title:'Bar',sub:'dim light and loud music',lights:[2.5,6.5],lcol:0xff9a5a,li:1.3,
    furnish(P,grp,ox,oz,hw,D){
      neonSign(grp,'BAR',ox,Y+2.55,oz+D-.1,Math.PI,2.6,'#ff4fb8');neonSign(grp,'COLD BEER',ox-hw+.1,Y+2.1,oz+4.5,Math.PI/2,2.8,'#ffd84a');
      P.box(ox,Y+.55,oz+D-1.8,7,1.1,.8,0,c('#3b2a1e'),5);P.box(ox,Y+1.12,oz+D-1.8,7.2,.07,.95,0,c('#1a110b'),5);LOW_OBB.push(ox,oz+D-1.8,3.6,.5,1,0);
      for(let k=0;k<6;k++)stool(P,ox-3+k*1.2,oz+D-2.9,'#8a2a2a');
      P.box(ox,Y+1.7,oz+D-.12,7,2,.12,0,c('#2a1a14'),5);for(let r=0;r<3;r++){P.box(ox,Y+.95+r*.55,oz+D-.3,6.6,.04,.28,0,c('#4a3322'),5);P.box(ox,Y+.99+r*.55,oz+D-.3,6.4,.012,.06,0,c('#ffb868'),8);
        for(let q=0;q<9;q++)P.cyl(ox-3.1+q*.78,Y+1+r*.55,oz+D-.3,.05,.05,.3,6,c(['#2e5a2e','#6a3a1d','#caa75a','#1e3a6a'][(q+r)%4]),3)}
      // pool table
      P.box(ox-3,Y+.8,oz+4.4,2.7,.12,1.5,0,c('#1d6a3a'),4);P.box(ox-3,Y+.72,oz+4.4,2.9,.1,1.7,0,c('#4a2f1d'),5);for(const [dx,dz] of [[-1.3,-.7],[1.3,-.7],[-1.3,.7],[1.3,.7]])P.box(ox-3+dx,Y+.35,oz+4.4+dz,.18,.7,.18,0,c('#3b2a1e'),5);LOW_OBB.push(ox-3,oz+4.4,1.45,.85,1,0);
      for(const k of [0,1,2,3])P.cyl(ox-3.4+k*.2,Y+.87,oz+4.4,.045,.045,.05,8,c(['#d9261c','#f2c418','#2f6db0','#111'][k]),1);
      INTERACT.push({x:ox-3,z:oz+3,r:1.5,label:'Play pool',fn:()=>toast('Break','solid ball in the corner pocket')});
      for(const s of [-1,1]){P.cyl(ox+3.7,Y,oz+4.2+s*1.4,.4,.4,.05,10,c('#1a1a22'),1);P.cyl(ox+3.7,Y+.05,oz+4.2+s*1.4,.05,.05,1.0,8,c('#8a8f94'),6);P.cyl(ox+3.7,Y+1.05,oz+4.2+s*1.4,.34,.34,.05,12,c('#3b2a1e'),5);LOW_OBB.push(ox+3.7,oz+4.2+s*1.4,.4,.4,1,0)}
      INTERACT.push({x:ox,z:oz+D-3.7,r:2.2,label:'Order a drink',fn:()=>toast('Cheers','a cold one and a snack')})}});
  // ---------- gym: treadmills, benches, racks, mirror wall
  add('bg_gym',83,{w:14,d:10,h:3.8,floor:0x2b2d31,fr:.8,wall:0xd7d9dc,ceil:0xeceff2,title:'Gym',sub:'iron, cardio and loud music',lights:[3,7],lcol:0xf2f6ff,li:1.9,
    furnish(P,grp,ox,oz,hw,D){
      neonSign(grp,'NO PAIN NO GAIN',ox,Y+3.1,oz+D-.1,Math.PI,5.4,'#ff9a2e');P.box(ox,Y+1.5,oz+D-.07,hw*2-1,2.4,.04,0,c('#8aa0b0'),2);
      for(let k=0;k<5;k++){const x=ox-4.8+k*2.4,z=oz+D-2.2;P.box(x,Y+.12,z,.85,.24,1.8,0,c('#1a1c20'),1);P.box(x,Y+.27,z+.05,.7,.03,1.5,0,c('#0f1012'),1);P.box(x,Y+1.0,z+.75,.1,1.1,.1,0,c('#2a2d33'),6);P.box(x,Y+1.5,z+.7,.6,.3,.12,.0,c('#101216'),1);P.box(x,Y+1.5,z+.64,.5,.2,.01,0,c('#27e08a'),8);LOW_OBB.push(x,z,.45,.95,1,0)}
      for(const [x,z] of [[-5,3.3],[-2.2,3.3]]){const X=ox+x,Z=oz+z;P.box(X,Y+.42,Z,.5,.1,1.3,0,c('#1a1c20'),4);for(const s of [-1,1])P.box(X+s*.8,Y+.65,Z-.35,.06,1.1,.06,0,c('#8a8f94'),6);P.cyl(X,Y+1.2,Z-.35,.025,.025,1.8,8,c('#b8bcc2'),6,0,Math.PI/2);for(const s of [-1,1])P.cyl(X+s*.78,Y+1.07,Z-.35,.22,.22,.08,12,c('#111'),1,0,Math.PI/2);LOW_OBB.push(X,Z,.95,.75,1,0)}
      for(let k=0;k<3;k++){const X=ox+1.2+k*1.5;P.box(X,Y+.35,oz+3.3,1.3,.7,.5,0,c('#2a2d33'),1);for(let q=0;q<6;q++)P.cyl(X-.5+q*.2,Y+.7,oz+3.3,.07,.07,.2,8,c(q%2?'#c0192c':'#111'),1)}LOW_OBB.push(ox+2.7,oz+3.3,2.3,.3,1,0);
      for(let k=0;k<3;k++)P.box(ox+4.4,Y+.02,oz+5.6+k*1.1,.7,.03,1.8,0,c(['#2f6db0','#d9261c','#2f9a4a'][k]),4);
      INTERACT.push({x:ox-3.6,z:oz+4.6,r:1.8,label:'Work out',fn:()=>toast('Pump it','three sets of ten, feel the burn')})}});
  // ---------- clothes shop: rails, folded stacks, mannequins, fitting rooms
  add('bg_cloth',84,{w:14,d:10,h:3.4,floor:0xd8d2c6,fr:.55,wall:0xf4f1ea,ceil:0xfbfaf6,title:'Clothes shop',sub:'new collection',lights:[3,7.5],lcol:0xfff4e0,li:2,
    furnish(P,grp,ox,oz,hw,D){
      neonSign(grp,'NEW COLLECTION',ox,Y+3,oz+D-.1,Math.PI,4.8,'#ffffff');const pal=['#d9261c','#2f6db0','#2f9a4a','#f2c418','#111111','#e8e2d4','#8a4ab0','#e07a2a'];
      for(let r=0;r<3;r++){const z=oz+3.8+r*2.2;for(const s of [-1,1]){const X=ox+s*3.2;P.cyl(X,Y+1.45,z,.02,.02,3,8,c('#b8bcc2'),6,0,Math.PI/2);P.box(X-1.45,Y+.72,z,.04,1.45,.04,0,c('#b8bcc2'),6);P.box(X+1.45,Y+.72,z,.04,1.45,.04,0,c('#b8bcc2'),6);
        for(let q=0;q<11;q++)P.box(X-1.35+q*.27,Y+1.05,z,.07,.8,.5,0,c(pal[(q*3+r+(s>0?2:0))%8]),4);LOW_OBB.push(X,z,1.5,.35,1,0)}}
      for(let k=0;k<4;k++){const X=ox-5.8+k*.05;P.box(ox-hw+.6,Y+.5+k*.55,oz+3+k*1.7,.8,.9,1.2,0,c('#cfc7b8'),4);for(let q=0;q<4;q++)P.box(ox-hw+.6,Y+1+k*.55+q*.0,oz+3+k*1.7,.6,.14,.9,0,c(pal[(k+q*2)%8]),4)}LOW_OBB.push(ox-hw+.6,oz+5,.5,2.8,1,0);
      for(const x of [-.8,.8]){P.cyl(ox+x,Y,oz+8.3,.22,.22,.04,10,c('#1a1a1e'),1);P.cyl(ox+x,Y+.04,oz+8.3,.025,.025,1.55,6,c('#8a8f94'),6);P.box(ox+x,Y+1.15,oz+8.3,.36,.62,.2,0,c(pal[x>0?1:0]),4);P.box(ox+x,Y+.62,oz+8.3,.34,.5,.2,0,c('#2a3a5a'),4);P.cyl(ox+x,Y+1.46,oz+8.3,.09,.09,.2,8,c('#e8d6c0'),4)}
      P.box(ox+4,Y+.55,oz+D-1.3,2.6,1.1,.7,0,c('#e8e2d4'),1);P.box(ox+4,Y+1.12,oz+D-1.3,2.7,.05,.8,0,c('#2a2a2e'),1);LOW_OBB.push(ox+4,oz+D-1.3,1.35,.4,1,0);
      for(const x of [-3,-1.8]){P.box(ox+x,Y+1.1,oz+D-.8,1.1,2.2,.1,0,c('#e8e2d4'),1);P.box(ox+x,Y+1.1,oz+D-.9,.9,1.7,.04,0,c('#9aa8b4'),2)}
      INTERACT.push({x:ox,z:oz+5.5,r:2.2,label:'Browse the rails',fn:()=>toast('New in','jackets, jeans and sneakers')})}});
}
