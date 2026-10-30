import json, sys, math, collections

SRC, OUT = sys.argv[1], sys.argv[2]
LAT0, LON0, KX, KZ = 46.387797, 30.730548, 76785.61541377888, 110574

def xz(p):
    return ((p['lon'] - LON0) * KX, -(p['lat'] - LAT0) * KZ)

def simplify(pts, tol):
    if len(pts) < 5:
        return pts
    def dp(a, b):
        ax, az = pts[a]; bx, bz = pts[b]
        dx, dz = bx - ax, bz - az
        L = math.hypot(dx, dz) or 1e-9
        bi, bd = -1, 0
        for i in range(a + 1, b):
            d = abs((pts[i][0] - ax) * dz - (pts[i][1] - az) * dx) / L
            if d > bd:
                bd, bi = d, i
        if bd > tol:
            return dp(a, bi)[:-1] + dp(bi, b)
        return [pts[a], pts[b]]
    return dp(0, len(pts) - 1)

def area(pts):
    s = 0
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
    return s / 2

d = json.load(open(SRC, encoding='utf-8'))
kinds = ['cemetery', 'park']
out = []
cnt = collections.Counter()
def add(kind, geom, name):
    pts = [xz(p) for p in geom]
    if len(pts) < 4:
        return
    if math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1]) > 3:
        return          # not a closed ring
    pts = pts[:-1]
    h = len(pts) // 2
    pts = simplify(pts[:h + 1], 2.5)[:-1] + simplify(pts[h:] + [pts[0]], 2.5)[:-1]
    A = abs(area(pts))
    if A < 600:
        return
    cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
    if not (-8600 < cx < 6600 and -27600 < cz < 5400):
        return
    flat = []
    for x, z in pts:
        flat += [round(x, 1), round(z, 1)]
    out.append([kinds.index(kind), int(A), flat])
    cnt[kind] += 1

for e in d['elements']:
    t = e.get('tags', {})
    kind = 'cemetery' if (t.get('landuse') == 'cemetery' or t.get('amenity') == 'grave_yard') else 'park'
    if e['type'] == 'way' and 'geometry' in e:
        add(kind, e['geometry'], t.get('name', ''))
    elif e['type'] == 'relation':
        for m in e.get('members', []):
            if m.get('role') == 'outer' and m.get('type') == 'way' and 'geometry' in m:
                add(kind, m['geometry'], t.get('name', ''))
out.sort(key=lambda r: -r[1])
json.dump({'kinds': kinds, 'a': out}, open(OUT, 'w'), separators=(',', ':'))
print(len(out), dict(cnt), 'km2:', {k: round(sum(r[1] for r in out if kinds[r[0]] == k) / 1e6, 2) for k in kinds})
