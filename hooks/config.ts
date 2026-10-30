// The settings from `plugin.json` (`userConfig`), read once per load. A value of the wrong kind falls back to the
// default rather than hiding every diff or none.

export type Settings = { smallDiffLines: number; icon: string }

export const DEFAULTS: Settings = { smallDiffLines: 5, icon: '🔶' }

export function settingsFrom(options: Record<string, unknown>): Settings {
  const lines = Number(options.smallDiffLines ?? DEFAULTS.smallDiffLines)
  const icon = options.icon
  return {
    smallDiffLines: Number.isFinite(lines) && lines >= 0 ? Math.floor(lines) : DEFAULTS.smallDiffLines,
    icon: typeof icon === 'string' ? icon.trim() : DEFAULTS.icon,
  }
}
