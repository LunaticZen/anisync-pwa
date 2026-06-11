import os
from PIL import Image, ImageDraw

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781123360196.png'
img = Image.open(source_img).convert('RGBA')

# Crop to square
w, h = img.size
min_dim = min(w, h)
left = (w - min_dim) // 2
top = (h - min_dim) // 2
img = img.crop((left, top, left + min_dim, top + min_dim))
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

os.makedirs('packages/desktop/build', exist_ok=True)
os.makedirs('packages/desktop/public', exist_ok=True)
transparent_img.save('packages/desktop/build/icon.png')
transparent_img.save('packages/desktop/public/icon.png')

# Save ICO with proper sizes
transparent_img.save('packages/desktop/public/icon.ico', format='ICO', sizes=[(256,256), (128,128), (64,64), (48,48), (32,32), (16,16)])
transparent_img.save('packages/desktop/build/icon.ico', format='ICO', sizes=[(256,256), (128,128), (64,64), (48,48), (32,32), (16,16)])

edge_color = '#629df8' 
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
    
    resized_legacy = transparent_img.resize((size, size), Image.Resampling.LANCZOS)
    resized_legacy.save(os.path.join(folder, 'ic_launcher.png'))
    resized_legacy.save(os.path.join(folder, 'ic_launcher_round.png'))
    
    ad_size = int(size * (108/48))
    safe_size = int(size * (72/48))
    
    bg = Image.new('RGBA', (ad_size, ad_size), edge_color)
    bg.save(os.path.join(folder, 'ic_launcher_background.png'))
    
    fg = Image.new('RGBA', (ad_size, ad_size), (0,0,0,0))
    logo_resized = transparent_img.resize((safe_size, safe_size), Image.Resampling.LANCZOS)
    
    offset = (ad_size - safe_size) // 2
    fg.paste(logo_resized, (offset, offset), logo_resized)
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))

print('Perfect square icons generated.')
