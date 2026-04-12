import os
import time
import hmac
import hashlib
import base64
import json
import uuid
import threading
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

# B. Gemini
try:
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if gemini_api_key:
        print("✅ Gemini AI Initialized (free tier)")
    else:
        print("⚠️ Gemini API Key Missing")
except Exception as e:
    print(f"⚠️ Gemini Error: {e}")

print("✅ Reddit: Using public JSON (no API key required)")


# ------------------------------------------------------------------
# 2. GEMINI AI HELPERS
# ------------------------------------------------------------------

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

def analyze_lead_intent(text, product_name):
    """Score a Reddit post 0-100 for buying intent using Gemini."""
    if not gemini_api_key:
        raise RuntimeError("Gemini API key not configured.")

    prompt = f"""Analyze this Reddit post. The user may be looking for a product like '{product_name}'.
Rate their buying intent from 0 to 100.
0 = Completely irrelevant or spam.
100 = Actively asking to buy or find a solution right now.
Return ONLY a single integer number between 0 and 100. No words, no explanation, just the number.

Post: "{text[:500]}"

Score (integer only):"""

    res = requests.post(
        f"{GEMINI_URL}?key={gemini_api_key}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 5,
            }
        },
        timeout=15
    )

    raw = res.json()
    print(f"  🔍 Gemini raw response: {json.dumps(raw)[:300]}")

    # Extract text from response
    try:
        text_out = raw["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"  🔍 Gemini text output: '{text_out}'")
        # Extract only digits
        digits = ''.join(filter(str.isdigit, text_out))
        score = int(digits) if digits else 0
        # Clamp between 0-100
        score = max(0, min(100, score))
        print(f"  🎯 Final score: {score}")
        return score
    except Exception as e:
        print(f"  ❌ Score parse error: {e} | raw: {raw}")
        return 0


def draft_reply(post_text, product_name):
    """Draft a helpful, non-salesy Reddit reply mentioning the product."""
    if not gemini_api_key:
        return ""

    prompt = f"""You are an expert community manager. Write a short, helpful Reddit reply to the post below.
Rules:
- Sound like a real Reddit user, not a marketer.
- Be genuinely helpful first. Answer their actual question.
- Mention '{product_name}' naturally at the end as ONE possible option, not a hard sell.
- Max 4 sentences. No exclamation marks. No cringe.

Post: "{post_text[:500]}"

Reply:"""

    res = requests.post(
        f"{GEMINI_URL}?key={gemini_api_key}",
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 200,
            }
        },
        timeout=15
    )
    try:
        return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"  ⚠️ Reply draft failed: {e}")
        return ""


# ------------------------------------------------------------------
# 3. REDDIT PUBLIC JSON SEARCH
# ------------------------------------------------------------------

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; LeadSniper/1.0)"}

def search_reddit_public(query, subreddits=None, limit=30):
    """Search Reddit using free public JSON. No API key needed."""
    posts = []

    if subreddits:
        for subreddit in subreddits:
            if len(posts) >= limit:
                break
            url = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {"q": query, "sort": "new", "limit": min(25, limit), "restrict_sr": "true", "t": "month"}
            try:
                res = requests.get(url, headers=HEADERS, params=params, timeout=10)
                if res.status_code == 200:
                    for child in res.json().get("data", {}).get("children", []):
                        p = child.get("data", {})
                        posts.append({
                            "id":          p.get("id", ""),
                            "title":       p.get("title", ""),
                            "body":        p.get("selftext", "")[:300],
                            "subreddit":   p.get("subreddit", subreddit),
                            "url":         f"https://reddit.com{p.get('permalink', '')}",
                            "created_utc": int(p.get("created_utc", 0)),
                        })
                time.sleep(1)
            except Exception as e:
                print(f"  ⚠️ Error fetching r/{subreddit}: {e}")
    else:
        url = "https://www.reddit.com/search.json"
        params = {"q": query, "sort": "new", "limit": min(25, limit), "t": "month"}
        try:
            res = requests.get(url, headers=HEADERS, params=params, timeout=10)
            if res.status_code == 200:
                for child in res.json().get("data", {}).get("children", []):
                    p = child.get("data", {})
                    posts.append({
                        "id":          p.get("id", ""),
                        "title":       p.get("title", ""),
                        "body":        p.get("selftext", "")[:300],
                        "subreddit":   p.get("subreddit", "all"),
                        "url":         f"https://reddit.com{p.get('permalink', '')}",
                        "created_utc": int(p.get("created_utc", 0)),
                    })
        except Exception as e:
            print(f"  ⚠️ Error searching Reddit: {e}")

    return posts[:limit]


# ------------------------------------------------------------------
# 4. BACKGROUND JOB RUNNER
# ------------------------------------------------------------------

def run_lead_search(job_id, product_name, subreddits, limit, user_email):
    if not db:
        print("❌ No Firebase.")
        return

    job_ref = db.collection('jobs').document(job_id)

    try:
        job_ref.update({"status": "running"})

        print(f"🔎 Fetching posts for '{product_name}'...")
        posts = search_reddit_public(product_name, subreddits, limit)
        print(f"  → {len(posts)} posts fetched")

        if not posts:
            job_ref.update({"status": "done", "results": [], "total": 0, "completedAt": firestore.SERVER_TIMESTAMP})
            return

        results = []
        for post in posts:
            full_text = f"{post['title']}. {post['body']}"

            try:
                score = analyze_lead_intent(full_text, product_name)
            except Exception as e:
                print(f"  ⚠️ Score failed: {e}")
                score = 0

            reply_draft = ""
            if score >= 60:
                try:
                    reply_draft = draft_reply(full_text, product_name)
                except Exception as e:
                    print(f"  ⚠️ Reply draft failed: {e}")

            results.append({
                "id":          post["id"],
                "title":       post["title"],
                "body":        post["body"],
                "score":       score,
                "url":         post["url"],
                "subreddit":   post["subreddit"],
                "reply_draft": reply_draft,
                "created_utc": post["created_utc"],
            })

            time.sleep(0.5)

        results.sort(key=lambda x: x['score'], reverse=True)

        job_ref.update({
            "status":      "done",
            "results":     results,
            "total":       len(results),
            "completedAt": firestore.SERVER_TIMESTAMP,
        })
        print(f"✅ Job {job_id} complete — {len(results)} leads saved.")

    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        job_ref.update({"status": "error", "error": str(e)})


# ------------------------------------------------------------------
# 5. ROUTES
# ------------------------------------------------------------------

@app.route('/')
def home():
    return jsonify({
        "reddit":   "✅ Public JSON (no API key needed)",
        "gemini":   "✅ Active (free tier)" if gemini_api_key else "❌ Missing key",
        "firebase": "✅ Active" if db else "❌ Not connected",
    })


@app.route('/api/search', methods=['POST'])
def search_leads():
    if not gemini_api_key:
        return jsonify({"success": False, "error": "Gemini API not configured."}), 503
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503

    data         = request.json or {}
    product_name = data.get('product', '').strip()
    subreddits   = data.get('subreddits', [])
    limit        = min(int(data.get('limit', 30)), 50)
    user_email   = data.get('email', 'anonymous')

    if not product_name:
        return jsonify({"success": False, "error": "Please provide a 'product'."}), 400

    job_id = str(uuid.uuid4())
    db.collection('jobs').document(job_id).set({
        "jobId": job_id, "product": product_name, "subreddits": subreddits,
        "limit": limit, "userEmail": user_email, "status": "queued",
        "results": [], "total": 0, "createdAt": firestore.SERVER_TIMESTAMP,
    })

    threading.Thread(
        target=run_lead_search,
        args=(job_id, product_name, subreddits, limit, user_email),
        daemon=True
    ).start()

    return jsonify({
        "success": True,
        "job_id":  job_id,
        "message": f"Search started. Poll /api/job/{job_id} for results.",
        "estimated_time_seconds": limit * 2,
    })


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
    job = db.collection('jobs').document(job_id).get()
    if not job.exists:
        return jsonify({"success": False, "error": "Job not found."}), 404
    d = job.to_dict()
    return jsonify({"success": True, "job_id": job_id, "status": d.get("status"),
                    "total": d.get("total", 0), "results": d.get("results", []), "error": d.get("error")})


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
    email = request.args.get('email', 'anonymous')
    jobs_ref = (db.collection('jobs').where('userEmail', '==', email)
                  .order_by('createdAt', direction=firestore.Query.DESCENDING).limit(20))
    jobs = []
    for doc in jobs_ref.stream():
        d = doc.to_dict()
        jobs.append({"job_id": d.get("jobId"), "product": d.get("product"),
                     "subreddits": d.get("subreddits"), "status": d.get("status"), "total": d.get("total", 0)})
    return jsonify({"success": True, "jobs": jobs})


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
    digest = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode()
    return hmac.compare_digest(computed_hmac, signature)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
