# PROTOTYPE (branch prototype/editorial-tapas): usage: python3 scripts/prototype-ink.py <scan> <out.jpg> <x0,y0,x1,y1 | ->
# Turn a scanned engraving into a luminance mask: ink white, paper black, trimmed and downsized.
import sys
from PIL import Image, ImageOps, ImageFilter
src, out, crop = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("L")
if crop != "-":
    im = im.crop(tuple(int(v) for v in crop.split(",")))
im = ImageOps.autocontrast(im, cutoff=1)
ink = ImageOps.invert(im)
# Paper tone and scan noise to black; keep line weight.
lo, hi = 60, 200
ink = ink.point(lambda v: 0 if v < lo else 255 if v > hi else int((v - lo) * 255 / (hi - lo)))
box = ink.point(lambda v: 255 if v > 90 else 0).getbbox()
ink = ink.crop(box)
ink.thumbnail((1000, 1000), Image.LANCZOS)
ink.save(out, quality=84)
print(out, ink.size)
