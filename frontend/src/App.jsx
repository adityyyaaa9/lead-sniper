import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, CheckCircle, ArrowRight, Loader2, Lock, Star, TrendingUp, Users, MessageCircle, Menu } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState('input'); 
  const [productDesc, setProductDesc] = useState('');
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPro, setIsPro] = useState(false); 
  const logEndRef = useRef(null);

  // *** YOUR PAYU LINK ***
  const PAYU_LINK = "https://u.payu.in/PAYUMN/Hrn6dcOyl0Ic"; 

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  const handleSearch = async () => {
    if (!productDesc.trim()) return;
    
    setStep('processing');
    setIsLoading(true);
    setLogs([]);
    setLeads([]);

    const loadingMessages = [
      "Connecting to Reddit API...",
      "Scanning subreddits for keywords...",
      "Analyzing user sentiment...",
      "Filtering for high intent...",
      "Compiling results..."
    ];

    let msgIndex = 0;
    const interval = setInterval(() => {
      if (msgIndex < loadingMessages.length) {
        addLog(loadingMessages[msgIndex]);
        msgIndex++;
      }
    }, 800);
    
    try {
      const response = await fetch('https://lead-sniper.onrender.com/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productDesc }),
      });

      const data = await response.json();
      clearInterval(interval);

      if (data.success) {
        addLog("✅ Analysis Complete.");
        setTimeout(() => {
             setLeads(data.data);
             setStep('results');
             setIsLoading(false);
        }, 1000);
      } 

    } catch (error) {
      clearInterval(interval);
      console.error(error);
      addLog("⚠️ Error: Backend issue. Retrying...");
      setIsLoading(false);
    }
  };

  const visibleLeads = isPro ? leads : leads.slice(0, 3);

  return (
    <div className="page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        
        /* --- GLOBAL RESETS --- */
        :root {
          --primary: #ea580c;
          --primary-dark: #c2410c;
          --bg-dark: #0f172a;
          --glass-bg: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.1);
          --text-muted: #94a3b8;
        }

        * { box-sizing: border-box; }

        body { 
          margin: 0; 
          font-family: 'Plus Jakarta Sans', sans-serif; 
          background-color: var(--bg-dark); 
          color: white; 
          overflow-x: hidden; /* Prevent horizontal scroll on mobile */
        }

        .page { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          width: 100%;
        }

        /* --- NAVBAR --- */
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.5px;
        }

        .logo-icon {
          background: var(--primary);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-links {
          display: flex;
          gap: 30px;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .nav-link { cursor: pointer; transition: color 0.2s; }
        .nav-link:hover { color: white; }

        /* --- HERO SECTION --- */
        .hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          width: 100%;
        }

        .hero-content {
          max-width: 800px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .badge {
          background: rgba(234, 88, 12, 0.1);
          color: var(--primary);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 20px;
          border: 1px solid rgba(234, 88, 12, 0.2);
          display: inline-block;
        }

        .heading {
          font-size: 4rem;
          line-height: 1.1;
          margin-bottom: 20px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .gradient-text {
          background: linear-gradient(to right, #fbbf24, #ea580c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subheading {
          font-size: 1.25rem;
          color: var(--text-muted);
          margin-bottom: 40px;
          max-width: 600px;
          line-height: 1.6;
        }

        /* --- SEARCH BOX --- */
        .glass-panel {
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border-radius: 16px;
          width: 100%;
        }

        .search-container {
          padding: 8px;
          display: flex;
          flex-direction: column;
        }

        .textarea {
          width: 100%;
          background: transparent;
          border: none;
          color: white;
          font-size: 1.1rem;
          padding: 20px;
          min-height: 100px;
          outline: none;
          resize: none;
          font-family: inherit;
        }

        .search-footer {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .scans {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .primary-btn {
          background: linear-gradient(to right, var(--primary), var(--primary-dark));
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.2s;
          white-space: nowrap;
        }

        .primary-btn:hover { transform: translateY(-2px); }
        .primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .social-proof {
          margin-top: 40px;
          display: flex;
          align-items: center;
          gap: 15px;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        /* --- TERMINAL --- */
        .center-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          width: 100%;
        }

        .terminal {
          width: 100%;
          max-width: 600px;
          border-radius: 12px;
          overflow: hidden;
        }

        .terminal-header {
          background: rgba(0,0,0,0.3);
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dots { display: flex; gap: 6px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .red { background: #ef4444; } .yellow { background: #eab308; } .green { background: #22c55e; }

        .terminal-body {
          padding: 20px;
          height: 300px;
          overflow-y: auto;
          font-family: monospace;
          font-size: 0.9rem;
          color: #e2e8f0;
          text-align: left;
        }

        .log-entry { margin-bottom: 8px; display: flex; align-items: flex-start; }

        /* --- RESULTS --- */
        .results-container {
          padding: 4rem 2rem;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
        }

        .results-title { font-size: 2rem; font-weight: 700; margin: 0 0 5px 0; }
        
        .secondary-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .card-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
        
        .match-badge {
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-title { font-size: 1.1rem; line-height: 1.5; margin-bottom: 20px; flex: 1; }
        
        .card-meta { display: flex; gap: 15px; margin-bottom: 20px; }
        .meta-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); }

        .card-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
        
        .reply-btn {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: none;
          color: white;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .reply-btn:hover { background: rgba(255,255,255,0.1); }

        .paywall {
          grid-column: 1 / -1;
          padding: 60px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px dashed rgba(234, 88, 12, 0.5);
          margin-top: 20px;
        }

        .lock-icon {
          background: rgba(234, 88, 12, 0.1);
          padding: 16px;
          border-radius: 50%;
          color: var(--primary);
          margin-bottom: 20px;
        }

        .upgrade-btn {
          border: none;
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* --- MOBILE RESPONSIVENESS --- */
        @media (max-width: 768px) {
          .heading { font-size: 2.5rem; }
          .subheading { font-size: 1rem; }
          .nav { padding: 1rem; }
          .nav-links { display: none; } /* Hide links on mobile for cleaner look */
          .hero { padding: 1rem; }
          .search-footer { flex-direction: column; gap: 15px; }
          .search-btn { width: 100%; justify-content: center; }
          .results-container { padding: 2rem 1rem; }
          .results-header { flex-direction: column; align-items: flex-start; gap: 15px; }
          .paywall { padding: 30px 15px; }
          .grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="nav">
        <div className="logo">
            <div className="logo-icon"><Zap size={20} fill="white" stroke="none"/></div>
            <span>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>
        </div>
        <div className="nav-links">
            <span className="nav-link">Features</span>
            <span className="nav-link">Pricing</span>
            <span className="nav-link">Login</span>
        </div>
      </nav>

      {/* HERO SECTION */}
      {step === 'input' && (
        <div className="hero">
          <div className="hero-content">
            <div className="badge">✨ AI-Powered Lead Generation</div>
            <h1 className="heading">
              Stop searching.<br />
              Start <span className="gradient-text">closing.</span>
            </h1>
            <p className="subheading">
              Describe your product. Our AI scans millions of Reddit conversations to find people actively looking for a solution like yours.
            </p>

            <div className="glass-panel search-container">
                <textarea 
                  className="textarea"
                  placeholder="e.g. I sell a CRM for freelance photographers..."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                />
                <div className="search-footer">
                    <div className="scans">
                        <TrendingUp size={16} color="#94a3b8" />
                        <span>Scans r/SaaS, r/Entrepreneur + 50 more</span>
                    </div>
                    <button 
                      onClick={handleSearch} 
                      disabled={!productDesc.trim() || isLoading} 
                      className="primary-btn search-btn"
                    >
                      {isLoading ? <Loader2 className="spin" size={20}/> : "Find Leads Now"}
                    </button>
                </div>
            </div>
            
            <div className="social-proof">
                <div style={{display: 'flex', position: 'relative', width: 80}}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{
                        width: 32, height: 32, borderRadius: '50%', 
                        background: '#334155', border: '2px solid #0f172a', 
                        position: 'relative', left: (i-1)*-10
                      }} />
                    ))}
                </div>
                <span>Trusted by 1,200+ founders</span>
            </div>
          </div>
        </div>
      )}

      {/* TERMINAL VIEW */}
      {step === 'processing' && (
        <div className="center-container">
           <div className="glass-panel terminal">
              <div className="terminal-header">
                <div className="dots"><div className="dot red"/><div className="dot yellow"/><div className="dot green"/></div>
                <div style={{fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace'}}>Agent-001 (Scanning)</div>
              </div>
              <div className="terminal-body">
                {logs.map((log, i) => (
                  <div key={i} className="log-entry">
                    <span style={{color: '#ea580c', marginRight: 10}}>➜</span> {log}
                  </div>
                ))}
                <div ref={logEndRef}></div>
              </div>
           </div>
           <p style={{marginTop: 20, color: '#94a3b8', fontSize: '0.9rem'}}>This might take a few seconds...</p>
        </div>
      )}

      {/* RESULTS VIEW */}
      {step === 'results' && (
        <div className="results-container">
          <div className="results-header">
            <div>
                <h2 className="results-title">Targeted Leads Found</h2>
                <p style={{color: '#94a3b8'}}>We found {leads.length} people talking about this right now.</p>
            </div>
            <button onClick={() => setStep('input')} className="secondary-btn">New Search</button>
          </div>

          <div className="grid">
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="glass-panel card">
                <div className="card-header">
                  <div className="match-badge">
                    <Zap size={12} fill="currentColor" /> {lead.score}% MATCH
                  </div>
                  <span style={{fontSize: '0.8rem', color: '#64748b'}}>Just now</span>
                </div>
                
                <h3 className="card-title">{lead.text}</h3>
                
                <div className="card-meta">
                    <div className="meta-item"><Users size={14}/> Reddit User</div>
                    <div className="meta-item"><MessageCircle size={14}/> High Intent</div>
                </div>

                <div className="card-footer">
                  <button className="reply-btn">
                    View Discussion <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
            ))}

            {/* PAYWALL CARD */}
            {!isPro && (
                <div className="glass-panel paywall">
                    <div className="lock-icon"><Lock size={40} /></div>
                    <h3 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: 10}}>Unlock {leads.length - 3} More Leads</h3>
                    <p style={{color: '#94a3b8', marginBottom: 20, maxWidth: 400}}>
                        Upgrade to Pro to see the full list of high-intent buyers, export to CSV, and get daily alerts.
                    </p>
                    <a href={PAYU_LINK} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                        <button className="primary-btn upgrade-btn">
                            Unlock Everything - ₹399 <Star size={18} fill="white" stroke="none" />
                        </button>
                    </a>
                    <p style={{fontSize: '0.8rem', color: '#64748b', marginTop: 15}}>One-time payment. Instant access.</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}