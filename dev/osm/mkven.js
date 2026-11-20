// Rebuild of assets/venues.json from OpenStreetMap (ODbL): node mkven.js osm_pois.json ../../assets/venues.json
// osm_pois.json is Overpass "out center tags" JSON (venues.overpass), or the same thing cut out of a Geofabrik-style .pbf extract.
// Unlike the older mkven.py the names stay as they are written on the real signs (Ukrainian / Russian / brand spelling), and
// hairdressers / barbershops / beauty salons ("hair") and bowling alleys ("bowl") are kinds of their own, so the door opens the right room.
const fs = require("fs");
const [SRC, OUT] = process.argv.slice(2);
const LAT0 = 46.387797, LON0 = 30.730548, KX = 76785.61541377888, KZ = 110574;
const BB = [-8600, 6600, -27600, 5400];   // x0 x1 z0 z1

const GAME_RE = /cyber|gaming|game ?zone|game ?club|game-bar|esport|e-sport|playstation|ps ?club|\bvr\b|virtual|кібер|кибер|ігров|игров|гейм|геймер|комп.?ютерн\S* клуб|компьютерн\S* клуб|quest|квест/i;
const HAIR_RE = /барбер|barber|перукар|парикмах|стрижк|hair/i;
const BOWL_RE = /боулінг|боулинг|bowling/i;
const COSM_RE = /brocard|yves rocher|eva\b|єва|ева\b|watsons|prostor|kiehl|occitane|rive gauche|faberlic|oriflame|avon|бомонд|parfum|парфум|парфюм|косметик|cosmetic|makeup|mac\b|sephora|lush|douglas/i;

const map = o => { const m = {}; for (const c in o) for (const k of o[c].split(" ")) if (k) m[k] = c; return m };
const SHOP = map({
  market: "supermarket convenience greengrocer alcohol beverages butcher deli seafood cheese general department_store mall wholesale kiosk farm health_food frozen_food organic nuts spices",
  phone: "mobile_phone electronics computer hifi appliance telecommunication video_games camera photo",
  books: "books stationery newsagent copyshop printing",
  gift: "gift souvenir variety_store party art craft frame antiques second_hand musical_instrument pet pet_grooming tobacco e-cigarette vacuum_cleaner",
  flower: "florist garden_centre",
  hair: "hairdresser beauty",
  beauty: "cosmetics perfumery chemist massage tattoo nutrition_supplements hairdresser_supply",
  optic: "optician hearing_aids",
  jewel: "jewelry watches",
  toys: "toys baby_goods games",
  sweet: "confectionery bakery pastry chocolate",
  cloth: "clothes shoes bag fashion boutique sports outdoor fabric tailor leather fashion_accessories lingerie wedding underwear",
  pharm: "medical_supply",
  ware: "car car_repair car_parts tyres hardware doityourself furniture bed kitchen interior_decoration paint trade motorcycle bicycle houseware lighting curtain carpet flooring tiles doors electrical locksmith",
  cafe: "coffee tea ice_cream",
});
const AMEN = map({
  rest: "restaurant fast_food food_court", cafe: "cafe ice_cream", bar: "bar pub nightclub biergarten", game: "internet_cafe", pharm: "pharmacy", bank: "bank",
  post: "post_office", med: "hospital clinic doctors dentist veterinary sanatorium",
  edu: "school kindergarten university college library language_school music_school research_institute driving_school",
  gym: "public_bath spa", culture: "cinema theatre arts_centre casino community_centre events_venue social_centre planetarium studio",
  fuel: "fuel car_wash", faith: "place_of_worship", gov: "police fire_station townhall courthouse", market: "marketplace", trans: "bus_station ferry_terminal",
});
const LEIS = map({
  bowl: "bowling_alley",
  game: "amusement_arcade adult_gaming_centre escape_game miniature_golf",
  gym: "fitness_centre sports_centre swimming_pool water_park dance sauna sports_hall ice_rink horse_riding stadium",
  park: "park garden dog_park playground pitch beach_resort marina golf_course",
});
const TOUR = map({ hotel: "hotel hostel motel guest_house apartment camp_site", culture: "museum gallery zoo aquarium theme_park", sight: "attraction viewpoint" });
const HIST = new Set(["monument", "memorial", "castle", "fort", "ruins", "building", "manor", "archaeological_site"]);

function classify(t) {
  const nm = (t.name || "") + " " + (t["name:en"] || "");
  if (BOWL_RE.test(nm) && (t.leisure || t.amenity || t.shop)) return "bowl";
  if (t.amenity && AMEN[t.amenity]) { const c = AMEN[t.amenity]; return ["cafe", "rest", "bar"].includes(c) && GAME_RE.test(nm) ? "game" : c }
  if (t.shop) {
    if (GAME_RE.test(nm) && ["computer", "video_games", "electronics", "games", "toys"].includes(t.shop)) return "game";
    if (HAIR_RE.test(nm) && ["beauty", "cosmetics", "hairdresser"].includes(t.shop)) return "hair";
    // shop=beauty is both the salon round the corner and the perfume chains (Brocard, Yves Rocher ...): a brand is a shop, the rest are salons
    if (t.shop === "beauty" && (t.brand || t["brand:wikidata"] || COSM_RE.test(nm))) return "beauty";
    return SHOP[t.shop] || "gift";
  }
  if (t.craft === "hairdresser") return "hair";
  if (t.leisure && LEIS[t.leisure]) { const c = LEIS[t.leisure]; return c === "gym" && GAME_RE.test(nm) ? "game" : c }
  if (t.tourism && TOUR[t.tourism]) return TOUR[t.tourism];
  if (t.railway === "station" || t.railway === "halt") return "trans";
  if (t.historic && HIST.has(t.historic)) return "sight";
  if (GAME_RE.test(nm) && (t.office || t.craft)) return "game";
  return null;
}
// the name painted on the real sign: OSM "name" as it is (brand spelling, Ukrainian or Russian), without emoji and stray quotes
function pickName(t) {
  let n = (t.name || t["name:uk"] || t["name:ru"] || t["name:en"] || "").replace(/\p{Extended_Pictographic}|️|‍/gu, "");
  n = n.replace(/[«»„“”]/g, '"').replace(/\s+/g, " ").trim();
  if (/^".*"$/.test(n)) n = n.slice(1, -1).trim();
  return n;
}

const d = JSON.parse(fs.readFileSync(SRC, "utf8"));
const cats = [], rows = [], seen = new Map(), skipped = {};
const skip = k => skipped[k] = (skipped[k] || 0) + 1;
const add = (c, x, z, name) => { if (!cats.includes(c)) cats.push(c); rows.push([cats.indexOf(c), Math.round(x * 10) / 10, Math.round(z * 10) / 10, name]) };
for (const e of d.elements) {
  const t = e.tags || {}, c = classify(t);
  if (!c) { skip("nocat"); continue }
  const lat = e.type === "node" ? e.lat : e.center && e.center.lat, lon = e.type === "node" ? e.lon : e.center && e.center.lon;
  if (lat == null) continue;
  const x = (lon - LON0) * KX, z = -(lat - LAT0) * KZ;
  if (!(BB[0] < x && x < BB[1] && BB[2] < z && z < BB[3])) { skip("outside"); continue }
  let name = pickName(t);
  if (!name) { skip("noname"); continue }
  if (/поліції|полиции|дільничн|участков|офіцер/i.test(name)) { skip("police-officer"); continue }
  if (name.length > 36) { name = name.slice(0, 36); if (name.includes(" ")) name = name.slice(0, name.lastIndexOf(" ")) }
  const key = name.toLowerCase() + "|" + c, prev = seen.get(key) || [];
  if (prev.some(([px, pz]) => Math.hypot(x - px, z - pz) < 30)) { skip("dup"); continue }
  prev.push([x, z]); seen.set(key, prev);
  add(c, x, z, name);
}
// a handful of entertainment places OSM does not have (gaming clubs, VR, billiards, bowling): names + coordinates read from Google Maps listings
const EXTRA = [
  ["game", "CYBERION", 46.4085326, 30.734307], ["game", "CYBERION", 46.4162522, 30.7226327], ["game", "CYBERION", 46.4402435, 30.709398], ["game", "CYBERION", 46.4840988, 30.7416327],
  ["game", "SkiLL ESport Club", 46.4820538, 30.736757], ["game", "PlayStation Club", 46.4794805, 30.7379489], ["game", "Zigraymo Game Zone", 46.4793525, 30.7464104],
  ["game", "PS Joystick", 46.4874365, 30.7326076], ["game", "Game-Bar Plays", 46.4792035, 30.7418959],
  ["game", "VR Pandora", 46.4835309, 30.7440214], ["game", "VR GO", 46.4741067, 30.7236596], ["game", "Svit VR", 46.4707306, 30.7371965], ["game", "VRATA VR", 46.4711862, 30.7421384],
  ["game", "Persona Billiards", 46.4537784, 30.7436388], ["game", "Billiard House", 46.4680468, 30.7262341], ["game", "Stil Billiards", 46.4780692, 30.7278397], ["game", "Arena Billiards", 46.4330219, 30.759988],
  ["bowl", "Sfera Bowling", 46.4696469, 30.7155931], ["game", "Na Komitetskiy Entertainment", 46.4692766, 30.7150252],
  ["bar", "Ibiza Beach Club", 46.4281721, 30.7667897],
];
for (const [c, nm, lat, lon] of EXTRA) {
  const x = (lon - LON0) * KX, z = -(lat - LAT0) * KZ;
  if (BB[0] < x && x < BB[1] && BB[2] < z && z < BB[3]) add(c, x, z, nm);
}
rows.sort((a, b) => Math.floor(a[2] / 200) - Math.floor(b[2] / 200) || Math.floor(a[1] / 200) - Math.floor(b[1] / 200));
fs.writeFileSync(OUT, JSON.stringify({ cats, v: rows }));
const cnt = {}; for (const r of rows) cnt[cats[r[0]]] = (cnt[cats[r[0]]] || 0) + 1;
console.log("kept", rows.length, "skipped", JSON.stringify(skipped));
console.log(JSON.stringify(Object.entries(cnt).sort((a, b) => b[1] - a[1])));
