// carx.js — wheels and cabin detail for the instanced cars: buildCarType() in index.html and buildBoxVehicle() in buses.js call these.
// Materials (see CAR_SURF): 0 body (instance colour), 1 glass, 2 head lamp, 3 tail lamp, 4 tyre, 5 bright metal, 6 black, 7 flat colour, 8 emissive.
// The wheel mesh is instanced for both sides of the car, so it is symmetric about the axle plane (spokes run through, hubs on both faces).
function cxAdd(g,ge,m,col){
  const G=ge.index?ge.toNonIndexed():ge,p=G.attributes.position,n=G.attributes.normal;
  for(let i=0;i<p.count;i+=3){const ids=[];for(let j=0;j<3;j++)ids.push(g.v({position:[p.getX(i+j),p.getY(i+j),p.getZ(i+j)],normal:[n.getX(i+j),n.getY(i+j),n.getZ(i+j)],aCol:col||[0,0,0],aM:m}));g.tri(...ids)}
  ge.dispose();if(G!==ge)G.dispose();
}
// tyre with rounded shoulders and a bulging sidewall (lathe), dark dished rim face, five spokes or a steel hub-cap, centre hub
function cxWheel(def,o){
  o=o||{};const R=def.wr,hw=(o.w||.22)/2,wg=new GB({position:3,normal:3,aCol:3,aM:1}),SEG=o.seg||14;
  const prof=[[.58,-.97],[.8,-1],[.96,-.7],[1,-.3],[1,.3],[.96,.7],[.8,1],[.58,.97]].map(([r,a])=>new THREE.Vector2(R*r,hw*a));
  const tyre=new THREE.LatheGeometry(prof,SEG);tyre.rotateZ(Math.PI/2);cxAdd(wg,tyre,4);
  const alloy=(o.alloy!==undefined?o.alloy:def.alloy)!==false;
  for(const s of [-1,1]){
    const face=new THREE.CircleGeometry(R*.6,SEG);face.rotateY(s*Math.PI/2);face.translate(s*hw*.9,0,0);cxAdd(wg,face,alloy?6:5);               // rim face (dark behind the spokes / steel disc)
    if(!alloy){const cap=new THREE.CircleGeometry(R*.22,8);cap.rotateY(s*Math.PI/2);cap.translate(s*hw*.95,0,0);cxAdd(wg,cap,6)}
  }
  if(alloy)for(let i=0;i<5;i++){const sp=new THREE.BoxGeometry(hw*1.88,R*.56,R*.1);sp.translate(0,R*.3,0);sp.rotateX(i*Math.PI*2/5);cxAdd(wg,sp,5)}
  const hub=new THREE.CylinderGeometry(R*.14,R*.14,hw*1.96,8);hub.rotateZ(Math.PI/2);cxAdd(wg,hub,5);
  return wg.build();
}
// cabin and trim for a lofted car shell: floor, headliner, seats, dash + steering wheel, parcel shelf, exhaust, side moulding, bonnet / boot seams
function cxDetails(g,def){
  const box=(cx,cy,cz,sx,sy,sz,m,col)=>{const b=new THREE.BoxGeometry(sx,sy,sz);b.translate(cx,cy,cz);cxAdd(g,b,m,col)};
  const gl=def.glass,W=def.W,y0=def.y0||.28,hb=def.hb||gl[0][1],zr=gl[0][0],zf=gl[gl.length-1][0],len=zf-zr,zm=(zr+zf)/2;
  const dark=[.06,.06,.065],seat=def.seat||[.21,.2,.2],liner=def.liner||[.5,.49,.45];
  const roofY=Math.min(gl[1][1],gl[gl.length-2][1])-.07;
  // floor and headliner
  box(0,y0+.15,zm,W*.76,.03,len*.96,7,dark);
  box(0,roofY,zm,W*.7,.02,len*.8,7,liner);
  // seats: two fronts (driver on the left, +x) and a rear bench
  const fz=zf-Math.min(.78,len*.44),rz=zr+Math.min(.5,len*.22),sx=W*.22;
  for(const x of [-sx,sx]){
    box(x,y0+.3,fz,.46,.13,.5,7,seat);box(x,y0+.62,fz-.27,.46,.54,.1,7,seat);box(x,y0+.98,fz-.27,.26,.15,.07,7,seat);
  }
  box(0,y0+.3,rz,W*.74,.13,.46,7,seat);box(0,y0+.6,rz-.24,W*.74,.5,.1,7,seat);
  // dashboard, binnacle, steering wheel and column
  box(0,hb-.14,zf-.2,W*.84,.24,.34,6);box(sx,hb-.01,zf-.3,.36,.09,.16,6);
  const sw=new THREE.TorusGeometry(.17,.019,4,10);sw.rotateX(-.45);sw.translate(sx,hb-.12,zf-.58);cxAdd(g,sw,6);
  box(sx,hb-.2,zf-.5,.05,.05,.3,6);
  // rear parcel shelf under the sloped rear window
  if(Math.abs(gl[1][0]-gl[0][0])>.1)box(0,gl[0][1]-.04,zr+.14,W*.78,.03,.3,6);
  // exhaust tip, side rubbing strip, bonnet and boot seams
  box(W*.3,y0+.03,def.rear+.06,.07,.07,.2,5);
  const ym=(y0+hb)/2-.02,chrome=def.alloy===false;
  for(const s of [-1,1])box(s*(W/2+.012),ym,(def.front+def.rear)/2,.02,.035,def.front-def.rear-1.5,chrome?5:6);
  const seam=(z,w)=>{const t=carTopAt(def.top,z);box(0,t+.004,z,w,.012,.014,6)};
  seam(zf+.12,W*.76);seam(Math.min(zr-.14,def.rear+.5),W*.74);
}
