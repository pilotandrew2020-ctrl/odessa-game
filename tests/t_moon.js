// The Moon (space.js, 2026-11-16): the landing patch is built early (3.5 km up), touchdown by the height over that ground, the astronaut wears the suit, walks on the ground (never below it), the jet pack lifts him high and refuels on the ground. MOONSHOT=1: screenshots tests/out/moon_*.png.
exports.opts={w:960,h:600,warn:false};
exports.run=async(page,h)=>{const assert=require('assert'),SH=!!process.env.MOONSHOT;const shotp=async(n)=>{if(SH)await page.screenshot({path:h.SCR+'/'+n+'.png'})};await h.boot();const ev=(f,a)=>page.evaluate(f,a);await ev(()=>{S.q='low';applyQuality()});await h.start();await h.render();await h.wait(1500);
await page.waitForFunction(()=>SPC.pad,null,{timeout:60000});await ev(()=>SPC.goPad());await h.wait(3500);await page.waitForFunction(()=>SPC.stk,null,{timeout:90000});
await ev(()=>SPC.launch());await page.waitForFunction(()=>SPC.A&&SPC.A.m,null,{timeout:60000});
for(const t of [3,20,45,85]){const f0=await ev(t=>{SPC.A.t=t;SPC.A.snap=1;return SPC.A.fc||0},t);await page.waitForFunction(f=>SPC.A.fc>=f+2,f0,{timeout:90000})}
await ev(()=>{SPC.A.t=89.5});await page.waitForFunction(()=>SPC.space&&SPC.mode==='interior',null,{timeout:90000});
await ev(()=>{const e=SPC.IN.pod.userData.exit;SPC.IN.x=e.x;SPC.IN.z=e.z});await h.wait(800);await ev(()=>SPC.act());await h.wait(800);
await ev(()=>{SPC.mode='eva';SPC.startEva(SPC.E1.w.clone())});await h.wait(300);
await ev(()=>{SPC.E1.w.copy(SPC.C.w).add(new THREE.Vector3(0,6,-20));SPC.act()});await h.wait(500);
await ev(()=>{const n=SPC.M.clone().add(new THREE.Vector3(0.3,1,0.2).normalize().multiplyScalar(SPC.P.moonR+3500));SPC.C.w.copy(n);SPC.C.q.setFromUnitVectors(new THREE.Vector3(0,0,1),SPC.M.clone().sub(n).normalize());SPC.C.cq=null;SPC.C.sp=400;SPC.in.full=1});
await h.wait(4000);await shotp('moon_a_approach');const ap=await ev(()=>({m:SPC.mode,lgP:SPC.lgP,sp:Math.round(SPC.C.sp)}));console.log('approach',JSON.stringify(ap));assert(ap.m==='fly'&&ap.lgP===1,'the landing patch was not built on approach');
await ev(()=>{SPC.in.full=1});await page.waitForFunction(()=>SPC.mode==='landed',null,{timeout:240000});await ev(()=>{SPC.in.full=0});await h.wait(2500);await shotp('moon_b_landed');
await ev(()=>SPC.act());await h.wait(1500);const mo=await ev(()=>({m:SPC.mode,y:SPC.M2.y,gy:SPC.hg(SPC.M2.x,SPC.M2.z),suit:!!SPC._suit.parent}));console.log('moon',JSON.stringify(mo));assert(mo.m==='moon'&&mo.suit&&Math.abs(mo.y-mo.gy)<.3,'not standing on the Moon in the suit');
await ev(()=>{SPC.in.ly=1});await h.wait(3500);await ev(()=>{SPC.in.ly=0});await shotp('moon_c_walk');const wk=await ev(()=>({d:Math.hypot(SPC.M2.x,SPC.M2.z),y:SPC.M2.y,gy:SPC.hg(SPC.M2.x,SPC.M2.z)}));assert(wk.d>3&&wk.y>=wk.gy-.01,'cannot walk / sank into the ground: '+JSON.stringify(wk));
await ev(()=>{SPC.in.jump=1});await h.wait(3500);const jp=await ev(()=>({y:SPC.M2.y,gy:SPC.hg(SPC.M2.x,SPC.M2.z),fuel:Math.round(SPC.M2.fuel)}));await shotp('moon_d_jet');await ev(()=>{SPC.in.jump=0});console.log('jet',JSON.stringify(jp));assert(jp.y>6&&jp.fuel<100,'the jet pack does not lift: '+JSON.stringify(jp));
// vehicles from the Earth on the Moon
await ev(()=>{SPC.vehPanel(true)});assert(await ev(()=>!document.getElementById('spcVeh').hidden),'no vehicles panel');
const veh=await ev(()=>{const o={};for(const k of ['scooter','moto','heli','plane']){SPC.ride(k);const M=SPC.M2;M.x=M.z=300;M.y=SPC.hg(300,300);M.vy=0;M.air=false;SPC.in.ly=1;SPC.in.jump=(k==='heli'||k==='plane')?1:0;const x0=M.x,z0=M.z;for(let i=0;i<60;i++)SPC.moonStep(.05);o[k]={d:Math.round(Math.hypot(M.x-x0,M.z-z0)),h:Math.round(M.y-SPC.hg(M.x,M.z)),mesh:!!M.vm};SPC.in.ly=0;SPC.in.jump=0}SPC.ride(null);return o});
console.log('vehicles',JSON.stringify(veh));assert(veh.moto.d>veh.scooter.d*2&&veh.heli.h>20&&veh.plane.d>150&&veh.scooter.mesh,'vehicles do not move / fly');
await shotp('moon_e_vehicles');
}
