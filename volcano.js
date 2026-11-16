// volcano.js — the volcano on Jungle Island (2026-11-16). The cone and its crater are in the island height function (isle.js islVolcano), so walking, cars and the camera agree with the mesh.
//   Here: a glowing lava lake in the crater, three lava flows running down the slope, a smoke column, a rumble that follows the distance, and an eruption every ~75 s: a warning (the ground shakes, a growl),
//   then 16 glowing lava bombs thrown up and out (they fall up to 400 m away, explode where they land, hurt anyone within 7 m) and a big ash cloud. Touching the lava burns. Everything is drawn only within 2.6 km.
//   VOL.erupt() starts one on demand. Cost: ~2.5k triangles, 150 smoke points, no lights (emissive materials only), nothing when you are far away.
const VOL={on:false,built:false,t:0,state:'idle',bombs:[],hit:0,
  init(){if(this.inited)return;this.inited=1;PLACES.push({id:'volcano',name:'Volcano',sub:'the crater of Jungle Island: do not touch the lava',x:ISLV.x-190,z:ISLV.z-30,yaw:Math.atan2(190,30)});ANIM.push(dt=>this.update(dt))},
  build(){if(this.built||typeof scene==='undefined'||typeof groundH!=='function')return;this.built=true;const g=this.g=new THREE.Group();scene.add(g);const X=ISLV.x,Z=ISLV.z;this.y0=groundH(X,Z);this.lavaY=this.y0+3.5;
    const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d'),im=c.createImageData(128,128);for(let j=0;j<128;j++)for(let i=0;i<128;i++){const n=Math.abs(Math.sin(i*.19+Math.sin(j*.13)*3)+Math.sin(j*.23+Math.sin(i*.17)*2.5));const k=Math.pow(n/2,.6),q=(j*128+i)*4;im.data[q]=255;im.data[q+1]=60+k*150;im.data[q+2]=k*40;im.data[q+3]=255}c.putImageData(im,0,0);
    const tx=this.tx=new THREE.CanvasTexture(cv);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.encoding=THREE.sRGBEncoding;
    const lm=new THREE.MeshBasicMaterial({map:tx,fog:false,toneMapped:false}),lake=new THREE.Mesh(new THREE.CircleGeometry(30,40),lm);lake.rotation.x=-Math.PI/2;lake.position.set(X,this.lavaY,Z);lake.frustumCulled=false;g.add(lake);this.lake=lake;
    // three lava flows: down the steepest slope from the rim
    this.flows=[];for(let k=0;k<3;k++){let a=k*2.09+.5,x=X+Math.cos(a)*74,z=Z+Math.sin(a)*74;const P=[];for(let i=0;i<46;i++){const gx=groundH(x+3,z)-groundH(x-3,z),gz=groundH(x,z+3)-groundH(x,z-3),l=Math.hypot(gx,gz)||1;P.push([x,z,groundH(x,z)+.5]);x-=gx/l*12;z-=gz/l*12;if(groundH(x,z)<=0&&i>5)break}
      const pos=[],uv=[],idx=[];P.forEach((p,i)=>{const nx=P[Math.min(i+1,P.length-1)][0]-P[Math.max(i-1,0)][0],nz=P[Math.min(i+1,P.length-1)][1]-P[Math.max(i-1,0)][1],l=Math.hypot(nx,nz)||1,w=5.5*(1-i/P.length*.4);pos.push(p[0]-nz/l*w,p[2],p[1]+nx/l*w,p[0]+nz/l*w,p[2],p[1]-nx/l*w);uv.push(0,i*.5,1,i*.5);if(i)idx.push((i-1)*2,i*2,(i-1)*2+1,i*2,i*2+1,(i-1)*2+1)});
      const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));fg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));fg.setIndex(idx);const m=new THREE.Mesh(fg,lm);m.frustumCulled=false;g.add(m);this.flows.push(P)}
    // smoke column: 150 points rising from the crater
    const N=150,pp=new Float32Array(N*3);this.sm=[];for(let i=0;i<N;i++)this.sm.push({y:Math.random()*420,a:Math.random()*6.28,r:Math.random()*14,s:.7+Math.random()*.6});
    const sc=document.createElement('canvas');sc.width=sc.height=64;const sx=sc.getContext('2d'),sg=sx.createRadialGradient(32,32,2,32,32,31);sg.addColorStop(0,'rgba(90,82,76,.9)');sg.addColorStop(.6,'rgba(70,66,64,.45)');sg.addColorStop(1,'rgba(60,58,58,0)');sx.fillStyle=sg;sx.fillRect(0,0,64,64);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pp,3));this.smoke=new THREE.Points(geo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(sc),size:90,sizeAttenuation:true,transparent:true,depthWrite:false,opacity:.62,fog:true}));this.smoke.frustumCulled=false;g.add(this.smoke);
    // lava bombs (pool)
    const bg=new THREE.IcosahedronGeometry(1,0),bm=new THREE.MeshBasicMaterial({color:0xff7a22,fog:false,toneMapped:false});for(let i=0;i<16;i++){const m=new THREE.Mesh(bg,bm);m.visible=false;m.frustumCulled=false;g.add(m);this.bombs.push({m,live:false,p:new THREE.Vector3(),v:new THREE.Vector3(),r:1,tt:0})}
    this.snd()},
  snd(){try{if(typeof AUD==='undefined'||!AUD.ok||!AUD.ctx||!AUD.noise||this._s)return;const c=AUD.ctx,s=c.createBufferSource();s.buffer=AUD.noise;s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=110;const gn=c.createGain();gn.gain.value=0;s.connect(f);f.connect(gn);gn.connect(AUD.master||c.destination);s.start();this._s={c,gn,f}}catch(e){}},
  erupt(){if(!this.built)this.build();this.state='warn';this.t=0;this.n=0;this.nl=0;toast('The volcano is waking up','the ground trembles: get away from the crater!')},
  update(dt){const X=ISLV.x,Z=ISLV.z,d=Math.hypot(player.x-X,player.z-Z);const near=typeof started!=='undefined'&&started&&d<2600;
    if(!near){if(this.g&&this.g.visible){this.g.visible=false}if(this._s)this._s.gn.gain.value=0;return}
    if(!this.built)this.build();if(!this.built)return;this.g.visible=true;dt=Math.min(dt,.1);this.t+=dt;if(!this._s)this.snd();
    this.tx.offset.y-=dt*.08;this.tx.offset.x+=dt*.02;this.lake.scale.setScalar(1+Math.sin(this.t*1.7)*.015);
    // the cycle: quiet -> warning (6 s) -> eruption (6 s) -> quiet; the first one 25 s after you arrive
    if(this.state==='idle'){this.quiet=(this.quiet===undefined?25:this.quiet)+dt;if(this.quiet>50){this.quiet=0;this.erupt()}}
    else if(this.state==='warn'){if(this.t>6){this.state='erupt';this.t=0;this.n=0;this.nl=0;if(typeof FX!=='undefined'&&FX.ready)FX.explode(ISLV.x,this.lavaY+6,ISLV.z,6)}}
    else if(this.state==='erupt'){this.n+=dt*2.7;while(this.n>=1&&this.nl<16){this.n--;this.launch()}if(this.t>7){this.state='idle';this.quiet=-25}}
    // smoke
    const P=this.smoke.geometry.attributes.position,k=this.state==='erupt'?2.6:this.state==='warn'?1.4:1,N=this.sm.length;for(let i=0;i<N;i++){const p=this.sm[i];p.y+=dt*(16+9*k)*p.s;if(p.y>440*(.6+.4*k)){p.y=0;p.a=Math.random()*6.28;p.r=Math.random()*14}const w=p.y*.18;P.setXYZ(i,X+Math.cos(p.a)*(p.r+w*.5)+p.y*.35,this.y0+8+p.y,Z+Math.sin(p.a)*(p.r+w*.5)-p.y*.12)}P.needsUpdate=true;this.smoke.material.opacity=.55+.15*(k-1);
    // bombs
    for(const b of this.bombs){if(!b.live)continue;b.tt+=dt;b.v.y-=14*dt;b.p.addScaledVector(b.v,dt);b.m.position.copy(b.p);b.m.rotation.x+=dt*3;b.m.rotation.z+=dt*2;
      if(typeof FX!=='undefined'&&FX.ready&&Math.random()<dt*14)FX.puff({x:b.p.x,y:b.p.y,z:b.p.z,vx:0,vy:1,vz:0,s0:1.4,s1:5,life:1.4,c0:0xff9a40,c1:0x4a4440,op:.7,grow:1});
      const gy=groundH(b.p.x,b.p.z);if(b.p.y<=gy+b.r){b.live=false;b.m.visible=false;if(typeof FX!=='undefined'){FX.init();FX.explode(b.p.x,gy+1,b.p.z,3.5)}
        if(Math.hypot(b.p.x-player.x,b.p.z-player.z)<7&&Math.abs(player.y-gy)<6&&typeof GUN!=='undefined'){this.hurt(45);this.hit++}}}
    // lava burns, the shaking and the growl
    const dl=Math.hypot(player.x-X,player.z-Z);if(dl<31&&player.y<this.lavaY+1.3){this._b=(this._b||0)-dt;if(this._b<=0){this._b=.35;this.hurt(22);if(!this._tt||performance.now()-this._tt>3000){this._tt=performance.now();toast('The lava burns!','get out of the crater')}}}
    if((this.state!=='idle')&&d<700&&typeof FX!=='undefined'&&FX.ready){FX.shakeT=.15;FX.shakeA=Math.max(FX.shakeA||0,Math.min(.05,(this.state==='erupt'?.04:.015)*(1-d/700)))}
    if(this._s){const lv=(this.state==='erupt'?1:this.state==='warn'?.6:.22)*Math.max(0,1-d/2400);this._s.gn.gain.setTargetAtTime(lv*.55,this._s.c.currentTime,.3);this._s.f.frequency.setTargetAtTime(70+lv*90,this._s.c.currentTime,.3)}},
  // armed mode has hit points (GUN.damage); otherwise the heat adds up and at 100 you are carried back to the foot of the mountain
  hurt(v){if(typeof GUN!=='undefined'&&GUN.armed){GUN.damage(v,'volcano');return}this.burn=(this.burn||0)+v;if(this.burn>=100){this.burn=0;const p=PLACES.find(q=>q.id==='volcano');toast('The volcano got you','you wake up at the foot of the mountain');if(p)teleportRaw(p.x,p.z,p.yaw)}else toast('Hot!','the heat hurts: '+Math.round(this.burn)+' / 100')},
  launch(){const b=this.bombs.find(q=>!q.live);if(!b)return;this.nl=(this.nl||0)+1;const a=Math.random()*6.283,sp=22+Math.random()*50,r=.8+Math.random()*1.4;b.live=true;b.tt=0;b.r=r;b.p.set(ISLV.x,this.lavaY+4,ISLV.z);b.v.set(Math.cos(a)*sp,55+Math.random()*40,Math.sin(a)*sp);b.m.scale.setScalar(r);b.m.visible=true;},
};
