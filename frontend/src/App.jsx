import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, CheckCircle, ArrowRight, Loader2, Lock, Star, TrendingUp, Users, MessageCircle } from 'lucide-react';

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

  const visibleLeads = isPro ? leads : leads.slice(0, 3); // Showing 3 free leads looks generous

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f172a; color: white; }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .gradient-text {
          background: linear-gradient(to right, #fbbf24, #ea580c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .primary-btn {
          background: linear-gradient(to right, #ea580c, #c2410c);
          transition: all 0.2s;
        }
        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(234, 88, 12, 0.4);
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      {/* NAVBAR */}
      <nav style={styles.nav}>
        <div style={styles.logo}>
            <div style={styles.logoIcon}><Zap size={20} fill="white" stroke="none"/></div>
            <span style={{fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px'}}>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>
        </div>
        <div style={styles.navLinks}>
            <span style={styles.navLink}>Features</span>
            <span style={styles.navLink}>Pricing</span>
            <span style={styles.navLink}>Login</span>
        </div>
      </nav>

      {/* HERO SECTION */}
      {step === 'input' && (
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.badge}>✨ AI-Powered Lead Generation</div>
            <h1 style={styles.heading}>
              Stop searching.<br />
              Start <span className="gradient-text">closing.</span>
            </h1>
            <p style={styles.subheading}>
              Describe your product. Our AI scans millions of Reddit conversations to find people actively looking for a solution like yours.
            </p>

            <div className="glass-panel" style={styles.searchContainer}>
                <textarea 
                  style={styles.textarea}
                  placeholder="e.g. I sell a CRM for freelance photographers..."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                />
                <div style={styles.searchFooter}>
                    <div style={styles.scans}>
                        <TrendingUp size={16} color="#94a3b8" />
                        <span>Scans r/SaaS, r/Entrepreneur + 50 more</span>
                    </div>
                    <button 
                      onClick={handleSearch} 
                      disabled={!productDesc.trim() || isLoading} 
                      className="primary-btn"
                      style={styles.searchBtn}
                    >
                      {isLoading ? <Loader2 className="spin" size={20}/> : "Find Leads Now"}
                    </button>
                </div>
            </div>
            
            <div style={styles.socialProof}>
                <div style={styles.avatars}>
                    {[1,2,3].map(i => <div key={i} style={{...styles.avatar, left: (i-1)*-10}} />)}
                </div>
                <span>Trusted by 1,200+ founders</span>
            </div>
          </div>
        </div>
      )}

      {/* TERMINAL VIEW */}
      {step === 'processing' && (
        <div style={styles.centerContainer}>
           <div className="glass-panel" style={styles.terminal}>
              <div style={styles.terminalHeader}>
                <div style={styles.dots}><div style={styles.dotRed}/><div style={styles.dotYellow}/><div style={styles.dotGreen}/></div>
                <div style={styles.terminalTitle}>Agent-001 (Scanning)</div>
              </div>
              <div style={styles.terminalBody}>
                {logs.map((log, i) => (
                  <div key={i} style={styles.logEntry}>
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
        <div style={styles.resultsContainer}>
          <div style={styles.resultsHeader}>
            <div>
                <h2 style={styles.resultsTitle}>Targeted Leads Found</h2>
                <p style={{color: '#94a3b8'}}>We found {leads.length} people talking about this right now.</p>
            </div>
            <button onClick={() => setStep('input')} style={styles.secondaryBtn}>New Search</button>
          </div>

          <div style={styles.grid}>
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="glass-panel" style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.matchBadge}>
                    <Zap size={12} fill="currentColor" /> {lead.score}% MATCH
                  </div>
                  <span style={styles.timeAgo}>Just now</span>
                </div>
                
                <h3 style={styles.cardTitle}>{lead.text}</h3>
                
                <div style={styles.cardMeta}>
                    <div style={styles.metaItem}><Users size={14}/> Reddit User</div>
                    <div style={styles.metaItem}><MessageCircle size={14}/> High Intent</div>
                </div>

                <div style={styles.cardFooter}>
                  <button style={styles.replyBtn}>
                    View Discussion <ArrowRight size={16}/>
                  </button>
                </div>
              </div>
            ))}

            {/* PAYWALL CARD */}
            {!isPro && (
                <div className="glass-panel" style={styles.paywall}>
                    <div style={styles.lockIcon}><Lock size={40} /></div>
                    <h3 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: 10}}>Unlock {leads.length - 3} More Leads</h3>
                    <p style={{color: '#94a3b8', marginBottom: 20, maxWidth: 400}}>
                        Upgrade to Pro to see the full list of high-intent buyers, export to CSV, and get daily alerts.
                    </p>
                    <a href={PAYU_LINK} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                        <button className="primary-btn" style={styles.upgradeBtn}>
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

// --- MODERN DARK THEME STYLES ---
const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoIcon: { background: '#ea580c', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navLinks: { display: 'flex', gap: 30, fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 },
  navLink: { cursor: 'pointer', transition: 'color 0.2s' },
  
  hero: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  heroContent: { maxWidth: 800, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  badge: { background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c', padding: '6px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, marginBottom: 20, border: '1px solid rgba(234, 88, 12, 0.2)' },
  heading: { fontSize: '4rem', lineHeight: 1.1, marginBottom: 20, fontWeight: 800, letterSpacing: '-1px' },
  subheading: { fontSize: '1.25rem', color: '#94a3b8', marginBottom: 40, maxWidth: 600, lineHeight: 1.6 },
  
  searchContainer: { width: '100%', padding: 8, borderRadius: 16, display: 'flex', flexDirection: 'column' },
  textarea: { width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '1.1rem', padding: '20px', minHeight: 100, outline: 'none', resize: 'none', fontFamily: 'inherit' },
  searchFooter: { borderTop: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  scans: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#64748b' },
  searchBtn: { border: 'none', color: 'white', padding: '12px 24px', borderRadius: 10, fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 },
  
  socialProof: { marginTop: 40, display: 'flex', alignItems: 'center', gap: 15, color: '#64748b', fontSize: '0.9rem' },
  avatars: { display: 'flex', position: 'relative', width: 80 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#334155', border: '2px solid #0f172a', position: 'relative' },

  centerContainer: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 },
  terminal: { width: '100%', maxWidth: 600, borderRadius: 12, overflow: 'hidden' },
  terminalHeader: { background: 'rgba(0,0,0,0.3)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  dots: { display: 'flex', gap: 6 },
  dotRed: { width: 10, height: 10, borderRadius: '50%', background: '#ef4444' },
  dotYellow: { width: 10, height: 10, borderRadius: '50%', background: '#eab308' },
  dotGreen: { width: 10, height: 10, borderRadius: '50%', background: '#22c55e' },
  terminalTitle: { fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' },
  terminalBody: { padding: 20, height: 300, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', color: '#e2e8f0' },
  logEntry: { marginBottom: 8, display: 'flex', alignItems: 'flex-start' },

  resultsContainer: { padding: '4rem 2rem', maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 },
  resultsTitle: { fontSize: '2rem', fontWeight: 700, marginBottom: 5 },
  secondaryBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 },
  card: { padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 15 },
  matchBadge: { background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 },
  timeAgo: { fontSize: '0.8rem', color: '#64748b' },
  cardTitle: { fontSize: '1.1rem', lineHeight: 1.5, marginBottom: 20, flex: 1 },
  cardMeta: { display: 'flex', gap: 15, marginBottom: 20 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#94a3b8' },
  cardFooter: { borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20 },
  replyBtn: { width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' },

  paywall: { gridColumn: '1 / -1', padding: 60, borderRadius: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px dashed rgba(234, 88, 12, 0.5)', marginTop: 20 },
  lockIcon: { background: 'rgba(234, 88, 12, 0.1)', padding: 16, borderRadius: '50%', color: '#ea580c', marginBottom: 20 },
  upgradeBtn: { border: 'none', color: 'white', padding: '16px 32px', borderRadius: 12, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }
};