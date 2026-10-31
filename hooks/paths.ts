// `path` relative to `root` when it lies inside it, else `path` as it came.
//
// The path keeps its own separators, as the row above the summary shows it; backslashes are folded only to compare.
// Windows paths ignore case, elsewhere a folder that differs only in case is another folder.
export function relativeTo(path: string, root: string): string {
  if (!root) return path
  const fold = (text: string) => text.replace(/\\/g, '/')
  const dir = fold(root).replace(/\/+$/, '') + '/'
  const isWindows = /^([a-z]:\/|\/\/)/i.test(dir)
  const head = fold(path).slice(0, dir.length)
  const isInside = isWindows ? head.toLowerCase() === dir.toLowerCase() : head === dir
  // Folding keeps every length, so the length of the folded root cuts the original path.
  return isInside && path.length > dir.length ? path.slice(dir.length) : path
}

// One keepFull pattern as a RegExp over a path relative to the project, with `.gitignore` rules: a trailing `/` matches
// only a folder, a `/` at the start or in the middle anchors the pattern at the project root (else it matches at any
// level), `*` and `?` stay inside one folder, and `**` spans folders. Character classes and backslash escapes are not
// supported and match as written; everything else matches literally. Unlike .gitignore, case does not count: the default
// file systems of macOS and Windows ignore it, so `Migrations/` names the folder `migrations/` there, and a pattern that
// matches too much only leaves more in full.
function patternToRegex(pattern: string): RegExp {
  const isDirOnly = pattern.endsWith('/')
  const body = isDirOnly ? pattern.slice(0, -1) : pattern
  const isAnchored = body.includes('/')
  const core = body.replace(/^\//, '')
  let source = ''
  for (let i = 0; i < core.length; i++) {
    if (core.startsWith('**/', i)) {
      source += '(?:.*/)?'
      i += 2
    } else if (core.startsWith('/**', i) && i + 3 === core.length) {
      source += '/.*'
      i += 2
    } else if (core.startsWith('**', i)) {
      source += '.*'
      i += 1
    } else if (core[i] === '*') source += '[^/]*'
    else if (core[i] === '?') source += '[^/]'
    else source += core[i]!.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  // A name that matches may be a folder the file lies in, so a file pattern ends at a slash or at the end.
  return new RegExp((isAnchored ? '^' : '(^|/)') + source + (isDirOnly ? '/' : '(/|$)'), 'i')
}

// Whether a path relative to the project matches any of the patterns. Compiled once, when the settings load.
export function matcherFor(patterns: readonly string[]): (relativePath: string) => boolean {
  const regexes = patterns.map(patternToRegex)
  return relativePath => {
    const slashed = relativePath.replace(/\\/g, '/')
    return regexes.some(regex => regex.test(slashed))
  }
}
