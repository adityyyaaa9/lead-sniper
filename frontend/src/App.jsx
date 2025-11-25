import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Terminal, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  TrendingUp, 
  MessageSquare, 
  User, 
  Zap, 
  Lock,
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react';

// --- MOCK DATA GENERATOR ---
// This simulates the backend AI logic for the demo
const generateMockLeads = (topic) => {
  const keywords = topic.split(' ').filter(w => w.length > 3);
  const mainKeyword = keywords[0] || "product";
  
  const subreddits = ['r/entrepreneur', 'r/marketing', 'r/smallbusiness', 'r/startups', 'r/productivity'];
  
  const templates = [
    { text: `I'm really struggling with ${mainKeyword}. Does anyone have a good solution?`, score: 95, sentiment: "Hot Lead" },
    { text: `Looking for alternatives to my current ${mainKeyword} tool. It's too expensive.`, score: 88, sentiment: "Warm Lead" },
    { text: `Has anyone tried ${mainKeyword} for their business? Is it worth it?`, score: 72, sentiment: "Curious" },
    { text: `I built a ${mainKeyword} from scratch, here is how I did it.`, score: 20, sentiment: "Noise" },
    { text: `Why is finding a decent ${mainKeyword} so hard these days?`, score: 91, sentiment: "Hot Lead" },
  ];

  return Array.from({ length: 8 }).map((_, i) => {
    const template = templates[i % templates.length];
    return {
      id: i,
      username: `user_${Math.floor(Math.random() * 10000)}`,
      subreddit: subreddits[Math.floor(Math.random() * subreddits.length)],
      content: template.text,
      score: template.score,
      sentiment: template.sentiment,
      ago: `${Math.floor(Math.random() * 23) + 1}h ago`,
      comments: Math.floor(Math.random() * 50),
      url: '#'
    };
  }).sort((a, b) => b.score - a.score); // Sort by highest score
};

export default function RedditLeadGenApp() {
  const [step, setStep] = useState('input'); // input, processing, results
  const [productDesc, setProductDesc] = useState('');
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const logEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSearch = () => {
    if (!productDesc.trim()) return;
    setStep('processing');
    setLogs([]);
    
    const steps = [
      { msg: "Analyzing product description...", delay: 800 },
      { msg: `Extracting core keywords: "${productDesc.split(' ').slice(0,3).join(', ')}..."`, delay: 1800 },
      { msg: "Identifying high-relevance subreddits...", delay: 2800 },
      { msg: "Connecting to Reddit API...", delay: 3500 },
      { msg: "Scanning last 24h of discussions...", delay: 4500 },
      { msg: "Filtering for buying intent using GPT-4...", delay: 6000 },
      { msg: "Found 14 potential leads...", delay: 7000 },
      { msg: "Ranking leads by 'Warmth Score'...", delay: 8000 },
    ];

    let currentDelay = 0;
    steps.forEach(({ msg, delay }) => {
      setTimeout(() => {
        setLogs(prev => [...prev, msg]);
      }, delay);
      currentDelay = delay;
    });

    setTimeout(() => {
      setLeads(generateMockLeads(productDesc));
      setStep('results');
    }, 8500);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-xl tracking-tight">LeadSniper<span className="text-blue-600">.ai</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-blue-600">How it works</a>
            <a href="#" className="hover:text-blue-600">Pricing</a>
            <div className="h-4 w-px bg-slate-300"></div>
            <button className="text-slate-900 hover:text-blue-600">Login</button>
            <button className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">Get Started</button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        
        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Stop Cold Calling. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  Find People Asking for Your Product.
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Our AI scans Reddit for people actively complaining about their current solution or asking for recommendations. Reach out when they are warmest.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2">
              <div className="p-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Describe what you are selling in plain English
                </label>
                <textarea 
                  className="w-full h-32 p-4 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-300"
                  placeholder="e.g. An affordable email marketing tool for small agencies that helps with deliverability..."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                />
              </div>
              <div className="bg-slate-50 px-6 py-4 rounded-xl flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <TrendingUp size={16} />
                  <span>Scans 500+ communities</span>
                </div>
                <button 
                  onClick={handleSearch}
                  disabled={!productDesc.trim()}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all transform active:scale-95 ${
                    productDesc.trim() 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200' 
                    : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Search size={18} />
                  Find Warm Leads
                </button>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: MessageSquare, title: "Context Aware", desc: "Doesn't just keyword match. Understands buying intent." },
                { icon: Filter, title: "Zero Noise", desc: "Filters out competitors and informational posts." },
                { icon: TrendingUp, title: "Real-Time", desc: "Finds leads posted in the last 24 hours." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center p-4">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-3">
                    <item.icon size={24} />
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === 'processing' && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
             <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl font-mono text-sm">
                <div className="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-slate-400 text-xs">AI Agent Worker</span>
                </div>
                <div className="p-6 h-80 overflow-y-auto space-y-3">
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 text-green-400 animate-in slide-in-from-left-2 fade-in duration-300">
                      <span className="text-slate-600 select-none">{`>`}</span>
                      <span>{log}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} className="flex gap-3 text-green-400">
                     <span className="text-slate-600 select-none">{`>`}</span>
                     <span className="animate-pulse">_</span>
                  </div>
                </div>
             </div>
             <p className="text-center text-slate-500 mt-6 animate-pulse">
               Analyzing millions of discussions... please wait.
             </p>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {step === 'results' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="text-green-500" />
                  Analysis Complete
                </h2>
                <p className="text-slate-500">Found {leads.length} high-intent conversations for your product.</p>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={() => { setStep('input'); setProductDesc(''); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                >
                  New Search
                </button>
                <button 
                  onClick={() => setShowPaywall(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg hover:bg-slate-800 transition shadow-lg"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="p-4">Relevance</th>
                      <th className="p-4 w-1/2">Discussion Context</th>
                      <th className="p-4">Subreddit</th>
                      <th className="p-4">Time</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            lead.score > 90 ? 'bg-green-100 text-green-700' :
                            lead.score > 80 ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            <Zap size={12} fill="currentColor" />
                            {lead.score}% Match
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-900 font-medium mb-1 line-clamp-2">
                            "{lead.content}"
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <User size={12} /> {lead.username}
                            <span>•</span>
                            <MessageSquare size={12} /> {lead.comments} comments
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {lead.subreddit}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                          {lead.ago}
                        </td>
                        <td className="p-4">
                          <a 
                            href={lead.url} 
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View <ChevronRight size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6 text-center text-sm text-slate-400">
              Showing top 8 results. <button onClick={() => setShowPaywall(true)} className="text-blue-600 hover:underline">Upgrade to Pro</button> to see all 42 results.
            </div>
          </div>
        )}
      </main>

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Unlock Full Report</h3>
              <p className="text-slate-600 mb-8">
                Export all 42 identified leads to CSV and get real-time alerts for new keywords.
              </p>
              
              <div className="space-y-4">
                <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                  Start 7-Day Free Trial
                </button>
                <button className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition">
                  $29 / month
                </button>
              </div>
              
              <p className="text-xs text-slate-400 mt-6">
                No credit card required for trial. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}