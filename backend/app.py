import os
import time
import hmac
import hashlib
import base64
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ------------------------------------------------------------------
# 1. SETUP CLIENTS
# ------------------------------------------------------------------
db = None
gemini_api_key = None

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

try:
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if gemini_api_key:
        print("✅ Gemini AI Initialized")
    else:
        print("⚠️ Gemini API Key Missing")
except Exception as e:
    print(f"⚠️ Gemini Error: {e}")

print("✅ Reddit: Using public JSON (no API key required)")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"
HEADERS    = {"User-Agent": "Mozilla/5.0 (compatible; LeadSniper/1.0)"}

# ------------------------------------------------------------------
# 2. REDDIT SEARCH
# ------------------------------------------------------------------

def search_reddit_public(query, subreddits=None, limit=15):
    posts = []

    if subreddits:
        for subreddit in subreddits:
            if len(posts) >= limit:
                break
            url    = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {"q": query, "sort": "new", "limit": 10, "restrict_sr": "true", "t": "month"}
            try:
                res = requests.get(url, headers=HEADERS, params=params, timeout=10)
                if res.status_code == 200:
                    for child in res.json().get("data", {}).get("children", []):
                        p = child.get("data", {})
                        posts.append({
                            "id":          p.get("id", ""),
                            "title":       p.get("title", ""),
                            "body":        p.get("selftext", "")[:200],
                            "subreddit":   p.get("subreddit", subreddit),
                            "url":         f"https://reddit.com{p.get('permalink', '')}",
                            "created_utc": int(p.get("created_utc", 0)),
                        })
                time.sleep(0.5)
            except Exception as e:
                print(f"⚠️ Reddit error r/{subreddit}: {e}")
    else:
        url    = "https://www.reddit.com/search.json"
        params = {"q": query, "sort": "new", "limit": limit, "t": "month"}
        try:
            res = requests.get(url, headers=HEADERS, params=params, timeout=10)
            if res.status_code == 200:
                for child in res.json().get("data", {}).get("children", []):
                    p = child.get("data", {})
                    posts.append({
                        "id":          p.get("id", ""),
                        "title":       p.get("title", ""),
                        "body":        p.get("selftext", "")[:200],
                        "subreddit":   p.get("subreddit", "all"),
                        "url":         f"https://reddit.com{p.get('permalink', '')}",
                        "created_utc": int(p.get("created_utc", 0)),
                    })
        except Exception as e:
            print(f"⚠️ Reddit error: {e}")

    return posts[:limit]

# ------------------------------------------------------------------
# 3. BATCH SCORE WITH GEMINI (1 API call for all posts)
# ------------------------------------------------------------------

def batch_score_posts(posts, product_name):
    if not gemini_api_key or not posts:
        return [0] * len(posts)

    posts_text = ""
    for i, post in enumerate(posts):
        posts_text += f"{i+1}. \"{post['title']}. {post['body'][:100]}\"\n"

    prompt = f"""You are a lead scoring AI. A company sells: '{product_name}'

Score each Reddit post below for BUYING INTENT from 0 to 100.
0 = completely irrelevant.
100 = person is actively looking to buy or find this exact type of solution right now.

Posts:
{posts_text}

Return ONLY a valid JSON array of integers. Example: [45, 78, 12, 91]
No explanation, no markdown, just the JSON array."""

    try:
        res = requests.post(
            f"{GEMINI_URL}?key={gemini_api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0, "maxOutputTokens": 300}
            },
            timeout=30
        )

        print(f"🔍 Gemini status: {res.status_code}")
        raw = res.json()

        if res.status_code != 200:
            print(f"❌ Gemini error: {raw.get('error', {}).get('message', 'unknown')}")
            return [0] * len(posts)

        text_out = raw["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"🔍 Gemini output: {text_out[:200]}")

        start  = text_out.find('[')
        end    = text_out.rfind(']') + 1
        if start == -1 or end == 0:
            print("❌ No JSON array in response")
            return [0] * len(posts)

        scores = json.loads(text_out[start:end])
        scores = [max(0, min(100, int(s))) for s in scores]
        while len(scores) < len(posts):
            scores.append(0)

        print(f"✅ Scores: {scores}")
        return scores

    except Exception as e:
        print(f"❌ Batch score failed: {e}")
        return [0] * len(posts)

# ------------------------------------------------------------------
# 4. ROUTES — synchronous search (no background threads)
# ------------------------------------------------------------------

@app.route('/')
def home():
    return jsonify({
        "reddit":   "✅ Public JSON (no API key needed)",
        "gemini":   "✅ Active" if gemini_api_key else "❌ Missing key",
        "firebase": "✅ Active" if db else "❌ Not connected",
    })


@app.route('/api/search', methods=['POST'])
def search_leads():
    """
    Synchronous search — runs everything in the request, returns results directly.
    No background threads, works perfectly on Render free tier.
    Frontend gets results in one response (no polling needed).
    """
    if not gemini_api_key:
        return jsonify({"success": False, "error": "Gemini API not configured."}), 503

    data         = request.json or {}
    product_name = data.get('product', '').strip()
    subreddits   = data.get('subreddits', [])
    limit        = min(int(data.get('limit', 15)), 15)
    user_email   = data.get('email', 'anonymous')

    if not product_name:
        return jsonify({"success": False, "error": "Please provide a 'product'."}), 400

    # 1. Fetch posts
    print(f"🔎 Searching Reddit for: '{product_name}'")
    posts = search_reddit_public(product_name, subreddits, limit)
    print(f"  → {len(posts)} posts found")

    if not posts:
        return jsonify({"success": True, "data": [], "total": 0})

    # 2. Score all posts in ONE Gemini call
    scores = batch_score_posts(posts, product_name)

    # 3. Build results
    results = []
    for i, post in enumerate(posts):
        score = scores[i] if i < len(scores) else 0
        results.append({
            "id":          post["id"],
            "title":       post["title"],
            "text":        post["title"],
            "body":        post["body"],
            "score":       score,
            "url":         post["url"],
            "subreddit":   post["subreddit"],
            "reply_draft": "",
            "created_utc": post["created_utc"],
        })

    # 4. Sort by score
    results.sort(key=lambda x: x['score'], reverse=True)

    # 5. Save to Firebase if available
    if db:
        try:
            db.collection('searches').add({
                "product":   product_name,
                "userEmail": user_email,
                "total":     len(results),
                "createdAt": firestore.SERVER_TIMESTAMP,
            })
        except Exception as e:
            print(f"⚠️ Firebase save failed: {e}")

    print(f"✅ Done — returning {len(results)} leads")
    return jsonify({"success": True, "data": results, "total": len(results)})


@app.route('/api/webhook/shopify', methods=['POST'])
def shopify_webhook():
    shopify_secret = os.environ.get('SHOPIFY_SECRET')
    signature      = request.headers.get('X-Shopify-Hmac-Sha256')
    data           = request.get_data()
    if shopify_secret and not verify_shopify_signature(data, signature, shopify_secret):
        return jsonify({"error": "Unauthorized"}), 401
    try:
        payload        = request.json
        customer_email = payload.get('email') or payload.get('customer', {}).get('email')
        if customer_email and db:
            db.collection('customers').document(customer_email).set({
                'email': customer_email, 'isPro': True,
                'purchaseDate': firestore.SERVER_TIMESTAMP, 'source': 'shopify_webhook'
            }, merge=True)
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def verify_shopify_signature(data, signature, secret):
    if not signature or not secret:
        return False
    digest        = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode()
    return hmac.compare_digest(computed_hmac, signature)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)