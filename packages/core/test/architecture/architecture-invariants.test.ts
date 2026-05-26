import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(import.meta.dirname, '../../src')

const blockchains = [
  'viem', '@viem', 'ethers', '@ethersproject', 'web3', 'wagmi',
  '@wagmi', '@solana', '@cosmjs', '@polkadot', 'near-api-js',
  '@near-js', '@injectivelabs', 'alchemy-sdk', 'moralis', 'thirdweb',
]

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

function getModuleName(p: string): string {
  if (p.startsWith('@')) {
    return p.split('/').slice(0, 2).join('/')
  }
  if (p.startsWith('.') || p.startsWith('/')) return ''
  return p.split('/')[0]
}

describe('@runtimee/core — architecture invariants', () => {
  const files = walk(SRC)
  const blockViolations: { file: string; imp: string }[] = []
  const nodeViolations: { file: string; imp: string }[] = []
  const wsViolations: { file: string; imp: string }[] = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const imports = parseImports(source)
    const rel = relative(SRC, file)

    for (const imp of imports) {
      const mod = getModuleName(imp)

      if (blockchains.some((b) => mod.startsWith(b))) {
        blockViolations.push({ file: rel, imp })
      }

      if (nodeBuiltins.includes(mod)) {
        nodeViolations.push({ file: rel, imp })
      }

      if (imp.startsWith('@runtimee/')) {
        wsViolations.push({ file: rel, imp })
      }
    }
  }

  it('must not import blockchain libraries (viem, ethers, web3, etc.)', () => {
    expect(blockViolations, fmt('blockchain imports', blockViolations)).toHaveLength(0)
  })

  it('must not import Node.js builtins (fs, crypto, http, path, etc.)', () => {
    expect(nodeViolations, fmt('Node builtins', nodeViolations)).toHaveLength(0)
  })

  it('must not import from other @runtimee packages', () => {
    expect(wsViolations, fmt('forbidden workspace imports', wsViolations)).toHaveLength(0)
  })
})

function fmt(label: string, v: { file: string; imp: string }[]): string {
  return v.length ? `\n\n${label}:\n${v.map((x) => `  ${x.file} → ${x.imp}`).join('\n')}` : ''
}
