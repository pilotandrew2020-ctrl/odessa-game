/* ===================================================================================================
   shops.js — the 4-floor Odesa Mall in the city centre and brand shops scattered over the map
   Loaded BEFORE the main script; everything here runs from installShops(), called while the landmarks are built.

   • Odesa Mall   (city centre, on the square by the avenue): Lidl and Tavria V on the ground floor, Nike / Adidas / Zara / H&M and the
                  clothes + hair salon on floor 2, electronics and toys on floor 3, a big food court on floor 4. A glass lift and escalators
                  link the floors (each floor is its own interior, like the stairwell lifts in the flats).
   • Brand shops  Lidl ×2, Nike, Adidas, McDonald's, a shawarma bar — each on its own free lot in a different district; Żabka and the
                  Polmozbyt car dealer are moved away from the home yard as well. All of them can be entered.
   =================================================================================================== */

// ---------- brands ----------
const SH_BRANDS={
  lidl:{name:'LIDL',bg:'#0050aa',fg:'#fff000'},tavria:{name:'ТАВРІЯ В',bg:'#d21f26',fg:'#ffffff'},nike:{name:'NIKE',bg:'#111111',fg:'#ffffff'},adidas:{name:'adidas',bg:'#ffffff',fg:'#111111'},
  zara:{name:'ZARA',bg:'#f4f4f0',fg:'#111111'},hm:{name:'H&M',bg:'#e50010',fg:'#ffffff'},comfy:{name:'COMFY',bg:'#2d8f3a',fg:'#ffffff'},toys:{name:'TOY KINGDOM',bg:'#6a2cb8',fg:'#ffd84a'},
  mcd:{name:"McDonald's",bg:'#da291c',fg:'#ffc72c'},kfc:{name:'KFC',bg:'#e4002b',fg:'#ffffff'},bk:{name:'BURGER KING',bg:'#d62300',fg:'#f5ebdc'},shaw:{name:'ШАУРМА',bg:'#2e6b2e',fg:'#ffe066'},
  pizza:{name:'PIZZA',bg:'#b3141b',fg:'#ffffff'},sushi:{name:'SUSHI',bg:'#15151a',fg:'#ff4a55'},kebab:{name:'KEBAB HOUSE',bg:'#6b3a1a',fg:'#ffd27a'},gelato:{name:'GELATO',bg:'#ff8fb8',fg:'#ffffff'},
  coffee:{name:'COFFEE',bg:'#4a2f1d',fg:'#f6e7cf'},bakery:{name:'BAKERY',bg:'#c98a3a',fg:'#fff4de'},tea:{name:'BUBBLE TEA',bg:'#35b6a8',fg:'#ffffff'},smoothie:{name:'SMOOTHIES',bg:'#78b52c',fg:'#ffffff'},
  flowers:{name:'FLOWERS',bg:'#c2417b',fg:'#ffffff'},pharmacy:{name:'АПТЕКА',bg:'#1f9d55',fg:'#ffffff'},phones:{name:'iSTORE · PHONES',bg:'#1b1b1f',fg:'#ffffff'},sweets:{name:'SWEETS',bg:'#e05a8b',fg:'#fff1f6'},
  books:{name:'BOOKS',bg:'#2b4a7a',fg:'#ffe9b0'},eva:{name:'EVA · BEAUTY',bg:'#d63a8c',fg:'#ffffff'},jewel:{name:'JEWELRY',bg:'#14213d',fg:'#f2c14e'},optics:{name:'OPTICS',bg:'#1f6fa8',fg:'#ffffff'},
  gifts:{name:'GIFTS',bg:'#8a2be2',fg:'#ffffff'},salon:{name:'HAIR SALON',bg:'#222831',fg:'#ffd369'},fashion:{name:'FASHION HALL',bg:'#7a1fa2',fg:'#ffffff'},zabka:{name:'żabka',bg:'#00843d',fg:'#ffffff'}
};
// a signboard: logo shapes for the big names, plain colour + lettering for the rest
function shLogoCanvas(key,W,H){const b=SH_BRANDS[key]||{name:key.toUpperCase(),bg:'#333',fg:'#fff'};const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  x.fillStyle=b.bg;x.fillRect(0,0,W,H);x.textAlign='center';x.textBaseline='middle';
  const txt=(s,size,col,px,py,font)=>{x.fillStyle=col;x.font='900 '+size+'px '+(font||'"Golos Text",Arial,sans-serif');let w=x.measureText(s).width,sz=size;const mw=W*.92;if(w>mw&&px===W/2){sz=Math.floor(size*mw/w);x.font='900 '+sz+'px '+(font||'"Golos Text",Arial,sans-serif')}x.fillText(s,px,py)};
  if(key==='lidl'){const r=H*.44;x.fillStyle='#e60000';x.beginPath();x.arc(W*.24,H/2,r,0,7);x.fill();x.fillStyle='#fff000';x.beginPath();x.arc(W*.24,H/2,r*.86,0,7);x.fill();txt('Lidl',H*.3,'#0050aa',W*.24,H*.54,'Arial Black,Arial');txt('LIDL',H*.62,'#fff000',W*.66,H*.54,'Arial Black,Arial')}
  else if(key==='nike'){x.fillStyle='#fff';x.beginPath();x.moveTo(W*.1,H*.6);x.bezierCurveTo(W*.18,H*.82,W*.3,H*.7,W*.46,H*.3);x.bezierCurveTo(W*.3,H*.55,W*.2,H*.66,W*.1,H*.6);x.fill();txt('NIKE',H*.55,'#fff',W*.7,H*.52,'Arial Black,Arial')}
  else if(key==='adidas'){x.fillStyle='#111';for(let i=0;i<3;i++){const bx=W*.1+i*H*.2;x.beginPath();x.moveTo(bx,H*.78);x.lineTo(bx+H*.12,H*.78);x.lineTo(bx+H*.12+H*.3-i*H*.1,H*.3+i*H*.16);x.lineTo(bx+H*.3-i*H*.1,H*.3+i*H*.16);x.closePath();x.fill()}txt('adidas',H*.5,'#111',W*.66,H*.52,'Arial Black,Arial')}
  else if(key==='mcd'){txt('M',H*1.05,'#ffc72c',W*.2,H*.56,'Arial Black,Arial');txt("McDonald's",H*.42,'#fff',W*.62,H*.54,'Arial Black,Arial')}
  else if(key==='tavria'){x.fillStyle='#ffd200';x.fillRect(0,H*.82,W,H*.1);txt('ТАВРІЯ В',H*.58,'#fff',W/2,H*.44,'Arial Black,Arial')}
  else txt(b.name,H*.5,b.fg,W/2,H*.52,'Arial Black,Arial');
  return cv}
function shLogoMesh(key,w,h,glow){const cv=shLogoCanvas(key,1024,Math.round(1024*h/w));const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;
  const m=new THREE.MeshStandardMaterial({map:t,roughness:.5,emissive:new THREE.Color(1,1,1),emissiveMap:t,emissiveIntensity:glow===undefined?.8:glow});return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m)}

// ---------- prices ----------
const SH_PRICES={'milk':38,'bread':28,'juice':52,'apples':35,'crisps':45,'ice cream':30,'sausage':120,'hematogen':22,'vitamin C':15,'water':22,'cheese':140,'yogurt':32,'chocolate':55,'cola':40,'pizza (frozen)':89,'pasta':48,'coffee beans':260,
  'bouquet':450,'smartphone':12500,'perfume':1800,'lipstick':350,'teddy bear':600,'LEGO set':2100,'book':320,'silver ring':1500,'sunglasses':900,'souvenir':250,'headphones':2400,'power bank':700,'coffee':65,'cappuccino':60,'croissant':50,'candy box':120};
function shBuy(name,price){if(!WALLET.pay(price,name))return;BAG[name]=(BAG[name]||0)+1;toast('Bought: '+name,'₴'+price+' · wallet '+WALLET.fmt());if(window.AUD)AUD.beep()}
function shPayBasket(){let sum=0,n=0;for(const [k,v] of Object.entries(INVENTORY)){sum+=(PRICE[k]||20)*v;n+=v}
  if(!n){toast('Basket is empty','take something from the shelves first');return}if(!WALLET.pay(sum,'Your basket'))return;
  for(const [k,v] of Object.entries(INVENTORY)){BAG[k]=(BAG[k]||0)+v;delete INVENTORY[k]}PRD.paid();toast('Paid '+WALLET.fmt(sum),n+' item'+(n>1?'s':'')+' · thank you! · wallet '+WALLET.fmt())}

// ---------- environment of one interior: boxes, walls, signs, interactions in local coordinates ----------
function shEnv(grp,ox,oz,H,Pext){const P=Pext||new PB(),E={grp,P,ox,oz,H,peds:[]};const col=c=>typeof c==='string'||typeof c==='number'?sRGB(c):c;
  E.box=(x,y,z,w,h,d,c,m,ry)=>P.box(ox+x,INT_Y+y,oz+z,w,h,d,ry||0,col(c),m||0);      // rotation about y is the optional last argument
  E.obb=(x,z,hw,hd,ry)=>LOW_OBB.push(ox+x,oz+z,hw,hd,Math.cos(ry||0),-Math.sin(ry||0));
  E.wall=(xa,za,xb,zb,h,c,th)=>{th=th||.24;const L=Math.hypot(xb-xa,zb-za);if(L<.05)return;E.box((xa+xb)/2,h/2,(za+zb)/2,th,h,L,c||'#efece4',0,Math.atan2(xb-xa,zb-za));wallSeg(ox+xa,oz+za,ox+xb,oz+zb,th+.1,INT_Y-1,INT_Y+h+1)};
  E.plate=(lines,x,y,z,ry,w,h,opt)=>{const m=plateMesh(lines,Object.assign({w:1024,h:Math.round(1024*h/w),size:130,color:'#fff',bg:'#333',weight:'900'},opt||{}),w,h,opt&&opt.emis!==undefined?opt.emis:.8);m.position.set(ox+x,INT_Y+y,oz+z);m.rotation.y=ry;grp.add(m);return m};
  E.logo=(key,x,y,z,ry,w,h,glow)=>{const m=shLogoMesh(key,w,h,glow);m.position.set(ox+x,INT_Y+y,oz+z);m.rotation.y=ry;grp.add(m);return m};
  E.act=(x,z,r,label,fn)=>INTERACT.push({x:ox+x,z:oz+z,r,label,fn});
  E.ped=(x,z,yaw,route,o)=>{const p=intPed(ox+x,oz+z,yaw,route&&route.map(q=>[ox+q[0],oz+q[1]]));if(o)Object.assign(p,o);p.basket=!!(o&&o.basket);E.peds.push(p);return p};
  // real 3D goods (products.js): rows are collected here and turned into instanced meshes by E.fin() once the interior is furnished
  E.B=null;E.rowW=(cat,x,y,z,dx,dz,len,yaw,seed,o)=>PRD.row(E.B||(E.B=PRD.batch()),cat,ox+x,INT_Y+y,oz+z,dx,dz,len,yaw,seed,o);
  E.fin=()=>{if(E.B){E.B.flush(grp);E.B=null}};
  E.cash=(x,z,yaw,key,seed)=>{E.obb(x,z,.3,.3,0);return PRD.cashier(grp,ox+x,INT_Y,oz+z,yaw,key,seed)};
  return E}

// ---------- a unit: a shop space with its own frame. v runs from the opening (0) into the shop, u along the opening ----------
function shUnit(E,side,x0,x1,z0,z1){const horiz=side==='S'||side==='N',W=horiz?x1-x0:z1-z0,D=horiz?z1-z0:x1-x0;let fc,n;
  if(side==='S'){fc=[(x0+x1)/2,z1];n=[0,1]}else if(side==='N'){fc=[(x0+x1)/2,z0];n=[0,-1]}else if(side==='W'){fc=[x1,(z0+z1)/2];n=[1,0]}else{fc=[x0,(z0+z1)/2];n=[-1,0]}
  const t=[n[1],-n[0]],ry=Math.atan2(n[0],n[1]),U={E,side,W,D,fc,n,t,ry,x0,x1,z0,z1};
  U.P=(u,v)=>[fc[0]+t[0]*u-n[0]*v,fc[1]+t[1]*u-n[1]*v];
  U.box=(u,y,v,sw,sh,sd,c,m)=>{const p=U.P(u,v);E.box(p[0],y,p[1],sw,sh,sd,c,m,ry)};
  U.obb=(u,v,hw,hd)=>{const p=U.P(u,v);E.obb(p[0],p[1],hw,hd,ry)};
  U.plate=(lines,u,y,v,w,h,opt,away)=>{const p=U.P(u,v);return E.plate(lines,p[0],y,p[1],away?ry+Math.PI:ry,w,h,opt)};
  U.logo=(key,u,y,v,w,h,away,glow)=>{const p=U.P(u,v);return E.logo(key,p[0],y,p[1],away?ry+Math.PI:ry,w,h,glow)};
  U.act=(u,v,r,label,fn)=>{const p=U.P(u,v);E.act(p[0],p[1],r,label,fn)};
  U.ped=(u,v,faceOut,route,o)=>{const p=U.P(u,v);return E.ped(p[0],p[1],faceOut?ry:ry+Math.PI,route,o)};
  U.cash=(u,v,faceOut,key,seed)=>{const p=U.P(u,v);return E.cash(p[0],p[1],faceOut?ry:ry+Math.PI,key,seed||Math.round((p[0]*7.3+p[1]*3.1)*10))};
  // a facing row of goods starting at (u,v), running along (du,dv) for len metres, labels turned towards (fu,fv); all in unit coordinates
  U.row=(cat,u,y,v,du,dv,len,fu,fv,seed,o)=>{const p=U.P(u,v);E.rowW(cat,p[0],y,p[1],t[0]*du-n[0]*dv,t[1]*du-n[1]*dv,len,Math.atan2(t[0]*fu-n[0]*fv,t[1]*fu-n[1]*fv),seed,o)};
  return U}

// shop front: pillars at both ends, a fascia with the logo above the opening and a light strip under it
function shFront(U,key,opt){opt=opt||{};const E=U.E,H=E.H,W=U.W,b=SH_BRANDS[key]||{},ph=H-.02;
  for(const s of [-1,1]){U.box(s*(W/2-.25),ph/2,.25,.5,ph,.5,'#e9e5dc',0);U.obb(s*(W/2-.25),.25,.3,.3)}
  U.box(0,H-.8-.1,.2,W,1.6,.4,b.bg||'#333',0);
  const lw=Math.min(W-1.2,opt.logoW||9),lh=Math.min(1.3,lw*.2);U.logo(key,0,H-.9,-.03,lw,lh,false,.9);
  U.box(0,H-1.75,.3,W-.8,.08,.12,'#fff6e0',8)}

// ---------- supermarket (Lidl, Tavria V) ----------
function shMarket(U,key,opt){opt=opt||{};const E=U.E,W=U.W,D=U.D,cols=['#d8372a','#f2c418','#2f6db0','#3f9a4a','#e07a2a','#8a4ab0','#f4f4f0','#7a3b1e'],b=SH_BRANDS[key];
  // open chillers along the back wall: milk, yoghurt, cheese and drinks on lit shelves (real packs, see products.js)
  {const fw=W-1.4;U.box(0,1.15,D-.08,fw,2.3,.1,'#cfe3ee',1);U.box(0,.1,D-.45,fw,.2,.8,'#8e969c',6);U.box(0,2.36,D-.45,fw+.1,.12,.9,b.bg,0);U.box(0,2.27,D-.5,fw-.2,.04,.6,'#f4fbff',8);
    for(const s of [-1,1])U.box(s*fw/2,1.15,D-.45,.08,2.3,.8,'#8e969c',6);
    [.3,.78,1.26,1.74].forEach((y,l)=>{U.box(0,y-.01,D-.46,fw-.1,.03,.7,'#e4eaee',1);U.row(l===3?'drinks':'fridge',-fw/2+.1,y+.02,D-.64,1,0,fw-.2,0,-1,31+l*5,{gap:.04})});
    U.obb(0,D-.45,fw/2,.45)}
  // aisles: gondola shelves running along the opening, real packs facing both ways
  const rows=[];for(let v=4.2;v<D-2.6;v+=3.1)rows.push(v);
  const AIS=[[['snacks','sweets','snacks','pantry'],['drinks','drinks','mix','drinks']],[['pantry','pantry','coffee','sweets'],['home','pantry','home','pantry']],[['bakery','pantry','pantry','pantry'],['mix','snacks','sweets','drinks']],[['mix','pantry','snacks','sweets'],['drinks','mix','drinks','pantry']]];
  rows.forEach((v,ri)=>{const len=W-(opt.cross||9),u0=-len/2,A=AIS[ri%AIS.length];
    U.box(0,.08,v,len,.16,.9,'#8e969c',6);U.box(0,.9,v,len,1.8,.06,'#c9ccd0',6);U.obb(0,v,len/2,.55);
    for(const s of [-1,1])U.box(s*len/2,.9,v,.06,1.8,.9,'#c9ccd0',6);
    for(let l=0;l<4;l++)for(const sd of [-1,1]){const y=.22+l*.4;U.box(0,y,v+sd*.22,len-.06,.03,.4,'#e8e8e4',1);U.row(A[sd<0?0:1][l],u0+.06,y+.015,v+sd*.22,1,0,len-.12,0,sd<0?-1:1,ri*40+l*7+(sd<0?0:3),{gap:.03})}
    U.box(0,1.95,v,len,.14,.5,b.bg,0)});
  // fruit and veg crates along the side walls
  for(const s of [-1,1])for(let k=0;k<3;k++){const u=s*(W/2-1.2),v=1.2+k*1.3;U.box(u,.4,v,1,.8,1.1,'#b98a4a',5);U.obb(u,v,.55,.6);for(let r=-1;r<=1;r++)U.row('fresh',u-.4,.8,v+r*.32,1,0,.8,0,-1,k*9+r*3+(s>0?5:0),{gap:.04})}
  // checkouts: belt, till desk and a cashier at each manned lane (the middle of the opening stays free)
  const lanes=[-W/2+3.2,-W/2+6.2,W/2-3.2,W/2-6.2];lanes.forEach((u,i)=>{U.box(u,.5,1.2,.9,1,1.8,'#34363b',1);U.box(u,1.02,1.2,.96,.05,1.86,'#1c1d20',1);U.box(u,.5,2.4,1.1,1,.9,'#e4e4de',1);U.box(u,1.02,2.4,1.16,.05,.96,'#9aa0a6',1);
    U.box(u,1.27,2.5,.46,.32,.06,'#1f1f22',0);U.box(u,1.07,2.1,.32,.03,.2,'#222',1);U.box(u,1.9,.2,.1,.5,.1,b.bg,3);U.obb(u,1.5,.6,1.25);
    if(i<3)U.cash(u,3.1,true,key,i+1)});
  U.act(-W/2+4.7,.2,1.7,'Pay at the checkout',shPayBasket);U.act(W/2-4.7,.2,1.7,'Pay at the checkout',shPayBasket);
  // things to take
  const goods=opt.goods||['milk','bread','juice','apples','crisps','cheese','chocolate','cola','water','sausage'];
  goods.forEach((g,i)=>{const r=rows[i%rows.length],u=-((W-9)/2)+1.6+Math.floor(i/rows.length)*((W-9)/Math.max(1,Math.ceil(goods.length/rows.length))),v=r-1.35;
    U.act(u,v,1.25,'Take '+g+' · '+WALLET.fmt(PRICE[g]),()=>addItem(g))});
  // hanging aisle numbers
  rows.forEach((v,ri)=>U.plate([String(ri+1)],0,3.4,v,.9,.9,{bg:b.bg,color:b.fg,size:120,w:256,h:256},false))}

// ---------- sports / fashion shop with brand clothes you can buy and wear ----------
function shClothesRack(U,u,v,c,faceIn){const E=U.E,metal='#9aa0a6',hex=n=>'#'+n.toString(16).padStart(6,'0'),colr=hex(c.o.shirt||c.o.jeans||c.o.shoe||0x888888);
  if(c.slot==='top'||c.slot==='bottom'){U.box(u,1.6,v,1.3,.05,.05,metal,6);for(const s of [-.62,.62])U.box(u+s,.8,v,.05,1.6,.05,metal,6);
    for(let i=0;i<5;i++)U.box(u-.5+i*.25,c.slot==='top'?1.22:1.05,v,.05,c.slot==='top'?.7:1.0,.48,colr,0)}
  else{U.box(u,.45,v,1.2,.9,.5,'#efe9dc',5);for(let i=0;i<3;i++)U.box(u-.38+i*.38,.98,v,.3,.16,.42,colr,1)}
  U.obb(u,v,.68,.3);const p=U.P(u,v+(faceIn?-1.1:1.1));E.act(p[0],p[1],1.15,null,()=>WARDROBE.rack(c));const it=INTERACT[INTERACT.length-1];Object.defineProperty(it,'label',{get(){return WARDROBE.label(c)}})}
function shMannequin(U,u,v,col){const c=col||'#d9d4c8';U.box(u,.45,v,.14,.9,.14,c,0);U.box(u+.14,.45,v,.14,.9,.14,c,0);U.box(u+.07,1.2,v,.42,.6,.2,'#f0f0f0',0);U.box(u+.07,1.68,v,.2,.26,.2,c,0);U.box(u+.07,.04,v,.5,.06,.5,'#222',1)}
function shSport(U,key,opt){opt=opt||{};const E=U.E,W=U.W,D=U.D,b=SH_BRANDS[key],ink=key==='adidas'||key==='zara'?'#111':'#fff';
  // logo wall and shoe wall at the back
  U.box(0,2.05,D-.15,W-.8,4.0,.2,key==='adidas'?'#f2f2ee':b.bg,0);U.logo(key,0,3.5,D-.3,Math.min(W-3,10),Math.min(W-3,10)*.25,false,.9);
  for(let l=0;l<3;l++)for(let i=0;i<Math.floor((W-3)/.9);i++){const u=-(W-3)/2+.45+i*.9;U.box(u,.5+l*.62,D-.5,.8,.04,.55,'#fff',0);U.box(u,.66+l*.62,D-.5,.5,.2,.3,['#ff6a00','#f2f2ee','#2a62b8','#111','#d9261c','#2ad1ff'][(i+l*2)%6],0)}
  U.obb(0,D-.4,(W-3)/2,.5);
  // clothes racks along both side walls and central tables
  const items=opt.items||[];let k=0;for(const s of [-1,1])for(let v=4;v<D-3;v+=3.2){const u=s*(W/2-1.6);const c=items[k++%Math.max(1,items.length)];
    if(c)shClothesRack(U,u,v,c,s>0);else{U.box(u,1.6,v,.05,.05,1.3,'#9aa0a6',6);for(let i=0;i<5;i++)U.box(u,1.2,v-.5+i*.25,.48,.7,.05,['#2b2b2e','#f2f2ee','#ff6a00','#2a62b8','#d9261c'][(i+k)%5],0);U.obb(u,v,.3,.7)}}
  for(const u of [-W/4,W/4]){U.box(u,.45,D*.55,2.2,.9,1.2,'#ece6da',5);for(let i=0;i<3;i++)U.box(u-.7+i*.7,1.0,D*.55,.5,.2,.4,['#ff6a00','#2b2b2e','#f2f2ee'][i],0);U.obb(u,D*.55,1.1,.6)}
  shMannequin(U,-W/2+3.2,2.4);shMannequin(U,W/2-3.6,2.4,'#c8b89a');shMannequin(U,.0,D*.85,'#d9d4c8');
  U.box(0,.55,2.2,2.6,1.1,.9,'#1b1b1e',1);U.box(0,1.12,2.2,2.7,.06,1,'#e8e4da',1);U.obb(0,2.2,1.35,.5);if(opt.ped!==false)U.cash(0,3.0,true,key,key.length*5)}

// ---------- small shops: a back wall of goods, a counter, a few things to buy ----------
const SH_SMALL={
  flowers:{items:[['bouquet']],pal:['#e63946','#f4a261','#ffd166','#9b5de5','#f15bb5'],tall:true},pharmacy:{items:[['vitamin C'],['hematogen']],pal:['#ffffff','#5fd38d','#4aa3df','#f2f2ee']},
  phones:{items:[['smartphone'],['headphones'],['power bank']],pal:['#111','#c9ccd2','#2a62b8','#222']},sweets:{items:[['chocolate'],['candy box'],['ice cream']],pal:['#e05a8b','#f2c14e','#6b3a1a','#ffffff','#4aa3df']},
  coffee:{items:[['coffee'],['cappuccino'],['croissant']],pal:['#4a2f1d','#c98a3a','#f6e7cf','#2b1a10']},books:{items:[['book']],pal:['#2b4a7a','#c0392b','#e8c547','#2e7d32','#6a1b9a','#f4efe4']},
  eva:{items:[['perfume'],['lipstick']],pal:['#d63a8c','#f4c2d7','#fff','#7a1fa2','#e63946']},jewel:{items:[['silver ring']],pal:['#f2c14e','#c9ccd2','#fff','#14213d']},optics:{items:[['sunglasses']],pal:['#111','#c0392b','#2a62b8','#e8c547']},
  gifts:{items:[['souvenir'],['teddy bear']],pal:['#8a2be2','#e63946','#f2c14e','#2ad1ff','#fff']},toys:{items:[['teddy bear'],['LEGO set']],pal:['#e63946','#f2c14e','#2a62b8','#3f9a4a','#ff6ad5']},comfy:{items:[['smartphone'],['headphones'],['power bank']],pal:['#111','#c9ccd2','#2d8f3a','#f4f4f0']},
  salon:{items:[],pal:['#222831','#ffd369']}};
const SH_CAT={pharmacy:['pharma','pharma','home','pharma'],phones:['tech'],sweets:['sweets'],coffee:['coffee'],books:['books'],eva:['beauty'],toys:['toys'],comfy:['tech']};   // shops with real packs on the shelves (the rest keep painted blocks)
function shSmall(U,key,opt){opt=opt||{};const E=U.E,W=U.W,D=U.D,b=SH_BRANDS[key]||{bg:'#333'},S=SH_SMALL[key]||{items:[],pal:['#ccc']},pal=S.pal,cat=SH_CAT[key],sd0=key.length*13;
  // back wall shelves
  U.box(0,1.3,D-.15,W-.6,2.6,.2,b.bg,0);
  if(cat)for(let l=0;l<4;l++){const y=.3+l*.5;U.box(0,y-.01,D-.46,W-.9,.03,.34,'#e8e8e4',1);U.row(cat[l%cat.length],-(W-1.2)/2,y+.015,D-.5,1,0,W-1.2,0,-1,sd0+l*5,{gap:.05})}
  else for(let l=0;l<4;l++)for(let i=0;i<Math.floor((W-1.2)/.5);i++){const u=-(W-1.2)/2+.25+i*.5;U.box(u,.5+l*.55,D-.45,.42,.3+((i+l)%3)*.08,.3,pal[(i*2+l)%pal.length],0)}
  U.box(0,.04,D-.45,W-.6,.06,.5,'#444',1);U.obb(0,D-.4,(W-.6)/2,.4);
  // side display tables
  for(const s of [-1,1]){const u=s*(W/2-1.2),tl=Math.min(4,D-4);U.box(u,.45,D*.5,1.1,.9,tl,'#ece6da',5);
    if(cat)for(const du of [-.27,.27])U.row(cat[((s>0?1:0)+(du>0?1:0))%cat.length],u+du,.93,D*.5-tl/2+.05,0,1,tl-.1,-s,0,sd0+(s>0?9:2)+(du>0?4:0),{gap:.05});
    else for(let i=0;i<4;i++)U.box(u,.98,D*.5-1.4+i*.95,.5,.2,.6,pal[(i+(s>0?2:0))%pal.length],0);U.obb(u,D*.5,.6,tl/2)}
  if(S.tall)for(let i=0;i<4;i++)U.box(-1.6+i*1.05,.9,D*.45,.5,1.8,.5,pal[i%pal.length],0);
  if(W>20)for(let v=5.5;v<D-3;v+=3.6){U.box(0,.55,v,W-12,1.1,1.1,'#dadcd8',1);U.obb(0,v,(W-12)/2,.6);
    if(cat)for(const sd of [-1,1])U.row(cat[(sd>0?1:0)%cat.length],-(W-12)/2+.05,1.13,v+sd*.3,1,0,W-12.1,0,sd<0?-1:1,sd0+v*3+sd,{gap:.05});
    else for(let i=0;i<Math.floor((W-12)/.55);i++)for(const sd of [-1,1])U.box(-(W-12)/2+.3+i*.55,1.25,v+sd*.3,.46,.3,.3,pal[(i+(sd>0?2:0))%pal.length],0)}
  // counter with a till, shopkeeper behind
  U.box(0,.55,2.0,2.6,1.1,.9,'#2a2a2e',1);U.box(0,1.12,2.0,2.7,.06,1,'#e8e4da',1);U.box(.6,1.3,2.0,.4,.35,.3,'#1b1b1f',0);U.obb(0,2.0,1.35,.5);
  if(opt.ped!==false)U.cash(0,3.0,true,key,sd0);
  // things to buy at the counter
  (S.items||[]).forEach(([n],i)=>U.act((i-(S.items.length-1)/2)*1.7,.2,1.2,'Buy '+n+' · '+WALLET.fmt(PRICE[n]),()=>shBuy(n,PRICE[n])))}

// ---------- food counters (food court and the burger shops) ----------
const SH_MENU={mcd:[['Big Mac',139],['McNuggets ×6',119],['Fries',59]],kfc:[['Zinger burger',129],['Bucket ×9',299],['Fries',55]],bk:[['Whopper',149],['Chicken Royale',119],['Onion rings',59]],
  shaw:[['Shawarma classic',95],['Doner kebab',110],['Falafel wrap',85]],pizza:[['Margherita',139],['Pepperoni',169],['Calzone',149]],sushi:[['Philadelphia roll',189],['Maki set',159],['Miso soup',69]],
  kebab:[['Lamb kebab',160],['Chicken kebab',130],['Ayran',35]],gelato:[['Gelato ×2',75],['Waffle cone',55],['Milkshake',85]],coffee:[['Latte',65],['Cappuccino',60],['Croissant',50]],
  bakery:[['Eclair',45],['Cinnamon roll',55],['Baguette',40]],tea:[['Bubble tea',95],['Mango tea',80],['Mochi',60]],smoothie:[['Berry smoothie',85],['Green smoothie',90],['Fruit cup',70]]};
function shFood(U,key,opt){opt=opt||{};const E=U.E,W=U.W,D=U.D,b=SH_BRANDS[key],menu=SH_MENU[key]||[];
  U.box(0,2.2,D-.2,W,4.4,.3,'#2b2b2f',0);                                     // kitchen wall
  U.box(0,2.1,D-.4,W-.4,4.0,.1,b.bg,0);
  U.logo(key,0,3.4,D-.52,Math.min(W-.6,8),Math.min(W-.6,8)*.25,false,1);
  U.box(0,.6,D-1.2,W-1.2,1.2,.9,'#8e949a',6);U.obb(0,D-1.2,(W-1.2)/2,.5);          // grills and fridges
  U.box(0,.55,1.4,W-.4,1.1,.9,b.bg,1);U.box(0,1.12,1.4,W-.3,.06,1,'#e8e4da',1);U.obb(0,1.4,(W-.4)/2,.5);     // counter
  for(let i=0;i<3;i++)U.box(-W/2+1.2+i*1.5,1.3,1.35,.5,.35,.4,['#1f1f22','#c9a13a','#d8372a'][i],0);
  // overhead menu board
  U.plate([b.name].concat(menu.map(m=>m[0]+'  ₴'+m[1])),0,3.3,1.9,Math.min(W-.8,6.4),1.8,{w:1024,h:288,sizes:[64,40,40,40],color:'#fff',bg:'rgba(10,10,12,.92)',weight:'800'},false);
  if(opt.ped!==false){U.cash(-W/4,2.8,true,key,key.length*3+1);U.cash(W/4,2.8,true,key,key.length*3+2)}
  menu.forEach(([n,p],i)=>U.act((i-(menu.length-1)/2)*Math.min(2.2,(W-1.6)/Math.max(1,menu.length-1)),-.35,1.25,'Order '+n+' · '+WALLET.fmt(p),()=>shBuy(n,p)))}

// ---------- vertical transport ----------
function shEscalators(E,fl,cfg){ // two lanes along x at z=15.2 (up) / 16.8 (down); the player rides with E at the ends
  const zU=15.2,zD=16.8,metal='#aab0b6',dark='#6a6f77';
  const lane=(z,up)=>{for(let k=0;k<10;k++){const x=-3.6+k*.8,h=up?.22+k*.3:3.1-k*.3+.2;E.box(x,h/2,z,.8,h,1.15,dark,1);E.box(x,h+.01,z,.78,.03,1.1,'#cfd3d8',6);E.box(x,h+.03,z-.55,.78,.03,.05,'#f2c14e',8);E.box(x,h+.03,z+.55,.78,.03,.05,'#f2c14e',8)}
    for(const s of [-1,1]){const zz=z+s*.66;for(let k=0;k<10;k++){const x=-3.6+k*.8,h=(up?.22+k*.3:3.1-k*.3+.2)+.95;E.box(x,h,zz,.8,.05,.06,metal,6);E.box(x,h-.45,zz,.8,.9,.05,'#9ad4e8',2)}}};
  lane(zU,true);lane(zD,false);E.box(0,.2,16,8.8,.4,3.6,'#1f2024',1);E.obb(0,16,4.5,1.9);E.box(0,.02,16,9.4,.02,4.2,'#3a3d42',1);
  if(fl<4)E.plate(['↑ UP'],-5.7,2.4,14.4,Math.PI/2,1.6,.5,{w:512,h:160,size:90,bg:'#1f6fa8'});if(fl>1)E.plate(['↓ DOWN'],5.7,2.4,17.6,-Math.PI/2,1.6,.5,{w:512,h:160,size:80,bg:'#c0392b'});
  const go=(to,at)=>PORTAL.go('mallf',{floor:to,at});
  if(fl<4)E.act(-5.8,15.2,1.5,'Escalator up · floor '+(fl+1)+' · '+SH_MALL.names[fl],()=>go(fl+1,[5.8,15.2,Math.PI/2]));
  if(fl>1)E.act(5.8,16.8,1.5,'Escalator down · floor '+(fl-1)+' · '+SH_MALL.names[fl-2],()=>go(fl-1,[-5.8,16.8,-Math.PI/2]))}
function shLift(E,fl){ // glass lift in the south-west corner
  const x=-9,z=1.9;E.box(x,2.2,z,2.8,4.4,3.0,'#7fb8d8',2);E.box(x,.1,z,3,.2,3.2,'#3a3d42',1);E.box(x,4.5,z,3,.2,3.2,'#3a3d42',1);
  for(const s of [-1.5,1.5])E.box(x+s,2.2,z,.1,4.4,3.2,'#aab0b6',6);E.box(x,2.2,z+1.55,2.8,4.4,.06,'#aab0b6',6);
  E.plate(['LIFT'],x,3.3,z+1.6,0,1.6,.5,{w:512,h:160,size:100,bg:'#1f6fa8'});E.obb(x,z,1.5,1.6);
  E.act(x,z+2.6,1.6,'Call the lift',()=>shLiftUI(fl))}
function shLiftUI(cur){let ui=document.getElementById('mallLiftUI');
  if(!ui){ui=document.createElement('div');ui.id='mallLiftUI';ui.hidden=true;ui.innerHTML='<div class="spkTop"><b>Lift · which floor?</b><button id="mallLiftClose" aria-label="Close">×</button></div><div id="mallLiftBtns"></div><small style="color:var(--muted);font-size:12px;display:block;margin-top:8px"></small>';
    (document.getElementById('liftUI')||document.body).parentNode.appendChild(ui);document.getElementById('mallLiftClose').onclick=()=>{ui.hidden=true}}
  const B=document.getElementById('mallLiftBtns');B.innerHTML='';B.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:8px';
  for(let f=1;f<=SH_MALL.floors;f++){const b=document.createElement('button');b.textContent=f;b.style.cssText='padding:12px 0;font-size:17px;font-weight:700';if(f===cur)b.className='on';
    b.onclick=()=>{ui.hidden=true;if(window.AUD)AUD.beep();if(f!==cur)PORTAL.go('mallf',{floor:f,at:[-9,4.6,0]})};B.appendChild(b)}
  ui.querySelector('small').textContent=SH_MALL.names.map((n,i)=>(i+1)+' · '+n).join('   ');ui.hidden=false}

// ===================================================================================================
// the mall: four floors, each its own interior
// ===================================================================================================
const SH_MALL={W:60,D:34,H:5.2,floors:4,names:['Supermarkets','Fashion & Sport','Electronics & Kids','Food Court'],built:{}};
function shFloorTexture(){return sharedInteriorTexture('mallFloor',()=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');x.fillStyle='#e9e4da';x.fillRect(0,0,256,256);
  x.fillStyle='#d9d3c6';x.fillRect(0,0,128,128);x.fillRect(128,128,128,128);x.strokeStyle='#b9b2a3';x.lineWidth=3;x.strokeRect(1,1,254,254);x.beginPath();x.moveTo(128,0);x.lineTo(128,256);x.moveTo(0,128);x.lineTo(256,128);x.stroke();
  for(let i=0;i<1600;i++){x.fillStyle='rgba(255,255,255,'+(Math.random()*.06)+')';x.fillRect(Math.random()*256,Math.random()*256,2,2)}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,5.5);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t})}

// partition between units along a line, with a gap (the shop opening)
function shPartition(E,xa,za,xb,zb,gapFrom,gapTo){ // gap measured along the wall from its start
  const L=Math.hypot(xb-xa,zb-za),dx=(xb-xa)/L,dz=(zb-za)/L,H=E.H;
  if(gapFrom==null){E.wall(xa,za,xb,zb,H);return}
  if(gapFrom>0)E.wall(xa,za,xa+dx*gapFrom,za+dz*gapFrom,H);if(gapTo<L)E.wall(xa+dx*gapTo,za+dz*gapTo,xb,zb,H)}

function shBuildFloor(fl){
  const idx=9+fl,grp=new THREE.Group();scene.add(grp);const ox=INT_X+800+idx*200,oz=INT_Z,W=SH_MALL.W,D=SH_MALL.D,H=SH_MALL.H,hw=W/2;
  const mats={floor:new THREE.MeshStandardMaterial({map:shFloorTexture(),roughness:.42,metalness:.03}),ceil:new THREE.MeshStandardMaterial({color:0xf6f4ef,roughness:.9}),wall:new THREE.MeshStandardMaterial({color:0xf0ece2,roughness:.85})};
  room(grp,ox,oz,-hw,hw,0,D,H,mats,{surf:'tile'});
  const E=shEnv(grp,ox,oz,H);
  if(fl===1){E.box(0,1.3,.1,6.4,2.6,.1,'#9ad4e8',2);for(const s of [-3.2,0,3.2])E.box(s,1.3,.1,.1,2.7,.14,'#aab0b6',6);E.box(0,2.7,.1,6.5,.1,.14,'#aab0b6',6)}
  // ---- ceiling: light strips over the concourse, skylights, dark ceiling band over the shops ----
  for(const z of [12.5,15.2,17.8,20.5])E.box(0,H-.08,z,56,.06,.5,'#fff8e6',8);
  for(const x of [-18,-9,0,9,18])E.box(x,H-.05,4,.5,.06,6,'#fff8e6',8);
  if(fl===4){E.box(0,H-.04,17,26,.05,14,'#dff0ff',8)}
  // ---- brand tables (what stands where) ----
  const mk=(side,x0,x1,z0,z1,fn,key,o)=>{const U=shUnit(E,side,x0,x1,z0,z1);fn(U,key,o);return U};
  const front=(U,key,o)=>shFront(U,key,o);
  const items=ids=>ids.map(id=>CLOTHES.find(c=>c.id===id)).filter(Boolean);
  // ---- floor plans ----
  if(fl===1){
    // Lidl (west) and Tavria V (east) take the ends of the hall, openings onto the concourse
    for(const [side,key,xa,xb,fx] of [['W','lidl',-30,-12,-12],['E','tavria',12,30,12]]){const U=shUnit(E,side,xa,xb,0,D);shMarket(U,key,{goods:key==='lidl'?['milk','bread','juice','apples','cheese','yogurt','chocolate','water','pizza (frozen)','pasta']:['milk','bread','sausage','crisps','cola','ice cream','coffee beans','cheese','juice','apples']});
      shPartition(E,fx,0,fx,D,10,23);front(shUnit(E,side,xa,xb,10,23),key,{logoW:11});}
    // centre: entrance lobby, flowers, and a row of small shops on the north side
    mk('S',6,12,0,10,shSmall,'flowers');front(shUnit(E,'S',6,12,0,10),'flowers');
    [['pharmacy',-12],['phones',-6],['coffee',0],['sweets',6]].forEach(([k,x])=>{const U=shUnit(E,'N',x,x+6,23,D);shSmall(U,k);shFront(U,k);E.wall(x,23,x,D,H)});
    E.wall(12,23,12,D,H);E.wall(-12,23,-12,D,H);E.wall(6,0,6,10,H);
    // big directory board and fountain in the lobby
    E.plate(['ODESA MALL','1 · Lidl · Tavria V','2 · Nike · Adidas · Zara · H&M','3 · Comfy · Toy Kingdom','4 · Food Court'],0,3.0,9.6,0,6.2,2.6,{w:1024,h:430,sizes:[84,44,44,44,44],bg:'#2a1140',color:'#fff'});
    for(const s of [-2.9,2.9])E.box(s,4.2,9.6,.05,2.0,.05,'#aab0b6',6);
    E.act(0,.8,1.7,'Go outside',()=>PORTAL.exit());
  }else if(fl===2){
    // west: Nike + Zara; east: Adidas + H&M
    const NIKE=items(['nk_hoodie','nk_jersey','nk_pants','nk_airmax']),ADID=items(['ad_jacket','ad_tee','ad_pants','ad_super']);
    for(const [side,xa,xb,fx,list] of [['W',-30,-12,-12,[['nike',0,17,NIKE,10.3,16.8],['zara',17,34,null,17.2,22.7]]],['E',12,30,12,[['adidas',0,17,ADID,10.3,16.8],['hm',17,34,null,17.2,22.7]]]]){
      for(const [key,za,zb,it,oa,ob] of list){const U=shUnit(E,side,xa,xb,za,zb);shSport(U,key,{items:it||[]});shPartition(E,fx,za,fx,zb,oa-za,ob-za);shFront(shUnit(E,side,xa,xb,oa,ob),key,{logoW:ob-oa-1});
        E.wall(xa,zb,xb,zb,H)}}
    // centre-north: the fashion hall (everything you can try on) with a fitting room
    {const U=shUnit(E,'N',-12,12,23,D);shFront(U,'fashion',{logoW:10});E.wall(-12,23,-12,D,H);E.wall(12,23,12,D,H);
      const tops=CLOTHES.filter(c=>c.slot==='top'&&!/^(nk|ad)_/.test(c.id)),bots=CLOTHES.filter(c=>c.slot==='bottom'&&!/^(nk|ad)_/.test(c.id)),shoes=CLOTHES.filter(c=>c.slot==='shoes'&&!/^(nk|ad)_/.test(c.id));
      tops.forEach((c,i)=>shClothesRack(U,-10.4,2.6+i*1.5,c,false));
      bots.forEach((c,i)=>shClothesRack(U,-5.6+i*2.6,D-23-.9,c,false));shoes.forEach((c,i)=>shClothesRack(U,10.4,2.6+i*1.8,c,true));
      U.box(0,1.3,5.2,2.4,2.6,2.4,'#7a1fa2',1);U.box(0,1.2,3.99,1.6,2.3,.04,'#dfe7ec',6);U.obb(0,5.2,1.25,1.25);U.act(0,2.9,1.2,'Fitting room · your own clothes back',()=>WARDROBE.reset());
      U.cash(4,3.5,true,'fashion',4)}
    // centre-south: hair salon, jewelry, sunglasses (lift in the corner)
    {const U=shUnit(E,'S',6,12,0,10);shSmall(U,'salon',{ped:false});shFront(U,'salon');E.wall(6,0,6,10,H);shSalon(E,U)}
    [['jewel',-6],['optics',0]].forEach(([k,x])=>{const U=shUnit(E,'S',x,x+6,0,10);shSmall(U,k);shFront(U,k);E.wall(x,0,x,10,H)});
  }else if(fl===3){
    for(const [side,xa,xb,fx,key] of [['W',-30,-12,-12,'comfy'],['E',12,30,12,'toys']]){const U=shUnit(E,side,xa,xb,0,D);shSmall(U,key);shPartition(E,fx,0,fx,D,10,23);shFront(shUnit(E,side,xa,xb,10,23),key,{logoW:11})}
    [['books',-12],['eva',-6],['jewel',0],['optics',6]].forEach(([k,x])=>{const U=shUnit(E,'N',x,x+6,23,D);shSmall(U,k);shFront(U,k);E.wall(x,23,x,D,H)});E.wall(12,23,12,D,H);E.wall(-12,23,-12,D,H);
    [['gifts',-6],['phones',0],['sweets',6]].forEach(([k,x])=>{const U=shUnit(E,'S',x,x+6,0,10);shSmall(U,k);shFront(U,k);E.wall(x,0,x,10,H)});E.wall(-6,0,-6,10,H);
  }else{
    // food court: counters along the north and south walls, tables in the middle
    let x=-29;for(const [key,w] of [['mcd',10],['kfc',7],['bk',7],['shaw',7],['pizza',7],['sushi',7],['kebab',7],['gelato',7]]){if(x+w>30)break;const U=shUnit(E,'N',x,x+w,28,D);shFood(U,key);shFront(U,key,{logoW:Math.min(w-1.2,9)});E.wall(x,28,x,D,H);x+=w}
    E.wall(x,28,x,D,H);
    x=3;for(const [key,w] of [['coffee',8],['bakery',8],['tea',8]]){const U=shUnit(E,'S',x,x+w,0,6);shFood(U,key);shFront(U,key,{logoW:w-1.5});E.wall(x,0,x,6,H);x+=w}E.wall(x,0,x,6,H);
    E.plate(['FOOD COURT','McDonald\'s · KFC · Burger King · Shawarma · Pizza · Sushi · Kebab'],0,3.6,27.6,Math.PI,9,1.3,{w:1024,h:148,sizes:[64,32],bg:'#1a1a1f',color:'#ffd369'});
    shFoodCourtSeating(E)
  }
  // ---- shared: escalators, lift, planters ----
  shEscalators(E,fl);shLift(E,fl);
  for(const [px,pz] of [[-8,11.2],[8,11.2],[-8,21.8],[8,21.8]]){E.box(px,.35,pz,1.2,.7,1.2,'#8a8f94',1);E.box(px,1.2,pz,.9,1.2,.9,'#2f7a3a',0);E.obb(px,pz,.7,.7)}
  // ---- shoppers ----
  const routes=[[[-26,15],[26,15],[26,18.5],[-26,18.5]],[[26,13],[-26,13],[-26,20],[26,20]],[[-20,12],[20,21],[-20,21],[20,12]]];
  const nPeds=fl===4?4:7;for(let i=0;i<nPeds;i++){const r=routes[i%3],s=r[i%r.length];E.ped(s[0]+i*2,s[1],0,r.slice(i%r.length).concat(r.slice(0,i%r.length)),{basket:fl<3})}
  if(fl===4)for(let i=0;i<10;i++){const p=SH_MALL.seats&&SH_MALL.seats[i*3%SH_MALL.seats.length];if(p)E.ped(p[0],p[1],Math.random()*6.28,null,{pose:'sit'})}
  // ---- finish ----
  E.fin();const pg=E.P.build();if(pg)grp.add(new THREE.Mesh(pg,MATS.props));
  const ls=[];for(const [lx,lz] of [[-24,17],[-12,17],[0,17],[12,17],[24,17],[-20,5],[20,5],[-20,29],[20,29]]){const l=new THREE.PointLight(fl===4?0xfff4e0:0xfff0d8,0,22,1.4);l.position.set(ox+lx,INT_Y+H-.6,oz+lz);l.userData.i=fl===4?.75:.8;grp.add(l);ls.push(l)}
  INDOORS.push({name:'shop',title:'Odesa Mall',sub:'',floor:'tile',exp:.6,lights:ls,test:(x,z)=>x>ox-hw-1&&x<ox+hw+1&&z>oz-1&&z<oz+D+1,ceil:()=>INT_Y+H-.3});
  grp.visible=false;
  const B={grp,spawn:[ox,oz+2.6],spawnYaw:0,title:'Odesa Mall · floor '+fl,sub:SH_MALL.names[fl-1],peds:E.peds,floor:fl,
    onEnter(o){PORTAL.peds=E.peds;if(o&&o.at){B.spawn=[ox+o.at[0],oz+o.at[1]];B.spawnYaw=o.at[2]||0}else{B.spawn=[ox,oz+2.6];B.spawnYaw=0}}};
  return B}

// hair salon corner on floor 2 (kept from the old mall): barber chair, seated client, standing barber, mirror; the clippers buzz nearby
function shSalon(E,U){const p=U.P(0,U.D-2.6),sx=E.ox+p[0],sz=E.oz+p[1],Y=INT_Y,M=(c,r,m)=>new THREE.MeshStandardMaterial({color:new THREE.Color(c).convertSRGBToLinear(),roughness:r,metalness:m||0});
  const g=new THREE.Group();g.position.set(sx,Y,sz);g.rotation.y=U.ry+Math.PI;E.grp.add(g);
  xb(g,.1,.5,.1,0,.25,0,M(0x2a2a2e,.4,.8));xb(g,.7,.12,.7,0,.55,0,M(0x1b1b1f,.6));xb(g,.7,.7,.12,0,.95,-.32,M(0x1b1b1f,.6));
  xloft(g,[[.2,.2,.62,1.12,.08],[-.2,.24,.62,1.2,.1]],M(0x3f6fb5,.8));
  const hd=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),M(0xe9c3a0,.7));hd.position.set(0,1.35,0);g.add(hd);
  const bb=new THREE.Group();bb.position.set(.5,0,.5);g.add(bb);xloft(bb,[[.2,.2,0,1.45,.1],[-.2,.24,0,1.5,.12]],M(0x222226,.8));
  const bh=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),M(0xd9b08a,.7));bh.position.set(0,1.66,0);bb.add(bh);
  const mir=new THREE.Mesh(new THREE.PlaneGeometry(1.4,1.1),M(0xbfd8e8,.05,.9));mir.position.set(-.1,1.6,-1.2);g.add(mir);
  window.MALL_SALON={x:sx,z:sz,floor:2};LOW_OBB.push(sx,sz,.5,.5,1,0)}

// food court: tables with stools in the middle of the hall
function shFoodCourtSeating(E){const seats=[];SH_MALL.seats=seats;const c1='#f2f0ea',c2=['#e63946','#f2c14e','#2a9d8f','#ff8a3d'];let n=0;
  for(const z of [9.2,12.4,19.6,22.8,25.0])for(let i=-5;i<=5;i++){const x=i*5.0;if(z>=13&&z<=19.5&&Math.abs(x)<7)continue;if(z===25.0&&Math.abs(x)>22)continue;
    E.box(x,.74,z,1.2,.06,1.2,c1,1);E.box(x,.37,z,.12,.74,.12,'#8a8f94',6);E.obb(x,z,.7,.7);
    for(const [dx,dz] of [[-.95,0],[.95,0],[0,-.95],[0,.95]]){E.box(x+dx,.22,z+dz,.44,.44,.44,c2[((n+i+2)%4+4)%4],1);seats.push([x+dx,z+dz])}n++}
  // planters and a kids' corner
  for(const x of [-26,26]){E.box(x,.45,17,1.6,.9,1.6,'#8a8f94',1);E.box(x,1.6,17,1.2,1.5,1.2,'#2f7a3a',0);E.obb(x,17,.9,.9)}}

// ===================================================================================================
// exteriors
// ===================================================================================================
function shLotFree(cx,cz,yaw,w,d,m,streetsOnly){const F=lotFrame(cx,cz,yaw);let h0=1e9,h1=-1e9;
  for(let u=-w/2-m;u<=w/2+m+.1;u+=Math.max(3,(w+2*m)/10))for(let v=-d/2-m;v<=d/2+m+.1;v+=Math.max(3,(d+2*m)/8)){const p=F.P(u,v),id=chunkIdAt2(p[0],p[1]);if(id<0)return false;
    if(sdAt(p[0],p[1])<16)return false;if(nearStreet2(id,p[0],p[1],1))return false;if(shBuildingNear(p[0],p[1],1.5))return false;if(insideAny(p[0],p[1],1.5)||blockedStatic(p[0],p[1],1))return false;
    try{if(tramRailNear(p[0],p[1],5))return false}catch(e){}const g=groundH(p[0],p[1]);h0=Math.min(h0,g);h1=Math.max(h1,g)}
  return h1-h0<(streetsOnly||1.4)}
function nearStreet2(id,x,z,extra){const P=D.nodes,wn=D.wn;for(let s=D.segStart[id];s<D.segStart[id+1];s++){const i=D.seg[s],k=D.wOf[i],c=D.wcls[k];if(c>2)continue;const a=wn[i]*2,b=wn[i+1]*2,ax=P[a],az=P[a+1],dx=P[b]-ax,dz=P[b+1]-az,L2=dx*dx+dz*dz;if(L2<.01)continue;
    let t=((x-ax)*dx+(z-az)*dz)/L2;t=t<0?0:t>1?1:t;const ex=ax+dx*t-x,ez=az+dz*t-z,r=HW[c]+SW[c]+extra;if(ex*ex+ez*ez<r*r)return true}return false}
const SH_BP={};
function shBuildingNear(x,z,m){const id=chunkIdAt2(x,z);if(id<0)return true;const i0=id%NCX,j0=Math.floor(id/NCX);
  for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){if(i<0||j<0||i>=NCX||j>=NCZ)continue;const cid=j*NCX+i;let L=SH_BP[cid];
    if(!L){const [x0,z0]=chunkOrigin(cid);L=SH_BP[cid]=[];for(let k=D.bctab[cid];k<D.bctab[cid+1];k++){const rings=bldRings(k,x0,z0),a=rings[0];let mnx=1e9,mxx=-1e9,mnz=1e9,mxz=-1e9;for(let q=0;q<a.length;q+=2){mnx=Math.min(mnx,a[q]);mxx=Math.max(mxx,a[q]);mnz=Math.min(mnz,a[q+1]);mxz=Math.max(mxz,a[q+1])}L.push({rings,mnx,mxx,mnz,mxz})}}
    for(const b of L){if(x<b.mnx-m||x>b.mxx+m||z<b.mnz-m||z>b.mxz+m)continue;if(polyInside(b.rings,x,z))return true;if(m>0&&polyNearest(b.rings,x,z)[0]<m)return true}}
  return false}
// a free lot beside a street near (tx,tz): its front looks at the street
function shFindLot(tx,tz,w,d,rmax){for(let r=0;r<=rmax;r+=10){const n=r?Math.max(8,Math.floor(r/5)):1;for(let i=0;i<n;i++){const a=i/n*6.283,x=tx+Math.cos(a)*r,z=tz+Math.sin(a)*r,id=chunkIdAt2(x,z);if(id<0)continue;
    const rp=nearRoadPt(id,x,z);if(!rp||rp.d<d/2+5||rp.d>d/2+22||rp.c>2)continue;const yaw=Math.atan2(rp.px-x,rp.pz-z);if(shLotFree(x,z,yaw,w,d,2))return {x,z,yaw}}}return null}

// the mall: a glass-and-concrete block on the square by the avenue, with an entrance hall, signs and a car park
function shBuildMall(grp,P,GR,at){const F=lotFrame(at.x,at.z,at.yaw),y0=rawH(at.x,at.z),ry=F.yaw;lotPad(F,66,48,y0);
  groundQuad(GR,[F.P(-33,-24),F.P(33,-24),F.P(33,24),F.P(-33,24)],8,y0+.05,F.yaw);
  const W=60,Dp=34,Hb=20,vc=-4,c=F.P(0,vc),fv=vc+Dp/2;
  const glass=windowRowsTex({bg:'#a9bcc6',rows:4,cols:15,win:'#2a3c48',lit:.4,mx:.04,my:.14,band:'#e8e4da'});
  texBox(grp,c[0],y0,c[1],W,Hb,Dp,ry,glass,W,Hb,new THREE.MeshStandardMaterial({color:0xdcd8cf,roughness:.7}),true);
  addBlock(c[0],c[1],W+2,Dp+2,F.a);addOBB(c[0],c[1],W,Dp,F.a);
  P.box(c[0],y0+Hb+.4,c[1],W+.6,.8,Dp+.6,ry,sRGB('#f4f1ea'),1);                         // roof slab
  // giant roof sign and brand banners on the front
  lotSign(grp,F,['ODESA MALL'],{w:1024,h:200,size:150,color:'#ffffff',bg:'#7a1fa2',weight:'900'},0,y0+Hb+3.2,fv-.4,22,4.3,1.4);
  [['lidl',-22],['nike',-11],['adidas',11],['tavria',22]].forEach(([k,u])=>{const m=shLogoMesh(k,9,2.4,.9),p=F.P(u,fv+.12);m.position.set(p[0],y0+Hb-2.4,p[1]);m.rotation.y=ry;grp.add(m)});
  // entrance hall: a glass box sticking out of the front, with a canopy and the doors
  {const p=F.P(0,fv+3);P.box(p[0],y0+3.4,p[1],14,6.8,6,ry,sRGB('#a7c3d3'),6);P.box(p[0],y0+6.9,p[1],14.6,.4,6.6,ry,sRGB('#7a1fa2'),1);
   for(const u of [-6.6,-2.2,2.2,6.6]){const q=F.P(u,fv+5.9);P.box(q[0],y0+3.4,q[1],.35,6.8,.35,ry,sRGB('#e8e4da'),1)}
   addOBB(p[0],p[1],14,6,F.a)}
  shopDoor(grp,P,lotDoor(F,0,fv+6),y0,{label:'Enter Odesa Mall',interior:'mallf',w:4.6,awn:'#7a1fa2'});
  // cars in the car park, lamps, flags
  let k=0;for(const u of [-26,-22.8,-19.6,-16.4,16.4,19.6,22.8,26]){const q=F.P(u,17.5);if(k++%3===2)continue;PARKED_STATIC.push({x:q[0],y:y0+.05,z:q[1],yaw:ry+Math.PI,type:[0,1,2,5,6,7][k%6],col:CAR_COLS[(k*5)%CAR_COLS.length],pitch:0,roll:0});LOW_OBB.push(q[0],q[1],.9,2.2,Math.cos(ry),-Math.sin(ry))}
  for(const u of [-12,12,-28,28]){const q=F.P(u,fv+4);propGlobeLamp(P,q[0],y0,q[1],ry);EXTRA_LAMPS.push([q[0],y0+3.7,q[1],2.4])}
  for(const u of [-31,31])lotFlag(P,F,u,fv+2,y0);
  PARKED_DIRTY=true;
  shMallBusStop(P,F,fv);
  const pp=F.P(0,fv+14);PLACES.push({id:'mall',name:'Odesa Mall',sub:'4 floors · Lidl, Tavria V, Nike, Adidas, food court',x:pp[0],z:pp[1],yaw:ry+Math.PI,pin:'#ff4fa3',poi:['M','#ff4fa3'],r:150})}

// bus stop right at the mall: a shelter on the pavement of the street the mall front looks at, registered so live buses on that street really stop there
function shMallBusStop(P,F,fv){const dp=F.P(0,fv+6);
  for(let k=14;k<=70;k+=4){const x=dp[0]+F.n[0]*k,z=dp[1]+F.n[1]*k,id=chunkIdAt2(x,z);if(id<0)continue;const q=nearRoadPt(id,x,z);if(!q||q.d>6||q.c>1)continue;
    const want=((dp[0]-q.px)*q.nx+(dp[1]-q.pz)*q.nz)>=0?1:-1,dd=HW[q.c]+SW[q.c]*.55+1.1,tx=q.nz,tz=-q.nx;
    for(const sh of [0,-9,9,-18,18]){                                  // slide along the road when the first spot is taken
      const fx=q.px+q.nx*want*dd+tx*sh,fz=q.pz+q.nz*want*dd+tz*sh;
      if(insideAny(fx,fz,2.2)||blockedStatic(fx,fz,2.2)||shBuildingNear(fx,fz,2.2))continue;
      const ry=roadYaw(id,fx,fz);busShelter(P,fx,groundH(fx,fz),fz,ry,false);addOBB(fx,fz,3.8,1.5,-ry);
      addBusStop(q.px+tx*sh,q.pz+tz*sh,q.nx*want,q.nz*want);
      return true}
    return false}
  return false}

// a standalone brand shop on its own lot; the interior is built the first time you walk in
function shBuildShop(grp,P,GR,spec,at){const F=lotFrame(at.x,at.z,at.yaw),y0=rawH(at.x,at.z),ry=F.yaw,W=spec.W||16,Dp=spec.Dp||11,H=spec.H||5;lotPad(F,W+10,Dp+12,y0);
  groundQuad(GR,[F.P(-(W+8)/2,-(Dp+10)/2),F.P((W+8)/2,-(Dp+10)/2),F.P((W+8)/2,(Dp+10)/2),F.P(-(W+8)/2,(Dp+10)/2)],4,y0+.05);
  const vc=-1.5,c=F.P(0,vc),fv=vc+Dp/2,b=SH_BRANDS[spec.brand]||{bg:'#444',fg:'#fff'};
  P.box(c[0],y0+H/2,c[1],W,H,Dp,ry,sRGB(spec.wall||'#f2f2ee'),0);P.box(c[0],y0+H+.25,c[1],W+.4,.5,Dp+.4,ry,sRGB(b.bg),1);
  {const f=F.P(-W*.12,fv+.03);P.box(f[0],y0+1.7,f[1],W*.5,2.4,.06,ry,sRGB('#18222a'),2)}
  addBlock(c[0],c[1],W+1,Dp+1,F.a);addOBB(c[0],c[1],W,Dp,F.a);
  lotSign(grp,F,[b.name],{w:1024,h:200,size:140,color:b.fg,bg:b.bg,weight:'900'},0,y0+H-.8,fv+.12,Math.min(W-1.5,10),Math.min(W-1.5,10)*.2,1.2);
  const lg=shLogoMesh(spec.brand,Math.min(W-2,9),Math.min(W-2,9)*.25,1),lp=F.P(0,fv+.14);lg.position.set(lp[0],y0+H+1.3,lp[1]);lg.rotation.y=ry;grp.add(lg);
  shopDoor(grp,P,lotDoor(F,W/2-2.4,fv),y0,{label:'Enter '+spec.title,interior:spec.key,w:2.0,awn:b.bg});
  {const s=F.P(0,fv+.12);EXTRA_LAMPS.push([s[0]+F.n[0]*2.5,y0+3,s[1]+F.n[1]*2.5,1.6])}
  for(const u of [-W/2+2,W/2-2]){const q=F.P(u,fv+4);propGlobeLamp(P,q[0],y0,q[1],ry)}
  const pp=F.P(0,fv+6);PLACES.push({id:spec.key,name:spec.title,sub:spec.sub,x:pp[0],z:pp[1],yaw:ry+Math.PI,poi:spec.poi});
  INTERIORS[spec.key]=()=>shBrandInterior(spec)}
function shBrandInterior(spec){let E2=null,B=null;
  const o=Object.assign({w:20,d:14,h:3.6,floor:0xe4e0d6,fr:.3,wall:0xf0ece2,ceil:0xf6f4ef,title:spec.title,sub:spec.sub,lights:[3.5,9],lcol:0xfff4e0,li:2},spec.room||{});
  B=simpleInterior(spec.key,spec.idx,Object.assign(o,{furnish(P,grp,ox,oz,hw,D){E2=shEnv(grp,ox,oz,o.h,P);       // draw into the interior's own prop builder
      const U=shUnit(E2,'N',-hw,hw,0,D);spec.fill(U,E2);U.act(0,.3,1.7,'Go outside',()=>PORTAL.exit());E2.fin();
      return E2}}));
  B.onEnter=()=>{PORTAL.peds=E2?E2.peds:[]};return B}

// ===================================================================================================
// install: called from buildAllLandmarks in place of the old Żabka / dealer / mall steps
// ===================================================================================================
function installShops(grp,G,P,Sg,GR){
  Object.assign(PRICE,SH_PRICES);
  // brand clothes for the Nike and Adidas shops
  for(const c of [{id:'nk_hoodie',slot:'top',name:'Nike Tech hoodie',price:2600,o:{shirt:0x24262b,tee1:'#f4f4f0',tee2:'#ff6a00'}},{id:'nk_jersey',slot:'top',name:'Nike football jersey',price:1900,o:{shirt:0xff7a00,tee1:'#111111',tee2:'#ff7a00'}},
    {id:'nk_pants',slot:'bottom',name:'Nike joggers',price:1700,o:{jeans:0x15161a,cuff:0x34353a}},{id:'nk_airmax',slot:'shoes',name:'Nike Air Max',price:3800,o:{shoe:0xf6f6f2,sole:0xff3b30}},
    {id:'ad_jacket',slot:'top',name:'Adidas track jacket',price:2300,o:{shirt:0x1b3b8b,tee1:'#ffffff',tee2:'#ffffff'}},{id:'ad_tee',slot:'top',name:'Adidas 3-stripe tee',price:1100,o:{shirt:0xf4f4f0,tee1:'#111111',tee2:'#f4f4f0'}},
    {id:'ad_pants',slot:'bottom',name:'Adidas track pants',price:1600,o:{jeans:0x111214,cuff:0xffffff}},{id:'ad_super',slot:'shoes',name:'Adidas Superstar',price:3200,o:{shoe:0xfafafa,sole:0x111111}}])
    if(!CLOTHES.some(x=>x.id===c.id))CLOTHES.push(c);
  // mall floors are separate interiors keyed by floor
  const ck=PORTAL.cacheKey;PORTAL.cacheKey=function(name,opt){if(name==='mallf')return 'mallf:'+Math.max(1,Math.min(SH_MALL.floors,Math.floor(Number(opt&&opt.floor)||1)));return ck.call(this,name,opt)};
  INTERIORS.mallf=opt=>{const fl=Math.max(1,Math.min(SH_MALL.floors,Math.floor(Number(opt&&opt.floor)||1)));return SH_MALL.built[fl]||(SH_MALL.built[fl]=shBuildFloor(fl))};
  // 1. the mall: first the lot on the square in the centre, otherwise the nearest free one
  {let at={x:121,z:-10631,yaw:1.48};if(!shLotFree(at.x,at.z,at.yaw,64,46,3)){const [cx,cz]=[480,-10650];at=shFindLot(cx,cz,64,46,900)||at}shBuildMall(grp,P,GR,at)}
  // 2. brand shops over the map (and Żabka + Polmozbyt, moved away from the home yard)
  const geo=(la,lo)=>geo2xz(la,lo);
  const spots=[
    {brand:'lidl',key:'shop_lidl1',idx:14,title:'Lidl',sub:'supermarket · Cheryomushky',at:geo(46.443,30.726),size:[40,30],W:24,Dp:14,H:5,poi:['L','#0050aa'],fill:(U,E)=>{shMarket(U,'lidl',{cross:8})},room:{w:24,d:16,h:4}},
    {brand:'lidl',key:'shop_lidl2',idx:15,title:'Lidl',sub:'supermarket · Peresyp',at:geo(46.516,30.724),size:[40,30],W:24,Dp:14,H:5,poi:['L','#0050aa'],fill:(U,E)=>{shMarket(U,'lidl',{cross:8})},room:{w:24,d:16,h:4}},
    {brand:'nike',key:'shop_nike',idx:16,title:'Nike',sub:'sneakers and sportswear · Moldavanka',at:geo(46.468,30.712),size:[30,24],W:16,Dp:11,H:5,poi:['N','#111111'],fill:(U,E)=>{shSport(U,'nike',{items:[CLOTHES.find(c=>c.id==='nk_hoodie'),CLOTHES.find(c=>c.id==='nk_jersey'),CLOTHES.find(c=>c.id==='nk_pants'),CLOTHES.find(c=>c.id==='nk_airmax')].filter(Boolean)})},room:{w:16,d:12,h:3.8,floor:0xe9e7e2}},
    {brand:'adidas',key:'shop_adidas',idx:17,title:'Adidas',sub:'three stripes · French Boulevard',at:geo(46.452,30.752),size:[30,24],W:16,Dp:11,H:5,poi:['A','#1f1f1f'],fill:(U,E)=>{shSport(U,'adidas',{items:[CLOTHES.find(c=>c.id==='ad_jacket'),CLOTHES.find(c=>c.id==='ad_tee'),CLOTHES.find(c=>c.id==='ad_pants'),CLOTHES.find(c=>c.id==='ad_super')].filter(Boolean)})},room:{w:16,d:12,h:3.8,floor:0xe9e7e2}},
    {brand:'mcd',key:'shop_mcd',idx:18,title:"McDonald's",sub:'burgers by the beach · Arkadia',at:geo(46.428,30.757),size:[32,26],W:18,Dp:12,H:5,poi:['M','#da291c'],wall:'#f6e4b0',fill:(U,E)=>{shFood(shUnit(E,'N',U.x0,U.x1,U.D-5,U.D),'mcd');shBurgerSeating(U)},room:{w:18,d:14,h:3.6,floor:0xd9d2c4}},
    {brand:'shaw',key:'shop_shaw',idx:19,title:'Shawarma bar',sub:'shawarma and kebab · Slobidka',at:geo(46.481,30.69),size:[24,20],W:10,Dp:8,H:4.2,poi:['Ш','#2e6b2e'],fill:(U,E)=>{shFood(shUnit(E,'N',U.x0,U.x1,U.D-4,U.D),'shaw')},room:{w:10,d:8,h:3.2,floor:0xd9d2c4}}
  ];
  const lotFor=(s,fallbacks)=>shFindLot(s.at[0],s.at[1],s.size[0],s.size[1],900);
  for(const s of spots){const at=lotFor(s);if(at)shBuildShop(grp,P,GR,s,at);else console.warn('no lot found for',s.key)}
  // Żabka and the car dealer: same shops as before, new addresses
  {const z=shFindLot(...geo(46.553,30.746),24,20,900);buildZabka(grp,P,GR,z||undefined);
   const d=shFindLot(...geo(46.575,30.72),48,36,900);buildDealer(grp,P,GR,d||undefined)}
}
// seating inside the burger shop
function shBurgerSeating(U){for(const u of [-5.5,0,5.5]){const v=U.D*.4;U.box(u,.74,v,1.1,.06,1.1,'#f2f0ea',1);U.box(u,.37,v,.12,.74,.12,'#8a8f94',6);U.obb(u,v,.65,.65);for(const [du,dv] of [[-.85,0],[.85,0]])U.box(u+du,.22,v+dv,.44,.44,.44,'#da291c',1)}}
