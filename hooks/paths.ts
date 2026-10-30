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
