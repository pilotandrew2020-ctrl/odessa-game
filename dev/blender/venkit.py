"""Furniture of the venue interiors (gaming club, restaurant, bar, gym, clothes shop) built in Blender (own work, CC0).

    blender.exe -b -P dev/blender/venkit.py -- <out dir> [preview.png]

Writes bistro_set, bar_counter, back_bar, bar_stool, high_table, pool_table, wine_rack, pc_station, drink_fridge, treadmill,
bench_press, dumbbell_rack, yoga_mat, clothes_rail, wall_shelf, mannequin, shop_counter, fitting_room .glb into <out dir>.
Conventions: metres, the model's origin is the middle of its footprint on the floor and its front faces -Y in Blender (+Z in glTF).
Materials called tint_* are recoloured in the game (MDL.put {tints}), materials called glow_* are emissive and recoloured by the caller;
objects are joined per material so a model costs one draw call per material.
"""
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


# ---- shared materials (the first definition of a name wins) ----
def M_WOOD(): return mat('tint_wood', '#f2f2f2', .55)
def M_PANEL(): return mat('tint_panel', '#f2f2f2', .55)
def M_DARK(): return mat('wood_dark', '#2a211b', .6)
def M_CHROME(): return mat('chrome', '#cfd2d6', .22, 1.)
def M_STEEL(): return mat('steel', '#8d9298', .4, .8)
def M_BLACK(): return mat('black', '#15161a', .45, .2)
def M_GLASS(): return mat('glass', '#dfeef5', .05, 0., .22)
def M_MIRROR(): return mat('mirror', '#a9bcc8', .08, .6)


def bottle(c, kind, lying=False):
    """a bottle standing on c (bottom centre); kind 0..3 picks colour and height"""
    cols = ['bottle_green', 'bottle_red', 'bottle_amber', 'bottle_blue']
    hexc = ['#2e5a2e', '#6a1d2a', '#caa75a', '#1e3a6a']
    m = mat(cols[kind % 4], hexc[kind % 4], .2, .1)
    cap = mat('foil', '#c9a24a', .3, .8)
    h = .2 + .03 * (kind % 3); x, y, z = c
    if not lying:
        cyl('bt', (x, y, z + h / 2), .04, .04, h, m, 8)
        cyl('bs', (x, y, z + h + .02), .04, .017, .04, m, 8)
        cyl('bn', (x, y, z + h + .075), .017, .015, .07, m, 6)
        cyl('bc', (x, y, z + h + .115), .018, .018, .02, cap, 6)
    else:                                                           # lying along Y, neck towards -Y
        cyl('bt', (x, y, z), .04, .04, .26, m, 8, rot=(PI / 2, 0, 0))
        cyl('bs', (x, y - .15, z), .017, .04, .04, m, 8, rot=(PI / 2, 0, 0))
        cyl('bn', (x, y - .2, z), .015, .017, .07, m, 6, rot=(PI / 2, 0, 0))


# ================= restaurant / bar =================
def build_bistro_set():
    cloth = mat('tint_cloth', '#f4f4f4', .95); wood = M_WOOD(); dark = M_DARK()
    por = mat('porcelain', '#f1f1ee', .18); candle = mat('candle', '#f6e7b8', .6); flame = mat('glow_flame', '#ffb347', .5, 0, None, True)
    cyl('top', (0, 0, .725), .52, .52, .03, cloth, 20)
    cyl('skirt', (0, 0, .585), .62, .52, .26, cloth, 20)
    cyl('post', (0, 0, .37), .05, .05, .74, dark, 10)
    cyl('foot', (0, 0, .015), .27, .27, .03, dark, 14)
    cyl('candle', (.1, .1, .8), .028, .028, .12, candle, 8); cyl('flame', (.1, .1, .875), .012, .002, .035, flame, 6)
    for k in range(3):
        a = k * 2.0944 + .6
        cyl('plate', (.3 * math.cos(a), .3 * math.sin(a), .748), .11, .1, .012, por, 14)
    for (px, py, th) in ((-.8, 0, PI / 2), (.8, 0, -PI / 2), (0, .8, 0)):   # a chair on three sides, facing the table
        def put(lx, ly): q = rp(lx, ly, th); return (px + q[0], py + q[1])
        for sx in (-1, 1):
            for sy in (-1, 1):
                q = put(sx * .18, sy * .17); cyl('cl', (q[0], q[1], .23), .02, .016, .46, wood, 8)
        q = put(0, 0); rbox('cseat', (q[0], q[1], .47), (.42, .4, .04), wood, .01, 2, rot=(0, 0, th))
        for sx in (-1, 1):
            q = put(sx * .18, .18); rbox('cpost', (q[0], q[1], .72), (.032, .032, .5), wood, .006, 2, rot=(0, 0, th))
        q = put(0, .18); rbox('cslat1', (q[0], q[1], .84), (.38, .025, .12), wood, .006, 2, rot=(0, 0, th))
        q = put(0, .18); rbox('cslat2', (q[0], q[1], .64), (.34, .02, .06), wood, .006, 2, rot=(0, 0, th))


def build_bar_counter():
    wood = M_WOOD(); pan = M_PANEL(); top = mat('bar_top', '#1a110b', .25, .1); dark = M_DARK(); ch = M_CHROME()
    rbox('body', (0, .05, .5), (1.0, .64, 1.0), wood, .006, 2)
    for sx in (-1, 1):
        rbox('panel', (sx * .25, -.275, .52), (.42, .02, .7), pan, .008, 2)
    rbox('plinth', (0, .05, .04), (1.0, .6, .08), dark, 0, 1)
    rbox('top', (0, 0, 1.07), (1.004, .88, .06), top, .012, 3)
    cyl('rail', (0, -.33, .17), .022, .022, 1.0, ch, 10, rot=(0, PI / 2, 0))
    for sx in (-1, 1):
        cyl('bracket', (sx * .4, -.3, .17), .012, .012, .07, ch, 6, rot=(PI / 2, 0, 0))


def build_back_bar():
    wood = M_WOOD(); pan = M_PANEL(); top = mat('bar_top', '#1a110b', .25, .1); dark = M_DARK(); mir = M_MIRROR()
    strip = mat('glow_strip', '#ffb868', .5, 0, None, True); shelf = mat('glass_shelf', '#cfe6f2', .1, 0, .55); ch = M_CHROME()
    rbox('cab', (0, 0, .45), (1.0, .4, .9), wood, .006, 2)
    for sx in (-1, 1):
        rbox('door', (sx * .25, -.205, .45), (.44, .012, .78), pan, .006, 2)
        cyl('handle', (sx * .06, -.222, .5), .007, .007, .14, ch, 6)
    rbox('worktop', (0, -.01, .93), (1.004, .44, .04), top, .006, 2)
    rbox('board', (0, .18, 1.62), (1.0, .04, 1.4), dark, 0, 1)
    rbox('mirror', (0, .156, 1.68), (.9, .01, 1.0), mir, 0, 1)
    for r, z in enumerate((1.2, 1.65, 2.1)):
        rbox('shelf', (0, .02, z), (.96, .28, .02), shelf, .003, 1)
        rbox('strip', (0, -.1, z - .02), (.9, .02, .012), strip, 0, 1)
        for k in range(5):
            bottle((-.38 + .19 * k, .03, z + .01), k + r)


def build_bar_stool():
    seat = mat('tint_seat', '#f2f2f2', .7); ch = M_CHROME(); dark = M_BLACK()
    cyl('seat', (0, 0, .655), .19, .17, .07, seat, 16)
    cyl('under', (0, 0, .6), .16, .16, .04, dark, 12)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('leg', (sx * .11, sy * .11, .3), .016, .014, .6, ch, 6)
    ring('foot', (0, 0, .24), .155, .012, ch, 16, 5)


def build_high_table():
    wood = M_WOOD(); ch = M_CHROME()
    cyl('top', (0, 0, 1.03), .4, .4, .04, wood, 20)
    ring('edge', (0, 0, 1.03), .4, .012, ch, 20, 5)
    cyl('post', (0, 0, .5), .04, .04, 1.0, ch, 10)
    cyl('base', (0, 0, .02), .27, .27, .04, ch, 16)


def build_pool_table():
    wood = M_WOOD(); cloth = mat('tint_cloth', '#f2f2f2', .95); dcl = mat('cloth_dark', '#14502b', .95); dark = M_DARK(); pk = mat('pocket', '#050505', .9)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('leg', (sx * 1.25, sy * .65, .34), .075, .1, .68, dark, 12)
    rbox('apron', (0, 0, .72), (2.74, 1.54, .2), wood, .01, 2)
    rbox('cloth', (0, 0, .835), (2.5, 1.3, .05), cloth, 0, 1)
    for sy in (-1, 1):
        rbox('rail', (0, sy * .74, .89), (2.92, .22, .08), wood, .015, 3)
        rbox('cush', (0, sy * .64, .885), (2.5, .04, .05), dcl, 0, 1)
    for sx in (-1, 1):
        rbox('rail', (sx * 1.35, 0, .89), (.22, 1.3, .08), wood, .015, 3)
        rbox('cush', (sx * 1.24, 0, .885), (.04, 1.3, .05), dcl, 0, 1)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('pk', (sx * 1.21, sy * .61, .865), .065, .065, .012, pk, 12)
    for sy in (-1, 1):
        cyl('pk', (0, sy * .63, .865), .06, .06, .012, pk, 12)
    cols = [('ball_red', '#d9261c'), ('ball_yel', '#f2c418'), ('ball_blue', '#2f6db0'), ('ball_blk', '#111111')]
    n = 0
    for row in range(5):
        for k in range(row + 1):
            nm, hx = cols[(n + row) % 4] if not (row == 2 and k == 1) else cols[3]
            ball('ball', (.55 + row * .05, -row * .028 + k * .056, .888), .0285, mat(nm, hx, .2), 8, 5); n += 1
    ball('cue', (-.7, 0, .888), .0285, mat('ball_white', '#f4f4ee', .2), 8, 5)


def build_wine_rack():
    wood = M_WOOD(); dark = M_DARK(); pan = M_PANEL()
    rbox('back', (0, .23, 1.1), (2.0, .04, 2.2), dark, 0, 1)
    for sx in (-1, 1):
        rbox('side', (sx * .98, 0, 1.1), (.04, .5, 2.2), wood, .006, 2)
    rbox('top', (0, 0, 2.17), (2.0, .5, .06), wood, .008, 2)
    rbox('base', (0, 0, .15), (1.96, .46, .3), wood, .006, 2)
    for sx in (-1, 1):
        rbox('door', (sx * .49, -.235, .15), (.94, .012, .26), pan, .004, 2)
    n = 0
    for z in (.36, .74, 1.12, 1.5, 1.88):
        rbox('shelf', (0, 0, z - .045), (1.96, .46, .02), wood, 0, 1)
        for k in range(9):
            if k: rbox('div', (-.98 + k * .218, 0, z + .14), (.012, .44, .24), wood, 0, 1)
            bottle((-.98 + .109 + k * .218, .06, z + .04), n, lying=True); n += 1


# ================= gaming club =================
def build_pc_station():
    top = mat('desk_top', '#23252d', .4, .1); blk = M_BLACK(); mon = mat('monitor', '#0a0a10', .3, .3)
    scr = mat('glow_screen', '#2c6bff', .3, 0, None, True); rgb = mat('glow_rgb', '#2c6bff', .3, 0, None, True)
    key = mat('keyboard', '#15151c', .5); pad = mat('mousepad', '#0d0d12', .9); tow = mat('tower', '#0f0f16', .35, .3)
    seat = mat('chair_black', '#17171d', .75); acc = mat('tint_accent', '#f2f2f2', .65); ch = M_CHROME()
    rbox('top', (0, 0, .715), (1.5, .75, .05), top, .01, 2)
    for sx in (-1, 1):
        rbox('leg', (sx * .7, 0, .345), (.05, .7, .69), blk, .006, 2)
    rbox('modesty', (0, .32, .45), (1.4, .02, .4), blk, 0, 1)
    rbox('stand', (0, .15, .745), (.24, .16, .014), blk, .004, 1)
    rbox('neck', (0, .17, .86), (.05, .04, .22), blk, .004, 1)
    rbox('panel', (0, .13, 1.1), (.68, .04, .4), mon, .01, 2)
    rbox('screen', (0, .108, 1.1), (.62, .012, .34), scr, 0, 1)
    rbox('keys', (-.08, -.16, .77), (.44, .14, .02), key, .004, 1)
    rbox('rgbbar', (-.08, -.093, .782), (.42, .012, .01), rgb, 0, 1)
    rbox('mouse', (.4, -.15, .775), (.07, .11, .026), key, .012, 2)
    rbox('pad', (.2, -.15, .743), (.9, .3, .004), pad, 0, 1)
    rbox('tower', (-.55, .18, .23), (.22, .46, .46), tow, .008, 2)
    rbox('towerglow', (-.55, -.052, .3), (.14, .006, .3), rgb, 0, 1)
    rbox('towerfoot', (-.55, .18, .01), (.2, .44, .02), blk, 0, 1)
    # gaming chair, facing the desk
    cy = -.85
    for k in range(5):
        a = k * 1.2566
        rbox('star', (math.cos(a) * .15, cy + math.sin(a) * .15, .06), (.3, .04, .03), blk, .004, 1, rot=(0, 0, a))
        cyl('wheel', (math.cos(a) * .29, cy + math.sin(a) * .29, .03), .03, .03, .04, blk, 8, rot=(0, PI / 2, a))
    cyl('post', (0, cy, .24), .03, .03, .36, ch, 8)
    rbox('seat', (0, cy, .47), (.5, .5, .1), seat, .03, 3)
    for sx in (-1, 1):
        rbox('sbolster', (sx * .24, cy, .5), (.07, .46, .12), acc, .02, 3)
        rbox('arm', (sx * .3, cy - .02, .66), (.05, .3, .04), blk, .008, 2)
        rbox('armpost', (sx * .3, cy, .56), (.03, .03, .14), blk, .004, 1)
    rbox('back', (0, cy - .24, .9), (.46, .1, .74), seat, .035, 3, rot=(-.12, 0, 0))
    for sx in (-1, 1):
        rbox('wing', (sx * .22, cy - .23, .85), (.07, .12, .5), acc, .025, 3, rot=(-.12, 0, 0))
    rbox('stripe', (0, cy - .275, .9), (.1, .02, .6), acc, .008, 2, rot=(-.12, 0, 0))
    rbox('head', (0, cy - .27, 1.3), (.26, .08, .14), acc, .03, 3, rot=(-.12, 0, 0))


def build_drink_fridge():
    body = mat('fridge_body', '#e9edf0', .35); glow = mat('glow_fridge', '#cfffe6', .5, 0, None, True); glass = M_GLASS(); ch = M_CHROME()
    cans = [mat('can_red', '#d9261c', .3, .6), mat('can_blue', '#1d5fd0', .3, .6), mat('can_silver', '#c9ccd0', .3, .8)]
    rbox('body', (0, .04, 1.0), (.8, .62, 2.0), body, .012, 2)
    rbox('inner', (0, -.292, 1.05), (.68, .02, 1.7), glow, 0, 1)
    for k in range(6):
        z = .28 + k * .3
        rbox('shelf', (0, -.3, z - .05), (.68, .1, .015), ch, 0, 1)
        for q in range(7):
            cyl('can', (-.3 + q * .1, -.3, z + .02), .033, .033, .12, cans[(q + k) % 3], 8)
    rbox('door', (0, -.332, 1.05), (.72, .01, 1.74), glass, 0, 1)
    rbox('handle', (.34, -.35, 1.05), (.025, .03, .6), ch, .006, 1)
    rbox('crown', (0, -.0, 2.04), (.78, .6, .08), glow, .01, 1)


# ================= gym =================
def build_treadmill():
    dk = mat('tread_dark', '#1a1c20', .6); belt = mat('belt', '#0f1012', .8); st = M_STEEL(); scr = mat('glow_screen', '#27e08a', .3, 0, None, True)
    rbox('deck', (0, .05, .13), (.8, 1.7, .1), dk, .02, 2)
    rbox('belt', (0, .1, .2), (.58, 1.5, .03), belt, 0, 1)
    for sx in (-1, 1):
        rbox('rail', (sx * .32, .1, .205), (.1, 1.5, .04), st, .01, 2)
        rbox('upright', (sx * .35, -.62, .66), (.05, .06, 1.0), st, .008, 2)
        tube('handrail', [(sx * .38, -.62, 1.1), (sx * .38, -.3, 1.0), (sx * .38, .15, .92)], .017, st, 5)
    rbox('hood', (0, -.76, .34), (.78, .26, .32), dk, .04, 3)
    rbox('console', (0, -.62, 1.22), (.62, .13, .3), dk, .03, 3, rot=(.3, 0, 0))
    rbox('screen', (0, -.57, 1.23), (.46, .012, .18), scr, 0, 1, rot=(.3, 0, 0))
    for sx in (-1, 1):
        cyl('foot', (sx * .35, .75, .02), .04, .04, .04, dk, 8)


def build_bench_press():
    pad = mat('pad_black', '#1a1c20', .7); st = M_STEEL(); ch = M_CHROME(); pl = mat('plate', '#16171a', .5, .2)
    rbox('pad', (0, -.05, .46), (.3, 1.3, .1), pad, .035, 3)
    rbox('spine', (0, -.05, .38), (.08, 1.2, .06), st, .006, 1)
    for sy in (-.45, .5):
        rbox('leg', (0, sy, .2), (.5, .05, .04), st, .006, 1)
        for sx in (-1, 1): rbox('legp', (sx * .2, sy, .1), (.04, .05, .2), st, .004, 1)
    for sx in (-1, 1):
        rbox('upr', (sx * .4, .45, .62), (.06, .06, 1.24), st, .008, 2)
        rbox('base', (sx * .4, .45, .02), (.1, .8, .04), st, .006, 1)
        rbox('hook', (sx * .36, .4, 1.1), (.06, .12, .03), st, .004, 1)
    cyl('bar', (0, .45, 1.17), .014, .014, 1.9, ch, 8, rot=(0, PI / 2, 0))
    for sx in (-1, 1):
        for d, r in ((.78, .22), (.84, .17)):
            cyl('plate', (sx * d, .45, 1.17), r, r, .05, pl, 16, rot=(0, PI / 2, 0))
        cyl('collar', (sx * .9, .45, 1.17), .035, .035, .03, ch, 8, rot=(0, PI / 2, 0))


def build_dumbbell_rack():
    st = M_STEEL(); db = mat('db_black', '#17181b', .5, .2); ch = M_CHROME()
    for sx in (-1, 1):
        rbox('end', (sx * .62, 0, .37), (.05, .5, .74), st, .006, 1)
    for z, tilt in ((.3, .12), (.58, .12)):
        rbox('tray', (0, .04, z), (1.3, .34, .025), st, .004, 1, rot=(-tilt, 0, 0))
        for k in range(6):
            x = -.55 + k * .22; r = .04 + .0065 * k
            cyl('handle', (x, .04, z + .045 + r), .014, .014, .17, ch, 6, rot=(PI / 2, 0, 0))
            for sy in (-1, 1):
                cyl('head', (x, .04 + sy * .09, z + .045 + r), r, r, .05, db, 6, rot=(PI / 2, 0, 0))


def build_yoga_mat():
    m = mat('tint_mat', '#f2f2f2', .85)
    rbox('mat', (0, 0, .007), (.6, 1.7, .014), m, .005, 2)
    cyl('roll', (0, .85, .06), .055, .055, .6, m, 12, rot=(0, PI / 2, 0))


# ================= clothes shop =================
def build_clothes_rail():
    ch = M_CHROME(); tn = [mat('tint_' + k, '#f2f2f2', .85) for k in 'abcd']
    for sx in (-1, 1):
        rbox('skid', (sx * 1.45, 0, .015), (.05, .5, .03), ch, .005, 1)
        cyl('pole', (sx * 1.45, 0, .74), .018, .018, 1.46, ch, 8)
    cyl('rail', (0, 0, 1.45), .014, .014, 2.9, ch, 8, rot=(0, PI / 2, 0))
    for q in range(11):
        x = -1.35 + q * .27; kind = q % 3; h = (.8, .62, .95)[kind]; w = (.5, .46, .54)[kind]
        rbox('hanger', (x, 0, 1.42), (.012, .4, .014), ch, 0, 1)
        cyl('hook', (x, 0, 1.455), .006, .006, .03, ch, 5)
        rbox('body', (x, 0, 1.4 - h / 2), (.07, w, h), tn[(q * 3 + (q // 4)) % 4], .018, 2, puff=.003, seed=q)
        rbox('shoulder', (x, 0, 1.37), (.075, w + .1, .07), tn[(q * 3 + (q // 4)) % 4], .02, 2)


def build_wall_shelf():
    wood = M_WOOD(); tn = [mat('tint_' + k, '#f2f2f2', .85) for k in 'abcd']
    for sx in (-1, 1):
        rbox('side', (sx * .59, 0, 1.1), (.04, .4, 2.2), wood, .004, 1)
    rbox('back', (0, .18, 1.1), (1.2, .04, 2.2), wood, 0, 1)
    for i, z in enumerate((.04, .48, .92, 1.36, 1.8, 2.18)):
        rbox('shelf', (0, 0, z), (1.16, .38, .03), wood, .003, 1)
        if i == 5: continue
        for k in range(3):
            h = .1 + .05 * ((i + k) % 4)
            rbox('stack', (-.36 + k * .36, -.01, z + .015 + h / 2), (.32, .28, h), tn[(i * 3 + k) % 4], .02, 2, puff=.004, seed=i * 3 + k)


def build_mannequin():
    sk = mat('mannequin', '#e8d6c0', .5); top = mat('tint_top', '#f2f2f2', .85); bot = mat('tint_bottom', '#f2f2f2', .85); dk = mat('mq_base', '#1a1a1e', .5)
    cyl('base', (0, 0, .015), .22, .22, .03, dk, 14)
    cyl('pole', (0, 0, .25), .014, .014, .5, M_CHROME(), 6)
    for sx in (-1, 1):
        cyl('leg', (sx * .075, 0, .65), .045, .075, .6, bot, 8)
    rbox('hip', (0, 0, .96), (.3, .17, .16), bot, .05, 3)
    rbox('torso', (0, 0, 1.2), (.34, .19, .42), top, .07, 3)
    cyl('neck', (0, 0, 1.46), .03, .035, .07, sk, 8)
    ball('head', (0, 0, 1.56), .085, sk, 10, 7)
    for sx in (-1, 1):
        cyl('arm', (sx * .235, 0, 1.17), .03, .04, .5, sk, 8, rot=(0, -sx * .16, 0))
        cyl('sleeve', (sx * .205, 0, 1.36), .05, .045, .16, top, 8, rot=(0, -sx * .16, 0))


def build_shop_counter():
    wood = M_WOOD(); pan = M_PANEL(); top = mat('counter_top', '#2a2a2e', .3, .1); blk = M_BLACK(); scr = mat('glow_screen', '#46f2ff', .3, 0, None, True)
    rbox('body', (0, .04, .5), (2.6, .64, 1.0), wood, .006, 2)
    for k in range(3):
        rbox('panel', (-.85 + k * .85, -.285, .5), (.74, .02, .72), pan, .008, 2)
    rbox('top', (0, 0, 1.03), (2.7, .76, .05), top, .01, 2)
    rbox('till', (.7, .05, 1.14), (.38, .3, .14), blk, .02, 2)
    rbox('display', (.7, .17, 1.29), (.3, .03, .2), blk, .01, 2, rot=(.2, 0, 0))
    rbox('dscreen', (.7, .188, 1.29), (.26, .006, .16), scr, 0, 1, rot=(.2, 0, 0))                # the screen faces the cashier (+Y)
    rbox('terminal', (.2, -.17, 1.07), (.08, .13, .035), blk, .01, 2)


def build_fitting_room():
    wood = M_WOOD(); cur = mat('tint_curtain', '#f2f2f2', .95); mir = M_MIRROR(); ch = M_CHROME()
    rbox('back', (0, .48, 1.1), (1.1, .04, 2.2), wood, 0, 1)
    for sx in (-1, 1):
        rbox('side', (sx * .53, 0, 1.1), (.04, 1.0, 2.2), wood, 0, 1)
    rbox('top', (0, 0, 2.2), (1.1, 1.0, .04), wood, 0, 1)
    rbox('mirror', (0, .455, 1.15), (.7, .012, 1.5), mir, 0, 1)
    rbox('bench', (0, .3, .42), (.8, .25, .05), wood, .008, 2)
    cyl('rod', (0, -.47, 2.1), .012, .012, 1.08, ch, 8, rot=(0, PI / 2, 0))
    for sx in (-1, 1):
        rbox('drape', (sx * .4, -.47, 1.07), (.28, .05, 2.0), cur, .015, 2, puff=.02, seed=sx * 3.3)


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
JOBS = (('bistro_set', build_bistro_set), ('bar_counter', build_bar_counter), ('back_bar', build_back_bar), ('bar_stool', build_bar_stool),
        ('high_table', build_high_table), ('pool_table', build_pool_table), ('wine_rack', build_wine_rack), ('pc_station', build_pc_station),
        ('drink_fridge', build_drink_fridge), ('treadmill', build_treadmill), ('bench_press', build_bench_press), ('dumbbell_rack', build_dumbbell_rack),
        ('yoga_mat', build_yoga_mat), ('clothes_rail', build_clothes_rail), ('wall_shelf', build_wall_shelf), ('mannequin', build_mannequin),
        ('shop_counter', build_shop_counter), ('fitting_room', build_fitting_room))
for name, fn in JOBS:
    clear(); fn(); join_by_material()
    if PREVIEW: render_preview(PREVIEW.replace('.png', '_' + name + '.png'))
    export(name)
    print('BUILT', name, sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'), 'faces', len([o for o in bpy.data.objects if o.type == 'MESH']), 'objects')
