Rebuild of assets/venues.json and fill_data.js from OpenStreetMap (ODbL, see assets/CREDITS.md).

1. curl -A "odesa-game" --data-urlencode data@venues.overpass https://overpass-api.de/api/interpreter -o osm_pois.json
   (or, when Overpass is overloaded, cut the same places out of a .pbf extract: my-odesa-3d/tools/city/pbf_pois.js odessa_oblast.osm.pbf -> osm_pois.json)
2. node mkven.js osm_pois.json ../../assets/venues.json
   (keeps the names as written on the real signs; kinds include "hair" = barbershops / hair salons and "bowl" = bowling, see vint.js)
3. curl -A "odesa-game" --data-urlencode data@areas.overpass https://overpass-api.de/api/interpreter -o areas.json
4. python mkareas.py areas.json areas_out.json   (wrap the result as `const FILL_DATA=...;` in ../../fill_data.js)

mkven.js (and the older mkven.py, which turned the names into English/Latin) also holds the hand-added club list
(names + coordinates read from Google Maps listings; not bulk-copied).
