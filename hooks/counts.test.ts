import { expect, test } from 'claude-code/testing'

import { countCell, countHunks, firstChangedLine, isWhitespaceOnly, linesOf, placesOf, sum } from './counts'

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

test('placesOf counts the hunks that change something; context alone is no place', async () => {
  expect(placesOf([{ lines: [' a', '-b'] }, { lines: ['+c'] }, { lines: [' d'] }])).toBe(2)
  expect(placesOf([])).toBe(0)
  expect(placesOf(undefined)).toBe(0)
})

test('isWhitespaceOnly: indentation, tabs, trailing spaces and blank lines count, a changed or joined token or space inside a line does not', async () => {
  expect(isWhitespaceOnly([{ lines: [' a', '-  foo()', '+    foo()'] }])).toBe(true)
  expect(isWhitespaceOnly([{ lines: ['-\tif (x) {', '+  if (x) {'] }, { lines: ['-x\t', '+x'] }])).toBe(true)
  expect(isWhitespaceOnly([{ lines: [' a()', '+', '+  ', ' b()'] }, { lines: ['-', ' c()'] }])).toBe(true)
  expect(isWhitespaceOnly([{ lines: ['-  foo()', '+  bar()'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-a b', '+ab'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-x = "a  b"', '+x = "a b"'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-  foo()', '+    foo()'] }, { lines: ['-x', '+y'] }])).toBe(false)
})

test('isWhitespaceOnly: lines that change places or a line break that moves are no whitespace change', async () => {
  expect(isWhitespaceOnly([{ lines: ['-a()', ' b()', '+a()'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-// x', '-run()', '+// x run()'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-cd build', '-make', '+cd build make'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-call(a,', '-  b)', '+call(a, b)'] }])).toBe(false)
})

test('isWhitespaceOnly: a place with text that spans lines is never whitespace only, since its indentation is content', async () => {
  expect(isWhitespaceOnly([{ lines: ['-const s = `a', '-  b`', '+  const s = `a', '+    b`'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: [' s = """', '-a', '+  a', ' """'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: [" s = '''", '-a', '+  a', " '''"] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: [' cat <<EOF', '-hello', '+  hello', ' EOF'] }])).toBe(false)
  expect(isWhitespaceOnly([{ lines: ['-run a \\ ', '+run a \\', ' b'] }])).toBe(false)
})

test('isWhitespaceOnly: no patch, or one that changes nothing, is no whitespace-only change', async () => {
  expect(isWhitespaceOnly([])).toBe(false)
  expect(isWhitespaceOnly(undefined)).toBe(false)
  expect(isWhitespaceOnly([{ lines: [' a'] }])).toBe(false)
})
