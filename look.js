/* ===================================================================================================
   look.js — "my look": your own face from a photo on the realistic avatar, plus the capybara tee.
   - The photo NEVER leaves the device: it is cut down to a 512 px face crop, evened out in lighting and kept in localStorage ('od_face').
     Nothing is uploaded, nothing is added to the repository; friends in co-op do not see it (their copy of the game does not have it).
   - Face: the crop is projected onto the front of the head in the avatar's own model space (so it follows the head), faded out at the
     edges and where the surface turns away; you mark the two eyes once, that sets size, position and tilt. The photo's own eyes/brows are
     used, so the 3D eyes and brows are hidden. Skin tone and hair colour are taken from the photo.
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
      this.patch(mat.skin,'|face',{uFT:{value:t},uFMid:{value:new THREE.Vector2((f.eL[0]+f.eR[0])/2,(f.eL[1]+f.eR[1])/2)},uFSz:{value:new THREE.Vector2(f.w,f.h)},uFS:{value:d/this.EYD},uFCos:{value:Math.cos(a)},uFSin:{value:Math.sin(a)}},
        'uniform sampler2D uFT;uniform vec2 uFMid;uniform vec2 uFSz;uniform float uFS;uniform float uFCos;uniform float uFSin;',
        // photo pixel for this surface point (eyes level, image y down), oval mask (wider above the eyes than below), fade where the skin turns from the camera
        'vec2 frel=vec2(vMP.x,-(vMP.y-'+this.EY.toFixed(4)+'))*uFS;vec2 fpp=uFMid+vec2(frel.x*uFCos-frel.y*uFSin,frel.x*uFSin+frel.y*uFCos);'+
        'float fdy=vMP.y-1.665;float fry=fdy>0.?.115:.078;float fm=(1.-smoothstep(.7,1.,length(vec2(vMP.x/.078,fdy/fry))))*smoothstep(.25,.7,vMN.z);'+
        'diffuseColor.rgb=mix(diffuseColor.rgb,pow(texture2D(uFT,fpp/uFSz).rgb,vec3(2.2)),fm);');
      if(R.Eyes)R.Eyes.visible=false;R.M.traverse(c=>{if(c.name==='Brows')c.visible=false})}},
  // ---- the avatar options for your own character: skin and hair from the photo
  opts(o){const f=this.face;if(!f)return o;o.photo=true;if(f.skin)o.skin=f.skin;if(f.hair){const h=this.hexInt(f.hair);o.hair=h;o.hair2=this.shade(h,1.18);o.brow=f.hair}return o},
  shade(h,k){return (Math.min(255,Math.round(((h>>16)&255)*k))<<16)|(Math.min(255,Math.round(((h>>8)&255)*k))<<8)|Math.min(255,Math.round((h&255)*k))},
  // ---- turn a picture + the two eye positions (image px) into the stored record
  process(img,eL,eR){const d=Math.hypot(eR[0]-eL[0],eR[1]-eL[1]),mx=(eL[0]+eR[0])/2,my=(eL[1]+eR[1])/2,side=Math.max(60,d*5.4),cx=mx,cy=my+d*.35,k=512/side;
    const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#8a6a58';g.fillRect(0,0,512,512);
    g.drawImage(img,cx-side/2,cy-side/2,side,side,0,0,512,512);
    const e1=[(eL[0]-cx)*k+256,(eL[1]-cy)*k+256],e2=[(eR[0]-cx)*k+256,(eR[1]-cy)*k+256],dd=d*k;
    // even out the lighting: divide by a heavily blurred copy (a 16 px thumbnail scaled back up)
    const sm=document.createElement('canvas');sm.width=sm.height=16;sm.getContext('2d').drawImage(c,0,0,16,16);
    const bl=document.createElement('canvas');bl.width=bl.height=512;const bg=bl.getContext('2d',{willReadFrequently:true});bg.imageSmoothingEnabled=true;bg.imageSmoothingQuality='high';bg.drawImage(sm,0,0,512,512);
    const A=g.getImageData(0,0,512,512),B=bg.getImageData(0,0,512,512),a=A.data,b=B.data;let avg=0,n=0;
    for(let i=0;i<a.length;i+=4){const l=(b[i]+b[i+1]+b[i+2])/3;if(l>1){avg+=l;n++}}avg/=Math.max(1,n);
    for(let i=0;i<a.length;i+=4){const l=Math.max(30,(b[i]+b[i+1]+b[i+2])/3),f=Math.max(.75,Math.min(1.4,Math.pow(avg/l,.55)));a[i]=Math.min(255,a[i]*f);a[i+1]=Math.min(255,a[i+1]*f);a[i+2]=Math.min(255,a[i+2]*f)}
    g.putImageData(A,0,0);
    const mean=(x,y,w,h)=>{const p=g.getImageData(Math.max(0,Math.round(x)),Math.max(0,Math.round(y)),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))).data;let r=0,gg=0,bb=0,m=0;for(let i=0;i<p.length;i+=4){r+=p[i];gg+=p[i+1];bb+=p[i+2];m++}return [r/m,gg/m,bb/m]};
    const hex=v=>'#'+v.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');
    const emx=(e1[0]+e2[0])/2,emy=(e1[1]+e2[1])/2;
    // skin tone: five patches (both cheeks, forehead between the brows' height, nose bridge, chin), so the neck and hands match the face
    const P5=[[-.75,.8],[.75,.8],[0,-.75],[0,.35],[0,1.35]].map(([a,b])=>mean(emx+a*dd-.13*dd,emy+b*dd-.09*dd,.26*dd,.18*dd)),skin=[0,1,2].map(i=>P5.reduce((s,p)=>s+p[i],0)/P5.length*1.04);
    // hair: above the forehead; lifted a little because the avatar's hair texture is darker than the same colour in a photo
    const hr=mean(emx-.5*dd,emy-1.5*dd,1.0*dd,.35*dd);
    return {v:1,img:c.toDataURL('image/jpeg',.9),w:512,h:512,eL:e1,eR:e2,skin:hex(skin),hair:hex(hr.map(x=>x*1.1))}},
  setFromImage(img,eL,eR){this.face=this.process(img,eL,eR);const ok=this.save();return ok},
  clear(){this.face=null;this.save()},
  // ---- the creator tab
  panel(P,C){
    const el=(t,cls,txt,par)=>{const e=document.createElement(t);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;if(par)par.appendChild(e);return e};
    const st=el('p',null,this.face?'Your face photo is on the avatar. Choose another photo to replace it, or remove it.':'Pick a clear front photo of your face (selfie, looking at the camera). Then drag the two dots onto your eyes. The photo stays on this device.',P);st.style.cssText='font-size:13px;line-height:1.45;color:#d5dcdf;margin:6px 0 10px';
    const row=el('div','crLooks',null,P);
    const inp=el('input',null,null,P);inp.type='file';inp.accept='image/*';inp.style.display='none';
    const pick=el('button','crChip','Choose photo',row);pick.onclick=()=>inp.click();
    if(this.face){const rm=el('button','crChip','Remove photo',row);rm.onclick=()=>{this.clear();C.dirty=true;C.renderPanel()}}
    const box=el('div',null,null,P);box.style.cssText='margin-top:10px';
    inp.onchange=()=>{const f=inp.files&&inp.files[0];if(!f)return;const url=URL.createObjectURL(f),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);this.marker(box,img,C)};img.onerror=()=>{st.textContent='That file could not be opened as a picture.'};img.src=url};
    return},
  // draggable eye dots over a preview of the photo
  marker(box,img,C){box.innerHTML='';const S=300,sc=Math.min(S/img.width,S/img.height),W=Math.round(img.width*sc),H=Math.round(img.height*sc);
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.style.cssText='width:'+W+'px;height:'+H+'px;max-width:100%;touch-action:none;border-radius:8px;display:block;margin:0 auto 8px';box.appendChild(cv);
    const g=cv.getContext('2d');const pts=[[W*.4,H*.43],[W*.6,H*.43]];let drag=-1;
    const draw=()=>{g.clearRect(0,0,W,H);g.drawImage(img,0,0,W,H);pts.forEach((p,i)=>{g.beginPath();g.arc(p[0],p[1],13,0,6.283);g.lineWidth=3;g.strokeStyle='#f2c14e';g.stroke();g.beginPath();g.arc(p[0],p[1],2.5,0,6.283);g.fillStyle='#f2c14e';g.fill()})};
    const at=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]};
    cv.addEventListener('pointerdown',e=>{const q=at(e);let b=0,bd=1e9;pts.forEach((p,i)=>{const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<bd){bd=d;b=i}});drag=b;pts[b]=q;try{cv.setPointerCapture(e.pointerId)}catch(x){}draw();e.preventDefault()});
    cv.addEventListener('pointermove',e=>{if(drag<0)return;const q=at(e);pts[drag]=[Math.max(0,Math.min(W,q[0])),Math.max(0,Math.min(H,q[1]))];draw()});
    for(const k of ['pointerup','pointercancel'])cv.addEventListener(k,()=>{drag=-1});
    draw();
    const tip=document.createElement('p');tip.textContent='Drag the dots onto the middle of each eye (touch near a dot and slide).';tip.style.cssText='font-size:12px;color:#a9bcc2;text-align:center;margin:0 0 8px';box.appendChild(tip);
    const ok=document.createElement('button');ok.className='crChip';ok.textContent='Use this photo';ok.style.cssText='display:block;margin:0 auto';box.appendChild(ok);
    ok.onclick=()=>{const L=pts[0][0]<=pts[1][0]?pts[0]:pts[1],Rr=pts[0][0]<=pts[1][0]?pts[1]:pts[0];
      if(Math.hypot(Rr[0]-L[0],Rr[1]-L[1])<12){tip.textContent='Put the two dots on the two eyes first.';return}
      this.setFromImage(img,[L[0]/sc,L[1]/sc],[Rr[0]/sc,Rr[1]/sc]);C.dirty=true;C.renderPanel()}}
};
LOOK.load();
