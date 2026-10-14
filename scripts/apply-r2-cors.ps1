# Apply CORS to existing bucket lms-portal (browser PUT to presigned URLs).
# Requires Cloudflare API token:  wrangler login  OR  CLOUDFLARE_API_TOKEN env var.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$corsFile = Join-Path $root "docs\r2-cors.json"

if (-not (Test-Path $corsFile)) {
  Write-Host "Missing $corsFile" -ForegroundColor Red
  exit 1
}

$wrangler = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wrangler) {
  Write-Host "Wrangler CLI not found. Install:  npm install -g wrangler" -ForegroundColor Yellow
  Write-Host "Or paste docs\r2-cors.json manually in Cloudflare Dashboard:"
  Write-Host "  R2 -> lms-portal -> Settings -> CORS policy"
  exit 1
}

Write-Host "Setting CORS on bucket lms-portal from docs\r2-cors.json ..."
wrangler r2 bucket cors set lms-portal --file $corsFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "R2 CORS updated." -ForegroundColor Green
