$body = '{
  "url": "https://gestao-mtsolar.vercel.app/api/webhook/whatsapp",
  "webhook_by_events": false,
  "webhook_base64": false,
  "enabled": true,
  "events": [
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "CONNECTION_UPDATE"
  ]
}'

$headers = @{
  apikey = "9e0f92c7859545f1eb6e288eae66fd17c0573d194c3ca76de9a19f5d6277703b"
}

Write-Host "Configurando mtsolar..."
$res1 = Invoke-RestMethod -Uri "https://evolution-api-production-c291.up.railway.app/webhook/set/mtsolar" -Method Put -Headers $headers -Body $body -ContentType "application/json"
$res1 | ConvertTo-Json

Write-Host "`nConfigurando atendimento-cliente..."
$res2 = Invoke-RestMethod -Uri "https://evolution-api-production-c291.up.railway.app/webhook/set/atendimento-cliente" -Method Put -Headers $headers -Body $body -ContentType "application/json"
$res2 | ConvertTo-Json
