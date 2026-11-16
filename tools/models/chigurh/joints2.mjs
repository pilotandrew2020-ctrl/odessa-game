import fs from 'fs';
const XC=0.025,Z0=0.02,XS=.74,ZS=.85,LEG=1.28;
const T=(p)=>{const [x,y,z]=p;let yy=y;if(y<=-0.09&&y>-0.40)yy=-0.09+(y+0.09)*LEG;else if(y<=-0.40)yy=y+(-0.09+(-0.40+0.09)*LEG+0.40);return [+(XC+(x-XC)*XS).toFixed(4),+yy.toFixed(4),+(Z0+(z-Z0)*ZS).toFixed(4)]};
const J={"pelvis":[0.035,-0.09,-0.01],"spine_01":[0.035,-0.03,0],"spine_02":[0.035,0.05,0],"spine_03":[0.035,0.12,0],"neck_01":[0.03,0.2,0.0],"Head":[0.03,0.245,0.02],
"clavicle_l":[0.07,0.16,0],"upperarm_l":[0.19,0.15,0],"lowerarm_l":[0.24,0.03,-0.01],"hand_l":[0.26,-0.07,0],
"clavicle_r":[0.0,0.16,0],"upperarm_r":[-0.16,0.15,0],"lowerarm_r":[-0.19,0.03,-0.01],"hand_r":[-0.205,-0.07,0],
"thigh_l":[0.1,-0.11,-0.01],"calf_l":[0.105,-0.28,0.01],"foot_l":[0.105,-0.43,-0.01],"ball_l":[0.11,-0.46,0.06],
"thigh_r":[-0.03,-0.11,-0.01],"calf_r":[-0.035,-0.28,0.01],"foot_r":[-0.035,-0.43,0.0],"ball_r":[-0.03,-0.46,0.06]};
const out={};for(const [k,v] of Object.entries(J))out[k]=T(v);
fs.writeFileSync('chg2.json',JSON.stringify({src:'chg_src2.glb',out:'Chigurh2.glb',static:true,height:1.78,armDeg:9,texPx:512,tex:{skin:1024,hair:512},tris:60000,noSimp:['.'],joints:out},null,1));console.log('ok')
