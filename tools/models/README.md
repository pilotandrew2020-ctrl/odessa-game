# tools/models — how the owner's five Sketchfab models were cut down (2026-11-12)

Not part of the game: offline scripts that turned 36 MB of GLBs into ~1.4 MB (`assets/models/trees/*`, `assets/models/props/bench.glb`, `assets/models/booba.glb`).
Licences and what was changed per model: `assets/CREDITS.md`. Needs Node 20+ and, in a scratch folder (NOT in the repo): `npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp playwright`.

```
mkdir -p src work out && cp <originals> src/   # maple_tree.glb spruce.glb snow_trees_pack_lowpoly.glb bench.glb booba_cartoon.glb
SRC=src node mk_maple.mjs      # out/tree_maple_{full,hi,lo}.glb   (hi = 1400 leaf quads, lo = 700; the full one is only for comparison)
SRC=src node mk_spruce.mjs     # out/tree_spruce_{hi,lo}.glb
SRC=src node mk_snow.mjs       # out/tree_snow.glb
python3 -I fixbench.py src/bench.glb work/bench_raw.glb && node fixbench.mjs && node mk_bench.mjs    # out/bench.glb (the upload was truncated, see fixbench.py)
# Booba is skinned: bake.html poses the arms down (T-pose -> arms at the sides) and bakes the skin to static vertices with three r128 (boneTransform);
# serve this folder + lib/ + the original on one origin (bake.html expects lib/ and up/booba_cartoon.glb), then:
node bake.mjs 65 12 work/booba_baked.json && node mk_booba.mjs     # out/booba.glb; also needs tex/booba_2.png (image 2 of the original GLB)
```
Triangle counts, texture sizes and the colour quantisation are the numbers at the top of each `mk_*.mjs` call. Rendering check used: a bare three.js page with `lib/GLTFLoader.js` and Playwright screenshots.
