<# 
scripts\link-local.ps1

Recreates local-only links in the CURRENT worktree:
- apps/api/.env                    -> %USERPROFILE%\.config\Adventure\apps\api\.env   (file symlink; falls back to hardlink)
- packages/database/.env           -> %USERPROFILE%\.config\Adventure\packages\database\.env (file symlink; falls back to hardlink)
- apps/web/public/assets           -> %USERPROFILE%\.config\Adventure\apps\web\public\assets (directory junction)

Usage (from worktree root):
  powershell -ExecutionPolicy Bypass -File .\scripts\link-local.ps1

Notes:
- Does NOT add anything to git.
- Requires the canonical files/folders to exist under %USERPROFILE%\.config\Adventure\...
#>

[CmdletBinding()]
param(
  [string]$CanonicalRoot = "$env:USERPROFILE\.config\Adventure",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err ($msg) { Write-Host "[ERR ] $msg" -ForegroundColor Red }

function Ensure-ParentDir([string]$path) {
  $parent = Split-Path -Parent $path
  if (-not (Test-Path $parent)) {
    if ($DryRun) { Write-Info "Would create directory: $parent"; return }
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
}

function Remove-IfExists([string]$path) {
  if (Test-Path $path) {
    if ($DryRun) { Write-Info "Would remove existing: $path"; return }
    Remove-Item -Force -Recurse $path
  }
}

function New-FileLink([string]$worktreePath, [string]$canonicalPath) {
  Ensure-ParentDir $worktreePath

  if (-not (Test-Path $canonicalPath)) {
    Write-Warn "Canonical file missing: $canonicalPath (skipping link for $worktreePath)"
    return
  }

  # If correct link already exists, do nothing
  try {
    $item = Get-Item -LiteralPath $worktreePath -ErrorAction SilentlyContinue
    if ($null -ne $item -and $item.LinkType -and $item.Target -contains $canonicalPath) {
      Write-Info "OK (already linked): $worktreePath -> $canonicalPath"
      return
    }
  } catch { }

  Remove-IfExists $worktreePath

  if ($DryRun) {
    Write-Info "Would create file symlink: $worktreePath -> $canonicalPath"
    return
  }

  # Prefer symlink, fall back to hardlink (works without admin/dev mode, but must be same drive)
  try {
    New-Item -ItemType SymbolicLink -Path $worktreePath -Target $canonicalPath | Out-Null
    Write-Info "Linked (symlink): $worktreePath -> $canonicalPath"
  } catch {
    Write-Warn "Symlink failed for $worktreePath. Trying hardlink (same drive required)."
    try {
      cmd /c mklink /H "$worktreePath" "$canonicalPath" | Out-Null
      Write-Info "Linked (hardlink): $worktreePath -> $canonicalPath"
    } catch {
      Write-Err "Failed to create link for $worktreePath. Error: $($_.Exception.Message)"
      throw
    }
  }
}

function New-DirJunction([string]$worktreePath, [string]$canonicalPath) {
  Ensure-ParentDir $worktreePath

  if (-not (Test-Path $canonicalPath)) {
    Write-Warn "Canonical directory missing: $canonicalPath (skipping junction for $worktreePath)"
    return
  }

  # If already a junction to the right place, do nothing (best effort check)
  try {
    $item = Get-Item -LiteralPath $worktreePath -ErrorAction SilentlyContinue
    if ($null -ne $item -and $item.LinkType -eq "Junction" -and $item.Target -contains $canonicalPath) {
      Write-Info "OK (already junctioned): $worktreePath -> $canonicalPath"
      return
    }
  } catch { }

  Remove-IfExists $worktreePath

  if ($DryRun) {
    Write-Info "Would create junction: $worktreePath -> $canonicalPath"
    return
  }

  # Use mklink /J for reliable junction creation
  cmd /c mklink /J "$worktreePath" "$canonicalPath" | Out-Null
  Write-Info "Linked (junction): $worktreePath -> $canonicalPath"
}

function Resolve-WorktreeRoot() {
  # Prefer git to find root; fallback to current directory
  try {
    $root = (git rev-parse --show-toplevel 2>$null).Trim()
    if ($root) { return $root }
  } catch { }
  return (Get-Location).Path
}

$worktreeRoot = Resolve-WorktreeRoot
Write-Info "Worktree root: $worktreeRoot"
Write-Info "Canonical root: $CanonicalRoot"

# Map: worktree relative path => canonical relative path
# Add new entries here as you grow the project.
$fileLinks = @(
  @{ WorktreeRel = "apps\api\.env"; CanonRel = "apps\api\.env" },
  @{ WorktreeRel = "packages\database\.env"; CanonRel = "packages\database\.env" }
)

$dirJunctions = @(
  @{ WorktreeRel = "apps\web\public\assets"; CanonRel = "apps\web\public\assets" }
)

# Create file links
foreach ($m in $fileLinks) {
  $wt = Join-Path $worktreeRoot $m.WorktreeRel
  $cn = Join-Path $CanonicalRoot  $m.CanonRel
  New-FileLink -worktreePath $wt -canonicalPath $cn
}

# Create directory junctions
foreach ($m in $dirJunctions) {
  $wt = Join-Path $worktreeRoot $m.WorktreeRel
  $cn = Join-Path $CanonicalRoot  $m.CanonRel
  New-DirJunction -worktreePath $wt -canonicalPath $cn
}

Write-Info "Done."
Write-Info "Tip: run with -DryRun to preview changes."
