/* ===================================================================================================
   ybuild.js — the yacht «Odesa Pearl»: model + walkable data.  buildYachtModel() → {root, plat, dyn, spots}
   Local frame: +z bow, +x port (left), y up with the waterline at y = 0. 44 m long, 8.4 m beam.
   Decks (floor heights): lower 0.3 (cabins) · main 2.9 (saloon, dining, galley, aft deck, foredeck) · upper 5.5 (wheelhouse, sky lounge,
   aft terrace) · sun deck 8.1 (jacuzzi, bar, loungers).
   =================================================================================================== */
const Y_Z0=-21,Y_Z1=23,Y_L=44;
const Y_FL={low:.3,main:2.9,up:5.5,sun:8.1};
function yT(z){return (z-Y_Z0)/Y_L}
function yHW(z){const t=yT(z);if(t<0||t>1)return 0;if(t<.1)return 3.6+(t/.1)*.6;if(t<.5)return 4.2;const u=(t-.5)/.5;return Math.max(0,4.2*(1-Math.pow(u,1.7)))}
function yHWL(z){const t=yT(z);return yHW(z)*(.9-.25*Math.max(0,(t-.5)/.5))}
function ySH(z){const t=yT(z);return 2.9+.6*Math.pow(Math.max(0,(t-.6)/.4),2)}
function yKL(z){const t=yT(z);if(t<.2)return -1.0-1.2*(t/.2);if(t<.55)return -2.2;return -2.2+2.1*Math.pow((t-.55)/.45,1.5)}
// half-width of the hull at height y
function yHX(z,y){const wl=yHWL(z),d=yHW(z),sh=ySH(z),k=yKL(z);if(y>=0)return wl+(d-wl)*Math.min(1,y/sh);const s=Math.min(1,y/k);return wl*Math.sqrt(Math.max(0,1-s*s))}

function yachtMaterials(){
  const S=MBM.std;
  const teakT=MBM.teak(),woodT=MBM.wood('#6b4630'),woodL=MBM.wood('#b79568'),carpetT=MBM.carpet('#cdbd9f'),tileT=MBM.tile(),marbleT=MBM.marble(),fabT=MBM.fabric('#e2d8c6'),fabB=MBM.fabric('#2c4a73');
  const M={
    hull:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:.25,side:THREE.DoubleSide}),
    white:S(0xf4f4f0,.35,.08),whiteD:S(0xe6e6e1,.5,.05),teak:S(0xffffff,.8,0,{map:teakT}),wood:S(0xffffff,.55,.05,{map:woodT}),woodL:S(0xffffff,.55,.05,{map:woodL}),
    glass:MBM.glass(0x9ec9e3,.26),chrome:S(0xd5d9de,.15,.95),black:S(0x15171a,.5,.3),rubber:S(0x222427,.9,0),cream:S(0xe9dec8,.6,.02),leatherD:S(0x3a2c24,.6,.05),
    fabC:S(0xffffff,.9,0,{map:fabT}),fabB:S(0xffffff,.9,0,{map:fabB}),linen:S(0xf8f6f0,.95,0),linenB:S(0x3a5a86,.9,0),carpet:S(0xffffff,.95,0,{map:carpetT}),tile:S(0xffffff,.35,.05,{map:tileT}),
    marble:S(0xffffff,.25,.05,{map:marbleT}),steel:S(0xb7bdc4,.28,.85),screen:MBM.emis(0x2a7fb0,.9),lamp:MBM.emis(0xffe2a8,1.6),gold:S(0xc9a24a,.3,.85),rope:S(0xcfc3a5,.9,0),
    water:S(0x4fc4e0,.05,.1,{transparent:true,opacity:.75}),sunpad:S(0xf2efe6,.85,0),engine:S(0xd8b21a,.5,.5),plant:S(0x3f7a3a,.9,0),pot:S(0x8a5a3a,.8,0),
    red:S(0xb82a2a,.5,.2),green:MBM.emis(0x20d060,1.2),redL:MBM.emis(0xff2a2a,1.2),whiteL:MBM.emis(0xffffff,1.4),dark:S(0x0d0e10,.8,.1),books:S(0x6a4a3a,.8,0),
    flagB:S(0x1a5fb4,.8,0),flagY:S(0xf5c518,.8,0),navy:S(0x0f2238,.35,.2),towel:S(0xf0eee8,.95,0),mirror:S(0xdfe6ea,.05,1),cushionB:S(0x2c6a9a,.9,0),cushionO:S(0xd8782a,.9,0)};
  return M}

// ---------------------------------------------------------------------------------------------------
function buildYachtModel(){
  const M=yachtMaterials(),mb=new MB(),root=new THREE.Group(),floors=[],boxes=[],seats=[],acts=[],spots={},dyn={};
  const ym=y=>y;
  // ---------- registries ----------
  const F=(x0,x1,z0,z1,y,y1,axis)=>{floors.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),y,y1,axis});};
  const S=(x0,x1,y0,y1,z0,z1)=>{const b={x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1),y0,y1};boxes.push(b);return b};
  const block=(k,x0,x1,y0,y1,z0,z1,tile,solid)=>{mb.bx(k,x0,x1,y0,y1,z0,z1,tile);if(solid!==false)S(x0,x1,y0,y1,z0,z1)};
  const seat=(x,y,z,yaw,label,pose,o)=>{const s=Object.assign({x,y:y-.45,z,yaw,label:label||'Sit',pose:pose||'sit',who:null},o||{});seats.push(s);return s};   // y = seat surface; the seated avatar's root is 0.45 below it
  // furniture frame: local (lx right-of-facing, lz forward-of-facing) → plan position for yaw multiples of 90°
  const frm=(ox,oz,ry)=>{const c=Math.round(Math.cos(ry)),s=Math.round(Math.sin(ry)),odd=Math.abs(s)===1;
    return {c,s,odd,P:(lx,lz)=>[ox+lx*c+lz*s,oz-lx*s+lz*c],
      B:(k,w,h,d,lx,y,lz,solid,tile)=>{const x=ox+lx*c+lz*s,z=oz-lx*s+lz*c;mb.box(k,w,h,d,x,y,z,ry,0,0,tile);if(solid){const W=odd?d:w,D=odd?w:d;S(x-W/2,x+W/2,y-h/2,y+h/2,z-D/2,z+D/2)}}}};
  // ---------- walls with door gaps. kind 'x': runs along z at x; 'z': runs along x at z. gaps: [[a,b],..] along the run ----------
  function wall(kind,at,a0,a1,y0,y1,t,k,gaps,glassK){gaps=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);let cur=a0;const segs=[];
    for(const [g0,g1] of gaps){if(g0>cur)segs.push([cur,g0]);cur=g1}if(cur<a1)segs.push([cur,a1]);
    for(const [s0,s1] of segs){if(kind==='x')block(glassK||k,at-t/2,at+t/2,y0,y1,s0,s1,2,true);else block(glassK||k,s0,s1,y0,y1,at-t/2,at+t/2,2,true)}
    const top=y0+2.1;if(y1>top+.05)for(const [g0,g1] of gaps){if(kind==='x')mb.bx(k,at-t/2,at+t/2,top,y1,g0,g1,2);else mb.bx(k,g0,g1,top,y1,at-t/2,at+t/2,2)}}
  // glazed wall: white sill + pillars + glass panes; solid for collision over the full height except doors
  function glassWall(kind,at,a0,a1,y0,y1,gaps,pillarEvery){gaps=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);const sill=.55,head=.3,t=.1;
    const run=(s0,s1)=>{ // one glazed run
      const n=Math.max(1,Math.round((s1-s0)/(pillarEvery||2.2))),w=(s1-s0)/n;
      for(let i=0;i<n;i++){const p0=s0+i*w,p1=p0+w;
        if(kind==='x'){mb.bx('white',at-t/2,at+t/2,y0,y0+sill,p0,p1,2);mb.bx('white',at-t/2,at+t/2,y1-head,y1,p0,p1,2);mb.bx('glass',at-.02,at+.02,y0+sill,y1-head,p0+.05,p1-.05);mb.bx('white',at-t/2,at+t/2,y0+sill,y1-head,p1-.05,p1+.05)}
        else{mb.bx('white',p0,p1,y0,y0+sill,at-t/2,at+t/2,2);mb.bx('white',p0,p1,y1-head,y1,at-t/2,at+t/2,2);mb.bx('glass',p0+.05,p1-.05,y0+sill,y1-head,at-.02,at+.02);mb.bx('white',p1-.05,p1+.05,y0+sill,y1-head,at-t/2,at+t/2,2)}}
      if(kind==='x')S(at-.12,at+.12,y0,y1,s0,s1);else S(s0,s1,y0,y1,at-.12,at+.12)};
    let cur=a0;for(const [g0,g1] of gaps){if(g0>cur)run(cur,g0);cur=g1}if(cur<a1)run(cur,a1);
    // header over doorways
    for(const [g0,g1] of gaps){if(kind==='x')mb.bx('white',at-t/2,at+t/2,y0+2.1,y1,g0,g1,2);else mb.bx('white',g0,g1,y0+2.1,y1,at-t/2,at+t/2,2)}}
  // ---------- stairs: n steps rising from yA at coordinate c0 to yB at c1 along axis; a ramp floor for walking + step boxes (visual + solid) ----------
  function stairs(x0,x1,z0,z1,yA,yB,axis,k,rails){const n=Math.max(8,Math.round(Math.abs(yB-yA)/.19)),lo=Math.min(yA,yB);
    F(x0,x1,z0,z1,yA,yB,axis||'z');
    for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n;const ya=yA+(yB-yA)*t0,yb=yA+(yB-yA)*t1,top=Math.max(ya,yb);   // top of the step = the higher edge
      const low=Math.min(ya,yb),mid=(ya+yb)/2;   // visual tread at mid height, solid only up to the lower edge: a riser never stops a body that follows the ramp
      if(axis==='x'){const a=x0+(x1-x0)*t0,b=z0&&x0+(x1-x0)*t1;mb.bx(k||'teak',Math.min(x0+(x1-x0)*t0,x0+(x1-x0)*t1),Math.max(x0+(x1-x0)*t0,x0+(x1-x0)*t1),lo-.02,mid,z0,z1,2);S(Math.min(x0+(x1-x0)*t0,x0+(x1-x0)*t1),Math.max(x0+(x1-x0)*t0,x0+(x1-x0)*t1),lo-.02,low,z0,z1)}
      else{const a=z0+(z1-z0)*t0,b=z0+(z1-z0)*t1;mb.bx(k||'teak',x0,x1,lo-.02,mid,Math.min(a,b),Math.max(a,b),2);S(x0,x1,lo-.02,low,Math.min(a,b),Math.max(a,b))}}
    if(rails!==false)for(const sx of [x0+.04,x1-.04]){if(axis==='x')continue;
      mb.rod('chrome',.022,[sx,yA+.95,z0],[sx,yB+.95,z1],6);for(let i=0;i<=4;i++){const t=i/4,zz=z0+(z1-z0)*t,yy=yA+(yB-yA)*t;mb.rod('chrome',.016,[sx,yy,zz],[sx,yy+.95,zz],5)}}}
  // ---------- hull ----------
  (function hull(){
    const levels=(z)=>{const k=yKL(z),sh=ySH(z);return [[k,0],[k*.75,0],[k*.5,0],[k*.25,0],[0,0],[0,1],[1.12,1],[1.12,2],[1.22,2],[1.22,3],[sh,3]]};   // [y,colour]: 0 red antifoul, 1 navy, 2 gold, 3 white
    const COL=[[.36,.1,.1],[.06,.13,.22],[.79,.64,.29],[.94,.94,.92]].map(c=>c.map(v=>Math.pow(v,2.2)));
    const N=38,pos=[],col=[],idx=[],rings=[];
    for(let i=0;i<N;i++){const t=i/(N-1),z=Y_Z0+Y_L*t,lv=levels(z),ring=[];
      const mk=(sgn)=>lv.map(([y,c])=>{const x=sgn*yHX(z,y),rake=1.3*Math.pow(Math.max(0,(t-.8)/.2),2)*(Math.max(0,y)/Math.max(.5,ySH(z)));return [x,y,z+rake,c]});
      const left=mk(1),right=mk(-1);ring.push(...left.slice().reverse(),...right.slice(1));   // port keel … wait: left (x>0) from deck down to keel, then right up to deck
      rings.push(ring)}
    const M0=rings[0].length;for(const r of rings)for(const [x,y,z,c] of r){pos.push(x,y,z);col.push(...COL[c])}
    for(let i=0;i<N-1;i++)for(let j=0;j<M0-1;j++){const a=i*M0+j,b=a+1,c=(i+1)*M0+j,d=c+1;idx.push(a,c,b,b,c,d)}
    // transom
    {const r=rings[0],base=pos.length/3;let cx=0,cy=0;for(const p of r){cx+=p[0];cy+=p[1]}cx/=r.length;cy/=r.length;pos.push(cx,cy,Y_Z0);col.push(...COL[3]);for(const p of r){pos.push(p[0],p[1],p[2]);col.push(...COL[p[3]])}
      for(let j=0;j<r.length-1;j++)idx.push(base,base+1+j,base+2+j)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,M.hull);m.castShadow=true;m.name='hull';root.add(m);
    // portholes (lower deck) and the gold sheer line
    const po=new MB();for(let z=-12;z<=15;z+=3){for(const sg of [1,-1]){const x=sg*(yHX(z,1.75)+.015);po.box('portholeD',.03,.34,.34,x,1.75,z);po.box('chrome',.025,.4,.4,x+sg*-.005,1.75,z)}}
    po.build(root,{portholeD:M.dark,chrome:M.chrome})})();
  // ---------- deck slabs (visual + walkable) ----------
  const strip=(zA,zB,y,k,inset,hole)=>{ // one 1 m slice of a deck following the hull outline; hole: [x0,x1,z0,z1] excluded (stairwell)
    for(let z=zA;z<zB-1e-6;z+=1){const z1=Math.min(zB,z+1),zc=(z+z1)/2,w=Math.min(yHW(zc)+.05,9)-inset;if(w<.3)continue;
      const parts=[[-w,w]];if(hole&&zc>hole[2]&&zc<hole[3]){parts.length=0;if(-w<hole[0])parts.push([-w,Math.min(w,hole[0])]);if(w>hole[1])parts.push([Math.max(-w,hole[1]),w])}
      for(const [a,b] of parts){block(k,a,b,y-.22,y,z,z1,2.2,false);F(a+.12,b-.12,z,z1,y)}}};
  // main deck (teak everywhere; the interior floors are laid on top)
  strip(-20.7,22.2,Y_FL.main,'teak',.07,[-2.9,-1.4,-.8,3.8]);
  // underside of the main deck (white ceiling of the lower deck)
  mb.bx('white',-3.6,3.6,Y_FL.main-.3,Y_FL.main-.22,-14,17.8);
  // lower deck floor: wood strips inside the hull
  for(let z=-14;z<17.6;z+=1){const z1=Math.min(17.6,z+1),zc=(z+z1)/2,w=yHX(zc,1.2)-.1;block('woodL',-w,w,.12,.3,z,z1,2,false);F(-w+.1,w-.1,z,z1,.3)}
  // hull-lining collision for the lower deck (invisible walls where the hull curves in)
  for(let z=-14.5;z<18.2;z+=1){const w=yHX(z+.5,1.6)-.12;S(w,w+3,.25,2.8,z,z+1);S(-w-3,-w,.25,2.8,z,z+1)}
  S(-4,4,.25,2.8,-14.6,-14.5);S(-4,4,.25,2.8,17.7,17.9);   // bulkheads at both ends
  // upper deck slabs: lounge + wheelhouse + aft terrace (hole for the two stairwells)
  const upHole=(zc,w)=>{const parts=[];return parts};
  (function upper(){for(let z=-17.5;z<8-1e-6;z+=1){const z1=Math.min(8,z+1),zc=(z+z1)/2;let w=zc<-9.2?3.9:3.7;
      // stairwells: left (x -3.4..-2.0) z -16..-11.4 (from the aft deck); right (x 1.4..2.9) z -.8..3.8 (from the foyer)
      const holes=[];if(zc>-16&&zc<-11.4)holes.push([-3.4,-2.0]);if(zc>-.8&&zc<3.8)holes.push([1.4,2.9]);if(zc>-14&&zc<-10.6)holes.push([1.8,3.3]);
      holes.sort((a,b)=>a[0]-b[0]);let cur=-w;const parts=[];for(const [h0,h1] of holes){if(h0>cur)parts.push([cur,h0]);cur=Math.max(cur,h1)}if(cur<w)parts.push([cur,w]);
      for(const [a,b] of parts){const k=zc<-9.2?'teak':'carpet';block(k,a,b,Y_FL.up-.22,Y_FL.up,z,z1,k==='teak'?2.2:2,false);F(a+.1,b-.1,z,z1,Y_FL.up)}}})();
  // sun deck slab
  (function sun(){for(let z=-10.6;z<1-1e-6;z+=1){const z1=Math.min(1,z+1);const hole=(z+z1)/2<-9.9&&0;block('teak',-3.4,3.4,Y_FL.sun-.22,Y_FL.sun,z,z1,2.2,false);F(-3.3,3.3,z,z1,Y_FL.sun)}})();
  // wheelhouse roof slab (y 7.6..7.8) with the radar arch
  mb.bx('white',-3.7,3.7,7.55,7.78,0,8.3);mb.bx('white',-3.8,3.8,7.78,7.88,-.2,8.5);
  // bridge wings (open platforms either side of the wheelhouse)
  for(const sg of [1,-1]){F(sg>0?3.1:-3.95,sg>0?3.95:-3.1,1.5,6.5,Y_FL.up);block('teak',sg>0?3.1:-3.95,sg>0?3.95:-3.1,Y_FL.up-.22,Y_FL.up,1.5,6.5,2.2,false)}
  // ---------- stairs ----------
  stairs(-2.9,-1.4,-.8,3.8,Y_FL.main,Y_FL.low,'z','wood');               // main → lower (down towards the bow)
  stairs(1.4,2.9,-.8,3.8,Y_FL.main,Y_FL.up,'z','wood');                  // main → wheelhouse level
  stairs(-3.4,-2.0,-16,-11.4,Y_FL.main,Y_FL.up,'z','teak');              // aft deck → aft terrace
  stairs(1.8,3.3,-14,-10.6,Y_FL.up,Y_FL.sun,'z','teak');                 // terrace → sun deck
  // swim platform + steps (aft)
  F(-2.8,2.8,-23.2,-20.8,.9);block('teak',-2.8,2.8,.7,.9,-23.2,-20.8,2.2,false);stairs(2.3,3.5,-20.8,-17.6,.9,Y_FL.main,'z','teak',false);
  mb.rod('chrome',.02,[-2.7,1.8,-23.1],[2.7,1.8,-23.1],6);for(const x of [-2.7,0,2.7])mb.rod('chrome',.02,[x,.9,-23.1],[x,1.8,-23.1],6);
  // ---------- railings along the deck edges ----------
  const rail=(pts,y0,h)=>{for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];mb.rod('chrome',.024,[a[0],y0+h,a[1]],[b[0],y0+h,b[1]],6);mb.rod('chrome',.018,[a[0],y0+h*.5,a[1]],[b[0],y0+h*.5,b[1]],5)}
    for(let i=0;i<pts.length;i++)mb.rod('chrome',.022,[pts[i][0],y0,pts[i][1]],[pts[i][0],y0+h,pts[i][1]],6)};
  for(const sg of [1,-1]){const pa=[],pb=[];for(let z=-20.5;z<=20;z+=1.7){const w=yHW(z)-.12;pa.push([sg*w,z])}rail(pa,Y_FL.main,.95)}
  rail([[-3.8,-20.6],[3.8,-20.6]],Y_FL.main,.95);
  // bow bulwark cap (white) over the rising sheer
  for(const sg of [1,-1]){for(let z=13;z<22.2;z+=1){const h=Math.max(0,ySH(z+.5)-2.9);if(h>.04)mb.bx('white',sg*(yHW(z+.5)-.12)-.1,sg*(yHW(z+.5)-.12)+.1,2.9,2.9+h+.05,z,z+1)}}
  // ---------- main deck superstructure ----------
  const MS=Y_FL.main,MC=5.2,UP=Y_FL.up;
  // side walls (glazed) with side doors at the foyer; aft saloon doors (glass sliding, open gap) ; forward galley bulkhead
  for(const sg of [1,-1])glassWall('x',sg*3.1,-9.5,13.4,MS,MC,[[.2,1.3]],2.2);
  glassWall('z',-9.5,-3.1,3.1,MS,MC,[[-1.3,1.3]],1.2);
  wall('z',13.4,-3.1,3.1,MS,MC,.2,'white',[[-.7,.7]]);
  // main-deck ceiling = upper floor slab underside (visual white), roof overhang pillars aft
  mb.bx('white',-3.7,3.7,MC,UP-.22,-17.5,-9.2);mb.bx('white',-3.2,3.2,MC,UP-.22,-9.2,13.4);
  for(const x of [-3.5,3.5])for(const z of [-17.2,-13.5])mb.cyl('chrome',.07,.07,UP-.22-MS,10,x,(MS+UP-.22)/2,z);
  // interior floors
  mb.bx('carpet',-3.0,3.0,MS+.0,MS+.012,-9.4,-1,2);mb.bx('woodL',-3.0,3.0,MS,MS+.012,-1,4,2);mb.bx('woodL',-3.0,3.0,MS,MS+.012,4,9,2);mb.bx('tile',-3.0,3.0,MS,MS+.012,9,13.3,2);
  // --- aft deck: outdoor lounge + dining ---
  (function aft(){
    // corner sofas (L-shaped) along both sides, a low table, a dining table for 6, sun shade none (covered)
    const sofa=(ox,oz,ry,len,solidSeat)=>{const f=frm(ox,oz,ry);f.B('cream',len,.4,.85,0,MS+.2,0,true);f.B('cream',len,.5,.2,0,MS+.62,-.35,true);
      const n=Math.max(1,Math.round(len/.8));for(let i=0;i<n;i++){const lx=-len/2+(i+.5)*len/n,p=f.P(lx,.05);seat(p[0],MS+.42,p[1],ry,'Sit on the sofa')}
      f.B('cushionB',.4,.12,.4,-len/2+.4,MS+.45,-.2,false);f.B('cushionO',.4,.12,.4,len/2-.4,MS+.45,-.2,false)};
    sofa(-1.9,-19.7,0,3.0);   // against the transom
    for(const z of [-17.5]){const f=frm(-2.5,z,Math.PI/2);f.B('fabB',.8,.4,.8,0,MS+.2,0,true);f.B('fabB',.8,.45,.18,0,MS+.58,-.32,true);const p=f.P(0,.05);seat(p[0],MS+.42,p[1],Math.PI/2,'Sit in the armchair')}
    // low table
    block('wood',-1.7,.1,MS,MS+.38,-18.0,-16.7,2,true);mb.bx('glass',-1.65,.05,MS+.38,MS+.4,-17.95,-16.75);
    // dining table + 6 chairs (3 per side)
    block('woodL',.5,1.9,MS+.7,MS+.78,-17.2,-13.4,2,true);for(const [x,z] of [[.7,-17.0],[1.7,-17.0],[.7,-13.6],[1.7,-13.6]])mb.cyl('chrome',.04,.04,.7,6,x,MS+.35,z);
    for(const sg of [-1,1])for(const z of [-16.6,-15.3,-14.0]){const x=1.2+sg*1.05;mb.bx('cream',x-.22,x+.22,MS+.4,MS+.48,z-.22,z+.22);mb.bx('cream',sg>0?x+.18:x-.22,sg>0?x+.22:x-.18,MS+.48,MS+.95,z-.22,z+.22);mb.bx('chrome',x-.2,x+.2,MS,MS+.4,z-.02,z+.02);
      S(x-.22,x+.22,MS,MS+.9,z-.22,z+.22);seat(x,MS+.45,z,sg>0?-Math.PI/2:Math.PI/2,'Sit at the table')}
    mb.cyl('chrome',.03,.03,.5,6,1.2,MS+1.0,-15.3);mb.cyl('white',.14,.14,.02,10,1.2,MS+.8,-15.3);   // lamp / ice bucket
  })();
  // --- saloon (z -9.4 .. -1) ---
  (function saloon(){
    // big sectional sofa on the port side, two armchairs starboard, glass coffee table, TV wall unit aft?  TV on the starboard bulkhead
    const f=frm(2.2,-6.4,-Math.PI/2);f.B('cream',5.2,.42,.95,0,MS+.22,0,true);f.B('cream',5.2,.55,.22,0,MS+.7,-.4,true);for(let i=0;i<5;i++){const p=f.P(-2.0+i*1.0,.05);seat(p[0],MS+.45,p[1],-Math.PI/2,'Sit on the sofa')}
    for(const [z,c] of [[-8.2,'cushionB'],[-4.8,'cushionO']]){mb.bx(c,2.2,2.2+.1,MS+.45,MS+.75,z-.2,z+.2)}
    const f2=frm(2.3,-1.6,Math.PI);f2.B('cream',1.8,.4,.9,0,MS+.2,0,true);f2.B('cream',1.8,.5,.2,0,MS+.6,-.35,true);for(let i=0;i<2;i++){const p=f2.P(-.45+i*.9,.05);seat(p[0],MS+.42,p[1],Math.PI,'Sit on the sofa')}
    // coffee table
    block('marble',-.6,1.1,MS,MS+.4,-7.4,-5.2,2,true);
    // two armchairs
    for(const z of [-8.3,-4.5]){const f3=frm(-2.2,z,Math.PI/2);f3.B('fabB',.9,.4,.9,0,MS+.2,0,true);f3.B('fabB',.9,.5,.2,0,MS+.62,-.35,true);const p=f3.P(0,.05);seat(p[0],MS+.42,p[1],Math.PI/2,'Sit in the armchair')}
    // TV unit on the port-aft? put a media wall on the starboard bulkhead (x=-3.0) : cabinet + big screen
    block('wood',-3.0,-2.55,MS,MS+.55,-7.6,-5.0,2,true);mb.bx('black',-3.0,-2.95,MS+.9,MS+2.2,-7.3,-5.3);mb.bx('screen',-2.95,-2.93,MS+.95,MS+2.15,-7.25,-5.35);dyn.tvScreen=null;
    // bar unit by the aft doors (port side)
    block('wood',2.0,3.0,MS,MS+1.05,-9.2,-8.0,2,true);block('marble',1.95,3.05,MS+1.05,MS+1.1,-9.25,-7.95,2,false);for(const z of [-8.9,-8.4])mb.cyl('chrome',.02,.02,.9,5,1.7,MS+.5,z);
    // rug under the sofa group
    mb.bx('cream',-3.0,2.9,MS+.012,MS+.02,-8.9,-5.0,4);
    // plant
    mb.cyl('pot',.22,.18,.45,10,-2.6,MS+.22,-9.0);mb.sph('plant',.45,-2.6,MS+.9,-9.0,1,1.2,1);S(-2.85,-2.35,MS,MS+.5,-9.25,-8.75);
    // ceiling lights (recessed discs)
    for(const z of [-8,-5.5,-3]){mb.cyl('lamp',.17,.17,.02,12,0,MC-.02,z);mb.cyl('lamp',.17,.17,.02,12,2.2,MC-.02,z);mb.cyl('lamp',.17,.17,.02,12,-2.2,MC-.02,z)}
  })();
  // --- foyer (z -1 .. 4): stairs both sides, sideboard, mirror ---
  (function foyer(){block('wood',-1.1,1.1,MS,MS+.85,-.9,-.3,2,true);mb.bx('mirror',-.8,.8,MS+1.1,MS+2.1,-.95,-.92);mb.bx('gold',-.85,.85,MS+1.07,MS+1.1,-.96,-.9);
    mb.cyl('lamp',.17,.17,.02,12,0,MC-.02,1);mb.cyl('lamp',.17,.17,.02,12,0,MC-.02,3)})();
  // --- dining room (z 4 .. 9) ---
  (function dining(){
    block('woodL',-1.1,1.1,MS+.72,MS+.8,4.6,8.4,2,true);for(const [x,z] of [[-.9,4.8],[.9,4.8],[-.9,8.2],[.9,8.2]])mb.cyl('chrome',.05,.05,.72,6,x,MS+.36,z);S(-1.1,1.1,MS,MS+.72,4.6,8.4);
    for(const sg of [-1,1])for(const z of [5.0,6.0,7.0,8.0]){const x=sg*1.5;mb.bx('leatherD',x-.22,x+.22,MS+.42,MS+.5,z-.22,z+.22);mb.bx('leatherD',sg>0?x+.18:x-.22,sg>0?x+.22:x-.18,MS+.5,MS+1.0,z-.22,z+.22);mb.bx('chrome',x-.2,x+.2,MS,MS+.42,z-.02,z+.02);
      S(x-.22,x+.22,MS,MS+.95,z-.22,z+.22);seat(x,MS+.46,z,sg>0?-Math.PI/2:Math.PI/2,'Sit at the table')}
    for(const z of [-.0]){}
    for(const z of [5.2,7.8]){mb.cyl('white',.16,.2,.15,10,0,MS+.9,z);mb.cyl('chrome',.01,.01,.08,4,0,MS+.82,z)}   // centrepieces
    mb.cyl('lamp',.3,.3,.04,16,0,MC-.03,6.5);mb.rod('chrome',.01,[0,MC,6.5],[0,MC-.4,6.5],4);
    // sideboard along the port wall
    block('wood',2.6,3.0,MS,MS+.9,4.5,8.5,2,true);mb.bx('glass',2.55,2.6,MS+1.0,MS+1.9,4.7,8.3);for(let i=0;i<5;i++)mb.cyl('white',.07,.06,.3,8,2.8,MS+.9+.15,4.8+i*.7);
  })();
  // --- galley (z 9 .. 13.3) ---
  (function galley(){
    block('steel',-3.0,-2.4,MS,MS+.92,9.2,13.2,2,true);block('marble',-3.05,-2.35,MS+.92,MS+.96,9.15,13.25,2,false);   // starboard counter
    block('steel',2.4,3.0,MS,MS+.92,9.2,13.2,2,true);block('marble',2.35,3.05,MS+.92,MS+.96,9.15,13.25,2,false);       // port counter with hob
    for(const [x,z] of [[2.7,10.0],[2.7,10.6],[2.55,10.3],[2.85,10.3]]){mb.cyl('black',.12,.12,.02,12,x,MS+.97,z)}
    mb.bx('chrome',-3.0,-2.5,MS+.97,MS+1.0,11.6,12.4);mb.cyl('chrome',.025,.025,.3,6,-2.6,MS+1.15,12.0);   // sink + tap
    mb.bx('steel',2.55,3.0,MS+1.6,MS+1.75,9.6,11.2);                                                    // extractor hood
    block('steel',-2.4,-1.5,MS,MS+2.0,12.4,13.3,2,true);mb.bx('black',-2.38,-1.52,MS+1.0,MS+1.02,12.38,12.4);          // fridge
    block('marble',-.7,.7,MS,MS+.95,10.0,11.4,2,true);for(const x of [-.4,0,.4])mb.cyl('chrome',.18,.18,.04,10,x,MS+.62,11.8),seat(x,MS+.64,11.85,Math.PI,'Sit at the island',null,{});   // island with 3 stools
    mb.bx('wood',-3.0,-2.4,MS+1.6,MS+2.2,9.2,11.2);mb.bx('wood',2.4,3.0,MS+1.6,MS+2.2,11.4,13.2);       // wall cabinets
    mb.cyl('lamp',.17,.17,.02,12,0,MC-.02,9.8);mb.cyl('lamp',.17,.17,.02,12,0,MC-.02,12);
  })();
  // --- foredeck (z 13.4 .. 22): sun pads, a bench, anchor winch ---
  (function fore(){
    for(const sg of [-1,1]){block('sunpad',sg*1.6-.7,sg*1.6+.7,MS,MS+.18,14.2,16.4,2,true);mb.bx('white',sg*1.6-.72,sg*1.6+.72,MS+.15,MS+.18,14.18,16.42)}
    seat(-1.6,MS+.2,15.3,0,'Sunbathe on the pad','sit');seat(1.6,MS+.2,15.3,0,'Sunbathe on the pad','sit');
    mb.cyl('steel',.35,.35,.5,12,0,MS+.25,19.4);mb.cyl('black',.12,.12,.9,8,0,MS+.8,19.4,0,0,0);S(-.35,.35,MS,MS+.9,19.05,19.75);
    mb.rod('steel',.05,[0,MS+.4,19.4],[0,MS+.45,22.2],6);   // anchor chain run
    mb.cyl('chrome',.07,.07,1.1,8,0,MS+.55,22.0);          // jackstaff
    for(const sg of [1,-1]){mb.cyl('steel',.1,.12,.35,8,sg*1.2,MS+.2,20);mb.cyl('steel',.1,.12,.35,8,sg*2.8,MS+.2,12.4)}   // bollards
    // bow rail
    const pa=[];for(let z=14;z<=21.4;z+=1.4)pa.push([yHW(z)-.12,z]);rail(pa,MS+.05,.85);const pb=pa.map(p=>[-p[0],p[1]]);rail(pb,MS+.05,.85);
  })();
  // ---------- lower deck: crew + engine room (aft), 4 guest cabins, lobby, master suite ----------
  const LW=.3,LC=2.6;
  (function lower(){
    const corridor=[-.7,.7];
    // corridor walls with doors
    const doors=z=>[[z-.45,z+.45]];
    wall('x',-.7,-14.3,-.8,LW,LC,.08,'white',[...doors(-11.6),...doors(-6.8),...doors(-2.6)]);
    wall('x', .7,-14.3,-.8,LW,LC,.08,'white',[...doors(-11.6),...doors(-6.8),...doors(-2.6)]);
    // cross walls between cabins (from the corridor to the hull)
    for(const z of [-9.2,-4.4]){wall('z',z,.7,3.5,LW,LC,.08,'white');wall('z',z,-3.5,-.7,LW,LC,.08,'white')}
    wall('z',-14.3,-3.6,3.6,LW,LC,.1,'white');   // aft bulkhead of the crew area
    // lobby front bulkhead + master suite door
    wall('z',8.4,-3.6,3.6,LW,LC,.1,'white',[[-.55,.55]]);
    mb.bx('carpet',-3.4,3.4,LW,LW+.012,8.4,17.5,2);mb.bx('carpet',-3.4,3.4,LW,LW+.012,-.8,8.4,2);mb.bx('carpet',-.7,.7,LW,LW+.012,-14.3,-.8,2);
    // lobby: chandelier-ish light, console table
    block('wood',1.4,2.9,LW,LW+.8,7.7,8.2,2,true);mb.bx('mirror',1.6,2.7,LW+1.1,LW+2.0,8.3,8.32);mb.cyl('lamp',.3,.3,.04,16,0,LC-.05,6);mb.cyl('lamp',.3,.3,.04,16,0,LC-.05,2);
    // under-stairs side wall visuals handled by stair boxes. Light strips along the corridor
    for(const z of [-12,-8,-4,0])mb.cyl('lamp',.14,.14,.02,10,0,LC-.03,z);
    // ----- guest cabin builder -----
    const cabin=(sg,za,zb,name)=>{const hw=Math.min(yHX(za,1.6),yHX(zb,1.6))-.12,xin=.78,zc=(za+zb)/2;
      // bed: head to the aft wall, 1.6 × 2.1
      const bx=sg*(xin+hw)/2+sg*.2,f=frm(bx,za+1.3,sg>0?0:0);   // face +z
      block('woodL',bx-.85,bx+.85,LW,LW+.3,za+.12,za+2.3,2,true);                   // base
      mb.bx('linen',bx-.8,bx+.8,LW+.3,LW+.52,za+.2,za+2.25);mb.bx('linenB',bx-.82,bx+.82,LW+.5,LW+.54,za+1.15,za+2.28);   // mattress + throw
      for(const dx of [-.4,.4])mb.bx('linen',bx+dx-.28,bx+dx+.28,LW+.52,LW+.66,za+.22,za+.62);
      mb.bx('wood',bx-.86,bx+.86,LW+.3,LW+1.15,za+.06,za+.14);
      for(const dx of [-1.15,1.15]){const nx=bx+dx;if(Math.abs(nx)>hw-.1||Math.abs(nx)<xin+.1)continue;block('wood',nx-.22,nx+.22,LW,LW+.5,za+.14,za+.58,2,true);mb.cyl('lamp',.1,.07,.22,8,nx,LW+.62,za+.36);mb.cyl('chrome',.01,.01,.15,4,nx,LW+.55,za+.36)}
      // sit on the bed edge
      seat(bx-.4,LW+.6,za+2.35,Math.PI,'Sit on the bed');seat(bx+.4,LW+.6,za+2.35,Math.PI,'Sit on the bed');
      // wardrobe along the corridor wall at the forward end
      block('wood',sg>0?.78:-1.38,sg>0?1.38:-.78,LW,LW+2.05,zb-.9,zb-.12,2,true);mb.bx('chrome',sg>0?1.33:-1.36,sg>0?1.36:-1.33,LW+1.0,LW+1.1,zb-.55,zb-.45);
      // TV on the aft wall opposite? small wall TV above the wardrobe-side wall
      mb.bx('black',sg*(hw-.1)-.02,sg*(hw-.1)+.02,LW+1.2,LW+1.9,zb-1.9,zb-1.1);mb.bx('screen',sg*(hw-.12)-.01,sg*(hw-.12)+.01,LW+1.25,LW+1.85,zb-1.85,zb-1.15);
      // bathroom corner (forward outer corner): shower stall, toilet, basin
      const bxm=sg*(hw-.45);mb.bx('tile',bxm-.5,bxm+.5,LW,LW+.014,zb-1.3,zb-.15,1);
      block('glass',bxm-.5,bxm+.5,LW,LW+2.0,zb-1.3,zb-1.25,2,true);
      mb.cyl('chrome',.03,.03,.4,6,bxm+sg*.38,LW+1.9,zb-.12,Math.PI/2.3);mb.cyl('chrome',.08,.08,.02,10,bxm+sg*.38,LW+1.95,zb-.3);
            mb.cyl('white',.17,.14,.38,10,sg*(hw-.45),LW+.19,zb-1.0);mb.bx('white',sg*(hw-.45)-.17,sg*(hw-.45)+.17,LW+.4,LW+.85,zb-1.18,zb-1.08);
      mb.bx('white',sg>0?xin+.08:-xin-.5,sg>0?xin+.5:-xin-.08,LW+.82,LW+.9,zb-.7,zb-.18);mb.bx('mirror',sg>0?xin+.1:-xin-.5,sg>0?xin+.5:-xin-.1,LW+1.2,LW+1.8,zb-.14,zb-.12);
      // porthole shows through the hull; rug
      mb.bx('cream',bx-1.0,bx+1.0,LW+.012,LW+.02,za+2.45,za+3.4,4);
      // ceiling light
      mb.cyl('lamp',.17,.17,.02,12,bx,LC-.03,zc);};
    cabin(1,-9.2,-4.4);cabin(-1,-9.2,-4.4);cabin(1,-4.4,-.8);cabin(-1,-4.4,-.8);
    // crew bunks (port) and engine room (starboard)
    for(const z of [-13.4,-12.0]){block('wood',1.2,3.2,LW,LW+.4,z-.4,z+.4,2,true);mb.bx('linenB',1.25,3.15,LW+.4,LW+.5,z-.35,z+.35);block('wood',1.2,3.2,LW+1.0,LW+1.4,z-.4,z+.4,2,false);mb.bx('linen',1.25,3.15,LW+1.4,LW+1.5,z-.35,z+.35)}
    block('engine',-3.1,-1.9,LW,LW+1.5,-13.9,-9.6,2,true);for(const z of [-13.2,-10.4])mb.cyl('steel',.3,.3,1.6,12,-2.5,LW+1.7,z,0,0,0);mb.cyl('steel',.18,.18,3,10,-2.5,LW+1.0,-11.8,Math.PI/2);mb.bx('engine',-1.9,-1.2,LW,LW+.6,-13.0,-12.3);mb.cyl('steel',.15,.15,.9,8,-1.55,LW+1.0,-12.65);
    // ----- master suite (z 8.4 .. 17.5) -----
    const mz=0;let bz=12.4;
    block('woodL',-1.1,1.1,LW,LW+.35,bz-1.2,bz+1.0,2,true);mb.bx('linen',-1.05,1.05,LW+.35,LW+.62,bz-1.15,bz+.95);mb.bx('linenB',-1.08,1.08,LW+.6,LW+.64,bz-.2,bz+1.0);
    for(const dx of [-.55,.55])mb.bx('linen',dx-.35,dx+.35,LW+.62,LW+.78,bz+.62,bz+.92);mb.bx('wood',-1.15,1.15,LW+.35,LW+1.4,bz+1.0,bz+1.1);
    for(const dx of [-1.55,1.55]){block('wood',dx-.25,dx+.25,LW,LW+.55,bz+.55,bz+1.05,2,true);mb.cyl('lamp',.11,.08,.25,8,dx,LW+.68,bz+.8)}
    seat(-.5,LW+.66,bz-1.3,0,'Sit on the bed');seat(.5,LW+.66,bz-1.3,0,'Sit on the bed');
    // wardrobes + dresser
    block('wood',1.8,2.5,LW,LW+2.1,9.0,10.8,2,true);block('wood',-2.5,-1.8,LW,LW+2.1,9.0,10.8,2,true);block('wood',-2.0,-1.4,LW,LW+.9,12.4,13.9,2,true);mb.bx('mirror',-2.0,-1.98,LW+1.0,LW+1.9,12.6,13.7);
    // sofa + TV at the bow end
    const fs=frm(0,15.9,Math.PI);fs.B('cream',1.7,.4,.8,0,LW+.2,0,true);fs.B('cream',1.7,.45,.18,0,LW+.6,-.3,true);for(let i=0;i<2;i++){const p=fs.P(-.4+i*.8,.05);seat(p[0],LW+.42,p[1],Math.PI,'Sit on the sofa')}
    mb.bx('black',-.7,.7,LW+1.1,LW+1.8,12.0+.0,12.0+.03);   // (hidden behind bed head: skip)
    // en-suite bathroom aft-port corner of the suite
    mb.bx('tile',.9,3.3,LW,LW+.014,8.5,10.8,1);block('glass',.9,3.3,LW,LW+2.0,10.8,10.85,2,true);
    mb.cyl('white',.18,.15,.4,10,2.9,LW+.2,9.4);mb.bx('white',2.72,3.08,LW+.4,LW+.9,9.25,9.4);mb.bx('white',1.0,1.7,LW+.85,LW+.93,8.6,9.2);mb.bx('mirror',1.0,1.7,LW+1.2,LW+1.9,8.55,8.57);block('white',1.2,1.5,LW,LW+.85,8.6,8.9,2,false);
    mb.cyl('lamp',.17,.17,.02,12,0,LC-.03,12.4);mb.cyl('lamp',.17,.17,.02,12,0,LC-.03,15);mb.cyl('lamp',.17,.17,.02,12,2.2,LC-.03,9.8);
    mb.bx('carpet',-2.4,2.4,LW+.012,LW+.02,11.0,16.0,4);
  })();
  // ---------- upper deck: sky lounge (aft), wheelhouse (fore) ----------
  (function upperDeck(){
    // glazed walls of the sky lounge + wheelhouse (x = ±3.1, from z -9.2 to 7.6), roof is the sun-deck slab / wheelhouse roof
    for(const sg of [1,-1])glassWall('x',sg*3.1,-9.2,7.6,UP,7.6,[[2.0,3.1]],2.3);
    glassWall('z',-9.2,-3.1,3.1,UP,7.6,[[-1.2,1.2]],1.3);
    glassWall('z',7.6,-3.1,3.1,UP,7.6,[],1.0);                 // windscreen (forward)
    mb.bx('white',-3.2,3.2,7.6,7.78,-9.2,0);                  // roof over the lounge is the sun deck floor underside
    mb.bx('carpet',-3.0,3.0,UP,UP+.012,-9.0,.2,2);mb.bx('woodL',-3.0,3.0,UP,UP+.012,.2,7.5,2);
    // sky lounge: two curved sofas, a bar, a piano-ish console
    for(const sg of [1,-1]){const f=frm(sg*2.5,-5.5,sg>0?-Math.PI/2:Math.PI/2);f.B('cream',4.2,.42,.9,0,UP+.22,0,true);f.B('cream',4.2,.5,.2,0,UP+.68,-.38,true);for(let i=0;i<4;i++){const p=f.P(-1.5+i*1.0,.05);seat(p[0],UP+.45,p[1],sg>0?-Math.PI/2:Math.PI/2,'Sit on the sofa')}}
    block('marble',-.7,.7,UP,UP+.42,-6.3,-4.7,2,true);
    block('wood',-3.0,-2.3,UP,UP+1.05,-2.2,-.2,2,true);for(const z of [-1.7,-1.0,-.4])mb.cyl('chrome',.17,.17,.04,10,-1.9,UP+.7,z),seat(-1.85,UP+.72,z,Math.PI/2,'Sit at the bar',null,{});mb.bx('mirror',-3.05,-3.03,UP+1.2,UP+2.1,-2.1,-.3);
    for(const z of [-8,-5.5,-3,-.8])for(const x of [-2,0,2])mb.cyl('lamp',.15,.15,.02,12,x,7.55,z);
    // ---- wheelhouse (z 0.2 .. 7.5) ----
    // helm console across the front, three screens + a live one, wheel, levers
    block('black',-2.8,2.8,UP,UP+.95,6.4,7.3,2,true);mb.bx('white',-2.9,2.9,UP+.95,UP+1.02,6.35,7.35);
    mb.bx('black',-2.8,2.8,UP+1.02,UP+1.08,6.8,7.35);
    for(const [x,k] of [[-1.9,'screen'],[-.9,'screen'],[1.9,'screen']]){mb.box('black',.85,.55,.06,x,UP+1.5,7.0,0,-.5);mb.box(k,.76,.46,.02,x,UP+1.5,6.97,0,-.5)}
    mb.box('black',.9,.55,.06,.45,UP+1.5,7.0,0,-.5);                           // the live screen (own material, set from the Yacht class)
    mb.box('liveScreen',.8,.46,.02,.45,UP+1.5,6.97,0,-.5);
    // wheel (torus ring + spokes) on the console in front of the pilot chair
    mb.cyl('chrome',.05,.05,.5,8,.8,UP+1.15,6.3,.5);
    // throttle levers (two) + rudder indicator + buttons
    for(const x of [1.45,1.7])mb.rod('chrome',.018,[x,UP+1.05,6.5],[x,UP+1.35,6.45],5),mb.sph('red',.04,x,UP+1.37,6.45);
    for(let i=0;i<8;i++)mb.box(i%3===0?'green':i%3===1?'redL':'whiteL',.06,.02,.05,-.4-i*.09,UP+1.05,6.55);
    // pilot chair + co-pilot chair
    const chair=(x,z,pilot)=>{mb.bx('leatherD',x-.28,x+.28,UP+.5,UP+.6,z-.28,z+.28);mb.bx('leatherD',x-.28,x+.28,UP+.6,UP+1.2,z-.34,z-.24);mb.cyl('chrome',.04,.04,.5,6,x,UP+.25,z);mb.cyl('chrome',.25,.25,.03,10,x,UP+.02,z);S(x-.28,x+.28,UP,UP+.6,z-.28,z+.28);
      return seat(x,UP+.52,z,0,pilot?'Take the helm':'Sit in the co-pilot seat','sit',pilot?{hold:true,keys:true,helm:true,standLabel:'Leave the helm'}:null)};
    spots.helm=chair(.8,5.6,true);chair(-1.1,5.6,false);
    // chart table behind
    block('woodL',-2.9,-1.9,UP,UP+.95,2.0,4.2,2,true);mb.bx('mirror',-2.8,-2.0,UP+.95,UP+.97,2.2,4.0);
    // radar mast on the roof (rotating) + antenna + horn + nav lights
    const mast=new THREE.Group();mast.position.set(0,7.88,1.8);root.add(mast);dyn.mast=mast;
    {const mm=new MB();mm.rod('white',.07,[0,0,0],[0,2.4,0],8);mm.bx('white',-.9,.9,2.3,2.38,-.06,.06);mm.rod('chrome',.012,[-.7,2.38,0],[-.7,3.3,0],4);mm.rod('chrome',.012,[.7,2.38,0],[.7,3.0,0],4);mm.sph('whiteL',.07,0,2.6,0);
      mm.build(mast,{white:M.white,chrome:M.chrome,whiteL:M.whiteL})}
    const rad=new THREE.Group();rad.position.set(0,2.2,0);mast.add(rad);dyn.radar=rad;{const rm=new MB();rm.bx('white',-.75,.75,0,.06,-.08,.08);rm.bx('white',-.06,.06,-.14,.0,-.06,.06);rm.build(rad,{white:M.white})}
    // nav lights
    for(const sg of [1,-1]){mb.sph(sg>0?'redL':'green',.08,sg*3.85,UP+.9,6.4)}mb.sph('whiteL',.08,0,UP+3.0+4.7,1.8);mb.sph('whiteL',.07,0,2.7,-20.9);
    // bridge wing consoles
    for(const sg of [1,-1])block('black',sg*3.5-.25,sg*3.5+.25,UP,UP+1.0,4.0,4.6,2,false);
    // side door gaps handled in the glass wall; rails on the wings
    for(const sg of [1,-1]){const x=sg*3.9;rail([[x,1.5],[x,6.5],[sg*3.1,6.5]],UP,1.0)}
    // aft terrace (open) furniture: lounge sofas + table + bar
    for(const sg of [1,-1]){const f=frm(sg*2.8,-13.2+(sg>0?-.0:0),sg>0?-Math.PI/2:Math.PI/2);}
    {const f=frm(0,-16.4,0);f.B('cream',4.0,.4,.85,0,UP+.2,0,true);f.B('cream',4.0,.5,.2,0,UP+.62,-.35,true);for(let i=0;i<4;i++){const p=f.P(-1.5+i*1.0,.05);seat(p[0],UP+.42,p[1],0,'Sit on the sofa')}}
    block('marble',-1.0,1.0,UP,UP+.4,-15.0,-14.0,2,true);block('cream',-1.2,-.6,UP,UP+.4,-12.2,-11.5,2,true);
    // railings of the upper deck
    const upR=[];for(let z=-17.2;z<=11;z+=1.8)upR.push(z);for(const sg of [1,-1]){const pts=upR.filter(z=>!(z>-16.5&&z<-11.2&&sg<0)).map(z=>[sg*(z<-9.2?3.85:3.6),z]);rail(pts,UP,1.0)}rail([[-3.85,-17.4],[3.85,-17.4]],UP,1.0);
  })();
  // ---------- sun deck ----------
  (function sunDeck(){const SD=Y_FL.sun;
    // jacuzzi (sunken look): rim + water + steps
    block('white',-1.5,1.5,SD,SD+.55,-8.8,-5.6,2,true);mb.bx('water',-1.35,1.35,SD+.5,SD+.52,-8.65,-5.75);for(const x of [-1.2,-.6,0,.6,1.2])mb.sph('whiteL',.04,x,SD+.46,-8.7);
    seat(-1.0,SD+.58,-5.45,Math.PI,'Sit in the jacuzzi');seat(1.0,SD+.58,-5.45,Math.PI,'Sit in the jacuzzi');
    // sun loungers (4) with cushions
    for(const [x,z] of [[-2.4,-9.4],[2.4,-9.4],[-2.4,-3.2],[2.4,-3.2]]){block('white',x-.4,x+.4,SD,SD+.25,z-.9,z+.9,2,false);mb.bx('sunpad',x-.38,x+.38,SD+.25,SD+.33,z-.88,z+.88);mb.box('sunpad',.76,.08,.7,x,SD+.5,z+.55,0,-.55);seat(x,SD+.38,z-.2,0,'Lie on the sun lounger','sit',{});S(x-.4,x+.4,SD,SD+.3,z-.9,z+.9)}
    // bar
    block('white',-1.6,1.6,SD,SD+1.0,-1.9,-1.2,2,true);mb.bx('wood',-1.7,1.7,SD+1.0,SD+1.06,-2.0,-1.1);for(const x of [-1.0,0,1.0])mb.cyl('chrome',.17,.17,.04,10,x,SD+.7,-2.5),seat(x,SD+.72,-2.5,0,'Sit at the bar','sit',{});
    for(const x of [-1.2,-.4,.4,1.2])mb.cyl('white',.05,.06,.22,6,x,SD+1.17,-1.55);
    block('white',-1.6,1.6,SD+1.2,SD+1.28,-1.95,-1.3,2,false);mb.cyl('chrome',.03,.03,1.2,6,-1.5,SD+.6+1.2,-1.9);mb.cyl('chrome',.03,.03,1.2,6,1.5,SD+.6+1.2,-1.9);   // bar canopy posts
    // railings
    const sr=[];for(let z=-10.4;z<=1;z+=1.8)sr.push(z);for(const sg of [1,-1])rail(sr.filter(z=>!(sg>0&&z>-14&&z<-10.6)).map(z=>[sg*3.3,z]),SD,1.0);rail([[-3.3,1],[3.3,1]],SD,1.0);rail([[-3.3,-10.5],[1.2,-10.5]],SD,1.0);
    // tender boat on chocks (aft)
    block('white',-1.2,1.2,SD+.2,SD+.65,-10.0,-7.2,2,false);
  })();
  // ---------- the ensign + name ----------
  mb.bx('flagB',-.5,.5,Y_FL.main+1.5,Y_FL.main+1.85,-20.55,-20.5);mb.bx('flagY',-.5,.5,Y_FL.main+1.15,Y_FL.main+1.5,-20.55,-20.5);mb.rod('chrome',.02,[0,Y_FL.main,-20.5],[0,Y_FL.main+2.0,-20.5],5);
  // ---------- hull side name plate "ODESA PEARL" (canvas) ----------
  const nameTex=MBM.tex(512,96,(x,w,h)=>{x.fillStyle='rgba(0,0,0,0)';x.clearRect(0,0,w,h);x.fillStyle='#c9a24a';x.font='700 62px "Unbounded", Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('ODESA PEARL',w/2,h/2+4)});
  const nameM=new THREE.MeshBasicMaterial({map:nameTex,transparent:true,depthWrite:false,toneMapped:false});
  for(const sg of [1,-1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(7,1.3),nameM);const z=-4,y=2.2;p.position.set(sg*(yHX(z,y)+.03),y,z);p.rotation.y=sg>0?Math.PI/2:-Math.PI/2;root.add(p)}
  // live screen on the wheelhouse console: a canvas the Yacht class redraws
  const live=document.createElement('canvas');live.width=256;live.height=160;const liveTex=new THREE.CanvasTexture(live);liveTex.encoding=THREE.sRGBEncoding;M.liveScreen=MBM.emis(0xffffff,.9,{map:liveTex,emissiveMap:liveTex});dyn.live={cv:live,tex:liveTex};
  // ---------- build the merged meshes ----------
  const meshes=mb.build(root,M,{noShadow:new Set(['carpet','linen','linenB','woodL','tile','sunpad','fabC','fabB','cream','lamp','screen','marble','mirror','books']),name:'yacht'});
  // sails the dust off the exposed sun deck meshes (they stay static)
  const plat={name:'yacht',root,floors,boxes,seats,acts,surf:'wood',camMax:2.3,
    inside(lx,ly,lz){if(ly<2.5)return lz>-14.4&&lz<18;if(ly<5.2)return Math.abs(lx)<3.15&&lz>-9.4&&lz<13.5;if(ly<7.8)return Math.abs(lx)<3.15&&lz>-9.3&&lz<7.7;return false}};
  return {root,plat,dyn,spots,M,meshes}
}
