import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(import.meta.dirname, '../../src')

const forbiddenWorkspaceDeps = ['@runtimee/sdk', '@runtimee/node']

function walk(dir: string): string[] {
  const files: string[] = []
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        files.push(...walk(full))
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        files.push(full)
      }
    }
  } catch { /* skip */ }
  return files
}

function parseImports(source: string): string[] {
  const imports: string[] = []
  const re = /import(?: type)?\s+(?:\{[^}]*\}|[^'"]+)\s+from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source)) !== null) imports.push(m[1])
  return imports
}

describe('@runtimee/evm — adapter isolation invariants', () => {
  const files = walk(SRC)
  const wsViolations: { file: string; imp: string }[] = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const imports = parseImports(source)
    const rel = relative(SRC, file)

    for (const imp of imports) {
      if (forbiddenWorkspaceDeps.some((d) => imp.startsWith(d))) {
        wsViolations.push({ file: rel, imp })
      }
    }
  }

  it('must not import from @runtimee/sdk or @runtimee/node', () => {
    expect(wsViolations, fmt('forbidden workspace imports', wsViolations)).toHaveLength(0)
  })
})

function fmt(label: string, v: { file: string; imp: string }[]): string {
  return v.length ? `\n\n${label}:\n${v.map((x) => `  ${x.file} → ${x.imp}`).join('\n')}` : ''
}
