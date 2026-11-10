// t_fixbatch.js — the 2026-11-09 user-request batch: HUD tiles, mic/phone tiles, big map,
// moto, 500 km/h bike+sub, free look, magistral, garage summon, fire from a vehicle.
exports.opts = { w: 1100, h: 700 };
exports.run = async (page, h) => {
  const errs=[]; page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,300)) });
  await h.boot(); const ev=(f,a)=>page.evaluate(f,a);
  await h.start(); await h.noRender(); await h.wait(2500);

  // 1. HUD: left stack buttons are 48px square tiles; Modes present; BR/HS NOT in the stack
  const hud = await ev(() => {
    const st=document.getElementById('hudmStack'); if(!st) return null;
    const ids=[...st.querySelectorAll('button')].map(b=>b.id);
    const cs=getComputedStyle(st.querySelector('button'));
    return { ids, w:cs.width, h:cs.height, radius:cs.borderRadius, hasModes:ids.includes('bModes'),
      quick:[...document.querySelectorAll('#quickRow button')].map(b=>({id:b.id,vis:b.style.display!=='none'})),
      mini:{w:document.getElementById('mini').style.width||getComputedStyle(document.getElementById('mini')).width} };
  });
  console.log('HUD', JSON.stringify(hud));
  if (!hud || !hud.hasModes || hud.ids.includes('bBR') || hud.ids.includes('bHS')) throw new Error('HUD stack wrong: '+JSON.stringify(hud.ids));

  // 2. quick row: map/chat/bag/mic/phone all visible; mic+phone tiles wired to the real buttons
  const qr = await ev(() => {
    const row=document.querySelectorAll('#quickRow button');
    const mic=document.getElementById('qrMic'), ph=document.getElementById('qrPhone');
    return { n:row.length, mic:!!mic, phone:!!ph, micVis:mic&&getComputedStyle(mic).display!=='none',
      phoneVis:ph&&getComputedStyle(ph).display!=='none',
      realPhoneHidden:(()=>{const b=document.getElementById('bPhone');return b&&b.classList.contains('qrMirror')})(),
      mapBtn:document.getElementById('bMap')?'map-real-exists':'NO-MAP-BTN' };
  });
  console.log('QUICKROW', JSON.stringify(qr));
  if (qr.n < 5 || !qr.mic || !qr.phone || !qr.micVis || !qr.phoneVis || !qr.realPhoneHidden) throw new Error('quick row broken');

  // 3. phone tile opens the phone
  const phoneOpen = await ev(async () => { const t=document.getElementById('qrPhone'); t.click(); await new Promise(r=>setTimeout(r,300));
    const open=PHONE.open && document.getElementById('gtPhone').classList.contains('show');
    t.click(); await new Promise(r=>setTimeout(r,200)); return open; });
  console.log('PHONE-TILE-OPEN', phoneOpen);
  if (!phoneOpen) throw new Error('phone tile does not open the phone');

  // 4. magistral exists and is drivable: teleport onto it, ground is the deck, flat
  const mg = await ev(() => {
    if(!EXT.magistral) return null;
    const m=EXT.magistral, cx=(m.x0+m.x1)/2, cz=(m.z0+m.z1)/2;
    teleportRaw(cx,cz,Math.atan2(m.x1-m.x0,m.z1-m.z0));
    const g=groundAt(cx,cz,SL+5);
    return { len:Math.round(m.len), ground:Math.round(g*10)/10, deckNearSeaLevel:Math.abs(g-(SL+2.2))<3 };
  });
  console.log('MAGISTRAL', JSON.stringify(mg));
  if (!mg || !mg.deckNearSeaLevel) throw new Error('magistral ground wrong');

  // 5. moto exists in EXT.veh and tops 500 km/h
  const moto = await ev(() => {
    const v=EXT.veh.find(v=>v.kind==='moto'); if(!v) return null;
    return { spec:v.spec.max, kmh:Math.round(v.spec.max*3.6), parked:Math.round(Math.hypot(v.x-player.x,v.z-player.z)) };
  });
  console.log('MOTO', JSON.stringify(moto));
  if (!moto || moto.kmh < 495) throw new Error('moto missing or too slow');

  // 6. bike + sub speed 500 km/h
  const sp = await ev(() => ({ bike:Math.round(LV_SPECS.bike.max*3.6), sub:Math.round(LV_SPECS.sub.max*3.6) }));
  console.log('SPEEDS', JSON.stringify(sp));
  if (sp.bike<495 || sp.sub<495) throw new Error('speeds not 500');

  // 7. summon a bike to the player and board it via the interaction (the "can't get in" bug)
  const board = await ev(async () => {
    const v=EXT.veh.find(v=>v.kind==='bike'); if(!v) return null;
    teleportRaw(player.x,player.z,0); EXT.summon('bike'); await new Promise(r=>setTimeout(r,300));
    const it=INTERACT.find(it=>it.cond&&it.cond()&&typeof it.label==='function'&&it.label().includes('bicycle'));
    if(!it) return { err:'no interact' };
    it.fn(); await new Promise(r=>setTimeout(r,300));
    return { on:!!EXT.cur&&EXT.cur.kind==='bike', label:it.label() };
  });
  console.log('BOARD-BIKE', JSON.stringify(board));
  if (!board || !board.on) throw new Error('cannot board the bike');

  // 8. fire while on the bike: GUN.canFire() with the bike under you
  const fire = await ev(() => {
    if (typeof GUN==='undefined'||!GUN.armed) GUN.setArmed&&GUN.setArmed(true);
    return { armed:GUN.armed, canFire:GUN.canFire() };
  });
  console.log('FIRE-ON-BIKE', JSON.stringify(fire));
  if (!fire.canFire) throw new Error('cannot fire from a vehicle');

  // 9. sub free look: stepCamera must NOT drag the yaw hard while the sub drives
  const freelook = await ev(async () => {
    const v=EXT.veh.find(v=>v.kind==='sub'); if(!v) return {err:'no sub'};
    EXT.exit&&EXT.cur&&EXT.exit();
    teleportRaw(EXT.magistral? (EXT.magistral.x0+500):(v.x+5), EXT.magistral? EXT.magistral.z0 : v.z, 0);
    v.x=player.x+4; v.z=player.z; v.yaw=2.5; v.sync();
    EXT.enter(v); await new Promise(r=>setTimeout(r,200));
    cam.yaw=v.yaw+2.2; cam.init=false;   // player looks 2.2 rad away from the heading
    EXT.stepCamera&&EXT.stepCamera(0.016);
    const after=cam.yaw;
    return { before:2.2, dragged:Math.abs(after-(v.yaw+2.2))>1.2 ? 'DRAGGED':'FREE' };
  });
  console.log('SUB-FREELOOK', JSON.stringify(freelook));
  if (!freelook || freelook.dragged==='DRAGGED') throw new Error('sub camera still drags the view');

  await h.shot('fixbatch_hud');
  console.log('--- console errors ('+errs.length+') ---'); errs.forEach(e=>console.log('  ', e));
};
