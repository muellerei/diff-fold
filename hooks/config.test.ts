import { expect, test } from 'claude-code/testing'

import { DEFAULTS, settingsFrom } from './config'

test('no settings are the defaults', async () => {
  expect(settingsFrom({})).toEqual(DEFAULTS)
})

test('the settings given are taken, the icon trimmed, the line count whole', async () => {
  expect(settingsFrom({ smallDiffLines: 0, icon: ' * ' })).toEqual({ smallDiffLines: 0, icon: '*' })
  expect(settingsFrom({ smallDiffLines: 7.9 })).toEqual({ ...DEFAULTS, smallDiffLines: 7 })
  expect(settingsFrom({ icon: '' })).toEqual({ ...DEFAULTS, icon: '' })
})

test('a line count that is no count, or below 0, falls back to the default', async () => {
  for (const smallDiffLines of ['many', -1, Number.NaN]) expect(settingsFrom({ smallDiffLines }).smallDiffLines).toBe(DEFAULTS.smallDiffLines)
})
