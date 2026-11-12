// trees.js — the owner's own models (2026-11-12), kept light on purpose:
//   GLBT   real GLB trees (maple, spruce; in winter snow-covered / bare / dead trees and snow bushes) for everything within ~90 m.
//          Further out the old cheap procedural trees stay. Every kind is ONE InstancedMesh (trunk + leaves = 2 draw calls).
//   BENCH  the cast-iron park bench (+ a litter bin beside some of them), instanced, replacing the box bench of propBench2().
//   BOOBA  a cartoon creature that potters about the yard next to home (pet it with E).
// The models were cut down offline from 36 MB to ~1 MB (assets/IMPORTS.md): textures 128-512 px, 0.3-4k triangles each, 'lo' variants for phones.
// Everything here is optional: when a file does not load, the procedural trees / benches of index.html are used.
const GLBT_HASH=(x,z)=>((x*12.9898+z*78.233)%1+1)%1;
const GLB_FETCH=(url)=>fetch(url).then(r=>{if(!r.ok)throw new Error(url+' '+r.status);return r.arrayBuffer()}).then(b=>new Promise((ok,no)=>new THREE.GLTFLoader().parse(b,'',ok,no)));
const _gM=new THREE.Matrix4(),_gQ=new THREE.Quaternion(),_gS=new THREE.Vector3(),_gT=new THREE.Vector3(),_gC=new THREE.Color(),_gY=new THREE.Vector3(0,1,0);

// one InstancedMesh that grows when it needs to; list = flat numbers, 10 per instance: x,y,z,rotY,sx,sy,sz,r,g,b
class GInst{
  constructor(geo,mat,o){this.geo=geo;this.mat=mat;this.color=!!(o&&o.color);this.depth=(o&&o.depth)||null;this.ext=(o&&o.ext)||[6,12];this.cap=0;this.mesh=null;this.list=[]}
  ensure(n){if(this.mesh&&n<=this.cap)return;const cap=Math.max(24,Math.ceil(n*1.35));const m=new THREE.InstancedMesh(this.geo,this.mat,cap);
    m.frustumCulled=true;m.castShadow=true;m.receiveShadow=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.visible=GLBT.show;
    if(this.color)m.setColorAt(0,_gC.setRGB(1,1,1));if(this.depth)m.customDepthMaterial=this.depth;
    if(this.mesh){scene.remove(this.mesh);this.mesh.dispose()}scene.add(m);this.mesh=m;this.cap=cap}
  flush(){const L=this.list,n=L.length/10;if(!n){if(this.mesh)this.mesh.count=0;return}
    this.ensure(n);const m=this.mesh;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9,y1=-1e9,y0=1e9;
    for(let i=0;i<n;i++){const o=i*10;_gM.compose(_gT.set(L[o],L[o+1],L[o+2]),_gQ.setFromAxisAngle(_gY,L[o+3]),_gS.set(L[o+4],L[o+5],L[o+6]));m.setMatrixAt(i,_gM);
      if(this.color)m.setColorAt(i,_gC.setRGB(L[o+7],L[o+8],L[o+9]));
      if(L[o]<x0)x0=L[o];if(L[o]>x1)x1=L[o];if(L[o+2]<z0)z0=L[o+2];if(L[o+2]>z1)z1=L[o+2];if(L[o+1]<y0)y0=L[o+1];if(L[o+1]>y1)y1=L[o+1]}
    m.count=n;m.instanceMatrix.needsUpdate=true;if(this.color&&m.instanceColor)m.instanceColor.needsUpdate=true;
    // three r128 culls by the source geometry's sphere, not by the instances: make it cover all of them
    const e=this.ext[0]*1.6,h=this.ext[1]*1.4,b=new THREE.Box3(new THREE.Vector3(x0-e,y0-2,z0-e),new THREE.Vector3(x1+e,y1+h,z1+e));
    b.getBoundingSphere(this.geo.boundingSphere||(this.geo.boundingSphere=new THREE.Sphere()))}
  clear(){this.list.length=0}
}

const GLBT={ready:false,loading:false,near:0,show:true,K:{},all:[],
  // old procedural species -> maple look: [width, height, tint r,g,b]  (broad plane / round linden / acacia / chestnut / maple / avenue linden / walnut / young tree)
  GM:{0:[1.1,1,1,1,1],1:[.85,.82,1.04,1.1,.84],5:[.92,1.06,1.1,1.14,.78],6:[1.22,.9,.8,.92,.8],7:[1,.96,1.06,1,.74],8:[.72,1.2,.92,1.06,.86],9:[1.28,.8,.86,1,.84],3:[.5,.5,1.12,1.16,.9]},
  leafMat(tex,key,sway,winterTint){tex.anisotropy=4;
    const m=patchMat(new THREE.MeshStandardMaterial({map:tex,alphaTest:.4,alphaToCoverage:true,side:THREE.DoubleSide,roughness:.85,metalness:0}),{key,vDecl:'uniform float uTime;',
      vBegin:sway?'{float ph=instanceMatrix[3].x*.31+instanceMatrix[3].z*.23;float k=smoothstep(2.,9.,position.y)*'+Number(sway).toFixed(2)+';transformed.x+=sin(uTime*1.6+ph+position.y*.9)*.05*k;transformed.z+=cos(uTime*1.3+ph+position.x*.8)*.04*k;}':undefined,
      fSurf:(winterTint?'if(uWinter>.5)sAlb=mix(sAlb,vec3(.8,.84,.88),.35);':'')+'sEmis=sAlb*.05;sAO=.9;'});
    m.vertexColors=false;return m},
  barkMat(tex){tex.anisotropy=4;return patchMat(new THREE.MeshStandardMaterial({map:tex,roughness:.95,metalness:0}),{key:'glbbark',fSurf:'if(uWinter>.5&&vNw.y>.35)sAlb=mix(sAlb,vec3(.85,.87,.9),.7);'})},
  depthMat(tex){return new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:tex,alphaTest:.45})},
  load(){if(this.loading)return;this.loading=true;
    const lo=(typeof MOBILE!=='undefined'&&MOBILE)||(typeof S!=='undefined'&&S.q==='low'),B='assets/models/trees/';
    Promise.all([GLB_FETCH(B+'tree_maple_'+(lo?'lo':'hi')+'.glb'),GLB_FETCH(B+'tree_spruce_'+(lo?'lo':'hi')+'.glb'),GLB_FETCH(B+'tree_snow.glb')]).then(([ma,sp,sn])=>{
      const part=(g,n)=>g.scene.getObjectByName(n);
      const tree=(g,ext)=>{const t=part(g,'trunk'),l=part(g,'leaf');return {t:new GInst(t.geometry,this.barkMat(t.material.map),{ext}),l:new GInst(l.geometry,this.leafMat(l.material.map,'glbleaf'+(sp===g?'W':''),1,sp===g),{color:true,depth:this.depthMat(l.material.map),ext})}};
      this.K.maple=tree(ma,[5,11]);this.K.spruce=tree(sp,[3,13]);
      const card=(n,ext)=>{const o=part(sn,n);return {c:new GInst(o.geometry,this.leafMat(o.material.map,'glbcard',0,false),{depth:this.depthMat(o.material.map),ext})}};
      this.K.bare=card('bare',[5,12]);this.K.deadhero=card('deadhero',[6,10]);this.K.deadwide=card('deadwide',[4,7]);this.K.snowtree=card('snowtree',[5,12]);this.K.bush=card('bush',[3,2]);
      this.all=[];for(const k of Object.values(this.K))for(const g of Object.values(k))this.all.push(g);
      this.ready=true;TREES.dirty=true;console.log('[trees] GLB trees ready ('+(lo?'lo':'hi')+')')
    }).catch(e=>{console.warn('[trees] GLB trees not loaded, procedural ones stay',e&&e.message||e)})},
  setVisible(v){this.show=v;for(const g of this.all)if(g.mesh)g.mesh.visible=v},
  // called by TREES.update(): begin() -> take(p) for every tree point within `near` -> flush()
  begin(maxD){const q=(typeof MOBILE!=='undefined'&&MOBILE)?60:92;this.near=this.ready?Math.min(maxD*.6,q):0;for(const g of this.all)g.clear();this.W=S.season==='winter'},
  // true = this tree is drawn from a GLB, false = leave it to the procedural species
  take(p){const g=this.GM[p[2]],sp=p[2];if(!g&&sp!==4)return false;
    const x=p[0],z=p[1],sc=p[3]||1;let y=p[4];if(y===undefined)y=p[4]=groundH(x,z)-.05;const h=GLBT_HASH(x,z),ry=h*6.283,w=.9+h*.2,K=this.K,W=this.W;
    if(sp===4){   // conifer: spruce (in winter every other one is a snow-covered tree)
      if(W&&h<.5){K.snowtree.c.list.push(x,y,z,ry,.85*sc,.85*sc,.85*sc,1,1,1)}
      else{const s=.82*sc,v=.9+h*.2;K.spruce.t.list.push(x,y,z,ry,s*w,s,s*w,1,1,1);K.spruce.l.list.push(x,y,z,ry,s*w,s,s*w,v*.95,v,v*.9)}
    }else if(W){  // bare broadleaves: card trees most of the time, the bare maple trunk otherwise (no leaves)
      if(h<.36)K.bare.c.list.push(x,y,z,ry,.85*sc,.85*sc,.85*sc,1,1,1);
      else if(h<.5)K.deadwide.c.list.push(x,y,z,ry,sc,sc,sc,1,1,1);
      else if(h<.57)K.deadhero.c.list.push(x,y,z,ry,.7*sc,.7*sc,.7*sc,1,1,1);
      else K.maple.t.list.push(x,y,z,ry,g[0]*sc*w,g[1]*sc,g[0]*sc*w,1,1,1);
      const h2=GLBT_HASH(x*3.7,z*9.1);if(h2<.32){const a=h2*60;K.bush.c.list.push(x+Math.cos(a)*1.3,groundH(x+Math.cos(a)*1.3,z+Math.sin(a)*1.3)-.05,z+Math.sin(a)*1.3,a,1,1,1,1,1,1)}
    }else{        // leafy maple, shaped and tinted per old species so the city is not one tree
      const v=.88+h*.24;K.maple.t.list.push(x,y,z,ry,g[0]*sc*w,g[1]*sc,g[0]*sc*w,1,1,1);K.maple.l.list.push(x,y,z,ry,g[0]*sc*w,g[1]*sc,g[0]*sc*w,g[2]*v,g[3]*v,g[4]*v)}
    return true},
  flush(){for(const g of this.all)g.flush()}
};

// ---------- park benches ----------
const BENCH={ready:false,failed:false,loading:false,show:true,own:new Map(),dirty:true,lx:1e9,lz:1e9,bench:null,bin:null,
  // propBench2() calls this with the prop batch P it is drawing into; only batches that announce themselves (P.bn=[]) are handled here
  add(P,x,y,z,ry){if(!P.bn||this.failed)return false;P.bn.push(x,y,z,ry);return true},
  reg(id,list){if(list&&list.length){this.own.set(id,list);this.dirty=true}},
  rm(id){if(this.own.delete(id))this.dirty=true},
  load(){if(this.loading)return;this.loading=true;
    GLB_FETCH('assets/models/props/bench.glb').then(g=>{const b=g.scene.getObjectByName('bench'),n=g.scene.getObjectByName('bin');
      const bm=new THREE.MeshStandardMaterial({map:b.material.map,roughness:.65,metalness:.25,side:THREE.DoubleSide});bm.map.anisotropy=4;
      const nm=new THREE.MeshStandardMaterial({map:n.material.map,alphaTest:.5,alphaToCoverage:true,roughness:.6,metalness:.3,side:THREE.DoubleSide});
      this.bench=new GInst(b.geometry,bm,{ext:[2,1.5]});this.bin=new GInst(n.geometry,nm,{ext:[1,1]});this.ready=true;this.dirty=true;
    }).catch(e=>{this.failed=true;console.warn('[bench] GLB bench not loaded',e&&e.message||e)})},
  setVisible(v){this.show=v;for(const g of [this.bench,this.bin])if(g&&g.mesh)g.mesh.visible=v},
  update(px,pz){if(!this.ready)return;if(!this.dirty&&Math.hypot(px-this.lx,pz-this.lz)<40)return;this.dirty=false;this.lx=px;this.lz=pz;
    const R=((typeof MOBILE!=='undefined'&&MOBILE)?110:170),R2=R*R;this.bench.clear();this.bin.clear();
    for(const L of this.own.values())for(let i=0;i<L.length;i+=4){const x=L[i],y=L[i+1],z=L[i+2],ry=L[i+3],dx=x-px,dz=z-pz;if(dx*dx+dz*dz>R2)continue;
      this.bench.list.push(x,y,z,ry,1,1,1,1,1,1);
      if(GLBT_HASH(x*1.7,z*2.3)<.4){const c=Math.cos(ry),s=Math.sin(ry);this.bin.list.push(x+1.25*c+.1*s,y,z-1.25*s+.1*c,ry,1,1,1,1,1,1)}}
    this.bench.flush();this.bin.flush();this.bench.mesh&&(this.bench.mesh.visible=this.show);this.bin.mesh&&(this.bin.mesh.visible=this.show)}
};

// ---------- Booba ----------
const BOOBA={root:null,placed:false,st:'idle',wait:2,t:0,tx:0,tz:0,ax:0,az:0,vy:0,hop:0,
  load(){GLB_FETCH('assets/models/booba.glb').then(g=>{const r=new THREE.Group(),m=g.scene;
      m.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const mt=o.material;mt.metalness=0;mt.roughness=.8;mt.side=THREE.DoubleSide;if(mt.map){mt.alphaTest=.5;mt.map.anisotropy=4}});
      r.add(m);r.visible=false;scene.add(r);this.root=r;
      INTERACT.push({get x(){return BOOBA.root.position.x},get z(){return BOOBA.root.position.z},r:2.6,label:'Pet Booba',
        cond:()=>BOOBA.placed&&BOOBA.root.visible&&!PORTAL.cur&&!player.sit&&!player.scoot&&!DRIVE.on,fn:()=>BOOBA.pet()});
      ANIM.push(dt=>BOOBA.tick(dt));
    }).catch(e=>console.warn('[booba] not loaded',e&&e.message||e))},
  free(x,z,y){return groundH(x,z)>SL+1&&!insideAny(x,z,.5,y+.5)&&Math.abs(groundH(x,z)-y)<.7},
  place(){const y0=HOME_Y0||groundH(HOME.cx,HOME.cz);
    for(const d of [8,11,6,14,4])for(let k=0;k<8;k++){const a=k*.785+.4,x=HOME.cx+Math.cos(a)*d,z=HOME.cz+Math.sin(a)*d;
      if(this.free(x,z,y0)){this.ax=x;this.az=z;this.root.position.set(x,walkH(x,z,y0+1),z);this.root.rotation.y=Math.atan2(HOME.cx-x,HOME.cz-z);this.placed=true;return}}
    this.placed=true;this.ax=HOME.cx;this.az=HOME.cz;this.root.position.set(HOME.cx,y0,HOME.cz)},
  pet(){this.vy=3.6;this.hop=1.2;this.st='idle';this.wait=3;toast('Booba','Ooh! Ooh!');if(window.AUD&&AUD.beep)AUD.beep()},
  tick(dt){const R=this.root;if(!R||!started)return;if(!this.placed)this.place();
    const px=player.x,pz=player.z,dx=px-R.position.x,dz=pz-R.position.z,dist=Math.hypot(dx,dz);
    R.visible=dist<130&&!PORTAL.cur&&BENCH.show;if(!R.visible||dist>80)return;
    this.t+=dt;let moving=false;const turn=(a,k)=>{let d=a-R.rotation.y;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;R.rotation.y+=d*Math.min(1,dt*k)};
    if(this.hop>0){this.hop-=dt;turn(Math.atan2(dx,dz),6)}
    else if(dist<7){turn(Math.atan2(dx,dz),3.5)}   // look at the player
    else if(this.st==='idle'){this.wait-=dt;if(this.wait<=0){const a=Math.random()*6.283,d=1.5+Math.random()*5.5,x=this.ax+Math.cos(a)*d,z=this.az+Math.sin(a)*d;
        if(this.free(x,z,R.position.y)){this.tx=x;this.tz=z;this.st='walk'}else this.wait=.5}}
    else{const ex=this.tx-R.position.x,ez=this.tz-R.position.z,e=Math.hypot(ex,ez);turn(Math.atan2(ex,ez),5);
      if(e<.25){this.st='idle';this.wait=2+Math.random()*5}
      else{const s=.9*dt,nx=R.position.x+ex/e*s,nz=R.position.z+ez/e*s;if(this.free(nx,nz,R.position.y)){R.position.x=nx;R.position.z=nz;moving=true}else{this.st='idle';this.wait=1}}}
    // ground, a little hop when petted, a waddle while walking and a slow breathing when standing
    const gy=walkH(R.position.x,R.position.z,R.position.y+1);
    if(this.vy||this.hopY>0){this.vy-=11*dt;this.hopY=Math.max(0,(this.hopY||0)+this.vy*dt);if(this.hopY===0)this.vy=0}
    R.position.y+=(gy-R.position.y)*Math.min(1,dt*12);
    const m=R.children[0];m.position.y=(this.hopY||0)+(moving?Math.abs(Math.sin(this.t*7))*.05:0);m.rotation.z=moving?Math.sin(this.t*7)*.09:0;m.scale.setScalar(1+Math.sin(this.t*2.2)*.012)}
};
