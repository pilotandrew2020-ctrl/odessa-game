// khru.js — five-storey Khrushchyovka blocks spread over the residential districts.
// Every block has four entrances; each door opens the stairwell (floors 1-5, flats upstairs).
// Loaded before the main script; touches game globals only when installKhru() runs.

// [district, lat, lon, how many blocks around this spot]
const KH_SPOTS=[
  ['Tairove',46.4035,30.7075,3],['Tairove',46.3940,30.7180,3],['Tairove',46.4105,30.7310,3],['Tairove',46.3860,30.7330,2],
  ['Cheryomushky',46.4420,30.7190,2],['Cheryomushky',46.4520,30.7050,2],
  ['Moldavanka',46.4660,30.7050,2],['Peresyp',46.5120,30.7160,2],['Peresyp',46.5280,30.7240,2],
  ['Luzanivka',46.5560,30.7560,2],['Kotovsky',46.5800,30.7800,2],['Velykyi Fontan',46.3870,30.7620,2],['French Boulevard',46.4540,30.7620,1]];
const KH_COL='#e8a33d';

function khBuild(grp,P,GR,at,W,n,tag){
  const F=lotFrame(at.x,at.z,at.yaw),y0=rawH(at.x,at.z),ry=F.yaw,Dp=12,Hb=14.4,fv=Dp/2,c=F.P(0,0);
  lotPad(F,W+8,Dp+14,y0);
  groundQuad(GR,[F.P(-W/2-3,fv),F.P(W/2+3,fv),F.P(W/2+3,fv+4),F.P(-W/2-3,fv+4)],8,y0+.05,F.yaw);       // pavement in front of the doors
  const tex=windowRowsTex({bg:'#d8d1bf',rows:5,cols:Math.round(W/4),win:'#2c3b47',lit:.3,mx:.2,my:.2,band:'#bdb5a2'});
  texBox(grp,c[0],y0,c[1],W,Hb,Dp,ry,tex,W,Hb,new THREE.MeshStandardMaterial({color:0xcfc8b6,roughness:.8}),true);
  addBlock(c[0],c[1],W+2,Dp+2,F.a);addOBB(c[0],c[1],W,Dp,F.a);
  P.box(c[0],y0+Hb+.18,c[1],W+.7,.36,Dp+.7,ry,sRGB('#4b4741'),1);                                        // roof edge
  P.box(c[0],y0+Hb+.6,c[1],W-1,.5,Dp-1.2,ry,sRGB('#5a5650'),1);                                            // low pitched roof
  for(let s=0;s<n;s++){const u=(s-(n-1)/2)*14,dr=lotDoor(F,u,fv);
    shopDoor(grp,P,dr,y0,{label:'x',interior:'stair',w:1.6,awn:'#7d7a72',sign:String(s+1),sw:1.3,ssize:100,bg:'#2a4a6a'});INTERACT.pop();   // visuals only; the real interaction passes the entrance number
    INTERACT.push({x:dr.x+dr.nx*1.4,z:dr.z+dr.nz*1.4,y:y0,r:2.1,label:'Enter entrance '+(s+1),cond:()=>!PORTAL.cur&&!RIDE.on,
      fn:()=>PORTAL.enter('stair',{x:dr.x+dr.nx*2.3,z:dr.z+dr.nz*2.3,yaw:Math.atan2(dr.nx,dr.nz)},{ent:s+1})});
    for(let f=1;f<5;f++)for(const du of [-3.6,3.6]){const q=F.P(u+du,fv+.45),yy=y0+f*2.88;          // balconies on floors 2-5
      P.box(q[0],yy,q[1],2.4,.12,.9,ry,sRGB('#b9b2a2'),1);P.box(q[0]+F.n[0]*.4,yy+.5,q[1]+F.n[1]*.4,2.4,.9,.05,ry,sRGB('#6f6c66'),6)}}
  const pp=F.P(0,fv+4);return {x:pp[0],z:pp[1],yaw:ry+Math.PI}}

function installKhru(grp,G,P,Sg,GR){
  const placed=[],seen={};let tries=0;const t0=performance.now();
  const clear=(x,z)=>placed.every(q=>Math.hypot(q.x-x,q.z-z)>70);
  for(const [dist,lat,lon,count] of KH_SPOTS){const [bx,bz]=geo2xz(lat,lon);
    for(let k=0;k<count;k++){let lot=null,W=58,n=4;
      for(let a=0;a<3&&!lot;a++){const ang=k*2.1+a*1.3,tx=bx+Math.cos(ang)*(k?120:0),tz=bz+Math.sin(ang)*(k?120:0);tries++;
        lot=shFindLot(tx,tz,W,14,200);if(!lot&&a===1){W=44;n=3;lot=shFindLot(tx,tz,W,14,200)}
        if(lot&&!clear(lot.x,lot.z))lot=null}
      if(!lot)continue;
      const sp=khBuild(grp,P,GR,lot,W,n,dist);placed.push({x:lot.x,z:lot.z});
      const first=!seen[dist];seen[dist]=1;
      PLACES.push({id:'khru'+placed.length,name:'Khrushchyovka · '+dist,sub:'5 floors · '+n+' entrances · go inside',x:sp.x,z:sp.z,yaw:sp.yaw,pin:KH_COL,pinText:'5',poi:['5',KH_COL],r:40,hide:!first})}}
  PARKED_DIRTY=true;window.KHRU_PLACED=placed.length;
  if(window.console)console.log('khru: '+placed.length+' blocks, '+tries+' searches, '+Math.round(performance.now()-t0)+' ms')}
