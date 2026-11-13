// nav.js — a 3D navigation marker (GTA / Fortnite style) instead of a jump-cut teleport (2026-11-12).
//   Map: pick a place or a point -> "Navigate" (primary) sets the marker; "Teleport" stays as the second, optional button.
//   World: a tall soft beam of light, a turning diamond above it and a ground ring, visible through the fog from far away; the diamond keeps a readable size at any distance.
//   HUD: a pill at the top, "📍 Name · 1.2 km", with an arrow that turns with the camera; ✕ cancels. Arriving (< 14 m) clears it with a toast.
// NAV.set(x,z,name), NAV.clear(), NAV.dist(). Everything is built here; index.html only loads the file and calls NAV.init().
const NAV={on:false,x:0,z:0,name:'',grp:null,beam:null,gem:null,ring:null,el:null,t:0,
  init(){if(this.grp||typeof scene==='undefined')return;
    const g=new THREE.Group();g.visible=false;
    // beam: a gradient texture (bright at the base, fading upwards) on an open cylinder, additive, no fog, no depth write
    const cv=document.createElement('canvas');cv.width=4;cv.height=128;const x=cv.getContext('2d'),gr=x.createLinearGradient(0,128,0,0);gr.addColorStop(0,'rgba(255,214,90,.9)');gr.addColorStop(.35,'rgba(255,190,60,.38)');gr.addColorStop(1,'rgba(255,170,40,0)');x.fillStyle=gr;x.fillRect(0,0,4,128);
    const tex=new THREE.CanvasTexture(cv);const bm=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,side:THREE.DoubleSide,toneMapped:false});
    this.beam=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,160,20,1,true),bm);this.beam.position.y=80;this.beam.frustumCulled=false;this.beam.renderOrder=40;g.add(this.beam);
    const gm=new THREE.MeshBasicMaterial({color:0xffd24a,fog:false,toneMapped:false,transparent:true,opacity:.95,depthWrite:false});
    this.gem=new THREE.Mesh(new THREE.OctahedronGeometry(1,0),gm);this.gem.scale.set(.8,1.3,.8);this.gem.position.y=7;this.gem.frustumCulled=false;this.gem.renderOrder=41;g.add(this.gem);
    this.ring=new THREE.Mesh(new THREE.RingGeometry(1.6,2.1,40),new THREE.MeshBasicMaterial({color:0xffd24a,fog:false,toneMapped:false,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=.12;this.ring.frustumCulled=false;this.ring.renderOrder=40;g.add(this.ring);
    scene.add(g);this.grp=g;
    // HUD pill
    const st=document.createElement('style');st.textContent=`#navHud{position:fixed;z-index:30;left:50%;top:max(12px,env(safe-area-inset-top));transform:translate(-50%,-140%);display:flex;align-items:center;gap:10px;padding:7px 8px 7px 12px;border-radius:999px;background:rgba(14,20,28,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#f4f1ea;font:700 14px system-ui,-apple-system,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.14);transition:transform .45s cubic-bezier(.2,1.2,.3,1);pointer-events:auto;max-width:78vw}
#navHud.on{transform:translate(-50%,0)}#navHud i{width:30px;height:30px;border-radius:50%;background:#ffd24a;display:grid;place-items:center;flex:none}#navHud i b{display:block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:15px solid #20180a;transition:transform .1s linear}
#navHud span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#navHud em{font-style:normal;color:#ffd24a;margin-left:4px}#navHud button{border:0;background:rgba(255,255,255,.14);color:#fff;border-radius:50%;width:26px;height:26px;font-size:13px;cursor:pointer;flex:none}
#goNav{position:absolute;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#ffd24a;color:#20180a;border:0;border-radius:16px;padding:12px 22px;font:800 15px system-ui,-apple-system,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.45);z-index:5;cursor:pointer;white-space:nowrap}#goNav[hidden]{display:none}`;document.head.appendChild(st);
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
    if(a){let rel=Math.atan2(this.x-player.x,this.z-player.z)-(typeof cam!=='undefined'?cam.yaw:0);while(rel>Math.PI)rel-=6.283;while(rel<-Math.PI)rel+=6.283;a.style.transform='rotate('+(-rel)+'rad)'}},
  tick(dt){if(!this.on||typeof started==='undefined'||!started)return;this.t+=dt;
    const d=this.dist();if(d<14){this.clear();if(typeof toast==='function')toast('You have arrived',this.name);return}
    // beam and diamond keep a readable size from far away; the marker follows the ground when streets stream in
    const k=Math.max(1,d/90);this.beam.scale.set(k,1,k);this.gem.scale.set(.8*Math.max(1,d/55),1.3*Math.max(1,d/55),.8*Math.max(1,d/55));this.gem.position.y=7+Math.min(40,d/25);this.gem.rotation.y=this.t*1.6;
    this.ring.scale.setScalar(k);this.ring.material.opacity=.55+.3*Math.sin(this.t*3);
    this._u=(this._u||0)-dt;if(this._u<=0){this._u=.12;this.upd()}
    this._g=(this._g||0)-dt;if(this._g<=0){this._g=1;this.grp.position.y=Math.max(groundH(this.x,this.z),(typeof SL!=='undefined'?SL:0))}}
};
