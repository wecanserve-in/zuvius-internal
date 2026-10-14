# Quick check that upload HTTP functions are deployed (not 404).
$projectId = "internal-chat-bc793"
$base = "https://asia-south1-$projectId.cloudfunctions.net"

Write-Host "GET $base/uploadHealthHttp"
$r = curl.exe -s -w "`nHTTP_CODE:%{http_code}" "$base/uploadHealthHttp"
Write-Host $r

Write-Host "`nOPTIONS $base/requestUpload (CORS preflight)"
$p = curl.exe -s -i -X OPTIONS "$base/requestUpload" `
  -H "Origin: http://localhost:5173" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: authorization,content-type"
Write-Host $p

if ($r -match "HTTP_CODE:404" -or $p -match "404 Not Found") {
  Write-Host "`nUpload functions are NOT deployed yet. Run:" -ForegroundColor Red
  Write-Host "  npx firebase-tools login"
  Write-Host "  .\scripts\set-r2-secrets.ps1"
  Write-Host "  .\scripts\deploy-upload-functions.ps1"
  exit 1
}

Write-Host "`nIf OPTIONS shows 204 and Access-Control-Allow-Origin, chat authorize step should work." -ForegroundColor Green
