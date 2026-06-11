import os
from PIL import Image

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781123360196.png'
img = Image.open(source_img).convert('RGBA')
w, h = img.size

# Get average edge color
c1 = img.getpixel((w//2, int(h*0.05)))
c2 = img.getpixel((int(w*0.05), h//2))
r = (c1[0] + c2[0]) // 2
g = (c1[1] + c2[1]) // 2
b = (c1[2] + c2[2]) // 2
color_hex = f'#{r:02x}{g:02x}{b:02x}'

print('EDGE COLOR:', color_hex)

# Create adaptive icon XML
xml = f'''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher"/>
</adaptive-icon>
'''

colors_xml = f'''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">{color_hex}</color>
</resources>
'''

os.makedirs('packages/mobile/app/src/main/res/mipmap-anydpi-v26', exist_ok=True)
os.makedirs('packages/mobile/app/src/main/res/values', exist_ok=True)

with open('packages/mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', 'w') as f:
    f.write(xml)
with open('packages/mobile/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', 'w') as f:
    f.write(xml)
with open('packages/mobile/app/src/main/res/values/ic_launcher_colors.xml', 'w') as f:
    f.write(colors_xml)

print('Adaptive icons configured.')
