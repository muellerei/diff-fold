// The settings from `plugin.json` (`userConfig`), read once per load. A value of the wrong kind falls back to the
// default rather than hiding every diff or none.

export type Settings = { smallDiffLines: number; icon: string; keepFull: string[] }

export const DEFAULTS: Settings = { smallDiffLines: 5, icon: '🔶', keepFull: [] }

export function settingsFrom(options: Record<string, unknown>): Settings {
  const lines = Number(options.smallDiffLines ?? DEFAULTS.smallDiffLines)
  const icon = options.icon
  return {
    smallDiffLines: Number.isFinite(lines) && lines >= 0 ? Math.floor(lines) : DEFAULTS.smallDiffLines,
    icon: typeof icon === 'string' ? icon.trim() : DEFAULTS.icon,
    keepFull: patternsFrom(options.keepFull),
  }
}

// The keepFull patterns: a list in settings.json, or one text separated by commas, which is how `/plugin configure`
// stores a field that allows several values (measured, Claude Code 2.1.316). A pattern starting with `!` is dropped,
// since the setting only adds to what stays in full and never takes anything off; so is one that is nothing but
// slashes, which would match every path outside the project.
function patternsFrom(value: unknown): string[] {
  const items = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : []
  return items
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().replace(/\\/g, '/'))
    .filter(item => item.replace(/\//g, '') !== '' && !item.startsWith('!'))
}
