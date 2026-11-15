// gpudiet.js — GPU memory diet (2026-11-14). three.js keeps every texture it ever uploaded until someone calls dispose(): after a tour (centre, airport, ship, space) the tablet held
// +98 textures / +83 MB that nothing on screen used any more (tests/t_gpu.js). GPUDIET walks the scene a few hundred objects per frame; a texture whose users have all been hidden
// (a hidden parent, an interior you left, the space scene) or beyond the far plane for `ttl` seconds is released on the GPU. three uploads it again by itself when it is next drawn,
// so only textures that CAN be uploaded again are touched (an image / canvas / data that is still there; never a video, a render target or a texture that dropped its CPU copy).
// Hooks: GPUDIET.step(false) right before the world is rendered in loop(), GPUDIET.step(true) while the space scene is the one on screen.
const GPUDIET={now:0,last:0,ttl:0,on:true,O:[],L:[],seen:new WeakMap(),stat:{freed:0,passes:0},_v:null,
  MAPS:['map','normalMap','roughnessMap','metalnessMap','alphaMap','emissiveMap','bumpMap','aoMap','lightMap','specularMap'],
  again(t){const im=t.image;if(!im||t.isVideoTexture||t.isRenderTargetTexture||t.isCubeTexture||t.version<1)return false;
    if(typeof HTMLCanvasElement!=='undefined'&&im instanceof HTMLCanvasElement)return im.width>0;
    if((typeof HTMLImageElement!=='undefined'&&im instanceof HTMLImageElement)||(typeof ImageBitmap!=='undefined'&&im instanceof ImageBitmap))return (im.width||0)>0;
    return !!(t.isDataTexture&&im.data)||!!(t.isCompressedTexture&&t.mipmaps&&t.mipmaps.length)},
  mark(t,live){if(!t||!t.isTexture)return;const s=this.seen.get(t);
    if(live||s===undefined){this.seen.set(t,this.now);return}
    if(this.now-s<this.ttl)return;
    const p=renderer.properties.get(t);if(!p||p.__webglTexture===undefined||!this.again(t))return;
    t.dispose();this.stat.freed++;this.seen.set(t,this.now)},
  step(space){if(!this.on||typeof renderer==='undefined'||!renderer)return;
    const t=performance.now();this.now+=Math.min(1,(t-(this.last||t))/1000);this.last=t;if(!this.ttl)this.ttl=MOBILE?40:150;
    const O=this.O,L=this.L,v=this._v||(this._v=new THREE.Vector3());
    if(!O.length){this.stat.passes++;O.push(scene);L.push(space?0:1);if(typeof SPC!=='undefined'&&SPC.sc){O.push(SPC.sc);L.push(space?1:0)}}
    const cam=camera.position,far=camera.far;
    for(let n=0;n<260&&O.length;n++){const o=O.pop(),chain=L.pop()&&o.visible?1:0;
      const kids=o.children;for(let i=0;i<kids.length;i++){O.push(kids[i]);L.push(chain)}
      const m=o.material;if(!m)continue;
      let live=chain;
      if(live&&!space&&!o.isInstancedMesh){const e=o.matrixWorld.elements,g=o.geometry,bs=g&&g.boundingSphere;   // beyond the far plane nothing of it can be drawn (a sphere test: the direction does not matter, so turning the camera never evicts)
        if(bs){v.copy(bs.center).applyMatrix4(o.matrixWorld);if(v.distanceTo(cam)-bs.radius*Math.max(Math.hypot(e[0],e[1],e[2]),Math.hypot(e[4],e[5],e[6]),Math.hypot(e[8],e[9],e[10]))>far)live=0}
        else if(!g&&Math.hypot(e[12]-cam.x,e[13]-cam.y,e[14]-cam.z)>far)live=0}
      const ms=Array.isArray(m)?m:[m];
      for(let i=0;i<ms.length;i++){const mm=ms[i];if(!mm)continue;for(let k=0;k<this.MAPS.length;k++){const tx=mm[this.MAPS[k]];if(tx)this.mark(tx,live)}
        const u=mm.uniforms;if(u)for(const k in u){const x=u[k]&&u[k].value;if(x&&x.isTexture)this.mark(x,live)}}}
  }};
window.GPUDIET=GPUDIET;
