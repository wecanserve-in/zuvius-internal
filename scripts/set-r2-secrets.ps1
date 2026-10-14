# Optional: store R2 keys in Google Secret Manager (requires Blaze / pay-as-you-go).
# Without Blaze, put R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in functions/.env.internal-chat-bc793 instead.

$ErrorActionPreference = "Stop"
$projectId = "internal-chat-bc793"

Write-Host "This uses Firebase Secret Manager and requires the Blaze plan."
Write-Host "If you are on the free Spark plan, skip this script."
Write-Host "Put keys in functions\.env.$projectId and run deploy-upload-functions.ps1 instead."
Write-Host ""
$confirm = Read-Host "Continue with Secret Manager anyway? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') { exit 0 }

npx firebase-tools functions:secrets:set R2_ACCESS_KEY_ID --project $projectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx firebase-tools functions:secrets:set R2_SECRET_ACCESS_KEY --project $projectId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Secrets saved in Secret Manager."
