// diag.js — a "black box" for crashes the browser does not report (iOS Safari silently reloads a tab that uses too much memory).
// While the game is on screen it writes {alive:1, last action, quality, map counters, position} to localStorage every few seconds.
// A normal exit (page hidden, tab closed) writes alive:0. If the next launch finds alive:1, the previous run died unexpectedly,
// and the player gets one toast naming the last thing they did, so a vanishing game stops being a guess.
const DIAG={K:'odesaRun',prev:null,act:'',at:0,shown:false,
  trail:[],
  // keeps the last three steps ("spawn airliner > teleport -4385,-4353 > "Odesa Airport""), newest last
  note(a){a=String(a).slice(0,50);if(this.trail[this.trail.length-1]!==a)this.trail.push(a);if(this.trail.length>3)this.trail.shift();this.act=this.trail.join(' > ');this.at=Date.now()},
  snap(alive){let o={alive,act:this.act,at:this.at,t:Date.now()};
    try{o.q=typeof S!=='undefined'?S.q:'';o.mob=typeof MOBILE!=='undefined'&&MOBILE?1:0;
      if(typeof player!=='undefined'){o.x=Math.round(player.x);o.z=Math.round(player.z)}
      if(typeof renderer!=='undefined'&&renderer&&renderer.info){o.geo=renderer.info.memory.geometries;o.tex=renderer.info.memory.textures}
      if(performance&&performance.memory)o.heap=Math.round(performance.memory.usedJSHeapSize/1e6)}catch(e){}
    return o},
  write(alive){try{localStorage.setItem(this.K,JSON.stringify(this.snap(alive)))}catch(e){}},
  init(){try{const raw=localStorage.getItem(this.K);this.prev=raw?JSON.parse(raw):null}catch(e){this.prev=null}
    this.write(1);
    document.addEventListener('visibilitychange',()=>this.write(document.visibilityState==='visible'?1:0));
    addEventListener('pagehide',()=>this.write(0));
    setInterval(()=>{if(document.visibilityState==='visible')this.write(1)},4000);
    // hook the actions that matter, without touching their code
    const wrap=(name,label)=>{const f=window[name];if(typeof f!=='function'||f.__diag)return;const w=function(){try{DIAG.note(label(arguments))}catch(e){}return f.apply(this,arguments)};w.__diag=1;window[name]=w};
    wrap('teleportRaw',a=>'teleport '+Math.round(a[0])+','+Math.round(a[1]));
    wrap('toast',a=>'"'+String(a[0]).slice(0,40)+'"');
    const cv=document.getElementById('c');if(cv)cv.addEventListener('webglcontextlost',()=>{this.note('WebGL context lost');this.write(1)});
    // tell the player once, after the game has started
    const t=setInterval(()=>{if(this.shown){clearInterval(t);return}if(typeof started==='undefined'||!started)return;this.shown=true;clearInterval(t);this.report()},1500)},
  report(){const p=this.prev;if(!p||p.alive!==1)return;
    // a heartbeat older than a day is a stale record, not a fresh crash
    if(Date.now()-(p.t||0)>864e5)return;
    const info='last: '+(p.act||'start')+' · '+(p.mob?'mobile':'desktop')+' · quality '+(p.q||'?')+(p.geo?' · geo '+p.geo+' tex '+p.tex:'')+(p.heap?' · heap '+p.heap+'MB':'');
    try{console.warn('[diag] previous session ended unexpectedly',p)}catch(e){}
    try{toast('The game closed unexpectedly last time',info)}catch(e){}}
};
(function(){const go=()=>{try{DIAG.init()}catch(e){console.error('diag',e)}};
  // wait until the inline script has defined toast / teleportRaw so the hooks can wrap them
  const wait=()=>{if(typeof teleportRaw==='function'&&typeof toast==='function')go();else setTimeout(wait,200)};
  if(document.readyState==='complete')wait();else addEventListener('load',wait)})();
