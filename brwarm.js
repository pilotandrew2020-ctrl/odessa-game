/* brwarm.js — BRWARM: draws one sample of every kind of loot / crate once, in the first seconds of a match (bus ride), so the shaders are already compiled when
   the player lands. Without it the first sight of each new kind of item froze the game for 1–2 s (much worse on a phone). Spread over frames, one sample per .15 s. */
const BRWARM=(()=>{let q=[],t=0,rt=null;
function plan(){q=[];const seen={};for(const it of BR.items){const k=it.k+':'+it.id+':'+(it.k==='w'&&it.rar>=3?1:0);if(seen[k])continue;seen[k]=1;q.push(it)}
  q.push({k:'x',id:'',x:0,y:0,z:0,t:0})}
function start(){q=null;t=1.5}
function tick(dt){if(!BR.on||(q&&!q.length))return;t-=dt;if(t>0)return;if(!q)plan();t=.15;const it=q.shift();if(!it)return;
  try{rt=rt||new THREE.WebGLRenderTarget(2,2);const f=Object.assign({},it,{x:player.x,y:player.y-400,z:player.z,t:0});const g=BR.mesh(f);g.traverse(o=>{o.frustumCulled=false});
    const sa=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;const cur=renderer.getRenderTarget();renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(cur);renderer.shadowMap.autoUpdate=sa;
    scene.remove(g)}catch(e){console.warn('[brwarm]',e&&e.message||e)}}
function end(){q=[]}
return {start,tick,end}})();
