// jetrace.js — "Jet Ski Rider" race mode (Phase 4 & Phase 5 + Task B Wedge Ramps)
// Independent game mode: course, gates, timer, score, combo multiplier, nitro, ramps, jumps, iPad touch controls
(function(){
  const COURSE = [
    {x: 1243, z: -11536},
    {x: 1320, z: -11420},
    {x: 1420, z: -11280},
    {x: 1560, z: -11100},
    {x: 1720, z: -10890},
    {x: 1910, z: -10650},
    {x: 2120, z: -10380},
    {x: 2320, z: -10100},
    {x: 2480, z: -9800},
    {x: 2600, z: -9480},
    {x: 2680, z: -9120},
    {x: 2740, z: -8750},
    {x: 2780, z: -8350},
    {x: 2820, z: -7920}
  ];

  let rampTexture = null;
  function getRampTex(){
    if(rampTexture) return rampTexture;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');

    // Base background orange
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(0, 0, 256, 256);

    // Diagonal orange/white stripes
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 24;
    for(let d = -256; d < 512; d += 48){
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + 256, 256);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    // Bold Chevron arrows on the slope indicating jump direction
    ctx.fillStyle = '#111822';
    for(let y = 50; y < 240; y += 75){
      ctx.beginPath();
      ctx.moveTo(128, y - 26);
      ctx.lineTo(210, y + 16);
      ctx.lineTo(178, y + 24);
      ctx.lineTo(128, y - 6);
      ctx.lineTo(78, y + 24);
      ctx.lineTo(46, y + 16);
      ctx.closePath();
      ctx.fill();

      // Yellow neon outline for chevron
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    rampTexture = new THREE.CanvasTexture(c);
    rampTexture.wrapS = THREE.RepeatWrapping;
    rampTexture.wrapT = THREE.RepeatWrapping;
    return rampTexture;
  }

  function createWedgeGeometry(W, L, H){
    const hw = W * 0.5;
    const hl = L * 0.5;
    // Front edge at -hl with y=0, back edge at +hl with y=H
    // 5 faces: slope quad (2 tri), back quad (2 tri), bottom quad (2 tri), 2 side triangles
    const pos = [];
    const norm = [];
    const uvs = [];

    // Helper to push triangle
    function addTri(p1, p2, p3, n, uv1, uv2, uv3){
      pos.push(...p1, ...p2, ...p3);
      norm.push(...n, ...n, ...n);
      uvs.push(...uv1, ...uv2, ...uv3);
    }

    // 1. Slope face: (-hw, 0, -hl), (hw, 0, -hl), (hw, H, hl), (-hw, H, hl)
    const slLen = Math.hypot(L, H);
    const snY = L / slLen;
    const snZ = -H / slLen;
    const sNorm = [0, snY, snZ];
    addTri([-hw, 0, -hl], [hw, 0, -hl], [hw, H, hl], sNorm, [0, 0], [1, 0], [1, 1]);
    addTri([-hw, 0, -hl], [hw, H, hl], [-hw, H, hl], sNorm, [0, 0], [1, 1], [0, 1]);

    // 2. Back vertical face: at z = +hl from y=0 to y=H
    const bNorm = [0, 0, 1];
    addTri([hw, 0, hl], [-hw, 0, hl], [-hw, H, hl], bNorm, [0, 0], [1, 0], [1, 1]);
    addTri([hw, 0, hl], [-hw, H, hl], [hw, H, hl], bNorm, [0, 0], [1, 1], [0, 1]);

    // 3. Bottom face: y = 0
    const dNorm = [0, -1, 0];
    addTri([-hw, 0, -hl], [-hw, 0, hl], [hw, 0, hl], dNorm, [0, 0], [0, 1], [1, 1]);
    addTri([-hw, 0, -hl], [hw, 0, hl], [hw, 0, -hl], dNorm, [0, 0], [1, 1], [1, 0]);

    // 4. Left side face: x = -hw
    const lNorm = [-1, 0, 0];
    addTri([-hw, 0, -hl], [-hw, H, hl], [-hw, 0, hl], lNorm, [0, 0], [1, 1], [1, 0]);

    // 5. Right side face: x = +hw
    const rNorm = [1, 0, 0];
    addTri([hw, 0, -hl], [hw, 0, hl], [hw, H, hl], rNorm, [0, 0], [1, 0], [1, 1]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }

  const JETRACE = {
    on: false,
    craft: null,
    savedPos: null,
    gateIdx: 0,
    score: 0,
    bestScore: 0,
    combo: 1,
    time: 0,
    finished: false,

    // 3D objects
    grp: null,
    buoysMesh: null,
    targetRing: null,

    // Phase 5 extras: nitro & ramps
    nitro: 1.0,
    boosting: false,
    boostTimer: 0,
    nitroRingsMesh: null,
    nitroPickups: [],
    rampsMesh: null,
    rampMarkersMesh: null,
    rampFoamsMesh: null,
    ramps: [],
    airborne: false,
    airTime: 0,

    initUI(){
      if(document.getElementById('jrCss')) return;
      const st = document.createElement('style');
      st.id = 'jrCss';
      st.textContent = `
#jrHud{position:absolute;inset:0;pointer-events:none;z-index:45;font-family:var(--f-disp,sans-serif)}
#jrTop{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:flex;gap:12px;background:rgba(10,18,24,.82);border:1.5px solid rgba(242,193,78,.45);border-radius:16px;padding:8px 18px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 20px rgba(0,0,0,.5)}
.jrItem{display:flex;flex-direction:column;align-items:center}
.jrLbl{font-size:9px;color:#a9bcc2;letter-spacing:.12em;text-transform:uppercase}
.jrVal{font-size:16px;font-weight:800;color:#f5f1e8;font-variant-numeric:tabular-nums}
#jrComboVal{color:#f2c14e}
#jrSpdVal{color:#76d7ea}
#jrNitroBar{position:absolute;bottom:calc(18px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);width:min(60vw,280px);height:12px;border-radius:6px;background:rgba(10,18,24,.8);border:1px solid rgba(255,255,255,.3);overflow:hidden;pointer-events:none}
#jrNitroFill{height:100%;width:100%;background:linear-gradient(90deg,#f2994a,#f2c14e);transition:width .1s}
#jrBoostBtn{position:absolute;right:max(24px,env(safe-area-inset-right));bottom:calc(105px + env(safe-area-inset-bottom,0px));width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#f2994a,#f2c14e);color:#111;font-weight:900;font-size:13px;border:2px solid #fff;box-shadow:0 4px 18px rgba(242,153,74,.6);display:none;align-items:center;justify-content:center;pointer-events:auto;user-select:none;-webkit-user-select:none;touch-action:manipulation}
#jrBoostBtn:active{transform:scale(.95)}
#jrEndModal{position:absolute;inset:0;background:rgba(8,16,22,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:auto;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:50}
#jrEndModal[hidden]{display:none}
#jrEndBox{background:rgba(15,26,35,.9);border:2px solid #f2c14e;border-radius:20px;padding:24px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 12px 40px rgba(0,0,0,.7);max-width:min(90vw,380px)}
#jrEndTitle{font-size:22px;font-weight:900;color:#f2c14e;letter-spacing:.05em}
.jrRow{display:flex;justify-content:space-between;width:100%;font-size:14px;color:#f5f1e8}
.jrBtns{display:flex;gap:14px;width:100%;margin-top:6px}
.jrBtns button{flex:1;padding:12px;font-size:14px;border-radius:12px}
#jrBtnExit{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3)}
#jrBtnRetry{background:var(--sun,#f2c14e);color:#111;border:1px solid #fff}
      `;
      document.head.appendChild(st);

      const d = document.createElement('div');
      d.id = 'jrHud';
      d.hidden = true;
      d.innerHTML = `
        <div id="jrTop">
          <div class="jrItem"><span class="jrLbl">Score</span><span class="jrVal" id="jrScoreVal">0</span></div>
          <div class="jrItem"><span class="jrLbl">Combo</span><span class="jrVal" id="jrComboVal">x1</span></div>
          <div class="jrItem"><span class="jrLbl">Gate</span><span class="jrVal" id="jrGateVal">1/${COURSE.length - 1}</span></div>
          <div class="jrItem"><span class="jrLbl">Time</span><span class="jrVal" id="jrTimeVal">0.0s</span></div>
          <div class="jrItem"><span class="jrLbl">Speed</span><span class="jrVal" id="jrSpdVal">0 km/h</span></div>
        </div>
        <div id="jrNitroBar"><div id="jrNitroFill"></div></div>
        <div id="jrBoostBtn">BOOST</div>
        <div id="jrEndModal" hidden>
          <div id="jrEndBox">
            <div id="jrEndTitle">RACE COMPLETE!</div>
            <div class="jrRow"><span>Final Score:</span><strong id="jrEndScore">0</strong></div>
            <div class="jrRow"><span>Time:</span><strong id="jrEndTime">0.0s</strong></div>
            <div class="jrRow"><span>Best Record:</span><strong id="jrEndBest">0</strong></div>
            <div class="jrBtns">
              <button id="jrBtnExit">Exit</button>
              <button id="jrBtnRetry">Retry</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(d);

      try{
        this.bestScore = parseInt(localStorage.getItem('odesa_jetrace_best') || '0', 10);
      }catch(e){}

      document.getElementById('jrBtnExit').onclick = () => this.stop();
      document.getElementById('jrBtnRetry').onclick = () => {
        document.getElementById('jrEndModal').hidden = true;
        this.startRun();
      };

      const bBtn = document.getElementById('jrBoostBtn');
      const startBoost = (e) => { e.preventDefault(); this.tryBoost(); };
      bBtn.addEventListener('pointerdown', startBoost);

      if((typeof TOUCH !== 'undefined' && TOUCH) || (typeof MOBILE !== 'undefined' && MOBILE)) {
        bBtn.style.display = 'flex';
      }
    },

    tryBoost(){
      if(!this.on || this.boosting || this.nitro <= 0.25) return;
      this.boosting = true;
      this.boostTimer = 3.0;
      if(typeof toast === 'function') toast('NITRO BOOST!', 'thrust x1.8');
    },

    setupButton(){
      const tb = document.getElementById('topBtns');
      if(!tb || document.getElementById('bJetRace')) return;
      const b = document.createElement('button');
      b.id = 'bJetRace';
      b.textContent = 'Jet Ski Rider';
      b.onclick = () => {
        if(this.on) this.stop();
        else this.start();
      };
      tb.appendChild(b);
      if(typeof HUDM !== 'undefined' && HUDM.MODES && !HUDM.MODES.includes('bJetRace')){
        HUDM.MODES.push('bJetRace');
        if(HUDM.adopt) HUDM.adopt(b);
      }
    },

    buildCourse(){
      this.grp = new THREE.Group();
      scene.add(this.grp);

      const gateCount = COURSE.length - 1;
      const buoyCount = gateCount * 2;
      const buoyGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8);
      const buoyMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        roughness: 0.35,
        metalness: 0.1
      });
      const buoysMesh = new THREE.InstancedMesh(buoyGeo, buoyMat, buoyCount);
      buoysMesh.castShadow = true;

      const dummy = new THREE.Object3D();
      this.gates = [];

      for(let i=0; i<gateCount; i++){
        const p1 = COURSE[i];
        const p2 = COURSE[i+1];
        const cx = (p1.x + p2.x) * 0.5;
        const cz = (p1.z + p2.z) * 0.5;
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        const halfSpan = 8.5; // gate width 17m

        const leftX = cx + nx * halfSpan;
        const leftZ = cz + nz * halfSpan;
        const rightX = cx - nx * halfSpan;
        const rightZ = cz - nz * halfSpan;
        const sl = typeof SL !== 'undefined' ? SL : 0;

        dummy.position.set(leftX, sl + 0.4, leftZ);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        buoysMesh.setMatrixAt(i*2, dummy.matrix);

        dummy.position.set(rightX, sl + 0.4, rightZ);
        dummy.updateMatrix();
        buoysMesh.setMatrixAt(i*2+1, dummy.matrix);

        this.gates.push({
          idx: i,
          cx,
          cz,
          radius: halfSpan + 1.2,
          dx,
          dz,
          len,
          passed: false
        });
      }
      buoysMesh.instanceMatrix.needsUpdate = true;
      this.grp.add(buoysMesh);
      this.buoysMesh = buoysMesh;

      // Target ring highlighting next gate
      const ringGeo = new THREE.TorusGeometry(8.5, 0.22, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf2c14e,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
      });
      this.targetRing = new THREE.Mesh(ringGeo, ringMat);
      this.grp.add(this.targetRing);

      // Nitro pickup rings
      const nIndices = [2, 5, 8, 11];
      const nGeo = new THREE.TorusGeometry(1.6, 0.18, 8, 16);
      const nMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, depthWrite: false });
      this.nitroRingsMesh = new THREE.InstancedMesh(nGeo, nMat, nIndices.length);
      this.nitroPickups = [];

      for(let k=0; k<nIndices.length; k++){
        const g = this.gates[nIndices[k]];
        const px = g.cx;
        const pz = g.cz;
        dummy.position.set(px, (typeof SL !== 'undefined' ? SL : 0) + 1.6, pz);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.nitroRingsMesh.setMatrixAt(k, dummy.matrix);
        this.nitroPickups.push({ x: px, z: pz, taken: false, idx: k });
      }
      this.nitroRingsMesh.instanceMatrix.needsUpdate = true;
      this.grp.add(this.nitroRingsMesh);

      // TASK B: 3 Real triangular wedge ramps (W=6m, L=10m, H=1.8m)
      // Placed 25m BEFORE gates 3, 7, 10 facing course direction
      const rampIndices = [3, 7, 10];
      const wedgeGeo = createWedgeGeometry(6.0, 10.0, 1.8);
      const rampMat = new THREE.MeshStandardMaterial({
        map: getRampTex(),
        roughness: 0.35,
        metalness: 0.15
      });
      this.rampsMesh = new THREE.InstancedMesh(wedgeGeo, rampMat, rampIndices.length);
      this.rampsMesh.castShadow = true;
      this.rampsMesh.receiveShadow = true;

      // Foam edge at front waterline of each ramp (a quad 6m wide x 1.2m long)
      const rFoamGeo = new THREE.PlaneGeometry(6.4, 1.4);
      rFoamGeo.rotateX(-Math.PI / 2);
      const rFoamMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      this.rampFoamsMesh = new THREE.InstancedMesh(rFoamGeo, rFoamMat, rampIndices.length);

      // Bright marker beacon ring floating high above ramp (visible from 150m)
      const rMarkerGeo = new THREE.TorusGeometry(3.0, 0.28, 8, 20);
      rMarkerGeo.rotateX(Math.PI / 2);
      const rMarkerMat = new THREE.MeshBasicMaterial({
        color: 0xffea00,
        depthWrite: false
      });
      this.rampMarkersMesh = new THREE.InstancedMesh(rMarkerGeo, rMarkerMat, rampIndices.length);

      this.ramps = [];

      for(let k=0; k<rampIndices.length; k++){
        const g = this.gates[rampIndices[k]];
        // Normalized forward course vector for gate
        const ufx = g.dx / g.len;
        const ufz = g.dz / g.len;
        // Position 25m BEFORE the gate centre
        const rx = g.cx - ufx * 25.0;
        const rz = g.cz - ufz * 25.0;
        const angle = Math.atan2(ufx, ufz);
        const sl = typeof SL !== 'undefined' ? SL : 0;

        // Wedge ramp transform: front edge at waterline
        dummy.position.set(rx, sl + 0.05, rz);
        dummy.rotation.set(0, angle, 0);
        dummy.updateMatrix();
        this.rampsMesh.setMatrixAt(k, dummy.matrix);

        // Foam edge at the front entry of the ramp (-5m in local Z)
        dummy.position.set(rx - ufx * 5.0, sl + 0.08, rz - ufz * 5.0);
        dummy.rotation.set(0, angle, 0);
        dummy.updateMatrix();
        this.rampFoamsMesh.setMatrixAt(k, dummy.matrix);

        // Tall bright marker ring 6m above ramp
        dummy.position.set(rx, sl + 6.0, rz);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.rampMarkersMesh.setMatrixAt(k, dummy.matrix);

        this.ramps.push({
          x: rx,
          z: rz,
          gateIdx: rampIndices[k],
          rot: angle,
          ufx,
          ufz,
          used: false
        });
      }

      this.rampsMesh.instanceMatrix.needsUpdate = true;
      this.rampFoamsMesh.instanceMatrix.needsUpdate = true;
      this.rampMarkersMesh.instanceMatrix.needsUpdate = true;

      this.grp.add(this.rampsMesh);
      this.grp.add(this.rampFoamsMesh);
      this.grp.add(this.rampMarkersMesh);
    },

    start(){
      if(this.on) return;
      this.initUI();
      if(typeof MARINE === 'undefined' || !MARINE.crafts) return;

      const js = MARINE.crafts.find(c => c.type === 'jetski');
      if(!js){
        if(typeof toast === 'function') toast('No jet ski available', 'visit sea terminal pier');
        return;
      }

      this.savedPos = {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        curCraft: MARINE.cur
      };

      this.on = true;
      const btn = document.getElementById('bJetRace');
      if(btn) btn.classList.add('on');

      this.buildCourse();
      this.craft = js;

      this.startRun();
      document.getElementById('jrHud').hidden = false;
      if(typeof toast === 'function') toast('JET SKI RIDER', 'pass gates, collect nitro, hit ramps!');
    },

    startRun(){
      this.gateIdx = 0;
      this.score = 0;
      this.combo = 1;
      this.time = 0;
      this.finished = false;
      this.nitro = 1.0;
      this.boosting = false;
      this.airborne = false;
      this.airTime = 0;

      const startP = COURSE[0];
      const pNext = COURSE[1];
      const startYaw = Math.atan2(pNext.x - startP.x, pNext.z - startP.z);

      this.craft.x = startP.x;
      this.craft.z = startP.z;
      this.craft.y = (typeof SL !== 'undefined' ? SL : 0) + 0.1;
      this.craft.yaw = startYaw;
      this.craft.u = 0;
      this.craft.vx = 0;
      this.craft.vz = 0;
      this.craft.vy = 0;
      this.craft.pitch = 0;
      this.craft.throttle = 0;
      this.craft.sync();

      if(MARINE.cur !== this.craft){
        MARINE.enter(this.craft);
      }

      for(const g of this.gates) g.passed = false;
      for(const p of this.nitroPickups) p.taken = false;
      for(const r of this.ramps) r.used = false;

      this.updateTargetRing();
      this.syncHUD();
    },

    updateTargetRing(){
      if(!this.targetRing) return;
      if(this.gateIdx < this.gates.length){
        const g = this.gates[this.gateIdx];
        const sl = typeof SL !== 'undefined' ? SL : 0;
        this.targetRing.position.set(g.cx, sl + 0.4, g.cz);
        this.targetRing.visible = true;
      } else {
        this.targetRing.visible = false;
      }
    },

    syncHUD(){
      const sv = document.getElementById('jrScoreVal');
      const cv = document.getElementById('jrComboVal');
      const gv = document.getElementById('jrGateVal');
      const tv = document.getElementById('jrTimeVal');
      const spd = document.getElementById('jrSpdVal');
      const nf = document.getElementById('jrNitroFill');

      if(sv) sv.textContent = this.score;
      if(cv) cv.textContent = 'x' + this.combo;
      if(gv) gv.textContent = (Math.min(this.gateIdx + 1, this.gates.length)) + '/' + this.gates.length;
      if(tv) tv.textContent = this.time.toFixed(1) + 's';
      if(spd && this.craft) spd.textContent = Math.round(Math.abs(this.craft.u || 0) * 3.6) + ' km/h';
      if(nf) nf.style.width = Math.round(this.nitro * 100) + '%';
    },

    passGate(idx){
      const g = this.gates[idx];
      g.passed = true;
      const pts = 100 * this.combo;
      this.score += pts;
      this.combo = Math.min(12, this.combo + 1);

      if(typeof toast === 'function') toast('GATE +' + pts, 'Combo x' + this.combo);
      this.gateIdx = idx + 1;
      this.updateTargetRing();

      if(this.gateIdx >= this.gates.length){
        this.finishRun();
      }
    },

    missGate(){
      this.combo = 1;
      if(typeof toast === 'function') toast('GATE MISSED', 'Combo reset to x1');
    },

    finishRun(){
      this.finished = true;
      if(this.score > this.bestScore){
        this.bestScore = this.score;
        try{ localStorage.setItem('odesa_jetrace_best', String(this.bestScore)); }catch(e){}
      }
      document.getElementById('jrEndScore').textContent = this.score;
      document.getElementById('jrEndTime').textContent = this.time.toFixed(1) + 's';
      document.getElementById('jrEndBest').textContent = this.bestScore;
      document.getElementById('jrEndModal').hidden = false;
    },

    update(dt){
      if(!this.on || this.finished || !this.craft) return;

      this.time += dt;

      if(this.boosting){
        this.boostTimer -= dt;
        this.nitro = Math.max(0, this.nitro - dt * 0.35);
        this.craft.u *= (1 + 0.35 * dt);
        if(typeof camera !== 'undefined' && camera.isPerspectiveCamera){
          camera.fov = Math.min(74, camera.fov + 18 * dt);
          camera.updateProjectionMatrix();
        }
        if(typeof SPRAY !== 'undefined' && SPRAY.ready){
          SPRAY.stepCraft(this.craft, dt * 1.5, camera.position);
        }
        if(this.boostTimer <= 0 || this.nitro <= 0.05){
          this.boosting = false;
        }
      } else {
        if(typeof camera !== 'undefined' && camera.isPerspectiveCamera && camera.fov > 62){
          camera.fov = Math.max(62, camera.fov - 15 * dt);
          camera.updateProjectionMatrix();
        }
      }

      if(typeof inp !== 'undefined' && inp.k && inp.k.ShiftLeft){
        this.tryBoost();
      }

      if(this.gateIdx < this.gates.length){
        const g = this.gates[this.gateIdx];
        const d = Math.hypot(this.craft.x - g.cx, this.craft.z - g.cz);
        if(d < g.radius){
          this.passGate(this.gateIdx);
        } else {
          const fx = g.dx;
          const fz = g.dz;
          const vGateCraftX = this.craft.x - g.cx;
          const vGateCraftZ = this.craft.z - g.cz;
          const dot = vGateCraftX * fx + vGateCraftZ * fz;
          if(dot > 22 && d > g.radius){
            this.missGate();
            this.gateIdx++;
            this.updateTargetRing();
            if(this.gateIdx >= this.gates.length) this.finishRun();
          }
        }
      }

      for(const p of this.nitroPickups){
        if(!p.taken && Math.hypot(this.craft.x - p.x, this.craft.z - p.z) < 4.5){
          p.taken = true;
          this.nitro = Math.min(1.0, this.nitro + 0.45);
          const dummy = new THREE.Object3D();
          dummy.position.set(0, -9999, 0);
          dummy.updateMatrix();
          this.nitroRingsMesh.setMatrixAt(p.idx, dummy.matrix);
          this.nitroRingsMesh.instanceMatrix.needsUpdate = true;
          if(typeof toast === 'function') toast('+NITRO', 'Boost meter replenished');
        }
      }

      // Task B: Ramps Launch & Mid-air physics
      const sl = typeof SL !== 'undefined' ? SL : 0;
      for(const r of this.ramps){
        if(!r.used && Math.hypot(this.craft.x - r.x, this.craft.z - r.z) < 5.2){
          r.used = true;
          this.airborne = true;
          this.airTime = 0;
          const curSpd = Math.max(12, Math.abs(this.craft.u || 0));
          // Proportional launch upward velocity: at 20 m/s vy ~ 8.8 -> airTime ~ 1.5s
          this.craft.vy = curSpd * 0.44;
          this.craft.y += 1.2;
          // Slight nose-up on take-off
          this.craft.pitch = -0.22;
          if(typeof toast === 'function') toast('RAMP LAUNCH!', 'Airborne');
        }
      }

      if(this.airborne){
        this.airTime += dt;
        this.craft.vy -= 9.8 * dt; // gravity
        this.craft.y += this.craft.vy * dt;

        // Level off pitch in air
        this.craft.pitch += (0.05 - this.craft.pitch) * dt * 2.0;

        // Landing check
        if(this.craft.y <= sl + 0.15 && this.airTime > 0.35){
          this.airborne = false;
          this.craft.y = sl + 0.05;
          const pts = Math.round(this.airTime * 200);
          let extraMsg = 'AIR +' + pts;

          // Stuck the landing bonus
          if(Math.abs(this.craft.pitch) < 0.20 && Math.abs(this.craft.roll) < 0.20){
            this.score += 250;
            extraMsg += ' · STUCK THE LANDING! +250';
          }
          this.score += pts;
          if(typeof toast === 'function') toast(extraMsg, '');

          // Landing water splash burst
          if(typeof SPRAY !== 'undefined' && SPRAY.ready){
            const s = this.craft.spec;
            for(let k=0; k<24; k++){
              const ang = (k / 24) * Math.PI * 2 + Math.random() * 0.2;
              const sp = 4.0 + Math.random() * 5.0;
              SPRAY.emit(
                this.craft.x + Math.cos(ang) * s.beam * 0.6,
                sl + 0.1,
                this.craft.z + Math.sin(ang) * s.len * 0.5,
                Math.cos(ang) * sp,
                2.5 + Math.random() * 3.5,
                Math.sin(ang) * sp,
                0.6 + Math.random() * 0.4,
                1.15
              );
            }
          }
        }
      }

      this.syncHUD();
    },

    stop(){
      if(!this.on) return;
      this.on = false;

      const btn = document.getElementById('bJetRace');
      if(btn) btn.classList.remove('on');

      if(typeof camera !== 'undefined' && camera.isPerspectiveCamera){
        camera.fov = 62;
        camera.updateProjectionMatrix();
      }

      if(this.grp){
        scene.remove(this.grp);
        if(this.buoysMesh){
          this.buoysMesh.geometry.dispose();
          this.buoysMesh.material.dispose();
        }
        if(this.targetRing){
          this.targetRing.geometry.dispose();
          this.targetRing.material.dispose();
        }
        if(this.nitroRingsMesh){
          this.nitroRingsMesh.geometry.dispose();
          this.nitroRingsMesh.material.dispose();
        }
        if(this.rampsMesh){
          this.rampsMesh.geometry.dispose();
          this.rampsMesh.material.dispose();
        }
        if(this.rampFoamsMesh){
          this.rampFoamsMesh.geometry.dispose();
          this.rampFoamsMesh.material.dispose();
        }
        if(this.rampMarkersMesh){
          this.rampMarkersMesh.geometry.dispose();
          this.rampMarkersMesh.material.dispose();
        }
        this.grp = null;
      }

      const hud = document.getElementById('jrHud');
      if(hud) hud.hidden = true;
      const modal = document.getElementById('jrEndModal');
      if(modal) modal.hidden = true;

      if(this.savedPos){
        if(this.savedPos.curCraft && MARINE.cur !== this.savedPos.curCraft){
        } else if(!this.savedPos.curCraft && MARINE.cur){
          MARINE.exit(true);
        }
        teleportRaw(this.savedPos.x, this.savedPos.z, this.savedPos.yaw, 0);
        player.y = this.savedPos.y;
        this.savedPos = null;
      }
      if(typeof toast === 'function') toast('Exited Jet Ski Rider', 'restored normal play');
    }
  };

  window.JETRACE = JETRACE;

  const hook = () => {
    JETRACE.setupButton();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
  else hook();
})();
