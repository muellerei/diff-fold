# Compares the values written in more than one place with docs/src/common.py, so none of them drifts on its own:
# the defaults of the settings (plugin.json, config.ts, README), the Claude Code the mod is tested with (README,
# first entry of the CI matrix), and that the example in docs/images/fold.svg is large enough to be folded.
# Run: python3 docs/src/check.py
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ICON, SMALL_DIFF_LINES, TESTED_WITH
import fold

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
read = lambda path: open(os.path.join(ROOT, path), encoding='utf-8').read()
problems = []

def expect(what, found, wanted):
    if found != wanted:
        problems.append(f'{what}: {found!r}, expected {wanted!r}')

config = json.loads(read('.claude-plugin/plugin.json'))['userConfig']
expect('plugin.json smallDiffLines default', config['smallDiffLines']['default'], SMALL_DIFF_LINES)
expect('plugin.json icon default', config['icon']['default'], ICON)

defaults = re.search(r"DEFAULTS: Settings = \{ smallDiffLines: (\d+), icon: '([^']*)' \}", read('hooks/config.ts'))
expect('config.ts DEFAULTS', defaults and (int(defaults[1]), defaults[2]), (SMALL_DIFF_LINES, ICON))

readme = read('README.md')
row = re.search(r'\| `smallDiffLines` \| `(\d+)`', readme)
expect('README smallDiffLines default', row and int(row[1]), SMALL_DIFF_LINES)
row = re.search(r'\| `icon` +\| `([^`]*)`', readme)
expect('README icon default', row and row[1], ICON)
expect('README "(N by default)"', bool(re.search(rf'\({SMALL_DIFF_LINES} by default\)', readme)), True)
tested = re.search(r'Tested with Claude Code (\d+(?:\.\d+)+)', readme)
expect('README tested version', tested and tested[1], TESTED_WITH)

matrix = re.search(r"claude-code: \['([\d.]+)'", read('.github/workflows/check.yml'))
expect('CI matrix first entry', matrix and matrix[1], TESTED_WITH)

example = f'Changed {fold.PATH}:{fold.FIRST} (+{fold.ADDED} −{fold.REMOVED})'
expect('README alt text of fold.svg', example in readme, True)
expect('fold.svg example is folded by default', fold.ADDED + fold.REMOVED > SMALL_DIFF_LINES, True)

if problems:
    print('\n'.join(problems))
    sys.exit(1)
print('check.py: all values agree')
