// models.js — real 3D props (CC0 glTF: Poly Haven TV / armchair / Soviet tins) loaded on demand and dropped into any interior.
// MDL.put(parent,'Television_01',{x,y,z,ry,h}) returns a holder Group at once; the model is attached when its file has arrived.
const MDL={base:'assets/models/props/',buf:{},wait:{},gl:{},
  bytes(name){if(this.buf[name])return Promise.resolve(this.buf[name]);
    return this.wait[name]||(this.wait[name]=fetch(this.base+name+'.glb').then(r=>{if(!r.ok)throw new Error(name+' '+r.status);return r.arrayBuffer()}).then(b=>this.buf[name]=b))},
  parse(name){return this.bytes(name).then(b=>new Promise((ok,no)=>new THREE.GLTFLoader().parse(b.slice(0),'',ok,no)))},
  // a model is parsed once; static models are cloned (sharing geometry + textures), skinned ones are parsed again
  make(name){if(!this.gl[name])this.gl[name]=this.parse(name).then(g=>{g.skinned=false;g.scene.traverse(o=>{if(o.isSkinnedMesh)g.skinned=true});return g});
    return this.gl[name].then(g=>g.skinned?this.parse(name):{scene:g.scene.clone(true),animations:g.animations})},
  // opts: h = target height (m) or s = scale (sc = [kx,ky,kz] stretches on top of it); x,y,z,ry = placement; keep:1 leaves the model's own origin on the holder instead of centring its bounding box (the venue pieces are authored around their footprint)
  tc:new Map(),
  tinted(mat,t){const k=mat.uuid+'|'+t;let m=this.tc.get(k);if(!m){m=mat.clone();m.color.multiply(new THREE.Color(t).convertSRGBToLinear());this.tc.set(k,m)}return m},
  // o.bake:1 — once everything put into `parent` with bake:1 has arrived, the static meshes of those models are merged per material into one mesh each
  // (a flat or a venue drops from several hundred draw calls to a few dozen); do not use it for a model that is moved, animated or looked up later
  put(parent,name,o){o=o||{};const holder=new THREE.Group();holder.position.set(o.x||0,o.y||0,o.z||0);holder.rotation.y=o.ry||0;parent.add(holder);
    let mb=null;if(o.bake){mb=parent.userData.mb||(parent.userData.mb={n:0,hs:[]});mb.n++;mb.hs.push(holder)}
    const done=()=>{if(mb&&--mb.n===0){try{this.bake(parent)}catch(e){console.warn('[models] bake',e&&e.message||e)}}};
    this.make(name).then(g=>{const m=g.scene;let s=o.s||1;
      if(o.h||o.w||o.d){const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3());s=o.h?o.h/sz.y:o.w?o.w/sz.x:o.d/sz.z}
      m.scale.multiplyScalar(s);if(o.sc)m.scale.multiply(new THREE.Vector3(o.sc[0],o.sc[1],o.sc[2]));m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m),c=b.getCenter(new THREE.Vector3());
      if(!o.keep){m.position.x-=c.x;m.position.z-=c.z}m.position.y-=b.min.y;
      m.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=true;x.frustumCulled=!x.isSkinnedMesh}});
      if(o.tint||o.tints){const tm=o.tints;   // tint: multiply the diffuse colour of every material (o.tint) or of the materials named in o.tints {name:'#colour'}; one clone per (material, colour) so identical tints share a material and can be baked together
        m.traverse(x=>{if(!x.isMesh||!x.material||!x.material.color)return;const t=tm?tm[x.material.name]:o.tint;if(!t)return;x.material=this.tinted(x.material,t)})}
      holder.add(m);holder.userData.model=m;holder.userData.clips=g.animations||[];
      if(o.ready)o.ready(holder,m,g.animations||[])}).catch(e=>console.warn('[models]',name,e&&e.message||e)).then(done);
    return holder},
  bake(parent){const mb=parent.userData.mb;if(!mb)return;const hs=mb.hs.splice(0);parent.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(parent.matrixWorld).invert(),groups=new Map();
    for(const h of hs){if(!h.parent)continue;h.updateMatrixWorld(true);h.traverse(x=>{if(!x.isMesh||x.isSkinnedMesh||!x.geometry||!x.geometry.index||Array.isArray(x.material))return;
      const a=x.geometry.attributes,sig=Object.keys(a).sort().join(),k=x.material.uuid+'|'+sig;let g=groups.get(k);if(!g)groups.set(k,g={mat:x.material,sig,ms:[]});g.ms.push(x)})}
    const v=new THREE.Vector3(),n=new THREE.Vector3();
    for(const g of groups.values()){let nv=0,ni=0;for(const x of g.ms){nv+=x.geometry.attributes.position.count;ni+=x.geometry.index.count}
      const names=Object.keys(g.ms[0].geometry.attributes),out={};for(const nm of names){const A=g.ms[0].geometry.attributes[nm];out[nm]=new Float32Array(nv*A.itemSize)}
      const idx=nv>65535?new Uint32Array(ni):new Uint16Array(ni);let vo=0,io=0;
      for(const x of g.ms){const m4=new THREE.Matrix4().multiplyMatrices(inv,x.matrixWorld),nm3=new THREE.Matrix3().getNormalMatrix(m4),flip=m4.determinant()<0,G=x.geometry,P=G.attributes.position,cnt=P.count;
        for(const nm of names){const A=G.attributes[nm],o=out[nm],is=A.itemSize;
          if(nm==='position')for(let i=0;i<cnt;i++){v.fromBufferAttribute(A,i).applyMatrix4(m4);o[(vo+i)*3]=v.x;o[(vo+i)*3+1]=v.y;o[(vo+i)*3+2]=v.z}
          else if(nm==='normal')for(let i=0;i<cnt;i++){n.fromBufferAttribute(A,i).applyMatrix3(nm3).normalize();o[(vo+i)*3]=n.x;o[(vo+i)*3+1]=n.y;o[(vo+i)*3+2]=n.z}
          else for(let i=0;i<cnt;i++){o[(vo+i)*is]=A.getX(i);if(is>1)o[(vo+i)*is+1]=A.getY(i);if(is>2)o[(vo+i)*is+2]=A.getZ(i);if(is>3)o[(vo+i)*is+3]=A.getW(i)}}
        const I=G.index;for(let i=0;i<I.count;i+=3){const a=I.getX(i)+vo,b=I.getX(i+1)+vo,c=I.getX(i+2)+vo;idx[io++]=a;idx[io++]=flip?c:b;idx[io++]=flip?b:c}
        vo+=cnt}
      const geo=new THREE.BufferGeometry();for(const nm of names)geo.setAttribute(nm,new THREE.BufferAttribute(out[nm],g.ms[0].geometry.attributes[nm].itemSize,g.ms[0].geometry.attributes[nm].normalized));
      geo.setIndex(new THREE.BufferAttribute(idx,1));const mesh=new THREE.Mesh(geo,g.mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.baked=true;parent.add(mesh);
      for(const x of g.ms)if(x.parent)x.parent.remove(x)}
    for(const h of hs)if(h.parent&&!h.children.some(c=>c.children.length||c.isMesh)&&!h.userData.keepHolder)h.parent.remove(h)}};
