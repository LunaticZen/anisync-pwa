import os
from PIL import Image, ImageDraw

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781123360196.png'
img = Image.open(source_img).convert('RGBA')
w, h = img.size

# 1. Generate transparent squircle for Desktop and legacy Android
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

# Save for desktop
transparent_img.save('packages/desktop/build/icon.png')
transparent_img.save('packages/desktop/public/icon.png')
transparent_img.save('packages/desktop/public/icon.ico', format='ICO', sizes=[(w,h)])
transparent_img.save('packages/desktop/build/icon.ico', format='ICO', sizes=[(w,h)])

# 2. Adaptive Icons
# Background: Scale up original image so white corners are pushed out.
# Scale factor = 1.3
bg_img = img.resize((int(w*1.4), int(h*1.4)), Image.Resampling.LANCZOS)
# crop center
left = (bg_img.width - w) // 2
top = (bg_img.height - h) // 2
bg_img = bg_img.crop((left, top, left+w, top+h))

# Foreground: Transparent squircle, scaled down to 66% so it fits safely in 72dp mask
# Actually, if we use bg_img as background, it already has the logo!
# So foreground can just be transparent!
fg_img = Image.new('RGBA', (w, h), (0,0,0,0))

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
    
    # Legacy icons
    resized_legacy = transparent_img.resize((size, size), Image.Resampling.LANCZOS)
    resized_legacy.save(os.path.join(folder, 'ic_launcher.png'))
    resized_legacy.save(os.path.join(folder, 'ic_launcher_round.png'))
    
    # Adaptive bg and fg
    # Standard adaptive icon size is 108dp. But it scales.
    # We will just save them in the same dimensions as the legacy icons. Android will scale them.
    # To be precise, adaptive icons should be exactly 108dp.
    # But mipmaps handle scaling.
    ad_size = int(size * (108/48)) # mdpi is 48, adaptive is 108
    resized_bg = bg_img.resize((ad_size, ad_size), Image.Resampling.LANCZOS)
    resized_fg = fg_img.resize((ad_size, ad_size), Image.Resampling.LANCZOS)
    
    resized_bg.save(os.path.join(folder, 'ic_launcher_background.png'))
    resized_fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

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

print('Perfect icons generated.')
