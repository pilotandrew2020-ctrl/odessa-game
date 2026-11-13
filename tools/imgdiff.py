# usage: python3 -I tools/imgdiff.py <dirA> <dirB>   — compares the same-named PNGs: share of pixels that differ by more than 12/255, and writes <name>_diff.png into dirB
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
for n in sorted(os.listdir(a)):
    if not n.endswith('.png') or '_diff' in n or not os.path.exists(os.path.join(b, n)): continue
    A = Image.open(os.path.join(a, n)).convert('RGB'); B = Image.open(os.path.join(b, n)).convert('RGB')
    D = ImageChops.difference(A, B).convert('L'); px = list(D.getdata()); bad = sum(1 for v in px if v > 12)
    print(f'{n}: {100*bad/len(px):.2f}% of pixels differ by >12, mean diff {sum(px)/len(px):.2f}')
    D.point(lambda v: 255 if v > 12 else 0).save(os.path.join(b, n[:-4] + '_diff.png'))
