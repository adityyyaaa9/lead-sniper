import time
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

FAKE_COMMENTS = [
    "I'm totally fed up with [Product]. It crashes constantly.",
    "Can anyone recommend a better [Product]? This one is too expensive.",
    "Is it just me or is [Product] getting worse?",
    "I need a [Product] that actually works for small businesses.",
    "Has anyone tried the new [Product] alternative?",
]

@app.route('/')
def home():
    return "The Backend is Running! You are ready for the next step."

@app.route('/api/search', methods=['POST'])
def search_leads():
    data = request.json
    product_name = data.get('product', 'product')
    print(f"Searching for: {product_name}...")
    time.sleep(1.5) # Fake delay
    
    results = []
    for i in range(5):
        comment = random.choice(FAKE_COMMENTS).replace("[Product]", product_name)
        results.append({ "id": i, "text": comment, "score": random.randint(50, 99) })
    
    return jsonify({"success": True, "data": results})

if __name__ == '__main__':
    app.run(debug=True, port=5000)