#!/usr/bin/env python3
"""
Slice composite bubble artwork into individual bubbles, then create
3-slice assets (left, center, right) for each bubble theme.

The 3-slice approach:
  - LEFT cap:   Contains left decorative edge (frog eyes, cat ears left, etc.)
  - CENTER:     A narrow tileable vertical strip from the middle
  - RIGHT cap:  Contains right decorative edge (paw prints, cheese holes, etc.)

Only the CENTER strip tiles/stretches horizontally. The left and right caps
remain pixel-perfect at all sizes.
"""

from PIL import Image
import os, sys

SRC = '/home/emim/Desktop/New Folder/ChatGPT Image Jul 19, 2026, 08_04_29 PM.png'
OUT = '/home/emim/Desktop/AniSync/anisync/packages/desktop/public/bubbles/themes'

# Each bubble: (name, x, y, w, h, left_cap_width, right_cap_width)
# Coordinates measured from the 1536x1024 composite
# left_cap_width / right_cap_width = how many px of the left/right edge to keep as non-stretching caps
BUBBLES = [
    # Row 1
    ('frog',      30,  38, 420, 138,  100, 60),
    ('love',     510,  52, 440, 130,   60, 60),
    ('cat',      990,  18, 510, 162,   80, 80),

    # Row 2
    ('pawprint',  30, 218, 380, 150,   80, 100),
    ('galaxy',   480, 228, 450, 140,   60, 80),
    ('cloud',    970, 218, 530, 148,   70, 70),

    # Row 3
    ('pixel',     32, 408, 430, 128,   60, 100),
    ('tape',     510, 410, 440, 130,   60, 100),
    ('wave',     990, 395, 510, 155,   70, 80),

    # Row 4
    ('terminal',  30, 575, 420, 120,   60, 60),
    ('ribbon',   480, 568, 470, 145,   70, 100),
    ('cheese',   990, 570, 510, 140,   60, 100),

    # Row 5
    ('wood',      30, 750, 430, 145,  100, 80),
    ('slime',    480, 748, 460, 155,   80, 100),
    ('letter',   990, 752, 510, 142,   60, 80),
]


def crop_and_slice():
    os.makedirs(OUT, exist_ok=True)
    img = Image.open(SRC).convert('RGBA')
    W, H = img.size
    print(f"Source image: {W}x{H}")

    for name, x, y, w, h, lcap, rcap in BUBBLES:
        theme_dir = os.path.join(OUT, name)
        os.makedirs(theme_dir, exist_ok=True)

        # Crop individual bubble from composite
        bubble = img.crop((x, y, x + w, y + h))

        # Save full bubble for reference/thumbnail
        bubble.save(os.path.join(theme_dir, 'full.png'), 'PNG')

        # Create 3-slice assets
        bw, bh = bubble.size

        # LEFT cap
        left = bubble.crop((0, 0, lcap, bh))
        left.save(os.path.join(theme_dir, 'left.png'), 'PNG')

        # CENTER strip (narrow 4px-wide slice from the exact center)
        cx = bw // 2
        center = bubble.crop((cx - 2, 0, cx + 2, bh))
        center.save(os.path.join(theme_dir, 'center.png'), 'PNG')

        # RIGHT cap
        right = bubble.crop((bw - rcap, 0, bw, bh))
        right.save(os.path.join(theme_dir, 'right.png'), 'PNG')

        print(f"  ✓ {name}: {bw}x{bh} → left({lcap}px) + center(4px tile) + right({rcap}px)")

    print(f"\nAll {len(BUBBLES)} themes sliced to: {OUT}")


if __name__ == '__main__':
    crop_and_slice()
