// diff-fold: a finished edit's diff becomes one summary line per file. Everything that judges or counts lives in
// pure modules (summary.ts, counts.ts, paths.ts, config.ts); this file only wires them to the host.

import { atom, memberOf, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { StartRoot } from '../types'
import { settingsFrom } from './config'
import { drawSummary } from './draw'
import { summarize, touchesSensitiveFile, TOOLS, withoutEditDiff } from './summary'

const COMMAND = 'diff-fold'
const STORE_KEY = 'isHiding'
const isHiding = atom({ plugin: 'diff-fold', key: 'isHiding' } as const, true)
const isOpen = atom({ plugin: 'diff-fold', key: 'isOpen' } as const, false)
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

  // Errors, ctrl+o and --verbose keep the engine's own drawing. Under the fullscreen layout the host reports rows
  // as expanded that it draws folded, so `isExpanded` is read only on the main screen (shellcast reads it the same
  // way); in fullscreen `/diff-fold` is the way to full diffs.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!(TOOLS as readonly string[]).includes(e.props.tool)) return next(e)
    const isFullscreen = e.viewport?.isFullscreen === true
    const isExpanded = e.props.isExpanded === true
    const keptBecause = e.props.isErrored ? 'errored' : isExpanded && !isFullscreen ? 'expanded' : !(await read($, isHiding)) ? 'switched off' : undefined
    const root = (await read($, startRoot)) ?? (await $.session.root())
    const summary = keptBecause ? undefined : summarize(e.props.tool, e.props.output, root, settings.smallDiffLines)
    const open = memberOf(isOpen, e)
    const isOpened = summary !== undefined && isFullscreen && (await read($, open))
    // Debug log only, never the transcript, and no content: the tool, the decision and the two facts it turns on.
    const decision = isOpened
      ? 'in full, opened'
      : summary
        ? `folded, ${summary.files.length + summary.more} ${summary.files.length + summary.more === 1 ? 'file' : 'files'}`
        : `in full, ${keptBecause ?? (touchesSensitiveFile(e.props.tool, e.props.output) ? 'sensitive file' : 'small or no change')}`
    $.ui.log(`diff-fold: ${e.props.tool} ${decision} (isExpanded=${isExpanded}, fullscreen=${isFullscreen})`, { to: 'debug' })
    if (!summary) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    // Only under the fullscreen layout: there ctrl+o keeps the summaries and a click reaches the button. The main
    // screen reports no clicks, and ctrl+o already shows every diff there. No hotkey, so no key of a neighbour is taken.
    const button = isFullscreen && <Button key="diff" plain label={isOpened ? '▾ hide diff' : '▸ show diff'} onPress={() => update($, open, value => !value)} />
    if (isOpened)
      return (
        <Box flexDirection="column">
          {button}
          {await next(e)}
        </Box>
      )
    // A shell command keeps its own output, drawn by the engine without the diff; the summary follows it.
    const drawn = e.props.tool === 'Bash' && (await next({ ...e, props: { ...e.props, output: withoutEditDiff(e.props.output) } }))
    return (
      <Box flexDirection="column">
        {drawn}
        {drawSummary({ Box, Text }, summary, settings.icon)}
        {button}
      </Box>
    )
  })
}
