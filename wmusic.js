// Weather music: snow -> carols, fog -> calm instrumentals. Real recordings only, played from drop-in folders
// (assets/music/snow, assets/music/fog). A folder's playlist is: manifest.json "tracks" + a few friendly file names + 1..9.mp3.
// State-driven (follows S.weather every frame), so it also works after a reload once the first tap has unlocked audio.
const WMUS=(()=>{
  const DIR={snow:'assets/music/snow/',fog:'assets/music/fog/'};
  const GUESS={
    snow:['last-christmas.mp3','let-it-snow.mp3','jingle-bells.mp3'],
    fog:['spokoynaya-noch.mp3','pachka-sigaret.mp3','gruppa-krovi.mp3','zvezda-po-imeni-solntse.mp3','kukushka.mp3','peremen.mp3','krasno-zheltye-dni.mp3','posledniy-geroy.mp3','sentyabr.mp3','trolleybus.mp3']};
  const LIST={};            // kind -> [{url,name}]
  let kind=null,el=null,idx=0,vol=0,want=0,node=null,out=null,tried=0,failed={},told={},lastWanted=null,loading=null;
  function pretty(f){return f.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/^\d+\s*/,'').replace(/\b\w/g,c=>c.toUpperCase())||f}
  async function exists(u){try{const r=await fetch(u,{method:'HEAD',cache:'no-store'});return r.ok&&!/text\/html/.test(r.headers.get('content-type')||'')}catch(e){return false}}
  async function load(k){
    if(LIST[k])return LIST[k];if(loading&&loading.k===k)return loading.p;
    const p=(async()=>{
      const d=DIR[k],seen={},cand=[];
      let fb=[];
      try{const r=await fetch(d+'manifest.json',{cache:'no-store'});if(r.ok){const m=await r.json();for(const t of m.tracks||[]){const f=typeof t==='string'?t:t.file;if(f&&!seen[f]){seen[f]=1;cand.push({f,name:t.name||pretty(f)})}}
        for(const t of m.fallback||[]){const f=typeof t==='string'?t:t.file;if(f&&!seen[f]){seen[f]=1;fb.push({f,name:t.name||pretty(f)})}}}}catch(e){}
      for(const f of GUESS[k]){if(!seen[f]){seen[f]=1;cand.push({f,name:pretty(f),guess:1})}}
      for(let i=1;i<=9;i++){const f=i+'.mp3';if(!seen[f]){seen[f]=1;cand.push({f,name:'Track '+i,guess:1})}}
      const ok=await Promise.all(cand.map(c=>c.guess?exists(d+c.f):Promise.resolve(true)));
      let res=cand.filter((c,i)=>ok[i]).map(c=>({url:d+c.f,name:c.name}));
      if(!res.length)res=fb.map(c=>({url:d+c.f,name:c.name}));   // calm built-in piece only when the player added nothing of their own
      for(let i=res.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[res[i],res[j]]=[res[j],res[i]]}
      LIST[k]=res;return res})();
    loading={k,p};const r=await p;loading=null;return r}
  function hook(){
    if(el)return;el=new Audio();el.preload='auto';
    try{if(AUD.ok){node=AUD.ctx.createMediaElementSource(el);out=AUD.ctx.createGain();out.gain.value=1;node.connect(out);out.connect(AUD.mus)}}catch(e){node=null;out=null}
    el.onended=()=>next();
    el.onerror=()=>{if(!el.getAttribute('src')||!kind)return;const l=LIST[kind]||[];failed[(l[idx]||{}).url]=1;next()}}
  function setVol(v){vol=v;if(el&&!out)el.volume=Math.max(0,Math.min(1,v));else if(out)out.gain.value=v}
  function playCur(){
    const l=LIST[kind]||[];let n=0;
    while(n<l.length&&failed[l[idx%l.length].url]){idx++;n++}
    if(n>=l.length)return stop();
    idx%=l.length;el.src=l[idx].url;el.play().then(()=>{if(typeof toast!=='undefined')toast('♪ '+l[idx].name,kind==='snow'?'snow':'fog')}).catch(()=>{})}
  function next(){const l=LIST[kind]||[];if(!l.length)return stop();idx=(idx+1)%l.length;playCur()}
  function stop(){if(el){try{el.pause()}catch(e){}el.removeAttribute('src');try{el.load()}catch(e){}}kind=null}
  async function begin(k){
    const l=await load(k);if(want!==k)return;
    if(!l.length){if(!told[k]&&typeof toast!=='undefined'){told[k]=1;toast(k==='fog'?'Fog needs music':'Snow needs music','drop mp3 files into assets/music/'+k+'/ — see README.txt there')}return}
    if(typeof SPK!=='undefined'&&SPK.playing)return;
    hook();kind=k;idx=(Math.random()*l.length)|0;playCur()}
  function tick(dt){
    const w=(typeof S!=='undefined'&&(S.weather==='snow'||S.weather==='fog'))?S.weather:null;
    const spk=typeof SPK!=='undefined'&&SPK.playing;
    if(w!==lastWanted){lastWanted=w;tried=0}
    want=w;
    if(w&&!spk&&!kind&&AUD.ok&&tried<1&&!(LIST[w]&&!LIST[w].length&&told[w])){tried++;begin(w)}
    if(kind&&kind!==w){setVol(Math.max(0,vol-dt*.8));if(vol<=.01){stop()}return}    // weather cleared or switched: fade out, then stop
    if(!kind){tried=(w&&!spk)?tried:0;return}
    if(spk){setVol(Math.max(0,vol-dt*1.5));if(vol<=.01){stop();tried=0}return}
    const ind=AUD.indoor?.35:1,br=(typeof BR!=='undefined'&&BR.on)?.4:1;
    const target=.55*ind*br;vol+=(target-vol)*Math.min(1,dt*1.2);setVol(vol);   // slow fade in, quieter indoors and in a match
  }
  return {tick,get kind(){return kind}};
})();
