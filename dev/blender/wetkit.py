"""Kitchen units and bathroom fixtures built in Blender (own work, CC0).

    blender.exe -b -P dev/blender/wetkit.py -- <out dir> [preview.png]

Writes kit_base, kit_sink, kit_stove, kit_wall, kit_hood, toilet, tub, vanity .glb into <out dir>.
Kitchen modules are 1 m wide, 0.62 m deep, worktop top at 0.905 m; the back (wall side) is +Y in Blender, the doors face -Y (+Z in glTF).
Materials called tint_* are recoloured per style in the game (MDL.put {tints}).
"""
import bpy, math, sys, os
from mathutils import Vector, noise

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
PREVIEW = argv[1] if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)


def lin(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)


def mat(name, hexc, rough=.8, metal=0., alpha=None):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(hexc); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if alpha is not None:
        b.inputs['Alpha'].default_value = alpha; m.surface_render_method = 'BLENDED'
    m.use_backface_culling = False
    return m


def finish(ob, m, ang=.7):
    ob.data.materials.clear(); ob.data.materials.append(m)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=ang); ob.select_set(False)
    return ob


def rbox(name, c, s, m, bevel=.01, seg=2, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    ob = bpy.context.active_object; ob.name = name
    ob.scale = s
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new('b', 'BEVEL'); md.width = min(bevel, min(s) / 2.01); md.segments = seg; md.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier='b')
    ob.rotation_euler = rot
    return finish(ob, m)


def cyl(name, c, r1, r2, h, m, seg=14, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=h, location=c, rotation=rot)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def tube(name, pts, r, m, res=6):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (q[0], q[1], q[2], 1)
    cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    return finish(ob, m)


CAB = lambda: mat('tint_cab', '#ece7dc', .6)
TOP = lambda: mat('counter', '#34353a', .35)
CHROME = lambda: mat('chrome', '#cfd2d6', .22, 1.)
DARK = lambda: mat('plinth', '#2a2623', .8)
STEEL = lambda: mat('steel', '#a9aeb4', .35, .9)
BLACK = lambda: mat('hob', '#0f1012', .2, .3)
GLASS = lambda: mat('oven_glass', '#1a1f24', .1, .2)
WHITE = lambda: mat('porcelain', '#f1f1ee', .18)

W, D, HB = 1.0, .62, .865           # width, depth, carcass height; worktop on top (.04) -> .905


def base_cabinet(top=True, doors=True):
    rbox('plinth', (0, .02, .04), (W - .04, D - .1, .08), DARK(), 0, 1)
    rbox('carcass', (0, 0, .08 + (HB - .08) / 2), (W - .004, D - .02, HB - .08), CAB(), .004, 1)
    if doors:
        for sx in (-1, 1):
            rbox('door', (sx * (W / 4), -D / 2 + .005, .08 + (HB - .08) / 2 + .003), (W / 2 - .008, .02, HB - .09), CAB(), .006, 2)
            rbox('door_panel', (sx * (W / 4), -D / 2 - .007, .08 + (HB - .08) / 2 + .003), (W / 2 - .09, .008, HB - .2), CAB(), .006, 2)
            cyl('handle', (sx * .06 + (-.0 if sx < 0 else .0), -D / 2 - .03, HB - .14), .009, .009, .16, CHROME(), 8)
            for dz in (-.065, .065):
                cyl('hpost', (sx * .06, -D / 2 - .018, HB - .14 + dz), .005, .005, .035, CHROME(), 6, rot=(math.pi / 2, 0, 0))
    if top:
        rbox('worktop', (0, -.012, HB + .02), (W + .002, D + .03, .04), TOP(), .008, 2)


def build_base():
    base_cabinet()


def build_sink():
    base_cabinet(top=False)
    # worktop with a hole for the basin: four slabs around it
    hx, hy = .5, .36                                                    # hole size
    cy = -.012
    rbox('wt_back', (0, cy + (D + .03) / 2 - (D + .03 - hy) / 4 * 1.0 + 0, HB + .02), (W + .002, (D + .03 - hy) / 2, .04), TOP(), .006, 2)
    rbox('wt_front', (0, cy - (D + .03) / 2 + (D + .03 - hy) / 4, HB + .02), (W + .002, (D + .03 - hy) / 2, .04), TOP(), .006, 2)
    for sx in (-1, 1):
        rbox('wt_side', (sx * (hx / 2 + (W - hx) / 4), cy, HB + .02), ((W - hx) / 2, hy, .04), TOP(), .006, 2)
    # steel basin: floor + four walls, rim
    zb = HB - .17
    rbox('basin_floor', (0, cy, zb), (hx - .02, hy - .02, .012), STEEL(), .004, 1)
    for sx in (-1, 1):
        rbox('basin_w', (sx * (hx / 2 - .006), cy, zb + .085), (.012, hy, .17), STEEL(), .004, 1)
    for sy in (-1, 1):
        rbox('basin_w', (0, cy + sy * (hy / 2 - .006), zb + .085), (hx, .012, .17), STEEL(), .004, 1)
    rbox('rim', (0, cy, HB + .043), (hx + .03, hy + .03, .006), STEEL(), .003, 1)
    cyl('drain', (0, cy, zb + .008), .035, .035, .004, CHROME(), 16)
    # faucet on the back slab: a swan neck whose spout hangs over the middle of the basin (water falls at Y = cy)
    bx_ = 0.0; by = cy + .22
    cyl('f_base', (bx_, by, HB + .055), .03, .026, .03, CHROME(), 16)
    pts = [(bx_, by, HB + .07), (bx_, by, HB + .26)]
    for i in range(1, 9):
        a = math.pi * i / 8
        pts.append((bx_, by - .11 * (1 - math.cos(a)), HB + .26 + .09 * math.sin(a)))
    pts.append((bx_, by - .22, HB + .17))
    tube('f_neck', pts, .013, CHROME(), 8)
    cyl('f_lever', (bx_ + .05, by + .005, HB + .13), .007, .007, .07, CHROME(), 8, rot=(0, math.pi / 2, 0))


def build_stove():
    steel = STEEL(); blk = BLACK()
    rbox('plinth', (0, .02, .04), (W - .04, D - .1, .08), DARK(), 0, 1)
    rbox('body', (0, 0, .08 + (HB - .08) / 2), (W - .004, D - .02, HB - .08), mat('stove_body', '#d9dadc', .35, .5), .004, 1)
    # control strip with knobs, oven door with window and bar handle
    rbox('strip', (0, -D / 2 - .004, HB - .07), (W - .03, .014, .1), mat('stove_strip', '#2b2d31', .3, .6), .004, 1)
    for i in range(5):
        cyl('knob', (-.36 + i * .18, -D / 2 - .03, HB - .07), .022, .02, .03, CHROME(), 12, rot=(math.pi / 2, 0, 0))
    rbox('door', (0, -D / 2 - .007, .43), (W - .06, .02, .6), mat('stove_door', '#2b2d31', .3, .6), .008, 2)
    rbox('window', (0, -D / 2 - .019, .44), (W - .22, .008, .38), GLASS(), .006, 2)
    cyl('handle', (0, -D / 2 - .06, .72), .011, .011, W - .2, CHROME(), 8, rot=(0, math.pi / 2, 0))
    for sx in (-1, 1):
        cyl('hpost', (sx * (W / 2 - .12), -D / 2 - .035, .72), .006, .006, .05, CHROME(), 6, rot=(math.pi / 2, 0, 0))
    # hob: black glass top with four burner rings
    rbox('hob', (0, -.012, HB + .02), (W + .002, D + .03, .04), blk, .008, 2)
    for sx in (-1, 1):
        for sy, r in ((-1, .085), (1, .065)):
            cyl('ring', (sx * .24, -.012 + sy * .13, HB + .043), r, r, .006, steel, 20)
            cyl('ring_in', (sx * .24, -.012 + sy * .13, HB + .047), r * .45, r * .45, .006, blk, 16)


def build_wall():
    h, d = .7, .34
    rbox('carcass', (0, 0, h / 2), (W - .004, d, h), CAB(), .006, 2)
    for sx in (-1, 1):
        rbox('door', (sx * (W / 4), -d / 2 - .004, h / 2), (W / 2 - .008, .02, h - .012), CAB(), .006, 2)
        rbox('door_panel', (sx * (W / 4), -d / 2 - .016, h / 2), (W / 2 - .09, .008, h - .12), CAB(), .006, 2)
        cyl('handle', (sx * .05, -d / 2 - .04, .13), .008, .008, .12, CHROME(), 8)


def build_hood():
    steel = STEEL()
    rbox('canopy', (0, -.05, .06), (W - .1, .46, .11), steel, .02, 3)
    rbox('collar', (0, .13, .15), (.26, .2, .1), steel, .006, 2)
    rbox('light', (0, -.05, .0), (.5, .2, .004), mat('hood_light', '#fff2c8', .5), 0, 1)


def build_toilet():
    por = WHITE()
    rbox('base', (0, .12, .12), (.30, .36, .24), por, .06, 5)
    rbox('bowl', (0, -.05, .30), (.38, .52, .32), por, .12, 6)
    rbox('seat', (0, -.06, .465), (.37, .46, .035), mat('seat', '#ecece8', .3), .06, 4)
    rbox('lid', (0, -.06, .485), (.34, .42, .018), mat('seat', '#ecece8', .3), .05, 4)
    rbox('tank', (0, .27, .62), (.42, .18, .42), por, .04, 4)
    rbox('tank_lid', (0, .27, .84), (.44, .2, .035), por, .014, 3)
    cyl('flush', (0, .27, .87), .028, .028, .03, CHROME(), 12)


def build_tub():
    por = WHITE()
    L, Wt, Ht = 1.7, .8, .58
    shell = rbox('shell', (0, 0, Ht / 2 + .03), (L, Wt, Ht - .06), por, .1, 6)
    cut = rbox('cut', (0, 0, Ht + .02), (L - .16, Wt - .16, .74), por, .12, 6)
    bpy.context.view_layer.objects.active = shell; shell.select_set(True)
    md = shell.modifiers.new('bool', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cut; md.solver = 'EXACT'
    bpy.ops.object.modifier_apply(modifier='bool'); shell.select_set(False)
    bpy.data.objects.remove(cut, do_unlink=True)
    shell.data.materials.clear(); shell.data.materials.append(por)
    bpy.context.view_layer.objects.active = shell; shell.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=.7); shell.select_set(False)
    rbox('plinth', (0, 0, .03), (L - .1, Wt - .1, .06), DARK(), 0, 1)
    # tap end: spout over the tub, two handles
    cyl('spout_base', (-L / 2 + .06, 0, Ht + .0), .03, .03, .04, CHROME(), 12)
    tube('spout', [(-L / 2 + .06, 0, Ht + .02), (-L / 2 + .06, 0, Ht + .09), (-L / 2 + .12, 0, Ht + .09), (-L / 2 + .2, 0, Ht + .04)], .014, CHROME(), 8)
    cyl('tap_l', (-L / 2 + .06, -.13, Ht + .03), .022, .022, .05, CHROME(), 10)
    cyl('tap_r', (-L / 2 + .06, .13, Ht + .03), .022, .022, .05, CHROME(), 10)


def build_vanity():
    # 1.0 x 0.5 bathroom vanity: two-door cabinet, porcelain top with an inset basin, faucet at the back, framed mirror
    por = WHITE(); Wd, Dp, Hc = 1.0, .5, .84
    rbox('carcass', (0, 0, Hc / 2), (Wd - .004, Dp - .02, Hc), mat('tint_wood', '#e6dcc8', .55), .006, 2)
    for sx in (-1, 1):
        rbox('door', (sx * Wd / 4, -Dp / 2 + .006, Hc / 2), (Wd / 2 - .012, .02, Hc - .02), mat('tint_wood', '#e6dcc8', .55), .006, 2)
        rbox('door_panel', (sx * Wd / 4, -Dp / 2 - .006, Hc / 2), (Wd / 2 - .1, .008, Hc - .2), mat('tint_panel', '#efe6d4', .55), .006, 2)
        cyl('knob', (sx * .06, -Dp / 2 - .03, Hc - .12), .014, .014, .03, CHROME(), 10, rot=(math.pi / 2, 0, 0))
    hx, hy = .46, .34
    top = rbox('top', (0, 0, Hc + .025), (Wd + .04, Dp + .04, .05), por, .012, 3)
    cut = rbox('cut', (0, -.03, Hc + .05), (hx, hy, .12), por, .09, 5)
    bpy.context.view_layer.objects.active = top; top.select_set(True)
    md = top.modifiers.new('bool', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cut; md.solver = 'EXACT'
    bpy.ops.object.modifier_apply(modifier='bool'); top.select_set(False)
    bpy.data.objects.remove(cut, do_unlink=True)
    top.data.materials.clear(); top.data.materials.append(por)
    bpy.context.view_layer.objects.active = top; top.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=.7); top.select_set(False)
    rbox('bowl', (0, -.03, Hc - .02), (hx - .02, hy - .02, .08), por, .05, 4)
    cyl('drain', (0, -.03, Hc - .058), .022, .022, .004, CHROME(), 14)
    by = .17
    cyl('f_base', (0, by, Hc + .06), .024, .02, .04, CHROME(), 12)
    tube('f_spout', [(0, by, Hc + .07), (0, by, Hc + .17), (0, by - .04, Hc + .2), (0, by - .13, Hc + .2), (0, by - .17, Hc + .15)], .011, CHROME(), 8)
    cyl('f_lever', (.045, by, Hc + .1), .006, .006, .06, CHROME(), 8, rot=(0, math.pi / 2, 0))
    # mirror on the wall above (a thin framed panel)
    rbox('m_frame', (0, Dp / 2 - .03, 1.62), (Wd * .85 + .1, .02, 1.05), mat('tint_wood', '#e6dcc8', .55), .006, 2)
    rbox('mirror', (0, Dp / 2 - .042, 1.62), (Wd * .85, .01, .95), mat('mirror', '#cfe6f2', .05, .9), 0, 1)


def render_preview(path, loc=(2.4, -2.6, 1.7), look=(0, 0, .6)):
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.render.resolution_x = 900; scn.render.resolution_y = 560
    scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'MATERIAL'
    cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); bpy.context.collection.objects.link(co); scn.camera = co
    co.location = loc
    d = Vector(look) - co.location
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
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
JOBS = (('kit_base', build_base, (1.9, -2.2, 1.5), (0, 0, .5)), ('kit_sink', build_sink, (1.9, -2.2, 1.7), (0, 0, .6)),
        ('kit_stove', build_stove, (1.9, -2.2, 1.5), (0, 0, .5)), ('kit_wall', build_wall, (1.9, -2.2, 1.2), (0, 0, .35)),
        ('kit_hood', build_hood, (2.0, -2.4, 1.2), (0, 0, .5)), ('toilet', build_toilet, (1.4, -1.6, 1.1), (0, 0, .4)),
        ('tub', build_tub, (2.4, -2.6, 1.7), (0, 0, .3)), ('vanity', build_vanity, (1.8, -2.2, 1.7), (0, 0, .9)))
for name, fn, cam, look in JOBS:
    clear(); fn()
    if PREVIEW: render_preview(PREVIEW.replace('.png', '_' + name + '.png'), cam, look)
    clear(); fn(); export(name)
