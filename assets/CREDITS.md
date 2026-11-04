# Credits

## Video
- `assets/video/film.mp4` — excerpt of **Big Buck Bunny** (c) copyright 2008, Blender Foundation | www.bigbuckbunny.org,
  licensed under Creative Commons Attribution 3.0 (https://creativecommons.org/licenses/by/3.0/). Shown on the screen of the Odesa cinema.
  The clip was cut and re-encoded (H.264, lower resolution) to keep the game small.

## 3D models
- `assets/models/props/ArmChair_01.glb`, `Television_01.glb`, `russian_food_cans_01.glb`, `hanging_picture_frame_02.glb`, `ClassicNightstand_01.glb`, `wooden_display_shelves_01.glb`, `cassette_player.glb`, `brass_vase_03.glb`, `vintage_wooden_drawer_01.glb`, `coffee_table_round_01.glb`, `side_table_01.glb`, `Sofa_01.glb`, `modern_ceiling_lamp_01.glb`, `WoodenTable_01.glb`, `painted_wooden_nightstand.glb`, `wall_clock.glb` — from **Poly Haven** (https://polyhaven.com/models), licensed **CC0** (public domain).
  Used for the armchairs in the flats, the 80s CRT television in the Soviet flat, the Soviet tins in its kitchen the framed painting on the lounge wall the bedside table by the sofa-bed the cube shelf in the modern flat the cassette recorder by the Soviet TV the brass vase on the dinner table the chest of drawers by the south wall the round coffee table in the modern flat and the side table between the Soviet armchairs.
- `assets/models/avatar/Man.glb` — realistic character body (skinned mesh and skeleton) from **Universal Base Characters** by **Quaternius** (https://quaternius.com / itch.io), licensed **CC0**; clothes, shoes, hair and textures were rebuilt and baked in Blender for this game. Used by `real.js`; the old procedural body stays available as the "Classic" body type in the character creator.
- `assets/models/cricri.glb` — **Colomban Cri-Cri** twin-engine light aircraft (the "light plane"). Supplied by the project owner as an FBX model with textures (archive `twin-engine-airplane-colomban-cri-cri.zip`). The archive does not name the author or the licence; on 2026-11-03 the project owner stated that they have permission to use this model in the game. The licence terms themselves are NOT recorded: if they require an author credit (e.g. CC BY), add it here. Converted for the game with three.js r128 (FBXLoader + GLTFExporter): units/axes fixed, duplicate glass shells removed, vertices welded, parts split with their own pivots (propellers, wheels, ailerons, elevator), textures reduced to 1024 px (exterior) and 512 px (interior) JPEG, scaled 1.5x. No other change to the design.

- `sfx.js` — three interface sounds (a whoosh, a "tching" ping, a tick) cut from a recording supplied by the project owner (`videoplayback.m4b`), re-encoded to 22 kHz mono WAV and embedded as base64; no separate audio files.

Everything else in the game (buildings, cars, characters, interiors) is procedural geometry generated in code, with no model files.

- `textures/bark_platanus.jpg` — "Bark Platanus", Poly Haven (polyhaven.com/a/bark_platanus), CC0 public domain; tree bark.

- The yacht, Jungle Island (terrain, vegetation, animals), train interiors and timetable boards, aircraft (airliner, fighter), Odesa Airport and the companion character are procedural geometry written for this game; no third-party model files.

## Icons & mini-games
- `icons/apple-touch-icon.png`, `icons/icon-192.png`, `icons/icon-512.png` — original procedural SVG/canvas art (stylized golden sun over sea waves) created in code.
- Mini-games in `games/` (`2048.html`, `snake.html`, `memory.html`, `gull.html`, `quiz.html`) — 100% original procedural canvas and DOM code written for My Odesa; no external assets or copyrighted characters.
