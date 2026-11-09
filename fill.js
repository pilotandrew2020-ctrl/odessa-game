// fill.js — what the empty green parts of the map really are. OSM says 29 big cemeteries (3.3 km²) and ~200 parks (6.8 km²) lie in the map,
// but the ground there was only grass and a few trees: that was the "desert". fill_data.js holds their outlines (assets/areas.json, OSM ODbL).
// Per chunk, buildChunkGen calls FILL.scatter(id,P,env) after STREET.scatter: cemeteries get rows of graves with headstones, crosses and
// walkways; parks get benches, flower beds and shrubs. Everything goes into the chunk's own merged props mesh (budgeted per chunk).

const FILL={err:null,cells:null,polys:null,
  init(){if(this.cells||typeof FILL_DATA==='undefined')return;this.cells=new Map();this.polys=[];
    FILL_DATA.a.forEach((r,n)=>{const f=r[2],N=f.length>>1;let a=1e9,b=1e9,c=-1e9,d=-1e9,ang=0,ll=0;
      for(let i=0;i<N;i++){const x=f[i*2],z=f[i*2+1];a=Math.min(a,x);c=Math.max(c,x);b=Math.min(b,z);d=Math.max(d,z);const j=(i+1)%N,L=Math.hypot(f[j*2]-x,f[j*2+1]-z);if(L>ll){ll=L;ang=Math.atan2(f[j*2+1]-z,f[j*2]-x)}}
      const P={k:r[0],A:r[1],f,N,x0:a,x1:c,z0:b,z1:d,ang,n};this.polys.push(P);
      const i0=Math.floor((a-BB[0])/CH),i1=Math.floor((c-BB[0])/CH),j0=Math.floor((b-BB[2])/CH),j1=Math.floor((d-BB[2])/CH);
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(i<0||j<0||i>=NCX||j>=NCZ)continue;const id=j*NCX+i;let L=this.cells.get(id);if(!L)this.cells.set(id,L=[]);L.push(P)}})},
  inside(P,x,z){const f=P.f,N=P.N;let c=false;for(let i=0,j=N-1;i<N;j=i++){const xi=f[i*2],zi=f[i*2+1],xj=f[j*2],zj=f[j*2+1];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c}return c},
  // the hand-made parks (Shevchenko, Gorky, Greek, Istanbul, the luna park ...) keep their own content
  owned(P){if(P.own!==undefined)return P.own;const cx=(P.x0+P.x1)/2,cz=(P.z0+P.z1)/2;let o=false;
    for(const p of (typeof PLACES!=='undefined'?PLACES:[]))if(/^(shevpark|shevpark2|gorky|gorkyrides|greek|istanbul|deriba|taras|luna|island)$/.test(p.id)&&Math.hypot(p.x-cx,p.z-cz)<Math.max(260,Math.hypot(P.x1-P.x0,P.z1-P.z0)/2+120)){o=true;break}
    return P.own=o},
  // a generator: buildChunkGen yields between cemetery rows so walking never hitches
  *scatterGen(id,P,env){this.init();const L=this.cells&&this.cells.get(id);if(!L)return;const [ox,oz]=chunkOrigin(id),r=rng(id*977+13),mob=typeof MOBILE!=='undefined'&&MOBILE;
    let budget=mob?330:700,park=mob?10:22;
    for(const A of L){if(A.k===0)budget-=yield* this.cemetery(id,P,env,A,ox,oz,r,budget);else if(!this.owned(A))park-=this.park(id,P,env,A,ox,oz,r,park);if(budget<=0&&park<=0)break}},
  *cemetery(id,P,env,A,ox,oz,r,budget){const a=A.ang,ca=Math.cos(a),sa=Math.sin(a);let n=0;
    // how much of this chunk is cemetery -> widen the plot spacing so the whole area gets graves, not just the first rows
    const bx0=Math.max(ox,A.x0),bx1=Math.min(ox+CH,A.x1),bz0=Math.max(oz,A.z0),bz1=Math.min(oz+CH,A.z1);if(bx1<=bx0||bz1<=bz0||budget<=0)return 0;
    let hit=0;for(let q=0;q<48;q++)if(this.inside(A,bx0+r()*(bx1-bx0),bz0+r()*(bz1-bz0)))hit++;
    const est=hit/48*(bx1-bx0)*(bz1-bz0)/(3.0*5.6)*.75,f=Math.max(1,Math.min(2.6,Math.sqrt(est/budget))),su=3.0*f,sv=5.6*f;
    // chunk corners in the polygon's own (u,v) frame
    let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const [x,z] of [[ox,oz],[ox+CH,oz],[ox,oz+CH],[ox+CH,oz+CH]]){const u=x*ca+z*sa,v=-x*sa+z*ca;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)}
    const iu0=Math.floor(u0/su),iu1=Math.ceil(u1/su),iv0=Math.floor(v0/sv),iv1=Math.ceil(v1/sv);
    const earth=['#6b5d4a','#5d5a48','#716452','#4f5a42'].map(sRGB),stone=['#8d8f94','#5c5f66','#b9b6ad','#2e3034','#a49a8a'].map(sRGB),dark=sRGB('#1e2024'),wood=sRGB('#4a3a2a'),flow=['#d9261c','#f2c418','#f4f4f0','#c24aa8'].map(sRGB);
    for(let iv=iv0;iv<=iv1&&n<budget;iv++){yield;if(((iv%9)+9)%9===0)continue;                   // a cross-alley every nine rows
      for(let iu=iu0;iu<=iu1&&n<budget;iu++){if(((iu%7)+7)%7===0)continue;             // and a walkway every seven plots
        if(r()<.16)continue;const u=(iu+.5)*su,v=(iv+.5)*sv,x=u*ca-v*sa,z=u*sa+v*ca;
        if(x<ox||x>=ox+CH||z<oz||z>=oz+CH||!this.inside(A,x,z))continue;
        if(env.blockedStatic(x,z,1)||env.nearRoad(id,x,z,1.6)||env.solid(x,z,1.0))continue;
        const y=groundH(x,z),ry=-a+(r()-.5)*.05,s=Math.sin(ry),c=Math.cos(ry),hx=x+s*-1.0,hz=z+c*-1.0;
        P.box(x,y+.07,z,1.0,.14,2.2,ry,earth[(r()*4)|0],4);
        P.box(hx,y+.45,hz,.62+r()*.2,.9,.09,ry,stone[(r()*5)|0],7);        if(r()<.3){P.box(hx-s*.02,y+1.05,hz-c*.02,.06,1.3,.06,ry,dark,6);P.box(hx-s*.02,y+1.3,hz-c*.02,.5,.06,.06,ry,dark,6)}
        n++}}
    return n},
  park(id,P,env,A,ox,oz,r,budget){let n=0;const cw=Math.min(CH,A.x1-A.x0+CH),share=Math.min(1,(Math.min(ox+CH,A.x1)-Math.max(ox,A.x0))*(Math.min(oz+CH,A.z1)-Math.max(oz,A.z0))/Math.max(1,A.A)),
      want=Math.min(budget,Math.round(A.A*share/1700)+(r()<.5?1:0));
    const bed=['#d9261c','#f2c418','#f4f4f0','#c24aa8','#e8801a'].map(sRGB),soil=sRGB('#4a3a2a'),leaf=['#3e6b34','#4a7a3c','#2f5a2e'].map(sRGB),wood=sRGB('#7a5538');
    for(let t=0,k=0;k<want&&t<want*14;t++){const x=Math.max(ox,A.x0)+r()*(Math.min(ox+CH,A.x1)-Math.max(ox,A.x0)),z=Math.max(oz,A.z0)+r()*(Math.min(oz+CH,A.z1)-Math.max(oz,A.z0));
      if(!this.inside(A,x,z)||env.blockedStatic(x,z,2)||env.nearRoad(id,x,z,2.2)||env.solid(x,z,2))continue;const y=groundH(x,z);if(y<SL+1)continue;k++;
      const q=r();
      if(q<.42&&typeof propBench2==='function'){const ry=r()*6.28;propBench2(P,x,y,z,ry,env.benches);env.lobb.push(x,z,.95,.32,Math.cos(ry),-Math.sin(ry))}
      else if(q<.62){P.cyl(x,y,z,1.35,1.35,.2,12,soil,4);for(let b=0;b<9;b++){const an=b*.7,rr=.2+(b%3)*.38;P.cyl(x+Math.cos(an)*rr,y+.18,z+Math.sin(an)*rr,.17,.05,.32,6,bed[(b+k)%5],0)}env.cirs.push(x,z,1.4)}
      else{for(let b=0;b<3;b++)P.cyl(x+(r()-.5)*1.6,y,z+(r()-.5)*1.6,.65+r()*.3,.3,.8+r()*.4,7,leaf[(r()*3)|0],0)}
      n++}
    return n}
};
