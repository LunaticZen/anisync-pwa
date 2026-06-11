import os
from PIL import Image

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781123360196.png'
img = Image.open(source_img)
w, h = img.size
print(f"Original size: {w}x{h}")

# We must ensure the icon is at least 256x256
transparent_img = Image.open('packages/desktop/build/icon.png')
if w < 256:
    transparent_img = transparent_img.resize((256, 256), Image.Resampling.LANCZOS)
    
transparent_img.save('packages/desktop/build/icon.ico', format='ICO', sizes=[(256,256), (128,128), (64,64), (48,48), (32,32), (16,16)])
transparent_img.save('packages/desktop/public/icon.ico', format='ICO', sizes=[(256,256), (128,128), (64,64), (48,48), (32,32), (16,16)])
print('ICO resized and saved successfully.')
