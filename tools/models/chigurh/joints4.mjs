import fs from 'fs';
const XC=0.025,Z0=0.02,XS=.74,ZS=.85,LEG=1.28,KB=+(process.env.KB||.55),YB=+(process.env.YB||-.12),BC=[-.035,.09];
const T=(p)=>{const [x,y,z]=p;let yy=y;if(y<=-0.09&&y>-0.40)yy=-0.09+(y+0.09)*LEG;else if(y<=-0.40)yy=y+(-0.09+(-0.40+0.09)*LEG+0.40);return [+(XC+(x-XC)*XS).toFixed(4),+yy.toFixed(4),+(Z0+(z-Z0)*ZS).toFixed(4)]};
const B=(x,y)=>[+(XC+(x-BC[0])*KB).toFixed(4),+(YB+(y+.38)*KB).toFixed(4),Z0];
const J={pelvis:T([0.035,-0.09,-0.01]),spine_01:B(-.035,-.28),spine_02:B(-.035,-.12),spine_03:B(-.035,.06),neck_01:B(-.035,.19),Head:B(-.035,.26),
clavicle_l:B(0,.12),upperarm_l:B(.19,.11),lowerarm_l:B(.26,-.16),hand_l:B(.30,-.36),
clavicle_r:B(-.07,.12),upperarm_r:B(-.2,.10),lowerarm_r:B(-.28,-.17),hand_r:B(-.31,-.37),
thigh_l:T([0.1,-0.11,-0.01]),calf_l:T([0.105,-0.28,0.01]),foot_l:T([0.105,-0.43,-0.01]),ball_l:T([0.11,-0.46,0.06]),
thigh_r:T([-0.03,-0.11,-0.01]),calf_r:T([-0.035,-0.28,0.01]),foot_r:T([-0.035,-0.43,0.0]),ball_r:T([-0.03,-0.46,0.06])};
fs.writeFileSync('chg4.json',JSON.stringify({src:'chg_src4.glb',out:'Chigurh4.glb',static:true,height:1.78,armDeg:9,texPx:512,tex:{chead:1536},tris:60000,noSimp:['.'],joints:J},null,1));console.log(JSON.stringify(J.pelvis),JSON.stringify(J.spine_01),JSON.stringify(J.Head))
