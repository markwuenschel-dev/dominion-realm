---
name: realm-ship
description: Realm-ship Dominion Realm — Next.js verify, token-safe push, PR, merge when green, scoped cleanup. Use when the user says ship, publish, PR, merge, yeet, or /realm-ship for this repo.
---

# realm-ship

Dominion Realm Next.js app at `C:\Users\Nalakram\Documents\GitHub\dominion-realm`.
Package manager is **pnpm** (`packageManager` in `package.json` is the single source of truth);
`next build` emits a standalone server that ships as a Docker container (ADR-0010, ADR-0012).

Default merge method is `merge`. If the user explicitly says `squash` or `rebase`, use that instead.

Commands are PowerShell-first (PowerShell 7+, per the project README). Bash/WSL equivalents follow the same shapes.

---

## Guardrails (read first — these override "just do it")

Stop and report before pushing or merging when:
- Verification is red or incomplete (`pnpm run build` fails, `pnpm run check` errors, lint/format/tests fail, or content-schema validation fails during the build).
- The diff contains unexpected unrelated files or user work that cannot be cleanly separated.
- Branch protection or the required check (the `Build & validate` job in the `CI` workflow) is failing or would require `--admin` to bypass.
- A conflict cannot be cleanly resolved.
- `.env` is missing `GH_TOKEN` / `GITHUB_TOKEN`, or a REST call proves the token cannot access the repo.

Do not ask before ordinary PowerShell or bash commands. Do ask only for destructive operations outside this workflow or when tool policy requires escalation.

- **Green gate:** never merge or clean up until verification and the required `Build & validate` check are **green**. If CI is red, fix the cause, push, and re-watch until **green** before merging. `Accessibility (advisory)` is `continue-on-error` — it does not gate.
- **Scoped** cleanup only — merged branches you own. When unsure, list and ask — don't delete.

---

## Phase 0 — Survey

**Done when:** diff read, remote state checked via REST (local remote-tracking refs may be stale).

Run:
- `git status --short`
- `git branch -vv`
- `git remote -v`

Read the diff before committing. Use explicit path scopes and protect user work:
- Never stage `.env`, `.env.production`, `node_modules/`, `.next/`, `next-env.d.ts`, `*.tsbuildinfo`, `coverage/`, the prebuild-generated `public/content-media/` and `public/downloads/`, logs, or generated IDE files. (`.gitignore` already covers these, plus the dead `dist/`, `.astro/`, `.netlify/` leftovers from the pre-Next.js stack.)
- Never stage agent/tooling dirs — `.claude/`, `.agents/`, `.grok/`, `.neostack/` — or `skills-lock.json`, unless the user explicitly asked for them. These are currently untracked on purpose.
- If junk is not ignored, add a narrow `.gitignore` rule instead of committing it.
- `pnpm-lock.yaml` IS the tracked lockfile — commit lockfile changes whenever dependencies change. There is no `package-lock.json`.
- Keep unrelated existing modifications out of the commit.

## Phase 1 — Branch

**Done when:** on a feature branch, not `main`.

Never commit to `main`.

If on `main`, create a branch:
- `feat/...` for features
- `fix/...` for bug fixes
- `docs/...` for documentation (ADRs/PRDs under `docs/`, README, content prose)
- `chore/...` for maintenance, deps, config, CI

If already on a feature branch, stay on it.

## Phase 2 — Verify

**Done when:** every gate below is **green** (or doc-only change with reason stated for PR).

Use the Node version `.nvmrc` pins — the same one every CI job uses — not whatever `node` happens to be on PATH. A newer local runtime can pass tests that the pinned runtime gates. Check with `node --version` before trusting a green run.

Run the same gates CI runs, in the same order:

```powershell
pnpm install --frozen-lockfile   # lockfile-exact install
pnpm run format:check            # oxfmt --check
pnpm run lint                    # oxlint
pnpm run check                   # tsc --noEmit
pnpm test                        # vitest run --coverage (same ratchet as CI)
pnpm run build                   # next build — the real gate
```

`next build` is the **content-schema gate**: the Zod content loader throws on malformed
frontmatter, so it is the oracle for codex entries and the four-tier reveal model
(`teaser | reader | deep | beyond`) — a bad entry or reveal tier fails the build
(see `docs/adr/0004-reveal-tier-model.md`). `prebuild` also runs the media copy,
downloads, and content-manifest generators, so a broken generator surfaces here.

Notes:
- A clean exit code AND a successful build are the oracle — never assume green from a partial run.
- Doc/config-only changes with no build impact (e.g. files under `docs/`, README) do not require a build; state why in the PR body.
- Optional smoke: `pnpm dev`, or `pnpm run build` then `pnpm start`, and spot-check the affected route.
- `pnpm run launch:check` and `pnpm run scene:check` exist but are off the merge gate — run only when the change touches launch readiness or Sanity scene joins.

## Phase 3 — Commit

**Done when:** commit exists with Co-Authored-By trailer.

Stage only intended paths with explicit `git add <paths>`.

Make logical conventional commits, one concern per commit:
- `feat: ...`
- `fix: ...`
- `test: ...`
- `docs: ...`
- `chore: ...`

Commit bodies explain why, not just what. End every commit message with:

```text
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

If a different acting agent/model is running this skill, use that agent/model in the trailer.

## Phase 4 — Token-safe push

**Done when:** branch is on origin (verified via REST or `git ls-remote`).

Remote: `https://github.com/markwuenschel-dev/dominion-realm.git`

Never echo the token. Load it only inside the same command scope that uses it (each tool invocation is a fresh shell — do not rely on a persisted session variable):

```powershell
$Env:GH_TOKEN = (Select-String -Path .env -Pattern '^(GH_TOKEN|GITHUB_TOKEN)=' | Select-Object -First 1).Line.Split('=',2)[1].Trim()
```

For git push over HTTPS Basic auth (token never appears on the command line in cleartext):

```powershell
$Env:GH_TOKEN = (Select-String -Path .env -Pattern '^(GH_TOKEN|GITHUB_TOKEN)=' | Select-Object -First 1).Line.Split('=',2)[1].Trim()
$Bytes = [Text.Encoding]::ASCII.GetBytes("x-access-token:$Env:GH_TOKEN")
$B64 = [Convert]::ToBase64String($Bytes)
git -c http.extraheader="AUTHORIZATION: Basic $B64" push https://github.com/markwuenschel-dev/dominion-realm.git HEAD:<branch>
```

For REST:
- `Authorization: Bearer $Env:GH_TOKEN`
- `Accept: application/vnd.github+json`
- `X-GitHub-Api-Version: 2022-11-28`

Build JSON payloads with PowerShell objects plus `ConvertTo-Json` (or Python if easier) to avoid escaping mistakes. Do not put the token on command lines in a way that prints it.

```powershell
$Headers = @{ Authorization = "Bearer $Env:GH_TOKEN"; Accept = 'application/vnd.github+json'; 'X-GitHub-Api-Version' = '2022-11-28' }
$Body = @{ title = 'T'; head = 'feat/x'; base = 'main'; body = 'B' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'https://api.github.com/repos/markwuenschel-dev/dominion-realm/pulls' -Headers $Headers -Body $Body
```

Bash/WSL equivalent: load via `grep` on `.env`, base64 with `printf ... | base64`, and build payloads with `jq -n` passed to `curl -d @file`.

`gh` CLI (`gh pr create`, `gh pr merge`) is an acceptable substitute only if it is already authenticated; otherwise use the token-over-HTTPS + REST path above.

## Phase 5 — PR

**Done when:** PR exists and branch ref verified on remote.

Open the PR with REST:
- `POST https://api.github.com/repos/markwuenschel-dev/dominion-realm/pulls`
- Body: `title`, `head`, `base: main`, `body`

PR body sections:
- `Summary`
- `What's included`
- `Testing`
- `Notes`

End the PR body with:

```text
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

If a different acting agent/model is running this skill, use that agent/model in the footer.

After creating the PR, verify the branch ref exists via REST or `git ls-remote` using the token-safe auth path.

## Phase 6 — Green gate, then merge

**Done when:** the `CI` workflow's `Build & validate` check is **green** AND the PR is merged.

Do not start Phase 7 until Phase 6 is done.

CI policy: see **Green gate** in Guardrails. `Build & validate` runs `format:check`, `lint`,
`check`, and `test` (`vitest run --coverage`, same as `test:coverage`) in parallel, then
`next build`. `Accessibility (advisory)` may go red
without blocking; `Scene-art joins` is nightly/on-demand and never gates a merge.

Merge via REST:
- `PUT https://api.github.com/repos/markwuenschel-dev/dominion-realm/pulls/<number>/merge`
- Payload includes `merge_method`: `merge`, `squash`, or `rebase`.

Only merge when local verification is **green** and the required check has passed. If red, fix in scope, push, re-watch until **green** (same loop as **babysit**).

## Phase 7 — Scoped cleanup

**Done when:** cleanup report lists every removal or skip-with-reason.

**Precondition:** Phase 6 merge complete.

Run the steps in [`CLEANUP.md`](CLEANUP.md) and report what was removed.

## Phase 8 — Deploy (manual — merging does NOT deploy)

**Done when:** either the deploy ran and the public URL is confirmed, or the report states that production is still on the pre-merge revision.

There is no deploy workflow. The site runs as a Docker container on AWS EC2 behind Caddy
(`next start` on the standalone build, per `docs/adr/0012-host-on-aws-ec2.md`), and CI does
not deploy — pushing to `main` leaves production untouched. Production is updated by hand:

```powershell
./scripts/deploy.ps1            # deploy latest main
./scripts/deploy.ps1 -WhatIf    # print the remote script, run nothing
```

Only run it when the user asks to deploy. If you don't, say so explicitly in the report —
a merged PR is **not** live.

## Phase 9 — Report

**Done when:** user sees PR URL, merge SHA, verification results, deploy status, and cleanup list.

Report:
- PR number and URL
- Merge SHA
- Commits made
- Verification commands and results (format / lint / types / tests / build)
- Deploy status (deployed via `scripts/deploy.ps1`, or explicitly not deployed)
- Remote/local branches deleted
- Any branches intentionally left alone
