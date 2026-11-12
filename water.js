// water.js — the sea seen from BELOW (2026-11-12). Before: under the surface there was only a flat blue fog; the sea sheet was simply hidden.
//   UWFX.init(scene)    called by makeSea(): builds the underside of the surface, the light shafts and the floating specks (all hidden until you dive)
//   UWFX.set(on,depth)  called every frame by underwaterFx() (index.html); on/off, camera depth below the surface in metres
// What you get under water: the surface as a rippling ceiling with Snell's window (looking up steeply you see the bright sky and the sun through the water, outside the
// ~49 deg cone the surface is a dark mirror of the water: total internal reflection, done with GLSL refract()), slanting light shafts near the surface by day,
// slowly drifting plankton specks, and (in the ground shader of index.html) caustic light on the sea floor, which also shimmers in the shallows seen from the beach.
// Cost: 1 big quad with a small shader + 6 transparent quads + 160 points, only while the camera is below the surface; the caustics are a few ALU in the ground shader.
const uwFS=()=>`uniform float uTime;uniform vec3 uSunD;uniform vec3 uSunC;uniform vec3 uSkyC;uniform vec3 uFogC;uniform float uFogD;uniform float uSunUp;varying vec3 vW;
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}
`+SEA_SWELL_GLSL+`
void main(){
 vec2 p=vW.xz;float t=uTime;vec3 sw=swell(p,t)*.7;
 vec2 g=(vec2(vn(p*.5+t*.45),vn(p*.5-t*.4+7.))-.5)*.16+(vec2(vn(p*1.9-t*.8),vn(p*2.1+t*.7+3.))-.5)*.08+vec2(cos(p.x*.21+p.y*.07+t*1.3),cos(p.y*.19-p.x*.05+t*1.1))*.025;   // calm sea: slopes of a few degrees
 vec3 n=normalize(vec3(-(g.x-sw.y*1.6),-1.,-(g.y-sw.z*1.6)));        // the surface normal, facing down to the swimmer
 vec3 I=normalize(vW-cameraPosition);                                  // from the eye up to the surface point
 float cosI=clamp(dot(I,-n),0.,1.);
 vec3 rd=refract(I,n,1.33);                                            // water -> air; the zero vector = total internal reflection
 float tir=1.-step(.001,dot(rd,rd));
 float fr=.05+pow(1.-cosI,4.)*.45;
 vec3 under=mix(vec3(.008,.05,.075),vec3(.03,.19,.21),smoothstep(-.3,.6,-reflect(I,n).y+.4*vn(p*.8+t*.2)))*(.3+.7*uSunUp);
 vec3 sky=uSkyC*1.05+vec3(.03,.09,.11);float sd=max(dot(normalize(rd+vec3(0.,.0001,0.)),uSunD),0.);
 sky+=uSunC*(pow(sd,320.)*3.+pow(sd,22.)*.3);sky*=.45+.55*uSunUp;
 vec3 c=mix(sky,under,clamp(tir+fr,0.,1.));
 c+=uSunC*.07*uSunUp*smoothstep(.3,.9,vn(p*1.25+t*.6))*(1.-tir);       // the swell focusing a little more light
 float d=length(vW-cameraPosition);c=mix(c,uFogC,1.-exp(-uFogD*uFogD*d*d*.55));
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <encodings_fragment>
}`;
const UWFX={ready:false,on:false,depth:0,t:0,last:0,under:null,shafts:null,specks:null,U:null,
  init(scene){if(this.ready||!seaMesh)return;this.ready=true;const su=seaMesh.material.uniforms;   // the sun / sky colours are the sea's own uniform objects, so they are always current
    this.U={uTime:UNI.uTime,uSunD:su.uSunD,uSunC:su.uSunC,uSkyC:su.uSkyC,uFogC:{value:new THREE.Color(0,.2,.3)},uFogD:{value:.03},uSunUp:UNI.uSunUp};
    const pg=new THREE.PlaneGeometry(9000,9000,1,1);pg.rotateX(-Math.PI/2);
    this.under=new THREE.Mesh(pg,new THREE.ShaderMaterial({uniforms:this.U,vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:uwFS(),side:THREE.DoubleSide}));
    this.under.position.y=SL;this.under.visible=false;this.under.frustumCulled=false;this.under.renderOrder=1;scene.add(this.under);
    // light shafts: crossed soft quads hanging from the surface, leaning along the (refracted) sun direction, additive
    const cv=document.createElement('canvas');cv.width=64;cv.height=256;const g=cv.getContext('2d'),gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.5,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(0,0,64,256);g.globalCompositeOperation='destination-in';const vg=g.createLinearGradient(0,0,0,256);vg.addColorStop(0,'rgba(0,0,0,1)');vg.addColorStop(.55,'rgba(0,0,0,.55)');vg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=vg;g.fillRect(0,0,64,256);
    const tex=new THREE.CanvasTexture(cv),sm=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0x9fe8ff,opacity:0,fog:false,side:THREE.DoubleSide});
    const sg=new THREE.PlaneGeometry(1,1);sg.translate(0,-.5,0);this.shafts=new THREE.Group();
    for(let i=0;i<6;i++){const m=new THREE.Mesh(sg,sm);m.userData={a:i/6*6.283,r:3+(i*7%11),w:5+(i*5%7),ph:i*1.7};m.frustumCulled=false;m.renderOrder=3;this.shafts.add(m)}
    this.shafts.visible=false;scene.add(this.shafts);this.shaftMat=sm;
    // specks of plankton / silt around the camera
    const N=160,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*30;pos[i*3+1]=(Math.random()-.5)*20;pos[i*3+2]=(Math.random()-.5)*30}
    const pgm=new THREE.BufferGeometry();pgm.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const c2=document.createElement('canvas');c2.width=c2.height=32;const x2=c2.getContext('2d'),rg=x2.createRadialGradient(16,16,0,16,16,16);rg.addColorStop(0,'rgba(255,255,255,1)');rg.addColorStop(1,'rgba(255,255,255,0)');x2.fillStyle=rg;x2.fillRect(0,0,32,32);
    this.specks=new THREE.Points(pgm,new THREE.PointsMaterial({size:.1,map:new THREE.CanvasTexture(c2),transparent:true,opacity:.5,depthWrite:false,color:0xcfeeff,blending:THREE.AdditiveBlending,fog:false}));
    this.specks.frustumCulled=false;this.specks.visible=false;scene.add(this.specks)},
  set(on,depth){if(!this.ready)return;const now=performance.now(),dt=Math.min(.1,(now-(this.last||now))/1000);this.last=now;this.depth=depth;
    if(on!==this.on){this.on=on;this.under.visible=on;this.shafts.visible=on;this.specks.visible=on;UNI.uUW.value=on?1:0}
    UNI.uSunUp.value=THREE.MathUtils.clamp(sunDir.y*3,0,1);
    if(!on)return;this.t+=dt;
    const U=this.U,f=scene.fog;U.uFogC.value.copy(f.color);U.uFogD.value=f.density;
    const cam=camera.position,su=UNI.uSunUp.value;this.under.position.set(cam.x,SL,cam.z);   // the plane follows the camera (the world is 50 km wide, the plane 9 km)
    // shafts: only near the surface and only by day; they lean along the refracted sun direction (the sun is on the other side of where they slope to) and sway
    const hx=sunDir.x,hz=sunDir.z,hl=Math.hypot(hx,hz)||1,phi=Math.min(.6,Math.atan(hl/Math.max(.25,sunDir.y))*.75),yaw=Math.atan2(hx,hz);
    const fade=Math.max(0,1-depth/42)*su;this.shaftMat.opacity=.13*fade;this.shafts.visible=fade>.02;
    for(const m of this.shafts.children){const u=m.userData,a=u.a+this.t*.02;
      m.position.set(cam.x+Math.cos(a)*u.r*2.2,SL,cam.z+Math.sin(a)*u.r*2.2);m.scale.set(u.w*(1+.25*Math.sin(this.t*.4+u.ph)),55,1);m.rotation.set(phi,yaw+Math.sin(u.ph)*.35,0,'YXZ')}
    // specks drift up and wrap around the camera
    const a=this.specks.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]+=dt*(.08+(i%5)*.02);a[i]+=Math.sin(this.t*.6+i)*dt*.05;if(a[i+1]>10)a[i+1]-=20}
    this.specks.geometry.attributes.position.needsUpdate=true;this.specks.position.set(cam.x,cam.y,cam.z);this.specks.material.opacity=.18+.34*su}
};
