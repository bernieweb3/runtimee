import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(import.meta.dirname, '../../src')

const nodeBuiltins = [
  'fs', 'path', 'crypto', 'http', 'https', 'os', 'child_process',
  'stream', 'net', 'dns', 'buffer', 'events', 'assert', 'tls',
  'cluster', 'dgram', 'readline', 'repl', 'vm', 'worker_threads',
  'perf_hooks', 'async_hooks', 'v8', 'inspector', 'wasi',
  'diagnostics_channel',
]

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

describe('@runtimee/sdk — architecture invariants', () => {
  const files = walk(SRC)
  const nodeViolations: { file: string; imp: string }[] = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const imports = parseImports(source)
    const rel = relative(SRC, file)

    for (const imp of imports) {
      if (nodeBuiltins.includes(imp.split('/')[0])) {
        nodeViolations.push({ file: rel, imp })
      }
    }
  }

  it('must not import Node.js builtins (fs, crypto, http, path, etc.)', () => {
    expect(nodeViolations, fmt('Node builtins', nodeViolations)).toHaveLength(0)
  })
})

function fmt(label: string, v: { file: string; imp: string }[]): string {
  return v.length ? `\n\n${label}:\n${v.map((x) => `  ${x.file} → ${x.imp}`).join('\n')}` : ''
}
