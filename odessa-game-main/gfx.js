/* ===================================================================================================
   GFX+  — cinematic layer for My Odesa (GTA IV / V inspired look)
   Loaded BEFORE the main script; every access to game globals (S, TOD, UNI, scene, camera, CARS …) happens
   at call time, after boot, so the game still runs (with its original look) if this file is missing.

   • colour grade + vignette + film grain + sun shafts      (post pass, composer = Medium / High)
   • procedural drifting clouds lit by the sun / moon          (one cheap dome, tileable noise texture)
   • glow halos on street lamps, headlights and tail lights    (one Points draw call)
   • car headlight cones for the shaders (uCP / uCD / uNCar)  (see lampLight in index.html)
   • flocks of birds circling over the city                    (instanced, animated in the vertex shader)
   • warm city-light blobs in the night/dusk environment map   (wet roads and car paint reflect them)
   • rain with lightning, thunder and wet streets              (Weather row in the menu, key R)
   =================================================================================================== */
var GFX=(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

// ---------- per-time-of-day look (radiance values are pre-exposure, like the rest of the scene) ----------
const LOOK={
  day:  {sat:1.14,con:.36,tS:[.96,1.00,1.05],tH:[1.03,1.00,.97],vig:.32,grain:.030,ca:.0035,ray:.20,rayC:[1,.93,.78],
         cl:{cover:.36,op:.95,lit:[2.1,2.05,1.95],shade:[.80,.88,1.04],glow:[0,0,0],rim:.30,tint:[.10,.30,.80,.50]},bird:[.94,.94,.92]},
  dusk: {sat:1.10,con:.30,tS:[.90,.95,1.14],tH:[1.15,.97,.78],vig:.38,grain:.035,ca:.0045,ray:.60,rayC:[1,.58,.28],
         cl:{cover:.62,op:.96,lit:[2.6,1.05,.42],shade:[.50,.36,.58],glow:[.30,.11,.03],rim:.55,tint:[.20,.15,.42,.28]},bird:[.10,.09,.09]},
  night:{sat:.92,con:.32,tS:[.84,.97,1.16],tH:[1.08,1.00,.90],vig:.44,grain:.045,ca:.0045,ray:.10,rayC:[.55,.68,1],
         cl:{cover:.42,op:.72,lit:[.30,.38,.58],shade:[.030,.040,.075],glow:[.12,.055,.02],rim:.20,tint:[0,0,0,0]},bird:null}
};
const RAIN_CL={cover:1.3,op:1,lit:[.72,.76,.82],shade:[.20,.23,.28],glow:[.10,.06,.03],rim:0,tint:[0,0,0,0]};

const G={ready:false,t:0,rain:0,snow:0,fog:0,pass:null,rays:true,carLights:true,
  k:{sun:1,hemi:1,fog:1,exp:1,flash:0},
  fogDensity:.002,fogCol:new THREE.Color(),flT:-1,ltT:8,carN:0,lampT:0,lampN:0,halo:null,cloud:null,birds:null,rainM:null,rs:null};
const _v=new THREE.Vector3(),_d=new THREE.Vector3(),_c=new THREE.Color(),_c2=new THREE.Color();

// ===================================================================================================
// post pass: colour grade, sun shafts, vignette, grain, faint chromatic aberration
// ===================================================================================================
const GRADE={
  uniforms:{tDiffuse:{value:null},uTime:{value:0},uSun:{value:new THREE.Vector2(.5,.5)},uRays:{value:0},uRayC:{value:new THREE.Vector3(1,.9,.7)},
    uTS:{value:new THREE.Vector3(1,1,1)},uTH:{value:new THREE.Vector3(1,1,1)},uSat:{value:1},uCon:{value:0},uVig:{value:0},uGrain:{value:0},uCA:{value:0},uFlash:{value:0},uAsp:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uRays,uSat,uCon,uVig,uGrain,uCA,uFlash,uAsp;
uniform vec2 uSun;uniform vec3 uRayC,uTS,uTH;varying vec2 vUv;
float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 uv=vUv,d=uv-.5;vec2 da=d*vec2(uAsp,1.);float r2=dot(da,da);
 vec3 col=vec3(texture2D(tDiffuse,uv+d*uCA*r2).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-d*uCA*r2).b);
 if(uRays>.002){                                  // crepuscular rays: march toward the sun, gather the unoccluded bright sky
   vec2 dl=uSun-uv;float dist=length(dl*vec2(uAsp,1.));
   vec2 stp=dl*(.8/14.);vec2 p=uv+stp*hh(gl_FragCoord.xy+uTime);
   vec3 acc=vec3(0.);float w=1.;
   for(int i=0;i<14;i++){p+=stp;vec3 s=texture2D(tDiffuse,p).rgb;float m=max(max(s.r,s.g),s.b);acc+=s*smoothstep(.66,1.,m)*w;w*=.89;}
   col+=acc*(1./14.)*uRays*exp(-dist*1.5)*uRayC;
 }
 float l=dot(col,vec3(.2126,.7152,.0722));
 col=mix(vec3(l),col,uSat);                                        // saturation
 {vec3 cc=clamp(col,0.,1.);col=mix(col,cc*cc*(3.-2.*cc)+(col-cc),uCon);}   // filmic S-curve: deeper blacks, punchier highlights (values above 1 pass through untouched)
 col*=mix(uTS,uTH,smoothstep(.10,.80,l));                          // cool shadows, warm highlights
 col*=1.-uVig*smoothstep(.45,1.08,length(d)*1.414);                 // vignette: corners only, never the sky
 col+=uFlash;
 col+=(hh(gl_FragCoord.xy+fract(uTime*.37)*vec2(341.,127.))-.5)*uGrain*(1.-l*.7);   // film grain, stronger in the dark
 gl_FragColor=vec4(max(col,0.),1.);
}`};

function gradePass(){
  const p=new THREE.ShaderPass(GRADE);G.pass=p;apply();return p;
}

// ===================================================================================================
// clouds: one dome, tileable fbm texture, cheap self-shadowing toward the sun
// ===================================================================================================
function tileFbm(N,P0,oct,seed){
  const r=mulberry(seed),L=[];let P=P0;for(let o=0;o<oct;o++){const g=new Float32Array(P*P);for(let i=0;i<g.length;i++)g[i]=r();L.push([P,g]);P*=2}
  const out=new Float32Array(N*N);let mn=1e9,mx=-1e9;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=0,a=.5,s=0;
    for(const [P,g] of L){const fx=x/N*P,fy=y/N*P,x0=Math.floor(fx),y0=Math.floor(fy),tx=fx-x0,ty=fy-y0,sx=tx*tx*(3-2*tx),sy=ty*ty*(3-2*ty);
      const xa=x0%P,xb=(x0+1)%P,ya=y0%P,yb=(y0+1)%P;
      v+=a*lerp(lerp(g[ya*P+xa],g[ya*P+xb],sx),lerp(g[yb*P+xa],g[yb*P+xb],sx),sy);s+=a;a*=.5}
    v/=s;out[y*N+x]=v;if(v<mn)mn=v;if(v>mx)mx=v}
  for(let i=0;i<out.length;i++)out[i]=(out[i]-mn)/(mx-mn);
  return out;
}
const CLOUD_FS=`uniform sampler2D tC;uniform float uT,uCover,uOp;uniform vec3 uSunD,uLit,uShade,uGlow,uFlash;uniform float uRim;uniform vec4 uTint;varying vec3 vD;
float dens(vec2 uv){vec2 w=vec2(uT*.0050,uT*.0019);
 return texture2D(tC,uv*.15+w).r*.56+texture2D(tC,uv*.44+w*2.3+.37).g*.30+texture2D(tC,uv*1.25+w*4.7).r*.14;}
void main(){
 vec3 d=normalize(vD);if(d.y<.012)discard;
 vec2 uv=d.xz/(d.y+.2);
 float t=dens(uv);float e0=.70-.38*uCover;
 float cov=smoothstep(e0,e0+.2,t);
 vec2 sl=normalize(uSunD.xz+vec2(1e-4))*.05;
 float lit=clamp(.58+(t-dens(uv+sl))*3.6,0.,1.);                  // thicker toward the sun = in its own shadow
 lit=mix(lit,1.,(1.-cov)*.6);                                       // thin edges are back-lit
 float sd=max(dot(d,normalize(uSunD)),0.);
 vec3 col=mix(uShade,uLit,lit);
 col+=uLit*pow(sd,7.)*uRim*(1.-cov*.6);                             // silver lining around the sun
 col+=uGlow*exp(-d.y*6.)*(.35+.65*cov);                             // city glow / horizon scatter under the base
 col+=uFlash;
 float a=cov*smoothstep(.012,.2,d.y)*uOp;
 float ta=uTint.a*smoothstep(.04,.75,d.y);                           // deepen the blue toward the zenith (ACES washes a bright sky to grey)
 float A=a+ta*(1.-a);if(A<.004)discard;
 gl_FragColor=vec4((col*a+uTint.rgb*ta*(1.-a))/A,A);
 #include <tonemapping_fragment>
 #include <encodings_fragment>
}`;
function makeClouds(scene){
  const N=256,a=tileFbm(N,4,5,1337),b=tileFbm(N,8,4,4242),px=new Uint8Array(N*N*4);
  for(let i=0;i<N*N;i++){px[i*4]=a[i]*255;px[i*4+1]=b[i]*255;px[i*4+2]=0;px[i*4+3]=255}
  const tex=new THREE.DataTexture(px,N,N,THREE.RGBAFormat);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.magFilter=THREE.LinearFilter;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.anisotropy=4;tex.needsUpdate=true;
  const U={tC:{value:tex},uT:{value:0},uCover:{value:.5},uOp:{value:.9},uSunD:{value:new THREE.Vector3(0,1,0)},uLit:{value:new THREE.Vector3(1,1,1)},uShade:{value:new THREE.Vector3(.5,.5,.6)},uGlow:{value:new THREE.Vector3()},uFlash:{value:new THREE.Vector3()},uRim:{value:.3},uTint:{value:new THREE.Vector4()}};
  const m=new THREE.Mesh(new THREE.SphereGeometry(2450,40,16,0,Math.PI*2,0,Math.PI/2),new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,depthWrite:false,fog:false,uniforms:U,
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}',fragmentShader:CLOUD_FS}));
  m.renderOrder=-9;m.frustumCulled=false;scene.add(m);G.cloud={m,U};
}

// ===================================================================================================
// birds: 56 gulls circling around the player, animated entirely in the vertex shader
// ===================================================================================================
function makeBirds(scene){
  const N=56,g=new THREE.InstancedBufferGeometry();
  const P=[0,0,.55, -.12,0,-.1, .12,0,-.1,   -.12,0,-.1, .12,0,-.1, 0,0,-.5,   -.1,0,.15, -.1,0,-.2, -1,0,-.12,   .1,0,.15, .1,0,-.2, 1,0,-.12];
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  const r=mulberry(91),A=new Float32Array(N*4),B=new Float32Array(N*4);
  for(let i=0;i<N;i++){const dir=r()<.5?-1:1;
    A.set([30+r()*120,dir*(.10+r()*.14),r()*6.283,10+r()*50],i*4);
    B.set([(r()-.5)*360,.55+r()*.35,(r()-.5)*360,r()],i*4)}
  g.setAttribute('aA',new THREE.InstancedBufferAttribute(A,4));g.setAttribute('aB',new THREE.InstancedBufferAttribute(B,4));g.instanceCount=N;
  const U={uTime:{value:0},uCell:{value:new THREE.Vector2()},uCam:{value:new THREE.Vector3()},uCol:{value:new THREE.Vector3(.9,.9,.9)}};
  const m=new THREE.Mesh(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,uniforms:U,
    vertexShader:`uniform float uTime;uniform vec2 uCell;uniform vec3 uCam;attribute vec4 aA;attribute vec4 aB;varying float vF;
void main(){
 float dir=sign(aA.y),ang=aA.z+uTime*aA.y;
 vec3 c=vec3(uCell.x+aB.x,uCam.y+aA.w+sin(uTime*.21+aB.w*6.)*2.5,uCell.y+aB.z);
 vec3 pos=c+vec3(cos(ang),0.,sin(ang))*aA.x;
 vec3 fwd=normalize(vec3(-sin(ang),0.,cos(ang))*dir),right=vec3(-fwd.z,0.,fwd.x);
 float glide=smoothstep(.2,.8,sin(uTime*.35+aB.w*20.)*.5+.5);
 float flap=sin(uTime*(7.5+aB.w*3.)+aB.w*40.)*.6*(1.-glide*.85);
 vec3 lp=position;lp.y+=abs(lp.x)*flap+lp.x*.18*dir;
 vec3 wp=pos+right*lp.x*aB.y+vec3(0.,lp.y*aB.y,0.)+fwd*lp.z*aB.y;
 vF=1.-smoothstep(240.,480.,distance(wp,uCam));
 gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,
    fragmentShader:`uniform vec3 uCol;varying float vF;void main(){gl_FragColor=vec4(uCol,vF);
 #include <tonemapping_fragment>
 #include <encodings_fragment>
}`}));
  m.frustumCulled=false;m.renderOrder=-8;scene.add(m);G.birds={m,U};
}

// ===================================================================================================
// halos: street lamps, headlights, tail lights — one additive Points draw, HDR so bloom catches them
// ===================================================================================================
const HALO_N=256,HALO_LAMPS=150;
function makeHalos(scene){
  const g=new THREE.BufferGeometry(),pos=new Float32Array(HALO_N*3),col=new Float32Array(HALO_N*4);
  g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aC',new THREE.BufferAttribute(col,4).setUsage(THREE.DynamicDrawUsage));g.setDrawRange(0,0);
  const U={uK:{value:600},uNight:{value:0},uTime:{value:0}};
  const m=new THREE.Points(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,uniforms:U,
    vertexShader:`attribute vec4 aC;uniform float uK,uNight,uTime;varying vec4 vC;
void main(){
 vec4 mv=modelViewMatrix*vec4(position,1.);float d=max(-mv.z,.5);mv.z+=.5;                    // pull toward the camera: the glow sits in front of the lamp head
 float hs=fract(sin(dot(position.xz,vec2(12.9898,78.233)))*43758.5453),fl=1.;
 if(hs>.94)fl=.72+.28*step(.5,fract(sin(uTime*21.+hs*99.)*43758.5));                          // a few tired old bulbs flicker
 gl_PointSize=clamp(aC.w*uK/d,1.,64.);
 vC=vec4(aC.rgb*fl,(1.-smoothstep(110.,300.,d))*uNight*smoothstep(1.,4.,d));
 gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec4 vC;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
 float core=exp(-r*r*16.),halo=pow(1.-r,2.4)*.55;gl_FragColor=vec4(vC.rgb*2.1,(core+halo)*vC.a);}`}));
  m.frustumCulled=false;m.renderOrder=3;scene.add(m);G.halo={m,U,pos,col,g};
}
const _lp=[];
function gatherLamps(){
  const cam=camera.position,id0=chunkIdAt(cam.x,cam.z);_lp.length=0;
  if(id0>=0){const i0=id0%NCX,j0=Math.floor(id0/NCX);
    for(let j=j0-1;j<=j0+1;j++)for(let i=i0-1;i<=i0+1;i++){const c=chunks.get(j*NCX+i);if(!c||!c.lampPos)continue;const p=c.lampPos;
      for(let q=0;q<p.length;q+=3){const dx=p[q]-cam.x,dz=p[q+2]-cam.z,d=dx*dx+dz*dz;if(d<300*300)_lp.push([d,p[q],p[q+1],p[q+2]])}}}
  for(const e of EXTRA_LAMPS){const dx=e[0]-cam.x,dz=e[2]-cam.z,d=dx*dx+dz*dz;if(d<300*300)_lp.push([d,e[0],e[1],e[2]])}
  _lp.sort((a,b)=>a[0]-b[0]);
  const n=Math.min(HALO_LAMPS,_lp.length),H=G.halo,P=H.pos,C=H.col;
  for(let i=0;i<n;i++){const l=_lp[i];P[i*3]=l[1];P[i*3+1]=l[2]+.15;P[i*3+2]=l[3];C.set([1,.60,.27,2.2],i*4)}
  G.lampN=n;
}

// ---------- traffic lights: shader cones + halos ----------
const _cars=[];
function updateCarLights(night){
  const U=UNI,H=G.halo,P=H.pos,C=H.col;let hn=G.lampN;
  if(night<.02||PORTAL.cur){U.uNCar.value=0;H.g.setDrawRange(0,PORTAL.cur?0:hn);H.g.attributes.position.needsUpdate=true;H.g.attributes.aC.needsUpdate=true;return}
  _cars.length=0;const cam=camera.position;
  for(const c of CARS){const dx=c.x-cam.x,dz=c.z-cam.z,d=dx*dx+dz*dz;if(d<220*220)_cars.push([d,c,0])}
  if(typeof EXT!=='undefined')for(const v of EXT.veh){if(v.dead||v.kind==='sub'||v.kind==='bike'||(!v.occupied&&Math.abs(v.v)<.5))continue;   // only a car someone is driving has its lights on
     const dx=v.x-cam.x,dz=v.z-cam.z,d=dx*dx+dz*dz;if(d<220*220)_cars.push([d,v,v===EXT.cur?1:0])}   // G-Wagon / Lamborghini
  if(DRIVE.on&&DRIVE.car&&!CARS.includes(DRIVE.car)){const c=DRIVE.car;_cars.push([(c.x-cam.x)**2+(c.z-cam.z)**2,c,1])}
  if(typeof COOP!=='undefined'&&COOP.online&&COOP.online()){try{for(const c of COOP.carList()){const dx=c.x-cam.x,dz=c.z-cam.z,d=dx*dx+dz*dz;if(d<220*220)_cars.push([d,c,0])}}catch(e){}}
  _cars.sort((a,b)=>a[0]-b[0]);
  let ns=0;
  for(let i=0;i<_cars.length&&hn+4<=HALO_N;i++){
    const [d,c,mine]=_cars[i],t=(typeof CAR_T!=='undefined'&&CAR_T[c.type])||null,L=(c.spec&&c.spec.len)||(t&&t.L)||4.2,W=c.spec?1.9:(t&&t.W)||1.8,y=(c.y||0);
    const fx=Math.sin(c.yaw),fz=Math.cos(c.yaw),rx=fz,rz=-fx;
    if(ns<6&&d<110*110){
      if(G.carLights)U.uCP.value[ns].set(c.x+fx*L*.42,y+.75,c.z+fz*L*.42,mine?4.4:2.6);
      U.uCD.value[ns].set(fx*.995,-.09,fz*.995,.84);if(G.carLights)ns++}
    for(const s of [-1,1]){
      P[hn*3]=c.x+fx*L*.5+rx*s*W*.34;P[hn*3+1]=y+.72;P[hn*3+2]=c.z+fz*L*.5+rz*s*W*.34;C.set([1,.93,.78,1.05],hn*4);hn++;
      P[hn*3]=c.x-fx*L*.5+rx*s*W*.34;P[hn*3+1]=y+.80;P[hn*3+2]=c.z-fz*L*.5+rz*s*W*.34;C.set([1,.07,.03,.62],hn*4);hn++}
  }
  U.uNCar.value=ns;
  H.g.setDrawRange(0,hn);H.g.attributes.position.needsUpdate=true;H.g.attributes.aC.needsUpdate=true;
}

// ===================================================================================================
// environment map: warm/neon city lights, so wet asphalt and car paint have something to mirror
// ===================================================================================================
function decorateEnv(es){
  if(G.envJunk){for(const o of G.envJunk)o.dispose();G.envJunk=null}   // the previous env scene is done with
  if(S.time==='day')return;
  const r=mulberry(S.time==='night'?77:55),cols=[[1,.55,.2],[1,.72,.38],[.72,.86,1],[1,.22,.5],[.25,.6,1],[1,.9,.62],[1,.5,.15]];
  const n=S.time==='night'?22:12,gm=new THREE.SphereGeometry(1.5,8,6);G.envJunk=[gm];
  for(let i=0;i<n;i++){const a=r()*6.283,el=(1.5+r()*13)*Math.PI/180,c=cols[Math.floor(r()*cols.length)],k=(S.time==='night'?5:3.2)*(.5+r());
    const m=new THREE.Mesh(gm,new THREE.MeshBasicMaterial({color:new THREE.Color(c[0]*k,c[1]*k,c[2]*k),toneMapped:false}));
    m.position.set(Math.cos(a)*Math.cos(el)*34,Math.sin(el)*34,Math.sin(a)*Math.cos(el)*34);es.add(m);G.envJunk.push(m.material)}
}

// ===================================================================================================
// rain: one LineSegments draw, streaks wrap around the camera in world space
// ===================================================================================================
function makeRain(scene){
  const N=9000,pos=new Float32Array(N*6),R=new Float32Array(N*8),E=new Float32Array(N*2),r=mulberry(5);
  for(let i=0;i<N;i++){const a=r(),b=r(),c=r(),d=r();for(let k=0;k<2;k++){R.set([a*2-1,b*2-1,c,d],(i*2+k)*4);E[i*2+k]=k}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aR',new THREE.BufferAttribute(R,4));g.setAttribute('aE',new THREE.BufferAttribute(E,1));
  const U={uCam:{value:new THREE.Vector3()},uTime:{value:0},uI:{value:0},uWind:{value:new THREE.Vector2(2.2,.8)},uDark:{value:.55}};
  const m=new THREE.LineSegments(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:U,
    vertexShader:`attribute vec4 aR;attribute float aE;uniform vec3 uCam;uniform float uTime,uI;uniform vec2 uWind;varying float vA;
void main(){
 if(aR.w>uI){gl_Position=vec4(2.,2.,2.,1.);vA=0.;return;}
 vec2 off=aR.xy*46.;vec2 w=uCam.xz+mod(off-uCam.xz+46.,92.)-46.;
 float y=uCam.y-10.+fract(aR.z-uTime*(.62+aR.w*.1))*40.;
 vec3 vel=normalize(vec3(uWind.x*.12,-1.,uWind.y*.12));
 vec3 p=vec3(w.x,y,w.y)-vel*aE*(.8+aR.w*.6);
 vA=mix(.55,.05,aE)*(1.-smoothstep(25.,46.,length(p.xz-uCam.xz)));
 gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying float vA;uniform float uDark;void main(){gl_FragColor=vec4(vec3(.62,.70,.82)*(1.-uDark*.3),vA);}`}));
  m.frustumCulled=false;m.renderOrder=4;m.visible=false;scene.add(m);G.rainM={m,U};
}
function rainAudio(vol){
  if(typeof AUD==='undefined'||!AUD||!AUD.ok)return;const c=AUD.ctx;
  if(!G.rs&&vol<.001)return;                       // no rain yet: don't even start the noise loop
  if(!G.rs){const s=c.createBufferSource();s.buffer=AUD.noise;s.loop=true;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=1500;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=8500;
    const g=c.createGain();g.gain.value=0;s.connect(hp);hp.connect(lp);lp.connect(g);g.connect(AUD.amb);s.start();G.rs={g}}
  G.rs.g.gain.setTargetAtTime(vol,c.currentTime,.6);
}
function thunder(){
  if(typeof AUD==='undefined'||!AUD||!AUD.ok)return;const ind=!!AUD.indoor;
  setTimeout(()=>{if(G.rain<.3)return;AUD.burst(420,45,3.2,(ind?.22:.55),'lowpass',.6);AUD.burst(180,40,4.2,(ind?.16:.4),'lowpass',.5)},350+Math.random()*2400);
}

// ===================================================================================================
// public: per-time presets, weather, per-frame update
// ===================================================================================================
function init(scene){
  if(G.ready)return;
  try{makeClouds(scene);makeBirds(scene);makeHalos(scene);makeRain(scene);G.rain=(S.weather==='rain'&&S.season!=='winter')?1:0;G.snow=S.weather==='snow'?1:0;G.fog=S.weather==='fog'?1:0;G.ready=true}catch(e){console.error('GFX init failed',e)}
}
function applyTime(){        // called at the end of the game's applyTime()
  if(!G.ready)return;
  const W=S.season==='winter',R=G.rain;
  G.fogDensity=scene.fog.density;G.fogCol.copy(scene.fog.color);
  const night=S.time==='night',dusk=S.time==='dusk';
  UNI.uWet.value=W?.35:(night?.45:dusk?.28:.08);
  UNI.uWetG.value=W?0:(night?.50:dusk?.24:0);
  // moonlight glitter on the sea
  if(night){const sm=seaMesh.material.uniforms;sm.uSunC.value.multiplyScalar(3.4)}
  apply();
}
function apply(){            // look uniforms for the current time / season (weather is blended in update())
  const L=LOOK[S.time]||LOOK.day,W=S.season==='winter';
  if(G.pass){const u=G.pass.uniforms;u.uTS.value.set(...L.tS);u.uTH.value.set(...L.tH);u.uRayC.value.set(...L.rayC);
    u.uSat.value=L.sat*(W?.86:1);u.uCon.value=L.con;u.uVig.value=L.vig;u.uGrain.value=L.grain;u.uCA.value=L.ca}
}
const WEATHERS={clear:'Clear sky',rain:'Rain',snow:'Snow',fog:'Fog'};
function setWeather(w){
  if(!WEATHERS[w])w='clear';
  if(w==='rain'&&S.season==='winter'){if(typeof toast!=='undefined')toast('Rain','summer only — it snows in winter');return}
  S.weather=w;saveS();applyTime_();
  if(typeof toast!=='undefined')toast(WEATHERS[w],w==='snow'?'soft flakes, white ground':w==='fog'?'thick, quiet and grey':'');
}
function currentWeather(){return(S.weather==='rain'&&S.season==='winter')?'clear':(WEATHERS[S.weather]?S.weather:'clear')}
function applyTime_(){const w=currentWeather();document.querySelectorAll('[data-w]').forEach(b=>b.classList.toggle('on',b.dataset.w===w));
  for(const [id,k] of [['bRain','rain'],['bSnow','snow'],['bFog','fog']]){const b=document.getElementById(id);if(b)b.classList.toggle('on',w===k)}}
function toggleWeather(w){w=typeof w==='string'?w:'rain';setWeather(S.weather===w?'clear':w)}

function update(dt){
  if(!G.ready)return;
  G.t+=dt;camera.updateMatrixWorld();
  const L=LOOK[S.time]||LOOK.day,W=S.season==='winter',night=UNI.uNight.value,indoor=UNI.uIndoor.value,inP=!!PORTAL.cur;
  // ---- weather ease ----
  const wn=currentWeather(),want=wn==='rain'?1:0,sw=wn==='snow'?1:0,fw=wn==='fog'?1:0;
  G.rain+=(want-G.rain)*Math.min(1,dt*.4);if(Math.abs(want-G.rain)<.003)G.rain=want;
  G.snow+=(sw-G.snow)*Math.min(1,dt*.35);if(Math.abs(sw-G.snow)<.003)G.snow=sw;
  G.fog+=(fw-G.fog)*Math.min(1,dt*.35);if(Math.abs(fw-G.fog)<.003)G.fog=fw;
  const R=G.rain,Rp=R*R*(3-2*R),Sn=G.snow*G.snow*(3-2*G.snow),Fg=G.fog*G.fog*(3-2*G.fog),Ov=Math.max(Rp,Sn*.78,Fg*.72);   // Ov: how overcast the sky is (rain, snowfall or fog)
  G.k.sun=lerp(1,.26,Ov);G.k.hemi=lerp(1,1.25,Ov);G.k.exp=lerp(1,1.04,Ov);
  scene.fog.density=G.fogDensity*(1+Rp*1.6+Sn*1.3+Fg*6);
  const tm=S.time==='night'?.28:S.time==='dusk'?.7:1;
  _c.copy(G.fogCol);_c2.setRGB(.34,.37,.42).multiplyScalar(tm);scene.fog.color.copy(_c).lerp(_c2,Rp*.75);
  _c2.setRGB(.80,.82,.86).multiplyScalar(tm);scene.fog.color.lerp(_c2,Sn*.7);_c2.setRGB(.74,.76,.78).multiplyScalar(tm);scene.fog.color.lerp(_c2,Fg*.85);
  const pmT=(typeof ksMood==='function'&&!inP)?ksMood(camera.position.x,camera.position.z):0;G.pm=(G.pm||0)+(pmT-(G.pm||0))*Math.min(1,dt*.6);const Pm=G.pm;   // panel-block districts: extra haze, cooler grey
  if(Pm>.003){scene.fog.density*=1+Pm*.8;_c2.setRGB(.70,.72,.75).multiplyScalar(tm);scene.fog.color.lerp(_c2,Pm*.45)}
  UNI.uWinter.value=Math.max(W?1:0,.48*Sn);                 // snowfall in summer: a partial white cover on ground and roofs
  if(typeof snowPts!=='undefined'&&snowPts){const on=(W||G.snow>.02)&&!inP;if(on!==snowPts.visible)snowPts.visible=on;if(on){const m=snowPts.material;m.size=.12*(1+.45*Sn);m.opacity=W?.78:.78*Math.min(1,Sn*2.2)}}
  const su=seaMesh.material.uniforms;su.uFogC.value.copy(scene.fog.color);su.uFogD.value=scene.fog.density;
  UNI.uWet.value=lerp(W?.35:(S.time==='night'?.45:S.time==='dusk'?.28:.08),1,Rp);UNI.uWetG.value=lerp(W?0:(S.time==='night'?.50:S.time==='dusk'?.24:0),1,Rp);
  // ---- lightning ----
  if(R>.6&&!inP){G.ltT-=dt;if(G.ltT<=0){G.ltT=6+Math.random()*16;G.flT=0;thunder()}}
  if(G.flT>=0){G.flT+=dt;const t=G.flT;G.k.flash=t<.07?1:t<.15?.2:t<.25?.85:Math.max(0,1-(t-.25)*3.2);if(t>.6){G.flT=-1;G.k.flash=0}}
  const fl=G.k.flash*(1-indoor);
  // ---- clouds ----
  const cl=G.cloud,U=cl.U;cl.m.position.copy(camera.position);U.uT.value+=dt*(1+Rp*1.5);
  const B=L.cl,cover=W&&!Ov?Math.max(B.cover,.8):B.cover;
  U.uCover.value=lerp(cover,RAIN_CL.cover,Ov);U.uOp.value=lerp(B.op,1,Ov);U.uRim.value=lerp(B.rim,0,Ov);
  const wk=W?.78:1,rk=S.time==='night'?.09:S.time==='dusk'?.5:1;   // a rain sky is as dark as the hour
  const lt=1+(Ov-Rp)*.5;                                       // snow / fog skies are lighter than rain skies
  for(let i=0;i<3;i++){U.uLit.value.setComponent(i,lerp(B.lit[i]*(i===2?1:wk)+(W?.1:0),RAIN_CL.lit[i]*rk*lt,Ov));U.uShade.value.setComponent(i,lerp(B.shade[i],RAIN_CL.shade[i]*rk*lt,Ov));U.uGlow.value.setComponent(i,lerp(B.glow[i],RAIN_CL.glow[i],Ov))}
  U.uTint.value.set(...B.tint).multiplyScalar(1);U.uTint.value.w=B.tint[3]*(1-Ov);
  U.uSunD.value.copy(sunDir);U.uFlash.value.set(.55,.6,.8).multiplyScalar(fl*1.4);
  // ---- birds ----
  const b=G.birds,bc=L.bird;b.m.visible=!!bc&&!inP&&Ov<.4;
  if(b.m.visible){const u=b.U;u.uTime.value=G.t;u.uCam.value.copy(camera.position);u.uCell.value.set(Math.floor(camera.position.x/400)*400+200,Math.floor(camera.position.z/400)*400+200);u.uCol.value.set(...bc)}
  // ---- halos + headlights ----
  const H=G.halo;H.m.visible=night>.02&&!inP;
  if(H.m.visible){H.U.uNight.value=Math.min(1,night*1.25);H.U.uTime.value=G.t;H.U.uK.value=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360));
    if((G.lampT++)%24===0)gatherLamps();updateCarLights(night)}
  else UNI.uNCar.value=0;
  // ---- rain streaks + sound ----
  const rm=G.rainM;rm.m.visible=Rp>.02&&!inP&&indoor<.6;
  if(rm.m.visible){const u=rm.U;u.uCam.value.copy(camera.position);u.uTime.value=G.t;u.uI.value=Rp;u.uDark.value=S.time==='night'?1:0}
  if((G.rsT=(G.rsT||0)-dt)<=0){G.rsT=.25;rainAudio(Rp*.16*(1-indoor*.75))}
  // ---- grade pass ----
  if(G.pass){const u=G.pass.uniforms;u.uTime.value=G.t;u.uAsp.value=innerWidth/innerHeight;
    _v.copy(sunDir).multiplyScalar(1000).add(camera.position).project(camera);u.uSun.value.set(_v.x*.5+.5,_v.y*.5+.5);
    camera.getWorldDirection(_d);const front=smooth(clamp(_d.dot(sunDir)*3.2,0,1))*smooth(clamp((sunDir.y+.04)*14,0,1));
    u.uRays.value=(G.rays?L.ray:0)*front*(1-indoor)*(1-Ov*.92)*(W?.7:1);
    u.uFlash.value=fl*.16;u.uSat.value=lerp(L.sat*(W?.86:1),Fg>Rp&&Fg>Sn?.7:.78,Ov)*(1-.16*(G.pm||0));u.uVig.value=L.vig+Ov*.08}
}
const smooth=x=>x*x*(3-2*x);

return {init,update,applyTime,gradePass,decorateEnv,setWeather,toggleWeather,syncWeatherUI:applyTime_,k:G.k,setRays(on){G.rays=!!on},_G:G,LOOK,RAIN_CL,GRADE,apply};
})();
