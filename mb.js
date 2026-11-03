/* ===================================================================================================
   mb.js — MB: a merged-geometry model builder (boxes, cylinders, spheres, quads, lofts) and a few canvas textures.
   Everything added under the same material key ends up in ONE mesh, so a whole yacht interior is a couple of dozen draw calls.
   Used by yacht.js, trn2.js, plane.js, isle.js and fauna.js.  No game globals are touched at load time.
   =================================================================================================== */
const MBM={   // material factory (sRGB colour inputs, like XM in index.html)
  std(c,r,m,extra){const x=new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(c).convertSRGBToLinear(),roughness:r===undefined?.7:r,metalness:m||0},extra||{}));return x},
  glass(c,op,extra){return MBM.std(c||0x9cc4dc,.04,.2,Object.assign({transparent:true,opacity:op===undefined?.3:op,depthWrite:false},extra||{}))},
  emis(c,i,extra){const m=MBM.std(c,.5,0,Object.assign({emissive:new THREE.Color(c).convertSRGBToLinear(),emissiveIntensity:i===undefined?1:i},extra||{}));return m},
  // canvas texture helper
  tex(w,h,fn,rep){const cv=document.createElement('canvas');cv.width=w;cv.height=h;fn(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t},
  // teak deck planks: warm wood with thin dark seams
  teak(base){return MBM.tex(256,256,(x,w,h)=>{x.fillStyle=base||'#b88a5a';x.fillRect(0,0,w,h);const n=8,ph=h/n;for(let i=0;i<n;i++){const k=(Math.sin(i*12.9898)*43758.5453)%1,t=.92+Math.abs(k)*.16;x.fillStyle=`rgb(${(184*t)|0},${(138*t)|0},${(90*t)|0})`;x.fillRect(0,i*ph,w,ph-2);x.fillStyle='rgba(60,35,15,.55)';x.fillRect(0,i*ph+ph-2,w,2);
      for(let j=0;j<5;j++){x.fillStyle='rgba(70,40,18,.07)';x.fillRect(((j*53+i*31)%w),i*ph+3,(j*37%70)+20,2)}x.fillStyle='rgba(60,35,15,.45)';x.fillRect(((i*97)%w),i*ph,2,ph-2)}},true)},
  wood(base,dark){return MBM.tex(128,128,(x,w,h)=>{x.fillStyle=base||'#6b4630';x.fillRect(0,0,w,h);for(let i=0;i<40;i++){x.fillStyle=(i%3?'rgba(0,0,0,.06)':'rgba(255,220,170,.05)');x.fillRect(0,(i*37)%h,w,2+(i%3))}},true)},
  carpet(base){return MBM.tex(64,64,(x,w,h)=>{x.fillStyle=base||'#cbb99a';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){x.fillStyle=`rgba(${(i*7)%255>128?255:90},${(i*13)%255>128?240:80},${(i*17)%255>128?220:70},.05)`;x.fillRect((i*29)%w,(i*53)%h,1,1)}},true)},
  tile(a,b){return MBM.tex(128,128,(x,w,h)=>{x.fillStyle=a||'#e9e5df';x.fillRect(0,0,w,h);x.fillStyle=b||'#cfc9bf';x.fillRect(0,0,w/2,h/2);x.fillRect(w/2,h/2,w/2,h/2);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,w,2);x.fillRect(0,0,2,h);x.fillRect(0,h/2,w,1);x.fillRect(w/2,0,1,h)},true)},
  marble(){return MBM.tex(256,256,(x,w,h)=>{x.fillStyle='#ece8e1';x.fillRect(0,0,w,h);x.strokeStyle='rgba(120,120,130,.25)';for(let i=0;i<14;i++){x.lineWidth=1+(i%3);x.beginPath();let px=(i*71)%w,py=0;x.moveTo(px,py);for(let j=0;j<8;j++){px+=((j*37+i*11)%40)-20;py+=h/8;x.lineTo(px,py)}x.stroke()}},true)},
  // a fabric weave for cushions
  fabric(a){return MBM.tex(64,64,(x,w,h)=>{x.fillStyle=a||'#d8cfc0';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=2){x.fillStyle='rgba(0,0,0,.05)';x.fillRect(i,0,1,h);x.fillRect(0,i,w,1)}},true)}
};

class MB{
  constructor(){this.k=new Map();this._t=new THREE.Vector3();this._n=new THREE.Matrix3();this._m=new THREE.Matrix4();this._q=new THREE.Quaternion();this._e=new THREE.Euler();this._s=new THREE.Vector3();this._p=new THREE.Vector3();
    if(!MB.G){MB.G={box:new THREE.BoxGeometry(1,1,1),cyl:{},sph:{}}}}
  bucket(k){let b=this.k.get(k);if(!b){b={p:[],n:[],u:[],i:[]};this.k.set(k,b)}return b}
  mat4(x,y,z,rx,ry,rz,sx,sy,sz){this._e.set(rx||0,ry||0,rz||0,'YXZ');this._q.setFromEuler(this._e);this._s.set(sx,sy,sz);this._p.set(x,y,z);return this._m.compose(this._p,this._q,this._s)}
  addGeo(k,g,m,uvf){const b=this.bucket(k),pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv,base=b.p.length/3;this._n.getNormalMatrix(m);
    for(let i=0;i<pos.count;i++){this._t.fromBufferAttribute(pos,i).applyMatrix4(m);b.p.push(this._t.x,this._t.y,this._t.z);this._t.fromBufferAttribute(nor,i).applyMatrix3(this._n).normalize();b.n.push(this._t.x,this._t.y,this._t.z);
      if(uv)b.u.push(uvf?uvf(i,uv.getX(i),uv.getY(i))[0]:uv.getX(i),uvf?uvf(i,uv.getX(i),uv.getY(i))[1]:uv.getY(i));else b.u.push(0,0)}
    if(g.index)for(let i=0;i<g.index.count;i++)b.i.push(base+g.index.getX(i));else for(let i=0;i<pos.count;i++)b.i.push(base+i)}
  // box w×h×d centred at (x,y,z); ry/rx/rz rotations; tile = metres per texture repeat (omit for plain 0..1 UVs)
  box(k,w,h,d,x,y,z,ry,rx,rz,tile){const m=this.mat4(x,y,z,rx,ry,rz,w,h,d);
    const uvf=tile?(i,u,v)=>{const f=(i/4)|0;return f<2?[u*d/tile,v*h/tile]:f<4?[u*w/tile,v*d/tile]:[u*w/tile,v*h/tile]}:null;this.addGeo(k,MB.G.box,m,uvf);return this}
  // a box between x0..x1, y0..y1, z0..z1
  bx(k,x0,x1,y0,y1,z0,z1,tile){return this.box(k,x1-x0,y1-y0,z1-z0,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,0,0,0,tile)}
  cyl(k,rt,rb,h,seg,x,y,z,rx,ry,rz){const key=rt+'_'+rb+'_'+seg;let g=MB.G.cyl[key];if(!g)g=MB.G.cyl[key]=new THREE.CylinderGeometry(rt,rb,1,seg||10);const m=this.mat4(x,y,z,rx,ry,rz,1,h,1);this.addGeo(k,g,m);return this}
  // cylinder between two points
  rod(k,r,a,b,seg){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz);if(L<1e-4)return this;
    this._p.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(dx,dy,dz).normalize();this._q.setFromUnitVectors(up,dir);this._s.set(1,L,1);this._m.compose(this._p,this._q,this._s);
    const key=r+'_'+r+'_'+(seg||6);let g=MB.G.cyl[key];if(!g)g=MB.G.cyl[key]=new THREE.CylinderGeometry(r,r,1,seg||6);this.addGeo(k,g,this._m);return this}
  sph(k,r,x,y,z,sx,sy,sz,seg){const key=seg||10;let g=MB.G.sph[key];if(!g)g=MB.G.sph[key]=new THREE.SphereGeometry(1,key,Math.max(6,key*.7|0));const m=this.mat4(x,y,z,0,0,0,r*(sx||1),r*(sy||1),r*(sz||1));this.addGeo(k,g,m);return this}
  // flat quad from 4 points (counter-clockwise seen from the front); uv 0..1 (or tiled by `tile` metres)
  quad(k,a,b,c,d,tile){const bk=this.bucket(k),base=bk.p.length/3,A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),C=new THREE.Vector3(...c),n=new THREE.Vector3().subVectors(B,A).cross(new THREE.Vector3().subVectors(C,A)).normalize();
    for(const p of [a,b,c,d]){bk.p.push(p[0],p[1],p[2]);bk.n.push(n.x,n.y,n.z)}
    const w=A.distanceTo(B),h=B.distanceTo(C),su=tile?w/tile:1,sv=tile?h/tile:1;bk.u.push(0,0,su,0,su,sv,0,sv);bk.i.push(base,base+1,base+2,base,base+2,base+3);return this}
  // horizontal polygon (x,z pairs) at height y, facing up; fan triangulation (convex-ish outlines only)
  poly(k,pts,y,tile,down){const bk=this.bucket(k),base=bk.p.length/3,ny=down?-1:1;let cx=0,cz=0;for(const [x,z] of pts){cx+=x;cz+=z}cx/=pts.length;cz/=pts.length;
    const T=tile||1;bk.p.push(cx,y,cz);bk.n.push(0,ny,0);bk.u.push(cx/T,cz/T);for(const [x,z] of pts){bk.p.push(x,y,z);bk.n.push(0,ny,0);bk.u.push(x/T,z/T)}
    for(let i=0;i<pts.length;i++){const a=base+1+i,b=base+1+(i+1)%pts.length;down?bk.i.push(base,b,a):bk.i.push(base,a,b)}return this}
  // lathe (surface of revolution about the y axis) from [[r,y],...]
  lathe(k,prof,seg,x,y,z,rx,ry,rz,sx,sy,sz){const g=new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p[0],p[1])),seg||14);const m=this.mat4(x||0,y||0,z||0,rx,ry,rz,sx||1,sy||1,sz||1);this.addGeo(k,g,m);g.dispose();return this}
  // build the meshes under `root`. mats: key → material. opt.noShadow: Set of keys that do not cast.
  build(root,mats,opt){opt=opt||{};const out={};
    for(const [k,b] of this.k){if(!b.p.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));
      g.setIndex(b.p.length/3>65535?new THREE.Uint32BufferAttribute(b.i,1):new THREE.Uint16BufferAttribute(b.i,1));g.computeBoundingSphere();
      const m=mats[k];if(!m){console.warn('MB: no material for',k);continue}
      const me=new THREE.Mesh(g,m);me.name=opt.name?opt.name+':'+k:k;me.castShadow=!(opt.noShadow&&opt.noShadow.has(k))&&!m.transparent;me.receiveShadow=!!(opt.receive&&opt.receive.has(k));me.matrixAutoUpdate=opt.static!==false?false:true;if(!me.matrixAutoUpdate)me.updateMatrix();root.add(me);out[k]=me}
    return out}
}
