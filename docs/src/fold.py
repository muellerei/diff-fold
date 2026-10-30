# Writes docs/images/fold.svg: the same edit without and with diff-fold, one above the other, for the top of the
# README. Static on purpose: it compares, it does not tell a sequence.
# Run: python3 docs/src/fold.py [output directory]
import os, sys
from common import HEAD, BASECSS, ICON
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
W, H = 780, 470
PATH = 'src/api/index.ts'
# The diff of the example edit: (new-file line, sign, text). Its counts below are taken from it.
DIFF = [
    (40, ' ', 'export async function load(id: string) {'),
    (41, '-', '  const res = await fetch(url(id))'),
    (41, '+', '  const res = await fetch(url(id), { signal })'),
    (42, '+', '  if (!res.ok) {'),
    (43, '+', '    throw new LoadError(id, res.status)'),
    (44, '+', '  }'),
    (45, '+', '  log.debug("loaded", id)'),
    (46, ' ', '  return res.json()'),
]
ADDED = sum(1 for _, s, _ in DIFF if s == '+')
REMOVED = sum(1 for _, s, _ in DIFF if s == '-')
FIRST = next(n for n, s, _ in DIFF if s != ' ')

def esc(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

rows = []
for i, (n, sign, text) in enumerate(DIFF):
    y = 152 + i * 22
    cls = {'+': 'g', '-': 'r', ' ': 'dim'}[sign]
    shown = '' if sign == '-' else str(n)
    rows.append(f'  <text x="76" y="{y}" text-anchor="end" class="dim s">{shown}</text><text x="88" y="{y}" class="{cls} s">{sign} {esc(text)}</text>')

SVG = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="t d">
  <title id="t">an edit's diff without and with diff-fold</title>
  <desc id="d">Above, Claude Code draws an edit of {PATH} with its full diff: {ADDED} lines added and {REMOVED} removed. Below, with diff-fold, the same edit takes one line: Changed {PATH}:{FIRST} (+{ADDED} −{REMOVED}).</desc>
  <style>
{BASECSS}    text {{ white-space: pre; }} .s {{ font-size: 13px; }} .h {{ font-size: 12px; letter-spacing: 1px; }}
  </style>
{HEAD.format(W=W, H=H, cx=W // 2)}
  <text x="36" y="72" class="dim h">WITHOUT</text>
  <text x="36" y="104" class="g">●</text><text x="56" y="104" class="fg">Update({PATH})</text>
  <text x="36" y="128" class="dim s">  ⎿  Updated {PATH} with {ADDED} additions and {REMOVED} removal{'' if REMOVED == 1 else 's'}</text>
{chr(10).join(rows)}

  <line x1="36" y1="{152 + len(DIFF) * 22}" x2="{W - 36}" y2="{152 + len(DIFF) * 22}" stroke="#30363d" stroke-width="1"/>

  <text x="36" y="{186 + len(DIFF) * 22}" class="dim h">WITH DIFF-FOLD</text>
  <text x="36" y="{218 + len(DIFF) * 22}" class="g">●</text><text x="56" y="{218 + len(DIFF) * 22}" class="fg">Update({PATH})</text>
  <text x="36" y="{242 + len(DIFF) * 22}" class="dim s">  ⎿  {ICON} Changed {PATH}:{FIRST} (<tspan class="g">+{ADDED}</tspan> <tspan class="r">−{REMOVED}</tspan>)</text>

  <text x="{W - 40}" y="{H - 18}" text-anchor="end" class="dim" style="font-size:12px">Drawn, not recorded.</text>
</svg>
'''
if __name__ == '__main__':
    open(os.path.join(OUT, 'fold.svg'), 'w', encoding='utf-8').write(SVG)
