exports.opts = { w: 720, h: 450 };
exports.run = async (page, h) => {
  await h.boot();
  await h.start();
  await h.noRender();
  const result = await page.evaluate(() => {
    const voice = AUD.machine('sub');
    voice.update(player.x + 4, SL - 24, player.z, 3, .5, true, 24, .8);
    const spatial = voice.p.panningModel === 'HRTF' && voice.p.distanceModel === 'inverse';
    const peer = { peer: 'n:audio', has: true, x: player.x + 8, y: player.y, z: player.z,
      st: { in: 1, m: 'car', x: player.x + 8, y: player.y, z: player.z, ct: [4, 0], cv: [12, .7] } };
    COOP.peerMachine(peer);
    const remoteEngine = !!peer.machine && peer.machine.kind === 'car';
    const t0 = Date.now() - 1500;
    peer.st = { in: 1, m: 'walk', x: peer.x, y: peer.y, z: peer.z, ts: Date.now(),
      sp: [0, 1, 0, 0, t0] };
    peer.recv = Date.now();
    peer.has = true;
    COOP.peerSpeaker(peer, .016);
    const first = peer.spk && peer.spk.t0 === t0;
    const nextT0 = Date.now() - 3200;
    peer.st = Object.assign({}, peer.st, { sp: [0, 1, 0, 0, nextT0], ts: Date.now() });
    peer.recv = Date.now();
    COOP.peerSpeaker(peer, .016);
    const restartedTrackResynced = peer.spk && peer.spk.t0 === nextT0;
    const oldOnline = COOP.online, oldSend = NET.send, oldActive = NET.active, oldRoom = COOP.room;
    let packet = null, sends = 0;
    COOP.online = () => true;
    COOP.room = null;
    NET.active = true;
    NET.send = st => { packet = st; sends++; return true };
    SPK.owned = false;
    SPK.carry = true;
    SPK.idx = 0;
    SPK.togglePlay();
    const startSentImmediately = !!(packet && Array.isArray(packet.sp) && Number.isFinite(packet.ts) && sends === 1);
    SPK.stop(true, false);
    SPK.owned = false;
    COOP.online = oldOnline;
    COOP.room = oldRoom;
    NET.active = oldActive;
    NET.send = oldSend;
    voice.dispose();
    COOP.drop(peer);
    if (!spatial || !remoteEngine || !first || !restartedTrackResynced || !startSentImmediately) {
      throw new Error(JSON.stringify({ spatial, remoteEngine, first, restartedTrackResynced, startSentImmediately }));
    }
    return { spatial, remoteEngine, first, restartedTrackResynced, startSentImmediately };
  });
  console.log('audio', JSON.stringify(result));
};
