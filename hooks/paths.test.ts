import { expect, test } from 'claude-code/testing'

import { relativeTo } from './paths'

test('a path inside the root loses the root, with or without a trailing slash on it', async () => {
  expect(relativeTo('/repo/src/a.ts', '/repo')).toBe('src/a.ts')
  expect(relativeTo('/repo/src/a.ts', '/repo/')).toBe('src/a.ts')
})

test('a path outside the root, or a sibling that only starts like it, stays whole', async () => {
  expect(relativeTo('/other/a.ts', '/repo')).toBe('/other/a.ts')
  expect(relativeTo('/repo-two/a.ts', '/repo')).toBe('/repo-two/a.ts')
  expect(relativeTo('/repo', '/repo')).toBe('/repo')
})

test('outside Windows a folder that differs only in case is another folder', async () => {
  expect(relativeTo('/Repo/a.ts', '/repo')).toBe('/Repo/a.ts')
})

test('Windows: case and separators do not count, and the path keeps its own separators', async () => {
  expect(relativeTo('C:\\repo\\src\\a.ts', 'C:/repo')).toBe('src\\a.ts')
  expect(relativeTo('c:/Repo/src/a.ts', 'C:\\repo\\')).toBe('src/a.ts')
})

test('no root leaves the path as it came', async () => {
  expect(relativeTo('/repo/a.ts', '')).toBe('/repo/a.ts')
})
