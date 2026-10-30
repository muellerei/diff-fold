// diff-fold: a finished edit's diff becomes one summary line per file. Everything that judges or counts lives in
// pure modules (summary.ts, counts.ts, paths.ts, config.ts); this file only wires them to the host.

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { StartRoot } from '../types'
import { settingsFrom } from './config'
import { drawSummary } from './draw'
import { summarize, withoutEditDiff } from './summary'

const COMMAND = 'diff-fold'
const STORE_KEY = 'isHiding'
const isHiding = atom({ plugin: 'diff-fold', key: 'isHiding' } as const, true)
const startRoot = atom({ plugin: 'diff-fold', key: 'startRoot' } as const, null as StartRoot)

export const register: Register = (on, options) => {
  const settings = settingsFrom(options)

  // The command is the switch. A key chord would need a button that stays drawn above the prompt to reach it, and
  // a line that is always there is what this mod leaves out.
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: COMMAND, description: 'Switch between one-line summaries and full diffs for file edits' })
    if ((await read($, startRoot)) === null) {
      const root = await $.session.root()
      await update($, startRoot, () => root)
    }
    const saved = await $.store.get(STORE_KEY)
    if (typeof saved === 'boolean') await update($, isHiding, () => saved)
    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    const nowHiding = await update($, isHiding, value => !value)
    await $.store.set(STORE_KEY, nowHiding)
    return { text: nowHiding ? 'Diffs hidden: each file edit shows one summary line.' : 'Diffs shown in full.' }
  }).catch(() => ({ text: 'diff-fold could not switch; the diffs stay as they were.' }))

  // Errors, ctrl+o and --verbose keep the engine's own drawing.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (e.props.isErrored || e.props.isExpanded || !(await read($, isHiding))) return next(e)
    const root = (await read($, startRoot)) ?? (await $.session.root())
    const summary = summarize(e.props.tool, e.props.output, root, settings.smallDiffLines)
    if (!summary) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    if (e.props.tool !== 'Bash') return drawSummary({ Box, Text }, summary, settings.icon)
    // A shell command keeps its own output, drawn by the engine without the diff; the summary follows it.
    const drawn = await next({ ...e, props: { ...e.props, output: withoutEditDiff(e.props.output) } })
    return (
      <Box flexDirection="column">
        {drawn}
        {drawSummary({ Box, Text }, summary, settings.icon)}
      </Box>
    )
  })
}
