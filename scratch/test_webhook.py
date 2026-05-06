import requests
import json

webhook_url = "https://fcpplggyarksxelghhbi.supabase.co/functions/v1/whatsapp-webhook"

# Mock payload from Evolution API (MESSAGES_UPSERT)
payload = {
    "event": "messages.upsert",
    "instance": "mtsolar",
    "data": {
        "key": {
            "remoteJid": "5581999999999@s.whatsapp.net",
            "fromMe": False,
            "id": "TEST_MESSAGE_ID_001"
        },
        "message": {
            "conversation": "Olá! Este é um teste automático do sistema MT Solar."
        },
        "messageTimestamp": 1625097600
    }
}

print(f"Sending test webhook to: {webhook_url}")

try:
    res = requests.post(webhook_url, json=payload, headers={"Content-Type": "application/json"})
    print("Response Status:", res.status_code)
    print("Response Body:", res.text)
except Exception as e:
    print("Error sending test webhook:", e)
