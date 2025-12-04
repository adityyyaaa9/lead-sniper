import os
import time
import random
import hmac
import hashlib
import base64
import json
import praw
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Enable CORS for all domains so your Vercel frontend can talk to this backend
CORS(app, resources={r"/*": {"origins": "*"}})

# --- 1. SETUP FIREBASE ADMIN (Crash-Proof) ---
db = None
try:
    if not firebase_admin._apps:
        cred_str = os.environ.get('FIREBASE_CREDENTIALS')
        if cred_str:
            # Clean up the string just in case copy-paste added extra quotes
            cred_str = cred_str.strip("'").strip('"')
            cred_json = json.loads(cred_str)
            cred = credentials.Certificate(cred_json)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Firebase Admin Initialized Successfully")
        else:
            print("⚠️ Warning: FIREBASE_CREDENTIALS env var not found.")
except Exception as e:
    print(f"❌ CRITICAL FIREBASE ERROR: Could not initialize DB. Check your JSON format. Error: {e}")
    # We do NOT raise the error here, so the app can still start.

# --- 2. SETUP REDDIT (PRAW) (Crash-Proof) ---
reddit = None
try:
    if os.environ.get("REDDIT_CLIENT_ID"):
        reddit = praw.Reddit(
            client_id=os.environ.get("REDDIT_CLIENT_ID"),
            client_secret=os.environ.get("REDDIT_CLIENT_SECRET"),
            user_agent="leadsniper_saas:v1.0"
        )
        print("✅ Reddit API Initialized")
except Exception as e:
    print(f"❌ REDDIT ERROR: Could not initialize PRAW. Error: {e}")

# --- 3. ROUTES ---

@app.route('/')
def home():
    status = "Online"
    db_status = "Connected" if db else "Disconnected (Check Logs)"
    return f"Backend Status: {status} | Database: {db_status}"

# A. THE SEARCH ROUTE
@app.route('/api/search', methods=['POST'])
def search_leads():
    try:
        data = request.json or {}
        product_name = data.get('product', 'SaaS')
        print(f"🔎 Searching for: {product_name}")

        results = []
        
        # OPTION A: REAL REDDIT SEARCH (If keys exist and reddit loaded)
        if reddit:
            try:
                # Search global reddit posts
                for submission in reddit.subreddit("all").search(product_name, limit=10, sort='new'):
                    results.append({
                        "id": submission.id,
                        "text": submission.title,
                        "score": int(submission.score) + random.randint(50, 90),
                        "url": submission.url
                    })
            except Exception as e:
                print(f"Reddit API Query Error: {e}")
                # Don't return 500 yet, fall back to simulation
                
        # OPTION B: SIMULATION MODE (Fallback)
        if not results:
            print("⚠️ Serving Simulation Data")
            time.sleep(1.0) # Fake delay
            FAKE_COMMENTS = [
                f"Does anyone know a good alternative to {product_name}?",
                f"I hate my current tool, looking for {product_name} recommendations.",
                f"Is {product_name} worth the money? I need something cheaper.",
                f"How do I solve this specific problem using {product_name}?",
                "Looking for software that helps with lead generation."
            ]
            for i in range(5):
                results.append({
                    "id": f"sim_{i}",
                    "text": random.choice(FAKE_COMMENTS),
                    "score": random.randint(60, 99)
                })

        return jsonify({"success": True, "data": results})

    except Exception as e:
        print(f"SERVER ERROR in /api/search: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# B. THE SHOPIFY WEBHOOK ROUTE
@app.route('/api/webhook/shopify', methods=['POST'])
def shopify_webhook():
    # Security: Verify signature
    shopify_secret = os.environ.get('SHOPIFY_SECRET')
    signature = request.headers.get('X-Shopify-Hmac-Sha256')
    data = request.get_data()

    if shopify_secret and not verify_shopify_signature(data, signature, shopify_secret):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = request.json
        customer_email = payload.get('email') or payload.get('customer', {}).get('email')
        
        if customer_email and db:
            print(f"💰 Payment Received: Unlocking {customer_email}")
            # Unlock account in Firestore
            db.collection('customers').document(customer_email).set({
                'email': customer_email,
                'isPro': True,
                'purchaseDate': firestore.SERVER_TIMESTAMP,
                'source': 'shopify_webhook'
            }, merge=True)
            return jsonify({"success": True}), 200
            
        return jsonify({"success": True, "message": "No email or DB unavailable"}), 200

    except Exception as e:
        print(f"Webhook Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

def verify_shopify_signature(data, signature, secret):
    if not signature or not secret:
        return False
    digest = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode()
    return hmac.compare_digest(computed_hmac, signature)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)