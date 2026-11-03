/* ===================================================================================================
   fauna.js — the wildlife of Jungle Island.
   • quadruped(spec): procedural animal with fur texture, jointed legs (hip + knee), neck, head + lower jaw, tail chain; walk / trot / gallop gaits
   • python(): a long snake that follows its own trail; macaws: flapping flocks
   • AI: idle → wander → (alert → chase → attack) for the dangerous ones, flee for prey, packs wake each other, nothing enters the
     firelight of the beach camp (the landing is safe), animals can be shot (GUN hook) or blown up
   • the player gets health on the island: bites hurt, red flash, mauled = back to the camp
   =================================================================================================== */
const FSP={
  tiger:{n:'Tiger',L:2.6,R:.36,legL:.66,legT:.11,head:.21,tail:1.05,pat:'tiger',hp:150,hostile:1,sight:60,agg:42,walk:1.8,run:15.5,dmg:26,rng:2.4,cd:1.15,snout:.13,earS:.075,pay:900,cap:3,snd:'roar'},
  panther:{n:'Black panther',L:2.2,R:.31,legL:.6,legT:.095,head:.185,tail:1.1,pat:'panther',hp:110,hostile:1,sight:55,agg:36,walk:1.8,run:16.5,dmg:22,rng:2.2,cd:1,snout:.11,earS:.065,pay:800,cap:2,snd:'roar'},
  gorilla:{n:'Gorilla',L:1.7,R:.52,legL:.62,frontL:1.12,legT:.17,head:.27,tail:0,pat:'gorilla',hp:260,hostile:1,sight:40,agg:28,walk:1.5,run:9.5,dmg:32,rng:2.3,cd:1.4,snout:.1,earS:.05,pay:1200,cap:3,snd:'grunt'},
  boar:{n:'Wild boar',L:1.55,R:.34,legL:.44,legT:.09,head:.24,tail:.25,pat:'boar',hp:80,hostile:1,sight:30,agg:16,walk:1.6,run:10.5,dmg:14,rng:1.7,cd:.9,snout:.19,earS:.08,pay:300,cap:5,snd:'squeal',tusks:1},
  hyena:{n:'Hyena',L:1.5,R:.27,legL:.55,legT:.07,head:.19,tail:.4,pat:'hyena',hp:70,hostile:1,sight:50,agg:34,walk:1.8,run:12.5,dmg:11,rng:1.7,cd:.8,snout:.12,earS:.1,pay:250,cap:3,snd:'laugh',frontL:.72},
  croc:{n:'Crocodile',L:4.2,R:.3,legL:.2,legT:.1,head:.3,tail:1.9,pat:'croc',hp:220,hostile:1,sight:20,agg:11,walk:1.1,run:7,dmg:34,rng:3.0,cd:1.6,snout:.5,earS:0,pay:1000,cap:3,snd:'hiss',flat:.6},
  python:{n:'Python',L:6,R:.17,hp:90,hostile:1,sight:24,agg:13,walk:1.0,run:5.8,dmg:15,rng:1.9,cd:1.4,pay:500,cap:3,snd:'hiss',snake:1,pat:'python'},
  deer:{n:'Deer',L:1.5,R:.25,legL:.8,legT:.05,head:.17,tail:.2,pat:'deer',hp:50,hostile:0,sight:46,agg:0,walk:1.6,run:15,dmg:0,rng:0,cd:1,snout:.13,earS:.1,pay:150,cap:5,snd:'',flee:1}};
const FAUNA={list:[],tmpl:{},tex:{},spawnT:0,hp:100,hpT:0,dead:0,flashT:0,birds:null,ui:null,V:new THREE.Vector3(),
  // ---------- fur textures ----------
  fur(pat){if(this.tex[pat])return this.tex[pat];const W=128,H=128,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
    const base={tiger:'#d6812a',panther:'#17171c',gorilla:'#26262b',boar:'#5b4130',hyena:'#a8935f',croc:'#4a5a32',deer:'#b98a55',python:'#6a6a2c'}[pat]||'#888';x.fillStyle=base;x.fillRect(0,0,W,H);
    const belly=(c)=>{const g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,c);g.addColorStop(.2,'rgba(0,0,0,0)');g.addColorStop(.8,'rgba(0,0,0,0)');g.addColorStop(1,c);x.fillStyle=g;x.fillRect(0,0,W,H)};
    if(pat==='tiger'){belly('#f2e6d0');x.fillStyle='#14100c';for(let i=0;i<16;i++){const y=i*8+rnd()*3;for(const side of [0,1]){const x0=side?W*.5:0;x.beginPath();x.moveTo(x0+W*.12*rnd(),y);x.lineTo(x0+W*.5*(.55+.3*rnd()),y+2+rnd()*3);x.lineTo(x0+W*.5*(.4+.3*rnd()),y+5+rnd()*2);x.closePath();x.fill()}}}
    else if(pat==='panther'){x.fillStyle='rgba(60,60,75,.5)';for(let i=0;i<60;i++){x.beginPath();x.arc(rnd()*W,rnd()*H,2+rnd()*3,0,6.283);x.fill()}}
    else if(pat==='gorilla'){x.fillStyle='rgba(120,120,128,.55)';x.fillRect(W*.3,0,W*.4,H);x.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<120;i++)x.fillRect(rnd()*W,rnd()*H,1,3+rnd()*4)}
    else if(pat==='boar'){belly('#8a7058');for(let i=0;i<260;i++){x.fillStyle=rnd()<.5?'rgba(20,12,8,.5)':'rgba(140,110,80,.35)';x.fillRect(rnd()*W,rnd()*H,1,2+rnd()*5)}}
    else if(pat==='hyena'){belly('#d8c9a4');x.fillStyle='#3a2a18';for(let i=0;i<34;i++){x.beginPath();x.ellipse(rnd()*W,rnd()*H,2+rnd()*4,2+rnd()*3,0,0,6.283);x.fill()}}
    else if(pat==='croc'){belly('#c9c48a');x.fillStyle='rgba(20,30,15,.55)';for(let j=0;j<H;j+=9)for(let i=0;i<W;i+=9){x.fillRect(i+((j/9)%2)*4,j,6,2)}for(let i=0;i<9;i++){x.fillStyle='rgba(20,28,10,.5)';x.fillRect(0,i*15+3,W,5)}}
    else if(pat==='deer'){belly('#f4ead8');x.fillStyle='rgba(255,240,220,.85)';for(let i=0;i<40;i++){x.beginPath();x.arc(rnd()*W,rnd()*H,1.5+rnd()*1.5,0,6.283);x.fill()}}
    else if(pat==='python'){x.fillStyle='#3a2810';for(let i=0;i<10;i++){x.beginPath();x.ellipse(W*.5,i*13+6,W*.3,4.5,0,0,6.283);x.fill()}x.fillStyle='#b9a864';for(let i=0;i<10;i++){x.beginPath();x.ellipse(W*.5,i*13+6,W*.12,2,0,0,6.283);x.fill()}x.fillStyle='rgba(30,24,10,.35)';for(let i=0;i<8;i++){x.beginPath();x.ellipse(W*.18,i*17+4,W*.1,5,0,0,6.283);x.ellipse(W*.82,i*17+11,W*.1,5,0,0,6.283);x.fill()}}
    const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;return this.tex[pat]=t},
  // ---------- the quadruped template ----------
  buildQuad(id){const S=FSP[id],T=this.tmpl[id];if(T)return T;const L=S.L,R=S.R,Lb=L*(id==='croc'?.55:.6),flat=S.flat||1,frontL=S.frontL||S.legL,legL=S.legL;
    const fur=new THREE.MeshStandardMaterial({map:this.fur(S.pat),roughness:.9,metalness:0}),dark=new THREE.MeshStandardMaterial({color:0x141210,roughness:.7}),eye=new THREE.MeshStandardMaterial({color:id==='panther'?0xf0d020:0xe8c040,emissive:id==='panther'?0xb09a10:0x6a5810,emissiveIntensity:.8,roughness:.3}),teeth=new THREE.MeshStandardMaterial({color:0xf2eddc,roughness:.5}),mouth=new THREE.MeshStandardMaterial({color:0x7a2a2a,roughness:.6});
    const bodyY=legL+R*.7*flat+(id==='gorilla'?.18:0);
    const mk=(g,m,p)=>{const me=new THREE.Mesh(g,m);if(p)p.add(me);me.castShadow=false;return me};
    const lathe=(prof,seg)=>{const g=new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p[0],p[1])),seg||12);g.rotateX(Math.PI/2);return g};
    // body: chest deeper than the waist, haunch rounded
    const bp=id==='boar'?[[0,-.5],[.62,-.46],[.9,-.34],[1.02,-.12],[.92,.14],[.8,.32],[.55,.46],[0,.5]]:id==='gorilla'?[[0,-.5],[.7,-.44],[.95,-.3],[1,-.05],[.95,.2],[.85,.38],[.55,.47],[0,.5]]:[[0,-.5],[.55,-.46],[.82,-.34],[.98,-.12],[.86,.1],[.78,.3],[.6,.46],[0,.5]];
    const bodyG=lathe(bp.map(p=>[p[0]*R,p[1]*Lb]),14);bodyG.scale(1,flat*(id==='croc'?1:.96),1);
    const mkRig=()=>{const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=bodyY;
      mk(bodyG,fur,body);
      // neck + head
      const hx=0,hz=Lb*.5+L*.12,hy=R*.38*(id==='croc'?-.2:1)+(id==='deer'?.3:id==='gorilla'?.1:.05);
      const neck=new THREE.Group();body.add(neck);neck.position.set(0,R*.12,Lb*.42);const nl=L*(id==='deer'?.34:.2);
      if(S.head){const ng=new THREE.CylinderGeometry(R*(id==='gorilla'?.62:.5),R*.72,nl,8);ng.rotateX(Math.PI/2);ng.translate(0,0,nl/2);mk(ng,fur,neck);
        if(id==='deer'){neck.rotation.x=-.9;}else if(id==='gorilla'){neck.rotation.x=-.5;neck.position.y=R*.45}}
      const head=new THREE.Group();neck.add(head);head.position.set(0,0,nl*.95);const hs=S.head;
      const skull=new THREE.SphereGeometry(hs,12,9);skull.scale(1,.88*(id==='croc'?.55:1),1.05);mk(skull,fur,head);
      const sn=new THREE.BoxGeometry(hs*(id==='croc'?1.1:.78),hs*(id==='croc'?.4:.55),S.snout*2.0);sn.translate(0,-hs*.18,hs*.95+S.snout*.4);mk(sn,fur,head);
      const nose=new THREE.SphereGeometry(hs*.14,6,5);nose.translate(0,-hs*.05,hs*.95+S.snout*1.4);mk(nose,dark,head);
      for(const s of [-1,1]){const ey=new THREE.SphereGeometry(hs*.13,6,5);ey.translate(s*hs*.62,hs*.18,hs*.62);mk(ey,eye,head);
        if(S.earS){const ear=new THREE.ConeGeometry(S.earS,S.earS*(id==='deer'?3.2:1.7),5);ear.translate(0,S.earS*.8,0);if(id==='deer')ear.scale(.6,1,1);ear.rotateZ(-s*.35);ear.translate(s*hs*.7,hs*.78,-hs*.1);mk(ear,fur,head)}
        if(S.tusks){const tk=new THREE.ConeGeometry(.025,.2,5);tk.rotateX(-.5);tk.translate(s*hs*.3,-hs*.45,hs*.95+S.snout*1.15);mk(tk,teeth,head)}
        if(id==='deer'){const an=new THREE.CylinderGeometry(.015,.02,.5,4);an.translate(0,.25,0);an.rotateZ(-s*.35);an.translate(s*hs*.5,hs*.9,-hs*.2);mk(an,dark,head)}}
      // lower jaw (pivots at the back of the mouth) with teeth
      const jaw=new THREE.Group();head.add(jaw);jaw.position.set(0,-hs*.38,hs*.2);const jg=new THREE.BoxGeometry(hs*(id==='croc'?1.0:.7),hs*.2,S.snout*1.9+hs*.8);jg.translate(0,-hs*.08,(S.snout*1.9+hs*.8)/2);mk(jg,fur,jaw);
      const ins=new THREE.BoxGeometry(hs*.5,hs*.05,S.snout*1.5);ins.translate(0,hs*.04,hs*.9);mk(ins,mouth,jaw);
      for(const s of [-1,1])for(let k=0;k<(id==='croc'?6:2);k++){const t=new THREE.ConeGeometry(.018,id==='croc'?.07:.06,4);t.translate(s*hs*(id==='croc'?.5:.3),hs*.1,hs*.55+k*(id==='croc'?.11:.0)+(id==='croc'?0:S.snout*1.3));mk(t,teeth,jaw)}
      // tail: three tapering segments
      const tail=[];let par=body,tz=-Lb*.48,tl=S.tail/3;if(S.tail>0){for(let i=0;i<3;i++){const p=new THREE.Group();par.add(p);p.position.set(0,i===0?R*.05:0,i===0?tz:-tl*.95);
          const tg=new THREE.CylinderGeometry(R*.3*(1-i*.28)*(id==='croc'?1.9:1),R*.3*(1-(i-.0)*.28+.0)*(id==='croc'?2.1:1.2)*(i?1:1.1),tl,6);tg.rotateX(Math.PI/2);tg.translate(0,0,-tl/2);mk(tg,fur,p);if(id==='croc')p.children[0].scale.y=.55;tail.push(p);par=p;if(id==='deer'||id==='boar'||id==='gorilla')break}}
      // legs: hip pivot → upper → knee pivot → lower → paw
      const legs=[];const LT=S.legT;
      for(const [fz,fr] of [[Lb*.36,1],[-Lb*.36,0]])for(const sx of [-1,1]){const hip=new THREE.Group();body.add(hip);const LL=fr?frontL:legL;hip.position.set(sx*R*.78*(id==='croc'?1.15:1),-R*.3*flat,fz);
        const ul=LL*.52,ll=LL*.58+R*.3*flat+.02,hw=LT*(fr?1:1.12);
        const ug=new THREE.CylinderGeometry(hw*.95,hw*.72,ul,7);ug.translate(0,-ul/2,0);mk(ug,fur,hip);
        const knee=new THREE.Group();hip.add(knee);knee.position.y=-ul;const lg=new THREE.CylinderGeometry(hw*.62,hw*.5,ll,6);lg.translate(0,-ll/2,0);mk(lg,fur,knee);
        const pw=new THREE.SphereGeometry(hw*.9,7,5);pw.scale(1,.55,1.5);pw.translate(0,-ll,hw*.5);mk(pw,id==='gorilla'?dark:fur,knee);
        if(id==='croc'){hip.rotation.z=sx*.9}
        legs.push({hip,knee,front:!!fr,side:sx,ul,ll})}
      return {root,body,neck,head,jaw,tail,legs,bodyY}};
    this.tmpl[id]={mk:mkRig};return this.tmpl[id]},
  buildSnake(id){const S=FSP[id],N=44,root=new THREE.Group(),fur=new THREE.MeshStandardMaterial({map:this.fur('python'),roughness:.55,metalness:.05}),eye=new THREE.MeshStandardMaterial({color:0xe8c040,emissive:0x6a5810,emissiveIntensity:.8}),segs=[],rad=[];
    for(let k=0;k<N;k++){const r=S.R*(k===0?1.15:(1-Math.pow(k/N,2.3)*.82))*(k>0&&k<5?1.05:1),m=new THREE.Mesh(new THREE.SphereGeometry(1,9,6),fur);m.scale.set(r,r*(k===0?.7:.9),r*(k===0?1.9:2.1));root.add(m);segs.push(m);rad.push(r);
      if(k===0)for(const sd of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.2,5,4),eye);e.position.set(sd*.55,.5,.5);m.add(e)}}
    const dummy=new THREE.Group();return {root,segs,rad,body:dummy,neck:dummy,head:dummy,jaw:dummy,tail:[],legs:[],bodyY:0,snake:true}},
  animSnake(a,dt){const r=a.rig,N=r.segs.length,tr=a.trail,last=tr[tr.length-1];if(!last||Math.hypot(last[0]-a.x,last[1]-a.z)>.12){tr.push([a.x,a.z]);if(tr.length>500)tr.shift()}
    a.ph+=dt*(1.2+a.speed*2.4);let acc=0,idx=tr.length-1,px=a.x,pz=a.z;
    for(let k=0;k<N;k++){const want=k*.17;
      while(idx>0&&acc<want){const dx=tr[idx-1][0]-px,dz=tr[idx-1][1]-pz,l=Math.hypot(dx,dz);if(l<1e-4){idx--;continue}if(acc+l>=want){const f=(want-acc)/l;px+=dx*f;pz+=dz*f;acc=want;break}acc+=l;px=tr[idx-1][0];pz=tr[idx-1][1];idx--}
      const lat=Math.sin(k*.6-a.ph*2.4)*.17*Math.min(1,.25+a.speed*.5)*(k>0?1:.25),gx=px+Math.cos(a.yaw)*lat,gz=pz-Math.sin(a.yaw)*lat,gy=groundH(gx,gz);
      r.segs[k].position.set(gx-a.x,gy+r.rad[k]*.75-a.y,gz-a.z)}
    r.segs[0].rotation.y=a.yaw;r.segs[0].rotation.x=a.state==='attack'&&a.atk>.1?-.5:(a.state==='alert'?-.35:0);for(let k=1;k<N;k++){const A=r.segs[k-1].position,B=r.segs[k].position;r.segs[k].rotation.y=Math.atan2(A.x-B.x,A.z-B.z)}},
  spawn(id,x,z,yaw){const S=FSP[id];if(!S)return null;const rig=S.snake?this.buildSnake(id):this.buildQuad(id).mk();const a={id,S,rig,root:rig.root,x,z,y:0,yaw:yaw||0,vx:0,vz:0,speed:0,state:'idle',t:Math.random()*3,ph:Math.random()*6.28,hp:S.hp,home:[x,z],tgt:null,cd:0,dead:0,alert:0,jawO:0,wind:0,roarT:0,seed:Math.random()*100,pitch:0,stalk:0};
    a.root.scale.setScalar(.92+Math.random()*.16);if(S.snake){a.trail=[];for(let i=90;i>=0;i--)a.trail.push([x-Math.sin(a.yaw)*i*.1,z-Math.cos(a.yaw)*i*.1]);a.trail.push([x,z])}ISLE.root.add(a.root);this.place(a);this.list.push(a);return a},
  place(a){const g=groundH(a.x,a.z);a.y=g;a.root.position.set(a.x,g,a.z);a.root.rotation.y=a.yaw},
  // ---------- gait animation ----------
  animate(a,dt){if(a.S.snake)return this.animSnake(a,dt);const r=a.rig,S=a.S,t=performance.now()/1000+a.seed,sp=a.speed,id=a.id;
    const run=S.run,gal=sp>S.walk*2.6,freq=sp<.05?0:(gal?6.2:3.4*Math.min(1.6,.5+sp/ S.walk*.5)*(id==='croc'?.7:1));a.ph+=dt*freq;
    const sw=(gal?.9:.55)*Math.min(1,.3+sp/(S.walk*1.5)),bob=gal?.07:.025;
    const breathe=Math.sin(t*2.2)*.012;
    if(a.dead){return}
    if(sp<.05){
      for(const L of r.legs){L.hip.rotation.x*=.85;L.knee.rotation.x*=.85}
      r.body.position.y=r.bodyY*(a.stalk?.8:1)+breathe;r.body.rotation.x*=.9;r.body.rotation.y*=.9;
      r.neck.rotation.y=Math.sin(t*.7)*.25*(a.state==='idle'?1:.1);if(S.tail&&r.tail[0])r.tail[0].rotation.y=Math.sin(t*1.3)*.25}
    else{
      for(const L of r.legs){const diag=gal?(L.front?0:Math.PI*.45):((L.front?0:Math.PI)+(L.side>0?0:Math.PI)),p=a.ph+diag+(gal?(L.side>0?0:.25):0);
        const lift=Math.max(0,Math.cos(p));L.hip.rotation.x=Math.sin(p)*sw*(L.front?1:.9);L.knee.rotation.x=(L.front?-1:1)*lift*(gal?1.1:.8)*(id==='croc'?.4:1)*(a.id==='deer'?1.2:1)+.0;
        if(id==='croc')L.hip.rotation.y=Math.sin(p)*.5}
      r.body.position.y=r.bodyY+Math.abs(Math.sin(a.ph))*bob*(id==='croc'?0:1)-(a.stalk?.14:0)+breathe;
      r.body.rotation.x=(gal?Math.sin(a.ph*1)*.12:0)+(id==='gorilla'?-.28:0);r.body.rotation.y=(id==='croc'?Math.sin(a.ph)*.18:Math.sin(a.ph)*.04);
      if(r.tail[0]){const k=gal?.35:.2;for(let i=0;i<r.tail.length;i++)r.tail[i].rotation.y=Math.sin(a.ph*.9-i*.9)*k*(id==='croc'?1.6:1)}
      r.neck.rotation.y*=.9}
    // head: look at the player when alert/chasing, jaw opens when roaring or biting
    if(a.state==='alert'||a.state==='chase'||a.state==='attack'){const dx=player.x-a.x,dz=player.z-a.z;let d=Math.atan2(dx,dz)-a.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;r.neck.rotation.y+=(Math.max(-.7,Math.min(.7,d))-r.neck.rotation.y)*Math.min(1,dt*6)}
    const jawT=a.state==='attack'?(a.atk>.12?.62:0):a.roarT>0?(.35+Math.sin(t*14)*.1):(id==='croc'&&a.state==='idle'?.28:0);a.jawO+=(jawT-a.jawO)*Math.min(1,dt*14);r.jaw.rotation.x=a.jawO;
    r.head.rotation.x=(a.state==='attack'&&a.atk>.1?.35:a.stalk?.3:id==='deer'&&a.state==='idle'?.5:0)+(id==='gorilla'?.1:0)}
  ,
  // ---------- AI ----------
  open(x,z){const g=groundH(x,z);return g>SL+.25&&g<SL+175&&!ISLE.blocked(x,z,.7)},
  steerTo(a,tx,tz,sp,dt,turn){const dx=tx-a.x,dz=tz-a.z;let want=Math.atan2(dx,dz);let d=want-a.yaw;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;a.yaw+=Math.max(-turn*dt,Math.min(turn*dt,d));
    // go round trunks, water and cliffs: try the heading, then fan out
    let moved=false;for(const off of [0,.5,-.5,1.0,-1.0,1.6,-1.6]){const h=a.yaw+off,nx=a.x+Math.sin(h)*sp*dt,nz=a.z+Math.cos(h)*sp*dt;const slope=groundH(nx,nz)-a.y;if(this.open(nx,nz)&&slope<.9*sp*dt*3+.15){a.x=nx;a.z=nz;if(off)a.yaw+=off*Math.min(1,dt*4);moved=true;break}}
    a.speed+=((moved?sp:0)-a.speed)*Math.min(1,dt*6);return moved},
  safe(x,z){const b=ISL.beach;return Math.hypot(x-(b[0]+14),z-(b[1]+4))<38},
  sound(a,kind){if(typeof AUD==='undefined'||!AUD||!AUD.ok)return;const d=Math.hypot(a.x-player.x,a.z-player.z),v=Math.max(0,1-d/90)*.14;if(v<=.005)return;
    if(kind==='roar'){AUD.tone(110,48,.9,v,'sawtooth');AUD.tone(80,40,.9,v*.8,'square');AUD.burst&&AUD.burst(300,90,.8,v*.5,'lowpass',1)}
    else if(kind==='grunt'){AUD.tone(90,60,.5,v,'sawtooth');AUD.tone(130,90,.3,v*.6,'square',undefined,.2)}
    else if(kind==='squeal'){AUD.tone(900,420,.4,v*.6,'sawtooth');AUD.tone(1100,500,.3,v*.4,'square',undefined,.1)}
    else if(kind==='laugh'){for(let i=0;i<5;i++)AUD.tone(520-i*30,420-i*30,.12,v*.6,'sawtooth',undefined,i*.14)}
    else if(kind==='hiss'){AUD.burst&&AUD.burst(3500,1500,.9,v*.8,'highpass',1)}},
  aiOne(a,dt){const S=a.S,px=player.x,pz=player.z,dx=px-a.x,dz=pz-a.z,d=Math.hypot(dx,dz);a.t-=dt;a.cd-=dt;if(a.roarT>0)a.roarT-=dt;
    const pOn=!(typeof MP!=='undefined'&&MP.on),ps=this.safe(px,pz)||!pOn||HELI.on||PORTAL.cur;      // nothing reaches you on the yacht, in a heli, or in the firelight of the camp
    if(S.flee){ // prey
      if(a.state==='flee'){const ax=a.x-dx,az=a.z-dz;this.steerTo(a,ax,az,S.run,dt,5);if(d>S.sight*1.4){a.state='idle';a.t=2}}
      else{if(d<S.sight*(MP&&0?1:1)&&!ps){a.state='flee';if(a.id==='deer')this.sound(a,'')}else if(a.state==='idle'){a.speed*=.9;if(a.t<0){a.state='wander';a.tgt=this.wanderPt(a);a.t=5+Math.random()*4}}else if(a.state==='wander'){const m=this.steerTo(a,a.tgt[0],a.tgt[1],S.walk,dt,2);if(a.t<0||!m||Math.hypot(a.tgt[0]-a.x,a.tgt[1]-a.z)<2){a.state='idle';a.t=2+Math.random()*5}}}
      return}
    // predators
    const near=d<S.sight;
    switch(a.state){
      case 'idle':a.speed*=.9;if(near&&!ps&&d<S.agg+(a.id==='croc'?0:10)){a.state='alert';a.t=.7+Math.random()*.7;a.stalk=a.id==='tiger'||a.id==='panther'?1:0;a.roarT=.8;this.sound(a,S.snd);this.wake(a)}
        else if(a.t<0){a.state='wander';a.tgt=this.wanderPt(a);a.t=6+Math.random()*6}break;
      case 'wander':{const m=this.steerTo(a,a.tgt[0],a.tgt[1],S.walk,dt,2.2);if(near&&!ps&&d<S.agg){a.state='alert';a.t=.6+Math.random()*.6;a.roarT=.8;this.sound(a,S.snd);this.wake(a);a.stalk=a.id==='tiger'||a.id==='panther'?1:0}else if(a.t<0||!m||Math.hypot(a.tgt[0]-a.x,a.tgt[1]-a.z)<2){a.state='idle';a.t=2+Math.random()*4}}break;
      case 'alert':a.speed*=.85;{let w=Math.atan2(dx,dz)-a.yaw;while(w>Math.PI)w-=6.283;while(w<-Math.PI)w+=6.283;a.yaw+=w*Math.min(1,dt*5)}if(ps){a.state='idle';a.t=2;a.stalk=0}else if(a.t<0){a.state='chase';a.stalk=0}break;
      case 'chase':{if(ps||d>S.sight*1.9){a.state='idle';a.t=3;break}
        if(d<S.rng*.9&&a.cd<=0){a.state='attack';a.atk=.42;a.hit=false;break}
        const sp=S.run*(d>25?1:.95);this.steerTo(a,px,pz,sp,dt,a.id==='boar'?4:7);}break;
      case 'attack':a.atk-=dt;a.speed*=.8;{let w=Math.atan2(dx,dz)-a.yaw;while(w>Math.PI)w-=6.283;while(w<-Math.PI)w+=6.283;a.yaw+=w*Math.min(1,dt*10)}
        // a short lunge forward at the moment of the bite
        if(a.atk<.25&&a.atk>.12){const lx=a.x+Math.sin(a.yaw)*5*dt,lz=a.z+Math.cos(a.yaw)*5*dt;if(this.open(lx,lz)){a.x=lx;a.z=lz}}
        if(a.atk<=.15&&!a.hit){a.hit=true;if(Math.hypot(player.x-a.x,player.z-a.z)<S.rng*1.35&&!ps)this.hurt(S.dmg*(.8+Math.random()*.4),a)}
        if(a.atk<=0){a.cd=S.cd;a.state=d<S.rng*2?'chase':'chase'}break}},
  wander(){},
  wanderPt(a){for(let i=0;i<8;i++){const an=Math.random()*6.283,r=15+Math.random()*60,x=a.home[0]+Math.cos(an)*r,z=a.home[1]+Math.sin(an)*r;if(this.open(x,z)&&!this.safe(x,z)&&(a.id!=='croc'||groundH(x,z)<SL+2.5))return [x,z]}return [a.home[0],a.home[1]]},
  wake(a){for(const o of this.list){if(o!==a&&o.id===a.id&&!o.dead&&o.state!=='chase'&&Math.hypot(o.x-a.x,o.z-a.z)<45){o.state='alert';o.t=.4+Math.random()*.5;o.roarT=.5}}},
  // ---------- the player's health ----------
  hurt(v,a){if(this.dead>0)return;this.hp=Math.max(0,this.hp-v);this.hpT=8;this.flashT=.5;FX.init&&FX.init();FX.shakeT=.35;FX.shakeA=Math.max(FX.shakeA||0,.22);
    if(a){const l=Math.hypot(player.x-a.x,player.z-a.z)||1,k=a.id==='gorilla'?10:6;player.vx+=(player.x-a.x)/l*k;player.vz+=(player.z-a.z)/l*k;if(typeof AUD!=='undefined'&&AUD&&AUD.ok)AUD.tone(180,70,.25,.12,'sawtooth')}
    toast(a?('A '+a.S.n.toLowerCase()+' got you'):'Ouch','health '+Math.round(this.hp));
    if(this.hp<=0){this.dead=3.2;toast('You were mauled','you wake up at the camp on the beach…');const f=document.getElementById('fade');if(f)f.style.opacity=1}},
  respawn(){const b=ISL.beach;this.hp=100;this.dead=0;if(MP.on)MP.exit(true);teleportRaw(b[0]+8,b[1]+4,Math.atan2(ISL.cx-b[0],ISL.cz-b[1]));const f=document.getElementById('fade');if(f)f.style.opacity=0;for(const a of this.list){if(a.state==='chase'||a.state==='attack'||a.state==='alert'){a.state='idle';a.t=3}}},
  ui_(){if(this.ui)return;const d=document.createElement('div');d.id='isleHp';d.style.cssText='position:absolute;left:50%;top:calc(76px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:6;width:200px;height:12px;border-radius:7px;background:rgba(0,0,0,.45);border:1.5px solid rgba(255,255,255,.35);overflow:hidden;opacity:0;transition:opacity .3s;pointer-events:none';d.innerHTML='<i style="display:block;height:100%;width:100%;background:linear-gradient(90deg,#c0392b,#e8a020,#3ad07a)"></i>';const v=document.createElement('div');v.id='isleHurt';v.style.cssText='position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(160,0,0,0) 40%,rgba(180,0,0,.75) 100%)';const h=document.getElementById('hud')||document.body;h.appendChild(v);h.appendChild(d);this.ui={bar:d,i:d.firstChild,vig:v}},
  // ---------- shooting / blasts ----------
  ray(o,d,max){let best=null;for(const a of this.list){if(a.dead)continue;const c=this.V.set(a.x,a.y+a.rig.bodyY+.1,a.z).sub(o),t=c.dot(d);if(t<0||t>max)continue;const r=a.S.R*1.5+a.S.L*.28,dist2=c.lengthSq()-t*t;if(dist2>r*r)continue;
      const t2=t-Math.sqrt(Math.max(0,r*r-dist2));if(!best||t2<best.t)best={a,t:Math.max(.5,t2),head:(o.y+d.y*t)>a.y+a.rig.bodyY+a.S.R*.6}}return best},
  damage(a,v,head){if(a.dead)return;a.hp-=v;a.roarT=.5;if(!a.S.flee&&a.state!=='attack'){a.state='chase';a.cd=.2}if(a.S.flee){a.state='flee'}
    if(a.hp<=0){a.dead=1;a.state='dead';a.dt=0;toast(a.S.n+' down','+₴'+a.S.pay);try{WALLET.earn(a.S.pay)}catch(e){}}},
  boom(x,y,z,r){for(const a of this.list){if(a.dead)continue;const d=Math.hypot(a.x-x,a.z-z);if(d<r+2)this.damage(a,Math.round(400*(1-d/(r+2))+40))}},
  // ---------- spawning + update ----------
  count(id){let n=0;for(const a of this.list)if(a.id===id&&!a.dead)n++;return n},
  trySpawn(){if(this.list.length>=22)return;const ids=Object.keys(FSP).filter(i=>this.count(i)<FSP[i].cap);if(!ids.length)return;const id=ids[Math.floor(Math.random()*ids.length)];
    for(let k=0;k<14;k++){const an=Math.random()*6.283,r=110+Math.random()*280,x=player.x+Math.cos(an)*r,z=player.z+Math.sin(an)*r;
      const g=groundH(x,z)-SL;if(!ISLE.near(x,z)||g<(id==='croc'?.2:3.5)||this.safe(x,z)||Math.hypot(x-ISL.beach[0],z-ISL.beach[1])<130||ISLE.blocked(x,z,1.2))continue;
      if(id==='croc'){let wet=false;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]])if(groundH(x+dx*14,z+dz*14)<SL+.1)wet=true;const p=ISL.pond;if(Math.hypot(x-p.x,z-p.z)<46)wet=true;if(!wet||g>1.8)continue}
      if(id!=='croc'&&g<3)continue;
      const n=id==='boar'?3:id==='hyena'?3:id==='deer'?2:1;for(let i=0;i<n;i++)this.spawn(id,x+(Math.random()-.5)*8,z+(Math.random()-.5)*8,Math.random()*6.28);return}},
  update(dt,dIsl){
    if(!this.ui)this.ui_();
    if(!ISLE.on||!started){for(const a of this.list)a.root.visible=false;this.ui.bar.style.opacity=0;return}
    // keep a population around the player
    this.spawnT-=dt;if(this.spawnT<=0){this.spawnT=2.2;this.trySpawn()}
    for(let i=this.list.length-1;i>=0;i--){const a=this.list[i],d=Math.hypot(a.x-player.x,a.z-player.z);
      if(d>700||(a.dead&&(a.dt+=dt)>25)){ISLE.root.remove(a.root);this.list.splice(i,1);continue}
      a.root.visible=d<520;
      if(a.dead){if(a.S.snake){a.root.scale.y=Math.max(.15,a.root.scale.y-dt)}else{a.root.rotation.z+=(Math.PI/2*.97-a.root.rotation.z)*Math.min(1,dt*4);a.root.position.y+=(a.y+.12-a.root.position.y)*Math.min(1,dt*4)}continue}
      if(d<460){this.aiOne(a,dt);
        // follow the ground (slope pitch)
        const f=a.S.L*.3,gf=groundH(a.x+Math.sin(a.yaw)*f,a.z+Math.cos(a.yaw)*f),gb=groundH(a.x-Math.sin(a.yaw)*f,a.z-Math.cos(a.yaw)*f);a.y+=((gf+gb)/2-a.y)*Math.min(1,dt*10);a.pitch+=(Math.atan2(gb-gf,f*2)*0+Math.atan2(gb-gf,f*2)-a.pitch)*Math.min(1,dt*6);
        a.root.position.set(a.x,a.y,a.z);if(a.S.snake)a.root.rotation.set(0,0,0);else a.root.rotation.set(a.pitch*.8,a.yaw,0,'YXZ');if(d<340)this.animate(a,dt)}}
    // player health: regen, bar, flash
    if(this.dead>0){this.dead-=dt;if(this.dead<=0)this.respawn()}
    else{this.hpT-=dt;if(this.hp<100&&this.hpT<=0)this.hp=Math.min(100,this.hp+dt*4)}
    this.flashT=Math.max(0,this.flashT-dt);this.ui.vig.style.opacity=Math.min(1,this.flashT*2+(this.hp<35?.25+.1*Math.sin(performance.now()*.008):0));
    this.ui.i.style.width=Math.max(0,this.hp)+'%';this.ui.bar.style.opacity=(this.hp<100||this.list.some(a=>a.S.hostile&&(a.state==='chase'||a.state==='attack')))?1:0;
    this.birdsUpdate(dt)},
  // ---------- macaws ----------
  birdsInit(){const g=new THREE.Group();ISLE.root.add(g);this.birds={g,list:[]};const cols=[[0xd02a22,0x2860c0],[0x2860c0,0xf0c020],[0xf0c020,0x30a050],[0xd02a22,0xf0c020]];
    for(let i=0;i<10;i++){const c=cols[i%4],b=new THREE.Group(),bm=new THREE.MeshStandardMaterial({color:c[0],roughness:.7}),wm=new THREE.MeshStandardMaterial({color:c[1],roughness:.7,side:THREE.DoubleSide}),
        body=new THREE.Mesh(new THREE.SphereGeometry(.12,7,5),bm);body.scale.set(1,.9,2.2);b.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.08,6,5),bm);head.position.set(0,.04,.25);b.add(head);const beak=new THREE.Mesh(new THREE.ConeGeometry(.035,.1,4),new THREE.MeshStandardMaterial({color:0x222222}));beak.rotation.x=Math.PI/2;beak.position.set(0,.02,.34);b.add(beak);
        const tail=new THREE.Mesh(new THREE.PlaneGeometry(.1,.6),wm);tail.rotation.x=-Math.PI/2;tail.position.set(0,0,-.5);b.add(tail);
        const wings=[];for(const s of [-1,1]){const w=new THREE.Group();w.position.set(s*.08,.05,.02);const wg=new THREE.PlaneGeometry(.55,.26);wg.translate(s*.28,0,0);const wm2=new THREE.Mesh(wg,wm);wm2.rotation.x=-Math.PI/2;w.add(wm2);b.add(w);wings.push([w,s])}
        g.add(b);this.birds.list.push({b,wings,r:50+Math.random()*80,a:Math.random()*6.28,w:.14+Math.random()*.12,h:18+Math.random()*18,ph:Math.random()*6.28})}},
  birdsUpdate(dt){if(!this.birds)this.birdsInit();const B=this.birds;B.g.visible=ISLE.on;if(!ISLE.on)return;const cx=player.x,cz=player.z;
    for(const q of B.list){q.a+=dt*q.w;q.ph+=dt*14;const x=cx+Math.cos(q.a)*q.r,z=cz+Math.sin(q.a)*q.r,y=Math.max(groundH(x,z)+q.h,SL+14)+Math.sin(q.a*3)*2;q.b.position.set(x,y,z);q.b.rotation.y=-q.a+Math.PI;q.b.rotation.z=.15;
      for(const [w,s] of q.wings)w.rotation.z=s*Math.sin(q.ph)*.7}}
};
