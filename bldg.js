// bldg.js — every ordinary building on the map can be entered.
// One dynamic INTERACT entry follows the nearest building wall around the player; E opens an interior picked by the
// building's style: shops and cafes, a house room, a hall/office, a warehouse, or the stairwell of a block of flats.
// Loaded before the main script; style constants (SHOP, KHRU, ...) are only read at call time.

const BG_SHOPS=[['phones','Phone shop'],['pharmacy','Pharmacy'],['sweets','Sweets & ice cream'],['coffee','Coffee point'],['books','Bookshop'],['gifts','Gift shop'],
  ['flowers','Flower shop'],['eva','Cosmetics'],['optics','Optics'],['jewel','Jewellery'],['toys','Toy shop']];
const BG={cur:null,lx:1e9,lz:1e9,lt:0,cache:{}};

function bgChunk(cid){let L=BG.cache[cid];if(L)return L;L=BG.cache[cid]=[];const [x0,z0]=chunkOrigin(cid);
  for(let k=D.bctab[cid];k<D.bctab[cid+1];k++){const rings=bldRings(k,x0,z0),a=rings[0];let mnx=1e9,mxx=-1e9,mnz=1e9,mxz=-1e9;
    for(let q=0;q<a.length;q+=2){mnx=Math.min(mnx,a[q]);mxx=Math.max(mxx,a[q]);mnz=Math.min(mnz,a[q+1]);mxz=Math.max(mxz,a[q+1])}
    L.push({k,rings,mnx,mxx,mnz,mxz,area:Math.abs(ringArea(a))})}
  return L}
// nearest building wall within 2.6 m of the player (outside the footprint, not a removed/landmark building, not a shed)
function bgFind(x,z){const id=chunkIdAt2(x,z);if(id<0)return null;const i0=id%NCX,j0=Math.floor(id/NCX);let best=null,bd=2.6;
  for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){if(i<0||j<0||i>=NCX||j>=NCZ)continue;
    for(const b of bgChunk(j*NCX+i)){if(x<b.mnx-bd||x>b.mxx+bd||z<b.mnz-bd||z>b.mxz+bd)continue;if((D.bfl[b.k]&1)||b.area<25)continue;
      if(polyInside(b.rings,x,z))continue;const q=polyNearest(b.rings,x,z);if(q[0]<bd){bd=q[0];best={k:b.k,qx:q[1],qz:q[2],area:b.area}}}}
  if(best&&typeof VEN!=='undefined')best.v=VEN.forEntry(best.k,best.qx,best.qz);      // a real venue (ven.js) on this stretch of wall decides what the door opens
  return best}
function bgType(b){const st=D.bst[b.k],h=(Math.imul(b.k+1,2654435761)>>>0)>>>4;
  if(b.v&&typeof VEN!=='undefined'&&VEN.INT[b.v.c])return {id:VEN.INT[b.v.c],label:'Enter '+b.v.name,ven:b.v};
  if(st===KHRU||st===PANEL||st===BRICK||st===TOWER)return {id:'stair',label:'Enter the stairwell'};
  if(st===SHOP){if(b.area>=170)return {id:'bg_market',label:'Enter the supermarket'};const v=BG_SHOPS[h%BG_SHOPS.length];return {id:'bg_'+v[0],label:'Enter '+v[1].toLowerCase()}}
  if(st===HOUSE)return {id:'bg_house',label:'Enter the house'};
  if(st===INDUST)return {id:'bg_ware',label:'Enter the warehouse'};
  if(st===HIST||st===MOLD)return h%2?{id:'bg_cafe',label:'Enter the cafe'}:{id:'bg_hall',label:'Enter the lobby'};
  return {id:'bg_hall',label:'Enter the lobby'}}
// walking straight into a shop, cafe or supermarket wall opens it (no need to find the button); BGW is the queue of shop interiors built in idle moments (see tickDoors)
const BGW=[];let bgBumpT=0;
function bgBump(dt,sp,fx,fz){const b=BG.cur;if(!b||sp<.5){bgBumpT=0;return false}
  if(!/^bg_(market|cafe|phones|pharmacy|sweets|coffee|books|gifts|flowers|eva|optics|jewel|toys|rest|bar|game|gym|cloth)$/.test(bgType(b).id)){bgBumpT=0;return false}
  const dx=b.qx-player.x,dz=b.qz-player.z,d=Math.hypot(dx,dz);if(d>.8||(dx*fx+dz*fz)/Math.max(d,.01)<.75){bgBumpT=0;return false}
  bgBumpT+=dt;if(bgBumpT<.35)return false;bgBumpT=0;bgEnter(b);return true}
function bgEnter(b){if(!b)return;const t=bgType(b),ret={x:player.x,z:player.z,yaw:Math.atan2(player.x-b.qx,player.z-b.qz)};
  if(t.id==='stair')PORTAL.enter('stair',ret,{ent:1+b.k%4});
  else{const v=t.ven,nm=v?v.name:'',sb=v?(VEN.LABEL[v.c]||''):'';      // the shared interior wears the real venue's name
    if(v&&PORTAL.built[t.id]){PORTAL.built[t.id].title=nm;PORTAL.built[t.id].sub=sb}
    PORTAL.enter(t.id,ret);
    if(v)setTimeout(()=>{const B=PORTAL.active;if(B&&PORTAL.cur===t.id){B.title=nm;B.sub=sb;toast(nm,sb)}},560)}}

// ---------- interiors ----------
function bgHouse(P,grp,ox,oz,hw,Dp){const c=sRGB,Y=INT_Y;
  P.box(ox,Y+.02,oz+4,5.6,.03,4,0,c('#8a3b3b'),0);                                                          // rug
  P.box(ox-2.6,Y+.3,oz+Dp-1.1,3,.6,1,0,c('#4a6a8a'),1);P.box(ox-2.6,Y+.78,oz+Dp-.7,3,.5,.2,0,c('#4a6a8a'),1);LOW_OBB.push(ox-2.6,oz+Dp-1.1,1.5,.55,1,0);   // sofa
  P.box(ox-2.6,Y+.22,oz+Dp-2.6,1.5,.44,.8,0,c('#6b4a2e'),5);                                                // coffee table
  P.box(ox+2.6,Y+.4,oz+Dp-.5,2,.8,.5,0,c('#3b2a1e'),5);P.box(ox+2.6,Y+1.15,oz+Dp-.55,1.4,.8,.08,0,c('#0b0b0d'),2);LOW_OBB.push(ox+2.6,oz+Dp-.5,1,.3,1,0);   // TV
  P.box(ox+hw-1.2,Y+.3,oz+2.2,1.8,.6,2.2,0,c('#e8e2d4'),1);P.box(ox+hw-1.2,Y+.66,oz+3,1.7,.1,.7,0,c('#cfc8b8'),1);LOW_OBB.push(ox+hw-1.2,oz+2.2,.9,1.1,1,0);   // bed
  P.box(ox-hw+.5,Y+1.1,oz+2.4,.6,2.2,2.2,0,c('#7a5a3a'),5);LOW_OBB.push(ox-hw+.5,oz+2.4,.3,1.1,1,0);          // wardrobe
  INTERACT.push({x:ox-2.6,z:oz+Dp-2,r:1.8,label:'Sit on the sofa',fn:()=>toast('Cosy','someone left the TV on')})}
function bgHall(P,grp,ox,oz,hw,Dp){const c=sRGB,Y=INT_Y;
  P.box(ox,Y+.55,oz+Dp-2.2,4.2,1.1,.9,0,c('#5a3a24'),5);P.box(ox,Y+1.12,oz+Dp-2.2,4.4,.06,1.0,0,c('#2a1a10'),5);LOW_OBB.push(ox,oz+Dp-2.2,2.2,.5,1,0);   // reception desk
  for(const s of [-1,1]){P.box(ox+s*4,Y+.25,oz+4,.7,.5,2.6,0,c('#6a4a2e'),5);P.box(ox+s*4.3,Y+.7,oz+4,.15,.5,2.6,0,c('#6a4a2e'),5);LOW_OBB.push(ox+s*4,oz+4,.45,1.3,1,0)
    P.box(ox+s*(hw-.8),Y+.3,oz+Dp-.9,.6,.6,.6,0,c('#7a4a2a'),5);P.box(ox+s*(hw-.8),Y+.95,oz+Dp-.9,.8,.8,.8,0,c('#2f7a3a'),0)}                         // benches, plants
  INTERACT.push({x:ox,z:oz+Dp-3.3,r:1.9,label:'Ask at the desk',fn:()=>toast('Nobody is in','back in five minutes')})}
function bgWare(P,grp,ox,oz,hw,Dp){const c=sRGB,Y=INT_Y,cols=['#a9794a','#8e6338','#b88a55'];
  for(const x of [-hw+2.2,hw-2.2]){P.box(ox+x,Y+1.2,oz+Dp*.55,1.2,2.4,Dp*.6,0,c('#3a5a7a'),6);LOW_OBB.push(ox+x,oz+Dp*.55,.65,Dp*.3,1,0);
    for(let k=0;k<8;k++)P.box(ox+x+(k%2?.25:-.25),Y+.4+(k%4)*.6,oz+Dp*.3+k*(Dp*.5/8)+.5,.5,.45,.6,0,c(cols[k%3]),5)}
  for(let k=0;k<6;k++){P.box(ox-1.6+(k%3)*1.4,Y+.45,oz+Dp-2+Math.floor(k/3)*1.4,1.1,.9,1.1,0,c(cols[k%3]),5)}LOW_OBB.push(ox,oz+Dp-1.6,2.4,1.3,1,0)}

function installBldg(){
  let idx=24;
  for(const [key,title] of BG_SHOPS){const i=idx++;INTERIORS['bg_'+key]=()=>shBrandInterior({key:'bg_'+key,idx:i,title,sub:'open every day',fill:(U,E)=>shSmall(U,key),room:{w:12,d:9,h:3.2}})}
  {const i=idx++;INTERIORS.bg_market=()=>shBrandInterior({key:'bg_market',idx:i,title:'Tavria V',sub:'neighbourhood supermarket',fill:(U,E)=>shMarket(U,'tavria',{cross:8}),room:{w:22,d:15,h:4}})}
  {const i=idx++;INTERIORS.bg_cafe=()=>shBrandInterior({key:'bg_cafe',idx:i,title:'Cafe',sub:'coffee and pastries',fill:(U,E)=>{shFood(shUnit(E,'N',U.x0,U.x1,U.D-5,U.D),'coffee');shBurgerSeating(U)},room:{w:14,d:10,h:3.4,floor:0xd9d2c4}})}
  {const i=idx++;INTERIORS.bg_house=()=>simpleInterior('bg_house',i,{w:10,d:8,h:2.8,floor:0x8a6a4a,fr:.5,wall:0xe8dcc4,title:'House',sub:'someone\'s living room',lights:[2,5.5],lcol:0xffe0b0,li:1.5,furnish:bgHouse})}
  {const i=idx++;INTERIORS.bg_hall=()=>simpleInterior('bg_hall',i,{w:12,d:10,h:3.6,floor:0xb9b3a6,fr:.35,wall:0xeee8d8,title:'Lobby',sub:'old stairs, a clock and a desk',lights:[3,7],lcol:0xfff0d8,li:1.6,furnish:bgHall})}
  {const i=idx++;INTERIORS.bg_ware=()=>simpleInterior('bg_ware',i,{w:14,d:12,h:5,floor:0x77746e,fr:.8,wall:0xa8a190,ceil:0x8d8a82,title:'Warehouse',sub:'crates and pallets',lights:[3,9],lcol:0xe8eef8,li:1.8,furnish:bgWare})}
  for(const k of ['bg_market','bg_cafe'].concat(BG_SHOPS.map(v=>'bg_'+v[0])))BGW.push({name:k});
  const ent={x:0,z:0,y:0,r:3.2,label:'Enter',cond(){
      if(PORTAL.cur||RIDE.on||DRIVE.on||PASS.host||player.sit)return false;
      const t=performance.now();if(Math.hypot(player.x-BG.lx,player.z-BG.lz)>.6||t-BG.lt>400){BG.lx=player.x;BG.lz=player.z;BG.lt=t;BG.cur=bgFind(player.x,player.z)}
      const b=BG.cur;if(!b)return false;ent.x=b.qx;ent.z=b.qz;ent.y=player.y;ent.label=bgType(b).label;ent.act=bgType(b).id==='stair'?'door':null;return true},
    fn(){bgEnter(BG.cur)}};
  INTERACT.push(ent);
  if(typeof VEN!=='undefined')VEN.install()}
