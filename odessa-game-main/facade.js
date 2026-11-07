// facade.js — Odesa facade relief on top of the shader walls (addPolyBuilding calls FAC.dress at the end).
// Real geometry only where the silhouette matters: projecting cornices, wrought-iron balconies with window hoods in the old centre
// (HIST / MOLD), striped shop awnings under shop signs, and a porch with a door on the street side of private houses.
// Vertex budget is the whole point: the old centre has ~40 buildings per 200 m chunk, so every piece is built from the few faces
// that can be seen (strips = front + top + underside, grilles = two flat quads) instead of closed boxes (24 vertices each).
// Railings and awning stripes are single flat quads: material codes 10..11 (bars, discarded between the bars) and 20..21 (stripes)
// in PROP_SURF read the direction of the rail from the code itself (see barM).
// Loaded before the main script; globals (sRGB, quadN, HIST, CS2, distRoad, groundH, MOBILE ...) are only read at call time.

const FAC=(()=>{
const TAU=Math.PI*2;
let K=null;
const stat={b:0,v:0,balc:0,porch:0,awn:0,mans:0};
function kit(){if(K)return K;
  K={stone:sRGB('#d8cfbc'),stone2:sRGB('#c3b8a2'),iron:sRGB('#16171a'),door:[sRGB('#5b3a22'),sRGB('#2f4a36'),sRGB('#3c5a7e'),sRGB('#7a2f2a'),sRGB('#3a3a3e'),sRGB('#8a5a32')],
    awn:['#b3322b','#2a6a9a','#2f7a4a','#c8892a','#7a3a7a','#2b2b2e'].map(sRGB),brick:sRGB('#8a4a36'),metal:sRGB('#6a7078'),glass:sRGB('#10161c')};
  return K}
// direction of a rail packed into the material code: PROP_SURF reads the angle back (a in [-pi,pi] -> [0,1))
const barM=(tx,tz)=>10+(Math.atan2(tz,tx)+Math.PI)/TAU*.998;
const awnM=(tx,tz)=>20+(Math.atan2(tz,tx)+Math.PI)/TAU*.998;

const Q=(P,ps,n,col,m)=>quadN(P.g,ps,n,()=>({color:col,aM:m}));
// horizontal band along a wall piece a->b (tangent t, outward normal n), projecting d, from y to y+h: front + top + underside
function strip(P,ax,az,bx,bz,nx,nz,y,h,d,col,m){
  const A=[ax+nx*d,az+nz*d],B=[bx+nx*d,bz+nz*d];
  Q(P,[[A[0],y,A[1]],[B[0],y,B[1]],[B[0],y+h,B[1]],[A[0],y+h,A[1]]],[nx,0,nz],col,m);
  Q(P,[[ax,y+h,az],[bx,y+h,bz],[B[0],y+h,B[1]],[A[0],y+h,A[1]]],[0,1,0],col,m);
  Q(P,[[ax,y,az],[bx,y,bz],[B[0],y,B[1]],[A[0],y,A[1]]],[0,-1,0],col,m)}
// a vertical grille between two ground points, y..y+h, seen from both sides (the bars are discarded in the shader)
function grille(P,ax,az,bx,bz,y,h,col){const tx=bx-ax,tz=bz-az,L=Math.hypot(tx,tz)||1,nx=tz/L,nz=-tx/L,m=barM(tx/L,tz/L);
  const ps=[[ax,y,az],[bx,y,bz],[bx,y+h,bz],[ax,y+h,az]];Q(P,ps,[nx,0,nz],col,m);Q(P,ps,[-nx,0,-nz],col,m)}

// ---- one wrought-iron balcony: stone slab, front + side grilles, top rail
function balcony(P,k,W,u,wid,dep,yb){
  const hx=W.tx*wid/2,hz=W.tz*wid/2,bx=W.x1+W.tx*u,bz=W.z1+W.tz*u,fx=bx+W.nx*dep,fz=bz+W.nz*dep;
  const aL=[bx-hx,bz-hz],aR=[bx+hx,bz+hz],fL=[fx-hx,fz-hz],fR=[fx+hx,fz+hz];
  Q(P,[[aL[0],yb,aL[1]],[aR[0],yb,aR[1]],[fR[0],yb,fR[1]],[fL[0],yb,fL[1]]],[0,1,0],k.stone,9);                        // slab top
  Q(P,[[aL[0],yb-.14,aL[1]],[aR[0],yb-.14,aR[1]],[fR[0],yb-.14,fR[1]],[fL[0],yb-.14,fL[1]]],[0,-1,0],k.stone2,9);       // slab underside
  Q(P,[[fL[0],yb-.14,fL[1]],[fR[0],yb-.14,fR[1]],[fR[0],yb,fR[1]],[fL[0],yb,fL[1]]],[W.nx,0,W.nz],k.stone,9);           // slab front edge
  grille(P,fL[0],fL[1],fR[0],fR[1],yb+.05,.98,k.iron);grille(P,aL[0],aL[1],fL[0],fL[1],yb+.05,.98,k.iron);grille(P,aR[0],aR[1],fR[0],fR[1],yb+.05,.98,k.iron);
  strip(P,fL[0]-W.nx*.04,fL[1]-W.nz*.04,fR[0]-W.nx*.04,fR[1]-W.nz*.04,W.nx,W.nz,yb+1.0,.06,.08,k.iron,1)}                // top rail
// a window hood over the first-floor windows: one projecting band
function hood(P,k,W,u,w,y){const hx=W.tx*w/2,hz=W.tz*w/2,bx=W.x1+W.tx*u,bz=W.z1+W.tz*u;strip(P,bx-hx,bz-hz,bx+hx,bz+hz,W.nx,W.nz,y,.16,.3,k.stone,9)}

// a face (quad, or a triangle given as [a,b,c,c]) whose normal is taken from its winding and flipped to look towards `hint`
function Qh(P,ps,hint,col,m){
  let n=cross3([ps[1][0]-ps[0][0],ps[1][1]-ps[0][1],ps[1][2]-ps[0][2]],[ps[2][0]-ps[0][0],ps[2][1]-ps[0][1],ps[2][2]-ps[0][2]]);const l=Math.hypot(n[0],n[1],n[2])||1;n=[n[0]/l,n[1]/l,n[2]/l];
  if(n[0]*hint[0]+n[1]*hint[1]+n[2]*hint[2]<0)n=[-n[0],-n[1],-n[2]];
  quadN(P.g,ps,n,()=>({color:col,aM:m}))}
// the same for the building mesh (roof material code 2 = ribbed metal in BLD_SURF, colour from the building seed)
function Qr(g,ps,hint,c){
  let n=cross3([ps[1][0]-ps[0][0],ps[1][1]-ps[0][1],ps[1][2]-ps[0][2]],[ps[2][0]-ps[0][0],ps[2][1]-ps[0][1],ps[2][2]-ps[0][2]]);const l=Math.hypot(n[0],n[1],n[2])||1;n=[n[0]/l,n[1]/l,n[2]/l];
  if(n[0]*hint[0]+n[1]*hint[1]+n[2]*hint[2]<0)n=[-n[0],-n[1],-n[2]];
  quadN(g,ps,n,()=>({aUV:[0,0],aP:[c.st,c.lv,c.sd,-1],aQ:2,aT:[1,0,0]}))}

// a triangular pediment on a console band over a window (11 + 12 vertices)
function pediment(P,k,W,u,w,y){
  const hx=W.tx*w/2,hz=W.tz*w/2,d=.34,h=Math.min(.42,w*.28),bx=W.x1+W.tx*u,bz=W.z1+W.tz*u,fx=bx+W.nx*d,fz=bz+W.nz*d;
  const FL=[fx-hx,y,fz-hz],FR=[fx+hx,y,fz+hz],FA=[fx,y+h,fz],BL=[bx-hx,y,bz-hz],BR=[bx+hx,y,bz+hz],BA=[bx,y+h,bz];
  Qh(P,[FL,FR,FA,FA],[W.nx,0,W.nz],k.stone,9);Qh(P,[FL,FA,BA,BL],[-W.tx,1,-W.tz],k.stone,9);Qh(P,[FR,FA,BA,BR],[W.tx,1,W.tz],k.stone,9);
  strip(P,bx-hx,bz-hz,bx+hx,bz+hz,W.nx,W.nz,y-.12,.12,d,k.stone,9)}

// ---- roofs of the old centre: a mansard (two slopes + flat top) with dormers on some rectangular blocks, brick chimney stacks on the rest
function mansard(g,P,k,c){
  const o=c.obb,yb=c.y0+c.H,hw=o.w/2-.05,hd=o.d/2-.05,ax=[o.ca,o.sa],az=[-o.sa,o.ca];
  const T=[[0,0],[.85,2.2],[Math.min(2.1,hd*.4,hw*.4),3.0]];      // [inset, height above the cornice] of the three rings
  const pt=(u,v,y)=>[o.cx+ax[0]*u+az[0]*v,y,o.cz+ax[1]*u+az[1]*v];
  const ring=t=>{const i=T[t][0],y=yb+T[t][1];return [pt(-hw+i,-hd+i,y),pt(hw-i,-hd+i,y),pt(hw-i,hd-i,y),pt(-hw+i,hd-i,y)]};
  const R0=ring(0),R1=ring(1),R2=ring(2),out=[[0,-1],[1,0],[0,1],[-1,0]];
  for(let s=0;s<4;s++){const s2=(s+1)%4,n=out[s],hint=[ax[0]*n[0]+az[0]*n[1],.6,ax[1]*n[0]+az[1]*n[1]];
    Qr(g,[R0[s],R0[s2],R1[s2],R1[s]],hint,c);Qr(g,[R1[s],R1[s2],R2[s2],R2[s]],hint,c)}
  Qr(g,[R2[0],R2[1],R2[2],R2[3]],[0,1,0],c);
  c.mTop=yb+T[2][1];c.mIn=T[2][0];
  if(MOBILE)return;
  // dormers on the two long sides
  const R=c.R,long=o.w>=o.d,along=long?ax:az,perp=long?az:ax,hl=(long?o.w:o.d)/2,hp=(long?o.d:o.w)/2,wd=1.1,hD=1.15,dp=1.3,front=.35;
  const cnt=Math.max(1,Math.min(5,Math.floor((hl*2-5)/3.8)));
  for(const s of [-1,1]){const n=[perp[0]*s,perp[1]*s],ry=Math.atan2(n[0],n[1]);
    for(let i=0;i<cnt;i++){const u=(i-(cnt-1)/2)*Math.min(3.9,(hl*2-4)/Math.max(1,cnt-1)||3.9);
      const at=(a,p,y)=>[o.cx+along[0]*a+perp[0]*s*p,y,o.cz+along[1]*a+perp[1]*s*p];
      const fo=hp-front,y1=yb+1.5,y2=y1+hD,ym=y1+hD*.5;
      P.box(o.cx+along[0]*u+perp[0]*s*(fo-dp/2),ym,o.cz+along[1]*u+perp[1]*s*(fo-dp/2),wd,hD,dp,ry,k.stone,9);
      const gl=hp-front+.02;Qh(P,[at(u-.38,gl,y1+.18),at(u+.38,gl,y1+.18),at(u+.38,gl,y2-.14),at(u-.38,gl,y2-.14)],[n[0],0,n[1]],k.glass,2);
      const FL=at(u-wd/2,fo,y2),FR=at(u+wd/2,fo,y2),FA=at(u,fo,y2+.45),BL=at(u-wd/2,fo-dp,y2),BR=at(u+wd/2,fo-dp,y2),BA=at(u,fo-dp,y2+.2);
      Qh(P,[FL,FR,FA,FA],[n[0],0,n[1]],k.stone2,9);Qh(P,[FL,FA,BA,BL],[-along[0],1,-along[1]],k.metal,1);Qh(P,[FR,FA,BA,BR],[along[0],1,along[1]],k.metal,1)}}}

function chimneys(P,k,c){
  const {rings,area,y0,top,R}=c,o=c.obb,out=rings[0],want=Math.max(1,Math.min(5,Math.round(area/320)+(R()<.5?1:0)));
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let i=0;i<out.length;i+=2){x0=Math.min(x0,out[i]);x1=Math.max(x1,out[i]);z0=Math.min(z0,out[i+1]);z1=Math.max(z1,out[i+1])}
  const ry=o?-Math.atan2(o.sa,o.ca):0;let placed=0;
  for(let t=0;t<14&&placed<want;t++){let x,z,y=top;
    if(c.mTop!==undefined){const u=(R()-.5)*(o.w-2*c.mIn-2),v=(R()-.5)*(o.d-2*c.mIn-2);x=o.cx+o.ca*u-o.sa*v;z=o.cz+o.sa*u+o.ca*v;y=c.mTop}
    else{x=x0+R()*(x1-x0);z=z0+R()*(z1-z0);if(!polyInside(rings,x,z)||polyNearest(rings,x,z)[0]<1.6)continue}
    const h=1.5+R()*1.0,br=R()<.6;stack(P,x,y,z,ry,.74,h,br?k.brick:k.stone2,br?0:9);placed++}}
// an open-bottom square prism (4 sides + top, 20 vertices) — chimney stack
function stack(P,x,y,z,ry,w,h,col,m){
  const c=Math.cos(ry),s=Math.sin(ry),hw=w/2,p=(a,b,yy)=>[x+a*c+b*s,yy,z-a*s+b*c],y2=y+h;
  const A=p(-hw,-hw,y),B=p(hw,-hw,y),C=p(hw,hw,y),D=p(-hw,hw,y),A2=p(-hw,-hw,y2),B2=p(hw,-hw,y2),C2=p(hw,hw,y2),D2=p(-hw,hw,y2);
  Q(P,[A,B,B2,A2],[-s,0,-c],col,m);Q(P,[B,C,C2,B2],[c,0,-s],col,m);Q(P,[C,D,D2,C2],[s,0,c],col,m);Q(P,[D,A,A2,D2],[-c,0,s],col,m);Q(P,[A2,B2,C2,D2],[0,1,0],col,m)}

function cornice(P,k,c){
  const {walls,y0,H,st}=c,big=st===HIST;
  for(const W of walls){if(W.ri>0||W.L<4)continue;const e=W.L>6?.4:0;
    const ax=W.x1-W.tx*e,az=W.z1-W.tz*e,bx=W.x2+W.tx*e,bz=W.z2+W.tz*e;
    strip(P,ax,az,bx,bz,W.nx,W.nz,y0+H-.02,big?.3:.22,big?.55:.4,k.stone,9);                        // projecting corona
    if(big)strip(P,ax,az,bx,bz,W.nx,W.nz,y0+H-.3,.28,.2,k.stone2,9)}}                               // frieze under it

function balconies(P,k,c){
  const {walls,st,lv,y0,GF,FH}=c,R=c.R,CS=CS2[st],CAP=MOBILE?3:8;let cnt=0;
  const firstRow=GF>0?0:1,lastRow=(GF>0?lv-2:lv-1);if(lastRow<firstRow)return;
  const SILL=st===HIST?.85:.9,WH=st===HIST?2.35:1.6,WW=st===HIST?1.3:1.1;
  for(const W of walls){if(W.ri>0||W.L<8||cnt>=CAP)continue;
    const nC=Math.max(1,Math.floor(W.L/CS+.3)),cs=W.L/nC;if(W.L<WW+.75||nC<3)continue;
    const yb=y0+GF+firstRow*FH+.02,wallEnd=Math.min(CAP,cnt+4);   // at most 4 per wall so the first wall does not use the whole budget
    for(let ci=1;ci<nC-1&&cnt<wallEnd;){
      if(R()<(st===HIST?.42:.25)){const run=Math.min(1+Math.floor(R()*2),nC-1-ci);const wid=run*cs-.5,u=(ci+run/2)*cs;
        balcony(P,k,W,u,wid,st===HIST?.9:.8,yb);cnt++;stat.balc++;
        for(let q=0;q<run;q++){const hy=yb-.02+SILL+WH+.08,hw2=Math.min(cs*.6,WW+.9);if(R()<.45)pediment(P,k,W,(ci+q+.5)*cs,hw2,hy+.12);else hood(P,k,W,(ci+q+.5)*cs,hw2,hy)}
        ci+=run+1}else ci++}
  }}

// striped awning under every shop sign: one tilted quad of canvas + a hanging valance, both striped by the shader
function awnings(P,k,c){
  const {signPl,y0,GF,FH}=c;if(!signPl||!signPl.length)return;const gfe=GF>0?GF:FH;if(gfe<3.6)return;
  const col=k.awn[(c.sd*7+c.walls.length)%k.awn.length|0];
  for(const [W,u] of signPl){const len=Math.min(W.L-.6,4.6),dep=.95,m=awnM(W.tx,W.tz),ya=y0+gfe-.9,hx=W.tx*len/2,hz=W.tz*len/2,bx=W.x1+W.tx*u+W.nx*.12,bz=W.z1+W.tz*u+W.nz*.12;
    const ox=bx+W.nx*dep,oz=bz+W.nz*dep,yo=ya-.34;
    const top=[[bx-hx,ya,bz-hz],[bx+hx,ya,bz+hz],[ox+hx,yo,oz+hz],[ox-hx,yo,oz-hz]],nn=[W.nx*.34,.94,W.nz*.34];
    Q(P,top,nn,col,m);
    Q(P,[[ox-hx,yo-.2,oz-hz],[ox+hx,yo-.2,oz+hz],[ox+hx,yo,oz+hz],[ox-hx,yo,oz-hz]],[W.nx,0,W.nz],col,m);stat.awn++}}

// a door, a step and a small canopy on the street side of a private house
function porch(P,k,c){
  const {walls,y0,lv}=c,R=c.R;if(c.area<40||lv>3)return;
  let best=null,bd=1e9;for(const W of walls){if(W.ri>0||W.L<3.4)continue;const d=distRoad((W.x1+W.x2)/2+W.nx*7,(W.z1+W.z2)/2+W.nz*7);if(d<bd){bd=d;best=W}}
  if(!best)return;const W=best,u=1.5+R()*(W.L-3),ry=Math.atan2(W.nx,W.nz),px=W.x1+W.tx*u,pz=W.z1+W.tz*u;
  const dc=k.door[(R()*k.door.length)|0];
  P.box(px+W.nx*.07,y0+1.02,pz+W.nz*.07,1.0,2.04,.1,ry,dc,5);                                         // door leaf
  strip(P,px-W.tx*.95,pz-W.tz*.95,px+W.tx*.95,pz+W.tz*.95,W.nx,W.nz,y0+2.4,.1,1.1,k.stone2,9);       // canopy
  const gy=groundH(px+W.nx*1.6,pz+W.nz*1.6),drop=y0-gy;
  if(drop>.12){const n=Math.min(8,Math.ceil(drop/.2));                                                  // steps down to the ground (a slope raises the whole house)
    for(let i=0;i<n;i++){const top=y0-i*drop/n,d=.33,o=.2+d*(i+.5);P.box(px+W.nx*o,(top+gy)/2,pz+W.nz*o,1.5,top-gy,d,ry,k.stone2,9)}}
  else P.box(px+W.nx*.55,y0+.05,pz+W.nz*.55,1.5,.1,.9,ry,k.stone2,9);                                  // threshold slab
  stat.porch++;FAC.lastPorch=[px,pz,W.nx,W.nz,y0]}

function dress(c){
  const st=c.st,P=c.P;if(!P||c.opt&&c.opt.props===false)return;
  const v0=P.g.n;
  try{const k=kit();c.R=rng((c.sd*131+c.walls.length*17+c.lv*7+3)>>>0);
    if((st===HIST||st===MOLD)&&c.lv>=2){cornice(P,k,c);if(!MOBILE||st===HIST)balconies(P,k,c)
      const o=c.obb;   // roof: a mansard on some rectangular blocks (no lift-house box, no dome, one ring), chimney stacks on all of them
      if(st===HIST&&c.g&&o&&c.rect&&c.rings.length===1&&c.lv>=3&&c.lv<=6&&!(c.lv>=5&&c.area>220)&&!(c.fl&4)&&o.w>=9&&o.d>=8&&c.area<1500&&c.R()<.4){mansard(c.g,P,k,c);stat.mans++;FAC.lastMans=[o.cx,o.cz,c.y0+c.H,o.w,o.d]}
      if(c.area>45)chimneys(P,k,c)}
    if(c.signPl&&c.signPl.length)awnings(P,k,c);
    if(st===HOUSE)porch(P,k,c)}
  catch(e){if(!FAC.err){FAC.err=e;console.warn('FAC.dress',e)}}
  stat.b++;stat.v+=P.g.n-v0}
return {dress,balcony,hood,barM,awnM,kit,stat}})();
