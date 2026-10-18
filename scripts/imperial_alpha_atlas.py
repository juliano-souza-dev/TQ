"""Convert the existing 4x4 Imperial Galleon atlas to real RGBA WebP.

The source uses an almost-uniform opaque blue canvas. Key that canvas away
without resizing, rearranging or re-rendering the 16 ship headings.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/ships/galeao-negro-imperial.webp"
TARGET = ROOT / "assets/ships/galeao-negro-imperial-transparente.webp"

image = Image.open(SOURCE).convert("RGB")
if image.size != (1600, 1600):
    raise ValueError(f"Atlas must remain 1600x1600, got {image.size}")

pixels = np.asarray(image, dtype=np.uint8)
rgb = pixels.astype(np.float32)

# Read samples from every cell corner, not only the whole atlas. This detects
# the true flattened background even when cell edges have WebP ringing.
swatches = []
for row in range(4):
    for col in range(4):
        tile = pixels[row*400:row*400+400, col*400:col*400+400]
        swatches.extend([
            tile[:10, :10].reshape(-1, 3),
            tile[:10, -10:].reshape(-1, 3),
            tile[-10:, :10].reshape(-1, 3),
            tile[-10:, -10:].reshape(-1, 3),
        ])
background = np.median(np.concatenate(swatches, axis=0), axis=0).astype(np.float32)

# Remove only pixels close to the blue matte, with a short antialiased feather.
# Large colour differences (hull, flags, cannons, ropes) remain fully opaque.
distance = np.max(np.abs(rgb-background), axis=2)
alpha = np.uint8(np.clip((distance-8.0)*(255.0/24.0), 0, 255))
if np.count_nonzero(alpha == 0) < 700_000:
    raise ValueError("Background detection failed: not enough transparent pixels")
if np.count_nonzero(alpha == 255) < 120_000:
    raise ValueError("Foreground detection failed: not enough solid ship pixels")

# Un-matte partially transparent edge pixels to avoid the navy-blue fringe on
# bright oceans. Solid pixels are never changed.
normalized_alpha = alpha.astype(np.float32)/255.0
edge = (alpha > 0) & (alpha < 255)
safe_alpha = np.maximum(normalized_alpha, 0.03)
clean = rgb.copy()
if np.any(edge):
    candidate = (rgb - (1.0-normalized_alpha)[...,None]*background) / safe_alpha[...,None]
    clean[edge] = np.clip(candidate[edge], 0, 255)
clean[alpha == 0] = 0
rgba = np.dstack([np.uint8(np.rint(clean)), alpha])
result = Image.fromarray(rgba, mode="RGBA")
result.save(TARGET, "WEBP", lossless=True, method=6)
verification = Image.open(TARGET)
assert verification.size == image.size and verification.mode == "RGBA"
assert verification.getextrema()[3][0] == 0
print(f"Transparent ship atlas: {TARGET}")
print(f"Size: {verification.size}, background RGB: {background.tolist()}, bytes: {TARGET.stat().st_size}")
print(f"Fully transparent pixels: {np.count_nonzero(alpha == 0)}")
