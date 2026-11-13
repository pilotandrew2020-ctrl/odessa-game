# tools/models — how the owner's five Sketchfab models were cut down (2026-11-12)

Not part of the game: offline scripts that turned 36 MB of GLBs into ~1.5 MB (`assets/models/trees/*`, `assets/models/props/bench.glb`, `assets/models/avatar/Booba.glb`).
Licences and what was changed per model: `assets/CREDITS.md`. Needs Node 20+ and, in a scratch folder (NOT in the repo): `npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp playwright`.

```
mkdir -p src work out && cp <originals> src/   # maple_tree.glb spruce.glb snow_trees_pack_lowpoly.glb bench.glb booba_cartoon.glb
SRC=src node mk_maple.mjs      # out/tree_maple_{full,hi,lo}.glb   (hi = 1400 leaf quads, lo = 700; the full one is only for comparison)
SRC=src node mk_spruce.mjs     # out/tree_spruce_{hi,lo}.glb
SRC=src node mk_snow.mjs       # out/tree_snow.glb
python3 -I fixbench.py src/bench.glb work/bench_raw.glb && node fixbench.mjs && node mk_bench.mjs    # out/bench.glb (the upload was truncated, see fixbench.py)
# Booba is skinned: bake_rig.html poses the arms down, reduces the 204-bone rig to the 22 bones real.js drives (renamed to the Man.glb names) and remaps the skin weights;
# serve this folder + lib/ + the original on one origin (bake_rig.html expects lib/ and up/booba_cartoon.glb), then:
node bake_rig.mjs 72 8 booba_rig.json && node mk_booba_rig.mjs     # out/booba_rig.glb -> assets/models/avatar/Booba.glb; also needs tex/booba_2.png (image 2 of the original GLB)
# Nolik (a 59 MB, 1M-triangle Tripo mesh with no skeleton): rotate it to face +z, weld, decimate to 12k triangles, then rig it by hand-placed joints (nolik_joints.py) and
# surface weights (nolik_weights.py: geodesic distance over the mesh + a rule for the arms, which are fused to the torso), and write the skinned GLB:
SRC=src node nolik_decimate.mjs 12000 && python3 -I nolik_weights.py nolik_12000.json nolik_w.json && SRC=src node mk_nolik_rig.mjs     # out/nolik_rig.glb -> assets/models/avatar/Nolik.glb
```
# Cars (2026-11-12: Porsche 911 Turbo, Porsche 918 Spyder, Aston Martin DB9): mk_car.mjs bakes the node transforms, cuts the four wheels out by a spatial rule (a triangle inside a wheel cylinder
# goes to that wheel, which handles meshes holding both wheels of an axle), re-centres each wheel on its own pivot node (wheel_fl/fr/rl/rr), puts the car on the ground facing +z,
# decimates every material group separately (meshopt, UV seams kept) and shrinks the textures. car_*.json holds the numbers (scale, origin, wheel centres, lamp material renames):
node mk_car.mjs car_p911.json && node mk_car.mjs car_p918.json && node mk_car.mjs car_db9.json     # out/{p911,p918,db9}.glb -> assets/models/vehicles/
# Characters (Steve, MrBeast, Halo, Leon, Ghost): one generic script, one config per model (skinned: regexes of the joints to keep; static: hand-placed joints read from a render with grid.py: a coordinate grid over a render):
node mk_char.mjs char_steve.json && node mk_char.mjs char_mrbeast.json && node mk_char.mjs char_halo.json && node mk_char.mjs char_leon.json && node mk_char.mjs char_ghost.json     # out/<Name>.glb -> assets/models/avatar/
Triangle counts, texture sizes and the colour quantisation are the numbers at the top of each `mk_*.mjs` call. Rendering check used: a bare three.js page with `lib/GLTFLoader.js` and Playwright screenshots.
