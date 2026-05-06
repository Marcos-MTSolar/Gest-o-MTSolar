import requests
import base64
import json

base_url = "https://evolution-api-production-c291.up.railway.app"
api_key = "9e0f92c7859545f1eb6e288eae66fd17c0573d194c3ca76de9a19f5d6277703b"
instance_name = "mtsolar"

headers = {
    "apikey": api_key
}

print(f"Generating QR Code for instance: {instance_name}...")

try:
    # First, let's check the instance status. If it's already connected, we'll know.
    res_status = requests.get(f"{base_url}/instance/connectionState/{instance_name}", headers=headers, verify=False)
    status_data = res_status.json()
    print("Current Status:", status_data.get("instance", {}).get("state", "unknown"))

    # Now get the QR code
    res_connect = requests.get(f"{base_url}/instance/connect/{instance_name}", headers=headers, verify=False)
    data = res_connect.json()
    
    if "base64" in data:
        img_data = data["base64"].split(",")[1]
        output_path = "whatsapp_qr_refresh.png"
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(img_data))
        print(f"SUCCESS: QR Code saved to '{output_path}'.")
    elif "message" in data:
        print("API Message:", data["message"])
    else:
        print("Unexpected Response:", data)

except Exception as e:
    print("Error generating QR Code:", e)
