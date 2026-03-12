# Dual-Channel NPM Publishing Pipeline

**Date**: 2026-03-12
**Status**: Approved
**Author**: Claude (with user design approval)

## Problem

The fork (`claudecodeui-summer`) has no CI/CD pipeline for npm publishing. The upstream package `@siteboon/claude-code-ui` is published manually via `release.sh` + `release-it`. We need:

1. A **beta channel** for rapid testing of in-progress work
2. A **release channel** for stable, versioned packages
3. Separation between the two to avoid polluting the stable release line

## Design

### Package Identity

| Field | Value |
|---|---|
| npm name | `@fuhesummer/claude-code-ui` |
| npm scope | `@fuhesummer` (requires npmjs.com org) |
| Repository | `https://github.com/FuHesummer/claudecodeui-summer` |

### Branch Strategy

```
dev (daily development)
 │
 ├── push → beta.yml → npm publish @beta
 │
 └── merge PR → main → release.yml → npm publish @latest + GitHub Release
```

- `dev` is the default working branch. All feature/fix commits land here first.
- `main` is the stable release branch. Only receives merges from `dev` via PR.

### Beta Channel (`beta.yml`)

**Trigger**: Push to `dev` branch

**Version format**: `{base-version}-beta.{run-number}`
- Example: `1.25.0-beta.42`
- `base-version` comes from `package.json` `version` field
- `run-number` is GitHub Actions `${{ github.run_number }}` (auto-incrementing)

**Steps**:
1. Checkout code
2. Setup Node.js 22
3. `npm ci`
4. `npm run lint`
5. `npm run typecheck`
6. `npm run build`
7. Overwrite `package.json` version to `{version}-beta.{run_number}`
8. `npm publish --tag beta`

**npm tag**: `@beta` — users install via `npm i @fuhesummer/claude-code-ui@beta`

### Release Channel (`release.yml`)

**Trigger**: Push to `main` branch (from merge)

**Version format**: Determined by conventional commits since last tag
- `fix:` → patch bump (1.25.0 → 1.25.1)
- `feat:` → minor bump (1.25.0 → 1.26.0)
- `BREAKING CHANGE` → major bump (1.25.0 → 2.0.0)

**Steps**:
1. Checkout code (with full history for conventional-commits analysis)
2. Setup Node.js 22
3. Configure git user for release commit
4. `npm ci`
5. `npm run lint`
6. `npm run typecheck`
7. `npm run build`
8. Run `release-it` with CI flags (auto-bump version, create git tag, GitHub Release, npm publish)

**npm tag**: `@latest` (default) — users install via `npm i @fuhesummer/claude-code-ui`

### Secrets Required

| Secret | Purpose |
|---|---|
| `NPM_TOKEN` | npm authentication for `npm publish` |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions for releases + tags |

### File Changes

| File | Change |
|---|---|
| `package.json` | `name` → `@fuhesummer/claude-code-ui`, update `repository`/`homepage`/`bugs` URLs |
| `.release-it.json` | Update `releaseName`, keep conventional-changelog config |
| `.github/workflows/beta.yml` | **NEW** — beta publish workflow |
| `.github/workflows/release.yml` | **NEW** — release publish workflow |
| `.npmrc` | **NEW** — npm auth config for CI (`//registry.npmjs.org/:_authToken=${NPM_TOKEN}`) |

### What We Keep

- `release.sh` — still works for local manual releases
- `.release-it.json` — reused by `release.yml` workflow
- `discord-release.yml` — still triggers on GitHub Release publish
- Existing `prepublishOnly` script in `package.json`
- Existing `husky` + `lint-staged` + `commitlint` hooks for local dev

### Install Commands for End Users

```bash
# Stable release
npm install @fuhesummer/claude-code-ui

# Latest beta
npm install @fuhesummer/claude-code-ui@beta

# Specific beta
npm install @fuhesummer/claude-code-ui@1.25.0-beta.42
```

## User Prerequisites

Before the pipeline can work:

1. Create `@fuhesummer` organization on npmjs.com
2. Generate npm access token (Automation type recommended)
3. Add `NPM_TOKEN` secret to GitHub repo settings (Settings → Secrets → Actions)
4. Create `dev` branch from current `main`

## Security Considerations

- `NPM_TOKEN` stored as GitHub encrypted secret, never exposed in logs
- `node-pty` requires native compilation — workflow uses Ubuntu runner with build tools
- `postinstall` script (`node scripts/fix-node-pty.js`) runs during `npm ci`
- `prepublishOnly` runs `npm run build` automatically before publish

## Relationship to Upstream

- Package name changes from `@siteboon/claude-code-ui` to `@fuhesummer/claude-code-ui`
- This is a completely separate npm package — no conflict with upstream publishing
- Upstream's `release.sh` / `.release-it.json` patterns are preserved and adapted
