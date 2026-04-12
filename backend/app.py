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
from openai import OpenAI
 
load_dotenv()
 
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
 
# ------------------------------------------------------------------
# 1. SETUP CLIENTS
# ------------------------------------------------------------------
db = None
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
 
# B. OpenAI
try:
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        openai_client = OpenAI(api_key=api_key)
        print("✅ OpenAI Initialized")
    else:
        print("⚠️ OpenAI Key Missing")
except Exception as e:
    print(f"⚠️ OpenAI Error: {e}")
 
# No Reddit API key needed!
print("✅ Reddit: Using public JSON (no API key required)")
 
 
# ------------------------------------------------------------------
# 2. REDDIT PUBLIC JSON SEARCH
# Every Reddit URL has a free .json version — no credentials needed.
# ------------------------------------------------------------------
 
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; LeadSniper/1.0)"
}
 
def search_reddit_public(query, subreddits=None, limit=30):
    """
    Search Reddit using the free public JSON endpoint.
    No API key required. Returns a list of post dicts.
    """
    posts = []
 
    if subreddits:
        # Search each subreddit individually
        for subreddit in subreddits:
            if len(posts) >= limit:
                break
            url = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {
                "q": query,
                "sort": "new",
                "limit": min(25, limit),
                "restrict_sr": "true",
                "t": "month",
            }
            try:
                res = requests.get(url, headers=HEADERS, params=params, timeout=10)
                if res.status_code == 200:
                    children = res.json().get("data", {}).get("children", [])
                    for child in children:
                        p = child.get("data", {})
                        posts.append({
                            "id":          p.get("id", ""),
                            "title":       p.get("title", ""),
                            "body":        p.get("selftext", "")[:300],
                            "subreddit":   p.get("subreddit", subreddit),
                            "url":         f"https://reddit.com{p.get('permalink', '')}",
                            "created_utc": int(p.get("created_utc", 0)),
                        })
                else:
                    print(f"  ⚠️ r/{subreddit} returned {res.status_code}")
                time.sleep(1)  # be polite to Reddit
            except Exception as e:
                print(f"  ⚠️ Error fetching r/{subreddit}: {e}")
 
    else:
        # Search all of Reddit
        url = "https://www.reddit.com/search.json"
        params = {
            "q": query,
            "sort": "new",
            "limit": min(25, limit),
            "t": "month",
        }
        try:
            res = requests.get(url, headers=HEADERS, params=params, timeout=10)
            if res.status_code == 200:
                children = res.json().get("data", {}).get("children", [])
                for child in children:
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
            print(f"  ⚠️ Error searching r/all: {e}")
 
    return posts[:limit]
 
 
# ------------------------------------------------------------------
# 3. AI HELPERS
# ------------------------------------------------------------------
 
def analyze_lead_intent(text, product_name):
    """Score a Reddit post 0-100 for buying intent using GPT."""
    if not openai_client:
        raise RuntimeError("OpenAI client not initialized.")
 
    prompt = f"""
Analyze this Reddit post. The user may be looking for a product like '{product_name}'.
Rate their buying intent from 0 to 100.
0 = Completely irrelevant or spam.
100 = Actively asking to buy or find a solution right now.
Return ONLY the integer number, nothing else.
 
Post: "{text[:600]}"
"""
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=5,
        temperature=0
    )
    return int(response.choices[0].message.content.strip())
 
 
def draft_reply(post_text, product_name):
    """Draft a helpful, non-salesy Reddit reply mentioning the product."""
    if not openai_client:
        return ""
 
    prompt = f"""
You are an expert community manager. Write a short, helpful Reddit reply to the post below.
Rules:
- Sound like a real Reddit user, not a marketer.
- Be genuinely helpful first. Answer their actual question.
- Mention '{product_name}' naturally at the end as ONE possible option, not a hard sell.
- Max 4 sentences. No exclamation marks. No cringe.
 
Post: "{post_text[:600]}"
 
Reply:"""
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0.7
    )
    return response.choices[0].message.content.strip()
 
 
# ------------------------------------------------------------------
# 4. BACKGROUND JOB RUNNER
# ------------------------------------------------------------------
 
def run_lead_search(job_id, product_name, subreddits, limit, user_email):
    """
    Runs in a background thread.
    Fetches posts → scores with AI → drafts replies → saves to Firebase.
    """
    if not db:
        print("❌ No Firebase — cannot save job results.")
        return
 
    job_ref = db.collection('jobs').document(job_id)
 
    try:
        job_ref.update({"status": "running"})
 
        # 1. Fetch posts (no API key needed)
        print(f"🔎 Fetching posts for '{product_name}'...")
        posts = search_reddit_public(product_name, subreddits, limit)
        print(f"  → {len(posts)} posts fetched")
 
        if not posts:
            job_ref.update({
                "status":      "done",
                "results":     [],
                "total":       0,
                "completedAt": firestore.SERVER_TIMESTAMP,
            })
            return
 
        # 2. Score each post and draft replies for hot leads
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
            print(f"  ✅ {post['title'][:40]}... → {score}")
 
        # 3. Sort by highest intent score
        results.sort(key=lambda x: x['score'], reverse=True)
 
        # 4. Save to Firebase
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
        "openai":   "✅ Active" if openai_client else "❌ Missing key",
        "firebase": "✅ Active" if db else "❌ Not connected",
    })
 
 
@app.route('/api/search', methods=['POST'])
def search_leads():
    """
    Kick off a background lead search job.
    Returns job_id immediately — frontend polls /api/job/<job_id>.
 
    Body:
      product    (str, required)
      subreddits (list, optional) e.g. ["startups", "entrepreneur"]
      limit      (int, optional)  default 30, max 50
      email      (str, optional)
    """
    if not openai_client:
        return jsonify({"success": False, "error": "OpenAI API not configured."}), 503
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
 
    data         = request.json or {}
    product_name = data.get('product', '').strip()
    subreddits   = data.get('subreddits', [])
    limit        = min(int(data.get('limit', 30)), 50)
    user_email   = data.get('email', 'anonymous')
 
    if not product_name:
        return jsonify({"success": False, "error": "Please provide a 'product'."}), 400
 
    # Create job record in Firebase
    job_id = str(uuid.uuid4())
    db.collection('jobs').document(job_id).set({
        "jobId":      job_id,
        "product":    product_name,
        "subreddits": subreddits,
        "limit":      limit,
        "userEmail":  user_email,
        "status":     "queued",
        "results":    [],
        "total":      0,
        "createdAt":  firestore.SERVER_TIMESTAMP,
    })
 
    # Fire search in background thread — response returns instantly
    threading.Thread(
        target=run_lead_search,
        args=(job_id, product_name, subreddits, limit, user_email),
        daemon=True
    ).start()
 
    return jsonify({
        "success":                True,
        "job_id":                 job_id,
        "message":                f"Search started. Poll /api/job/{job_id} for results.",
        "estimated_time_seconds": limit * 2,
    })
 
 
@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    """Poll this to check job status and get results."""
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
 
    job = db.collection('jobs').document(job_id).get()
    if not job.exists:
        return jsonify({"success": False, "error": "Job not found."}), 404
 
    d = job.to_dict()
    return jsonify({
        "success": True,
        "job_id":  job_id,
        "status":  d.get("status"),
        "total":   d.get("total", 0),
        "results": d.get("results", []),
        "error":   d.get("error"),
    })
 
 
@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """Get recent jobs for a user. Query param: ?email=user@example.com"""
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
 
    email = request.args.get('email', 'anonymous')
    jobs_ref = (
        db.collection('jobs')
          .where('userEmail', '==', email)
          .order_by('createdAt', direction=firestore.Query.DESCENDING)
          .limit(20)
    )
    jobs = []
    for doc in jobs_ref.stream():
        d = doc.to_dict()
        jobs.append({
            "job_id":     d.get("jobId"),
            "product":    d.get("product"),
            "subreddits": d.get("subreddits"),
            "status":     d.get("status"),
            "total":      d.get("total", 0),
        })
    return jsonify({"success": True, "jobs": jobs})
 
 
# ------------------------------------------------------------------
# 6. SHOPIFY WEBHOOK
# ------------------------------------------------------------------
 
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
                'email':        customer_email,
                'isPro':        True,
                'purchaseDate': firestore.SERVER_TIMESTAMP,
                'source':       'shopify_webhook'
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
 
 
# ------------------------------------------------------------------
# 7. RUN
# ------------------------------------------------------------------
 
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
 