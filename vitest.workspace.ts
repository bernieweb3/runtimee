import { defineWorkspace } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const resolve = (p: string) => path.resolve(__dirname, p)

/**
 * Resolve @runtimee/* to source directories so that:
 * 1. Tests always run against TypeScript source, not compiled dist/
 * 2. Coverage tracks source files, not generated output
 * 3. No need to rebuild between test runs for cross-package changes
 */
const alias = {
  '@runtimee/core': resolve('packages/core/src'),
  '@runtimee/evm': resolve('packages/evm/src'),
  '@runtimee/sdk': resolve('packages/sdk/src'),
}

/** Only track source files in coverage, skip generated dist/ and config */
const coverage = {
  include: ['src/**/*.ts'],
  exclude: ['**/*.d.ts', '**/*.test.ts', '**/*.config.ts', '**/dist/**'],
  all: false,
}

export default defineWorkspace([
  /* ── @runtimee/core ─────────────────────────────────── */
  {
    test: {
      name: 'core:unit',
      root: './packages/core',
      include: ['test/**/*.test.ts'],
      exclude: ['test/**/*.integration.test.ts', 'test/**/*.e2e.test.ts'],
      coverage: {
        ...coverage,
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
    resolve: { alias },
  },

  /* ── @runtimee/evm ──────────────────────────────────── */
  {
    test: {
      name: 'evm:unit',
      root: './packages/evm',
      include: ['test/**/*.test.ts'],
      exclude: ['test/**/*.integration.test.ts', 'test/**/*.e2e.test.ts'],
      coverage: { ...coverage },
    },
    resolve: { alias },
  },
  {
    test: {
      name: 'evm:integration',
      root: './packages/evm',
      include: ['test/**/*.integration.test.ts'],
      coverage: { ...coverage },
    },
    resolve: { alias },
  },

  /* ── @runtimee/sdk ──────────────────────────────────── */
  {
    test: {
      name: 'sdk:unit',
      root: './packages/sdk',
      include: ['test/**/*.test.ts'],
      exclude: ['test/**/*.integration.test.ts', 'test/**/*.e2e.test.ts'],
      coverage: { ...coverage },
    },
    resolve: { alias },
  },

  /* ── @runtimee/node ─────────────────────────────────── */
  {
    test: {
      name: 'node:unit',
      root: './packages/node',
      include: ['test/**/*.test.ts'],
      exclude: ['test/**/*.integration.test.ts', 'test/**/*.e2e.test.ts'],
      coverage: { ...coverage },
    },
    resolve: { alias },
  },
  {
    test: {
      name: 'node:integration',
      root: './packages/node',
      include: ['test/**/*.integration.test.ts'],
      coverage: { ...coverage },
    },
    resolve: { alias },
  },
])
