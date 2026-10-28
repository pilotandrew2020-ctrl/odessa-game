// buses.js — hand-built city bus and minibus meshes for the instanced traffic.
// The lofted shells of those two came out as open glass boxes (no roof, no interior, windows you could see straight through);
// these are closed hulls with pillars, a roof, a floor, seats, rails and glass that is drawn last so it blends over the inside.
// Output is the same {geo,wgeo,W,L,wz,wx,wr} as buildCarType(); materials: 0 body (instance colour), 1 glass, 2 head lamp,
// 3 tail lamp, 4 tyre, 5 bright metal, 6 black, 7 flat colour, 8 emissive.
function buildBoxVehicle(def){
  const kind=def.box,W=def.W,hw=W/2;
  const g=new GB({position:3,normal:3,aCol:3,aM:1});
  const V=(p,n,col,m)=>g.v({position:p,normal:n,aCol:col,aM:m});
  const BODY=[1,1,1],BLK=[0,0,0],late=[];
  const box=(cx,cy,cz,sx,sy,sz,m,col)=>{const b=new THREE.BoxGeometry(sx,sy,sz);b.translate(cx,cy,cz);const G=b.toNonIndexed(),p=G.attributes.position,n=G.attributes.normal;
    for(let i=0;i<p.count;i+=3){const ids=[];for(let j=0;j<3;j++)ids.push(V([p.getX(i+j),p.getY(i+j),p.getZ(i+j)],[n.getX(i+j),n.getY(i+j),n.getZ(i+j)],col||BODY,m));g.tri(...ids)}b.dispose();G.dispose()};
  const quad=(P4,n,m,col)=>{const b0=g.n;for(const p of P4)V(p,n,col||BLK,m);g.tri(b0,b0+1,b0+2);g.tri(b0,b0+2,b0+3);g.tri(b0,b0+2,b0+1);g.tri(b0,b0+3,b0+2)};
  const tri=(a,b,c,n,m,col)=>{const b0=g.n;for(const p of [a,b,c])V(p,n,col||BLK,m);g.tri(b0,b0+1,b0+2);g.tri(b0,b0+2,b0+1)};
  const glassX=(x,y0,y1,za,zb)=>{if(zb-za>.05)late.push(()=>quad([[x,y0,za],[x,y1,za],[x,y1,zb],[x,y0,zb]],[Math.sign(x),0,0],1))};
  const glassZ=(z,x0,x1,y0,y1)=>late.push(()=>quad([[x0,y0,z],[x0,y1,z],[x1,y1,z],[x1,y0,z]],[0,0,Math.sign(z)],1));
  const zf=def.front,zr=def.rear;
  const white=[.8,.82,.8],floorC=[.16,.16,.17],seatC=[.12,.27,.56],seatC2=[.78,.5,.1],metal=[.55,.56,.58];
  if(kind==='bus'){
    const x0=hw-.03,yb=def.y0,sill=1.3,fl=1.0,rf=2.78,top=3.06,L=zf-zr;
    // hull: lower side panels, front/rear panels, undercarriage, floor
    for(const s of [-1,1])box(s*x0,(yb+sill)/2,0,.06,sill-yb,L-.04,0);
    box(0,(yb+sill)/2,zf-.03,W-.04,sill-yb,.06,0);box(0,(yb+sill)/2,zr+.03,W-.04,sill-yb,.06,0);
    box(0,(yb+fl)/2-.02,0,W-.2,fl-yb-.04,L-.2,6);box(0,fl-.02,0,W-.14,.04,L-.14,7,floorC);
    for(const s of [-1,1])box(s*(x0+.01),1.2,0,.01,.09,L-.1,7,[.93,.93,.9]);   // white waist stripe
    // roof, header, front/back upper panels
    box(0,(rf+top)/2,0,W-.04,top-rf,L-.04,7,white);box(0,top+.07,-1.4,1.7,.14,3.4,7,[.68,.7,.72]);
    for(const s of [-1,1])box(s*(x0-.02),2.74,0,.1,.09,L-.1,0);
    box(0,2.9,zf-.03,W-.04,.32,.06,0);box(0,2.88,zf-.0,1.34,.34,.03,6);
    box(0,2.88,zr+.03,W-.04,.36,.06,0);box(0,1.4,zr+.03,W-.04,.2,.06,0);for(const s of [-1,1])box(s*1.1,2.1,zr+.03,.3,1.2,.06,0);   // rear panels around the window
    // pillars
    const PZ=[zr+.06,-3.6,-1.2,1.2,3.6,zf-.06];
    for(const s of [-1,1])for(const z of PZ)box(s*(x0-.02),2.0,z,.1,1.48,.13,0);
    box(0,2.0,zf-.04,.07,1.48,.07,0);box(0,2.1,zr+.04,.07,1.2,.07,0);
    // glass: left side bays; right side has two double doors
    for(let i=0;i<PZ.length-1;i++){const a=PZ[i]+.07,b=PZ[i+1]-.07;glassX(x0+.014,1.4,2.7,a,b);
      if(i===1||i===3){const m=(a+b)/2;glassX(-x0-.014,1.4,2.7,a,m-.03);glassX(-x0-.014,1.4,2.7,m+.03,b);box(-x0-.02,1.7,m,.02,2.0,.05,6)}   // rear door + front door
      else glassX(-x0-.014,1.4,2.7,a,b)}
    glassZ(zf-.03,-1.13,-.05,1.36,2.72);glassZ(zf-.03,.05,1.13,1.36,2.72);glassZ(zr+.03,-.95,.95,1.5,2.7);
    // lamps, bumpers, plates, mirrors
    for(const s of [-1,1]){box(s*.95,.86,zf+.01,.42,.2,.07,2,[1,.95,.82]);box(s*1.12,.86,zf+.01,.16,.16,.06,2,[1,.62,.1]);box(s*1.06,.98,zr-.012,.2,.55,.05,3,[.78,.04,.03]);
      box(s*(hw+.28),2.18,zf-.55,.08,.46,.16,6);box(s*(hw+.14),2.38,zf-.55,.3,.04,.04,6)}
    box(0,.56,zf+.05,W-.02,.22,.16,6);box(0,.56,zr-.05,W-.02,.22,.16,6);box(0,.8,zf+.03,.56,.13,.02,7,[.93,.93,.9]);box(0,.8,zr-.03,.56,.13,.02,7,[.93,.93,.9]);
    box(0,.84,zf+.02,.86,.26,.06,6);
    // interior: seats, rails, ceiling lamps, driver
    const rowsL=[-4.5,-3.6,-2.7,-1.8,-.9,0,.9,1.8,2.7,3.6],rowsR=[-4.5,-3.9,-.7,.2,1.1];
    for(const [xs,rows] of [[.86,rowsL],[-.86,rowsR]])for(const z of rows){box(xs,1.17,z,.66,.34,.56,6);box(xs,1.38,z,.7,.1,.62,7,seatC);box(xs,1.74,z-.31,.7,.6,.08,7,seatC)}
    for(const s of [-1,1]){box(s*.5,2.66,0,.04,.04,L-1.2,5);for(const z of [-2.4,0,2.4])box(s*.5,1.85,z,.04,1.7,.04,5)}
    box(0,rf-.02,-2.6,.34,.02,3.4,8,[1,.96,.82]);box(0,rf-.02,1.6,.34,.02,3.4,8,[1,.96,.82]);
    box(.78,1.18,4.2,.54,.34,.54,6);box(.78,1.38,4.2,.58,.1,.58,7,[.1,.1,.11]);box(.78,1.78,3.92,.56,.72,.1,7,[.1,.1,.11]);
    box(.7,1.72,4.72,.46,.04,.46,6);box(0,1.5,zf-.28,W-.3,.34,.3,6);
  }else{
    // minibus (Sprinter style): boxy cabin/cargo body, short bonnet, steep windscreen
    const x0=hw-.03,yb=def.y0||.28,sill=1.18,fl=.85,rf=2.45,top=2.58,zc=1.75,zn=2.27,hh=1.15,L=zf-zr;
    for(const s of [-1,1])box(s*x0,(yb+sill)/2,(zr+zc)/2,.06,sill-yb,zc-zr-.04,0);
    box(0,(yb+sill)/2,zr+.03,W-.04,sill-yb,.06,0);box(0,(sill+1.4)/2,zr+.03,W-.04,1.4-sill,.06,0);box(0,(2.3+rf)/2,zr+.03,W-.04,rf-2.3,.06,0);for(const s of [-1,1])box(s*(.8+hw-.02)/2,1.85,zr+.03,hw-.82,.9,.06,0);
    box(0,(yb+fl)/2-.02,(zr+zc)/2,W-.2,fl-yb-.04,zc-zr-.1,6);box(0,fl-.02,(zr+zc)/2,W-.14,.04,zc-zr-.1,7,floorC);
    // bonnet block + nose
    box(0,(yb+hh)/2,(zc+zf)/2,W-.04,hh-yb,zf-zc,0);box(0,.74,zf+.01,.9,.3,.07,6);
    // roof + header + posts
    box(0,(rf+top)/2,(zr+zc+.06)/2,W-.04,top-rf,zc-zr+.06,7,white);for(const s of [-1,1])box(s*(x0-.02),2.4,(zr+zc)/2,.1,.1,zc-zr-.1,0);
    const PZ=[zr+.06,-1.45,-.25,.9,zc-.04];
    for(const s of [-1,1])for(const z of PZ)box(s*(x0-.02),1.82,z,.1,1.3,.12,0);
    box(0,2.0,zr+.04,.07,1.2,.07,0);
    // side glass (right: sliding door in the third bay), cab door glass + wedge up to the windscreen
    for(let i=0;i<PZ.length-1;i++){const a=PZ[i]+.07,b=PZ[i+1]-.07;glassX(x0+.014,1.28,2.38,a,b);if(i===2){glassX(-x0-.014,1.1,2.38,a,b);box(-x0-.02,1.74,(a+b)/2,.02,1.3,.05,6)}else glassX(-x0-.014,1.28,2.38,a,b)}
    for(const s of [-1,1])late.push(()=>tri([s*(x0+.014),hh,zc],[s*(x0+.014),2.38,zc],[s*(x0+.014),hh,zn],[s,0,0],1));
    // windscreen (sloped) and rear window
    late.push(()=>quad([[-.95,hh+.05,zn],[.95,hh+.05,zn],[.95,2.42,zc+.03],[-.95,2.42,zc+.03]],[0,.38,.92],1));glassZ(zr+.03,-.8,.8,1.4,2.3);
    // lamps, bumpers, plates, mirrors
    for(const s of [-1,1]){box(s*.7,.78,zf+.01,.34,.18,.07,2,[1,.95,.82]);box(s*.88,.78,zf+.01,.14,.14,.06,2,[1,.62,.1]);box(s*.9,.95,zr-.012,.18,.5,.05,3,[.78,.04,.03]);
      box(s*(hw+.2),1.95,zc+.3,.08,.4,.14,6);box(s*(hw+.08),2.12,zc+.3,.22,.04,.04,6)}
    box(0,.5,zf+.05,W-.02,.2,.15,6);box(0,.5,zr-.05,W-.02,.2,.15,6);box(0,.62,zf+.04,.52,.12,.02,7,[.93,.93,.9]);box(0,.62,zr-.03,.52,.12,.02,7,[.93,.93,.9]);
    // seats: four rows of three on the left, singles on the right
    for(const z of [-2.35,-1.4,-.45,.5]){for(const xs of [.72,.18]){box(xs,1.05,z,.46,.4,.5,6);box(xs,1.28,z,.5,.1,.54,7,seatC2);box(xs,1.62,z-.28,.5,.58,.08,7,seatC2)}
      if(z<-.1){box(-.72,1.05,z,.46,.4,.5,6);box(-.72,1.28,z,.5,.1,.54,7,seatC2);box(-.72,1.62,z-.28,.5,.58,.08,7,seatC2)}}
    box(.5,2.3,0,.04,.04,3.6,5);box(-.5,1.5,.9,.04,1.3,.04,5);box(.45,1.05,1.4,.5,.4,.5,6);box(.45,1.28,1.4,.54,.1,.56,7,[.12,.12,.13]);box(.45,1.62,1.12,.54,.58,.08,7,[.12,.12,.13]);box(.3,1.5,zc+.12,.46,.04,.46,6);box(0,1.2,zc+.2,W-.3,.4,.3,6);
    box(0,rf-.02,-.6,.3,.02,3.6,8,[1,.96,.82]);
  }
  // wheel arches and the dark discs behind the wheels (same trick as the car shells)
  const triFace=(a,b,c)=>{g.tri(a,b,c);g.tri(a,c,b)};
  for(const wz of def.wz)for(const side of [-1,1]){const radius=def.wr*1.22,x=side*(hw+.018),segs=12,base=g.n;
    for(let i=0;i<=segs;i++){const a=Math.PI*i/segs;for(const r of [radius-.035,radius]){V([x,def.wr+Math.sin(a)*r,wz+Math.cos(a)*r],[side,0,0],BLK,6)}}
    for(let i=0;i<segs;i++){const a=base+i*2,b=a+1,c=a+2,d=a+3;triFace(a,c,b);triFace(b,c,d)}
    const cyl=new THREE.CylinderGeometry(def.wr*1.2,def.wr*1.2,.03,16);cyl.rotateZ(Math.PI/2);cyl.translate(side*(hw+.002),def.wr,wz);
    const G2=cyl.toNonIndexed(),p=G2.attributes.position,n=G2.attributes.normal;for(let i=0;i<p.count;i+=3){const ids=[];for(let j=0;j<3;j++)ids.push(V([p.getX(i+j),p.getY(i+j),p.getZ(i+j)],[n.getX(i+j),n.getY(i+j),n.getZ(i+j)],BLK,6));g.tri(...ids)}cyl.dispose();G2.dispose()}
  for(const f of late)f();   // glass last: it blends over the interior and the far side instead of hiding it
  const geo=g.build();
  const wg=new GB({position:3,normal:3,aCol:3,aM:1});
  const addWheelPart=(ge,m)=>{const G=ge.toNonIndexed(),p=G.attributes.position,n=G.attributes.normal;for(let i=0;i<p.count;i+=3){const ids=[];for(let j=0;j<3;j++)ids.push(wg.v({position:[p.getX(i+j),p.getY(i+j),p.getZ(i+j)],normal:[n.getX(i+j),n.getY(i+j),n.getZ(i+j)],aCol:[0,0,0],aM:m}));wg.tri(...ids)}};
  const tyre=new THREE.CylinderGeometry(def.wr,def.wr,kind==='bus'?.3:.24,16);tyre.rotateZ(Math.PI/2);
  const rim=new THREE.CylinderGeometry(def.wr*.6,def.wr*.6,kind==='bus'?.312:.252,12);rim.rotateZ(Math.PI/2);
  addWheelPart(tyre,4);addWheelPart(rim,5);
  for(let i=0;i<6;i++){const sp=new THREE.BoxGeometry(.075,def.wr*.62,.07);sp.translate(0,def.wr*.36,0);sp.rotateX(i*Math.PI/3);addWheelPart(sp,5)}
  return {geo,wgeo:wg.build(),W,L:def.L,wz:def.wz,wx:W/2-.08,wr:def.wr};
}
