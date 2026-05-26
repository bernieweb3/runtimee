# Changesets

Runtimee uses [Changesets](https://github.com/changesets/changesets) for package versioning and npm publishing.

## Workflow

### 1. Create a changeset

When you make a change that should produce a release:

```bash
pnpm changeset
```

This prompts you to:
- Select which packages changed (space to select, enter to confirm)
- Choose the bump type (`major`, `minor`, `patch`)
- Write a summary (used in the changelog)

A markdown file is created in `.changeset/` — commit it with your code.

### 2. Version

When ready to release:

```bash
pnpm version
```

This consumes all pending changeset files, bumps package versions, updates internal workspace dependencies, and generates changelogs.

### 3. Publish

```bash
pnpm release
```

This builds all packages, versions them, publishes to npm, and creates git tags.

## Publishing Scope

| Package | npm | Published? |
|---------|-----|-----------|
| `@runtimee/core` | `@runtimee/core` | Yes |
| `@runtimee/evm` | `@runtimee/evm` | Yes |
| `@runtimee/sdk` | `@runtimee/sdk` | Yes |
| `@runtimee/node` | — | No (private) |

## Versioning Strategy

| Stage | Semver | Policy |
|-------|--------|--------|
| Pre-1.0 (current) | `0.x` | Any change = patch bump |
| Post-1.0 | `1.x+` | major = breaking, minor = feature, patch = fix |

## Interdependency Handling

When `@runtimee/core` is bumped, Changesets automatically updates the version ranges of all packages that depend on it (`evm`, `sdk`). This is controlled by the `updateInternalDependencies: "patch"` setting.

Example: If core gets a patch bump (`0.1.0 → 0.1.1`), evm's dependency changes from `workspace:*` to `^0.1.1`. No manual range updating needed.

## CI Integration

The release workflow (`.github/workflows/release.yml`) runs on pushes to `master`:

1. Creates a PR with version bumps and changelogs
2. On merge, publishes changed packages to npm
3. Creates GitHub releases with changelog content

## Manual Release

For a one-off release:

```bash
pnpm changeset       # Create changeset files
pnpm changeset version  # Consume them
git add -A
git commit -m "chore: version packages"
git push --follow-tags
pnpm changeset publish  # Publish to npm
```
