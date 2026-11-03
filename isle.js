/* ===================================================================================================
   isle.js — JUNGLE ISLAND, ~25 km out in the Black Sea (where the arrow on the map points).
   The island does not exist in the map data, so it is a patch of world of its own:
   • islH(x,z): ONE height function (metres above sea level). groundH() gets it through FLAT, so walking, cars, bombs and the camera agree
     with the mesh; the mesh is built from the very same function in 256 m tiles with three levels of detail (+ skirts against cracks)
   • jungle: deterministic 10 m cells hold at most one tree each (position, kind, size from a hash) → the same function draws the instances
     around the player AND answers "is a trunk here" for collisions, no lists needed
   • a beach camp at the landing, a ruined stepped temple on a plateau, a shallow pond
   Animals live in fauna.js.
   =================================================================================================== */
const ISL={cx:27300,cz:-7900,R:2300,dock:[24850,-7850],beach:[25050,-7850],name:'Jungle Island'};
function islHash(a,b){let n=(a*374761393+b*668265263)|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967295}
function islN(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  return islHash(xi,zi)*(1-u)*(1-v)+islHash(xi+1,zi)*u*(1-v)+islHash(xi,zi+1)*(1-u)*v+islHash(xi+1,zi+1)*u*v}
function islFbm(x,z,o){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*islN(x*f,z*f);a*=.5;f*=2.03}return s*(1/(1-Math.pow(.5,o)))*.5+.0}   // ~0..1
function islRc(th){return 1650+420*Math.sin(2*th+1.1)+240*Math.sin(3*th+2.3)+130*Math.sin(5*th+.4)+170*(islN(Math.cos(th)*2.2+9,Math.sin(th)*2.2+4)-.5)}
function islSmooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
// height above sea level; the shelf below the waterline is negative. Far from the island: null.
function islH(x,z){
  const u=x-ISL.cx,v=z-ISL.cz,r2=u*u+v*v;if(r2>4200*4200)return null;const r=Math.sqrt(r2),th=Math.atan2(v,u),Rc=islRc(th),din=Rc-r;     // metres inland from the coast
  if(din<=0){const d=-din;return -Math.min(80,d*.16+d*d*.0005)}
  let h=Math.min(din,40)/40*2.4;                                                          // sand 0 → 2.4 m over 40 m
  const hill=islSmooth(30,520,din)*(16+66*islFbm(u/380+3,v/380-5,4))+islSmooth(500,1400,din)*28*islFbm(u/700+9,v/700+2,3);
  const pk=Math.exp(-(((x-ISL.cx+260)**2+(z-ISL.cz-160)**2)/(330*330)))*120;               // the mountain
  h+=hill+pk;
  // plateau under the temple, flat floor of the pond basin, flat camp ground on the beach
  const T=ISL.temple;if(T){const d=Math.hypot(x-T.x,z-T.z);if(d<110)h+=(T.h-h)*islSmooth(110,62,d);const p=ISL.pond;if(p){const dp=Math.hypot(x-p.x,z-p.z);if(dp<75){h+=(p.h-h)*islSmooth(75,48,dp);if(dp<30)h-=.85*islSmooth(30,10,dp)}}}
  return h}
// ---------- trees: one candidate per 10 m cell ----------
const ISL_CELL=10;
function islCell(ix,iz){const hs=islHash(ix*7+13,iz*11+5);const h2=islHash(ix*3+101,iz*17+59),h3=islHash(ix*19+7,iz*5+211),h4=islHash(ix*29+3,iz*23+89);
  const x=(ix+.12+.76*h2)*ISL_CELL,z=(iz+.12+.76*h3)*ISL_CELL;const hr=islH(x,z);if(hr===null||hr<2.2)return null;
  const u=x-ISL.cx,v=z-ISL.cz,din=islRc(Math.atan2(v,u))-Math.hypot(u,v);
  if(ISL.clear){for(const c of ISL.clear){if((x-c[0])**2+(z-c[1])**2<c[2]*c[2])return null}}
  const dens=islFbm(x/90+17,z/90-3,3);   // clearings and thickets
  let kind=-1,s=.7+.6*h4,r=.35;
  if(din<130){if(hs<.55&&hr<9){kind=1;s=.8+.5*h4;r=.28}else if(hs<.7){kind=2}}                        // beach fringe: palms and bushes
  else if(dens>.36||hs<.12){if(hs<.58){kind=0;s=.8+.9*h4;r=.5*s}else if(hs<.82)kind=2;else if(hs<.9&&hr>10)kind=3;else kind=4}   // jungle
  else if(hs<.35)kind=2;
  if(kind<0)return null;
  return {x,z,y:hr,kind,s,r:kind===0?.45*s+.15:kind===1?.3:kind===3?.7*s:kind===4?.3:0,rot:h3*6.283,h4}}
const ISLE={on:false,near(x,z){return (x-ISL.cx)**2+(z-ISL.cz)**2<3900*3900},
  // trunks, rocks (collision only for kinds 0,1,3)
  blocked(x,z,m){if((x-ISL.cx)**2+(z-ISL.cz)**2>3500*3500)return false;const ix=Math.floor(x/ISL_CELL),iz=Math.floor(z/ISL_CELL);
    for(let j=iz-1;j<=iz+1;j++)for(let i=ix-1;i<=ix+1;i++){const c=islCell(i,j);if(c&&c.r>0){const d=(x-c.x)**2+(z-c.z)**2,rr=c.r+m;if(d<rr*rr)return true}}
    const o=ISL.solids;if(o)for(const b of o){if(Math.abs(x-b.x)<b.hw+m&&Math.abs(z-b.z)<b.hd+m&&(b.y1===undefined||true))return true}return false},
  tiles:new Map(),veh:null,last:[1e9,1e9],built:false,
  init(world){
    // landing beach on the west coast + the yacht's anchorage 150 m off it; temple and pond placed relative to the landing
    const th=Math.PI*1.02,Rc=islRc(th);ISL.beach=[ISL.cx+Math.cos(th)*(Rc-30),ISL.cz+Math.sin(th)*(Rc-30)];ISL.dock=[ISL.cx+Math.cos(th)*(Rc+170),ISL.cz+Math.sin(th)*(Rc+170)];ISL.landTh=th;ISL.coast=[ISL.cx+Math.cos(th)*Rc,ISL.cz+Math.sin(th)*Rc];
    const tx=ISL.cx-380,tz=ISL.cz+170;ISL.temple=null;ISL.pond=null;{const h0=islH(tx,tz);ISL.temple={x:tx,z:tz,h:h0}}
    {const px=tx+150,pz=tz+110;const h0=islH(px,pz);ISL.pond={x:px,z:pz,h:h0};}
    // keep the camp, the temple and the pond free of trees
    ISL.clear=[[ISL.beach[0]+12,ISL.beach[1],26],[tx,tz,70],[ISL.pond.x,ISL.pond.z,44]];ISL.solids=[];
    FLAT.push({x:ISL.cx,z:ISL.cz,R:4300,fn:(x,z,h)=>{const r=islH(x,z);return r===null?h:SL+r}});
    this.root=new THREE.Group();this.root.visible=false;world.add(this.root);
    this.mats();this.buildCamp();this.buildTemple();this.buildPond();this.vegInit();
    PLACES.push({id:'jungle',name:'Jungle Island',sub:'25 km out in the Black Sea · sail there on the yacht',x:ISL.beach[0],z:ISL.beach[1],yaw:Math.atan2(ISL.cx-ISL.beach[0],ISL.cz-ISL.beach[1])});
    try{MAP_SEA.add('jungle');MAP_MAJOR.add('jungle')}catch(e){}
    this.built=true},
  mats(){
    const dtex=MBM.tex(256,256,(x,w,h)=>{x.fillStyle='#d8d8d8';x.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=170+((i*97)%80);x.fillStyle=`rgba(${v},${v},${v},.4)`;x.fillRect((i*53)%w,(i*131)%h,2+(i%4),2+(i%3))}
      for(let i=0;i<120;i++){x.fillStyle='rgba(60,60,60,.18)';x.beginPath();x.ellipse((i*83)%w,(i*47)%h,6+(i%9),2+(i%4),(i%7)*.5,0,6.283);x.fill()}},true);
    this.terrM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,map:dtex});
    const M=MBM.std;this.M={bark:M(0x5a4030,.95),leaf:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide}),palm:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,side:THREE.DoubleSide}),rock:M(0x7d7a72,.95),
      stone:M(0x8a8678,.95),stoneD:M(0x5f5c52,.95),moss:M(0x4d6a3a,1),wood:M(0x6b4a2e,.9),canvas:M(0xd9cba6,.95,0,{side:THREE.DoubleSide}),canvasR:M(0xb54a35,.95,0,{side:THREE.DoubleSide}),fire:MBM.emis(0xff8a2a,1.8),coal:M(0x1a1410,1),crate:M(0x8a6a3a,.9),water:new THREE.MeshStandardMaterial({color:new THREE.Color(0x2d6a68).convertSRGBToLinear(),roughness:.08,metalness:.1,transparent:true,opacity:.82,depthWrite:false}),
      sign:M(0xffffff,.8),red:M(0xb02a2a,.8),vine:M(0x3a6a2a,.9),gold:M(0xc9a24a,.35,.8),lamp:MBM.emis(0xffe2a8,1.4),barrel:M(0x2d5a8a,.6,.3)};
    this.bush=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide})},
  // ---------- terrain tiles ----------
  TS:256,
  tileKey(i,j){return i+','+j},
  buildTile(i,j,lod){const n=lod===0?64:lod===1?32:16,TS=this.TS,x0=ISL.cx+i*TS,z0=ISL.cz+j*TS,st=TS/n,pos=[],col=[],uv=[],idx=[];const W=n+1;const E=2;
    const H=(x,z)=>{const h=islH(x,z);return h===null?-80:h};
    for(let b=0;b<=n;b++)for(let a=0;a<=n;a++){const x=x0+a*st,z=z0+b*st,h=H(x,z);pos.push(x,SL+h,z);uv.push(x/7,z/7);
      const nx=(H(x-E,z)-H(x+E,z)),nz=(H(x,z-E)-H(x,z+E)),slope=Math.min(1,Math.hypot(nx,nz)/(2*E)*1.2),k=islN(x/9,z/9),k2=islN(x/40+4,z/40-2);
      let c;
      if(h<-.4)c=[.55,.5,.38];else if(h<2.6){const t=Math.max(0,h)/2.6;c=[.86-.18*t,.78-.08*t,.58-.1*t]}     // sand → damp sand → edge of the jungle floor
      else{const g=.85+.3*k;c=[.1*g,.26*g*(.9+.2*k2),.07*g];if(h>135){const t=islSmooth(135,200,h);c=[c[0]+(.4-c[0])*t,c[1]+(.38-c[1])*t,c[2]+(.33-c[2])*t]}
        if(slope>.55){const t=Math.min(1,(slope-.55)*3);c=[c[0]+(.42-c[0])*t,c[1]+(.38-c[1])*t,c[2]+(.32-c[2])*t]}}
      if(h>2.6&&h<5)c=[c[0]*.7+.86*.3,c[1]*.7+.7*.3,c[2]*.7+.5*.3];
      {const T=ISL.temple;if(T){const dT=Math.hypot(x-T.x,z-T.z);if(dT<48){const t=islSmooth(48,30,dT);c=[c[0]+(.52-c[0])*t,c[1]+(.5-c[1])*t,c[2]+(.43-c[2])*t]}}}
      col.push(c[0]*.9,c[1]*.9,c[2]*.9)}
    for(let b=0;b<n;b++)for(let a=0;a<n;a++){const p=b*W+a;idx.push(p,p+W,p+1,p+1,p+W,p+W+1)}
    // skirts hide the cracks between detail levels
    const base=pos.length/3,sk=(lod===0?6:lod===1?14:30);
    const edge=[];for(let a=0;a<=n;a++)edge.push(a);for(let b=1;b<=n;b++)edge.push(b*W+n);for(let a=n-1;a>=0;a--)edge.push(n*W+a);for(let b=n-1;b>=1;b--)edge.push(b*W);
    edge.forEach(vi=>{pos.push(pos[vi*3],pos[vi*3+1]-sk,pos[vi*3+2]);col.push(col[vi*3],col[vi*3+1],col[vi*3+2]);uv.push(uv[vi*2],uv[vi*2+1])});
    for(let k=0;k<edge.length;k++){const a=edge[k],b=edge[(k+1)%edge.length],c=base+k,d=base+(k+1)%edge.length;idx.push(a,c,b,b,c,d)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();
    const m=new THREE.Mesh(g,this.terrM);m.receiveShadow=lod===0;m.castShadow=false;m.matrixAutoUpdate=false;return m},
  updateTiles(budget){const cx=camera.position.x,cz=camera.position.z,TS=this.TS;let made=0;
    const i0=Math.floor((cx-ISL.cx)/TS),j0=Math.floor((cz-ISL.cz)/TS);
    for(let j=-17;j<=16;j++)for(let i=-17;i<=16;i++){const key=this.tileKey(i,j),tcx=ISL.cx+(i+.5)*TS,tcz=ISL.cz+(j+.5)*TS,d=Math.hypot(tcx-cx,tcz-cz);
      // skip tiles that are entirely deep sea
      if(Math.hypot(tcx-ISL.cx,tcz-ISL.cz)>ISL.R+1150)continue;
      const want=d<520?0:d<1500?1:d<5400?2:-1;let t=this.tiles.get(key);
      if(want<0){if(t){this.root.remove(t.m);t.m.geometry.dispose();this.tiles.delete(key)}continue}
      if(t&&t.lod===want)continue;if(made>=budget)continue;
      const m=this.buildTile(i,j,want);if(t){this.root.remove(t.m);t.m.geometry.dispose()}this.root.add(m);this.tiles.set(key,{m,lod:want});made++}},
  // ---------- jungle instancing ----------
  vegInit(){
    const mk=(geo,mat,max)=>{const im=new THREE.InstancedMesh(geo,mat,max);im.count=0;im.frustumCulled=false;im.castShadow=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(im);return im};
    const col=(g,r,gg,b)=>{const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=r;a[i*3+1]=gg;a[i*3+2]=b}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g};
    const merge=(parts)=>{const pos=[],nor=[],cl=[],idx=[];let base=0;for(const g0 of parts){const g=g0.index?g0:g0;const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));nor.push(n.getX(i),n.getY(i),n.getZ(i));cl.push(c.getX(i),c.getY(i),c.getZ(i))}
        if(g.index)for(let i=0;i<g.index.count;i++)idx.push(base+g.index.getX(i));else for(let i=0;i<p.count;i++)idx.push(base+i);base+=p.count}
      const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));G.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));G.setIndex(idx);return G};
    const T=(g,x,y,z,sx,sy,sz,rx,rz)=>{g.scale(sx||1,sy||1,sz||1);if(rx)g.rotateX(rx);if(rz)g.rotateZ(rz);g.translate(x||0,y||0,z||0);return g};
    // 0: broadleaf jungle tree — buttress trunk + four canopy lobes
    {const parts=[col(T(new THREE.CylinderGeometry(.28,.6,13,6),0,6.5,0),.33,.24,.17),col(T(new THREE.CylinderGeometry(.6,1.1,1.6,6),0,.8,0),.3,.22,.16)];
      for(const [x,y,z,s,c] of [[0,14,0,5.4,[.08,.3,.07]],[2.6,12.2,1.2,4,[.1,.36,.09]],[-2.4,12.6,-1.6,4.2,[.07,.27,.08]],[.6,17,-.4,3.4,[.12,.4,.1]]])parts.push(col(T(new THREE.IcosahedronGeometry(1,1),x,y,z,s,s*.72,s),...c));
      this.treeGeo=merge(parts)}
    // 1: coconut palm — leaning ringed trunk + 9 drooping fronds
    {const parts=[];let px=0,py=0;for(let i=0;i<6;i++){const g=new THREE.CylinderGeometry(.16-i*.012,.2-i*.012,1.7,6);const lean=.05*i*i*.3;parts.push(col(T(g,lean,i*1.65+.85,0),.45,.36,.26))}
      const topx=.05*25*.3,topy=9.9;for(let f=0;f<9;f++){const a=f/9*6.283,fl=new THREE.PlaneGeometry(.9,4.2,1,4);const p=fl.attributes.position;for(let q=0;q<p.count;q++){const y=p.getY(q)+2.1,s=y/4.2;p.setZ(q,-s*s*1.9);p.setX(q,p.getX(q)*(1-s*.55)*(1+.2*Math.sin(s*9)))}fl.rotateX(-Math.PI/2);fl.rotateX(.28);fl.computeVertexNormals();
        const m=new THREE.Matrix4().makeRotationY(a);fl.applyMatrix4(m);fl.translate(topx,topy,0);parts.push(col(fl,.1+(f%2)*.03,.34+(f%3)*.03,.08))}
      this.palmGeo=merge(parts.map(g=>{if(!g.attributes.normal)g.computeVertexNormals();return g}))}
    // 2: bush / fern — three crossed leaf fans
    {const parts=[];for(let f=0;f<6;f++){const g=new THREE.PlaneGeometry(.8,1.6,1,3);const p=g.attributes.position;for(let q=0;q<p.count;q++){const y=p.getY(q)+.8,s=y/1.6;p.setZ(q,-s*s*.7);p.setX(q,p.getX(q)*(1-s*.4))}g.computeVertexNormals();g.rotateX(-.15);g.rotateY(f/6*6.283);parts.push(col(g,.09+(f%3)*.03,.3+(f%2)*.08,.07))}
      this.bushGeo=merge(parts)}
    // 3: boulder, 4: bamboo clump
    {this.rockGeo=merge([col(T(new THREE.DodecahedronGeometry(1,0),0,.4,0,1.3,.9,1.1),.45,.43,.4),col(T(new THREE.DodecahedronGeometry(1,0),1.2,.2,.5,.8,.6,.7),.4,.38,.36)])}
    {const parts=[];for(let k=0;k<7;k++){const a=k*2.4,r=.25+(k%3)*.18,h=7+(k%4)*1.5;parts.push(col(T(new THREE.CylinderGeometry(.04,.05,h,5),Math.cos(a)*r,h/2,Math.sin(a)*r,1,1,1),.55,.62,.25));parts.push(col(T(new THREE.SphereGeometry(.6,5,4),Math.cos(a)*r,h-.4,Math.sin(a)*r,1,1.6,1),.2,.4,.12))}
      this.bambooGeo=merge(parts)}
    // far canopy: low-poly lobes standing for whole trees 320 m … 1.4 km away
    this.farGeo=col(T(new THREE.IcosahedronGeometry(1,0),0,9,0,6,5,6),.08,.27,.07);
    this.iTree=mk(this.treeGeo,this.M.leaf,900);this.iPalm=mk(this.palmGeo,this.M.palm,600);this.iBush=mk(this.bushGeo,this.bush,2200);this.iRock=mk(this.rockGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),260);this.iBamboo=mk(this.bambooGeo,this.M.leaf,160);this.iFar=mk(this.farGeo,this.M.leaf,3600);
    },
  rebuildVeg(px,pz){const R=this.iTree,P=this.iPalm,B=this.iBush,K=this.iRock,Bm=this.iBamboo,F=this.iFar,m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),sc=new THREE.Vector3(),p=new THREE.Vector3(),c=new THREE.Color();
    let nT=0,nP=0,nB=0,nK=0,nM=0,nF=0;const ix0=Math.floor(px/ISL_CELL),iz0=Math.floor(pz/ISL_CELL),RR=Math.ceil(1250/ISL_CELL);
    for(let j=iz0-RR;j<=iz0+RR;j++)for(let i=ix0-RR;i<=ix0+RR;i++){const d2=((i-ix0)**2+(j-iz0)**2)*ISL_CELL*ISL_CELL;if(d2>1250*1250)continue;
      const cl=islCell(i,j);if(!cl)continue;const d=Math.sqrt(d2);
      if(d>340){if(cl.kind===0){if(nF<3600){p.set(cl.x,SL+cl.y-.5,cl.z);sc.set(cl.s*.9,cl.s,cl.s*.9);q.setFromEuler(e.set(0,cl.rot,0));m.compose(p,q,sc);F.setMatrixAt(nF++,m)}}continue}
      p.set(cl.x,SL+cl.y,cl.z);q.setFromEuler(e.set(0,cl.rot,0));
      if(cl.kind===0){if(d<300&&nT<900){sc.set(cl.s,cl.s*(.9+.3*cl.h4),cl.s);m.compose(p,q,sc);R.setMatrixAt(nT,m);nT++}else if(nF<3600){p.y-=.5;sc.set(cl.s*.9,cl.s,cl.s*.9);m.compose(p,q,sc);F.setMatrixAt(nF++,m)}}
      else if(cl.kind===1){if(d<300&&nP<600){sc.set(cl.s,cl.s*(.8+.5*cl.h4),cl.s);q.setFromEuler(e.set(0,cl.rot,0));m.compose(p,q,sc);P.setMatrixAt(nP,m);nP++}}
      else if(cl.kind===2){if(d<110&&nB<2200){sc.set(cl.s*1.2,cl.s*(.9+cl.h4*.8),cl.s*1.2);m.compose(p,q,sc);B.setMatrixAt(nB,m);nB++}}
      else if(cl.kind===3){if(d<300&&nK<260){sc.set(cl.s*1.6,cl.s*1.1,cl.s*1.6);m.compose(p,q,sc);K.setMatrixAt(nK,m);nK++}}
      else if(cl.kind===4){if(d<240&&nM<160){sc.set(1,.8+cl.h4*.5,1);m.compose(p,q,sc);Bm.setMatrixAt(nM,m);nM++}}}
    R.count=nT;P.count=nP;B.count=nB;K.count=nK;Bm.count=nM;F.count=nF;for(const im of [R,P,B,K,Bm,F])im.instanceMatrix.needsUpdate=true;this.last=[px,pz]},
  // ---------- beach camp ----------
  buildCamp(){const g=new THREE.Group(),th=ISL.landTh,bx=ISL.beach[0],bz=ISL.beach[1];this.camp=g;this.root.add(g);const gy=SL+Math.max(2.2,islH(bx+14,bz)||2.4);g.position.set(bx+14,gy,bz);g.rotation.y=Math.atan2(-Math.cos(th),-Math.sin(th))*0;
    const mb=new MB(),M=this.M;
    // two tents, a campfire ring, crates, a barrel, a signpost
    const tent=(x,z,ry,k)=>{const c=Math.cos(ry),sn=Math.sin(ry),P=(lx,y,lz)=>[x+lx*c+lz*sn,y,z-lx*sn+lz*c];   // A-frame: two slopes + two gables
      mb.quad(k,P(-1.3,0,-1.3),P(-1.3,0,1.3),P(0,1.75,1.3),P(0,1.75,-1.3));mb.quad(k,P(1.3,0,1.3),P(1.3,0,-1.3),P(0,1.75,-1.3),P(0,1.75,1.3));
      mb.quad(k,P(-1.3,0,1.3),P(1.3,0,1.3),P(0,1.75,1.3),P(0,1.75,1.3));mb.quad(k,P(1.3,0,-1.3),P(-1.3,0,-1.3),P(0,1.75,-1.3),P(0,1.75,-1.3));
      mb.rod('wood',.03,P(0,1.75,-1.3),P(0,1.75,1.3),4)};
    tent(-5,-3,.3,'canvas');tent(4.5,-5.5,-.6,'canvasR');
    for(let k=0;k<8;k++){const a=k/8*6.283;mb.sph('stone',.28,Math.cos(a)*.9,.2,Math.sin(a)*.9+4,1,.8,1,5)}mb.cyl('coal',.7,.7,.12,10,0,.08,4);mb.cyl('fire',.35,.05,.9,6,0,.55,4);mb.cyl('fire',.2,.02,.7,5,.18,.5,4.1);
    for(const [x,z,s] of [[-2,2,1],[-3.2,2.2,.8],[-2.6,2.4,.7]])mb.bx('crate',x-.45*s,x+.45*s,0,.9*s,z-.45*s,z+.45*s,1);mb.cyl('barrel',.35,.35,.95,10,2.6,.48,-1.5);
    mb.rod('wood',.07,[7,0,-1],[7,2.2,-1],6);mb.bx('sign',6.2,7.8,1.6,2.2,-1.05,-.95);
    const nm=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.6),new THREE.MeshBasicMaterial({map:MBM.tex(256,96,(x,w,h)=>{x.fillStyle='#e9d9b0';x.fillRect(0,0,w,h);x.fillStyle='#5a2a14';x.font='700 26px "Unbounded",Arial';x.textAlign='center';x.fillText('JUNGLE',w/2,36);x.fillText('ISLAND',w/2,72)}),toneMapped:false}));nm.position.set(7,1.9,-1.1);g.add(nm);
    const nm2=nm.clone();nm2.rotation.y=Math.PI;nm2.position.z=-.9;g.add(nm2);
    mb.build(g,{canvas:M.canvas,canvasR:M.canvasR,stone:M.stone,coal:M.coal,fire:M.fire,crate:M.crate,barrel:M.barrel,wood:M.wood,sign:M.sign});
    // fire light + flame sprite that flickers
    const l=new THREE.PointLight(0xff9a40,0,24,2);l.position.set(0,1.4,4);g.add(l);this.fireL=l;
    ISL.solids.push({x:bx+14-5,z:bz-3,hw:1.3,hd:1.2},{x:bx+14+4.5,z:bz-5.5,hw:1.3,hd:1.2},{x:bx+14-2.6,z:bz+2.2,hw:.9,hd:.6},{x:bx+14+2.6,z:bz-1.5,hw:.4,hd:.4})},
  // ---------- ruined stepped temple on the plateau ----------
  buildTemple(){const T=ISL.temple,g=new THREE.Group();g.position.set(T.x,SL+T.h,T.z);this.root.add(g);this.tmp=g;const mb=new MB(),M=this.M;
    // five tiers, steps up the +x face, a shrine on top, broken columns round the plaza
    const tiers=[[26,3.2],[20,3],[15,2.8],[10.5,2.6],[6.5,2.4]];let y=0;const steps=[];
    tiers.forEach(([w,h],i)=>{mb.bx(i%2?'stoneD':'stone',-w/2,w/2,y,y+h,-w/2,w/2,2);ISL.solids.push({x:T.x,z:T.z,hw:w/2,hd:w/2,_y:y});
      for(let k=0;k<h/.4;k++)mb.bx('stone',w/2,w/2+Math.max(.2,(h-k*.4)*.9),y+k*.4,y+k*.4+.4,-1.6,1.6,2);y+=h});
    mb.bx('stone',-2.6,2.6,y,y+3.2,-2.6,2.6,2);mb.bx('stoneD',-3.1,3.1,y+3.2,y+3.7,-3.1,3.1,2);mb.sph('gold',.55,0,y+4.2,0,1,1,1,8);
    for(let k=0;k<10;k++){const a=k/10*6.283,r=22+(k%3)*2,h=2+((k*37)%5);mb.cyl(k%3?'stone':'stoneD',.7,.8,h,8,Math.cos(a)*r,h/2,Math.sin(a)*r)}
    // vines draped over the steps, moss patches
    for(let k=0;k<14;k++){const x=-13+k*1.9,hh=1+((k*13)%7)*.5;mb.rod('vine',.05,[x,0,13.2],[x+.2,3+hh,13.4],4)}
    mb.build(g,{stone:M.stone,stoneD:M.stoneD,gold:M.gold,vine:M.vine});
    // collisions: only the footprint of the whole stack, walkable: the steps are a ramp up the +x face via ground function
    ISL.solids=ISL.solids.filter(s=>!s._y&&s._y!==0);ISL.templeBox=[T.x,T.z,13];
    // climbable: a ramp on the +x side up to the tiers (tier by tier) as a special surface
    const tierTop=[];let yy=0;for(const [w,h] of tiers){yy+=h;tierTop.push([w,yy])}
    holdSpecial((x,z,pY)=>{const u=x-T.x,v=z-T.z;if(Math.abs(u)>17||Math.abs(v)>17)return null;
      // steps first: tier i's staircase climbs the +x face from the roof of the tier below
      let base=0;for(let i=0;i<tiers.length;i++){const w=tiers[i][0]/2,h=tiers[i][1];if(u>=w&&u<=w+h*.9&&Math.abs(v)<1.6)return {h:SL+T.h+base+h*(1-(u-w)/(h*.9)),pri:1,surf:'stone'};base+=h}
      for(let i=tiers.length-1;i>=0;i--){const w=tiers[i][0]/2;if(Math.abs(u)<w&&Math.abs(v)<w)return {h:SL+T.h+tierTop[i][1],pri:1,surf:'stone'}}
      return null})},
  buildPond(){const p=ISL.pond,m=new THREE.Mesh(new THREE.CircleGeometry(31,28),this.M.water);m.rotation.x=-Math.PI/2;m.position.set(p.x,SL+p.h-.3,p.z);m.renderOrder=3;this.root.add(m);this.pondMesh=m},
  // ---------- per frame ----------
  update(dt){
    const dx=player.x-ISL.cx,dz=player.z-ISL.cz,d=Math.hypot(dx,dz),active=d<7200||(typeof MP!=='undefined'&&MP.on&&Math.hypot(camera.position.x-ISL.cx,camera.position.z-ISL.cz)<7200);
    if(!active){if(this.root.visible){this.root.visible=false;this.on=false}return}
    if(!this.root.visible){this.root.visible=true}this.on=d<3900;
    this.updateTiles(this.firstBuild?2:40);this.firstBuild=true;
    const vx=Math.round(camera.position.x),vz=Math.round(camera.position.z);
    if(d<3700&&(Math.hypot(vx-this.last[0],vz-this.last[1])>35||!this._v)){this._v=1;this.rebuildVeg(vx,vz)}
    else if(d>=3700&&this.iFar.count){for(const im of [this.iTree,this.iPalm,this.iBush,this.iRock,this.iBamboo,this.iFar])im.count=0;this.last=[1e9,1e9];this._v=0}
    // campfire flicker
    if(this.fireL){const near=Math.hypot(player.x-ISL.beach[0],player.z-ISL.beach[1])<90;this.fireL.intensity=near?(1.4+Math.sin(performance.now()*.02)*.35+Math.random()*.3):0;this.camp.visible=true}
    // the pond is flat water only visible near
    if(typeof FAUNA!=='undefined')FAUNA.update(dt,d)}
};
