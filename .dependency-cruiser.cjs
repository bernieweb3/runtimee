/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    /* ── Package Boundary Rules ─────────────────────────────────
     *
     * Each rule: if `from` matches AND `to` matches, it's a violation.
     * We only forbid imports that cross illegal package boundaries.
     */

    {
      name: 'core-no-internal-deps',
      comment: '@runtimee/core must not import from evm, sdk, or node',
      severity: 'error',
      from: { path: '^packages/core/' },
      to:   { path: '^packages/(?:evm|sdk|node)' },
    },

    {
      name: 'evm-no-sdk-or-node',
      comment: '@runtimee/evm may only import from @runtimee/core (not sdk/node)',
      severity: 'error',
      from: { path: '^packages/evm/' },
      to:   { path: '^packages/(?:sdk|node)' },
    },

    {
      name: 'sdk-no-evm-or-node',
      comment: '@runtimee/sdk may only import from @runtimee/core (not evm/node)',
      severity: 'error',
      from: { path: '^packages/sdk/' },
      to:   { path: '^packages/(?:evm|node)' },
    },

    {
      name: 'no-circular-deps',
      comment: 'Circular dependencies between packages are forbidden',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],

  options: {
    includeOnly: '^packages/[^/]+/(?:src|dist)',

    exclude: {
      path: ['node_modules', '\\.test\\.', '\\.spec\\.', '\\.d\\.ts$'],
    },

    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm'],
    },

    tsPreCompilationDeps: true,
    combinedDependencies: true,
  },
}
