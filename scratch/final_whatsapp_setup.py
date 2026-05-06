import requests
import json
import base64

base_url = "https://evolution-api-production-c291.up.railway.app"
api_key = "9e0f92c7859545f1eb6e288eae66fd17c0573d194c3ca76de9a19f5d6277703b"
instance_name = "mtsolar"
webhook_url = "https://fcpplggyarksxelghhbi.supabase.co/functions/v1/whatsapp-webhook"

headers = {
    "Content-Type": "application/json",
    "apikey": api_key
}

# 1. Configure Webhook
print("Step 1: Configuring Webhook...")
webhook_body = {
  "webhook": {
    "enabled": True,
    "url": webhook_url,
    "webhookByEvents": False,
    "base64": False,
    "events": ["MESSAGES_UPSERT"]
  }
}

try:
    res_webhook = requests.post(f"{base_url}/webhook/set/{instance_name}", headers=headers, json=webhook_body, verify=False)
    print("Webhook Config Response:", res_webhook.status_code)
except Exception as e:
    print("Error configuring webhook:", e)

# 2. Check Instance Status via connectionState (more reliable for specific instance)
print("\nStep 2: Checking Connection State...")
try:
    res_state = requests.get(f"{base_url}/instance/connectionState/{instance_name}", headers={"apikey": api_key}, verify=False)
    state_data = res_state.json()
    status = state_data.get("instance", {}).get("state", "unknown")
    print(f"Instance '{instance_name}' State: {status}")
    
    if status != "open":
        # 3. Generate QR Code
        print("\nStep 3: Generating QR Code...")
        res_connect = requests.get(f"{base_url}/instance/connect/{instance_name}", headers={"apikey": api_key}, verify=False)
        data = res_connect.json()
        if "base64" in data:
            img_data = data["base64"].split(",")[1]
            with open("whatsapp_qr_final.png", "wb") as f:
                f.write(base64.b64decode(img_data))
            print("SUCCESS: QR Code saved to 'whatsapp_qr_final.png'.")
        else:
            print("Connect Response:", data)
    else:
        print("Instance is already open. No QR code needed.")

except Exception as e:
    print("Error checking status/generating QR:", e)
