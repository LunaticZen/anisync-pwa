import os
from PIL import Image

source_img = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\media__1781130402318.png'
img = Image.open(source_img).convert('RGBA')

# Crop to square centrally
w, h = img.size
min_dim = min(w, h)
left = (w - min_dim) // 2
top = (h - min_dim) // 2
img = img.crop((left, top, left + min_dim, top + min_dim))
w, h = img.size

# We will do a manual flood fill to make the white background transparent
# The background is white/light blue. We want to remove the outer white part.
# Let's write a BFS flood fill
def flood_fill_transparent(im, start_points, tolerance=25):
    pixels = im.load()
    width, height = im.size
    visited = set()
    queue = []
    
    for px, py in start_points:
        if 0 <= px < width and 0 <= py < height:
            queue.append((px, py))
            visited.add((px, py))
            
    while queue:
        x, y = queue.pop(0)
        r, g, b, a = pixels[x, y]
        
        # If the pixel is white-ish
        # We assume background is very close to white (e.g. R>230, G>230, B>230)
        if r > 230 and g > 230 and b > 230 and a > 0:
            pixels[x, y] = (255, 255, 255, 0) # Make transparent
            
            for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))

# Start flood fill from the 4 corners
start_points = [
    (0, 0), (w-1, 0), (0, h-1), (w-1, h-1)
]
# Add a few more points along the edges to be safe
for i in range(10):
    start_points.append((i, 0))
    start_points.append((w-1-i, 0))
    start_points.append((0, i))
    start_points.append((0, h-1-i))
    
flood_fill_transparent(img, start_points)

# Optional: To remove aliasing/white fringes, we can do a slight alpha erosion
# But flood fill on anti-aliased edges usually leaves a tiny white fringe.
# Instead of basic flood fill, it's often better to just use a mathematical mask 
# OR we just find the blue pixels and keep them.
# Let's see if this floodfill works well enough first.

dest = r'C:\Users\emin\.gemini\antigravity-ide\brain\b9739cec-b7a7-4d52-b6d0-29ae366a6cb2\no_bg_icon.png'
img.save(dest)
print("Saved to", dest)
