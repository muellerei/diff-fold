// Tool results as the host reports them, for the tests.

// An Edit result as the tool reports it: two context lines, one removed, `added` added.
export function editOutput(filePath: string, added: number, extra: Record<string, unknown> = {}) {
  return {
    filePath,
    oldString: 'old',
    newString: 'new',
    originalFile: 'old',
    userModified: false,
    replaceAll: false,
    structuredPatch: [
      { oldStart: 10, oldLines: 3, newStart: 10, newLines: 2 + added, lines: [' a', ' b', '-old', ...Array.from({ length: added }, (_, i) => `+new ${i}`)] },
    ],
    ...extra,
  }
}

export function shellFile(filePath: string, added: number, extra: Record<string, unknown> = {}) {
  return { filePath, hunks: [{ oldStart: 1, oldLines: 0, newStart: 4, newLines: added, lines: Array.from({ length: added }, () => '+x') }], ...extra }
}
