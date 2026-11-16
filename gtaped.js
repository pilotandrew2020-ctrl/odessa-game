// gtaped.js — round 22 (2026-11-16): the people in the street notice gunfire and can be shot, like in GTA.
//   * every shot is HEARD: pedestrians within ~45 m (12 m for the silenced shotgun) run (the existing `flee` speed-up) and shout; people that the bullet passes close to flinch
//   * the bullet HITS a pedestrian (head / body, like the friends' hitscan): a hit knocks him down, enough damage kills him (he stays lying ~20 s, then is gone; the street fills up with new people)
//   * an EXPLOSION kills people inside its radius, throws them away from it, and everybody within 2.5 radii runs
//   Uses what is there: the crowd's `fallT / fallDir / tilt` (SHOVE) and `flee` (SHOVE.post speeds the walkers up). Loaded after moonx.js.
const GTAP={LINES:['Gun! He has a gun!','Run!','Somebody call the police!','Aaa! He is shooting!','Get down!'],
  lists(){return typeof CRUISE!=='undefined'&&CRUISE.people.length?[PEDS,TALKERS,CRUISE.people]:[PEDS,TALKERS]},
  scare(x,z,r,say){for(const L of this.lists())for(const p of L){if(p.dead)continue;const d=Math.hypot(p.x-x,p.z-z);if(d>r)continue;p.flee=Math.max(p.flee||0,7);p.pose=p.pose==='talk'?'walk':p.pose;p.moving=true;p.wait=0;
      if(say&&d<r*.6&&!(p.sayT>0)&&Math.random()<.25&&typeof SHOVE!=='undefined')SHOVE.say(p,this.LINES)}},
  blood(x,y,z){try{FX.init();for(let i=0;i<3;i++)FX.puff({x,y,z,vx:(Math.random()-.5)*1.5,vy:.6+Math.random(),vz:(Math.random()-.5)*1.5,s0:.12,s1:.35,life:.5,c0:[.55,.02,.02],c1:[.3,.0,.0],op:.8,add:false,drag:2,grow:1})}catch(e){}},
  kill(p,ux,uz){if(p.dead)return;p.dead=true;p.deadT=0;p.hp=0;p.fallT=30;p.fallDir=(ux*Math.sin(p.yaw||0)+uz*Math.cos(p.yaw||0))>0?1:-1;p.moving=false;p.flee=0;p.kvx=(p.kvx||0)+ux*2.2;p.kvz=(p.kvz||0)+uz*2.2;p.kx=p.kx||0;p.kz=p.kz||0},
  hurt(p,dmg,ux,uz,head){if(p.dead)return;if(p.hp===undefined)p.hp=60;p.hp-=dmg;this.blood(p.x,p.y+(head?1.6:1.1),p.z);
    if(p.hp<=0||head&&dmg>=30)this.kill(p,ux,uz);else{p.fallT=1.6;p.fallDir=Math.random()<.5?1:-1;p.kvx=(p.kvx||0)+ux*2;p.kvz=(p.kvz||0)+uz*2;p.kx=p.kx||0;p.kz=p.kz||0;if(typeof SHOVE!=='undefined')SHOVE.say(p,['Ouch!','He shot me!','Aaa!'])}
    p.flee=8},
  // the nearest pedestrian on the ray (the same sphere test as the friends' hitscan)
  ray(o,d,max){let best=null;for(const L of this.lists())for(const p of L){if(p.dead)continue;for(const [h,r,hd] of [[1.62,.3,true],[1.1,.4,false],[.5,.38,false]]){const cx=p.x-o.x,cy=p.y+h-o.y,cz=p.z-o.z,t=cx*d.x+cy*d.y+cz*d.z;if(t<0||t>max)continue;const q=cx*cx+cy*cy+cz*cz-t*t;if(q>r*r)continue;const th=t-Math.sqrt(r*r-q);if(!best||th<best.t)best={p,t:Math.max(0,th),head:hd}}}return best},
  shot(G){const W=WEAPONS[G.w];if(!W||W.melee||W.c4||W.tac||W.bomb)return;const quiet=!!W.quiet;this.scare(player.x,player.z,quiet?12:45,true);
    if(W.rocket)return;   // its explosion does the rest (boom below)
    const {o,d}=G.aimRay(),wall=G.wallDist(o,d,90),h=this.ray(o,d,Math.min(90,wall));if(!h)return;
    const dmg=Math.round(W.dmg*(h.head?1.8:1)),ux=d.x,uz=d.z,l=Math.hypot(ux,uz)||1;this.hurt(h.p,dmg,ux/l,uz/l,h.head);this.scare(h.p.x,h.p.z,25,true)},
  boom(x,y,z,r){for(const L of this.lists())for(const p of L){if(p.dead)continue;const dx=p.x-x,dz=p.z-z,d=Math.hypot(dx,dz);if(Math.abs(p.y-y)>r*1.2+2)continue;
      if(d<r*1.1){this.kill(p,dx/(d||1),dz/(d||1));p.kvx=(p.kvx||0)+dx/(d||1)*7;p.kvz=(p.kvz||0)+dz/(d||1)*7}else if(d<r*2.5){p.flee=Math.max(p.flee||0,9);p.moving=true;p.wait=0}}},
  tick(dt){for(const L of this.lists())for(let i=L.length-1;i>=0;i--){const p=L[i];if(!p.dead)continue;p.fallT=Math.max(p.fallT||0,1);p.moving=false;p.deadT=(p.deadT||0)+dt;if(p.deadT>20&&L!==TALKERS)L.splice(i,1);else if(p.deadT>20)L.splice(i,1)}},
  init(){if(this.done||typeof GUN==='undefined'||typeof FX==='undefined')return;this.done=1;const f=GUN.fire;GUN.fire=function(){const n=this.shots;f.apply(this,arguments);if(this.shots!==n){try{GTAP.shot(this)}catch(e){console.warn('[gtaped]',e)}}};
    const ex=FX.explode;FX.explode=function(x,y,z,r){const o=ex.apply(this,arguments);try{if(r>=3)GTAP.boom(x,y,z,r)}catch(e){}return o};
    ANIM.push(dt=>GTAP.tick(dt))}};
addEventListener('load',()=>GTAP.init());GTAP.init();
