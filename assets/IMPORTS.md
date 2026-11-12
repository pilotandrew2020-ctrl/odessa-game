# Asset imports log

Rules: CC0 sources first (Poly Haven, Kenney, Quaternius, Poly Pizza), at most ~5k triangles per object, textures at most 1024 px,
GLB files under `assets/models/<category>/`, licence lines in `CREDITS.md`.

| File | Source | Licence | Used in |
|---|---|---|---|
| `models/props/ArmChair_01.glb` | Poly Haven | CC0 | `flats.js` `flArm()` (stalin salon, panel living room), `modern.js` living room |
| `models/props/Television_01.glb` | Poly Haven | CC0 | `soviet.js` Soviet flat living room |
| `models/props/russian_food_cans_01.glb` | Poly Haven | CC0 | `soviet.js` Soviet kitchen |
| `models/props/hanging_picture_frame_02.glb` | Poly Haven | CC0 | `soviet.js` lounge wall (3.7k tris, diffuse only, glass pane made see-through) |
| `models/props/ClassicNightstand_01.glb` | Poly Haven | CC0 | `soviet.js` lounge, bedside table at the sofa-bed (2k tris, diffuse only) |
| `models/props/wooden_display_shelves_01.glb` | Poly Haven | CC0 | `modern.js` living room via `flProp()` in `flats.js` (3.2k tris, diffuse only) |
| `models/props/cassette_player.glb` | Poly Haven | CC0 | `soviet.js` lounge, next to the TV (4.8k tris, diffuse only, `s:1.15`; `d:`/`w:`/`h:` mis-measure it because of node transforms) |
| `models/props/brass_vase_03.glb` | Poly Haven | CC0 | `soviet.js` lounge dinner table (2.6k tris, diffuse only, real size ≈8×20 cm) |
| `models/props/vintage_wooden_drawer_01.glb` | Poly Haven | CC0 | `soviet.js` lounge, south wall (5.2k tris, diffuse only) |
| `models/props/coffee_table_round_01.glb` | Poly Haven | CC0 | `modern.js` living room via `flProp()` (4k tris, diffuse only, `s:.7`; replaces the box table) |
| `models/props/side_table_01.glb` | Poly Haven | CC0 | `soviet.js` lounge, between the armchairs (2.8k tris, diffuse only) |
| `models/props/Sofa_01.glb` | Poly Haven | CC0 | modern flat living room via `S.sofaGlb` in `houses.js` K.sofa (4.1k tris, diffuse only; the kit's sit act + collision kept) |
| `models/props/modern_ceiling_lamp_01.glb` | Poly Haven | CC0 | modern flat: two pendant lamps over the living room and hall (5.6k tris) |
| `models/props/WoodenTable_01.glb` | Poly Haven | CC0 | stalin flat salon coffee table via `flProp()` in `flats.js` (952 tris, 204 KB, `s:.7`; replaces the box table) |
| `models/props/painted_wooden_nightstand.glb` | Poly Haven | CC0 | `fdet.js` `FD.stand()` — bedside tables of every `hsKit` bedroom (modern / panel / stalin / new-build flats, island houses via `S.standGlb`); 470 tris, 609 KB, diffuse only, `w:.46`, optional `S.standTint` |
| `models/props/wall_clock.glb` | Poly Haven | CC0 | `fdet.js` `K.clock()` — hall / living-room wall clocks (modern flat, Soviet flat hall); 3.7k tris, 492 KB, diffuse only |
| `models/avatar/Man.glb` | Quaternius (Universal Base Characters, Standard) | CC0 | `real.js` realistic player/NPC body (itch.io pack; rig kept, hair/clothes/shoes rebuilt in Blender, textures baked, 1.8 MB, lazy loaded after the page `load` event) |
| `models/cyclops_subnautica.glb` | Naudaff3D on Sketchfab | CC-BY-4.0 | `vehicles.js` submarine (9.4 MB, 324,781 triangles; loaded on demand) |
| `models/cricri.glb` | supplied by the project owner (FBX + textures, `twin-engine-airplane-colomban-cri-cri.zip`) | not stated in the archive; the owner confirmed on 2026-11-03 that they may use it (terms not recorded) | `planes.js` `PM.loadLight()/buildLight()` — the light plane (`plane.js` kind `light`, spawn menu). 21.9k tris (over the ~5k guideline; one model, spawned on demand), 903 KB, textures 1024/512 px; lazy loaded when the plane is first spawned |
| `textures/bark_platanus.jpg` | Poly Haven "Bark Platanus" (1k diffuse, https://polyhaven.com/a/bark_platanus) | CC0 | tree trunk/branch texture (`MATS.bark` in `index.html`, loaded after start, lightened on a canvas) |
| `models/trees/tree_maple_hi.glb` / `tree_maple_lo.glb` | Sketchfab "Maple Tree" by evolveduk | CC-BY-4.0 | `trees.js` `GLBT`: broadleaf trees within ~90 m (desktop, `hi`: 3.5k tris, 293 KB) / ~60 m (phones and Low quality, `lo`: 1.7k tris, 141 KB); far trees stay procedural; one `InstancedMesh` for trunk + one for leaves |
| `models/trees/tree_spruce_hi.glb` / `tree_spruce_lo.glb` | Sketchfab "Spruce" by evolveduk | CC-BY-4.0 | `trees.js` `GLBT`: conifers (old species slot 4); 1.8k / 0.6k tris, 165 / 66 KB |
| `models/trees/tree_snow.glb` | Sketchfab "Snow Trees Pack LOWPOLY" by EFX | CC-BY-4.0 | `trees.js` `GLBT`, winter only: `snowtree`, `bare`, `deadhero`, `deadwide`, `bush` nodes (card trees, 113 tris in all, 288 KB) |
| `models/props/bench.glb` | Sketchfab "Bench" by Spark | CC-BY-4.0 | `trees.js` `BENCH`: nodes `bench` (1.8k tris) and `bin` (450 tris, alpha-tested); instanced for every bench `propBench2()` makes in a chunk or in the static world (125 KB) |
| `models/avatar/Booba.glb` | Sketchfab "Booba Cartoon" by usmangill | CC-BY-4.0 (the character itself is not) | `real.js` body type "Booba" (22 bones under the Man.glb names, 3.9k tris, 293 KB, loaded when picked) and `trees.js` `BOOBA` (the yard NPC) |
| `models/avatar/Nolik.glb` | Sketchfab "nolik" by KitLover | CC-BY-4.0 (the character itself is not) | `real.js` body type "Nolik" (22 bones under the Man.glb names, 12k tris, 620 KB, loaded when picked; swing limited by `REAL.BOD.nolik.lim`) |

Loading goes through `MDL.put(parent, name, {x,y,z,ry,h|w})` (`models.js`): the holder group exists at once, the mesh is attached when the file arrives.

2026-11-03: NO new model or texture files were added for the yacht, Jungle Island, animals, train interiors, aircraft, airport and companion. They are generated in code (`mb.js` builder + canvas textures). Poly Haven, Kenney, Quaternius, Poly Pizza and Sketchfab were not reachable from the cloud session and Blender was not installed; swap the procedural models for CC0 GLBs later if wanted (log them here).
