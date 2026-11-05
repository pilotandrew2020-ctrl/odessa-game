/* ===================================================================================================
   war.js — things that can be blown up in the air: the Apache, friends' helicopters, and every aircraft added later.
   Before this file the tactical nuke fell straight through a helicopter (it only knew about the ground and buildings).
   Sources register a function returning [{pos:Vector3, r:radius, kill:fn, id}]; the bomb, rockets and every GUN explosion
   (GUN.addBoom) ask WAR.airHit / WAR.boom / WAR.sweep.
   =================================================================================================== */
const WAR={
  sources:[],
  _t:[],
  reg(fn){this.sources.push(fn)},
  // every live target right now
  targets(){const out=this._t;out.length=0;for(const f of this.sources){try{const a=f();if(a)for(const t of a)out.push(t)}catch(e){}}return out},
  // a falling bomb / flying rocket at point p with its own radius: the first target it overlaps (or null)
  airHit(p,rad,ignoreId){for(const t of this.targets()){if(ignoreId&&t.id===ignoreId)continue;if(t.pos.distanceTo(p)<=t.r+(rad||0))return t}return null},
  // a blast of radius r: every target inside it is destroyed
  boom(x,y,z,r,ignoreId){if(typeof FAUNA!=='undefined')FAUNA.boom(x,y,z,r);const c=new THREE.Vector3(x,y,z);let n=0;for(const t of this.targets()){if(ignoreId&&t.id===ignoreId)continue;if(t.pos.distanceTo(c)<=r+t.r){t.kill(c);n++}}return n},
  // an expanding shock wave (TAC): kill what the front has reached, once
  sweep(w){const c=new THREE.Vector3(w.x,w.y,w.z);for(const t of this.targets()){const k=t.id||t;if(w.hit.has(k))continue;if(t.pos.distanceTo(c)<=w.r+t.r){w.hit.add(k);t.kill(c)}}},

  // ---------- the player's Apache + friends' helicopters ----------
  heliSrc(){const out=[];
    if(typeof HELI!=='undefined'&&HELI.root&&HELI.on&&!HELI.dead)out.push({id:'heli-me',pos:HELI.root.position,r:5.4,kill:()=>WAR.killHeli()});
    if(typeof COOP!=='undefined')for(const R of COOP.peers.values()){if(R.heli&&R.heli.root&&R.heli.root.visible&&!R.heliDead)out.push({id:'heli-'+R.peer,pos:R.heli.root.position,r:5.4,kill:()=>WAR.killPeerHeli(R)})}
    return out},
  blowUp(p,n,cols,big){FX.init();FX.explode(p.x,p.y,p.z,big||9);EXT.fireball(p.x,p.y,p.z,big?big*.9:8);EXT.shatter(p.x,p.y,p.z,n||40,cols||[0x3a4034,0x23262a,0x6a6f66,0xd0d4d8],14,0,0);
    for(let i=0;i<10;i++)FX.puff({x:p.x+(Math.random()-.5)*3,y:p.y+(Math.random()-.5)*2,z:p.z+(Math.random()-.5)*3,vx:(Math.random()-.5)*5,vy:2+Math.random()*4,vz:(Math.random()-.5)*5,s0:1.2,s1:5,life:2.6,c0:[.25,.24,.22],c1:[.1,.1,.1],op:.7,add:false,drag:.6,grow:1});
    if(typeof GUN!=='undefined')GUN.sfx('boom',.8);FX.shakeT=.6;FX.shakeA=Math.max(FX.shakeA||0,.35)},
  killHeli(){if(HELI.dead)return;const p=HELI.root.position.clone();this.blowUp(p,46);HELI.dead=true;HELI.deadT=14;
    if(HELI.on){HELI.toggle();player.vy=Math.min(player.vy||0,-4)}   // thrown clear: the fall is real
    toast('Helicopter destroyed','a new one is brought in after 14 s')},
  killPeerHeli(R){const p=R.heli.root.position.clone();this.blowUp(p,40);R.heliDead=6;R.heli.root.visible=false;toast('Boom!',((R.st&&R.st.n)||'A friend')+"'s helicopter went down on your screen")},
  tick(dt){
    if(typeof HELI!=='undefined'&&HELI.dead){HELI.deadT-=dt;if(HELI.deadT<=0){HELI.dead=false;toast('Helicopter ready','press V to fly')}}
    if(typeof COOP!=='undefined')for(const R of COOP.peers.values())if(R.heliDead>0){R.heliDead-=dt;if(R.heli&&R.heli.root)R.heli.root.visible=false;if(R.heliDead<=0)R.heliDead=0}},
  init(){this.reg(()=>this.heliSrc());ANIM.push(dt=>this.tick(dt))}
};
