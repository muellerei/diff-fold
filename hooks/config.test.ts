import { expect, test } from 'claude-code/testing'

import { DEFAULTS, settingsFrom } from './config'

test('no settings are the defaults', async () => {
  expect(settingsFrom({})).toEqual(DEFAULTS)
})

test('the settings given are taken, the icon trimmed, the line count whole', async () => {
  expect(settingsFrom({ smallDiffLines: 0, icon: ' * ' })).toEqual({ ...DEFAULTS, smallDiffLines: 0, icon: '*' })
  expect(settingsFrom({ smallDiffLines: 7.9 })).toEqual({ ...DEFAULTS, smallDiffLines: 7 })
  expect(settingsFrom({ icon: '' })).toEqual({ ...DEFAULTS, icon: '' })
})

test('a line count that is no count, or below 0, falls back to the default', async () => {
  for (const smallDiffLines of ['many', -1, Number.NaN]) expect(settingsFrom({ smallDiffLines }).smallDiffLines).toBe(DEFAULTS.smallDiffLines)
})

test('keepFull comes as a list or as one text separated by commas, as /plugin configure stores it', async () => {
  expect(settingsFrom({ keepFull: ['db/', '*.tf'] }).keepFull).toEqual(['db/', '*.tf'])
  expect(settingsFrom({ keepFull: 'db/, *.tf' }).keepFull).toEqual(['db/', '*.tf'])
})

test('keepFull drops what is no pattern: blanks, negations, a bare slash, and values of another kind', async () => {
  expect(settingsFrom({ keepFull: '!x, , /, *.sql' }).keepFull).toEqual(['*.sql'])
  expect(settingsFrom({ keepFull: [1, null, ' ', ' a/ '] }).keepFull).toEqual(['a/'])
  for (const keepFull of [3, true, { a: 1 }, undefined]) expect(settingsFrom({ keepFull }).keepFull).toEqual([])
})
