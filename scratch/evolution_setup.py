import requests
import json
import base64
import os

base_url = "https://evolution-api-production-c291.up.railway.app"
api_key = "9e0f92c7859545f1eb6e288eae66fd17c0573d194c3ca76de9a19f5d6277703b"
instance_name = "mtsolar"
webhook_url = "https://fcpplggyarksxelghhbi.supabase.co/functions/v1/whatsapp-webhook"

headers = {
    "Content-Type": "application/json",
    "apikey": api_key
}

# Task 3: Create instance
print("Task 3: Creating instance...")
data_create = {
    "instanceName": instance_name,
    "qrcode": True,
    "integration": "WHATSAPP-BAILEYS"
}
try:
    res_create = requests.post(f"{base_url}/instance/create", headers=headers, json=data_create, verify=False)
    print("Response:", res_create.status_code, res_create.text)
except Exception as e:
    print("Error:", e)

# Task 4: Set Webhook
print("\nTask 4: Setting Webhook...")
data_webhook = {
    "url": webhook_url,
    "webhook_by_events": False,
    "webhook_base64": False,
    "events": ["MESSAGES_UPSERT"]
}
try:
    res_webhook = requests.post(f"{base_url}/webhook/set/{instance_name}", headers=headers, json=data_webhook, verify=False)
    print("Response:", res_webhook.status_code, res_webhook.text)
except Exception as e:
    print("Error:", e)

# Task 5: Connect (Get QR Code)
print("\nTask 5: Getting QR Code...")
try:
    res_connect = requests.get(f"{base_url}/instance/connect/{instance_name}", headers={"apikey": api_key}, verify=False)
    data = res_connect.json()
    if "base64" in data:
        img_data = data["base64"].split(",")[1]
        with open("whatsapp_qr.png", "wb") as f:
            f.write(base64.b64decode(img_data))
        print("QR Code saved to 'whatsapp_qr.png'. Please open this file to scan.")
    else:
        print("Response:", data)
except Exception as e:
    print("Error:", e)
