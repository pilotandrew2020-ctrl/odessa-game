// A lightweight, in-world smartphone with a local clock and game news.
const PHONE={
  root:null,screen:null,ctx:null,texture:null,open:false,t:0,news:'Обновление: Добавлен режим Battle Royale, новые сетевые режимы, Боулинг-клуб, улучшена карта Таирова и добавлена тотальная реалистичность!',
  init(){
    const g=new THREE.Group(),dark=new THREE.MeshBasicMaterial({color:0x101419,depthTest:false,toneMapped:false});
    const body=new THREE.Mesh(new THREE.BoxGeometry(.145,.285,.018),dark);body.renderOrder=1001;body.frustumCulled=false;g.add(body);
    const cv=document.createElement('canvas');cv.width=256;cv.height=512;this.ctx=cv.getContext('2d');
    this.texture=new THREE.CanvasTexture(cv);this.texture.encoding=THREE.sRGBEncoding;
    const glass=new THREE.MeshBasicMaterial({map:this.texture,depthTest:false,toneMapped:false});
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.126,.255),glass);screen.position.z=.010;g.add(screen);
    screen.renderOrder=1002;screen.frustumCulled=false;
    const cameraDot=new THREE.Mesh(new THREE.CircleGeometry(.004,8),dark);cameraDot.position.set(0,.137,.011);cameraDot.renderOrder=1003;cameraDot.frustumCulled=false;g.add(cameraDot);
    this.root=g;this.screen=screen;this.draw();camera.add(g);g.visible=false;
    let b=document.getElementById('bPhone');if(!b){b=document.createElement('button');b.id='bPhone';b.type='button';b.innerHTML='<i>📱</i><span>Phone</span>';document.body.appendChild(b)}
    b.onclick=()=>this.toggle();
    this.ui()
  },
  draw(){
    const c=this.ctx;if(!c)return;
    c.fillStyle='#101827';c.fillRect(0,0,256,512);
    c.fillStyle='#f2c14e';c.fillRect(0,0,256,22);
    c.fillStyle='#101827';c.font='700 12px system-ui';c.fillText('MY ODESA · NEWS',12,15);
    c.fillStyle='#f5f1e8';c.font='700 25px system-ui';c.fillText(new Intl.DateTimeFormat('uk-UA',{hour:'2-digit',minute:'2-digit'}).format(new Date()),14,64);
    c.fillStyle='#9fb0c4';c.font='13px system-ui';c.fillText(new Intl.DateTimeFormat('uk-UA',{weekday:'long',day:'numeric',month:'long'}).format(new Date()),14,88);
    c.fillStyle='#263449';c.fillRect(12,108,232,1);
    c.fillStyle='#f2c14e';c.font='700 15px system-ui';c.fillText('НОВИНИ ГРИ',14,137);
    c.fillStyle='#f5f1e8';c.font='14px system-ui';
    const words=this.news.split(/\s+/);let line='',y=166;
    for(const word of words){const next=line?line+' '+word:word;if(c.measureText(next).width>218){c.fillText(line,14,y);line=word;y+=21}else line=next}
    if(line)c.fillText(line,14,y);
    c.fillStyle='#8fa3b8';c.font='11px system-ui';c.fillText('Tap phone icon to put away',14,490);
    this.texture.needsUpdate=true
  },
  ui(){const b=document.getElementById('bPhone');if(b){b.classList.toggle('on',this.open);b.setAttribute('aria-pressed',String(this.open));b.setAttribute('aria-label',this.open?'Put phone away':'Open phone')}} ,
  toggle(){
    this.open=!this.open;this.root.visible=true;this.t=this.open?0:1;this.ui();
    if(typeof COOP!=='undefined')COOP.push(true)
  },
  tick(dt){
    if(!this.root)return;
    if(this.open&&this.t<1){this.t=Math.min(1,this.t+dt*3);this.draw()}
    if(!this.open&&this.t>0)this.t=Math.max(0,this.t-dt*3);
    // realistic raise: starts low at the hip, rises to eye level in front of the screen, tilts back a little, right hand brings it up
    const t=this.t,e=1-Math.pow(1-t,3);   // ease-out cubic
    this.root.position.set(.34-.245*e,-.62+.42*e,-.5+.16*e);
    this.root.scale.setScalar(1.15+.1*e);
    this.root.rotation.set(-.55+.4*e,.18-.1*e,.5-.45*e);
    this.root.visible=this.open||this.t>0;
    if(this.open){const d=new Date();if(d.getSeconds()!==this._sec){this._sec=d.getSeconds();this.draw()}}
  }
};
