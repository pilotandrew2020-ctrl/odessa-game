// tv.js — what the televisions in the houses and flats show.
// Before: a little canvas with coloured boxes sliding over it. Now three states, switched with E at the set:
//   off  ->  channel 1: the film (assets/video/film.mp4, the same Big Buck Bunny excerpt the cinema plays)  ->  channel 2: "Odesa News 24" (drawn: headline, weather, ticker)  ->  off
// One shared <video> (one decoder for the whole game) that plays only while a TV showing it is on screen inside the interior you are in;
// the news picture is one shared canvas that is redrawn ~10 times a second only while somebody watches it.
// Used through K.tv in houses.js (island houses, flats, the modern flat): the set keeps its own canvas for the "off" screen, and hsTick/flTick/mdTick
// no longer draw the old boxes when `tv.ch` is set.
const TVX={vid:null,vtex:null,ncv:null,ntex:null,ng:null,nt:0,nd:0,sets:new Set(),
  video(){if(this.vid)return;const v=document.createElement('video');v.src='assets/video/film.mp4';v.loop=true;v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.preload='auto';v.crossOrigin='anonymous';this.vid=v;
    const t=new THREE.VideoTexture(v);t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.encoding=THREE.sRGBEncoding;this.vtex=t},
  newsTex(){if(this.ntex)return;const cv=document.createElement('canvas');cv.width=320;cv.height=180;this.ncv=cv;this.ng=cv.getContext('2d');const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;this.ntex=t;this.drawNews(0)},
  NEWS:[['Chestnuts bloom on Primorsky Boulevard','The city park service expects the best week of the spring: the alleys are open until late.'],
        ['New ferry line from the Sea Terminal','Summer timetable announced: three crossings a day, bicycles and prams ride free.'],
        ['Street musicians gather on Deribasivska','A free open-air festival from noon: jazz, accordions and a brass band in the courtyards.'],
        ['The Opera announces an open rehearsal','Neighbours are invited to the dress rehearsal on Saturday evening, entrance from the park.'],
        ['Privoz market: the first strawberries','Early berries are in the covered hall; prices are lower than last year.'],
        ['Lighthouse at the breakwater turns 150','A small exhibition opens at the port: old charts, lamps and photographs.']],
  drawNews(dt){const g=this.ng;if(!g)return;const W=320,H=180,t=this.nt+=dt,i=Math.floor(t/7)%this.NEWS.length,N=this.NEWS[i],ph=(t%7)/7;
    const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c2a5a');bg.addColorStop(1,'#071428');g.fillStyle=bg;g.fillRect(0,0,W,H);
    g.fillStyle='#d81f26';g.fillRect(0,0,W,22);g.fillStyle='#fff';g.font='700 14px Arial,sans-serif';g.textBaseline='middle';g.fillText('ODESA NEWS 24',8,11);
    const d=new Date();g.textAlign='right';g.fillText(String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),W-8,11);g.textAlign='left';
    // headline slides in
    const x=Math.min(0,-(1-Math.min(1,ph*6))*W*.3);g.save();g.translate(x,0);g.globalAlpha=Math.min(1,ph*8)*(ph>.93?(1-ph)/.07:1);
    g.fillStyle='#fff';g.font='700 19px Arial,sans-serif';g.textBaseline='top';this.wrap(g,N[0],12,34,210,22,3);
    g.fillStyle='#b8c8e8';g.font='12px Arial,sans-serif';this.wrap(g,N[1],12,108,210,15,3);g.restore();g.globalAlpha=1;
    // weather box
    g.fillStyle='rgba(255,255,255,.1)';g.fillRect(232,34,80,92);g.fillStyle='#ffd23f';g.beginPath();g.arc(272,66,15,0,6.283);g.fill();
    g.strokeStyle='#ffd23f';g.lineWidth=2;for(let k=0;k<8;k++){const a=k*.785+t*.4;g.beginPath();g.moveTo(272+Math.cos(a)*20,66+Math.sin(a)*20);g.lineTo(272+Math.cos(a)*26,66+Math.sin(a)*26);g.stroke()}
    g.fillStyle='#fff';g.font='700 20px Arial,sans-serif';g.textAlign='center';g.textBaseline='alphabetic';g.fillText('+24°',272,112);g.textAlign='left';
    // ticker
    g.fillStyle='#f2c14e';g.fillRect(0,H-26,W,26);g.fillStyle='#10161f';g.font='700 13px Arial,sans-serif';g.textBaseline='middle';
    const tk='   ●  SEA +21°  ●  PORT: ALL BERTHS OPEN  ●  TRAMS RUN EVERY 8 MIN  ●  FUNICULAR OPEN 08–22  ●  LOST CAT FOUND IN COURTYARD 3  ';const tw=g.measureText(tk).width;const off=(t*38)%tw;g.fillText(tk,-off,H-13);g.fillText(tk,tw-off,H-13);
    if(this.ntex)this.ntex.needsUpdate=true},
  wrap(g,s,x,y,w,lh,max){const words=s.split(' ');let line='',n=0;for(const wd of words){const test=line?line+' '+wd:wd;if(g.measureText(test).width>w&&line){g.fillText(line,x,y+n*lh);line=wd;if(++n>=max)return}else line=test}if(line&&n<max)g.fillText(line,x,y+n*lh)},
  // E at the set: off -> film -> news -> off
  cycle(tv){tv.ch=((tv.ch||0)+1)%3;this.show(tv)},
  show(tv){const m=tv.m.material;
    if(tv.ch===1){this.video();m.map=this.vtex;this.sets.add(tv);this.vid.muted=false;this.vid.volume=.4;const p=this.vid.play();if(p&&p.catch)p.catch(()=>{this.vid.muted=true;this.vid.play().catch(()=>{})})}
    else if(tv.ch===2){this.newsTex();m.map=this.ntex;this.sets.add(tv)}
    else{m.map=tv.tex;this.sets.delete(tv);tv.g.fillStyle='#08090b';tv.g.fillRect(0,0,160,90);tv.tex.needsUpdate=true}
    m.needsUpdate=true;tv.on=tv.ch>0;if(tv.overlay){tv.m.visible=tv.on;if(tv.m2)tv.m2.visible=tv.on}},
  label(tv){return !tv.ch?'Turn the TV on':(tv.ch===1?'Next channel (news)':'Turn the TV off')},
  // is the set drawn at all right now (inside the interior the player is in)?
  seen(tv){for(let o=tv.m;o;o=o.parent)if(o.visible===false)return false;return typeof PORTAL!=='undefined'&&!!PORTAL.cur},
  tick(dt){if(!this.sets.size){if(this.vid&&!this.vid.paused)this.vid.pause();return}
    let film=false,news=false;for(const tv of this.sets){if(!this.seen(tv))continue;if(tv.ch===1)film=true;else if(tv.ch===2)news=true}
    if(this.vid){if(film&&this.vid.paused){const p=this.vid.play();if(p&&p.catch)p.catch(()=>{})}else if(!film&&!this.vid.paused)this.vid.pause()}
    if(news){this.nd+=dt;if(this.nd>=.1){this.drawNews(this.nd);this.nd=0}}}
};
setInterval(()=>{try{TVX.tick(.08)}catch(e){}},80);
