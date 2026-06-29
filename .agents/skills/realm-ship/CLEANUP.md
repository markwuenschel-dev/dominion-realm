# Cleanup (Phase 7)

**Scoped** cleanup only — merged branches you own. Never delete `main` or `HEAD`.

After merge, update local `main`:
- `git switch main`
- fetch/fast-forward from origin using token-over-HTTPS, not SSH
- delete the local feature branch with `git branch -d <branch>`

Sweep stale branches:
- List branches merged into `main`.
- Delete merged local branches with `git branch -d`.
- For remote branches, use REST and delete only branches you own; never delete `main` or `HEAD`.

Remote branch delete:
- `DELETE https://api.github.com/repos/markwuenschel-dev/dominion-realm/git/refs/heads/<branch>`
