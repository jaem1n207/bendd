# Maintainer Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first GitHub Actions CI gate and PR label automation for `bendd` without changing Vercel deployment behavior.

**Architecture:** Add one native CI workflow that delegates to the repository's existing pnpm scripts, then add one label-only `pull_request_target` workflow plus `.github/labeler.yml`. The label workflow never checks out or runs pull request code, and stale/comment/release automation stays out of this first implementation.

**Tech Stack:** GitHub Actions, pnpm, Node.js LTS, Next.js 14, Vitest, actions/checkout pinned to `v7.0.0`, actions/setup-node pinned to `v6.4.0`, pnpm/action-setup pinned to `v6.0.9`, actions/labeler pinned to `v6.1.0`.

---

## File Structure

Create or modify these files inside `/Users/jaemin/programming/projects/active/bendd`.

- Create: `.github/workflows/ci.yml`
  - Responsibility: Run the repository quality gate on pull requests and pushes to `main`.
- Create: `.github/workflows/labeler.yml`
  - Responsibility: Apply labels to pull requests without checking out or executing untrusted PR code.
- Create: `.github/labeler.yml`
  - Responsibility: Define file and branch matching rules for `area:*` and `type:*` labels.
- No changes to Vercel deployment, package scripts, or release configuration. Source changes are limited to a mechanical Prettier baseline only if required to make the CI format gate pass.

## Task 1: Add Native CI Workflow

**Files:**

- Create: `/Users/jaemin/programming/projects/active/bendd/.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow directory**

Run:

```bash
mkdir -p .github/workflows
```

Expected: `.github/workflows` exists.

- [ ] **Step 2: Add the CI workflow file**

Create `/Users/jaemin/programming/projects/active/bendd/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Verify
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Setup pnpm
        uses: pnpm/action-setup@008330803749db0355799c700092d9a85fd074e9 # v6.0.9
        with:
          version: 11.7.0

      - name: Setup Node
        uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: lts/*
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm check-types

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Unit tests
        run: pnpm test:unit --run

      - name: Build
        run: pnpm build
```

Expected: The workflow uses read-only repository permission, pinned action SHAs, existing scripts, and no deploy secrets.

- [ ] **Step 3: Review the CI workflow diff**

Run:

```bash
git diff -- .github/workflows/ci.yml
```

Expected: The diff only creates `.github/workflows/ci.yml`.

- [ ] **Step 4: Validate CI workflow syntax**

Run:

```bash
actionlint .github/workflows/ci.yml
```

Expected: No output and exit code `0`.

- [ ] **Step 5: Run local CI-equivalent commands**

Run:

```bash
pnpm check-types
pnpm lint
pnpm format:check
pnpm test:unit --run
pnpm build
```

Expected: All commands exit with code `0`; the format baseline must pass before the workflow is considered ready.

- [ ] **Step 6: Commit the CI workflow**

Run:

```bash
git add .github/workflows/ci.yml docs/superpowers/plans/2026-06-26-maintainer-automation.md
git commit -m "ci: add native verification workflow"
```

Expected: One commit contains the CI workflow and this plan file.

## Task 2: Add PR Labeler

**Files:**

- Create: `/Users/jaemin/programming/projects/active/bendd/.github/workflows/labeler.yml`
- Create: `/Users/jaemin/programming/projects/active/bendd/.github/labeler.yml`

- [ ] **Step 1: Add the labeler workflow**

Create `/Users/jaemin/programming/projects/active/bendd/.github/workflows/labeler.yml`:

```yaml
name: Label PRs

on:
  pull_request_target:
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review

permissions:
  contents: read
  pull-requests: write

jobs:
  label:
    name: Label
    runs-on: ubuntu-latest
    steps:
      - name: Apply labels
        uses: actions/labeler@f27b608878404679385c85cfa523b85ccb86e213 # v6.1.0
        with:
          sync-labels: true
```

Expected: The workflow does not checkout the repository and cannot execute PR code.

- [ ] **Step 2: Add the labeler config**

Create `/Users/jaemin/programming/projects/active/bendd/.github/labeler.yml`:

```yaml
'area:ci':
  - changed-files:
      - any-glob-to-any-file:
          - '.github/**'

'area:docs':
  - changed-files:
      - any-glob-to-any-file:
          - 'docs/**'
          - 'README.md'
          - 'AGENTS.md'

'area:content':
  - changed-files:
      - any-glob-to-any-file:
          - 'content/**'

'area:mdx':
  - changed-files:
      - any-glob-to-any-file:
          - 'src/mdx/**'
          - '**/*.mdx'

'area:app':
  - changed-files:
      - any-glob-to-any-file:
          - 'src/app/**'
          - 'src/components/**'

'area:tests':
  - changed-files:
      - any-glob-to-any-file:
          - 'tests/**'
          - '**/*.spec.ts'
          - '**/*.spec.tsx'

'type:feature':
  - head-branch:
      - '^feat[/-]'
      - '^feature[/-]'

'type:fix':
  - head-branch:
      - '^fix[/-]'
      - '^hotfix[/-]'

'type:docs':
  - head-branch:
      - '^docs[/-]'

'status:needs-review':
  - base-branch:
      - '^main$'
```

Expected: The config labels common content, docs, MDX, app, test, and CI changes.

- [ ] **Step 3: Validate labeler files**

Run:

```bash
actionlint .github/workflows/labeler.yml
ruby -e 'require "yaml"; YAML.load_file(".github/labeler.yml"); puts "labeler config ok"'
```

Expected: `actionlint` prints no output, and Ruby prints `labeler config ok`.

- [ ] **Step 4: Review the labeler diff**

Run:

```bash
git diff -- .github/workflows/labeler.yml .github/labeler.yml
```

Expected: The diff only creates labeler workflow/config files and does not touch Vercel or source code.

- [ ] **Step 5: Commit labeler automation**

Run:

```bash
git add .github/workflows/labeler.yml .github/labeler.yml
git commit -m "ci: add pull request labeler"
```

Expected: One commit contains only the labeler workflow and config.

## Self-Review Checklist

- [ ] The implementation adds CI and Labeler only.
- [ ] The CI workflow uses existing repository scripts and does not deploy.
- [ ] The labeler workflow uses `pull_request_target` without checkout or code execution.
- [ ] All third-party actions are pinned to full commit SHA.
- [ ] Release Drafter, Stale, and comment automation remain out of this first `bendd` implementation.
