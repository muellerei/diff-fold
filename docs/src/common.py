# Values the pictures and the README state; check.py compares the README, plugin.json, config.ts
# and the workflow against them, so none of them can drift on its own.
SMALL_DIFF_LINES = 5      # default of the smallDiffLines setting
ICON = '🔶'               # default of the icon setting
KEEP_FULL = []            # default of the keepFull setting, shown as "none" in the README
TESTED_WITH = '2.1.314'   # the Claude Code the mod is tested with (README, Install; first entry of the CI matrix)

HEAD = '''  <rect width="{W}" height="{H}" rx="10" fill="#0d1117"/>
  <rect width="{W}" height="34" rx="10" fill="#161b22"/><rect y="24" width="{W}" height="10" fill="#161b22"/>
  <circle cx="22" cy="17" r="5.5" fill="#ff5f56"/><circle cx="42" cy="17" r="5.5" fill="#ffbd2e"/><circle cx="62" cy="17" r="5.5" fill="#27c93f"/>
  <text x="{cx}" y="22" text-anchor="middle" class="dim" style="font-size:12px">diff-fold</text>
'''
BASECSS = '''    text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 15px; }
    .dim { fill: #8b949e; } .fg { fill: #e6edf3; } .y { fill: #e3b341; } .g { fill: #3fb950; } .r { fill: #f85149; } .b { fill: #58a6ff; }
'''
