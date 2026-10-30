# NIGHT_WORK_PLAN.md — My Odesa (state written 2026-10-30 00:40 local)

This file lets a fresh session (scheduled night run, no memory of the chat) continue exactly where the last one stopped.
Read it first, then `git log --oneline | head -15`, then the memory files listed at the bottom.

## 0. Project in one paragraph
Browser game "My Odesa": three.js r128, classic `<script>` files + a very large inline `index.html` (CRLF in the working tree, LF in git — edit with the Edit tool or Python `newline=''`, never rewrite line endings). Branch **`odesa-mall-and-vehicles`**, remote `https://github.com/pilotandrew2020-ctrl/odessa-game.git` (GitHub Pages). Working dir: `C:\Users\pilot\Downloads\Odessa-main\Odessa-main\Odessa-main\odessa game`.
Top-level `const` names are global across scripts: a duplicate name kills a whole script. Use a unique prefix per file.

## 1. STANDING RULES (from the user — do not break)
- Push ONLY `odesa-mall-and-vehicles`. No PR, no `main`, no force-push. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Blanket permission for downloads/licences/commits.
- Assets: CC0 only, order Poly Haven → Kenney → Quaternius → Poly Pizza (no Sketchfab, no AI generators). GLBs in `assets/models/...`, log every one in `assets/IMPORTS.md` + `assets/CREDITS.md`. 15 MB cap is lifted but keep lazy loading. Poly Haven pipeline: see memory `odesa-polyhaven-props-pipeline`.
- Do NOT restyle what the user liked: default character (blond, blue eyes, sand shirt, light-blue jeans), the Soviet kitchen, the main-menu look. Add options instead of replacing. NEVER add relief geometry to the procedural face.
- Only the song «Спокойная ночь» (Viktor Tsoi) is "the song"; never quote lyrics in the game or in replies.
- Final reports to the user are in RUSSIAN and honest: say what was verified, what was only reasoned, what was not tested. Never claim done what was not run. Crash fixes for phones are reasoned, not reproduced.
- Run commands that may exceed ~2 min in the background. Push in the background.

## 2. How to run / test (read memory `preview-pane-rendering-quirks`)
- Dev server: preview server "odessa" on port 8765 (`mcp__Claude_Browser__preview_start`, tab id usually `seed`). After `navigate`/reload call `mcp__ccd_view__show_pane preview`, wait 10 s × 2–3 until `$('bStart').textContent==='Play'`.
- Install `window.__errs=[];addEventListener('error',e=>window.__errs.push(e.message+' @'+e.lineno))`. Start: `$('bStart').click()` then after 1.5 s `$('crGo').click()`; wait ~9 s.
- Readable screenshots: `adaptRes.at=performance.now()+1e9;renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight,false)`. Fixed camera: `DBGCAM=[cx,cy,cz,tx,ty,tz]` (set `null` after).
- Reload changed files: `fetch('/index.html?v=8',{cache:'reload'})` (+ the changed js) then `location.reload()`.
- `resize_window` on the game tab is unreliable (reports another innerWidth). For other viewport sizes build a static page from the real CSS + HUD markup (see memory `odesa-hud-buttons`).
- Hot-swapping: global `function` declarations can be re-evaluated with `(0,eval)`, top-level `const` objects cannot — reload the page.
- Freeze an act for screenshots: `ACT.cur.dur=1e9; setInterval(()=>ACT.cur.t=T-.05,8)`.
- Bash heredocs with Python containing many quotes can fail; use the Write tool for scripts. Blender 5.2.3 CLI is under the Steam path (`--background --python script -- mode`); Blender's glTF importer fails on paths containing `[` `]`.

## 3. DONE (verified in the preview unless noted)
- Realistic character (`real.js`, `assets/models/avatar/Man.glb`, Quaternius Universal Base Characters CC0): creator "Body type" Realistic (default) / Classic. Verified: creator, stand, walk, sit, drive pose, holding the can. NOT verified: door/key/fridge acts on the new body, scooter/bike/heli poses, clothes-shop apply, hats/glasses/bag fit (approximate), phone FPS. Commit be0753b.
- In-game HUD restyle (slanted dark/yellow like the main menu; Jump + Garage + Run + "More" list). Commit f953e02. Verified portrait in the game, landscape 667×375 on a static copy. Not verified on a real phone.
- Earlier this week (see memory): walkable stairwell, Snow/Fog, trees, traffic cars, panelki, map rework, door/key acts, road signs, mobile stability measures (unproven), heli fall.

## 4. KNOWN OPEN ISSUES (carry over)
- Console: old cumulative WebGL messages "'{' : unexpected token after conditional expression" (fragment shader, MeshStandardMaterial variants) and a one-off `TypeError … reading 'x'` at `index.html?v=8:6538:88`. Recompiling all 4159 live materials gave NO failures and line 6538 (`tramRailNear(f.x…)`) has no col 88, so both look like stale log entries — but source unknown. If you can, find which onBeforeCompile material produces them (hook `gl.compileShader`, set `needsUpdate` on materials of rarely-built objects: shop interiors, cinema, garage, weather modes Snow/Fog/Rain, night mode, creator).
- Phone crashes (flat/stairwell/map/heli/driving/buttons): mitigated by lowering memory/GPU spikes, NOT reproduced. Needs a real device/iPad test by the user.
- Remaining flat doors not converted to the key act: legacy stair at ~index.html 5149, modern.js door.
- No traffic lights (would need cycling signal logic); beds/chairs/lamps in `houses.js` hsKit are still boxes.

## 5. WORK QUEUE FOR THE NIGHT (user's mega-prompt, ordered by value/risk)
Do them in this order; commit + push (background) after each finished block; keep this file's checkboxes honest.

### A. Physics & collisions audit (root causes, no workarounds)
- [ ] Build a test harness (preview JS) that teleports the player into EVERY interior/portal (shops, mall floors, cinema, flats idx 57–60 + Soviet/khru stairwell floors, houses idx 50–53, sub, garage) and into outdoor spots, then walks N steps in 4 directions and logs: y never below floor, speed > 0 in open space, `PORTAL.cur`/`INDOORS` consistent, camera ceiling sane.
- [ ] Known traps to re-check: new interiors must call `E.floor(x0,x1,z0,z1,surf)` (shops.js `shEnv`), else zero movement ("cactus"); `INDOORS` first-match bug for multi-instance interiors (use `grp.visible&&`); flats sit in the real building (`insideAny` flat branch); `specialGround` in `stepPlayer`.
- [ ] Falling through ground/houses, stuck-in-corner, stair steps, balcony rails, car/NPC collisions, teleport sync, portal exits (every `PORTAL.go` has a matching walk-out trigger).
- [ ] Vehicle physics sanity: car on slopes/kerbs, boat/jet-ski spawn near water, heli landing (player falls from height — done), scooter in interiors blocked.

### B. Flats / residential interiors (HIGHEST PRIORITY of the user)
Files: `soviet.js`, `khru.js`, `kstyle.js`, `flats.js`, `modern.js`, `houses.js` (hsKit), `acts.js`. Props via `MDL.put(parent,name,{x,y,z,ry,h|w})` and `flProp()`.
- [ ] Inventory what each flat style already has per room (living/bedroom/kitchen/bathroom/hall). The Soviet kitchen/lounge are liked — only add, never restyle.
- [ ] Bedrooms: real bed (mattress, pillows, blanket), wardrobe, bedside tables, lamps; living rooms: sofa, armchairs, coffee table, TV + stand, shelves, carpet, curtains, wall pictures; kitchens: cabinets, countertop, sink, stove, fridge, table, chairs; bathrooms: toilet, sink, shower/tub, mirror, tiles. Details: door handles, window sills, switches, radiators, ceiling lights, floor materials.
- [ ] Different layouts per style (modern vs old Ukrainian); furniture must never block doors (check colliders against door positions).
- [ ] Check Poly Haven (CC0) first for beds, wardrobes, chairs, lamps, TV, radiator, toilet etc. Vetted/used props are in `assets/IMPORTS.md`; keep each prop ≤ ~6k tris, diffuse only is fine.

### C. Buildings / facades (Odesa/Ukrainian look)
- [ ] Improve existing facades rather than replacing working systems: window frames/sills, balconies, cornices, entrances, roofs, house numbers, exterior lights, materials. See `bldg.js`, `kstyle.js`, `khru.js`, `soviet.js`.
- [ ] Architectural variety (Odesa courtyards, stalinka, khrushchyovka, panel, new-build); no plain boxes.

### D. Models / street furniture
- [ ] Streetlights, benches, signs, bins, kiosks, pharmacies/supermarket fronts, trees (10 species exist), cars (carx.js). Replace weak placeholders only where a CC0 GLB is clearly better; size budget no longer capped but keep lazy loading.
- [ ] Optimisation: nothing that adds per-frame cost on phones; mobile builds skip proactive shop pre-building.

### E. Leftovers
- [ ] Verify the realistic body in: key/door act, fridge act, scooter/bike/heli, clothes shop apply, hat+glasses+bag, first-person hide; fix fits.
- [ ] Find the source of the old shader console messages (see §4).
- [ ] Convert remaining flat doors to the key act.

## 6. Hand-off protocol for every session
1. `git status`, `git log`, read this file + memory index (`C:\Users\pilot\.claude\projects\C--Users-pilot-Downloads-Odessa-main-Odessa-main-Odessa-main-odessa-game\memory\MEMORY.md`).
2. Work through §5 in order; tick boxes only for things you ran and saw working.
3. Before the session ends: commit + push to `odesa-mall-and-vehicles`, update this file (what is done / what is next), update memory files, write the Russian honest summary.
4. If something cannot be done (e.g. a scheduled task, a download), say so plainly.

## 7. Scheduling state
- Night session (01:35 local = UTC+0 on 2026-10-30): **NOT CREATED, and now moot (the live session continued at 08:00).** `mcp__scheduled-tasks__create_scheduled_task` was refused by the auto-mode permission classifier ("judged dangerous", no reason given). It was not worked around (no hand-written SKILL.md, no Windows Task Scheduler). To enable it the user must either add a permission rule for `mcp__scheduled-tasks__create_scheduled_task` in the Claude Code settings or create the task themselves in the app's Scheduled tasks UI with fire time 2026-10-30 01:35 and a prompt like: "Read NIGHT_WORK_PLAN.md in the Odessa project folder and continue the work queue; follow its standing rules."
- Weekly-limit-reset session: NOT scheduled — the exact reset time is not visible from inside the project. The user must give the time (then create a one-time task ~5 min after it, same prompt).

## 8. PROGRESS LOG (newest last)
- 2026-10-30 08:00 — the scheduled night task was never created (see §7); the user said 'try again' at 08:00, so the work simply continued in the live session.
- Built `dev/audit.js` (preview-only; load with `(0,eval)(await (await fetch('/dev/audit.js',{cache:'reload'})).text())`): `AUDIT.flatmap` (reachability flood fill of the current interior, '#' reached / 'o' free but cut off / '.' blocked), `AUDIT.flats()`, `AUDIT.why(lx,lz)` (what blocks a point), `AUDIT.walk(name,opt)`.
- FOUND + FIXED: (1) cinema had no ground function (`E.floor`) → the player could not take a single step inside (stuck at spawn in all 8 directions). Fixed in cinema.js, verified (walks 11 m, stops at the ticket gate). (2) body radius indoors was .33: a 90 cm doorway left a 24 cm free channel (wall segments are inflated by the radius at both ends) so most flat doors were practically impassable; stepPlayer now uses .22 indoors (`PR`, index.html). (3) panel flat: the hall door to the living room opened onto a sideboard + sofa, the living room was unreachable; re-laid out in flats.js (sideboard to x -3.4, armchair to the SW corner, plant, table/rug/chandelier 0.3 m west). Verified with the flood fill: panel flat reach 23.6 = free 23.6 m².
- Reachability after the fixes (radius .22, from spawn): panelflat 23.6/23.6, mdflat 38.1/38.1, newflat 36.4/36.8, stalinflat 41.5/43.3, house 79.7/79.7 m² (reached / free). Unreached pockets in the stalin flat: two tiny corners SW (x -5.8..-4.4, z 5.7–7.5).
- STILL DOUBTFUL: panel flat hall door 2 (x .85) sits against the bathroom partition (x 1.2) so it is only a ~.2 m channel (works, but is ugly — move the partition to x 1.5 and shift the bathroom props if time allows). Soviet flat (stair → flat in the real building) not audited with the flood fill (its floor function covers 5742 m²; needs a bounding box). All shop/mall interiors passed the 8-direction walk at radius .33 (only the cinema failed).
- NEXT: furniture/door clearance check for every flat style with `AUDIT.flatmap` after each layout edit; then bedrooms/bathrooms/kitchens detail work (§5 B); NPC/vehicle collisions (§5 A).
