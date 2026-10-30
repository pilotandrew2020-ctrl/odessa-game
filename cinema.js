/* ===================================================================================================
   cinema.js — "КІНО ТЕАТР VIP" in Gorky Park: a big red-brick and grey-cladding building with a ring portal canopy and
   billboards, an interior you can walk into (foyer with ticket desk and snack bar, a real hall with 176 seats and a big screen),
   popcorn / cola / ice cream you can buy and hold, and a film that really plays on the screen
   (assets/video/film.mp4 — a Big Buck Bunny excerpt, CC-BY 3.0 Blender Foundation; a procedural fallback is drawn if it can't play).
   Loaded BEFORE the main script (after gorky.js); touches game globals only inside installCinema().
   =================================================================================================== */

const CN={ticket:false,built:null,vid:null,tex:null,fallback:false,cv:null,cx:null,hall:null,playing:false};
const CN_SEATS=[];

function cnPoster(title,sub,c1,c2,seed){
  const cv=document.createElement('canvas');cv.width=512;cv.height=768;const c=cv.getContext('2d');const r=mkRand(seed||3);
  const g=c.createLinearGradient(0,0,0,768);g.addColorStop(0,c1);g.addColorStop(1,c2);c.fillStyle=g;c.fillRect(0,0,512,768);
  for(let i=0;i<40;i++){c.fillStyle='rgba(255,255,255,'+(.03+r()*.07)+')';c.beginPath();c.arc(r()*512,r()*500,10+r()*70,0,6.3);c.fill()}
  c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.moveTo(0,768);c.lineTo(0,520);for(let x=0;x<=512;x+=32)c.lineTo(x,470+r()*90);c.lineTo(512,768);c.fill();
  c.fillStyle='#fff';c.textAlign='center';c.font='900 78px "Golos Text",Arial,sans-serif';const w=title.split('\n');w.forEach((t,i)=>c.fillText(t,256,160+i*84));
  c.font='700 34px "Golos Text",Arial,sans-serif';c.fillStyle='#ffe28a';c.fillText(sub,256,700);c.fillStyle='#fff';c.font='700 26px Arial';c.fillText('В КІНО З 29 ЖОВТНЯ',256,740);
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}

// ---------- the film: a real <video> on a VideoTexture, with a drawn fallback ----------
function cnFilm(){
  if(CN.tex)return CN.tex;
  const v=document.createElement('video');v.src='assets/video/film.mp4';v.loop=true;v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.preload='auto';v.crossOrigin='anonymous';
  v.style.cssText='position:fixed;left:-9999px;top:0;width:4px;height:4px;opacity:0;pointer-events:none';document.body.appendChild(v);CN.vid=v;
  const tex=new THREE.VideoTexture(v);tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=false;tex.encoding=THREE.sRGBEncoding;CN.tex=tex;
  const cv=document.createElement('canvas');cv.width=512;cv.height=288;CN.cv=cv;CN.cx=cv.getContext('2d');
  v.addEventListener('error',()=>{CN.fallback=true;if(CN.screenMat){const ft=new THREE.CanvasTexture(cv);ft.encoding=THREE.sRGBEncoding;CN.screenMat.map=ft;CN.screenMat.needsUpdate=true;CN.fbTex=ft}});
  return tex}
function cnPlay(unmute){const v=CN.vid;if(!v)return;if(unmute)v.muted=false;const p=v.play();if(p&&p.catch)p.catch(()=>{v.muted=true;v.play().catch(()=>{})});CN.playing=true}
function cnPause(){if(CN.vid&&!CN.vid.paused)CN.vid.pause();CN.playing=false}
function cnFallbackDraw(t){const c=CN.cx;if(!c)return;const W=512,H=288;const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'hsl('+((t*12)%360|0)+',60%,22%)');g.addColorStop(1,'hsl('+((t*12+120)%360|0)+',60%,10%)');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){const a=i*2.399+t*.3,r=((i*37)%100)/100,d=((t*.25+r)%1);c.fillStyle='rgba(255,255,255,'+(1-d)*.8+')';c.beginPath();c.arc(W/2+Math.cos(a)*d*W*.7,H/2+Math.sin(a)*d*H*.7,1+d*3,0,6.3);c.fill()}
  c.fillStyle='rgba(255,255,255,.92)';c.textAlign='center';c.font='800 44px Arial';c.fillText('ОДЕСА · КІНО',W/2,H/2+10+Math.sin(t*2)*4);c.font='600 18px Arial';c.fillText('the film could not be loaded — enjoy the show',W/2,H/2+44);if(CN.fbTex)CN.fbTex.needsUpdate=true}

// ---------- the interior ----------
function cnBuild(){
  const grp=new THREE.Group();scene.add(grp);const ox=INT_X+800+56*200,oz=INT_Z,W=30,D=54,FH=5.4,HH=12.4,ZH=14;
  const E=shEnv(grp,ox,oz,FH),L=[];CN_SEATS.length=0;E.floor(-W/2+.1,W/2-.1,.1,D-.1,'carpet');   // without a ground function stepPlayer refuses every step inside an interior
  const light=(x,y,z,col,i,d)=>{const l=new THREE.PointLight(col,0,d||14,1.5);l.position.set(ox+x,INT_Y+y,oz+z);l.userData.i=i;grp.add(l);L.push(l);return l};
  // floors and ceilings
  E.box(0,-.05,ZH/2,W,.1,ZH,'#4a1b26',4);E.box(0,-.05,(ZH+D)/2,W,.1,D-ZH,'#2a1219',4);E.box(0,FH+.05,ZH/2,W,.1,ZH,'#d8cdbb',4);E.box(0,HH+.05,(ZH+D)/2,W,.1,D-ZH,'#0e0e13',0);
  // walls: foyer red with gold trim, hall dark
  E.wall(-W/2,0,-2.4,0,FH,'#6e1a28');E.wall(2.4,0,W/2,0,FH,'#6e1a28');E.box(0,FH-.45,0,4.8,.9,.3,'#6e1a28',0);
  E.wall(-W/2,0,-W/2,ZH,FH,'#7a1d2c');E.wall(W/2,0,W/2,ZH,FH,'#7a1d2c');
  E.wall(-W/2,ZH,-W/2,D,HH,'#1c1620');E.wall(W/2,ZH,W/2,D,HH,'#1c1620');E.wall(-W/2,D,W/2,D,HH,'#0c0b10');
  E.wall(-W/2,ZH,-3,ZH,HH,'#2a2128');E.wall(3,ZH,W/2,ZH,HH,'#2a2128');E.box(0,HH-1.6,ZH,6,3.2,.3,'#2a2128',0);E.box(0,FH+.2,ZH,6,.4,.3,'#c9a24a',6);
  for(const s of [-1,1]){E.box(s*(W/2-.12),.9,ZH/2,.1,.14,ZH-.4,'#c9a24a',6);E.box(s*(W/2-.12),FH-.9,ZH/2,.1,.14,ZH-.4,'#c9a24a',6)}
  E.act(0,.7,1.8,'Go outside',()=>PORTAL.exit());E.box(0,.012,.9,3.4,.024,1.4,'#1a1214',0);
  // foyer: pillars, star ceiling, posters, benches
  for(const [x,z] of [[-7,5],[7,5],[-7,10],[7,10]]){E.P.cyl(ox+x,INT_Y,oz+z,.5,.5,FH,12,sRGB('#efe6d2'),0);E.P.cyl(ox+x,INT_Y+.1,oz+z,.62,.62,.18,12,sRGB('#c9a24a'),6);E.P.cyl(ox+x,INT_Y+FH-.3,oz+z,.62,.62,.18,12,sRGB('#c9a24a'),6);E.obb(x,z,.5,.5,0)}
  {const r=mkRand(11);for(let i=0;i<46;i++)E.box((r()-.5)*(W-2),FH-.04,r()*ZH,.14,.04,.14,'#ffe7a8',8)}
  const posters=[['ЛІС\nПРОБУДЖЕННЯ','комедія','#2f6b3a','#0d2a15'],['ОДЕСА\n2077','фантастика','#2a3f8a','#0b1030'],['ЗОЛОТИЙ\nБЕРЕГ','пригоди','#c27a1a','#3a1a05'],['ТИХА\nГАВАНЬ','драма','#6a2a6e','#1a0a1e']];
  posters.forEach((p,i)=>{const t=cnPoster(p[0],p[1],p[2],p[3],i+3);const z=2.8+i*2.6;for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.7,2.55),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));m.position.set(ox+s*(W/2-.14),INT_Y+2.45,oz+z+(s>0?.0:0));m.rotation.y=s>0?-Math.PI/2:Math.PI/2;grp.add(m)}});
  for(const s of [-1,1])for(const z of [4,9]){E.box(s*(W/2-1.0),.25,z,1.0,.5,2.6,'#2a2025',0);E.box(s*(W/2-.78),.62,z,.4,.4,2.6,'#8c1d2c',0);E.obb(s*(W/2-.9),z,.55,1.3,0)}
  // ticket desk (left) and snack bar (right)
  {E.box(-9.6,.55,11.6,7.2,1.1,1.1,'#241a14',5);E.box(-9.6,1.12,11.6,7.4,.08,1.3,'#d9d2c0',0);E.box(-9.6,1.9,11.95,7.0,1.6,.04,'#a9c9d8',2);E.obb(-9.6,11.6,3.6,.6,0);
   E.plate(['КАСИ · TICKETS'],-9.6,3.9,12.8,Math.PI,6,.9,{bg:'#14161c',color:'#ffd66b',size:90});}
  {E.box(9.6,.55,11.2,10.4,1.1,1.1,'#241a14',5);E.box(9.6,1.12,11.2,10.6,.08,1.3,'#d9d2c0',0);E.obb(9.6,11.2,5.2,.6,0);E.box(9.6,2.0,13.6,10.6,4.0,.3,'#14161c',0);
   E.plate(['ПОПКОРН  180₴','КОЛА  60₴','МОРОЗИВО  30₴','КВИТОК  200₴'],9.6,3.3,13.4,Math.PI,9.4,2.2,{bg:'#14161c',color:'#ffe9b0',size:52,h:240});
   for(const x of [6.6,12.6]){E.box(x,1.1,12.6,1.3,2.2,.9,'#c3262d',0);E.box(x,1.4,12.15,1.1,1.2,.04,'#bfe3ff',2);for(let i=0;i<30;i++){const r=mkRand(i+x*7);E.box(x+(r()-.5)*.9,.95+r()*.8,12.3+r()*.1,.12,.1,.12,'#f6e7b0',0)}E.box(x,2.35,12.6,1.5,.2,1.0,'#ffd66b',3);E.obb(x,12.6,.7,.5,0)}
   E.box(9.6,1.28,11.2,.5,.3,.5,'#c3262d',0);E.box(10.4,1.32,11.0,.28,.4,.28,'#f4f0e8',0);}
  light(-8,FH-.6,7,0xffe2b8,1.3,20);light(8,FH-.6,7,0xffd29a,1.3,20);
  // hall entrance: nobody goes through without a ticket
  const gateI=LOW_OBB.length;E.obb(0,ZH+.1,3,.3,0);const gate=()=>{LOW_OBB[gateI+2]=CN.ticket?-1:3;LOW_OBB[gateI+3]=CN.ticket?-1:.3};gate();
  for(const s of [-1,1])E.box(s*2.0,.55,ZH-.9,.3,1.1,.3,'#c9a24a',6);E.box(0,1.0,ZH-.9,3.8,.05,.05,'#c3262d',0);
  E.plate(['ЗАЛ · HALL'],0,FH+.9,ZH-.2,Math.PI,5,.8,{bg:'#14161c',color:'#fff',size:92});
  // hall: screen, curtains, rows of seats, aisle lights, speakers
  const sx=0,sz=D-.35,SW=22,SH=9.2,sy=2.0;
  E.box(0,sy+SH/2,D-.12,SW+1.0,SH+.8,.2,'#050506',0);E.box(0,.35,D-1.5,SW+3,.7,2.6,'#241a14',5);
  for(const s of [-1,1]){E.box(s*(SW/2+2.4),HH/2-.6,D-.7,3.4,HH-1.2,1.0,'#7a1020',0);E.box(s*(W/2-1.1),3.2,D-3,.5,.9,.7,'#101014',0);E.box(s*(W/2-1.1),5.4,D-12,.5,.9,.7,'#101014',0)}
  E.box(0,HH-.7,D-.7,SW+9,1.4,1.0,'#7a1020',0);
  const mat=new THREE.MeshBasicMaterial({map:cnFilm(),toneMapped:false});CN.screenMat=mat;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),mat);scr.position.set(ox+sx,INT_Y+sy+SH/2,oz+sz);scr.rotation.y=Math.PI;grp.add(scr);
  const screenLight=new THREE.PointLight(0xaec8ff,0,26,1.4);screenLight.position.set(ox,INT_Y+5,oz+D-4);screenLight.userData.i=.0;grp.add(screenLight);L.push(screenLight);CN.screenLight=screenLight;
  const rows=11;for(let r=0;r<rows;r++){const z=21+r*1.35;for(const side of [-1,1])for(let i=0;i<10;i++){const x=side*(1.7+i*.64);const c=(r+i)%2?'#8c1d2c':'#a3283a';
      E.box(x,.4,z,.52,.14,.52,c,0);E.box(x,.86,z-.24,.52,.74,.1,c,0);E.box(x,.2,z,.14,.4,.14,'#1a1a1e',1);CN_SEATS.push([x,z])}
    for(const side of [-1,1])E.box(side*1.1,.014,z,.05,.03,.4,'#ffcf6a',3)}
  for(const s of [-1,1])for(let z=18;z<D-6;z+=3.2)E.box(s*(W/2-.3),1.2,z,.1,.2,.2,'#ffcf6a',3);
  E.box(0,HH-.45,ZH+.2,6,.3,.1,'#1f8f46',3);
  light(0,HH-1,32,0xffcf9a,.35,34);
  // interactions
  E.act(-9.6,9.7,1.7,'Buy a ticket · '+WALLET.fmt(200),()=>{if(CN.ticket){toast('You already have a ticket','the hall is open — pick a seat');return}if(WALLET.pay(200,'Cinema ticket')){CN.ticket=true;gate();toast('Ticket bought','go through to the hall · '+WALLET.fmt()+' left');if(window.AUD)AUD.beep()}});
  E.act(6.9,9.7,1.4,'Buy popcorn · '+WALLET.fmt(180),()=>shBuy('popcorn',180));E.act(9.6,9.7,1.4,'Buy cola · '+WALLET.fmt(60),()=>shBuy('cola',60));E.act(12.4,9.7,1.4,'Buy ice cream · '+WALLET.fmt(30),()=>shBuy('ice cream',30));
  INTERACT.push({x:ox,z:oz+ZH-1.4,r:2.4,get label(){return CN.ticket?'Hall — ticket checked':'Hall — buy a ticket first'},cond:()=>grp.visible,fn:()=>{CN.ticket?toast('Enjoy the film','sit anywhere — the show is on'):toast('Ticket needed','the desk is on the left of the foyer')}});
  let seatI=-1;
  INTERACT.push({x:0,z:0,r:1e9,label:'Sit down — watch the film',cond:()=>{if(!grp.visible||player.sit)return false;seatI=-1;let bd=1.5;for(let i=0;i<CN_SEATS.length;i++){const d=Math.hypot(ox+CN_SEATS[i][0]-player.x,oz+CN_SEATS[i][1]-player.z);if(d<bd){bd=d;seatI=i}}return seatI>=0},
    fn:()=>{if(seatI<0)return;const s=CN_SEATS[seatI];player.sit={x:ox+s[0],z:oz+s[1]-.08,y:INT_Y+.2,yaw:0};cam.yaw=0;cam.pitch=.12;player.vx=player.vz=0;cnPlay(true);toast('The film is on','move to stand up · sound on')}});
  // the film starts muted as you walk into the hall and carries on while you are inside
  let lastC=0;
  ANIM.push(dt=>{if(!grp.visible){if(CN.playing)cnPause();return}
    const inHall=player.z>oz+ZH&&Math.abs(player.x-ox)<W/2+1;
    if(inHall&&!CN.playing)cnPlay(false);if(!inHall&&CN.playing&&!player.sit)cnPause();
    if(CN.fallback)cnFallbackDraw(UNI.uTime.value);
    // the picture lights the room: the screen light follows the average colour of the film
    if(inHall){lastC-=dt;if(lastC<=0){lastC=.3;try{const v=CN.vid;const c=CN.cx;if(CN.fallback||v.readyState<2){CN.screenLight.color.setRGB(.55,.65,1)}else{CN.sc=CN.sc||document.createElement('canvas');CN.sc.width=CN.sc.height=8;const g=CN.sc.getContext('2d');g.drawImage(v,0,0,8,8);const d=g.getImageData(0,0,8,8).data;let r=0,gg=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2]}const n=d.length/4*255;CN.screenLight.color.setRGB(Math.min(1,r/n*1.6+.1),Math.min(1,gg/n*1.6+.1),Math.min(1,b/n*1.6+.1))}}catch(e){}}
      CN.screenLight.userData.i=1.1}else CN.screenLight.userData.i=0});
  E.fin();const pg=E.P.build();if(pg)grp.add(new THREE.Mesh(pg,MATS.props));
  INDOORS.push({name:'cinema',title:'Odesa Cinema',sub:'',floor:'tile',exp:.8,lights:L,test:(x,z)=>x>ox-W/2-1&&x<ox+W/2+1&&z>oz-1&&z<oz+D+1,ceil:()=>INT_Y+HH-.3});
  grp.visible=false;wallSeg(ox-W/2-1,oz-.6,ox+W/2+1,oz-.6,.3,INT_Y-1,INT_Y+HH+1);
  return {grp,spawn:[ox,oz+1.9],spawnYaw:0,title:'Odesa Cinema',sub:'КІНО ТЕАТР VIP · popcorn · the film is on',peds:[],ox,oz,onEnter(){PORTAL.peds=[]}}}

// ---------- the building ----------
function installCinema(grp,G,P,Sg,GR){
  INTERIORS.cinema=()=>CN.built||(CN.built=cnBuild());
  const X=-925,Z=-4521,yaw=-Math.PI/2,c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>[X+u*c+v*s,Z-u*s+v*c];
  const gy=groundH(X,Z);addFlat(X,Z,44,16,gy);
  for(const [bx,bz,w,d] of [[-927,-4523,54,54],[-912,-4509,38,38],[-920,-4516,68,68],[-944,-4539,26,26]])addBlock(bx,bz,w,d,0);   // the OSM boxes the cinema replaces
  const W=46,D=34,H1=8.6,H2=12.4,brick=sRGB('#8d3f2e'),brick2=sRGB('#a04c37'),grey=sRGB('#8b9197'),grey2=sRGB('#a4aab0'),wh=sRGB('#f1eee6'),dk=sRGB('#2a2e34');
  // plaza in front
  {const p=at(0,22);pkRect(GR,p[0],p[1],64,44,yaw,8,.02,yaw);pkRect(GR,p[0],p[1],64.4,44.4,yaw,3,.0,0)}
  const bd=at(0,-D/2);
  P.box(bd[0],gy+H1/2,bd[1],W,H1,D,yaw,brick,4);P.box(bd[0],gy+.4,bd[1],W+.6,.8,D+.6,yaw,sRGB('#5b5d60'),7);P.box(bd[0],gy+H1+.2,bd[1],W+.5,.4,D+.5,yaw,wh,0);
  for(let u=-W/2+1.5;u<W/2;u+=3){const p=at(u,.06);P.box(p[0],gy+H1/2,p[1],.5,H1-.4,.14,yaw,brick2,4)}
  // grey upper volume with vertical ribs, setback from the front
  const ub=at(0,-3-(D-8)/2);
  P.box(ub[0],gy+H1+.4+H2/2,ub[1],W-8,H2,D-8,yaw,grey,9);P.box(ub[0],gy+H1+.4+H2+.25,ub[1],W-7.4,.5,D-7.4,yaw,wh,0);
  for(let u=-(W-8)/2+1;u<(W-8)/2;u+=1.9){const p=at(u,-3+.08);P.box(p[0],gy+H1+.4+H2/2,p[1],.4,H2-.6,.16,yaw,grey2,9)}
  // glass front with mullions and the double door
  {const p=at(0,.12);P.box(p[0],gy+3.2,p[1],16,6.0,.12,yaw,sRGB('#0e1217'),2);for(let u=-8;u<=8;u+=2){const q=at(u,.2);P.box(q[0],gy+3.2,q[1],.14,6.0,.1,yaw,wh,0)}for(const h of [.2,3.2,6.2]){const q=at(0,.2);P.box(q[0],gy+h,q[1],16.2,.14,.1,yaw,wh,0)}
   for(const u of [-.1,.1]){const q=at(u*0,.28);}
   const q=at(0,.3);P.box(q[0],gy+1.35,q[1],.14,2.7,.1,yaw,wh,0);P.box(q[0],gy+1.0,q[1],3.4,.12,.1,yaw,sRGB('#c9a24a'),6);EXTRA_LAMPS.push([q[0]+s*2,gy+3,q[1]+c*2,9])}
  // ring portal canopy on four columns
  {const cp=at(0,6.2);P.box(cp[0],gy+8.6,cp[1],26,.8,13,yaw,wh,0);P.box(cp[0],gy+9.1,cp[1],26.6,.25,13.6,yaw,sRGB('#c3262d'),0);
   for(const [u,v] of [[-11,11],[11,11],[-11,1.5],[11,1.5]]){const p=at(u,v);P.cyl(p[0],gy,p[1],.72,.72,8.3,14,wh,0);P.cyl(p[0],gy,p[1],.95,.95,.35,14,grey2,9);STATIC_CIR.push(p[0],p[1],.8)}
   for(let u=-12;u<=12;u+=3){const p=at(u,12.5);EXTRA_LAMPS.push([p[0],gy+8.2,p[1],5]);P.box(p[0],gy+8.15,p[1],.3,.12,.3,yaw,sRGB('#fff3d0'),3)}
   const ringG=new THREE.Group();const rp=at(0,3.4);ringG.position.set(rp[0],gy+13.65,rp[1]);ringG.rotation.y=yaw;
   const ringM=new THREE.Mesh(new THREE.TorusGeometry(4.0,.45,12,56),new THREE.MeshStandardMaterial({color:0xf3f1ec,roughness:.35,metalness:.3}));ringM.castShadow=true;ringG.add(ringM);
   const neonM=new THREE.MeshBasicMaterial({color:0x5cc8ff,toneMapped:false});const neon=new THREE.Mesh(new THREE.TorusGeometry(3.4,.12,8,56),neonM);ringG.add(neon);
   ringG.userData.dyn=true;grp.add(ringG);ANIM.push(()=>{neonM.color.setHex(pkNightN()>.2?0x7fe0ff:0x3a9fd0)})}
  // sign and billboards
  {const sp=at(0,-3+.26);const sg=plateMesh(['КІНО  ТЕАТР  VIP'],{w:1024,h:95,size:74,color:'#fff',bg:'#13172b',weight:'900'},26,2.4,.9);sg.position.set(sp[0],gy+H1+.4+H2-1.5,sp[1]);sg.rotation.y=yaw;grp.add(sg);
   const T=[['ЛІС\nПРОБУДЖЕННЯ','комедія','#2f6b3a','#0d2a15'],['ОДЕСА\n2077','фантастика','#2a3f8a','#0b1030'],['ЗОЛОТИЙ\nБЕРЕГ','пригоди','#c27a1a','#3a1a05']];
   [[-12,0],[12,1]].forEach(([u,k])=>{const p=at(u,-3+.2);const m=new THREE.Mesh(new THREE.PlaneGeometry(9,6.2),new THREE.MeshBasicMaterial({map:cnPoster(T[k][0],T[k][1],T[k][2],T[k][3],k+7),toneMapped:false}));m.position.set(p[0],gy+H1+.4+6.4,p[1]);m.rotation.y=yaw;grp.add(m);
     const f=at(u,-3+.1);P.box(f[0],gy+H1+.4+6.4,f[1],9.4,6.6,.12,yaw,dk,1)});
   for(const u of [-12,12]){const p=at(u,-3+.14);EXTRA_LAMPS.push([p[0]+s*2,gy+H1+7,p[1]+c*2,10])}
   // lower brick wall: two wide billboards at the sides
   for(const u of [-17,17]){const p=at(u,.2);const m=new THREE.Mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshBasicMaterial({map:cnPoster(T[u<0?2:1][0],T[u<0?2:1][1],T[u<0?2:1][2],T[u<0?2:1][3],u+40),toneMapped:false}));m.position.set(p[0],gy+4.2,p[1]);m.rotation.y=yaw;grp.add(m)}}
  // plaza dressing
  for(const u of [-26,-17,17,26]){const p=at(u,14);pkLamp(P,p[0],groundH(p[0],p[1]),p[1],3,u)}
  for(const u of [-22,22])for(const v of [8,18]){const p=at(u,v);pkBench(P,p[0],groundH(p[0],p[1]),p[1],yaw+(u>0?-Math.PI/2:Math.PI/2))}
  for(const [u,v] of [[-14,24],[14,24],[-28,26],[28,26]]){const p=at(u,v);flowerBed(GR,P,p[0],p[1],8,3.4,yaw,u<0?[sRGB('#d12c2c'),sRGB('#f4f0e8'),sRGB('#e8b42a')]:[sRGB('#8a3ac0'),sRGB('#f4f0e8'),sRGB('#e23a3a')])}
  STATIC_OBB.push(bd[0],bd[1],W/2,D/2,c,-s);TREE_CLEAR.push(X,Z,40);
  // the door: walk into the glass, or press E
  const door=at(0,1.0),ret=at(0,3.4);const go=()=>PORTAL.enter('cinema',{x:ret[0],z:ret[1],yaw},{});
  INTERACT.push({x:door[0],z:door[1],y:gy+.5,r:3.4,label:'Enter the cinema',cond:()=>!PORTAL.cur&&!player.sit&&!DRIVE.on,fn:go});
  DOORS.push({x:door[0],z:door[1],nx:s,nz:c,tx:c,tz:-s,w:4,y:gy+.5,name:'cinema',opt:{},go});
  PLACES.push({id:'cinema',name:'Cinema',sub:'КІНО ТЕАТР VIP · Gorky Park',x:at(0,20)[0],z:at(0,20)[1],yaw:Math.atan2(s,c)+Math.PI})}
