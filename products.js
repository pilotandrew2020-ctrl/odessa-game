// products.js — real 3D shelf goods (cartons, bottles, cans, bags, jars, loaves, fruit …) with printed labels, and animated shop cashiers.
//  PRD.batch()                         → collects product instances for one interior; B.flush(group) turns them into a handful of InstancedMeshes
//  PRD.row(B,cat,x,y,z,dx,dz,len,yaw)  → a facing row of goods of one category along a line in WORLD coordinates
//  PRD.cashier(group,x,y,z,yaw,brand)  → a blocky shop assistant in an apron that scans goods, greets customers and says thanks
// Everything shares ONE label atlas texture (drawn on a canvas the first time a shop is built) and a cached geometry per product.
const PRD={designs:[],ready:false,cats:{},cashiers:[],geo:{},_s:1};
(function(){
  const D=PRD.designs;
  // helpers used by the label painters (canvas 240x256 usable; the 16 px strip on the right stays plain for the sides of the pack)
  const font=(sz,w)=>(w||800)+' '+sz+'px "Golos Text",Arial,sans-serif';
  const txt=(x,s,sz,col,cx,cy,w,maxw)=>{x.font=font(sz,w);x.textAlign='center';x.textBaseline='middle';x.fillStyle=col;let k=sz;if(maxw){const m=x.measureText(s).width;if(m>maxw){k=sz*maxw/m;x.font=font(k,w)}}x.fillText(s,cx,cy)};
  const rr=(x,a,b,w,h,r,col)=>{x.fillStyle=col;x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();x.fill()};
  const ell=(x,cx,cy,rx,ry,col,rot)=>{x.fillStyle=col;x.beginPath();x.ellipse(cx,cy,rx,ry,rot||0,0,7);x.fill()};
  const grad=(x,c1,c2)=>{const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;x.fillRect(0,0,256,256)};
  const icons={
    cow(x,cx,cy,s,c){ell(x,cx-30*s,cy,26*s,15*s,c);ell(x,cx+10*s,cy-6*s,20*s,13*s,c);ell(x,cx+24*s,cy+8*s,14*s,10*s,c)},
    wave(x,cx,cy,s,c){x.strokeStyle=c;x.lineWidth=9*s;x.lineCap='round';for(let k=0;k<2;k++){x.beginPath();x.moveTo(cx-60*s,cy+k*22*s);x.bezierCurveTo(cx-30*s,cy-24*s+k*22*s,cx+10*s,cy+30*s+k*22*s,cx+60*s,cy-8*s+k*22*s);x.stroke()}},
    sun(x,cx,cy,s,c){ell(x,cx,cy,22*s,22*s,c);x.strokeStyle=c;x.lineWidth=5*s;for(let k=0;k<12;k++){const a=k/12*6.283;x.beginPath();x.moveTo(cx+Math.cos(a)*30*s,cy+Math.sin(a)*30*s);x.lineTo(cx+Math.cos(a)*42*s,cy+Math.sin(a)*42*s);x.stroke()}},
    leaf(x,cx,cy,s,c){x.fillStyle=c;x.beginPath();x.moveTo(cx-40*s,cy+20*s);x.bezierCurveTo(cx-30*s,cy-40*s,cx+30*s,cy-40*s,cx+44*s,cy-30*s);x.bezierCurveTo(cx+40*s,cy+20*s,cx,cy+36*s,cx-40*s,cy+20*s);x.fill()},
    cross(x,cx,cy,s,c){rr(x,cx-9*s,cy-30*s,18*s,60*s,4*s,c);rr(x,cx-30*s,cy-9*s,60*s,18*s,4*s,c)},
    fruit(x,cx,cy,s,c){ell(x,cx,cy+4*s,28*s,26*s,c);x.strokeStyle='#3b7a2a';x.lineWidth=5*s;x.beginPath();x.moveTo(cx,cy-20*s);x.lineTo(cx+6*s,cy-38*s);x.stroke();ell(x,cx+16*s,cy-34*s,13*s,6*s,'#4a9a32',-.5)},
    star(x,cx,cy,s,c){x.fillStyle=c;x.beginPath();for(let k=0;k<10;k++){const a=-1.5708+k*.6283,r=(k%2?14:32)*s;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}x.fill()},
    bean(x,cx,cy,s,c){ell(x,cx-18*s,cy,15*s,22*s,c,.4);ell(x,cx+18*s,cy+4*s,15*s,22*s,c,-.4);x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=3*s;x.beginPath();x.moveTo(cx-24*s,cy-14*s);x.quadraticCurveTo(cx-12*s,cy,cx-22*s,cy+14*s);x.stroke()},
    heart(x,cx,cy,s,c){x.fillStyle=c;x.beginPath();x.moveTo(cx,cy+28*s);x.bezierCurveTo(cx-60*s,cy-6*s,cx-26*s,cy-44*s,cx,cy-18*s);x.bezierCurveTo(cx+26*s,cy-44*s,cx+60*s,cy-6*s,cx,cy+28*s);x.fill()},
    drop(x,cx,cy,s,c){x.fillStyle=c;x.beginPath();x.moveTo(cx,cy-36*s);x.bezierCurveTo(cx+40*s,cy+4*s,cx+26*s,cy+36*s,cx,cy+36*s);x.bezierCurveTo(cx-26*s,cy+36*s,cx-40*s,cy+4*s,cx,cy-36*s);x.fill()},
    dots(x,cx,cy,s,c){for(let i=0;i<9;i++)ell(x,cx-50*s+(i%3)*50*s,cy-36*s+Math.floor(i/3)*36*s,9*s,9*s,c)}};
  // a generic label: gradient, top band with the maker, big title, small line, icon, bottom ribbon
  const label=o=>x=>{grad(x,o.bg,o.bg2||o.bg);
    if(o.band){rr(x,0,0,256,o.bandH||46,0,o.band);txt(x,o.brand||'',o.bs||20,o.bandTxt||'#fff',120,(o.bandH||46)/2+1,900,200)}
    if(o.icon)icons[o.icon](x,o.ix||120,o.iy||108,o.is||1,o.ic||'rgba(255,255,255,.9)');
    txt(x,o.t1,o.s1||50,o.c1||'#fff',120,o.y1||150,900,215);
    if(o.t2)txt(x,o.t2,o.s2||34,o.c2||'#fff',120,o.y2||192,800,215);
    if(o.t3){rr(x,28,206,184,34,17,o.rib||'rgba(0,0,0,.45)');txt(x,o.t3,22,o.c3||'#fff',120,224,800,170)}};
  // id, category, shape, dims [w,h,d] / [r,h], painter
  const def=(id,cat,shape,dim,paint)=>{D.push({id,cat,shape,dim,paint,i:D.length});(PRD.cats[cat]=PRD.cats[cat]||[]).push(D.length-1)};
  // ---- dairy
  def('milk25','dairy','carton',[.07,.2,.07],label({bg:'#f4f8ff',band:'#1f6fd0',brand:'ЛАНОК',icon:'cow',ic:'#2a4f9a',iy:98,is:1.1,t1:'МОЛОКО',s1:44,c1:'#1f4fa8',y1:152,t2:'2,5%',s2:40,c2:'#1f6fd0',y2:190,t3:'1 л',rib:'#1f6fd0'}));
  def('milk32','dairy','carton',[.07,.2,.07],label({bg:'#f3faea',band:'#3f9a3a',brand:'ЛАНОК',icon:'cow',ic:'#2f7a2c',iy:98,is:1.1,t1:'МОЛОКО',s1:44,c1:'#2f7a2c',y1:152,t2:'3,2%',s2:40,c2:'#3f9a3a',y2:190,t3:'1 л',rib:'#3f9a3a'}));
  def('kefir','dairy','carton',[.07,.2,.07],label({bg:'#eef4ff',band:'#7aa7e0',brand:'ЛАНОК',icon:'drop',ic:'#9fc2ee',iy:98,t1:'КЕФІР',s1:48,c1:'#264f93',y1:152,t2:'1%',s2:36,c2:'#264f93',y2:190,t3:'900 мл',rib:'#264f93'}));
  def('yog1','dairy','cup',[.04,.09],label({bg:'#ffd6e3',bg2:'#ff8fb4',icon:'fruit',ic:'#d6234f',iy:80,t1:'ЙОГУРТ',s1:36,c1:'#fff',y1:136,t2:'ПОЛУНИЦЯ',s2:26,c2:'#fff',y2:176,t3:'125 г',rib:'#d6234f'}));
  def('yog2','dairy','cup',[.04,.09],label({bg:'#ffe6c2',bg2:'#ffb347',icon:'fruit',ic:'#f08a1f',iy:80,t1:'ЙОГУРТ',s1:36,c1:'#fff',y1:136,t2:'ПЕРСИК',s2:28,c2:'#fff',y2:176,t3:'125 г',rib:'#e0701a'}));
  def('cheese','dairy','box',[.14,.05,.1],label({bg:'#ffd84a',bg2:'#f2b01e',band:'#c7861a',brand:'ГОЛЛАНДСЬКИЙ',bs:17,bandH:40,icon:'dots',ic:'#e09a12',iy:100,t1:'СИР',s1:50,c1:'#7a4a0a',y1:152,t3:'45% · 200 г',rib:'#7a4a0a'}));
  def('butter','dairy','box',[.11,.045,.06],label({bg:'#fff2c2',band:'#2a62b8',brand:'ВЕРШКОВЕ',bs:20,icon:'cow',ic:'#e8c75a',iy:96,t1:'МАСЛО',s1:46,c1:'#2a62b8',y1:150,t3:'82,5% · 180 г',rib:'#2a62b8'}));
  // ---- drinks
  def('cola','drinks','can',[.033,.122],label({bg:'#d6192b',bg2:'#a00f1c',icon:'wave',ic:'#fff',iy:78,t1:'КОЛА',s1:62,c1:'#fff',y1:150,t3:'0,33 л',rib:'rgba(0,0,0,.35)'}));
  def('lemo','drinks','bottle',[.04,.26],label({bg:'#e8f7a0',bg2:'#b6dc2a',band:'#4a8a16',brand:'ЛИМОНАД',bs:22,icon:'sun',ic:'#fff25a',iy:100,t1:'ЛИМОН',s1:46,c1:'#2f6a0a',y1:156,t3:'1,5 л',rib:'#4a8a16'}));
  def('water','drinks','bottle',[.035,.27],label({bg:'#e6f6ff',bg2:'#8fd0f5',band:'#1a8ad6',brand:'ДЖЕРЕЛО',bs:22,icon:'drop',ic:'#fff',iy:100,t1:'ВОДА',s1:50,c1:'#0d5a96',y1:156,t2:'негазована',s2:24,c2:'#0d5a96',y2:192,t3:'1,5 л',rib:'#1a8ad6'}));
  def('juiceO','drinks','carton',[.085,.2,.055],label({bg:'#ffb43a',bg2:'#ff8a1a',band:'#d4560a',brand:'САДОК',icon:'fruit',ic:'#ffd24a',iy:92,t1:'СІК',s1:46,c1:'#fff',y1:146,t2:'АПЕЛЬСИН',s2:28,c2:'#fff',y2:184,t3:'1 л',rib:'#d4560a'}));
  def('juiceA','drinks','carton',[.085,.2,.055],label({bg:'#c9ec6a',bg2:'#7cc02c',band:'#3f8a14',brand:'САДОК',icon:'fruit',ic:'#e8403a',iy:92,t1:'СІК',s1:46,c1:'#fff',y1:146,t2:'ЯБЛУКО',s2:30,c2:'#fff',y2:184,t3:'1 л',rib:'#3f8a14'}));
  def('energy','drinks','can',[.027,.15],label({bg:'#16161a',bg2:'#2a2a30',icon:'star',ic:'#39ff6a',iy:76,is:1.1,t1:'ЕНЕРГІЯ',s1:34,c1:'#39ff6a',y1:150,t3:'0,25 л',rib:'#39ff6a',c3:'#111'}));
  def('kvas','drinks','bottle',[.04,.27],label({bg:'#c48a42',bg2:'#7a4a1a',band:'#4a2a0a',brand:'ХЛІБНИЙ',bs:22,icon:'leaf',ic:'#ffd27a',iy:98,t1:'КВАС',s1:50,c1:'#fff2d6',y1:156,t3:'2 л',rib:'#4a2a0a'}));
  // ---- snacks
  def('chipsY','snacks','bag',[.16,.24,.05],label({bg:'#ffd21f',bg2:'#f0a010',band:'#d6192b',brand:'ХРУСТ',bs:26,icon:'sun',ic:'#fff',iy:104,t1:'ЧІПСИ',s1:48,c1:'#d6192b',y1:156,t2:'СИР',s2:34,c2:'#7a1a0a',y2:194,t3:'90 г',rib:'#d6192b'}));
  def('chipsR','snacks','bag',[.16,.24,.05],label({bg:'#e8412e',bg2:'#a8180e',band:'#ffd21f',brand:'ХРУСТ',bs:26,bandTxt:'#a8180e',icon:'star',ic:'#ffd21f',iy:104,t1:'ЧІПСИ',s1:48,c1:'#fff',y1:156,t2:'БЕКОН',s2:32,c2:'#ffd21f',y2:194,t3:'90 г',rib:'rgba(0,0,0,.4)'}));
  def('crack','snacks','box',[.1,.17,.04],label({bg:'#3a7ad8',bg2:'#1f4ea8',band:'#f2c14e',brand:'ХРУМ',bs:24,bandTxt:'#1f4ea8',icon:'dots',ic:'#ffe28a',iy:98,t1:'КРЕКЕР',s1:42,c1:'#fff',y1:152,t2:'зі сіллю',s2:24,c2:'#ffe28a',y2:188,t3:'180 г',rib:'#f2c14e',c3:'#1f4ea8'}));
  def('choc','snacks','box',[.08,.16,.012],label({bg:'#6a2a8a',bg2:'#3e1456',band:'#f2c14e',brand:'РОМАШКА',bs:20,bandTxt:'#3e1456',icon:'heart',ic:'#f2c14e',iy:100,t1:'ШОКОЛАД',s1:30,c1:'#fff',y1:152,t2:'молочний',s2:24,c2:'#f2c14e',y2:186,t3:'90 г',rib:'#f2c14e',c3:'#3e1456'}));
  def('cookies','snacks','box',[.16,.1,.07],label({bg:'#4aa8e8',bg2:'#1f7ac0',icon:'star',ic:'#fff2a0',iy:80,t1:'ПЕЧИВО',s1:44,c1:'#fff',y1:138,t2:'з вершками',s2:26,c2:'#fff2a0',y2:176,t3:'300 г',rib:'#1f5a96'}));
  def('candy','snacks','bag',[.13,.2,.045],label({bg:'#ff7ab0',bg2:'#e0307a',icon:'heart',ic:'#fff',iy:90,t1:'ЦУКЕРКИ',s1:36,c1:'#fff',y1:146,t2:'фруктові',s2:26,c2:'#ffe0ee',y2:184,t3:'250 г',rib:'#a0185a'}));
  // ---- pantry
  def('cereal','pantry','box',[.2,.3,.07],label({bg:'#ffb43a',bg2:'#ff7a1a',band:'#7a3a0a',brand:'ЗОЛОТИЙ КОЛОС',bs:18,icon:'bean',ic:'#fff2c2',iy:100,t1:'МЮСЛІ',s1:50,c1:'#fff',y1:152,t2:'з горіхами',s2:26,c2:'#fff2c2',y2:188,t3:'350 г',rib:'#7a3a0a'}));
  def('pasta','pantry','bag',[.11,.24,.05],label({bg:'#fff0b0',bg2:'#ffd24a',band:'#d6192b',brand:'ОДЕСА',bs:24,icon:'dots',ic:'#e0a010',iy:100,t1:'МАКАРОНИ',s1:34,c1:'#b01018',y1:152,t2:'спагеті',s2:26,c2:'#b01018',y2:188,t3:'400 г',rib:'#d6192b'}));
  def('rice','pantry','bag',[.1,.18,.06],label({bg:'#f4f8ee',bg2:'#dcead0',band:'#3f9a3a',brand:'КУБАНЬ',bs:22,icon:'leaf',ic:'#8fc86a',iy:98,t1:'РИС',s1:54,c1:'#2f7a2c',y1:152,t2:'довгозернистий',s2:19,c2:'#2f7a2c',y2:188,t3:'900 г',rib:'#3f9a3a'}));
  def('coffeeBag','pantry','bag',[.11,.19,.06],label({bg:'#5a3418',bg2:'#2e1a0a',band:'#d4a84a',brand:'ARABICA',bs:24,bandTxt:'#2e1a0a',icon:'bean',ic:'#d4a84a',iy:100,t1:'КАВА',s1:48,c1:'#f2d890',y1:152,t2:'у зернах',s2:26,c2:'#f2d890',y2:188,t3:'250 г',rib:'#d4a84a',c3:'#2e1a0a'}));
  def('tea','pantry','box',[.07,.11,.05],label({bg:'#3f9a4a',bg2:'#1f6a2a',icon:'leaf',ic:'#d8f2a0',iy:84,t1:'ЧАЙ',s1:56,c1:'#fff',y1:146,t2:'зелений',s2:28,c2:'#d8f2a0',y2:184,t3:'25 п',rib:'#144a1c'}));
  def('tuna','pantry','can',[.04,.06],label({bg:'#e8f2ff',bg2:'#b6d4f2',band:'#d6192b',brand:'МОРЕ',bs:26,bandH:60,icon:'drop',ic:'#2a62b8',iy:120,is:.8,t1:'ТУНЕЦЬ',s1:38,c1:'#b01018',y1:176,t3:'185 г',rib:'#d6192b'}));
  def('peas','pantry','can',[.04,.1],label({bg:'#7cc02c',bg2:'#4a9a14',band:'#fff',brand:'ГОРОШОК',bs:24,bandTxt:'#2f6a0a',icon:'dots',ic:'#c9f26a',iy:104,t1:'ГОРОШОК',s1:34,c1:'#fff',y1:156,t3:'420 г',rib:'#2f6a0a'}));
  def('jam','pantry','jar',[.04,.1],label({bg:'#7a1f4a',bg2:'#4a0f2e',icon:'fruit',ic:'#e8403a',iy:84,t1:'ДЖЕМ',s1:48,c1:'#fff',y1:142,t2:'вишня',s2:30,c2:'#ffd0e0',y2:182,t3:'350 г',rib:'#2a0818'}));
  def('oil','pantry','bottle',[.045,.3],label({bg:'#ffe35a',bg2:'#f2b01e',band:'#2f7a2c',brand:'ЗОЛОТА',bs:24,icon:'sun',ic:'#fff',iy:100,t1:'ОЛІЯ',s1:54,c1:'#7a4a0a',y1:154,t2:'соняшникова',s2:22,c2:'#7a4a0a',y2:190,t3:'1 л',rib:'#2f7a2c'}));
  def('mayo','pantry','jar',[.045,.09],label({bg:'#fffbe8',bg2:'#f2eac2',band:'#d6192b',brand:'ДОМАШНІЙ',bs:20,icon:'drop',ic:'#f2d24a',iy:100,is:.8,t1:'МАЙОНЕЗ',s1:34,c1:'#b01018',y1:150,t3:'67% · 380 г',rib:'#d6192b'}));
  def('sugar','pantry','bag',[.1,.17,.06],label({bg:'#eef6ff',bg2:'#cfe2f5',band:'#2a62b8',brand:'ЦУКОР',bs:24,icon:'star',ic:'#9fc2ee',iy:100,t1:'ЦУКОР',s1:46,c1:'#1f4ea8',y1:152,t3:'1 кг',rib:'#2a62b8'}));
  // ---- bakery, deli, produce
  def('loaf','bakery','loaf',[.28,.11,.12],label({bg:'#b8762e',bg2:'#8a4e18',band:'#f4e2b0',brand:'ХЛІБ',bs:36,bandH:70,bandTxt:'#6a3a10',icon:'leaf',ic:'#e0b060',iy:150,is:.9,t1:'',t3:'0,5 кг',rib:'#f4e2b0',c3:'#6a3a10'}));
  def('baguette','bakery','loaf',[.42,.075,.075],label({bg:'#d6962e',bg2:'#a8681a',band:'#f4e2b0',brand:'БАГЕТ',bs:30,bandH:80,bandTxt:'#6a3a10',t1:''}));
  def('sausage','bakery','box',[.3,.05,.05],label({bg:'#e87a7a',bg2:'#b84a4a',band:'#fff',brand:'КОВБАСА',bs:26,bandH:70,bandTxt:'#8a1a1a',icon:'dots',ic:'#f2b0b0',iy:150,is:.7,t1:''}));
  def('apple','fresh','fruit',[.04],x=>{grad(x,'#d61f26','#9a0f18');ell(x,70,70,38,26,'rgba(255,255,255,.25)')});
  def('appleG','fresh','fruit',[.04],x=>{grad(x,'#9bd02f','#5a9a14');ell(x,70,70,38,26,'rgba(255,255,255,.3)')});
  def('orange','fresh','fruit',[.045],x=>{grad(x,'#ff9a1a','#e0700a');ell(x,70,70,38,26,'rgba(255,255,255,.25)')});
  def('tomato','fresh','fruit',[.042],x=>{grad(x,'#e8301e','#b01a0e');ell(x,70,70,38,26,'rgba(255,255,255,.25)')});
  // ---- pharmacy / beauty / tech / books / toys
  def('pills','pharma','box',[.1,.06,.035],label({bg:'#f4fff8',bg2:'#d6f0e0',band:'#1f9d55',brand:'АПТЕКА',bs:22,icon:'cross',ic:'#1f9d55',iy:96,is:.8,t1:'ВІТАМІН C',s1:30,c1:'#146a38',y1:150,t3:'60 табл.',rib:'#1f9d55'}));
  def('vitjar','pharma','jar',[.035,.09],label({bg:'#ff9a2a',bg2:'#e0701a',icon:'sun',ic:'#fff2a0',iy:84,t1:'C',s1:70,c1:'#fff',y1:140,t2:'ВІТАМІН',s2:24,c2:'#fff',y2:184,t3:'100 шт',rib:'#a84a08'}));
  def('hemato','pharma','box',[.06,.1,.02],label({bg:'#7a3a1a',bg2:'#4a1f0a',band:'#f2c14e',brand:'ГЕМАТОГЕН',bs:17,bandTxt:'#4a1f0a',icon:'drop',ic:'#e8403a',iy:100,t1:'БАТОНЧИК',s1:28,c1:'#fff',y1:152,t3:'40 г',rib:'#f2c14e',c3:'#4a1f0a'}));
  def('cream','beauty','box',[.05,.12,.04],label({bg:'#fde8f0',bg2:'#f4b6d0',band:'#d63a8c',brand:'EVA',bs:26,icon:'heart',ic:'#d63a8c',iy:96,is:.8,t1:'КРЕМ',s1:44,c1:'#a01a64',y1:150,t3:'50 мл',rib:'#d63a8c'}));
  def('perfume','beauty','box',[.06,.12,.04],label({bg:'#2a1a4a',bg2:'#120a26',band:'#d4a84a',brand:'PARIS',bs:26,bandTxt:'#2a1a4a',icon:'star',ic:'#d4a84a',iy:100,t1:'PARFUM',s1:30,c1:'#f2d890',y1:150,t3:'50 ml',rib:'#d4a84a',c3:'#2a1a4a'}));
  def('lipstick','beauty','can',[.012,.07],label({bg:'#d6194b',bg2:'#8a0a2a',icon:'heart',ic:'#fff',iy:90,t1:'',t3:'',s1:10}));
  def('phone','tech','box',[.08,.16,.03],label({bg:'#16181c',bg2:'#2a2e36',band:'#3a7ad8',brand:'SMARTPHONE',bs:18,icon:'star',ic:'#3a7ad8',iy:106,is:.9,t1:'PRO 5G',s1:40,c1:'#fff',y1:156,t3:'128 GB',rib:'#3a7ad8'}));
  def('phones','tech','box',[.16,.18,.07],label({bg:'#e8412e',bg2:'#b01a0e',icon:'wave',ic:'#fff',iy:82,t1:'НАВУШНИКИ',s1:30,c1:'#fff',y1:140,t2:'wireless',s2:26,c2:'#ffd0c8',y2:180,t3:'Bluetooth 5',rib:'#6a0a04'}));
  def('bank','tech','box',[.07,.14,.025],label({bg:'#2d8f3a',bg2:'#1a5a24',icon:'star',ic:'#d8f2a0',iy:90,t1:'POWER',s1:34,c1:'#fff',y1:146,t2:'BANK',s2:34,c2:'#d8f2a0',y2:184,t3:'10 000 mAh',rib:'#0e3a16'}));
  def('book1','books','box',[.15,.22,.03],label({bg:'#2b4a7a',bg2:'#16284a',band:'#f2c14e',brand:'КОБЗАР',bs:30,bandTxt:'#16284a',icon:'star',ic:'#f2c14e',iy:110,t1:'ТАРАС',s1:30,c1:'#fff',y1:164,t2:'ШЕВЧЕНКО',s2:22,c2:'#f2c14e',y2:196}));
  def('book2','books','box',[.15,.22,.03],label({bg:'#c0392b',bg2:'#7a1a10',band:'#fff',brand:'ПРИГОДИ',bs:28,bandTxt:'#7a1a10',icon:'sun',ic:'#ffd27a',iy:110,t1:'ОДЕСА',s1:40,c1:'#fff',y1:166,t2:'путівник',s2:22,c2:'#ffd27a',y2:200}));
  def('book3','books','box',[.14,.21,.025],label({bg:'#2e7d32',bg2:'#144a18',icon:'leaf',ic:'#a8e6a0',iy:90,t1:'КУЛІНАР',s1:34,c1:'#fff',y1:150,t2:'100 рецептів',s2:22,c2:'#a8e6a0',y2:188}));
  def('lego','toys','box',[.3,.24,.08],label({bg:'#f2c418',bg2:'#e09a0a',band:'#d6192b',brand:'BRICKS',bs:30,icon:'dots',ic:'#d6192b',iy:100,is:1.2,t1:'КОНСТРУКТОР',s1:28,c1:'#1a1a1e',y1:154,t2:'420 деталей',s2:22,c2:'#1a1a1e',y2:190,t3:'6+',rib:'#d6192b'}));
  def('toycar','toys','box',[.2,.1,.08],label({bg:'#2a62b8',bg2:'#16407a',icon:'star',ic:'#ffd24a',iy:80,t1:'МАШИНКА',s1:36,c1:'#fff',y1:138,t2:'інерційна',s2:24,c2:'#ffd24a',y2:176,t3:'3+',rib:'#0e2a52'}));
  def('doll','toys','box',[.12,.22,.05],label({bg:'#ff7ab0',bg2:'#d6307a',icon:'heart',ic:'#fff',iy:90,t1:'ЛЯЛЬКА',s1:40,c1:'#fff',y1:150,t2:'Соломія',s2:26,c2:'#ffe0ee',y2:188,t3:'3+',rib:'#8a1a4a'}));
  // household
  def('soap','home','box',[.09,.06,.05],label({bg:'#8fd0f5',bg2:'#4aa8e0',icon:'drop',ic:'#fff',iy:86,t1:'МИЛО',s1:48,c1:'#fff',y1:142,t2:'морський бриз',s2:20,c2:'#e0f4ff',y2:180,t3:'90 г',rib:'#1f6aa8'}));
  def('shampoo','home','bottle',[.035,.2],label({bg:'#c8a0f2',bg2:'#8a5ad8',icon:'leaf',ic:'#f0e0ff',iy:92,t1:'ШАМПУНЬ',s1:30,c1:'#fff',y1:146,t2:'відновлення',s2:19,c2:'#f0e0ff',y2:182,t3:'400 мл',rib:'#4a2a96'}));
  def('powder','home','box',[.2,.26,.1],label({bg:'#2a62b8',bg2:'#16407a',band:'#ffd24a',brand:'ПРАЛЬНИЙ',bs:20,bandTxt:'#16407a',icon:'star',ic:'#9fd8ff',iy:100,t1:'ПОРОШОК',s1:34,c1:'#fff',y1:152,t3:'3 кг',rib:'#ffd24a',c3:'#16407a'}));
  def('napkin','home','bag',[.12,.14,.07],label({bg:'#fff',bg2:'#e8eef2',band:'#e8412e',brand:'СЕРВЕТКИ',bs:22,icon:'leaf',ic:'#f2a09a',iy:104,t1:'ПАПІР',s1:40,c1:'#e8412e',y1:154,t3:'200 шт',rib:'#e8412e'}));
  // category mixes for whole aisles
  PRD.cats.fridge=[].concat(PRD.cats.dairy,PRD.cats.dairy,[PRD.designs.findIndex(d=>d.id==='sausage'),PRD.designs.findIndex(d=>d.id==='kefir')]);
  PRD.cats.deli=['sausage','cheese','butter','sausage','cheese'].map(id=>D.findIndex(d=>d.id===id));
  PRD.cats.sweets=['choc','candy','cookies','choc','crack'].map(id=>D.findIndex(d=>d.id===id));
  PRD.cats.coffee=['coffeeBag','tea','cookies','choc'].map(id=>D.findIndex(d=>d.id===id));
  PRD.cats.mix=[].concat(PRD.cats.snacks,PRD.cats.drinks,PRD.cats.pantry);
})();

// ---------------------------------------------------------------- atlas + shapes
PRD.init=function(){if(this.ready)return;this.ready=true;const N=this.designs.length,CELL=256,COLS=8,rows=Math.ceil(N/COLS);
  const cv=document.createElement('canvas');cv.width=COLS*CELL;cv.height=Math.max(2,Math.pow(2,Math.ceil(Math.log2(rows*CELL))));const x=cv.getContext('2d');this.atlasH=cv.height;
  this.designs.forEach(d=>{const c=d.i%COLS,r=Math.floor(d.i/COLS);x.save();x.translate(c*CELL,r*CELL);x.beginPath();x.rect(0,0,240,CELL);x.clip();try{d.paint(x)}catch(e){console.warn('[products]',d.id,e)}x.restore();
    // plain strip for the sides: the colour of the label's left edge
    const px=x.getImageData(c*CELL+4,r*CELL+CELL-60,1,1).data;x.fillStyle='rgb('+px[0]+','+px[1]+','+px[2]+')';x.fillRect(c*CELL+240,r*CELL,16,CELL);
    d.u0=c*CELL/cv.width;d.u1=(c*CELL+240)/cv.width;d.v1=1-r*CELL/cv.height;d.v0=1-(r+1)*CELL/cv.height;d.su=(c*CELL+248)/cv.width;d.sv=(d.v0+d.v1)/2});
  const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;this.tex=t;
  this.mat=new THREE.MeshStandardMaterial({map:t,roughness:.5,metalness:.04})};
// geometry for a design, built once and shared by every shop
PRD.geometry=function(i){if(this.geo[i])return this.geo[i];const d=this.designs[i],G=THREE;let g;
  const strip=(g,from)=>{const uv=g.attributes.uv;for(let k=from||0;k<uv.count;k++)uv.setXY(k,d.su,d.sv)};
  const wrapU=g=>{const uv=g.attributes.uv;for(let k=0;k<uv.count;k++)uv.setX(k,d.u0+uv.getX(k)*(d.u1-d.u0))};
  const remapBox=g=>{const uv=g.attributes.uv,face=new Uint8Array(uv.count);for(const gr of g.groups)for(let k=gr.start;k<gr.start+gr.count;k++)face[g.index.getX(k)]=gr.materialIndex;
    for(let k=0;k<uv.count;k++){if(face[k]>=4)uv.setXY(k,d.u0+uv.getX(k)*(d.u1-d.u0),d.v0+uv.getY(k)*(d.v1-d.v0));else uv.setXY(k,d.su,d.sv)}};
  // round packs: the label is spread over ~200° of the front (u = .5 is the front, +z); the profile points j0..j1 carry the label, the rest the plain strip
  const lathe=(pts,j0,j1)=>{const n=pts.length,L=new G.LatheGeometry(pts.map(p=>new G.Vector2(p[0],p[1])),24,-Math.PI,Math.PI*2),uv=L.attributes.uv,y0=pts[j0][1],y1=pts[j1][1];
    for(let k=0;k<uv.count;k++){const j=k%n;if(j>=j0&&j<=j1){const u=Math.max(0,Math.min(1,(uv.getX(k)-.5)*1.8+.5));uv.setXY(k,d.u0+u*(d.u1-d.u0),d.v0+(pts[j][1]-y0)/(y1-y0)*(d.v1-d.v0))}else uv.setXY(k,d.su,d.sv)}return L};
  const [a,b,c]=d.dim;
  if(d.shape==='carton'){g=new G.BoxGeometry(a,b,c,1,1,2);const p=g.attributes.position;for(let k=0;k<p.count;k++)if(p.getY(k)>b/2-1e-6&&Math.abs(p.getZ(k))<1e-6)p.setY(k,b/2+b*.1);   // gable top
    remapBox(g);g.translate(0,b/2,0)}
  else if(d.shape==='box'||d.shape==='bag'||d.shape==='loaf'){g=d.shape==='box'?new G.BoxGeometry(a,b,c):rbox(a,b,c,Math.min(a,b,c)*(d.shape==='loaf'?.4:.3),1);remapBox(g);g.translate(0,b/2,0)}
  else if(d.shape==='can'){const r=a,h=b;g=lathe([[0,0],[r*.92,0],[r,.008],[r,h-.008],[r*.92,h],[0,h]],2,3)}
  else if(d.shape==='bottle'){const r=a,h=b;g=lathe([[0,0],[r*.85,0],[r,.012],[r,h*.6],[r*.9,h*.74],[r*.38,h*.84],[r*.36,h*.93],[r*.42,h*.93],[r*.42,h],[0,h]],2,3)}
  else if(d.shape==='cup'){const r=a,h=b;g=lathe([[0,0],[r*.78,0],[r*.8,h*.04],[r,h*.94],[r*1.04,h*.94],[r*1.04,h],[0,h]],2,3)}
  else if(d.shape==='jar'){const r=a,h=b;g=lathe([[0,0],[r*.96,0],[r,.008],[r,h*.84],[r*.9,h*.86],[r*.9,h],[0,h]],2,3)}
  else{g=new G.SphereGeometry(a,10,8);strip(g);g.translate(0,a,0);g.scale(1,.92,1)}      // fruit
  return this.geo[i]=g};
PRD.rng=function(seed){let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}};

// ---------------------------------------------------------------- batches of instances
PRD.batch=function(){this.init();const B={items:{},count:0,
  add(i,x,y,z,yaw,tint){(B.items[i]=B.items[i]||[]).push(x,y,z,yaw,tint===undefined?1:tint);B.count++},
  flush(grp){const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),S=new THREE.Vector3(1,1,1),Pv=new THREE.Vector3(),C=new THREE.Color(),out=[];
    for(const k of Object.keys(B.items)){const a=B.items[k],n=a.length/5,im=new THREE.InstancedMesh(PRD.geometry(+k),PRD.mat,n);
      for(let j=0;j<n;j++){Pv.set(a[j*5],a[j*5+1],a[j*5+2]);Q.setFromAxisAngle(Y,a[j*5+3]);M.compose(Pv,Q,S);im.setMatrixAt(j,M);const t=a[j*5+4];C.setRGB(t,t,t);im.setColorAt(j,C)}
      im.frustumCulled=false;im.castShadow=false;im.receiveShadow=false;im.userData.goods=true;grp.add(im);out.push(im)}
    B.items={};return out}};return B};
// a facing row of one category: items of one design repeat 2–5 times (like real shelf facings), then the next design follows
PRD.row=function(B,cat,x,y,z,dx,dz,len,yaw,seed,o){o=o||{};const ids=typeof cat==='string'?this.cats[cat]:cat,R=this.rng(seed||7),L=Math.hypot(dx,dz)||1,ux=dx/L,uz=dz/L;let u=0,k=Math.floor(R()*ids.length),run=0;
  while(u<len){if(run<=0){k=(k+1+Math.floor(R()*2))%ids.length;run=2+Math.floor(R()*4)}run--;const i=ids[k],d=this.designs[i],w=(d.dim.length===1?d.dim[0]*2:d.shape==='can'||d.shape==='bottle'||d.shape==='cup'||d.shape==='jar'?d.dim[0]*2:d.dim[0])+.012;
    if(u+w>len)break;const p=u+w/2;if(!(o.gap&&R()<o.gap))B.add(i,x+ux*p,y,z+uz*p,yaw+(R()-.5)*.06,.86+R()*.14);u+=w}};

// ---------------------------------------------------------------- shop assistants
PRD.cashier=function(grp,wx,wy,wz,yaw,key,seed){if(!this._hook){this._hook=true;ANIM.push(dt=>PRD.tick(dt))}
  const R=this.rng((seed||1)*131+17),pick=a=>a[Math.floor(R()*a.length)],br=Object.assign({bg:'#2d8f3a',fg:'#ffffff'},typeof SH_BRANDS!=='undefined'&&SH_BRANDS[key]);
  const col=parseInt(br.bg.replace('#',''),16),H=pick(CH_HAIR),female=R()<.55,hs=female?pick(['long','pony','bun','short']):pick(['short','swept','buzz','short']),skirt=female&&R()<.3;
  const o={skin:pick(CH_SKIN.slice(0,6)),iris:pick(CH_EYE)[1],hs,hair:H[1],hair2:H[2],brow:H[3],ts:'tee',shirt:0xf3f1ec,bs:skirt?'skirt':'jeans',jeans:0x23283a,cuff:0x2e3550,ss:'sneaker',shoe:0x1c1c1e,sole:0xeeeeee,
    gl:R()<.28?'round':'none',ht:R()<.22?'cap':'none',ac:col,bk:'none',nk:'none',cn:false,bd:(!female&&R()<.3)?'stubble':'none'};
  const P=makePlayer(o),apron=new THREE.MeshStandardMaterial({color:col,roughness:.8}),trim=new THREE.MeshStandardMaterial({color:parseInt(br.fg.replace('#',''),16)||0xffffff,roughness:.7});apron.color.convertSRGBToLinear();trim.color.convertSRGBToLinear();
  const add=(geo,m,px,py,pz,rz)=>{const q=new THREE.Mesh(geo,m);q.position.set(px,py,pz);if(rz)q.rotation.z=rz;P.spine.add(q);return q};
  add(rbox(.37,.4,.03,.012,1),apron,0,.18,.138);add(rbox(.3,.1,.034,.01,1),trim,0,.12,.14);add(new THREE.BoxGeometry(.04,.34,.012),apron,-.12,.38,.12,.35);add(new THREE.BoxGeometry(.04,.34,.012),apron,.12,.38,.12,-.35);
  {const m=plateMesh([['Катя','Олена','Ірина','Марія','Оксана','Андрій','Сергій','Дмитро','Іван','Олег'][Math.floor(R()*10)]],{w:256,h:96,size:48,color:'#111',bg:'#fff',weight:'800'},.11,.04,.9);m.position.set(.09,.35,.158);P.spine.add(m)}
  animPlayer(P,{spd:0,mode:'walk'},0);P.can.visible=false;P.root.position.set(wx,wy,wz);P.root.rotation.y=yaw;P.root.traverse(m=>{if(m.isMesh)m.castShadow=false});mergeAvatar(P.root);grp.add(P.root);
  const bub=(s)=>{const m=plateMesh([s],{w:512,h:112,size:54,color:'#14161a',bg:'#ffffff',weight:'800',border:'#14161a',bw:6},1.5,.33,.9);m.position.set(0,2.05,0);m.visible=false;P.root.add(m);return m};
  const c={P,grp,x:wx,z:wz,yaw,t:R()*10,near:false,wave:0,thanks:0,hi:bub('Добрий день!'),ty:bub('Дякуємо! Гарного дня!'),look:0,seed:seed||1};PRD.cashiers.push(c);return c};
PRD.paid=function(){let best=null,bd=14;for(const c of this.cashiers){if(!c.grp.visible)continue;const d=Math.hypot(c.x-player.x,c.z-player.z);if(d<bd){bd=d;best=c}}if(best)best.thanks=2.6};
PRD.tick=function(dt){for(const c of PRD.cashiers){if(!c.grp.visible)continue;const P=c.P,dx=player.x-c.x,dz=player.z-c.z,d=Math.hypot(dx,dz);c.t+=dt;const near=d<4.2;
  if(near&&!c.near)c.wave=1.8;if(d>8)c.near=false;else if(near)c.near=true;c.wave=Math.max(0,c.wave-dt);c.thanks=Math.max(0,c.thanks-dt);
  const cyc=(c.t%7)/7,scan=cyc<.55&&!c.wave&&!c.thanks,ts=c.t*5.2;
  let ry=0;if(d<7){ry=Math.atan2(dx,dz)-c.yaw;while(ry>Math.PI)ry-=6.283;while(ry<-Math.PI)ry+=6.283;ry=Math.max(-.9,Math.min(.9,ry))}
  c.look+=((scan?ry*.35:ry)-c.look)*Math.min(1,dt*5);P.head.rotation.y=c.look;P.head.rotation.x=scan?.28:(c.thanks?.18*Math.sin(c.t*9):.02);
  P.spine.rotation.x=.04+Math.sin(c.t*1.7)*.012;P.hips.position.y=P.hipY+Math.sin(c.t*1.7)*.004;
  const R=P.arms[1],L=P.arms[0];
  if(c.wave>0||c.thanks>0){R.sh.rotation.x=-2.5+Math.sin(c.t*9)*.18;R.sh.rotation.z=-.35;R.el.rotation.x=-.5+Math.sin(c.t*9)*.3;L.sh.rotation.x=-.25;L.el.rotation.x=-.5}
  else if(scan){const s=Math.sin(ts);R.sh.rotation.x=-1.0+s*.3;R.sh.rotation.z=-.1;R.el.rotation.x=-.9;L.sh.rotation.x=-.85-s*.28;L.sh.rotation.z=.1;L.el.rotation.x=-.8}
  else{R.sh.rotation.x=-.5+Math.sin(c.t*2)*.05;R.sh.rotation.z=-.06;R.el.rotation.x=-.8;L.sh.rotation.x=-.45;L.sh.rotation.z=.06;L.el.rotation.x=-.8}
  c.hi.visible=c.wave>0&&!c.thanks;c.ty.visible=c.thanks>0;for(const b of [c.hi,c.ty])if(b.visible){b.quaternion.copy(camera.quaternion);b.parent.updateMatrixWorld();b.quaternion.premultiply(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert())}}};   // hooked into ANIM by the first cashier (ANIM is declared after this file loads)
// the atlas is drawn ahead of the first shop visit
setTimeout(()=>{try{PRD.init()}catch(e){console.warn('[products]',e)}},6000);
