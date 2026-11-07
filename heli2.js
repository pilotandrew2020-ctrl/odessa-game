/* ===================================================================================================
   heli2.js — WARHELI: a procedural attack helicopter (Apache class), replacing the old Apache GLB that had duplicated rotors.
   ONE big main rotor on top (4 blades), ONE small tail rotor on the left of the fin, tandem glass cockpit with seats inside (pilot behind and
   above, passenger in front), stub wings with rocket pods and missiles, chin cannon turret, engine nacelles, tail wheel gear.
   Frame: +z nose, +x left, y up; origin at the middle of the fuselage; the gear bottoms are at y = -1.25 (HELI.update keeps the origin 1.25 m up).
   build() → {root, main, tail, turret}.   WH_PILOT / WH_SEAT: where the seated avatars' roots go (0.45 below the seat surface).
   =================================================================================================== */
const WH_PILOT=new THREE.Vector3(0,-.4,.95),WH_SEAT=new THREE.Vector3(0,-.82,3.2);
const WARHELI={
  build(){const S=MBM.std,M={body:S(0x4a5240,.5,.3),dark:S(0x1b1d1f,.6,.35),glass:MBM.glass(0xa5c8dc,.3,{side:THREE.DoubleSide}),blade:S(0x25282a,.7,.2),metal:S(0x8a9096,.35,.8),pod:S(0x5d636a,.55,.4),white:S(0xe6e6e0,.45,.2),exh:S(0x2a2a2c,.7,.5),red:S(0xb82a2a,.5,.2),seat:S(0x2b3038,.9,0),screen:MBM.emis(0x3ad0ff,.8),amber:MBM.emis(0xffb030,.9),lr:MBM.emis(0xff2a2a,1.3),lg:MBM.emis(0x20e060,1.3),lw:MBM.emis(0xffffff,1.4),star:S(0xe8c21a,.5)};
    const root=new THREE.Group(),mb=new MB();
    // ---- fuselage: rear body + nose are full revolutions, the cockpit section is an open tub (lower 2/3 of a revolution) so the crew sits INSIDE ----
    const prof=(a)=>a.map(p=>new THREE.Vector2(p[0],p[1]));
    const full=(pts,k)=>{const g=new THREE.LatheGeometry(prof(pts),24);mb.addGeo(k,g,mb.mat4(0,0,0,Math.PI/2,0,0,.7,1,.86));g.dispose()};
    full([[.3,-3.3],[.5,-2.6],[.78,-1.6],[.97,-.4],[1,0]],'body');                       // engine bay body
    {const a=1.95,g=new THREE.LatheGeometry(prof([[1,0],[1,1.4],[1,3.0],[.96,4.0],[.82,4.7]]),26,-a,2*a);mb.addGeo('body',g,mb.mat4(0,0,0,Math.PI/2,0,0,.7,1,.86));g.dispose()}   // cockpit tub, open on top
    full([[.82,4.7],[.5,5.25],[.14,5.62]],'body');                                           // nose
    // sensor turret on the nose + the lens
    mb.sph('dark',.34,0,-.12,5.38,1,1,1.1);mb.sph('glass',.12,.12,-.1,5.66);mb.sph('screen',.09,-.12,-.08,5.66);mb.sph('amber',.07,0,.12,5.62);
    // cockpit: tub floor, seats, panels, armour divider, sticks
    mb.bx('dark',-.55,.55,-.62,-.5,.3,4.5);
    mb.bx('seat',-.3,.3,-.64,-.4,2.85,3.55);mb.bx('seat',-.3,.3,-.4,.12,2.8,2.92);mb.bx('seat',-.34,-.3,-.4,-.1,2.9,3.5);mb.bx('seat',.3,.34,-.4,-.1,2.9,3.5);                   // front seat (the passenger / gunner)
    mb.bx('seat',-.3,.3,-.2,.0,.62,1.3);mb.bx('seat',-.3,.3,0,.6,.56,.68);mb.bx('seat',-.34,-.3,0,.3,.7,1.25);mb.bx('seat',.3,.34,0,.3,.7,1.25);mb.bx('dark',-.52,.52,-.62,-.2,-.1,1.5);   // rear seat on a raised pedestal (the pilot)
    mb.bx('dark',-.5,.5,-.12,.28,4.15,4.28);mb.box('screen',.3,.2,.02,-.2,.1,4.13,0,-.3);mb.box('screen',.3,.2,.02,.2,.1,4.13,0,-.3);mb.bx('dark',-.5,.5,.12,.52,2.15,2.3);mb.box('screen',.32,.22,.02,0,.34,2.13,0,-.2);
    mb.bx('dark',-.5,.5,-.6,.62,2.1,2.2);                                                        // armour divider between the two cockpits
    mb.rod('metal',.02,[0,-.3,3.3],[0,.15,3.55],5);mb.rod('metal',.02,[0,.05,1.15],[0,.55,1.35],5);mb.sph('dark',.05,0,.58,1.37);
    // glass canopies (two domes) + frames
    const dome=(z,sy,len)=>{const g=new THREE.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI/2);mb.addGeo('glass',g,mb.mat4(0,.25,z,0,0,0,.66,sy,len));g.dispose();
      for(const a of [-.7,0,.7]){const t=new THREE.TorusGeometry(1,.012,5,22,Math.PI);mb.addGeo('dark',t,mb.mat4(0,.25,z+a*len*.7,0,0,0,.66*Math.sqrt(1-a*a*.5),sy*Math.sqrt(1-a*a*.5),1));t.dispose()}};
    dome(3.25,.72,1.45);dome(.9,.92,1.4);
    // ---- dorsal engine fairing, nacelles, exhausts, rotor mast ----
    mb.bx('body',-.5,.5,.6,1.05,-2.0,1.4);
    for(const s of [1,-1]){mb.cyl('body',.44,.4,3.3,14,s*.82,.82,-.5,Math.PI/2);mb.cyl('dark',.34,.34,.06,12,s*.82,.82,1.16,Math.PI/2);mb.cyl('exh',.32,.26,.7,12,s*.82,.82,-2.36,Math.PI/2);mb.cyl('dark',.22,.2,.05,12,s*.82,.82,-2.7,Math.PI/2)}
    mb.cyl('dark',.15,.18,1.0,10,0,1.35,.05);mb.cyl('body',.5,.5,.3,14,0,1.0,.05);
    // ---- stub wings, pylons, rocket pods, missiles, wing-tip lights ----
    for(const s of [1,-1]){mb.bx('body',s>0?.62:-2.7,s>0?2.7:-.62,-.2,-.06,-.35,.95);mb.bx('body',s>0?.9:-1.1,s>0?1.1:-.9,-.62,-.2,.05,.6);mb.bx('body',s>0?2.0:-2.25,s>0?2.25:-2.0,-.55,-.2,.05,.6);
      mb.cyl('pod',.26,.26,1.9,12,s*1.0,-.88,.55,Math.PI/2);mb.cyl('dark',.2,.2,.05,12,s*1.0,-.88,1.52,Math.PI/2);for(let i=0;i<7;i++){const a=i/7*6.283,r=i?.13:0;mb.cyl('exh',.04,.04,.02,6,s*1.0+Math.cos(a)*r,-.88+Math.sin(a)*r,1.55,Math.PI/2)}
      for(const [dx,dy] of [[0,0],[.22,.0],[0,-.2],[.22,-.2]]){mb.cyl('white',.075,.075,1.6,8,s*(2.02+dx)+0,-.72+dy,.25,Math.PI/2);mb.cyl('red',.077,.04,.28,8,s*(2.02+dx),-.72+dy,1.1,Math.PI/2);mb.cyl('dark',.05,.05,.12,6,s*(2.02+dx),-.72+dy,-.58,Math.PI/2)}
      mb.sph(s>0?'lr':'lg',.08,s*2.72,-.12,.2);mb.sph('dark',.12,s*2.72,-.12,.52,1,1,2)}
    // ---- tail boom, fin, stabiliser ----
    {const g=new THREE.LatheGeometry(prof([[.17,-8.0],[.2,-7.0],[.27,-5.0],[.33,-3.4],[.34,-3.2]]),14);mb.addGeo('body',g,mb.mat4(0,.34,0,Math.PI/2,0,0,1,1,1));g.dispose()}
    const fin=(xa,xb)=>{const P=[[-6.3,.45],[-7.95,.45],[-8.3,2.75],[-7.5,2.75]],cz=P.reduce((q,p)=>q+p[0],0)/4,cy=P.reduce((q,p)=>q+p[1],0)/4;   // (z,y) trapezoid
      for(let i=0;i<4;i++){const A=P[i],B=P[(i+1)%4];PM.qo(mb,'body',[xb,A[1],A[0]],[xb,B[1],B[0]],[xa,B[1],B[0]],[xa,A[1],A[0]],[0,(A[1]+B[1])/2-cy,(A[0]+B[0])/2-cz])}
      PM.qo(mb,'body',[xb,P[0][1],P[0][0]],[xb,P[1][1],P[1][0]],[xb,P[2][1],P[2][0]],[xb,P[3][1],P[3][0]],[1,0,0]);PM.qo(mb,'body',[xa,P[0][1],P[0][0]],[xa,P[1][1],P[1][0]],[xa,P[2][1],P[2][0]],[xa,P[3][1],P[3][0]],[-1,0,0])};
    fin(-.07,.07);mb.bx('red',-.075,.075,2.72,2.78,-8.3,-7.5);mb.sph('lr',.1,0,2.85,-7.9);mb.sph('lw',.08,0,.62,-8.0);
    mb.box('body',3.9,.08,.95,0,.55,-7.2);for(const s of [1,-1])mb.box('body',.08,.45,.9,s*1.95,.55,-7.2);   // stabiliser with end plates
    mb.box('dark',.34,.4,.5,.22,1.95,-7.85);                                                       // tail rotor gearbox on the left of the fin
    // ---- landing gear (two main wheels + a tail wheel) ----
    for(const s of [1,-1]){mb.rod('metal',.05,[s*.62,-.7,.4],[s*1.05,-1.0,.45],6);mb.rod('metal',.04,[s*.5,-.7,.1],[s*1.05,-1.0,.45],6);mb.cyl('dark',.25,.25,.17,14,s*1.1,-1.0,.45,0,0,Math.PI/2);mb.cyl('metal',.12,.12,.19,10,s*1.1,-1.0,.45,0,0,Math.PI/2)}
    mb.rod('metal',.045,[0,.0,-6.0],[0,-1.05,-6.35],6);mb.cyl('dark',.2,.2,.12,12,0,-1.05,-6.35,0,0,Math.PI/2);
    // markings: a yellow star on each side of the cockpit tub and the stripe on the boom
    for(const s of [1,-1])mb.box('star',.02,.3,.3,s*.69,-.05,1.3);
    mb.build(root,M,{static:true,noShadow:new Set(['glass','screen','amber','lr','lg','lw'])});
    // ---- animated parts ----
    // chin cannon turret (pivot under the nose; HELI.update aims it)
    const turret=new THREE.Group();turret.position.set(0,-.95,4.1);root.add(turret);{const tb=new MB();tb.bx('dark',-.18,.18,-.12,.16,-.25,.3);tb.cyl('metal',.05,.05,1.5,8,0,-.02,1.0,Math.PI/2);tb.cyl('dark',.08,.08,.35,8,0,-.02,.5,Math.PI/2);tb.build(turret,M)}
    // the ONE main rotor: hub + four long blades, spinning about y
    const main=new THREE.Group();main.name='main rotor';main.position.set(0,1.95,0);root.add(main);{const rb=new MB();rb.cyl('dark',.34,.34,.26,14,0,0,0);rb.cyl('metal',.2,.2,.34,10,0,.05,0);
      for(let k=0;k<4;k++){const a=k*Math.PI/2;rb.box('blade',6.2,.05,.46,Math.cos(a)*3.7,0,-Math.sin(a)*3.7,a);rb.box('red',.5,.06,.47,Math.cos(a)*6.65,0,-Math.sin(a)*6.65,a);rb.box('dark',.7,.1,.2,Math.cos(a)*.7,0,-Math.sin(a)*.7,a)}rb.build(main,M,{static:false,noShadow:new Set([])})}
    // the ONE small tail rotor: an outer group turns the axle to point along x, the inner group `tail` spins about its own z
    const tout=new THREE.Group();tout.position.set(.42,1.95,-7.85);tout.rotation.y=Math.PI/2;root.add(tout);const tail=new THREE.Group();tail.name='tail rotor';tout.add(tail);
    {const tb=new MB();tb.cyl('metal',.09,.09,.12,8,0,0,0,Math.PI/2);tb.box('blade',1.2,.14,.03,0,0,.05);tb.box('blade',.14,1.2,.03,0,0,.05);tb.build(tail,M,{static:false})}
    return {root,main,tail,turret}}
};
