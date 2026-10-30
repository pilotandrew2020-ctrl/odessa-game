/* ===================================================================================================
   brdrop.js — SUPPLY DROPS for the Battle Royale (global BRDROP).  Original parody of the "crate under a balloon" mechanic.
   Every storm phase except the last sends a supply crate down under a striped balloon, 6 s after the phase starts; it lands on a road inside the
   NEXT safe circle (picked from the match seed and the shared clock, so friends see the same drop at the same moment).  It falls at 8 m/s with a
   tall blue light beam you can see across the city, shows on the minimap and the compass, and when it touches the ground the balloon floats away
   and the crate can be opened (E): two strong weapons, ammo, shield potions, a med kit and 100 of every building material.
   hooks: BR.start → BRDROP.start · BR.end → BRDROP.end · BR.tick → BRDROP.tick · BR.spill / BR.mesh are wrapped for the crate
   =================================================================================================== */
const BRDROP=(()=>{
const DR=[],SPEED=8,TOP=210;
const rng=sd=>{let a=sd|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}};
let tex=null;
function crateTex(){if(tex)return tex;const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');
  x.fillStyle='#2f6fb5';x.fillRect(0,0,128,128);x.fillStyle='#f2c14e';x.fillRect(0,0,128,10);x.fillRect(0,118,128,10);x.fillRect(0,0,10,128);x.fillRect(118,0,10,128);
  x.fillStyle='#14263a';for(let i=-2;i<8;i++){x.beginPath();x.moveTo(i*20,10);x.lineTo(i*20+10,10);x.lineTo(i*20-4,22);x.lineTo(i*20-14,22);x.fill()}
  x.fillStyle='#fff';x.font='900 22px system-ui,Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('SUPPLY',64,60);x.font='800 12px system-ui,Arial';x.fillStyle='#f2c14e';x.fillText('DROP',64,84);
  tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;return tex}
function model(){const g=new THREE.Group();
  const crate=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.2,1.5),new THREE.MeshStandardMaterial({map:crateTex(),roughness:.6,metalness:.25}));crate.position.y=.6;crate.castShadow=true;g.add(crate);
  const bal=new THREE.Group(),b=new THREE.Mesh(new THREE.SphereGeometry(2.5,20,14),new THREE.MeshStandardMaterial({map:BRM.stripeTex('#2a7bff','#f4f1ea'),roughness:.55}));b.scale.y=1.25;b.position.y=7.6;bal.add(b);
  const pts=[];for(let i=0;i<8;i++){const a=i/8*6.283;pts.push(new THREE.Vector3(Math.cos(a)*.7,1.2,Math.sin(a)*.7),new THREE.Vector3(Math.cos(a)*1.55,5.2,Math.sin(a)*1.55))}
  const ln=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xe9e6dc}));bal.add(ln);g.add(bal);
  const beam=BRM.beam('#4aa3ff',150,.9);g.add(beam);g.userData={crate,bal,beam};return g}
// a free spot: the middle of a car road of the chunk (or its neighbours) nearest the wanted point, picked from the match seed
function openSpot(x,z,rad,r){let id0=-1;try{id0=chunkIdAt(x,z)}catch(e){}if(id0<0)return [x,z];
  const i0=id0%NCX,j0=Math.floor(id0/NCX),P=D.nodes,wn=D.wn;const cand=[];
  for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){const id=j*NCX+i;if(id<0||id>=NCX*NCZ)continue;
    for(let s=D.segStart[id];s<D.segStart[id+1];s++){const q=D.seg[s],k=D.wOf[q];if(D.wcls[k]>2||D.wfl[k])continue;const a=wn[q]*2,b=wn[q+1]*2,L=Math.hypot(P[b]-P[a],P[b+1]-P[a+1]);if(L<10)continue;
      const mx=(P[a]+P[b])/2,mz=(P[a+1]+P[b+1])/2;if(Math.hypot(mx-x,mz-z)<rad&&typeof sdAt==='function'&&sdAt(mx,mz)>20)cand.push([mx,mz,L])}}
  if(!cand.length)return [x,z];return cand[Math.floor(r()*cand.length)]}
function spawn(i){const pl=BR.plan[i];if(!pl||DR.some(d=>d.i===i))return;const r=rng((BR.sd^Math.imul(i+101,0x9E3779B1))|0);
  const ang=r()*6.283,rad=Math.sqrt(r())*pl.to.r*.7,sp=openSpot(pl.to.x+Math.cos(ang)*rad,pl.to.z+Math.sin(ang)*rad,Math.max(60,pl.to.r*.35),r);
  const x=sp[0],z=sp[1],g=groundH(x,z),m=model();scene.add(m);
  const d={i,x,z,g,top:g+TOP,y:g+TOP,m,t0:BR.t0+(BR.STORM_T0+pl.t0+6)*1000,st:'fall',it:null,opened:false,ph:r()*6.28,loose:null};DR.push(d);
  const late=(Date.now()-d.t0)/1000;if(late<8){BR.banner('SUPPLY DROP','A crate is on its way — follow the blue light',3.2);BR.snd('glide')}
  d.y=Math.max(g+.01,d.top-SPEED*Math.max(0,late));m.position.set(x,d.y,z)}
function land(d){d.st='down';d.y=d.g;d.m.position.set(d.x,d.g,d.z);d.m.userData.crate.visible=false;d.m.remove(d.m.userData.beam);
  // the balloon lets go and floats away
  const bal=d.m.userData.bal;d.m.remove(bal);bal.position.set(d.x,d.g,d.z);scene.add(bal);d.loose={m:bal,t:0};
  FX.init();for(let k=0;k<14;k++){const a=k/14*6.283;FX.puff({x:d.x+Math.cos(a)*.8,y:d.g+.3,z:d.z+Math.sin(a)*.8,vx:Math.cos(a)*2.4,vy:.8,vz:Math.sin(a)*2.4,s0:.3,s1:1.6,life:1,c0:[.8,.78,.7],c1:[.6,.6,.6],op:.45,add:false,drag:2,grow:1})}
  const it=BR.addItem({k:'x',open:false,sup:1,dn:d.i},d.x,d.z,{y:d.g,ok:true});d.it=it;
  try{Object.defineProperty(it.e,'label',{get:()=>'Open the supply drop',configurable:true})}catch(e){}
  if(Math.hypot(d.x-player.x,d.z-player.z)<260)BR.msg('Supply drop landed · '+Math.round(Math.hypot(d.x-player.x,d.z-player.z))+' m')}
function tick(dt){if(!BR.on||!BR.plan)return;const now=Date.now();
  for(let i=0;i<BR.plan.length-1;i++)if(now>=BR.t0+(BR.STORM_T0+BR.plan[i].t0+6)*1000&&!DR.some(d=>d.i===i)&&BR.phase!=='dead'&&BR.phase!=='won')spawn(i);
  for(const d of DR){
    if(d.loose){d.loose.t+=dt;const m=d.loose.m;m.position.y+=dt*(4+d.loose.t*2);m.position.x+=dt*1.2;m.rotation.y+=dt*.4;if(d.loose.t>5){scene.remove(m);d.loose=null}}
    if(d.st==='fall'){d.ph+=dt;d.y-=SPEED*dt;const sw=Math.sin(d.ph*1.1)*1.4;d.m.position.set(d.x+sw,Math.max(d.g,d.y),d.z+Math.cos(d.ph*.8)*1.1);d.m.rotation.z=Math.sin(d.ph*1.1)*.08;
      if(d.y<=d.g+.05)land(d)}
    else if(d.it){d.opened=!!(d.it.open||d.it.taken)}}}
function list(){return DR}
function start(){end();BR.__sup=true}
function end(){for(const d of DR){scene.remove(d.m);if(d.loose)scene.remove(d.loose.m)}DR.length=0}

// ---- the crate: a blue box with a bright beam, and loot that is better than any ordinary chest
const mesh0=BR.mesh;
BR.mesh=function(it){const g=mesh0.call(this,it);if(it.k==='x'&&it.sup){const ch=g.userData.ch;if(ch&&ch.userData.mats){ch.userData.mats[0].m.color.setHex(0x2f6fb5);ch.userData.mats[1].m.color.setHex(0xe9eef5);ch.userData.mats[1].m.emissive.setHex(0x1a3a6a)}
    if(g.userData.beam){g.remove(g.userData.beam);const bm=BRM.beam('#4aa3ff',90,.7);g.add(bm);g.userData.beam=bm}}
  return g};
const spill0=BR.spill;
BR.spill=function(ch){if(!ch.sup)return spill0.call(this,ch);if(ch.spilled)return;ch.spilled=true;ch.open=true;
  const sv=this.seed;this.seed=(this.sd^Math.imul((ch.dn|0)+777,0x9E3779B1))|0;
  const strong=['ar','sniper','shotgun','rocket','cannon','sar','msniper','gshot','rpg','guided','grev'].filter(id=>BRW[id]),out=[];
  const w1=strong[Math.floor(this.rnd()*strong.length)];let w2=strong[Math.floor(this.rnd()*strong.length)];if(w2===w1)w2=strong[(strong.indexOf(w1)+1)%strong.length];
  for(const id of [w1,w2]){out.push(this.mkWeapon(id,this.rar([0,0,14,46,40])));if(BRW[id].ammo)out.push({k:'a',id:BRW[id].ammo,n:3})}
  out.push({k:'c',id:'big',n:2},{k:'c',id:'medkit',n:1});
  out.forEach((d,i)=>{const a=i/out.length*6.28+(ch.dn|0)*1.1,x=ch.x+Math.cos(a)*2,z=ch.z+Math.sin(a)*2;const it=this.addItem(d,x,z,{y:groundAt(x,z,(ch.y||groundH(x,z))+3),ok:true});it.sid=undefined;
    it.pop={t:-i*.09,x0:ch.x,z0:ch.z,y0:(ch.y||groundH(ch.x,ch.z))+.55};if(typeof BRFX!=='undefined')BRFX.label(it,this.name(it),it.k==='w'?RAR[it.rar].c:'#fff')});
  this.seed=sv;
  if(typeof BLD!=='undefined'&&BLD.give&&Math.hypot(ch.x-player.x,ch.z-player.z)<6){BLD.give(100);this.banner('SUPPLY DROP','+100 wood · brick · metal',2.6)}};
return {start,end,tick,list}})();
