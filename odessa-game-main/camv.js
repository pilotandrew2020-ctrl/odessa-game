// ---------------------------------------------------------------- camera views (key O / the View button): third person, first person, over the shoulder, far view, top-down
// A view is just a preset for the orbit camera (cam.dist / cam.pitch) plus a sideways shift for "over the shoulder"; the wheel / drag still fine-tune it.
// In a car the same five views become: chase, cockpit (the driver's eyes), bonnet, far chase, top-down (see stepCarCamera in index.html).
const CAMV={mode:0,side:0,
  PRE:[{n:'Third person',c:'Chase view',d:0,p:.3,s:0},{n:'First person',c:'Cockpit view',d:.5,p:0,s:0},{n:'Over the shoulder',c:'Bonnet view',d:2.4,p:.16,s:.55},{n:'Far view',c:'Far chase',d:9,p:.5,s:0},{n:'Top-down',c:'Top-down',d:15,p:1.22,s:0}],
  go(m){const n=this.PRE.length;m=(m%n+n)%n;const P=this.PRE[m];this.mode=m;
    cam.dist=P.d||(innerHeight>innerWidth?5.6:4.6);cam.pitch=P.p;this.side=P.s;cam.init=false;
    toast(DRIVE.on?P.c:P.n,'press O or the View button for the next one');
    const b=document.getElementById('bView');if(b){const t=b.querySelector('b');if(t)t.textContent=['3rd','1st','Shoulder','Far','Top'][m]}
    if(typeof UIS!=='undefined')UIS.pick()},
  next(){this.go(this.mode+1)}};
