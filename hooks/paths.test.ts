import { expect, test } from 'claude-code/testing'

import { matcherFor, relativeTo } from './paths'

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

test('keepFull patterns match as in .gitignore: at any level, anchored by a slash, ** across folders', async () => {
  const rows: [string, string, boolean][] = [
    ['migrations/', 'migrations/1.sql', true],
    ['migrations/', 'db/migrations/1.sql', true],
    ['migrations/', 'migrations.sql', false],
    ['db/migrations/', 'db/migrations/1.sql', true],
    ['db/migrations/', 'x/db/migrations/1.sql', false],
    ['/build/', 'build/a', true],
    ['/build/', 'src/build/a', false],
    ['*.sql', 'a.sql', true],
    ['*.sql', 'db/a.sql', true],
    ['*.sql', 'a.sql.bak', false],
    ['schema.prisma', 'prisma/schema.prisma', true],
    ['infra/*.tf', 'infra/main.tf', true],
    ['infra/*.tf', 'infra/mod/main.tf', false],
    ['migrations/**', 'migrations/2024/1.sql', true],
    ['**/migrations/', 'a/b/migrations/1.sql', true],
    ['src/**/*.sql', 'src/a.sql', true],
    ['src/**/*.sql', 'src/a/b/c.sql', true],
    ['a?.ts', 'ab.ts', true],
    ['a?.ts', 'a/.ts', false],
    ['a+b.ts', 'a+b.ts', true],
    ['a+b.ts', 'aab.ts', false],
    ['Migrations/', 'migrations/x', true],
    ['migrations/', 'db\\migrations\\1.sql', true],
  ]
  for (const [pattern, path, matches] of rows) expect([pattern, path, matcherFor([pattern])(path)]).toEqual([pattern, path, matches])
})

test('no patterns match nothing; several match when any one does', async () => {
  expect(matcherFor([])('a.sql')).toBe(false)
  expect(matcherFor(['*.tf', '*.sql'])('db/a.sql')).toBe(true)
})
