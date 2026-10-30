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
    const a=AUD.ctx,s=a.createBufferSource(),g=a.createGain();s.buffer=b;s.loop=true;s.loopStart=b.duration*.12;s.loopEnd=b.duration*.88;g.gain.value=0;s.connect(g);g.connect(AUD.sfx);s.start(0,s.loopStart);
    this.src=s;this.g=g;this.p=pr[1];this.l=pr[2];return true},
  update(thr,rpm){if(!this.src)return;const T=AUD.ctx.currentTime;this.src.playbackRate.setTargetAtTime(this.p*(.5+rpm*1.1),T,.06);this.g.gain.setTargetAtTime(this.l*(.3+Math.abs(thr)*.45+rpm*.15),T,.08)},
  off(){if(this.src){try{this.src.stop()}catch(e){}try{this.src.disconnect();this.g.disconnect()}catch(e){}this.src=null}}};
