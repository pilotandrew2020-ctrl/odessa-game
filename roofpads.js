// roofpads.js — rooftop landing pads (2026-11-16). Three big flat roofs in the centre of Odesa (found from the chunk colliders: 41-48 m long, 22-26 m tall) carry a marked pad; the LIGHT plane lands on, parks on and takes off from them (plane.js groundY asks ROOFPADS.at).
//   Spawn menu "Light plane on a rooftop" puts you in the cockpit on the nearest pad. A pad is only ~40 m long: line up along it, full throttle, and drop off the edge to gain speed (the airliner / fighter do not fit and ignore the pads).
const ROOFPADS={list:[
  {id:'a',x:341,z:-10647,y:42.9+.3,hx:20,hz:13},
  {id:'b',x:440,z:-10693,y:41.3+.3,hx:21,hz:10},
  {id:'c',x:237,z:-10831,y:50+.3,hx:18,hz:9}],built:false,
  at(x,z,y){for(const p of this.list)if(Math.abs(x-p.x)<p.hx&&Math.abs(z-p.z)<p.hz&&y>p.y-2.5)return p.y;return null},
  near(x,z){let b=null,bd=1e18;for(const p of this.list){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;b=p}}return b},
  build(){if(this.built)return;this.built=true;const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle='#2a2d31';g.fillRect(0,0,256,128);g.strokeStyle='#f2c230';g.lineWidth=6;g.strokeRect(6,6,244,116);g.fillStyle='#fff';g.font='bold 92px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('H',128,70);g.fillRect(14,60,60,8);g.fillRect(182,60,60,8);
    const tex=new THREE.CanvasTexture(c);tex.anisotropy=4;const top=new THREE.MeshStandardMaterial({map:tex,roughness:.9}),side=new THREE.MeshStandardMaterial({color:0x44474b,roughness:.9}),lamp=new THREE.MeshBasicMaterial({color:0xffd24a,fog:false});
    this.g=new THREE.Group();for(const p of this.list){const m=new THREE.Mesh(new THREE.BoxGeometry(p.hx*2,.3,p.hz*2),[side,side,top,side,side,side]);m.position.set(p.x,p.y-.15,p.z);this.g.add(m);
      for(let i=0;i<=8;i++){for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(.35,.3,.35),lamp);l.position.set(p.x-p.hx+.6+i*(p.hx*2-1.2)/8,p.y+.15,p.z+s*(p.hz-.6));this.g.add(l)}}}
    scene.add(this.g)},
  init(){this.build()}};
