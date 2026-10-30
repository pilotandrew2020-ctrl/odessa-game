// creator.js — GTA-style character creator.
//  1. option tables + a compact code (17 small ints) that is saved, sent to co-op friends and turned into makePlayer() options
//  2. CHP: extra avatar parts (hair styles, hats, glasses, beard, neckwear, backpack) that makePlayer() attaches
//  3. CREATOR: the full-screen 3D window that Play / Character open, rendered with the game's own renderer
const CH_SKIN=['#fbe3d0','#f6d2b6','#f2c9a6','#e6b088','#cf9a6b','#b27a4c','#8f5a38','#6c3f27','#4a2b1d','#33201a'];
const CH_HAIR=[['Blond',0xe6c477,0xf3dc9c,'#b88a3e'],['Honey',0xc8964a,0xdcb06a,'#8a5a22'],['Chestnut',0x7a4a2a,0x95603a,'#4a2a14'],['Brown',0x4a2e1c,0x62402a,'#2a1a10'],
  ['Black',0x161616,0x2a2a2a,'#161616'],['Ginger',0xa0522d,0xc0703a,'#8a4422'],['Red',0xa02a22,0xc84a3a,'#7a1c16'],['Grey',0x9a9a9e,0xb8b8bc,'#6a6a6e'],
  ['White',0xe8e8e8,0xffffff,'#b8b8b8'],['Pink',0xe86aa8,0xf3a0c8,'#b8447e'],['Blue',0x2f6fd8,0x5a94ee,'#1e4a9a'],['Violet',0x7a3ad8,0xa070f0,'#5222a0']];
const CH_EYE=[['Blue','#3b7fd4'],['Green','#4a8a3c'],['Hazel','#8a6a2a'],['Brown','#6b4a2a'],['Grey','#7d8a94'],['Dark','#2a1a12']];
const CH_CLOTH=[['Sand',0xd9c9a3],['White',0xf3f1ec],['Black',0x1d1d20],['Grey',0x7d8088],['Navy',0x23386b],['Sky',0x6fa0d4],['Red',0xc23a35],['Burgundy',0x7a1f2b],
  ['Orange',0xe88a2a],['Yellow',0xe8c93a],['Green',0x3f7a3a],['Olive',0x6a6a3a],['Teal',0x1f8a8a],['Pink',0xe86aa8],['Purple',0x7a4ab8],['Brown',0x6a4630]];
const CH_JEANS=[['Blue denim',0x7ea3cc,0xb9d0e8],['Dark denim',0x2f4468,0x4a6088],['Black',0x222226,0x34343a],['Grey',0x8a8c90,0xa8aaae],['Beige',0xc9b48a,0xd9c69e],
  ['Khaki',0x7a7a48,0x9a9a60],['Red',0xb02a2a,0xf2f2f2],['White',0xe8e6e0,0xffffff],['Navy',0x23386b,0x3a5090],['Brown',0x6a4630,0x8a6448]];
const CH_SHOE=[['White',0xf6f6f2,0xf08a24],['Black',0x1c1c1e,0xeeeeee],['Red',0xc23a35,0xf6f6f2],['Blue',0x2a6fd8,0xf6f6f2],['Neon',0x2ad1ff,0xff3aa0],['Brown',0x6a4630,0x2a1a10],
  ['Grey',0x9a9ca0,0xf6f6f2],['Yellow',0xe8c93a,0x222222]];
const CH_TOPS=['T-shirt','Striped tee','Overshirt','Hoodie','Jacket','Tank top'],CH_TS_ID=['tee','sailor','over','hood','jacket','tank'];
const CH_BOTS=['Jeans','Shorts','Skirt','Joggers'],CH_BS_ID=['jeans','shorts','skirt','jogger'];
const CH_SHOES=['Sneakers','Boots','Chunky'],CH_SS_ID=['sneaker','boot','chunky'];
const CH_HAIRS=['Swept','Short','Buzz cut','Long','Bun','Ponytail','Mohawk','Curly','Bald'],CH_HS_ID=['swept','short','buzz','long','bun','pony','mohawk','curly','bald'];
const CH_GLASS=['None','Shades up','Sunglasses','Round','Square','Neon shield'],CH_GL_ID=['none','up','sun','round','square','neon'];
const CH_HATS=['None','Cap','Beanie','Bucket hat','Headphones'],CH_HT_ID=['none','cap','beanie','bucket','phones'];
const CH_NECK=['None','Scarf','Chain','Bow tie'],CH_NK_ID=['none','scarf','chain','bow'];
const CH_BACK=['None','Crossbody bag','Backpack'],CH_BK_ID=['none','bag','pack'];
const CH_BEARD=['Clean','Stubble','Moustache','Beard'],CH_BD_ID=['none','stubble','mous','beard'];
// code: [skin, eyes, beard, hairStyle, hairColour, top, topColour, bottom, bottomColour, shoes, shoeColour, glasses, hat, accessoryColour, neck, back, can]
const CHAR={def:[2,0,0, 0,0, 2,0, 0,0, 0,0, 1, 0,2, 0,1,1, 0],max:[10,6,4,9,12,6,16,4,10,3,8,6,5,16,4,3,2, 2],cur:null,   // [17] = body: 0 realistic (real.js), 1 classic
  clean(a){const o=[];for(let i=0;i<this.def.length;i++){const v=Array.isArray(a)&&a[i]!==undefined?(a[i]|0):this.def[i];o.push(v>=0&&v<this.max[i]?v:this.def[i])}return o},
  load(){let a=null;try{a=JSON.parse(localStorage.getItem('od_char')||'null')}catch(e){}
    const SHARP=[3,3,1,1,3,4,2,0,1,0,1,1,0,2,2,0,0];     // the short-lived "sharp guy" default: anyone who saved it goes back to the blond with blue eyes
    if(Array.isArray(a)&&SHARP.every((v,i)=>a[i]===v))a=null;
    this.cur=this.clean(a);return this.cur},
  save(){try{localStorage.setItem('od_char',JSON.stringify(this.cur))}catch(e){}},
  // the code → makePlayer() options
  opts(a){const own=!a||a===this.cur;a=this.clean(a||this.cur);const H=CH_HAIR[a[4]],J=CH_JEANS[a[8]],S=CH_SHOE[a[10]],C=CH_CLOTH[a[6]],ts=CH_TS_ID[a[5]];
    const o={skin:CH_SKIN[a[0]],iris:CH_EYE[a[1]][1],bd:CH_BD_ID[a[2]],hs:CH_HS_ID[a[3]],hair:H[1],hair2:H[2],brow:H[3],ts,bs:CH_BS_ID[a[7]],jeans:J[1],cuff:J[2],
      ss:CH_SS_ID[a[9]],shoe:S[1],sole:S[2],gl:CH_GL_ID[a[11]],ht:CH_HT_ID[a[12]],ac:CH_CLOTH[a[13]][1],nk:CH_NK_ID[a[14]],bk:CH_BK_ID[a[15]],cn:!!a[16],real:own&&a[17]===0};
    if(ts==='sailor'){o.shirt=0xf3f1ec;o.tee1='#f4f4f0';o.tee2='#'+C[1].toString(16).padStart(6,'0')}
    else{o.shirt=C[1];if(ts==='over'){o.tee1='#f4f4f0';o.tee2='#1d2f6a'}}
    return o},
  random(){const r=n=>Math.floor(Math.random()*n),p=(n,z)=>Math.random()<z?0:1+r(n-1);
    return [r(10),r(6),p(4,.65),r(9),r(12),r(6),r(16),r(4),r(10),r(3),r(8),p(6,.4),p(5,.6),r(16),p(4,.7),p(3,.5),r(2)]}};
CHAR.load();

// ---------------------------------------------------------------- extra avatar parts
const CHP={
  mat(h,r,m,x){const M=new THREE.MeshStandardMaterial(Object.assign({color:h,roughness:r===undefined?.8:r,metalness:m||0},x||{}));M.color.convertSRGBToLinear();return M},
  shade(h,k){return (Math.round(Math.min(255,((h>>16)&255)*k))<<16)|(Math.round(Math.min(255,((h>>8)&255)*k))<<8)|Math.round(Math.min(255,(h&255)*k))},
  add(par,geo,mat,x,y,z,rx,ry,rz){const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.rotation.set(rx||0,ry||0,rz||0);par.add(m);return m},
  hair(head,o,M,HR,HH){if(typeof bdHair==='function')return bdHair(head,o,M,HR,HH);     // body.js: skull-fitting hair with a hairline; the blocky version below is the fallback
    const st=o.hs||'swept';if(st==='bald')return;const hatOn=o.ht==='cap'||o.ht==='beanie'||o.ht==='bucket';   // under a hat only the hair that hangs out of it is drawn
    const cap=(rad,sy,dy)=>{if(hatOn)return;const g=new THREE.SphereGeometry(HR*rad,24,12,0,Math.PI*2,0,Math.PI*.5);g.scale(1,sy,1.02);g.translate(0,HH*dy,-.006);head.add(new THREE.Mesh(g,M.hair))};
    const back=(h,yc,rad)=>{rad=rad||1.07;const g=new THREE.CylinderGeometry(HR*rad,HR*(rad-.03),HH*h,22,1,true,Math.PI*.62,Math.PI*.76);g.translate(0,HH*yc,0);head.add(new THREE.Mesh(g,M.hair))};
    const sides=()=>{if(hatOn)return;for(const s of [-1,1]){const sb=new THREE.Mesh(rbox(.03,.09,.06,.012,2),M.hair);sb.position.set(s*HR*1.0,HH*.62,-.01);head.add(sb)}};
    const fringe=l=>{if(hatOn)return;for(const [x,y,z,a,b,c,rz] of l){const g=new THREE.SphereGeometry(1,12,8);g.scale(a,b,c);const m=new THREE.Mesh(g,x>.05?M.hair2:M.hair);m.position.set(x,HH*y,z);m.rotation.z=rz;head.add(m)}};
    const sfr=[[-.05,.87,.12,.06,.04,.045,.3],[.03,.9,.125,.07,.04,.05,0],[.075,.85,.115,.05,.035,.045,-.3]];
    if(st==='swept'){cap(1.08,.62,.74);back(.56,.48);sides();fringe([[-.075,.86,.118,.075,.045,.055,.4],[.0,.9,.128,.08,.05,.055,.2],[.07,.86,.122,.07,.045,.05,-.1],[.115,.8,.1,.045,.04,.045,-.5],[-.03,.95,.1,.1,.05,.07,.3]])}
    else if(st==='short'){cap(1.08,.62,.74);back(.5,.5);sides();fringe(sfr)}
    else if(st==='buzz'){cap(1.03,.66,.745);back(.4,.56,1.03)}
    else if(st==='long'){cap(1.08,.66,.74);back(.56,.48);sides();fringe(sfr);
      CHP.add(head,rbox(.35,.44,.07,.035),M.hair,0,.02,-.135);for(const s of [-1,1])CHP.add(head,rbox(.045,.36,.11,.02),M.hair,s*HR*1.02,.06,-.03)}
    else if(st==='bun'){cap(1.08,.62,.74);back(.5,.5);sides();fringe(sfr);if(!hatOn)CHP.add(head,new THREE.SphereGeometry(.068,14,10),M.hair,0,HH*1.03,-.075)}
    else if(st==='pony'){cap(1.08,.62,.74);back(.5,.5);sides();fringe(sfr);CHP.add(head,new THREE.SphereGeometry(.03,10,8),M.hair2,0,HH*.62,-.172);CHP.add(head,rbox(.07,.27,.07,.03),M.hair,0,HH*.62-.15,-.19,.1)}
    else if(st==='mohawk'){if(!hatOn)for(let i=0;i<7;i++){const t=i/6,g=new THREE.SphereGeometry(1,10,8);g.scale(.032,.07,.06);CHP.add(head,g,i%2?M.hair2:M.hair,0,HH*.97+Math.sin(t*Math.PI)*HH*.1,.13-.27*t)}}
    else if(st==='curly'){cap(1.1,.7,.74);if(!hatOn)for(let i=0;i<18;i++){const t=i/17,a=i*2.399,rr=HR*(1.12-t*.55),x=Math.sin(a)*rr,z=Math.cos(a)*rr-.01,y=HH*(.62+.4*t);if(z>HR*.55&&y<HH*.82)continue;
      const g=new THREE.SphereGeometry(.052+.012*((i*7)%3),10,8);CHP.add(head,g,i%3?M.hair:M.hair2,x,y,z)}}},
  beard(head,o,M,HR,HH){const b=o.bd||'none';if(b==='none')return;
    if(b==='stubble'){const g=new THREE.CylinderGeometry(HR*1.012,HR*1.01,HH*.32,20,1,true,-Math.PI*.58,Math.PI*1.16);g.translate(0,HH*.19,0);
      CHP.add(head,g,CHP.mat(CHP.shade(o.hair||0x2a1a10,.5),.9,0,{transparent:true,opacity:.3,depthWrite:false}),0,0,0);return}
    if(b==='beard'){const cyl=(t0,len,h,yc)=>{const g=new THREE.CylinderGeometry(HR*1.04,HR*1.03,HH*h,18,1,true,t0,len);g.translate(0,HH*yc,0);head.add(new THREE.Mesh(g,M.hair))};
      cyl(-Math.PI*.64,Math.PI*1.28,.19,.095);cyl(Math.PI*.33,Math.PI*.31,.5,.22);cyl(-Math.PI*.64,Math.PI*.31,.5,.22)}   // jaw + sideburns, the mouth stays free
    for(const s of [-1,1]){const g=new THREE.SphereGeometry(1,10,8);g.scale(.036,.012,.02);CHP.add(head,g,M.hair,s*.024,HH*.322,HR*.985,0,0,-s*.28)}},
  glasses(head,o,M,HR,HH){const g=o.gl===undefined?'up':o.gl;if(g==='none')return;const hat=o.ht&&o.ht!=='none'&&o.ht!=='phones';
    if(g==='up'){if(hat)return;
      const gl=new THREE.Group();gl.position.set(0,HH*1.03,.07);gl.rotation.x=-.5;head.add(gl);
      for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),M.glass);l.scale.set(.042,.03,.012);l.position.x=s*.05;gl.add(l)}
      gl.add(new THREE.Mesh(new THREE.BoxGeometry(.04,.008,.008),M.glass));
      for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(.006,.006,.14),M.glass);arm.position.set(s*.09,0,-.07);gl.add(arm)}return}
    const ey=HH*.5,fz=HR*.985,frame=g==='round'?CHP.mat(0xcaa24a,.35,.8):CHP.mat(0x15151a,.5,.2),
      lens=g==='sun'?M.glass:CHP.mat(g==='square'?0x9fd0ff:0xbfe3ff,.1,.1,{transparent:true,opacity:.22,depthWrite:false});
    const arms=()=>{for(const s of [-1,1])CHP.add(head,new THREE.BoxGeometry(.006,.006,.165),g==='sun'||g==='neon'?M.glass:frame,s*.13,ey+.012,.058,0,-s*.245,0)};
    if(g==='sun'){for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),lens);l.scale.set(.056,.037,.014);l.position.set(s*.056,ey,fz);head.add(l)}
      CHP.add(head,new THREE.BoxGeometry(.034,.008,.01),M.glass,0,ey+.012,fz+.004);arms()}
    else if(g==='round'){for(const s of [-1,1]){CHP.add(head,new THREE.TorusGeometry(.037,.0046,6,22),frame,s*.056,ey,fz);CHP.add(head,new THREE.CircleGeometry(.034,18),lens,s*.056,ey,fz)}
      CHP.add(head,new THREE.BoxGeometry(.03,.005,.006),frame,0,ey+.012,fz+.004);arms()}
    else if(g==='square'){for(const s of [-1,1]){const x=s*.056;
      CHP.add(head,new THREE.BoxGeometry(.094,.006,.007),frame,x,ey+.03,fz);CHP.add(head,new THREE.BoxGeometry(.094,.006,.007),frame,x,ey-.03,fz);
      CHP.add(head,new THREE.BoxGeometry(.006,.066,.007),frame,x-.047,ey,fz);CHP.add(head,new THREE.BoxGeometry(.006,.066,.007),frame,x+.047,ey,fz);
      CHP.add(head,new THREE.PlaneGeometry(.088,.058),lens,x,ey,fz)}
      CHP.add(head,new THREE.BoxGeometry(.026,.006,.007),frame,0,ey+.014,fz);arms()}
    else if(g==='neon'){const sh=new THREE.CylinderGeometry(HR*1.03,HR*1.03,.062,22,1,true,-Math.PI*.36,Math.PI*.72);
      const m=CHP.mat(0xff3aa0,.15,.5,{transparent:true,opacity:.62,emissive:0xff3aa0,emissiveIntensity:.35,side:THREE.DoubleSide,depthWrite:false});CHP.add(head,sh,m,0,ey,0);arms()}},
  hat(head,o,HR,HH){const t=o.ht;if(!t||t==='none')return;const C=o.ac===undefined?0x1d1d20:o.ac,m=CHP.mat(C,.75),m2=CHP.mat(CHP.shade(C,.68),.8);
    if(t==='cap'){const d=new THREE.SphereGeometry(HR*1.14,24,12,0,Math.PI*2,0,Math.PI*.5);d.scale(1,.72,1.06);d.translate(0,HH*.7,.004);head.add(new THREE.Mesh(d,m));
      const v=new THREE.CylinderGeometry(HR*1.02,HR*1.02,.012,18,1,false,-Math.PI*.5,Math.PI);v.scale(1,1,1.5);CHP.add(head,v,m2,0,HH*.7,0,.16);
      CHP.add(head,new THREE.SphereGeometry(.012,8,6),m2,0,HH*.7+HR*1.14*.72,0)}
    else if(t==='beanie'){const d=new THREE.SphereGeometry(HR*1.15,24,14,0,Math.PI*2,0,Math.PI*.5);d.scale(1,.9,1.04);d.translate(0,HH*.7,0);head.add(new THREE.Mesh(d,m));
      CHP.add(head,new THREE.TorusGeometry(HR*1.13,.024,8,26),m2,0,HH*.7,0,Math.PI/2);CHP.add(head,new THREE.SphereGeometry(.036,10,8),m2,0,HH*.7+HR*1.15*.9+.012,0)}
    else if(t==='bucket'){CHP.add(head,new THREE.CylinderGeometry(HR*1.08,HR*1.18,.1,22),m,0,HH*.7+.05,0);CHP.add(head,new THREE.CylinderGeometry(HR*1.22,HR*1.78,.03,26),m2,0,HH*.7-.005,0)}
    else if(t==='phones'){CHP.add(head,new THREE.TorusGeometry(HR*1.13,.014,8,28,Math.PI),m,0,HH*.5,0);
      for(const s of [-1,1]){CHP.add(head,new THREE.CylinderGeometry(.052,.052,.04,16),m,s*(HR*1.13+.014),HH*.5,0,0,0,Math.PI/2);CHP.add(head,new THREE.CylinderGeometry(.04,.04,.012,14),m2,s*(HR*1.13+.036),HH*.5,0,0,0,Math.PI/2)}}},
  neck(spine,o){const n=o.nk;if(!n||n==='none')return;const C=o.ac===undefined?0xc23a35:o.ac;
    if(n==='scarf'){const m=CHP.mat(C,.9);CHP.add(spine,new THREE.TorusGeometry(.085,.034,8,18),m,0,.462,0,Math.PI/2);CHP.add(spine,rbox(.075,.22,.03,.012),CHP.mat(CHP.shade(C,.82),.9),.055,.35,.134,0,0,.12)}
    else if(n==='chain'){const gold=CHP.mat(0xd8b24a,.25,.9);CHP.add(spine,new THREE.TorusGeometry(.092,.0075,6,22,Math.PI),gold,0,.462,.13,0,0,Math.PI);CHP.add(spine,new THREE.SphereGeometry(.018,10,8),gold,0,.368,.134)}
    else if(n==='bow'){const m=CHP.mat(C,.7);for(const s of [-1,1])CHP.add(spine,new THREE.ConeGeometry(.04,.06,8),m,s*.037,.455,.128,0,0,-s*Math.PI/2);CHP.add(spine,new THREE.SphereGeometry(.014,8,6),m,0,.455,.13)}},
  // shoulder strap: a flat webbing ribbon through points measured on the avatar (spine space, x>0 side, mirrored for s=-1): bag top -> over the shoulder -> down the chest -> under the arm -> bag bottom
  strapGeo(real,s){
    const P=[[.085,.405,-.152,0,0,-1],[.088,.46,-.144,0,.2,-1],[.092,.50,-.121,0,.55,-.8],[.096,.545,-.078,0,.85,-.5],[.102,.575,-.028,0,1,-.05],[.102,.552,.03,0,.9,.4],
      [.102,.527,.06,0,.75,.65],[.102,.487,.093,0,.5,.85],[.102,.447,.115,0,.35,.94],[.102,.402,.136,0,.25,.97],[.102,.352,.15,0,.15,1],[.107,.302,.16,0,.08,1],
      [.123,.262,.152,.3,0,.95],[.152,.232,.115,.8,0,.6],[.167,.207,.05,1,0,.1],[.162,.187,-.03,1,0,-.2],[.142,.167,-.088,.7,0,-.7],[.107,.147,-.135,.2,0,-1],[.088,.142,-.152,0,0,-1]];
    const kx=real?1:.95,ky=real?1:.8,kz=real?1:.8,dz=real?0:.02;
    const V=P.map(p=>new THREE.Vector3(p[0]*kx*s,p[1]*ky,p[2]*kz+(p[2]<-.1?dz:0)));
    const Nn=P.map(p=>new THREE.Vector3(p[3]*s,p[4],p[5]).normalize());
    const cv=new THREE.CatmullRomCurve3(V,false,'centripetal'),n=70,hw=.021,th=.009,pos=[],idx=[];
    for(let i=0;i<=n;i++){const t=i/n,c=cv.getPoint(t),T=cv.getTangent(t);const f=t*(P.length-1),a=Math.min(P.length-2,Math.floor(f)),b=f-a;
      const N=Nn[a].clone().lerp(Nn[a+1],b).normalize();const W=new THREE.Vector3().crossVectors(T,N).normalize();const N2=new THREE.Vector3().crossVectors(W,T).normalize();
      const off=N2.clone().multiplyScalar(.004);   // rests 4 mm above the skin / shirt
      for(const [u,v] of [[-1,0],[-1,1],[1,1],[1,0]])pos.push(c.x+off.x+W.x*hw*u+N2.x*th*v,c.y+off.y+W.y*hw*u+N2.y*th*v,c.z+off.z+W.z*hw*u+N2.z*th*v)}
    for(let i=0;i<n;i++){const q=i*4;for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]]){idx.push(q+a,q+b,q+4+a,q+b,q+4+b,q+4+a)}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g},
  back(spine,o,M){const b=o.bk===undefined?'bag':o.bk;if(b==='none')return;
    if(b==='bag'){if(typeof bdBand==='function'){spine.add(new THREE.Mesh(bdBand(-.2,.47,.2,.01,.04,1,.004),M.strap));spine.add(new THREE.Mesh(bdBand(-.2,.47,.2,.01,.04,-1,.004),M.strap))}
      else{const strap=new THREE.Mesh(new THREE.BoxGeometry(.04,.62,.012),M.strap);strap.position.set(0,.24,.128);strap.rotation.z=.72;spine.add(strap);
      const strapB=strap.clone();strapB.position.z=-.128;spine.add(strapB)}
      const bag=new THREE.Mesh(rbox(.2,.13,.07,.025),M.bag);bag.position.set(-.2,.04,.06);bag.rotation.y=-.5;spine.add(bag)}
    else{const C=o.ac===undefined?0x23386b:o.ac;
      // the bag is a downloaded CC0 model (Poly Pizza "Backpack", see assets/IMPORTS.md) re-oriented, smoothed and scaled in Blender; its own back pads are removed.
      // pk_main takes the accessory colour, pk_trim a darker shade; the shoulder straps are built here from points measured on the avatar's body so they lie ON the shoulders and chest
      const old=()=>{const m=CHP.mat(C,.8),m2=CHP.mat(CHP.shade(C,.62),.85);
        CHP.add(spine,rbox(.3,.36,.13,.05),m,0,.22,-.19);CHP.add(spine,rbox(.2,.15,.04,.02),m2,0,.14,-.272);CHP.add(spine,rbox(.2,.04,.1,.02),m2,0,.405,-.19);
        for(const s of [-1,1])CHP.add(spine,new THREE.BoxGeometry(.036,.34,.012),m2,s*.1,.28,.127,0,0,s*.04)};
      if(typeof MDL==='undefined'){old();return}
      const R=!!o.real,h=new THREE.Group();h.position.set(0,R?.27:.235,R?-.158:-.132);spine.add(h);
      const web=CHP.mat(CHP.shade(C,.55),.9,0,{side:THREE.DoubleSide});
      for(const s of [-1,1])spine.add(new THREE.Mesh(CHP.strapGeo(R,s),web));
      MDL.make('backpack').then(g=>{const cols={pk_main:C,pk_trim:CHP.shade(C,.62)},done={};
        g.scene.traverse(x=>{if(!x.isMesh)return;x.castShadow=true;const k=x.material.name;
          if(!done[k]){const m=x.material.clone();if(cols[k]!==undefined){m.color.set(cols[k]).convertSRGBToLinear()}m.roughness=Math.max(m.roughness,k==='pk_metal'?.3:.85);done[k]=m}x.material=done[k]});
        h.add(g.scene)}).catch(()=>{h.visible=false;old()})}}
};

// ---------------------------------------------------------------- the 3D window
const CHT=[ // tabs → rows: k = index in the code, sw = colour swatches [name,hex], ch = text chips
  {n:'Looks',f:'full',rows:[{pre:1}]},
  {n:'Body',f:'full',rows:[{l:'Body type',k:17,ch:['Realistic','Classic']},{l:'Skin tone',k:0,sw:CH_SKIN.map(c=>[c,c])},{l:'Eyes',k:1,sw:CH_EYE.map(e=>[e[0],e[1]])},{l:'Facial hair',k:2,ch:CH_BEARD}]},
  {n:'Hair',f:'head',slot:'hair',rows:[{l:'Style',k:3,ch:CH_HAIRS},{l:'Colour',k:4,sw:CH_HAIR.map(h=>[h[0],'#'+h[1].toString(16).padStart(6,'0')])}]},
  {n:'Top',f:'torso',slot:'top',rows:[{l:'Style',k:5,ch:CH_TOPS},{l:'Colour',k:6,sw:CH_CLOTH.map(c=>[c[0],'#'+c[1].toString(16).padStart(6,'0')])}]},
  {n:'Bottom',f:'legs',slot:'bottom',rows:[{l:'Style',k:7,ch:CH_BOTS},{l:'Colour',k:8,sw:CH_JEANS.map(c=>[c[0],'#'+c[1].toString(16).padStart(6,'0')])}]},
  {n:'Shoes',f:'feet',slot:'shoes',rows:[{l:'Style',k:9,ch:CH_SHOES},{l:'Colour',k:10,sw:CH_SHOE.map(c=>[c[0],'#'+c[1].toString(16).padStart(6,'0')])}]},
  {n:'Glasses',f:'head',rows:[{l:'Frames',k:11,ch:CH_GLASS}]},
  {n:'Extras',f:'full',rows:[{l:'Hat',k:12,ch:CH_HATS},{l:'Accessory colour',k:13,sw:CH_CLOTH.map(c=>[c[0],'#'+c[1].toString(16).padStart(6,'0')])},{l:'Neckwear',k:14,ch:CH_NECK},{l:'On your back',k:15,ch:CH_BACK},{l:'In hand',k:16,ch:['Nothing','Lemonade can']}]}];
const CH_LOOKS=[['Classic',null],['Navy',[3,3,0, 3,3, 2,4, 0,2, 0,1, 1, 0,2, 0,1,1]],['Red',[5,3,0, 1,4, 2,6, 0,5, 0,5, 1, 0,2, 0,1,1]],['Forest',[1,0,0, 4,5, 2,10, 0,1, 0,3, 1, 0,2, 0,1,1]],
  ['Skater',[2,3,1, 1,2, 3,3, 3,2, 2,1, 0, 2,6, 0,2,0]],['Sailor',[3,0,0, 1,3, 1,4, 0,8, 0,1, 0, 3,1, 3,0,0]],['Street',[4,5,2, 2,4, 4,2, 0,2, 2,4, 2, 1,8, 2,0,0]],['Summer',[2,1,0, 3,0, 0,9, 1,4, 0,0, 3, 3,0, 0,1,0]]];
const CREATOR={on:false,mode:'play',done:false,built:false,tab:0,yaw:.5,tYaw:.5,drag:null,hold:0,zoom:1,spanC:2,yC:.82,wmC:1.2,P:null,dirty:true,
  $(i){return document.getElementById(i)},
  el(tag,cls,txt,par){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;if(par)par.appendChild(e);return e},
  build(){if(this.built)return;this.built=true;const R=this.$('creator');
    this.tabs=this.$('crTabs');this.panel=this.$('crPanel');
    CHT.forEach((t,i)=>{const b=this.el('button','crTab',null,this.tabs);b.innerHTML='<i>'+String(i+1).padStart(2,'0')+'</i><span>'+t.n+'</span>';b.onclick=()=>this.pick(i)});
    this.$('crRand').onclick=()=>{CHAR.cur=CHAR.random();this.free();this.change()};
    this.$('crReset').onclick=()=>{CHAR.cur=CHAR.def.slice();this.free();this.change()};
    this.$('crBack').onclick=()=>this.cancel();this.$('crGo').onclick=()=>this.go();
    const st=this.$('crStage');
    st.addEventListener('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX};this.hold=performance.now();try{st.setPointerCapture(e.pointerId)}catch(x){}});
    st.addEventListener('pointermove',e=>{if(!this.drag||e.pointerId!==this.drag.id)return;this.tYaw+=(e.clientX-this.drag.x)*.011;this.drag.x=e.clientX;this.hold=performance.now()});
    for(const k of ['pointerup','pointercancel','lostpointercapture'])st.addEventListener(k,()=>{this.drag=null});
    st.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.65,Math.min(1.35,this.zoom*(1+Math.sign(e.deltaY)*.08)))},{passive:false});
    for(const k of ['keydown','keyup'])R.addEventListener(k,e=>e.stopPropagation());
    addEventListener('keydown',e=>{if(!this.on||document.activeElement===this.$('coName'))return;if(e.key==='ArrowLeft')this.tYaw-=.35;else if(e.key==='ArrowRight')this.tYaw+=.35;else if(e.key==='Enter')this.go();else if(e.key==='Escape')this.cancel()});
    this.pick(0,true)},
  // shop clothes would hide a creator change in the same slot, so a change takes the slot back
  free(slot){const L=typeof S!=='undefined'&&S&&S.look;if(!L)return;if(slot)delete L[slot];else for(const k of Object.keys(L))delete L[k];try{saveS()}catch(e){}},
  pick(i,quiet){this.tab=i;const T=CHT[i];this.focus=T.f;[...this.tabs.children].forEach((b,j)=>b.classList.toggle('on',j===i));this.renderPanel();this.dirty=true},
  renderPanel(){const T=CHT[this.tab],P=this.panel;P.innerHTML='';this.el('h3',null,T.n.toUpperCase(),P);
    for(const r of T.rows){
      if(r.pre){const g=this.el('div','crLooks',null,P);CH_LOOKS.forEach(([n,a])=>{const b=this.el('button','crChip',n,g);b.onclick=()=>{CHAR.cur=CHAR.clean(a||CHAR.def);this.free();this.change()}});continue}
      const row=this.el('div','crRow',null,P),hd=this.el('div','crHd',null,row);this.el('span',null,r.l,hd);const val=this.el('b',null,'',hd);
      const box=this.el('div',r.sw?'crSw':'crChips',null,row);
      const n=(r.sw||r.ch).length;
      for(let v=0;v<n;v++){const b=this.el('button',r.sw?'crDot':'crChip',r.sw?'':r.ch[v],box);if(r.sw){b.style.background=r.sw[v][1];b.title=r.sw[v][0];b.setAttribute('aria-label',r.sw[v][0])}
        b.dataset.k=r.k;b.dataset.v=v;b.onclick=()=>{CHAR.cur[r.k]=v;this.free(T.slot);this.change()}}
      row._val=val;row._r=r;row._box=box}
    this.rows=[...P.querySelectorAll('.crRow')];this.mark()},
  mark(){for(const row of this.rows||[]){const r=row._r;if(!r)continue;const cur=CHAR.cur[r.k];row._box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.v===cur));
      row._val.textContent=r.sw?r.sw[cur][0]:r.ch[cur]}},
  change(){CHAR.save();this.mark();this.dirty=true},
  ready(){return typeof renderer!=='undefined'&&renderer&&typeof makePlayer==='function'},
  open(mode){if(!this.ready())return;this.mode=mode||'play';this.build();this.on=true;this.$('menu').hidden=true;this.$('creator').hidden=false;
    this.$('crGo').textContent=this.mode==='play'?'Start game  ▶':'Save  ✓';this._init=CHAR.cur.slice();
    this.tYaw=this.yaw=.5;this.zoom=1;this.hold=performance.now();this._exp=renderer.toneMappingExposure;this._t=0;this.dirty=true;this.ensureScene();this.pick(this.tab)},
  close(){this.on=false;this.$('creator').hidden=true;if(this._exp!==undefined)renderer.toneMappingExposure=this._exp},
  cancel(){if(this._init){CHAR.cur=this._init;CHAR.save()}this.close();this.$('menu').hidden=false},
  go(){CHAR.save();this.done=true;this.close();
    try{WARDROBE.apply()}catch(e){console.error('[creator]',e)}
    if(this.mode==='play')this.$('bStart').click();else this.$('menu').hidden=false},
  // ---- 3D
  ensureScene(){if(this.scene)return;const sc=this.scene=new THREE.Scene(),cv=document.createElement('canvas');cv.width=8;cv.height=256;const x=cv.getContext('2d'),g=x.createLinearGradient(0,0,0,256);
    g.addColorStop(0,'#071a22');g.addColorStop(.55,'#12414f');g.addColorStop(1,'#0a2a35');x.fillStyle=g;x.fillRect(0,0,8,256);const bg=new THREE.CanvasTexture(cv);bg.encoding=THREE.sRGBEncoding;sc.background=bg;
    sc.add(new THREE.HemisphereLight(0xcfe8ff,0x1b2a30,.85));
    const key=new THREE.DirectionalLight(0xfff0d8,2.1);key.position.set(2.2,3.2,3.4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);const sh=key.shadow.camera;sh.left=-1.4;sh.right=1.4;sh.top=2.2;sh.bottom=-.4;sh.near=.5;sh.far=9;key.shadow.bias=-.0006;sc.add(key);sc.add(key.target);
    const rim=new THREE.DirectionalLight(0x7fc4ff,1.5);rim.position.set(-3,2.4,-2.6);sc.add(rim);const fill=new THREE.DirectionalLight(0xffd9b0,.5);fill.position.set(-2.5,1,2.5);sc.add(fill);
    // podium, glowing ring and a soft blob so the figure always stands on something (shadows are off on Low)
    const pod=new THREE.Mesh(new THREE.CylinderGeometry(.82,.86,.06,56),new THREE.MeshStandardMaterial({color:0x0d1d24,roughness:.35,metalness:.4}));pod.position.y=-.03;pod.receiveShadow=true;sc.add(pod);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.8,.84,64),new THREE.MeshBasicMaterial({color:0xf2c14e,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.002;sc.add(ring);
    const bc=document.createElement('canvas');bc.width=bc.height=128;const bx=bc.getContext('2d'),rg=bx.createRadialGradient(64,64,4,64,64,62);rg.addColorStop(0,'rgba(0,0,0,.55)');rg.addColorStop(1,'rgba(0,0,0,0)');bx.fillStyle=rg;bx.fillRect(0,0,128,128);
    const blob=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(bc),transparent:true,depthWrite:false}));blob.rotation.x=-Math.PI/2;blob.position.y=.004;sc.add(blob);
    this.cam=new THREE.PerspectiveCamera(28,1,.1,40)},
  dispose(root){root.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(m.map)m.map.dispose();m.dispose()}})},
  rebuild(){const old=this.P,P=makePlayer(CHAR.opts(CHAR.cur));P.root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false}});P.root.rotation.y=this.yaw;this.scene.add(P.root);
    if(old){this.scene.remove(old.root);this.dispose(old.root)}this.P=P;this.dirty=false},
  frame(t){const dt=Math.min(.05,this._t?(t-this._t)/1000:.016);this._t=t;if(this.dirty||!this.P)this.rebuild();
    if(!this.drag&&performance.now()-this.hold>5000)this.tYaw+=dt*.35;     // slow turntable when nobody is dragging
    this.yaw+=(this.tYaw-this.yaw)*Math.min(1,dt*9);this.P.root.rotation.y=this.yaw;animPlayer(this.P,{spd:0,mode:'walk'},dt);
    const W=innerWidth,H=innerHeight,s=this.$('crStage').getBoundingClientRect(),cx=s.left+s.width/2,cy=s.top+s.height/2,f=Math.max(.2,Math.min(1,s.height/H));
    const F={full:[2.05,.84],head:[.95,1.38],torso:[1.1,1.16],legs:[1.15,.5],feet:[.7,.14]}[this.focus]||[2.05,.84];
    const k=Math.min(1,dt*6);this.spanC+=(F[0]-this.spanC)*k;this.yC+=(F[1]-this.yC)*k;
    const c=this.cam;c.aspect=W/H;c.fov=28;c.setViewOffset(W,H,W/2-cx,H/2-cy,W,H);
    const tn=2*Math.tan(c.fov*Math.PI/360),wm=({full:1.2,head:.78,torso:.95,legs:.8,feet:.7}[this.focus]||1.2);this.wmC+=(wm-this.wmC)*k;const d=Math.max(this.spanC/(tn*f),this.wmC/(tn*Math.max(.1,s.width/H)))*this.zoom;c.position.set(0,this.yC+.06,d);c.lookAt(0,this.yC,0);c.updateProjectionMatrix();
    renderer.toneMappingExposure=1.05;renderer.info.reset();renderer.render(this.scene,c)}
};

// ---------------------------------------------------------------- main menu: pick a panel on the right
const MENU={init(){const nav=document.getElementById('mNav');if(!nav)return;
    const show=id=>{document.querySelectorAll('#mPanel .mp').forEach(p=>p.hidden=p.id!==id);nav.querySelectorAll('[data-p]').forEach(b=>b.classList.toggle('sel',b.dataset.p===id))};
    nav.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>show(b.dataset.p));
    const bc=document.getElementById('bChar');if(bc)bc.onclick=()=>CREATOR.open('menu');show('pAbout')}};
