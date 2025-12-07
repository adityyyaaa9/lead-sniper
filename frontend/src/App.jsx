import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useNavigate, 
  useLocation,
  Link,
  Navigate
} from 'react-router-dom';

import { 
  Search, Zap, CheckCircle, ArrowRight, Loader2, Lock, Star, 
  TrendingUp, Users, MessageCircle, Menu, X, Shield, 
  CreditCard, BarChart, LogOut, ChevronDown, Mail, Phone, Key
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber 
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// --- 1. FIREBASE CONFIGURATION (Merged) ---
const firebaseConfig = {
  apiKey: "AIzaSyAuM17cw3dK6R017kesDiQHDQtgXY_GZ_4", 
  authDomain: "lead-sniper-auth.firebaseapp.com",
  projectId: "lead-sniper-auth",
  storageBucket: "lead-sniper-auth.firebasestorage.app",
  messagingSenderId: "167412952560",
  appId: "1:167412952560:web:3c60c4f0c9742476860135"
};

// Initialize Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 2. AUTH CONTEXT (Cleaned) ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // CHECK DATABASE
        try {
            const docRef = doc(db, "customers", currentUser.email); 
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().isPro === true) {
                setIsPro(true);
            } else {
                setIsPro(false);
            }
        } catch (error) {
            console.error("Error fetching pro status:", error);
            setIsPro(false);
        }
      } else {
        setUser(null);
        setIsPro(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isPro, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// --- 3. PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ children }) => {
  const { user, isPro } = useAuth(); 

  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

// --- 4. MAIN APP COMPONENT ---
export default function App() {
  const PAYU_LINK = "https://u.payu.in/PAYUMN/Hrn6dcOyl0Ic"; 

  return (
    <AuthProvider>
      <Router>
        <div className="page">
          <GlobalStyles />
          <Navbar />
          
          <main className="content">
            <Routes>
              {/* PUBLIC ROUTES */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* PROTECTED ROUTE */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard payLink={PAYU_LINK} />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

// --- SHARED COMPONENTS ---

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="nav">
      <div className="logo" onClick={() => navigate('/')}>
          <div className="logo-icon"><Zap size={20} fill="white" stroke="none"/></div>
          <span>Lead<span style={{color: '#ea580c'}}>Sniper</span></span>
      </div>
      <div className="nav-links desktop-nav">
          <span onClick={() => navigate('/')} className={location.pathname === '/' ? 'active' : ''}>Home</span>
          <span onClick={() => navigate('/pricing')} className={location.pathname === '/pricing' ? 'active' : ''}>Pricing</span>
          {user ? <span onClick={handleLogout}>Logout</span> : <span onClick={() => navigate('/login')}>Login</span>}
      </div>
      {user ? 
        <button onClick={() => navigate('/dashboard')} className="primary-btn small-btn">Dashboard</button> 
        : 
        <button onClick={() => navigate('/login')} className="primary-btn small-btn">Get Started</button>
      }
    </nav>
  );
};

// --- LANDING PAGE ---
const LandingPage = () => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if(!user) {
      const timer = setTimeout(() => setShowPopup(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="landing">
      <section className="hero-section">
        <div className="badge">✨ AI Sentiment Analysis 2.0</div>
        <h1 className="hero-title">
          Find Your Next 100 Customers <br />
          <span className="gradient-text">On Reddit.</span>
        </h1>
        <p className="hero-sub">
          Stop cold emailing. Our AI finds people actively asking for your product in real-time. 
        </p>
        <div className="cta-group">
          <button onClick={() => navigate('/dashboard')} className="primary-btn big-btn">
            Start Finding Leads <ArrowRight size={20} />
          </button>
          <div className="social-proof">
            <div className="avatars">
               {[1,2,3,4].map(i => <div key={i} className="avatar" />)}
            </div>
            <span>Trusted by 2,400+ founders</span>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why use LeadSniper?</h2>
        <div className="feature-grid">
          <FeatureCard icon={<Zap/>} title="Real-Time Scanning" desc="We monitor 500+ subreddits 24/7." />
          <FeatureCard icon={<BarChart/>} title="Intent Scoring" desc="Our AI reads context to find buyers." />
          <FeatureCard icon={<Shield/>} title="Safe & Compliant" desc="We respect Reddit API limits." />
        </div>
      </section>

      {showPopup && !user && <Popup onClose={() => setShowPopup(false)} />}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="glass-card feature-card">
    <div className="icon-box">{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);

// --- PRICING PAGE ---
const PricingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pricing-section">
      <div className="text-center">
        <h2>Simple Pricing</h2>
        <p>Stop paying for bad leads.</p>
      </div>
      <div className="pricing-grid">
        <div className="glass-card price-card">
          <h3>Starter</h3>
          <div className="price">Free</div>
          <ul>
            <li><CheckCircle size={16}/> 3 Leads / Day</li>
            <li><CheckCircle size={16}/> Basic Analysis</li>
          </ul>
          <button onClick={() => navigate('/dashboard')} className="secondary-btn full-width">Get Started</button>
        </div>
        <div className="glass-card price-card featured">
          <div className="pop-tag">POPULAR</div>
          <h3>Pro</h3>
          <div className="price">₹399<span>/mo</span></div>
          <ul>
            <li><CheckCircle size={16}/> Unlimited Leads</li>
            <li><CheckCircle size={16}/> Export to CSV</li>
          </ul>
          <button onClick={() => navigate('/dashboard')} className="primary-btn full-width">Start Pro Trial</button>
        </div>
      </div>
    </div>
  );
};

// --- LOGIN PAGE ---
const LoginPage = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('options'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      handleSuccess();
    } catch (error) {
      console.error("Login Failed:", error);
      alert("Google Login failed. Please try again.");
    }
  };

  const handleEmailLogin = async () => {
    try { 
      await signInWithEmailAndPassword(auth, email, password);
      handleSuccess();
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleEmailSignup = async () => {
    try { 
      await createUserWithEmailAndPassword(auth, email, password);
      handleSuccess();
    } catch (error) { alert("Error: " + error.message); }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', 'callback': () => {}
      });
    }
  };

  const handleSendOtp = async () => {
    setupRecaptcha();
    const appVerifier = window.recaptchaVerifier;
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; 
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
    } catch (error) {
      console.error(error);
      alert("SMS Failed: " + error.message);
    }
  };

  const handleVerifyOtp = async () => {
    try { 
      await confirmationResult.confirm(otp);
      handleSuccess();
    } catch (error) { alert("Invalid OTP"); }
  };

  return (
    <div className="login-container">
      <div className="glass-card login-box">
        <h2>Welcome Back</h2>
        <p style={{marginBottom: 20}}>Login to access dashboard</p>

        {authMode === 'options' && (
          <div className="auth-options">
            <button onClick={handleGoogleLogin} className="google-btn full-width mb-10">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
              Continue with Google
            </button>
            <button onClick={() => setAuthMode('email-login')} className="secondary-btn full-width mb-10">
              <Mail size={18} style={{marginRight: 8}}/> Continue with Email
            </button>
            <button onClick={() => setAuthMode('phone')} className="secondary-btn full-width">
              <Phone size={18} style={{marginRight: 8}}/> Continue with Phone
            </button>
          </div>
        )}

        {authMode === 'email-login' && (
          <div className="email-form">
            <input type="email" placeholder="Email" className="input-field" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input-field" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button onClick={handleEmailLogin} className="primary-btn full-width mb-10">Log In</button>
            <p className="text-small">No account? <span className="link" onClick={()=>setAuthMode('email-signup')}>Sign Up</span></p>
            <span className="link back-link" onClick={()=>setAuthMode('options')}>← Back</span>
          </div>
        )}

        {authMode === 'email-signup' && (
          <div className="email-form">
            <input type="email" placeholder="Email" className="input-field" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="input-field" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button onClick={handleEmailSignup} className="primary-btn full-width mb-10">Create Account</button>
            <p className="text-small">Have account? <span className="link" onClick={()=>setAuthMode('email-login')}>Log In</span></p>
            <span className="link back-link" onClick={()=>setAuthMode('options')}>← Back</span>
          </div>
        )}

        {authMode === 'phone' && (
          <div className="phone-form">
            {!showOtpInput ? (
              <>
                <input type="tel" placeholder="Phone (e.g. 9876543210)" className="input-field" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                <div id="recaptcha-container"></div>
                <button onClick={handleSendOtp} className="primary-btn full-width mb-10">Send OTP</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="Enter OTP" className="input-field" value={otp} onChange={(e)=>setOtp(e.target.value)} />
                <button onClick={handleVerifyOtp} className="primary-btn full-width mb-10">Verify & Login</button>
              </>
            )}
            <span className="link back-link" onClick={()=>setAuthMode('options')}>← Back</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- DASHBOARD (CONNECTED TO DB) ---
const Dashboard = ({ payLink }) => {
  const [step, setStep] = useState('input'); 
  const [productDesc, setProductDesc] = useState('');
  const [logs, setLogs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const logEndRef = useRef(null);
  
  // GET REAL DATA FROM CONTEXT
  const { user, isPro } = useAuth(); 

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  const handleSearch = async () => {
    if (!productDesc.trim()) return;
    setStep('processing');
    setIsLoading(true);
    setLogs([]);
    
    // NOTE: This fetch URL is for your Python backend. Ensure that backend is running and CORS is enabled.
    const loadingMessages = ["Connecting to API...", "Scanning subreddits...", "Analyzing sentiment...", "Filtering leads...", "Finalizing..."];
    let msgIndex = 0;
    const interval = setInterval(() => {
      if (msgIndex < loadingMessages.length) { addLog(loadingMessages[msgIndex]); msgIndex++; }
    }, 800);
    
    try {
      const response = await fetch('https://lead-sniper.onrender.com/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productDesc }),
      });
      
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      clearInterval(interval);
      if (data.success) {
        addLog("✅ Complete.");
        setTimeout(() => {
             setLeads(data.data);
             setStep('results');
             setIsLoading(false);
        }, 1000);
      } 
    } catch (error) {
      clearInterval(interval);
      console.error("Search API Error:", error);
      addLog(`⚠️ Error: ${error.message || "Connection Failed"}`);
      setIsLoading(false);
    }
  };

  const visibleLeads = isPro ? leads : leads.slice(0, 3);

  return (
    <div className="dashboard-container">
      <div className="dash-header">
        <h2>Dashboard</h2>
        <div className="user-badge">
            <div className="avatar-small">{user?.email ? user.email[0].toUpperCase() : 'U'}</div>
            <span className="desktop-only">{user?.email || user?.phoneNumber}</span>
            {isPro && <span style={{marginLeft:10, background: '#22c55e', padding: '2px 8px', borderRadius: 4, fontSize: 10}}>PRO</span>}
        </div>
      </div>

      <div className="tool-wrapper">
        {step === 'input' && (
          <div className="input-section">
            <h1 className="tool-title">New Search</h1>
            <p className="tool-sub">Describe your product to find leads.</p>
            <div className="search-box">
                <textarea className="textarea" placeholder="e.g. CRM for photographers..." value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
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
                  <span className="term-title">Scanning...</span>
                </div>
                <div className="terminal-body">
                  {logs.map((log, i) => <div key={i} className="log-entry"><span className="arrow">➜</span> {log}</div>)}
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
                    <div className="match-badge"><Zap size={12} fill="currentColor" /> {lead.score}% MATCH</div>
                    <span className="time">Just now</span>
                  </div>
                  <h3 className="card-title">{lead.text}</h3>
                  <div className="card-footer"><button className="reply-btn">View <ArrowRight size={16}/></button></div>
                </div>
              ))}
              {!isPro && (
                  <div className="glass-panel paywall">
                      <Lock size={40} className="lock-icon" />
                      <h3>Unlock {leads.length - 3} More Leads</h3>
                      <a href={payLink} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
                        <button className="primary-btn upgrade-btn">Unlock Now - ₹399 <Star size={18} fill="white" /></button>
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

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="logo">Lead<span style={{color: '#ea580c'}}>Sniper</span></div>
      <div className="copy">© 2025 LeadSniper Inc.</div>
    </div>
  </footer>
);

const Popup = ({ onClose }) => (
  <div className="popup-overlay">
    <div className="popup-card">
      <button onClick={onClose} className="close-btn"><X size={20}/></button>
      <h3>🔥 Special Offer!</h3>
      <p>50% OFF your first month.</p>
      <button className="primary-btn full-width">Claim Offer</button>
    </div>
  </div>
);

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    :root { --primary: #ea580c; --primary-dark: #c2410c; --bg-dark: #0f172a; --glass-bg: rgba(255, 255, 255, 0.03); --glass-border: rgba(255, 255, 255, 0.1); --text-muted: #94a3b8; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background-color: var(--bg-dark); color: white; overflow-x: hidden; }
    .page { min-height: 100vh; display: flex; flex-direction: column; width: 100%; align-items: center; }
    .content { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    /* COMPONENTS */
    .primary-btn { background: linear-gradient(to right, var(--primary), var(--primary-dark)); border: none; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 1rem; }
    .primary-btn:hover { transform: translateY(-2px); }
    .secondary-btn { background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem; }
    .google-btn { background: white; color: #0f172a; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem; }
    
    /* NAV */
    .nav { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; border-bottom: 1px solid var(--glass-border); max-width: 1200px; margin: 0 auto; width: 100%; }
    .nav-links { display: flex; gap: 30px; font-size: 0.95rem; color: var(--text-muted); cursor: pointer; }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.25rem; cursor: pointer; }
    .logo-icon { background: var(--primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .active { color: white; font-weight: 600; }

    /* LANDING */
    .landing { text-align: center; padding: 4rem 20px; display: flex; flex-direction: column; align-items: center; }
    .hero-title { font-size: 3.5rem; line-height: 1.1; margin-bottom: 20px; font-weight: 800; }
    .gradient-text { background: linear-gradient(to right, #fbbf24, #ea580c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-sub { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 40px; max-width: 600px; line-height: 1.6; }
    .feature-grid, .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 30px; width: 100%; }
    .glass-card { background: var(--glass-bg); backdrop-filter: blur(10px); border: 1px solid var(--glass-border); border-radius: 16px; padding: 24px; text-align: left; }
    .price { font-size: 2.5rem; font-weight: 800; margin: 10px 0; }
    
    /* LOGIN */
    .login-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; padding: 20px; }
    .login-box { width: 100%; max-width: 400px; text-align: center; }
    .input-field { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); color: white; outline: none; font-size: 1rem; }
    .link { color: var(--primary); cursor: pointer; font-weight: 600; }
    .mb-10 { margin-bottom: 10px; }
    .full-width { width: 100%; }

    /* DASHBOARD */
    .dashboard-container { width: 100%; max-width: 1000px; margin: 0 auto; padding: 20px; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .user-badge { display: flex; align-items: center; gap: 10px; background: var(--glass-bg); padding: 5px 15px; border-radius: 20px; border: 1px solid var(--glass-border); }
    .avatar-small { width: 24px; height: 24px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; fontWeight: 700; color: white; }
    
    .search-box { background: white; padding: 1.5rem; border-radius: 1rem; color: #0f172a; margin-top: 20px; }
    .textarea { width: 100%; border: 2px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; font-size: 1rem; resize: none; min-height: 100px; font-family: inherit; }
    .terminal { background: #0f172a; border-radius: 12px; overflow: hidden; max-width: 600px; margin: 0 auto; border: 1px solid var(--glass-border); }
    .terminal-body { padding: 20px; height: 300px; overflow-y: auto; font-family: monospace; color: #4ade80; text-align: left; }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .paywall { grid-column: 1 / -1; text-align: center; padding: 40px; border: 1px dashed var(--primary); display: flex; flex-direction: column; align-items: center; gap: 15px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* FOOTER */
    .footer { border-top: 1px solid var(--glass-border); padding: 40px 0; margin-top: 60px; text-align: center; color: var(--text-muted); }
    .footer-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }

    /* POPUP */
    .popup-overlay { position: fixed; bottom: 20px; right: 20px; z-index: 100; animation: slideIn 0.5s ease-out; }
    .popup-card { background: white; color: #0f172a; padding: 20px; border-radius: 12px; width: 300px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative; text-align: center; }
    .close-btn { position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; color: #94a3b8; }
    @keyframes slideIn { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* RESPONSIVE */
    @media (max-width: 768px) {
      .hero-title { font-size: 2.2rem; }
      .footer-content { flex-direction: column; gap: 20px; }
      .desktop-nav { display: none; }
      .nav { padding: 1rem; }
      .popup-overlay { bottom: 10px; right: 10px; left: 10px; width: auto; }
      .popup-card { width: 100%; }
      .dashboard-container { padding: 10px; }
      .search-box { padding: 1rem; }
    }
  `}</style>
);