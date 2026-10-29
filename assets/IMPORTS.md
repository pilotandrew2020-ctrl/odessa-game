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
| `models/apache.glb` | already in the project | unknown | helicopter in `index.html` |

Loading goes through `MDL.put(parent, name, {x,y,z,ry,h|w})` (`models.js`): the holder group exists at once, the mesh is attached when the file arrives.
