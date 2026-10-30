# Writes .claude-plugin/icon.png: the banner's card in its folded state, diff lines above, one summary line below.
# Needs Pillow. Not part of build.sh: the developer portal takes the icon only once, at the first submission, and
# Pillow's antialiasing differs between versions, so CI could not compare the picture byte for byte.
# Run: python3 docs/src/icon.py [output file]
import os, sys
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.claude-plugin', 'icon.png')
SIZE = 1024
S = 4  # drawn at four times the size and scaled down, for smooth edges
BG = ((13, 17, 23), (22, 27, 34))  # the dark banner's background gradient
ACCENT = ((88, 166, 255), (188, 140, 255))  # the banner's accent gradient
ADD, REM, CTX = (63, 185, 80), (248, 81, 73), (48, 54, 61)
ORANGE = (240, 136, 62)  # the 🔶 of the summary line

def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))

def gradient(w, h, a, b, diagonal):
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = mix(a, b, (x + y) / (w + h) if diagonal else x / w)
    return img

def rounded(w, h, r):
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return mask

n = SIZE * S
small = 256  # gradients are computed small and scaled up; they are smooth anyway
icon = Image.new('RGBA', (n, n), (0, 0, 0, 0))
icon.paste(gradient(small, small, *ACCENT, True).resize((n, n)), (0, 0), rounded(n, n, 200 * S))
inset = 28 * S
icon.paste(gradient(small, small, *BG, True).resize((n - 2 * inset,) * 2), (inset, inset), rounded(n - 2 * inset, n - 2 * inset, 172 * S))

d = ImageDraw.Draw(icon)
# The diff, drawn as bars, fading towards the fold.
for i, (kind, width, alpha) in enumerate([(CTX, 560, 255), (REM, 470, 255), (ADD, 640, 210), (ADD, 520, 150)]):
    y = (190 + i * 78) * S
    layer = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((170 * S, y, (170 + width) * S, y + 40 * S), 20 * S, fill=kind + (alpha,))
    icon = Image.alpha_composite(icon, layer)
d = ImageDraw.Draw(icon)
# The fold: a chevron between the diff and its summary.
cx, cy = 512 * S, 560 * S
d.line([(cx - 70 * S, cy), (cx, cy + 50 * S), (cx + 70 * S, cy)], fill=(139, 148, 158), width=22 * S, joint='curve')
# The summary line: the diamond, then one bar in the accent gradient.
dy, dx, r = 740 * S, 230 * S, 62 * S
d.polygon([(dx, dy - r), (dx + r, dy), (dx, dy + r), (dx - r, dy)], fill=ORANGE)
bar = (330 * S, dy - 30 * S, 850 * S, dy + 30 * S)
icon.paste(gradient(small, 16, *ACCENT, False).resize((bar[2] - bar[0], bar[3] - bar[1])), bar[:2], rounded(bar[2] - bar[0], bar[3] - bar[1], 30 * S))

icon.resize((SIZE, SIZE), Image.LANCZOS).save(OUT, optimize=True)
