# Chigurh.glb (round 23)
Source: the owner's TRELLIS mesh `tmpuywbsuh2.glb` (one fused mesh: figure + shotgun + gas tank + puddle, no texture, 410k triangles), made from an AI-generated full-body picture (FLUX.1 Kontext from the owner's reference face, pose / props removed).
```
node build_chg.mjs <source.glb> chg_src.glb     # label every triangle by position (label.mjs: skin / hair / jacket / pants / boots / cut), drop gun + tank + puddle + stray pieces, mirror the right hand onto the gun arm, weld + decimate per material (28k triangles, borders locked)
node mk_char.mjs chg.json                       # (tools/models/mk_char.mjs) 22-bone game skeleton, automatic weights by distance to the bones -> Chigurh.glb -> assets/models/avatar/
```
The region rules in `label.mjs` are specific to that one mesh (hand-measured from renders: y-up, faces +z). Needs `@gltf-transform/core`, `@gltf-transform/extensions`, `meshoptimizer`, `sharp` (see ../README.md).
