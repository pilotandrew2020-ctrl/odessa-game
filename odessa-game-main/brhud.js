/* ===================================================================================================
   brhud.js — the "big match" HUD layer of the Battle Royale (global BRH).  Own artwork, Fortnite-style information:
     compass strip       top-centre, 5° ticks, N / NE / E ... and 15° numbers; markers underneath: the safe circle (purple eye + distance to its
                         edge, pulses when you are in the storm), friends, supply drops, the battle bus
     minimap             the bus route (dashed line + bus arrow) and supply drops are added to BR.mini
     ELIMINATED banner   big name + elimination counter when you take someone out (BOTS.kill → BRH.elim)
     players left        the LEFT counter bumps when it drops; TOP 10 / 5 / 3 / FINAL TWO callouts
     storm phases        BR.msgStorm is replaced by a banner with the phase number, the wait and the damage per second
     free fall           altitude + speed readout, "open glider" prompt (and button on touch), warp-speed lines, field-of-view kick, contrails
   hooks: BR.start → BRH.start · BR.end → BRH.end · BR.tick → BRH.tick · BOTS.kill → BRH.elim
   =================================================================================================== */
const BRH=(()=>{
const st={ui:null,al:-1,sig:'',tr:0,out:0};
const esc=s=>String(s).replace(/[<>&]/g,''),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const FINE=typeof matchMedia==='function'&&matchMedia('(pointer:fine)').matches&&!matchMedia('(pointer:coarse)').matches,NAMES={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};

function build(){if(st.ui)return;const css=document.createElement('style');css.textContent=`
#brComp{position:absolute;left:50%;top:calc(6px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(42vw,400px);height:40px;border-radius:12px;background:linear-gradient(180deg,rgba(10,14,22,.66),rgba(10,14,22,.24));border:1px solid rgba(255,255,255,.13);box-shadow:0 2px 10px rgba(0,0,0,.25)}
#brComp.hide{display:none}
#brElim{position:absolute;left:50%;bottom:34%;transform:translateX(-50%);text-align:center;opacity:0;pointer-events:none;color:#fff;white-space:nowrap}
#brElim.on{animation:brElim 2.7s ease-out}
#brElim small{display:block;font:800 11px var(--f-disp,system-ui);letter-spacing:.42em;color:var(--sun,#f2c14e);text-shadow:0 2px 6px #000}
#brElim b{display:block;font:900 clamp(24px,5.6vw,38px) var(--f-disp,system-ui);letter-spacing:.06em;text-shadow:0 3px 14px #000;margin:2px 0 4px}
#brElim b::after{content:'';display:block;height:3px;margin:3px auto 0;width:70%;background:linear-gradient(90deg,transparent,#ff4a3a,transparent)}
#brElim i{display:inline-block;font:800 11px var(--f-disp,system-ui);font-style:normal;letter-spacing:.14em;padding:3px 10px;border-radius:9px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.25)}
@keyframes brElim{0%{opacity:0;transform:translateX(-50%) scale(.6)}8%{opacity:1;transform:translateX(-50%) scale(1.14)}14%{transform:translateX(-50%) scale(1)}84%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-14px)}}
#brTop .bx.bump{animation:brBump .5s}@keyframes brBump{0%{transform:scale(1)}30%{transform:scale(1.28);filter:brightness(1.8)}100%{transform:scale(1)}}
#brAlt{position:absolute;left:50%;bottom:calc(218px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);text-align:center;color:#fff;opacity:0;transition:opacity .25s;pointer-events:none}#brAlt.on{opacity:1}
#brAlt b{font:900 clamp(26px,5.4vw,40px) var(--f-disp,system-ui);text-shadow:0 3px 14px #000;letter-spacing:.03em}#brAlt b small{font-size:.38em;margin-left:5px;letter-spacing:.2em;color:var(--sun,#f2c14e)}
#brAlt em{display:block;font:800 10px var(--f-disp,system-ui);font-style:normal;letter-spacing:.3em;text-shadow:0 2px 6px #000;opacity:.85;margin-top:-4px}
#brSpd{position:absolute;inset:-25%;pointer-events:none;opacity:0;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,255,255,0) 0 2.2deg,rgba(255,255,255,.7) 2.2deg 2.7deg,rgba(255,255,255,0) 2.7deg 5.3deg,rgba(255,255,255,.35) 5.3deg 5.5deg,rgba(255,255,255,0) 5.5deg 9deg);-webkit-mask-image:radial-gradient(circle at 50% 50%,transparent 30%,#000 82%);mask-image:radial-gradient(circle at 50% 50%,transparent 30%,#000 82%);animation:brWarp .9s linear infinite}
@keyframes brWarp{from{transform:rotate(0) scale(1)}50%{transform:rotate(2deg) scale(1.06)}to{transform:rotate(0) scale(1)}}`;
  document.head.appendChild(css);
  const h=BR.ui.root,mk=(tag,id,html)=>{const e=document.createElement(tag);e.id=id;if(html)e.innerHTML=html;h.appendChild(e);return e};
  const spd=mk('div','brSpd'),cv=mk('canvas','brComp'),elim=mk('div','brElim'),alt=mk('div','brAlt','<b><i id="brAltN">0</i><small>M</small></b><em id="brAltS"></em>');
  h.insertBefore(spd,h.firstChild);
  st.ui={spd,cv,cx:cv.getContext('2d'),elim,alt,altN:alt.querySelector('#brAltN'),altS:alt.querySelector('#brAltS')}}

// ---------------------------------------------------------------- compass
const brg=(x,z)=>Math.atan2(x-player.x,-(z-player.z))*57.29578,dst=(x,z)=>Math.hypot(x-player.x,z-player.z);
function marks(){const M=[],px=player.x,pz=player.z;
  const t=BR.zn||BR.zc;if(t&&BR.phase!=='dead'&&BR.phase!=='won'){const d=Math.max(0,dst(t.x,t.z)-t.r);M.push({k:'eye',b:brg(t.x,t.z),d,out:!BR.inZone(px,pz)})}
  if(BR.phase==='bus'||BR.phase==='sky'){if(BR.bus&&BR.phase==='bus'){/* the bus carries me: nothing to point at */}}
  else if(typeof COOP!=='undefined')for(const R of BR.mates()){const x=R.has?R.x:R.st.x,z=R.has?R.z:R.st.z;if(typeof x==='number')M.push({k:'mate',b:brg(x,z),d:dst(x,z)})}
  if(typeof BRDROP!=='undefined')for(const q of BRDROP.list())if(!q.opened)M.push({k:'drop',b:brg(q.x,q.z),d:dst(q.x,q.z)});
  return M}
function compass(){const u=st.ui,cv=u.cv;const W=cv.clientWidth|0,H=cv.clientHeight|0;if(!W)return;
  const hd=(((Math.PI-cam.yaw)*57.29578)%360+360)%360,M=marks(),sig=Math.round(hd*3)+'|'+M.map(m=>m.k+Math.round(m.b)+'/'+Math.round(m.d/5)+(m.out?'o':'')).join(',')+(st.out?'!':'');
  const pulse=M.some(m=>m.out)?Math.floor(performance.now()/300)%2:0;if(sig+pulse===st.sig)return;st.sig=sig+pulse;
  const d=Math.min(2,devicePixelRatio||1);if(cv.width!==W*d||cv.height!==H*d){cv.width=W*d;cv.height=H*d}
  const c=u.cx;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);const span=150,ppd=W/span,X=b=>W/2+(((b-hd+540)%360)-180)*ppd;
  c.textAlign='center';c.textBaseline='middle';
  for(let b=0;b<360;b+=5){const x=X(b);if(x<-12||x>W+12)continue;const big=b%15===0,card=b%45===0;
    c.strokeStyle=card?'#fff':big?'rgba(255,255,255,.75)':'rgba(255,255,255,.4)';c.lineWidth=card?2:1;c.beginPath();c.moveTo(x,card?17:19);c.lineTo(x,card?25:big?24:22);c.stroke();
    if(big){const nm=NAMES[b];c.font=(nm?'900 ':'700 ')+(nm&&b%90===0?13:nm?10:9)+'px system-ui,Arial';c.fillStyle=b===0?'#ff6a55':nm?'#fff':'rgba(255,255,255,.7)';c.fillText(nm||String(b),x,9)}}
  // markers (row 2): clamped to the strip edges, with the distance next to them
  for(const m of M){let x=X(m.b),edge=false;if(x<14){x=14;edge=true}else if(x>W-14){x=W-14;edge=true}const y=33;
    c.save();c.translate(x,y);
    if(m.k==='eye'){const col=m.out?(pulse?'#ff5a4a':'#ff9a8a'):'#c79bff';c.strokeStyle=col;c.fillStyle=col;c.lineWidth=1.6;c.beginPath();c.ellipse(0,0,6.5,4,0,0,7);c.stroke();c.beginPath();c.arc(0,0,2.1,0,7);c.fill()}
    else if(m.k==='mate'){c.fillStyle='#ff4fa3';c.strokeStyle='#fff';c.lineWidth=1.4;c.beginPath();c.arc(0,0,4,0,7);c.fill();c.stroke()}
    else if(m.k==='drop'){c.fillStyle='#4aa3ff';c.strokeStyle='#fff';c.lineWidth=1.4;c.fillRect(-4,-4,8,8);c.strokeRect(-4,-4,8,8)}
    c.font='800 8.5px system-ui,Arial';c.fillStyle='#fff';c.globalAlpha=.9;const lab=m.k==='eye'&&m.d<1?'IN':Math.round(m.d)+'m';c.textAlign=edge&&x>W/2?'right':'left';c.fillText(lab,edge&&x>W/2?-9:9,.5);c.restore()}
  // fade the strip out at both ends
  c.globalCompositeOperation='destination-in';const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.14,'rgba(0,0,0,1)');g.addColorStop(.86,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';
  // the centre caret + exact heading
  c.fillStyle='#f2c14e';c.beginPath();c.moveTo(W/2-5,0);c.lineTo(W/2+5,0);c.lineTo(W/2,6);c.closePath();c.fill()}

// ---------------------------------------------------------------- minimap: the bus route and the supply drops (the context is already rotated to the camera)
const mini0=BR.mini;
BR.mini=function(x,R,scale){mini0.call(this,x,R,scale);
  x.save();
  if(this.bus&&(this.phase==='bus'||this.phase==='sky')){const b=this.bus,ax=(b.x0-player.x)*scale,az=(b.z0-player.z)*scale,bx=(b.x0+b.dx*b.L-player.x)*scale,bz=(b.z0+b.dz*b.L-player.z)*scale;
    x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=2;x.setLineDash([7,6]);x.beginPath();x.moveTo(ax,az);x.lineTo(bx,bz);x.stroke();x.setLineDash([]);
    const p=this.busPos(),px=(p.x-player.x)*scale,pz=(p.z-player.z)*scale;x.translate(px,pz);x.rotate(Math.atan2(-b.dx,b.dz)+Math.PI);   // arrow points along the route
    x.fillStyle='#f2c14e';x.strokeStyle='#0b1b22';x.lineWidth=2.5;x.beginPath();x.moveTo(0,-10);x.lineTo(7,8);x.lineTo(0,4);x.lineTo(-7,8);x.closePath();x.fill();x.stroke()}
  x.restore();
  if(typeof BRDROP!=='undefined'){x.save();for(const q of BRDROP.list()){if(q.opened)continue;let px=(q.x-player.x)*scale,pz=(q.z-player.z)*scale;const l=Math.hypot(px,pz);if(l>R-10){px*=(R-10)/l;pz*=(R-10)/l}
    x.save();x.translate(px,pz);x.rotate(-(cam.yaw+Math.PI));x.fillStyle='#4aa3ff';x.strokeStyle='#fff';x.lineWidth=2;x.fillRect(-7,-7,14,14);x.strokeRect(-7,-7,14,14);x.fillStyle='#fff';x.fillRect(-1.2,-4,2.4,5);x.fillRect(-1.2,2,2.4,2.4);x.restore()}x.restore()}}

// ---------------------------------------------------------------- the ELIMINATED banner
function elim(name){const u=st.ui;if(!u){BR.msg('Eliminated '+name);return}
  u.elim.innerHTML='<small>ELIMINATED</small><b>'+esc(name)+'</b><i>'+BR.kills+' ELIM'+(BR.kills>1?'S':'')+'</i>';u.elim.classList.remove('on');void u.elim.offsetWidth;u.elim.classList.add('on');clearTimeout(st.elT);st.elT=setTimeout(()=>u.elim.classList.remove('on'),2800)}

// ---------------------------------------------------------------- storm phase banner
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
BR.msgStorm=function(){const i=Math.max(0,this.sp),P=BR_STORM[Math.min(i,BR_STORM.length-1)];this.banner('STORM '+(i+1)+' OF '+BR_STORM.length,'New safe zone · closes in '+fmt(P.wait)+' · '+P.dmg+' damage / s outside',3.6);this.snd('glide')};

// ---------------------------------------------------------------- per frame
function bump(){const b=document.getElementById('brAl');const bx=b&&b.parentElement;if(!bx)return;bx.classList.remove('bump');void bx.offsetWidth;bx.classList.add('bump')}
function tick(dt){const u=st.ui;if(!u||!BR.on)return;const ph=BR.phase,alive=ph!=='dead'&&ph!=='won';
  u.cv.classList.toggle('hide',!alive);if(alive)compass();
  // players left
  const al=BR.alive();if(al!==st.al){if(st.al>=0&&al<st.al&&alive){bump();for(const [t,a,b] of [[10,'TOP 10','Ten players left'],[5,'TOP 5','Five left — stay inside the circle'],[3,'TOP 3','Three left'],[2,'FINAL TWO','One more and the crown is yours']])if(st.al>t&&al<=t){BR.banner(a,b,2.4);break}}st.al=al}
  // free fall
  const fall=ph==='sky';
  if(fall){const g=groundAt(player.x,player.z,player.y+3),agl=Math.max(0,player.y-g),sp=Math.max(0,-player.vy),free=!BR.gl;
    u.alt.classList.add('on');u.altN.textContent=Math.round(agl);u.altS.textContent=free?'FREE FALL · '+Math.round(sp*3.6)+' KM/H':'GLIDING';
    u.spd.style.opacity=free?clamp((sp-24)/36,0,.62):0;
    const j=BR.ui.jump;if(free){j.hidden=false;j.textContent=FINE?'OPEN GLIDER · SPACE':'OPEN GLIDER'}else if(j.textContent.startsWith('OPEN GLIDER'))j.hidden=true;
    if(free){FX.shakeT=Math.max(FX.shakeT||0,.05);FX.shakeA=Math.max(FX.shakeA||0,.006+.01*clamp((sp-30)/30,0,1));
      st.tr-=dt;if(st.tr<=0){st.tr=.04;FX.init();const s=Math.sin(player.yaw),c=Math.cos(player.yaw);for(const k of [-1,1])FX.puff({x:player.x+c*k*.55,y:player.y+.5,z:player.z-s*k*.55,vx:0,vy:3,vz:0,s0:.1,s1:.7,life:.7,c0:[1,1,1],c1:[.82,.9,1],op:.38,add:false,drag:1,grow:1})}}}
  else{u.alt.classList.remove('on');u.spd.style.opacity=0;if(ph==='play'&&BR.ui.jump.textContent.startsWith('OPEN GLIDER')){BR.ui.jump.hidden=true;BR.ui.jump.textContent='JUMP'}}}
function start(){if(!BR.ui)return;build();st.al=-1;st.sig='';st.ui.elim.classList.remove('on');st.ui.alt.classList.remove('on');st.ui.spd.style.opacity=0}
function end(){if(!st.ui)return;st.ui.cv.classList.add('hide');st.ui.alt.classList.remove('on');st.ui.spd.style.opacity=0;st.ui.elim.classList.remove('on')}
return {start,end,tick,elim,compass}})();
