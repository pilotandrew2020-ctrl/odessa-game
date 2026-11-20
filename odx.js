/* ===================================================================================================
   odx.js (2026-11-20, from the Godot prototype my-odesa-3d) — extends the systems that already exist:
   • ISLAND: GLB dinosaurs (T-rex, raptor, stegosaurus) and a lion join FAUNA as new species (same AI: wander, alert,
     chase, bite, flee, die, can be shot / blown up), each with its own AnimationMixer and clips; golden eagles circle the volcano.
   • VOLCANO: a lava shader (crust plates over glowing magma, the flows stream downhill), a soft smoke column with per-puff
     size / shade, sparks thrown from the crater and ash falling near it.
   • NUKE: a volumetric mushroom (stem, cap, ring, skirt meshes with a billowing shader + smoke billows around the cap) and a
     shock dome replace the flat footage billboard. When the shock front has passed, every chunk it touched is disposed
     (disposeChunk: geometry.dispose(), its trees / benches / colliders go) and rebuilt WITHOUT the buildings, lamps, signs,
     parked cars and trees inside the blast (blockedStatic asks NUKE_CUT): nothing is left behind, nothing grows back.
     The effect frees its own meshes, materials and textures when it ends.
   • CO-OP: presence goes out from a fixed 20 Hz timer (not from the frame loop); friends are drawn through NetSnaps
     (sender-stamped buffer, Catmull-Rom positions, lerped angles).
   • PLAYERS: assets/models/players/player_me.glb (you) and player_friend.glb (your friends), used when the files exist.
   =================================================================================================== */

// ---------------------------------------------------------------------------------------------- nuked areas (permanent)
const NUKE_CUT = [];   // {x, z, r}: inside, chunks build no buildings / lamps / signs / parked cars / trees
function nukeGone(x, z, m) { for (const c of NUKE_CUT) { const dx = x - c.x, dz = z - c.z, r = c.r + (m || 0); if (dx * dx + dz * dz < r * r) return true } return false }

// ---------------------------------------------------------------------------------------------- skinned clone (SkeletonUtils.clone)
function odxClone(src) {
  const map = new Map(), clone = src.clone(true);
  const walk = (a, b) => { map.set(a, b); for (let i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i]) };
  walk(src, clone);
  clone.traverse(o => {
    if (!o.isSkinnedMesh) return;
    let s = null; for (const [k, v] of map) if (v === o) { s = k; break }
    if (!s || !s.skeleton) return;
    o.bind(new THREE.Skeleton(s.skeleton.bones.map(b => map.get(b)), s.skeleton.boneInverses), s.bindMatrix);
  });
  return clone;
}

// ---------------------------------------------------------------------------------------------- players: player_me.glb / player_friend.glb
const PLAYER_GLB = { me: false, friend: false,
  init() {
    if (this._i || typeof REAL === 'undefined') return; this._i = 1;
    // assets/models/players/players.json says which of the two files are there (no probing for missing files = no 404s)
    fetch('assets/models/players/players.json').then(r => r.ok ? r.json() : {}).then(j => { for (const k of ['me', 'friend']) { if (!j || !j[k]) continue;
      REAL.BOD[k] = { url: 'assets/models/players/player_' + k + '.glb', sc: 1, tpl: null, st: 0, lim: { ua: .7, la: .8, th: .9, ca: .9 } }; this[k] = true;
      if (k === 'me') try { REAL.loadX('me') } catch (e) {} } }).catch(() => {});
  },
  // the options a body is built from: my own body -> 'me'; a friend's -> 'friend' (if those files are there)
  mine(o) { if (this.me && o && o.real && !o.bodyK && !o.booba && !o.nolik) o.bodyK = 'me'; return o },
  peer(o) { if (!o) return o; if (this.friend && !o.booba && !o.nolik) { o.real = true; o.bodyK = 'friend' } else if (o.bodyK === 'me') delete o.bodyK; return o }
};

// ---------------------------------------------------------------------------------------------- island: GLB animals
const ODX_ANIMALS = {
  // L: body length (m) the model is scaled to; yaw: model forward vs +Z; clips: name in the GLB (or [clip, from, to] frames at 24 fps)
  trex: { n: 'Tyrannosaurus', glb: 'assets/models/island/trex.glb', L: 12, hp: 900, hostile: 1, sight: 85, agg: 60, walk: 2.4, run: 9.5, dmg: 48, rng: 5.5, cd: 1.8, pay: 3500, cap: 1, snd: 'roar', R: 1.4,
    clips: { walk: 'Armature|ArmatureAction', run: 'Armature|ArmatureAction', idle: 'Armature|ArmatureAction' }, idleSpeed: .15 },
  raptor: { n: 'Velociraptor', glb: 'assets/models/island/raptor.glb', L: 3.4, hp: 120, hostile: 1, sight: 65, agg: 45, walk: 1.9, run: 14, dmg: 20, rng: 2.3, cd: .95, pay: 950, cap: 4, snd: 'squeal', R: .45,
    clips: { walk: 'Walk', run: 'Sprint', idle: 'Idle_01', attack: 'Bite_01', roar: 'Roar_01', death: 'Death_01' } },
  stegosaurus: { n: 'Stegosaurus', glb: 'assets/models/island/stegosaurus.glb', L: 8, hp: 700, hostile: 0, flee: 1, sight: 40, agg: 0, walk: 1.5, run: 5, dmg: 0, rng: 0, cd: 1, pay: 1500, cap: 2, snd: '', R: 1.2,
    clips: { walk: 'Walk', run: 'Run', idle: 'IdleA', attack: 'TailWhip', roar: 'Roar', death: 'Death' } },
  lion: { n: 'Lion', glb: 'assets/models/island/lion.glb', L: 2.4, hp: 140, hostile: 1, sight: 55, agg: 38, walk: 1.6, run: 14, dmg: 24, rng: 2.3, cd: 1.1, pay: 900, cap: 3, snd: 'roar', R: .4,
    clips: { idle: ['idle+attack01+attack02+roar+die+eat+Get_Hit+walk01+Run+jump_01', 0, 48], attack: ['idle+attack01+attack02+roar+die+eat+Get_Hit+walk01+Run+jump_01', 49, 70],
      walk: ['idle+attack01+attack02+roar+die+eat+Get_Hit+walk01+Run+jump_01', 246, 263], run: ['idle+attack01+attack02+roar+die+eat+Get_Hit+walk01+Run+jump_01', 263, 289] } }
};
const ODX_FAUNA = { tpl: {}, loading: {},
  init() {
    if (this._i || typeof FAUNA === 'undefined' || typeof FSP === 'undefined') return; this._i = 1;
    for (const id in ODX_ANIMALS) FSP[id] = ODX_ANIMALS[id];
    const spawn = FAUNA.spawn.bind(FAUNA), animate = FAUNA.animate.bind(FAUNA), damage = FAUNA.damage.bind(FAUNA);
    FAUNA.spawn = (id, x, z, yaw) => { const S = FSP[id]; if (!S || !S.glb) return spawn(id, x, z, yaw); if (!this.tpl[id]) { this.load(id); return null } return this.spawn(id, x, z, yaw) };
    FAUNA.animate = (a, dt) => a.S.glb ? this.animate(a, dt) : animate(a, dt);
    FAUNA.damage = (a, v, head) => { damage(a, v, head); if (a.S.glb && a.dead && a.mix && !a._dd) { a._dd = 1; this.play(a, 'death', 1, true) } };
    // start loading while you are near the island, so the first ones can appear
    ANIM.push(dt => { if (typeof ISLE !== 'undefined' && ISLE.on) for (const id in ODX_ANIMALS) this.load(id) });
  },
  load(id) {
    if (this.tpl[id] || this.loading[id]) return; this.loading[id] = 1; const S = FSP[id];
    new THREE.GLTFLoader().load(S.glb, g => {
      const root = g.scene; root.updateMatrixWorld(true);
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m.map) m.map.anisotropy = 4 } });
      // keep only the bone tracks: some FBX-born clips also key the armature object itself (root motion + the axis turn) and stand the animal on its tail
      for (const c of g.animations) c.tracks = c.tracks.filter(t => { const o = root.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName); return o && o.isBone });
      const clips = {};
      for (const k in S.clips) { const c = S.clips[k], name = Array.isArray(c) ? c[0] : c, base = g.animations.find(a => a.name === name) || g.animations[0];
        if (!base) continue; clips[k] = Array.isArray(c) ? THREE.AnimationUtils.subclip(base, k, c[1], c[2], 24) : base }
      // stand it up and turn it head-first, from its skeleton in the walking pose (the bounding box of a skinned mesh says nothing
      // about where it is drawn, and FBX-born rigs can carry a 90-degree axis turn inside their bones)
      const probe = odxClone(root), fix = new THREE.Group(), grp = new THREE.Group(); fix.add(probe); grp.add(fix); const mx = new THREE.AnimationMixer(probe);
      if (clips.walk) { mx.clipAction(clips.walk).play(); mx.update(.2) }
      const pts = () => { grp.updateMatrixWorld(true); const P = [], v = new THREE.Vector3(); let head = null; probe.traverse(o => { if (o.isBone) { const p = o.getWorldPosition(v).clone(); P.push(p); if (!head && /head/i.test(o.name) && !/nub|end|top/i.test(o.name)) head = p } }); return { P, head } };
      const stats = () => { const { P, head } = pts(), box = new THREE.Box3().setFromPoints(P), c = new THREE.Vector3(); for (const p of P) c.add(p); c.divideScalar(P.length || 1); return { box, c, head, size: box.getSize(new THREE.Vector3()) } };
      let st = stats();
      if (st.size.y > Math.max(st.size.x, st.size.z) * 1.1) {          // on its end: lay it down, back up
        const ax = st.size.z >= st.size.x ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1); let best = null;
        for (const sg of [1, -1]) { fix.quaternion.setFromAxisAngle(ax, sg * Math.PI / 2); const q = stats(); const up = (q.c.y - q.box.min.y) / (q.size.y || 1); if (!best || up > best.up) best = { up, q: fix.quaternion.clone() } }
        fix.quaternion.copy(best.q); st = stats();
      }
      if (st.head) { const yaw = Math.atan2(st.head.x - st.c.x, st.head.z - st.c.z); fix.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw)); st = stats() }
      const size = st.size, len = Math.max(size.x, size.z) || 1, k = S.L / len, ctr = st.box.getCenter(new THREE.Vector3());
      mx.stopAllAction(); mx.uncacheRoot(probe);
      this.tpl[id] = { root, k, y0: -st.box.min.y, cx: ctr.x, cz: ctr.z, q: fix.quaternion.clone(), clips };
    }, undefined, e => { console.warn('[odx] ' + id + ' failed', e); this.loading[id] = 0 });
  },
  spawn(id, x, z, yaw) {
    const S = FSP[id], T = this.tpl[id], root = new THREE.Group(), model = odxClone(T.root), hold = new THREE.Group(), fix = new THREE.Group();
    fix.quaternion.copy(T.q); fix.add(model); hold.add(fix); hold.scale.setScalar(T.k); hold.position.set(-T.cx * T.k, T.y0 * T.k, -T.cz * T.k); root.add(hold);
    const mix = new THREE.AnimationMixer(model), acts = {};
    for (const k in T.clips) acts[k] = mix.clipAction(T.clips[k]);
    const rig = { root, bodyY: S.L * .18, legs: [], tail: [], body: root, neck: root, head: root, jaw: root };
    const a = { id, S, rig, root, x, z, y: 0, yaw: yaw || 0, vx: 0, vz: 0, speed: 0, state: 'idle', t: Math.random() * 3, ph: 0, hp: S.hp, home: [x, z], tgt: null, cd: 0, dead: 0, alert: 0, jawO: 0, wind: 0, roarT: 0, seed: Math.random() * 100, pitch: 0, stalk: 0, mix, acts, cur: null };
    root.scale.setScalar(.92 + Math.random() * .16); ISLE.root.add(root); FAUNA.place(a); FAUNA.list.push(a); this.play(a, 'idle', 1);
    return a;
  },
  play(a, k, speed, once) {
    const act = a.acts[k] || a.acts.walk; if (!act) return;
    if (a.cur !== act) { act.reset(); act.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); act.clampWhenFinished = !!once; act.play(); if (a.cur) a.cur.crossFadeTo(act, .25, false); a.cur = act }
    act.timeScale = speed;
  },
  animate(a, dt) {
    if (!a.mix) return; const S = a.S, sp = a.speed;
    if (!a.dead) {
      if (a.state === 'attack' && a.acts.attack) this.play(a, 'attack', 1.3);
      else if (a.roarT > 0 && a.acts.roar && sp < .3) this.play(a, 'roar', 1);
      else if (sp > S.walk * 2.2) this.play(a, 'run', Math.max(.6, Math.min(1.8, sp / S.run * 1.2)));
      else if (sp > .15) this.play(a, 'walk', Math.max(.5, Math.min(2, sp / S.walk)));
      else this.play(a, 'idle', S.idleSpeed || 1);
    }
    a.mix.update(dt);
  }
};

// golden eagles soaring over the volcano (Low-Poly Seagull rig, recoloured in Blender)
const ODX_EAGLES = { list: [], tpl: null,
  update(dt) {
    if (typeof ISLE === 'undefined' || typeof ISLV === 'undefined') return;
    const on = ISLE.on && Math.hypot(player.x - ISLV.x, player.z - ISLV.z) < 2600;
    if (!on) { for (const e of this.list) e.g.visible = false; return }
    if (!this.tpl) { if (this._l) return; this._l = 1; new THREE.GLTFLoader().load('assets/models/island/eagle.glb', g => { this.tpl = g }, undefined, () => {}); return }
    if (!this.list.length) for (let i = 0; i < 6; i++) {
      const m = odxClone(this.tpl.scene), g = new THREE.Group(); m.scale.setScalar(1.15); g.add(m); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false } });
      const mix = new THREE.AnimationMixer(m); if (this.tpl.animations[0]) { const a = mix.clipAction(this.tpl.animations[0]); a.play(); a.time = Math.random() * 2 }
      scene.add(g); this.list.push({ g, mix, r: 160 + Math.random() * 260, h: 120 + Math.random() * 120, a: Math.random() * 6.28, w: (.05 + Math.random() * .06) * (i % 2 ? 1 : -1), ph: Math.random() * 10 });
    }
    const y0 = typeof VOL !== 'undefined' && VOL.y0 ? VOL.y0 : groundH(ISLV.x, ISLV.z);
    for (const e of this.list) {
      e.g.visible = true; e.a += e.w * dt; e.ph += dt; const glide = Math.sin(e.ph * .35) > .2;
      const x = ISLV.x + Math.cos(e.a) * e.r, z = ISLV.z + Math.sin(e.a) * e.r, y = y0 + e.h + Math.sin(e.ph * .5) * 8;
      e.g.position.set(x, y, z); e.g.rotation.set(0, Math.atan2(-Math.sin(e.a) * Math.sign(e.w), Math.cos(e.a) * Math.sign(e.w)) + Math.PI, -.3 * Math.sign(e.w));   // the model looks down -Z
      e.mix.update(dt * (glide ? .25 : 1.1));
    }
  }
};

// ---------------------------------------------------------------------------------------------- volcano: lava, smoke, sparks, ash
const ODX_LAVA_GLSL = `
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float cells(vec2 p){vec2 i=floor(p),f=fract(p);float d1=9.,d2=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(h2(i+g),h2(i+g+7.3));float d=length(g+o-f);if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}}return d2-d1;}`;
function odxLavaMat(flow) {
  return new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uFlow: { value: flow }, uHeat: { value: 1 } }, fog: false,
    vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'uniform float uT,uFlow,uHeat;varying vec2 vUv;varying vec3 vW;' + ODX_LAVA_GLSL + `
void main(){vec2 p=uFlow>0.?vec2(vUv.x*3.,vUv.y*.6-uT*uFlow):vW.xz*.09;float w=fb(p*1.3+uT*.05);
float c=cells(p*2.2+w*1.5);float glow=smoothstep(.32,0.,c);float plate=smoothstep(.3,.7,w+n2(p*5.-uT*.1)*.3);
float h=clamp(glow*1.1+(1.-plate)*.35,0.,1.)*uHeat;vec3 col=mix(vec3(.09,.05,.04),vec3(.95,.28,.03),h);col=mix(col,vec3(1.,.72,.25),smoothstep(.75,1.,h));
gl_FragColor=vec4(col*(.35+1.9*h),1.);}` });
}
const ODX_VOLC = { done: false, t: 0,
  init() {
    if (this._i || typeof VOL === 'undefined') return; this._i = 1;
    const upd = VOL.update.bind(VOL);
    VOL.update = dt => { upd(dt); try { this.update(dt) } catch (e) { if (!this.err) { this.err = e; console.warn('[odx volcano]', e) } } };
  },
  build() {
    const g = VOL.g, old = VOL.lake.material; this.lake = odxLavaMat(0); this.flow = odxLavaMat(.35);
    for (const m of g.children) if (m.isMesh && m.material === old) m.material = m === VOL.lake ? this.lake : this.flow;
    old.dispose(); if (VOL.tx) VOL.tx.dispose();
    // smoke: points with their own size, shade and alpha (a soft column that darkens at its core and pales as it rises)
    const N = MOBILE ? 90 : 170, pos = new Float32Array(N * 3), sz = new Float32Array(N), al = new Float32Array(N), sh = new Float32Array(N);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aS', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1)); geo.setAttribute('aC', new THREE.BufferAttribute(sh, 1));
    const pm = (add, base) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
      uniforms: { uScale: { value: innerHeight * .9 } },
      vertexShader: 'attribute float aS,aA,aC;varying float vA,vC;uniform float uScale;void main(){vA=aA;vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(256.,aS*uScale/-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying float vA,vC;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;if(r>1.)discard;float a=vA*pow(1.-r,1.6);' + base + '}' });
    this.smoke = new THREE.Points(geo, pm(false, 'vec3 c=mix(vec3(.13,.12,.115),vec3(.62,.6,.58),vC);gl_FragColor=vec4(c,a);'));
    this.smoke.frustumCulled = false; g.add(this.smoke); this.sm = [];
    for (let i = 0; i < N; i++) this.sm.push({ y: Math.random() * 520, a: Math.random() * 6.28, r: Math.random() * 18, s: .7 + Math.random() * .6 });
    VOL.smoke.visible = false;
    // sparks (additive) and ash
    const M = MOBILE ? 120 : 220, sp = new Float32Array(M * 3), ss = new Float32Array(M), sa = new Float32Array(M), sc = new Float32Array(M);
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(sp, 3)); g2.setAttribute('aS', new THREE.BufferAttribute(ss, 1)); g2.setAttribute('aA', new THREE.BufferAttribute(sa, 1)); g2.setAttribute('aC', new THREE.BufferAttribute(sc, 1));
    this.sparks = new THREE.Points(g2, pm(true, 'vec3 c=mix(vec3(1.,.25,.02),vec3(1.,.85,.45),vC);gl_FragColor=vec4(c*a*2.,a);')); this.sparks.frustumCulled = false; g.add(this.sparks);
    this.sk = []; for (let i = 0; i < M; i++) this.sk.push({ live: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), t: 0, L: 1 });
    const A = MOBILE ? 160 : 300, ap = new Float32Array(A * 3), as = new Float32Array(A).fill(.35), aa = new Float32Array(A).fill(.75), ac = new Float32Array(A).fill(.2);
    const g3 = new THREE.BufferGeometry(); g3.setAttribute('position', new THREE.BufferAttribute(ap, 3)); g3.setAttribute('aS', new THREE.BufferAttribute(as, 1)); g3.setAttribute('aA', new THREE.BufferAttribute(aa, 1)); g3.setAttribute('aC', new THREE.BufferAttribute(ac, 1));
    this.ash = new THREE.Points(g3, pm(false, 'gl_FragColor=vec4(vec3(.16,.15,.15)+vC*.1,a);')); this.ash.frustumCulled = false; scene.add(this.ash);
    this.ap = []; for (let i = 0; i < A; i++) this.ap.push([Math.random(), Math.random(), Math.random()]);
    this.done = true;
  },
  update(dt) {
    if (!VOL.built || !VOL.g || !VOL.g.visible) { if (this.ash) this.ash.visible = false; return }
    if (!this.done) this.build();
    dt = Math.min(dt, .1); this.t += dt; const X = ISLV.x, Z = ISLV.z, y0 = VOL.y0, k = VOL.state === 'erupt' ? 2.6 : VOL.state === 'warn' ? 1.4 : 1;
    for (const m of [this.lake, this.flow]) { m.uniforms.uT.value = this.t; m.uniforms.uHeat.value = .9 + .35 * (k - 1) / 1.6 }
    this.smoke.material.uniforms.uScale.value = this.sparks.material.uniforms.uScale.value = this.ash.material.uniforms.uScale.value = innerHeight * .9;
    // smoke column
    const P = this.smoke.geometry.attributes, N = this.sm.length;
    for (let i = 0; i < N; i++) { const p = this.sm[i]; p.y += dt * (14 + 10 * k) * p.s; const top = 520 * (.65 + .35 * k); if (p.y > top) { p.y = 0; p.a = Math.random() * 6.28; p.r = Math.random() * 18 }
      const u = p.y / top, w = p.y * .2; P.position.setXYZ(i, X + Math.cos(p.a) * (p.r + w * .5) + p.y * .32, y0 + 6 + p.y, Z + Math.sin(p.a) * (p.r + w * .5) - p.y * .1);
      P.aS.setX(i, (34 + 150 * u) * p.s * (VOL.state === 'erupt' ? 1.25 : 1)); P.aA.setX(i, Math.min(1, u * 8) * (1 - u) * (.55 + .2 * k / 2.6)); P.aC.setX(i, Math.min(1, u * 1.4) * (.6 + .4 * Math.sin(p.a * 3) * .5)) }
    P.position.needsUpdate = P.aS.needsUpdate = P.aA.needsUpdate = P.aC.needsUpdate = true;
    // sparks: a steady spray, a fountain while it erupts
    const S = this.sparks.geometry.attributes; let want = dt * (VOL.state === 'erupt' ? 160 : VOL.state === 'warn' ? 40 : 14);
    for (let i = 0; i < this.sk.length; i++) { const s = this.sk[i];
      if (!s.live && want > 0 && Math.random() < want) { want--; s.live = 1; s.t = 0; s.L = 1.5 + Math.random() * 2.5; const a = Math.random() * 6.28, r = Math.random() * 22, v = (VOL.state === 'erupt' ? 28 : 14) + Math.random() * 30;
        s.p.set(X + Math.cos(a) * r, VOL.lavaY + 1, Z + Math.sin(a) * r); s.v.set(Math.cos(a) * v * .35, v, Math.sin(a) * v * .35) }
      if (s.live) { s.t += dt; s.v.y -= 9.8 * dt; s.p.addScaledVector(s.v, dt); if (s.t > s.L) s.live = 0 }
      const u = s.live ? s.t / s.L : 1; S.position.setXYZ(i, s.p.x, s.live ? s.p.y : -9999, s.p.z); S.aS.setX(i, s.live ? 1.6 + 1.2 * (1 - u) : 0); S.aA.setX(i, s.live ? 1 - u * u : 0); S.aC.setX(i, 1 - u) }
    S.position.needsUpdate = S.aS.needsUpdate = S.aA.needsUpdate = S.aC.needsUpdate = true;
    // ash drifting down around you while you are near the mountain
    const d = Math.hypot(player.x - X, player.z - Z), A = this.ash.geometry.attributes.position; this.ash.visible = d < 1400;
    if (this.ash.visible) for (let i = 0; i < this.ap.length; i++) { const q = this.ap[i]; q[1] -= dt * (.02 + q[2] * .02); if (q[1] < 0) { q[1] = 1; q[0] = Math.random(); q[2] = Math.random() }
      const ang = q[0] * 6.283 + this.t * .03, rr = 8 + q[2] * 90; A.setXYZ(i, player.x + Math.cos(ang) * rr + Math.sin(this.t * .7 + i) * 2, player.y - 6 + q[1] * 60, player.z + Math.sin(ang) * rr) }
    A.needsUpdate = true;
  }
};

// ---------------------------------------------------------------------------------------------- nuke: volumetric mushroom + real removal
const ODX_CLOUD_VS = `uniform float uT,uBillow;varying float vN,vLow;varying vec3 vNrm;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb3(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n3(p);p*=2.07;a*=.5;}return v;}
void main(){vec3 n=normalize(position+1e-4);float t=uT*.12;float f=fb3(n*2.6+vec3(0.,-t,t*.5))*.7+fb3(n*6.+vec3(t,-t*2.,0.))*.3;vN=f;
vec3 p=position+normal*(f-.45)*uBillow*2.;vLow=clamp(-position.y+.3,0.,1.);vNrm=normalize(mat3(modelMatrix)*normal);
gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(p,1.);}`;
const ODX_CLOUD_FS = `uniform float uAge,uGlow,uOp;uniform vec3 uSun;varying float vN,vLow;varying vec3 vNrm;
void main(){float sh=smoothstep(.25,.8,vN);vec3 smoke=mix(vec3(.16,.12,.10),vec3(.58,.5,.43),sh);float lit=.42+.58*max(dot(normalize(vNrm),uSun),0.);
float heat=clamp((1.-uAge*1.6)*uGlow+vLow*.5*(1.-uAge),0.,1.);float fl=heat*smoothstep(.35,.75,vN+vLow*.3);
vec3 col=mix(smoke*lit,vec3(1.,.45,.08)*.6,heat*.6)+mix(vec3(1.,.45,.08),vec3(1.,.92,.65),fl)*fl*(1.4+3.*(1.-uAge));gl_FragColor=vec4(col,uOp);}`;
const ODX_NUKE = {
  init() {
    if (this._i || typeof NUKE === 'undefined') return; this._i = 1;
    const build = NUKE.build.bind(NUKE), boom = NUKE.boom.bind(NUKE), upd = NUKE.update.bind(NUKE), clear = NUKE.clear.bind(NUKE);
    NUKE.build = () => { const had = !!NUKE.g; build(); if (!had && NUKE.g) this.build(NUKE.g) };
    NUKE.boom = () => { boom(); this.start() };
    NUKE.update = dt => { upd(dt); if (NUKE.st === 'boom' && this.mats) this.update(Math.min(dt, .1)) };
    NUKE.clear = () => { clear(); this.dispose() };
  },
  build(g) {
    const mk = (geo, glow) => { const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uBillow: { value: .12 }, uAge: { value: 0 }, uGlow: { value: glow }, uOp: { value: 1 }, uSun: { value: new THREE.Vector3(.4, .8, .3).normalize() } },
      vertexShader: ODX_CLOUD_VS, fragmentShader: ODX_CLOUD_FS, transparent: true, fog: false }); this.mats.push(m); const o = new THREE.Mesh(geo, m); o.frustumCulled = false; o.visible = false; o.renderOrder = 2; g.add(o); return o };
    this.mats = [];
    const lo = MOBILE ? .6 : 1;
    this.fire = mk(new THREE.SphereGeometry(1, 32 * lo | 0, 18 * lo | 0), 1.3);
    this.stem = mk(new THREE.CylinderGeometry(.55, 1, 2, 28 * lo | 0, 6, true), .2);
    this.cap = mk(new THREE.SphereGeometry(1, 36 * lo | 0, 18 * lo | 0), .9);
    this.ringM = mk(new THREE.TorusGeometry(1, .5, 14 * lo | 0, 36 * lo | 0), .8); this.ringM.rotation.x = Math.PI / 2;
    this.skirt = mk(new THREE.TorusGeometry(1, .3, 10, 36 * lo | 0), .35); this.skirt.rotation.x = Math.PI / 2;
    // the shock dome
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48 * lo | 0, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uF: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      vertexShader: 'varying vec3 vN,vV;void main(){vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: 'uniform float uF;varying vec3 vN,vV;void main(){float r=pow(1.-abs(dot(vN,vV)),3.);gl_FragColor=vec4(vec3(1.,.85,.65)*(.06+r*.9)*uF,1.);}' }));
    this.dome.visible = false; this.dome.frustumCulled = false; g.add(this.dome);
    // billows around the cap: camera-facing soft puffs (one instanced draw)
    const B = this.nb = MOBILE ? 60 : 110, q = new THREE.PlaneGeometry(1, 1), ib = new THREE.InstancedBufferGeometry();
    ib.index = q.index; ib.setAttribute('position', q.attributes.position); ib.setAttribute('uv', q.attributes.uv);
    this.bP = new Float32Array(B * 4); this.bC = new Float32Array(B * 4);
    ib.setAttribute('iP', new THREE.InstancedBufferAttribute(this.bP, 4)); ib.setAttribute('iC', new THREE.InstancedBufferAttribute(this.bC, 4)); ib.instanceCount = B;
    this.bill = new THREE.Mesh(ib, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
      vertexShader: 'attribute vec4 iP,iC;varying vec2 vU;varying vec4 vC;void main(){vU=uv;vC=iC;vec3 r=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),u=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);vec3 p=iP.xyz+(r*position.x+u*position.y)*iP.w;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
      fragmentShader: 'varying vec2 vU;varying vec4 vC;void main(){float d=length(vU-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vC.rgb,vC.a*pow(1.-d,1.5));}' }));
    this.bill.frustumCulled = false; this.bill.visible = false; this.bill.renderOrder = 3; g.add(this.bill);
    this.bs = []; for (let i = 0; i < B; i++) this.bs.push({ u: Math.random() * 6.28, v: Math.random() * 1.2 - .2, s: .5 + Math.random() * .6, ph: Math.random() * 6.28 });
  },
  start() {
    if (!this.mats) return; this.t = 0; this.cut = false;
    for (const o of [this.fire, this.stem, this.cap, this.ringM, this.skirt, this.dome, this.bill]) o.visible = true;
    if (NUKE.vid) NUKE.vid.visible = false;          // the flat footage billboard is not used any more
    for (const o of [NUKE.stem, NUKE.cap, NUKE.skirt]) if (o) o.visible = false;
  },
  update(dt) {
    this.t = NUKE.t; const t = this.t, k0 = NUKE.sc, gx = NUKE.gx, gy = NUKE.gy, gz = NUKE.gz, R = NUKE.R;
    const age = Math.min(1, t / 28), life = t > 50 * k0 ? Math.max(0, 1 - (t - 50 * k0) / Math.max(3, 25 * k0)) : 1;
    for (const m of this.mats) { m.uniforms.uT.value = t; m.uniforms.uAge.value = age; m.uniforms.uOp.value = life }
    if (typeof sunL !== 'undefined' && sunL) { const s = this.mats[0].uniforms.uSun.value; s.copy(sunL.position).sub(sunL.target.position).normalize() }
    const fb = 130 * k0 * (1 - Math.exp(-t * 1.6)), H = 360 * k0 * (1 - Math.exp(-t / 9)) + t * 2 * k0, capR = (60 + 170 * (1 - Math.exp(-t / 10))) * k0;
    this.fire.visible = t < 9; this.fire.scale.setScalar(Math.max(.01, fb * (1 - Math.min(1, Math.max(0, (t - 4) / 5))))); this.fire.position.set(gx, gy + fb * .6 + t * 8 * k0, gz);
    this.stem.scale.set((26 + t * .7) * k0, Math.max(1, H * .5), (26 + t * .7) * k0); this.stem.position.set(gx, gy + H * .5, gz);
    this.cap.scale.set(capR, capR * .55, capR); this.cap.position.set(gx, gy + H + capR * .18, gz);
    this.ringM.scale.set(capR * 1.02, capR * 1.02, capR * .75); this.ringM.position.set(gx, gy + H - capR * .08, gz);
    const sk = Math.min(R * 1.4, t * 70 * k0); this.skirt.scale.set(sk, sk, 12 * k0 + sk * .02); this.skirt.position.set(gx, gy + 5, gz);
    this.skirt.visible = t < 16; this.skirt.material.uniforms.uOp.value = Math.max(0, 1 - Math.max(0, t - 6) / 10) * life;
    const wr = 330 * 1.8 * t; this.dome.visible = t < 6.5; this.dome.scale.set(wr, wr * .55, wr); this.dome.position.set(gx, gy, gz); this.dome.material.uniforms.uF.value = Math.max(0, 1 - t / 6.5);
    // billows ride on the cap's surface and drift outwards
    const P = this.bP, C = this.bC; for (let i = 0; i < this.nb; i++) { const b = this.bs[i], a = b.u + t * .03, rr = capR * (1.05 + .1 * Math.sin(t * .4 + b.ph)), vy = b.v;
      P[i * 4] = gx + Math.cos(a) * rr * Math.cos(vy); P[i * 4 + 1] = gy + H + capR * .18 + Math.sin(vy) * capR * .55; P[i * 4 + 2] = gz + Math.sin(a) * rr * Math.cos(vy); P[i * 4 + 3] = capR * .55 * b.s;
      const heat = Math.max(0, 1 - age * 1.6), sh = .35 + .25 * Math.sin(b.ph + t * .2);
      C[i * 4] = sh + .5 * heat; C[i * 4 + 1] = sh * .9 + .2 * heat; C[i * 4 + 2] = sh * .8; C[i * 4 + 3] = .55 * life * Math.min(1, t / 2) }
    this.bill.geometry.attributes.iP.needsUpdate = this.bill.geometry.attributes.iC.needsUpdate = true;
    // once the shock front has passed and the dust hides it: the touched chunks are rebuilt without what the blast destroyed
    if (!this.cut && t > Math.min(R * 1.05, R) / 330 + 1.2) { this.cut = true; this.cutCity(gx, gz, R * .95); NUKE.msg = 1 }
  },
  cutCity(x, z, r) {
    NUKE_CUT.push({ x, z, r });
    // the ground stays burnt and the landmarks (own materials) stay down: a ruin patch that never ends
    try { if (typeof RUIN !== 'undefined' && RUIN.add(x, z, r, 1)) { const q = RUIN.near(x, z, r); if (q) q.life = 1e12 } } catch (e) {}
    // rooftop helipads stood on roofs that are gone: off the list (no landing on thin air) and out of the scene
    if (typeof ROOFPADS !== 'undefined' && ROOFPADS.list) {
      ROOFPADS.list = ROOFPADS.list.filter(p => p.big || Math.hypot(p.x - x, p.z - z) > r);
      if (ROOFPADS.g) for (const m of [...ROOFPADS.g.children]) if (Math.hypot(m.position.x - x, m.position.z - z) < r + 25) { ROOFPADS.g.remove(m); m.geometry.dispose() }
    }
    let n = 0;
    if (typeof chunks !== 'undefined') for (const c of [...chunks.values()]) { const cx = BB[0] + (c.id % NCX + .5) * CH, cz = BB[2] + (Math.floor(c.id / NCX) + .5) * CH;
      if (Math.hypot(cx - x, cz - z) < r + CH * .75) { disposeChunk(c); n++ } }
    if (typeof updateChunks === 'function') try { updateChunks(8) } catch (e) {}
    console.log('[odx] nuke: ' + n + ' chunks rebuilt without the destroyed buildings');
    return n;
  },
  dispose() {
    const g = NUKE.g; if (!g) return;
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose() } });
    if (NUKE.vt) NUKE.vt.dispose(); scene.remove(g); if (NUKE.fl && NUKE.fl.remove) NUKE.fl.remove();
    NUKE.g = null; NUKE.vid = null; NUKE.vt = null; this.mats = null; this.bP = this.bC = null;
  }
};

// ---------------------------------------------------------------------------------------------- co-op: fixed 20 Hz presence
const ODX_NET = { HZ: 20,
  init() { if (this._i || typeof COOP === 'undefined') return; this._i = 1;
    setInterval(() => { try { if (typeof started !== 'undefined' && COOP.online && COOP.online()) COOP.push(false) } catch (e) {} }, 1000 / this.HZ) }
};

// ---------------------------------------------------------------------------------------------- start
addEventListener('load', () => {
  try { PLAYER_GLB.init() } catch (e) { console.warn('[odx players]', e) }
  try { ODX_FAUNA.init() } catch (e) { console.warn('[odx fauna]', e) }
  try { ODX_VOLC.init() } catch (e) { console.warn('[odx volcano]', e) }
  try { ODX_NUKE.init() } catch (e) { console.warn('[odx nuke]', e) }
  try { ODX_NET.init() } catch (e) { console.warn('[odx net]', e) }
  try { ANIM.push(dt => ODX_EAGLES.update(Math.min(dt, .1))) } catch (e) {}
});
