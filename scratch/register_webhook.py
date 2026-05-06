import requests
import json

base_url = "https://evolution-api-production-c291.up.railway.app"
api_key = "9e0f92c7859545f1eb6e288eae66fd17c0573d194c3ca76de9a19f5d6277703b"
instance_name = "mtsolar"
webhook_url = "https://fcpplggyarksxelghhbi.supabase.co/functions/v1/whatsapp-webhook"

headers = {
    "Content-Type": "application/json",
    "apikey": api_key
}

# Task 1: Register Webhook - Trying different structures
print("Task 1: Registering Webhook (Wrapped version)...")
data_webhook = {
    "webhook": {
        "enabled": True,
        "url": webhook_url,
        "webhook_by_events": False,
        "events": ["MESSAGES_UPSERT"]
    }
}

try:
    res_webhook = requests.post(f"{base_url}/webhook/set/{instance_name}", headers=headers, json=data_webhook, verify=False)
    print("Response:", res_webhook.status_code, res_webhook.text)
except Exception as e:
    print("Error:", e)

# Verification
print("\nVerification: Checking registered webhooks...")
try:
    res_verify = requests.get(f"{base_url}/webhook/find/{instance_name}", headers={"apikey": api_key}, verify=False)
    print("Registered Webhooks:", res_verify.text)
except Exception as e:
    print("Error:", e)
