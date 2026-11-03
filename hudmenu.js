// hudmenu.js — a calm top bar: only MODES and MENU are always on screen, everything else lives inside them.
//   MODES  → Battle Royale, Hide & Seek (and any later game mode button)
//   MENU   → Map, Day/Night, Rain, Snow, Fog, Armed, Bag and the old "Menu" (pause / main menu)
// The real buttons are MOVED, not recreated, so every handler and every `.on` state that other scripts keep on them still works.
// Scripts that add a button to #topBtns later (Armed, Battle Royale, Hide & Seek, Bag) are picked up by a MutationObserver.
const HUDM={
  MODES:['bBR','bHS'],
  ORDER:['bMap','bTime','bRain','bSnow','bFog','bGun','bBag','bJobs','bFlight','bMenu'],
  KEEP:new Set(['bTime','bRain','bSnow','bFog','bGun','bFlight']),   // toggles keep the list open so you can flip several in a row
  bar:null,pm:null,pn:null,bm:null,bn:null,ready:false,
  css(){if(document.getElementById('hudmCss'))return;const st=document.createElement('style');st.id='hudmCss';st.textContent=`
#topBtns .hmBox{position:relative;display:block}
#topBtns .hmBox>button{width:auto}
#topBtns .hmPop{position:absolute;left:0;top:calc(100% + 7px);z-index:40;display:flex;flex-direction:column;gap:6px;min-width:190px;padding:8px;border:1.5px solid var(--hud-rim,rgba(255,255,255,.3));border-radius:14px;background:rgba(10,12,16,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 14px 32px rgba(0,0,0,.45)}
#topBtns .hmPop[hidden]{display:none}
#topBtns .hmPop button{width:100%;justify-content:flex-start;min-width:0;font-size:11px;padding:10px 12px 10px 10px}
#topBtns .hmPop #bRain,#topBtns .hmPop #bSnow,#topBtns .hmPop #bFog{font-size:11px;padding:10px 12px 10px 10px}
#topBtns .hmPop #bRain::before,#topBtns .hmPop #bSnow::before,#topBtns .hmPop #bFog::before{margin-right:7px;width:13px;height:13px}
#topBtns .hmPop .hmHead{font:800 9px/1 var(--f-disp,inherit);letter-spacing:.14em;text-transform:uppercase;color:#f2c14e;padding:2px 4px 4px}
:is(#bModes,#bHudMenu)::before{content:"";flex:none;width:13px;height:13px;margin-right:7px;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat;filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))}
#bModes{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Crect x='3.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='3.5' y='13.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='13.5' width='7' height='7' rx='2'/%3E%3C/svg%3E")}
#bHudMenu{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 7h16M4 12h16M4 17h16'/%3E%3C/svg%3E")}
#bModes.open,#bHudMenu.open{background:var(--hud-on,#f2c14e);color:#1b1204;border-color:rgba(255,255,255,.85);text-shadow:none}`;document.head.appendChild(st)},
  box(id,label,head){const w=document.createElement('div');w.className='hmBox';const b=document.createElement('button');b.id=id;b.textContent=label;b.setAttribute('aria-haspopup','true');b.setAttribute('aria-expanded','false');
    const p=document.createElement('div');p.className='hmPop';p.hidden=true;const h=document.createElement('div');h.className='hmHead';h.textContent=head;p.appendChild(h);w.append(b,p);return {w,b,p}},
  rank(id){const i=this.ORDER.indexOf(id);return i<0?99:i},
  // put a top-bar button into the list it belongs to (in the fixed order)
  adopt(btn){if(!btn||btn.tagName!=='BUTTON'||!this.ready)return;const id=btn.id;if(id==='bModes'||id==='bHudMenu')return;
    if(id==='bMenu')btn.textContent='Main menu';
    if(this.MODES.includes(id)){if(btn.parentNode!==this.pm)this.pm.appendChild(btn);return}
    if(btn.parentNode===this.pn)return;
    const r=this.rank(id);let before=null;for(const c of this.pn.querySelectorAll('button')){if(this.rank(c.id)>r){before=c;break}}
    this.pn.insertBefore(btn,before)},
  show(which){const m=which==='m';this.pm.hidden=!(which==='modes');this.pn.hidden=!(which==='menu');this.bm.classList.toggle('open',!this.pm.hidden);this.bn.classList.toggle('open',!this.pn.hidden);
    this.bm.setAttribute('aria-expanded',String(!this.pm.hidden));this.bn.setAttribute('aria-expanded',String(!this.pn.hidden))},
  close(){this.show('')},
  init(){if(this.ready)return true;const bar=document.getElementById('topBtns');if(!bar)return false;this.bar=bar;this.css();
    const A=this.box('bModes','Modes','Game modes'),B=this.box('bHudMenu','Menu','Menu');this.bm=A.b;this.pm=A.p;this.bn=B.b;this.pn=B.p;
    bar.insertBefore(B.w,bar.firstChild);bar.insertBefore(A.w,bar.firstChild);this.ready=true;
    A.b.onclick=e=>{e.stopPropagation();this.show(this.pm.hidden?'modes':'')};
    B.b.onclick=e=>{e.stopPropagation();this.show(this.pn.hidden?'menu':'')};
    for(const p of [this.pm,this.pn])p.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!this.KEEP.has(b.id))this.close()});
    document.addEventListener('pointerdown',e=>{if(this.ready&&!e.target.closest('.hmBox'))this.close()},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')this.close()});
    // flight controls: easy (up = climb) or pilot style (up = dive); remembered in the settings
    {const f=document.createElement('button');f.id='bFlight';const lab=()=>{f.textContent='Flight: '+((typeof S!=='undefined'&&S.flyPilot)?'pilot':'easy')};lab();f.title='Flight controls: easy = up climbs, pilot = up dives';
     f.onclick=()=>{if(typeof S==='undefined')return;S.flyPilot=!S.flyPilot;try{if(typeof saveS==='function')saveS()}catch(e){}lab();if(typeof toast==='function')toast('Flight controls',S.flyPilot?'pilot style: stick back = nose up':'easy: up is up, down is down')};bar.appendChild(f)}
    {const j=document.createElement('button');j.id='bJobs';j.textContent='Earn money';j.title='Ways to earn money';j.onclick=()=>{if(typeof JOBS!=='undefined')JOBS.menu()};bar.appendChild(j)}
    for(const b of [...bar.children])if(b.tagName==='BUTTON')this.adopt(b);
    // buttons that scripts append to the bar from now on
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.parentNode===bar)this.adopt(n)}).observe(bar,{childList:true});
    // MODES lights up while a mode is running
    setInterval(()=>{const on=this.MODES.some(id=>{const b=document.getElementById(id);return b&&b.classList.contains('on')});this.bm.classList.toggle('on',on)},500);
    return true}
};
(function(){const go=()=>{if(!HUDM.init())setTimeout(go,100)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go()})();
