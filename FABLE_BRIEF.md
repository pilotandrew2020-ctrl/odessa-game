# FABLE_BRIEF.md — the big task (written 2026-11-14 for a long, autonomous session)

You are continuing "My Odesa": a browser 3D open-world game (three.js r128, classic scripts, no bundler). The owner plays on an **iPad (Safari)**; production = branch `main` (Vercel `odessa_chick`), every merge deploys.
Read first: `AGENTS.md`, `CLAUDE.md` (graphify rules, ponytail rules), `NIGHT_WORK_PLAN.md` (a log of every round: what exists, what was NOT verified), `tests/README.md` (the headless tests), `assets/CREDITS.md`.
The owner speaks Russian; report to him in Russian, plainly, with what is verified and what is not. He is frustrated by lags, crashes ("выбивает" = the page reloads / WebGL context lost), bugs and by promises that were not kept. **Do not claim anything you did not verify.**

## How to work (read this twice)
- **Autonomy.** Do not stop to ask the owner questions and do not stop after a phase: take the sensible default, note it in the log and keep going until the budget is gone or every phase is done. When you hit a usage limit, leave the repo clean (everything merged or in an open PR, the log written) so the next session can continue from `NIGHT_WORK_PLAN.md`.
- **Spend the budget in this order:** roughly 25 % phase 1, 20 % phase 2, 45 % phase 3, 10 % phase 4. If phase 1 is not actually better in numbers, do not move on: find the next cause.
- **Evidence over claims.** Every claim in a PR is backed by a test, a measurement (before / after numbers) or a screenshot you looked at. "It should work" is not a result. If a thing could not be checked headless, say so and say what the owner must check on the iPad.
- **Bug hunt method (phase 2), do all of it:** (a) run EVERY test in `tests/` once and list the failures; (b) grep the per-frame code (`loop`, `ANIM` callbacks, `animPlayerBase`, `REAL.tick`, `updateCars`, `updatePeds`, `stepPlayer`, `stepDrive`) for allocations (`new THREE.*`, array / object literals, `.map` / `.filter` / spread in a hot path), per-frame DOM writes, un-disposed geometry / materials / textures; (c) walk and drive a long route with `t_speed.js` / `t_wild.js` style scripts and check the scene-object / texture counts do not grow; (d) try to break every UI (open / close / double tap) and every mode switch (car -> foot -> boat -> plane -> space -> ship -> interior) for stuck state; (e) write a NEW test for each bug you fix.
- **Definition of done for a Phase 3 item:** it is reachable in the game (a place on the map, the Spawn menu or a button, named in the PLACES list), it works end to end in a headless test (`tests/t_<name>.js`) with a screenshot you inspected, it has sound where it makes sense, it costs little on the tablet (state the triangles / draw calls it adds), it does not break the other tests, it is credited / logged. A stub, a placeholder box or a feature that only exists in code is NOT done.
- **Order inside phase 3 (most valuable first):** weapon-swap holster animations, sword, airliner cameras + rooftop landings, volcano, Tiger tank, kamikaze drone, nuclear bomb + building deformation (Dora / tank / nuke share one damage system: build that once), Gorky Park coaster, cruise ship leftovers, Moon realism.
- **Do not break what exists.** Before touching a system, read its test and its section in `NIGHT_WORK_PLAN.md`. Prefer extending (new file, `Object.assign`, a hook in `loop`) over rewriting `index.html`.

## Mission (all of it, in this order, one PR per phase, merged only after its tests pass)
Make the game stable and fast on the iPad first, then fix bugs, then finish the unfinished big list, then raise quality. If the budget runs out, the earlier phases matter more than the later ones.

### Phase 1 — stability and speed (the owner's main pain)
1. Profile the tablet profile (`IPAD=1`): `tests/t_tris.js`, `t_frame.js` (MODE=walk|br), `t_mem.js`, `t_speed.js`, `t_wild.js`. Current numbers (tablet caps): home yard 686k tris main / 507k shadow, city centre 837k / 258k. Target: city centre under ~500k main, shadow under ~150k, no frame hitch above 40 ms in a 60 s drive. The city centre is mostly chunk geometry (buildings): merge, LOD, instancing, drop hidden faces, cap by distance. Measure before / after.
2. Memory: GPU texture memory and geometry on the tablet (`t_mem.js`); find what could trigger a WebGL context loss (the page reloads): large textures kept after use, canvases, geometry not disposed, the space / ship assets (100k-tri liner at the terminal, Earth sphere, shuttle) — load late, dispose on leave, cap resolution.
3. Known flaky / failing tests that are NOT caused by recent work: `t_kit1` (`KIT.vm` is null), `t_hud_rows`, `t_hudm` (stale). Fix the tests or the code.
4. Never reproduced headless, still reported by the owner: Battle Royale kick-out at the start / after the jump, a car kick-out on a sharp turn or stop, lag on High. Look for causes by reading code (allocations per frame, `new` in loops, per-frame DOM writes, shadow redraws, `collide()` cost in `stepDrive` when pressed to walls, ped / car update cost).

### Phase 2 — bugs and animation quality
Hunt bugs with the headless tests and by reading: stuck states (player inside geometry, falls through floors — see `holdSpecial` / `.deck` in `groundAt`), UI that cannot be closed, double input, audio that never stops (`AUD` buses), co-op sync (`t_coop`, `t_coop2`), the creator, the phone, the speaker, the nav marker / route guidance, weapons. Improve animations: walking / running / turning blends (`animPlayerBase`, `animLife`, `REAL.tick`), weapon swap with a holster animation (draw / holster), landing, the finger rig (`hands.js`, `mk_char.mjs`) — fingers already close around held props.

### Phase 3 — the unfinished list from the owner (build each, test each, screenshots)
- **Volcano** (a mountain with a crater, lava, smoke / ash particles, eruptions with falling bombs; place it on the map where it makes sense, e.g. the island).
- **Tiger tank** (drivable: tracks, turret, cannon shells, damage; model by code or a free GLB if one is supplied).
- **Airliner with three camera modes** (cockpit, chase, free / cabin) and **rooftop landings** (a landing zone on a building roof you can fly to and land on); `plane.js`, `planes.js`, `airp.js` exist.
- **Dora / tank / nuke building deformation**: a damage shader on buildings (craters, cracks, collapse of chunks) driven by explosions; keep it cheap on the tablet (vertex displacement in the existing `patchMat`, decals, or swapping a chunk to a ruined variant).
- **Kamikaze drone** (fly it first person, explode on impact), **nuclear bomb** (a drop / launch, flash, shockwave, mushroom cloud, building damage, fade to a wasteland, then recovery; must not crash the tablet).
- **Sword** (melee: swing animation, hit detection, blocking) and **weapon-swap holster animations**.
- **Gorky Park roller coaster** (`gorky.js`, `lunapark.js`, `rides.js` exist): a real ride on a track with a cart, lifts, drops, loops; the player rides it.
- **Cruise ship leftovers** (`ship.js`, `assets/models/ship/`): riding the water slides, cabins / interior rooms (the model is a shell: build rooms where the deck grid has space), a helm to steer the second ship by hand, a gangway, passengers, ship sounds, night lights. Walkable grid: add small steps and railings (`tools/models/ship/deckmap.py` uses only big surfaces).
- **Space** (`space.js`, `spaceint.js`): more realistic Moon surface (the Moon sphere is the owner's RenderX model; the walkable patch is procedural), space suit for the astronaut, sound polish, co-op.
- Licences: the owner-supplied ISS, Fighter 38 and Cruise ship files carry no author / licence; keep `assets/CREDITS.md` honest.

### Phase 4 — quality
Realism where it is cheap (lighting, materials, sound), UI polish (the HUD is "black squares" with an aqua accent: `theme.css`), better character animation, nicer water / sky. Always measure the tablet cost.

## Rules (from the repo and from this owner)
- Edit `index.html` (not `graphify_src/`), LF line endings, `node --check` every JS, run the headless tests (`BASE=http://localhost:8765 node tests/harness.js tests/<t>.js`, serve the repo with `python3 -m http.server 8765`), `IPAD=1` for the tablet profile. Run `tools/graphify_refresh.sh` after code changes. Log assets in `assets/CREDITS.md` + `assets/IMPORTS.md`; write each round into `NIGHT_WORK_PLAN.md` (what was done, what was NOT verified).
- Work on a branch, open a PR per phase (or per big item), merge after tests; never push to `main` directly; no force-pushes. Commit trailer: `Co-Authored-By: ...` and the session URL as the harness instructs.
- Software GL measures triangles / draw calls / memory, not GPU milliseconds: say so. Nothing here was ever measured on a real iPad.
- Keep it lean (see the ponytail rule in `CLAUDE.md`), but never drop a feature the owner asked for.
- Existing tests to keep green: `t_final`, `t_br` (IPAD=1), `t_ui`, `t_cars`, `t_cam`, `t_nav`, `t_chars`, `t_space`, `t_ship`, `t_phone` (network errors from YouTube are expected), `t_kit2/4/9`, `t_coop`.
- Pitfalls found before: `renderer.info.autoReset` is off (call `renderer.info.reset()` in your own render loops or skeletons freeze); the game resets `camera.position` every frame; function surfaces in `SPECIAL` only work in `groundAt` when flagged `.hold` / `.deck`; `bakeStatic` merges meshes unless `userData.dyn`; `const` globals are not on `window`; harness frames are slow: wait on state, not on time.

## Final report (Russian, for the owner)
For each item: done / partly / not done, how it was checked, what to test on the iPad, and the numbers before / after for the performance phase. After the last merge tell him to clear Safari site data.
