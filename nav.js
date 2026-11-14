// nav.js — a 3D navigation marker (GTA / Fortnite style) instead of a jump-cut teleport (2026-11-12).
//   Map: pick a place or a point -> "Navigate" (primary) sets the marker; "Teleport" stays as the second, optional button.
//   World: a tall soft beam of light, a turning diamond above it and a ground ring, visible through the fog from far away; the diamond keeps a readable size at any distance.
//   HUD: a pill at the top, "📍 Name · 1.2 km", with an arrow that turns with the camera; ✕ cancels. Arriving (< 14 m) clears it with a toast.
// NAV.set(x,z,name), NAV.clear(), NAV.dist(). Everything is built here; index.html only loads the file and calls NAV.init().
const NAV={on:false,x:0,z:0,name:'',grp:null,beam:null,gem:null,ring:null,el:null,t:0,
  init(){if(this.grp||typeof scene==='undefined')return;
    const g=new THREE.Group();g.visible=false;
    // beam: a gradient texture (bright at the base, fading upwards) on an open cylinder, additive, no fog, no depth write
    const cv=document.createElement('canvas');cv.width=4;cv.height=128;const x=cv.getContext('2d'),gr=x.createLinearGradient(0,128,0,0);gr.addColorStop(0,'rgba(56,228,208,.9)');gr.addColorStop(.35,'rgba(56,228,208,.38)');gr.addColorStop(1,'rgba(56,228,208,0)');x.fillStyle=gr;x.fillRect(0,0,4,128);
    const tex=new THREE.CanvasTexture(cv);const bm=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,side:THREE.DoubleSide,toneMapped:false});
    this.beam=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,160,20,1,true),bm);this.beam.position.y=80;this.beam.frustumCulled=false;this.beam.renderOrder=40;g.add(this.beam);
    const gm=new THREE.MeshBasicMaterial({color:0x38e4d0,fog:false,toneMapped:false,transparent:true,opacity:.95,depthWrite:false});
    this.gem=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),gm);this.gem.scale.set(.8,1.3,.8);this.gem.position.y=7;this.gem.frustumCulled=false;this.gem.renderOrder=41;g.add(this.gem);
    this.ring=new THREE.Mesh(new THREE.RingGeometry(1.6,2.1,40),new THREE.MeshBasicMaterial({color:0x38e4d0,fog:false,toneMapped:false,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.12;this.ring.frustumCulled=false;this.ring.renderOrder=40;g.add(this.ring);
    scene.add(g);this.grp=g;
    // HUD pill
    const st=document.createElement('style');st.textContent=`#navHud{position:fixed;z-index:30;left:50%;top:max(12px,env(safe-area-inset-top));transform:translate(-50%,-140%);display:flex;align-items:center;gap:10px;padding:7px 8px 7px 12px;border-radius:999px;background:rgba(14,20,28,.72);color:#f4f1ea;font:700 14px system-ui,-apple-system,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.14);transition:transform .45s cubic-bezier(.2,1.2,.3,1);pointer-events:auto;max-width:78vw}
#navHud.on{transform:translate(-50%,0)}#navHud i{width:30px;height:30px;border-radius:50%;background:#38e4d0;display:grid;place-items:center;flex:none}#navHud i b{display:block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:15px solid #04252b;transition:transform .1s linear}
#navHud span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#navHud em{font-style:normal;color:#38e4d0;margin-left:4px}#navHud button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:50%;width:26px;height:26px;font-size:13px;cursor:pointer;flex:none}
#goNav{position:absolute;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#38e4d0;color:#04252b;border:0;border-radius:16px;padding:12px 22px;font:800 15px system-ui,-apple-system,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.45);z-index:5;cursor:pointer;white-space:nowrap}#goNav[hidden]{display:none}`;document.head.appendChild(st);
    const h=document.createElement('div');h.id='navHud';h.innerHTML='<i><b id="navArrow"></b></i><span id="navTxt"></span><button id="navX" aria-label="Cancel navigation">✕</button>';document.body.appendChild(h);this.el=h;
    h.querySelector('#navX').onclick=e=>{e.stopPropagation();this.clear()};
    // map: a primary "Navigate" button above the (now secondary) teleport button
    const map=document.getElementById('mapUI'),go=document.getElementById('goHere');
    if(map&&go){const b=document.createElement('button');b.id='goNav';b.hidden=true;b.textContent='Navigate';map.appendChild(b);
      const sync=()=>{b.hidden=go.hidden;const m=/^Teleport to (.+)$/.exec(go.textContent||'');b.textContent=m?'Navigate to '+m[1]:'Navigate here';go.style.background='rgba(255,255,255,.16)';go.style.color='#fff'};
      new MutationObserver(sync).observe(go,{attributes:true,childList:true,characterData:true,subtree:true,attributeFilter:['hidden']});sync();
      b.onclick=()=>{const p=typeof MAPV!=='undefined'&&MAPV.selPlace,sel=typeof MAPV!=='undefined'&&MAPV.sel;if(!p&&!sel)return;const x=p?p.x:sel[0],z=p?p.z:sel[1],nm=p?p.name:(typeof districtOf==='function'?districtOf(x,z)[0]:'Destination');
        if(typeof closeMap==='function')closeMap();this.set(x,z,nm)}}
    ANIM.push(dt=>this.tick(dt))},
  set(x,z,name){this.init();if(!this.grp)return;this.x=x;this.z=z;this.name=name||'Destination';this.on=true;this.grp.visible=true;this.grp.position.set(x,Math.max(groundH(x,z),(typeof SL!=='undefined'?SL:0)),z);this.arrived=0;
    if(this.el){this.el.classList.add('on');this.upd(true)}if(typeof toast==='function')toast('Navigation',this.name+' · follow the golden beam')},
  clear(){this.on=false;if(this.grp)this.grp.visible=false;if(this.el)this.el.classList.remove('on')},
  dist(){return Math.hypot(this.x-player.x,this.z-player.z)},
  fmt(d){return d<1000?Math.max(5,Math.round(d/5)*5)+' m':(d/1000).toFixed(d<10000?1:0)+' km'},
  upd(force){if(!this.el)return;const d=this.dist(),t=document.getElementById('navTxt'),a=document.getElementById('navArrow');
    const s='📍 '+this.name;const txt=document.createTextNode(s),em=document.createElement('em');em.textContent=this.fmt(d);if(t){t.replaceChildren(txt,em)}
    if(a){const aim=this.path&&this.s!==undefined?this.at(Math.min(this.pl,this.s+18)):[this.x,this.z];let rel=Math.atan2(aim[0]-player.x,aim[1]-player.z)-(typeof cam!=='undefined'?cam.yaw:0);while(rel>Math.PI)rel-=6.283;while(rel<-Math.PI)rel+=6.283;a.style.transform='rotate('+(-rel)+'rad)'}},
  tick(dt){if(!this.on||typeof started==='undefined'||!started)return;this.t+=dt;
    const d=this.dist();if(d<14){this.clear();if(typeof toast==='function')toast('You have arrived',this.name);return}
    // beam and diamond keep a readable size from far away; the marker follows the ground when streets stream in
    const k=Math.max(1,d/90);this.beam.scale.set(k,1,k);this.gem.scale.set(.8*Math.max(1,d/55),1.3*Math.max(1,d/55),.8*Math.max(1,d/55));this.gem.position.y=7+Math.min(40,d/25);this.gem.rotation.y=this.t*1.6;
    this.ring.scale.setScalar(k);this.ring.material.opacity=.55+.3*Math.sin(this.t*3);
    this._u=(this._u||0)-dt;if(this._u<=0){this._u=.12;this.upd()}
    this._g=(this._g||0)-dt;if(this._g<=0){this._g=1;this.grp.position.y=Math.max(groundH(this.x,this.z),(typeof SL!=='undefined'?SL:0))}}
};
// ---- route guidance along the streets (2026-11-14): A* over the road network the traffic uses, aqua chevrons on the ground that lead you along the way, the HUD pill shows the distance ALONG the route
// and its arrow points at the next stretch of it. No route (the destination is across water / on an island): the beam and the straight distance as before.
Object.assign(NAV,{
  path:null,pl:0,pi:0,
  graph(){if(this.G||typeof D==='undefined'||!D.nodes||!D.wn||typeof HDR==='undefined')return this.G;const nN=HDR.nNodes,nW=HDR.nWays,ws=D.wstart,wn=D.wn,P=D.nodes,deg=new Uint32Array(nN+1);
    const ok=k=>D.wfl[k]!==1;for(let k=0;k<nW;k++){if(!ok(k))continue;for(let q=ws[k];q<ws[k+1]-1;q++){deg[wn[q]]++;deg[wn[q+1]]++}}
    const st=new Uint32Array(nN+1);for(let i=0;i<nN;i++)st[i+1]=st[i]+deg[i];const adj=new Int32Array(st[nN]),fill=new Uint32Array(nN);
    for(let k=0;k<nW;k++){if(!ok(k))continue;for(let q=ws[k];q<ws[k+1]-1;q++){const a=wn[q],b=wn[q+1];adj[st[a]+fill[a]++]=b;adj[st[b]+fill[b]++]=a}}
    return this.G={st,adj,P,nN}},
  nearest(x,z){const {st,P,nN}=this.G;let best=-1,bd=1e18;for(let i=0;i<nN;i++){if(st[i+1]===st[i])continue;const dx=P[i*2]-x,dz=P[i*2+1]-z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=i}}return bd<250*250?best:-1},
  route(){this.path=null;this.pl=0;this.pi=0;const G=this.graph();if(!G)return;const a=this.nearest(player.x,player.z),b=this.nearest(this.x,this.z);if(a<0||b<0)return;
    const {st,adj,P,nN}=G,g=new Float32Array(nN).fill(1e30),came=new Int32Array(nN).fill(-1),closed=new Uint8Array(nN),H=[];const hx=P[b*2],hz=P[b*2+1],h=n=>Math.hypot(P[n*2]-hx,P[n*2+1]-hz);
    const push=(f,n)=>{H.push([f,n]);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p}},pop=()=>{const t=H[0],l=H.pop();if(H.length){H[0]=l;let i=0;for(;;){let m=i;const L=2*i+1,R=L+1;if(L<H.length&&H[L][0]<H[m][0])m=L;if(R<H.length&&H[R][0]<H[m][0])m=R;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m}}return t};
    g[a]=0;push(h(a),a);let it=0,found=false;while(H.length&&it++<600000){const [,n]=pop();if(closed[n])continue;closed[n]=1;if(n===b){found=true;break}
      for(let e=st[n];e<st[n+1];e++){const m=adj[e];if(closed[m])continue;const w=Math.hypot(P[m*2]-P[n*2],P[m*2+1]-P[n*2+1]),ng=g[n]+w;if(ng<g[m]){g[m]=ng;came[m]=n;push(ng+h(m),m)}}}
    if(!found)return;const pts=[];for(let n=b;n>=0;n=came[n])pts.push([P[n*2],P[n*2+1]]);pts.reverse();pts.unshift([player.x,player.z]);pts.push([this.x,this.z]);
    let L=0;const cum=[0];for(let i=1;i<pts.length;i++){L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);cum.push(L)}this.path=pts;this.cum=cum;this.pl=L;this.pi=0;this.mk()},
  mk(){if(this.chev||typeof scene==='undefined')return;const sh=new THREE.Shape();sh.moveTo(0,1);sh.lineTo(.9,-.6);sh.lineTo(0,-.1);sh.lineTo(-.9,-.6);sh.closePath();const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);
    const m=new THREE.InstancedMesh(g,new THREE.MeshBasicMaterial({color:0x38e4d0,transparent:true,opacity:.85,depthTest:false,depthWrite:false,fog:false,toneMapped:false,side:THREE.DoubleSide}),40);m.frustumCulled=false;m.renderOrder=39;m.count=0;m.visible=false;scene.add(m);this.chev=m},
  // the point on the route `s` metres ahead of the player's place on it
  at(s){const P=this.path,C=this.cum;let i=this.pi;while(i<P.length-2&&C[i+1]<s)i++;const t=Math.max(0,Math.min(1,(s-C[i])/Math.max(.001,C[i+1]-C[i])));return [P[i][0]+(P[i+1][0]-P[i][0])*t,P[i][1]+(P[i+1][1]-P[i][1])*t,i]},
  upRoute(dt){if(!this.path||!this.chev){if(this.chev)this.chev.visible=false;return}const P=this.path,C=this.cum;
    // where are we on the route: the nearest of the next few path vertices' segments
    let bi=this.pi,bd=1e18;for(let i=Math.max(0,this.pi-2);i<Math.min(P.length-1,this.pi+14);i++){const ax=P[i][0],az=P[i][1],dx=P[i+1][0]-ax,dz=P[i+1][1]-az,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((player.x-ax)*dx+(player.z-az)*dz)/L2)),d=Math.hypot(ax+dx*t-player.x,az+dz*t-player.z);if(d<bd){bd=d;bi=i}}
    this.pi=bi;const ax=P[bi][0],az=P[bi][1],dx=P[bi+1][0]-ax,dz=P[bi+1][1]-az,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((player.x-ax)*dx+(player.z-az)*dz)/L2));this.s=C[bi]+Math.sqrt(L2)*t;this.left=Math.max(0,this.pl-this.s);
    if(bd>60){this._rr=(this._rr||0)+dt;if(this._rr>2){this._rr=0;this.route()}return}   // far off the route: plan again
    const m=this.chev,M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),S=new THREE.Vector3(1.5,1.5,1.5),Y=new THREE.Vector3(0,1,0);let n=0;
    for(let k=0;k<40;k++){const s=this.s+5+k*5;if(s>this.pl-4)break;const [x,z,i]=this.at(s),tx=P[i+1][0]-P[i][0],tz=P[i+1][1]-P[i][1];Q.setFromAxisAngle(Y,Math.atan2(tx,tz));V.set(x,Math.max(groundH(x,z),SL)+.35,z);M4.compose(V,Q,S);m.setMatrixAt(n++,M4)}
    m.count=n;m.instanceMatrix.needsUpdate=true;m.visible=n>0}
});
{const _set=NAV.set,_clr=NAV.clear,_dist=NAV.dist,_tick=NAV.tick;
  NAV.set=function(x,z,name){_set.call(this,x,z,name);try{this.route()}catch(e){console.warn('[nav] route',e);this.path=null}this.upd(true)};
  NAV.clear=function(){this.path=null;if(this.chev)this.chev.visible=false;return _clr.call(this)};
  NAV.dist=function(){return this.path&&this.left!==undefined&&this.on?this.left:_dist.call(this)};
  NAV.tick=function(dt){if(this.on&&Math.hypot(this.x-player.x,this.z-player.z)<14)this.path=null;_tick.call(this,dt);if(this.on)try{this.upRoute(dt)}catch(e){this.path=null}};
}
