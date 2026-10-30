// models.js — real 3D props (CC0 glTF: Poly Haven TV / armchair / Soviet tins) loaded on demand and dropped into any interior.
// MDL.put(parent,'Television_01',{x,y,z,ry,h}) returns a holder Group at once; the model is attached when its file has arrived.
const MDL={base:'assets/models/props/',buf:{},wait:{},gl:{},
  bytes(name){if(this.buf[name])return Promise.resolve(this.buf[name]);
    return this.wait[name]||(this.wait[name]=fetch(this.base+name+'.glb').then(r=>{if(!r.ok)throw new Error(name+' '+r.status);return r.arrayBuffer()}).then(b=>this.buf[name]=b))},
  parse(name){return this.bytes(name).then(b=>new Promise((ok,no)=>new THREE.GLTFLoader().parse(b.slice(0),'',ok,no)))},
  // a model is parsed once; static models are cloned (sharing geometry + textures), skinned ones are parsed again
  make(name){if(!this.gl[name])this.gl[name]=this.parse(name).then(g=>{g.skinned=false;g.scene.traverse(o=>{if(o.isSkinnedMesh)g.skinned=true});return g});
    return this.gl[name].then(g=>g.skinned?this.parse(name):{scene:g.scene.clone(true),animations:g.animations})},
  // opts: h = target height (m) or s = scale; x,y,z,ry = placement; cx/cz keep the model's own centre instead of centring it on the holder
  put(parent,name,o){o=o||{};const holder=new THREE.Group();holder.position.set(o.x||0,o.y||0,o.z||0);holder.rotation.y=o.ry||0;parent.add(holder);
    this.make(name).then(g=>{const m=g.scene;let s=o.s||1;
      if(o.h||o.w||o.d){const b=new THREE.Box3().setFromObject(m),sz=b.getSize(new THREE.Vector3());s=o.h?o.h/sz.y:o.w?o.w/sz.x:o.d/sz.z}
      m.scale.multiplyScalar(s);m.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(m),c=b.getCenter(new THREE.Vector3());
      m.position.x-=c.x;m.position.z-=c.z;m.position.y-=b.min.y;
      m.traverse(x=>{if(x.isMesh){x.castShadow=true;x.receiveShadow=true;x.frustumCulled=!x.isSkinnedMesh}});
      if(o.tint){const tc=new THREE.Color(o.tint).convertSRGBToLinear();m.traverse(x=>{if(x.isMesh&&x.material&&x.material.color){x.material=x.material.clone();x.material.color.multiply(tc)}})}   // tint: multiply the diffuse colour (recolour a painted prop)
      holder.add(m);holder.userData.model=m;holder.userData.clips=g.animations||[];
      if(o.ready)o.ready(holder,m,g.animations||[])}).catch(e=>console.warn('[models]',name,e&&e.message||e));
    return holder}};
