---
name: bendd-pr-finalize
description: Finalize and merge an already-open bendd.me pull request. Use when asked to update PR title/body, sync dates before merge, remove unused assets, push final commits, mark draft PRs ready, wait for checks, handle merge-method fallback, merge, and verify branch cleanup.
---

# Bendd PR Finalize

Use this for the last mile of an existing bendd PR. It is project-specific and assumes the repo rules in `AGENTS.md`.

## Preflight

1. Inspect `git status --short`, current branch, upstream, and recent commits.
2. Read the PR with `gh pr view <number> --json title,body,isDraft,assignees,mergeStateStatus,statusCheckRollup,headRefName,baseRefName`.
3. Confirm the PR is assigned to `jaem1n207`.
4. Confirm the branch name does not use the `codex/` prefix.
5. If a merge or rebase is already in progress, resolve that state before changing PR metadata.

## Final Content Sweep

For content PRs:

- Set new post `publishedAt` to the final merge-date basis the user requested. In Korea-local work, prefer the current Asia/Seoul date unless the user specifies otherwise.
- Update tests or structured-data fixtures that mirror the frontmatter date.
- Search for stale wording the user asked to remove.
- Compare image references with files under `public/images/<slug>`.
- Remove only assets that are definitely unused. If every asset is referenced, say so in the PR body or final report.

Useful checks:

```bash
rg -n "old phrase|old date" craft content src tests
rg -n "/images/<slug>/[^\"\\) ]+" craft content src
rg --files public/images/<slug>
```

## Verification

Run the repo validation expected for the PR scope:

```bash
pnpm check-types
pnpm lint
pnpm exec vitest run <focused specs>
pnpm build
```

Report existing warnings separately from failures. Do not merge with failing required checks.

## PR Metadata

Update the PR body when the implementation changed after the first PR description:

- summarize current changes
- list asset cleanup result
- list verification commands
- mention known non-blocking warnings
- preserve replacement-PR or branch notes if relevant

Use `gh pr edit` and keep `--add-assignee jaem1n207`.

## Checks And Merge

1. Push final commits.
2. If draft, run `gh pr ready <number>`.
3. Watch checks with `gh pr checks <number> --watch --interval 10`.
4. If optional bots stay pending but required checks pass, confirm `mergeable` and `mergeStateStatus` with `gh pr view`.
5. Try the repo's preferred merge method. If squash is rejected because the repo disallows it, retry with `--merge`.
6. Use `--delete-branch`.
7. Verify:
   - current branch is `main`
   - working tree is clean
   - local PR branch is gone
   - PR state is `MERGED`

## Output

Report:

- PR URL and merge commit
- final commands run
- checks status
- cleanup result
- branch cleanup result
- any optional pending service that did not block merge
