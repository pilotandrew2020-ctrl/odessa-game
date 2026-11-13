// phone.js — the in-game smartphone (rewritten 2026-11-12). English only. It slides up from the bottom edge with a spring when you take it out, and has:
//   Music   a library of saved links (every YouTube link pasted anywhere, the speaker panel included, is saved here with its title and thumbnail), a now-playing screen with a seek bar in
//           seconds (YouTube IFrame messages: currentTime / duration), -10 s / +10 s, previous / next, shuffle, repeat, volume. Playback itself is the speaker's (SPK), so friends still hear it.
//   Phone   keypad, contacts and recents; a call rings, connects, runs a timer and talks (speech synthesis). "Taxi" really brings your car.
//   Snake   swipe / arrow keys / on-screen pad, best score kept.
//   News, Clock, Bank.
// PHONE.init() (boot), PHONE.toggle() (the Phone button), PHONE.tick(dt) every frame, PHONE.open (read by the co-op state). Everything is built here; index.html only keeps the old #gtPhone markup, removed on init.
const PHONE={
  open:false,t:0,screen:'home',root:null,
  news:'Patch notes: Battle Royale mode, online modes, the Bowling club, a redrawn Tairove map, new character bodies (Steve, MrBeast, Halo, Leon, Ghost, Walter) and a phone with music, calls and Snake.',
  CONTACTS:[
    {n:'Mom',e:'👩',num:'+380 48 700 11 22',say:['Hello sweetheart! Are you eating properly?','Come over for dinner tonight, I made borscht!','Put on a hat, it is cold outside!']},
    {n:'Misha',e:'🧸',num:'+380 67 555 01 01',say:['Hey, I am right behind you!','Want to go to the beach? I will bring snacks.']},
    {n:'Taxi',e:'🚕',num:'+380 48 777 77 77',act:'car',say:['Taxi Odesa, one moment... Your car is on its way to you.']},
    {n:'Pizza Odesa',e:'🍕',num:'+380 48 202 02 02',say:['Pizza Odesa! Your order will be ready in fifteen minutes.','Sorry, we are out of pineapple. Pepperoni?']},
    {n:'Captain Petrenko',e:'⚓',num:'+380 48 333 44 55',say:['Port control. All the ships are in the harbour today.','The sea is calm, perfect weather for a swim!']},
    {n:'Police',e:'🚓',num:'102',say:['Police. What is your emergency? ... Stay calm, someone is on the way.']}],
  lib:[],cur:-1,pos:0,dur:0,pstate:-1,shuffle:false,repeat:false,vol:70,paused:false,
  call:null,recents:[],dial:'',snake:null,
  // ---------------------------------------------------------------------------------------------------- setup
  init(){
    try{this.lib=JSON.parse(localStorage.getItem('odessa_phone_lib')||'[]').filter(t=>t&&typeof t.url==='string')}catch(e){this.lib=[]}
    try{this.recents=JSON.parse(localStorage.getItem('odessa_phone_recents')||'[]')}catch(e){this.recents=[]}
    const old=document.getElementById('gtPhone');if(old)old.remove();
    this.css();this.build();
    let b=document.getElementById('bPhone');if(!b){b=document.createElement('button');b.id='bPhone';b.type='button';b.innerHTML='<i>📱</i><span>Phone</span>';document.body.appendChild(b)}
    b.onclick=()=>this.toggle();
    // quick-row tile mic/phone: the tile clicks the real (hidden) button, its .on state mirrors the button's
    const mk=(tid,real)=>{const t=document.getElementById(tid),rb=document.getElementById(real);if(!t||!rb)return;
      t.onclick=e=>{e.stopPropagation();rb.click()};
      new MutationObserver(()=>t.classList.toggle('on',rb.classList.contains('on'))).observe(rb,{attributes:true,attributeFilter:['class']})};
    mk('qrPhone','bPhone');mk('qrMic','bVoice');
    addEventListener('message',e=>this.onMessage(e));
    addEventListener('keydown',e=>{if(!this.open)return;if(e.code==='Escape'){this.toggle();e.stopPropagation();return}
      if(this.screen==='snake'&&this.snake){const d={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]}[e.code];if(d){this.snakeDir(d[0],d[1]);e.preventDefault();e.stopImmediatePropagation()}}},true);
    // every link played in the speaker panel is saved to the library (YouTube links keep their title and thumbnail)
    if(typeof SPK!=='undefined'&&SPK&&SPK.playLink&&!SPK._phoneHook){SPK._phoneHook=1;const o=SPK.playLink.bind(SPK);SPK.playLink=raw=>{o(raw);const t=this.save(raw);if(t){this.cur=this.lib.indexOf(t);this.pos=0;this.dur=t.dur||0;this.paused=false}}}
    this.ui()
  },
  css(){if(document.getElementById('phnCss'))return;const s=document.createElement('style');s.id='phnCss';s.textContent=`
#phn{position:fixed;z-index:52;right:max(14px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));width:min(300px,86vw);height:min(612px,calc(100vh - 28px));border-radius:38px;padding:9px;background:linear-gradient(145deg,#2b3038,#0b0d10);box-shadow:0 30px 70px rgba(0,0,0,.65),inset 0 0 0 1.5px rgba(255,255,255,.14),inset 0 0 0 4px #000;transform:translateY(112%) rotate(7deg) scale(.92);transform-origin:80% 100%;opacity:0;pointer-events:none;transition:transform .62s cubic-bezier(.18,1.25,.32,1),opacity .25s ease;font:500 13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#f4f1ea;-webkit-user-select:none;user-select:none;touch-action:manipulation}
#phn.show{transform:translateY(0) rotate(0) scale(1);opacity:1;pointer-events:auto}
#phn.hide{transition:transform .38s cubic-bezier(.5,0,.9,.4),opacity .3s ease}
@media (orientation:portrait){#phn{right:50%;margin-right:calc(min(300px,86vw)/-2)}}
#phn .scr{position:relative;width:100%;height:100%;border-radius:30px;overflow:hidden;background:radial-gradient(120% 90% at 20% 0%,#2a4a6b 0%,#162235 45%,#0c1320 100%);display:flex;flex-direction:column}
#phn .notch{position:absolute;top:8px;left:50%;width:84px;height:22px;margin-left:-42px;border-radius:14px;background:#000;z-index:5}
#phn .bar{display:flex;justify-content:space-between;padding:11px 22px 4px;font:700 12px system-ui;z-index:4;flex:none}
#phn .body{flex:1;min-height:0;position:relative;overflow:hidden}
#phn .pg{position:absolute;inset:0;display:flex;flex-direction:column;animation:phnIn .32s cubic-bezier(.2,.9,.3,1);overflow:hidden}
@keyframes phnIn{from{opacity:0;transform:translateX(26px) scale(.98)}to{opacity:1;transform:none}}
#phn .home{position:relative;flex:none;height:34px;margin-top:-6px;display:flex;justify-content:center;align-items:center;touch-action:none;cursor:grab}#phn .home i{width:116px;height:5px;border-radius:3px;background:rgba(255,255,255,.7);box-shadow:0 0 10px rgba(255,255,255,.25);transition:width .15s,background .15s}#phn .home:active i{width:140px;background:#fff}
#phn h2{margin:2px 16px 8px;font:800 22px system-ui;letter-spacing:-.3px}
#phn .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 6px;padding:8px 14px}
#phn .app{display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:none;color:inherit;font:600 11px system-ui;cursor:pointer}
#phn .app i{width:54px;height:54px;border-radius:15px;display:grid;place-items:center;font-size:27px;font-style:normal;box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.35);transition:transform .15s}
#phn .app:active i{transform:scale(.9)}
#phn .wid{margin:6px 14px 4px;padding:14px 16px;border-radius:20px;background:rgba(255,255,255,.1);}#phn .wid b{display:block;font:300 44px/1 system-ui;letter-spacing:-1px}#phn .wid span{opacity:.75}
#phn .lst{flex:1;overflow:auto;padding:0 10px 8px;-webkit-overflow-scrolling:touch}
#phn .row{display:flex;align-items:center;gap:10px;padding:8px 8px;border-radius:14px;cursor:pointer}#phn .row:active,#phn .row.on{background:rgba(255,255,255,.12)}
#phn .row img,#phn .row .av{width:48px;height:48px;border-radius:10px;object-fit:cover;background:#26364d;display:grid;place-items:center;font-size:24px;flex:none}
#phn .row .t{flex:1;min-width:0}#phn .row .t b{display:block;font:650 13px system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#phn .row .t span{opacity:.65;font-size:11px}
#phn .x{border:0;background:none;color:#fff;opacity:.5;font-size:16px;padding:6px;cursor:pointer}
#phn .btn{border:0;border-radius:14px;padding:10px 14px;background:#38e4d0;color:#04252b;font:800 13px system-ui;cursor:pointer}#phn .btn.g{background:rgba(255,255,255,.14);color:#fff}
#phn .add{display:flex;gap:6px;padding:0 12px 8px}#phn .add input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(0,0,0,.28);color:#fff;font:14px system-ui;padding:9px 11px;-webkit-user-select:text;user-select:text}
#phn .mini{display:flex;align-items:center;gap:10px;margin:0 10px 6px;padding:7px 10px;border-radius:16px;background:rgba(255,255,255,.18);cursor:pointer}#phn .mini img{width:38px;height:38px;border-radius:8px;object-fit:cover}#phn .mini b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:650 12px system-ui}
#phn .np{align-items:center;padding:0 18px 6px;text-align:center}#phn .cover{width:min(178px,56%);aspect-ratio:1;border-radius:20px;object-fit:cover;background:#26364d;box-shadow:0 18px 40px rgba(0,0,0,.5);margin:6px 0 10px;transition:transform .4s cubic-bezier(.2,1.3,.4,1)}#phn .cover.pl{transform:scale(1.04)}
#phn .np h3{margin:0;font:800 16px/1.2 system-ui;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}#phn .np small{opacity:.65}
#phn input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:rgba(255,255,255,.22);outline:none;margin:10px 0 2px}#phn input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#38e4d0;box-shadow:0 0 0 4px rgba(56,228,208,.25)}
#phn .tm{display:flex;justify-content:space-between;width:100%;font-size:11px;opacity:.75;font-variant-numeric:tabular-nums}
#phn .ctl{display:flex;justify-content:center;align-items:center;gap:10px;margin:8px 0}#phn .ctl button{width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:16px;cursor:pointer}#phn .ctl .pp{width:58px;height:58px;background:#38e4d0;color:#04252b;font-size:22px}#phn .ctl .on{background:rgba(56,228,208,.45)}
#phn .pad{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:6px 24px}#phn .pad button{height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.13);color:#fff;font:600 20px system-ui;cursor:pointer}#phn .pad button small{display:block;font-size:8px;letter-spacing:2px;opacity:.6;margin-top:-4px}
#phn .num{min-height:38px;text-align:center;font:300 28px/38px system-ui;letter-spacing:1px}
#phn .tabs{display:flex;gap:6px;padding:0 12px 8px}#phn .tabs button{flex:1;border:0;border-radius:11px;padding:7px 0;background:rgba(255,255,255,.1);color:#fff;font:700 12px system-ui;cursor:pointer}#phn .tabs .on{background:#38e4d0;color:#04252b}
#phn .calling{align-items:center;justify-content:space-between;padding:34px 20px 22px;text-align:center;background:linear-gradient(#17314d,#0b1220)}
#phn .ring{position:relative;width:104px;height:104px;border-radius:50%;background:#26364d;display:grid;place-items:center;font-size:52px;margin:12px 0}#phn .ring:before,#phn .ring:after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid rgba(56,228,208,.65);animation:phnRing 1.6s infinite ease-out}#phn .ring:after{animation-delay:.8s}#phn .ring.live:before,#phn .ring.live:after{border-color:rgba(98,214,125,.6)}
@keyframes phnRing{from{transform:scale(1);opacity:.9}to{transform:scale(1.7);opacity:0}}
#phn .end{width:62px;height:62px;border-radius:50%;border:0;background:#e5484d;color:#fff;font-size:26px;cursor:pointer}
#phn canvas.sn{display:block;margin:4px auto;border-radius:14px;background:#0d1b12;touch-action:none}
#phn .dp{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,46px);gap:6px;justify-content:center;margin:6px 0}#phn .dp button{border:0;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer}
#phn .kv{display:flex;justify-content:space-between;padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.12)}
#phn .pad2{padding:0 16px;overflow:auto}#phn .pad2 p{margin:6px 0 10px;line-height:1.5}
`;document.head.appendChild(s)},
  build(){if(document.getElementById('phn'))return;const d=document.createElement('div');d.id='phn';d.setAttribute('role','dialog');d.setAttribute('aria-label','Phone');
    d.innerHTML='<div class="scr"><div class="notch"></div><div class="bar"><span id="phnClk">12:00</span><span style="margin-right:2px">▮▮▮ 84%</span></div><div class="body" id="phnBody"></div><div class="home"><i id="phnHome" title="Home"></i></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a){e.stopPropagation();this.act(a.dataset.a,a.dataset.v,a)}});
    d.addEventListener('keydown',e=>{e.stopPropagation()});d.addEventListener('pointerdown',e=>e.stopPropagation());d.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});d.addEventListener('wheel',e=>e.stopPropagation());
    // the home bar works like an iPhone's: drag it up and the phone follows your finger and leaves (release past ~70 px or with a flick); a tap on it goes back to the home screen
    const hm=d.querySelector('.home');let y0=0,dy=0,t0=0,drag=false;
    hm.addEventListener('pointerdown',e=>{drag=true;y0=e.clientY;t0=performance.now();dy=0;try{hm.setPointerCapture(e.pointerId)}catch(x){}d.style.transition='none';e.preventDefault()});
    hm.addEventListener('pointermove',e=>{if(!drag)return;dy=Math.min(0,e.clientY-y0);d.style.transform='translateY('+dy+'px) scale('+(1+dy/2600)+')';d.style.opacity=String(Math.max(.25,1+dy/520))});
    const end=()=>{if(!drag)return;drag=false;const v=-dy/Math.max(1,performance.now()-t0);d.style.transition='';d.style.transform='';d.style.opacity='';
      if(dy<-70||(dy<-26&&v>.45))this.toggle();else if(Math.abs(dy)<6&&this.screen!=='home')this.go('home')};
    hm.addEventListener('pointerup',end);hm.addEventListener('pointercancel',end);
    this.go('home')},
  // ---------------------------------------------------------------------------------------------------- open / close / frame
  toggle(){this.open=!this.open;const d=document.getElementById('phn');if(!d)return;
    if(this.open){d.classList.remove('hide');void d.offsetWidth;d.classList.add('show');if(!this._hint){this._hint=1;try{if(!localStorage.getItem('odessa_phone_hint')){localStorage.setItem('odessa_phone_hint','1');if(typeof toast==='function')toast('Phone','Drag the bar at the bottom up to put it away')}}catch(e){}}this.go(this.screen==='calling'?'calling':'home');if(typeof AUD!=='undefined'&&AUD&&AUD.menuUi)try{AUD.menuUi('clk')}catch(e){}}
    else{d.classList.add('hide');d.classList.remove('show');this.snakeStop()}
    this.ui();if(typeof COOP!=='undefined')COOP.push(true)},
  ui(){const b=document.getElementById('bPhone');if(b){b.classList.toggle('on',this.open);b.setAttribute('aria-pressed',String(this.open));b.setAttribute('aria-label',this.open?'Put phone away':'Open phone')}},
  tick(dt){if(!this.open)return;this._c=(this._c||0)-dt;if(this._c>0)return;this._c=1;const c=document.getElementById('phnClk');if(c)c.textContent=this.time();
    if(this.screen==='clock')this.go('clock',true)},
  time(s){return new Intl.DateTimeFormat('en-GB',s?{hour:'2-digit',minute:'2-digit',second:'2-digit'}:{hour:'2-digit',minute:'2-digit'}).format(new Date())},
  esc(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
  // ---------------------------------------------------------------------------------------------------- screens
  go(name,quiet){this.screen=name;const b=document.getElementById('phnBody');if(!b)return;if(name!=='snake')this.snakeStop();
    const e=this.esc,H={
      home:()=>`<div class="pg"><div class="wid"><b>${this.time()}</b><span>${new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</span></div>
        <div class="grid">${[['phone','📞','#3fb950','Phone'],['music','🎵','#e5484d','Music'],['snake','🐍','#2f9e5a','Snake'],['news','📰','#3b82f6','News'],['clock','🕐','#6b7280','Clock'],['bank','🏦','#d99a1d','Bank']].map(a=>`<button class="app" data-a="open" data-v="${a[0]}"><i style="background:${a[2]}">${a[1]}</i>${a[3]}</button>`).join('')}</div>
        ${this.cur>=0&&this.lib[this.cur]?`<div class="mini" data-a="open" data-v="np"><img src="${e(this.lib[this.cur].thumb||'')}" alt="" onerror="this.style.visibility='hidden'"><b>${e(this.lib[this.cur].title)}</b><span>${this.paused?'▶':'⏸'}</span></div>`:''}</div>`,
      music:()=>`<div class="pg"><h2>Music</h2><div class="add"><input id="phnUrl" type="url" inputmode="url" placeholder="Paste a YouTube link" autocomplete="off"><button class="btn" data-a="addlink">Save</button></div>
        <div class="lst"><div class="row" data-a="fm"><div class="av">📻</div><div class="t"><b>Odesa FM</b><span>${typeof BGM!=='undefined'&&BGM.on?'On · soft lo-fi while you explore (pauses for your music)':'Off'}</span></div><span>${typeof BGM!=='undefined'&&BGM.on?'⏸':'▶'}</span></div>${this.lib.length?this.lib.map((t,i)=>`<div class="row${i===this.cur?' on':''}" data-a="play" data-v="${i}"><img src="${e(t.thumb||'')}" alt="" onerror="this.style.visibility='hidden'"><div class="t"><b>${e(t.title)}</b><span>${t.kind==='youtube'?'YouTube':e(t.kind)}${t.dur?' · '+this.mmss(t.dur):''}</span></div><button class="x" data-a="del" data-v="${i}" aria-label="Remove">✕</button></div>`).join(''):'<p style="opacity:.7;padding:8px 10px">No songs yet. Paste a YouTube link above, or play one from the speaker: it is saved here automatically.</p>'}</div>
        ${this.cur>=0&&this.lib[this.cur]?`<div class="mini" data-a="open" data-v="np"><img src="${e(this.lib[this.cur].thumb||'')}" alt="" onerror="this.style.visibility='hidden'"><b>${e(this.lib[this.cur].title)}</b><span>${this.paused?'▶':'⏸'}</span></div>`:''}</div>`,
      np:()=>{const t=this.lib[this.cur]||{title:'Nothing playing',thumb:'',kind:''},yt=t.kind==='youtube';return `<div class="pg np"><div style="align-self:stretch;text-align:left"><button class="x" data-a="open" data-v="music" style="opacity:.85;font-size:13px">‹ Library</button></div>
        <img class="cover${this.paused?'':' pl'}" id="phnCover" src="${e(t.thumb||'')}" alt="" onerror="this.style.visibility='hidden'"><h3>${e(t.title)}</h3><small>${t.kind==='youtube'?'YouTube':e(t.kind||'')}</small>
        ${yt?`<input id="phnSeek" type="range" min="0" max="${Math.max(1,Math.floor(this.dur||t.dur||1))}" step="1" value="${Math.floor(this.pos)}" aria-label="Seek"><div class="tm"><span id="phnPos">${this.mmss(this.pos)}</span><span id="phnDur">${this.dur||t.dur?this.mmss(this.dur||t.dur):'--:--'}</span></div>`:'<div style="opacity:.6;font-size:11px;margin:10px 0">This service has no seek bar here: use its own player in the speaker panel.</div>'}
        <div class="ctl"><button data-a="shuf" class="${this.shuffle?'on':''}" title="Shuffle">🔀</button><button data-a="prev" title="Previous">⏮</button><button data-a="back10" title="Back 10 s">⏪</button><button class="pp" data-a="pp" id="phnPP">${this.paused?'▶':'⏸'}</button><button data-a="fwd10" title="Forward 10 s">⏩</button><button data-a="next" title="Next">⏭</button><button data-a="rep" class="${this.repeat?'on':''}" title="Repeat">🔁</button></div>
        <div style="width:100%;display:flex;align-items:center;gap:8px;font-size:14px">🔈<input id="phnVol" type="range" min="0" max="100" value="${this.vol}" aria-label="Volume">🔊</div></div>`},
      phone:()=>`<div class="pg"><h2>Phone</h2><div class="tabs">${['keypad','contacts','recents'].map(k=>`<button data-a="tab" data-v="${k}" class="${(this.tab||'keypad')===k?'on':''}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div>${this.phoneTab()}</div>`,
      calling:()=>{const c=this.call||{n:'?',e:'📞'};return `<div class="pg calling"><div><div style="opacity:.7">${c.live?'Connected':'Calling…'}</div><div style="font:800 22px system-ui;margin-top:4px">${e(c.n)}</div><div id="phnCallT" style="opacity:.75">${c.live?this.mmss(c.sec||0):e(c.num||'')}</div></div><div class="ring${c.live?' live':''}">${c.e}</div>
        <div style="display:flex;gap:18px;align-items:center"><button class="btn g" data-a="mute" style="border-radius:50%;width:50px;height:50px;padding:0">🔇</button><button class="end" data-a="hang" aria-label="End call">📞</button><button class="btn g" data-a="spkr" style="border-radius:50%;width:50px;height:50px;padding:0">🔊</button></div></div>`},
      snake:()=>`<div class="pg"><h2>Snake</h2><div style="text-align:center;font-size:12px;opacity:.8">Score <b id="phnSc">0</b> · Best <b id="phnBest">${+localStorage.getItem('odessa_snake_best')||0}</b></div><canvas class="sn" id="phnSn" width="256" height="256"></canvas>
        <div class="dp"><span></span><button data-a="sd" data-v="0,-1">▲</button><span></span><button data-a="sd" data-v="-1,0">◀</button><button data-a="sd" data-v="0,1">▼</button><button data-a="sd" data-v="1,0">▶</button></div></div>`,
      news:()=>`<div class="pg"><h2>News</h2><div class="pad2"><p><b style="color:#38e4d0">PATCH NOTES</b></p><p>${e(this.news)}</p></div></div>`,
      clock:()=>`<div class="pg"><h2>Clock</h2><div class="pad2"><div class="wid"><b>${this.time(1)}</b><span>${new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}</span></div>${typeof S!=='undefined'?`<div class="kv"><span>Season</span><b>${e(S.season||'')}</b></div><div class="kv"><span>Time of day</span><b>${e(S.time||'')}</b></div>`:''}</div></div>`,
      bank:()=>`<div class="pg"><h2>Bank</h2><div class="pad2"><div class="wid"><span>Balance</span><b>${typeof WALLET!=='undefined'?e(WALLET.fmt()):'₴0'}</b></div></div></div>`};
    if(quiet&&name==='clock'){const w=b.querySelector('.wid b');if(w){w.textContent=this.time(1);return}}
    b.innerHTML=(H[name]||H.home)();
    if(name==='snake')this.snakeStart();
    if(name==='np'){const s=document.getElementById('phnSeek'),v=document.getElementById('phnVol');
      if(s){s.oninput=()=>{document.getElementById('phnPos').textContent=this.mmss(+s.value);this._drag=1};s.onchange=()=>{this._drag=0;this.seek(+s.value)}}
      if(v)v.oninput=()=>{this.vol=+v.value;if(typeof SPK!=='undefined')SPK.mediaCommand('setVolume',[this.vol])}}
    if(name==='music'||name==='phone'){const u=document.getElementById('phnUrl');if(u)u.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();this.act('addlink')}})}},
  mmss(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')},
  phoneTab(){const e=this.esc,t=this.tab||'keypad';
    if(t==='contacts')return '<div class="lst">'+this.CONTACTS.map((c,i)=>`<div class="row" data-a="callc" data-v="${i}"><div class="av">${c.e}</div><div class="t"><b>${e(c.n)}</b><span>${e(c.num)}</span></div><span>📞</span></div>`).join('')+'</div>';
    if(t==='recents')return '<div class="lst">'+(this.recents.length?this.recents.map((r,i)=>`<div class="row" data-a="callr" data-v="${i}"><div class="av">${r.e||'📞'}</div><div class="t"><b>${e(r.n)}</b><span>${e(r.when||'')}${r.sec?' · '+this.mmss(r.sec):''}</span></div><span>📞</span></div>`).join(''):'<p style="opacity:.7;padding:8px 10px">No calls yet.</p>')+'</div>';
    const keys=[['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['*',''],['0','+'],['#','']];
    return `<div class="num" id="phnNum">${e(this.dial)||'&nbsp;'}</div><div class="pad">${keys.map(k=>`<button data-a="key" data-v="${k[0]}">${k[0]}${k[1]?`<small>${k[1]}</small>`:''}</button>`).join('')}</div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:8px"><button class="btn" data-a="calln" style="background:#3fb950;color:#fff;border-radius:50%;width:54px;height:54px;padding:0;font-size:22px">📞</button><button class="btn g" data-a="del1" style="border-radius:50%;width:54px;height:54px;padding:0">⌫</button></div>`},
  act(a,v){
    if(a==='open'){this.go(v);return}
    if(a==='tab'){this.tab=v;this.go('phone');return}
    if(a==='key'){if(this.dial.length<16)this.dial+=v;const n=document.getElementById('phnNum');if(n)n.textContent=this.dial;this.dtmf(v);return}
    if(a==='del1'){this.dial=this.dial.slice(0,-1);const n=document.getElementById('phnNum');if(n)n.innerHTML=this.esc(this.dial)||'&nbsp;';return}
    if(a==='calln'){if(!this.dial)return;const k=this.CONTACTS.find(c=>c.num.replace(/\D/g,'')===this.dial.replace(/\D/g,''));this.startCall(k||{n:this.dial,e:'📞',num:this.dial,say:['Hello? ... Sorry, wrong number!','The number you have dialled does not exist.']});return}
    if(a==='callc'){this.startCall(this.CONTACTS[+v]);return}
    if(a==='callr'){const r=this.recents[+v];if(r)this.startCall(this.CONTACTS.find(c=>c.n===r.n)||r);return}
    if(a==='hang'){this.endCall();return}
    if(a==='mute'||a==='spkr'){return}
    if(a==='addlink'){const i=document.getElementById('phnUrl');if(!i)return;const t=this.save(i.value);if(t){i.value='';this.go('music')}else toast('Not a valid link','paste a public https link');return}
    if(a==='fm'){if(typeof BGM!=='undefined')BGM.toggle();this.go('music');return}
    if(a==='del'){const i=+v,t=this.lib[i];if(!t)return;this.lib.splice(i,1);if(this.cur===i)this.cur=-1;else if(this.cur>i)this.cur--;this.persist();this.go('music');return}
    if(a==='play'){this.playIndex(+v);this.go('np');return}
    if(a==='pp'){this.pauseResume();return}
    if(a==='next'){this.next();return}if(a==='prev'){this.prev();return}
    if(a==='back10'){this.seek(this.pos-10);return}if(a==='fwd10'){this.seek(this.pos+10);return}
    if(a==='shuf'){this.shuffle=!this.shuffle;this.go('np');return}if(a==='rep'){this.repeat=!this.repeat;this.go('np');return}
    if(a==='sd'){const [x,y]=String(v).split(',').map(Number);this.snakeDir(x,y);return}
  },
  // ---------------------------------------------------------------------------------------------------- music library and playback (through the speaker, SPK)
  persist(){try{localStorage.setItem('odessa_phone_lib',JSON.stringify(this.lib.slice(0,200)))}catch(e){}},
  save(raw){if(typeof SPK==='undefined'||!SPK)return null;const m=SPK.parseLink(raw);if(!m)return null;let t=this.lib.find(x=>x.url===m.url);if(t)return t;
    t={url:m.url,kind:m.kind,id:m.id,title:m.kind==='youtube'?'YouTube · '+m.id:new URL(m.url).hostname,thumb:m.kind==='youtube'?'https://i.ytimg.com/vi/'+m.id+'/mqdefault.jpg':'',dur:0,at:Date.now()};
    this.lib.unshift(t);this.persist();if(m.kind==='youtube')this.fetchTitle(t);if(this.screen==='music')this.go('music');return t},
  async fetchTitle(t){const tryUrl=async u=>{const c=new AbortController(),to=setTimeout(()=>c.abort(),5000);try{const r=await fetch(u,{signal:c.signal});if(!r.ok)return null;return await r.json()}catch(e){return null}finally{clearTimeout(to)}};
    const j=await tryUrl('https://noembed.com/embed?url='+encodeURIComponent(t.url))||await tryUrl('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(t.url));
    if(j&&j.title){t.title=String(j.title).slice(0,120);if(j.thumbnail_url&&/^https:/.test(j.thumbnail_url))t.thumb=j.thumbnail_url;this.persist();if(this.screen==='music'||this.screen==='np'||this.screen==='home')this.go(this.screen,false)}},
  playIndex(i){const t=this.lib[i];if(!t||typeof SPK==='undefined')return;this.cur=i;this.pos=0;this.dur=t.dur||0;this.paused=false;this._ended=0;SPK.playLink(t.url)},   // SPK.playLink saves the link (already there) and starts the embed
  pauseResume(){if(this.cur<0||typeof SPK==='undefined')return;if(!SPK.media){this.playIndex(this.cur);return}
    if(this.paused){this.paused=false;SPK.playing=true;SPK.mediaOffset=this.pos;SPK.mediaT0=SPK.mediaStamp=Date.now();SPK.mediaCommand('playVideo',[])}
    else{this.paused=true;SPK.playing=false;SPK.mediaOffset=this.pos;SPK.mediaStamp=Date.now();SPK.mediaCommand('pauseVideo',[])}
    if(typeof COOP!=='undefined')COOP.push(true);const b=document.getElementById('phnPP');if(b)b.textContent=this.paused?'▶':'⏸';const c=document.getElementById('phnCover');if(c)c.classList.toggle('pl',!this.paused)},
  seek(sec){if(this.cur<0||typeof SPK==='undefined'||!SPK.media)return;sec=Math.max(0,Math.min(this.dur||1e9,sec));this.pos=sec;SPK.mediaOffset=sec;SPK.mediaT0=SPK.mediaStamp=Date.now();SPK.mediaCommand('seekTo',[sec,true]);
    const s=document.getElementById('phnSeek');if(s)s.value=Math.floor(sec);const p=document.getElementById('phnPos');if(p)p.textContent=this.mmss(sec);if(typeof COOP!=='undefined')COOP.push(true)},
  next(){if(!this.lib.length)return;let i=this.cur;if(this.shuffle&&this.lib.length>1){do{i=(Math.random()*this.lib.length)|0}while(i===this.cur)}else i=(this.cur+1)%this.lib.length;this.playIndex(i);if(this.screen==='np')this.go('np')},
  prev(){if(!this.lib.length)return;if(this.pos>4){this.seek(0);return}this.playIndex((this.cur-1+this.lib.length)%this.lib.length);if(this.screen==='np')this.go('np')},
  // YouTube IFrame messages (the embed was asked to `listen` in showMedia): current time, duration, state (0 = ended)
  onMessage(e){if(e.origin!=='https://www.youtube.com')return;let d=e.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(x){return}}
    if(!d||d.event!=='infoDelivery'||!d.info)return;const f=d.info,t=this.lib[this.cur];
    if(Number.isFinite(f.duration)&&f.duration>0){this.dur=f.duration;if(t&&t.dur!==Math.floor(f.duration)){t.dur=Math.floor(f.duration);this.persist()}}
    if(Number.isFinite(f.currentTime)&&!this._drag)this.pos=f.currentTime;
    if(f.playerState!==undefined){this.pstate=f.playerState;if(f.playerState===1&&this.paused){this.paused=false}
      if(f.playerState===0&&!this._ended){this._ended=1;if(this.repeat)this.seek(0),SPK.mediaCommand('playVideo',[]);else this.next()}else if(f.playerState===1)this._ended=0}
    if(this.screen==='np'){const s=document.getElementById('phnSeek');if(s&&!this._drag){const m=Math.max(1,Math.floor(this.dur||1));if(+s.max!==m)s.max=m;s.value=Math.floor(this.pos)}
      const p=document.getElementById('phnPos');if(p&&!this._drag)p.textContent=this.mmss(this.pos);const du=document.getElementById('phnDur');if(du&&this.dur)du.textContent=this.mmss(this.dur)}},
  // ---------------------------------------------------------------------------------------------------- calls
  tone(f,dur,v){try{if(typeof AUD==='undefined'||!AUD||!AUD.ok||!AUD.ctx)return;const c=AUD.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(v||.06,c.currentTime+.01);g.gain.setValueAtTime(v||.06,c.currentTime+dur-.02);g.gain.linearRampToValueAtTime(0,c.currentTime+dur);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+dur+.02)}catch(e){}},
  dtmf(k){const r=['1','2','3','4','5','6','7','8','9','*','0','#'].indexOf(k);if(r<0)return;this.tone(697+[0,0,0,1,1,1,2,2,2,3,3,3][r]*72,.09,.04);this.tone(1209+(r%3)*132,.09,.04)},
  startCall(c){if(!c||this.call)return;this.call={n:c.n,e:c.e||'📞',num:c.num||'',say:c.say||[],act:c.act,live:false,sec:0};this.go('calling');let n=0;
    this._ring=setInterval(()=>{if(!this.call||this.call.live){clearInterval(this._ring);return}n++;this.tone(425,.9,.05);if(n>=3){clearInterval(this._ring);this.answer()}},1500);this.tone(425,.9,.05)},
  answer(){const c=this.call;if(!c)return;c.live=true;c.sec=0;this.go('calling');
    this._tm=setInterval(()=>{if(!this.call){clearInterval(this._tm);return}this.call.sec++;const e=document.getElementById('phnCallT');if(e)e.textContent=this.mmss(this.call.sec)},1000);
    const line=c.say&&c.say.length?c.say[(Math.random()*c.say.length)|0]:'Hello?';
    try{if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(line);u.lang='en-GB';u.rate=1;u.pitch=c.n==='Mom'?1.25:c.n==='Police'?.8:1;speechSynthesis.cancel();speechSynthesis.speak(u)}}catch(e){}
    if(typeof toast==='function')toast(c.n,line.slice(0,70));
    if(c.act==='car'&&typeof EXT!=='undefined'){try{EXT.summon('gtr')}catch(e){}}},
  endCall(){clearInterval(this._ring);clearInterval(this._tm);try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch(e){}
    const c=this.call;this.call=null;if(c){this.recents.unshift({n:c.n,e:c.e,num:c.num,say:c.say,when:new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date()),sec:c.live?c.sec:0});this.recents=this.recents.slice(0,20);try{localStorage.setItem('odessa_phone_recents',JSON.stringify(this.recents))}catch(e){}}
    this.go('phone')},
  // ---------------------------------------------------------------------------------------------------- Snake
  snakeStart(){const cv=document.getElementById('phnSn');if(!cv)return;const N=16,C=cv.width/N,g=cv.getContext('2d');
    const s=this.snake={N,C,g,cv,body:[[8,8],[7,8],[6,8]],dir:[1,0],next:[1,0],food:[12,8],score:0,over:false,best:+localStorage.getItem('odessa_snake_best')||0,speed:140};
    const place=()=>{do{s.food=[(Math.random()*N)|0,(Math.random()*N)|0]}while(s.body.some(b=>b[0]===s.food[0]&&b[1]===s.food[1]))};
    const draw=()=>{g.fillStyle='#0d1b12';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='rgba(255,255,255,.04)';for(let i=0;i<N;i++)for(let j=0;j<N;j++)if((i+j)%2)g.fillRect(i*C,j*C,C,C);
      g.fillStyle='#38e4d0';g.beginPath();g.arc(s.food[0]*C+C/2,s.food[1]*C+C/2,C/2-2,0,7);g.fill();
      s.body.forEach((b,i)=>{g.fillStyle=i?'#3fb950':'#7ee787';g.fillRect(b[0]*C+1,b[1]*C+1,C-2,C-2)});
      if(s.over){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,cv.width,cv.height);g.fillStyle='#fff';g.font='700 22px system-ui';g.textAlign='center';g.fillText('Game over',cv.width/2,cv.height/2-4);g.font='13px system-ui';g.fillText('tap to play again',cv.width/2,cv.height/2+20)}};
    const step=()=>{if(s.over)return;s.dir=s.next;const h=[s.body[0][0]+s.dir[0],s.body[0][1]+s.dir[1]];
      if(h[0]<0||h[1]<0||h[0]>=N||h[1]>=N||s.body.some(b=>b[0]===h[0]&&b[1]===h[1])){s.over=true;if(s.score>s.best){s.best=s.score;localStorage.setItem('odessa_snake_best',s.best)}const be=document.getElementById('phnBest');if(be)be.textContent=s.best;draw();return}
      s.body.unshift(h);if(h[0]===s.food[0]&&h[1]===s.food[1]){s.score++;place();s.speed=Math.max(70,140-s.score*4);clearInterval(this._sn);this._sn=setInterval(step,s.speed);const sc=document.getElementById('phnSc');if(sc)sc.textContent=s.score}else s.body.pop();draw()};
    s.step=step;s.draw=draw;draw();this._sn=setInterval(step,s.speed);
    let tx=0,ty=0;cv.addEventListener('pointerdown',e=>{if(s.over){this.snakeStop();this.go('snake');return}tx=e.clientX;ty=e.clientY});
    cv.addEventListener('pointerup',e=>{const dx=e.clientX-tx,dy=e.clientY-ty;if(Math.max(Math.abs(dx),Math.abs(dy))<14)return;if(Math.abs(dx)>Math.abs(dy))this.snakeDir(dx>0?1:-1,0);else this.snakeDir(0,dy>0?1:-1)})},
  snakeDir(x,y){const s=this.snake;if(!s||s.over)return;if(s.dir[0]+x===0&&s.dir[1]+y===0)return;s.next=[x,y]},
  snakeStop(){clearInterval(this._sn);this._sn=null;this.snake=null}
};
