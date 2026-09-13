from pathlib import Path
from PIL import Image, ImageOps
import json, hashlib

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'generated'
OUT.mkdir(exist_ok=True)
CELL = 48
ATLAS_W, ATLAS_H = 2048, 1024
COLS, ROWS = ATLAS_W // CELL, ATLAS_H // CELL
CAPACITY = COLS * ROWS
EXTS = {'.jpg','.jpeg','.png','.webp','.gif'}

files = []
for p in sorted(ROOT.iterdir()):
    if p.is_file() and p.suffix.lower() in EXTS:
        files.append(p)
assets = ROOT / 'assets'
if assets.exists():
    for p in sorted(assets.iterdir()):
        if p.is_file() and p.suffix.lower() in EXTS:
            files.append(p)

# Deduplicate by file bytes while preserving first occurrence.
seen = set(); unique = []
for p in files:
    h = hashlib.sha1(p.read_bytes()).hexdigest()
    if h not in seen:
        seen.add(h); unique.append((p,h))

if len(unique) > CAPACITY:
    raise SystemExit(f'{len(unique)} images exceed one-atlas capacity {CAPACITY}')

atlas = Image.new('RGB',(ATLAS_W,ATLAS_H),(23,23,22))
items=[]
for i,(p,h) in enumerate(unique):
    with Image.open(p) as im:
        im = im.convert('RGB')
        tile = ImageOps.fit(im,(CELL,CELL),method=Image.Resampling.LANCZOS,centering=(0.5,0.5))
    x=(i%COLS)*CELL; y=(i//COLS)*CELL
    atlas.paste(tile,(x,y))
    items.append({'index':i,'name':p.name,'path':str(p.relative_to(ROOT)),'sha1':h,'x':x,'y':y})

atlas.save(OUT/'atlas.jpg',quality=88,optimize=True,progressive=True)
manifest={'cell':CELL,'atlasWidth':ATLAS_W,'atlasHeight':ATLAS_H,'columns':COLS,'count':len(items),'items':items}
(OUT/'manifest.json').write_text(json.dumps(manifest,separators=(',',':')))
print(f'Built {len(items)} artifacts into {OUT/"atlas.jpg"}')
