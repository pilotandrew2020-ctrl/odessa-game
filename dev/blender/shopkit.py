"""Shop and mall furniture for shops.js / bldg.js: supermarket gondolas, chillers, checkouts, crates; small-shop wall units and display tables; sneakers, shoe walls and clothes racks;
food counters, back line, food-court tables; planters, a reception desk, a bench and pallet racking. Own work, CC0.
Run: blender -b -P dev/blender/shopkit.py -- assets/models/props [preview.png]
Conventions as venkit.py: metres, origin at the footprint centre on the floor, front = Blender -Y (glTF +Z); tint_* / glow_* materials are recoloured by the game."""
import bpy, math, sys, os
from mathutils import Vector, noise

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
PREVIEW = argv[1] if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)
PI = math.pi


def lin(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)


def mat(name, hexc, rough=.8, metal=0., alpha=None, glow=False):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(hexc); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if glow:
        b.inputs['Emission Color'].default_value = lin(hexc); b.inputs['Emission Strength'].default_value = 1.0
    if alpha is not None:
        b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    m.diffuse_color = lin(hexc)                                     # colour in the Workbench previews
    m.use_backface_culling = False
    return m


def finish(ob, m, ang=.7):
    ob.data.materials.clear(); ob.data.materials.append(m)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=ang); ob.select_set(False)
    return ob


def rbox(name, c, s, m, bevel=.008, seg=2, rot=(0, 0, 0), puff=0., seed=0.):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    ob = bpy.context.active_object; ob.name = name
    ob.scale = s
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new('b', 'BEVEL'); md.width = min(bevel, min(s) / 2.05); md.segments = seg; md.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier='b')
    if puff:
        for v in ob.data.vertices:
            v.co += v.normal * noise.noise(Vector((v.co.x * 5 + seed, v.co.y * 5, v.co.z * 5))) * puff
        ob.data.update()
    ob.rotation_euler = rot
    return finish(ob, m)


def cyl(name, c, r1, r2, h, m, seg=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=h, location=c, rotation=rot)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def ball(name, c, r, m, seg=8, rings=5):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=seg, ring_count=rings, location=c)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def ring(name, c, R, r, m, seg=18, mseg=5):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=mseg, location=c)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def tube(name, pts, r, m, res=5):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (q[0], q[1], q[2], 1)
    cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.active_object, m)


def rp(x, y, th):                                                   # rotate a footprint point about the model origin
    return (x * math.cos(th) - y * math.sin(th), x * math.sin(th) + y * math.cos(th))



# ---- extra primitives ----
def ell(name, c, r, m, seg=10, rings=6, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=seg, ring_count=rings, location=c)
    ob = bpy.context.active_object; ob.name = name; ob.scale = r
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.rotation_euler = rot
    return finish(ob, m)


def blob(name, c, r, m, sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=c)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def bx(name, c, s, m, b=0, seg=1, **kw):                           # a plain box (bevel 0 = a bare cube, 12 triangles)
    return rbox(name, c, s, m, b, seg, **kw)


# ---- shared materials ----
def M_STEEL(): return mat('steel', '#8d9298', .4, .8)
def M_CHROME(): return mat('chrome', '#cfd2d6', .22, 1.)
def M_BLACK(): return mat('black', '#15161a', .45, .2)
def M_GLASS(): return mat('glass', '#dfeef5', .05, 0., .22)
def TA(): return mat('tint_a', '#f2f2f2', .6)
def TB(): return mat('tint_b', '#f2f2f2', .6)
def TC(): return mat('tint_c', '#f2f2f2', .6)
def GREY(): return mat('gond_grey', '#c9ccd0', .5, .2)
def SHELF(): return mat('shelf_white', '#e8e8e4', .55)
def PRICE(): return mat('price_rail', '#f6f6f2', .5)
def KICK(): return mat('plinth_dark', '#3a3c40', .6)
def SLOT(): return mat('slot_dark', '#6c7076', .5, .4)
def LED(): return mat('glow_led', '#fff6df', .5, 0, None, True)
def WOOD(): return mat('crate_wood', '#b98a4a', .8)
def WOODD(): return mat('crate_dark', '#6e4f2a', .85)
def KRAFT(): return mat('carton', '#c8a06a', .85)
def LEAF1(): return mat('leaf_a', '#2f7a3a', .8)
def LEAF2(): return mat('leaf_b', '#3f9a46', .8)


# ================= supermarket =================
def build_gond_mid():                                               # 1 m of a gondola: back sheet, 4 shelves per side, header (shelf tops at .235 + .4 n, as the product rows expect)
    grey, shelf, price, kick, slot = GREY(), SHELF(), PRICE(), KICK(), SLOT()
    bx('kick', (0, 0, .08), (.98, .8, .16), kick)
    bx('back', (0, 0, .99), (.98, .05, 1.66), grey)
    for x in (-.375, -.125, .125, .375):
        for sd in (-1, 1): bx('slot', (x, sd * .029, .99), (.014, .008, 1.5), slot)
    for l in range(4):
        z = .22 + l * .4
        for sd in (-1, 1):
            bx('board', (0, sd * .22, z), (.96, .4, .03), shelf)
            bx('lip', (0, sd * .41, z + .02), (.96, .012, .07), shelf)
            bx('price', (0, sd * .418, z + .005), (.94, .006, .03), price)
    bx('post', (-.49, 0, .91), (.02, .86, 1.82), grey)
    bx('crown', (0, 0, 1.84), (1.0, .9, .04), grey)
    rbox('header', (0, 0, 1.95), (1.0, .5, .16), TA(), .01, 2)


def build_gond_end():                                               # end cap: a brand panel with two promo shelves of cartons on the outer side (front = -Y)
    ta, tb, shelf, price, kick = TA(), TB(), SHELF(), PRICE(), KICK()
    rbox('panel', (0, 0, .92), (.9, .06, 1.84), ta, .012, 2)
    bx('foot', (0, -.02, .05), (.9, .1, .1), kick)
    for z in (.5, 1.0, 1.5):
        bx('pshelf', (0, -.15, z), (.8, .24, .025), shelf)
        bx('plip', (0, -.265, z + .02), (.8, .01, .05), price)
        for j, x in enumerate((-.2, .2)):
            rbox('pack', (x, -.15, z + .0125 + .09 + .02 * ((j + int(z * 2)) % 2)), (.3, .17, .18 + .04 * ((j + int(z * 2)) % 2)), tb, .012, 2, puff=.004, seed=z + j)


def build_chiller_mid():                                            # 1 m of an open multideck chiller; decks at .3 .78 1.26 1.74
    steel, chrome, shelf, price, glass = M_STEEL(), M_CHROME(), SHELF(), PRICE(), mat('chill_back', '#cfe3ee', .35, .1)
    dark = mat('rubber', '#1c1d20', .8)
    bx('base', (0, -.02, .1), (1.0, .76, .2), steel)
    bx('bump', (0, -.41, .13), (1.0, .05, .08), dark)
    bx('back', (0, .38, 1.15), (1.0, .06, 2.3), glass)
    for sx in (-1, 1): bx('post', (sx * .49, 0, 1.15), (.025, .8, 2.3), steel)
    for z in (.3, .78, 1.26, 1.74):
        bx('deck', (0, -.01, z), (.95, .7, .03), shelf)
        bx('dlip', (0, -.355, z + .02), (.95, .01, .05), price)
    rbox('canopy', (0, 0, 2.36), (1.0, .9, .12), TA(), .01, 2)
    bx('led', (0, -.05, 2.285), (.92, .6, .02), LED())


def build_checkout():                                               # one lane: belt (customer side, -Y), till desk with scanner + screen, lane lamp. origin = lane centre, belt starts at y=-1.275
    steel, chrome, black, rub, kick = M_STEEL(), M_CHROME(), M_BLACK(), mat('rubber', '#1c1d20', .8), KICK()
    body = mat('belt_body', '#34363b', .5, .3); desk = mat('desk_white', '#e4e4de', .5); scr = mat('glow_screen', '#46f2ff', .3, 0, None, True)
    red = mat('glow_scan', '#ff3030', .4, 0, None, True); lamp = mat('glow_lamp', '#ffffff', .4, 0, None, True)
    bx('bkick', (0, -.375, .06), (.8, 1.7, .12), kick)
    bx('bbody', (0, -.375, .48), (.9, 1.8, .72), body)
    bx('belt', (0, -.375, .855), (.62, 1.76, .03), rub)
    for sx in (-1, 1): bx('rail', (sx * .38, -.375, .9), (.06, 1.8, .12), steel)
    bx('endcap', (0, -1.27, .9), (.7, .03, .1), steel)
    bx('divider', (0, -.2, .92), (.5, .03, .07), black)
    bx('dkick', (0, .825, .06), (1.0, .8, .12), kick)
    bx('dbody', (0, .825, .56), (1.1, .9, .9), desk)
    rbox('dstripe', (0, .37, .7), (1.0, .01, .12), TA(), 0, 1)
    bx('dtop', (0, .825, 1.025), (1.16, .96, .05), steel)
    bx('scan', (0, .55, 1.055), (.28, .2, .008), black)
    bx('scanred', (0, .55, 1.06), (.2, .008, .003), red)
    rbox('monitor', (.32, .98, 1.33), (.4, .03, .28), black, .01, 2)
    bx('screen', (.32, 1.0, 1.33), (.36, .004, .24), scr)
    bx('stand', (.32, .98, 1.14), (.05, .05, .18), black)
    rbox('pos', (.36, .45, 1.07), (.09, .12, .045), black, .01, 2)
    cyl('pole', (-.55, -1.3, .95), .018, .018, 1.9, steel, 8)
    rbox('lampbox', (-.55, -1.3, 1.95), (.4, .05, .28), TA(), .01, 2)
    bx('lampface', (-.55, -1.33, 1.95), (.34, .008, .22), lamp)


def build_bin(h=.8, rim=True):                                      # slatted crate on a plinth; the deck sits at h-.01 so produce rows stand on it
    wood, dk = WOOD(), WOODD()
    n = int(round((h - .06) / .18))
    for k in range(n):
        z = .13 + k * (h - .2) / max(1, n - 1)
        for sy in (-1, 1): bx('fb', (0, sy * .535, z), (1.0, .03, .15), wood)
        for sx in (-1, 1): bx('sb', (sx * .485, 0, z), (.03, 1.04, .15), wood)
    for sx in (-1, 1):
        for sy in (-1, 1): bx('post', (sx * .49, sy * .54, h / 2), (.05, .05, h), dk)
    bx('floor', (0, 0, .04), (.96, 1.06, .05), dk)
    bx('deck', (0, 0, h - .025), (.94, 1.04, .03), dk if rim else wood)
    if rim:
        for sy in (-1, 1): bx('rim', (0, sy * .535, h + .02), (1.0, .04, .05), wood)
        for sx in (-1, 1): bx('rim', (sx * .485, 0, h + .02), (.04, 1.04, .05), wood)
    else:
        bx('lid', (0, 0, h + .01), (1.04, 1.1, .03), wood)


def build_produce_bin(): build_bin(.8, True)
def build_crate(): build_bin(.9, False)


# ================= small shops =================
def build_wall_unit():                                              # 1 m of a shelving wall: boards at .3 + .5 n (rows at the front third), posts, LED under every board
    shelf, price, grey, kick, led = SHELF(), PRICE(), GREY(), KICK(), LED()
    bx('plinth', (0, 0, .06), (1.0, .4, .12), kick)
    for l in range(4):
        z = .3 + l * .5
        bx('board', (0, 0, z), (.98, .34, .03), shelf)
        bx('lip', (0, -.17, z + .02), (.98, .012, .04), price)
        bx('led', (0, -.13, z - .022), (.9, .02, .008), led)
    for sx in (-1, 1): bx('post', (sx * .495, 0, 1.27), (.02, .34, 2.3), grey)
    rbox('crown', (0, 0, 2.5), (1.0, .4, .06), TA(), .008, 2)


def build_table(h):                                                 # 1 m of a plinth display table: toe kick, panelled body, overhanging top (long axis = x)
    body, top, pan, kick = mat('disp_body', '#dadcd8', .55), mat('disp_top', '#ece6da', .4), mat('disp_panel', '#eceeea', .5), KICK()
    bx('kick', (0, 0, .05), (.9, .94, .1), kick)
    bx('body', (0, 0, (h - .05 + .1) / 2), (.98, 1.04, h - .15), body)
    for sy in (-1, 1): bx('panel', (0, sy * .525, (h - .05 + .1) / 2), (.8, .012, h - .3), pan)
    rbox('top', (0, 0, h - .025), (1.0, 1.1, .05), top, .012, 2)


def build_disp_table(): build_table(.9)
def build_disp_island(): build_table(1.1)


# ================= sport / fashion =================
def sneaker(cx, cy, cz, up, st, sc=1.0):
    sole, lace = mat('sole_white', '#f2f2ee', .6), mat('lace_white', '#fafafa', .7)
    rbox('sole', (cx, cy, cz + .016 * sc), (.1 * sc, .3 * sc, .032 * sc), sole, .012 * sc, 2)
    ell('toe', (cx, cy - .095 * sc, cz + .06 * sc), (.047 * sc, .085 * sc, .042 * sc), up, 8, 5)
    ell('vamp', (cx, cy - .02 * sc, cz + .068 * sc), (.046 * sc, .12 * sc, .05 * sc), up, 8, 5)
    ell('heel', (cx, cy + .095 * sc, cz + .075 * sc), (.046 * sc, .06 * sc, .06 * sc), up, 8, 5)
    for sx in (-1, 1): bx('stripe', (cx + sx * .046 * sc, cy, cz + .066 * sc), (.006 * sc, .15 * sc, .026 * sc), st)
    bx('tongue', (cx, cy - .045 * sc, cz + .118 * sc), (.04 * sc, .07 * sc, .014 * sc), up, rot=(-.5, 0, 0))
    for k in range(3): bx('lace', (cx, cy - .075 * sc + k * .03 * sc, cz + .11 * sc), (.05 * sc, .01 * sc, .008 * sc), lace)


def build_sneaker():
    sneaker(0, 0, 0, TA(), mat('accent_dark', '#1d1d20', .6), 1.0)


def build_shoe_wall():                                              # 0.9 m: ledges at .5 1.12 1.74 with a sneaker each (tint_a / tint_b / tint_c)
    white, dk = mat('shelf_white', '#e8e8e4', .55), mat('accent_dark', '#1d1d20', .6)
    for z, up in ((.5, TA()), (1.12, TB()), (1.74, TC())):
        bx('ledge', (0, 0, z), (.8, .55, .04), white)
        sneaker(0, 0.0, z + .02, up, dk, 1.12)
    for sx in (-1, 1): bx('part', (sx * .45, 0, 1.15), (.02, .55, 1.5), white)


def build_shoe_stand():                                             # low two-tier stand with three sneakers (tint_a uppers, tint_b stripe)
    body, top = mat('disp_body', '#dadcd8', .55), mat('disp_top', '#ece6da', .4)
    bx('t1', (0, 0, .21), (1.2, .5, .42), body)
    bx('t2', (0, .1, .63), (.8, .3, .42), body)
    bx('top1', (0, 0, .43), (1.22, .52, .02), top)
    bx('top2', (0, .1, .85), (.82, .32, .02), top)
    ta, tb = TA(), TB()
    sneaker(-.4, -.02, .44, ta, tb); sneaker(.4, -.02, .44, ta, tb); sneaker(0, .1, .86, ta, tb)


def build_rack(kind):
    ch, ta, tb = M_CHROME(), TA(), TB()
    for sx in (-1, 1):
        bx('skid', (sx * .62, 0, .015), (.05, .5, .03), ch)
        cyl('pole', (sx * .62, 0, .8), .017, .017, 1.6, ch, 8)
    cyl('rail', (0, 0, 1.6), .014, .014, 1.3, ch, 8, rot=(0, PI / 2, 0))
    for q in range(5):
        x = -.48 + q * .24
        cyl('hook', (x, 0, 1.63), .006, .006, .04, ch, 5)
        bx('hang', (x, 0, 1.57), (.012, .42, .014), ch)
        if kind == 'top':
            rbox('body', (x, 0, 1.25), (.09, .44, .62), ta, .025, 2, puff=.004, seed=q)
            rbox('shoulder', (x, 0, 1.52), (.095, .56, .08), ta, .03, 2)
            bx('collar', (x, 0, 1.575), (.06, .12, .04), tb)
        else:
            rbox('waist', (x, 0, 1.5), (.09, .42, .08), tb, .02, 2)
            for sy in (-1, 1): rbox('leg', (x, sy * .1, .98), (.08, .18, .98), ta, .02, 2, puff=.004, seed=q * 2 + sy)


def build_rack_top(): build_rack('top')
def build_rack_pants(): build_rack('pants')


# ================= food =================
def build_food_counter():                                           # 1 m of a counter: brand front, foot rail, light top, tray rail and a sneeze guard
    ta, steel, ch, kick, glass = TA(), M_STEEL(), M_CHROME(), KICK(), M_GLASS()
    top = mat('counter_top_l', '#e8e4da', .35)
    bx('kick', (0, 0, .05), (.96, .84, .1), kick)
    rbox('body', (0, 0, .6), (1.0, .9, 1.0), ta, .012, 2)
    bx('panel', (0, -.455, .6), (.8, .012, .6), steel)
    cyl('foot', (0, -.5, .2), .018, .018, 1.0, ch, 8, rot=(0, PI / 2, 0))
    rbox('top', (0, 0, 1.12), (1.0, 1.0, .06), top, .01, 2)
    cyl('trayrail', (0, -.4, 1.2), .012, .012, 1.0, ch, 8, rot=(0, PI / 2, 0))
    for sx in (-1, 1): cyl('tpost', (sx * .48, -.4, 1.16), .012, .012, .08, ch, 6)
    bx('guard', (0, -.12, 1.5), (.96, .01, .5), glass, rot=(-.28, 0, 0))
    for sx in (-1, 1): bx('gpost', (sx * .485, -.12, 1.46), (.012, .014, .6), ch, rot=(-.28, 0, 0))


def build_line(kind):                                               # 1 m of the stainless back line: griddle + cabinet ('a') or an upright fridge ('b')
    steel, ch, blk, kick = M_STEEL(), M_CHROME(), M_BLACK(), KICK()
    flame = mat('glow_flame', '#ffb347', .5, 0, None, True)
    bx('kick', (0, 0, .05), (.96, .84, .1), kick)
    if kind == 'a':
        bx('body', (0, 0, .5), (1.0, .9, .8), steel)
        for sx in (-1, 1):
            bx('door', (sx * .245, -.455, .5), (.47, .012, .7), mat('steel_l', '#a4a9ae', .35, .6))
            bx('handle', (sx * .09, -.475, .55), (.012, .02, .3), ch)
        bx('plate', (0, -.04, .915), (.94, .74, .03), blk)
        bx('splash', (0, .42, 1.1), (1.0, .06, .4), steel)
        for k in range(4):
            cyl('knob', (-.3 + k * .2, -.47, .86), .022, .022, .03, blk, 8, rot=(PI / 2, 0, 0))
        bx('pilot', (.4, -.47, .86), (.02, .01, .02), flame)
    else:
        bx('body', (0, 0, .6), (1.0, .9, 1.2), steel)
        for sx in (-1, 1):
            bx('door', (sx * .245, -.455, .65), (.47, .012, 1.0), mat('steel_l', '#a4a9ae', .35, .6))
            bx('handle', (sx * .06, -.475, .75), (.014, .025, .4), ch)
        bx('top', (0, 0, 1.215), (1.02, .92, .03), ch)
        bx('splash', (0, .42, 1.4), (1.0, .06, .36), steel)


def build_line_a(): build_line('a')
def build_line_b(): build_line('b')


def build_food_set():                                               # a tray with a burger, fries and a cup (tint_a = tray)
    bun, patty, leaf, cheese = mat('bun', '#d9a04a', .7), mat('patty', '#5a2e1a', .8), mat('lettuce', '#6fbf3f', .8), mat('cheese', '#f2c230', .6)
    red, fry, white = mat('fries_box', '#d8372a', .6), mat('fries', '#f0c24a', .7), mat('cup_white', '#f4f4f0', .5)
    rbox('tray', (0, 0, .008), (.42, .3, .016), TA(), .006, 1)
    cyl('b1', (-.1, 0, .028), .06, .06, .024, bun, 12); cyl('b2', (-.1, 0, .044), .062, .062, .016, patty, 12); cyl('b3', (-.1, 0, .056), .066, .066, .014, cheese, 12)
    cyl('b4', (-.1, 0, .066), .066, .066, .012, leaf, 12); ell('b5', (-.1, 0, .072), (.062, .062, .04), bun, 12, 6)
    rbox('fbox', (.06, 0, .05), (.07, .045, .09), red, .004, 1)
    for k in range(5): bx('fry', (.04 + k * .01, (k - 2) * .008, .115 + .008 * (k % 3)), (.008, .008, .06), fry, rot=(0, .05 * (k - 2), 0))
    cyl('cup', (.15, .06, .06), .033, .045, .12, white, 10); cyl('lid', (.15, .06, .125), .047, .047, .012, white, 10)
    cyl('straw', (.153, .06, .17), .004, .004, .09, red, 5)


def build_court_table():                                            # square table on a pedestal, four stools at 0.95 m (tint_a = stool seats)
    top, steel = mat('court_top', '#f2f0ea', .45), M_STEEL()
    rbox('top', (0, 0, .74), (1.2, 1.2, .06), top, .02, 2)
    cyl('post', (0, 0, .37), .06, .06, .74, steel, 10); cyl('foot', (0, 0, .015), .3, .3, .03, steel, 14)
    for dx, dy in ((-.95, 0), (.95, 0), (0, -.95), (0, .95)):
        cyl('seat', (dx, dy, .42), .2, .2, .05, TA(), 14)
        cyl('stem', (dx, dy, .2), .025, .025, .4, steel, 8); cyl('sfoot', (dx, dy, .01), .15, .15, .02, steel, 12)


def build_planter():                                                # big stone trough with a shrub
    stone, soil, l1, l2 = mat('planter_stone', '#8a8f94', .85), mat('soil', '#3a2d1e', .95), LEAF1(), LEAF2()
    rbox('trough', (0, 0, .45), (1.6, 1.6, .9), stone, .03, 2)
    bx('soil', (0, 0, .91), (1.44, 1.44, .02), soil)
    pts = [(0, 0, 1.55, .5), (.3, .1, 1.3, .38), (-.3, -.1, 1.35, .4), (.1, -.3, 1.2, .34), (-.15, .3, 1.25, .36), (.35, -.25, 1.6, .3), (-.3, .2, 1.7, .32), (0, 0, 2.05, .34),
           (.25, .25, 1.8, .3), (-.2, -.3, 1.75, .3), (0, .1, 1.9, .3), (.4, .2, 1.4, .28), (-.42, -.05, 1.5, .28)]
    for i, (x, y, z, r) in enumerate(pts): blob('leaf', (x, y, z), r, l1 if i % 2 else l2)


def build_plant():                                                  # floor pot with a fig
    pot, soil, l1, l2 = mat('pot_brown', '#7a4a2a', .7), mat('soil', '#3a2d1e', .95), LEAF1(), LEAF2()
    cyl('pot', (0, 0, .25), .27, .21, .5, pot, 14); cyl('rim', (0, 0, .5), .29, .29, .04, pot, 14); bx('soil', (0, 0, .5), (.46, .46, .02), soil)
    cyl('trunk', (0, 0, .85), .03, .04, .7, mat('bark', '#6a4a2a', .85), 6)
    pts = [(0, 0, 1.45, .36), (.2, .05, 1.2, .26), (-.2, -.05, 1.25, .27), (.05, -.2, 1.1, .22), (-.1, .2, 1.15, .24), (.15, .15, 1.6, .22), (-.2, .1, 1.62, .22), (0, -.05, 1.8, .22)]
    for i, (x, y, z, r) in enumerate(pts): blob('leaf', (x, y, z), r, l1 if i % 2 else l2)


def build_flowerstand():                                            # three shelves of zinc buckets with bouquets (tint_a / tint_b / tint_c = one colour per shelf)
    wood, zinc, l1, l2 = mat('flower_wood', '#8a6a44', .8), mat('zinc', '#aab0b6', .45, .6), LEAF1(), LEAF2()
    tn = (TA(), TB(), TC())
    for sx in (-1, 1): bx('side', (sx * .48, 0, .88), (.04, .5, 1.76), wood)
    bx('top', (0, 0, 1.77), (1.0, .52, .03), wood)
    for k, z in enumerate((.3, .85, 1.4)):
        bx('shelf', (0, 0, z), (.96, .5, .03), wood)
        for sx in (-1, 1):
            cx = sx * .24
            cyl('bucket', (cx, 0, z + .17), .14, .12, .3, zinc, 12)
            ell('foliage', (cx, 0, z + .32), (.14, .1, .07), l1 if (k + sx) % 2 else l2, 8, 5)
            for j in range(9):
                a = j * 2.4 + sx + k; r = .02 + .075 * ((j * 5) % 4) / 3
                ell('blossom', (cx + r * math.cos(a), r * math.sin(a) * .85, z + .39 + .045 * (j % 3)), (.07, .07, .055), tn[k], 6, 4)


# ================= hall / warehouse =================
def build_reception():
    wood, top, steel = mat('rec_wood', '#5a3a24', .55), mat('rec_top', '#2a1a10', .35), M_CHROME()
    bx('kick', (0, 0, .05), (4.2, .84, .1), KICK())
    rbox('body', (0, 0, .59), (4.2, .9, 1.0), wood, .01, 2)
    for k in range(7): bx('panel', (-1.8 + k * .6, -.455, .59), (.5, .012, .76), mat('rec_panel', '#6b4630', .55))
    rbox('top', (0, 0, 1.13), (4.4, 1.0, .06), top, .012, 2)
    cyl('bell', (-.9, -.1, 1.19), .05, .05, .02, steel, 12); ell('bellh', (-.9, -.1, 1.205), (.04, .04, .035), steel, 10, 5)
    cyl('lampst', (1.4, .1, 1.3), .01, .01, .25, mat('brass', '#c9a24a', .3, .8), 6); rbox('lampsh', (1.4, .1, 1.45), (.26, .12, .08), mat('lamp_green', '#2b6a46', .5), .02, 2)
    rbox('book', (0.2, -.05, 1.17), (.3, .22, .03), mat('book_red', '#7a1f1f', .7), .005, 1)
    rbox('mon', (-1.4, .15, 1.45), (.42, .03, .28), M_BLACK(), .01, 2); bx('monst', (-1.4, .13, 1.27), (.05, .05, .15), M_BLACK())


def build_bench():                                                  # 2.6 m slat bench, front +z, back rest behind (-z)
    wood, steel = mat('bench_wood', '#6a4a2e', .7), M_BLACK()
    for k in range(3): bx('seat', (0, -.2 + k * .2, .5), (2.6, .17, .04), wood, .004, 1)
    for k in range(2): bx('rest', (0, .3, .66 + k * .2), (2.6, .03, .15), wood)
    for sx in (-1, 1):
        bx('leg', (sx * 1.2, 0, .24), (.05, .6, .48), steel)
        bx('arm', (sx * 1.2, .3, .62), (.05, .05, .6), steel)


def build_pallet_rack():                                            # 1.8 m bay of steel racking, 3 levels with pallets and cartons (long axis = x)
    blue, orange, wood, dk, kr = mat('rack_blue', '#2a5a9a', .5, .3), mat('rack_orange', '#e07a1a', .5, .3), WOOD(), WOODD(), KRAFT()
    tape = mat('tape', '#b08a50', .6)
    for sx in (-1, 1):
        for sy in (-1, 1): bx('upright', (sx * .9, sy * .58, 1.2), (.06, .06, 2.4), blue)
        bx('brace', (sx * .9, 0, 1.2), (.03, 1.1, 2.3), blue)
    for z in (.18, 1.0, 1.82):
        for sy in (-1, 1): bx('beam', (0, sy * .58, z), (1.8, .05, .12), orange)
        for k in range(5): bx('deck', (0, -.45 + k * .225, z + .09), (1.7, .16, .018), dk)
        for sx in (-.55, 0, .55): bx('run', (sx, 0, z + .06), (.09, 1.0, .05), wood)
        n = 2 if z > 1.5 else 3
        for j in range(n):
            w = 1.6 / n; x = -.8 + w * (j + .5)
            hh = .5 + .1 * ((j + int(z)) % 3)
            rbox('carton', (x, 0, z + .1 + hh / 2), (w - .06, .9, hh), kr, .01, 2, puff=.004, seed=j + z)
            bx('tape', (x, 0, z + .1 + hh + .002), (.06, .9, .004), tape)


JOBS = (('sh_gond', build_gond_mid), ('sh_gond_end', build_gond_end), ('sh_chiller', build_chiller_mid), ('sh_checkout', build_checkout),
        ('sh_produce', build_produce_bin), ('sh_crate', build_crate), ('sh_wall', build_wall_unit), ('sh_table', build_disp_table),
        ('sh_island', build_disp_island), ('sh_sneaker', build_sneaker), ('sh_shoewall', build_shoe_wall), ('sh_shoestand', build_shoe_stand),
        ('sh_rack_top', build_rack_top), ('sh_rack_pants', build_rack_pants), ('sh_foodcounter', build_food_counter), ('sh_line_a', build_line_a),
        ('sh_line_b', build_line_b), ('sh_foodset', build_food_set), ('sh_courttable', build_court_table), ('sh_planter', build_planter), ('sh_flowers', build_flowerstand),
        ('sh_plant', build_plant), ('sh_reception', build_reception), ('sh_bench', build_bench), ('sh_palletrack', build_pallet_rack))


def join_by_material():
    groups = {}
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.data.materials:
            groups.setdefault(o.data.materials[0].name, []).append(o)
    for name, obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs: o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        if len(obs) > 1: bpy.ops.object.join()
    bpy.ops.object.select_all(action='DESELECT')


def render_preview(path):
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.render.resolution_x = 900; scn.render.resolution_y = 600
    scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'MATERIAL'
    mn = Vector((1e9, 1e9, 1e9)); mx = Vector((-1e9, -1e9, -1e9))
    for o in bpy.data.objects:
        if o.type != 'MESH': continue
        for v in o.bound_box:
            w = o.matrix_world @ Vector(v)
            mn = Vector((min(mn[i], w[i]) for i in range(3))); mx = Vector((max(mx[i], w[i]) for i in range(3)))
    c = (mn + mx) / 2; d = max((mx - mn).length, .5)
    cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); bpy.context.collection.objects.link(co); scn.camera = co
    co.location = c + Vector((.55, -1.0, .55)) * d * 1.05
    co.rotation_euler = (c - co.location).to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)


def export(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.type == 'MESH': o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_materials='EXPORT', export_image_format='NONE')


def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)



bpy.ops.wm.read_factory_settings(use_empty=True)
for name, fn in JOBS:
    clear(); fn(); join_by_material()
    if PREVIEW: render_preview(PREVIEW.replace('.png', '_' + name + '.png'))
    export(name)
    print('BUILT', name, sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'), 'faces', len([o for o in bpy.data.objects if o.type == 'MESH']), 'objects')
