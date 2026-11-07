// spray.js — Water spray and foam effects for watercraft (jet ski & motor boat)
// Hard particle caps: 180 on MOBILE, 450 on desktop.
// Stretched velocity streak geometry in a single draw call (LineSegments).
(function(){
  const isMobile = (typeof MOBILE !== 'undefined' && MOBILE);
  const MAX_PARTICLES = isMobile ? 180 : 450;
  const MAX_FOAM = 24;

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
    pos: null,    // simulation particle positions [N * 3]
    vel: null,    // particle velocities [N * 3]
    life: null,   // [age, maxLife]
    linePos: null,// LineSegments endpoints [N * 2 * 3]
    lineCol: null,// LineSegments colors [N * 2 * 4]
    geom: null,
    lines: null,
    head: 0,
    count: 0,

    // Foam pool
    foams: [],
    foamHead: 0,

    init(scene){
      if(this.ready) return;
      this.ready = true;

      const N = this.maxParticles;
      this.pos = new Float32Array(N * 3);
      this.vel = new Float32Array(N * 3);
      this.life = new Float32Array(N * 2);

      // LineSegments has 2 vertices per droplet (tail and head)
      this.linePos = new Float32Array(N * 2 * 3);
      this.lineCol = new Float32Array(N * 2 * 3);

      for(let i=0; i<N; i++){
        this.pos[i*3+1] = -9999;
        this.life[i*2] = 1;
        this.life[i*2+1] = 1;

        this.linePos[i*6+1] = -9999;
        this.linePos[i*6+4] = -9999;

        // Default colour: white with slight blue tint
        for(let v=0; v<2; v++){
          this.lineCol[i*6 + v*3 + 0] = 0.95;
          this.lineCol[i*6 + v*3 + 1] = 0.98;
          this.lineCol[i*6 + v*3 + 2] = 1.0;
        }
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(this.lineCol, 3));

      // Shaded line material with vertex colors and normal alpha blending (not additive)
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.70,
        depthWrite: false,
        blending: THREE.NormalBlending,
        linewidth: 1
      });

      this.geom = geom;
      this.lines = new THREE.LineSegments(geom, mat);
      this.lines.frustumCulled = false;
      this.lines.renderOrder = 4;
      scene.add(this.lines);

      // Foam quads pool
      const fGeo = new THREE.PlaneGeometry(1, 1);
      fGeo.rotateX(-Math.PI / 2);
      const fMat = new THREE.MeshBasicMaterial({
        map: getFoamTex(),
        transparent: true,
        depthWrite: false,
        opacity: 0.55
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

    emit(x, y, z, vx, vy, vz, maxLife, bright){
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
      this.life[idx*2+1] = maxLife || 0.65; // maxLife

      // Shading: brighter when facing sun or high speed
      const b = bright || 1.0;
      const r = Math.min(1.0, 0.90 * b);
      const g = Math.min(1.0, 0.96 * b);
      const bl = Math.min(1.0, 1.0 * b);

      for(let v=0; v<2; v++){
        this.lineCol[idx*6 + v*3 + 0] = r;
        this.lineCol[idx*6 + v*3 + 1] = g;
        this.lineCol[idx*6 + v*3 + 2] = bl;
      }
    },

    emitFoam(x, z, yaw, w, l, life){
      if(!this.foams.length) return;
      const f = this.foams[this.foamHead];
      this.foamHead = (this.foamHead + 1) % this.foams.length;
      f.x = x;
      f.z = z;
      f.age = 0;
      f.maxLife = life || 1.5;
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
      const lp = this.linePos;
      const lc = this.lineCol;
      const sl = (typeof SL !== 'undefined' ? SL : 0);
      const grav = 9.8 * dt;

      for(let i=0; i<N; i++){
        if(lf[i*2] >= lf[i*2+1]){
          lp[i*6+1] = -9999;
          lp[i*6+4] = -9999;
          continue;
        }

        lf[i*2] += dt;
        const progress = lf[i*2] / lf[i*2+1];

        // Parabolic arc with gravity
        v[i*3+1] -= grav;
        p[i*3] += v[i*3] * dt;
        p[i*3+1] += v[i*3+1] * dt;
        p[i*3+2] += v[i*3+2] * dt;

        // Sea contact: create small foam ripple and kill
        if(p[i*3+1] < sl - 0.05){
          if(Math.random() < 0.25){
            this.emitFoam(p[i*3], p[i*3+2], Math.random()*6.28, 0.45, 0.45, 0.8);
          }
          lf[i*2] = lf[i*2+1];
          lp[i*6+1] = -9999;
          lp[i*6+4] = -9999;
          continue;
        }

        // Velocity streak calculation (length ~ 0.04m to 0.18m along velocity vector)
        const spd = Math.hypot(v[i*3], v[i*3+1], v[i*3+2]) || 1;
        const streakLen = Math.max(0.04, Math.min(0.22, spd * 0.016));
        const dirX = (v[i*3] / spd) * streakLen;
        const dirY = (v[i*3+1] / spd) * streakLen;
        const dirZ = (v[i*3+2] / spd) * streakLen;

        // Head of droplet
        lp[i*6] = p[i*3];
        lp[i*6+1] = p[i*3+1];
        lp[i*6+2] = p[i*3+2];

        // Tail of droplet
        lp[i*6+3] = p[i*3] - dirX;
        lp[i*6+4] = p[i*3+1] - dirY;
        lp[i*6+5] = p[i*3+2] - dirZ;

        // Fading brightness towards end of life
        const fade = Math.max(0.1, 1.0 - progress);
        lc[i*6] = 0.90 * fade;
        lc[i*6+1] = 0.95 * fade;
        lc[i*6+2] = 1.0 * fade;
        lc[i*6+3] = 0.65 * fade;
        lc[i*6+4] = 0.75 * fade;
        lc[i*6+5] = 0.85 * fade;
      }

      this.geom.attributes.position.needsUpdate = true;
      this.geom.attributes.color.needsUpdate = true;

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

      // Splash burst on hull landing or wave slam
      const prevVy = craft._lastVy || 0;
      craft._lastVy = craft.vy;
      const dVy = craft.vy - prevVy;
      if(dVy > 1.6 && craft.y <= (typeof SL !== 'undefined' ? SL : 0) + 0.35){
        const burstCount = isMobile ? 12 : 28;
        for(let k=0; k<burstCount; k++){
          const ang = (k / burstCount) * Math.PI * 2 + Math.random() * 0.3;
          const spd = 3.0 + Math.random() * 5.0;
          this.emit(
            craft.x + Math.cos(ang) * s.beam * 0.5,
            craft.y + 0.1,
            craft.z + Math.sin(ang) * s.len * 0.4,
            Math.cos(ang) * spd,
            2.5 + Math.random() * 3.5,
            Math.sin(ang) * spd,
            0.6 + Math.random() * 0.3,
            1.1
          );
        }
      }

      // (a) Bow spray: two thin fans thrown outward at 35-50 degrees and upward from both sides
      if(speed > 3.0){
        const bowX = craft.x + fx * s.len * 0.44;
        const bowZ = craft.z + fz * s.len * 0.44;
        const spRatio = Math.min(1.6, (speed - 3.0) / 12.0);
        // Spawn rate proportional to speed
        const droplets = isMobile ? (speed > 12 ? 3 : 2) : (speed > 12 ? 7 : 4);

        for(let side of [-1, 1]){
          for(let c=0; c<droplets; c++){
            // Outward angle: 35 to 50 degrees from forward heading
            const fanAngle = (35 + Math.random() * 15) * (Math.PI / 180);
            const sideFactor = Math.sin(fanAngle);
            const fwdFactor = Math.cos(fanAngle) * 0.45;
            const spraySpeed = (4.0 + Math.random() * 5.5) * spRatio;
            const upSpeed = (1.8 + Math.random() * 3.2) * spRatio;

            const ox = bowX + rx * side * (s.beam * 0.38) + (Math.random() - 0.5) * 0.15;
            const oz = bowZ + rz * side * (s.beam * 0.38) + (Math.random() - 0.5) * 0.15;

            const vx = (rx * side * sideFactor + fx * fwdFactor) * spraySpeed;
            const vz = (rz * side * sideFactor + fz * fwdFactor) * spraySpeed;

            // Brighter on the sun side if sunDir exists
            let sunBonus = 1.0;
            if(typeof sunDir !== 'undefined'){
              const dot = (vx*sunDir.x + vz*sunDir.z) / spraySpeed;
              if(dot > 0) sunBonus += dot * 0.25;
            }

            this.emit(
              ox,
              craft.y + 0.12,
              oz,
              vx,
              upSpeed,
              vz,
              0.5 + Math.random() * 0.4,
              sunBonus
            );
          }
        }
      }

      // (b) Rooster tail: a narrow high arc behind the stern, only above ~60% throttle
      if(craft.throttle > 0.60 && speed > 5.0){
        const sternX = craft.x - fx * s.len * 0.48;
        const sternZ = craft.z - fz * s.len * 0.48;
        const thRatio = (craft.throttle - 0.60) / 0.40;
        const rCount = isMobile ? (craft.throttle > 0.85 ? 4 : 2) : (craft.throttle > 0.85 ? 9 : 5);

        for(let k=0; k<rCount; k++){
          const spread = (Math.random() - 0.5) * (s.beam * 0.25);
          const upSpd = 4.0 + thRatio * 4.5 + Math.random() * 2.5;
          const backSpd = (speed * 0.55 + Math.random() * 3.0);

          this.emit(
            sternX + rx * spread,
            craft.y + 0.12,
            sternZ + rz * spread,
            -fx * backSpd + (Math.random() - 0.5) * 1.0,
            upSpd,
            -fz * backSpd + (Math.random() - 0.5) * 1.0,
            0.55 + Math.random() * 0.35,
            1.05
          );
        }
      }

      // (c) Hard turns: wall of spray on the outside of the turn
      const yr = craft.yawRate || 0;
      if(Math.abs(yr) > 0.40 && speed > 3.5){
        const outerSide = yr > 0 ? -1 : 1;
        const wallCount = isMobile ? 4 : 8;
        const yrRatio = Math.min(1.8, Math.abs(yr) / 1.0);

        for(let k=0; k<wallCount; k++){
          const alongHull = (Math.random() - 0.3) * s.len * 0.5;
          const px = craft.x + rx * outerSide * s.beam * 0.48 + fx * alongHull;
          const pz = craft.z + rz * outerSide * s.beam * 0.48 + fz * alongHull;

          const outSpd = (4.5 + Math.random() * 5.0) * yrRatio;
          const upSpd = 2.2 + Math.random() * 3.2;

          this.emit(
            px,
            craft.y + 0.12,
            pz,
            rx * outerSide * outSpd + (Math.random() - 0.5) * 0.8,
            upSpd,
            rz * outerSide * outSpd + (Math.random() - 0.5) * 0.8,
            0.5 + Math.random() * 0.35,
            1.08
          );
        }
      }

      // Foam trail: fading, widening patches left behind craft (V-wake)
      if(speed > 2.5){
        craft._foamDist = (craft._foamDist || 0) + speed * dt;
        if(craft._foamDist > 2.0){
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
