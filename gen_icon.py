from PIL import Image, ImageDraw
import math, os

BASE = "C:/Users/emin/.gemini/antigravity/scratch/anisync/packages/mobile/app/src/main/res"
sizes = {"xxxhdpi": 192, "xxhdpi": 144, "xhdpi": 96, "hdpi": 72, "mdpi": 48}

for name, s in sizes.items():
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = s // 2
    r = s // 2 - 1

    # Background - emerald/cyan gradient circle
    for i in range(r, 0, -1):
        ratio = i / r
        cr = int(10 + (6 - 10) * (1 - ratio))
        cg = int(185 + (182 - 185) * (1 - ratio))
        cb = int(129 + (212 - 129) * (1 - ratio))
        d.ellipse([c - i, c - i, c + i, c + i], fill=(cr, cg, cb, 255))

    # Play triangle (centered, white)
    ts = int(s * 0.32)
    tx = c - int(ts * 0.25)
    ty = c - ts // 2
    pts = [(tx, ty), (tx + ts, c), (tx, ty + ts)]
    d.polygon(pts, fill=(255, 255, 255, 240))

    # Sync arc around
    lw = max(2, s // 20)
    ar = int(s * 0.43)
    d.arc([c - ar, c - ar, c + ar, c + ar], -40, 220, fill=(255, 255, 255, 160), width=lw)

    # Small arrow tip on arc end
    angle_rad = math.radians(-40)
    ax = c + int(ar * math.cos(angle_rad))
    ay = c + int(ar * math.sin(angle_rad))
    aw = max(3, s // 14)
    d.polygon([
        (ax, ay),
        (ax - aw, ay + aw // 2),
        (ax - aw // 2, ay - aw),
    ], fill=(255, 255, 255, 160))

    outdir = os.path.join(BASE, f"mipmap-{name}")
    os.makedirs(outdir, exist_ok=True)
    img.save(os.path.join(outdir, "ic_launcher.png"))
    print(f"  {name}: {s}x{s} -> {outdir}/ic_launcher.png")

print("Done!")
