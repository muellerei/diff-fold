// How a summary is drawn: one dim line per file, `🔶 Changed src/a.ts:42 (+12 −3)`, the counts in the theme's
// colours for added and removed. Takes the elements of the surface that draws, so it needs no `$`.

import type { EngineInterface, RenderElement } from 'claude-code'

import type { Summary } from './summary'

type Elements = Pick<ReturnType<EngineInterface['ui']['resolve']>, 'Box' | 'Text'>

// ` and 2 more places` after the first changed line, nothing for a change in one place.
const placesNote = (places: number | undefined) => (places && places > 1 ? ` and ${places - 1} more ${places === 2 ? 'place' : 'places'}` : '')

export function drawSummary({ Box, Text }: Elements, summary: Summary, icon: string): RenderElement {
  const lead = icon ? `${icon} ` : ''
  return (
    <Box flexDirection="column">
      {summary.files.map(file =>
        file.change ? (
          <Text dimColor>
            {lead}
            {file.verb} {file.where}
            {placesNote(file.places)} (<Text color="success">+{file.change.added}</Text> <Text color="error">−{file.change.removed}</Text>)
          </Text>
        ) : (
          <Text dimColor>
            {lead}
            {file.verb} {file.where} (no diff)
          </Text>
        ),
      )}
      {summary.more > 0 ? (
        <Text dimColor>
          {lead}and {summary.more} more {summary.more === 1 ? 'file' : 'files'}
        </Text>
      ) : null}
    </Box>
  )
}
