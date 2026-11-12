# The uploaded bench.glb was cut short by ~2.8 KB: the last 4 rows of one texture (the bin's colour map) were missing and the GLB header
# declared more bytes than the file had. This pads the file to its declared length, rebuilds those rows from the last good one and writes work/bench_raw.glb.
# usage: python3 -I fixbench.py src/bench.glb work/bench_raw.glb   (needs Pillow + numpy; the second step re-encodes image 3 through node: see fixbench.mjs)
import struct, json, io, sys
import numpy as np
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
src, dst = sys.argv[1], sys.argv[2]
d = bytearray(open(src, 'rb').read())
declared = struct.unpack('<I', d[8:12])[0]
jl, _ = struct.unpack('<II', d[12:20]); js = json.loads(d[20:20 + jl]); bo = 20 + jl + 8
bv = js['bufferViews'][js['images'][3]['bufferView']]; o = bo + bv['byteOffset']
x = Image.open(io.BytesIO(bytes(d[o:o + bv['byteLength']]))).convert('RGBA'); a = np.array(x); a[1020:] = a[1019]
Image.fromarray(a).save('work/img3_repaired.png')
d += bytes(declared - len(d)); open('work/bench_padded.glb', 'wb').write(d)
print('padded to', declared, 'bytes; repaired image 3 saved; now run fixbench.mjs')
