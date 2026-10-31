/* ===================================================================================================
   houses.js — the four houses on the offshore island, with a real interior each

   • classes:  cosy log cabin · two middle-class houses (coastal / lodge) · elite premium villa; the dearer, the bigger and finer
   • rooms:    living room with a fireplace and soft sofas, kitchen with fridge / stove / sink, bedroom with a big bed and wardrobe,
               bathroom with a working sink (wash your hands), bath / shower, plus a study, dining area and terrace in the bigger ones
   • you can:  sit on sofas, armchairs and the bed · turn the TV on and off · light or put out the fire · run the taps
   Loaded BEFORE the main script; it only touches game globals when hsInit() is called from the island builder.
   Built with shops.js's shEnv() (boxes into one batched mesh, collisions, interaction points).
   =================================================================================================== */

const HSTATE={built:{},ready:false};
const HOUSE_DEF={
  house0:{name:'Beach cabin',cls:'Cosy',idx:50,W:13,D:9,H:2.9,style:'log'},
  house1:{name:'Sea villa',cls:'Middle class',idx:51,W:17,D:12,H:3.1,style:'coast'},
  house2:{name:'Lagoon house',cls:'Middle class',idx:52,W:16,D:13,H:3.2,style:'lodge'},
  house3:{name:'Island mansion',cls:'Elite villa',idx:53,W:26,D:16,H:3.9,style:'elite'}};
const HOUSE_STYLE={
  log:{door:'#5a3a20',hw:'#2a2a2c',curt:'#a8553f',standGlb:true,standTint:'#c89060',exp:.62,wood:'#6b4426',wall:'#a9743d',wm:5,floor:'#9a6a3a',fm:5,trim:'#6b4426',ceil:'#8a5a30',cm:5,beams:true,sofa:['#7a3b2e','#a8553f'],accent:'#b5422d',light:0xffd9a0},
  coast:{door:'#ffffff',hw:'#b8bcc0',curt:'#e9eef1',exp:.46,wood:'#b9936a',wall:'#d9e2e6',wm:0,floor:'#b99466',fm:5,trim:'#ffffff',ceil:'#eef0ee',cm:0,beams:false,sofa:['#3d5a80','#98c1d9'],accent:'#3d5a80',light:0xfff1dc},
  lodge:{door:'#3f2a18',hw:'#c9a24a',curt:'#7a3b2e',standGlb:true,standTint:'#8a6a4a',exp:.62,wood:'#3f2a18',wall:'#7d5632',wm:5,floor:'#6a4426',fm:5,trim:'#3f2a18',ceil:'#e6d6bb',cm:0,beams:true,sofa:['#2f5d45','#527a62'],accent:'#8a4b2a',light:0xffd29a},
  elite:{door:'#e8e1d2',hw:'#c9a24a',curt:'#d8cdb0',exp:.46,wood:'#3a2a1c',wall:'#cdbfa6',wm:0,floor:'#8d8374',fm:7,trim:'#c9a24a',ceil:'#e8e1d2',cm:0,beams:false,sofa:['#e4dccd','#b99b66'],accent:'#c9a24a',light:0xfff4e2}};

function hsInit(){
  if(HSTATE.ready)return;HSTATE.ready=true;
  INTERIORS.house=opt=>HSTATE.built[opt.id]||(HSTATE.built[opt.id]=hsBuild(HOUSE_DEF[opt.id]||HOUSE_DEF.house0,opt.id));
  const ck=PORTAL.cacheKey;PORTAL.cacheKey=function(name,opt){if(name==='house')return 'house:'+((opt&&opt.id)||'house0');return ck.call(this,name,opt)};
  ANIM.push(hsTick)}

// ---------- furniture kit bound to one interior ----------
function hsKit(E,S,L){
  const K={},ox=E.ox,oz=E.oz,H=E.H,loc=(x,z,ry)=>(u,v)=>[x+u*Math.cos(ry)+v*Math.sin(ry),z-u*Math.sin(ry)+v*Math.cos(ry)];
  const bx=(x,z,ry,u,y,v,sw,sh,sd,c,m)=>{const p=loc(x,z,ry)(u,v);E.box(p[0],y,p[1],sw,sh,sd,c,m||0,ry)};
  const cy=(x,z,ry,u,y,v,r1,r2,h,c,m,seg)=>{const p=loc(x,z,ry)(u,v);E.P.cyl(ox+p[0],INT_Y+y,oz+p[1],r1,r2,h,seg||12,sRGB(c),m||0)};
  const ob=(x,z,ry,u,v,hw,hd)=>{const p=loc(x,z,ry)(u,v);E.obb(p[0],p[1],hw,hd,ry)};
  const wood=S.wood||S.trim,face=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z);K.face=face;K.loc=loc;K.bx=bx;K.cy=cy;K.ob=ob;
  const light=(x,y,z,col,i,d)=>{const l=new THREE.PointLight(col,0,d||14,1.5);l.position.set(ox+x,INT_Y+y,oz+z);l.userData.i=i;E.grp.add(l);L.push(l);if(window.FD)FD.lamp(E,S,x,y,z);return l};K.light=light;
  const sit=(x,z,ry,label,y)=>E.act(x,z,1.7,label,()=>{if(player.sit)return;player.sit={x:ox+x,z:oz+z,y:INT_Y+(y||.12),yaw:ry};cam.yaw=ry;cam.pitch=.18;player.vx=player.vz=0;toast('Sit back and relax','move to stand up')});
  // sofa / armchair: back edge at (x,z), facing ry
  K.sofa=(x,z,ry,len,c1,c2)=>{
    if(S.sofaGlb&&len>1.5){const s=Math.min(1.35,len/1.57),p=loc(x,z,ry)(0,.33*s+.02);   // a real Poly Haven sofa (CC0) in styles that ask for it; the sit act and collision stay the kit's
      MDL.put(E.grp,S.sofaGlb,{x:ox+p[0],y:INT_Y,z:oz+p[1],ry:ry,s});ob(x,z,ry,0,.46,len/2,.48);const q=loc(x,z,ry)(0,.6);sit(q[0],q[1],ry,'Sit on the sofa');return}
    c1=c1||S.sofa[0];c2=c2||S.sofa[1];const n=Math.max(1,Math.round(len/.75)),w=len/n;
    bx(x,z,ry,0,.2,.47,len,.4,.92,c1);bx(x,z,ry,0,.68,.1,len,.62,.2,c1);for(const s of [-1,1])bx(x,z,ry,s*(len/2-.1),.5,.47,.2,.56,.92,c1);
    for(let i=0;i<n;i++){const u=-len/2+w*(i+.5);bx(x,z,ry,u,.47,.56,w-.2*(n>1?.15:.5)-.05,.15,.68,c2);bx(x,z,ry,u,.72,.24,w-.28,.36,.16,c2)}
    bx(x,z,ry,0,.02,.47,len-.2,.04,.8,'#2a2a2c');ob(x,z,ry,0,.46,len/2,.48);const p=loc(x,z,ry)(0,.6);sit(p[0],p[1],ry,len>1.3?'Sit on the sofa':'Sit in the armchair')};
  K.cornerSofa=(x,z,ry,a,b)=>{K.sofa(x,z,ry,a);const p=loc(x,z,ry)(a/2+.55,.9);K.sofa(p[0],p[1],ry+Math.PI/2,b-.9)};
  K.table=(x,z,ry,w,d,h,c)=>{bx(x,z,ry,0,h,0,w,.06,d,c||wood,5);for(const a of [-1,1])for(const b of [-1,1])bx(x,z,ry,a*(w/2-.08),h/2,b*(d/2-.08),.07,h,.07,c||wood,5);ob(x,z,ry,0,0,w/2,d/2)};
  K.chair=(x,z,ry,c)=>{if(S.chairGlb){MDL.put(E.grp,S.chairGlb,{x:ox+x,y:INT_Y,z:oz+z,ry:ry,h:.9,tint:c||S.chairTint});return}   // real painted chair (Poly Haven, CC0), recoloured by the style
    bx(x,z,ry,0,.45,0,.42,.05,.42,c||wood,5);bx(x,z,ry,0,.72,-.19,.42,.5,.05,c||wood,5);for(const a of [-1,1])for(const b of [-1,1])bx(x,z,ry,a*.18,.22,b*.18,.04,.44,.04,c||wood,5)};
  K.rug=(x,z,ry,w,d,c)=>bx(x,z,ry,0,.015,0,w,.03,d,c,0);
  K.lamp=(x,z,h,c)=>{E.P.cyl(ox+x,INT_Y,oz+z,.14,.14,.03,10,sRGB('#2a2a2c'),1);E.P.cyl(ox+x,INT_Y+.03,oz+z,.02,.02,h||1.5,6,sRGB('#2a2a2c'),1);E.box(x,(h||1.5)+.1,z,.38,.3,.38,c||'#ffe9bd',3);E.obb(x,z,.18,.18,0)};
  K.plant=(x,z,sc)=>{sc=sc||1;E.P.cyl(ox+x,INT_Y,oz+z,.2*sc,.16*sc,.35*sc,10,sRGB('#a65a3a'),0);for(let i=0;i<7;i++){const a=i*.9;E.P.box(ox+x+Math.cos(a)*.14*sc,INT_Y+(.55+(i%3)*.17)*sc,oz+z+Math.sin(a)*.14*sc,.3*sc,.05,.5*sc,a,sRGB(['#2f7a3a','#3f9a46','#2a6a34'][i%3]),0,.55)}E.obb(x,z,.25*sc,.25*sc,0)};
  K.shelf=(x,z,ry,w,h)=>{h=h||2;bx(x,z,ry,0,h/2,.16,w,h,.32,wood,5);for(let l=0;l<4;l++)bx(x,z,ry,0,.35+l*(h-.5)/3,.3,w-.08,.03,.3,'#d8c9a8',5);
    const cols=['#c8372d','#2f6db0','#e8b53a','#3f9a46','#8a4ab0','#e8e4da'];for(let l=0;l<3;l++)for(let i=0;i<Math.floor(w/.09);i++)bx(x,z,ry,-w/2+.07+i*.09,.35+l*(h-.5)/3+.14,.31,.06,.22+(i%3)*.03,.22,cols[(i*5+l*3)%6],0);ob(x,z,ry,0,.18,w/2,.18)};
  K.art=(x,z,ry,w,h,y,c)=>{bx(x,z,ry,0,y,.04,w+.1,h+.1,.04,wood,5);bx(x,z,ry,0,y,.065,w,h,.02,c||'#e8c8a0',0);bx(x,z,ry,w*.18,y-h*.12,.08,w*.4,h*.5,.01,'#3d6a8a',0);bx(x,z,ry,-w*.2,y+h*.15,.08,w*.25,h*.3,.01,'#f2c14e',0)};
  K.window=(x,z,ry,w,h,y)=>{bx(x,z,ry,0,y,.03,w+.16,h+.16,.05,S.trim,5);bx(x,z,ry,0,y,.06,w,h,.02,S.win||'#bfe3ff',8);bx(x,z,ry,0,y,.075,.05,h,.02,S.trim,5);bx(x,z,ry,0,y,.075,w,.05,.02,S.trim,5);if(window.FD)FD.window(E,K,S,x,z,ry,w,h,y)};
  // fireplace: stone surround and chimney, logs, animated flames and a flickering light; "Light / put out the fire"
  K.fire=(x,z,ry,w)=>{w=w||2.2;const f={flames:[],on:true,light:null};
    bx(x,z,ry,0,1.15,.33,w,2.3,.66,'#8c8176',7);bx(x,z,ry,0,.48,.67,1.0,.86,.04,'#0d0b0a',0);bx(x,z,ry,0,.05,.8,w+.5,.1,.9,'#6b645c',7);bx(x,z,ry,0,1.34,.55,w+.3,.1,.5,wood,5);
    bx(x,z,ry,0,H/2+1.15,.25,w*.5,H-2.3,.5,'#8c8176',7);for(const s of [-1,1])E.P.cyl(...(()=>{const p=loc(x,z,ry)(s*.16,.58);return [ox+p[0],INT_Y+.12,oz+p[1]]})(),.07,.07,.9,8,sRGB('#4a2f1a'),5,0,Math.PI/2,ry);
    const p=loc(x,z,ry)(0,.6);const cols=[0xff6a1f,0xffa11f,0xffd25a];
    for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(.17-i*.04,.55-i*.12,8),new THREE.MeshBasicMaterial({color:cols[i],transparent:true,opacity:.92}));m.position.set(ox+p[0]+(i-1)*.12,INT_Y+.45,oz+p[1]);m.userData.i=i;E.grp.add(m);f.flames.push(m)}
    f.light=light(p[0],1.0,p[1],0xff8a3a,0,9);f.light.userData.fire=1;f.light.userData.i=0;HSTATE.cur.fires.push(f);ob(x,z,ry,0,.35,w/2,.35);
    const q=loc(x,z,ry)(0,1.6);INTERACT.push({x:ox+q[0],z:oz+q[1],r:2.1,get label(){return f.on?'Put out the fire':'Light the fire'},fn:()=>{f.on=!f.on;toast(f.on?'The fire crackles':'The fire is out','')}});return f};
  // television on a stand; the screen shows moving colour bars while it is on
  K.tv=(x,z,ry,w)=>{w=w||1.5;bx(x,z,ry,0,.27,.26,w+.3,.54,.5,wood,5);bx(x,z,ry,0,1.0,.2,w,w*.58,.06,'#0b0b0d',1);
    const cv=document.createElement('canvas');cv.width=160;cv.height=90;const g=cv.getContext('2d');g.fillStyle='#08090b';g.fillRect(0,0,160,90);const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w-.08,w*.58-.08),new THREE.MeshBasicMaterial({map:tex}));const p=loc(x,z,ry)(0,.235);m.position.set(ox+p[0],INT_Y+1.0,oz+p[1]);m.rotation.y=ry;E.grp.add(m);
    const t={m,tex,cv,g,on:false,t:0,light:light(...(()=>{const a=loc(x,z,ry)(0,1.2);return [a[0],1.3,a[1]]})(),0x9ac0ff,0,7)};t.light.userData.tv=1;t.light.userData.i=0;HSTATE.cur.tvs.push(t);ob(x,z,ry,0,.26,w/2+.1,.28);
    const q=loc(x,z,ry)(0,1.9);INTERACT.push({x:ox+q[0],z:oz+q[1],r:2.4,get label(){return t.on?'Turn the TV off':'Turn the TV on'},fn:()=>{t.on=!t.on;if(window.AUD)AUD.beep();if(!t.on){t.g.fillStyle='#08090b';t.g.fillRect(0,0,160,90);t.tex.needsUpdate=true}}});return t};
  K.bed=(x,z,ry,w,c)=>{w=w||1.6;c=c||S.accent;bx(x,z,ry,0,.28,1.05,w+.14,.38,2.12,wood,5);bx(x,z,ry,0,.55,1.05,w,.2,2.0,'#f4efe6',0);for(const s of [-1,1])bx(x,z,ry,s*w*.26,.7,.3,w*.4,.14,.36,'#ffffff',0);
    const cl=window.FD?FD.shade(c,1.35):c,cd=window.FD?FD.shade(c,.72):c;
    bx(x,z,ry,0,.68,1.42,w+.06,.12,1.3,c,0);bx(x,z,ry,0,.745,.83,w+.05,.03,.2,'#fbf8f2',0);bx(x,z,ry,0,.78,1.98,w+.1,.04,.34,cd,0);    // duvet, turned-down sheet, a throw over the foot
    for(const s of [-1,1])bx(x,z,ry,s*w*.2,.725,.62,.32,.12,.14,cl,0);                                                                   // two scatter cushions
    bx(x,z,ry,0,.9,.04,w+.2,1.0,.1,wood,5);bx(x,z,ry,0,.5,2.14,w+.14,.5,.08,wood,5);ob(x,z,ry,0,1.05,w/2+.1,1.08);
    const p=loc(x,z,ry)(w/2+.62,1.5);sit(p[0],p[1],ry-Math.PI/2,'Sit on the bed',.2)};
  K.stand=(x,z,ry)=>{if(S.standGlb&&window.FD)return FD.stand(E,K,S,x,z,ry);bx(x,z,ry,0,.28,.2,.46,.56,.4,wood,5);cy(x,z,ry,0,.56,.2,.07,.05,.12,'#d8c9a8',1);bx(x,z,ry,0,.78,.2,.26,.22,.26,'#ffe9bd',3)};
  K.wardrobe=(x,z,ry,w)=>{w=w||2;bx(x,z,ry,0,1.15,.3,w,2.3,.6,wood,5);const n=Math.max(2,Math.round(w/.55));for(let i=1;i<n;i++)bx(x,z,ry,-w/2+i*w/n,1.15,.61,.02,2.1,.02,'#1d130b',0);for(let i=0;i<n;i+=2){const u=-w/2+(i+.5)*w/n;bx(x,z,ry,u+w/n*.42,1.1,.62,.03,.3,.03,'#d8c07a',6)}ob(x,z,ry,0,.3,w/2,.3)};
  K.desk=(x,z,ry,w)=>{K.table(x,z,ry,w||1.5,.7,.76);bx(x,z,ry,0,.82,-.05,.6,.4,.04,'#101114',1);bx(x,z,ry,0,.84,-.04,.55,.34,.01,'#2a8ad0',8);bx(x,z,ry,0,.78,.2,.45,.02,.15,'#22252a',0);K.chair(...(()=>{const p=loc(x,z,ry)(0,.8);return [p[0],p[1],ry+Math.PI]})(),'#2a2d32')};
  // kitchen run along a wall (back at (x,z), facing ry): items [type,width]; fridge, cabinets, sink, stove (with hood)
  K.kitchen=(x,z,ry,items,wall)=>{let u=0,kc=null;const tot=items.reduce((a,i)=>a+i[1],0);u=-tot/2;const cab=wall||'#e8e4da';if(window.FD)FD.splash(E,K,S,x,z,ry,0,tot);
    for(const [kind,w] of items){const c=u+w/2;u+=w;
      if(kind==='fridge'){const p=loc(x,z,ry)(c,0);actFridge(E,p[0],p[1],ry,w-.04,{body:'#e2e5e8'})}   // a real one: the door opens (acts.js)
      else{bx(x,z,ry,c,.43,.32,w-.02,.86,.62,kind==='stove'?'#2a2d32':cab,kind==='stove'?6:5);bx(x,z,ry,c,.88,.32,w,.05,.66,'#2d2d30',7);ob(x,z,ry,c,.32,w/2,.33);
        if(kind==='cab'){if(kc===null)kc=c;for(const s of [-1,1])bx(x,z,ry,c+s*w*.22,.43,.64,w*.4,.7,.02,'#d8d2c4',5);bx(x,z,ry,c,1.75,.2,w-.02,.7,.34,cab,5)}
        if(kind==='stove'){for(const a of [-1,1])for(const b of [0,1])cy(x,z,ry,c+a*.2,.905,.16+b*.28,.09,.09,.015,'#111',1,14);bx(x,z,ry,c,.42,.64,w*.8,.5,.02,'#08090b',2);bx(x,z,ry,c,1.9,.28,w*.9,.1,.5,'#9aa0a6',6);bx(x,z,ry,c,2.3,.2,.25,.8,.22,'#9aa0a6',6)}
        if(kind==='sink'){bx(x,z,ry,c,.9,.34,w*.7,.03,.42,'#aab0b6',6);bx(x,z,ry,c,.89,.34,w*.62,.05,.34,'#6a7076',6);cy(x,z,ry,c,.9,.58,.02,.02,.3,'#c8ccd0',6);const t=loc(x,z,ry)(c,.5);K.tap(t[0],t[1],ry,'Run the tap',1.12,true);for(const s of [-1,1])bx(x,z,ry,c+s*w*.22,.43,.64,w*.4,.7,.02,'#d8d2c4',5);bx(x,z,ry,c,1.75,.2,w-.02,.7,.34,cab,5)}}}
    // an electric kettle on the first free worktop
    if(kc!==null&&items.some(i=>i[0]==='sink')){const p=loc(x,z,ry)(kc,.3),st=loc(x,z,ry)(kc,1.0);actKettle(E,p[0],.905,p[1],ry,{stand:st,reach:.5})}};
  // a tap with a thin jet of water that runs for a few seconds when used
  K.tap=(x,z,ry,label,y,drink)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.26,6),new THREE.MeshBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.7}));const p=loc(x,z,ry)(0,.08);
    m.position.set(ox+p[0],INT_Y+(y||.95)-.15,oz+p[1]);m.visible=false;E.grp.add(m);const t={m,until:0};HSTATE.cur.taps.push(t);const q=loc(x,z,ry)(0,.75);
    if(label==='Run the bath'){E.act(q[0],q[1],1.5,label,()=>{t.until=HSTATE.t+3.2;toast('You run the bath','');if(window.AUD)AUD.beep()});return t}
    // basins: really wash your hands (and at the kitchen sink pour a glass of water) — see acts.js
    const wx=ox+p[0],wz=oz+p[1],jet=()=>{t.until=HSTATE.t+.4},L=loc(x,z,ry),a=L(drink?-.32:0,.75),b=L(.32,.75);
    E.act(a[0],a[1],drink?.9:1.5,'Wash your hands',()=>{if(ACT.start('wash',{tx:wx,tz:wz,reach:.5,jet,onEnd:cx=>{if(!cx)toast('Clean hands','cold water and a good scrub')}}))toast('Wash your hands','')});
    if(drink)E.act(b[0],b[1],.9,'Pour a glass of water',()=>{if(ACT.start('pour',{tx:wx,tz:wz,reach:.5,jet,item:'glass',onEnd:cx=>{if(!cx)toast('Cheers','a glass of cold water')}}))toast('Water','you hold a glass under the tap')});
    return t};
  K.vanity=(x,z,ry,w)=>{w=w||1.0;bx(x,z,ry,0,.42,.27,w,.84,.5,wood,5);bx(x,z,ry,0,.86,.27,w+.04,.05,.54,'#f4f6f7',7);bx(x,z,ry,0,.89,.3,w*.62,.03,.38,'#dfe6ea',1);cy(x,z,ry,0,.9,.1,.02,.02,.22,'#c8ccd0',6);bx(x,z,ry,0,1.62,.03,w*.85,.95,.03,'#cfe6f2',6);bx(x,z,ry,0,1.62,.015,w*.85+.1,1.05,.02,wood,5);
    for(const s of [-1,1])bx(x,z,ry,s*w*.25,.4,.54,w*.4,.7,.02,'#e8e0d0',5);ob(x,z,ry,0,.27,w/2,.27);const t=loc(x,z,ry)(0,.12);K.tap(t[0],t[1],ry,'Wash your hands',1.08)};
  K.toilet=(x,z,ry)=>{bx(x,z,ry,0,.2,.35,.38,.4,.55,'#f6f7f8',1);bx(x,z,ry,0,.62,.14,.42,.4,.22,'#f6f7f8',1);bx(x,z,ry,0,.43,.38,.4,.05,.5,'#e4e7ea',1);bx(x,z,ry,0,.66,.06,.1,.03,.03,'#9aa0a6',6);ob(x,z,ry,0,.35,.25,.4)};
  K.tub=(x,z,ry,len)=>{len=len||1.7;bx(x,z,ry,0,.29,.4,len,.58,.8,'#f6f7f8',1);bx(x,z,ry,0,.57,.4,len-.2,.03,.6,'#9fd6ea',8);cy(x,z,ry,len/2-.1,.58,.78,.02,.02,.2,'#c8ccd0',6);ob(x,z,ry,0,.4,len/2,.42);const p=loc(x,z,ry)(0,1.05);K.tap(...(()=>{const a=loc(x,z,ry)(len/2-.1,.72);return [a[0],a[1],ry]})(),'Run the bath',.84)};
  K.shower=(x,z,ry,w)=>{w=w||1.0;bx(x,z,ry,0,.04,w/2,w,.08,w,'#e2e6e9',1);for(const s of [-1,1])bx(x,z,ry,s*w/2,1.05,w/2,.03,2.1,w,'#dce8ee',1);bx(x,z,ry,0,1.05,w,w,2.1,.03,'#dce8ee',1);bx(x,z,ry,w*.38,1.05,w+.02,.05,2.1,.03,'#9aa0a6',6);cy(x,z,ry,0,1.9,.1,.02,.02,.5,'#c8ccd0',6);cy(x,z,ry,0,2.38,.18,.1,.12,.04,'#c8ccd0',6);ob(x,z,ry,0,w/2,w/2,w/2)};
  K.hang=(x,z,ry,n)=>{for(let i=0;i<(n||3);i++)bx(x,z,ry,(i-1)*.35,1.4,.05,.26,.5,.03,['#2f6db0','#e8e4da','#c8372d'][i%3],0);bx(x,z,ry,0,1.7,.04,1.1,.03,.03,'#9aa0a6',6)};
  K.piano=(x,z,ry)=>{bx(x,z,ry,0,.75,.6,1.5,.15,1.3,'#111113',1);bx(x,z,ry,0,.4,.6,1.4,.8,1.1,'#111113',1);bx(x,z,ry,0,.8,.12,1.4,.05,.25,'#f4f1ea',0);for(const a of [-1,1])bx(x,z,ry,a*.62,.3,.0,.06,.6,.06,'#111113',1);K.chair(...(()=>{const p=loc(x,z,ry)(0,-.55);return [p[0],p[1],ry]})(),'#111113');ob(x,z,ry,0,.6,.8,.7)};
  K.chandelier=(x,z,y,r)=>{r=r||.6;(E.lampSkip=E.lampSkip||[]).push([x,z]);E.box(x,H-.15,z,.05,.3,.05,'#c9a24a',6);for(let i=0;i<8;i++){const a=i*Math.PI/4;E.box(x+Math.cos(a)*r,y,z+Math.sin(a)*r,.07,.28,.07,'#fff4d8',3);E.box(x+Math.cos(a)*r*.5,y+.12,z+Math.sin(a)*r*.5,r,.03,.03,'#c9a24a',6,-a)}E.box(x,y+.05,z,.2,.2,.2,'#c9a24a',6)};
  // wall segments along x at z (or along z at x) with doorways [centre,width]; a lintel closes each doorway
  K.wallX=(z,xa,xb,gaps,m,c)=>{const gs=(gaps||[]).slice().sort((a,b)=>a[0]-b[0]);let t=xa;const seg=(a,b)=>{if(b-a>.05){E.box((a+b)/2,H/2,z,b-a,H,.22,c||S.wall,m==null?S.wm:m,0);wallSeg(ox+a,oz+z,ox+b,oz+z,.3,INT_Y-1,INT_Y+H+1);if(window.FD)FD.skirt(E,S,'x',z,a,b)}};
    for(const [g,w,dopt] of gs){seg(t,g-w/2);if(window.FD)FD.door(E,S,'x',z,g,w,Object.assign({front:z===0},dopt));E.box(g,(2.2+H)/2,z,w,H-2.2,.22,c||S.wall,m==null?S.wm:m,0);for(const s of [-1,1])E.box(g+s*(w/2+.03),1.1,z,.06,2.2,.28,S.trim,5,0);E.box(g,2.2,z,w+.12,.06,.28,S.trim,5,0);t=g+w/2}seg(t,xb)};
  K.wallZ=(x,za,zb,gaps,m,c)=>{const gs=(gaps||[]).slice().sort((a,b)=>a[0]-b[0]);let t=za;const seg=(a,b)=>{if(b-a>.05){E.box(x,H/2,(a+b)/2,.22,H,b-a,c||S.wall,m==null?S.wm:m,0);wallSeg(ox+x,oz+a,ox+x,oz+b,.3,INT_Y-1,INT_Y+H+1);if(window.FD)FD.skirt(E,S,'z',x,a,b)}};
    for(const [g,w,dopt] of gs){seg(t,g-w/2);if(window.FD)FD.door(E,S,'z',x,g,w,dopt);E.box(x,(2.2+H)/2,g,.22,H-2.2,w,c||S.wall,m==null?S.wm:m,0);for(const s of [-1,1])E.box(x,1.1,g+s*(w/2+.03),.28,2.2,.06,S.trim,5,0);E.box(x,2.2,g,.28,.06,w+.12,S.trim,5,0);t=g+w/2}seg(t,zb)};
  if(window.FD)FD.kit(E,K,S);
  return K}

// ---------- shell: floor, ceiling (with beams), outer walls with the front door ----------
function hsShell(E,K,S,def){const W=def.W,D=def.D,H=def.H;
  E.box(0,-.05,D/2,W,.1,D,S.floor,S.fm);E.box(0,H+.05,D/2,W,.1,D,S.ceil,S.cm);E.floor(-W/2-.1,W/2+.1,-.5,D+.1);
  if(S.beams){for(let x=-W/2+1.6;x<W/2;x+=2.6)E.box(x,H-.14,D/2,.24,.28,D,'#4a2f1a',5);for(const z of [D*.33,D*.66])E.box(0,H-.1,z,W,.2,.22,'#4a2f1a',5)}
  K.wallX(D,-W/2,W/2,[],null);K.wallZ(-W/2,0,D,[],null);K.wallZ(W/2,0,D,[],null);K.wallX(0,-W/2,W/2,[[0,1.3]],null);
  E.act(0,.7,1.8,'Go outside',()=>PORTAL.exit());
  // doormat and skirting
  E.box(0,.012,.9,1.3,.024,.8,'#4a3a2a',0);for(const s of [-1,1])E.box(s*(W/2-.12),.1,D/2,.04,.2,D-.3,S.trim,5)}

// ---------- the four houses ----------
function hsBuild(def,id){
  const S=HOUSE_STYLE[def.style],grp=new THREE.Group();scene.add(grp);const ox=INT_X+800+def.idx*200,oz=INT_Z,W=def.W,D=def.D,H=def.H;
  const E=shEnv(grp,ox,oz,H),L=[];HSTATE.cur={tvs:[],fires:[],taps:[]};const K=hsKit(E,S,L);
  hsShell(E,K,S,def);const hw=W/2,PI=Math.PI;
  if(id==='house0'){      // ----- Beach cabin: cosy log cabin, open living room + kitchen, bedroom and bathroom in the east wing -----
    K.wallZ(1.8,0,D,[[2.1,1.0],[7.5,1.0]]);K.wallX(4.6,1.8,hw,[]);
    K.fire(-hw+.02,3.0,PI/2,2.0);K.rug(-3.0,3.6,0,3.6,2.6,'#8a2f2a');K.sofa(-3.0,4.95,PI,2.5);K.table(-3.0,3.0,0,1.2,.7,.42);K.sofa(-4.9,1.4,PI/2+.5,1.0,'#7a5a3a','#b08a5a');K.tv(-3.0,.06,0,1.35);
    K.lamp(-5.9,5.3,1.5);K.plant(-5.9,.7,1.2);K.window(-2.0,.12,0,1.2,1.0,1.6);K.window(-hw+.12,5.6,PI/2,1.0,1.0,1.6);K.art(-hw+.12,1.0,PI/2,.8,.6,1.7);K.shelf(1.65,3.9,-PI/2,1.4,1.9);
    K.kitchen(-3.7,D-.05,PI,[['fridge',.75],['cab',.9],['sink',1.2],['cab',.6],['stove',.7],['cab',.9]]);K.table(-3.6,7.1,0,1.3,.8,.76);K.chair(-4.6,7.1,PI/2);K.chair(-2.6,7.1,-PI/2);K.window(-3.7,D-.12,PI,1.4,.8,1.7);
    K.bed(hw-.05,2.3,-PI/2,1.7,'#b5422d');K.stand(hw-.05,.9,-PI/2);K.stand(hw-.05,3.7,-PI/2);K.wardrobe(3.9,.05,0,2.0);K.rug(4.2,2.3,0,2.6,2.2,'#d8c9a8');K.window(hw-.12,2.3,-PI/2,1.0,.8,1.95);K.art(1.93,3.4,PI/2,.8,.6,1.6);
    K.rug(4.15,6.8,0,4.6,4.3,'#c3d1d8');K.vanity(3.0,D-.05,PI,.9);K.toilet(5.3,4.72,0);K.tub(5.4,D-.05,PI,1.6);K.hang(1.93,5.6,PI/2,2);K.window(hw-.12,6.6,-PI/2,.8,.8,1.7);
    K.light(-3,2.5,3,S.light,1.2,14);K.light(-3,2.5,7,S.light,.9,12);K.light(4.2,2.5,2.4,S.light,.8,10);K.light(4.2,2.5,6.8,0xffffff,.9,10);
    if(window.FD){FD.bath(E,1.8,hw,4.6,D,[['W',7.5,1.0]],S,1.5);K.shoes(-1.5,.12,0,.9);K.hang(1.6,.13,0,2)}}
  else if(id==='house1'){ // ----- Sea villa: bright coastal house; living room with a fireplace, open kitchen with a bar island, bedroom / bath / study along the back -----
    K.wallX(7.5,-hw,hw,[[-4.7,1.1],[1.1,1.0],[5.8,1.1]]);K.wallZ(-1,7.5,D,[]);K.wallZ(3.2,7.5,D,[]);
    K.fire(-hw+.02,3.6,PI/2,2.4);K.rug(-3.8,3.7,0,4.8,3.4,'#cbd9e4');K.sofa(-3.8,6.6,PI,2.7);K.sofa(-1.2,3.6,-PI/2,1.1);K.table(-3.8,3.5,0,1.5,.8,.4,'#d8cdb8');K.tv(-3.8,.06,0,1.7);
    K.plant(-hw+.6,6.6,1.4);K.lamp(-1.0,6.8,1.6);K.window(-hw+.12,6.0,PI/2,1.4,1.2,1.7);K.window(-1.6,.12,0,1.6,1.1,1.6);K.art(-1.2,7.39,PI,1.2,.8,1.9);K.shelf(.35,5.0,-PI/2,2.0,2.1);
    K.kitchen(hw-.05,3.0,-PI/2,[['fridge',.8],['cab',.9],['sink',1.4],['cab',.7],['stove',.8],['cab',1.0]],'#f2eee6');K.kitchen(4.6,.05,0,[['cab',1.0],['cab',1.0],['cab',1.0]],'#f2eee6');
    K.table(5.2,4.4,0,2.2,1.0,.92,'#e8dfd0');for(const x of [4.4,5.2,6.0])K.chair(x,3.4,0);K.table(3.8,5.9,0,2.0,.9,.76);K.chair(3.2,5.0,0);K.chair(4.4,5.0,0);K.chair(3.2,6.8,PI);K.chair(4.4,6.8,PI);K.window(hw-.12,6.6,-PI/2,1.3,1.1,1.7);
    K.bed(-5.0,D-.05,PI,1.8,'#3d5a80');K.stand(-6.35,D-.05,PI);K.stand(-3.65,D-.05,PI);K.wardrobe(-hw+.03,10.0,PI/2,2.2);K.rug(-5.0,9.6,0,2.8,2.4,'#dfe7ee');K.art(-1.12,9.2,-PI/2,.9,.7,1.7);
    K.rug(1.1,9.75,0,4.0,4.3,'#c3d1d8');K.vanity(1.1,D-.05,PI,1.0);K.toilet(-.4,7.62,0);K.tub(3.0,10.0,-PI/2,1.7);K.hang(-.87,10.6,PI/2,2);
    K.desk(6.5,11.55,PI,1.6);K.shelf(hw-.03,9.0,-PI/2,1.8,2.1);K.sofa(4.3,7.62,0,1.7);K.plant(8.0,7.9,1.1);K.art(3.32,10.0,PI/2,.8,.6,1.7);
    K.light(-4,2.7,3.5,S.light,1.3,15);K.light(4.5,2.7,3.5,S.light,1.2,14);K.light(-5,2.7,9.8,S.light,.9,10);K.light(1,2.7,9.8,0xffffff,.8,8);K.light(6,2.7,9.8,S.light,.8,10);
    if(window.FD){FD.bath(E,-1,3.2,7.5,D,[['S',1.1,1.0]],S,1.6);K.shoes(-1.3,.12,0,.9);K.towelRail(3.09,8.4,-PI/2,.5)}}
  else if(id==='house2'){ // ----- Lagoon house: timber lodge, long open living room round a stone fireplace, kitchen and dining east, two bedrooms and a bath across the back -----
    K.wallX(8.2,-hw,hw,[[-5.2,1.1],[0,1.0],[5.0,1.1]]);K.wallZ(-2.6,8.2,D,[]);K.wallZ(2.6,8.2,D,[]);
    K.fire(-3.2,.02,0,2.4);K.rug(-3.4,4.2,0,5.4,3.6,'#6a3a2a');K.sofa(-3.4,6.9,PI,2.8);K.sofa(-.6,4.0,-PI/2,2.0);K.sofa(-6.4,6.6,PI-.4,1.1);K.table(-3.4,4.3,0,1.4,.8,.4);
    K.tv(-hw+.1,5.0,PI/2,1.3);K.plant(-hw+.5,1.0,1.3);K.shelf(-hw+.03,2.6,PI/2,1.6,2.1);K.lamp(-.9,7.2,1.5);K.window(-hw+.12,7.5,PI/2,.9,1.3,1.7);K.window(-.4,.12,0,1.3,1.2,1.6);K.art(2.0,.06,0,.9,.7,1.9);
    K.kitchen(hw-.05,2.6,-PI/2,[['fridge',.8],['cab',1.0],['sink',1.4],['cab',.6],['stove',.8]],'#9a8566');K.table(4.6,5.9,0,2.6,1.1,.76);for(const x of [3.6,4.6,5.6]){K.chair(x,4.7,0);K.chair(x,7.1,PI)}K.chandelier(4.6,5.9,2.4,.5);K.window(hw-.12,6.6,-PI/2,1.2,1.2,1.7);
    K.bed(-5.2,D-.05,PI,1.7,'#8a4b2a');K.stand(-6.5,D-.05,PI);K.stand(-3.9,D-.05,PI);K.wardrobe(-hw+.03,10.6,PI/2,2.0);K.rug(-5.2,10.5,0,2.6,2.2,'#d8c9a8');K.art(-2.72,10.4,-PI/2,.8,.6,1.7);
    K.bed(5.6,D-.05,PI,1.3,'#2f5d45');K.stand(4.6,D-.05,PI);K.wardrobe(hw-.03,10.8,-PI/2,1.6);K.desk(3.1,9.4,PI/2,1.3);K.art(2.72,11.6,PI/2,.8,.6,1.7);
    K.rug(0,10.6,0,5.0,4.6,'#c3d1d8');K.vanity(0,D-.05,PI,1.0);K.toilet(-1.7,8.32,0);K.tub(2.45,11.0,-PI/2,1.7);K.shower(-1.9,D-.05,PI,1.0);
    K.light(-3.4,2.8,4.4,S.light,1.4,15);K.light(5,2.8,4.5,S.light,1.2,13);K.light(-5,2.8,10.6,S.light,.9,10);K.light(5,2.8,10.6,S.light,.9,10);K.light(0,2.8,10.5,0xffffff,.8,8);
    if(window.FD){FD.bath(E,-2.6,2.6,8.2,D,[['S',0,1.0]],S,1.6);K.shoes(-1.4,.12,0,.9);K.towelRail(2.49,9.3,-PI/2,.5)}}
  else{                    // ----- Island mansion: premium villa, great room with a grand fireplace and a piano, dining and kitchen with a bar island, master suite with an en-suite, guest room, study -----
    K.wallX(8.5,-hw,hw,[[-8.0,1.3],[-1.0,1.3],[2.2,1.2],[6.0,1.3]]);K.wallZ(-4.5,8.5,D,[]);K.wallZ(4.5,8.5,D,[]);K.wallZ(-.1,8.5,D,[]);
    K.fire(-hw+.02,4.2,PI/2,3.0);K.rug(-8.6,4.3,0,7.0,5.0,'#6d5a3c');K.cornerSofa(-8.6,7.6,PI,3.2,2.4);K.sofa(-5.9,4.2,-PI/2,1.1);K.table(-8.6,4.3,0,1.8,1.0,.38,'#2a2418');K.tv(-8.6,.08,0,2.2);K.piano(-11.7,1.6,-PI/2);
    K.chandelier(-8.6,4.3,3.0,.9);K.plant(-hw+.7,7.9,1.6);K.window(-hw+.12,7.4,PI/2,1.6,1.6,1.9);K.art(-11.4,.06,0,1.4,.9,2.4);K.art(-5.4,.06,0,1.4,.9,2.4);K.lamp(-5.2,7.6,1.7);
    K.table(5.8,3.0,0,3.6,1.2,.76,'#3a2a1c');for(const x of [4.7,5.8,6.9]){K.chair(x,1.7,0);K.chair(x,4.3,PI)}K.chair(3.55,3.0,PI/2);K.chair(8.05,3.0,-PI/2);K.chandelier(5.8,3.0,2.9,.6);
    K.kitchen(hw-.05,4.3,-PI/2,[['fridge',.9],['cab',1.0],['sink',1.6],['cab',.8],['stove',1.0],['cab',1.0]],'#f4f1ea');K.table(10.2,4.3,PI/2,3.0,1.1,.92,'#e4dccd');for(const z of [3.2,4.3,5.4])K.chair(9.05,z,PI/2);
    K.plant(-1.6,.8,1.4);K.plant(1.8,.8,1.4);K.art(2.4,.06,0,1.1,.8,2.2);K.window(10.2,.12,0,2.0,1.4,1.9);
    K.bed(-8.6,D-.05,PI,2.0,'#c9a24a');K.stand(-10.2,D-.05,PI);K.stand(-7.0,D-.05,PI);K.wardrobe(-hw+.03,10.6,PI/2,3.0);K.rug(-8.6,12.4,0,3.4,2.8,'#cfc3a8');K.sofa(-4.75,12.4,-PI/2,1.8);K.chandelier(-8.6,12.4,3.0,.5);K.art(-4.62,10.2,-PI/2,1.0,.7,1.9);K.window(-8.6,D-.12,PI,1.8,.9,2.7);
    K.rug(-2.3,12.2,0,4.2,7.3,'#c3d1d8');K.vanity(-3.4,D-.05,PI,1.0);K.vanity(-2.2,D-.05,PI,1.0);K.tub(-4.38,10.5,PI/2,1.9);K.toilet(-3.3,8.62,0);K.shower(-.8,D-.05,PI,1.0);
    K.bed(2.2,D-.05,PI,1.5,'#6f8fa8');K.stand(1.0,D-.05,PI);K.stand(3.4,D-.05,PI);K.wardrobe(4.42,10.5,-PI/2,1.8);K.rug(2.0,12.6,0,2.4,2.0,'#d8dfe6');
    K.desk(8.5,15.5,PI,1.8);K.shelf(hw-.03,11.5,-PI/2,2.4,2.2);K.sofa(10.0,8.62,0,2.0);K.plant(12.3,9.3,1.4);K.art(4.62,12.4,PI/2,1.0,.7,1.8);
    K.light(-8.6,3.4,4.4,S.light,1.6,18);K.light(6.5,3.4,3.2,S.light,1.4,16);K.light(-8.6,3.4,12.4,S.light,1.1,12);K.light(2.2,3.4,12.4,S.light,.9,10);K.light(-2.2,3.4,12.2,0xffffff,.9,9);K.light(8.5,3.4,12,0xffffff,1.0,12);K.light(0,3.4,5.5,S.light,1.0,14);
    if(window.FD){FD.bath(E,-4.5,-.1,8.5,D,[['S',-1.0,1.3]],S,1.8);K.towelRail(-.21,10.2,-PI/2,.5)}}
  E.fin();const pg=E.P.build();if(pg)grp.add(new THREE.Mesh(pg,MATS.props));
  INDOORS.push({name:'house',title:def.name,sub:def.cls,floor:'wood',exp:S.exp,lights:L.filter(l=>!l.userData.fire&&!l.userData.tv),test:(x,z)=>x>ox-hw-1&&x<ox+hw+1&&z>oz-1&&z<oz+D+1,ceil:()=>INT_Y+H-.3});
  grp.visible=false;const hs=HSTATE.cur;
  wallSeg(ox-hw-1,oz-.6,ox+hw+1,oz-.6,.3,INT_Y-1,INT_Y+H+1);       // nothing behind the front door
  return {grp,spawn:[ox,oz+1.9],spawnYaw:0,title:def.name,sub:def.cls+' · your house',peds:[],hs,ox,oz,onEnter(){PORTAL.peds=[]}}}

// ---------- per frame: flames, firelight, TV picture, running water (only for the house you are in) ----------
function hsTick(dt){HSTATE.t=(HSTATE.t||0)+dt;const B=typeof PORTAL!=='undefined'&&PORTAL.cur==='house'?PORTAL.active:null;if(!B||!B.hs)return;const h=B.hs,t=HSTATE.t;
  if(player.z<B.oz+.2&&Math.abs(player.x-B.ox)<.8&&!player.sit&&!HSTATE.leaving){HSTATE.leaving=1;PORTAL.exit();setTimeout(()=>{HSTATE.leaving=0},1800)}      // walk out through the front door
  for(const f of h.fires){for(const m of f.flames){const i=m.userData.i;m.visible=f.on;m.scale.set(1+Math.sin(t*9+i*2)*.12,1+Math.sin(t*13+i)*.22,1+Math.cos(t*8+i)*.12)}
    if(f.light)f.light.intensity=f.on?(1.5+Math.sin(t*11)*.25+Math.sin(t*17.3)*.15)*(typeof indoorAmt!=='undefined'?indoorAmt:1):0}
  for(const v of h.tvs){v.t+=dt;if(v.on&&v.t>.22){v.t=0;const g=v.g,s=Math.floor(t*3)%6,cols=['#1a73e8','#e8501a','#2ab06a','#e8c21a','#8a3ad0','#e8e8ee'];g.fillStyle=cols[s];g.fillRect(0,0,160,90);
      for(let i=0;i<7;i++){g.fillStyle=cols[(s+i+2)%6];g.globalAlpha=.55;g.fillRect(((i*23+t*40)%190)-20,8+(i*13)%60,34,16+(i*7)%20);g.globalAlpha=1}g.fillStyle='rgba(255,255,255,.14)';g.fillRect(0,0,160,6);v.tex.needsUpdate=true}
    if(v.light)v.light.intensity=v.on?.9*(typeof indoorAmt!=='undefined'?indoorAmt:1):0}
  for(const w of h.taps)w.m.visible=HSTATE.t<w.until}

// =====================================================================================================
// exteriors on the island: four different houses (cabin of logs · bright coastal villa · stone-and-timber lodge · modern mansion)
// all in the house's local frame: +z is the front (facing the island centre), door at x=0, footprint W x D as inside
// =====================================================================================================
const HSX={mats:{}};
function hsM(c,r,m,e){if(e)return XM(c,r==null?.85:r,m||0,e);const k=c+'|'+r+'|'+m;return HSX.mats[k]||(HSX.mats[k]=XM(c,r==null?.85:r,m||0))}
function hsExterior(g,def,id){
  const W=def.W,D=def.D,H=def.H,f=D/2,obs=[],cols=[];
  const bx=(x,y,z,w,h,d,mat,ry,rx,rz)=>{const m=xb(g,w,h,d,x,y,z,mat,rx,ry,rz);m.receiveShadow=true;return m};
  const cyl=(x,y,z,r,h,mat,axis,seg)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||12),mat);m.position.set(x,y,z);if(axis==='x')m.rotation.z=Math.PI/2;else if(axis==='z')m.rotation.x=Math.PI/2;m.castShadow=true;g.add(m);return m};
  // gable roof with its ridge along x: two slabs and a ridge cap; the triangular end walls sit under it
  const gable=(len,span,rise,over,y,mat,thick)=>{const hs=span/2+over,sl=Math.hypot(hs,rise),a=Math.atan2(rise,hs);thick=thick||.16;
    for(const s of [-1,1])bx(0,y+rise/2+thick/2,s*hs/2,len,thick,sl+.06,mat,0,s*a);bx(0,y+rise+thick*.9,0,len,.12,.3,mat)};
  const tri=(span,rise,thick,mat,x,y)=>{const sh=new THREE.Shape();sh.moveTo(-span/2,0);sh.lineTo(span/2,0);sh.lineTo(0,rise);sh.closePath();const geo=new THREE.ExtrudeGeometry(sh,{depth:thick,bevelEnabled:false});geo.rotateY(Math.PI/2);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,0);m.castShadow=true;g.add(m)};
  // window with a frame; ry=0 faces the front (z), ry=±1 faces the side wall at x=±W/2
  const win=(x,y,z,w,h,ry,frame,glass)=>{bx(x,y,z,ry?.1:w+.2,h+.2,ry?w+.2:.1,frame);bx(x+(ry?ry*.03:0),y,z+(ry?0:.03),ry?.1:w,h,ry?w:.1,glass)};
  const glassM=hsM(0x2a4a66,.1,.4,{emissive:new THREE.Color(0x1a3a5a),emissiveIntensity:.35});
  if(id==='house0'){          // ---------- beach cabin: log walls, gable roof, stone chimney, porch ----------
    const wood=hsM(0xa9743d,.9),wood2=hsM(0x93612f,.9),dark=hsM(0x5a3b22,.8),stone=hsM(0x8c8176,.95),roof=hsM(0x4a3326,.85),deck=hsM(0xb89968,.9),red=hsM(0xb5422d,.8),brass=hsM(0xd8c07a,.4,.8);
    bx(0,.2,0,W+.3,.4,D+.3,stone);
    const rows=Math.floor((H-.4)/.3),H0=.4+rows*.3,gx=new THREE.CylinderGeometry(.16,.16,W+.5,10),gz=new THREE.CylinderGeometry(.16,.16,D+.5,10);
    for(let r=0;r<rows;r++){const y=.55+r*.3,mt=r%2?wood:wood2;
      for(const s of [-1,1]){let m=new THREE.Mesh(gx,mt);m.rotation.z=Math.PI/2;m.position.set(0,y,s*f);m.castShadow=true;g.add(m);m=new THREE.Mesh(gz,mt);m.rotation.x=Math.PI/2;m.position.set(s*W/2,y,0);m.castShadow=true;g.add(m)}}
    const rise=2.3;tri(D+1.8,rise,.3,wood,-W/2+.1,H0);tri(D+1.8,rise,.3,wood,W/2-.4,H0);gable(W+.5,D,rise,.9,H0,roof);
    const ch=H0+rise+.8;bx(W*.3,ch/2,-D*.18,1.1,ch,1.1,stone);bx(W*.3,ch+.1,-D*.18,1.3,.2,1.3,stone);
    bx(0,.1,f+1.5,W*.5,.14,2.7,deck);for(const s of [-1,1])cyl(s*W*.25,(H0+.1)/2,f+2.7,.12,H0+.1,dark);bx(0,H0+.08,f+1.55,W*.5+.7,.14,3.1,roof,0,.08);
    bx(0,.04,f+3.25,2.2,.08,.6,deck);
    bx(0,1.05,f+.18,1.2,2.1,.12,dark);bx(0,1.55,f+.25,.7,.9,.06,glassM);cyl(.45,1.0,f+.28,.04,.1,brass,'z');
    for(const s of [-1,1]){const x=s*W*.32;bx(x,1.5,f+.18,1.6,1.2,.1,dark);bx(x,1.5,f+.24,1.4,1.0,.08,glassM);bx(x-s*1.0,1.5,f+.2,.4,1.2,.06,red);bx(x+s*1.0,1.5,f+.2,.4,1.2,.06,red);bx(x,.95,f+.3,1.8,.18,.3,dark);
      for(let k=0;k<5;k++)bx(x-.6+k*.3,1.12,f+.3,.14,.22,.14,hsM([0xe86a8a,0xf2c14e,0xe8e4da,0xd2451d,0xf2c14e][k],.8))}
    for(const s of [-1,1]){bx(s*(W/2+.2),1.5,-D*.12,.1,1.1,1.5,dark);bx(s*(W/2+.22),1.5,-D*.12,.08,.9,1.3,glassM)}
    for(let k=0;k<3;k++)for(let j=0;j<4;j++)cyl(-W/2-.5-k*.34+.17,.2+j*.3,-D*.35,.14,1.8,wood2,'z',8);       // log pile against the west wall
    obs.push([-W/2-.9,-D*.35,.5,.95,0])}
  else if(id==='house1'){     // ---------- sea villa: white cube, flat roof, big glass wall, terrace with pergola ----------
    const white=hsM(0xf4f1ea,.8),cedar=hsM(0xb08050,.85),blue=hsM(0x3d5a80,.6),roof=hsM(0x56606b,.7),deck=hsM(0xcaa772,.85),rail=hsM(0xdfe6ec,.4,.4),cush=hsM(0xe8e4da,.9),red=hsM(0xcc3a2e,.8);
    bx(0,H/2,0,W,H,D,white);bx(0,H+.18,0,W+1.6,.36,D+1.6,roof);bx(0,H-.1,0,W+.04,.12,D+.04,blue);
    bx(-W*.32,H/2,f+.07,W*.2,H-.04,.14,cedar);for(let k=0;k<6;k++)bx(-W*.32,.4+k*.5,f+.15,W*.2,.02,.02,hsM(0x6b4a2a,.9));
    const gx0=1.4,gx1=W/2-.5,gc=(gx0+gx1)/2,gw=gx1-gx0;bx(gc,1.55,f+.06,gw,2.7,.1,glassM);for(let k=0;k<=6;k++)bx(gx0+k*gw/6,1.55,f+.12,.06,2.7,.06,white);
    bx(0,1.05,f+.1,1.2,2.1,.12,blue);cyl(.45,1.0,f+.2,.04,.1,rail,'z');
    bx(0,.07,f+2.3,W*.78,.14,4.3,deck);for(const s of [-1,1])bx(s*W*.39,.6,f+2.3,.08,.9,4.3,rail);bx(0,.6,f+4.45,W*.78,.08,.08,rail);bx(0,.3,f+4.45,W*.78,.04,.04,rail);
    for(const s of [-1,1])for(const z of [f+.5,f+4.2])cyl(s*W*.34,1.4,z,.09,2.7,white);for(let k=0;k<6;k++)bx(0,2.78,f+.5+k*.74,W*.7,.1,.12,white);bx(0,2.7,f+.5,W*.7,.1,.14,white);bx(0,2.7,f+4.2,W*.7,.1,.14,white);
    for(const s of [-1,1])bx(s*(W/2+.07),1.5,0,.14,1.3,D*.45,glassM);
    for(let k=0;k<4;k++){cyl(-W*.3+k*1.6,.25,f+3.6,.28,.5,hsM(0xa65a3a,.9));cyl(-W*.3+k*1.6,.7,f+3.6,.3,.5,hsM(0x3f9a46,.9),null,6)}
    bx(W*.2,.28,f+2.0,2.6,.34,.9,cush);bx(W*.2,.62,f+1.6,2.6,.45,.2,cush);bx(W*.2+3.0,.18,f+2.0,.8,.26,.8,deck);                        // outdoor sofa
    bx(W*.2+1.4,.7,f+3.2,.06,1.4,.06,red);bx(W*.2+1.4,1.4,f+3.2,1.9,.05,1.9,red,0,.15);cyl(W*.2+1.4,.7,f+3.2,.04,1.4,white)}                 // beach umbrella
  else if(id==='house2'){     // ---------- lodge: stone base, dark timber, steep gable roof, dormer, big chimney, log porch ----------
    const stone=hsM(0x8a8277,.95),wood=hsM(0x6a4426,.9),wood2=hsM(0x5a381d,.9),roof=hsM(0x35302c,.85),deck=hsM(0x7a5530,.9),cream=hsM(0xe6d6bb,.85);
    bx(0,.6,0,W+.2,1.2,D+.2,stone);bx(0,(1.2+H)/2,0,W,H-1.2,D,wood);for(let k=0;k<Math.floor((H-1.2)/.4);k++){bx(0,1.35+k*.4,f+.02,W+.04,.04,.04,wood2);bx(0,1.35+k*.4,-f-.02,W+.04,.04,.04,wood2)}
    const rise=3.6;tri(D+2,rise,.3,wood,-W/2+.05,H);tri(D+2,rise,.3,wood,W/2-.35,H);gable(W+.4,D,rise,1.0,H,roof,.2);
    for(const s of [-1,1])win(s*(W/2+.02),H+1.3,0,1.2,1.1,s,cream,glassM);
    const ch=H+rise+1.3;bx(-W*.32,ch/2,-D*.22,1.6,ch,1.4,stone);bx(-W*.32,ch+.12,-D*.22,1.9,.24,1.7,stone);
    bx(W*.22,H+1.15,f-.2,2.6,2.0,1.8,wood);bx(W*.22,H+2.25,f-.1,3.0,.14,2.4,roof,0,.15);win(W*.22,H+1.15,f+.72,1.2,1.0,0,cream,glassM);                          // dormer
    bx(0,.1,f+1.7,W*.74,.16,3.2,deck);for(let k=0;k<4;k++)cyl(-W*.33+k*W*.22,(H+.2)/2,f+3.1,.14,H-.2,wood2);bx(0,H-.1,f+1.9,W*.8,.18,3.6,roof,0,.1);bx(0,H-.2,f+3.1,W*.78,.22,.22,wood2);
    bx(0,.05,f+3.55,3.0,.1,.6,deck);bx(0,.1,f+4.0,2.4,.08,.5,deck);
    bx(0,1.1,f+.1,1.8,2.2,.14,wood2);bx(-.46,1.1,f+.18,.8,1.9,.08,cream);bx(.46,1.1,f+.18,.8,1.9,.08,cream);bx(-.46,1.5,f+.24,.5,.8,.06,glassM);bx(.46,1.5,f+.24,.5,.8,.06,glassM);
    for(const s of [-1,1]){const x=s*W*.34;win(x,1.9,f+.04,1.8,1.4,0,cream,glassM);bx(x,1.1,f+.3,2.0,.16,.34,wood2);for(let k=0;k<4;k++)bx(x-.7+k*.47,1.32,f+.3,.2,.28,.2,hsM([0xf2c14e,0xe86a8a,0xe8e4da,0xd2451d][k],.8))}
    for(const s of [-1,1])for(const z of [-D*.2,D*.2])win(s*(W/2+.02),1.9,z,1.4,1.3,s,cream,glassM);
    for(let k=0;k<5;k++)bx(W/2+.45+(k%2)*.1,.2+Math.floor(k/2)*.3,-D*.25,.35,.28,2.4-k*.05,wood2);obs.push([W/2+.5,-D*.25,.4,1.2,0]);                           // wood pile
    cyl(-W*.12,.25,f+4.8,.35,.5,hsM(0x6b6a68,.95),null,10)}
  else{                       // ---------- mansion: modern white-and-gold villa with portico, glass wings, loft volume, pool ----------
    const cream=hsM(0xefe8dd,.7),gold=hsM(0xc9a24a,.35,.7),white=hsM(0xfaf7f1,.6),dark=hsM(0x20252b,.5,.4),marble=hsM(0xd9d2c4,.3),roof=hsM(0x9b9487,.7),water=XM(0x2fb4d6,.12,0,{emissive:new THREE.Color(0x0a6c8a),emissiveIntensity:.45}),hedge=hsM(0x2f6b34,.95),door=hsM(0x3a2a1c,.5),stoneP=hsM(0x6b6a68,.9),green=hsM(0x3f9a46,.95);
    bx(0,H/2,0,W,H,D,cream);bx(0,H+.18,0,W+2.2,.36,D+2.2,white);bx(0,H+.4,0,W+2.24,.07,D+2.24,gold);bx(0,H-.3,f+.04,W+.04,.08,.1,gold);
    for(const s of [-1,1]){const x=s*W*.3;bx(x,1.95,f+.06,W*.3,3.5,.1,glassM);for(let k=0;k<=5;k++)bx(x-W*.15+k*W*.06,1.95,f+.12,.07,3.5,.07,dark);bx(x,.12,f+.7,W*.34,.12,1.3,marble)}
    bx(0,H+2.1,-1.0,14,3.4,9.5,white);bx(0,H+3.95,-1.0,15.6,.34,11,roof);bx(0,H+4.17,-1.0,15.6,.06,11,gold);bx(0,H+2.1,3.9,10,2.6,.1,glassM);for(let k=0;k<=5;k++)bx(-5+k*2,H+2.1,3.96,.07,2.6,.07,dark);
    bx(0,.1,f+2.6,10.6,.2,5.4,marble);bx(0,.05,f+5.6,10.6,.1,.5,marble);
    bx(0,H+.3,f+2.8,11.2,.5,5.8,white);bx(0,H+.58,f+2.8,11.3,.08,5.9,gold);
    for(const x of [-4.4,-1.6,1.6,4.4]){cyl(x,H/2+.1,f+4.9,.36,H,white,null,16);cyl(x,.2,f+4.9,.5,.3,marble,null,16);cyl(x,H+.05,f+4.9,.46,.2,gold,null,16);cols.push([x,f+4.9,.5])}
    bx(0,1.15,f+.12,2.6,2.3,.14,door);bx(-.64,1.15,f+.2,1.1,2.1,.08,gold);bx(.64,1.15,f+.2,1.1,2.1,.08,gold);cyl(-.2,1.1,f+.28,.04,.5,gold,'x');cyl(.2,1.1,f+.28,.04,.5,gold,'x');
    for(const s of [-1,1]){bx(s*(W/2+.07),2.0,0,.14,2.0,2.6,glassM);cyl(s*3.2,.5,f+6.4,.4,1.0,stoneP,null,10);cyl(s*3.2,1.3,f+6.4,.55,.6,green,null,8)}
    const px=-10,pz=f+5.5;bx(px,.14,pz,6.8,.28,4.0,marble);bx(px,.27,pz,6.0,.04,3.2,water);obs.push([px,pz,3.4,2.0,0]);                          // pool + loungers
    for(const x of [px-1.6,px,px+1.6]){bx(x,.22,pz+2.9,.7,.1,1.8,white);bx(x,.45,pz+2.2,.7,.4,.1,white,0,-.9)}
    for(const s of [-1,1])for(let k=0;k<3;k++)bx(s*(W/2-3.2),.4,f+2.0+k*1.8,1.1,.8,1.1,hedge)}
  return {h:id==='house3'?H+4.2:id==='house2'?H+3.8:id==='house0'?H+2.6:H+.6,obs,cols}}

// the plaza in the middle, paths, lamps, palms and beach furniture; then the houses with their price tags / doors
function hsIsland(ex,world,cx,cz,top,owned){
  const stone=hsM(0xc9c2b2,.85),paving=hsM(0xb8ad98,.9),pal=hsM(0x7a5230,.9),leaf=hsM(0x2f8a3a,.8),lampM=hsM(0xfff0c8,.4,0,{emissive:new THREE.Color(0xffe2a0),emissiveIntensity:1.2}),post=hsM(0x2a2a2c,.6,.5),wat=()=>XM(0x66d0ee,.1,0,{emissive:new THREE.Color(0x1a8aa8),emissiveIntensity:.5});
  const put=(m,x,y,z)=>{m.position.set(cx+x,top+y,cz+z);m.castShadow=true;m.receiveShadow=true;world.add(m);return m};
  put(new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.1,32),paving),0,.05,0);                                                    // plaza and fountain
  put(new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.5,.55,24),stone),0,.3,0);put(new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,.1,24),wat()),0,.57,0);
  put(new THREE.Mesh(new THREE.CylinderGeometry(.35,.5,1.5,12),stone),0,1.2,0);put(new THREE.Mesh(new THREE.CylinderGeometry(1.1,.6,.35,16),stone),0,2.0,0);put(new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,.08,16),wat()),0,2.2,0);
  STATIC_CIR.push(cx,cz,2.5);
  const DEFS=[['house0',15000],['house1',38000],['house2',85000],['house3',190000]],RING=[19.5,21.5,21.5,23];
  DEFS.forEach(([id,price],i)=>{const def=HOUSE_DEF[id],name=def.name,a=Math.PI/4+i*Math.PI/2,R=RING[i],hx=cx+Math.cos(a)*R,hz=cz+Math.sin(a)*R,th=Math.atan2(cx-hx,cz-hz),W=def.W,D=def.D,sn=Math.sin(th),cs=Math.cos(th);
    const g=new THREE.Group();g.position.set(hx,top,hz);g.rotation.y=th;const ext=hsExterior(g,def,id);world.add(g);
    const wp=(lx,lz)=>[hx+lx*cs+lz*sn,hz-lx*sn+lz*cs];
    LOW_OBB.push(hx,hz,W/2,D/2,cs,-sn);for(const [lx,lz,hw,hd,ry] of ext.obs){const p=wp(lx,lz);LOW_OBB.push(p[0],p[1],hw,hd,Math.cos(th+ry),-Math.sin(th+ry))}
    for(const [lx,lz,r] of ext.cols){const p=wp(lx,lz);STATIC_CIR.push(p[0],p[1],r)}
    // paved path from the porch to the plaza, with lamps on both sides
    const out=D/2+(id==='house3'?6.2:id==='house1'?5.0:4.2),pl=R-out-5.0;
    if(pl>1){const pm=new THREE.Mesh(new THREE.BoxGeometry(2.2,.08,pl),paving);pm.position.set(hx+sn*(out+pl/2),top+.04,hz+cs*(out+pl/2));pm.rotation.y=th;pm.receiveShadow=true;world.add(pm);
      for(const s of [-1,1]){const q=[hx+sn*(out+pl*.5)+cs*s*1.7,hz+cs*(out+pl*.5)-sn*s*1.7];const p1=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,2.2,6),post);p1.position.set(q[0],top+1.1,q[1]);world.add(p1);const l1=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),lampM);l1.position.set(q[0],top+2.3,q[1]);world.add(l1)}}
    const H={id,name,price,owned:owned.has(id),tag:null};ex.houses.push(H);
    const retag=()=>{if(H.tag){g.remove(H.tag);H.tag.material.map.dispose();H.tag.material.dispose()}
      H.tag=labelSprite([name+' · '+def.cls,H.owned?'OWNED · walk in':WALLET.fmt(price)],{w:640,h:200,sizes:[50,80],color:H.owned?'#fff':'#0b1b22',bg:H.owned?'rgba(46,160,90,.95)':'rgba(242,193,78,.95)',round:36,scale:3.0});H.tag.position.set(0,ext.h+2.4,0);g.add(H.tag)};
    retag();
    INTERACT.push({x:hx+sn*(D/2+2.4),z:hz+cs*(D/2+2.4),r:6.5,get label(){return H.owned?'Enter your '+name.toLowerCase():'Buy the '+name+' · '+WALLET.fmt(price)},cond:()=>!PORTAL.cur&&!player.sit&&!DRIVE.on,
      fn:()=>{if(H.owned){PORTAL.enter('house',{x:hx+sn*(out-.4),z:hz+cs*(out-.4),yaw:th},{id});return}
        if(WALLET.pay(price,name)){H.owned=true;S.houses=(S.houses||[]).concat(id);saveS();retag();toast('You bought the '+name,WALLET.fmt(price)+' paid · '+WALLET.fmt()+' left · walk in through the door')}}})});
  // palms around the beach (clear of the houses) and loungers with umbrellas between them
  for(let k=0;k<4;k++)for(const d of [-.2,.2]){const a=k*Math.PI/2+d,R=31.5,g=new THREE.Group();g.position.set(cx+Math.cos(a)*R,top,cz+Math.sin(a)*R);
    const t=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,4.6,6),pal);t.position.y=2.3;t.rotation.z=.14;t.castShadow=true;g.add(t);
    for(let j=0;j<6;j++)xb(g,.5,.08,2.6,Math.cos(j*1.047)*1.3+.3,4.6,Math.sin(j*1.047)*1.3,leaf,.45,-j*1.047+1.571,0);world.add(g)}
  for(let k=0;k<4;k++){const a=k*Math.PI/2,R=27,g=new THREE.Group();g.position.set(cx+Math.cos(a)*R,top,cz+Math.sin(a)*R);g.rotation.y=-a+Math.PI/2;
    const umb=hsM([0xd2451d,0x2f7d9b,0xf2c14e,0x3f9a46][k],.8);xb(g,.06,2.4,.06,0,1.2,0,post);xb(g,2.6,.06,2.6,0,2.35,0,umb).rotation.y=.78;
    for(const s of [-1,1]){xb(g,.7,.12,1.8,s*.8,.28,.4,hsM(0xf4efe4,.85));xb(g,.7,.4,.1,s*.8,.55,-.5,hsM(0xf4efe4,.85),-.5)}world.add(g)}
}
