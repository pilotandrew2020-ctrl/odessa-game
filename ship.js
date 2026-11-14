// ship.js — the owner's cruise ship (Cruise.zip, a 439 m SketchUp liner with pools and water slides), 2026-11-14.
//   * It replaces the old "Odesa Star" at the sea terminal (the old hull, decks, walls and gangway are switched off) and the old yacht: a second ship sails a loop in the open sea.
//   * Models: assets/models/ship/cruise_ship.glb (8 tiles, 100k triangles, vertex colours, one draw call per tile), cruise_ship_far.glb (32k triangles, beyond 900 m), and cruise_deck.bin: a 1 m grid of floor
//     heights and wall intervals taken from the model's own triangles, so every deck, stair tread and wall of the ship can be walked (see tools/models/ship/deckmap.py).
//   * Walking: one SPECIAL surface function (flagged .deck) answers floor heights per ship-local cell and blocks walls; a moving ship carries whoever stands on it (position and heading).
//   * Boarding: "Board the cruise ship" at the terminal quay and the Spawn menu entry (you appear on a deck of the sailing ship).
const SHIP={ready:false,inst:[],near:null,far:null,deck:null,drop:8,spawnLoc:null,
  init(){if(this.inited)return;this.inited=1;const t=()=>{if(this.ready||typeof CRUISE==='undefined'||!CRUISE.g)return;this.build()};t();if(!this.ready)this._iv=setInterval(()=>{t();if(this.ready)clearInterval(this._iv)},1500);ANIM.push(dt=>this.update(dt))},
  async build(){if(this._b)return;this._b=1;try{
      const ld=u=>new Promise((res,rej)=>new THREE.GLTFLoader().load(u,g=>res(g.scene),undefined,rej));
      const [n,f,ab]=await Promise.all([ld('assets/models/ship/cruise_ship.glb'),ld('assets/models/ship/cruise_ship_far.glb'),fetch('assets/models/ship/cruise_deck.bin').then(r=>r.arrayBuffer())]);
      for(const r of [n,f])r.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.material.side=THREE.FrontSide;if(o.material.name==='hull'){o.material.flatShading=true;o.material.needsUpdate=true}if(o.material.name==='glass'){o.material.depthWrite=false;o.renderOrder=3}}});
      this.near=n;this.far=f;this.parse(ab);this.neutralise();
      const th=CRUISE.rot||0,bd=[Math.cos(th),-Math.sin(th)];this.bd=bd;
      // A: moored at the sea terminal, stern where the old stern was, bow out to sea
      const A=this.add(CRUISE.x+bd[0]*145,CRUISE.z+bd[1]*145,Math.atan2(bd[0],bd[1]),'dock');this.A=A;
      // B: the sailing one, a loop in open water beyond the launch islet
      const pp=[-bd[1],bd[0]];let k=1;const ok=(x,z)=>rawH(x,z)<SL-14;let B0;for(let q=1;q>.3;q-=.1){B0=[CRUISE.x+bd[0]*1700*q,CRUISE.z+bd[1]*1700*q];const L=650*q,pts=[[B0[0]+pp[0]*L,B0[1]+pp[1]*L],[B0[0]-pp[0]*L,B0[1]-pp[1]*L],[B0[0]-pp[0]*L+bd[0]*520*q,B0[1]-pp[1]*L*0+bd[1]*520*q-pp[1]*L*0],[B0[0]+pp[0]*L+bd[0]*520*q,B0[1]+pp[1]*L+bd[1]*520*q]];
        pts[2]=[B0[0]-pp[0]*L+bd[0]*520*q,B0[1]-pp[1]*L+bd[1]*520*q];if(pts.every(p=>ok(p[0],p[1]))){this.route=pts;break}}
      if(!this.route)this.route=[[CRUISE.x+bd[0]*900,CRUISE.z+bd[1]*900],[CRUISE.x+bd[0]*1100,CRUISE.z+bd[1]*1100]];
      const r0=this.route[0],r1=this.route[1],Bs=this.add(r0[0],r0[1],Math.atan2(r1[0]-r0[0],r1[1]-r0[1]),'sail');this.B=Bs;Bs.ri=1;
      INTERACT.push({x:0,z:0,r:1e9,label:'Board the cruise ship',cond:()=>this.nearQuay(),fn:()=>this.boardA()});
      const pl=PLACES.find(p=>p.id==='cruise');if(pl){pl.name='Cruise ship';pl.sub='board at the sea terminal quay, walk all decks'}
      this.ready=true;console.log('[ship] cruise ship ready')}catch(e){console.warn('[ship] failed',e);this._b=0}},
  parse(ab){const v=new DataView(ab);const W=v.getUint16(0,true),H=v.getUint16(2,true),x0=v.getFloat32(4,true),z0=v.getFloat32(8,true),cell=v.getFloat32(12,true);let o=16;const off=new Uint32Array(W*H);
    for(let i=0;i<W*H;i++){off[i]=o;const nf=v.getUint8(o);o+=1+nf*2;const nw=v.getUint8(o);o+=1+nw*4}this.deck={v,W,H,x0,z0,cell,off}},
  cellAt(lx,lz){const D=this.deck,cx=Math.floor((lx-D.x0)/D.cell),cz=Math.floor((lz-D.z0)/D.cell);return cx<0||cz<0||cx>=D.W||cz>=D.H?-1:D.off[cx+cz*D.W]},
  floors(o){const v=this.deck.v,n=v.getUint8(o),a=[];for(let i=0;i<n;i++)a.push((v.getUint16(o+1+i*2,true)-400)/20);return a},
  walls(o){const v=this.deck.v,nf=v.getUint8(o),p=o+1+nf*2,n=v.getUint8(p),a=[];for(let i=0;i<n;i++)a.push([(v.getUint16(p+1+i*4,true)-400)/20,(v.getUint16(p+3+i*4,true)-400)/20]);return a},
  // the old liner: switch off its walls, deck surfaces, hull obstacle, people and gangway
  neutralise(){const R=CRUISE.rm;if(!R)return;for(let i=R.w0;i<R.w1;i++){const w=STATIC_WALLS[i];if(w){w.hw=-9;w.hd=-9}}for(let i=R.s0;i<R.s1;i++)SPECIAL[i]=Object.assign(()=>null,{deck:0});
    if(CRUISE.g)CRUISE.g.visible=false;for(const m of CRUISE.hide||[])m.visible=false;if(CRUISE.people)CRUISE.people.length=0;const h=MARINE.hulls[R.hull-1];if(h){h.hl=0;h.hw=0}
    // the old yacht: hidden and switched off, "call the yacht" brings the cruise ship
    try{if(typeof YACHT!=='undefined'&&YACHT.y){YACHT.y.root.visible=false;YACHT.update=()=>{};YACHT.summon=()=>SHIP.summon()}}catch(e){}},
  add(x,z,theta,mode){const g=new THREE.Group(),n=this.near.clone(true),f=this.far.clone(true);g.add(n);g.add(f);g.position.set(x,SL-this.drop,z);scene.add(g);
    const I={g,n,f,x,z,th:theta,mode,spd:0,ri:0,carry:null,hull:{x,z,hl:225,hw:36,ca:Math.sin(theta),sa:Math.cos(theta)}};this.pose(I);MARINE.hulls.push(I.hull);this.inst.push(I);
    // the deck surface of this ship (walls block, floors carry)
    const f2=(wx,wz,wy)=>this.surface(I,wx,wz,wy);f2.deck=1;SPECIAL.push(f2);return I},
  pose(I){const ph=I.th+Math.PI;I.g.rotation.y=ph;I.g.position.x=I.x;I.g.position.z=I.z;I.cp=Math.cos(ph);I.sp=Math.sin(ph);I.hull.x=I.x;I.hull.z=I.z;I.hull.ca=Math.sin(I.th);I.hull.sa=Math.cos(I.th)},
  local(I,x,z){const dx=x-I.x,dz=z-I.z;return [dx*I.cp-dz*I.sp,dx*I.sp+dz*I.cp]},world(I,lx,lz){return [I.x+lx*I.cp+lz*I.sp,I.z-lx*I.sp+lz*I.cp]},
  surface(I,wx,wz,wy){if(!this.deck||!I)return null;const [lx,lz]=this.local(I,wx,wz);if(lx<-35||lx>35||lz<-223||lz>223)return null;const o=this.cellAt(lx,lz);if(o<0)return null;
    const yy=(wy===undefined?99:wy)-I.g.position.y,F=this.floors(o);let h=null;for(const f of F)if(f<=yy+.9&&(h===null||f>h))h=f;if(h===null)return null;
    const W=this.walls(o);for(const [a,b] of W)if(b>h+.7&&a<h+1.7&&b-a>.8)return {h:I.g.position.y+h,pri:45,surf:'wood',wall:true};return {h:I.g.position.y+h,pri:45,surf:'wood'}},
  // boarding
  nearQuay(){if(!this.ready||this.carryOn())return false;const p=PLACES.find(q=>q.id==='cruise');return !!p&&Math.hypot(p.x-player.x,p.z-player.z)<14&&!PORTAL.cur},
  carryOn(){return this.inst.some(I=>I.carry)},
  deckSpot(I,prefZ){const D=this.deck;let best=null;for(let dz=0;dz<120;dz++)for(const s of [1,-1]){const lz=prefZ+s*dz;for(let lx=-16;lx<=16;lx+=3){const o=this.cellAt(lx,lz);if(o<0)continue;const F=this.floors(o).filter(f=>f>14&&f<40),W=this.walls(o);if(!F.length)continue;const f=Math.max(...F);let ok=true;for(const [a,b] of W)if(b>f+.7&&a<f+1.7)ok=false;
        // an open area: the four neighbours free too
        if(ok){for(const [ax,az] of [[2,0],[-2,0],[0,2],[0,-2]]){const o2=this.cellAt(lx+ax,lz+az);if(o2<0){ok=false;break}if(!this.floors(o2).some(g=>Math.abs(g-f)<.5)){ok=false;break}}}
        if(ok)return {lx,lz,f}}}return best},
  place(I,spot){const [wx,wz]=this.world(I,spot.lx,spot.lz);teleportRaw(wx,wz,I.th+Math.PI);setTimeout(()=>{player.x=wx;player.z=wz;player.y=I.g.position.y+spot.f+.05;player.vy=0;player.air=false;if(typeof SWIM!=='undefined')try{SWIM.reset()}catch(e){}},700)},
  boardA(){const I=this.A,s=this.deckSpot(I,170);if(!s){toast('Cruise ship','no free deck found');return}const f=document.getElementById('fade');if(f)f.style.opacity=1;setTimeout(()=>{this.place(I,s);if(f)f.style.opacity=0;toast('Cruise ship','pools, decks and slides: walk anywhere')},380)},
  summon(){if(!this.ready){toast('Cruise ship','still loading, try again in a moment');return}const I=this.B,s=this.deckSpot(I,170);if(!s){toast('Cruise ship','no free deck found');return}this.place(I,s);toast('Cruise ship','sailing a loop in the bay: walk all decks')},
  // ---- every frame: sail, carry, level of detail
  update(dt){if(!this.ready)return;const cam=camera.position;dt=Math.min(dt,.1);
    for(const I of this.inst){
      let on=null;if(typeof started!=='undefined'&&started){const [lx,lz]=this.local(I,player.x,player.z);if(Math.abs(lx)<34&&Math.abs(lz)<222){const o=this.cellAt(lx,lz);if(o>=0){const yy=player.y-I.g.position.y;if(this.floors(o).some(f=>Math.abs(f-yy)<1.3))on=[lx,lz]}}}
      if(I.mode==='sail'){const T=this.route[I.ri],dx=T[0]-I.x,dz=T[1]-I.z,d=Math.hypot(dx,dz);if(d<90)I.ri=(I.ri+1)%this.route.length;
        let want=Math.atan2(dx,dz)-I.th;while(want>Math.PI)want-=6.2832;while(want<-Math.PI)want+=6.2832;const maxT=.02*dt;I.th+=Math.max(-maxT,Math.min(maxT,want));I.spd+=(11-I.spd)*Math.min(1,dt*.15);
        I.x+=Math.sin(I.th)*I.spd*dt;I.z+=Math.cos(I.th)*I.spd*dt;      }
      if(on&&I.mode==='sail'){I.carry=on}else I.carry=null;
      if(I.mode==='sail'){const old={cp:I.cp,sp:I.sp,x:I.x,z:I.z};this.pose(I);if(I.carry){const [wx,wz]=this.world(I,I.carry[0],I.carry[1]);player.x=wx;player.z=wz;player.yaw+=I.th-(I.prevTh===undefined?I.th:I.prevTh)}I.prevTh=I.th}
      const d=Math.hypot(I.x-cam.x,I.z-cam.z);I.n.visible=d<900;I.f.visible=d>=900&&d<6000;I.g.visible=d<6000}
  },
};
