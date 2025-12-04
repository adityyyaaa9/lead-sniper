import os
import hmac
import hashlib
import base64
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- 1. SETUP FIREBASE ADMIN ---
# We load the credentials from the Environment Variable you just set on Render
# This allows the backend to write to the database securely.
if not firebase_admin._apps:
    cred_json = json.loads(os.environ.get('FIREBASE_CREDENTIALS'))
    cred = credentials.Certificate(cred_json)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# --- 2. SHOPIFY WEBHOOK ROUTE ---
@app.route('/api/webhook/shopify', methods=['POST'])
def shopify_webhook():
    # A. Security Check: Verify the data came from Shopify
    shopify_secret = os.environ.get('SHOPIFY_SECRET')
    signature = request.headers.get('X-Shopify-Hmac-Sha256')
    data = request.get_data()

    if not verify_shopify_signature(data, signature, shopify_secret):
        return jsonify({"error": "Unauthorized"}), 401

    # B. Parse the Data
    try:
        payload = request.json
        # Shopify sends the customer info inside the payload
        customer_email = payload.get('email') or payload.get('customer', {}).get('email')
        
        if customer_email:
            print(f"💰 New Sale: Unlocking account for {customer_email}")
            
            # C. Unlock the Account in Firestore
            # We create (or update) a document in the 'customers' collection
            # The document ID is the email (for easy lookup)
            doc_ref = db.collection('customers').document(customer_email)
            doc_ref.set({
                'email': customer_email,
                'isPro': True,
                'purchaseDate': firestore.SERVER_TIMESTAMP,
                'source': 'shopify_webhook'
            }, merge=True)
            
            return jsonify({"success": True}), 200
        else:
            print("⚠️ Webhook received but no email found.")
            return jsonify({"success": False, "error": "No email"}), 200

    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Helper function to check the signature
def verify_shopify_signature(data, signature, secret):
    if not signature or not secret:
        return False
    digest = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode()
    return hmac.compare_digest(computed_hmac, signature)

@app.route('/')
def home():
    return "Backend is running. Webhook listener active."

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)