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
const stat={b:0,v:0,balc:0,porch:0,awn:0};
function kit(){if(K)return K;
  K={stone:sRGB('#d8cfbc'),stone2:sRGB('#c3b8a2'),iron:sRGB('#16171a'),door:[sRGB('#5b3a22'),sRGB('#2f4a36'),sRGB('#3c5a7e'),sRGB('#7a2f2a'),sRGB('#3a3a3e'),sRGB('#8a5a32')],
    awn:['#b3322b','#2a6a9a','#2f7a4a','#c8892a','#7a3a7a','#2b2b2e'].map(sRGB)};
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
        for(let q=0;q<run;q++)hood(P,k,W,(ci+q+.5)*cs,Math.min(cs*.6,WW+.9),yb-.02+SILL+WH+.08);
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
    if((st===HIST||st===MOLD)&&c.lv>=2){cornice(P,k,c);if(!MOBILE||st===HIST)balconies(P,k,c)}
    if(c.signPl&&c.signPl.length)awnings(P,k,c);
    if(st===HOUSE)porch(P,k,c)}
  catch(e){if(!FAC.err){FAC.err=e;console.warn('FAC.dress',e)}}
  stat.b++;stat.v+=P.g.n-v0}
return {dress,balcony,hood,barM,awnM,kit,stat}})();
