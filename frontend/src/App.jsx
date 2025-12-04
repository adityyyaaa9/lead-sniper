import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Zap, CheckCircle, ArrowRight, Loader2, Lock, Star, 
  TrendingUp, Users, MessageCircle, Menu, X, Shield, 
  CreditCard, BarChart, LogOut, ChevronDown, Mail
} from 'lucide-react';

// --- MAIN APP COMPONENT (ROUTER) ---
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null); // null = not logged in
  const [showPopup, setShowPopup] = useState(false);

  // Show "Special Offer" popup after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPopup(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const navigate = (page) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  const handleLogin = (email) => {
    setUser({ name: "Founder", email: email, plan: "free" });
    navigate('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('home');
  };

  return (
    <div className="page">
      <GlobalStyles />
      
      {/* GLOBAL NAVBAR */}
      <Navbar 
        navigate={navigate} 
        user={user} 
        logout={handleLogout} 
        currentPage={currentPage}
      />

      {/* PAGE ROUTING */}
      <main className="content">
        {currentPage === 'home' && <LandingPage navigate={navigate} />}
        {currentPage === 'pricing' && <PricingPage navigate={navigate} />}
        {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
        {currentPage === 'dashboard' && (
          user ? <Dashboard user={user} /> : <LoginPage onLogin={handleLogin} />
        )}
      </main>

      {/* GLOBAL FOOTER */}
      <Footer navigate={navigate} />

      {/* MARKETING POPUP */}
      {showPopup && currentPage === 'home' && (
        <Popup onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}

// --- 1. LANDING PAGE ---
const LandingPage = ({ navigate }) => (
  <div className="landing">
    {/* HERO */}
    <section className="hero-section">
      <div className="badge">✨ New: AI Sentiment Analysis 2.0</div>
      <h1 className="hero-title">
        Find Your Next 100 Customers <br />
        <span className="gradient-text">On Reddit.</span>
      </h1>
      <p className="hero-sub">
        Stop cold emailing. Our AI finds people actively asking for your product in real-time. 
        Get high-intent leads delivered to your dashboard.
      </p>
      <div className="cta-group">
        <button onClick={() => navigate('dashboard')} className="primary-btn big-btn">
          Start Finding Leads <ArrowRight size={20} />
        </button>
        <div className="social-proof">
          <div className="avatars">
             {[1,2,3,4].map(i => <div key={i} className="avatar" />)}
          </div>
          <span>Trusted by 2,400+ founders</span>
        </div>
      </div>
      <img src="https://placehold.co/1200x600/1e293b/white?text=Dashboard+Preview" alt="Dashboard" className="hero-img"/>
    </section>

    {/* FEATURES */}
    <section className="features-section">
      <h2>Why use LeadSniper?</h2>
      <div className="feature-grid">
        <FeatureCard icon={<Zap/>} title="Real-Time Scanning" desc="We monitor 500+ subreddits 24/7 for keywords related to your product." />
        <FeatureCard icon={<BarChart/>} title="Intent Scoring" desc="Our AI reads the context. We only show you leads who want to buy, not just chat." />
        <FeatureCard icon={<Shield/>} title="Safe & Compliant" desc="We respect Reddit API limits and privacy policies so your account stays safe." />
      </div>
    </section>
  </div>
);

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-card feature-card">
    <div className="icon-box">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);

// --- 2. PRICING PAGE ---
const PricingPage = ({ navigate }) => (
  <div className="pricing-section">
    <div className="text-center">
      <h2>Simple, Transparent Pricing</h2>
      <p>Stop paying for leads that don't convert.</p>
    </div>
    <div className="pricing-grid">
      <div className="glass-card price-card">
        <h3>Starter</h3>
        <div className="price">Free</div>
        <ul>
          <li><CheckCircle size={16}/> 3 Leads / Day</li>
          <li><CheckCircle size={16}/> Basic Analysis</li>
          <li><CheckCircle size={16}/> Manual Search</li>
        </ul>
        <button onClick={() => navigate('dashboard')} className="secondary-btn full-width">Get Started</button>
      </div>
      <div className="glass-card price-card featured">
        <div className="pop-tag">MOST POPULAR</div>
        <h3>Pro</h3>
        <div className="price">₹399<span>/mo</span></div>
        <ul>
          <li><CheckCircle size={16}/> Unlimited Leads</li>
          <li><CheckCircle size={16}/> AI Intent Scoring</li>
          <li><CheckCircle size={16}/> Export to CSV</li>
          <li><CheckCircle size={16}/> Priority Support</li>
        </ul>
        <button onClick={() => navigate('dashboard')} className="primary-btn full-width">Start Pro Trial</button>
      </div>
    </div>
  </div>
);

// --- 3. LOGIN PAGE ---
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  return (
    <div className="login-container">
      <div className="glass-card login-box">
        <h2>Welcome Back</h2>
        <p>Enter your email to access your dashboard</p>
        <input 
          type="email" 
          placeholder="name@company.com" 
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={() => onLogin(email || 'User')} className="primary-btn full-width">
          Continue with Email
        </button>
        <div className="divider">OR</div>
        <button onClick={() => onLogin('Google User')} className="secondary-btn full-width">
          Continue with Google
        </button>
      </div>
    </div>
  );
};

// --- 4. DASHBOARD (THE TOOL) ---
const Dashboard = ({ user }) => {
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
      "Scanning subreddits...",
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
    <div className="dashboard-container">
      <div className="dash-header">
        <h2>Dashboard</h2>
        <div className="user-badge">
            <div className="avatar-small">{user.name[0]}</div>
            <span>{user.email}</span>
        </div>
      </div>

      {/* DASHBOARD CONTENT (Reuse your tool logic) */}
      <div className="tool-wrapper">
        {step === 'input' && (
          <div className="input-section">
            <h1 className="tool-title">New Search</h1>
            <p className="tool-sub">Describe your product to find leads.</p>
            <div className="search-box">
                <textarea 
                  className="textarea"
                  placeholder="e.g. I sell a CRM for freelance photographers..."
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                />
                <button onClick={handleSearch} disabled={!productDesc.trim() || isLoading} className="primary-btn search-btn">
                  {isLoading ? <Loader2 className="spin" size={20}/> : "Find Leads Now"}
                </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="center-container">
             <div className="glass-panel terminal">
                <div className="terminal-header">
                  <div className="dots"><div className="dot red"/><div className="dot yellow"/><div className="dot green"/></div>
                  <span className="term-title">Agent-001 (Scanning)</span>
                </div>
                <div className="terminal-body">
                  {logs.map((log, i) => (
                    <div key={i} className="log-entry">
                      <span className="arrow">➜</span> {log}
                    </div>
                  ))}
                  <div ref={logEndRef}></div>
                </div>
             </div>
          </div>
        )}

        {step === 'results' && (
          <div className="results-container">
            <div className="results-header">
              <h3>Found {leads.length} Leads</h3>
              <button onClick={() => setStep('input')} className="secondary-btn">New Search</button>
            </div>

            <div className="grid">
              {visibleLeads.map((lead) => (
                <div key={lead.id} className="glass-panel card">
                  <div className="card-header">
                    <div className="match-badge">
                      <Zap size={12} fill="currentColor" /> {lead.score}% MATCH
                    </div>
                    <span className="time">Just now</span>
                  </div>
                  <h3 className="card-title">{lead.text}</h3>
                  <div className="card-footer">
                    <button className="reply-btn">View Discussion <ArrowRight size={16}/></button>
                  </div>
                </div>
              ))}

              {!isPro && (
                  <div className="glass-panel paywall">
                      <Lock size={40} className="lock-icon" />
                      <h3>Unlock {leads.length - 3} More Leads</h3>
                      <p>Upgrade to Pro to see the full list.</p>
                      <a href={PAYU_LINK} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                        <button className="primary-btn upgrade-btn">
                            Unlock Now - ₹399 <Star size={18} fill="white" />
                        </button>
                      </a>
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- SHARED COMPONENTS ---
const Navbar = ({ navigate, user, logout, currentPage }) => (
  <nav className="nav">
    <div className="logo" onClick={() => navigate('home')}>
        <div className="logo-icon"><Zap size={20} fill="white" stroke="none"/></div>
        <span>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>
    </div>
    <div className="nav-links desktop-only">
        <span onClick={() => navigate('home')} className={currentPage === 'home' ? 'active' : ''}>Home</span>
        <span onClick={() => navigate('pricing')} className={currentPage === 'pricing' ? 'active' : ''}>Pricing</span>
        {user ? (
            <span onClick={logout}>Logout</span>
        ) : (
            <span onClick={() => navigate('login')}>Login</span>
        )}
    </div>
    {user ? (
        <button onClick={() => navigate('dashboard')} className="primary-btn small-btn">Dashboard</button>
    ) : (
        <button onClick={() => navigate('login')} className="primary-btn small-btn">Get Started</button>
    )}
  </nav>
);

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="logo">Lead<span style={{color: '#ea580c'}}>Sniper</span></div>
      <div className="footer-links">
        <span>Terms</span>
        <span>Privacy</span>
        <span>Contact</span>
      </div>
      <div className="copy">© 2025 LeadSniper Inc.</div>
    </div>
  </footer>
);

const Popup = ({ onClose }) => (
  <div className="popup-overlay">
    <div className="popup-card">
      <button onClick={onClose} className="close-btn"><X size={20}/></button>
      <h3>🔥 Special Offer!</h3>
      <p>Get 50% OFF your first month if you sign up today.</p>
      <button className="primary-btn full-width">Claim Offer</button>
    </div>
  </div>
);

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    :root {
      --primary: #ea580c; --primary-dark: #c2410c;
      --bg-dark: #0f172a; --bg-card: #1e293b;
      --glass-bg: rgba(255, 255, 255, 0.03);
      --glass-border: rgba(255, 255, 255, 0.1);
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: var(--bg-dark); color: white; overflow-x: hidden; }
    .page { min-height: 100vh; display: flex; flex-direction: column; }
    .content { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 20px; }

    /* Buttons */
    .primary-btn { background: linear-gradient(to right, var(--primary), var(--primary-dark)); border: none; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .primary-btn:hover { transform: translateY(-2px); }
    .secondary-btn { background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .big-btn { padding: 16px 32px; font-size: 1.1rem; border-radius: 12px; }
    .full-width { width: 100%; }

    /* Navigation */
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid var(--glass-border); }
    .nav-links { display: flex; gap: 30px; font-size: 0.95rem; color: var(--text-muted); cursor: pointer; }
    .nav-links span:hover, .nav-links span.active { color: white; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.25rem; cursor: pointer; }
    .logo-icon { background: var(--primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }

    /* Landing Page */
    .landing { text-align: center; padding: 4rem 0; }
    .hero-title { font-size: 3.5rem; line-height: 1.1; margin-bottom: 20px; font-weight: 800; }
    .gradient-text { background: linear-gradient(to right, #fbbf24, #ea580c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-sub { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; }
    .cta-group { display: flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 50px; }
    .hero-img { width: 100%; border-radius: 16px; border: 1px solid var(--glass-border); box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5); opacity: 0.8; }
    .badge { background: rgba(234, 88, 12, 0.1); color: var(--primary); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; margin-bottom: 20px; display: inline-block; border: 1px solid rgba(234, 88, 12, 0.2); }

    /* Features */
    .features-section { padding: 4rem 0; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px; }
    .glass-card { background: var(--glass-bg); backdrop-filter: blur(10px); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; }
    .icon-box { background: rgba(255,255,255,0.05); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 15px; }

    /* Pricing */
    .pricing-section { padding: 4rem 0; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-top: 40px; max-width: 800px; margin-left: auto; margin-right: auto; }
    .price-card { text-align: center; position: relative; }
    .price-card.featured { border-color: var(--primary); box-shadow: 0 0 30px -10px rgba(234, 88, 12, 0.3); }
    .pop-tag { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
    .price { font-size: 2.5rem; font-weight: 800; margin: 10px 0; }
    .price span { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
    .price-card ul { list-style: none; padding: 0; text-align: left; margin: 20px 0; }
    .price-card li { display: flex; gap: 10px; margin-bottom: 10px; color: #e2e8f0; }

    /* Login */
    .login-container { display: flex; justify-content: center; align-items: center; height: 60vh; }
    .login-box { width: 100%; max-width: 400px; text-align: center; }
    .input-field { width: 100%; padding: 12px; margin: 20px 0; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); color: white; }
    .divider { margin: 20px 0; color: var(--text-muted); font-size: 0.8rem; }

    /* Dashboard */
    .dashboard-container { width: 100%; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .user-badge { display: flex; align-items: center; gap: 10px; background: var(--glass-bg); padding: 5px 15px; border-radius: 20px; border: 1px solid var(--glass-border); }
    .avatar-small { width: 24px; height: 24px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; }
    
    /* Tool Styles (From Previous Code) */
    .search-box { background: white; padding: 1.5rem; border-radius: 1rem; color: #0f172a; margin-top: 20px; }
    .textarea { width: 100%; border: 2px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; font-size: 1rem; resize: none; min-height: 100px; font-family: inherit; }
    .search-btn { margin-top: 15px; width: 100%; }
    .terminal { background: #0f172a; border-radius: 12px; overflow: hidden; max-width: 600px; margin: 0 auto; border: 1px solid var(--glass-border); }
    .terminal-header { background: rgba(255,255,255,0.05); padding: 12px; display: flex; gap: 10px; align-items: center; }
    .terminal-body { padding: 20px; height: 300px; overflow-y: auto; font-family: monospace; color: #4ade80; text-align: left; }
    .log-entry { margin-bottom: 5px; display: flex; gap: 10px; }
    .arrow { color: var(--primary); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
    .card { display: flex; flexDirection: column; justify-content: space-between; }
    .card-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .match-badge { background: rgba(34, 197, 94, 0.1); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; display: flex; gap: 5px; align-items: center; }
    .paywall { grid-column: 1 / -1; text-align: center; padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px; border: 1px dashed var(--primary); }
    .lock-icon { color: var(--primary); margin-bottom: 10px; }

    /* Footer */
    .footer { border-top: 1px solid var(--glass-border); padding: 40px 0; margin-top: 60px; text-align: center; color: var(--text-muted); }
    .footer-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
    .footer-links { display: flex; gap: 20px; font-size: 0.9rem; }

    /* Popup */
    .popup-overlay { position: fixed; bottom: 20px; right: 20px; z-index: 100; animation: slideIn 0.5s ease-out; }
    .popup-card { background: white; color: #0f172a; padding: 20px; border-radius: 12px; width: 300px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative; }
    .close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; color: #94a3b8; }
    
    @keyframes slideIn { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @media (max-width: 768px) {
      .hero-title { font-size: 2.5rem; }
      .footer-content { flex-direction: column; gap: 20px; }
      .nav-links { display: none; }
    }
  `}</style>
);