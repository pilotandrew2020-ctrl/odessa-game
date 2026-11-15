/* volcano.js — the mountain of Jungle Island is a volcano (2026-11-15). islH() (isle.js) cuts a crater into the peak (ISL.volc), so the terrain mesh, walking and
   the helicopter all agree. Here: a lake of moving lava on the crater floor (one shader disc), a smoke column (one Points cloud), and an eruption every minute
   or two while the player is on / near the island: a rumble, six glowing bombs on ballistic arcs that explode where they land (through GUN.addBoom, so they
   scorch the ground like every other explosion), lava that burns when you stand in it. A map place "Volcano" on the crater rim. ~700 triangles, 3 draw calls. */
ISL.volc={x:ISL.cx-260,z:ISL.cz+160,R:95,r:38,d:46};
const VOLC={g:null,next:40,bombs:[],
  init(){if(this.g||typeof ISLE==='undefined'||!ISLE.built)return;const V=ISL.volc,fy=SL+islH(V.x,V.z);this.fy=fy;const g=this.g=new THREE.Group();g.position.set(V.x,fy,V.z);ISLE.root.add(g);
    ISL.clear.push([V.x,V.z,V.R+25]);
    this.lm=new THREE.ShaderMaterial({uniforms:{t:{value:0}},vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 u;uniform float t;float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float f(vec2 p){vec2 i=floor(p),q=fract(p);q=q*q*(3.-2.*q);return mix(mix(n(i),n(i+vec2(1,0)),q.x),mix(n(i+vec2(0,1)),n(i+vec2(1,1)),q.x),q.y);}'+
        'void main(){vec2 p=u*9.;float a=f(p+vec2(t*.12,t*.07))*.6+f(p*2.3-vec2(t*.2,t*.09))*.4;float c=smoothstep(.38,.62,a);vec3 col=mix(vec3(.16,.03,.01),vec3(1.,.42,.04),c)+vec3(1.,.9,.5)*smoothstep(.72,.9,a);float e=smoothstep(.5,.44,distance(u,vec2(.5)));gl_FragColor=vec4(col*(1.2+.3*sin(t*2.+a*8.)),e);}',transparent:true,fog:false});
    const lava=new THREE.Mesh(new THREE.CircleGeometry(V.r+6,28),this.lm);lava.rotation.x=-Math.PI/2;lava.position.y=1.1;g.add(lava);
    const n=22,geo=new THREE.BufferGeometry(),p=this.sp=new Float32Array(n*3);geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,150,0),400);
    const tex=MBM.tex(32,32,(x,w)=>{const gr=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,w,w)});
    this.smoke=new THREE.Points(geo,new THREE.PointsMaterial({size:70,map:tex,color:0x4a4642,transparent:true,opacity:.6,depthWrite:false,sizeAttenuation:true}));g.add(this.smoke);this.ss=[];for(let i=0;i<n;i++)this.ss.push({t:i/n,a:i*2.4});
    const bg=new THREE.SphereGeometry(1.4,7,5),bm=new THREE.MeshBasicMaterial({color:0xff7a1a,fog:false});for(let i=0;i<6;i++){const m=new THREE.Mesh(bg,bm);m.visible=false;scene.add(m);this.bombs.push({m,on:false})}
    PLACES.push({id:'volcano',name:'Volcano',sub:'Jungle Island · crater rim, a lake of lava, eruptions',x:V.x-V.R-6,z:V.z,yaw:Math.PI/2});try{MAP_SEA.add('volcano')}catch(e){}
    ANIM.push(dt=>this.update(dt))},
  erupt(){const V=ISL.volc;this.next=70+Math.random()*50;for(const b of this.bombs){const a=Math.random()*6.283,s=14+Math.random()*24;b.on=true;b.x=V.x;b.y=this.fy+4;b.z=V.z;b.vx=Math.cos(a)*s;b.vz=Math.sin(a)*s;b.vy=52+Math.random()*22;b.m.visible=true}
    const d=Math.hypot(player.x-V.x,player.z-V.z);if(d<2600){toast('The volcano erupts','lava bombs · keep away from the mountain');if(typeof ARS!=='undefined'){ARS.snd(90,24,3.2,Math.max(.25,1-d/2600));if(d<900)ARS.shake(.4*(1-d/900)+.1,1.4)}}this.burst=3},
  update(dt){if(!this.g||!ISLE.root.visible)return;const V=ISL.volc,d=Math.hypot(player.x-V.x,player.z-V.z);if(d>4200)return;
    this.lm.uniforms.t.value+=dt;this.burst=Math.max(0,(this.burst||0)-dt);
    const p=this.sp,k=this.burst>0?2.2:1;for(let i=0;i<this.ss.length;i++){const s=this.ss[i];s.t+=dt/14*k;if(s.t>=1){s.t=0;s.a=Math.random()*6.283}const y=6+s.t*300,r=8+s.t*70;p[i*3]=Math.cos(s.a+s.t*2)*r+s.t*60;p[i*3+1]=y;p[i*3+2]=Math.sin(s.a+s.t*2)*r}this.smoke.geometry.attributes.position.needsUpdate=true;
    this.next-=dt;if(this.next<=0&&ISLE.on)this.erupt();
    for(const b of this.bombs){if(!b.on)continue;b.vy-=9.8*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.m.position.set(b.x,b.y,b.z);const gy=Math.max(groundH(b.x,b.z),SL);
      if(b.vy<0&&b.y<=gy+.5){b.on=false;b.m.visible=false;try{GUN.addBoom(b.x,gy+.5,b.z,8,70)}catch(e){}if(typeof FAUNA!=='undefined'&&Math.hypot(player.x-b.x,player.z-b.z)<9)FAUNA.hurt(35)}}
    // the lava burns
    if(d<V.r&&player.y<this.fy+2.2&&!window.NOWALK){this.hot=(this.hot||0)-dt;if(this.hot<=0){this.hot=.5;if(typeof FAUNA!=='undefined')FAUNA.hurt(9);else toast('Lava!','get out')}}}};
window.VOLC=VOLC;
