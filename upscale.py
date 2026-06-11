import os
import glob
from PIL import Image, ImageFilter

source_dir = r"c:\Users\emin\.gemini\antigravity\scratch\anisync\packages\desktop\public\themes"
target_dir = r"c:\Users\emin\.gemini\antigravity\scratch\anisync\packages\desktop\public\themes_4k"

# Target resolution for 4K upscale (most images are probably 1080p, so 2x)
SCALE_FACTOR = 2

def upscale_image(filepath, target_path):
    print(f"Upscaling {os.path.basename(filepath)}...")
    try:
        img = Image.open(filepath).convert("RGB")
        width, height = img.size
        # Resize with Lanczos (best quality)
        new_size = (width * SCALE_FACTOR, height * SCALE_FACTOR)
        img_upscaled = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Apply a mild sharpening filter to simulate "HD" crispness
        img_sharpened = img_upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        
        # Save high-quality jpeg
        img_sharpened.save(target_path, "JPEG", quality=95)
    except Exception as e:
        print(f"Error upscaling {filepath}: {e}")

def main():
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    # Find all jpg files in subdirectories
    search_pattern = os.path.join(source_dir, "**", "*.jpg")
    image_files = glob.glob(search_pattern, recursive=True)

    for filepath in image_files:
        # Create corresponding target subdirectory
        rel_path = os.path.relpath(filepath, source_dir)
        target_path = os.path.join(target_dir, rel_path)
        
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        # Upscale and save
        upscale_image(filepath, target_path)

    print("Upscaling complete!")

if __name__ == "__main__":
    main()
