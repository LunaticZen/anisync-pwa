import os
from PIL import Image, ImageOps

def process_images(root_dir):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                filepath = os.path.join(dirpath, filename)
                try:
                    with Image.open(filepath) as img:
                        # Convert to RGB if needed
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Resize and center crop to exactly 1080x1080 using high quality Lanczos filter
                        resized_img = ImageOps.fit(img, (1080, 1080), method=Image.Resampling.LANCZOS)
                        
                        # Save back over the original, or you could save to a new folder
                        # We overwrite them with high quality to "increase resolution" feeling
                        resized_img.save(filepath, 'JPEG', quality=100)
                        print(f"Processed: {filepath}")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    process_images(r"C:\Users\emin\Desktop\resimler")
