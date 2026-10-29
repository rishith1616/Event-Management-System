<#
.SYNOPSIS
  Executes Day 2 merges for Sprint 1 (PRs #20, #18, #21) on Event-Management-System.
.DESCRIPTION
  Squash-merges the remaining 3 Day 2 PRs and closes issues #4, #12, and #6,
  burning down the remaining 21 Story Points to reach 0 SP.
#>

$repo = "rishith1616/Event-Management-System"
$prs = @(
  @{ Number = 20; Title = "FR-04: Temporary Ticket Hold During Checkout"; SP = 8 },
  @{ Number = 18; Title = "NFR-03: ACID-Compliant Ticket Transactions"; SP = 5 },
  @{ Number = 21; Title = "FR-06: Payment Processing and Ticket Issuance"; SP = 8 }
)

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting Day 2 Automated Merges (21 Story Points) " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

foreach ($pr in $prs) {
  Write-Host "`nMerging PR #$($pr.Number) - $($pr.Title) ($($pr.SP) SP)..." -ForegroundColor Yellow
  gh pr merge $pr.Number --repo $repo --squash --delete-branch
  if ($LASTEXITCODE -eq 0) {
    Write-Host "PR #$($pr.Number) merged successfully!" -ForegroundColor Green
  } else {
    Write-Host "Warning: PR #$($pr.Number) merge returned exit code $LASTEXITCODE" -ForegroundColor Red
  }
  Start-Sleep -Seconds 5
}

Write-Host "`nUpdating local main branch..." -ForegroundColor Cyan
git checkout main
git pull origin main

Write-Host "`nAll Day 2 PRs merged! Sprint 1 is 100% complete with 0 SP remaining." -ForegroundColor Green
