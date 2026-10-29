// khru.js — five-storey Khrushchyovka blocks spread over the residential districts.
// Cream silicate brick, white-framed windows, a red-brown plinth, brown entrance doors in white surrounds under a yellow canopy,
// small concrete steps, green picket fences and a few young trees. Every entrance opens the stairwell (floors 1-5, flats upstairs).
// Loaded before the main script; touches game globals only when installKhru() runs.

// [district, lat, lon, how many blocks around this spot]
const KH_SPOTS=[
  ['Tairove',46.4035,30.7075,3],['Tairove',46.3940,30.7180,3],['Tairove',46.4105,30.7310,3],['Tairove',46.3860,30.7330,2],
  ['Cheryomushky',46.4420,30.7190,2],['Cheryomushky',46.4520,30.7050,2],
  ['Moldavanka',46.4660,30.7050,2],['Peresyp',46.5120,30.7160,2],['Peresyp',46.5280,30.7240,2],
  ['Luzanivka',46.5560,30.7560,2],['Kotovsky',46.5800,30.7800,2],['Velykyi Fontan',46.3870,30.7620,2],['French Boulevard',46.4540,30.7620,1]];
const KH_COL='#e8a33d';
const KH_SEC=14,KH_PL=.85;            // one entrance section is 14 m wide; the red-brown plinth is 0.85 m high

let KH_RES=null;
function khBrick(x,w,h,bh,nb,R){x.fillStyle='#d3caaa';x.fillRect(0,0,w,h);const bw=w/nb;
  for(let r=0;r*bh<h;r++){const off=(r%2)*bw/2;for(let k=-1;k<=nb;k++){const t=R();x.fillStyle='hsl('+(41+t*7)+','+(36+t*16)+'%,'+(77+R()*9)+'%)';x.fillRect(Math.round(k*bw+off)+1,r*bh+1,Math.round(bw)-1,bh-1)}}}
// two sections of facade: brick, windows (some lit, some curtained), sills; plus a black-and-warm map for the night glow; plus the green picket fence
function khRes(){if(KH_RES)return KH_RES;const R=rng(77),mk=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv},tx=cv=>{const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t};
  const bc=mk(256,256);khBrick(bc.getContext('2d'),256,256,8,13,R);
  const W2=2048,H2=1024,HP=14.4-KH_PL,PX=W2/(KH_SEC*2),PY=H2/HP,fc=mk(W2,H2),f=fc.getContext('2d'),ec=mk(1024,512),e=ec.getContext('2d');
  khBrick(f,W2,H2,8,107,R);e.fillStyle='#000';e.fillRect(0,0,1024,512);e.scale(.5,.5);
  const X=m=>m*PX,Y=m=>H2-m*PY;                                                           // metres from the plane's left / bottom edge → pixels
  const win=(cx,bot,w,h,state,lit)=>{const x0=X(cx-w/2),pw=w*PX,top=Y(bot+h),ph=h*PY;
    f.fillStyle='#f2efe5';f.fillRect(X(cx-w/2-.1),Y(bot),pw+.2*PX,.1*PY);f.fillStyle='#9b937f';f.fillRect(X(cx-w/2-.1),Y(bot)+.1*PY,pw+.2*PX,2);        // concrete sill + its shadow
    f.fillStyle='#f6f3ea';f.fillRect(x0-.05*PX,top-.05*PY,pw+.1*PX,ph+.1*PY);                                                                              // white frame
    const gx=x0+.04*PX,gy=top+.04*PY,gw=pw-.08*PX,gh=ph-.08*PY,g=f.createLinearGradient(0,gy,0,gy+gh);
    if(state===1){g.addColorStop(0,'#ffe9b0');g.addColorStop(1,'#e2a850')}else{g.addColorStop(0,'#a4c1cf');g.addColorStop(1,'#2b4251')}
    f.fillStyle=g;f.fillRect(gx,gy,gw,gh);
    if(state===2){f.fillStyle=['#d9c9a0','#c9a3a0','#b9c9b0'][Math.floor(R()*3)];f.fillRect(gx,gy,gw*.38,gh);f.fillRect(gx+gw*.62,gy,gw*.38,gh);f.fillStyle='rgba(120,90,60,.25)';for(let k=0;k<5;k++)f.fillRect(gx+gw*.38*k/5,gy,2,gh)}
    f.fillStyle='rgba(255,255,255,.14)';f.beginPath();f.moveTo(gx,gy+gh);f.lineTo(gx+gw*.55,gy);f.lineTo(gx+gw*.8,gy);f.lineTo(gx+gw*.25,gy+gh);f.fill();                  // reflection
    f.fillStyle='#f6f3ea';if(w>.9)f.fillRect(gx+gw/2-.03*PX,gy,.06*PX,gh);f.fillRect(gx,gy+gh*.27,gw,.05*PY);                                              // mullion + transom
    if(lit){e.fillStyle=state===2?'#8a6a34':'#ffc66a';e.fillRect(gx,gy+gh*.3,gw,gh*.7)}};
  const rooms=[1.9,12.1],kitch=[4.9,9.1];
  for(let s=0;s<2;s++)for(let fl=0;fl<5;fl++){const b=fl*2.88+1.1-KH_PL,o=s*KH_SEC;
    for(const cx of rooms){const st=R()<.22?1:(R()<.4?2:0);win(o+cx,b,1.7,1.5,st,st>0&&R()<.8)}
    for(const cx of kitch){const st=R()<.24?1:(R()<.4?2:0);win(o+cx,b+.1,1.05,1.25,st,st>0&&R()<.8)}
    if(fl>0){const st=R()<.4?1:0;win(o+7,fl*2.88+.1-KH_PL,.8,1.3,st,st>0)}}
  const fe=mk(256,256),q=fe.getContext('2d');q.fillStyle='#2f7a3b';q.fillRect(0,34,256,16);q.fillRect(0,206,256,14);                                          // rails
  for(let k=0;k<8;k++){const x=k*32+10;q.fillRect(x,40,12,200);q.beginPath();q.moveTo(x,40);q.lineTo(x+6,12);q.lineTo(x+12,40);q.fill()}                         // pickets with spear tips
  KH_RES={brick:tx(bc),face:tx(fc),glow:tx(ec),fence:tx(fe)};
  const M=o=>new THREE.MeshStandardMaterial(o);
  KH_RES.brickM=M({map:KH_RES.brick,roughness:.95});KH_RES.faceM=M({map:KH_RES.face,roughness:.9,emissive:new THREE.Color(1,1,1),emissiveMap:KH_RES.glow,emissiveIntensity:0});KH_RES.faceM.userData.ei=.7;LIGHT_SIGNS.push(KH_RES.faceM);
  KH_RES.fenceM=M({map:KH_RES.fence,roughness:.7,alphaTest:.5,side:THREE.DoubleSide});KH_RES.roofM=M({color:0x6b6762,roughness:.9});
  return KH_RES}

// a green picket fence along the segments given as [ax,az,bx,bz] pairs (world metres), all merged into one mesh
function khFence(grp,y0,segs,h){const pos=[],uv=[],idx=[];let n=0;
  for(const [ax,az,bx,bz] of segs){const L=Math.hypot(bx-ax,bz-az);if(L<.3)continue;pos.push(ax,y0,az,bx,y0,bz,bx,y0+h,bz,ax,y0+h,az);uv.push(0,0,L/1.2,0,L/1.2,1,0,1);idx.push(n,n+1,n+2,n,n+2,n+3);n+=4}
  if(!n)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.Mesh(g,khRes().fenceM);m.castShadow=true;grp.add(m)}

function khBuild(grp,P,GR,at,W,n,tag){
  const F=lotFrame(at.x,at.z,at.yaw),y0=rawH(at.x,at.z),ry=F.yaw,Dp=12,Hb=14.4,fv=Dp/2,c=F.P(0,0),res=khRes(),R=rng(Math.floor(Math.abs(at.x*7+at.z*13)));
  lotPad(F,W+8,Dp+14,y0);
  groundQuad(GR,[F.P(-W/2-3,fv),F.P(W/2+3,fv),F.P(W/2+3,fv+4),F.P(-W/2-3,fv+4)],8,y0+.05,F.yaw);       // pavement in front of the doors
  // brick body (blind end walls) with a facade plane on the front and the back, a cornice and a low roof
  {const g=new THREE.BoxGeometry(W,Hb,Dp),uv=g.attributes.uv,nm=g.attributes.normal;
   for(let i=0;i<uv.count;i++){const sx=Math.abs(nm.getX(i))>.5?Dp:W;uv.setXY(i,uv.getX(i)*sx/3.41,uv.getY(i)*Hb/3.41)}
   const body=new THREE.Mesh(g,[res.brickM,res.brickM,res.roofM,res.roofM,res.brickM,res.brickM]);body.position.set(c[0],y0+Hb/2,c[1]);body.rotation.y=ry;body.castShadow=body.receiveShadow=true;grp.add(body);
   const hp=Hb-KH_PL;
   for(const side of [1,-1]){const pg=new THREE.PlaneGeometry(W,hp),pu=pg.attributes.uv;for(let i=0;i<pu.count;i++)pu.setX(i,pu.getX(i)*n/2);
     const pm=new THREE.Mesh(pg,res.faceM);const o=F.P(0,side*(Dp/2+.03));pm.position.set(o[0],y0+KH_PL+hp/2,o[1]);pm.rotation.y=ry+(side>0?0:Math.PI);pm.receiveShadow=true;grp.add(pm)}}
  addBlock(c[0],c[1],W+2,Dp+2,F.a);addOBB(c[0],c[1],W,Dp,F.a);
  P.box(c[0],y0+KH_PL/2,c[1],W+.16,KH_PL,Dp+.16,ry,sRGB('#7a4636'),9);P.box(c[0],y0+KH_PL+.03,c[1],W+.3,.08,Dp+.3,ry,sRGB('#a39c8e'),9);                  // red-brown plinth with a concrete cap
  P.box(c[0],y0+Hb-.12,c[1],W+.5,.34,Dp+.5,ry,sRGB('#ece6d6'),9);                                                                                       // white cornice
  P.box(c[0],y0+Hb+.3,c[1],W+.9,.28,Dp+.9,ry,sRGB('#5d5953'),1);P.box(c[0],y0+Hb+.7,c[1],W-.6,.55,Dp-1,ry,sRGB('#6b6762'),1);                         // roof edge + low pitched roof
  for(const du of [-W*.3,W*.12]){const q=F.P(du,.5);P.box(q[0],y0+Hb+1.3,q[1],.9,.7,.9,ry,sRGB('#b8b0a0'),9)}                                          // ventilation stacks
  // basement vents under the room windows and a drainpipe between the sections
  for(let s=0;s<n;s++){const u0=(s-(n-1)/2)*KH_SEC-7;
    for(const du of [1.9,12.1]){const q=F.P(u0+du,fv+.09);P.box(q[0],y0+.42,q[1],.8,.3,.06,ry,sRGB('#3a3834'),6)}
    const pp=F.P(u0+KH_SEC-.5,fv+.12);P.cyl(pp[0],y0,pp[1],.06,.06,Hb-.4,6,sRGB('#8f8a80'),6)}
  // entrances
  for(let s=0;s<n;s++){const u=(s-(n-1)/2)*KH_SEC,dr=lotDoor(F,u,fv),q=(du,dv)=>F.P(u+du,fv+dv),bx=(du,dv,y,w,h,d,col,m)=>{const p=q(du,dv);P.box(p[0],y0+y,p[1],w,h,d,ry,sRGB(col),m===undefined?9:m)};
    bx(-1.15,.18,1.5,.5,3.0,.36,'#f0ece0');bx(1.15,.18,1.5,.5,3.0,.36,'#f0ece0');bx(0,.18,2.75,2.8,.5,.36,'#f0ece0');                                       // white-brick surround
    bx(0,.1,1.45,1.8,2.2,.1,'#5a3822',5);bx(0,.16,1.45,.05,2.2,.05,'#2a1a10',5);                                                                    // brown double door, split line
    for(const dx of [-.45,.45]){bx(dx,.17,1.85,.62,1.0,.04,'#14181c',2);bx(dx,.17,.95,.62,.7,.04,'#4a2e1c',5)}
    bx(-.1,.2,1.3,.05,.25,.05,'#c4c8cc',6);bx(.1,.2,1.3,.05,.25,.05,'#c4c8cc',6);                                                                    // handles
    bx(0,.62,.17,2.6,.34,.5,'#a6a39b');bx(0,1.12,.085,2.6,.17,.5,'#a6a39b');bx(-1.38,.8,.25,.1,.5,1.0,'#a6a39b');bx(1.38,.8,.25,.1,.5,1.0,'#a6a39b');       // two steps with cheek walls
    bx(0,.9,2.74,3.4,.38,1.8,'#d9a21b',1);bx(-1.55,1.72,1.36,.16,2.72,.16,'#d9a21b',1);bx(1.55,1.72,1.36,.16,2.72,.16,'#d9a21b',1);                  // yellow canopy on two posts
    for(const du of [-1.55,1.55])bx(du,1.72,.14,.2,.12,.2,'#a6a39b');
    const pm=plateMesh(['ПІД\'ЇЗД '+(s+1)],{w:512,h:96,size:60,color:'#3a2a10',bg:'#e0b030',weight:'800'},1.9,.34,.2),pp2=q(0,1.82);pm.position.set(pp2[0]+F.n[0]*.0,y0+2.74,pp2[1]);pm.rotation.y=ry;grp.add(pm);
    const nb=q(-3.4,.08);P.box(nb[0],y0+1.75,nb[1],1.0,.72,.05,ry,sRGB('#6a4a2a'),5);                                                                  // notice board with a few papers
    for(let k=0;k<4;k++){const pq=q(-3.4+(k-1.5)*.22,.12);P.box(pq[0],y0+1.75+(k%2?.1:-.1),pq[1],.18,.26,.02,ry,sRGB(['#f4f1e6','#f2e3a0','#f4f1e6','#cfe0f0'][k]),9)}
    INTERACT.push({x:dr.x+dr.nx*1.9,z:dr.z+dr.nz*1.9,y:y0,r:2.1,label:'Enter entrance '+(s+1),cond:()=>!PORTAL.cur&&!RIDE.on,act:'door',actO:()=>({tx:dr.x+dr.nx*.2,tz:dr.z+dr.nz*.2,stand:[dr.x+dr.nx*.82,dr.z+dr.nz*.82]}),
      fn:()=>PORTAL.enter('stair',{x:dr.x+dr.nx*2.9,z:dr.z+dr.nz*2.9,yaw:Math.atan2(dr.nx,dr.nz)},{ent:s+1,floors:5})});
    if(s<n-1){const t=q(KH_SEC/2,2.8);                                                                                                                  // a young tree between the entrances
      P.cyl(t[0],y0,t[1],.17,.13,2.8,6,sRGB('#5b4028'),5);P.cyl(t[0],y0+1.9,t[1],1.5,.5,2.4,8,sRGB('#4a8a3c'),9);P.cyl(t[0],y0+3.7,t[1],1.05,.1,1.9,8,sRGB('#3f7a35'),9);STATIC_CIR.push(t[0],t[1],.5)}}
  // green picket fence along the pavement with a gap at every entrance, and short returns at both ends
  {const segs=[],fvv=fv+4.4,half=W/2+2,gap=1.7;let a=-half;const A=(u,v)=>F.P(u,v);
   for(let s=0;s<n;s++){const u=(s-(n-1)/2)*KH_SEC,p=A(a,fvv),r=A(u-gap,fvv);segs.push([p[0],p[1],r[0],r[1]]);a=u+gap}
   {const p=A(a,fvv),r=A(half,fvv);segs.push([p[0],p[1],r[0],r[1]])}
   for(const sx of [-half,half]){const p=A(sx,fvv),r=A(sx,fv+.4);segs.push([p[0],p[1],r[0],r[1]])}
   khFence(grp,y0+.05,segs,.95)}
  const mid=Math.floor(n/2),um=(mid-(n-1)/2)*KH_SEC,pp=F.P(um,fv+3);return {x:pp[0],z:pp[1],yaw:ry+Math.PI}}

function installKhru(grp,G,P,Sg,GR){
  const placed=[],seen={};let tries=0;const t0=performance.now();
  const clear=(x,z)=>placed.every(q=>Math.hypot(q.x-x,q.z-z)>70);
  for(const [dist,lat,lon,count] of KH_SPOTS){const [bx,bz]=geo2xz(lat,lon);
    for(let k=0;k<count;k++){let lot=null,W=56,n=4;
      for(let a=0;a<3&&!lot;a++){const ang=k*2.1+a*1.3,tx=bx+Math.cos(ang)*(k?120:0),tz=bz+Math.sin(ang)*(k?120:0);tries++;
        lot=shFindLot(tx,tz,W,14,200);if(!lot&&a===1){W=42;n=3;lot=shFindLot(tx,tz,W,14,200)}
        if(lot&&!clear(lot.x,lot.z))lot=null}
      if(!lot)continue;
      const sp=khBuild(grp,P,GR,lot,W,n,dist);placed.push({x:lot.x,z:lot.z});
      const first=!seen[dist];seen[dist]=1;
      PLACES.push({id:'khru'+placed.length,name:'Khrushchyovka · '+dist,sub:'5 floors · '+n+' entrances · go inside',x:sp.x,z:sp.z,yaw:sp.yaw,pin:KH_COL,pinText:'5',poi:['5',KH_COL],r:40,hide:!first})}}
  PARKED_DIRTY=true;window.KHRU_PLACED=placed.length;window.KHRU_XZ=placed;
  if(window.console)console.log('khru: '+placed.length+' blocks, '+tries+' searches, '+Math.round(performance.now()-t0)+' ms')}
