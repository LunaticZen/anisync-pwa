import os
from PIL import Image

def optimize_images(input_dir, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    total_saved_bytes = 0
    count = 0

    for dirpath, dirnames, filenames in os.walk(input_dir):
        for filename in filenames:
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                filepath = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(filepath, input_dir)
                target_filepath = os.path.join(output_dir, rel_path)
                
                # Make sure target subdirectories exist
                os.makedirs(os.path.dirname(target_filepath), exist_ok=True)
                
                # Change extension to .jpg to ensure consistent format
                target_filepath = os.path.splitext(target_filepath)[0] + '.jpg'

                try:
                    with Image.open(filepath) as img:
                        original_size = os.path.getsize(filepath)
                        
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Downscale back to 1080x1080. 
                        # Since it was AI upscaled to 2160x2160, downscaling it to 1080x1080 with LANCZOS 
                        # will keep it extremely sharp (supersampling effect) but drastically reduce file size.
                        img = img.resize((1080, 1080), Image.Resampling.LANCZOS)
                        
                        # Save with optimize=True and quality=85.
                        # This gives near-perfect visual quality but files will be around 100-200 KB instead of 3-5 MB.
                        img.save(target_filepath, 'JPEG', quality=85, optimize=True)
                        
                        new_size = os.path.getsize(target_filepath)
                        total_saved_bytes += (original_size - new_size)
                        count += 1
                        
                        print(f"Optimized: {filename} ({(original_size/1024/1024):.2f}MB -> {(new_size/1024):.2f}KB)")
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
                    
    print(f"\nTotal images optimized: {count}")
    print(f"Total space saved: {(total_saved_bytes / 1024 / 1024):.2f} MB")

if __name__ == "__main__":
    optimize_images(r"C:\Users\emin\Desktop\resimler_kaliteli", r"C:\Users\emin\Desktop\resimler_optimize")
