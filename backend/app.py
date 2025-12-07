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
from openai import OpenAI  # <--- NEW IMPORT

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- 1. SETUP CLIENTS (Crash-Proof) ---
db = None
reddit = None
openai_client = None

# A. Firebase
try:
    if not firebase_admin._apps:
        cred_str = os.environ.get('FIREBASE_CREDENTIALS')
        if cred_str:
            cred_str = cred_str.strip("'").strip('"')
            cred_json = json.loads(cred_str)
            cred = credentials.Certificate(cred_json)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✅ Firebase Admin Initialized")
except Exception as e:
    print(f"⚠️ Firebase Error: {e}")

# B. Reddit
try:
    if os.environ.get("REDDIT_CLIENT_ID"):
        reddit = praw.Reddit(
            client_id=os.environ.get("REDDIT_CLIENT_ID"),
            client_secret=os.environ.get("REDDIT_CLIENT_SECRET"),
            user_agent="leadsniper_saas:v1.0"
        )
        print("✅ Reddit API Initialized")
except Exception as e:
    print(f"⚠️ Reddit Error: {e}")

# C. OpenAI (The Brain)
try:
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        openai_client = OpenAI(api_key=api_key)
        print("✅ OpenAI Initialized")
    else:
        print("⚠️ OpenAI Key Missing - AI features will be simulated")
except Exception as e:
    print(f"⚠️ OpenAI Error: {e}")

# --- HELPER: AI SCORING ---
def analyze_lead_intent(text, product_name):
    """
    Uses OpenAI to score a lead from 0-100 based on buying intent.
    """
    if not openai_client:
        return random.randint(40, 90) # Fallback if no key

    try:
        # We truncate text to 500 chars to save tokens/money
        prompt = f"""
        Analyze this Reddit post. The user is looking for a product like '{product_name}'.
        Rate their buying intent from 0 to 100.
        0 = Irrelevant/Spam. 100 = "Shut up and take my money".
        Return ONLY the number.

        Post: "{text[:500]}"
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo", # Use 3.5 for speed and low cost
            messages=[{"role": "user", "content": prompt}],
            max_tokens=5,
            temperature=0
        )
        
        score = int(response.choices[0].message.content.strip())
        return score
    except Exception as e:
        print(f"AI Analysis Failed: {e}")
        return 50 # Neutral score on error

# --- ROUTES ---

@app.route('/')
def home():
    return "Backend Online. AI: " + ("Active" if openai_client else "Inactive")

@app.route('/api/search', methods=['POST'])
def search_leads():
    try:
        data = request.json or {}
        product_name = data.get('product', 'SaaS')
        print(f"🔎 Searching & Scoring for: {product_name}")

        results = []
        
        # OPTION A: REAL REDDIT + REAL AI
        if reddit:
            try:
                # Limit to 5 posts to prevent timeout (Render has 30s limit)
                for submission in reddit.subreddit("all").search(product_name, limit=5, sort='new'):
                    
                    # 1. Combine title and body for context
                    full_text = f"{submission.title} . {submission.selftext}"
                    
                    # 2. ASK THE AI
                    ai_score = analyze_lead_intent(full_text, product_name)
                    
                    results.append({
                        "id": submission.id,
                        "text": submission.title,
                        "score": ai_score,
                        "url": submission.url
                    })
            except Exception as e:
                print(f"Reddit/AI Loop Error: {e}")
                
        # OPTION B: SIMULATION (Fallback)
        if not results:
            # If no real results found (or keys missing), generate fake ones
            FAKE_COMMENTS = [
                f"I need a tool exactly like {product_name}!",
                f"Has anyone tried {product_name}? I am looking for reviews.",
                f"My boss wants me to find a {product_name} alternative.",
                f"Building a {product_name} from scratch is too hard.",
            ]
            for i in range(4):
                # Calculate score based on keyword presence + randomness
                base_score = 60
                if "alternative" in product_name.lower(): base_score += 20
                
                results.append({
                    "id": f"sim_{i}",
                    "text": random.choice(FAKE_COMMENTS),
                    "score": base_score + random.randint(0, 20)
                })

        # Sort by highest AI score
        results.sort(key=lambda x: x['score'], reverse=True)
        return jsonify({"success": True, "data": results})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/webhook/shopify', methods=['POST'])
def shopify_webhook():
    shopify_secret = os.environ.get('SHOPIFY_SECRET')
    signature = request.headers.get('X-Shopify-Hmac-Sha256')
    data = request.get_data()

    if shopify_secret and not verify_shopify_signature(data, signature, shopify_secret):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        payload = request.json
        customer_email = payload.get('email') or payload.get('customer', {}).get('email')
        
        if customer_email and db:
            print(f"💰 Unlocking {customer_email}")
            db.collection('customers').document(customer_email).set({
                'email': customer_email,
                'isPro': True,
                'purchaseDate': firestore.SERVER_TIMESTAMP,
                'source': 'shopify_webhook'
            }, merge=True)
            return jsonify({"success": True}), 200
        return jsonify({"success": True}), 200

    except Exception as e:
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