const assert = require('assert');
exports.opts = { w: 480, h: 850, warn: false };

exports.run = async (page, h) => {
  await h.boot();
  await h.start();

  const places = await h.ev(() => PLACES.map(p => p.id));
  for (const id of ['shop_bowling', 'shop_sea_pub', 'shop_river_bar', 'cemetery']) {
    assert(places.includes(id), 'Missing new place: ' + id);
  }

  const oldDist = await h.ev(() => cam.dist);
  await h.ev(() => { cam.dist = .5; cam.init = false });
  await page.click('#bPhone');
  await h.wait(500);
  assert(await h.ev(() => PHONE.open && PHONE.root.visible), 'Phone did not open');
  assert(await h.ev(() => PHONE.news.includes('Battle Royale')), 'Phone news is missing');
  console.log('phone camera relation', JSON.stringify(await h.ev(() => {
    camera.updateWorldMatrix(true, false);PHONE.root.updateWorldMatrix(true, false);
    const p=PHONE.root.getWorldPosition(new THREE.Vector3()),d=camera.getWorldDirection(new THREE.Vector3());
    return {p:p.toArray(),camera:camera.position.toArray(),forward:d.toArray(),local:PHONE.root.position.toArray()}
  })));
  await h.shot('gameplay-phone', 800);
  await page.click('#bPhone');
  await h.ev(d => { cam.dist = d; cam.init = false }, oldDist);

  const fov = await h.ev(async () => {
    const old = cam.dist;
    cam.dist = .5;
    GUN.armed = true;
    GUN.held = true;
    await new Promise(resolve => setTimeout(resolve, 700));
    const aimed = camera.fov;
    const state = [started,GUN.armed,GUN.held,cam.dist,DRIVE.on,RIDE.on,!!EXT.cur,!!MARINE.cur,HELI.on,!!PASS.host,!!PLN.cur];
    GUN.held = false;
    GUN.setArmed(false);
    await new Promise(resolve => setTimeout(resolve, 700));
    const restored = camera.fov;
    cam.dist = old;
    return [aimed, restored, state];
  });
  assert(fov[0] < 55, 'ADS did not zoom in: ' + JSON.stringify(fov));
  assert(fov[1] > 68, 'Camera did not restore its FOV: ' + fov[1]);

  const sync = await h.ev(() => {
    const oldOnline = COOP.online, oldActive = NET.active, oldSend = NET.send;
    let packet = null;
    COOP.online = () => true;
    NET.active = true;
    NET.send = state => { packet = state; return true };
    shHold('teddy bear');
    COOP.push(true);
    const result = packet && packet.hi;
    shHold(null);
    COOP.online = oldOnline;
    NET.active = oldActive;
    NET.send = oldSend;
    return result;
  });
  assert(sync === 'teddy bear', 'Held item was not added to co-op presence');

  const checkout = await h.ev(() => {
    const oldExit = PORTAL.exit;
    let exits = 0;
    PORTAL.exit = () => { exits++ };
    INVENTORY.__test = 1;
    leaveShop();
    const locked = exits === 0;
    delete INVENTORY.__test;
    leaveShop();
    PORTAL.exit = oldExit;
    return locked && exits === 1;
  });
  assert(checkout, 'Unpaid items did not block the shop exit');

  console.log('places', JSON.stringify(places.filter(id => /bowling|pub|bar|cemetery/.test(id))));
  console.log('ads fov', JSON.stringify(fov));
  console.log('held item sync', sync);
  console.log('checkout guard', checkout);
  assert.strictEqual(h.errs.filter(e => e.startsWith('PAGEERR ')).length, 0, 'Page errors: ' + h.errs.join('\n'));
};
