# Deploy R2 upload HTTP functions for Zuvius Internal.
# Prereqs: firebase login, R2 keys in functions/.env.internal-chat-bc793 (gitignored)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$projectId = "internal-chat-bc793"
Set-Location $root

Write-Host "Checking Firebase CLI login..."
npx firebase-tools projects:list --project $projectId 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged in. Run:  npx firebase-tools login" -ForegroundColor Red
  exit 1
}

$envFile = Join-Path $root "functions\.env.$projectId"
if (-not (Test-Path $envFile)) {
  $example = Join-Path $root "functions\.env.example"
  if (Test-Path $example) {
    Write-Host "Creating $envFile from .env.example - add your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY."
    Copy-Item $example $envFile
  } else {
    Write-Host "Missing $envFile" -ForegroundColor Red
    exit 1
  }
}

$envText = Get-Content $envFile -Raw
if ($envText -notmatch 'R2_ACCESS_KEY_ID=\S+' -or $envText -notmatch 'R2_SECRET_ACCESS_KEY=\S+') {
  Write-Host "Add R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to:" -ForegroundColor Yellow
  Write-Host "  $envFile"
  Write-Host "Same keys as your other project. Never use VITE_* in the frontend."
  Write-Host ""
  Write-Host "Note: Deploying Cloud Functions still requires the Blaze plan on this Firebase project."
  Write-Host "Upgrade: https://console.firebase.google.com/project/$projectId/usage/details"
  exit 1
}

Write-Host "Installing function dependencies..."
Set-Location (Join-Path $root "functions")
if (Test-Path "package-lock.json") {
  npm ci
} else {
  npm install
}
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Set-Location $root

Write-Host "Deploying upload functions (region asia-south1)..."
npx firebase-tools deploy --project $projectId --only `
  "functions:uploadHealthHttp,functions:uploadHealth,functions:uploadHealthR2,functions:uploadCorsProbe,functions:requestUpload,functions:confirmUpload,functions:getDownloadUrl"

if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed. Blaze plan may be required for Cloud Functions." -ForegroundColor Red
  Write-Host "https://console.firebase.google.com/project/$projectId/usage/details"
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Next: .\scripts\verify-upload-deploy.ps1"
Write-Host "R2 CORS: .\scripts\apply-r2-cors.ps1"
