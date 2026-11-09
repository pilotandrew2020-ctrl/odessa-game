"""More home furniture built in Blender (own work, CC0): sofa, armchair, dining chair, table.

    blender.exe -b -P dev/blender/homekit.py -- <out dir> [preview.png]

Writes sofa.glb, armchair.glb, chair.glb, table.glb into <out dir>.  Materials called tint_* are recoloured in the game through MDL.put {tints}.
Conventions: metres, the front of every piece faces -Y in Blender (+Z in glTF), the sofa's back is at +Y, width along X.
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


def mat(name, hexc, rough=.8, metal=0.):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(hexc); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.use_backface_culling = False
    return m


def finish(ob, m, ang=.7):
    ob.data.materials.clear(); ob.data.materials.append(m)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=ang); ob.select_set(False)
    return ob


def rbox(name, c, s, m, bevel=.02, seg=3, rot=(0, 0, 0), puff=0., seed=0.):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    ob = bpy.context.active_object; ob.name = name
    ob.scale = s
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = seg; md.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier='b')
    if puff:
        for v in ob.data.vertices:
            v.co += v.normal * noise.noise(Vector((v.co.x * 5 + seed, v.co.y * 5, v.co.z * 5))) * puff
        ob.data.update()
    ob.rotation_euler = rot
    return finish(ob, m)


def cone(name, c, r1, r2, h, m, seg=10, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=h, location=c, rotation=rot)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def build_sofa(L, D, name, seats):
    fab = mat('tint_sofa', '#ddd6c8', .95)
    cus = mat('tint_cushion', '#efe9dc', .95)
    dark = mat('sofa_leg', '#2a211a', .5)
    zb = .1                                                   # leg height
    for sx in (-1, 1):
        for sy in (-1, 1):
            cone(name + '_leg', (sx * (L / 2 - .09), sy * (D / 2 - .09), zb / 2), .035, .022, zb, dark, 8)
    rbox(name + '_base', (0, 0, zb + .11), (L - .02, D - .04, .22), fab, .035, 4)
    aw = .17 if L > 1.2 else .15
    for sx in (-1, 1):
        rbox(name + '_arm', (sx * (L / 2 - aw / 2), -.02, zb + .34), (aw, D - .08, .5), fab, .06, 5)
    rbox(name + '_back', (0, D / 2 - .11, zb + .5), (L - 2 * aw + .04, .2, .78), fab, .07, 5)
    n = seats
    w = (L - 2 * aw - .02) / n
    for i in range(n):
        x = -(L - 2 * aw) / 2 + w * (i + .5) + .01
        rbox(name + '_seat', (x, -.05, zb + .3), (w - .015, D - .3, .17), cus, .06, 5, puff=.008, seed=i * 3.1)
        rbox(name + '_bk', (x, D / 2 - .27, zb + .6), (w - .02, .17, .42), cus, .06, 5, rot=(.22, 0, 0), puff=.008, seed=i * 5.3)


def build_chair():
    wood = mat('tint_wood', '#e6dcc8', .55)
    pad = mat('tint_cushion', '#efe9dc', .95)
    for sx in (-1, 1):
        for sy in (-1, 1):
            r = .026
            cone('leg', (sx * .18, sy * .18, .225), r, r * .7, .45, wood, 8)
    rbox('seat', (0, 0, .465), (.43, .42, .04), wood, .012, 3)
    rbox('pad', (0, -.01, .5), (.38, .37, .035), pad, .014, 3, puff=.004)
    for sx in (-1, 1):
        rbox('post', (sx * .18, .19, .72), (.035, .035, .5), wood, .008, 2)
    for k, z in enumerate((.64, .76, .88)):
        rbox('slat', (0, .19, z), (.36, .02, .07 if k < 2 else .09), wood, .006, 2)


def build_table():
    wood = mat('tint_wood', '#e6dcc8', .55)
    W, D, H = 1.2, .7, .75
    rbox('top', (0, 0, H - .02), (W, D, .04), wood, .014, 3)
    rbox('apron_f', (0, -D / 2 + .09, H - .085), (W - .16, .025, .08), wood, .005, 2)
    rbox('apron_b', (0, D / 2 - .09, H - .085), (W - .16, .025, .08), wood, .005, 2)
    rbox('apron_l', (-W / 2 + .09, 0, H - .085), (.025, D - .16, .08), wood, .005, 2)
    rbox('apron_r', (W / 2 - .09, 0, H - .085), (.025, D - .16, .08), wood, .005, 2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cone('leg', (sx * (W / 2 - .085), sy * (D / 2 - .085), (H - .04) / 2), .035, .02, H - .04, wood, 10)


def render_preview(path, loc=(2.6, -3.0, 1.9)):
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.render.resolution_x = 900; scn.render.resolution_y = 560
    scn.display.shading.light = 'STUDIO'
    cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); bpy.context.collection.objects.link(co); scn.camera = co
    co.location = loc
    d = Vector((0, 0, .4)) - co.location
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
for name, fn in (('sofa', lambda: build_sofa(2.0, .92, 'sofa', 3)), ('armchair', lambda: build_sofa(.92, .9, 'arm', 1)),
                 ('chair', build_chair), ('table', build_table)):
    clear(); fn()
    if PREVIEW: render_preview(PREVIEW.replace('.png', '_' + name + '.png'))
    clear(); fn(); export(name)
