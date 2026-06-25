---
name: realm-ship
description: Ship Dominion Realm changes end to end through branch hygiene, scoped commits, Astro build/check verification, token-over-HTTPS push, detailed GitHub PR creation, merge, branch deletion, and stale-branch cleanup. Use when the user asks to ship, publish, PR, merge, yeet, or run the full lifecycle for the current Dominion Realm working tree.
---

# Realm Ship

Run the full GitHub ship flow for the Dominion Realm Astro static site at
`/mnt/c/Users/Nalakram/Documents/GitHub/dominion-realm`
(Windows path: `C:\Users\Nalakram\Documents\GitHub\dominion-realm`).

Default merge method is `merge` for a real merge commit. If the user explicitly says `squash` or `rebase`, use that merge method instead.

Commands are PowerShell-first (PowerShell 7+, per the project README). The bash/WSL equivalents follow the same shapes.

## Hard Stops

Stop and report before pushing or merging when:
- Verification is red or incomplete (`npm run build` fails, `astro check` errors, or content-collection schema validation fails).
- The diff contains unexpected unrelated files or user work that cannot be cleanly separated.
- Branch protection or a required check (the `deploy.yml` workflow / Pages build) is failing or would require `--admin` to bypass.
- A conflict cannot be cleanly resolved.
- `.env` is missing `GH_TOKEN` / `GITHUB_TOKEN`, or a REST call proves the token cannot access the repo.

Do not ask before ordinary PowerShell or bash commands. Do ask only for destructive operations outside this workflow or when tool policy requires escalation.

## Survey

Run:
- `git status --short`
- `git branch -vv`
- `git remote -v`

Read the diff before committing. Use explicit path scopes and protect user work:
- Never stage `.env`, `.env.production`, `node_modules/`, `dist/`, `.astro/`, `.netlify/`, build products, caches, logs, or generated IDE files. (`.gitignore` already covers most of these.)
- Never stage agent/tooling dirs — `.claude/`, `.agents/`, `.grok/`, `.neostack/` — or `skills-lock.json`, unless the user explicitly asked for them. These are currently untracked on purpose.
- If junk is not ignored, add a narrow `.gitignore` rule instead of committing it.
- `package-lock.json` IS tracked — commit lockfile changes whenever dependencies change.
- Keep unrelated existing modifications out of the commit.

Check real remote state through GitHub REST, because local remote-tracking refs may be stale.

## Branch

Never commit to `main`.

If on `main`, create a branch:
- `feat/...` for features
- `fix/...` for bug fixes
- `docs/...` for documentation (ADRs/PRDs under `docs/`, README, content prose)
- `chore/...` for maintenance, deps, config, CI

If already on a feature branch, stay on it.

## Verify

This is a static Astro site; the build IS the gate. For any code, content, or asset change:

```powershell
npm ci          # clean, lockfile-exact install (Node 22, per .nvmrc)
npm run build   # astro build — the real gate
```

`astro build` validates **Content Collection schemas**, so it is the oracle for codex entries
and the four-tier reveal model (`teaser | reader | deep | beyond`) — a malformed entry or a
bad reveal tier fails the build (see `docs/adr/0004-reveal-tier-model.md`).

When TypeScript is enabled (see `docs/adr/0008-stack-astro-typescript-vanilla-islands.md`) and
`@astrojs/check` is installed, also run:

```powershell
npx astro check   # type + content-schema check
```

If a `test` script exists (e.g. Playwright for the reveal toggle / Interface Overlay per the PRD), run `npm test`.

Notes:
- A clean exit code AND a successful build/check are the oracle — never assume green from a partial run.
- Doc/config-only changes with no build impact (e.g. files under `docs/`, README) do not require a build; state why in the PR body.
- Optional smoke: `npm run preview` and spot-check the affected route.

## Commit

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

## Token-Safe Network Ops

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

## PR

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

## Merge And Cleanup

Only merge when verification is green and required checks (the `deploy.yml` workflow) have passed.

Merge via REST:
- `PUT https://api.github.com/repos/markwuenschel-dev/dominion-realm/pulls/<number>/merge`
- Payload includes `merge_method`: `merge`, `squash`, or `rebase`.

Delete the remote branch:
- `DELETE https://api.github.com/repos/markwuenschel-dev/dominion-realm/git/refs/heads/<branch>`

Update local main:
- `git switch main`
- fetch/fast-forward from origin using token-over-HTTPS, not SSH
- delete the local feature branch with `git branch -d <branch>`

Sweep stale branches after every merge:
- List branches merged into `main`.
- Delete merged local branches with `git branch -d`.
- For remote branches, use REST and delete only branches you own; never delete `main` or `HEAD`.

## Deploy

Merging to `main` triggers deployment automatically (GitHub Pages + Netlify, via `deploy.yml`; the build picks the right base path per environment). After merge, note where to confirm the live deploy (the Actions run / Pages URL) — do not assume success until the deploy workflow is green.

## Final Report

Report:
- PR number and URL
- Merge SHA
- Commits made
- Verification commands and results (build / check / tests)
- Deploy status (workflow run / live URL)
- Remote/local branches deleted
- Any branches intentionally left alone
