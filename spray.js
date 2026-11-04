// spray.js — Water spray and foam effects for watercraft (jet ski & motor boat)
// Hard particle caps: 180 on MOBILE, 450 on desktop. Pre-allocated buffers, 0 per-frame allocation.
(function(){
  const isMobile = (typeof MOBILE !== 'undefined' && MOBILE);
  const MAX_PARTICLES = isMobile ? 180 : 450;
  const MAX_FOAM = 24;

  let sprayTexture = null;
  function getSprayTex(){
    if(sprayTexture) return sprayTexture;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.35, 'rgba(215,240,255,0.75)');
    grad.addColorStop(0.7, 'rgba(180,225,255,0.3)');
    grad.addColorStop(1, 'rgba(180,225,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    sprayTexture = new THREE.CanvasTexture(c);
    return sprayTexture;
  }

  let foamTexture = null;
  function getFoamTex(){
    if(foamTexture) return foamTexture;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.4, 'rgba(240,248,255,0.5)');
    grad.addColorStop(0.8, 'rgba(200,230,250,0.18)');
    grad.addColorStop(1, 'rgba(200,230,250,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    foamTexture = new THREE.CanvasTexture(c);
    return foamTexture;
  }

  const SPRAY = {
    ready: false,
    maxParticles: MAX_PARTICLES,
    pos: null,
    vel: null,
    life: null, // [currentAge, maxLife]
    size: null,
    geom: null,
    pts: null,
    head: 0,
    count: 0,

    // Foam pool
    foams: [],
    foamHead: 0,

    init(scene){
      if(this.ready) return;
      this.ready = true;

      // Particles setup
      const N = this.maxParticles;
      this.pos = new Float32Array(N * 3);
      this.vel = new Float32Array(N * 3);
      this.life = new Float32Array(N * 2); // [age, maxLife]
      this.size = new Float32Array(N);

      for(let i=0; i<N; i++){
        this.pos[i*3+1] = -9999;
        this.life[i*2] = 1;
        this.life[i*2+1] = 1;
        this.size[i] = 0;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      geom.setAttribute('size', new THREE.BufferAttribute(this.size, 1));

      const mat = new THREE.PointsMaterial({
        size: 0.65,
        map: getSprayTex(),
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        opacity: 0.75,
        color: 0xffffff
      });

      this.geom = geom;
      this.pts = new THREE.Points(geom, mat);
      this.pts.frustumCulled = false;
      this.pts.renderOrder = 4;
      scene.add(this.pts);

      // Foam quads pool
      const fGeo = new THREE.PlaneGeometry(1, 1);
      fGeo.rotateX(-Math.PI / 2);
      const fMat = new THREE.MeshBasicMaterial({
        map: getFoamTex(),
        transparent: true,
        depthWrite: false,
        opacity: 0.6
      });

      for(let i=0; i<MAX_FOAM; i++){
        const mesh = new THREE.Mesh(fGeo, fMat.clone());
        mesh.visible = false;
        mesh.renderOrder = 3;
        scene.add(mesh);
        this.foams.push({
          mesh,
          age: 1,
          maxLife: 1.8,
          w: 1,
          l: 1,
          x: 0,
          z: 0
        });
      }
    },

    emit(x, y, z, vx, vy, vz, maxLife, sz){
      if(!this.ready) return;
      const idx = this.head;
      this.head = (this.head + 1) % this.maxParticles;

      this.pos[idx*3] = x;
      this.pos[idx*3+1] = y;
      this.pos[idx*3+2] = z;

      this.vel[idx*3] = vx;
      this.vel[idx*3+1] = vy;
      this.vel[idx*3+2] = vz;

      this.life[idx*2] = 0; // age
      this.life[idx*2+1] = maxLife || 0.6; // maxLife
      this.size[idx] = sz || 0.45;
    },

    emitFoam(x, z, yaw, w, l, life){
      if(!this.foams.length) return;
      const f = this.foams[this.foamHead];
      this.foamHead = (this.foamHead + 1) % this.foams.length;
      f.x = x;
      f.z = z;
      f.age = 0;
      f.maxLife = life || 1.6;
      f.w = w;
      f.l = l;
      f.mesh.position.set(x, (typeof SL !== 'undefined' ? SL : 0) + 0.04, z);
      f.mesh.rotation.y = yaw;
      f.mesh.scale.set(w, 1, l);
      f.mesh.material.opacity = 0.55;
      f.mesh.visible = true;
    },

    update(dt, camPos){
      if(!this.ready) return;
      const N = this.maxParticles;
      const p = this.pos;
      const v = this.vel;
      const lf = this.life;
      const sz = this.size;
      const sl = (typeof SL !== 'undefined' ? SL : 0);
      const grav = 9.8 * dt;

      for(let i=0; i<N; i++){
        if(lf[i*2] >= lf[i*2+1]){
          p[i*3+1] = -9999;
          sz[i] = 0;
          continue;
        }

        lf[i*2] += dt;
        const progress = lf[i*2] / lf[i*2+1];

        v[i*3+1] -= grav;
        p[i*3] += v[i*3] * dt;
        p[i*3+1] += v[i*3+1] * dt;
        p[i*3+2] += v[i*3+2] * dt;

        // Sea contact
        if(p[i*3+1] < sl - 0.2){
          lf[i*2] = lf[i*2+1]; // kill
          p[i*3+1] = -9999;
          sz[i] = 0;
          continue;
        }

        sz[i] = (1.0 + progress * 1.5) * 0.45;
      }

      this.geom.attributes.position.needsUpdate = true;
      if(this.geom.attributes.size) this.geom.attributes.size.needsUpdate = true;

      // Update foams
      for(let i=0; i<this.foams.length; i++){
        const f = this.foams[i];
        if(!f.mesh.visible) continue;
        f.age += dt;
        if(f.age >= f.maxLife){
          f.mesh.visible = false;
          continue;
        }
        const prog = f.age / f.maxLife;
        const scaleGrow = 1 + prog * 2.2;
        f.mesh.scale.set(f.w * scaleGrow, 1, f.l * (1 + prog * 0.8));
        f.mesh.material.opacity = Math.max(0, (1 - prog) * 0.55);
      }
    },

    stepCraft(craft, dt, camPos){
      if(!this.ready) return;
      const s = craft.spec;
      const speed = Math.abs(craft.u || 0);

      const distToCam = camPos ? Math.hypot(craft.x - camPos.x, craft.z - camPos.z) : Math.hypot(craft.x - player.x, craft.z - player.z);
      if(distToCam > 120) return;

      const fx = Math.sin(craft.yaw);
      const fz = Math.cos(craft.yaw);
      const rx = Math.cos(craft.yaw);
      const rz = -Math.sin(craft.yaw);

      const prevVy = craft._lastVy || 0;
      craft._lastVy = craft.vy;
      const dVy = craft.vy - prevVy;
      if(dVy > 1.8 && craft.y <= (typeof SL !== 'undefined' ? SL : 0) + 0.35){
        const burstCount = isMobile ? 8 : 16;
        for(let k=0; k<burstCount; k++){
          const ang = (k / burstCount) * Math.PI * 2 + Math.random() * 0.2;
          const spd = 2.5 + Math.random() * 4.0;
          this.emit(
            craft.x + Math.cos(ang) * s.beam * 0.5,
            craft.y + 0.1,
            craft.z + Math.sin(ang) * s.len * 0.4,
            Math.cos(ang) * spd,
            2.0 + Math.random() * 2.8,
            Math.sin(ang) * spd,
            0.55 + Math.random() * 0.3,
            0.45
          );
        }
      }

      if(speed > 3.0){
        const bowX = craft.x + fx * s.len * 0.46;
        const bowZ = craft.z + fz * s.len * 0.46;
        const spRatio = Math.min(1.5, (speed - 3.0) / 10.0);
        const count = Math.random() < (isMobile ? (0.4 * spRatio) : (0.8 * spRatio)) ? 2 : 1;

        for(let side of [-1, 1]){
          for(let c=0; c<count; c++){
            const sideSpd = (3.5 + Math.random() * 3.5) * spRatio;
            const upSpd = (1.5 + Math.random() * 2.5) * spRatio;
            const fwdSpd = (speed * 0.35) * (0.8 + Math.random() * 0.4);
            const ox = bowX + rx * side * (s.beam * 0.42);
            const oz = bowZ + rz * side * (s.beam * 0.42);
            this.emit(
              ox,
              craft.y + 0.1,
              oz,
              rx * side * sideSpd + fx * fwdSpd + (Math.random() - 0.5),
              upSpd,
              rz * side * sideSpd + fz * fwdSpd + (Math.random() - 0.5),
              0.4 + Math.random() * 0.3,
              0.35 + spRatio * 0.2
            );
          }
        }
      }

      if(craft.throttle > 0.65 && speed > 6.0){
        const sternX = craft.x - fx * s.len * 0.48;
        const sternZ = craft.z - fz * s.len * 0.48;
        const thRatio = (craft.throttle - 0.65) / 0.35;
        const rCount = Math.random() < (isMobile ? 0.6 : 1.2) ? 2 : 1;
        for(let k=0; k<rCount; k++){
          this.emit(
            sternX + (Math.random() - 0.5) * (s.beam * 0.4),
            craft.y + 0.1,
            sternZ + (Math.random() - 0.5) * (s.beam * 0.4),
            -fx * (speed * 0.4) + (Math.random() - 0.5) * 1.5,
            3.0 + thRatio * 3.2 + Math.random() * 1.8,
            -fz * (speed * 0.4) + (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 0.35,
            0.4 + thRatio * 0.25
          );
        }
      }

      const yr = craft.yawRate || 0;
      if(Math.abs(yr) > 0.45 && speed > 4.0){
        const outerSide = yr > 0 ? -1 : 1;
        const midX = craft.x + rx * outerSide * s.beam * 0.5;
        const midZ = craft.z + rz * outerSide * s.beam * 0.5;
        const yrRatio = Math.min(1.5, Math.abs(yr) / 1.2);
        if(Math.random() < (isMobile ? 0.45 : 0.8)){
          this.emit(
            midX,
            craft.y + 0.1,
            midZ,
            rx * outerSide * (3.0 + Math.random() * 4.0) * yrRatio,
            1.8 + Math.random() * 2.0,
            rz * outerSide * (3.0 + Math.random() * 4.0) * yrRatio,
            0.45 + Math.random() * 0.25,
            0.4
          );
        }
      }

      if(speed > 2.5){
        craft._foamDist = (craft._foamDist || 0) + speed * dt;
        if(craft._foamDist > 2.2){
          craft._foamDist = 0;
          const sternX = craft.x - fx * s.len * 0.52;
          const sternZ = craft.z - fz * s.len * 0.52;
          const spNorm = Math.min(1.4, speed / s.maxSpeed);
          this.emitFoam(sternX, sternZ, craft.yaw, s.beam * (1.1 + spNorm * 0.9), s.len * 0.7, 1.4 + spNorm * 0.8);
        }
      }
    }
  };

  window.SPRAY = SPRAY;
})();
