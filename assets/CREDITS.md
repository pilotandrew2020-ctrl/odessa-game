# Credits

## Video
- `assets/video/film.mp4` — excerpt of **Big Buck Bunny** (c) copyright 2008, Blender Foundation | www.bigbuckbunny.org,
  licensed under Creative Commons Attribution 3.0 (https://creativecommons.org/licenses/by/3.0/). Shown on the screen of the Odesa cinema.
  The clip was cut and re-encoded (H.264, lower resolution) to keep the game small.

## 3D models
- `assets/models/props/ArmChair_01.glb`, `Television_01.glb`, `russian_food_cans_01.glb`, `hanging_picture_frame_02.glb`, `ClassicNightstand_01.glb`, `wooden_display_shelves_01.glb`, `cassette_player.glb`, `brass_vase_03.glb`, `vintage_wooden_drawer_01.glb`, `coffee_table_round_01.glb`, `side_table_01.glb`, `Sofa_01.glb`, `modern_ceiling_lamp_01.glb`, `WoodenTable_01.glb`, `painted_wooden_nightstand.glb`, `wall_clock.glb` — from **Poly Haven** (https://polyhaven.com/models), licensed **CC0** (public domain).
  Used for the armchairs in the flats, the 80s CRT television in the Soviet flat, the Soviet tins in its kitchen the framed painting on the lounge wall the bedside table by the sofa-bed the cube shelf in the modern flat the cassette recorder by the Soviet TV the brass vase on the dinner table the chest of drawers by the south wall the round coffee table in the modern flat and the side table between the Soviet armchairs.
- `assets/models/avatar/Man.glb` — realistic character body (skinned mesh and skeleton) from **Universal Base Characters** by **Quaternius** (https://quaternius.com / itch.io), licensed **CC0**; clothes, shoes, hair and textures were rebuilt and baked in Blender for this game. Used by `real.js`; the old procedural body stays available as the "Classic" body type in the character creator.
- `assets/models/apache.glb` — helicopter model that was already in the project when the asset programme started; source and licence not recorded.

- `sfx.js` — three interface sounds (a whoosh, a "tching" ping, a tick) cut from a recording supplied by the project owner (`videoplayback.m4b`), re-encoded to 22 kHz mono WAV and embedded as base64; no separate audio files.

Everything else in the game (buildings, cars, characters, interiors) is procedural geometry generated in code, with no model files.

- `textures/bark_platanus.jpg` — "Bark Platanus", Poly Haven (polyhaven.com/a/bark_platanus), CC0 public domain; tree bark.

- `assets/models/props/backpack.glb` — "Backpack" by **Quaternius** (Poly Pizza, https://poly.pizza/m/vF7TuXCPDH), **CC0**; adapted in Blender (straps removed, smoothed, rescaled).
- `assets/audio/engine_sport.mp3`, `engine_muffler.mp3` — engine recordings supplied by the project owner.
- `assets/music/snow/*.mp3` — "Jingle Bells", "Joy to the World", "We Wish You a Merry Christmas" (2020), arranged and performed by **Starlifter and Roots in Blue, US Air Force Band of Mid-America**; public domain (work of the US government), via Wikimedia Commons.
- `assets/music/fog/gymnopedie-no-3.mp3` — "Gymnopedie No. 3" by Erik Satie, performed by **Kevin MacLeod** (incompetech.com), licensed under **Creative Commons Attribution 3.0** (https://creativecommons.org/licenses/by/3.0/), via Wikimedia Commons.
- `assets/venues.json` — ~6600 shop / cafe / bank / school / clinic / hotel names and positions for Odesa from **OpenStreetMap** (© OpenStreetMap contributors, **ODbL**, https://www.openstreetmap.org/copyright), fetched via the Overpass API 2026-10-30 and reduced to [category, x, z, name]; the roads and buildings of the map are OSM as well. A handful of gaming / VR / billiard clubs OSM lacks were added by hand (names and coordinates read off public Google Maps listings, no Google imagery or text copied).
- `fill_data.js` — outlines of 29 cemeteries and ~200 parks of Odesa from **OpenStreetMap** (© OpenStreetMap contributors, **ODbL**), converted to game metres; `fill.js` fills them with graves, benches and flower beds.
- `assets/models/props/bed_double.glb`, `wardrobe.glb` — own work, built with the Blender script `dev/blender/bedkit.py`; released as **CC0**.
- `assets/models/props/sofa.glb`, `armchair.glb`, `chair.glb`, `table.glb` — own work, built with the Blender script `dev/blender/homekit.py`; released as **CC0**.
- `assets/models/props/kit_base.glb`, `kit_sink.glb`, `kit_stove.glb`, `kit_wall.glb`, `kit_hood.glb`, `toilet.glb`, `tub.glb`, `vanity.glb` — own work, built with the Blender script `dev/blender/wetkit.py`; released as **CC0**.
- `assets/models/props/bistro_set.glb`, `bar_counter.glb`, `back_bar.glb`, `bar_stool.glb`, `high_table.glb`, `pool_table.glb`, `wine_rack.glb`, `pc_station.glb`, `drink_fridge.glb`, `treadmill.glb`, `bench_press.glb`, `dumbbell_rack.glb`, `yoga_mat.glb`, `clothes_rail.glb`, `wall_shelf.glb`, `mannequin.glb`, `shop_counter.glb`, `fitting_room.glb` — own work, built with the Blender script `dev/blender/venkit.py`; released as **CC0**.
