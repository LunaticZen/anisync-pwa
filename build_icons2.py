import os
from PIL import Image, ImageDraw

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781123360196.png'
img = Image.open(source_img).convert('RGBA')
w, h = img.size

# 1. Create transparent squircle
def make_transparent_squircle(im, rad):
    im = im.copy()
    circle = Image.new('L', (rad * 2, rad * 2), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 2 - 1, rad * 2 - 1), fill=255)
    alpha = Image.new('L', im.size, 255)
    _w, _h = im.size
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, _h - rad))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (_w - rad, 0))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (_w - rad, _h - rad))
    draw_alpha = ImageDraw.Draw(alpha)
    draw_alpha.rectangle([rad, 0, _w - rad, _h], fill=255)
    draw_alpha.rectangle([0, rad, _w, _h - rad], fill=255)
    im.putalpha(alpha)
    return im

rad = int(w * 0.22)
transparent_img = make_transparent_squircle(img, rad)

# For desktop, we use the transparent squircle exactly as it is
os.makedirs('packages/desktop/build', exist_ok=True)
os.makedirs('packages/desktop/public', exist_ok=True)
transparent_img.save('packages/desktop/build/icon.png')
transparent_img.save('packages/desktop/public/icon.png')
transparent_img.save('packages/desktop/public/icon.ico', format='ICO', sizes=[(w,h)])
transparent_img.save('packages/desktop/build/icon.ico', format='ICO', sizes=[(w,h)])

# 2. Adaptive Icons
# We want the logo to be fully visible inside the 72dp safe zone.
# The adaptive icon canvas is 108dp.
# So we scale the logo to fit in 72/108 = 0.666 of the canvas.
# The background will be a solid color matching the logo edges.
edge_color = '#629df8' # A matching blue color from the logo

sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

for density, size in sizes.items():
    folder = f'packages/mobile/app/src/main/res/mipmap-{density}'
    os.makedirs(folder, exist_ok=True)
    
    # Legacy icon (for old devices, just the squircle)
    resized_legacy = transparent_img.resize((size, size), Image.Resampling.LANCZOS)
    resized_legacy.save(os.path.join(folder, 'ic_launcher.png'))
    resized_legacy.save(os.path.join(folder, 'ic_launcher_round.png'))
    
    # Adaptive Icon (108dp canvas)
    ad_size = int(size * (108/48))
    safe_size = int(size * (72/48))
    
    # Background: Solid blue
    bg = Image.new('RGBA', (ad_size, ad_size), edge_color)
    bg.save(os.path.join(folder, 'ic_launcher_background.png'))
    
    # Foreground: The transparent squircle, scaled to safe_size, pasted in center
    fg = Image.new('RGBA', (ad_size, ad_size), (0,0,0,0))
    logo_resized = transparent_img.resize((safe_size, safe_size), Image.Resampling.LANCZOS)
    
    offset = (ad_size - safe_size) // 2
    fg.paste(logo_resized, (offset, offset), logo_resized)
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''

os.makedirs('packages/mobile/app/src/main/res/mipmap-anydpi-v26', exist_ok=True)
with open('packages/mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', 'w') as f:
    f.write(xml)
with open('packages/mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', 'w') as f:
    f.write(xml)

print('Adaptive icons mapped perfectly.')
