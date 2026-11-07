// street.js — street furniture the OSM data does not carry: litter bins, utility cabinets, bollards and flower urns along the pavements,
// advert pillars (tumba) and planters in pedestrian streets, small newsstands. Placed per chunk from the street-lamp points
// (they already sit on the pavement edge with the direction to the road), deterministic per chunk, skipped when it would
// overlap a building, a prop or the carriageway. Called from buildChunkGen right after the lamps are built.
// Loaded before the main script; globals (sRGB, groundH, rng ...) are only read at call time.

const STREET=(()=>{
let K=null;
function kit(){if(K)return K;
  K={bin:sRGB('#27382d'),binLid:sRGB('#1b241e'),urn:sRGB('#bdbab2'),iron:sRGB('#1a1b1d'),cab:sRGB('#6f7d72'),cab2:sRGB('#5a665d'),
    stone:sRGB('#c9c2b2'),leaf:sRGB('#2f6a34'),leaf2:sRGB('#3d7d3c'),cream:sRGB('#e6dcc2'),dark:sRGB('#2a2622'),glass:sRGB('#10161c'),
    kiosk:['#3f6aa0','#a83a2e','#2f7a58','#c28a2c'].map(sRGB),poster:['#c8372d','#e8b53a','#2f66b0','#f2efe6','#3f8a46'].map(sRGB),flower:['#d63a4a','#f0b429','#e8e2d8','#a050c0'].map(sRGB)};
  return K}

const seen={};   // debug: what was placed, last position of each kind (for teleporting next to it in tests)
const note=(t,x,z)=>{const s=seen[t]||(seen[t]={n:0});s.n++;s.x=x;s.z=z};
function bin(P,k,x,y,z,r){note('bin',x,z);
  if(r()<.4){P.cyl(x,y,z,.27,.23,.12,8,k.urn,9);P.cyl(x,y+.12,z,.23,.25,.62,8,k.urn,9);P.cyl(x,y+.74,z,.29,.27,.07,8,k.urn,9)}         // concrete urn
  else{P.cyl(x,y,z,.23,.26,.82,8,k.bin,1);P.cyl(x,y+.82,z,.27,.27,.06,8,k.binLid,1);P.box(x,y+.45,z,.02,.42,.54,0,k.binLid,1)}}        // metal bin with a lid
function cabinet(P,k,x,y,z,ry){note('cabinet',x,z);P.box(x,y+.62,z,1.15,1.25,.5,ry,k.cab,1);P.box(x,y+1.28,z,1.25,.06,.6,ry,k.cab2,1);P.box(x,y+.62,z,.02,1.1,.52,ry,k.cab2,1)}
function bollards(P,k,x,y,z,tx,tz){for(let i=-1;i<=1;i++){P.cyl(x+tx*i*1.1,y,z+tz*i*1.1,.07,.07,.72,6,k.iron,1);P.cyl(x+tx*i*1.1,y+.72,z+tz*i*1.1,.09,.09,.06,6,k.stone,9)}}
// round advert pillar: stone plinth, poster band in three colours, dark cap with a spike
function tumba(P,k,x,y,z,r){note('tumba',x,z);
  P.cyl(x,y,z,.66,.62,.35,10,k.stone,9);P.cyl(x,y+.35,z,.6,.6,.18,10,k.dark,1);
  for(let i=0;i<3;i++)P.cyl(x,y+.53+i*.75,z,.6,.6,.74,10,k.poster[(r()*k.poster.length)|0],0);
  P.cyl(x,y+2.78,z,.64,.64,.1,10,k.dark,1);P.cyl(x,y+2.88,z,.5,.2,.32,10,k.dark,1);P.cyl(x,y+3.2,z,.03,.03,.5,5,k.iron,1)}
function planter(P,k,x,y,z,ry,r){note('planter',x,z);
  P.box(x,y+.3,z,1.0,.6,1.0,ry,k.stone,9);P.box(x,y+.63,z,.88,.06,.88,ry,k.dark,4);
  P.cyl(x,y+.66,z,.42,.2,.7,8,k.leaf,0);P.cyl(x,y+1.0,z,.3,.05,.5,8,k.leaf2,0);
  for(let i=0;i<4;i++){const a=i*1.57+r(),fx=x+Math.cos(a)*.3,fz=z+Math.sin(a)*.3;P.cyl(fx,y+.62+.18*i%3,fz,.07,.07,.1,5,k.flower[(r()*4)|0],0)}}
function kiosk(P,k,x,y,z,dx,dz,r){note('kiosk',x,z);
  const ry=Math.atan2(dx,dz),col=k.kiosk[(r()*k.kiosk.length)|0],tx=dz,tz=-dx;
  P.box(x,y+1.2,z,2.5,2.4,1.7,ry,col,1);P.box(x,y+2.46,z,2.7,.12,1.9,ry,k.dark,1);P.box(x,y+.08,z,2.6,.16,1.8,ry,k.stone,9);
  P.box(x+dx*.86,y+1.35,z+dz*.86,1.8,.9,.04,ry,k.glass,2);P.box(x+dx*.9,y+.95,z+dz*.9,2.0,.07,.3,ry,k.cream,5);                   // window + counter
  P.box(x+dx*.9,y+2.05,z+dz*.9,2.2,.38,.06,ry,k.cream,3);                                                                         // lit sign band
  P.box(x+dx*.86,y+.45,z+dz*.86,2.0,.7,.03,ry,col,1);
  for(const s of [-1,1])P.box(x+dx*.5+tx*s*1.0,y+1.5,z+dz*.5+tz*s*1.0,.03,1.1,.9,ry+Math.PI/2*0,k.poster[(r()*k.poster.length)|0],0)}

// pts: the lamp list of the chunk [x,z,dx,dz,kind] (d = from the lamp towards the road); ctx: {id,solid,nearRoad,blockedStatic,cirs,lobb,cols}
function scatter(id,P,pts,ctx){
  const k=kit(),r=rng((id*7919+13)>>>0);let nb=0,nk=0;
  const free=(x,z,m)=>!ctx.blockedStatic(x,z,m)&&!ctx.solid(x,z,m)&&!ctx.nearRoad(id,x,z,-SW[0]);   // same test as the road-clearance pass: only the carriageway counts, the pavement is where this goes
  for(const [lx,lz,dx,dz,kind] of pts){const tx=-dz,tz=dx,roll=r();
    if(kind===1){   // pedestrian street: urns, planters, tumbas along the lamp line
      const side=r()<.5?1:-1,x=lx+tx*side*2.2,z=lz+tz*side*2.2,y=groundH(x,z)+.17;
      if(roll<.22&&free(x,z,.7)){bin(P,k,x,y,z,r);ctx.cirs.push(x,z,.32)}
      else if(roll<.40&&free(x,z,1.1)){planter(P,k,x,y,z,Math.atan2(dx,dz),r);ctx.cirs.push(x,z,.75)}
      else if(roll<.46&&free(x,z,1.2)){tumba(P,k,x,y,z,r);ctx.cirs.push(x,z,.7)}
      else if(roll<.54&&free(lx+dx*1.1,lz+dz*1.1,.6)){bollards(P,k,lx+dx*1.1,groundH(lx,lz)+.17,lz+dz*1.1,tx,tz)}
      continue}
    // pavement lamp: a bin 2.4 m along the pavement, sometimes a cabinet or a kiosk further on
    const side=r()<.5?1:-1,x=lx+tx*side*2.4+dx*.2,z=lz+tz*side*2.4+dz*.2;
    if(roll<.34&&free(x,z,.6)){bin(P,k,x,groundH(x,z)+.17,z,r);ctx.cirs.push(x,z,.3);nb++}
    else if(roll<.40){const cx=lx+tx*side*5.5-dx*.4,cz=lz+tz*side*5.5-dz*.4;if(free(cx,cz,.9)){cabinet(P,k,cx,groundH(cx,cz)+.17,cz,Math.atan2(dx,dz));ctx.lobb.push(cx,cz,.6,.28,Math.cos(Math.atan2(dx,dz)),-Math.sin(Math.atan2(dx,dz)))}}
    else if(roll<.425&&nk<2){const kx=lx+tx*side*7-dx*1.2,kz=lz+tz*side*7-dz*1.2;if(free(kx,kz,1.8)){kiosk(P,k,kx,groundH(kx,kz)+.17,kz,dx,dz,r);const ry=Math.atan2(dx,dz);ctx.lobb.push(kx,kz,1.3,.9,Math.cos(ry),-Math.sin(ry));nk++}}
  }}
return {scatter,bin,cabinet,tumba,planter,kiosk,bollards,kit,seen}})();
