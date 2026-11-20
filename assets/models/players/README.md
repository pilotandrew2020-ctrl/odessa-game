# Your own player models

- `player_me.glb` — your body (what you see when you play).
- `player_friend.glb` — how your friends look to you in co-op.

1. Put the file(s) here.
2. In `players.json` set `"me": true` and/or `"friend": true`.
3. The bodies are worn on the game's rig, so they need the same 22 bones as the other bodies
   (pelvis, spine_01..03, neck_01, Head, clavicle / upperarm / lowerarm / hand, thigh / calf / foot / ball, `_l` / `_r`).
   `tools/models/mk_char.mjs` rigs a model that way (see how Steve / Walter / Leon were made).
4. GLB under ~2 MB, textures at most 1024 px. Add the author and licence to `assets/CREDITS.md`.
