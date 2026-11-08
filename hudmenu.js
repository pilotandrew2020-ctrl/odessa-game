// hudmenu.js — NO popovers: every button lives directly on the screen as its own glass tile.
//   top-left row (under "Chykalenka St"): DAY RAIN SNOW FOG QUALITY + MODES · CHAT
//   bottom-left cluster (next to GARAGE/RUN): BAG · EARN · ARMED · FLIGHT · MAP
//   main menu (bMenu) stays in the bottom cluster too — it pauses, it does not pop a list.
// The real buttons are MOVED, not recreated, so every handler and `.on` state other scripts keep still works.
// Scripts that add a button to #topBtns later (Armed, Battle Royale, Hide & Seek, Bag) are picked up by a MutationObserver.
const HUDM = {
  MODES: ['bBR', 'bHS'],
  TOP: ['bTime', 'bRain', 'bSnow', 'bFog', 'bPolish'],
  BOTTOM: ['bBag', 'bJobs', 'bGun', 'bFlight', 'bMap', 'bMenu'],
  KEEP: new Set(),                             // nothing needs "keep the list open": there is no list
  bar: null, rows: null, ready: false,
  css() {
    if (document.getElementById('hudmCss')) return; const st = document.createElement('style'); st.id = 'hudmCss'; st.textContent = `
#topBtns{display:contents}                                  /* the bar itself dissolves into two fixed rows */
#hudmTop,#hudmBottom{position:absolute;z-index:9;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#hudmTop{left:max(14px,env(safe-area-inset-left));top:calc(34px + env(safe-area-inset-top,0px))}
#hudmBottom{left:max(14px,env(safe-area-inset-left));bottom:calc(16px + env(safe-area-inset-bottom,0px));align-items:flex-end}
#hudmTop button,#hudmBottom button{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:9px 14px;border:1.5px solid rgba(255,255,255,.28);border-radius:12px;background:rgba(14,18,26,.42);color:#f3f1ea;font:800 10.5px/1 var(--f-disp);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;-webkit-backdrop-filter:blur(10px) saturate(1.25);backdrop-filter:blur(10px) saturate(1.25);box-shadow:0 4px 14px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.14);transition:background .12s,color .12s,transform .08s;touch-action:manipulation;text-shadow:0 1px 0 rgba(0,0,0,.45)}
#hudmTop button:active,#hudmBottom button:active{transform:scale(.95);background:rgba(255,255,255,.85);color:#0a0a0a}
#hudmTop button.on,#hudmBottom button.on{background:rgba(242,193,78,.92);color:#1b1204;border-color:rgba(255,255,255,.85);text-shadow:none}
@media (hover:hover){#hudmTop button:hover,#hudmBottom button:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.55)}
  #hudmTop button.on:hover,#hudmBottom button.on:hover{background:rgba(242,193,78,.92);color:#1b1204}}
#hudmTop button:focus-visible,#hudmBottom button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#hudmTop #bModes{min-height:40px;font-size:11px;padding:9px 16px}
:is(#hudmTop,#hudmBottom) button::before{content:"";flex:none;width:14px;height:14px;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat}
#hudmTop #bTime{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8'/%3E%3C/svg%3E")}
#hudmTop #bRain{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 15.5a4.5 4.5 0 1 1 1-8.9 5.5 5.5 0 0 1 10.4 2A3.5 3.5 0 0 1 17.5 15.5z'/%3E%3Cpath d='M8.5 18.5l-1 2M12.5 18.5l-1 2M16.5 18.5l-1 2'/%3E%3C/svg%3E")}
#hudmTop #bSnow{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2.5v19M4 7l16 10M20 7L4 17'/%3E%3Cpath d='M9.5 4L12 6.5 14.5 4M9.5 20L12 17.5 14.5 20'/%3E%3C/svg%3E")}
#hudmTop #bFog{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M3 8h13M6 12h15M3 16h12M8 20h11'/%3E%3C/svg%3E")}
#hudmTop #bPolish{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='6.5'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5'/%3E%3C/svg%3E")}
#hudmTop #bModes{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linejoin='round'%3E%3Crect x='3.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='3.5' width='7' height='7' rx='2'/%3E%3Crect x='3.5' y='13.5' width='7' height='7' rx='2'/%3E%3Crect x='13.5' y='13.5' width='7' height='7' rx='2'/%3E%3C/svg%3E")}
#hudmBottom #bMap{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z'/%3E%3Ccircle cx='12' cy='10' r='2.3'/%3E%3C/svg%3E")}
#hudmBottom #bBag{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 8V6a5 5 0 0 1 10 0v2'/%3E%3Crect x='4.5' y='8' width='15' height='13' rx='3'/%3E%3Cpath d='M9 14h6'/%3E%3C/svg%3E")}
#hudmBottom #bGun{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='6.5'/%3E%3Cpath d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5'/%3E%3C/svg%3E")}
#hudmBottom #bJobs{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='8' r='4'/%3E%3Cpath d='M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5'/%3E%3C/svg%3E")}
#hudmBottom #bFlight{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3l3 8 6 3-6 3-3 4-3-4-6-3 6-3z'/%3E%3C/svg%3E")}
#hudmBottom #bMenu{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M4 7h16M4 12h16M4 17h16'/%3E%3C/svg%3E')}
#hudmTop #bModes.on{background:rgba(242,193,78,.92);color:#1b1204}`; document.head.appendChild(st)
  },
  rank(id) { const i = this.TOP.concat(this.BOTTOM).indexOf(id); return i < 0 ? 99 : i },
  // put a top-bar button into its fixed row (the buttons are MOVED, not recreated)
  adopt(btn) {
    if (!btn || btn.tagName !== 'BUTTON' || !this.ready) return; const id = btn.id; if (id === 'bModes') return;
    if (id === 'bMenu') btn.textContent = 'Main menu';
    const row = this.TOP.includes(id) ? this.top : this.bottom; if (!row || btn.parentNode === row) return;
    const r = this.rank(id); let before = null; for (const c of row.querySelectorAll('button')) { if (this.rank(c.id) > r) { before = c; break } }
    row.insertBefore(btn, before)
  },
  init() {
    if (this.ready) return true; const bar = document.getElementById('topBtns'); if (!bar) return false; this.bar = bar; this.css();
    this.top = document.createElement('div'); this.top.id = 'hudmTop'; this.bottom = document.createElement('div'); this.bottom.id = 'hudmBottom'; this.rows = [this.top, this.bottom];
    document.getElementById('hud').appendChild(this.top); document.getElementById('hud').appendChild(this.bottom); this.ready = true;
    // MODES is a plain toggle: pressing it opens the small modes panel that already exists (br / hide&seek buttons live inside it)
    const modes = document.createElement('button'); modes.id = 'bModes'; modes.textContent = 'Modes'; modes.title = 'Game modes: Battle Royale, Hide & Seek';
    modes.onclick = e => {
      e.stopPropagation(); const ids = this.MODES.map(id => document.getElementById(id)).filter(Boolean);
      if (ids.length === 1) { ids[0].click(); return }                       // a single mode: just toggle it
      // two modes: a tiny panel with only the mode buttons themselves
      let p = document.getElementById('modesPanel');
      if (!p) {
        p = document.createElement('div'); p.id = 'modesPanel'; p.hidden = true; p.style.cssText = 'position:absolute;left:max(14px,env(safe-area-inset-left));top:calc(84px + env(safe-area-inset-top,0px));z-index:41;display:flex;flex-direction:column;gap:6px;min-width:170px;padding:8px;border:1.5px solid rgba(255,255,255,.3);border-radius:14px;background:rgba(10,12,16,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)';
        document.getElementById('hud').appendChild(p)
      }
      if (p.hidden) { p.innerHTML = ''; ids.forEach(b => { b.classList.add('mini'); p.appendChild(b) }); p.hidden = false; modes.classList.add('on') }
      else { ids.forEach(b => this.bottom.appendChild(b)); p.hidden = true; modes.classList.remove('on') }
    };
    this.top.appendChild(modes);
    // CHAT lives next to MODES on the top row too (the input itself already opens from T / the chat button)
    const chat = document.createElement('button'); chat.id = 'bChat'; chat.textContent = 'Chat'; chat.title = 'Open chat (T)';
    chat.onclick = () => { if (typeof COOP !== 'undefined' && COOP.openChat) COOP.openChat() };
    this.top.appendChild(chat);
    for (const b of [...bar.children]) if (b.tagName === 'BUTTON') this.adopt(b);
    // buttons that scripts append to the old bar from now on get adopted into the rows
    new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.parentNode === bar) this.adopt(n) }).observe(bar, { childList: true });
    // MODES lights up while a mode is running
    setInterval(() => { const on = this.MODES.some(id => { const b = document.getElementById(id); return b && b.classList.contains('on') }); modes.classList.toggle('on', on) }, 500);
    return true
  }
};
(function () { const go = () => { if (!HUDM.init()) setTimeout(go, 100) }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go() })();
