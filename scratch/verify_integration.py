import requests
import json

webhook_url = "https://fcpplggyarksxelghhbi.supabase.co/functions/v1/whatsapp-webhook"

# 1. New customer message (Waiting)
payload_new = {
    "event": "messages.upsert",
    "instance": "mtsolar",
    "data": {
        "key": {
            "remoteJid": "5581888888888@s.whatsapp.net",
            "fromMe": False,
            "id": "MSG_NEW_001"
        },
        "message": {
            "conversation": "Olá, gostaria de um orçamento!"
        },
        "messageTimestamp": 1625097600
    }
}

# 2. Existing customer message (Assigned to Sandra - User 2)
# Note: The webhook usually just inserts the message. 
# We'll first insert a message, then manually assign it via SQL for the test.
payload_assigned = {
    "event": "messages.upsert",
    "instance": "mtsolar",
    "data": {
        "key": {
            "remoteJid": "5581777777777@s.whatsapp.net",
            "fromMe": False,
            "id": "MSG_ASSIGNED_001"
        },
        "message": {
            "conversation": "Oi Sandra, tudo bem?"
        },
        "messageTimestamp": 1625097601
    }
}

try:
    print("Sending New Customer webhook...")
    res1 = requests.post(webhook_url, json=payload_new)
    print("Response 1:", res1.status_code)

    print("\nSending Assigned Customer webhook...")
    res2 = requests.post(webhook_url, json=payload_assigned)
    print("Response 2:", res2.status_code)

except Exception as e:
    print("Error:", e)
