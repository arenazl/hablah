"""Genera los PNG del PWA (icon-192, icon-512, apple-touch-icon) a partir del SVG mark.

Usa PIL puro para dibujar las primitivas (sin libs externas como sharp/rsvg).
Coordenadas escaladas desde el viewBox 0..64.
"""
from PIL import Image, ImageDraw
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def draw_logo(size: int, bg: tuple, bar: tuple, tilde: tuple, radius_ratio: float = 0.219) -> Image.Image:
    """Dibuja el logo a la escala pedida. viewBox base 64x64."""
    scale = size / 64.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Background rounded rect
    r = int(14 * scale)
    d.rounded_rectangle((0, 0, size, size), radius=r, fill=bg)

    def rb(x, y, w, h, br):
        x0, y0 = int(x * scale), int(y * scale)
        x1, y1 = int((x + w) * scale), int((y + h) * scale)
        d.rounded_rectangle((x0, y0, x1, y1), radius=int(br * scale), fill=bar)

    # Voice bars forming h
    rb(13, 26, 6, 12, 3)
    rb(22, 14, 6, 36, 3)
    rb(28, 29, 8, 6, 3)
    rb(36, 22, 6, 28, 3)
    rb(45, 28, 6, 14, 3)

    # Tilde (arc as a thick line)
    cx, cy = 31 * scale, 8 * scale
    w_arc = int(2.6 * scale)
    pts = [(28 * scale, 8 * scale), (31 * scale, 5 * scale), (34 * scale, 8 * scale)]
    d.line(pts, fill=tilde, width=w_arc, joint="curve")

    return img


def main():
    green = (0, 179, 126, 255)
    white = (255, 255, 255, 255)
    amber = (255, 184, 0, 255)

    for sz in (192, 512):
        img = draw_logo(sz, bg=green, bar=white, tilde=amber)
        out = os.path.join(OUT_DIR, f"icon-{sz}.png")
        img.save(out, "PNG")
        print(f"  + {out}")

    # apple-touch-icon (180x180 standard)
    apple = draw_logo(180, bg=green, bar=white, tilde=amber)
    out = os.path.join(OUT_DIR, "apple-touch-icon.png")
    apple.save(out, "PNG")
    print(f"  + {out}")

    # Open Graph image 1200x630
    og = Image.new("RGBA", (1200, 630), (13, 20, 18, 255))
    draw = ImageDraw.Draw(og)
    # logo centrado izquierda
    logo = draw_logo(220, bg=green, bar=white, tilde=amber)
    og.paste(logo, (100, 205), logo)
    # texto a la derecha (titulo grande)
    try:
        from PIL import ImageFont
        font = ImageFont.truetype("arial.ttf", 76) if os.path.exists("C:\\Windows\\Fonts\\arial.ttf") else None
        font_b = ImageFont.truetype("arialbd.ttf", 96) if os.path.exists("C:\\Windows\\Fonts\\arialbd.ttf") else None
        sub = ImageFont.truetype("arial.ttf", 30) if os.path.exists("C:\\Windows\\Fonts\\arial.ttf") else None
    except Exception:
        font = font_b = sub = None
    if font_b:
        draw.text((380, 220), "hablah", font=font_b, fill=(255, 255, 255, 255))
        draw.text((380, 340), "Hablas. Aprendes.", font=font, fill=(0, 179, 126, 255))
    if sub:
        draw.text((380, 440), "Conversaciones reales con IA. Sin examenes.", font=sub, fill=(180, 191, 187, 255))
    out_og = os.path.join(OUT_DIR, "og-image.png")
    og.convert("RGB").save(out_og, "PNG")
    print(f"  + {out_og}")

    print("\nOK")


if __name__ == "__main__":
    main()
