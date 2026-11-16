// roofpads.js — rooftop landing pads (2026-11-16). Three big flat roofs in the centre of Odesa (found from the chunk colliders: 41-48 m long, 22-26 m tall) carry a marked pad; the LIGHT plane lands on, parks on and takes off from them (plane.js groundY asks ROOFPADS.at).
//   Spawn menu "Light plane on a rooftop" puts you in the cockpit on the nearest pad. A pad is only ~40 m long: line up along it, full throttle, and drop off the edge to gain speed (the airliner / fighter do not fit and ignore the pads).
const ROOFPADS={list:[
  {id:'a',x:341,z:-10647,y:42.9+.3,hx:20,hz:13},
  {id:'b',x:440,z:-10693,y:41.3+.3,hx:21,hz:10},
  {id:'c',x:237,z:-10831,y:50+.3,hx:18,hz:9},
  {id:'sky',x:300,z:-10700,y:66.3,hx:350,hz:24,big:1}],built:false,   // the SKY DECK: a 700 m runway on pillars over the city centre (roofs are at most 50 m): the airliner and the fighter land on it too
  at(x,z,y,kind){for(const p of this.list)if((p.big||!kind||kind==='light')&&Math.abs(x-p.x)<p.hx&&Math.abs(z-p.z)<p.hz&&y>p.y-2.5)return p.y;return null},
  big(){return this.list.find(p=>p.big)},
  near(x,z){let b=null,bd=1e18;for(const p of this.list){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;b=p}}return b},
  build(){if(this.built)return;this.built=true;const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle='#2a2d31';g.fillRect(0,0,256,128);g.strokeStyle='#f2c230';g.lineWidth=6;g.strokeRect(6,6,244,116);g.fillStyle='#fff';g.font='bold 92px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('H',128,70);g.fillRect(14,60,60,8);g.fillRect(182,60,60,8);
    const tex=new THREE.CanvasTexture(c);tex.anisotropy=4;const top=new THREE.MeshStandardMaterial({map:tex,roughness:.9}),side=new THREE.MeshStandardMaterial({color:0x44474b,roughness:.9}),lamp=new THREE.MeshBasicMaterial({color:0xffd24a,fog:false});
    this.g=new THREE.Group();for(const p of this.list){if(p.big){this.buildDeck(p,side);continue}const m=new THREE.Mesh(new THREE.BoxGeometry(p.hx*2,.3,p.hz*2),[side,side,top,side,side,side]);m.position.set(p.x,p.y-.15,p.z);this.g.add(m);
      for(let i=0;i<=8;i++){for(const s of [-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(.35,.3,.35),lamp);l.position.set(p.x-p.hx+.6+i*(p.hx*2-1.2)/8,p.y+.15,p.z+s*(p.hz-.6));this.g.add(l)}}}
    scene.add(this.g)},
  // the sky deck: slab with a runway paint job (centre line, threshold bars, edge lights) on pillars every 50 m; a walkable special surface so you can stand on it
  buildDeck(p,side){const c=document.createElement('canvas');c.width=2048;c.height=256;const g=c.getContext('2d');g.fillStyle='#34373b';g.fillRect(0,0,2048,256);g.fillStyle='#e8e8e2';for(let x=140;x<1900;x+=120)g.fillRect(x,122,70,12);for(let i=0;i<10;i++){g.fillRect(30,40+i*18,90,9);g.fillRect(1928,40+i*18,90,9)}g.fillStyle='#f2c230';g.fillRect(0,4,2048,5);g.fillRect(0,247,2048,5);g.font='bold 70px system-ui';g.fillStyle='#e8e8e2';g.textAlign='center';g.fillText('27',230,230);g.fillText('09',1818,60);
    const tex=new THREE.CanvasTexture(c);tex.anisotropy=8;const top=new THREE.MeshStandardMaterial({map:tex,roughness:.9}),m=new THREE.Mesh(new THREE.BoxGeometry(p.hx*2,.6,p.hz*2),[side,side,top,side,side,side]);m.position.set(p.x,p.y-.3,p.z);this.g.add(m);
    const n=Math.floor(p.hx*2/50),pil=new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1,1.5,1,10),side,(n+1)*2),bs=new THREE.Matrix4();let k=0;for(let i=0;i<=n;i++)for(const s of [-1,1]){const x=p.x-p.hx+i*50,z=p.z+s*(p.hz-4),gy=groundH(x,z),h=p.y-.6-gy;if(h<2)continue;bs.compose(new THREE.Vector3(x,gy+h/2-.2,z),new THREE.Quaternion(),new THREE.Vector3(1,h,1));pil.setMatrixAt(k++,bs)}pil.count=k;this.g.add(pil);
    const lamp=new THREE.MeshBasicMaterial({color:0xffd24a,fog:false}),L=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.4,.5),lamp,Math.floor(p.hx*2/20)*2+2);let j=0;for(let x=p.x-p.hx+3;x<p.x+p.hx;x+=20)for(const s of [-1,1]){bs.makeTranslation(x,p.y+.2,p.z+s*(p.hz-1));L.setMatrixAt(j++,bs)}L.count=j;this.g.add(L);
    const f=(x,z,y)=>{if(y>=p.y-1.6&&Math.abs(x-p.x)<p.hx&&Math.abs(z-p.z)<p.hz)return {h:p.y,pri:36,surf:'asphalt'};return null};if(typeof holdSpecial==='function')holdSpecial(f)},
  init(){this.build()}};
