/* ===================================================================================================
   real.js — a real human body for the avatar.
   Model: assets/models/avatar/Man.glb = Quaternius "Universal Base Characters" (CC0) body with its 65-bone skeleton, plus a
   T-shirt, jeans (two lengths + cuffs), sneakers and sole built from the body's own surface in Blender, five hair/beard
   meshes, and the eyes with a blue iris. See assets/IMPORTS.md.

   It is only a SKIN for the avatar that makePlayer() (index.html) already builds: that procedural rig (P.hips, P.spine, P.head,
   P.arms[i].sh/el/hand, P.legs[i].hp/kn/ft, the finger joints of hands.js) is still posed every frame by animPlayer / acts.js /
   hands.js / vehicles.js and is the single source of poses. REAL.tick() reads those joint rotations and copies them onto the
   bones (world-space deltas applied on the bone's rest orientation, so the two skeletons need not share axes), glues the feet
   to the ground the way the procedural legs stand, and the classic meshes are just hidden.
     REAL.attach(P,o)   called by makePlayer when o.real is set; queues until the GLB is loaded
     REAL.tick(P,st,dt) called at the end of animPlayer
   The classic look stays available (Body → "Classic" in the character creator).
   =================================================================================================== */
const REAL={SC:.94,url:'assets/models/avatar/Man.glb',tpl:null,st:0,wait:[],eyeTex:{},
  load(){if(this.st)return;this.st=1;
    try{new THREE.GLTFLoader().load(this.url,g=>{this.tpl=g.scene;this.st=2;const w=this.wait.splice(0);for(const [P,o] of w)if(P.root&&!P.realOff)this.attach(P,o);
        if(typeof CREATOR!=='undefined'&&CREATOR.on)CREATOR.dirty=true},undefined,e=>{this.st=3;console.warn('[real] body failed to load',e)})}catch(e){this.st=3;console.warn('[real]',e)}},
  ready(){return this.st===2},
  // a skinned clone that owns its skeleton (Object3D.clone shares it in r128)
  clone(src){const root=src.clone(true),by={};root.traverse(o=>{if(o.isBone)by[o.name]=o});
    root.traverse(o=>{if(!o.isSkinnedMesh)return;const s0=o.skeleton,bones=s0.bones.map(b=>by[b.name]);o.skeleton=new THREE.Skeleton(bones,s0.boneInverses.map(m=>m.clone()));o.bind(o.skeleton,o.bindMatrix)});
    return root},
  lin(h){const c=new THREE.Color(h);c.convertSRGBToLinear();return c},
  // the iris of the baked eye texture is blue; other colours are painted over it keeping the shading
  eye(img,hex){const k=String(hex).toLowerCase();if(this.eyeTex[k])return this.eyeTex[k];
    try{const W=img.width,H=img.height,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,W,H),p=d.data,
        t=[parseInt(k.slice(1,3),16),parseInt(k.slice(3,5),16),parseInt(k.slice(5,7),16)];
      for(let i=0;i<p.length;i+=4){const r=p[i],gg=p[i+1],b=p[i+2];if(b>r+22&&b>gg+6){const f=.3+((r+gg+b)/3/255)*1.55;p[i]=Math.min(255,t[0]*f);p[i+1]=Math.min(255,t[1]*f);p[i+2]=Math.min(255,t[2]*f)}}
      g.putImageData(d,0,0);const T=new THREE.CanvasTexture(cv);T.flipY=false;T.encoding=THREE.sRGBEncoding;T.anisotropy=4;return this.eyeTex[k]=T}catch(e){return null}},
  attach(P,o){if(!P||!P.root)return;if(!this.tpl){this.wait.push([P,o]);this.load();return}
    if(P.real)this.detach(P);
    const M=this.clone(this.tpl),SC=this.SC,B=[],byN={},par=[],kind=[];
    M.scale.setScalar(SC);M.name='realBody';P.root.add(M);M.updateMatrixWorld(true);
    // bones, parents before children
    const walk=(n,p)=>{let pi=p;if(n.isBone){pi=B.length;B.push(n);byN[n.name]=pi;par.push(p)}for(const c of n.children)walk(c,pi)};
    for(const c of M.children)walk(c,-1);
    const n=B.length,bindL=[],bindW=[],Hb=[],Qw=[],D=[],tm=new THREE.Matrix4(),tq=new THREE.Quaternion(),ts=new THREE.Vector3();
    for(let i=0;i<n;i++){bindL.push(B[i].quaternion.clone());Qw.push(new THREE.Quaternion());D.push(new THREE.Quaternion());
      tm.identity();for(let o2=B[i];o2&&o2!==M;o2=o2.parent){o2.updateMatrix();tm.premultiply(o2.matrix)}
      const h=new THREE.Vector3();tm.decompose(h,tq,ts);Hb.push(h);bindW.push(tq.clone())}
    const R={M,B,n,par,kind,bindL,bindW,Hb,Qw,D,idx:byN,sides:[]};
    // which procedural joint steers which bone (kind codes: 1 pelvis, 2/3/4 spine, 5 neck, 6 head, 7 clavicle, 8 upper arm, 9 forearm, 10 hand, 11 thigh, 12 calf, 13 foot, 20+ fingers)
    for(let i=0;i<n;i++)kind.push(0);
    const set=(nm,k)=>{const i=byN[nm];if(i!==undefined)kind[i]=k;return i};
    R.iPel=set('pelvis',1);set('spine_01',2);set('spine_02',3);set('spine_03',4);set('neck_01',5);set('Head',6);
    for(const sd of ['l','r']){const ua=byN['upperarm_'+sd],th=byN['thigh_'+sd];const sg=Hb[ua].x>0?1:-1;
      const arm=P.arms.find(A=>A.s===sg),leg=P.legs.find(g=>g.s===sg);
      const S={sg,arm,leg,cl:set('clavicle_'+sd,7),ua:set('upperarm_'+sd,8),la:set('lowerarm_'+sd,9),ha:set('hand_'+sd,10),th:set('thigh_'+sd,11),ca:set('calf_'+sd,12),ft:set('foot_'+sd,13),ba:byN['ball_'+sd],fing:[]};
      ['index','middle','ring','pinky'].forEach((f,fi)=>{for(let j=1;j<=3;j++){const i=byN[f+'_0'+j+'_'+sd];if(i!==undefined){kind[i]=20+j;S.fing.push({i,j,f:fi,th:false})}}});
      for(let j=1;j<=3;j++){const i=byN['thumb_0'+j+'_'+sd];if(i!==undefined){kind[i]=20+j;S.fing.push({i,j,f:4,th:true})}}
      // sole points of the foot at rest (the heel under and behind the ankle, the ball of the foot), in model space
      const fo=Hb[S.ft],bl=Hb[S.ba];S.hv=new THREE.Vector3(0,-fo.y,-.10-fo.z);S.tv=new THREE.Vector3().subVectors(bl,fo);S.tv.y-=.0152;
      R.sides.push(S)}
    // sole of the classic shoe (to plant the feet where the procedural legs plant them)
    {const ft=P.legs[0].ft,sm=ft.children.find(c=>c.isMesh&&c.geometry&&c.geometry.attributes.position);let y0=-.07,zh=-.04,zt=.14;
      if(sm){sm.geometry.computeBoundingBox();const bb=sm.geometry.boundingBox;y0=bb.min.y;zh=bb.min.z+.03;zt=bb.max.z-.03}
      R.sole=[y0,zh,zt]}
    // materials by name
    const mats={},get=nm=>mats[nm];
    M.traverse(o3=>{if(!o3.isMesh)return;o3.frustumCulled=false;o3.castShadow=true;o3.receiveShadow=false;
      const m=o3.material=mats[o3.material.name]||(mats[o3.material.name]=o3.material.clone());m.side=THREE.FrontSide;m.metalness=0;m.envMapIntensity=.5;
      if(m.name==='shirt'||m.name==='jeans'||m.name==='cuff'||m.name==='brow')m.side=THREE.DoubleSide;
      if(o3.name==='Body'||o3.name==='Eyes')R[o3.name]=o3;o3.userData.real=1});
    this.paint(R,P,o);
    // the procedural body is hidden, held things and head/neck/back extras stay (moved onto the new bones below)
    for(const c of [P.can,P.speaker].concat(P.accH||[],P.accS||[]))if(c)c.userData.keep=1;
    R.hidden=[];P.hips.traverse(c=>{if(c.isMesh&&c.visible&&!REAL.kept(c,P)){c.visible=false;R.hidden.push(c)}});
    P.real=R;R.o=o;this.mount(P,R);
    // pose now, so the first frame is right even if the caller never ticks
    this.tick(P,{mode:'walk',spd:0},0);return R},
  kept(c,P){for(let p=c;p&&p!==P.hips;p=p.parent)if(p.userData&&p.userData.keep)return true;return false},
  detach(P){const R=P.real;if(!R)return;P.root.remove(R.M);const seen=new Set();R.M.traverse(c=>{if(c.isMesh&&c.material&&!seen.has(c.material)){seen.add(c.material);c.material.dispose()}});P.real=null;
    for(const c of R.hidden)c.visible=true},
  // colours, shown parts
  paint(R,P,o){const M=R.M,SC=this.SC;o=o||{};const find=nm=>{let r=null;M.traverse(c=>{if(c.name===nm)r=c});return r},sh=(nm,v)=>{const c=find(nm);if(c)c.visible=v};
    const mat={};M.traverse(c=>{if(c.isMesh)mat[c.material.name]=c.material});
    // skin: the texture is baked around #f2c9a6, other tones tint it
    if(mat.skin){const u=this.lin(o.skin||'#f2c9a6'),d=this.lin('#f2c9a6');mat.skin.color.setRGB(Math.min(1.6,u.r/d.r),Math.min(1.6,u.g/d.g),Math.min(1.6,u.b/d.b));mat.skin.roughness=.62;if(mat.skin.normalScale)mat.skin.normalScale.set(.85,.85);
      if(typeof bdSkinRim==='function')bdSkinRim(mat.skin)}
    if(mat.eyes){const t=mat.eyes.map;if(t&&t.image&&o.iris&&o.iris.toLowerCase()!=='#3b7fd4'){const T=this.eye(t.image,o.iris);if(T)mat.eyes.map=T}mat.eyes.roughness=.18}
    if(mat.brow)mat.brow.color.copy(this.lin(o.brow||'#b88a3e'));
    if(mat.hair){mat.hair.color.copy(this.lin(o.hair===undefined?0xe6c477:o.hair)).multiplyScalar(1.22);mat.hair.roughness=.62}
    if(mat.shirt){mat.shirt.color.copy(this.lin(o.shirt===undefined?0xd9c9a3:o.shirt));mat.shirt.roughness=.88}
    if(mat.jeans){mat.jeans.color.copy(this.lin(o.jeans===undefined?0x7ea3cc:o.jeans));mat.jeans.roughness=.92}
    if(mat.cuff){mat.cuff.color.copy(this.lin(o.cuff===undefined?0xb9d0e8:o.cuff));mat.cuff.roughness=.92}
    if(mat.shoe){mat.shoe.color.copy(this.lin(o.shoe===undefined?0xf6f6f2:o.shoe));mat.shoe.roughness=.55}
    if(mat.sole){mat.sole.color.copy(this.lin(o.sole===undefined?0xf08a24:o.sole));mat.sole.roughness=.7}
    // which clothes and hair
    const bs=o.bs||'jeans',hs=o.hs||'swept',ht=o.ht||'none',hat=ht==='cap'||ht==='beanie'||ht==='bucket';
    sh('JeansHi',bs!=='skirt');sh('JeansLo',bs==='jeans'||bs==='jogger');sh('Cuff',bs==='jeans'||bs==='jogger');
    const hmap={swept:'HairParted',short:'HairParted',buzz:'HairBuzzed',long:'HairLong',bun:'HairBuns',pony:'HairLong',mohawk:'HairBuzzed',curly:'HairBuns'};
    for(const k of ['HairParted','HairBuzzed','HairLong','HairBuns'])sh(k,false);
    if(hs!=='bald'&&!hat)sh(hmap[hs]||'HairParted',true);
    sh('Beard',o.bd==='beard');
  },
  // things that belong on the head / chest / hand of the classic rig are carried by the new bones
  mount(P,R){const SC=this.SC,Hb=R.Hb,iH=R.idx.Head,iS=R.idx.spine_03,iN=R.idx.neck_01;
    const wrap=(bi,off,sc)=>{const w=new THREE.Object3D();const iq=R.bindW[bi].clone().invert();w.quaternion.copy(iq);w.position.copy(off.clone().applyQuaternion(iq));w.scale.setScalar(sc/SC);R.B[bi].add(w);R.wr=(R.wr||[]).concat([w]);return w};
    const headExtras=P.accH||[],spineExtras=P.accS||[];
    if(headExtras.length){const w=wrap(iH,new THREE.Vector3(0,-.02,.004),.76);for(const c of headExtras)w.add(c)}
    if(spineExtras.length){const ks=.9,off=new THREE.Vector3().subVectors(Hb[iN],Hb[iS]);off.y-=.49*ks/SC;const w=wrap(iS,off,ks);for(const c of spineExtras)w.add(c)}
    // the can and the speaker sit in the hands: the wrapper's origin is the wrist
    for(const S of R.sides){const A=S.arm;if(!A)continue;const items=[];if(P.can&&P.can.parent===A.el)items.push(P.can);if(P.speaker&&P.speaker.parent===A.el)items.push(P.speaker);
      if(!items.length)continue;const w=wrap(S.ha,new THREE.Vector3(0,0,0),1);for(const it of items){const p=it.position.clone();w.add(it);it.position.set(p.x,p.y+.205-.02,p.z)}}
  },
  // ---- every frame: copy the procedural pose onto the bones
  tick(P,st,dt){const R=P.real;if(!R||!R.M)return;const SC=this.SC,Hb=R.Hb,Qw=R.Qw,D=R.D,B=R.B,n=R.n,kind=R.kind,bindL=R.bindL,bindW=R.bindW,par=R.par;
    const Wh=RT.a.copy(P.hips.quaternion),Ws=RT.b.copy(Wh).multiply(P.spine.quaternion),Wd=RT.c.copy(Ws).multiply(P.head.quaternion);
    const rel=RT.d.copy(Wh).invert().multiply(Ws);
    // deltas of the single bones
    D[R.iPel].copy(Wh);
    const s1=R.idx.spine_01,s2=R.idx.spine_02,s3=R.idx.spine_03,nk=R.idx.neck_01,hd=R.idx.Head;
    const lw=P._leanW||0;      // while an act leans over a worktop the whole back follows the classic rig's bow, otherwise the GLB shoulders stay ~25 cm higher than the classic ones the arm IK was solved for and the hands miss
    if(s1!==undefined)D[s1].copy(Wh).multiply(RT.e.copy(RQ1).slerp(rel,.3+.7*lw));
    if(s2!==undefined)D[s2].copy(Wh).multiply(RT.e.copy(RQ1).slerp(rel,.65+.35*lw));
    if(s3!==undefined)D[s3].copy(Ws);
    if(nk!==undefined)D[nk].copy(Ws).slerp(Wd,.5);
    if(hd!==undefined)D[hd].copy(Wd);
    // legs: forward kinematics of the procedural side (root space) for where its soles are
    const hp=P.hips.position;let lowP=1e9;
    for(const S of R.sides){const A=S.arm,G=S.leg;
      if(A){const Wsh=RT.f.copy(Ws).multiply(A.sh.quaternion),Wel=RT.g.copy(Wsh).multiply(A.el.quaternion),Whd=RT.h.copy(Wel).multiply(A.hand.quaternion);
        D[S.cl].copy(Ws).multiply(RT.e.copy(RQ1).slerp(RT.i.copy(Ws).invert().multiply(Wsh),.12));
        D[S.ua].copy(Wsh);D[S.la].copy(Wel);D[S.ha].copy(Whd);
        const rg=A.hand.userData&&A.hand.userData.rig;
        if(rg){const c=rg.cur;
          for(const f of S.fing){const k=c[f.f];let a;
            if(f.th){const a1=.12+.75*k,a2=.2+.95*k;a=f.j===1?.5*a1:(f.j===2?.5*a1+.5*a2:.5*a1+.9*a2)}
            else a=f.j===1?1.35*k:(f.j===2?3.0*k:4.05*k);
            RT.e.setFromAxisAngle(RAXZ,-S.sg*a);D[f.i].copy(Whd).multiply(RT.e)}}
        else for(const f of S.fing)D[f.i].copy(Whd)}
      if(G){const Whp=RT.f.copy(Wh).multiply(G.hp.quaternion),Wkn=RT.g.copy(Whp).multiply(G.kn.quaternion),Wft=RT.h.copy(Wkn).multiply(G.ft.quaternion);
        D[S.th].copy(Whp);D[S.ca].copy(Wkn);D[S.ft].copy(Wft);
        // procedural sole height
        RV.a.copy(G.hp.position).applyQuaternion(Wh).add(hp);RV.a.add(RV.b.copy(G.kn.position).applyQuaternion(Whp));RV.a.add(RV.b.copy(G.ft.position).applyQuaternion(Wkn));
        const y0=R.sole[0];RV.b.set(0,y0,R.sole[1]).applyQuaternion(Wft);if(RV.a.y+RV.b.y<lowP)lowP=RV.a.y+RV.b.y;RV.b.set(0,y0,R.sole[2]).applyQuaternion(Wft);if(RV.a.y+RV.b.y<lowP)lowP=RV.a.y+RV.b.y}}
    // pelvis position: sideways sway of the classic hips, height so the soles land where the classic soles are (or on the seat when sitting)
    const seat=st&&RSEAT[st.mode],ip=R.iPel;
    RPEL.set(Hb[ip].x+hp.x/SC,Hb[ip].y,Hb[ip].z+hp.z/SC);
    let dy=0;
    if(seat)dy=(hp.y+(RKSEAT[st.mode]||0))/SC-Hb[ip].y;
    else{let low=1e9;
      for(const S of R.sides){if(!S.leg)continue;RV.a.copy(Hb[S.th]).sub(Hb[ip]).applyQuaternion(D[ip]);RV.a.add(RPEL);
        RV.a.add(RV.b.copy(Hb[S.ca]).sub(Hb[S.th]).applyQuaternion(D[S.th]));RV.a.add(RV.b.copy(Hb[S.ft]).sub(Hb[S.ca]).applyQuaternion(D[S.ca]));
        RV.b.copy(S.hv).applyQuaternion(D[S.ft]);if(RV.a.y+RV.b.y<low)low=RV.a.y+RV.b.y;RV.b.copy(S.tv).applyQuaternion(D[S.ft]);if(RV.a.y+RV.b.y<low)low=RV.a.y+RV.b.y}
      dy=low<1e8&&lowP<1e8?lowP/SC-low:0}
    // bone rotations, parents first
    const solve=()=>{for(let i=0;i<n;i++){const k=kind[i],p=par[i];
      if(!k){if(p<0)Qw[i].copy(bindW[i]);else Qw[i].copy(Qw[p]).multiply(bindL[i]);continue}
      Qw[i].copy(D[i]).multiply(bindW[i]);
      if(p<0)B[i].quaternion.copy(Qw[i]);else B[i].quaternion.copy(RT.a.copy(Qw[p]).invert().multiply(Qw[i]))}};
    solve();
    // pelvis moves in its parent's frame
    {const p=par[ip];RV.a.set(hp.x/SC,dy,hp.z/SC);if(p>=0)RV.a.applyQuaternion(RT.a.copy(Qw[p]).invert());B[ip].position.copy(R.p0||(R.p0=B[ip].position.clone())).add(RV.a)}
    if(lw>.02){this.armIK(P,R,lw);solve()}
  },
  // while an act is on (acts.js sets P._leanW), the classic arm has already reached the target for ITS shoulder; the GLB shoulder sits higher, so aim the GLB upper arm and forearm at the classic wrist
  // (two-bone solve in root space, elbow bending the way the classic elbow does); held props and the soap foam ride on the classic hand, which is now where the GLB hand is
  armIK(P,R,lw){const SC=this.SC,Hb=R.Hb,D=R.D,B=R.B,root=P.root;root.updateMatrixWorld(true);
    const Ws=RT.b.copy(P.hips.quaternion).multiply(P.spine.quaternion);
    for(const S of R.sides){const A=S.arm;if(!A)continue;
      const Wsh=RK.q1.copy(Ws).multiply(A.sh.quaternion),Wel=RK.q2.copy(Wsh).multiply(A.el.quaternion);
      B[S.ua].getWorldPosition(RK.s);root.worldToLocal(RK.s);A.hand.getWorldPosition(RK.t);root.worldToLocal(RK.t);A.el.getWorldPosition(RK.e);root.worldToLocal(RK.e);
      const rUA=RK.r1.subVectors(Hb[S.la],Hb[S.ua]),rLA=RK.r2.subVectors(Hb[S.ha],Hb[S.la]),L1=rUA.length()*SC,L2=rLA.length()*SC;rUA.normalize();rLA.normalize();
      const v=RK.v.subVectors(RK.t,RK.s);let d=v.length();if(d<1e-4)continue;v.multiplyScalar(1/d);d=Math.min(Math.max(d,Math.abs(L1-L2)+.01),L1+L2-.002);
      const a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a));
      RK.p.subVectors(RK.e,RK.s);RK.p.addScaledVector(v,-RK.p.dot(v));if(RK.p.lengthSq()<1e-6){RK.p.set(0,-1,0);RK.p.addScaledVector(v,-RK.p.dot(v))}RK.p.normalize();
      RK.el.copy(RK.s).addScaledVector(v,a).addScaledVector(RK.p,h);
      const du=RK.d1.subVectors(RK.el,RK.s).normalize(),hand=RK.hd.copy(RK.s).addScaledVector(v,d),dl=RK.d2.subVectors(hand,RK.el).normalize();
      RK.q3.setFromUnitVectors(RK.r3.copy(rUA).applyQuaternion(Wsh),du).multiply(Wsh);D[S.ua].slerp(RK.q3,lw);
      RK.q4.setFromUnitVectors(RK.r3.copy(rLA).applyQuaternion(Wel),dl).multiply(Wel);D[S.la].slerp(RK.q4,lw)}}};
const RK={s:new THREE.Vector3(),t:new THREE.Vector3(),e:new THREE.Vector3(),v:new THREE.Vector3(),p:new THREE.Vector3(),el:new THREE.Vector3(),hd:new THREE.Vector3(),d1:new THREE.Vector3(),d2:new THREE.Vector3(),r1:new THREE.Vector3(),r2:new THREE.Vector3(),r3:new THREE.Vector3(),q1:new THREE.Quaternion(),q2:new THREE.Quaternion(),q3:new THREE.Quaternion(),q4:new THREE.Quaternion()};
const RT={a:new THREE.Quaternion(),b:new THREE.Quaternion(),c:new THREE.Quaternion(),d:new THREE.Quaternion(),e:new THREE.Quaternion(),f:new THREE.Quaternion(),g:new THREE.Quaternion(),h:new THREE.Quaternion(),i:new THREE.Quaternion()},
  RV={a:new THREE.Vector3(),b:new THREE.Vector3()},RQ1=new THREE.Quaternion(),RAXZ=new THREE.Vector3(0,0,1),RPEL=new THREE.Vector3(),
  RSEAT={sit:1,suv:1,drive:1,bike:1},RKSEAT={sit:.0,suv:.0,drive:.0,bike:.0};

// fetch the body shortly after the page is up, so it is ready when the character creator or the first frame needs it
addEventListener('load',()=>setTimeout(()=>REAL.load(),1200));
