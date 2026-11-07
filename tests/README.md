# Headless tests for My Odesa

Real-browser checks (Playwright + Chromium, software WebGL). No test framework: each `t_*.js` is a script that boots the game, drives it through the console API and prints what it saw (plus screenshots in `tests/out/`, git-ignored).

## Run
```
python3 -m http.server 8765 &                     # the game is static files, no build step
npm i playwright && npx playwright install chromium   # once (the Claude cloud image already has both)
BASE=http://localhost:8765 node tests/harness.js tests/t_final.js
```
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

Some tests freeze a timed step with `KIT.freeze = true` to take a screenshot at an exact moment, and look at screenshots by eye: open the PNGs in `tests/out/`.
