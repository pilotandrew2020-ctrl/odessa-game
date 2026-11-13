/* ===================================================================================================
   look.js — "my look": your own face from a photo on the realistic avatar, plus the capybara tee.
   - The photo NEVER leaves the device: it is cut down to a 512 px face crop, evened out in lighting and kept in localStorage ('od_face').
     Nothing is uploaded, nothing is added to the repository; friends in co-op do not see it (their copy of the game does not have it).
   - Face: the crop is projected onto the front of the head in the avatar's own model space (so it follows the head), faded out at the
     edges and where the surface turns away. 2026-11-12: you place ONE big circle on the face (move it, size slider, tilt slider); the eyes are
     derived from it (face height = circle, eyes .38 R above its centre, .7 R apart). The photo is cleaned first: skin tone = the median of the
     skin-coloured pixels inside the circle (no hair / eyes / lips / background in it, never darker than a floor, so no "black" face), hair and
     background inside the oval are painted over with that skin tone, the lighting is flattened with a skin-only blur, and the shader paints the
     face RELATIVE to that median onto the avatar's own skin (so face, neck and hands always match). The photo's own eyes/brows are used.
   - Capybara tee: the "Capybara tee" top (code 6) is printed from two small textures (assets/textures/tee_capybara_*.jpg): the front
     picture on the chest, a splash pattern (triplanar, mirrored tiles) on sleeves, sides and back.
   REAL.paint() calls LOOK.paint(); the creator has a "Face photo" tab (LOOK.panel).
   =================================================================================================== */
const LOOK={
  KEY:'od_face',face:null,_tex:{},
  // model-space facts of assets/models/avatar/Man.glb (metres, before REAL.SC): eyes at y 1.6985, +-.0338 apart; the character faces +z, +x is its left
  EY:1.6985,EYD:.0676,
  load(){try{this.face=JSON.parse(localStorage.getItem(this.KEY)||'null')}catch(e){this.face=null}if(this.face&&!(this.face.img&&this.face.eL&&this.face.eR))this.face=null;return this.face},
  save(){try{if(this.face)localStorage.setItem(this.KEY,JSON.stringify(this.face));else localStorage.removeItem(this.KEY);return true}catch(e){console.warn('[look] the photo could not be stored',e);return false}},
  has(){return !!this.face},
  hexInt(h){return parseInt(String(h).replace('#',''),16)||0},
  // ---- textures
  texFrom(url,opts){const t=new THREE.Texture(),im=new Image();im.onload=()=>{t.image=im;t.needsUpdate=true};im.crossOrigin='anonymous';im.src=url;
    t.flipY=false;t.anisotropy=4;if(opts&&opts.mirror){t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping}return t},
  faceTex(){const f=this.face;if(!f)return null;if(this._tex.faceFor!==f.img){if(this._tex.face)this._tex.face.dispose();this._tex.face=this.texFrom(f.img);this._tex.faceFor=f.img}return this._tex.face},
  teeTex(){if(!this._tex.tf){this._tex.tf=this.texFrom('assets/textures/tee_capybara_front.jpg');this._tex.ts=this.texFrom('assets/textures/tee_capybara_splash.jpg',{mirror:true})}return [this._tex.tf,this._tex.ts]},
  // ---- shader patch: gives the material the bind-pose position / normal (so a projection sticks to the body while it moves), then runs `main` after the map
  patch(mat,key,uni,pars,main){const prev=mat.onBeforeCompile,pk=mat.customProgramCacheKey?mat.customProgramCacheKey():'';
    mat.onBeforeCompile=(sh,r)=>{if(prev)prev.call(mat,sh,r);Object.assign(sh.uniforms,uni);
      if(sh.vertexShader.indexOf('vMP')<0)sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMP;varying vec3 vMN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMP=position;vMN=normal;');
      if(sh.fragmentShader.indexOf('varying vec3 vMP')<0)sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMP;varying vec3 vMN;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+pars).replace('#include <map_fragment>','#include <map_fragment>\n'+main)};
    mat.customProgramCacheKey=()=>pk+key;mat.needsUpdate=true},
  // ---- called by REAL.paint(R,P,o) with the avatar's materials by name
  paint(R,mat,P,o){if(!o)return;
    if(o.capy&&mat.shirt){const [tf,ts]=this.teeTex();mat.shirt.color.setRGB(1,1,1);
      this.patch(mat.shirt,'|capytee',{uTF:{value:tf},uTS:{value:ts}},'uniform sampler2D uTF;uniform sampler2D uTS;',
        'vec3 tp=vMP,tn=normalize(vMN);float wz=tn.z*tn.z;'+
        'vec3 sxy=pow(texture2D(uTS,tp.xy*2.3+vec2(.3,.0)).rgb,vec3(2.2));vec3 szy=pow(texture2D(uTS,vec2(tp.z*2.3+.17,tp.y*2.3)).rgb,vec3(2.2));'+
        'vec3 tbase=mix(szy,sxy,wz);vec2 fuv=vec2((tp.x+.215)/.43,(1.505-tp.y)/.505);'+
        'float tin=step(0.,fuv.x)*step(fuv.x,1.)*step(0.,fuv.y)*step(fuv.y,1.)*smoothstep(.15,.55,tn.z);'+
        'diffuseColor.rgb=mix(tbase,pow(texture2D(uTF,fuv).rgb,vec3(2.2)),tin);')}
    if(o.photo&&this.face&&mat.skin){const f=this.face,t=this.faceTex(),d=Math.hypot(f.eR[0]-f.eL[0],f.eR[1]-f.eL[1])||1,a=Math.atan2(f.eR[1]-f.eL[1],f.eR[0]-f.eL[0]);
      const rel=!!f.med,mc=rel?new THREE.Color().setRGB(f.med[0]/255,f.med[1]/255,f.med[2]/255).convertSRGBToLinear():null;
      this.patch(mat.skin,rel?'|face2':'|face',{uFMed:{value:mc||new THREE.Color(1,1,1)},uFT:{value:t},uFMid:{value:new THREE.Vector2((f.eL[0]+f.eR[0])/2,(f.eL[1]+f.eR[1])/2)},uFSz:{value:new THREE.Vector2(f.w,f.h)},uFS:{value:d/this.EYD},uFCos:{value:Math.cos(a)},uFSin:{value:Math.sin(a)}},
        'uniform sampler2D uFT;uniform vec3 uFMed;uniform vec2 uFMid;uniform vec2 uFSz;uniform float uFS;uniform float uFCos;uniform float uFSin;',
        // photo pixel for this surface point (eyes level, image y down), oval mask (wider above the eyes than below), fade where the skin turns from the camera
        'vec2 frel=vec2(vMP.x,-(vMP.y-'+this.EY.toFixed(4)+'))*uFS;vec2 fpp=uFMid+vec2(frel.x*uFCos-frel.y*uFSin,frel.x*uFSin+frel.y*uFCos);'+
        'float fdy=vMP.y-1.665;float fry=fdy>0.?.115:.078;float fm=(1.-smoothstep(.7,1.,length(vec2(vMP.x/.078,fdy/fry))))*smoothstep(.25,.7,vMN.z);'+
        'vec3 fph=pow(texture2D(uFT,fpp/uFSz).rgb,vec3(2.2));'+(rel?'fph=diffuseColor.rgb*clamp(fph/max(uFMed,vec3(.02)),vec3(.1),vec3(1.8));':'')+'diffuseColor.rgb=mix(diffuseColor.rgb,fph,fm);');
      if(R.Eyes)R.Eyes.visible=false;R.M.traverse(c=>{if(c.name==='Brows')c.visible=false})}},
  // ---- the avatar options for your own character: skin and hair from the photo
  opts(o){const f=this.face;if(!f)return o;o.photo=true;if(f.skin)o.skin=f.skin;if(f.hair){const h=this.hexInt(f.hair);o.hair=h;o.hair2=this.shade(h,1.18);o.brow=f.hair}return o},
  shade(h,k){return (Math.min(255,Math.round(((h>>16)&255)*k))<<16)|(Math.min(255,Math.round(((h>>8)&255)*k))<<8)|Math.min(255,Math.round((h&255)*k))},
  // ---- turn a picture + ONE circle on the face (centre cx,cy and radius R = half the face height, image px; rot = tilt in radians) into the stored record
  process(img,ring){
    const R=ring.R,rot=ring.rot||0,cs=Math.cos(rot),sn=Math.sin(rot),d=.70*R,mx=ring.cx+.38*R*sn,my=ring.cy-.38*R*cs;       // the eyes: .38 R above the centre, .7 R apart
    const eL0=[mx-d/2*cs,my-d/2*sn],eR0=[mx+d/2*cs,my+d/2*sn];
    const side=Math.max(60,d*5.4),ccx=mx,ccy=my+d*.35,k=512/side,N=512;
    const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#8a6a58';g.fillRect(0,0,N,N);
    g.drawImage(img,ccx-side/2,ccy-side/2,side,side,0,0,N,N);
    const e1=[(eL0[0]-ccx)*k+N/2,(eL0[1]-ccy)*k+N/2],e2=[(eR0[0]-ccx)*k+N/2,(eR0[1]-ccy)*k+N/2],dd=d*k,rc=[(ring.cx-ccx)*k+N/2,(ring.cy-ccy)*k+N/2],Rc=R*k;
    const A=g.getImageData(0,0,N,N),a=A.data;
    // per pixel: ring-local coordinates (u right, v down, the ring's own tilt removed), oval distance, luma, chroma
    const U=new Float32Array(N*N),V=new Float32Array(N*N),E=new Float32Array(N*N),Y=new Float32Array(N*N),CB=new Float32Array(N*N),CR=new Float32Array(N*N),OUT=new Uint8Array(N*N);   // OUT: this texel lies outside the photo (the circle was dragged over its edge): the fill colour must not count as skin
    for(let y=0,i=0;y<N;y++)for(let x=0;x<N;x++,i++){const dx=x-rc[0],dy=y-rc[1],u=dx*cs+dy*sn,v=-dx*sn+dy*cs;U[i]=u/Rc;V[i]=v/Rc;E[i]=Math.hypot(u/(.8*Rc),v/Rc);
      const sx=ccx-side/2+x/k,sy=ccy-side/2+y/k;if(sx<0||sy<0||sx>=img.width||sy>=img.height)OUT[i]=1;
      const r=a[i*4],gg=a[i*4+1],b=a[i*4+2];Y[i]=.299*r+.587*gg+.114*b;CB[i]=128-.1687*r-.3313*gg+.5*b;CR[i]=128+.5*r-.4187*gg-.0813*b}
    // feature zones (kept from the photo): the two eyes, the brows, the nose, the mouth; everything else that is not skin-coloured is painted over
    const zone=(u,v,cx,cy,rx,ry)=>{const q=Math.hypot((u-cx)/rx,(v-cy)/ry);return q<=1?1:q>=1.35?0:1-(q-1)/.35};
    const feat=i=>Math.max(zone(U[i],V[i],-.35,-.38,.24,.15),zone(U[i],V[i],.35,-.38,.24,.15),zone(U[i],V[i],-.33,-.52,.28,.09),zone(U[i],V[i],.33,-.52,.28,.09),zone(U[i],V[i],0,.1,.17,.28),zone(U[i],V[i],0,.47,.34,.16));
    const FZ=new Float32Array(N*N);for(let i=0;i<N*N;i++)FZ[i]=OUT[i]?0:feat(i);
    // skin tone: median of the skin-coloured pixels in the inner part of the oval, outside the feature zones
    const med=(arr)=>{arr.sort((p,q)=>p-q);return arr[arr.length>>1]};
    let sr=[],sg=[],sb=[],all=[];
    for(let i=0;i<N*N;i+=2){if(E[i]>.62||OUT[i])continue;const f=FZ[i];if(f>.05)continue;const r=a[i*4],gg=a[i*4+1],b=a[i*4+2];all.push([r,gg,b,Y[i]]);
      if(CB[i]>=77&&CB[i]<=127&&CR[i]>=133&&CR[i]<=173&&Y[i]>40&&Y[i]<245){sr.push(r);sg.push(gg);sb.push(b)}}
    let skin;
    if(sr.length>all.length*.12)skin=[med(sr),med(sg),med(sb)];
    else{all.sort((p,q)=>p[3]-q[3]);const lo=Math.floor(all.length*.3),hi=Math.max(lo+1,Math.floor(all.length*.8)),m=all.slice(lo,hi);skin=[0,1,2].map(j=>m.reduce((t,p)=>t+p[j],0)/Math.max(1,m.length))}
    // never black: lift to a floor (a very dark photo / unusual light), cap the brightest
    {const l=.299*skin[0]+.587*skin[1]+.114*skin[2];const kf=l<78?78/Math.max(1,l):l>232?232/l:1;skin=skin.map(v=>Math.min(255,v*kf))}
    const sY=.299*skin[0]+.587*skin[1]+.114*skin[2],sCb=128-.1687*skin[0]-.3313*skin[1]+.5*skin[2],sCr=128+.5*skin[0]-.4187*skin[1]-.0813*skin[2];
    // how skin-like each pixel is (chroma distance to the median, a darkness/brightness window)
    const SK=new Float32Array(N*N);
    for(let i=0;i<N*N;i++){const dc=Math.hypot(CB[i]-sCb,CR[i]-sCr),lr=Y[i]/sY;let w=OUT[i]?0:1-Math.min(1,Math.max(0,(dc-9)/17));if(lr<.5)w*=Math.max(0,(lr-.28)/.22);else if(lr>1.5)w*=Math.max(0,1-(lr-1.5)/.4);
      // forehead above the brows and the temples are where hair (often skin-coloured: brown, blond) gets in: only keep pixels about as bright as the skin there
      if(V[i]<-.6||Math.abs(U[i])>.55){const q=Math.abs(lr-1);w*=q<.16?1:q>.34?0:1-(q-.16)/.18}
      SK[i]=w}
    // hair that touches the top or the sides of the oval (a fringe down to the brows, side locks) is dark and not skin-coloured: flood-fill it from there, so
    // it is painted over even where it lies in the brow zone (brows that are not connected to it stay)
    const HM=new Uint8Array(N*N),Q=new Int32Array(N*N);let qh=0,qt=0;
    const dark=i=>E[i]<1.25&&V[i]<-.25&&SK[i]<.45&&Y[i]/sY<.66;
    for(let i=0;i<N*N;i++)if(dark(i)&&(V[i]<-.72||(Math.abs(U[i])>.62&&V[i]<.35))){HM[i]=1;Q[qt++]=i}
    while(qh<qt){const i=Q[qh++],x=i%N,y=(i/N)|0;for(const j of [x>0?i-1:-1,x<N-1?i+1:-1,y>0?i-N:-1,y<N-1?i+N:-1])if(j>=0&&!HM[j]&&dark(j)){HM[j]=1;Q[qt++]=j}}
    {const T=new Uint8Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let m=0;for(let o=-3;o<=3&&!m;o++){const X=x+o;if(X>=0&&X<N&&HM[y*N+X])m=1}T[y*N+x]=m}
      for(let y=0;y<N;y++)for(let x=0;x<N;x++){let m=0;for(let o=-3;o<=3&&!m;o++){const Yy=y+o;if(Yy>=0&&Yy<N&&T[Yy*N+x])m=1}HM[y*N+x]=m}}
    // flatten the lighting with a blur of the skin pixels only (32x32 cells, weighted), so half a face in shadow evens out but the features stay
    {const G=32,cell=N/G,sumY=new Float32Array(G*G),sumW=new Float32Array(G*G);
      for(let y=0,i=0;y<N;y++)for(let x=0;x<N;x++,i++){if(E[i]>1.15)continue;const w=SK[i]*(1-FZ[i]);if(w<.05)continue;const q=((y/cell)|0)*G+((x/cell)|0);sumY[q]+=Y[i]*w;sumW[q]+=w}
      const lp=new Float32Array(G*G);for(let q=0;q<G*G;q++)lp[q]=sumW[q]>2?sumY[q]/sumW[q]:0;
      // fill empty cells from the nearest filled ones (a few smoothing passes), then 3x3 smooth
      for(let pass=0;pass<12;pass++){let any=false;const nx=new Float32Array(lp);for(let q=0;q<G*G;q++){if(lp[q])continue;const gx=q%G,gy=(q/G)|0;let t=0,n=0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const X=gx+ox,Yy=gy+oy;if(X<0||Yy<0||X>=G||Yy>=G)continue;const v=lp[Yy*G+X];if(v){t+=v;n++}}if(n){nx[q]=t/n;any=true}}lp.set(nx);if(!any)break}
      for(let q=0;q<G*G;q++)if(!lp[q])lp[q]=sY;
      const sm=new Float32Array(G*G);for(let q=0;q<G*G;q++){const gx=q%G,gy=(q/G)|0;let t=0,n=0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const X=gx+ox,Yy=gy+oy;if(X<0||Yy<0||X>=G||Yy>=G)continue;t+=lp[Yy*G+X];n++}sm[q]=t/n}
      const at=(x,y)=>{const fx=Math.max(0,Math.min(G-1.001,x/cell-.5)),fy=Math.max(0,Math.min(G-1.001,y/cell-.5)),ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy;return (sm[iy*G+ix]*(1-tx)+sm[iy*G+ix+1]*tx)*(1-ty)+(sm[(iy+1)*G+ix]*(1-tx)+sm[(iy+1)*G+ix+1]*tx)*ty};
      // apply: lighting gain, then replace the non-skin, non-feature pixels (hair, background, collar, glasses frames) with the skin tone
      for(let y=0,i=0;y<N;y++)for(let x=0;x<N;x++,i++){const gain=Math.pow(Math.max(.72,Math.min(1.4,sY/Math.max(30,at(x,y)))),.85);
        let r=a[i*4]*gain,gg=a[i*4+1]*gain,b=a[i*4+2]*gain;
        const keep=HM[i]?0:Math.max(SK[i],FZ[i]),rep=1-keep;
        if(rep>0){const sh=.9+.2*Math.min(1,Math.max(0,(Y[i]*gain)/sY-.5));r=r*(1-rep)+skin[0]*sh*rep;gg=gg*(1-rep)+skin[1]*sh*rep;b=b*(1-rep)+skin[2]*sh*rep}
        a[i*4]=Math.min(255,r);a[i*4+1]=Math.min(255,gg);a[i*4+2]=Math.min(255,b)}}
    g.putImageData(A,0,0);
    const hex=v=>'#'+v.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');
    // hair: a patch just above the oval, read from the ORIGINAL picture; if it is skin-coloured (bald / short) or the bright background, leave the avatar's own hair colour
    let hair=null;{const og=document.createElement('canvas');og.width=og.height=N;const gg2=og.getContext('2d',{willReadFrequently:true});gg2.drawImage(img,ccx-side/2,ccy-side/2,side,side,0,0,N,N);const O=gg2.getImageData(0,0,N,N).data;
      const px=[];for(let i=0;i<N*N;i+=3){if(OUT[i]||Math.abs(U[i])>.55||V[i]<-1.32||V[i]>-.98)continue;px.push(i)}
      let skinish=0,hr=[],hg=[],hb=[];for(const i of px){const r=O[i*4],gg=O[i*4+1],b=O[i*4+2],y=.299*r+.587*gg+.114*b,cb=128-.1687*r-.3313*gg+.5*b,cr=128+.5*r-.4187*gg-.0813*b;
        if(Math.hypot(cb-sCb,cr-sCr)<12&&Math.abs(y-sY)<45)skinish++;else{hr.push(r);hg.push(gg);hb.push(b)}}
      if(px.length&&skinish/px.length<.5&&hr.length>20){const h3=[med(hr),med(hg),med(hb)],l=.299*h3[0]+.587*h3[1]+.114*h3[2];if(l<225&&Math.hypot(h3[0]-skin[0],h3[1]-skin[1],h3[2]-skin[2])>40)hair=hex(h3.map(x=>x*1.1))}}
    return {v:2,img:c.toDataURL('image/jpeg',.9),w:N,h:N,eL:e1,eR:e2,skin:hex(skin),hair,med:skin.map(v=>Math.round(v))}},
  setFromImage(img,ring,eR){if(Array.isArray(ring)){const eL=ring,d=Math.hypot(eR[0]-eL[0],eR[1]-eL[1])||1,rot=Math.atan2(eR[1]-eL[1],eR[0]-eL[0]),R=d/.7;   // the old two-eye call (a script, an old test): turn it into a circle
        ring={cx:(eL[0]+eR[0])/2-.38*R*Math.sin(rot),cy:(eL[1]+eR[1])/2+.38*R*Math.cos(rot),R,rot}}
    this.face=this.process(img,ring);const ok=this.save();return ok},
  clear(){this.face=null;this.save()},
  // ---- the creator tab
  panel(P,C){
    const el=(t,cls,txt,par)=>{const e=document.createElement(t);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;if(par)par.appendChild(e);return e};
    const st=el('p',null,this.face?'Your face photo is on the avatar. Choose another photo to replace it, or remove it.':'Pick a clear front photo of your face (selfie, looking at the camera). Then put the big circle on your face. The photo stays on this device.',P);st.style.cssText='font-size:13px;line-height:1.45;color:#d5dcdf;margin:6px 0 10px';
    const row=el('div','crLooks',null,P);
    const inp=el('input',null,null,P);inp.type='file';inp.accept='image/*';inp.style.display='none';
    const pick=el('button','crChip','Choose photo',row);pick.onclick=()=>inp.click();
    if(this.face){const rm=el('button','crChip','Remove photo',row);rm.onclick=()=>{this.clear();C.dirty=true;C.renderPanel()}}
    const box=el('div',null,null,P);box.style.cssText='margin-top:10px';
    inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;const url=URL.createObjectURL(f),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);this.marker(box,img,C)};img.onerror=()=>{st.textContent='That file could not be opened as a picture.'};img.src=url};
    return},
  // ONE big circle over a preview of the photo: drag it onto the face (forehead to chin), size and tilt sliders under it
  marker(box,img,C){box.innerHTML='';const S=300,sc=Math.min(S/img.width,S/img.height),W=Math.round(img.width*sc),H=Math.round(img.height*sc),M=Math.min(W,H);
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.style.cssText='width:'+W+'px;height:'+H+'px;max-width:100%;touch-action:none;border-radius:8px;display:block;margin:0 auto 8px;cursor:grab';box.appendChild(cv);
    const g=cv.getContext('2d');const st={x:W/2,y:H*.45,R:M*.3,rot:0};let drag=null,pin=null;const ptr=new Map();
    const draw=()=>{g.clearRect(0,0,W,H);g.drawImage(img,0,0,W,H);
      // dim everything outside the face oval, then the oval, the eye line and the big dot
      g.save();g.fillStyle='rgba(8,14,18,.55)';g.beginPath();g.rect(0,0,W,H);g.save();g.translate(st.x,st.y);g.rotate(st.rot);g.scale(.8,1);g.moveTo(st.R,0);g.arc(0,0,st.R,0,6.283);g.restore();g.fill('evenodd');g.restore();
      g.save();g.translate(st.x,st.y);g.rotate(st.rot);g.lineWidth=3;g.strokeStyle='#f2c14e';g.beginPath();g.ellipse(0,0,.8*st.R,st.R,0,0,6.283);g.stroke();
      g.lineWidth=1.5;g.setLineDash([5,5]);g.beginPath();g.moveTo(-.8*st.R,-.38*st.R);g.lineTo(.8*st.R,-.38*st.R);g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(56,228,208,.9)';g.beginPath();g.arc(0,0,Math.max(9,st.R*.12),0,6.283);g.fill();g.strokeStyle='#04252b';g.lineWidth=2;g.beginPath();g.arc(0,0,Math.max(9,st.R*.12),0,6.283);g.stroke();g.restore()};
    const at=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]};
    const clampSt=()=>{st.R=Math.max(M*.08,Math.min(M*.62,st.R));st.x=Math.max(0,Math.min(W,st.x));st.y=Math.max(0,Math.min(H,st.y))};
    cv.addEventListener('pointerdown',e=>{const q=at(e);ptr.set(e.pointerId,q);try{cv.setPointerCapture(e.pointerId)}catch(x){}
      if(ptr.size===1)drag=[q[0]-st.x,q[1]-st.y];else if(ptr.size===2){const [a,b]=[...ptr.values()];pin={d:Math.hypot(a[0]-b[0],a[1]-b[1]),R:st.R};drag=null}e.preventDefault()});
    cv.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;const q=at(e);ptr.set(e.pointerId,q);
      if(ptr.size>=2&&pin){const [a,b]=[...ptr.values()];st.R=pin.R*Math.hypot(a[0]-b[0],a[1]-b[1])/Math.max(10,pin.d);clampSt();szs.value=Math.round(st.R/M*100)}
      else if(drag){st.x=q[0]-drag[0];st.y=q[1]-drag[1];clampSt()}draw()});
    for(const k of ['pointerup','pointercancel'])cv.addEventListener(k,e=>{ptr.delete(e.pointerId);pin=null;drag=null;if(ptr.size===1){const q=[...ptr.values()][0];drag=[q[0]-st.x,q[1]-st.y]}});
    cv.addEventListener('wheel',e=>{st.R*=e.deltaY>0?.95:1.05;clampSt();szs.value=Math.round(st.R/M*100);draw();e.preventDefault()},{passive:false});
    const row=(label,min,max,val,fn)=>{const r=document.createElement('label');r.style.cssText='display:flex;align-items:center;gap:8px;font-size:12px;color:#a9bcc2;margin:0 0 6px';const t=document.createElement('span');t.textContent=label;t.style.cssText='width:44px';const s=document.createElement('input');s.type='range';s.min=min;s.max=max;s.value=val;s.style.cssText='flex:1';s.oninput=()=>{fn(+s.value);draw()};r.appendChild(t);r.appendChild(s);box.appendChild(r);return s};
    const szs=row('Size',8,62,Math.round(st.R/M*100),v=>{st.R=v/100*M;clampSt()});
    row('Tilt',-30,30,0,v=>{st.rot=v*Math.PI/180});
    draw();
    const tip=document.createElement('p');tip.textContent='Drag the big circle onto the face so it reaches from the forehead to the chin (slide with a finger, pinch or use the sliders). The dashed line is the eye line.';tip.style.cssText='font-size:12px;color:#a9bcc2;text-align:center;margin:4px 0 8px';box.appendChild(tip);
    const ok=document.createElement('button');ok.className='crChip';ok.textContent='Use this photo';ok.style.cssText='display:block;margin:0 auto';box.appendChild(ok);
    ok.onclick=()=>{this.setFromImage(img,{cx:st.x/sc,cy:st.y/sc,R:st.R/sc,rot:st.rot});C.dirty=true;C.renderPanel()}}
};
LOOK.load();
