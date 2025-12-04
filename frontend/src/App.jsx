import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, CheckCircle, ArrowRight, Loader2, Lock, Star } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState('input'); 
  const [productDesc, setProductDesc] = useState('');
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPro, setIsPro] = useState(false); 
  const logEndRef = useRef(null);

  // *** YOUR ACTUAL PAYU LINK ***
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

    addLog("Initializing search agent...");
    
    try {
      const response = await fetch('https://lead-sniper.onrender.com/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productDesc }),
      });

      const data = await response.json();

      if (data.success) {
        addLog("Connected to Reddit API...");
        setTimeout(() => {
             addLog(`Found ${data.data.length} leads.`);
             setLeads(data.data);
             setStep('results');
             setIsLoading(false);
        }, 1500);
      } 

    } catch (error) {
      console.error(error);
      addLog("⚠️ Error: Backend issue. Retrying...");
      setIsLoading(false);
    }
  };

  const visibleLeads = isPro ? leads : leads.slice(0, 2);

  return (
    <div style={styles.appContainer}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        body { margin: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; }
        textarea:focus { outline: none; border-color: #ea580c; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* --- MOBILE OPTIMIZATION --- */
        @media (max-width: 768px) {
          .mobile-title { font-size: 2rem !important; }
          .mobile-sub { font-size: 1rem !important; }
          .mobile-container { padding: 2rem 1rem !important; }
          .mobile-header { padding: 1rem !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={styles.headerWrapper}>
        <div className="mobile-header" style={styles.headerContent}>
          <div style={styles.logo}>
              <Zap size={24} color="#ea580c" fill="#ea580c" />
              <span>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>
          </div>
          {/* Temporary Toggle for Testing */}
          <button onClick={() => setIsPro(!isPro)} style={styles.demoToggle}>
              {isPro ? "Demo: Pro Active" : "Demo: Free Mode"}
          </button>
        </div>
      </header>

      <main className="mobile-container" style={styles.mainContent}>
        
        {/* INPUT */}
        {step === 'input' && (
          <div style={styles.inputSection}>
            <h1 className="mobile-title" style={styles.title}>Find Customers <span style={{color: '#ea580c'}}>Instantly.</span></h1>
            <p className="mobile-sub" style={styles.subtitle}>Describe your product. AI will find people asking for it.</p>
            <div style={styles.searchBox}>
                <textarea 
                  style={styles.textarea}
                  placeholder="e.g. I have a tool that helps people write better cold emails..."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                />
                <button onClick={handleSearch} disabled={!productDesc.trim() || isLoading} style={styles.button}>
                  {isLoading ? <Loader2 className="spin" /> : <Search size={18} />}
                  Find Leads
                </button>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {step === 'processing' && (
          <div style={styles.terminalSection}>
             <div style={styles.terminalWindow}>
                <div style={styles.terminalHeader}>
                  <div style={{...styles.dot, background: '#ef4444'}}></div>
                  <div style={{...styles.dot, background: '#eab308'}}></div>
                  <div style={{...styles.dot, background: '#22c55e'}}></div>
                  <span style={{marginLeft: 10, fontSize: '0.8rem', color: '#94a3b8'}}>System Activity</span>
                </div>
                <div style={styles.terminalBody}>
                  {logs.map((log, i) => (
                    <div key={i} style={{marginBottom: 5}}>
                      <span style={{opacity: 0.5}}>{`>`}</span> {log}
                    </div>
                  ))}
                  <div ref={logEndRef}></div>
                </div>
             </div>
          </div>
        )}

        {/* RESULTS */}
        {step === 'results' && (
          <div style={styles.resultsSection}>
            <div style={styles.resultsHeader}>
              <h2 style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.5rem'}}>
                <CheckCircle color="#22c55e" /> Found {leads.length} Leads
              </h2>
              <button onClick={() => setStep('input')} style={styles.btnSecondary}>New Search</button>
            </div>

            <div style={styles.leadsList}>
              {visibleLeads.map((lead) => (
                <div key={lead.id} style={styles.leadCard}>
                  <div style={styles.leadHeader}>
                    <span style={styles.badgeScore}>⚡ {lead.score}% Match</span>
                  </div>
                  <h3 style={{margin: '10px 0', fontSize: '1.1rem'}}>{lead.text}</h3>
                  <div style={styles.leadFooter}>
                    <button style={styles.actionBtn}>Reply on Reddit <ArrowRight size={14}/></button>
                  </div>
                </div>
              ))}

              {!isPro && (
                  <div style={styles.paywallCard}>
                      <Lock size={48} color="#ea580c" style={{marginBottom: 15}} />
                      <h3 style={{margin: 0}}>Unlock {leads.length - 2} more leads</h3>
                      <p style={{color: '#64748b'}}>Upgrade to Pro to see all high-intent customers.</p>
                      <a href={PAYU_LINK} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                        <button style={styles.upgradeBtn}>
                            Unlock Now for ₹399 <Star size={16} fill="white" />
                        </button>
                      </a>
                  </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: { 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center' // Fix: Centers everything on PC
  },
  headerWrapper: { 
    background: 'white', 
    borderBottom: '1px solid #e2e8f0', 
    width: '100%', 
    display: 'flex', 
    justifyContent: 'center' 
  },
  headerContent: {
    width: '100%',
    maxWidth: '1000px', // Fix: Limits width so it doesn't stretch too far
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '1.25rem' },
  mainContent: { 
    width: '100%', 
    maxWidth: '800px', // Fix: Keeps content in the middle on PC
    margin: '0 auto', 
    padding: '4rem 1rem' 
  },
  inputSection: { textAlign: 'center' },
  title: { fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 },
  subtitle: { color: '#64748b', fontSize: '1.2rem', marginBottom: '3rem' },
  searchBox: { background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' },
  textarea: { width: '100%', height: '120px', border: '2px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', fontSize: '1rem', resize: 'none', marginBottom: '1rem', fontFamily: 'inherit', boxSizing: 'border-box' },
  button: { background: '#ea580c', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', width: '100%' },
  terminalWindow: { background: '#0f172a', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' },
  terminalHeader: { background: '#1e293b', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' },
  dot: { width: '12px', height: '12px', borderRadius: '50%' },
  terminalBody: { padding: '1.5rem', height: '300px', color: '#4ade80', fontFamily: 'monospace', overflowY: 'auto', textAlign: 'left' },
  resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  btnSecondary: { background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' },
  leadCard: { background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1rem' },
  badgeScore: { background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' },
  leadFooter: { marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' },
  actionBtn: { background: '#fff7ed', color: '#c2410c', border: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 },
  paywallCard: { background: 'linear-gradient(145deg, #fff7ed, #ffffff)', border: '2px dashed #ea580c', padding: '3rem', borderRadius: '0.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  upgradeBtn: { background: '#ea580c', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', boxShadow: '0 10px 15px -3px rgba(234, 88, 12, 0.3)', marginTop: '1rem' },
  demoToggle: { fontSize: '0.7rem', padding: '5px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }
};