import { expect, test } from 'claude-code/testing'

import { countCell, countHunks, firstChangedLine, linesOf, sum } from './counts'

test('countHunks counts added and removed lines over every hunk, never context', async () => {
  expect(countHunks([{ lines: [' a', '-b', '+c', '+d'] }, { lines: ['-e'] }])).toEqual({ added: 2, removed: 2 })
  expect(countHunks([])).toEqual({ added: 0, removed: 0 })
  expect(countHunks(undefined)).toEqual({ added: 0, removed: 0 })
})

test('sum adds changes up', async () => {
  expect(
    sum([
      { added: 1, removed: 2 },
      { added: 3, removed: 0 },
    ]),
  ).toEqual({ added: 4, removed: 2 })
  expect(sum([])).toEqual({ added: 0, removed: 0 })
})

test('firstChangedLine is the new-file line of the first change, counted past the context before it', async () => {
  expect(firstChangedLine([{ newStart: 10, lines: [' a', ' b', '-c', '+d'] }])).toBe(12)
  expect(firstChangedLine([{ newStart: 1, lines: ['+a'] }])).toBe(1)
})

test('firstChangedLine has no line without a start or without a change', async () => {
  expect(firstChangedLine([{ lines: ['+a'] }])).toBeUndefined()
  expect(firstChangedLine([{ newStart: 3, lines: [' a'] }])).toBeUndefined()
  expect(firstChangedLine([])).toBeUndefined()
})

test('linesOf counts lines, a final newline is no extra line, empty text has none', async () => {
  expect(linesOf('a\nb\n')).toBe(2)
  expect(linesOf('a')).toBe(1)
  expect(linesOf('')).toBe(0)
  expect(linesOf(undefined)).toBe(0)
})

test('countCell counts the lines on one side only, repeated lines once each', async () => {
  expect(countCell('a\nb\nb', 'b\nc\nc')).toEqual({ added: 2, removed: 2 })
  expect(countCell(undefined, 'x\ny')).toEqual({ added: 2, removed: 0 })
  expect(countCell('x', '')).toEqual({ added: 0, removed: 1 })
})
