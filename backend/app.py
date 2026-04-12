import os
import time
import hmac
import hashlib
import base64
import json
import uuid
import threading
import praw
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
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    if client_id and client_secret:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent="leadsniper_saas:v1.0"
        )
        print("✅ Reddit API Initialized")
    else:
        print("⚠️ Reddit API Keys Missing")
except Exception as e:
    print(f"⚠️ Reddit Error: {e}")
 
# C. OpenAI
try:
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        openai_client = OpenAI(api_key=api_key)
        print("✅ OpenAI Initialized")
    else:
        print("⚠️ OpenAI Key Missing")
except Exception as e:
    print(f"⚠️ OpenAI Error: {e}")
 
 
# ------------------------------------------------------------------
# 2. AI HELPERS
# ------------------------------------------------------------------
 
def analyze_lead_intent(text, product_name):
    """Score a Reddit post 0-100 for buying intent using GPT."""
    if not openai_client:
        raise RuntimeError("OpenAI client not initialized — check OPENAI_API_KEY.")
 
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
    score_str = response.choices[0].message.content.strip()
    return int(score_str)
 
 
def draft_reply(post_text, product_name):
    """
    Draft a helpful, non-salesy Reddit reply that naturally mentions the product.
    This is the killer feature — saves agencies hours of manual writing.
    """
    if not openai_client:
        return "OpenAI not configured — reply drafting unavailable."
 
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
# 3. BACKGROUND JOB RUNNER
# ------------------------------------------------------------------
 
def run_lead_search(job_id, product_name, subreddits, limit, user_email):
    """
    Runs in a background thread. Fetches up to `limit` posts,
    scores them, drafts replies, and saves everything to Firebase.
    """
    if not db:
        print("❌ No Firebase — cannot save job results.")
        return
 
    job_ref = db.collection('jobs').document(job_id)
 
    try:
        job_ref.update({"status": "running"})
        results = []
 
        # Decide where to search
        if subreddits:
            # Join multiple subreddits like: marketing+entrepreneur+startups
            subreddit_str = "+".join(s.strip().lstrip("r/") for s in subreddits)
            target = reddit.subreddit(subreddit_str)
        else:
            target = reddit.subreddit("all")
 
        print(f"🔎 Job {job_id}: Searching r/{subreddit_str if subreddits else 'all'} for '{product_name}' (limit={limit})")
 
        for submission in target.search(product_name, limit=limit, sort='new'):
            full_text = f"{submission.title}. {submission.selftext}"
 
            try:
                score = analyze_lead_intent(full_text, product_name)
            except Exception as e:
                print(f"  ⚠️ Scoring failed for {submission.id}: {e}")
                score = 0
 
            # Only draft a reply for high-intent leads (score >= 60) to save API cost
            reply_draft = ""
            if score >= 60:
                try:
                    reply_draft = draft_reply(full_text, product_name)
                except Exception as e:
                    print(f"  ⚠️ Reply draft failed: {e}")
 
            results.append({
                "id": submission.id,
                "title": submission.title,
                "body": submission.selftext[:300],
                "score": score,
                "url": f"https://reddit.com{submission.permalink}",
                "subreddit": submission.subreddit.display_name,
                "reply_draft": reply_draft,
                "created_utc": int(submission.created_utc),
            })
 
            print(f"  ✅ Scored: {submission.title[:40]}... → {score}")
 
        # Sort by highest intent score
        results.sort(key=lambda x: x['score'], reverse=True)
 
        # Save to Firebase
        job_ref.update({
            "status": "done",
            "results": results,
            "total": len(results),
            "completedAt": firestore.SERVER_TIMESTAMP,
        })
        print(f"✅ Job {job_id} complete. {len(results)} leads saved.")
 
    except Exception as e:
        print(f"❌ Job {job_id} failed: {e}")
        job_ref.update({"status": "error", "error": str(e)})
 
 
# ------------------------------------------------------------------
# 4. ROUTES
# ------------------------------------------------------------------
 
@app.route('/')
def home():
    checks = {
        "reddit": "✅ Active" if reddit else "❌ Missing keys",
        "openai": "✅ Active" if openai_client else "❌ Missing key",
        "firebase": "✅ Active" if db else "❌ Not connected",
    }
    return jsonify(checks)
 
 
@app.route('/api/search', methods=['POST'])
def search_leads():
    """
    Kick off a background lead search job.
    Returns a job_id immediately — frontend polls /api/job/<job_id> for results.
 
    Body params:
      - product   (str, required)  : what you're selling, e.g. "HR software"
      - subreddits (list, optional): e.g. ["humanresources", "entrepreneur", "startups"]
                                     Leave empty to search r/all (noisier results)
      - limit     (int, optional)  : how many posts to scan, default 30, max 50
      - email     (str, optional)  : user email for tracking
    """
    if not reddit:
        return jsonify({"success": False, "error": "Reddit API not configured on the server."}), 503
    if not openai_client:
        return jsonify({"success": False, "error": "OpenAI API not configured on the server."}), 503
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured on the server."}), 503
 
    data = request.json or {}
    product_name = data.get('product', '').strip()
    subreddits   = data.get('subreddits', [])   # e.g. ["marketing", "startups"]
    limit        = min(int(data.get('limit', 30)), 50)  # cap at 50
    user_email   = data.get('email', 'anonymous')
 
    if not product_name:
        return jsonify({"success": False, "error": "Please provide a 'product' in the request body."}), 400
 
    # Create job record in Firebase
    job_id = str(uuid.uuid4())
    job_ref = db.collection('jobs').document(job_id)
    job_ref.set({
        "jobId": job_id,
        "product": product_name,
        "subreddits": subreddits,
        "limit": limit,
        "userEmail": user_email,
        "status": "queued",          # queued → running → done / error
        "results": [],
        "total": 0,
        "createdAt": firestore.SERVER_TIMESTAMP,
    })
 
    # Fire the search in a background thread — response returns instantly
    thread = threading.Thread(
        target=run_lead_search,
        args=(job_id, product_name, subreddits, limit, user_email),
        daemon=True
    )
    thread.start()
 
    return jsonify({
        "success": True,
        "job_id": job_id,
        "message": f"Search started. Poll /api/job/{job_id} for results.",
        "estimated_time_seconds": limit * 2,  # rough estimate
    })
 
 
@app.route('/api/job/<job_id>', methods=['GET'])
def get_job(job_id):
    """
    Poll this endpoint to check job status and fetch results.
    Status values: queued | running | done | error
    """
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
 
    job_ref = db.collection('jobs').document(job_id)
    job = job_ref.get()
 
    if not job.exists:
        return jsonify({"success": False, "error": "Job not found."}), 404
 
    job_data = job.to_dict()
    return jsonify({
        "success": True,
        "job_id": job_id,
        "status": job_data.get("status"),
        "total": job_data.get("total", 0),
        "results": job_data.get("results", []),
        "error": job_data.get("error"),
    })
 
 
@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """
    Get all jobs for a user email.
    Query param: ?email=user@example.com
    """
    if not db:
        return jsonify({"success": False, "error": "Firebase not configured."}), 503
 
    email = request.args.get('email', 'anonymous')
    jobs_ref = db.collection('jobs') \
                 .where('userEmail', '==', email) \
                 .order_by('createdAt', direction=firestore.Query.DESCENDING) \
                 .limit(20)
 
    jobs = []
    for doc in jobs_ref.stream():
        d = doc.to_dict()
        jobs.append({
            "job_id": d.get("jobId"),
            "product": d.get("product"),
            "subreddits": d.get("subreddits"),
            "status": d.get("status"),
            "total": d.get("total", 0),
            "createdAt": str(d.get("createdAt")),
        })
 
    return jsonify({"success": True, "jobs": jobs})
 
 
# ------------------------------------------------------------------
# 5. SHOPIFY WEBHOOK (unchanged from original)
# ------------------------------------------------------------------
 
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
            print(f"💰 Unlocking Pro for {customer_email}")
            db.collection('customers').document(customer_email).set({
                'email': customer_email,
                'isPro': True,
                'purchaseDate': firestore.SERVER_TIMESTAMP,
                'source': 'shopify_webhook'
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
 
 
# ------------------------------------------------------------------
# 6. RUN
# ------------------------------------------------------------------
 
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
 