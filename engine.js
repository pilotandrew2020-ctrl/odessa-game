/* engine.js — ENG: car engine sounds from the owner's own recordings (assets/audio/engine_sport.mp3 = a sports-car rev, engine_muffler.mp3 = a gruff muffler).
   The sports sample is the supercar (type 14) and the player's sporty hatch (type 4); every other car uses the muffler sample, pitched by model (bus low, Fiat 126p high).
   Playback rate follows the rpm that engineUpdate() already works out; until the files are decoded the old synthesised engine keeps playing. */
const ENG={buf:{},st:0,src:null,g:null,p:1,l:1,
  load(){if(this.st||typeof AUD==='undefined'||!AUD||!AUD.ctx)return;this.st=1;
    for(const [k,u] of [['sport','assets/audio/engine_sport.mp3'],['muff','assets/audio/engine_muffler.mp3']])
      fetch(u).then(r=>r.arrayBuffer()).then(b=>new Promise((ok,no)=>AUD.ctx.decodeAudioData(b,ok,no))).then(d=>{this.buf[k]=d}).catch(e=>{this.st=0;console.warn('[engine]',u,e&&e.message||e)})},
  // [sample, pitch, loudness]
  prof(t){return t===14||t===4?['sport',1,1]:t===8?['muff',.62,.9]:t===9?['muff',1.3,.8]:t===12||t===13?['muff',.82,1]:t===6||t===11?['muff',1,1]:['muff',.95,.95]},
  on(car){this.off();if(typeof AUD==='undefined'||!AUD||!AUD.ctx)return false;const pr=this.prof(car&&car.type),b=this.buf[pr[0]];if(!b)return false;
    const a=AUD.ctx,s=a.createBufferSource(),g=a.createGain();s.buffer=b;s.loop=true;s.loopStart=b.duration*.12;s.loopEnd=b.duration*.88;g.gain.value=0;s.connect(g);g.connect(AUD.sfx);s.start(0,0);
    this.src=s;this.g=g;this.p=pr[1];this.l=pr[2];return true},
  update(thr,rpm){if(!this.src)return;const T=AUD.ctx.currentTime;this.src.playbackRate.setTargetAtTime(this.p*(.5+rpm*1.1),T,.06);this.g.gain.setTargetAtTime(this.l*(.3+Math.abs(thr)*.45+rpm*.15),T,.08)},
  // passing traffic: AUD.update gives each of its three nearest-car voices the same recordings (pitch by model and speed, a little Doppler); returns false while the files are not decoded yet
  traffic(v,k,d,prox,T,dt){if(typeof AUD==='undefined'||!AUD||!AUD.ctx)return false;if(!this.st)this.load();
    const pr=this.prof(k.type),b=this.buf[pr[0]];if(!b)return false;const A=AUD.ctx;
    if(v.sk!==pr[0]||!v.s){if(v.s){try{v.s.stop();v.s.disconnect()}catch(e){}}
      v.s=A.createBufferSource();v.s.buffer=b;v.s.loop=true;v.s.loopStart=b.duration*.12;v.s.loopEnd=b.duration*.88;
      if(!v.sg){v.sg=A.createGain();v.sg.gain.value=0;v.sg.connect(v.p||AUD.sfx)}
      v.s.connect(v.sg);v.s.start(0,v.s.loopStart+Math.random()*b.duration*.3);v.sk=pr[0]}
    const close=v.pd===undefined?0:(v.pd-d)/Math.max(dt,.016);v.pd=d;v.cl=(v.cl||0)*.9+close*.1;
    const sp=Math.min(1,k.v/14),rate=pr[1]*(.62+sp*.75)*(1+Math.max(-30,Math.min(30,v.cl))/340);
    v.s.playbackRate.setTargetAtTime(rate,T,.12);v.sg.gain.setTargetAtTime(.2*pr[2]*prox*prox*(.3+sp*.7),T,.15);return true},
  off(){if(this.src){try{this.src.stop()}catch(e){}try{this.src.disconnect();this.g.disconnect()}catch(e){}this.src=null}}};
