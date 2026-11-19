# Turns each public-domain engraving in app/tapa/engravings.json into a luminance mask (ink white, paper black) in
# public/engravings/, so all of them are made the same way. Usage: python3 scripts/engravings.py <download-dir>
# Originals are downloaded from Commons once into <download-dir>; keep it outside the repo.
import json
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PLATES = ROOT / "app" / "tapa" / "engravings.json"
MASKS = ROOT / "public" / "engravings"
LOW, HIGH = 60, 200  # paper tone and scan noise go to black, the line keeps its weight
TRIM = 90  # what counts as ink when trimming to content
# The largest Tapa (a Manual page at 2x) draws the plate about 700 px wide; this keeps all 20 masks under 3 MB (#50).
LONGEST = 800
QUALITY = 75


def mask(scan: Image.Image, crop: list[int] | None) -> Image.Image:
    image = scan.convert("L")
    if crop:
        image = image.crop(tuple(crop))
    ink = ImageOps.invert(ImageOps.autocontrast(image, cutoff=1))
    ink = ink.point(lambda v: 0 if v < LOW else 255 if v > HIGH else (v - LOW) * 255 // (HIGH - LOW))
    box = ink.point(lambda v: 255 if v > TRIM else 0).getbbox()
    if box:
        ink = ink.crop(box)
    ink.thumbnail((LONGEST, LONGEST), Image.LANCZOS)
    return ink


def original(title: str, downloads: Path) -> Path:
    path = downloads / title.removeprefix("File:").replace("/", "_")
    if not path.exists():
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(title.removeprefix("File:"))
        subprocess.run(
            ["curl", "-sSfL", "--retry", "6", "--retry-delay", "30", "--retry-all-errors", "-A", "engraving-mask-script/1.0", "-o", str(path), url],
            check=True,
        )
        time.sleep(5)  # Commons throttles bursts of original downloads (HTTP 429)
    return path


def self_check() -> None:
    # Paper (light) becomes black, a line (dark) becomes white, and the blank margin is trimmed away.
    scan = Image.new("L", (100, 100), 235)
    scan.paste(20, (40, 10, 60, 90))
    out = mask(scan, None)
    assert out.size == (20, 80), out.size
    assert out.getpixel((10, 40)) == 255 and out.getextrema() == (255, 255), "the line should print at full ink"
    print("self-check ok")


def main() -> None:
    if sys.argv[1:] == ["--check"]:
        return self_check()
    downloads = Path(sys.argv[1])
    downloads.mkdir(parents=True, exist_ok=True)
    total = 0
    for plate in json.loads(PLATES.read_text()):
        out = MASKS / f"{plate['id']}.jpg"
        mask(Image.open(original(plate["source"]["title"], downloads)), plate.get("crop")).save(out, quality=QUALITY)
        total += out.stat().st_size
        print(f"{out.name}: {Image.open(out).size}, {out.stat().st_size // 1024} KB")
    print(f"total {total / 1024 / 1024:.2f} MB")


main()
