# My Odesa — instructions for any AI coding agent

(Claude Code reads `CLAUDE.md`; every other tool should read this file. The two agree. `.claude/` is Claude-specific, ignore it.)

## What this is
A browser 3D game (Odesa city, an island with houses, a jungle island, yachts, planes, helicopters, a submarine, interiors you can walk into, co-op with friends). three.js **r128** with classic `<script>` files: ~60 `*.js` files plus one huge inline script in `index.html` (the core: main loop, `stepPlayer`, `PORTAL` interiors, camera, HUD). **There is no build step and no package manager**: the files are served as they are. Top-level `const`/`function` names are global across scripts.

## Run it
```
python3 -m http.server 8765      # then open http://localhost:8765/index.html
```

## Where it lives and who plays it
- The only copy that matters is the Vercel project **`odessa_chick`** (https://odessachick.vercel.app). Production = branch `main`; every push to another branch gets its own preview URL, so a change can be tried on the owner's iPad before it is merged.
- The owner plays on an **iPad (Safari)** and chats in **Russian**. Keep memory and draw calls low (the code has a `MOBILE` profile with caps; keep textures small, keep new meshes instanced or batched). After a deploy the owner has to clear the site data in Safari.

## How to work here
1. Read `NIGHT_WORK_PLAN.md` (the log of everything done, with what was verified and what was NOT) and `CLAUDE.md`.
2. Work on a branch, never push straight to `main`. Open a pull request; the owner (or you, after verifying) merges it.
3. Edit with exact-string replacements and keep **LF** line endings. Check each changed `*.js` with `node --check file.js`. The inline script of `index.html` is checked by loading the page (`tests/`).
4. Test in a real browser: `tests/README.md` (Playwright, headless, with screenshots). Run `tests/t_final.js` first. Do not call something done because the code looks right; look at the screenshot.
5. Report honestly in Russian: what you verified, what you did not, what is still broken. The owner values that over a long list.

## Rules of the house
- No copyrighted characters, logos or likenesses (the owner asked for some TV characters once; they were left out on purpose). Assets must have a licence you can name: record it in `assets/CREDITS.md` (CC0 / CC-BY with the author).
- Models: GLB, under ~1–2 MB each, textures at most 1024 px (the loader shrinks to 512 px on phones).
- Changes that touch co-op (the presence packet, `PeerSpeaker`, `PeerPlane`, `COOP`) need the co-op tests (`tests/t_coop*.js`); newer features (kitchen, diving, fishing, coins) are **not** synced to friends yet.

## Map of the code (not complete)
`index.html` core · `houses.js` `flats.js` `modern.js` `soviet.js` interiors · `kitchen.js` hands-on kitchen (first-person hands, menus) · `tv.js` TV programmes · `swim.js` + `deep.js` swimming, diving, sea floor · `jobs.js` fishing and coins · `plane.js` `airp.js` aircraft and airport · `vehicles.js` cars, bicycle, submarine · `acts.js` `hands.js` `pose.js` body and hands · `hudmenu.js` top bar · `isle.js` jungle island · `br*.js` Battle Royale.

## Known gaps
The Potemkin-stairs stall and the iPad crashes/freezes were never reproduced in the sandbox (safety nets were added, not proven fixes). Battle Royale is the heaviest mode on a phone. Nothing was run on a real iPad by the previous agent.
