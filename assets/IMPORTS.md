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
| `models/props/backpack.glb` | Quaternius via Poly Pizza (https://poly.pizza/m/vF7TuXCPDH, "Backpack") | CC0 | avatar backpack in `creator.js` `CHP.back`: strap pads removed, re-oriented, smooth-shaded and rescaled in Blender (75 KB, materials renamed `pk_main`/`pk_trim`/`pk_metal`); the shoulder straps are built in code from points measured on the body |
| `models/props/bed_double.glb`, `models/props/wardrobe.glb` | own work (Blender script `dev/blender/bedkit.py`) | CC0 | `houses.js` `K.bed` / `K.wardrobe` — every flat and island house (padded headboard, mattress, draped duvet, pillows, throw; panelled two-door wardrobe modules); materials `tint_*` are recoloured per style through `MDL.put {tints}`; no textures, 217 KB / 68 KB |
| `models/props/sofa.glb`, `armchair.glb`, `chair.glb`, `table.glb` | own work (Blender script `dev/blender/homekit.py`) | CC0 | `houses.js` `K.sofa` (when the style has no Poly Haven sofa), `K.chair`, `K.table` — all flats and island houses; `tint_*` materials recoloured per style, no textures, 72–107 KB / 41 KB / 31 KB |
| `models/props/kit_base.glb`, `kit_sink.glb`, `kit_stove.glb`, `kit_wall.glb`, `kit_hood.glb`, `toilet.glb`, `tub.glb`, `vanity.glb` | own work (Blender script `dev/blender/wetkit.py`) | CC0 | `houses.js` `K.kitchen` (base / sink with swan-neck faucet / hob+oven / wall cabinets / hood), `K.toilet`, `K.tub` (recessed), `K.vanity` (basin, faucet, mirror) in every flat and island house; kitchen modules are 1 m wide and stretched with `sc`; `tint_cab` / `tint_wood` recoloured per style, no textures, 12–88 KB each |
| `models/props/bistro_set.glb`, `bar_counter.glb`, `back_bar.glb`, `bar_stool.glb`, `high_table.glb`, `pool_table.glb`, `wine_rack.glb`, `pc_station.glb`, `drink_fridge.glb`, `treadmill.glb`, `bench_press.glb`, `dumbbell_rack.glb`, `yoga_mat.glb`, `clothes_rail.glb`, `wall_shelf.glb`, `mannequin.glb`, `shop_counter.glb`, `fitting_room.glb` | own work (Blender script `dev/blender/venkit.py`) | CC0 | `ven.js` `venInteriors()` — gaming club, restaurant, bar, gym and clothes-shop interiors (idx 80–84); origin = middle of the footprint, front +Z, placed with `MDL.put {keep:1,bake:1}`; `tint_*` recoloured per room, `glow_*` materials are emissive and recoloured per PC station; objects joined per material; 5–80 KB each |
| `audio/engine_sport.mp3`, `audio/engine_muffler.mp3` | supplied by the project owner ("sports-car-rev-engine", "sports-car-muffler") | owner's own files | `engine.js` looped engine sounds (Lamborghini/sport cars and the Zhiguli family) |
| `music/snow/jingle-bells.mp3`, `joy-to-the-world.mp3`, `we-wish-you-a-merry-christmas.mp3` | Wikimedia Commons, US Air Force Band of Mid-America "Starlifter and Roots in Blue" (2020) | public domain (US government work, traditional tunes) | `wmusic.js` plays them while the Snow weather is on |
| `music/fog/gymnopedie-no-3.mp3` | Wikimedia Commons, Kevin MacLeod (incompetech.com), Satie "Gymnopedie No. 3" | CC BY 3.0 | `wmusic.js` fallback for the Fog weather when the player has not dropped own tracks into `assets/music/fog/` |
| `models/apache.glb` | already in the project | unknown | helicopter in `index.html` |
| `textures/bark_platanus.jpg` | Poly Haven "Bark Platanus" (1k diffuse, https://polyhaven.com/a/bark_platanus) | CC0 | tree trunk/branch texture (`MATS.bark` in `index.html`, loaded after start, lightened on a canvas) |

Loading goes through `MDL.put(parent, name, {x,y,z,ry,h|w})` (`models.js`): the holder group exists at once, the mesh is attached when the file arrives.
| `audio/keys_bunch.mp3`, `audio/keys_jingle.mp3`, `audio/keys_items.mp3` | the owner's own recordings (zvuk-svjazki-kljuchej, zvuk-zvona-kljuchej, zvuki-predmetov-klyuchi) | owner-supplied | key-in-the-lock act (`KEYSND` in acts.js): key out, in, bolt, latch |
