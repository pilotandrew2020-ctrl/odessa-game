// kstyle.js — three more kinds of residential block with enterable podyezds, each leading to its own flat interior (flats.js):
//   panel  — nine-storey grey panel block with loggias (Cheryomushky, Tairove, Peresyp, Kotovsky, Velykyi Fontan)
//   stalin — five-storey ochre Stalin-era house with tall windows, pilasters and arched portals (the centre)
//   new    — twelve-storey white-and-glass new build with balconies (Arcadia, Fontan)
// Same recipe as khru.js (lot search, pad, facade planes, entrances, fences). Loaded before the main script; touches game globals only when installKstyle() runs.

const KS_ST={
  panel:{key:'panel',name:'Panel block',floors:9,fh:2.8,sec:12,dp:11,n:4,plate:[1.62,3.15],body:'#b6b3aa',plinth:'#77746d',cornice:'#cbc8bf',roofC:'#4e4b46',door:'#44566a',canopy:'#a7adb2',pin:'#8f98a3',pinText:'9',
    spots:[['Cheryomushky',46.4455,30.7260,2],['Cheryomushky',46.4380,30.7100,1],['Tairove',46.3990,30.7250,2],['Tairove',46.3900,30.7120,1],['Peresyp',46.5190,30.7210,2],['Kotovsky',46.5830,30.7860,2],['Velykyi Fontan',46.3830,30.7600,1],['Luzanivka',46.5520,30.7500,1]]},
  stalin:{key:'stalin',name:'Stalin-era house',floors:5,fh:3.5,sec:16,dp:13,n:3,plate:[.45,3.4],body:'#d6bf8c',plinth:'#8a6b4a',cornice:'#f1e8d2',roofC:'#6e4a3a',door:'#3a2a1c',canopy:'#c9a24a',pin:'#d6bf8c',pinText:'S',
    spots:[['Centre',46.4790,30.7360,1],['Centre',46.4725,30.7440,1],['Centre',46.4850,30.7335,1],['Moldavanka',46.4640,30.7300,1],['Slobidka',46.4680,30.7185,1],['Peresyp',46.5050,30.7240,1]]},
  new:{key:'new',name:'New build',floors:12,fh:3.0,sec:15,dp:14,n:3,plate:[2.3,3.55],body:'#e6e9ec',plinth:'#4a5258',cornice:'#cfd6da',roofC:'#7a8288',door:'#2a3036',canopy:'#cfd6da',pin:'#7aa6c2',pinText:'N',
    spots:[['Arcadia',46.4285,30.7625,2],['Arcadia',46.4250,30.7580,1],['Fontan',46.3990,30.7810,1],['Fontan',46.3950,30.7770,1],['Velykyi Fontan',46.3790,30.7720,1],['Peresyp seaside',46.5090,30.7930,1]]}};

const KS_PL=.85,KS_RES={};
// one entrance section of facade, sec metres wide, as a 512×1024 (new build: 512×2048) canvas (+ a black-and-warm glow map for the lit windows at night)
function ksRes(st){if(KS_RES[st.key])return KS_RES[st.key];
  const R=rng(st.floors*53+st.sec),mk=(w,h)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv},tx=cv=>{const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t};
  const W2=512,H2=st.key==='new'?2048:1024,hp=st.floors*st.fh-KS_PL,PX=W2/st.sec,PY=H2/hp,fc=mk(W2,H2),f=fc.getContext('2d'),ec=mk(W2/2,H2/2),e=ec.getContext('2d');
  const X=m=>m*PX,Y=m=>H2-m*PY;e.fillStyle='#000';e.fillRect(0,0,512,1024);e.scale(.5,.5);
  f.fillStyle=st.body;f.fillRect(0,0,W2,H2);
  for(let i=0;i<2600;i++){f.fillStyle=R()<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.04)';f.fillRect(R()*W2,R()*H2,1+R()*4,1+R()*4)}
  const win=(cx,bot,w,h,state,lit,o)=>{o=o||{};const x0=X(cx-w/2),pw=w*PX,top=Y(bot+h),ph=h*PY,fr=o.frame||'#f4f1e8';
    if(o.sill!==false){f.fillStyle=o.sillC||'#e9e5d8';f.fillRect(X(cx-w/2-.08),Y(bot),pw+.16*PX,.1*PY);f.fillStyle='rgba(0,0,0,.25)';f.fillRect(X(cx-w/2-.08),Y(bot)+.1*PY,pw+.16*PX,2)}
    if(o.surround){f.fillStyle=o.surround;f.fillRect(x0-.18*PX,top-.2*PY,pw+.36*PX,ph+.2*PY)}
    f.fillStyle=fr;f.fillRect(x0-.05*PX,top-.05*PY,pw+.1*PX,ph+.1*PY);
    const gx=x0+.045*PX,gy=top+.045*PY,gw=pw-.09*PX,gh=ph-.09*PY,g=f.createLinearGradient(0,gy,0,gy+gh);
    if(state===1){g.addColorStop(0,'#ffe9b0');g.addColorStop(1,'#e2a850')}else{g.addColorStop(0,o.g0||'#a4c1cf');g.addColorStop(1,o.g1||'#2b4251')}
    f.fillStyle=g;f.fillRect(gx,gy,gw,gh);
    if(state===2){f.fillStyle=['#d9c9a0','#c9a3a0','#b9c9b0'][Math.floor(R()*3)];f.fillRect(gx,gy,gw*.4,gh);f.fillRect(gx+gw*.6,gy,gw*.4,gh)}
    f.fillStyle='rgba(255,255,255,.14)';f.beginPath();f.moveTo(gx,gy+gh);f.lineTo(gx+gw*.55,gy);f.lineTo(gx+gw*.8,gy);f.lineTo(gx+gw*.25,gy+gh);f.fill();
    f.fillStyle=fr;if(w>1.0)f.fillRect(gx+gw/2-.03*PX,gy,.06*PX,gh);f.fillRect(gx,gy+gh*.28,gw,.05*PY);
    if(lit){e.fillStyle=state===2?'#8a6a34':'#ffc66a';e.fillRect(gx,gy+gh*.3,gw,gh*.7)}};
  const lp=st.key==='new'?.12:.26,st3=()=>R()<lp?1:(R()<.42?2:0),lit=s=>s>0&&R()<.8;
  if(st.key==='panel'){
    // grey concrete panels: a joint at every floor slab and every 3 m, loggias with railings, paired windows, a narrow stair window
    f.strokeStyle='rgba(40,38,34,.45)';f.lineWidth=2;for(let fl=0;fl<=st.floors;fl++){const y=Y(fl*st.fh-KS_PL+.02);f.beginPath();f.moveTo(0,y);f.lineTo(W2,y);f.stroke()}
    for(let u=0;u<st.sec;u+=3){f.beginPath();f.moveTo(X(u),0);f.lineTo(X(u),H2);f.stroke()}
    for(let fl=0;fl<st.floors;fl++){const b=fl*st.fh+.95-KS_PL;
      for(const u of fl?[1.5,4.2,7.8,10.5]:[1.5,10.5]){const s=st3();win(u,b,1.4,1.5,s,lit(s))}
      if(fl)for(const u of [4.2,7.8]){f.fillStyle='#3a4046';f.fillRect(X(u-1.4),Y(b-.15),2.8*PX,.14*PY);f.fillStyle='#6a737c';f.fillRect(X(u-1.4),Y(b-.15)+.14*PY,2.8*PX,.05*PY)}       // balcony slabs
      if(fl){const s=R()<.4?1:0;win(6,b+.1,.7,1.2,s,s>0)}}
  }else if(st.key==='stalin'){
    // ochre plaster: rusticated ground floor, pilasters between the bays, tall windows with lintels and pediments, cornice lines between floors
    for(let y=0;y<st.fh-KS_PL;y+=.5){f.fillStyle='rgba(60,40,20,.22)';f.fillRect(0,Y(y),W2,1)}
    for(const u of [.55,3.8,7.4,8.6,12.2,15.45]){f.fillStyle='#e9d9ad';f.fillRect(X(u-.28),0,.56*PX,H2);f.fillStyle='rgba(60,40,20,.25)';f.fillRect(X(u+.28),0,2,H2)}
    for(let fl=0;fl<st.floors;fl++){const b=fl*st.fh+.9-KS_PL,tall=fl?2.35:1.8;f.fillStyle='#f1e8d2';f.fillRect(0,Y(fl*st.fh-KS_PL+.05),W2,.28*PY);
      for(const u of fl?[2.2,5.6,10.4,13.8]:[2.2,5.6,10.4,13.8]){const s=st3();win(u,b,1.35,tall,s,lit(s),{frame:'#f6f1e2',surround:fl===1?'#f1e8d2':null,sillC:'#f1e8d2'})}
      if(fl){const s=R()<.4?1:0;win(8,b+.2,.8,1.6,s,s>0,{frame:'#f6f1e2'})}}
  }else{
    // white render, floor-to-ceiling glazing in bays, glass balustrades and slab edges, coloured spandrel panels between the bays
    const pal=['#c2704a','#6a8aa0','#d4b46a'];
    for(let fl=0;fl<st.floors;fl++){const b=fl*st.fh+.2-KS_PL,bay=st.sec/5;
      f.fillStyle='#cdd3d7';f.fillRect(0,Y(fl*st.fh-KS_PL+.02),W2,.18*PY);
      for(let k=0;k<5;k++){const cx=bay*(k+.5);if(!fl&&k===2)continue;const s=st3();
        f.fillStyle=pal[(k+fl)%3];if(k%2===0)f.fillRect(X(cx-bay/2),Y(b+st.fh-.2),.34*PX,(st.fh-.2)*PY);
        win(cx,b+.05,bay-.55,st.fh-.45,s,lit(s),{frame:'#2a3036',sill:false,g0:'#7fa6bd',g1:'#1f3445'});
        if(fl){f.fillStyle='rgba(190,225,240,.55)';f.fillRect(X(cx-bay/2+.1),Y(b+1.0),(bay-.2)*PX,1.0*PY);f.fillStyle='#e8eef1';f.fillRect(X(cx-bay/2+.1),Y(b+1.0),(bay-.2)*PX,.05*PY)}}}
  }
  const M=o=>new THREE.MeshStandardMaterial(o),lin=h=>new THREE.Color(h).convertSRGBToLinear();
  const faceM=M({map:tx(fc),roughness:st.key==='new'?.5:.9,emissive:new THREE.Color(1,1,1),emissiveMap:tx(ec),emissiveIntensity:0});faceM.userData.ei=.7;LIGHT_SIGNS.push(faceM);
  return KS_RES[st.key]={faceM,bodyM:M({color:lin(st.body),roughness:.95}),roofM:M({color:lin(st.roofC),roughness:.9})}}

function ksBuild(grp,P,GR,at,st,tag){
  const n=st.n,F=lotFrame(at.x,at.z,at.yaw),y0=rawH(at.x,at.z),ry=F.yaw,Dp=st.dp,Hb=st.floors*st.fh,W=n*st.sec,fv=Dp/2,c=F.P(0,0),res=ksRes(st);
  lotPad(F,W+8,Dp+14,y0);
  groundQuad(GR,[F.P(-W/2-3,fv),F.P(W/2+3,fv),F.P(W/2+3,fv+4),F.P(-W/2-3,fv+4)],8,y0+.05,F.yaw);
  {const g=new THREE.BoxGeometry(W,Hb,Dp),body=new THREE.Mesh(g,[res.bodyM,res.bodyM,res.roofM,res.roofM,res.bodyM,res.bodyM]);body.position.set(c[0],y0+Hb/2,c[1]);body.rotation.y=ry;body.castShadow=body.receiveShadow=true;grp.add(body);
   const hp=Hb-KS_PL;for(const side of [1,-1]){const pg=new THREE.PlaneGeometry(W,hp),pu=pg.attributes.uv;for(let i=0;i<pu.count;i++)pu.setX(i,pu.getX(i)*n);
     const pm=new THREE.Mesh(pg,res.faceM);const o=F.P(0,side*(Dp/2+.03));pm.position.set(o[0],y0+KS_PL+hp/2,o[1]);pm.rotation.y=ry+(side>0?0:Math.PI);pm.receiveShadow=true;grp.add(pm)}}
  addBlock(c[0],c[1],W+2,Dp+2,F.a);addOBB(c[0],c[1],W,Dp,F.a);
  P.box(c[0],y0+KS_PL/2,c[1],W+.16,KS_PL,Dp+.16,ry,sRGB(st.plinth),9);P.box(c[0],y0+KS_PL+.03,c[1],W+.3,.08,Dp+.3,ry,sRGB('#a39c8e'),9);
  P.box(c[0],y0+Hb-.12,c[1],W+.5,st.key==='stalin'?.55:.34,Dp+.5,ry,sRGB(st.cornice),9);
  P.box(c[0],y0+Hb+.3,c[1],W+.9,.28,Dp+.9,ry,sRGB('#5d5953'),1);
  if(st.key==='new')for(const du of [-W*.3,W*.12]){const q=F.P(du,.5);P.box(q[0],y0+Hb+1.2,q[1],3.2,1.6,2.4,ry,sRGB('#aeb6bc'),9)}          // roof plant rooms
  else{P.box(c[0],y0+Hb+.7,c[1],W-.6,.55,Dp-1,ry,sRGB(st.roofC),1);for(const du of [-W*.3,W*.12]){const q=F.P(du,.5);P.box(q[0],y0+Hb+1.3,q[1],.9,.7,.9,ry,sRGB('#b8b0a0'),9)}}
  for(let s=0;s<n;s++){const pp=F.P((s-(n-1)/2)*st.sec+st.sec/2-.4,fv+.12);P.cyl(pp[0],y0,pp[1],.06,.06,Hb-.4,6,sRGB('#8f8a80'),6)}                      // drainpipes between the sections
  // entrances: panel = grey concrete canopy and a blue steel door; stalin = arched portal with a dark wood door and brass lamps; new = glass lobby doors under a steel canopy
  for(let s=0;s<n;s++){const u=(s-(n-1)/2)*st.sec,dr=lotDoor(F,u,fv),q=(du,dv)=>F.P(u+du,fv+dv),bx=(du,dv,y,w,h,d,col,m)=>{const p=q(du,dv);P.box(p[0],y0+y,p[1],w,h,d,ry,sRGB(col),m===undefined?9:m)};
    const dh=st.key==='stalin'?3.0:2.3;
    if(st.key==='stalin'){bx(-1.25,.2,1.7,.55,3.4,.4,st.cornice);bx(1.25,.2,1.7,.55,3.4,.4,st.cornice);bx(0,.2,3.4,3.35,.6,.4,st.cornice);bx(0,.21,3.78,3.0,.2,.46,st.canopy,1);   // pilasters + entablature
      bx(0,.1,1.5,1.9,dh,.1,st.door,5);bx(0,.16,1.5,.05,dh,.05,'#1a1008',5);for(const dx of [-.46,.46]){bx(dx,.17,2.2,.66,1.2,.04,'#14181c',2);bx(dx,.17,.95,.7,.7,.04,'#4a2e1c',5)}
      for(const dx of [-1.55,1.55]){bx(dx,.3,2.5,.14,.28,.14,'#d9a21b',3);bx(dx,.3,2.3,.04,.4,.04,'#5a4a2a',6)}}
    else if(st.key==='panel'){bx(0,.1,1.2,1.8,dh,.1,st.door,5);bx(0,.16,1.45,.05,2.0,.05,'#10161c',5);bx(0,.17,1.95,1.5,.9,.04,'#14181c',2);
      bx(0,.7,2.85,3.6,.2,1.8,st.canopy,1);bx(-1.7,.7,1.4,.16,2.8,.16,'#8a9096',1);bx(1.7,.7,1.4,.16,2.8,.16,'#8a9096',1)}
    else{bx(0,.1,1.2,2.4,2.5,.1,st.door,5);bx(-.6,.17,1.25,1.1,2.3,.04,'#9cc2d6',2);bx(.6,.17,1.25,1.1,2.3,.04,'#9cc2d6',2);bx(0,.17,1.25,.05,2.3,.05,'#111',6);
      bx(0,.9,3.3,4.2,.16,2.0,st.canopy,1);bx(-2.0,.9,1.65,.1,3.3,.1,'#8a9096',1);bx(2.0,.9,1.65,.1,3.3,.1,'#8a9096',1);bx(2.2,.3,1.3,.5,.6,.14,'#2f3a40',2)}
    bx(0,.62,.17,2.6,.34,.5,'#a6a39b');bx(0,1.12,.085,2.6,.17,.5,'#a6a39b');
    const pm=plateMesh([(st.key==='new'?'ПАРАДНА ':'ПІД\'ЇЗД ')+(s+1)],{w:512,h:96,size:58,color:st.key==='new'?'#e8f0f4':'#3a2a10',bg:st.key==='new'?'#2f3a40':(st.key==='panel'?'#9aa4ad':'#e0b030'),weight:'800'},1.9,.34,.2),pp2=q(0,st.plate[0]);
    pm.position.set(pp2[0],y0+st.plate[1],pp2[1]);pm.rotation.y=ry;grp.add(pm);
    INTERACT.push({x:dr.x+dr.nx*1.9,z:dr.z+dr.nz*1.9,y:y0,r:2.1,label:'Enter entrance '+(s+1),cond:()=>!PORTAL.cur&&!RIDE.on,
      fn:()=>PORTAL.enter('stair',{x:dr.x+dr.nx*2.9,z:dr.z+dr.nz*2.9,yaw:Math.atan2(dr.nx,dr.nz)},{ent:s+1,floors:st.floors,style:st.key})})}
  // a few benches and low trees along the pavement, green fence only for the stalin house
  if(st.key!=='stalin')for(let s=0;s<n;s++){const t=F.P((s-(n-1)/2)*st.sec+st.sec*.5-.3,fv+6.4);P.cyl(t[0],y0,t[1],.15,.12,2.4,6,sRGB('#5b4028'),5);P.cyl(t[0],y0+1.7,t[1],1.4,.4,2.2,8,sRGB('#4a8a3c'),9);STATIC_CIR.push(t[0],t[1],.5)}
  const mid=Math.floor(n/2),um=(mid-(n-1)/2)*st.sec,pp=F.P(um,fv+3);return {x:pp[0],z:pp[1],yaw:ry+Math.PI}}

const KS_PLACED=[];
function installKstyle(grp,G,P,Sg,GR){
  const placed=(window.KHRU_XZ||[]).slice(),t0=performance.now();let tries=0;const clear=(x,z)=>placed.every(q=>Math.hypot(q.x-x,q.z-z)>80);
  for(const key of ['panel','stalin','new']){const st=KS_ST[key],seen={},W=st.n*st.sec;let made=0;
    for(const [dist,lat,lon,count] of st.spots){const [bx,bz]=geo2xz(lat,lon);
      for(let k=0;k<count;k++){let lot=null;
        for(let a=0;a<3&&!lot;a++){const ang=k*2.3+a*1.3,tx=bx+Math.cos(ang)*(k?140:0),tz=bz+Math.sin(ang)*(k?140:0);tries++;lot=shFindLot(tx,tz,W,st.dp+3,260);if(lot&&!clear(lot.x,lot.z))lot=null}
        if(!lot)continue;
        const sp=ksBuild(grp,P,GR,lot,st,dist);placed.push({x:lot.x,z:lot.z});KS_PLACED.push({key,x:lot.x,z:lot.z});made++;
        const first=!seen[dist];seen[dist]=1;
        PLACES.push({id:'ks_'+key+made,name:st.name+' · '+dist,sub:st.floors+' floors · '+st.n+' entrances · go inside',x:sp.x,z:sp.z,yaw:sp.yaw,pin:st.pin,pinText:st.pinText,poi:[st.pinText,st.pin],r:40,hide:!first})}}}
  PARKED_DIRTY=true;
  if(window.console)console.log('kstyle: '+KS_PLACED.length+' blocks ('+KS_PLACED.map(b=>b.key).join(',')+'), '+tries+' searches, '+Math.round(performance.now()-t0)+' ms')}
