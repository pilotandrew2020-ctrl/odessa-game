// music.js — "Odesa FM": a generative lo-fi soundtrack for the open world (2026-11-13). Nothing is recorded: electric-piano chords (two-operator FM), a round sine bass, a soft kick / snare / swung hats,
// a sparse pentatonic pluck through a dotted-eighth echo and a little vinyl crackle, over a few jazzy progressions that change every four bars. It runs on the game's Web Audio bus `AUD.mus` and:
//   plays quietly while you walk, ride or drive; fades out while YOUR music plays (speaker / phone), while weather music (real recordings) plays, in a Battle Royale match and in the menus;
//   is switched on / off in the phone: Music -> Odesa FM (kept in localStorage `odessa_bgm`).
// BGM.build(ctx,dest[,seed]) -> graph, BGM.sched(g,t0,t1) schedule everything that falls into [t0,t1): the same code is rendered offline by tests/t_music.js to check levels.
const BGM={on:localStorage.getItem('odessa_bgm')!=='off',g:null,timer:null,vol:0,
  PROGS:[   // [bass midi, chord midi...] per bar; voicings are rootless and close, like a jazz comp
    [[36,52,55,59,62],[33,48,52,55,59],[38,53,57,60,64],[31,53,59,62,64]],                // Cmaj9  Am9  Dm9  G13
    [[29,52,57,60,64],[28,50,55,59,62],[38,48,53,57,60],[36,52,55,59,64]],                // Fmaj7  Em7  Dm7  Cmaj7
    [[33,48,52,55,59],[29,52,57,60,64],[36,52,55,59,62],[31,50,55,59,64]]],               // Am9  Fmaj7  Cmaj9  G6
  PENTA:[72,74,76,79,81,84,86],
  mkNoise(ctx){const n=ctx.sampleRate*2,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let s=12345;for(let i=0;i<n;i++){s=(s*1664525+1013904223)>>>0;d[i]=(s/4294967296)*2-1}return b},
  build(ctx,dest,seed){const g={ctx,seed:(seed||7)>>>0,step:0,bar:0,prog:0,next:ctx.currentTime+.12,bpm:76,swing:.56,noise:this.mkNoise(ctx)};
    g.rnd=()=>{g.seed=(g.seed*1664525+1013904223)>>>0;return g.seed/4294967296};
    const out=ctx.createGain();out.gain.value=1;const lim=ctx.createDynamicsCompressor();lim.threshold.value=-20;lim.knee.value=12;lim.ratio.value=3.5;lim.attack.value=.01;lim.release.value=.25;const trim=ctx.createGain();trim.gain.value=.36;out.connect(lim);lim.connect(trim);trim.connect(dest);g.out=out;   // trim: a background track sits well under the engines
    // buses: keys (warm lowpass), bass, drums, echo for the pluck, a short room
    const bus=(gain,cut)=>{const b=ctx.createGain();b.gain.value=gain;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;b.connect(f);f.connect(out);return b};
    g.keys=bus(.55,3000);g.bass=bus(.9,420);g.drum=bus(.85,9000);g.pluck=bus(.5,4200);
    const dl=ctx.createDelay(1.2);dl.delayTime.value=60/g.bpm*.75;const fb=ctx.createGain();fb.gain.value=.38;const df=ctx.createBiquadFilter();df.type='lowpass';df.frequency.value=2200;g.pluck.connect(dl);dl.connect(df);df.connect(fb);fb.connect(dl);df.connect(out);
    const rv=ctx.createConvolver(),n=ctx.sampleRate*1.6,ib=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=ib.getChannelData(c);for(let i=0;i<n;i++)d[i]=(g.rnd()*2-1)*Math.pow(1-i/n,2.6)}rv.buffer=ib;const rg=ctx.createGain();rg.gain.value=.2;g.keys.connect(rv);g.pluck.connect(rv);rv.connect(rg);rg.connect(out);
    // vinyl: a high-passed hiss, very low
    const vs=ctx.createBufferSource();vs.buffer=g.noise;vs.loop=true;const vf=ctx.createBiquadFilter();vf.type='highpass';vf.frequency.value=5200;const vg=ctx.createGain();vg.gain.value=.006;vs.connect(vf);vf.connect(vg);vg.connect(out);vs.start();g.vinyl=vs;
    return g},
  hz(m){return 440*Math.pow(2,(m-69)/12)},
  // electric piano: FM (modulator = carrier frequency, the index dies away fast = the "tine"), a faint octave bell, soft attack
  rhodes(g,t,m,v,dur){const c=g.ctx,f=this.hz(m),car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),eg=c.createGain(),bell=c.createOscillator(),bg=c.createGain();
    car.frequency.value=f;mod.frequency.value=f*(m<55?1:2);mg.gain.setValueAtTime(f*1.6*v,t);mg.gain.exponentialRampToValueAtTime(f*.12,t+.5);mod.connect(mg);mg.connect(car.frequency);
    eg.gain.setValueAtTime(0,t);eg.gain.linearRampToValueAtTime(.2*v,t+.006);eg.gain.exponentialRampToValueAtTime(.0007,t+dur);car.connect(eg);eg.connect(g.keys);
    bell.frequency.value=f*4;bg.gain.setValueAtTime(.012*v,t);bg.gain.exponentialRampToValueAtTime(.0005,t+.35);bell.connect(bg);bg.connect(g.keys);
    for(const o of [car,mod,bell]){o.start(t);o.stop(t+dur+.05)}},
  bassNote(g,t,m,dur,v){const c=g.ctx,o=c.createOscillator(),o2=c.createOscillator(),e=c.createGain();o.type='sine';o2.type='triangle';o.frequency.value=this.hz(m);o2.frequency.value=this.hz(m);
    e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(.3*v,t+.015);e.gain.exponentialRampToValueAtTime(.001,t+dur);const g2=c.createGain();g2.gain.value=.25;o.connect(e);o2.connect(g2);g2.connect(e);e.connect(g.bass);o.start(t);o2.start(t);o.stop(t+dur+.05);o2.stop(t+dur+.05)},
  kick(g,t,v){const c=g.ctx,o=c.createOscillator(),e=c.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);e.gain.setValueAtTime(.55*v,t);e.gain.exponentialRampToValueAtTime(.001,t+.32);o.connect(e);e.connect(g.drum);o.start(t);o.stop(t+.34)},
  noiseHit(g,t,v,f,type,dur,q){const c=g.ctx,s=c.createBufferSource();s.buffer=g.noise;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||.7;const e=c.createGain();e.gain.setValueAtTime(v,t);e.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(fl);fl.connect(e);e.connect(g.drum);s.start(t,g.rnd()*1.5);s.stop(t+dur+.02)},
  pluck(g,t,m,v){const c=g.ctx,o=c.createOscillator(),o2=c.createOscillator(),e=c.createGain();o.type='triangle';o2.type='sine';o.frequency.value=this.hz(m);o2.frequency.value=this.hz(m)*2;e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(.12*v,t+.008);e.gain.exponentialRampToValueAtTime(.0008,t+1.1);o.connect(e);o2.connect(e);e.connect(g.pluck);o.start(t);o2.start(t);o.stop(t+1.15);o2.stop(t+1.15)},
  // schedule every event that starts before t1 (the 16th-note grid, swung; one bar = 16 steps)
  sched(g,t1,night){const sp=60/g.bpm/4;
    while(g.next<t1){const t=g.next,s=g.step%16,ch=this.PROGS[g.prog][((g.step/16)|0)%4],sw=(s%2)?sp*(g.swing-.5)*2:0,T=t+sw,R=g.rnd;
      if(s===0){const q=ch;this.bassNote(g,T,q[0],sp*7,1);   // chord: a gentle strum, each note a few ms later
        for(let k=1;k<q.length;k++)this.rhodes(g,T+(k-1)*.018+R()*.006,q[k],.75+R()*.2,sp*15);}
      if(s===8&&R()<.8)this.bassNote(g,T,ch[0]+(R()<.3?7:0),sp*4,.8);
      if(s===10&&R()<.5)this.bassNote(g,T,ch[0]+12,sp*3,.55);
      if(s===8&&R()<.55)for(let k=1;k<ch.length;k++)if(R()<.7)this.rhodes(g,T+(k-1)*.012,ch[k],.45+R()*.15,sp*6);   // a softer re-strike on beat three
      // drums (no hats at night), ghost kick
      if(s===0||s===10)this.kick(g,T,s?.7:1);else if(s===7&&R()<.35)this.kick(g,T,.4);
      if(s===4||s===12){this.noiseHit(g,T,.22,1900,'bandpass',.16,.9);const o=g.ctx.createOscillator(),e=g.ctx.createGain();o.frequency.value=185;e.gain.setValueAtTime(.16,T);e.gain.exponentialRampToValueAtTime(.001,T+.1);o.connect(e);e.connect(g.drum);o.start(T);o.stop(T+.12)}
      if(!night&&s%2===0)this.noiseHit(g,T,.045+R()*.035,8200,'highpass',s%8===6?.16:.04,.7);
      // a sparse melody, pentatonic and a little behind the beat
      if(s%4===2&&R()<(night?.16:.24)){const m=this.PENTA[(R()*this.PENTA.length)|0]-(R()<.2?12:0);this.pluck(g,T+R()*.02,m,.7+R()*.3)}
      // vinyl pops
      if(R()<.04)this.noiseHit(g,T+R()*sp,.012+R()*.02,3000,'bandpass',.012,1.5);
      g.step++;g.next+=sp;if(g.step%64===0){g.prog=(R()*this.PROGS.length)|0;g.bpm=night?70:74+((R()*6)|0)}}},
  // --- live use --------------------------------------------------------------------------------------------
  wanted(){if(!this.on||typeof started==='undefined'||!started||typeof AUD==='undefined'||!AUD.ok)return false;
    if(typeof SPK!=='undefined'&&SPK&&SPK.playing)return false;if(typeof BR!=='undefined'&&BR.on)return false;if(typeof WMUS!=='undefined'&&WMUS.kind)return false;
    const m=document.getElementById('menu');if(m&&!m.hidden)return false;if(typeof CREATOR!=='undefined'&&CREATOR.on)return false;if(typeof GAR!=='undefined'&&GAR.on)return false;return true},
  tick(dt){const want=this.wanted()?1:0;this.vol+=(want*(AUD.indoor?.55:1)-this.vol)*Math.min(1,dt*(want?.35:1.6));
    if(this.vol>.01){if(!this.g){this.g=this.build(AUD.ctx,AUD.mus,(Date.now()>>>3));this.g.out.gain.value=0}if(!this.timer)this.timer=setInterval(()=>this.pump(),90)}
    if(this.g){this.g.out.gain.setTargetAtTime(this.vol*.9,AUD.ctx.currentTime,.12);
      if(this.vol<=.01&&this.timer){clearInterval(this.timer);this.timer=null;this.g.next=AUD.ctx.currentTime+.3}}},   // faded out: stop scheduling (the notes already scheduled die away)
  pump(){const g=this.g;if(!g||!AUD.ok)return;const c=AUD.ctx;if(g.next<c.currentTime)g.next=c.currentTime+.05;this.sched(g,c.currentTime+.45,UNI&&UNI.uNight&&UNI.uNight.value>.5)},
  toggle(){this.on=!this.on;try{localStorage.setItem('odessa_bgm',this.on?'on':'off')}catch(e){}return this.on},
  init(){if(this._i)return;this._i=1;ANIM.push(dt=>{try{this.tick(dt)}catch(e){}})}
};
