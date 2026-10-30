// The project root when the session started; paths stay relative to it after `/cd` or a worktree move.
export type StartRoot = string | null

// The values diff-fold keeps in `$.state` for the session.
declare module 'claude-code' {
  interface PluginState {
    'diff-fold': {
      // Whether diffs are summed up; also written to `$.store`, so the choice outlives the session.
      isHiding: boolean
      // Per tool result: whether its fullscreen button has opened the diff. Session only.
      isOpen: boolean
      startRoot: StartRoot
    }
  }
}
