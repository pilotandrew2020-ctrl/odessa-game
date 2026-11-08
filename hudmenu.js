// hudmenu.js — compact HUD for the iPad: NO big popovers anywhere.
//   top-left stack under "Chykalenka St" (tiny tiles, half the old padding/font):
//     MODES · DAY · RAIN · SNOW · FOG · QUALITY · ARMED · EARN · FLIGHT
//   right side under the mini-map / Home line: MAP · CHAT · BAG as icon tiles (index.html #quickRow,
//     wired to the same buttons so every handler and `.on` state other scripts keep still works).
// The real buttons are MOVED, not recreated, so every handler and every `.on` state that other
// scripts keep on them still works. Late-added buttons (Armed, Battle Royale, Bag…) are adopted
// by a MutationObserver.
const HUDM={
  MODES:['bBR','bHS'],
  TOP:['bModes','bTime','bRain','bSnow','bFog','bPolish','bGun','bJobs','bFlight'],
  RIGHT:['bMap','bBag'],                      // these two live in #quickRow (icons only)
  KEEP:new Set(),                             // nothing needs "keep the list open": there is no list
  bar:null,stack:null,ready:false,
  css(){if(document.getElementById('hudmCss'))return;const st=document.createElement('style');st.id='hudmCss';st.textContent=`
#topBtns{display:contents}   /* the old bar/popovers are gone: hudmenu.js places a compact tile stack */
#hudmStack{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(64px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:4px;z-index:9}
#hudmStack button{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid rgba(255,255,255,.3);border-radius:9px;background:rgba(14,18,26,.38);color:#f3f1ea;font:800 7.5px/1.6 var(--f-disp);letter-spacing:.09em;text-transform:uppercase;white-space:nowrap;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 2px 8px rgba(0,0,0,.3);touch-action:manipulation;text-shadow:0 1px 0 rgba(0,0,0,.4)}
#hudmStack button::before{content:"";flex:none;width:9px;height:9px;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat}
#hudmStack button.on{background:rgba(242,193,78,.9);color:#17120a}
#hudmStack button:active{transform:scale(.94);background:rgba(255,255,255,.85);color:#0a0a0a}
#hudmStack #bModes{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Crect x='3.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='3.5' y='13.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='13.5' width='7' height='7' rx='2'/%3E%3C/svg%3E")}
#hudmStack #bTime{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E")}
#hudmStack #bRain{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 15.5a4.5 4.5 0 1 1 1-8.9 5.5 5.5 0 0 1 10.4 2A3.5 3.5 0 0 1 17.5 15.5z'/%3E%3C/svg%3E")}
#hudmStack #bSnow{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 2.5v19M4 7l16 10M20 7L4 17'/%3E%3C/svg%3E")}
#hudmStack #bFog{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M3 8h13M6 12h15M3 16h12M8 20h11'/%3E%3C/svg%3E")}
#hudmStack #bPolish{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='6.5'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5'/%3E%3C/svg%3E")}
#hudmStack #bGun{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='6.5'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5'/%3E%3C/svg%3E")}
#hudmStack #bJobs{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5'/%3E%3C/svg%3E")}
#hudmStack #bFlight{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3l3 8 6 3-6 3-3 4-3-4-6-3 6-3z'/%3E%3C/svg%3E')}
#hudmStack #bModes.on,#hudmStack #bGun.on{background:rgba(242,193,78,.9);color:#17120a}`;document.head.appendChild(st)},
  rank(id){const i=this.TOP.indexOf(id);return i<0?99:i},
  // put a bar button into its place: top-left stack or the right-side quick row (buttons are MOVED, not recreated)
  adopt(btn){if(!btn||btn.tagName!=='BUTTON'||!this.ready)return;const id=btn.id;if(id==='bModes')return;
    if(id==='bMenu')btn.textContent='Main menu';
    if(this.RIGHT.includes(id)){const row=document.getElementById('quickRow');const anchor={bMap:'qrMap',bBag:'qrBag'}[id];
      const slot=anchor&&document.getElementById(anchor);
      if(slot){slot.style.display='none';if(btn.parentNode!==row){btn.classList.add('qrBtn');row.replaceChild(btn,slot)}btn.id=id}   // keep the real id
      return}
    if(btn.parentNode===this.stack)return;
    const r=this.rank(id);let before=null;for(const c of this.stack.querySelectorAll('button')){if(this.rank(c.id)>r){before=c;break}}
    this.stack.insertBefore(btn,before)},
  init(){if(this.ready)return true;const bar=document.getElementById('topBtns');if(!bar)return false;this.bar=bar;this.css();
    this.stack=document.createElement('div');this.stack.id='hudmStack';
    document.getElementById('hud').appendChild(this.stack);this.ready=true;
    // MODES: one live mode -> just toggle it; two -> a tiny panel with only the mode buttons
    const modes=document.createElement('button');modes.id='bModes';modes.textContent='Modes';modes.title='Game modes: Battle Royale, Hide & Seek';
    modes.onclick=e=>{e.stopPropagation();const ids=this.MODES.map(id=>document.getElementById(id)).filter(Boolean);
      if(ids.length===1){ids[0].click();return}
      let p=document.getElementById('modesPanel');
      if(!p){p=document.createElement('div');p.id='modesPanel';p.hidden=true;p.style.cssText='position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(84px + env(safe-area-inset-top,0px));z-index:41;display:flex;flex-direction:column;gap:6px;min-width:150px;padding:8px;border:1.5px solid rgba(255,255,255,.3);border-radius:14px;background:rgba(10,12,16,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)';
        document.getElementById('hud').appendChild(p)}
      if(p.hidden){p.innerHTML='';ids.forEach(b=>{b.classList.add('mini');p.appendChild(b)});p.hidden=false;modes.classList.add('on')}
      else{ids.forEach(b=>this.stack.appendChild(b));p.hidden=true;modes.classList.remove('on')}};
    this.stack.appendChild(modes);
    for(const b of [...bar.children])if(b.tagName==='BUTTON')this.adopt(b);
    // buttons that scripts append to the old bar from now on get adopted too
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.parentNode===bar)this.adopt(n)}).observe(bar,{childList:true});
    // MODES lights up while a mode is running
    setInterval(()=>{const on=this.MODES.some(id=>{const b=document.getElementById(id);return b&&b.classList.contains('on')});modes.classList.toggle('on',on)},500);
    return true}
};
(function(){const go=()=>{if(!HUDM.init())setTimeout(go,100)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go()})();
