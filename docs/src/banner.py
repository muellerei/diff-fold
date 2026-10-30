# Writes docs/images/banner-light.svg and docs/images/banner-dark.svg: a card of diff lines that folds into one
# summary line, looping, beside the name.
# Run: python3 docs/src/banner.py [output directory]
import os, sys
from common import ICON
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
T = {
 'light': dict(bg1='#ffffff', bg2='#eef3fb', dot='#0d1117', dota='0.07', card='#f6f8fa', stroke='#c3ccd6', title='#1f2328', sub='#31363d', small='#59636e', a1='#0284c7', a2='#7c3aed', add='#1a7f37', rem='#cf222e', ctx='#c3ccd6'),
 'dark':  dict(bg1='#0d1117', bg2='#161b22', dot='#ffffff', dota='0.06', card='#161b22', stroke='#30363d', title='#e6edf3', sub='#c9d1d9', small='#8b949e', a1='#58a6ff', a2='#bc8cff', add='#3fb950', rem='#f85149', ctx='#30363d'),
}
# The diff in the card: (kind, width) per line, drawn as bars.
LINES = [('ctx', 150), ('rem', 120), ('add', 170), ('add', 136), ('ctx', 96), ('rem', 110), ('add', 160), ('add', 128)]

def svg(theme, w, h):
    c = T[theme]
    bars = ''.join(
        f'<rect x="20" y="{22 + i * 16}" width="{wd}" height="8" rx="4" fill="{c[kind]}"/>' for i, (kind, wd) in enumerate(LINES))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="diff-fold: one summary line per file instead of the diff under a finished Claude Code edit">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c['bg1']}"/><stop offset="1" stop-color="{c['bg2']}"/></linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{c['a1']}"/><stop offset="1" stop-color="{c['a2']}"/></linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="{c['dot']}" opacity="{c['dota']}"/></pattern>
    <style>
      .mono {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }}
      .sans {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }}
      .diff {{ animation: diff 5s ease-in-out infinite; transform-box: fill-box; transform-origin: top; }}
      @keyframes diff {{ 0%, 35% {{ transform: scaleY(1); opacity: 1; }} 55% {{ transform: scaleY(0.08); opacity: 0; }} 85% {{ transform: scaleY(0.08); opacity: 0; }} 100% {{ transform: scaleY(1); opacity: 1; }} }}
      .line {{ animation: line 5s ease-in-out infinite; }}
      @keyframes line {{ 0%, 45% {{ opacity: 0; }} 58%, 85% {{ opacity: 1; }} 95%, 100% {{ opacity: 0; }} }}
    </style>
  </defs>
  <rect width="{w}" height="{h}" rx="24" fill="url(#bg)"/>
  <rect width="{w}" height="{h}" rx="24" fill="url(#dots)"/>
  <g transform="translate(110 {(h - 170) / 2})">
    <rect width="230" height="170" rx="22" fill="{c['card']}" stroke="url(#accent)" stroke-width="3"/>
    <g class="diff">{bars}</g>
    <g class="line"><text x="20" y="40" class="mono" font-size="17">{ICON}</text><rect x="48" y="28" width="150" height="10" rx="5" fill="url(#accent)"/></g>
  </g>
  <text x="430" y="{h / 2 + 4}" class="mono" font-size="78" font-weight="700" fill="{c['title']}" letter-spacing="-2">diff<tspan fill="url(#accent)">-</tspan>fold</text>
  <text x="434" y="{h / 2 + 56}" class="sans" font-size="30" fill="{c['sub']}">One line per file instead of the diff</text>
  <text x="434" y="{h / 2 + 100}" class="sans" font-size="21" fill="{c['small']}">for Claude Code · small diffs, reviews and errors stay in full</text>
</svg>
'''

for th in T:
    open(os.path.join(OUT, f'banner-{th}.svg'), 'w', encoding='utf-8').write(svg(th, 1280, 320))
