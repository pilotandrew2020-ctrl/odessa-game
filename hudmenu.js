// hudmenu.js — compact HUD for the iPad: NO big popovers anywhere.
//   top-left stack under "Chykalenka St" (tiny tiles, half the old padding/font):
//     MODES · DAY · RAIN · SNOW · FOG · QUALITY · ARMED · EARN · FLIGHT
//   right side under the mini-map / Home line: MAP · CHAT · BAG as icon tiles (index.html #quickRow,
//     wired to the same buttons so every handler and `.on` state other scripts keep still works).
// The real buttons are MOVED, not recreated, so every handler and every `.on` state that other
// scripts keep on them still works. Late-added buttons (Armed, Battle Royale, Bag…) are adopted
// by a MutationObserver.
const HUDM={
  // user request 2026-11-09: Battle Royale + Hide & Seek stay OUT of the left stack (they live behind Modes);
  // the Modes button alone is row 3.
  MODES:['bBR','bHS','bJetRace'],            // registered mode buttons (adopted behind the Modes panel)
  ROW1:['bModes','bTime','bRain','bSnow'],
  ROW2:['bFog','bGun','bPolish','bMenu'],
  ROW3:[],                                   // BR / HS / JetRace are NOT adopted into the stack any more
  RIGHT:['bMap','bChat','bBag'],              // these live in #quickRow (icon proxies)
  KEEP:new Set(),                             // nothing needs "keep the list open": there is no list
  bar:null,rows:null,ready:false,
  css(){if(document.getElementById('hudmCss'))return;const st=document.createElement('style');st.id='hudmCss';st.textContent=`
#topBtns{display:contents}   /* the old bar/popovers are gone: hudmenu.js places a compact tile stack */
#hudmStack{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(10px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:5px;z-index:9;max-width:88vw}
/* the Modes menu: Battle Royale / Hide & Seek / Jet Ski Rider live here, opened by the Modes tile, right under the tile stack */
#modesPanel{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(120px + env(safe-area-inset-top,0px));z-index:41;display:flex;flex-direction:column;gap:5px;min-width:200px;padding:8px;border:1.5px solid rgba(255,255,255,.3);border-radius:14px;background:rgba(10,12,16,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#modesPanel[hidden]{display:none}
#modesPanel button{position:relative;display:block;width:100%;min-height:42px;border:0;border-left:3px solid var(--sun);border-radius:6px;background:rgba(0,0,0,.55);color:#e9e6dc;padding:12px 16px 12px 12px;font:700 11px/1 var(--f-disp);letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;text-align:left;touch-action:manipulation;clip-path:none}
#modesPanel button.on{background:var(--sun);color:#111}
#modesPanel button:active{background:#fff;color:#0a0a0a}
#hudmStack .hmRow{display:flex;gap:4px}
/* square Garage-style tiles: icon on top, tiny label under it, 48x48 like #actBtns>button */
#hudmStack button{position:relative;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:48px;height:48px;padding:0;border:1.5px solid rgba(255,255,255,.75);border-radius:13px;background:rgba(0,0,0,.56);color:#e9e6dc;font:800 7px/1 var(--f-disp);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:0 3px 10px rgba(0,0,0,.34);touch-action:manipulation;text-shadow:0 1px 0 rgba(0,0,0,.4);overflow:hidden}
#hudmStack button::before{content:"";flex:none;width:21px;height:21px;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat}
#hudmStack button::after{content:"";position:absolute;left:7px;top:6px;width:6px;height:6px;border-radius:50%;background:var(--sun);box-shadow:0 0 0 2px rgba(10,16,30,.85);opacity:0;transition:opacity .12s}
#hudmStack button.on::after{opacity:1}
#hudmStack button.on{background:rgba(242,193,78,.9);color:#17120a}
#hudmStack button:active{transform:scale(.94);background:rgba(255,255,255,.85);color:#0a0a0a}
@media (max-height:430px){#hudmStack button{width:44px;height:44px}}
#hudmStack #bModes{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Crect x='3.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='3.5' y='13.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='13.5' width='7' height='7' rx='2'/%3E%3C/svg%3E")}
#hudmStack #bTime{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/svg%3E")}
#hudmStack #bRain{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 15.5a4.5 4.5 0 1 1 1-8.9 5.5 5.5 0 0 1 10.4 2A3.5 3.5 0 0 1 17.5 15.5z'/%3E%3C/svg%3E")}
#hudmStack #bSnow{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12 2.5v19M4 7l16 10M20 7L4 17'/%3E%3C/svg%3E")}
#hudmStack #bFog{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M3 8h13M6 12h15M3 16h12M8 20h11'/%3E%3C/svg%3E")}
#hudmStack #bPolish{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='6.5'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5'/%3E%3C/svg%3E")}
#hudmStack #bGun{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='6.5'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5'/%3E%3C/svg%3E")}
#hudmStack #bJobs{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5'/%3E%3C/svg%3E")}
#hudmStack #bFlight{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3l3 8 6 3-6 3-3 4-3-4-6-3 6-3z'/%3E%3C/svg%3E")}
#hudmStack button.on,#hudmStack button:active{background:rgba(242,193,78,.9);color:#17120a}`;document.head.appendChild(st)},
  rank(id){const i=this.ROW1.concat(this.ROW2,this.ROW3).indexOf(id);return i<0?99:i},
  // put a bar button into its fixed row / right quick row (buttons are MOVED, not recreated)
  adopt(btn){if(!btn||btn.tagName!=='BUTTON'||!this.ready)return;const id=btn.id;if(id==='bModes')return;
    if(this.MODES.includes(id)){if(btn.parentNode!==this.panel)this.panel.appendChild(btn);return}     // Battle Royale / Hide & Seek / Jet Ski Rider: only inside the Modes menu
    if(id==='bMenu'){btn.textContent='MENU'}
    if(this.RIGHT.includes(id)){const row=document.getElementById('quickRow');const anchor={bMap:'qrMap',bBag:'qrBag',bChat:'qrChat'}[id];
      const slot=anchor&&document.getElementById(anchor);
      if(slot){const tile=document.createElement('button');tile.type='button';tile.innerHTML=slot.innerHTML;tile.title=btn.title;tile.dataset.for=id;tile.onclick=()=>btn.click();slot.parentNode.replaceChild(tile,slot);slot.style.display='none'}   // an icon proxy keeps its place; the REAL button stays adopted by the scripts that own it
      btn.classList.add('qrMirror');btn.style.display='none';   // the row tile is the visible copy; the real button keeps its id + handlers
      return}
    if(!this.ROW1.includes(id)&&!this.ROW2.includes(id)&&!this.ROW3.includes(id))return;   // BR / Hide & Seek / JetRace: behind Modes only
    const row=this.ROW1.includes(id)?this.rows[0]:this.ROW2.includes(id)?this.rows[1]:this.ROW3.includes(id)?this.rows[2]:null;
    if(!row||btn.parentNode===row||btn.classList.contains('qrMirror'))return;   // qrMirror = hidden proxy, its tile lives in #quickRow
    const r=this.rank(id);let before=null;for(const c of row.querySelectorAll('button')){if(this.rank(c.id)>r){before=c;break}}
    row.insertBefore(btn,before)},
  init(){if(this.ready)return true;const bar=document.getElementById('topBtns');if(!bar)return false;this.bar=bar;this.css();
    this.stack=document.createElement('div');this.stack.id='hudmStack';
    this.rows=[0,1,2].map(()=>{const r=document.createElement('div');r.className='hmRow';this.stack.appendChild(r);return r});
    document.getElementById('hud').appendChild(this.stack);this.ready=true;
    // MODES: one live mode -> just toggle it; two -> a tiny panel with only the mode buttons
    const modes=document.createElement('button');modes.id='bModes';modes.textContent='Modes';modes.title='Game modes: Battle Royale, Hide & Seek';
    const panel=this.panel=document.createElement('div');panel.id='modesPanel';panel.hidden=true;document.getElementById('hud').appendChild(panel);
    modes.onclick=e=>{e.stopPropagation();panel.hidden=!panel.hidden;modes.classList.toggle('on',!panel.hidden)};
    panel.addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>{panel.hidden=true},0)});     // choosing a mode closes the menu
    document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!modes.contains(e.target))panel.hidden=true},true);     // a tap anywhere else closes it
    this.rows[0].appendChild(modes);
    {const qb=document.createElement('button');qb.id='bPolish';this.syncPolish=()=>{qb.textContent='GFX '+(typeof S!=='undefined'&&S.polish==='max'?'MAX':'LITE')};this.syncPolish();qb.title='Visual polish: Lite / Max';qb.textContent='GFX LITE';qb.onclick=()=>{if(typeof S==='undefined')return;S.polish=S.polish==='max'?'lite':'max';try{if(typeof saveS==='function')saveS()}catch(e){}this.syncPolish();if(typeof applyTime==='function')applyTime()};bar.appendChild(qb)}
    for(const b of [...bar.children])if(b.tagName==='BUTTON')this.adopt(b);
    // buttons appended by scripts (bVoice, bPhone, mode buttons…): the mic and phone move into the right quick row as tiles,
    // the mode buttons are adopted by the Modes panel through adopt() (they return false there), so nothing else needed.
    // buttons that scripts append to the old bar from now on get adopted too
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1&&n.parentNode===bar)this.adopt(n)}).observe(bar,{childList:true});
    // MODES lights up while a mode is running
    setInterval(()=>{const on=this.MODES.some(id=>{const b=document.getElementById(id);return b&&b.classList.contains('on')});modes.classList.toggle('on',on||!this.panel.hidden)},500);
    return true}
};
(function(){const go=()=>{if(!HUDM.init())setTimeout(go,100)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go);else go()})();
