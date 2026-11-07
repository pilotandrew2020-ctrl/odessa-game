exports.opts = { w: 720, h: 450 };
exports.run = async (page, h) => {
  await h.boot();
  await h.start();
  await h.noRender();
  const result = await page.evaluate(async () => {
    const links = [
      ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
      ['https://open.spotify.com/track/1234567890123456789012', 'spotify'],
      ['https://soundcloud.com/artist/track', 'soundcloud'],
      ['https://music.yandex.ru/album/42/track/84', 'yandex'],
      ['https://cdn.example.test/song.mp3?token=x', 'audio'],
      ['https://spotify.link/short', 'external'],
      ['https://liner.example.test/mix', 'external']
    ];
    const parsed = links.map(([url, kind]) => SPK.parseLink(url)?.kind === kind);
    const rejectsUnsafe = !SPK.parseLink('http://cdn.example.test/song.mp3') &&
      !SPK.parseLink('https://user:pass@cdn.example.test/song.mp3') &&
      SPK.parseLink('https://example.test/page')?.kind === 'external';
    const b = document.getElementById('bVoice');
    const touchTarget = !!b && b.getBoundingClientRect().height >= 44 && b.getAttribute('aria-pressed') === 'false';
    const old = { active: NET.active, code: NET.code, cid: NET.cid, receive: VOICE.receive,
      send: NET.send, peers: COOP.peers, voicePeers: VOICE.peers, stream: VOICE.stream, enabled: VOICE.enabled,
      online: COOP.online, room: COOP.room };
    let received = null;
    NET.active = true; NET.code = '1234'; NET.cid = 'local-test';
    VOICE.receive = async (from, sig) => { received = { from, sig } };
    const topic = MQ.enc.encode(NET.topic('peer-test'));
    const payload = MQ.enc.encode(JSON.stringify({ sg: { to: 'local-test', k: 'offer', d: 'sdp' } }));
    NET.msg(new Uint8Array([topic.length >> 8, topic.length & 255, ...topic, ...payload]));
    await Promise.resolve();

    class FakePeerConnection {
      constructor(){this.connectionState='new';this.signalingState='stable';this.localDescription=null;this.remoteDescription=null;this.candidates=[]}
      addTransceiver(){return {sender:{track:null,replaceTrack:async track=>{this.track=track}}}}
      async createOffer(){return {type:'offer',sdp:'fake-offer'}}
      async createAnswer(){return {type:'answer',sdp:'fake-answer'}}
      async setLocalDescription(d){this.localDescription=d;this.signalingState=d.type==='offer'?'have-local-offer':'stable'}
      async setRemoteDescription(d){this.remoteDescription=d;this.signalingState=d.type==='offer'?'have-remote-offer':'stable'}
      async addIceCandidate(c){this.candidates.push(c)}
      close(){this.connectionState='closed'}
    }
    const rtc=window.RTCPeerConnection, sent=[];
    window.RTCPeerConnection=FakePeerConnection;
    VOICE.receive=old.receive;NET.send=st=>{sent.push(st);return true};
    VOICE.peers=new Map();VOICE.stream={getAudioTracks:()=>[{enabled:true}]};VOICE.enabled=true;COOP.peers=new Map();
    const outgoing={peer:'n:peer-test',st:{vc:1},voice:null};
    COOP.peers.set(outgoing.peer,outgoing);VOICE.sync();await new Promise(resolve=>setTimeout(resolve,0));
    const offerSent=sent.some(x=>x.sg&&x.sg.k==='offer'&&x.sg.to==='peer-test');
    const incoming={peer:'n:aaa-test',st:{vc:1},voice:null};
    COOP.peers.set(incoming.peer,incoming);
    await VOICE.receive('aaa-test',{to:'local-test',k:'ice',c:{candidate:'candidate:test'}});
    await VOICE.receive('aaa-test',{to:'local-test',k:'offer',d:'fake-remote'});
    const answerSent=sent.some(x=>x.sg&&x.sg.k==='answer'&&x.sg.to==='aaa-test');
    const queuedIceApplied=incoming.voice&&incoming.voice.pc.candidates.length===1;
    const speakerOld={media:SPK.media,owner:SPK.mediaOwner,playing:SPK.playing,t0:SPK.mediaT0,offset:SPK.mediaOffset,stamp:SPK.mediaStamp,owned:SPK.owned,carry:SPK.carry,
      show:SPK.showMedia,push:COOP.push,name:$('spkName').textContent,play:$('spkPlay').textContent,speakerVisible:PLR.speaker.visible,groundVisible:SPK.ground.visible,
      panelHidden:$('spk').hidden,url:$('spkUrl').value,on: $('bSpk').classList.contains('on')};
    let shared=null,localRendered=null,remoteRendered=null;
    SPK.showMedia=(media,t0,offset,autoplay)=>{if(SPK.mediaOwner==='local')localRendered={kind:media.kind,autoplay};else remoteRendered={kind:media.kind,autoplay}};
    COOP.push=()=>{shared=SPK.mediaState()};
    SPK.media=null;SPK.mediaOwner='';SPK.playing=false;SPK.owned=false;
    SPK.playLink('https://youtu.be/dQw4w9WgXcQ');
    const urlShared=!!shared&&shared.u==='https://youtu.be/dQw4w9WgXcQ'&&shared.p===1&&localRendered?.autoplay;
    SPK.mediaOwner='';SPK.media=null;SPK.playing=false;SPK.owned=false;
    const remote={peer:'n:sender',recv:Date.now(),st:{ts:Date.now(),md:{u:'https://youtu.be/dQw4w9WgXcQ',t:Date.now()-1200,o:0,p:1}}};
    SPK.receiveMedia(remote);
    const remoteLoaded=SPK.mediaOwner===remote.peer&&SPK.media.kind==='youtube'&&remoteRendered?.autoplay;
    Object.assign(SPK,{media:speakerOld.media,mediaOwner:speakerOld.owner,playing:speakerOld.playing,mediaT0:speakerOld.t0,mediaOffset:speakerOld.offset,mediaStamp:speakerOld.stamp,
      owned:speakerOld.owned,carry:speakerOld.carry,showMedia:speakerOld.show});COOP.push=speakerOld.push;
    $('spkName').textContent=speakerOld.name;$('spkPlay').textContent=speakerOld.play;PLR.speaker.visible=speakerOld.speakerVisible;SPK.ground.visible=speakerOld.groundVisible;
    $('spk').hidden=speakerOld.panelHidden;$('spkUrl').value=speakerOld.url;$('bSpk').classList.toggle('on',speakerOld.on);
    VOICE.closePeer(outgoing);VOICE.closePeer(incoming);window.RTCPeerConnection=rtc;
    Object.assign(NET,{active:old.active,code:old.code,cid:old.cid,send:old.send});
    Object.assign(VOICE,{receive:old.receive,peers:old.voicePeers,stream:old.stream,enabled:old.enabled});
    COOP.peers=old.peers;COOP.online=old.online;COOP.room=old.room;VOICE.ui();
    if(parsed.some(x=>!x)||!rejectsUnsafe||!touchTarget||!received||received.from!=='peer-test'||received.sig.k!=='offer'||!offerSent||!answerSent||!queuedIceApplied||!urlShared||!remoteLoaded){
      throw new Error(JSON.stringify({parsed,rejectsUnsafe,touchTarget,received,offerSent,answerSent,queuedIceApplied,urlShared,remoteLoaded}));
    }
    return {providers:links.map(x=>x[1]),rejectsUnsafe,touchTarget,signalRoute:received.from,offerSent,answerSent,queuedIceApplied,urlShared,remoteLoaded};
  });
  console.log('voice', JSON.stringify(result));
  await h.shot('voice-radio-ui');
};
