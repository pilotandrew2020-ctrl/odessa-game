// vint.js — the city's real shop signs, and two kinds of venue with a room of their own: barbershops / hair salons and bowling.
// * assets/venues.json (dev/osm/mkven.js) now keeps the names as written on the real signs (Ukrainian / Russian / brand spelling);
//   the made-up category signs ("ПРОДУКТИ", "АПТЕКА" ...) that used to be baked onto buildings are gone where a real name is known,
//   and the chains wear their own colours.
// * "hair" opens bg_barber: Sketchfab barber chairs, stations with mirrors and the barber's things, a wash basin, a sofa, a barber pole,
//   two barbers at work (RenderPeople "Eric", rigged, with a looping cut keyed in Blender: tools/city/barber_anim.py) over two clients.
// * "bowl" opens bg_bowling: four maple lanes, pins, balls, ball returns, scoreboards; you can rent a lane and bowl (pins fall, score counts).
// Loaded after ven.js / models.js; every game global is touched only at call time. Models: assets/models/props (assets/CREDITS.md).

(function(){
if(typeof VEN==='undefined')return;
Object.assign(VEN.INT,{hair:'bg_barber',bowl:'bg_bowling',bank:'bg_bank',post:'bg_post',med:'bg_clinic'});
Object.assign(VEN.LABEL,{hair:'barbershop & hair salon',bowl:'bowling'});
Object.assign(VEN.COL,{hair:['#151515','#f4f1ea'],bowl:['#191442','#ff5fd8']});
Object.assign(VEN.PIN,{hair:['#c8102e','✂'],bowl:['#6a3fd0','●']});
VEN.IMP.add('bowl');
if(typeof MDL!=='undefined')MDL.maxTex=Object.assign(MDL.maxTex||{},{bowl_lanes:2048});   // the lane strip is 256x2048: on phones it may not be squeezed to 512

// ---- the chains' own colours on their signs [background, letters]
VEN.BRAND=[
  [/сільпо|сильпо|silpo/i,'#f58025','#ffffff'],[/^атб|atb\b/i,'#ffffff','#e30613'],[/таврія|таврия|tavria/i,'#d71920','#ffffff'],[/копійка|копейка/i,'#ffd400','#d71920'],
  [/novus|новус/i,'#78be20','#ffffff'],[/varus|варус/i,'#e30613','#ffffff'],[/^фора|fora\b/i,'#e4002b','#ffffff'],[/еко.?маркет|эко.?маркет|eko/i,'#2e9c3e','#ffffff'],
  [/велмарт|velmart/i,'#d71920','#ffffff'],[/нова пошта|новая почта|nova poshta/i,'#da291c','#ffffff'],[/укрпошта|укрпочта|ukrposhta/i,'#ffd200','#1d1d1b'],
  [/приватбанк|privatbank/i,'#2b2b2b','#8dc63f'],[/ощадбанк|oschadbank/i,'#00664e','#ffffff'],[/монобанк|monobank/i,'#111111','#ffffff'],[/пумб|pumb/i,'#e4002b','#ffffff'],
  [/райффайзен|raiffeisen|аваль/i,'#fff200','#111111'],[/otp|отп банк/i,'#52ae32','#ffffff'],[/укрсиббанк|ukrsibbank/i,'#00a650','#ffffff'],[/укрексімбанк|укрэксимбанк/i,'#00529b','#ffffff'],
  [/гаєвськ|гаевск/i,'#00a651','#ffffff'],[/^анц|anc\b/i,'#e30613','#ffffff'],[/подорожник/i,'#cf0a2c','#ffffff'],[/бажаємо здоров|аптека доброго дня|д\.с\./i,'#2e7d32','#ffffff'],
  [/^eva$|^єва$|^ева$/i,'#c4007a','#ffffff'],[/watsons/i,'#00a0af','#ffffff'],[/brocard/i,'#111111','#ffffff'],[/prostor|простор/i,'#7a2a7a','#ffffff'],
  [/фокстрот|foxtrot/i,'#ff6c00','#ffffff'],[/^алло|allo\b/i,'#e30613','#ffffff'],[/цитрус|citrus/i,'#ff9e1b','#ffffff'],[/comfy|комфі|комфи/i,'#0068b3','#ffffff'],
  [/vodafone|водафон/i,'#e60000','#ffffff'],[/київстар|киевстар|kyivstar/i,'#00a2e8','#ffd200'],[/lifecell|лайфсел/i,'#ffd400','#1d1d1b'],
  [/mcdonald|макдонал/i,'#da291c','#ffc72c'],[/^kfc/i,'#a3080c','#ffffff'],[/пузата хата/i,'#6b3e1e','#f8e3b0'],[/aroma ?kava|арома ?кава/i,'#3b1f12','#ffffff'],
  [/^wog/i,'#00843d','#ffffff'],[/^okko|^окко/i,'#00a650','#ffffff'],[/^upg/i,'#ffd400','#00539f'],[/^shell/i,'#ffd500','#dd1d21'],[/^socar/i,'#0072ce','#ffffff'],
  [/intertop|інтертоп|интертоп/i,'#111111','#ffffff'],[/^zara/i,'#111111','#ffffff'],[/^colin/i,'#1d3f7a','#ffffff'],[/^lc waikiki/i,'#0047ba','#ffffff'],
  [/барбер|barber/i,'#151515','#f4f1ea'],[/боулінг|боулинг|bowling/i,'#191442','#ff5fd8']];
VEN.brand=function(v){for(const b of this.BRAND)if(b[0].test(v.name))return [b[1],b[2]];return this.COL[v.c]||['#33363b','#ffffff']};
// same as ven.js signTex, with the chain colours and the sign as a lit box (light face, thin dark rim)
VEN.signTex=function(v){const key=v.c+'|'+v.name;let t=this.tex.get(key);if(t)return t;
  const col=this.brand(v);let lines=[v.name];
  if(v.name.length>19&&v.name.includes(' ')){const h=v.name.length/2;let b=-1;for(let i=0;i<v.name.length;i++)if(v.name[i]===' '&&(b<0||Math.abs(i-h)<Math.abs(b-h)))b=i;lines=[v.name.slice(0,b),v.name.slice(b+1)]}
  const light=/^#f|^#e[0-9a-f]e|^#ff/i.test(col[0]);
  const cv=txtCanvas(lines,{w:512,h:lines.length>1?128:80,size:lines.length>1?46:52,bg:col[0],color:col[1],weight:'800',border:light?'#2a2a2a':col[1],bw:light?4:5,round:10});
  t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;t.userData={tall:lines.length>1};this.tex.set(key,t);this.texQ.push(key);
  if(this.texQ.length>180){const old=this.texQ.shift(),ot=this.tex.get(old);let used=false;for(const m of this.live.values())if(m.material.map===ot)used=true;if(!used){ot.dispose();this.tex.delete(old)}else this.texQ.push(old)}
  return t};
// index.html (addPolyBuilding): is there a real, named place within r metres? Then the building gets no made-up category sign there.
VEN.nearNamed=function(x,z,r){if(!this.ready)return false;const id=chunkIdAt2(x,z);if(id<0)return false;const i0=id%NCX,j0=Math.floor(id/NCX);
  for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){const a=this.by.get(j*NCX+i);if(!a)continue;for(const v of a)if(!this.NOSIGN.has(v.c)&&Math.abs(v.x-x)<r&&Math.abs(v.z-z)<r)return true}
  return false};

const _inst=VEN.install;VEN.install=function(){_inst.call(this);try{vintInteriors()}catch(e){console.warn('[vint]',e)}};
})();

// ================= the two rooms =================
function vintInteriors(){
  const c=sRGB,Y=INT_Y,PI=Math.PI;
  const put=(grp,name,x,z,ry,o)=>MDL.put(grp,name,Object.assign({x,y:Y,z,ry:ry||0,keep:1},o||{}));
  const reg=key=>{if(typeof BGW!=='undefined')BGW.push({name:key})};
  // a canvas that can be repainted (the venue's own name on the wall)
  const nameBoard=(grp,x,y,z,ry,w,col,glow)=>{const cv=document.createElement('canvas');cv.width=1024;cv.height=160;const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.156),new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}));m.position.set(x,y,z);m.rotation.y=ry;grp.add(m);
    const paint=txt=>{const g=cv.getContext('2d');g.clearRect(0,0,1024,160);let fs=110;g.font='800 '+fs+'px "Golos Text",Arial,sans-serif';while(g.measureText(txt).width>980&&fs>40){fs-=4;g.font='800 '+fs+'px "Golos Text",Arial,sans-serif'}
      g.textAlign='center';g.textBaseline='middle';g.shadowColor=glow||col;g.shadowBlur=18;g.fillStyle=col;g.fillText(txt,512,84);g.shadowBlur=0;g.fillText(txt,512,84);t.needsUpdate=true};
    paint('');return paint};
  const checker=(a,b,n)=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');const s=128/n;for(let i=0;i<n;i++)for(let j=0;j<n;j++){g.fillStyle=(i+j)%2?a:b;g.fillRect(i*s,j*s,s,s)}
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t};
  const floorPlane=(grp,tex,x,z,w,d,rep,rough)=>{tex.repeat.set(rep[0],rep[1]);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({map:tex,roughness:rough||.4}));
    m.rotation.x=-PI/2;m.position.set(x,Y+.006,z);m.receiveShadow=true;grp.add(m);return m};
  const venName=def=>{const b=typeof BG!=='undefined'&&BG.cur;return b&&b.v&&b.v.name?b.v.name:def};
  const hudName=(key,nm)=>{for(const d of INDOORS)if(d.name===key)d.title=nm};      // the corner title of the room, too
  const animate=(grp,h,m,clips,name,t0)=>{const mx=new THREE.AnimationMixer(m),clip=clips.find(a=>a.name===name)||clips[0];if(!clip)return;const a=mx.clipAction(clip);a.play();a.time=t0||0;
    ANIM.push(dt=>{if(grp.visible)mx.update(Math.min(dt,.1))})};

  // ---------- barbershop / hair salon: 10 x 8 m
  INTERIORS.bg_barber=()=>{let setName=null;
    const B=simpleInterior('bg_barber',86,{w:10,d:8,h:3.3,floor:0x222224,fr:.35,wall:0xe6e0d4,ceil:0x26262a,title:'Barbershop',sub:'haircut, beard and a hot towel',lights:[2.4,5.8],lcol:0xffe6c4,li:1.8,
      furnish(P,grp,ox,oz,hw,D){
        floorPlane(grp,checker('#1b1b1d','#e9e5dc',4),ox,oz+D/2,hw*2-.2,D-.2,[(hw*2)/1.2,D/1.2],.3);
        P.box(ox,Y+1.6,oz+D-.115,hw*2-.4,3.1,.03,0,c('#2b2420'),5);                                          // dark wood back wall behind the mirrors
        const xs=[-3.2,0,3.2],cz=D-1.55;
        for(const x of xs){
          put(grp,'barber_station',ox+x,oz+D-.45,PI,{bake:1});LOW_OBB.push(ox+x,oz+D-.45,.4,.33,1,0);
          put(grp,'barber_chair',ox+x,oz+cz,0,{bake:1});LOW_OBB.push(ox+x,oz+cz,.42,.5,1,0);
          P.box(ox+x,Y+2.62,oz+D-.2,.9,.05,.08,0,c('#fff6e0'),8)}                                           // lamp bar over each mirror
        // two barbers at work; the third chair is free for you
        for(const [k,x] of [[0,xs[0]],[1,xs[1]]]){
          put(grp,'barber_client',ox+x,oz+cz,0,{y:Y+.16,bake:1});
          const bx=ox+x-.44,bz=oz+cz-.30;put(grp,'barber_man',bx,bz,.983,{ready:(h,m,clips)=>animate(grp,h,m,clips,'cut',k*.9)});LOW_OBB.push(bx,bz,.24,.24,1,0);
          INTERACT.push({x:bx-.5,z:bz-.6,r:1.3,label:'Talk to the barber',fn:()=>toast(['"Sit down, brother, ten minutes"','"Fade on the sides, scissors on top?"','"Beard too? Hot towel included"'][(Math.random()*3)|0],'the barber does not look up from the comb')})}
        INTERACT.push({x:ox+xs[2],z:oz+cz-.9,r:1.3,label:'Get a haircut (₴350)',fn:()=>{if(!WALLET.pay(350,'a haircut'))return;const f=$('fade');f.style.opacity=1;
          setTimeout(()=>{f.style.opacity=0;toast('Fresh cut','skin fade, beard trimmed, hot towel · ₴350')},1300)}});
        // wash basin (right wall), sofa for the queue (left wall), the pole by the door
        put(grp,'barber_wash',ox+hw-.68,oz+3.4,-PI/2,{bake:1});LOW_OBB.push(ox+hw-.68,oz+3.4,.63,.46,1,0);
        put(grp,'lounge_sofa',ox-hw+.55,oz+2.9,PI/2,{bake:1});LOW_OBB.push(ox-hw+.55,oz+2.9,.5,.93,1,0);
        INTERACT.push({x:ox-hw+1.3,z:oz+2.9,r:1.4,label:'Wait on the sofa',cond:()=>!player.sit,fn:()=>{player.sit={x:ox-hw+.75,z:oz+2.9,y:Y+.08,yaw:PI/2};cam.yaw=PI/2;toast('In the queue','next one is you')}});
        put(grp,'barber_pole',ox+1.7,oz+.27,0,{y:Y+1.15,ready:(h,m)=>{m.traverse(o=>{if(o.isMesh&&o.material&&/inner/i.test(o.material.name)&&o.material.map){const t=o.material.map;t.wrapS=t.wrapT=THREE.RepeatWrapping;
          ANIM.push(dt=>{if(grp.visible)t.offset.y=(t.offset.y+dt*.35)%1})}})}});
        // the venue's real name over the mirrors, price list on the left wall
        setName=nameBoard(grp,ox,Y+2.95,oz+D-.135,PI,4.2,'#fff3dc','#ffb54a');
        const pl=plateMesh(['ПРАЙС','Стрижка · 350 ₴','Борода · 250 ₴','Стрижка + борода · 550 ₴','Дитяча · 250 ₴'],{w:512,h:512,sizes:[64,40,40,40,40],color:'#f2ead8',bg:'#1c1c1e',weight:'700'},1.1,1.1,0);
        pl.position.set(ox-hw+.125,Y+1.75,oz+5.4);pl.rotation.y=PI/2;grp.add(pl);
        neonSign(grp,'BARBERSHOP',ox+hw-.125,Y+2.55,oz+5.6,-PI/2,2.8,'#ff4d6a')}});
    const on=B.onEnter;B.onEnter=function(o){if(on)on.call(this,o);const nm=venName('BARBERSHOP');if(setName)setName(nm);hudName('bg_barber',nm==='BARBERSHOP'?'Barbershop':nm)};
    if(setName)setName('BARBERSHOP');return B};
  reg('bg_barber');

  // ---------- bowling: 13 x 34 m, four lanes (two Sketchfab lane pairs side by side), the approach and the sofas by the door
  const BW={lanes:[],paid:false,pins:null,balls:null,ry:PI,bz:21,foul:13.2,head:31.5};
  INTERIORS.bg_bowling=()=>{let setName=null;
    const B=simpleInterior('bg_bowling',87,{w:13,d:34,h:4.2,floor:0x2a1f18,fr:.5,wall:0x15101f,ceil:0x0b0a10,title:'Bowling',sub:'four lanes, shoes and a bar',lights:[3,9,17,26],lcol:0xffe2c0,li:.7,
      furnish(P,grp,ox,oz,hw,D){
        // carpet with a neon pattern by the door
        {const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');g.fillStyle='#14123a';g.fillRect(0,0,256,256);
          const cols=['#ff4fd8','#46f2ff','#ffd84a','#7a5cff'];for(let i=0;i<46;i++){g.strokeStyle=cols[i%4];g.lineWidth=3;g.beginPath();const x=(i*73)%256,y=(i*131)%256;
            if(i%3===0)g.arc(x,y,6+(i%5)*2,0,PI*2);else if(i%3===1){g.moveTo(x-8,y-8);g.lineTo(x+8,y+8)}else{g.moveTo(x,y-9);g.lineTo(x+8,y+6);g.lineTo(x-8,y+6);g.closePath()}g.stroke()}
          const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;floorPlane(grp,t,ox,oz+4.25,hw*2-.2,8.3,[5,3.3],.9)}
        const blocks=[-2.8,2.8];
        for(const bx of blocks){put(grp,'bowl_lanes',ox+bx,oz+BW.bz,BW.ry,{y:Y+.012,bake:1,ready:(h,m)=>m.traverse(o=>{if(o.isMesh&&/lane/i.test(o.material.name)){o.material.roughness=.5;o.material.envMapIntensity=.3;o.material.color.set(0xe8c294)}})});
          // lane centres of the model are at x -0.79 and +1.436 (turned 180°: x -> -x), the ball return sits between them
          for(const lx of [1.436,-.79])BW.lanes.push({x:ox+bx-lx,n:0});
          const rx=ox+bx-.33,rz=oz+10.2;put(grp,'bowl_return',rx,rz,BW.ry,{bake:1});LOW_OBB.push(rx,rz,.3,1.13,1,0);
          BW.lanes[BW.lanes.length-1].ret=[rx,rz];BW.lanes[BW.lanes.length-2].ret=[rx,rz];
          for(const s of [-1,1]){put(grp,'lounge_sofa',ox+bx+s*1.15,oz+6.0,0,{bake:1});LOW_OBB.push(ox+bx+s*1.15,oz+6.0,.92,.49,1,0)}
          put(grp,'bowl_table',ox+bx,oz+7.35,0,{bake:1});LOW_OBB.push(ox+bx,oz+7.35,.5,.66,1,0)}
        BW.lanes.sort((a,b)=>b.x-a.x);                                                                       // lane 1 on the left as you face the pins (+Z)
BW.lanes.forEach((L,i)=>L.n=i+1);
        LOW_OBB.push(ox,oz+BW.foul+10.4,hw-.6,10.3,1,0);                                                     // over the foul line: no walking down the lanes
        // reception with the shoes (right, by the door)
        put(grp,'bowl_desk',ox+hw-1.25,oz+3.2,PI,{sc:[1,1.5,1],bake:1});LOW_OBB.push(ox+hw-1.25,oz+3.2,.86,1.72,1,0);
        put(grp,'bowl_shoes',ox+hw-.5,oz+7.0,-PI/2,{bake:1});LOW_OBB.push(ox+hw-.5,oz+7.0,.5,2.23,1,0);
        INTERACT.push({x:ox+hw-2.6,z:oz+3.2,r:1.8,label:'Rent a lane (₴300)',cond:()=>!BW.paid,fn:()=>{if(!WALLET.pay(300,'a lane for an hour'))return;BW.paid=true;toast('Lanes 1–4 are yours','shoes included · walk to a lane and bowl')}});
        // scoreboards over the approach, one per lane
        for(const L of BW.lanes){put(grp,'bowl_tv',L.x,oz+BW.foul+.3,PI,{y:Y+2.25,bake:1});
          const cv=document.createElement('canvas');cv.width=256;cv.height=128;const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;
          const m=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.5),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));m.position.set(L.x,Y+3.62,oz+BW.foul-.05);m.rotation.y=PI;grp.add(m);
          L.board=(a,b)=>{const g=cv.getContext('2d');g.fillStyle='#07081a';g.fillRect(0,0,256,128);g.strokeStyle='#46f2ff';g.lineWidth=4;g.strokeRect(2,2,252,124);
            g.textAlign='center';g.textBaseline='middle';g.fillStyle='#ffd84a';g.font='800 44px "Golos Text",Arial';g.fillText(a,128,48);g.fillStyle='#ffffff';g.font='700 26px "Golos Text",Arial';g.fillText(b,128,96);t.needsUpdate=true};
          L.board('LANE '+L.n,'score 0');L.total=0;L.frame=1;L.roll=0;
          INTERACT.push({x:L.x,z:oz+BW.foul-1.6,r:1.1,label:'Bowl on lane '+L.n,cond:()=>!L.busy,fn:()=>bowl(L)})}
        // pins: one instanced mesh for all four racks; the balls: copies of the five Sketchfab balls
        const SP=.35,DZ=.30,rack=[[0,0],[-SP/2,DZ],[SP/2,DZ],[-SP,2*DZ],[0,2*DZ],[SP,2*DZ],[-1.5*SP,3*DZ],[-SP/2,3*DZ],[SP/2,3*DZ],[1.5*SP,3*DZ]];
        MDL.make('bowl_pin').then(g=>{let mesh=null;g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isMesh&&!mesh)mesh=o});if(!mesh)return;
          const geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geo.computeBoundingSphere();
          const im=new THREE.InstancedMesh(geo,mesh.material,BW.lanes.length*10);im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;grp.add(im);BW.pins=im;
          BW.lanes.forEach((L,li)=>{L.pins=rack.map((r,k)=>({i:li*10+k,x:L.x+r[0],z:oz+BW.head+r[1],up:1,t:0,ax:new THREE.Vector3(1,0,0),d:[0,0]}));L.pins.forEach(p=>setPin(p))})});
        MDL.make('bowl_balls').then(g=>{const bs=[];g.scene.traverse(o=>{if(/^ball\d$/i.test(o.name||''))bs.push(o)});     // a node per ball (a group when it has two materials)
          if(!bs.length)g.scene.traverse(o=>{if(o.isMesh)bs.push(o)});bs.forEach(b=>b.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}}));BW.balls=bs;
          for(const L of BW.lanes){if(L.n%2)continue;const [rx,rz]=L.ret;for(let k=0;k<4;k++){const b=bs[(k+L.n)%bs.length].clone();b.position.set(rx,Y+.5,rz+.25-k*.24);b.castShadow=true;grp.add(b)}}
          for(const L of BW.lanes){const b=bs[L.n%bs.length].clone();b.visible=false;b.castShadow=true;grp.add(b);L.ball=b}});
        setName=nameBoard(grp,ox-hw+.125,Y+2.7,oz+5.0,PI/2,5.2,'#ff6be0','#ff2fd0');
        neonSign(grp,'STRIKE!',ox+hw-.125,Y+3.05,oz+7.0,-PI/2,2.6,'#46f2ff');
        for(const s of [-1,1])P.box(ox+s*(hw-.13),Y+.05,oz+D/2,.03,.06,D-1,0,c(s<0?'#ff4fd8':'#46f2ff'),8)}});
    const M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),ONE=new THREE.Vector3(1,1,1),ZERO=new THREE.Vector3(0,0,0),UP=new THREE.Vector3(0,1,0);
    // a pin stands (up=1) or lies (t = 0..1 of its fall, d = which way); swept pins are scaled to nothing
    const setPin=p=>{if(!BW.pins)return;const f=p.up?0:Math.max(0,Math.min(1,p.t));Q.setFromAxisAngle(p.ax,f*PI/2*.96);
      V.set(p.x+p.d[0]*f*.22,Y+.012+.06*Math.sin(f*PI/2),p.z+p.d[1]*f*.22);M4.compose(V,Q,p.gone?ZERO:ONE);BW.pins.setMatrixAt(p.i,M4);BW.pins.instanceMatrix.needsUpdate=true};
    const say=(L,a)=>{L.board(a,'frame '+Math.min(10,L.frame)+' · total '+L.total)};
    function bowl(L){if(!BW.pins||!L.ball)return;if(!BW.paid){toast('Rent a lane first','₴300 at the desk by the door');return}
      L.busy=true;const st=L.pins.filter(p=>p.up&&!p.gone),aim=(Math.random()-.5)*.5,gut=Math.random()<.06,hook=(Math.random()<.5?-1:1)*(.12+Math.random()*.18);
      const start=[L.x+aim*.4,INT_Z+BW.foul+.2],end=[gut?L.x+(aim<0?-.64:.64):L.x+aim*.25,INT_Z+BW.head+1.4];
      // how many of the standing pins go down
      let n;if(gut)n=0;else{const r=Math.random();n=L.roll===0?(r<.34?10:r<.55?9:r<.7?8:r<.82?7:5+((Math.random()*2)|0)):(r<.5?st.length:Math.max(0,st.length-1-((Math.random()*2)|0)))}
      n=Math.min(n,st.length);const hit=st.slice().sort((a,b)=>Math.abs(a.x-end[0])+(a.z-end[1])*.2-(Math.abs(b.x-end[0])+(b.z-end[1])*.2)).slice(0,n);
      const b=L.ball;b.visible=true;let t=0;const dur=2.3;
      const tick=dt=>{if(!L.busy)return;t+=dt;const k=Math.min(1,t/dur),x=start[0]+(end[0]-start[0])*k+hook*Math.sin(k*PI)*(gut?0:1),z=start[1]+(end[1]-start[1])*k;
        b.position.set(x,Y+.121-(k>.97?(k-.97)*8:0),z);b.rotation.x+=dt*7.5/.109*.15;
        if(k>=.94&&!L.knock){L.knock=1;hit.forEach((p,j)=>{p.up=0;p.t=-(Math.abs(p.z-(INT_Z+BW.head))*.15+j*.02);const dx=p.x-end[0],dz=.6;const l=Math.hypot(dx,dz)||1;p.d=[dx/l,dz/l];p.ax.set(p.d[1],0,-p.d[0]).normalize()})}
        if(L.knock){for(const p of hit){p.t+=dt*2.6;setPin(p)}}
        if(t>dur+1.6){b.visible=false;L.knock=0;L.busy=false;ANIM.splice(ANIM.indexOf(tick),1);
          const down=hit.length,left=st.length-down;L.total+=down;
          let msg;if(L.roll===0&&down===10)msg='STRIKE!';else if(L.roll===1&&left===0)msg='SPARE!';else if(down===0)msg=gut?'GUTTER':'MISS';else msg=down+(down>1?' PINS':' PIN');
          say(L,msg);toast('Lane '+L.n+': '+msg,down+' down · total '+L.total);if(window.AUD&&down)AUD.beep();
          if(L.roll===0&&down<10){L.roll=1;for(const p of hit)p.gone=1;hit.forEach(setPin)}
          else{L.roll=0;L.frame++;if(L.frame>10){toast('Game over on lane '+L.n,'final score '+L.total);L.frame=1;L.total=0}
            setTimeout(()=>{for(const p of L.pins){p.up=1;p.gone=0;p.t=0;setPin(p)}say(L,'LANE '+L.n)},900)}}};
      ANIM.push(tick)}
    BW.setPin=setPin;
    const on=B.onEnter;B.onEnter=function(o){if(on)on.call(this,o);const nm=venName('BOWLING');if(setName)setName(nm);hudName('bg_bowling',nm==='BOWLING'?'Bowling':nm)};
    if(setName)setName('BOWLING');B.BW=BW;return B};
  reg('bg_bowling');

  // ---------- bank / post office / clinic: a lit name board, real names, Sketchfab pieces; peds behind the counters are the shops' cashiers
  const room=(key,idx,o,def,col,glow,tit)=>{INTERIORS[key]=()=>{let setName=null;
      const B=simpleInterior(key,idx,Object.assign({lcol:0xfff2e0,li:.75},o,{furnish(P,grp,ox,oz,hw,D){setName=nameBoard(grp,ox,Y+(o.h||3.4)-.55,oz+D-.135,PI,4.4,col,glow);o.build(P,grp,ox,oz,hw,D)}}));
      const on=B.onEnter;B.onEnter=function(a){if(on)on.call(this,a);const nm=venName(def);if(setName)setName(nm);hudName(key,nm===def?tit:nm)};
      if(setName)setName(def);return B};reg(key)};
  const teller=(grp,x,z,k)=>{if(typeof PRD!=='undefined'&&PRD.cashier)PRD.cashier(grp,x,Y,z,PI,'tavria',k)};
  const plants=(grp,ox,oz,hw,D)=>{for(const s of [-1,1])put(grp,'sh_plant',ox+s*(hw-.7),oz+D-.8,0,{bake:1})};
  const ropes=(P,x0,x1,z,ry)=>{for(let x=x0;x<=x1;x+=1.2){P.cyl(x,Y,z,.16,.16,.04,10,c('#2a2a2e'),1);P.cyl(x,Y+.04,z,.03,.03,.9,6,c('#c9a64a'),6)}
    P.box((x0+x1)/2,Y+.82,z,x1-x0,.03,.03,0,c('#8a1c1c'),1)};

  room('bg_bank',88,{w:14,d:11,h:3.6,floor:0x8f8a80,fr:.25,wall:0xc9c3b6,ceil:0xd8d4ca,title:'Bank',sub:'tellers, ATMs and a queue',lights:[3,8],surf:'tile',
    build(P,grp,ox,oz,hw,D){
      P.box(ox,Y+1.6,oz+D-.115,hw*2-.4,3.1,.03,0,c('#0b3a73'),5);
      for(const x of [-4.4,0,4.4]){put(grp,'bank_counter',ox+x,oz+D-2.6,PI,{bake:1});LOW_OBB.push(ox+x,oz+D-2.6,1.5,.5,1,0);teller(grp,ox+x,oz+D-3.5,Math.round(x*10));
        INTERACT.push({x:ox+x,z:oz+D-4.3,r:1.5,label:'Talk to the teller',fn:()=>toast('Teller','"Take a ticket, next window please"')})}
      for(const z of [3.2,5.2]){put(grp,'bank_atm',ox-hw+.6,oz+z,PI/2,{bake:1});LOW_OBB.push(ox-hw+.6,oz+z,.4,.45,1,0);
        INTERACT.push({x:ox-hw+1.5,z:oz+z,r:1.3,label:'Use the ATM',fn:()=>toast('ATM','balance '+WALLET.fmt()+' · no fees today')})}
      ropes(P,ox-2.4,ox+2.4,oz+6.2);put(grp,'lounge_sofa',ox+hw-.6,oz+3.0,-PI/2,{bake:1});LOW_OBB.push(ox+hw-.6,oz+3.0,.5,.93,1,0);
      put(grp,'lounge_sofa',ox+hw-.6,oz+5.2,-PI/2,{bake:1});LOW_OBB.push(ox+hw-.6,oz+5.2,.5,.93,1,0);plants(grp,ox,oz,hw,D);
      neonSign(grp,'ОБМІН ВАЛЮТ',ox-hw+.125,Y+2.6,oz+7.6,PI/2,2.4,'#7fd0ff')}},'BANK','#e8f4ff','#5ab0ff','Bank');

  room('bg_post',89,{w:12,d:10,h:3.4,floor:0x7d776c,fr:.5,wall:0xcfc6b0,ceil:0xd6d1c4,title:'Post office',sub:'parcels, letters and a queue',lights:[2.8,7],
    build(P,grp,ox,oz,hw,D){
      P.box(ox,Y+1.6,oz+D-.115,hw*2-.4,3.1,.03,0,c('#c8102e'),5);
      for(const x of [-2.8,2.8]){put(grp,'bank_counter',ox+x,oz+D-2.6,PI,{bake:1});LOW_OBB.push(ox+x,oz+D-2.6,1.5,.5,1,0);teller(grp,ox+x,oz+D-3.5,Math.round(x*10)+3);
        INTERACT.push({x:ox+x,z:oz+D-4.3,r:1.5,label:'Send a parcel (₴80)',fn:()=>{if(WALLET.pay(80,'a parcel'))toast('Parcel sent','tracking number 20450'+((Math.random()*9e5)|0))}})}
      put(grp,'post_stack',ox-hw+.7,oz+D-1.0,PI,{bake:1});put(grp,'post_boxes',ox-hw+1.2,oz+3.0,PI/2,{bake:1,sc:[1.4,1.4,1.4]});put(grp,'post_boxes',ox+hw-1.3,oz+D-1.5,PI,{bake:1,sc:[1.5,1.5,1.5]});
      LOW_OBB.push(ox-hw+1.2,oz+3.0,.9,.9,1,0);LOW_OBB.push(ox+hw-1.3,oz+D-1.5,.9,.9,1,0);
      const n=Math.max(1,Math.round(4.4/1.8));for(let i=0;i<n;i++)put(grp,'sh_palletrack',ox+hw-.9,oz+2.4+i*1.8,-PI/2,{bake:1});LOW_OBB.push(ox+hw-.9,oz+2.4+n*.9,.7,n*.9,1,0);
      for(let i=0;i<8;i++){P.box(ox-hw+.12,Y+1.0+(i>>2)*.55,oz+5.6+(i&3)*.52,.2,.48,.46,0,c('#c8102e'),6);P.box(ox-hw+.23,Y+1.0+(i>>2)*.55,oz+5.6+(i&3)*.52,.02,.18,.18,0,c('#f3f0e6'),0)}   // wall of mailboxes
      ropes(P,ox-2.4,ox+2.4,oz+5.8);plants(grp,ox,oz,hw,D);
      INTERACT.push({x:ox-hw+1.6,z:oz+6.9,r:1.4,label:'Collect a parcel',fn:()=>toast('Parcel desk','"Passport, please — here is your box"')})}},'POST OFFICE','#fff3f0','#ff6a6a','Post office');

  room('bg_clinic',90,{w:13,d:10,h:3.4,floor:0xaeb8ba,fr:.2,wall:0xd3dcdc,ceil:0xe3e9e9,title:'Clinic',sub:'a doctor will see you shortly',lights:[2.8,7],lcol:0xf2fbff,li:.85,surf:'tile',
    build(P,grp,ox,oz,hw,D){
      P.box(ox,Y+1.6,oz+D-.115,hw*2-.4,3.1,.03,0,c('#1b8aa0'),5);
      put(grp,'bank_counter',ox-hw+2.6,oz+3.2,PI,{bake:1,sc:[.9,1,1]});LOW_OBB.push(ox-hw+2.6,oz+3.2,1.4,.5,1,0);teller(grp,ox-hw+2.6,oz+2.3,5);
      INTERACT.push({x:ox-hw+2.6,z:oz+4.1,r:1.5,label:'Register at the desk',fn:()=>toast('Reception','"Your card, please — doctor is free in five minutes"')});
      put(grp,'clinic_dental',ox+hw-1.7,oz+D-2.0,PI,{bake:1});LOW_OBB.push(ox+hw-1.7,oz+D-2.0,.9,.7,1,0);
      INTERACT.push({x:ox+hw-2.6,z:oz+D-3.4,r:1.6,label:'Dental check-up (₴400)',fn:()=>{if(!WALLET.pay(400,'a dental check-up'))return;const f=$('fade');f.style.opacity=1;setTimeout(()=>{f.style.opacity=0;toast('All good','no cavities · ₴400')},1300)}});
      for(const x of [-2.2,.6]){put(grp,'clinic_bed',ox+x,oz+D-1.5,PI,{bake:1,sc:[1.35,1.35,1.35]});LOW_OBB.push(ox+x,oz+D-1.5,.8,.7,1,0)}
      INTERACT.push({x:ox-.8,z:oz+D-3.2,r:1.7,label:'Get a check-up (₴250)',fn:()=>{if(!WALLET.pay(250,'a check-up'))return;toast('Doctor','"Healthy as a horse — drink more water"')}});
      put(grp,'lounge_sofa',ox-hw+.6,oz+6.3,PI/2,{bake:1});LOW_OBB.push(ox-hw+.6,oz+6.3,.5,.93,1,0);plants(grp,ox,oz,hw,D);
      neonSign(grp,'+',ox+hw-.125,Y+2.5,oz+4.6,-PI/2,.9,'#3be0a0')}},'CLINIC','#eafffb','#3be0a0','Clinic');
}
