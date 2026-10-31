"""Furniture built in Blender (own work, CC0): a double bed with a draped duvet, pillows and a throw, and a wardrobe module.

    blender.exe -b -P dev/blender/bedkit.py -- <out dir> [preview.png]

Writes <out dir>/bed_double.glb and <out dir>/wardrobe.glb.  Materials whose name starts with `tint_` are recoloured in the game
(MDL.put {tints:{tint_wood:'#..',tint_duvet:'#..'}}), so their base colour here is a light neutral that the style colour multiplies.
Conventions: metres, the bed's head is at +Y (becomes -Z in glTF), the wardrobe's front is at -Y (becomes +Z in glTF).
"""
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, noise

argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
PREVIEW = argv[1] if len(argv) > 1 else None
os.makedirs(OUT, exist_ok=True)


def lin(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)


MATS = {}


def mat(name, hexc, rough=.8, metal=0.):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = lin(hexc); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.use_backface_culling = False
    MATS[name] = m
    return m


def finish(ob, m, smooth_angle=.7):
    ob.data.materials.clear(); ob.data.materials.append(m)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=smooth_angle)
    ob.select_set(False)
    return ob


def rbox(name, c, s, m, bevel=.02, seg=3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    ob = bpy.context.active_object; ob.name = name
    ob.scale = s
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new('b', 'BEVEL'); md.width = bevel; md.segments = seg; md.limit_method = 'NONE'
        bpy.ops.object.modifier_apply(modifier='b')
    ob.rotation_euler = rot
    return finish(ob, m)


def cyl(name, c, r1, r2, h, m, seg=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=h, location=c, rotation=rot)
    ob = bpy.context.active_object; ob.name = name
    return finish(ob, m)


def puff(ob, amp, freq, seed):
    """pillow / cushion wobble"""
    me = ob.data
    for v in me.vertices:
        p = v.co
        d = noise.noise(Vector((p.x * freq + seed, p.y * freq, p.z * freq))) * amp
        v.co += v.normal * d
    me.update()


# ------------------------------------------------------------------------------------------------------ the bed
def build_bed():
    W, L = 1.6, 2.0                      # mattress
    zt = .62                              # mattress top
    wood = mat('tint_wood', '#e6dcc8', .55)
    mattress = mat('mattress', '#efe9dc', .95)
    sheet = mat('sheet', '#f7f4ee', .9)
    pillow = mat('pillow', '#f4f1ea', .95)
    duvet = mat('tint_duvet', '#e9e4da', .92)
    throw = mat('tint_throw', '#cfc8bc', .95)
    cush = mat('tint_cushion', '#f1ece2', .95)
    head = mat('tint_head', '#e3dccd', .9)
    # frame: platform, side rails, legs
    rbox('platform', (0, 0, .27), (W + .1, L + .08, .26), wood, .018, 3)
    for sx in (-1, 1):
        rbox('rail', (sx * (W / 2 + .05), 0, .36), (.05, L + .12, .3), wood, .015, 3)
        for sy in (-1, 1):
            cyl('leg', (sx * (W / 2 + .04), sy * (L / 2 + .02), .075), .04, .028, .15, wood, 10)
    # headboard: wooden backing + padded panel + top rail; footboard low
    hy = L / 2 + .07
    rbox('hb_back', (0, hy, .62), (W + .16, .07, 1.24), wood, .02, 3)
    rbox('hb_pad', (0, hy - .062, .84), (W - .06, .06, .66), head, .045, 4)
    for sx in (-.5, 0, .5):                                                      # channel lines of the padding
        rbox('hb_ch', (sx * (W - .2) / 1.0 * .5, hy - .097, .84), (.012, .01, .6), wood, .004, 1)
    rbox('hb_top', (0, hy, 1.255), (W + .2, .09, .06), wood, .025, 3)
    fy = -L / 2 - .07
    rbox('fb', (0, fy, .42), (W + .16, .06, .5), wood, .02, 3)
    rbox('fb_top', (0, fy, .68), (W + .2, .08, .05), wood, .022, 3)
    # mattress
    rbox('mattress', (0, 0, .5), (W, L - .02, .24), mattress, .075, 5)
    # sheet turned down at the head, duvet draped over mattress, sides and foot
    y_top = hy - .2 - .0                                                         # top edge of the duvet (towards the head)
    y_foot = -L / 2 + .02
    # cross-section (x, z) polyline: left hanging leg, rounded top, right hanging leg
    a = W / 2 + .045; cy = zt - .035; b = .12; drop = .22
    prof = []
    for i in range(7): prof.append((-a - .01 * (i / 6.), cy - drop * (1 - i / 6.)))
    n_arc = 28
    for i in range(1, n_arc):
        th = math.pi - math.pi * i / n_arc
        c_, s_ = math.cos(th), math.sin(th)
        x = a * math.copysign(abs(c_) ** (2 / 3.4), c_)
        z = cy + b * (abs(s_) ** (2 / 3.4))
        prof.append((x, z))
    for i in range(7): prof.append((a + .01 * (i / 6.), cy - drop * (i / 6.)))
    # along the bed: y from the head edge to the foot, then hanging down over the foot
    along = []
    N1 = 22
    for i in range(N1): along.append((y_top + (y_foot - y_top) * i / (N1 - 1), 0.))
    for i in range(1, 8): along.append((y_foot - .06 * math.sin(i / 7. * math.pi / 2), -.06 * (1 - math.cos(i / 7. * math.pi / 2))))
    for i in range(1, 6): along.append((y_foot - .06 - .008 * i / 5., -.06 - .17 * i / 5.))
    bm = bmesh.new()
    rows = []
    for (y, dz) in along:
        row = []
        for (x, z) in prof:
            zz = z + dz
            # wrinkles: broad folds + fine creases, stronger towards the middle
            k = 1.0 - min(1., abs(x) / (a * 1.1))
            zz += (noise.noise(Vector((x * 3.2, y * 2.4, 4.1))) * .018 + noise.noise(Vector((x * 9., y * 7., 9.7))) * .007) * (.35 + .65 * k) * (1 if z > cy - .05 else .5)
            # soft ridge where the pillows push the duvet up
            zz += .02 * math.exp(-((y - y_top) / .22) ** 2) * k
            zz = max(zz, zt - .36)
            row.append(bm.verts.new((x, y, zz)))
        rows.append(row)
    for r in range(len(rows) - 1):
        for c in range(len(prof) - 1):
            bm.faces.new((rows[r][c], rows[r][c + 1], rows[r + 1][c + 1], rows[r + 1][c]))
    me = bpy.data.meshes.new('duvet'); bm.to_mesh(me); bm.free()
    du = bpy.data.objects.new('duvet', me); bpy.context.collection.objects.link(du)
    md = du.modifiers.new('s', 'SOLIDIFY'); md.thickness = .022; md.offset = 1
    bpy.context.view_layer.objects.active = du
    bpy.ops.object.modifier_apply(modifier='s')
    bpy.context.view_layer.objects.active = du
    for p in du.data.polygons: p.use_smooth = True
    du.data.materials.append(duvet)
    # the white sheet fold at the head edge
    rbox('sheet', (0, y_top + .08, zt + .035), (W + .02, .26, .03), sheet, .012, 3, rot=(-.06, 0, 0))
    # pillows
    for sx in (-1, 1):
        p = rbox('pillow', (sx * W * .245, hy - .27, zt + .13), (.62, .42, .13), pillow, .05, 6, rot=(-.3, 0, sx * .03))
        puff(p, .012, 6., sx * 3.1)
    c = rbox('cushion', (-.12, hy - .5, zt + .115), (.38, .38, .09), cush, .04, 4, rot=(.0, 0, .35))
    # a folded throw across the foot
    t = rbox('throw', (0, y_foot + .36, zt + .095), (W + .06, .36, .045), throw, .016, 3, rot=(.045, 0, 0))
    puff(t, .006, 8., 1.7)
    return W


def build_wardrobe():
    wood = mat('tint_wood', '#e6dcc8', .55)
    panel = mat('tint_panel', '#efe7d6', .5)
    metal = mat('chrome', '#c9ccd0', .25, 1.)
    inner = mat('inside', '#cbb99a', .9)
    Wd, D, H = 1.0, .6, 2.3
    # carcass: back, sides, top, base plinth
    rbox('back', (0, D / 2 - .01, H / 2), (Wd, .02, H), inner, 0, 1)
    for sx in (-1, 1):
        rbox('side', (sx * (Wd / 2 - .011), 0, H / 2 + .05), (.022, D, H - .1), wood, .004, 1)
    rbox('top', (0, 0, H - .02), (Wd + .04, D + .04, .04), wood, .008, 2)
    rbox('crown', (0, -.01, H + .02), (Wd + .08, D + .07, .05), wood, .016, 3)
    rbox('plinth', (0, -.02, .05), (Wd - .02, D - .08, .1), mat('plinth', '#3a2e24', .8), .006, 1)
    rbox('shelf', (0, 0, 1.5), (Wd - .04, D - .04, .02), inner, 0, 1)
    # two doors with raised panels and a vertical bar handle each
    dw = Wd / 2 - .006
    for sx in (-1, 1):
        cx = sx * (dw / 2 + .003)
        rbox('door', (cx, -D / 2 - .012, H / 2 + .05), (dw, .024, H - .14), wood, .006, 2)
        rbox('panel_hi', (cx, -D / 2 - .028, 1.58), (dw - .16, .012, .96), panel, .01, 2)
        rbox('panel_lo', (cx, -D / 2 - .028, .62), (dw - .16, .012, .8), panel, .01, 2)
        rbox('frame_line', (cx, -D / 2 - .0245, 1.06), (dw - .06, .005, .018), wood, .002, 1)
        hx = -sx * (dw * .5 - .06) + cx
        cyl('handle', (hx, -D / 2 - .06, 1.12), .011, .011, .3, metal, 8)
        for hz in (-.12, .12):
            cyl('handle_post', (hx, -D / 2 - .038, 1.12 + hz), .007, .007, .04, metal, 8, rot=(math.pi / 2, 0, 0))


def render_preview(path):
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.render.resolution_x = 900; scn.render.resolution_y = 600
    scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'MATERIAL'
    cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); bpy.context.collection.objects.link(co); scn.camera = co
    co.location = (2.6, -3.6, 2.2); co.rotation_euler = (math.radians(66), 0, math.radians(35))
    bpy.ops.object.light_add(type='SUN', location=(2, -2, 4))
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)


def export(name, keep):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.type == 'MESH' and keep(o): o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_materials='EXPORT', export_image_format='NONE')
    bpy.ops.object.select_all(action='DESELECT')


bpy.ops.wm.read_factory_settings(use_empty=True)
build_bed()
bed_names = {o.name for o in bpy.data.objects if o.type == 'MESH'}
if PREVIEW: render_preview(PREVIEW.replace('.png', '_bed.png'))
export('bed_double', lambda o: o.name in bed_names)
# wardrobe in a clean scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
build_wardrobe()
if PREVIEW:
    scn = bpy.context.scene
    render_preview(PREVIEW.replace('.png', '_wardrobe.png'))
export('wardrobe', lambda o: o.type == 'MESH')
