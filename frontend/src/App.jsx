import React, { useState, useEffect, useRef } from 'react';

import { Search, Zap, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';



export default function App() {

  const [step, setStep] = useState('input'); // input, processing, results

  const [productDesc, setProductDesc] = useState('');

  const [logs, setLogs] = useState([]);

  const [leads, setLeads] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const logEndRef = useRef(null);



  // Scroll to bottom of logs automatically

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

      // --- CONNECT TO PYTHON BACKEND ---

      const response = await fetch('https://lead-sniper.onrender.com/api/search', {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ product: productDesc }),

      });



      const data = await response.json();



      if (data.success) {

        addLog("Connected to Reddit API...");

        // Add a small delay so the user can see the cool terminal effect

        setTimeout(() => {

             addLog(`Found ${data.data.length} leads.`);

             setLeads(data.data);

             setStep('results');

             setIsLoading(false);

        }, 1500);

      }



    } catch (error) {

      console.error(error);

      addLog("⚠️ Error: Make sure Python backend is running!");

      setIsLoading(false);

    }

  };



  return (

    <div style={styles.appContainer}>

      {/* --- CSS STYLES INJECTED HERE --- */}

      <style>{`

        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

        body { margin: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; }

        textarea:focus { outline: none; border-color: #ea580c; }

        .spin { animation: spin 1s linear infinite; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      `}</style>



      {/* HEADER */}

      <header style={styles.header}>

        <div style={styles.logo}>

            <Zap size={24} color="#ea580c" fill="#ea580c" />

            <span>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>

        </div>

      </header>



      {/* MAIN CONTENT */}

      <main style={styles.mainContent}>

       

        {/* VIEW 1: INPUT */}

        {step === 'input' && (

          <div style={styles.inputSection}>

            <h1 style={styles.title}>Find Customers <span style={{color: '#ea580c'}}>Instantly.</span></h1>

            <p style={styles.subtitle}>Describe your product. AI will find people asking for it.</p>



            <div style={styles.searchBox}>

                <textarea

                  style={styles.textarea}

                  placeholder="e.g. I have a tool that helps people write better cold emails..."

                  value={productDesc}

                  onChange={(e) => setProductDesc(e.target.value)}

                />

                <button

                  onClick={handleSearch}

                  disabled={!productDesc.trim() || isLoading}

                  style={{...styles.button, ...( (!productDesc.trim() || isLoading) ? styles.buttonDisabled : {})}}

                >

                  {isLoading ? <Loader2 className="spin" /> : <Search size={18} />}

                  Find Leads

                </button>

            </div>

          </div>

        )}



        {/* VIEW 2: PROCESSING TERMINAL */}

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



        {/* VIEW 3: RESULTS */}

        {step === 'results' && (

          <div style={styles.resultsSection}>

            <div style={styles.resultsHeader}>

              <h2 style={{display: 'flex', alignItems: 'center', gap: 10}}>

                <CheckCircle color="#22c55e" /> Found {leads.length} Leads

              </h2>

              <button onClick={() => setStep('input')} style={styles.btnSecondary}>New Search</button>

            </div>



            <div style={styles.leadsList}>

              {leads.map((lead) => (

                <div key={lead.id} style={styles.leadCard}>

                  <div style={styles.leadHeader}>

                    <span style={styles.badgeScore}>⚡ {lead.score}% Match</span>

                  </div>

                  <h3 style={{margin: '10px 0', fontSize: '1.1rem'}}>{lead.text}</h3>

                  <div style={styles.leadFooter}>

                    <button style={styles.actionBtn}>

                      Reply on Reddit <ArrowRight size={14}/>

                    </button>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

      </main>

    </div>

  );

}



// --- STYLES OBJECT ---

const styles = {

  appContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },

  header: { background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', alignItems: 'center' },

  logo: { display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '1.25rem' },

  mainContent: { maxWidth: '800px', margin: '0 auto', padding: '4rem 1rem', width: '100%' },

  inputSection: { textAlign: 'center' },

  title: { fontSize: '3rem', marginBottom: '1rem', fontWeight: 800 },

  subtitle: { color: '#64748b', fontSize: '1.2rem', marginBottom: '3rem' },

  searchBox: { background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' },

  textarea: { width: '100%', height: '120px', border: '2px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', fontSize: '1rem', resize: 'none', marginBottom: '1rem', fontFamily: 'inherit', boxSizing: 'border-box' },

  button: { background: '#ea580c', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem', width: '100%' },

  buttonDisabled: { background: '#cbd5e1', cursor: 'not-allowed' },

  terminalWindow: { background: '#0f172a', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' },

  terminalHeader: { background: '#1e293b', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' },

  dot: { width: '12px', height: '12px', borderRadius: '50%' },

  terminalBody: { padding: '1.5rem', height: '300px', color: '#4ade80', fontFamily: 'monospace', overflowY: 'auto', textAlign: 'left' },

  resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },

  btnSecondary: { background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' },

  leadCard: { background: 'white', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1rem', transition: 'all 0.2s' },

  badgeScore: { background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' },

  leadFooter: { marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' },

  actionBtn: { background: '#fff7ed', color: '#c2410c', border: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }

};