# Headless tests for My Odesa

Real-browser checks (Playwright + Chromium, software WebGL). No test framework: each `t_*.js` is a script that boots the game, drives it through the console API and prints what it saw (plus screenshots in `tests/out/`, git-ignored).

## Run
```
python3 -m http.server 8765 &                     # the game is static files, no build step  (no Python: `node tests/serve.js 8765`)
npm i playwright && npx playwright install chromium   # once (the Claude cloud image already has both)
BASE=http://localhost:8765 node tests/harness.js tests/t_final.js
```
- `node tests/run_all.js [-j 2] [IPAD=1] [t_final t_ui ...]` runs many tests (no names = all of them), one line each, logs in `tests/out/log/`. `node tests/check_inline.js` syntax-checks the inline scripts of `index.html` (run it after every edit: a typo there only shows when the page loads).
- `IPAD=1` emulates an iPad (touch, MacIntel) so the mobile memory caps apply. `SHOTS=/some/dir` changes the screenshot folder.
- A run ends with `--- console errors (N) ---`. N should be 0; the one known exception is `setPointerCapture ... No active pointer` in `t_hudm` (a synthetic pointer event in the test, not a game bug).
- The headless browser is slow and frames stall for seconds, so tests poll state (`until(...)`) instead of sleeping. After a teleport wait for `curAct` (the interaction prompt) to update before pressing E (`doAction()`).

## What is here
| script | checks |
|---|---|
| `t_final` | boots, teleports to the main places, menu and buttons (run it first) |
| `t_hudm` | Modes / Menu top bar |
| `t_coop`, `t_coop2`, `t_heli_peer` | co-op with fake friends: cars, swimmer, plane, helicopter |
| `t_audio` | positional Web Audio engines, remote vehicle voice, and same-track speaker restart sync |
| `t_voice` | provider URL parsing, synchronized link state, microphone UI, and mocked WebRTC offer/answer/ICE signaling |
| `t_swim2`, `t_water`, `t_land_light`, `t_light` | swimming, light plane (water landing, take-off), boarding |
| `t_stairs`, `t_cabin`, `t_bomb` | aircraft stairs, airliner cabin and cockpit, helicopter bomb |
| `t_kit1`, `t_kit2`, `t_kit4`, `t_kit6`, `t_kit8`, `t_kit9` | hands-on kitchen: fridge, kettle to tea, hand washing (house, bathroom, Soviet flat), omelette, dishes, sleep |
| `t_tv`, `t_svtv` | TV film and news (island house, Soviet flat) |
| `t_dive`, `t_sub`, `t_jobs`, `t_island`, `t_interiors`, `t_jump` | diving and the sea floor, submarine depth / seabed clearance / swim-out hatch, fishing and coins, the big island, all interiors, head bump |
| `t_pwa` | PWA manifest, original icons (180, 192, 512), viewport-fit & iPad standalone meta tags |
| `t_spray` | Jet ski & boat water spray/foam particle cap (180 mobile / 450 desktop) and emissions |
| `t_jetrace` | "Jet Ski Rider" race mode: buoy gates, combo multiplier, ramps, air jump, nitro boost, exit/retry |
| `t_hub` | Games hub (`games.html`) and 5 mini-games (`2048`, `snake`, `memory`, `gull`, `quiz`) |
| `t_perf` | Render performance benchmark across 4 camera spots (city street, beach, island, flat) |
| `t_airport_stream` | Airport staged load, resource/collision cleanup on exit, and duplicate-free re-entry |
| `t_booba`, `t_nolik` | Booba / Nolik as body types (creator chip, 22 bones move, no hat or glasses, bicycle, back to Realistic) |
| `t_cars` | Porsche 911 Turbo, Porsche 918 Spyder, Aston Martin DB9: GLB loads, 4 wheel pivots, real size, driver seat, drive / steer, Garage; `CARSHOT=1` saves screenshots of the player seated |
| `t_chars` | the character bodies (Steve, MrBeast, Halo, Leon, Ghost, Walter, Booba, Nolik): chips, 22 bones, no classic body while a file loads, legs swing, 15 finger bones per hand that close with a grip, the can at the wrist, foot-skating metric at 1.4 m/s (`OLDGAIT=1`: with the human leg length); `CHARSHOT=1` screenshots |
| `t_cam` | camera zoom: first-person wheel / pinch changes the field of view; in a car the chase distance follows the zoom, not the speed |
| `t_phone` | the phone: slide-up, Music (saved links, seek bar from simulated YouTube messages, seek / pause / next), calls (ring, answer, timer, recents, Taxi), Snake, English only; `PHONESHOT=1` screenshots |
| `t_nav` | the 3D navigation marker: the map's Navigate button (no teleport), beam + HUD pill with distance and arrow, arrival clears it; `NAVSHOT=1` screenshots |
| `t_potemkin` | walks up and down the Potemkin Stairs at three lateral offsets and reports the longest stretch without progress (`SECS` per run) |
| `t_frame` | per-stage JS time per frame (`MODE=walk\|br`, `IPAD=1`): wraps `ANIM` stages, `updateCars`, `updatePeds`, `TREES.*`; prints the heaviest by total ms per second |
| `t_wild` | bad driving (sharp turns, hard stops, pressing into walls) in the old car and a garage vehicle; reports the worst frame and the collide cost |
| `t_buzz` | audio spectrum probe on `AUD.master` (steady tonal peaks = a buzz), with every layer muted in turn |
| `t_music` | `BGM` (Odesa FM) rendered offline: level / NaN check; `AUD.engineCar` idle / 50 / 200 km/h, six gears, harmonics, silent when inactive; ducking while the speaker plays; the running-water loop |
| `t_ui` | the iPad HUD: no yellow controls, the empty strip under the map is hidden, the phone closes by dragging its home bar up, the speaker player (title, play, seek, saved links); screenshots `ui_hud / ui_phone / ui_speaker` |
| `t_space` | the space programme end to end: the islet beyond the liner, the stack on the pad, the automatic ascent (boosters and tank separate), the cut to the ISS, the fighter at 25,000 m/s (the Moon ~4 min away), the landing assist, a landing, the walk and a jump (low gravity), Station, Earth; `SPACESHOT=1` screenshots |
| `t_speed` | fast driving (`KIND=gtr\|p918\|moto`, `START=<place id>`, `Q=`, `SECS=`; use `IPAD=1`): chunk streaming slices, live chunks, scene objects / textures growth (a leak shows as growth in steady state) |
| `t_tris`, `t_mem` | what a frame costs: triangles of the main and the shadow pass per category (map-wide meshes are never culled; it waits until the chunk streamer is idle; `TOP=<n>` lists the heaviest object groups), and the estimated texture / geometry memory of the scene graph with the biggest items (`RENDER=<s>` draws real frames first; `t_gpu` measures what was really uploaded) |
| `t_ref` | reference screenshots with a frozen clock for before / after checks of performance changes (`SHOTS=<dir>`, compare with `python3 -I tools/imgdiff.py <dirA> <dirB>`) |
| `t_camp` | the beach camp of Jungle Island (camp.js): level ground, cost, walking into a tent through its door (the canvas stops you), sleeping in a tent bed, the bench for two, a camp chair, eating the grilled chicken bite by bite until it is gone and comes back, the fire at night; screenshots `camp_*.png` |
| `t_br` | Battle Royale smoke test on the tablet caps (bots, match state, work per frame) |
| `t_gpu` | what the GPU REALLY holds: the WebGL calls are counted (textures, buffers, render buffers) on a tour home -> centre -> airport -> ship -> island -> launch pad -> space -> home, looking around at every stop; plus every 2D canvas alive (CPU pixels) by the line that made it. Fails when a repeated trip keeps growing GPU textures. `IPAD=1`, `TOP=<rows>`, `OWNERS=1` (group by owner), `STOPS=a,b`, `NOSPACE=1`, `TTL=<s>` |
| `t_lod` | the "draw / keep only what is near" rules: parked GLB cars drop their model when far and get it back, text plates hidden beyond ~70 x their size (never inside an interior), instanced landmark props measured from their instances, chunk detail mesh near only, 1-9 chunks cast shadows, lazy label textures hold no canvas (`IPAD=1`) |
| `t_dom` | per-frame DOM writes (MutationObserver) while standing, walking, driving and in Battle Royale, by element; fails above `LIMIT` (3) mutations per frame |
| `t_volcano` | the volcano of Jungle Island: cone + crater, lava, eruption bombs hurt, lava carries you away (`VOLSHOT=1` screenshots) |
| `t_drone` | the kamikaze drone + `BLAST.at`: launch, fly, dive explodes with a scorch mark, put back at the start, a blast next to you hurts (`DRONESHOT=1` screenshots) |
| `t_nuke` | the nuclear bomb: falls, flash, shock front collapses chunk buildings inside 300 m (colliders + shadows off in the zone), recovery (`NUKESHOT=1` screenshots; runs in the city centre) |
| `t_sword` | weapon swap holsters the old weapon first, katana BLOCK cuts damage to a fifth (`SWORDSHOT=1`) |
| `t_roof` | rooftop landing pads for the light plane + the plane camera cycle (chase / cockpit / cabin / orbit) (`ROOFSHOT=1`) |
| `t_moon` | the Moon: landing patch on approach, touchdown over real ground, suit, walk, jet pack (`MOONSHOT=1`) |
| `t_blastfx` | realistic explosions (light, fireball, dust wall) + the nuke flattening the home yard (`BLASTFXSHOT=1`) |
| `t_shipx` | the cruise ship's bridge/helm, water slide, bar, shop, cabins (`SHIPXSHOT=1`) |
| `t_coaster` | the Gorky Park mega coaster ride (`COASTERSHOT=1`) |
| `t_skydeck` | the sky deck runway for the airliner (`SKYSHOT=1`) |
| `t_chigurh` | Anton Chigurh body type + silenced shotgun (GLB), captive bolt, air tank (`CHIGSHOT=1`) |
| `t_tank` | the Tiger tank (`tank.js`): spawn, board, drive, turn, shell lands, the sea stops it, exit (`TANKSHOT=1` screenshots) |

Some tests freeze a timed step with `KIT.freeze = true` to take a screenshot at an exact moment, and look at screenshots by eye: open the PNGs in `tests/out/`.
