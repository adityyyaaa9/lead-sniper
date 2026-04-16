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
# 2. GEMINI BATCH SCORING
# Scores ALL posts in ONE API call instead of 25 separate calls.
# Uses 25x less quota — solves free tier limits permanently.
# ------------------------------------------------------------------

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"

def batch_score_posts(posts, product_name):
    """
    Send all posts to Gemini in ONE call.
    Returns a list of scores matching the posts order.
    """
    if not gemini_api_key:
        return [0] * len(posts)

    # Build numbered list of posts
    posts_text = ""
    for i, post in enumerate(posts):
        title = post['title'][:100]
        body  = post['body'][:150]
        posts_text += f"{i+1}. \"{title}. {body}\"\n"

    prompt = f"""You are a lead scoring AI. A company sells: '{product_name}'

Score each Reddit post below for BUYING INTENT from 0 to 100.
0 = completely irrelevant.
100 = person is actively looking to buy or find this exact solution.

Posts:
{posts_text}

Return ONLY a JSON array of integers in the same order as the posts.
Example for 3 posts: [45, 78, 12]
Return nothing else — just the JSON array."""

    try:
        res = requests.post(
            f"{GEMINI_URL}?key={gemini_api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0,
                    "maxOutputTokens": 200,
                }
            },
            timeout=30
        )

        raw = res.json()
        print(f"🔍 Gemini batch response status: {res.status_code}")

        if res.status_code != 200:
            print(f"❌ Gemini error: {raw}")
            return [0] * len(posts)

        text_out = raw["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"🔍 Gemini batch output: {text_out[:200]}")

        # Parse JSON array from response
        # Find the array in the response even if there's extra text
        start = text_out.find('[')
        end   = text_out.rfind(']') + 1
        if start == -1 or end == 0:
            print("❌ No JSON array found in Gemini response")
            return [0] * len(posts)

        scores = json.loads(text_out[start:end])

        # Validate and clamp scores
        scores = [max(0, min(100, int(s))) for s in scores]

        # Pad with 0s if Gemini returned fewer scores than posts
        while len(scores) < len(posts):
            scores.append(0)

        print(f"✅ Batch scores: {scores}")
        return scores

    except Exception as e:
        print(f"❌ Batch scoring failed: {e}")
        return [0] * len(posts)


def draft_reply(post_text, product_name):
    """Draft a helpful Reddit reply for high-intent leads."""
    if not gemini_api_key:
        return ""

    prompt = f"""Write a short helpful Reddit reply to this post. The writer sells '{product_name}'.
Rules: Sound like a real Reddit user. Be helpful first. Mention '{product_name}' naturally at the end as one option. Max 3 sentences. No exclamation marks.

Post: "{post_text[:400]}"

Reply:"""

    try:
        res = requests.post(
            f"{GEMINI_URL}?key={gemini_api_key}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 150}
            },
            timeout=20
        )
        return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"⚠️ Reply draft failed: {e}")
        return ""


# ------------------------------------------------------------------
# 3. REDDIT PUBLIC JSON SEARCH
# ------------------------------------------------------------------

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; LeadSniper/1.0)"}

def search_reddit_public(query, subreddits=None, limit=25):
    posts = []

    if subreddits:
        for subreddit in subreddits:
            if len(posts) >= limit:
                break
            url    = f"https://www.reddit.com/r/{subreddit}/search.json"
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
                else:
                    print(f"⚠️ r/{subreddit} returned {res.status_code}")
                time.sleep(1)
            except Exception as e:
                print(f"⚠️ Error fetching r/{subreddit}: {e}")
    else:
        url    = "https://www.reddit.com/search.json"
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
            print(f"⚠️ Error searching Reddit: {e}")

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

        # 1. Fetch posts from Reddit
        print(f"🔎 Fetching posts for '{product_name}'...")
        posts = search_reddit_public(product_name, subreddits, limit)
        print(f"  → {len(posts)} posts fetched")

        if not posts:
            job_ref.update({
                "status": "done", "results": [], "total": 0,
                "completedAt": firestore.SERVER_TIMESTAMP,
            })
            return

        # 2. Score ALL posts in ONE Gemini call
        print(f"🧠 Batch scoring {len(posts)} posts with ONE Gemini call...")
        scores = batch_score_posts(posts, product_name)

        # 3. Build results with scores
        results = []
        for i, post in enumerate(posts):
            score      = scores[i] if i < len(scores) else 0
            full_text  = f"{post['title']}. {post['body']}"

            # Draft reply only for hot leads (score >= 60)
            reply_draft = ""
            if score >= 60:
                try:
                    reply_draft = draft_reply(full_text, product_name)
                    time.sleep(1)  # small delay between reply calls
                except Exception as e:
                    print(f"⚠️ Reply draft failed: {e}")

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

        # 4. Sort by highest intent
        results.sort(key=lambda x: x['score'], reverse=True)

        # 5. Save to Firebase
        job_ref.update({
            "status":      "done",
            "results":     results,
            "total":       len(results),
            "completedAt": firestore.SERVER_TIMESTAMP,
        })
        print(f"✅ Job {job_id} complete — {len(results)} leads, scores: {[r['score'] for r in results[:5]]}")

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
    limit        = min(int(data.get('limit', 25)), 25)  # cap at 25 for free tier
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
        "estimated_time_seconds": 30,
    })


@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
    job = db.collection('jobs').document(job_id).get()
    if not job.exists:
        return jsonify({"success": False, "error": "Job not found."}), 404
    d = job.to_dict()
    return jsonify({
        "success": True, "job_id": job_id, "status": d.get("status"),
        "total": d.get("total", 0), "results": d.get("results", []),
        "error": d.get("error"),
    })


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
    email    = request.args.get('email', 'anonymous')
    jobs_ref = (db.collection('jobs').where('userEmail', '==', email)
                  .order_by('createdAt', direction=firestore.Query.DESCENDING).limit(20))
    jobs = []
    for doc in jobs_ref.stream():
        d = doc.to_dict()
        jobs.append({"job_id": d.get("jobId"), "product": d.get("product"),
                     "subreddits": d.get("subreddits"), "status": d.get("status"),
                     "total": d.get("total", 0)})
    return jsonify({"success": True, "jobs": jobs})


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
