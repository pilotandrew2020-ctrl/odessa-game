import json, sys, re, collections, math

SRC, OUT = sys.argv[1], sys.argv[2]
LAT0, LON0, KX, KZ = 46.387797, 30.730548, 76785.61541377888, 110574
BB = (-8600, 6600, -27600, 5400)   # x0 x1 z0 z1

UK = {'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'yu','я':'ya','ъ':'','ы':'y','э':'e','ё':'yo'}
def tr(s):
    out = []
    for i, ch in enumerate(s):
        lo = ch.lower()
        if lo in UK:
            t = UK[lo]
            if ch != lo and t:
                t = t[0].upper() + t[1:]
            out.append(t)
        else:
            out.append(ch)
    return ''.join(out)

WORDS = [
 (r'dytyachyy sadok-yasla|dytyachyy sadok|dytyachyi sadok|dytyachyy sadochok|dytyachyy navchalnyy zaklad', 'Kindergarten'),
 (r'sadok-yasla', 'Kindergarten'), (r'apteka', 'Pharmacy'), (r'produkty', 'Groceries'), (r'mahazyn', 'Shop'),
 (r'khram', 'Church'), (r'tserkva', 'Church'), (r'shkola', 'School'), (r'biblioteka', 'Library'), (r'poliklinika', 'Polyclinic'),
 (r'muzey', 'Museum'), (r'poshta', 'Post'), (r'viddilennya', 'Branch'), (r"zv'yazku", 'Post'), (r'likarnya', 'Hospital'),
 (r'universytet', 'University'), (r'akademiya', 'Academy'), (r'liteyi', 'Lyceum'), (r'litsey', 'Lyceum'), (r'himnaziya', 'Gymnasium'),
 (r'perukarnya', 'Hair salon'), (r'komplekt', 'Complect'), (r'shaurma', 'Shawarma'), (r'kavovyy', 'Coffee'), (r'kavyarnya', 'Coffee house'),
 (r'pizzeriya', 'Pizzeria'), (r'restoran', 'Restaurant'), (r'kafe', 'Cafe'), (r'tsentr', 'Centre'), (r'im\.', 'named after'),
]
def english(s):
    for pat, rep in WORDS:
        s = re.sub(pat, rep, s, flags=re.I)
    return s

def latin(s):
    return not re.search('[Ѐ-ӿ]', s)

def pick_name(t):
    for k in ('name:en', 'int_name', 'name:latin'):
        if t.get(k) and latin(t[k]):
            return t[k].strip()
    n = t.get('name', '').strip()
    if not n:
        return ''
    if latin(n):
        return n
    return english(tr(t.get('name:uk') or n).strip())

GAME_RE = re.compile(r'cyber|gaming|game ?zone|game ?club|game-bar|esport|e-sport|playstation|ps ?club|\bvr\b|virtual|кібер|кибер|ігров|игров|гейм|геймер|комп.?ютерн\w* клуб|компьютерн\w* клуб|quest|квест', re.I)

SHOP = {
 'market': 'supermarket convenience greengrocer alcohol beverages butcher deli seafood cheese general department_store mall wholesale kiosk farm health_food frozen_food organic nuts spices',
 'phone': 'mobile_phone electronics computer hifi appliance telecommunication video_games camera photo',
 'books': 'books stationery newsagent copyshop printing',
 'gift': 'gift souvenir variety_store party art craft frame antiques second_hand musical_instrument pet pet_grooming tobacco e-cigarette vacuum_cleaner',
 'flower': 'florist garden_centre',
 'beauty': 'cosmetics perfumery chemist beauty hairdresser massage tattoo nutrition_supplements hairdresser_supply',
 'optic': 'optician hearing_aids',
 'jewel': 'jewelry watches',
 'toys': 'toys baby_goods games',
 'sweet': 'confectionery bakery pastry chocolate',
 'cloth': 'clothes shoes bag fashion boutique sports outdoor fabric tailor leather fashion_accessories lingerie wedding underwear',
 'pharm': 'medical_supply',
 'ware': 'car car_repair car_parts tyres hardware doityourself furniture bed kitchen interior_decoration paint trade motorcycle bicycle houseware lighting curtain carpet flooring tiles doors electrical locksmith',
 'cafe': 'coffee tea ice_cream',
}
SHOPMAP = {}
for c, s in SHOP.items():
    for k in s.split():
        SHOPMAP[k] = c

AMEN = {
 'rest': 'restaurant fast_food food_court',
 'cafe': 'cafe ice_cream',
 'bar': 'bar pub nightclub biergarten',
 'game': 'internet_cafe',
 'pharm': 'pharmacy',
 'bank': 'bank',
 'post': 'post_office',
 'med': 'hospital clinic doctors dentist veterinary sanatorium',
 'edu': 'school kindergarten university college library language_school music_school research_institute driving_school',
 'hotel': '',
 'gym': 'public_bath spa',
 'culture': 'cinema theatre arts_centre casino community_centre events_venue social_centre planetarium studio',
 'fuel': 'fuel car_wash',
 'faith': 'place_of_worship',
 'gov': 'police fire_station townhall courthouse',
 'market': 'marketplace',
 'trans': 'bus_station ferry_terminal',
}
AMENMAP = {}
for c, s in AMEN.items():
    for k in s.split():
        AMENMAP[k] = c

LEIS = {
 'game': 'amusement_arcade adult_gaming_centre bowling_alley escape_game miniature_golf',
 'gym': 'fitness_centre sports_centre swimming_pool water_park dance sauna sports_hall ice_rink horse_riding stadium',
 'park': 'park garden dog_park playground pitch beach_resort marina golf_course',
}
LEISMAP = {}
for c, s in LEIS.items():
    for k in s.split():
        LEISMAP[k] = c

TOUR = {
 'hotel': 'hotel hostel motel guest_house apartment camp_site',
 'culture': 'museum gallery zoo aquarium theme_park',
 'sight': 'attraction viewpoint',
}
TOURMAP = {}
for c, s in TOUR.items():
    for k in s.split():
        TOURMAP[k] = c

def classify(t):
    nm = t.get('name', '') + ' ' + t.get('name:en', '')
    if 'amenity' in t and t['amenity'] in AMENMAP:
        c = AMENMAP[t['amenity']]
        if c in ('cafe', 'rest', 'bar') and GAME_RE.search(nm):
            return 'game'
        return c
    if 'shop' in t:
        if GAME_RE.search(nm) and t['shop'] in ('computer', 'video_games', 'electronics', 'games', 'toys'):
            return 'game'
        return SHOPMAP.get(t['shop'], 'gift')
    if 'leisure' in t and t['leisure'] in LEISMAP:
        c = LEISMAP[t['leisure']]
        if c == 'gym' and GAME_RE.search(nm):
            return 'game'
        return c
    if 'tourism' in t and t['tourism'] in TOURMAP:
        return TOURMAP[t['tourism']]
    if t.get('railway') in ('station', 'halt'):
        return 'trans'
    if 'historic' in t and t.get('historic') in ('monument', 'memorial', 'castle', 'fort', 'ruins', 'building', 'manor', 'archaeological_site'):
        return 'sight'
    if GAME_RE.search(nm) and ('office' in t or 'craft' in t):
        return 'game'
    return None

d = json.load(open(SRC, encoding='utf-8'))
cats = []
rows = []
seen = {}
skipped = collections.Counter()
for e in d['elements']:
    t = e.get('tags', {})
    c = classify(t)
    if not c:
        skipped['nocat'] += 1
        continue
    lat = e.get('lat') if e['type'] == 'node' else e.get('center', {}).get('lat')
    lon = e.get('lon') if e['type'] == 'node' else e.get('center', {}).get('lon')
    if lat is None:
        continue
    x = (lon - LON0) * KX
    z = -(lat - LAT0) * KZ
    if not (BB[0] < x < BB[1] and BB[2] < z < BB[3]):
        skipped['outside'] += 1
        continue
    name = pick_name(t)
    if not name:
        skipped['noname'] += 1
        continue
    name = re.sub(r'\s+', ' ', name)
    if re.search(r'politsiyi|dilnychn|ofitser', name, re.I):
        skipped['police-officer'] += 1
        continue
    if len(name) > 36:
        name = name[:36]
        if ' ' in name:
            name = name[:name.rfind(' ')]
    key = (name.lower(), c)
    prev = seen.get(key, [])
    if any(math.hypot(x - px, z - pz) < 30 for px, pz in prev):
        skipped['dup'] += 1
        continue
    seen.setdefault(key, []).append((x, z))
    if c not in cats:
        cats.append(c)
    rows.append([cats.index(c), round(x, 1), round(z, 1), name])

# a handful of entertainment places OSM does not have (gaming clubs, VR, billiards, bowling): names + coordinates read from Google Maps listings
EXTRA = [
 ('game','CYBERION',46.4085326,30.734307),('game','CYBERION',46.4162522,30.7226327),('game','CYBERION',46.4402435,30.709398),('game','CYBERION',46.4840988,30.7416327),
 ('game','SkiLL ESport Club',46.4820538,30.736757),('game','PlayStation Club',46.4794805,30.7379489),('game','Zigraymo Game Zone',46.4793525,30.7464104),
 ('game','PS Joystick',46.4874365,30.7326076),('game','Game-Bar Plays',46.4792035,30.7418959),
 ('game','VR Pandora',46.4835309,30.7440214),('game','VR GO',46.4741067,30.7236596),('game','Svit VR',46.4707306,30.7371965),('game','VRATA VR',46.4711862,30.7421384),
 ('game','Persona Billiards',46.4537784,30.7436388),('game','Billiard House',46.4680468,30.7262341),('game','Stil Billiards',46.4780692,30.7278397),('game','Arena Billiards',46.4330219,30.759988),
 ('game','Sfera Bowling',46.4696469,30.7155931),('game','Na Komitetskiy Entertainment',46.4692766,30.7150252),
 ('bar','Ibiza Beach Club',46.4281721,30.7667897),
]
for c, nm, lat, lon in EXTRA:
    x = (lon - LON0) * KX
    z = -(lat - LAT0) * KZ
    if not (BB[0] < x < BB[1] and BB[2] < z < BB[3]):
        continue
    if c not in cats:
        cats.append(c)
    rows.append([cats.index(c), round(x, 1), round(z, 1), nm])

rows.sort(key=lambda r: (int(r[2] // 200), int(r[1] // 200)))
json.dump({'cats': cats, 'v': rows}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
cnt = collections.Counter(cats[r[0]] for r in rows)
print('kept', len(rows), 'skipped', dict(skipped))
print(dict(cnt.most_common()))
