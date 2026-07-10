<#
.SYNOPSIS
    One-command deploy of The Dominion Realm to the shared AWS box.

.DESCRIPTION
    The PowerShell twin of the Realmwalkers `scripts/deploy.sh`, against the same
    EC2 box (ADR-0012). It is the manual loop — ssh → git sync → compose rebuild →
    log tail — plus a public-URL health check, so a deploy is one command:

        ./scripts/deploy.ps1                 # deploy latest main
        ./scripts/deploy.ps1 <sha-or-tag>    # roll back / deploy a specific commit
        ./scripts/deploy.ps1 -WhatIf         # print the remote script, run nothing

    A deploy costs nothing per run: the pull and the docker build happen on the box
    (flat EC2 bill), and DNS is not involved. Pushing to `main` does NOT auto-deploy
    (ADR-0012) — this is how code/prose/config changes reach production. Media edits
    in Sanity Studio go live on their own via the revalidate webhook; no deploy.

.NOTES
    - The box's clone is deploy-only (never edited in place), so `main` is hard-synced
      to origin. Any other ref (a rollback SHA, a tag) is checked out detached;
      re-running with no arg restores main.
    - No `sudo`: the `ubuntu` user is in the docker group (proven by deploy.sh).
    - CRLF guard: this file may be checked out CRLF and PowerShell here-strings are
      CRLF, so the remote stream is piped through `tr -d '\r'` before bash — a stray
      \r makes the box see 'dominion-realm\r' and compose reports "no such service".
    - Requires the OpenSSH client (`ssh`, bundled with Windows 10/11).
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    # Git ref to deploy: a branch (hard-synced if 'main'), or a SHA/tag (detached).
    [string]$Ref = 'main',

    # Private key for the box. Env SSH_KEY overrides; matches deploy.sh's default.
    [string]$KeyPath = "$HOME/.ssh/shared-box.pem",

    # user@host of the shared box.
    [string]$Box = 'ubuntu@44.198.76.44',

    # Public URL to health-check after the deploy.
    [string]$Url = 'https://dominionrealm.44-198-76-44.nip.io',

    # The compose service name for this app (in /opt/stack/infra).
    [string]$Service = 'dominion-realm',

    # The deploy-only clone on the box.
    [string]$RepoDir = '/opt/stack/dominion-realm',

    # The docker compose stack dir on the box.
    [string]$StackDir = '/opt/stack/infra',

    # How many log lines to tail after restart.
    [int]$Tail = 40
)

$ErrorActionPreference = 'Stop'

# Env override for the key, mirroring deploy.sh's `SSH_KEY`.
if ($env:SSH_KEY) { $KeyPath = $env:SSH_KEY }

# main is hard-synced (deploy-only clone); any other ref is a detached checkout.
$sync = if ($Ref -eq 'main') {
    "git checkout -q main && git reset --hard origin/main"
} else {
    "git checkout -q --detach '$Ref'"
}

# The remote script. Values are this script's own params, not user free-text.
$remote = @"
set -eu
cd '$RepoDir'
git fetch -q origin
$sync
echo "deploying `$(git rev-parse --short HEAD): `$(git log -1 --format=%s)"
cd '$StackDir'
docker compose up -d --build '$Service'
docker compose logs --tail=$Tail '$Service' || echo "(log tail failed - check manually; deploy itself already succeeded)"
"@

# Normalise to LF locally too (belt-and-suspenders with the remote `tr` guard).
$remote = $remote -replace "`r`n", "`n"

if (-not $PSCmdlet.ShouldProcess("$Box ($Service @ $Ref)", 'Rebuild and restart the container')) {
    # -WhatIf: show exactly what would run remotely, run nothing.
    Write-Host 'Would run this on the box:' -ForegroundColor Yellow
    Write-Host $remote
    return
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw "The 'ssh' command was not found. Install the Windows OpenSSH Client " +
          '(Settings → Apps → Optional features) and retry.'
}
if (-not (Test-Path $KeyPath)) { throw "SSH key not found: $KeyPath" }

Write-Host "Deploying $Ref to $Box ..." -ForegroundColor Cyan
# Pipe the remote script to the box; `tr -d '\r'` strips any CRLF before bash.
$remote | & ssh -i $KeyPath -o StrictHostKeyChecking=accept-new $Box "tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) {
    throw "Deploy failed (ssh exit code $LASTEXITCODE). The box tree may be " +
          'partially updated — inspect it before retrying.'
}

# Prove the public URL serves the new build — logs alone don't show what Caddy fronts.
try {
    $resp = Invoke-WebRequest -Uri "$Url/" -TimeoutSec 30 -UseBasicParsing
    Write-Host "$Url -> HTTP $($resp.StatusCode)" -ForegroundColor Green
} catch {
    throw "Deployed, but the health check against $Url failed: $($_.Exception.Message)"
}
