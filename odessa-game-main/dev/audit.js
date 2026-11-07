/* dev/audit.js — preview-only test helpers, NOT loaded by the game.
   In the Browser pane console:  (0,eval)(await (await fetch('/dev/audit.js',{cache:'reload'})).text())
   AUDIT.flatmap(rad,G,xr,zr,disp)  reachability flood fill inside the CURRENT interior from its spawn ('#' reached, 'o' free but cut off, '.' blocked), local coords
   AUDIT.flats(rad)                 does it for the five flats + the house (PORTAL.go + wait), results in AUDIT.out
   AUDIT.why(lx,lz,rad)             which wall / box blocks a local point of the current interior
   AUDIT.walk(name,opt)             walk 8 directions from the spawn with the real stepPlayer */
window.AUDIT=(()=>{const A={out:{}};const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  A.free=(x,z,y,rad)=>{const s=specialGround(x,z,y);if(!s||s.wall)return false;const c=collide(x,z,rad,y);return Math.hypot(c[0]-x,c[1]-z)<1e-3};
  A.flatmap=(rad,G,xr,zr,disp)=>{const B=PORTAL.active,ox=B.ox!==undefined?B.ox:B.spawn[0],oz=B.oz!==undefined?B.oz:B.spawn[1],y=player.y;const [x0,x1]=xr,[z0,z1]=zr;const NX=Math.round((x1-x0)/G)+1,NZ=Math.round((z1-z0)/G)+1;const fr=new Uint8Array(NX*NZ);
    for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++)if(A.free(ox+x0+i*G,oz+z0+j*G,y,rad))fr[j*NX+i]=1;
    const sx=B.spawn[0]-ox,sz=B.spawn[1]-oz;let si=Math.round((sx-x0)/G),sj=Math.round((sz-z0)/G);const seen=new Uint8Array(NX*NZ);let cnt=0;
    if(!fr[sj*NX+si]){let bd=1e9,bi=si,bj=sj;for(let j=Math.max(0,sj-14);j<Math.min(NZ,sj+15);j++)for(let i=Math.max(0,si-14);i<Math.min(NX,si+15);i++)if(fr[j*NX+i]){const d=(i-si)**2+(j-sj)**2;if(d<bd){bd=d;bi=i;bj=j}}si=bi;sj=bj}   // spawn can sit inside a wall margin: stepPlayer pushes it out, so start from the nearest free cell
    if(fr[sj*NX+si]){const st=[[si,sj]];seen[sj*NX+si]=1;while(st.length){const [i,j]=st.pop();cnt++;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+a,nj=j+b;if(ni<0||nj<0||ni>=NX||nj>=NZ)continue;const k=nj*NX+ni;if(seen[k]||!fr[k])continue;seen[k]=1;st.push([ni,nj])}}}
    let free=0;for(const v of fr)free+=v;const step=Math.max(1,Math.round(disp/G)),rows=[];
    for(let j=0;j<NZ;j+=step){let s=(z0+j*G).toFixed(1).padStart(4)+' ';for(let i=0;i<NX;i+=step){const k=j*NX+i;s+=seen[k]?'#':fr[k]?'o':'.'}rows.push(s)}
    return {reach:+(cnt*G*G).toFixed(1),free:+(free*G*G).toFixed(1),map:rows.join('\n'),seen,NX,NZ,x0,z0,G,reachAt:(lx,lz)=>{const i=Math.round((lx-x0)/G),j=Math.round((lz-z0)/G);return i>=0&&j>=0&&i<NX&&j<NZ&&!!seen[j*NX+i]}}};
  A.flats=async(rad=.22)=>{PORTAL.ret={x:player.x,z:player.z,yaw:player.yaw};A.out={};
    for(const [n,xr,zr] of [['panelflat',[-4.9,4.9],[-.3,7]],['mdflat',[-6,6],[-.3,9]],['stalinflat',[-6.1,6.1],[-.3,8.5]],['newflat',[-5.6,5.6],[-.3,7.5]],['house',[-9,9],[-2.5,12]]]){
      PORTAL.go(n,{});await sleep(1400);player.vx=player.vz=0;A.out[n]=A.flatmap(rad,.05,xr,zr,.2)}
    PORTAL.exit();A.out.done=true;return Object.keys(A.out).map(k=>k+(A.out[k].reach!==undefined?' reach='+A.out[k].reach+'/free='+A.out[k].free:''))};
  A.why=(lx,lz,rad)=>{const B=PORTAL.active,ox=B.ox,oz=B.oz,y=player.y,m=rad||.22,x=ox+lx,z=oz+lz,r=[];
    STATIC_WALLS.forEach(o=>{if(y<o.y0||y>o.y1+1)return;const dx=x-o.cx,dz=z-o.cz,u=dx*o.ca+dz*o.sa,v=-dx*o.sa+dz*o.ca;if(Math.abs(u)<o.hw+m&&Math.abs(v)<o.hd+m)r.push('WALL['+(o.cx-ox).toFixed(2)+','+(o.cz-oz).toFixed(2)+' hw'+o.hw.toFixed(2)+' hd'+o.hd.toFixed(2)+']')});
    for(let i=0;i<LOW_OBB.length;i+=6){const q=LOW_OBB.slice(i,i+6);if(insideOBB(q,x,z,m))r.push('OBB['+(q[0]-ox).toFixed(2)+','+(q[1]-oz).toFixed(2)+' '+q[2]+'x'+q[3]+']')}return r.join(' ')};
  A.walk=async(name,opt)=>{PORTAL.ret=PORTAL.ret||{x:player.x,z:player.z,yaw:player.yaw};PORTAL.go(name,opt||{});await sleep(1400);const sx=player.x,sz=player.z,sy=player.y,mv=[];let mn=1e9,mx=-1e9;
    for(let k=0;k<8;k++){player.x=sx;player.z=sz;player.y=sy;player.vx=player.vz=player.vy=0;player.air=false;player.sit=null;cam.yaw=k*Math.PI/4;inp.jx=0;inp.jy=1;inp.k={};for(let s=0;s<100;s++){stepPlayer(1/30);mn=Math.min(mn,player.y);mx=Math.max(mx,player.y)}mv.push(+Math.hypot(player.x-sx,player.z-sz).toFixed(1))}
    inp.jx=inp.jy=0;return {name,moves:mv,minY:mn,maxY:mx}};
  return A})();
'audit loaded'
