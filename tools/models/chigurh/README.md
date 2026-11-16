# Chigurh.glb (round 23)
Source: the owner's TRELLIS mesh `tmpuywbsuh2.glb` (one fused mesh: figure + shotgun + gas tank + puddle, no texture, 410k triangles), made from an AI-generated full-body picture (FLUX.1 Kontext from the owner's reference face, pose / props removed).
```
node build_chg.mjs <source.glb> chg_src.glb     # label every triangle by position (label.mjs: skin / hair / jacket / pants / boots / cut), drop gun + tank + puddle + stray pieces, mirror the right hand onto the gun arm, weld + decimate per material (28k triangles, borders locked)
node mk_char.mjs chg.json                       # (tools/models/mk_char.mjs) 22-bone game skeleton, automatic weights by distance to the bones -> Chigurh.glb -> assets/models/avatar/
```
The region rules in `label.mjs` are specific to that one mesh (hand-measured from renders: y-up, faces +z). Needs `@gltf-transform/core`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp` (see ../README.md).

## v2 (same round, the owner: "the head is a Halloween mask, better head and body")
The TRELLIS head is lumpy, so the head is now Man.glb's (CC0, Quaternius): `build2.mjs` drops everything above the collar, warps the TRELLIS body (slimmer: x x0.74, z x0.85; legs 28% longer), mirrors the hand, and puts Man's head + neck (triangles above y 1.52, |x| < 0.11) and the parted hair on the collar, scaled by K (0.58). `joints2.mjs` writes `chg2.json` (the joints go through the same warp), `node mk_char.mjs chg2.json` rigs it, `cfg.mjs` prints the numbers for `CHIG_FACECFG` (creator.js: where the face lands on the head).
```
K=.58 node build2.mjs trellis_src.glb chg_src2.glb && node joints2.mjs && node mk_char.mjs chg2.json && K=.58 SC=<scale printed by mk_char> node cfg.mjs
```

## v3 (the owner's textured head, round 27)
`head_raw.glb` (the owner's generated textured bust: caricature head, hair, neck, jacket, 96k tris, 2048 px WebP texture; WebP is not read by three r128, so `conv.mjs` turns it into JPEG first). `build3.mjs` takes the triangles above the neck (y >= 0.185), scales them by K (.58) onto the collar of the warped TRELLIS body, decimates them to ~16k with UVs kept, and writes the head as material `chead` (textured). `chg3.json` + `mk_char.mjs` rig it (`chead` texture 1536 px). The game does not project a face any more (`CHIG_LOOK.photo:false`); `real.js` brightens `chead` a little.
```
node conv.mjs && COLLAR=.195 K=.58 NTY=.185 node build3.mjs trellis_src.glb chg_src3.glb && node mk_char.mjs chg3.json    # -> Chigurh3.glb -> assets/models/avatar/Chigurh.glb
```
