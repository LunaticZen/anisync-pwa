import os
from PIL import Image, ImageDraw

def add_corners(im, rad):
    circle = Image.new('L', (rad * 2, rad * 2), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 2 - 1, rad * 2 - 1), fill=255)
    alpha = Image.new('L', im.size, 255)
    w, h = im.size
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))
    
    # Fill the straight edges
    draw_alpha = ImageDraw.Draw(alpha)
    draw_alpha.rectangle([rad, 0, w - rad, h], fill=255)
    draw_alpha.rectangle([0, rad, w, h - rad], fill=255)
    
    # Apply
    im.putalpha(alpha)
    return im

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781123360196.png'
img = Image.open(source_img).convert('RGBA')
w, h = img.size

# Typical iOS icon radius is ~ 0.225 * width
# Let's crop it tightly to the squircle to remove the white bleed
# Looking at the icon, the radius is around 22% of the width.
rad = int(w * 0.22)

transparent_img = add_corners(img, rad)

os.makedirs('packages/desktop/build', exist_ok=True)
os.makedirs('packages/desktop/public', exist_ok=True)

transparent_img.save('packages/desktop/build/icon.png')
transparent_img.save('packages/desktop/public/icon.png')

# Save ICO file correctly
transparent_img.save('packages/desktop/public/icon.ico', format='ICO', sizes=[(w,h)])
transparent_img.save('packages/desktop/build/icon.ico', format='ICO', sizes=[(w,h)])

# Also for android mipmaps
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
    resized = transparent_img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(folder, 'ic_launcher.png'))
    resized.save(os.path.join(folder, 'ic_launcher_round.png'))

print('Icons generated successfully.')
