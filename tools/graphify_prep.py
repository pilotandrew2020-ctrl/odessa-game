#!/usr/bin/env python3
"""Prepare index.html for graphify.

Almost all of the game's logic is one big inline <script> in index.html; graphify cannot read HTML, so the knowledge graph would miss it.
This writes graphify_src/index.game.js: the largest inline script of index.html, every other line blank, so the LINE NUMBERS ARE EXACTLY
THE ONES OF index.html (graph hits like `index.game.js L6959` are `index.html` line 6959). The small minified PeerJS bundle is skipped.
"""
import os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = open(os.path.join(root, 'index.html'), encoding='utf-8', newline='').read().split('\n')
blocks, start = [], None
for i, l in enumerate(lines):
    if start is None:
        m = re.match(r'\s*<script>', l)
        if m:
            if '</script>' in l[m.end():]: blocks.append((i, i)); continue
            start = i
    elif '</script>' in l:
        blocks.append((start, i)); start = None
if not blocks: sys.exit('no inline script found in index.html')
a, b = max(blocks, key=lambda t: sum(len(x) for x in lines[t[0]:t[1] + 1]))
out = [''] * len(lines)
for i in range(a, b + 1): out[i] = lines[i]
out[a] = re.sub(r'^\s*<script>', '', out[a])
out[b] = out[b].replace('</script>', '')
os.makedirs(os.path.join(root, 'graphify_src'), exist_ok=True)
open(os.path.join(root, 'graphify_src', 'index.game.js'), 'w', encoding='utf-8', newline='').write('\n'.join(out))
print('graphify prep: index.html lines %d-%d -> graphify_src/index.game.js' % (a + 1, b + 1))
