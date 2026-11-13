// The phone (phone.js, 2026-11-12): slides up, Music (saved links, seek bar in seconds from YouTube IFrame messages, seek / pause / next commands go to the speaker embed), calls (ring, answer, timer, recents,
// the Taxi brings the car), Snake (moves, eats, dies), English only. YouTube itself is not reachable from the test: the embed's messages are simulated. PHONESHOT=1 saves screenshots (tests/out/phone_*.png).
exports.opts = { w: 900, h: 600, warn: false };
exports.run = async (page, h) => {
  const assert = require('assert');
  await h.boot(); await h.start();
  const ev = (f, a) => page.evaluate(f, a);
  await h.noRender();
  const shot = async n => { if (process.env.PHONESHOT) await h.shot('phone_' + n, 2500) };
  await ev(() => { localStorage.removeItem('odessa_phone_lib'); PHONE.lib = []; PHONE.cur = -1; PHONE.toggle() }); await h.wait(900);
  assert(await ev(() => document.getElementById('phn').classList.contains('show')), 'the phone did not slide up');
  assert(await ev(() => PHONE.open), 'PHONE.open');
  await shot('home');
  const txt = await ev(() => document.getElementById('phn').innerText); assert(!/[А-Яа-яІіЇїЄє]/.test(txt), 'non-English text on the phone: ' + txt.slice(0, 80));
  // ---- music
  await ev(() => { window.__cmds = []; const o = SPK.mediaCommand.bind(SPK); SPK.mediaCommand = (f, a) => { window.__cmds.push([f, a]); o(f, a) } });
  await ev(() => { PHONE.go('music'); document.getElementById('phnUrl').value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; PHONE.act('addlink') });
  await ev(() => { PHONE.save('https://youtu.be/9bZkp7q19f0'); PHONE.save('https://www.youtube.com/watch?v=dQw4w9WgXcQ') });   // saving the same link twice keeps one entry
  assert.strictEqual(await ev(() => PHONE.lib.length), 2, 'two different links must be two songs');
  assert.deepStrictEqual(await ev(() => JSON.parse(localStorage.getItem('odessa_phone_lib')).length), 2, 'the library is not persisted');
  await ev(() => PHONE.act('play', '0')); await h.wait(500);
  assert(await ev(() => !!SPK.media && SPK.media.kind === 'youtube'), 'the speaker did not get the link');
  await ev(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.youtube.com', data: JSON.stringify({ event: 'infoDelivery', info: { currentTime: 42.3, duration: 215, playerState: 1 } }) })));
  const np = await ev(() => ({ pos: PHONE.pos, dur: PHONE.dur, seek: document.getElementById('phnSeek').value, max: document.getElementById('phnSeek').max, t: document.getElementById('phnPos').textContent, d: document.getElementById('phnDur').textContent }));
  console.log('now playing', JSON.stringify(np));
  assert(np.pos > 42 && np.dur === 215 && np.seek === '42' && np.max === '215' && np.t === '0:42' && np.d === '3:35', 'the seek bar does not follow the player');
  await shot('now_playing');
  await ev(() => PHONE.seek(100)); assert.strictEqual(await ev(() => SPK.mediaOffset), 100, 'seek did not move the shared offset');
  assert(await ev(() => window.__cmds.some(c => c[0] === 'seekTo' && c[1][0] === 100)), 'no seekTo command reached the embed');
  await ev(() => PHONE.act('fwd10')); assert(await ev(() => window.__cmds.some(c => c[0] === 'seekTo' && c[1][0] === 110)), '+10 s');
  await ev(() => PHONE.act('pp')); assert(await ev(() => PHONE.paused && !SPK.playing && window.__cmds.some(c => c[0] === 'pauseVideo')), 'pause');
  await ev(() => PHONE.act('pp')); assert(await ev(() => !PHONE.paused && window.__cmds.some(c => c[0] === 'playVideo')), 'resume');
  await ev(() => PHONE.act('next')); await h.wait(400); assert.strictEqual(await ev(() => PHONE.cur), 1, 'next did not go to the second song');
  // a link pasted into the speaker panel is saved to the library by itself
  await ev(() => SPK.playLink('https://www.youtube.com/watch?v=3JZ_D3ELwOQ')); assert.strictEqual(await ev(() => PHONE.lib.length), 3, 'a speaker link was not saved');
  // the song ended: the next one starts
  await ev(() => { PHONE.cur = 0; PHONE._ended = 0; window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.youtube.com', data: JSON.stringify({ event: 'infoDelivery', info: { playerState: 0 } }) })) }); await h.wait(300);
  assert(await ev(() => PHONE.cur !== 0), 'the next song did not start when the first one ended');
  // ---- calls
  await ev(() => PHONE.go('phone')); await shot('keypad');
  await ev(() => { PHONE.dial = ''; for (const k of '1234') PHONE.act('key', k) }); assert.strictEqual(await ev(() => PHONE.dial), '1234');
  await ev(() => PHONE.startCall(PHONE.CONTACTS.find(c => c.n === 'Taxi'))); assert(await ev(() => PHONE.screen === 'calling' && PHONE.call && !PHONE.call.live), 'calling');
  await shot('calling');
  await ev(() => { clearInterval(PHONE._ring); PHONE.answer() }); await h.wait(2300);
  assert(await ev(() => PHONE.call.live && PHONE.call.sec >= 1), 'the call did not connect / count');
  assert(await ev(() => { const g = EXT.veh.find(q => q.kind === 'gtr'); return !!g && Math.hypot(g.x - player.x, g.z - player.z) < 40 }), 'the Taxi did not bring the car');
  await ev(() => PHONE.endCall()); assert.strictEqual(await ev(() => PHONE.recents.length), 1, 'recents'); assert(await ev(() => PHONE.screen === 'phone' && !PHONE.call));
  // ---- snake
  await ev(() => PHONE.go('snake')); assert(await ev(() => !!PHONE.snake), 'snake did not start');
  const sn = await ev(() => { const s = PHONE.snake; const h0 = s.body[0].slice(); s.step(); const h1 = s.body[0].slice(); PHONE.snakeDir(0, 1); s.step(); s.food = [s.body[0][0], s.body[0][1] + 1]; s.step(); return { moved: h1[0] - h0[0], turned: s.body[0][1] > h1[1], score: s.score } });
  console.log('snake', JSON.stringify(sn)); assert(sn.moved === 1 && sn.turned && sn.score === 1, 'snake does not move / turn / eat');
  await ev(() => { PHONE.snakeDir(-1, 0); const s = PHONE.snake; for (let i = 0; i < 30 && !s.over; i++) s.step() }); assert(await ev(() => PHONE.snake.over), 'snake never died');
  await shot('snake');
  await ev(() => PHONE.go('news')); await ev(() => PHONE.go('clock')); await ev(() => PHONE.go('bank'));
  await ev(() => PHONE.toggle()); await h.wait(700); assert(await ev(() => !document.getElementById('phn').classList.contains('show') && !PHONE.open), 'the phone did not go away');
};
