// speaker.js — the look and the live state of the speaker player (the panel that opens from the Speaker button; 2026-11-13).
// The panel's markup is in index.html (ids kept: SPK wires spkPlay / spkNext / spkPrev / spkVol / spkLoad / spkUrl / spkList / spkStream / spkName / spkClose / spkCarry / spkFile itself),
// its CSS is in theme.css. This file adds what a good player has: a cover (the track's thumbnail), the title, an equalizer that moves while it plays, a seek bar with times, -10 s / +10 s,
// shuffle / repeat, and the list of saved links (the phone's music library). Links go through PHONE (it reads the YouTube embed's time / duration), built-in tracks and your mp3s through SPK.
const SPKUI={t:0,key:'',
  init(){if(this._i)return;this._i=1;const $=id=>document.getElementById(id);if(!$('spk')||typeof SPK==='undefined')return;
    const linked=()=>typeof PHONE!=='undefined'&&SPK.media&&PHONE.lib[PHONE.cur]&&PHONE.lib[PHONE.cur].url===SPK.media.url;   // the playing link is the phone's current track
    $('spkPlay').onclick=()=>{if(linked())PHONE.pauseResume();else SPK.togglePlay();this.tick(true)};
    $('spkNext').onclick=()=>{if(SPK.media&&typeof PHONE!=='undefined'&&PHONE.lib.length)PHONE.next();else SPK.next();this.tick(true)};
    $('spkPrev').onclick=()=>{if(SPK.media&&typeof PHONE!=='undefined'&&PHONE.lib.length)PHONE.prev();else SPK.prev();this.tick(true)};
    const jump=d=>{if(linked())PHONE.seek(PHONE.pos+d);else if(SPK.el&&Number.isFinite(SPK.el.duration))SPK.el.currentTime=Math.max(0,Math.min(SPK.el.duration,SPK.el.currentTime+d))};
    $('spkBack').onclick=()=>jump(-10);$('spkFwd').onclick=()=>jump(10);
    $('spkShuf').onclick=()=>{if(typeof PHONE!=='undefined')PHONE.shuffle=!PHONE.shuffle;this.tick(true)};$('spkRep').onclick=()=>{if(typeof PHONE!=='undefined')PHONE.repeat=!PHONE.repeat;this.tick(true)};
    const sk=$('spkSeek');sk.addEventListener('input',()=>{if(typeof PHONE!=='undefined')PHONE._drag=1;$('spkPos').textContent=this.mmss(+sk.value)});
    sk.addEventListener('change',()=>{const v=+sk.value;if(linked())PHONE.seek(v);else if(SPK.el&&Number.isFinite(SPK.el.duration))SPK.el.currentTime=v;if(typeof PHONE!=='undefined')PHONE._drag=0});
    $('spkLib').addEventListener('click',e=>{const r=e.target.closest('[data-i]');if(r&&typeof PHONE!=='undefined')PHONE.playIndex(+r.dataset.i)});
    for(const id of ['spkSeek','spkVol'])$(id).addEventListener('keydown',e=>e.stopPropagation());
    setInterval(()=>{if(!$('spk').hidden)this.tick()},250)},
  mmss(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')},
  esc(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
  tick(force){const $=id=>document.getElementById(id),P=typeof PHONE!=='undefined'?PHONE:null,link=!!SPK.media,own=link&&P&&P.lib[P.cur]&&P.lib[P.cur].url===SPK.media.url?P.lib[P.cur]:null;
    const playing=!!SPK.playing,all=SPK.all?SPK.all():[],tr=all[SPK.idx];
    let title='Nothing playing',sub='Paste a link or pick a track',thumb='';
    if(link){title=own?own.title:'Shared link';sub=(SPK.media.kind||'').toUpperCase()+' · '+(()=>{try{return new URL(SPK.media.url).hostname.replace(/^www\./,'')}catch(e){return ''}})();thumb=own?own.thumb:(SPK.media.kind==='youtube'?'https://i.ytimg.com/vi/'+SPK.media.id+'/mqdefault.jpg':'')}
    else if(playing&&tr){title=tr.name;sub=tr.kind==='file'?'Your track':'Built-in beat'}
    const key=[title,sub,thumb,playing,P&&P.shuffle,P&&P.repeat,P&&P.lib.length,P&&P.cur].join('|');
    if(force||key!==this.key){this.key=key;$('spkTitle').textContent=title;$('spkSub').textContent=sub;const im=$('spkImg');if(thumb){if(im.getAttribute('src')!==thumb)im.src=thumb;im.hidden=false;im.onerror=()=>{im.hidden=true}}else{im.hidden=true}
      $('spkCover').classList.toggle('pl',playing);$('spkPlay').textContent=playing?'⏸':'▶';$('spkShuf').classList.toggle('on',!!(P&&P.shuffle));$('spkRep').classList.toggle('on',!!(P&&P.repeat));
      const L=$('spkLib');if(P){L.innerHTML=P.lib.length?P.lib.slice(0,30).map((t,i)=>`<button class="spkRow${own&&own===t?' cur':''}" data-i="${i}">${t.thumb?`<img src="${this.esc(t.thumb)}" alt="" onerror="this.style.visibility='hidden'">`:'<i>♪</i>'}<span><b>${this.esc(t.title)}</b><small>${this.esc((t.kind||'').toUpperCase())}</small></span></button>`).join(''):'<p class="spkEmpty">Links you play are saved here (and in the phone\'s Music).</p>'}}
    // seek bar: a YouTube link (time and length come from the embed) or one of your own audio files
    const sk=$('spkSeek');let pos=0,dur=0,can=false;
    if(own&&SPK.media.kind==='youtube'){pos=P.pos;dur=P.dur||own.dur||0;can=dur>0}else if(!link&&SPK.el&&Number.isFinite(SPK.el.duration)){pos=SPK.el.currentTime;dur=SPK.el.duration;can=true}
    sk.disabled=!can;sk.parentNode.style.opacity=can?'1':'.35';
    if(!(P&&P._drag)){const m=Math.max(1,Math.floor(dur||1));if(+sk.max!==m)sk.max=m;sk.value=Math.floor(pos);$('spkPos').textContent=this.mmss(pos)}
    $('spkDur').textContent=can?this.mmss(dur):'--:--'}
};
