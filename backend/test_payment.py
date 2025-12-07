import requests
import hmac
import hashlib
import base64
import json

# --- CONFIGURATION ---
# 1. Your Live Backend URL (Don't forget the /api/webhook/shopify part)
WEBHOOK_URL = "https://lead-sniper.onrender.com/api/webhook/shopify"

# 2. Your Shopify Secret (Copy from Render Dashboard or Shopify Admin)
# I have pasted your real secret here so the signature works
SHOPIFY_SECRET = "cb1b3dbef487eba6bd6baa908dac78ecfc1de2339add480604b9aced20d91807"

# 3. The Email you want to unlock (Test a different one than your main admin one)
TEST_EMAIL = "test_user_123@gmail.com"

def send_test_webhook():
    # Create the fake payload that Shopify would send
    payload = {
        "id": 123456789,
        "email": TEST_EMAIL,
        "created_at": "2025-12-07T10:00:00-05:00",
        "financial_status": "paid"
    }
    data = json.dumps(payload).encode('utf-8')

    # Generate the Security Signature (HMAC SHA256)
    digest = hmac.new(SHOPIFY_SECRET.encode('utf-8'), data, hashlib.sha256).digest()
    hmac_header = base64.b64encode(digest).decode()

    # Send the request to your backend
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Hmac-Sha256": hmac_header
    }

    print(f"🚀 Sending Fake Payment for: {TEST_EMAIL}...")
    try:
        response = requests.post(WEBHOOK_URL, data=data, headers=headers)
        print(f"✅ Status Code: {response.status_code}")
        print(f"📜 Response: {response.text}")
        
        if response.status_code == 200:
            print("\n🎉 SUCCESS! Go check Firebase. This user should now be 'isPro: true'.")
        else:
            print("\n❌ FAILED. Check your Secret or URL.")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    send_test_webhook()