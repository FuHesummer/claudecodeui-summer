# Dual-Channel NPM Publishing Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up automated npm publishing with separate beta (`@beta` tag on dev push) and release (`@latest` tag on main merge) channels for `@fuhesummer/claude-code-ui`.

**Architecture:** Two GitHub Actions workflows — `beta.yml` triggers on `dev` push to publish pre-release versions, `release.yml` triggers on `main` push to run `release-it` for stable version bumps + GitHub Releases. Package identity updated from `@siteboon` to `@fuhesummer` scope.

**Tech Stack:** GitHub Actions, npm registry, release-it with conventional-changelog plugin, Node.js 22

**Spec:** `docs/superpowers/specs/2026-03-12-npm-publishing-pipeline-design.md`

---

## Chunk 1: Package Identity & npm Config

### Task 1: Update package.json identity fields

**Files:**
- Modify: `package.json` (lines 2, 18-25)

- [ ] **Step 1: Update package name**

Change `name` from `@siteboon/claude-code-ui` to `@fuhesummer/claude-code-ui`:

```json
"name": "@fuhesummer/claude-code-ui",
```

- [ ] **Step 2: Update repository URL**

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/FuHesummer/claudecodeui-summer.git"
},
```

- [ ] **Step 3: Update homepage URL**

```json
"homepage": "https://github.com/FuHesummer/claudecodeui-summer#readme",
```

- [ ] **Step 4: Update bugs URL**

```json
"bugs": {
  "url": "https://github.com/FuHesummer/claudecodeui-summer/issues"
},
```

- [ ] **Step 5: Add publishConfig for scoped package access**

Scoped packages default to restricted on npm. Add `publishConfig` to ensure both beta and release publishes work:

```json
"publishConfig": {
  "access": "public"
}
```

Add this after the `license` field in `package.json`.

- [ ] **Step 6: Verify package.json is valid JSON**

Run: `node -e "require('./package.json'); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 7: Commit**

```bash
git add package.json
git commit -m "chore: update package identity to @fuhesummer/claude-code-ui"
```

### Task 2: Create .npmrc for CI authentication

**Files:**
- Create: `.npmrc`

- [ ] **Step 1: Create .npmrc file**

```
# CI auth is handled by actions/setup-node; this is for local npm publish only
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

This file provides npm auth for local manual publishing via `release.sh`. In CI, `actions/setup-node@v4` with `registry-url` creates its own `~/.npmrc` using `NODE_AUTH_TOKEN` — so this repo-level file is a fallback for local use only. When `NPM_TOKEN` is not set locally, this is a harmless no-op.

- [ ] **Step 2: Verify .npmrc is not in .gitignore**

Run: `grep -n '\.npmrc' .gitignore || echo "Not in .gitignore - OK"`
Expected: `Not in .gitignore - OK`

- [ ] **Step 3: Commit**

```bash
git add .npmrc
git commit -m "ci: add .npmrc for npm registry authentication"
```

### Task 3: Update .release-it.json for fork identity

**Files:**
- Modify: `.release-it.json` (lines 8-10, 13, 19)

- [ ] **Step 1: Update npm config with publishArgs**

Add `publishArgs` to ensure scoped package publishes as public via release-it:

```json
"npm": {
  "publish": true,
  "publishArgs": ["--access", "public"]
}
```

- [ ] **Step 2: Update releaseName**

Change `releaseName` from `CloudCLI UI v${version}` to `Claude Code UI Summer v${version}`:

```json
"releaseName": "Claude Code UI Summer v${version}"
```

- [ ] **Step 3: Update CHANGELOG header**

Change the `header` field in the conventional-changelog plugin:

```json
"header": "# Changelog\n\nAll notable changes to Claude Code UI Summer Edition will be documented in this file.\n"
```

- [ ] **Step 4: Verify .release-it.json is valid JSON**

Run: `node -e "require('./.release-it.json'); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 5: Commit**

```bash
git add .release-it.json
git commit -m "chore: update release-it config for fork identity"
```

---

## Chunk 2: Beta Workflow

### Task 4: Create beta.yml GitHub Actions workflow

**Files:**
- Create: `.github/workflows/beta.yml`

- [ ] **Step 1: Create the beta workflow file**

```yaml
name: Beta Publish

on:
  push:
    branches: [dev]

jobs:
  beta-publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Set beta version
        run: |
          BASE_VERSION=$(node -p "require('./package.json').version")
          BETA_VERSION="${BASE_VERSION}-beta.${{ github.run_number }}"
          npm version "$BETA_VERSION" --no-git-tag-version
          echo "Publishing version: $BETA_VERSION"

      - name: Publish beta
        run: npm publish --tag beta --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Key design decisions:
- `actions/setup-node@v4` with `registry-url` handles npm auth via `NODE_AUTH_TOKEN` env var — this is the recommended approach and replaces the need for `.npmrc` in CI. We keep `.npmrc` as a fallback for local use.
- `npm version --no-git-tag-version` modifies `package.json` in the runner without creating a git tag
- `--access public` is required for scoped packages on the free npm plan
- `permissions: contents: read` — beta workflow doesn't need write access to the repo
- `npm ci` respects `package-lock.json` for reproducible installs
- Native modules (`node-pty`, `better-sqlite3`, `bcrypt`) will compile on the Ubuntu runner which has build-essential pre-installed

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/beta.yml')); print('Valid YAML')" 2>/dev/null || echo "YAML will be validated by GitHub on push"`
Expected: `Valid YAML` (or skip message if PyYAML not installed)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/beta.yml
git commit -m "ci: add beta publish workflow for dev branch"
```

---

## Chunk 3: Release Workflow

### Task 5: Create release.yml GitHub Actions workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the release workflow file**

```yaml
name: Release Publish

on:
  push:
    branches: [main]

jobs:
  release-publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: main

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - name: Configure git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Release
        run: npx release-it --ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Key design decisions:
- `fetch-depth: 0` — full git history needed for conventional-commits version analysis
- `ref: main` — ensures a proper branch checkout (not detached HEAD) so `release-it` can push the version bump commit back
- `permissions: contents: write` — needed to push version bump commit and create GitHub Release
- `git config` — sets bot identity for the release commit created by `release-it`
- `npx release-it --ci` — runs release-it in CI mode (non-interactive), which:
  - Reads `.release-it.json` for config
  - Analyzes conventional commits since last tag to determine version bump
  - Updates `package.json` version
  - Creates git tag
  - Pushes tag and commit
  - Creates GitHub Release with changelog
  - Runs `npm publish` (via `"npm": { "publish": true }` in `.release-it.json`)
- `GITHUB_TOKEN` is auto-provided by GitHub Actions with repo scope
- No explicit `npm run build` step — `release-it`'s `before:init` hook runs `npm run build`, and `prepublishOnly` in `package.json` also runs `npm run build` before publish. This avoids a triple-build scenario.
- **Branch protection note**: If `main` has branch protection rules, the default `GITHUB_TOKEN` may not be able to push the release commit. In that case, either add "Allow bypass for github-actions[bot]" in branch protection settings, or use a Personal Access Token (PAT) as `GITHUB_TOKEN`.

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml')); print('Valid YAML')" 2>/dev/null || echo "YAML will be validated by GitHub on push"`
Expected: `Valid YAML` (or skip message if PyYAML not installed)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release publish workflow for main branch"
```

---

## Chunk 4: Branch Setup & Verification

### Task 6: Create dev branch

This task is done locally after all file changes are committed.

- [ ] **Step 1: Ensure all changes are committed on main**

Run: `git status`
Expected: `nothing to commit, working tree clean`

- [ ] **Step 2: Push main with all new workflow files**

Run: `git push origin main`
Expected: Push succeeds. The `release.yml` workflow will trigger but will fail because `NPM_TOKEN` secret is not yet configured — this is expected. The Discord notification workflow won't trigger because no GitHub Release is created when `release-it` fails.

- [ ] **Step 3: Create dev branch from main**

Run: `git checkout -b dev && git push -u origin dev`
Expected: Branch created and pushed. The `beta.yml` workflow will trigger but will fail because `NPM_TOKEN` is not yet configured — this is expected.

- [ ] **Step 4: Verify both workflows appear in GitHub Actions**

Run: `gh workflow list`
Expected: Shows `Beta Publish`, `Release Publish`, and `Discord Release Notification`

- [ ] **Step 5: Switch back to dev as working branch**

Run: `git checkout dev`
Expected: On `dev` branch

### Task 7: Document user prerequisites

This is a summary of manual steps the user must complete outside of this codebase. No code changes.

- [ ] **Step 1: Remind user of npm setup steps**

The user must complete these steps before the pipeline will work:

1. **Create npm org**: Go to https://www.npmjs.com/org/create → create `@fuhesummer`
2. **Generate token**: npmjs.com → Access Tokens → Generate New Token → type "Automation"
3. **Add GitHub Secret**: GitHub repo → Settings → Secrets and variables → Actions → New repository secret → Name: `NPM_TOKEN`, Value: the token from step 2

After these steps, pushing to `dev` will auto-publish beta packages, and merging `dev` → `main` will auto-publish release packages.

---

## Summary of all files changed

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Update name, repository, homepage, bugs URLs |
| `.npmrc` | Create | npm registry auth token config for CI |
| `.release-it.json` | Modify | Update releaseName and CHANGELOG header |
| `.github/workflows/beta.yml` | Create | Auto-publish beta on dev push |
| `.github/workflows/release.yml` | Create | Auto-publish release on main push |
