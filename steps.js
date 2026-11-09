/* steps.js — STEPS: entrance stairs and ramps you can really climb.
   Until now the concrete block / steps in front of a door that stands above the street were only drawn: the player walked through them at street level and the door stayed out of reach.
   STEPS.flight() draws treads (or a gentle ramp when the rise is small) AND records them, and STEPS.h() — registered once as a SPECIAL ground function in index.html —
   answers the ground height on them, so the feet follow the treads. Entries live in a grid (dedupe by position), so a chunk that is rebuilt adds nothing twice. */
const STEPS={n:0,cells:new Map(),seen:new Set(),CS:16,
  key(x,z){return (Math.floor(x/16)+2048)*4096+(Math.floor(z/16)+2048)},
  footY(px,pz,nx,nz,d){const x=px+nx*d,z=pz+nz*d;return groundH(x,z)+(typeof sidewalkLift==='function'?sidewalkLift(x,z):0)},
  // (px,pz) = the wall / door point, (nx,nz) = the outward unit normal, yTop = the floor at the door. o: w width, land landing depth, run tread depth, rise tread height, foot fixed street level, col
  // returns the number of risers (0 = the door is at street level, -1 = a ramp was built)
  flight(P,px,pz,nx,nz,yTop,o){o=o||{};const w=o.w||2.2,run=o.run||.3,rise=o.rise||.17,land=o.land===undefined?.5:o.land,col=o.col||sRGB('#9a9792'),cheek=o.cheek||sRGB('#8b8884');
    const ft=o.foot!==undefined?(()=>o.foot):(d=>this.footY(px,pz,nx,nz,d)),k0=Math.round(px*2)+','+Math.round(pz*2);
    const drop=yTop-ft(land+1.2);if(drop<.07)return 0;
    const ry=Math.atan2(nx,nz),at=(s,y,sx,sy,sz,c,m,rx)=>P.box(px+nx*s,y,pz+nz*s,sx,sy,sz,ry,c||col,m===undefined?9:m,rx);
    if(drop<=.22&&!o.noRamp){   // a ramp 1:9: a tilted slab, the player's feet follow its slope
      const L=Math.max(1.2,drop*9),yF=ft(land+L),dr=Math.max(.05,yTop-yF),len=Math.hypot(L,dr);
      P.box(px+nx*(land+L/2),yTop-dr/2-.06,pz+nz*(land+L/2),w,.12,len,ry,col,9,Math.atan2(dr,L));
      at(land/2,yTop-.06,w,.12,land);
      this.add([px,pz,nx,nz,yTop,w,land,L,dr,0],k0);return -1}
    let n=Math.min(16,Math.ceil(drop/rise-.05));
    for(let it=0;it<2;it++){const d2=yTop-ft(land+n*run);n=Math.max(1,Math.min(16,Math.ceil(d2/rise-.05)))}
    const yF=ft(land+n*run),rr=(yTop-yF)/n,bot=Math.min(yF,yTop-.3)-.05;
    at(land/2,(yTop+bot)/2,w,yTop-bot,land);                                                       // the landing at the door
    for(let k=0;k<n-1;k++){const top=yTop-(k+1)*rr;at(land+k*run+run/2,(top+bot)/2,w,top-bot,run)}   // the treads; the last riser meets the street
    if(n>=3){const L=land+(n-1)*run;for(const sd of [-1,1]){const lx=px-nz*sd*(w/2+.06),lz=pz+nx*sd*(w/2+.06);   // low cheek walls
        P.box(lx+nx*L/2,(yTop+bot)/2+.15,lz+nz*L/2,.12,yTop-bot+.3,L,ry,cheek,9)}}
    this.add([px,pz,nx,nz,yTop,w,land,run,rr,n],k0);return n},
  add(e,k0){if(this.seen.has(k0))return;this.seen.add(k0);const L=e[6]+(e[9]?(e[9]-1)*e[7]:e[7]),cx=e[0]+e[2]*L/2,cz=e[1]+e[3]*L/2,r=L/2+e[5]/2+1;
    for(let ix=Math.floor((cx-r)/16);ix<=Math.floor((cx+r)/16);ix++)for(let iz=Math.floor((cz-r)/16);iz<=Math.floor((cz+r)/16);iz++){const key=(ix+2048)*4096+(iz+2048);let a=this.cells.get(key);if(!a)this.cells.set(key,a=[]);a.push(e)}
    this.n++},
  // ground height on a flight / ramp at (x,z); y = the walker's height (so a balcony above the steps does not snap down to them)
  h(x,z,y){if(!this.n)return null;const a=this.cells.get(this.key(x,z));if(!a)return null;
    for(const s of a){const dx=x-s[0],dz=z-s[1],d=dx*s[2]+dz*s[3];if(d<-.2)continue;const t=-dx*s[3]+dz*s[2];if(t>s[5]/2+.05||t<-s[5]/2-.05)continue;let h;
      if(s[9]){if(d>s[6]+(s[9]-1)*s[7])continue;h=d<=s[6]?s[4]:s[4]-(Math.floor((d-s[6])/s[7])+1)*s[8]}
      else{if(d>s[6]+s[7]+.05)continue;h=d<=s[6]?s[4]:s[4]-s[8]*(d-s[6])/s[7]}
      if(y!==undefined&&y>h+1.9)continue;return {h,pri:2,surf:'stone'}}
    return null}};
