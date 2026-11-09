Rebuild of assets/venues.json and fill_data.js from OpenStreetMap (ODbL, see assets/CREDITS.md).

1. curl -A "odesa-game" --data-urlencode data@venues.overpass https://overpass-api.de/api/interpreter -o osm_pois.json
2. python mkven.py osm_pois.json ../../assets/venues.json
3. curl -A "odesa-game" --data-urlencode data@areas.overpass https://overpass-api.de/api/interpreter -o areas.json
4. python mkareas.py areas.json areas_out.json   (wrap the result as `const FILL_DATA=...;` in ../../fill_data.js)

mkven.py also holds the hand-added club list (names + coordinates read from Google Maps listings; not bulk-copied).
