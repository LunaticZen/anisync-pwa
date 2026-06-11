import os
from PIL import Image, ImageDraw

# Source image
source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781130402318.png'
img = Image.open(source_img).convert('RGBA')

# Crop to square centrally
w, h = img.size
min_dim = min(w, h)
left = (w - min_dim) // 2
top = (h - min_dim) // 2
img = img.crop((left, top, left + min_dim, top + min_dim))
w, h = img.size

# Apply Squircle mask (radius = 22% of width)
rad = int(w * 0.22)
circle = Image.new('L', (rad * 2, rad * 2), 0)
draw = ImageDraw.Draw(circle)
draw.ellipse((0, 0, rad * 2 - 1, rad * 2 - 1), fill=255)

alpha = Image.new('L', img.size, 255)
alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))

draw_alpha = ImageDraw.Draw(alpha)
draw_alpha.rectangle([rad, 0, w - rad, h], fill=255)
draw_alpha.rectangle([0, rad, w, h - rad], fill=255)

img.putalpha(alpha)

# Save to artifacts directory
dest = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\final_transparent_icon.png'
img.save(dest)
print("Saved to", dest)
